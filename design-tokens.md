# ClinicOS — Design Tokens (estratti dal mockup approvato)

Fonte di verità: `mockup/design-mockup.html` (artifact serializzato; CSS reale de-escaped/decompresso dai blob).
Il mockup usa in modo inequivocabile il brand **`#2F6BED`** (logo, link, bottoni, ~45 occorrenze) — NON `#0F5FD7`.

## Font
- UI: **Public Sans** — pesi usati: 400, 500, 600, 700, 800
- Mono: **JetBrains Mono** — pesi 400, 500
- `@import` Google Fonts (già presente in App.css riga 6):
  `https://fonts.googleapis.com/css2?family=Public+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap`

## Brand blu
| token | valore | contesto |
|---|---|---|
| brand | `#2F6BED` | logo, link, bottoni primari |
| brand attivo/pressed | `#1D4FC4` | stato attivo |
| gradiente brand | `linear-gradient(150deg,#3F78F6,#2F6BED)` | logo/CTA |
| blu-dim | `rgba(47,107,237,0.14)` | fondo tenue |
| blu-glow | `rgba(47,107,237,0.08)` | glow |
| blu-bg | `#EEF3FE` | badge/chip blu |

## Superfici
| token | valore | contesto |
|---|---|---|
| page bg | `#EEF1F6` | body |
| surface | `#FFFFFF` | card/tabelle |
| surface-raised | `#F3F6FB` | field/raised |

## Bordi / divider
| token | valore | contesto |
|---|---|---|
| border | `#E6EBF2` | bordi card/tabella |
| border-input | `#E1E8F2` | input (1.5px) |
| divider | `#F0F3F8` | separatore riga |
| hover | `#F7F9FC` | hover riga/header tabella |

## Testo
| token | valore | contesto |
|---|---|---|
| text | `#16202E` | testo primario |
| text-muted | `#5A6B80` | testo secondario |
| text-xmuted | `#8595A8` | testo terziario (⚠ AA ~3.3:1 — annotato) |

## Semantica clinica
| token | valore | bg | contesto |
|---|---|---|---|
| emerald (ok) | `#16A37B` | `#E7F7F0` | esiti positivi/verde |
| emerald-text | `#0E8A63` | — | testo verde scuro |
| amber (warning) | `#C77700` | `#FDF3E2` | avvisi |
| amber-text | `#9A5C00` | — | testo ambra scuro |
| red (ALERT/errore) | `#D93A4A` | `#FDECEE` (border `#F6C9CE`) | SOLO alert/errore — mai brand/attivo |
| purple (terapie) | `#6C4BD1` | `#F0ECFC` | terapie/farmaci |

## Sidebar scura
| token | valore | contesto |
|---|---|---|
| sidebar bg | `#0F1B30` | aside |
| sidebar gradiente | `#123056` | pannello/gradiente |
| item inattivo | `#8EA3C4` | testo/icona |
| item attivo | `#FFFFFF` | testo/icona attiva |
| item attivo bg | `rgba(255,255,255,0.12)` | pill attiva |
| item hover bg | `rgba(255,255,255,0.08)` | hover |
| geometria item | `width:72px; padding:11px 0; radius:14px; gap:6px; font:600 11px` | |

## Raggi
| token | valore |
|---|---|
| radius | `12px` (controlli) |
| radius-sm | `8px` |
| card-radius | `16px` |
| card-radius-sm | `12px` |

## Ombre
| token | valore |
|---|---|
| shadow-card | `0 1px 2px rgba(16,32,54,0.04)` |
| shadow-sm | `0 1px 2px rgba(16,32,54,0.04)` |
| shadow-focus | `0 0 0 3px rgba(47,107,237,0.18)` |

## Layout / spaziature
| token | valore |
|---|---|
| sidebar-w | `96px` |
| header-h | `64px` |
| font-size sm/base/lg | `12 / 14 / 16 px` (mockup 11–18, base 14–15) |

## Note
- Token GIÀ canonici nel repo (invariati): `--blue #2F6BED`, `--indigo-bg #EEF3FE`, `--emerald #16A37B`, `--emerald-bg #E7F7F0`, `--amber #C77700`, `--amber-bg #FDF3E2`, `--purple #6C4BD1`, `--surface #FFFFFF`, `--card-radius 16px`.
- Non presenti nel mockup (mantenuti dall'attuale): `--navy-border`, `--teal`/`--teal-bg`, `--radius-xs`, `--sidebar-w-collapsed`, `--touch-target`, `--shadow-card-hover`, `--shadow-md`.
- Rosso: riservato ad alert clinici/errori/badge conteggio — mai brand/attivo.
