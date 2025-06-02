"use client";

import { CalendarCheck, LogOut, ShoppingCart, TrendingUp, Utensils } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation"; // Use next/navigation in app router
import { useState } from "react";

export const Navbar = ({ currentPath = "/" }) => {
    // Use the currentPath prop passed from the layout
    const pathname = currentPath;
    const router = useRouter();
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    const navItems = [
        { name: 'Order', path: '/menu', icon: <CalendarCheck size={20} /> },
        { name: 'My Orders', path: '/orders', icon: <ShoppingCart size={20} /> },
        { name: 'Dining Wrapped', path: '/wrapped', icon: <TrendingUp size={20} /> },
    ];

    const isActive = (path) => {
        return pathname === path || pathname?.startsWith(`${path}/`);
    };

    const handleLogout = async (e) => {
        e.preventDefault();
        setIsLoggingOut(true);

        try {
            // Clear localStorage userData
            localStorage.removeItem('userData');

            // Make request to logout endpoint
            await fetch('http://localhost:3000/logout', {
                method: 'GET',
                credentials: 'include', // Important for sending cookies if using sessions
            });

            // Redirect to login page or home page after logout
            router.push('/login');
        } catch (error) {
            console.error('Logout error:', error);
            // Even if the server request fails, still clear local data
            localStorage.removeItem('userData');
            router.push('/login');
        } finally {
            setIsLoggingOut(false);
        }
    };

    return (
        <nav className="bg-gray-800 text-white w-64 min-h-screen p-4 space-y-2 fixed top-0 left-0">
            <div className="text-2xl font-bold mb-8 flex items-center space-x-2">
                <Utensils size={28} className="text-indigo-400" />
                <span>
                    Benson Bites
                </span>
            </div>
            {navItems.map((item) => (
                <Link
                    href={item.path}
                    key={item.name}
                    className={`w-full flex items-center space-x-3 p-3 rounded-lg text-left hover:bg-gray-700 transition-colors ${isActive(item.path) ? 'bg-indigo-600 text-white' : 'text-gray-300'
                        }`}
                >
                    {item.icon}
                    <span>{item.name}</span>
                </Link>
            ))}
            <div className="absolute bottom-4 left-4 right-4 space-y-2">

                <button
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="w-full flex items-center space-x-3 p-3 rounded-lg text-left text-gray-300 hover:bg-gray-700 transition-colors"
                >
                    <LogOut size={20} />
                    <span>{isLoggingOut ? 'Logging out...' : 'Logout'}</span>
                </button>
            </div>
        </nav>
    );
};