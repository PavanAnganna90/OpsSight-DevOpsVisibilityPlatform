import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Alert,
  CircularProgress,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  Security,
  Warning,
  Info,
  Error,
  Person,
  Computer,
  Timeline,
  TrendingUp,
  TrendingDown,
  Shield,
  Lock,
  Visibility
} from '@mui/icons-material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart
} from 'recharts';
import { useSnackbar } from 'notistack';

interface AuditStats {
  total_events: number;
  failed_events: number;
  success_rate: number;
  events_by_type: Record<string, number>;
  events_by_category: Record<string, number>;
  events_by_level: Record<string, number>;
  top_users: Record<string, number>;
  top_ips: Record<string, number>;
}

interface AuditLog {
  id: number;
  timestamp: string;
  event_type: string;
  event_category: string;
  level: string;
  message: string;
  user_email?: string;
  ip_address?: string;
  success: boolean;
}

interface SecurityAlert {
  id: number;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: string;
  count: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

const AuditDashboard: React.FC = () => {
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [recentLogs, setRecentLogs] = useState<AuditLog[]>([]);
  const [securityEvents, setSecurityEvents] = useState<AuditLog[]>([]);
  const [failedEvents, setFailedEvents] = useState<AuditLog[]>([]);
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('24h');
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);
  
  const { enqueueSnackbar } = useSnackbar();

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch dashboard data
      const dashboardResponse = await fetch('/api/v1/audit/dashboard');
      if (!dashboardResponse.ok) {
        throw new Error('Failed to fetch dashboard data');
      }
      
      const dashboardData = await dashboardResponse.json();
      
      setStats(dashboardData.stats);
      setRecentLogs(dashboardData.recent_events);
      setSecurityEvents(dashboardData.security_events);
      setFailedEvents(dashboardData.failed_events);
      setAlerts(dashboardData.alerts || []);
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      enqueueSnackbar('Failed to load dashboard data', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    
    // Set up auto-refresh
    const interval = setInterval(fetchDashboardData, 30000); // Refresh every 30 seconds
    setRefreshInterval(interval);
    
    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [timeRange]);

  const handleTimeRangeChange = (newRange: string) => {
    setTimeRange(newRange);
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const getEventTypeData = () => {
    if (!stats) return [];
    
    return Object.entries(stats.events_by_type).map(([name, value]) => ({
      name,
      value,
      percentage: ((value / stats.total_events) * 100).toFixed(1)
    }));
  };

  const getCategoryData = () => {
    if (!stats) return [];
    
    return Object.entries(stats.events_by_category).map(([name, value]) => ({
      name,
      value
    }));
  };

  const getLevelData = () => {
    if (!stats) return [];
    
    return Object.entries(stats.events_by_level).map(([name, value]) => ({
      name,
      value
    }));
  };

  const getTopUsersData = () => {
    if (!stats) return [];
    
    return Object.entries(stats.top_users)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([email, count]) => ({
        email,
        count
      }));
  };

  const getTopIPsData = () => {
    if (!stats) return [];
    
    return Object.entries(stats.top_ips)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([ip, count]) => ({
        ip,
        count
      }));
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'error';
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      case 'low':
        return 'info';
      default:
        return 'default';
    }
  };

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'error':
        return <Error color="error" />;
      case 'warning':
        return <Warning color="warning" />;
      case 'info':
        return <Info color="info" />;
      default:
        return <Info color="info" />;
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">
          Audit Dashboard
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <FormControl size="small">
            <InputLabel>Time Range</InputLabel>
            <Select
              value={timeRange}
              onChange={(e) => handleTimeRangeChange(e.target.value)}
              label="Time Range"
            >
              <MenuItem value="1h">Last Hour</MenuItem>
              <MenuItem value="24h">Last 24 Hours</MenuItem>
              <MenuItem value="7d">Last 7 Days</MenuItem>
              <MenuItem value="30d">Last 30 Days</MenuItem>
            </Select>
          </FormControl>
          <Button variant="outlined" onClick={fetchDashboardData}>
            Refresh
          </Button>
        </Box>
      </Box>

      {/* Key Metrics */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Timeline color="primary" sx={{ mr: 1 }} />
                <Typography color="textSecondary" variant="h6">
                  Total Events
                </Typography>
              </Box>
              <Typography variant="h3" color="primary">
                {stats?.total_events.toLocaleString() || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Error color="error" sx={{ mr: 1 }} />
                <Typography color="textSecondary" variant="h6">
                  Failed Events
                </Typography>
              </Box>
              <Typography variant="h3" color="error">
                {stats?.failed_events.toLocaleString() || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <TrendingUp color="success" sx={{ mr: 1 }} />
                <Typography color="textSecondary" variant="h6">
                  Success Rate
                </Typography>
              </Box>
              <Typography variant="h3" color="success">
                {stats?.success_rate.toFixed(1) || 0}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Security color="info" sx={{ mr: 1 }} />
                <Typography color="textSecondary" variant="h6">
                  Security Events
                </Typography>
              </Box>
              <Typography variant="h3" color="info">
                {securityEvents.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts Row */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Events by Category
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={getCategoryData()}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percentage }) => `${name} (${percentage}%)`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {getCategoryData().map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Events by Level
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={getLevelData()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Top Users and IPs */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Top Users
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={getTopUsersData()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="email" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#00C49F" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Top IP Addresses
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={getTopIPsData()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="ip" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#FF8042" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Recent Events and Alerts */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Recent Events
              </Typography>
              <List>
                {recentLogs.slice(0, 10).map((log) => (
                  <ListItem key={log.id} divider>
                    <ListItemIcon>
                      {getLevelIcon(log.level)}
                    </ListItemIcon>
                    <ListItemText
                      primary={log.message}
                      secondary={
                        <Box>
                          <Typography variant="caption" display="block">
                            {formatTimestamp(log.timestamp)}
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                            <Chip
                              label={log.event_category}
                              size="small"
                              variant="outlined"
                            />
                            <Chip
                              label={log.success ? 'Success' : 'Failed'}
                              size="small"
                              color={log.success ? 'success' : 'error'}
                            />
                          </Box>
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Security Events
              </Typography>
              {securityEvents.length === 0 ? (
                <Alert severity="success" sx={{ mb: 2 }}>
                  No security events detected
                </Alert>
              ) : (
                <List>
                  {securityEvents.slice(0, 10).map((log) => (
                    <ListItem key={log.id} divider>
                      <ListItemIcon>
                        <Security color="error" />
                      </ListItemIcon>
                      <ListItemText
                        primary={log.message}
                        secondary={
                          <Box>
                            <Typography variant="caption" display="block">
                              {formatTimestamp(log.timestamp)}
                            </Typography>
                            <Typography variant="caption" display="block">
                              User: {log.user_email || 'Unknown'} | IP: {log.ip_address || 'Unknown'}
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Failed Events */}
      {failedEvents.length > 0 && (
        <Grid container spacing={3} sx={{ mt: 1 }}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Recent Failed Events
                </Typography>
                <List>
                  {failedEvents.slice(0, 10).map((log) => (
                    <ListItem key={log.id} divider>
                      <ListItemIcon>
                        <Error color="error" />
                      </ListItemIcon>
                      <ListItemText
                        primary={log.message}
                        secondary={
                          <Box>
                            <Typography variant="caption" display="block">
                              {formatTimestamp(log.timestamp)}
                            </Typography>
                            <Typography variant="caption" display="block">
                              Type: {log.event_type} | User: {log.user_email || 'Unknown'}
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default AuditDashboard;