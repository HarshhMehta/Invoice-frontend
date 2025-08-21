import React from 'react';
import { Grid, TextField } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

export default function MaterialUIDatePicker({ setSelectedDate, selectedDate }) {
  const handleDateChange = (date) => {
    if (date) {
      setSelectedDate(date.toISOString());
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Grid container justifyContent="space-around" style={{ width: '97%', paddingLeft: '10px', paddingBottom: '15px' }}>
        <DatePicker
          label="Date Paid"
          value={selectedDate}
          onChange={handleDateChange}
          renderInput={(params) => <TextField {...params} fullWidth />}
        />
      </Grid>
    </LocalizationProvider>
  );
}
