# Troubleshooting Guide

## Common Issues and Solutions

### Docker and Container Issues

#### Container Won't Start
**Problem**: Service fails to start or immediately exits
```
Error: container "s3gw-backend" exited with code 1
```

**Solutions**:
1. Check container logs:
```bash
docker-compose logs backend
docker-compose logs frontend
```

2. Verify port availability:
```bash
netstat -tulpn | grep :3000
netstat -tulpn | grep :3001
```

3. Check Docker resources:
```bash
docker system df
docker system prune  # Remove unused containers/images
```

4. Rebuild containers:
```bash
docker-compose down
docker-compose up --build
```

#### File Permission Issues
**Problem**: Cannot write configuration files
```
Error: EACCES: permission denied, open '/workspace/terraform/config.txt'
```

**Solutions**:
1. Check volume mount permissions
2. Ensure Docker has proper access to host directories
3. On Linux, check SELinux/AppArmor policies

#### Network Connectivity
**Problem**: Services cannot communicate
```
Error: connect ECONNREFUSED 127.0.0.1:3001
```

**Solutions**:
1. Verify services are on same Docker network
2. Check service names in docker-compose.yml
3. Restart Docker networking:
```bash
docker-compose down
docker network prune
docker-compose up
```

### AWS Related Issues

#### Authentication Failures
**Problem**: AWS credentials not recognized
```
Error: AWS credentials not configured
Error: Unable to locate credentials
```

**Solutions**:
1. Verify credentials in web interface
2. Check AWS credential format (no spaces, correct length)
3. Test credentials manually:
```bash
aws sts get-caller-identity --access-key YOUR_KEY --secret-key YOUR_SECRET
```

4. Clear AWS_PROFILE environment variable if empty:
```bash
unset AWS_PROFILE
```

#### Permission Denied
**Problem**: Insufficient AWS permissions
```
Error: User: arn:aws:iam::123456789012:user/testuser is not authorized to perform: ec2:RunInstances
```

**Required Permissions**:
- EC2: Full access (instances, security groups, key pairs)
- VPC: Full access (subnets, route tables, gateways)
- ELB: Full access (load balancers, target groups)
- Route53: Read/write access for DNS
- ACM: Certificate management
- IAM: Role and policy management (for instance profiles)

**Solutions**:
1. Attach AdministratorAccess policy (for testing)
2. Create custom policy with required permissions
3. Check policy boundaries and SCPs

#### Resource Limits
**Problem**: AWS service limits exceeded
```
Error: The maximum number of VPCs has been reached
Error: Your quota allows for 0 more running instance(s)
```

**Solutions**:
1. Check current usage:
```bash
aws ec2 describe-account-attributes
aws ec2 describe-vpc-quota
```

2. Request quota increases via AWS Support
3. Use different regions or instance types
4. Clean up unused resources

#### Region Issues
**Problem**: Resources not available in selected region
```
Error: AMI ami-12345 does not exist
Error: Instance type m5d.large not supported
```

**Solutions**:
1. Verify region supports required services
2. Use region-appropriate AMI IDs
3. Check instance type availability:
```bash
aws ec2 describe-instance-type-offerings --location-type region --region us-east-1
```

### Terraform Issues

#### State Lock Conflicts
**Problem**: Terraform state is locked
```
Error: Error acquiring the state lock
```

**Solutions**:
1. Wait for current operation to complete
2. Force unlock if process died:
```bash
cd terraform && terraform force-unlock LOCK_ID
```

3. Check for zombie processes:
```bash
docker-compose exec backend ps aux | grep terraform
```

#### State Corruption
**Problem**: Terraform state is corrupted
```
Error: state snapshot was created by Terraform v1.x, but this is v0.x
```

**Solutions**:
1. Restore from backup if available
2. Import existing resources:
```bash
terraform import aws_vpc.main vpc-12345
```

3. Recreate state from scratch (destroys resources)

#### Resource Conflicts
**Problem**: Resources already exist
```
Error: VPC vpc-12345 already exists
```

**Solutions**:
1. Import existing resources into state
2. Use different resource names/tags
3. Destroy conflicting resources manually
4. Use data sources instead of creating new resources

#### Plan/Apply Failures
**Problem**: Terraform operations fail
```
Error: timeout while waiting for resource to be created
```

**Solutions**:
1. Increase timeout values in Terraform configuration
2. Check AWS API status and health
3. Retry operation with exponential backoff
4. Review CloudTrail logs for API errors

### Packer Issues

#### AMI Build Failures
**Problem**: Packer build fails
```
Error: build 'amazon-ebs' errored: timeout waiting for SSH
```

**Solutions**:
1. Check source AMI availability:
```bash
aws ec2 describe-images --image-ids ami-12345
```

2. Verify instance type supports features:
```bash
aws ec2 describe-instance-types --instance-types m5d.large
```

3. Check security group allows SSH (port 22)
4. Increase timeout values in Packer configuration

#### Plugin Issues
**Problem**: Packer plugins missing
```
Error: Required plugin not found: github.com/hashicorp/amazon
```

**Solutions**:
1. Initialize Packer plugins:
```bash
packer init .
```

2. Check plugin configuration in .pkr.hcl files
3. Verify network connectivity for plugin downloads

#### Build Script Failures
**Problem**: Provisioning scripts fail during AMI build
```
Error: Script exited with non-zero exit status: 1
```

