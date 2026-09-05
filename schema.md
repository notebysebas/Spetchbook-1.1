# Spetchbook — Data Schema & Save Format (v109)

## JSON Save Format — Version 4.5

**Session 109 note: NO SAVE-FORMAT CHANGE, and nothing added to `sk3d_prefs` either.** Session 109 removed the flipbook leaf's drop shadow and added two ruler behaviours — an OFF-EDGE parallel mode and a deferred direction pick for the triangles. All of the new state is **module-scope `var`s inside the ruler IIFE and session-only**, matching how `_menuSnapDeg`, `_shapeScale` and `_mirrored` were already handled: `_parallelMode`, `_anchorLocal`, `_paraOn`, `_paraOff`, `_paraU`, `_triDirIdx`, `_triStartS`, `_remapAnchorS`, `_remapFrom`, `_remapTo`, plus the constants `TRI_DIR_MIN_PX` (14) and `TRI_DIR_HYST` (0.04). The OFF-EDGE choice is deliberately **not** persisted — it is a per-session drawing mode like the rotate-snap increment, not a preference like `stylusOnly`. Strokes drawn under either mode are ordinary strokes: the ruler only decides *where* their points land, never how they are stored, so nothing touches `sceneData()`, `loadAllPages()`, `_deserializePrimitives()`, the stroke pipeline, or any exporter. Version stays **4.5**. Saves written by sessions 70–109 are interchangeable.

**Session 100 note: NO SAVE-FORMAT CHANGE — but `sk3d_prefs` gained one key.** The `.json` save format stays **4.5**; saves written by sessions 70–100 are interchangeable. What changed is the `localStorage` preferences key, which now holds `{stylusOnly, twoFingerMode, invertOrbitX, uiTheme, tapGest}`. `tapGest` is the single multi-finger tap gesture toggle (two-finger double-tap = undo, three-finger double-tap = redo — one flag covering both), defaulting `true`, reset to `true` by `newScene()` exactly as `twoFingerMode` is reset to its own default. Loading is defensive (`typeof p.tapGest === 'boolean'`), and falls back to the superseded two-key form (`tapUndo`) written by the earliest v100 builds, so neither an old blob nor a pre-100 blob can misreport the setting. Nothing else touched `sceneData()`, `loadAllPages()`, `_deserializePrimitives()`, the stroke pipeline, or any exporter — the unbounded-plane change alters *where* stroke points can be created, not how any of them are stored.

