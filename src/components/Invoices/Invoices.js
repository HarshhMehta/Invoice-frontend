import React, {useState, useEffect} from 'react';
import { useDispatch, useSelector } from 'react-redux'
import { useHistory } from 'react-router-dom'
import moment from 'moment'
import PropTypes from 'prop-types';
import { useTheme } from '@mui/material/styles';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableContainer from '@mui/material/TableContainer';
import TableFooter from '@mui/material/TableFooter';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import IconButton from '@mui/material/IconButton';
import FirstPageIcon from '@mui/icons-material/FirstPage';
import KeyboardArrowLeft from '@mui/icons-material/KeyboardArrowLeft';
import KeyboardArrowRight from '@mui/icons-material/KeyboardArrowRight';
import LastPageIcon from '@mui/icons-material/LastPage';
import Container from '@mui/material/Container';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import BorderColorIcon from '@mui/icons-material/BorderColor';
import PhoneIcon from '@mui/icons-material/Phone';
import Badge from '@mui/material/Badge';
import { makeStyles } from '@mui/styles';
import { useLocation } from 'react-router-dom';

import { deleteInvoice, getInvoicesByUser } from '../../actions/invoiceActions';
import NoData from '../svgIcons/NoData';
import Spinner from '../Spinner/Spinner'
import { useSnackbar } from 'notistack';
import FollowUp from '../FollowUp/FollowUp'; // Import the new FollowUp component

const useStyles1 = makeStyles(() => ({
  root: {
    flexShrink: 0,
    marginLeft: 20, // equivalent to theme.spacing(2.5)
  },
}));

function TablePaginationActions(props) {

  const classes = useStyles1();
  const theme = useTheme();
  const { count, page, rowsPerPage, onPageChange } = props;

  const handleFirstPageButtonClick = (event) => {
    onPageChange(event, 0);
  };

  const handleBackButtonClick = (event) => {
    onPageChange(event, page - 1);
  };

  const handleNextButtonClick = (event) => {
    onPageChange(event, page + 1);
  };

  const handleLastPageButtonClick = (event) => {
    onPageChange(event, Math.max(0, Math.ceil(count / rowsPerPage) - 1));
  };

  return (
    <div className={classes.root} >
      <IconButton
        onClick={handleFirstPageButtonClick}
        disabled={page === 0}
        aria-label="first page"
      >
        {theme.direction === 'rtl' ? <LastPageIcon /> : <FirstPageIcon />}
      </IconButton>
      <IconButton onClick={handleBackButtonClick} disabled={page === 0} aria-label="previous page">
        {theme.direction === 'rtl' ? <KeyboardArrowRight /> : <KeyboardArrowLeft />}
      </IconButton>
      <IconButton
        onClick={handleNextButtonClick}
        disabled={page >= Math.ceil(count / rowsPerPage) - 1}
        aria-label="next page"
      >
        {theme.direction === 'rtl' ? <KeyboardArrowLeft /> : <KeyboardArrowRight />}
      </IconButton>
      <IconButton
        onClick={handleLastPageButtonClick}
        disabled={page >= Math.ceil(count / rowsPerPage) - 1}
        aria-label="last page"
      >
        {theme.direction === 'rtl' ? <FirstPageIcon /> : <LastPageIcon />}
      </IconButton>
    </div>
  );
}

TablePaginationActions.propTypes = {
  count: PropTypes.number.isRequired,
  onPageChange: PropTypes.func.isRequired,
  page: PropTypes.number.isRequired,
  rowsPerPage: PropTypes.number.isRequired,
};

const useStyles2 = makeStyles(theme => ({
  table: {
    minWidth: 500,
  },
  tablecell: {
    fontSize: '16px'
  }
}));

const tableStyle = { width: 160, fontSize: 14, cursor: 'pointer', borderBottom: 'none',  padding: '8px', textAlign: 'center' }
const headerStyle = { borderBottom: 'none', textAlign: 'center'}

