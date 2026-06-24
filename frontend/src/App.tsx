import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { Box, CircularProgress } from '@mui/material';
import { RootState } from './store';
import { setUser, logout } from './store/slices/authSlice';
import { config, API_ENDPOINTS } from './config/config';
import Login from './components/auth/Login';
import MultiStepRegister from './components/auth/MultiStepRegister';
import Dashboard from './components/dashboard/Dashboard';
import Layout from './components/layout/Layout';
import { LandingPage } from './components/landing';

function App() {
  const { isAuthenticated, isInitializing, token } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch();

  useEffect(() => {
    if (!token) return;
    fetch(`${config.API_BASE_URL}${API_ENDPOINTS.AUTH.ME}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Token invalid');
        return res.json();
      })
      .then((user) => dispatch(setUser(user)))
      .catch(() => dispatch(logout()));
  }, []); // eslint-disable-line

  if (isInitializing) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100dvh', backgroundColor: '#0f0f23' }}>
        <CircularProgress size={40} sx={{ color: '#64b5f6' }} />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100dvh' }}>
      <Routes>
        <Route 
          path="/landing" 
          element={isAuthenticated ? <Navigate to="/" /> : <LandingPage />} 
        />
        <Route 
          path="/login" 
          element={isAuthenticated ? <Navigate to="/" /> : <Login />} 
        />
        <Route 
          path="/register" 
          element={isAuthenticated ? <Navigate to="/" /> : <MultiStepRegister />} 
        />
        <Route 
          path="/" 
          element={
            isAuthenticated ? (
              <Layout>
                <Dashboard />
              </Layout>
            ) : (
              <LandingPage />
            )
          } 
        />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Box>
  );
}

export default App; 