#!/bin/bash

# OpsSight DevOps Platform - EKS Node User Data
# Bootstrap script for EKS worker nodes following cursor development standards

set -o xtrace

# Update system packages
yum update -y

# Install additional packages for observability and debugging
yum install -y \
    htop \
    iotop \
    iftop \
    curl \
    wget \
    git \
    amazon-cloudwatch-agent

# Bootstrap the node to join the EKS cluster
# Reason: Registers node with the cluster control plane
/etc/eks/bootstrap.sh ${cluster_name} ${bootstrap_arguments}

# Configure CloudWatch agent for enhanced monitoring
# Reason: Provides detailed metrics and logs for troubleshooting
cat > /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json << 'EOF'
{
    "agent": {
        "metrics_collection_interval": 60,
        "run_as_user": "cwagent"
    },
    "metrics": {
        "namespace": "EKS/Node",
        "metrics_collected": {
            "cpu": {
                "measurement": [
                    "cpu_usage_idle",
                    "cpu_usage_iowait",
                    "cpu_usage_user",
                    "cpu_usage_system"
                ],
                "metrics_collection_interval": 60
            },
            "disk": {
                "measurement": [
                    "used_percent"
                ],
                "metrics_collection_interval": 60,
                "resources": [
                    "*"
                ]
            },
            "diskio": {
                "measurement": [
                    "io_time"
                ],
                "metrics_collection_interval": 60,
                "resources": [
                    "*"
                ]
            },
            "mem": {
                "measurement": [
                    "mem_used_percent"
                ],
                "metrics_collection_interval": 60
            },
            "netstat": {
                "measurement": [
                    "tcp_established",
                    "tcp_time_wait"
                ],
                "metrics_collection_interval": 60
            },
            "swap": {
                "measurement": [
                    "swap_used_percent"
                ],
                "metrics_collection_interval": 60
            }
        }
    },
    "logs": {
        "logs_collected": {
            "files": {
                "collect_list": [
                    {
                        "file_path": "/var/log/messages",
                        "log_group_name": "/eks/node/system",
                        "log_stream_name": "{instance_id}/messages"
                    },
                    {
                        "file_path": "/var/log/dmesg",
                        "log_group_name": "/eks/node/kernel",
                        "log_stream_name": "{instance_id}/dmesg"
                    }
                ]
            }
        }
    }
}
EOF

# Start CloudWatch agent
systemctl enable amazon-cloudwatch-agent
systemctl start amazon-cloudwatch-agent

# Configure log rotation for container logs
# Reason: Prevents disk space issues from container log accumulation
cat > /etc/logrotate.d/docker-container << 'EOF'
/var/lib/docker/containers/*/*.log {
    rotate 5
    daily
    compress
    size=10M
    missingok
    delaycompress
    copytruncate
}
EOF

# Install kubectl for debugging (optional)
# Reason: Allows node-level troubleshooting of Kubernetes issues
curl -o /usr/local/bin/kubectl https://amazon-eks.s3.us-west-2.amazonaws.com/1.21.2/2021-07-05/bin/linux/amd64/kubectl
chmod +x /usr/local/bin/kubectl

# Configure kubelet settings for better resource management
# Reason: Optimizes node performance and resource allocation
mkdir -p /etc/kubernetes/kubelet
cat > /etc/kubernetes/kubelet/kubelet-config.json << 'EOF'
{
    "kind": "KubeletConfiguration",
    "apiVersion": "kubelet.config.k8s.io/v1beta1",
    "maxPods": 110,
    "cgroupDriver": "systemd",
    "containerLogMaxSize": "10Mi",
    "containerLogMaxFiles": 5,
    "kubeReserved": {
        "cpu": "100m",
        "memory": "100Mi",
        "ephemeral-storage": "1Gi"
    },
    "systemReserved": {
        "cpu": "100m",
        "memory": "100Mi",
        "ephemeral-storage": "1Gi"
    }
}
EOF

# Signal successful completion
# Reason: Indicates to CloudFormation/Terraform that initialization completed
/opt/aws/bin/cfn-signal -e $? --stack ${AWS::StackName} --resource AutoScalingGroup --region ${AWS::Region} || true

echo "EKS node bootstrap completed successfully" 