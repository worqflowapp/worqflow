import { useSaveToFirebase, useLoadFromFirebase } from "./useFirebaseSync";
import { useState, useEffect, useRef } from "react";

if (typeof document !== "undefined" && !document.getElementById("sft-font")) {
  const l = document.createElement("link");
  l.id = "sft-font";
  l.rel = "stylesheet";
  l.href = "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700;800&display=swap";
  document.head.appendChild(l);
}
if (typeof document !== "undefined" && !document.getElementById("sft-styles")) {
  const s = document.createElement("style");
  s.id = "sft-styles";
  s.textContent = [
    "@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.35} }",
    "@keyframes fade-in { from{opacity:0;transform:translateY(6px) scale(0.98)} to{opacity:1;transform:translateY(0) scale(1)} }",
    "@keyframes slide-up { from{transform:translateY(40px);opacity:0} to{transform:translateY(0);opacity:1} }",
    "@keyframes card-in { from{opacity:0;transform:translateY(10px) scale(0.96)} to{opacity:1;transform:translateY(0) scale(1)} }",
    "@keyframes urgent-glow { 0%,100%{box-shadow:0 0 0 0 rgba(255,69,58,0)} 50%{box-shadow:0 0 0 3px rgba(255,69,58,0.3)} }",
    "@keyframes shimmer { from{background-position:-200px 0} to{background-position:200px 0} }",
    "@keyframes count-up { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }",
    "@keyframes snap-in { from{opacity:0;transform:scale(0.95)} to{opacity:1;transform:scale(1)} }",
    "@keyframes tick { 0%{opacity:1} 49%{opacity:1} 50%{opacity:0.7} 100%{opacity:1} }",
    "@keyframes shake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-8px)} 40%{transform:translateX(8px)} 60%{transform:translateX(-4px)} 80%{transform:translateX(4px)} }",
    "* { -webkit-tap-highlight-color: transparent; }",
    "input, select, textarea { color-scheme: dark; }",
    "::-webkit-scrollbar { width: 0px; }",
    ".card-press:active { transform: scale(0.97) !important; transition: transform 0.08s ease !important; }",
    ".col-snap { scroll-snap-type: x mandatory; }",
    ".col-snap-item { scroll-snap-align: start; }",
    ".pad-btn { -webkit-tap-highlight-color: transparent; user-select: none; -webkit-user-select: none; }",
    ".pad-btn:active { transform: scale(0.88) !important; background: rgba(255,255,255,0.18) !important; }",
  ].join(" ");
  document.head.appendChild(s);
}

const BG = "#000000";
const SURFACE = "rgba(255,255,255,0.05)";
const SURFACE2 = "rgba(255,255,255,0.09)";
const BORDER = "rgba(255,255,255,0.08)";
const BORDER2 = "rgba(255,255,255,0.14)";
const TEXT = "#FFFFFF";
const TEXT2 = "rgba(255,255,255,0.7)";
const TEXT3 = "rgba(255,255,255,0.4)";
const ACCENT = "#0A84FF";
const ACCENT2 = "rgba(10,132,255,0.15)";
const SUCCESS = "#30D158";
const WARN = "#FF9F0A";
const DANGER = "#FF453A";
const CARD_BG = "rgba(28,32,48,0.95)";
const CARD_TOP = "rgba(255,255,255,0.13)";
const CARD_BORDER = "rgba(255,255,255,0.07)";
const CARD_SHADOW = "0 1px 0 rgba(255,255,255,0.10) inset, 0 -1px 0 rgba(0,0,0,0.4) inset, 0 4px 20px rgba(0,0,0,0.3)";
const CELL_BG = "rgba(8,10,18,0.7)";
const CELL_SHADOW = "inset 0 2px 8px rgba(0,0,0,0.5), inset 0 1px 3px rgba(0,0,0,0.6)";
const TECH_BG = "rgba(22,26,42,0.98)";
const SHEET_BG = "#13161F";
const INPUT_BG = "rgba(255,255,255,0.06)";
const SUB = "rgba(255,255,255,0.5)";
const MUTED = "rgba(255,255,255,0.28)";

const COLS = [
  { id:"ondeck",    label:"On Deck",        color:"#0A84FF", bg:"rgba(10,132,255,0.07)",   border:"rgba(10,132,255,0.15)" },
  { id:"inprogress",label:"In Progress",    color:"#FF9F0A", bg:"rgba(255,159,10,0.07)",   border:"rgba(255,159,10,0.15)" },
  { id:"completed", label:"Completed / QC", color:"#30D158", bg:"rgba(48,209,88,0.07)",    border:"rgba(48,209,88,0.15)"  },
  { id:"delivered", label:"Delivered",      color:"#636366", bg:"rgba(99,99,102,0.07)",    border:"rgba(99,99,102,0.15)"  },
];

const PARTS_COL = { id:"waiting", color:"#BF5AF2", bg:"rgba(191,90,242,0.07)", border:"rgba(191,90,242,0.15)" };

const USERS = [
  { id:"admin",   name:"AD",         role:"admin",   pin:"052513" },
  { id:"manager", name:"Jay",        role:"manager", pin:"1000"   },
  { id:"advisor", name:"Mario",      role:"advisor", pin:"2000"   },
  { id:"t1",      name:"Type S",     role:"tech",    pin:"1111"   },
  { id:"t2",      name:"LA",         role:"tech",    pin:"2222"   },
  { id:"t3",      name:"Darcheezy",  role:"tech",    pin:"3333"   },
  { id:"t4",      name:"Jason",      role:"tech",    pin:"4444"   },
];

const SAMPLE_ROS = [
  { id:"ro-1001", roNum:"RO-1001", promiseTime:"", roNotes:[], serviceType:"st-main", year:"2021", make:"Toyota",  model:"Camry",   customer:"John Smith",   priority:"NORMAL", jobs:"Oil Change, Tire Rotation", hours:"1.5", waitStatus:"dropoff" },
  { id:"ro-1002", roNum:"RO-1002", promiseTime:"", roNotes:[], serviceType:"st-main", year:"2019", make:"Honda",   model:"Accord",  customer:"Sarah Jones",  priority:"HIGH",   jobs:"Brake Pads, Brake Rotors", hours:"3",   waitStatus:"waiting"  },
  { id:"ro-1003", roNum:"RO-1003", promiseTime:"", roNotes:[], serviceType:"st-pdi",  year:"2024", make:"Ford",    model:"F-150",   customer:"Stock #4421",  priority:"NORMAL", jobs:"PDI",              hours:"1",   waitStatus:"none"     },
  { id:"ro-1004", roNum:"RO-1004", promiseTime:"", roNotes:[], serviceType:"st-used", year:"2018", make:"Chevy",   model:"Malibu",  customer:"Used Recon",   priority:"LOW",    jobs:"Diagnostic, Detail",       hours:"2",   waitStatus:"none"     },
  { id:"ro-1005", roNum:"RO-1005", promiseTime:"", roNotes:[], serviceType:"st-main", year:"2022", make:"Nissan",  model:"Altima",  customer:"Mike Davis",   priority:"NORMAL", jobs:"Alignment, Shocks/Struts", hours:"2.5", waitStatus:"dropoff"  },
  { id:"ro-87045",roNum:"RO-87045",promiseTime:"", roNotes:[], serviceType:"st-main", year:"2020", make:"BMW",     model:"330i",    customer:"Chris Lee",    priority:"HIGH",   jobs:"Diagnostic",               hours:"1",   waitStatus:"waiting"  },
  { id:"ro-55922",roNum:"RO-55922",promiseTime:"", roNotes:[], serviceType:"st-main", year:"2023", make:"Mercedes",model:"C300",    customer:"Amy Wilson",   priority:"NORMAL", jobs:"Oil Change",               hours:"0.5", waitStatus:"dropoff"  },
  { id:"ro-56003",roNum:"RO-56003",promiseTime:"", roNotes:[], serviceType:"st-main", year:"2017", make:"Jeep",    model:"Wrangler",customer:"Tom Brown",    priority:"LOW",    jobs:"Tire Rotation, Wiper Blades",hours:"1", waitStatus:"none"     },
];

const DEFAULT_TECHS = USERS.filter(u => u.role === "tech").map(u => ({ id: u.id, name: u.name }));
const DEFAULT_QUEUES = [
  { id:"q-main", name:"Main Shop Work", subtitle:"Priority #1",            color:"#EF4444", icon:"🔴" },
  { id:"q-pdi",  name:"PDIs",           subtitle:"Pre-Delivery Inspections",color:"#9333EA", icon:"🟣" },
  { id:"q-used", name:"Used Cars",      subtitle:"Secondary Priority",      color:"#16A34A", icon:"🟢" },
];
const STORAGE_KEY = "sft-v20";
const GOAL_HOURS = 40;

const DEFAULT_SERVICE_TYPES = [
  { id:"st-main", name:"Main Shop", color:"#EF4444", bg:"rgba(239,68,68,0.08)"  },
  { id:"st-pdi",  name:"PDI",       color:"#9333EA", bg:"#FAF5FF"               },
  { id:"st-used", name:"Used Cars", color:"#16A34A", bg:"#F0FDF4"               },
];

const DEFAULT_JOB_PRESETS = [
  "Oil Change","Tire Rotation","Brake Pads","Brake Rotors","Alignment",
  "Diagnostic","Battery","Air Filter","Cabin Filter","Spark Plugs",
  "Trans Flush","Coolant Flush","Brake Flush","Fuel Filter","Wiper Blades",
  "Serpentine Belt","Timing Belt","Water Pump","Alternator","Starter",
  "A/C Service","Shocks/Struts","Wheel Bearing","CV Axle","Tie Rod",
  "General Inspection","PDI","Detail",
];

function freshState() {
  return {
    techs: DEFAULT_TECHS,
    queues: DEFAULT_QUEUES,
    ros: SAMPLE_ROS,
    nextNum: 1006,
    grid: {
      t1: { ondeck:[],          inprogress:[], completed:[], delivered:[] },
      t2: { ondeck:["ro-1005"], inprogress:[], completed:[], delivered:[] },
      t3: { ondeck:["ro-1003"], inprogress:[], completed:[], delivered:[] },
      t4: { ondeck:["ro-1002"], inprogress:[], completed:[], delivered:[] },
    },
    partsSlots: [],
    completedByTech: {},
    activityLog: [],
    timeClockLog: [],
    qSlots: { "q-main":["ro-87045","ro-55922","ro-56003"], "q-pdi":[], "q-used":["ro-1004","ro-1001"] },
    timers: {},
    archived: [],
    serviceTypes: DEFAULT_SERVICE_TYPES,
    jobPresets: DEFAULT_JOB_PRESETS,
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      return { ...freshState(), ...p, techs: p.techs || DEFAULT_TECHS, queues: p.queues || DEFAULT_QUEUES };
    }
  } catch(e) {}
  return freshState();
}

function saveState(s) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch(e) {}
}

function initials(name) {
  return name.split(" ").map(w => w[0]).join("").slice(0,2).toUpperCase();
}

function fmtTime(secs) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m + "m " + String(s).padStart(2,"0") + "s";
}

function abbrevJob(j) {
  const v = j.toLowerCase().trim();
  if (v.includes("oil"))    return { label:"Oil",   bg:"#FFF7ED", color:"#C2410C" };
  if (v.includes("brake"))  return { label:"Brks",  bg:"#FFF1F2", color:"#BE123C" };
  if (v.includes("diag"))   return { label:"Diag",  bg:"#EEF4FF", color:"#1D4ED8" };
  if (v.includes("trans"))  return { label:"Trans", bg:"#FAF5FF", color:"#7E22CE" };
  if (v.includes("tire"))   return { label:"Tires", bg:"#F0FDF4", color:"#15803D" };
  if (v.includes("align"))  return { label:"Algn",  bg:"#F0FDF4", color:"#15803D" };
  if (v.includes("coolant"))return { label:"Cool",  bg:"#ECFEFF", color:"#0E7490" };
  if (v.includes("flush"))  return { label:"Flush", bg:"#ECFEFF", color:"#0E7490" };
  if (v.includes("filter")) return { label:"Fltr",  bg:"#FFF7ED", color:"#C2410C" };
  if (v.includes("spark"))  return { label:"Plugs", bg:"#FFFBEB", color:"#B45309" };
  if (v.includes("battery"))return { label:"Batt",  bg:"#FFFBEB", color:"#B45309" };
  if (v.includes("inspect"))return { label:"Insp",  bg:"#F8FAFC", color:"#475569" };
  if (v.includes("pdi"))    return { label:"PDI",   bg:"#FAF5FF", color:"#7E22CE" };
  if (v.includes("ac") || v.includes("a/c")) return { label:"A/C", bg:"#ECFEFF", color:"#0E7490" };
  if (v.includes("rotat"))  return { label:"Rot",   bg:"#F0FDF4", color:"#15803D" };
  if (v.includes("wiper"))  return { label:"Wprs",  bg:"#F8FAFC", color:"#475569" };
  if (v.includes("belt"))   return { label:"Belt",  bg:"#FFFBEB", color:"#B45309" };
  if (v.includes("pump"))   return { label:"Pump",  bg:"#ECFEFF", color:"#0E7490" };
  if (v.includes("axle") || v.includes("cv")) return { label:"Axle", bg:"#FEF2F2", color:"#991B1B" };
  if (v.includes("shocks") || v.includes("strut")) return { label:"Susp", bg:"#FEF2F2", color:"#991B1B" };
  if (v.includes("wheel"))  return { label:"WhlB",  bg:"#FEF2F2", color:"#991B1B" };
  if (v.includes("detail")) return { label:"Dtl",   bg:"#F8FAFC", color:"#475569" };
  if (v.includes("general"))return { label:"Gen",   bg:"#F8FAFC", color:"#475569" };
  return { label: j.slice(0,4), bg:"#F8FAFC", color:"#475569" };
}

function priorityBorder(p) {
  if (p === "HIGH") return "#EF4444";
  if (p === "LOW")  return "#94A3B8";
  return "#1D6BF3";
}

function totalFlaggedHours(state) {
  let sum = 0;
  Object.values(state.grid).forEach(cols => {
    Object.values(cols).forEach(ids => {
      ids.forEach(id => {
        const ro = state.ros.find(r => r.id === id);
        if (ro && ro.hours) sum += parseFloat(String(ro.hours).replace(/[^0-9.]/g,"")) || 0;
      });
    });
  });
  return sum;
}

