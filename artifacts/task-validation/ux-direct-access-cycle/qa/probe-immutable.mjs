import pg from 'pg';
const c=new pg.Client({connectionString:process.env.DATABASE_URL});await c.connect();
const rows=(await c.query(`SELECT id,type,"formVersion" FROM "PatientAssessment" WHERE status='final' AND "formVersion" LIKE '%2026-10-03%'`)).rows;
console.log('final paper rows',rows.map(r=>r.formVersion).join(','));
for (const r of rows){ for (const sql of [`UPDATE "PatientAssessment" SET answers=answers WHERE id=$1`,`UPDATE "PatientAssessment" SET "finalSnapshot"=jsonb_set("finalSnapshot",'{result,total}','99') WHERE id=$1`,`DELETE FROM "PatientAssessment" WHERE id=$1`]){
 await c.query('BEGIN'); let out='ALLOWED'; try{await c.query(sql,[r.id]);}catch(e){out='refused '+e.code+' '+e.message.slice(0,70);} await c.query('ROLLBACK'); console.log(r.type, sql.slice(0,40), '->', out);} }
// barthel draft with invalid points via SQL
await c.query('BEGIN'); try{ await c.query(`UPDATE "PatientAssessment" SET answers=jsonb_set(answers,'{scale}','7') WHERE status='draft' AND type='barthel'`); console.log('draft invalid ok?');}catch(e){console.log('invalid draft points refused',e.code)} await c.query('ROLLBACK');
await c.end();
