const element = (id) => document.getElementById(id);
let loading = false;
function textCell(value) {
  const cell = document.createElement('td');
  cell.textContent = value;
  return cell;
}
async function refresh() {
  if (loading) return;
  loading = true;
  element('refresh').disabled = true;
  try {
    const response = await fetch('/api/status', { cache: 'no-store' });
    if (!response.ok) throw new Error('Acceso dashboard non riuscito.');
    const data = await response.json();
    if (data.snapshot) {
      const snapshot = data.snapshot;
      for (const name of ['queued', 'processing', 'blocked', 'resolved'])
        element(name).textContent = snapshot.counts[name];
      element('setup-phase').textContent = snapshot.setup.phase;
      element('setup-rounds').textContent =
        `Review utilizzate: ${snapshot.setup.reviews}/${snapshot.setup.reviewLimit}`;
      const rows = snapshot.rows.map((issue) => {
        const row = document.createElement('tr');
        const first = document.createElement('td');
        const link = document.createElement('a');
        link.textContent = `#${issue.number}`;
        link.href = `https://github.com/l2v-hub/ClinicOS/issues/${issue.number}`;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        first.append(link);
        row.append(first);
        const status = textCell(issue.status);
        status.dataset.status = issue.status;
        row.append(status);
        for (const value of [
          issue.phase,
          issue.batch || '—',
          `${issue.implementation}/4`,
          `${issue.reviews}/4`,
          issue.pr ? `#${issue.pr}` : '—',
        ])
          row.append(textCell(value));
        return row;
      });
      element('issues').replaceChildren(...rows);
      element('empty').hidden = rows.length > 0;
      element('updated').textContent =
        `Ultima lettura GitHub: ${new Date(snapshot.fetchedAt).toLocaleString('it-IT')}${snapshot.updatedAt ? ` · Ultimo cambio di fase: ${new Date(snapshot.updatedAt).toLocaleString('it-IT')}` : ''}`;
    }
    element('error').hidden = data.ok;
    element('error').textContent = data.ok ? '' : data.error;
  } catch {
    element('error').hidden = false;
    element('error').textContent =
      'Connessione non disponibile. I dati visualizzati possono essere obsoleti.';
  } finally {
    loading = false;
    element('refresh').disabled = false;
  }
}
element('refresh').addEventListener('click', refresh);
refresh();
setInterval(refresh, 15000);
