import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import styles from './Clients.module.css';
import PropTypes from 'prop-types';
import {
  Table, TableBody, TableCell, TableContainer, TableFooter,
  TablePagination, TableRow, TableHead, Paper, IconButton,
  Container, Button, Box, Chip, Alert, CircularProgress
} from '@mui/material';
import {
  FirstPage as FirstPageIcon,
  KeyboardArrowLeft,
  KeyboardArrowRight,
  LastPage as LastPageIcon,
  DeleteOutlineRounded as DeleteOutlineRoundedIcon,
  BorderColor as BorderColorIcon,
  Sync as SyncIcon,
  CloudOff as CloudOffIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { useSnackbar } from 'notistack';
import { deleteClient } from '../../actions/clientActions';

function TablePaginationActions(props) {
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
    <Box sx={{ flexShrink: 0, ml: 2.5 }}>
      <IconButton onClick={handleFirstPageButtonClick} disabled={page === 0} aria-label="first page">
        {theme.direction === 'rtl' ? <LastPageIcon /> : <FirstPageIcon />}
      </IconButton>
      <IconButton onClick={handleBackButtonClick} disabled={page === 0} aria-label="previous page">
        {theme.direction === 'rtl' ? <KeyboardArrowRight /> : <KeyboardArrowLeft />}
      </IconButton>
      <IconButton onClick={handleNextButtonClick} disabled={page >= Math.ceil(count / rowsPerPage) - 1} aria-label="next page">
        {theme.direction === 'rtl' ? <KeyboardArrowLeft /> : <KeyboardArrowRight />}
      </IconButton>
      <IconButton onClick={handleLastPageButtonClick} disabled={page >= Math.ceil(count / rowsPerPage) - 1} aria-label="last page">
        {theme.direction === 'rtl' ? <FirstPageIcon /> : <LastPageIcon />}
      </IconButton>
    </Box>
  );
}

TablePaginationActions.propTypes = {
  count: PropTypes.number.isRequired,
  onPageChange: PropTypes.func.isRequired,
  page: PropTypes.number.isRequired,
  rowsPerPage: PropTypes.number.isRequired,
};

