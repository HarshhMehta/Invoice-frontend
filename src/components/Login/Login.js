import React, { useState, useEffect } from 'react';
import Field from './Field';
import styles from './Login.module.css';
import { GoogleLogin } from '@react-oauth/google';
import { useDispatch } from 'react-redux';
import { useHistory, Link } from 'react-router-dom';
import { signup, signin } from '../../actions/auth';
import {
  Avatar,
  Button,
  Paper,
  Grid,
  Typography,
  Container,
} from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { createProfile } from '../../actions/profile';
import { useSnackbar } from 'notistack';
import ProgressButton from 'react-progress-button';
import jwt_decode from 'jwt-decode';

const initialState = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  confirmPassword: '',
  profilePicture: '',
  bio: '',
};

const Login = () => {
  const [formData, setFormData] = useState(initialState);
  const [isSignup, setIsSignup] = useState(false);
  const dispatch = useDispatch();
  const history = useHistory();
  const { enqueueSnackbar } = useSnackbar();
  const [showPassword, setShowPassword] = useState(false);

  const handleShowPassword = () => setShowPassword((prev) => !prev);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isSignup) {
      dispatch(signup(formData, enqueueSnackbar, history));
    } else {
      dispatch(signin(formData, enqueueSnackbar, history));
    }
  };

  const switchMode = () => {
    setIsSignup((prevState) => !prevState);
  };

  const googleSuccess = async (credentialResponse) => {
    try {
      const decoded = jwt_decode(credentialResponse.credential);
      const result = {
        name: decoded.name,
        email: decoded.email,
        googleId: decoded.sub,
        imageUrl: decoded.picture,
      };
      const token = credentialResponse.credential;

      dispatch(
        createProfile({
          name: result.name,
          email: result.email,
          userId: result.googleId,
          phoneNumber: '',
          businessName: '',
          contactAddress: '',
          logo: result.imageUrl,
          website: '',
        })
      );

      dispatch({ type: 'AUTH', data: { result, token } });
      history.push('/dashboard');
    } catch (error) {
      console.log(error);
    }
  };

  const googleError = () => {
    enqueueSnackbar('Google Sign In was unsuccessful. Try again later.', { variant: 'error' });
  };

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('profile'));
    if (user) {
      history.push('/dashboard');
    }
  }, [history]);

  return (
    <Container component="main" maxWidth="xs">
      <Paper
        elevation={2}
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: 2,
        }}
      >
        <Avatar
          sx={{
            m: 1,
            bgcolor: 'primary.main',
          }}
        >
          <LockOutlinedIcon />
        </Avatar>
        <Typography component="h1" variant="h5">
          {isSignup ? 'Sign up' : 'Sign in'}
        </Typography>
        <form onSubmit={handleSubmit} style={{ width: '100%', marginTop: '16px' }}>
          <Grid container spacing={2}>
            {isSignup && (
              <>
                <Field
                  name="firstName"
                  label="First Name"
                  handleChange={handleChange}
                  autoFocus
                  half
                />
                <Field
                  name="lastName"
                  label="Last Name"
                  handleChange={handleChange}
                  half
                />
              </>
            )}
            <Field
              name="email"
              label="Email Address"
              handleChange={handleChange}
              type="email"
            />
            <Field
              name="password"
              label="Password"
              handleChange={handleChange}
              type={showPassword ? 'text' : 'password'}
              handleShowPassword={handleShowPassword}
            />
            {isSignup && (
              <Field
                name="confirmPassword"
                label="Repeat Password"
                handleChange={handleChange}
                type="password"
              />
            )}
          </Grid>

          <div className={styles.buttons}>
            <div>
              <ProgressButton>{isSignup ? 'Sign Up' : 'Sign In'}</ProgressButton>
            </div>
            <div>
              <GoogleLogin onSuccess={googleSuccess} onError={googleError} />
            </div>
          </div>

          <Grid container justifyContent="flex-end" sx={{ mt: 2 }}>
            <Grid item>
              <Button onClick={switchMode}>
                {isSignup
                  ? 'Already have an account? Sign in'
                  : "Don't have an account? Sign Up"}
              </Button>
            </Grid>
          </Grid>
          <Link to="/forgot">
            <Typography
              variant="body2"
              color="primary"
              align="center"
              sx={{ mt: 2 }}
            >
              Forgotten Password?
            </Typography>
          </Link>
        </form>
      </Paper>
    </Container>
  );
};

export default Login;
