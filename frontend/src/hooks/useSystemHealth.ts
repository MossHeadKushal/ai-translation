import { useState, useEffect, useCallback } from 'react';
import type { SystemHealth } from '../types';
import { api } from '../services/api';

export function useSystemHealth(pollIntervalMs = 15000) {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [lastChecked, setLastChecked] = useState<Date>(new Date());

  const checkHealth = useCallback(async () => {
    try {
      const data = await api.getHealth();
      setHealth(data);
      setIsOnline(true);
    } catch {
      setIsOnline(false);
    } finally {
      setIsLoading(false);
      setLastChecked(new Date());
    }
  }, []);

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, pollIntervalMs);
    return () => clearInterval(interval);
  }, [checkHealth, pollIntervalMs]);

  return { health, isOnline, isLoading, lastChecked, refetch: checkHealth };
}