function useIsWide() {
  const [wide, setWide] = useState(window.innerWidth >= 768);
  useEffect(() => {
    const fn = () => setWide(window.innerWidth >= 768);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);
  return wide;
}

// Icons
function PlusIcon()    { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>; }
function PlayIcon()    { return <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>; }
function PauseIcon()   { return <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>; }
function XIcon()       { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>; }
function ClockIcon()   { return <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>; }
function DollarIcon()  { return <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>; }
function EditIcon()    { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>; }
function TrashIcon()   { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>; }
function ArchiveIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>; }
function LogoutIcon()  { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>; }
function BoxIcon()     { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/></svg>; }
function SettingsIcon(){ return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>; }
function ChevDownIcon(){ return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>; }
function ChevUpIcon()  { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="18 15 12 9 6 15"/></svg>; }

const labelStyle = {
  display:"block", fontSize:10, fontWeight:700, color:"rgba(255,255,255,0.35)",
  textTransform:"uppercase", letterSpacing:"0.8px", marginBottom:6,
};
const inputStyle = {
  padding:"13px 14px", border:"none", borderRadius:12, fontSize:15,
  color:TEXT, background:INPUT_BG, outline:"none",
  fontFamily:"-apple-system,BlinkMacSystemFont,'SF Pro Text',sans-serif",
  width:"100%", boxSizing:"border-box", colorScheme:"dark", letterSpacing:"-0.1px",
  boxShadow:"inset 0 0 0 0.5px rgba(255,255,255,0.1)",
};

function JobFieldTrigger({ value, onOpen }) {
  const jobs = value ? value.split(",").map(j => j.trim()).filter(Boolean) : [];
  return (
    <div>
      <label style={labelStyle}>Job Types</label>
      <button onClick={onOpen} style={{ width:"100%", padding:"12px 14px", border:"1.5px solid "+BORDER, borderRadius:12, background:INPUT_BG, display:"flex", alignItems:"center", gap:8, cursor:"pointer" }}>
        {jobs.length === 0 ? (
          <span style={{ color:MUTED, fontSize:14 }}>Tap to select job types…</span>
        ) : (
          <div style={{ display:"flex", gap:5, flexWrap:"wrap", flex:1 }}>
            {jobs.map((j,i) => {
              const ab = abbrevJob(j);
              return <span key={i} style={{ background:ab.bg, color:ab.color, fontSize:11, fontWeight:600, padding:"3px 8px", borderRadius:6 }}>{j}</span>;
            })}
          </div>
        )}
        <span style={{ color:MUTED, fontSize:18, flexShrink:0 }}>›</span>
      </button>
    </div>
  );
}

function JobPicker({ value, onChange, presets, onClose }) {
  const selected = value ? value.split(",").map(j => j.trim()).filter(Boolean) : [];
  const [custom, setCustom] = useState("");
  function toggle(job) {
    const exists = selected.includes(job);
    const next = exists ? selected.filter(j => j !== job) : [...selected, job];
    onChange(next.join(", "));
  }
  function addCustom() {
    const j = custom.trim();
    if (!j) return;
    if (!selected.includes(j)) onChange([...selected, j].join(", "));
    setCustom("");
  }
  function removeJob(job) { onChange(selected.filter(j => j !== job).join(", ")); }
  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose(); }} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", zIndex:4000, display:"flex", alignItems:"flex-end", justifyContent:"center" }}>
      <div style={{ background:SHEET_BG, borderRadius:"22px 22px 0 0", width:"100%", maxWidth:540, maxHeight:"80vh", display:"flex", flexDirection:"column" }}>
        <div style={{ width:36, height:4, background:"#E5E7EB", borderRadius:2, margin:"12px auto 0" }} />
        <div style={{ padding:"12px 18px 10px", borderBottom:"1px solid "+BORDER, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div>
            <div style={{ fontWeight:800, fontSize:17, color:"#F0F4FF" }}>Job Types</div>
            <div style={{ fontSize:11, color:"rgba(255,255,255,0.35)", marginTop:1 }}>Tap to toggle</div>
          </div>
          <button onClick={onClose} style={{ background:"rgba(255,255,255,0.08)", border:"1px solid "+BORDER, borderRadius:8, padding:"6px 10px", color:TEXT2, cursor:"pointer" }}><XIcon /></button>
        </div>
        {selected.length > 0 && (
          <div style={{ padding:"10px 18px 8px", borderBottom:"1px solid "+BORDER, flexShrink:0 }}>
            <div style={{ fontSize:10, fontWeight:700, color:"rgba(255,255,255,0.35)", textTransform:"uppercase", letterSpacing:"0.8px", marginBottom:6 }}>Selected</div>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
              {selected.map(j => {
                const ab = abbrevJob(j);
                return (
                  <span key={j} style={{ background:ab.bg, color:ab.color, fontSize:12, fontWeight:600, padding:"4px 10px", borderRadius:8, display:"flex", alignItems:"center", gap:4 }}>
                    {j}
                    <button onClick={() => removeJob(j)} style={{ background:"none", border:"none", cursor:"pointer", color:ab.color, padding:0, fontSize:12 }}>×</button>
                  </span>
                );
              })}
            </div>
          </div>
        )}
        <div style={{ overflowY:"auto", flex:1, padding:"10px 18px", WebkitOverflowScrolling:"touch" }}>
          <div style={{ fontSize:10, fontWeight:700, color:"rgba(255,255,255,0.35)", textTransform:"uppercase", letterSpacing:"0.8px", marginBottom:8 }}>Presets</div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
            {presets.map(j => {
              const isSelected = selected.includes(j);
              const ab = abbrevJob(j);
              return (
                <button key={j} onClick={() => toggle(j)} style={{ padding:"8px 14px", borderRadius:20, border:"1.5px solid "+(isSelected?ab.color:BORDER), background:isSelected?ab.bg:"transparent", color:isSelected?ab.color:TEXT2, fontSize:13, fontWeight:isSelected?600:400, cursor:"pointer", display:"flex", alignItems:"center", gap:4 }}>
                  {isSelected && <span style={{ fontSize:11, lineHeight:1 }}>✓</span>}
                  {j}
                </button>
              );
            })}
          </div>
        </div>
        <div style={{ padding:"10px 18px 36px", borderTop:"1px solid "+BORDER, flexShrink:0 }}>
          <div style={{ fontSize:10, fontWeight:700, color:"rgba(255,255,255,0.35)", textTransform:"uppercase", letterSpacing:"0.8px", marginBottom:8 }}>Custom</div>
          <div style={{ display:"flex", gap:8 }}>
            <input placeholder="e.g. Control Arms, Strut Mounts…" value={custom} onChange={e => setCustom(e.target.value)} onKeyDown={e => e.key === "Enter" && addCustom()} style={{ ...inputStyle, flex:1, padding:"11px 14px", fontSize:14 }} />
            <button onClick={addCustom} style={{ background:ACCENT, color:"#fff", border:"none", borderRadius:10, padding:"0 18px", fontWeight:600, cursor:"pointer" }}>Add</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function HoursPicker({ ro, onHoursChange, onClose }) {
  const [val, setVal] = useState(String(ro.hours||"").replace(/h$/i,""));
  const presets = ["0.5","1","1.5","2","2.5","3","4","5","6","8"];
  function commit() { onHoursChange(ro.id, val.replace(/[^0-9.]/g,"").trim()); onClose(); }
  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose(); }} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.4)", zIndex:4000, display:"flex", alignItems:"flex-end", justifyContent:"center" }}>
      <div style={{ background:"#fff", borderRadius:"24px 24px 0 0", width:"100%", maxWidth:400, padding:"20px 20px 40px" }}>
        <div style={{ width:36, height:4, background:"#E5E7EB", borderRadius:2, margin:"0 auto 16px" }} />
        <div style={{ fontWeight:800, fontSize:18, color:"#111", marginBottom:2 }}>Flat Rate Hours</div>
        <div style={{ fontSize:12, color:"#888", marginBottom:18 }}>{ro.roNum}</div>
        <div style={{ display:"flex", gap:10, marginBottom:16 }}>
          <input autoFocus type="number" min="0" step="0.5" value={val} onChange={e => setVal(e.target.value)} onKeyDown={e => { if(e.key==="Enter")commit(); if(e.key==="Escape")onClose(); }} placeholder="0.0" style={{ flex:1, padding:14, border:"2px solid "+ACCENT, borderRadius:12, fontSize:18, fontWeight:700, outline:"none" }} />
          <button onClick={commit} style={{ background:SUCCESS, color:"#fff", border:"none", borderRadius:12, padding:"0 20px", fontWeight:700, cursor:"pointer" }}>Set</button>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:8, marginBottom:16 }}>
          {presets.map(v => (
            <button key={v} onClick={() => { onHoursChange(ro.id, v); onClose(); }} style={{ padding:"10px 4px", background:ro.hours===v?"#DCFCE7":"#F8FAFC", color:ro.hours===v?"#16A34A":"#374151", borderRadius:10, border:"1px solid #E5E7EB", fontWeight:600, cursor:"pointer" }}>{v}h</button>
          ))}
        </div>
        <div style={{ display:"flex", gap:8 }}>
          {ro.hours && <button onClick={() => { onHoursChange(ro.id,""); onClose(); }} style={{ flex:1, padding:12, background:"#FEF2F2", color:"#EF4444", border:"none", borderRadius:10, fontWeight:600, cursor:"pointer" }}>Clear</button>}
          <button onClick={onClose} style={{ flex:1, padding:12, background:"#F1F5F9", color:"#64748B", border:"none", borderRadius:10, fontWeight:600, cursor:"pointer" }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

function ROCard({ ro, timer, onTap, onMove, isMoving, serviceTypes, canMove }) {
  const holdRef = useRef(null);
  const didHold = useRef(false);
  const vehicle = [ro.year, ro.make, ro.model].filter(Boolean).join(" ") || "No vehicle";
  const svcType = serviceTypes && ro.serviceType ? serviceTypes.find(s => s.id === ro.serviceType) : null;
  const leftColor = isMoving ? ACCENT : (svcType ? svcType.color : priorityBorder(ro.priority));
  const timerRunning = timer && timer.running;
  const elapsed = timer ? (timer.running ? timer.elapsed + Math.floor((Date.now() - timer.startedAt)/1000) : timer.elapsed) : 0;
  const allJobs = ro.jobs ? ro.jobs.split(",").map(j => j.trim()).filter(Boolean) : [];
  const visibleJobs = allJobs.slice(0,3);
  const extraJobs = allJobs.length - visibleJobs.length;

  function startHold() {
    if (canMove === false) return;
    didHold.current = false;
    holdRef.current = setTimeout(() => { didHold.current = true; onMove(); if (navigator.vibrate) navigator.vibrate(40); }, 600);
  }
  function cancelHold() { if (holdRef.current) clearTimeout(holdRef.current); }
  function handleClick() {
    if (didHold.current) { didHold.current = false; return; }
    if (isMoving) { onMove(); return; }
    onTap();
  }

  return (
    <div onMouseDown={startHold} onMouseUp={cancelHold} onMouseLeave={cancelHold} onTouchStart={startHold} onTouchEnd={cancelHold} onTouchCancel={cancelHold} onClick={handleClick} className="card-press"
      style={{ background:isMoving?"rgba(10,132,255,0.12)":CARD_BG, borderRadius:14, padding:"12px 13px", marginBottom:7, boxShadow:isMoving?"0 0 0 1.5px #0A84FF, 0 8px 32px rgba(10,132,255,0.2)":CARD_SHADOW, animation:"card-in 0.22s cubic-bezier(0.34,1.56,0.64,1)", border:"1px solid "+CARD_BORDER, borderLeft:"2.5px solid "+leftColor, cursor:"pointer", userSelect:"none", width:"100%", boxSizing:"border-box", transform:isMoving?"scale(1.01)":"scale(1)", transition:"box-shadow 0.2s, transform 0.2s, background 0.2s", WebkitTouchCallout:"none", WebkitUserSelect:"none" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:3 }}>
        <span style={{ fontWeight:700, fontSize:14, color:TEXT }}>{ro.roNum}</span>
        <div style={{ display:"flex", alignItems:"center", gap:3, flexShrink:0 }}>
          {ro.roNotes && ro.roNotes.length > 0 && <span style={{ background:"rgba(10,132,255,0.2)", color:ACCENT, fontSize:8, fontWeight:700, padding:"2px 5px", borderRadius:4 }}>💬{ro.roNotes.length}</span>}
          {ro.priority === "HIGH" && <span style={{ background:"rgba(255,69,58,0.15)", color:DANGER, fontSize:8, fontWeight:700, padding:"2px 6px", borderRadius:4 }}>🔴 URGENT</span>}
          {ro.priority === "LOW"  && <span style={{ background:"rgba(99,99,102,0.3)",  color:"rgba(255,255,255,0.45)", fontSize:8, fontWeight:700, padding:"2px 6px", borderRadius:4 }}>LOW</span>}
        </div>
      </div>
      {ro.promiseTime && (() => {
        const now = Date.now();
        const promise = new Date(ro.promiseTime).getTime();
        const diff = promise - now;
        const overdue = diff < 0;
        const soon = diff > 0 && diff < 3600000;
        const timeStr = new Date(ro.promiseTime).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"});
        return (
          <div style={{ display:"flex", alignItems:"center", gap:3, marginBottom:3 }}>
            <span style={{ background:overdue?"rgba(255,69,58,0.15)":soon?"rgba(255,159,10,0.15)":"rgba(255,255,255,0.06)", color:overdue?DANGER:soon?WARN:TEXT3, fontSize:9, fontWeight:600, padding:"2px 6px", borderRadius:5 }}>
              🕐 {overdue?"OVERDUE — ":soon?"Due soon — ":""}{timeStr}
            </span>
          </div>
        );
      })()}
      <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:3 }}>
        <span style={{ background:timerRunning?"rgba(255,159,10,0.15)":"rgba(255,255,255,0.06)", color:timerRunning?WARN:TEXT3, fontSize:9, fontWeight:500, padding:"2px 7px", borderRadius:5, display:"flex", alignItems:"center", gap:3 }}>
          <span style={{ width:4, height:4, borderRadius:"50%", background:timerRunning?WARN:TEXT3, display:"inline-block" }}/>
          {fmtTime(elapsed)}
        </span>
        {ro.hours && <span style={{ background:"rgba(48,209,88,0.12)", color:SUCCESS, fontSize:8, fontWeight:600, padding:"2px 6px", borderRadius:5 }}>{String(ro.hours).replace(/h$/i,"")}h</span>}
      </div>
      <div style={{ fontSize:11, fontWeight:400, color:"rgba(255,255,255,0.55)", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{vehicle}</div>
      <div style={{ fontSize:10, fontWeight:400, color:"rgba(255,255,255,0.35)", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", marginBottom:4 }}>{ro.customer || "No customer"}</div>
      <div style={{ display:"flex", alignItems:"center", gap:3, overflow:"hidden", height:18 }}>
        {visibleJobs.map((j,i) => { const ab = abbrevJob(j); return <span key={i} style={{ background:ab.bg, color:ab.color, fontSize:8, fontWeight:500, padding:"2px 5px", borderRadius:4, flexShrink:0 }}>{ab.label}</span>; })}
        {extraJobs > 0 && <span style={{ fontSize:8, color:TEXT3, flexShrink:0 }}>+{extraJobs}</span>}
        {allJobs.length === 0 && <span style={{ fontSize:8, color:"rgba(255,255,255,0.12)" }}>No jobs</span>}
      </div>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", height:18, marginTop:4 }}>
        <div>
          {ro.waitStatus === "waiting" && <span style={{ background:"rgba(255,159,10,0.15)", color:WARN, fontSize:8, fontWeight:600, padding:"2px 6px", borderRadius:4 }}>⏳ Waiting</span>}
          {ro.waitStatus === "dropoff" && <span style={{ background:"rgba(255,255,255,0.07)", color:TEXT3, fontSize:8, fontWeight:500, padding:"2px 6px", borderRadius:4 }}>🚗 Drop-Off</span>}
        </div>
        {svcType && <span style={{ background:svcType.color, color:"#fff", fontSize:8, fontWeight:600, padding:"2px 6px", borderRadius:4 }}>{svcType.name}</span>}
      </div>
      {isMoving && <div style={{ marginTop:6, fontSize:9, color:"#0A84FF", fontWeight:400, textAlign:"center" }}>● MOVING — tap a column to place</div>}
    </div>
  );
}

function Sheet({ title, subtitle, onClose, children, wide }) {
  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose(); }} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.35)", zIndex:2000, display:"flex", alignItems:wide?"center":"flex-end", justifyContent:"center" }}>
      <div style={{ background:SHEET_BG, borderRadius:wide?"20px":"22px 22px 0 0", width:"100%", maxWidth:wide?560:"100%", maxHeight:"92vh", display:"flex", flexDirection:"column", overflow:"hidden" }}>
        {!wide && <div style={{ width:36, height:5, background:"rgba(255,255,255,0.25)", borderRadius:3, margin:"10px auto 0", flexShrink:0 }} />}
        <div style={{ padding:"14px 20px 12px", borderBottom:"0.5px solid rgba(255,255,255,0.08)", display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
          <div>
            <div style={{ fontFamily:"-apple-system,BlinkMacSystemFont,'SF Pro Display',sans-serif", fontWeight:700, fontSize:17, color:TEXT }}>{title}</div>
            {subtitle && <div style={{ fontSize:12, color:"rgba(255,255,255,0.35)", marginTop:2 }}>{subtitle}</div>}
          </div>
          <button onClick={onClose} style={{ background:BG, border:"none", borderRadius:10, width:30, height:30, display:"flex", alignItems:"center", justifyContent:"center", color:TEXT3, cursor:"pointer" }}><XIcon /></button>
        </div>
        <div style={{ padding:"16px 20px 36px", overflowY:"auto", WebkitOverflowScrolling:"touch", flex:1 }}>{children}</div>
      </div>
    </div>
  );
}

function WFLogo({ size=40, radius=10 }) {
  const s = size, r = radius;
  return (
    <svg width={s} height={s} viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="wfBg" x1="0" y1="0" x2="96" y2="96" gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor="#0C1830"/><stop offset="100%" stopColor="#060010"/></linearGradient>
        <linearGradient id="wfRing" x1="10" y1="10" x2="78" y2="78" gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor="#A0D4FF"/><stop offset="100%" stopColor="#0A84FF"/></linearGradient>
        <linearGradient id="wfTail" x1="58" y1="56" x2="82" y2="80" gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor="#0A84FF"/><stop offset="100%" stopColor="#E040FB"/></linearGradient>
        <linearGradient id="wfBar" x1="0" y1="0" x2="0" y2="1" gradientUnits="objectBoundingBox"><stop offset="0%" stopColor="white"/><stop offset="100%" stopColor="rgba(255,255,255,0.6)"/></linearGradient>
        <radialGradient id="wfGlow" cx="50%" cy="0%" r="60%" gradientUnits="objectBoundingBox"><stop offset="0%" stopColor="rgba(10,132,255,0.2)"/><stop offset="100%" stopColor="transparent"/></radialGradient>
        <filter id="wfBlur"><feGaussianBlur stdDeviation="3" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      <rect width="96" height="96" rx={r*2.2} fill="url(#wfBg)"/>
      <rect width="96" height="96" rx={r*2.2} fill="url(#wfGlow)" opacity="0.5"/>
      <rect x="16" y="0" width="64" height="1" rx="0.5" fill="rgba(255,255,255,0.18)"/>
      <circle cx="44" cy="42" r="22" stroke="url(#wfRing)" strokeWidth="5" fill="none" filter="url(#wfBlur)"/>
      <rect x="30" y="39" width="6" height="12" rx="3" fill="url(#wfBar)" opacity="0.4"/>
      <rect x="41" y="33" width="6" height="18" rx="3" fill="url(#wfBar)" opacity="0.65"/>
      <rect x="52" y="26" width="6" height="25" rx="3" fill="url(#wfBar)" filter="url(#wfBlur)"/>
      <line x1="60" y1="58" x2="79" y2="77" stroke="url(#wfTail)" strokeWidth="5.5" strokeLinecap="round"/>
    </svg>
  );
}

function LiveClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setTime(new Date()), 1000); return () => clearInterval(t); }, []);
  const h = time.getHours(), m = String(time.getMinutes()).padStart(2,"0");
  const ampm = h >= 12 ? "PM" : "AM", h12 = h % 12 || 12;
  return (
    <div style={{ display:"flex", alignItems:"baseline", gap:2 }}>
      <span style={{ fontSize:14, fontWeight:600, color:"rgba(255,255,255,0.7)" }}>{h12}:{m}</span>
      <span style={{ fontSize:10, fontWeight:500, color:"rgba(255,255,255,0.35)" }}>{ampm}</span>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div style={{ background:"rgba(255,255,255,0.04)", borderRadius:14, padding:"12px 13px", marginBottom:7 }}>
      <div style={{ height:12, background:"rgba(255,255,255,0.07)", borderRadius:6, width:"50%", marginBottom:8 }}/>
      <div style={{ height:10, background:"rgba(255,255,255,0.05)", borderRadius:6, width:"80%", marginBottom:6 }}/>
      <div style={{ height:10, background:"rgba(255,255,255,0.04)", borderRadius:6, width:"60%", marginBottom:8 }}/>
      <div style={{ display:"flex", gap:6 }}>
        <div style={{ height:16, background:"rgba(255,255,255,0.05)", borderRadius:8, width:40 }}/>
        <div style={{ height:16, background:"rgba(255,255,255,0.05)", borderRadius:8, width:50 }}/>
      </div>
    </div>
  );
}

