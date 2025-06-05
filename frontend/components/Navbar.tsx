"use client";
import { CalendarCheck, LogOut, Menu, ShoppingCart, TrendingUp, Utensils, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export const Navbar = ({ currentPath = "/" }) => {
    const pathname = currentPath;
    const router = useRouter();
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
            localStorage.removeItem('userData');
            await fetch('http://localhost:3000/logout', {
                method: 'GET',
                credentials: 'include',
            });
            router.push('/login');
        } catch (error) {
            console.error('Logout error:', error);
            localStorage.removeItem('userData');
            router.push('/login');
        } finally {
            setIsLoggingOut(false);
        }
    };

    const closeMobileMenu = () => {
        setIsMobileMenuOpen(false);
    };

    return (
        <>
            {/* Mobile Header */}
            <div className="lg:hidden bg-[#A32035] text-white p-4 flex items-center justify-between fixed top-0 left-0 right-0 z-50">
                <div className="flex items-center space-x-2">
                    <Utensils size={24} className="text-white-400" />
                    <span className="text-xl font-bold">Benson Bites</span>
                </div>
                <button
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    className="p-2 hover:bg-red-900 rounded"
                >
                    {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </div>

            {/* Mobile Menu Overlay */}
            {isMobileMenuOpen && (
                <div className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40" onClick={closeMobileMenu} />
            )}

            {/* Mobile Menu */}
            <div className={`lg:hidden fixed top-0 left-0 h-full w-64 bg-[#A32035] text-white transform transition-transform duration-300 ease-in-out z-50 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
                }`}>
                <div className="p-4 space-y-2">
                    <div className="text-2xl font-bold mb-8 flex items-center space-x-2">
                        <Utensils size={28} className="text-white-400" />
                        <span>Benson Bites</span>
                    </div>

                    {navItems.map((item) => (
                        <Link
                            href={item.path}
                            key={item.name}
                            onClick={closeMobileMenu}
                            className={`w-full flex items-center space-x-3 p-3 rounded-lg text-left hover:bg-red-900 transition-colors ${isActive(item.path) ? 'bg-white-600 text-white' : 'text-gray-300'
                                }`}
                        >
                            {item.icon}
                            <span>{item.name}</span>
                        </Link>
                    ))}

                    <div className="absolute bottom-4 left-4 right-4">
                        <button
                            onClick={(e) => {
                                handleLogout(e);
                                closeMobileMenu();
                            }}
                            disabled={isLoggingOut}
                            className="w-full flex items-center space-x-3 p-3 rounded-lg text-left text-gray-300 hover:bg-red-900 transition-colors"
                        >
                            <LogOut size={20} />
                            <span>{isLoggingOut ? 'Logging out...' : 'Logout'}</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Desktop Sidebar */}
            <nav className="hidden lg:block bg-[#A32035] text-white w-64 min-h-screen p-4 space-y-2 fixed top-0 left-0">
                <div className="text-2xl font-bold mb-8 flex items-center space-x-2">
                    <Utensils size={28} className="text-white-400" />
                    <span>Benson Bites</span>
                </div>

                {navItems.map((item) => (
                    <Link
                        href={item.path}
                        key={item.name}
                        className={`w-full flex items-center space-x-3 p-3 rounded-lg text-left hover:bg-red-900 transition-colors ${isActive(item.path) ? 'bg-indigo-600 text-white' : 'text-gray-300'
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
                        className="w-full flex items-center space-x-3 p-3 rounded-lg text-left text-gray-300 hover:bg-red-900 transition-colors"
                    >
                        <LogOut size={20} />
                        <span>{isLoggingOut ? 'Logging out...' : 'Logout'}</span>
                    </button>
                </div>
            </nav>
        </>
    );
};