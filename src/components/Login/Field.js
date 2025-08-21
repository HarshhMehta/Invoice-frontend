// import React from 'react'
// import styles from './Login.module.css'

// const Field = ({ name, placeholder, type, handleChange }) => {

//     return (
//         <div>
//             <input 
//                 className={styles.inputField} 
//                 type={type}
//                 name={name}
//                 placeholder={placeholder}
//                 onChange={handleChange} 
//                 required = {true}
//             />
//         </div>
//     )
// }

// export default Field

import React from 'react';
import { TextField, Grid, InputAdornment, IconButton } from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';

const Field = ({ name, handleChange, label, half, autoFocus, type, handleShowPassword, placeholder }) => (
  <Grid item xs={12} sm={half ? 6 : 12}>
    <TextField
      name={name}
      onChange={handleChange}
      placeholder={placeholder}
      variant="outlined"
      required
      fullWidth
      label={label}
      autoFocus={autoFocus}
      type={type}
      InputProps={name === 'password' || name === 'confirmPassword' ? {
        endAdornment: (
          <InputAdornment position="end">
            <IconButton onClick={handleShowPassword} edge="end">
              {type === 'password' ? <Visibility /> : <VisibilityOff />}
            </IconButton>
          </InputAdornment>
        ),
      } : null}
    />
  </Grid>
);

export default Field;
