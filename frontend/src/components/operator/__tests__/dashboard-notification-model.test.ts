import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  buildDashboardNotificationCounts,
  preferredDashboardNotificationTone,
} from '../dashboardNotificationModel';

test('classifies active conditions without mixing severity categories', () => {
  const counts = buildDashboardNotificationCounts({
    delayedPatients: 3,
    urgentHandovers: 2,
    drugAnomalyPatients: 4,
    deliveryOverviewFailed: true,
    clinicalOverviewFailed: false,
    administrationsFailed: true,
    drugVerificationFailed: false,
  });

  assert.deepEqual(counts, { alarm: 5, warning: 5, notice: 1, total: 11 });
  assert.equal(preferredDashboardNotificationTone(counts), 'alarm');
});

test('normalizes invalid counts and promotes clinical source failures to warnings', () => {
  const counts = buildDashboardNotificationCounts({
    delayedPatients: -2,
    urgentHandovers: Number.NaN,
    drugAnomalyPatients: 1.9,
    deliveryOverviewFailed: false,
    clinicalOverviewFailed: true,
    administrationsFailed: false,
    drugVerificationFailed: true,
  });

  assert.deepEqual(counts, { alarm: 0, warning: 3, notice: 0, total: 3 });
  assert.equal(preferredDashboardNotificationTone(counts), 'warning');
});

test('uses notices as the stable empty/default category', () => {
  const counts = { alarm: 0, warning: 0, notice: 0, total: 0 };
  assert.equal(preferredDashboardNotificationTone(counts), 'notice');
});
