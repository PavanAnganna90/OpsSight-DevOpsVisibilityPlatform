import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  Grid,
  Divider,
  Avatar,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Tab,
  Tabs,
  Paper,
  InputAdornment,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormGroup,
  Checkbox
} from '@mui/material';
import {
  Save,
  Delete,
  Edit,
  PhotoCamera,
  ExpandMore,
  Security,
  Notifications,
  Integration,
  Group,
  Settings as SettingsIcon,
  Palette,
  Lock,
  Key,
  ContentCopy,
  Refresh,
  Add
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';

interface TeamSettingsProps {
  team: any;
  onUpdate?: () => void;
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
      id={`team-settings-tabpanel-${index}`}
      aria-labelledby={`team-settings-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
};

const TeamSettings: React.FC<TeamSettingsProps> = ({ team, onUpdate }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false);
  const { enqueueSnackbar } = useSnackbar();

  // General settings state
  const [generalSettings, setGeneralSettings] = useState({
    name: team?.name || '',
    display_name: team?.display_name || '',
    description: team?.description || '',
    slug: team?.slug || '',
    max_members: team?.max_members || 50,
    is_active: team?.is_active || true,
    avatar_url: team?.avatar_url || ''
  });

  // Branding settings state
  const [brandingSettings, setBrandingSettings] = useState({
    primary_color: team?.branding?.primary_color || '#1976d2',
    secondary_color: team?.branding?.secondary_color || '#dc004e',
    logo_url: team?.branding?.logo_url || '',
    custom_css: team?.branding?.custom_css || ''
  });

  // Notification settings state
  const [notificationSettings, setNotificationSettings] = useState({
    email_notifications: true,
    slack_notifications: false,
    webhook_notifications: false,
    notification_channels: {
      deployments: ['email'],
      incidents: ['email', 'slack'],
      security: ['email', 'slack', 'webhook'],
      team_updates: ['email']
    }
  });

  // Security settings state
  const [securitySettings, setSecuritySettings] = useState({
    require_2fa: false,
    ip_whitelist: [],
    session_timeout: 30,
    api_key_rotation: 90,
    audit_retention: 365
  });

  // Integration settings
  const [integrations, setIntegrations] = useState([
    { id: '1', name: 'GitHub', type: 'vcs', enabled: true, config: {} },
    { id: '2', name: 'Slack', type: 'communication', enabled: false, config: {} },
    { id: '3', name: 'Jira', type: 'project', enabled: false, config: {} },
    { id: '4', name: 'PagerDuty', type: 'incident', enabled: false, config: {} }
  ]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleGeneralSettingChange = (field: string, value: any) => {
    setGeneralSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleBrandingSettingChange = (field: string, value: any) => {
    setBrandingSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleNotificationSettingChange = (field: string, value: any) => {
    setNotificationSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleSecuritySettingChange = (field: string, value: any) => {
    setSecuritySettings(prev => ({ ...prev, [field]: value }));
  };

  const saveSettings = async () => {
    setLoading(true);
    try {
      const settings = {
        ...generalSettings,
        branding: brandingSettings,
        notifications: notificationSettings,
        security: securitySettings
      };

      const response = await fetch(`/api/v1/teams/${team.id}/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(settings)
      });

      if (!response.ok) {
        throw new Error('Failed to save settings');
      }

      enqueueSnackbar('Team settings saved successfully', { variant: 'success' });
      onUpdate?.();
    } catch (error) {
      console.error('Error saving settings:', error);
      enqueueSnackbar('Failed to save settings', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTeam = async () => {
    try {
      const response = await fetch(`/api/v1/teams/${team.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete team');
      }

      enqueueSnackbar('Team deleted successfully', { variant: 'success' });
      // Redirect or handle team deletion
    } catch (error) {
      console.error('Error deleting team:', error);
      enqueueSnackbar('Failed to delete team', { variant: 'error' });
    }
  };

  const generateApiKey = async () => {
    try {
      const response = await fetch(`/api/v1/teams/${team.id}/api-key`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to generate API key');
      }

      const data = await response.json();
      enqueueSnackbar('API key generated successfully', { variant: 'success' });
      setShowApiKeyDialog(true);
      // Handle new API key
    } catch (error) {
      console.error('Error generating API key:', error);
      enqueueSnackbar('Failed to generate API key', { variant: 'error' });
    }
  };

  const renderGeneralSettings = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} md={4}>
        <Box sx={{ textAlign: 'center' }}>
          <Avatar
            sx={{ width: 120, height: 120, mx: 'auto', mb: 2 }}
            src={generalSettings.avatar_url}
          >
            {generalSettings.name.charAt(0).toUpperCase()}
          </Avatar>
          <Button
            variant="outlined"
            startIcon={<PhotoCamera />}
            component="label"
          >
            Upload Avatar
            <input type="file" hidden accept="image/*" />
          </Button>
        </Box>
      </Grid>
      <Grid item xs={12} md={8}>
        <TextField
          fullWidth
          label="Team Name"
          value={generalSettings.name}
          onChange={(e) => handleGeneralSettingChange('name', e.target.value)}
          margin="normal"
          required
        />
        <TextField
          fullWidth
          label="Display Name"
          value={generalSettings.display_name}
          onChange={(e) => handleGeneralSettingChange('display_name', e.target.value)}
          margin="normal"
        />
        <TextField
          fullWidth
          label="Description"
          value={generalSettings.description}
          onChange={(e) => handleGeneralSettingChange('description', e.target.value)}
          margin="normal"
          multiline
          rows={3}
        />
        <TextField
          fullWidth
          label="URL Slug"
          value={generalSettings.slug}
          onChange={(e) => handleGeneralSettingChange('slug', e.target.value)}
          margin="normal"
          InputProps={{
            startAdornment: <InputAdornment position="start">/team/</InputAdornment>
          }}
        />
        <TextField
          fullWidth
          label="Maximum Members"
          type="number"
          value={generalSettings.max_members}
          onChange={(e) => handleGeneralSettingChange('max_members', parseInt(e.target.value))}
          margin="normal"
        />
        <FormControlLabel
          control={
            <Switch
              checked={generalSettings.is_active}
              onChange={(e) => handleGeneralSettingChange('is_active', e.target.checked)}
            />
          }
          label="Team Active"
          sx={{ mt: 2 }}
        />
      </Grid>
    </Grid>
  );

  const renderBrandingSettings = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Typography variant="subtitle1" gutterBottom>
          Team Branding
        </Typography>
        <Typography variant="body2" color="textSecondary" gutterBottom>
          Customize your team's appearance and branding
        </Typography>
      </Grid>
      <Grid item xs={12} md={6}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography>Primary Color</Typography>
          <input
            type="color"
            value={brandingSettings.primary_color}
            onChange={(e) => handleBrandingSettingChange('primary_color', e.target.value)}
            style={{ width: 50, height: 40, cursor: 'pointer' }}
          />
          <TextField
            value={brandingSettings.primary_color}
            onChange={(e) => handleBrandingSettingChange('primary_color', e.target.value)}
            size="small"
          />
        </Box>
      </Grid>
      <Grid item xs={12} md={6}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography>Secondary Color</Typography>
          <input
            type="color"
            value={brandingSettings.secondary_color}
            onChange={(e) => handleBrandingSettingChange('secondary_color', e.target.value)}
            style={{ width: 50, height: 40, cursor: 'pointer' }}
          />
          <TextField
            value={brandingSettings.secondary_color}
            onChange={(e) => handleBrandingSettingChange('secondary_color', e.target.value)}
            size="small"
          />
        </Box>
      </Grid>
      <Grid item xs={12}>
        <TextField
          fullWidth
          label="Logo URL"
          value={brandingSettings.logo_url}
          onChange={(e) => handleBrandingSettingChange('logo_url', e.target.value)}
          margin="normal"
        />
      </Grid>
      <Grid item xs={12}>
        <TextField
          fullWidth
          label="Custom CSS"
          value={brandingSettings.custom_css}
          onChange={(e) => handleBrandingSettingChange('custom_css', e.target.value)}
          multiline
          rows={6}
          margin="normal"
          placeholder="/* Add custom CSS styles for your team dashboard */"
        />
      </Grid>
    </Grid>
  );

  const renderNotificationSettings = () => (
    <Box>
      <Typography variant="subtitle1" gutterBottom>
        Notification Preferences
      </Typography>
      <FormGroup>
        <FormControlLabel
          control={
            <Switch
              checked={notificationSettings.email_notifications}
              onChange={(e) => handleNotificationSettingChange('email_notifications', e.target.checked)}
            />
          }
          label="Email Notifications"
        />
        <FormControlLabel
          control={
            <Switch
              checked={notificationSettings.slack_notifications}
              onChange={(e) => handleNotificationSettingChange('slack_notifications', e.target.checked)}
            />
          }
          label="Slack Notifications"
        />
        <FormControlLabel
          control={
            <Switch
              checked={notificationSettings.webhook_notifications}
              onChange={(e) => handleNotificationSettingChange('webhook_notifications', e.target.checked)}
            />
          }
          label="Webhook Notifications"
        />
      </FormGroup>

      <Divider sx={{ my: 3 }} />

      <Typography variant="subtitle1" gutterBottom>
        Notification Channels by Event Type
      </Typography>
      {Object.entries(notificationSettings.notification_channels).map(([event, channels]) => (
        <Accordion key={event}>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography>{event.replace('_', ' ').toUpperCase()}</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <FormGroup row>
              <FormControlLabel
                control={<Checkbox checked={channels.includes('email')} />}
                label="Email"
              />
              <FormControlLabel
                control={<Checkbox checked={channels.includes('slack')} />}
                label="Slack"
              />
              <FormControlLabel
                control={<Checkbox checked={channels.includes('webhook')} />}
                label="Webhook"
              />
            </FormGroup>
          </AccordionDetails>
        </Accordion>
      ))}
    </Box>
  );

  const renderSecuritySettings = () => (
    <Box>
      <Alert severity="warning" sx={{ mb: 3 }}>
        Changes to security settings will affect all team members
      </Alert>

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <FormControlLabel
            control={
              <Switch
                checked={securitySettings.require_2fa}
                onChange={(e) => handleSecuritySettingChange('require_2fa', e.target.checked)}
              />
            }
            label="Require Two-Factor Authentication"
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Session Timeout (minutes)"
            type="number"
            value={securitySettings.session_timeout}
            onChange={(e) => handleSecuritySettingChange('session_timeout', parseInt(e.target.value))}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="API Key Rotation (days)"
            type="number"
            value={securitySettings.api_key_rotation}
            onChange={(e) => handleSecuritySettingChange('api_key_rotation', parseInt(e.target.value))}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Audit Log Retention (days)"
            type="number"
            value={securitySettings.audit_retention}
            onChange={(e) => handleSecuritySettingChange('audit_retention', parseInt(e.target.value))}
          />
        </Grid>

        <Grid item xs={12}>
          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle1" gutterBottom>
            API Keys
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={<Key />}
              onClick={generateApiKey}
            >
              Generate New API Key
            </Button>
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              color="warning"
            >
              Rotate All Keys
            </Button>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );

  const renderIntegrations = () => (
    <Box>
      <Typography variant="subtitle1" gutterBottom>
        Connected Integrations
      </Typography>
      <List>
        {integrations.map((integration) => (
          <ListItem key={integration.id}>
            <ListItemText
              primary={integration.name}
              secondary={`Type: ${integration.type}`}
            />
            <ListItemSecondaryAction>
              <Switch
                checked={integration.enabled}
                onChange={(e) => {
                  setIntegrations(integrations.map(i =>
                    i.id === integration.id ? { ...i, enabled: e.target.checked } : i
                  ));
                }}
              />
            </ListItemSecondaryAction>
          </ListItem>
        ))}
      </List>
      <Button
        variant="outlined"
        startIcon={<Add />}
        sx={{ mt: 2 }}
      >
        Add Integration
      </Button>
    </Box>
  );

  return (
    <Box>
      <Card>
        <CardContent>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={activeTab} onChange={handleTabChange}>
              <Tab label="General" icon={<SettingsIcon />} iconPosition="start" />
              <Tab label="Branding" icon={<Palette />} iconPosition="start" />
              <Tab label="Notifications" icon={<Notifications />} iconPosition="start" />
              <Tab label="Security" icon={<Security />} iconPosition="start" />
              <Tab label="Integrations" icon={<Integration />} iconPosition="start" />
            </Tabs>
          </Box>

          <TabPanel value={activeTab} index={0}>
            {renderGeneralSettings()}
          </TabPanel>

          <TabPanel value={activeTab} index={1}>
            {renderBrandingSettings()}
          </TabPanel>

          <TabPanel value={activeTab} index={2}>
            {renderNotificationSettings()}
          </TabPanel>

          <TabPanel value={activeTab} index={3}>
            {renderSecuritySettings()}
          </TabPanel>

          <TabPanel value={activeTab} index={4}>
            {renderIntegrations()}
          </TabPanel>

          <Divider sx={{ my: 3 }} />

          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Button
              variant="contained"
              color="error"
              startIcon={<Delete />}
              onClick={() => setShowDeleteDialog(true)}
            >
              Delete Team
            </Button>
            <Button
              variant="contained"
              color="primary"
              startIcon={<Save />}
              onClick={saveSettings}
              disabled={loading}
            >
              Save Settings
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Delete Team Dialog */}
      <Dialog
        open={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
      >
        <DialogTitle>Delete Team</DialogTitle>
        <DialogContent>
          <Alert severity="error" sx={{ mb: 2 }}>
            This action cannot be undone!
          </Alert>
          <Typography>
            Are you sure you want to delete the team "{team?.name}"? All associated data, 
            resources, and configurations will be permanently removed.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDeleteDialog(false)}>Cancel</Button>
          <Button
            color="error"
            variant="contained"
            onClick={handleDeleteTeam}
          >
            Delete Team
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TeamSettings;