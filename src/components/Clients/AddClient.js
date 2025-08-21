/* eslint-disable */
import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Button from "@mui/material/Button";
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import Typography from '@mui/material/Typography';
import { useDispatch, useSelector } from 'react-redux'
import { createClient, updateClient } from '../../actions/clientActions'
import { useSnackbar } from 'notistack';

const CustomDialogTitle = ({ children, onClose, ...other }) => (
  <DialogTitle {...other} sx={{ backgroundColor: '#1976D2', pl: 2, color: 'white' }}>
    <Typography variant="h6">{children}</Typography>
    {onClose && (
      <IconButton
        aria-label="close"
        onClick={onClose}
        sx={{
          position: 'absolute',
          right: 8,
          top: 8,
          color: 'white',
        }}
      >
        <CloseIcon />
      </IconButton>
    )}
  </DialogTitle>
);

const AddClient = ({ setOpen, open, currentId, setCurrentId }) => {
  const location = useLocation()
  const [clientData, setClientData] = useState({ name: '', email: '', phone: '', address: '', userId: '' })
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('profile')))
  const dispatch = useDispatch()
  const client = useSelector((state) => currentId ? state.clients.clients.find((c) => c._id === currentId) : null)
  const { enqueueSnackbar } = useSnackbar()

  useEffect(() => {
    if (client) {
      setClientData(client)
    }
  }, [client])

  useEffect(() => {
    setUser(JSON.parse(localStorage.getItem('profile')))
  }, [location])

  useEffect(() => {
    const checkId = user?.result?._id
    setClientData(prev => ({
      ...prev,
      userId: checkId !== undefined ? [checkId] : [user?.result?.googleId]
    }))
  }, [location])

  const handleSubmitClient = (e) => {
    e.preventDefault()
    if (currentId) {
      dispatch(updateClient(currentId, clientData, enqueueSnackbar))
    } else {
      dispatch(createClient(clientData, enqueueSnackbar))
    }
    clear()
    handleClose()
  }

  const clear = () => {
    setCurrentId(null)
    setClientData({ name: '', email: '', phone: '', address: '', userId: [] })
  }

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
    backgroundImage: "none",
    backgroundClip: "padding-box",
    borderBottom: "1px solid #eee",
    borderRadius: "3px",
    transition: "all 0.25s cubic-bezier(0.4, 0, 1, 1)"
  }

  return (
    <form>
      <Dialog onClose={handleClose} open={open} fullWidth>
        <CustomDialogTitle onClose={handleClose}>
          {currentId ? 'Edit Customer' : 'Add new Client'}
        </CustomDialogTitle>
        <DialogContent dividers>
          <div className="customInputs">
            <input
              placeholder="Name"
              style={inputStyle}
              name='name'
              type='text'
              onChange={(e) => setClientData({ ...clientData, name: e.target.value })}
              value={clientData.name}
            />
            <input
              placeholder="Email"
              style={inputStyle}
              name='email'
              type='text'
              onChange={(e) => setClientData({ ...clientData, email: e.target.value })}
              value={clientData.email}
            />
            <input
              placeholder="Phone"
              style={inputStyle}
              name='phone'
              type='text'
              onChange={(e) => setClientData({ ...clientData, phone: e.target.value })}
              value={clientData.phone}
            />
            <input
              placeholder="Address"
              style={inputStyle}
              name='address'
              type='text'
              onChange={(e) => setClientData({ ...clientData, address: e.target.value })}
              value={clientData.address}
            />
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleSubmitClient} variant="contained" sx={{ mr: 3 }}>
            Save Customer
          </Button>
        </DialogActions>
      </Dialog>
    </form>
  );
}

export default AddClient;
