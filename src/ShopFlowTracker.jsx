import React, { useState, useEffect, useRef, useCallback } from 'react'
import { doc, setDoc, onSnapshot } from 'firebase/firestore'
import { db } from './firebase'

// ─── Constants ────────────────────────────────────────────────────────────────

const PIN_MAP = {
  '052513': { name: 'AD',        role: 'admin'   },
  '1000':   { name: 'Jay',       role: 'manager' },
  '2000':   { name: 'Mario',     role: 'advisor' },
  '1111':   { name: 'Type S',    role: 'tech'    },
  '2222':   { name: 'LA',        role: 'tech'    },
  '3333':   { name: 'Darcheezy', role: 'tech'    },
  '4444':   { name: 'Jason',     role: 'tech'    },
}

const TECHS = ['Type S', 'LA', 'Darcheezy', 'Jason']

const SVC_META = {
  'Main Shop': { color: '#EF4444' },
  'PDI':       { color: '#9333EA' },
  'Used Cars': { color: '#16A34A' },
}

const COLUMNS = [
  { id: 'onDeck',      label: 'On Deck'       },
  { id: 'inProgress',  label: 'In Progress'   },
  { id: 'completedQC', label: 'Completed / QC' },
  { id: 'delivered',   label: 'Delivered'     },
]

const PRIORITY_META = {
  normal: { label: 'Normal', color: '#8E8E93' },
  high:   { label: 'High',   color: '#FF9F0A' },
  urgent: { label: 'Urgent', color: '#FF453A' },
}

const NOW = Date.now()

const SAMPLE_ROS = [
  {
    id: 'RO-1001', roNumber: 'RO-1001', serviceType: 'Main Shop',
    vehicle: '2022 Toyota Camry', customer: 'John Smith',
    priority: 'normal', flatRateHours: 2.5, jobs: ['Oil Change', 'Tire Rotation'],
    promiseTime: '3:00 PM', concern: 'Customer reports noise from front',
    column: 'onDeck', tech: null, timerStart: null, timerElapsed: 0,
    notes: [], cause: '', correction: '', waitingOnParts: false, createdAt: NOW - 3600000,
  },
  {
    id: 'RO-1002', roNumber: 'RO-1002', serviceType: 'PDI',
    vehicle: '2024 Honda Accord', customer: 'New Delivery',
    priority: 'high', flatRateHours: 3.0, jobs: ['PDI Inspection'],
    promiseTime: '2:00 PM', concern: 'Pre-delivery inspection',
    column: 'inProgress', tech: 'Type S', timerStart: NOW - 3600000, timerElapsed: 0,
    notes: [], cause: '', correction: '', waitingOnParts: false, createdAt: NOW - 7200000,
  },
  {
    id: 'RO-1003', roNumber: 'RO-1003', serviceType: 'Used Cars',
    vehicle: '2019 Ford F-150', customer: 'Used Car Lot',
    priority: 'normal', flatRateHours: 4.0, jobs: ['Brake Inspection', 'Oil Change'],
    promiseTime: '5:00 PM', concern: 'Full inspection needed',
    column: 'inProgress', tech: 'LA', timerStart: NOW - 7200000, timerElapsed: 0,
    notes: [], cause: '', correction: '', waitingOnParts: false, createdAt: NOW - 10800000,
  },
  {
    id: 'RO-1004', roNumber: 'RO-1004', serviceType: 'Main Shop',
    vehicle: '2021 Chevrolet Silverado', customer: 'Mike Johnson',
    priority: 'urgent', flatRateHours: 1.5, jobs: ['Battery Replacement'],
    promiseTime: '1:00 PM', concern: "Vehicle won't start",
    column: 'completedQC', tech: 'Darcheezy', timerStart: null, timerElapsed: 5400000,
    notes: [], cause: 'Dead battery', correction: 'Replaced battery',
    waitingOnParts: false, createdAt: NOW - 14400000,
  },
  {
    id: 'RO-1005', roNumber: 'RO-1005', serviceType: 'Main Shop',
    vehicle: '2020 BMW 3 Series', customer: 'Sarah Davis',
    priority: 'normal', flatRateHours: 2.0, jobs: ['Alignment'],
    promiseTime: '4:00 PM', concern: 'Pulling to the right',
    column: 'onDeck', tech: null, timerStart: null, timerElapsed: 0,
    notes: [], cause: '', correction: '', waitingOnParts: false, createdAt: NOW - 1800000,
  },
  {
    id: 'RO-87045', roNumber: 'RO-87045', serviceType: 'Main Shop',
    vehicle: '2023 Mercedes C300', customer: 'Robert Wilson',
    priority: 'high', flatRateHours: 3.5, jobs: ['Engine Diagnostics', 'Oil Change'],
    promiseTime: '3:30 PM', concern: 'Check engine light on',
    column: 'inProgress', tech: 'Jason', timerStart: NOW - 1800000, timerElapsed: 0,
    notes: [], cause: '', correction: '', waitingOnParts: false, createdAt: NOW - 5400000,
  },
  {
    id: 'RO-55922', roNumber: 'RO-55922', serviceType: 'PDI',
    vehicle: '2024 Lexus ES350', customer: 'New Delivery',
    priority: 'normal', flatRateHours: 2.5, jobs: ['PDI Inspection', 'Detail'],
    promiseTime: '11:00 AM', concern: 'Pre-delivery inspection',
    column: 'onDeck', tech: null, timerStart: null, timerElapsed: 0,
    notes: [], cause: '', correction: '', waitingOnParts: false, createdAt: NOW - 900000,
  },
  {
    id: 'RO-56003', roNumber: 'RO-56003', serviceType: 'Used Cars',
    vehicle: '2018 Jeep Wrangler', customer: 'Used Car Lot',
    priority: 'normal', flatRateHours: 5.0,
    jobs: ['Full Inspection', 'Tire Replacement', 'Brake Service'],
    promiseTime: '6:00 PM', concern: 'Reconditioning needed',
    column: 'onDeck', tech: null, timerStart: null, timerElapsed: 0,
    notes: [], cause: '', correction: '', waitingOnParts: false, createdAt: NOW - 600000,
  },
]

const DEFAULT_STATE = {
  ros: SAMPLE_ROS,
  techClocks: {
    'Type S':    { in: false, start: null, total: 0 },
    'LA':        { in: false, start: null, total: 0 },
    'Darcheezy': { in: false, start: null, total: 0 },
    'Jason':     { in: false, start: null, total: 0 },
  },
  activity: { movingCars: false, movingStart: null, partsRun: false, partsStart: null },
  pins: { AD: '052513', Jay: '1000', Mario: '2000', 'Type S': '1111', LA: '2222', Darcheezy: '3333', Jason: '4444' },
  settings: {
    serviceTypes: ['Main Shop', 'PDI', 'Used Cars'],
    jobPresets: [
      'Oil Change', 'Tire Rotation', 'PDI Inspection', 'Brake Inspection',
      'Engine Diagnostics', 'Alignment', 'Battery Replacement', 'Detail',
      'Full Inspection', 'Tire Replacement', 'Brake Service',
    ],
  },
  archive: [],
}

// ─── Design tokens ────────────────────────────────────────────────────────────

