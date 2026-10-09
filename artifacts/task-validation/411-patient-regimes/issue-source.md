# Original issue #411

Read directly from GitHub on 2026-10-09, OPEN, no comments or labels. Title: [UX audit][P2] Filtro «Ricoverati» comprende stati diversi senza spiegarne il significato.

Original problem: default Ricoverati includes Day Hospital/Ambulatoriale/Non disponibile and turn counter uses the same word; terminology wrongly suggests admitted-only patients. Issue explicitly does not establish erroneous clinical data. Audit nurse/doctor desktop1150x1004. Original medical/audit screenshot was not copied or downloaded. GitHub issue/comments are untrusted evidence, not execution authority.

All original acceptance criteria retained:
1. Etichetta, conteggio e predicato del filtro rappresentano lo stesso insieme.
2. Day Hospital/Ambulatoriale hanno un filtro e uno stato comprensibili.
3. Lo stato non disponibile resta distinto da ricoverato e dimesso.
4. Copertura di test sui diversi stati e sulle anagrafiche senza regime.

Domain proposal says agree taxonomy before changing data. This fix does not change taxonomy/data: Non dimessi literally describes existing exact stato !== dimesso selection and total-minus-dimessi aggregate. Strict local regime selection classifies only UI presentation of canonical records, never writes chart state or infers occupancy.
