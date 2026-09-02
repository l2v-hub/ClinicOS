import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const filters = readFileSync(new URL('../TableFilters.tsx', import.meta.url), 'utf8');
const filterStyles = readFileSync(new URL('../TableFilters.css', import.meta.url), 'utf8');
const table = readFileSync(
  new URL('../../operator/cartella/ClinicalTable.tsx', import.meta.url),
  'utf8',
);
const operators = readFileSync(
  new URL('../../admin/OperatorManagement.tsx', import.meta.url),
  'utf8',
);
const therapy = readFileSync(
  new URL('../../operator/cartella/TerapiaFarmacologicaTab.tsx', import.meta.url),
  'utf8',
);

test('shared table filters expose one labelled and accessible control region', () => {
  assert.match(filters, /aria-label=\{`Filtri \$\{tableLabel\}`\}/);
  assert.match(filters, /aria-expanded=\{open\}/);
  assert.match(filters, /aria-controls=\{panelId\}/);
  assert.match(filters, /<label htmlFor=\{inputId\}>\{field\.label\}<\/label>/);
  assert.match(filters, /aria-live="polite"/);
  assert.match(filters, /Azzera filtri/);
  assert.match(filters, /table-filters__active-badge/);
  assert.match(filters, /type="search"/);
  assert.match(filters, /type="date"/);
  assert.match(filters, /<select/);
});

test('clinical tables compose filters above the table in wrapped and unwrapped modes', () => {
  assert.match(table, /filterBar\?: React\.ReactNode/);
  assert.match(table, /filterValue\?: \(row: T\) => unknown/);
  assert.match(table, /<TableFilters[\s\S]*resultCount=\{totalRows\}/);
  assert.match(table, /function setFilter[\s\S]*setPage\(1\)/);
  assert.match(table, /function clearFilters[\s\S]*setPage\(1\)/);
  assert.match(table, /if \(noWrapper\) \{\s*return tableContent;/);
  assert.doesNotMatch(table, /showFilters|cdt__filter-(?:input|select)/);
  assert.match(table, /filterFields\.length > 0/);
});

test('operator directory uses the shared controlled filters without duplicate toolbar controls', () => {
  assert.match(operators, /<TableFilters/);
  assert.match(operators, /filterBar=\{/);
  assert.match(operators, /key: 'query', label: 'Cerca operatore'/);
  assert.match(operators, /key: 'status'/);
  assert.match(operators, /onStatusChange\?\./);
  assert.match(operators, /clearOperatorFilters/);
  assert.doesNotMatch(operators, /className="toolbar"|IcoSearch|filterable: true/);
});

test('responsive filter layout uses touch-sized controls and never requests horizontal scrolling', () => {
  assert.match(filterStyles, /\.table-filters__grid--4[\s\S]*repeat\(4, minmax\(0, 1fr\)\)/);
  assert.match(
    filterStyles,
    /@media \(max-width: 900px\)[\s\S]*\.table-filters__grid--4[\s\S]*repeat\(2, minmax\(0, 1fr\)\)/,
  );
  assert.match(
    filterStyles,
    /@media \(max-width: 640px\)[\s\S]*\.table-filters__grid--4[\s\S]*grid-template-columns: 1fr/,
  );
  assert.match(filterStyles, /min-height: var\(--touch-target\)/);
  assert.doesNotMatch(filterStyles, /overflow-x:\s*(?:auto|scroll)/);
});

test('server-partial therapy tables remain explicitly filter-free', () => {
  assert.match(therapy, /filterable: false/);
  assert.match(therapy, /filterable: true/);
  assert.match(therapy, /noWrapper/);
});
