import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { useToast } from '../contexts/ToastContext';

type AdminState = 'loading' | 'setup-required' | 'verify-required' | 'authenticated';

export default function AdminPage() {
  const { toast } = useToast();
  const [state, setState] = useState<AdminState>('loading');
  const [qrCode, setQrCode] = useState('');
  const [setupSecret, setSetupSecret] = useState('');
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    try {
      // Try accessing a protected admin endpoint
      await api.get('/admin/me');
      setState('authenticated');
    } catch {
      // Not authenticated via TOTP yet — check if TOTP is configured
      try {
        const status = await api.get<{ enabled: boolean }>('/admin/totp/status');
        setState(status.enabled ? 'verify-required' : 'setup-required');
      } catch {
        setState('verify-required');
      }
    }
  };

  const handleSetup = async () => {
    setSubmitting(true);
    try {
      const result = await api.post<{ qrCodeDataUrl: string; secret: string }>(
        '/admin/totp/setup',
        {},
      );
      setQrCode(result.qrCodeDataUrl);
      setSetupSecret(result.secret);
    } catch {
      toast('Erro ao configurar TOTP', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerify = async () => {
    if (code.length !== 6) return;
    setSubmitting(true);
    try {
      await api.post('/admin/totp/verify', { code });
      toast('Acesso admin liberado');
      setState('authenticated');
    } catch {
      toast('Código inválido. Tente novamente.', 'error');
      setCode('');
    } finally {
      setSubmitting(false);
    }
  };

  if (state === 'loading') {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (state === 'setup-required') {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-lg">
          <div className="mb-4 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <span className="text-2xl">🔐</span>
            </div>
            <h1 className="text-lg font-bold text-foreground">Configurar autenticação admin</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Configure o Google Authenticator para proteger o acesso ao admin.
            </p>
          </div>

          {!qrCode ? (
            <button
              onClick={() => void handleSetup()}
              disabled={submitting}
              className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? 'Gerando…' : 'Gerar QR Code'}
            </button>
          ) : (
            <div className="space-y-4">
              <p className="text-center text-xs text-muted-foreground">
                Escaneie o QR Code com o Google Authenticator:
              </p>
              <div className="flex justify-center">
                <img src={qrCode} alt="QR Code TOTP" className="h-40 w-40 rounded-lg" />
              </div>
              {setupSecret && (
                <div className="rounded-md bg-muted px-3 py-2">
                  <p className="text-[10px] text-muted-foreground mb-1">Chave manual:</p>
                  <p className="text-xs font-mono text-foreground break-all">{setupSecret}</p>
                </div>
              )}
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  Após escanear, insira o código de 6 dígitos para confirmar:
                </p>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  onKeyDown={(e) => e.key === 'Enter' && void handleVerify()}
                  className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-center text-2xl font-mono tracking-widest text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="000000"
                  autoFocus
                />
                <button
                  onClick={() => void handleVerify()}
                  disabled={submitting || code.length !== 6}
                  className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
                >
                  {submitting ? 'Verificando…' : 'Confirmar e acessar'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (state === 'verify-required') {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-lg">
          <div className="mb-5 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <span className="text-2xl">🔑</span>
            </div>
            <h1 className="text-lg font-bold text-foreground">Acesso Admin</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Insira o código do Google Authenticator
            </p>
          </div>
          <div className="space-y-3">
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              onKeyDown={(e) => e.key === 'Enter' && void handleVerify()}
              className="w-full rounded-lg border border-border bg-background px-4 py-3 text-center text-2xl font-mono tracking-widest text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="000000"
              autoFocus
            />
            <button
              onClick={() => void handleVerify()}
              disabled={submitting || code.length !== 6}
              className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? 'Verificando…' : 'Entrar no admin'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // authenticated
  return (
    <div className="mx-auto max-w-4xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">Painel Administrativo</h1>
        <button
          onClick={async () => {
            await api.post('/admin/totp/logout', {});
            setState('verify-required');
            setCode('');
          }}
          className="rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted"
        >
          Sair do admin
        </button>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          {
            title: 'Usuários',
            desc: 'Gerenciar usuários, roles e status',
            icon: '👥',
            href: '#users',
          },
          { title: 'Permissões', desc: 'Matrix role × módulo', icon: '🔒', href: '#permissions' },
          { title: 'Parâmetros', desc: 'Configurações do sistema', icon: '⚙️', href: '#params' },
          { title: 'Tarefas', desc: 'Buscar e moderar cards', icon: '📋', href: '#tasks' },
          {
            title: 'Monitoramento',
            desc: 'Dashboard de uso e métricas',
            icon: '📊',
            href: '#monitoring',
          },
          { title: 'Auditoria IA', desc: 'Log de chamadas ao Claude', icon: '🤖', href: '#ai-log' },
        ].map((item) => (
          <div
            key={item.title}
            className="rounded-lg border border-border bg-card p-4 hover:border-primary/40 transition-colors cursor-pointer"
          >
            <div className="text-2xl mb-2">{item.icon}</div>
            <h3 className="text-sm font-semibold text-foreground">{item.title}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground text-center">
        Módulos administrativos detalhados implementados nas tarefas 7.2–7.6.
      </p>
    </div>
  );
}
