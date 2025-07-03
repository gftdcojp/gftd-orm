/**
 * Realtime Module - リアルタイム通信機能（WebSocketベース）
 */

import { EventEmitter } from 'events';
import WebSocket from 'ws';

export interface RealtimeConfig {
  url: string;
  apiKey?: string;
  autoReconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

export interface RealtimeMessage {
  event: string;
  topic: string;
  payload: any;
  timestamp: number;
}

export interface SubscriptionOptions {
  event?: string;
  schema?: string;
  table?: string;
  filter?: string;
}

export type RealtimeEventType = 
  | 'INSERT' 
  | 'UPDATE' 
  | 'DELETE' 
  | 'STREAM' 
  | 'BROADCAST' 
  | 'PRESENCE'
  | 'presence:change'
  | '*';

/**
 * リアルタイムチャンネル
 */
export class RealtimeChannel extends EventEmitter {
  private ws: WebSocket | null = null;
  private subscriptions = new Map<string, SubscriptionOptions>();
  private isConnected = false;
  private reconnectAttempts = 0;

  constructor(
    private topic: string,
    private config: RealtimeConfig,
    private realtime: Realtime
  ) {
    super();
  }

  /**
   * データベースの変更を監視
   */
  on(event: string, callback: (...args: any[]) => void): this {
    return super.on(event, callback);
  }

  /**
   * テーブルの変更を監視
   */
  onTable(
    table: string,
    event: RealtimeEventType,
    callback: (payload: any) => void,
    options?: { schema?: string; filter?: string }
  ): this {
    const subscriptionId = `table:${table}:${event}`;
    
    this.subscriptions.set(subscriptionId, {
      event,
      schema: options?.schema || 'public',
      table,
      filter: options?.filter,
    });

    this.on(subscriptionId, callback);
    
    if (this.isConnected) {
      this.sendSubscription(subscriptionId);
    }

    return this;
  }

  /**
   * ストリームイベントを監視
   */
  onStream(
    stream: string,
    callback: (payload: any) => void,
    options?: { filter?: string }
  ): this {
    const subscriptionId = `stream:${stream}`;
    
    this.subscriptions.set(subscriptionId, {
      event: 'STREAM',
      table: stream,
      filter: options?.filter,
    });

    this.on(subscriptionId, callback);
    
    if (this.isConnected) {
      this.sendSubscription(subscriptionId);
    }

    return this;
  }

  /**
   * ブロードキャストイベントを監視
   */
  onBroadcast(
    event: string,
    callback: (payload: any) => void
  ): this {
    const subscriptionId = `broadcast:${event}`;
    
    this.subscriptions.set(subscriptionId, {
      event: 'BROADCAST',
    });

    this.on(subscriptionId, callback);
    
    if (this.isConnected) {
      this.sendSubscription(subscriptionId);
    }

    return this;
  }

  /**
   * プレゼンス機能（ユーザーのオンライン状態管理）
   */
  presence = {
    /**
     * プレゼンス状態を追跡
     */
    track: (state: Record<string, any>): Promise<void> => {
      return this.send({
        type: 'presence',
        event: 'track',
        payload: state,
      });
    },

    /**
     * プレゼンス状態を停止
     */
    untrack: (): Promise<void> => {
      return this.send({
        type: 'presence',
        event: 'untrack',
        payload: {},
      });
    },

    /**
     * プレゼンス変更を監視
     */
    onChange: (callback: (payload: any) => void) => {
      this.on('presence:change', callback);
    },
  };

  /**
   * メッセージをブロードキャスト
   */
  async broadcast(event: string, payload: any): Promise<void> {
    return this.send({
      type: 'broadcast',
      event,
      payload,
    });
  }

