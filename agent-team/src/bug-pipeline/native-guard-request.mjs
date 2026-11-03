import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { parseGuardJson, freezeGuardValue } from './native-guard-json.mjs';

const bytes = (s) => Buffer.byteLength(s);
const hash = (s) => createHash('sha256').update(s).digest('hex');
const object = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const mintedCapacityErrors = new WeakSet();
const CAPACITY_FIELDS = [
  'requiredTokensUpperBound',
  'contextBytes',
  'inputBytes',
  'schemaBytes',
  'maxTokens',
  'contextWindow',
];

export class NativeRequestCapacityError extends Error {
  constructor(metadata) {
    super('native-request-rejected');
    const numeric = {};
    for (const key of CAPACITY_FIELDS) {
      if (!Number.isSafeInteger(metadata?.[key]) || metadata[key] < 0)
        throw new Error('native-request-rejected');
      numeric[key] = metadata[key];
    }
    Object.defineProperties(this, {
      code: { value: 'native-context-exceeded', enumerable: true },
      metadata: { value: Object.freeze(numeric), enumerable: true },
    });
    Object.freeze(this);
  }
}

// The public class alone is NOT authority: only this module's final fully
// validated capacity check can mint an error recognized by this classifier.
export function isNativeRequestCapacityError(error) {
  return mintedCapacityErrors.has(error) && error instanceof NativeRequestCapacityError;
}
const HEADERS = new Set([
  'host',
  'authorization',
  'content-type',
  'content-length',
  'anthropic-version',
  'anthropic-beta',
  'user-agent',
  'accept',
  'accept-encoding',
  'connection',
  'x-app',
  'x-client-request-id',
  'x-stainless-lang',
  'x-stainless-package-version',
  'x-stainless-os',
  'x-stainless-arch',
  'x-stainless-runtime',
  'x-stainless-runtime-version',
  'x-stainless-retry-count',
  'x-stainless-timeout',
]);

