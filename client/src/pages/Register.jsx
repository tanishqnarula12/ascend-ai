import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { NavLink, useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';

const Register = () => {
    const { register, googleLogin } = useAuth();
    const navigate = useNavigate();
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await register(username, email, password);
            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to register');
        }
    };

    const handleGoogleSuccess = async (credentialResponse) => {
        try {
            await googleLogin(credentialResponse.credential);
            navigate('/dashboard');
        } catch (err) {
            setError('Google registration failed. Please try again.');
        }
    };

    return (
        <div className="flex h-screen w-full items-center justify-center bg-background px-4">
            <div className="w-full max-w-md space-y-8 rounded-lg border bg-card p-8 shadow-sm">
                <div className="text-center">
                    <h2 className="text-3xl font-bold tracking-tight text-foreground">Create Account</h2>
                    <p className="mt-2 text-sm text-muted-foreground">Start your journey with AscendAI</p>
                </div>

                <div className="mt-8">
                    <div className="flex justify-center w-full mb-6">
                        <GoogleLogin
                            onSuccess={handleGoogleSuccess}
                            onError={() => setError('Google sign up failed')}
                            theme="filled_black"
                            shape="pill"
                            size="large"
                            text="signup_with"
                            width="100%"
                        />
                    </div>
                    
                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-border"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="bg-card px-2 text-muted-foreground">Or sign up with email</span>
                        </div>
                    </div>
                </div>

                <form className="mt-6 space-y-6" onSubmit={handleSubmit}>
                    {error && <div className="text-red-500 text-sm text-center">{error}</div>}
                    <div className="space-y-4 rounded-md shadow-sm">
                        <div>
                            <label htmlFor="username" className="sr-only">Username</label>
                            <input
                                id="username"
                                name="username"
                                type="text"
                                autoComplete="username"
                                required
                                className="relative block w-full rounded-md border-0 py-2.5 px-4 text-foreground bg-secondary ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6"
                                placeholder="Username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                            />
                        </div>
                        <div>
                            <label htmlFor="email-address" className="sr-only">Email address</label>
                            <input
                                id="email-address"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                className="relative block w-full rounded-md border-0 py-2.5 px-4 text-foreground bg-secondary ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6"
                                placeholder="Email address"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <div>
                            <label htmlFor="password" className="sr-only">Password</label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="new-password"
                                required
                                className="relative block w-full rounded-md border-0 py-2.5 px-4 text-foreground bg-secondary ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6"
                                placeholder="Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    <div>
                        <button
                            type="submit"
                            className="group relative flex w-full justify-center rounded-md bg-primary py-2.5 px-4 text-sm font-semibold text-white hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary transition-all duration-200"
                        >
                            Sign Up
                        </button>
                    </div>
                </form>

                <p className="mt-4 text-center text-sm text-muted-foreground">
                    Already have an account?{' '}
                    <NavLink to="/login" className="font-medium text-primary hover:text-primary/80">
                        Sign in
                    </NavLink>
                </p>
            </div>
        </div>
    );
};

export default Register;
