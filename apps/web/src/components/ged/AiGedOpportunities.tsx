import { useState, useCallback } from 'react';
import { api } from '../../lib/api';
import { useToast } from '../../contexts/ToastContext';

type OpStatus = 'pendente' | 'em-análise' | 'implementada' | 'descartada';

interface Opportunity {
  id: string;
  title: string;
  description: string;
  category: string;
  status: OpStatus;
}

const STATUS_STYLES: Record<OpStatus, string> = {
  pendente: 'bg-muted text-muted-foreground',
  'em-análise': 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  implementada: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  descartada: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
};

const CATEGORY_ICONS: Record<string, string> = {
  automação: '🤖',
  processo: '🔄',
  conformidade: '📋',
  organização: '🗂️',
};

export function AiGedOpportunities() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);

  const handleFetch = useCallback(async () => {
    setLoading(true);
    try {
      const raw = await api.post<Array<{ title: string; description: string; category: string }>>(
        '/ai/ged/suggest-improvements',
        {},
      );
      setOpportunities(
        raw.map((item, i) => ({ ...item, id: `opp-${Date.now()}-${i}`, status: 'pendente' })),
      );
    } catch {
      toast('Erro ao carregar sugestões de melhoria', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const updateStatus = (id: string, status: OpStatus) => {
    setOpportunities((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
  };

  const active = opportunities.filter((o) => o.status !== 'descartada');

  return (
    <div>
      {/* Trigger */}
      <button
        onClick={() => {
          setOpen((o) => !o);
          if (!open && !opportunities.length) void handleFetch();
        }}
        className="flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
      >
        <span>💡</span>
        Sugerir melhorias
      </button>

      {/* Panel */}
      {open && (
        <div className="mt-3 rounded-lg border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
            <span className="text-sm font-semibold text-foreground">
              Oportunidades de melhoria
              {active.length > 0 && (
                <span className="ml-2 text-xs text-muted-foreground">
                  ({active.length} ativa{active.length !== 1 ? 's' : ''})
                </span>
              )}
            </span>
            <button
              onClick={() => void handleFetch()}
              disabled={loading}
              className="text-xs text-primary hover:underline disabled:opacity-40"
            >
              {loading ? 'Analisando…' : 'Atualizar'}
            </button>
          </div>

          {loading && (
            <div className="space-y-2 p-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 rounded-md bg-muted animate-pulse" />
              ))}
            </div>
          )}

          {!loading && opportunities.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              Clique em "Atualizar" para gerar sugestões de melhoria.
            </p>
          )}

          {!loading && opportunities.length > 0 && (
            <div className="divide-y divide-border">
              {opportunities.map((op) => (
                <div
                  key={op.id}
                  className={`p-4 transition-opacity ${op.status === 'descartada' ? 'opacity-40' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-xl mt-0.5">{CATEGORY_ICONS[op.category] ?? '💡'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <p className="text-sm font-medium text-foreground">{op.title}</p>
                        <span className="text-[10px] text-muted-foreground capitalize">
                          {op.category}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">{op.description}</p>
                      <div className="flex gap-1.5 flex-wrap">
                        {(['em-análise', 'implementada', 'descartada'] as const).map((s) => (
                          <button
                            key={s}
                            onClick={() => updateStatus(op.id, s === op.status ? 'pendente' : s)}
                            className={`rounded px-2 py-0.5 text-[10px] font-medium transition-colors ${
                              op.status === s
                                ? STATUS_STYLES[s]
                                : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                            }`}
                          >
                            {s === 'em-análise'
                              ? 'Em análise'
                              : s === 'implementada'
                                ? 'Implementada'
                                : 'Descartar'}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