export function validateNativeRequest(request = {}) {
  let currentCapacityError;
  try {
    const { body, rawHeaders, host, method, path, expected } = request;
    const check = (ok) => {
      if (!ok) throw new Error();
    };
    const keys = (v, names) => {
      check(object(v));
      check(Object.keys(v).every((k) => names.includes(k)));
    };
    check(Buffer.isBuffer(body) && body.length > 0 && body.length <= 2 * 1024 * 1024);
    check(host === 'api.anthropic.com' && method === 'POST');
    check(['/v1/messages', '/v1/messages?beta=true'].includes(path));
    check(Array.isArray(rawHeaders) && rawHeaders.length <= 64 && rawHeaders.length % 2 === 0);
    const headers = new Map();
    let headerBytes = 0;
    for (let i = 0; i < rawHeaders.length; i += 2) {
      const name = rawHeaders[i],
        value = rawHeaders[i + 1];
      check(typeof name === 'string' && /^[A-Za-z0-9-]+$/.test(name));
      const lower = name.toLowerCase();
      check(HEADERS.has(lower) && !headers.has(lower));
      check(typeof value === 'string' && /^[\x20-\x7e]+$/.test(value));
      check(value.length <= (lower === 'authorization' ? 8192 : 2048));
      headerBytes += name.length + value.length;
      headers.set(lower, value);
    }
    check(headerBytes <= 16 * 1024);
    check(headers.get('host') === host && headers.get('content-type') === 'application/json');
    check(/^(?:0|[1-9][0-9]*)$/.test(headers.get('content-length') ?? ''));
    check(headers.get('content-length') === String(body.length));
    check(/^Bearer [A-Za-z0-9._~+\/-]+=*$/.test(headers.get('authorization') ?? ''));
    // The proxy separately compares OAuth in memory. No header/credential value
    // or credential-derived digest is ever included in the returned seal.
    check(
      expected?.contextWindow === 1000000 && [32768, 49152, 65536].includes(expected.outputCap),
    );
    check(typeof expected.input === 'string' && bytes(expected.input) <= 1000000);
    check(/^claude-opus-[0-9]+(?:-[0-9]+){1,3}$/.test(expected.model));
    const schema = parseGuardJson(Buffer.from(JSON.stringify(expected.schema)), {
      maxBytes: 64 * 1024,
    });
    const value = parseGuardJson(Buffer.from(body));
    keys(value, [
      'model',
      'max_tokens',
      'stream',
      'messages',
      'system',
      'tools',
      'tool_choice',
      'temperature',
      'metadata',
      'thinking',
      'output_config',
    ]);
    check(value.model === expected.model && value.stream === true);
    check(
      Number.isSafeInteger(value.max_tokens) &&
        value.max_tokens > 0 &&
        value.max_tokens <= expected.outputCap,
    );
    const wrapper = structuredClone(value);
    let textBytes = 0,
      systemBytes = 0,
      blockCount = 0;
    function cache(v) {
      if (v === undefined) return;
      keys(v, ['type', 'ttl']);
      check(v.type === 'ephemeral');
      check(v.ttl === undefined || ['5m', '1h'].includes(v.ttl));
    }
    function textBlocks(content, target, isSystem = false) {
      if (typeof content === 'string') {
        textBytes += bytes(content);
        if (isSystem) systemBytes += bytes(content);
        blockCount++;
        return [{ type: 'text', text: content }];
      }
      check(Array.isArray(content) && content.length <= 16);
      for (let i = 0; i < content.length; i++) {
        const item = content[i];
        keys(item, ['type', 'text', 'cache_control']);
        check(item.type === 'text' && typeof item.text === 'string');
        cache(item.cache_control);
        textBytes += bytes(item.text);
        if (isSystem) systemBytes += bytes(item.text);
        target[i].text = '';
        blockCount++;
      }
      return content;
    }
    if (value.system !== undefined) {
      textBlocks(value.system, wrapper.system, true);
      if (typeof value.system === 'string') wrapper.system = '';
    }
    check(systemBytes <= 65536);
    if (expected.system !== undefined) check(isDeepStrictEqual(value.system, expected.system));
    check(Array.isArray(value.messages) && value.messages.length === 1);
    const message = value.messages[0];
    keys(message, ['role', 'content']);
    check(message.role === 'user');
    const blocks = textBlocks(message.content, wrapper.messages[0].content);
    if (typeof message.content === 'string') wrapper.messages[0].content = '';
    const matches = blocks.filter((item) => item.text === expected.input);
    check(matches.length === 1);
    check(
      isDeepStrictEqual(
        blocks.filter((item) => item !== matches[0]),
        expected.userBlocks ?? [],
      ),
    );
    check(blockCount <= 32);
    check(Array.isArray(value.tools) && value.tools.length === 1);
    const tool = value.tools[0];
    keys(tool, ['name', 'description', 'input_schema', 'cache_control']);
    check(tool.name === 'StructuredOutput' && isDeepStrictEqual(tool.input_schema, schema));
    cache(tool.cache_control);
    check(
      tool.description === undefined ||
        (typeof tool.description === 'string' && bytes(tool.description) <= 8192),
    );
    if (expected.toolDescription !== undefined)
      check(tool.description === expected.toolDescription);
    if (tool.description !== undefined) {
      textBytes += bytes(tool.description);
      wrapper.tools[0].description = '';
    }
    wrapper.tools[0].input_schema = null;
    if (value.tool_choice !== undefined) {
      keys(value.tool_choice, ['type', 'name', 'disable_parallel_tool_use']);
      check(['auto', 'tool'].includes(value.tool_choice.type));
      check(
        value.tool_choice.type === 'tool'
          ? value.tool_choice.name === 'StructuredOutput'
          : value.tool_choice.name === undefined,
      );
      check(
        value.tool_choice.disable_parallel_tool_use === undefined ||
          value.tool_choice.disable_parallel_tool_use === true,
      );
    }
    if (value.temperature !== undefined) check(value.temperature === 0);
    if (value.metadata !== undefined) {
      keys(value.metadata, ['user_id']);
      check(typeof value.metadata.user_id === 'string' && bytes(value.metadata.user_id) <= 2048);
    }
    if (value.thinking !== undefined) {
      keys(value.thinking, ['type', 'budget_tokens', 'display']);
      check(['adaptive', 'disabled', 'enabled'].includes(value.thinking.type));
      check(
        value.thinking.display === undefined ||
          ['summarized', 'omitted'].includes(value.thinking.display),
      );
      if (value.thinking.type === 'enabled')
        check(
          Number.isSafeInteger(value.thinking.budget_tokens) &&
            value.thinking.budget_tokens >= 1024 &&
            value.thinking.budget_tokens < value.max_tokens,
        );
      else check(value.thinking.budget_tokens === undefined);
      if (value.thinking.type === 'disabled') check(value.thinking.display === undefined);
    }
    if (value.output_config !== undefined) {
      keys(value.output_config, ['effort']);
      check(['low', 'medium', 'high', 'max'].includes(value.output_config.effort));
    }
    const schemaBytes = bytes(JSON.stringify(schema)),
      wrapperBytes = bytes(JSON.stringify(wrapper));
    const contextBytes = textBytes + schemaBytes + wrapperBytes;
    const requiredTokensUpperBound = contextBytes + 65536 + value.max_tokens;
    if (requiredTokensUpperBound > expected.contextWindow) {
      const error = new NativeRequestCapacityError({
        requiredTokensUpperBound,
        contextBytes,
        inputBytes: bytes(expected.input),
        schemaBytes,
        maxTokens: value.max_tokens,
        contextWindow: expected.contextWindow,
      });
      mintedCapacityErrors.add(error);
      currentCapacityError = error;
      throw error;
    }
    return freezeGuardValue({
      version: 1,
      bodySha256: hash(body),
      contextSha256: hash(
        JSON.stringify({
          messages: value.messages,
          system: value.system ?? null,
          tools: value.tools,
        }),
      ),
      model: value.model,
      maxTokens: value.max_tokens,
      contextWindow: expected.contextWindow,
      inputBytes: bytes(expected.input),
      schemaBytes,
      systemBytes,
      textBytes,
      wrapperBytes,
      contextBytes,
      nativeOverheadTokens: 65536,
      requiredTokensUpperBound,
      blockCount,
    });
  } catch (error) {
    // A genuine error from a DIFFERENT invocation is not a capacity result for
    // this request (e.g. a hostile expected-value getter replaying an old error).
    if (currentCapacityError && error === currentCapacityError) throw error;
    throw new Error('native-request-rejected');
  }
}
