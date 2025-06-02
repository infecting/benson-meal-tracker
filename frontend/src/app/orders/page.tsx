"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import axios from 'axios';

// Restaurant mapping (same as your menu page)
const restaurantMapping: Record<string, string> = {
    "13": "Fire Grill",
    "6": "Spice Market",
    "870": "Trattoria",
    "3": "Slice",
    "9": "La Parilla",
    "1633": "Simply Oasis",
    "534": "Sushi",
    "1634": "Acai Bowl",
    "10": "Mission Bakery",
    "812": "The Chef's Table",
};

// Types based on your backend schemas
interface ScheduledOrder {
    _id: string;
    userId: string;
    userEmail: string;
    locationId: string;
    locationName: string;
    items: Array<{
        itemId: string;
        name: string;
        price: number;
        quantity: number;
        options: Array<{ name: string; value: string }>;
    }>;
    scheduledTime: string;
    createdAt: string;
    status: 'scheduled' | 'processing' | 'completed' | 'cancelled';
    notes?: string;
}

interface PastOrder {
    id: string;
    date: string;
    location: string;
    locationId: string;
    items: Array<{
        name: string;
        price: number;
        quantity?: number;
    }>;
    total: number;
    status: string;
}

interface ItemRequest {
    _id: string;
    userId: string;
    userEmail: string;
    itemName: string;
    locationId?: string;
    locationName?: string;
    description: string;
    createdAt: string;
    status: 'pending' | 'approved' | 'rejected';
    upvotes: number;
}

interface UserData {
    token: {
        userId: number;
        sessionId: string;
        loginToken: string;
        name: string;
    }
}

