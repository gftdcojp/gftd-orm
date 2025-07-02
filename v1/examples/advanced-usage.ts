import { KsqlDB, KsqlSchema, defineStream, defineTable } from '../src';

// E-commerce example with complex types
const orderSchema = {
  orderId: KsqlSchema.varchar('order_id').key(),
  userId: KsqlSchema.varchar('user_id').notNull(),
  orderDate: KsqlSchema.timestamp('order_date').notNull(),
  totalAmount: KsqlSchema.decimal('total_amount').notNull(),
  items: KsqlSchema.array('items').notNull(),
  shippingAddress: KsqlSchema.struct('shipping_address').notNull(),
  status: KsqlSchema.varchar('status').notNull(),
};

const productViewSchema = {
  viewId: KsqlSchema.varchar('view_id').key(),
  userId: KsqlSchema.varchar('user_id').notNull(),
  productId: KsqlSchema.varchar('product_id').notNull(),
  viewTime: KsqlSchema.timestamp('view_time').notNull(),
  duration: KsqlSchema.int('duration_seconds').nullable(),
  deviceType: KsqlSchema.varchar('device_type').notNull(),
};

const customerMetricsSchema = {
  userId: KsqlSchema.varchar('user_id').key(),
  totalOrders: KsqlSchema.bigint('total_orders').notNull(),
  totalSpent: KsqlSchema.decimal('total_spent').notNull(),
  avgOrderValue: KsqlSchema.decimal('avg_order_value').notNull(),
  lastOrderDate: KsqlSchema.timestamp('last_order_date').nullable(),
  favoriteCategory: KsqlSchema.varchar('favorite_category').nullable(),
};

async function advancedExample() {
  const ksqldb = new KsqlDB({
    host: 'localhost',
    port: 8088,
    username: 'admin',
    password: 'password',
    ssl: true,
  });

  // Define and register streams/tables
  const orderStream = defineStream('orders', orderSchema, {
    keyColumn: 'order_id',
    valueFormat: 'JSON',
    topic: 'ecommerce-orders',
    partitions: 6,
    timestamp: 'order_date',
  });

  const productViewStream = defineStream('product_views', productViewSchema, {
    keyColumn: 'view_id',
    valueFormat: 'JSON',
    topic: 'product-views',
  });

  const customerMetricsTable = defineTable('customer_metrics', customerMetricsSchema, {
    keyColumn: 'user_id',
    valueFormat: 'JSON',
    topic: 'customer-metrics',
  });

  const orders = ksqldb.registerStream(orderStream);
  const views = ksqldb.registerStream(productViewStream);
  const metrics = ksqldb.registerTable(customerMetricsTable);

  // Create materialized view for real-time analytics
  const createRealtimeMetricsQuery = `
    CREATE TABLE customer_metrics_realtime AS
    SELECT
      user_id,
      COUNT(*) as total_orders,
      SUM(total_amount) as total_spent,
      AVG(total_amount) as avg_order_value,
      MAX(order_date) as last_order_date
    FROM orders
    GROUP BY user_id
    EMIT CHANGES;
  `;

  await ksqldb.execute(createRealtimeMetricsQuery);

  // Insert sample order
  await orders.insert({
    order_id: 'ORD-2024-001',
    user_id: 'USER-123',
    order_date: new Date(),
    total_amount: 299.99,
    items: [
      { product_id: 'PROD-1', quantity: 2, price: 99.99 },
      { product_id: 'PROD-2', quantity: 1, price: 100.01 }
    ],
    shipping_address: {
      street: '123 Main St',
      city: 'San Francisco',
      state: 'CA',
      zip: '94105',
      country: 'USA'
    },
    status: 'pending'
  });

  // Complex join query
  const userActivityJoinQuery = await ksqldb.query(`
    SELECT
      o.user_id,
      o.order_id,
      o.total_amount,
      pv.product_id,
      pv.view_time
    FROM orders o
    INNER JOIN product_views pv
      WITHIN 1 HOUR
      ON o.user_id = pv.user_id
    WHERE o.status = 'completed'
    EMIT CHANGES
    LIMIT 100;
  `);

  // Window aggregation for trending products
  const trendingProductsQuery = `
    SELECT
      product_id,
      COUNT(*) as view_count,
      COUNT(DISTINCT user_id) as unique_viewers,
      AVG(duration_seconds) as avg_view_duration
    FROM product_views
    WINDOW TUMBLING (SIZE 1 HOUR)
    GROUP BY product_id
    HAVING COUNT(*) > 10
    EMIT CHANGES;
  `;

  const trendingUnsubscribe = await ksqldb.stream(
    trendingProductsQuery,
    (trending) => {
      console.log('Trending product:', trending);
    }
  );

  // Session window for user behavior analysis
  const userSessionQuery = `
    SELECT
      user_id,
      COUNT(*) as actions_in_session,
      MIN(view_time) as session_start,
      MAX(view_time) as session_end,
      COLLECT_LIST(product_id) as viewed_products
    FROM product_views
    WINDOW SESSION (20 MINUTES)
    GROUP BY user_id
    EMIT CHANGES;
  `;

  // Create derived stream with transformations
  const highValueOrdersQuery = `
    CREATE STREAM high_value_orders AS
    SELECT
      order_id,
      user_id,
      total_amount,
      CASE
        WHEN total_amount >= 1000 THEN 'platinum'
        WHEN total_amount >= 500 THEN 'gold'
        WHEN total_amount >= 100 THEN 'silver'
        ELSE 'bronze'
      END as order_tier,
      ARRAY_LENGTH(items) as item_count
    FROM orders
    WHERE total_amount >= 100
    EMIT CHANGES;
  `;

  await ksqldb.execute(highValueOrdersQuery);

  // Use the query builder for complex conditions
  const recentHighValueOrders = await orders
    .select('order_id', 'user_id', 'total_amount', 'status')
    .where(w => w
      .gte('total_amount', 500)
      .in('status', ['pending', 'processing', 'shipped'])
      .gte('order_date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
    )
    .orderBy('total_amount', 'DESC')
    .limit(20)
    .execute();

  console.log('Recent high-value orders:', recentHighValueOrders);

  // Batch insert for product views
  const productViews = [
    {
      view_id: 'VIEW-001',
      user_id: 'USER-123',
      product_id: 'PROD-1',
      view_time: new Date(),
      duration_seconds: 45,
      device_type: 'mobile'
    },
    {
      view_id: 'VIEW-002',
      user_id: 'USER-124',
      product_id: 'PROD-2',
      view_time: new Date(),
      duration_seconds: 120,
      device_type: 'desktop'
    }
  ];

  await views.insertMany(productViews);

  // Health check and monitoring
  const isHealthy = await ksqldb.getClient().healthCheck();
  console.log('KsqlDB health status:', isHealthy);

  const serverInfo = await ksqldb.getClient().getServerInfo();
  console.log('Server info:', serverInfo);
}

advancedExample().catch(console.error);