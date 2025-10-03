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
  Typography,
  Box,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Divider,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  Phone as PhoneIcon,
  Close as CloseIcon,
  Check as CheckIcon,
  Schedule as ScheduleIcon,
  Person as PersonIcon,
  WhatsApp as WhatsAppIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { makeStyles } from '@mui/styles';
import moment from 'moment';

const useStyles = makeStyles(theme => ({
  dialogContent: {
    minWidth: 500,
    maxHeight: 600
  },
  followUpItem: {
    border: '1px solid #e0e0e0',
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#f9f9f9'
  },
  scheduled: {
    borderLeft: '4px solid #2196f3'
  },
  completed: {
    borderLeft: '4px solid #4caf50'
  },
  closed: {
    borderLeft: '4px solid #9e9e9e'
  },
  statusChip: {
    marginLeft: 8
  }
}));

// Updated API Service - Simplified without auth requirements
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const followUpAPI = {
  getHeaders: () => {
    // Always include Content-Type, optionally include auth token if available
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

  createFollowUp: async (followUpData) => {
    const response = await fetch(`${API_BASE_URL}/api/followups`, {
      method: 'POST',
      headers: followUpAPI.getHeaders(),
      body: JSON.stringify(followUpData)
    });
    
    return await followUpAPI.handleResponse(response);
  },

  getInvoiceFollowUps: async (invoiceId) => {
    // Updated to use the new route without auth requirement
    const response = await fetch(`${API_BASE_URL}/api/followups/invoice/${invoiceId}`, {
      method: 'GET',
      headers: followUpAPI.getHeaders()
    });
    
    return await followUpAPI.handleResponse(response);
  },

  updateFollowUpStatus: async (followUpId, status) => {
    // Updated to use PATCH method to match your route
    const response = await fetch(`${API_BASE_URL}/api/followups/${followUpId}`, {
      method: 'PATCH',
      headers: followUpAPI.getHeaders(),
      body: JSON.stringify({ status })
    });
    
    return await followUpAPI.handleResponse(response);
  },

  deleteFollowUp: async (followUpId) => {
    // New method to delete follow-up
    const response = await fetch(`${API_BASE_URL}/api/followups/${followUpId}`, {
      method: 'DELETE',
      headers: followUpAPI.getHeaders()
    });
    
    return await followUpAPI.handleResponse(response);
  }
};

const FollowUp = ({ open, onClose, invoice, onUpdateFollowUp }) => {
  const classes = useStyles();
  const [followUps, setFollowUps] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [newFollowUp, setNewFollowUp] = useState({
    customerName: invoice?.client?.name || '',
    phoneNumber: invoice?.client?.phone || '',
    notes: '',
    followUpDate: '',
    followUpTime: '',
    priority: 'medium',
    status: 'scheduled',
    reason: ''
  });

  useEffect(() => {
    if (open && invoice?._id) {
      loadFollowUps();
      
      if (invoice?.client) {
        setNewFollowUp(prev => ({
          ...prev,
          customerName: invoice.client.name || '',
          phoneNumber: invoice.client.phone || ''
        }));
      }
    }
  }, [open, invoice]);

  const loadFollowUps = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await followUpAPI.getInvoiceFollowUps(invoice._id);
      
      if (response.success) {
        setFollowUps(response.followUps);
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

  const handleInputChange = (field, value) => {
    setNewFollowUp(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const addFollowUp = async () => {
    if (!newFollowUp.notes || !newFollowUp.followUpDate || !newFollowUp.followUpTime || !newFollowUp.reason) {
      setError('Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const followUpData = {
        invoiceId: invoice._id,
        customerName: newFollowUp.customerName,
        phoneNumber: newFollowUp.phoneNumber,
        reason: newFollowUp.reason,
        notes: newFollowUp.notes,
        followUpDate: new Date(newFollowUp.followUpDate),
        followUpTime: newFollowUp.followUpTime,
        priority: newFollowUp.priority,
        status: 'scheduled'
      };

      const response = await followUpAPI.createFollowUp(followUpData);

      if (response.success) {
        // Reset form
        setNewFollowUp({
          customerName: invoice?.client?.name || '',
          phoneNumber: invoice?.client?.phone || '',
          notes: '',
          followUpDate: '',
          followUpTime: '',
          priority: 'medium',
          status: 'scheduled',
          reason: ''
        });
        
        // Reload follow-ups
        await loadFollowUps();
        
        // Notify parent component if needed
        if (onUpdateFollowUp) {
          onUpdateFollowUp();
        }
      } else {
        setError('Failed to create follow-up');
      }
    } catch (err) {
      console.error('Error creating follow-up:', err);
      setError(err.message || 'Error creating follow-up');
    } finally {
      setSubmitting(false);
    }
  };

  const updateFollowUpStatus = async (followUpId, status) => {
    try {
      const response = await followUpAPI.updateFollowUpStatus(followUpId, status);

      if (response.success) {
        await loadFollowUps();
        if (onUpdateFollowUp) {
          onUpdateFollowUp();
        }
      } else {
        setError('Failed to update follow-up status');
      }
    } catch (err) {
      console.error('Error updating follow-up:', err);
      setError(err.message || 'Error updating follow-up');
    }
  };

  const deleteFollowUp = async (followUpId) => {
    if (!window.confirm('Are you sure you want to delete this follow-up?')) {
      return;
    }

    try {
      const response = await followUpAPI.deleteFollowUp(followUpId);

      if (response.success) {
        await loadFollowUps();
        if (onUpdateFollowUp) {
          onUpdateFollowUp();
        }
      } else {
        setError('Failed to delete follow-up');
      }
    } catch (err) {
      console.error('Error deleting follow-up:', err);
      setError(err.message || 'Error deleting follow-up');
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

  const getStatusColor = (status) => {
    switch(status) {
      case 'completed': return 'success';
      case 'closed': return 'default';
      case 'scheduled': return 'info';
      default: return 'info';
    }
  };

  const getScheduledCount = () => {
    return followUps.filter(fu => fu.status === 'scheduled').length;
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Typography variant="h6">
            Follow-up for Invoice #{invoice?.invoiceNumber}
          </Typography>
          {getScheduledCount() > 0 && (
            <Chip 
              label={`${getScheduledCount()} Scheduled`} 
              color="info" 
              size="small" 
            />
          )}
        </Box>
      </DialogTitle>
      
      <DialogContent className={classes.dialogContent}>
        {error && (
          <Alert severity="error" style={{ marginBottom: 16 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {/* Customer Info */}
        <Box mb={2} p={2} bgcolor="#f5f5f5" borderRadius={1}>
          <Typography variant="subtitle2" gutterBottom>
            <PersonIcon fontSize="small" style={{ marginRight: 8, verticalAlign: 'middle' }} />
            Customer Information
          </Typography>
          <Typography variant="body2">
            <strong>Name:</strong> {invoice?.client?.name || 'No Client Name'}
          </Typography>
          <Typography variant="body2">
            <strong>Amount:</strong> {invoice?.currency} {invoice?.total}
          </Typography>
          <Typography variant="body2">
            <strong>Due Date:</strong> {moment(invoice?.dueDate).format('DD/MM/YYYY')}
          </Typography>
        </Box>

        {/* Add New Follow-up */}
        <Box mb={3}>
          <Typography variant="subtitle1" gutterBottom>
            Schedule Follow-up (Customer didn't respond)
          </Typography>
          
          <TextField
            fullWidth
            label="Customer Name"
            value={newFollowUp.customerName}
            onChange={(e) => handleInputChange('customerName', e.target.value)}
            margin="normal"
            size="small"
            disabled={submitting}
          />
          
          <TextField
            fullWidth
            label="Phone Number"
            value={newFollowUp.phoneNumber}
            onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
            margin="normal"
            size="small"
            disabled={submitting}
          />
          
          <TextField
            fullWidth
            multiline
            rows={2}
            label="Reason for Follow-up *"
            value={newFollowUp.reason}
            onChange={(e) => handleInputChange('reason', e.target.value)}
            margin="normal"
            placeholder="Why didn't customer respond? (e.g., No answer, Said will call back, etc.)"
            disabled={submitting}
          />
          
          <TextField
            fullWidth
            multiline
            rows={2}
            label="Additional Notes *"
            value={newFollowUp.notes}
            onChange={(e) => handleInputChange('notes', e.target.value)}
            margin="normal"
            placeholder="Any additional information or comments"
            disabled={submitting}
          />
          
          <Box display="flex" gap={2} mt={2}>
            <TextField
              type="date"
              label="Follow-up Date *"
              value={newFollowUp.followUpDate}
              onChange={(e) => handleInputChange('followUpDate', e.target.value)}
              InputLabelProps={{ shrink: true }}
              size="small"
              fullWidth
              disabled={submitting}
            />
            
            <TextField
              type="time"
              label="Follow-up Time *"
              value={newFollowUp.followUpTime}
              onChange={(e) => handleInputChange('followUpTime', e.target.value)}
              InputLabelProps={{ shrink: true }}
              size="small"
              fullWidth
              disabled={submitting}
            />
          </Box>
          
          <FormControl fullWidth margin="normal" size="small">
            <InputLabel>Priority</InputLabel>
            <Select
              value={newFollowUp.priority}
              onChange={(e) => handleInputChange('priority', e.target.value)}
              disabled={submitting}
            >
              <MenuItem value="low">Low</MenuItem>
              <MenuItem value="medium">Medium</MenuItem>
              <MenuItem value="high">High</MenuItem>
            </Select>
          </FormControl>
          
          <Button
            variant="contained"
            color="primary"
            onClick={addFollowUp}
            startIcon={submitting ? <CircularProgress size={20} /> : <ScheduleIcon />}
            fullWidth
            disabled={submitting}
            style={{ marginTop: 16 }}
          >
            {submitting ? 'Scheduling...' : 'Schedule Follow-up'}
          </Button>
        </Box>

        <Divider />

        {/* Existing Follow-ups */}
        <Box mt={3}>
          <Typography variant="subtitle1" gutterBottom>
            Follow-up History ({followUps.length})
          </Typography>
          
          {loading ? (
            <Box display="flex" justifyContent="center" p={2}>
              <CircularProgress />
            </Box>
          ) : followUps.length === 0 ? (
            <Alert severity="info">No follow-ups scheduled yet.</Alert>
          ) : (
            <List>
              {followUps.map((followUp) => (
                <ListItem
                  key={followUp._id}
                  className={`${classes.followUpItem} ${
                    followUp.status === 'completed' ? classes.completed :
                    followUp.status === 'closed' ? classes.closed :
                    classes.scheduled
                  }`}
                >
                  <ListItemText
                    primary={
                      <Box display="flex" alignItems="center">
                        <Typography variant="subtitle2">
                          {moment(followUp.followUpDate).format('DD/MM/YYYY')} at {followUp.followUpTime}
                        </Typography>
                        <Chip
  label={(followUp.status ? followUp.status.toUpperCase() : "SCHEDULED")}
  color={getStatusColor(followUp.status || "scheduled")}
  size="small"
  className={classes.statusChip}
/>

<Chip
  label={(followUp.priority ? followUp.priority.toUpperCase() : "MEDIUM")}
  variant="outlined"
  size="small"
  className={classes.statusChip}
/>

                      </Box>
                    }
                    secondary={
                      <Box mt={1}>
                        <Typography variant="body2">
                          <strong>Reason:</strong> {followUp.reason}
                        </Typography>
                        <Typography variant="body2">
                          <strong>Notes:</strong> {followUp.notes}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          Created: {moment(followUp.createdAt).format('DD/MM/YYYY hh:mm A')}
                        </Typography>
                        {followUp.callHistory && followUp.callHistory.length > 0 && (
                          <Typography variant="caption" color="primary" display="block">
                            Call History: {followUp.callHistory.length} entries
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                  
                  <ListItemSecondaryAction>
                    <Box display="flex" gap={0.5}>
                      <IconButton
                        onClick={() => openWhatsApp(followUp.phoneNumber)}
                        color="success"
                        title="WhatsApp Follow-up"
                        size="small"
                      >
                        <WhatsAppIcon />
                      </IconButton>
                      
                      {followUp.status === 'scheduled' && (
                        <>
                          <IconButton
                            onClick={() => markAsCompleted(followUp._id)}
                            color="primary"
                            title="Mark as Completed"
                            size="small"
                          >
                            <CheckIcon />
                          </IconButton>
                          <IconButton
                            onClick={() => closeFollowUp(followUp._id)}
                            color="secondary"
                            title="Close Follow-up"
                            size="small"
                          >
                            <CloseIcon />
                          </IconButton>
                        </>
                      )}
                      
                      <IconButton
                        onClick={() => deleteFollowUp(followUp._id)}
                        color="error"
                        title="Delete Follow-up"
                        size="small"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          )}
        </Box>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose} color="primary">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default FollowUp;