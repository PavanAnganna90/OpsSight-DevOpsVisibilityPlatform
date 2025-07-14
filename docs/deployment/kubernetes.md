# OpsSight Platform - Kubernetes Deployment Guide

Complete guide for deploying OpsSight DevOps Platform on Kubernetes clusters using production-ready configurations.

## 🎯 Overview

This guide covers deploying OpsSight on Kubernetes with:
- **High Availability** - Multi-replica deployments with load balancing
- **Auto-scaling** - Horizontal Pod Autoscaler (HPA) configuration
- **Security** - Network policies, RBAC, and secrets management
- **Monitoring** - Prometheus, Grafana, and log aggregation
- **Storage** - Persistent volumes for databases and file storage

## 📋 Prerequisites

### Cluster Requirements

- **Kubernetes**: v1.28+ (tested with v1.28-1.30)
- **Nodes**: 3+ worker nodes (5+ recommended for production)
- **Resources**: 16 vCPUs, 64GB RAM minimum across cluster
- **Storage**: Dynamic provisioning with SSD storage class
- **Networking**: CNI plugin (Calico, Flannel, or Weave)

### Required Tools

```bash
# Install kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl

# Install Helm (recommended)
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

# Install Kustomize (if not included with kubectl)
curl -s "https://raw.githubusercontent.com/kubernetes-sigs/kustomize/master/hack/install_kustomize.sh" | bash

# Verify cluster access
kubectl cluster-info
kubectl get nodes
```

### Cluster Setup Verification

```bash
# Check cluster capacity
kubectl top nodes

# Verify storage classes
kubectl get storageclass

# Check for dynamic provisioning
kubectl describe storageclass

# Verify networking
kubectl get pods -n kube-system | grep -E "(calico|flannel|weave)"
```

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Kubernetes Cluster Architecture                 │
├─────────────────────────────────────────────────────────────────────┤
│                          Ingress Layer                             │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  NGINX/Traefik Ingress Controller + SSL Termination       │    │
│  └─────────────────────┬───────────────────────────────────────┘    │
│                         │                                           │
│  ┌─────────────────────┼───────────────────────────────────────┐    │
│  │          Application Tier          │      Monitoring Tier   │    │
│  │  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐    │
│  │  │  Frontend App   │ │   Backend API   │ │    Grafana      │    │
│  │  │   (3 replicas)  │ │   (3 replicas)  │ │  + Prometheus   │    │
│  │  │                 │ │                 │ │   + Loki        │    │
│  │  └─────────────────┘ └─────────────────┘ └─────────────────┘    │
│  └─────────────────────┼───────────────────────────────────────┘    │
│                         │                                           │
│  ┌─────────────────────┼───────────────────────────────────────┐    │
│  │              Data Tier              │      Cache Tier       │    │
│  │  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐    │
│  │  │   PostgreSQL    │ │     Redis       │ │      MinIO      │    │
│  │  │   (Primary +    │ │   (Cluster)     │ │   (Object       │    │
│  │  │    Replicas)    │ │                 │ │    Storage)     │    │
│  │  └─────────────────┘ └─────────────────┘ └─────────────────┘    │
│  └─────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
```

## 🚀 Deployment Steps

### Step 1: Namespace and RBAC Setup

```bash
# Create namespace
kubectl create namespace opssight

# Create service account with RBAC
kubectl apply -f - << 'EOF'
apiVersion: v1
kind: ServiceAccount
metadata:
  name: opssight-sa
  namespace: opssight
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: opssight-cluster-role
rules:
- apiGroups: [""]
  resources: ["pods", "services", "endpoints", "persistentvolumeclaims", "events", "configmaps", "secrets"]
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
- apiGroups: ["apps"]
  resources: ["deployments", "daemonsets", "replicasets", "statefulsets"]
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
- apiGroups: ["extensions"]
  resources: ["ingresses"]
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: opssight-cluster-role-binding
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: opssight-cluster-role
subjects:
- kind: ServiceAccount
  name: opssight-sa
  namespace: opssight
