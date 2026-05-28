import { useState } from 'react';
import { api } from '../../lib/api';
import { useToast } from '../../contexts/ToastContext';

interface Deliberation {
  deliberation: string;
  responsible?: string | null;
  createCard: boolean;
}

interface Props {
  firstBoardColumnId?: string;
}

export function MeetingSummary({ firstBoardColumnId }: Props) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [ataText, setAtaText] = useState('');
  const [loading, setLoading] = useState(false);
  const [deliberations, setDeliberations] = useState<Deliberation[]>([]);
  const [creating, setCreating] = useState(false);

  const handleSummarize = async () => {
    if (!ataText.trim()) {
      toast('Cole o texto da ata antes de gerar', 'info');
      return;
    }
    setLoading(true);
    setDeliberations([]);
    try {
      const raw = await api.post<Array<{ deliberation: string; responsible?: string }>>(
        '/ai/ged/summarize-meeting',
        { text: ataText },
      );
      setDeliberations(raw.map((item) => ({ ...item, createCard: false })));
    } catch {
      toast('Erro ao gerar resumo', 'error');
    } finally {
      setLoading(false);
    }
  };

  const toggleCard = (idx: number) => {
    setDeliberations((prev) =>
      prev.map((d, i) => (i === idx ? { ...d, createCard: !d.createCard } : d)),
    );
  };

  const handleCreateCards = async () => {
    const toCreate = deliberations.filter((d) => d.createCard);
    if (!toCreate.length || !firstBoardColumnId) return;
    setCreating(true);
    let created = 0;
    for (const d of toCreate) {
      try {
        await api.post(`/columns/${firstBoardColumnId}/cards`, {
          title: d.deliberation.slice(0, 120),
          description: d.responsible ? `Responsável: ${d.responsible}` : undefined,
          priority: 'medium',
          tags: ['reunião'],
        });
        created++;
      } catch {
        // continue with others
      }
    }
    toast(`${created} card${created !== 1 ? 's' : ''} criado${created !== 1 ? 's' : ''}`);
    setDeliberations((prev) => prev.map((d) => ({ ...d, createCard: false })));
    setCreating(false);
  };

  const selectedCount = deliberations.filter((d) => d.createCard).length;

  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
      >
        <span>📝</span>
        Resumir reunião
      </button>

      {open && (
        <div className="mt-3 rounded-lg border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
            <span className="text-sm font-semibold text-foreground">Resumo de ata</span>
            <button
              onClick={() => setOpen(false)}
              className="text-muted-foreground hover:text-foreground text-lg leading-none"
            >
              ×
            </button>
          </div>

          <div className="p-4 space-y-3">
            <textarea
              className="w-full rounded border border-border bg-background p-2.5 text-sm text-foreground resize-none placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="Cole aqui o texto da ata da reunião…"
              rows={6}
              value={ataText}
              onChange={(e) => setAtaText(e.target.value)}
            />
            <button
              onClick={() => void handleSummarize()}
              disabled={loading || !ataText.trim()}
              className="rounded-md bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {loading ? 'Gerando resumo…' : 'Gerar resumo'}
            </button>
          </div>

          {loading && (
            <div className="space-y-2 px-4 pb-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-10 rounded bg-muted animate-pulse" />
              ))}
            </div>
          )}

          {!loading && deliberations.length > 0 && (
            <>
              <div className="border-t border-border px-4 py-2.5">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Deliberações ({deliberations.length})
                </p>
              </div>
              <div className="divide-y divide-border px-4">
                {deliberations.map((d, idx) => (
                  <div key={idx} className="flex items-start gap-3 py-2.5">
                    <input
                      type="checkbox"
                      checked={d.createCard}
                      onChange={() => toggleCard(idx)}
                      className="mt-0.5 h-4 w-4 rounded accent-primary flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground">{d.deliberation}</p>
                      {d.responsible && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Responsável: {d.responsible}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {firstBoardColumnId && (
                <div className="border-t border-border px-4 py-3 flex items-center gap-3">
                  <span className="text-xs text-muted-foreground flex-1">
                    {selectedCount > 0
                      ? `${selectedCount} item${selectedCount !== 1 ? 's' : ''} selecionado${selectedCount !== 1 ? 's' : ''}`
                      : 'Selecione itens para criar cards'}
                  </span>
                  <button
                    onClick={() => void handleCreateCards()}
                    disabled={!selectedCount || creating}
                    className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
                  >
                    {creating ? 'Criando…' : 'Criar cards selecionados'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
