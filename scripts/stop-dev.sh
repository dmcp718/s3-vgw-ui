#!/bin/bash

# Stop S3 Gateway UI (LOCAL DEVELOPMENT ONLY)

set -e

echo "🛑 Stopping S3 Gateway UI..."

# Stop main application services
echo "Stopping S3 Gateway UI services..."
docker-compose down

echo ""
echo "🛑 All LOCAL services stopped successfully!"
echo ""
echo "Note: Production monitoring on AWS EC2 instances is unaffected."
echo ""
echo "To start local development stack again, run:"
echo "  ./scripts/start-dev.sh"
echo ""