/**
 * ShopFlowTracker — Service Department Board
 * © 2025 Worqflow. All rights reserved.
 *
 * This software and its source code are proprietary
 * and confidential. Unauthorized copying, transfer,
 * or reproduction of the contents of this file, via
 * any medium, is strictly prohibited.
 *
 * Built by Worqflow — worqflow.vercel.app
 */
import { useState, useEffect, useRef, useCallback, memo } from "react";
import { doc, setDoc, getDoc, updateDoc, deleteDoc, collection, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';
// ─── Global styles injected once ─────────────────────────────────────────────
// Load Space Grotesk font
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
    "@keyframes fade-in { from{opacity:0;transform:translateY(8px) scale(0.97)} to{opacity:1;transform:translateY(0) scale(1)} }",
    "@keyframes slide-up { from{transform:translateY(48px);opacity:0} to{transform:translateY(0);opacity:1} }",
    "@keyframes card-in { from{opacity:0;transform:translateY(12px) scale(0.95)} to{opacity:1;transform:translateY(0) scale(1)} }",
    "@keyframes urgent-glow { 0%,100%{box-shadow:0 0 0 0 rgba(255,69,58,0)} 50%{box-shadow:0 0 14px 3px rgba(255,69,58,0.35)} }",
    "@keyframes shimmer { from{background-position:-200px 0} to{background-position:200px 0} }",
    "@keyframes snap-in { from{opacity:0;transform:scale(0.94)} to{opacity:1;transform:scale(1)} }",
    "@keyframes shake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-9px)} 40%{transform:translateX(9px)} 60%{transform:translateX(-5px)} 80%{transform:translateX(5px)} }",
    "* { -webkit-tap-highlight-color: transparent; box-sizing: border-box; }",
    "input, select, textarea { color-scheme: dark; }",
    "::-webkit-scrollbar { width: 0px; height: 0px; }",
    ".card-press { transition: transform 0.15s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.15s ease, background 0.15s ease; }",
    ".card-press:active { transform: scale(0.96) !important; }",
    ".col-snap { scroll-snap-type: x mandatory; }",
    ".col-snap-item { scroll-snap-align: start; }",
    ".pad-btn { -webkit-tap-highlight-color: transparent; user-select: none; -webkit-user-select: none; touch-action: manipulation; transition: transform 0.1s cubic-bezier(0.34,1.56,0.64,1), background 0.1s ease; }",
    ".pad-btn:active { transform: scale(0.88) !important; background: rgba(255,255,255,0.18) !important; }",
    ".btn-press { transition: transform 0.12s cubic-bezier(0.34,1.56,0.64,1), opacity 0.12s ease; }",
    ".btn-press:active { transform: scale(0.94) !important; opacity: 0.8 !important; }",
  ].join(" ");
  document.head.appendChild(s);
}
// ─── Theme — Apple iOS Dark ──────────────────────────────────────────────────
const BG         = "#000000";                    // pure OLED black
const SURFACE    = "rgba(255,255,255,0.05)";     // frosted glass
const SURFACE2   = "rgba(255,255,255,0.09)";     // elevated glass
const BORDER     = "rgba(255,255,255,0.08)";     // barely visible border
const BORDER2    = "rgba(255,255,255,0.14)";     // slightly brighter
const TEXT       = "#FFFFFF";                    // pure white — Apple uses this
const TEXT2      = "rgba(255,255,255,0.7)";      // secondary — 70% white
const TEXT3      = "rgba(255,255,255,0.4)";      // tertiary — 40% white
const ACCENT     = "#0A84FF";                    // Apple's exact iOS blue
const ACCENT2    = "rgba(10,132,255,0.15)";      // blue tint
const SUCCESS    = "#30D158";                    // Apple green
const WARN       = "#FF9F0A";                    // Apple amber
const DANGER     = "#FF453A";                    // Apple red
const CARD_BG    = "rgba(28,32,48,0.95)";        // card — elevated dark slate
const CARD_TOP   = "rgba(255,255,255,0.13)";     // top highlight — light catching edge
const CARD_BORDER= "rgba(255,255,255,0.07)";     // card edge subtle
const CARD_SHADOW= "0 1px 0 rgba(255,255,255,0.10) inset, 0 -1px 0 rgba(0,0,0,0.4) inset, 0 4px 6px rgba(0,0,0,0.4), 0 12px 32px rgba(0,0,0,0.5)";  // 3D raised card
const CELL_BG    = "rgba(8,10,18,0.7)";          // cell well — recessed/inset look
const CELL_SHADOW= "inset 0 2px 8px rgba(0,0,0,0.5), inset 0 1px 3px rgba(0,0,0,0.6)"; // inset tray
const TECH_BG    = "rgba(22,26,42,0.98)";        // tech card — slightly elevated
const SHEET_BG   = "#13161F";                    // sheet background
const INPUT_BG   = "rgba(255,255,255,0.06)";     // input field
// Legacy aliases — keep these so nothing breaks
const SUB     = "rgba(255,255,255,0.5)";
const MUTED   = "rgba(255,255,255,0.28)";
// Animations injected via useEffect below
// ─── Data ─────────────────────────────────────────────────────────────────────
const COLS = [
  { id:"ondeck",     label:"On Deck",     color:"#0A84FF", bg:"rgba(10,132,255,0.07)",  border:"rgba(10,132,255,0.2)"  },
  { id:"inprogress", label:"In Progress", color:"#FF9F0A", bg:"rgba(255,159,10,0.07)",  border:"rgba(255,159,10,0.2)"  },
  { id:"completed",  label:"Completed / QC", color:"#30D158", bg:"rgba(48,209,88,0.07)", border:"rgba(48,209,88,0.2)"  },
  { id:"delivered",  label:"Delivered",   color:"#636366", bg:"rgba(99,99,102,0.07)",   border:"rgba(99,99,102,0.2)"   },
];
const PARTS_COL = { id:"waiting", color:"#BF5AF2", bg:"rgba(191,90,242,0.07)", border:"rgba(191,90,242,0.2)" };
const USERS = [
  { id:"admin",   name:"AD",        role:"admin",   pin:"052513" },
  { id:"manager", name:"Jay",       role:"manager", pin:"1000"   },
  { id:"advisor", name:"Mario",     role:"advisor", pin:"2000"   },
  { id:"t1",      name:"Type S",    role:"tech",    pin:"1111"   },
  { id:"t2",      name:"LA",        role:"tech",    pin:"2222"   },
  { id:"t3",      name:"Darcheezy", role:"tech",    pin:"3333"   },
  { id:"t4",      name:"Jason",     role:"tech",    pin:"4444"   },
];
const SAMPLE_ROS = [
  { id:"ro-1001", roNum:"RO-1001", promiseTime:"", roNotes:[], serviceType:"st-main", year:"2021", make:"Toyota",    model:"Camry",    color:"White",  vin:"", plate:"ABC1234", mileageIn:"42100", mileageOut:"", customer:"Sarah Mitchell", phone:"555-0101", email:"sarah@email.com", waitStatus:"waiting", priority:"NORMAL", hours:"",    jobs:"Oil Change",  concern:"Oil change due", cause:"", correction:"", parts:"", notes:"" },
  { id:"ro-1002", roNum:"RO-1002", promiseTime:"", roNotes:[], serviceType:"st-main", year:"2019", make:"Ford",      model:"F-150",    color:"Black",  vin:"", plate:"XYZ9876", mileageIn:"88500", mileageOut:"", customer:"James Parker",  phone:"555-0102", email:"james@email.com", waitStatus:"none", priority:"HIGH",   hours:"",    jobs:"Brakes",      concern:"Grinding noise on braking", cause:"Worn brake pads", correction:"Replace rear pads and rotors", parts:"Brake pads, Rotors", notes:"" },
  { id:"ro-1003", roNum:"RO-1003", promiseTime:"", roNotes:[], serviceType:"st-pdi", year:"2026", make:"Honda",     model:"Civic",    color:"Blue",   vin:"", plate:"PDI4421", mileageIn:"12",    mileageOut:"", customer:"PDI Unit 4421", phone:"",         email:"",               waitStatus:"none", priority:"NORMAL", hours:"5",   jobs:"General",     concern:"PDI inspection", cause:"", correction:"", parts:"", notes:"" },
  { id:"ro-1004", roNum:"RO-1004", promiseTime:"", roNotes:[], serviceType:"st-used", year:"2020", make:"Chevrolet", model:"Malibu",   color:"Silver", vin:"", plate:"STOCK882",mileageIn:"31200", mileageOut:"", customer:"Used Lot 882",  phone:"",         email:"",               waitStatus:"none", priority:"LOW",    hours:"2.5", jobs:"General",     concern:"Used car inspection", cause:"", correction:"", parts:"", notes:"" },
  { id:"ro-1005", roNum:"RO-1005", promiseTime:"", roNotes:[], serviceType:"st-main", year:"2022", make:"BMW",       model:"3 Series", color:"Grey",   vin:"", plate:"BMW3SRS", mileageIn:"55800", mileageOut:"", customer:"Emily Chen",    phone:"555-0105", email:"emily@email.com", waitStatus:"waiting", priority:"HIGH",   hours:"5",   jobs:"Diagnostic",  concern:"Check engine light on", cause:"", correction:"", parts:"", notes:"Diag first" },  { id:"ro-87045", roNum:"RO-87045", promiseTime:"", roNotes:[], serviceType:"st-main", year:"2012", make:"Toyota", model:"Prius C", color:"", vin:"JTDKDTB30C012993", plate:"", mileageIn:"126566", mileageOut:"", customer:"Virginia Gray", phone:"(413) 522-6058", email:"", waitStatus:"dropoff", priority:"NORMAL", hours:"", jobs:"Multi Point Inspection, Rear Noise Diagnosis", concern:"Multi Point Inspection. C/S hears noise from the rear — check and advise", cause:"", correction:"", parts:"", notes:"Created by Mario Sandoval" },
  { id:"ro-55922", roNum:"RO-55922", promiseTime:"", roNotes:[], serviceType:"st-main", year:"2016", make:"Toyota", model:"Highlander", color:"", vin:"5TDDKRFH0GS254800", plate:"", mileageIn:"", mileageOut:"", customer:"Erin Greninger", phone:"(256) 348-3177", email:"", waitStatus:"waiting", priority:"NORMAL", hours:"", jobs:"Sunroof Leak, 5000 Mile Service, Brakes Check", concern:"C/S sunroof is leaking check and advise. 5000 miles basic severe service menu. C/S front and rear brakes might need work — check and advise", cause:"", correction:"", parts:"", notes:"Spoke to Mario" },
  { id:"ro-56003", roNum:"RO-56003", promiseTime:"", roNotes:[], serviceType:"st-main", year:"2023", make:"Toyota", model:"Corolla Cross", color:"", vin:"7MUCAABG2PV053905", plate:"", mileageIn:"", mileageOut:"", customer:"Robert Raffety", phone:"(703) 862-6099", email:"", waitStatus:"dropoff", priority:"NORMAL", hours:"", jobs:"A/C Noise", concern:"C/S AC fan is making a lot of noise — car was just purchased", cause:"", correction:"", parts:"", notes:"" },
];
const DEFAULT_TECHS = USERS.filter(u => u.role === "tech").map(u => ({ id: u.id, name: u.name, role: u.role, pin: u.pin }));
const DEFAULT_QUEUES = [
  { id:"q-main", name:"Main Shop Work", subtitle:"Priority #1",              color:"#EF4444", icon:"🔧" },
  { id:"q-pdi",  name:"PDIs",           subtitle:"Pre-Delivery Inspections", color:"#9333EA", icon:"🚗" },
  { id:"q-used", name:"Used Cars",      subtitle:"Secondary Priority",       color:"#16A34A", icon:"🏷️" },
];
const STORAGE_KEY = "sft-v22";
const GOAL_HOURS  = 40;
// ─── Service Types ────────────────────────────────────────────────────────────
const DEFAULT_SERVICE_TYPES = [
  { id:"st-main", name:"Main Shop",  color:"#EF4444", bg:"rgba(239,68,68,0.08)" },
  { id:"st-pdi",  name:"PDI",        color:"#9333EA", bg:"#FAF5FF" },
  { id:"st-used", name:"Used Cars",  color:"#16A34A", bg:"#F0FDF4" },
];
// ─── Default Job Presets ─────────────────────────────────────────────────────
const DEFAULT_JOB_PRESETS = [
  "Oil Change","Tire Rotation","Brake Pads","Brake Rotors","Alignment",
  "Diagnostic","Battery","Air Filter","Cabin Filter","Spark Plugs",
  "Trans Flush","Coolant Flush","Brake Flush","Fuel Filter","Wiper Blades",
  "Serpentine Belt","Timing Belt","Water Pump","Alternator","Starter",
  "A/C Service","Shocks/Struts","Wheel Bearing","CV Axle","Tie Rod",
  "General Inspection","PDI","Detail",
];
// ─── State ────────────────────────────────────────────────────────────────────
function freshState() {
  return {
    techs: DEFAULT_TECHS,
    queues: DEFAULT_QUEUES,
    ros: [],
    nextNum: 1,
    grid: {},
    partsSlots: [],
    completedByTech: {},
    activityLog: [],
    timeClockLog: [],
    qSlots: { "q-main":[], "q-pdi":[], "q-used":[] },
    timers: {},
    archived: [],
    serviceTypes: DEFAULT_SERVICE_TYPES,
    jobPresets: DEFAULT_JOB_PRESETS,
    displayPin: "9999",
  };
}
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      return { ...freshState(), ...p, techs: p.techs || DEFAULT_TECHS, queues: p.queues || DEFAULT_QUEUES, serviceTypes: p.serviceTypes || DEFAULT_SERVICE_TYPES, jobPresets: p.jobPresets || DEFAULT_JOB_PRESETS, partsSlots: p.partsSlots || [], completedByTech: p.completedByTech || {}, activityLog: p.activityLog || [], timeClockLog: p.timeClockLog || [] };
    }
  } catch(e) {}
  return freshState();
}
function saveState(s) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch(e) {}
}
// ─── Helpers ──────────────────────────────────────────────────────────────────
function initials(name) {
  return name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
}
function fmtTime(secs) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m + "m " + String(s).padStart(2, "0") + "s";
}
function jobChipStyle(j) {
  const v = j.toLowerCase();
  if (v.includes("diag"))  return { background:"#EEF4FF", color:"#1D4ED8" };
  if (v.includes("oil"))   return { background:"#FFF7ED", color:"#C2410C" };
  if (v.includes("brake")) return { background:"#FFF1F2", color:"#BE123C" };
  if (v.includes("trans")) return { background:"#FAF5FF", color:"#7E22CE" };
  if (v.includes("tire"))  return { background:"#F0FDF4", color:"#15803D" };
  return { background:"#F8FAFC", color:"#475569" };
}
function priorityBorder(p) {  if (p === "HIGH") return "#EF4444";
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
// ─── SVG Icons as proper components ──────────────────────────────────────────
function PlusIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <line x1="12" y1="5" x2="12" y2="19"/>
      <line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  );
}
function PlayIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
      <polygon points="5 3 19 12 5 21 5 3"/>
    </svg>
  );
}
function PauseIcon() {  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
      <rect x="6" y="4" width="4" height="16"/>
      <rect x="14" y="4" width="4" height="16"/>
    </svg>
  );
}
function XIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <line x1="18" y1="6" x2="6" y2="18"/>
      <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  );
}
function ClockIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12 6 12 12 16 14"/>
    </svg>
  );
}
function DollarIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="12" y1="1" x2="12" y2="23"/>
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
    </svg>
  );
}
function UserIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  );
}
function MoveIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">      <polyline points="5 9 2 12 5 15"/>
      <polyline points="9 5 12 2 15 5"/>
      <polyline points="15 19 12 22 9 19"/>
      <polyline points="19 9 22 12 19 15"/>
      <line x1="2" y1="12" x2="22" y2="12"/>
      <line x1="12" y1="2" x2="12" y2="22"/>
    </svg>
  );
}
function ArchiveIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="21 8 21 21 3 21 3 8"/>
      <rect x="1" y="3" width="22" height="5"/>
      <line x1="10" y1="12" x2="14" y2="12"/>
    </svg>
  );
}
function EditIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  );
}
function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
      <path d="M10 11v6"/>
      <path d="M14 11v6"/>
    </svg>
  );
}
function LogoutIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16 17 21 12 16 7"/>
      <line x1="21" y1="12" x2="9" y2="12"/>
    </svg>  );
}
function BoxIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="21 8 21 21 3 21 3 8"/>
      <rect x="1" y="3" width="22" height="5"/>
    </svg>
  );
}
function SettingsIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  );
}
function ChevDownIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  );
}
function ChevUpIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <polyline points="18 15 12 9 6 15"/>
    </svg>
  );
}
function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  );
}
function AnalyticsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
    </svg>
  );
}
function TimeClockIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  );
}
function ActivityIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>
  );
}
function KeyIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7.5" cy="15.5" r="5.5"/><path d="M21 2l-9.6 9.6"/><path d="M15.5 7.5l3 3L22 7l-3-3"/>
    </svg>
  );
}
function HistoryIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.95"/>
    </svg>
  );
}
function ReportIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
    </svg>
  );
}
// ─── Shared styles ────────────────────────────────────────────────────────────
const labelStyle = {  display: "block",
  fontSize: 10,
  fontWeight: 700,
  color: "rgba(255,255,255,0.35)",
  textTransform: "uppercase",
  letterSpacing: "0.8px",
  marginBottom: 6,
};
const inputStyle = {
  padding: "13px 14px",
  border: "none",
  borderRadius: 12,
  fontSize: 15,
  color: TEXT,
  background: INPUT_BG,
  outline: "none",
  fontFamily: "-apple-system,BlinkMacSystemFont,'SF Pro Text',sans-serif",
  width: "100%",
  boxSizing: "border-box",
  colorScheme: "dark",
  letterSpacing: "-0.1px",
  boxShadow: "inset 0 0 0 0.5px rgba(255,255,255,0.1)",
};
// ─── JobFieldTrigger — tappable field showing selected jobs ─────────────────
function JobFieldTrigger({ value, onOpen }) {
  const jobs = value ? value.split(",").map(j => j.trim()).filter(Boolean) : [];
  return (
    <div>
      <label style={labelStyle}>Job Types</label>
      <button type="button" onClick={onOpen}
        style={{ width:"100%", padding:"12px 14px", border:"1.5px solid "+BORDER, borderRadius:12, background:"rgba(255,255,255,0.07)", textAlign:"left", cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", justifyContent:"space-between", gap:8, minHeight:48, touchAction:"manipulation" }}>
        {jobs.length === 0 ? (
          <span style={{ color:MUTED, fontSize:14 }}>Tap to select job types…</span>
        ) : (
          <div style={{ display:"flex", gap:5, flexWrap:"wrap", flex:1 }}>
            {jobs.map((j, i) => {
              const ab = abbrevJob(j);
              return (
                <span key={i} style={{ background:ab.bg, color:ab.color, fontSize:11, fontWeight:700, padding:"3px 9px", borderRadius:20 }}>{j}</span>
              );
            })}
          </div>
        )}
        <span style={{ color:MUTED, fontSize:18, flexShrink:0 }}>›</span>
      </button>    </div>
  );
}
// ─── JobPicker ───────────────────────────────────────────────────────────────
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
    if (!selected.includes(j)) {
      onChange([...selected, j].join(", "));
    }
    setCustom("");
  }
  function removeJob(job) {
    onChange(selected.filter(j => j !== job).join(", "));
  }
  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", zIndex:4000, display:"flex", alignItems:"flex-end", justifyContent:"center" }}
    >
      <div style={{ background:SHEET_BG, borderRadius:"22px 22px 0 0", width:"100%", maxWidth:520, maxHeight:"88vh", display:"flex", flexDirection:"column", boxShadow:"0 -2px 0 rgba(255,255,255,0.06), 0 -20px 80px rgba(0,0,0,0.8)", animation:"slide-up 0.32s cubic-bezier(0.32,0.72,0,1)" }}>
        {/* Handle */}
        <div style={{ width:36, height:4, background:"#E5E7EB", borderRadius:2, margin:"12px auto 0", flexShrink:0 }} />
        {/* Header */}
        <div style={{ padding:"12px 18px 10px", borderBottom:"1px solid "+BORDER, display:"flex", justifyContent:"space-between", alignItems:"center", flexShrink:0 }}>
          <div>
            <div style={{ fontWeight:800, fontSize:17, color:"#F0F4FF", fontFamily:"'Barlow',sans-serif" }}>Job Types</div>
            <div style={{ fontSize:11, color:"rgba(255,255,255,0.35)", marginTop:1 }}>Tap to select · {selected.length} selected</div>
          </div>
          <button onClick={onClose} style={{ background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:10, width:32, height:32, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", color:"rgba(255,255,255,0.5)" }}>
            <XIcon />
          </button>        </div>
        {/* Selected pills */}
        {selected.length > 0 && (
          <div style={{ padding:"10px 18px 8px", borderBottom:"1px solid "+BORDER, flexShrink:0 }}>
            <div style={{ fontSize:10, fontWeight:700, color:"rgba(255,255,255,0.35)", textTransform:"uppercase", letterSpacing:"0.7px", marginBottom:7 }}>Selected</div>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
              {selected.map(j => {
                const ab = abbrevJob(j);
                return (
                  <span key={j} style={{ background:ab.bg, color:ab.color, fontSize:12, fontWeight:700, padding:"5px 10px", borderRadius:20, display:"flex", alignItems:"center", gap:5 }}>
                    {j}
                    <button onClick={() => removeJob(j)} style={{ background:"none", border:"none", cursor:"pointer", color:ab.color, padding:0, display:"flex", alignItems:"center", lineHeight:1, opacity:0.7, fontSize:14 }}>×</button>
                  </span>
                );
              })}
            </div>
          </div>
        )}
        {/* Preset list — scrollable */}
        <div style={{ overflowY:"auto", flex:1, padding:"10px 18px", WebkitOverflowScrolling:"touch" }}>
          <div style={{ fontSize:10, fontWeight:700, color:"rgba(255,255,255,0.35)", textTransform:"uppercase", letterSpacing:"0.7px", marginBottom:10 }}>Common Services</div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
            {(presets||[]).map(j => {
              const isSelected = selected.includes(j);
              const ab = abbrevJob(j);
              return (
                <button key={j} onClick={() => toggle(j)}
                  style={{ padding:"8px 14px", borderRadius:20, border:"1.5px solid "+(isSelected ? ab.color : BORDER), background:isSelected ? ab.bg : "rgba(255,255,255,0.06)", color:isSelected ? ab.color : "rgba(255,255,255,0.5)", fontWeight:700, fontSize:12, cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", gap:5, transition:"all 0.12s" }}>
                  {isSelected && <span style={{ fontSize:11, lineHeight:1 }}>✓</span>}
                  {j}
                </button>
              );
            })}
          </div>
        </div>
        {/* Custom job input */}
        <div style={{ padding:"10px 18px 12px", borderTop:"1px solid "+BORDER, flexShrink:0 }}>
          <div style={{ fontSize:10, fontWeight:700, color:"rgba(255,255,255,0.35)", textTransform:"uppercase", letterSpacing:"0.7px", marginBottom:8 }}>Add Custom Job</div>
          <div style={{ display:"flex", gap:8 }}>
            <input
              placeholder="e.g. Control Arms, Strut Mounts…" value={custom}
              onChange={e => setCustom(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addCustom()}
              style={{ ...inputStyle, flex:1, padding:"11px 14px", fontSize:14 }}
            />
            <button type="button" onClick={addCustom} style={{ background:ACCENT, color:"#fff", border:"none", borderRadius:12, padding:"0 18px", cursor:"pointer", fontWeight:700, fontSize:14, fontFamily:"inherit", whiteSpace:"nowrap" }}>
              Add
            </button>
          </div>
        </div>
        {/* Done button */}
        <div style={{ padding:"10px 18px 36px", flexShrink:0 }}>
          <button type="button" onClick={onClose}
            style={{ width:"100%", padding:14, background:ACCENT, color:"#fff", border:"none", borderRadius:14, fontFamily:"'Barlow',sans-serif", fontWeight:800, fontSize:16, cursor:"pointer", touchAction:"manipulation" }}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
// ─── HoursPicker ─────────────────────────────────────────────────────────────
function HoursPicker({ ro, onHoursChange, onClose }) {
  const [val, setVal] = useState(String(ro.hours||"").replace(/h$/i,""));
  const presets = ["0.5","1","1.5","2","2.5","3","4","5","6","8"];
  function commit() {
    onHoursChange(ro.id, val.replace(/[^0-9.]/g, "").trim());
    onClose();
  }
  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.4)", zIndex:4000, display:"flex", alignItems:"flex-end", justifyContent:"center" }}
    >
      <div style={{ background:"#fff", borderRadius:"24px 24px 0 0", width:"100%", maxWidth:500, padding:"20px 20px 40px", boxShadow:"0 -4px 40px rgba(0,0,0,0.15)" }}>
        <div style={{ width:36, height:4, background:"#E5E7EB", borderRadius:2, margin:"0 auto 20px" }} />
        <div style={{ fontWeight:800, fontSize:18, color:TEXT, marginBottom:2, fontFamily:"'Barlow',sans-serif" }}>Flat Rate Hours</div>
        <div style={{ fontSize:12, color:"rgba(255,255,255,0.35)", marginBottom:18 }}>{ro.roNum} · {[ro.year,ro.make,ro.model].filter(Boolean).join(" ")}</div>
        <div style={{ display:"flex", gap:10, marginBottom:16 }}>
          <input
            autoFocus
            type="number"min="0"step="0.5"value={val}
            onChange={e => setVal(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") commit(); if (e.key === "Escape") onClose(); }}
            placeholder="0.0"style={{ flex:1, padding:14, border:"2px solid "+ACCENT, borderRadius:12, fontSize:22, fontWeight:800, color:TEXT, outline:"none", fontFamily:"inherit", textAlign:"center", background:"#F8FAFC" }}
          />
          <button onClick={commit} style={{ background:SUCCESS, color:"#fff", border:"none", borderRadius:12, padding:"14px 22px", fontSize:15, fontWeight:800, cursor:"pointer", fontFamily:"inherit" }}>
            Set
          </button>
        </div>        <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:8, marginBottom:12 }}>
          {presets.map(v => (
            <button
              key={v}
              onClick={() => { onHoursChange(ro.id, v); onClose(); }}
              style={{ padding:"10px 4px", background:ro.hours===v?"#DCFCE7":"#F8FAFC", color:ro.hours===v?"#15803D":SUB, border:"1.5px solid "+(ro.hours===v?"#86EFAC":BORDER), borderRadius:10, fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}
            >
              {v}h
            </button>
          ))}
        </div>
        <div style={{ display:"flex", gap:8 }}>
          {ro.hours && (
            <button onClick={() => { onHoursChange(ro.id, ""); onClose(); }} style={{ flex:1, padding:12, background:"rgba(239,68,68,0.15)", color:"#F87171", border:"1px solid rgba(239,68,68,0.3)", borderRadius:12, fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
              Clear
            </button>
          )}
          <button onClick={onClose} style={{ flex:1, padding:12, background:"rgba(255,255,255,0.06)", color:"rgba(255,255,255,0.4)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:12, fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
// ─── Job abbreviations ───────────────────────────────────────────────────────
function abbrevJob(j) {
  if (!j || typeof j !== "string") return { label:"", bg:"rgba(100,116,139,0.18)", color:"#94A3B8" };
  const v = j.toLowerCase().trim();
  if (v.includes("oil"))         return { label:"Oil",    bg:"rgba(234,88,12,0.18)",   color:"#FB923C" };
  if (v.includes("brake"))       return { label:"Brks",   bg:"rgba(190,18,60,0.18)",   color:"#F87171" };
  if (v.includes("diag"))        return { label:"Diag",   bg:"rgba(29,78,216,0.18)",   color:"#60A5FA" };
  if (v.includes("trans"))       return { label:"Trans",  bg:"rgba(126,34,206,0.18)",  color:"#C084FC" };
  if (v.includes("tire"))        return { label:"Tires",  bg:"rgba(21,128,61,0.18)",   color:"#4ADE80" };
  if (v.includes("align"))       return { label:"Algn",   bg:"rgba(21,128,61,0.18)",   color:"#4ADE80" };
  if (v.includes("coolant"))     return { label:"Cool",   bg:"rgba(14,116,144,0.18)",  color:"#22D3EE" };
  if (v.includes("flush"))       return { label:"Flush",  bg:"rgba(14,116,144,0.18)",  color:"#22D3EE" };
  if (v.includes("filter"))      return { label:"Fltr",   bg:"rgba(194,65,12,0.18)",   color:"#FB923C" };
  if (v.includes("spark"))       return { label:"Plugs",  bg:"rgba(180,83,9,0.18)",    color:"#FBBF24" };
  if (v.includes("battery"))     return { label:"Batt",   bg:"rgba(180,83,9,0.18)",    color:"#FBBF24" };
  if (v.includes("inspect"))     return { label:"Insp",   bg:"rgba(100,116,139,0.18)", color:"#94A3B8" };
  if (v.includes("general"))     return { label:"Gen",    bg:"rgba(100,116,139,0.18)", color:"#94A3B8" };
  if (v.includes("pdi"))         return { label:"PDI",    bg:"rgba(126,34,206,0.18)",  color:"#C084FC" };
  if (v.includes("suspension"))  return { label:"Susp",   bg:"rgba(153,27,27,0.18)",   color:"#FCA5A5" };
  if (v.includes("ac") || v.includes("a/c")) return { label:"A/C", bg:"rgba(14,116,144,0.18)", color:"#22D3EE" };
  if (v.includes("rotat"))       return { label:"Rot",    bg:"rgba(21,128,61,0.18)",   color:"#4ADE80" };
  if (v.includes("wiper"))       return { label:"Wprs",   bg:"rgba(100,116,139,0.18)", color:"#94A3B8" };
  if (v.includes("belt"))        return { label:"Belt",   bg:"rgba(180,83,9,0.18)",    color:"#FBBF24" };
  if (v.includes("pump"))        return { label:"Pump",   bg:"rgba(14,116,144,0.18)",  color:"#22D3EE" };
  if (v.includes("axle") || v.includes("cv")) return { label:"Axle", bg:"rgba(153,27,27,0.18)", color:"#FCA5A5" };
  if (v.includes("arm"))         return { label:"Arm",    bg:"rgba(153,27,27,0.18)",   color:"#FCA5A5" };
  if (v.includes("tie"))         return { label:"Tie",    bg:"rgba(153,27,27,0.18)",   color:"#FCA5A5" };
  return { label: j.slice(0,4),            bg:"rgba(100,116,139,0.18)", color:"#94A3B8" };
}
// ─── Display Mode ────────────────────────────────────────────────────────────

function DisplayCard({ ro, timer, serviceTypes }) {
  const svcType = serviceTypes?.find(s => s.id === ro.serviceType);
  const leftColor = svcType?.color || (ro.priority === 'HIGH' ? '#FF453A' : '#1D6BF3');
  const vehicle = [ro.year, ro.make, ro.model].filter(Boolean).join(' ');
  const jobs = ro.jobs ? ro.jobs.split(',').map(j => j.trim()).filter(Boolean) : [];
  const elapsed = timer
    ? timer.running
      ? timer.elapsed + Math.floor((Date.now() - timer.startedAt) / 1000)
      : timer.elapsed
    : 0;

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-around',
      boxSizing: 'border-box',
      background: 'rgba(28,32,48,0.95)',
      borderRadius: 8,
      border: '1px solid rgba(255,255,255,0.08)',
      borderLeft: '3px solid ' + leftColor,
      padding: '4px 6px',
      overflow: 'hidden',
      animation: ro.priority === 'HIGH' ? 'urgent-glow 2.4s ease-in-out infinite' : 'none',
    }}>

      {/* ROW 1 — RO# + service type */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4, overflow: 'hidden', flexShrink: 0 }}>
        <span style={{ fontSize: 10, fontWeight: 800, color: '#FFFFFF', whiteSpace: 'nowrap', letterSpacing: '-0.2px', lineHeight: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {ro.roNum}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          {ro.priority === 'HIGH' && (
            <span style={{ fontSize: 5, fontWeight: 700, color: '#FF453A', background: 'rgba(255,69,58,0.15)', padding: '1px 4px', borderRadius: 3, lineHeight: 1.4 }}>
              URGENT
            </span>
          )}
          {svcType && (
            <span style={{ fontSize: 6, fontWeight: 600, color: svcType.color, display: 'flex', alignItems: 'center', gap: 2, lineHeight: 1 }}>
              <span style={{ width: 4, height: 4, borderRadius: '50%', background: svcType.color, display: 'inline-block', flexShrink: 0 }}/>
              {svcType.name}
            </span>
          )}
        </div>
      </div>

      {/* ROW 2 — Vehicle */}
      <div style={{ overflow: 'hidden', flexShrink: 0 }}>
        <span style={{
          fontSize: 9, fontWeight: 600,
          color: vehicle ? 'rgba(255,255,255,0.88)' : 'rgba(255,255,255,0.2)',
          whiteSpace: 'nowrap', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis',
          lineHeight: 1.2, fontStyle: vehicle ? 'normal' : 'italic',
        }}>
          {vehicle || 'No vehicle'}
        </span>
      </div>

      {/* ROW 3 — Customer */}
      <div style={{ overflow: 'hidden', flexShrink: 0 }}>
        <span style={{
          fontSize: 8, fontWeight: 400,
          color: ro.customer ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.12)',
          whiteSpace: 'nowrap', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.2,
        }}>
          {ro.customer || '—'}
        </span>
      </div>

      {/* ROW 4 — Jobs + Timer + Hours */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 3, overflow: 'hidden', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 2, flex: 1, overflow: 'hidden', alignItems: 'center', minWidth: 0 }}>
          {jobs.length === 0 ? (
            <span style={{ fontSize: 6, color: 'rgba(255,255,255,0.15)', fontStyle: 'italic' }}>No jobs</span>
          ) : (
            <>
              {jobs.slice(0, 3).map((j, i) => {
                const ab = abbrevJob(j);
                return (
                  <span key={i} style={{ background: ab.bg, color: ab.color, fontSize: 6, fontWeight: 700, padding: '1px 3px', borderRadius: 2, whiteSpace: 'nowrap', flexShrink: 0, lineHeight: 1.4 }}>
                    {ab.label}
                  </span>
                );
              })}
              {jobs.length > 3 && (
                <span style={{ fontSize: 6, color: 'rgba(255,255,255,0.3)', flexShrink: 0 }}>+{jobs.length - 3}</span>
              )}
            </>
          )}
        </div>
        <span style={{
          fontSize: 6, color: timer?.running ? '#FF9F0A' : 'rgba(255,255,255,0.3)',
          background: timer?.running ? 'rgba(255,159,10,0.12)' : 'rgba(255,255,255,0.05)',
          padding: '1px 3px', borderRadius: 3, whiteSpace: 'nowrap', flexShrink: 0, fontFamily: 'monospace', lineHeight: 1.4,
        }}>
          {fmtTime(elapsed)}
        </span>
        <span style={{
          fontSize: 6, fontWeight: 700,
          color: ro.hours ? '#30D158' : 'rgba(255,255,255,0.12)',
          background: ro.hours ? 'rgba(48,209,88,0.12)' : 'rgba(255,255,255,0.03)',
          padding: '1px 3px', borderRadius: 3, whiteSpace: 'nowrap', flexShrink: 0, lineHeight: 1.4,
        }}>
          {ro.hours ? String(ro.hours).replace(/h$/i, '') + 'h' : '—h'}
        </span>
      </div>
    </div>
  );
}

function DisplayScreen({ state, onLogout }) {
  const techs = state.techs || [];
  const serviceTypes = state.serviceTypes || [];

  function getRO(id) {
    return (state.ros || []).find(r => r.id === id);
  }

  const flagged = totalFlaggedHours(state);
  const progress = Math.min(flagged / GOAL_HOURS, 1);
  const revenue = Math.round(flagged * 125).toLocaleString('en-US');

  const techGridRows = techs.map(() => '1fr').join(' ');

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      maxWidth: '100vw',
      maxHeight: '100vh',
      background: '#000000',
      display: 'grid',
      gridTemplateRows: '44px 26px 1fr 80px 80px',
      overflow: 'hidden',
      fontFamily: '-apple-system,BlinkMacSystemFont,sans-serif',
      boxSizing: 'border-box',
    }}>

      {/* ── ZONE 1: HEADER 44px ── */}
      <div style={{
        height: 44,
        minHeight: 44,
        maxHeight: 44,
        flexShrink: 0,
        background: 'rgba(10,14,24,0.98)',
        borderBottom: '0.5px solid rgba(255,255,255,0.07)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 14px',
        gap: 0,
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}>

        {/* LEFT — Logo + Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0, cursor: 'pointer' }} onClick={onLogout}>
          <WFLogo size={24} radius={5} />
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#FFFFFF', whiteSpace: 'nowrap', lineHeight: 1.2 }}>
              Service Department
            </div>
            <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.18)', lineHeight: 1 }}>
              tap to logout
            </div>
          </div>
        </div>

        {/* CENTER — Hours tracker */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <span style={{ fontSize: 20, fontWeight: 800, color: '#30D158', letterSpacing: '-0.5px', lineHeight: 1, flexShrink: 0 }}>
            {flagged.toFixed(1)}
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)', whiteSpace: 'nowrap' }}>/ {GOAL_HOURS}h goal</span>
              <span style={{ fontSize: 8, fontWeight: 700, color: '#30D158', whiteSpace: 'nowrap' }}>${revenue}</span>
            </div>
            <div style={{ width: 140, height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ width: (progress * 100) + '%', height: '100%', background: 'linear-gradient(90deg,#30D158,#0A84FF)', borderRadius: 2 }}/>
            </div>
          </div>
        </div>

        {/* RIGHT — Clock + dot */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0 }}>
          <LiveClock />
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#30D158', boxShadow: '0 0 6px #30D158' }}/>
        </div>
      </div>

      {/* ── ZONE 2: COLUMN HEADERS 26px ── */}
      <div style={{ gridRow: 2, display: 'flex', alignItems: 'center', padding: '0 6px', gap: 4, boxSizing: 'border-box' }}>
        <div style={{ width: 80, minWidth: 80, flexShrink: 0 }}/>
        {COLS.map(col => (
          <div key={col.id} style={{ flex: 1, textAlign: 'center', fontSize: 10, fontWeight: 700, color: col.color, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
            {col.label}
          </div>
        ))}
      </div>

      {/* ── ZONE 3: KANBAN GRID (1fr) ── */}
      <div style={{
        gridRow: 3,
        display: 'grid',
        gridTemplateRows: techGridRows,
        gap: 3,
        padding: '2px 6px',
        overflow: 'hidden',
        boxSizing: 'border-box',
        minHeight: 0,
      }}>
        {techs.map(tech => {
          const allIds = COLS.flatMap(c => (state.grid[tech.id] || {})[c.id] || []);
          const techHrs = allIds.reduce((s, id) => {
            const ro = getRO(id);
            return s + (parseFloat(String(ro?.hours || '0').replace(/[^0-9.]/g, '')) || 0);
          }, 0);

          return (
            <div key={tech.id} style={{ display: 'flex', gap: 4, minHeight: 0, overflow: 'hidden' }}>
              {/* Tech card */}
              <div style={{ width: 80, minWidth: 80, flexShrink: 0, background: 'rgba(22,26,42,0.98)', borderRadius: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, padding: '4px', boxSizing: 'border-box', overflow: 'hidden' }}>
                <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'linear-gradient(135deg,#1D6BF3,#0A84FF)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                  {initials(tech.name)}
                </div>
                <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.85)', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%', padding: '0 3px', boxSizing: 'border-box', lineHeight: 1.2 }}>
                  {tech.name}
                </div>
                <div style={{ fontSize: 10, fontWeight: 700, color: techHrs > 0 ? '#30D158' : 'rgba(255,255,255,0.2)', background: techHrs > 0 ? 'rgba(48,209,88,0.12)' : 'rgba(255,255,255,0.04)', padding: '1px 6px', borderRadius: 4, whiteSpace: 'nowrap', lineHeight: 1.4 }}>
                  {techHrs > 0 ? techHrs.toFixed(1) + 'h' : '0h'}
                </div>
              </div>

              {/* 4 Kanban cells */}
              {COLS.map(col => {
                const ids = (state.grid[tech.id] || {})[col.id] || [];
                return (
                  <div key={col.id} style={{
                    flex: 1,
                    minWidth: 0,
                    minHeight: 0,
                    background: 'rgba(8,10,18,0.7)',
                    border: '0.5px solid ' + col.border,
                    borderRadius: 10,
                    padding: 5,
                    display: 'grid',
                    gridTemplateRows: ids.length === 0 ? '1fr' : ids.map(() => '1fr').join(' '),
                    gap: 4,
                    overflow: 'hidden',
                    boxSizing: 'border-box',
                  }}>
                    {ids.length === 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                        <div style={{ width: 20, height: 20, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.06)' }}/>
                        <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.1)' }}>Empty</span>
                      </div>
                    ) : (
                      ids.map(roId => {
                        const ro = getRO(roId);
                        if (!ro) return null;
                        return (
                          <DisplayCard key={ro.id} ro={ro} timer={state.timers[ro.id]} serviceTypes={serviceTypes} />
                        );
                      })
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* ── ZONE 4: WAITING ON PARTS 80px ── */}
      {(() => {
        const partIds = state.partsSlots || [];
        return (
          <div style={{ gridRow: 4, margin: '0 6px', background: 'rgba(14,18,30,0.97)', borderRadius: 10, overflow: 'hidden', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
            <div style={{ height: 28, flexShrink: 0, background: 'linear-gradient(135deg,rgba(191,90,242,0.35),rgba(191,90,242,0.15))', display: 'flex', alignItems: 'center', padding: '0 12px', gap: 8 }}>
              <span style={{ fontSize: 13 }}>🔧</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#E5B8FF' }}>Waiting on Parts</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#E5B8FF', background: 'rgba(191,90,242,0.3)', padding: '1px 8px', borderRadius: 10 }}>{partIds.length}</span>
            </div>
            <div style={{ flex: 1, minHeight: 0, display: 'flex', gap: 6, padding: '5px 8px', overflowX: 'auto', overflowY: 'hidden', alignItems: 'stretch', boxSizing: 'border-box' }}>
              {partIds.length === 0 ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: 'rgba(255,255,255,0.2)' }}>
                  No tickets waiting on parts
                </div>
              ) : (
                partIds.map(roId => {
                  const ro = getRO(roId);
                  if (!ro) return null;
                  return (
                    <div key={ro.id} style={{ width: partIds.length === 1 ? '100%' : 200, flexShrink: 0, height: '100%' }}>
                      <DisplayCard ro={ro} timer={state.timers[ro.id]} serviceTypes={serviceTypes} />
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })()}

      {/* ── ZONE 5: STAGING QUEUES 80px ── */}
      <div style={{ gridRow: 5, display: 'flex', gap: 4, padding: '3px 6px 4px', boxSizing: 'border-box', overflow: 'hidden' }}>
        {(state.queues || []).map(queue => {
          const ids = state.qSlots[queue.id] || [];
          return (
            <div key={queue.id} style={{ flex: 1, minWidth: 0, background: 'rgba(14,18,30,0.97)', borderRadius: 10, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div style={{ height: 20, flexShrink: 0, background: 'linear-gradient(135deg,' + queue.color + 'DD,' + queue.color + '88)', display: 'flex', alignItems: 'center', padding: '0 8px', gap: 6 }}>
                <span style={{ fontSize: 10, fontWeight: 800, color: '#fff', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{queue.name}</span>
                <span style={{ fontSize: 9, fontWeight: 700, color: '#fff', background: 'rgba(255,255,255,0.25)', padding: '1px 6px', borderRadius: 8, flexShrink: 0 }}>{ids.length}</span>
              </div>
              <div style={{ flex: 1, minHeight: 0, display: 'flex', gap: 4, padding: '3px 4px', overflowX: 'auto', overflowY: 'hidden', alignItems: 'stretch', boxSizing: 'border-box' }}>
                {ids.length === 0 ? (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: 'rgba(255,255,255,0.2)' }}>No tickets</div>
                ) : (
                  ids.map(roId => {
                    const ro = getRO(roId);
                    if (!ro) return null;
                    return (
                      <div key={ro.id} style={{ width: ids.length === 1 ? '100%' : 200, flexShrink: 0, height: '100%' }}>
                        <DisplayCard ro={ro} timer={state.timers[ro.id]} serviceTypes={serviceTypes} />
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── RO Card — long press to move, tap to open ───────────────────────────────
const ROCard = memo(function ROCard({ ro, timer, onTap, onMove, isMoving, serviceTypes, canMove }) {
  const holdRef    = useRef(null);
  const didHold  = useRef(false);
  const pressing = useRef(false);
  const startX   = useRef(0);
  const startY   = useRef(0);
  const vehicle     = [ro.year, ro.make, ro.model].filter(Boolean).join(" ") || "No vehicle";
  const svcType     = serviceTypes && ro.serviceType ? serviceTypes.find(s => s.id === ro.serviceType) : null;
  const leftColor   = isMoving ? ACCENT : (svcType ? svcType.color : priorityBorder(ro.priority));
  const isWaiting   = ro.waitStatus === "waiting";
  const timerRunning = timer && timer.running;
  const elapsed     = timer
    ? (timer.running ? timer.elapsed + Math.floor((Date.now() - timer.startedAt) / 1000) : timer.elapsed)
    : 0;
  const allJobs     = ro.jobs ? ro.jobs.split(",").map(j => j.trim()).filter(Boolean) : [];
  const visibleJobs = allJobs.slice(0, 3);
  const extraJobs   = allJobs.length - visibleJobs.length;
  function startHold(x, y) {
    if (canMove === false) return;
    pressing.current = true;
    startX.current = x;
    startY.current = y;
    didHold.current = false;
    holdRef.current = setTimeout(() => {
      pressing.current = false;
      didHold.current = true;
      onMove();
      if (navigator.vibrate) navigator.vibrate(30);
    }, 700);
  }
  function cancelHold() {
    pressing.current = false;
    if (holdRef.current) clearTimeout(holdRef.current);
  }
  function handleClick() {
    if (didHold.current) { didHold.current = false; return; }
    if (isMoving) { onMove(); return; }
    onTap();
  }
  return (
    <div
      onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); startHold(e.clientX, e.clientY); }}
      onPointerMove={e => {
        if (!pressing.current) return;
        if (Math.abs(e.clientX - startX.current) > 12 || Math.abs(e.clientY - startY.current) > 12) cancelHold();
      }}
      onPointerUp={cancelHold}
      onPointerCancel={cancelHold}
      onContextMenu={e => e.preventDefault()}
      onClick={handleClick}
      className="card-press"
      style={{
        background: isMoving ? "rgba(10,132,255,0.10)" : CARD_BG,
        borderRadius: 14,
        padding: "12px 13px",
        marginBottom: 7,
        boxShadow: isMoving
          ? "0 0 0 1.5px #0A84FF, 0 8px 32px rgba(10,132,255,0.25)"
          : ro.priority === "HIGH"
            ? "0 1px 0 "+CARD_TOP+" inset, 0 4px 20px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,69,58,0.15)"
            : "0 1px 0 "+CARD_TOP+" inset, 0 4px 20px rgba(0,0,0,0.3)",
        animation: isMoving ? "none" : "card-in 0.2s cubic-bezier(0.34,1.56,0.64,1)",
        border: "0.5px solid " + (isMoving ? "rgba(10,132,255,0.4)" : CARD_BORDER),
        borderLeft: "3px solid " + leftColor,
        cursor: "pointer",
        userSelect: "none",
        width: "100%",
        boxSizing: "border-box",
        transform: isMoving ? "scale(1.02)" : "scale(1)",
        touchAction: "manipulation",
        WebkitTouchCallout: "none",
        WebkitUserSelect: "none",
      }}
    >
      {/* Row 1 — RO# + priority badge only */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:3, gap:6 }}>
        <span style={{ fontWeight:700, fontSize:14, color:TEXT, fontFamily:"-apple-system,BlinkMacSystemFont,'SF Pro Display','Barlow',sans-serif", letterSpacing:"-0.5px", whiteSpace:"nowrap", flexShrink:0 }}>
          {ro.roNum}
        </span>
        {ro.roNotes && ro.roNotes.length > 0 && (
          <span style={{ background:"rgba(10,132,255,0.2)", color:ACCENT, fontSize:8, fontWeight:600, padding:"1px 5px", borderRadius:4, flexShrink:0 }}>
            💬 {ro.roNotes.length}
          </span>
        )}
        <div style={{ display:"flex", alignItems:"center", gap:3, flexShrink:0 }}>
          {ro.priority === "HIGH" && (
            <span style={{ background:"rgba(255,69,58,0.15)", color:DANGER, fontSize:8, fontWeight:600, padding:"2px 7px", borderRadius:6, letterSpacing:"0.2px", flexShrink:0 }}>URGENT</span>          )}
          {ro.priority === "LOW" && (
            <span style={{ background:"rgba(99,99,102,0.3)", color:"rgba(255,255,255,0.45)", fontSize:8, fontWeight:500, padding:"2px 7px", borderRadius:6, flexShrink:0 }}>LOW</span>
          )}
        </div>
      </div>
      {/* Promise time — only shows when set */}
      {ro.promiseTime && (() => {
        const now = Date.now();
        const promise = new Date(ro.promiseTime).getTime();
        const diff = promise - now;
        const overdue = diff < 0;
        const soon = diff > 0 && diff < 3600000;
        const timeStr = new Date(ro.promiseTime).toLocaleTimeString([], {hour:"2-digit", minute:"2-digit"});
        return (
          <div style={{ display:"flex", alignItems:"center", gap:3, marginBottom:3 }}>
            <span style={{ background:overdue?"rgba(255,69,58,0.15)":soon?"rgba(255,159,10,0.15)":"rgba(255,255,255,0.06)", color:overdue?DANGER:soon?WARN:TEXT3, fontSize:8, fontWeight:600, padding:"2px 7px", borderRadius:5, display:"flex", alignItems:"center", gap:3 }}>
              ⏰ {overdue?"OVERDUE — ":soon?"Due soon — ":""}{timeStr}
            </span>
          </div>
        );
      })()}
      {/* Timer + flat rate hours row — always present */}
      <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:3 }}>
        <span style={{ background:timerRunning?"rgba(255,159,10,0.15)":"rgba(255,255,255,0.06)", color:timerRunning?WARN:TEXT3, fontSize:8, fontWeight:500, padding:"2px 7px", borderRadius:6, display:"inline-flex", alignItems:"center", gap:3 }}>
          <span style={{ width:4, height:4, borderRadius:"50%", background:timerRunning?WARN:"rgba(255,255,255,0.25)", display:"inline-block", animation:timerRunning?"pulse 1.8s ease-in-out infinite":"none" }}/>
          {fmtTime(elapsed)}
        </span>
        {ro.hours && (
          <span style={{ background:"rgba(48,209,88,0.12)", color:SUCCESS, fontSize:8, fontWeight:500, padding:"2px 7px", borderRadius:6 }}>
            {String(ro.hours).replace(/h$/i,"")}h
          </span>
        )}
      </div>
      {/* Row 2 — Vehicle */}
      <div style={{ fontSize:11, fontWeight:400, color:"rgba(255,255,255,0.55)", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", marginBottom:3, lineHeight:"14px", letterSpacing:"0" }}>
        {vehicle}
      </div>
      {/* Row 3 — Customer */}
      <div style={{ fontSize:10, fontWeight:400, color:"rgba(255,255,255,0.35)", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", marginBottom:5, lineHeight:"13px" }}>
        {ro.customer || "No customer"}
      </div>
      {/* Row 4 — Job pills */}
      <div style={{ display:"flex", alignItems:"center", gap:3, overflow:"hidden", height:18 }}>        {visibleJobs.map((j, i) => {
          const ab = abbrevJob(j);
          return (
            <span key={i} style={{ background:ab.bg, color:ab.color, fontSize:8, fontWeight:500, padding:"2px 6px", borderRadius:5, whiteSpace:"nowrap", flexShrink:0 }}>
              {ab.label}
            </span>
          );
        })}
        {extraJobs > 0 && <span style={{ fontSize:8, color:TEXT3, flexShrink:0 }}>+{extraJobs}</span>}
        {allJobs.length === 0 && <span style={{ fontSize:8, color:"rgba(255,255,255,0.12)" }}>—</span>}
      </div>
      {/* Row 5 — Status (left) + Service type (right) */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", height:18 }}>
        <div>
          {ro.waitStatus === "waiting" && (
            <span style={{ background:"rgba(255,159,10,0.15)", color:WARN, fontSize:8, fontWeight:500, padding:"2px 6px", borderRadius:5 }}>Wait</span>
          )}
          {ro.waitStatus === "dropoff" && (
            <span style={{ background:"rgba(255,255,255,0.07)", color:TEXT3, fontSize:8, fontWeight:400, padding:"2px 6px", borderRadius:5 }}>Drop-off</span>
          )}
        </div>
        {svcType && (
          <span style={{ background:svcType.color, color:"#fff", fontSize:8, fontWeight:600, padding:"2px 6px", borderRadius:5, whiteSpace:"nowrap" }}>
            {svcType.name}
          </span>
        )}
      </div>
      {/* Moving indicator at bottom */}
      {isMoving && (
        <div style={{ marginTop:6, fontSize:9, color:"#0A84FF", fontWeight:400, textAlign:"center", letterSpacing:"0.5px", textTransform:"uppercase" }}>
          ● MOVING — tap a column to place
        </div>
      )}
    </div>
  );
});
// ─── Sheet (bottom modal) ─────────────────────────────────────────────────────
function Sheet({ title, subtitle, onClose, children, wide }) {
  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.35)", zIndex:2000, display:"flex", alignItems:wide?"center":"flex-end", justifyContent:"center" }}
    >
      <div style={{ background:SHEET_BG, borderRadius:wide?"20px":"22px 22px 0 0", width:"100%", maxWidth:wide?520:"100%", maxHeight:"92vh", overflowY:"auto", boxShadow:"0 -1px 0 rgba(255,255,255,0.12), 0 -20px 80px rgba(0,0,0,0.85), 0 0 0 0.5px rgba(255,255,255,0.06)", animation:wide?"fade-in 0.2s ease":"slide-up 0.32s cubic-bezier(0.32,0.72,0,1)", borderTop:"0.5px solid rgba(255,255,255,0.12)" }}>        {!wide && <div style={{ width:36, height:5, background:"rgba(255,255,255,0.25)", borderRadius:3, margin:"10px auto 0" }} />}
        <div style={{ padding:"14px 20px 12px", borderBottom:"0.5px solid rgba(255,255,255,0.08)", display:"flex", justifyContent:"space-between", alignItems:"center", position:"sticky", top:0, background:SHEET_BG, zIndex:1 }}>
          <div>
            <div style={{ fontFamily:"-apple-system,BlinkMacSystemFont,'SF Pro Display',sans-serif", fontWeight:700, fontSize:17, color:TEXT, letterSpacing:"-0.3px" }}>{title}</div>
            {subtitle && <div style={{ fontSize:12, color:"rgba(255,255,255,0.35)", marginTop:2 }}>{subtitle}</div>}
          </div>
          <button onClick={onClose} style={{ background:BG, border:"none", borderRadius:10, width:32, height:32, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", color:SUB }}>
            <XIcon />
          </button>
        </div>
        <div style={{ padding:"16px 20px 36px" }}>{children}</div>
      </div>
    </div>
  );
}
// ─── Worqflow Logo — Version D ───────────────────────────────────────────────
function WFLogo({ size=40, radius=10 }) {
  const s = size;
  const r = radius;
  return (
    <svg width={s} height={s} viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="wfBg" x1="0" y1="0" x2="96" y2="96" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0C1830"/>
          <stop offset="100%" stopColor="#060010"/>
        </linearGradient>
        <linearGradient id="wfRing" x1="10" y1="10" x2="78" y2="78" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#A0D4FF"/>
          <stop offset="100%" stopColor="#0A84FF"/>
        </linearGradient>
        <linearGradient id="wfTail" x1="58" y1="56" x2="82" y2="80" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0A84FF"/>
          <stop offset="100%" stopColor="#E040FB"/>
        </linearGradient>
        <linearGradient id="wfBar" x1="0" y1="0" x2="0" y2="1" gradientUnits="objectBoundingBox">
          <stop offset="0%" stopColor="white"/>
          <stop offset="100%" stopColor="rgba(255,255,255,0.6)"/>
        </linearGradient>
        <radialGradient id="wfGlow" cx="50%" cy="0%" r="60%" gradientUnits="objectBoundingBox">
          <stop offset="0%" stopColor="rgba(10,132,255,0.2)"/>
          <stop offset="100%" stopColor="transparent"/>
        </radialGradient>
        <filter id="wfBlur">
          <feGaussianBlur stdDeviation="3" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>      </defs>
      {/* Background */}
      <rect width="96" height="96" rx={r*2.2} fill="url(#wfBg)"/>
      <rect width="96" height="96" rx={r*2.2} fill="url(#wfGlow)" opacity="0.5"/>
      {/* Top highlight */}
      <rect x="16" y="0" width="64" height="1" rx="0.5" fill="rgba(255,255,255,0.18)"/>
      {/* Q ring */}
      <circle cx="44" cy="42" r="22" stroke="url(#wfRing)" stroke-width="5" fill="none" filter="url(#wfBlur)"/>
      {/* Rising bars — 3 kanban columns */}
      <rect x="30" y="39" width="6" height="12" rx="3" fill="url(#wfBar)" opacity="0.4"/>
      <rect x="41" y="33" width="6" height="18" rx="3" fill="url(#wfBar)" opacity="0.65"/>
      <rect x="52" y="26" width="6" height="25" rx="3" fill="url(#wfBar)" filter="url(#wfBlur)"/>
      {/* Q tail — blue to electric violet */}
      <line x1="60" y1="58" x2="79" y2="77" stroke="url(#wfTail)" strokeWidth="5.5" strokeLinecap="round" filter="url(#wfBlur)"/>
    </svg>
  );
}
// ─── Live Clock ──────────────────────────────────────────────────────────────
function LiveClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const h = time.getHours();
  const m = String(time.getMinutes()).padStart(2,"0");
  const s = String(time.getSeconds()).padStart(2,"0");
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return (
    <div style={{ display:"flex", alignItems:"baseline", gap:2, fontFamily:"-apple-system,BlinkMacSystemFont,'SF Pro Display',sans-serif" }}>
      <span style={{ fontSize:14, fontWeight:600, color:"rgba(255,255,255,0.7)", letterSpacing:"-0.3px", animation:"tick 1s step-end infinite" }}>
        {h12}:{m}
      </span>
      <span style={{ fontSize:10, fontWeight:500, color:"rgba(255,255,255,0.35)" }}>{ampm}</span>
    </div>
  );
}
// ─── Skeleton Card ────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div style={{ background:"rgba(255,255,255,0.04)", borderRadius:14, padding:"12px 13px", marginBottom:7, height:140, boxSizing:"border-box", overflow:"hidden", position:"relative", border:"0.5px solid rgba(255,255,255,0.06)" }}>
      <div style={{ background:"linear-gradient(90deg,rgba(255,255,255,0.03) 0%,rgba(255,255,255,0.08) 50%,rgba(255,255,255,0.03) 100%)", backgroundSize:"400px 100%", animation:"shimmer 1.4s ease-in-out infinite", position:"absolute", inset:0, borderRadius:14 }}/>
      <div style={{ height:12, background:"rgba(255,255,255,0.07)", borderRadius:6, width:"50%", marginBottom:10 }}/>
      <div style={{ height:10, background:"rgba(255,255,255,0.05)", borderRadius:6, width:"80%", marginBottom:8 }}/>      <div style={{ height:10, background:"rgba(255,255,255,0.04)", borderRadius:6, width:"60%", marginBottom:16 }}/>
      <div style={{ display:"flex", gap:6 }}>
        <div style={{ height:16, background:"rgba(255,255,255,0.05)", borderRadius:8, width:40 }}/>
        <div style={{ height:16, background:"rgba(255,255,255,0.05)", borderRadius:8, width:52 }}/>
      </div>
    </div>
  );
}
// ─── Note Thread ─────────────────────────────────────────────────────────────
function NoteThread({ ro, currentUser2, onAddNote }) {
  const [text, setText] = useState("");
  const notes = ro.roNotes || [];
  function fmtAgo(ts) {
    const diff = Date.now() - ts;
    const m = Math.floor(diff/60000);
    if (m < 1)  return "Just now";
    if (m < 60) return m+"m ago";
    const h = Math.floor(m/60);
    if (h < 24) return h+"h ago";
    return new Date(ts).toLocaleDateString([], {month:"short", day:"numeric"});
  }
  return (
    <div style={{ marginBottom:16 }}>
      <div style={{ fontSize:10, fontWeight:600, color:TEXT3, textTransform:"uppercase", letterSpacing:"0.6px", marginBottom:10 }}>
        Notes {notes.length > 0 && <span style={{ color:ACCENT }}>· {notes.length}</span>}
      </div>
      {/* Notes list */}
      {notes.length > 0 && (
        <div style={{ marginBottom:10 }}>
          {notes.map(note => (
            <div key={note.id} style={{ marginBottom:8, display:"flex", gap:8, alignItems:"flex-start" }}>
              <div style={{ width:26, height:26, borderRadius:"50%", background:"linear-gradient(145deg,#1C3A6E,#0A2040)", color:TEXT2, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:600, fontSize:10, border:"1px solid rgba(10,132,255,0.3)", flexShrink:0 }}>
                {note.author ? note.author.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase() : "?"}
              </div>
              <div style={{ flex:1, background:"rgba(255,255,255,0.05)", borderRadius:10, padding:"8px 10px", border:"0.5px solid rgba(255,255,255,0.08)" }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                  <span style={{ fontSize:11, fontWeight:600, color:TEXT2 }}>{note.author}</span>
                  <span style={{ fontSize:10, color:TEXT3 }}>{fmtAgo(note.time)}</span>
                </div>
                <div style={{ fontSize:13, color:TEXT2, lineHeight:1.4 }}>{note.text}</div>
              </div>
            </div>
          ))}        </div>
      )}
      {/* Add note input */}
      <div style={{ display:"flex", gap:8 }}>
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key==="Enter" && text.trim()) { onAddNote(ro.id, text, currentUser2?.name||"Unknown"); setText(""); } }}
          placeholder="Add a note…"style={{ ...inputStyle, flex:1, padding:"10px 12px", fontSize:13 }}
        />
        <button
          onClick={() => { if (text.trim()) { onAddNote(ro.id, text, currentUser2?.name||"Unknown"); setText(""); } }}
          style={{ background:text.trim()?ACCENT:"rgba(255,255,255,0.06)", color:text.trim()?"#fff":TEXT3, border:"none", borderRadius:12, padding:"0 16px", cursor:text.trim()?"pointer":"default", fontWeight:600, fontSize:13, fontFamily:"inherit", flexShrink:0, transition:"all 0.15s" }}>
          Send
        </button>
      </div>
    </div>
  );
}
// ─── RO Detail ────────────────────────────────────────────────────────────────
function RODetail({ ro, timer, onClose, onSave, onDelete, onArchive, onTimer, onHoursChange, wide, isAdmin, isTech, colId, serviceTypes, jobPresets, currentUser2, onAddNote }) {
  const [editing, setEditing] = useState(false);
  const [showJobPickerEdit, setShowJobPickerEdit] = useState(false);
  const [f, setF] = useState({ ...ro, serviceType: ro.serviceType||"st-main" });
  const jobPresetsForEdit = jobPresets || DEFAULT_JOB_PRESETS;
  const elapsed = timer ? (timer.running ? timer.elapsed + Math.floor((Date.now() - timer.startedAt) / 1000) : timer.elapsed) : 0;
  const jobs = ro.jobs ? ro.jobs.split(",").map(j => j.trim()).filter(Boolean) : [];
  const presets = ["0.5","1","1.5","2","2.5","3","4","5","6","8"];
  // Tech edit mode — limited fields only
  const [techEditing, setTechEditing] = useState(false);
  if (techEditing && isTech) {
    return (
      <Sheet title="Update RO" subtitle={ro.roNum} onClose={onClose} wide={wide}>
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <div style={{ background:"rgba(10,132,255,0.08)", borderRadius:12, padding:"10px 14px", border:"0.5px solid rgba(10,132,255,0.2)", fontSize:12, color:TEXT2 }}>
            
 You can update mileage out, cause, correction and flat rate hours
          </div>
          <div>
            <label style={labelStyle}>Mileage Out</label>
            <input type="number" placeholder="e.g. 45010" value={f.mileageOut||""} onChange={e => setF(p=>({...p, mileageOut:e.target.value}))} style={inputStyle}/>
          </div>
          <div>
            <label style={labelStyle}>Flat Rate Hours</label>            <input type="number" min="0" step="0.5" placeholder="e.g. 2.5" value={String(f.hours||"").replace(/h$/i,"")} onChange={e => setF(p=>({...p, hours:e.target.value}))} style={{ ...inputStyle, fontWeight:700 }}/>
          </div>
          <div>
            <label style={labelStyle}>Cause — What you found</label>
            <textarea placeholder="Root cause identified…" value={f.cause||""} onChange={e => setF(p=>({...p, cause:e.target.value}))} rows={3} style={{...inputStyle, resize:"vertical"}}/>
          </div>
          <div>
            <label style={labelStyle}>Correction — Work performed</label>
            <textarea placeholder="What was done to fix it…" value={f.correction||""} onChange={e => setF(p=>({...p, correction:e.target.value}))} rows={3} style={{...inputStyle, resize:"vertical"}}/>
          </div>
          <div>
            <label style={labelStyle}>Tech Notes</label>
            <textarea placeholder="Any additional notes…" value={f.notes||""} onChange={e => setF(p=>({...p, notes:e.target.value}))} rows={2} style={{...inputStyle, resize:"vertical"}}/>
          </div>
          <div style={{ display:"flex", gap:10 }}>
            <button onClick={() => setTechEditing(false)} style={{ flex:1, padding:13, background:"rgba(255,255,255,0.06)", color:TEXT2, border:"0.5px solid rgba(255,255,255,0.1)", borderRadius:14, fontFamily:"inherit", fontWeight:600, fontSize:15, cursor:"pointer" }}>
              Cancel
            </button>
            <button onClick={() => { onSave(f); setTechEditing(false); }} style={{ flex:2, padding:13, background:ACCENT, color:"#fff", border:"none", borderRadius:14, fontFamily:"inherit", fontWeight:700, fontSize:15, cursor:"pointer", boxShadow:"0 4px 14px rgba(10,132,255,0.35)" }}>
              Save Updates
            </button>
          </div>
        </div>
      </Sheet>
    );
  }
  if (editing) {
    const inp = (key, placeholder, type="text") => (
      <input type={type} placeholder={placeholder} value={f[key]||""} onChange={e => setF(p => ({...p, [key]:e.target.value}))} style={inputStyle} />
    );
    const sec = (title) => (
      <div style={{ fontSize:10, fontWeight:800, color:MUTED, textTransform:"uppercase", letterSpacing:"1px", marginBottom:10, marginTop:6, paddingBottom:6, borderBottom:"1px solid "+BORDER }}>{title}</div>
    );
    return (
      <>
      <Sheet title="Edit RO" subtitle={ro.roNum} onClose={onClose} wide={wide}>
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {sec("Service Type")}
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            {serviceTypes && serviceTypes.map(st => (
              <button key={st.id} onClick={() => setF(p => ({...p, serviceType:st.id}))}
                style={{ flex:"1 1 auto", padding:"9px 8px", borderRadius:10, border:"2px solid "+(f.serviceType===st.id?st.color:BORDER), background:f.serviceType===st.id?st.bg+"33":"rgba(255,255,255,0.05)", color:f.serviceType===st.id?st.color:SUB, fontWeight:700, fontSize:12, cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", justifyContent:"center", gap:5 }}>
                <span style={{ width:8, height:8, borderRadius:"50%", background:st.color, display:"inline-block" }}/>
                {st.name}
              </button>
            ))}          </div>
          {sec("Vehicle Info")}
          <div style={{ display:"grid", gridTemplateColumns:"72px 1fr 1fr", gap:8 }}>
            {inp("year","Year")} {inp("make","Make")} {inp("model","Model")}
          </div>
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
              {[["none","— None"],["dropoff","Drop-Off"],["waiting","Waiting"]].map(([v,l]) => (
                <button key={v} onClick={() => setF(p => ({...p, waitStatus:v}))}
                  style={{ flex:1, padding:"10px 0", borderRadius:12, border:"2px solid "+(f.waitStatus===v?ACCENT:BORDER), background:f.waitStatus===v?"rgba(59,130,246,0.2)":"rgba(255,255,255,0.05)", color:f.waitStatus===v?"#60A5FA":"rgba(255,255,255,0.4)", fontWeight:700, fontSize:12, cursor:"pointer", fontFamily:"inherit" }}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          {sec("Promise Time")}
          <div>
            <label style={labelStyle}>Promised By (date & time)</label>
            <input type="datetime-local" value={f.promiseTime||""} onChange={e => setF(p=>({...p, promiseTime:e.target.value}))} style={inputStyle}/>
            {f.promiseTime && <button onClick={() => setF(p=>({...p, promiseTime:""}))} style={{ marginTop:6, fontSize:11, color:DANGER, background:"none", border:"none", cursor:"pointer", padding:0, fontFamily:"inherit" }}>Clear promise time</button>}
          </div>
          {sec("Job Info")}
          {/* Priority as dropdown */}
          <div>
            <label style={labelStyle}>Priority</label>
            <select value={f.priority} onChange={e => setF(p => ({...p, priority:e.target.value}))}
              style={{ ...inputStyle, appearance:"auto" }}>
              <option value="LOW">Low</option>
              <option value="NORMAL">Normal</option>              <option value="HIGH">High — Urgent</option>
            </select>
          </div>
          {/* Flat rate hours */}
          <div>
            <label style={labelStyle}>Flat Rate Hours</label>
            <input type="number" min="0" step="0.5" placeholder="e.g. 2.5" value={f.hours||""} onChange={e => setF(p => ({...p, hours:e.target.value}))} style={{ ...inputStyle, fontWeight:700 }} />
          </div>
          {/* Jobs — full width with picker (JobPicker renders outside Sheet below) */}
          <JobFieldTrigger value={f.jobs} onOpen={() => setShowJobPickerEdit(true)} />
                    {sec("3 C's — Technician Notes")}
          <div><label style={labelStyle}>Concern (Customer complaint)</label><textarea placeholder="What the customer says is wrong…" value={f.concern||""} onChange={e => setF(p => ({...p, concern:e.target.value}))} rows={2} style={{...inputStyle,resize:"vertical"}}/></div>
          <div><label style={labelStyle}>Cause (What tech found)</label><textarea placeholder="Root cause identified by technician…" value={f.cause||""} onChange={e => setF(p => ({...p, cause:e.target.value}))} rows={2} style={{...inputStyle,resize:"vertical"}}/></div>
          <div><label style={labelStyle}>Correction (Work performed)</label><textarea placeholder="What was done to fix it…" value={f.correction||""} onChange={e => setF(p => ({...p, correction:e.target.value}))} rows={2} style={{...inputStyle,resize:"vertical"}}/></div>
          <div><label style={labelStyle}>Additional Notes</label><textarea placeholder="Any extra info…" value={f.notes||""} onChange={e => setF(p => ({...p, notes:e.target.value}))} rows={2} style={{...inputStyle,resize:"vertical"}}/></div>
          <div style={{ display:"flex", gap:10, marginTop:4 }}>
            <button onClick={() => setEditing(false)} style={{ flex:1, padding:13, background:BG, color:SUB, border:"1.5px solid "+BORDER, borderRadius:14, fontFamily:"'Barlow',sans-serif", fontWeight:700, fontSize:15, cursor:"pointer" }}>
              Cancel
            </button>
            <button onClick={() => { onSave(f); setEditing(false); }} style={{ flex:2, padding:13, background:ACCENT, color:"#fff", border:"none", borderRadius:14, fontFamily:"'Barlow',sans-serif", fontWeight:800, fontSize:15, cursor:"pointer" }}>
              Save Changes
            </button>
          </div>
        </div>
      </Sheet>
      {showJobPickerEdit && (
        <JobPicker value={f.jobs} onChange={v => setF(p => ({...p, jobs:v}))} presets={jobPresetsForEdit} onClose={() => setShowJobPickerEdit(false)} />
      )}
      </>
    );
  }
  return (
    <Sheet title={ro.roNum} subtitle={[ro.year,ro.make,ro.model].filter(Boolean).join(" ")} onClose={onClose} wide={wide}>
      <div>
        {/* ── SERVICE TYPE BADGE ── */}
        {(() => {
          const st = (ro.serviceType && serviceTypes) ? serviceTypes.find(s => s.id === ro.serviceType) : null;
          return st ? (
            <div style={{ display:"inline-flex", alignItems:"center", gap:6, background:st.bg, border:"1.5px solid "+st.color+"44", borderRadius:20, padding:"5px 14px", marginBottom:16 }}>
              <span style={{ width:8, height:8, borderRadius:"50%", background:st.color }}/>
              <span style={{ color:st.color, fontWeight:700, fontSize:12 }}>{st.name}</span>
            </div>
          ) : null;
        })()}
        {/* ── VEHICLE INFO ── */}        <div style={{ marginBottom:18 }}>
          <div style={{ fontSize:10, fontWeight:800, color:MUTED, textTransform:"uppercase", letterSpacing:"1px", marginBottom:10 }}>Vehicle</div>
          <div style={{ fontSize:18, fontWeight:800, color:TEXT, fontFamily:"'Barlow',sans-serif", marginBottom:4 }}>
            {[ro.year, ro.make, ro.model].filter(Boolean).join(" ") || "No vehicle"}
          </div>
          {(ro.color || ro.plate || ro.vin) && (
            <div style={{ fontSize:13, color:SUB, marginBottom:4, display:"flex", gap:12, flexWrap:"wrap" }}>
              {ro.color && <span>
 {ro.color}</span>}
              {ro.plate && <span>
 {ro.plate}</span>}
              {ro.vin   && <span style={{ fontSize:11 }}>VIN: {ro.vin}</span>}
            </div>
          )}
          <div style={{ display:"flex", gap:6, marginTop:6 }}>
            <div style={{ flex:1, background:BG, borderRadius:10, padding:"10px 12px" }}>
              <div style={{ fontSize:9, fontWeight:700, color:"rgba(255,255,255,0.3)", textTransform:"uppercase", letterSpacing:"0.6px", marginBottom:3 }}>Mileage In</div>
              <div style={{ fontSize:15, fontWeight:700, color:TEXT }}>{ro.mileageIn ? ro.mileageIn+" mi" : "—"}</div>
            </div>
            <div style={{ flex:1, background:BG, borderRadius:10, padding:"10px 12px" }}>
              <div style={{ fontSize:9, fontWeight:700, color:"rgba(255,255,255,0.3)", textTransform:"uppercase", letterSpacing:"0.6px", marginBottom:3 }}>Mileage Out</div>
              <div style={{ fontSize:15, fontWeight:700, color:TEXT }}>{ro.mileageOut ? ro.mileageOut+" mi" : "—"}</div>
            </div>
          </div>
        </div>
        {/* ── CUSTOMER INFO ── */}
        <div style={{ marginBottom:18 }}>
          <div style={{ fontSize:10, fontWeight:800, color:MUTED, textTransform:"uppercase", letterSpacing:"1px", marginBottom:10 }}>Customer</div>
          <div style={{ fontSize:16, fontWeight:700, color:TEXT, marginBottom:6 }}>{ro.customer || "—"}</div>
          <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
            {ro.phone && (
              <a href={"tel:"+ro.phone} style={{ display:"flex", alignItems:"center", gap:5, color:ACCENT, fontSize:13, fontWeight:600, textDecoration:"none", background:ACCENT2, padding:"6px 12px", borderRadius:20 }}>
                
 {ro.phone}
              </a>
            )}
            {ro.email && (
              <a href={"mailto:"+ro.email} style={{ display:"flex", alignItems:"center", gap:5, color:"#7C3AED", fontSize:13, fontWeight:600, textDecoration:"none", background:"#FAF5FF", padding:"6px 12px", borderRadius:20 }}>
                
 {ro.email}
              </a>
            )}
          </div>
          <div style={{ marginTop:8 }}>
            {ro.waitStatus === "waiting" && (
              <span style={{ background:"rgba(255,159,10,0.15)", color:WARN, fontSize:12, fontWeight:600, padding:"5px 12px", borderRadius:20 }}>
 Customer Waiting</span>
            )}
            {ro.waitStatus === "dropoff" && (
              <span style={{ background:"rgba(255,255,255,0.08)", color:TEXT2, fontSize:12, fontWeight:600, padding:"5px 12px", borderRadius:20 }}>
 Drop-Off</span>
            )}            {(!ro.waitStatus || ro.waitStatus === "none") && (
              <span style={{ background:"rgba(255,255,255,0.05)", color:TEXT3, fontSize:12, fontWeight:400, padding:"5px 12px", borderRadius:20 }}>No status</span>
            )}
          </div>
        </div>
        {/* ── JOB INFO ── */}
        <div style={{ marginBottom:18 }}>
          <div style={{ fontSize:10, fontWeight:800, color:MUTED, textTransform:"uppercase", letterSpacing:"1px", marginBottom:10 }}>Job Info</div>
          {/* Priority + Hours side by side */}
          <div style={{ display:"flex", gap:10, marginBottom:12 }}>
            {/* Priority dropdown */}
            <div style={{ flex:1 }}>
              <label style={labelStyle}>Priority</label>
              <select
                value={ro.priority}
                onChange={e => onSave({...ro, priority:e.target.value})}
                style={{ ...inputStyle, padding:"10px 12px", appearance:"auto" }}
              >
                <option value="LOW">Low</option>
                <option value="NORMAL">Normal</option>
                <option value="HIGH">High — Urgent</option>
              </select>
            </div>
            {/* Flat rate hours — editable inline */}
            <div style={{ flex:1 }}>
              <label style={labelStyle}>Flat Rate Hrs</label>
              <input
                type="number"min="0"step="0.5"value={String(ro.hours||"").replace(/h$/i,"")}
                onChange={e => onHoursChange(ro.id, e.target.value)}
                placeholder="0.0"style={{ ...inputStyle, padding:"10px 12px", fontWeight:700, fontSize:15 }}
              />
            </div>
          </div>
          {/* Jobs — full width */}
          {ro.jobs ? (
            <div style={{ marginBottom:8 }}>
              <label style={labelStyle}>Jobs</label>
              <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                {ro.jobs.split(",").map(j => j.trim()).filter(Boolean).map((j,i) => {
                  const ab = abbrevJob(j);                  return <span key={i} style={{ background:ab.bg, color:ab.color, fontSize:12, fontWeight:600, padding:"5px 12px", borderRadius:20 }}>{j}</span>;
                })}
              </div>
            </div>
          ) : (
            <div style={{ color:MUTED, fontSize:13, fontStyle:"italic" }}>No jobs added yet</div>
          )}
        </div>
        {/* ── TECH NOTES (3 C's) ── */}
        {(ro.concern || ro.cause || ro.correction) && (
          <div style={{ marginBottom:18 }}>
            <div style={{ fontSize:10, fontWeight:800, color:MUTED, textTransform:"uppercase", letterSpacing:"1px", marginBottom:10 }}>Tech Notes</div>
            {[["Concern", ro.concern], ["Cause", ro.cause], ["Correction", ro.correction]].map(([lbl, val]) => val ? (
              <div key={lbl} style={{ marginBottom:8 }}>
                <div style={{ fontSize:10, fontWeight:700, color:MUTED, textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:3 }}>{lbl}</div>
                <div style={{ fontSize:13, color:TEXT, lineHeight:1.5, background:BG, borderRadius:10, padding:"10px 12px" }}>{val}</div>
              </div>
            ) : null)}
          </div>
        )}
        {ro.notes && (
          <div style={{ background:"rgba(245,158,11,0.12)", borderRadius:10, padding:"10px 14px", marginBottom:16, border:"1px solid rgba(245,158,11,0.3)" }}>
            <div style={{ fontSize:9, fontWeight:700, color:"rgba(245,158,11,0.7)", textTransform:"uppercase", letterSpacing:"0.6px", marginBottom:3 }}>Notes</div>
            <div style={{ fontSize:13, color:"rgba(253,230,138,0.9)" }}>{ro.notes}</div>
          </div>
        )}
        {/* ── PROMISE TIME ── */}
        {ro.promiseTime && (
          <div style={{ marginBottom:16 }}>
            {(() => {
              const now2 = Date.now();
              const promise = new Date(ro.promiseTime).getTime();
              const diff = promise - now2;
              const overdue = diff < 0;
              const soon = diff > 0 && diff < 3600000;
              const timeStr = new Date(ro.promiseTime).toLocaleString([], {month:"short", day:"numeric", hour:"2-digit", minute:"2-digit"});
              const mins = Math.abs(Math.floor(diff/60000));
              const hrs2 = Math.floor(mins/60);
              const rem = mins%60;
              const countdown = overdue ? (hrs2>0?hrs2+"h "+rem+"m overdue":rem+"m overdue") : (hrs2>0?hrs2+"h "+rem+"m remaining":rem+"m remaining");
              return (
                <div style={{ background:overdue?"rgba(255,69,58,0.1)":soon?"rgba(255,159,10,0.1)":"rgba(255,255,255,0.05)", borderRadius:12, padding:"12px 14px", border:"0.5px solid "+(overdue?DANGER:soon?WARN:"rgba(255,255,255,0.1)") }}>
                  <div style={{ fontSize:9, fontWeight:600, color:TEXT3, textTransform:"uppercase", letterSpacing:"0.6px", marginBottom:4 }}>Promise Time</div>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>                    <div style={{ fontSize:14, fontWeight:600, color:TEXT2 }}>
 {timeStr}</div>
                    <div style={{ fontSize:12, fontWeight:600, color:overdue?DANGER:soon?WARN:SUCCESS }}>{countdown}</div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
        {/* ── INTERNAL NOTES THREAD ── */}
        <NoteThread ro={ro} currentUser={currentUser2} onAddNote={onAddNote} />
        {/* ── TIMER ── */}
        <div style={{ background:"rgba(255,255,255,0.05)", borderRadius:14, padding:"14px 16px", marginBottom:16, display:"flex", alignItems:"center", justifyContent:"space-between", border:"1px solid rgba(255,255,255,0.08)" }}>
          <div>
            <div style={{ fontSize:10, fontWeight:700, color:"rgba(255,255,255,0.3)", textTransform:"uppercase", letterSpacing:"0.6px", marginBottom:4 }}>Time on Job</div>
            <div style={{ fontSize:24, fontWeight:800, color:timer&&timer.running?"#D97706":TEXT, fontFamily:"'Barlow',sans-serif" }}>{fmtTime(elapsed)}</div>
            {timer && timer.running && <div style={{ fontSize:10, color:"#D97706", fontWeight:700, marginTop:2 }}>● Running</div>}
          </div>
          <button onClick={() => onTimer(ro.id)}
            style={{ background:timer&&timer.running?"#FEF3C7":"linear-gradient(135deg,#22C55E,#16A34A)", color:timer&&timer.running?"#92400E":"#fff", border:"none", borderRadius:12, padding:"12px 20px", fontSize:14, fontWeight:800, cursor:"pointer", display:"flex", alignItems:"center", gap:7, fontFamily:"'Barlow',sans-serif" }}>
            {timer && timer.running ? <><PauseIcon /> Pause</> : <><PlayIcon /> Start</>}
          </button>
        </div>
        {isTech && !isAdmin && (
          <button onClick={() => setTechEditing(true)} style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8, padding:14, background:"rgba(10,132,255,0.1)", color:ACCENT, border:"0.5px solid rgba(10,132,255,0.3)", borderRadius:14, fontFamily:"inherit", fontWeight:600, fontSize:15, cursor:"pointer", width:"100%" }}>
            <EditIcon /> Update RO
          </button>
        )}
        {isAdmin && (
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {isAdmin && (
              <button onClick={() => setEditing(true)} style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8, padding:14, background:"rgba(10,132,255,0.1)", color:ACCENT, border:"0.5px solid rgba(10,132,255,0.3)", borderRadius:14, fontFamily:"inherit", fontWeight:600, fontSize:15, cursor:"pointer" }}>
                <EditIcon /> Edit RO Details
              </button>
            )}
            {colId === "delivered" && (
              <button onClick={() => onArchive(ro.id)} style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8, padding:14, background:"#F0FDF4", color:"#15803D", border:"1.5px solid #86EFAC", borderRadius:14, fontFamily:"'Barlow',sans-serif", fontWeight:700, fontSize:15, cursor:"pointer" }}>
                <ArchiveIcon /> Archive Ticket
              </button>
            )}
            <button onClick={() => { if (window.confirm("Delete this RO?")) onDelete(ro.id); }} style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8, padding:14, background:"#FEF2F2", color:"#EF4444", border:"1.5px solid #FECACA", borderRadius:14, fontFamily:"'Barlow',sans-serif", fontWeight:700, fontSize:15, cursor:"pointer" }}>
              <TrashIcon /> Delete RO
            </button>
          </div>
        )}
      </div>
    </Sheet>
  );
}
// ─── Quick Add Modal ──────────────────────────────────────────────────────────
function QuickAddModal({ onAdd, onClose, nextNum, serviceTypes }) {
  const defaultRoNum = "RO-" + String(nextNum).padStart(4, "0");
  const [f, setF] = useState({
    roNum: defaultRoNum,
    year: "", make: "", model: "",
    serviceType: "st-main",
    waitStatus: "dropoff",
  });
  const roNumRef = useRef(null);
  useEffect(() => { setTimeout(() => roNumRef.current?.select(), 80); }, []);

  const queueMap = { "st-main":"q-main", "st-pdi":"q-pdi", "st-used":"q-used" };

  function handleAdd() {
    if (!f.roNum.trim()) return;
    onAdd({
      ...f,
      color:"", plate:"", mileageIn:"", vin:"", customer:"", phone:"", email:"",
      priority:"NORMAL", hours:"", jobs:"", parts:"", concern:"", cause:"", correction:"", notes:"", promiseTime:"",
      dest: "queue",
      assignQueue: queueMap[f.serviceType] || "q-main",
    });
  }

  const ready = f.roNum.trim().length > 0;

  return (
    <Sheet title="Quick Add RO" subtitle="Add details later by tapping the card" onClose={onClose}>
      <div style={{ display:"flex", flexDirection:"column", gap:16 }}>

        {/* RO Number */}
        <div>
          <label style={labelStyle}>RO Number</label>
          <input
            ref={roNumRef}
            value={f.roNum}
            onChange={e => setF(p => ({ ...p, roNum: e.target.value.toUpperCase() }))}
            placeholder="e.g. RO-1006"
            style={{ ...inputStyle, fontWeight:800, fontSize:18, letterSpacing:"1px", textAlign:"center" }}
          />
        </div>

        {/* Vehicle */}
        <div>
          <label style={labelStyle}>Vehicle</label>
          <div style={{ display:"grid", gridTemplateColumns:"72px 1fr 1fr", gap:8 }}>
            <input placeholder="Year" value={f.year} onChange={e => setF(p => ({ ...p, year: e.target.value }))} style={inputStyle} inputMode="numeric" />
            <input placeholder="Make" value={f.make} onChange={e => setF(p => ({ ...p, make: e.target.value }))} style={inputStyle} />
            <input placeholder="Model" value={f.model} onChange={e => setF(p => ({ ...p, model: e.target.value }))} style={inputStyle} />
          </div>
        </div>

        {/* Service Type */}
        <div>
          <label style={labelStyle}>Service Type</label>
          <div style={{ display:"flex", gap:8 }}>
            {(serviceTypes || DEFAULT_SERVICE_TYPES).map(st => (
              <button key={st.id} onClick={() => setF(p => ({ ...p, serviceType: st.id }))}
                style={{ flex:1, padding:"13px 6px", borderRadius:12, border:"2px solid "+(f.serviceType===st.id ? st.color : BORDER), background: f.serviceType===st.id ? st.color+"22" : "rgba(255,255,255,0.05)", color: f.serviceType===st.id ? st.color : SUB, fontWeight:700, fontSize:13, cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", justifyContent:"center", gap:6, transition:"all 0.15s" }}>
                <span style={{ width:8, height:8, borderRadius:"50%", background:st.color, display:"inline-block", flexShrink:0 }} />
                {st.name}
              </button>
            ))}
          </div>
        </div>

        {/* Wait / Drop-off */}
        <div>
          <label style={labelStyle}>Customer Status</label>
          <div style={{ display:"flex", gap:10 }}>
            {[["dropoff","Drop-Off","🚗"],["waiting","Waiting","⏳"]].map(([v,l,em]) => (
              <button key={v} onClick={() => setF(p => ({ ...p, waitStatus: v }))}
                style={{ flex:1, padding:"16px 0", borderRadius:14, border:"2px solid "+(f.waitStatus===v ? ACCENT : BORDER), background: f.waitStatus===v ? "rgba(10,132,255,0.18)" : "rgba(255,255,255,0.05)", color: f.waitStatus===v ? "#60A5FA" : "rgba(255,255,255,0.4)", fontWeight:700, fontSize:14, cursor:"pointer", fontFamily:"inherit", display:"flex", flexDirection:"column", alignItems:"center", gap:5, transition:"all 0.15s" }}>
                <span style={{ fontSize:22 }}>{em}</span>
                {l}
              </button>
            ))}
          </div>
        </div>

        {/* Submit */}
        <button onClick={handleAdd} disabled={!ready}
          style={{ marginTop:2, padding:17, background: ready ? ACCENT : "rgba(255,255,255,0.07)", color: ready ? "#fff" : "rgba(255,255,255,0.2)", border:"none", borderRadius:14, fontFamily:"'Barlow',sans-serif", fontWeight:800, fontSize:17, cursor: ready ? "pointer" : "default", letterSpacing:"-0.2px", boxShadow: ready ? "0 4px 20px rgba(10,132,255,0.4)" : "none", transition:"all 0.2s" }}>
          Add RO →
        </button>
      </div>
    </Sheet>
  );
}
// ─── New RO Modal ─────────────────────────────────────────────────────────────
function NewROModal({ onAdd, onClose, nextNum, techs, queues, wide, serviceTypes, jobPresets }) {
  const defaultRoNum = "RO-" + String(nextNum).padStart(4,"0");
  const [f, setF] = useState({ roNum:defaultRoNum, serviceType:"st-main", year:"", make:"", model:"", color:"", plate:"", mileageIn:"", vin:"", customer:"", phone:"", email:"", waitStatus:"none", priority:"NORMAL", hours:"", jobs:"", parts:"", concern:"", cause:"", correction:"", notes:"", promiseTime:"", dest:"queue", assignQueue:"q-main", assignTech:"", assignCol:"ondeck" });
  const [showJobPicker, setShowJobPicker] = useState(false);
  function handleAdd() {
    const roId = "ro-" + Date.now();
    onAdd({ ...f, roId });
  }
  return (
    <>
    <Sheet title="New Repair Order" subtitle="Fill in the details below" onClose={onClose} wide={wide}>
      <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
        {/* RO Number — editable */}
        <div>
          <label style={labelStyle}>RO Number</label>
          <input
            value={f.roNum}
            onChange={e => setF(p => ({...p, roNum:e.target.value.toUpperCase()}))}
            placeholder="e.g. RO-1006"style={{ ...inputStyle, fontWeight:800, fontSize:16, letterSpacing:"0.5px" }}
          />
        </div>
        {/* Service Type */}
        <div>
          <label style={labelStyle}>Service Type</label>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            {queues.map ? null : null}
            {serviceTypes && serviceTypes.map(st => (
              <button key={st.id} onClick={() => setF(p => ({...p, serviceType:st.id}))}
                style={{ flex:"1 1 auto", padding:"10px 8px", borderRadius:12, border:"2px solid "+(f.serviceType===st.id?st.color:BORDER), background:f.serviceType===st.id?st.bg+"33":"rgba(255,255,255,0.05)", color:f.serviceType===st.id?st.color:SUB, fontWeight:700, fontSize:12, cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
                <span style={{ width:8, height:8, borderRadius:"50%", background:st.color, display:"inline-block" }}/>
                {st.name}
              </button>
            ))}
          </div>
        </div>
        {/* Vehicle */}
        <div style={{ fontSize:10, fontWeight:800, color:"rgba(255,255,255,0.35)", textTransform:"uppercase", letterSpacing:"1px", paddingBottom:6, borderBottom:"1px solid rgba(255,255,255,0.08)" }}>Vehicle Info</div>
        <div style={{ display:"grid", gridTemplateColumns:"72px 1fr 1fr", gap:8 }}>
          <input placeholder="Year"  value={f.year}  onChange={e => setF(p => ({...p, year:e.target.value}))}  style={inputStyle} />
          <input placeholder="Make"  value={f.make}  onChange={e => setF(p => ({...p, make:e.target.value}))}  style={inputStyle} />
          <input placeholder="Model" value={f.model} onChange={e => setF(p => ({...p, model:e.target.value}))} style={inputStyle} />
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>          <div><label style={labelStyle}>Color</label><input placeholder="e.g. White" value={f.color} onChange={e => setF(p => ({...p, color:e.target.value}))} style={inputStyle}/></div>
          <div><label style={labelStyle}>Plate #</label><input placeholder="ABC1234" value={f.plate} onChange={e => setF(p => ({...p, plate:e.target.value}))} style={inputStyle}/></div>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
          <div><label style={labelStyle}>Mileage In</label><input type="number" placeholder="e.g. 45000" value={f.mileageIn} onChange={e => setF(p => ({...p, mileageIn:e.target.value}))} style={inputStyle}/></div>
          <div><label style={labelStyle}>VIN (optional)</label><input placeholder="17 characters" value={f.vin} onChange={e => setF(p => ({...p, vin:e.target.value}))} style={inputStyle}/></div>
        </div>
        {/* Customer */}
        <div style={{ fontSize:10, fontWeight:800, color:MUTED, textTransform:"uppercase", letterSpacing:"1px", paddingBottom:6, borderBottom:"1px solid "+BORDER, marginTop:4 }}>Customer Info</div>
        <div><label style={labelStyle}>Customer Name / Stock #</label><input placeholder="Full name or stock number" value={f.customer} onChange={e => setF(p => ({...p, customer:e.target.value}))} style={inputStyle}/></div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
          <div><label style={labelStyle}>Phone</label><input type="tel" placeholder="555-0000" value={f.phone} onChange={e => setF(p => ({...p, phone:e.target.value}))} style={inputStyle}/></div>
          <div><label style={labelStyle}>Email</label><input type="email" placeholder="email@email.com" value={f.email} onChange={e => setF(p => ({...p, email:e.target.value}))} style={inputStyle}/></div>
        </div>
        <div>
          <label style={labelStyle}>Customer Status</label>
          <div style={{ display:"flex", gap:8 }}>
            {[["none","—  None"],["dropoff","Drop-Off"],["waiting","Waiting"]].map(([v,l]) => (
              <button key={v} onClick={() => setF(p => ({...p, waitStatus:v}))}
                style={{ flex:1, padding:"10px 0", borderRadius:12, border:"2px solid "+(f.waitStatus===v?ACCENT:BORDER), background:f.waitStatus===v?"rgba(59,130,246,0.2)":"rgba(255,255,255,0.05)", color:f.waitStatus===v?"#60A5FA":"rgba(255,255,255,0.4)", fontWeight:700, fontSize:12, cursor:"pointer", fontFamily:"inherit" }}>
                {l}
              </button>
            ))}
          </div>
        </div>
        {/* Job */}
        <div style={{ fontSize:10, fontWeight:800, color:MUTED, textTransform:"uppercase", letterSpacing:"1px", paddingBottom:6, borderBottom:"1px solid "+BORDER, marginTop:4 }}>Job Info</div>
        <div>
          <label style={labelStyle}>Priority</label>
          <div style={{ display:"flex", gap:8 }}>
            {["LOW","NORMAL","HIGH"].map(p => (
              <button key={p} onClick={() => setF(prev => ({...prev, priority:p}))}
                style={{ flex:1, padding:"10px 0", borderRadius:12, border:"2px solid "+(f.priority===p?priorityBorder(p):BORDER), background:f.priority===p?priorityBorder(p)+"33":"rgba(255,255,255,0.05)", color:f.priority===p?priorityBorder(p):"rgba(255,255,255,0.4)", fontWeight:700, fontSize:12, cursor:"pointer", fontFamily:"'Barlow',sans-serif" }}>
                {p}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label style={labelStyle}>Flat Rate Hours</label>
          <input type="number" placeholder="e.g. 2.5" value={f.hours} onChange={e => setF(p => ({...p, hours:e.target.value}))} style={inputStyle}/>
        </div>
        <JobFieldTrigger value={f.jobs} onOpen={() => setShowJobPicker(true)} />
        <div>          <label style={labelStyle}>Promise Time (optional)</label>
          <input type="datetime-local" value={f.promiseTime||""} onChange={e => setF(p=>({...p, promiseTime:e.target.value}))} style={inputStyle}/>
        </div>
        <div><label style={labelStyle}>Customer Concern</label><textarea placeholder="What the customer says is wrong…" value={f.concern} onChange={e => setF(p => ({...p, concern:e.target.value}))} rows={2} style={{...inputStyle,resize:"vertical"}}/></div>
        <div><label style={labelStyle}>Notes</label><textarea placeholder="Any extra info…" value={f.notes} onChange={e => setF(p => ({...p, notes:e.target.value}))} rows={2} style={{...inputStyle,resize:"vertical"}}/></div>
        <div>
          <label style={labelStyle}>Place In</label>
          <div style={{ display:"flex", gap:8, marginBottom:10 }}>
            {[["queue","Staging Queue"],["tech","Technician"]].map(([v,l]) => (
              <button key={v} onClick={() => setF(p => ({...p, dest:v}))}
                style={{ flex:1, padding:11, borderRadius:12, border:"2px solid "+(f.dest===v?ACCENT:BORDER), background:f.dest===v?"rgba(59,130,246,0.2)":"rgba(255,255,255,0.05)", color:f.dest===v?"#60A5FA":"rgba(255,255,255,0.4)", fontWeight:700, fontSize:13, cursor:"pointer", fontFamily:"inherit" }}>
                {l}
              </button>
            ))}
          </div>
          {f.dest === "queue"? (
              <select value={f.assignQueue} onChange={e => setF(p => ({...p, assignQueue:e.target.value}))} style={inputStyle}>
                {queues.map(q => <option key={q.id} value={q.id}>{q.name}</option>)}
              </select>
            ) : (
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                <select value={f.assignTech} onChange={e => setF(p => ({...p, assignTech:e.target.value}))} style={inputStyle}>
                  <option value="">— Tech —</option>
                  {techs.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                <select value={f.assignCol} onChange={e => setF(p => ({...p, assignCol:e.target.value}))} style={inputStyle}>
                  {COLS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </div>
            )
          }
        </div>
        <button onClick={handleAdd} style={{ padding:15, background:ACCENT, color:"#fff", border:"none", borderRadius:14, fontFamily:"'Barlow',sans-serif", fontWeight:800, fontSize:16, cursor:"pointer" }}>
          + Create RO
        </button>
      </div>
    </Sheet>
    {showJobPicker && (
      <JobPicker value={f.jobs} onChange={v => setF(p => ({...p, jobs:v}))} presets={jobPresets||DEFAULT_JOB_PRESETS} onClose={() => setShowJobPicker(false)} />
    )}
    </>
  );
}
// ─── Archive Modal ────────────────────────────────────────────────────────────
function ArchiveModal({ archived, onClose, onRestore, wide }) {
  return (
    <Sheet title="Archived Tickets" subtitle={archived.length + " total"} onClose={onClose} wide={wide}>
      {archived.length === 0 ? (
        <div style={{ textAlign:"center", color:MUTED, padding:"48px 0", fontSize:15 }}>No archived tickets yet</div>      ) : (
        archived.map(entry => {
          const ro = entry.ro;
          return (
            <div key={ro.id + entry.archivedAt} style={{ background:"rgba(255,255,255,0.05)", borderRadius:14, padding:"14px 16px", marginBottom:10, border:"1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                <div>
                  <div style={{ fontWeight:800, fontSize:15, color:"#E2E8F0", fontFamily:"'Barlow',sans-serif" }}>{ro.roNum}</div>
                  <div style={{ fontSize:13, color:"rgba(255,255,255,0.4)", marginTop:2 }}>{[ro.year,ro.make,ro.model].filter(Boolean).join(" ")}</div>
                  <div style={{ fontSize:12, color:MUTED, marginTop:1 }}>{ro.customer}</div>
                  <div style={{ fontSize:11, color:MUTED, marginTop:4 }}>{"Archived " + new Date(entry.archivedAt).toLocaleDateString() + " · " + (ro.hours||"0") + "h"}</div>
                </div>
                <button onClick={() => onRestore(entry)} style={{ background:ACCENT2, color:ACCENT, border:"1px solid #C7D9FD", borderRadius:10, padding:"8px 14px", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit", whiteSpace:"nowrap" }}>
                  Restore
                </button>
              </div>
            </div>
          );
        })
      )}
    </Sheet>
  );
}
// ─── History Modal ───────────────────────────────────────────────────────────
function HistoryModal({ archived, onClose, wide }) {
  const [query, setQuery] = useState("");
  const [detail, setDetail] = useState(null);
  const q = query.toLowerCase().trim();
  const results = (archived||[]).filter(entry => {
    if (!q) return true;
    const ro = entry.ro;
    return (
      (ro.roNum||"").toLowerCase().includes(q) ||
      (ro.customer||"").toLowerCase().includes(q) ||
      (ro.make||"").toLowerCase().includes(q) ||
      (ro.model||"").toLowerCase().includes(q) ||
      (ro.jobs||"").toLowerCase().includes(q)
    );
  }).slice().reverse();
  if (detail) {
    const ro = detail.ro;
    return (
      <Sheet title={ro.roNum} subtitle={[ro.year,ro.make,ro.model].filter(Boolean).join(" ")} onClose={() => setDetail(null)} wide={wide}>
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          <div style={{ background:"rgba(255,255,255,0.05)", borderRadius:14, padding:"14px 16px" }}>
            <div style={{ fontSize:11, fontWeight:600, color:TEXT3, textTransform:"uppercase", letterSpacing:"0.8px", marginBottom:8 }}>Customer</div>
            <div style={{ fontSize:15, fontWeight:600, color:TEXT }}>{ro.customer||"—"}</div>
            {ro.phone && <div style={{ fontSize:13, color:TEXT2, marginTop:2 }}>{ro.phone}</div>}
          </div>
          <div style={{ background:"rgba(255,255,255,0.05)", borderRadius:14, padding:"14px 16px" }}>
            <div style={{ fontSize:11, fontWeight:600, color:TEXT3, textTransform:"uppercase", letterSpacing:"0.8px", marginBottom:8 }}>Jobs</div>
            <div style={{ fontSize:14, color:TEXT2 }}>{ro.jobs||"—"}</div>
          </div>
          {ro.concern && (
            <div style={{ background:"rgba(255,255,255,0.05)", borderRadius:14, padding:"14px 16px" }}>
              <div style={{ fontSize:11, fontWeight:600, color:TEXT3, textTransform:"uppercase", letterSpacing:"0.8px", marginBottom:6 }}>Concern</div>
              <div style={{ fontSize:13, color:TEXT2 }}>{ro.concern}</div>
            </div>
          )}
          {ro.cause && (
            <div style={{ background:"rgba(255,255,255,0.05)", borderRadius:14, padding:"14px 16px" }}>
              <div style={{ fontSize:11, fontWeight:600, color:TEXT3, textTransform:"uppercase", letterSpacing:"0.8px", marginBottom:6 }}>Cause</div>
              <div style={{ fontSize:13, color:TEXT2 }}>{ro.cause}</div>
            </div>
          )}
          {ro.correction && (
            <div style={{ background:"rgba(255,255,255,0.05)", borderRadius:14, padding:"14px 16px" }}>
              <div style={{ fontSize:11, fontWeight:600, color:TEXT3, textTransform:"uppercase", letterSpacing:"0.8px", marginBottom:6 }}>Correction</div>
              <div style={{ fontSize:13, color:TEXT2 }}>{ro.correction}</div>
            </div>
          )}
          <div style={{ background:"rgba(255,255,255,0.05)", borderRadius:14, padding:"14px 16px", display:"flex", gap:20 }}>
            <div><div style={{ fontSize:11, fontWeight:600, color:TEXT3, textTransform:"uppercase", letterSpacing:"0.8px", marginBottom:4 }}>Hours</div><div style={{ fontSize:15, fontWeight:700, color:TEXT }}>{ro.hours||"—"}</div></div>
            <div><div style={{ fontSize:11, fontWeight:600, color:TEXT3, textTransform:"uppercase", letterSpacing:"0.8px", marginBottom:4 }}>Archived</div><div style={{ fontSize:13, color:TEXT2 }}>{new Date(detail.archivedAt).toLocaleDateString()}</div></div>
            {ro.mileageIn && <div><div style={{ fontSize:11, fontWeight:600, color:TEXT3, textTransform:"uppercase", letterSpacing:"0.8px", marginBottom:4 }}>Mileage</div><div style={{ fontSize:13, color:TEXT2 }}>{ro.mileageIn}</div></div>}
          </div>
          {(ro.roNotes||[]).length > 0 && (
            <div style={{ background:"rgba(255,255,255,0.05)", borderRadius:14, padding:"14px 16px" }}>
              <div style={{ fontSize:11, fontWeight:600, color:TEXT3, textTransform:"uppercase", letterSpacing:"0.8px", marginBottom:10 }}>Notes</div>
              {ro.roNotes.map(n => (
                <div key={n.id} style={{ marginBottom:8, paddingBottom:8, borderBottom:"1px solid "+BORDER }}>
                  <div style={{ fontSize:12, color:TEXT3, marginBottom:2 }}>{n.author} · {new Date(n.time).toLocaleString()}</div>
                  <div style={{ fontSize:13, color:TEXT2 }}>{n.text}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Sheet>
    );
  }
  return (
    <Sheet title="RO History" subtitle={(archived||[]).length + " archived tickets"} onClose={onClose} wide={wide}>
      <div>
        <div style={{ position:"relative", marginBottom:14 }}>
          <input
            placeholder="Search by RO#, customer, vehicle, job…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            autoFocus
            style={{ ...inputStyle, paddingLeft:36 }}
          />
          <div style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", color:TEXT3, fontSize:14, pointerEvents:"none" }}>🔍</div>
          {query && (
            <button onClick={() => setQuery("")} style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", color:TEXT3, fontSize:16, cursor:"pointer", padding:4 }}>✕</button>
          )}
        </div>
        {results.length === 0 ? (
          <div style={{ textAlign:"center", color:MUTED, padding:"48px 0", fontSize:15 }}>
            {query ? `No results for "${query}"` : "No archived tickets yet"}
          </div>
        ) : (
          results.map(entry => {
            const ro = entry.ro;
            return (
              <div key={ro.id + entry.archivedAt}
                onClick={() => setDetail(entry)}
                style={{ background:"rgba(255,255,255,0.05)", borderRadius:14, padding:"14px 16px", marginBottom:10, border:"1px solid rgba(255,255,255,0.08)", cursor:"pointer", transition:"background 0.15s ease" }}
                onPointerEnter={e => e.currentTarget.style.background="rgba(255,255,255,0.08)"}
                onPointerLeave={e => e.currentTarget.style.background="rgba(255,255,255,0.05)"}
              >
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:700, fontSize:15, color:TEXT }}>{ro.roNum}</div>
                    <div style={{ fontSize:13, color:TEXT2, marginTop:2 }}>{[ro.year,ro.make,ro.model].filter(Boolean).join(" ")}</div>
                    <div style={{ fontSize:12, color:TEXT3, marginTop:1 }}>{ro.customer}</div>
                    {ro.jobs && <div style={{ fontSize:12, color:TEXT3, marginTop:4, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{ro.jobs}</div>}
                  </div>
                  <div style={{ textAlign:"right", flexShrink:0, marginLeft:12 }}>
                    <div style={{ fontSize:11, color:TEXT3 }}>{new Date(entry.archivedAt).toLocaleDateString()}</div>
                    {ro.hours && <div style={{ fontSize:12, color:ACCENT, fontWeight:600, marginTop:2 }}>{ro.hours}h</div>}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </Sheet>
  );
}
// ─── Report Modal ────────────────────────────────────────────────────────────
function ReportModal({ state, onClose, wide }) {
  const LABOR_RATE = parseFloat(localStorage.getItem("sft-labor-rate")||"125");
  function parseHrs(h) { return parseFloat(String(h||"0").replace(/[^0-9.]/g,""))||0; }

  function buildReport(range) {
    const now   = Date.now();
    const today = new Date(); today.setHours(0,0,0,0);
    let rangeStart, rangeLabel, dateLabel;
    if (range === "today") {
      rangeStart = today.getTime();
      rangeLabel = "Daily Report";
      dateLabel  = new Date().toLocaleDateString([], {weekday:"long", year:"numeric", month:"long", day:"numeric"});
    } else {
      const dow = today.getDay();
      const weekStart = new Date(today); weekStart.setDate(weekStart.getDate() - dow);
      rangeStart = weekStart.getTime();
      const weekEnd = new Date(weekStart); weekEnd.setDate(weekEnd.getDate() + 6);
      rangeLabel = "Weekly Report";
      dateLabel  = weekStart.toLocaleDateString([], {month:"short", day:"numeric"}) + " – " + weekEnd.toLocaleDateString([], {month:"short", day:"numeric", year:"numeric"});
    }

    const ros      = state.ros || [];
    const archived = (state.archived || []).filter(e => e.archivedAt >= rangeStart);
    const techs    = state.techs || [];
    const grid     = state.grid || {};
    const actLog   = (state.activityLog || []).filter(e => e.endTime && e.startTime >= rangeStart);

    // All active RO ids on board
    const allGridIds = Object.values(grid).flatMap(cols => Object.values(cols).flat());
    const partsIds   = state.partsSlots || [];
    const stagingIds = Object.values(state.qSlots||{}).flat();

    // Board counts
    const byCol = {};
    COLS.forEach(c => { byCol[c.id] = Object.values(grid).flatMap(cols => cols[c.id]||[]).length; });
    byCol.waiting = partsIds.length;
    byCol.staging = stagingIds.length;

    // Total hours + revenue from active board ROs
    const totalHrs = allGridIds.reduce((s,id) => { const r=ros.find(x=>x.id===id); return s+parseHrs(r?.hours); }, 0);
    const archivedHrs = archived.reduce((s,e) => s+parseHrs(e.ro?.hours), 0);
    const totalROs = allGridIds.length + stagingIds.length + partsIds.length;
    const estRevenue = (totalHrs + archivedHrs) * LABOR_RATE;

    // Promise time compliance — archived ROs with promise times
    const withPromise = archived.filter(e => e.ro?.promiseTime);
    const onTime = withPromise.filter(e => {
      const due = new Date(e.ro.promiseTime).getTime();
      return e.archivedAt <= due;
    });

    // Tech rows
    const techRows = techs.map(tech => {
      const cols   = grid[tech.id] || {};
      const active = COLS.flatMap(c => cols[c.id]||[]);
      const hrs    = active.reduce((s,id) => { const r=ros.find(x=>x.id===id); return s+parseHrs(r?.hours); }, 0);
      const archByTech = archived.filter(e => {
        return Object.values(grid[tech.id]||{}).flat().includes(e.ro?.id) ||
          (e.ro && archived.some(a => a.ro?.id === e.ro?.id));
      });
      const movingMs   = actLog.filter(e => e.userId===tech.id && e.activityId==="moving").reduce((s,e) => s+(e.endTime-e.startTime), 0);
      const partsRunMs = actLog.filter(e => e.userId===tech.id && e.activityId==="parts_run").reduce((s,e) => s+(e.endTime-e.startTime), 0);
      function fmtMin(ms) { const m=Math.round(ms/60000); return m>0 ? m+"m" : "—"; }
      return {
        name:       tech.name,
        active:     active.length,
        completed:  (cols.completed||[]).length,
        delivered:  (cols.delivered||[]).length,
        hrs:        hrs.toFixed(1),
        revenue:    "$" + (hrs * LABOR_RATE).toLocaleString("en-US", {minimumFractionDigits:0, maximumFractionDigits:0}),
        moving:     fmtMin(movingMs),
        partsRun:   fmtMin(partsRunMs),
      };
    });

    const printDate = new Date().toLocaleString([], {month:"short", day:"numeric", year:"numeric", hour:"2-digit", minute:"2-digit"});

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>Service Department ${rangeLabel} — ${dateLabel}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif; font-size: 12px; color: #111; background: #fff; padding: 32px 40px; }
  h1 { font-size: 22px; font-weight: 700; letter-spacing: -0.5px; margin-bottom: 2px; }
  h2 { font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.6px; color: #555; margin: 24px 0 10px; border-bottom: 1.5px solid #e0e0e0; padding-bottom: 5px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; padding-bottom: 16px; border-bottom: 2px solid #111; }
  .header-left .subtitle { font-size: 13px; color: #555; margin-top: 3px; }
  .header-right { text-align: right; font-size: 11px; color: #777; line-height: 1.6; }
  .stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 4px; }
  .stat-box { background: #f7f7f7; border: 1px solid #e0e0e0; border-radius: 8px; padding: 12px 14px; }
  .stat-box .label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.7px; color: #888; margin-bottom: 5px; }
  .stat-box .value { font-size: 22px; font-weight: 700; color: #111; line-height: 1; }
  .stat-box .sub { font-size: 10px; color: #888; margin-top: 4px; }
  table { width: 100%; border-collapse: collapse; font-size: 11.5px; }
  th { background: #f0f0f0; font-weight: 700; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #444; padding: 8px 10px; text-align: left; border: 1px solid #ddd; }
  td { padding: 8px 10px; border: 1px solid #e8e8e8; vertical-align: middle; }
  tr:nth-child(even) td { background: #fafafa; }
  .num { text-align: right; font-weight: 600; }
  .status-row { display: flex; gap: 16px; flex-wrap: wrap; margin-bottom: 4px; }
  .status-pill { background: #f0f0f0; border: 1px solid #ddd; border-radius: 20px; padding: 5px 14px; font-size: 11px; font-weight: 600; }
  .status-pill span { color: #555; font-weight: 400; margin-left: 5px; }
  .compliance { font-size: 20px; font-weight: 700; }
  .footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #e0e0e0; font-size: 10px; color: #aaa; display: flex; justify-content: space-between; }
  @media print {
    body { padding: 16px 20px; }
    @page { margin: 0.5in; size: letter; }
    button, .no-print { display: none !important; }
  }
</style>
</head>
<body>
<div class="header">
  <div class="header-left">
    <h1>Service Department</h1>
    <div class="subtitle">${rangeLabel} &nbsp;·&nbsp; ${dateLabel}</div>
  </div>
  <div class="header-right">
    <div style="font-size:18px;font-weight:800;letter-spacing:-0.5px">Worqflow</div>
    <div>Generated ${printDate}</div>
    <div>Labor rate: $${LABOR_RATE}/hr</div>
  </div>
</div>

<h2>Summary</h2>
<div class="stat-grid">
  <div class="stat-box"><div class="label">Active ROs</div><div class="value">${totalROs}</div><div class="sub">on board now</div></div>
  <div class="stat-box"><div class="label">Archived Today</div><div class="value">${archived.length}</div><div class="sub">completed &amp; closed</div></div>
  <div class="stat-box"><div class="label">Flagged Hours</div><div class="value">${(totalHrs + archivedHrs).toFixed(1)}</div><div class="sub">active + archived</div></div>
  <div class="stat-box"><div class="label">Est. Revenue</div><div class="value">$${Math.round(estRevenue).toLocaleString()}</div><div class="sub">@ $${LABOR_RATE}/hr</div></div>
</div>

<h2>Board Status</h2>
<div class="status-row">
  <div class="status-pill">On Deck <span>${byCol.ondeck}</span></div>
  <div class="status-pill">In Progress <span>${byCol.inprogress}</span></div>
  <div class="status-pill">Completed / QC <span>${byCol.completed}</span></div>
  <div class="status-pill">Delivered <span>${byCol.delivered}</span></div>
  <div class="status-pill">Waiting on Parts <span>${byCol.waiting}</span></div>
  <div class="status-pill">Staging Queue <span>${byCol.staging}</span></div>
</div>

<h2>Tech Breakdown</h2>
<table>
  <thead>
    <tr>
      <th>Technician</th>
      <th class="num">Active</th>
      <th class="num">Completed</th>
      <th class="num">Delivered</th>
      <th class="num">Flagged Hrs</th>
      <th class="num">Est. Revenue</th>
      <th class="num">Moving Cars</th>
      <th class="num">Parts Run</th>
    </tr>
  </thead>
  <tbody>
    ${techRows.map(t => `
    <tr>
      <td style="font-weight:600">${t.name}</td>
      <td class="num">${t.active}</td>
      <td class="num">${t.completed}</td>
      <td class="num">${t.delivered}</td>
      <td class="num">${t.hrs}</td>
      <td class="num">${t.revenue}</td>
      <td class="num">${t.moving}</td>
      <td class="num">${t.partsRun}</td>
    </tr>`).join("")}
  </tbody>
</table>

${withPromise.length > 0 ? `
<h2>Promise Time Compliance</h2>
<div style="display:flex;align-items:center;gap:24px;padding:14px 0">
  <div><div class="compliance">${onTime.length} / ${withPromise.length}</div><div style="font-size:11px;color:#555;margin-top:3px">Delivered on time</div></div>
  <div><div class="compliance" style="color:${onTime.length===withPromise.length?"#15803d":"#b91c1c"}">${withPromise.length>0?Math.round((onTime.length/withPromise.length)*100):0}%</div><div style="font-size:11px;color:#555;margin-top:3px">On-time rate</div></div>
  <div><div class="compliance" style="color:#b91c1c">${withPromise.length - onTime.length}</div><div style="font-size:11px;color:#555;margin-top:3px">Missed</div></div>
</div>` : ""}

<div class="footer">
  <span>Worqflow — Service Department Report</span>
  <span>${dateLabel}</span>
</div>

<script>window.onload = function() { window.print(); }<\/script>
</body>
</html>`;

    const win = window.open("", "_blank");
    if (!win) { alert("Pop-up blocked. Please allow pop-ups for this site."); return; }
    win.document.write(html);
    win.document.close();
  }

  return (
    <Sheet title="Generate Report" subtitle="Print or save as PDF" onClose={onClose} wide={wide}>
      <div style={{ display:"flex", flexDirection:"column", gap:14, paddingTop:8 }}>
        <div style={{ fontSize:13, color:TEXT2, lineHeight:1.5, marginBottom:4 }}>
          Choose a time range. Your browser's print dialog will open — select "Save as PDF" to download.
        </div>
        <button
          onClick={() => buildReport("today")}
          style={{ padding:"18px 20px", background:"rgba(10,132,255,0.12)", border:"1px solid rgba(10,132,255,0.3)", borderRadius:16, cursor:"pointer", textAlign:"left", fontFamily:"inherit" }}
        >
          <div style={{ fontSize:16, fontWeight:700, color:TEXT }}>Today's Report</div>
          <div style={{ fontSize:12, color:TEXT3, marginTop:3 }}>
            {new Date().toLocaleDateString([], {weekday:"long", month:"long", day:"numeric"})}
          </div>
        </button>
        <button
          onClick={() => buildReport("week")}
          style={{ padding:"18px 20px", background:"rgba(48,209,88,0.1)", border:"1px solid rgba(48,209,88,0.25)", borderRadius:16, cursor:"pointer", textAlign:"left", fontFamily:"inherit" }}
        >
          <div style={{ fontSize:16, fontWeight:700, color:TEXT }}>This Week's Report</div>
          <div style={{ fontSize:12, color:TEXT3, marginTop:3 }}>
            {(() => {
              const d = new Date(); d.setHours(0,0,0,0);
              const ws = new Date(d); ws.setDate(ws.getDate() - ws.getDay());
              const we = new Date(ws); we.setDate(we.getDate() + 6);
              return ws.toLocaleDateString([], {month:"short", day:"numeric"}) + " – " + we.toLocaleDateString([], {month:"short", day:"numeric", year:"numeric"});
            })()}
          </div>
        </button>
        <div style={{ marginTop:4, padding:"12px 14px", background:"rgba(255,255,255,0.04)", borderRadius:12, border:"1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ fontSize:11, color:TEXT3 }}>
            Labor rate used for revenue estimates: <strong style={{ color:TEXT2 }}>${LABOR_RATE}/hr</strong>
            <br/>Change this in the Analytics screen.
          </div>
        </div>
      </div>
    </Sheet>
  );
}
// ─── Job Presets Editor ──────────────────────────────────────────────────────
function JobPresetsEditor({ presets, onSave }) {
  const [list, setList] = useState([...presets]);
  const [newJob, setNewJob] = useState("");
  function addJob() {
    const j = newJob.trim();
    if (!j || list.includes(j)) return;
    setList(l => [...l, j]);
    setNewJob("");
  }
  function removeJob(j) {
    setList(l => l.filter(x => x !== j));
  }
  return (
    <div>
      <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginBottom:14 }}>
        {list.map(j => {
          const ab = abbrevJob(j);
          return (
            <span key={j} style={{ background:ab.bg, color:ab.color, fontSize:12, fontWeight:700, padding:"5px 10px", borderRadius:20, display:"flex", alignItems:"center", gap:5 }}>              {j}
              <button onClick={() => removeJob(j)} style={{ background:"none", border:"none", cursor:"pointer", color:ab.color, padding:0, fontSize:15, lineHeight:1, opacity:0.7 }}>×</button>
            </span>
          );
        })}
      </div>
      <div style={{ display:"flex", gap:8, marginBottom:12 }}>
        <input
          placeholder="Add new job type…"value={newJob}
          onChange={e => setNewJob(e.target.value)}
          onKeyDown={e => e.key === "Enter" && addJob()}
          style={{ ...inputStyle, flex:1, padding:"10px 12px" }}
        />
        <button onClick={addJob} style={{ background:ACCENT, color:"#fff", border:"none", borderRadius:10, padding:"0 16px", cursor:"pointer", fontWeight:700, fontSize:13, fontFamily:"inherit", whiteSpace:"nowrap" }}>
          Add
        </button>
      </div>
      <button onClick={() => onSave(list)} style={{ width:"100%", padding:13, background:"linear-gradient(135deg,#16A34A,#15803D)", color:"#fff", border:"none", borderRadius:12, fontFamily:"'Barlow',sans-serif", fontWeight:800, fontSize:14, cursor:"pointer" }}>
        Save Job Presets
      </button>
    </div>
  );
}
// ─── Service Type Settings ───────────────────────────────────────────────────
const PRESET_COLORS = [
  "#1D6BF3","#9333EA","#16A34A","#EF4444","#D97706","#0891B2","#DB2777","#65A30D","#7C3AED","#EA580C"
];
const COLOR_BG = {
  "#1D6BF3":"#EEF4FF","#9333EA":"#FAF5FF","#16A34A":"#F0FDF4","#EF4444":"#FEF2F2",
  "#D97706":"#FFFBEB","#0891B2":"#ECFEFF","#DB2777":"#FDF2F8","#65A30D":"#F7FEE7",
  "#7C3AED":"#F5F3FF","#EA580C":"#FFF7ED",
};
function ServiceTypeSettings({ serviceTypes, jobPresets, techs, displayPin, onClose, onSave, onSaveJobs, onSaveTechs, onSaveDisplayPin, wide }) {
  const [types, setTypes] = useState(serviceTypes.map(s => ({...s})));
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#1D6BF3");
  const [techList, setTechList] = useState((techs||[]).map(t => ({...t})));
  const [newTechName, setNewTechName] = useState("");
  const [newTechPin, setNewTechPin] = useState(null); // PIN shown after creation
  const [removeConfirm, setRemoveConfirm] = useState(null); // id to confirm removal
  const [newDisplayPin, setNewDisplayPin] = useState("");
  const [displayPinErr, setDisplayPinErr] = useState("");
  const [displayPinSaved, setDisplayPinSaved] = useState(false);
  function saveDisplayPin() {
    if (!/^[0-9]{4,8}$/.test(newDisplayPin)) { setDisplayPinErr("Must be 4–8 digits"); return; }
    onSaveDisplayPin && onSaveDisplayPin(newDisplayPin);
    setNewDisplayPin("");
    setDisplayPinErr("");
    setDisplayPinSaved(true);
    setTimeout(() => setDisplayPinSaved(false), 2500);
  }
  function addType() {
    if (!newName.trim()) return;
    const id = "st-" + Date.now();
    setTypes(t => [...t, { id, name:newName.trim(), color:newColor, bg:COLOR_BG[newColor]||"#F8FAFC" }]);
    setNewName("");
    setNewColor("#1D6BF3");
  }  function removeType(id) {
    setTypes(t => t.filter(x => x.id !== id));
  }
  function updateName(id, name) {
    setTypes(t => t.map(x => x.id === id ? {...x, name} : x));
  }
  function updateColor(id, color) {
    setTypes(t => t.map(x => x.id === id ? {...x, color, bg:COLOR_BG[color]||"#F8FAFC"} : x));
  }
  function addTech() {
    if (!newTechName.trim()) return;
    const id = "tech-" + Date.now();
    const pin = "0000";
    const newTech = { id, name:newTechName.trim(), role:"tech", pin };
    setTechList(t => [...t, newTech]);
    setNewTechName("");
    setNewTechPin({ name:newTechName.trim(), pin });
  }
  function confirmRemoveTech(id) { setRemoveConfirm(id); }
  function doRemoveTech(id) {
    setTechList(t => t.filter(x => x.id !== id));
    setRemoveConfirm(null);
  }
  return (
    <Sheet title="Settings" subtitle="Manage techs, service types, and job presets" onClose={onClose} wide={wide}>
      <div>
        {/* ── Technicians section ── */}
        <div style={{ marginBottom:24 }}>
          <div style={{ fontWeight:700, fontSize:15, color:TEXT, marginBottom:4 }}>Technicians</div>
          <div style={{ fontSize:12, color:MUTED, marginBottom:12 }}>Add or remove techs. New tech PIN defaults to 0000.</div>
          {techList.map(tech => (
            <div key={tech.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 0", borderBottom:"1px solid "+BORDER }}>
              <div style={{ width:32, height:32, borderRadius:10, background:"rgba(10,132,255,0.15)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:700, color:ACCENT, flexShrink:0 }}>
                {tech.name.slice(0,2).toUpperCase()}
              </div>
              <span style={{ flex:1, fontSize:14, fontWeight:500, color:TEXT }}>{tech.name}</span>
              {removeConfirm === tech.id ? (
                <div style={{ display:"flex", gap:6 }}>
                  <button onClick={() => doRemoveTech(tech.id)}
                    style={{ background:"rgba(255,69,58,0.15)", color:DANGER, border:"1px solid rgba(255,69,58,0.3)", borderRadius:8, padding:"6px 10px", fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                    Confirm
                  </button>
                  <button onClick={() => setRemoveConfirm(null)}
                    style={{ background:"rgba(255,255,255,0.06)", color:TEXT3, border:"1px solid rgba(255,255,255,0.1)", borderRadius:8, padding:"6px 10px", fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
                    Cancel
                  </button>
                </div>
              ) : (
                <button onClick={() => confirmRemoveTech(tech.id)}
                  style={{ background:"rgba(255,69,58,0.12)", color:DANGER, border:"1px solid rgba(255,69,58,0.2)", borderRadius:8, padding:"6px 10px", fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"inherit", flexShrink:0 }}>
                  Remove
                </button>
              )}
            </div>
          ))}
          <div style={{ marginTop:14, display:"flex", gap:8 }}>
            <input
              placeholder="New tech name…"
              value={newTechName}
              onChange={e => setNewTechName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addTech()}
              style={{ ...inputStyle, flex:1, padding:"10px" }}
            />
            <button onClick={addTech}
              style={{ background:ACCENT, color:"#fff", border:"none", borderRadius:10, padding:"0 16px", cursor:"pointer", fontWeight:700, fontSize:13, whiteSpace:"nowrap" }}>
              Add
            </button>
          </div>
          {newTechPin && (
            <div style={{ marginTop:12, background:"rgba(48,209,88,0.1)", border:"1px solid rgba(48,209,88,0.3)", borderRadius:12, padding:"12px 14px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <div>
                <div style={{ fontSize:12, color:SUCCESS, fontWeight:600 }}>✓ {newTechPin.name} added</div>
                <div style={{ fontSize:13, color:TEXT2, marginTop:2 }}>Default PIN: <span style={{ fontWeight:700, color:TEXT, letterSpacing:"2px" }}>{newTechPin.pin}</span></div>
              </div>
              <button onClick={() => setNewTechPin(null)} style={{ background:"none", border:"none", color:TEXT3, fontSize:18, cursor:"pointer", padding:4 }}>✕</button>
            </div>
          )}
          <button onClick={() => onSaveTechs && onSaveTechs(techList)}
            style={{ marginTop:14, width:"100%", padding:13, background:"rgba(10,132,255,0.15)", color:ACCENT, border:"1px solid rgba(10,132,255,0.3)", borderRadius:14, fontFamily:"inherit", fontWeight:700, fontSize:14, cursor:"pointer" }}>
            Save Technicians
          </button>
        </div>
        <div style={{ borderTop:"2px solid "+BORDER, paddingTop:20, marginBottom:4 }}>
          <div style={{ fontWeight:700, fontSize:15, color:TEXT, marginBottom:12 }}>Service Types</div>
        </div>
        {types.map(st => (
          <div key={st.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 0", borderBottom:"1px solid "+BORDER }}>
            <span style={{ width:12, height:12, borderRadius:"50%", background:st.color, flexShrink:0 }}/>
            <input
              value={st.name}
              onChange={e => updateName(st.id, e.target.value)}
              style={{ ...inputStyle, flex:1, padding:"8px 10px", fontSize:13 }}
            />
            <div style={{ display:"flex", gap:4, flexWrap:"wrap", width:140 }}>
              {PRESET_COLORS.map(c => (
                <button key={c} onClick={() => updateColor(st.id, c)}
                  style={{ width:18, height:18, borderRadius:"50%", background:c, border:"2px solid "+(st.color===c?"#0D0F14":"transparent"), cursor:"pointer", padding:0, flexShrink:0 }}/>
              ))}
            </div>
            <button onClick={() => removeType(st.id)}
              style={{ background:"rgba(255,69,58,0.12)", color:DANGER, border:"1px solid rgba(255,69,58,0.2)", borderRadius:8, padding:"6px 10px", fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"inherit", flexShrink:0 }}>
              Remove
            </button>
          </div>
        ))}
        <div style={{ marginTop:16, paddingTop:16, borderTop:"1px solid "+BORDER }}>
          <div style={{ fontSize:11, fontWeight:700, color:MUTED, textTransform:"uppercase", letterSpacing:"0.7px", marginBottom:10 }}>Add New Category</div>
          <div style={{ display:"flex", gap:8, marginBottom:10 }}>
            <input
              placeholder="Category name…"value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addType()}
              style={{ ...inputStyle, flex:1, padding:"10px" }}
            />            <button onClick={addType}
              style={{ background:ACCENT, color:"#fff", border:"none", borderRadius:10, padding:"0 16px", cursor:"pointer", fontWeight:700, fontSize:13, whiteSpace:"nowrap" }}>
              Add
            </button>
          </div>
          <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:16 }}>
            {PRESET_COLORS.map(c => (
              <button key={c} onClick={() => setNewColor(c)}
                style={{ width:28, height:28, borderRadius:"50%", background:c, border:"3px solid "+(newColor===c?"#0D0F14":"transparent"), cursor:"pointer", padding:0 }}/>
            ))}
          </div>
          <div style={{ background:newColor+"18", border:"2px solid "+newColor+"44", borderRadius:12, padding:"8px 14px", display:"flex", alignItems:"center", gap:6 }}>
            <span style={{ width:8, height:8, borderRadius:"50%", background:newColor }}/>
            <span style={{ color:newColor, fontWeight:700, fontSize:13 }}>{newName || "Preview name"}</span>
          </div>
        </div>
        <button onClick={() => onSave(types)}
          style={{ marginTop:16, width:"100%", padding:14, background:ACCENT, color:"#fff", border:"none", borderRadius:14, fontFamily:"'Barlow',sans-serif", fontWeight:800, fontSize:15, cursor:"pointer" }}>
          Save Service Types
        </button>
        {/* Job Presets section */}
        <div style={{ marginTop:28, paddingTop:20, borderTop:"2px solid "+BORDER }}>
          <div style={{ fontWeight:800, fontSize:16, color:TEXT, fontFamily:"'Barlow',sans-serif", marginBottom:4 }}>Job Presets</div>
          <div style={{ fontSize:12, color:MUTED, marginBottom:14 }}>Edit the list of common jobs shown in the job picker</div>
          <JobPresetsEditor presets={jobPresets} onSave={onSaveJobs} />
        </div>
        {/* Display PIN section */}
        <div style={{ marginTop:28, paddingTop:20, borderTop:"2px solid "+BORDER }}>
          <div style={{ fontWeight:800, fontSize:16, color:TEXT, fontFamily:"'Barlow',sans-serif", marginBottom:4 }}>Display PIN</div>
          <div style={{ fontSize:12, color:MUTED, marginBottom:14 }}>PIN for the TV/wall board read-only display login</div>
          <div style={{ background:"rgba(255,255,255,0.04)", borderRadius:12, padding:"10px 14px", marginBottom:12, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <span style={{ fontSize:13, color:TEXT2 }}>Current PIN</span>
            <span style={{ fontFamily:"monospace", fontSize:16, fontWeight:700, color:TEXT, letterSpacing:"4px" }}>{"•".repeat((displayPin||"9999").length)}</span>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <input
              type="password"
              inputMode="numeric"
              placeholder="New display PIN (4–8 digits)"
              value={newDisplayPin}
              onChange={e => { setNewDisplayPin(e.target.value.replace(/\D/g,"")); setDisplayPinErr(""); }}
              onKeyDown={e => e.key === "Enter" && saveDisplayPin()}
              style={{ ...inputStyle, flex:1, textAlign:"center", letterSpacing:"3px", fontSize:18 }}
            />
            <button onClick={saveDisplayPin} style={{ background:ACCENT, color:"#fff", border:"none", borderRadius:10, padding:"0 16px", cursor:"pointer", fontWeight:700, fontSize:13, whiteSpace:"nowrap", fontFamily:"inherit" }}>
              Save
            </button>
          </div>
          {displayPinErr && <div style={{ color:DANGER, fontSize:12, marginTop:6 }}>{displayPinErr}</div>}
          {displayPinSaved && <div style={{ color:SUCCESS, fontSize:12, marginTop:6, fontWeight:600 }}>✓ Display PIN updated</div>}
        </div>

        {/* ── Device Management (admin only) ── */}
        <DeviceManager />
      </div>
    </Sheet>
  );
}

function DeviceManagerModal({ onClose }) {
  return (
    <Sheet onClose={onClose} title="Device Access">
      <div style={{ padding:'0 4px' }}>
        <div style={{ fontSize:13, color:'rgba(255,255,255,0.4)', marginBottom:16, lineHeight:1.5 }}>
          Approve or deny devices requesting access to Worqflow. Approved devices can reach the login screen.
        </div>
        <DeviceManager autoLoad />
      </div>
    </Sheet>
  );
}

function DeviceManager({ autoLoad }) {
  const [devices, setDevices] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (autoLoad) loadDevices(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadDevices() {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'devices'));
      setDevices(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch(e) { console.error(e); }
    setLoading(false);
  }

  async function setStatus(deviceDocId, status) {
    try {
      await updateDoc(doc(db, 'devices', deviceDocId), { status });
      setDevices(prev => prev.map(d => d.id === deviceDocId ? { ...d, status } : d));
    } catch(e) { console.error(e); }
  }

  async function removeDevice(deviceDocId) {
    try {
      await deleteDoc(doc(db, 'devices', deviceDocId));
      setDevices(prev => prev.filter(d => d.id !== deviceDocId));
    } catch(e) { console.error(e); }
  }

  const statusColor = { approved: '#30D158', pending: '#FF9F0A', denied: '#FF453A' };

  return (
    <div style={{ borderTop:'1px solid rgba(255,255,255,0.06)', paddingTop:20, marginTop:4 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
        <div style={{ fontSize:13, fontWeight:700, color:'#fff', letterSpacing:'-0.01em' }}>Device Access</div>
        <button onClick={loadDevices} style={{ padding:'6px 14px', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:8, color:'rgba(255,255,255,0.6)', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
          {loading ? 'Loading…' : devices === null ? 'Load Devices' : 'Refresh'}
        </button>
      </div>
      {devices !== null && devices.length === 0 && (
        <div style={{ fontSize:12, color:'rgba(255,255,255,0.25)', textAlign:'center', padding:'12px 0' }}>No devices registered</div>
      )}
      {devices !== null && devices.map(d => (
        <div key={d.id} style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:10, padding:'10px 12px', marginBottom:8, display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:13, fontWeight:600, color:'#fff', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{d.name || 'Unknown'}</div>
            <div style={{ fontSize:10, color:'rgba(255,255,255,0.3)', marginTop:2, fontFamily:'monospace', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{d.id}</div>
            <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:4 }}>
              <span style={{ width:6, height:6, borderRadius:'50%', background:statusColor[d.status]||'#636366', display:'inline-block' }} />
              <span style={{ fontSize:11, color:statusColor[d.status]||'rgba(255,255,255,0.3)', fontWeight:600, textTransform:'capitalize' }}>{d.status}</span>
              {d.role && <span style={{ fontSize:10, color:'rgba(255,255,255,0.25)', textTransform:'capitalize' }}>· {d.role}</span>}
            </div>
          </div>
          <div style={{ display:'flex', gap:6, flexShrink:0 }}>
            {d.status !== 'approved' && (
              <button onClick={() => setStatus(d.id, 'approved')} style={{ padding:'5px 10px', background:'rgba(48,209,88,0.12)', border:'1px solid rgba(48,209,88,0.25)', borderRadius:7, color:'#30D158', fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>Approve</button>
            )}
            {d.status !== 'denied' && (
              <button onClick={() => setStatus(d.id, 'denied')} style={{ padding:'5px 10px', background:'rgba(255,69,58,0.1)', border:'1px solid rgba(255,69,58,0.2)', borderRadius:7, color:'#FF453A', fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>Deny</button>
            )}
            <button onClick={() => removeDevice(d.id)} style={{ padding:'5px 10px', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:7, color:'rgba(255,255,255,0.3)', fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>Remove</button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Time Clock Report ───────────────────────────────────────────────────────
function TimeClockReport({ state, techs, onClose }) {
  const [tab, setTab] = useState("week");
  const log = state.timeClockLog || [];
  const now = Date.now();
  const DAY = 86400000;
  function getRange(t) {
    const d = new Date();
    if (t === "today") {
      d.setHours(0,0,0,0);
      return d.getTime();
    }    if (t === "week") {
      const day = d.getDay();
      d.setDate(d.getDate() - day);
      d.setHours(0,0,0,0);
      return d.getTime();
    }
    d.setDate(1); d.setHours(0,0,0,0);
    return d.getTime();
  }
  const rangeStart = getRange(tab);
  function techSessions(techId) {
    const entries = log.filter(e => e.userId === techId && e.clockIn >= rangeStart);
    const sessions = [];
    // pair clockIn with clockOut
    const ins  = entries.filter(e => e.type === "in").sort((a,b) => a.clockIn - b.clockIn);
    const outs = entries.filter(e => e.type === "out").sort((a,b) => a.clockIn - b.clockIn);
    ins.forEach((entry, i) => {
      const out = outs.find(o => o.clockIn >= entry.clockIn && (!sessions[i-1] || o.clockIn > sessions[i-1]?.outTime));
      sessions.push({ inTime: entry.clockIn, outTime: out ? out.clockIn : null });
    });
    return sessions;
  }
  function totalMs(sessions) {
    return sessions.reduce((s, sess) => {
      if (!sess.outTime) return s + (now - sess.inTime);
      return s + (sess.outTime - sess.inTime);
    }, 0);
  }
  function fmtHrMin(ms) {
    const totalMins = Math.floor(ms / 60000);
    const h = Math.floor(totalMins / 60);
    const m = totalMins % 60;
    return h + "h " + String(m).padStart(2,"0") + "m";
  }
  function fmtDateTime(ts) {
    return new Date(ts).toLocaleString([], { month:"short", day:"numeric", hour:"2-digit", minute:"2-digit" });
  }
  function fmtTime12(ts) {
    return new Date(ts).toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" });
  }  function fmtDate(ts) {
    return new Date(ts).toLocaleDateString([], { weekday:"short", month:"short", day:"numeric" });
  }
  const TABS = [
    { id:"today", label:"Today" },
    { id:"week",  label:"This Week" },
    { id:"month", label:"This Month" },
  ];
  return (
    <div style={{ position:"fixed", inset:0, background:"radial-gradient(ellipse at 50% 0%, #060D1F 0%, #000000 60%)", zIndex:1500, display:"flex", flexDirection:"column" }}>
      {/* Header */}
      <div style={{ background:"rgba(10,14,24,0.95)", backdropFilter:"blur(40px)", WebkitBackdropFilter:"blur(40px)", borderBottom:"0.5px solid rgba(255,255,255,0.08)", padding:"12px 20px", display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
        <div>
          <div style={{ fontFamily:"-apple-system,BlinkMacSystemFont,'SF Pro Display',sans-serif", fontWeight:700, fontSize:20, color:TEXT, letterSpacing:"-0.4px" }}>Time Clock</div>
          <div style={{ fontSize:11, color:TEXT3, marginTop:1 }}>Staff hours log</div>
        </div>
        <button onClick={onClose} style={{ background:"rgba(255,255,255,0.07)", border:"0.5px solid rgba(255,255,255,0.1)", borderRadius:10, width:34, height:34, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", color:TEXT2 }}>
          <XIcon />
        </button>
      </div>
      {/* Tabs */}
      <div style={{ padding:"12px 20px 0", flexShrink:0 }}>
        <div style={{ display:"flex", background:"rgba(255,255,255,0.05)", borderRadius:12, padding:3, gap:3 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ flex:1, padding:"9px 0", borderRadius:9, border:"none", background:tab===t.id?"rgba(255,255,255,0.1)":"transparent", color:tab===t.id?TEXT:TEXT3, fontWeight:tab===t.id?600:400, fontSize:12, cursor:"pointer", fontFamily:"inherit" }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>
      {/* Content */}
      <div style={{ flex:1, overflowY:"auto", WebkitOverflowScrolling:"touch", padding:"16px 20px 40px" }}>
        {techs.map(tech => {
          const sessions = techSessions(tech.id);
          const total    = totalMs(sessions);
          const isClockedIn = sessions.some(s => !s.outTime);
          return (
            <div key={tech.id} style={{ background:"rgba(255,255,255,0.04)", borderRadius:16, padding:16, marginBottom:14, border:"0.5px solid rgba(255,255,255,0.07)", borderTop:"0.5px solid rgba(255,255,255,0.11)" }}>
              {/* Tech header */}
              <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:sessions.length>0?14:0 }}>                <div style={{ width:40, height:40, borderRadius:"50%", background:"linear-gradient(145deg,#1C3A6E,#0A2040)", color:TEXT2, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:600, fontSize:14, border:"1.5px solid rgba(10,132,255,0.4)", flexShrink:0 }}>
                  {initials(tech.name)}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:600, fontSize:15, color:TEXT, letterSpacing:"-0.2px" }}>{tech.name}</div>
                  <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:2 }}>
                    {isClockedIn ? (
                      <span style={{ display:"flex", alignItems:"center", gap:4, fontSize:11, color:SUCCESS }}>
                        <span style={{ width:6, height:6, borderRadius:"50%", background:SUCCESS, animation:"pulse 1.5s ease-in-out infinite", display:"inline-block" }}/>
                        Clocked in
                      </span>
                    ) : (
                      <span style={{ fontSize:11, color:TEXT3 }}>Not clocked in</span>
                    )}
                  </div>
                </div>
                <div style={{ textAlign:"right" }}>
                  <div style={{ fontSize:20, fontWeight:700, color:total>0?SUCCESS:TEXT3, fontFamily:"-apple-system,sans-serif", letterSpacing:"-0.3px" }}>{total > 0 ? fmtHrMin(total) : "—"}</div>
                  <div style={{ fontSize:10, color:TEXT3, marginTop:1 }}>Total hrs</div>
                </div>
              </div>
              {/* Sessions list */}
              {sessions.length > 0 && (
                <div style={{ borderTop:"0.5px solid rgba(255,255,255,0.07)", paddingTop:12 }}>
                  <div style={{ fontSize:10, fontWeight:600, color:TEXT3, textTransform:"uppercase", letterSpacing:"0.6px", marginBottom:10 }}>Sessions</div>
                  {sessions.map((sess, i) => {
                    const dur = sess.outTime ? sess.outTime - sess.inTime : now - sess.inTime;
                    return (
                      <div key={i} style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, padding:"8px 0", borderBottom:"0.5px solid rgba(255,255,255,0.05)" }}>
                        <div>
                          <div style={{ fontSize:9, color:TEXT3, textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:2 }}>Clock In</div>
                          <div style={{ fontSize:12, color:SUCCESS, fontWeight:600 }}>{fmtTime12(sess.inTime)}</div>
                          <div style={{ fontSize:10, color:TEXT3 }}>{fmtDate(sess.inTime)}</div>
                        </div>
                        <div>
                          <div style={{ fontSize:9, color:TEXT3, textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:2 }}>Clock Out</div>
                          {sess.outTime ? (
                            <>
                              <div style={{ fontSize:12, color:DANGER, fontWeight:600 }}>{fmtTime12(sess.outTime)}</div>
                              <div style={{ fontSize:10, color:TEXT3 }}>{fmtDate(sess.outTime)}</div>
                            </>
                          ) : (
                            <div style={{ fontSize:12, color:WARN, fontWeight:600, display:"flex", alignItems:"center", gap:4 }}>
                              <span style={{ width:5, height:5, borderRadius:"50%", background:WARN, display:"inline-block", animation:"pulse 1.5s ease-in-out infinite" }}/>
                              Active
                            </div>                          )}
                        </div>
                        <div>
                          <div style={{ fontSize:9, color:TEXT3, textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:2 }}>Duration</div>
                          <div style={{ fontSize:12, color:ACCENT, fontWeight:600 }}>{fmtHrMin(dur)}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {sessions.length === 0 && (
                <div style={{ fontSize:12, color:TEXT3, textAlign:"center", padding:"8px 0" }}>No clock-ins this period</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
// ─── Activity Tracker ────────────────────────────────────────────────────────
const ACTIVITIES = [
  { id:"moving",    label:"Moving Cars", emoji:"🚗", color:"#FF9F0A" },
  { id:"parts_run", label:"Parts Run",   emoji:"🔩", color:"#BF5AF2" },
];
function ActivityTracker({ currentUser, activityLog, onStart, onStop, onClose }) {
  // Find any active session for this user
  const active = activityLog.find(e => e.userId === currentUser.id && !e.endTime);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  // Today's logs for this user
  const todayStart = new Date();
  todayStart.setHours(0,0,0,0);
  const todayLogs = activityLog.filter(e =>
    e.userId === currentUser.id && e.endTime && e.startTime >= todayStart.getTime()
  );
  // Total time per activity today  const totals = {};
  ACTIVITIES.forEach(a => { totals[a.id] = 0; });
  todayLogs.forEach(e => {
    if (totals[e.activityId] !== undefined) {
      totals[e.activityId] += (e.endTime - e.startTime);
    }
  });
  const activeElapsed = active ? Math.floor((now - active.startTime) / 1000) : 0;
  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", zIndex:3000, display:"flex", alignItems:"flex-end", justifyContent:"center" }}>
      <div style={{ background:SHEET_BG, borderRadius:"22px 22px 0 0", width:"100%", maxWidth:500, padding:"0 0 40px", boxShadow:"0 -2px 0 rgba(255,255,255,0.08), 0 -20px 60px rgba(0,0,0,0.8)", animation:"slide-up 0.32s cubic-bezier(0.32,0.72,0,1)", borderTop:"0.5px solid rgba(255,255,255,0.12)" }}>
        <div style={{ width:36, height:5, background:"rgba(255,255,255,0.2)", borderRadius:3, margin:"12px auto 0" }}/>
        {/* Header */}
        <div style={{ padding:"14px 20px 12px", borderBottom:"0.5px solid rgba(255,255,255,0.08)", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div>
            <div style={{ fontFamily:"-apple-system,BlinkMacSystemFont,'SF Pro Display',sans-serif", fontWeight:700, fontSize:17, color:TEXT }}>Activity Tracker</div>
            <div style={{ fontSize:11, color:TEXT3, marginTop:1 }}>Track non-billable time</div>
          </div>
          <button onClick={onClose} style={{ background:"rgba(255,255,255,0.07)", border:"0.5px solid rgba(255,255,255,0.1)", borderRadius:10, width:32, height:32, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", color:TEXT2 }}>
            <XIcon />
          </button>
        </div>
        <div style={{ padding:"20px 20px 0" }}>
          {/* Activity buttons */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:24 }}>
            {ACTIVITIES.map(act => {
              const isActive = active && active.activityId === act.id;
              const todayMs  = totals[act.id] + (isActive ? activeElapsed * 1000 : 0);
              const todaySecs = Math.floor(todayMs / 1000);
              return (
                <button key={act.id}
                  onClick={() => isActive ? onStop(active) : (active ? null : onStart(act.id, currentUser.id))}
                  style={{ background:isActive ? act.color+"22" : "rgba(255,255,255,0.05)", border:"0.5px solid "+(isActive ? act.color : "rgba(255,255,255,0.1)"), borderTop:"0.5px solid "+(isActive ? act.color+"88" : "rgba(255,255,255,0.14)"), borderRadius:16, padding:"18px 14px", cursor: active && !isActive ? "not-allowed" : "pointer", opacity: active && !isActive ? 0.4 : 1, textAlign:"left", boxShadow: isActive ? "0 4px 20px "+act.color+"33" : "0 2px 12px rgba(0,0,0,0.3)" }}>
                  <div style={{ fontSize:28, marginBottom:8 }}>{act.emoji}</div>
                  <div style={{ fontWeight:600, fontSize:14, color:TEXT, marginBottom:4 }}>{act.label}</div>
                  {isActive ? (
                    <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                      <span style={{ width:6, height:6, borderRadius:"50%", background:act.color, display:"inline-block", animation:"pulse 1.5s ease-in-out infinite" }}/>
                      <span style={{ fontSize:16, fontWeight:700, color:act.color, fontFamily:"-apple-system,sans-serif" }}>{fmtTime(activeElapsed)}</span>
                    </div>
                  ) : (                    <div style={{ fontSize:11, color:TEXT3 }}>Today: {fmtTime(todaySecs)}</div>
                  )}
                  <div style={{ marginTop:8, fontSize:11, fontWeight:600, color:isActive ? act.color : TEXT3 }}>
                    {isActive ? "Tap to stop ■" : "Tap to start ▶"}
                  </div>
                </button>
              );
            })}
          </div>
          {/* Today's log */}
          {todayLogs.length > 0 && (
            <div>
              <div style={{ fontSize:10, fontWeight:600, color:TEXT3, textTransform:"uppercase", letterSpacing:"0.8px", marginBottom:10 }}>Today's Log</div>
              <div style={{ maxHeight:180, overflowY:"auto", WebkitOverflowScrolling:"touch" }}>
                {[...todayLogs].reverse().map((e, i) => {
                  const act = ACTIVITIES.find(a => a.id === e.activityId);
                  const secs = Math.floor((e.endTime - e.startTime) / 1000);
                  const startStr = new Date(e.startTime).toLocaleTimeString([], {hour:"2-digit", minute:"2-digit"});
                  return (
                    <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 0", borderBottom:"0.5px solid rgba(255,255,255,0.06)" }}>
                      <span style={{ fontSize:16 }}>{act?.emoji}</span>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:12, color:TEXT2, fontWeight:500 }}>{act?.label}</div>
                        <div style={{ fontSize:10, color:TEXT3, marginTop:1 }}>{startStr}</div>
                      </div>
                      <div style={{ fontSize:13, fontWeight:600, color:act?.color }}>{fmtTime(secs)}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {todayLogs.length === 0 && !active && (
            <div style={{ textAlign:"center", color:TEXT3, fontSize:12, padding:"10px 0" }}>
              No activity logged yet today
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
// ─── Activity Report ─────────────────────────────────────────────────────────
function ActivityReport({ activityLog, techs, onClose }) {
  const [tab, setTab] = useState('week');
  const TABS = [['today','Today'],['week','This Week'],['month','This Month'],['year','This Year']];

  function getRangeStart(t) {
    const d = new Date();
    if (t === 'today')  { d.setHours(0,0,0,0); return d.getTime(); }
    if (t === 'week')   { d.setDate(d.getDate() - d.getDay()); d.setHours(0,0,0,0); return d.getTime(); }
    if (t === 'month')  { d.setDate(1); d.setHours(0,0,0,0); return d.getTime(); }
    if (t === 'year')   { d.setMonth(0,1); d.setHours(0,0,0,0); return d.getTime(); }
    return 0;
  }

  function fmtDur(ms) {
    if (!ms) return '—';
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  }

  const rangeStart = getRangeStart(tab);
  const logs = activityLog.filter(e => e.endTime && e.startTime >= rangeStart);

  // Per tech, per activity totals
  const techTotals = techs.map(tech => {
    const techLogs = logs.filter(e => e.userId === tech.id);
    const byActivity = {};
    ACTIVITIES.forEach(a => { byActivity[a.id] = 0; });
    techLogs.forEach(e => {
      if (byActivity[e.activityId] !== undefined) byActivity[e.activityId] += (e.endTime - e.startTime);
    });
    const total = Object.values(byActivity).reduce((s, v) => s + v, 0);
    return { tech, byActivity, total };
  }).filter(r => r.total > 0);

  // Grand totals per activity
  const grandTotals = {};
  ACTIVITIES.forEach(a => { grandTotals[a.id] = 0; });
  techTotals.forEach(r => { ACTIVITIES.forEach(a => { grandTotals[a.id] += r.byActivity[a.id]; }); });
  const grandTotal = Object.values(grandTotals).reduce((s, v) => s + v, 0);

  const tabLabel = TABS.find(t => t[0] === tab)?.[1] || tab;

  function handlePrint() {
    const rows = techTotals.map(r =>
      `<tr><td>${r.tech.name}</td>${ACTIVITIES.map(a => `<td>${fmtDur(r.byActivity[a.id])}</td>`).join('')}<td><b>${fmtDur(r.total)}</b></td></tr>`
    ).join('');
    const totalsRow = `<tr style="font-weight:700;border-top:2px solid #ccc"><td>TOTAL</td>${ACTIVITIES.map(a => `<td>${fmtDur(grandTotals[a.id])}</td>`).join('')}<td>${fmtDur(grandTotal)}</td></tr>`;
    const html = `<html><head><title>Activity Report — ${tabLabel}</title><style>
      body{font-family:-apple-system,sans-serif;padding:24px;color:#111}
      h2{margin-bottom:4px}p{margin:0 0 16px;color:#666;font-size:13px}
      table{border-collapse:collapse;width:100%}
      th,td{border:1px solid #ddd;padding:8px 12px;text-align:left;font-size:13px}
      th{background:#f5f5f5;font-weight:700}tr:nth-child(even){background:#fafafa}
    </style></head><body>
      <h2>Activity Report — ${tabLabel}</h2>
      <p>Generated ${new Date().toLocaleString()}</p>
      <table><thead><tr><th>Technician</th>${ACTIVITIES.map(a => `<th>${a.emoji} ${a.label}</th>`).join('')}<th>Total</th></tr></thead>
      <tbody>${rows}${totalsRow}</tbody></table>
    </body></html>`;
    const w = window.open('','_blank');
    w.document.write(html);
    w.document.close();
    w.print();
  }

  return (
    <Sheet onClose={onClose} title="Activity Report">
      <div style={{ display:'flex', gap:6, marginBottom:16, flexWrap:'wrap' }}>
        {TABS.map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            style={{ padding:'6px 14px', borderRadius:20, border:'none', background:tab===id?ACCENT:'rgba(255,255,255,0.07)', color:tab===id?'#fff':TEXT3, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
            {label}
          </button>
        ))}
        <button onClick={handlePrint}
          style={{ marginLeft:'auto', padding:'6px 14px', borderRadius:20, border:'1px solid rgba(255,255,255,0.12)', background:'rgba(255,255,255,0.06)', color:TEXT2, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', gap:6 }}>
          🖨 Print
        </button>
      </div>

      {techTotals.length === 0 ? (
        <div style={{ textAlign:'center', color:TEXT3, fontSize:13, padding:'32px 0' }}>No activity logged {tabLabel.toLowerCase()}</div>
      ) : (
        <>
          {/* Grand total summary */}
          <div style={{ display:'flex', gap:8, marginBottom:16 }}>
            {ACTIVITIES.map(a => (
              <div key={a.id} style={{ flex:1, background:'rgba(255,255,255,0.04)', borderRadius:10, padding:'10px 12px', border:'0.5px solid rgba(255,255,255,0.08)' }}>
                <div style={{ fontSize:11, color:a.color, fontWeight:700, marginBottom:4 }}>{a.emoji} {a.label}</div>
                <div style={{ fontSize:18, fontWeight:800, color:'#fff', letterSpacing:'-0.3px' }}>{fmtDur(grandTotals[a.id])}</div>
              </div>
            ))}
            <div style={{ flex:1, background:'rgba(255,255,255,0.06)', borderRadius:10, padding:'10px 12px', border:'0.5px solid rgba(255,255,255,0.12)' }}>
              <div style={{ fontSize:11, color:TEXT3, fontWeight:700, marginBottom:4 }}>Total Time</div>
              <div style={{ fontSize:18, fontWeight:800, color:WARN, letterSpacing:'-0.3px' }}>{fmtDur(grandTotal)}</div>
            </div>
          </div>

          {/* Per tech breakdown */}
          {techTotals.map(({ tech, byActivity, total }) => (
            <div key={tech.id} style={{ background:'rgba(255,255,255,0.03)', border:'0.5px solid rgba(255,255,255,0.08)', borderRadius:12, padding:'12px 14px', marginBottom:8 }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <div style={{ width:28, height:28, borderRadius:'50%', background:'linear-gradient(135deg,#1D6BF3,#0EA5E9)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:10 }}>{initials(tech.name)}</div>
                  <div style={{ fontWeight:600, fontSize:13, color:TEXT }}>{tech.name}</div>
                </div>
                <div style={{ fontSize:13, fontWeight:700, color:WARN }}>{fmtDur(total)}</div>
              </div>
              <div style={{ display:'flex', gap:6 }}>
                {ACTIVITIES.map(a => (
                  <div key={a.id} style={{ flex:1, background:a.color+'11', borderRadius:8, padding:'6px 8px', border:'0.5px solid '+a.color+'33' }}>
                    <div style={{ fontSize:9, color:a.color, fontWeight:700, marginBottom:2 }}>{a.emoji} {a.label}</div>
                    <div style={{ fontSize:14, fontWeight:700, color:'#fff' }}>{fmtDur(byActivity[a.id])}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </>
      )}
    </Sheet>
  );
}

// ─── Analytics Screen ────────────────────────────────────────────────────────
function AnalyticsScreen({ state, onClose }) {  const [timeTab,  setTimeTab]  = useState("today");
  const [mainTab,  setMainTab]  = useState("overview");
  const [laborRate, setLaborRate] = useState(
    parseFloat(localStorage.getItem("sft-labor-rate")||"125")
  );
  const [editingRate, setEditingRate] = useState(false);
  const [rateInput,   setRateInput]   = useState(String(laborRate));
  const ros      = state.ros || [];
  const archived = state.archived || [];
  const techs    = state.techs || [];
  const timers   = state.timers || {};
  // ── helpers ──────────────────────────────────────────────────────────────
  function parseHrs(h) { return parseFloat(String(h||"0").replace(/[^0-9.]/g,""))||0; }
  function allIdsForTech(techId) {
    return (COLS.map(c => (state.grid[techId]||{})[c.id]||[])).flat();
  }
  function getRO(id) { return ros.find(r => r.id === id); }
  // ── shop-wide numbers ─────────────────────────────────────────────────────
  const allGridIds = Object.values(state.grid||{}).flatMap(cols => Object.values(cols).flat());
  const stagingIds = Object.values(state.qSlots||{}).flat();
  const partsIds   = state.partsSlots || [];
  const totalROs   = allGridIds.length + stagingIds.length + partsIds.length;
  const totalHrs   = allGridIds.reduce((s,id) => { const r=getRO(id); return s+parseHrs(r?.hours); }, 0);
  const estimatedRevenue = totalHrs * laborRate;
  const byCol = {};
  COLS.forEach(c => {
    byCol[c.id] = Object.values(state.grid||{}).flatMap(cols => cols[c.id]||[]).length;
  });
  byCol.waiting = partsIds.length;
  byCol.staging = stagingIds.length;
  const byType = {};
  (state.serviceTypes||[]).forEach(st => {
    byType[st.id] = { name:st.name, color:st.color, count:0, hrs:0 };
  });
  ros.forEach(ro => {
    if (ro.serviceType && byType[ro.serviceType]) {
      byType[ro.serviceType].count++;
      byType[ro.serviceType].hrs += parseHrs(ro.hours);
    }  });
  // ── tech numbers ──────────────────────────────────────────────────────────
  const techData = techs.map(tech => {
    const ids      = allIdsForTech(tech.id);
    const hrs      = ids.reduce((s,id) => s+parseHrs(getRO(id)?.hours), 0);
    const jobs     = ids.reduce((s,id) => s+(getRO(id)?.jobs?.split(",").filter(Boolean).length||0), 0);
    const elapsed  = ids.reduce((s,id) => s+(timers[id]?.elapsed||0), 0);
    const completed = ((state.grid[tech.id]||{}).completed||[]).length;
    const delivered = ((state.grid[tech.id]||{}).delivered||[]).length;
    const avgHrsPerRO = ids.length > 0 ? (hrs/ids.length) : 0;
    const utilization = GOAL_HOURS > 0 ? Math.min((hrs/GOAL_HOURS)*100,100) : 0;
    // Job type breakdown
    const jobTypes = {};
    ids.forEach(id => {
      const r = getRO(id);
      if (!r?.jobs) return;
      r.jobs.split(",").map(j=>j.trim()).filter(Boolean).forEach(j => {
        const ab = abbrevJob(j);
        jobTypes[ab.label] = (jobTypes[ab.label]||0) + 1;
      });
    });
    return { ...tech, ids, hrs, jobs, elapsed, completed, delivered, avgHrsPerRO, utilization, jobTypes, total:ids.length };
  });
  const maxHrs = Math.max(...techData.map(t=>t.hrs), 1);
  // ── component helpers ─────────────────────────────────────────────────────
  function StatCard({ label, value, sub, color, full }) {
    return (
      <div style={{ background:"rgba(255,255,255,0.05)", borderRadius:14, padding:"14px 16px", border:"0.5px solid rgba(255,255,255,0.08)", borderTop:"0.5px solid rgba(255,255,255,0.12)", boxShadow:"0 4px 16px rgba(0,0,0,0.3)", gridColumn:full?"span 2":"auto" }}>
        <div style={{ fontSize:10, fontWeight:600, color:TEXT3, textTransform:"uppercase", letterSpacing:"0.6px", marginBottom:8 }}>{label}</div>
        <div style={{ fontSize:26, fontWeight:700, color:color||TEXT, fontFamily:"-apple-system,BlinkMacSystemFont,'SF Pro Display',sans-serif", letterSpacing:"-0.5px", lineHeight:1 }}>{value}</div>
        {sub && <div style={{ fontSize:11, color:TEXT3, marginTop:6 }}>{sub}</div>}
      </div>
    );
  }
  function BarRow({ label, value, displayVal, max, color }) {
    return (
      <div style={{ marginBottom:14 }}>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
          <span style={{ fontSize:12, color:TEXT2, fontWeight:500 }}>{label}</span>
          <span style={{ fontSize:12, color:color||ACCENT, fontWeight:600 }}>{displayVal||value}</span>
        </div>        <div style={{ height:6, background:"rgba(255,255,255,0.08)", borderRadius:3, overflow:"hidden" }}>
          <div style={{ width:max>0?Math.min((value/max)*100,100)+"%":"0%", height:"100%", background:color||ACCENT, borderRadius:3 }}/>
        </div>
      </div>
    );
  }
  function SectionTitle({ title }) {
    return (
      <div style={{ fontSize:11, fontWeight:600, color:TEXT3, textTransform:"uppercase", letterSpacing:"0.8px", marginBottom:14, display:"flex", alignItems:"center", gap:8 }}>
        <div style={{ flex:1, height:"0.5px", background:"rgba(255,255,255,0.06)" }}/>
        {title}
        <div style={{ flex:1, height:"0.5px", background:"rgba(255,255,255,0.06)" }}/>
      </div>
    );
  }
  function Section({ children }) {
    return (
      <div style={{ background:"rgba(255,255,255,0.04)", borderRadius:16, padding:16, marginBottom:14, border:"0.5px solid rgba(255,255,255,0.07)", borderTop:"0.5px solid rgba(255,255,255,0.11)" }}>
        {children}
      </div>
    );
  }
  // ── TAB CONTENT ───────────────────────────────────────────────────────────
  function OverviewTab() {
    return (
      <div>
        <SectionTitle title="Key Metrics" />
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:16 }}>
          <StatCard label="Total Active ROs"   value={totalROs}              sub="Across all areas"      color={ACCENT}   />
          <StatCard label="Flagged Hours"       value={totalHrs.toFixed(1)+"h"} sub={"of "+GOAL_HOURS+"h goal"} color={SUCCESS} />
          <StatCard label="Est. Revenue"        value={"$"+estimatedRevenue.toLocaleString("en-US",{maximumFractionDigits:0})} sub={"@ $"+laborRate+"/hr"} color="#FF9F0A" />
          <StatCard label="Avg Hrs / RO"        value={totalROs>0?(totalHrs/totalROs).toFixed(1)+"h":"—"} sub="Per active ticket"  color="#BF5AF2" />
        </div>
        <SectionTitle title="Non-Billable Time Today" />
        <Section>
          {(() => {
            const todayStart = new Date();
            todayStart.setHours(0,0,0,0);
            const logs = (state.activityLog||[]).filter(e => e.endTime && e.startTime >= todayStart.getTime());
            const grandTotal = logs.reduce((s,e) => s + (e.endTime - e.startTime), 0);
            return (              <div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:14 }}>
                  {ACTIVITIES.map(act => {
                    const ms = logs.filter(e => e.activityId === act.id).reduce((s,e) => s + (e.endTime - e.startTime), 0);
                    const secs = Math.floor(ms / 1000);
                    return (
                      <div key={act.id} style={{ background:"rgba(255,255,255,0.05)", borderRadius:12, padding:"12px 14px", border:"0.5px solid rgba(255,255,255,0.08)" }}>
                        <div style={{ fontSize:20, marginBottom:6 }}>{act.emoji}</div>
                        <div style={{ fontSize:11, color:TEXT3, marginBottom:4 }}>{act.label}</div>
                        <div style={{ fontSize:20, fontWeight:700, color:act.color, fontFamily:"-apple-system,sans-serif" }}>{fmtTime(secs)}</div>
                      </div>
                    );
                  })}
                </div>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 0", borderTop:"0.5px solid rgba(255,255,255,0.08)" }}>
                  <span style={{ fontSize:13, color:TEXT2, fontWeight:600 }}>Total non-billable today</span>
                  <span style={{ fontSize:16, fontWeight:700, color:DANGER, fontFamily:"-apple-system,sans-serif" }}>{fmtTime(Math.floor(grandTotal/1000))}</span>
                </div>
                {/* Per tech breakdown */}
                {techs.map(tech => {
                  const techLogs = logs.filter(e => e.userId === tech.id);
                  if (techLogs.length === 0) return null;
                  const techMs = techLogs.reduce((s,e) => s+(e.endTime-e.startTime), 0);
                  return (
                    <div key={tech.id} style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 0", borderTop:"0.5px solid rgba(255,255,255,0.06)" }}>
                      <div style={{ width:28, height:28, borderRadius:"50%", background:"linear-gradient(145deg,#1C3A6E,#0A2040)", color:TEXT2, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:600, fontSize:11, border:"1px solid rgba(10,132,255,0.3)", flexShrink:0 }}>
                        {initials(tech.name)}
                      </div>
                      <span style={{ flex:1, fontSize:12, color:TEXT2 }}>{tech.name}</span>
                      {ACTIVITIES.map(act => {
                        const ms = techLogs.filter(e=>e.activityId===act.id).reduce((s,e)=>s+(e.endTime-e.startTime),0);
                        if (ms === 0) return null;
                        return <span key={act.id} style={{ fontSize:11, color:act.color }}>{act.emoji} {fmtTime(Math.floor(ms/1000))}</span>;
                      })}
                      <span style={{ fontSize:12, fontWeight:600, color:DANGER }}>{fmtTime(Math.floor(techMs/1000))}</span>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </Section>
        <SectionTitle title="Labor Rate" />
        <Section>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:editingRate?14:0 }}>
            <div>              <div style={{ fontSize:12, color:TEXT2, fontWeight:500, marginBottom:2 }}>Shop Labor Rate</div>
              <div style={{ fontSize:24, fontWeight:700, color:"#FF9F0A", fontFamily:"-apple-system,sans-serif" }}>${laborRate}<span style={{ fontSize:13, color:TEXT3, fontWeight:400 }}>/hr</span></div>
            </div>
            <button onClick={()=>{setEditingRate(e=>!e);setRateInput(String(laborRate));}}
              style={{ background:"rgba(255,255,255,0.07)", color:TEXT2, border:"0.5px solid rgba(255,255,255,0.1)", borderRadius:10, padding:"8px 14px", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
              {editingRate?"Cancel":"Edit"}
            </button>
          </div>
          {editingRate && (
            <div style={{ display:"flex", gap:8 }}>
              <input type="number" value={rateInput} onChange={e=>setRateInput(e.target.value)}
                style={{ ...inputStyle, flex:1, padding:"10px 12px", fontSize:16, fontWeight:700 }} placeholder="e.g. 125"/>
              <button onClick={()=>{
                const r=parseFloat(rateInput)||125;
                setLaborRate(r);
                localStorage.setItem("sft-labor-rate",String(r));
                setEditingRate(false);
              }} style={{ background:ACCENT, color:"#fff", border:"none", borderRadius:12, padding:"0 18px", cursor:"pointer", fontWeight:600, fontSize:14, fontFamily:"inherit" }}>
                Save
              </button>
            </div>
          )}
        </Section>
        <SectionTitle title="ROs by Status" />
        <Section>
          {[
            ["On Deck",         byCol.ondeck,     "#0A84FF"],
            ["In Progress",     byCol.inprogress, "#FF9F0A"],
            ["Completed / QC",  byCol.completed,  "#30D158"],
            ["Delivered",       byCol.delivered,  "#636366"],
            ["Waiting on Parts",byCol.waiting,    "#BF5AF2"],
            ["Staging Queue",   byCol.staging,    "#EF4444"],
          ].map(([label,val,color])=>(
            <BarRow key={label} label={label} value={val} max={totalROs||1} color={color}/>
          ))}
        </Section>
        <SectionTitle title="ROs by Service Type" />
        <Section>
          {Object.values(byType).map(st=>(
            <div key={st.name} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
              <span style={{ width:8, height:8, borderRadius:"50%", background:st.color, flexShrink:0 }}/>
              <div style={{ flex:1 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                  <span style={{ fontSize:12, color:TEXT2 }}>{st.name}</span>
                  <span style={{ fontSize:12, color:st.color, fontWeight:600 }}>{st.count} ROs · {st.hrs.toFixed(1)}h</span>                </div>
                <div style={{ height:5, background:"rgba(255,255,255,0.08)", borderRadius:3, overflow:"hidden" }}>
                  <div style={{ width:totalROs>0?Math.min((st.count/totalROs)*100,100)+"%":"0%", height:"100%", background:st.color, borderRadius:3 }}/>
                </div>
              </div>
            </div>
          ))}
        </Section>
      </div>
    );
  }
  function TechTab() {
    return (
      <div>
        {techData.map(tech=>(
          <div key={tech.id} style={{ background:"rgba(255,255,255,0.04)", borderRadius:16, padding:16, marginBottom:14, border:"0.5px solid rgba(255,255,255,0.07)", borderTop:"0.5px solid rgba(255,255,255,0.11)" }}>
            {/* Header */}
            <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:16 }}>
              <div style={{ width:44, height:44, borderRadius:"50%", background:"linear-gradient(145deg,#1C3A6E,#0A2040)", color:TEXT2, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:600, fontSize:15, border:"1.5px solid rgba(10,132,255,0.4)", flexShrink:0 }}>
                {initials(tech.name)}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:600, fontSize:16, color:TEXT, letterSpacing:"-0.2px" }}>{tech.name}</div>
                <div style={{ fontSize:11, color:TEXT3, marginTop:2 }}>{tech.total} active RO{tech.total!==1?"s":""} · {tech.jobs} jobs</div>
              </div>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontSize:24, fontWeight:700, color:SUCCESS, fontFamily:"-apple-system,sans-serif", letterSpacing:"-0.4px" }}>{tech.hrs.toFixed(1)}h</div>
                <div style={{ fontSize:10, color:TEXT3 }}>flagged</div>
              </div>
            </div>
            {/* 4 stat boxes */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:8, marginBottom:14 }}>
              {[
                ["Completed",   tech.completed,                    "#30D158"],
                ["Delivered",   tech.delivered,                    "#636366"],
                ["Avg Hrs/RO",  tech.avgHrsPerRO.toFixed(1)+"h",  "#FF9F0A"],
                ["Est Rev",     "$"+(tech.hrs*laborRate).toLocaleString("en-US",{maximumFractionDigits:0}), "#BF5AF2"],
              ].map(([label,val,color])=>(
                <div key={label} style={{ background:"rgba(255,255,255,0.05)", borderRadius:10, padding:"10px 6px", textAlign:"center" }}>
                  <div style={{ fontSize:15, fontWeight:700, color, fontFamily:"-apple-system,sans-serif" }}>{val}</div>
                  <div style={{ fontSize:9, color:TEXT3, marginTop:3 }}>{label}</div>
                </div>
              ))}
            </div>            {/* Utilization bar */}
            <BarRow label="Utilization" value={tech.hrs} displayVal={tech.utilization.toFixed(0)+"%"} max={GOAL_HOURS} color={tech.utilization>=80?SUCCESS:tech.utilization>=50?"#FF9F0A":DANGER}/>
            {/* Flagged hours bar vs max */}
            <BarRow label="Flagged Hours" value={tech.hrs} displayVal={tech.hrs.toFixed(1)+"h"} max={maxHrs} color={SUCCESS}/>
            {/* Timer */}
            {tech.elapsed > 0 && (
              <div style={{ fontSize:11, color:TEXT3, display:"flex", alignItems:"center", gap:4, marginTop:8 }}>
                <span style={{ width:5, height:5, borderRadius:"50%", background:WARN, display:"inline-block" }}/>
                Time logged on timer: {fmtTime(tech.elapsed)}
              </div>
            )}
            {/* Job type breakdown */}
            {Object.keys(tech.jobTypes).length > 0 && (
              <div style={{ marginTop:14 }}>
                <div style={{ fontSize:10, color:TEXT3, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.6px", marginBottom:8 }}>Job Type Breakdown</div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                  {Object.entries(tech.jobTypes).sort((a,b)=>b[1]-a[1]).map(([label,count])=>{
                    const ab = abbrevJob(label);
                    return (
                      <span key={label} style={{ background:ab.bg, color:ab.color, fontSize:10, fontWeight:600, padding:"3px 9px", borderRadius:20 }}>
                        {label} ×{count}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }
  function EfficiencyTab() {
    return (
      <div>
        <SectionTitle title="Bottleneck Analysis" />
        <Section>
          <div style={{ fontSize:12, color:TEXT2, fontWeight:600, marginBottom:4 }}>Average Time in Column</div>
          <div style={{ fontSize:11, color:TEXT3, marginBottom:14 }}>Requires Firebase timestamps — available after deployment</div>
          {[
            ["On Deck → In Progress",  "Pickup time",   "—", "#0A84FF"],
            ["In Progress → Completed","Work time",     "—", "#FF9F0A"],
            ["Completed → Delivered",  "Delivery delay","—", "#30D158"],            ["Parts wait time",        "Avg wait",      "—", "#BF5AF2"],
          ].map(([label,sub,val,color])=>(
            <div key={label} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 0", borderBottom:"0.5px solid rgba(255,255,255,0.06)" }}>
              <div>
                <div style={{ fontSize:13, color:TEXT2, fontWeight:500 }}>{label}</div>
                <div style={{ fontSize:10, color:TEXT3, marginTop:2 }}>{sub}</div>
              </div>
              <div style={{ fontSize:16, fontWeight:700, color, fontFamily:"-apple-system,sans-serif" }}>{val}</div>
            </div>
          ))}
        </Section>
        <SectionTitle title="First-In First-Out" />
        <Section>
          <div style={{ fontSize:12, color:TEXT2, fontWeight:600, marginBottom:4 }}>Oldest tickets on deck</div>
          <div style={{ fontSize:11, color:TEXT3, marginBottom:14 }}>Tickets waiting longest in On Deck — available after Firebase deployment</div>
          <div style={{ background:"rgba(255,255,255,0.04)", borderRadius:10, padding:"12px 14px", border:"0.5px solid rgba(255,255,255,0.06)" }}>
            <div style={{ fontSize:12, color:TEXT3, textAlign:"center" }}>Will show oldest unassigned tickets once timestamps are tracked</div>
          </div>
        </Section>
        <SectionTitle title="Parts Wait Analysis" />
        <Section>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
            <div style={{ fontSize:12, color:TEXT2, fontWeight:600 }}>Currently Waiting on Parts</div>
            <span style={{ background:"rgba(191,90,242,0.15)", color:"#E5B8FF", fontSize:13, fontWeight:700, padding:"3px 10px", borderRadius:20 }}>{(state.partsSlots||[]).length}</span>
          </div>
          {(state.partsSlots||[]).length === 0 ? (
            <div style={{ fontSize:12, color:TEXT3, textAlign:"center", padding:"10px 0" }}>No tickets waiting on parts</div>
          ) : (
            (state.partsSlots||[]).map(id => {
              const ro = getRO(id);
              if (!ro) return null;
              return (
                <div key={id} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 0", borderBottom:"0.5px solid rgba(255,255,255,0.06)" }}>
                  <div>
                    <div style={{ fontSize:13, color:TEXT2, fontWeight:600 }}>{ro.roNum}</div>
                    <div style={{ fontSize:11, color:TEXT3 }}>{[ro.year,ro.make,ro.model].filter(Boolean).join(" ")}</div>
                  </div>
                  <div style={{ fontSize:11, color:"#BF5AF2" }}>{ro.customer}</div>
                </div>
              );
            })
          )}
        </Section>
        <SectionTitle title="Coming After Deployment" />        <Section>
          {[
            ["Comeback Rate",       "% of ROs returning for same issue"],
            ["Timer vs Flat Rate",  "Actual time vs flagged hours accuracy"],
            ["Daily Volume Trends", "Which days are busiest"],
            ["Tech Consistency",    "Hours variance day over day"],
          ].map(([title, desc]) => (
            <div key={title} style={{ display:"flex", alignItems:"flex-start", gap:10, marginBottom:12 }}>
              <div style={{ width:6, height:6, borderRadius:"50%", background:ACCENT, marginTop:4, flexShrink:0 }}/>
              <div>
                <div style={{ fontSize:13, color:TEXT2, fontWeight:600 }}>{title}</div>
                <div style={{ fontSize:11, color:TEXT3, marginTop:2 }}>{desc}</div>
              </div>
            </div>
          ))}
        </Section>
      </div>
    );
  }
  const MAIN_TABS = [
    { id:"overview",   label:"Overview",   emoji:"" },
    { id:"tech",       label:"Techs",      emoji:"" },
    { id:"efficiency", label:"Efficiency", emoji:"" },
  ];
  const TIME_TABS = [
    { id:"today", label:"Today" },
    { id:"week",  label:"Week"  },
    { id:"month", label:"Month" },
  ];
  return (
    <div style={{ position:"fixed", inset:0, background:"radial-gradient(ellipse at 50% 0%, #060D1F 0%, #000000 60%)", zIndex:1000, display:"flex", flexDirection:"column" }}>
      {/* Header */}
      <div style={{ background:"rgba(10,14,24,0.95)", backdropFilter:"blur(40px)", WebkitBackdropFilter:"blur(40px)", borderBottom:"0.5px solid rgba(255,255,255,0.08)", padding:"12px 20px 0", flexShrink:0 }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
          <div>
            <div style={{ fontFamily:"-apple-system,BlinkMacSystemFont,'SF Pro Display',sans-serif", fontWeight:700, fontSize:20, color:TEXT, letterSpacing:"-0.4px" }}>Analytics</div>
            <div style={{ fontSize:11, color:TEXT3, marginTop:1 }}>Shop performance dashboard</div>
          </div>
          <button onClick={onClose} style={{ background:"rgba(255,255,255,0.07)", border:"0.5px solid rgba(255,255,255,0.1)", borderRadius:10, width:34, height:34, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", color:TEXT2, flexShrink:0 }}>
            <XIcon />
          </button>
        </div>        {/* Main category tabs */}
        <div style={{ display:"flex", gap:0, marginBottom:0 }}>
          {MAIN_TABS.map(t => (
            <button key={t.id} onClick={() => setMainTab(t.id)}
              style={{ flex:1, padding:"10px 0", background:"none", border:"none", borderBottom:"2px solid "+(mainTab===t.id?ACCENT:"transparent"), color:mainTab===t.id?ACCENT:TEXT3, fontWeight:mainTab===t.id?600:400, fontSize:13, cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", justifyContent:"center", gap:5, transition:"all 0.15s" }}>
              <span style={{ fontSize:14 }}>{t.emoji}</span>{t.label}
            </button>
          ))}
        </div>
      </div>
      {/* Time range tabs */}
      <div style={{ padding:"12px 20px 0", flexShrink:0 }}>
        <div style={{ display:"flex", background:"rgba(255,255,255,0.05)", borderRadius:12, padding:3, gap:3 }}>
          {TIME_TABS.map(t => (
            <button key={t.id} onClick={() => setTimeTab(t.id)}
              style={{ flex:1, padding:"8px 0", borderRadius:9, border:"none", background:timeTab===t.id?"rgba(255,255,255,0.1)":"transparent", color:timeTab===t.id?TEXT:TEXT3, fontWeight:timeTab===t.id?600:400, fontSize:12, cursor:"pointer", fontFamily:"inherit", transition:"all 0.15s" }}>
              {t.label}
            </button>
          ))}
        </div>
        {timeTab !== "today" && (
          <div style={{ fontSize:10, color:TEXT3, textAlign:"center", marginTop:6 }}>
            Full date filtering available after Firebase deployment
          </div>
        )}
      </div>
      {/* Scrollable content */}
      <div style={{ flex:1, overflowY:"auto", WebkitOverflowScrolling:"touch", padding:"16px 20px 40px" }}>
        {mainTab === "overview"   && <OverviewTab />}
        {mainTab === "tech"       && <TechTab />}
        {mainTab === "efficiency" && <EfficiencyTab />}
      </div>
    </div>
  );
}
// ─── Change PIN Modal ────────────────────────────────────────────────────────
function ChangePinModal({ user, onClose, onSave }) {
  const [current, setCurrent] = useState("");
  const [newPin,  setNewPin]  = useState("");
  const [confirm, setConfirm] = useState("");
  const [err,     setErr]     = useState("");
  function handleSave() {
    if (current !== user.pin)         { setErr("Current PIN is incorrect"); return; }    if (newPin.length < 4)            { setErr("New PIN must be at least 4 digits"); return; }
    if (newPin !== confirm)           { setErr("PINs do not match"); return; }
    if (!/^[0-9]+$/.test(newPin))        { setErr("PIN must be numbers only"); return; }
    onSave(newPin);
    onClose();
  }
  const inp = (val, set, placeholder) => (
    <input type="password" placeholder={placeholder} value={val}
      onChange={e => { set(e.target.value.replace(/\D/g,"")); setErr(""); }}
      onKeyDown={e => e.key === "Enter" && handleSave()}
      style={{ ...inputStyle, textAlign:"center", fontSize:20, letterSpacing:"0.4em", marginBottom:10 }}
    />
  );
  return (
    <div onClick={e=>{if(e.target===e.currentTarget)onClose();}} style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:5000,display:"flex",alignItems:"center",justifyContent:"center",padding:24 }}>
      <div style={{ background:SHEET_BG,borderRadius:20,padding:"24px 20px",width:"100%",maxWidth:340,boxShadow:"0 20px 60px rgba(0,0,0,0.8)",border:"0.5px solid rgba(255,255,255,0.1)" }}>
        <div style={{ fontFamily:"-apple-system,BlinkMacSystemFont,'SF Pro Display',sans-serif",fontWeight:700,fontSize:18,color:TEXT,marginBottom:4 }}>Change PIN</div>
        <div style={{ fontSize:12,color:TEXT3,marginBottom:20 }}>{user.name}</div>
        {inp(current, setCurrent, "Current PIN")}
        {inp(newPin,  setNewPin,  "New PIN")}
        {inp(confirm, setConfirm, "Confirm New PIN")}
        {err && <div style={{ color:DANGER,fontSize:12,textAlign:"center",marginBottom:10,fontWeight:500 }}>{err}</div>}
        <button onClick={handleSave} style={{ width:"100%",padding:14,background:ACCENT,color:"#fff",border:"none",borderRadius:14,fontFamily:"inherit",fontWeight:600,fontSize:15,cursor:"pointer",boxShadow:"0 4px 16px rgba(10,132,255,0.4)",marginBottom:10 }}>
          Save New PIN
        </button>
        <button onClick={onClose} style={{ width:"100%",padding:12,background:"rgba(255,255,255,0.06)",color:TEXT3,border:"0.5px solid rgba(255,255,255,0.1)",borderRadius:14,fontFamily:"inherit",fontWeight:500,fontSize:14,cursor:"pointer" }}>
          Cancel
        </button>
      </div>
    </div>
  );
}
// ─── Login Screen ─────────────────────────────────────────────────────────────
function LoginScreen({ onLogin, users }) {
  const allUsers = users || USERS;
  const [selectedId, setSelectedId] = useState("");
  const [pin,        setPin]        = useState("");
  const [err,        setErr]        = useState("");
  const [shake,      setShake]      = useState(false);
  const [step,       setStep]       = useState("name"); // "name" | "pin"const pinRef  = useRef(null);
  const [dots,  setDots]  = useState([false,false,false,false,false,false]);
  const selectedUser = allUsers.find(u => u.id === selectedId);
  const PIN_LEN = selectedUser?.pin?.length || 4;  function tryLogin() {
    if (!selectedUser) return;
    const saved = JSON.parse(localStorage.getItem("sft-pins")||"{}");
    const activePin = saved[selectedUser.id] || selectedUser.pin;
    if (activePin === pin) {
      onLogin(selectedUser);
    } else {
      setShake(true);
      setErr("Incorrect PIN");
      setTimeout(() => { setShake(false); setErr(""); setPin(""); setDots([false,false,false,false,false,false]); }, 900);
    }
  }
  function handleNameSelect(userId) {
    setSelectedId(userId);
    setPin(""); setErr(""); setDots([false,false,false,false,false,false]);
    setTimeout(() => setStep("pin"), 200);
  }
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
            setShake(true);
            setErr("Try again");
            setTimeout(() => { setShake(false); setErr(""); setPin(""); setDots([false,false,false,false,false,false]); }, 900);
          }
        }, 120);
      }
    }
  }  const PAD = [["1","2","3"],["4","5","6"],["7","8","9"],["","0","del"]];
  return (
    <div style={{ minHeight:"100vh", minHeight:"100dvh", background:"#000000", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"24px 24px 48px", position:"relative", overflow:"hidden" }}>
      {/* Background glow orbs */}
      <div style={{ position:"absolute", top:"-20%", left:"50%", transform:"translateX(-50%)", width:500, height:500, background:"radial-gradient(circle, rgba(10,132,255,0.12) 0%, transparent 70%)", pointerEvents:"none" }}/>
      <div style={{ position:"absolute", bottom:"-10%", right:"-10%", width:300, height:300, background:"radial-gradient(circle, rgba(191,90,242,0.07) 0%, transparent 70%)", pointerEvents:"none" }}/>
      {/* Logo */}
      <div style={{ animation:"fade-in 0.5s ease", textAlign:"center", marginBottom:32 }}>
        <div style={{ margin:"0 auto 18px", filter:"drop-shadow(0 0 30px rgba(10,132,255,0.4)) drop-shadow(0 20px 40px rgba(0,0,0,0.6))" }}>
          <WFLogo size={84} radius={11} />
        </div>
        <div style={{ color:TEXT, fontWeight:700, fontSize:36, fontFamily:"'Space Grotesk',-apple-system,BlinkMacSystemFont,'SF Pro Display',sans-serif", letterSpacing:"-1.2px", lineHeight:1 }}>
          <span style={{ color:TEXT }}>Worq</span><span style={{ background:"linear-gradient(135deg,#60B3FF,#0A84FF)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>flow</span>
        </div>
        <div style={{ color:"rgba(255,255,255,0.28)", fontSize:13, marginTop:8, letterSpacing:"0.3px" }}>
          {step==="name" ? "Sign in to continue" : "Welcome back, "+selectedUser?.name}
        </div>
      </div>
      {/* NAME STEP — elegant dropdown */}
      {step === "name" && (
        <div style={{ width:"100%", maxWidth:340, animation:"fade-in 0.3s ease" }}>
          {/* Frosted glass card */}
          <div style={{ background:"rgba(255,255,255,0.04)", borderRadius:24, padding:"24px 20px 20px", border:"0.5px solid rgba(255,255,255,0.08)", borderTop:"0.5px solid rgba(255,255,255,0.14)", backdropFilter:"blur(40px)", WebkitBackdropFilter:"blur(40px)", boxShadow:"0 1px 0 rgba(255,255,255,0.08) inset, 0 24px 48px rgba(0,0,0,0.6)" }}>
            <div style={{ fontSize:11, fontWeight:600, color:"rgba(255,255,255,0.3)", textTransform:"uppercase", letterSpacing:"1px", marginBottom:12 }}>
              Your Name
            </div>
            <div style={{ position:"relative", marginBottom:20 }}>
              <select
                value={selectedId}
                onChange={e => { setSelectedId(e.target.value); setPin(""); setErr(""); setDots([false,false,false,false,false,false]); }}
                style={{ width:"100%", padding:"16px 44px 16px 18px", background:"rgba(255,255,255,0.07)", border:"0.5px solid rgba(255,255,255,0.12)", borderTop:"0.5px solid rgba(255,255,255,0.18)", borderRadius:16, color:selectedId?TEXT:"rgba(255,255,255,0.3)", fontSize:16, fontWeight:selectedId?500:400, fontFamily:"-apple-system,BlinkMacSystemFont,'SF Pro Text',sans-serif", outline:"none", appearance:"none", WebkitAppearance:"none", cursor:"pointer", boxShadow:"0 1px 0 rgba(255,255,255,0.08) inset", letterSpacing:"-0.2px", boxSizing:"border-box", colorScheme:"dark" }}
              >
                <option value="" disabled style={{ color:"#666" }}>Select your name…</option>
                {allUsers.map(u => (
                  <option key={u.id} value={u.id} style={{ color:"#fff", background:"#1C1C1E" }}>{u.name}</option>
                ))}
              </select>
              {/* Custom chevron */}
              <div style={{ position:"absolute", right:16, top:"50%", transform:"translateY(-50%)", pointerEvents:"none", color:"rgba(255,255,255,0.3)", fontSize:11 }}>▼</div>
            </div>
            {/* Continue button */}
            <button              onClick={() => { if (selectedId) setStep("pin"); }}
              style={{ width:"100%", padding:"16px", background:selectedId?"linear-gradient(135deg,#0A84FF,#0055CC)":"rgba(255,255,255,0.06)", color:selectedId?"#fff":"rgba(255,255,255,0.2)", border:"none", borderRadius:16, fontFamily:"-apple-system,BlinkMacSystemFont,'SF Pro Text',sans-serif", fontWeight:600, fontSize:17, cursor:selectedId?"pointer":"default", letterSpacing:"-0.2px", boxShadow:selectedId?"0 4px 24px rgba(10,132,255,0.5), 0 1px 0 rgba(255,255,255,0.2) inset":"none", transition:"all 0.2s ease", boxSizing:"border-box" }}>
              Continue
            </button>
          </div>
        </div>
      )}
      {/* PIN STEP */}
      {step === "pin" && (
        <div style={{ width:"100%", maxWidth:300, marginTop:32, animation:"fade-in 0.25s ease", display:"flex", flexDirection:"column", alignItems:"center" }}>
          {/* PIN dots */}
          <div style={{ display:"flex", gap:16, marginBottom:8, transform:shake?"translateX(0)":"none", animation:shake?"shake 0.4s ease":"none" }}>
            {Array.from({length:PIN_LEN}).map((_,i) => (
              <div key={i} style={{ width:14, height:14, borderRadius:"50%", background:dots[i]?"#FFFFFF":"transparent", border:"1.5px solid "+(dots[i]?"#FFFFFF":"rgba(255,255,255,0.3)"), transition:"all 0.15s cubic-bezier(0.34,1.56,0.64,1)", transform:dots[i]?"scale(1.1)":"scale(1)" }}/>
            ))}
          </div>
          {/* Error */}
          <div style={{ height:20, marginBottom:16, display:"flex", alignItems:"center", justifyContent:"center" }}>
            {err && <span style={{ fontSize:12, color:DANGER, fontWeight:500, animation:"fade-in 0.15s ease" }}>{err}</span>}
          </div>
          {/* Number pad */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, width:"100%" }}>
            {PAD.flat().map((key, i) => {
              if (key === "") return <div key={i}/>;
              const isDel = key === "del";
              return (
                <button
                  key={i}
                  className="pad-btn"onPointerDown={e => { e.preventDefault(); handlePadPress(key); }}
                  style={{
                    height: 76,
                    borderRadius: 22,
                    border: "none",
                    background: isDel ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.09)",
                    color: isDel ? "rgba(255,255,255,0.55)" : TEXT,
                    fontSize: isDel ? 20 : 28,
                    fontWeight: 300,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: isDel                      ? "0 1px 0 rgba(255,255,255,0.06) inset": "0 1px 0 rgba(255,255,255,0.14) inset, 0 4px 16px rgba(0,0,0,0.5)",
                    fontFamily: "-apple-system,BlinkMacSystemFont,'SF Pro Display',sans-serif",
                    letterSpacing: "-0.5px",
                    WebkitUserSelect: "none",
                    userSelect: "none",
                    touchAction: "manipulation",
                    transition: "transform 0.1s ease, background 0.1s ease",
                  }}
                >
                  {key}
                </button>
              );
            })}
          </div>
          {/* Back button */}
          <button onClick={() => { setStep("name"); setPin(""); setErr(""); setDots([false,false,false,false,false,false]); }}
            style={{ marginTop:28, background:"none", border:"none", color:"rgba(255,255,255,0.3)", fontSize:13, cursor:"pointer", fontFamily:"inherit", letterSpacing:"0.1px" }}>
            ← Switch account
          </button>
        </div>
      )}
      {/* Footer */}
      <div style={{ position:"absolute", bottom:24, fontSize:11, color:"rgba(255,255,255,0.12)", letterSpacing:"0.3px" }}>
        Worqflow · Built for service teams
      </div>
    </div>
  );
}
// ─── Device ID ────────────────────────────────────────────────────────────────
function getDeviceId() {
  const key = 'sft-device-id';
  let id = localStorage.getItem(key);
  if (!id) {
    id = 'dev-' + Date.now() + '-' + Math.random().toString(36).slice(2, 9);
    localStorage.setItem(key, id);
  }
  return id;
}

// ─── Shared Admin PIN Pad ─────────────────────────────────────────────────────
// Used on both the Request Access and Awaiting Approval screens.
// onSuccess(adminUser) is called when the correct PIN is entered.
function AdminPinPad({ deviceId, onSuccess, onBack, backLabel }) {
  const adminUser = USERS.find(u => u.role === 'admin');
  const PIN_LEN = adminUser?.pin?.length || 6;
  const [dots, setDots] = useState(() => Array(PIN_LEN).fill(false));
  const [pinErr, setPinErr] = useState('');
  const [pinShake, setPinShake] = useState(false);
  const pinRef = useRef('');
  const PAD = [['1','2','3'],['4','5','6'],['7','8','9'],['','0','del']];

  function reset() {
    pinRef.current = '';
    setDots(Array(PIN_LEN).fill(false));
    setPinErr('');
    setPinShake(false);
  }

  function handlePress(val) {
    if (pinShake) return;
    if (val === 'del') {
      const np = pinRef.current.slice(0, -1);
      pinRef.current = np;
      setDots(d => { const n = [...d]; n[np.length] = false; return n; });
      setPinErr('');
      return;
    }
    if (pinRef.current.length >= PIN_LEN) return;
    const np = pinRef.current + val;
    pinRef.current = np;
    setDots(d => { const n = [...d]; n[np.length - 1] = true; return n; });
    if (np.length === PIN_LEN) {
      setTimeout(() => {
        const saved = JSON.parse(localStorage.getItem('sft-pins') || '{}');
        const correctPin = saved[adminUser.id] || adminUser.pin;
        if (np === correctPin) {
          onSuccess(adminUser, deviceId);
        } else {
          setPinShake(true);
          setPinErr('Incorrect PIN');
          setTimeout(() => reset(), 1200);
        }
      }, 120);
    }
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', width:'100%' }}>
      <div style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.3)', textTransform:'uppercase', letterSpacing:'0.8px', marginBottom:20 }}>Admin Access</div>
      <div style={{ display:'flex', gap:16, marginBottom:8, animation:pinShake?'shake 0.4s ease':'none' }}>
        {Array.from({ length:PIN_LEN }).map((_,i) => (
          <div key={i} style={{ width:14, height:14, borderRadius:'50%', background:dots[i]?'#0A84FF':'rgba(255,255,255,0.15)', transition:'background 0.15s ease' }}/>
        ))}
      </div>
      <div style={{ height:20, marginBottom:12, display:'flex', alignItems:'center', justifyContent:'center' }}>
        {pinErr && <span style={{ fontSize:12, color:'#FF453A', fontWeight:500 }}>{pinErr}</span>}
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, width:'100%', maxWidth:280 }}>
        {PAD.flat().map((key,i) => {
          if (key === '') return <div key={i}/>;
          const isDel = key === 'del';
          return (
            <button key={i} className="pad-btn" onPointerDown={e => { e.preventDefault(); handlePress(key); }}
              style={{ height:76, borderRadius:22, border:'none', background:isDel?'rgba(255,255,255,0.05)':'rgba(255,255,255,0.09)', color:isDel?'rgba(255,255,255,0.55)':'#fff', fontSize:isDel?20:28, fontWeight:300, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:isDel?'0 1px 0 rgba(255,255,255,0.06) inset':'0 1px 0 rgba(255,255,255,0.14) inset,0 4px 16px rgba(0,0,0,0.5)', fontFamily:'-apple-system,sans-serif', WebkitUserSelect:'none', userSelect:'none', touchAction:'manipulation' }}>
              {isDel ? '⌫' : key}
            </button>
          );
        })}
      </div>
      <button onClick={() => { reset(); onBack(); }} style={{ marginTop:24, background:'none', border:'none', color:'rgba(255,255,255,0.25)', fontSize:13, cursor:'pointer', padding:'8px 16px' }}>
        ← {backLabel || 'Back'}
      </button>
    </div>
  );
}

// ─── Display Bypass Button (shared) ──────────────────────────────────────────
function DisplayBypassButton({ onDisplayBypass }) {
  return (
    <button onClick={onDisplayBypass} style={{ marginTop:8, background:'none', border:'none', color:'rgba(255,255,255,0.18)', fontSize:12, cursor:'pointer', padding:'8px 16px', display:'flex', alignItems:'center', gap:6 }}>
      📺 Use as Display Board
    </button>
  );
}

// ─── Pending Screen ───────────────────────────────────────────────────────────
function PendingScreen({ deviceId, onAdminOverride, onRecheck, onDisplayBypass }) {
  const [showAdminPin, setShowAdminPin] = useState(false);
  return (
    <div style={{ minHeight:'100vh', background:'#000', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', padding:'32px 24px', fontFamily:'-apple-system,sans-serif' }}>
      <div style={{ position:'absolute', top:'-20%', left:'50%', transform:'translateX(-50%)', width:400, height:400, borderRadius:'50%', background:'radial-gradient(circle,rgba(10,132,255,0.06) 0%,transparent 70%)', pointerEvents:'none' }}/>
      {!showAdminPin ? (
        <>
          <WFLogo size={64} radius={10} />
          <div style={{ textAlign:'center', marginTop:24, marginBottom:8 }}>
            <div style={{ fontSize:22, fontWeight:700, color:'#fff', marginBottom:8 }}>Awaiting Approval</div>
            <div style={{ fontSize:14, color:'rgba(255,255,255,0.4)', lineHeight:1.7 }}>Your access request has been submitted.<br/>An admin will approve this device shortly.</div>
          </div>
          <div style={{ fontSize:10, color:'rgba(255,255,255,0.1)', fontFamily:'monospace', textAlign:'center', marginTop:8, marginBottom:20 }}>{deviceId}</div>
          <button onClick={onRecheck} style={{ padding:'10px 24px', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:12, color:'rgba(255,255,255,0.4)', fontSize:13, cursor:'pointer' }}>Check Again</button>
          <div style={{ width:'100%', maxWidth:280, borderTop:'1px solid rgba(255,255,255,0.06)', marginTop:32, paddingTop:24, display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
            <button onClick={() => setShowAdminPin(true)} style={{ background:'none', border:'none', color:'rgba(255,255,255,0.2)', fontSize:12, cursor:'pointer', padding:'8px 0' }}>Admin? Sign in here</button>
            <DisplayBypassButton onDisplayBypass={onDisplayBypass} />
          </div>
        </>
      ) : (
        <AdminPinPad deviceId={deviceId} onSuccess={onAdminOverride} onBack={() => setShowAdminPin(false)} backLabel="Back to waiting screen" />
      )}
    </div>
  );
}

// ─── Request Access Screen ────────────────────────────────────────────────────
function RequestAccessScreen({ deviceId, onRequested, onAdminOverride, onDisplayBypass }) {
  const [name, setName] = useState('');
  const [role, setRole] = useState('tech');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showAdminPin, setShowAdminPin] = useState(false);

  async function handleRequest() {
    if (!name.trim()) return;
    setLoading(true);
    try {
      await setDoc(doc(db, 'devices', deviceId), {
        deviceId, name: name.trim(), role,
        status: 'pending', requestedAt: Date.now(), userAgent: navigator.userAgent,
      });
      setSubmitted(true);
      setTimeout(() => onRequested(), 1500);
    } catch(e) { console.error('Request failed', e); }
    setLoading(false);
  }

  return (
    <div style={{ minHeight:'100vh', background:'#000000', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', padding:'32px 24px', fontFamily:'-apple-system,BlinkMacSystemFont,sans-serif', position:'relative', overflow:'hidden' }}>
      <div style={{ position:'absolute', top:'-20%', left:'50%', transform:'translateX(-50%)', width:400, height:400, borderRadius:'50%', background:'radial-gradient(circle,rgba(10,132,255,0.08) 0%,transparent 70%)', pointerEvents:'none' }}/>
      {!showAdminPin ? (
        <>
          <div style={{ marginBottom:28, textAlign:'center' }}><WFLogo size={72} radius={11} /></div>
          <div style={{ textAlign:'center', marginBottom:32 }}>
            <div style={{ fontSize:26, fontWeight:700, color:'#fff', marginBottom:8, letterSpacing:'-0.5px' }}>Request Access</div>
            <div style={{ fontSize:14, color:'rgba(255,255,255,0.4)', lineHeight:1.6, maxWidth:280 }}>This device is not registered.<br/>Enter your info to request access from your admin.</div>
          </div>
          <div style={{ width:'100%', maxWidth:340, display:'flex', flexDirection:'column', gap:14 }}>
            <div>
              <label style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,0.35)', textTransform:'uppercase', letterSpacing:'0.8px', display:'block', marginBottom:6 }}>Your Name</label>
              <input autoFocus placeholder="e.g. Marcus" value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key==='Enter' && handleRequest()}
                style={{ width:'100%', padding:'14px 16px', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:12, color:'#fff', fontSize:16, outline:'none', boxSizing:'border-box', colorScheme:'dark' }} />
            </div>
            <div>
              <label style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,0.35)', textTransform:'uppercase', letterSpacing:'0.8px', display:'block', marginBottom:6 }}>Role</label>
              <div style={{ display:'flex', gap:8 }}>
                {[['tech','Tech'],['advisor','Advisor'],['manager','Manager']].map(([v,l]) => (
                  <button key={v} onClick={() => setRole(v)} style={{ flex:1, padding:'10px 0', borderRadius:12, border:'2px solid '+(role===v?'#0A84FF':'rgba(255,255,255,0.08)'), background:role===v?'rgba(10,132,255,0.12)':'transparent', color:role===v?'#0A84FF':'rgba(255,255,255,0.4)', fontSize:12, fontWeight:600, cursor:'pointer' }}>{l}</button>
                ))}
              </div>
            </div>
            <button onClick={handleRequest} disabled={!name.trim()||loading}
              style={{ padding:15, background:name.trim()?'linear-gradient(135deg,#1D6BF3,#0A84FF)':'rgba(255,255,255,0.06)', color:name.trim()?'#fff':'rgba(255,255,255,0.2)', border:'none', borderRadius:14, fontSize:16, fontWeight:700, cursor:name.trim()?'pointer':'default', marginTop:4 }}>
              {loading ? 'Sending…' : submitted ? '✓ Request Sent!' : 'Request Access'}
            </button>
          </div>
          <div style={{ marginTop:24, fontSize:10, color:'rgba(255,255,255,0.1)', fontFamily:'monospace', textAlign:'center' }}>{deviceId}</div>
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:2, marginTop:32 }}>
            <button onClick={() => setShowAdminPin(true)} style={{ background:'none', border:'none', color:'rgba(255,255,255,0.15)', fontSize:12, cursor:'pointer', padding:'8px 16px' }}>Admin? Sign in here</button>
            <DisplayBypassButton onDisplayBypass={onDisplayBypass} />
          </div>
        </>
      ) : (
        <AdminPinPad deviceId={deviceId} onSuccess={onAdminOverride} onBack={() => setShowAdminPin(false)} backLabel="Back to request form" />
      )}
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function ShopFlowTracker() {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const raw = localStorage.getItem('sft-session');
      if (raw) {
        const { user, loginDate } = JSON.parse(raw);
        if (loginDate === new Date().toDateString()) return user;
      }
    } catch(e) {}
    return null;
  });
  const [deviceStatus, setDeviceStatus] = useState('checking');
  const deviceId = useRef(getDeviceId());
  const [state, setState]             = useState(loadState);
  const [connected, setConnected]     = useState(true);
  const [showAdd, setShowAdd]               = useState(false);
  const [showArchive, setShowArchive]       = useState(false);
  const [showHistory, setShowHistory]       = useState(false);
  const [showReport,  setShowReport]        = useState(false);
  const [showServiceTypes, setShowServiceTypes] = useState(false);
  const [showDevices, setShowDevices] = useState(false);
  const [partsCollapsed, setPartsCollapsed]   = useState(false);
  const [showChangePin, setShowChangePin]     = useState(false);
  const [showAnalytics, setShowAnalytics]     = useState(false);
  const [showActivity,  setShowActivity]      = useState(false);
  const [showActivityReport, setShowActivityReport] = useState(false);
  const [showTimeClock, setShowTimeClock]     = useState(false);
  const [detailRO, setDetailRO]       = useState(null);  const [movingRO, setMovingRO]       = useState(null);
  const [collapsed, setCollapsed]     = useState({});
  const [, setTick] = useState(0);
  const tickRef = useRef(null);
  const isWide  = useIsWide();
  const isDisplay  = currentUser?.role === "display";
  const isAdmin   = currentUser && currentUser.role === "admin";
  const isManager = currentUser && currentUser.role === "manager";
  const isAdvisor = currentUser && currentUser.role === "advisor";
  const isTech    = currentUser && currentUser.role === "tech";
  function handleLogout() {
    try { localStorage.removeItem('sft-session'); } catch(e) {}
    handleLogout();
  }
  const canSeeAll   = isAdmin || isManager || isAdvisor;
  const canCreateRO = isAdmin;
  const canSettings = isAdmin;
  const canDelete   = isAdmin;
  const canMove     = isAdmin || isTech;
  const isRemote = useRef(false);
  const saveTimer = useRef(null);
  const stateRef = useRef(state);

  // ── Device approval check ──
  useEffect(() => {
    async function checkDevice() {
      try {
        if (localStorage.getItem('sft-master') === 'worqflow2025') {
          setDeviceStatus('approved');
          return;
        }
        const snap = await getDoc(doc(db, 'devices', deviceId.current));
        if (snap.exists()) {
          setDeviceStatus(snap.data().status || 'pending');
        } else {
          setDeviceStatus('unregistered');
        }
      } catch(e) {
        console.warn('[ShopFlow] Device check failed', e);
        setDeviceStatus('approved'); // fail open — Firebase errors must never lock users out
      }
    }
    checkDevice();
  }, []);

  // ── Firebase listener ──
  useEffect(() => {
    const ref = doc(db, 'shopstate', 'main');
    const unsub = onSnapshot(ref, snap => {
      setConnected(true);
      if (snap.exists()) {
        const data = snap.data();
        isRemote.current = true;
        const fresh = freshState();
        const nextState = {
          ...fresh,
          ...data,
          timers:          data.timers          || {},
          grid:            data.grid            || fresh.grid,
          qSlots:          data.qSlots          || fresh.qSlots,
          partsSlots:      data.partsSlots      || [],
          techs:           data.techs
                           ? data.techs.map(t => ({ ...t, pin: t.pin || DEFAULT_TECHS.find(d => d.id === t.id)?.pin || "0000" }))
                           : fresh.techs,
          queues:          data.queues          || fresh.queues,
          serviceTypes:    data.serviceTypes    || fresh.serviceTypes,
          jobPresets:      data.jobPresets      || fresh.jobPresets,
          archived:        data.archived        || [],
          completedByTech: data.completedByTech || {},
          activityLog:     data.activityLog     || [],
          timeClockLog:    data.timeClockLog     || [],
          ros:             data.ros             || fresh.ros,
          displayPin:      data.displayPin      || "9999",
        };
        setState(nextState);
      } else {
        setDoc(ref, stateRef.current).catch(e => console.error('[ShopFlow] seed failed', e));
      }
    }, err => { setConnected(false); console.error('[ShopFlow] snapshot error', err); });
    return unsub;
  }, []);

  // ── Debounced save ──
  const scheduleSave = useCallback((s) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    // Capture and reset remote flag immediately so user changes after a snapshot are never skipped
    const fromRemote = isRemote.current;
    isRemote.current = false;
    saveTimer.current = setTimeout(async () => {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(stateRef.current)); } catch {}
      if (!fromRemote) {
        try { await setDoc(doc(db, 'shopstate', 'main'), stateRef.current); }
        catch (e) { console.error('[ShopFlow] save failed', e); }
      }
    }, 300);
  }, []);

  useEffect(() => {
    stateRef.current = state;
    scheduleSave(state);
  }, [state, scheduleSave]);
  useEffect(() => {
    tickRef.current = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(tickRef.current);
  }, []);
  // ── Promise time notifications ──
  const firedAlertsRef = useRef({}); // tracks { [key]: true } to avoid duplicates
  useEffect(() => {
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);
  useEffect(() => {
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    const interval = setInterval(() => {
      const now = Date.now();
      const today = new Date().toDateString();
      // clean up old day keys
      Object.keys(firedAlertsRef.current).forEach(k => {
        if (!k.startsWith(today)) delete firedAlertsRef.current[k];
      });
      const allRoIds = new Set();
      Object.values(stateRef.current.grid||{}).forEach(cols => {
        ["ondeck","inprogress","completed"].forEach(c => {
          (cols[c]||[]).forEach(id => allRoIds.add(id));
        });
      });
      allRoIds.forEach(id => {
        const ro = (stateRef.current.ros||[]).find(r => r.id === id);
        if (!ro || !ro.promiseTime) return;
        const due = new Date(ro.promiseTime).getTime();
        if (isNaN(due)) return;
        const diff = due - now;
        const warnKey = today + "_warn_" + id;
        const overdueKey = today + "_over_" + id;
        if (diff > 0 && diff <= 30 * 60 * 1000 && !firedAlertsRef.current[warnKey]) {
          firedAlertsRef.current[warnKey] = true;
          const timeStr = new Date(due).toLocaleTimeString([], {hour:"2-digit", minute:"2-digit"});
          new Notification("Promise Time — " + ro.roNum, {
            body: "Due at " + timeStr + " · " + (ro.customer||""),
            icon: "/favicon.ico",
          });
        } else if (diff <= 0 && diff > -60 * 60 * 1000 && !firedAlertsRef.current[overdueKey]) {
          firedAlertsRef.current[overdueKey] = true;
          new Notification("OVERDUE — " + ro.roNum, {
            body: (ro.customer||"") + " · " + (ro.make||"") + " " + (ro.model||""),
            icon: "/favicon.ico",
          });
        }
      });
    }, 60 * 1000);
    return () => clearInterval(interval);
  }, []);
  function upd(fn) { setState(s => fn({ ...s })); }
  function getRO(id) { return state.ros.find(r => r.id === id); }
  const visibleTechs = (canSeeAll || isDisplay)
    ? state.techs
    : state.techs.filter(t => currentUser && t.id === currentUser.id);
  function removeFromAll(s, roId) {
    const grid = {};
    Object.entries(s.grid).forEach(([tid, cols]) => {
      grid[tid] = {};
      Object.entries(cols).forEach(([cid, ids]) => {
        grid[tid][cid] = ids.filter(x => x !== roId);
      });
    });
    const qSlots = {};
    Object.entries(s.qSlots).forEach(([qid, ids]) => {
      qSlots[qid] = ids.filter(x => x !== roId);
    });
    const partsSlots = (s.partsSlots||[]).filter(x => x !== roId);
    return { ...s, grid, qSlots, partsSlots };  }
  function handleMove(dest) {
    if (!movingRO) return;
    const roId = movingRO.id;
    upd(s => {
      const ns = removeFromAll(s, roId);
      if (dest.type === "grid") {
        const techGrid = ns.grid[dest.techId] || { ondeck:[], inprogress:[], completed:[], delivered:[] };
        const existing = techGrid[dest.colId] || [];
        const newState = { ...ns, grid: { ...ns.grid, [dest.techId]: { ...techGrid, [dest.colId]: [...existing, roId] } } };
        // Track cumulative completed — only add once per RO per tech
        if (dest.colId === "completed" || dest.colId === "delivered") {
          const key = dest.techId + "_" + roId;
          const already = ns.completedByTech || {};
          if (!already[key]) {
            const techCount = already[dest.techId] || 0;
            newState.completedByTech = { ...already, [key]: true, [dest.techId]: techCount + 1 };
          }
        }
        return newState;
      } else if (dest.type === "parts") {
        return { ...ns, partsSlots: [...(ns.partsSlots||[]), roId] };
      } else {
        const existing = ns.qSlots[dest.queueId] || [];
        return { ...ns, qSlots: { ...ns.qSlots, [dest.queueId]: [...existing, roId] } };
      }
    });
    setMovingRO(null);
  }
  function handleTimer(roId) {
    upd(s => {
      const now = Date.now();
      const t = s.timers[roId] || { running:false, elapsed:0, startedAt:null };
      const updated = { ...s.timers };
      if (!t.running) {
        Object.keys(updated).forEach(id => {
          if (id !== roId && updated[id] && updated[id].running) {
            updated[id] = { ...updated[id], running:false, elapsed:updated[id].elapsed + Math.floor((now - updated[id].startedAt) / 1000), startedAt:null };
          }
        });
      }
      updated[roId] = t.running
        ? { running:false, elapsed:t.elapsed + Math.floor((now - t.startedAt) / 1000), startedAt:null }
        : { running:true, elapsed:t.elapsed, startedAt:now };
      return { ...s, timers:updated };
    });  }
  function handleHoursChange(roId, val) {
    upd(s => ({ ...s, ros: s.ros.map(r => r.id === roId ? { ...r, hours:val } : r) }));
  }
  function handleSaveRO(f) {
    upd(s => ({ ...s, ros: s.ros.map(r => r.id === f.id ? { ...r, ...f } : r) }));
  }
  function handleDeleteRO(roId) {
    const ns = removeFromAll(stateRef.current, roId);
    const newState = { ...ns, ros: ns.ros.filter(r => r.id !== roId) };
    stateRef.current = newState;
    setState(newState);
    setDetailRO(null);
    (async () => {
      try {
        isRemote.current = true;
        await setDoc(doc(db, 'shopstate', 'main'), stateRef.current);
      } catch(e) {
        isRemote.current = false;
        console.error('[ShopFlow] Delete sync failed:', e);
      }
    })();
  }
  function handleArchive(roId) {
    upd(s => {
      const ro = getRO(roId);
      const ns = removeFromAll(s, roId);
      return { ...ns, ros:ns.ros.filter(r => r.id !== roId), archived:[...(ns.archived||[]), { ro, archivedAt:Date.now() }] };
    });
    setDetailRO(null);
  }
  function handleRestore(entry) {
    upd(s => ({
      ...s,
      ros: [...s.ros, { ...entry.ro }],
      archived: (s.archived||[]).filter(e => e.archivedAt !== entry.archivedAt),
      qSlots: { ...s.qSlots, "q-main": [...(s.qSlots["q-main"]||[]), entry.ro.id] },
      timers: { ...s.timers, [entry.ro.id]: { running:false, elapsed:0, startedAt:null } },
    }));
  }
  function handleAddRO(f) {
    const roId = "ro-" + Date.now();
    const ro = { id:roId, roNum:f.roNum||"RO-"+String(state.nextNum).padStart(4,"0"), serviceType:f.serviceType||"st-main", promiseTime:f.promiseTime||"", roNotes:[], year:f.year, make:f.make, model:f.model, color:f.color||"", vin:f.vin||"", plate:f.plate||"", mileageIn:f.mileageIn||"", mileageOut:"", customer:f.customer, phone:f.phone||"", email:f.email||"", waitStatus:f.waitStatus||"dropoff", priority:f.priority, hours:f.hours, jobs:f.jobs, parts:f.parts||"", concern:f.concern||"", cause:f.cause||"", correction:f.correction||"", notes:f.notes };
    upd(s => {
      const ns = { ...s, ros:[...s.ros, ro], nextNum:s.nextNum+1, timers:{ ...s.timers, [roId]:{ running:false, elapsed:0, startedAt:null } } };
      if (f.dest === "tech" && f.assignTech) {
        const col = f.assignCol || "ondeck";
        ns.grid = { ...ns.grid, [f.assignTech]: { ...ns.grid[f.assignTech], [col]: [...(ns.grid[f.assignTech][col]||[]), roId] } };
      } else {
        const qid = f.assignQueue || "q-main";
        ns.qSlots = { ...ns.qSlots, [qid]: [...(ns.qSlots[qid]||[]), roId] };
      }
      return ns;    });
    setTimeout(async () => {
      try {
        isRemote.current = true;
        await setDoc(doc(db, 'shopstate', 'main'), stateRef.current);
        console.log('[ShopFlow] New RO synced:', roId);
      } catch(e) {
        console.error('[ShopFlow] New RO sync failed:', e);
      }
    }, 150);
    setShowAdd(false);
  }
  function handleSaveServiceTypes(types) {
    upd(s => ({ ...s, serviceTypes: types }));
    setShowServiceTypes(false);
  }
  function handleAddNote(roId, text, authorName) {
    if (!text.trim()) return;
    const note = { id: Date.now(), text: text.trim(), author: authorName, time: Date.now() };
    upd(s => ({ ...s, ros: s.ros.map(r => r.id === roId ? { ...r, roNotes: [...(r.roNotes||[]), note] } : r) }));
  }
  function handleClockIn(userId) {
    upd(s => ({
      ...s,
      timeClockLog: [...(s.timeClockLog||[]), { userId, type:"in", clockIn:Date.now() }]
    }));
  }
  function handleClockOut(userId) {
    upd(s => ({
      ...s,
      timeClockLog: [...(s.timeClockLog||[]), { userId, type:"out", clockIn:Date.now() }]
    }));
  }
  function isClockedIn(userId) {
    const log = state.timeClockLog || [];
    const ins  = log.filter(e => e.userId === userId && e.type === "in").length;
    const outs = log.filter(e => e.userId === userId && e.type === "out").length;
    return ins > outs;
  }
  function handleStartActivity(activityId, userId) {
    upd(s => ({
      ...s,
      activityLog: [...(s.activityLog||[]), { activityId, userId, startTime:Date.now(), endTime:null }]
    }));
  }
  function handleStopActivity(entry) {
    upd(s => ({
      ...s,
      activityLog: (s.activityLog||[]).map(e =>        e.userId === entry.userId && e.activityId === entry.activityId && !e.endTime
          ? { ...e, endTime:Date.now() }
          : e
      )
    }));
  }
  function handleSavePin(newPin) {
    // Save updated PIN — in localStorage via state
    // In production this would update Firebase
    if (typeof window !== "undefined") {
      const key = "sft-pins";
      const pins = JSON.parse(localStorage.getItem(key)||"{}");
      pins[currentUser.id] = newPin;
      localStorage.setItem(key, JSON.stringify(pins));
      // Update current session user
      setCurrentUser(u => ({...u, pin:newPin}));
    }
  }
  function handleSaveJobPresets(presets) {
    upd(s => ({ ...s, jobPresets: presets }));
    setShowServiceTypes(false);
  }
  function handleSaveDisplayPin(pin) {
    upd(s => ({ ...s, displayPin: pin }));
  }
  function handleSaveTechs(newTechs) {
    upd(s => {
      const removedIds = (s.techs||[]).map(t => t.id).filter(id => !newTechs.find(t => t.id === id));
      const newGrid = { ...s.grid };
      newTechs.forEach(t => { if (!newGrid[t.id]) newGrid[t.id] = { ondeck:[], inprogress:[], completed:[], delivered:[] }; });
      removedIds.forEach(id => { delete newGrid[id]; });
      return { ...s, techs: newTechs, grid: newGrid };
    });
    setShowServiceTypes(false);
  }
  function techStats(techId) {
    const all = COLS.flatMap(c => state.grid[techId] ? (state.grid[techId][c.id]||[]) : []);
    const hrs = all.reduce((sum, id) => {
      const ro = getRO(id);
      if (!ro || !ro.hours) return sum;
      return sum + (parseFloat(String(ro.hours).replace(/[^0-9.]/g,"")) || 0);
    }, 0);
    const cumulative = (state.completedByTech || {})[techId] || 0;
    return { count:all.length, hrs, cumulative };
  }
  function renderCard(ro, colId) {
    return (
      <ROCard
        key={ro.id}
        ro={ro}
        timer={state.timers[ro.id]}
        onTap={isDisplay ? () => {} : () => { if (!movingRO) setDetailRO({ ro, colId }); }}
        onMove={isDisplay ? () => {} : () => { if (!canMove) return; setDetailRO(null); setMovingRO(movingRO && movingRO.id === ro.id ? null : ro); }}
        isMoving={isDisplay ? false : (movingRO && movingRO.id === ro.id)}
        serviceTypes={state.serviceTypes}
        canMove={isDisplay ? false : canMove}
      />
    );
  }
  const flagged  = totalFlaggedHours(state);
  const progress = Math.min(flagged / GOAL_HOURS, 1);
  // On wide screens: fill 100% of viewport so everything fits on monitor
  // Tech col = 150px, 5 kanban cols share the rest equally
  // On mobile: fixed pixel widths with horizontal scroll
  const GAP    = isWide ? 6 : 6;
  const TECH_W = isWide ? 150 : 100;
  // On wide: cell width = (100vw - techW - 6 gaps - 28px padding) / 5
  // We pass this as a string for CSS calc
  const CELL_W_MOBILE = 148;
  const useFluid = isWide;  // fluid = fills screen, fixed = scrolls
  async function handleDisplayBypass(devId) {
    // Display board never needs approval — auto-approve silently and log in
    try {
      await setDoc(doc(db, 'devices', devId), {
        deviceId: devId, name: 'Display Board', role: 'display',
        status: 'approved', approvedAt: Date.now(), userAgent: navigator.userAgent,
      }, { merge: true });
    } catch(e) { /* non-critical */ }
    const displayUser = { id:'display', name:'Display Board', role:'display', pin: stateRef.current.displayPin || '9999' };
    try { localStorage.setItem('sft-session', JSON.stringify({ user: displayUser, loginDate: new Date().toDateString() })); } catch(e) {}
    setDeviceStatus('approved');
    setCurrentUser(displayUser);
  }

  async function handleAdminDeviceOverride(adminUser, devId) {
    try {
      await setDoc(doc(db, 'devices', devId), {
        deviceId: devId,
        name: adminUser.name || 'Admin Device',
        role: 'admin',
        status: 'approved',
        requestedAt: Date.now(),
        approvedAt: Date.now(),
        userAgent: navigator.userAgent,
      }, { merge: true });
    } catch(e) { /* non-critical — still let them in */ }
    try { localStorage.setItem('sft-session', JSON.stringify({ user: adminUser, loginDate: new Date().toDateString() })); } catch(e) {}
    setDeviceStatus('approved');
    setCurrentUser(adminUser);
  }

  // Login screen is ALWAYS shown first — display PIN 9999 works on any device
  if (!currentUser) {
    const nonTechUsers = USERS.filter(u => u.role !== "tech");
    const dynamicTechs = (state.techs||DEFAULT_TECHS).map(t => ({ ...t, role:"tech" }));
    const displayUser = { id:"display", name:"Display Board", role:"display", pin: state.displayPin || "9999" };
    const loginUsers = [...nonTechUsers, ...dynamicTechs, displayUser];
    function handleLogin(user) {
      try { localStorage.setItem('sft-session', JSON.stringify({ user, loginDate: new Date().toDateString() })); } catch(e) {}
      setCurrentUser(user);
      if (user.role === 'admin') {
        (async () => {
          try {
            await setDoc(doc(db, 'devices', deviceId.current), {
              deviceId: deviceId.current,
              name: user.name,
              role: user.role,
              status: 'approved',
              approvedAt: Date.now(),
              userAgent: navigator.userAgent,
            }, { merge: true });
            setDeviceStatus('approved');
          } catch(e) { /* non-critical */ }
        })();
      }
    }
    return <LoginScreen onLogin={handleLogin} users={loginUsers} />;
  }

  // ── Device gate — only for non-display users on unapproved devices ──────────
  if (currentUser.role !== 'display' && deviceStatus !== 'approved') {
    if (deviceStatus === 'checking') {
      return (
        <div style={{ minHeight:'100vh', background:'#000', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:16, fontFamily:'-apple-system,sans-serif' }}>
          <WFLogo size={64} radius={10} />
          <div style={{ fontSize:14, color:'rgba(255,255,255,0.3)', letterSpacing:'0.02em' }}>Verifying device…</div>
        </div>
      );
    }
    if (deviceStatus === 'unregistered') {
      return <RequestAccessScreen deviceId={deviceId.current} onRequested={() => setDeviceStatus('pending')} onAdminOverride={(user, devId) => handleAdminDeviceOverride(user, devId)} onDisplayBypass={() => handleDisplayBypass(deviceId.current)} />;
    }
    if (deviceStatus === 'pending') {
      return <PendingScreen deviceId={deviceId.current} onAdminOverride={(user, devId) => handleAdminDeviceOverride(user, devId)} onRecheck={() => setDeviceStatus('checking')} onDisplayBypass={() => handleDisplayBypass(deviceId.current)} />;
    }
    if (deviceStatus === 'denied') {
      return (
        <div style={{ minHeight:'100vh', background:'#000', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:20, padding:32, fontFamily:'-apple-system,sans-serif' }}>
          <WFLogo size={72} radius={11} />
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:24, fontWeight:700, color:'#FF453A', marginBottom:8 }}>Access Denied</div>
            <div style={{ fontSize:14, color:'rgba(255,255,255,0.4)', lineHeight:1.7 }}>This device has been denied access.<br/>Contact your admin for assistance.</div>
          </div>
          <div style={{ fontSize:10, color:'rgba(255,255,255,0.1)', fontFamily:'monospace', textAlign:'center', marginTop:8 }}>{deviceId.current}</div>
          <button onClick={() => handleLogout()} style={{ marginTop:8, padding:'8px 20px', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:10, color:'rgba(255,255,255,0.3)', fontSize:12, cursor:'pointer' }}>← Back to login</button>
        </div>
      );
    }
  }

  if (currentUser && currentUser.role === 'display') {
    return (
      <DisplayScreen
        state={state}
        onLogout={() => setCurrentUser(null)}
      />
    );
  }

  return (
    <div
      style={{ fontFamily:"-apple-system,BlinkMacSystemFont,'SF Pro Text','Barlow',sans-serif", background:"radial-gradient(ellipse at 50% 0%, #0A0F1F 0%, #000000 55%)", minHeight:"100vh", maxWidth:"100vw", overflow:"hidden", color:TEXT }}
    >
      {/* Moving banner */}
      {!isDisplay && movingRO && (
        <div style={{ position:"fixed", top:0, left:0, right:0, zIndex:400, background:ACCENT, padding:"10px 16px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ color:"#fff", fontWeight:700, fontSize:13, display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ background:"rgba(255,255,255,0.2)", borderRadius:8, padding:"2px 8px", fontSize:11 }}>MOVING</span>
            {movingRO.roNum} — tap any column or queue to place it
          </div>
          <button onClick={() => setMovingRO(null)} style={{ background:"rgba(255,255,255,0.2)", border:"none", color:"#fff", borderRadius:8, padding:"5px 12px", fontSize:12, fontWeight:700, cursor:"pointer" }}>
            Cancel
          </button>
        </div>
      )}
      {/* Header */}
      <div style={{ background:"rgba(10,14,24,0.92)", backdropFilter:"blur(40px)", WebkitBackdropFilter:"blur(40px)", borderBottom:"0.5px solid rgba(255,255,255,0.08)", borderTop:"0.5px solid rgba(255,255,255,0.06)", padding:isWide?"10px 24px":"9px 14px", display:"flex", alignItems:"center", gap:12, position:"sticky", top: isDisplay ? 0 : movingRO ? 44 : 0, zIndex:300, boxShadow:"0 4px 24px rgba(0,0,0,0.4), 0 1px 0 rgba(255,255,255,0.05) inset", overflowX:"auto", WebkitOverflowScrolling:"touch", flexWrap:"nowrap" }}>
        {isDisplay ? (
          // ── Display mode header: logo+title | hours bar | clock | dot ──
          <>
            <div onClick={() => handleLogout()} style={{ flexShrink:0, display:"flex", alignItems:"center", gap:10, cursor:"pointer" }} title="Tap to logout">
              <div style={{ filter:"drop-shadow(0 2px 8px rgba(10,132,255,0.4))" }}>
                <WFLogo size={34} radius={7} />
              </div>
              <div>
                <div style={{ color:TEXT, fontWeight:700, fontSize:"clamp(12px,1.4vw,18px)", letterSpacing:"-0.3px", fontFamily:"'Space Grotesk',-apple-system,sans-serif", whiteSpace:"nowrap" }}>
                  <span style={{color:TEXT}}>Service </span><span style={{color:TEXT2}}>Department</span>
                </div>
                <div style={{ color:TEXT3, fontSize:"clamp(9px,0.9vw,12px)", marginTop:1 }}>tap to logout</div>
              </div>
            </div>
            <div style={{ flex:1, display:"flex", justifyContent:"center", alignItems:"center", padding:"0 12px" }}>
              <div style={{ width:"clamp(280px,40vw,600px)", background:"rgba(14,18,30,0.9)", borderRadius:12, padding:"clamp(6px,0.8vh,10px) clamp(12px,1.5vw,20px)", border:"0.5px solid rgba(255,255,255,0.08)", boxShadow:"0 1px 0 rgba(255,255,255,0.08) inset, 0 2px 8px rgba(0,0,0,0.4)", borderTop:"0.5px solid rgba(255,255,255,0.12)" }}>
                {/* Top row: flagged hours + revenue */}
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:"clamp(4px,0.5vh,6px)" }}>
                  <div style={{ display:"flex", alignItems:"baseline", gap:4 }}>
                    <span style={{ fontSize:"clamp(18px,2vw,28px)", fontWeight:800, color:SUCCESS, fontFamily:"'Barlow',sans-serif", lineHeight:1 }}>{flagged.toFixed(1)}</span>
                    <span style={{ fontSize:"clamp(12px,1.2vw,18px)", fontWeight:600, color:"rgba(255,255,255,0.35)", fontFamily:"'Barlow',sans-serif" }}>/ {GOAL_HOURS}h</span>
                  </div>
                  <span style={{ fontSize:"clamp(11px,1vw,15px)", fontWeight:700, color:SUCCESS, fontFamily:"'Barlow',sans-serif" }}>
                    ${(flagged * parseFloat(localStorage.getItem("sft-labor-rate")||"125")).toLocaleString("en-US", {maximumFractionDigits:0})}
                  </span>
                </div>
                {/* Progress bar */}
                <div style={{ height:"clamp(5px,0.7vh,8px)", background:"rgba(255,255,255,0.1)", borderRadius:4, overflow:"hidden", marginBottom:"clamp(5px,0.6vh,8px)" }}>
                  <div style={{ width:(progress*100)+"%", height:"100%", background:"linear-gradient(90deg,#30D158,#0A84FF)", borderRadius:4, transition:"width 0.6s ease" }} />
                </div>
                {/* Per-tech chips */}
                <div style={{ display:"flex", gap:"clamp(4px,0.5vw,8px)", flexWrap:"wrap" }}>
                  {state.techs.map(t => {
                    const hrs = techStats(t.id).hrs;
                    const chipColor = hrs >= 8 ? SUCCESS : hrs >= 4 ? "#FF9F0A" : DANGER;
                    return (
                      <div key={t.id} style={{ display:"flex", alignItems:"center", gap:3, background:"rgba(255,255,255,0.06)", borderRadius:6, padding:"2px 7px", border:"0.5px solid rgba(255,255,255,0.1)" }}>
                        <span style={{ fontSize:"clamp(9px,0.8vw,12px)", color:"rgba(255,255,255,0.6)", fontFamily:"'Barlow',sans-serif", fontWeight:600 }}>{t.name.split(" ")[0]}</span>
                        <span style={{ fontSize:"clamp(9px,0.8vw,12px)", color:chipColor, fontFamily:"'Barlow',sans-serif", fontWeight:700 }}>{hrs.toFixed(1)}h</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            <LiveClock />
            <div title={connected?"Live":"Disconnected"} style={{ width:9, height:9, borderRadius:"50%", background:connected?SUCCESS:DANGER, flexShrink:0, boxShadow:connected?"0 0 6px "+SUCCESS:"none", animation:"pulse 2s ease-in-out infinite" }} />
          </>
        ) : (
          // ── Normal header ──
          <>
            <div style={{ flexShrink:0, filter:"drop-shadow(0 2px 8px rgba(10,132,255,0.4))" }}>
              <WFLogo size={34} radius={7} />
            </div>
            <div style={{ flexShrink:0 }}>
              <div style={{ color:TEXT, fontWeight:700, fontSize:isWide?15:14, letterSpacing:"-0.3px", fontFamily:"'Space Grotesk',-apple-system,sans-serif" }}><span style={{color:TEXT}}>Worq</span><span style={{background:"linear-gradient(135deg,#60B3FF,#0A84FF)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>flow</span></div>
              <div style={{ color:TEXT3, fontSize:10, marginTop:1, letterSpacing:"0.1px" }}>{currentUser.name}</div>
            </div>
            <LiveClock />
            {!isAdvisor && (
              <div style={{ flex:1, display:"flex", justifyContent:"center" }}>
                <div style={{ background:"rgba(14,18,30,0.9)", borderRadius:12, padding:"8px 16px", display:"flex", alignItems:"center", gap:12, minWidth:isWide?260:130, border:"0.5px solid rgba(255,255,255,0.08)", boxShadow:"0 1px 0 rgba(255,255,255,0.08) inset, 0 2px 8px rgba(0,0,0,0.4)", borderTop:"0.5px solid rgba(255,255,255,0.12)" }}>
                  <span style={{ color:SUCCESS, display:"flex", alignItems:"center" }}><DollarIcon /></span>
                  <div style={{ flex:1 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:4 }}>
                      <span style={{ fontSize:isWide?16:13, fontWeight:800, color:"#F0F4FF", fontFamily:"'Barlow',sans-serif" }}>
                        <span style={{ color:SUCCESS }}>{flagged.toFixed(1)}</span>
                        <span style={{ color:"rgba(255,255,255,0.35)", fontSize:10, fontWeight:600 }}> / {GOAL_HOURS}h</span>
                      </span>
                      <span style={{ fontSize:10, color:"rgba(255,255,255,0.35)", fontWeight:600 }}>Flagged</span>
                    </div>
                    <div style={{ height:5, background:"rgba(255,255,255,0.1)", borderRadius:3, overflow:"hidden" }}>
                      <div style={{ width:(progress*100)+"%", height:"100%", background:"linear-gradient(90deg,#0A84FF,#30D158)", borderRadius:3 }} />
                    </div>
                  </div>
                </div>
              </div>
            )}
            {/* icons: admin on all screens, tech on desktop only; manager + advisor never */}
            {(isAdmin || (isTech && isWide)) && <div style={{ display:"flex", gap:8, minWidth:"max-content", ...(!isWide && isAdmin ? { overflowX:"auto", flexShrink:0, maxWidth:"calc(100vw - 150px)", WebkitOverflowScrolling:"touch", scrollbarWidth:"none", msOverflowStyle:"none", paddingBottom:2 } : {}) }}>
              {canSeeAll && (
                <button onClick={() => setShowAnalytics(true)} title="Analytics" style={{ width:36, height:36, borderRadius:10, border:"1px solid rgba(255,255,255,0.12)", background:"rgba(255,255,255,0.07)", color:"#94A3B8", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <AnalyticsIcon />
                </button>
              )}
              {(isAdmin || isManager) && (
                <button onClick={() => setShowReport(true)} title="Generate Report" style={{ width:36, height:36, borderRadius:10, border:"1px solid rgba(255,255,255,0.12)", background:"rgba(255,255,255,0.07)", color:"#94A3B8", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <ReportIcon />
                </button>
              )}
              {canSeeAll && (
                <button onClick={() => setShowHistory(true)} title="RO History" style={{ width:36, height:36, borderRadius:10, border:"1px solid rgba(255,255,255,0.12)", background:"rgba(255,255,255,0.07)", color:"#94A3B8", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <HistoryIcon />
                </button>
              )}
              {canSeeAll && (
                <button onClick={() => setShowArchive(true)} style={{ width:36, height:36, borderRadius:10, border:"1px solid rgba(255,255,255,0.12)", background:"rgba(255,255,255,0.07)", color:"#94A3B8", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <BoxIcon />
                </button>
              )}
              {canSettings && (
                <>
                  <button onClick={() => setShowDevices(true)} title="Device Access" style={{ width:36, height:36, borderRadius:10, border:"1px solid rgba(255,255,255,0.12)", background:"rgba(255,255,255,0.07)", color:"#94A3B8", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontSize:17 }}>
                    📱
                  </button>
                  <button onClick={() => setShowServiceTypes(true)} title="Settings" style={{ width:36, height:36, borderRadius:10, border:"1px solid rgba(255,255,255,0.12)", background:"rgba(255,255,255,0.07)", color:"#94A3B8", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <SettingsIcon />
                  </button>
                </>
              )}
              {canCreateRO && (
                <button onClick={() => setShowAdd(true)} style={{ height:34, padding:"0 16px", borderRadius:20, border:"none", background:ACCENT, color:"#fff", cursor:"pointer", display:"flex", alignItems:"center", gap:6, fontFamily:"-apple-system,BlinkMacSystemFont,'SF Pro Text',sans-serif", fontWeight:600, fontSize:13, letterSpacing:"-0.1px", boxShadow:"0 4px 16px rgba(10,132,255,0.45)" }}>
                  <PlusIcon /> Add RO
                </button>
              )}
              {isAdmin && (
                <button onClick={() => setShowActivityReport(true)} title="Activity Report" style={{ width:36, height:36, borderRadius:10, border:"1px solid rgba(255,255,255,0.12)", background:"rgba(255,255,255,0.07)", color:"#94A3B8", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>
                  🏃
                </button>
              )}
              {isAdmin && (
                <button onClick={() => setShowTimeClock(true)} title="Time Clock" style={{ width:36, height:36, borderRadius:10, border:"1px solid rgba(255,255,255,0.12)", background:"rgba(255,255,255,0.07)", color:"#94A3B8", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <TimeClockIcon />
                </button>
              )}
              <button onClick={() => setShowChangePin(true)} title="Change PIN" style={{ width:36, height:36, borderRadius:10, border:"1px solid rgba(255,255,255,0.12)", background:"rgba(255,255,255,0.07)", color:"#94A3B8", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <KeyIcon />
              </button>
            </div>}
            {(isAdmin || (isTech && isWide)) && (
              <button onClick={() => handleLogout()} title="Switch Account" style={{ flexShrink:0, width:36, height:36, borderRadius:10, border:"1px solid rgba(255,255,255,0.12)", background:"rgba(255,255,255,0.07)", color:"#94A3B8", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <LogoutIcon />
              </button>
            )}
          </>
        )}
      </div>
      <div style={{ padding:"10px 0 60px", marginTop: isDisplay ? 0 : movingRO ? 44 : 0 }}>
        {/* Grid — fluid on wide (fills screen), scrollable on mobile */}
        <div style={{ overflowX: useFluid ? "hidden" : "auto", WebkitOverflowScrolling:"touch", paddingBottom:4, paddingLeft:14, paddingRight:14, scrollSnapType: useFluid ? "none" : "x proximity" }}>
          <div style={{ display:"inline-flex", flexDirection:"column", width: useFluid ? "100%" : "auto" }}>
            {/* Column headers */}
            <div style={{ display:"flex", gap:GAP, marginBottom:6 }}>
              {/* Spacer matching tech col width */}
              <div style={{ width:TECH_W, minWidth:TECH_W, flexShrink:0 }} />
              {COLS.map(col => (
                <div key={col.id} style={{ flex: useFluid ? 1 : "none", width: useFluid ? "auto" : CELL_W_MOBILE, minWidth: useFluid ? 0 : CELL_W_MOBILE, display:"flex", justifyContent:"center" }}>
                  <div style={{ background:"rgba(255,255,255,0.04)", color:col.color, padding:"5px 12px", fontSize:isWide?11:10, fontWeight:700, letterSpacing:"0.6px", whiteSpace:"nowrap", textTransform:"uppercase", borderRadius:"8px 8px 0 0", borderTop:"0.5px solid rgba(255,255,255,0.12)", borderLeft:"0.5px solid rgba(255,255,255,0.07)", borderRight:"0.5px solid rgba(255,255,255,0.07)", boxShadow:"0 -2px 8px rgba(0,0,0,0.3)", borderBottom:"2px solid "+col.color }}>
                    {col.label}
                  </div>
                </div>
              ))}
            </div>
            {/* Tech rows */}            {visibleTechs.map(tech => {
              const { count, hrs, cumulative } = techStats(tech.id);
              return (
                <div key={tech.id} style={{ display:"flex", gap:GAP, marginBottom:GAP, alignItems:"stretch", width:"100%" }}>
                  {/* Tech card */}
                  <div style={{ width:TECH_W, minWidth:TECH_W, flexShrink:0, background:TECH_BG, borderRadius:12, padding:"10px 10px", boxShadow:"0 1px 0 rgba(255,255,255,0.10) inset, 0 -1px 0 rgba(0,0,0,0.5) inset, 0 4px 16px rgba(0,0,0,0.5), 0 1px 3px rgba(0,0,0,0.6)", border:"0.5px solid rgba(255,255,255,0.08)", borderTop:"0.5px solid rgba(255,255,255,0.14)", display:"flex", flexDirection:"column", gap:6 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <div style={{ width:30, height:30, borderRadius:"50%", background:"linear-gradient(135deg,#1D6BF3,#0EA5E9)", color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontSize:11, flexShrink:0 }}>
                      {initials(tech.name)}
                    </div>
                    <div style={{ minWidth:0 }}>
                      <div style={{ fontWeight:500, fontSize:11, color:TEXT2, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", letterSpacing:"-0.1px" }}>{tech.name}</div>
                      <div style={{ fontSize:10, color:TEXT3, marginTop:2, display:"flex", gap:5, letterSpacing:"0.1px", alignItems:"center" }}>
                        {!isAdvisor && <span style={{ color:SUCCESS, fontWeight:500, letterSpacing:"0.1px" }}>{hrs.toFixed(1)}h</span>}
                        <span style={{ color:TEXT3 }}>{cumulative}</span>
                        {isAdmin && isClockedIn(tech.id) && (
                          <span style={{ width:5, height:5, borderRadius:"50%", background:SUCCESS, display:"inline-block", animation:"pulse 1.5s ease-in-out infinite" }}/>
                        )}
                        {(() => {
                          const active = (state.activityLog||[]).find(e => e.userId === tech.id && !e.endTime);
                          if (!active) return null;
                          const act = ACTIVITIES.find(a => a.id === active.activityId);
                          if (!act) return null;
                          return (
                            <span style={{ background:act.color+"22", color:act.color, fontSize:8, fontWeight:600, padding:"1px 5px", borderRadius:4, display:"flex", alignItems:"center", gap:2, animation:"pulse 1.5s ease-in-out infinite" }}>
                              {act.emoji} Away
                            </span>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                  {/* Activity controls — admin sees all techs, tech sees own row only */}
                  {(isAdmin || (isTech && tech.id === currentUser?.id)) && !isDisplay && (
                    <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                      {/* Activity buttons */}
                      <div style={{ display:"flex", gap:4 }}>
                        {(() => {
                          const active = (state.activityLog||[]).find(e => e.userId === tech.id && !e.endTime);
                          if (active) {
                            const act = ACTIVITIES.find(a => a.id === active.activityId);
                            const elapsed = Math.floor((Date.now() - active.startTime) / 1000);
                            const elapsedStr = elapsed >= 3600
                              ? `${Math.floor(elapsed/3600)}h ${Math.floor((elapsed%3600)/60)}m`
                              : `${Math.floor(elapsed/60)}m ${elapsed%60}s`;
                            return (
                              <button
                                onClick={() => handleStopActivity(active)}
                                style={{ flex:1, background:act?.color+"22", color:act?.color, border:"1px solid "+act?.color+"55", borderRadius:8, padding:"6px 4px", fontSize:9, fontWeight:700, cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", justifyContent:"center", gap:3, flexDirection:"column", lineHeight:1.3 }}>
                                <span>{act?.emoji} {act?.label}</span>
                                <span style={{ fontSize:8, opacity:0.8 }}>{elapsedStr} · tap to stop</span>
                              </button>
                            );
                          }
                          return ACTIVITIES.map(act => (
                            <button key={act.id}
                              onClick={() => handleStartActivity(act.id, tech.id)}
                              style={{ flex:1, background:"rgba(255,255,255,0.04)", color:TEXT3, border:"0.5px solid rgba(255,255,255,0.1)", borderRadius:8, padding:"6px 4px", fontSize:9, fontWeight:600, cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", justifyContent:"center", gap:2, flexDirection:"column", lineHeight:1.3 }}>
                              <span style={{ fontSize:13 }}>{act.emoji}</span>
                              <span style={{ fontSize:8 }}>{act.label}</span>
                            </button>
                          ));
                        })()}
                      </div>
                      {/* Clock in/out button */}
                      {isClockedIn(tech.id) ? (
                        <button onClick={() => handleClockOut(tech.id)}
                          style={{ width:"100%", background:"rgba(255,69,58,0.12)", color:DANGER, border:"0.5px solid rgba(255,69,58,0.3)", borderRadius:8, padding:"5px 4px", fontSize:9, fontWeight:600, cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", justifyContent:"center", gap:3 }}>
                          🔴 Clock Out
                        </button>
                      ) : (
                        <button onClick={() => handleClockIn(tech.id)}
                          style={{ width:"100%", background:"rgba(48,209,88,0.12)", color:SUCCESS, border:"0.5px solid rgba(48,209,88,0.3)", borderRadius:8, padding:"5px 4px", fontSize:9, fontWeight:600, cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", justifyContent:"center", gap:3 }}>
                          🟢 Clock In
                        </button>
                      )}
                    </div>
                  )}
                  </div>
                  {/* Kanban cells — flex:1 on wide to fill screen */}
                  {COLS.map(col => {
                    const ids = state.grid[tech.id] ? (state.grid[tech.id][col.id]||[]) : [];
                    const isTarget = !isDisplay && movingRO && !ids.includes(movingRO.id);
                    return (
                      <div
                        key={col.id}
                        onClick={() => { if (isTarget) handleMove({ type:"grid", techId:tech.id, colId:col.id }); }}
                        style={{
                          flex: useFluid ? 1 : "none",
                          width: useFluid ? "auto" : CELL_W_MOBILE,
                          minWidth: useFluid ? 0 : CELL_W_MOBILE,
                          flexShrink: useFluid ? 1 : 0,
                          background: isTarget ? "rgba(10,132,255,0.10)" : CELL_BG,
                          border: "0.5px solid "+(isTarget?"#0A84FF":col.border),
                          borderRadius: 12,
                          padding: ids.length ? "7px 7px 2px" : 0,
                          display: "flex",
                          flexDirection: "column",                          alignItems: ids.length ? "stretch" : "center",
                          justifyContent: ids.length ? "flex-start" : "center",
                          minHeight: 82,
                          boxSizing: "border-box",
                          cursor: isTarget ? "pointer" : "default",
                          boxShadow: isTarget ? "0 0 0 1.5px #0A84FF, "+CELL_SHADOW : CELL_SHADOW,
                          backdropFilter: "blur(4px)",
                          WebkitBackdropFilter: "blur(4px)",
                        }}
                      >
                        {ids.length === 0 ? (
                          isTarget ? (
                            <span style={{ color:ACCENT, fontSize:9, fontWeight:500, textAlign:"center", padding:"0 6px", letterSpacing:"0.3px", animation:"pulse 1.5s ease-in-out infinite" }}>
                              Tap to place here
                            </span>
                          ) : (
                            <div style={{ padding:"6px 8px", width:"100%", boxSizing:"border-box", opacity:0.3 }}>
                              <SkeletonCard />
                            </div>
                          )
                        ) : (
                          ids.map(roId => {
                            const ro = getRO(roId);
                            if (!ro) return null;
                            return renderCard(ro, col.id);
                          })
                        )}
                        {ids.length > 0 && isTarget && (
                          <div style={{ margin:"4px 0 6px", padding:"7px", background:"rgba(10,132,255,0.1)", borderRadius:8, textAlign:"center", color:ACCENT, fontSize:10, fontWeight:500, cursor:"pointer", letterSpacing:"0.2px" }}>
                            + Place here
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
        {/* ── WAITING ON PARTS QUEUE ── */}
        {(() => {
          const partIds = state.partsSlots || [];
          const isPartsTarget = !isDisplay && movingRO && !partIds.includes(movingRO.id);
          return (
            <div style={{ padding:"10px 14px 0" }}>              <div style={{ background:"rgba(14,18,30,0.97)", borderRadius:16, overflow:"hidden", border:"0.5px solid "+(isPartsTarget?"#BF5AF2":"rgba(255,255,255,0.07)"), borderTop:"0.5px solid "+(isPartsTarget?"rgba(191,90,242,0.5)":"rgba(255,255,255,0.12)"), backdropFilter:"blur(20px)", WebkitBackdropFilter:"blur(20px)", boxShadow:"0 1px 0 rgba(255,255,255,0.09) inset, 0 8px 32px rgba(0,0,0,0.6)" }}>
                {/* Header */}
                <div style={{ background:"linear-gradient(135deg,rgba(191,90,242,0.3),rgba(191,90,242,0.15))", padding:"12px 14px", display:"flex", alignItems:"center", gap:10 }}>
                  <div style={{ width:28, height:28, background:"rgba(191,90,242,0.25)", borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, flexShrink:0 }}>
🔩</div>
                  <div style={{ flex:1 }}>
                    <div style={{ color:TEXT, fontWeight:700, fontSize:14, letterSpacing:"-0.2px" }}>Waiting on Parts</div>
                    <div style={{ color:"rgba(255,255,255,0.45)", fontSize:10, marginTop:1 }}>Parts ordered — waiting for arrival</div>
                  </div>
                  <div style={{ background:"rgba(191,90,242,0.3)", color:"#E5B8FF", borderRadius:20, padding:"2px 10px", fontSize:12, fontWeight:700, flexShrink:0 }}>{partIds.length}</div>
                  {!isDisplay && <button onClick={()=>setPartsCollapsed(c=>!c)} style={{ background:"none", border:"none", color:"rgba(255,255,255,0.5)", cursor:"pointer", display:"flex", alignItems:"center", flexShrink:0, padding:4 }}>
                    {partsCollapsed ? <ChevDownIcon/> : <ChevUpIcon/>}
                  </button>}
                </div>
                {/* Body */}
                {(!partsCollapsed || isDisplay) && (
                  <div style={{ padding:"10px 10px 8px" }}>
                    {partIds.length === 0 && !isPartsTarget ? (
                      <div style={{ border:"1px dashed rgba(191,90,242,0.2)", borderRadius:12, padding:"20px 16px", textAlign:"center" }}>
                        <div style={{ fontSize:24, marginBottom:8 }}>
🔩</div>
                        <div style={{ fontSize:13, color:"rgba(255,255,255,0.3)", fontWeight:500 }}>No tickets waiting on parts</div>
                        <div style={{ fontSize:11, color:"rgba(255,255,255,0.18)", marginTop:4 }}>Long press a card to move it here</div>
                      </div>
                    ) : (
                      <div style={{ maxHeight: partIds.length > 3 ? 270 : "none", overflowY: partIds.length > 3 ? "auto" : "visible", WebkitOverflowScrolling:"touch" }}>
                        {partIds.map(roId => { const ro = getRO(roId); if (!ro) return null; return renderCard(ro, "waiting"); })}
                      </div>
                    )}
                    {isPartsTarget && (
                      <button onClick={()=>handleMove({type:"parts"})}
                        style={{ width:"100%", padding:12, background:"rgba(191,90,242,0.12)", color:"#E5B8FF", border:"1.5px dashed rgba(191,90,242,0.5)", borderRadius:12, fontWeight:700, fontSize:13, cursor:"pointer", fontFamily:"inherit", marginTop:partIds.length?6:0, display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
                        
 Move to Waiting on Parts
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })()}
        {/* Staging Queue */}
        <div style={{ padding:"10px 14px 0" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:2 }}>
            <div style={{ flex:1, height:"0.5px", background:"rgba(255,255,255,0.06)" }}/>
            <span style={{ fontSize:10, fontWeight:600, color:TEXT3, letterSpacing:"0.8px", textTransform:"uppercase", fontFamily:"-apple-system,BlinkMacSystemFont,'SF Pro Text',sans-serif" }}>Staging Queue</span>
            <div style={{ flex:1, height:"0.5px", background:"rgba(255,255,255,0.06)" }}/>
          </div>        </div>
        <div style={{ padding:"8px 14px 0", display:isWide?"flex":"block", gap:8, alignItems:"flex-start" }}>
          {(isWide
            ? [...state.queues].sort((a,b) => {
                const order = {"q-main":0,"q-used":1,"q-pdi":2};
                return (order[a.id]??99) - (order[b.id]??99);
              })
            : state.queues
          ).map(queue => {
            const ids = state.qSlots[queue.id] || [];
            const isCollapsed = !isDisplay && collapsed[queue.id];
            const isTarget = !isDisplay && movingRO && !ids.includes(movingRO.id);
            return (
              <div key={queue.id} style={{ flex:1, marginBottom:isWide?0:12, background:"rgba(14,18,30,0.97)", borderRadius:16, overflow:"hidden", boxShadow:"0 1px 0 rgba(255,255,255,0.09) inset, 0 -1px 0 rgba(0,0,0,0.5) inset, 0 8px 32px rgba(0,0,0,0.6), 0 2px 4px rgba(0,0,0,0.4)", border:"0.5px solid "+(isTarget?queue.color:"rgba(255,255,255,0.07)"), borderTop:"0.5px solid rgba(255,255,255,0.12)", backdropFilter:"blur(20px)", WebkitBackdropFilter:"blur(20px)" }}>
                <div style={{ background:"linear-gradient(135deg,"+queue.color+","+queue.color+"CC)", padding:"12px 14px", display:"flex", alignItems:"center", gap:10 }}>
                  <div style={{ width:28, height:28, background:"rgba(255,255,255,0.2)", borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", fontSize:14 }}>
                    {queue.icon}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ color:"#fff", fontWeight:800, fontSize:14, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{queue.name}</div>
                    <div style={{ color:"rgba(255,255,255,0.7)", fontSize:10, marginTop:1 }}>{queue.subtitle}</div>
                  </div>
                  <div style={{ background:"rgba(255,255,255,0.25)", color:"#fff", borderRadius:20, padding:"2px 10px", fontSize:12, fontWeight:800, flexShrink:0 }}>
                    {ids.length}
                  </div>
                  {isAdmin && !isDisplay && (
                    <button onClick={() => setShowAdd(true)} style={{ width:26, height:26, borderRadius:"50%", background:"rgba(255,255,255,0.25)", border:"none", color:"#fff", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                      <PlusIcon />
                    </button>
                  )}
                  {!isDisplay && <button onClick={() => setCollapsed(c => ({ ...c, [queue.id]:!c[queue.id] }))} style={{ background:"none", border:"none", color:"rgba(255,255,255,0.8)", cursor:"pointer", display:"flex", alignItems:"center", flexShrink:0 }}>
                    {isCollapsed ? <ChevDownIcon /> : <ChevUpIcon />}
                  </button>}
                </div>
                {!isCollapsed && (
                  <div style={{ padding:"10px 10px 8px" }}>
                    <div style={{ maxHeight:ids.length>3?270:"none", overflowY:ids.length>3?"auto":"visible", WebkitOverflowScrolling:"touch" }}>
                      {ids.map(roId => {
                        const ro = getRO(roId);
                        if (!ro) return null;
                        return renderCard(ro, "queue");
                      })}
                    </div>
                    {ids.length > 3 && (
                      <div style={{ textAlign:"center", fontSize:10, color:MUTED, padding:"2px 0 4px", fontWeight:600 }}>
                        Scroll to see all {ids.length}</div>
                    )}
                    {isTarget && (
                      <button onClick={() => handleMove({ type:"queue", queueId:queue.id })} style={{ width:"100%", padding:12, background:queue.color+"14", color:queue.color, border:"2px dashed "+queue.color, borderRadius:12, fontWeight:800, fontSize:13, cursor:"pointer", fontFamily:"'Barlow',sans-serif", marginTop:6, display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
                        {queue.icon} Move to {queue.name}
                      </button>
                    )}
                    {ids.length === 0 && !isTarget && (
                      <div style={{ border:"2px dashed "+BORDER, borderRadius:12, padding:18, textAlign:"center", color:MUTED, fontSize:12 }}>
                        No tickets here
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      {/* Modals */}
      {showAnalytics && (
        <AnalyticsScreen state={state} onClose={() => setShowAnalytics(false)} />
      )}
      {showTimeClock && (
        <TimeClockReport state={state} techs={state.techs} onClose={() => setShowTimeClock(false)} />
      )}
      {showActivityReport && (
        <ActivityReport activityLog={state.activityLog||[]} techs={state.techs||DEFAULT_TECHS} onClose={() => setShowActivityReport(false)} />
      )}
      {showActivity && currentUser && (
        <ActivityTracker
          currentUser={currentUser}
          activityLog={state.activityLog||[]}
          onStart={handleStartActivity}
          onStop={handleStopActivity}
          onClose={() => setShowActivity(false)}
        />
      )}
      {showChangePin && currentUser && (
        <ChangePinModal user={currentUser} onClose={() => setShowChangePin(false)} onSave={handleSavePin} />
      )}
      {showAdd && (
        <QuickAddModal onAdd={handleAddRO} onClose={() => setShowAdd(false)} nextNum={state.nextNum} serviceTypes={state.serviceTypes} />
      )}
      {showArchive && (
        <ArchiveModal archived={state.archived||[]} onClose={() => setShowArchive(false)} onRestore={handleRestore} wide={isWide} />
      )}
      {showHistory && (
        <HistoryModal archived={state.archived||[]} onClose={() => setShowHistory(false)} wide={isWide} />
      )}
      {showReport && (
        <ReportModal state={state} onClose={() => setShowReport(false)} wide={isWide} />
      )}
      {showServiceTypes && (
        <ServiceTypeSettings serviceTypes={state.serviceTypes||DEFAULT_SERVICE_TYPES} jobPresets={state.jobPresets||DEFAULT_JOB_PRESETS} techs={state.techs||DEFAULT_TECHS} displayPin={state.displayPin||"9999"} onClose={() => setShowServiceTypes(false)} onSave={handleSaveServiceTypes} onSaveJobs={handleSaveJobPresets} onSaveTechs={handleSaveTechs} onSaveDisplayPin={handleSaveDisplayPin} wide={isWide} />
      )}
      {showDevices && (
        <DeviceManagerModal onClose={() => setShowDevices(false)} />
      )}
      {detailRO && !movingRO && (
        <RODetail
          ro={detailRO.ro}
          colId={detailRO.colId}
          timer={state.timers[detailRO.ro.id]}
          onClose={() => setDetailRO(null)}
          onSave={f => { handleSaveRO(f); setDetailRO(d => ({ ...d, ro:{ ...d.ro, ...f } })); }}
          onDelete={handleDeleteRO}
          onArchive={handleArchive}
          onTimer={handleTimer}
          onHoursChange={(id, val) => { handleHoursChange(id, val); setDetailRO(d => ({ ...d, ro:{ ...d.ro, hours:val } })); }}
          wide={isWide}
          isAdmin={isAdmin}
          isTech={isTech}
          serviceTypes={state.serviceTypes}
          jobPresets={state.jobPresets}
          currentUser2={currentUser}
          onAddNote={(roId, text, author) => { handleAddNote(roId, text, author); setDetailRO(d => ({ ...d, ro:{ ...d.ro, roNotes:[...(d.ro.roNotes||[]), {id:Date.now(), text, author, time:Date.now()}] } })); }}
        />
      )}
    </div>
  );
}