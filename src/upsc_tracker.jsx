// ═══════════════════════════════════════════════════════════════
//  UPSC PRELIMS 2026 — 30-Day Prep Tracker
//  React + Recharts + Tailwind CSS v4
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/* ─────────────────────── Constants ─────────────────────── */

const STORAGE_KEY = 'upsc_tracker_30day';
const DEFAULT_SUBJECTS = [
  'History', 'Geography', 'Polity', 'Economy',
  'Science & Tech', 'Environment', 'CSAT', 'Ethics', 'Essay',
];
const CA_CATEGORIES = [
  'All', 'Polity', 'Economy', 'International', 'Science & Tech',
  'Environment', 'Society', 'Security', 'Governance', 'Culture', 'Other',
];
const CHART_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316',
  '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6',
  '#a855f7', '#e11d48',
];
const MOODS = ['😫', '😐', '🙂', '😊', '🔥'];
const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'daysheet',  label: 'Day Sheet',  icon: '📅' },
  { id: 'summary',   label: 'Summary',    icon: '📈' },
  { id: 'mocks',     label: 'Mocks',      icon: '🎯' },
  { id: 'ca',        label: 'CA Log',     icon: '📰' },
  { id: 'settings',  label: 'Settings',   icon: '⚙️' },
];

/* ─────────────────────── Utilities ─────────────────────── */

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

function formatTimer(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function normalCDF(x) {
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
  const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x) / Math.SQRT2;
  const t = 1 / (1 + p * ax);
  const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-ax * ax);
  return 0.5 * (1 + sign * y);
}

function estimatePercentile(score, maxScore = 200) {
  const mean = maxScore * 0.45;
  const sd = maxScore * 0.125;
  return Math.min(99.9, Math.max(0.1, +(normalCDF((score - mean) / sd) * 100).toFixed(1)));
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

/* ─────────────────────── State Factory ─────────────────────── */

function createDefaultDays(subjects) {
  const days = {};
  for (let i = 1; i <= 30; i++) {
    days[i] = {
      tasks: subjects.map((s, j) => ({
        id: `d${i}_t${j}_${uid()}`,
        subject: s,
        topic: '',
        targetHours: 0,
        actualHours: 0,
        notes: '',
      })),
      wellbeing: { sleepHours: 7, waterLitres: 2, exercise: false, mood: 2 },
    };
  }
  return days;
}

function createInitialState() {
  return {
    settings: {
      examDate: '2026-07-26',
      periodName: '30-Day Sprint',
      subjects: [...DEFAULT_SUBJECTS],
      showWellbeing: true,
      darkMode: false,
    },
    days: createDefaultDays(DEFAULT_SUBJECTS),
    mocks: [],
    currentAffairs: [],
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Ensure all 30 days exist (handles partial data)
      for (let i = 1; i <= 30; i++) {
        if (!parsed.days[i]) {
          parsed.days[i] = {
            tasks: (parsed.settings?.subjects || DEFAULT_SUBJECTS).map((s, j) => ({
              id: `d${i}_t${j}_${uid()}`, subject: s, topic: '', targetHours: 0, actualHours: 0, notes: '',
            })),
            wellbeing: { sleepHours: 7, waterLitres: 2, exercise: false, mood: 2 },
          };
        }
      }
      if (!parsed.mocks) parsed.mocks = [];
      if (!parsed.currentAffairs) parsed.currentAffairs = [];
      return parsed;
    }
  } catch { /* corrupt data → fresh start */ }
  return createInitialState();
}

/* ═══════════════════════════════════════════════════════════════
   SUB-COMPONENTS
   ═══════════════════════════════════════════════════════════════ */

/* ─── Stopwatch Timer ─── */
function StopwatchTimer({ onTimeAdd }) {
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const startRef = useRef(null);
  const intervalRef = useRef(null);

  const toggle = () => {
    if (running) {
      clearInterval(intervalRef.current);
      if (elapsed > 0) {
        onTimeAdd(parseFloat((elapsed / 3600).toFixed(2)));
      }
      setElapsed(0);
      startRef.current = null;
    } else {
      startRef.current = Date.now() - elapsed * 1000;
      intervalRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
      }, 1000);
    }
    setRunning(r => !r);
  };

  useEffect(() => () => clearInterval(intervalRef.current), []);

  return (
    <div className="flex items-center gap-1.5">
      <span className={`font-mono text-xs tabular-nums ${running ? 'text-rose-500 timer-pulse' : 'text-slate-500 dark:text-slate-400'}`}>
        {formatTimer(elapsed)}
      </span>
      <button
        onClick={toggle}
        title={running ? 'Stop & add time' : 'Start timer'}
        className={`w-7 h-7 rounded-full flex items-center justify-center text-sm transition-all
          ${running
            ? 'bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 hover:bg-rose-200'
            : 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-200'
          }`}
      >
        {running ? '⏹' : '▶'}
      </button>
    </div>
  );
}

