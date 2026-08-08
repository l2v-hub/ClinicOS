export const OPERATORI = [
  { id: 'op-1', nome: 'Marco', cognome: 'Ferretti', reparto: 'Medicina', stato: 'attivo', ruolo: 'medico', email: 'm@x.it', telefono: '', pazientiAssegnati: 0, appuntamentiOggi: 0 },
  { id: 'op-2', nome: 'Sara', cognome: 'Bianchi', reparto: 'Riabilitazione', stato: 'attivo', ruolo: 'infermiere', email: 's@x.it', telefono: '', pazientiAssegnati: 0, appuntamentiOggi: 0 },
];
export async function stubOperators(page) {
  await page.route('**/operators', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(OPERATORI) }),
  );
}
