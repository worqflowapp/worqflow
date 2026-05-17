# Worqflow Dev Log

---

## Session 1 — Initial Build
**Commits:** `5045736` → `cca96b6` → `7ee2442` → `d19b124`

Built the entire app from scratch as a single-file React component:
- Kanban board: 4 columns (On Deck / In Progress / Completed QC / Delivered)
- 4 tech rows (Type S, LA, Darcheezy, Jason)
- PIN login (7 users/roles: admin, manager, advisor, techs)
- Staging queues (Main Shop, PDI, Used Cars)
- Waiting on Parts queue
- New RO modal with full vehicle/customer fields
- RO Detail sheet (3 C's, notes thread, timer, hours picker)
- Clock in/out (admin only)
- Activity tracker (Moving Cars, Parts Run)
- Archive + restore
- Analytics screen (Overview/Tech/Efficiency tabs)
- Settings (service types, job presets)
- Change PIN
- Firebase Firestore wired in from the start

---

## Session 2 — Firebase Sync Fix
**Commits:** `e43c0e8` → `80699c4` → `d214a0c` → `0918fd3` → `ef7da5b`

**Problem:** Firestore sync wasn't working — changes on phone didn't appear on laptop.

**Root causes found and fixed:**
1. **Write-back loop** — `isRemote` flag was reset with a 300ms `setTimeout` inside `onSnapshot`, but `scheduleSave` fired at 800ms. By the time the save ran, `isRemote` was already false → every remote update triggered a write back → devices fought each other. Fixed by capturing `const fromRemote = isRemote.current` and clearing it atomically INSIDE the 800ms debounce.
2. **No document seeding** — if `shopstate/main` didn't exist in Firestore, devices never synced. Fixed by adding `setDoc(ref, stateRef.current)` in the `else` branch of `onSnapshot`.
3. **stateRef** — added `useRef` mirror of state so the seed write has current data without stale closure.
4. **Mobile long press** — `onTouchMove` was missing so finger drift didn't cancel the hold; iOS native context menu fired at ~500ms stealing the gesture. Fixed with `onTouchMove={cancelPress}` and `onContextMenu={e => e.preventDefault()}`.

---

## Session 3 — UI Restoration
**Commits:** `e6cd4a2` → `d182c02` → `fa04073`

**Problem:** User wanted the original UI (from PDF source) restored while keeping all Firebase logic.

**What happened:**
- Extracted source code from `ShopFlowTracker.pdf` using `pypdf` → `/tmp/shopflow_source.txt`
- Copied source as new ShopFlowTracker.jsx, inserted Firebase sync block, applied mobile long-press fix
- **PDF extraction artifacts fixed:**
  - 26 broken multi-line string literals (emoji stripped → bare newlines inside JS strings)
  - `DEFAULT_QUEUES` and `ACTIVITIES` emoji values stripped → replaced with real emoji
  - `const BORDER2` and `const TEXT` merged onto one line → `TEXT` was never declared → `ReferenceError` crashed the entire app on load (blank screen)
  - Schema migration: Firestore had old data format (different field names) → `Object.values(s.timers)` threw on undefined → app crashed 1 second after load. Fixed by merging Firestore snapshot with `freshState()` defaults in `onSnapshot` handler.

---

## Session 4 — Polish Pass
**Commits:** `c948569` → `bc4bc88` → `52f074e` → `b647bf9`

### Card consistency fix
Job pills in `abbrevJob()` used Tailwind light-theme colors (`#FFF7ED`, `#EEF4FF`, etc.) — solid white blobs on dark OLED cards. Replaced all with dark rgba tints + bright text colors.

### Sample ROs across all columns
`freshState()` grid updated to spread sample ROs across all 4 techs and all columns for sync testing. Also added ro to Parts queue.

### Storage key bump
`sft-v20` → `sft-v21` to force all clients to load `freshState()` instead of old localStorage data.

### Invisible header buttons
Analytics, Time Clock, Activity Tracker, Change PIN buttons were 36×36 blank invisible squares — their emoji icons were stripped by PDF extraction. Added proper SVG icon components: `AnalyticsIcon`, `TimeClockIcon`, `ActivityIcon`, `KeyIcon`.

### Performance
- Tick interval: was calling `setState(s => ({...s}))` every second on the main 2000-field state object, causing full board re-render every second. Changed to `setTick(t => t+1)` on isolated counter state.
- `ROCard` wrapped in `React.memo` — skips re-render when card's props haven't changed. Prevents full board repaint on every Firebase sync.

### Long press — Pointer Events rewrite
Replaced `onTouchStart/Move/End` + `onMouseDown/Up/Leave` (with `e.preventDefault()`) with unified `onPointerDown/Move/Up/Cancel`. Key improvements:
- No `e.preventDefault()` → browser handles scroll naturally, interactions don't feel sticky
- `setPointerCapture` — keeps gesture alive if finger drifts off card edge
- `touchAction: "manipulation"` — eliminates 300ms tap delay without blocking scroll
- 12px movement dead zone before cancelling hold
- Hold threshold: 600ms → 700ms

---

## Session 5 — Display Mode + Hours Tracker
**Commits:** `fb7227a` → `a1beb7d` → `99a2e71` → `77e8827` → `698dfee` → `99fac4e` → `378dec8` → `903f237` → `acdb64f` → `b4e286c` → `b03869e` → `e780b16`

### Display Mode (PIN 9999)
Added a read-only TV/wall board mode. `isDisplay = currentUser?.role === "display"` triggers an early return rendering a completely separate 5-zone fixed layout (100vh, no scroll):

| Zone | Height | Content |
|------|--------|---------|
| 1 | 7vh | Header with logo, hours tracker, live clock |
| 2 | 4vh | Column headers |
| 3 | 52vh | Kanban grid |
| 4 | 16vh | Waiting on Parts |
| 5 | 21vh | Staging queues |

### Hours Goal Tracker
Center of Zone 1 header shows:
- Total flagged hours vs `GOAL_HOURS` target with a progress bar
- Revenue estimate (`flagged hours × labor rate`)
- Per-tech chips showing individual hours with color coding (green ≥8h, orange ≥4h, red <4h)

### DisplayCard — final working design
After multiple iterations, the correct approach is:

**DO NOT pass a `cardHeight` prop. DO NOT set `height/minHeight/maxHeight` in pixels on the card.**

The working pattern:
- Card shell: `height:'100%'` — fills whatever wrapper it's in
- Each card in a cell is wrapped in `<div style={{ flex:1, minHeight:0, overflow:'hidden' }}>`
- Cell container: `display:flex, flexDirection:column, gap:4`
- 1 card → wrapper `flex:1` = 100% of cell → card fills it
- 2 cards → each wrapper `flex:1` = 50% each → no math needed
- N cards → equal split automatically

3 rows always rendered (never conditional):
- Row 1: RO number + service type
- Row 2: Vehicle (bold) + Customer — `flex:1, justifyContent:'center'`
- Row 3: Job pills + timer + hours

`justifyContent:'space-between'` on 3 rows (not 5) distributes cleanly without overlap.

### What went wrong in earlier attempts
1. **5-row layout with `space-between`** — when 5 rows totaled more px than the card height, flexbox created negative gaps and rows literally overlapped each other, covering the vehicle text.
2. **Fixed `cardHeight` prop via pixel math** — `calcCardHeight()` and `cellHeightPx` state computed card heights from `window.innerHeight`, but the computed values didn't match actual CSS-rendered heights (zone padding/gap discrepancies). Cards were either too tall or too short.
3. **`flex:1` on card with no `height:100%` on shell** — card shell grew but content didn't fill it correctly.

The root fix: let CSS do the work. Wrapper `flex:1` + card `height:100%` is the only reliable approach.

---

## Firestore Management
To delete `shopstate/main` (forces fresh seed on next page load):
```bash
cd /Users/adnanqamar/worqflow
node -e "const {initializeApp}=require('firebase/app'),{getFirestore,doc,deleteDoc}=require('firebase/firestore'),app=initializeApp({apiKey:'AIzaSyDhh-lq9b8AtN7BEu8cDDXoGI_FlrKvRxg',projectId:'worqflow-67bff'}),db=getFirestore(app);deleteDoc(doc(db,'shopstate','main')).then(()=>{console.log('done');process.exit()})"
```
