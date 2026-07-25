#!/usr/bin/env python
"""Static Python/FastAPI extractor for the ClinicOS NHW knowledge base."""

from __future__ import annotations

import argparse
import ast
import json
import re
from pathlib import Path
from typing import Any


HTTP_METHODS = {"delete", "get", "patch", "post", "put"}
TEST_PATH_RE = re.compile(r"(^|/)(tests?|__tests__)(/|$)|(^|/)test_[^/]+\.py$")


def stable_id(*parts: str) -> str:
    value = ".".join(parts).lower()
    value = re.sub(r"[^a-z0-9.-]+", "-", value)
    value = re.sub(r"-+", "-", value)
    value = re.sub(r"\.+", ".", value)
    return value.strip(".-")


def expression_name(node: ast.AST | None) -> str:
    if node is None:
        return ""
    if isinstance(node, ast.Name):
        return node.id
    if isinstance(node, ast.Attribute):
        parent = expression_name(node.value)
        return f"{parent}.{node.attr}" if parent else node.attr
    if isinstance(node, ast.Subscript):
        return expression_name(node.value)
    try:
        return ast.unparse(node)
    except Exception:
        return type(node).__name__


def literal_string(node: ast.AST | None) -> str | None:
    if isinstance(node, ast.Constant) and isinstance(node.value, str):
        return node.value
    return None


def status_code(node: ast.AST | None) -> int | None:
    if isinstance(node, ast.Constant) and isinstance(node.value, int):
        return node.value
    name = expression_name(node)
    match = re.search(r"(?:^|_)HTTP_(\d{3})(?:_|$)", name)
    if match:
        return int(match.group(1))
    return None


def decorator_call(node: ast.AST) -> ast.Call | None:
    return node if isinstance(node, ast.Call) else None


def route_decorator(node: ast.AST) -> tuple[str, str, int | None, str | None] | None:
    call = decorator_call(node)
    if not call or not isinstance(call.func, ast.Attribute):
        return None
    method = call.func.attr.lower()
    if method not in HTTP_METHODS:
        return None
    path = literal_string(call.args[0]) if call.args else None
    if path is None:
        return None
    explicit_status = None
    response_model = None
    for keyword in call.keywords:
        if keyword.arg == "status_code":
            explicit_status = status_code(keyword.value)
        elif keyword.arg == "response_model":
            response_model = expression_name(keyword.value)
    return method.upper(), path, explicit_status, response_model


def lifecycle_decorator(node: ast.AST) -> str | None:
    call = decorator_call(node)
    if (
        not call
        or not isinstance(call.func, ast.Attribute)
        or call.func.attr != "on_event"
        or not call.args
    ):
        return None
    return literal_string(call.args[0])


def base_names(node: ast.ClassDef) -> list[str]:
    return [expression_name(base) for base in node.bases]


def is_provider(node: ast.ClassDef) -> bool:
    names = [node.name, *base_names(node)]
    return any(
        token in name.lower()
        for name in names
        for token in ("provider", "runner", "modeladapter")
    )


def function_defaults(node: ast.FunctionDef | ast.AsyncFunctionDef) -> dict[str, ast.AST]:
    result: dict[str, ast.AST] = {}
    positional = [*node.args.posonlyargs, *node.args.args]
    if node.args.defaults:
        for argument, default in zip(positional[-len(node.args.defaults) :], node.args.defaults):
            result[argument.arg] = default
    for argument, default in zip(node.args.kwonlyargs, node.args.kw_defaults):
        if default is not None:
            result[argument.arg] = default
    return result


def annotation_name(node: ast.AST | None) -> str:
    if node is None:
        return ""
    if isinstance(node, ast.Name):
        return node.id
    if isinstance(node, ast.Subscript):
        return expression_name(node.value)
    return expression_name(node)


