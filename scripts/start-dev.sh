#!/bin/bash

# Start S3 Gateway UI (LOCAL DEVELOPMENT ONLY)
# 
# ⚠️  IMPORTANT: This starts only the frontend, backend, and nginx locally.
# 
# Production monitoring runs automatically on AWS EC2 instances
# alongside VersityGW when METRICS_ENABLED=true in the deployment UI.
# 
# There is no local monitoring stack - all metrics are on AWS.

set -e

echo "🔧 Starting S3 Gateway UI for local development..."
echo ""
echo "📌 Note: Monitoring stack runs on AWS EC2 instances only."
echo "   This script starts the development UI for configuration."
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "Error: Docker is not running. Please start Docker and try again."
    exit 1
fi

# Create network if it doesn't exist
if ! docker network ls | grep -q s3gw-network; then
    echo "Creating s3gw-network..."
    docker network create s3gw-network
fi

# Start main application services
echo "Starting S3 Gateway UI services..."
docker-compose up -d

# Wait for services to be ready
echo "Waiting for services to start..."
sleep 5

# Check service health
echo "Checking service status..."
docker-compose ps

echo ""
echo "🚀 S3 Gateway UI is now running!"
echo ""
echo "Local Development Access:"
echo "  - Frontend:         http://localhost:3000"
echo "  - Backend:          http://localhost:3001"
echo "  - Nginx:            http://localhost"
echo ""
echo "Production Access (when deployed to AWS):"
echo "  - S3 Gateway:       https://s3.your-domain.com"
echo "  - Grafana Dashboard: https://s3-metrics.your-domain.com (if metrics enabled)"
echo ""
echo "To stop all services, run:"
echo "  ./scripts/stop-dev.sh"
echo ""