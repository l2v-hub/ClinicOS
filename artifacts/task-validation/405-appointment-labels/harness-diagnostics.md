# Independent harness diagnostics

The first automatic runs did not all pass. They were repaired in evidence-only scripts; application source remained frozen21f8c75.

- Initial #/agenda hash at simulator login landed on dashboard; actual current route is #/agenda-operatore. The harness now navigates after synthetic login.
- Clicking Patient opens its existing popup, which visually covers Data. Before other label-click tests the harness blurs the popup using the dialog close control focus; it does not force clicks or bypass native label behavior.
- Patient search actually POSTs /patients/page/search. Initial fixture lacked this endpoint; guarded500 caused unavailable search. Added synthetic intercepted search response, not app change.
- Reload in disabled-auth simulator returns to role selection. Harness explicitly reselects synthetic nurse after reload and revisits agenda before asserting mocked persistence.
- Admin agenda has no «Nuovo appuntamento» toolbar button; creation uses existing pointer cells. The harness now exercises a real .agt-admin-cell.free click.
- Admin bootstrap reads /admin/rooms; missing mock initially caused guarded500. Added empty synthetic room response; final health asserts zero unexpected errors rather than tolerating it.
- Existing admin pointer cell is a nonfocusable div. An extra admin focus-return assertion failed; this is outside nurse405AC4 and unchanged in candidate. Final admin extra case asserts labels and Escape closure only, and records limitation. Nurse14:00 keyboard-origin restoration and edit-trigger restoration pass.

failed-trace.zip, screenshots/failed-*.png, test-results/exception.txt and raw page@ videos are diagnostic failed-harness artifacts, NOT final acceptance proof. Final successful evidence is trace.zip/mobile-trace.zip/admin-trace.zip, named video files and browser-results.json. No real reader evidence exists in either failed or passing automatic runs.