// API Service for follow-ups
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

  getInvoiceFollowUps: async (invoiceId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/followups/invoice/${invoiceId}`, {
        method: 'GET',
        headers: followUpAPI.getHeaders()
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching follow-ups:', error);
      return { success: false, followUps: [] };
    }
  }
};

const Invoices = () => {
    
  const dispatch = useDispatch()
  const location = useLocation()
  const history = useHistory()
  const user = JSON.parse(localStorage.getItem('profile'))
  const rows = useSelector(state => state.invoices.invoices)
  const isLoading = useSelector(state => state.invoices.isLoading)
  const { enqueueSnackbar } = useSnackbar();

  // Follow-up related state
  const [followUpDialog, setFollowUpDialog] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [followUpCounts, setFollowUpCounts] = useState({});
  const [lastFollowUpDates, setLastFollowUpDates] = useState({});

  useEffect(() => {
    dispatch(getInvoicesByUser({ search: user?.result?._id || user?.result?.googleId}));
  },[location])

  useEffect(() => {
    // Load follow-up data for all invoices
    const loadFollowUpData = async () => {
      if (rows && rows.length > 0) {
        const counts = {};
        const lastDates = {};
        
        for (const invoice of rows) {
          try {
            const response = await followUpAPI.getInvoiceFollowUps(invoice._id);
            
            if (response.success && response.followUps) {
              const followUps = response.followUps;
              const pendingCount = followUps.filter(fu => fu.status === 'scheduled').length;
              counts[invoice._id] = pendingCount;
              
              // Get the most recent follow-up creation date
              if (followUps.length > 0) {
                const sortedFollowUps = followUps.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                const latestFollowUp = sortedFollowUps[0];
                lastDates[invoice._id] = latestFollowUp.createdAt;
              }
            }
          } catch (error) {
            console.error(`Error loading follow-ups for invoice ${invoice._id}:`, error);
          }
        }
        
        setFollowUpCounts(counts);
        setLastFollowUpDates(lastDates);
      }
    };

    loadFollowUpData();
  }, [rows]);

  const toCommas = (value) => {
    return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")
  }

  const classes = useStyles2();
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  // Sort invoices by creation date (most recent first)
  const sortedRows = React.useMemo(() => {
    if (!rows || rows.length === 0) return [];
    return [...rows].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [rows]);

  const emptyRows = rowsPerPage - Math.min(rowsPerPage, sortedRows.length - page * rowsPerPage);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const editInvoice = (id) => {
    history.push(`/edit/invoice/${id}`)
  }

  const openInvoice = (id) => {
    history.push(`/invoice/${id}`)
  }

  const openFollowUp = (invoice) => {
    setSelectedInvoice(invoice);
    setFollowUpDialog(true);
  }

  const handleFollowUpClose = async () => {
    setFollowUpDialog(false);
    setSelectedInvoice(null);
    
    // Refresh follow-up data
    if (rows && rows.length > 0) {
      const counts = {};
      const lastDates = {};
      
      for (const invoice of rows) {
        try {
          const response = await followUpAPI.getInvoiceFollowUps(invoice._id);
          
          if (response.success && response.followUps) {
            const followUps = response.followUps;
            const pendingCount = followUps.filter(fu => fu.status === 'scheduled').length;
            counts[invoice._id] = pendingCount;
            
            if (followUps.length > 0) {
              const sortedFollowUps = followUps.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
              const latestFollowUp = sortedFollowUps[0];
              lastDates[invoice._id] = latestFollowUp.createdAt;
            }
          }
        } catch (error) {
          console.error(`Error loading follow-ups for invoice ${invoice._id}:`, error);
        }
      }
      
      setFollowUpCounts(counts);
      setLastFollowUpDates(lastDates);
    }
  }

  // Updated function to get the last follow-up date or original due date
  const getDisplayDate = (invoice) => {
    const lastFollowUpDate = lastFollowUpDates[invoice._id];
    if (lastFollowUpDate) {
      return moment(lastFollowUpDate).fromNow();
    }
    return moment(invoice.dueDate).fromNow();
  }

  if(!user) {
    history.push('/login')
  }

  if(isLoading) {
    return  <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', paddingTop: '20px'}}>
        <Spinner />
    </div>
  }

  if(!rows || rows.length === 0) {
    return  <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', paddingTop: '20px', margin: '80px'}}>
      <NoData />
      <p style={{padding: '40px', color: 'gray', textAlign: 'center'}}>No invoice yet. Click the plus icon to create invoice</p>
    </div>
  }
  
  return (
    <div>
      <Container style={{width: '85%', paddingTop: '70px', paddingBottom: '50px', border: 'none'}} >
        <TableContainer component={Paper} elevation={0}>
          <Table className={classes.table} aria-label="custom pagination table">

            <TableHead>
              <TableRow>
                <TableCell style={headerStyle}>Number</TableCell>
                <TableCell style={headerStyle}>Client</TableCell>
                <TableCell style={headerStyle}>Amount</TableCell>
                <TableCell style={headerStyle}>Last Follow-up</TableCell>
                <TableCell style={headerStyle}>Follow Up</TableCell>
                <TableCell style={headerStyle}>Edit</TableCell>
                <TableCell style={headerStyle}>Delete</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {(rowsPerPage > 0
                ? sortedRows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                : sortedRows
              ).map((row) => (
                <TableRow key={row._id} style={{cursor: 'pointer'}} >
                  <TableCell style={tableStyle} onClick={() => openInvoice(row._id)}> 
                    {row.invoiceNumber} 
                  </TableCell>
                  <TableCell style={tableStyle} onClick={() => openInvoice(row._id)}> 
                    {row.client?.name || "No Client"} 
                  </TableCell>
                  <TableCell style={tableStyle} onClick={() => openInvoice(row._id)}>
                    {row.currency} {row.total ? toCommas(row.total) : row.total} 
                  </TableCell>
                  <TableCell style={tableStyle} onClick={() => openInvoice(row._id)}>
                    {getDisplayDate(row)} 
                  </TableCell>
                  <TableCell style={{...tableStyle, width: '10px'}}>
                    <IconButton onClick={() => openFollowUp(row)}>
                      <Badge 
                        badgeContent={followUpCounts[row._id] || 0} 
                        color="error"
                        invisible={!followUpCounts[row._id]}
                      >
                        <PhoneIcon style={{width: '20px', height: '20px'}} />
                      </Badge>
                    </IconButton>
                  </TableCell>
                  <TableCell style={{...tableStyle, width: '10px'}}>
                    <IconButton onClick={() => editInvoice(row._id)}>
                      <BorderColorIcon style={{width: '20px', height: '20px'}} />
                    </IconButton>
                  </TableCell>
                  <TableCell style={{...tableStyle, width: '10px'}}>
                    <IconButton onClick={() => dispatch(deleteInvoice(row._id, enqueueSnackbar))}>
                      <DeleteOutlineRoundedIcon style={{width: '20px', height: '20px'}} />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}

              {emptyRows > 0 && (
                <TableRow style={{ height: 53 * emptyRows }}>
                  <TableCell colSpan={7} />
                </TableRow>
              )}
            </TableBody>

            <TableFooter>
              <TableRow>
                <TablePagination
                  rowsPerPageOptions={[5, 10, 25, { label: 'All', value: -1 }]}
                  colSpan={7}
                  count={sortedRows.length}
                  rowsPerPage={rowsPerPage}
                  page={page}
                  SelectProps={{
                    inputProps: { 'aria-label': 'rows per page' },
                    native: true,
                  }}
                  onPageChange={handleChangePage}
                  onRowsPerPageChange={handleChangeRowsPerPage}
                  ActionsComponent={TablePaginationActions}
                />
              </TableRow>
            </TableFooter>
          </Table>
        </TableContainer>
      </Container>

      {/* Follow-up Dialog */}
      {selectedInvoice && (
        <FollowUp
          open={followUpDialog}
          onClose={handleFollowUpClose}
          invoice={selectedInvoice}
          onUpdateFollowUp={handleFollowUpClose}
        />
      )}
    </div>
  );
}

export default Invoices;