/* ─── Reset Confirmation Modal ─── */
function ResetModal({ onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onCancel}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 max-w-sm w-full tab-enter"
        onClick={e => e.stopPropagation()}
      >
        <div className="text-4xl mb-3 text-center">⚠️</div>
        <h3 className="text-xl font-bold text-slate-900 dark:text-white text-center mb-2">
          Reset All Data?
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 text-center mb-6">
          This will permanently delete all your tracker data including study logs, mocks, and current affairs. This action cannot be undone.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={onCancel}
            className="px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-5 py-2.5 rounded-xl bg-rose-600 text-white font-medium hover:bg-rose-700 transition-colors"
          >
            Reset Everything
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Tab Bar (Desktop Top + Mobile Bottom) ─── */
function TabBar({ activeTab, onTabChange }) {
  return (
    <>
      {/* Desktop: horizontal top bar */}
      <nav className="hidden md:flex gap-1 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-700/60 px-6 sticky top-0 z-40">
        {TABS.map(tab => (
          <button
            key={tab.id}
            id={`tab-${tab.id}`}
            onClick={() => onTabChange(tab.id)}
            className={`px-4 py-3.5 text-sm font-medium transition-all border-b-2 whitespace-nowrap
              ${activeTab === tab.id
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
          >
            <span className="mr-1.5">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Mobile: fixed bottom bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-200 dark:border-slate-700/60 flex justify-around py-1.5 safe-bottom">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex flex-col items-center py-1 px-1 min-w-[3.5rem] text-[10px] font-medium transition-all
              ${activeTab === tab.id
                ? 'text-indigo-600 dark:text-indigo-400 scale-105'
                : 'text-slate-400 dark:text-slate-500'
              }`}
          >
            <span className="text-xl leading-tight">{tab.icon}</span>
            <span className="mt-0.5">{tab.label}</span>
          </button>
        ))}
      </nav>
    </>
  );
}

/* ─── Stat Card ─── */
function StatCard({ icon, label, value, sub, color = 'indigo' }) {
  const colors = {
    indigo: 'from-indigo-500/10 to-indigo-500/5 dark:from-indigo-500/15 dark:to-indigo-500/5 border-indigo-200/50 dark:border-indigo-500/20',
    emerald: 'from-emerald-500/10 to-emerald-500/5 dark:from-emerald-500/15 dark:to-emerald-500/5 border-emerald-200/50 dark:border-emerald-500/20',
    amber: 'from-amber-500/10 to-amber-500/5 dark:from-amber-500/15 dark:to-amber-500/5 border-amber-200/50 dark:border-amber-500/20',
    rose: 'from-rose-500/10 to-rose-500/5 dark:from-rose-500/15 dark:to-rose-500/5 border-rose-200/50 dark:border-rose-500/20',
  };
  return (
    <div className={`rounded-2xl bg-gradient-to-br ${colors[color]} border p-4 backdrop-blur-sm`}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-2xl">{icon}</span>
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">{label}</span>
      </div>
      <div className="text-2xl font-bold text-slate-900 dark:text-white">{value}</div>
      {sub && <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{sub}</div>}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   DASHBOARD TAB
   ═══════════════════════════════════════════════════════════════ */

function Dashboard({ data, setData }) {
  const { settings, days, mocks } = data;
  const fileRef = useRef(null);

  /* ── Computed stats ── */
  const totalHours = useMemo(() =>
    Object.values(days).reduce((s, d) => s + d.tasks.reduce((a, t) => a + (t.actualHours || 0), 0), 0),
    [days]
  );

  const daysLeft = useMemo(() => {
    if (!settings.examDate) return null;
    return Math.max(0, Math.ceil((new Date(settings.examDate) - new Date()) / 86400000));
  }, [settings.examDate]);

  const activeDays = useMemo(() =>
    Object.values(days).filter(d => d.tasks.some(t => t.actualHours > 0)).length,
    [days]
  );

  const subjectHours = useMemo(() => {
    const m = {};
    Object.values(days).forEach(d => d.tasks.forEach(t => {
      m[t.subject] = (m[t.subject] || 0) + (t.actualHours || 0);
    }));
    return Object.entries(m)
      .filter(([, h]) => h > 0)
      .map(([name, value]) => ({ name, value: +value.toFixed(1) }))
      .sort((a, b) => b.value - a.value);
  }, [days]);

  const streak = useMemo(() => {
    let count = 0;
    for (let d = 30; d >= 1; d--) {
      const h = days[d]?.tasks.reduce((s, t) => s + (t.actualHours || 0), 0) || 0;
      if (h > 0) count++;
      else if (count > 0) break;
    }
    return count;
  }, [days]);

  const heatmapData = useMemo(() =>
    Array.from({ length: 30 }, (_, i) => ({
      day: i + 1,
      hours: days[i + 1]?.tasks.reduce((s, t) => s + (t.actualHours || 0), 0) || 0,
    })),
    [days]
  );
  const maxHeat = Math.max(...heatmapData.map(d => d.hours), 1);

  /* ── Handlers ── */
  const copySummary = useCallback(() => {
    const lines = [
      `📊 ${settings.periodName} — UPSC Prelims 2026`,
      `📅 Date: ${new Date().toLocaleDateString('en-IN', { dateStyle: 'long' })}`,
      daysLeft != null ? `⏳ Days Left: ${daysLeft}` : '',
      `🔥 Streak: ${streak} day${streak !== 1 ? 's' : ''}`,
      '',
      '📚 Study Summary:',
      `   Total Hours: ${totalHours.toFixed(1)}h`,
      `   Active Days: ${activeDays}/30`,
      '',
      '📖 Subject Breakdown:',
      ...subjectHours.map(s => `   ${s.name}: ${s.value}h`),
      '',
      mocks.length > 0 ? `🎯 Latest Mock: ${mocks[mocks.length - 1].name} — ${mocks[mocks.length - 1].totalScore}/${mocks[mocks.length - 1].maxScore}` : '',
    ].filter(Boolean).join('\n');
    navigator.clipboard.writeText(lines).then(() => alert('Summary copied to clipboard! 📋'));
  }, [settings, days, mocks, totalHours, daysLeft, activeDays, subjectHours, streak]);

  const exportPDF = useCallback(() => {
    const doc = new jsPDF();
    // Title
    doc.setFontSize(20);
    doc.setTextColor(99, 102, 241);
    doc.text(settings.periodName, 14, 22);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated: ${new Date().toLocaleString('en-IN')}  |  Total: ${totalHours.toFixed(1)}h  |  Days Left: ${daysLeft ?? 'N/A'}`, 14, 30);

    // Day-wise summary table
    doc.setFontSize(14);
    doc.setTextColor(30);
    doc.text('Day-wise Study Summary', 14, 42);
    autoTable(doc, {
      startY: 46,
      head: [['Day', 'Total Hours', 'Tasks Done', 'Top Subject']],
      body: Array.from({ length: 30 }, (_, i) => {
        const d = days[i + 1];
        const total = d.tasks.reduce((s, t) => s + (t.actualHours || 0), 0);
        const done = d.tasks.filter(t => t.actualHours >= t.targetHours && t.targetHours > 0).length;
        const top = d.tasks.reduce((best, t) => t.actualHours > (best?.actualHours || 0) ? t : best, null);
        return [
          `Day ${i + 1}`,
          total.toFixed(1) + 'h',
          `${done}/${d.tasks.filter(t => t.targetHours > 0).length}`,
          top?.subject || '—',
        ];
      }),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [99, 102, 241] },
    });

    // Mock scores
    if (mocks.length > 0) {
      doc.addPage();
      doc.setFontSize(14);
      doc.text('Mock Test Scores', 14, 22);
      autoTable(doc, {
        startY: 26,
        head: [['Name', 'Date', 'Score', 'Max', 'Percentile']],
        body: mocks.map(m => [
          m.name, m.date, m.totalScore, m.maxScore,
          estimatePercentile(m.totalScore, m.maxScore) + '%',
        ]),
        styles: { fontSize: 9 },
        headStyles: { fillColor: [99, 102, 241] },
      });
    }

    // Current Affairs
    if (data.currentAffairs.length > 0) {
      doc.addPage();
      doc.setFontSize(14);
      doc.text('Current Affairs Log', 14, 22);
      autoTable(doc, {
        startY: 26,
        head: [['Date', 'Topic', 'Category', 'Revised']],
        body: data.currentAffairs.map(ca => [ca.date, ca.topic, ca.category, ca.revised ? '✓' : '✗']),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [99, 102, 241] },
      });
    }

    doc.save('UPSC_Tracker_Report.pdf');
  }, [data, settings, days, mocks, totalHours, daysLeft]);

  const exportJSON = useCallback(() => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `upsc_tracker_backup_${todayISO()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [data]);

  const importJSON = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const imported = JSON.parse(ev.target.result);
        if (imported.settings && imported.days) {
          setData(imported);
          alert('Data restored successfully! ✅');
        } else {
          alert('Invalid backup file format.');
        }
      } catch { alert('Failed to parse backup file.'); }
    };
    reader.readAsText(file);
    e.target.value = '';
  }, [setData]);

  const heatColor = (hours) => {
    if (hours === 0) return 'bg-slate-100 dark:bg-slate-800/80';
    const p = hours / maxHeat;
    if (p < 0.25) return 'bg-emerald-200 dark:bg-emerald-900/50';
    if (p < 0.5) return 'bg-emerald-300 dark:bg-emerald-700/60';
    if (p < 0.75) return 'bg-emerald-400 dark:bg-emerald-600/70';
    return 'bg-emerald-500 dark:bg-emerald-500';
  };

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon="📚" label="Total Hours" value={totalHours.toFixed(1) + 'h'} sub={`${activeDays} active days`} color="indigo" />
        <StatCard icon="⏳" label="Days Left" value={daysLeft ?? '—'} sub={settings.examDate || 'Set in Settings'} color="rose" />
        <StatCard icon="📖" label="Subjects" value={subjectHours.length} sub={`of ${settings.subjects.length} tracked`} color="emerald" />
        <StatCard icon="🔥" label="Streak" value={streak} sub={streak > 0 ? `day${streak !== 1 ? 's' : ''} in a row!` : 'Start studying!'} color="amber" />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Donut Chart */}
        <div className="bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/40 p-5">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-4">📊 Subject Hours Distribution</h3>
          {subjectHours.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={subjectHours}
                  cx="50%" cy="50%"
                  innerRadius={55} outerRadius={100}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}h`}
                  labelLine={{ strokeWidth: 1 }}
                >
                  {subjectHours.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => `${v}h`} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[260px] flex items-center justify-center text-slate-400 dark:text-slate-500">
              No study hours logged yet. Start your first day!
            </div>
          )}
        </div>

        {/* 30-Day Heatmap */}
        <div className="bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/40 p-5">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-4">🗓️ 30-Day Study Heatmap</h3>
          <div className="grid grid-cols-6 gap-2">
            {heatmapData.map(d => (
              <div
                key={d.day}
                className={`heatmap-cell ${heatColor(d.hours)} rounded-lg aspect-square flex flex-col items-center justify-center`}
                title={`Day ${d.day}: ${d.hours.toFixed(1)}h`}
              >
                <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">D{d.day}</span>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{d.hours > 0 ? d.hours.toFixed(1) : '—'}</span>
              </div>
            ))}
          </div>
          {/* Legend */}
          <div className="flex items-center gap-2 mt-3 justify-end">
            <span className="text-[10px] text-slate-400">Less</span>
            {['bg-slate-100 dark:bg-slate-800/80', 'bg-emerald-200 dark:bg-emerald-900/50', 'bg-emerald-300 dark:bg-emerald-700/60', 'bg-emerald-400 dark:bg-emerald-600/70', 'bg-emerald-500 dark:bg-emerald-500'].map((c, i) => (
              <div key={i} className={`w-3 h-3 rounded-sm ${c}`} />
            ))}
            <span className="text-[10px] text-slate-400">More</span>
          </div>
        </div>
      </div>

      {/* Export / Import / Copy */}
      <div className="bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/40 p-5">
        <h3 className="font-semibold text-slate-900 dark:text-white mb-4">💾 Data Management</h3>
        <div className="flex flex-wrap gap-3">
          <button onClick={exportPDF}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 text-white font-medium text-sm hover:bg-indigo-700 transition-colors flex items-center gap-2">
            📄 Export PDF
          </button>
          <button onClick={exportJSON}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-medium text-sm hover:bg-emerald-700 transition-colors flex items-center gap-2">
            📦 Export JSON
          </button>
          <button onClick={() => fileRef.current?.click()}
            className="px-4 py-2.5 rounded-xl bg-amber-500 text-white font-medium text-sm hover:bg-amber-600 transition-colors flex items-center gap-2">
            📥 Import JSON
          </button>
          <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={importJSON} />
          <button onClick={copySummary}
            className="px-4 py-2.5 rounded-xl bg-violet-600 text-white font-medium text-sm hover:bg-violet-700 transition-colors flex items-center gap-2">
            📋 Copy Summary
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   DAY SHEET TAB
   ═══════════════════════════════════════════════════════════════ */

function DaySheet({ data, setData }) {
  const [currentDay, setCurrentDay] = useState(1);
  const day = data.days[currentDay];
  const { settings } = data;

  const updateTask = (taskId, key, value) => {
    setData(prev => ({
      ...prev,
      days: {
        ...prev.days,
        [currentDay]: {
          ...prev.days[currentDay],
          tasks: prev.days[currentDay].tasks.map(t =>
            t.id === taskId ? { ...t, [key]: typeof value === 'string' && key.includes('Hours') ? parseFloat(value) || 0 : value } : t
          ),
        },
      },
    }));
  };

  const addTask = () => {
    setData(prev => ({
      ...prev,
      days: {
        ...prev.days,
        [currentDay]: {
          ...prev.days[currentDay],
          tasks: [
            ...prev.days[currentDay].tasks,
            { id: uid(), subject: settings.subjects[0] || 'General', topic: '', targetHours: 0, actualHours: 0, notes: '' },
          ],
        },
      },
    }));
  };

  const removeTask = (taskId) => {
    setData(prev => ({
      ...prev,
      days: {
        ...prev.days,
        [currentDay]: {
          ...prev.days[currentDay],
          tasks: prev.days[currentDay].tasks.filter(t => t.id !== taskId),
        },
      },
    }));
  };

  const updateWellbeing = (key, value) => {
    setData(prev => ({
      ...prev,
      days: {
        ...prev.days,
        [currentDay]: {
          ...prev.days[currentDay],
          wellbeing: { ...prev.days[currentDay].wellbeing, [key]: value },
        },
      },
    }));
  };

  const handleTimerAdd = (taskId, hours) => {
    setData(prev => ({
      ...prev,
      days: {
        ...prev.days,
        [currentDay]: {
          ...prev.days[currentDay],
          tasks: prev.days[currentDay].tasks.map(t =>
            t.id === taskId ? { ...t, actualHours: +(t.actualHours + hours).toFixed(2) } : t
          ),
        },
      },
    }));
  };

  const getRowColor = (task) => {
    if (!task.targetHours || task.targetHours <= 0) return '';
    const ratio = task.actualHours / task.targetHours;
    if (ratio >= 1) return 'bg-emerald-50/70 dark:bg-emerald-500/10 border-l-4 border-l-emerald-500';
    if (ratio >= 0.5) return 'bg-amber-50/70 dark:bg-amber-500/10 border-l-4 border-l-amber-500';
    return 'bg-rose-50/70 dark:bg-rose-500/10 border-l-4 border-l-rose-500';
  };

  const dayTotal = day.tasks.reduce((s, t) => s + (t.actualHours || 0), 0);
  const dayTarget = day.tasks.reduce((s, t) => s + (t.targetHours || 0), 0);

  return (
    <div className="space-y-4">
      {/* Day Navigator */}
      <div className="flex items-center justify-between bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/40 p-4">
        <button
          onClick={() => setCurrentDay(d => Math.max(1, d - 1))}
          disabled={currentDay <= 1}
          className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold text-lg hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-30 transition-all"
        >
          ←
        </button>
        <div className="text-center">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Day {currentDay}</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {dayTotal.toFixed(1)}h / {dayTarget.toFixed(1)}h target
          </p>
        </div>
        <button
          onClick={() => setCurrentDay(d => Math.min(30, d + 1))}
          disabled={currentDay >= 30}
          className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold text-lg hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-30 transition-all"
        >
          →
        </button>
      </div>

      {/* Day selector pills */}
      <div className="overflow-x-auto scrollbar-thin pb-1">
        <div className="flex gap-1.5 min-w-max">
          {Array.from({ length: 30 }, (_, i) => i + 1).map(d => {
            const h = data.days[d]?.tasks.reduce((s, t) => s + (t.actualHours || 0), 0) || 0;
            return (
              <button
                key={d}
                onClick={() => setCurrentDay(d)}
                className={`w-9 h-9 rounded-lg text-xs font-semibold transition-all
                  ${d === currentDay
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                    : h > 0
                      ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-200'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
              >
                {d}
              </button>
            );
          })}
        </div>
      </div>

      {/* Task Table */}
      <div className="bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/40 overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-700/40">
                <th className="text-left p-3 font-semibold text-slate-600 dark:text-slate-300 min-w-[120px]">Subject</th>
                <th className="text-left p-3 font-semibold text-slate-600 dark:text-slate-300 min-w-[160px]">Topic</th>
                <th className="text-center p-3 font-semibold text-slate-600 dark:text-slate-300 min-w-[80px]">Target (h)</th>
                <th className="text-center p-3 font-semibold text-slate-600 dark:text-slate-300 min-w-[80px]">Actual (h)</th>
                <th className="text-center p-3 font-semibold text-slate-600 dark:text-slate-300 min-w-[130px]">Timer</th>
                <th className="text-left p-3 font-semibold text-slate-600 dark:text-slate-300 min-w-[120px]">Notes</th>
                <th className="p-3 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {day.tasks.map(task => (
                <tr key={task.id} className={`border-t border-slate-100 dark:border-slate-700/30 transition-colors ${getRowColor(task)}`}>
                  <td className="p-3">
                    <select
                      value={task.subject}
                      onChange={e => updateTask(task.id, 'subject', e.target.value)}
                      className="w-full bg-transparent border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1.5 text-sm text-slate-900 dark:text-white"
                    >
                      {settings.subjects.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="p-3">
                    <input
                      type="text"
                      value={task.topic}
                      onChange={e => updateTask(task.id, 'topic', e.target.value)}
                      placeholder="Topic / Chapter"
                      className="w-full bg-transparent border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1.5 text-sm text-slate-900 dark:text-white placeholder-slate-400"
                    />
                  </td>
                  <td className="p-3">
                    <input
                      type="number"
                      min="0" step="0.5"
                      value={task.targetHours || ''}
                      onChange={e => updateTask(task.id, 'targetHours', e.target.value)}
                      className="w-full bg-transparent border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1.5 text-sm text-center text-slate-900 dark:text-white"
                    />
                  </td>
                  <td className="p-3">
                    <input
                      type="number"
                      min="0" step="0.25"
                      value={task.actualHours || ''}
                      onChange={e => updateTask(task.id, 'actualHours', e.target.value)}
                      className="w-full bg-transparent border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1.5 text-sm text-center text-slate-900 dark:text-white"
                    />
                  </td>
                  <td className="p-3">
                    <div className="flex justify-center">
                      <StopwatchTimer onTimeAdd={(h) => handleTimerAdd(task.id, h)} />
                    </div>
                  </td>
                  <td className="p-3">
                    <input
                      type="text"
                      value={task.notes}
                      onChange={e => updateTask(task.id, 'notes', e.target.value)}
                      placeholder="Notes"
                      className="w-full bg-transparent border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1.5 text-sm text-slate-900 dark:text-white placeholder-slate-400"
                    />
                  </td>
                  <td className="p-3">
                    <button
                      onClick={() => removeTask(task.id)}
                      title="Remove task"
                      className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:bg-rose-100 hover:text-rose-600 dark:hover:bg-rose-500/20 transition-colors"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-3 border-t border-slate-100 dark:border-slate-700/30">
          <button
            onClick={addTask}
            className="px-4 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 font-medium text-sm hover:bg-indigo-100 dark:hover:bg-indigo-500/25 transition-colors"
          >
            + Add Task
          </button>
        </div>
      </div>

      {/* Wellbeing Section */}
      {settings.showWellbeing && (
        <div className="bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/40 p-5">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-4">🧘 Wellbeing</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">😴 Sleep (hours)</label>
              <input
                type="number" min="0" max="24" step="0.5"
                value={day.wellbeing.sleepHours}
                onChange={e => updateWellbeing('sleepHours', parseFloat(e.target.value) || 0)}
                className="w-full border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-transparent text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">💧 Water (litres)</label>
              <input
                type="number" min="0" max="10" step="0.5"
                value={day.wellbeing.waterLitres}
                onChange={e => updateWellbeing('waterLitres', parseFloat(e.target.value) || 0)}
                className="w-full border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-transparent text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">🏃 Exercise</label>
              <button
                onClick={() => updateWellbeing('exercise', !day.wellbeing.exercise)}
                className={`w-full py-2 rounded-lg text-sm font-medium transition-colors
                  ${day.wellbeing.exercise
                    ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                  }`}
              >
                {day.wellbeing.exercise ? '✅ Done' : '❌ Skipped'}
              </button>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">😊 Mood</label>
              <div className="flex gap-1.5">
                {MOODS.map((emoji, i) => (
                  <button
                    key={i}
                    onClick={() => updateWellbeing('mood', i)}
                    className={`text-xl p-1 rounded-lg transition-all
                      ${day.wellbeing.mood === i
                        ? 'bg-indigo-100 dark:bg-indigo-500/20 scale-110'
                        : 'opacity-50 hover:opacity-80'
                      }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   PERIOD SUMMARY TAB
   ═══════════════════════════════════════════════════════════════ */

function PeriodSummary({ data }) {
  const { days, settings } = data;

  const stats = useMemo(() => {
    const subjectMap = {};
    let totalHours = 0;
    let totalTarget = 0;
    let tasksWithTarget = 0;
    let tasksMet = 0;
    let bestDay = { day: 0, hours: 0 };

    for (let d = 1; d <= 30; d++) {
      const dayData = days[d];
      let dayH = 0;
      dayData.tasks.forEach(t => {
        const h = t.actualHours || 0;
        const th = t.targetHours || 0;
        dayH += h;
        totalHours += h;
        totalTarget += th;
        if (th > 0) {
          tasksWithTarget++;
          if (h >= th) tasksMet++;
        }
        subjectMap[t.subject] = (subjectMap[t.subject] || 0) + h;
      });
      if (dayH > bestDay.hours) bestDay = { day: d, hours: dayH };
    }

    const subjects = Object.entries(subjectMap)
      .map(([name, hours]) => ({ name, hours: +hours.toFixed(1) }))
      .sort((a, b) => b.hours - a.hours);

    const activeDays = Object.values(days).filter(d => d.tasks.some(t => t.actualHours > 0)).length;

    return {
      totalHours: +totalHours.toFixed(1),
      totalTarget: +totalTarget.toFixed(1),
      avgPerDay: activeDays > 0 ? +(totalHours / activeDays).toFixed(1) : 0,
      activeDays,
      completionRate: tasksWithTarget > 0 ? Math.round((tasksMet / tasksWithTarget) * 100) : 0,
      bestDay,
      subjects,
    };
  }, [days]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon="📚" label="Total Hours" value={stats.totalHours + 'h'} sub={`Target: ${stats.totalTarget}h`} color="indigo" />
        <StatCard icon="📅" label="Active Days" value={`${stats.activeDays}/30`} sub={`Avg: ${stats.avgPerDay}h/day`} color="emerald" />
        <StatCard icon="✅" label="Completion" value={stats.completionRate + '%'} sub="Tasks on target" color="amber" />
        <StatCard icon="🏆" label="Best Day" value={stats.bestDay.day > 0 ? `Day ${stats.bestDay.day}` : '—'} sub={stats.bestDay.hours > 0 ? `${stats.bestDay.hours.toFixed(1)}h studied` : 'No data yet'} color="rose" />
      </div>

      {/* Subject Breakdown Table */}
      <div className="bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/40 overflow-hidden">
        <h3 className="font-semibold text-slate-900 dark:text-white p-5 pb-3">📖 Subject-wise Breakdown</h3>
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-700/40">
                <th className="text-left p-3 font-semibold text-slate-600 dark:text-slate-300">Subject</th>
                <th className="text-center p-3 font-semibold text-slate-600 dark:text-slate-300">Hours</th>
                <th className="text-left p-3 font-semibold text-slate-600 dark:text-slate-300 min-w-[200px]">Progress</th>
                <th className="text-center p-3 font-semibold text-slate-600 dark:text-slate-300">% of Total</th>
              </tr>
            </thead>
            <tbody>
              {stats.subjects.map((s, i) => {
                const pct = stats.totalHours > 0 ? Math.round((s.hours / stats.totalHours) * 100) : 0;
                return (
                  <tr key={s.name} className="border-t border-slate-100 dark:border-slate-700/30">
                    <td className="p-3 font-medium text-slate-900 dark:text-white flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                      {s.name}
                    </td>
                    <td className="p-3 text-center text-slate-700 dark:text-slate-300">{s.hours}h</td>
                    <td className="p-3">
                      <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2.5">
                        <div
                          className="h-2.5 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                        />
                      </div>
                    </td>
                    <td className="p-3 text-center text-slate-700 dark:text-slate-300">{pct}%</td>
                  </tr>
                );
              })}
              {stats.subjects.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-400 dark:text-slate-500">
                    No study hours logged yet. Head to Day Sheet to start!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Per-day chart */}
      <div className="bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/40 p-5">
        <h3 className="font-semibold text-slate-900 dark:text-white mb-4">📈 Daily Study Hours</h3>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={Array.from({ length: 30 }, (_, i) => ({
            day: `D${i + 1}`,
            hours: +(days[i + 1]?.tasks.reduce((s, t) => s + (t.actualHours || 0), 0) || 0).toFixed(1),
          }))}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" strokeOpacity={0.3} />
            <XAxis dataKey="day" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip />
            <Line type="monotone" dataKey="hours" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MOCK ANALYSIS TAB
   ═══════════════════════════════════════════════════════════════ */

function MockAnalysis({ data, setData }) {
  const { mocks, settings } = data;
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: '', date: todayISO(), totalScore: '', maxScore: '200',
    subjectScores: {},
  });
  const [showBreakdown, setShowBreakdown] = useState(false);

  const resetForm = () => {
    setForm({ name: '', date: todayISO(), totalScore: '', maxScore: '200', subjectScores: {} });
    setShowBreakdown(false);
    setShowForm(false);
  };

  const addMock = () => {
    if (!form.name || !form.totalScore) return;
    const newMock = {
      id: uid(),
      name: form.name,
      date: form.date,
      totalScore: parseFloat(form.totalScore) || 0,
      maxScore: parseFloat(form.maxScore) || 200,
      subjectScores: { ...form.subjectScores },
    };
    setData(prev => ({ ...prev, mocks: [...prev.mocks, newMock] }));
    resetForm();
  };

  const removeMock = (id) => {
    setData(prev => ({ ...prev, mocks: prev.mocks.filter(m => m.id !== id) }));
  };

  const updateSubjectScore = (subject, field, value) => {
    setForm(prev => ({
      ...prev,
      subjectScores: {
        ...prev.subjectScores,
        [subject]: { ...(prev.subjectScores[subject] || { correct: 0, wrong: 0, skipped: 0 }), [field]: parseInt(value) || 0 },
      },
    }));
  };

  // Line chart data
  const lineData = mocks.map((m, i) => ({
    name: m.name || `Mock ${i + 1}`,
    score: m.totalScore,
    percentile: estimatePercentile(m.totalScore, m.maxScore),
  }));

  // Accuracy pie data (aggregated across all mocks)
  const accuracyData = useMemo(() => {
    const agg = {};
    mocks.forEach(m => {
      Object.entries(m.subjectScores || {}).forEach(([subj, scores]) => {
        if (!agg[subj]) agg[subj] = { correct: 0, wrong: 0, skipped: 0 };
        agg[subj].correct += scores.correct || 0;
        agg[subj].wrong += scores.wrong || 0;
        agg[subj].skipped += scores.skipped || 0;
      });
    });
    return Object.entries(agg)
      .map(([name, s]) => ({ name, accuracy: s.correct + s.wrong > 0 ? Math.round((s.correct / (s.correct + s.wrong)) * 100) : 0, total: s.correct + s.wrong + s.skipped }))
      .filter(s => s.total > 0);
  }, [mocks]);

  const latestMock = mocks.length > 0 ? mocks[mocks.length - 1] : null;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon="🎯" label="Total Mocks" value={mocks.length} color="indigo" />
        <StatCard icon="📊" label="Latest Score"
          value={latestMock ? `${latestMock.totalScore}/${latestMock.maxScore}` : '—'}
          sub={latestMock ? latestMock.name : ''}
          color="emerald" />
        <StatCard icon="📈" label="Best Score"
          value={mocks.length > 0 ? Math.max(...mocks.map(m => m.totalScore)) : '—'}
          color="amber" />
        <StatCard icon="🏅" label="Est. Percentile"
          value={latestMock ? estimatePercentile(latestMock.totalScore, latestMock.maxScore) + '%' : '—'}
          color="rose" />
      </div>

      {/* Add Mock Form */}
      <div className="bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/40 p-5">
        {!showForm ? (
          <button onClick={() => setShowForm(true)}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 text-white font-medium text-sm hover:bg-indigo-700 transition-colors">
            + Add Mock Test
          </button>
        ) : (
          <div className="space-y-4 tab-enter">
            <h3 className="font-semibold text-slate-900 dark:text-white">Add Mock Test</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Mock Name" className="border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-transparent text-slate-900 dark:text-white placeholder-slate-400" />
              <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                className="border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-transparent text-slate-900 dark:text-white" />
              <input type="number" value={form.totalScore} onChange={e => setForm(f => ({ ...f, totalScore: e.target.value }))}
                placeholder="Score" className="border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-transparent text-slate-900 dark:text-white placeholder-slate-400" />
              <input type="number" value={form.maxScore} onChange={e => setForm(f => ({ ...f, maxScore: e.target.value }))}
                placeholder="Max Score" className="border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-transparent text-slate-900 dark:text-white placeholder-slate-400" />
            </div>

            {/* Subject breakdown toggle */}
            <button onClick={() => setShowBreakdown(b => !b)}
              className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline">
              {showBreakdown ? '▼ Hide' : '▶ Show'} subject-wise breakdown
            </button>

            {showBreakdown && (
              <div className="overflow-x-auto scrollbar-thin">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-700/40">
                      <th className="text-left p-2 font-semibold text-slate-600 dark:text-slate-300">Subject</th>
                      <th className="text-center p-2 font-semibold text-slate-600 dark:text-slate-300">Correct</th>
                      <th className="text-center p-2 font-semibold text-slate-600 dark:text-slate-300">Wrong</th>
                      <th className="text-center p-2 font-semibold text-slate-600 dark:text-slate-300">Skipped</th>
                    </tr>
                  </thead>
                  <tbody>
                    {settings.subjects.map(s => (
                      <tr key={s} className="border-t border-slate-100 dark:border-slate-700/30">
                        <td className="p-2 text-slate-900 dark:text-white">{s}</td>
                        {['correct', 'wrong', 'skipped'].map(f => (
                          <td key={f} className="p-2">
                            <input type="number" min="0"
                              value={form.subjectScores[s]?.[f] || ''}
                              onChange={e => updateSubjectScore(s, f, e.target.value)}
                              className="w-16 border border-slate-200 dark:border-slate-600 rounded px-2 py-1 text-center text-sm bg-transparent text-slate-900 dark:text-white" />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={addMock}
                className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-medium text-sm hover:bg-indigo-700 transition-colors">Save Mock</button>
              <button onClick={resetForm}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium text-sm hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">Cancel</button>
            </div>
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Score Trend Line Chart */}
        <div className="bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/40 p-5">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-4">📈 Score Trend</h3>
          {lineData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={lineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" strokeOpacity={0.3} />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={2} dot={{ r: 4 }} name="Score" />
                <Line type="monotone" dataKey="percentile" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} strokeDasharray="5 3" name="Percentile" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-slate-400">Add mocks to see trends</div>
          )}
        </div>

        {/* Subject Accuracy Pie */}
        <div className="bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/40 p-5">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-4">🎯 Subject Accuracy</h3>
          {accuracyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={accuracyData} cx="50%" cy="50%" outerRadius={90}
                  dataKey="accuracy" label={({ name, accuracy }) => `${name}: ${accuracy}%`} labelLine={{ strokeWidth: 1 }}>
                  {accuracyData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => `${v}%`} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-slate-400">Add subject breakdown data to mocks</div>
          )}
        </div>
      </div>

      {/* Mock History Table */}
      {mocks.length > 0 && (
        <div className="bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/40 overflow-hidden">
          <h3 className="font-semibold text-slate-900 dark:text-white p-5 pb-3">📋 Mock History</h3>
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-700/40">
                  <th className="text-left p-3 font-semibold text-slate-600 dark:text-slate-300">Name</th>
                  <th className="text-center p-3 font-semibold text-slate-600 dark:text-slate-300">Date</th>
                  <th className="text-center p-3 font-semibold text-slate-600 dark:text-slate-300">Score</th>
                  <th className="text-center p-3 font-semibold text-slate-600 dark:text-slate-300">Percentile</th>
                  <th className="p-3 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {mocks.map(m => (
                  <tr key={m.id} className="border-t border-slate-100 dark:border-slate-700/30">
                    <td className="p-3 font-medium text-slate-900 dark:text-white">{m.name}</td>
                    <td className="p-3 text-center text-slate-600 dark:text-slate-400">{m.date}</td>
                    <td className="p-3 text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300">
                        {m.totalScore}/{m.maxScore}
                      </span>
                    </td>
                    <td className="p-3 text-center text-emerald-600 dark:text-emerald-400 font-medium">
                      {estimatePercentile(m.totalScore, m.maxScore)}%
                    </td>
                    <td className="p-3">
                      <button onClick={() => removeMock(m.id)}
                        className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:bg-rose-100 hover:text-rose-600 dark:hover:bg-rose-500/20 transition-colors">✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   CURRENT AFFAIRS LOG TAB
   ═══════════════════════════════════════════════════════════════ */

function CurrentAffairsLog({ data, setData }) {
  const { currentAffairs, settings } = data;
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ date: todayISO(), topic: '', category: 'Polity', source: '', notes: '' });

  const addEntry = () => {
    if (!form.topic) return;
    setData(prev => ({
      ...prev,
      currentAffairs: [{ id: uid(), ...form, revised: false }, ...prev.currentAffairs],
    }));
    setForm({ date: todayISO(), topic: '', category: 'Polity', source: '', notes: '' });
    setShowForm(false);
  };

  const removeEntry = (id) => {
    setData(prev => ({ ...prev, currentAffairs: prev.currentAffairs.filter(e => e.id !== id) }));
  };

  const toggleRevised = (id) => {
    setData(prev => ({
      ...prev,
      currentAffairs: prev.currentAffairs.map(e => e.id === id ? { ...e, revised: !e.revised } : e),
    }));
  };

  const filtered = useMemo(() => {
    let list = currentAffairs;
    if (filter !== 'All') list = list.filter(e => e.category === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(e =>
        e.topic.toLowerCase().includes(q) ||
        e.notes.toLowerCase().includes(q) ||
        e.source.toLowerCase().includes(q)
      );
    }
    return list;
  }, [currentAffairs, filter, search]);

  const markAllRevised = () => {
    const ids = new Set(filtered.map(e => e.id));
    setData(prev => ({
      ...prev,
      currentAffairs: prev.currentAffairs.map(e => ids.has(e.id) ? { ...e, revised: true } : e),
    }));
  };

  const revisedCount = currentAffairs.filter(e => e.revised).length;

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard icon="📰" label="Total Entries" value={currentAffairs.length} color="indigo" />
        <StatCard icon="✅" label="Revised" value={revisedCount} sub={`of ${currentAffairs.length}`} color="emerald" />
        <StatCard icon="📂" label="Categories"
          value={new Set(currentAffairs.map(e => e.category)).size}
          color="amber" />
      </div>

      {/* Filters & Search */}
      <div className="bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/40 p-4 space-y-3">
        {/* Category chips */}
        <div className="overflow-x-auto scrollbar-thin pb-1">
          <div className="flex gap-2 min-w-max">
            {CA_CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap
                  ${filter === cat
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
                  }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
        {/* Search + actions */}
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="🔍 Search topics, notes, sources..."
            className="flex-1 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm bg-transparent text-slate-900 dark:text-white placeholder-slate-400"
          />
          <div className="flex gap-2">
            <button onClick={markAllRevised}
              className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-medium text-sm hover:bg-emerald-700 transition-colors whitespace-nowrap">
              ✅ Mark All Revised
            </button>
            <button onClick={() => setShowForm(f => !f)}
              className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-medium text-sm hover:bg-indigo-700 transition-colors whitespace-nowrap">
              + Add Entry
            </button>
          </div>
        </div>
      </div>

      {/* Add Entry Form */}
      {showForm && (
        <div className="bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/40 p-5 space-y-3 tab-enter">
          <h3 className="font-semibold text-slate-900 dark:text-white">New Current Affairs Entry</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
              className="border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-transparent text-slate-900 dark:text-white" />
            <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
              className="border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-transparent text-slate-900 dark:text-white">
              {CA_CATEGORIES.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input value={form.topic} onChange={e => setForm(f => ({ ...f, topic: e.target.value }))}
              placeholder="Topic" className="border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-transparent text-slate-900 dark:text-white placeholder-slate-400 sm:col-span-2" />
            <input value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))}
              placeholder="Source (e.g., The Hindu)" className="border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-transparent text-slate-900 dark:text-white placeholder-slate-400" />
            <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Notes" className="border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-transparent text-slate-900 dark:text-white placeholder-slate-400" />
          </div>
          <div className="flex gap-3">
            <button onClick={addEntry}
              className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-medium text-sm hover:bg-indigo-700 transition-colors">Add</button>
            <button onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium text-sm hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">Cancel</button>
          </div>
        </div>
      )}

      {/* Entries Table */}
      <div className="bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/40 overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-700/40">
                <th className="text-center p-3 font-semibold text-slate-600 dark:text-slate-300 w-12">✓</th>
                <th className="text-left p-3 font-semibold text-slate-600 dark:text-slate-300 min-w-[90px]">Date</th>
                <th className="text-left p-3 font-semibold text-slate-600 dark:text-slate-300 min-w-[200px]">Topic</th>
                <th className="text-left p-3 font-semibold text-slate-600 dark:text-slate-300 min-w-[100px]">Category</th>
                <th className="text-left p-3 font-semibold text-slate-600 dark:text-slate-300 min-w-[100px]">Source</th>
                <th className="text-left p-3 font-semibold text-slate-600 dark:text-slate-300 min-w-[120px]">Notes</th>
                <th className="p-3 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(entry => (
                <tr key={entry.id}
                  className={`border-t border-slate-100 dark:border-slate-700/30 transition-colors
                    ${entry.revised ? 'bg-emerald-50/50 dark:bg-emerald-500/5' : ''}`}>
                  <td className="p-3 text-center">
                    <input type="checkbox" checked={entry.revised} onChange={() => toggleRevised(entry.id)}
                      className="w-4 h-4 rounded border-slate-300 text-indigo-600 cursor-pointer" />
                  </td>
                  <td className="p-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">{entry.date}</td>
                  <td className="p-3 font-medium text-slate-900 dark:text-white">{entry.topic}</td>
                  <td className="p-3">
                    <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                      {entry.category}
                    </span>
                  </td>
                  <td className="p-3 text-slate-600 dark:text-slate-400">{entry.source}</td>
                  <td className="p-3 text-slate-600 dark:text-slate-400">{entry.notes}</td>
                  <td className="p-3">
                    <button onClick={() => removeEntry(entry.id)}
                      className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:bg-rose-100 hover:text-rose-600 dark:hover:bg-rose-500/20 transition-colors">✕</button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400 dark:text-slate-500">
                    {currentAffairs.length === 0
                      ? 'No current affairs entries yet. Click "+ Add Entry" to start.'
                      : 'No entries match your filters.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SETTINGS TAB
   ═══════════════════════════════════════════════════════════════ */

function SettingsPanel({ data, setData }) {
  const { settings } = data;
  const [newSubject, setNewSubject] = useState('');

  const update = (key, value) => {
    setData(prev => ({ ...prev, settings: { ...prev.settings, [key]: value } }));
  };

  const addSubject = () => {
    const trimmed = newSubject.trim();
    if (!trimmed || settings.subjects.includes(trimmed)) return;
    update('subjects', [...settings.subjects, trimmed]);
    setNewSubject('');
    // Add to all days
    setData(prev => {
      const newDays = { ...prev.days };
      for (let d = 1; d <= 30; d++) {
        newDays[d] = {
          ...newDays[d],
          tasks: [
            ...newDays[d].tasks,
            { id: `d${d}_new_${uid()}`, subject: trimmed, topic: '', targetHours: 0, actualHours: 0, notes: '' },
          ],
        };
      }
      return { ...prev, days: newDays };
    });
  };

  const removeSubject = (subj) => {
    if (settings.subjects.length <= 1) return;
    update('subjects', settings.subjects.filter(s => s !== subj));
    // Remove from all days
    setData(prev => {
      const newDays = { ...prev.days };
      for (let d = 1; d <= 30; d++) {
        newDays[d] = {
          ...newDays[d],
          tasks: newDays[d].tasks.filter(t => t.subject !== subj),
        };
      }
      return { ...prev, days: newDays };
    });
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Exam Date */}
      <div className="bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/40 p-5">
        <h3 className="font-semibold text-slate-900 dark:text-white mb-4">📅 Exam Date</h3>
        <input
          type="date"
          value={settings.examDate}
          onChange={e => update('examDate', e.target.value)}
          className="border border-slate-200 dark:border-slate-600 rounded-lg px-4 py-2.5 text-sm bg-transparent text-slate-900 dark:text-white w-full max-w-xs"
        />
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Used for the countdown timer on the Dashboard.</p>
      </div>

      {/* Period Name */}
      <div className="bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/40 p-5">
        <h3 className="font-semibold text-slate-900 dark:text-white mb-4">📝 Study Period Name</h3>
        <input
          type="text"
          value={settings.periodName}
          onChange={e => update('periodName', e.target.value)}
          placeholder="e.g., 30-Day Sprint"
          className="border border-slate-200 dark:border-slate-600 rounded-lg px-4 py-2.5 text-sm bg-transparent text-slate-900 dark:text-white w-full max-w-md"
        />
      </div>

      {/* Subject Management */}
      <div className="bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/40 p-5">
        <h3 className="font-semibold text-slate-900 dark:text-white mb-4">📖 Subjects</h3>
        <div className="flex flex-wrap gap-2 mb-4">
          {settings.subjects.map(s => (
            <span key={s} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 text-sm font-medium">
              {s}
              <button onClick={() => removeSubject(s)}
                className="w-4 h-4 rounded-full flex items-center justify-center text-xs hover:bg-indigo-200 dark:hover:bg-indigo-500/30 transition-colors">✕</button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newSubject}
            onChange={e => setNewSubject(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addSubject()}
            placeholder="Add new subject..."
            className="flex-1 border border-slate-200 dark:border-slate-600 rounded-lg px-4 py-2 text-sm bg-transparent text-slate-900 dark:text-white placeholder-slate-400 max-w-sm"
          />
          <button onClick={addSubject}
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-medium text-sm hover:bg-indigo-700 transition-colors">
            Add
          </button>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Adding/removing subjects updates all day sheets.</p>
      </div>

      {/* Wellbeing Toggle */}
      <div className="bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/40 p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-white">🧘 Wellbeing Section</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Show sleep, water, exercise, and mood tracking on Day Sheets.</p>
          </div>
          <button
            onClick={() => update('showWellbeing', !settings.showWellbeing)}
            className={`relative w-12 h-7 rounded-full transition-colors ${
              settings.showWellbeing ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'
            }`}
          >
            <span className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ${
              settings.showWellbeing ? 'translate-x-5.5' : 'translate-x-0.5'
            }`} />
          </button>
        </div>
      </div>
    </div>
  );
}

function Footer() {
  return (
    <footer className="border-t border-slate-200 dark:border-slate-700/40 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-5">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">

          {/* Left — branding */}
          <div className="flex items-center gap-2.5">
            <span className="text-xl">🇮🇳</span>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Prepared &amp; designed by{' '}
              <a
                href="https://www.easywebpresence.co.in/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent hover:from-indigo-500 hover:to-purple-500 transition-all inline-flex items-center gap-1"
              >
                Sudarshan Mishra
              </a>
            </p>
          </div>

          {/* Right — tech stack note */}
          <p className="text-xs text-slate-400 dark:text-slate-500 text-center sm:text-right">
            UPSC Prelims Prep Tracker &nbsp;·&nbsp; Built with React + Recharts
          </p>

        </div>
      </div>
    </footer>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN APP COMPONENT
   ═══════════════════════════════════════════════════════════════ */

export default function UPSCTracker() {
  const [data, setData] = useState(loadState);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showReset, setShowReset] = useState(false);

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  // Dark mode class toggle
  useEffect(() => {
    document.documentElement.classList.toggle('dark', data.settings.darkMode);
  }, [data.settings.darkMode]);

  const toggleDark = () => {
    setData(prev => ({
      ...prev,
      settings: { ...prev.settings, darkMode: !prev.settings.darkMode },
    }));
  };

  const handleReset = () => {
    const fresh = createInitialState();
    setData(fresh);
    localStorage.removeItem(STORAGE_KEY);
    setShowReset(false);
    setActiveTab('dashboard');
  };

  const renderTab = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard data={data} setData={setData} />;
      case 'daysheet':  return <DaySheet data={data} setData={setData} />;
      case 'summary':   return <PeriodSummary data={data} />;
      case 'mocks':     return <MockAnalysis data={data} setData={setData} />;
      case 'ca':        return <CurrentAffairsLog data={data} setData={setData} />;
      case 'settings':  return <SettingsPanel data={data} setData={setData} />;
      default:          return <Dashboard data={data} setData={setData} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300">
      {/* Header */}
      <header className="bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 text-white px-4 md:px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg md:text-xl font-bold tracking-tight">{data.settings.periodName || 'UPSC Prep Tracker'}</h1>
            <p className="text-indigo-200 text-xs md:text-sm">UPSC Prelims 2026</p>
          </div>
          <button
            onClick={toggleDark}
            className="w-10 h-10 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center text-xl transition-all backdrop-blur-sm"
            title={data.settings.darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {data.settings.darkMode ? '☀️' : '🌙'}
          </button>
        </div>
      </header>

      {/* Tab Bar */}
      <TabBar activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Tab Content */}
      <main className="max-w-7xl mx-auto px-4 md:px-6 py-6 pb-24 md:pb-6">
        <div key={activeTab} className="tab-enter">
          {renderTab()}
        </div>
      </main>
      <Footer />

      {/* Floating Reset FAB */}
      <button
        onClick={() => setShowReset(true)}
        className="fixed bottom-20 md:bottom-6 right-4 md:right-6 w-12 h-12 rounded-full bg-rose-600 text-white shadow-lg shadow-rose-600/30 hover:bg-rose-700 hover:shadow-xl hover:scale-105 flex items-center justify-center text-lg transition-all z-30"
        title="Reset All Data"
      >
        🗑️
      </button>

      {/* Reset Modal */}
      {showReset && <ResetModal onConfirm={handleReset} onCancel={() => setShowReset(false)} />}
    </div>
  );
}
