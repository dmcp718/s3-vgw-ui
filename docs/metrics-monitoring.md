# Metrics and Monitoring

This document describes the metrics collection and monitoring capabilities added to the S3 VersityGW UI project.

## Overview

The monitoring stack provides comprehensive metrics collection for VersityGW S3 Gateway performance, including:

- **Request rates** (success/failure)
- **Data throughput** (bytes read/written)
- **Object operations** (create/delete counts)
- **Error rates** by API action
- **Response time metrics**

## Architecture

### Production Architecture (AWS EC2) - Single Instance

```
┌─────────────────── Single EC2 Instance in AWS VPC ───────────────────┐
│                                                                       │
│  VersityGW-1 ──┐                                                     │
│  VersityGW-2 ──┼─→ 127.0.0.1:8125 ─→ StatsD ─→ Prometheus           │
│  VersityGW-3 ──┘                      Exporter    ↓                 │
│                                                   Grafana            │
│                                                     ↓                │
└─────────────────────────────────────────────────────────────────────┘
                                                      ↓
                              Route53: s3-metrics.domain.com
                                       ↓
                                  Public Internet
```

**⚠️ Important: Single Instance Limitation**

When metrics are enabled, the Auto Scaling Group is automatically limited to **1 instance** because:
- Each instance runs its own Grafana dashboard
- Route53 can only point to one Grafana endpoint
- Multiple instances would create isolated metrics (no aggregation)

**Scaling Options:**
- **Metrics Disabled**: Full horizontal scaling (1-N instances)
- **Metrics Enabled**: Vertical scaling only (1 larger instance)
- **Future**: Centralized monitoring for horizontal scaling with metrics

### Components

1. **VersityGW (3 instances)**: Export metrics to localhost StatsD (127.0.0.1:8125)
2. **StatsD Exporter**: Runs on same EC2 instance, converts metrics to Prometheus format
3. **Prometheus**: Time-series database for metrics storage (same EC2 instance)
4. **Grafana**: Visualization dashboard (same EC2 instance, publicly accessible)

### Key Architecture Points

- **Single EC2 instance design** when metrics are enabled
- **All monitoring components run on the SAME EC2 instance as VersityGW**
- **VersityGW sends metrics to localhost** (127.0.0.1:8125)
- **Route53 routes public traffic** to Grafana on the single EC2 instance
- **Load balancer terminates SSL** and forwards to Grafana (port 3003)
- **Auto Scaling Group limited to 1 instance** when `METRICS_ENABLED=true`

## Configuration

### Enable Metrics in UI

1. Navigate to the **Monitoring and Metrics** section in the deployment form
2. Set **Enable Metrics Collection** to **Enabled**
3. Configure **Grafana Password** (required for dashboard access)
4. Optional: Adjust **StatsD Server** address (default: 127.0.0.1:8125)
5. Optional: Set **Prometheus Retention** period (default: 15 days)

### Infrastructure Impact

When metrics are **Enabled**:
- **⚠️ Auto Scaling Group limited to 1 instance maximum**
- Creates Grafana target group and load balancer listener rule
- Provisions SSL certificate for `s3-metrics.domain.com`
- Creates Route53 DNS record for public access
- Opens security group port 3003 for Grafana access
- Deploys full monitoring stack on the single EC2 instance

When metrics are **Disabled**:
- **Auto Scaling Group can scale horizontally** (1-N instances)
- No additional infrastructure is created
- VersityGW runs without metrics collection
- No public monitoring endpoints
- Reduced AWS costs and complexity

### Available Metrics

VersityGW exports the following metrics with tags:

#### Core Metrics
- `versitygw_success_requests_total` - Successful requests
- `versitygw_failed_requests_total` - Failed requests
- `versitygw_bytes_read_total` - Data read (GetObject)
- `versitygw_bytes_written_total` - Data written (PutObject/PutPart)
- `versitygw_objects_created_total` - Objects created
- `versitygw_objects_removed_total` - Objects removed

#### Metric Labels
- `service`: Instance hostname
- `action`: API action (PutObject, GetObject, etc.)
- `method`: HTTP method (GET, PUT, DELETE, etc.)
- `api`: Protocol type (s3)

## Deployment

### Production Deployment (AWS EC2)

**Monitoring runs automatically on EC2 instances when metrics are enabled:**

1. **UI Configuration**: Set "Enable Metrics Collection" to "Enabled" in deployment form
2. **Terraform Deployment**: Deploy infrastructure with `METRICS_ENABLED=true`
3. **EC2 Services**: Monitoring stack starts automatically with VersityGW containers
4. **Public Access**: Grafana available at `https://s3-metrics.your-domain.com`

### Local Development

**For local development of the deployment UI:**

```bash
# Start S3 Gateway UI for local development
docker-compose up -d

# Stop S3 Gateway UI
docker-compose down

# View logs
docker-compose logs -f
```

**⚠️ Note:** Local development only runs the deployment UI (frontend/backend/nginx). All monitoring runs on AWS EC2 instances.

### Conditional Infrastructure Deployment

The monitoring infrastructure is deployed conditionally based on the `METRICS_ENABLED` setting:

```hcl
# Terraform variable
variable "metrics_enabled" {
  description = "Enable metrics collection and Grafana dashboard"
  type        = bool
  default     = true
}
```

