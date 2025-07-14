import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Button,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Grid,
  Alert,
  Tabs,
  Tab,
  Paper,
  Avatar,
  Tooltip,
  LinearProgress,
  Badge,
  Divider
} from '@mui/material';
import {
  Share,
  Group,
  Send,
  Check,
  Close,
  Visibility,
  Edit,
  Schedule,
  Security,
  Warning,
  Info,
  Add,
  Search,
  FilterList,
  MoreVert,
  Handshake,
  Key,
  AccessTime,
  Person
} from '@mui/icons-material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useSnackbar } from 'notistack';
import { useTeam } from '../../contexts/TeamContext';

interface CollaborationRequest {
  id: string;
  requesting_team: {
    id: string;
    name: string;
    avatar_url?: string;
  };
  target_team: {
    id: string;
    name: string;
    avatar_url?: string;
  };
  collaboration_type: string;
  resource_type?: string;
  resource_id?: string;
  resource_name?: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  access_level: string;
  requested_by: {
    id: string;
    name: string;
    email: string;
  };
  approved_by?: {
    id: string;
    name: string;
    email: string;
  };
  request_message?: string;
  approval_message?: string;
  requested_at: string;
  responded_at?: string;
  valid_from?: string;
  valid_until?: string;
}

interface SharedResource {
  id: string;
  resource_type: string;
  resource_name: string;
  shared_with_team: {
    id: string;
    name: string;
  };
  access_level: string;
  shared_at: string;
  expires_at?: string;
  usage_count: number;
  last_accessed?: string;
}

