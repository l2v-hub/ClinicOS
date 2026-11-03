// Pure finite JSON boundary: JSON.parse alone loses duplicate property names.
export function freezeGuardValue(value) {
  let nodes = 0;
  function visit(item, depth) {
    if (++nodes > 20000 || depth > 64 || ['function', 'symbol', 'bigint'].includes(typeof item))
      throw new Error('guard-json-rejected');
    if (item && typeof item === 'object') {
      const proto = Object.getPrototypeOf(item);
      if (![Object.prototype, Array.prototype, null].includes(proto))
        throw new Error('guard-json-rejected');
      for (const child of Object.values(item)) visit(child, depth + 1);
      Object.freeze(item);
    }
    return item;
  }
  return visit(value, 0);
}

export function parseGuardJson(buffer, options = {}) {
  try {
    const {
      maxBytes = 2 * 1024 * 1024,
      maxDepth = 32,
      maxNodes = 20000,
      maxStringBytes = 1024 * 1024,
    } = options;
    const check = (ok) => {
      if (!ok) throw new Error();
    };
    for (const bound of [maxBytes, maxDepth, maxNodes, maxStringBytes])
      check(Number.isSafeInteger(bound) && bound > 0 && bound <= 16 * 1024 * 1024);
    check(Buffer.isBuffer(buffer) && buffer.length <= maxBytes);
    const text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(buffer);
    let i = 0,
      nodes = 0;
    const space = () => {
      while (/[\x20\x09\x0a\x0d]/.test(text[i] ?? '') && i < text.length) i++;
    };
    function string() {
      check(text[i++] === '"');
      const start = i - 1;
      let escaped = false;
      while (i < text.length) {
        const ch = text[i++];
        if (!escaped && ch === '"') {
          const result = JSON.parse(text.slice(start, i));
          check(Buffer.byteLength(result) <= maxStringBytes);
          for (let n = 0; n < result.length; n++) {
            const code = result.charCodeAt(n);
            if (code >= 0xd800 && code <= 0xdbff) {
              const next = result.charCodeAt(++n);
              check(next >= 0xdc00 && next <= 0xdfff);
            } else check(code < 0xdc00 || code > 0xdfff);
          }
          return result;
        }
        if (!escaped && ch === '\\') escaped = true;
        else {
          check(ch.charCodeAt(0) >= 0x20);
          escaped = false;
        }
      }
      throw new Error();
    }
    function value(depth) {
      check(depth <= maxDepth && ++nodes <= maxNodes);
      space();
      const ch = text[i];
      if (ch === '"') return string();
      if (ch === '{') {
        i++;
        space();
        const result = {},
          seen = new Set();
        if (text[i] === '}') {
          i++;
          return result;
        }
        for (;;) {
          check(++nodes <= maxNodes);
          const key = string();
          check(!seen.has(key) && !['__proto__', 'prototype', 'constructor'].includes(key));
          seen.add(key);
          space();
          check(text[i++] === ':');
          Object.defineProperty(result, key, { value: value(depth + 1), enumerable: true });
          space();
          const separator = text[i++];
          if (separator === '}') return result;
          check(separator === ',');
          space();
        }
      }
      if (ch === '[') {
        i++;
        space();
        const result = [];
        if (text[i] === ']') {
          i++;
          return result;
        }
        for (;;) {
          result.push(value(depth + 1));
          space();
          const separator = text[i++];
          if (separator === ']') return result;
          check(separator === ',');
        }
      }
      for (const [literal, result] of [
        ['true', true],
        ['false', false],
        ['null', null],
      ]) {
        if (text.startsWith(literal, i)) {
          i += literal.length;
          return result;
        }
      }
      const number = /^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?/.exec(text.slice(i));
      check(Boolean(number));
      i += number[0].length;
      const result = Number(number[0]);
      check(Number.isFinite(result) && (!Number.isInteger(result) || Number.isSafeInteger(result)));
      return result;
    }
    const result = value(0);
    space();
    check(i === text.length);
    return freezeGuardValue(result);
  } catch {
    throw new Error('guard-json-rejected');
  }
}
