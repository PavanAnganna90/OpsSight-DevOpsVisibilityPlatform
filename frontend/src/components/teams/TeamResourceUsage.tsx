import React from 'react';
import {
  Box,
  Typography,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Paper,
  Grid,
  Tooltip,
  Alert
} from '@mui/material';
import {
  Memory,
  Storage,
  Speed,
  CloudQueue,
  DataUsage,
  Warning,
  CheckCircle,
  Error as ErrorIcon
} from '@mui/icons-material';

interface Resource {
  id: string;
  name: string;
  type: 'cpu' | 'memory' | 'storage' | 'network' | 'custom';
  current: number;
  limit: number;
  unit: string;
  status: 'healthy' | 'warning' | 'critical';
  trend?: 'up' | 'down' | 'stable';
  cost?: number;
}

interface TeamResourceUsageProps {
  resources?: Resource[];
  teamId?: string;
}

const TeamResourceUsage: React.FC<TeamResourceUsageProps> = ({ resources = [] }) => {
  const getResourceIcon = (type: string) => {
    switch (type) {
      case 'cpu':
        return <Speed />;
      case 'memory':
        return <Memory />;
      case 'storage':
        return <Storage />;
      case 'network':
        return <DataUsage />;
      default:
        return <CloudQueue />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'success';
      case 'warning':
        return 'warning';
      case 'critical':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle color="success" fontSize="small" />;
      case 'warning':
        return <Warning color="warning" fontSize="small" />;
      case 'critical':
        return <ErrorIcon color="error" fontSize="small" />;
      default:
        return null;
    }
  };

  const calculateUsagePercentage = (current: number, limit: number) => {
    return limit > 0 ? (current / limit) * 100 : 0;
  };

  const getProgressColor = (percentage: number): 'primary' | 'warning' | 'error' => {
    if (percentage >= 90) return 'error';
    if (percentage >= 75) return 'warning';
    return 'primary';
  };

  const getTotalResourceSummary = () => {
    const totalResources = resources.length;
    const healthyResources = resources.filter(r => r.status === 'healthy').length;
    const warningResources = resources.filter(r => r.status === 'warning').length;
    const criticalResources = resources.filter(r => r.status === 'critical').length;
    
    const totalCost = resources.reduce((sum, r) => sum + (r.cost || 0), 0);

    return {
      total: totalResources,
      healthy: healthyResources,
      warning: warningResources,
      critical: criticalResources,
      cost: totalCost
    };
  };

  if (resources.length === 0) {
    return (
      <Box>
        <Alert severity="info">
          No resource usage data available for this team.
        </Alert>
      </Box>
    );
  }

  const summary = getTotalResourceSummary();

  return (
    <Box>
      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h4" color="primary">
              {summary.total}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Total Resources
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h4" color="success.main">
              {summary.healthy}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Healthy
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h4" color="warning.main">
              {summary.warning}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Warnings
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h4" color="error.main">
              {summary.critical}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Critical
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Resource List */}
      <List>
        {resources.map((resource) => {
          const usagePercentage = calculateUsagePercentage(resource.current, resource.limit);
          const progressColor = getProgressColor(usagePercentage);

          return (
            <ListItem key={resource.id} sx={{ px: 0 }}>
              <Paper sx={{ width: '100%', p: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <ListItemIcon>
                    {getResourceIcon(resource.type)}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="subtitle1">
                          {resource.name}
                        </Typography>
                        {getStatusIcon(resource.status)}
                        <Chip
                          label={resource.status}
                          size="small"
                          color={getStatusColor(resource.status) as any}
                        />
                        {resource.trend && (
                          <Chip
                            label={resource.trend}
                            size="small"
                            variant="outlined"
                          />
                        )}
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="body2" color="textSecondary">
                            {resource.current} / {resource.limit} {resource.unit}
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            {usagePercentage.toFixed(1)}%
                          </Typography>
                        </Box>
                        <Tooltip title={`${resource.current} / ${resource.limit} ${resource.unit}`}>
                          <LinearProgress
                            variant="determinate"
                            value={usagePercentage}
                            color={progressColor}
                            sx={{ height: 8, borderRadius: 1 }}
                          />
                        </Tooltip>
                        {resource.cost !== undefined && (
                          <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
                            Estimated cost: ${resource.cost.toFixed(2)}/month
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                </Box>
              </Paper>
            </ListItem>
          );
        })}
      </List>

      {/* Total Cost */}
      {summary.cost > 0 && (
        <Paper sx={{ p: 2, mt: 2, bgcolor: 'grey.50' }}>
          <Typography variant="subtitle1" gutterBottom>
            Total Estimated Cost
          </Typography>
          <Typography variant="h5" color="primary">
            ${summary.cost.toFixed(2)}/month
          </Typography>
        </Paper>
      )}
    </Box>
  );
};

export default TeamResourceUsage;