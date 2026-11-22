// Lo schema chiesto al modello per una lettera: solo i campi che l'ingresso usa, nel sottoinsieme
// «strict» (ogni oggetto elenca tutte le sue proprietà ed esclude le altre), ognuno descritto.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadIntakeExtractionPrompt, loadIntakeExtractionSchema } from '../config.js';
import { validateExtraction } from '../extraction-validate.js';
import { mergeExtractions } from '../merge.js';

type Node = Record<string, unknown>;
const schema = loadIntakeExtractionSchema() as Node;
const props = (node: Node) => node.properties as Record<string, Node>;

function walk(node: Node, path: string, visit: (node: Node, path: string) => void) {
  visit(node, path);
  if (node.type === 'object')
    for (const [k, v] of Object.entries(props(node))) walk(v, `${path}.${k}`, visit);
  if (node.type === 'array') walk(node.items as Node, `${path}[]`, visit);
}

test('the request schema is in the strict subset and carries no metadata keys', () => {
  for (const key of ['$schema', '$id', 'title']) assert.equal(key in schema, false, key);
  walk(schema, 'root', (node, path) => {
    if (node.type !== 'object') return;
    assert.equal(node.additionalProperties, false, path);
    assert.deepEqual(
      [...(node.required as string[])].sort(),
      Object.keys(props(node)).sort(),
      path,
    );
  });
});

test('every field the model fills is described', () => {
  walk(schema, 'root', (node, path) => {
    if (['string', 'array'].includes(String(node.type)) && !path.endsWith('[]'))
      assert.ok(typeof node.description === 'string' && node.description.length > 10, path);
  });
});

test('only fields the intake uses are asked: nothing the import discards', () => {
  const cartella = Object.keys(props(props(schema).cartella));
  for (const unused of [
    'parametriVitali',
    'diarioMedico',
    'indicatoriRischio',
    'noteClinica',
    'pianoCura',
    'presaInCarico',
    'terapie',
    'noteGenerali',
  ])
    assert.equal(cartella.includes(unused), false, unused);
  // Drug rows: name and strength only — schedule and route are read from the text.
  const farmaco = props((props(props(schema).cartella).farmaci.items as Node) ?? {});
  assert.deepEqual(Object.keys(farmaco).sort(), ['dose', 'nome']);
});

test('an answer in the requested shape passes validation and every scalar reaches the merge', () => {
  const fill = (node: Node): unknown =>
    node.type === 'object'
      ? Object.fromEntries(Object.entries(props(node)).map(([k, v]) => [k, fill(v)]))
      : node.type === 'array'
        ? [fill(node.items as Node)]
        : Array.isArray(node.enum)
          ? node.enum[node.enum.length - 1]
          : 'valore';
  const answer = fill(schema) as { anagrafica: Node; cartella: Node };
  assert.equal(validateExtraction(answer).valid, true);
  const merged = mergeExtractions([{ docId: 'g', filename: 'Lettera', model: 'm', data: answer }]);
  for (const key of Object.keys(answer.anagrafica))
    assert.equal(merged.anagrafica[key]?.status, 'extracted', `anagrafica.${key}`);
  for (const key of Object.keys(answer.cartella))
    assert.ok(merged.cartella[key], `cartella.${key}`);
});

test('the instructions tell the model to skip page furniture and never to invent', () => {
  const prompt = loadIntakeExtractionPrompt();
  assert.match(prompt, /intestazioni e pie' di pagina/i);
  assert.match(prompt, /Non inventare/);
  assert.match(prompt, /stringa vuota/);
});
