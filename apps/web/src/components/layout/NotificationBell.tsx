import { useState } from 'react';
import { useNotifications } from '../../hooks/useNotifications';

export function NotificationBell() {
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        aria-label="Notificações"
      >
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-40 mt-1 w-80 rounded-lg border border-border bg-popover shadow-lg overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-3 py-2">
              <span className="text-sm font-medium text-popover-foreground">
                Notificações
                {unreadCount > 0 && (
                  <span className="ml-2 rounded-full bg-primary/10 px-1.5 py-0.5 text-xs text-primary">
                    {unreadCount} não lidas
                  </span>
                )}
              </span>
              {unreadCount > 0 && (
                <button
                  onClick={() => void markAllRead()}
                  className="text-xs text-primary hover:underline"
                >
                  Marcar todas como lidas
                </button>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto divide-y divide-border">
              {notifications.length === 0 && (
                <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                  Nenhuma notificação
                </p>
              )}
              {notifications.map((n) => (
                <button
                  key={n.id}
                  className={`w-full px-3 py-2.5 text-left hover:bg-muted/50 transition-colors ${n.is_read ? '' : 'bg-primary/5'}`}
                  onClick={() => {
                    void markRead(n.id);
                    setOpen(false);
                  }}
                >
                  <div className="flex items-start gap-2">
                    {!n.is_read && (
                      <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                    )}
                    {n.is_read && <div className="mt-1.5 h-1.5 w-1.5 flex-shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-popover-foreground truncate">
                        {n.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>
                      <p className="text-xs text-muted-foreground/60 mt-1">
                        {new Date(n.created_at).toLocaleString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
