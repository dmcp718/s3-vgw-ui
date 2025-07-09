# Deployment Guide

## Prerequisites

### Software Requirements
- Docker (version 20.10 or later)
- Docker Compose (version 2.0 or later)
- Git

### AWS Requirements
- AWS Account with sufficient permissions
- AWS credentials (Access Key ID and Secret Access Key)
- Appropriate service limits and quotas

### LucidLink Requirements
- LucidLink account and file space
- User credentials with appropriate permissions
- File space configured and accessible

## Installation

### 1. Clone Repository
```bash
git clone <repository-url>
cd s3-gateway-ui
```

### 2. Environment Setup
Create a `.env` file (optional) for default AWS settings:
```bash
AWS_REGION=us-east-1
AWS_PROFILE=default
```

### 3. Start Services
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Check service status
docker-compose ps
```

### 4. Access Web Interface
- Main interface: http://localhost:3000
- API endpoint: http://localhost:3001
- Nginx proxy: http://localhost (if configured)

## Configuration

### AWS Credentials
Enter your AWS credentials in the web interface:
- **AWS Access Key ID**: Your AWS access key
- **AWS Secret Access Key**: Your AWS secret key
- **AWS Region**: Target deployment region

### LucidLink Settings
Configure your LucidLink file space:
- **Filespace Name**: Your LucidLink file space
- **User Email**: LucidLink account email
- **Password**: LucidLink account password
- **Root Point**: File system root path (usually "/")
- **FS Version**: LucidLink version ("2" or "3")

### Infrastructure Settings
Set deployment parameters:
- **EC2 Instance Type**: Must have instance storage (e.g., m5d.large)
- **Auto Scaling Group**: Min/max/desired instance counts
- **Domain Settings**: Your domain for S3 virtual-hosted requests

### S3 API Configuration
Configure S3 API access:
- **Root Access Key**: S3 API admin access key
- **Root Secret Key**: S3 API admin secret key
- **Virtual Domain**: Domain for virtual-hosted-style requests
- **FQDN**: Fully qualified domain name

## Deployment Operations

### Validate Configuration
1. Click **Validate** button in the web interface
2. Review output for configuration errors
3. Fix any validation issues before proceeding

### Plan Infrastructure Changes
1. Click **Plan Changes** to preview deployment
2. Review the planned changes carefully
3. Ensure resources and costs are acceptable

### Deploy Infrastructure
1. Click **Apply Changes** to deploy
2. Monitor progress in the terminal output
3. Deployment typically takes 10-15 minutes
4. Note the ALB DNS name from output

### Build Custom AMI (Optional)
1. Click **Build AMI** to create custom image
2. AMI build takes 15-20 minutes
3. New AMI will be used for subsequent deployments
4. AMI includes VersityGW, LucidLink, and monitoring

### Destroy Infrastructure
1. Click **Destroy** to remove all resources
2. Confirm destruction in the terminal
3. All AWS resources will be deleted
4. Billing will stop for destroyed resources

## Post-Deployment

### Verify S3 Access
Test S3 API functionality:
```bash
# Using AWS CLI with your root credentials
aws s3 ls --endpoint-url=https://your-alb-dns-name
aws s3 mb s3://test-bucket --endpoint-url=https://your-alb-dns-name
aws s3 cp localfile s3://test-bucket/ --endpoint-url=https://your-alb-dns-name
```

### Monitor Services
- Check CloudWatch metrics for system health
- Review ALB target group health
- Monitor VersityGW and LucidLink service status

### DNS Configuration
If using custom domains:
1. Create CNAME record pointing to ALB DNS name
2. Update ACM certificate for your domain
3. Configure Route53 health checks

## Advanced Deployment Options

### Custom AMI Usage
To use a specific AMI:
1. Note the AMI ID from a previous build
2. Modify `variables.auto.pkrvars.hcl` to use custom AMI
3. Deploy with the updated configuration

### Multi-Region Deployment
For multiple regions:
1. Configure separate variable files per region
2. Update AWS region in the web interface
3. Deploy to each region separately

### Spot Instance Configuration
To use spot instances:
1. Configure spot instance settings in Terraform variables
2. Set appropriate spot price limits
3. Monitor for spot instance interruptions

### Custom Instance Types
Select instance types based on requirements:
- **Storage**: Must have instance storage (d, i, r, x series)
- **Performance**: Larger instances for higher throughput
- **Cost**: Smaller instances for development/testing

## Backup and Recovery

### Terraform State
- State is persisted in Docker volumes
- Backup state regularly for production
- Consider remote state storage (S3 backend)

### Configuration Backup
- Export configuration from web interface
- Store variable files in version control
- Document custom settings and modifications

### Infrastructure Recovery
To recover from failures:
1. Restore Terraform state if corrupted
2. Re-apply configuration from last known good state
3. Verify all services are functioning
4. Update DNS if necessary

## Troubleshooting

### Common Deployment Issues

#### AWS Permissions
```
Error: insufficient permissions
```
- Ensure AWS credentials have required permissions
- Check IAM policy for EC2, VPC, ELB, Route53 access
- Verify region-specific permissions

#### Resource Limits
```
Error: instance limit exceeded
```
- Check AWS service quotas
- Request limit increases if necessary
- Use different instance types or regions

#### AMI Build Failures
```
Error: build failed
```
- Check source AMI availability
- Verify instance type supports required features
- Review Packer logs for specific errors

#### Network Connectivity
```
Error: timeout connecting
```
- Verify internet gateway and routing
- Check security group configurations
- Ensure subnets have proper CIDR blocks

### Log Analysis
Review logs for issues:
```bash
# Container logs
docker-compose logs backend
docker-compose logs frontend

# Follow real-time logs
docker-compose logs -f

# AWS CloudWatch logs (post-deployment)
aws logs describe-log-groups
aws logs tail /aws/ec2/s3-gateway
```

### Recovery Procedures

#### Corrupted State
1. Stop services: `docker-compose down`
2. Restore state from backup
3. Restart services: `docker-compose up -d`
4. Verify configuration and re-apply

#### Failed Deployment
1. Review error messages in terminal output
2. Check AWS console for partially created resources
3. Run destroy to clean up failed resources
4. Fix configuration issues and retry

#### Service Failures
1. Check container status: `docker-compose ps`
2. Restart failed services: `docker-compose restart <service>`
3. Rebuild if necessary: `docker-compose up --build`
4. Review application logs for errors

## Performance Tuning

### Instance Optimization
- Monitor CloudWatch metrics for CPU/memory usage
- Scale Auto Scaling Group based on demand
- Optimize instance types for workload patterns

### Storage Performance
- Configure RAID settings for optimal throughput
- Monitor disk utilization and I/O patterns
- Adjust cache settings for LucidLink

### Network Optimization
- Use placement groups for network performance
- Configure enhanced networking features
- Monitor network utilization and latency

## Security Hardening

### Access Control
- Use IAM roles instead of access keys when possible
- Implement least privilege principles
- Regular credential rotation

### Network Security
- Restrict security group rules
- Use VPC flow logs for monitoring
- Implement WAF rules if needed

### Monitoring
- Enable CloudTrail for API auditing
- Set up CloudWatch alarms for security events
- Monitor access patterns and anomalies