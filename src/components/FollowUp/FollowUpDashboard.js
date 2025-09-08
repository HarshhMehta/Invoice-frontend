import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  IconButton,
  Box,
  Alert,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab
} from '@mui/material';
import {
  Phone as PhoneIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Schedule as ScheduleIcon,
  Person as PersonIcon,
  Notifications as NotificationsIcon,
  WhatsApp as WhatsAppIcon,
  AccessTime as AccessTimeIcon,
  Refresh as RefreshIcon,
  Notes as NotesIcon
} from '@mui/icons-material';
import { makeStyles } from '@mui/styles';
import moment from 'moment';

const useStyles = makeStyles(theme => ({
  container: {
    paddingTop: 20,
    paddingBottom: 50
  },
  statsCard: {
    textAlign: 'center',
    padding: 20
  },
  tableContainer: {
    marginTop: 20
  },
  overdueRow: {
    backgroundColor: '#ffebee'
  },
  todayRow: {
    backgroundColor: '#e3f2fd'
  },
  actionButtons: {
    display: 'flex',
    gap: 4
  }
}));

// Updated API Service to match your routes
const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://invoice-56iv.onrender.com';

const followUpAPI = {
  getHeaders: () => {
    const headers = { 'Content-Type': 'application/json' };
    const token = localStorage.getItem('authToken') || localStorage.getItem('token');
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    return headers;
  },

  handleResponse: async (response) => {
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || errorData.error || `HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  },

  // Get all follow-ups (public route)
  getAllFollowUps: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.status && filters.status !== 'all') params.append('status', filters.status);
    if (filters.priority && filters.priority !== 'all') params.append('priority', filters.priority);

    const response = await fetch(`${API_BASE_URL}/api/followups?${params.toString()}`, {
      method: 'GET',
      headers: followUpAPI.getHeaders()
    });
    
    return await followUpAPI.handleResponse(response);
  },

  // Get due follow-ups (protected route)
  getDueFollowUps: async () => {
    const response = await fetch(`${API_BASE_URL}/api/followups/user/due`, {
      method: 'GET',
      headers: followUpAPI.getHeaders()
    });
    
    return await followUpAPI.handleResponse(response);
  },

  // Get today's follow-ups (protected route)
  getTodayFollowUps: async () => {
    const response = await fetch(`${API_BASE_URL}/api/followups/user/today`, {
      method: 'GET',
      headers: followUpAPI.getHeaders()
    });
    
    return await followUpAPI.handleResponse(response);
  },

  // Get stats (protected route)
  getStats: async () => {
    const response = await fetch(`${API_BASE_URL}/api/followups/user/stats`, {
      method: 'GET',
      headers: followUpAPI.getHeaders()
    });
    
    return await followUpAPI.handleResponse(response);
  },

  // Update follow-up status (public route)
  updateFollowUpStatus: async (followUpId, status) => {
    const response = await fetch(`${API_BASE_URL}/api/followups/${followUpId}`, {
      method: 'PATCH',
      headers: followUpAPI.getHeaders(),
      body: JSON.stringify({ status })
    });
    
    return await followUpAPI.handleResponse(response);
  },

  // Add call notes (public route)
  addCallNotes: async (followUpId, notes) => {
    const response = await fetch(`${API_BASE_URL}/api/followups/${followUpId}/call-notes`, {
      method: 'POST',
      headers: followUpAPI.getHeaders(),
      body: JSON.stringify({ notes })
    });
    
    return await followUpAPI.handleResponse(response);
  }
};

const FollowUpDashboard = () => {
  const classes = useStyles();
  const [allFollowUps, setAllFollowUps] = useState([]);
  const [todayFollowUps, setTodayFollowUps] = useState([]);
  const [dueFollowUps, setDueFollowUps] = useState([]);
  const [stats, setStats] = useState({ 
    totalScheduled: 0, 
    todayCount: 0, 
    overdueCount: 0, 
    completedCount: 0 
  });
  const [selectedFollowUp, setSelectedFollowUp] = useState(null);
  const [callNotesDialog, setCallNotesDialog] = useState(false);
  const [notesViewDialog, setNotesViewDialog] = useState(false);
  const [viewNotesData, setViewNotesData] = useState(null);
  const [callNotes, setCallNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({ status: 'all', priority: 'all' });
  const [tabValue, setTabValue] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadAllData();
    
    // Set up interval to refresh data every 2 minutes
    const interval = setInterval(() => {
      loadAllData();
    }, 120000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    loadFilteredFollowUps();
  }, [filters]);

  const loadAllData = async () => {
    setLoading(true);
    setError('');
    
    try {
      await Promise.all([
        loadFilteredFollowUps(),
        loadTodayFollowUps(),
        loadDueFollowUps(),
        loadStats()
      ]);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Error loading follow-up data');
    } finally {
      setLoading(false);
    }
  };

  const loadFilteredFollowUps = async () => {
    try {
      const response = await followUpAPI.getAllFollowUps(filters);
      
      if (response.success) {
        setAllFollowUps(response.followUps || response.data || []);
      }
    } catch (err) {
      console.error('Error loading follow-ups:', err);
      if (!loading) {
        setError('Error loading follow-ups: ' + err.message);
      }
    }
  };

  const loadTodayFollowUps = async () => {
    try {
      const response = await followUpAPI.getTodayFollowUps();
      
      if (response.success) {
        setTodayFollowUps(response.followUps || response.data || []);
      }
    } catch (err) {
      console.error('Error loading today follow-ups:', err);
      // Fallback to calculating from all data
      setTodayFollowUps(allFollowUps.filter(fu => isDueToday(fu) && fu.status === 'scheduled'));
    }
  };

  const loadDueFollowUps = async () => {
    try {
      const response = await followUpAPI.getDueFollowUps();
      
      if (response.success) {
        setDueFollowUps(response.followUps || response.data || []);
      }
    } catch (err) {
      console.error('Error loading due follow-ups:', err);
      // Fallback to calculating from all data
      setDueFollowUps(allFollowUps.filter(fu => isOverdue(fu)));
    }
  };

  const loadStats = async () => {
    try {
      const response = await followUpAPI.getStats();
      
      if (response.success) {
        setStats(response.stats || response.data || stats);
      }
    } catch (err) {
      console.error('Error loading stats:', err);
      // Calculate stats from existing data
      const totalScheduled = allFollowUps.filter(fu => fu.status === 'scheduled').length;
      const todayCount = allFollowUps.filter(fu => isDueToday(fu) && fu.status === 'scheduled').length;
      const overdueCount = allFollowUps.filter(fu => isOverdue(fu)).length;
      const completedCount = allFollowUps.filter(fu => fu.status === 'completed').length;
      
      setStats({ totalScheduled, todayCount, overdueCount, completedCount });
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    try {
      await loadAllData();
    } finally {
      setRefreshing(false);
    }
  };

  const updateFollowUpStatus = async (followUpId, status) => {
    setSubmitting(true);
    
    try {
      const response = await followUpAPI.updateFollowUpStatus(followUpId, status);

      if (response.success) {
        await loadAllData();
      } else {
        setError('Failed to update follow-up status');
      }
    } catch (err) {
      console.error('Error updating follow-up:', err);
      setError('Error updating follow-up: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const addCallNotes = async () => {
    if (!selectedFollowUp || !callNotes.trim()) return;

    setSubmitting(true);
    
    try {
      const response = await followUpAPI.addCallNotes(selectedFollowUp._id, callNotes);

      if (response.success) {
        setCallNotesDialog(false);
        setSelectedFollowUp(null);
        setCallNotes('');
        await loadAllData();
      } else {
        setError('Failed to save call notes');
      }
    } catch (err) {
      console.error('Error saving call notes:', err);
      setError('Error saving call notes: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const markAsCompleted = (followUpId) => {
    updateFollowUpStatus(followUpId, 'completed');
  };

  const closeFollowUp = (followUpId) => {
    updateFollowUpStatus(followUpId, 'closed');
  };

  const openWhatsApp = (phoneNumber) => {
    const cleanedNumber = phoneNumber.replace(/\D/g, '');
    const whatsappUrl = `https://wa.me/${cleanedNumber}`;
    window.open(whatsappUrl, '_blank');
  };

  const openNotesView = (followUp) => {
    setViewNotesData(followUp);
    setNotesViewDialog(true);
  };

  const openCallNotesDialog = (followUp) => {
    setSelectedFollowUp(followUp);
    setCallNotesDialog(true);
    setCallNotes('');
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'success';
      case 'closed': return 'default';
      case 'scheduled': return 'info';
      default: return 'default';
    }
  };

  const isDueToday = (followUp) => {
    return moment(followUp.followUpDate).isSame(moment(), 'day');
  };

  const isOverdue = (followUp) => {
    const now = moment();
    const followUpDateTime = moment(`${moment(followUp.followUpDate).format('YYYY-MM-DD')} ${followUp.followUpTime}`);
    return now.isAfter(followUpDateTime) && followUp.status === 'scheduled';
  };

  const getTimeStatus = (followUp) => {
    if (isDueToday(followUp)) return 'Today';
    if (isOverdue(followUp)) return 'Overdue';
    return 'Upcoming';
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const getTabData = () => {
    switch (tabValue) {
      case 0: return allFollowUps;
      case 1: return allFollowUps.filter(fu => fu.status === 'scheduled');
      case 2: return dueFollowUps;
      case 3: return todayFollowUps;
      default: return allFollowUps;
    }
  };

  if (loading) {
    return (
      <Container className={classes.container}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
          <CircularProgress size={50} />
          <Typography variant="h6" style={{ marginLeft: 16 }}>
            Loading follow-ups...
          </Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container className={classes.container}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">
          Follow-up Dashboard
        </Typography>
        <Button
          variant="outlined"
          onClick={refreshData}
          startIcon={refreshing ? <CircularProgress size={16} /> : <RefreshIcon />}
          disabled={refreshing}
        >
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </Button>
      </Box>

      {error && (
        <Alert severity="error" style={{ marginBottom: 20 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Stats Cards */}
      <Grid container spacing={3} style={{ marginBottom: 30 }}>
        <Grid item xs={12} md={3}>
          <Card className={classes.statsCard}>
            <CardContent>
              <NotificationsIcon style={{ fontSize: 40, color: '#f44336' }} />
              <Typography variant="h4" style={{ color: '#f44336' }}>
                {stats.overdueCount}
              </Typography>
              <Typography variant="subtitle1">Overdue</Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Card className={classes.statsCard}>
            <CardContent>
              <AccessTimeIcon style={{ fontSize: 40, color: '#ff9800' }} />
              <Typography variant="h4" style={{ color: '#ff9800' }}>
                {stats.todayCount}
              </Typography>
              <Typography variant="subtitle1">Due Today</Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Card className={classes.statsCard}>
            <CardContent>
              <ScheduleIcon style={{ fontSize: 40, color: '#2196f3' }} />
              <Typography variant="h4" style={{ color: '#2196f3' }}>
                {stats.totalScheduled}
              </Typography>
              <Typography variant="subtitle1">Scheduled</Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Card className={classes.statsCard}>
            <CardContent>
              <PersonIcon style={{ fontSize: 40, color: '#4caf50' }} />
              <Typography variant="h4" style={{ color: '#4caf50' }}>
                {stats.completedCount}
              </Typography>
              <Typography variant="subtitle1">Completed</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters and Tabs */}
      <Card style={{ marginBottom: 20 }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Tabs value={tabValue} onChange={handleTabChange}>
              <Tab label={`All (${allFollowUps.length})`} />
              <Tab label={`Scheduled (${allFollowUps.filter(fu => fu.status === 'scheduled').length})`} />
              <Tab label={`Overdue (${dueFollowUps.length})`} />
              <Tab label={`Today (${todayFollowUps.length})`} />
            </Tabs>
            
            <Box display="flex" gap={2}>
              <FormControl size="small" style={{ minWidth: 120 }}>
                <InputLabel>Status</InputLabel>
                <Select
                  value={filters.status}
                  onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                >
                  <MenuItem value="all">All Status</MenuItem>
                  <MenuItem value="scheduled">Scheduled</MenuItem>
                  <MenuItem value="completed">Completed</MenuItem>
                  <MenuItem value="closed">Closed</MenuItem>
                </Select>
              </FormControl>
              
              <FormControl size="small" style={{ minWidth: 120 }}>
                <InputLabel>Priority</InputLabel>
                <Select
                  value={filters.priority}
                  onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value }))}
                >
                  <MenuItem value="all">All Priority</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="low">Low</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Main Table */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Follow-ups ({getTabData().length})
          </Typography>
          
          {getTabData().length === 0 ? (
            <Alert severity="info">
              No follow-ups found. Create follow-ups from your invoice list to see them here.
            </Alert>
          ) : (
            <TableContainer component={Paper} className={classes.tableContainer}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Date & Time</strong></TableCell>
                    <TableCell><strong>Customer</strong></TableCell>
                    <TableCell><strong>Phone</strong></TableCell>
                    <TableCell><strong>Reason</strong></TableCell>
                    <TableCell><strong>Status</strong></TableCell>
                    <TableCell><strong>Priority</strong></TableCell>
                    <TableCell><strong>Notes</strong></TableCell>
                    <TableCell><strong>Actions</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {getTabData().map((followUp) => (
                    <TableRow 
                      key={followUp._id}
                      className={
                        isOverdue(followUp) ? classes.overdueRow : 
                        isDueToday(followUp) ? classes.todayRow : ''
                      }
                    >
                      <TableCell>
                        <Typography variant="body2">
                          {moment(followUp.followUpDate).format('DD/MM/YY')}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {followUp.followUpTime}
                        </Typography>
                        <Typography variant="caption" display="block" color="textSecondary">
                          {getTimeStatus(followUp)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {followUp.customerName}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {followUp.phoneNumber}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" style={{ maxWidth: 150 }}>
                          {followUp.reason && followUp.reason.length > 40 
                            ? followUp.reason.substring(0, 40) + '...'
                            : followUp.reason || 'No reason'
                          }
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={followUp.status.toUpperCase()}
                          color={getStatusColor(followUp.status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={followUp.priority ? followUp.priority.toUpperCase() : 'MEDIUM'}
                          color={getPriorityColor(followUp.priority || 'medium')}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography variant="body2" style={{ maxWidth: 100 }}>
                            {followUp.notes 
                              ? followUp.notes.length > 20 
                                ? followUp.notes.substring(0, 20) + '...' 
                                : followUp.notes
                              : 'No notes'
                            }
                          </Typography>
                          {(followUp.notes || followUp.callHistory?.length > 0) && (
                            <IconButton
                              size="small"
                              onClick={() => openNotesView(followUp)}
                              title="View Notes"
                            >
                              <NotesIcon fontSize="small" />
                            </IconButton>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box className={classes.actionButtons}>
                          <IconButton
                            size="small"
                            onClick={() => openWhatsApp(followUp.phoneNumber)}
                            title="WhatsApp"
                            color="success"
                            disabled={submitting}
                          >
                            <WhatsAppIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => openCallNotesDialog(followUp)}
                            title="Call & Add Notes"
                            color="primary"
                            disabled={submitting}
                          >
                            <PhoneIcon fontSize="small" />
                          </IconButton>
                          {followUp.status === 'scheduled' && (
                            <>
                              <IconButton
                                size="small"
                                onClick={() => markAsCompleted(followUp._id)}
                                title="Mark as Completed"
                                color="success"
                                disabled={submitting}
                              >
                                <CheckIcon fontSize="small" />
                              </IconButton>
                              <IconButton
                                size="small"
                                onClick={() => closeFollowUp(followUp._id)}
                                title="Close Follow-up"
                                color="error"
                                disabled={submitting}
                              >
                                <CloseIcon fontSize="small" />
                              </IconButton>
                            </>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Notes View Dialog */}
      <Dialog open={notesViewDialog} onClose={() => setNotesViewDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Follow-up Details - {viewNotesData?.customerName}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" gutterBottom>Follow-up Information:</Typography>
              <Box mb={2} p={2} bgcolor="#f5f5f5" borderRadius={1}>
                <Typography variant="body2"><strong>Date:</strong> {moment(viewNotesData?.followUpDate).format('DD/MM/YYYY')}</Typography>
                <Typography variant="body2"><strong>Time:</strong> {viewNotesData?.followUpTime}</Typography>
                <Typography variant="body2"><strong>Phone:</strong> {viewNotesData?.phoneNumber}</Typography>
                <Typography variant="body2"><strong>Priority:</strong> {(viewNotesData?.priority || 'medium').toUpperCase()}</Typography>
                <Typography variant="body2"><strong>Status:</strong> {(viewNotesData?.status || 'scheduled').toUpperCase()}</Typography>
              </Box>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" gutterBottom>Additional Information:</Typography>
              <Box mb={2} p={2} bgcolor="#f5f5f5" borderRadius={1}>
                <Typography variant="body2"><strong>Invoice:</strong> #{viewNotesData?.invoiceId}</Typography>
                <Typography variant="caption" color="textSecondary" style={{ marginTop: 8, display: 'block' }}>
                  Created: {moment(viewNotesData?.createdAt).format('DD/MM/YYYY hh:mm A')}
                </Typography>
              </Box>
            </Grid>
          </Grid>

          <Typography variant="subtitle2" gutterBottom>Reason for Follow-up:</Typography>
          <Box mb={2} p={2} bgcolor="#fff3e0" borderRadius={1}>
            <Typography variant="body1">{viewNotesData?.reason || 'No reason specified'}</Typography>
          </Box>

          <Typography variant="subtitle2" gutterBottom>Notes:</Typography>
          <Box mb={2} p={2} bgcolor="#e8f5e9" borderRadius={1}>
            <Typography variant="body1">{viewNotesData?.notes || 'No notes'}</Typography>
          </Box>

          {viewNotesData?.callHistory && viewNotesData.callHistory.length > 0 && (
            <>
              <Typography variant="subtitle2" gutterBottom>Call History ({viewNotesData.callHistory.length}):</Typography>
              <Box maxHeight={200} overflow="auto">
                {viewNotesData.callHistory.map((call, index) => (
                  <Box key={index} mb={1} p={2} bgcolor="#f3e5f5" borderRadius={1}>
                    <Typography variant="caption" color="primary">
                      Call #{index + 1} - {moment(call.date).format('DD/MM/YYYY hh:mm A')}
                    </Typography>
                    <Typography variant="body2" style={{ marginTop: 4 }}>
                      {call.notes}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNotesViewDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Call Notes Dialog */}
      <Dialog open={callNotesDialog} onClose={() => setCallNotesDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Add Call Notes - {selectedFollowUp?.customerName}
        </DialogTitle>
        <DialogContent>
          <Box mb={2}>
            <Typography variant="subtitle2">Reason:</Typography>
            <Typography variant="body2" color="textSecondary">
              {selectedFollowUp?.reason || 'No reason specified'}
            </Typography>
          </Box>
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Call Notes"
            value={callNotes}
            onChange={(e) => setCallNotes(e.target.value)}
            placeholder="What happened in this follow-up call?"
            margin="normal"
            disabled={submitting}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCallNotesDialog(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button 
            onClick={addCallNotes} 
            variant="contained" 
            disabled={!callNotes.trim() || submitting}
            startIcon={submitting ? <CircularProgress size={16} /> : null}
          >
            {submitting ? 'Saving...' : 'Save Notes'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default FollowUpDashboard;