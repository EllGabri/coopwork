import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { KanbanBoard } from '../components/board/KanbanBoard';
import type { Board } from '../types/board';
import { api } from '../lib/api';

export default function BoardPage() {
  const { boardId } = useParams<{ boardId: string }>();
  const [board, setBoard] = useState<Board | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
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
          className="h-3 w-3 rounded-full"
          style={{ backgroundColor: board.color ?? '#6366f1' }}
        />
        <h1 className="text-lg font-semibold text-foreground">{board.name}</h1>
        {board.description && (
          <p className="ml-2 text-sm text-muted-foreground">{board.description}</p>
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">
        <KanbanBoard board={board} />
      </div>
    </div>
  );
}
