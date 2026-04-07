'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTaskContext } from '@/context/TaskContext';

const links = [
  { href: '/', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" /></svg>, label: 'Capture' },
  { href: '/review', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 13h4l3-8 4 16 3-8h4" /></svg>, label: 'Review' },
  { href: '/export', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 4v12m0 0l-4-4m4 4l4-4" /></svg>, label: 'Export' },
];

export default function Navbar() {
  const pathname = usePathname();
  const { tasks } = useTaskContext();
  const pending = tasks.filter(t => !t.completed).length;

  return (
    <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="max-w-3xl mx-auto px-6 h-12 flex items-center justify-between">
        <Link href="/" className="text-foreground font-semibold tracking-tight">
          QuickNote
        </Link>

        <div className="flex items-center gap-0.5">
          {links.map(l => (
            <Link
              key={l.href}
              href={l.href}
              title={l.label}
              className={`p-2 rounded-lg transition-all ${
                pathname === l.href
                  ? 'text-accent bg-accent/5'
                  : 'text-muted hover:text-foreground'
              }`}
            >
              {l.icon}
            </Link>
          ))}
          {pending > 0 && (
            <span className="ml-1 w-5 h-5 flex items-center justify-center bg-accent text-white text-[10px] font-bold rounded-full">
              {pending}
            </span>
          )}
        </div>
      </div>
    </nav>
  );
}
