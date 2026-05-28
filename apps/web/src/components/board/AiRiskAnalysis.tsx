import { useState } from 'react';
import { api } from '../../lib/api';
import { useToast } from '../../contexts/ToastContext';

interface Risk {
  risk: string;
  severity: 'baixo' | 'médio' | 'alto';
  mitigation: string;
}

interface Props {
  boardId: string;
}

const SEVERITY_STYLES: Record<string, string> = {
  baixo: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  médio: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  alto: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
};

const SEVERITY_ICONS: Record<string, string> = {
  baixo: '🟢',
  médio: '🟡',
  alto: '🔴',
};

export function AiRiskAnalysis({ boardId }: Props) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [risks, setRisks] = useState<Risk[]>([]);

  const handleAnalyze = async () => {
    setLoading(true);
    setRisks([]);
    try {
      const result = await api.post<Risk[]>(`/ai/boards/${boardId}/analyze-risks`, {});
      setRisks(result);
      if (!result.length) toast('Nenhum risco identificado', 'info');
    } catch {
      toast('Erro na análise de riscos', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => {
          setOpen((o) => !o);
          if (!open && !risks.length) void handleAnalyze();
        }}
        className="flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
      >
        <span className="text-sm">⚠️</span>
        Analisar riscos
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-40 mt-1 w-96 rounded-lg border border-border bg-popover shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-3 py-2">
              <span className="text-sm font-medium text-popover-foreground">
                Análise de riscos
                {risks.length > 0 && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    ({risks.length} risco{risks.length !== 1 ? 's' : ''})
                  </span>
                )}
              </span>
              <button
                onClick={() => void handleAnalyze()}
                disabled={loading}
                className="text-xs text-primary hover:underline disabled:opacity-40"
              >
                {loading ? 'Analisando…' : 'Reanalisar'}
              </button>
            </div>

            {loading && (
              <div className="space-y-2 p-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-20 rounded-md bg-muted animate-pulse" />
                ))}
              </div>
            )}

            {!loading && risks.length === 0 && (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                Nenhum risco identificado.
              </p>
            )}

            {!loading && risks.length > 0 && (
              <div className="divide-y divide-border max-h-96 overflow-y-auto">
                {risks.map((r, idx) => (
                  <div key={idx} className="p-3">
                    <div className="flex items-start gap-2 mb-1.5">
                      <span className="text-base mt-0.5">{SEVERITY_ICONS[r.severity] ?? '⚪'}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-medium text-popover-foreground leading-tight flex-1">
                            {r.risk}
                          </p>
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-medium flex-shrink-0 ${SEVERITY_STYLES[r.severity] ?? ''}`}
                          >
                            {r.severity}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          <span className="font-medium text-foreground">Mitigação: </span>
                          {r.mitigation}
                        </p>
                      </div>
                    </div>
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