EOF
```

### Step 2: Secrets Management

```bash
# Create database secrets
kubectl create secret generic opssight-db-secret \
  --from-literal=username=opssight_user \
  --from-literal=password=$(openssl rand -base64 32) \
  --from-literal=database=opssight_prod \
  --from-literal=host=postgresql.opssight.svc.cluster.local \
  --from-literal=port=5432 \
  --namespace=opssight

# Create application secrets
kubectl create secret generic opssight-app-secret \
  --from-literal=secret-key=$(python3 -c "import secrets; print(secrets.token_urlsafe(32))") \
  --from-literal=jwt-secret=$(python3 -c "import secrets; print(secrets.token_urlsafe(32))") \
  --from-literal=encryption-key=$(python3 -c "import base64; import os; print(base64.b64encode(os.urandom(32)).decode())") \
  --namespace=opssight

# Create OAuth secrets
kubectl create secret generic opssight-oauth-secret \
  --from-literal=github-client-id=YOUR_GITHUB_CLIENT_ID \
  --from-literal=github-client-secret=YOUR_GITHUB_CLIENT_SECRET \
  --namespace=opssight

# Create Redis secrets
kubectl create secret generic opssight-redis-secret \
  --from-literal=password=$(openssl rand -base64 32) \
  --namespace=opssight

# Create monitoring secrets
kubectl create secret generic opssight-monitoring-secret \
  --from-literal=grafana-admin-password=$(openssl rand -base64 16) \
  --namespace=opssight
```

### Step 3: SSL/TLS Certificates

```bash
# Option 1: Using cert-manager with Let's Encrypt
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# Wait for cert-manager to be ready
kubectl wait --for=condition=ready pod -l app=cert-manager -n cert-manager --timeout=300s

# Create ClusterIssuer
kubectl apply -f - << 'EOF'
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@your-domain.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
EOF

# Option 2: Manual certificate upload
kubectl create secret tls opssight-tls \
  --cert=path/to/your/certificate.crt \
  --key=path/to/your/private.key \
  --namespace=opssight
```

### Step 4: Storage Configuration

```bash
# Create storage class (if not exists)
kubectl apply -f - << 'EOF'
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: opssight-ssd
  annotations:
    storageclass.kubernetes.io/is-default-class: "false"
provisioner: kubernetes.io/aws-ebs  # Change based on your cloud provider
parameters:
  type: gp3
  fsType: ext4
  encrypted: "true"
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
reclaimPolicy: Retain
EOF

# Create persistent volumes
kubectl apply -f - << 'EOF'
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgresql-data
  namespace: opssight
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: opssight-ssd
  resources:
    requests:
      storage: 100Gi
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: redis-data
  namespace: opssight
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: opssight-ssd
  resources:
    requests:
      storage: 20Gi
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: minio-data
  namespace: opssight
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: opssight-ssd
  resources:
    requests:
      storage: 200Gi
EOF
```

### Step 5: Database Deployment

```bash
# Deploy PostgreSQL with high availability
kubectl apply -f - << 'EOF'
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgresql
  namespace: opssight
spec:
  serviceName: postgresql
  replicas: 1
  selector:
    matchLabels:
      app: postgresql
  template:
    metadata:
      labels:
        app: postgresql
    spec:
      serviceAccountName: opssight-sa
      containers:
      - name: postgresql
        image: postgres:15
        ports:
        - containerPort: 5432
        env:
        - name: POSTGRES_DB
          valueFrom:
            secretKeyRef:
              name: opssight-db-secret
              key: database
        - name: POSTGRES_USER
          valueFrom:
            secretKeyRef:
              name: opssight-db-secret
              key: username
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: opssight-db-secret
              key: password
        - name: PGDATA
          value: /var/lib/postgresql/data/pgdata
        volumeMounts:
        - name: postgresql-data
          mountPath: /var/lib/postgresql/data
        resources:
          requests:
            memory: "2Gi"
            cpu: "1000m"
          limits:
            memory: "4Gi"
            cpu: "2000m"
        livenessProbe:
          exec:
            command:
            - /usr/bin/pg_isready
            - -U
            - $(POSTGRES_USER)
            - -d
            - $(POSTGRES_DB)
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          exec:
            command:
            - /usr/bin/pg_isready
            - -U
            - $(POSTGRES_USER)
            - -d
            - $(POSTGRES_DB)
          initialDelaySeconds: 5
          periodSeconds: 5
      volumes:
      - name: postgresql-data
        persistentVolumeClaim:
          claimName: postgresql-data