**AWS Resources created only when metrics are enabled:**
- `aws_lb_target_group.grafana` - Target group for Grafana
- `aws_lb_listener_rule.grafana` - Load balancer routing rule
- `aws_route53_record.s3_metrics` - DNS record for s3-metrics subdomain
- `aws_security_group_rule.grafana_ingress` - Security group rule for port 3003
- SSL certificate includes `s3-metrics.domain.com` in Subject Alternative Names

**EC2 Services included when metrics are enabled:**
- StatsD Exporter, Prometheus, and Grafana containers conditionally added to `packer/files/compose.yaml`

## Access Points

After deployment, the monitoring services are available at:

### Local Development
- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3003 (username: admin, password: as configured)
- **StatsD Exporter**: http://localhost:9102/metrics

### Production Infrastructure
- **Grafana**: https://s3-metrics.your-domain.com (public endpoint with SSL)
- **Prometheus**: http://your-domain:9090 (internal access only)
- **StatsD Exporter**: http://your-domain:9102/metrics (internal access only)

### Public Grafana Dashboard
The Grafana dashboard is publicly accessible at the `s3-metrics` subdomain:
- **URL**: https://s3-metrics.your-domain.com
- **SSL**: Automatically provisioned via ACM
- **Authentication**: Admin credentials as configured in deployment

## Grafana Dashboard

### Pre-built Dashboard

The S3 Gateway dashboard includes:

1. **Request Rate** - Success and error rates over time
2. **Data Throughput** - Read/write bandwidth metrics
3. **Object Operations** - Create/delete operation rates
4. **Error Rate by Action** - Errors broken down by API action
5. **Request Distribution** - Pie chart of request types
6. **Response Time Percentiles** - 50th, 95th, 99th percentile latency

### Dashboard Access

**Local Development:**
1. Navigate to http://localhost:3003
2. Login with admin credentials
3. Go to **Dashboards** → **Browse**
4. Select **S3 Gateway** folder
5. Open **S3 Gateway Metrics** dashboard

**Production:**
1. Navigate to https://s3-metrics.your-domain.com
2. Login with admin credentials (configured in deployment)
3. Access the pre-provisioned S3 Gateway Metrics dashboard

### Custom Dashboards

Create custom dashboards using these example queries:

```promql
# Request rate by action
sum(rate(versitygw_success_requests_total[5m])) by (action)

# Error rate percentage
sum(rate(versitygw_failed_requests_total[5m])) / 
sum(rate(versitygw_success_requests_total[5m]) + rate(versitygw_failed_requests_total[5m])) * 100

# Average throughput
rate(versitygw_bytes_read_total[5m]) + rate(versitygw_bytes_written_total[5m])

# Top error-prone actions
topk(10, sum(rate(versitygw_failed_requests_total[5m])) by (action))
```

## Troubleshooting

### Common Issues

1. **No metrics in Grafana**
   - Check if VersityGW is configured with `--metrics-statsd-servers`
   - Verify StatsD exporter is receiving data: `curl http://localhost:9102/metrics`
   - Check Prometheus targets: Go to Prometheus → Status → Targets

2. **Grafana login issues**
   - Ensure `GRAFANA_PASSWORD` is set in configuration
   - Check Grafana container logs: `docker-compose -f docker-compose.metrics.yml logs grafana`

3. **Missing StatsD metrics**
   - Verify StatsD mapping configuration in `monitoring/statsd-mapping.yml`
   - Check if VersityGW is sending metrics to the correct port (8125)

### Monitoring Logs

```bash
# View all monitoring service logs
docker-compose -f docker-compose.metrics.yml logs -f

# View specific service logs
docker-compose -f docker-compose.metrics.yml logs -f prometheus
docker-compose -f docker-compose.metrics.yml logs -f grafana
docker-compose -f docker-compose.metrics.yml logs -f statsd-exporter
```

### Port Conflicts

If ports 9090, 9102, or 3003 are already in use:

1. Edit `docker-compose.metrics.yml`
2. Change the port mappings (e.g., `"3004:3000"` for Grafana)
3. Update the documentation and scripts accordingly

## Security Considerations

- **Grafana Password**: Use a strong password for the admin account
- **Public Access**: The s3-metrics subdomain is publicly accessible with HTTPS
- **SSL/TLS**: Automatically configured via AWS Certificate Manager
- **Authentication**: Consider enabling additional authentication providers in Grafana for production use
- **Firewall Rules**: Only Grafana (3003) is exposed publicly; Prometheus and StatsD are internal only
- **Network Segmentation**: Monitoring services run on private subnets with load balancer access

## Performance Impact

The monitoring stack has minimal performance impact:

- **CPU**: ~1-2% additional CPU usage
- **Memory**: ~200MB additional memory usage
- **Disk**: Depends on retention settings (default: 15 days)
- **Network**: Negligible StatsD UDP traffic

## Maintenance

### Data Retention

- **Prometheus**: Configurable via `PROMETHEUS_RETENTION` variable
- **Grafana**: Dashboards and settings persist in Docker volumes

### Backup

Important data to backup:
- Grafana dashboards and settings: `grafana-data` volume
- Prometheus data: `prometheus-data` volume

### Updates

Update monitoring components:
```bash
# Pull latest images
docker-compose -f docker-compose.metrics.yml pull

# Restart services
docker-compose -f docker-compose.metrics.yml up -d
```