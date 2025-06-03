/* eslint-disable @typescript-eslint/no-unused-vars */
// File: src/app/requests/[requestId]/RequestPageClient.tsx

"use client";
import React, { useState, useEffect } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import axios from 'axios';
import Link from 'next/link';

// Restaurant mapping
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

interface ItemRequest {
    _id: string;
    userId: string;
    userEmail: string;
    itemName: string;
    locationId?: string;
    locationName?: string;
    description: string;
    createdAt: string;
    status: 'pending' | 'approved' | 'rejected' | 'fulfilled';
    upvotes: number;
    barcode?: string; // Add barcode field
}

interface UserData {
    token: {
        userId: number;
        sessionId: string;
        loginToken: string;
        name: string;
    }
}

interface RequestPageClientProps {
    requestId: string;
}

// Barcode component
// If you want to use a proper barcode library, install JsBarcode:
// npm install jsbarcode
// npm install @types/jsbarcode

import JsBarcode from 'jsbarcode';

// Professional Barcode component using JsBarcode library
const BarcodeDisplay: React.FC<{ barcode: string; itemName: string }> = ({ barcode, itemName }) => {
    const canvasRef = React.useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (canvasRef.current && barcode) {
            try {
                JsBarcode(canvasRef.current, barcode, {
                    format: "CODE128",
                    width: 2,
                    height: 80,
                    displayValue: true,
                    fontSize: 12,
                    margin: 10,
                    background: "#ffffff",
                    lineColor: "#000000"
                });
            } catch (error) {
                console.error('Error generating barcode:', error);
                // Fallback to simple text display
                const canvas = canvasRef.current;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    canvas.width = 300;
                    canvas.height = 100;
                    ctx.fillStyle = 'white';
                    ctx.fillRect(0, 0, 300, 100);
                    ctx.fillStyle = 'black';
                    ctx.font = '16px monospace';
                    ctx.textAlign = 'center';
                    ctx.fillText('Barcode Error', 150, 40);
                    ctx.fillText(barcode, 150, 70);
                }
            }
        }
    }, [barcode]);

    return (
        <div className="bg-white p-6 rounded-lg border-2 border-gray-200 text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Order Barcode</h3>
            <div className="mb-4 flex justify-center">
                <canvas
                    ref={canvasRef}
                    className="border border-gray-200 rounded"
                    style={{ maxWidth: '100%', height: 'auto' }}
                />
            </div>
            <p className="text-sm text-gray-600 mb-2">
                Order Code: <code className="bg-gray-100 px-2 py-1 rounded text-xs font-mono">{barcode}</code>
            </p>
            <p className="text-xs text-gray-500">Show this barcode when picking up your order</p>
            <div className="mt-3 flex justify-center space-x-2">
                <button
                    onClick={() => {
                        if (canvasRef.current) {
                            const link = document.createElement('a');
                            link.download = `order-${barcode}.png`;
                            link.href = canvasRef.current.toDataURL();
                            link.click();
                        }
                    }}
                    className="text-xs bg-gray-100 text-gray-700 px-3 py-1 rounded hover:bg-gray-200 transition-colors"
                >
                    💾 Download
                </button>
                <button
                    onClick={async () => {
                        if (canvasRef.current) {
                            try {
                                const blob = await new Promise<Blob>((resolve) => {
                                    canvasRef.current!.toBlob((blob) => resolve(blob!));
                                });
                                await navigator.share({
                                    files: [new File([blob], `order-${barcode}.png`, { type: 'image/png' })],
                                    title: 'Order Barcode',
                                    text: `Order barcode for ${itemName}`
                                });
                            } catch (error) {
                                console.error('Sharing not supported:', error);
                                // Fallback to copying barcode text
                                try {
                                    await navigator.clipboard.writeText(barcode);
                                    alert('Barcode copied to clipboard!');
                                } catch (clipboardError) {
                                    alert('Sharing not supported on this device');
                                }
                            }
                        }
                    }}
                    className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded hover:bg-blue-200 transition-colors"
                >
                    📤 Share
                </button>
            </div>
        </div>
    );
};
export default function RequestPageClient({ requestId }: RequestPageClientProps) {
    const [request, setRequest] = useState<ItemRequest | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string>('');
    const [user, setUser] = useState<UserData | null>(null);
    const [fulfilling, setFulfilling] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    const [copySuccess, setCopySuccess] = useState(false);
    const [fulfilled, setFulfilled] = useState(false);

    // Load user data
    useEffect(() => {
        const savedUserData = localStorage.getItem('userData');
        if (savedUserData) {
            try {
                const userData = JSON.parse(savedUserData);
                setUser(userData);
            } catch (error) {
                console.error('Error parsing user data:', error);
            }
        }
    }, []);

    // Fetch request data
    useEffect(() => {
        if (requestId) {
            fetchRequest(requestId);
        }
    }, [requestId]);

    // Check if current user is the owner of the request
    const isOwner = user && request && (
        user.token.userId.toString() === request.userId ||
        `${user.token.name}@scu.edu` === request.userEmail
    );

    const fetchRequest = async (id: string) => {
        try {
            setLoading(true);
            setError('');

            // Try to get from public endpoint first (no auth required)
            let response;
            try {
                response = await axios.get(`${process.env.NEXT_PUBLIC_REQUESTURL}/publicItemRequests`);
                const publicRequests = response.data;
                const foundRequest = publicRequests.find((req: ItemRequest) => req._id === id);

                if (foundRequest) {
                    setRequest(foundRequest);
                } else {
                    throw new Error('Request not found in public requests');
                }
            } catch (publicError) {
                // If not found in public requests and user is authenticated, try authenticated endpoint
                if (user?.token) {
                    try {
                        response = await axios.post(`${process.env.NEXT_PUBLIC_REQUESTURL}/getItemRequest/${id}`, {
                            userId: user.token.userId,
                            loginToken: user.token.loginToken,
                            sessionId: user.token.sessionId
                        });
                        setRequest(response.data);
                    } catch (authError) {
                        throw new Error('Request not found or access denied');
                    }
                } else {
                    throw new Error('Request not found');
                }
            }
        } catch (err) {
            console.error('Error fetching request:', err);
            if (axios.isAxiosError(err)) {
                if (err.response?.status === 404) {
                    setError('Request not found');
                } else if (err.response?.status === 401) {
                    setError('Access denied - you may need to log in');
                } else {
                    setError(`Failed to load request: ${err.response?.status}`);
                }
            } else {
                setError((err as Error).message || 'Failed to load request');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleFulfillRequest = async () => {
        if (!user?.token) {
            toast.error('Please log in to fulfill requests');
            return;
        }

        if (!request) return;

        // Don't allow fulfilling your own request
        if (isOwner) {
            toast.error('You cannot fulfill your own request');
            return;
        }

        try {
            setFulfilling(true);

            // First, try to place the order using the existing order endpoint
            // We'll parse the description to extract the item details
            const itemName = request.itemName;
            const description = request.description;

            // Create a mock order for the requested item
            // In a real implementation, you'd need more item details
            const orderData = {
                userId: user.token.userId,
                loginToken: user.token.loginToken,
                sessionId: user.token.sessionId,
                cartItems: [{
                    // You'll need to map this to actual menu item structure
                    // This is a simplified version
                    itemName: itemName,
                    description: description,
                    locationId: request.locationId || '13', // Default location
                    price: 0 // Would need actual price
                }],
                locationId: request.locationId || '13',
                total: 0, // Would need actual total
                specialRequest: `Fulfilling request for ${request.userEmail}: ${description}`
            };

            // Place the order on behalf of the requester
            const response = await axios.post(
                `${process.env.NEXT_PUBLIC_REQUESTURL}/fulfillRequest`,
                {
                    ...orderData,
                    requestId: request._id,
                    requesterEmail: request.userEmail,
                    fulfillerId: user.token.userId,
                    fulfillerEmail: `${user.token.name}@scu.edu`
                },
                {
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (response.data.orderId || response.data.success) {
                setFulfilled(true);
                toast.success(`Request fulfilled! Order placed for ${request.userEmail}`);

                // Update the request with barcode if provided
                if (response.data.barcode) {
                    setRequest(prev => prev ? { ...prev, status: 'fulfilled', barcode: response.data.barcode } : null);
                } else {
                    // Refresh the request data
                    await fetchRequest(request._id);
                }
            } else {
                toast.error('Failed to fulfill request. Please try again.');
            }
        } catch (error) {
            console.error('Error fulfilling request:', error);
            if (axios.isAxiosError(error)) {
                if (error.response?.status === 401) {
                    toast.error('Authentication failed. Please log in again.');
                } else if (error.response?.status === 400) {
                    toast.error('Invalid request data. This item may not be available.');
                } else {
                    toast.error(`Failed to fulfill request: ${error.response?.data?.error || error.message}`);
                }
            } else {
                toast.error('Failed to fulfill request. Please try again.');
            }
        } finally {
            setFulfilling(false);
        }
    };

    const getShareUrl = () => {
        if (typeof window !== 'undefined') {
            return window.location.href;
        }
        return '';
    };

    const copyToClipboard = async () => {
        try {
            await navigator.clipboard.writeText(getShareUrl());
            setCopySuccess(true);
            toast.success('Link copied to clipboard!');
            setTimeout(() => setCopySuccess(false), 2000);
        } catch (error) {
            console.error('Failed to copy:', error);
            toast.error('Failed to copy link');
        }
    };

    const shareViaEmail = () => {
        if (!request) return;
        const subject = encodeURIComponent(`Request for ${request.itemName}`);
        const body = encodeURIComponent(`Check out this menu item request: ${getShareUrl()}`);
        window.location.href = `mailto:?subject=${subject}&body=${body}`;
    };

    const shareViaText = () => {
        if (!request) return;
        const text = encodeURIComponent(`Check out this menu item request for ${request.itemName}: ${getShareUrl()}`);
        window.location.href = `sms:?body=${text}`;
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case 'pending':
                return 'bg-yellow-100 text-yellow-800';
            case 'approved':
                return 'bg-green-100 text-green-800';
            case 'rejected':
                return 'bg-red-100 text-red-800';
            case 'fulfilled':
                return 'bg-blue-100 text-blue-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading request...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center max-w-md mx-auto p-6">
                    <div className="text-red-500 text-6xl mb-4">⚠️</div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Request Not Found</h1>
                    <p className="text-gray-600 mb-6">{error}</p>
                    <Link href="/menu" className="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 transition-colors">
                        Browse Menu
                    </Link>
                </div>
            </div>
        );
    }

    if (!request) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-gray-600">Request not found</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white shadow-sm">
                <div className="max-w-4xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center">
                        <div>
                            <Link href="/menu" className="text-indigo-600 hover:text-indigo-800 text-sm font-medium">
                                ← Back to Menu
                            </Link>
                            <h1 className="text-2xl font-bold text-gray-900 mt-1">
                                {isOwner ? 'Your Request' : 'Menu Item Request'}
                            </h1>
                        </div>
                        <button
                            onClick={() => setShowShareModal(true)}
                            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors"
                        >
                            Share Request
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                    {/* Request Header */}
                    <div className="p-6 border-b">
                        <div className="flex justify-between items-start">
                            <div className="flex-1">
                                <h2 className="text-3xl font-bold text-gray-900 mb-2">{request.itemName}</h2>
                                <div className="flex items-center space-x-4 text-sm text-gray-600">
                                    <span>
                                        📍 {request.locationName || (request.locationId && restaurantMapping[request.locationId]) || 'Any Location'}
                                    </span>
                                    <span>📅 {formatDate(request.createdAt)}</span>
                                    <span>👤 {isOwner ? 'Your request' : `Requested by: ${request.userEmail}`}</span>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(request.status)}`}>
                                    {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Request Description */}
                    <div className="p-6 border-b">
                        <h3 className="text-lg font-semibold text-gray-900 mb-3">Request Details</h3>
                        <p className="text-gray-700 leading-relaxed">{request.description}</p>

                        {request.status === 'fulfilled' && (
                            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                                <p className="text-blue-800 text-sm">
                                    ✅ This request has been fulfilled! {isOwner ? 'Your order is ready!' : 'Someone has already ordered this item.'}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Barcode Section - Only show if owner and fulfilled with barcode */}
                    {isOwner && request.status === 'fulfilled' && request.barcode && (
                        <div className="p-6 border-b">
                            <BarcodeDisplay barcode={request.barcode} itemName={request.itemName} />
                        </div>
                    )}

                    {/* Fulfill Section - Only show if not owner */}
                    {!isOwner && (
                        <div className="p-6 border-b">
                            <div className="flex items-center justify-between">
                                <div className="flex-1">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Help Out</h3>
                                    <p className="text-gray-600 text-sm mb-4">
                                        {request.status === 'fulfilled'
                                            ? 'This request has already been fulfilled.'
                                            : `${request.userEmail} is looking for someone to order "${request.itemName}" for them.`
                                        }
                                    </p>
                                </div>
                            </div>

                            {request.status !== 'fulfilled' && (
                                <div className="flex items-center space-x-4">
                                    <button
                                        onClick={handleFulfillRequest}
                                        disabled={fulfilling || !user || fulfilled}
                                        className={`flex items-center space-x-2 px-6 py-3 rounded-md transition-colors font-medium ${user && !fulfilled
                                            ? 'bg-green-600 text-white hover:bg-green-700'
                                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                            }`}
                                    >
                                        <span>🎯</span>
                                        <span>
                                            {fulfilling
                                                ? 'Fulfilling Request...'
                                                : fulfilled
                                                    ? 'Request Fulfilled!'
                                                    : 'Fulfill This Request'
                                            }
                                        </span>
                                    </button>

                                    {user && (
                                        <div className="text-sm text-gray-600">
                                            <p>This will place an order for <strong>{request.userEmail}</strong></p>
                                            <p className="text-xs text-gray-500 mt-1">Youll be charged for this order</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {!user && request.status !== 'fulfilled' && (
                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <p className="text-gray-600 text-center">
                                        <Link href="/login" className="text-indigo-600 hover:text-indigo-800 font-medium">
                                            Log in
                                        </Link> to fulfill this request and help out {request.userEmail}!
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Owner-specific content */}
                    {isOwner && (
                        <div className="p-6 border-b">
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">Your Request Status</h3>
                            {request.status === 'fulfilled' ? (
                                <div className="bg-green-50 p-4 rounded-lg">
                                    <p className="text-green-800 font-medium">🎉 Great news! Someone has fulfilled your request!</p>
                                    <p className="text-green-700 text-sm mt-1">
                                        {request.barcode ? 'Use the barcode above to pick up your order.' : 'Your order should be ready for pickup.'}
                                    </p>
                                </div>
                            ) : (
                                <div className="bg-blue-50 p-4 rounded-lg">
                                    <p className="text-blue-800 font-medium">📋 Your request is still pending</p>
                                    <p className="text-blue-700 text-sm mt-1">Share this link with friends to increase your chances of getting your item!</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Call to Action */}
                <div className="mt-8 bg-green-50 rounded-lg p-6 text-center">
                    {isOwner ? (
                        <>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                {request.status === 'fulfilled' ? 'Request Completed!' : 'Waiting for Help'}
                            </h3>
                            <p className="text-gray-600 mb-4">
                                {request.status === 'fulfilled'
                                    ? `Someone has fulfilled your request for "${request.itemName}". Thanks to your helper!`
                                    : `Share your request link to find someone who can order "${request.itemName}" for you.`
                                }
                            </p>
                        </>
                    ) : (
                        <>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                {request.status === 'fulfilled' ? 'Request Completed!' : 'Help Someone Out!'}
                            </h3>
                            <p className="text-gray-600 mb-4">
                                {request.status === 'fulfilled'
                                    ? `Someone has fulfilled this request for ${request.userEmail}. Thanks to everyone who helped!`
                                    : `${request.userEmail} is hoping someone can order "${request.itemName}" for them. Can you help?`
                                }
                            </p>
                        </>
                    )}
                    <div className="flex justify-center space-x-4">
                        {!isOwner && request.status !== 'fulfilled' && (
                            <button
                                onClick={handleFulfillRequest}
                                disabled={!user || fulfilling || fulfilled}
                                className={`px-6 py-3 rounded-md transition-colors font-medium ${user && !fulfilled
                                    ? 'bg-green-600 text-white hover:bg-green-700'
                                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                    }`}
                            >
                                {fulfilling ? 'Fulfilling...' : fulfilled ? 'Fulfilled!' : 'Fulfill Request'}
                            </button>
                        )}
                        <button
                            onClick={() => setShowShareModal(true)}
                            className="bg-indigo-600 text-white px-6 py-3 rounded-md hover:bg-indigo-700 transition-colors font-medium"
                        >
                            Share Request
                        </button>
                        <Link
                            href="/menu"
                            className="bg-white text-indigo-600 border border-indigo-600 px-6 py-3 rounded-md hover:bg-indigo-50 transition-colors font-medium"
                        >
                            Browse Menu
                        </Link>
                    </div>
                </div>
            </main>

            {/* Share Modal */}
            {showShareModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg max-w-md w-full p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold">Share Request</h3>
                            <button
                                onClick={() => setShowShareModal(false)}
                                className="text-gray-500 hover:text-gray-700"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Share URL:</label>
                                <div className="flex">
                                    <input
                                        type="text"
                                        value={getShareUrl()}
                                        readOnly
                                        className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md bg-gray-50 text-sm"
                                    />
                                    <button
                                        onClick={copyToClipboard}
                                        className={`px-4 py-2 rounded-r-md transition-colors ${copySuccess
                                            ? 'bg-green-600 text-white'
                                            : 'bg-indigo-600 text-white hover:bg-indigo-700'
                                            }`}
                                    >
                                        {copySuccess ? '✓' : 'Copy'}
                                    </button>
                                </div>
                            </div>

                            <div className="flex space-x-2">
                                <button
                                    onClick={shareViaEmail}
                                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                                >
                                    📧 Email
                                </button>
                                <button
                                    onClick={shareViaText}
                                    className="flex-1 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
                                >
                                    💬 Text
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}