---
apiVersion: v1
kind: Service
metadata:
  name: postgresql
  namespace: opssight
spec:
  selector:
    app: postgresql
  ports:
  - port: 5432
    targetPort: 5432
  type: ClusterIP
EOF
```

### Step 6: Redis Deployment

```bash
# Deploy Redis cluster
kubectl apply -f - << 'EOF'
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: redis
  namespace: opssight
spec:
  serviceName: redis
  replicas: 1
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
    spec:
      serviceAccountName: opssight-sa
      containers:
      - name: redis
        image: redis:7-alpine
        ports:
        - containerPort: 6379
        args:
        - redis-server
        - --requirepass
        - $(REDIS_PASSWORD)
        - --maxmemory
        - 2gb
        - --maxmemory-policy
        - allkeys-lru
        env:
        - name: REDIS_PASSWORD
          valueFrom:
            secretKeyRef:
              name: opssight-redis-secret
              key: password
        volumeMounts:
        - name: redis-data
          mountPath: /data
        resources:
          requests:
            memory: "1Gi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "1000m"
        livenessProbe:
          exec:
            command:
            - redis-cli
            - -a
            - $(REDIS_PASSWORD)
            - ping
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          exec:
            command:
            - redis-cli
            - -a
            - $(REDIS_PASSWORD)
            - ping
          initialDelaySeconds: 5
          periodSeconds: 5
      volumes:
      - name: redis-data
        persistentVolumeClaim:
          claimName: redis-data
---
apiVersion: v1
kind: Service
metadata:
  name: redis
  namespace: opssight
spec:
  selector:
    app: redis
  ports:
  - port: 6379
    targetPort: 6379
  type: ClusterIP
EOF
```

### Step 7: Application Deployments

```bash
# Deploy using Kustomize
# Staging environment
kubectl apply -k k8s/staging

# Production environment
kubectl apply -k k8s/production

# Verify deployments
kubectl get deployments -n opssight
kubectl get pods -n opssight
kubectl get services -n opssight
```

### Step 8: Ingress Configuration

```bash
# Install NGINX Ingress Controller (if not installed)
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.1/deploy/static/provider/cloud/deploy.yaml

# Wait for ingress controller
kubectl wait --namespace ingress-nginx \
  --for=condition=ready pod \
  --selector=app.kubernetes.io/component=controller \
  --timeout=120s

# Create ingress for OpsSight
kubectl apply -f - << 'EOF'
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: opssight-ingress
  namespace: opssight
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/proxy-body-size: "100m"
    nginx.ingress.kubernetes.io/proxy-read-timeout: "600"
    nginx.ingress.kubernetes.io/proxy-send-timeout: "600"
spec:
  tls:
  - hosts:
    - opssight.your-domain.com
    - api.opssight.your-domain.com
    secretName: opssight-tls
  rules:
  - host: opssight.your-domain.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: frontend
            port:
              number: 3000
  - host: api.opssight.your-domain.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: backend
            port:
              number: 8000
EOF
```

## ⚡ Auto-scaling Configuration

### Horizontal Pod Autoscaler (HPA)

```bash
# Install metrics server (if not installed)
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml

# Create HPA for backend
kubectl apply -f - << 'EOF'
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: backend-hpa
  namespace: opssight
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: backend
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: frontend-hpa
  namespace: opssight
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: frontend
  minReplicas: 2
  maxReplicas: 8
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
EOF
```

### Vertical Pod Autoscaler (VPA)

```bash
# Install VPA (optional)
git clone https://github.com/kubernetes/autoscaler.git
cd autoscaler/vertical-pod-autoscaler/
./hack/vpa-install.sh

