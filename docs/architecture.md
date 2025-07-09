# Architecture Overview

## System Architecture

The S3 Gateway UI provides a complete infrastructure-as-code solution for deploying S3-compatible object storage services on AWS. The system combines modern web technologies with proven infrastructure automation tools.

## Application Stack

### Frontend Layer
- **Framework**: Next.js 14 with TypeScript
- **UI Library**: React 18 with Tailwind CSS
- **Component Library**: Radix UI primitives
- **Real-time Communication**: Socket.IO client
- **State Management**: React hooks and context

### Backend Layer
- **Runtime**: Node.js with Express
- **WebSocket Server**: Socket.IO
- **Process Management**: Child process spawning for shell commands
- **Security**: Helmet.js middleware, CORS configuration
- **File System**: Direct interaction with Terraform/Packer tools

### Infrastructure Layer
- **Container Orchestration**: Docker Compose
- **Reverse Proxy**: Nginx with SSL support
- **State Management**: Docker volumes for Terraform state persistence
- **Networking**: Bridge networking between services

## Infrastructure Components

### AWS Resources

#### Compute
- **Auto Scaling Group**: Manages EC2 instances with mixed instance types
- **Launch Template**: Defines instance configuration and user data
- **EC2 Instances**: Run VersityGW, LucidLink, and monitoring services
- **Instance Storage**: NVMe drives configured in RAID 0 for cache

#### Networking
- **VPC**: Isolated network environment with custom CIDR
- **Public Subnets**: Host Application Load Balancer
- **Private Subnets**: Host EC2 instances (3 availability zones)
- **Internet Gateway**: Provides internet access
- **Route Tables**: Control traffic routing
- **Security Groups**: Firewall rules for services

#### Load Balancing
- **Application Load Balancer**: SSL termination and health checks
- **Target Groups**: Route traffic to healthy instances
- **Health Checks**: Monitor VersityGW service availability
- **Minio Sidekick**: Internal load balancing across VersityGW instances

#### Storage
- **EBS Volumes**: Persistent storage for data
- **Instance Storage**: High-performance cache storage
- **EBS Encryption**: Default encryption for all volumes

#### DNS and Certificates
- **Route53**: DNS management and health checks
- **ACM Certificates**: SSL/TLS certificates for HTTPS
- **Domain Validation**: Automated certificate management

#### Monitoring and Logging
- **CloudWatch Agent**: System and application metrics
- **CloudWatch Logs**: Centralized log aggregation
- **Custom Metrics**: VersityGW and LucidLink specific metrics
- **Alarms**: Automated alerting for critical issues

### Service Architecture

#### VersityGW S3 Gateway
- **Instances**: 3 VersityGW processes per EC2 instance
- **Ports**: Each instance runs on ports 7070, 7071, 7072
- **Load Balancing**: Minio Sidekick distributes requests
- **Storage Backend**: LucidLink mounted file systems
- **API Compatibility**: Full S3 API support

#### LucidLink File System
- **Mount Points**: Multiple file space mounts per instance
- **Authentication**: Systemd credential encryption
- **Caching**: Local NVMe storage for performance
- **Versions**: Support for LucidLink v2 and v3

#### Monitoring Stack
- **CloudWatch Agent**: Collects system metrics
- **Log Aggregation**: Application and system logs
- **Health Checks**: ALB and custom health endpoints
- **Performance Metrics**: Latency, throughput, error rates

## Data Flow

### Request Processing
1. **Client Request**: S3 API request to ALB
2. **Load Balancing**: ALB routes to healthy instances
3. **Internal Routing**: Minio Sidekick selects VersityGW instance
4. **File System Access**: VersityGW reads/writes via LucidLink
5. **Response**: Data returned through the reverse path

### Configuration Management
1. **UI Input**: User configures settings in web interface
2. **Validation**: Frontend validates required fields
3. **Backend Processing**: Configuration written to files
4. **Environment Setup**: Scripts source configuration
5. **Infrastructure Deployment**: Terraform applies changes

### AMI Build Process
1. **Base Image**: Ubuntu minimal AMI
2. **Provisioning**: Packer runs build scripts
3. **Software Installation**: LucidLink, VersityGW, monitoring
4. **Configuration**: Systemd services and scripts
5. **Image Creation**: Custom AMI with all components

## Security Model

### Network Security
- **Private Subnets**: Instances not directly accessible
- **Security Groups**: Restrictive firewall rules
- **SSL/TLS**: Encrypted communication (ALB termination)
- **VPC Isolation**: Network segmentation

### Access Control
- **IAM Roles**: Instance profiles with minimal permissions
- **SSM Session Manager**: Secure shell access
- **No SSH Keys**: Eliminated key management overhead
- **Credential Encryption**: Systemd credential protection

### Data Protection
- **EBS Encryption**: All volumes encrypted at rest
- **In-Transit Encryption**: SSL/TLS for all communications
- **Credential Management**: Secure handling of sensitive data
- **Log Sanitization**: No credentials in application logs

## Scalability and Performance

### Horizontal Scaling
- **Auto Scaling**: Automatic instance scaling based on metrics
- **Load Distribution**: Multiple VersityGW instances per node
- **Multi-AZ**: Resources distributed across availability zones
- **Elastic Load Balancing**: Dynamic traffic distribution

### Performance Optimization
- **Instance Storage**: High-performance NVMe drives
- **RAID Configuration**: RAID 0 for maximum throughput
- **Connection Pooling**: Efficient resource utilization
- **Caching Strategy**: LucidLink local cache optimization

### Monitoring and Observability
- **Real-time Metrics**: CloudWatch integration
- **Performance Dashboards**: Visual monitoring interfaces
- **Alerting**: Automated notification systems
- **Log Analysis**: Centralized log processing

## Deployment Patterns

### Blue-Green Deployment
- **AMI Versioning**: Multiple AMI versions maintained
- **Rolling Updates**: Gradual instance replacement
- **Health Validation**: Automated health checking
- **Rollback Capability**: Quick reversion to previous version

### Infrastructure as Code
- **Terraform State**: Centralized state management
- **Version Control**: All configurations tracked
- **Reproducible Builds**: Consistent deployments
- **Environment Parity**: Identical infrastructure across environments