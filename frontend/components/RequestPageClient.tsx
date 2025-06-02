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
    status: 'pending' | 'approved' | 'rejected';
    upvotes: number;
    comments: Array<{
        userId: string;
        userEmail: string;
        text: string;
        createdAt: string;
    }>;
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

export default function RequestPageClient({ requestId }: RequestPageClientProps) {
    const [request, setRequest] = useState<ItemRequest | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string>('');
    const [user, setUser] = useState<UserData | null>(null);
    const [upvoting, setUpvoting] = useState(false);
    const [commenting, setCommenting] = useState(false);
    const [newComment, setNewComment] = useState('');
    const [showShareModal, setShowShareModal] = useState(false);
    const [copySuccess, setCopySuccess] = useState(false);

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

    const handleUpvote = async () => {
        if (!user?.token) {
            toast.error('Please log in to upvote requests');
            return;
        }

        if (!request) return;

        try {
            setUpvoting(true);
            await axios.post(`${process.env.NEXT_PUBLIC_REQUESTURL}/upvoteItemRequest/${request._id}`, {
                userId: user.token.userId,
                loginToken: user.token.loginToken,
                sessionId: user.token.sessionId,
                userEmail: `${user.token.name}@scu.edu`
            });

            // Refresh the request data
            await fetchRequest(request._id);
            toast.success('Upvoted successfully!');
        } catch (error) {
            console.error('Error upvoting:', error);
            if (axios.isAxiosError(error) && error.response?.status === 401) {
                toast.error('Authentication failed. Please log in again.');
            } else {
                toast.error('Failed to upvote request');
            }
        } finally {
            setUpvoting(false);
        }
    };

    const handleAddComment = async () => {
        if (!user?.token) {
            toast.error('Please log in to add comments');
            return;
        }

        if (!newComment.trim() || !request) return;

        try {
            setCommenting(true);
            await axios.post(`${process.env.NEXT_PUBLIC_REQUESTURL}/addComment/${request._id}`, {
                userId: user.token.userId,
                loginToken: user.token.loginToken,
                sessionId: user.token.sessionId,
                userEmail: `${user.token.name}@scu.edu`,
                text: newComment.trim()
            });

            setNewComment('');
            // Refresh the request data
            await fetchRequest(request._id);
            toast.success('Comment added successfully!');
        } catch (error) {
            console.error('Error adding comment:', error);
            toast.error('Failed to add comment');
        } finally {
            setCommenting(false);
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
                            <h1 className="text-2xl font-bold text-gray-900 mt-1">Menu Item Request</h1>
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
                                    <span>👤 {request.userEmail}</span>
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
                        <h3 className="text-lg font-semibold text-gray-900 mb-3">Description</h3>
                        <p className="text-gray-700 leading-relaxed">{request.description}</p>
                    </div>

                    {/* Voting Section */}
                    <div className="p-6 border-b">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <button
                                    onClick={handleUpvote}
                                    disabled={upvoting || !user}
                                    className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${user
                                            ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                        }`}
                                >
                                    <span>👍</span>
                                    <span>{upvoting ? 'Upvoting...' : 'Upvote'}</span>
                                </button>
                                <span className="text-lg font-semibold text-gray-700">
                                    {request.upvotes} upvote{request.upvotes !== 1 ? 's' : ''}
                                </span>
                            </div>
                            {!user && (
                                <p className="text-sm text-gray-500">
                                    <Link href="/login" className="text-indigo-600 hover:text-indigo-800">Log in</Link> to upvote and comment
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Comments Section */}
                    <div className="p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                            Comments ({request.comments?.length || 0})
                        </h3>

                        {/* Add Comment (if logged in) */}
                        {user && (
                            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                                <textarea
                                    value={newComment}
                                    onChange={(e) => setNewComment(e.target.value)}
                                    placeholder="Add a comment..."
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                                    rows={3}
                                />
                                <div className="mt-2 flex justify-end">
                                    <button
                                        onClick={handleAddComment}
                                        disabled={commenting || !newComment.trim()}
                                        className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50"
                                    >
                                        {commenting ? 'Adding...' : 'Add Comment'}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Comments List */}
                        <div className="space-y-4">
                            {request.comments && request.comments.length > 0 ? (
                                request.comments.map((comment, index) => (
                                    <div key={index} className="border-l-4 border-indigo-200 pl-4 py-2">
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="font-medium text-gray-900">{comment.userEmail}</span>
                                            <span className="text-sm text-gray-500">{formatDate(comment.createdAt)}</span>
                                        </div>
                                        <p className="text-gray-700">{comment.text}</p>
                                    </div>
                                ))
                            ) : (
                                <p className="text-gray-500 text-center py-8">No comments yet. Be the first to comment!</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Call to Action */}
                <div className="mt-8 bg-indigo-50 rounded-lg p-6 text-center">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Like this idea?</h3>
                    <p className="text-gray-600 mb-4">
                        Help make it happen by upvoting and sharing with others!
                    </p>
                    <div className="flex justify-center space-x-4">
                        <button
                            onClick={() => setShowShareModal(true)}
                            className="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 transition-colors"
                        >
                            Share This Request
                        </button>
                        <Link
                            href="/menu"
                            className="bg-white text-indigo-600 border border-indigo-600 px-6 py-2 rounded-md hover:bg-indigo-50 transition-colors"
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

            <ToastContainer />
        </div>
    );
}