import { useEffect, useCallback } from 'react';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { Card, Column } from '../types/board';

type ColsDispatch = React.Dispatch<React.SetStateAction<Column[]>>;

interface CardPayload {
  id: string;
  column_id: string;
  position: number;
  title: string;
  priority: string;
  due_date?: string;
  color?: string;
  assignee_ids: string[];
  tags: string[];
  board_id: string;
  is_archived: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export function useBoardRealtime(boardId: string, setColumns: ColsDispatch) {
  const applyUpsert = useCallback(
    (payload: CardPayload) => {
      setColumns((prev) => {
        const exists = prev.some((col) => col.cards?.some((c) => c.id === payload.id));
        if (!exists && !payload.is_archived) {
          return prev.map((col) => {
            if (col.id !== payload.column_id) return col;
            const without = col.cards?.filter((c) => c.id !== payload.id) ?? [];
            const inserted = [...without, payload as unknown as Card].sort(
              (a, b) => a.position - b.position,
            );
            return { ...col, cards: inserted };
          });
        }
        return prev.map((col) => {
          const hasCard = col.cards?.some((c) => c.id === payload.id);
          if (col.id === payload.column_id) {
            const without = col.cards?.filter((c) => c.id !== payload.id) ?? [];
            if (payload.is_archived) return { ...col, cards: without };
            const updated = [...without, payload as unknown as Card].sort(
              (a, b) => a.position - b.position,
            );
            return { ...col, cards: updated };
          }
          if (hasCard) return { ...col, cards: col.cards?.filter((c) => c.id !== payload.id) };
          return col;
        });
      });
    },
    [setColumns],
  );

  const applyDelete = useCallback(
    (cardId: string) => {
      setColumns((prev) =>
        prev.map((col) => ({ ...col, cards: col.cards?.filter((c) => c.id !== cardId) })),
      );
    },
    [setColumns],
  );

  useEffect(() => {
    if (!boardId) return;

    const channel = supabase
      .channel(`board:${boardId}`)
      .on<CardPayload>(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cards', filter: `board_id=eq.${boardId}` },
        (payload: RealtimePostgresChangesPayload<CardPayload>) => {
          if (payload.eventType === 'DELETE') {
            applyDelete((payload.old as { id: string }).id);
          } else if (payload.new) {
            applyUpsert(payload.new);
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [boardId, applyUpsert, applyDelete]);
}
