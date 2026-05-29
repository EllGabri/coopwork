import { useState } from 'react';
import { usePermissions } from '../../hooks/usePermissions';
import { useAuth } from '../../hooks/useAuth';
import { Link, useLocation } from 'react-router-dom';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '../../lib/utils';

// ─── Types & mock data ────────────────────────────────────────────────────────

interface Board {
  id: string;
  name: string;
  overdueCount: number;
}

interface Workspace {
  id: string;
  name: string;
  department: string;
  departmentIcon: string;
  boards: Board[];
}

const MOCK_WORKSPACES: Workspace[] = [
  {
    id: 'ws-1',
    name: 'TI & Projetos',
    department: 'Tecnologia',
    departmentIcon: '💻',
    boards: [
      { id: 'b-1', name: 'Sistema Core', overdueCount: 2 },
      { id: 'b-2', name: 'Infraestrutura', overdueCount: 0 },
      { id: 'b-3', name: 'Segurança', overdueCount: 1 },
    ],
  },
  {
    id: 'ws-2',
    name: 'Compliance',
    department: 'Compliance',
    departmentIcon: '📋',
    boards: [
      { id: 'b-4', name: 'Auditorias 2026', overdueCount: 0 },
      { id: 'b-5', name: 'Regulatório', overdueCount: 3 },
    ],
  },
  {
    id: 'ws-3',
    name: 'Financeiro',
    department: 'Financeiro',
    departmentIcon: '💰',
    boards: [
      { id: 'b-6', name: 'Orçamento 2026', overdueCount: 0 },
      { id: 'b-7', name: 'Controle', overdueCount: 0 },
    ],
  },
];

// ─── Global nav items ─────────────────────────────────────────────────────────

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  permModule?: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: (
      <svg
        className="h-[18px] w-[18px] shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 5a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10-3a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1v-7z"
        />
      </svg>
    ),
  },
  {
    label: 'GED',
    href: '/documents',
    permModule: 'ged',
    icon: (
      <svg
        className="h-[18px] w-[18px] shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
    ),
  },
  {
    label: 'Relatórios',
    href: '/reports',
    permModule: 'reports',
    icon: (
      <svg
        className="h-[18px] w-[18px] shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
        />
      </svg>
    ),
  },
  {
    label: 'Admin',
    href: '/admin',
    icon: (
      <svg
        className="h-[18px] w-[18px] shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
        />
      </svg>
    ),
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');
}

// ─── Sortable board item ──────────────────────────────────────────────────────

function SortableBoardItem({ board, expanded }: { board: Board; expanded: boolean }) {
  const location = useLocation();
  const isActive = location.pathname === `/boards/${board.id}`;

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: board.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  if (!expanded) {
    return (
      <div ref={setNodeRef} style={style} {...attributes}>
        <Link
          to={`/boards/${board.id}`}
          title={board.name}
          className={cn(
            'relative flex h-8 w-8 items-center justify-center rounded-md mx-auto my-0.5 transition-colors',
            isActive
              ? 'bg-[hsl(var(--sidebar-active))] text-white'
              : 'text-[hsl(var(--sidebar-fg))] hover:bg-[hsl(var(--sidebar-hover))]',
          )}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"
            />
          </svg>
          {board.overdueCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
              {board.overdueCount}
            </span>
          )}
        </Link>
      </div>
    );
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <Link
        to={`/boards/${board.id}`}
        className={cn(
          'group flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors',
          isActive
            ? 'bg-[hsl(var(--sidebar-active))/15] text-[hsl(var(--sidebar-active))] font-medium'
            : 'text-[hsl(var(--sidebar-fg))] hover:bg-[hsl(var(--sidebar-hover))]',
        )}
      >
        <span
          {...listeners}
          className="cursor-grab text-[hsl(var(--sidebar-fg))]/30 opacity-0 group-hover:opacity-100"
          aria-label="Arrastar board"
        >
          <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
            <path d="M9 3a2 2 0 110 4 2 2 0 010-4zm6 0a2 2 0 110 4 2 2 0 010-4zM9 10a2 2 0 110 4 2 2 0 010-4zm6 0a2 2 0 110 4 2 2 0 010-4zM9 17a2 2 0 110 4 2 2 0 010-4zm6 0a2 2 0 110 4 2 2 0 010-4z" />
          </svg>
        </span>
        <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"
          />
        </svg>
        <span className="flex-1 truncate">{board.name}</span>
        {board.overdueCount > 0 && (
          <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {board.overdueCount}
          </span>
        )}
      </Link>
    </div>
  );
}

