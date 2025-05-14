import { CalendarCheck, LogOut, Settings, ShoppingCart, TrendingUp, Utensils } from "lucide-react";
import Link from "next/link";

export const Navbar = ({ currentPath = "/" }) => {
    // Use the currentPath prop passed from the layout
    const pathname = currentPath;

    const navItems = [
        { name: 'Order', path: '/menu', icon: <CalendarCheck size={20} /> },
        { name: 'My Orders', path: '/my-orders', icon: <ShoppingCart size={20} /> },
        { name: 'Dining Wrapped', path: '/wrapped', icon: <TrendingUp size={20} /> },
    ];

    const isActive = (path) => {
        return pathname === path || pathname?.startsWith(`${path}/`);
    };

    return (
        <nav className="bg-gray-800 text-white w-64 min-h-screen p-4 space-y-2 fixed top-0 left-0">
            <div className="text-2xl font-bold mb-8 flex items-center space-x-2">
                <Utensils size={28} className="text-indigo-400" />
                <span>Campus Bites</span>
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
                <Link
                    href="/settings"
                    className={`w-full flex items-center space-x-3 p-3 rounded-lg text-left hover:bg-gray-700 transition-colors ${isActive('/settings') ? 'bg-indigo-600 text-white' : 'text-gray-300'
                        }`}
                >
                    <Settings size={20} />
                    <span>Settings</span>
                </Link>
                <Link
                    href="/logout"
                    className="w-full flex items-center space-x-3 p-3 rounded-lg text-left text-gray-300 hover:bg-gray-700 transition-colors"
                >
                    <LogOut size={20} />
                    <span>Logout</span>
                </Link>
            </div>
        </nav>
    );
};