  /**
   * チャンネルに接続
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const wsUrl = this.buildWebSocketUrl();
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          this.isConnected = true;
          this.reconnectAttempts = 0;
          
          // 既存のサブスクリプションを送信
          for (const [id] of this.subscriptions) {
            this.sendSubscription(id);
          }
          
          this.emit('connected');
          resolve();
        };

        this.ws.onmessage = (event) => {
          const data = typeof event.data === 'string' ? event.data : event.data.toString();
          this.handleMessage(data);
        };

        this.ws.onclose = () => {
          this.isConnected = false;
          this.emit('disconnected');
          
          if (this.config.autoReconnect !== false) {
            this.attemptReconnect();
          }
        };

        this.ws.onerror = (error) => {
          this.emit('error', new Error(`WebSocket error: ${error}`));
          reject(error);
        };

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * チャンネルから切断
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
  }

  /**
   * サブスクリプションを解除
   */
  unsubscribe(subscriptionId?: string): void {
    if (subscriptionId) {
      this.subscriptions.delete(subscriptionId);
      this.removeAllListeners(subscriptionId);
    } else {
      this.subscriptions.clear();
      this.removeAllListeners();
    }
  }

  private buildWebSocketUrl(): string {
    const url = new URL(this.config.url.replace('http', 'ws'));
    url.pathname = `/realtime/v1/websocket`;
    url.searchParams.set('topic', this.topic);
    
    if (this.config.apiKey) {
      url.searchParams.set('apikey', this.config.apiKey);
    }
    
    return url.toString();
  }

  private async send(message: any): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket is not connected');
    }

    this.ws.send(JSON.stringify({
      topic: this.topic,
      ref: Date.now().toString(),
      ...message,
    }));
  }

  private sendSubscription(subscriptionId: string): void {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) return;

    this.send({
      type: 'subscribe',
      event: subscription.event,
      payload: {
        schema: subscription.schema,
        table: subscription.table,
        filter: subscription.filter,
      },
    }).catch(error => {
      this.emit('error', error);
    });
  }

  private handleMessage(data: string): void {
    try {
      const message: RealtimeMessage = JSON.parse(data);
      
      // イベントタイプに基づいて適切なリスナーに配信
      if (message.event === 'INSERT' || message.event === 'UPDATE' || message.event === 'DELETE') {
        const subscriptionId = `table:${message.payload.table}:${message.event}`;
        this.emit(subscriptionId, message.payload);
      } else if (message.event === 'STREAM') {
        const subscriptionId = `stream:${message.payload.stream}`;
        this.emit(subscriptionId, message.payload);
      } else if (message.event === 'BROADCAST') {
        const subscriptionId = `broadcast:${message.payload.event}`;
        this.emit(subscriptionId, message.payload);
      } else if (message.event.startsWith('presence:')) {
        this.emit(message.event, message.payload);
      }

      // 汎用イベント
      this.emit(message.event, message.payload);
      
    } catch (error) {
      this.emit('error', new Error(`Failed to parse message: ${error}`));
    }
  }

  private attemptReconnect(): void {
    const maxAttempts = this.config.maxReconnectAttempts || 10;
    const interval = this.config.reconnectInterval || 5000;

    if (this.reconnectAttempts >= maxAttempts) {
      this.emit('error', new Error('Max reconnection attempts reached'));
      return;
    }

    this.reconnectAttempts++;
    
    setTimeout(() => {
      this.connect().catch(error => {
        this.emit('error', error);
      });
    }, interval);
  }
}

/**
 * Realtime クラス - メインのリアルタイム管理
 */
export class Realtime {
  private channels = new Map<string, RealtimeChannel>();

  constructor(private config: RealtimeConfig) {}

  /**
   * チャンネルを作成または取得
   */
  channel(topic: string): RealtimeChannel {
    if (!this.channels.has(topic)) {
      const channel = new RealtimeChannel(topic, this.config, this);
      this.channels.set(topic, channel);
    }
    
    return this.channels.get(topic)!;
  }

  /**
   * すべてのチャンネルを切断
   */
  disconnect(): void {
    for (const channel of this.channels.values()) {
      channel.disconnect();
    }
    this.channels.clear();
  }

  /**
   * 接続状態を取得
   */
  getConnectionStatus(): Record<string, boolean> {
    const status: Record<string, boolean> = {};
    
    for (const [topic, channel] of this.channels) {
      status[topic] = (channel as any).isConnected;
    }
    
    return status;
  }
}

/**
 * デフォルトRealtimeインスタンスを作成
 */
export function createRealtime(config: RealtimeConfig): Realtime {
  return new Realtime(config);
} 