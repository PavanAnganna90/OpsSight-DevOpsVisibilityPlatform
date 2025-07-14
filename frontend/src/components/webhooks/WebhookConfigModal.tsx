import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Typography,
  Box,
  Chip,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Grid,
  Alert,
  Tabs,
  Tab,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  Code,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  ContentCopy as CopyIcon,
  Help as HelpIcon,
} from '@mui/icons-material';
import { webhookApi, WebhookConfig, WebhookConfigCreate, WebhookConfigUpdate } from '../../services/webhookApi';

interface WebhookConfigModalProps {
  open: boolean;
  onClose: () => void;
  webhook?: WebhookConfig | null;
  onSave: () => void;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index, ...other }) => {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`webhook-tabpanel-${index}`}
      aria-labelledby={`webhook-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
};

const WEBHOOK_SOURCES = [
  {
    value: 'slack',
    label: 'Slack',
    icon: '💬',
    description: 'Receive alerts from Slack channels and messages',
  },
  {
    value: 'prometheus',
    label: 'Prometheus',
    icon: '📊',
    description: 'Process alerts from Prometheus Alertmanager',
  },
  {
    value: 'grafana',
    label: 'Grafana',
    icon: '📈',
    description: 'Handle Grafana alert notifications',
  },
  {
    value: 'pagerduty',
    label: 'PagerDuty',
    icon: '📟',
    description: 'Sync incidents from PagerDuty',
  },
  {
    value: 'generic',
    label: 'Generic',
    icon: '🔗',
    description: 'Custom webhook for any external system',
  },
];

export const WebhookConfigModal: React.FC<WebhookConfigModalProps> = ({
  open,
  onClose,
  webhook,
  onSave,
}) => {
  const [activeTab, setActiveTab] = useState(0);
  const [formData, setFormData] = useState<WebhookConfigCreate>({
    name: '',
    source: '',
    url_path: '',
    secret: '',
    auth_token: '',
    is_active: true,
    settings: {},
    alert_rules: {},
  });
  const [alertKeywords, setAlertKeywords] = useState<string[]>([]);
  const [newKeyword, setNewKeyword] = useState('');
  const [severityMapping, setSeverityMapping] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (webhook) {
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
      
      // Load source-specific settings
      if (webhook.source === 'slack') {
        setAlertKeywords(webhook.settings?.alert_keywords || []);
        setSeverityMapping(webhook.settings?.severity_mapping || {});
      }
    } else {
      // Reset form for new webhook
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
      setAlertKeywords([]);
      setNewKeyword('');
      setSeverityMapping({});
    }
  }, [webhook, open]);

  const handleSave = async () => {
    setLoading(true);
    setError(null);

    try {
      // Prepare settings based on source type
      const updatedSettings = { ...formData.settings };
      
      if (formData.source === 'slack') {
        updatedSettings.alert_keywords = alertKeywords;
        updatedSettings.severity_mapping = severityMapping;
      }

      const payload = {
        ...formData,
        settings: updatedSettings,
      };

      if (webhook) {
        await webhookApi.updateWebhook(webhook.id, payload);
      } else {
        await webhookApi.createWebhook(payload);
      }

      onSave();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save webhook configuration');
    } finally {
      setLoading(false);
    }
  };

  const generateUrlPath = (name: string, source: string) => {
    const cleanName = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    return `/${source}/${cleanName}`;
  };

  const handleNameChange = (name: string) => {
    setFormData(prev => ({
      ...prev,
      name,
      url_path: prev.url_path || generateUrlPath(name, prev.source),
    }));
  };

  const handleSourceChange = (source: string) => {
    setFormData(prev => ({
      ...prev,
      source,
      url_path: prev.name ? generateUrlPath(prev.name, source) : '',
    }));
  };

  const addKeyword = () => {
    if (newKeyword && !alertKeywords.includes(newKeyword)) {
      setAlertKeywords([...alertKeywords, newKeyword]);
      setNewKeyword('');
    }
  };

  const removeKeyword = (keyword: string) => {
    setAlertKeywords(alertKeywords.filter(k => k !== keyword));
  };

  const copyWebhookUrl = () => {
    const url = webhookApi.generateWebhookUrl(formData.url_path);
    navigator.clipboard.writeText(url);
  };

  const renderBasicSettings = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Webhook Name"
          value={formData.name}
          onChange={(e) => handleNameChange(e.target.value)}
          required
          helperText="A descriptive name for this webhook"
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <FormControl fullWidth required>
          <InputLabel>Source Type</InputLabel>
          <Select
            value={formData.source}
            onChange={(e) => handleSourceChange(e.target.value)}
          >
            {WEBHOOK_SOURCES.map((source) => (
              <MenuItem key={source.value} value={source.value}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{ marginRight: 8 }}>{source.icon}</span>
                  {source.label}
                </Box>
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
          onChange={(e) => setFormData(prev => ({ ...prev, url_path: e.target.value }))}
          required
          helperText="The path where this webhook will be accessible"
          InputProps={{
            endAdornment: (
              <IconButton onClick={copyWebhookUrl} disabled={!formData.url_path}>
                <CopyIcon />
              </IconButton>
            ),
          }}
        />
      </Grid>
      {formData.url_path && (
        <Grid item xs={12}>
          <Alert severity="info" sx={{ fontFamily: 'monospace' }}>
            Webhook URL: {webhookApi.generateWebhookUrl(formData.url_path)}
          </Alert>
        </Grid>
      )}
      <Grid item xs={12}>
        <FormControlLabel
          control={
            <Switch
              checked={formData.is_active}
              onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
            />
          }
          label="Active"
        />
      </Grid>
    </Grid>
  );

  const renderSecuritySettings = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Typography variant="h6" gutterBottom>
          Security Configuration
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Configure security settings to verify incoming webhook requests.
        </Typography>
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Webhook Secret"
          type="password"
          value={formData.secret}
          onChange={(e) => setFormData(prev => ({ ...prev, secret: e.target.value }))}
          helperText="Used for signature verification"
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Auth Token"
          type="password"
          value={formData.auth_token}
          onChange={(e) => setFormData(prev => ({ ...prev, auth_token: e.target.value }))}
          helperText="Optional authentication token"
        />
      </Grid>
    </Grid>
  );

  const renderSlackSettings = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Typography variant="h6" gutterBottom>
          Slack Configuration
        </Typography>
      </Grid>
      <Grid item xs={12}>
        <Typography variant="subtitle2" gutterBottom>
          Alert Keywords
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
          {alertKeywords.map((keyword) => (
            <Chip
              key={keyword}
              label={keyword}
              onDelete={() => removeKeyword(keyword)}
              size="small"
            />
          ))}
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            label="Add keyword"
            value={newKeyword}
            onChange={(e) => setNewKeyword(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addKeyword()}
            size="small"
          />
          <Button onClick={addKeyword} variant="outlined" size="small">
            <AddIcon />
          </Button>
        </Box>
      </Grid>
      <Grid item xs={12}>
        <FormControlLabel
          control={
            <Switch
              checked={formData.settings?.ignore_bots !== false}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                settings: { ...prev.settings, ignore_bots: e.target.checked }
              }))}
            />
          }
          label="Ignore bot messages"
        />
      </Grid>
      <Grid item xs={12}>
        <FormControlLabel
          control={
            <Switch
              checked={formData.settings?.monitor_threads === true}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                settings: { ...prev.settings, monitor_threads: e.target.checked }
              }))}
            />
          }
          label="Monitor thread messages"
        />
      </Grid>
    </Grid>
  );

  const renderPrometheusSettings = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Typography variant="h6" gutterBottom>
          Prometheus Configuration
        </Typography>
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Severity Label"
          value={formData.settings?.severity_label || 'severity'}
          onChange={(e) => setFormData(prev => ({
            ...prev,
            settings: { ...prev.settings, severity_label: e.target.value }
          }))}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Alert Name Field"
          value={formData.settings?.alert_name_field || 'alertname'}
          onChange={(e) => setFormData(prev => ({
            ...prev,
            settings: { ...prev.settings, alert_name_field: e.target.value }
          }))}
        />
      </Grid>
      <Grid item xs={12}>
        <FormControlLabel
          control={
            <Switch
              checked={formData.settings?.ignore_resolved === true}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                settings: { ...prev.settings, ignore_resolved: e.target.checked }
              }))}
            />
          }
          label="Ignore resolved alerts"
        />
      </Grid>
    </Grid>
  );

  const renderDocumentation = () => {
    const sourceConfig = WEBHOOK_SOURCES.find(s => s.value === formData.source);
    
    return (
      <Box>
        <Typography variant="h6" gutterBottom>
          Setup Instructions
        </Typography>
        {sourceConfig && (
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                {sourceConfig.icon} {sourceConfig.label}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {sourceConfig.description}
              </Typography>
            </CardContent>
          </Card>
        )}
        
        {formData.source === 'slack' && (
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Slack App Configuration:
            </Typography>
            <List dense>
              <ListItem>
                <ListItemText primary="1. Create a Slack App in your workspace" />
              </ListItem>
              <ListItem>
                <ListItemText primary="2. Enable Event Subscriptions" />
              </ListItem>
              <ListItem>
                <ListItemText primary="3. Set Request URL to the webhook URL above" />
              </ListItem>
              <ListItem>
                <ListItemText primary="4. Subscribe to 'message.channels' events" />
              </ListItem>
              <ListItem>
                <ListItemText primary="5. Install the app to your workspace" />
              </ListItem>
            </List>
          </Box>
        )}

        {formData.source === 'prometheus' && (
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Prometheus Alertmanager Configuration:
            </Typography>
            <Box component="pre" sx={{ bgcolor: 'grey.100', p: 2, borderRadius: 1, overflow: 'auto' }}>
              {`webhook_configs:
  - url: '${formData.url_path ? webhookApi.generateWebhookUrl(formData.url_path) : 'YOUR_WEBHOOK_URL'}'
    send_resolved: true`}
            </Box>
          </Box>
        )}
      </Box>
    );
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {webhook ? 'Edit Webhook Configuration' : 'Create Webhook Configuration'}
      </DialogTitle>
      
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
          <Tab label="Basic Settings" />
          <Tab label="Security" />
          {formData.source && <Tab label={`${formData.source} Settings`} />}
          <Tab label="Documentation" />
        </Tabs>

        <TabPanel value={activeTab} index={0}>
          {renderBasicSettings()}
        </TabPanel>

        <TabPanel value={activeTab} index={1}>
          {renderSecuritySettings()}
        </TabPanel>

        {formData.source && (
          <TabPanel value={activeTab} index={2}>
            {formData.source === 'slack' && renderSlackSettings()}
            {formData.source === 'prometheus' && renderPrometheusSettings()}
            {/* Add other source-specific settings as needed */}
          </TabPanel>
        )}

        <TabPanel value={activeTab} index={formData.source ? 3 : 2}>
          {renderDocumentation()}
        </TabPanel>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={loading || !formData.name || !formData.source || !formData.url_path}
        >
          {loading ? 'Saving...' : webhook ? 'Update' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};