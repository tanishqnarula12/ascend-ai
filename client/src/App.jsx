import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Goals from './pages/Goals';
import Tasks from './pages/Tasks';
import Layout from './components/Layout';

const ProtectedLayout = () => {
    const { currentUser } = useAuth();
    if (!currentUser) return <Navigate to="/login" replace />;
    return <Layout />;
};

const PublicRoute = ({ children }) => {
    const { currentUser } = useAuth();
    if (currentUser) return <Navigate to="/dashboard" replace />;
    return children;
};

function App() {
    return (
        <Router>
            <AuthProvider>
                <Routes>
                    {/* Public Routes */}
                    <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
                    <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

                    {/* Protected Routes */}
                    <Route element={<ProtectedLayout />}>
                        <Route path="/" element={<Navigate to="/dashboard" replace />} />
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/goals" element={<Goals />} />
                        <Route path="/tasks" element={<Tasks />} />
                        <Route path="/analytics" element={<div className="p-8 text-center text-muted-foreground">Analytics Page Coming Soon</div>} />
                    </Route>

                    {/* Catch-all redirect to login */}
                    <Route path="*" element={<Navigate to="/login" replace />} />
                </Routes>
            </AuthProvider>
        </Router>
    );
}

export default App;
