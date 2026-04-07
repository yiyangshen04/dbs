'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTaskContext } from '@/context/TaskContext';

const links = [
  { href: '/', label: 'Capture', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" /></svg> },
  { href: '/review', label: 'Review', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 13h4l3-8 4 16 3-8h4" /></svg> },
  { href: '/export', label: 'Export', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 4v12m0 0l-4-4m4 4l4-4" /></svg> },
];

export default function Navbar() {
  const pathname = usePathname();
  const { tasks } = useTaskContext();
  const total = tasks.length;
  const completed = tasks.filter(t => t.completed).length;
  const pending = total - completed;
  const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-56 bg-sidebar text-sidebar-text flex flex-col z-50 max-md:hidden">
      {/* Logo */}
      <div className="px-5 h-14 flex items-center border-b border-white/5">
        <span className="font-bold text-white tracking-tight">QuickNote</span>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {links.map(l => (
          <Link
            key={l.href}
            href={l.href}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
              pathname === l.href
                ? 'bg-sidebar-active text-white font-medium'
                : 'text-sidebar-text hover:bg-sidebar-active/50 hover:text-white'
            }`}
          >
            {l.icon}
            {l.label}
          </Link>
        ))}
      </nav>

      {/* Stats in sidebar */}
      {total > 0 && (
        <div className="px-5 py-4 border-t border-white/5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] uppercase tracking-widest text-sidebar-text/50">Progress</span>
            <span className="text-xs text-white font-medium">{rate}%</span>
          </div>
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden mb-3">
            <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${rate}%` }} />
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-lg font-semibold text-white">{total}</p>
              <p className="text-[10px] text-sidebar-text/50">Total</p>
            </div>
            <div>
              <p className="text-lg font-semibold text-emerald-400">{completed}</p>
              <p className="text-[10px] text-sidebar-text/50">Done</p>
            </div>
            <div>
              <p className="text-lg font-semibold text-amber-400">{pending}</p>
              <p className="text-[10px] text-sidebar-text/50">Left</p>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