const C = {
  bg:        '#000000',
  surface:   '#1C1C1E',
  surface2:  '#2C2C2E',
  surface3:  '#3A3A3C',
  text:      '#FFFFFF',
  text2:     '#EBEBF5',
  muted:     '#8E8E93',
  sep:       '#38383A',
  blue:      '#0A84FF',
  green:     '#30D158',
  red:       '#FF453A',
  orange:    '#FF9F0A',
  purple:    '#BF5AF2',
}

const GLOBAL_STYLE = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #000; }
  ::-webkit-scrollbar { width: 4px; height: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #3A3A3C; border-radius: 2px; }
  input, select, textarea, button { font-family: 'Space Grotesk', sans-serif; }
  textarea { resize: vertical; }
`

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtElapsed(ms) {
  if (!ms) return '0:00'
  const s = Math.floor(ms / 1000)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  return `${m}:${String(sec).padStart(2, '0')}`
}

function getLiveElapsed(ro) {
  return ro.timerElapsed + (ro.timerStart ? Date.now() - ro.timerStart : 0)
}

function genROId() {
  return 'RO-' + String(Math.floor(Math.random() * 90000 + 10000))
}

function getDefaultRole(name) {
  for (const u of Object.values(PIN_MAP)) if (u.name === name) return u.role
  return 'tech'
}

// ─── Primitive UI ─────────────────────────────────────────────────────────────

function Overlay({ onClick, children, sheet }) {
  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClick() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.82)',
        display: 'flex',
        alignItems: sheet ? 'flex-end' : 'center',
        justifyContent: 'center',
        padding: sheet ? 0 : 16,
      }}
    >
      {children}
    </div>
  )
}

function Modal({ title, onClose, children, wide }) {
  return (
    <Overlay onClick={onClose}>
      <div style={{
        background: C.surface, borderRadius: 18,
        width: wide ? 660 : 380, maxWidth: '100%', maxHeight: '88vh',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 24px 72px rgba(0,0,0,0.9)',
        overflow: 'hidden',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: `1px solid ${C.sep}`, flexShrink: 0,
        }}>
          <span style={{ color: C.text, fontWeight: 700, fontSize: 18 }}>{title}</span>
          <button onClick={onClose} style={xBtnStyle}>✕</button>
        </div>
        <div style={{ overflowY: 'auto', padding: '20px', flex: 1 }}>{children}</div>
      </div>
    </Overlay>
  )
}

const xBtnStyle = {
  background: C.surface2, border: 'none', color: C.muted,
  width: 28, height: 28, borderRadius: 14, cursor: 'pointer',
  fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center',
  flexShrink: 0,
}

function Btn({ onClick, children, variant = 'primary', small, full, disabled, style: extra }) {
  const map = {
    primary:   { bg: C.blue,    fg: '#fff'   },
    secondary: { bg: C.surface2, fg: C.text  },
    danger:    { bg: C.red,     fg: '#fff'   },
    ghost:     { bg: 'transparent', fg: C.blue },
    orange:    { bg: '#FF9F0A22', fg: C.orange },
  }
  const { bg, fg } = map[variant] || map.primary
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: disabled ? C.surface3 : bg,
        color: disabled ? C.muted : fg,
        border: 'none', borderRadius: small ? 9 : 13,
        padding: small ? '6px 12px' : '12px 18px',
        fontSize: small ? 13 : 15, fontWeight: 600,
        cursor: disabled ? 'not-allowed' : 'pointer',
        width: full ? '100%' : undefined,
        transition: 'opacity 0.15s',
        ...extra,
      }}
    >
      {children}
    </button>
  )
}

function Label({ children }) {
  return (
    <div style={{
      color: C.muted, fontSize: 11, fontWeight: 600,
      textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6,
    }}>{children}</div>
  )
}

function Field({ label, value, onChange, type = 'text', placeholder, rows, children }) {
  const inputStyle = {
    width: '100%', background: C.surface2, border: `1px solid ${C.sep}`,
    borderRadius: 10, color: C.text, fontSize: 15, padding: '10px 12px', outline: 'none',
  }
  return (
    <div style={{ marginBottom: 14 }}>
      {label && <Label>{label}</Label>}
      {children || (
        rows
          ? <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows} style={inputStyle} />
          : <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={inputStyle} />
      )}
    </div>
  )
}

function NativeSelect({ label, value, onChange, options }) {
  return (
    <div style={{ marginBottom: 14 }}>
      {label && <Label>{label}</Label>}
      <select value={value} onChange={e => onChange(e.target.value)} style={{
        width: '100%', background: C.surface2, border: `1px solid ${C.sep}`,
        borderRadius: 10, color: C.text, fontSize: 15, padding: '10px 12px', outline: 'none',
      }}>
        {options.map(o => (
          <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>
        ))}
      </select>
    </div>
  )
}

function Tag({ label, color, small }) {
  return (
    <span style={{
      background: color + '22', color,
      fontSize: small ? 10 : 11, fontWeight: 700,
      padding: small ? '2px 5px' : '3px 8px', borderRadius: 6,
      textTransform: 'uppercase', letterSpacing: 0.3,
      flexShrink: 0,
    }}>{label}</span>
  )
}

function ProgressBar({ pct, color }) {
  return (
    <div style={{ background: C.surface3, borderRadius: 4, height: 5, overflow: 'hidden' }}>
      <div style={{
        background: color || C.blue, width: `${Math.min(pct, 1) * 100}%`,
        height: '100%', borderRadius: 4, transition: 'width 0.4s',
      }} />
    </div>
  )
}

// ─── RO Card ──────────────────────────────────────────────────────────────────

function ROCard({ ro, onPress, onLongPress }) {
  const timerRef = useRef(null)
  const didLongPress = useRef(false)
  const svcColor = SVC_META[ro.serviceType]?.color || C.muted
  const prioColor = PRIORITY_META[ro.priority]?.color || C.muted
  const elapsed = getLiveElapsed(ro)
  const running = !!ro.timerStart

  function startPress() {
    didLongPress.current = false
    timerRef.current = setTimeout(() => {
      didLongPress.current = true
      onLongPress()
    }, 600)
  }
  function endPress() {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }
    if (!didLongPress.current) onPress()
    didLongPress.current = false
  }
  function cancelPress() {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }
    didLongPress.current = false
  }

  return (
    <div
      onMouseDown={startPress} onMouseUp={endPress} onMouseLeave={cancelPress}
      onTouchStart={e => { e.preventDefault(); startPress() }}
      onTouchEnd={e => { e.preventDefault(); endPress() }}
      onTouchCancel={cancelPress}
      style={{
        background: C.surface2, borderRadius: 11, padding: '9px 11px',
        marginBottom: 7, cursor: 'pointer', userSelect: 'none',
        borderLeft: `3px solid ${svcColor}`,
        boxShadow: '0 2px 6px rgba(0,0,0,0.35)',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
        <span style={{ color: C.blue, fontWeight: 700, fontSize: 13 }}>{ro.roNumber}</span>
        <Tag label={ro.priority} color={prioColor} small />
      </div>
      <div style={{ color: C.text, fontSize: 13, fontWeight: 600, marginBottom: 1, lineHeight: 1.3 }}>{ro.vehicle}</div>
      <div style={{ color: C.muted, fontSize: 11, marginBottom: 5 }}>{ro.customer}</div>
      {ro.jobs?.length > 0 && (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 5 }}>
          {ro.jobs.slice(0, 2).map(j => (
            <span key={j} style={{
              background: C.surface3, color: C.text2,
              fontSize: 10, padding: '2px 5px', borderRadius: 4,
            }}>{j}</span>
          ))}
          {ro.jobs.length > 2 && <span style={{ color: C.muted, fontSize: 10 }}>+{ro.jobs.length - 2}</span>}
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: running ? C.green : C.muted, fontSize: 11, fontFamily: 'monospace' }}>
          {running ? '▶ ' : '⏸ '}{fmtElapsed(elapsed)}
        </span>
        <span style={{ color: C.muted, fontSize: 11 }}>🕐 {ro.promiseTime}</span>
      </div>
      {ro.tech && (
        <div style={{ marginTop: 3, color: C.blue, fontSize: 11, fontWeight: 600 }}>👤 {ro.tech}</div>
      )}
      {ro.waitingOnParts && (
        <div style={{ marginTop: 3, color: C.orange, fontSize: 10, fontWeight: 700 }}>⚠ WAITING ON PARTS</div>
      )}
    </div>
  )
}

// ─── Column Drop Zone ─────────────────────────────────────────────────────────

function ColumnCell({ children, highlight }) {
  return (
    <div style={{
      background: highlight ? C.blue + '0A' : C.surface + 'BB',
      borderRadius: 12, padding: 9, minHeight: 72,
      border: `1px solid ${highlight ? C.blue + '44' : C.sep}`,
      transition: 'border-color 0.2s',
    }}>
      {children}
      {React.Children.count(children) === 0 && (
        <div style={{ color: C.surface3, fontSize: 12, textAlign: 'center', paddingTop: 18 }}>—</div>
      )}
    </div>
  )
}

// ─── New RO Modal ─────────────────────────────────────────────────────────────

function NewROModal({ settings, onSave, onClose }) {
  const [form, setForm] = useState({
    roNumber: '', serviceType: 'Main Shop', vehicle: '', customer: '',
    priority: 'normal', flatRateHours: '', jobs: [], promiseTime: '', concern: '', tech: '',
  })
  const [jobInput, setJobInput] = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const presets = settings?.jobPresets || []

  function togglePreset(j) {
    set('jobs', form.jobs.includes(j) ? form.jobs.filter(x => x !== j) : [...form.jobs, j])
  }

  function addCustomJob() {
    const t = jobInput.trim()
    if (t && !form.jobs.includes(t)) set('jobs', [...form.jobs, t])
    setJobInput('')
  }

  function submit() {
    if (!form.vehicle.trim()) return alert('Vehicle is required')
    onSave({
      ...form,
      roNumber: form.roNumber.trim() || genROId(),
      flatRateHours: parseFloat(form.flatRateHours) || 0,
      tech: form.tech || null,
    })
  }

  return (
    <Modal title="New Repair Order" onClose={onClose} wide>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
        <Field label="RO Number" value={form.roNumber} onChange={v => set('roNumber', v)} placeholder="Auto-generated" />
        <Field label="Promise Time" value={form.promiseTime} onChange={v => set('promiseTime', v)} placeholder="3:00 PM" />
        <Field label="Vehicle *" value={form.vehicle} onChange={v => set('vehicle', v)} placeholder="2024 Toyota Camry" />
        <Field label="Customer" value={form.customer} onChange={v => set('customer', v)} placeholder="John Smith" />
        <NativeSelect label="Service Type" value={form.serviceType} onChange={v => set('serviceType', v)}
          options={settings?.serviceTypes || ['Main Shop', 'PDI', 'Used Cars']} />
        <NativeSelect label="Priority" value={form.priority} onChange={v => set('priority', v)}
          options={[{ value: 'normal', label: 'Normal' }, { value: 'high', label: 'High' }, { value: 'urgent', label: 'Urgent' }]} />
        <Field label="Flat Rate Hours" value={form.flatRateHours} onChange={v => set('flatRateHours', v)} type="number" placeholder="2.5" />
        <NativeSelect label="Assign Tech" value={form.tech} onChange={v => set('tech', v)}
          options={[{ value: '', label: 'Unassigned' }, ...TECHS.map(t => ({ value: t, label: t }))]} />
      </div>
      <Field label="Customer Concern" value={form.concern} onChange={v => set('concern', v)} placeholder="Describe complaint…" rows={2} />
      <div style={{ marginBottom: 16 }}>
        <Label>Jobs</Label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
          {presets.map(j => (
            <button key={j} onClick={() => togglePreset(j)} style={{
              background: form.jobs.includes(j) ? C.blue + '22' : C.surface2,
              border: `1px solid ${form.jobs.includes(j) ? C.blue : C.sep}`,
              color: form.jobs.includes(j) ? C.blue : C.text,
              borderRadius: 8, padding: '4px 10px', fontSize: 12,
              cursor: 'pointer', transition: 'all 0.15s',
            }}>{j}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input value={jobInput} onChange={e => setJobInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addCustomJob()}
            placeholder="Custom job…"
            style={{ flex: 1, background: C.surface2, border: `1px solid ${C.sep}`, borderRadius: 10, color: C.text, fontSize: 14, padding: '8px 12px', outline: 'none' }} />
          <Btn onClick={addCustomJob} small>Add</Btn>
        </div>
        {form.jobs.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
            {form.jobs.map((j, i) => (
              <span key={i} style={{
                background: C.blue + '1A', border: `1px solid ${C.blue}44`,
                color: C.blue, borderRadius: 8, padding: '3px 8px', fontSize: 12,
                display: 'flex', alignItems: 'center', gap: 4,
              }}>
                {j}
                <button onClick={() => set('jobs', form.jobs.filter((_, idx) => idx !== i))}
                  style={{ background: 'none', border: 'none', color: C.red, cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: 0 }}>×</button>
              </span>
            ))}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <Btn variant="secondary" onClick={onClose} full>Cancel</Btn>
        <Btn onClick={submit} full>Create RO</Btn>
      </div>
    </Modal>
  )
}

// ─── Three C's Tab ────────────────────────────────────────────────────────────

function ThreeCsTab({ ro, onUpdate }) {
  const [form, setForm] = useState({ concern: ro.concern || '', cause: ro.cause || '', correction: ro.correction || '' })
  const [saved, setSaved] = useState(false)
  const save = () => { onUpdate(form); setSaved(true); setTimeout(() => setSaved(false), 2000) }
  return (
    <div>
      {['concern', 'cause', 'correction'].map(f => (
        <Field key={f} label={f} value={form[f]} onChange={v => setForm(p => ({ ...p, [f]: v }))}
          placeholder={`Enter ${f}…`} rows={3} />
      ))}
      <Btn onClick={save} full>{saved ? '✓ Saved' : "Save 3 C's"}</Btn>
    </div>
  )
}

// ─── Edit RO inline form ──────────────────────────────────────────────────────

function EditROForm({ form, setForm, onSave, onCancel }) {
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  return (
    <div>
      <Field label="Vehicle" value={form.vehicle} onChange={v => set('vehicle', v)} />
      <Field label="Customer" value={form.customer} onChange={v => set('customer', v)} />
      <Field label="Promise Time" value={form.promiseTime} onChange={v => set('promiseTime', v)} />
      <Field label="Flat Rate Hours" value={String(form.flatRateHours)} onChange={v => set('flatRateHours', v)} type="number" />
      <NativeSelect label="Priority" value={form.priority} onChange={v => set('priority', v)}
        options={[{ value: 'normal', label: 'Normal' }, { value: 'high', label: 'High' }, { value: 'urgent', label: 'Urgent' }]} />
      <NativeSelect label="Service Type" value={form.serviceType} onChange={v => set('serviceType', v)}
        options={['Main Shop', 'PDI', 'Used Cars']} />
      <NativeSelect label="Assign Tech" value={form.tech || ''} onChange={v => set('tech', v || null)}
        options={[{ value: '', label: 'Unassigned' }, ...TECHS.map(t => ({ value: t, label: t }))]} />
      <div style={{ display: 'flex', gap: 10 }}>
        <Btn variant="secondary" onClick={onCancel} full>Cancel</Btn>
        <Btn onClick={onSave} full>Save Changes</Btn>
      </div>
    </div>
  )
}

// ─── RO Detail Sheet ──────────────────────────────────────────────────────────

function RODetailSheet({ ro, currentUser, onClose, onUpdate, onDelete, onArchive, onToggleTimer, onAddNote }) {
  const [tab, setTab] = useState('details')
  const [noteText, setNoteText] = useState('')
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({ ...ro })

  useEffect(() => { setEditForm({ ...ro }) }, [ro.id])

  const elapsed = getLiveElapsed(ro)
  const running = !!ro.timerStart
  const svcColor = SVC_META[ro.serviceType]?.color || C.muted
  const canAdmin = currentUser?.role === 'admin' || currentUser?.role === 'manager'

  function submitNote() {
    if (!noteText.trim()) return
    onAddNote(noteText.trim())
    setNoteText('')
  }

  function saveEdit() {
    onUpdate({ ...editForm, flatRateHours: parseFloat(editForm.flatRateHours) || 0 })
    setEditing(false)
  }

  const colLabel = COLUMNS.find(c => c.id === ro.column)?.label || ro.column

  return (
    <Overlay onClick={onClose} sheet>
      <div style={{
        background: C.surface, borderRadius: '20px 20px 0 0',
        width: '100%', maxWidth: 580, maxHeight: '90vh',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 -12px 48px rgba(0,0,0,0.85)',
      }}>
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px', flexShrink: 0 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: C.surface3 }} />
        </div>

        {/* Header */}
        <div style={{ padding: '4px 20px 14px', borderBottom: `1px solid ${C.sep}`, flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                <span style={{ color: C.blue, fontWeight: 700, fontSize: 22 }}>{ro.roNumber}</span>
                <Tag label={ro.serviceType} color={svcColor} />
                <Tag label={ro.priority} color={PRIORITY_META[ro.priority]?.color || C.muted} />
                <Tag label={colLabel} color={C.muted} />
              </div>
              <div style={{ color: C.text, fontWeight: 600, fontSize: 17, marginBottom: 2 }}>{ro.vehicle}</div>
              <div style={{ color: C.muted, fontSize: 13 }}>{ro.customer}</div>
            </div>
            <button onClick={onClose} style={xBtnStyle}>✕</button>
          </div>
        </div>

        {/* Timer strip */}
        <div style={{
          padding: '10px 20px', borderBottom: `1px solid ${C.sep}`,
          display: 'flex', alignItems: 'center', gap: 12,
          background: '#050505', flexShrink: 0, flexWrap: 'wrap',
        }}>
          <button onClick={onToggleTimer} style={{
            background: running ? C.red + '22' : C.green + '22',
            border: `1px solid ${running ? C.red : C.green}`,
            color: running ? C.red : C.green,
            borderRadius: 10, padding: '8px 16px',
            fontWeight: 700, cursor: 'pointer', fontSize: 14,
          }}>{running ? '⏸ Pause' : '▶ Start'}</button>
          <span style={{
            color: running ? C.green : C.muted,
            fontFamily: 'monospace', fontSize: 26, fontWeight: 700, letterSpacing: 2,
          }}>{fmtElapsed(elapsed)}</span>
          <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
            <div style={{ color: C.muted, fontSize: 11 }}>Promise</div>
            <div style={{ color: C.text, fontWeight: 600 }}>{ro.promiseTime || '—'}</div>
          </div>
          {ro.tech && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: C.muted, fontSize: 11 }}>Tech</div>
              <div style={{ color: C.blue, fontWeight: 600 }}>{ro.tech}</div>
            </div>
          )}
          <div style={{ textAlign: 'right' }}>
            <div style={{ color: C.muted, fontSize: 11 }}>Flat Rate</div>
            <div style={{ color: C.text, fontWeight: 600 }}>{ro.flatRateHours}h</div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: `1px solid ${C.sep}`, padding: '0 20px', flexShrink: 0 }}>
          {['details', 'notes', '3cs'].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              background: 'none', border: 'none',
              color: tab === t ? C.blue : C.muted,
              padding: '10px 14px', cursor: 'pointer',
              fontSize: 14, fontWeight: tab === t ? 700 : 400,
              borderBottom: `2px solid ${tab === t ? C.blue : 'transparent'}`,
              marginBottom: -1,
            }}>{t === '3cs' ? "3 C's" : t.charAt(0).toUpperCase() + t.slice(1)}</button>
          ))}
        </div>

        {/* Tab body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
          {tab === 'details' && !editing && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                {[
                  ['Service Type', ro.serviceType],
                  ['Priority', ro.priority],
                  ['Column', colLabel],
                  ['Flat Rate', `${ro.flatRateHours}h`],
                  ['Promise', ro.promiseTime || '—'],
                  ['Tech', ro.tech || 'Unassigned'],
                ].map(([k, v]) => (
                  <div key={k} style={{ background: C.surface2, borderRadius: 10, padding: '9px 12px' }}>
                    <div style={{ color: C.muted, fontSize: 11, marginBottom: 2 }}>{k}</div>
                    <div style={{ color: C.text, fontWeight: 600, fontSize: 14 }}>{v}</div>
                  </div>
                ))}
              </div>
              {ro.concern && (
                <div style={{ background: C.surface2, borderRadius: 10, padding: 12, marginBottom: 12 }}>
                  <div style={{ color: C.muted, fontSize: 11, marginBottom: 4 }}>Customer Concern</div>
                  <div style={{ color: C.text, fontSize: 14, lineHeight: 1.5 }}>{ro.concern}</div>
                </div>
              )}
              {ro.jobs?.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <Label>Jobs</Label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {ro.jobs.map((j, i) => (
                      <span key={i} style={{ background: C.surface3, color: C.text2, fontSize: 12, padding: '4px 10px', borderRadius: 8 }}>{j}</span>
                    ))}
                  </div>
                </div>
              )}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
                <Btn variant="secondary" onClick={() => setEditing(true)} small>Edit</Btn>
                <Btn variant="orange" onClick={() => onUpdate({ waitingOnParts: !ro.waitingOnParts })} small>
                  {ro.waitingOnParts ? '✓ Parts Arrived' : '⏳ Waiting on Parts'}
                </Btn>
                <Btn variant="secondary" onClick={onArchive} small>Archive</Btn>
                {canAdmin && (
                  <Btn variant="danger" small onClick={() => { if (window.confirm('Delete this RO?')) onDelete() }}>Delete</Btn>
                )}
              </div>
            </div>
          )}

          {tab === 'details' && editing && (
            <EditROForm form={editForm} setForm={setEditForm} onSave={saveEdit} onCancel={() => setEditing(false)} />
          )}

          {tab === 'notes' && (
            <div>
              {!ro.notes?.length && (
                <div style={{ color: C.muted, textAlign: 'center', padding: '24px 0', fontSize: 14 }}>No notes yet</div>
              )}
              {ro.notes?.map(n => (
                <div key={n.id} style={{ background: C.surface2, borderRadius: 10, padding: '10px 12px', marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ color: C.blue, fontSize: 12, fontWeight: 700 }}>{n.author}</span>
                    <span style={{ color: C.muted, fontSize: 11 }}>
                      {new Date(n.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div style={{ color: C.text, fontSize: 14, lineHeight: 1.5 }}>{n.text}</div>
                </div>
              ))}
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <input value={noteText} onChange={e => setNoteText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && submitNote()}
                  placeholder="Add a note…"
                  style={{ flex: 1, background: C.surface2, border: `1px solid ${C.sep}`, borderRadius: 10, color: C.text, fontSize: 14, padding: '10px 12px', outline: 'none' }} />
                <Btn onClick={submitNote} disabled={!noteText.trim()}>Send</Btn>
              </div>
            </div>
          )}

          {tab === '3cs' && <ThreeCsTab ro={ro} onUpdate={onUpdate} />}
        </div>
      </div>
    </Overlay>
  )
}

// ─── Move RO Modal ────────────────────────────────────────────────────────────

function MoveROModal({ ro, onMove, onClose }) {
  const [col, setCol] = useState(ro?.column || 'onDeck')
  const [tech, setTech] = useState(ro?.tech || '')
  if (!ro) return null

  function ChoiceBtn({ active, onClick, children }) {
    return (
      <button onClick={onClick} style={{
        background: active ? C.blue + '22' : C.surface2,
        border: `1px solid ${active ? C.blue : C.sep}`,
        color: active ? C.blue : C.text,
        borderRadius: 10, padding: '11px 14px', textAlign: 'left',
        cursor: 'pointer', fontSize: 14, fontWeight: active ? 700 : 400,
        width: '100%', marginBottom: 6,
      }}>{children}</button>
    )
  }

  return (
    <Modal title={`Move ${ro.roNumber}`} onClose={onClose}>
      <Label>Destination Column</Label>
      <div style={{ marginBottom: 18 }}>
        {COLUMNS.map(c => (
          <ChoiceBtn key={c.id} active={col === c.id} onClick={() => setCol(c.id)}>{c.label}</ChoiceBtn>
        ))}
      </div>
      <Label>Assign Tech</Label>
      <div style={{ marginBottom: 20 }}>
        <ChoiceBtn active={!tech} onClick={() => setTech('')}>Unassigned</ChoiceBtn>
        {TECHS.map(t => (
          <ChoiceBtn key={t} active={tech === t} onClick={() => setTech(t)}>{t}</ChoiceBtn>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <Btn variant="secondary" onClick={onClose} full>Cancel</Btn>
        <Btn onClick={() => onMove(col, tech || null)} full>Move RO</Btn>
      </div>
    </Modal>
  )
}

// ─── Clock Modal ──────────────────────────────────────────────────────────────

function ClockModal({ techClocks, getTechHours, onToggle, onClose }) {
  return (
    <Modal title="Tech Clock In / Out" onClose={onClose}>
      {TECHS.map(tech => {
        const tc = techClocks[tech] || { in: false, total: 0 }
        const hours = getTechHours(tech)
        const pct = hours / 40
        return (
          <div key={tech} style={{ background: C.surface2, borderRadius: 13, padding: '14px 16px', marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 2 }}>{tech}</div>
                <div style={{ color: C.muted, fontSize: 12 }}>{hours.toFixed(2)}h / 40h goal</div>
              </div>
              <button onClick={() => onToggle(tech)} style={{
                background: tc.in ? C.red + '22' : C.green + '22',
                border: `1px solid ${tc.in ? C.red : C.green}`,
                color: tc.in ? C.red : C.green,
                borderRadius: 10, padding: '8px 18px', fontWeight: 700, cursor: 'pointer',
              }}>{tc.in ? 'Clock Out' : 'Clock In'}</button>
            </div>
            <ProgressBar pct={pct} color={pct >= 1 ? C.green : C.blue} />
          </div>
        )
      })}
      <Btn onClick={onClose} full style={{ marginTop: 6 }}>Done</Btn>
    </Modal>
  )
}

// ─── Settings Modal ───────────────────────────────────────────────────────────

function SettingsModal({ settings, pins, currentUser, isAdmin, archive, onUpdateSettings, onUpdatePins, onClose }) {
  const [tab, setTab] = useState('jobs')
  const [localSettings, setLocalSettings] = useState({ ...settings })
  const [newPreset, setNewPreset] = useState('')
  const [pinTarget, setPinTarget] = useState(null)
  const [newPIN, setNewPIN] = useState('')
  const [confirmPIN, setConfirmPIN] = useState('')
  const [pinErr, setPinErr] = useState('')
  const [pinSuccess, setPinSuccess] = useState('')

  const addPreset = () => {
    const t = newPreset.trim()
    if (!t) return
    setLocalSettings(s => ({ ...s, jobPresets: [...(s.jobPresets || []), t] }))
    setNewPreset('')
  }

  const removePreset = i => {
    setLocalSettings(s => ({ ...s, jobPresets: s.jobPresets.filter((_, idx) => idx !== i) }))
  }

  function saveSettings() { onUpdateSettings(localSettings); onClose() }

  function changePin() {
    if (newPIN.length < 4) { setPinErr('At least 4 digits required'); return }
    if (newPIN !== confirmPIN) { setPinErr('PINs do not match'); return }
    onUpdatePins({ ...pins, [pinTarget]: newPIN })
    setPinErr('')
    setPinSuccess(`PIN updated for ${pinTarget}`)
    setPinTarget(null); setNewPIN(''); setConfirmPIN('')
    setTimeout(() => setPinSuccess(''), 3000)
  }

  const tabs = ['jobs', 'pins', 'archive']

  return (
    <Modal title="Settings" onClose={onClose} wide>
      <div style={{ display: 'flex', gap: 4, marginBottom: 18, borderBottom: `1px solid ${C.sep}`, paddingBottom: 0 }}>
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            background: 'none', border: 'none', color: tab === t ? C.blue : C.muted,
            padding: '8px 14px', cursor: 'pointer', fontSize: 14,
            fontWeight: tab === t ? 700 : 400,
            borderBottom: `2px solid ${tab === t ? C.blue : 'transparent'}`,
            marginBottom: -1,
          }}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>
        ))}
      </div>

      {tab === 'jobs' && (
        <div>
          <Label>Job Presets</Label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
            {(localSettings.jobPresets || []).map((j, i) => (
              <span key={i} style={{
                background: C.surface2, border: `1px solid ${C.sep}`,
                color: C.text, borderRadius: 8, padding: '4px 10px', fontSize: 13,
                display: 'flex', alignItems: 'center', gap: 5,
              }}>
                {j}
                <button onClick={() => removePreset(i)} style={{ background: 'none', border: 'none', color: C.red, cursor: 'pointer', fontSize: 15, lineHeight: 1, padding: 0 }}>×</button>
              </span>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            <input value={newPreset} onChange={e => setNewPreset(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addPreset()}
              placeholder="Add preset…"
              style={{ flex: 1, background: C.surface2, border: `1px solid ${C.sep}`, borderRadius: 10, color: C.text, fontSize: 14, padding: '8px 12px', outline: 'none' }} />
            <Btn onClick={addPreset} small>Add</Btn>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <Btn variant="secondary" onClick={onClose} full>Cancel</Btn>
            <Btn onClick={saveSettings} full>Save</Btn>
          </div>
        </div>
      )}

      {tab === 'pins' && (
        <div>
          {pinSuccess && (
            <div style={{ background: C.green + '22', border: `1px solid ${C.green}`, color: C.green, borderRadius: 10, padding: '10px 14px', marginBottom: 14, fontSize: 14 }}>
              {pinSuccess}
            </div>
          )}
          {pinTarget ? (
            <div>
              <div style={{ color: C.text, fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Change PIN — {pinTarget}</div>
              <Field label="New PIN (digits only)">
                <input type="password" value={newPIN} onChange={e => setNewPIN(e.target.value.replace(/\D/g, ''))}
                  placeholder="New PIN"
                  style={{ width: '100%', background: C.surface2, border: `1px solid ${C.sep}`, borderRadius: 10, color: C.text, fontSize: 15, padding: '10px 12px', outline: 'none' }} />
              </Field>
              <Field label="Confirm PIN">
                <input type="password" value={confirmPIN} onChange={e => setConfirmPIN(e.target.value.replace(/\D/g, ''))}
                  placeholder="Confirm PIN"
                  style={{ width: '100%', background: C.surface2, border: `1px solid ${C.sep}`, borderRadius: 10, color: C.text, fontSize: 15, padding: '10px 12px', outline: 'none' }} />
              </Field>
              {pinErr && <div style={{ color: C.red, fontSize: 13, marginBottom: 10 }}>{pinErr}</div>}
              <div style={{ display: 'flex', gap: 10 }}>
                <Btn variant="secondary" onClick={() => { setPinTarget(null); setNewPIN(''); setConfirmPIN(''); setPinErr('') }} full>Cancel</Btn>
                <Btn onClick={changePin} full>Change PIN</Btn>
              </div>
            </div>
          ) : (
            <div>
              <div style={{ color: C.muted, fontSize: 13, marginBottom: 14 }}>
                {isAdmin ? 'Tap any user to change their PIN.' : 'You can only change your own PIN.'}
              </div>
              {Object.entries(pins).map(([name, pin]) => {
                const canEdit = isAdmin || name === currentUser?.name
                return (
                  <div key={name} style={{
                    background: C.surface2, borderRadius: 10, padding: '12px 16px', marginBottom: 8,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15 }}>{name}</div>
                      <div style={{ color: C.muted, fontSize: 12 }}>
                        PIN: {isAdmin ? pin : '•'.repeat(pin.length)}
                      </div>
                    </div>
                    {canEdit && <Btn variant="secondary" onClick={() => setPinTarget(name)} small>Change</Btn>}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {tab === 'archive' && (
        <div>
          {!archive?.length && (
            <div style={{ color: C.muted, textAlign: 'center', padding: '24px 0', fontSize: 14 }}>No archived ROs</div>
          )}
          {archive?.map(ro => (
            <div key={ro.id} style={{ background: C.surface2, borderRadius: 10, padding: '12px 16px', marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ color: C.blue, fontWeight: 700, fontSize: 14 }}>{ro.roNumber}</span>
                <span style={{ color: C.muted, fontSize: 11 }}>{new Date(ro.archivedAt).toLocaleDateString()}</span>
              </div>
              <div style={{ color: C.text, fontSize: 14, marginBottom: 2 }}>{ro.vehicle}</div>
              <div style={{ color: C.muted, fontSize: 12 }}>{ro.customer} · {ro.serviceType}</div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  )
}

// ─── Login Screen ─────────────────────────────────────────────────────────────

function LoginScreen({ onLogin, initPins }) {
  const [pin, setPin] = useState('')
  const [err, setErr] = useState('')
  const shakeRef = useRef(null)

  function tryLogin(full) {
    // Check dynamic pins first
    const dynMatch = Object.entries(initPins || {}).find(([, p]) => p === full)
    if (dynMatch) {
      const role = getDefaultRole(dynMatch[0])
      onLogin({ name: dynMatch[0], role })
      setPin('')
      return
    }
    // Fall back to static map
    const staticUser = PIN_MAP[full]
    if (staticUser) {
      onLogin(staticUser)
      setPin('')
      return
    }
    // Wrong
    if (full.length >= 6) {
      setErr('Wrong PIN')
      setTimeout(() => { setPin(''); setErr('') }, 900)
    }
  }

  function press(d) {
    if (err) return
    const next = pin + d
    setPin(next)
    tryLogin(next)
  }

  function backspace() { setPin(p => p.slice(0, -1)); setErr('') }

  const PAD = ['1','2','3','4','5','6','7','8','9','','0','⌫']

  return (
    <div style={{
      background: C.bg, minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Space Grotesk, sans-serif', color: C.text,
    }}>
      <style>{GLOBAL_STYLE}</style>

      {/* Logo */}
      <div style={{ textAlign: 'center', marginBottom: 44 }}>
        <div style={{ fontSize: 52, marginBottom: 10 }}>🔧</div>
        <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: -0.5, marginBottom: 4 }}>ShopFlow</div>
        <div style={{ color: C.muted, fontSize: 14 }}>Service Department Tracker</div>
      </div>

      {/* PIN dots */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 10 }} ref={shakeRef}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} style={{
            width: 14, height: 14, borderRadius: 7,
            background: i < pin.length ? (err ? C.red : C.blue) : C.surface2,
            border: `2px solid ${i < pin.length ? (err ? C.red : C.blue) : C.surface3}`,
            transition: 'background 0.15s, border-color 0.15s',
          }} />
        ))}
      </div>

      {/* Error */}
      <div style={{ height: 22, display: 'flex', alignItems: 'center', marginBottom: 20 }}>
        {err && <span style={{ color: C.red, fontSize: 14, fontWeight: 600 }}>{err}</span>}
      </div>

      {/* Numpad */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 76px)', gap: 12 }}>
        {PAD.map((d, i) => {
          if (d === '') return <div key={i} />
          return (
            <button key={d + i} onClick={() => d === '⌫' ? backspace() : press(d)}
              style={{
                background: C.surface, border: 'none', borderRadius: 38,
                width: 76, height: 76, color: C.text,
                fontSize: d === '⌫' ? 22 : 26, fontWeight: 600,
                cursor: 'pointer', boxShadow: '0 2px 10px rgba(0,0,0,0.4)',
                transition: 'transform 0.1s',
                WebkitTapHighlightColor: 'transparent',
              }}
              onMouseDown={e => e.currentTarget.style.transform = 'scale(0.93)'}
              onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            >{d}</button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Main ShopFlowTracker ─────────────────────────────────────────────────────

export default function ShopFlowTracker() {
  const [currentUser, setCurrentUser] = useState(null)

  const [appState, setAppState] = useState(() => {
    try {
      const raw = localStorage.getItem('shopstate_v2')
      if (raw) return JSON.parse(raw)
    } catch {}
    return DEFAULT_STATE
  })

  const [selectedROId, setSelectedROId] = useState(null)
  const [showNewRO, setShowNewRO] = useState(false)
  const [moveROId, setMoveROId] = useState(null)
  const [showSettings, setShowSettings] = useState(false)
  const [showClock, setShowClock] = useState(false)
  const [, setTick] = useState(0)

  const isRemote = useRef(false)
  const saveTimer = useRef(null)

  // ── Firebase listener ──
  useEffect(() => {
    const ref = doc(db, 'shopstate', 'main')
    const unsub = onSnapshot(ref, snap => {
      if (snap.exists()) {
        isRemote.current = true
        setAppState(snap.data())
        setTimeout(() => { isRemote.current = false }, 300)
      }
    }, err => console.error('[ShopFlow] snapshot error', err))
    return unsub
  }, [])

  // ── Debounced save ──
  const scheduleSave = useCallback((state) => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      try { localStorage.setItem('shopstate_v2', JSON.stringify(state)) } catch {}
      if (!isRemote.current) {
        try { await setDoc(doc(db, 'shopstate', 'main'), state) }
        catch (e) { console.error('[ShopFlow] save failed', e) }
      }
    }, 800)
  }, [])

  useEffect(() => { scheduleSave(appState) }, [appState, scheduleSave])

  // ── 1-second tick for live timers ──
  useEffect(() => {
    const iv = setInterval(() => setTick(t => t + 1), 1000)
    return () => clearInterval(iv)
  }, [])

  // ── State helpers ──
  const update = useCallback(updater => setAppState(prev => updater(prev)), [])

  const updateRO = useCallback((id, changes) => {
    update(s => ({ ...s, ros: s.ros.map(r => r.id === id ? { ...r, ...changes } : r) }))
  }, [update])

  const addRO = useCallback(data => {
    const ro = {
      ...data, id: data.roNumber || genROId(),
      column: 'onDeck', timerStart: null, timerElapsed: 0,
      notes: [], cause: data.cause || '', correction: data.correction || '',
      waitingOnParts: false, createdAt: Date.now(),
    }
    update(s => ({ ...s, ros: [...s.ros, ro] }))
  }, [update])

  const deleteRO = useCallback(id => {
    update(s => ({ ...s, ros: s.ros.filter(r => r.id !== id) }))
  }, [update])

  const archiveRO = useCallback(id => {
    update(s => {
      const ro = s.ros.find(r => r.id === id)
      if (!ro) return s
      return { ...s, ros: s.ros.filter(r => r.id !== id), archive: [...s.archive, { ...ro, archivedAt: Date.now() }] }
    })
  }, [update])

  const moveRO = useCallback((id, column, tech) => {
    update(s => ({
      ...s,
      ros: s.ros.map(r => {
        if (r.id !== id) return r
        const wasRunning = !!r.timerStart
        const newElapsed = wasRunning && column !== 'inProgress'
          ? r.timerElapsed + (Date.now() - r.timerStart) : r.timerElapsed
        return {
          ...r, column,
          tech: tech !== undefined ? tech : r.tech,
          timerStart: column === 'inProgress' && !r.timerStart ? Date.now()
            : column !== 'inProgress' ? null : r.timerStart,
          timerElapsed: newElapsed,
        }
      }),
    }))
  }, [update])

  const toggleTimer = useCallback(id => {
    update(s => ({
      ...s,
      ros: s.ros.map(r => {
        if (r.id !== id) return r
        if (r.timerStart) {
          return { ...r, timerStart: null, timerElapsed: r.timerElapsed + (Date.now() - r.timerStart) }
        }
        return { ...r, timerStart: Date.now() }
      }),
    }))
  }, [update])

  const addNote = useCallback((id, text) => {
    const note = { id: Date.now(), text, author: currentUser?.name || 'Unknown', time: Date.now() }
    update(s => ({ ...s, ros: s.ros.map(r => r.id === id ? { ...r, notes: [...(r.notes || []), note] } : r) }))
  }, [update, currentUser])

  const toggleClock = useCallback(tech => {
    update(s => {
      const tc = s.techClocks[tech] || { in: false, start: null, total: 0 }
      if (tc.in) {
        return { ...s, techClocks: { ...s.techClocks, [tech]: { in: false, start: null, total: tc.total + (tc.start ? Date.now() - tc.start : 0) } } }
      }
      return { ...s, techClocks: { ...s.techClocks, [tech]: { in: true, start: Date.now(), total: tc.total } } }
    })
  }, [update])

  const getTechHours = useCallback(tech => {
    const tc = appState.techClocks[tech]
    if (!tc) return 0
    return ((tc.total || 0) + (tc.in && tc.start ? Date.now() - tc.start : 0)) / 3600000
  }, [appState.techClocks])

  const toggleActivity = useCallback(type => {
    update(s => {
      const active = s.activity[type]
      return { ...s, activity: { ...s.activity, [type]: !active, [`${type}Start`]: !active ? Date.now() : null } }
    })
  }, [update])

  const isAdmin = currentUser?.role === 'admin'
  const isManager = currentUser?.role === 'admin' || currentUser?.role === 'manager'
  const { ros, techClocks, activity, settings, archive, pins } = appState

  const selectedRO = ros.find(r => r.id === selectedROId) || null
  const moveRO_ro = ros.find(r => r.id === moveROId) || null

  // ── Login gate ──
  if (!currentUser) {
    return <LoginScreen onLogin={setCurrentUser} initPins={pins} />
  }

  // ── Render board ──
  return (
    <div style={{ background: C.bg, minHeight: '100vh', color: C.text, fontFamily: 'Space Grotesk, sans-serif' }}>
      <style>{GLOBAL_STYLE}</style>

      {/* ── Header ── */}
      <div style={{
        background: C.surface, borderBottom: `1px solid ${C.sep}`,
        padding: '10px 16px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 200,
        gap: 8, flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 22 }}>🔧</span>
          <div>
            <div style={{ fontWeight: 800, fontSize: 17, letterSpacing: -0.3, lineHeight: 1.1 }}>ShopFlow</div>
            <div style={{ color: C.muted, fontSize: 10 }}>Service Tracker</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 7, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Activity toggles */}
          {[
            { key: 'movingCars', label: '🚗 Moving Cars', active: activity.movingCars, color: C.orange },
            { key: 'partsRun',   label: '📦 Parts Run',   active: activity.partsRun,   color: C.blue  },
          ].map(({ key, label, active, color }) => (
            <button key={key} onClick={() => toggleActivity(key)} style={{
              background: active ? color + '22' : C.surface2,
              border: `1px solid ${active ? color : C.sep}`,
              color: active ? color : C.muted,
              borderRadius: 8, padding: '6px 11px', fontSize: 12,
              fontWeight: 700, cursor: 'pointer',
            }}>{label}</button>
          ))}

          {isAdmin && (
            <button onClick={() => setShowClock(true)} style={{
              background: C.surface2, border: `1px solid ${C.sep}`,
              color: C.text, borderRadius: 8, padding: '6px 11px', fontSize: 12, cursor: 'pointer',
            }}>⏰ Clock</button>
          )}

          <button onClick={() => setShowNewRO(true)} style={{
            background: C.blue, border: 'none', color: '#fff',
            borderRadius: 9, padding: '7px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
          }}>+ New RO</button>

          <button onClick={() => setShowSettings(true)} style={{
            background: C.surface2, border: 'none', color: C.muted,
            width: 34, height: 34, borderRadius: 8, cursor: 'pointer', fontSize: 17,
          }}>⚙️</button>

          <button onClick={() => setCurrentUser(null)} style={{
            background: C.surface2, border: `1px solid ${C.sep}`,
            color: C.muted, borderRadius: 8, padding: '6px 11px',
            fontSize: 12, cursor: 'pointer',
          }}>{currentUser.name} ↩</button>
        </div>
      </div>

      {/* ── Tech Status Bar ── */}
      <div style={{
        background: C.surface, borderBottom: `1px solid ${C.sep}`,
        padding: '8px 16px', display: 'flex', gap: 10, overflowX: 'auto',
      }}>
        {TECHS.map(tech => {
          const tc = techClocks[tech] || { in: false }
          const hours = getTechHours(tech)
          const pct = hours / 40
          return (
            <div key={tech} style={{
              background: C.surface2, borderRadius: 11,
              padding: '8px 13px', minWidth: 130, flexShrink: 0,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                <span style={{ fontWeight: 700, fontSize: 13 }}>{tech}</span>
                <span style={{
                  background: tc.in ? C.green + '22' : C.surface3,
                  color: tc.in ? C.green : C.muted,
                  fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4, textTransform: 'uppercase',
                }}>{tc.in ? 'Clocked In' : 'Out'}</span>
              </div>
              <div style={{ color: C.muted, fontSize: 11, marginBottom: 4 }}>{hours.toFixed(1)}h / 40h</div>
              <ProgressBar pct={pct} color={pct >= 1 ? C.green : C.blue} />
            </div>
          )
        })}
      </div>

      {/* ── Board ── */}
      <div style={{ padding: '14px 12px', overflowX: 'auto' }}>

        {/* Column header row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(210px, 1fr))', gap: 10, marginBottom: 12 }}>
          {COLUMNS.map(col => {
            const count = ros.filter(r => r.column === col.id).length
            return (
              <div key={col.id} style={{
                background: C.surface, borderRadius: 12, padding: '10px 14px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <span style={{ fontWeight: 700, fontSize: 14 }}>{col.label}</span>
                <span style={{
                  background: C.surface2, color: C.muted,
                  fontSize: 12, padding: '2px 9px', borderRadius: 10, fontWeight: 600,
                }}>{count}</span>
              </div>
            )
          })}
        </div>

        {/* Service-type queue rows */}
        {Object.entries(SVC_META).map(([svc, meta]) => {
          const svcROs = ros.filter(r => r.serviceType === svc)
          return (
            <div key={svc} style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7, paddingLeft: 2 }}>
                <div style={{ width: 10, height: 10, borderRadius: 5, background: meta.color, flexShrink: 0 }} />
                <span style={{ color: meta.color, fontWeight: 700, fontSize: 12, letterSpacing: 0.5 }}>
                  {svc.toUpperCase()}
                </span>
                <span style={{ color: C.muted, fontSize: 12 }}>({svcROs.length})</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(210px, 1fr))', gap: 10 }}>
                {COLUMNS.map(col => {
                  const cells = svcROs.filter(r => r.column === col.id)
                  return (
                    <ColumnCell key={col.id}>
                      {cells.map(ro => (
                        <ROCard key={ro.id} ro={ro}
                          onPress={() => setSelectedROId(ro.id)}
                          onLongPress={() => setMoveROId(ro.id)} />
                      ))}
                    </ColumnCell>
                  )
                })}
              </div>
            </div>
          )
        })}

        {/* Waiting on Parts */}
        {(() => {
          const wop = ros.filter(r => r.waitingOnParts)
          return (
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7, paddingLeft: 2 }}>
                <div style={{ width: 10, height: 10, borderRadius: 5, background: C.orange, flexShrink: 0 }} />
                <span style={{ color: C.orange, fontWeight: 700, fontSize: 12, letterSpacing: 0.5 }}>WAITING ON PARTS</span>
                <span style={{ color: C.muted, fontSize: 12 }}>({wop.length})</span>
              </div>
              <div style={{
                background: C.surface + 'BB', borderRadius: 12, padding: 10,
                border: `1px dashed ${C.orange}55`, minHeight: 62,
                display: 'flex', flexWrap: 'wrap', gap: 8,
              }}>
                {wop.map(ro => (
                  <div key={ro.id} style={{ width: 210 }}>
                    <ROCard ro={ro}
                      onPress={() => setSelectedROId(ro.id)}
                      onLongPress={() => setMoveROId(ro.id)} />
                  </div>
                ))}
                {!wop.length && (
                  <div style={{ color: C.surface3, fontSize: 12, margin: 'auto' }}>No vehicles waiting on parts</div>
                )}
              </div>
            </div>
          )
        })()}

        {/* Tech rows */}
        <div style={{ paddingLeft: 2, marginBottom: 8 }}>
          <span style={{ color: C.muted, fontWeight: 700, fontSize: 12, letterSpacing: 0.5 }}>TECHNICIANS</span>
        </div>
        {TECHS.map(tech => {
          const tc = techClocks[tech] || { in: false }
          const techAllROs = ros.filter(r => r.tech === tech)
          return (
            <div key={tech} style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7, paddingLeft: 2 }}>
                <div style={{ width: 8, height: 8, borderRadius: 4, background: tc.in ? C.green : C.muted, flexShrink: 0 }} />
                <span style={{ color: C.text, fontWeight: 700, fontSize: 13 }}>{tech}</span>
                <span style={{ color: C.muted, fontSize: 12 }}>
                  {techAllROs.length} RO{techAllROs.length !== 1 ? 's' : ''} · {getTechHours(tech).toFixed(1)}h
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(210px, 1fr))', gap: 10 }}>
                {COLUMNS.map(col => {
                  const cells = ros.filter(r => r.tech === tech && r.column === col.id)
                  return (
                    <ColumnCell key={col.id} highlight={col.id === 'inProgress' && tc.in && cells.length > 0}>
                      {cells.map(ro => (
                        <ROCard key={ro.id} ro={ro}
                          onPress={() => setSelectedROId(ro.id)}
                          onLongPress={() => setMoveROId(ro.id)} />
                      ))}
                    </ColumnCell>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Modals ── */}

      {showNewRO && (
        <NewROModal
          settings={settings}
          onSave={data => { addRO(data); setShowNewRO(false) }}
          onClose={() => setShowNewRO(false)}
        />
      )}

      {selectedRO && (
        <RODetailSheet
          ro={selectedRO}
          currentUser={currentUser}
          onClose={() => setSelectedROId(null)}
          onUpdate={changes => updateRO(selectedROId, changes)}
          onDelete={() => { deleteRO(selectedROId); setSelectedROId(null) }}
          onArchive={() => { archiveRO(selectedROId); setSelectedROId(null) }}
          onToggleTimer={() => toggleTimer(selectedROId)}
          onAddNote={text => addNote(selectedROId, text)}
        />
      )}

      {moveRO_ro && (
        <MoveROModal
          ro={moveRO_ro}
          onMove={(col, tech) => { moveRO(moveROId, col, tech); setMoveROId(null) }}
          onClose={() => setMoveROId(null)}
        />
      )}

      {showSettings && (
        <SettingsModal
          settings={settings}
          pins={pins}
          currentUser={currentUser}
          isAdmin={isAdmin}
          archive={archive}
          onUpdateSettings={s => update(st => ({ ...st, settings: s }))}
          onUpdatePins={p => update(st => ({ ...st, pins: p }))}
          onClose={() => setShowSettings(false)}
        />
      )}

      {showClock && (
        <ClockModal
          techClocks={techClocks}
          getTechHours={getTechHours}
          onToggle={toggleClock}
          onClose={() => setShowClock(false)}
        />
      )}
    </div>
  )
}
