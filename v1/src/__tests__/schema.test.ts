import { KsqlSchema, defineStream, defineTable } from '../schema';

describe('KsqlSchema', () => {
  it('should create column definitions correctly', () => {
    const userIdCol = KsqlSchema.varchar('user_id').key().notNull();
    const definition = userIdCol.toDefinition();

    expect(definition).toEqual({
      name: 'user_id',
      type: 'VARCHAR',
      nullable: false,
      key: true,
      headers: undefined,
      partitionKey: undefined,
    });
  });

  it('should define stream correctly', () => {
    const schema = {
      userId: KsqlSchema.varchar('user_id').key(),
      username: KsqlSchema.varchar('username').notNull(),
      timestamp: KsqlSchema.timestamp('timestamp'),
    };

    const stream = defineStream('test_stream', schema, {
      keyColumn: 'user_id',
      valueFormat: 'JSON',
    });

    expect(stream.name).toBe('test_stream');
    expect(stream.keyColumn).toBe('user_id');
    expect(stream.valueFormat).toBe('JSON');
    expect(stream.columns).toHaveLength(3);
  });

  it('should define table correctly', () => {
    const schema = {
      userId: KsqlSchema.varchar('user_id').key(),
      count: KsqlSchema.bigint('count'),
    };

    const table = defineTable('test_table', schema, {
      keyColumn: 'user_id',
      valueFormat: 'JSON',
    });

    expect(table.name).toBe('test_table');
    expect(table.keyColumn).toBe('user_id');
    expect(table.valueFormat).toBe('JSON');
    expect(table.columns).toHaveLength(2);
  });
});