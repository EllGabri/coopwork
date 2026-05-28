import { useState } from 'react';
import { api } from '../../lib/api';
import { useToast } from '../../contexts/ToastContext';

interface Suggestion {
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

interface Props {
  boardId: string;
  firstColumnId: string;
  tenantId?: string;
  onCardCreated?: () => void;
}

const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
  medium: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  high: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  urgent: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
};

export function AiTaskSuggest({ boardId, firstColumnId, onCardCreated }: Props) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [adding, setAdding] = useState<number | null>(null);

  const handleSuggest = async () => {
    setLoading(true);
    setSuggestions([]);
    try {
      const result = await api.post<Suggestion[]>(`/ai/boards/${boardId}/suggest-tasks`, {});
      setSuggestions(result);
      if (!result.length) toast('Nenhuma sugestão retornada', 'info');
    } catch {
      toast('Erro ao obter sugestões', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCard = async (s: Suggestion, idx: number) => {
    setAdding(idx);
    try {
      await api.post(`/columns/${firstColumnId}/cards`, {
        title: s.title,
        description: s.description,
        priority: s.priority,
        tags: ['ia-sugestão'],
      });
      toast(`Card "${s.title}" criado`);
      setSuggestions((prev) => prev.filter((_, i) => i !== idx));
      onCardCreated?.();
    } catch {
      toast('Erro ao criar card', 'error');
    } finally {
      setAdding(null);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => {
          setOpen((o) => !o);
          if (!open && !suggestions.length) void handleSuggest();
        }}
        className="flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
      >
        <span className="text-sm">✨</span>
        Sugerir tarefas
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-40 mt-1 w-80 rounded-lg border border-border bg-popover shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-3 py-2">
              <span className="text-sm font-medium text-popover-foreground">
                Sugestões de tarefas
              </span>
              <button
                onClick={() => void handleSuggest()}
                disabled={loading}
                className="text-xs text-primary hover:underline disabled:opacity-40"
              >
                {loading ? 'Gerando…' : 'Atualizar'}
              </button>
            </div>

            {loading && (
              <div className="space-y-2 p-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 rounded-md bg-muted animate-pulse" />
                ))}
              </div>
            )}

            {!loading && suggestions.length === 0 && (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                Nenhuma sugestão disponível.
              </p>
            )}

            {!loading && suggestions.length > 0 && (
              <div className="divide-y divide-border">
                {suggestions.map((s, idx) => (
                  <div key={idx} className="p-3">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="text-sm font-medium text-popover-foreground leading-tight flex-1">
                        {s.title}
                      </p>
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-medium flex-shrink-0 ${PRIORITY_COLORS[s.priority] ?? PRIORITY_COLORS.medium}`}
                      >
                        {s.priority}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                      {s.description}
                    </p>
                    <button
                      onClick={() => void handleAddCard(s, idx)}
                      disabled={adding === idx}
                      className="rounded bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity"
                    >
                      {adding === idx ? 'Adicionando…' : '+ Adicionar como card'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