# Create VPA for database
kubectl apply -f - << 'EOF'
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: postgresql-vpa
  namespace: opssight
spec:
  targetRef:
    apiVersion: apps/v1
    kind: StatefulSet
    name: postgresql
  updatePolicy:
    updateMode: "Auto"
  resourcePolicy:
    containerPolicies:
    - containerName: postgresql
      maxAllowed:
        cpu: 4
        memory: 8Gi
      minAllowed:
        cpu: 1
        memory: 2Gi
EOF
```

## 🔒 Security Configuration

### Network Policies

```bash
# Create network policies
kubectl apply -f - << 'EOF'
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: opssight-network-policy
  namespace: opssight
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: ingress-nginx
  - from:
    - podSelector:
        matchLabels:
          app: backend
    ports:
    - protocol: TCP
      port: 5432
  - from:
    - podSelector:
        matchLabels:
          app: frontend
    - podSelector:
        matchLabels:
          app: backend
    ports:
    - protocol: TCP
      port: 6379
  egress:
  - {}  # Allow all egress for external API calls
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: postgresql-network-policy
  namespace: opssight
spec:
  podSelector:
    matchLabels:
      app: postgresql
  policyTypes:
  - Ingress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: backend
    ports:
    - protocol: TCP
      port: 5432
EOF
```

### Pod Security Standards

```bash
# Create Pod Security Policy
kubectl apply -f - << 'EOF'
apiVersion: v1
kind: Namespace
metadata:
  name: opssight
  labels:
    name: opssight
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted
EOF
```

### Security Contexts

```bash
# Apply security contexts to deployments
kubectl patch deployment backend -n opssight -p '
{
  "spec": {
    "template": {
      "spec": {
        "securityContext": {
          "runAsNonRoot": true,
          "runAsUser": 1000,
          "fsGroup": 2000
        },
        "containers": [
          {
            "name": "backend",
            "securityContext": {
              "allowPrivilegeEscalation": false,
              "capabilities": {
                "drop": ["ALL"]
              },
              "readOnlyRootFilesystem": true,
              "runAsNonRoot": true,
              "runAsUser": 1000
            }
          }
        ]
      }
    }
  }
}'
```

## 📊 Monitoring and Logging

### Prometheus and Grafana

```bash
# Install Prometheus Operator
kubectl create namespace monitoring
kubectl apply -f https://github.com/prometheus-operator/prometheus-operator/releases/download/v0.68.0/bundle.yaml

# Install Grafana
kubectl apply -f - << 'EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: grafana
  namespace: monitoring
spec:
  replicas: 1
  selector:
    matchLabels:
      app: grafana
  template:
    metadata:
      labels:
        app: grafana
    spec:
      containers:
      - name: grafana
        image: grafana/grafana:latest
        ports:
        - containerPort: 3000
        env:
        - name: GF_SECURITY_ADMIN_PASSWORD
          valueFrom:
            secretKeyRef:
              name: opssight-monitoring-secret
              key: grafana-admin-password
        volumeMounts:
        - name: grafana-storage
          mountPath: /var/lib/grafana
      volumes:
      - name: grafana-storage
        emptyDir: {}
---
apiVersion: v1
kind: Service
metadata:
  name: grafana
  namespace: monitoring
spec:
  selector:
    app: grafana
  ports:
  - port: 3000
    targetPort: 3000
  type: LoadBalancer
EOF
```

### Centralized Logging

```bash
# Install Loki
kubectl apply -f - << 'EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: loki
  namespace: monitoring
spec:
  replicas: 1
  selector:
    matchLabels:
      app: loki
  template:
    metadata:
      labels:
        app: loki
    spec:
      containers:
      - name: loki
        image: grafana/loki:latest
        ports:
        - containerPort: 3100
        args:
        - -config.file=/etc/loki/local-config.yaml
        volumeMounts:
        - name: loki-config
          mountPath: /etc/loki
      volumes:
      - name: loki-config
        configMap:
          name: loki-config
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: loki-config
  namespace: monitoring
data:
  local-config.yaml: |
    auth_enabled: false
    server:
      http_listen_port: 3100
    ingester:
      lifecycler:
        address: 127.0.0.1
        ring:
          kvstore:
            store: inmemory
          replication_factor: 1
        final_sleep: 0s
    schema_config:
      configs:
        - from: 2020-10-24
          store: boltdb-shipper
          object_store: filesystem
          schema: v11
          index:
            prefix: index_
            period: 24h
    storage_config:
      boltdb_shipper:
        active_index_directory: /loki/boltdb-shipper-active
        cache_location: /loki/boltdb-shipper-cache
        shared_store: filesystem
      filesystem:
        directory: /loki/chunks
    limits_config:
      enforce_metric_name: false
      reject_old_samples: true
      reject_old_samples_max_age: 168h
---
apiVersion: v1
kind: Service
metadata:
  name: loki
  namespace: monitoring
spec:
  selector:
    app: loki
  ports:
  - port: 3100
    targetPort: 3100
EOF
```

## 🔄 Backup and Disaster Recovery

### Database Backup

```bash
# Create backup CronJob
kubectl apply -f - << 'EOF'
apiVersion: batch/v1
kind: CronJob
metadata:
  name: postgresql-backup
  namespace: opssight
spec:
  schedule: "0 2 * * *"  # Daily at 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: OnFailure
          containers:
          - name: postgresql-backup
            image: postgres:15
            env:
            - name: PGPASSWORD
              valueFrom:
                secretKeyRef:
                  name: opssight-db-secret
                  key: password
            - name: POSTGRES_DB
              valueFrom:
                secretKeyRef:
                  name: opssight-db-secret
                  key: database
            - name: POSTGRES_USER
              valueFrom:
                secretKeyRef:
                  name: opssight-db-secret
                  key: username
            command:
            - /bin/bash
            - -c
            - |
              BACKUP_FILE="/backup/postgresql-$(date +%Y%m%d_%H%M%S).sql"
              pg_dump -h postgresql.opssight.svc.cluster.local -U $POSTGRES_USER $POSTGRES_DB > $BACKUP_FILE
              gzip $BACKUP_FILE
              # Upload to S3 or other storage
              # aws s3 cp ${BACKUP_FILE}.gz s3://your-backup-bucket/postgresql/
            volumeMounts:
            - name: backup-storage
              mountPath: /backup
          volumes:
          - name: backup-storage
            persistentVolumeClaim:
              claimName: backup-storage
EOF
```

## 🛠️ Operations and Maintenance

### Health Checks

```bash
# Check cluster health
kubectl get nodes
kubectl get pods -n opssight
kubectl get services -n opssight

# Check resource usage
kubectl top nodes
kubectl top pods -n opssight

# Check events
kubectl get events -n opssight --sort-by='.lastTimestamp'
```

### Scaling Operations

```bash
# Scale deployments
kubectl scale deployment backend --replicas=5 -n opssight
kubectl scale deployment frontend --replicas=3 -n opssight

# Check HPA status
kubectl get hpa -n opssight

# View autoscaling events
kubectl describe hpa backend-hpa -n opssight
```

### Updates and Rollbacks

```bash
# Update application image
kubectl set image deployment/backend backend=opssight/backend:v2.0.0 -n opssight

# Check rollout status
kubectl rollout status deployment/backend -n opssight

# Rollback if needed
kubectl rollout undo deployment/backend -n opssight

# View rollout history
kubectl rollout history deployment/backend -n opssight
```

## 🚨 Troubleshooting

### Common Issues

#### Pod Not Starting

```bash
# Check pod status
kubectl get pods -n opssight

# View pod logs
kubectl logs <pod-name> -n opssight

# Describe pod for events
kubectl describe pod <pod-name> -n opssight