const MyOrdersPage: React.FC = () => {
    const [scheduledOrders, setScheduledOrders] = useState<ScheduledOrder[]>([]);
    const [pastOrders, setPastOrders] = useState<PastOrder[]>([]);
    const [itemRequests, setItemRequests] = useState<ItemRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'scheduled' | 'past' | 'requests'>('scheduled');
    const [user, setUser] = useState<UserData | null>(null);
    const [debugInfo, setDebugInfo] = useState<string[]>([]);

    // Helper function to add debug messages
    const addDebug = (message: string) => {
        console.log(`[DEBUG] ${message}`);
        setDebugInfo(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
    };

    // Load user credentials from localStorage
    useEffect(() => {
        addDebug('Component mounted, checking localStorage...');

        const savedUserData = localStorage.getItem('userData');
        addDebug(`localStorage userData: ${savedUserData ? 'exists' : 'null'}`);

        if (savedUserData) {
            try {
                const userData = JSON.parse(savedUserData);
                addDebug(`Parsed user data: ${JSON.stringify(userData, null, 2)}`);
                setUser(userData);

                addDebug(`Set user - ID: ${userData.token?.userId}, Name: ${userData.token?.name}`);
                addDebug(`Has loginToken: ${!!userData.token?.loginToken}`);
                addDebug(`Has sessionId: ${!!userData.token?.sessionId}`);
            } catch (error) {
                addDebug(`Error parsing userData: ${error}`);
                localStorage.removeItem('userData');
                toast.error('Invalid user data found. Please log in again.');
            }
        } else {
            addDebug('No userData found in localStorage');
        }
    }, []);

    const fetchScheduledOrders = useCallback(async () => {
        if (!user?.token) {
            addDebug('Skipping scheduled orders - no user token');
            return;
        }

        try {
            addDebug(`Fetching scheduled orders for user: ${user.token.userId}`);
            addDebug(`API URL: ${process.env.NEXT_PUBLIC_REQUESTURL}/myScheduledOrders`);

            const response = await axios.post(`${process.env.NEXT_PUBLIC_REQUESTURL}/myScheduledOrders`, {
                userId: user.token.userId,
                loginToken: user.token.loginToken,
                sessionId: user.token.sessionId
            });

            addDebug(`Scheduled orders response: ${JSON.stringify(response.data)}`);
            setScheduledOrders(response.data);
        } catch (error) {
            addDebug(`Error fetching scheduled orders: ${error}`);
            console.error('Error fetching scheduled orders:', error);
            if (axios.isAxiosError(error)) {
                if (error.response?.status === 401) {
                    toast.error('Authentication failed. Please log in again.');
                    localStorage.removeItem('userData');
                    setUser(null);
                } else {
                    toast.error(`Failed to fetch scheduled orders: ${error.response?.status} ${error.message}`);
                }
            } else {
                toast.error('Failed to fetch scheduled orders');
            }
        }
    }, [user]);

    const fetchPastOrders = useCallback(async () => {
        if (!user?.token) {
            addDebug('Skipping past orders - no user token');
            return;
        }

        try {
            addDebug(`Fetching past orders for user: ${user.token.userId}`);
            addDebug(`API URL: ${process.env.NEXT_PUBLIC_REQUESTURL}/getPastOrders`);

            const response = await axios.post(`${process.env.NEXT_PUBLIC_REQUESTURL}/getPastOrders`, {
                userId: user.token.userId,
                loginToken: user.token.loginToken,
                sessionId: user.token.sessionId
            });

            addDebug(`Past orders response: ${JSON.stringify(response.data)}`);

            // Check if response has error
            if (response.data.error) {
                throw new Error(response.data.error);
            }

            setPastOrders(response.data);
        } catch (error) {
            addDebug(`Error fetching past orders: ${error}`);
            console.error('Error fetching past orders:', error);
            if (axios.isAxiosError(error)) {
                if (error.response?.status === 401) {
                    toast.error('Authentication failed. Please log in again.');
                    localStorage.removeItem('userData');
                    setUser(null);
                } else {
                    toast.error(`Failed to fetch past orders: ${error.response?.status} ${error.message}`);
                }
            } else {
                toast.error(`Failed to fetch past orders: ${(error as Error).message}`);
            }
        }
    }, [user]);

    const fetchItemRequests = useCallback(async () => {
        if (!user?.token) {
            addDebug('Skipping item requests - no user token');
            return;
        }

        try {
            addDebug(`Fetching item requests for user: ${user.token.userId}`);
            addDebug(`API URL: ${process.env.NEXT_PUBLIC_REQUESTURL}/myItemRequests`);

            const response = await axios.post(`${process.env.NEXT_PUBLIC_REQUESTURL}/myItemRequests`, {
                userId: user.token.userId,
                loginToken: user.token.loginToken,
                sessionId: user.token.sessionId
            });

            addDebug(`Item requests response: ${JSON.stringify(response.data)}`);
            setItemRequests(response.data);
        } catch (error) {
            addDebug(`Error fetching item requests: ${error}`);
            console.error('Error fetching item requests:', error);
            if (axios.isAxiosError(error)) {
                if (error.response?.status === 401) {
                    toast.error('Authentication failed. Please log in again.');
                    localStorage.removeItem('userData');
                    setUser(null);
                } else {
                    toast.error(`Failed to fetch item requests: ${error.response?.status} ${error.message}`);
                }
            } else {
                toast.error('Failed to fetch item requests');
            }
        }
    }, [user]);

    const fetchAllOrders = useCallback(async () => {
        addDebug('Starting fetchAllOrders...');
        setLoading(true);

        try {
            await Promise.all([
                fetchScheduledOrders(),
                fetchPastOrders(),
                fetchItemRequests()
            ]);
            addDebug('All fetch operations completed');
        } catch (error) {
            addDebug(`Error in fetchAllOrders: ${error}`);
            console.error('Error fetching orders:', error);
            toast.error('Failed to load orders');
        } finally {
            setLoading(false);
            addDebug('Loading set to false');
        }
    }, [fetchScheduledOrders, fetchPastOrders, fetchItemRequests]);

    // Trigger fetch when user data is available
    useEffect(() => {
        addDebug(`useEffect triggered - user exists: ${!!user}, has token: ${!!user?.token}`);

        if (user?.token) {
            addDebug('User data exists, calling fetchAllOrders');
            fetchAllOrders();
        } else {
            addDebug('No user data, setting loading to false');
            setLoading(false);
        }
    }, [user, fetchAllOrders]);

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case 'scheduled':
                return 'bg-blue-100 text-blue-800';
            case 'processing':
                return 'bg-yellow-100 text-yellow-800';
            case 'completed':
                return 'bg-green-100 text-green-800';
            case 'cancelled':
                return 'bg-red-100 text-red-800';
            case 'pending':
                return 'bg-gray-100 text-gray-800';
            case 'approved':
                return 'bg-green-100 text-green-800';
            case 'rejected':
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const calculateOrderTotal = (items: any[]) => {
        return items.reduce((total, item) => total + (item.price * (item.quantity || 1)), 0);
    };

    const handleLogout = () => {
        localStorage.removeItem('userData');
        setUser(null);
        toast.info('Logged out successfully');
        // Optionally redirect to login page
        window.location.href = '/login';
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading your orders...</p>

                    {/* Debug Info - Remove in production */}
                    {process.env.NODE_ENV === 'development' && (
                        <div className="mt-4 p-4 bg-gray-100 rounded text-left text-xs max-w-md">
                            <h4 className="font-bold mb-2">Debug Info:</h4>
                            {debugInfo.slice(-10).map((info, idx) => (
                                <div key={idx} className="mb-1">{info}</div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Show error state if no user data
    if (!user?.token) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-red-600 mb-4">No user authentication found. Please log in again.</p>
                    <button
                        onClick={() => window.location.href = '/login'}
                        className="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 transition-colors"
                    >
                        Go to Login
                    </button>

                    {/* Debug Info - Remove in production */}
                    {process.env.NODE_ENV === 'development' && (
                        <div className="mt-4 p-4 bg-gray-100 rounded text-left text-xs max-w-md">
                            <h4 className="font-bold mb-2">Debug Info:</h4>
                            {debugInfo.map((info, idx) => (
                                <div key={idx} className="mb-1">{info}</div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <Head>
                <title>My Orders - SCU Mobile Order</title>
                <meta name="description" content="View all your scheduled orders, past orders, and item requests" />
            </Head>

            <header className="bg-white shadow-sm">
                <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">My Orders</h1>
                            <p className="text-gray-600 mt-1">
                                Welcome, {user.token.name} - View all your orders and requests
                            </p>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors text-sm"
                        >
                            Logout
                        </button>
                    </div>

                    {/* Debug Info - Remove in production */}
                    {process.env.NODE_ENV === 'development' && (
                        <details className="mt-2">
                            <summary className="text-xs text-gray-500 cursor-pointer">Debug Info</summary>
                            <div className="mt-2 p-2 bg-gray-100 rounded text-xs">
                                <div>User ID: {user.token.userId}</div>
                                <div>Name: {user.token.name}</div>
                                <div>Has Token: {!!user.token.loginToken ? 'Yes' : 'No'}</div>
                                <div>API URL: {process.env.NEXT_PUBLIC_REQUESTURL}</div>
                            </div>
                        </details>
                    )}
                </div>
            </header>

            <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                {/* Tab Navigation */}
                <div className="bg-white rounded-lg shadow-sm mb-6">
                    <div className="border-b border-gray-200">
                        <nav className="-mb-px flex space-x-8 px-6">
                            <button
                                onClick={() => setActiveTab('scheduled')}
                                className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'scheduled'
                                    ? 'border-indigo-500 text-indigo-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }`}
                            >
                                Scheduled Orders ({scheduledOrders.length})
                            </button>
                            <button
                                onClick={() => setActiveTab('past')}
                                className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'past'
                                    ? 'border-indigo-500 text-indigo-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }`}
                            >
                                Past Orders ({pastOrders.length})
                            </button>
                            <button
                                onClick={() => setActiveTab('requests')}
                                className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'requests'
                                    ? 'border-indigo-500 text-indigo-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }`}
                            >
                                Item Requests ({itemRequests.length})
                            </button>
                        </nav>
                    </div>
                </div>

                {/* Scheduled Orders Tab */}
                {activeTab === 'scheduled' && (
                    <div className="space-y-4">
                        {scheduledOrders.length === 0 ? (
                            <div className="bg-white rounded-lg p-8 text-center">
                                <p className="text-gray-500">No scheduled orders found</p>
                                <p className="text-sm text-gray-400 mt-2">
                                    Schedule your next order from the menu page!
                                </p>
                            </div>
                        ) : (
                            scheduledOrders.map((order) => (
                                <div key={order._id} className="bg-white rounded-lg shadow-sm p-6">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h3 className="text-lg font-semibold text-gray-900">
                                                {order.locationName || restaurantMapping[order.locationId] || `Location ${order.locationId}`}
                                            </h3>
                                            <p className="text-sm text-gray-600">
                                                Scheduled for: {formatDate(order.scheduledTime)}
                                            </p>
                                            <p className="text-sm text-gray-500">
                                                Created: {formatDate(order.createdAt)}
                                            </p>
                                        </div>
                                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                                            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                                        </span>
                                    </div>

                                    <div className="border-t pt-4">
                                        <h4 className="font-medium text-gray-900 mb-2">Items:</h4>
                                        <ul className="space-y-2">
                                            {order.items.map((item, index) => (
                                                <li key={index} className="flex justify-between items-center">
                                                    <div>
                                                        <span className="font-medium">{item.name}</span>
                                                        {item.quantity > 1 && <span className="text-gray-600"> x{item.quantity}</span>}
                                                        {item.options && item.options.length > 0 && (
                                                            <div className="text-sm text-gray-500">
                                                                {item.options.map(opt => `${opt.name}: ${opt.value}`).join(', ')}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <span className="font-medium">${(item.price / 100).toFixed(2)}</span>
                                                </li>
                                            ))}
                                        </ul>
                                        <div className="mt-4 pt-2 border-t flex justify-between items-center">
                                            <span className="font-semibold">Total:</span>
                                            <span className="font-semibold text-lg">
                                                ${(calculateOrderTotal(order.items) / 100).toFixed(2)}
                                            </span>
                                        </div>
                                        {order.notes && (
                                            <div className="mt-2 p-2 bg-gray-50 rounded">
                                                <span className="text-sm font-medium">Notes: </span>
                                                <span className="text-sm text-gray-700">{order.notes}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {/* Past Orders Tab */}
                {activeTab === 'past' && (
                    <div className="space-y-4">
                        {pastOrders.length === 0 ? (
                            <div className="bg-white rounded-lg p-8 text-center">
                                <p className="text-gray-500">No past orders found</p>
                                <p className="text-sm text-gray-400 mt-2">
                                    Your order history will appear here after you place orders
                                </p>
                            </div>
                        ) : (
                            pastOrders.map((order) => (
                                <div key={order.id} className="bg-white rounded-lg shadow-sm p-6">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h3 className="text-lg font-semibold text-gray-900">
                                                {order.location || restaurantMapping[order.locationId] || `Location ${order.locationId}`}
                                            </h3>
                                            <p className="text-sm text-gray-600">
                                                Ordered: {formatDate(order.date)}
                                            </p>
                                        </div>
                                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                                            {order.status}
                                        </span>
                                    </div>

                                    <div className="border-t pt-4">
                                        <h4 className="font-medium text-gray-900 mb-2">Items:</h4>
                                        <ul className="space-y-2">
                                            {order.items.map((item, index) => (
                                                <li key={index} className="flex justify-between items-center">
                                                    <div>
                                                        <span className="font-medium">{item.name}</span>
                                                        {item.quantity && item.quantity > 1 && (
                                                            <span className="text-gray-600"> x{item.quantity}</span>
                                                        )}
                                                    </div>
                                                    <span className="font-medium">${(item.price / 100).toFixed(2)}</span>
                                                </li>
                                            ))}
                                        </ul>
                                        <div className="mt-4 pt-2 border-t flex justify-between items-center">
                                            <span className="font-semibold">Total:</span>
                                            <span className="font-semibold text-lg">
                                                ${(order.total / 100).toFixed(2)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {/* Item Requests Tab */}
                {activeTab === 'requests' && (
                    <div className="space-y-4">
                        {itemRequests.length === 0 ? (
                            <div className="bg-white rounded-lg p-8 text-center">
                                <p className="text-gray-500">No item requests found</p>
                                <p className="text-sm text-gray-400 mt-2">
                                    Request new menu items from the order page!
                                </p>
                            </div>
                        ) : (
                            itemRequests.map((request) => (
                                <div key={request._id} className="bg-white rounded-lg shadow-sm p-6">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h3 className="text-lg font-semibold text-gray-900">{request.itemName}</h3>
                                            <p className="text-sm text-gray-600">
                                                {request.locationName || (request.locationId && restaurantMapping[request.locationId]) || 'Any Location'}
                                            </p>
                                            <p className="text-sm text-gray-500">
                                                Requested: {formatDate(request.createdAt)}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(request.status)}`}>
                                                {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                                            </span>
                                            <p className="text-sm text-gray-600 mt-1">
                                                {request.upvotes} upvote{request.upvotes !== 1 ? 's' : ''}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="border-t pt-4">
                                        <p className="text-gray-700">{request.description}</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {/* Refresh Button */}
                <div className="mt-8 text-center">
                    <button
                        onClick={fetchAllOrders}
                        disabled={loading}
                        className="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50"
                    >
                        {loading ? 'Refreshing...' : 'Refresh Orders'}
                    </button>
                </div>
            </main>

            <ToastContainer />
        </div>
    );
};

export default MyOrdersPage