**Session 85 note: NO SCHEMA CHANGE — but read this before touching storage code.** Session 85 renamed the app from "Sketch3D" to "Spetchbook" (display strings only — title, manifest, export-file metadata, default filenames, new icon artwork). The `.json` save-file format itself is untouched: same version `4.5`, same fields, same `sceneData()`/`loadAllPages()` shape. **However:** the IndexedDB autosave database is still opened as `indexedDB.open('sketch3d', 1)` — deliberately **not** renamed alongside the app, because IndexedDB has no rename operation and changing the string would silently point the app at a new, empty database instead of the existing one (see `gotchas.md` Critical Rule #83 and `architecture.md`'s "App Rename" section for the full reasoning). If a future session does want to rename this database, it requires a **migration** (copy the `autosave` object store into a newly-named database, then decide whether to clean up the old one) — not a plain string substitution. Until that migration is written, do not change the `'sketch3d'` string at line ~6862. Saves written by sessions 70–85 are interchangeable, and this applies equally to what's sitting in the `sketch3d` IndexedDB database right now.

**Session 84 note: NO SCHEMA CHANGE.** Session 84 fixed the layers-popover clear actions (and the primitive-merge confirm dialog) silently doing nothing — root cause was native `confirm()` being unreliable in the installed PWA, fixed with a new generic `#confirm-modal`/`showConfirmModal()` in-app modal — and relocated the "Look Around" topbar button into the eye dropdown. Pure JS/HTML behavior + UI-layout work; nothing touching `sceneData()`, `loadAllPages()`, `_deserializePrimitives()`, the stroke pipeline, or any exporter. Version stays **4.5**. Saves written by sessions 70–84 are interchangeable.

**Session 83 note: NO SCHEMA CHANGE.** Session 83 was entirely CSS layout + JS layout-constant work on the narrow-mode float card's nav header row and the sidecol's top-clearance measurement — see `handoff.md`/`architecture.md`/`gotchas.md` for the full chain. Nothing touching `sceneData()`, `loadAllPages()`, `_deserializePrimitives()`, the stroke pipeline, or any exporter. Version stays **4.5**. Saves written by sessions 70–83 are interchangeable.

New plain JS constants this session (not persisted anywhere — module-scope `var`s, same tier as `SC_MIN`/`SC_MAX`, not written to `sk3d_sc`, `sk3d_prefs`, or the save file):

| Name | Value | Scope |
|---|---|---|
| `NAV_SCALE_MIN` | `0.75` | module scope, alongside `SC_MIN`/`SC_MAX` |
| `NAV_HDR_MIN_W` | `160` | inside the "Narrow float card interactions" IIFE; exposed as `window._navHdrMinW` for the separate `fc-nav-resize` IIFE |
| `GIZMO_HDR_MIN_W` | `120` | same IIFE; exposed as `window._gizmoHdrMinW` |
| `FC_MIN_W` | `329` (`2*NAV_HDR_MIN_W+9`) | same IIFE; exposed as `window._fcMinW` for the pinch-to-scale IIFE |

`SC_MIN`/`SC_MAX` themselves are unchanged (`0.5`/`1.0`). What changed is that three of the places that used to clamp directly against `SC_MIN` (the sidecol's own scale on load, on `#stab` drag, and on first-load auto-fit; and the `.scale-dot` generic handler for any non-`sgizmo` target) now clamp against `NAV_SCALE_MIN` instead — a **behavior** change (those scales can no longer go below 0.75, where they previously could go to 0.5), but not a **schema** change: the same `sk3d_sc` localStorage key, same fields, same clamp-on-load pattern, just a different lower bound for three of its four scale fields. A value saved as `0.6` under a pre-session-83 build will load clamped up to `0.75` under this build. `_scState.sgScale` (the `#sgizmo` selection gizmo's own scale) is unaffected — it never contains the nav header row, so it keeps the plain `SC_MIN` floor.

**Session 82 note: NO SCHEMA CHANGE.** Session 82 fixed the CONTROL card's `⇅` swap button being visually covered by its own header's decorative grip dash (a pure CSS re-scoping fix, `.sc-grab::before` → `.sc-grab-spacer::before`). Nothing touching `sceneData()`, `loadAllPages()`, `_deserializePrimitives()`, the stroke pipeline, exporters, or any persisted state. Version stays **4.5**. Saves written by sessions 70–82 are interchangeable.

**Session 81 note: NO SCHEMA CHANGE.** Session 81 replaced `#ghud-bottom`'s flex-wrap layout with a deterministic CSS grid (session 79's padding-based fix for this row hadn't held). Pure CSS layout change — nothing touching `sceneData()`, `loadAllPages()`, `_deserializePrimitives()`, the stroke pipeline, exporters, or any persisted state. Version stays **4.5**. Saves written by sessions 70–81 are interchangeable.

**Session 80 note: NO SCHEMA CHANGE.** Session 80 fixed `.cyc-pop` settings popovers (plane/mode/axis/surface) going stale during a sidecol/CONTROL-card scale-drag — a pure JS/UI-state fix (`window._closeCycPops` called from two drag-start handlers). No new persisted state, nothing touching `sceneData()`, `loadAllPages()`, `_deserializePrimitives()`, the stroke pipeline, or any exporter. Version stays **4.5**. Saves written by sessions 70–80 are interchangeable.

**Session 79 note: NO SCHEMA CHANGE.** Session 79 was a direct on-device follow-up to session 78 — fixed `#ghud-bottom`'s flex-wrap reshuffling (same class of bug as `#sidetools`, a different row), rewrote the first-load sidecol auto-fit from a broken iterative loop to a direct calculation, and narrowed the three dropdown-arrow buttons. None of it touched `sceneData()`, `loadAllPages()`, `_deserializePrimitives()`, the stroke pipeline, or any exporter, and none of it touched persisted state beyond what session 78 already added. Version stays **4.5**. Saves written by sessions 70–79 are interchangeable.

**Session 108 note: NO SCHEMA CHANGE.** Session 108 replaced the `#pages` thumbnail strip with the full-screen flipbook navigator. It added two in-memory fields to each page object — `preview` (640px JPEG 0.6, the flipbook page face) and `thumb` (160px JPEG 0.5, the scrub bar), plus a `proxy` boolean marking whether they came from a real WebGL snapshot or from the vector projection used for unvisited pages. **None of the three is written to the save file.** `sceneData()` is byte-for-byte unchanged and `loadAllPages()` still initialises every page with `thumb:null` / `preview:null`, so files written by session 108 are interchangeable with everything from session 70 onward. This was a deliberate decision, not an oversight: the originating request assumed previews were already in the export and asked for them to be shrunk, when in fact they had never been persisted at all — persisting them would have grown a 24-page file by roughly 1MB. Version stays **4.5**.

The one thing to know downstream: because previews are session-memory only, a freshly loaded file has 24 pages of stroke data and zero snapshots, which is why the vector-proxy path in `_fbProxyCanvas()` exists. If a future session ever *does* decide to persist them, that is a real schema bump (add `preview`/`thumb` to the page object in `sceneData()`, bump to 4.6, and leave `loadAllPages()` tolerant of their absence for old files).

**Session 78 note: NO SCHEMA CHANGE.** Session 78 was a UI-polish pass — resolved the `#sidetools` wrap fragility for real (padding, `SC_MIN` restored to `0.5`), fixed `#sidecol` not re-anchoring on pages/views strip toggle, relocated the FINGER toggle into the eye dropdown (plus a `ui-hidden`-mode copy), tightened dropdown-arrow spacing, and added persisted preferences. None of it touched `sceneData()`, `loadAllPages()`, `_deserializePrimitives()`, the stroke pipeline, or any exporter. Version stays **4.5**. Saves written by sessions 70–78 are interchangeable.

`SC_MIN` changed again this session: `0.7 → 0.5` (restored to its pre-session-77 value now that `#sidetools`' actual margin issue is fixed, not just narrowed around). `_scState.scale` is clamped to `[SC_MIN, SC_MAX]` on load from `localStorage` (`sk3d_sc`) — a value saved as `0.55` under session 77's code will no longer be clamped up on load, since `0.5` is back within range. Not a save-format change (no migration needed; the clamp already existed, only the bound moved back).

**New this session (not save-format, but new persisted state):** `sk3d_prefs`, a new `localStorage` key holding `{stylusOnly, twoFingerMode, invertOrbitX, uiTheme}`. This is the first session where these four flags survive a reload — previously all four were explicitly session-only (see the session 59/67 notes below, now superseded for these specific flags). Still **not** part of the JSON save format — a scene file doesn't carry these, only the browser's `localStorage` does, same tier as `sk3d_sc`.

**Session 77 note: NO SCHEMA CHANGE.** Session 77 was a continuation of the sidecol/LCL UI pass — corrected the zoom-drift fix to cover `#sidecol`'s own position, flipped the stab/stab-scroll stacking order, tightened the LCL gap, moved `#sc-fab`, raised `SC_MIN`, and inverted the scroll handle's drag direction. None of it touched `sceneData()`, `loadAllPages()`, `_deserializePrimitives()`, the stroke pipeline, or any exporter. Version stays **4.5**. Saves written by sessions 70–77 are interchangeable.

`SC_MIN` (the sidecol zoom floor) changed again this session: `0.5 → 0.7` (it had been lowered `0.7 → 0.5` in session 76). `_scState.scale` is clamped to `[SC_MIN, SC_MAX]` on load from `localStorage` (`sk3d_sc`), so a value saved as `0.55` under session 76's code will load clamped up to `0.7` under session 77's — a real behavior change for anyone who saved a scale in that narrow window, but not a save-format change (no migration needed; the clamp already existed, only the bound moved).

**Session 76 note: NO SCHEMA CHANGE.** Session 76 was a wide-mode UI pass on the LCL float button and the sidecol's bottom-stack controls (scale handle, new scroll handle) — none of it touched `sceneData()`, `loadAllPages()`, `_deserializePrimitives()`, the stroke pipeline, or any exporter. Version stays **4.5**. Saves written by sessions 70–76 are interchangeable.

**Session 75 note: NO SCHEMA CHANGE.** Session 75 was a tall-mode UI pass on the floating CONTROL card — coordinate-space rewrite, summon placement, edge grips, the tall-mode call-out cluster, and a page/view strip collision audit. Nothing touched `sceneData()`, `loadAllPages()`, `_deserializePrimitives()`, the stroke pipeline, or any exporter. Version stays **4.5**. Saves written by sessions 70–75 are interchangeable.

Session 75 added several new pieces of **session-only, never-persisted** state, listed here so a future session doesn't go looking for them in the save file or `localStorage`:

| Name | Scope | Meaning |
|---|---|---|
| `window._fcEverPlaced` | app session | has the float card been positioned at all yet — first call-out gets the computed default, later ones restore `_fcLast*`. Deliberately survives `ui-hidden` toggles. |
| `window._fcLastLeft` / `_fcLastTop` / `_fcLastW` | app session | the card's last known position/size, in **rendered** pixels. Written only by `_fcPlace()`. |
| `window._fcWasDocked` | app session | was the card docked when the UI was hidden — drives re-dock on show. |
| `window._fcPreHide` | app session | `{l, t, w}` rendered rect snapshotted before the hide-UI undock. |

Note `_scState.fcScale` (the float card's `zoom`) **is** persisted — it lives in the `sk3d_sc` localStorage blob alongside `scale` / `detachedScale` / `sgScale`, clamped to `SC_MIN`–`SC_MAX` (0.5–1.0 as of session 78; was 0.7–1.0 during session 77) on load. It is not part of the JSON save format. This matters because the session-75 geometry rewrite exists specifically to behave correctly when `fcScale < 1`, and that value survives reloads — so a device that has ever pinched the card down will keep exercising that path.

**Session 73 note: NO SCHEMA CHANGE.** Session 73 was UI review and cleanup only — narrow/wide parity fixes, popover positioning, and removing 17 duplicated narrow-bar buttons. Nothing touched `sceneData()`, `loadAllPages()`, `_deserializePrimitives()`, the stroke pipeline, or any exporter. Version stays **4.5**, last bumped in session 70. Saves written by sessions 70–73 are interchangeable.

Sessions 71 and 72 likewise made no schema change (hidden-UI card behaviour and the precise-value popup respectively — both pure UI/interaction).

**Version 4.5 was introduced in session 70 (bumped that session):**

**Session 70 note:** four features landed this session — see `handoff.md`/`architecture.md`/`gotchas.md` for full detail:
1. **7 sketch layers + 1 merge layer** (was 3 + 1). Layers 0-6 are user-drawable (`BG`, `Sketch`, `Notes`, `Sketch 2`, `Sketch 3`, `Sketch 4`, `Sketch 5`); layer 7 is the special "Merged" target (was layer 3). A new module-scope constant `MERGE_LAYER=7` replaces every hardcoded `3` in merge/undo/redo logic. **No schema change** — `stroke.layer` was always a plain int, it just now ranges 0-7 instead of 0-3.
2. **Primitive count cap removed.** `PRIM_MAX` deleted entirely (was 20, blocking). Replaced with a non-blocking `_primCheckWarn()` that shows one toast at 100 objects. No schema impact.
3. **Primitive merge** (multi-select, `confirm()`-gated, no undo). Introduces a new primitive `type:'merged'` — see Primitive Schema below for its `parts[]` field, the one actual schema addition this session.
4. **Page + view naming.** Pages and per-page views now carry an optional `name` string, default-displayed as a zero-padded index (`001`, `002`...) when unset. See Page/View Object sections below.

No stroke fields changed. `sceneData()`'s top-level `version` is now `4.5`. `loadAllPages()`/`_deserializePrimitives()` default missing `name`/`parts` gracefully, so pre-4.5 saves load unchanged.


**Session 68 note:** this session's work (a drag-to-resize scale handle added to the 4 non-straight ruler shapes — see `handoff.md`/`architecture.md`/`gotchas.md` Critical Rule #25) added exactly one new session-only variable, `_shapeScale` (plus two plain numeric constants, `SCALE_MIN`/`SCALE_MAX`, not state). Same lifecycle as `_mirrored`/`_rulerType` — never written to the save file or `localStorage`, resets to `1.0` on ruler-type switch. No stroke, primitive, or save-file fields were added, changed, or removed — nothing here to migrate.

**Session 67 note:** this session's work (mirror-plane opacity bump; 4 new ruler shapes — 180°/360° protractor, 45°/30-60-90 triangle — plus a mirror toggle and rotate-snap submenu, see `handoff.md`/`architecture.md`/`gotchas.md`) touched only in-memory UI/overlay state: one material opacity constant, and new session-only ruler variables (`_rulerType`, `_mirrored`, `_rulerEdgeIdx`, `_menuSnapDeg`). None of it is written to the save file or `localStorage` — the ruler has never persisted its state across reloads (matches `_mode`/`_angle`/`_wPos` etc., all already session-only), and this session didn't change that. No stroke, primitive, or save-file fields were added, changed, or removed — nothing here to migrate.

**Note:** the Symmetry (mirror) tool (`symEnabled`, `symAxis`, `symVolAxes`, `symWorldAxes`, `symPlaneGuide` — see `handoff.md`/`architecture.md`/`gotchas.md` for full behavior) produces completely ordinary stroke objects — same `pts`/`color`/`sz`/`op`/`flat`/`layer` fields, built via the same `buildTube()` pipeline as any hand-drawn stroke — so `sceneData()`/`loadAllPages()` needed no changes at all across any iteration of this feature. The only schema-adjacent additions are a new **in-memory undo-action type**, `stroke_add_sym` (see the Undo Stack Schema table below), and five new session-only transient-state variables (see that table below). Nothing here is written to the save file or `localStorage`.

**Session 66 note:** this session's work (world-axis symmetry pivot moved to the true scene origin, plus a new opt-in mirror-plane-fill visualization — see `handoff.md`/`architecture.md`/`gotchas.md`) touched only the in-memory mirror-math function (`_mirrorPointVariant()`), the guide-line update function (`_symGuideUpdate()`), and added one new session-only flag (`symPlaneGuide`) plus two new pooled `THREE.Mesh` arrays (`_symPlaneMeshes[]`) alongside the existing guide-line pool. No stroke, primitive, or save-file fields were added, changed, or removed — nothing here to migrate.

**Session 59 note:** this session's work (NavCube preset views defaulting to ortho, new `invertOrbitX` lateral-orbit-invert toggle, see `handoff.md`/`architecture.md`/`gotchas.md`) touched only live camera state (`cam.theta`/`cam.phi`, `useOrtho`) and a new session-only UI flag — it did not change how or what gets saved. A saved per-page `views[]` entry already includes `ortho`/`orthoZoom` alongside `theta`/`phi`/`radius`/target (see below) exactly as before; this session didn't add, remove, or touch any of those fields, it just changed what `useOrtho` value tends to be true at the moment a preset-view snap happens. `invertOrbitX` itself was, at the time, explicitly not persisted to `localStorage` or the save file, same as `twoFingerMode`/`stylusOnly` — **superseded in session 78, where all three (plus `_uiTheme`) gained `localStorage` persistence via a new `sk3d_prefs` key; still not part of the JSON save format.** No stroke, primitive, or save-file fields were added, changed, or removed — nothing here to migrate.

**Session 58 note:** this session's work (segment-distance + camera-depth tie-break in `findNearestStroke()`, tap-vs-drag distance gate for select mode, input-aware pick radius via `_isPreciseInput()`, see `handoff.md`/`gotchas.md`) is entirely hit-test math and gesture-state logic (`onDown()`/`onMove()`/`_runHover()`). No stroke, primitive, or save-file fields were added, changed, or removed — nothing here to migrate.

**Session 57 note:** this session's work (selection hit-test target for the LCL gizmo, selection color scheme, see `handoff.md`/`gotchas.md`) touched only in-memory selection/highlight logic and the LCL gizmo's drag-apply code (`_lgApplyDrag()`, `_lgStartDrag()`). Selected strokes are moved/rotated/scaled via the same `mesh.matrix`/`position`/`quaternion`/`scale` properties every other transform path already uses and already persists normally — no new fields were added to strokes, primitives, or the save file.

**Session 56 note:** this session's work (gizmo rotation-snap + move-axis fix, see `handoff.md`/`gotchas.md`) was entirely in-memory drag-handler logic (`sgApplyDrag()`, `pgApplyDrag()`). No new fields were added to strokes, primitives, or the save file, and no persisted/transient state tables below changed.

Manual saves include a `thumb` field. Autosaves do not. `loadAllPages()` ignores unknown keys.

**Important (session 54):** the top-level `strokes`/`primitives` fields only mirror the **currently active page** at save time — they are NOT a complete summary of the sketchbook's content. Full multi-page content lives in `pages[]`. Any code that decides "does this save have content?" must check `pages[]` (and `primitives`), not just the top-level `strokes`. See `gotchas.md` Session 54 for the bug this caused.

```json
{
  "version": 4.5,
  "curPage": 0,
  "thumb": "data:image/jpeg;base64,...",
  "pages": [
    {
      "strokes": [ "...serialisedStrokeArray..." ],
      "views":   [ "...viewArray..." ],
      "primitives": [ "...primArray..." ],
      "name": "001"
    }
  ],
  "strokes": [ "...current page strokes..." ],
  "primitives": [ "...current page primitives..." ],
  "surf": {
    "type":  "plane|cube|cylinder|sphere|cone",
    "plane": "xz|xy|yz",
    "px": 0, "py": 0, "pz": 0,
    "rx": 0, "ry": 0, "rz": 0,
    "sc": 1,
    "sax": 1, "say": 1, "saz": 1
  }
}
```

**Not persisted (session 108):** `pages[].preview`, `pages[].thumb` and `pages[].proxy` are in-memory only. The "manual saves include a `thumb` field" note above refers to the *file*'s own single preview image, which is a different thing entirely and is unchanged.

**`pages[].name` (session 70):** optional string, `undefined`/absent when the page hasn't been renamed. Display code always falls back to a zero-padded index (`String(i+1).padStart(3,'0')` → "001", "002"...) when `name` is falsy, so old saves need no migration. Set via long-press-to-edit-mode → tap the selected thumb's name label → inline `<input>` → commit on blur/Enter (`renamePage()`). Preserved across `saveCurPage()`/`sceneData()` by reading the existing `pages[curPage].name` before the page object is rebuilt (both places rebuild the whole object each call, so the field must be explicitly carried forward or it's lost).

**`surf.type` note (session 55):** in addition to the session-53-and-earlier types, the live in-memory `surfType` can also be `'loft'` or (new in session 55) `'extrude'` — both are **ephemeral, session-memory-only** drawable surfaces, so `sceneData()` sanitizes both down to `'plane'` before writing to the save file. Neither Loft's nor Extrude's actual geometry is persisted; only the fact that *some* plane-ish surface was active. Reopening a save always lands on a flat plane even if a loft/extrude was active when it was saved.

**Not persisted:** UI theme, background color, page/view edit mode, gesture swap mode, stylus mode, Loft geometry (`_loftGeo`/`_loftCen`), Extrude geometry and its base/normal cache (`_extrudeGeo`/`_extrudeCen`/`_extrudeBase`/`_extrudeNorm`). All reset to defaults on load.

---

## Stroke Object (In-Memory)

```js
{
  pts: [Vector3, ...],       // control points
  vels: [Number, ...],       // velocity at each point (for taper)
  color: '#000000',          // hex color string
  sz: 1,                     // brush size (1–20)
  op: 0.95,                  // opacity (0.1–1.0)
  flat: false,               // flat/wide brush mode — always renders perpendicular to travel (lateral to the line), lying in the surface's tangent plane. No orientation toggle (tried and removed — see gotchas.md).
  layer: 0,                  // layer index
  mesh: Group,               // Three.js Group containing tube + caps
  _depthKey: ''              // depth cue cache key (invalidated on camera move)
}
```

### Serialized Stroke

```json
{
  "pts": [[x,y,z], [x,y,z], ...],
  "vels": [0.5, 0.8, ...],
  "color": "#000000",
  "sz": 1,
  "op": 0.95,
  "flat": false,
  "layer": 0
}
```

---

## View Object

```json
{
  "theta": 0.7,
  "phi": 1.2,
  "radius": 10,
  "target": [0, 0, 0],
  "ortho": false,
  "orthoZoom": 5,
  "thumb": "data:image/jpeg;base64,...",
  "name": "001"
}
```

**`name` (session 70):** optional string, same convention as `pages[].name` above — falsy/absent falls back to a zero-padded index in the view strip UI. Since view objects are mutated in place (`renameView()` sets `views[idx].name` directly on the array element already referenced by `pages[curPage].views`), no extra plumbing was needed to persist it through save — unlike pages, nothing rebuilds the view object wholesale on a normal edit/save cycle.

Note: the per-view `surf` snapshot inside `saveView()` stores the raw live `surfType` (unsanitized) — this predates session 55 and already behaved this way for `'loft'`; `'extrude'` now shares the same (pre-existing, untouched) behavior. This is a separate code path from `sceneData()`'s main save/autosave, which does sanitize.

---

## Primitive Schema

### In-Memory

```js
{
  id: 1,
  type: 'box|sphere|cylinder|cone|plane|loft|merged',
  color: '#ffffff',
  opacity: 1.0,
  visible: true,
  mesh: Mesh,
  position: Vector3,
  quaternion: Quaternion,
  scale: Vector3,
  profilePts: [[[x,y,z],...],...],  // loft only
  parts: [{positions,normals,indices,color,opacity}, ...]  // merged only
}
```

**Note:** Extrude (session 55) is **not** a primitive/Ref-layer object — it's a drawable surface type (see `surf.type` note above), so it never appears in `primitives[]`. Only `Loft Solid` (a different, pre-existing feature — a static multi-rail ribbon added to the Ref layer) uses `type:'loft'` here.

**`type:'merged'` (session 70):** created by `mergePrimitives(sel)` — user multi-selects 2+ ref objects in the Objects popover's merge mode, confirms a `confirm()` warning dialog (irreversible, **no undo entry is pushed**, unlike every other prim mutation), and the originals are baked to world space and combined into one `THREE.Group`. Because the source objects can be any mix of types, the merged result can't be reconstructed procedurally like `loft`'s `profilePts` — instead each child mesh's raw buffer geometry is stored verbatim in `parts[]` (one entry per original sub-mesh: `positions`/`normals`/`indices` typed-array contents as plain arrays, plus that submesh's baked `color`/`opacity`). `_deserializePrimitives()` rebuilds a `THREE.BufferGeometry` per part and re-adds each as a plain `Mesh` (no edge outline, matching the existing stroke `mergeLayer()` precedent). `duplicatePrimitive()` also knows how to clone a `merged` entry from its `parts`.

### Serialized

```json
{
  "id": 1,
  "type": "box",
  "color": "#ffffff",
  "opacity": 1.0,
  "visible": true,
  "position": [0, 0, 0],
  "quaternion": [0, 0, 0, 1],
  "scale": [1, 1, 1],
  "profilePts": null
}
```

---

### v74 notes — no format change (still 4.5)

**Merged primitives now carry a real origin.** `mergePrimitives()` still bakes each part's geometry into `parts[].positions`, but as of v74 those vertices are stored **relative to the merged object's bounding-box centre**, with that centre written to the existing `position` field. Previously the vertices were world-baked and `position` was always `[0,0,0]`, which put the object's pivot at the scene origin.

No migration and no version bump: a pre-v74 save has world-baked vertices with `position [0,0,0]` and deserialises to exactly the same place — it simply keeps the old pivot until it is merged again. `_serializePrimitives`/`_deserializePrimitives` were not changed; they already round-tripped `position`/`quaternion`/`scale` for every type including `merged`.

**Runtime-only field added to primitive entries:** `_selOutline` — the `THREE.Group` holding the selection highlight (tint + outline rings), parented to `entry.mesh`. Transient, like `_rowEl` and `_mergeSel`; never serialised, and `_serializePrimitives` picks fields explicitly so it cannot leak into a save.

**`prim_transform` undo records are now pushed from two places**, not one: the primitive gizmo (`pgStartDrag`) and the LCL gizmo (`_lgPrimDragBase`). The record shape is unchanged — `{type:'prim_transform', prim, oldPos, oldQuat, oldScale}` — and both gizmos share a single undo history for ref-object transforms.

---

## Undo Stack Schema

### Three Stacks (CRITICAL — all cleared together in `clearAll()`)

```js
const strokes = [];    // scene strokes
const redoStack = [];  // legacy redo
const _undoStack = []; // primary undo
const _redoStack = []; // primary redo
```

### Action Types

| Type | Fields | Undo | Redo |
|---|---|---|---|
| `stroke_add` | `{type, stroke}` | Remove from scene | Re-add |
| `stroke_add_sym` | `{type, stroke, mirrorStrokes:[...]}` | Remove all from scene | Re-add all |
| `stroke_delete` | `{type, stroke, index}` | Splice back at index | Remove again |
| `stroke_transform_multi` | `{type, strokes, oldMatrices, [newMatrices]}` | Restore old matrices | Swap |
| `stroke_duplicate` | `{type, newStroke}` | Remove duplicate | Re-add |
| `stroke_split` | `{type, original, originalIndex, newStrokes}` | Remove halves, restore original | Remove original, rebuild halves |
| `merge_layer` | `{type, srcLayer, origStrokes, ...}` | Restore originals | Re-merge |
| `prim_add` | `{type, prim}` | Remove from scene | Re-add |
| `prim_delete` | `{type, prim, index}` | Splice back at index | Remove again |
| `prim_transform` | `{type, prim, oldPos, oldQuat, oldScale}` | Restore old state | Swap |

**Note (session 70):** primitive **merge** (`mergePrimitives()`) is intentionally **not** on the undo stack — confirmed via a `confirm()` warning dialog at merge time instead ("this cannot be undone"), matching the explicit product decision for this feature. This is a deliberate exception to the pattern above, not an oversight.

**Note (session 60, generalized since):** `stroke_add_sym` exists specifically so one user draw gesture with Symmetry on undoes as one unit — see `gotchas.md` Critical Rule #16. `mirrorStrokes` is an array (1 to 7 entries depending on how many axes are simultaneously active) since it must cover every current Symmetry mode, not just the original single-mirror case. The strokes it references are otherwise completely ordinary, independent `strokes[]` entries once committed; nothing else in the undo/selection/transform system treats them as a group (Critical Rule #17).

**Note:** Extrude creation/editing (session 55) is **not** on the undo stack — same as Loft, it's a session-memory-only drawing-surface operation, not a scene-graph edit. Clearing an extrusion or switching direction/amount cannot be undone with Ctrl+Z; the only "undo" is rebuilding it again from the original stroke (which itself is unaffected and remains undo-able normally, since the source stroke is never deleted by the extrude operation).

---

## Layer System

Max 8 layers (indices 0–7), up from 4 as of session 70. Layers 0-6 are user sketch layers: `BG`, `Sketch`, `Notes`, `Sketch 2`, `Sketch 3`, `Sketch 4`, `Sketch 5` — colors `['#b03020',ink,'#1a9940','#e8862e','#0891b2','#be185d','#65a30d']` (index 1 uses the live theme ink color, not a fixed hex). Layer 7 is the special "Merged" target (was index 3 pre-session-70), color `#8b5cf6`. A module-scope constant `MERGE_LAYER=7` is used everywhere instead of a hardcoded number. The Ref/primitives visibility row lives in the same popover but is **not** part of this numeric layer space — it's keyed by DOM id `tb-lrow-ref`/`tb-leye-ref` and driven by the separate `_refLayerVisible` flag, unrelated to `stroke.layer`.

---

## Theme Color State (v53)

| Variable | Purpose | Set By |
|---|---|---|
| `_uiTheme` | Current theme string (`'default'`/`'dark'`/`'light'`/`'eink'`) | `setUITheme()` |
| `_inkRGB` | RGB object for canvas drawing | `setUITheme()` |
| `_themeHilight` | Highlight color for hover contrast | `setUITheme()` |
| `_curSurfTrace` | Current surface material color (mutable) | `_syncGridToBg()` |
| `_surfGridHSL` | Cached HSL for grid texture generation | `_syncGridToBg()` |
| `SURF_TRACE` | Original warm brown `0x7a5c3a` (const) | Static |
| `SURF_TRACE_EINK` | Gray `0x888888` (var) | Static |

---

## Background Presets (v53)

| Key | Hex | Description |
|---|---|---|
| `beige` | `#cdb899` | Warm parchment (default) |
| `white` | `#ffffff` | Pure white |
| `black` | `#2a2a2e` | Dark gray (matches dark theme) |

---

## Keyboard Shortcuts

### Modifier Shortcuts

| Key | Action |
|---|---|
| `Ctrl/⌘+Z` | Undo |
| `Ctrl/⌘+Shift+Z` / `Ctrl/⌘+Y` | Redo |
| `Ctrl/⌘+D` | Duplicate selected |
| `Ctrl/⌘+S` | Save file |
| `Ctrl/⌘+E` | Toggle export menu |
| `Ctrl/⌘+N` | New scene |

### Single-Key Shortcuts

| Key | Action | Key | Action |
|---|---|---|---|
| `D` | Draw mode | `]`/`[` | Brush size ±1 |
| `E` | Erase mode | `N` | Flipbook (was: pages strip) |
| `Q` | Select mode | `M` | Views strip |
| `G` | Pan mode | `=`/`-` | Zoom in/out |
| `R` | Orbit mode | `B` | Save view |
| `F` | Flat brush | `J` | Grid toggle |
| `V` | Persp/Ortho | `K` | Surface toggle |
| `X` | Depth cues | `C` | FPS mode |
| `A` | Axis lines | `1`–`9` | Recall view |
| `S` | Smooth brush | `Escape` | Clear selection |
| `W` | Velocity taper | `Delete` | Delete selected |
| `L` | Ruler | `P` | Export PNG |
| `H` | Hide/show UI | | |

Note: the flat-brush tangent/perpendicular toggle (`⊥`/`∥`, session 55) has no keyboard shortcut — button-only for now.

---

## IndexedDB Schema

```
Database: sketch3d
  Object Store: autosave
    Key: 'current'
    Value: JSON string (same format as save file, without thumb)
```

---

## Transient State (Not Persisted to the Save File)

Everything below is absent from the JSON save format. Most of it is also never written anywhere else (true session-only state, reset to these defaults on reload) — the rows marked † are the exception: as of session 78 (and session 100 for the two tap-gesture flags) they're persisted to a `localStorage` key (`sk3d_prefs`, see the session 78 and session 100 notes above), so they survive a reload, but still never appear in a `.json` scene file.

| Variable | Default | Notes |
|---|---|---|
| `_uiTheme` † | `'default'` | Theme |
| `_curSurfTrace` | `SURF_TRACE` | Adaptive surface color |
| `_surfGridHSL` | `null` | Grid texture HSL cache |
| `twoFingerMode` † | `'orbit'` | Gesture swap |
| `stylusOnly` † | `false` | Stylus mode |
| `invertOrbitX` † | `true` | Reverses lateral orbit drag direction (session 59) |
| `_mtTapGest` † | `true` | (session 100) Multi-finger tap gestures: two-finger double-tap = undo, three-finger double-tap = redo. One flag for both. Stored in `sk3d_prefs` as `tapGest`. Reset by `newScene()`. |
| `symEnabled` | `false` | Symmetry tool on/off (session 60) |
| `symAxis` | `'v'` | Default axis family: `'v'` (flips local X) \| `'h'` (flips local Y) \| `'both'` (flips both — 3 copies). Overridden whenever `symVolAxes` or `symWorldAxes` (below) has any axis active. |
| `symVolAxes` | `{x:false,y:false,z:false}` | Extra, independently-toggleable local-frame axes — only take effect when `surfType` is `'cube'`/`'cylinder'`/`'sphere'`/`'cone'`. Any non-empty subset active = that many mirrored copies (up to 7). |
| `symWorldAxes` | `{x:false,y:false,z:false}` | Extra, independently-toggleable FIXED WORLD-SPACE axes — always available regardless of `surfType`, ignores the surface's rotation entirely. Same non-empty-subset combination rule as `symVolAxes`. Mutually exclusive with `symVolAxes` (activating one clears the other, enforced in the dropdown wiring, not just convention). As of session 66, this family also pivots on the true world origin `(0,0,0)` instead of `surfPos` — see `gotchas.md` Critical Rule #21. |
| `symPlaneGuide` | `false` | (session 66) Opt-in extra cue — also renders the active mirror plane(s) as a translucent light-red fill, independent of and combinable with any axis family. See `gotchas.md` Critical Rule #22. |
| `_partialErase` | `false` | Partial erase mode |
| `_lastFaceNormal` | `null` | Stored but unused |
| `window._loftGeo` / `window._loftCen` | `null` / `null` | Loft's built geometry + centroid, session-memory only |
| `window._extrudeGeo` / `window._extrudeCen` | `null` / `null` | (v55) Extrude's built geometry + centroid, session-memory only |
| `window._extrudeBase` / `window._extrudeNorm` | `null` / `null` | (v55) cached base-curve points + per-point unit surface-normal vectors ("standing" axis); source of truth for all live slider/mode/axis edits |
| `window._extrudeSide` | `null` | cached per-point in-plane unit vectors (curve tangent × surface normal) — the "90°" axis, lying sideways in the surface's tangent plane instead of standing up out of it |
| `window._extrudeAxisMode` | `'normal'` | `'normal'` (standing, along surface normal) \| `'side'` (90° from normal, in-plane) — toggled via `#ex-axis` next to the slider |
| `window._extrudeAmt` | `0.3` | (v55) current extrusion distance in world units (each side, depending on mode). **No fixed maximum** — the `#ex-sld` slider maps to this via a tangent curve (`amt=1.2*tan(t*π/2)`), not linearly, so the practical range is unbounded even though the slider itself has finite travel. See `gotchas.md`. |
| `window._extrudeMode` | `'both'` | (v55) `'both'` \| `'plus'` \| `'minus'` |
| `_rulerType` | `'straight'` | (session 67) `'straight'` \| `'prot180'` \| `'prot360'` \| `'tri45'` \| `'tri3060'` |
| `_mirrored` | `false` | (session 67) Triangle-only; flips which corner holds the right angle. Reset to `false` on `_setRulerType()` switch. |
| `_menuSnapDeg` | `0` | (session 67) `0` (off, falls back to magnetic 45° snap) \| `15` \| `45` — explicit rotate-snap submenu choice |
| `_rulerEdgeIdx` | `-1` | (session 67) Which edge of a non-straight shape the current stroke is locked to; reset on stroke end |
| `_shapeScale` | `1.0` | (session 68) Uniform size multiplier for the 4 non-straight ruler shapes, clamped `[0.4, 2.5]`. Drag-handle controlled (see `gotchas.md` Critical Rule #25). Reset to `1.0` on `_setRulerType()` switch. |


---

## Session 101 — no schema change

Save format stays **4.5**. `sk3d_prefs` gained no keys.

The topbar-hidden state added this session (`body.tb-hidden`, toggled by `#btbhide`) is deliberately **session-only** — not written to `sk3d_prefs`, not read by `_loadPrefs()`, not reset by `newScene()`. It is a momentary "get the chrome out of the way" action rather than a preference, and was confirmed as such before implementation. If a future session decides it should persist, it needs a key in `sk3d_prefs`, a read in `_loadPrefs()`, **and** a `newScene()` reset line — all three, per the factory-reset completeness rule.

The layout constants changed this session (`NAV_HDR_MIN_W` 160→149, new `NAV_CANVAS_MIN_W`/`NAV_PANEL_MIN_W`, `FC_MIN_W` 329→307, `PB_COLORS_MIN_ZOOM`) are code constants, not persisted state — same category as `SC_MIN`'s repeated moves in sessions 76–78, and for the same reason not a schema change.

---

## Session 102 — no schema change

Save format stays **4.5**. No `sk3d_prefs` keys added or changed.

The only state-adjacent change is that `newScene()`'s perspective reset now goes through `window._syncPerspBtns(useOrtho)` instead of writing one button's label by hand. That corrects a factory-reset completeness gap (two of the three perspective controls were not being reset), but `useOrtho` itself was already reset correctly — this is a UI-sync fix, not a persisted-state change.

---

## Session 103 — no schema change

Save format stays **4.5**. No `sk3d_prefs` keys added or changed.

`activeLayer` is unchanged in both value and persistence — session 103 only moved where it is *displayed*, from a standalone `#pb-layer-dot` in the narrow bar to a `<circle id="blayers-dot">` inside `#topbar`'s layers glyph. The layer colour table (`dotColors`) is unchanged, including layer 1's theme-dependent `_themeInk(1)` entry.
