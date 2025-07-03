/**
 * Next.js用のReactフック（ブラウザ専用）
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { BrowserClient, BrowserClientConfig } from '../browser-client';

export interface UseGftdOrmOptions {
  autoConnect?: boolean;
  autoReconnect?: boolean;
}

export interface UseGftdOrmResult {
  client: BrowserClient | null;
  isConnected: boolean;
  isLoading: boolean;
  error: Error | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  health: () => Promise<any>;
}

/**
 * GFTD-ORMクライアントのReactフック
 */
export function useGftdOrm(
  config: BrowserClientConfig,
  options: UseGftdOrmOptions = {}
): UseGftdOrmResult {
  const [client, setClient] = useState<BrowserClient | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const clientRef = useRef<BrowserClient | null>(null);

  const connect = useCallback(async () => {
    if (clientRef.current) return;

    try {
      setIsLoading(true);
      setError(null);

      const newClient = new BrowserClient(config);
      await newClient.initialize();

      clientRef.current = newClient;
      setClient(newClient);
      setIsConnected(true);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to connect'));
    } finally {
      setIsLoading(false);
    }
  }, [config]);

  const disconnect = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.disconnect();
      clientRef.current = null;
      setClient(null);
      setIsConnected(false);
    }
  }, []);

  const health = useCallback(async () => {
    if (!clientRef.current) {
      throw new Error('Client is not connected');
    }
    return clientRef.current.health();
  }, []);

  useEffect(() => {
    if (options.autoConnect !== false) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [connect, disconnect, options.autoConnect]);

  return {
    client,
    isConnected,
    isLoading,
    error,
    connect,
    disconnect,
    health,
  };
}

/**
 * リアルタイムサブスクリプション用のフック
 */
export function useRealtimeSubscription(
  client: BrowserClient | null,
  channel: string,
  table: string,
  event: 'INSERT' | 'UPDATE' | 'DELETE' | '*',
  callback: (payload: any) => void
) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    if (!client || !client.realtime) return;

    const realtimeChannel = client.channel(channel);
    
    const handleEvent = (payload: any) => {
      callbackRef.current(payload);
    };

    realtimeChannel.onTable(table, event, handleEvent);
    realtimeChannel.connect();

    return () => {
      realtimeChannel.unsubscribe();
      realtimeChannel.disconnect();
    };
  }, [client, channel, table, event]);
}

/**
 * データフェッチ用のフック
 */
export function useGftdOrmQuery<T = any>(
  client: GftdOrmClient | null,
  table: string,
  queryBuilder?: (query: any) => any,
  dependencies: any[] = []
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    if (!client) return;

    try {
      setLoading(true);
      setError(null);

      let query = client.from(table);
      
      if (queryBuilder) {
        query = queryBuilder(query);
      }

      const result = await query.execute();
      
      if (result.error) {
        throw result.error;
      }

      setData(result.data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Query failed'));
    } finally {
      setLoading(false);
    }
  }, [client, table, queryBuilder]);

  useEffect(() => {
    if (client) {
      refetch();
    }
  }, [client, refetch, ...dependencies]);

  return {
    data,
    loading,
    error,
    refetch,
  };
}

/**
 * データミューテーション用のフック
 */
export function useGftdOrmMutation<T = any>(
  client: GftdOrmClient | null,
  table: string
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const insert = useCallback(async (data: Partial<T>) => {
    if (!client) throw new Error('Client is not connected');

    try {
      setLoading(true);
      setError(null);

      const result = await client.from(table).insert(data);
      
      if (result.error) {
        throw result.error;
      }

      return result.data;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Insert failed'));
      throw err;
    } finally {
      setLoading(false);
    }
  }, [client, table]);

  const update = useCallback(async (data: Partial<T>, where?: (query: any) => any) => {
    if (!client) throw new Error('Client is not connected');

    try {
      setLoading(true);
      setError(null);

      let query = client.from(table);
      
      if (where) {
        query = where(query);
      }

      const result = await query.update(data);
      
      if (result.error) {
        throw result.error;
      }

      return result.data;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Update failed'));
      throw err;
    } finally {
      setLoading(false);
    }
  }, [client, table]);

  const remove = useCallback(async (where?: (query: any) => any) => {
    if (!client) throw new Error('Client is not connected');

    try {
      setLoading(true);
      setError(null);

      let query = client.from(table);
      
      if (where) {
        query = where(query);
      }

      const result = await query.delete();
      
      if (result.error) {
        throw result.error;
      }

      return result.data;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Delete failed'));
      throw err;
    } finally {
      setLoading(false);
    }
  }, [client, table]);

  return {
    insert,
    update,
    remove,
    loading,
    error,
  };
} 