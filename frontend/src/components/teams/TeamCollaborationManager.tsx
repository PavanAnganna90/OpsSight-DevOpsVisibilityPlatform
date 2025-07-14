import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Tab,
  Tabs,
  Grid,
  Alert,
  CircularProgress,
  Avatar,
  Badge,
  Tooltip,
  Paper,
  Divider,
  LinearProgress,
  Collapse,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import {
  Add,
  Send,
  Check,
  Close,
  Share,
  Group,
  Timeline,
  Settings,
  ExpandMore,
  ExpandLess,
  Visibility,
  Edit,
  Delete,
  AccessTime,
  TrendingUp,
  Security,
  Handshake,
  School,
  BusinessCenter
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { useTeam } from '../../contexts/TeamContext';

interface Collaboration {
  id: number;
  requesting_team_id: number;
  target_team_id: number;
  collaboration_type: string;
  title: string;
  description?: string;
  status: string;
  requested_at: string;
  approved_at?: string;
  start_date?: string;
  end_date?: string;
  requesting_team: { id: number; name: string };
  target_team: { id: number; name: string };
  requested_by: { id: number; name: string; email: string };
  approved_by?: { id: number; name: string; email: string };
  shared_resources_count: number;
  metadata?: any;
}

interface SharedResource {
  id: number;
  collaboration_id: number;
  resource_type: string;
  resource_id: string;
  resource_name: string;
  permissions: any;
  access_level: string;
  shared_at: string;
  expires_at?: string;
  is_active: boolean;
  access_count: number;
  last_accessed_at?: string;
}

const collaborationTypes = [
  { value: 'resource_sharing', label: 'Resource Sharing', icon: <Share /> },
  { value: 'project_collaboration', label: 'Project Collaboration', icon: <BusinessCenter /> },
  { value: 'knowledge_sharing', label: 'Knowledge Sharing', icon: <School /> },
  { value: 'mentoring', label: 'Mentoring', icon: <Group /> },
  { value: 'cross_training', label: 'Cross Training', icon: <TrendingUp /> }
];

const TeamCollaborationManager: React.FC = () => {
  const { state: teamState } = useTeam();
  const [activeTab, setActiveTab] = useState(0);
  const [collaborations, setCollaborations] = useState<Collaboration[]>([]);
  const [sharedResources, setSharedResources] = useState<SharedResource[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showResourceDialog, setShowResourceDialog] = useState(false);
  const [selectedCollaboration, setSelectedCollaboration] = useState<Collaboration | null>(null);
  const [expandedCollabs, setExpandedCollabs] = useState<Set<number>>(new Set());
  const [analytics, setAnalytics] = useState<any>(null);
  const { enqueueSnackbar } = useSnackbar();

  const [newCollaboration, setNewCollaboration] = useState({
    target_team_id: '',
    collaboration_type: '',
    title: '',
    description: '',
    duration_days: 30,
    collaboration_goals: [''],
    success_metrics: ['']
  });

  const [newResource, setNewResource] = useState({
    resource_type: '',
    resource_id: '',
    resource_name: '',
    access_level: 'read',
    permissions: {},
    expires_at: ''
  });

  useEffect(() => {
    if (teamState.currentTeam) {
      fetchCollaborations();
      fetchSharedResources();
      fetchAnalytics();
    }
  }, [teamState.currentTeam]);

  const fetchCollaborations = async () => {
    if (!teamState.currentTeam) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/v1/collaborations/teams/${teamState.currentTeam.id}/collaborations`);
      if (!response.ok) throw new Error('Failed to fetch collaborations');
      
      const data = await response.json();
      setCollaborations(data);
    } catch (error) {
      console.error('Error fetching collaborations:', error);
      enqueueSnackbar('Failed to load collaborations', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const fetchSharedResources = async () => {
    if (!teamState.currentTeam) return;

    try {
      const response = await fetch(`/api/v1/collaborations/teams/${teamState.currentTeam.id}/shared-resources`);
      if (!response.ok) throw new Error('Failed to fetch shared resources');
      
      const data = await response.json();
      setSharedResources(data);
    } catch (error) {
      console.error('Error fetching shared resources:', error);
    }
  };

  const fetchAnalytics = async () => {
    if (!teamState.currentTeam) return;

    try {
      const response = await fetch(`/api/v1/collaborations/teams/${teamState.currentTeam.id}/analytics`);
      if (!response.ok) throw new Error('Failed to fetch analytics');
      
      const data = await response.json();
      setAnalytics(data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  const handleCreateCollaboration = async () => {
    try {
      const response = await fetch('/api/v1/collaborations/requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...newCollaboration,
          target_team_id: parseInt(newCollaboration.target_team_id),
          collaboration_goals: newCollaboration.collaboration_goals.filter(g => g.trim()),
          success_metrics: newCollaboration.success_metrics.filter(m => m.trim())
        }),
      });

      if (!response.ok) throw new Error('Failed to create collaboration');

      enqueueSnackbar('Collaboration request created successfully', { variant: 'success' });
      setShowCreateDialog(false);
      setNewCollaboration({
        target_team_id: '',
        collaboration_type: '',
        title: '',
        description: '',
        duration_days: 30,
        collaboration_goals: [''],
        success_metrics: ['']
      });
      fetchCollaborations();
    } catch (error) {
      console.error('Error creating collaboration:', error);
      enqueueSnackbar('Failed to create collaboration request', { variant: 'error' });
    }
  };

  const handleApproveCollaboration = async (collaborationId: number, approved: boolean) => {
    try {
      const response = await fetch(`/api/v1/collaborations/requests/${collaborationId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ approved }),
      });

      if (!response.ok) throw new Error('Failed to process approval');

      enqueueSnackbar(
        `Collaboration ${approved ? 'approved' : 'rejected'} successfully`,
        { variant: 'success' }
      );
      fetchCollaborations();
    } catch (error) {
      console.error('Error processing approval:', error);
      enqueueSnackbar('Failed to process collaboration approval', { variant: 'error' });
    }
  };

  const handleShareResource = async () => {
    if (!selectedCollaboration) return;

    try {
      const response = await fetch(`/api/v1/collaborations/collaborations/${selectedCollaboration.id}/share-resource`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newResource),
      });

      if (!response.ok) throw new Error('Failed to share resource');

      enqueueSnackbar('Resource shared successfully', { variant: 'success' });
      setShowResourceDialog(false);
      setNewResource({
        resource_type: '',
        resource_id: '',
        resource_name: '',
        access_level: 'read',
        permissions: {},
        expires_at: ''
      });
      fetchSharedResources();
    } catch (error) {
      console.error('Error sharing resource:', error);
      enqueueSnackbar('Failed to share resource', { variant: 'error' });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'approved': return 'success';
      case 'active': return 'primary';
      case 'rejected': return 'error';
      case 'completed': return 'info';
      default: return 'default';
    }
  };

  const getTypeIcon = (type: string) => {
    const typeConfig = collaborationTypes.find(t => t.value === type);
    return typeConfig?.icon || <Handshake />;
  };

  const toggleCollaborationExpansion = (id: number) => {
    setExpandedCollabs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const renderCollaborationsList = () => (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6">Team Collaborations</Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setShowCreateDialog(true)}
        >
          Request Collaboration
        </Button>
      </Box>

      {loading ? (
        <CircularProgress />
      ) : (
        <List>
          {collaborations.map((collaboration) => (
            <Card key={collaboration.id} sx={{ mb: 2 }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box sx={{ flex: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                      {getTypeIcon(collaboration.collaboration_type)}
                      <Typography variant="h6">{collaboration.title}</Typography>
                      <Chip
                        label={collaboration.status}
                        color={getStatusColor(collaboration.status) as any}
                        size="small"
                      />
                    </Box>
                    
                    <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                      {collaboration.description}
                    </Typography>

                    <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                      <Chip
                        label={`From: ${collaboration.requesting_team.name}`}
                        size="small"
                        variant="outlined"
                      />
                      <Chip
                        label={`To: ${collaboration.target_team.name}`}
                        size="small"
                        variant="outlined"
                      />
                      <Chip
                        label={`${collaboration.shared_resources_count} Resources`}
                        size="small"
                        icon={<Share />}
                      />
                    </Box>
                  </Box>

                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
                    {collaboration.status === 'pending' && collaboration.target_team_id === teamState.currentTeam?.id && (
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                          size="small"
                          variant="contained"
                          color="success"
                          startIcon={<Check />}
                          onClick={() => handleApproveCollaboration(collaboration.id, true)}
                        >
                          Approve
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          color="error"
                          startIcon={<Close />}
                          onClick={() => handleApproveCollaboration(collaboration.id, false)}
                        >
                          Reject
                        </Button>
                      </Box>
                    )}

                    {collaboration.status === 'approved' && (
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<Share />}
                        onClick={() => {
                          setSelectedCollaboration(collaboration);
                          setShowResourceDialog(true);
                        }}
                      >
                        Share Resource
                      </Button>
                    )}

                    <IconButton
                      size="small"
                      onClick={() => toggleCollaborationExpansion(collaboration.id)}
                    >
                      {expandedCollabs.has(collaboration.id) ? <ExpandLess /> : <ExpandMore />}
                    </IconButton>
                  </Box>
                </Box>

                <Collapse in={expandedCollabs.has(collaboration.id)}>
                  <Divider sx={{ my: 2 }} />
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2" gutterBottom>Timeline</Typography>
                      <Typography variant="body2">
                        Requested: {new Date(collaboration.requested_at).toLocaleDateString()}
                      </Typography>
                      {collaboration.approved_at && (
                        <Typography variant="body2">
                          Approved: {new Date(collaboration.approved_at).toLocaleDateString()}
                        </Typography>
                      )}
                      {collaboration.start_date && (
                        <Typography variant="body2">
                          Started: {new Date(collaboration.start_date).toLocaleDateString()}
                        </Typography>
                      )}
                      {collaboration.end_date && (
                        <Typography variant="body2">
                          Ends: {new Date(collaboration.end_date).toLocaleDateString()}
                        </Typography>
                      )}
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2" gutterBottom>People</Typography>
                      <Typography variant="body2">
                        Requested by: {collaboration.requested_by.name}
                      </Typography>
                      {collaboration.approved_by && (
                        <Typography variant="body2">
                          Approved by: {collaboration.approved_by.name}
                        </Typography>
                      )}
                    </Grid>
                  </Grid>
                </Collapse>
              </CardContent>
            </Card>
          ))}
        </List>
      )}
    </Box>
  );

  const renderSharedResources = () => (
    <Box>
      <Typography variant="h6" gutterBottom>Shared Resources</Typography>
      
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Resource Name</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Access Level</TableCell>
              <TableCell>Shared Date</TableCell>
              <TableCell>Access Count</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sharedResources.map((resource) => (
              <TableRow key={resource.id}>
                <TableCell>{resource.resource_name}</TableCell>
                <TableCell>
                  <Chip label={resource.resource_type} size="small" />
                </TableCell>
                <TableCell>
                  <Chip
                    label={resource.access_level}
                    size="small"
                    color={resource.access_level === 'admin' ? 'error' : resource.access_level === 'write' ? 'warning' : 'info'}
                  />
                </TableCell>
                <TableCell>
                  {new Date(resource.shared_at).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <Badge badgeContent={resource.access_count} color="primary">
                    <Visibility />
                  </Badge>
                </TableCell>
                <TableCell>
                  <Chip
                    label={resource.is_active ? 'Active' : 'Revoked'}
                    size="small"
                    color={resource.is_active ? 'success' : 'error'}
                  />
                </TableCell>
                <TableCell>
                  <IconButton size="small" onClick={() => {/* Handle view details */}}>
                    <Visibility />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );

  const renderAnalytics = () => (
    <Box>
      <Typography variant="h6" gutterBottom>Collaboration Analytics</Typography>
      
      {analytics && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h4" color="primary">
                  {analytics.total_collaborations}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Total Collaborations
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h4" color="success.main">
                  {analytics.status_breakdown?.approved || 0}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Approved
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h4" color="warning.main">
                  {analytics.status_breakdown?.pending || 0}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Pending
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h4" color="info.main">
                  {analytics.total_shared_resources}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Shared Resources
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Box>
  );

  if (!teamState.currentTeam) {
    return (
      <Alert severity="info">
        Please select a team to manage collaborations
      </Alert>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Team Collaboration
      </Typography>

      <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)} sx={{ mb: 3 }}>
        <Tab label="Collaborations" icon={<Handshake />} iconPosition="start" />
        <Tab label="Shared Resources" icon={<Share />} iconPosition="start" />
        <Tab label="Analytics" icon={<Timeline />} iconPosition="start" />
      </Tabs>

      {activeTab === 0 && renderCollaborationsList()}
      {activeTab === 1 && renderSharedResources()}
      {activeTab === 2 && renderAnalytics()}

      {/* Create Collaboration Dialog */}
      <Dialog open={showCreateDialog} onClose={() => setShowCreateDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Request Team Collaboration</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Target Team ID"
                type="number"
                value={newCollaboration.target_team_id}
                onChange={(e) => setNewCollaboration({...newCollaboration, target_team_id: e.target.value})}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Collaboration Type</InputLabel>
                <Select
                  value={newCollaboration.collaboration_type}
                  onChange={(e) => setNewCollaboration({...newCollaboration, collaboration_type: e.target.value})}
                >
                  {collaborationTypes.map((type) => (
                    <MenuItem key={type.value} value={type.value}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {type.icon}
                        {type.label}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Title"
                value={newCollaboration.title}
                onChange={(e) => setNewCollaboration({...newCollaboration, title: e.target.value})}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Description"
                value={newCollaboration.description}
                onChange={(e) => setNewCollaboration({...newCollaboration, description: e.target.value})}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Duration (days)"
                type="number"
                value={newCollaboration.duration_days}
                onChange={(e) => setNewCollaboration({...newCollaboration, duration_days: parseInt(e.target.value)})}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCreateDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateCollaboration} startIcon={<Send />}>
            Send Request
          </Button>
        </DialogActions>
      </Dialog>

      {/* Share Resource Dialog */}
      <Dialog open={showResourceDialog} onClose={() => setShowResourceDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Share Resource</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Resource Type"
                value={newResource.resource_type}
                onChange={(e) => setNewResource({...newResource, resource_type: e.target.value})}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Resource ID"
                value={newResource.resource_id}
                onChange={(e) => setNewResource({...newResource, resource_id: e.target.value})}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Resource Name"
                value={newResource.resource_name}
                onChange={(e) => setNewResource({...newResource, resource_name: e.target.value})}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Access Level</InputLabel>
                <Select
                  value={newResource.access_level}
                  onChange={(e) => setNewResource({...newResource, access_level: e.target.value})}
                >
                  <MenuItem value="read">Read Only</MenuItem>
                  <MenuItem value="write">Read & Write</MenuItem>
                  <MenuItem value="admin">Admin Access</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowResourceDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleShareResource} startIcon={<Share />}>
            Share Resource
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TeamCollaborationManager;