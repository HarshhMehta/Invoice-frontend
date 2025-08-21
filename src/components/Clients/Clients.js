import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import styles from './Clients.module.css';
import PropTypes from 'prop-types';
import {
  Table, TableBody, TableCell, TableContainer, TableFooter,
  TablePagination, TableRow, TableHead, Paper, IconButton,
  Container, Button, Box
} from '@mui/material';
import {
  FirstPage as FirstPageIcon,
  KeyboardArrowLeft,
  KeyboardArrowRight,
  LastPage as LastPageIcon,
  DeleteOutlineRounded as DeleteOutlineRoundedIcon,
  BorderColor as BorderColorIcon
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
  const [rowsPerPage, setRowsPerPage] = useState(clients.length);
  const { enqueueSnackbar } = useSnackbar();
  const dispatch = useDispatch();

  const rows = clients;
  const emptyRows = rowsPerPage - Math.min(rowsPerPage, rows?.length - page * rowsPerPage);

  const handleChangePage = (event, newPage) => setPage(newPage);
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleEdit = (selectedId) => {
    setOpen((prev) => !prev);
    setCurrentId(selectedId);
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

  return (
    <div className={styles.pageLayout}>
      <Container sx={{ width: '85%' }}>
        <TableContainer component={Paper} elevation={0}>
          <Table aria-label="custom pagination table">
            <TableHead>
              <TableRow>
                <TableCell sx={{ ...headerStyle, width: '10px' }}>Number</TableCell>
                <TableCell sx={headerStyle}>Name</TableCell>
                <TableCell sx={headerStyle}>Email</TableCell>
                <TableCell sx={headerStyle}>Phone</TableCell>
                <TableCell sx={headerStyle}>Edit</TableCell>
                <TableCell sx={headerStyle}>Delete</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(rowsPerPage > 0
                ? rows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                : rows
              ).map((row, index) => (
                <TableRow key={row._id} style={{ cursor: 'pointer' }}>
                  <TableCell sx={{ ...tableStyle, width: '10px' }}>{index + 1}</TableCell>
                  <TableCell sx={tableStyle} scope="row">
                    <Button sx={{ textTransform: 'none' }}>{row.name}</Button>
                  </TableCell>
                  <TableCell sx={tableStyle}>{row.email}</TableCell>
                  <TableCell sx={tableStyle}>{row.phone}</TableCell>
                  <TableCell sx={{ ...tableStyle, width: '10px' }}>
                    <IconButton onClick={() => handleEdit(row._id)}>
                      <BorderColorIcon sx={{ width: 20, height: 20 }} />
                    </IconButton>
                  </TableCell>
                  <TableCell sx={{ ...tableStyle, width: '10px' }}>
                    <IconButton onClick={() => dispatch(deleteClient(row._id, enqueueSnackbar))}>
                      <DeleteOutlineRoundedIcon sx={{ width: 20, height: 20 }} />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {emptyRows > 0 && (
                <TableRow style={{ height: 53 * emptyRows }}>
                  <TableCell colSpan={6} />
                </TableRow>
              )}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TablePagination
                  rowsPerPageOptions={[5, 10, 25, { label: 'All', value: -1 }]}
                  colSpan={6}
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
      </Container>
    </div>
  );
};

export default Clients;
