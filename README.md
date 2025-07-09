# S3 Gateway UI

A modern web interface for deploying and managing AWS S3 Gateway infrastructure using VersityGW and LucidLink. This tool provides a user-friendly interface for deploying S3-compatible object storage backed by LucidLink file spaces.

## Features

- **Interactive Web Interface**: Modern React-based UI for infrastructure management
- **Real-time Terminal Output**: Live command execution feedback
- **AWS Credentials Management**: Secure handling of AWS credentials with visibility toggles
- **Infrastructure as Code**: Complete Terraform and Packer automation
- **Docker Containerized**: Self-contained deployment with all required tools
- **Load Balanced**: Built-in nginx reverse proxy with SSL support

## Architecture

The S3 Gateway UI deploys a highly available S3-compatible gateway service with:

### Core Components
- **VersityGW**: S3-compatible API gateway (3 instances on port 7070)
- **LucidLink Daemon**: File system mount and storage backend
- **Minio Sidekick**: Load balancer across VersityGW instances

### Infrastructure Stack
- **Auto Scaling Group**: Mixed instance types with spot/on-demand support
- **Application Load Balancer**: SSL termination and health checks
- **Storage**: NVMe instance storage (RAID 0) + EBS volumes
- **Networking**: VPC with public/private subnets across 3 AZs
- **DNS**: Route53 integration with ACM certificates

## Quick Start

### Prerequisites

- Docker and Docker Compose
- AWS Account with appropriate permissions
- LucidLink file space credentials

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd s3-gateway-ui
```

2. Start the application:
```bash
docker-compose up -d
```

3. Access the web interface:
   - Open http://localhost:3000 in your browser
   - Or http://localhost (if using nginx proxy)

### Configuration

1. **AWS Credentials**: Enter your AWS access keys in the web interface
2. **LucidLink Settings**: Configure your file space details
3. **Infrastructure Options**: Set EC2 instance types and scaling parameters
4. **S3 API Settings**: Configure root access credentials and domain settings

### Deployment Operations

The web interface provides buttons for all deployment operations:

- **Validate**: Check Terraform configuration
- **Plan**: Preview infrastructure changes
- **Apply**: Deploy infrastructure
- **Destroy**: Remove all resources
- **Build AMI**: Create custom AMI with VersityGW and LucidLink

## Configuration Variables

Over 50 configurable variables are available. Key variables include:

### AWS Settings
- `AWS_REGION`: Target AWS region
- `EC2_TYPE`: Instance type (must have instance storage)
- `ASG_MIN_SIZE/MAX_SIZE/DESIRED_CAPACITY`: Auto Scaling Group settings

### LucidLink Settings
- `FILESPACE1`: LucidLink file space name
- `FSUSER1`: LucidLink user email
- `LLPASSWD1`: LucidLink user password
- `FSVERSION`: LucidLink version ("2" or "3")

### S3 API Settings
- `ROOT_ACCESS_KEY/ROOT_SECRET_KEY`: S3 API root credentials
- `VGW_VIRTUAL_DOMAIN`: Domain for virtual-hosted-style requests
- `FQDOMAIN`: Base domain for the service

See [VARIABLES.md](docs/VARIABLES.md) for complete documentation.

## Docker Services

The application consists of three Docker services:

### Frontend (Port 3000)
- Next.js 14 with TypeScript
- React-based user interface
- Real-time WebSocket communication
- Tailwind CSS styling

### Backend (Port 3001)
- Node.js WebSocket server
- Command execution engine
- AWS credentials management
- Configuration file generation

### Nginx (Ports 80/443)
- Reverse proxy and load balancer
- SSL termination
- Static file serving

## Development

### Project Structure
```
s3-gateway-ui/
├── frontend/           # React frontend application
├── backend/            # Node.js backend service
├── nginx/              # Nginx configuration
├── terraform/          # Infrastructure as code
├── packer/             # AMI build configuration
├── scripts/            # Deployment scripts
├── docs/               # Documentation
└── examples/           # Example configurations
```

### Local Development

1. Start services in development mode:
```bash
# Frontend development server
cd frontend && npm run dev

# Backend development server
cd backend && npm run dev
```

2. Or use Docker Compose for full stack:
```bash
docker-compose up --build
```

## Security

- AWS credentials are handled securely and not logged
- Password fields include visibility toggles
- EBS volumes encrypted by default
- SSM Session Manager for secure instance access
- Systemd credential encryption for sensitive data

## Monitoring

The infrastructure includes comprehensive monitoring:

- CloudWatch agent for system metrics
- Application Load Balancer health checks
- Auto Scaling Group monitoring
- Custom metrics for VersityGW and LucidLink services
- **Public Grafana Dashboard**: Available at `https://s3-metrics.your-domain.com`
- **Prometheus Metrics**: Real-time S3 gateway performance metrics
- **StatsD Integration**: VersityGW metrics collection and visualization

## Troubleshooting

### Common Issues

1. **AWS Credentials Not Working**
   - Ensure credentials have required permissions
   - Check AWS region is correctly set
   - Verify AWS CLI configuration

2. **AMI Build Failures**
   - Check Packer logs in the terminal output
   - Verify source AMI availability in target region
   - Ensure instance types support required features

3. **Deployment Stuck**
   - Check if commands require input confirmation
   - Review Terraform state for conflicts
   - Verify all prerequisites are met

### Logs and Debugging

- Container logs: `docker-compose logs -f [service-name]`
- Application logs available in real-time via the web interface
- AWS CloudWatch Logs for deployed infrastructure

## Support

For issues and feature requests:
1. Check the troubleshooting section above
2. Review the documentation in the `docs/` directory
3. Submit an issue on the project repository

## License

This project is licensed under the MIT License - see the LICENSE file for details.