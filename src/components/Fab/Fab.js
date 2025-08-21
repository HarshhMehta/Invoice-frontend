import React, { useState } from 'react'
import { useLocation } from 'react-router-dom';
import { Fab, Action } from 'react-tiny-fab';
import 'react-tiny-fab/dist/styles.css';
import AddIcon from '@mui/icons-material/Add';
import CreateIcon from '@mui/icons-material/Create';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import AddClient from '../Invoice/AddClient';

const FabButton = () => {
  const location = useLocation();
  const mainButtonStyles = { backgroundColor: '#1976D2' };
  const [open, setOpen] = useState(false);

  return (
    <div>
      <AddClient setOpen={setOpen} open={open} />
      <Fab
        mainButtonStyles={mainButtonStyles}
        icon={<AddIcon />}
        alwaysShowTitle={true}
      >
        {location.pathname !== '/invoice' && (
          <Action
            text="New Invoice"
            onClick={() => window.location.href = '/invoice'}
          >
            <CreateIcon />
          </Action>
        )}

        <Action
          text="New Customer"
          onClick={() => setOpen((prev) => !prev)}
        >
          <PersonAddIcon />
        </Action>
      </Fab>
    </div>
  );
}

export default FabButton;
