import { useState, useRef, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../hooks/useAuth';
import { NotificationBell } from './NotificationBell';

const routeLabels: Record<string, string> = {
  dashboard: 'Dashboard',
  projects: 'Projetos',
  documents: 'Documentos',
  boards: 'Boards',
  reports: 'Relatórios',
  profile: 'Perfil',
  admin: 'Admin',
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');
}

function Breadcrumbs() {
  const location = useLocation();
  const parts = location.pathname.split('/').filter(Boolean);
  if (parts.length === 0) return null;

  return (
    <nav className="flex items-center gap-1.5 text-sm" aria-label="Breadcrumb">
      {parts.map((part, i) => {
        const label = routeLabels[part] ?? part;
        const isLast = i === parts.length - 1;
        return (
          <span key={`${part}-${i}`} className="flex items-center gap-1.5">
            {i > 0 && <span className="text-muted-foreground">/</span>}
            <span className={isLast ? 'font-medium text-foreground' : 'text-muted-foreground'}>
              {label}
            </span>
          </span>
        );
      })}
    </nav>
  );
}

export default function Header() {
  const { resolvedTheme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const userInitials = user?.fullName ? getInitials(user.fullName) : 'U';

  // Ctrl+K / Cmd+K focusa a busca
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <header className="flex h-14 items-center gap-4 border-b bg-card px-4">
      {/* Breadcrumbs */}
      <div className="flex-1">
        <Breadcrumbs />
      </div>

      {/* Global Search */}
      <div className={cn('relative transition-all duration-200', searchFocused ? 'w-80' : 'w-64')}>
        <svg
          className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          ref={searchRef}
          type="search"
          placeholder={searchFocused ? 'Buscar cards, documentos...' : 'Buscar... ⌘K'}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          className={cn(
            'h-9 w-full rounded-md border bg-background pl-9 pr-3 text-sm',
            'placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring',
            'transition-all duration-200',
          )}
        />
      </div>

      {/* Dark mode toggle */}
      <button
        onClick={toggleTheme}
        className="rounded-md p-2 text-muted-foreground hover:bg-accent/20 hover:text-foreground transition-colors"
        aria-label="Alternar tema"
      >
        {resolvedTheme === 'dark' ? (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
            />
          </svg>
        ) : (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
            />
          </svg>
        )}
      </button>

      {/* Notifications bell */}
      <NotificationBell />

      {/* User avatar */}
      <Link
        to="/profile"
        title={user?.fullName ?? 'Perfil'}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-[hsl(var(--accent))] text-xs font-bold text-[hsl(var(--accent-foreground))] hover:ring-2 hover:ring-[hsl(var(--accent))]/50 transition-all"
      >
        {userInitials}
      </Link>
    </header>
  );
}
