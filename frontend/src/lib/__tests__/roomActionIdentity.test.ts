import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { bedEditName, roomActionNames, FORM_CAMERA_VUOTO } from '../../components/admin/RoomManagementModel';
import { RoomFormPanel } from '../../components/admin/RoomFormPanel';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const rooms = readFileSync(new URL('../../components/admin/RoomsManagement.tsx', import.meta.url), 'utf8');
test('room actions have explicit resource-bound accessible names and tooltip values', () => {
  assert.match(rooms, /aria-label=\{roomActionNames\(room\.numero\)\.edit\}/);
  assert.match(rooms, /title=\{roomActionNames\(room\.numero\)\.edit\}/);
  assert.match(rooms, /aria-label=\{roomActionNames\(room\.numero\)\.remove\}/);
  assert.match(rooms, /title=\{roomActionNames\(room\.numero\)\.remove\}/);
});
test('bed opening captures both original resource identifiers rather than editable form values', () => {
  assert.match(rooms, /bedId: bed\.id, label: bed\.label, roomNumber: room\.numero/);
  assert.match(rooms, /aria-label=\{bedEditName\(bed\.label, room\.numero\)\}/);
  assert.match(rooms, /title=\{bedEditName\(bed\.label, room\.numero\)\}/);
});
test('room rename retains original heading identity in a separate captured state', () => {
  assert.match(rooms, /setEditRoomNumber\(room\.numero\)/);
  assert.match(rooms, /roomNumber=\{editId \? editRoomNumber : null\}/);
});
test('destructive action is distinct and remains behind the existing resource-bound confirmation', () => {
  assert.match(rooms, /className="room-card__actions"/);
  assert.match(rooms, /icon-btn--danger[\s\S]*?<IcoTrash\s*\/>/);
  assert.match(rooms, /title=\{pendingRoom \? roomActionNames\(pendingRoom\.numero\)\.deleteTitle/);
  assert.match(rooms, /confirmLabel=\{pendingRoom \? roomActionNames\(pendingRoom\.numero\)\.remove/);
  assert.match(rooms, /onClick=\{\(\) => setPendingRoom\(room\)\}/);
  assert.match(rooms, /onCancel=\{\(\) => setPendingRoom\(null\)\}/);
});
test('custom bed labels stay unambiguous across separator/quote collisions', () => {
  assert.notEqual(bedEditName('A', '1 della camera 2'), bedEditName('A della camera 1', '2'));
  assert.notEqual(bedEditName('A" della camera "1', '2'), bedEditName('A', '1" della camera "2'));
  assert.equal(bedEditName('A', '101'), 'Modifica letto "A" della camera "101"');
  assert.deepEqual(roomActionNames('101'), {edit:'Modifica camera 101',remove:'Elimina camera 101',deleteTitle:'Eliminare la camera 101?'});
});
test('room editor rendering preserves original target and escapes hostile identity', () => {
  const props = {roomNumber:'<img src=x>',form:{...FORM_CAMERA_VUOTO,numero:'103'},onChange:()=>{},saving:false,onSave:()=>{},onClose:()=>{}};
  const html = renderToStaticMarkup(createElement(RoomFormPanel, props));
  assert.match(html, /Modifica camera &lt;img src=x&gt;/);
  assert.doesNotMatch(html, /<img/);
  assert.match(html, /value="103"/);
  assert.match(html, /for="room-edit-number"/);
});
test('all newly touched room presentation modules meet the500line budget', () => {
  for(const name of ['RoomsManagement.tsx','RoomManagementModel.ts','RoomFormPanel.tsx','BedEditDialog.tsx']) {
    const source = readFileSync(new URL('../../components/admin/'+name, import.meta.url), 'utf8');
    assert.ok(source.split('\n').length <500, name);
  }
});
test('bed resource headings wrap bounded custom labels within the dialog', () => {
  const dialog = readFileSync(new URL('../../components/admin/BedEditDialog.tsx', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../../components/admin/RoomActions.css', import.meta.url), 'utf8');
  assert.match(dialog, /className="modal-title room-bed-edit__title"/);
  assert.match(css, /\.rooms-view \.room-bed-edit__title\s*\{[^}]*min-width:\s*0;[^}]*overflow-wrap:\s*anywhere;/);
});
test('long camera identities wrap in the inline editor and deletion confirmation without shared control overrides', () => {
  const css = readFileSync(new URL('../../components/admin/RoomActions.css', import.meta.url), 'utf8');
  for (const selector of ['#room-edit-panel-title', '.confirm-dialog__title']) {
    assert.ok(css.includes('.rooms-view ' + selector), selector);
  }
  assert.match(css, /\.rooms-view #room-edit-panel-title[\s\S]*?min-width:\s*0;[\s\S]*?overflow-wrap:\s*anywhere;/);
  assert.match(css, /\.rooms-view \.confirm-dialog__message\s*\{[^}]*overflow-wrap:\s*anywhere;/);
  assert.match(css, /\.rooms-view \.confirm-dialog__actions\s*\{[^}]*flex-wrap:\s*wrap;/);
  assert.match(css, /\.rooms-view \.confirm-dialog__actions \.btn-danger\s*\{[^}]*max-width:\s*100%;[^}]*white-space:\s*normal;[^}]*overflow-wrap:\s*anywhere;/);
});
test('bounded destructive text defeats canonical nowrap specificity without replacing the shared skin', () => {
  const css = readFileSync(new URL('../../components/admin/RoomActions.css', import.meta.url), 'utf8');
  assert.match(css, /\.rooms-view \.confirm-dialog__actions \.btn-danger:not\(#ds\)\s*\{[^}]*height:\s*auto;[^}]*white-space:\s*normal;/);
});
