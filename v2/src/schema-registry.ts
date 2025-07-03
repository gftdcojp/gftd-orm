/**
 * Schema Registry クライアント - スキーマ管理 (Avro/JSON Schema)
 */

import axios, { AxiosInstance } from 'axios';
import { SchemaRegistryConfig, AvroSchema } from './types';

let schemaRegistryClient: AxiosInstance | null = null;
let config: SchemaRegistryConfig | null = null;

/**
 * Schema Registry クライアントを初期化
 */
export function initializeSchemaRegistryClient(registryConfig: SchemaRegistryConfig): void {
  config = registryConfig;
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/vnd.schemaregistry.v1+json',
  };

  // 認証情報がある場合は Authorization ヘッダーを追加
  if (registryConfig.auth) {
    const credentials = Buffer.from(`${registryConfig.auth.user}:${registryConfig.auth.pass}`).toString('base64');
    headers['Authorization'] = `Basic ${credentials}`;
  } else if (registryConfig.apiKey) {
    headers['Authorization'] = `Bearer ${registryConfig.apiKey}`;
  }

  schemaRegistryClient = axios.create({
    baseURL: registryConfig.url,
    headers,
    timeout: 15000, // 15秒のタイムアウト
  });
}

/**
 * スキーマを登録
 */
export async function registerSchema(
  subject: string,
  schema: AvroSchema,
  schemaType: 'AVRO' | 'JSON' = 'AVRO'
): Promise<{ id: number }> {
  if (!schemaRegistryClient) {
    throw new Error('Schema Registry client is not initialized. Call initializeSchemaRegistryClient() first.');
  }

  try {
    const response = await schemaRegistryClient.post(`/subjects/${subject}/versions`, {
      schemaType,
      schema: JSON.stringify(schema),
    });

    return { id: response.data.id };
  } catch (error: any) {
    if (axios.isAxiosError(error)) {
      throw new Error(`Schema registration failed: ${error.response?.data?.message || error.message}`);
    }
    throw error;
  }
}

/**
 * スキーマを取得（最新バージョン）
 */
export async function getLatestSchema(subject: string): Promise<{ id: number; version: number; schema: string }> {
  if (!schemaRegistryClient) {
    throw new Error('Schema Registry client is not initialized.');
  }

  try {
    const response = await schemaRegistryClient.get(`/subjects/${subject}/versions/latest`);
    return {
      id: response.data.id,
      version: response.data.version,
      schema: response.data.schema,
    };
  } catch (error: any) {
    if (axios.isAxiosError(error)) {
      throw new Error(`Failed to get schema: ${error.response?.data?.message || error.message}`);
    }
    throw error;
  }
}

/**
 * 特定バージョンのスキーマを取得
 */
export async function getSchemaByVersion(
  subject: string,
  version: number
): Promise<{ id: number; version: number; schema: string }> {
  if (!schemaRegistryClient) {
    throw new Error('Schema Registry client is not initialized.');
  }

  try {
    const response = await schemaRegistryClient.get(`/subjects/${subject}/versions/${version}`);
    return {
      id: response.data.id,
      version: response.data.version,
      schema: response.data.schema,
    };
  } catch (error: any) {
    if (axios.isAxiosError(error)) {
      throw new Error(`Failed to get schema version ${version}: ${error.response?.data?.message || error.message}`);
    }
    throw error;
  }
}

/**
 * スキーマIDでスキーマを取得
 */
export async function getSchemaById(id: number): Promise<{ schema: string }> {
  if (!schemaRegistryClient) {
    throw new Error('Schema Registry client is not initialized.');
  }

  try {
    const response = await schemaRegistryClient.get(`/schemas/ids/${id}`);
    return { schema: response.data.schema };
  } catch (error: any) {
    if (axios.isAxiosError(error)) {
      throw new Error(`Failed to get schema by ID ${id}: ${error.response?.data?.message || error.message}`);
    }
    throw error;
  }
}

/**
 * subject 一覧を取得
 */
export async function listSubjects(): Promise<string[]> {
  if (!schemaRegistryClient) {
    throw new Error('Schema Registry client is not initialized.');
  }

  try {
    const response = await schemaRegistryClient.get('/subjects');
    return response.data;
  } catch (error: any) {
    if (axios.isAxiosError(error)) {
      throw new Error(`Failed to list subjects: ${error.response?.data?.message || error.message}`);
    }
    throw error;
  }
}

/**
 * subject のバージョン一覧を取得
 */
export async function listVersions(subject: string): Promise<number[]> {
  if (!schemaRegistryClient) {
    throw new Error('Schema Registry client is not initialized.');
  }

  try {
    const response = await schemaRegistryClient.get(`/subjects/${subject}/versions`);
    return response.data;
  } catch (error: any) {
    if (axios.isAxiosError(error)) {
      throw new Error(`Failed to list versions for ${subject}: ${error.response?.data?.message || error.message}`);
    }
    throw error;
  }
}

/**
 * スキーマの互換性をチェック
 */
export async function checkCompatibility(
  subject: string,
  schema: AvroSchema,
  version?: number
): Promise<{ is_compatible: boolean }> {
  if (!schemaRegistryClient) {
    throw new Error('Schema Registry client is not initialized.');
  }

  try {
    const endpoint = version 
      ? `/compatibility/subjects/${subject}/versions/${version}`
      : `/compatibility/subjects/${subject}/versions/latest`;
      
    const response = await schemaRegistryClient.post(endpoint, {
      schema: JSON.stringify(schema),
    });

    return { is_compatible: response.data.is_compatible };
  } catch (error: any) {
    if (axios.isAxiosError(error)) {
      throw new Error(`Compatibility check failed: ${error.response?.data?.message || error.message}`);
    }
    throw error;
  }
}

/**
 * スキーマの互換性レベルを設定
 */
export async function setCompatibilityLevel(
  subject: string,
  level: 'BACKWARD' | 'BACKWARD_TRANSITIVE' | 'FORWARD' | 'FORWARD_TRANSITIVE' | 'FULL' | 'FULL_TRANSITIVE' | 'NONE'
): Promise<{ compatibility: string }> {
  if (!schemaRegistryClient) {
    throw new Error('Schema Registry client is not initialized.');
  }

  try {
    const response = await schemaRegistryClient.put(`/config/${subject}`, {
      compatibility: level,
    });

    return { compatibility: response.data.compatibility };
  } catch (error: any) {
    if (axios.isAxiosError(error)) {
      throw new Error(`Failed to set compatibility level: ${error.response?.data?.message || error.message}`);
    }
    throw error;
  }
}

/**
 * subject を削除
 */
export async function deleteSubject(subject: string, permanent: boolean = false): Promise<number[]> {
  if (!schemaRegistryClient) {
    throw new Error('Schema Registry client is not initialized.');
  }

  try {
    const params = permanent ? { permanent: 'true' } : {};
    const response = await schemaRegistryClient.delete(`/subjects/${subject}`, { params });
    return response.data;
  } catch (error: any) {
    if (axios.isAxiosError(error)) {
      throw new Error(`Failed to delete subject ${subject}: ${error.response?.data?.message || error.message}`);
    }
    throw error;
  }
}

/**
 * 特定バージョンのスキーマを削除
 */
export async function deleteSchemaVersion(
  subject: string,
  version: number,
  permanent: boolean = false
): Promise<number> {
  if (!schemaRegistryClient) {
    throw new Error('Schema Registry client is not initialized.');
  }

  try {
    const params = permanent ? { permanent: 'true' } : {};
    const response = await schemaRegistryClient.delete(`/subjects/${subject}/versions/${version}`, { params });
    return response.data;
  } catch (error: any) {
    if (axios.isAxiosError(error)) {
      throw new Error(`Failed to delete schema version: ${error.response?.data?.message || error.message}`);
    }
    throw error;
  }
}

/**
 * スキーマの進化を確認
 */
export async function validateSchemaEvolution(
  subject: string,
  newSchema: AvroSchema,
  previousVersions: number = 5
): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = [];
  let valid = true;

  try {
    // 最新バージョンとの互換性チェック
    const compatibility = await checkCompatibility(subject, newSchema);
    
    if (!compatibility.is_compatible) {
      valid = false;
      errors.push('Schema is not compatible with latest version');
    }

    // 過去のバージョンとの互換性も確認
    const versions = await listVersions(subject);
    const recentVersions = versions.slice(-previousVersions);

    for (const version of recentVersions) {
      try {
        const versionCompatibility = await checkCompatibility(subject, newSchema, version);
        if (!versionCompatibility.is_compatible) {
          errors.push(`Schema is not compatible with version ${version}`);
          valid = false;
        }
      } catch (error) {
        // バージョンが存在しない場合は無視
      }
    }

  } catch (error: any) {
    valid = false;
    errors.push(`Schema evolution validation failed: ${error.message}`);
  }

  return { valid, errors };
}

/**
 * クライアント設定を取得
 */
export function getSchemaRegistryConfig(): SchemaRegistryConfig | null {
  return config;
}

/**
 * 接続状態を確認
 */
export function isSchemaRegistryConnected(): boolean {
  return schemaRegistryClient !== null && config !== null;
}

/**
 * クライアントを閉じる
 */
export function closeSchemaRegistryClient(): void {
  schemaRegistryClient = null;
  config = null;
} 