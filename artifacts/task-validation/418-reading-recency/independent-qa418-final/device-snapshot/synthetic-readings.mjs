export function syntheticReadings(patientId, now = new Date()) {
  const at = seconds => new Date(now.getTime() - seconds * 1000).toISOString();
  const r = (id, seconds, values) => ({id, requestId:id, patientId, measuredAt:at(seconds), values,
    authorOperatorId:'QA-NURSE-418', authorName:'Infermiere Sintetico', createdAt:at(seconds)});
  return [r('QA-MINUTES-418',480,{fr:'18'}), r('QA-DAYS-418',259200,{spo2:'98',o2:'no'}),
    r('QA-WEEKS-418',1209600,{fr:'16',spo2:'97',o2:'no',pa:'120/80',fc:'72',temperatura:'36,5',coscienza:'A',dtx:'110'})];
}
