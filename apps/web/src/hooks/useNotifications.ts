import { useState, useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { api } from '../lib/api';

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  link?: string;
  is_read: boolean;
  entity_id?: string;
  entity_type?: string;
  created_at: string;
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null); // eslint-disable-line @typescript-eslint/no-unused-vars

  useEffect(() => {
    api
      .get<Notification[]>('/notifications')
      .then(setNotifications)
      .catch(() => {});
  }, []);

  useEffect(() => {
    const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';
    const s = io(apiUrl, { withCredentials: true });

    s.on('notification:new', (n: Notification) => {
      setNotifications((prev) => [n, ...prev]);
    });

    setSocket(s);
    return () => {
      s.disconnect();
    };
  }, []);

  const markRead = useCallback(async (id: string) => {
    await api.patch(`/notifications/${id}/read`, {});
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
  }, []);

  const markAllRead = useCallback(async () => {
    await api.patch('/notifications/read-all', {});
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  }, []);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return { notifications, unreadCount, markRead, markAllRead };
}
