import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  IconButton,
  Avatar,
  Chip,
  Tab,
  Tabs,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Alert,
  Paper,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  ListItemSecondaryAction,
  Badge,
  Tooltip,
  LinearProgress
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  People,
  Settings,
  Activity,
  BarChart,
  TrendingUp,
  Code,
  Build,
  Security,
  Cloud,
  Notifications,
  Add,
  Edit,
  Delete,
  Visibility,
  SwapHoriz,
  Group,
  Person,
  AdminPanelSettings,
  ViewModule,
  DragIndicator
} from '@mui/icons-material';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { useSnackbar } from 'notistack';
import { useTeam } from '../../contexts/TeamContext';
import TeamActivityFeed from './TeamActivityFeed';
import TeamMetricsChart from './TeamMetricsChart';
import TeamProjectCard from './TeamProjectCard';
import TeamResourceUsage from './TeamResourceUsage';
import TeamInsights from './TeamInsights';
import TeamSettings from './TeamSettings';

interface DashboardWidget {
  id: string;
  type: 'metrics' | 'activity' | 'projects' | 'resources' | 'insights' | 'custom';
  title: string;
  size: 'small' | 'medium' | 'large';
  position: number;
  config?: Record<string, any>;
  enabled: boolean;
}

interface TeamDashboardData {
  metrics: {
    totalMembers: number;
    activeProjects: number;
    deployments: number;
    incidents: number;
    resourceUsage: number;
    costTrend: number;
  };
  activity: any[];
  projects: any[];
  resources: any[];
}

const defaultWidgets: DashboardWidget[] = [
  {
    id: 'team-metrics',
    type: 'metrics',
    title: 'Team Overview',
    size: 'large',
    position: 0,
    enabled: true
  },
  {
    id: 'recent-activity',
    type: 'activity',
    title: 'Recent Activity',
    size: 'medium',
    position: 1,
    enabled: true
  },
  {
    id: 'active-projects',
    type: 'projects',
    title: 'Active Projects',
    size: 'medium',
    position: 2,
    enabled: true
  },
  {
    id: 'resource-usage',
    type: 'resources',
    title: 'Resource Usage',
    size: 'medium',
    position: 3,
    enabled: true
  },
  {
    id: 'team-insights',
    type: 'insights',
    title: 'Team Insights',
    size: 'medium',
    position: 4,
    enabled: true
  }
];

const TeamDashboard: React.FC = () => {
  const { currentTeam, switchTeam, teams } = useTeam();
  const [activeTab, setActiveTab] = useState(0);
  const [widgets, setWidgets] = useState<DashboardWidget[]>(defaultWidgets);
  const [dashboardData, setDashboardData] = useState<TeamDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [showWidgetDialog, setShowWidgetDialog] = useState(false);
  const [selectedWidget, setSelectedWidget] = useState<DashboardWidget | null>(null);
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    if (currentTeam) {
      fetchDashboardData();
      loadDashboardConfig();
    }
  }, [currentTeam]);

  const fetchDashboardData = async () => {
    if (!currentTeam) return;

    setLoading(true);
    try {
      // Fetch team-specific dashboard data
      const response = await fetch(`/api/v1/teams/${currentTeam.id}/dashboard`);
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }
      
      const data = await response.json();
      setDashboardData(data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      enqueueSnackbar('Failed to load dashboard data', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const loadDashboardConfig = async () => {
    if (!currentTeam) return;

    try {
      const response = await fetch(`/api/v1/teams/${currentTeam.id}/dashboard/config`);
      if (response.ok) {
        const config = await response.json();
        if (config.widgets) {
          setWidgets(config.widgets);
        }
      }
    } catch (error) {
      console.error('Error loading dashboard config:', error);
    }
  };

  const saveDashboardConfig = async () => {
    if (!currentTeam) return;

    try {
      const response = await fetch(`/api/v1/teams/${currentTeam.id}/dashboard/config`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ widgets }),
      });

      if (!response.ok) {
        throw new Error('Failed to save dashboard config');
      }

      enqueueSnackbar('Dashboard configuration saved', { variant: 'success' });
      setEditMode(false);
    } catch (error) {
      console.error('Error saving dashboard config:', error);
      enqueueSnackbar('Failed to save dashboard configuration', { variant: 'error' });
    }
  };

  const handleTeamSwitch = (teamId: string) => {
    const team = teams.find(t => t.id === teamId);
    if (team) {
      switchTeam(team);
    }
  };

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    const items = Array.from(widgets);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update positions
    const updatedWidgets = items.map((widget, index) => ({
      ...widget,
      position: index
    }));

    setWidgets(updatedWidgets);
  };

  const toggleWidget = (widgetId: string) => {
    setWidgets(widgets.map(w => 
      w.id === widgetId ? { ...w, enabled: !w.enabled } : w
    ));
  };

  const addWidget = (widget: DashboardWidget) => {
    const newWidget = {
      ...widget,
      id: `widget-${Date.now()}`,
      position: widgets.length
    };
    setWidgets([...widgets, newWidget]);
    setShowWidgetDialog(false);
  };

  const removeWidget = (widgetId: string) => {
    setWidgets(widgets.filter(w => w.id !== widgetId));
  };

  const renderWidget = (widget: DashboardWidget) => {
    if (!widget.enabled) return null;

    const getWidgetSize = () => {
      switch (widget.size) {
        case 'small': return { xs: 12, sm: 6, md: 4 };
        case 'medium': return { xs: 12, sm: 6, md: 6 };
        case 'large': return { xs: 12, sm: 12, md: 8 };
        default: return { xs: 12, sm: 6, md: 6 };
      }
    };

    const renderWidgetContent = () => {
      switch (widget.type) {
        case 'metrics':
          return <TeamMetricsChart data={dashboardData?.metrics} />;
        case 'activity':
          return <TeamActivityFeed activities={dashboardData?.activity || []} />;
        case 'projects':
          return (
            <Box>
              {dashboardData?.projects.map((project: any) => (
                <TeamProjectCard key={project.id} project={project} />
              ))}
            </Box>
          );
        case 'resources':
          return <TeamResourceUsage resources={dashboardData?.resources || []} />;
        case 'insights':
          return <TeamInsights teamId={currentTeam?.id} />;
        default:
          return <Typography>Custom widget content</Typography>;
      }
    };

    return (
      <Grid item {...getWidgetSize()} key={widget.id}>
        <Card sx={{ height: '100%', position: 'relative' }}>
          {editMode && (
            <Box sx={{ position: 'absolute', top: 8, right: 8, zIndex: 1 }}>
              <IconButton size="small" onClick={() => toggleWidget(widget.id)}>
                <Visibility />
              </IconButton>
              <IconButton size="small" onClick={() => removeWidget(widget.id)}>
                <Delete />
              </IconButton>
            </Box>
          )}
          <CardContent>
            <Typography variant="h6" gutterBottom>
              {widget.title}
            </Typography>
            {renderWidgetContent()}
          </CardContent>
        </Card>
      </Grid>
    );
  };

  const renderTeamHeader = () => (
    <Paper elevation={0} sx={{ p: 3, mb: 3, bgcolor: 'background.default' }}>
      <Grid container alignItems="center" spacing={3}>
        <Grid item>
          <Avatar
            sx={{ width: 80, height: 80, bgcolor: 'primary.main' }}
          >
            {currentTeam?.name.charAt(0).toUpperCase()}
          </Avatar>
        </Grid>
        <Grid item xs>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="h4">
              {currentTeam?.display_name || currentTeam?.name}
            </Typography>
            <FormControl size="small">
              <Select
                value={currentTeam?.id || ''}
                onChange={(e) => handleTeamSwitch(e.target.value)}
                startAdornment={<SwapHoriz sx={{ mr: 1 }} />}
              >
                {teams.map((team) => (
                  <MenuItem key={team.id} value={team.id}>
                    {team.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
          <Typography variant="body1" color="textSecondary" sx={{ mt: 1 }}>
            {currentTeam?.description}
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
            <Chip
              icon={<People />}
              label={`${currentTeam?.member_count || 0} Members`}
              size="small"
            />
            <Chip
              icon={<Activity />}
              label={`${dashboardData?.metrics.activeProjects || 0} Active Projects`}
              size="small"
              color="primary"
            />
            <Chip
              icon={<TrendingUp />}
              label={`${dashboardData?.metrics.deployments || 0} Deployments`}
              size="small"
              color="success"
            />
          </Box>
        </Grid>
        <Grid item>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title="Team Settings">
              <IconButton onClick={() => setActiveTab(2)}>
                <Settings />
              </IconButton>
            </Tooltip>
            <Tooltip title="Edit Dashboard">
              <IconButton onClick={() => setEditMode(!editMode)}>
                <ViewModule />
              </IconButton>
            </Tooltip>
          </Box>
        </Grid>
      </Grid>
    </Paper>
  );

  const renderDashboardView = () => {
    if (loading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      );
    }

    if (editMode) {
      return (
        <Box>
          <Alert severity="info" sx={{ mb: 2 }}>
            Drag and drop widgets to reorder. Click the eye icon to show/hide widgets.
          </Alert>
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="widgets">
              {(provided) => (
                <Grid
                  container
                  spacing={3}
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                >
                  {widgets
                    .sort((a, b) => a.position - b.position)
                    .map((widget, index) => (
                      <Draggable
                        key={widget.id}
                        draggableId={widget.id}
                        index={index}
                      >
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            style={{
                              ...provided.draggableProps.style,
                              opacity: widget.enabled ? 1 : 0.5
                            }}
                          >
                            <Box {...provided.dragHandleProps} sx={{ cursor: 'move' }}>
                              <DragIndicator sx={{ mb: 1 }} />
                            </Box>
                            {renderWidget(widget)}
                          </div>
                        )}
                      </Draggable>
                    ))}
                  {provided.placeholder}
                </Grid>
              )}
            </Droppable>
          </DragDropContext>
          <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => setShowWidgetDialog(true)}
            >
              Add Widget
            </Button>
            <Button
              variant="contained"
              color="primary"
              onClick={saveDashboardConfig}
            >
              Save Configuration
            </Button>
            <Button
              variant="outlined"
              onClick={() => setEditMode(false)}
            >
              Cancel
            </Button>
          </Box>
        </Box>
      );
    }

    return (
      <Grid container spacing={3}>
        {widgets
          .filter(w => w.enabled)
          .sort((a, b) => a.position - b.position)
          .map(widget => renderWidget(widget))}
      </Grid>
    );
  };

  const renderMembersView = () => (
    <Box>
      <Typography variant="h5" gutterBottom>
        Team Members
      </Typography>
      <List>
        {currentTeam?.members?.map((member: any) => (
          <ListItem key={member.id}>
            <ListItemAvatar>
              <Avatar src={member.avatar_url}>
                {member.full_name?.charAt(0)}
              </Avatar>
            </ListItemAvatar>
            <ListItemText
              primary={member.full_name}
              secondary={
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <Typography variant="body2" color="textSecondary">
                    {member.email}
                  </Typography>
                  <Chip
                    label={member.role}
                    size="small"
                    color={member.role === 'owner' ? 'primary' : 'default'}
                  />
                </Box>
              }
            />
            <ListItemSecondaryAction>
              <IconButton edge="end">
                <AdminPanelSettings />
              </IconButton>
            </ListItemSecondaryAction>
          </ListItem>
        ))}
      </List>
    </Box>
  );

  const renderSettingsView = () => (
    <TeamSettings team={currentTeam} onUpdate={fetchDashboardData} />
  );

  if (!currentTeam) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="info">
          Please select a team to view the dashboard
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1 }}>
      {renderTeamHeader()}
      
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
          <Tab label="Dashboard" icon={<DashboardIcon />} iconPosition="start" />
          <Tab label="Members" icon={<People />} iconPosition="start" />
          <Tab label="Settings" icon={<Settings />} iconPosition="start" />
        </Tabs>
      </Box>

      <Box sx={{ p: 3 }}>
        {activeTab === 0 && renderDashboardView()}
        {activeTab === 1 && renderMembersView()}
        {activeTab === 2 && renderSettingsView()}
      </Box>

      {/* Add Widget Dialog */}
      <Dialog
        open={showWidgetDialog}
        onClose={() => setShowWidgetDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Add Widget</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            Choose a widget type to add to your dashboard
          </Typography>
          <List>
            <ListItem button onClick={() => addWidget({
              id: '',
              type: 'metrics',
              title: 'Custom Metrics',
              size: 'medium',
              position: 0,
              enabled: true
            })}>
              <ListItemIcon><BarChart /></ListItemIcon>
              <ListItemText primary="Metrics" secondary="Display custom metrics and KPIs" />
            </ListItem>
            <ListItem button onClick={() => addWidget({
              id: '',
              type: 'activity',
              title: 'Activity Feed',
              size: 'medium',
              position: 0,
              enabled: true
            })}>
              <ListItemIcon><Activity /></ListItemIcon>
              <ListItemText primary="Activity Feed" secondary="Show recent team activities" />
            </ListItem>
            <ListItem button onClick={() => addWidget({
              id: '',
              type: 'custom',
              title: 'Custom Widget',
              size: 'medium',
              position: 0,
              enabled: true
            })}>
              <ListItemIcon><ViewModule /></ListItemIcon>
              <ListItemText primary="Custom Widget" secondary="Create your own widget" />
            </ListItem>
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowWidgetDialog(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TeamDashboard;