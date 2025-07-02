import axios, { AxiosInstance } from 'axios';
import { KsqlConnectionConfig, KsqlResponse } from '../types';

export class KsqlDBClient {
  private axios: AxiosInstance;
  private config: Required<KsqlConnectionConfig>;

  constructor(config: KsqlConnectionConfig) {
    this.config = {
      host: config.host,
      port: config.port || 8088,
      username: config.username || '',
      password: config.password || '',
      ssl: config.ssl || false,
      timeout: config.timeout || 30000,
    };

    const protocol = this.config.ssl ? 'https' : 'http';
    const baseURL = `${protocol}://${this.config.host}:${this.config.port}`;

    this.axios = axios.create({
      baseURL,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/vnd.ksql.v1+json',
        'Accept': 'application/vnd.ksql.v1+json',
      },
      ...(this.config.username && this.config.password && {
        auth: {
          username: this.config.username,
          password: this.config.password,
        },
      }),
    });
  }

  async execute<T = any>(ksql: string, properties?: Record<string, any>): Promise<KsqlResponse<T>> {
    try {
      const response = await this.axios.post('/ksql', {
        ksql,
        streamsProperties: properties || {},
      });

      return response.data[0] as KsqlResponse<T>;
    } catch (error: any) {
      if (error.response?.data) {
        throw new Error(`KsqlDB Error: ${error.response.data.message || JSON.stringify(error.response.data)}`);
      }
      throw error;
    }
  }

  async query<T = any>(ksql: string, properties?: Record<string, any>): Promise<T[]> {
    try {
      const response = await this.axios.post('/query', {
        ksql,
        streamsProperties: {
          'ksql.streams.auto.offset.reset': 'earliest',
          ...properties,
        },
      });

      const results: T[] = [];
      const data = response.data;

      if (typeof data === 'string') {
        const lines = data.trim().split('\n');
        for (const line of lines) {
          if (line) {
            try {
              const parsed = JSON.parse(line);
              if (parsed.row) {
                results.push(parsed.row);
              }
            } catch (e) {
              // Skip non-JSON lines
            }
          }
        }
      } else if (Array.isArray(data)) {
        return data;
      }

      return results;
    } catch (error: any) {
      if (error.response?.data) {
        throw new Error(`KsqlDB Query Error: ${error.response.data.message || JSON.stringify(error.response.data)}`);
      }
      throw error;
    }
  }

  async stream<T = any>(
    ksql: string,
    onMessage: (message: T) => void,
    onError?: (error: Error) => void,
    properties?: Record<string, any>
  ): Promise<() => void> {
    const controller = new AbortController();

    const streamRequest = async () => {
      try {
        const response = await this.axios.post('/query-stream', {
          ksql,
          streamsProperties: {
            'ksql.streams.auto.offset.reset': 'latest',
            ...properties,
          },
        }, {
          responseType: 'stream',
          signal: controller.signal,
        });

        let buffer = '';

        response.data.on('data', (chunk: Buffer) => {
          buffer += chunk.toString();
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.trim()) {
              try {
                const parsed = JSON.parse(line);
                if (parsed.row) {
                  onMessage(parsed.row);
                }
              } catch (e) {
                // Skip non-JSON lines
              }
            }
          }
        });

        response.data.on('error', (error: Error) => {
          if (onError) {
            onError(error);
          }
        });
      } catch (error: any) {
        if (onError && !controller.signal.aborted) {
          onError(error);
        }
      }
    };

    streamRequest();

    return () => {
      controller.abort();
    };
  }

  async getServerInfo(): Promise<any> {
    const response = await this.axios.get('/info');
    return response.data;
  }

  async getClusterStatus(): Promise<any> {
    const response = await this.axios.get('/clusterStatus');
    return response.data;
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.axios.get('/healthcheck');
      return response.status === 200;
    } catch {
      return false;
    }
  }
}