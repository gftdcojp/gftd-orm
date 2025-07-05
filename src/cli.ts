#!/usr/bin/env node

/**
 * GFTD ORM CLI - TypeScript型生成コマンドライン インターフェース
 * 
 * 完全実装済み機能:
 * - CLIコマンドの実装 ✅
 * - 型生成コマンドの追加 ✅
 * - ファイル出力機能 ✅
 * - ドライランモード ✅
 * - 全テーブル型生成 ✅
 * - テーブル一覧表示 ✅
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { Command, OptionValues } from 'commander';
import { initializeKsqlDbClient } from './ksqldb-client';
import { generateTypesForTables, listAllTables, getTableSchema, generateCompleteTypeDefinition } from './type-generator';
import { log } from './utils/logger';
import dotenv from 'dotenv';

// 環境変数を読み込み
dotenv.config();

/**
 * CLIのバージョン情報
 */
const CLI_VERSION = '25.07.8';

/**
 * 設定オプション
 */
interface CliOptions {
  url?: string;
  apiKey?: string;
  apiSecret?: string;
  output?: string;
  table?: string;
  all?: boolean;
  dry?: boolean;
  verbose?: boolean;
  format?: 'ts' | 'js' | 'dts';
}

/**
 * ksqlDB接続を初期化
 * @param options - CLI オプション
 */
function initializeConnection(options: CliOptions): void {
  const url = options.url || process.env.GFTD_DB_URL || process.env.KSQLDB_URL || 'http://localhost:8088';
  const apiKey = options.apiKey || process.env.GFTD_DB_API_KEY || process.env.KSQLDB_API_KEY;
  const apiSecret = options.apiSecret || process.env.GFTD_DB_API_SECRET || process.env.KSQLDB_API_SECRET;
  
  if (options.verbose) {
    log.info('Initializing ksqlDB connection...');
    log.info(`URL: ${url}`);
    log.info(`API Key: ${apiKey ? '***' : 'Not provided'}`);
  }
  
  initializeKsqlDbClient({
    url,
    apiKey,
    apiSecret,
  });
}

/**
 * ファイルを安全に書き込み
 * @param filePath - ファイルパス
 * @param content - 書き込み内容
 * @param options - CLI オプション
 */
function writeFileContents(filePath: string, content: string, options: CliOptions): void {
  if (options.dry) {
    console.log(`\n[DRY RUN] Would write to: ${filePath}`);
    console.log('--- Content ---');
    console.log(content);
    console.log('--- End Content ---\n');
    return;
  }
  
  // ディレクトリを作成
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
    if (options.verbose) {
      log.info(`Created directory: ${dir}`);
    }
  }
  
  // ファイルに書き込み
  writeFileSync(filePath, content, 'utf8');
  
  if (options.verbose) {
    log.info(`✅ Generated: ${filePath}`);
  } else {
    console.log(`✅ Generated: ${filePath}`);
  }
}

/**
 * テーブル名からファイル名を生成
 * @param tableName - テーブル名
 * @param format - 出力形式
 * @returns ファイル名
 */
function generateFileName(tableName: string, format: string = 'ts'): string {
  // TABLE_table のような重複を修正
  const cleanName = tableName.replace(/_table$/i, '').replace(/_stream$/i, '');
  
  return cleanName
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_') + `.${format}`;
}

/**
 * 単一テーブルの型を生成
 */
async function generateTypesCommand(tableName: string, options: CliOptions) {
  try {
    initializeConnection(options);
    
    if (options.verbose) {
      log.info(`🔍 Analyzing table: ${tableName}`);
    }
    
    const schema = await getTableSchema(tableName);
    const typeInfo = generateCompleteTypeDefinition(schema);
    
    const outputDir = options.output || './types';
    const fileName = generateFileName(tableName, options.format || 'ts');
    const filePath = join(outputDir, fileName);
    
    writeFileContents(filePath, typeInfo.fullCode, options);
    
    if (!options.dry) {
      console.log(`\n🎉 Type generation completed for table: ${tableName}`);
      console.log(`📄 Interface: ${typeInfo.interfaceName}`);
      console.log(`🔧 Mapper: ${typeInfo.mapperFunctionName}`);
    }
    
  } catch (error: any) {
    console.error(`❌ Error generating types for table ${tableName}:`, error.message);
    process.exit(1);
  }
}

/**
 * 全テーブルの型を生成
 */
