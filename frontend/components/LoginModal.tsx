// components/LoginMenu.tsx
import React, { useState, useEffect } from 'react';

interface LoginProps {
    onLoginSuccess: (userData: UserData) => void;
    onClose: () => void;
}

interface UserData {
    token: {
        userId: number;
        sessionId: string;
        loginToken: string;
        name: string;
    }
}

const LoginMenu: React.FC<LoginProps> = () => {
    const [username, setUsername] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>('');
    const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
    const [userData, setUserData] = useState<UserData | null>(null);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!username || !password) {
            setError('Please enter your SCU username and password');
            return;
        }

        try {
            setIsLoading(true);
            setError('');

            // Replace with your actual API endpoint
            const response = await fetch(`${process.env.NEXT_PUBLIC_REQUESTURL || 'http://localhost:3000'}/mobileOrder/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    username,
                    password
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || errorData.message || 'Login failed');
            }

            const data: UserData = await response.json();

            // Handle successful login
            setUserData(data);
            setIsLoggedIn(true);

            // Store user data in localStorage for persistence
            localStorage.setItem('userData', JSON.stringify(data));
            localStorage.setItem('username', username);

        } catch (err) {
            setError(err.message || 'Login failed. Please check your SCU credentials.');
        } finally {
            setIsLoading(false);
        }
    };

    // Check for existing login on component mount
    useEffect(() => {
        const storedUserData = localStorage.getItem('userData');
        const storedUsername = localStorage.getItem('username');

        if (storedUserData && storedUsername) {
            setUserData(JSON.parse(storedUserData));
            setUsername(storedUsername);
            setIsLoggedIn(true);
        }
    }, []);

    const handleLogout = () => {
        setIsLoggedIn(false);
        setUserData(null);
        setUsername('');
        setPassword('');

        // Clear localStorage
        localStorage.removeItem('userData');
        localStorage.removeItem('username');
    };

    if (isLoggedIn && userData) {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-8">
                    <div className="text-center">
                        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome Back!</h2>
                        <p className="text-gray-600 mb-6">Successfully logged in to SCU Mobile Order</p>

                        <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
                            <h3 className="font-semibold text-gray-900 mb-2">Account Information:</h3>
                            <p className="text-sm text-gray-600 mb-1">
                                <span className="font-medium">Name:</span> {userData.token.name}
                            </p>
                            <p className="text-sm text-gray-600 mb-1">
                                <span className="font-medium">Email:</span> {username}@scu.edu
                            </p>
                            <p className="text-sm text-gray-600">
                                <span className="font-medium">User ID:</span> {userData.token.userId}
                            </p>
                        </div>

                        <div className="space-y-3">
                            <button
                                onClick={() => {
                                    // Navigate to main app - replace with your navigation logic
                                    window.location.href = '/';
                                }}
                                className="w-full py-3 px-4 rounded-lg font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                            >
                                Continue to App
                            </button>

                            <button
                                onClick={handleLogout}
                                className="w-full py-3 px-4 rounded-lg font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
                <div className="p-8">
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">
                            SCU Mobile Order
                        </h1>
                        <p className="text-gray-600">
                            Sign in with your Santa Clara University credentials
                        </p>
                    </div>

                    {error && (
                        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                            {error}
                        </div>
                    )}

                    <div className="space-y-6">
                        <div>
                            <label htmlFor="username" className="block text-gray-700 text-sm font-medium mb-2">
                                SCU Username
                            </label>
                            <input
                                type="text"
                                id="username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="Enter your SCU username"
                                required
                            />
                            <p className="mt-1 text-xs text-gray-500">Use your SCU username (without @scu.edu)</p>
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-gray-700 text-sm font-medium mb-2">
                                SCU Password
                            </label>
                            <input
                                type="password"
                                id="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="Enter your SCU password"
                                required
                            />
                        </div>

                        <button
                            onClick={handleLogin}
                            disabled={isLoading}
                            className={`w-full py-3 px-4 rounded-lg font-medium ${isLoading
                                ? 'bg-blue-400 cursor-not-allowed'
                                : 'bg-blue-600 hover:bg-blue-700'
                                } text-white transition-colors`}
                        >
                            {isLoading ? (
                                <div className="flex items-center justify-center">
                                    <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                                    Signing in...
                                </div>
                            ) : (
                                'Sign In'
                            )}
                        </button>
                    </div>

                    <div className="mt-8 text-center">
                        <p className="text-gray-500 text-sm">
                            Santa Clara University Mobile Order System
                        </p>
                        <p className="text-gray-400 text-xs mt-2">
                            For password reset, contact SCU IT Support
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginMenu;