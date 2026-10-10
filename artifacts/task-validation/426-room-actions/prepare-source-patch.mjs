import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const path='frontend/src/components/admin/RoomsManagement.tsx',old=readFileSync(path,'utf8').replaceAll('\r\n','\n');let next=old;
function replace(a,b){assert.equal(next.split(a).length,2,a);next=next.replace(a,b);}
replace('IcoPlus, IcoEdit, IcoCheck, IcoX, IcoBed','IcoPlus, IcoEdit, IcoX, IcoBed, IcoTrash');
replace("import { AccessibleDialogSurface } from '../shared/AccessibleDialogSurface';", "import { RoomFormPanel } from './RoomFormPanel';\nimport { BedEditDialog } from './BedEditDialog';\nimport './RoomActions.css';\nimport { FORM_CAMERA_VUOTO, STATO_LETTO_CLASS, STATO_LETTO_LABEL, bedStatoDisplay, activeBedAssignment, fetchFacilityData, roomActionNames, bedEditName, type RoomAPI, type BedAPI, type OccupancyAPI, type StatoLetto, type BedEditTarget } from './RoomManagementModel';");
const start=next.indexOf('/* ── API types'),end=next.indexOf('/* ── Component');assert.ok(start>0&&end>start);next=next.slice(0,start)+next.slice(end);
replace("const [editId, setEditId] = useState<string | null>(null);", "const [editId, setEditId] = useState<string | null>(null);\n  const [editRoomNumber, setEditRoomNumber] = useState<string | null>(null);");
replace("useState<{ bedId: string } | null>(null)","useState<BedEditTarget | null>(null)");
replace('setEditId(room.id);','setEditId(room.id);\n    setEditRoomNumber(room.numero);');
replace('function apriLettoEdit(bed: BedAPI) {\n    setLettoEdit({ bedId: bed.id });','function apriLettoEdit(bed: BedAPI, room: RoomAPI) {\n    setLettoEdit({ bedId: bed.id, label: bed.label, roomNumber: room.numero });');
const formStart=next.indexOf('      {/* Room form */}'),formEnd=next.indexOf('      {/* Filtro reparto */}');assert.ok(formStart>0&&formEnd>formStart);
next=next.slice(0,formStart)+`      {/* Presentation-only editors; resource identity stays separate from editable values. */}
      {formAperto && (
        <RoomFormPanel roomNumber={editId ? editRoomNumber : null} form={form} onChange={setForm}
          saving={saving} onSave={() => void salvaCamera()} onClose={() => setFormAperto(false)} />
      )}
      {lettoEdit && (
        <BedEditDialog target={lettoEdit} form={lettoForm} onChange={setLettoForm}
          bedSaving={bedSaving} onSave={() => void salvaLetto()} onClose={() => setLettoEdit(null)} />
      )}

`+next.slice(formEnd);
replace('title="Modifica camera"','title={roomActionNames(room.numero).edit}\n                    aria-label={roomActionNames(room.numero).edit}');
replace('title="Elimina camera"','title={roomActionNames(room.numero).remove}\n                    aria-label={roomActionNames(room.numero).remove}');
replace('title="Modifica letto"','title={bedEditName(bed.label, room.numero)}\n                          aria-label={bedEditName(bed.label, room.numero)}');
replace('onClick={() => apriLettoEdit(bed)}','onClick={() => apriLettoEdit(bed, room)}');
const buttonsStart=next.indexOf('                  <button\n                    className="icon-btn icon-btn--sm icon-btn--edit"'),buttonsEnd=next.indexOf('\n                </div>',buttonsStart);assert.ok(buttonsStart>0&&buttonsEnd>buttonsStart);const buttons=next.slice(buttonsStart,buttonsEnd);assert.ok(buttons.includes('setPendingRoom(room)'));next=next.slice(0,buttonsStart)+'                  <div className="room-card__actions">\n'+buttons.replace('<IcoX />','<IcoTrash />')+'\n                  </div>'+next.slice(buttonsEnd);
replace('title="Eliminare la camera?"',"title={pendingRoom ? roomActionNames(pendingRoom.numero).deleteTitle : 'Eliminare la camera?'}");
replace('confirmLabel="Elimina camera"',"confirmLabel={pendingRoom ? roomActionNames(pendingRoom.numero).remove : 'Elimina camera'}");
assert.ok(next.split('\n').length<500,'Room parent remains too long');
process.stdout.write('*** Begin Patch\n*** Update File: C:/w-426/'+path+'\n@@\n'+old.trimEnd().split('\n').map(l=>'-'+l).join('\n')+'\n'+next.trimEnd().split('\n').map(l=>'+'+l).join('\n')+'\n*** End Patch');
