# Spetchbook — Architecture & Design Decisions (v109)

> **Naming note (session 85):** this project was renamed from "Sketch3D" to "Spetchbook" this session. All *code, identifiers, functions, CSS classes, save-format field names, and internal comments* still say `sketch3d`/`sk3d`/`Sketch3D` throughout — only the user-facing app name (title, manifest, exported-file metadata) changed. Do not assume a `sketch3d` string found in code is stale or needs updating; it almost certainly doesn't. See the Session 85 entry in `handoff.md` for the full list of what did and didn't change, and gotchas.md Critical Rule #83 for why the IndexedDB database name was deliberately left as `sketch3d`.

## Core Constraint: Single-File Architecture

Everything lives in one `index.html` (~19,420 lines as of session 108). **This is non-negotiable.** No bundler, no imports, no separate CSS/JS files, no build step.

```
Lines ~22–1012     CSS (<style> block)
Lines ~1014–2075   HTML (DOM structure)
Lines ~2076–16671  JavaScript (<script> block)
```

These shift every session — re-grep, never trust them.

### Why Single-File?
- Deploys to GitHub Pages with zero build tooling
- Works as a PWA on Android with just a service worker
- No dependency management, no node_modules, no package.json
- File can be opened directly in any browser for instant testing

---

## Tech Stack

| Component | Technology | Version | Why |
|---|---|---|---|
| 3D Rendering | Three.js | **r128** (CDN-pinned) | Stable, well-tested, CDN avoids build step |
| Language | Vanilla JS | ES6 subset | Android WebView compatibility — no `?.`, no bare `catch` |
| CSS | Inline `<style>` | CSS3 + custom properties | Theming via `--ink`, `--pan`, `--bg`, etc. |
| Storage | IndexedDB | Native | Autosave + manual saves, no external DB |
| PWA | Service Worker | Cache-first | Offline capability |
| Font | DM Mono | Google Fonts CDN | Monospace design aesthetic |

---

## CSS Architecture

### Theme System (v53)

Four built-in themes controlled by `body[data-theme]` attribute:
- `:root` — warm parchment (default): `--bg:#cdb899`, `--ink:#1a1a2e`
- `body[data-theme="dark"]` — dark mode: `--bg:#2a2a2e`, `--ink:#e0e0e4`
- `body[data-theme="light"]` — clean white: `--bg:#e8e8ec`, `--ink:#1a1a2e`
- `body[data-theme="eink"]` — e-ink mode: `--bg:#ffffff`, `--ink:#000000`, `--pan:#ffffff` (pure white, fully opaque panels, no blur/noise)

**E-ink-specific CSS overrides:**
- `#cc::after { display:none }` — kills paper noise texture
- `.card { backdrop-filter:none }` — kills blur (causes ghosting on e-ink)
- `.btn.on { background:transparent; border:2px solid #000; font-weight:600 }` — bold outline, no fill
- `.btn:hover { background:transparent; border-color:#000 }` — outline only
- `.gc-sel-btn` — transparent bg, black text

**Alpha-composited ink overlays** use `rgba(var(--ink-r),var(--ink-g),var(--ink-b), alpha)` — 55 CSS rules use this pattern. The `--ink-r/g/b` vars are set by `setUITheme()` in JS.

**Auto-theme:** `setBgColor()` computes luminance and auto-selects dark/light/default theme. Skipped when `_uiTheme==='eink'`.

### Layout Modes

Body classes control layout:
- `.narrow-mode` — portrait/phone, bottom narrow-bar with horizontal scrolling tools
- No `.narrow-mode` — landscape/tablet/desktop, side column with vertical cards
- `.ui-hidden` — all UI hidden, only mini-toolbar at bottom
- `.rside` — sidebar on right side instead of left
- `.fps-active` — FPS mode active, shows joystick controls
- `.sc-detached` — sidecol cards floating independently

### Key CSS Design Decisions
- All interactive elements ≥22px for Android touch targets
- `backdrop-filter:blur(12px)` on panels for frosted glass effect (disabled in eink)
- `-webkit-tap-highlight-color:transparent` on all buttons
- `scrollbar-width:none` on horizontal strips
- **`.brush-pop` (v55 reused for `#ex-pop`):** shared popover style (`position:fixed`, `.open{display:flex}`) originally built for `#sz-pop`/`#op-pop`. `#ex-pop` reuses the class but is anchored under `#topbar` via inline `left:50%;transform:translateX(-50%)` plus a dedicated JS-set `top`, rather than a trigger-button-relative position — it's the first popover in the app not tied to a specific button.

---

## HTML Structure

```
<head>
  Service worker registration
  <style> block (~870 lines)
</head>
<body>
  #topbar         — fixed top bar. Order as of v84:
                    undo redo │ ruler▾ sym▾ · eye eye▾ layers │ pages views │ file │ new
                    (#bnew moved to last, eye+layers moved in beside #bstylus — v74;
                     #bstylus removed from this row entirely — v78, see below;
                     #bclear removed entirely — v84, replaced by #layers-pop's footer
                     actions; #blook ["look around"] moved into #view-pop — v84)
  #ex-pop         — Extrude size/direction popover (v55, anchored under #topbar)
  #sidecol        — side column (wide mode) containing:
    #sidetools    — draw/erase/select + brush modifiers
    #bpanel       — brush size/opacity presets
    #colors       — 5 color swatches + picker button
    #ghud          — gizmo canvas + controls
      #ghud-sel   — selection action buttons (All/Mv/Rot/Sc/Dup/Loft/LoftSolid/Ext[v55]/Del/✕)
    #layers        — layer management
  #stab           — sidebar toggle tab
  #narrow-bar     — bottom bar (narrow/portrait mode) containing:
    pb-panel-nav   — nav/gizmo panel
    pb-panel-gizmo — gizmo canvas + controls
      #pb-ghud-sel — same selection buttons as #ghud-sel, narrow-bar variant
      #pb-ghud-sel-prim — ref-object colour/opacity/⬡Pln (added v73; mirrors #ghud-sel-prim)
    #pb-scroll/#pb-cycbar — drawing tools ONLY as of v73:
      draw erase select │ flat smooth vel │ undo redo  (8 buttons, ~300px, no scroll)
    #pb-colors    — layer dot + color/size/opacity strip
  #pb-float-card  — detached float card for nav/gizmo (collapsed by default in .ui-hidden as of v71 — see #pb-fab)
  #sc-hidden-bar  — mini-toolbar when UI hidden
  #flipbook       — full-screen page navigator (session 108; replaced #pages)
                    #fb-top/#fb-name/#fb-close · #fb-stage(#fb-prev/#fb-page/#fb-next)
                    #fb-page > #fb-static + #fb-leaf(#fb-leaf-front/#fb-leaf-back) + #fb-crease
                    #fb-num · #fb-hint · #fb-scrub(.fb-th… + #fb-add)
  #views          — views strip (bottom, toggled)
  #expmenu        — export dropdown
  #view-pop       — view options popover (includes bg swatches + theme buttons DEF/DRK/LGT/INK)
  #layers-pop      — layers popover (footer as of v84: Clear Active Layer /
                     Clear All Strokes / Clear Primitives, gated by #confirm-modal)
  #scale-pop       — scale options popover
  #ruler-pop       — ruler options popover
  Cycle popovers  — plane/surface/axis selection (#pop-surf/#pop-surf2 now include "Extrude ⤒", v55)
  #sz-pop, #op-pop — brush size/opacity custom sliders
  #save-name-modal — save dialog
  #new-scene-modal — "start new scene" save/discard/cancel dialog
  #confirm-modal   — generic reusable confirm modal (v84) — see note below; use
                     for ANY future yes/no destructive-action gate instead of
                     native confirm()
  #toast           — notification toast
  <canvas>        — Three.js renderer (appended by JS)
</body>
```

---

## Narrow-Bar Content Policy (v73)

**`#topbar` is visible in narrow mode.** This single fact drives the whole v73 narrow-bar design, and it was not obvious — for many sessions `#pb-cycbar` accumulated a second copy of nearly every topbar control, costing horizontal scroll on exactly the device with the least horizontal room.

**The policy, going forward:** a control belongs in `#pb-cycbar` if and only if it is *unreachable* from `#topbar` in narrow mode. Concretely, that means only the six drawing controls whose other home is `#sidetools` (inside `#sidecol`, which is `display:none` in narrow), plus undo/redo which are kept as a deliberate frequency-based exception.

| Category | Where it lives in narrow mode |
|---|---|
| Draw / erase / select, flat / smooth / velocity | `#pb-cycbar` — **only** copy on screen |
| Undo / redo | `#pb-cycbar` **and** `#topbar` — deliberate duplicate, see below |
| Surface / Grid / Axis / Depth / Depth-% / Grid-mode / 2F-gesture / PERSP / INV-ORB / background / theme | `#view-pop`, opened by `#bview-arrow` in `#topbar` |
| New / Clear | `#bnew` / `#bclear` in `#topbar` |
| Save / Load / Export / PNG / SVG / Record / Scale | `#bfile` → `#expmenu` |
| Pages / Views | `#pgbtn` / `#vwbtn` in `#topbar` |
| Stylus mode | `#bstylus` inside `#view-pop` (eye dropdown, v78 — was its own `#topbar` button through v77); `#scx-stylus` icon copy in `#sc-hidden-bar` for `ui-hidden` mode (v78) |
| Ruler, Symmetry, Look-around | `#topbar` only (no narrow-bar copy, by policy) |

**Undo/redo are the one sanctioned exception.** They duplicate `#bundo`/`#bredo`, and that is intentional: they are the highest-frequency controls in a sketching app, and `#topbar` sits at the far top of a tall phone screen while `#pb-cycbar` is at thumb height. Do not "clean this up."

**Two alternatives were built and rejected in v73** — see `gotchas.md`'s Session 73 section before re-proposing either. Briefly: a `··· MORE` submenu (abandoned once the topbar duplication was understood), and a `#pb-view` eye button opening `#view-pop` from the bottom bar (removed because `#bview-toggle` + `#bview-arrow` are *already* on screen in narrow mode, so it re-created the duplication the work was eliminating).

**The known cost:** ruler, symmetry and look-around are now reachable on a phone only by horizontally scrolling `#topbar`, which is `max-width:calc(100vw - 96px)`. Whether that strip scrolls comfortably is an open on-device question tied to the `touch-action` issue in `gotchas.md`. If it doesn't, this policy needs revisiting — but the answer is not "add a second copy to the bottom bar."

---

## Popover Positioning (v73)

There are three independent popover positioners and they historically disagreed about which way to open. As of v73 all three measure and flip:

| Positioner | Consumers | Behaviour |
|---|---|---|
| `positionPop()` in the brush-preset IIFE | `#sz-pop`, `#op-pop` | Flips up/down by available space — the original correct one |
| `positionPop()` in the cyc-button IIFE | `#pop-mode`, `#pop-plane2`, `#pop-axis2`, `#pop-surf2` via both `pb-cyc-*` and `sb-cyc-*` | Prefers upward (right for the bottom bar); flips down + clamps when there's no room above (needed because the sidecol's `sb-cyc-surf` opens an 8-item list) |
| `openLayersPop()` | `#layers-pop` via `#blayers` and `#pb-layer-dot` | Prefers downward; flips up when it would overflow the viewport bottom (needed because `#pb-layer-dot` sits at `bottom:0`) |

**Measure `offsetHeight` *after* adding the visibility class.** All three popovers are `display:none` until opened, so measuring first returns 0 and the flip silently never triggers.

**These popovers position once, at open-time, and never again while open (session 80).** `positionPop()` in the cyc-button IIFE snapshots `btn.getBoundingClientRect()` at the moment of opening — it doesn't track the button afterward. This is fine for the popover's own interactions (tapping an item closes it; tapping outside closes it), but it means anything that moves the trigger button *without* closing the popover first — namely a `#stab` or `.scale-dot` scale-drag on the sidecol/CONTROL card — leaves the popover stranded at its original position while the button slides out from under it. Fixed by exposing `closeAllPops()` as `window._closeCycPops` and calling it at the start of both drags, rather than attempting to keep the popover live-repositioned through the drag. See `gotchas.md` Critical Rule #75. **Any future drag that can move a `cyc-btn` (or any other popover trigger) needs the same guard: close the popover at drag-start, don't try to reposition it continuously.**

---

## The `ui-hidden` Bottom-Left Stack (v73)

Four elements share `left:10px` when `body.ui-hidden`. Bottom-up, with heights:

```
#sc-hidden-toggle   bottom: 10px   32px tall   (≡ mini-toolbar toggle)
#lcl-float-group    bottom: 52px   40px tall   (⊕ LCL tap/hold pill)
#pb-fab             bottom:102px   36px tall   (control-card open/close toggle)
#sc-fab             bottom:148px   32px tall   (restore detached sidecol cards)
```

10px gap between each pair. `#pb-fab` and `#sc-fab` can both be visible at once (tablet, cards detached-and-hidden, UI hidden) — they overlapped from session 71 until v73 fixed it.

Each of the upper three also needs **three** strip-shift overrides (`views-open`, `pages-open.views-open`, `pages-open:not(.views-open)`), all `!important`, at **+92px** and **+180px** from base. See `gotchas.md` Critical Rule #44. Adding a fifth occupant means adding four rules, not one.

---

## JavaScript Architecture

### Section Map (approximate line ranges, v55 — see v60 note below)

**v60 note:** this session added the Symmetry tool's state/helpers (~30 lines near `invertOrbitX`, ~line 4316), the mirror preview line (~10 lines near `prevLine`, ~line 3600), a `finStroke()` insert (~15 lines), two undo/redo branches (~5 lines each), and topbar/CSS/wiring markup — roughly +100 lines total, pushing everything below ~line 3600 down by a small, growing offset. The ranges below are still approximately right for anything above that point; always re-grep rather than trust exact numbers for anything past the stroke-building section, same standing advice as every prior session's map.

**v61 note:** expanded the Symmetry tool substantially — object-center mode, `'both'` axis, the guide-line system (~150 more lines near the v60 symmetry block, now ~line 4339-4478), a 3-line mirror-preview pool (replacing the single mirror line), and expanded `#sym-pop` markup/wiring. Total file grew from ~13,475 to ~13,651 lines this session. The offset from v59's baseline map is now large enough that line numbers below should be treated as rough orientation only, not addresses — always re-grep.

**v65 note (same broader session as v61, several follow-up corrections):** the v61 "object-center mode" (mirror across a selected Ref-layer primitive) was corrected to instead mean the drawing surface's own volume types (cube/sphere/cylinder/cone) after clarification — `symRefMode`/`symPrimAxis`/`_symPrimEligible()`/`_symGetRef()` were all removed, replaced by `symVolAxes`/`_symVolumeEligible()`/`_symVolActive()`. Volume axes were then generalized from single-select to independently-toggleable multi-select (`_symSubsetVariants()`). A visibility bug in the guide line (gray, depth-tested, z-fighting with the coplanar surface mesh) was fixed by switching to red, `depthTest:false`, and `renderOrder:999`; linewidth was bumped for thickness. Finally, a third axis family — `symWorldAxes` (fixed world-space X/Y/Z, always available, deliberately NOT bound to the surface's rotation or bounds) — was added alongside the volume-axis family. Net effect: the Symmetry section below describes the FINAL state after all of this; treat any earlier description of "object center" or "primitive" symmetry modes found elsewhere (chat history, old comments) as superseded. File is now ~13,748 lines.

```
~1850–1910   State variables, Three.js setup, camera, grid, scale constants
~1910–2110   Scale bar, 3D scale cage, graphic scale overlay
~2110–2170   SURF_TRACE, _curSurfTrace
~2170–2240   _surfGridRGBA, buildSurfGridTex (bg-adaptive grid texture)
~2240–2840   Surface geometry (buildSurf, loft, depth cues, frosted glass)
~2840–2940   s2w / checkHover (screen-to-world, hover detection)
~2940–3040   Camera (updCam, syncOrtho)
~3040–3070   UI Theme System (_uiTheme, _inkRGB, _themeInk, _einkDesat, setUITheme)
~3070–3140   Grid/Plane Color System (_activeSurfTrace, _syncGridToBg, _syncGridColors)
~3140–3160   Local gizmo overlay
~3160–3560   Stroke building (buildTube [now takes `flat,tan`], buildCap, computeVels, velocity taper)
~3560–3960   findNearestStroke + selectStroke, _showSgizmo/_hideSgizmo (+ v55 _syncExtrudeBtn hooks)
~3960–4220   Selection, erase (tryErase with partial erase), drag select, undo/redo
~4220–4500   Gesture labels (updateGestLabel stylus-aware), stylus mode
~4500–4700   onDown (touch/pointer routing, stylus gesture swap)
~4700–4830   onMove (2F gesture resolution, stylus 2F swap)
~4830–4920   onUp/finStroke
~4920–4950   Pen pointerdown: barrel button toggle (broadened detection)
~4950–5020   Touch/pointer routing
~5020–5250   Pages system (movePage, reorder, edit mode with tap-away)
~5250–5490   Views system (moveView, reorder, edit mode with tap-away)
~5490–5610   Save/load (IndexedDB) — `tan` field threaded through sceneData/loadData/loadAllPages
~5610–5740   Export (PNG, SVG)
~5740–5920   Video recording (MP4/WebM adaptive)
~5920–6300   Card gizmo IIFE (draw/hitTest/drag + selection delegation)
~6300–6410   Stroke gizmo IIFE + alignCameraToFace
~6410–6920   Selection property editing (_rebuildStrokeMesh etc.)
~6920–7000   LOFT IIFE start (resample, buildLoftGeo, direction alignment, activate/clear)
~7000–7310   EXTRUDE (v55, same IIFE as Loft) — _sampleSurfNormal, _rebuildExtrudeGeo,
             _applyExtrudeGeoToSurf, _activateExtrude, _clearExtrude, _extrudeFromSelection,
             _syncExtrudeBtn
~7310–7370   EX-POP IIFE (v55) — open/close/position, direction buttons, slider, ✓ apply
~7370–8570   PRIMITIVES IIFE
~8570–8870   NavCube IIFE
~8870–9170   FPS plane controls
~9170–9370   Nav toggle, FPS joystick factory
~9370–9570   FPS keyboard/tick
~9570–9770   Narrow cycle buttons, popovers, brush presets
~9770–10080  Topbar/sidebar button wiring (surf-type cycle: SURFS/SURF_LABELS now include 'extrude'/'Ext';
             applySurfType has a dedicated 'extrude' branch mirroring 'loft')
~10080–10280 bhide, float card reparent
~10280–10480 setBgColor (with auto-theme + _syncGridToBg), theme button wiring
~10480–10690 View-pop, scale-pop, look-around IIFEs
~10690–10890 File menu, em-scale, erase button long-press IIFE
~10890–11090 newScene() (+ v55 extrusion state reset)
~11090–11390 Sidecol state machine
~11390–11690 Float card, layout mode, resize
~11690–11980 Initialization, color picker wiring, brush controls
~11980–12180 Service worker, animate loop
~12180–12580 GHUD-SEL IIFE (selection gizmo in card)
~12580–12980 Keyboard shortcuts (expanded v51)
~12980–13115 Ruler overlay IIFE
```

### Key Patterns

**IIFE encapsulation:** Complex subsystems (card gizmo, stroke gizmo, NavCube, FPS, primitives, GHUD-SEL, ruler, Loft+Extrude, ex-pop) are wrapped in immediately-invoked function expressions. They expose functionality via `window._functionName` when cross-IIFE calls are needed.

**Event routing:** Touch/pointer events flow through a central `onDown`→`onMove`→`onUp` pipeline. Stylus mode (`stylusOnly`) gates touch events via `_penActive` flag to prevent redundant processing.

### Extrude Subsystem (v55)

Deliberately built as a sibling of Loft, sharing its IIFE and its two private helpers (`resampleStroke`, `buildLoftGeo`) rather than duplicating them:

1. **Creation (`_extrudeFromSelection`):** requires exactly 1 selected stroke. Resamples it to 48 world-space points (`resampleStroke`), samples a local surface normal at each point (`_sampleSurfNormal` — same raycast-against-`surfMesh` technique the flat brush uses), approximates a per-point tangent via central differences (`_computeTangents`), and derives an in-plane side axis (`_computeSideAxis`, `tangent × normal`). Caches `window._extrudeBase` (points local to a centroid), `window._extrudeNorm` (unit normals — the "standing" axis), and `window._extrudeSide` (unit in-plane vectors — the "90°" axis) — this cached triple is the single source of truth for all subsequent edits.
2. **Live geometry (`_rebuildExtrudeGeo`):** picks `window._extrudeNorm` or `window._extrudeSide` based on `window._extrudeAxisMode` (`'normal'|'side'`), then given that axis array plus the current `window._extrudeAmt`/`window._extrudeMode` (`'both'|'plus'|'minus'`), builds two rails and feeds them to `buildLoftGeo([railA,railB], N)` — the exact same 2-rail geometry function Loft uses.
3. **Activation (`_activateExtrude`):** mirrors `_activateLoft()` exactly — temporarily sets `surfType='plane'`, calls `buildSurf()`, swaps the resulting geometry onto `surfMesh`/`_frostedMesh`/`_frostedGridMesh`, then sets `surfType='extrude'`. Because it swaps geometry onto the same meshes Loft/standard surfaces use, it inherits `surfFillMat`'s existing `THREE.DoubleSide` setting — no extra material work needed for the fin to be visible from both sides.
4. **Live editing (`#ex-pop`):** the slider, 3 direction buttons, and the normal/90° axis toggle (`#ex-axis`) all call `_rebuildExtrudeGeo()` + `_applyExtrudeGeoToSurf()` on every input — fully live, non-destructive regardless of how many times mode/amount/axis change, because all three are always computed fresh from the same cached base/normal/side triple (never by re-differencing the current rails).
5. **Persistence:** none, by design — same as Loft. `sceneData()` sanitizes `surfType==='extrude'` to `'plane'` on save; state (including the new side-axis cache and axis mode) is cleared on `newScene()`.

### Selection UI: `#sgizmo` vs `#ghud-sel` (CRITICAL)

When strokes are selected, two parallel UI systems exist:

**`#sgizmo`** — standalone floating panel with full controls. **ALWAYS hidden** by `gc-hosted` class (`display:none!important`). Its buttons function as headless controllers receiving programmatic `.click()` calls.

**`#ghud-sel` / `#pb-ghud-sel`** — compact button rows inside the gizmo card (sidecol and narrow-bar). These are the **visible** selection controls using `data-selact` attributes.

