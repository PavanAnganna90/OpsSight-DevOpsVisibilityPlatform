#!/bin/bash

# OpsSight Quick Cloud Deployment Helper
# Helps you deploy to your preferred cloud provider

set -e

echo "🚀 OpsSight Quick Deployment Helper"
echo ""
echo "Choose your deployment option:"
echo "1) Local testing (free - start here)"
echo "2) DigitalOcean ($20/month - recommended for startups)"
echo "3) AWS ($50+/month - enterprise grade)"
echo "4) Heroku ($25/month - easiest setup)"
echo "5) Custom server (your own server)"
echo ""

read -p "Enter your choice (1-5): " choice

case $choice in
    1)
        echo "🏠 Starting local deployment..."
        ./deploy-production.sh basic
        echo ""
        echo "✅ Local deployment started!"
        echo "🌐 Frontend: http://localhost"
        echo "🔧 API: http://localhost:8000"
        echo "📊 Monitoring: http://localhost:3001"
        ;;
    2)
        echo "🌊 DigitalOcean Deployment Guide:"
        echo ""
        echo "1. Go to digitalocean.com and create account"
        echo "2. Create a droplet:"
        echo "   - Ubuntu 22.04"
        echo "   - 4GB RAM minimum ($20/month)"
        echo "   - Choose region closest to you"
        echo ""
        echo "3. Once created, run:"
        echo "   scp -r . root@YOUR_DROPLET_IP:/opt/opssight/"
        echo "   ssh root@YOUR_DROPLET_IP"
        echo "   cd /opt/opssight"
        echo "   ./deploy-production.sh full"
        echo ""
        echo "💡 Need help? Check DEPLOYMENT_GUIDE.md for detailed steps"
        ;;
    3)
        echo "☁️ AWS Deployment Guide:"
        echo ""
        echo "1. Install AWS CLI: aws configure"
        echo "2. Deploy infrastructure:"
        echo "   cd infrastructure/"
        echo "   terraform init"
        echo "   terraform apply"
        echo ""
        echo "3. Deploy to EKS:"
        echo "   kubectl apply -f k8s/production/"
        echo ""
        echo "💡 This is more complex but very scalable"
        ;;
    4)
        echo "🟣 Heroku Deployment Guide:"
        echo ""
        echo "1. Install Heroku CLI"
        echo "2. heroku create opssight-prod"
        echo "3. git push heroku main"
        echo ""
        echo "💡 Easiest option but more expensive long-term"
        ;;
    5)
        echo "🖥️ Custom Server Deployment:"
        echo ""
        read -p "Enter your server IP: " server_ip
        echo ""
        echo "Run these commands:"
        echo "scp -r . user@$server_ip:/opt/opssight/"
        echo "ssh user@$server_ip"
        echo "cd /opt/opssight"
        echo "./deploy-production.sh full"
        ;;
    *)
        echo "❌ Invalid choice. Please run again and choose 1-5."
        exit 1
        ;;
esac

echo ""
echo "📚 For detailed guides, see:"
echo "   - DEPLOYMENT_GUIDE.md (comprehensive guide)"
echo "   - README.md (getting started)"
echo "   - docker-compose.prod.yml (production config)"