// ─── Workspace section ────────────────────────────────────────────────────────

function WorkspaceSection({
  workspace,
  expanded,
  onDragEnd,
}: {
  workspace: Workspace;
  expanded: boolean;
  onDragEnd: (event: DragEndEvent, workspaceId: string) => void;
}) {
  const [open, setOpen] = useState(true);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  if (!expanded) {
    return (
      <div className="mb-1">
        <div className="mx-auto my-1 h-px w-8 bg-[hsl(var(--sidebar-fg))]/10" />
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={(e) => onDragEnd(e, workspace.id)}
        >
          <SortableContext
            items={workspace.boards.map((b) => b.id)}
            strategy={verticalListSortingStrategy}
          >
            {workspace.boards.map((board) => (
              <SortableBoardItem key={board.id} board={board} expanded={false} />
            ))}
          </SortableContext>
        </DndContext>
      </div>
    );
  }

  return (
    <div className="mb-1">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[11px] font-semibold uppercase tracking-wide text-[hsl(var(--sidebar-fg))]/50 hover:text-[hsl(var(--sidebar-fg))] transition-colors"
      >
        <span className="text-sm leading-none">{workspace.departmentIcon}</span>
        <span className="flex-1 truncate">{workspace.name}</span>
        <svg
          className={cn('h-3 w-3 shrink-0 transition-transform', open && 'rotate-90')}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {open && (
        <div className="ml-3 mt-0.5 border-l border-[hsl(var(--sidebar-fg))]/10 pl-2">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={(e) => onDragEnd(e, workspace.id)}
          >
            <SortableContext
              items={workspace.boards.map((b) => b.id)}
              strategy={verticalListSortingStrategy}
            >
              {workspace.boards.map((board) => (
                <SortableBoardItem key={board.id} board={board} expanded={true} />
              ))}
            </SortableContext>
          </DndContext>
        </div>
      )}
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

export default function Sidebar() {
  const [expanded, setExpanded] = useState(true);
  const [workspaces, setWorkspaces] = useState(MOCK_WORKSPACES);
  const location = useLocation();
  const { can } = usePermissions();
  const { user } = useAuth();

  const userInitials = user?.fullName ? getInitials(user.fullName) : 'U';

  function handleDragEnd(event: DragEndEvent, workspaceId: string) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setWorkspaces((prev) =>
      prev.map((ws) => {
        if (ws.id !== workspaceId) return ws;
        const oldIndex = ws.boards.findIndex((b) => b.id === active.id);
        const newIndex = ws.boards.findIndex((b) => b.id === over.id);
        return { ...ws, boards: arrayMove(ws.boards, oldIndex, newIndex) };
      }),
    );
  }

  return (
    <aside
      className={cn(
        'flex flex-col border-r transition-all duration-300 ease-in-out',
        'bg-[hsl(var(--sidebar-bg))]',
        expanded ? 'w-60' : 'w-14',
      )}
    >
      {/* Header */}
      <div
        className={cn(
          'flex h-14 items-center border-b border-[hsl(var(--sidebar-fg))]/10',
          expanded ? 'px-3 gap-2' : 'justify-center',
        )}
      >
        {/* Logo */}
        <div
          className={cn(
            'flex items-center justify-center rounded-lg font-bold shrink-0',
            'bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]',
            expanded ? 'h-8 w-8 text-sm' : 'h-8 w-8 text-sm',
          )}
        >
          N
        </div>

        {expanded && (
          <>
            <span className="flex-1 text-sm font-semibold text-[hsl(var(--sidebar-fg))]">
              CoopWork
            </span>
            <button
              onClick={() => setExpanded(false)}
              className="rounded-md p-1 text-[hsl(var(--sidebar-fg))]/50 hover:bg-[hsl(var(--sidebar-hover))] hover:text-[hsl(var(--sidebar-fg))] transition-colors"
              aria-label="Colapsar sidebar"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
                />
              </svg>
            </button>
          </>
        )}

        {!expanded && (
          <button
            onClick={() => setExpanded(true)}
            className="absolute left-14 top-4 z-10 rounded-full border border-[hsl(var(--sidebar-fg))]/10 bg-[hsl(var(--sidebar-bg))] p-1 shadow-md text-[hsl(var(--sidebar-fg))]/60 hover:text-[hsl(var(--sidebar-fg))] transition-colors hidden"
            aria-label="Expandir sidebar"
          />
        )}
      </div>

      {/* Scrollable body */}
      <nav className="flex-1 overflow-y-auto py-2 px-2">
        {/* Global navigation */}
        <div className="mb-2 space-y-0.5">
          {NAV_ITEMS.filter((item) => !item.permModule || can(item.permModule, 'read')).map(
            (item) => {
              const isActive =
                location.pathname === item.href || location.pathname.startsWith(item.href + '/');
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  title={!expanded ? item.label : undefined}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-2 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-[hsl(var(--sidebar-active))] text-white'
                      : 'text-[hsl(var(--sidebar-fg))] hover:bg-[hsl(var(--sidebar-hover))] hover:text-[hsl(var(--sidebar-active))]',
                    !expanded && 'justify-center',
                  )}
                >
                  {item.icon}
                  {expanded && <span>{item.label}</span>}
                </Link>
              );
            },
          )}
        </div>

        {/* Workspace sections */}
        {expanded ? (
          <>
            <div className="my-2 border-t border-[hsl(var(--sidebar-fg))]/10" />
            {workspaces.map((ws) => (
              <WorkspaceSection
                key={ws.id}
                workspace={ws}
                expanded={true}
                onDragEnd={handleDragEnd}
              />
            ))}
            {/* New board button */}
            <button className="mt-2 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-[hsl(var(--sidebar-fg))]/50 hover:bg-[hsl(var(--sidebar-hover))] hover:text-[hsl(var(--sidebar-fg))] transition-colors">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Novo Board
            </button>
          </>
        ) : (
          <>
            {workspaces.map((ws) => (
              <WorkspaceSection
                key={ws.id}
                workspace={ws}
                expanded={false}
                onDragEnd={handleDragEnd}
              />
            ))}
          </>
        )}
      </nav>

      {/* Footer — profile */}
      <div className="border-t border-[hsl(var(--sidebar-fg))]/10 p-2">
        {!expanded && (
          <button
            onClick={() => setExpanded(true)}
            className="mb-1 flex w-full items-center justify-center rounded-md py-1.5 text-[hsl(var(--sidebar-fg))]/40 hover:bg-[hsl(var(--sidebar-hover))] hover:text-[hsl(var(--sidebar-fg))] transition-colors"
            aria-label="Expandir sidebar"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 5l7 7-7 7M5 5l7 7-7 7"
              />
            </svg>
          </button>
        )}
        <Link
          to="/profile"
          className={cn(
            'flex items-center gap-3 rounded-md px-2 py-2 text-sm font-medium',
            'text-[hsl(var(--sidebar-fg))]/70 hover:bg-[hsl(var(--sidebar-hover))] hover:text-[hsl(var(--sidebar-fg))] transition-colors',
            !expanded && 'justify-center',
          )}
          title={!expanded ? `Perfil — ${user?.fullName ?? 'Usuário'}` : undefined}
        >
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--accent))] text-xs font-bold text-[hsl(var(--accent-foreground))]">
            {userInitials}
          </div>
          {expanded && (
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-xs font-medium text-[hsl(var(--sidebar-fg))]">
                {user?.fullName ?? 'Usuário'}
              </p>
              <p className="truncate text-[10px] text-[hsl(var(--sidebar-fg))]/50">
                {user?.role ?? ''}
              </p>
            </div>
          )}
        </Link>
      </div>
    </aside>
  );
}
