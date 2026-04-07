'use client';

import { useTaskContext } from '@/context/TaskContext';

const categoryColors: Record<string, string> = {
  Uncategorized: 'bg-gray-400',
  Work: 'bg-blue-500',
  Study: 'bg-purple-500',
  Life: 'bg-green-500',
  Ideas: 'bg-amber-500',
};

const priorityLabels = {
  low: { label: 'Low', color: 'bg-emerald-500' },
  medium: { label: 'Medium', color: 'bg-amber-500' },
  high: { label: 'High', color: 'bg-red-500' },
};

export default function ReviewPage() {
  const { tasks } = useTaskContext();

  const total = tasks.length;
  const completed = tasks.filter(t => t.completed).length;
  const pending = total - completed;
  const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

  // Category breakdown
  const categoryStats = ['Uncategorized', 'Work', 'Study', 'Life', 'Ideas'].map(cat => {
    const catTasks = tasks.filter(t => t.category === cat);
    const catCompleted = catTasks.filter(t => t.completed).length;
    return { name: cat, total: catTasks.length, completed: catCompleted };
  }).filter(c => c.total > 0);

  // Priority breakdown
  const priorityStats = (['high', 'medium', 'low'] as const).map(p => {
    const pTasks = tasks.filter(t => t.priority === p);
    const pCompleted = pTasks.filter(t => t.completed).length;
    return { priority: p, total: pTasks.length, completed: pCompleted, pending: pTasks.length - pCompleted };
  }).filter(p => p.total > 0);

  // Recent completions
  const recentCompleted = tasks
    .filter(t => t.completed && t.completedAt)
    .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime())
    .slice(0, 10);

  // Pending tasks by priority
  const pendingTasks = tasks
    .filter(t => !t.completed)
    .sort((a, b) => {
      const order = { high: 0, medium: 1, low: 2 };
      return order[a.priority] - order[b.priority];
    });

  if (total === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <div className="text-5xl mb-4">📊</div>
        <h2 className="text-lg font-semibold text-gray-700 mb-2">No data yet</h2>
        <p className="text-sm text-gray-400">Add some tasks first, then come back to review your progress.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Review</h1>
        <p className="text-sm text-gray-400 mt-1">See how you&apos;re doing. Reflect and improve.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <StatCard label="Total" value={total} color="bg-gray-100 text-gray-700" />
        <StatCard label="Completed" value={completed} color="bg-emerald-50 text-emerald-700" />
        <StatCard label="Pending" value={pending} color="bg-amber-50 text-amber-700" />
        <StatCard label="Rate" value={`${rate}%`} color="bg-indigo-50 text-indigo-700" />
      </div>

      {/* Completion progress */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-6 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Overall Progress</h3>
        <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-700"
            style={{ width: `${rate}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs text-gray-400">
          <span>{completed} completed</span>
          <span>{pending} remaining</span>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {/* Category breakdown */}
        {categoryStats.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">By Category</h3>
            <div className="space-y-3">
              {categoryStats.map(cat => (
                <div key={cat.name}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-gray-600">{cat.name}</span>
                    <span className="text-gray-400">{cat.completed}/{cat.total}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${categoryColors[cat.name]}`}
                      style={{ width: `${cat.total > 0 ? (cat.completed / cat.total) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Priority breakdown */}
        {priorityStats.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">By Priority</h3>
            <div className="space-y-3">
              {priorityStats.map(p => (
                <div key={p.priority}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-gray-600">{priorityLabels[p.priority].label}</span>
                    <span className="text-gray-400">
                      {p.pending > 0 && <span className="text-amber-500">{p.pending} pending</span>}
                      {p.pending > 0 && ' · '}
                      {p.completed}/{p.total}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${priorityLabels[p.priority].color}`}
                      style={{ width: `${p.total > 0 ? (p.completed / p.total) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Pending tasks list */}
      {pendingTasks.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            Still Pending
            <span className="ml-2 text-xs font-normal text-gray-400">sorted by priority</span>
          </h3>
          <div className="space-y-2">
            {pendingTasks.map(task => (
              <div key={task.id} className="flex items-center gap-3 text-sm">
                <div className={`w-2 h-2 rounded-full ${priorityLabels[task.priority].color}`} />
                <span className="text-gray-600">{task.content}</span>
                <span className="text-[10px] text-gray-400 ml-auto">{task.category}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent completions timeline */}
      {recentCompleted.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Recently Completed</h3>
          <div className="space-y-3">
            {recentCompleted.map(task => (
              <div key={task.id} className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-gray-600 line-through">{task.content}</p>
                  <p className="text-[10px] text-gray-300">
                    {task.completedAt && new Date(task.completedAt).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div className={`rounded-2xl p-4 ${color}`}>
      <p className="text-[10px] font-medium opacity-60 uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}
