import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Alert,
  Snackbar,
  Menu,
  Tooltip,
  Grid,
  Card,
  CardContent,
  LinearProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  MoreVert as MoreVertIcon,
  PlayArrow as TestIcon,
  ContentCopy as CopyIcon,
  Visibility as ViewIcon,
  VisibilityOff as HideIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { webhookApi } from '../../services/api';

interface WebhookConfig {
  id: number;
  name: string;
  source: string;
  url_path: string;
  webhook_url: string;
  is_active: boolean;
  has_secret: boolean;
  has_auth_token: boolean;
  created_at: string;
  updated_at: string;
  last_received: string | null;
  settings: Record<string, any>;
  alert_rules: Record<string, any>;
}

interface WebhookStatistics {
  total_webhooks: number;
  active_webhooks: number;
  total_events: number;
  events_last_24h: number;
  events_last_7d: number;
  successful_events: number;
  failed_events: number;
  success_rate: number;
  alerts_created: number;
  sources: Record<string, number>;
}

const WEBHOOK_SOURCES = [
  { value: 'slack', label: 'Slack', icon: '💬' },
  { value: 'prometheus', label: 'Prometheus', icon: '📊' },
  { value: 'grafana', label: 'Grafana', icon: '📈' },
  { value: 'pagerduty', label: 'PagerDuty', icon: '📟' },
  { value: 'generic', label: 'Generic', icon: '🔗' },
];

