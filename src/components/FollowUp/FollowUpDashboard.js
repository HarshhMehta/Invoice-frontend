import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Grid,
  Badge,
  Divider,
  Avatar,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import {
  Phone as PhoneIcon,
  WhatsApp as WhatsAppIcon,
  Add as AddIcon,
  Schedule as ScheduleIcon,
  Person as PersonIcon,
  AccessTime as AccessTimeIcon,
  TrendingUp as TrendingUpIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  History as HistoryIcon,
  Call as CallIcon,
  Assignment as AssignmentIcon,
  Today as TodayIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { makeStyles } from '@mui/styles';
import moment from 'moment';

const useStyles = makeStyles(theme => ({
  dashboard: {
    paddingTop: '70px',
    paddingBottom: '50px',
    paddingLeft: "120px;",
  },
  statsCard: {
    textAlign: 'center',
    padding: '20px',
    borderRadius: '12px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white'
  },
  followUpCard: {
    marginBottom: '12px',
    borderRadius: '8px',
    '&:hover': {
      boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
      transform: 'translateY(-2px)',
      transition: 'all 0.3s ease'
    }
  },
  overdueCard: {
    borderLeft: '4px solid #f44336'
  },
  todayCard: {
    borderLeft: '4px solid #ff9800'
  },
  upcomingCard: {
    borderLeft: '4px solid #4caf50'
  },
  completedCard: {
    borderLeft: '4px solid #9e9e9e'
  },
  priorityHigh: {
    backgroundColor: '#ffebee',
    borderLeft: '4px solid #f44336'
  },
  priorityMedium: {
    backgroundColor: '#fff3e0',
    borderLeft: '4px solid #ff9800'
  },
  priorityLow: {
    backgroundColor: '#e8f5e8',
    borderLeft: '4px solid #4caf50'
  }
}));

// API Service
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

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

  getAllFollowUps: async () => {
    const response = await fetch(`${API_BASE_URL}/api/followups`, {
      method: 'GET',
      headers: followUpAPI.getHeaders()
    });
    
    return await followUpAPI.handleResponse(response);
  },

  updateFollowUpStatus: async (followUpId, status) => {
    const response = await fetch(`${API_BASE_URL}/api/followups/${followUpId}`, {
      method: 'PATCH',
      headers: followUpAPI.getHeaders(),
      body: JSON.stringify({ status })
    });
    
    return await followUpAPI.handleResponse(response);
  },

  addCallRecord: async (followUpId, callData) => {
    const response = await fetch(`${API_BASE_URL}/api/followups/${followUpId}/call-record`, {
      method: 'POST',
      headers: followUpAPI.getHeaders(),
      body: JSON.stringify(callData)
    });
    
    return await followUpAPI.handleResponse(response);
  },

  scheduleNextFollowUp: async (followUpData) => {
    const response = await fetch(`${API_BASE_URL}/api/followups`, {
      method: 'POST',
      headers: followUpAPI.getHeaders(),
      body: JSON.stringify(followUpData)
    });
    
    return await followUpAPI.handleResponse(response);
  },

  // Updated method to properly update follow-up details
  updateFollowUp: async (followUpId, updateData) => {
    const response = await fetch(`${API_BASE_URL}/api/followups/${followUpId}`, {
      method: 'PUT',
      headers: followUpAPI.getHeaders(),
      body: JSON.stringify(updateData)
    });
    
    return await followUpAPI.handleResponse(response);
  }
};

