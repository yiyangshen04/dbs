'use client';

import { useTaskContext } from '@/context/TaskContext';

const priorityLabels = {
  low: { label: 'Low', color: 'bg-emerald-500', text: 'text-emerald-600' },
  medium: { label: 'Medium', color: 'bg-amber-500', text: 'text-amber-600' },
  high: { label: 'High', color: 'bg-red-500', text: 'text-red-600' },
};

export default function ReviewPage() {
  const { tasks } = useTaskContext();

  const total = tasks.length;
  const completed = tasks.filter(t => t.completed).length;
  const pending = total - completed;
  const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

  const categoryStats = ['Uncategorized', 'Work', 'Study', 'Life', 'Ideas'].map(cat => {
    const catTasks = tasks.filter(t => t.category === cat);
    return { name: cat, total: catTasks.length, completed: catTasks.filter(t => t.completed).length };
  }).filter(c => c.total > 0);

  const priorityStats = (['high', 'medium', 'low'] as const).map(p => {
    const pTasks = tasks.filter(t => t.priority === p);
    return { priority: p, total: pTasks.length, pending: pTasks.filter(t => !t.completed).length };
  }).filter(p => p.total > 0);

  const pendingTasks = tasks.filter(t => !t.completed).sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return order[a.priority] - order[b.priority];
  });

  // SVG ring chart params
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (rate / 100) * circumference;

  if (total === 0) {
    return (
      <div className="p-6 text-center pt-24">
        <p className="text-muted text-sm">No data yet. Add tasks to see your dashboard.</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-lg font-semibold text-foreground mb-6">Dashboard</h1>

      {/* Top row: ring chart + stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {/* Ring chart */}
        <div className="md:col-span-1 bg-surface rounded-xl border border-border p-5 flex flex-col items-center justify-center shadow-sm">
          <svg width="140" height="140" className="transform -rotate-90">
            <circle cx="70" cy="70" r={radius} fill="none" stroke="var(--border)" strokeWidth="8" />
            <circle
              cx="70" cy="70" r={radius} fill="none" stroke="var(--accent)" strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-700"
            />
          </svg>
          <p className="text-2xl font-bold text-foreground -mt-[90px] mb-[50px]">{rate}%</p>
          <p className="text-[11px] text-muted">Completion Rate</p>
        </div>

        {/* Stat cards */}
        <div className="md:col-span-3 grid grid-cols-3 gap-4">
          <StatCard label="Total Tasks" value={total} accent="text-foreground" />
          <StatCard label="Completed" value={completed} accent="text-emerald-500" />
          <StatCard label="Pending" value={pending} accent="text-amber-500" />
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* By category */}
        {categoryStats.length > 0 && (
          <div className="bg-surface rounded-xl border border-border p-5 shadow-sm">
            <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-4">Categories</h3>
            <div className="space-y-3">
              {categoryStats.map(cat => (
                <div key={cat.name} className="flex items-center gap-3">
                  <span className="text-sm text-foreground flex-1">{cat.name}</span>
                  <div className="w-24 h-1.5 bg-border rounded-full overflow-hidden">
                    <div className="h-full bg-accent rounded-full" style={{ width: `${cat.total > 0 ? (cat.completed / cat.total) * 100 : 0}%` }} />
                  </div>
                  <span className="text-[11px] text-muted w-8 text-right">{cat.completed}/{cat.total}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* By priority */}
        {priorityStats.length > 0 && (
          <div className="bg-surface rounded-xl border border-border p-5 shadow-sm">
            <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-4">Priorities</h3>
            <div className="space-y-3">
              {priorityStats.map(p => (
                <div key={p.priority} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${priorityLabels[p.priority].color}`} />
                    <span className="text-sm text-foreground">{priorityLabels[p.priority].label}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {p.pending > 0 && <span className="text-[11px] text-amber-500">{p.pending} left</span>}
                    <span className="text-[11px] text-muted">{p.total} total</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pending list */}
        {pendingTasks.length > 0 && (
          <div className="bg-surface rounded-xl border border-border p-5 shadow-sm md:col-span-2">
            <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-4">
              Pending Tasks <span className="text-accent ml-1">{pendingTasks.length}</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {pendingTasks.map(task => (
                <div key={task.id} className="flex items-center gap-2 text-sm py-1">
                  <div className={`w-1.5 h-1.5 rounded-full ${priorityLabels[task.priority].color}`} />
                  <span className="text-foreground/80 truncate">{task.content}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="bg-surface rounded-xl border border-border p-5 shadow-sm">
      <p className="text-[11px] text-muted uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-3xl font-bold ${accent}`}>{value}</p>
    </div>
  );
}
