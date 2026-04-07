'use client';

import { useTaskContext } from '@/context/TaskContext';

const priorityLabels = {
  low: { label: 'Low', color: 'bg-emerald-400', text: 'text-emerald-500' },
  medium: { label: 'Medium', color: 'bg-amber-400', text: 'text-amber-500' },
  high: { label: 'High', color: 'bg-red-400', text: 'text-red-500' },
};

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

function durationBetween(start: string, end: string): string {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ${minutes % 60}m`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}

export default function ReviewPage() {
  const { tasks } = useTaskContext();

  const total = tasks.length;
  const completed = tasks.filter(t => t.completed).length;
  const pending = total - completed;
  const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

  const highPending = tasks.filter(t => !t.completed && t.priority === 'high').length;
  const medPending = tasks.filter(t => !t.completed && t.priority === 'medium').length;
  const lowPending = tasks.filter(t => !t.completed && t.priority === 'low').length;

  // Category stats
  const categoryStats = ['Uncategorized', 'Work', 'Study', 'Life', 'Ideas'].map(cat => {
    const catTasks = tasks.filter(t => t.category === cat);
    return { name: cat, total: catTasks.length, completed: catTasks.filter(t => t.completed).length };
  }).filter(c => c.total > 0);

  // Priority breakdown
  const priorityStats = (['high', 'medium', 'low'] as const).map(p => {
    const pTasks = tasks.filter(t => t.priority === p);
    return { priority: p, total: pTasks.length, completed: pTasks.filter(t => t.completed).length };
  }).filter(p => p.total > 0);

  // Focus next: highest priority unfinished, oldest first
  const focusNext = tasks
    .filter(t => !t.completed)
    .sort((a, b) => {
      const order = { high: 0, medium: 1, low: 2 };
      if (order[a.priority] !== order[b.priority]) return order[a.priority] - order[b.priority];
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    })
    .slice(0, 3);

  // Pending tasks sorted by age (oldest first)
  const pendingByAge = tasks
    .filter(t => !t.completed)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  // Recently completed with duration
  const recentCompleted = tasks
    .filter(t => t.completed && t.completedAt)
    .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime())
    .slice(0, 8);

  // Insight text
  function getInsight(): string {
    if (total === 0) return '';
    if (pending === 0) return 'All done! Nothing left on your plate.';
    if (highPending > 0) return `${highPending} high-priority task${highPending > 1 ? 's' : ''} need${highPending === 1 ? 's' : ''} your attention.`;
    if (rate >= 75) return 'Almost there — just a few more to go.';
    if (rate >= 50) return 'Good progress. Keep the momentum going.';
    if (rate > 0) return `${pending} tasks still waiting. One at a time.`;
    return `${pending} tasks to tackle. Start with what matters most.`;
  }

  // SVG donut chart for category distribution
  const donutSegments = categoryStats.map((cat, i) => {
    const colors = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#6b7280'];
    return { ...cat, color: colors[i % colors.length] };
  });

  if (total === 0) {
    return (
      <div className="max-w-xl mx-auto px-6 pt-24 text-center">
        <p className="text-muted text-sm">No data yet.</p>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-6 py-12">
      {/* Big numbers */}
      <div className="grid grid-cols-4 gap-8 mb-4">
        <div>
          <p className="text-4xl font-light text-foreground">{total}</p>
          <p className="text-[11px] text-muted mt-1">total</p>
        </div>
        <div>
          <p className="text-4xl font-light text-emerald-500">{completed}</p>
          <p className="text-[11px] text-muted mt-1">done</p>
        </div>
        <div>
          <p className="text-4xl font-light text-amber-500">{pending}</p>
          <p className="text-[11px] text-muted mt-1">pending</p>
        </div>
        <div>
          <p className="text-4xl font-light text-accent">{rate}%</p>
          <p className="text-[11px] text-muted mt-1">rate</p>
        </div>
      </div>

      {/* Insight */}
      <p className="text-sm text-muted/70 italic mb-8">{getInsight()}</p>

      {/* Progress bar */}
      <div className="mb-12">
        <div className="h-1 bg-border rounded-full overflow-hidden">
          <div className="h-full bg-accent rounded-full transition-all duration-700" style={{ width: `${rate}%` }} />
        </div>
      </div>

      <div className="space-y-10">

        {/* Focus Next */}
        {focusNext.length > 0 && (
          <div>
            <h3 className="text-[11px] text-muted uppercase tracking-widest mb-4">Focus Next</h3>
            {focusNext.map((task, i) => (
              <div key={task.id} className="flex items-center gap-3 py-2">
                <span className="text-sm text-muted/40 w-4">{i + 1}.</span>
                <span className={`text-xs ${priorityLabels[task.priority].text}`}>●</span>
                <span className="text-sm text-foreground flex-1">{task.content}</span>
                <span className="text-[10px] text-muted/50">{timeAgo(task.createdAt)}</span>
              </div>
            ))}
          </div>
        )}

        {/* Priority Distribution — stacked bar */}
        {priorityStats.length > 0 && (
          <div>
            <h3 className="text-[11px] text-muted uppercase tracking-widest mb-4">Priority Distribution</h3>
            <div className="flex h-2 rounded-full overflow-hidden mb-3">
              {total > 0 && highPending + medPending + lowPending > 0 && (
                <>
                  {highPending > 0 && <div className="bg-red-400 transition-all" style={{ width: `${(highPending / pending) * 100}%` }} />}
                  {medPending > 0 && <div className="bg-amber-400 transition-all" style={{ width: `${(medPending / pending) * 100}%` }} />}
                  {lowPending > 0 && <div className="bg-emerald-400 transition-all" style={{ width: `${(lowPending / pending) * 100}%` }} />}
                </>
              )}
            </div>
            <div className="flex gap-4 text-[11px]">
              {priorityStats.map(p => (
                <span key={p.priority} className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${priorityLabels[p.priority].color}`} />
                  <span className="text-muted">{priorityLabels[p.priority].label}</span>
                  <span className="text-foreground/60">{p.completed}/{p.total}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Category breakdown */}
        {categoryStats.length > 0 && (
          <div>
            <h3 className="text-[11px] text-muted uppercase tracking-widest mb-4">By Category</h3>
            <div className="space-y-3">
              {donutSegments.map(cat => (
                <div key={cat.name} className="flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                  <span className="text-sm text-foreground w-24 truncate">{cat.name}</span>
                  <div className="flex-1 h-1 bg-border rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${cat.total > 0 ? (cat.completed / cat.total) * 100 : 0}%`, backgroundColor: cat.color }} />
                  </div>
                  <span className="text-[11px] text-muted w-8 text-right">{cat.completed}/{cat.total}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pending — with age */}
        {pendingByAge.length > 0 && (
          <div>
            <h3 className="text-[11px] text-muted uppercase tracking-widest mb-4">
              Pending
              <span className="text-muted/30 ml-2 normal-case tracking-normal">oldest first</span>
            </h3>
            {pendingByAge.map(task => (
              <div key={task.id} className="flex items-center gap-3 py-1.5">
                <span className={`text-xs ${priorityLabels[task.priority].text}`}>●</span>
                <span className="text-sm text-foreground/80 flex-1">{task.content}</span>
                <span className="text-[10px] text-muted/50 tabular-nums">
                  created {timeAgo(task.createdAt)}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Recently Done — with duration */}
        {recentCompleted.length > 0 && (
          <div>
            <h3 className="text-[11px] text-muted uppercase tracking-widest mb-4">Recently Done</h3>
            {recentCompleted.map(task => (
              <div key={task.id} className="flex items-center gap-3 py-1.5">
                <span className="text-xs text-emerald-400">✓</span>
                <span className="text-sm text-muted line-through flex-1">{task.content}</span>
                <span className="text-[10px] text-muted/40 tabular-nums">
                  {durationBetween(task.createdAt, task.completedAt!)} to complete
                </span>
                <span className="text-[10px] text-muted/30">
                  {timeAgo(task.completedAt!)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
