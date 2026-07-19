export function validateAgainstSchema(value, schema, path = '$') {
  if (schema.const !== undefined && value !== schema.const)
    throw new Error(`${path}: const mismatch`);
  if (schema.enum && !schema.enum.includes(value)) throw new Error(`${path}: enum mismatch`);
  if (schema.type === 'object') {
    if (!value || Array.isArray(value) || typeof value !== 'object')
      throw new Error(`${path}: expected object`);
    for (const key of schema.required ?? [])
      if (!(key in value)) throw new Error(`${path}: missing ${key}`);
    if (schema.additionalProperties === false)
      for (const key of Object.keys(value))
        if (!schema.properties?.[key]) throw new Error(`${path}: additional property ${key}`);
    for (const [key, child] of Object.entries(schema.properties ?? {}))
      if (key in value) validateAgainstSchema(value[key], child, `${path}.${key}`);
  }
  if (schema.type === 'array') {
    if (!Array.isArray(value)) throw new Error(`${path}: expected array`);
    if (schema.minItems !== undefined && value.length < schema.minItems)
      throw new Error(`${path}: too few items`);
    for (let index = 0; index < value.length; index += 1)
      validateAgainstSchema(value[index], schema.items, `${path}[${index}]`);
  }
  if (schema.type === 'string' && typeof value !== 'string')
    throw new Error(`${path}: expected string`);
  if (schema.type === 'integer' && !Number.isInteger(value))
    throw new Error(`${path}: expected integer`);
  if (schema.type === 'boolean' && typeof value !== 'boolean')
    throw new Error(`${path}: expected boolean`);
  if (schema.pattern && !new RegExp(schema.pattern).test(value))
    throw new Error(`${path}: pattern mismatch`);
}
