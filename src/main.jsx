import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './lib/api';
import './responsive.css';

import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Queue from './pages/Queue';
import Followups from './pages/Followups';
import Patients from './pages/Patients';
import Analytics from './pages/Analytics';
import Doctor from './pages/Doctor';
import Settings from './pages/Settings';
import Layout from './components/Layout';

function PrivateRoute({ children }) {
  const token = useAuthStore(s => s.token);
  return token ? children : <Navigate to="/login" replace />;
}

function RoleRoute({ children, allow }) {
  const user = useAuthStore(s => s.user);
  if (!user) return <Navigate to="/login" replace />;
  if (!allow.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return children;
}

// After login, redirect based on role
function DefaultRedirect() {
  const user = useAuthStore(s => s.user);
  if (!user) return <Navigate to="/login" replace />;
  // All roles go to dashboard home first
  return <Navigate to="/dashboard" replace />;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* App */}
        <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
          <Route index element={<DefaultRedirect />} />

          {/* All roles */}
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="queue" element={<Queue />} />
          <Route path="patients" element={<Patients />} />
          <Route path="followups" element={<Followups />} />
          <Route path="settings" element={<Settings />} />

          {/* Doctor + Admin */}
          <Route path="doctor" element={
            <RoleRoute allow={['doctor', 'admin']}><Doctor /></RoleRoute>
          } />
          <Route path="analytics" element={
            <RoleRoute allow={['doctor', 'admin']}><Analytics /></RoleRoute>
          } />
        </Route>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