# Check resource constraints
kubectl describe node <node-name>
```

#### Database Connection Issues

```bash
# Test database connection
kubectl run -it --rm --image=postgres:15 --restart=Never psql -- \
  psql -h postgresql.opssight.svc.cluster.local -U opssight_user -d opssight_prod

# Check database logs
kubectl logs postgresql-0 -n opssight

# Verify secrets
kubectl get secret opssight-db-secret -n opssight -o yaml
```

#### Ingress Issues

```bash
# Check ingress status
kubectl get ingress -n opssight

# Verify ingress controller
kubectl get pods -n ingress-nginx

# Check certificate status
kubectl describe certificate opssight-tls -n opssight

# Test DNS resolution
nslookup opssight.your-domain.com
```

#### Performance Issues

```bash
# Check resource usage
kubectl top pods -n opssight

# View HPA metrics
kubectl get hpa -n opssight

# Check cluster capacity
kubectl describe nodes

# Analyze slow queries (database)
kubectl exec -it postgresql-0 -n opssight -- psql -U opssight_user -d opssight_prod -c "
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;"
```

### Performance Optimization

#### Database Performance

```bash
# Optimize PostgreSQL configuration
kubectl create configmap postgresql-config -n opssight --from-literal=postgresql.conf="
shared_buffers = 2GB
effective_cache_size = 6GB
work_mem = 32MB
maintenance_work_mem = 1GB
max_connections = 200
random_page_cost = 1.1
effective_io_concurrency = 200
"

# Update StatefulSet to use config
kubectl patch statefulset postgresql -n opssight -p '
{
  "spec": {
    "template": {
      "spec": {
        "containers": [
          {
            "name": "postgresql",
            "volumeMounts": [
              {
                "name": "postgresql-config",
                "mountPath": "/etc/postgresql/postgresql.conf",
                "subPath": "postgresql.conf"
              }
            ]
          }
        ],
        "volumes": [
          {
            "name": "postgresql-config",
            "configMap": {
              "name": "postgresql-config"
            }
          }
        ]
      }
    }
  }
}'
```

#### Application Performance

```bash
# Enable resource requests and limits
kubectl patch deployment backend -n opssight -p '
{
  "spec": {
    "template": {
      "spec": {
        "containers": [
          {
            "name": "backend",
            "resources": {
              "requests": {
                "memory": "512Mi",
                "cpu": "500m"
              },
              "limits": {
                "memory": "2Gi",
                "cpu": "2000m"
              }
            }
          }
        ]
      }
    }
  }
}'
```

## 📚 Best Practices

### Security Best Practices

1. **Use RBAC** - Implement least privilege access
2. **Network Policies** - Restrict inter-pod communication
3. **Pod Security** - Use security contexts and policies
4. **Secrets Management** - Use Kubernetes secrets or external secret managers
5. **Image Security** - Scan images for vulnerabilities
6. **Regular Updates** - Keep Kubernetes and applications updated

### Performance Best Practices

1. **Resource Limits** - Set appropriate requests and limits
2. **Auto-scaling** - Configure HPA and VPA
3. **Storage** - Use SSD storage classes
4. **Monitoring** - Implement comprehensive monitoring
5. **Caching** - Use Redis for application caching
6. **Database Tuning** - Optimize PostgreSQL configuration

### Operational Best Practices

1. **Gitops** - Use GitOps for deployment management
2. **Blue-Green Deployments** - Implement zero-downtime deployments
3. **Backup Strategy** - Regular automated backups
4. **Disaster Recovery** - Test disaster recovery procedures
5. **Documentation** - Maintain up-to-date documentation
6. **Training** - Ensure team knowledge of Kubernetes operations

## 📄 Additional Resources

- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Helm Charts](https://helm.sh/docs/)
- [Prometheus Operator](https://prometheus-operator.dev/)
- [NGINX Ingress Controller](https://kubernetes.github.io/ingress-nginx/)
- [cert-manager](https://cert-manager.io/docs/)

---

**🎉 Your OpsSight platform is now running on Kubernetes!**

For additional support, check the [troubleshooting guide](../operations/troubleshooting.md) or create an issue in the project repository.