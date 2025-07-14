# 🚀 OpsSight Demo Environment Guide

Welcome to the OpsSight DevOps Visibility Platform demo! This guide will help you explore all the features and components in a production-like environment with comprehensive mock data.

## 📋 Quick Start

### 🎯 **Primary Demo URL**: `http://localhost:3000`

To launch the complete demo environment:

```bash
# From the project root directory
./scripts/demo-setup.sh
```

The script will automatically:
- ✅ Check prerequisites (Docker, Node.js, Python)
- 🐳 Start all Docker services (PostgreSQL, Prometheus, Grafana, etc.)
- 🌱 Seed comprehensive mock data
- 🚀 Launch frontend, backend, and Storybook
- 📊 Configure monitoring stack
- 🎨 Enable all theme variants

## 🌐 Access URLs

### 📱 **Main Application**
| Component | URL | Description |
|-----------|-----|-------------|
| **🏠 Main Dashboard** | [`http://localhost:3000`](http://localhost:3000) | **Primary demo interface** |
| 📊 DevOps Dashboard | [`http://localhost:3000/dashboard`](http://localhost:3000/dashboard) | Real-time CI/CD and infrastructure metrics |
| ⚙️ Settings & Themes | [`http://localhost:3000/settings`](http://localhost:3000/settings) | Test all 7 theme variants and preferences |
| 🔔 Notifications | [`http://localhost:3000/notifications`](http://localhost:3000/notifications) | Notification preferences and digest management |
| 👥 Teams | [`http://localhost:3000/teams`](http://localhost:3000/teams) | Team management and project assignments |
| 🔐 Profile | [`http://localhost:3000/profile`](http://localhost:3000/profile) | User profile and authentication settings |

### 🛠️ **Development Tools**
| Tool | URL | Credentials | Description |
|------|-----|-------------|-------------|
| 📚 **Storybook** | [`http://localhost:6006`](http://localhost:6006) | - | **Interactive component library** |
| 🛠️ API Documentation | [`http://localhost:8000/docs`](http://localhost:8000/docs) | - | FastAPI interactive documentation |
| 🔍 API Health Check | [`http://localhost:8000/api/v1/health`](http://localhost:8000/api/v1/health) | - | Backend service health status |
| 📊 API Metrics | [`http://localhost:8000/metrics`](http://localhost:8000/metrics) | - | Prometheus metrics endpoint |

### 📊 **Monitoring Stack**
| Service | URL | Credentials | Description |
|---------|-----|-------------|-------------|
| 📈 **Grafana** | [`http://localhost:3001`](http://localhost:3001) | `admin/admin` | **Production-like dashboards** |
| 📊 Prometheus | [`http://localhost:9090`](http://localhost:9090) | - | Metrics collection and querying |
| 🚨 AlertManager | [`http://localhost:9093`](http://localhost:9093) | - | Alert routing and management |
| 🖥️ Node Exporter | [`http://localhost:9100/metrics`](http://localhost:9100/metrics) | - | System metrics collection |

## 🎮 Demo Features & Testing Scenarios

### 🎨 **Theme System Testing**
Visit [`http://localhost:3000/settings`](http://localhost:3000/settings) to test:

#### **7 Theme Variants:**
1. **Minimal** - Clean, distraction-free interface
2. **Neo-Brutalist** - Bold, high-contrast design
3. **Glassmorphic** - Modern translucent effects
4. **Cyberpunk** - Futuristic neon aesthetics
5. **Editorial** - Typography-focused layout
6. **Accessible** - WCAG 2.1 AA compliant
7. **Dynamic** - AI-generated color schemes

#### **4 Color Modes:**
- 🌞 Light Mode
- 🌙 Dark Mode  
- 🔆 High Contrast
- 🖥️ System Preference

#### **4 Contextual Themes:**
- Default, Focus, Relax, Energize

### 📊 **Dashboard Testing**
Visit [`http://localhost:3000/dashboard`](http://localhost:3000/dashboard) to explore:

#### **Real-time Metrics:**
- CI/CD pipeline success/failure rates
- Kubernetes cluster health and resource usage
- Infrastructure change tracking
- Application performance metrics
- Security vulnerability scores

#### **Interactive Charts:**
- Deployment frequency trends
- Lead time for changes
- Mean time to recovery (MTTR)
- Change failure rate
- Git activity heatmaps

### 🔔 **Notification System Testing**
Visit [`http://localhost:3000/notifications`](http://localhost:3000/notifications) to test:

#### **Notification Preferences:**
- Email vs Slack preferences
- Severity level filtering (low, medium, high, critical)
- Event type selection (alerts, deployments, security)
- Quiet hours configuration
- Digest frequency settings

#### **Live Testing:**
- Send test notifications
- Preview digest formats
- Channel testing functionality

### 📱 **Responsive Design Testing**
Test all URLs on different screen sizes:
- 📱 Mobile (320px+)
- 📱 Tablet (768px+)  
- 💻 Desktop (1024px+)
- 🖥️ Large screens (1440px+)

### ♿ **Accessibility Testing**
All components are WCAG 2.1 AA compliant:
- Screen reader compatibility
- Keyboard navigation
- High contrast support
- Focus indicators
- Alt text for images

## 📊 Mock Data Overview

The demo environment includes realistic data:

### 👥 **Teams & Users**
- **3 Teams**: Frontend, Backend, DevOps
- **8 Users** with different roles and permissions
- Complete RBAC (Role-Based Access Control)

### 📁 **Projects**
- **OpsSight Platform** - Main DevOps platform
- **E-Commerce API** - Microservices architecture
- Full project hierarchies and team assignments

### 🔄 **CI/CD Data**
- **150+ Pipeline runs** with realistic success/failure patterns
- **50+ Deployments** across dev/staging/production
- Git activity spanning 6 months
- Realistic commit patterns and author distributions

### 🏗️ **Infrastructure**
- **3 Kubernetes clusters** (dev/staging/prod)
- **20+ Services** with health metrics
- **AWS cost data** with realistic spending patterns
- Resource utilization metrics

### 🚨 **Alerts & Incidents**
- **Active alerts** with different severity levels
- **Incident history** with resolution times
- **Notification preferences** per user/team
- **Escalation workflows**

## 🧪 Component Testing with Storybook

Visit [`http://localhost:6006`](http://localhost:6006) for interactive component testing:

### 🎯 **Core Components**
- **Button** - All variants, states, and sizes
- **MetricCard** - Different data types and trends
- **StatusIndicator** - Health states and animations
- **Chart Components** - All chart types with sample data

### 🎨 **Theme Components**
- **ThemeProvider** - Live theme switching
- **ColorModeToggle** - Mode transitions
- **ThemeSelector** - Variant previews

### 📊 **Data Visualization**
- **TimeSeriesChart** - Performance metrics over time
- **PieChart** - Resource distribution
- **BarChart** - Comparative metrics
- **HeatMap** - Activity patterns

## 🔧 Development & API Testing

### 🛠️ **API Endpoints**
Visit [`http://localhost:8000/docs`](http://localhost:8000/docs) to test:

#### **Authentication**
- GitHub OAuth flow (demo mode)
- JWT token management
- User profile endpoints

#### **Dashboard Data**
- Real-time metrics APIs
- Historical data queries
- Aggregation endpoints

#### **Notification System**
- Preference management
- Notification sending
- Digest generation

#### **Team Management**
- RBAC operations
- Project assignments
- Permission checking

### 📊 **Metrics & Monitoring**
Visit [`http://localhost:3001`](http://localhost:3001) (admin/admin) for:

#### **Application Metrics**
- Request rates and latencies
- Error rates and status codes
- Database query performance
- Cache hit rates

#### **Infrastructure Metrics**
- CPU, memory, disk usage
- Network I/O patterns
- Container resource usage
- Kubernetes cluster health

## 🎯 Testing Scenarios

### 🚀 **User Journey Testing**

#### **New User Onboarding**
1. Access [`http://localhost:3000`](http://localhost:3000)
2. Navigate through authentication flow (demo mode)
3. Complete profile setup
4. Explore dashboard features
5. Configure preferences and themes

#### **Dashboard Exploration**
1. Visit [`http://localhost:3000/dashboard`](http://localhost:3000/dashboard)
2. Interact with different chart types
3. Filter data by time ranges
4. Explore different project views
5. Test responsive behavior on mobile

#### **Theme Customization**
1. Go to [`http://localhost:3000/settings`](http://localhost:3000/settings)
2. Switch between all 7 theme variants
3. Test different color modes
4. Configure contextual themes
5. Verify accessibility compliance

#### **Notification Configuration**
1. Access [`http://localhost:3000/notifications`](http://localhost:3000/notifications)
2. Configure notification preferences
3. Set up quiet hours
4. Test notification channels
5. Preview digest formats

### 🔧 **Developer Testing**

#### **Component Development**
1. Launch [`http://localhost:6006`](http://localhost:6006)
2. Explore component library
3. Test interactive props
4. Verify accessibility features
5. Check responsive behavior

#### **API Integration**
1. Visit [`http://localhost:8000/docs`](http://localhost:8000/docs)
2. Test authentication endpoints
3. Query dashboard data
4. Test notification APIs
5. Verify error handling

#### **Monitoring & Observability**
1. Open [`http://localhost:3001`](http://localhost:3001)
2. Explore pre-configured dashboards
3. Create custom queries in Prometheus
4. Test alert configurations
5. Verify metrics collection

## 📱 Mobile & Tablet Testing

### 📱 **Mobile Devices (320px - 767px)**
- Navigation drawer behavior
- Touch-friendly interactions
- Condensed metric displays
- Optimized chart rendering

### 📱 **Tablets (768px - 1023px)**
- Sidebar behavior
- Chart responsiveness
- Touch and stylus support
- Landscape/portrait modes

## 🔧 Troubleshooting

### 🐛 **Common Issues**

#### **Services Not Starting**
```bash
# Check service status
docker-compose ps

# View logs
docker-compose logs [service-name]

# Restart specific service
docker-compose restart [service-name]
```

#### **Database Connection Issues**
```bash
# Reset database
docker-compose down -v
./scripts/demo-setup.sh
```

#### **Port Conflicts**
```bash
# Check port usage
lsof -i :3000  # Replace with specific port

# Stop conflicting services
./cleanup-demo.sh
```

### 📊 **Performance Monitoring**
- Check [`http://localhost:8000/metrics`](http://localhost:8000/metrics) for backend metrics
- Monitor resource usage in [`http://localhost:3001`](http://localhost:3001)
- Use browser DevTools for frontend performance

## 🛑 Cleanup

To stop and clean up the demo environment:

```bash
./cleanup-demo.sh
```

This will:
- Stop all background processes
- Shut down Docker services  
- Clean up environment files
- Remove temporary data

## 🎊 Next Steps

After exploring the demo:

1. **Customize Themes** - Modify theme tokens in `frontend/src/styles/tokens/`
2. **Add Components** - Create new components using the design system
3. **Extend APIs** - Add new endpoints in `backend/app/api/`
4. **Configure Monitoring** - Customize Grafana dashboards
5. **Deploy to Production** - Use the Kubernetes manifests in `k8s/`

---

**🎯 Primary Demo URL**: [`http://localhost:3000`](http://localhost:3000)

**📚 Component Library**: [`http://localhost:6006`](http://localhost:6006)

**📊 Monitoring**: [`http://localhost:3001`](http://localhost:3001) (admin/admin)

Enjoy exploring the OpsSight DevOps Visibility Platform! 🚀 