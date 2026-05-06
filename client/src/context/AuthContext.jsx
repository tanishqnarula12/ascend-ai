import React, { createContext, useState, useContext, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);


    useEffect(() => {
        console.log("[AUTH] Initializing state...");
        try {
            const storedToken = localStorage.getItem('token');
            const storedUser = localStorage.getItem('user');

            if (storedToken && storedUser) {
                try {
                    const parsedUser = JSON.parse(storedUser);
                    setCurrentUser(parsedUser);
                    console.log("[AUTH] User restored from storage:", parsedUser.username);
                } catch (e) {
                    console.error("[AUTH] Failed to parse stored user", e);
                    localStorage.removeItem('user');
                    localStorage.removeItem('token');
                }
            } else {
                console.log("[AUTH] No session found");
            }
        } catch (error) {
            console.error("[AUTH] Initialization error", error);
        } finally {
            console.log("[AUTH] Init complete, loading -> false");
            setLoading(false);
        }
    }, []);

    const login = async (email, password) => {
        try {
            const response = await api.post('/auth/login', { email, password });
            const { token, ...user } = response.data;

            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(user));
            setCurrentUser(user);
            return user;
        } catch (error) {
            console.error("[AUTH] Login failed:", error.response ? error.response.data : error.message);
            throw error;
        }
    };

    const register = async (username, email, password) => {
        try {
            const response = await api.post('/auth/register', { username, email, password });
            const { token, ...user } = response.data;

            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(user));
            setCurrentUser(user);
            return user;
        } catch (error) {
            console.error("[AUTH] Registration failed:", error.response ? error.response.data : error.message);
            throw error;
        }
    };

    const googleLogin = async (credential) => {
        try {
            const response = await api.post('/auth/google', { credential });
            const { token, ...user } = response.data;

            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(user));
            setCurrentUser(user);
            return user;
        } catch (error) {
            console.error("[AUTH] Google login failed:", error.response ? error.response.data : error.message);
            throw error;
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setCurrentUser(null);
    };

    const refreshUser = async () => {
        try {
            const response = await api.get('/auth/profile');
            const user = response.data;
            setCurrentUser(user);
            localStorage.setItem('user', JSON.stringify(user));
            return user;
        } catch (error) {
            console.error("[AUTH] Refresh failed:", error);
        }
    };

    const value = {
        currentUser,
        login,
        register,
        googleLogin,
        logout,
        refreshUser,
        api,
        setCurrentUser
    };

    if (loading) {
        return (
            <div style={{ padding: '20px', background: '#fff', color: '#000' }}>
                <h2>[AUTHBAR] Loading status...</h2>
                <p>If this persists, check console logs below.</p>
            </div>
        );
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
