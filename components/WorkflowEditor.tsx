import React, { useState, useRef, useEffect } from 'react';
import { Reorder, motion, AnimatePresence } from 'motion/react';
import { GripVertical, Plus, Trash2, Check, Save, ChevronRight, Lock } from 'lucide-react';
import { WorkflowStatus } from '../types';

const COLOR_PRESETS = [
  '#9ef5a3', '#b59df4', '#ffada8', '#60a5fa', '#f472b6',
  '#fbbf24', '#34d399', '#fb923c', '#38bdf8', '#f87171',
  '#a78bfa', '#e2e8f0',
];

// ─── Color Picker Popover ─────────────────────────────────────────────────────

const ColorPicker = ({ color, onChange, onClose }: { color: string; onChange: (c: string) => void; onClose: () => void }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.88, y: -6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.88, y: -6 }}
      transition={{ type: 'spring', damping: 20, stiffness: 300 }}
      className="absolute top-full left-0 mt-2 z-50 bg-surface-card border border-hairline rounded-lg p-3 shadow-sm w-[152px]"
    >
      <p className="text-[9px] font-bold uppercase text-muted tracking-widest mb-2">Color</p>
      <div className="grid grid-cols-6 gap-1.5">
        {COLOR_PRESETS.map(c => (
          <button
            key={c}
            onClick={() => { onChange(c); onClose(); }}
            className="relative w-5 h-5 rounded-full transition-all duration-150 hover:scale-125 focus:outline-none"
            style={{ background: c, boxShadow: color === c ? `0 0 0 2px #18181b, 0 0 0 3.5px ${c}` : undefined }}
          >
            {color === c && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Check size={8} className="text-black" strokeWidth={4} />
              </div>
            )}
          </button>
        ))}
      </div>
    </motion.div>
  );
};

// ─── Type Badge Toggle ────────────────────────────────────────────────────────

const TYPE_OPTIONS: { value: WorkflowStatus['type']; label: string }[] = [
  { value: 'start',  label: 'Start'  },
  { value: 'active', label: 'Active' },
  { value: 'done',   label: 'Done'   },
];

