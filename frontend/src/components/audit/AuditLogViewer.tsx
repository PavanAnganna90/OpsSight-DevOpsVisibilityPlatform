import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Collapse,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Pagination,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  LinearProgress
} from '@mui/material';
import {
  ExpandMore,
  ExpandLess,
  Search,
  FilterList,
  Download,
  Refresh,
  Visibility,
  Security,
  Warning,
  Info,
  Error
} from '@mui/icons-material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useSnackbar } from 'notistack';

interface AuditLog {
  id: number;
  timestamp: string;
  event_type: string;
  event_category: string;
  level: string;
  message: string;
  user_id?: number;
  user_email?: string;
  user_name?: string;
  ip_address?: string;
  user_agent?: string;
  resource_type?: string;
  resource_id?: string;
  resource_name?: string;
  success: boolean;
  error_code?: string;
  error_message?: string;
  duration_ms?: number;
  metadata?: Record<string, any>;
}

interface AuditLogFilter {
  search?: string;
  event_type?: string;
  event_category?: string;
  level?: string;
  user_email?: string;
  ip_address?: string;
  resource_type?: string;
  success?: boolean;
  start_date?: Date;
  end_date?: Date;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

interface AuditLogStats {
  total_events: number;
  failed_events: number;
  success_rate: number;
  events_by_type: Record<string, number>;
  events_by_category: Record<string, number>;
  events_by_level: Record<string, number>;
  top_users: Record<string, number>;
  top_ips: Record<string, number>;
}

const AuditLogViewer: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState<AuditLogStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [eventTypes, setEventTypes] = useState<string[]>([]);
  const [eventCategories, setEventCategories] = useState<string[]>([]);
  const [levels, setLevels] = useState<string[]>([]);
  
  const { enqueueSnackbar } = useSnackbar();

