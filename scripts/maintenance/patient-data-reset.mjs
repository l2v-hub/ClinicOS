// Explicitly authorized patient-only reset. Foreign keys remain enabled throughout.
const quote=s=>'"'+s.replaceAll('"','""')+'"';
const fullDelete=[
 'DiaryEntryAcknowledgement','DiaryEntryReadReceipt','PatientDiaryEntry',
 'ConsegnaAcknowledgement','ConsegnaReadReceipt','ConsegnaCreationReceipt','Consegna',
 'MedicationAdministration','TherapyAdministrationReceipt','PrnAdministration',
 'TherapySchedule','PatientTherapy','ClinicalNote','ClinicalRecord','Appointment',
 'PatientDocument','PatientAssessmentAttestation','PatientAssessment',
 'PatientIntakeDocument','PatientNarrativeSection','PatientParameterReading','Cartella',
 'PatientRoomAssignment','ImportAudit','ImportDocument','ImportProcessingUnit','ImportMutation',
 'ImportJob','PatientIntakeDraft','Patient',
];
export {fullDelete as patientDataTables};
const preserved=['AuthzPolicyVersion','Bed','Farmaco','FarmacoImport','FarmacoPrincipioAttivo','Operator','OperatorRosterPreference','OperatorSchedule','Room','RosterContext','User','_prisma_migrations'];
export async function signatures(client,tables) {
 const result=[];
 for(const table of [...tables].sort()) {
  const row=(await client.query(`SELECT count(*)::text AS rows,md5(coalesce(string_agg(h,'' ORDER BY h),'')) AS digest FROM (SELECT md5(to_jsonb(t)::text) AS h FROM public.${quote(table)} t) s`)).rows[0];
  result.push({table,...row});
 }
 return result;
}
const notePredicate=`(coalesce(n."pazienteId",'')<>'' OR coalesce(n."pazienteNome",'')<>'' OR EXISTS (SELECT 1 FROM "Patient" p WHERE strpos(lower(n.messaggio),lower(p."firstName"||' '||p."lastName"))>0 OR strpos(lower(n.messaggio),lower(p."lastName"||' '||p."firstName"))>0 OR strpos(n.messaggio,p.id)>0 OR (coalesce(p."codiceFiscale",'')<>'' AND strpos(upper(n.messaggio),upper(p."codiceFiscale"))>0)))`;
async function subsetSignature(client,sql) {
 return (await client.query(`SELECT count(*)::text AS rows,md5(coalesce(string_agg(h,'' ORDER BY h),'')) AS digest FROM (SELECT md5(to_jsonb(t)::text) AS h FROM (${sql}) t) s`)).rows[0];
}
export async function resetPatientData(client,{expectedBaseline,simulateFailure=false}={}) {
 let committed=false;
 try {
  await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ');
  await client.query("SET LOCAL lock_timeout='15s'");
  await client.query("SET LOCAL statement_timeout='120s'");
  const tables=(await client.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")).rows.map(r=>r.tablename);
  const known=new Set([...fullDelete,...preserved,'RosterEpoch','Nota','NotaRecipientState','AiAuditEvent']);
  if(tables.some(t=>!known.has(t))) throw new Error('UNCLASSIFIED_TABLE');
  if(!tables.includes('Patient')||!tables.includes('User')||!tables.includes('Operator')) throw new Error('REQUIRED_TABLE_MISSING');
  await client.query('LOCK TABLE '+tables.map(t=>'public.'+quote(t)).join(',')+' IN SHARE ROW EXCLUSIVE MODE');
  const inactiveForeignKeyTriggers=(await client.query("SELECT count(*)::int AS n FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE t.tgisinternal AND n.nspname='public' AND t.tgenabled NOT IN ('O','A')")).rows[0].n;
  if(inactiveForeignKeyTriggers) throw new Error('FOREIGN_KEY_TRIGGER_DISABLED');
  const before=await signatures(client,tables);
  if(expectedBaseline) {
   const affected=new Set([...fullDelete,'Nota','NotaRecipientState']);
   if(JSON.stringify(before.filter(t=>affected.has(t.table)))!==JSON.stringify(expectedBaseline.filter(t=>affected.has(t.table)))) throw new Error('CLINICAL_DATA_CHANGED_SINCE_BACKUP');
  }
  const unknownPreservedReferences=(await client.query("SELECT conrelid::regclass::text AS source,confrelid::regclass::text AS target FROM pg_constraint WHERE contype='f' AND connamespace='public'::regnamespace")).rows.filter(r=>preserved.includes(r.source.replaceAll('"',''))&&fullDelete.includes(r.target.replaceAll('"','')));
  if(unknownPreservedReferences.length) throw new Error('PRESERVED_TABLE_REFERENCES_PATIENT_DATA');
  await client.query(`CREATE TEMP TABLE reset_patient_notes ON COMMIT DROP AS SELECT n.id FROM "Nota" n WHERE ${notePredicate}`);
  const preservedNotes=await subsetSignature(client,'SELECT n.* FROM "Nota" n WHERE NOT EXISTS (SELECT 1 FROM reset_patient_notes d WHERE d.id=n.id)');
  const preservedNoteStates=await subsetSignature(client,'SELECT s.* FROM "NotaRecipientState" s WHERE NOT EXISTS (SELECT 1 FROM reset_patient_notes d WHERE d.id=s."notaId")');
  const preservedAudits=await subsetSignature(client,'SELECT * FROM "AiAuditEvent" WHERE "patientId" IS NULL');
  const mutable=new Set([...fullDelete,'Nota','NotaRecipientState','AiAuditEvent']);
  const triggers=(await client.query("SELECT c.relname AS table,t.tgname AS name,t.tgenabled AS enabled FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE NOT t.tgisinternal AND n.nspname='public' ORDER BY 1,2")).rows;
  const disabled=triggers.filter(t=>mutable.has(t.table));
  for(const trigger of disabled) await client.query(`ALTER TABLE public.${quote(trigger.table)} DISABLE TRIGGER ${quote(trigger.name)}`);
  const deleted=[];
  deleted.push({table:'Nota',rows:String((await client.query('DELETE FROM "Nota" WHERE id IN (SELECT id FROM reset_patient_notes)')).rowCount)});
  deleted.push({table:'AiAuditEvent',rows:String((await client.query('DELETE FROM "AiAuditEvent" WHERE "patientId" IS NOT NULL')).rowCount)});
  for(const table of fullDelete.filter(t=>tables.includes(t))) deleted.push({table,rows:String((await client.query('DELETE FROM public.'+quote(table))).rowCount)});
  if(simulateFailure) throw new Error('SIMULATED_FAILURE_AFTER_DELETE');
  if(tables.includes('RosterEpoch')) await client.query('UPDATE "RosterEpoch" SET roster=roster+1,therapy=therapy+1');
  for(const trigger of disabled) {
   const action={O:'ENABLE',A:'ENABLE ALWAYS',R:'ENABLE REPLICA',D:'DISABLE'}[trigger.enabled];
   if(!action) throw new Error('UNKNOWN_TRIGGER_MODE');
   await client.query(`ALTER TABLE public.${quote(trigger.table)} ${action} TRIGGER ${quote(trigger.name)}`);
  }
  const after=await signatures(client,tables);
  if(after.some(t=>fullDelete.includes(t.table)&&t.rows!=='0')) throw new Error('PATIENT_DATA_REMAINS');
  if(JSON.stringify(before.filter(t=>preserved.includes(t.table)))!==JSON.stringify(after.filter(t=>preserved.includes(t.table)))) throw new Error('PRESERVED_DATA_CHANGED');
  if(JSON.stringify(preservedNotes)!==JSON.stringify(await subsetSignature(client,'SELECT * FROM "Nota"'))) throw new Error('PRESERVED_NOTES_CHANGED');
  if(JSON.stringify(preservedNoteStates)!==JSON.stringify(await subsetSignature(client,'SELECT * FROM "NotaRecipientState"'))) throw new Error('PRESERVED_NOTE_STATES_CHANGED');
  if(JSON.stringify(preservedAudits)!==JSON.stringify(await subsetSignature(client,'SELECT * FROM "AiAuditEvent"'))) throw new Error('PRESERVED_AUDIT_CHANGED');
  const currentTriggers=(await client.query("SELECT c.relname AS table,t.tgname AS name,t.tgenabled AS enabled FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE NOT t.tgisinternal AND n.nspname='public' ORDER BY 1,2")).rows;
  if(JSON.stringify(triggers)!==JSON.stringify(currentTriggers)) throw new Error('TRIGGER_STATE_CHANGED');
  const invalid=(await client.query("SELECT count(*)::int AS n FROM pg_constraint WHERE connamespace='public'::regnamespace AND NOT convalidated")).rows[0].n;
  if(invalid) throw new Error('INVALID_CONSTRAINT');
  await client.query('COMMIT');committed=true;
  return {committed,deleted,before:before.map(({table,rows})=>({table,rows})),after:after.map(({table,rows})=>({table,rows})),preservedDataUnchanged:true,triggerStatesUnchanged:true,foreignKeysEnabled:true};
 } finally {if(!committed) await client.query('ROLLBACK').catch(()=>{});}
}