const TypeToggle = ({ value, onChange }: { value: WorkflowStatus['type']; onChange: (t: WorkflowStatus['type']) => void }) => {
  const styles: Record<WorkflowStatus['type'], string> = {
    start:  "bg-surface-strong text-body border-hairline-strong",
    active: "bg-blue-100 text-blue-700 border-blue-200",
    done:   "bg-primary/10 text-primary border-primary/30",
  };

  return (
    <div className="flex rounded-lg overflow-hidden border border-border">
      {TYPE_OPTIONS.map(opt => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-2.5 py-1 text-[11px] font-bold transition-all duration-200 ${
            value === opt.value ? styles[opt.value] : 'text-muted-soft hover:text-muted bg-transparent'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

interface WorkflowEditorProps {
  workflow: WorkflowStatus[];
  onSave: (workflow: WorkflowStatus[]) => Promise<void>;
}

const WorkflowEditor: React.FC<WorkflowEditorProps> = ({ workflow, onSave }) => {
  const [statuses, setStatuses] = useState<WorkflowStatus[]>([...workflow].sort((a, b) => a.order - b.order));
  const [openPickerId, setOpenPickerId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [blockedDeleteId, setBlockedDeleteId] = useState<string | null>(null);

  // Sync if parent workflow changes (e.g. on project switch)
  useEffect(() => {
    setStatuses([...workflow].sort((a, b) => a.order - b.order));
  }, [workflow]);

  const isDirty = JSON.stringify(statuses.map(s => ({ ...s, order: 0 }))) !==
    JSON.stringify([...workflow].sort((a, b) => a.order - b.order).map(s => ({ ...s, order: 0 })));

  // Split into reorderable (non-done) and locked (done) sections
  const reorderable = statuses.filter(s => s.type !== 'done');
  const doneStatuses = statuses.filter(s => s.type === 'done');

  const handleReorder = (newReorderable: WorkflowStatus[]) => {
    setStatuses([...newReorderable, ...doneStatuses]);
  };

  // When a status type changes to 'done', it moves to the locked section automatically
  const updateStatus = (id: string, updates: Partial<WorkflowStatus>) => {
    setStatuses(prev => {
      const updated = prev.map(s => s.id === id ? { ...s, ...updates } : s);
      // Re-sort: non-done first, done last
      return [...updated.filter(s => s.type !== 'done'), ...updated.filter(s => s.type === 'done')];
    });
  };

  const addStatus = () => {
    const newStatus: WorkflowStatus = {
      id: `status-${Date.now()}`,
      name: 'New Status',
      color: '#60a5fa',
      type: 'active',
      order: reorderable.length, // insert before done
    };
    // Insert before done statuses
    setStatuses(prev => [...prev.filter(s => s.type !== 'done'), newStatus, ...prev.filter(s => s.type === 'done')]);
  };

  const deleteStatus = (id: string) => {
    if (statuses.length <= 1) return;
    setStatuses(prev => prev.filter(s => s.id !== id));
  };

  const handleSave = async () => {
    setSaving(true);
    const ordered = statuses.map((s, i) => ({ ...s, order: i }));
    await onSave(ordered);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="space-y-6">

      {/* ── Pipeline Visualizer ─────────────────────────────────────────── */}
      <div className="bg-canvas-soft rounded-lg p-5 border border-hairline overflow-x-auto">
        <p className="text-[10px] font-bold uppercase text-gray-500 tracking-widest mb-4">Live Preview</p>
        <div className="flex items-center gap-2 flex-nowrap min-w-max">
          {statuses.map((status, i) => (
            <React.Fragment key={status.id}>
              <motion.div
                layout
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap flex-shrink-0 transition-all duration-300"
                style={{
                  background: `${status.color}18`,
                  border: `1.5px solid ${status.color}70`,
                  color: status.color,
                  boxShadow: status.type === 'done' ? `0 0 14px ${status.color}35` : undefined,
                }}
              >
                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: status.color }} />
                {status.name || 'Unnamed'}
                {status.type === 'done' && <Check size={10} strokeWidth={3.5} />}
              </motion.div>
              {i < statuses.length - 1 && (
                <ChevronRight size={13} className="text-muted-soft flex-shrink-0" />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* ── Draggable Status List (non-done) ────────────────────────────── */}
      <Reorder.Group axis="y" values={reorderable} onReorder={handleReorder} className="space-y-2.5" as="div">
        <AnimatePresence initial={false}>
          {reorderable.map(status => (
            <Reorder.Item key={status.id} value={status} as="div">
              <motion.div
                layout
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ type: 'spring', damping: 22, stiffness: 280 }}
                className="flex items-center gap-3 bg-surface-card border border-hairline rounded-lg px-4 py-3 group hover:border-primary/40 transition-colors duration-200 cursor-default"
              >
                {/* Drag Handle */}
                <div className="text-muted-soft hover:text-muted cursor-grab active:cursor-grabbing transition-colors flex-shrink-0">
                  <GripVertical size={17} />
                </div>

                {/* Color Dot */}
                <div className="relative flex-shrink-0">
                  <button
                    onClick={() => setOpenPickerId(openPickerId === status.id ? null : status.id)}
                    className="w-5 h-5 rounded-full transition-all duration-200 hover:scale-125 focus:outline-none focus:ring-2 focus:ring-white/20 ring-offset-2 ring-offset-surface"
                    style={{ background: status.color, boxShadow: `0 0 8px ${status.color}60` }}
                  />
                  <AnimatePresence>
                    {openPickerId === status.id && (
                      <ColorPicker
                        color={status.color}
                        onChange={c => updateStatus(status.id, { color: c })}
                        onClose={() => setOpenPickerId(null)}
                      />
                    )}
                  </AnimatePresence>
                </div>

                {/* Name Input */}
                <input
                  value={status.name}
                  onChange={e => updateStatus(status.id, { name: e.target.value })}
                  className="flex-1 bg-transparent text-sm font-medium text-ink focus:outline-none placeholder-muted-soft min-w-0 cursor-text"
                  placeholder="Status name"
                />

                {/* Delete */}
                <button
                  onClick={() => deleteStatus(status.id)}
                  disabled={statuses.length <= 1}
                  className="text-muted-soft hover:text-error disabled:opacity-0 disabled:pointer-events-none transition-all duration-200 opacity-0 group-hover:opacity-100 flex-shrink-0 ml-1"
                >
                  <Trash2 size={15} />
                </button>
              </motion.div>
            </Reorder.Item>
          ))}
        </AnimatePresence>
      </Reorder.Group>

      {/* ── Add Status ──────────────────────────────────────────────────── */}
      <motion.button
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        onClick={addStatus}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border border-dashed border-hairline-strong text-muted hover:text-ink hover:border-primary/50 hover:bg-primary/5 transition-all duration-200 group"
      >
        <Plus size={16} className="group-hover:scale-125 group-hover:text-primary transition-all duration-200" />
        <span className="text-sm font-bold">Add Status</span>
      </motion.button>

      {/* ── Locked Done Section ─────────────────────────────────────────── */}
      {doneStatuses.length > 0 && (
        <div className="space-y-2.5">
          <div className="flex items-center gap-2">
            <div className="flex-1 h-px bg-hairline" />
            <span className="text-[10px] font-bold uppercase text-muted tracking-widest flex items-center gap-1.5">
              <Lock size={9} /> Terminal
            </span>
            <div className="flex-1 h-px bg-hairline" />
          </div>
          {doneStatuses.map(status => (
            <div key={status.id}>
            <motion.div
              layout
              className="flex items-center gap-3 bg-canvas-soft border border-hairline rounded-lg px-4 py-3 group"
            >
              {/* Lock icon instead of drag handle */}
              <div className="text-muted-soft flex-shrink-0">
                <Lock size={15} />
              </div>

              {/* Color Dot */}
              <div className="relative flex-shrink-0">
                <button
                  onClick={() => setOpenPickerId(openPickerId === status.id ? null : status.id)}
                  className="w-5 h-5 rounded-full transition-all duration-200 hover:scale-110 focus:outline-none"
                  style={{ background: status.color, boxShadow: `0 0 8px ${status.color}60` }}
                />
                <AnimatePresence>
                  {openPickerId === status.id && (
                    <ColorPicker
                      color={status.color}
                      onChange={c => updateStatus(status.id, { color: c })}
                      onClose={() => setOpenPickerId(null)}
                    />
                  )}
                </AnimatePresence>
              </div>

              {/* Name */}
              <input
                value={status.name}
                onChange={e => updateStatus(status.id, { name: e.target.value })}
                className="flex-1 bg-transparent text-sm font-medium text-ink focus:outline-none placeholder-muted-soft min-w-0"
                placeholder="Status name"
              />

              {/* Delete — blocked for Done */}
              <button
                onClick={() => {
                  setBlockedDeleteId(status.id);
                  setTimeout(() => setBlockedDeleteId(null), 3000);
                }}
                className="text-muted-soft hover:text-error transition-all duration-200 opacity-0 group-hover:opacity-100 flex-shrink-0 ml-1"
              >
                <Trash2 size={15} />
              </button>
            </motion.div>

            {/* Blocked message */}
            <AnimatePresence>
              {blockedDeleteId === status.id && (
                <motion.div
                  initial={{ opacity: 0, y: -4, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  exit={{ opacity: 0, y: -4, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="flex items-center gap-2 px-4 py-2 mt-1 rounded-xl bg-error/10 border border-error/20">
                    <span className="text-xs text-error font-medium">You can't delete a terminal status — the workflow needs somewhere tasks go to rest in peace.</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            </div>
          ))}
        </div>
      )}

      {/* ── Save Button ─────────────────────────────────────────────────── */}
      <div className="flex justify-end">
        <motion.button
          whileHover={isDirty && !saving ? { scale: 1.03 } : {}}
          whileTap={isDirty && !saving ? { scale: 0.97 } : {}}
          onClick={handleSave}
          disabled={(!isDirty && !saved) || saving}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all duration-300 ${
            saved
              ? 'bg-primary/15 text-primary border border-primary/30'
              : isDirty
                ? 'bg-primary text-black shadow-[0_0_20px_rgba(209,244,95,0.25)] hover:shadow-[0_0_25px_rgba(209,244,95,0.4)]'
                : 'bg-surface-strong text-muted-soft cursor-not-allowed'
          }`}
        >
          {saving ? (
            <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          ) : saved ? (
            <Check size={16} strokeWidth={3} />
          ) : (
            <Save size={16} />
          )}
          {saving ? 'Saving…' : saved ? 'Workflow Saved!' : 'Save Workflow'}
        </motion.button>
      </div>
    </div>
  );
};

export default WorkflowEditor;