  const [filters, setFilters] = useState<AuditLogFilter>({
    sort_by: 'timestamp',
    sort_order: 'desc'
  });

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: pageSize.toString(),
        ...(filters.search && { search: filters.search }),
        ...(filters.event_type && { event_type: filters.event_type }),
        ...(filters.event_category && { event_category: filters.event_category }),
        ...(filters.level && { level: filters.level }),
        ...(filters.user_email && { user_email: filters.user_email }),
        ...(filters.ip_address && { ip_address: filters.ip_address }),
        ...(filters.resource_type && { resource_type: filters.resource_type }),
        ...(filters.success !== undefined && { success: filters.success.toString() }),
        ...(filters.start_date && { start_date: filters.start_date.toISOString() }),
        ...(filters.end_date && { end_date: filters.end_date.toISOString() }),
        ...(filters.sort_by && { sort_by: filters.sort_by }),
        ...(filters.sort_order && { sort_order: filters.sort_order })
      });

      const response = await fetch(`/api/v1/audit/logs?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch audit logs');
      }

      const data = await response.json();
      setLogs(data.items);
      setTotalCount(data.total);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      enqueueSnackbar('Failed to fetch audit logs', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, filters, enqueueSnackbar]);

  const fetchStats = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        ...(filters.start_date && { start_date: filters.start_date.toISOString() }),
        ...(filters.end_date && { end_date: filters.end_date.toISOString() })
      });

      const response = await fetch(`/api/v1/audit/stats?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch audit stats');
      }

      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching audit stats:', error);
    }
  }, [filters.start_date, filters.end_date]);

  const fetchEventTypes = useCallback(async () => {
    try {
      const response = await fetch('/api/v1/audit/event-types');
      if (!response.ok) {
        throw new Error('Failed to fetch event types');
      }

      const data = await response.json();
      setEventTypes(data.event_types.map((et: any) => et.event_type));
      setEventCategories(data.categories);
      setLevels(data.levels);
    } catch (error) {
      console.error('Error fetching event types:', error);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
    fetchStats();
    fetchEventTypes();
  }, [fetchLogs, fetchStats, fetchEventTypes]);

  const handleFilterChange = (field: keyof AuditLogFilter, value: any) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
    setPage(1); // Reset to first page when filtering
  };

  const handleExport = async (format: 'csv' | 'json' | 'xlsx' | 'zip') => {
    setExporting(true);
    try {
      const params = new URLSearchParams({
        format,
        ...(filters.start_date && { start_date: filters.start_date.toISOString() }),
        ...(filters.end_date && { end_date: filters.end_date.toISOString() }),
        ...(filters.event_type && { event_types: filters.event_type }),
        ...(filters.event_category && { event_categories: filters.event_category }),
        ...(filters.level && { levels: filters.level }),
        ...(filters.user_email && { user_email: filters.user_email }),
        ...(filters.success !== undefined && { success: filters.success.toString() }),
        max_records: '50000'
      });

      const response = await fetch(`/api/v1/audit/export?${params}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        }
      });

      if (!response.ok) {
        throw new Error('Failed to export audit logs');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit_logs_${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      enqueueSnackbar(`Audit logs exported as ${format.toUpperCase()}`, { variant: 'success' });
    } catch (error) {
      console.error('Error exporting audit logs:', error);
      enqueueSnackbar('Failed to export audit logs', { variant: 'error' });
    } finally {
      setExporting(false);
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

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error':
        return 'error';
      case 'warning':
        return 'warning';
      case 'info':
        return 'info';
      default:
        return 'default';
    }
  };

  const getEventCategoryColor = (category: string) => {
    switch (category) {
      case 'authentication':
        return 'primary';
      case 'authorization':
        return 'secondary';
      case 'security':
        return 'error';
      case 'user_management':
        return 'info';
      case 'infrastructure':
        return 'warning';
      default:
        return 'default';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const renderFilters = () => (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Filters
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Search"
              value={filters.search || ''}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              InputProps={{
                startAdornment: <Search />
              }}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Event Type</InputLabel>
              <Select
                value={filters.event_type || ''}
                onChange={(e) => handleFilterChange('event_type', e.target.value)}
              >
                <MenuItem value="">All</MenuItem>
                {eventTypes.map(type => (
                  <MenuItem key={type} value={type}>{type}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Category</InputLabel>
              <Select
                value={filters.event_category || ''}
                onChange={(e) => handleFilterChange('event_category', e.target.value)}
              >
                <MenuItem value="">All</MenuItem>
                {eventCategories.map(category => (
                  <MenuItem key={category} value={category}>{category}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Level</InputLabel>
              <Select
                value={filters.level || ''}
                onChange={(e) => handleFilterChange('level', e.target.value)}
              >
                <MenuItem value="">All</MenuItem>
                {levels.map(level => (
                  <MenuItem key={level} value={level}>{level}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Success</InputLabel>
              <Select
                value={filters.success === undefined ? '' : filters.success.toString()}
                onChange={(e) => handleFilterChange('success', e.target.value === '' ? undefined : e.target.value === 'true')}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="true">Success</MenuItem>
                <MenuItem value="false">Failed</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              label="User Email"
              value={filters.user_email || ''}
              onChange={(e) => handleFilterChange('user_email', e.target.value)}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              label="IP Address"
              value={filters.ip_address || ''}
              onChange={(e) => handleFilterChange('ip_address', e.target.value)}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DateTimePicker
                label="Start Date"
                value={filters.start_date || null}
                onChange={(date) => handleFilterChange('start_date', date)}
                renderInput={(params) => <TextField {...params} fullWidth />}
              />
            </LocalizationProvider>
          </Grid>
          <Grid item xs={12} md={3}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DateTimePicker
                label="End Date"
                value={filters.end_date || null}
                onChange={(date) => handleFilterChange('end_date', date)}
                renderInput={(params) => <TextField {...params} fullWidth />}
              />
            </LocalizationProvider>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );

  const renderStats = () => (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Statistics
        </Typography>
        {stats && (
          <Grid container spacing={2}>
            <Grid item xs={12} md={3}>
              <Typography variant="h4" color="primary">
                {stats.total_events.toLocaleString()}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Total Events
              </Typography>
            </Grid>
            <Grid item xs={12} md={3}>
              <Typography variant="h4" color="error">
                {stats.failed_events.toLocaleString()}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Failed Events
              </Typography>
            </Grid>
            <Grid item xs={12} md={3}>
              <Typography variant="h4" color="success">
                {stats.success_rate.toFixed(1)}%
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Success Rate
              </Typography>
            </Grid>
            <Grid item xs={12} md={3}>
              <Typography variant="h4" color="info">
                {Object.keys(stats.top_users).length}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Active Users
              </Typography>
            </Grid>
          </Grid>
        )}
      </CardContent>
    </Card>
  );

  const renderLogDetails = (log: AuditLog) => (
    <Box sx={{ p: 2 }}>
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Typography variant="subtitle2" color="textSecondary">
            Event Details
          </Typography>
          <Typography><strong>Type:</strong> {log.event_type}</Typography>
          <Typography><strong>Category:</strong> {log.event_category}</Typography>
          <Typography><strong>Level:</strong> {log.level}</Typography>
          <Typography><strong>Success:</strong> {log.success ? 'Yes' : 'No'}</Typography>
          {log.duration_ms && (
            <Typography><strong>Duration:</strong> {log.duration_ms}ms</Typography>
          )}
          {log.error_code && (
            <Typography><strong>Error Code:</strong> {log.error_code}</Typography>
          )}
          {log.error_message && (
            <Typography><strong>Error:</strong> {log.error_message}</Typography>
          )}
        </Grid>
        <Grid item xs={12} md={6}>
          <Typography variant="subtitle2" color="textSecondary">
            User & Request Info
          </Typography>
          {log.user_email && (
            <Typography><strong>User:</strong> {log.user_name} ({log.user_email})</Typography>
          )}
          {log.ip_address && (
            <Typography><strong>IP Address:</strong> {log.ip_address}</Typography>
          )}
          {log.user_agent && (
            <Typography><strong>User Agent:</strong> {log.user_agent}</Typography>
          )}
          {log.resource_type && (
            <Typography><strong>Resource:</strong> {log.resource_type}/{log.resource_id}</Typography>
          )}
        </Grid>
        {log.metadata && (
          <Grid item xs={12}>
            <Typography variant="subtitle2" color="textSecondary">
              Metadata
            </Typography>
            <Paper sx={{ p: 1, bgcolor: 'grey.50' }}>
              <pre style={{ margin: 0, fontSize: '0.8rem' }}>
                {JSON.stringify(log.metadata, null, 2)}
              </pre>
            </Paper>
          </Grid>
        )}
      </Grid>
    </Box>
  );

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Audit Log Viewer
      </Typography>

      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <Button
          variant="outlined"
          startIcon={<FilterList />}
          onClick={() => setShowFilters(!showFilters)}
        >
          {showFilters ? 'Hide Filters' : 'Show Filters'}
        </Button>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={fetchLogs}
          disabled={loading}
        >
          Refresh
        </Button>
        <Button
          variant="outlined"
          startIcon={<Download />}
          onClick={() => handleExport('csv')}
          disabled={exporting}
        >
          Export CSV
        </Button>
        <Button
          variant="outlined"
          startIcon={<Download />}
          onClick={() => handleExport('json')}
          disabled={exporting}
        >
          Export JSON
        </Button>
        <Button
          variant="outlined"
          startIcon={<Download />}
          onClick={() => handleExport('xlsx')}
          disabled={exporting}
        >
          Export Excel
        </Button>
        <Button
          variant="outlined"
          startIcon={<Download />}
          onClick={() => handleExport('zip')}
          disabled={exporting}
        >
          Export All
        </Button>
      </Box>

      {exporting && (
        <Box sx={{ mb: 2 }}>
          <LinearProgress />
          <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
            Exporting audit logs...
          </Typography>
        </Box>
      )}

      <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)} sx={{ mb: 2 }}>
        <Tab label="Logs" />
        <Tab label="Statistics" />
      </Tabs>

      {activeTab === 0 && (
        <>
          {showFilters && renderFilters()}
          
          <Card>
            <CardContent>
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                  <CircularProgress />
                </Box>
              ) : (
                <>
                  <Typography variant="h6" gutterBottom>
                    Audit Logs ({totalCount.toLocaleString()} total)
                  </Typography>
                  
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Timestamp</TableCell>
                          <TableCell>Event Type</TableCell>
                          <TableCell>Category</TableCell>
                          <TableCell>Level</TableCell>
                          <TableCell>User</TableCell>
                          <TableCell>Message</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell>Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {logs.map((log) => (
                          <React.Fragment key={log.id}>
                            <TableRow>
                              <TableCell>{formatTimestamp(log.timestamp)}</TableCell>
                              <TableCell>{log.event_type}</TableCell>
                              <TableCell>
                                <Chip
                                  label={log.event_category}
                                  color={getEventCategoryColor(log.event_category) as any}
                                  size="small"
                                />
                              </TableCell>
                              <TableCell>
                                <Chip
                                  icon={getLevelIcon(log.level)}
                                  label={log.level}
                                  color={getLevelColor(log.level) as any}
                                  size="small"
                                />
                              </TableCell>
                              <TableCell>{log.user_email || 'System'}</TableCell>
                              <TableCell>{log.message}</TableCell>
                              <TableCell>
                                <Chip
                                  label={log.success ? 'Success' : 'Failed'}
                                  color={log.success ? 'success' : 'error'}
                                  size="small"
                                />
                              </TableCell>
                              <TableCell>
                                <IconButton
                                  size="small"
                                  onClick={() => setExpandedRow(expandedRow === log.id ? null : log.id)}
                                >
                                  {expandedRow === log.id ? <ExpandLess /> : <ExpandMore />}
                                </IconButton>
                                <IconButton
                                  size="small"
                                  onClick={() => setSelectedLog(log)}
                                >
                                  <Visibility />
                                </IconButton>
                              </TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell colSpan={8} sx={{ p: 0 }}>
                                <Collapse in={expandedRow === log.id}>
                                  {renderLogDetails(log)}
                                </Collapse>
                              </TableCell>
                            </TableRow>
                          </React.Fragment>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>

                  <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                    <Pagination
                      count={Math.ceil(totalCount / pageSize)}
                      page={page}
                      onChange={(e, newPage) => setPage(newPage)}
                      color="primary"
                    />
                  </Box>
                </>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {activeTab === 1 && renderStats()}

      {/* Log Details Dialog */}
      <Dialog
        open={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Audit Log Details
        </DialogTitle>
        <DialogContent>
          {selectedLog && renderLogDetails(selectedLog)}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedLog(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AuditLogViewer;