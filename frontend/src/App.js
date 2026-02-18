import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './services/authContext';
import { RegisterPage } from './pages/RegisterPage';
import { LoginPage } from './pages/LoginPage';
import { ChatPage } from './pages/ChatPage';
import './App.css';

const PrivateRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div className="loading-page">Loading...</div>;
  }

  return isAuthenticated ? children : <Navigate to="/login" />;
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/chat"
        element={
          <PrivateRoute>
            <ChatPage />
          </PrivateRoute>
        }
      />
      <Route path="/" element={<Navigate to="/chat" />} />
    </Routes>
  );
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}

export default App;
