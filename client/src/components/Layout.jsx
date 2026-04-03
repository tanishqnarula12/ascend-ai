import React from 'react';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Layout = () => {
    const { currentUser } = useAuth();
    const navigate = useNavigate();

    return (
        <div className="flex flex-col md:flex-row h-screen bg-background overflow-hidden relative">
            <Sidebar />
            <main className="flex-1 overflow-y-auto relative pb-20 md:pb-0">
                <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-sky-400/20 via-background to-background pointer-events-none opacity-50"></div>
                
                {/* Top header right for Profile Info */}
                <div className="w-full flex justify-end px-4 py-3 md:px-8 md:pt-6 md:pb-2 sticky top-0 z-40 bg-background/60 backdrop-blur-md md:bg-transparent md:backdrop-blur-none">
                    <div 
                        onClick={() => navigate('/profile')}
                        className="cursor-pointer flex items-center gap-3 bg-card border border-border pl-4 pr-1.5 py-1.5 rounded-full shadow-sm hover:shadow-md transition-all hover:border-primary/50"
                    >
                        <span className="text-sm font-semibold text-foreground hidden sm:block">{currentUser?.username || 'Profile'}</span>
                        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold shadow-sm overflow-hidden border border-border/50">
                            {currentUser?.photoUrl ? (
                                <img src={currentUser.photoUrl} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                                currentUser?.username?.charAt(0).toUpperCase() || 'U'
                            )}
                        </div>
                    </div>
                </div>

                <div className="p-4 md:px-8 md:pb-8 max-w-7xl mx-auto w-full">
                    <Outlet />
                </div>
            </main>
            <MobileNav />
        </div>
    );
};

export default Layout;