async function generateAllTypesCommand(options: CliOptions) {
  try {
    initializeConnection(options);
    
    if (options.verbose) {
      log.info('🔍 Listing all tables and streams...');
    }
    
    const tables = await listAllTables();
    
    if (tables.length === 0) {
      console.log('⚠️  No tables or streams found.');
      return;
    }
    
    console.log(`🔍 Found ${tables.length} tables/streams:`);
    tables.forEach(table => {
      console.log(`  - ${table.name} (${table.type})`);
    });
    
    console.log('\n🚀 Generating types...\n');
    
    const outputDir = options.output || './types';
    let successCount = 0;
    let errorCount = 0;
    
    for (const table of tables) {
      try {
        if (options.verbose) {
          log.info(`Generating types for: ${table.name}`);
        }
        
        const schema = await getTableSchema(table.name);
        const typeInfo = generateCompleteTypeDefinition(schema);
        
        const fileName = generateFileName(table.name, options.format || 'ts');
        const filePath = join(outputDir, fileName);
        
        writeFileContents(filePath, typeInfo.fullCode, options);
        successCount++;
        
      } catch (error: any) {
        console.error(`❌ Failed to generate types for ${table.name}: ${error.message}`);
        errorCount++;
      }
    }
    
    if (!options.dry) {
      console.log(`\n🎉 Type generation completed!`);
      console.log(`✅ Success: ${successCount} tables`);
      if (errorCount > 0) {
        console.log(`❌ Errors: ${errorCount} tables`);
      }
      console.log(`📁 Output directory: ${outputDir}`);
    }
    
  } catch (error: any) {
    console.error(`❌ Error generating types:`, error.message);
    process.exit(1);
  }
}

/**
 * テーブル一覧を表示
 */
async function listTablesCommand(options: CliOptions) {
  try {
    initializeConnection(options);
    
    if (options.verbose) {
      log.info('🔍 Listing all tables and streams...');
    }
    
    const tables = await listAllTables();
    
    if (tables.length === 0) {
      console.log('⚠️  No tables or streams found.');
      return;
    }
    
    console.log(`\n📊 Found ${tables.length} tables/streams:\n`);
    
    // テーブルとストリームを分けて表示
    const tablesList = tables.filter(t => t.type === 'TABLE');
    const streamsList = tables.filter(t => t.type === 'STREAM');
    
    if (tablesList.length > 0) {
      console.log('📋 Tables:');
      tablesList.forEach(table => {
        console.log(`  • ${table.name} (topic: ${table.topic}, format: ${table.valueFormat})`);
      });
      console.log('');
    }
    
    if (streamsList.length > 0) {
      console.log('🌊 Streams:');
      streamsList.forEach(stream => {
        console.log(`  • ${stream.name} (topic: ${stream.topic}, format: ${stream.valueFormat})`);
      });
      console.log('');
    }
    
  } catch (error: any) {
    console.error(`❌ Error listing tables:`, error.message);
    process.exit(1);
  }
}

/**
 * メイン CLI プログラム
 */
async function main() {
  const program = new Command();
  
  program
    .name('gftd-orm')
    .description('GFTD ORM CLI - TypeScript type generation for ksqlDB')
    .version(CLI_VERSION);
  
  // 共通オプション
  program
    .option('-u, --url <url>', 'ksqlDB server URL (default: http://localhost:8088)')
    .option('-k, --api-key <key>', 'ksqlDB API key')
    .option('-s, --api-secret <secret>', 'ksqlDB API secret')
    .option('-o, --output <dir>', 'Output directory (default: ./types)')
    .option('-v, --verbose', 'Verbose output')
    .option('--dry', 'Dry run - show what would be generated without writing files');
  
  // generate-types コマンド - 単一テーブル
  program
    .command('generate-types')
    .description('Generate TypeScript types for a specific table')
    .option('-t, --table <table>', 'Table name to generate types for')
    .option('-f, --format <format>', 'Output format (ts, js, dts)', 'ts')
    .action(async (options: OptionValues) => {
      const globalOptions = program.opts();
      const combinedOptions = { ...globalOptions, ...options };
      
      if (!combinedOptions.table) {
        console.error('❌ Error: --table option is required');
        console.log('Usage: gftd-orm generate-types --table <table-name>');
        process.exit(1);
      }
      
      await generateTypesCommand(combinedOptions.table, combinedOptions);
    });
  
  // generate-all コマンド - 全テーブル
  program
    .command('generate-all')
    .description('Generate TypeScript types for all tables and streams')
    .option('-f, --format <format>', 'Output format (ts, js, dts)', 'ts')
    .action(async (options: OptionValues) => {
      const globalOptions = program.opts();
      const combinedOptions = { ...globalOptions, ...options };
      
      await generateAllTypesCommand(combinedOptions);
    });
  
  // list コマンド - テーブル一覧
  program
    .command('list')
    .description('List all available tables and streams')
    .action(async () => {
      const globalOptions = program.opts();
      await listTablesCommand(globalOptions);
    });
  
  // パース実行
  program.parse();
}

// CLI 実行
if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  });
}

export { main as runCli }; 