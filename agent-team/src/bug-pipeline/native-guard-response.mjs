import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { parseGuardJson, freezeGuardValue } from './native-guard-json.mjs';

const object = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const hash = (v) => createHash('sha256').update(v).digest('hex');
const error = () => new Error('native-response-rejected');
const SCHEMA_KEYS = [
  'type',
  'properties',
  'required',
  'additionalProperties',
  'items',
  'enum',
  'const',
  'description',
  'pattern',
  'minLength',
  'maxLength',
  'minItems',
  'maxItems',
  'minimum',
  'maximum',
];

function inspectSchema(schema, depth = 0) {
  if (
    !object(schema) ||
    depth > 32 ||
    !Object.keys(schema).every((key) => SCHEMA_KEYS.includes(key)) ||
    !['object', 'array', 'string', 'integer', 'boolean', 'null'].includes(schema.type)
  )
    throw error();
  if (schema.properties !== undefined) {
    if (!object(schema.properties)) throw error();
    for (const child of Object.values(schema.properties)) inspectSchema(child, depth + 1);
  }
  if (schema.items !== undefined) inspectSchema(schema.items, depth + 1);
  if (schema.type === 'array' && !schema.items) throw error();
  if (
    schema.required !== undefined &&
    (!Array.isArray(schema.required) ||
      !schema.required.every(
        (key) => typeof key === 'string' && Object.hasOwn(schema.properties ?? {}, key),
      ))
  )
    throw error();
  if (schema.additionalProperties !== undefined && typeof schema.additionalProperties !== 'boolean')
    throw error();
  if (
    schema.enum !== undefined &&
    (!Array.isArray(schema.enum) || !schema.enum.length || schema.enum.length > 1000)
  )
    throw error();
  if (schema.pattern !== undefined && !['\\S', '^[a-f0-9]{40}$'].includes(schema.pattern))
    throw error();
  for (const key of ['minLength', 'maxLength', 'minItems', 'maxItems', 'minimum', 'maximum'])
    if (schema[key] !== undefined && !Number.isSafeInteger(schema[key])) throw error();
}

// Deliberately finite trusted-schema subset. validateReview remains the final
// tracked-location, verdict-consistency, communication and privacy authority.
function schemaCheck(value, schema, depth = 0) {
  if (!object(schema) || depth > 32) throw error();
  if (!Object.keys(schema).every((k) => SCHEMA_KEYS.includes(k))) throw error();
  if (schema.const !== undefined && !isDeepStrictEqual(value, schema.const)) throw error();
  if (schema.enum && !schema.enum.some((item) => isDeepStrictEqual(item, value))) throw error();
  switch (schema.type) {
    case 'object': {
      if (!object(value)) throw error();
      const props = schema.properties ?? {};
      if (schema.required?.some((key) => !Object.hasOwn(value, key))) throw error();
      for (const [key, item] of Object.entries(value)) {
        if (Object.hasOwn(props, key)) schemaCheck(item, props[key], depth + 1);
        else if (schema.additionalProperties !== true) throw error();
      }
      break;
    }
    case 'array':
      if (
        !Array.isArray(value) ||
        value.length > (schema.maxItems ?? 1000) ||
        value.length < (schema.minItems ?? 0)
      )
        throw error();
      for (const item of value) schemaCheck(item, schema.items, depth + 1);
      break;
    case 'string':
      if (
        typeof value !== 'string' ||
        [...value].length < (schema.minLength ?? 0) ||
        [...value].length > (schema.maxLength ?? 256 * 1024)
      )
        throw error();
      if (schema.pattern !== undefined) {
        if (
          !['\\S', '^[a-f0-9]{40}$'].includes(schema.pattern) ||
          !new RegExp(schema.pattern).test(value)
        )
          throw error();
      }
      break;
    case 'integer':
      if (
        !Number.isSafeInteger(value) ||
        value < (schema.minimum ?? -Number.MAX_SAFE_INTEGER) ||
        value > (schema.maximum ?? Number.MAX_SAFE_INTEGER)
      )
        throw error();
      break;
    case 'boolean':
      if (typeof value !== 'boolean') throw error();
      break;
    case 'null':
      if (value !== null) throw error();
      break;
    default:
      throw error();
  }
}

