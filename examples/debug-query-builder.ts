/**
 * Query Builder デバッグテスト
 */

import { buildSelectQuery } from '../src/query-builder';

function debugQueryBuilder() {
  console.log('🔍 Query Builder Debug Test\n');

  // 1. 基本的なSELECT文
  const basicQuery = buildSelectQuery(
    'users_table',
    ['*'],
    {},
    {},
    5
  );
  console.log('1. Basic Query:', basicQuery);

  // 2. EMIT CHANGESを追加した場合
  const pushQuery = basicQuery + ' EMIT CHANGES';
  console.log('2. Push Query:', pushQuery);

  // 3. 条件付きクエリ
  const condQuery = buildSelectQuery(
    'users_table',
    ['*'],
    { status: 'active' },
    { created: 'desc' },
    3
  );
  console.log('3. Conditional Query:', condQuery);
  console.log('4. Conditional Push Query:', condQuery + ' EMIT CHANGES');

  // 4. 複雑なクエリ
  const complexQuery = buildSelectQuery(
    'users_table',
    ['id', 'name', 'email'],
    { 
      tenantId: 'tenant-001',
      status: { in: ['active', 'premium'] }
    },
    { created: 'desc' },
    10,
    0
  );
  console.log('5. Complex Query:', complexQuery);
  console.log('6. Complex Push Query:', complexQuery + ' EMIT CHANGES');

  console.log('\n✅ Query Builder Debug completed!');
}

// 実行
if (require.main === module) {
  debugQueryBuilder();
}

export { debugQueryBuilder }; 