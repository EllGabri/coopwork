import { useState, useEffect, useRef, useCallback } from 'react';
import type { CardDetail, CardComment, ChecklistItem, CardPriority } from '../../types/board';
import { api } from '../../lib/api';
import { ColorPicker } from '../ui/ColorPicker';

interface Props {
  cardId: string;
  onClose: () => void;
  onUpdate?: (card: CardDetail) => void;
}

const PRIORITY_OPTIONS: CardPriority[] = ['low', 'medium', 'high', 'urgent'];

const PRIORITY_COLORS: Record<CardPriority, string> = {
  low: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
  medium: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  high: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  urgent: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
};

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function CardDetailModal({ cardId, onClose, onUpdate }: Props) {
  const [card, setCard] = useState<CardDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [newCheckItem, setNewCheckItem] = useState('');
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    setLoading(true);
    api
      .get<CardDetail>(`/cards/${cardId}`)
      .then((c) => {
        setCard(c);
        // Parse checklist from description JSON if present
        try {
          const meta = JSON.parse(localStorage.getItem(`checklist:${cardId}`) ?? '[]');
          setChecklist(Array.isArray(meta) ? meta : []);
        } catch {
          setChecklist([]);
        }
      })
      .finally(() => setLoading(false));
  }, [cardId]);

  const scheduleSave = useCallback(
    (patch: Partial<CardDetail>) => {
      clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        setSaving(true);
        try {
          const updated = await api.patch<CardDetail>(`/cards/${cardId}`, patch);
          setCard(updated);
          onUpdate?.(updated);
        } finally {
          setSaving(false);
        }
      }, 1000);
    },
    [cardId, onUpdate],
  );

  const persistChecklist = useCallback(
    (items: ChecklistItem[]) => {
      localStorage.setItem(`checklist:${cardId}`, JSON.stringify(items));
      setChecklist(items);
    },
    [cardId],
  );

  const addCheckItem = () => {
    if (!newCheckItem.trim()) return;
    const item: ChecklistItem = {
      id: crypto.randomUUID(),
      text: newCheckItem.trim(),
      done: false,
    };
    persistChecklist([...checklist, item]);
    setNewCheckItem('');
  };

  const toggleCheckItem = (id: string) => {
    persistChecklist(checklist.map((i) => (i.id === id ? { ...i, done: !i.done } : i)));
  };

  const removeCheckItem = (id: string) => {
    persistChecklist(checklist.filter((i) => i.id !== id));
  };

  const postComment = async () => {
    if (!commentText.trim() || !card) return;
    const comment = await api.post<CardComment>(`/cards/${cardId}/comments`, {
      content: commentText.trim(),
    });
    setCard((prev) =>
      prev ? { ...prev, card_comments: [...(prev.card_comments ?? []), comment] } : prev,
    );
    setCommentText('');
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !card) return;
    if (file.size > 10 * 1024 * 1024) {
      alert('Arquivo deve ser menor que 10 MB');
      return;
    }
    const form = new FormData();
    form.append('file', file);
    const att = await fetch(
      `${import.meta.env.VITE_API_URL ?? 'http://localhost:3001'}/cards/${cardId}/attachments`,
      {
        method: 'POST',
        credentials: 'include',
        body: form,
      },
    ).then((r) => r.json());
    setCard((prev) =>
      prev ? { ...prev, card_attachments: [...(prev.card_attachments ?? []), att] } : prev,
    );
  };

  if (loading || !card) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const doneCount = checklist.filter((i) => i.done).length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-12"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-xl bg-card border border-border shadow-2xl mb-12"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start gap-3 p-5 border-b border-border">
          {card.color && (
            <div
              className="mt-1 h-3 w-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: card.color }}
            />
          )}
          <div className="flex-1 min-w-0">
            <input
              className="w-full bg-transparent text-lg font-semibold text-card-foreground outline-none focus:ring-1 focus:ring-primary rounded px-1 -mx-1"
              defaultValue={card.title}
              onChange={(e) => scheduleSave({ title: e.target.value })}
            />
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {saving && <span className="text-xs text-muted-foreground">Salvando…</span>}
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground text-xl leading-none"
            >
              ×
            </button>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {/* Meta row */}
          <div className="flex flex-wrap gap-3 text-sm">
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground text-xs">Cor</span>
              <ColorPicker
                value={card.color ?? '#6366f1'}
                onChange={(hex) => scheduleSave({ color: hex })}
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground text-xs">Prioridade</span>
              <select
                defaultValue={card.priority}
                onChange={(e) => scheduleSave({ priority: e.target.value as CardPriority })}
                className={`rounded px-2 py-0.5 text-xs font-medium border-0 outline-none cursor-pointer ${PRIORITY_COLORS[card.priority]}`}
              >
                {PRIORITY_OPTIONS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground text-xs">Prazo</span>
              <input
                type="date"
                defaultValue={card.due_date?.slice(0, 10) ?? ''}
                onChange={(e) =>
                  scheduleSave({
                    due_date: e.target.value ? new Date(e.target.value).toISOString() : undefined,
                  })
                }
                className="rounded border border-border bg-background px-2 py-0.5 text-xs text-foreground"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <p className="mb-1 text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Descrição
            </p>
            <textarea
              className="w-full rounded border border-border bg-background p-2 text-sm text-foreground resize-none outline-none focus:ring-1 focus:ring-primary min-h-[80px]"
              defaultValue={card.description ?? ''}
              placeholder="Adicione uma descrição…"
              onChange={(e) => scheduleSave({ description: e.target.value })}
              rows={3}
            />
          </div>

          {/* Checklist */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Checklist{checklist.length > 0 && ` (${doneCount}/${checklist.length})`}
              </p>
            </div>
            {checklist.length > 0 && (
              <div className="mb-2">
                <div className="mb-1.5 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${(doneCount / checklist.length) * 100}%` }}
                  />
                </div>
              </div>
            )}
            <div className="space-y-1">
              {checklist.map((item) => (
                <div key={item.id} className="flex items-center gap-2 group">
                  <input
                    type="checkbox"
                    checked={item.done}
                    onChange={() => toggleCheckItem(item.id)}
                    className="h-4 w-4 rounded accent-primary flex-shrink-0"
                  />
                  <span
                    className={`flex-1 text-sm ${item.done ? 'line-through text-muted-foreground' : 'text-foreground'}`}
                  >
                    {item.text}
                  </span>
                  <button
                    onClick={() => removeCheckItem(item.id)}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive text-xs"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-2 flex gap-2">
              <input
                className="flex-1 rounded border border-border bg-background px-2 py-1 text-sm text-foreground outline-none focus:ring-1 focus:ring-primary"
                placeholder="Adicionar item…"
                value={newCheckItem}
                onChange={(e) => setNewCheckItem(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addCheckItem()}
              />
              <button
                onClick={addCheckItem}
                className="rounded bg-primary px-3 py-1 text-xs text-primary-foreground hover:opacity-90"
              >
                +
              </button>
            </div>
          </div>

          {/* Tags */}
          <div>
            <p className="mb-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Tags
            </p>
            <div className="flex flex-wrap gap-1.5">
              {card.tags.map((t) => (
                <span
                  key={t}
                  className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                >
                  {t}
                </span>
              ))}
              {card.tags.length === 0 && (
                <span className="text-xs text-muted-foreground">Sem tags</span>
              )}
            </div>
          </div>

          {/* Attachments */}
          <div>
            <p className="mb-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Anexos ({(card.card_attachments ?? []).length})
            </p>
            <div className="space-y-1">
              {(card.card_attachments ?? []).map((att) => (
                <div
                  key={att.id}
                  className="flex items-center gap-2 rounded border border-border p-2 text-sm"
                >
                  <span className="flex-1 truncate text-foreground">{att.filename}</span>
                  <span className="text-xs text-muted-foreground flex-shrink-0">
                    {formatBytes(att.size_bytes)}
                  </span>
                </div>
              ))}
            </div>
            <label className="mt-2 flex cursor-pointer items-center gap-2 text-xs text-primary hover:underline">
              <input
                type="file"
                className="hidden"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.txt"
                onChange={handleUpload}
              />
              + Adicionar anexo (máx. 10 MB)
            </label>
          </div>

          {/* Comments */}
          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Comentários ({(card.card_comments ?? []).length})
            </p>
            <div className="space-y-3 mb-3">
              {(card.card_comments ?? []).map((c) => (
                <div key={c.id} className="flex gap-2">
                  <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center text-xs text-primary flex-shrink-0">
                    {c.author_id.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="flex-1 rounded-md bg-muted/50 p-2">
                    <p className="text-xs text-muted-foreground mb-1">
                      {new Date(c.created_at).toLocaleString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                    <p className="text-sm text-foreground whitespace-pre-wrap">{c.content}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <textarea
                className="flex-1 rounded border border-border bg-background p-2 text-sm text-foreground resize-none outline-none focus:ring-1 focus:ring-primary"
                placeholder="Escreva um comentário… Use @nome para mencionar"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                rows={2}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) void postComment();
                }}
              />
              <button
                onClick={() => void postComment()}
                disabled={!commentText.trim()}
                className="rounded bg-primary px-3 py-1 text-xs text-primary-foreground hover:opacity-90 disabled:opacity-40 self-end"
              >
                Enviar
              </button>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Ctrl+Enter para enviar</p>
          </div>
        </div>
      </div>
    </div>
  );
}
