# GitHub issue414 source read

Original title: [UX audit][P2] Bozze dei moduli: persistenza spiegata con «scheda» e «server»
Read directly with authenticated GitHub API/gh; OPEN,0comments,no labels,2026-10-09. Audit8October2026,nurse profile1150x1004,live commit unknown. No original patient audit photos downloaded/copied. Current accepted applicatione01bd55114e2b5b1615b4088d988a41aad60eb80; distinct proof4267026c does not enter application baseline.

Problem: existing reload-in-this-tab and server-save wording plus Draft label fails to explain where/for whom drafts are available across device/shift. Issue explicitly has not verified cross-device persistence; proposal suggests clear Italian local/saved states,timestamp and save action according to real product guarantees.

Original acceptance criteria:
- Località e disponibilità della bozza sono comprensibili senza la parola server.
- Lo stato cambia solo dopo conferma effettiva del salvataggio.
- Fallimento e tentativo in corso hanno messaggi e recupero chiari.
- Testare cambio tab, riaccesso e dispositivo distinto in ambiente di test.

Application inspected: local drafts use sessionStorage scoped operatorID:role,not all windows of a device; App logout clears local store. Saved drafts are author-only AND require ongoing patient scope,including manager access not bypassing draft author. History and GET are filtered by backend assessmentWhere and listAssessments. Existing client receipt validation/store finish fences current operation and only confirmed saved outcome installs record. No optimistic saved claim or cross-device availability for local edits. UI must describe these limits without changing persistence or AuthZ.