const FollowUpDashboard = () => {
  const classes = useStyles();
  const [followUps, setFollowUps] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tabValue, setTabValue] = useState(0);
  
  // Dialog states
  const [callRecordDialog, setCallRecordDialog] = useState(false);
  const [nextFollowUpDialog, setNextFollowUpDialog] = useState(false);
  const [selectedFollowUp, setSelectedFollowUp] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  
  // Call record form
  const [callRecord, setCallRecord] = useState({
    callResult: '',
    notes: '',
    callDuration: '',
    nextAction: ''
  });
  
  // Next follow-up form
  const [nextFollowUp, setNextFollowUp] = useState({
    followUpDate: '',
    followUpTime: '',
    notes: '',
    priority: 'medium',
    reason: ''
  });

  useEffect(() => {
    loadFollowUps();
  }, []);

  const loadFollowUps = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await followUpAPI.getAllFollowUps();
      
      if (response.success) {
        // Remove duplicates based on _id and ensure proper sorting
        const uniqueFollowUps = response.followUps.filter((followUp, index, self) => 
          index === self.findIndex(fu => fu._id === followUp._id)
        );
        
        const sortedFollowUps = uniqueFollowUps.sort((a, b) => {
          return new Date(a.followUpDate) - new Date(b.followUpDate);
        });
        
        setFollowUps(sortedFollowUps);
        console.log('Follow-ups loaded:', sortedFollowUps); // Debug log
      } else {
        setError('Failed to load follow-ups');
      }
    } catch (err) {
      console.error('Error loading follow-ups:', err);
      setError(err.message || 'Error loading follow-ups');
    } finally {
      setLoading(false);
    }
  };

  // Fixed categorization logic
  const categorizeFollowUps = () => {
    const now = moment();
    const today = moment().startOf('day');
    
    // Filter only scheduled follow-ups and categorize properly
    const scheduledFollowUps = followUps.filter(fu => fu.status === 'scheduled');
    
    const overdue = scheduledFollowUps.filter(fu => {
      const followUpMoment = moment(fu.followUpDate);
      return followUpMoment.isBefore(today);
    }).sort((a, b) => moment(a.followUpDate) - moment(b.followUpDate));
    
    const todayFollowUps = scheduledFollowUps.filter(fu => {
      const followUpMoment = moment(fu.followUpDate);
      return followUpMoment.isSame(today, 'day');
    }).sort((a, b) => moment(`${a.followUpDate} ${a.followUpTime}`) - moment(`${b.followUpDate} ${b.followUpTime}`));
    
    const upcoming = scheduledFollowUps.filter(fu => {
      const followUpMoment = moment(fu.followUpDate);
      return followUpMoment.isAfter(today);
    }).sort((a, b) => moment(a.followUpDate) - moment(b.followUpDate));
    
    const completed = followUps.filter(fu => 
      fu.status === 'completed'
    ).sort((a, b) => moment(b.updatedAt) - moment(a.updatedAt));

    console.log('Categorized:', { overdue: overdue.length, today: todayFollowUps.length, upcoming: upcoming.length, completed: completed.length }); // Debug log

    return { overdue, todayFollowUps, upcoming, completed };
  };

  const getStats = () => {
    const { overdue, todayFollowUps, upcoming, completed } = categorizeFollowUps();
    const total = followUps.length;
    const scheduled = overdue.length + todayFollowUps.length + upcoming.length;
    
    return {
      total,
      scheduled,
      overdue: overdue.length,
      today: todayFollowUps.length,
      upcoming: upcoming.length,
      completed: completed.length
    };
  };

  const openCallRecord = (followUp) => {
    setSelectedFollowUp(followUp);
    setCallRecord({
      callResult: '',
      notes: '',
      callDuration: '',
      nextAction: ''
    });
    setCallRecordDialog(true);
  };

  const openNextFollowUp = (followUp) => {
    setSelectedFollowUp(followUp);
    // Pre-fill current values for editing
    setNextFollowUp({
      followUpDate: moment(followUp.followUpDate).format('YYYY-MM-DD'),
      followUpTime: followUp.followUpTime || '',
      notes: followUp.notes || '',
      priority: followUp.priority || 'medium',
      reason: followUp.reason || ''
    });
    setNextFollowUpDialog(true);
  };

  // Fixed method to handle reschedule properly with better date comparison
  const handleNextFollowUpSubmit = async () => {
    if (!nextFollowUp.followUpDate || !nextFollowUp.followUpTime || !nextFollowUp.notes || !nextFollowUp.reason) {
      setError('Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      // Create proper date for comparison
      const newFollowUpDate = nextFollowUp.followUpDate; // Keep as YYYY-MM-DD format
      const todayDate = moment().format('YYYY-MM-DD');
      
      console.log('New follow-up date:', newFollowUpDate);
      console.log('Today date:', todayDate);
      
      // Update the existing follow-up with new date/time and details
      const updateData = {
        followUpDate: newFollowUpDate,
        followUpTime: nextFollowUp.followUpTime,
        reason: nextFollowUp.reason,
        notes: nextFollowUp.notes,
        priority: nextFollowUp.priority,
        status: 'scheduled',
        updatedAt: new Date().toISOString()
      };

      console.log('Updating follow-up:', selectedFollowUp._id, updateData);

      const response = await followUpAPI.updateFollowUp(selectedFollowUp._id, updateData);

      if (response.success) {
        // Close dialog first
        setNextFollowUpDialog(false);
        setSelectedFollowUp(null);
        
        // Clear form
        setNextFollowUp({
          followUpDate: '',
          followUpTime: '',
          notes: '',
          priority: 'medium',
          reason: ''
        });
        
        // Force reload data from server
        await loadFollowUps();
        
        // Auto-navigate to appropriate tab based on new date with proper comparison
        setTimeout(() => {
          const newDateMoment = moment(newFollowUpDate).startOf('day');
          const todayMoment = moment().startOf('day');
          
          console.log('Date comparison for tab navigation:');
          console.log('New date moment:', newDateMoment.format('YYYY-MM-DD'));
          console.log('Today moment:', todayMoment.format('YYYY-MM-DD'));
          console.log('Is before today:', newDateMoment.isBefore(todayMoment));
          console.log('Is same as today:', newDateMoment.isSame(todayMoment, 'day'));
          console.log('Is after today:', newDateMoment.isAfter(todayMoment, 'day'));
          
          if (newDateMoment.isBefore(todayMoment)) {
            console.log('Switching to Overdue tab');
            setTabValue(0); // Overdue
          } else if (newDateMoment.isSame(todayMoment, 'day')) {
            console.log('Switching to Today tab');
            setTabValue(1); // Today
          } else {
            console.log('Switching to Upcoming tab');
            setTabValue(2); // Upcoming
          }
        }, 200);
        
      } else {
        setError('Failed to update follow-up');
      }
    } catch (err) {
      console.error('Error updating follow-up:', err);
      setError(err.message || 'Error updating follow-up');
    } finally {
      setSubmitting(false);
    }
  };

  const markAsCompleted = async (followUpId) => {
    try {
      setLoading(true);
      const response = await followUpAPI.updateFollowUpStatus(followUpId, 'completed');
      
      if (response.success) {
        // Immediately reload data
        await loadFollowUps();
        // Auto-navigate to completed tab
        setTabValue(3);
      } else {
        setError('Failed to mark as completed');
      }
    } catch (err) {
      setError(err.message || 'Error updating status');
    } finally {
      setLoading(false);
    }
  };

  const openWhatsApp = (phoneNumber) => {
    const cleanedNumber = phoneNumber.replace(/\D/g, '');
    const whatsappUrl = `https://wa.me/${cleanedNumber}`;
    window.open(whatsappUrl, '_blank');
  };

  const getPriorityClass = (priority) => {
    switch(priority) {
      case 'high': return classes.priorityHigh;
      case 'medium': return classes.priorityMedium;
      case 'low': return classes.priorityLow;
      default: return classes.priorityMedium;
    }
  };

  const getPriorityColor = (priority) => {
    switch(priority) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'success';
      default: return 'info';
    }
  };

  const renderFollowUpCard = (followUp, type) => {
    const typeClass = type === 'overdue' ? classes.overdueCard : 
                     type === 'today' ? classes.todayCard : 
                     type === 'upcoming' ? classes.upcomingCard : classes.completedCard;

    return (
      <Card key={followUp._id} className={`${classes.followUpCard} ${typeClass} ${getPriorityClass(followUp.priority)}`}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
            <Box>
              <Typography variant="h6" color="primary">
                {followUp.customerName}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {followUp.phoneNumber}
              </Typography>
            </Box>
            <Box display="flex" gap={1}>
              <Chip 
                label={followUp.priority?.toUpperCase() || 'MEDIUM'} 
                color={getPriorityColor(followUp.priority)}
                size="small"
              />
              {type === 'overdue' && (
                <Chip 
                  label="OVERDUE" 
                  color="error" 
                  size="small"
                  icon={<WarningIcon />}
                />
              )}
              {type === 'today' && (
                <Chip 
                  label="TODAY" 
                  color="warning" 
                  size="small"
                  icon={<TodayIcon />}
                />
              )}
            </Box>
          </Box>

          <Typography variant="body2" gutterBottom>
            <strong>Follow-up:</strong> {moment(followUp.followUpDate).format('DD/MM/YYYY')} at {moment(followUp.followUpTime, "HH:mm").format("hh:mm A")}
          </Typography>
          
          <Typography variant="body2" gutterBottom>
            <strong>Reason:</strong> {followUp.reason}
          </Typography>
          
          <Typography variant="body2" gutterBottom>
            <strong>Notes:</strong> {followUp.notes}
          </Typography>

          <Box display="flex" gap={1} mt={2} flexWrap="wrap">
            <Button
              size="small"
              variant="contained"
              color="success"
              startIcon={<WhatsAppIcon />}
              onClick={() => openWhatsApp(followUp.phoneNumber)}
            >
              WhatsApp
            </Button>
            
            {followUp.status === 'scheduled' && (
              <>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<ScheduleIcon />}
                  onClick={() => openNextFollowUp(followUp)}
                >
                  Reschedule
                </Button>
                
                <Button
                  size="small"
                  variant="contained"
                  color="primary"
                  startIcon={<CheckIcon />}
                  onClick={() => markAsCompleted(followUp._id)}
                >
                  Complete
                </Button>
              </>
            )}
          </Box>
        </CardContent>
      </Card>
    );
  };

  const stats = getStats();
  const { overdue, todayFollowUps, upcoming, completed } = categorizeFollowUps();

  if (loading && followUps.length === 0) {
    return (
      <Container className={classes.dashboard}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container 
      className={classes.dashboard} 
      style={{ maxWidth: '1200px', paddingLeft: '10px' }}
    >
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h4">
          Follow-up Dashboard
        </Typography>
        <Button
          variant="outlined"
          onClick={() => loadFollowUps(true)}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={16} /> : <TrendingUpIcon />}
        >
          {loading ? 'Refreshing...' : 'Refresh Data'}
        </Button>
      </Box>

      {error && (
        <Alert severity="error" style={{ marginBottom: 16 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Stats Cards */}
      <Grid container spacing={3} style={{ marginBottom: 24 }}>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent style={{ textAlign: 'center' }}>
              <Avatar style={{ backgroundColor: '#1976d2', margin: '0 auto 8px' }}>
                <AssignmentIcon />
              </Avatar>
              <Typography variant="h4">{stats.total}</Typography>
              <Typography variant="body2" color="textSecondary">Total</Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent style={{ textAlign: 'center' }}>
              <Avatar style={{ backgroundColor: '#f44336', margin: '0 auto 8px' }}>
                <WarningIcon />
              </Avatar>
              <Typography variant="h4">{stats.overdue}</Typography>
              <Typography variant="body2" color="textSecondary">Overdue</Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent style={{ textAlign: 'center' }}>
              <Avatar style={{ backgroundColor: '#ff9800', margin: '0 auto 8px' }}>
                <TodayIcon />
              </Avatar>
              <Typography variant="h4">{stats.today}</Typography>
              <Typography variant="body2" color="textSecondary">Today</Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent style={{ textAlign: 'center' }}>
              <Avatar style={{ backgroundColor: '#4caf50', margin: '0 auto 8px' }}>
                <ScheduleIcon />
              </Avatar>
              <Typography variant="h4">{stats.upcoming}</Typography>
              <Typography variant="body2" color="textSecondary">Upcoming</Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent style={{ textAlign: 'center' }}>
              <Avatar style={{ backgroundColor: '#4caf50', margin: '0 auto 8px' }}>
                <CheckIcon />
              </Avatar>
              <Typography variant="h4">{stats.completed}</Typography>
              <Typography variant="body2" color="textSecondary">Completed</Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent style={{ textAlign: 'center' }}>
              <Avatar style={{ backgroundColor: '#9e9e9e', margin: '0 auto 8px' }}>
                <AccessTimeIcon />
              </Avatar>
              <Typography variant="h4">{stats.scheduled}</Typography>
              <Typography variant="body2" color="textSecondary">Scheduled</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs for different categories */}
      <Paper style={{ marginBottom: 24 }}>
        <Tabs
          value={tabValue}
          onChange={(e, newValue) => setTabValue(newValue)}
          indicatorColor="primary"
          textColor="primary"
          centered
        >
          <Tab 
            label={
              <Badge badgeContent={stats.overdue} color="error">
                Overdue
              </Badge>
            } 
          />
          <Tab 
            label={
              <Badge badgeContent={stats.today} color="warning">
                Today
              </Badge>
            } 
          />
          <Tab 
            label={
              <Badge badgeContent={stats.upcoming} color="info">
                Upcoming
              </Badge>
            } 
          />
          <Tab 
            label={
              <Badge badgeContent={stats.completed} color="success">
                Completed
              </Badge>
            } 
          />
        </Tabs>
      </Paper>

      {/* Follow-up Lists */}
      <Box>
        {tabValue === 0 && (
          <Box>
            <Typography variant="h6" gutterBottom color="error">
              Overdue Follow-ups ({overdue.length})
            </Typography>
            {overdue.length === 0 ? (
              <Alert severity="success">No overdue follow-ups!</Alert>
            ) : (
              overdue.map(followUp => renderFollowUpCard(followUp, 'overdue'))
            )}
          </Box>
        )}

        {tabValue === 1 && (
          <Box>
            <Typography variant="h6" gutterBottom color="warning.main">
              Today's Follow-ups ({todayFollowUps.length})
            </Typography>
            {todayFollowUps.length === 0 ? (
              <Alert severity="info">No follow-ups scheduled for today!</Alert>
            ) : (
              todayFollowUps.map(followUp => renderFollowUpCard(followUp, 'today'))
            )}
          </Box>
        )}

        {tabValue === 2 && (
          <Box>
            <Typography variant="h6" gutterBottom color="success.main">
              Upcoming Follow-ups ({upcoming.length})
            </Typography>
            {upcoming.length === 0 ? (
              <Alert severity="info">No upcoming follow-ups scheduled!</Alert>
            ) : (
              upcoming.map(followUp => renderFollowUpCard(followUp, 'upcoming'))
            )}
          </Box>
        )}

        {tabValue === 3 && (
          <Box>
            <Typography variant="h6" gutterBottom>
              Completed Follow-ups ({completed.length})
            </Typography>
            {completed.length === 0 ? (
              <Alert severity="info">No completed follow-ups yet!</Alert>
            ) : (
              completed.map(followUp => renderFollowUpCard(followUp, 'completed'))
            )}
          </Box>
        )}
      </Box>

      {/* Next Follow-up Dialog */}
      <Dialog open={nextFollowUpDialog} onClose={() => setNextFollowUpDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Reschedule Follow-up - {selectedFollowUp?.customerName}</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={2}
            label="Reason for Follow-up *"
            value={nextFollowUp.reason}
            onChange={(e) => setNextFollowUp(prev => ({ ...prev, reason: e.target.value }))}
            margin="normal"
            placeholder="Why scheduling follow-up?"
          />

          <TextField
            fullWidth
            multiline
            rows={2}
            label="Notes *"
            value={nextFollowUp.notes}
            onChange={(e) => setNextFollowUp(prev => ({ ...prev, notes: e.target.value }))}
            margin="normal"
            placeholder="Additional information"
          />

          <Box display="flex" gap={2} mt={2}>
            <TextField
              type="date"
              label="Follow-up Date *"
              value={nextFollowUp.followUpDate}
              onChange={(e) => setNextFollowUp(prev => ({ ...prev, followUpDate: e.target.value }))}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            
            <TextField
              type="time"
              label="Follow-up Time *"
              value={nextFollowUp.followUpTime}
              onChange={(e) => setNextFollowUp(prev => ({ ...prev, followUpTime: e.target.value }))}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
          </Box>

          <FormControl fullWidth margin="normal">
            <InputLabel>Priority</InputLabel>
            <Select
              value={nextFollowUp.priority}
              onChange={(e) => setNextFollowUp(prev => ({ ...prev, priority: e.target.value }))}
            >
              <MenuItem value="low">Low</MenuItem>
              <MenuItem value="medium">Medium</MenuItem>
              <MenuItem value="high">High</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNextFollowUpDialog(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button 
            onClick={handleNextFollowUpSubmit} 
            variant="contained" 
            color="primary"
            disabled={submitting}
          >
            {submitting ? <CircularProgress size={20} /> : 'Update Follow-up'}
          </Button>
        </DialogActions>
      </Dialog>

      {loading && (
        <Box 
          position="fixed" 
          top="50%" 
          left="50%" 
          style={{ transform: 'translate(-50%, -50%)', zIndex: 9999 }}
        >
          <CircularProgress />
        </Box>
      )}
    </Container>
  );
};

export default FollowUpDashboard;