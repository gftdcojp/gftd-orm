.PHONY: help start stop restart logs test demo clean status build

# Default target
help:
	@echo "🚀 GFTD-ORM Development Commands"
	@echo ""
	@echo "Docker & Services:"
	@echo "  start     - Start Confluent services (ksqlDB, Schema Registry, Kafka, etc.)"
	@echo "  stop      - Stop all Confluent services"
	@echo "  restart   - Restart all services"
	@echo "  logs      - Show logs for all services"
	@echo "  status    - Show status of all services"
	@echo ""
	@echo "Development:"
	@echo "  build     - Build TypeScript project"
	@echo "  dev       - Start development mode (watch)"
	@echo "  test      - Run test suite"
	@echo "  demo      - Run mock demo"
	@echo "  demo-real - Run real demo with Confluent services"
	@echo "  demo-gftd - Run GFTD unified demo"
	@echo "  demo-mv   - Run Materialized View demo"
	@echo "  simple    - Run simple Confluent connectivity test"
	@echo "  websocket - Run WebSocket/Streaming functionality test"
	@echo ""
	@echo "Cleanup:"
	@echo "  clean     - Stop services and remove volumes"
	@echo "  clean-all - Clean everything (including Docker images)"
	@echo ""
	@echo "Monitoring:"
	@echo "  ui        - Open Confluent Control Center (http://localhost:9021)"
	@echo "  ksql      - Open ksqlDB CLI"
	@echo "  minio     - Open MinIO Console (http://localhost:9001)"

# Docker & Services
start:
	@echo "🚀 Starting Confluent services..."
	docker compose up -d
	@echo "⏳ Waiting for services to be ready..."
	@sleep 10
	@echo "✅ Services started!"
	@echo ""
	@echo "📊 Service URLs:"
	@echo "  • ksqlDB Server:      http://localhost:8088"
	@echo "  • Schema Registry:    http://localhost:8081"
	@echo "  • Kafka:              localhost:9092"
	@echo "  • Control Center:     http://localhost:9021"
	@echo "  • MinIO Console:      http://localhost:9001"
	@echo ""

stop:
	@echo "🛑 Stopping Confluent services..."
	docker compose down

restart: stop start

logs:
	@echo "📋 Showing logs for all services..."
	docker compose logs -f

status:
	@echo "📊 Service Status:"
	@docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E "(ksqldb|kafka|schema|zookeeper|minio|control|connect)" || echo "No Confluent services running"

# Development
build:
	@echo "🔨 Building TypeScript project..."
	pnpm build

dev:
	@echo "👀 Starting development mode..."
	pnpm dev

test:
	@echo "🧪 Running test suite..."
	pnpm test

demo:
	@echo "🎭 Running mock demo..."
	pnpm demo

demo-real:
	@echo "🎯 Running real demo with Confluent services..."
	@export GFTD_JWT_SECRET="gftd-orm-super-secret-jwt-key-minimum-32-characters-long-for-security-testing" && \
	export GFTD_DB_URL="http://localhost:8088" && \
	export GFTD_SCHEMA_REGISTRY_URL="http://localhost:8081" && \
	export GFTD_SCHEMA_REGISTRY_AUTH_USER="admin" && \
	export GFTD_SCHEMA_REGISTRY_AUTH_PASSWORD="admin" && \
	pnpm demo:real

demo-gftd:
	@echo "🌟 Running GFTD unified demo..."
	@export GFTD_JWT_SECRET="gftd-orm-super-secret-jwt-key-minimum-32-characters-long-for-security-testing" && \
	export GFTD_DB_URL="http://localhost:8088" && \
	export GFTD_SCHEMA_REGISTRY_URL="http://localhost:8081" && \
	export GFTD_SCHEMA_REGISTRY_AUTH_USER="admin" && \
	export GFTD_SCHEMA_REGISTRY_AUTH_PASSWORD="admin" && \
	pnpm demo:gftd

demo-mv:
	@echo "📈 Running Materialized View demo..."
	@export GFTD_JWT_SECRET="gftd-orm-super-secret-jwt-key-minimum-32-characters-long-for-security-testing" && \
	export GFTD_DB_URL="http://localhost:8088" && \
	export GFTD_SCHEMA_REGISTRY_URL="http://localhost:8081" && \
	export GFTD_SCHEMA_REGISTRY_AUTH_USER="admin" && \
	export GFTD_SCHEMA_REGISTRY_AUTH_PASSWORD="admin" && \
	pnpm demo:mv

simple:
	@echo "🧪 Running simple Confluent connectivity test..."
	@export GFTD_JWT_SECRET="gftd-orm-super-secret-jwt-key-minimum-32-characters-long-for-security-testing" && \
	pnpm exec ts-node examples/simple-confluent-test.ts

websocket:
	@echo "🔄 Running WebSocket/Streaming test..."
	@export GFTD_JWT_SECRET="gftd-orm-super-secret-jwt-key-minimum-32-characters-long-for-security-testing" && \
	pnpm exec ts-node examples/websocket-test.ts

# Cleanup
clean:
	@echo "🧹 Cleaning up services and volumes..."
	docker compose down -v
	@echo "✅ Cleanup completed"

clean-all: clean
	@echo "🗑️  Removing Docker images..."
	docker compose down --rmi all
	@echo "✅ Full cleanup completed"

# Monitoring
ui:
	@echo "🌐 Opening Confluent Control Center..."
	@open http://localhost:9021 || echo "Please open http://localhost:9021 in your browser"

ksql:
	@echo "💻 Starting ksqlDB CLI..."
	docker exec -it ksqldb-cli ksql http://ksqldb-server:8088

minio:
	@echo "🗄️  Opening MinIO Console..."
	@open http://localhost:9001 || echo "Please open http://localhost:9001 in your browser (admin/admin)"

# Full workflow
all: start simple demo-gftd

# Health checks
health:
	@echo "🏥 Checking service health..."
	@echo "ksqlDB Server:"
	@curl -s http://localhost:8088/info | jq .KsqlServerInfo.serverStatus || echo "  ❌ Not available"
	@echo ""
	@echo "Schema Registry:"
	@curl -s http://localhost:8081/subjects || echo "  ❌ Not available"
	@echo ""
	@echo "MinIO:"
	@curl -s http://localhost:9000/minio/health/live && echo "  ✅ Available" || echo "  ❌ Not available" 