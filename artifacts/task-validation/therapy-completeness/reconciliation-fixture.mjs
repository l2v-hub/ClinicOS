import { writeFileSync } from 'node:fs';
import { therapySourceInventory } from '../../../backend/src/intake/therapy-source-inventory.ts';
const extracted = [
  { nome: 'Alfa', dose: '5 mg', frequenza: '08:00', stato: 'attivo' },
  { nome: 'Beta', dose: '25 mg', frequenza: 'al bisogno', stato: 'sospeso', note: '<script>syntheticOnly</script>' },
  { nome: 'Beta', dose: '50 mg', frequenza: 'al bisogno', stato: 'sospeso' },
];
const rows = therapySourceInventory('', extracted);
writeFileSync('artifacts/task-validation/therapy-completeness/reconciliation-fixture.json', JSON.stringify({
  syntheticOnly: true, rows, proposals: [{ id: 'synthetic-proposal', groupId: 'g1', inputHash: 'h1', row: rows[2], status: 'pending' }],
}, null, 2));
console.log(JSON.stringify({ syntheticOnly: true, rows: rows.length }));