**Rule: Any new selection action button must be added to BOTH `#ghud-sel` AND `#pb-ghud-sel`** with a `data-selact` value. Adding to `#sgizmo` alone is invisible. (v55's `data-selact="extrude"` button follows this rule.)

### Gizmo Snap & Local-Axis Consistency (v56)

There are three independent rotate-drag gizmo canvases in the app, each with its own IIFE and its own drag-apply code:

1. **Card/surface gizmo** (`SURFACE GIZMO` IIFE, `gc` canvas) — controls the drawing-surface transform (`surfPos`/`surfEuler`/`surfGroup`).
2. **Stroke-selection gizmo** (`STROKE GIZMO` IIFE, `sgc`/`sg-gc` canvas) — controls `selectedStrokes[].mesh`.
3. **Primitive gizmo** (`PRIMITIVES` IIFE, `pgc` canvas) — controls `_selectedPrim.mesh`.

As of v57, a fourth transform surface exists — the `⊕LCL` 3D overlay (`LOCAL PLANE GIZMO` IIFE, drawn directly in screen space rather than a small fixed-size canvas) — see "LCL Gizmo: Dual Target (Surface / Selection)" below. It's a distinct code path from the three above (its own `_lgStartDrag`/`_lgApplyDrag`), but its selection-target branch deliberately reuses the same centroid-relative transform model as #2 rather than inventing a fifth variant.

**Shared snap state, independent consumers.** `snapEnabled`, `SNAP_STEP`, `snapAngle()`, `isSnapped()` are declared once at module scope (~line 5486, just above the card gizmo IIFE) specifically so all three gizmos *can* share one toggle (`⊙45°`, wired via `window._setSnapEnabled`/`window._getSnapEnabled`). But each gizmo's own rotate-drag branch has to explicitly call `snapAngle()` — there is no mechanism that applies snap automatically just because the shared variable exists. As of v56, all three do: the card gizmo already did (pre-v56), and this session added the same check to the stroke-selection gizmo's and primitive gizmo's own rotate branches. **When adding a fourth rotatable object type, its drag code needs its own `if(snapEnabled){...snapAngle(...)...}` — copy the pattern, don't assume it's inherited.**

**Local-axis move direction must match local-axis layout direction.** The stroke-selection gizmo supports a "LCL vs WLD" axis mode (`_sgAxisLocal`, corner label on the `sg-gc` canvas). `_sgComputeLayout2()` (which decides where each move/rotate/scale handle is drawn on screen) applies the selection's quaternion (`_sgGetSelQuat()`) to `WORLD[ax]` whenever `_sgAxisLocal` is true, so the arrows visually point along the selection's *local* axes once it's been rotated. Prior to v56, the move-drag code (`sgApplyDrag()`, `h.startsWith('a')` branch) moved the object along the raw, un-rotated `WORLD[ax]` regardless of `_sgAxisLocal` — this only looked correct when the selection's rotation was near-identity, and broke (axes appearing swapped) once the selection had been rotated. Fixed by applying `_sgGetSelQuat()` to the move direction the same way the layout function does. **The general rule for any gizmo with a local/world axis toggle: the function that decides where a handle is drawn and the function that decides what dragging that handle does must derive their axis vectors identically — when debugging an "axes seem swapped" report, diff these two functions against each other first**, rather than assuming a single sign error. The primitive gizmo's move branch (`pgApplyDrag`, `h.startsWith('a')`) already did this correctly by applying `pgDrag.oQuat`, and was used as the reference implementation for the stroke-gizmo fix.

### LCL Gizmo: Dual Target (Surface / Selection) — v57

The `⊕LCL` 3D overlay (`LOCAL PLANE GIZMO` IIFE, ~line 2309) is a single 2D-canvas-over-3D-scene overlay whose arrows/rings are drawn from an invisible `_localGroup`'s position+quaternion. Before v57 it only ever mirrored `surfPos`/`surfGroup.quaternion` and its drag code only ever wrote back to `surfPos`/`surfEuler`/`surfScaleAxes`. As of v57 it can instead target the current stroke selection.

**Target selection is a one-shot decision, not a live binding.** A new `_lgTarget` var (`'surface'`|`'selection'`) is set in exactly one place: inside `_lgToggle()`'s turn-on branch, based on `selectedStrokes.length` *at that instant*. No other code may change `_lgTarget`. This means:
- Selecting or deselecting strokes while LCL is off has zero effect on it.
- Toggling LCL on with a non-empty selection targets the selection; toggling it on with an empty selection targets the surface, exactly as before v57.
- To switch targets, the person must toggle LCL off and back on — there is no automatic retargeting mid-session.

**Once on and selection-targeted, position/orientation DO track the selection live** (this is the one deliberate exception to "nothing moves automatically"). `window._lgSyncToSelection()` recomputes `_localGroup.position`/`quaternion` from the selection's current centroid/quaternion, but only fires if `_lgOn && _lgTarget==='selection'` — it never turns the gizmo on and never changes `_lgTarget`. It's called from `updateSelHighlights()`, the single choke point every selection-changing code path (tap-select, drag-select, duplicate) already funnels through, so the gizmo's bounding-box position stays current as strokes are added/removed from the selection.

**The ambient surface-sync hook had to be made target-aware.** `window._syncLocalGizmo()` is called from `syncSurf()` on every surface change, for many reasons that have nothing to do with LCL dragging (surface type swaps, scale-cage updates, etc.). Before v57 it unconditionally copied `surfPos`/`surfGroup.quaternion` into `_localGroup` — harmless when LCL only ever tracked the surface, but would silently snap a selection-targeted gizmo back to the surface on any incidental `syncSurf()` call. It's now guarded with `if(_lgTarget==='surface')`.

**Drag math for the selection target reuses the stroke-selection gizmo's model, not a new one.** `_lgStartDrag()`/`_lgApplyDrag()` gained an `isSel` branch per drag type (arrow/move, scale, center-drag/uniform-scale, ring/rotate) that transforms every `selectedStrokes[i].mesh` centroid-relative — translate along the quaternion-aligned axis for move; orbit position around centroid + premultiply quaternion for rotate; scale position-offset-from-centroid + `mesh.scale` per axis for scale — the same model `sgApplyDrag()` already uses for the panel gizmo (see previous section), just driven by the LCL overlay's own full-screen pixel deltas instead of the panel's small-canvas coordinates. One `stroke_transform_multi` undo entry is pushed per drag start, matching `sgStartDrag()`. **A useful side effect:** the ring/rotate branch's snap-angle computation (`snapEnabled`/`snapAngle()`) happens *before* the isSel/surface split, so selection-target rotation via LCL is snap-aware for free — it did not need its own explicit `if(snapEnabled){...}` the way the three gizmos in the section above do (Critical Rule #9 in `gotchas.md` still applies to any *new* rotate-drag branch that isn't downstream of this shared computation).

**`selectionCentroid()` and `_sgGetSelQuat()` are now cross-IIFE public.** They live in the `STROKE GIZMO` IIFE but are exposed as `window._selectionCentroid`/`window._sgGetSelQuat` specifically so the (earlier-defined) LCL IIFE's functions — which only execute later, on user interaction, once every IIFE has already run — can call them. Note `selectionCentroid()` averages each stroke's own point-centroid, not a literal axis-aligned bounding-box midpoint; that's the same notion of "center" the panel gizmo already uses, kept consistent rather than introducing a second definition of "selection center."

---

### Selection Hit-Test: Segment Distance + Candidate List with Depth Tie-Break — v58

`findNearestStroke()` (~line 3829) resolves which stroke a tap/hover point refers to. Before v58 it measured screen-space distance to sampled *vertices* and kept a single running best (`bestStroke`/`bestDist`), so the winner was whichever stroke happened to be checked first among near-ties, and any gap between two coarse samples (or two dense-pass points) wasn't actually tested.

**Distance measurement is now segment-based, not point-based.** A new helper, `_fnsSegDist(px,py,ax,ay,bx,by)`, clamps the tap's projection onto the screen-space segment AB and returns both the distance and the clamped `t`. Both the coarse pass (strided point-pairs) and the dense re-pass (every consecutive point-pair, only reached on a near-miss) use this instead of point-to-point distance — the interpolated line between samples is now actually part of the hit-test, not just the samples themselves.

**Winner selection is now a two-stage process: distance first, camera depth second.** Every stroke scoring under `THRESH` (32px) is pushed into a `cands` array as `{stroke, dist, depth}` rather than only the running best being retained. `depth` is `activeCam().position`'s distance to the actual closest point on the winning segment (found via `lerp(t)` on the two segment endpoints — not the nearer vertex, the true closest point). After the loop: sort by `dist` ascending, then walk forward from the closest candidate and let any candidate within 3px of it win instead if its `depth` is smaller. This means depth only ever breaks a near-tie; it can't override an unambiguous, purely 2D-closest stroke. **Do not weaken this ordering** — depth as a primary sort key would make far-off-but-close-to-camera strokes win over an obviously-closer-to-the-tap stroke, which is the opposite of the intended fix.

**Frustum culling, the coarse/dense two-pass structure, and the early-exit-on-hit behavior are all unchanged** — same number of stroke projections as before, just segment math instead of vertex math, so per-frame hover-hit-test cost (this runs every animation frame while hovering in draw mode, and on every pointer move in select mode) should be roughly the same.

### Pick Radius Is Input-Aware, Not a Shared Constant — v58

`THRESH` in `findNearestStroke()` used to be a flat 32px for every input type. It's now `precise?16:32`, decided per-call by a new `_isPreciseInput(e)` helper: a real `PointerEvent`'s `pointerType` (`'mouse'`/`'pen'` → precise, `'touch'` → not), `e.touches[0].touchType==='stylus'` for iPad Pencil arriving via the touch pipeline, and a bare `MouseEvent` (neither field present) defaulting to precise. Touch keeps the original 32px, sized for a fingertip; mouse/pen/Pencil — which have an exact tip position — get 16px.

This exists because a stylus with genuine hover-above-screen support was seen "sticking" a selection-preview highlight as it moved away from a stroke, only updating once it reached a different one — never passing through empty space in between. An isolated Three.js unit test (real r128, a synthetic stroke, no app scaffolding) confirmed `findNearestStroke()` itself has no stickiness: it transitions HIT→`null` cleanly exactly at the threshold. The actual cause was that 32px is generous enough that, in a normally-dense sketch, two nearby strokes' pick radii overlap — so a stylus moving "away" from one can land inside a neighbor's radius before ever passing through a true gap, which looks identical to a stuck highlight. Tightening the radius for exact-position input closes that gap without touching the touch experience.

`selectStroke()`, `onDown()`'s select-mode branch, `onMove()`'s drag-select block, and `_runHover()`'s hover-preview call all now thread a `precise` flag through to `findNearestStroke()` via `_isPreciseInput(e)` — see `gotchas.md`'s Session 58 entry for the exact call sites.

### Tap-vs-Drag Distance Gate for Select Mode — v58

`onDown()`'s select-mode branch does a clean single-select via `selectStroke()`. `onMove()`'s drag-select block (used to extend a selection by sliding across multiple strokes) previously ran on any pointer movement while the button/finger was down — this is not the same thing as an intentional drag, since a plain tap always has a few pixels of incidental jitter between down and up. `_selDownX`/`_selDownY` are now recorded on down, and the drag-select block in `onMove()` early-returns until movement exceeds 8px from that point (`_selDragArmed` latches true once armed, so the check runs at most once per gesture, not every move). This reuses the same 8px convention already used elsewhere in the file for gesture-lock decisions (2-finger zoom-vs-navigate, the FPS module's `TAP_THRESH`) rather than introducing a new threshold.

---

## Float Card Geometry & Lifecycle (v75)

`#pb-float-card` (the CONTROL card) is the phone/tablet home for the nav and gizmo panels. It has four states — docked, floating, collapsed, and reparented-into/out-of the sidecol — and by session 75 it had accumulated position logic in eight places that disagreed with each other. Session 75 unified it. **Read this before touching anything that moves or sizes that card.**

### The coordinate problem

The card is scaled with CSS **`zoom`**, not `transform`:

```js
function applyZoom(el,scale){ el.style.zoom = String(scale); }   // _scState.fcScale, 0.7–1.0
```

`zoom` was chosen deliberately over `transform:scale` because it re-renders descendant `<canvas>` backing buffers at the new scale — no blur, no manual pixel-buffer recomputation. (Detached sc-groups use `transform` instead, via `applyDetachedScale`, because they need a guaranteed top-left anchor and contain no canvases that matter. Both mechanisms coexist on purpose; see `gotchas.md`.)

The cost is that `zoom` creates a second coordinate space:

| Property | Space |
|---|---|
| `style.left` / `style.top` / `style.width` | card's own (zoomed) space — renders at N·z |
| `offsetWidth` / `offsetHeight` | card's own (zoomed) space |
| `getBoundingClientRect()` | rendered viewport pixels |
| `clientX` / `clientY` from a pointer event | rendered viewport pixels |

Mixing them is invisible at `zoom:1` and wrong at anything else.

### The rule

**Everything works in rendered viewport pixels, and divides by zoom exactly once, at write time.** All of it lives in the float-card interactions IIFE (~line 14411):

```js
function _fcZ()                       // parseFloat(card.style.zoom) || 1
function _fcRect()                    // getBoundingClientRect + _fcLast* fallback when display:none
function _fcClampR(rl, rt, margin)    // clamp rendered top-left inside the viewport, reserving FC_TAB
function _fcPlace(rl, rt, rw)         // write; divides by _fcZ(); updates _fcLast*
function _fcMaxW(rl)                  // widest rendered width leaving room for the tab column
```

`window._fcLastLeft / _fcLastTop / _fcLastW` are **rendered** pixels. `_fcPlace` is the only writer.

Never read `offsetWidth`/`offsetHeight` on this card. Never write a bare `card.style.left = px`.

### Constants

| Name | Value | Meaning |
|---|---|---|
| `FC_MARGIN` | 8 | resting inset from every screen edge |
| `FC_TAB` | 22 | width reserved right of the card for the outboard grip column |
| `FC_HIDDEN_LEFT` | 58 | hidden-mode left inset, clearing the ≡ / LCL / ⬡ column |
| `FC_HIDDEN_BOT` | 52 | hidden-mode bottom inset, clearing `#sc-hidden-toggle` |
| `SNAP_DIST` | 5 | bottom-edge proximity that arms the dock snap |
| `LCL_STACK_DY` | 45 | vertical offset of the LCL circle below `#pb-fab` in tall mode |

`FC_TAB` and the CSS `right:-20px` on `#fc-resize` must move together. `LCL_STACK_DY` is read by both `positionLclFloat()` and the fab's drag clamp.

### Lifecycle functions

```
_fcSummon()            card is becoming visible
  ├─ _fcEverPlaced ? _fcRestorePlacement() : _fcApplyDefaultRest()
  ├─ _fcClearOfStrips()
  ├─ _fcSettle()
  └─ _fcRefresh()

_fcRefresh()           panels have (or may have) changed size
  ├─ _fcResizeCanvases() + _fcSettle()          now
  ├─ same                                        next rAF
  └─ same                                        +80ms
```

- **`_fcApplyDefaultRest()`** — width first, then `_fcResizeCanvases()`, *then* measure height, then place. The card is content-sized and `_fcResizeCanvases()` derives canvas height from panel *width*, so width changes height twice. Measuring in the wrong order is what put the card's bottom off-screen.
- **`_fcSettle()`** — idempotent re-clamp in place. Cheap, safe to fire repeatedly, no-ops when docked or hidden.
- **`_fcClearOfStrips()`** — the docked card gets CSS strip-shift rules; a floating card's inline `top` is out of CSS's reach, so this is the JS equivalent. Called from `togglePages()` and `toggleViews()`, alongside `_sidecolAnchorSync()` (v78 addition — see "Sidecol Zoom & Position" below, Gotcha #71).
- **`window._fcPlaceClamped()`** — exposed so the separate pinch-to-scale IIFE shares one definition of "on screen" rather than reimplementing it.

**Standing rule: any path that makes the card visible or changes its width must end in `_fcRefresh()`, never a bare `_fcResizeCanvases()`.** The latter is now a no-op when `#fc-panels` has no layout, so calling it too early silently does nothing.

### Placement policy

- **First call-out of the app session** → computed default: bottom-anchored above the ≡ hamburger, `left:58` and full remaining width in hidden mode.
- **Every later call-out** → `_fcRestorePlacement()` from `_fcLast*`, re-clamped in case the viewport rotated or a strip opened.
- `window._fcEverPlaced` governs the switch and is **deliberately not reset when `ui-hidden` toggles** — position is remembered for the whole app session.
- `window._fcWasDocked` / `window._fcPreHide` snapshot the pre-hide state so turning the UI back on restores it instead of leaving the hidden-mode geometry in place.

### Clamping policy

Dragging is clamped **live**, at margin 0. This reverses session 74's explicit "unclamped mid-gesture" decision (Sebas overrode it in session 75). Margin 0 rather than `FC_MARGIN` is load-bearing: `snapEdge()` arms the dock only when the card's bottom is within `SNAP_DIST` (5px) of the viewport bottom, so clamping the live drag to an 8px inset would make redocking unreachable. Where the card *settles* — drag-end, undock, resize-end, default placement — it uses `FC_MARGIN`.

### Edge grips

The card is `overflow:visible` as of session 75 (was `hidden`) so its grips can hang outside rather than cover panel content. Consequences:

- `#fc-resize` — the card's only tab. 18×64, vertically centred, `right:-20px`, pill-styled. Width resize.
- `.scale-dot` — suppressed on this card (`display:none!important`); two tabs on one edge read as duplicates. Still live on detached sc-groups. Card zoom remains reachable by pinch.
- `.fc-hdr` needed its own `border-radius:11px 11px 0 0`, since the card no longer clips it.
- `#fc-panels` and `.pb-panel` carry their own `overflow:hidden`, so content is still clipped.
- `max-height:calc(100vh - 16px)` on the card caps it at the viewport, so a tall panel stack can't push its own bottom off-screen.

### Nav panel header row: deterministic grid + a linked minimum-width chain (v83)

`#fc-panels` splits into two side-by-side `.pb-panel`s (nav, gizmo). The nav panel's header row (`⬡ NAV` / `PERSP` / `−` / `+` / `⌂`) mixes two variable-width text buttons with three fixed-width icon buttons — the same category of layout that broke `#sidetools`/`#ghud-bottom` in earlier sessions (Gotcha #67/#70/#76/#81), just in a container that resizes by literal **width** (pinch, edge-drag, the inter-panel `fc-nav-resize` grip) rather than by zoom.

**Layout:** `.nav-hdr-row` (added alongside `.pb-panel-hdr` on both the sidecol's `#nav-card` header and `#pb-panel-nav`'s header) is `display:grid;grid-template-columns:minmax(34px,1fr) minmax(34px,1fr) 22px 22px 24px`. The two text buttons get a genuine floor (34px) and grow into `1fr` when there's room; the three icon buttons keep fixed tracks. A grid with explicit tracks structurally cannot reflow the way the old flex row could — no fighting over space, no silent min-width:auto floor nobody set on purpose.

**The container has to be at least as wide as the row needs, or the grid just overflows instead.** One linked constant chain, declared once (inside the "Narrow float card interactions" IIFE, exposed on `window` for the separate `fc-nav-resize` IIFE that also needs them):

```
NAV_HDR_MIN_W   = 160   // 34+34 (text floors) + 22+22+24 (icons) + 12 (4 gaps) + 8 (padding), +4 slack
GIZMO_HDR_MIN_W = 120   // gizmo header: 4 equal flex:1 text buttons, no fixed icons — more forgiving
FC_MIN_W        = 2*NAV_HDR_MIN_W + 9   // = 329; see note below on why NOT NAV+GIZMO+9
```

**Why `FC_MIN_W` uses `2*NAV_HDR_MIN_W`, not `NAV_HDR_MIN_W+GIZMO_HDR_MIN_W`:** the nav/gizmo panels default to a plain 50/50 `flex:1` split — `fc-nav-resize` only produces an asymmetric split once the person actually drags it. A card-wide floor sized for the asymmetric case (`160+120+9=289`) is silently too small for the far more common default case, where an even split at 289px total gives the nav panel only ~140px. `FC_MIN_W` has to be safe for whichever panel's need is larger, doubled — `GIZMO_HDR_MIN_W` is only ever used as the gizmo-side floor inside the *manual* `fc-nav-resize` drag, never for the card-wide constant. This is worth internalizing beyond this one bug: **when a container can be split two ways (an automatic default, a manual override), size any shared "minimum total" off the default case, not off whichever split happens to be in front of you while writing the constant.**

`FC_MIN_W` feeds every width-changing path for this card: `_fcMaxW`, `_fcPlaceClamped`, `undock()`, the edge-drag resize (`onResizeMove`), the pinch-to-scale fallback branch, and `DEFAULT_W`'s own floor. The one place it can't reach is `#pb-float-card.fc-docked-bottom{width:auto!important}` (docked width is plain CSS `left`/`right`, no JS in the loop) — that gets a hand-synced `min-width:329px` with a comment stating the exact JS constant it has to match.

**Defensive backstop, not the primary fix:** `.nav-hdr-row{overflow-x:auto}` with a hidden scrollbar, so that even if some future code path still under-sizes the container, the home icon is swipeable-into-view rather than genuinely lost. Keep this even though the floors above should make it unnecessary in practice — cheap insurance in a system with four independent resize entry points.

**A separate, unrelated bug found along the way:** `#fc-nav-resize` (the inter-panel drag grip) is `position:absolute` and had always spanned the panel's *entire* height (`top:0` to `bottom:0`), including the header row — sitting on top of whichever button landed at the panel's right edge (the reset/⌂ button). This had nothing to do with the sizing bug above; it just never surfaced as the visible symptom while the reset button was also being clipped by the sizing bug. Fixed by starting the grip at `top:35px` (the header's rendered height: 28px button + 6px `.pb-panel-hdr` padding + 1px border-bottom) instead of `top:0`.

### Docked sidecol's top-clearance: measured, not guessed (v83)

`_sidecolFitHeight()` and the sidecol's first-load auto-fit calc both used to clamp against a hardcoded `52` ("topbar clearance guess"). `#topbar`'s real height isn't constant across devices/widths, so a stale guess could crop the sidecol's top even when the real topbar left more room. Both now call a shared `_sidecolTopClearance()` helper — `#topbar.getBoundingClientRect().bottom+8` — the same pattern `positionExPop()` already used. The bottom bound (tied to `--sc-bottom`/the LCL anchor) was already correct; only the top guess needed replacing.

---

## The Tall-Mode Call-Out Cluster (v75, superseded in part by v76 — see below)

In tall (narrow/phone) mode with the UI visible, `#pb-fab` and `#lcl-float-group` form a fixed vertical pair:

```
#pb-fab            left:10  top:50    36×36 circle, ⬡     — show/hide the control card
#lcl-float-group   left:=fab.left  top:=fab.top + 45      — LCL circle, same chrome
```

- `#pb-fab` is `display:flex!important` in tall mode, so `.fab-visible` no longer gates it. It is the call-out *and* the hide button — `_pbFabToggle()` was always two-way, but the close branch was unreachable in tall mode before this.
- `#lcl-float-group` is no longer hidden in tall mode. The old reasoning was that the portrait panel carries `#pb-glocal`, but that panel lives *inside* the control card and is unreachable whenever the card is closed.
- The fab's drag clamp reserves `LCL_STACK_DY` below itself so its companion can't be pushed off-screen.

**v76 update:** the sentence that used to live here ("wide mode still gets the `⊕ LCL` pill") is no longer true — see the v76 section below. `positionLclFloat()` still owns the stacking and still calls `window._syncLclButtons()` on every layout-mode/`ui-hidden` change, but the label logic it drives is now trivial (always the bare `LCL` string — there's no pill variant left to disambiguate).

---

## Side Column: LCL / Scale / Scroll Controls (v77)

Four small fixed controls live in the same vertical column at the bottom-left of the screen, wide-mode-with-UI-visible: `#sidecol` (the docked panel itself), `#stab` (the zoom/scale handle), `#stab-scroll` (a scroll handle), `#sc-fab` (call-back button, shown only when the sidecol is fully detached), and `#lcl-float-group` (the LCL gizmo toggle). Session 76 established the zoom-drift fix; session 77 corrected an arithmetic error in it, flipped the stab/stab-scroll stacking order, tightened the LCL gap to match the app-wide 10px standard, and moved `#sc-fab` into this same column.

### Current design

```
#lcl-float-group   left:10, bottom:10/100/188/100 (base/views/pages+views/pages-only)
                   — a fixed 36px circle, ALWAYS at this position, in every layout
                   mode (narrow, wide, ui-hidden). No longer a pill anywhere.
#stab              left:=(sidecol width calc), bottom:=var(--sc-bottom)
                   — ALWAYS flush with sidecol's own bottom edge (session 77:
                   never moved from here, regardless of #stab-scroll's visibility)
#stab-scroll       left:=stab.left, bottom:= --sc-bottom + 32 + 6
                   — pops in directly ABOVE #stab (session 77: flipped from the
                   session-76 order) only when sidecol content overflows
#sc-fab            left:10, bottom:var(--lcl-slot-bottom)
                   — takes over #stab's slot when the sidecol is fully detached
                   (#stab hides itself in that state); session 77 moved this
                   here from a top-right corner position
#sidecol           bottom:var(--sc-bottom) — the docked panel itself, ALSO
                   left/right-compensated for zoom (see below, session 77)
```

Stacking order, bottom to top: `lcl-float-group` → (10px gap) → `stab` (always flush with sidecol's own bottom edge) → `stab-scroll` (pops in above `stab` only when content overflows) → `sidecol`'s own body. `--sc-bottom` is a CSS custom property, set per body-class combination (base / `.views-open` / `.pages-open.views-open` / `.pages-open`), each value equal to `LCL_top_edge + 10px` — the same gap standard used throughout the rest of the LCL stack (`≡`-to-LCL, LCL-to-`#pb-fab` in `ui-hidden`; see Gotcha #44). **Session 77 correction:** an earlier pass at this formula mistakenly added `#stab`'s own height (32px) on top of the gap — wrong, because `--sc-bottom` already *is* `#stab`'s bottom-edge position, not some point above it (see Gotcha #66).

`--lcl-slot-bottom` is a second, parallel CSS var with the identical per-strip-state numbers as `--sc-bottom`'s `:not(.rside)` variant, but **without** the `.rside` exclusion. It exists because `--sc-bottom` is deliberately smaller when `.rside` is active (a docked-right sidecol doesn't need LCL clearance), but `#sc-fab` always sits next to LCL regardless of which side the sidecol itself is normally docked on — see Gotcha #68.

### Why LCL is a fixed circle everywhere now

Previously LCL was a wide `⊕ LCL` pill in most modes and only became a 36px circle (matching `#pb-fab`) in tall-mode-with-UI-visible. As of v76 it's always the circle, always at a fixed `left:10` position, in every mode — it no longer mirrors to the opposite side from the sidecol, and no longer tracks `#sg-bottom`'s bounding rect (see Gotcha #64 for why that tracking was removed).

### Why `#sidecol` needs its OWN anchor-sync, not just its watchers' (session 77)

Session 76 fixed every *external* reader of sidecol's position (`#stab`, `#stab-scroll`, `_sidecolFitHeight()`) by reading `--sc-bottom` from `document.body` (never zoomed) instead of from `#sidecol` itself — see Gotcha #61. What it missed: `#sidecol`'s **own** `left`/`right`/`bottom` are still plain CSS (`var(--SP)`/`var(--SR)`/`var(--sc-bottom)`), with no compensation, so `#sidecol`'s real on-screen position drifted by the exact same zoom mechanism, correct only at `scale===1`.

**Fix:** `_sidecolAnchorSync()` divides the target real-pixel offset by `_scState.scale` before writing `#sidecol`'s own `left`/`right`/`bottom` — the same technique `_sidecolFitHeight()` already used for `max-height`. Called immediately after every `applyZoom(sidecol,...)` call site (`applySidecol()`, the live `#stab` drag, the session-79 first-load auto-fit calculation), **and, as of v78, also from `togglePages()`/`toggleViews()`** — those change `--sc-bottom` via body class rather than via zoom, but `#sidecol`'s inline position is just as stale afterward if the function isn't called (see Gotcha #71). This pins the docked corner (bottom-left, or bottom-right when `.rside`) in place across the whole `[SC_MIN, SC_MAX]` range; the box only ever grows/shrinks toward the opposite corner. See Gotcha #65.

### Why max-height clamping divides by `_scState.scale`

`_sidecolFitHeight()` renders `#sidecol` unconstrained, measures its natural top edge, and — **only if** that edge would go above `#topbar` (y=52) — computes exactly how much overflow there is and clamps `max-height` to remove just that much. Because `max-height` is a length property being written back onto the *same* zoomed element, the computed "real" pixel amount is divided by `_scState.scale` before being assigned, to cancel out zoom re-scaling it a second time. This means cropping only ever happens when content would genuinely go over the topbar — never speculatively.

### `#sidetools`' flex-wrap row — fixed for real in v78

`#sidetools` (draw/erase/select | flat/smooth/vel | undo/redo) had 158px available and needed 157px per wrapped row — 1px of slack, which is scale-*invariant* under `zoom` (all descendant lengths scale by the same factor, so the ratio never changes) but was highly susceptible to browser sub-pixel rounding at any scale, including 1.0. Session 77's `SC_MIN` raise (`0.5 → 0.7`) was only an interim mitigation. Session 78 gave the row real margin instead — padding `6px 8px → 6px 6px`, ~5px of slack now — and restored `SC_MIN` to `0.5`. See Gotcha #70.

### `.sc-grab`'s decorative grip dash — scoped to the spacer, not the whole bar (v82)

Each `.sc-group` header (`.sc-grab`) lays out as `[title][flexible spacer][buttons...]`. The small horizontal "drag here" dash (`::before`) used to be `left:50%` **of the whole bar**, which only avoids the buttons if the title and button cluster happen to balance out around the bar's true geometric midpoint — with a short title (`CONTROL`) and a 3-button cluster (`⇅`/`⊞`/`✕`), the midpoint fell inside the cluster instead, landing the dash on top of `#sg-swap` (a positioned `.sc-grab::before` paints above the in-flow button beneath it). Fixed by moving the dash to `.sc-grab-spacer::before`, centered on the spacer's own box (`position:relative;align-self:stretch` added to the spacer so it has a well-defined box to center within). See `gotchas.md` Critical Rule #77. **Any future centered-indicator pseudo-element sharing a row with asymmetric content on either side should be scoped to the actual empty flex item, not the row as a whole — centering on the whole row is only correct for whatever specific content balance existed when it was written.**

### `#ghud-bottom`'s flex-wrap row — attempted the `#sidetools` remedy in v79, needed a different fix in v81

The CONTROL card's `RESET`/`⊙45°`/`⌖FACE`/`⌖VIEW`/`⊕LCL`/`AXS` row (`#ghud-bottom`) looked like the identical fragile-wrap-margin issue as `#sidetools` above, and got the same remedy in v79: a scoped `#ghud-bottom .btn-pill{padding:0 5px}` plus the CONTROL card's own inner content padding `6px 8px → 6px 6px`. **That fix didn't hold** — Sebas reported the row still reordering in v81. The two rows aren't actually equivalent: `#sidetools`' buttons are icon-only SVGs with a fixed, device-independent pixel width, so a padding nudge that creates real numeric slack is a *complete* fix. `#ghud-bottom`'s buttons carry text labels, whose rendered width depends on font metrics that vary by device — no single padding constant is guaranteed correct everywhere a person might run this app.

**v81 fix:** stopped relying on natural flex-wrap. `#ghud-bottom` is now `display:grid;grid-template-columns:repeat(3,1fr)` — each button takes a fixed 1/3 of the row regardless of its label's actual rendered width (grid items default to `justify-self:stretch`), so the row cannot reshuffle no matter how any given device renders the text. `#ghint` got `grid-column:1/-1` to keep spanning the full row. Button padding tightened further to `0 3px` since slack reasoning is no longer relevant. See Gotcha #76. **General rule going forward: a flex-wrap row of icon-only buttons can be fixed with a padding nudge; a flex-wrap row of text-label buttons should go straight to a deterministic grid (or explicit `flex-basis`) instead — don't assume the `#sidetools` remedy transfers just because the CSS pattern looks the same.**

### First-load auto-fit rewritten from a loop to a direct calculation (v79)

Session 76's auto-fit ran a loop: decrement `_scState.scale` by `0.02`, re-check `sidecol.scrollHeight>sidecol.clientHeight+1`, repeat (guarded at 30 iterations). This looked reasonable but never actually worked once any crop existed at `scale===1` — `zoom` rescales an element's own length properties (Rule #65's core finding), so once `_sidecolFitHeight()` had written a `max-height` at `scale===1`, both `scrollHeight` and `clientHeight` scaled by the *same* factor as the loop changed `_scState.scale`, keeping their difference proportional rather than closing it. In practice the loop always ran to its guard limit or to `SC_MIN`, regardless of how much screen space was actually available — the opposite of its intent.

**Fix:** replaced the loop with a single direct calculation. Reset to `zoom:1`/`max-height:none`, measure the natural (unclamped) height via `getBoundingClientRect()`, compute `available = r.bottom - 52` (the same topbar-clearance constant `_sidecolFitHeight()` uses), then `scale = clamp(floor((available/naturalHeight)*50)/50, SC_MIN, SC_MAX)` — applied once, no iteration. See Gotcha #73. **This is a useful general pattern: before trusting a "keep adjusting until measurement X passes" loop on a zoomed element, check whether X is actually capable of changing sign as the adjustment proceeds — if both sides of the comparison scale together, the loop needs replacing with a direct calculation, not a bigger guard counter.**

### Scroll handle direction (session 77)

`#stab-scroll`'s drag was inverted from `sidecol.scrollBy(0, dy)` to `sidecol.scrollBy(0, -dy)` to match touch-drag convention (content follows the finger) rather than scrollbar-handle convention (handle position maps to view position). See Gotcha #69.

### A wrapper split was tried here and reverted — don't redo it

Mid-session-76, `#sidecol` was split into two elements: an outer `#sc-anchor` (owning `position`/`bottom`/`max-height`/`overflow`, never zoomed) and the original `#sidecol` nested inside it (flex layout only, zoom applied there). This is the textbook-correct way to keep "content density scaling" and "box positioning" from interfering with each other, and it *did* make the LCL-to-sidecol gap perfectly stable.

**It was reverted** because removing the explicit `width:176px` from the zoomed element (moving `width` only onto the unzoomed wrapper) broke something else: content *inside* the nav card (`sg-top`) rendered incorrectly under zoom, and the width no longer visibly shrank with scale the way `positionStab()`'s `displayW = 176 * scale` formula assumes. Sebas confirmed on-device that scaling "was fine before" the split and asked for a full revert.

**If a future session is tempted to re-attempt this split** (e.g. to make the gap-to-LCL bulletproof under all conditions): it must find a way to give the *inner*, zoomed element an explicit `width` that the wrapper also respects, rather than letting the inner element's width go auto/intrinsic. That's the specific thing that broke last time — not the split concept itself. Note that session 77's `_sidecolAnchorSync()` fix achieves the same stability goal without a wrapper split, by compensating the single element's own offset properties instead — this is now the preferred approach for any future zoom-drift issue on this element.

---

## Camera System

Two modes sharing `cam` object:
- **Orbit mode:** spherical coordinates (`cam.theta`, `cam.phi`, `cam.radius`) around `cam.target`
- **FPS mode:** `cam.target` IS the eye position (not the look-at point!) — `cameraForward()` must branch explicitly

### Face Alignment (`alignCameraToFace`)
- Flip detection checks BOTH `dotFwd < -0.995` (front) and `dotFwd > 0.995` (back)

### NavCube Preset Views Default to Ortho — v59

`snapTo()` (NavCube IIFE, ~line 8948) used to take a `goOrtho` boolean and only forced ortho on a 400ms touch-hold; a plain tap forced perspective instead (or left it alone). As of v59 it's parameterless and unconditionally calls `setOrtho(true)` — every preset-view snap (X/-X/Y/-Y/Z/-Z), from any input type, in any layout, lands in ortho. This is intentional and not conditioned on the camera's prior projection state. The manual PERSP/ORTHO toggle (`togglePersp()`/`setOrtho()`) is the only way back to perspective after a preset snap; it's untouched by this change. Because `setupNavCube()` builds both `#navcube` and `#pb-navcube` from one function body, this single edit covers both layouts — there is no second NavCube implementation to keep in sync.

### Invert-Lateral-Orbit Toggle — v59

New flag `invertOrbitX` (default `true`, module scope near `twoFingerMode`) and helper `_orbX(dx){return invertOrbitX?-dx:dx;}`. Wrapped around the horizontal-drag term at every call site that derives `cam.theta` from a user drag gesture over the 3D scene: single-pointer `doOrbit()`'s non-FPS branch, the stylus-only and normal 2-finger "navigate" branches, and the 3-finger fallback orbit. **The toggle is per-call-site, not inherited** — same category as `snapEnabled` (Critical Rule in `gotchas.md`) and the local/world-axis-must-match rule: any future orbit-driving code path (new gesture, new input pipeline) must explicitly call `_orbX()` on its horizontal term, and must never wrap the paired vertical (`cam.phi`) term.

**Deliberately excluded, by design, not oversight:**
- FPS look-around (`doOrbit()`'s `_fpsMode` branch) — already uses an intentionally different sign (`cam.st - dx` vs orbit's `cam.st + dx`) because "look right" should feel like looking right, a different feel than orbiting an object. Conflating the two toggles would be a correctness bug, not a style choice.
- The NavCube widget's own drag-to-spin (`onMouseMove`/`onTouchMove` inside `setupNavCube()`) — this drags the gizmo graphic directly; it isn't a navigation gesture over the scene.

UI lives in `#view-pop` — the popover opened from `#bview-toggle` in `#topbar` — as a `#binvorb` button next to `#bpersp`/`#bgestswap`, with `#bstylus` (moved here in v78, see "Narrow-Bar Content Policy" above) directly below it. `#view-pop` is a single shared DOM element (unlike the NavCube/gizmo panels, which are duplicated with a `pb-` prefix for narrow-bar layout), so one button instance already covers both layouts. **As of v78, `invertOrbitX`/`twoFingerMode`/`stylusOnly` (plus `_uiTheme`) are persisted** to a new `sk3d_prefs` localStorage key via `_savePrefs()`/`_loadPrefs()` — previously session-only, reset to code defaults on every reload. See Gotcha's "Session 78 Fixes & Additions" section.

### Symmetry (Mirror) Tool — v60, substantially reworked v61–v65, pivot change v66

`symAxis` and `symVolAxes` pivot on the current drawing surface's own center (`surfPos`) — never a separately-selected object (an earlier v61 draft mirrored across a selected Ref-layer primitive's center; this was corrected same-session — see `gotchas.md` Critical Rule #18). **As of v66, `symWorldAxes` pivots on the true scene origin `(0,0,0)` instead** — the same fixed point `axisGroup` sits at — so it no longer moves when the surface is repositioned (see `gotchas.md` Critical Rule #21). **Three mutually-exclusive axis families**, chosen from the `#sym-pop` dropdown (opened via `#bsym-arrow` next to the `#bsym` toggle, both directly in `#topbar`). Activating any control in one family clears the other two — enforced explicitly in every click handler, not inferred:

**1. `symAxis` (`'v'`|`'h'`|`'both'`, default, always available).** Flips in the surface's own **rotated local frame** (`surfGroup.quaternion`) — works for any `surfType`.
- `'v'` (default) flips local X — vertical dividing line, left/right mirror.
- `'h'` flips local Y — horizontal dividing line, top/bottom mirror.
- `'both'` flips both — quad symmetry, 3 mirrored copies per stroke.

**2. `symVolAxes:{x,y,z}` (extra, opt-in, independently toggleable).** Also in the surface's **rotated local frame**, but lets any combination of X/Y/Z be active at once (not radio/single-select) — 1 axis active = 1 copy, 2 = 3 copies, 3 = 7 copies (every non-empty subset of the active axes, via the shared `_symSubsetVariants()` helper). Only enabled in the UI when `_symVolumeEligible()` is true — `surfType` is `'cube'`/`'cylinder'`/`'sphere'`/`'cone'`, **never** a flat `'plane'` (or `'loft'`/`'extrude'`/`'none'`). Buttons are visually `.disabled` (CSS `opacity:.35;pointer-events:none`) otherwise. If the surface type changes back to flat while a volume axis is active, `_symVolActive()` (checked fresh every call, never cached) goes false and mirroring falls back to `symAxis` — but `symVolAxes` itself isn't cleared, so switching back to a volume surface immediately restores the person's picks.

**3. `symWorldAxes:{x,y,z}` (extra, opt-in, independently toggleable, v65).** Flips in **fixed world space** — ignores `surfGroup.quaternion` entirely, so however the surface is currently tilted has no effect on the mirror direction. Always available regardless of `surfType` (a true world axis is meaningful even for a flat plane, unlike `symVolAxes`' local Z). Same non-empty-subset combination rule as `symVolAxes`.

**Important, deliberate consequence of world-axis mode: mirrored strokes are not bound to the drawing surface.** The flip directions are fixed world axes independent of the surface's rotation, and (as of v66) the pivot is the fixed scene origin rather than the surface's center at all — so a mirrored point routinely lands off the visible plane/volume once the surface is moved or rotated away from world-aligned. This is expected, not a bug (confirmed with Sebas; useful for building structures larger than the surface widget itself). `symAxis`/`symVolAxes` don't have this property, since flipping a surface's own local axis by construction keeps a point that started on/in the surface on/in it.

**Unified mirror function**, no longer parameterized by a swappable `ref` object (that was the v61 primitive-mode design, removed same session) — checks world-mode directly. **v66 change:** the world-axis branch no longer subtracts/re-adds `surfPos` — it pivots on `(0,0,0)` implicitly by flipping the raw world-space point:
```js
function _mirrorPointVariant(p,variant){
  var useLocalFrame=!_symWorldActive();
  var local;
  if(useLocalFrame){
    local=p.clone().sub(surfPos);
    var inv=surfGroup.quaternion.clone().invert();local.applyQuaternion(inv);
  }else{
    local=p.clone();
  }
  if(variant.x)local.x=-local.x;
  if(variant.y)local.y=-local.y;
  if(variant.z)local.z=-local.z;
  if(useLocalFrame){local.applyQuaternion(surfGroup.quaternion);return local.add(surfPos);}
  return local;
}
```
`_symVariants()` checks `_symWorldActive()` first, then `_symVolActive()`, then falls back to `symAxis` — in practice only one family is ever non-empty at a time since the UI enforces exclusivity, so check order doesn't matter functionally, just needs *a* consistent order.

**Three integration points, all funneling through the same choke points for drawing:**

1. **Live preview (`updPrev()`):** a **pool of 7** preallocated `THREE.Line`/`BufferGeometry` pairs (`prevLinesMirror[]`/`_prevGeosM[]`/`_prevBufsM[]` — sized for the worst case, all three volume/world axes active at once = 2³−1 = 7 copies), declared next to `prevLine`/`_prevGeo`/`_prevBuf` and sharing the same material. `updPrev()` calls `_symVariants()` once, fills as many pool entries as there are variants, hides the rest.
2. **Commit (`finStroke()`):** loops over `_symVariants()`, running the identical `computeVels()`→`buildTube()`→cap-building pipeline per variant, producing 1–7 independent mirrored strokes.
3. **Ambient guide line** (see below): always-visible dashed cue, independent of the draw-time preview lines, shown whenever `symEnabled` regardless of whether the person is actively drawing.

**Undo is atomic across however many copies were made, not per-stroke.** `stroke_add_sym` (`{type,stroke,mirrorStrokes:[...]}`) is pushed instead of N separate `stroke_add`s. `undo()`/`redo()` each add/remove `[stroke].concat(mirrorStrokes)` together, so one Ctrl+Z removes the whole gesture's output as a unit, regardless of how many copies it produced.

**Deliberately independent after creation — not a linked pair/group.** Once committed, every mirrored stroke is an ordinary `strokes[]` entry with no back-reference to its siblings. Selecting, erasing, duplicating, or transforming one has zero effect on the others. Live-linked co-editing would need the same target-aware sync-hook guarding as the LCL gizmo's dual-target system (`gotchas.md` Critical Rule #11) for a capability that wasn't requested — new scope if wanted later, not a natural extension.

**No new persisted fields.** Every mirrored stroke serializes exactly like any hand-drawn one. Only the in-memory undo-action vocabulary changed (`schema.md`'s Undo Stack Schema table).

#### Symmetry Guide Line

A dashed red ambient cue (`_symGuideGroup`) shows where the current mirror axis/plane actually is, independent of the live draw-preview lines above — visible whenever `symEnabled` is on, not just while actively drawing. Color and thickness were both tuned after Sebas reported the original gray/thin/depth-tested version wasn't visible in practice (see `gotchas.md` Critical Rule #19 for the root cause and fix).

**Parented under `surfGroup` for local-frame modes, under `scene` for world-axis mode (v66 change).** `_symGuideUpdate()` picks the parent based on `_symWorldActive()`: for `symAxis`/`symVolAxes` it's `surfGroup.add(_symGuideGroup)` as before — Three.js handles the reparent — so the guide automatically follows the surface's position, rotation, and scale for free. For `symWorldAxes` it's `scene.add(_symGuideGroup)` instead, with position and quaternion both reset to identity, so the guide sits at the true scene origin `(0,0,0)` — the same fixed point `axisGroup` occupies — independent of wherever the drawing surface currently is. This matches the v66 pivot change to `_mirrorPointVariant()` (see above): the guide's location now always agrees with where the math actually mirrors around.

**Previously (v60–v65), world mode counter-rotated the guide while staying parented under `surfGroup`** — `_symGuideGroup.quaternion.copy(surfGroup.quaternion).invert()` netted out to identity rotation in world space while still inheriting the surface's *position*. This correctly oriented the lines along true world X/Y/Z but left the guide (and the underlying mirror math, prior to v66) centered on `surfPos` rather than the origin. Superseded by the `scene`-parenting approach above, which fixes both position and rotation at once with a simpler identity quaternion.

**Guide direction is the mirror-plane's in-plane axis/axes, not the flipped axis.** Flipping X (vertical mirror) draws its guide line along Y — matching how a "vertical mirror line" reads in any 2D drawing app. For the two 3-axis families, each active axis contributes its own perpendicular pair (X active → draw Y+Z; Y active → draw X+Z; Z active → draw X+Y), unioned via the shared `_symCrossAxesFor()` helper — 1 axis active shows 2 guide lines, 2+ active axes always show all 3 (any two distinct perpendicular pairs already cover all three axes between them).

**Redrawn every `animate()` tick when `symEnabled`, not on a change-detection hook** (next to `_lgOverlayDraw()`): rebuilding up to three 2-point `BufferGeometry`s per frame is cheap, and this sidesteps needing to find and hook every possible surface-move/surface-type-change code path individually — the same "just redraw it every frame" philosophy `_lgOverlayDraw()` already uses for the LCL gizmo. Re-checking parentage every call also self-heals if `buildSurf()` ever detaches the group (that function clears+rebuilds ALL of `surfGroup`'s children on a surface-type change) — the very next frame reparents it automatically. `markDirty()` is called whenever the guide's visibility flips or it's actively drawn, so its motion/appearance is never a frame stale.

**Rendering is deliberately depth-immune, not depth-tested like the axis/grid overlays.** `_symGuideMat` sets `depthTest:false` and each guide line uses `renderOrder:999` — this is new as of the visibility fix and differs from how `axisGroup`'s lines behave (which use normal depth testing and CAN be occluded). The guide sits exactly coplanar with the surface mesh/wireframe (both at local z=0), which caused it to z-fight/disappear under normal depth testing; since it's a reference cue rather than scene content, always-on-top was judged the correct behavior rather than trying to nudge it off the surface with a small epsilon offset.

**Length is a fixed per-`surfType` lookup** (`_SYM_GUIDE_HALFLEN_SURF`), not a computed exact fit to surface bounds — the guide is a cue, not a precise bounding overlay, so a reasonable half-length that pokes slightly past the visible geometry is sufficient.

#### Mirror Plane Fill (v66, opt-in)

An optional translucent light-red quad per active mirror plane, toggled independently of everything else via `symPlaneGuide` (default off) and the `#sym-plane-toggle` row at the bottom of `#sym-pop`. Added because the dashed guide line runs *along* the in-plane axes (e.g. flipping X draws a line along Y/Z), which reads as backwards to a new user tapping an "X" button and expecting to see something along X — the plane fill makes the actual mirror surface visually explicit regardless of whether that line convention is intuited.

**Distinct helper from the line guide's axes.** `_symFlippedAxes()`/`_symAxesFromObj()` return the axis actually being flipped (the plane's *normal*) — the opposite of `_symGuideAxes()`/`_symCrossAxesFor()`, which return the in-plane axes the line runs along. Flipping X → normal is X, plane is the Y-Z plane. These two helper families answer different geometric questions and are kept separate rather than derived from one another (see `gotchas.md` Critical Rule #22).

**Reuses the guide line's pool/pivot pattern exactly.** `_symPlaneMeshes[]` is a pool of 3 `THREE.Mesh`es (unit `PlaneGeometry` + shared `_symPlaneMat`) parented under `_symGuideGroup` alongside `_symGuideLines[]` — so they automatically ride along with whatever parent/pivot `_symGuideUpdate()` already picked that tick (world-origin-under-`scene` for world-axis mode per the v66 pivot fix, or `surfGroup`-under-`surfPos` for local modes). No separate pivot logic was written for the planes.

**Orientation via fixed lookup, not general quaternion math.** `_symPlaneRotFor()` rotates the default +Z-normal `PlaneGeometry` to face X (rotate 90° around Y), Y (rotate 90° around X), or Z (no rotation) — a 3-way lookup is sufficient since it's only ever called with the three fixed axis constants.

**Same depth workaround as the line, one renderOrder step behind.** `_symPlaneMat` is `depthTest:false`/`depthWrite:false` for the same z-fighting reason as the line (Critical Rule #19) — the plane sits exactly coplanar with the surface in local modes. `renderOrder:998` (vs the lines' `999`) keeps the dashed lines visually on top of the fill.

**Sizing matches the line exactly.** Each plane is scaled to `halfLen*2*_SYM_PLANE_SCALE` on both local X/Y (same `_SYM_GUIDE_HALFLEN_SURF[surfType]` lookup the lines use, times a `0.8` factor). Since the base geometry is a unit square and scale is applied before rotation, this produces a correctly-sized square regardless of which rotation case fired. The `0.8` factor is deliberate — Sebas asked for the plane to read slightly smaller than the full line length so it sits visually contained within the dashed cross rather than exactly edge-to-edge with it.

**Hidden by the same master toggles as everything else in the group** — `_symGuideGroup.visible=false` (symmetry off, or during PNG/video export's overlay-hiding) hides the planes along with the lines with no separate handling needed, since Three.js skips rendering an invisible group's children regardless of their own `visible` flag.

**Excluded from PNG/video exports**, matching the existing grid/axis/surf exclusion pattern in `expPNG()` and the video recording start/stop overlay-state save/restore — it's a UI aid, not scene content the person drew.

UI: `#bsym` (tap toggles symmetry on/off) + `#bsym-arrow` (opens `#sym-pop`) — both directly in `#topbar`, next to the ruler controls. `#sym-pop` layout: Vertical / Horizontal / Vertical+Horizontal rows (family 1, closes the popover on pick — these are one-shot choices), a separator, a "VOLUME AXIS" hint label + X/Y/Z pills (family 2, `.disabled` when `!_symVolumeEligible()`, does NOT close the popover so multiple axes can be toggled in one visit), another separator, a "WORLD AXIS" hint label + X/Y/Z pills (family 3, never disabled, also doesn't close the popover). State is entirely session-only — not persisted to `sk3d_prefs` (unlike `stylusOnly`/`invertOrbitX`/`twoFingerMode`, which gained `localStorage` persistence in session 78) or to the save file.

### Ruler System — 5 Shapes, 2 Attachment Modes — v68

The ruler (IIFE at ~line 12953, `#ruler-pop`) was originally one shape (a straight edge) with two independent attachment modes: **screen** (floating, canvas-drawn, follows the viewport) and **world/on-plane** (parented to `surfGroup`, projected through the camera each frame). v67 added 4 more shapes — 180°/360° protractor, 45°/30-60-90 triangle — each usable in both attachment modes, without touching the original straight-ruler code at all (see `gotchas.md` Critical Rule #23 for why they're a parallel path rather than a unified one). v68 added a drag-to-resize scale handle to all 4 of those shapes.

**Shape descriptors (`_shapeDesc(key)`)** return, for any non-straight type: an `edges[]` array (each `{type:'line',a,b}` or `{type:'arc',cx,cy,r,start,end,full}`, in local ruler-space, unrotated/untranslated), an `inside(lx,ly)` predicate, a `rotHandle`, a `scaleHandle` (all 4 shapes, v68), and (triangles only) a `mirrorHandle`. The function is **mode-aware** — it reads the module-scope `_mode` var itself and returns pixel-sized constants for screen mode or world-unit-sized constants for world mode, so the same descriptor shape serves both drawing and hit-testing correctly scaled in whichever mode is currently active. As of v68, each shape's base size constant (`R1`/`R2`/`leg`/`shortLeg`) is multiplied by the module-scope `_shapeScale` before anything else derives from it, so scaling is applied in exactly one place and flows automatically into edges, `inside()`, outlines, and handle positions.

**Triangles are built "base-leg-down."** `_triLegBaseVerts(legA, legB, mirror)` places the right angle at the bottom-left corner, with `legA` as the horizontal base (one of the two right-angle sides, sitting flat) and `legB` vertical — not the hypotenuse-as-base construction tried and rejected during prototyping. `mirror` flips all three vertices' X coordinate, swapping which corner holds the right angle.

**Protractors snap on both the baseline and the curve.** `_edgeDist()`/`_edgeSnapPt()` handle `arc` edges by converting to/from angle space (`Math.atan2`, `_angleInRange2()` for the 180°'s bounded arc vs. the 360°'s unbounded one) — a stroke can lock to either the flat edge or the curved edge of the 180° protractor, matching how a real drafting protractor is used.

**Screen mode vs. world mode use different math for the same shapes, deliberately:**
- **Screen mode** hit-tests/snaps entirely in local 2D space (`_sScreenToLocal()`/`_sLocalToScreen()`, generic forms of the rotation math the original straight ruler already had inline) — arcs are hit-tested analytically via angle math, no sampling needed, since there's no perspective to account for.
- **World mode** projects everything through `_rLocalToWorld3()` (generic form of the math `_worldCorners()` already used inline for the straight ruler's 4 corners) and then measures distance in **screen pixels** via `_w2s()`, matching the straight ruler's existing `SNAP_PX`-threshold convention exactly (see `gotchas.md` Critical Rule #24). Arcs are polyline-sampled (20–40 segments) into world space first, since there's no way to hit-test or clip-render a true curved edge under perspective analytically.
- World-mode move/rotate handles are **not** recomputed per shape — `_drawWorldShape()` and the new-shape branch of `_hitTest()` call the straight ruler's existing `_worldHandles()` directly, since handle position is shape-agnostic (a fixed 1.0-world-unit offset from the ruler's own local origin).

**Mirror toggle** (triangles only): a small on-canvas circular button drawn just below the rotate handle (`desc.mirrorHandle`, both screen and world mode), hit-tested in `_hitTest()`/`_onCaptureDown()` as its own `'mirror'` return value — a tap toggles `_mirrored` immediately rather than starting a drag (unlike `'move'`/`'rot'`, which start `_drag`).

**Scale handle** (all 4 non-straight shapes, v68): an on-canvas circular button (`desc.scaleHandle`) — for protractors it sits where a triangle's mirror handle would be (just below the rotate handle); for triangles it sits one ring further out, below the mirror handle, so the two never overlap. Unlike mirror, scale is a **drag**, not a tap-toggle: it hit-tests to a `'scale'` return value that starts a normal `_drag` (like `'move'`/`'rot'`), and `_onCaptureMove` continuously updates `_shapeScale` as a ratio of the live pointer distance from the ruler's center to a `baseDist` captured at drag-start (the handle's distance from center at `_shapeScale===1.0`, back-derived by dividing the handle's current — already-scaled — position by the current scale). Clamped to `[SCALE_MIN, SCALE_MAX]` = `[0.4, 2.5]`. See `gotchas.md` Critical Rule #25 for the full ratio-math writeup and why it avoids a second scaling pass.

**Rotate-snap submenu** (Off/15°/45°, new `#ruler-pop` "ROTATE SNAP" section): `_menuSnapDeg` is checked first inside `_snapAngle()` — when set, rotation snaps continuously to that increment; when Off (default), falls through to the original magnetic-45°-only behavior (`_angleSnap`, double-tap toggle, unchanged). This is additive, not a replacement — existing double-tap muscle memory still works exactly as before unless the submenu is explicitly used.

**OFF-EDGE mode** (`_parallelMode`, new `#ruler-pop` "OFF-EDGE" section — Freehand / Parallel, **default Freehand**): decides what happens when a stroke *starts* further than `SNAP_PX` from every edge of the tool. Freehand is the pre-109 behaviour — the ruler sets `_rulerBypassed` and steps out of the way entirely. Parallel constrains the stroke to a line or arc through its own start point, offset from the nearest edge:

- **Line edges** (straight ruler, all three triangle edges, the 180° protractor's base) → a parallel straight line. The straight ruler does this with one number: screen mode reuses `eo`, which is `±BODY_H*0.5` on-edge and the start point's own signed perpendicular distance (`_paraOff`) when parallel; world mode carries `_paraU`, a parameter across the ruler's width where 0 is the top long edge and 1 the bottom, extrapolating freely outside `[0,1]` and applied by lerping the world corners.
- **Arc edges** (both protractors) → a **concentric** arc, radius = the start point's distance from the centre. See `gotchas.md` #109(b) for why concentric rather than tangent, and why the synthetic arc is always a full circle.

Parallel does **not** override the inside-the-body block. `_rulerBlocksPt()` is untouched: a stroke started inside the tool is still cancelled, in either mode, because the tool is a physical object sitting on the page.

**Deferred direction — TRIANGLES ONLY** (`_triDirIdx`, `_pickTriDir()`): a set square is used by sliding along whichever of its three edges gives the angle you want, and *which* edge that is only becomes clear once the hand starts moving — especially near a corner, where two edges are equally close. So triangles no longer commit at touch-down. The **anchor** is fixed at touch-down (the snapped point on the nearest edge, or the raw start point in parallel mode); the **direction** is re-picked on every move from the pen's travel since touch-down, matched against all three edges' unit *screen* directions by `|dot|` (a line direction is undirected — dragging backwards along an edge is still that edge). Whatever is showing at lift is what gets committed; there is no separate commit step, the lift *is* the lock.

Two dials keep it from flickering: `TRI_DIR_MIN_PX = 14` (no picking at all until the pen has travelled that far, so a barely-started stroke keeps the edge it was nearest to) and `TRI_DIR_HYST = 0.04` (an alignment bonus the incumbent direction keeps, which decides the exactly-ambiguous 45° case instead of letting it oscillate).

Because the direction can change *after* points have been drawn, the already-drawn part has to swing across with it. That needs a second hook alongside `_rulerSnapPt()` — `window._rulerRemapPts()` / `window._rulerPendingRemap` / `window._rulerRemapDone()`, consumed by `onMove()` on the same move that raised it. Points are rotated about the fixed anchor in screen space, which preserves spacing exactly and therefore leaves `velHistory` and the velocity taper valid. Full reasoning in `gotchas.md` Critical Rule #109(a).

**Protractors and the straight ruler are unaffected by any of this** — one lock at touch-down, exactly as before. The deferred pick is triangle-only by design, not by accident: a protractor's single arc has no three directions to choose between.

**`_activeEdge(desc)`** is where the three cases meet. On-edge with an unchanged direction returns the **real edge object, untouched** — the common path is byte-for-byte pre-109, `_edgeSnapPt()`'s clamping included. Parallel, or a flipped triangle direction, builds a synthetic edge through the anchor instead. `_screenToRLocal()` / `_rLocalToScreen()` are the mode-agnostic coordinate helpers the new code works in, so one implementation serves both screen and world attachment.

**Switching shape type** (`_setRulerType()`) resets rotation to 0 (so the new shape starts in its default "base facing down" orientation) and clears `_mirrored` and `_shapeScale` (back to `1.0`), but deliberately leaves the ruler's position untouched.

---

### Rotate-Arc Layout: Shared Radius with Minimum-Width Slice Enforcement — v69

All four rotate gizmos (plane/card `_gcComputeLayout`, LCL overlay `_lgComputeLayout`, stroke-selection `_sgComputeLayout2`, primitive `_pgComputeLayout`) share the same arc-layout algorithm, independently duplicated rather than factored out. This went through **four** rounds of bug fixing in Session 69, including a full alternate design that was implemented, worked, and was then explicitly reverted at Sebas's request. Full history in `gotchas.md` Critical Rule #26 — this section summarizes the final design.

**Original design:** all three axes' rotate arcs drawn on one shared radius, with each axis's arc span bounded by the *screen-projected angle* of its two sibling axes (`{x:['z','y'], y:['z','x'], z:['x','y']}` — the same bounds object in all four gizmos, named `GC_ARC_BOUNDS`/`LG_ARC_BOUNDS`/`SG_ARC_BOUNDS2`/`PG_ARC_BOUNDS2`, kept declared only where a dead/unused duplicate function still references it).

**Rounds 1–2 (angle-stability bugs, fixes kept):** an axis pointing near-parallel to the camera makes its own screen-projected angle numerically noisy, corrupting the other two arcs that used it as a boundary — fixed by holding the last stable angle when near-degenerate. That hard freeze then went stale under sustained camera motion (pan-then-orbit) while an axis stayed in the degenerate zone — fixed by replacing the freeze with a continuous damped blend (`alpha` ramping 0→1 with how non-degenerate the axis is, shortest-path angle wrapping). **This damped-blend fix is still in place today.**

**Round 3 (design problem, not just angle math):** overlap could still happen with no axis anywhere near camera-aligned — specifically when two sibling axes simply converged toward the same screen angle as each other. The damped blend only stabilizes an axis's *own* angle; it does nothing when two already-stable siblings happen to sit close together, which a rotating camera produces routinely, not just at extreme angles.

**Round 3's fix, tried and then reverted:** replaced the shared-radius design with concentric per-axis radii (each axis drawn at its own fixed radius, outer-to-inner). This worked — three arcs at three different radii structurally cannot overlap regardless of angle — but **Sebas explicitly asked to revert it**: the concentric-circle look wasn't wanted, and the request was to keep the original pie style while fixing the same bug differently. Reverted in full: all four gizmos are back to one shared radius per gizmo (`LG_RING_R`/`GC_RING_R`/`SG_RING_R2`/`PG_RING_R2`, each a plain number again), and hit-testing is back to the original angle-containment test.

**Round 4 (final fix):** with slices sharing one radius again, the fix has to live in the angular partition itself. The three slices' raw widths are exactly the three circular gaps between the (sorted) axis angles, each owned by the axis excluded from that gap — enforce a minimum width per slice and redistribute any deficit proportionally from slice(s) with room to spare, so no slice can collapse toward zero regardless of *why* two siblings converged (camera-alignment or not). The redistribution only ever adjusts arc *boundaries* — an axis's own arrow direction is untouched. Verified standalone against evenly-spaced, two-converging, and all-three-converging cases: widths always sum to exactly 2π, no negative values, no crash even in the extreme case.

**Round 4 follow-up — the minimum must be derived from arc length, not a fixed angle:** an initial fixed `0.45` rad (~26°) minimum looked fine on the full-screen LCL overlay (ring radius 62px) but produced a visibly unusable sliver on the much smaller card/selection/primitive gizmos (ring radius ~44-50px), since the same angle is a much shorter physical arc length on a smaller radius. Fixed by deriving each gizmo's minimum angle from a shared target minimum arc length (`44px`, matching common Apple/Android minimum touch-target guidance) divided by that gizmo's own ring radius: `LG_MIN_ARC = LG_MIN_ARC_PX / LG_RING_R` (and equivalently `GC_MIN_ARC`/`SG_MIN_ARC2`/`PG_MIN_ARC2`). This gives the LCL overlay a smaller angle (~0.71 rad, ~41°) and the smaller gizmos correspondingly larger angles (~0.88-1.0 rad, ~50-57°) — different angles, same guaranteed physical tap-target length. All comfortably under the ~120° (`2π/3`) per-slice ceiling the redistribution needs to stay feasible.

**Anchoring is a known simplification, not perfectly symmetric:** the redistribution anchors the first (smallest-angle) sorted spoke's true position and cascades adjusted gaps forward from there, rather than distributing correction symmetrically. In genuinely extreme convergence, whichever axis sorts first (which can flip frame-to-frame near a symmetric convergence) could show slightly more adjustment than its neighbors. Revisit only if this becomes visibly jumpy in practice.

**Deliberately not unified into one shared helper** — the four call sites' surrounding code (variable names, camera-basis vs. projection-matrix approach for the degeneracy blend, coordinate systems) differ enough that a shared function would be a real refactor, not a surgical fix. Worth doing if a fifth rotate-gizmo consumer is ever added — and it would need both the angle-stabilization blend and the min-angle enforcement, since neither comes for free. See `gotchas.md` Critical Rule #26.

### Rotate-Arc Layout, Part 2: Minimum ARROW Separation via Antipodal Flip — v87

The Round 4 fix above guarantees a minimum *arc* width but never moves an arrow — two arrows could still land close together on screen since an axis's arc lives in the region between its two siblings, not at its own arrow. Session 87 added a second, independent mechanism layered in front of it: a hard 90° minimum angular separation between any two arrows, enforced by flipping an arrow to its antipodal screen position rather than reshaping arcs.

**Why this slots in cleanly:** every one of the four gizmos already had a `flipped[ax]` flag (camera-facing: pick whichever of an axis's two antipodal screen angles is closer to the viewer) that's the single value every downstream consumer reads — drag-direction sign, move-direction negation, and (before this session) the axis label's "-" prefix. Layering a second reason to flip into that same variable, rather than inventing a parallel mechanism, means drag math and move math stay correct automatically.

**Algorithm:** each axis has exactly two valid screen angles (its own, or +180°) — 8 total sign combinations for (x,y,z). Inserted right after the existing camera-facing/damped-blend angle computation and before the Round-4 gap/redistribution code in all four `*ComputeLayout` functions: try all 8 combinations, compute the resulting 3 sorted-adjacent gaps for each, and pick whichever achieves ≥90° on every gap using the fewest flips from the natural camera-facing baseline (ties broken by the largest resulting minimum gap). The Round-4 redistribution then runs unmodified on the result — a no-op in the common case (90° already clears its own ~50-57° floor) and the fallback's safety net otherwise.

**90° is not always achievable — this is a real geometric limit, verified standalone, not a defect.** Two axes' underlying projection *lines* (mod 180°, since flipping just swaps which end is "the arrow") can sit only a few degrees apart; flipping either one swaps their separation between that small angle and its 180°-supplement, never anything in between — and the third axis's own line can independently conflict with whichever supplement the first pair needs. When no combination reaches 90°, the algorithm falls back to whichever combination maximizes the achievable minimum gap (provably optimal, since all 8 combinations are checked exhaustively). Constructed worst-case inputs (two axes ~3° apart, a third positioned to conflict with the fix either way) confirmed the fallback lands at whatever the true best is rather than crashing or looping. See `gotchas.md` Critical Rule #85 for the full write-up and verification cases.

**Axis text labels removed entirely** in the same session, all four gizmos — per explicit request, arrow color/position is enough to identify the axis. This is also what makes the antipodal flip's "which end does this represent" question moot: there's no label left that would need a "-" prefix to stay honest about it. The neighbor-nudge label-placement helpers (`_lgLabelAngles` etc., Round 4's Critical Rule #27) were left in place, now unused, rather than removed — smaller diff, and they're inert.

**Arc and arrow stroke widths increased ~15-20%** for touch, same session — proportional-to-ring-radius multipliers bumped on the three canvas gizmos, fixed pixel values bumped on the full-screen LCL overlay, same "derive from a physical target, not an arbitrary number" spirit as the Round 4 touch-target fix, just applied to line thickness instead of arc length.

**Not changed:** arc-ownership (which gap belongs to which excluded axis) and notch-carving (Critical Rule #28) — both are computed from `axisAngles` exactly as before, so they automatically stay correct for wherever an arrow ends up after the new flip step.

### Rotate-Arc Layout, Part 3: Turntable Drag Model Ported to All Four Gizmos — v88

The `⊕LCL` overlay's rotate drag already tracked the pointer's angle relative to the gizmo centre every frame, accumulating the shortest-path delta since the previous frame — a "turntable" model, immune to the tangent-crossing jumps and sign jitter a fixed-tangent projection is prone to. The card/surface, stroke-selection, and primitive gizmos did not share this — they projected the cumulative pointer offset since grab onto a tangent direction fixed at grab time, which reads as linear motion rather than circling the arc.

Ported LCL's model to the other three. This was a narrow, low-risk change because all three tangent-based gizmos already recompute their rotation from a single cumulative scalar every frame (reset mesh/Euler to the drag-start snapshot, reapply a quaternion/angle built from that one number) — so only the *source* of that scalar changed, from a tangent-projection formula to an angle-around-centre accumulator (`drag.rawAccum`/`drag.prevAngle` and gizmo-specific equivalents). Every downstream consumer — snap (absolute-angle in WORLD mode, delta in LOCAL mode), the per-axis sign-flip convention, and the precision-popup "type an exact value" reapply functions — was left untouched, since all of them only ever depended on "the cumulative angle for this drag," never on how it was derived.

**One bug specific to the stroke-selection gizmo's structure, caught before shipping:** its handle-type branches run inside a `selectedStrokes.forEach` loop (each selected stroke's transform is independently recomputed from its own drag-start matrix). The angle-tracking accumulator must run exactly once per drag-apply call, not once per selected stroke — placing it inside the loop would advance the accumulated rotation once per stroke per frame. Fixed by hoisting the computation above the loop into a single value every stroke reads. See `gotchas.md` Critical Rule #86.

**Not unified into a shared helper**, consistent with the existing four-independent-implementations decision for this family of gizmo code (Critical Rule #26) — the surrounding drag-state shapes differ enough (single-object vs. multi-object-loop vs. quaternion-vs-Euler storage) that a shared function would be a refactor, not a port.

### Rotate-Arc Layout, Part 4: WLD-Mode Euler Coupling Fixed via Quaternion Premultiply — v89

Part 3's note above ("quaternion-vs-Euler storage" being one of the reasons the four gizmos' drag state isn't unified) turned out to matter more than a naming detail: it's the exact fault line behind a real bug. The card/surface gizmo is the only one of the four that persists rotation as three separate numbers (`surfEuler.x/y/z`), recomposed via `THREE.Quaternion.setFromEuler()` on every `syncSurf()` call. Three.js's Euler-to-quaternion conversion always composes the three components in one fixed internal order — so editing axis Y while X is already non-zero doesn't add a clean world-Y twist on top of the X-rotated state, it recomputes the whole orientation from scratch in that fixed order, entangling the two. The stroke-selection and primitive gizmos never had this problem, because both keep a single running quaternion and premultiply a fresh world-axis delta onto it every drag — mathematically clean by construction, with no intermediate Euler representation to cause coupling. The card gizmo's own LOCAL mode already used this clean pattern too (premultiply onto `drag.oQuat`, decompose to `surfEuler` only as a final storage step) — WORLD mode was the sole holdout, treating `surfEuler`'s three components as independently-settable absolute sliders.

**Confirmed as a real, measurable bug before fixing it**, not just theorized: a standalone script (`verify_wld_rotate.js`, not shipped) built both the old and new composition models using the actual pinned `three@0.128.0` and rotated X by 30° then Y by 40° under each. The old model landed 20.31° away from where a clean, order-independent composition should put it; the new model landed exactly on it (0.00°), and stayed exact for a third chained edit (Z on top of X+Y). A single-axis-only edit — the case that was never actually broken — produced identical results under both models, confirming the fix doesn't disturb the common case.

**Fix:** WORLD mode's rotate branch now mirrors LOCAL mode's structure exactly, substituting the true unrotated `WORLD[ax]` for LOCAL's surface-relative axis: `delta = Quaternion.setFromAxisAngle(WORLD[ax], amount)`, `newQuat = delta.multiply(drag.oQuat)` (premultiply — apply in world space, on top of the surface's actual drag-start orientation), then strip the plane's base quaternion (`bq`) before decomposing into `surfEuler` for storage — identical to how LOCAL mode already handles the same bq-stripping step, for the same reason (`syncSurf()` re-applies `bq` fresh from `curPlane` every call). `_cgReapplyRotate`'s WORLD branch (the precision-popup "type an exact value" path) was updated identically so drag-time and popup-reapply math never diverge.

**Unavoidable, deliberately-accepted side effect:** WORLD mode's on-screen readout and snap target changed from an absolute world angle to a delta (amount rotated this drag) — matching how LOCAL mode and the other two gizmos already display rotation. This isn't a style choice; it's a consequence of the fix. "The absolute angle of axis X" stops being a well-defined, stable quantity the moment rotations are composed around more than one axis — that instability is exactly what made the entanglement bug possible in the first place. Confirmed with Sebas before implementing. See `gotchas.md` Critical Rule #87 for the full verification numbers.

### Plane/Card Gizmo Defaults to WLD, Not LCL — v69

`_gcAxisLocal` (the plane/card gizmo's local-vs-world axis flag) now defaults to `false` (WLD) instead of `true` (LCL), per explicit request. It's a single module-scope flag governing move/rotate/scale drag behavior uniformly — not split per `gizmoMode` — so changing its default covers every mode at once. The two AXS toggle buttons (`#gc-axmode`, `#pb-gc-axmode`) had their static "on" CSS class removed from the HTML to match (that class means "LCL active"); the on-canvas "LCL"/"WLD" text indicator needed no change since it already reads the flag fresh every frame. Not persisted anywhere — purely a runtime default, and scoped to this one gizmo (LCL overlay, stroke-selection, and primitive gizmos are untouched).

### Rotate-Gizmo Label Placement: Nudge From the Arrow, Never From the Arc — v69

All four rotate gizmos draw an axis's text label near that axis's own **arrow**, at a fixed distance beyond the arrowhead. Two arrows can legitimately project close together in screen space at certain camera angles (not a bug — just projection), which crowds their labels together.

**A first fix attempt reused the arc-slice midpoint** (already guaranteed a minimum separation by the Round 4 fix above) as the label's angle, on the reasoning that the data was already there and already spaced apart. **This was verified wrong before shipping:** in this gizmo's design, axis A's colored arc deliberately lives in the region *between A's two siblings* — generally a completely different part of the circle than A's own arrow, not "near" it. Checking a normal, evenly-spaced view (nothing crowded) showed every label would land 180° from its own arrow under this scheme — a severe regression to the common case in service of fixing a rare edge case.

**Actual fix:** a small, separate label-nudge helper per gizmo (`_lgLabelAngles`/`_gcLabelAngles`/`_sgLabelAngles`/`_pgLabelAngles`) that starts every label at its own axis's true arrow angle and only nudges it away from its immediate neighbor(s) when two labels would otherwise land closer than a minimum separation — using the same three-point circular-gap-and-redistribute technique as the Round 4 arc fix, but applied to keep each axis's *own* label near its *own* arrow (unlike the arc-ownership version, which deliberately reassigns each gap to the excluded third axis). The minimum separation is itself derived from a target pixel clearance between label anchors (`26px`) divided by that gizmo's label radial distance — same length-to-angle principle as the touch-target fix above, just for text clearance instead of tap-target size.

**Verified standalone:** an evenly-spaced view produces zero label adjustment; a crowded view nudges only the affected labels, by a few degrees, keeping them near their true arrows rather than relocating them across the circle. See `gotchas.md` Critical Rule #27 for the full algorithm, the wrong-attempt numbers, and the general lesson (arc-slice data and label-placement data are not interchangeable here, even though both derive from the same `axisAngles`).

### Rotate-Gizmo Arc Notching: Carving Arrow-Crossing Clearance — v69

An axis's arc deliberately excludes only its *own* arrow (a small `GAP` trim at each boundary — Critical Rules #26/#27). With just 3 slices covering the full circle, the other two axes' arrows are structurally guaranteed to land inside one of the other two slices, typically well away from either boundary. Wherever that happens, the arc's hit-test region (which spans its entire drawn extent) wins over the arrow's, making that arrow hard to select — reported by Sebas as "the arrow is over an arc making it hard to select." A wider minimum slice angle (Critical Rule #26) doesn't help, since the problem is where inside a slice the crossing lands, not the slice's overall width.

**Fix:** `arcs[ax]` changed from a single `{start, end}` object to an array of sub-arc segments in all four gizmos. A small clearance notch (target `28px`, converted to radians via that gizmo's own ring radius — same length-to-angle principle as Critical Rules #26/#27) is carved out wherever *any other* axis's raw arrow angle falls strictly inside the arc (found by aligning that angle into the arc's own numeric frame, since arcs are built via a monotonic cascade that can exceed 2π). Drawing now loops over each segment, drawing a separate sub-arc per piece (visually: a small physical break in the ring exactly where another axis's arrow crosses it); hit-testing checks containment against each segment, so a tap landing in the notch correctly falls through to the arrow/scale test instead of matching the (now-absent) arc there.

**Graceful fallback:** if the notch(es) needed would consume an entire slice (a slice already at or near the Critical Rule #26 minimum, with a crossing landing in it), the carve function keeps the slice whole rather than producing zero segments. Accepted as a known, rare edge-case limitation rather than solved further this session.

**This is a third, independent mechanism layered on the same `arcs` data alongside Critical Rule #26 (minimum slice width) and Critical Rule #27 (label placement)** — none of the three supersede each other; a slice today gets width-enforced, then notched for crossings, and its label is placed and nudged completely separately from either. See `gotchas.md` Critical Rule #28 for the full algorithm and verification.

### LCL Float Button: Hold-to-Peek — v69

`#lcl-float` (the wide-mode floating button that toggles the LCL 3D overlay) previously had a plain click-toggle and a redundant `⊙45°` companion button (`#lcl-snap`, removed this session — it was a pure mirror of the shared `snapEnabled` toggle already exposed via `#gsnap`/`#pb-gsnap` on the gizmo card). It's now bigger (its own CSS rule instead of sharing one with the removed `#lcl-snap`) and has two distinct interaction modes on the same button, modeled directly on the existing erase-button long-press pattern (`wireEraseLongPress`, ~line 10688):

- **Quick tap** (pointerup before 450ms) → same on/off toggle as before (`_lgToggle()`).
- **Press-and-hold** (still down past 450ms) → forces the gizmo on if it wasn't already, and sets a local `_lgHoldActive` flag. This is a one-finger gesture on the button itself; a **second**, independent finger or the pencil can then interact with the now-visible gizmo elsewhere on screen — no new code was needed for that part, since the existing renderer-canvas pointer handlers for the gizmo (`pointerdown`/`pointermove`/`pointerup` on `renderer.domElement`) already key off `_lgOn` per-`pointerId`, so a simultaneous independent touch is handled correctly by code that already existed.
- **Release from a hold** → turns the gizmo back off unconditionally (even if it happened to already be persistently on before the hold started) — confirmed as the desired behavior, not left as an edge case.
- `pointercancel` on the held pointer gets the same release-cleanup as a normal pointerup, so a finger sliding off the button doesn't leave the gizmo stuck on.

**Supporting fix required for the two-finger case:** the LCL overlay's `touchstart` passthrough-blocker (used to prevent the browser's default touch handling — e.g. scrolling — while dragging the gizmo) read `e.touches[0]`, which is the *first* touch active anywhere on the page, not necessarily the touch that triggered this particular event. With two simultaneous touches (one held on the button, one newly landing on the canvas to drag the gizmo), that could test the wrong finger's position. Changed to `e.changedTouches[0]` (the touch that triggered this specific event) — the correct, standard way to identify "this" touch in a multi-touch handler.

**Stylus-specific fix (partial, not pursued further):** hold-to-peek initially worked with a finger but not a stylus/pencil. All three of `#lcl-float`'s pointer listeners (`pointerdown`/`pointerup`/`pointercancel`) now call `e.preventDefault()`, matching the pattern already used for pen input on the renderer canvas (`pointermove`'s "Prevent iPadOS from stealing pen contacts mid-stroke" comment). This alone didn't fully resolve stylus hold on iOS (likely an OS-level gesture-recognizer layer JS can't `preventDefault()` its way out of, similar in flavor to the already-documented unresolved Apple Pencil stroke-skipping issue). **Confirmed by Sebas as acceptable as-is:** finger-hold works reliably, and a stylus can still use the plain tap-toggle — hold-to-peek specifically via stylus is not being chased further. Don't reopen this without a new, specific request.

`#glocal`/`#pb-glocal` (the card and narrow-mode LCL toggle buttons) were **not** given this hold behavior — only `#lcl-float` was requested. At the time of this session, narrow/mobile mode never showed `#lcl-float-group` at all — **session 71 changed that specifically for the `ui-hidden` case** (see below).

---

### Session 74: LCL Gizmo Third Target, Ref-Object Highlight, Bottom-Stack Spacing

Six independent items. No schema change (4.5). Cache key `v59` → `v62`.

**1. Topbar reorder.** Markup-only move inside `#topbar` (see the HTML Structure map above). Nothing in JS depends on child order; verified with a per-ID count and a whole-file duplicate-ID sweep.

**2. The precise-value popup is no longer suppressed in `ui-hidden`.** Session 72 added `body.ui-hidden #precise-pop{display:none!important}`, which turned out to be backwards — the LCL gizmo is specifically built to be used with the UI hidden (that is what `#lcl-float` and its hold-to-peek behaviour are for), so precise entry was blocked in exactly the mode that needs it most. The rule is gone, and `_pipPosition()` gained a fallback: with both anchors `display:none`, `getBoundingClientRect()` returns an all-zero rect, so the old `r.bottom + 8` silently produced `top:8px` rather than an obvious failure. It now checks `r.height` and falls back to a fixed `top:12px`. This affects all four gizmos in hidden-UI, not only LCL.

**3. The LCL 3D overlay gizmo gained the precise-value popup.** It was the one transform gizmo session 72 skipped. Implementation mirrors the other three exactly (`_lgLastPrec` nulled at both drag-start branches, captured in all four apply branches, consumed by `_lgTryOpenPrecisionPopup()` at drag-end, four `_lgReapply*` helpers re-running the drag math from the frozen snapshot). Two points specific to it:

- Rotate pre-fills from a new `_lgDrag.appliedAngle`, not the pre-existing `accumAngle`. `accumAngle` is pre-snap; with `⊙45°` active the two diverge, and the popup must show the value that actually landed.
- The rotate reapply is *provably* the same transform as the drag, not an approximation. The live drag composes incrementally about the running local axis (`delta_n = axisAngle(runQuat_n · L, incr)`, premultiplied); the reapply performs one rotation about the drag-start local axis by the total angle. These are equal by conjugation: `delta · q = q · axisAngle(L, θ)`. Verified numerically — 400 random increments against one composite rotation, quaternion error 6.8e-15.

**4. The LCL gizmo now has three targets, not two.** `_lgTarget` is `'surface' | 'selection' | 'primitive'`. Previously, selecting a ref object and opening the LCL gizmo drove the **drawing plane** — the gizmo looked functional and was simply transforming the wrong object. Activation precedence is now: selected ref object > stroke selection > surface. Target is still chosen **only at activation**, preserving session 69's contract; `window._lgSyncToPrimitive` (called from `pgApplyDrag` and `pgReapplyPrecise`) repositions an already-primitive-targeted gizmo without ever turning it on or retargeting it, the same shape as `_lgSyncToSelection`.

Threading a third target touched more than the branch that reads it: all four `_lgApplyDrag` arms, all four `_lgReapply*` helpers, the live precision readout, and drag-start snapshotting (`oPrimPos`/`oPrimQuat`/`oPrimScale`). `_lgPrimCommit()` exists because ref-object groups run `matrixAutoUpdate = false` once duplicated/merged/loaded — every mutation must push `updateMatrix()` by hand, the same line `pgApplyDrag` ends on. The LCL gizmo pushes the same `prim_transform` undo record the primitive gizmo does, so both gizmos share one undo history for ref objects. `_lgComputeLayout()` falls back to `'surface'` if the targeted object is deselected or deleted mid-session.

**5. Ref-object selection highlight, rebuilt.** Three changes to `selectPrimitive`/`deselectPrimitive`, plus new hover:

- **Colours now match the stroke system exactly** — blue `0x3a9eff` selected, green `0x22dd66` tap-to-select, red `0xff3344` tap-to-deselect, replacing the old amber `0xf5c842`. The design rule is that a ref object and a stroke must never disagree about what a colour means.
- **The highlight is a group parented to `prim.mesh`**, so it inherits the object's transform with no per-frame repositioning and survives gizmo drags. It carries a subtle surface tint (`MeshBasicMaterial`, `depthTest:true` so it shades the object rather than flooding a flat silhouette over what's in front) plus an edge outline drawn as three concentric scaled copies, since WebGL ignores `linewidth`. See `gotchas.md` Critical Rules #45–#47 for the thickness fake, the sphere-has-no-edges finding, and the shared-geometry disposal trap — all three are easy to get wrong.
- **Hover for ref objects is new.** It hooks the existing `_runHover` rAF throttle (mouse/pen only, matching stroke hover) and deliberately fires in *every* mode rather than only select/erase, because `_primSelectOnTap` runs before mode-specific routing — a tap in draw mode genuinely does select or deselect the object under the cursor. Hovering the already-selected object hides the blue layer for the duration, since a red tint stacked on a blue one read as neither.

**6. Bottom-stack spacing (tall mode).** The docked float card still docks — full width, snapped to the bottom stack, no resize grip — but is no longer welded flush to `#narrow-bar`: 8px gap, 8px lateral inset, all corners rounded, bottom border restored. Per explicit request; do not re-flush it. It also gained the `pages-open`/`views-open` strip-shift rules it had been missing since the class was introduced (`gotchas.md` Rule #50), and `undock()` was rewritten to leave the card where it visually was instead of restoring state that the common code path never wrote (Rule #49). Separately, `#prim-bar` was overlapping `#topbar` by 2px in wide mode and sitting flush in narrow; both now clear it by 8px.

**7. The LCL gizmo retargets on selection change.** The original "decide only at activation" contract meant that selecting something while the gizmo was already up left it driving the drawing plane. `window._lgRetarget()` re-picks via the shared `_lgPickTarget()` and snaps `_localGroup` on with `_lgApplyTargetTransform()`; it is called from `updateSelHighlights`, `clearSelection`, `selectPrimitive` and `deselectPrimitive`, and bails out while a drag is in progress. Activation now uses the same two helpers, so there is exactly one rule for what the gizmo drives.

**8. Merged objects get their origin at their own bounding-box centre.** `mergePrimitives()` bakes geometry to world space, so the merged group's origin was the *scene* origin — and gizmos pivot on the origin. See `gotchas.md` Rule #51 for the fix and the two ordering constraints (`parts[]` captured after the recentre; bounds recomputed). Old saves are unaffected; no schema bump.

**9. Ruler placement in tall mode.** The ruler initialises at viewport centre, which in narrow mode falls under the docked control card. `_uiBottomLimit()` measures the topmost edge of the bottom stack (`#pb-float-card`, `#narrow-bar`, `#views` — `#pages` left the list in session 108) and returns `innerHeight` unchanged outside narrow mode; `_rulerClearOfUI()` nudges `_cy` clear of it on ruler activation and on resize. It only moves the ruler when it would actually be covered, so a deliberately-positioned ruler stays put.

---

### Session 72: Precise-Value Popup — Type an Exact Move/Rotate/Scale After Releasing Any Gizmo

**The feature:** releasing a drag on any of the three transform gizmos (card/surface, stroke-selection, primitive), for any of move/rotate/scale (including uniform scale), now pops up a small input under `#topbar` (or under `#prim-bar` when it's open) pre-filled with the value that drag just applied. Typing a different number and confirming **overwrites to that exact value** — it does not stack an additional nudge on top of wherever the drag left off. The popup only appears if the drag actually changed something; a plain tap (including the existing `su`-handle tap-to-toggle-scale-mode gesture) never triggers it. It closes without applying on Escape or any tap outside it — which, for free, covers undo/redo/new-scene/page-switch/mode-switch, since all of those are themselves pointerdown events outside the popup and so close it before their own action runs.

**Why "overwrite" didn't need new transform math.** The pre-existing `bprecision`/live-readout feature (`window._precisionMode`, driving `sg-precision`/`pg-precision`/the card gizmo's `ghint` text) already computes, every single drag frame, exactly the number this feature needed to make editable — it just only ever turned that number into a display *string*. So each gizmo's `applyDrag` function got one small addition: alongside building the display string, it now also stashes the **raw number** into a small per-gizmo variable (`_cgLastPrec` for card, `_sgLastPrec` for selection, `_pgLastPrec` for primitive — shape `{h,ax,kind,raw,isLocal?}`), gated on the same "did this frame actually move the pointer more than ~3 screen px" check (`_cgMoved`/`_sgMoved`/`_pgMoved`) that decides whether the value is worth remembering at all. At drag-end, if that var is still set (and its handle still matches the drag being ended), a `*TryOpenPrecisionPopup(snapshot)` function opens the shared popup with a small closure (`applyFn`) that — when the person confirms a new number — re-runs the *exact same math* `applyDrag`/`sgApplyDrag`/`pgApplyDrag` used, from the frozen drag-start snapshot, substituting the typed number for the one the drag would have computed. This is why it's called "overwrite," not "nudge": the reapply functions (`_cgReapplyMove`/`_cgReapplyRotate`/`_cgReapplyScaleAxis`/`_cgReapplyScaleUniform` for card; `sgReapplyPrecise` for selection; `pgReapplyPrecise` for primitive) are structurally identical to their drag-apply counterparts, just parameterized on a typed number instead of `dx`/`dy`.

**What "raw" means is per-transform-family, not one uniform convention — this is the one subtlety to hold onto:**
- **Move (all three gizmos):** always a **delta from drag-start** along the axis (scene units) — matches what the live readout already showed (`X Δ2.3cm`). The popup's `kind:'dist'` converts this to/from the current export-scale real-world unit (`SCALE_STEPS[exportScaleIdx]`) for display/entry, but the underlying `raw` stored and reapplied is always scene units.
- **Rotate, card gizmo, world mode (no LCL/AXS toggle):** `raw` is the **absolute** new Euler angle in degrees — the live code already computed `rawAngle = oEuler[ax] + proj` and displayed that absolute value, so typing a number here really does mean "set this axis to exactly this many degrees."
- **Rotate, card gizmo, local mode (LCL/AXS on):** `raw` is a **delta** — the amount to premultiply onto the drag-start quaternion around the surface's local axis. Local rotation has no single stable "absolute Euler value" the way world rotation does (that's why the live readout showed a delta here too), so the popup's semantics necessarily follow suit: typing "10°" adds a 10° rotation from wherever the surface was before this drag, not "rotate to 10° absolute."
- **Rotate, selection gizmo and primitive gizmo:** both orbit around a fixed world axis with no local/world toggle, so `raw` is the (already flip/snap-adjusted) angle actually used to build the quaternion that frame — behaves like "absolute" in the sense that it's the one true number driving the transform, but note it's computed fresh from the drag-start snapshot each reapply, not read back off the live mesh.
- **Scale, card gizmo and primitive gizmo (per-axis and uniform):** `raw` is the **absolute** final scale factor (`surfScaleAxes[ax]`/`surfScale` for card; `mesh.scale` components for primitive) — straightforward overwrite.
- **Scale, selection gizmo (per-axis and uniform):** `raw` is a **multiplier relative to each selected stroke's own starting scale** (`proj`/`sc` in the original code, e.g. `mesh.scale.x = oScale[si].x * proj`), because a multi-select can contain strokes with different starting scales — there is no single shared "absolute" scale number to overwrite to. Typing "1.5" means "150% of whatever each selected stroke's scale was at drag-start," same as dragging to that point would have meant.

**Shared popup module** (`window._pipOpen`/`window._pipClose`, plain IIFE right after `formatSize()`, ~line 2038 — before any gizmo code, since gizmo drag-end handlers call into it): `_pipOpen(label, raw, kind, applyFn)` formats `raw` for display per `kind` (`'dist'`→current real-world unit or `u` if no export scale set; `'deg'`→`°`; `'scale'`→`×`), shows `#precise-pop`, and focuses/selects the input. Position is computed fresh on every open — `document.getElementById('prim-bar').classList.contains('open')` decides whether to anchor under `#prim-bar` or `#topbar`, so no per-gizmo positioning logic was needed; the same rule serves all three gizmos uniformly, matching how "primitives on" was specified as a single global toolbar-visibility check rather than "is the target a primitive." A single capture-phase `pointerdown` listener on `document` closes the popup whenever the pointerdown target isn't inside `#precise-pop` itself — this is what makes "any other interaction cancels it" work for free everywhere (starting a new gizmo drag, tapping a toolbar button, opening another popover) without needing to hook every possible dismiss-trigger individually.

**Drag-start reset, one per real drag-start call site.** `_cgLastPrec`/`_sgLastPrec`/`_pgLastPrec` are set to `null` at every point a fresh `drag`/`pbDrag`/`sgDrag`/`pgDrag` object is created — for the card gizmo this is 4 separate object literals (gc mousedown/touchstart, pb-gc mousedown/touchstart, since pb-gc's drag object is a second, independent `pbDrag` var rather than sharing the primary `drag` var — see the existing "pb-gc delegates through the same `applyDrag` but keeps its own persistent drag state" pattern, unchanged this session); for selection and primitive gizmos there's only one real entry point each (`sgStartDrag`/`pgStartDrag`), since both the native canvas listeners and the gc-delegated path already funneled through those single functions before this session.

Syntax-verified (`new Function()` across every `<script>` block) — **not yet tested on-device.** `sw.js` cache key bumped `sketch3d-v51`→`sketch3d-v52`. No save-format changes (schema stays at 4.5) — this feature touches only in-memory drag state and the transform values it writes, nothing persisted differently.

---

### Session 71: Hidden-UI Control Card Defaults to Collapsed

**The problem:** hiding the UI (`#bhide`) was meant to clear the canvas for a distraction-free view, but on narrow and tablet layouts it actually popped the full `#pb-float-card` ("CONTROL" card — nav/gizmo panels, including the `⊕LCL`/`⊙45°` pill pair `#pb-glocal`/`#pb-gsnap`) up automatically, since `updateLayoutMode()` and the `#bhide` click handler both unconditionally added `fc-visible` whenever `ui-hidden` was active (gated only by the pre-existing `_cardHidden` flag, which defaults to `false`/"shown"). Wide/tablet mode's `#lcl-float-group` (the tap/hold LCL button from session 69) already worked in this state via `positionLclFloat()`'s existing `ui-hidden` branch, anchoring above `#sc-hidden-toggle` — but narrow mode never got that button at all (`body.narrow-mode #lcl-float-group{display:none!important}` was unconditional), so narrow-mode `ui-hidden` had no lightweight LCL access — only the full card.

**Fix — a new session-scoped flag, kept separate from the pre-existing one:**

`window._uiHideCardOpened` (declared alongside `_cardHidden`/`_cardDetached`, defaults `false`) answers a narrower question than `_cardHidden` does: *"has the user explicitly re-opened the control card during the current `ui-hidden` session?"* It's force-reset to `false` every single time `ui-hidden` is switched **on** (in the `#bhide` handler), independent of whatever `_cardHidden` happens to be. The three places that used to gate `fc-visible` on `!_cardHidden` alone — `#bhide`'s "turning on" branch, and both branches (narrow, tablet) of `updateLayoutMode()` — now check `_uiHideCardOpened` instead, **but only while `ui-hidden` is active**; outside of `ui-hidden`, narrow mode's own normal default is untouched and still driven purely by `_cardHidden`, exactly as before. `pb-fab`'s tap/touchend handlers and the `fc-close` handler now set both flags together (`_cardHidden=false;_uiHideCardOpened=true` on open; the reverse on close), so a manual open/close during a hidden-UI session behaves consistently, and un-hiding the UI afterward falls back to each mode's own separate default — tablet returns to the sidecol layout unconditionally, narrow mode restores per `_cardHidden` (a small explicit restore branch was added to `#bhide`'s "turning off" path for this, since previously narrow mode relied on the always-on-by-default assumption that no longer holds).

**LCL access without the full card:** `positionLclFloat()`'s narrow-mode early-return was narrowed from "always hide in narrow mode" to "hide in narrow mode only when *not* `ui-hidden`" (`if(isNarrow&&!isUiHidden){...hide...}`), and the matching CSS guard became `body.narrow-mode:not(.ui-hidden) #lcl-float-group{display:none!important}`. This makes narrow mode fall through to the exact same "anchor above `#sc-hidden-toggle`" code path tablet mode already used — no new positioning logic needed, just a widened condition.

**Stacking order in the bottom-left corner when `ui-hidden`** (both narrow and tablet): `#sc-hidden-toggle` (≡, `bottom:10px`) → `#lcl-float-group` (`bottom:52px`, pre-existing) → `#pb-fab` (`bottom:102px`, **new** — previously had no `ui-hidden`-specific position at all, just a JS-set draggable default of `left:8px;top:52px` used for its normal narrow-mode placement). `102px` (not `94px`, `#sc-fab`'s value) keeps a 10px gap above the LCL button, matching the 10px gap between the hamburger and the LCL button — `#sc-fab` itself is untouched. The rule needs `!important` since it must override the JS-set inline `left`/`top`.

**Net effect:** `ui-hidden` now genuinely clears the canvas on first toggle, in both layouts — leaving only the hamburger, the LCL tap/hold button, and a small fab to bring the control card back if needed. See `gotchas.md` Critical Rule #36 for why the two flags (`_cardHidden` vs `_uiHideCardOpened`) must stay separate rather than being merged into one.

**Follow-up, same session — `#pb-fab` as a genuine open/close toggle:** the design above still required opening `#pb-float-card` via the fab but closing it via `fc-close` on the card itself, since the fab was only ever visible while the card was closed (`.fab-visible` class, unconditional). Sebas asked for the fab to stay visible the whole time in `ui-hidden` and act as a single toggle. Fixed two ways: (1) `body.ui-hidden #pb-fab{display:flex!important;...}` now overrides `.fab-visible` entirely while `ui-hidden` is active, so the fab never disappears regardless of card state; (2) the fab's `click`/`touchend` handlers were rewritten from an unconditional "open" action into `_pbFabToggle()`, which checks `card.classList.contains('fc-visible')` and either opens (setting `_cardHidden=false;_uiHideCardOpened=true`) or closes (setting `_cardHidden=true;_uiHideCardOpened=false`, same as `fc-close`) accordingly. `fc-close` itself is unchanged and still works as an alternate way to minimize. Outside `ui-hidden` (normal narrow mode), the fab is still only ever visible while the card is closed via the untouched base `.fab-visible` rule, so the "close" branch of `_pbFabToggle()` is simply never reached there — normal narrow-mode behavior is unaffected.

**Third follow-up, same session — touch/click double-fire on the toggle:** `#pb-fab` has always had both a `touchend` and a `click` listener, since it needs to work identically for touch and mouse/trackpad. Mobile browsers fire both a real `touchend` and a trailing synthetic `click` for one physical tap; this was harmless while both listeners called the same idempotent "always open" action, but became a visible bug the instant the action became `_pbFabToggle()` — `touchend` opened the card, the synthetic `click` immediately closed it again, so tapping appeared to do nothing. Fixed by calling `e.preventDefault()` inside the `touchend` handler on a confirmed (non-drag) tap, which suppresses the browser's synthetic click. See `gotchas.md` Critical Rule #36's second follow-up note for the general lesson.

Syntax-verified only (Node `new Function()`) — **not yet tested on-device.** `sw.js` cache key bumped `sketch3d-v48` → `sketch3d-v49` at session start, then → `sketch3d-v50` and → `sketch3d-v51` across two more within-session follow-ups (see gotchas.md Critical Rule #37 — bump on every edit, not just once per session).

Four independent features landed this session, all confirmed with Sebas via a proposal round before implementation.

**1. Layers: 3 sketch layers → 7, merge target moved 3 → 7.** The layer system (`activeLayer`/`layerVisible`) was previously hardcoded to exactly 4 slots (3 user layers + 1 merge target) — static HTML rows (`tb-lrow0..4`), a `[0,1,2,3].forEach` wiring loop, and a 4-entry `dotColors` array. Sebas chose the "more fixed slots" option over a fully dynamic add/rename-layer UI, so this stayed a hardcoded-but-larger set rather than a new UI paradigm: 4 new rows (`tb-lrow3..6`, labeled "Sketch 2"–"Sketch 5") were inserted before the Merged row, which moved from `id="tb-lrow3"` to `id="tb-lrow7"`. A new module-scope constant `MERGE_LAYER=7` replaces every previously-hardcoded `3` used to identify the merge target (in `mergeLayer()`, undo/redo handlers, `showMergeLayerRow()`, `loadData()`) — this was the main risk in the change, since the merge-target index was scattered across ~8 call sites rather than centralized. `layerVisible` grew to 8 `true` entries; `dotColors` (used for the narrow-mode `pb-layer-dot`) grew to match.

**Ref-row ID collision, caught before it shipped:** the pre-existing primitives/Ref-layer visibility row shared the same popover and had used `id="tb-lrow4"`/`id="tb-leye4"` — which would have silently collided with the new numeric layer-4 row ("Sketch 3"). Renamed to `tb-lrow-ref`/`tb-leye-ref` (both the two JS call sites and the HTML). The Ref row was never part of the numeric layer-index space to begin with (it drives `_refLayerVisible`, not `stroke.layer`), so this is a pure ID-collision fix with no behavior change to primitives themselves.

**2. Primitive count cap removed.** `PRIM_MAX` (previously 20, hard-blocking with a toast+return in `addPrimitive()`, `duplicatePrimitive()`, `_createLoftSolid()`, and the `_deserializePrimitives()` load loop) was deleted outright. Rationale: primitive geometries (box/sphere/cylinder/cone, all low-segment-count) are cheap relative to strokes (tube geometry scales with stroke length and point count, uncapped already), so the count cap was protecting against combinatorial UI/transform overhead, not per-object weight. Replaced with `_primCheckWarn()` — a single non-blocking toast fired the moment `primitives.length` hits 100, suggesting a merge; nothing is ever blocked. The primitive-count UI badge (`#prim-obj-count`) now just shows a plain number instead of `"N/20"`.

**3. Primitive merge (multi-select, confirm-gated, no undo).** New "⊕" toggle button in the Ref-objects popover header enters merge mode: each `.prim-row` grows a `.prim-check` indicator (hidden outside merge mode via `#prim-stack.merge-mode .prim-check{display:flex}`), and row-click behavior branches on a closure-local `_primMergeMode` flag — normally a click calls `selectPrimitive()`, but in merge mode it instead toggles that primitive into a selection set (`entry._mergeSel`) and updates a live "N selected" counter in a merge bar (`#prim-merge-bar`) with Merge/Cancel buttons. The Merge button is disabled below 2 selections. Confirming pops a native `confirm()` dialog ("cannot be undone") — **explicitly no undo entry is pushed** for this operation, unlike every other primitive mutation (add/delete/transform all have undo support); this was a deliberate scope decision, not an oversight, and keeps `mergePrimitives()` simpler than `mergeLayer()`'s stroke equivalent (which does carry undo/redo).

`mergePrimitives(sel)` mirrors the existing stroke `mergeLayer()` pattern: each selected primitive's child meshes are geometry-cloned, baked to world space via `applyMatrix4(p.mesh.matrix)`, and combined into one `THREE.Group`. Because the inputs can be any mix of primitive types (a box, a loft solid, another merged group, etc.), the result can't be reconstructed procedurally the way `loft`'s `profilePts` are — so a new primitive `type:'merged'` stores each baked submesh's raw `positions`/`normals`/`indices` arrays plus its `color`/`opacity` directly in a `parts[]` field (see `schema.md`). `_deserializePrimitives()`, `_serializePrimitives()`, and `duplicatePrimitive()` all gained a `type==='merged'` branch to round-trip this correctly. Merged primitives render as plain meshes with no edge/outline geometry, matching the existing stroke-merge visual precedent (`mergeLayer()` doesn't add edges either).

**4. Page + view naming, with tap-to-rename and reorder (views got parity with pages).** Pages already had a long-press-to-edit-mode → tap-to-select → reorder-arrows flow (`_pgEditMode`/`_pgEditIdx`/`movePage()`); views had an independent but structurally identical implementation (`_vwEditMode`/`_vwEditIdx`/`moveView()`) — the two were never shared code, and this session kept that duplication pattern rather than introducing a shared abstraction, consistent with how the rest of the pages/views system is written.

Both objects gained an optional `name` field, displayed as a small overlay label (`.thumb-name`) across the top of the thumbnail, always visible (not just in edit mode) — default text is a zero-padded index (`_padNum3(i+1)` → "001", "002"...) shown whenever `name` is unset, so unrenamed items still look intentional. When a thumb is already selected in edit mode (arrows showing), tapping the name label swaps it for an inline `<input>` (`.thumb-name-input`) that commits on blur or Enter and reverts to the numbered default if cleared. The input stops propagation on `click`/`touchstart`/`mousedown` so the strip's long-press-to-toggle-edit-mode listener (which walks up from `e.target` checking for `.pg-thumb`/`.vw-thumb`) doesn't misfire and exit edit mode if the person long-presses the input itself (e.g. to select text on mobile).

**Persistence asymmetry, worth knowing:** `renameView()` mutates `views[idx].name` directly on the array element already referenced by `pages[curPage].views` — no extra plumbing needed, since nothing else rebuilds a view object wholesale on a normal save. Pages are different: `saveCurPage()` and `sceneData()` both **replace** `pages[curPage]` with a brand-new object literal every time (because strokes/thumb are live and must refresh), so `pg.name` has to be explicitly read from the outgoing object and threaded into the new one at both call sites, or a rename would silently vanish the next time the page was saved. This was the one non-obvious bug risk in an otherwise mechanical feature.

**Follow-up refinement, same session:** two rounds of feedback on the thumbnail UI itself. First, reorder arrows needed to sit fully outside the thumbnail (left/right) instead of half-overlapping it, with room for that added specifically around the selected item so neighboring thumbnails aren't touched. Second, the name label needed to move from an overlay-on-top-of-the-image to a line below it, for both pages and views, with the strip made taller to fit.

**Fix — split each thumbnail into an outer wrapper + inner image box.** `.pg-thumb`/`.vw-thumb` (the strip's flex children) changed from a fixed-size, `overflow:hidden` box into a `flex-direction:column`, `overflow:visible` wrapper — a plain size/overflow swap wouldn't work on its own, because the arrows and the delete badge both rely on `position:absolute` against *some* ancestor, and letting that ancestor's overflow go visible while it also hosts the clipped thumbnail image would either un-clip the image or re-clip the arrows depending on which element gets the property. So the previously-single `.pg-thumb` box was split in two: a new inner `.pg-thumb-img`/`.vw-thumb-img` div (fixed 60×42, `overflow:hidden`, holds the `<img>`/`<canvas>`, the page/view number badge, and the delete button — all the things that should still clip to the image's rounded corners) sits inside the now-`overflow:visible` outer wrapper, which also holds the `.thumb-name` label as a second flex child *below* the image box, and the reorder arrows as direct children positioned absolute against the wrapper (so they can extend past the image's left/right edges without being clipped).

**Extra space around the selected thumb, not the whole strip.** Rather than permanently widening the gap between every thumbnail (which would waste space when nothing is selected), `.pg-thumb.editing`/`.vw-thumb.editing` — the class already applied exactly when a thumb is the one currently selected for reorder in edit mode — gained `margin:0 28px`, animated via the existing `transition:margin .15s ease`. This pushes just that item's neighbors aside on demand. The arrows themselves sit at `left:-24px`/`right:-24px` (was `-12px`), landing inside that new margin with a few pixels of clearance on both sides rather than colliding with the adjacent thumbnail.

**Strip height and everything tuned to the old 64px height.** `#pages`/`#views` grew from `height:64px` to `height:84px` to fit image (42px) + gap + the name line below. Every other bit of layout that had been hand-tuned against the old 64px figure needed a matching bump: the views-strip-stacks-above-pages-strip offset (`#pages.open~#views.open{transform:translateY(...)}`, `-66px`→`-86px`), and the whole family of `body.{pages,views}-open[...] #sbar/#sidecol/#lcl-float-group/#sc-fab/#sc-hidden-bar{bottom:...}` rules that reposition other floating UI above the strip(s) when open (each bumped by the same +20px single-strip / +40px both-strips delta the height change introduced). These are exactly the kind of hand-tuned pixel constant that's easy to miss when only touching the strip CSS directly — see `gotchas.md` for a note to grep for the old height value whenever this strip's size changes again.

---

## Input System

### Three Input Pipelines
1. **Pointer Events** — primary for mouse and stylus (`pointerType='pen'`)
2. **Touch Events** — multi-finger gestures
3. **Keyboard** — shortcuts

### Stylus Mode (`stylusOnly`)
- Pen tip → draw/erase
- 1 finger → orbit OR pan (respects `twoFingerMode` swap)
- 2 fingers → opposite of 1F + pinch-zoom
- Barrel/side button → toggle draw↔erase

---

## Rendering Pipeline

### Render Order
- Regular strokes: renderOrder 3
- `_frostedMesh`: renderOrder 5
- `_frostedGridMesh`: renderOrder 6
- Surface border lines: renderOrder 8
- Frosted geometry: 40×40 subdivisions

### `_syncRenderer()` / `markDirty()`
Never call `renderer.setSize()` directly. Always `_syncRenderer()` with RAF debounce.

### Flat/Wide Marker Brush (v55 update)

`buildTube`'s `flat` branch builds a ribbon cross-section per curve sample: width `w` (velocity-tapered, up to `baseR*4`) and height `h`. As of v55, `h` is a fixed `.004` epsilon (previously `baseR*.5`, which scaled with brush size and created a real box extending above/below the surface — the cause of the brush appearing to "stand up" off the surface at oblique angles).

The width axis (`side`) has exactly one mode: `side = tang × up` — perpendicular to the direction of travel, lying in the local surface tangent plane (extends left/right of the drawn line). A tangent-aligned alternative (`side = tang`, wide side running along the direction of travel) was tried mid-session as a toggle, briefly made the default, found to be broken on curves, and removed entirely — `buildTube` has no `tan` parameter and there is no orientation toggle in the UI. See `gotchas.md` if this is revisited.

The `up` (local surface normal) is sampled per point via a raycast against `surfMesh`, so the single remaining mode works correctly on curved surfaces (cylinder/sphere/cone) as well as flat planes.

---

## Service Worker & PWA

- `sw.js`: cache-first strategy, **generated from scratch in v59** — the file had never actually been part of any session's uploads (not "forgotten," genuinely absent), so the long-tracked "bump the cache key" TODO turned out to mean "the file doesn't exist yet." `install` precaches `index.html`, `manifest.json`, and all 8 icon sizes (each `cache.add()` wrapped individually so one missing icon can't fail the whole precache); `activate` deletes any cache key that isn't current; `fetch` is cache-first with background network refresh, and only intercepts same-origin GET requests so the Google Fonts CDN call passes through untouched.
- Cache key: **`spetchbook-v85`** (renamed prefix from `sketch3d-` this session, alongside the app rename — bump on *every* `index.html`-changing edit, not once per session; see `gotchas.md` Critical Rule #37). **Still not yet verified against a real GitHub Pages deploy.**
- `manifest.json`: standalone display, warm parchment theme, 8 icon sizes, `name`/`short_name` now **"Spetchbook"** (was "Sketch3D," changed session 85)

### App Rename — Sketch3D → Spetchbook (v85)

The user-facing name changed; the underlying identifiers did not, and should not, on the theory that renaming a running app's internal names/storage keys is a much higher-risk operation than renaming its display strings, and nothing required it. Two categories:

**Changed (display-only, no functional effect):**
- `manifest.json` → `name`/`short_name`
- `index.html` → `<title>`, `apple-mobile-web-app-title` meta tag
- `index.html` → default filenames offered in save/export UI (input placeholders, `a.download` targets) for JSON/PNG/SVG/GLB/OBJ/USDA/USDZ
- `index.html` → strings embedded *inside* exported file content: GLB `asset.generator`, OBJ header comment, USDA `defaultPrim`/`Xform` name
- `sw.js` → top-of-file comment, and the cache-key prefix (`sketch3d-v84` → `spetchbook-v85`) — the prefix change is cosmetic (cache keys are opaque strings to the Cache API), the version bump is the part that actually matters and would have been required regardless of the rename
- `icons/*.png` → new artwork (see below)

**Deliberately NOT changed — flagged, not fixed:**
- `indexedDB.open('sketch3d', 1)` (~line 6862, autosave database) — renaming this is **not a display change**, it's a storage-location change. IndexedDB has no rename operation; opening a database under a new name creates a second, empty database, and the app would read/write there instead of the existing one — from the user's perspective this looks exactly like silent data loss, even though the old data still physically exists, just unreferenced. Fixing this properly means a **migration**, not a find-and-replace: open the old DB, copy the `autosave` object store into a newly-opened DB under the new name, then decide whether to leave the old DB alone (harmless, orphaned) or delete it once the copy is confirmed. **Deferred at Sebas's explicit request** — see `handoff.md` Session 85 and TODO list. This is the single most important thing for a future session to know before touching anything storage-related: a `sketch3d` string in a storage key is not leftover cruft, it's live production data's address.

**Icon artwork (v85):** the previous placeholder/generated icon set was replaced twice this session, ending on user-supplied artwork — a hand-drawn mark (two dark "half fountain-pen" shapes plus a blue "ink" swirl/flourish, on the app's existing paper-tan background) supplied as a single non-square source image. Processing pipeline (not part of the app itself, a one-off asset step): detect background color from a corner sample → find the bounding box of non-background content → crop tight with a small uniform pixel margin on all four sides → paste onto a square canvas of the same background color, centered → downsample with ImageMagick to all 8 manifest sizes (72/96/128/144/152/192/384/512). **Why the tight-crop step matters:** the very first pass just padded the original (non-square) canvas out to square without tightening the crop first, which preserved a lot of dead background space around a tall/narrow mark — fine at 512px, but at 72–96px (actual home-screen size) the mark shrank to an unreadable smudge. Any future icon replacement should crop to content first, *then* square up, not the other way around — see `gotchas.md` Critical Rule #83 for the full pattern (bundled with the IndexedDB gotcha above under the same "renaming/rebranding" rule since both bit the same session).

### Autosave / Restore Flow (v54, extended v86)

```
Draw/edit → markDirty() → _sceneDirtyForSave=true
                          ↓
  every 30s: if(_sceneDirtyForSave) → write sceneData() to IDB + localStorage
                          ↓
  on visibilitychange/pagehide/beforeunload: _flushSave() writes
  sceneData() UNCONDITIONALLY (ignores dirty flag) — this is what
  guarantees state is captured when the OS kills a backgrounded PWA

  on webglcontextlost (v86): same _flushSave() (via window._flushAutosave),
  since a GPU-driver context loss leaves the JS process alive but the canvas
  dead — none of the above events fire for this case
                          ↓
  on webglcontextrestored (v86): location.reload() — full reload rather than
  hand-restoring geometries/textures (three.js doesn't auto-reupload them),
  guarded by a 15s sessionStorage timestamp so a thrashing GPU can't loop-reload

  ── app relaunch (including the v86 context-loss reload) ──
  idbLoad(cb) → cb(saved) → parse JSON →
    hasContent check (data.strokes || data.primitives || any page
    in data.pages has strokes/primitives) → loadAllPages(data)

  fallback: if IDB doesn't open within 2s, read localStorage['sk3d_auto']
  with the SAME hasContent check
```

**Critical (session 54, still applies):** the `hasContent` check on relaunch must inspect `data.pages` and `data.primitives`, not just `data.strokes`. Both the IDB-ready path and the localStorage-fallback path must use the same check. See `gotchas.md` for the full writeup.

**Critical (session 86, new):** three.js's own internal `webglcontextlost` listener (registered at renderer creation) already calls `preventDefault()`, which is what signals the browser to attempt automatic restoration — the app's own listener must NOT call `preventDefault()` again. See `gotchas.md` Rule #84 for why reload-on-restore was chosen over selective resource re-upload.

### Persisted Preferences — `sk3d_prefs` (v78)

A third localStorage key, distinct from `sk3d_auto` (scene autosave, above) and `sk3d_sc` (sidecol scale/detach state — see "Sidecol Zoom & Position"). Holds a flat object: `{stylusOnly, twoFingerMode, invertOrbitX, uiTheme}`. `_savePrefs()` is called from each of the four toggles' own click handlers (not on a timer, unlike autosave); `_loadPrefs()` runs once at init, immediately before the existing label-sync line, so `updateGestLabel()`/`updateInvOrbLabel()`/`updateStylusLabel()`/`_syncThemeBtns()` all reflect restored state on first paint. Any future toggle that should persist the same way is added to both functions' object literals.


## Ultra-Wide Mode (v94) — third layout mode, landscape at 19.4:9 or wider

A third layout mode alongside narrow (tall phone) and wide (tablet/desktop), for phones held in landscape on tall-aspect panels. It is not a variant of wide mode; it has its own cards and its own interface, the way narrow and wide each do.

**Trigger.** `_isUwMode()` — `visualViewport`-based, landscape *and* aspect ratio **at or beyond `19.4/9`** (2.156), with a `-0.001` epsilon so a panel measuring exactly the threshold *does* qualify. **This changed in session 100**: v94–v99 used `18/9` with the comparison strictly greater and the epsilon *added*, to keep the very common exactly-18:9 spec out. 19.4:9 was specified as a minimum rather than an exclusive bound, so both the number and the epsilon's sign moved together — see the superseded-in-100 note under `gotchas.md` Critical Rule #94's second half, which explains why the sign is derived rather than arbitrary. Qualifying: 19.5:9, 20:9, 21:9. Not qualifying: 18:9, 18.5:9, 19:9. Resolved in `updateLayoutMode()` *before* either the narrow or wide branch runs, and switched off unconditionally whenever narrow wins — a rotation going straight from ultra-wide to narrow never enters the wide branch, so an exit call placed only there would strand `body.uw-mode` on.

**Structure** (outermost-to-innermost from the docked screen edge):

```
#sidecol-uw  position:fixed, inset by --uw-margin, flex row (row-reverse under body.rside)
  ├─ #uw-tools    TOOLS as a full-height COLUMN, closest to the screen edge
  │    ├─ #uw-tools-body   2-buttons-per-row grid: Color / Size / Opacity /
  │    │                   pen+select+brush / undo-redo as the last row
  │    └─ #uw-tools-tab    hide tab on the column's INNER edge
  ├─ #sg-bottom   CONTROL — the REAL node, reparented in from #sidecol
  └─ #uw-side     toggle stack (top) + LCL (pinned to screen bottom)
```

**TOOLS is deliberately not an `.sc-group` card.** No grab bar, no title, no detach, no scale dot — it is tall mode's bottom tool row rotated 90°, with the hide tab moved from the top edge to the inner edge (right normally, left under `body.rside`, via `order:-1`). It keeps a panel background and border because the column floats with a margin rather than being flush to the edge.

**CONTROL is reparented, TOOLS is duplicated.** `#sg-bottom` owns `#gc`, `#navcube`, the joystick and the FPS-move canvases, each with pointer/raycast logic keyed to those exact element IDs; a third copy (the sidecol original and the `#pb-*` narrow copy already exist) would mean re-wiring a whole parallel canvas stack. `_applyUwMode()` moves the node itself between `#sidecol` and `#sidecol-uw`. `#uw-tools` is a fresh duplicate, which is safe because every control in it is a plain button or swatch reaching the same handler through the delegate patterns already used by `#pb-*` and `#scx-*` — `.cw[data-c]`, `.bprev-btn[data-sz]` and `[data-op]` are served by existing global `querySelectorAll` listeners and need no wiring at all. Size/opacity presets use **text numerals** rather than the preview canvases used in the other two modes: a third set of preview canvases would need its own IDs and redraw pass, and at 26px the numeral reads better than the swatch.

**CONTROL's zoom is owned by `_uwFitControl()`, not `applySidecol()`.** `applySidecol()` carries an explicit uw-mode exception for `#sg-bottom` — see `gotchas.md` Critical Rule #94. The fit is a single measured division, never an iterative shrink loop, and takes its measurement with `align-self`/`height` cleared (measuring a stretched flex item returns the container's own height and yields a constant scale of 1). Floor is `UW_ZOOM_MIN = 0.5`, matching `SC_MIN`.

**Toggle stack**, top to bottom, with LCL pushed to the bottom of the screen by `margin-top:auto`:

| Button | Effect |
|---|---|
| `#uw-tb-toggle` | `body.uw-topbar-hidden` — hides `#topbar` |
| `#uw-prim-toggle` | delegates to `#bprims` (opens/closes `#prim-bar`) |
| `#uw-ctrl-toggle` | `body.uw-ctrl-hidden` — hides `#sg-bottom` |
| `#uw-hide-toggle` | delegates to `#bhide` (hidden-UI) |
| `#uw-lcl` | delegates to `#lcl-float` |

Hiding CONTROL needs no repositioning code: the flex row simply closes up, so the toggle stack and LCL slide next to TOOLS on their own (a `gap` only applies between items that exist).

**Top/bottom chrome re-centring.** `#topbar`, `#prim-bar` and `#sbar` are normally centred on the full viewport; in this mode they must centre on the *free canvas area* beside the columns. `_uwSyncInsets()` writes `--uw-cl` / `--uw-cr` (the left/right insets of that area, mirrored under `body.rside`), and CSS re-centres on them arithmetically. **These three keep their base `transform:translateX(-50%)`** — the centre point moves, the transform does not. Clearing the transform while leaving `left:50%` in place is what pushed them off-screen in earlier attempts at this mode. `#sbar` additionally gains `overflow-x:auto` here; without it, content wider than the clamped box spills visibly past the box edge even though the box itself is correctly on-screen.

`#prim-bar` sits at its normal `top:56px` (under the topbar) and moves up to `top:var(--uw-margin)` when the topbar is hidden. It stays a **row**, not a column: a column of ~15 ref-object buttons would be roughly 400px tall, taller than the entire viewport in this mode, so despite vertical space being the scarce dimension here a row is the only shape that fits.

**Spacing.** One value, `--uw-margin: 8px`, for every gap in the mode — screen-edge↔column, column↔column, and matched to `#topbar`'s own `top:8px`. Scoped to this block only; `#sidecol-uw` is hard-gated to `body.uw-mode` (`body:not(.uw-mode) #sidecol-uw{display:none!important}`), so it can never disturb `#sidecol`'s own `--SP`/`--SR`.

**Hidden-UI behaves like wide mode.** `body.uw-mode.ui-hidden` hides `#sidecol-uw` entirely, exactly as wide mode hides `#sidecol`. `#bhide` (top-right, z-300) and `#sc-hidden-toggle` / `#sc-hidden-bar` remain the way back, unchanged. `#lcl-float-group` and `#bprims` are suppressed only while the UI is *visible* (they have homes in `#uw-side` then) and revert to their normal roles under `ui-hidden`.

**Interaction with detach.** Ultra-wide mode and the free-floating detached-card feature do not coexist; entering the mode force-redocks via `redockAll()`.


## Ultra-Wide Mode, revised (v95)

Session 95 reworked four things in the mode introduced in v94. The v94 section above still describes the trigger, the reparent-vs-duplicate split, and the CONTROL fit correctly; the points below supersede what it says about the top/bottom chrome and the toggle stack.

**#topbar and #prim-bar are now COLUMNS, and are reparented into the row.** Both are moved into `#sidecol-uw` by `_uwAdopt()` and sit between CONTROL and the toggle stack — each panel immediately before the icon that toggles it. Their `position:fixed` is fully neutralised (`position:static`, all four offsets `auto`, `transform:none`); nothing in this mode computes a left or top for them, so the whole class of "chrome drifted off-screen" bug is designed out rather than guarded against. The `--uw-cl` / `--uw-cr` insets and `_uwSyncInsets()` from v94 are gone.

`_uwAdopt()` records the element's original parent and next sibling on the element itself (`el._uwHome`) the first time it moves; `_uwRelease()` restores from that record, so the exit path is correct regardless of what else has been reparented in between. **Do not replace this with a hardcoded "append back to body"** — `#topbar` and `#prim-bar` have specific neighbours in the source order and several `position:fixed` siblings around them.

`flex-wrap:wrap` on these two is load-bearing, not a fallback: `#topbar` carries roughly 21 controls, which as a single column is far taller than an ultra-wide viewport. A wrapping flex column with a **definite height** turns overflow into additional columns rather than a scrollbar. The definite height comes from `#sidecol-uw`'s `align-items:stretch` — **without stretch, `flex-wrap` in a column direction silently does nothing at all**, which is the failure mode to check first if these ever render as one clipped column. `align-content:flex-start` keeps the wrapped columns packed rather than spread.

Two things flip with the direction and need explicit overrides: `.tsep` / `.prim-tb-sep` (1px-wide vertical rules become 1px-tall horizontal ones), and the three dropdown-arrow buttons (`#bruler-arrow`, `#bsym-arrow`, `#bview-arrow`), whose `margin-left:-5px` hugs their parent in a row but drags them sideways in a column.

**`#sbar` (the status pill) is dropped entirely in this mode.** Vertical space is the scarce dimension here and the mode label is already carried by the tool buttons' own on-state.

**Toggle stack, revised.** Hidden-UI is removed from the stack — `#bhide` is already fixed top-right at `z-index:300` and visible in every mode, so a duplicate in the column bought nothing. Its slot is taken by a **side switch**:

| Button | Icon | Effect |
|---|---|---|
| `#uw-tb-toggle` | `⌃` / `⌄` | `body.uw-topbar-hidden` |
| `#uw-prim-toggle` | hamburger | delegates to `#bprims` |
| `#uw-ctrl-toggle` | `⬡` | `body.uw-ctrl-hidden` |
| `#uw-side-switch` | `◧` / `◨` | delegates to `#sb-sideswitch` |
| `#uw-lcl` | `LCL` | delegates to `#lcl-float` |

The control toggle now wears the same hex mark as `#pb-fab` and `#sc-fab`, so "show/hide the control card" reads identically in all three modes. The `◧`/`◨` pair it previously wore moved to the side switch, where the two glyphs carry real information — the filled half shows the side the columns are currently docked on. The switch delegates to `#sb-sideswitch` rather than writing `_scState.rside` directly, so that state stays owned by one handler and stays persisted, even though `#sbar` itself is hidden here. Left is the default side, unchanged from the app-wide default.


## Ultra-Wide Mode, revised again (v96)

Session 96 supersedes v95 on two structural points and adds three smaller ones.

**Every column is zoom-fitted; nothing crops and nothing scrolls.** v95's `flex-wrap`-into-extra-columns approach for `#topbar` / `#prim-bar` is gone, and `#uw-tools-body`'s `overflow-y:auto` is gone with it. `_uwFitEl(el, floor)` — the generalised form of v94's `_uwFitControl()` — is now applied to all four columns (`#uw-tools`, `#sg-bottom`, `#topbar`, `#prim-bar`) by `_uwFitAll()`. Same single measured division as before, same clear-stretch-measure-restore-stretch sequence (see Critical Rule #94), two floors: `UW_ZOOM_MIN = 0.5` for CONTROL, whose gizmo carries text labels, and `UW_CHROME_ZOOM_MIN = 0.4` for the two icon-only chrome columns. `window._uwFitControl` is kept as a distinct entry point because `applySidecol()`'s uw exception calls it specifically.

**`#topbar`'s three pill buttons swap text for icons in this mode.** `#blayers`, `#pgbtn` and `#vwbtn` each carry both a `.tb-txt` span and a `.tb-ico` SVG; `.tb-ico` is `display:none` globally and the pair swaps under `body.uw-mode #topbar`. Icons: stacked planes for layers (matching the ref-objects family), a two-leaf turning page for pages, a camera for views. `body.uw-mode #topbar .btn-pill{width:30px!important}` squares them off. This is what keeps the column narrow enough to be worth having at the fitted scale — with the text labels the column's width was set by the word "LAYERS".

**Hidden-UI is not available in ultra-wide mode.** The stack toggle was dropped in v95; v96 also hides `#bhide`, whose fixed top-right corner sits inside the drawing area here. The rule is scoped `body.uw-mode:not(.ui-hidden)` — arriving in `ui-hidden` by rotating in from another mode must still leave a way back out. The `H` keyboard shortcut is unaffected either way.

**LCL hold threshold is `LCL_HOLD_MS`, one constant for all four LCL buttons** — tuned 450 → 250 in v97. **LCL is wired, not delegated.** `#uw-lcl` carries the real tap/hold pointer handlers via `_wireLclHold()`, because `#lcl-float` has no click listener to forward to — see Critical Rule #96.

**Size/opacity presets use preview canvases again** (`sz-p{1,3,6}-uw`, `op-p{30,60,95}-uw`), matching the other two modes, added to `redrawAll()`'s list. v94's text numerals were a shortcut to avoid a third canvas set; adding the six IDs to the existing redraw pass turned out to be the whole cost.

**Topbar-hide arrow points sideways** (`‹` / `›`, mirrored under `body.rside`), since the column collapses along the horizontal axis.


## Topbar Icons, Lateral Popovers, and the Pages/Views Card (v98)

**`#blayers` / `#pgbtn` / `#vwbtn` are icon-only in every mode.** The `.tb-txt` / `.tb-ico` swap added in v96 is gone; `.tb-ico` is now unconditional and the three buttons are plain 30px squares. Their text labels were the widest things in `#topbar` in all three modes, and the icons (stacked planes, a turning page, a camera) read fine at that size. Nothing about this is ultra-wide-specific any more.

**Popover placement gained one override, not a refactor.** `window._uwPlacePop(pop, trigger)` places a popover laterally past the whole `#sidecol-uw` row, vertically centred on its trigger and clamped, mirrored under `body.rside`. It returns `true` when it handled the placement; each of the six existing placement sites gains a single guard line and keeps its own default for the other two modes. See `gotchas.md` Critical Rule #98 for the table of what those six defaults are and why they must not be unified. A `max-height` cap keeps long popovers scrolling inside their own box — written **inline from `visualViewport.height`** as of v99, not as a CSS `calc(100vh - …)` rule; see `gotchas.md` Critical Rule #99 for why those are different numbers on mobile. `offsetHeight` is re-read after the cap is applied, and the inline value is cleared on mode exit.

**`#views` becomes a card in this mode.** (`#pages` shared this treatment until session 108 replaced it with the full-screen `#flipbook`, which needs no insets in any mode.) In narrow and wide it is a full-bleed slab at `bottom:0`, which in ultra-wide puts it under the column row. Under `body.uw-mode` it takes `left:var(--uw-cl); right:var(--uw-cr); bottom:var(--uw-margin)` plus a border and radius, so they occupy only the free width between the row's inner edge and the opposite screen edge. They animate with a CSS `transform` transition, so they are positioned from custom properties rather than inline JS — this is why `_uwSyncInsets()` and `--uw-cl` / `--uw-cr` returned after v95 removed them. The closed and stacked `translateY` offsets are restated against the new bottom inset (`calc(100% + var(--uw-margin))` and `calc(-100% - var(--uw-margin))`); they cannot be inherited from the base rules, which assume `bottom:0`.

---

## Multi-Finger Tap Gestures (v100) — undo / redo without a button

Two-finger double-tap = `undo()`, three-finger double-tap = `redo()`, behind **one** flag and **one** button — `_mtTapGest`, defaulting **ON**, toggled by `#bgtap`, a `.vp-row` in `#view-pop` immediately after `#binvorb`. They were briefly two independent toggles; collapsed because they are halves of one idea and nobody wants tap-undo without tap-redo. `#view-pop` is the single home for input/gesture preferences in every layout mode (the narrow-mode cycbar deliberately has no second trigger — see the comment in `#pb-cycbar`), so no delegate copy is needed.

**Persistence.** The flag joins `stylusOnly` / `twoFingerMode` / `invertOrbitX` / `uiTheme` in the `sk3d_prefs` `localStorage` key as `tapGest`. It survives a reload; it is not part of the JSON save format. `_loadPrefs()` also reads the superseded `tapUndo` key as a fallback, so a blob written by the earliest v100 builds doesn't silently re-enable a gesture that had been switched off. `newScene()` resets it to `true` (its default, not off) and re-syncs the label, mirroring exactly what it already does for `twoFingerMode`. Static markup carries `class="vp-row on"` and reads `ON` because `true` is the JS default, and `updateTapGestLabel()` runs in the init line at the end of the file — Critical Rule #15.

**Design decision: a layer, not a branch.** The detector (`_mtStart` / `_mtMove` / `_mtEnd`) sits on top of the existing multi-touch pipeline and only *reads* its state — `_twoFingerLock`, `threeFingerPan`, `cam.active`, `cam.panActive`, `_twoFingerStartD`. It steers nothing. With both toggles off, `_mtOn()` short-circuits every entry point and navigation is unchanged; with them on — which is the default — nothing changes until the moment a tap is confirmed. This was chosen over threading tap awareness through the 2F/3F branches themselves, which would have meant re-verifying the stylus-only variants of all three (`onDown` 1F, `onDown` 2F, `onMove` 2F — the three paths Critical Rule from session 51 says must always agree).

**Design decision: snapshot-and-restore rather than a pinch dead zone.** `onMove`'s zoom branch deliberately runs while `_twoFingerLock` is `'none'`, so jitter during a two-finger tap moves the camera slightly. Gating that branch on the resolved lock would make taps neutral at the cost of the first 8px of every real pinch. Instead the camera pose (`cam.radius`, `orthoZoom`, `cam.target`) is snapshotted when the second contact lands and restored only on a confirmed tap. Pinch behaviour is untouched; the restore never executes on a drag.

**Thresholds** (module-scope, `MT_*`): tap ≤ 250 ms, pair gap < 350 ms, movement ≤ 8 px (matching the existing `_twoFingerLock` threshold), pair centroids within 60 px.

See `gotchas.md` Critical Rule #100 for the maximum-contact-count rule and the `resetGesture()` ordering trap.

---

## Unbounded Plane Drawing (v100) — plane only

For `surfType === 'plane'`, the drawable region is the surface's own infinite mathematical plane rather than the 10×10 `PlaneGeometry` quad that `surfMesh` carries, so a stroke continues past the visible border instead of stopping at it. `_planeExtHit(raycaster)` builds a `THREE.Plane` from `surfGroup`'s world quaternion and world position and intersects the ray against it.

**Scope is deliberately narrow.** Every other surface type still raycasts its real mesh and is untouched — the extension only makes sense for a surface that is conceptually infinite. The FPS-plane (`_fpsSurfMode === 1`) and prims-as-plane paths return earlier in both `s2w()` and `checkHover()` and are unaffected.

**Bounded, not truly infinite.** `_PLANE_EXT = 20` local units, checked after `worldToLocal()`. That number is the half-extent of the 40×40 frosted-tint and grid meshes `buildSurf()` already creates, chosen so that (a) the grid dots remain an honest cue for how far out drawing works, (b) no stroke can land outside the depth-tint mesh, and (c) the drawable area scales with `surfScale` exactly as those meshes do, because the cap is local. Beyond the cap `_planeExtHit()` returns `null` — the same miss the callers already handle for an off-surface tap.

**Always on, no toggle.** The extension is a strict superset of the old behaviour inside the old area (verified: every ray that hit the 10×10 quad still hits, at the same point to ~1e-14), and the cap keeps it bounded, so a toggle would be a preference with no failure mode to protect against. If one is ever wanted, the gate is the single `surfType==='plane'` check in each of the two callers.

**`s2w()` and `checkHover()` change together, always** — they are separate near-identical functions, and updating only the draw path leaves the surface-hover cue lying about where the surface is.

---

## Top-Right Button Stack (v100) — sized to the topbar, not to `.btn-sm`

`#bhide` (the eye / hide-UI), `#bviews-hidden` (saved views, only while UI is hidden) and `#bprims` (ref objects) occupy the top-right corner in narrow and wide. Through v99 they were three different boxes — 32×32 r8, 32×32 r8, and 36×32 r7 — none of which matched `#topbar`, so the eye read as a small button floating near the toolbar rather than as the row's right-hand end.

All three are now sized to **the topbar's own height**, which is not a constant anyone wrote down but a computed one: `4px padding + 30px .btn-sm + 4px padding + 2px border = 40px` in wide, and `3px padding` → `38px` in narrow. Radius is `.card`'s 10px, and `#bhide`'s `top` equals `#topbar`'s `top` (8 / 6) so the inset from the screen edge is identical.

The stack rhythm is one number, the 8px gap already used between `#topbar` and `#prim-bar`:

| | wide | narrow |
|---|---|---|
| `#topbar` / `#bhide` top | 8 | 6 |
| box | 40×40 | 38×38 |
| `#bviews-hidden` right | 56 = 8+40+8 | 54 = 8+38+8 |
| `#bprims` top | 56 = 8+40+8 | 52 = 6+38+8 |
| `#prim-bar` top | 56 | 52 |
| `#fps-plane-ctrl` top | 56 | 52 |

`#bprims` therefore lands on `#prim-bar`'s own row in both modes, which it did not before.

`#topbar`'s own `max-width` is part of the same derivation. Because the bar is centre-anchored (`left:50%` + `translateX(-50%)`) the cap is spent symmetrically, so it must subtract **twice** the clearance wanted on the right: `2 × (8 edge inset + button box + 8 gap)` = `calc(100vw - 112px)` wide, `calc(100vw - 108px)` narrow. Through v99 these were 96 and 80, which put the toolbar's right edge exactly flush with `#bhide` in wide and 6px *underneath* it in narrow once `#bhide` grew to 38. The gap the topbar now keeps from the eye equals the gap the eye keeps from the screen edge.

**The coupling is the thing to remember:** these are hard-coded pixel values derived from `#topbar`'s padding and `.btn-sm`'s size. Changing either of those changes the topbar's height and silently desynchronises six rules — `#bhide`, `#bviews-hidden`, `#bprims`, `#fps-plane-ctrl`, `#prim-bar` and `#topbar`'s own `max-width` — in both the base sheet and the narrow media query. Ultra-wide is unaffected: it hides `#bhide` and `#bprims` outright and rebuilds the topbar as a column.

---

## Session 101 — Chrome cleanup, jog-slider zoom, nav-header rebuild

Six changes, all UI-structural, none touching the drawing pipeline or the save format. Schema stays 4.5. Cache key `v100d` → `v101`.

### 1. Undo/redo removed from `#topbar`, all modes

The app carried three copies of undo/redo: `#topbar` (`#bundo`/`#bredo`), the tool row (`#sidetools` wide, `#pb-cycbar` tall, the TOOLS column in ultra-wide), and — since session 100 — two-finger and three-finger double-tap gestures. The topbar pair was removed everywhere rather than hidden per-mode, so ultra-wide's topbar column loses them too; the TOOLS column already carries undo/redo as its last row.

Their two `document.getElementById(...).addEventListener` calls were unguarded and had to be deleted in the same edit. This is the same pattern as session 73's narrow-bar button removal and is worth stating as a rule: **markup and its unguarded listener are one edit, never two.**

### 2. Topbar-hide toggle in wide and tall

Ultra-wide has had `#uw-tb-toggle` since session 94; wide and tall now get the same affordance as `#btbhide`, at the top of the right-hand button stack. It toggles `body.tb-hidden`, which hides `#topbar` via `body.tb-hidden:not(.uw-mode) #topbar{display:none!important}`.

The `:not(.uw-mode)` scope is load-bearing. Ultra-wide controls the same element through `.uw-topbar-hidden` **and** reparents the node into `#sidecol-uw`; an unscoped class would let the two toggles disagree about a single element's visibility with no way for either to detect the other.

Stack geometry and the deliberate non-flip under `.rside` are covered in `gotchas.md` Critical Rule #101's companion sections. State is session-only — not persisted to `sk3d_prefs`, not reset by `newScene()` — because it's a momentary "get the chrome out of the way" action, not a preference.

### 3. `#pb-colors` fits by scaling instead of scrolling (tall)

The colour/size/opacity row's natural width (~425px) exceeded every target phone, so it scrolled horizontally and the opacity presets lived off the right edge. `_fitColorsRow()` now zoom-fits it to the bar, floor 0.7, with the existing `overflow-x:auto` retained as a backstop below the floor.

The ordering constraint against `--pb-h` is the important part — see Critical Rule #101.

### 4. `#pb-cycbar` groups spread across the bar

The three groups (draw/erase/select · flat/smooth/vel · undo/redo) are now wrapped in `.pb-grp` blocks, with `#pb-cycbar` at `width:100%` and `justify-content:space-between`. `min-width:max-content` is kept so `#pb-scroll` still scrolls on a screen genuinely too narrow — without it, `space-between` collapses the gaps to zero and the groups start overlapping instead of scrolling.

**`#sidetools` (wide) was deliberately left alone.** The sidecol is 176px and three groups need ~340px, so spreading them would force a wrap mid-group — the exact reshuffle failure mode Critical Rules #76 and #81 exist to prevent. It keeps its 5+5 wrap.

### 5. Nav header row rebuilt

```
before:  minmax(34px,1fr) minmax(34px,1fr) 22px 22px 24px    NAV · PERSP · − · + · ⌂
after:   28px 28px 28px minmax(48px,1fr)                     NAV · PERSP · ⌂ · [zoom]
```

Three equal squares plus a jog slider taking everything left over. Consequences that had to move with it:

- **`NAV_LABELS` dropped its glyphs** — `['⬡ NAV','✥ JOY','👁 FPS']` → `['NAV','JOY','FPS']`. A 28px square can't hold a glyph and a word, and the FPS emoji rendered at a different size and baseline from the other two on Android anyway. This remains a 3-state cycle showing the **next** state, not the current one — the standing exception to the 2-state "show current state" convention.
- **`⌂` became a stroke SVG** at `stroke-width:1.5`, matching the topbar icon set. The text glyph was the only reason it read thinner than everything around it.
- **The minimum-width constants were recomputed**, including a new second constraint (the 142px NavCube canvas) that the session-83 derivation didn't have. See Critical Rule #101.

### 6. `#bprims` during FPS

The CSS rule that relocated it to the bottom-right corner is replaced by `_positionPrimsForFps()`, which parks it under `#fps-plane-ctrl`. Detail in Critical Rule #101.

---

## Session 102 — Icons, section centring

Four small changes, all visual, from on-screen feedback on session 101. No schema change (stays 4.5). Cache key `v101` → `v102`.

### 1. Perspective / orthographic icons

`#nav-persp` and `#pb-nav-persp` carried the word `PERSP`/`ORTHO`. Session 101 made them 28px squares, where a word doesn't fit. They now carry an icon pair — frustum for perspective, cube for orthographic — held as `PERSP_ICO` / `ORTHO_ICO` next to `window._syncPerspBtns()`.

`#bpersp` in the eye dropdown **keeps its text label**: it's a `.vp-row` in a list of worded rows, so an icon there would be the odd one out. One state, two presentations, one owner — see `gotchas.md` Critical Rule #102's third section for why the four previous writers were consolidated and what that fixed in `newScene()`.

### 2. Nav-header icon colour

`.nav-hdr-row .cyc-btn svg` is now `var(--mut)`, lifting to `var(--ink)` on hover/active/`.on`, matching every other icon button in the app instead of inheriting `.cyc-btn`'s text-sized `--ink`. Covers the home icon and the new persp/ortho pair.

### 3. Both tall-mode rows are grids with real separator tracks

`#pb-cycbar` and `#pb-colors` moved from flex + `space-between` to explicit grids (`1fr 1px 1fr 1px 1fr`, and `auto 1fr 1px 1fr 1px 1fr` for the colour row's leading layer-dot track), with `.pb-grp{justify-content:center}` centring each section in its own track and `.pb-sep` as a grid item rather than a flex child.

This supersedes session 101's `space-between` approach for these two rows. The reasoning, and the three constraints that come with it — the deliberate `auto` minimum, the load-bearing `min-width:max-content`, and the layer dot's separate track — are in Critical Rule #102.

`#sidetools` (wide) is still untouched, for the same reason as session 101: a 176px column can't hold three sections on one line, and forcing it would reintroduce the mid-group wrap that Critical Rules #76/#81 exist to prevent.

---

## Session 103 — The fit that never fired; layer dot folded into its icon

Two changes, both corrections to session 102, both from a device screenshot. No schema change (stays 4.5). Cache key `v102` → `v103`.

### 1. Both narrow-bar rows now actually fit

Session 102's `min-width:max-content` on `#pb-cycbar` and `#pb-colors` made the colour row grow physically wider than the bar and spill off the right edge of the screen, while simultaneously making `_fitColorsRow()`'s `scrollWidth`/`clientWidth` comparison always report "fits". Replaced with `min-width:0`, leaning on the grid's `auto` track minimums instead. Full reasoning in `gotchas.md` Critical Rule #103.

`_fitColorsRow()` became `_fitBarRow(id)` and is now applied to **both** rows rather than the colour row alone, each with its own scale capped at 1. `PB_COLORS_MIN_ZOOM` was renamed `PB_ROW_MIN_ZOOM` to match; the 0.7 value is unchanged.

### 2. The active-layer dot moved into the layers icon

`#pb-layer-dot` — a standalone 8px div at the head of `#pb-colors`, tall-mode-only, with its own popover trigger — is gone. The active layer's colour is now a `<circle id="blayers-dot">` inside `#blayers`' glyph in `#topbar`.

This is a strict improvement on three axes rather than a preference: the indicator now exists in every layout instead of only tall, the colour row drops from four grid tracks to three (and loses the 4px centring offset the dot was causing), and the Layers popover loses its duplicate trigger and the `e.target!==dot` clause that trigger required in the outside-click handler.

`window._syncLayerDot()` is the single owner. It is deliberately a separate function rather than three lines inside `setActiveLayer()`, because layer 1's colour is `_themeInk(1)` and therefore theme-dependent — `setUITheme()` has to repaint it, which a private helper inside `setActiveLayer()` couldn't offer.

---

## Session 104 — CONTROL card icon set

A single batched request, proposed as a list and confirmed before implementation. Replaces every text/emoji glyph on the gizmo control row (and two related toggles) with SVGs. No schema change (stays 4.5). Cache key `v103` → `v104`.

### The icon set

Ten controls, held as string constants (`MODE_ICO`, `PLANE_ICO`, `LOFT_ICO`, `HOME_ICO`, `MAGNET_ICO`, `WORLD_ICO`, `LOCAL_ICO`, `LCL_ICO`, `VIEW2PLANE_ICO`, `PLANE2VIEW_ICO`, `OVERLAY_ON_ICO`, `OVERLAY_OFF_ICO`) right next to `PERSP_ICO`/`ORTHO_ICO`, same 14x14-viewBox/`stroke=currentColor` convention:

- **Transform mode** (`sb-cyc-mode`/`pb-cyc-mode`) — 4 icons: All (arrow-tipped diamond), Move (4-way cross), Rotate (270° ring + arrowhead), Scale (box + corner arrow).
- **Axis filter** (`sb-cyc-axis`/`pb-cyc-axis2`) — not icons but colour-coded letters, `<span class="ax-x">X</span>` etc. `.ax-x`/`.ax-y`/`.ax-z` already existed in the stylesheet (`#b03020`/`#1a9940`/`#1e52a0`) and were unused until now.
- **Drawing plane** (`sb-cyc-plane`/`pb-cyc-plane2`) — **stays text** (Front/Top/Side). A tripod icon set was built and reverted mid-session: three views of the *same* plane differ only in which pair of axes is shaded, which at 13px produces three near-identical glyphs. Three short words are unambiguous where three near-identical icons are not. This is the counter-case to the surf-type button directly below.
- **Surface type** (`sb-cyc-surf`/`pb-cyc-surf2`) — all eight states get icons, held in `SURF_ICO`: plane (flat square, no perspective — it is the default/neutral surface, so it reads as a plain quad rather than a foreshortened one), cube (isometric), cylinder, sphere, cone, loft (two profile curves + filled belly), extrude (swept prism), none (slashed circle). These are eight genuinely different solids, so each is identifiable from silhouette alone — the opposite of the plane-orientation case. `none` is a slashed circle rather than a crossed-out plane because a dashed outline plus a slash turns to mud at this size. Not extended to `sg-loft`/`pg-loft` or the selection-row `data-selact="loft"` button — out of scope. (**Superseded in session 105**: the selection row's `loft`/`loft-solid`/`extrude` buttons went the other way and had their leading glyphs *stripped*, becoming plain `Lft`/`Sld`/`Ext` text. See the session-105 section at the end of this file.)
- **Reset** (`greset`/`pb-greset`) — reuses the exact `nav-reset` house path.
- **Snap** (`gsnap`/`pb-gsnap`) — a horseshoe magnet tilted 45° clockwise (poles up-right), applied as `<g transform="rotate(45 7 7)">` around the upright path rather than by baking rotated coordinates into every point — the source stays readable and the angle stays a single editable number. The existing `.on` class still carries the enabled/disabled colour, no second icon state needed.
- **World / Local axes** (`gc-axmode`/`pb-gc-axmode`) — globe icon for World, a small filled-square "own origin" with two fanning arrows for Local (distinct from the LCL icon below on purpose — this toggles the gizmo's *axis frame*, LCL toggles the *overlay*).
- **Align camera↔plane** (`gface`/`gview`, `pb-gface`/`pb-gview`) — a matched pair sharing an eye glyph and an edge-on plane line, distinguished by which one moves: `gface` ("align camera to face plane") shows a **straight arrow** from eye to line; `gview` ("align plane to face camera") shows a **curved rotate arrow** around the line, with the eye fixed. The direction of motion is the actual semantic difference between the two buttons, not just a mirrored layout.
- **LCL overlay toggle** (`glocal`/`pb-glocal`) — a drawing plane with an axis marker standing on it: filled origin dot, a normal (vertical) arrow, and one in-plane arrow. A bare 3-arrow cluster was tried first and was too dense at 13px once the plane was added; dropping to two arrows keeps the "axes anchored to a plane" reading legible. `#lcl-float` and `#uw-lcl` deliberately keep the plain "LCL" text — see the existing comment in `_syncButtons()` about those two always being a 36px circle.
- **UI hide** (`#bhide`) — four 45° diagonal arrows in a square footprint: pointing **outward** to the corners while the UI is shown, **inward** to the centre while it is hidden. Constants are `UIHIDE_EXPAND_ICO` / `UIHIDE_COLLAPSE_ICO`. This pair is **next-action** semantics (what the tap will do), deliberately the opposite of the show-current-state convention used elsewhere for two-state toggles — an expand/collapse pair is near-universally read as what-will-happen, so inverting it here would be the surprising choice. An eye-plus-two-circles design was built first and replaced.

### Single owners, same pattern as session 102

`window._syncModeBtns(m)`, `_syncPlaneBtns(v)`, `_syncAxisBtns(a)`, `_syncSurfBtns(v)` are the sole places these four cycle buttons' `innerHTML` gets written, mirroring `_syncPerspBtns()`. Every previously-scattered `textContent=` call site now routes through one of these: `setGizmoMode`/`setAxisFilter`, the loft/extrude activate-and-clear functions, both halves (`sb-`/`pb-`) of the narrow-cycle-buttons IIFE, the saved-scene surf/plane restore path, and `newScene()`.

`pb-cyc-plane`, `pb-cyc-axis`, `pb-cyc-surf` (no numeric suffix) have no matching DOM elements — a leftover naming split from an earlier narrow-bar layout, confirmed dead (their `makeCycBtn` calls no-op via `if(!btn)return`, and the `pop-plane`/`pop-axis`/`pop-surf` popovers they'd have opened are unreachable). Left untouched rather than pruned — out of scope for an icon request. `_syncPlaneBtns`/`_syncAxisBtns`/`_syncSurfBtns` still list these dead ids in their target arrays for symmetry with the real ones; harmless since `getElementById` on them is always null.

**The shared helper was itself a label writer, and that was the session's real bug.** `makeCycBtn(...)`'s tap branch ended with `btn.textContent=getLabel(next)` — running *after* `applyCur(next)`, i.e. after the sync function had already drawn the icon. Every one of these buttons therefore looked correct on load and reverted to a plain word the first time it was tapped, which is exactly how it was reported ("reverts to All after tapping through x, y and Z"). The line is deleted; every `applyCur` callback now renders its own button through a `_sync*Btns` owner. `getLabel` is still passed in and still used by the popover rows, so the signature is unchanged.

Two smaller instances of the same class, both also fixed: `pb-cyc-mode`'s own callback carried a duplicate `getGizmoModeLabel(v)` write (its `sb-` counterpart did not), and the three surf call sites echoed the *requested* value rather than the resulting `surfType` — which matters because tapping loft/extrude while that surface is already active clears it and drops `surfType` to `none`, so the button would have shown a loft icon on a cleared surface.

Documented as `gotchas.md` Critical Rule #104: when a control's content moves to a single-owner sync function, the shared helper that renders *all* controls of that kind is the first place to check, not the last — a per-control sweep will not find it, and it fails only on interaction, so the initial render looks right.

### `#ghud-bottom`'s grid layout — reasoning partially superseded

The v81 fix documented further up this file (grid instead of flex-wrap, because text-label buttons wrap unpredictably by device font metrics) was written when every button in that row carried a word or symbol. As of this session all six are icon-only, fixed-pixel-width SVGs — the *original* reason for the grid no longer strictly applies, the way it did for `#sidetools`. The grid is left in place rather than reverted to flex: it still works correctly for fixed-width icon content too, and there's no functional reason to touch working layout code for an icon-only change. Noted here so a future session doesn't read the v81 rationale, see icons instead of text, and assume something regressed.

---

## Session 105 — One transform picker; the axis filter reaches every gizmo

Four batched changes to the CONTROL card's selection mode. No schema change (stays 4.5). Cache key `v104d` → `v105`.

### 1. The `#ghud-sel` transform row is gone

`#ghud-sel` and `#pb-ghud-sel` each opened with a four-button `all` / `move` / `rotate` / `scale` row, duplicating the header's `sb-cyc-mode` / `pb-cyc-mode` icon that session 104 had just built. The row is deleted from both copies; the two `act==='all'||act==='move'||...` branches in the `.gc-sel-btn` click handler go with it. Each selection panel is now one action row (Dup / Lft / Sld / Ext / Del / ✕) plus the ref-object block.

### 2. Transform mode and axis filter fan out to all three canvas gizmos

Previously `setGizmoMode`/`setAxisFilter` (card-gizmo IIFE) wrote only `gizmoMode`/`axisFilter`. But `draw()` hands the `gc` canvas to `_sgGcDraw` when strokes are selected and `_pgGcDraw` when a primitive is, so in selection mode the header controlled a gizmo nobody was looking at. Both setters now end with a fan-out to `_sgSetMode`/`_pgSetMode` and `_sgSetAxisFilter`/`_pgSetAxisFilter`.

New in the stroke gizmo: `sgAxisFilter` + `sgAxes()`, and `_sgApplyMode(m)` extracted from what was an inline `sg-*` click handler, exported as `window._sgSetMode`. New in the primitive gizmo: `_pgAxisFilter` + `pgAxes()`, exported as `window._pgSetAxisFilter` alongside the pre-existing `_pgSetMode`. Each `*Axes()` is consumed in exactly three places in its own IIFE — the per-axis draw loop, the live-rotate-highlight scan, and the hit test's `axes` array — mirroring where the card gizmo reads `axisFilter`.

**The four-independent-gizmos decision is intact.** Nothing here is a shared helper: `sgAxes` and `pgAxes` are separate one-line functions in separate closures with separate state, and the fan-out is three explicit guarded calls, not a registry or a loop over a subscriber list. What is shared is the *value*, not the implementation. The LCL 3D overlay is untouched — it has no axis-filter concept.

**The `sg-*` / `pg-*` panel buttons now route through `window._setGizmoMode`** rather than writing local state, so the header icon cannot desync regardless of entry point. Direction is one-way by construction — see `gotchas.md` Critical Rule #105 for the loop this would become if an inner setter ever called back out.

### 3. `newScene()` resets both

Added next to the surface reset. Now that the axis filter reaches the selection gizmos, a leftover single-axis filter surviving a factory reset would draw one arrow instead of three with no visible cause.

### 4. Icon-list changes

Two entries, both in the selection row (`#ghud-sel` and `#pb-ghud-sel`, always symmetrical — see the standing rule about `#ghud-sel` / `#pb-ghud-sel` pairs):

- **Duplicate** (`data-selact="dup"`) — `Dup` text → a copy glyph: a back sheet drawn as an open L-path (top and left edges only, rounded corner via an arc) with a full front sheet offset down-right at `fill-opacity="0.18"`, matching the delete icon's weight and the app's 14x14-viewBox / `stroke=currentColor` / `stroke-width=1.3` convention. Rendered at true 12px before shipping; the two-sheet silhouette survives it. Inlined in the static markup rather than held as a `*_ICO` constant — it has one state, so there is nothing for a sync function to own (same reasoning as the delete icon).
- **Loft / loft-solid / extrude** — leading glyphs removed: `⟁Lft` → `Lft`, `~Sld` → `Sld`, `⤒Ext` → `Ext`. This is the deliberate counter-move to session 104's surf-type set. Those eight states are one control cycling through eight solids, where silhouette does the identifying; these are three *different actions* sitting in a row of five, where the glyph was decoration ahead of a word that was already carrying the meaning. At this size a decorative glyph costs horizontal room in a 130px row and buys nothing. **The rule that falls out: iconify when the icon replaces the label, not when it precedes one.**

Unchanged in that row: `⬡Plane` / `⬡Pln` (`data-selact="useplane"`), which sits in the ref-object block rather than the action row.

### 5. The action row keeps one row, with guaranteed-equal tracks (`.gc-sel-row`)

The row holds up to **five** visible buttons — `Dup` / `Lft` / `Sld`-or-`Ext` / `Del` / `✕`. Five is the true maximum, not six: `loft-solid` shows at `selectedStrokes.length >= 2` and `extrude` at `=== 1`, so they are mutually exclusive and never appear together. Worth stating explicitly, because the markup lists six and sizing for six would cost a fifth of the row's width on a state that cannot occur.

A two-row split was built and **reverted at Sebas's direction** — one row, all buttons the same size. What survives from that pass is the layout mechanism and the touch/legibility gains that don't cost horizontal room.

```css
.gc-sel-row{display:grid;grid-auto-flow:column;grid-auto-columns:1fr;gap:3px}
.gc-sel-row .gc-sel-btn{min-width:0;width:100%;padding:0 2px;height:30px;font-size:7.5px;white-space:nowrap}
.gc-sel-row .gc-sel-btn svg{width:14px;height:14px}
```

**Why `grid-auto-flow:column` + `grid-auto-columns:1fr` and not the previous `flex:1`.** Both give equal-width children, but flex does it by *distributing free space after* content-based bases, so a longer label can still claim a wider box once things get tight. Grid `1fr` tracks are equal by construction, independent of content — which is exactly the "all buttons the same size" requirement, and it holds in every state because `display:none` items are removed from grid flow entirely, so the track count follows the visible child count with nothing for JS to sync.

**`min-width:0` is load-bearing.** Grid items default to `min-width:auto`, which lets a label push its own track past its `1fr` share and blow the row out sideways — the horizontal overflow this layout exists to prevent, and also the thing that would break equal sizing.

**The float-card rows now fill their panel.** `#pb-ghud-sel` and `#pb-ghud-bottom` both carried a hard `width:130px;max-width:100%` inside a parent with `align-items:center`. `#pb-panel-gizmo` is user-resizable (pinch, edge-drag, the `fc-nav-resize` grip), so on any panel wider than 130px both rows stayed 130px and sat centred with dead space either side — the buttons visibly not reaching the panel edges. Both are now `width:100%`. This also removes an overflow risk in the other direction: at panel widths *below* 130px the fixed width previously relied on `max-width:100%` to rescue it. Changed on both rows rather than just the selection one, because they share a slot and a width difference between them is the same class of defect as the height difference documented in `gotchas.md`.

**`#ghud-sel`'s 6px horizontal padding is removed** (`padding:4px 6px 2px` → `4px 0 2px`). `#ghud-bottom`, the panel `#ghud-sel` swaps with in the same slot, has no horizontal padding — so the selection row was rendering 12px narrower than the gizmo row directly above it and visibly failing to reach the card edges. This was the actual "buttons don't fill" symptom; the grid was distributing correctly, just inside a container that was inset for no reason. Sidecol's five-across track goes `25.2px → 27.6px` (+9.5%). The narrow copy never had this — `#pb-ghud-sel` is `width:130px`, matching `#pb-ghud-bottom`.

**Measured, tightest case (narrow mode, five visible):** `(130 − 4×3) / 5 = 23.6px` per track, `19.6px` of content after padding. The widest label (`Sld`/`Ext`, three chars at `7.5px` with `.05em` tracking) is ≈`14.6px`; the icons are `14px`. Roughly 5px of slack on both. Sidecol's five-visible case is `27.6px` per track with ≈9px slack. Nothing crops.

**Touch and legibility gains that cost no width:** button height `28px → 30px`, icons `12px → 14px`. Label size went `7px → 7.5px` rather than the `8px` the two-row version could afford — `8px` left only ~1px of slack at narrow/five, too close to the edge given that font metrics vary by device (the standing reason this row is a grid at all, Critical Rule #81). Horizontal padding tightened `3px → 2px` to put that room into the tracks instead.

**Card height is unchanged** (one 30px row vs the previous 28px), so this does not move the `#ghud-sel` ↔ `#ghud-bottom` swap delta in ultra-wide mode either way. See the gotchas entry on that swap — it is a pre-existing item, not something this change touches.

### 6. Drag-select never re-synced the count-gated action buttons

Found from a device screenshot showing `3 selected` with `Ext` visible — `Ext` is gated on *exactly one* stroke, so that state is impossible through a correct path. The drag-select branch in the pointermove handler mutates `selectedStrokes` directly (`push` in `add` mode, `splice` in `remove` mode) and called `updateSelHighlights`, `positionStrokeGizmo`, `_sgGcDraw` and `_syncSgControls` — but never `_syncLoftSolidBtn` or `_syncExtrudeBtn`. So sliding across strokes to build a multi-stroke selection left whatever button state the initial tap had produced: `Ext` showing, `Sld` hidden, and `Ext` live enough to tap.

Fixed with a single owner, `_syncSelActionBtns()`, holding the three calls every selection-count change needs (`_syncLoftSolidBtn`, `_syncExtrudeBtn`, `_updateGhudSel`). All four previous call sites in `clearSelection()` and `selectStroke()` now route through it, and the two drag-select branches call it too. **`selectedStrokes` is mutated in exactly five places** (`5322` init, `5534` clear, `5552`/`5553` tap-select, `6621`/`6628` drag-select) — that list is the checklist for this function.

**Known, pre-existing, deliberately not fixed:** `Lft` stays visible when only a reference primitive is selected, where it does nothing (the handler's `selectedStrokes.length>0` branch never runs). Unchanged behaviour from before this session.

Unchanged in that row: `⬡Plane` / `⬡Pln` (`data-selact="useplane"`), which sits in the ref-object block rather than the action row.

### 7. `spetchbook_icons.pdf` regenerated, and now generated rather than drawn

The icon reference from session 104 was stale in three ways: it documented the four selection-row transform buttons that session 105 deleted, listed `Dup` as "still text," and had no entries for `Lft`/`Sld`/`Ext`. Regenerated at **5 pages** (was 7 — the four removed entries and tighter row spacing account for it).

**The source is now kept.** `icons.html` is a build script's output, and `build.py` (with `extract.py`) pulls every glyph out of `index.html` at build time rather than embedding a copy:

- `btn_svg(id)` — first `<svg>` inside the element carrying that id, for statically-marked-up buttons.
- `sel_svg(selact)` — same, keyed on `data-selact`.
- `js_str(NAME)` / `js_map(NAME, key)` — the `*_ICO` string constants and the `MODE_ICO` / `SURF_ICO` / `AXIS_HTML` maps.

The build asserts on any glyph it cannot find and prints a `MISSING` list, so a renamed id fails loudly instead of silently shipping a blank cell. This is what the original document's own preamble claimed ("pulled directly from the live SVG markup — not a redraw") but had no mechanism to guarantee. Rendered with WeasyPrint.

**Two glyphs cannot be shown as characters in the PDF:** `⤒` (extrude) and `⬡` (use-as-plane) are absent from DejaVu, and fell back to `†` and `o` on the first render — a wrong mark is worse than no mark in a reference document, so both descriptions name the glyph in words instead. Worth knowing before adding any further Unicode symbols to this document.

New convention recorded in the document itself: **iconify when the icon replaces the label, not when it precedes one** — the counterpart to session 104's silhouette rule.


## Button Shape System (v106)

All tappable controls draw from a two-tier radius scale plus two fixed cases. The tier is a function
of the control's own height, so adding a new button requires no decision — measure it and look it up:

- **height 22–28px → `border-radius:5px`** (`.btn-lbl`, `.btn-sft`, `.cyc-btn`, `.bprev-more`, `.leye`,
  `.tb-merge`, `.tb-leye`, `.pg-csw`, `.fc-hdr-btn`, `.sc-close`, `.prim-eye`, `.prim-del`,
  `.reorder-arrow`, `#fps-exit`, `#fps-plane-toggle`, `#sb-sideswitch`, `#pip-apply`, and every
  popover list row: `.emb`, `.cyc-pop-item`, `.sp-item`, `.vp-row`, `.prim-row`, `.tb-lrow`)
- **height 30–36px → `border-radius:7px`** (`.btn-sm`, `.btn-md`, `.bprev-btn`, `.nsm-btn`,
  `.prim-tb-btn`, `#pg-add`, `#vw-add`, `#vw-rec`, `#sc-hidden-toggle`, `.gc-sel-row .gc-sel-btn`)
- **40px screen-anchored chrome → `border-radius:10px`** (`#bhide`, `#btbhide`, `#bprims`,
  `#bviews-hidden`) — heavier on purpose; these float over the canvas rather than sitting in a card
- **floating round buttons → `border-radius:50%`** (`#lcl-float`, `#pb-fab`, `#sc-fab`, `.uw-btn`)

`.btn-pill` no longer exists; it is `.btn-lbl` and is no longer pill-shaped. It remains the class for
text-label buttons (as opposed to `.btn-sm`/`.btn-md`, which are fixed-square icon buttons), it just
has square-ish corners now. The name change is the only rename — the padding, height, font-size and
letter-spacing are untouched, so nothing reflows.

Container radii are a separate scale and were not touched by v106: cards `10px`, modals and the float
card `12px`, popovers `9px`, small panels `8px`, toast/rec-stop `20px`, handles/tracks `2px`.


## Session 107 — Ultra-wide columns fill their height (two-stage, height-only)

Ultra-wide mode has four full-height columns (`#uw-tools`, `#sg-bottom`, `#topbar`, `#prim-bar`), each
sized by `_uwFitEl()`. That function is a one-shot measure-and-divide (Critical Rule #73 — no
shrink-until-fits loop) and by construction it only ever scales **down**:

```
var s = nat<=avail ? 1 : Math.max(floor, avail/nat);
```

So a column shorter than the row got `zoom:1` plus `align-self:stretch` — a full-height box with its
contents packed against one end. This session fills that slack in CSS, leaving `_uwFitEl()` alone.

**Two stages, in this order:**

1. **Height.** Growable children take `flex:1 0 auto` with a `max-height` cap (46px in the chrome
   columns, 44px in the tools column).
2. **Gap.** `justify-content:space-between` on the container spreads only what the cap refused.

The order is the design. Spreading gaps first leaves 26px chips floating in a tall column; growing
first turns slack into touch target, which on a landscape phone is the scarcer resource.

**Why not just let the fit scale up.** Removing the `nat<=avail?1` clamp would make `s = avail/nat` in
both directions and fill every column with one line. It cannot be done: `#gc` (`width:150px!important`)
and `#navcube` (168px) are pixel-fixed inside a 176px CONTROL box, so any scale over ~1.05 pushes them
past the card edge. CSS `zoom` scales width and height together and there is no way to ask it for one
axis. **The height-only fill is a constraint, not a preference** — a future session that "simplifies"
this by unclamping the fit will clip both gizmo canvases sideways.

**Why CONTROL centres rather than spreads.** `#sg-bottom` is a `.sc-group`: one rounded card whose
sections (`#ghud`, `#nav-card`) are divided by a `.card + .card` 1px rule, with `.sc-grab` as chrome.
Each section takes a share of the slack and centres its contents inside it, so the divider stays flush
against real content on both sides. `space-between` would have left that rule floating in blank panel —
the same class of mistake as the v101 `#pb-cycbar` spacing that session 102 replaced, where spreading
the gaps left each group hugging the gap instead of sitting in its own share.

**What deliberately does not grow.** The three topbar dropdown-arrow tails (they belong to the button
before them, and equal heights would read as six buttons instead of three pairs); the `.tsep` /
`.prim-tb-sep` rules (1px, not content); `.sc-grab`; and the colour swatches and size/opacity preview
buttons in the tools column, whose canvases would draw the brush dab off-aspect if stretched.

`flex-shrink` is 0 throughout (`1 0 auto`). Overflow here only happens once `_uwFitEl()` has hit its
zoom floor, and the documented behaviour at the floor is to crop, not to squash.

---

## Flipbook Page Navigator (session 108)

Replaced the `#pages` bottom thumbnail strip in **every** layout mode. A full-screen overlay rather than a strip, because the strip had to be re-solved four times — narrow, tall, wide/sidecol, ultra-wide — and each mode had its own bottom-stack offsets, insets and stacking rules against `#views`. An overlay shifts no layout and needs none of that.

### Why it is not themed

`#flipbook` hard-codes `#1b1b1d` and its own greys. It does **not** read `--pan` / `--ink` / `--bdr`. This is deliberate and is the same reasoning as Critical Rule #102 (an icon that *replaces* text shouldn't inherit that text's colour): the flipbook is a different surface from the parchment sketch canvas, not a panel floating on it, so inheriting the sketch palette would make it read as chrome rather than as a mode change. All three themes get the same dark navigator.

### z-index 480

Chosen, not arbitrary. Above every popover (450 is the highest, `#scale-pop`) and **below** `#toast` (500) and the modals (600/601). The page-cap toast and `showConfirmModal()` therefore still land on top of the overlay, which is required — `addPage()` toasts from inside the flipbook.

### What the snapshots contain

`_pgSnap()` hides `gridH`, `axisGroup`, `surfGroup` and `_symGuideGroup` for the capture — the same set and the same order `expPNG()` uses — and restores them in a `finally` block so an exception mid-capture can't leave the scene furniture switched off. A flipbook page is a picture of the drawing; a grid baked into it makes every page look identical at 46px, which defeats the purpose of a thumbnail. The vector proxies need no equivalent, since they only ever draw strokes.

### Snapshot tiers

| Field | Size | Quality | Used by |
|---|---|---|---|
| `pages[i].preview` | 640px long edge | JPEG 0.6 | the flipbook page faces |
| `pages[i].thumb` | 160px long edge | JPEG 0.5 | the scrub bar |
| `pages[i].proxy` | boolean | — | true if vector-generated, false if a real WebGL snapshot |

**Neither string is persisted.** `sceneData()` is unchanged, so the save format stays 4.5 and `.json` files do not grow. This was already true of the old `thumb` field and was kept deliberately.

`_fbScaleCanvas()` fills the destination with the scene background before `drawImage` — JPEG has no alpha channel, so a transparent region drawn onto a fresh canvas comes out black.

### Vector proxies for unvisited pages

Only the active page's strokes are ever in the Three.js scene; the other 23 are plain data in `pages[]`. So a freshly imported file has stroke data and no snapshots at all. Two options were considered:

- **Rebuild geometry and render offscreen.** Accurate, but the full `buildTube()` cost × every stroke — 200ms+ on a heavy page, several seconds for a book.
- **Project and stroke as 2D polylines.** `_fbProxyCanvas()` takes each page's raw control points, applies its stored `mx` matrix, calls `Vector3.project()` with the current camera, and draws flat polylines on a 2D canvas. ~1–3ms per page, no GPU, no geometry.

The second was chosen. The tradeoff is accepted rather than hidden: proxies have no taper, no depth tint, no caps, no reference primitives, and one flat colour per stroke, so a flipbook of an imported file shows crisp real snapshots for visited pages next to flat line drawings for the rest. Real snapshots are never overwritten by proxies; proxies *are* regenerated on each open so they track the current camera.

Two details that are easy to get wrong:

- **`Vector3.project()` reads `camera.matrixWorldInverse`,** which is normally only refreshed inside `renderer.render()`. Proxies are generated in a loop with no render between them, so `_fbProxyCanvas()` refreshes it explicitly.
- **NDC z outside `[-1, 1]`** is behind the camera or past the far plane, and projecting those points produces mirrored garbage. The polyline is *broken* at those points rather than skipping them, or the drawing gets a line across the page to nowhere.

### The turn

One reusable leaf (`#fb-leaf`), `transform-style:preserve-3d`, 380ms. Its **geometry is rewritten per flip** because the two layouts turn differently:

- **Single (narrow):** the whole page is the leaf, turning about its left edge like a loose sheet.
- **Spread (wide):** the leaf is **half** the box and turns about the **gutter** — forward, the right half swings left; backward, the left half swings right. Each face shows one half of a page image, sized and offset **in pixels** by `_fbHalfBg()`, which reproduces what `cover` would do against the whole page box and then slides the image by half a box width for the right-hand face. Percentage backgrounds cannot do this: they resolve against the face, which is half the width of the box being covered, and the drawing squashes for the length of the turn. See `gotchas.md` #108(c). This is also the second reason the page box is sized in inline pixels — `_fbBoxW`/`_fbBoxH` have to be readable from JS.

The destination page is painted onto `#fb-static` underneath **before** the turn starts, so when the leaf lands it is simply hidden — no state to reconcile at the end.

`#fb-under` exists only for spread mode. Since `#fb-static` holds the *incoming* page throughout, the half that isn't turning would otherwise jump to the new page at t=0; `#fb-under` carries the outgoing page's resting half above it until the leaf lands. At 90°, with the leaf edge-on, you see the outgoing half beside the incoming half — which is what a real spread does.

**Face assignment is derived from the leaf's start angle, not from the direction.** Those are not the same thing and assuming they were is a live bug risk. A face's effective angle is the leaf's rotation for the front and rotation+180° for the back; a face is visible near 0° and hidden near 180° (`backface-visibility:hidden`, `#fb-leaf-back` pre-rotated 180°).

| Mode | Direction | Leaf angle | Visible at start | Visible at end |
|---|---|---|---|---|
| Single | Forward | 0° → −180° | front | back |
| Single | Backward | −180° → 0° | **back** | **front** |
| Spread | Forward | 0° → −180° | front | back |
| Spread | Backward | 0° → **+180°** | **front** | **back** |

Single-backward is the odd one out. Reading the direction and inferring the faces gets spread-backward wrong, because it starts at 0° and rotates positively — the same face schedule as a forward turn.

### Turn shading

`.fb-shade`, one inside each leaf face: a **flat** `rgba(0,0,0,.12)` tint whose opacity runs 0 → 1 (at 50%) → 0 with `#fb-leaf`'s own duration and easing, so darkness tracks the leaf's angle — nothing at rest, deepest edge-on, nothing again as it lays flat. Only the moving page is shaded. `#fb-static`, `#fb-under` and the gutter never are.

**Flat, not a gradient, and this took seven passes.** A permanent gutter gradient (a line down a resting page reads as a seam in the artwork), a turn-only gutter gradient (it appeared rather than arrived), per-face gradients running toward each face's hinge (even ramped from opacity 0, a full-size shadow *shape* becoming visible on a barely-moved page reads as an overlay switching on), and one gradient anchored on the pivot line growing outward (still showed up on one side) were all built and all rejected. So, briefly, was removing shading altogether.

**The rule that survived: a gradient has a shape, and a shape becoming visible is a different event from light changing.** A flat tint has no shape to notice, so the only thing the eye registers is the page dimming. The objection was never the strength — a gradient was tried at half opacity and still read wrong — so a "subtle" gradient is not a fix and should not be reintroduced.

Flat also removes a handedness problem the per-face gradients carried: those needed their direction computed per turn and *reversed* for the back face (which has its own `rotateY(180deg)`), with spread-backward as the sole right-hinged case — three chances at an error invisible at rest. A flat tint has no direction to get wrong.

Peak alpha `.12` and the 50% keyframe stop are the two dials.

`#fb-static`'s `0 2px 8px rgba(0,0,0,.35)` is the only box-shadow in the overlay, and it is **switched off for the duration of a turn** (`#flipbook.fb-turning #fb-static{box-shadow:none}`). It was also tightened from `0 8px 30px rgba(0,0,0,.55)` for the same reason as everything above: a wide soft halo on a dark background is itself a soft-edged tonal transition, and the leaf crosses it at the fold.

At rest that shadow earns its place — it lifts the page off the dark background. Mid-turn it inverts: the resting page is the only thing *not* moving, so a soft halo on it becomes the most noticeable edge on screen precisely while the eye should be tracking the leaf. **The principle covers both layers: during a turn, only the page that moves is shaded. Nothing that stays still is shaded, by tint or by shadow.**

### Both directions are one turn, mirrored

Forward pivots on the moving leaf's **left** edge and rotates **negative**; backward pivots on its **right** and rotates **positive**. Both therefore start at 0°, which makes the face schedule identical everywhere:

| Mode | Direction | Leaf angle | Visible at start | Visible at end |
|---|---|---|---|---|
| Single | Forward | 0° → −180° | front | back |
| Single | Backward | 0° → +180° | front | back |
| Spread | Forward | 0° → −180° | front | back |
| Spread | Backward | 0° → +180° | front | back |

No special cases in any mode or direction. An earlier build had single-page backward start at −180° instead — geometrically valid, but not the *mirror* of forward: the leaf begins parked off to the side and swings in, so the box already shows the destination page at t=0 and the two directions read as two different animations. **Do not simplify back to it.**

### Keeping the page box measurement fresh

`_fbHalfBg()`'s pixel cover arithmetic needs the live page-box dimensions, and `#fb-static` gets its scale from CSS `cover` against the same box. If the two disagree, the drawing changes scale for exactly the length of the turn — which presents as an animation bug, not a measurement one, and sends you to the wrong file.

They disagreed because the box was cached by `_fbApplyShape()` at open and on resize, while `#fb-stage`'s height moves for reasons that fire no resize event — edit mode widening the scrub row being the case that caught it. `_fbMeasure()` is now split out and called at the top of every `_fbGo()`: one `getBoundingClientRect` per turn, and the two paths cannot drift apart.

### Why the turning half narrows, and what to do about it

It narrows because it is being projected, and that cannot be removed — a page that turns without narrowing is not turning. What can be changed is whether the eye reads it as **depth** or as a **horizontal squash**, and the deciding cue is how much taller the swinging outer edge becomes than the hinged inner one. That ratio is a function of `perspective` alone; the transform contributes nothing to it. Measured at 45° on a 689×492 page box:

| `perspective` | outer edge | ratio | |
|---|---|---|---|
| 1400px | 596px | 1.21× | original |
| 1050px | 641px | 1.30× | |
| **880px** | **680px** | **1.38×** | current |
| 800px | 707px | 1.44× | about the floor — below this the near edge fisheyes |

`perspective-origin` is `50% 28%`. It does **not** affect the ratio — the outer edge's scale is the same wherever the viewpoint sits — but it moves where the taller edge grows: at 50% it expands symmetrically about the page's centre (far edge spanning −94..586 on the box above), at 28% mostly downward (−53..628, centre 41px lower). The asymmetry reads as looking slightly down into an open book. A second-order cue, but it costs nothing.

Turn duration is 620ms with `cubic-bezier(.42,0,.18,1)`; safety-net timeout 820ms.


See `gotchas.md` Critical Rule #108(b) for the forced-reflow requirement and the `transitionend` safety net.

### One drawing per page, spread motion

There is deliberately no two-page pairing anywhere: no odd/even arithmetic, no leading blank page, no notion of a left page and a right page holding different drawings. A page is one drawing in every layout; wide mode changes the page's *proportions* (1.4 vs 0.7) and the *motion* of the turn, nothing about the data model.

The page box is sized in **inline pixels**, not with CSS `aspect-ratio`. The property is fine on current Chrome, but this app targets old Android WebViews, and the box has to be recomputed on rotation and on `visualViewport` resize regardless.

### Interaction

- **Chevrons** either side of the page.
- **Horizontal swipe** on the page — 40px threshold, must exceed vertical movement. Under 8px total counts as a tap.
- **Scrub bar** — tap a thumb, or drag across them. `_fbGo()` refuses to start a second turn while one is in flight and instead stores the latest target in `_fbPending`, so a drag across five thumbs plays **two** turns (to the first, then straight to the last) instead of queueing five. This is the single most important behaviour in the whole feature for perceived smoothness.
- **Tap the page** to exit into it. `_fbCommit()` closes first, then calls `loadPage()`, which re-snapshots the outgoing scene — leaving via the flipbook never loses work.
- **Long-press a scrub thumb** for edit mode: delete badges, reorder arrows on the selected thumb, tap empty scrub space to exit. Ported directly from the old strip.
- **Rename** moved to `#fb-name` at the top, always tap-to-edit for the shown page. The old strip only allowed renaming a *selected* thumb in edit mode, which was two gestures deep.

### Render loop

`animate()` returns immediately while `_fbOpen` is true. Nothing behind the overlay is visible, so suspending all GPU and overlay work leaves the frame budget to the CSS transition. `closeFlipbook()` calls `markDirty()` so the scene repaints on exit. `_pgSnap()` calls `renderer.render()` directly and so still works with the overlay up — which it must, since `addPage()` snapshots the outgoing page from inside the flipbook.

### Remembered filename

`_lastFileName` (default `'spetchbook'`), persisted in `sk3d_prefs` as `fileName`, reset by `newScene()`. **One** name, shared by the project save (`#save-name-modal`) and every exporter (`promptExportName()`), written by both confirm handlers via `_setLastFileName()`. Per-format memories were rejected: they would reintroduce the retyping the first time anyone exported a `.glb` between two project saves.

It is declared beside `_savePrefs()` rather than beside its point of use. `_loadPrefs()` writes it, and a `var` initialiser further down the same script would re-run after that and silently reset it to the default. `_loadPrefs()` currently runs at the very end of the script so the bug would not have fired, but that is an accident of ordering, not a guarantee.

### Page cap

`FB_MAX_PAGES = 24`, hard, no soft-warning tier. `#fb-add` greys out and `addPage()` returns with a toast.

**Page count does not affect framerate** — only the active page's geometry is ever in the scene. The cap is a memory / autosave-payload / save-file-size limit. Raising it is free for rendering and expensive for files, and that is the right way to think about any future change to the number.

### `body.pages-open` is dead

Never set any more. Nine CSS rules keyed on it are inert and were **left in place**: the views-only offsets are interleaved with them through `:not(.pages-open)` / `:not(.views-open)` pairs, and re-deriving the whole bottom-stack chain is a larger and riskier change than nine dead selectors. A comment above the block records this. If that stack is ever rebuilt, delete the `.pages-open` rules together with the paired `:not(.pages-open)` qualifiers.