const Clients = ({ setOpen, setCurrentId, clients }) => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [allClientsData, setAllClientsData] = useState({
    all: [],
    local: [],
    tally: [],
    counts: { total: 0, local: 0, tally: 0 },
    tallyStatus: 'unknown', // Changed from 'disconnected' to 'unknown'
    lastSync: null
  });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [dataSource, setDataSource] = useState('database');
  const { enqueueSnackbar } = useSnackbar();
  const dispatch = useDispatch();

  // Fetch only database clients (no Tally API calls)
  const fetchDatabaseClients = async () => {
    try {
      setLoading(true);
      const response = await fetch('https://invoice-56iv.onrender.com/clients/all?databaseOnly=true');
      const data = await response.json();
      
      if (data.success) {
        setAllClientsData(data.data);
        setDataSource('database');
        console.log('Fetched clients from database only:', data.data.counts);
      } else {
        throw new Error(data.message || 'Failed to fetch clients');
      }
    } catch (error) {
      console.error('Error fetching database clients:', error);
      enqueueSnackbar('Error fetching customers from database', { variant: 'error' });
      // Fallback to local clients only
      setAllClientsData({
        all: clients || [],
        local: clients || [],
        tally: [],
        counts: { total: (clients || []).length, local: (clients || []).length, tally: 0 },
        tallyStatus: 'unknown',
        lastSync: null
      });
      setDataSource('database');
    } finally {
      setLoading(false);
    }
  };

  // Refresh - Get live data from Tally if connected, otherwise database data
  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      
      // Try to get live data from Tally directly
      const response = await fetch('https://invoice-56iv.onrender.com/clients/tally/live');
      const data = await response.json();
      
      if (data.success && !data.data.fallback) {
        // Successfully got live data
        setAllClientsData({
          all: data.data.all,
          local: data.data.local,
          tally: data.data.tally,
          counts: data.data.counts,
          tallyStatus: data.data.tallyStatus,
          lastSync: data.data.lastSync || null
        });
        setDataSource('live');
        enqueueSnackbar(
          `Refreshed with live Tally data (${data.data.counts.tally} customers)`, 
          { variant: 'success' }
        );
      } else if (data.success && data.data.fallback) {
        // Got fallback database data
        setAllClientsData(data.data);
        setDataSource('database');
        enqueueSnackbar(
          `Tally disconnected. Showing database data (${data.data.counts.tally} cached customers)`, 
          { variant: 'warning' }
        );
      } else {
        throw new Error(data.message || 'Failed to fetch data');
      }
    } catch (error) {
      console.error('Refresh error:', error);
      enqueueSnackbar(`Refresh failed: ${error.message}`, { variant: 'error' });
      // Final fallback to database
      await fetchDatabaseClients();
    } finally {
      setRefreshing(false);
    }
  };

  // Manual sync with Tally - Updates database with Tally data
  const handleManualSync = async () => {
    try {
      setSyncing(true);
      const response = await fetch('https://invoice-56iv.onrender.com/clients/sync-tally', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      const result = await response.json();
      
      if (result.success) {
        enqueueSnackbar(
          `Sync completed: ${result.synced} new, ${result.updated} updated, ${result.deleted || 0} deleted`, 
          { variant: 'success' }
        );
        // Refresh the client list from database after sync
        await fetchDatabaseClients();
      } else {
        throw new Error(result.message || 'Sync failed');
      }
    } catch (error) {
      console.error('Manual sync error:', error);
      enqueueSnackbar(`Sync failed: ${error.message}`, { variant: 'error' });
    } finally {
      setSyncing(false);
    }
  };

  // Initial data fetch - only from database, no API calls
  useEffect(() => {
    fetchDatabaseClients(); // Only fetch from database on initial load
    // Removed checkTallyConnection() from here
    // Removed periodic connection check
  }, []);

  // Use combined client data
  const rows = (allClientsData.all || []).sort((a, b) =>
    a.name?.localeCompare(b.name || "", "en", { sensitivity: "base" })
  );
  
  const emptyRows = rowsPerPage - Math.min(rowsPerPage, rows.length - page * rowsPerPage);

  const handleChangePage = (event, newPage) => setPage(newPage);
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleEdit = (selectedId) => {
    setOpen((prev) => !prev);
    setCurrentId(selectedId);
  };

  const handleDelete = (clientId, isFromTally) => {
    if (isFromTally) {
      enqueueSnackbar('Cannot delete Tally customers. Please delete in Tally software.', { variant: 'warning' });
      return;
    }
    dispatch(deleteClient(clientId, enqueueSnackbar));
  };

  const tableStyle = {
    width: 160,
    fontSize: 14,
    cursor: 'pointer',
    borderBottom: 'none',
    padding: '8px',
    textAlign: 'center',
  };

  const headerStyle = {
    borderBottom: 'none',
    textAlign: 'center',
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <CircularProgress size={24} />
        <span className="ml-2">Loading customers...</span>
      </div>
    );
  }

  return (
    <div className={styles.pageLayout}>
      <Container sx={{ width: '85%' }}>
        {/* Tally Status and Controls */}
        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Chip 
              icon={
                allClientsData.tallyStatus === 'connected' ? <SyncIcon /> : 
                allClientsData.tallyStatus === 'disconnected' ? <CloudOffIcon /> : 
                <CloudOffIcon />
              }
              label={
                allClientsData.tallyStatus === 'connected' ? 'Tally Connected' :
                allClientsData.tallyStatus === 'disconnected' ? 'Tally Disconnected' :
                'Tally Status Unknown'
              }
              color={
                allClientsData.tallyStatus === 'connected' ? 'success' : 
                allClientsData.tallyStatus === 'disconnected' ? 'error' : 
                'default'
              }
              variant="outlined"
            />
            
            <Chip 
              label={`Data Source: ${dataSource === 'live' ? 'Live Tally' : 'Database'}`}
              color={dataSource === 'live' ? 'primary' : 'default'}
              variant="outlined"
              size="small"
            />
            
            {allClientsData.lastSync && (
              <Chip 
                label={`Last sync: ${new Date(allClientsData.lastSync.timestamp).toLocaleString()}`}
                variant="outlined"
                size="small"
              />
            )}
          </Box>
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            {/* Refresh Button */}
            <Button
              variant="outlined"
              startIcon={refreshing ? <CircularProgress size={16} /> : <RefreshIcon />}
              onClick={handleRefresh}
              disabled={refreshing || syncing}
              size="small"
            >
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
            
            {/* Sync Button */}
            <Button
              variant="contained"
              startIcon={syncing ? <CircularProgress size={16} /> : <SyncIcon />}
              onClick={handleManualSync}
              disabled={syncing || refreshing}
              size="small"
            >
              {syncing ? 'Syncing...' : 'Sync to DB'}
            </Button>
          </Box>
        </Box>

        {/* Connection and Data Source Alerts */}
        {allClientsData.tallyStatus === 'unknown' && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Showing database data. Click <strong>Refresh</strong> to check Tally connection and get latest data.
          </Alert>
        )}

        {allClientsData.tallyStatus === 'disconnected' && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Tally is disconnected. Showing cached data from database. 
            {allClientsData.counts.tally > 0 && ` ${allClientsData.counts.tally} Tally customers available offline.`}
          </Alert>
        )}
        
        {allClientsData.tallyStatus === 'connected' && dataSource === 'live' && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Showing live data from Tally. Use <strong>Sync to DB</strong> to save current Tally data to database.
          </Alert>
        )}

        <TableContainer component={Paper} elevation={0}>
          <Table aria-label="custom pagination table">
            <TableHead>
              <TableRow>
                <TableCell sx={{ ...headerStyle, width: '10px' }}>Number</TableCell>
                <TableCell sx={headerStyle}>Name</TableCell>
                <TableCell sx={headerStyle}>Email</TableCell>
                <TableCell sx={headerStyle}>Phone</TableCell>
                <TableCell sx={headerStyle}>Source</TableCell>
                <TableCell sx={headerStyle}>Edit</TableCell>
                <TableCell sx={headerStyle}>Delete</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(rowsPerPage > 0
                ? rows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                : rows
              ).map((row, index) => (
                <TableRow key={row._id || row.id} style={{ cursor: 'pointer' }}>
                  <TableCell sx={{ ...tableStyle, width: '10px' }}>{page * rowsPerPage + index + 1}</TableCell>
                  <TableCell sx={tableStyle} scope="row">
                    <Button 
                      sx={{ 
                        textTransform: 'none',
                        color: row.isFromTally ? '#1976d2' : 'inherit',
                        fontWeight: row.isFromTally ? 'bold' : 'normal'
                      }}
                    >
                      {row.name}
                    </Button>
                  </TableCell>
                  <TableCell sx={tableStyle}>{row.email || 'N/A'}</TableCell>
                  <TableCell sx={tableStyle}>{row.phone || 'N/A'}</TableCell>
                  <TableCell sx={tableStyle}>
                    <Chip
                      label={
                        row.isFromTally 
                          ? `Tally${row.tallyParent ? ` (${row.tallyParent})` : ''}${dataSource === 'live' ? ' (Live)' : ''}` 
                          : 'Local'
                      }
                      size="small"
                      color={row.isFromTally ? (dataSource === 'live' ? 'secondary' : 'primary') : 'success'}
                      variant={dataSource === 'live' && row.isFromTally ? 'filled' : 'outlined'}
                    />
                  </TableCell>
                  <TableCell sx={{ ...tableStyle, width: '10px' }}>
                    <IconButton 
                      onClick={() => handleEdit(row._id || row.id)}
                      disabled={row.isFromTally}
                      title={row.isFromTally ? 'Cannot edit Tally customers' : 'Edit customer'}
                    >
                      <BorderColorIcon 
                        sx={{ 
                          width: 20, 
                          height: 20,
                          color: row.isFromTally ? '#ccc' : 'inherit'
                        }} 
                      />
                    </IconButton>
                  </TableCell>
                  <TableCell sx={{ ...tableStyle, width: '10px' }}>
                    <IconButton 
                      onClick={() => handleDelete(row._id || row.id, row.isFromTally)}
                      disabled={row.isFromTally}
                      title={row.isFromTally ? 'Cannot delete Tally customers' : 'Delete customer'}
                    >
                      <DeleteOutlineRoundedIcon 
                        sx={{ 
                          width: 20, 
                          height: 20,
                          color: row.isFromTally ? '#ccc' : 'inherit'
                        }} 
                      />
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
                  rowsPerPageOptions={[25, 50, 100, 250, { label: 'All', value: -1 }]}
                  colSpan={7}
                  count={rows.length}
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
        
        {/* Enhanced Summary section */}
        <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{allClientsData.counts.total}</div>
              <div className="text-sm text-gray-600">Total Customers</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{allClientsData.counts.tally}</div>
              <div className="text-sm text-gray-600">
                Tally Customers {dataSource === 'live' ? '(Live)' : '(Database)'}
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{allClientsData.counts.local}</div>
              <div className="text-sm text-gray-600">Local Customers</div>
            </div>
          </div>
          
          {allClientsData.lastSync && (
            <Box sx={{ mt: 1, textAlign: 'center' }}>
              <div className="text-xs text-gray-500">
                Last sync: {new Date(allClientsData.lastSync.timestamp).toLocaleString()}
                {allClientsData.lastSync.success && (
                  <span className="ml-2 text-green-600">
                    ({allClientsData.lastSync.synced} new, {allClientsData.lastSync.updated} updated)
                  </span>
                )}
              </div>
            </Box>
          )}
          
          <div className="mt-2 text-xs text-center text-gray-500">
            Showing {Math.min((page + 1) * rowsPerPage, rows.length)} of {rows.length} customers
            {dataSource === 'live' && (
              <span className="ml-2 text-blue-600 font-semibold">(Live Data)</span>
            )}
          </div>
        </Box>
      </Container>
    </div>
  );
};

export default Clients;