export function createNativeResponseGuard({
  statusCode,
  requestId,
  model,
  maxTokens,
  subjectSha,
  schema,
} = {}) {
  if (
    statusCode !== 200 ||
    !/^req_[A-Za-z0-9_-]{1,190}$/.test(requestId ?? '') ||
    !/^claude-opus-[0-9]+(?:-[0-9]+){1,3}$/.test(model ?? '') ||
    !Number.isSafeInteger(maxTokens) ||
    maxTokens <= 0 ||
    maxTokens > 65536 ||
    !/^[a-f0-9]{40}$/.test(subjectSha ?? '')
  )
    throw error();
  const pinnedSchema =
    schema === undefined
      ? null
      : parseGuardJson(Buffer.from(JSON.stringify(schema)), { maxBytes: 64 * 1024 });
  if (pinnedSchema) inspectSchema(pinnedSchema);
  const chunks = [];
  let total = 0,
    poisoned = false,
    finished = false;
  const check = (ok) => {
    if (!ok) throw error();
  };
  function usage(value, prior = 0, requireInput = false) {
    keys(value, [
      'input_tokens',
      'output_tokens',
      'cache_creation_input_tokens',
      'cache_read_input_tokens',
      'cache_creation',
      'server_tool_use',
      'service_tier',
      'inference_geo',
      'output_tokens_details',
    ]);
    if (requireInput) check(Number.isSafeInteger(value.input_tokens) && value.input_tokens >= 0);
    check(
      Number.isSafeInteger(value.output_tokens) &&
        value.output_tokens >= prior &&
        value.output_tokens <= maxTokens,
    );
    for (const key of ['input_tokens', 'cache_creation_input_tokens', 'cache_read_input_tokens'])
      if (value[key] !== undefined)
        check(Number.isSafeInteger(value[key]) && value[key] >= 0 && value[key] <= 1000000);
    if (value.cache_creation !== undefined) {
      keys(value.cache_creation, ['ephemeral_5m_input_tokens', 'ephemeral_1h_input_tokens']);
      for (const n of Object.values(value.cache_creation))
        check(Number.isSafeInteger(n) && n >= 0 && n <= 1000000);
    }
    if (value.server_tool_use !== undefined) {
      keys(value.server_tool_use, ['web_search_requests', 'web_fetch_requests']);
      check(Object.values(value.server_tool_use).every((n) => n === 0));
    }
    if (value.output_tokens_details !== undefined) {
      keys(value.output_tokens_details, ['thinking_tokens']);
      check(
        Number.isSafeInteger(value.output_tokens_details.thinking_tokens) &&
          value.output_tokens_details.thinking_tokens >= 0 &&
          value.output_tokens_details.thinking_tokens <= value.output_tokens,
      );
    }
    for (const key of ['service_tier', 'inference_geo'])
      if (value[key] !== undefined)
        check(typeof value[key] === 'string' && value[key].length <= 64);
    return value.output_tokens;
  }
  function keys(value, names) {
    check(object(value) && Object.keys(value).every((key) => names.includes(key)));
  }
  return Object.freeze({
    push(chunk) {
      if (
        poisoned ||
        finished ||
        !Buffer.isBuffer(chunk) ||
        chunks.length >= 65536 ||
        total + chunk.length > 2 * 1024 * 1024
      ) {
        poisoned = true;
        throw error();
      }
      total += chunk.length;
      chunks.push(Buffer.from(chunk));
    },
    finish({ cliReport } = {}) {
      try {
        check(!poisoned && !finished);
        finished = true;
        const raw = Buffer.concat(chunks);
        const text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true })
          .decode(raw)
          .replace(/\r\n/g, '\n');
        check(!text.includes('\r') && text.endsWith('\n\n'));
        const frames = text.slice(0, -2).split('\n\n');
        check(frames.length <= 8192);
        let started = false,
          stopped = false,
          terminal = false,
          active = null,
          blocks = 0;
        let messageId,
          toolId,
          report,
          outputTokens = 0,
          thinkingBlocks = 0;
        for (const frame of frames) {
          const lines = frame.split('\n');
          check(
            lines.length === 2 && lines[0].startsWith('event: ') && lines[1].startsWith('data: '),
          );
          const name = lines[0].slice(7);
          const event = parseGuardJson(Buffer.from(lines[1].slice(6)), { maxBytes: 256 * 1024 });
          check(event.type === name && !stopped);
          if (name === 'ping') {
            keys(event, ['type']);
            continue;
          }
          if (name === 'message_start') {
            keys(event, ['type', 'message']);
            check(!started);
            started = true;
            const m = event.message;
            keys(m, [
              'id',
              'type',
              'role',
              'model',
              'content',
              'stop_reason',
              'stop_sequence',
              'usage',
            ]);
            check(
              /^msg_[A-Za-z0-9_-]{1,190}$/.test(m.id ?? '') &&
                m.type === 'message' &&
                m.role === 'assistant' &&
                m.model === model,
            );
            check(
              Array.isArray(m.content) &&
                m.content.length === 0 &&
                m.stop_reason === null &&
                m.stop_sequence === null,
            );
            messageId = m.id;
            outputTokens = usage(m.usage, 0, true);
            continue;
          }
          check(started);
          if (name === 'content_block_start') {
            keys(event, ['type', 'index', 'content_block']);
            check(!terminal && !active && !report && event.index === blocks && blocks < 16);
            const b = event.content_block;
            if (b.type === 'tool_use') {
              keys(b, ['type', 'id', 'name', 'input']);
              check(
                b.name === 'StructuredOutput' &&
                  !toolId &&
                  /^toolu_[A-Za-z0-9_-]{1,190}$/.test(b.id ?? ''),
              );
              check(object(b.input) && Object.keys(b.input).length === 0);
              toolId = b.id;
              active = { type: 'tool_use', index: blocks, parts: [], bytes: 0 };
            } else if (b.type === 'text') {
              keys(b, ['type', 'text']);
              check(b.text === '');
              active = { type: 'text', index: blocks, bytes: 0 };
            } else if (b.type === 'thinking') {
              keys(b, ['type', 'thinking', 'signature']);
              check(b.thinking === '' && (b.signature === undefined || b.signature === ''));
              thinkingBlocks++;
              active = { type: 'thinking', index: blocks, bytes: 0, signature: false };
            } else throw error();
            blocks++;
            continue;
          }
          if (name === 'content_block_delta') {
            keys(event, ['type', 'index', 'delta']);
            check(active && event.index === active.index && !terminal);
            const d = event.delta;
            let fragment = '';
            if (active.type === 'tool_use') {
              keys(d, ['type', 'partial_json']);
              check(d.type === 'input_json_delta' && typeof d.partial_json === 'string');
              fragment = d.partial_json;
              active.parts.push(fragment);
            } else if (active.type === 'text') {
              keys(d, ['type', 'text']);
              check(d.type === 'text_delta' && typeof d.text === 'string');
              fragment = d.text;
            } else if (d.type === 'thinking_delta') {
              keys(d, ['type', 'thinking']);
              check(!active.signature && typeof d.thinking === 'string');
              fragment = d.thinking;
            } else {
              keys(d, ['type', 'signature']);
              check(
                d.type === 'signature_delta' &&
                  !active.signature &&
                  typeof d.signature === 'string' &&
                  /^[A-Za-z0-9+/=_-]{1,262144}$/.test(d.signature),
              );
              active.signature = true;
            }
            active.bytes += Buffer.byteLength(fragment);
            check(active.bytes <= 256 * 1024);
            continue;
          }
          if (name === 'content_block_stop') {
            keys(event, ['type', 'index']);
            check(active && event.index === active.index);
            if (active.type === 'tool_use')
              report = parseGuardJson(Buffer.from(active.parts.join('')), { maxBytes: 256 * 1024 });
            if (active.type === 'thinking') check(active.signature);
            active = null;
            continue;
          }
          if (name === 'message_delta') {
            keys(event, ['type', 'delta', 'usage']);
            check(!active && report && !terminal);
            keys(event.delta, ['stop_reason', 'stop_sequence']);
            check(event.delta.stop_sequence === undefined || event.delta.stop_sequence === null);
            check(
              event.delta.stop_reason === undefined ||
                event.delta.stop_reason === null ||
                event.delta.stop_reason === 'tool_use',
            );
            terminal = event.delta.stop_reason === 'tool_use';
            outputTokens = usage(event.usage, outputTokens);
            continue;
          }
          if (name === 'message_stop') {
            keys(event, ['type']);
            check(!active && report && terminal);
            stopped = true;
            continue;
          }
          throw error();
        }
        check(
          stopped && terminal && toolId && report?.subject_sha === subjectSha && outputTokens > 0,
        );
        const cli = parseGuardJson(Buffer.from(JSON.stringify(cliReport)), {
          maxBytes: 256 * 1024,
        });
        check(isDeepStrictEqual(report, cli));
        if (pinnedSchema) schemaCheck(report, pinnedSchema);
        return freezeGuardValue({
          report,
          model,
          messageId,
          requestId,
          outputTokens,
          thinkingBlocks,
          responseSha256: hash(raw),
          reportSha256: hash(JSON.stringify(report)),
        });
      } catch {
        poisoned = true;
        throw error();
      }
    },
  });
}
