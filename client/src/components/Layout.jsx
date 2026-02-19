import React from 'react';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';
import { Outlet } from 'react-router-dom';

const Layout = () => {
    return (
        <div className="flex flex-col md:flex-row h-screen bg-background overflow-hidden relative">
            <Sidebar />
            <main className="flex-1 overflow-y-auto relative pb-20 md:pb-0">
                <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-sky-400/20 via-background to-background pointer-events-none opacity-50"></div>
                <div className="p-4 md:p-8 max-w-7xl mx-auto w-full">
                    <Outlet />
                </div>
            </main>
            <MobileNav />
        </div>
    );
};

export default Layout;