const TeamCollaboration: React.FC = () => {
  const { currentTeam } = useTeam();
  const [activeTab, setActiveTab] = useState(0);
  const [collaborationRequests, setCollaborationRequests] = useState<CollaborationRequest[]>([]);
  const [sharedResources, setSharedResources] = useState<SharedResource[]>([]);
  const [availableTeams, setAvailableTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<CollaborationRequest | null>(null);
  const { enqueueSnackbar } = useSnackbar();

  // Request form state
  const [requestForm, setRequestForm] = useState({
    target_team_id: '',
    collaboration_type: 'resource_share',
    resource_type: '',
    resource_id: '',
    resource_name: '',
    access_level: 'viewer',
    request_message: '',
    valid_from: null as Date | null,
    valid_until: null as Date | null
  });

  useEffect(() => {
    if (currentTeam) {
      fetchCollaborationData();
      fetchAvailableTeams();
    }
  }, [currentTeam]);

  const fetchCollaborationData = async () => {
    setLoading(true);
    try {
      const [requestsResponse, resourcesResponse] = await Promise.all([
        fetch(`/api/v1/teams/${currentTeam?.id}/collaborations`),
        fetch(`/api/v1/teams/${currentTeam?.id}/shared-resources`)
      ]);

      if (requestsResponse.ok) {
        const requestsData = await requestsResponse.json();
        setCollaborationRequests(requestsData.requests || []);
      }

      if (resourcesResponse.ok) {
        const resourcesData = await resourcesResponse.json();
        setSharedResources(resourcesData.resources || []);
      }
    } catch (error) {
      console.error('Error fetching collaboration data:', error);
      enqueueSnackbar('Failed to load collaboration data', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableTeams = async () => {
    try {
      const response = await fetch('/api/v1/teams');
      if (response.ok) {
        const data = await response.json();
        setAvailableTeams(data.teams?.filter((t: any) => t.id !== currentTeam?.id) || []);
      }
    } catch (error) {
      console.error('Error fetching teams:', error);
    }
  };

  const handleRequestCollaboration = async () => {
    try {
      const response = await fetch(`/api/v1/teams/${currentTeam?.id}/collaborate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestForm)
      });

      if (!response.ok) {
        throw new Error('Failed to send collaboration request');
      }

      enqueueSnackbar('Collaboration request sent successfully', { variant: 'success' });
      setShowRequestDialog(false);
      setRequestForm({
        target_team_id: '',
        collaboration_type: 'resource_share',
        resource_type: '',
        resource_id: '',
        resource_name: '',
        access_level: 'viewer',
        request_message: '',
        valid_from: null,
        valid_until: null
      });
      fetchCollaborationData();
    } catch (error) {
      console.error('Error sending collaboration request:', error);
      enqueueSnackbar('Failed to send collaboration request', { variant: 'error' });
    }
  };

  const handleResponseToRequest = async (requestId: string, action: 'approve' | 'reject', message?: string) => {
    try {
      const response = await fetch(`/api/v1/teams/${currentTeam?.id}/collaborations/${requestId}/respond`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action, message })
      });

      if (!response.ok) {
        throw new Error(`Failed to ${action} collaboration request`);
      }

      enqueueSnackbar(`Collaboration request ${action}d successfully`, { variant: 'success' });
      fetchCollaborationData();
    } catch (error) {
      console.error(`Error ${action}ing collaboration request:`, error);
      enqueueSnackbar(`Failed to ${action} collaboration request`, { variant: 'error' });
    }
  };

  const handleRevokeAccess = async (resourceId: string) => {
    try {
      const response = await fetch(`/api/v1/teams/${currentTeam?.id}/shared-resources/${resourceId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to revoke access');
      }

      enqueueSnackbar('Access revoked successfully', { variant: 'success' });
      fetchCollaborationData();
    } catch (error) {
      console.error('Error revoking access:', error);
      enqueueSnackbar('Failed to revoke access', { variant: 'error' });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'success';
      case 'pending':
        return 'warning';
      case 'rejected':
        return 'error';
      case 'expired':
        return 'default';
      default:
        return 'default';
    }
  };

  const getAccessLevelColor = (level: string) => {
    switch (level) {
      case 'owner':
        return 'error';
      case 'admin':
        return 'warning';
      case 'editor':
        return 'info';
      case 'user':
        return 'primary';
      case 'viewer':
        return 'default';
      default:
        return 'default';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const isExpired = (expiresAt?: string) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  const renderIncomingRequests = () => {
    const incomingRequests = collaborationRequests.filter(
      r => r.target_team.id === currentTeam?.id && r.status === 'pending'
    );

    return (
      <Box>
        <Typography variant="h6" gutterBottom>
          Incoming Collaboration Requests
          <Badge badgeContent={incomingRequests.length} color="primary" sx={{ ml: 2 }}>
            <Group />
          </Badge>
        </Typography>

        {incomingRequests.length === 0 ? (
          <Alert severity="info">No pending collaboration requests</Alert>
        ) : (
          <List>
            {incomingRequests.map((request) => (
              <ListItem key={request.id}>
                <Card sx={{ width: '100%' }}>
                  <CardContent>
                    <Grid container spacing={2} alignItems="center">
                      <Grid item>
                        <Avatar src={request.requesting_team.avatar_url}>
                          {request.requesting_team.name.charAt(0)}
                        </Avatar>
                      </Grid>
                      <Grid item xs>
                        <Typography variant="subtitle1">
                          {request.requesting_team.name} wants to collaborate
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          {request.collaboration_type === 'resource_share' ? 
                            `Share access to ${request.resource_name || request.resource_type}` :
                            request.collaboration_type
                          }
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                          <Chip
                            size="small"
                            label={request.access_level}
                            color={getAccessLevelColor(request.access_level) as any}
                          />
                          <Chip
                            size="small"
                            icon={<Person />}
                            label={request.requested_by.name}
                          />
                          <Chip
                            size="small"
                            icon={<AccessTime />}
                            label={formatDate(request.requested_at)}
                          />
                        </Box>
                        {request.request_message && (
                          <Typography variant="body2" sx={{ mt: 1, p: 1, bgcolor: 'grey.100', borderRadius: 1 }}>
                            "{request.request_message}"
                          </Typography>
                        )}
                      </Grid>
                      <Grid item>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Button
                            variant="contained"
                            color="success"
                            size="small"
                            startIcon={<Check />}
                            onClick={() => handleResponseToRequest(request.id, 'approve')}
                          >
                            Approve
                          </Button>
                          <Button
                            variant="outlined"
                            color="error"
                            size="small"
                            startIcon={<Close />}
                            onClick={() => handleResponseToRequest(request.id, 'reject')}
                          >
                            Reject
                          </Button>
                        </Box>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </ListItem>
            ))}
          </List>
        )}
      </Box>
    );
  };

  const renderOutgoingRequests = () => {
    const outgoingRequests = collaborationRequests.filter(
      r => r.requesting_team.id === currentTeam?.id
    );

    return (
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            Outgoing Collaboration Requests
          </Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setShowRequestDialog(true)}
          >
            Request Collaboration
          </Button>
        </Box>

        {outgoingRequests.length === 0 ? (
          <Alert severity="info">No collaboration requests sent</Alert>
        ) : (
          <List>
            {outgoingRequests.map((request) => (
              <ListItem key={request.id}>
                <Card sx={{ width: '100%' }}>
                  <CardContent>
                    <Grid container spacing={2} alignItems="center">
                      <Grid item>
                        <Avatar src={request.target_team.avatar_url}>
                          {request.target_team.name.charAt(0)}
                        </Avatar>
                      </Grid>
                      <Grid item xs>
                        <Typography variant="subtitle1">
                          Request to {request.target_team.name}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          {request.collaboration_type === 'resource_share' ? 
                            `Share ${request.resource_name || request.resource_type}` :
                            request.collaboration_type
                          }
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                          <Chip
                            size="small"
                            label={request.status}
                            color={getStatusColor(request.status) as any}
                          />
                          <Chip
                            size="small"
                            label={request.access_level}
                            color={getAccessLevelColor(request.access_level) as any}
                          />
                          <Chip
                            size="small"
                            icon={<AccessTime />}
                            label={formatDate(request.requested_at)}
                          />
                        </Box>
                        {request.approval_message && (
                          <Typography variant="body2" sx={{ mt: 1, p: 1, bgcolor: 'grey.100', borderRadius: 1 }}>
                            Response: "{request.approval_message}"
                          </Typography>
                        )}
                      </Grid>
                      <Grid item>
                        <IconButton onClick={() => setSelectedRequest(request)}>
                          <Visibility />
                        </IconButton>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </ListItem>
            ))}
          </List>
        )}
      </Box>
    );
  };

  const renderSharedResources = () => (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">
          Shared Resources
        </Typography>
        <Button
          variant="contained"
          startIcon={<Share />}
          onClick={() => setShowShareDialog(true)}
        >
          Share Resource
        </Button>
      </Box>

      {sharedResources.length === 0 ? (
        <Alert severity="info">No resources currently shared</Alert>
      ) : (
        <List>
          {sharedResources.map((resource) => (
            <ListItem key={resource.id}>
              <Card sx={{ width: '100%' }}>
                <CardContent>
                  <Grid container spacing={2} alignItems="center">
                    <Grid item xs>
                      <Typography variant="subtitle1">
                        {resource.resource_name}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        {resource.resource_type} shared with {resource.shared_with_team.name}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                        <Chip
                          size="small"
                          label={resource.access_level}
                          color={getAccessLevelColor(resource.access_level) as any}
                        />
                        <Chip
                          size="small"
                          icon={<Visibility />}
                          label={`${resource.usage_count} uses`}
                        />
                        {resource.expires_at && (
                          <Chip
                            size="small"
                            icon={<Schedule />}
                            label={isExpired(resource.expires_at) ? 'Expired' : `Expires ${formatDate(resource.expires_at)}`}
                            color={isExpired(resource.expires_at) ? 'error' : 'default'}
                          />
                        )}
                      </Box>
                      {resource.last_accessed && (
                        <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 1 }}>
                          Last accessed: {formatDate(resource.last_accessed)}
                        </Typography>
                      )}
                    </Grid>
                    <Grid item>
                      <Button
                        variant="outlined"
                        color="error"
                        size="small"
                        onClick={() => handleRevokeAccess(resource.id)}
                      >
                        Revoke
                      </Button>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </ListItem>
          ))}
        </List>
      )}
    </Box>
  );

  if (loading) {
    return (
      <Box sx={{ p: 2 }}>
        <LinearProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Team Collaboration
      </Typography>
      <Typography variant="body2" color="textSecondary" gutterBottom>
        Manage cross-team collaboration and resource sharing
      </Typography>

      <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)} sx={{ mb: 3 }}>
        <Tab label="Incoming Requests" icon={<Badge badgeContent={collaborationRequests.filter(r => r.target_team.id === currentTeam?.id && r.status === 'pending').length} color="primary"><Group /></Badge>} />
        <Tab label="Outgoing Requests" />
        <Tab label="Shared Resources" />
      </Tabs>

      {activeTab === 0 && renderIncomingRequests()}
      {activeTab === 1 && renderOutgoingRequests()}
      {activeTab === 2 && renderSharedResources()}

      {/* Request Collaboration Dialog */}
      <Dialog
        open={showRequestDialog}
        onClose={() => setShowRequestDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Request Team Collaboration</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Target Team</InputLabel>
                <Select
                  value={requestForm.target_team_id}
                  onChange={(e) => setRequestForm({ ...requestForm, target_team_id: e.target.value })}
                >
                  {availableTeams.map((team) => (
                    <MenuItem key={team.id} value={team.id}>
                      {team.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Collaboration Type</InputLabel>
                <Select
                  value={requestForm.collaboration_type}
                  onChange={(e) => setRequestForm({ ...requestForm, collaboration_type: e.target.value })}
                >
                  <MenuItem value="resource_share">Resource Sharing</MenuItem>
                  <MenuItem value="project_access">Project Access</MenuItem>
                  <MenuItem value="knowledge_share">Knowledge Sharing</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Access Level</InputLabel>
                <Select
                  value={requestForm.access_level}
                  onChange={(e) => setRequestForm({ ...requestForm, access_level: e.target.value })}
                >
                  <MenuItem value="viewer">Viewer</MenuItem>
                  <MenuItem value="user">User</MenuItem>
                  <MenuItem value="editor">Editor</MenuItem>
                  <MenuItem value="admin">Admin</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {requestForm.collaboration_type === 'resource_share' && (
              <>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Resource Type"
                    value={requestForm.resource_type}
                    onChange={(e) => setRequestForm({ ...requestForm, resource_type: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Resource Name"
                    value={requestForm.resource_name}
                    onChange={(e) => setRequestForm({ ...requestForm, resource_name: e.target.value })}
                  />
                </Grid>
              </>
            )}

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Request Message"
                multiline
                rows={3}
                value={requestForm.request_message}
                onChange={(e) => setRequestForm({ ...requestForm, request_message: e.target.value })}
                placeholder="Explain why you need this collaboration..."
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DateTimePicker
                  label="Valid From"
                  value={requestForm.valid_from}
                  onChange={(date) => setRequestForm({ ...requestForm, valid_from: date })}
                  renderInput={(params) => <TextField {...params} fullWidth />}
                />
              </LocalizationProvider>
            </Grid>

            <Grid item xs={12} md={6}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DateTimePicker
                  label="Valid Until"
                  value={requestForm.valid_until}
                  onChange={(date) => setRequestForm({ ...requestForm, valid_until: date })}
                  renderInput={(params) => <TextField {...params} fullWidth />}
                />
              </LocalizationProvider>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowRequestDialog(false)}>Cancel</Button>
          <Button
            onClick={handleRequestCollaboration}
            variant="contained"
            disabled={!requestForm.target_team_id}
          >
            Send Request
          </Button>
        </DialogActions>
      </Dialog>

      {/* Request Details Dialog */}
      <Dialog
        open={!!selectedRequest}
        onClose={() => setSelectedRequest(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Collaboration Request Details</DialogTitle>
        <DialogContent>
          {selectedRequest && (
            <Box>
              <Typography variant="subtitle1" gutterBottom>
                {selectedRequest.requesting_team.name} → {selectedRequest.target_team.name}
              </Typography>
              <Divider sx={{ my: 2 }} />
              <Typography><strong>Type:</strong> {selectedRequest.collaboration_type}</Typography>
              <Typography><strong>Status:</strong> {selectedRequest.status}</Typography>
              <Typography><strong>Access Level:</strong> {selectedRequest.access_level}</Typography>
              <Typography><strong>Requested:</strong> {formatDate(selectedRequest.requested_at)}</Typography>
              {selectedRequest.responded_at && (
                <Typography><strong>Responded:</strong> {formatDate(selectedRequest.responded_at)}</Typography>
              )}
              {selectedRequest.request_message && (
                <Box sx={{ mt: 2 }}>
                  <Typography><strong>Message:</strong></Typography>
                  <Paper sx={{ p: 2, mt: 1, bgcolor: 'grey.50' }}>
                    <Typography variant="body2">{selectedRequest.request_message}</Typography>
                  </Paper>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedRequest(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TeamCollaboration;