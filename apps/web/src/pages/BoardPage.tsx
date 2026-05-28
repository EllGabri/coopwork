import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { KanbanBoard } from '../components/board/KanbanBoard';
import { BoardListView } from '../components/board/BoardListView';
import { BoardCalendarView } from '../components/board/BoardCalendarView';
import { AiTaskSuggest } from '../components/board/AiTaskSuggest';
import { AiRiskAnalysis } from '../components/board/AiRiskAnalysis';
import type { Board } from '../types/board';
import { api } from '../lib/api';

type ViewMode = 'kanban' | 'list' | 'calendar';

export default function BoardPage() {
  const { boardId } = useParams<{ boardId: string }>();
  const [board, setBoard] = useState<Board | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<ViewMode>('kanban');
  const [boardKey, setBoardKey] = useState(0);

  useEffect(() => {
    if (!boardId) return;
    setLoading(true);
    api
      .get<Board>(`/boards/${boardId}`)
      .then(setBoard)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [boardId]);

  if (loading)
    return (
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <div className="h-3 w-3 rounded-full bg-muted animate-pulse" />
          <div className="h-5 w-40 rounded bg-muted animate-pulse" />
          <div className="ml-auto h-7 w-44 rounded bg-muted animate-pulse" />
        </div>
        <div className="flex gap-4 overflow-x-auto p-4">
          {[1, 2, 3].map((col) => (
            <div key={col} className="w-72 flex-shrink-0">
              <div className="mb-3 h-9 rounded-lg bg-muted animate-pulse" />
              <div className="space-y-2">
                {Array.from({ length: col === 2 ? 4 : 2 }).map((_, i) => (
                  <div
                    key={i}
                    className={`rounded-md bg-muted animate-pulse ${i % 2 === 0 ? 'h-16' : 'h-24'}`}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );

  if (error || !board)
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-destructive">{error ?? 'Board não encontrado'}</p>
      </div>
    );

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <div
          className="h-3 w-3 rounded-full flex-shrink-0"
          style={{ backgroundColor: board.color ?? '#6366f1' }}
        />
        <h1 className="text-lg font-semibold text-foreground">{board.name}</h1>
        {board.description && (
          <p className="ml-2 text-sm text-muted-foreground">{board.description}</p>
        )}
        {boardId && board.board_columns?.[0]?.id && (
          <>
            <AiTaskSuggest
              boardId={boardId}
              firstColumnId={board.board_columns[0].id}
              onCardCreated={() => setBoardKey((k) => k + 1)}
            />
            <AiRiskAnalysis boardId={boardId} />
          </>
        )}
        <div className="ml-auto flex rounded-md border border-border overflow-hidden">
          {(['kanban', 'list', 'calendar'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 py-1 text-xs font-medium transition-colors ${view === v ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-muted'}`}
            >
              {v === 'kanban' ? 'Kanban' : v === 'list' ? 'Lista' : 'Calendário'}
            </button>
          ))}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">
        {view === 'kanban' && <KanbanBoard key={boardKey} board={board} />}
        {view === 'list' && <BoardListView columns={board.board_columns ?? []} />}
        {view === 'calendar' && <BoardCalendarView columns={board.board_columns ?? []} />}
      </div>
    </div>
  );
}