**Solutions**:
1. Check script syntax and permissions
2. Review CloudWatch logs from build instance
3. Test scripts manually on similar instance
4. Add debug output to scripts:
```bash
set -x  # Enable debug output
set -e  # Exit on any error
```

### Application Issues

#### Web Interface Not Loading
**Problem**: Frontend shows blank page or errors
```
Error: Failed to fetch
Connection refused
```

**Solutions**:
1. Check if backend service is running:
```bash
curl http://localhost:3001/api/health
```

2. Verify frontend build:
```bash
docker-compose logs frontend
```

3. Check browser console for JavaScript errors
4. Clear browser cache and cookies

#### Terminal Output Missing
**Problem**: Commands execute but no output visible
```
Status: Connected, but no terminal output
```

**Solutions**:
1. Check WebSocket connection:
```bash
# In browser console
console.log('WebSocket state:', socket.readyState)
```

2. Verify backend is processing commands:
```bash
docker-compose logs backend | grep "Executing command"
```

3. Check if command requires user input
4. Restart backend service:
```bash
docker-compose restart backend
```

#### Configuration Not Saving
**Problem**: Settings reset after page reload
```
Error: Failed to save configuration
```

**Solutions**:
1. Check file write permissions in container
2. Verify Docker volume mounts
3. Check disk space:
```bash
docker system df
```

4. Review backend logs for save errors

### Infrastructure Issues

#### Load Balancer Health Checks Failing
**Problem**: ALB shows unhealthy targets
```
Target health check failed
```

**Solutions**:
1. Check VersityGW service status on instances:
```bash
# Via SSM Session Manager
aws ssm start-session --target i-12345
sudo systemctl status s3-gw
```

2. Verify security group allows health check traffic
3. Check target group configuration
4. Review CloudWatch logs for service errors

#### Instance Launch Failures
**Problem**: Auto Scaling Group cannot launch instances
```
Error: Insufficient capacity
Error: Invalid AMI ID
```

**Solutions**:
1. Check instance limits and quotas
2. Verify AMI exists in target region
3. Try different instance types
4. Check subnet availability zones

#### DNS Resolution Issues
**Problem**: Custom domain not resolving
```
Error: NXDOMAIN
```

**Solutions**:
1. Verify Route53 records:
```bash
aws route53 list-resource-record-sets --hosted-zone-id Z123456
```

2. Check ACM certificate status
3. Verify domain ownership
4. Test with ALB DNS name directly

#### Storage Performance Issues
**Problem**: Slow S3 operations
```
Timeout errors on large uploads
```

**Solutions**:
1. Monitor CloudWatch metrics for storage performance
2. Check LucidLink cache utilization
3. Verify RAID configuration on instances
4. Consider larger instance types
5. Monitor network bandwidth utilization

### Monitoring and Debugging

#### Enable Debug Logging
Add debug flags to containers:
```yaml
# In docker-compose.yml
environment:
  - DEBUG=*
  - LOG_LEVEL=debug
```

#### Comprehensive Log Collection
```bash
# Collect all logs
mkdir troubleshooting-logs
docker-compose logs > troubleshooting-logs/docker-compose.log
docker logs s3gw-backend > troubleshooting-logs/backend.log
docker logs s3gw-frontend > troubleshooting-logs/frontend.log

# AWS logs (if deployed)
aws logs tail /aws/ec2/s3-gateway --follow
```

#### Health Check Script
Create a health check script:
```bash
#!/bin/bash
echo "=== Docker Compose Status ==="
docker-compose ps

echo "=== Container Logs (last 20 lines) ==="
docker-compose logs --tail=20

echo "=== Port Connectivity ==="
curl -s http://localhost:3001/api/health || echo "Backend API unreachable"
curl -s http://localhost:3000 || echo "Frontend unreachable"

echo "=== Docker Resources ==="
docker system df

echo "=== AWS Connectivity ==="
aws sts get-caller-identity 2>/dev/null || echo "AWS credentials not configured"
```

### Recovery Procedures

#### Complete Reset
If all else fails, perform complete reset:
```bash
# Stop all services
docker-compose down -v

# Remove all containers and volumes
docker system prune -a --volumes

# Remove any persisted state
rm -rf ./terraform/.terraform
rm -rf ./packer/manifest.json

# Start fresh
docker-compose up --build
```

#### Partial Recovery
For less drastic recovery:
```bash
# Restart specific service
docker-compose restart backend

# Rebuild specific service
docker-compose up --build backend

# Reset Terraform state
rm -f terraform/.terraform.lock.hcl
rm -rf terraform/.terraform
```

### Getting Help

#### Information to Collect
When seeking support, provide:
1. Operating system and Docker version
2. Complete error messages
3. Docker logs from affected services
4. AWS region and account ID (without credentials)
5. Steps to reproduce the issue

#### Log Sanitization
Before sharing logs, remove sensitive information:
- AWS credentials (access keys, secret keys)
- LucidLink passwords
- Domain names and IP addresses (if sensitive)
- Instance IDs and resource ARNs (if needed)

Use tools like `sed` to sanitize logs:
```bash
sed -e 's/AKIA[A-Z0-9]\{16\}/AWS_ACCESS_KEY_REDACTED/g' \
    -e 's/[A-Za-z0-9/+=]\{40\}/AWS_SECRET_KEY_REDACTED/g' \
    logfile.txt > sanitized_log.txt
```