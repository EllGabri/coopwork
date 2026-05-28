import { useState, useEffect, useCallback } from 'react';
import { api } from '../../lib/api';
import { useToast } from '../../contexts/ToastContext';

interface AclEntry {
  id: string;
  user_id: string;
  can_view: boolean;
  can_download: boolean;
  can_edit: boolean;
  granted_by: string;
  created_at: string;
}

interface Props {
  documentId: string;
  documentTitle: string;
  onClose: () => void;
}

export function DocumentAclModal({ documentId, documentTitle, onClose }: Props) {
  const { toast } = useToast();
  const [acl, setAcl] = useState<AclEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState('');
  const [canDownload, setCanDownload] = useState(false);
  const [saving, setSaving] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);

  const fetchAcl = useCallback(() => {
    setLoading(true);
    api
      .get<AclEntry[]>(`/documents/${documentId}/acl`)
      .then(setAcl)
      .catch(() => setAcl([]))
      .finally(() => setLoading(false));
  }, [documentId]);

  useEffect(() => {
    fetchAcl();
  }, [fetchAcl]);

  const handleGrant = async () => {
    if (!userId.trim()) return;
    setSaving(true);
    try {
      await api.post(`/documents/${documentId}/acl`, {
        userId: userId.trim(),
        canView: true,
        canDownload,
        canEdit: false,
      });
      toast('Acesso concedido');
      setUserId('');
      setCanDownload(false);
      fetchAcl();
    } catch {
      toast('Erro ao conceder acesso', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleRevoke = async (targetUserId: string) => {
    setRevoking(targetUserId);
    try {
      await api.delete(`/documents/${documentId}/acl/${targetUserId}`);
      toast('Acesso revogado');
      setAcl((prev) => prev.filter((e) => e.user_id !== targetUserId));
    } catch {
      toast('Erro ao revogar acesso', 'error');
    } finally {
      setRevoking(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl border border-border bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold text-foreground">Permissões do documento</h2>
            <p className="text-xs text-muted-foreground truncate">{documentTitle}</p>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground text-xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Grant form */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Compartilhar com usuário
            </p>
            <input
              className="w-full rounded border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="ID do usuário (UUID)"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
            />
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={canDownload}
                  onChange={(e) => setCanDownload(e.target.checked)}
                  className="h-4 w-4 rounded accent-primary"
                />
                Permitir download
              </label>
              <button
                onClick={() => void handleGrant()}
                disabled={saving || !userId.trim()}
                className="rounded-md bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                {saving ? 'Salvando…' : 'Conceder'}
              </button>
            </div>
          </div>

          {/* Current ACL list */}
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              Acessos concedidos ({acl.length})
            </p>
            {loading ? (
              <div className="space-y-2">
                {[1, 2].map((i) => (
                  <div key={i} className="h-10 rounded bg-muted animate-pulse" />
                ))}
              </div>
            ) : acl.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum acesso individual concedido.
              </p>
            ) : (
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {acl.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center gap-2 rounded-md border border-border p-2"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-mono text-foreground truncate">{entry.user_id}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {entry.can_view && 'Ver'}
                        {entry.can_download && ' · Baixar'}
                        {entry.can_edit && ' · Editar'}
                      </p>
                    </div>
                    <button
                      onClick={() => void handleRevoke(entry.user_id)}
                      disabled={revoking === entry.user_id}
                      className="text-xs text-destructive hover:underline disabled:opacity-40"
                    >
                      {revoking === entry.user_id ? '…' : 'Revogar'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