def route_behavior(
    node: ast.FunctionDef | ast.AsyncFunctionDef,
    pydantic_models: set[str],
) -> dict[str, Any]:
    defaults = function_defaults(node)
    header_params = sorted(
        name
        for name, default in defaults.items()
        if isinstance(default, ast.Call) and expression_name(default.func).endswith("Header")
    )
    dependency_params = sorted(
        name
        for name, default in defaults.items()
        if isinstance(default, ast.Call) and expression_name(default.func).endswith("Depends")
    )
    request_models = sorted(
        {
            annotation_name(argument.annotation)
            for argument in [*node.args.posonlyargs, *node.args.args, *node.args.kwonlyargs]
            if annotation_name(argument.annotation) in pydantic_models
        }
    )
    error_statuses: set[int] = set()
    background_tasks: set[str] = set()
    external_calls: set[str] = set()
    for child in ast.walk(node):
        if isinstance(child, ast.Raise) and isinstance(child.exc, ast.Call):
            if expression_name(child.exc.func).endswith("HTTPException"):
                candidate = child.exc.args[0] if child.exc.args else None
                for keyword in child.exc.keywords:
                    if keyword.arg == "status_code":
                        candidate = keyword.value
                code = status_code(candidate)
                if code is not None:
                    error_statuses.add(code)
        if isinstance(child, ast.Call):
            call_name = expression_name(child.func)
            if call_name in {"asyncio.create_task", "asyncio.ensure_future"}:
                background_tasks.add(call_name)
            if call_name.startswith(("httpx.", "requests.", "urllib.")):
                external_calls.add(call_name)
    return {
        "headerParams": header_params,
        "dependencyParams": dependency_params,
        "requestModels": request_models,
        "errorStatuses": sorted(error_statuses),
        "backgroundTasks": sorted(background_tasks),
        "externalCalls": sorted(external_calls),
    }


def configuration_reads(tree: ast.AST, path: str) -> list[dict[str, Any]]:
    records: dict[tuple[str, int], dict[str, Any]] = {}
    for node in ast.walk(tree):
        name = None
        if isinstance(node, ast.Call):
            call_name = expression_name(node.func)
            if call_name in {"os.environ.get", "os.getenv"} and node.args:
                name = literal_string(node.args[0])
        elif isinstance(node, ast.Subscript) and expression_name(node.value) == "os.environ":
            name = literal_string(node.slice)
        if name and re.fullmatch(r"[A-Z][A-Z0-9_]*", name):
            records[(name, node.lineno)] = {
                "id": stable_id("config", "python", name, path, str(node.lineno)),
                "name": name,
                "sourcePath": path,
                "lineStart": node.lineno,
                "lineEnd": getattr(node, "end_lineno", node.lineno),
            }
    return [records[key] for key in sorted(records)]


def imports_for(tree: ast.Module, path: str) -> list[dict[str, Any]]:
    records = []
    for node in tree.body:
        if isinstance(node, ast.Import):
            for alias in node.names:
                records.append(
                    {
                        "sourcePath": path,
                        "module": alias.name,
                        "importedName": alias.name,
                        "localName": alias.asname or alias.name,
                        "lineStart": node.lineno,
                    }
                )
        elif isinstance(node, ast.ImportFrom):
            module = "." * node.level + (node.module or "")
            for alias in node.names:
                records.append(
                    {
                        "sourcePath": path,
                        "module": module,
                        "importedName": alias.name,
                        "localName": alias.asname or alias.name,
                        "lineStart": node.lineno,
                    }
                )
    return records


