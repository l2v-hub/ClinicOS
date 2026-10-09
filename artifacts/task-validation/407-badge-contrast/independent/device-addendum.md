# Independent read-only addendum — AC2 desktop device check

Verdict for the combined evidence: **READY FOR CODEX QA**. The outstanding visible-desktop rendering check from the frozen independent headless report is now supported by root's separate actual-device evidence. This is not a release/closure decision; root must complete its independent rerun and publication/deployment gates.

Application remains `973d78e5e109032a36cf89cf80fd8eb2a848a649`; read-only HEAD and scoped source diff check still show that exact unchanged candidate. Original independent report and publication manifest were not modified. Their historical BLOCKED verdict accurately records the missing check at the earlier handoff; this separate addendum records the new evidence.

## Evidence audited

Read `root-rerun/device/visual-receipt.md` and `guard-receipt.json` completely, and directly inspected `chrome-desktop.jpg` using image viewing. Paths are under `C:/w-407/artifacts/task-validation/407-badge-contrast/`.

| Artifact | SHA256 |
|---|---|
| `root-rerun/device/chrome-desktop.jpg` | `3584f0dc2ec376b779145da5e0896ddaeba936eac80b38113f20311e74792488` |
| `root-rerun/device/visual-receipt.md` | `cf5df2b54d2338e0ec2bbdc81d9d2b8e6bf353af6e6066983857925cfc397257` |
| `root-rerun/device/guard-receipt.json` | `455e04a6dbfaa423757b52a40d91d16f1d41de6d2ba14cb4a9a1c0f98a6cb45b` |
| Frozen `independent/validation-report.md` | `f9a3e0b45747e02c0396ff4005352518c9e6364ca2b0875a342c51429ece7678` |
| Frozen `independent/publication-manifest.json` | `cba620b670a5db76ffb85bc40785abbc0a01436ee3b614c1a8a3c76de6839ad0` |

Root records a dedicated, visible Chrome extension browser ID3 on the actual Windows host, process version 154.0.8037.93, ordinary viewport 2133×1145 CSS px without viewport override or mobile emulation. The JPEG is 2370×1272 pixels; pixel/CSS scaling is disclosed, not mistaken for a different viewport. Its provenance is supported by root's tool-execution receipt; this addendum did not operate or independently recapture that browser.

The actual application PatientRoster is visible with an explicitly synthetic identity/patient. I can distinguish the literal green `Ricoverato` text against the pale badge background, with no clipping, overlay or truncation. Patient-list context, admission column and normal surrounding UI are visible. The status is expressed in text, not color alone. Root's accessibility DOM observation also records the literal cell/generic `Ricoverato`.

Root's computed values are opaque foreground rgb(11,107,96), background rgb(231,247,240), 14px / weight500 text. These are the same colors directly measured in the independent source-token and actual-SPA tests; their normal-text contrast is 5.76966371490132:1. Weight500 does not invoke a large-text exemption. No color sampled from a compressed JPEG is substituted for computed-style measurements.

Guard receipt records only synthetic reads and one synthetic simulator-session POST, zero clinical writes, zero denied writes, zero unexpected API requests and zero browser console errors. QA-only same-origin loopback transport, no production patient actions. Original real audit photographs were not used as synthetic proof or copied into these artifacts.

## Acceptance judgment and boundaries

Original AC2 says automated checks on real color tokens and visual completion "su dispositivo". It does not require a human inspector, physical-mobile hardware, sunlight/glare testing or panel-luminance measurement. Root explicitly reconciled its initially stricter contract to a real visible desktop-browser rendering check on the host device. The combined automatic measurements plus this genuine visible Chrome desktop evidence are sufficient for that narrow AC2 wording.

Thus AC1, AC3 and AC4 retain their independently recorded scoped passes, and AC2's previously missing desktop visual portion is now supported. Mobile evidence remains headless viewport emulation. No ward hardware, physical display luminance, direct-sunlight readability, real screen-reader validation or general palette/control-border conformity is certified. Previously disclosed low-contrast border diagnostics are unchanged and must not be described as passing due to the badge result.

Only this addendum was authored. No application, frozen evidence/report/manifest, browser/server, git, provider or GitHub mutations were made during this read-only audit.

**Codex must now re-run the QA Gate.**
