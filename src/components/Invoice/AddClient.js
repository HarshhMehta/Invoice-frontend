/* eslint-disable */
import React, { useEffect, useState } from 'react';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import Typography from '@mui/material/Typography';
import { useDispatch } from 'react-redux';
import { createClient } from '../../actions/clientActions';
import { useLocation } from 'react-router-dom';
import { useSnackbar } from 'notistack';

const AddClient = ({ setOpen, open }) => {
  const location = useLocation();
  const [clientData, setClientData] = useState({ name: '', email: '', phone: '', address: '', userId: [] });
  const dispatch = useDispatch();
  const user = JSON.parse(localStorage.getItem('profile'));
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    const checkId = user?.result?._id;
    setClientData((prev) => ({
      ...prev,
      userId: checkId !== undefined ? [checkId] : [user?.result?.googleId],
    }));
  }, [location]);

  const handleSubmitClient = (e) => {
    e.preventDefault();
    dispatch(createClient(clientData, enqueueSnackbar));
    clear();
    handleClose();
  };

  const clear = () => {
    setClientData({ name: '', email: '', phone: '', address: '', userId: [] });
  };

  const handleClose = () => {
    setOpen(false);
  };

  const inputStyle = {
    display: "block",
    padding: "1.4rem 0.75rem",
    width: "100%",
    fontSize: "0.8rem",
    lineHeight: 1.25,
    color: "#55595c",
    backgroundColor: "#fff",
    borderBottom: "1px solid #eee",
    borderRadius: "3px",
    transition: "all 0.25s cubic-bezier(0.4, 0, 1, 1)",
    marginBottom: "12px"
  };

  return (
    <Dialog onClose={handleClose} open={open} fullWidth>
      <DialogTitle sx={{ backgroundColor: '#1976D2', pl: 2, color: 'white' }}>
        <Typography variant="h6">New Customer</Typography>
        <IconButton
          aria-label="close"
          onClick={handleClose}
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
            color: 'white',
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ p: 3 }}>
        <input
          placeholder="Name"
          style={inputStyle}
          name="name"
          type="text"
          onChange={(e) => setClientData({ ...clientData, name: e.target.value })}
          value={clientData.name}
        />
        <input
          placeholder="Email"
          style={inputStyle}
          name="email"
          type="text"
          onChange={(e) => setClientData({ ...clientData, email: e.target.value })}
          value={clientData.email}
        />
        <input
          placeholder="Phone"
          style={inputStyle}
          name="phone"
          type="text"
          onChange={(e) => setClientData({ ...clientData, phone: e.target.value })}
          value={clientData.phone}
        />
        <input
          placeholder="Address"
          style={inputStyle}
          name="address"
          type="text"
          onChange={(e) => setClientData({ ...clientData, address: e.target.value })}
          value={clientData.address}
        />
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={handleSubmitClient} variant="contained" sx={{ mr: 2 }}>
          Save Customer
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddClient;
