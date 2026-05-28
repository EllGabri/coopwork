import { useState, useMemo } from 'react';
import type { Card, Column } from '../../types/board';

type SortKey = 'title' | 'priority' | 'due_date' | 'status';
type SortDir = 'asc' | 'desc';
const PRIORITY_ORDER: Record<string, number> = { low: 1, medium: 2, high: 3, urgent: 4 };
interface Props {
  columns: Column[];
}

export function BoardListView({ columns }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('due_date');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterAssignee, setFilterAssignee] = useState('');

  const allCards = useMemo<(Card & { columnName: string })[]>(
    () =>
      columns.flatMap((col) =>
        (col.cards ?? [])
          .filter((c) => !c.is_archived)
          .map((c) => ({ ...c, columnName: col.name })),
      ),
    [columns],
  );
  const allAssignees = useMemo(
    () => [...new Set(allCards.flatMap((c) => c.assignee_ids))],
    [allCards],
  );
  const filtered = useMemo(
    () =>
      allCards.filter((c) => {
        if (filterAssignee && !c.assignee_ids.includes(filterAssignee)) return false;
        if (filterPriority && c.priority !== filterPriority) return false;
        if (filterStatus && c.columnName !== filterStatus) return false;
        return true;
      }),
    [allCards, filterAssignee, filterPriority, filterStatus],
  );
  const sorted = useMemo(
    () =>
      [...filtered].sort((a, b) => {
        let cmp = 0;
        if (sortKey === 'title') cmp = a.title.localeCompare(b.title);
        else if (sortKey === 'priority')
          cmp = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
        else if (sortKey === 'due_date') {
          const da = a.due_date ? new Date(a.due_date).getTime() : Infinity;
          const db = b.due_date ? new Date(b.due_date).getTime() : Infinity;
          cmp = da - db;
        } else if (sortKey === 'status') cmp = a.columnName.localeCompare(b.columnName);
        return sortDir === 'asc' ? cmp : -cmp;
      }),
    [filtered, sortKey, sortDir],
  );

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir('asc');
    }
  };
  const statusOptions = useMemo(() => [...new Set(columns.map((c) => c.name))], [columns]);
  const arrow = (k: SortKey) => (sortKey === k ? (sortDir === 'asc' ? ' up' : ' dn') : ' \u2195');

  return (
    <div className="flex h-full flex-col gap-3 p-4">
      <div className="flex items-center gap-3 flex-wrap">
        <select
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value)}
          className="rounded border border-border bg-background px-2 py-1 text-sm text-foreground"
        >
          <option value="">Todas prioridades</option>
          {(['low', 'medium', 'high', 'urgent'] as const).map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded border border-border bg-background px-2 py-1 text-sm text-foreground"
        >
          <option value="">Todas colunas</option>
          {statusOptions.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        {allAssignees.length > 0 && (
          <select
            value={filterAssignee}
            onChange={(e) => setFilterAssignee(e.target.value)}
            className="rounded border border-border bg-background px-2 py-1 text-sm text-foreground"
          >
            <option value="">Todos responsaveis</option>
            {allAssignees.map((id) => (
              <option key={id} value={id}>
                {String(id).slice(0, 8)}
              </option>
            ))}
          </select>
        )}
        <span className="ml-auto text-xs text-muted-foreground">{sorted.length} cards</span>
      </div>
      <div className="flex-1 overflow-auto rounded-md border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 sticky top-0">
            <tr>
              <th
                className="cursor-pointer px-3 py-2 text-left font-medium text-muted-foreground"
                onClick={() => toggleSort('title')}
              >
                Titulo{arrow('title')}
              </th>
              <th
                className="cursor-pointer px-3 py-2 text-left font-medium text-muted-foreground"
                onClick={() => toggleSort('status')}
              >
                Coluna{arrow('status')}
              </th>
              <th
                className="cursor-pointer px-3 py-2 text-left font-medium text-muted-foreground"
                onClick={() => toggleSort('priority')}
              >
                Prioridade{arrow('priority')}
              </th>
              <th
                className="cursor-pointer px-3 py-2 text-left font-medium text-muted-foreground"
                onClick={() => toggleSort('due_date')}
              >
                Prazo{arrow('due_date')}
              </th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                Responsaveis
              </th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Tags</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((card, i) => {
              const overdue = card.due_date && new Date(card.due_date) < new Date();
              const rowCls = [
                'border-t border-border hover:bg-muted/30',
                i % 2 ? 'bg-muted/10' : '',
              ].join(' ');
              return (
                <tr key={card.id} className={rowCls}>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      {card.color && (
                        <div
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: card.color }}
                        />
                      )}
                      <span className="font-medium text-foreground">{card.title}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{card.columnName}</td>
                  <td className="px-3 py-2">
                    <span className="rounded px-1.5 py-0.5 text-xs capitalize bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                      {card.priority}
                    </span>
                  </td>
                  <td
                    className={
                      overdue
                        ? 'px-3 py-2 text-xs text-red-500 font-medium'
                        : 'px-3 py-2 text-xs text-muted-foreground'
                    }
                  >
                    {card.due_date ? new Date(card.due_date).toLocaleDateString('pt-BR') : '\u2014'}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {card.assignee_ids.length > 0
                      ? String(card.assignee_ids.length) + ' pessoa(s)'
                      : '\u2014'}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1 flex-wrap">
                      {card.tags.slice(0, 3).map((t) => (
                        <span
                          key={t}
                          className="rounded bg-muted px-1 py-0.5 text-xs text-muted-foreground"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              );
            })}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">
                  Nenhum card encontrado
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