def extract_file(root: Path, relative_path: str, pydantic_models: set[str]) -> dict[str, Any]:
    source_path = relative_path.replace("\\", "/")
    text = (root / relative_path).read_text(encoding="utf-8")
    tree = ast.parse(text, filename=source_path)
    test_source = bool(TEST_PATH_RE.search(source_path))
    symbols = []
    routes = []
    hooks = []
    providers = []

    for node in tree.body:
        if isinstance(node, ast.ClassDef):
            bases = base_names(node)
            if node.name in pydantic_models:
                kind = "pydantic-model"
            elif is_provider(node):
                kind = "provider"
            else:
                kind = "class"
            record = {
                "id": stable_id("component", "ai-runtime", source_path, node.name),
                "name": node.name,
                "kind": kind,
                "bases": bases,
                "sourcePath": source_path,
                "lineStart": node.lineno,
                "lineEnd": node.end_lineno or node.lineno,
                "public": not node.name.startswith("_"),
                "testSource": test_source,
            }
            symbols.append(record)
            if is_provider(node):
                providers.append(record)
        elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            symbol = {
                "id": stable_id("component", "ai-runtime", source_path, node.name),
                "name": node.name,
                "kind": "async-function" if isinstance(node, ast.AsyncFunctionDef) else "function",
                "sourcePath": source_path,
                "lineStart": node.lineno,
                "lineEnd": node.end_lineno or node.lineno,
                "public": not node.name.startswith("_"),
                "testSource": test_source,
            }
            symbols.append(symbol)
            for decorator in node.decorator_list:
                event = lifecycle_decorator(decorator)
                if event and not test_source:
                    hooks.append(
                        {
                            "id": stable_id("component", "ai-runtime", "lifecycle", event, node.name),
                            "event": event,
                            "handler": node.name,
                            "sourcePath": source_path,
                            "lineStart": node.lineno,
                            "lineEnd": node.end_lineno or node.lineno,
                        }
                    )
                route = route_decorator(decorator)
                if route and not test_source:
                    method, path, explicit_status, response_model = route
                    route_record = {
                        "id": stable_id(
                            "api",
                            "ai-runtime",
                            method,
                            re.sub(r"[{}:/]+", "-", path).strip("-") or "root",
                            str(len(routes) + 1),
                        ),
                        "method": method,
                        "path": path,
                        "statusCode": explicit_status or 200,
                        "responseModel": response_model,
                        "handler": node.name,
                        "pathParams": sorted(re.findall(r"{([A-Za-z_][A-Za-z0-9_]*)}", path)),
                        "sourcePath": source_path,
                        "lineStart": node.lineno,
                        "lineEnd": node.end_lineno or node.lineno,
                        **route_behavior(node, pydantic_models),
                    }
                    routes.append(route_record)

    return {
        "symbols": symbols,
        "imports": imports_for(tree, source_path),
        "routes": routes,
        "lifecycleHooks": hooks,
        "configurationReads": configuration_reads(tree, source_path),
        "providerClasses": providers,
    }


def extract(repo_root: Path, paths: list[str]) -> dict[str, Any]:
    parsed: list[tuple[str, ast.Module]] = []
    pydantic_models: set[str] = set()
    for relative_path in sorted(paths):
        text = (repo_root / relative_path).read_text(encoding="utf-8")
        tree = ast.parse(text, filename=relative_path)
        parsed.append((relative_path, tree))
        for node in tree.body:
            if isinstance(node, ast.ClassDef):
                if any(expression_name(base).endswith("BaseModel") for base in node.bases):
                    pydantic_models.add(node.name)

    result: dict[str, list[dict[str, Any]]] = {
        "symbols": [],
        "imports": [],
        "routes": [],
        "lifecycleHooks": [],
        "configurationReads": [],
        "providerClasses": [],
    }
    for relative_path, _tree in parsed:
        file_result = extract_file(repo_root, relative_path, pydantic_models)
        for key in result:
            result[key].extend(file_result[key])
    for key in result:
        result[key].sort(
            key=lambda record: (
                record.get("id", ""),
                record.get("sourcePath", ""),
                record.get("lineStart", 0),
            )
        )
    return result


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo-root", required=True)
    parser.add_argument("--paths-file", required=True)
    args = parser.parse_args()
    paths = json.loads(Path(args.paths_file).read_text(encoding="utf-8"))
    result = extract(Path(args.repo_root).resolve(), paths)
    json.dump(result, fp=__import__("sys").stdout, sort_keys=True, separators=(",", ":"))
    print()


if __name__ == "__main__":
    main()
