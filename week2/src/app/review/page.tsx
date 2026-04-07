'use client';

import { useTaskContext } from '@/context/TaskContext';

const priorityLabels = {
  low: { label: 'Low', color: 'bg-emerald-400' },
  medium: { label: 'Medium', color: 'bg-amber-400' },
  high: { label: 'High', color: 'bg-red-400' },
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
    return { priority: p, total: pTasks.length, completed: pTasks.filter(t => t.completed).length };
  }).filter(p => p.total > 0);

  const pendingTasks = tasks.filter(t => !t.completed).sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return order[a.priority] - order[b.priority];
  });

  const recentCompleted = tasks
    .filter(t => t.completed && t.completedAt)
    .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime())
    .slice(0, 8);

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
      <div className="grid grid-cols-4 gap-8 mb-12">
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

      {/* Progress bar */}
      <div className="mb-12">
        <div className="h-1 bg-border rounded-full overflow-hidden">
          <div className="h-full bg-accent rounded-full transition-all duration-700" style={{ width: `${rate}%` }} />
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-10">
        {/* By category */}
        {categoryStats.length > 0 && (
          <div>
            <h3 className="text-[11px] text-muted uppercase tracking-widest mb-4">By Category</h3>
            <div className="space-y-3">
              {categoryStats.map(cat => (
                <div key={cat.name} className="flex items-center gap-3">
                  <span className="text-sm text-foreground w-24 truncate">{cat.name}</span>
                  <div className="flex-1 h-1 bg-border rounded-full overflow-hidden">
                    <div className="h-full bg-accent/60 rounded-full" style={{ width: `${cat.total > 0 ? (cat.completed / cat.total) * 100 : 0}%` }} />
                  </div>
                  <span className="text-[11px] text-muted w-8 text-right">{cat.completed}/{cat.total}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* By priority */}
        {priorityStats.length > 0 && (
          <div>
            <h3 className="text-[11px] text-muted uppercase tracking-widest mb-4">By Priority</h3>
            <div className="space-y-3">
              {priorityStats.map(p => (
                <div key={p.priority} className="flex items-center gap-3">
                  <span className="text-sm text-foreground w-24">{priorityLabels[p.priority].label}</span>
                  <div className="flex-1 h-1 bg-border rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${priorityLabels[p.priority].color}`} style={{ width: `${p.total > 0 ? (p.completed / p.total) * 100 : 0}%` }} />
                  </div>
                  <span className="text-[11px] text-muted w-8 text-right">{p.completed}/{p.total}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Still pending */}
        {pendingTasks.length > 0 && (
          <div>
            <h3 className="text-[11px] text-muted uppercase tracking-widest mb-4">Still Pending</h3>
            {pendingTasks.map(task => (
              <div key={task.id} className="flex items-center gap-2 py-1.5 text-sm">
                <span className={`text-xs ${task.priority === 'high' ? 'text-red-400' : task.priority === 'medium' ? 'text-amber-400' : 'text-emerald-400'}`}>●</span>
                <span className="text-foreground/80">{task.content}</span>
              </div>
            ))}
          </div>
        )}

        {/* Recently done */}
        {recentCompleted.length > 0 && (
          <div>
            <h3 className="text-[11px] text-muted uppercase tracking-widest mb-4">Recently Done</h3>
            {recentCompleted.map(task => (
              <div key={task.id} className="py-1.5 text-sm text-muted line-through">
                {task.content}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
