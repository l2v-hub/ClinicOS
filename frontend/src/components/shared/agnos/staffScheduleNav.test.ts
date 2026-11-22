// Milo fase 1: i turni del personale portano alla pagina «Orari operatori» (solo amministrazione).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  navigateAgnosTarget,
  navigationScope,
  readActionNavigation,
} from './agnosActionNavigation';
import { navChipLabel } from './agnosNav';

const handlers = (isAdmin: boolean, seen: string[]) => ({
  isAdmin,
  navigate: (key: string) => void seen.push(key),
  openPatient: async () => false,
  openConsegne: () => undefined,
});

test('shift answers open the operators schedule for admins only', async () => {
  const nav = { type: 'open_staff_schedule', label: 'Apri orari operatori' };
  const admin: string[] = [];
  assert.equal(await navigateAgnosTarget(nav, handlers(true, admin) as never), true);
  assert.deepEqual(admin, ['orari-operatori']);
  const operator: string[] = [];
  assert.equal(await navigateAgnosTarget(nav, handlers(false, operator) as never), false);
  assert.deepEqual(operator, []);
  assert.equal(navigationScope(nav, 'admin').navKey, 'orari-operatori');
  assert.equal(navChipLabel(nav), 'Orari operatori');
  const answer = { navigation: [nav, nav], refusal: undefined, notFound: false };
  assert.deepEqual(readActionNavigation('mostrami i turni', answer as never), nav);
});
