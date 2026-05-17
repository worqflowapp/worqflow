# Worqflow — Claude Code Project Context

## What This Is
Auto dealership service department kanban board. Built for real shop use — techs move repair orders (ROs) through columns, advisors track hours, admin manages everything.

**Live URL:** https://worqflow.vercel.app  
**GitHub:** https://github.com/worqflowapp/worqflow  
**Firebase project:** worqflow-67bff  
**Firestore doc:** `shopstate/main` (single document holds all app state)

---

## Tech Stack
- React + Vite (no TypeScript)
- Firebase Firestore — real-time sync across devices
- Vercel — auto-deploys on every push to `main`
- Single-file component: `src/ShopFlowTracker.jsx` (~2700 lines)
- Font: Space Grotesk
- Theme: Apple iOS dark / OLED black

---

## Login PINs (for testing)
| User | Role | PIN |
|------|------|-----|
| AD | admin | 052513 |
| Jay | manager | 1000 |
| Mario | advisor | 2000 |
| Type S | tech | 1111 |
| LA | tech | 2222 |
| Darcheezy | tech | 3333 |
| Jason | tech | 4444 |

---

## Architecture

### State
All app state lives in one object (`state`/`setState`). Shape defined by `freshState()` in ShopFlowTracker.jsx:
```
{
  techs, queues, ros, nextNum,
  grid: { [techId]: { ondeck, inprogress, completed, delivered } },
  partsSlots, qSlots, timers, archived,
  serviceTypes, jobPresets,
  completedByTech, activityLog, timeClockLog
}
```

### Firebase Sync (critical — do not break)
Located around line 2375–2430 in ShopFlowTracker.jsx.

- `isRemote` ref: prevents write-back loops when a remote snapshot arrives
- `stateRef` ref: mirrors state so the onSnapshot seed write has current data
- `onSnapshot`: listens to `shopstate/main`. If doc exists → merges with `freshState()` defaults and calls `setState`. If doc doesn't exist → seeds Firestore with `stateRef.current`
- `scheduleSave`: 800ms debounced save. Saves to localStorage (`sft-v21`) AND Firestore. Skips Firestore write if `fromRemote` is true.

**The merge in onSnapshot is important** — it handles schema migrations when the Firestore document has old/missing fields. Always keep the explicit field merges (timers, grid, qSlots, etc.)

### Storage Key
`STORAGE_KEY = "sft-v21"` — bump this (v22, v23...) whenever you need to force all clients to load freshState() instead of old localStorage data.

---

## Key Files
```
worqflow/
├── src/
│   ├── ShopFlowTracker.jsx   ← entire app (components + logic)
│   ├── firebase.js           ← Firebase init (do not modify)
│   ├── App.jsx               ← just renders <ShopFlowTracker />
│   └── main.jsx              ← React root
├── CLAUDE.md                 ← this file
├── DEVLOG.md                 ← full history of changes
└── package.json
```

---

## Component Map (all in ShopFlowTracker.jsx)
| Component | Purpose |
|-----------|---------|
| `LoginScreen` | PIN login with numpad |
| `ROCard` | Kanban card — memo-wrapped, Pointer Events for hold-to-move |
| `RODetail` | Full RO edit sheet (3 C's, notes, timer, hours) |
| `NewROModal` | Create new RO form |
| `ArchiveModal` | View/restore archived ROs |
| `AnalyticsScreen` | Overview / Tech / Efficiency tabs |
| `TimeClockReport` | Clock in/out log (admin only) |
| `ActivityTracker` | Moving Cars / Parts Run tracking |
| `ServiceTypeSettings` | Edit service types + job presets |
| `ChangePinModal` | User PIN change |
| `Sheet` | Reusable bottom modal wrapper |

---

## Known Issues / Watch Out For
1. **PDF extraction artifacts** — the original source was extracted from a PDF. Multiple rounds of broken multi-line strings and merged `const` declarations were fixed. If something looks syntactically weird, check nearby lines for merged code.
2. **Firestore schema** — the Firestore document may have data from old app versions. The onSnapshot merge handles this but always keep the explicit field fallbacks.
3. **Storage key** — if users see stale/broken data, bump `STORAGE_KEY` and re-delete the Firestore document.
4. **Deleting Firestore doc** — can be done with this one-liner from inside `/Users/adnanqamar/worqflow/`:
   ```
   node -e "const {initializeApp}=require('firebase/app'),{getFirestore,doc,deleteDoc}=require('firebase/firestore'),app=initializeApp({apiKey:'AIzaSyDhh-lq9b8AtN7BEu8cDDXoGI_FlrKvRxg',projectId:'worqflow-67bff'}),db=getFirestore(app);deleteDoc(doc(db,'shopstate','main')).then(()=>{console.log('done');process.exit()})"
   ```

---

## Things Still To Work On (running list)
- [ ] Laptop performance still feels slower than mobile (memo helps but more optimization possible)
- [ ] Analytics screen — verify all tabs (Overview, Tech, Efficiency) show real data
- [ ] Clock in/out admin area needs testing with real users
- [ ] Long press to move cards — recently switched to Pointer Events API, needs real-world testing
- [ ] HoursPicker and other modals use light-theme colors (need dark theme audit)
- [ ] No offline support — app breaks without internet
- [ ] No push notifications for RO updates
- [ ] Admin: ability to add/remove techs
- [ ] Better promise time handling (currently stores raw datetime string)
