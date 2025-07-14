import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Avatar,
  AvatarGroup,
  Tooltip,
  Paper,
  Divider,
  IconButton,
  Menu,
  MenuItem
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  AccessTime,
  Speed,
  BugReport,
  CheckCircle,
  Warning,
  Code,
  Group,
  Schedule,
  MoreVert,
  EmojiEvents,
  ThumbUp,
  Star
} from '@mui/icons-material';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, ResponsiveContainer, LineChart, Line, Area, AreaChart } from 'recharts';

interface TeamInsightsProps {
  teamId?: string;
}

interface TeamMetric {
  label: string;
  value: number;
  change: number;
  trend: 'up' | 'down' | 'stable';
  unit?: string;
}

interface TeamMemberPerformance {
  id: string;
  name: string;
  avatar?: string;
  commits: number;
  prsReviewed: number;
  issuesResolved: number;
  deployments: number;
  score: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

const TeamInsights: React.FC<TeamInsightsProps> = ({ teamId }) => {
  const [insights, setInsights] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedPeriod, setSelectedPeriod] = useState('7d');

  useEffect(() => {
    fetchInsights();
  }, [teamId, selectedPeriod]);

  const fetchInsights = async () => {
    setLoading(true);
    try {
      // Mock data - replace with actual API call
      const mockInsights = {
        productivity: {
          velocity: { value: 42, change: 15, trend: 'up', unit: 'points' },
          cycleTime: { value: 3.2, change: -10, trend: 'down', unit: 'days' },
          deploymentFrequency: { value: 8, change: 20, trend: 'up', unit: 'per week' },
          mttr: { value: 45, change: -25, trend: 'down', unit: 'minutes' }
        },
        quality: {
          bugRate: { value: 2.1, change: -15, trend: 'down', unit: '%' },
          codeReviewCoverage: { value: 94, change: 5, trend: 'up', unit: '%' },
          testCoverage: { value: 78, change: 3, trend: 'up', unit: '%' },
          techDebt: { value: 120, change: -8, trend: 'down', unit: 'hours' }
        },
        collaboration: {
          prReviewTime: { value: 4.5, change: -20, trend: 'down', unit: 'hours' },
          teamEngagement: { value: 85, change: 10, trend: 'up', unit: '%' },
          knowledgeSharing: { value: 12, change: 25, trend: 'up', unit: 'sessions' }
        },
        topPerformers: [
          { id: '1', name: 'John Doe', avatar: '', commits: 45, prsReviewed: 23, issuesResolved: 15, deployments: 8, score: 92 },
          { id: '2', name: 'Jane Smith', avatar: '', commits: 38, prsReviewed: 31, issuesResolved: 12, deployments: 6, score: 88 },
          { id: '3', name: 'Bob Johnson', avatar: '', commits: 32, prsReviewed: 18, issuesResolved: 20, deployments: 5, score: 85 }
        ],
        activityDistribution: [
          { name: 'Development', value: 45 },
          { name: 'Code Review', value: 20 },
          { name: 'Testing', value: 15 },
          { name: 'Deployment', value: 10 },
          { name: 'Planning', value: 10 }
        ],
        velocityTrend: [
          { week: 'W1', velocity: 35 },
          { week: 'W2', velocity: 38 },
          { week: 'W3', velocity: 40 },
          { week: 'W4', velocity: 42 }
        ]
      };
      
      setInsights(mockInsights);
    } catch (error) {
      console.error('Error fetching insights:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePeriodChange = (period: string) => {
    setSelectedPeriod(period);
    setAnchorEl(null);
  };

  const renderMetricCard = (title: string, metrics: Record<string, TeamMetric>) => {
    return (
      <Card sx={{ height: '100%' }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            {title}
          </Typography>
          <Grid container spacing={2}>
            {Object.entries(metrics).map(([key, metric]) => (
              <Grid item xs={6} key={key}>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="textSecondary" gutterBottom>
                    {metric.label || key.replace(/([A-Z])/g, ' $1').trim()}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                    <Typography variant="h5">
                      {metric.value}
                    </Typography>
                    {metric.unit && (
                      <Typography variant="body2" color="textSecondary">
                        {metric.unit}
                      </Typography>
                    )}
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    {metric.trend === 'up' ? (
                      <TrendingUp color="success" fontSize="small" />
                    ) : metric.trend === 'down' ? (
                      <TrendingDown color="error" fontSize="small" />
                    ) : null}
                    <Typography
                      variant="caption"
                      color={metric.change >= 0 ? 'success.main' : 'error.main'}
                    >
                      {metric.change >= 0 ? '+' : ''}{metric.change}%
                    </Typography>
                  </Box>
                </Box>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <Box sx={{ p: 2 }}>
        <LinearProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Team Performance Insights</Typography>
        <IconButton onClick={(e) => setAnchorEl(e.currentTarget)}>
          <MoreVert />
        </IconButton>
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={() => setAnchorEl(null)}
        >
          <MenuItem onClick={() => handlePeriodChange('7d')}>Last 7 days</MenuItem>
          <MenuItem onClick={() => handlePeriodChange('30d')}>Last 30 days</MenuItem>
          <MenuItem onClick={() => handlePeriodChange('90d')}>Last 90 days</MenuItem>
        </Menu>
      </Box>

      <Grid container spacing={3}>
        {/* Productivity Metrics */}
        <Grid item xs={12} md={6}>
          {renderMetricCard('Productivity', insights.productivity)}
        </Grid>

        {/* Quality Metrics */}
        <Grid item xs={12} md={6}>
          {renderMetricCard('Quality', insights.quality)}
        </Grid>

        {/* Activity Distribution */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Activity Distribution
              </Typography>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={insights.activityDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {insights.activityDistribution.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <ChartTooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Velocity Trend */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Velocity Trend
              </Typography>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={insights.velocityTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" />
                  <YAxis />
                  <ChartTooltip />
                  <Area type="monotone" dataKey="velocity" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Top Performers */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Top Contributors
              </Typography>
              <List>
                {insights.topPerformers.map((performer: TeamMemberPerformance, index: number) => (
                  <ListItem key={performer.id}>
                    <ListItemIcon>
                      <Avatar src={performer.avatar}>
                        {performer.name.charAt(0)}
                      </Avatar>
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="subtitle1">
                            {performer.name}
                          </Typography>
                          {index === 0 && <EmojiEvents color="warning" />}
                          {index === 1 && <Star color="action" />}
                          {index === 2 && <ThumbUp color="action" />}
                        </Box>
                      }
                      secondary={
                        <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
                          <Chip
                            size="small"
                            icon={<Code />}
                            label={`${performer.commits} commits`}
                          />
                          <Chip
                            size="small"
                            icon={<CheckCircle />}
                            label={`${performer.prsReviewed} PRs reviewed`}
                          />
                          <Chip
                            size="small"
                            icon={<BugReport />}
                            label={`${performer.issuesResolved} issues`}
                          />
                          <Chip
                            size="small"
                            icon={<Speed />}
                            label={`${performer.deployments} deploys`}
                          />
                        </Box>
                      }
                    />
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <Typography variant="h5" color="primary">
                        {performer.score}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        Score
                      </Typography>
                    </Box>
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Collaboration Metrics */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Collaboration Health
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={4}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Schedule color="primary" sx={{ fontSize: 40, mb: 1 }} />
                    <Typography variant="h5">
                      {insights.collaboration.prReviewTime.value} {insights.collaboration.prReviewTime.unit}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Avg PR Review Time
                    </Typography>
                    <Chip
                      size="small"
                      label={`${insights.collaboration.prReviewTime.change}%`}
                      color={insights.collaboration.prReviewTime.change < 0 ? 'success' : 'error'}
                    />
                  </Box>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Group color="primary" sx={{ fontSize: 40, mb: 1 }} />
                    <Typography variant="h5">
                      {insights.collaboration.teamEngagement.value}%
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Team Engagement
                    </Typography>
                    <Chip
                      size="small"
                      label={`+${insights.collaboration.teamEngagement.change}%`}
                      color="success"
                    />
                  </Box>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Star color="primary" sx={{ fontSize: 40, mb: 1 }} />
                    <Typography variant="h5">
                      {insights.collaboration.knowledgeSharing.value}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Knowledge Sessions
                    </Typography>
                    <Chip
                      size="small"
                      label={`+${insights.collaboration.knowledgeSharing.change}%`}
                      color="success"
                    />
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default TeamInsights;