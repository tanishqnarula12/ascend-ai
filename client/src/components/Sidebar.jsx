import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, CheckSquare, Target, LogOut, BarChart3 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Sidebar = () => {
    const { logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const navItems = [
        { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { to: '/goals', label: 'My Goals', icon: Target },
        { to: '/tasks', label: 'Daily Tasks', icon: CheckSquare },
        { to: '/analytics', label: 'Analytics', icon: BarChart3 },
    ];

    return (
        <aside className="w-64 bg-card h-screen border-r border-border flex flex-col justify-between hidden md:flex">
            <div className="p-6">
                <h1 className="text-2xl font-bold text-primary mb-8 tracking-tighter">AscendAI</h1>
                <nav className="space-y-2">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors duration-200 ${isActive
                                    ? 'bg-primary text-primary-foreground font-medium'
                                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                                }`
                            }
                        >
                            <item.icon size={20} />
                            {item.label}
                        </NavLink>
                    ))}
                </nav>
            </div>

            <div className="p-6 border-t border-border">
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-4 py-3 text-destructive hover:bg-destructive/10 rounded-lg w-full transition-colors"
                >
                    <LogOut size={20} />
                    Logout
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
