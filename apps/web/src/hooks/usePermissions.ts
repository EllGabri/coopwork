import { useState, useEffect } from 'react';
import { api } from '../lib/api';

type PermissionsMap = Record<string, Record<string, boolean>>;

let cachedPerms: PermissionsMap | null = null;
let cacheExpiry = 0;
const CACHE_TTL = 30_000; // 30s — matches backend TTL

export function usePermissions() {
  const [permissions, setPermissions] = useState<PermissionsMap>(cachedPerms ?? {});

  useEffect(() => {
    const now = Date.now();
    if (cachedPerms && cacheExpiry > now) {
      setPermissions(cachedPerms);
      return;
    }
    api
      .get<PermissionsMap>('/auth/my-permissions')
      .then((p) => {
        cachedPerms = p;
        cacheExpiry = Date.now() + CACHE_TTL;
        setPermissions(p);
      })
      .catch(() => {});
  }, []);

  const can = (module: string, action: string): boolean => permissions[module]?.[action] ?? false;

  return { permissions, can };
}