export const WebhookManager: React.FC = () => {
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([]);
  const [statistics, setStatistics] = useState<WebhookStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<WebhookConfig | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    source: '',
    url_path: '',
    secret: '',
    auth_token: '',
    is_active: true,
    settings: {},
    alert_rules: {},
  });
  const [showSecrets, setShowSecrets] = useState<Record<number, boolean>>({});
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedWebhook, setSelectedWebhook] = useState<WebhookConfig | null>(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  useEffect(() => {
    loadWebhooks();
    loadStatistics();
  }, []);

  const loadWebhooks = async () => {
    try {
      const response = await webhookApi.getWebhooks();
      setWebhooks(response.data);
    } catch (error) {
      showSnackbar('Failed to load webhooks', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadStatistics = async () => {
    try {
      const response = await webhookApi.getStatistics();
      setStatistics(response.data);
    } catch (error) {
      console.error('Failed to load statistics:', error);
    }
  };

  const handleCreateWebhook = () => {
    setEditingWebhook(null);
    setFormData({
      name: '',
      source: '',
      url_path: '',
      secret: '',
      auth_token: '',
      is_active: true,
      settings: {},
      alert_rules: {},
    });
    setOpenDialog(true);
  };

  const handleEditWebhook = (webhook: WebhookConfig) => {
    setEditingWebhook(webhook);
    setFormData({
      name: webhook.name,
      source: webhook.source,
      url_path: webhook.url_path,
      secret: '',
      auth_token: '',
      is_active: webhook.is_active,
      settings: webhook.settings || {},
      alert_rules: webhook.alert_rules || {},
    });
    setOpenDialog(true);
  };

  const handleSaveWebhook = async () => {
    try {
      if (editingWebhook) {
        await webhookApi.updateWebhook(editingWebhook.id, formData);
        showSnackbar('Webhook updated successfully', 'success');
      } else {
        await webhookApi.createWebhook(formData);
        showSnackbar('Webhook created successfully', 'success');
      }
      setOpenDialog(false);
      loadWebhooks();
    } catch (error) {
      showSnackbar('Failed to save webhook', 'error');
    }
  };

  const handleDeleteWebhook = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this webhook?')) {
      try {
        await webhookApi.deleteWebhook(id);
        showSnackbar('Webhook deleted successfully', 'success');
        loadWebhooks();
      } catch (error) {
        showSnackbar('Failed to delete webhook', 'error');
      }
    }
  };

  const handleToggleActive = async (webhook: WebhookConfig) => {
    try {
      await webhookApi.updateWebhook(webhook.id, { is_active: !webhook.is_active });
      showSnackbar(`Webhook ${webhook.is_active ? 'deactivated' : 'activated'}`, 'success');
      loadWebhooks();
    } catch (error) {
      showSnackbar('Failed to update webhook status', 'error');
    }
  };

  const handleTestWebhook = async (webhook: WebhookConfig) => {
    try {
      const testPayload = {
        title: 'Test Alert',
        description: 'This is a test alert from OpsSight webhook manager',
        severity: 'medium',
        source: webhook.source,
      };

      const response = await webhookApi.testWebhook(webhook.id, testPayload);
      if (response.data.success) {
        showSnackbar('Test webhook sent successfully', 'success');
      } else {
        showSnackbar(`Test failed: ${response.data.message}`, 'error');
      }
    } catch (error) {
      showSnackbar('Failed to test webhook', 'error');
    }
  };

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    showSnackbar('Webhook URL copied to clipboard', 'success');
  };

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  };

  const getSourceIcon = (source: string) => {
    const sourceConfig = WEBHOOK_SOURCES.find(s => s.value === source);
    return sourceConfig?.icon || '🔗';
  };

  const getHealthStatus = (webhook: WebhookConfig) => {
    if (!webhook.last_received) {
      return { color: 'warning', label: 'No data' };
    }

    const lastReceived = new Date(webhook.last_received);
    const hoursSinceLastReceived = (Date.now() - lastReceived.getTime()) / (1000 * 60 * 60);

    if (hoursSinceLastReceived < 1) {
      return { color: 'success', label: 'Healthy' };
    } else if (hoursSinceLastReceived < 24) {
      return { color: 'warning', label: 'Stale' };
    } else {
      return { color: 'error', label: 'Inactive' };
    }
  };

  const renderStatisticsCards = () => {
    if (!statistics) return null;

    return (
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Total Webhooks
              </Typography>
              <Typography variant="h4">
                {statistics.total_webhooks}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {statistics.active_webhooks} active
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Events (24h)
              </Typography>
              <Typography variant="h4">
                {statistics.events_last_24h}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {statistics.total_events} total
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Success Rate
              </Typography>
              <Typography variant="h4">
                {Math.round(statistics.success_rate * 100)}%
              </Typography>
              <LinearProgress
                variant="determinate"
                value={statistics.success_rate * 100}
                sx={{ mt: 1 }}
              />
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Alerts Created
              </Typography>
              <Typography variant="h4">
                {statistics.alerts_created}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                From webhooks
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    );
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Webhook Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreateWebhook}
        >
          Add Webhook
        </Button>
      </Box>

      {renderStatisticsCards()}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Source</TableCell>
              <TableCell>URL</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Health</TableCell>
              <TableCell>Last Received</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {webhooks.map((webhook) => {
              const healthStatus = getHealthStatus(webhook);
              return (
                <TableRow key={webhook.id}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <span style={{ marginRight: 8 }}>{getSourceIcon(webhook.source)}</span>
                      {webhook.name}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={webhook.source}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Typography
                        variant="body2"
                        sx={{
                          fontFamily: 'monospace',
                          maxWidth: 200,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {webhook.webhook_url}
                      </Typography>
                      <Tooltip title="Copy URL">
                        <IconButton
                          size="small"
                          onClick={() => handleCopyUrl(webhook.webhook_url)}
                        >
                          <CopyIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={webhook.is_active ? 'Active' : 'Inactive'}
                      color={webhook.is_active ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={healthStatus.label}
                      color={healthStatus.color as any}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {webhook.last_received ? (
                      <Typography variant="body2">
                        {new Date(webhook.last_received).toLocaleString()}
                      </Typography>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        Never
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex' }}>
                      <Tooltip title="Test webhook">
                        <IconButton
                          size="small"
                          onClick={() => handleTestWebhook(webhook)}
                          disabled={!webhook.is_active}
                        >
                          <TestIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Edit webhook">
                        <IconButton
                          size="small"
                          onClick={() => handleEditWebhook(webhook)}
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Toggle active status">
                        <IconButton
                          size="small"
                          onClick={() => handleToggleActive(webhook)}
                        >
                          {webhook.is_active ? <SuccessIcon color="success" /> : <ErrorIcon color="error" />}
                        </IconButton>
                      </Tooltip>
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          setAnchorEl(e.currentTarget);
                          setSelectedWebhook(webhook);
                        }}
                      >
                        <MoreVertIcon />
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Create/Edit Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingWebhook ? 'Edit Webhook' : 'Create Webhook'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Source</InputLabel>
                <Select
                  value={formData.source}
                  onChange={(e) => setFormData({ ...formData, source: e.target.value as string })}
                >
                  {WEBHOOK_SOURCES.map((source) => (
                    <MenuItem key={source.value} value={source.value}>
                      {source.icon} {source.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="URL Path"
                value={formData.url_path}
                onChange={(e) => setFormData({ ...formData, url_path: e.target.value })}
                helperText="The path where the webhook will be available (e.g., /my-webhook)"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Secret"
                type="password"
                value={formData.secret}
                onChange={(e) => setFormData({ ...formData, secret: e.target.value })}
                helperText="Optional secret for signature verification"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Auth Token"
                type="password"
                value={formData.auth_token}
                onChange={(e) => setFormData({ ...formData, auth_token: e.target.value })}
                helperText="Optional authentication token"
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  />
                }
                label="Active"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button onClick={handleSaveWebhook} variant="contained">
            {editingWebhook ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Actions Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        <MenuItem onClick={() => {
          if (selectedWebhook) handleDeleteWebhook(selectedWebhook.id);
          setAnchorEl(null);
        }}>
          <DeleteIcon sx={{ mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};