function NoteThread({ ro, currentUser2, onAddNote }) {
  const [text, setText] = useState("");
  const notes = ro.roNotes || [];
  function fmtAgo(ts) {
    const diff = Date.now() - ts;
    const m = Math.floor(diff/60000);
    if (m < 1) return "Just now";
    if (m < 60) return m+"m ago";
    const h = Math.floor(m/60);
    if (h < 24) return h+"h ago";
    return new Date(ts).toLocaleDateString([],{month:"short",day:"numeric"});
  }
  return (
    <div style={{ marginBottom:16 }}>
      <div style={{ fontSize:10, fontWeight:600, color:TEXT3, textTransform:"uppercase", letterSpacing:"0.8px", marginBottom:8 }}>
        Notes {notes.length > 0 && <span style={{ color:ACCENT }}>· {notes.length}</span>}
      </div>
      {notes.length > 0 && (
        <div style={{ marginBottom:10 }}>
          {notes.map(note => (
            <div key={note.id} style={{ marginBottom:8, display:"flex", gap:8, alignItems:"flex-start" }}>
              <div style={{ width:26, height:26, borderRadius:"50%", background:"linear-gradient(135deg,#0A84FF,#5E5CE6)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:9, fontWeight:700, color:"#fff", flexShrink:0 }}>
                {note.author ? note.author.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase() : "?"}
              </div>
              <div style={{ flex:1, background:"rgba(255,255,255,0.05)", borderRadius:10, padding:"8px 10px" }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                  <span style={{ fontSize:11, fontWeight:600, color:TEXT2 }}>{note.author}</span>
                  <span style={{ fontSize:10, color:TEXT3 }}>{fmtAgo(note.time)}</span>
                </div>
                <div style={{ fontSize:13, color:TEXT2, lineHeight:1.4 }}>{note.text}</div>
              </div>
            </div>
          ))}
        </div>
      )}
      <div style={{ display:"flex", gap:8 }}>
        <input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => { if(e.key==="Enter" && text.trim()) { onAddNote(ro.id, text, currentUser2?.name||"Unknown"); setText(""); }}} placeholder="Add a note…" style={{ ...inputStyle, flex:1, padding:"10px 12px", fontSize:13 }} />
        <button onClick={() => { if(text.trim()) { onAddNote(ro.id, text, currentUser2?.name||"Unknown"); setText(""); }}} style={{ background:text.trim()?ACCENT:"rgba(255,255,255,0.06)", color:text.trim()?"#fff":TEXT3, border:"none", borderRadius:10, padding:"0 16px", fontWeight:600, cursor:"pointer" }}>Send</button>
      </div>
    </div>
  );
}

function RODetail({ ro, timer, onClose, onSave, onDelete, onArchive, onTimer, onHoursChange, wide, isAdmin, isTech, serviceTypes, jobPresets, currentUser2, onAddNote, colId }) {
  const [editing, setEditing] = useState(false);
  const [showJobPickerEdit, setShowJobPickerEdit] = useState(false);
  const [f, setF] = useState({ ...ro, serviceType: ro.serviceType||"st-main" });
  const jobPresetsForEdit = jobPresets || DEFAULT_JOB_PRESETS;
  const elapsed = timer ? (timer.running ? timer.elapsed + Math.floor((Date.now()-timer.startedAt)/1000) : timer.elapsed) : 0;
  const [techEditing, setTechEditing] = useState(false);

  if (techEditing && isTech) {
    return (
      <Sheet title="Update RO" subtitle={ro.roNum} onClose={onClose} wide={wide}>
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <div style={{ background:"rgba(10,132,255,0.08)", borderRadius:12, padding:"10px 14px", fontSize:12, color:TEXT2 }}>✏️ You can update mileage out, cause, correction and flat rate hours</div>
          <div><label style={labelStyle}>Mileage Out</label><input type="number" placeholder="e.g. 45010" value={f.mileageOut||""} onChange={e => setF(p=>({...p,mileageOut:e.target.value}))} style={inputStyle}/></div>
          <div><label style={labelStyle}>Flat Rate Hours</label><input type="number" min="0" step="0.5" placeholder="e.g. 2.5" value={String(f.hours||"").replace(/h$/i,"")} onChange={e => setF(p=>({...p,hours:e.target.value}))} style={inputStyle}/></div>
          <div><label style={labelStyle}>Cause — What you found</label><textarea placeholder="Root cause identified…" value={f.cause||""} onChange={e => setF(p=>({...p,cause:e.target.value}))} style={{ ...inputStyle, minHeight:80, resize:"vertical" }}/></div>
          <div><label style={labelStyle}>Correction — Work performed</label><textarea placeholder="What was done to fix it…" value={f.correction||""} onChange={e => setF(p=>({...p,correction:e.target.value}))} style={{ ...inputStyle, minHeight:80, resize:"vertical" }}/></div>
          <div><label style={labelStyle}>Tech Notes</label><textarea placeholder="Any additional notes…" value={f.notes||""} onChange={e => setF(p=>({...p,notes:e.target.value}))} style={{ ...inputStyle, minHeight:60, resize:"vertical" }}/></div>
          <div style={{ display:"flex", gap:10 }}>
            <button onClick={() => setTechEditing(false)} style={{ flex:1, padding:13, background:"rgba(255,255,255,0.06)", color:TEXT2, border:"none", borderRadius:12, fontWeight:600, cursor:"pointer" }}>Cancel</button>
            <button onClick={() => { onSave(f); setTechEditing(false); }} style={{ flex:2, padding:13, background:ACCENT, color:"#fff", border:"none", borderRadius:12, fontWeight:700, cursor:"pointer" }}>Save Updates</button>
          </div>
        </div>
      </Sheet>
    );
  }

  if (editing) {
    const inp = (key, placeholder, type="text") => (
      <input type={type} placeholder={placeholder} value={f[key]||""} onChange={e => setF(p=>({...p,[key]:e.target.value}))} style={inputStyle}/>
    );
    const sec = (title) => <div style={{ fontSize:10, fontWeight:800, color:MUTED, textTransform:"uppercase", letterSpacing:"0.8px", marginTop:8, marginBottom:6 }}>{title}</div>;
    return (
      <Sheet title="Edit RO" subtitle={ro.roNum} onClose={onClose} wide={wide}>
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {sec("Service Type")}
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            {serviceTypes && serviceTypes.map(st => (
              <button key={st.id} onClick={() => setF(p=>({...p,serviceType:st.id}))} style={{ flex:"1 1 auto", padding:"9px 8px", borderRadius:10, border:"2px solid "+(f.serviceType===st.id?st.color:BORDER), background:f.serviceType===st.id?st.bg:"transparent", color:f.serviceType===st.id?st.color:TEXT2, fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", gap:6, justifyContent:"center" }}>
                <span style={{ width:8, height:8, borderRadius:"50%", background:st.color, display:"inline-block" }}/>{st.name}
              </button>
            ))}
          </div>
          {sec("Vehicle Info")}
          <div style={{ display:"grid", gridTemplateColumns:"72px 1fr 1fr", gap:8 }}>{inp("year","Year")}{inp("make","Make")}{inp("model","Model")}</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
            <div><label style={labelStyle}>Color</label>{inp("color","e.g. White")}</div>
            <div><label style={labelStyle}>License Plate</label>{inp("plate","e.g. ABC1234")}</div>
          </div>
          <div><label style={labelStyle}>VIN</label>{inp("vin","Vehicle Identification Number")}</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
            <div><label style={labelStyle}>Mileage In</label>{inp("mileageIn","e.g. 45000","number")}</div>
            <div><label style={labelStyle}>Mileage Out</label>{inp("mileageOut","e.g. 45010","number")}</div>
          </div>
          {sec("Customer Info")}
          <div><label style={labelStyle}>Customer Name</label>{inp("customer","Full name or stock #")}</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
            <div><label style={labelStyle}>Phone</label>{inp("phone","555-0000","tel")}</div>
            <div><label style={labelStyle}>Email</label>{inp("email","email@email.com","email")}</div>
          </div>
          <div>
            <label style={labelStyle}>Customer Status</label>
            <div style={{ display:"flex", gap:8 }}>
              {[["none","— None"],["dropoff","🚗 Drop-Off"],["waiting","⏳ Waiting"]].map(([v,l]) => (
                <button key={v} onClick={() => setF(p=>({...p,waitStatus:v}))} style={{ flex:1, padding:"10px 0", borderRadius:12, border:"2px solid "+(f.waitStatus===v?ACCENT:BORDER), background:f.waitStatus===v?ACCENT2:"transparent", color:f.waitStatus===v?ACCENT:TEXT2, fontWeight:600, cursor:"pointer" }}>{l}</button>
              ))}
            </div>
          </div>
          {sec("Promise Time")}
          <div>
            <label style={labelStyle}>Promised By (date & time)</label>
            <input type="datetime-local" value={f.promiseTime||""} onChange={e => setF(p=>({...p,promiseTime:e.target.value}))} style={{ ...inputStyle, colorScheme:"dark" }}/>
            {f.promiseTime && <button onClick={() => setF(p=>({...p,promiseTime:""}))} style={{ marginTop:6, background:"none", border:"none", color:DANGER, fontSize:12, cursor:"pointer" }}>Clear promise time</button>}
          </div>
          {sec("Job Info")}
          <div>
            <label style={labelStyle}>Priority</label>
            <select value={f.priority} onChange={e => setF(p=>({...p,priority:e.target.value}))} style={{ ...inputStyle, appearance:"auto" }}>
              <option value="LOW">Low</option><option value="NORMAL">Normal</option><option value="HIGH">High — Urgent</option>
            </select>
          </div>
          <div><label style={labelStyle}>Flat Rate Hours</label><input type="number" min="0" step="0.5" placeholder="e.g. 2.5" value={f.hours||""} onChange={e => setF(p=>({...p,hours:e.target.value}))} style={inputStyle}/></div>
          <JobFieldTrigger value={f.jobs} onOpen={() => setShowJobPickerEdit(true)} />
          {showJobPickerEdit && <JobPicker value={f.jobs} onChange={v => setF(p=>({...p,jobs:v}))} presets={jobPresetsForEdit} onClose={() => setShowJobPickerEdit(false)} />}
          {sec("3 C's — Technician Notes")}
          <div><label style={labelStyle}>Concern</label><textarea placeholder="Customer complaint…" value={f.concern||""} onChange={e => setF(p=>({...p,concern:e.target.value}))} style={{ ...inputStyle, minHeight:60, resize:"vertical" }}/></div>
          <div><label style={labelStyle}>Cause</label><textarea placeholder="What tech found…" value={f.cause||""} onChange={e => setF(p=>({...p,cause:e.target.value}))} style={{ ...inputStyle, minHeight:60, resize:"vertical" }}/></div>
          <div><label style={labelStyle}>Correction</label><textarea placeholder="Work performed…" value={f.correction||""} onChange={e => setF(p=>({...p,correction:e.target.value}))} style={{ ...inputStyle, minHeight:60, resize:"vertical" }}/></div>
          <div style={{ display:"flex", gap:10, marginTop:4 }}>
            <button onClick={() => setEditing(false)} style={{ flex:1, padding:13, background:"rgba(255,255,255,0.06)", color:TEXT2, border:"none", borderRadius:12, fontWeight:600, cursor:"pointer" }}>Cancel</button>
            <button onClick={() => { onSave(f); setEditing(false); }} style={{ flex:2, padding:13, background:ACCENT, color:"#fff", border:"none", borderRadius:12, fontWeight:700, cursor:"pointer" }}>Save Changes</button>
          </div>
        </div>
      </Sheet>
    );
  }

  return (
    <Sheet title={ro.roNum} subtitle={[ro.year,ro.make,ro.model].filter(Boolean).join(" ")} onClose={onClose} wide={wide}>
      <div>
        {(() => {
          const st = (ro.serviceType && serviceTypes) ? serviceTypes.find(s => s.id === ro.serviceType) : null;
          return st ? (
            <div style={{ display:"inline-flex", alignItems:"center", gap:6, background:st.bg, borderRadius:8, padding:"5px 10px", marginBottom:16 }}>
              <span style={{ width:8, height:8, borderRadius:"50%", background:st.color }}/><span style={{ color:st.color, fontWeight:700, fontSize:12 }}>{st.name}</span>
            </div>
          ) : null;
        })()}
        <div style={{ marginBottom:18 }}>
          <div style={{ fontSize:10, fontWeight:800, color:MUTED, textTransform:"uppercase", letterSpacing:"0.8px", marginBottom:6 }}>Vehicle</div>
          <div style={{ fontSize:18, fontWeight:800, color:TEXT }}>{[ro.year,ro.make,ro.model].filter(Boolean).join(" ")||"No vehicle"}</div>
          {(ro.color||ro.plate||ro.vin) && (
            <div style={{ fontSize:13, color:SUB, marginTop:4, display:"flex", gap:12, flexWrap:"wrap" }}>
              {ro.color && <span>🎨 {ro.color}</span>}
              {ro.plate && <span>🪪 {ro.plate}</span>}
              {ro.vin   && <span style={{ fontSize:11 }}>VIN: {ro.vin}</span>}
            </div>
          )}
          <div style={{ display:"flex", gap:6, marginTop:8 }}>
            <div style={{ flex:1, background:BG, borderRadius:10, padding:"10px 12px" }}>
              <div style={{ fontSize:9, fontWeight:700, color:"rgba(255,255,255,0.3)", textTransform:"uppercase", letterSpacing:"0.6px", marginBottom:3 }}>Miles In</div>
              <div style={{ fontSize:15, fontWeight:700, color:TEXT }}>{ro.mileageIn ? ro.mileageIn.toLocaleString() : "—"}</div>
            </div>
            <div style={{ flex:1, background:BG, borderRadius:10, padding:"10px 12px" }}>
              <div style={{ fontSize:9, fontWeight:700, color:"rgba(255,255,255,0.3)", textTransform:"uppercase", letterSpacing:"0.6px", marginBottom:3 }}>Miles Out</div>
              <div style={{ fontSize:15, fontWeight:700, color:TEXT }}>{ro.mileageOut ? ro.mileageOut.toLocaleString() : "—"}</div>
            </div>
          </div>
        </div>
        <div style={{ marginBottom:18 }}>
          <div style={{ fontSize:10, fontWeight:800, color:MUTED, textTransform:"uppercase", letterSpacing:"0.8px", marginBottom:6 }}>Customer</div>
          <div style={{ fontSize:16, fontWeight:700, color:TEXT, marginBottom:6 }}>{ro.customer||"No customer"}</div>
          <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
            {ro.phone && <a href={"tel:"+ro.phone} style={{ display:"flex", alignItems:"center", gap:5, color:ACCENT, fontSize:13, textDecoration:"none" }}>📞 {ro.phone}</a>}
            {ro.email && <a href={"mailto:"+ro.email} style={{ display:"flex", alignItems:"center", gap:5, color:ACCENT, fontSize:13, textDecoration:"none" }}>✉️ {ro.email}</a>}
          </div>
          <div style={{ marginTop:8 }}>
            {ro.waitStatus==="waiting" && <span style={{ background:"rgba(255,159,10,0.15)", color:WARN, fontSize:12, fontWeight:600, padding:"4px 10px", borderRadius:8 }}>⏳ Customer Waiting</span>}
            {ro.waitStatus==="dropoff" && <span style={{ background:"rgba(255,255,255,0.08)", color:TEXT2, fontSize:12, fontWeight:500, padding:"4px 10px", borderRadius:8 }}>🚗 Drop-Off</span>}
            {(!ro.waitStatus||ro.waitStatus==="none") && <span style={{ background:"rgba(255,255,255,0.05)", color:TEXT3, fontSize:12, fontWeight:500, padding:"4px 10px", borderRadius:8 }}>No status</span>}
          </div>
        </div>
        <div style={{ marginBottom:18 }}>
          <div style={{ fontSize:10, fontWeight:800, color:MUTED, textTransform:"uppercase", letterSpacing:"0.8px", marginBottom:10 }}>Job Info</div>
          <div style={{ display:"flex", gap:10, marginBottom:12 }}>
            <div style={{ flex:1 }}>
              <label style={labelStyle}>Priority</label>
              <select value={ro.priority} onChange={e => onSave({...ro,priority:e.target.value})} style={{ ...inputStyle, padding:"10px 12px", appearance:"auto" }}>
                <option value="LOW">Low</option><option value="NORMAL">Normal</option><option value="HIGH">High — Urgent</option>
              </select>
            </div>
            <div style={{ flex:1 }}>
              <label style={labelStyle}>Flat Rate Hrs</label>
              <input type="number" min="0" step="0.5" value={String(ro.hours||"").replace(/h$/i,"")} onChange={e => onHoursChange(ro.id, e.target.value)} placeholder="0.0" style={{ ...inputStyle, padding:"10px 12px", fontWeight:700, fontSize:15 }}/>
            </div>
          </div>
          {ro.jobs ? (
            <div>
              <label style={labelStyle}>Jobs</label>
              <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                {ro.jobs.split(",").map(j => j.trim()).filter(Boolean).map((j,i) => { const ab = abbrevJob(j); return <span key={i} style={{ background:ab.bg, color:ab.color, fontSize:12, fontWeight:600, padding:"4px 10px", borderRadius:8 }}>{j}</span>; })}
              </div>
            </div>
          ) : <div style={{ color:MUTED, fontSize:13, fontStyle:"italic" }}>No jobs added yet</div>}
        </div>
        {(ro.concern||ro.cause||ro.correction) && (
          <div style={{ marginBottom:18 }}>
            <div style={{ fontSize:10, fontWeight:800, color:MUTED, textTransform:"uppercase", letterSpacing:"0.8px", marginBottom:8 }}>3 C's</div>
            {[["Concern",ro.concern],["Cause",ro.cause],["Correction",ro.correction]].map(([lbl,val]) => val ? (
              <div key={lbl} style={{ marginBottom:8 }}>
                <div style={{ fontSize:10, fontWeight:700, color:MUTED, textTransform:"uppercase", letterSpacing:"0.6px", marginBottom:3 }}>{lbl}</div>
                <div style={{ fontSize:13, color:TEXT, lineHeight:1.5, background:BG, borderRadius:8, padding:"8px 10px" }}>{val}</div>
              </div>
            ) : null)}
          </div>
        )}
        {ro.notes && (
          <div style={{ background:"rgba(245,158,11,0.12)", borderRadius:10, padding:"10px 14px", marginBottom:16 }}>
            <div style={{ fontSize:9, fontWeight:700, color:"rgba(245,158,11,0.7)", textTransform:"uppercase", letterSpacing:"0.6px", marginBottom:4 }}>Notes</div>
            <div style={{ fontSize:13, color:"rgba(253,230,138,0.9)" }}>{ro.notes}</div>
          </div>
        )}
        {ro.promiseTime && (() => {
          const now2 = Date.now(), promise = new Date(ro.promiseTime).getTime(), diff = promise - now2;
          const overdue = diff < 0, soon = diff > 0 && diff < 3600000;
          const timeStr = new Date(ro.promiseTime).toLocaleString([],{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"});
          const mins = Math.abs(Math.floor(diff/60000)), hrs2 = Math.floor(mins/60), rem = mins%60;
          const countdown = overdue ? (hrs2>0?hrs2+"h "+rem+"m overdue":rem+"m overdue") : (hrs2>0?hrs2+"h "+rem+"m left":rem+"m left");
          return (
            <div style={{ marginBottom:16 }}>
              <div style={{ background:overdue?"rgba(255,69,58,0.1)":soon?"rgba(255,159,10,0.1)":"rgba(255,255,255,0.05)", borderRadius:12, padding:"12px 14px" }}>
                <div style={{ fontSize:9, fontWeight:600, color:TEXT3, textTransform:"uppercase", letterSpacing:"0.6px", marginBottom:4 }}>Promise Time</div>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                  <div style={{ fontSize:14, fontWeight:600, color:TEXT2 }}>🕐 {timeStr}</div>
                  <div style={{ fontSize:12, fontWeight:600, color:overdue?DANGER:soon?WARN:SUCCESS }}>{countdown}</div>
                </div>
              </div>
            </div>
          );
        })()}
        <NoteThread ro={ro} currentUser2={currentUser2} onAddNote={onAddNote} />
        <div style={{ background:"rgba(255,255,255,0.05)", borderRadius:14, padding:"14px 16px", display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
          <div>
            <div style={{ fontSize:10, fontWeight:700, color:"rgba(255,255,255,0.3)", textTransform:"uppercase", letterSpacing:"0.6px", marginBottom:4 }}>Timer</div>
            <div style={{ fontSize:24, fontWeight:800, color:timer&&timer.running?WARN:TEXT }}>{fmtTime(elapsed)}</div>
            {timer && timer.running && <div style={{ fontSize:10, color:WARN, fontWeight:600 }}>● Running</div>}
          </div>
          <button onClick={() => onTimer(ro.id)} style={{ background:timer&&timer.running?"#FEF3C7":"linear-gradient(135deg,#22C55E,#16A34A)", color:timer&&timer.running?"#D97706":"#fff", border:"none", borderRadius:12, padding:"10px 20px", fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", gap:6 }}>
            {timer&&timer.running ? <><PauseIcon/> Pause</> : <><PlayIcon/> Start</>}
          </button>
        </div>
        {isTech && (
          <button onClick={() => setTechEditing(true)} style={{ width:"100%", padding:13, background:ACCENT, color:"#fff", border:"none", borderRadius:12, fontWeight:700, cursor:"pointer", marginBottom:10, display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
            <EditIcon/> Update RO
          </button>
        )}
        {isAdmin && (
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            <button onClick={() => setEditing(true)} style={{ display:"flex", alignItems:"center", gap:8, padding:13, background:"rgba(255,255,255,0.06)", color:TEXT2, border:"none", borderRadius:12, fontWeight:600, cursor:"pointer" }}><EditIcon/> Edit RO Details</button>
            {colId === "delivered" && <button onClick={() => onArchive(ro.id)} style={{ display:"flex", alignItems:"center", gap:8, padding:13, background:"rgba(255,255,255,0.06)", color:TEXT2, border:"none", borderRadius:12, fontWeight:600, cursor:"pointer" }}><ArchiveIcon/> Archive Ticket</button>}
            <button onClick={() => { if(window.confirm("Delete this RO?")) onDelete(ro.id); }} style={{ display:"flex", alignItems:"center", gap:8, padding:13, background:"rgba(255,69,58,0.1)", color:DANGER, border:"none", borderRadius:12, fontWeight:600, cursor:"pointer" }}><TrashIcon/> Delete RO</button>
          </div>
        )}
      </div>
    </Sheet>
  );
}

function NewROModal({ onAdd, onClose, nextNum, techs, queues, wide, serviceTypes, jobPresets }) {
  const defaultRoNum = "RO-" + String(nextNum).padStart(4,"0");
  const [f, setF] = useState({ roNum:defaultRoNum, serviceType:"st-main", year:"", make:"", model:"", color:"", plate:"", vin:"", mileageIn:"", customer:"", phone:"", email:"", waitStatus:"none", priority:"NORMAL", hours:"", jobs:"", promiseTime:"", concern:"", notes:"", dest:"queue", assignQueue:"q-main", assignTech:"", assignCol:"ondeck" });
  const [showJobPicker, setShowJobPicker] = useState(false);
  function handleAdd() { onAdd({ ...f }); }
  return (
    <Sheet title="New Repair Order" subtitle="Fill in the details below" onClose={onClose} wide={wide}>
      <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
        <div><label style={labelStyle}>RO Number</label><input value={f.roNum} onChange={e => setF(p=>({...p,roNum:e.target.value.toUpperCase()}))} placeholder="e.g. RO-1006" style={{ ...inputStyle, fontWeight:800, fontSize:16 }}/></div>
        <div>
          <label style={labelStyle}>Service Type</label>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            {serviceTypes && serviceTypes.map(st => (
              <button key={st.id} onClick={() => setF(p=>({...p,serviceType:st.id}))} style={{ flex:"1 1 auto", padding:"10px 8px", borderRadius:12, border:"2px solid "+(f.serviceType===st.id?st.color:BORDER), background:f.serviceType===st.id?st.bg:"transparent", color:f.serviceType===st.id?st.color:TEXT2, fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", gap:6, justifyContent:"center" }}>
                <span style={{ width:8, height:8, borderRadius:"50%", background:st.color, display:"inline-block" }}/>{st.name}
              </button>
            ))}
          </div>
        </div>
        <div style={{ fontSize:10, fontWeight:800, color:"rgba(255,255,255,0.35)", textTransform:"uppercase", letterSpacing:"0.8px" }}>Vehicle</div>
        <div style={{ display:"grid", gridTemplateColumns:"72px 1fr 1fr", gap:8 }}>
          <input placeholder="Year" value={f.year} onChange={e => setF(p=>({...p,year:e.target.value}))} style={inputStyle}/>
          <input placeholder="Make" value={f.make} onChange={e => setF(p=>({...p,make:e.target.value}))} style={inputStyle}/>
          <input placeholder="Model" value={f.model} onChange={e => setF(p=>({...p,model:e.target.value}))} style={inputStyle}/>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
          <div><label style={labelStyle}>Color</label><input placeholder="e.g. White" value={f.color} onChange={e => setF(p=>({...p,color:e.target.value}))} style={inputStyle}/></div>
          <div><label style={labelStyle}>Plate #</label><input placeholder="ABC1234" value={f.plate} onChange={e => setF(p=>({...p,plate:e.target.value}))} style={inputStyle}/></div>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
          <div><label style={labelStyle}>Mileage In</label><input type="number" placeholder="e.g. 45000" value={f.mileageIn} onChange={e => setF(p=>({...p,mileageIn:e.target.value}))} style={inputStyle}/></div>
          <div><label style={labelStyle}>VIN (optional)</label><input placeholder="17 characters" value={f.vin} onChange={e => setF(p=>({...p,vin:e.target.value}))} style={inputStyle}/></div>
        </div>
        <div style={{ fontSize:10, fontWeight:800, color:MUTED, textTransform:"uppercase", letterSpacing:"0.8px" }}>Customer</div>
        <div><label style={labelStyle}>Customer Name / Stock #</label><input placeholder="Full name or stock number" value={f.customer} onChange={e => setF(p=>({...p,customer:e.target.value}))} style={inputStyle}/></div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
          <div><label style={labelStyle}>Phone</label><input type="tel" placeholder="555-0000" value={f.phone} onChange={e => setF(p=>({...p,phone:e.target.value}))} style={inputStyle}/></div>
          <div><label style={labelStyle}>Email</label><input type="email" placeholder="email@email.com" value={f.email} onChange={e => setF(p=>({...p,email:e.target.value}))} style={inputStyle}/></div>
        </div>
        <div>
          <label style={labelStyle}>Customer Status</label>
          <div style={{ display:"flex", gap:8 }}>
            {[["none","— None"],["dropoff","🚗 Drop-Off"],["waiting","⏳ Waiting"]].map(([v,l]) => (
              <button key={v} onClick={() => setF(p=>({...p,waitStatus:v}))} style={{ flex:1, padding:"10px 0", borderRadius:12, border:"2px solid "+(f.waitStatus===v?ACCENT:BORDER), background:f.waitStatus===v?ACCENT2:"transparent", color:f.waitStatus===v?ACCENT:TEXT2, fontWeight:600, cursor:"pointer" }}>{l}</button>
            ))}
          </div>
        </div>
        <div style={{ fontSize:10, fontWeight:800, color:MUTED, textTransform:"uppercase", letterSpacing:"0.8px" }}>Job Info</div>
        <div>
          <label style={labelStyle}>Priority</label>
          <div style={{ display:"flex", gap:8 }}>
            {["LOW","NORMAL","HIGH"].map(p => (
              <button key={p} onClick={() => setF(prev=>({...prev,priority:p}))} style={{ flex:1, padding:"10px 0", borderRadius:12, border:"2px solid "+(f.priority===p?ACCENT:BORDER), background:f.priority===p?ACCENT2:"transparent", color:f.priority===p?ACCENT:TEXT2, fontWeight:600, cursor:"pointer" }}>{p}</button>
            ))}
          </div>
        </div>
        <div><label style={labelStyle}>Flat Rate Hours</label><input type="number" placeholder="e.g. 2.5" value={f.hours} onChange={e => setF(p=>({...p,hours:e.target.value}))} style={inputStyle}/></div>
        <JobFieldTrigger value={f.jobs} onOpen={() => setShowJobPicker(true)} />
        {showJobPicker && <JobPicker value={f.jobs} onChange={v => setF(p=>({...p,jobs:v}))} presets={jobPresets||DEFAULT_JOB_PRESETS} onClose={() => setShowJobPicker(false)} />}
        <div><label style={labelStyle}>Promise Time (optional)</label><input type="datetime-local" value={f.promiseTime||""} onChange={e => setF(p=>({...p,promiseTime:e.target.value}))} style={{ ...inputStyle, colorScheme:"dark" }}/></div>
        <div><label style={labelStyle}>Customer Concern</label><textarea placeholder="What the customer says…" value={f.concern} onChange={e => setF(p=>({...p,concern:e.target.value}))} style={{ ...inputStyle, minHeight:60, resize:"vertical" }}/></div>
        <div><label style={labelStyle}>Notes</label><textarea placeholder="Any extra info…" value={f.notes} onChange={e => setF(p=>({...p,notes:e.target.value}))} style={{ ...inputStyle, minHeight:50, resize:"vertical" }}/></div>
        <div>
          <label style={labelStyle}>Place In</label>
          <div style={{ display:"flex", gap:8, marginBottom:10 }}>
            {[["queue","Staging Queue"],["tech","Technician"]].map(([v,l]) => (
              <button key={v} onClick={() => setF(p=>({...p,dest:v}))} style={{ flex:1, padding:11, borderRadius:12, border:"2px solid "+(f.dest===v?ACCENT:BORDER), background:f.dest===v?ACCENT2:"transparent", color:f.dest===v?ACCENT:TEXT2, fontWeight:600, cursor:"pointer" }}>{l}</button>
            ))}
          </div>
          {f.dest === "queue" ? (
            <select value={f.assignQueue} onChange={e => setF(p=>({...p,assignQueue:e.target.value}))} style={{ ...inputStyle, appearance:"auto" }}>
              {queues.map(q => <option key={q.id} value={q.id}>{q.name}</option>)}
            </select>
          ) : (
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
              <select value={f.assignTech} onChange={e => setF(p=>({...p,assignTech:e.target.value}))} style={{ ...inputStyle, appearance:"auto" }}>
                <option value="">— Tech —</option>
                {techs.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <select value={f.assignCol} onChange={e => setF(p=>({...p,assignCol:e.target.value}))} style={{ ...inputStyle, appearance:"auto" }}>
                {COLS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
          )}
        </div>
        <button onClick={handleAdd} style={{ padding:15, background:ACCENT, color:"#fff", border:"none", borderRadius:14, fontWeight:700, fontSize:16, cursor:"pointer" }}>+ Create RO</button>
      </div>
    </Sheet>
  );
}

function ArchiveModal({ archived, onClose, onRestore, wide }) {
  return (
    <Sheet title="Archived Tickets" subtitle={archived.length + " total"} onClose={onClose} wide={wide}>
      {archived.length === 0 ? (
        <div style={{ textAlign:"center", color:MUTED, padding:"48px 0", fontSize:15 }}>No archived tickets</div>
      ) : (
        archived.map(entry => {
          const ro = entry.ro;
          return (
            <div key={ro.id+entry.archivedAt} style={{ background:"rgba(255,255,255,0.05)", borderRadius:14, padding:"14px 16px", marginBottom:10 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                <div>
                  <div style={{ fontWeight:800, fontSize:15, color:"#E2E8F0" }}>{ro.roNum}</div>
                  <div style={{ fontSize:13, color:"rgba(255,255,255,0.4)", marginTop:2 }}>{[ro.year,ro.make,ro.model].filter(Boolean).join(" ")||"No vehicle"}</div>
                  <div style={{ fontSize:12, color:MUTED, marginTop:1 }}>{ro.customer}</div>
                  <div style={{ fontSize:11, color:MUTED, marginTop:4 }}>{"Archived " + new Date(entry.archivedAt).toLocaleDateString()}</div>
                </div>
                <button onClick={() => onRestore(entry)} style={{ background:ACCENT2, color:ACCENT, border:"none", borderRadius:10, padding:"8px 14px", fontWeight:600, cursor:"pointer" }}>Restore</button>
              </div>
            </div>
          );
        })
      )}
    </Sheet>
  );
}

const PRESET_COLORS = ["#1D6BF3","#9333EA","#16A34A","#EF4444","#D97706","#0891B2","#DB2777","#65A30D","#7C3AED","#EA580C"];
const COLOR_BG = { "#1D6BF3":"#EEF4FF","#9333EA":"#FAF5FF","#16A34A":"#F0FDF4","#EF4444":"#FEF2F2","#D97706":"#FFFBEB","#0891B2":"#ECFEFF","#DB2777":"#FDF2F8","#65A30D":"#F7FEE7","#7C3AED":"#F5F3FF","#EA580C":"#FFF7ED" };

function JobPresetsEditor({ presets, onSave }) {
  const [list, setList] = useState([...presets]);
  const [newJob, setNewJob] = useState("");
  function addJob() { const j = newJob.trim(); if (!j || list.includes(j)) return; setList(l=>[...l,j]); setNewJob(""); }
  function removeJob(j) { setList(l=>l.filter(x=>x!==j)); }
  return (
    <div>
      <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginBottom:14 }}>
        {list.map(j => { const ab = abbrevJob(j); return (
          <span key={j} style={{ background:ab.bg, color:ab.color, fontSize:12, fontWeight:600, padding:"4px 10px", borderRadius:8, display:"flex", alignItems:"center", gap:4 }}>
            {j}<button onClick={() => removeJob(j)} style={{ background:"none", border:"none", cursor:"pointer", color:ab.color, padding:0 }}>×</button>
          </span>
        ); })}
      </div>
      <div style={{ display:"flex", gap:8, marginBottom:12 }}>
        <input placeholder="Add new job type…" value={newJob} onChange={e => setNewJob(e.target.value)} onKeyDown={e => e.key==="Enter" && addJob()} style={{ ...inputStyle, flex:1, padding:"10px 12px" }}/>
        <button onClick={addJob} style={{ background:ACCENT, color:"#fff", border:"none", borderRadius:10, padding:"0 16px", fontWeight:600, cursor:"pointer" }}>Add</button>
      </div>
      <button onClick={() => onSave(list)} style={{ width:"100%", padding:13, background:"linear-gradient(135deg,#0A84FF,#5E5CE6)", color:"#fff", border:"none", borderRadius:12, fontWeight:700, cursor:"pointer" }}>Save Job Presets</button>
    </div>
  );
}

function ServiceTypeSettings({ serviceTypes, jobPresets, onClose, onSave, onSaveJobs, wide }) {
  const [types, setTypes] = useState(serviceTypes.map(s=>({...s})));
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#1D6BF3");
  function addType() { if (!newName.trim()) return; const id="st-"+Date.now(); setTypes(t=>[...t,{id,name:newName.trim(),color:newColor,bg:COLOR_BG[newColor]||"#F8FAFC"}]); setNewName(""); setNewColor("#1D6BF3"); }
  function removeType(id) { setTypes(t=>t.filter(x=>x.id!==id)); }
  function updateName(id,name) { setTypes(t=>t.map(x=>x.id===id?{...x,name}:x)); }
  function updateColor(id,color) { setTypes(t=>t.map(x=>x.id===id?{...x,color,bg:COLOR_BG[color]||"#F8FAFC"}:x)); }
  return (
    <Sheet title="Service Types" subtitle="Manage RO categories" onClose={onClose} wide={wide}>
      <div>
        {types.map(st => (
          <div key={st.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 0", borderBottom:"0.5px solid "+BORDER }}>
            <span style={{ width:12, height:12, borderRadius:"50%", background:st.color, flexShrink:0 }}/>
            <input value={st.name} onChange={e => updateName(st.id,e.target.value)} style={{ ...inputStyle, flex:1, padding:"8px 10px", fontSize:13 }}/>
            <div style={{ display:"flex", gap:4, flexWrap:"wrap", width:140 }}>
              {PRESET_COLORS.map(c => <button key={c} onClick={() => updateColor(st.id,c)} style={{ width:18, height:18, borderRadius:"50%", background:c, border:"2px solid "+(st.color===c?"#fff":"transparent"), cursor:"pointer" }}/>)}
            </div>
            <button onClick={() => removeType(st.id)} style={{ background:"#FEF2F2", color:"#EF4444", border:"1px solid #FECACA", borderRadius:8, padding:"4px 10px", fontWeight:600, cursor:"pointer", fontSize:12 }}>Remove</button>
          </div>
        ))}
        <div style={{ marginTop:16, paddingTop:16, borderTop:"1px solid "+BORDER }}>
          <div style={{ fontSize:11, fontWeight:700, color:MUTED, textTransform:"uppercase", letterSpacing:"0.8px", marginBottom:8 }}>Add New Category</div>
          <div style={{ display:"flex", gap:8, marginBottom:10 }}>
            <input placeholder="Category name…" value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key==="Enter" && addType()} style={{ ...inputStyle, flex:1, padding:"10px" }}/>
            <button onClick={addType} style={{ background:ACCENT, color:"#fff", border:"none", borderRadius:10, padding:"0 16px", fontWeight:600, cursor:"pointer" }}>Add</button>
          </div>
          <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:16 }}>
            {PRESET_COLORS.map(c => <button key={c} onClick={() => setNewColor(c)} style={{ width:28, height:28, borderRadius:"50%", background:c, border:"3px solid "+(newColor===c?"#fff":"transparent"), cursor:"pointer" }}/>)}
          </div>
        </div>
        <button onClick={() => onSave(types)} style={{ marginTop:16, width:"100%", padding:14, background:ACCENT, color:"#fff", border:"none", borderRadius:12, fontWeight:700, cursor:"pointer" }}>Save Service Types</button>
        <div style={{ marginTop:28, paddingTop:20, borderTop:"2px solid "+BORDER }}>
          <div style={{ fontWeight:800, fontSize:16, color:TEXT, marginBottom:4 }}>Job Presets</div>
          <div style={{ fontSize:12, color:MUTED, marginBottom:14 }}>Edit the list of common jobs</div>
          <JobPresetsEditor presets={jobPresets} onSave={onSaveJobs} />
        </div>
      </div>
    </Sheet>
  );
}

function ChangePinModal({ user, onClose, onSave }) {
  const [current, setCurrent] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [err, setErr] = useState("");
  function handleSave() {
    if (current !== user.pin) { setErr("Current PIN is incorrect"); return; }
    if (newPin.length < 4) { setErr("New PIN must be at least 4 digits"); return; }
    if (newPin !== confirm) { setErr("PINs do not match"); return; }
    if (!/^[0-9]+$/.test(newPin)) { setErr("PIN must be numbers only"); return; }
    onSave(newPin); onClose();
  }
  const inp = (val, set, placeholder) => (
    <input type="password" placeholder={placeholder} value={val} onChange={e => { set(e.target.value.replace(/\D/g,"")); setErr(""); }} onKeyDown={e => e.key==="Enter" && handleSave()} style={{ ...inputStyle, textAlign:"center", fontSize:20, letterSpacing:"0.4em", marginBottom:12 }}/>
  );
  return (
    <div onClick={e => { if(e.target===e.currentTarget)onClose(); }} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:3000, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ background:SHEET_BG, borderRadius:20, padding:"24px 20px", width:"100%", maxWidth:320 }}>
        <div style={{ fontWeight:800, fontSize:18, color:TEXT, marginBottom:4 }}>Change PIN</div>
        <div style={{ fontSize:12, color:TEXT3, marginBottom:20 }}>{user.name}</div>
        {inp(current, setCurrent, "Current PIN")}
        {inp(newPin, setNewPin, "New PIN")}
        {inp(confirm, setConfirm, "Confirm New PIN")}
        {err && <div style={{ color:DANGER, fontSize:12, textAlign:"center", marginBottom:10, fontWeight:500 }}>{err}</div>}
        <button onClick={handleSave} style={{ width:"100%", padding:14, background:ACCENT, color:"#fff", border:"none", borderRadius:12, fontWeight:700, cursor:"pointer", marginBottom:8 }}>Save New PIN</button>
        <button onClick={onClose} style={{ width:"100%", padding:12, background:"rgba(255,255,255,0.06)", color:TEXT2, border:"none", borderRadius:12, fontWeight:600, cursor:"pointer" }}>Cancel</button>
      </div>
    </div>
  );
}

function LoginScreen({ onLogin }) {
  const [selectedId, setSelectedId] = useState("");
  const [pin, setPin] = useState("");
  const [err, setErr] = useState("");
  const [shake, setShake] = useState(false);
  const [step, setStep] = useState("name");
  const [dots, setDots] = useState([false,false,false,false,false,false]);
  const selectedUser = USERS.find(u => u.id === selectedId);
  const PIN_LEN = selectedUser?.pin?.length || 4;

  function handlePadPress(val) {
    if (shake) return;
    if (val === "del") {
      const np = pin.slice(0,-1);
      setPin(np);
      setDots(d => { const n=[...d]; n[np.length]=false; return n; });
      setErr("");
    } else {
      if (pin.length >= PIN_LEN) return;
      const np = pin + val;
      setPin(np);
      setDots(d => { const n=[...d]; n[np.length-1]=true; return n; });
      if (np.length === PIN_LEN) {
        setTimeout(() => {
          const saved = JSON.parse(localStorage.getItem("sft-pins")||"{}");
          const activePin = saved[selectedUser.id] || selectedUser.pin;
          if (activePin === np) {
            onLogin(selectedUser);
          } else {
            setShake(true); setErr("Try again");
            setTimeout(() => { setShake(false); setErr(""); setPin(""); setDots([false,false,false,false,false,false]); }, 600);
          }
        }, 120);
      }
    }
  }

  const PAD = [["1","2","3"],["4","5","6"],["7","8","9"],["","0","del"]];
  return (
    <div style={{ minHeight:"100vh", background:"#000000", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"24px 20px", position:"relative", overflow:"hidden" }}>
      <div style={{ position:"absolute", top:"-20%", left:"50%", transform:"translateX(-50%)", width:400, height:400, background:"radial-gradient(circle, rgba(10,132,255,0.15) 0%, transparent 70%)", pointerEvents:"none" }}/>
      <div style={{ animation:"fade-in 0.5s ease", textAlign:"center", marginBottom:32 }}>
        <div style={{ margin:"0 auto 18px", filter:"drop-shadow(0 0 30px rgba(10,132,255,0.4))" }}><WFLogo size={84} radius={11} /></div>
        <div style={{ color:TEXT, fontWeight:700, fontSize:36, fontFamily:"'Space Grotesk',-apple-system,sans-serif" }}>
          <span style={{ color:TEXT }}>Worq</span><span style={{ background:"linear-gradient(90deg,#0A84FF,#BF5AF2)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>flow</span>
        </div>
        <div style={{ color:"rgba(255,255,255,0.28)", fontSize:13, marginTop:8 }}>
          {step==="name" ? "Sign in to continue" : "Welcome back, "+selectedUser?.name}
        </div>
      </div>
      {step === "name" && (
        <div style={{ width:"100%", maxWidth:340, animation:"fade-in 0.3s ease" }}>
          <div style={{ background:"rgba(255,255,255,0.04)", borderRadius:24, padding:"24px 20px" }}>
            <div style={{ fontSize:11, fontWeight:600, color:"rgba(255,255,255,0.3)", textTransform:"uppercase", letterSpacing:"1px", marginBottom:10 }}>Your Name</div>
            <div style={{ position:"relative", marginBottom:20 }}>
              <select value={selectedId} onChange={e => { setSelectedId(e.target.value); setPin(""); setErr(""); setDots([false,false,false,false,false,false]); }} style={{ width:"100%", padding:"16px 44px 16px 18px", background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.12)", borderRadius:14, color:TEXT, fontSize:16, outline:"none", appearance:"none", cursor:"pointer" }}>
                <option value="" disabled style={{ color:"#666" }}>Select your name…</option>
                {USERS.map(u => <option key={u.id} value={u.id} style={{ color:"#fff", background:"#1C1C1E" }}>{u.name} ({u.role})</option>)}
              </select>
              <div style={{ position:"absolute", right:16, top:"50%", transform:"translateY(-50%)", pointerEvents:"none", color:TEXT3 }}><ChevDownIcon/></div>
            </div>
            <button onClick={() => { if(selectedId) setStep("pin"); }} style={{ width:"100%", padding:"16px", background:selectedId?"linear-gradient(135deg,#0A84FF,#5E5CE6)":"rgba(255,255,255,0.06)", color:selectedId?"#fff":"rgba(255,255,255,0.3)", border:"none", borderRadius:14, fontWeight:700, fontSize:16, cursor:selectedId?"pointer":"not-allowed" }}>Continue</button>
          </div>
        </div>
      )}
      {step === "pin" && (
        <div style={{ width:"100%", maxWidth:300, marginTop:32, animation:"fade-in 0.25s ease" }}>
          <div style={{ display:"flex", gap:16, marginBottom:8, transform:shake?"translateX(0)":"none", animation:shake?"shake 0.4s ease":"none", justifyContent:"center" }}>
            {Array.from({length:PIN_LEN}).map((_,i) => <div key={i} style={{ width:14, height:14, borderRadius:"50%", background:dots[i]?"#0A84FF":"rgba(255,255,255,0.15)", transition:"background 0.1s" }}/>)}
          </div>
          <div style={{ height:20, marginBottom:16, display:"flex", alignItems:"center", justifyContent:"center" }}>
            {err && <span style={{ fontSize:12, color:DANGER, fontWeight:500 }}>{err}</span>}
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, width:"100%", maxWidth:280, margin:"0 auto" }}>
            {PAD.flat().map((key,i) => {
              if (key === "") return <div key={i}/>;
              const isDel = key === "del";
              return (
                <button key={i} className="pad-btn" onPointerDown={e => { e.preventDefault(); handlePadPress(key); }}
                  style={{ height:76, borderRadius:22, border:"none", background:isDel?"rgba(255,255,255,0.05)":"rgba(255,255,255,0.09)", color:isDel?"rgba(255,255,255,0.55)":TEXT, fontSize:isDel?20:28, fontWeight:300, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:isDel?"0 1px 0 rgba(255,255,255,0.06) inset":"0 1px 0 rgba(255,255,255,0.14) inset, 0 4px 16px rgba(0,0,0,0.5)", fontFamily:"-apple-system,sans-serif", WebkitUserSelect:"none", userSelect:"none", touchAction:"manipulation" }}>
                  {key}
                </button>
              );
            })}
          </div>
          <button onClick={() => { setStep("name"); setPin(""); setErr(""); setDots([false,false,false,false,false,false]); }} style={{ marginTop:28, background:"none", border:"none", color:"rgba(255,255,255,0.4)", fontSize:14, cursor:"pointer", width:"100%", textAlign:"center" }}>← Switch account</button>
        </div>
      )}
      <div style={{ position:"absolute", bottom:24, fontSize:11, color:"rgba(255,255,255,0.12)" }}>Worqflow · Built for service teams</div>
    </div>
  );
}

const ACTIVITIES = [
  { id:"moving",    label:"Moving Cars", emoji:"🚗", color:"#FF9F0A" },
  { id:"parts_run", label:"Parts Run",   emoji:"📦", color:"#BF5AF2" },
];

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function ShopFlowTracker() {
  const [currentUser, setCurrentUser] = useState(null);
  const [state, setState] = useState(loadState);
  const [showAdd, setShowAdd] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  const [showServiceTypes, setShowServiceTypes] = useState(false);
  const [partsCollapsed, setPartsCollapsed] = useState(false);
  const [showChangePin, setShowChangePin] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showActivity, setShowActivity] = useState(false);
  const [showTimeClock, setShowTimeClock] = useState(false);
  const [detailRO, setDetailRO] = useState(null);
  const [movingRO, setMovingRO] = useState(null);
  const [collapsed, setCollapsed] = useState({});
  const tickRef = useRef(null);
  const isWide = useIsWide();
  const isAdmin   = currentUser && currentUser.role === "admin";
  const isManager = currentUser && currentUser.role === "manager";
  const isAdvisor = currentUser && currentUser.role === "advisor";
  const isTech    = currentUser && currentUser.role === "tech";
  const canSeeAll = isAdmin || isManager || isAdvisor;
  const canCreateRO = isAdmin;
  const canSettings = isAdmin;
  const canMove = isAdmin || isTech;

  useSaveToFirebase(state);
  useLoadFromFirebase(setState);
  useEffect(() => { saveState(state); }, [state]);
  useEffect(() => {
    tickRef.current = setInterval(() => {
      setState(s => { const any = Object.values(s.timers).some(t => t.running); return any ? { ...s } : s; });
    }, 1000);
    return () => clearInterval(tickRef.current);
  }, []);

  function upd(fn) { setState(s => fn({ ...s })); }
  function getRO(id) { return state.ros.find(r => r.id === id); }
  const visibleTechs = canSeeAll ? state.techs : state.techs.filter(t => currentUser && t.id === currentUser.id);

  function removeFromAll(s, roId) {
    const grid = {};
    Object.entries(s.grid).forEach(([tid,cols]) => { grid[tid] = {}; Object.entries(cols).forEach(([cid,ids]) => { grid[tid][cid] = ids.filter(x => x !== roId); }); });
    const qSlots = {};
    Object.entries(s.qSlots).forEach(([qid,ids]) => { qSlots[qid] = ids.filter(x => x !== roId); });
    return { ...s, grid, qSlots, partsSlots:(s.partsSlots||[]).filter(x => x !== roId) };
  }

  function handleMove(dest) {
    if (!movingRO) return;
    const roId = movingRO.id;
    upd(s => {
      const ns = removeFromAll(s, roId);
      if (dest.type === "grid") {
        const existing = ns.grid[dest.techId][dest.colId] || [];
        const newState = { ...ns, grid: { ...ns.grid, [dest.techId]: { ...ns.grid[dest.techId], [dest.colId]: [...existing, roId] } } };
        if (dest.colId === "completed" || dest.colId === "delivered") {
          const key = dest.techId + "_" + roId;
          const already = ns.completedByTech || {};
          if (!already[key]) { const techCount = already[dest.techId] || 0; newState.completedByTech = { ...already, [key]:true, [dest.techId]: techCount + 1 }; }
        }
        return newState;
      } else if (dest.type === "parts") {
        return { ...ns, partsSlots: [...(ns.partsSlots||[]), roId] };
      } else {
        return { ...ns, qSlots: { ...ns.qSlots, [dest.queueId]: [...(ns.qSlots[dest.queueId]||[]), roId] } };
      }
    });
    setMovingRO(null);
  }

  function handleTimer(roId) {
    upd(s => {
      const now = Date.now();
      const t = s.timers[roId] || { running:false, elapsed:0, startedAt:null };
      const updated = { ...s.timers };
      if (!t.running) { Object.keys(updated).forEach(id => { if (id !== roId && updated[id] && updated[id].running) { updated[id] = { ...updated[id], running:false, elapsed:updated[id].elapsed + Math.floor((now - updated[id].startedAt)/1000) }; } }); }
      updated[roId] = t.running ? { running:false, elapsed:t.elapsed + Math.floor((now-t.startedAt)/1000), startedAt:null } : { running:true, elapsed:t.elapsed, startedAt:now };
      return { ...s, timers:updated };
    });
  }

  function handleHoursChange(roId, val) { upd(s => ({ ...s, ros: s.ros.map(r => r.id === roId ? { ...r, hours:val } : r) })); }
  function handleSaveRO(f) { upd(s => ({ ...s, ros: s.ros.map(r => r.id === f.id ? { ...r, ...f } : r) })); }
  function handleDeleteRO(roId) { upd(s => { const ns = removeFromAll(s, roId); return { ...ns, ros:ns.ros.filter(r => r.id !== roId) }; }); setDetailRO(null); }
  function handleArchive(roId) {
    upd(s => { const ro = getRO(roId); const ns = removeFromAll(s, roId); return { ...ns, ros:ns.ros.filter(r => r.id !== roId), archived:[...(ns.archived||[]), { ro, archivedAt:Date.now() }] }; });
    setDetailRO(null);
  }
  function handleRestore(entry) {
    upd(s => ({ ...s, ros:[...s.ros,{...entry.ro}], archived:(s.archived||[]).filter(e=>e.archivedAt!==entry.archivedAt), qSlots:{ ...s.qSlots, "q-main":[...(s.qSlots["q-main"]||[]), entry.ro.id] }, timers:{ ...s.timers, [entry.ro.id]:{ running:false, elapsed:0, startedAt:null } } }));
  }
  function handleAddRO(f) {
    const roId = "ro-" + Date.now();
    const ro = { id:roId, roNum:f.roNum||"RO-"+String(state.nextNum).padStart(4,"0"), serviceType:f.serviceType||"st-main", year:f.year, make:f.make, model:f.model, color:f.color, plate:f.plate, vin:f.vin, mileageIn:f.mileageIn, customer:f.customer, phone:f.phone, email:f.email, waitStatus:f.waitStatus||"none", priority:f.priority||"NORMAL", hours:f.hours, jobs:f.jobs, promiseTime:f.promiseTime, concern:f.concern, notes:f.notes, roNotes:[] };
    upd(s => {
      const ns = { ...s, ros:[...s.ros, ro], nextNum:s.nextNum+1, timers:{ ...s.timers, [roId]:{ running:false, elapsed:0, startedAt:null } } };
      if (f.dest === "tech" && f.assignTech) { const col = f.assignCol||"ondeck"; ns.grid = { ...ns.grid, [f.assignTech]:{ ...ns.grid[f.assignTech], [col]:[...(ns.grid[f.assignTech][col]||[]), roId] } }; }
      else { const qid = f.assignQueue||"q-main"; ns.qSlots = { ...ns.qSlots, [qid]:[...(ns.qSlots[qid]||[]), roId] }; }
      return ns;
    });
    setShowAdd(false);
  }
  function handleSaveServiceTypes(types) { upd(s => ({ ...s, serviceTypes:types })); setShowServiceTypes(false); }
  function handleAddNote(roId, text, authorName) {
    if (!text.trim()) return;
    const note = { id:Date.now(), text:text.trim(), author:authorName, time:Date.now() };
    upd(s => ({ ...s, ros: s.ros.map(r => r.id === roId ? { ...r, roNotes:[...(r.roNotes||[]),note] } : r) }));
  }
  function handleClockIn(userId)  { upd(s => ({ ...s, timeClockLog:[...(s.timeClockLog||[]),{userId,type:"in",clockIn:Date.now()}] })); }
  function handleClockOut(userId) { upd(s => ({ ...s, timeClockLog:[...(s.timeClockLog||[]),{userId,type:"out",clockIn:Date.now()}] })); }
  function isClockedIn(userId) { const log = state.timeClockLog||[]; return log.filter(e=>e.userId===userId&&e.type==="in").length > log.filter(e=>e.userId===userId&&e.type==="out").length; }
  function handleStartActivity(activityId, userId) { upd(s => ({ ...s, activityLog:[...(s.activityLog||[]),{activityId,userId,startTime:Date.now(),endTime:null}] })); }
  function handleStopActivity(entry) { upd(s => ({ ...s, activityLog:(s.activityLog||[]).map(e => e.userId===entry.userId&&e.activityId===entry.activityId&&!e.endTime ? {...e,endTime:Date.now()} : e) })); }
  function handleSavePin(newPin) { if (typeof window !== "undefined") { const pins = JSON.parse(localStorage.getItem("sft-pins")||"{}"); pins[currentUser.id] = newPin; localStorage.setItem("sft-pins", JSON.stringify(pins)); setCurrentUser(u=>({...u,pin:newPin})); } }
  function handleSaveJobPresets(presets) { upd(s => ({ ...s, jobPresets:presets })); setShowServiceTypes(false); }

  function techStats(techId) {
    const all = COLS.flatMap(c => state.grid[techId] ? (state.grid[techId][c.id]||[]) : []);
    const hrs = all.reduce((sum,id) => { const ro = getRO(id); if(!ro||!ro.hours) return sum; return sum + (parseFloat(String(ro.hours).replace(/[^0-9.]/g,""))||0); }, 0);
    const cumulative = (state.completedByTech||{})[techId] || 0;
    return { count:all.length, hrs, cumulative };
  }

  function renderCard(ro, colId) {
    return (
      <ROCard key={ro.id} ro={ro} timer={state.timers[ro.id]} onTap={() => { if(!movingRO) setDetailRO({ro,colId}); }} onMove={() => { if(!canMove) return; setDetailRO(null); setMovingRO(movingRO&&movingRO.id===ro.id ? null : ro); }} isMoving={movingRO && movingRO.id === ro.id} serviceTypes={state.serviceTypes} canMove={canMove}/>
    );
  }

  const flagged = totalFlaggedHours(state);
  const progress = Math.min(flagged / GOAL_HOURS, 1);
  const GAP = 6;
  const TECH_W = isWide ? 150 : 100;
  const CELL_W_MOBILE = 148;
  const useFluid = isWide;

  if (!currentUser) return <LoginScreen onLogin={setCurrentUser} />;

  return (
    <div style={{ fontFamily:"-apple-system,BlinkMacSystemFont,'SF Pro Text','Space Grotesk',sans-serif", background:BG, minHeight:"100vh", minHeight:"100dvh", overflowX:"hidden" }}>
      {movingRO && (
        <div style={{ position:"fixed", top:0, left:0, right:0, zIndex:400, background:ACCENT, padding:"10px 16px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ color:"#fff", fontWeight:700, fontSize:13, display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ background:"rgba(255,255,255,0.2)", borderRadius:8, padding:"2px 8px", fontSize:12 }}>{movingRO.roNum}</span>
            — tap any column or queue to place it
          </div>
          <button onClick={() => setMovingRO(null)} style={{ background:"rgba(255,255,255,0.2)", border:"none", color:"#fff", borderRadius:8, padding:"4px 12px", fontWeight:600, cursor:"pointer" }}>Cancel</button>
        </div>
      )}
      {/* Header */}
      <div style={{ background:"rgba(10,14,24,0.92)", backdropFilter:"blur(40px)", WebkitBackdropFilter:"blur(40px)", borderBottom:"0.5px solid rgba(255,255,255,0.06)", padding:"10px 14px", display:"flex", alignItems:"center", gap:10, position:"sticky", top:0, zIndex:300 }}>
        <div style={{ flexShrink:0, filter:"drop-shadow(0 2px 8px rgba(10,132,255,0.4))" }}><WFLogo size={34} radius={7} /></div>
        <div style={{ flex:isWide?0:1 }}>
          <div style={{ color:TEXT, fontWeight:700, fontSize:isWide?15:14, letterSpacing:"-0.3px", fontFamily:"'Space Grotesk',sans-serif" }}>Worqflow</div>
          <div style={{ color:TEXT3, fontSize:10, marginTop:1 }}>{currentUser.name} · {currentUser.role}</div>
        </div>
        <LiveClock />
        {!isAdvisor && (
          <div style={{ flex:1, display:"flex", justifyContent:"center" }}>
            <div style={{ background:"rgba(14,18,30,0.9)", borderRadius:12, padding:"8px 16px", display:"flex", alignItems:"center", gap:10, minWidth:180 }}>
              <span style={{ color:SUCCESS, display:"flex", alignItems:"center" }}><DollarIcon/></span>
              <div style={{ flex:1 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline" }}>
                  <span style={{ fontSize:isWide?16:14, fontWeight:800, color:"#F0F4FF" }}>
                    <span style={{ color:SUCCESS }}>{flagged.toFixed(1)}</span>
                    <span style={{ color:"rgba(255,255,255,0.35)", fontSize:11, fontWeight:600 }}> / {GOAL_HOURS}h</span>
                  </span>
                  <span style={{ fontSize:10, color:"rgba(255,255,255,0.35)", fontWeight:600 }}>flagged hrs</span>
                </div>
                <div style={{ height:5, background:"rgba(255,255,255,0.1)", borderRadius:3, overflow:"hidden", marginTop:4 }}>
                  <div style={{ width:(progress*100)+"%", height:"100%", background:"linear-gradient(90deg,#30D158,#0A84FF)", borderRadius:3, transition:"width 0.4s" }}/>
                </div>
              </div>
            </div>
          </div>
        )}
        {isAdvisor && <div style={{ flex:1 }}/>}
        <div style={{ display:"flex", gap:8 }}>
          {canSeeAll && <button onClick={() => setShowArchive(true)} style={{ width:36, height:36, borderRadius:10, background:"rgba(255,255,255,0.07)", border:"0.5px solid rgba(255,255,255,0.1)", color:TEXT2, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}><BoxIcon /></button>}
          {canSettings && <button onClick={() => setShowServiceTypes(true)} style={{ width:36, height:36, borderRadius:10, background:"rgba(255,255,255,0.07)", border:"0.5px solid rgba(255,255,255,0.1)", color:TEXT2, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}><SettingsIcon /></button>}
          {canCreateRO && <button onClick={() => setShowAdd(true)} style={{ height:34, padding:"0 16px", background:ACCENT, color:"#fff", border:"none", borderRadius:10, fontWeight:600, fontSize:13, cursor:"pointer", display:"flex", alignItems:"center", gap:4 }}><PlusIcon /> New RO</button>}
          <button onClick={() => setShowChangePin(true)} style={{ width:36, height:36, borderRadius:10, background:"rgba(255,255,255,0.07)", border:"0.5px solid rgba(255,255,255,0.1)", color:TEXT2, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>🔑</button>
          <button onClick={() => setCurrentUser(null)} style={{ width:36, height:36, borderRadius:10, background:"rgba(255,255,255,0.07)", border:"0.5px solid rgba(255,255,255,0.1)", color:TEXT2, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}><LogoutIcon /></button>
        </div>
      </div>

      <div style={{ padding:"10px 0 60px", marginTop:movingRO?44:0 }}>
        <div style={{ padding:"0 14px", marginBottom:6 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ flex:1, height:"0.5px", background:"rgba(255,255,255,0.06)" }}/>
            <span style={{ fontSize:10, fontWeight:600, color:TEXT3, letterSpacing:"0.8px", textTransform:"uppercase" }}>{isAdmin ? "Technicians" : currentUser.name}</span>
            <div style={{ flex:1, height:"0.5px", background:"rgba(255,255,255,0.06)" }}/>
          </div>
        </div>

        <div style={{ overflowX: useFluid ? "hidden" : "auto", WebkitOverflowScrolling:"touch", padding:"0 14px" }}>
          <div style={{ display:"inline-flex", flexDirection:"column", width: useFluid ? "100%" : "auto", minWidth: useFluid ? "100%" : "auto" }}>
            {/* Column headers */}
            <div style={{ display:"flex", gap:GAP, marginBottom:6 }}>
              <div style={{ width:TECH_W, minWidth:TECH_W, flexShrink:0 }} />
              {COLS.map(col => (
                <div key={col.id} style={{ flex: useFluid ? 1 : "none", width: useFluid ? "auto" : CELL_W_MOBILE, minWidth: useFluid ? 0 : CELL_W_MOBILE }}>
                  <div style={{ background:"rgba(255,255,255,0.04)", color:col.color, padding:"5px 8px", borderRadius:8, fontSize:10, fontWeight:700, textAlign:"center", letterSpacing:"0.4px", textTransform:"uppercase" }}>{col.label}</div>
                </div>
              ))}
            </div>
            {/* Tech rows */}
            {visibleTechs.map(tech => {
              const { count, hrs, cumulative } = techStats(tech.id);
              return (
                <div key={tech.id} style={{ display:"flex", gap:GAP, marginBottom:GAP, alignItems:"flex-start" }}>
                  <div style={{ width:TECH_W, minWidth:TECH_W, flexShrink:0, background:TECH_BG, borderRadius:12, padding:"10px 8px", boxSizing:"border-box" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <div style={{ width:30, height:30, borderRadius:"50%", background:"linear-gradient(135deg,#0A84FF,#5E5CE6)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, color:"#fff", flexShrink:0 }}>{initials(tech.name)}</div>
                      <div style={{ minWidth:0 }}>
                        <div style={{ fontWeight:500, fontSize:11, color:TEXT2, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{tech.name}</div>
                        <div style={{ fontSize:10, color:TEXT3, marginTop:2, display:"flex", gap:4, alignItems:"center" }}>
                          {!isAdvisor && <span style={{ color:SUCCESS, fontWeight:500 }}>{hrs.toFixed(1)}h</span>}
                          <span style={{ color:TEXT3 }}>{cumulative}✓</span>
                          {isAdmin && isClockedIn(tech.id) && <span style={{ width:5, height:5, borderRadius:"50%", background:SUCCESS, display:"inline-block" }}/>}
                        </div>
                      </div>
                    </div>
                    {isAdmin && (
                      <div style={{ marginTop:8, display:"flex", flexDirection:"column", gap:4 }}>
                        <div style={{ display:"flex", gap:4 }}>
                          {(() => {
                            const active = (state.activityLog||[]).find(e => e.userId===tech.id && !e.endTime);
                            if (active) {
                              const act = ACTIVITIES.find(a => a.id === active.activityId);
                              return <button onClick={() => handleStopActivity(active)} style={{ flex:1, background:act?.color+"22", color:act?.color, border:"none", borderRadius:6, padding:"4px 0", fontSize:9, fontWeight:600, cursor:"pointer" }}>{act?.emoji} Stop</button>;
                            }
                            return ACTIVITIES.map(act => <button key={act.id} onClick={() => handleStartActivity(act.id, tech.id)} style={{ flex:1, background:"rgba(255,255,255,0.04)", color:TEXT3, border:"none", borderRadius:6, padding:"4px 0", fontSize:10, cursor:"pointer" }}>{act.emoji}</button>);
                          })()}
                        </div>
                        {isClockedIn(tech.id) ? (
                          <button onClick={() => handleClockOut(tech.id)} style={{ width:"100%", background:"rgba(255,69,58,0.12)", color:DANGER, border:"none", borderRadius:6, padding:"4px 0", fontSize:9, fontWeight:600, cursor:"pointer" }}>🕐 Clock Out</button>
                        ) : (
                          <button onClick={() => handleClockIn(tech.id)} style={{ width:"100%", background:"rgba(48,209,88,0.12)", color:SUCCESS, border:"none", borderRadius:6, padding:"4px 0", fontSize:9, fontWeight:600, cursor:"pointer" }}>🟢 Clock In</button>
                        )}
                      </div>
                    )}
                  </div>
                  {COLS.map(col => {
                    const ids = state.grid[tech.id] ? (state.grid[tech.id][col.id]||[]) : [];
                    const isTarget = movingRO && !ids.includes(movingRO.id);
                    return (
                      <div key={col.id} onClick={() => { if(isTarget) handleMove({ type:"grid", techId:tech.id, colId:col.id }); }}
                        style={{ flex: useFluid ? 1 : "none", width: useFluid ? "auto" : CELL_W_MOBILE, minWidth: useFluid ? 0 : CELL_W_MOBILE, flexShrink: useFluid ? 1 : 0, background: isTarget ? "rgba(10,132,255,0.10)" : CELL_BG, border: "0.5px solid "+(isTarget?"#0A84FF":col.border), borderRadius:12, padding: ids.length ? "7px 7px 2px" : 0, display:"flex", flexDirection:"column", alignItems: ids.length ? "stretch" : "center", justifyContent: ids.length ? "flex-start" : "center", minHeight:82, boxSizing:"border-box", cursor: isTarget ? "pointer" : "default", boxShadow: isTarget ? "0 0 0 1.5px #0A84FF, "+CELL_SHADOW : CELL_SHADOW, backdropFilter:"blur(4px)", WebkitBackdropFilter:"blur(4px)" }}>
                        {ids.length === 0 ? (
                          isTarget ? (
                            <span style={{ color:ACCENT, fontSize:9, fontWeight:500, textAlign:"center", padding:8 }}>Tap to place here</span>
                          ) : (
                            <div style={{ padding:"6px 8px", width:"100%", boxSizing:"border-box" }}><SkeletonCard /></div>
                          )
                        ) : (
                          ids.map(roId => { const ro = getRO(roId); if (!ro) return null; return renderCard(ro, col.id); })
                        )}
                        {ids.length > 0 && isTarget && (
                          <div style={{ margin:"4px 0 6px", padding:"7px", background:"rgba(10,132,255,0.12)", borderRadius:8, textAlign:"center", fontSize:9, color:ACCENT, fontWeight:600, cursor:"pointer" }}>+ Place here</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        {/* Waiting on Parts */}
        {(() => {
          const partIds = state.partsSlots || [];
          const isPartsTarget = movingRO && !partIds.includes(movingRO.id);
          return (
            <div style={{ padding:"10px 14px 0" }}>
              <div style={{ background:"rgba(14,18,30,0.97)", borderRadius:16, overflow:"hidden" }}>
                <div style={{ background:"linear-gradient(135deg,rgba(191,90,242,0.3),rgba(191,90,242,0.1))", padding:"10px 14px", display:"flex", alignItems:"center", gap:10 }}>
                  <div style={{ width:28, height:28, background:"rgba(191,90,242,0.25)", borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", fontSize:14 }}>📦</div>
                  <div style={{ flex:1 }}>
                    <div style={{ color:TEXT, fontWeight:700, fontSize:14 }}>Waiting on Parts</div>
                    <div style={{ color:"rgba(255,255,255,0.45)", fontSize:10, marginTop:1 }}>Hold until parts arrive</div>
                  </div>
                  <div style={{ background:"rgba(191,90,242,0.3)", color:"#E5B8FF", borderRadius:8, padding:"3px 10px", fontSize:12, fontWeight:700 }}>{partIds.length}</div>
                  <button onClick={() => setPartsCollapsed(c=>!c)} style={{ background:"none", border:"none", color:TEXT3, cursor:"pointer", padding:4 }}>{partsCollapsed ? <ChevDownIcon/> : <ChevUpIcon/>}</button>
                </div>
                {!partsCollapsed && (
                  <div style={{ padding:"10px 10px 8px" }}>
                    {partIds.length === 0 && !isPartsTarget ? (
                      <div style={{ border:"1px dashed rgba(191,90,242,0.2)", borderRadius:12, padding:"20px 16px", textAlign:"center" }}>
                        <div style={{ fontSize:24, marginBottom:8 }}>🔩</div>
                        <div style={{ fontSize:13, color:"rgba(255,255,255,0.3)", fontWeight:500 }}>No vehicles waiting on parts</div>
                        <div style={{ fontSize:11, color:"rgba(255,255,255,0.18)", marginTop:4 }}>Long-press an RO card to move it here</div>
                      </div>
                    ) : (
                      <div style={{ maxHeight: partIds.length > 3 ? 270 : "none", overflowY: partIds.length > 3 ? "auto" : "visible" }}>
                        {partIds.map(roId => { const ro = getRO(roId); if (!ro) return null; return renderCard(ro, "parts"); })}
                      </div>
                    )}
                    {isPartsTarget && <button onClick={() => handleMove({type:"parts"})} style={{ width:"100%", padding:12, background:"rgba(191,90,242,0.12)", color:"#E5B8FF", border:"1px solid rgba(191,90,242,0.2)", borderRadius:10, fontWeight:600, cursor:"pointer", marginTop:8 }}>📦 Move to Waiting on Parts</button>}
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* Staging Queues */}
        <div style={{ padding:"10px 14px 0" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
            <div style={{ flex:1, height:"0.5px", background:"rgba(255,255,255,0.06)" }}/>
            <span style={{ fontSize:10, fontWeight:600, color:TEXT3, letterSpacing:"0.8px", textTransform:"uppercase" }}>Staging Queues</span>
            <div style={{ flex:1, height:"0.5px", background:"rgba(255,255,255,0.06)" }}/>
          </div>
          <div style={{ padding:"0 0 0", display:isWide?"flex":"block", gap:8, alignItems:"flex-start" }}>
            {(isWide ? [...state.queues].sort((a,b) => { const order={"q-main":0,"q-used":1,"q-pdi":2}; return (order[a.id]??99)-(order[b.id]??99); }) : state.queues).map(queue => {
              const ids = state.qSlots[queue.id] || [];
              const isCollapsed = collapsed[queue.id];
              const isTarget = movingRO && !ids.includes(movingRO.id);
              return (
                <div key={queue.id} style={{ flex:1, marginBottom:isWide?0:12, background:"rgba(14,18,30,0.97)", borderRadius:16, overflow:"hidden" }}>
                  <div style={{ background:"linear-gradient(135deg,"+queue.color+","+queue.color+"99)", padding:"10px 14px", display:"flex", alignItems:"center", gap:10 }}>
                    <div style={{ width:28, height:28, background:"rgba(255,255,255,0.2)", borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", fontSize:14 }}>{queue.icon}</div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ color:"#fff", fontWeight:800, fontSize:14, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{queue.name}</div>
                      <div style={{ color:"rgba(255,255,255,0.7)", fontSize:10, marginTop:1 }}>{queue.subtitle}</div>
                    </div>
                    <div style={{ background:"rgba(255,255,255,0.25)", color:"#fff", borderRadius:8, padding:"3px 10px", fontSize:12, fontWeight:700 }}>{ids.length}</div>
                    {isAdmin && <button onClick={() => setShowAdd(true)} style={{ width:26, height:26, borderRadius:6, background:"rgba(255,255,255,0.2)", border:"none", color:"#fff", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}><PlusIcon /></button>}
                    <button onClick={() => setCollapsed(c=>({...c,[queue.id]:!c[queue.id]}))} style={{ background:"none", border:"none", color:"rgba(255,255,255,0.7)", cursor:"pointer", padding:4 }}>{isCollapsed ? <ChevDownIcon/> : <ChevUpIcon/>}</button>
                  </div>
                  {!isCollapsed && (
                    <div style={{ padding:"10px 10px 8px" }}>
                      <div style={{ maxHeight:ids.length>3?270:"none", overflowY:ids.length>3?"auto":"visible" }}>
                        {ids.map(roId => { const ro = getRO(roId); if(!ro) return null; return renderCard(ro, "queue"); })}
                      </div>
                      {ids.length > 3 && <div style={{ textAlign:"center", fontSize:10, color:MUTED, padding:"2px 0 4px" }}>Scroll to see all {ids.length}</div>}
                      {isTarget && <button onClick={() => handleMove({type:"queue",queueId:queue.id})} style={{ width:"100%", padding:10, background:"rgba(255,255,255,0.08)", color:"#fff", border:"none", borderRadius:8, fontWeight:600, cursor:"pointer", marginTop:6 }}>{queue.icon} Move to {queue.name}</button>}
                      {ids.length === 0 && !isTarget && <div style={{ border:"2px dashed "+BORDER, borderRadius:12, padding:18, textAlign:"center", color:MUTED, fontSize:12 }}>{isAdmin ? "Use + to add tickets" : "No tickets here"}</div>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Modals */}
      {showChangePin && currentUser && <ChangePinModal user={currentUser} onClose={() => setShowChangePin(false)} onSave={handleSavePin} />}
      {showAdd && <NewROModal onAdd={handleAddRO} onClose={() => setShowAdd(false)} nextNum={state.nextNum} techs={state.techs} queues={state.queues} wide={isWide} serviceTypes={state.serviceTypes||DEFAULT_SERVICE_TYPES} jobPresets={state.jobPresets||DEFAULT_JOB_PRESETS} />}
      {showArchive && <ArchiveModal archived={state.archived||[]} onClose={() => setShowArchive(false)} onRestore={handleRestore} wide={isWide} />}
      {showServiceTypes && <ServiceTypeSettings serviceTypes={state.serviceTypes||DEFAULT_SERVICE_TYPES} jobPresets={state.jobPresets||DEFAULT_JOB_PRESETS} onClose={() => setShowServiceTypes(false)} onSave={handleSaveServiceTypes} onSaveJobs={handleSaveJobPresets} wide={isWide} />}
      {detailRO && !movingRO && (
        <RODetail ro={detailRO.ro} colId={detailRO.colId} timer={state.timers[detailRO.ro.id]} onClose={() => setDetailRO(null)} onSave={f => { handleSaveRO(f); setDetailRO(d=>({...d,ro:{...d.ro,...f}})); }} onDelete={handleDeleteRO} onArchive={handleArchive} onTimer={handleTimer} onHoursChange={(id,val) => { handleHoursChange(id,val); setDetailRO(d=>({...d,ro:{...d.ro,hours:val}})); }} wide={isWide} isAdmin={isAdmin} isTech={isTech} serviceTypes={state.serviceTypes} jobPresets={state.jobPresets} currentUser2={currentUser} onAddNote={(roId,text,author) => { handleAddNote(roId,text,author); setDetailRO(d => d ? {...d,ro:{...d.ro,roNotes:[...(d.ro.roNotes||[]),{id:Date.now(),text,author,time:Date.now()}]}} : d); }} />
      )}
    </div>
  );
}
