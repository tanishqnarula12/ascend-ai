import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { ThemeProvider } from './context/ThemeContext'
import { GoogleOAuthProvider } from '@react-oauth/google'

const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '922206656573-bfphrib1urduo6ekm1eferrofi0a869v.apps.googleusercontent.com';

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <GoogleOAuthProvider clientId={clientId}>
            <ThemeProvider>
                <App />
            </ThemeProvider>
        </GoogleOAuthProvider>
    </React.StrictMode>,
)
