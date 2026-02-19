import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, CheckSquare, Target, BarChart3 } from 'lucide-react';

const MobileNav = () => {
    const navItems = [
        { to: '/dashboard', label: 'Home', icon: LayoutDashboard },
        { to: '/goals', label: 'Goals', icon: Target },
        { to: '/tasks', label: 'Tasks', icon: CheckSquare },
        { to: '/analytics', label: 'Stats', icon: BarChart3 },
    ];

    return (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border flex justify-around items-center px-2 py-3 z-50">
            {navItems.map((item) => (
                <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                        `flex flex-col items-center gap-1 transition-colors duration-200 ${isActive
                            ? 'text-primary'
                            : 'text-muted-foreground hover:text-foreground'
                        }`
                    }
                >
                    <item.icon size={20} />
                    <span className="text-[10px] font-medium">{item.label}</span>
                </NavLink>
            ))}
        </nav>
    );
};

export default MobileNav;
