// components/LoginMenu.tsx
import React, { useState } from 'react';
import axios from 'axios';

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

const LoginMenu: React.FC<LoginProps> = ({ onLoginSuccess, onClose }) => {
    const [username, setUsername] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>('');
    const [showForgotPassword, setShowForgotPassword] = useState<boolean>(false);
    const [resetUsername, setResetUsername] = useState<string>('');
    const [resetSent, setResetSent] = useState<boolean>(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!username || !password) {
            setError('Please enter both SCU username and password');
            return;
        }

        try {
            setIsLoading(true);
            setError('');

            // Replace with your actual API endpoint
            const response = await axios.post<UserData>('http://localhost:3000/mobileOrder/login', {
                username,
                password
            });

            // Handle successful login
            onLoginSuccess(response.data);

        } catch (err) {
            setError(err.response?.data?.message || 'Login failed. Please check your SCU credentials.');
        } finally {
            setIsLoading(false);
        }
    };

    const handlePasswordReset = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!resetUsername) {
            setError('Please enter your SCU username');
            return;
        }

        try {
            setIsLoading(true);
            setError('');

            // Replace with your actual password reset API endpoint
            await axios.post('http://localhost:3000/requestPasswordReset', {
                username: resetUsername
            });

            setResetSent(true);

        } catch (err) {
            setError(err.response?.data?.message || 'Failed to send reset link. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
                <div className="p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-gray-900">
                            {showForgotPassword ? 'Reset SCU Password' : 'Login with SCU Credentials'}
                        </h2>
                        <button
                            onClick={onClose}
                            className="text-gray-500 hover:text-gray-700"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {error && (
                        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                            {error}
                        </div>
                    )}

                    {!showForgotPassword ? (
                        // Login Form
                        <form onSubmit={handleLogin}>
                            <div className="mb-4">
                                <label htmlFor="username" className="block text-gray-700 text-sm font-medium mb-2">
                                    SCU Username
                                </label>
                                <input
                                    type="text"
                                    id="username"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Enter your SCU username"
                                    required
                                />
                                <p className="mt-1 text-xs text-gray-500">Use your SCU username without @scu.edu</p>
                            </div>

                            <div className="mb-4">
                                <label htmlFor="password" className="block text-gray-700 text-sm font-medium mb-2">
                                    SCU Password
                                </label>
                                <input
                                    type="password"
                                    id="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Enter your SCU password"
                                    required
                                />
                            </div>

                            <button
                                type="button"
                                onClick={() => setShowForgotPassword(true)}
                                className="text-blue-600 text-sm hover:underline mb-6 block"
                            >
                                Forgot your SCU password?
                            </button>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className={`w-full py-2 px-4 rounded font-medium ${isLoading
                                    ? 'bg-blue-400 cursor-not-allowed'
                                    : 'bg-blue-600 hover:bg-blue-700'
                                    } text-white transition-colors`}
                            >
                                {isLoading ? (
                                    <div className="flex items-center justify-center">
                                        <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                                        Logging in...
                                    </div>
                                ) : (
                                    'Login'
                                )}
                            </button>

                            <div className="mt-4 text-center">
                                <p className="text-gray-600 text-sm">
                                    Use your Santa Clara University login credentials
                                </p>
                            </div>
                        </form>
                    ) : resetSent ? (
                        // Password Reset Success Message
                        <div className="text-center py-4">
                            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">Reset Link Sent</h3>
                            <p className="text-gray-600 mb-4">
                                We&aposve sent a password reset link to your SCU email address. Please check your inbox.
                            </p>
                            <button
                                onClick={() => {
                                    setShowForgotPassword(false);
                                    setResetSent(false);
                                }}
                                className="text-blue-600 hover:underline"
                            >
                                Back to login
                            </button>
                        </div>
                    ) : (
                        // Password Reset Form
                        <form onSubmit={handlePasswordReset}>
                            <div className="mb-4">
                                <label htmlFor="resetUsername" className="block text-gray-700 text-sm font-medium mb-2">
                                    SCU Username
                                </label>
                                <input
                                    type="text"
                                    id="resetUsername"
                                    value={resetUsername}
                                    onChange={(e) => setResetUsername(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Enter your SCU username"
                                    required
                                />
                                <p className="mt-1 text-xs text-gray-500">Enter your SCU username without @scu.edu</p>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className={`w-full py-2 px-4 rounded font-medium ${isLoading
                                    ? 'bg-blue-400 cursor-not-allowed'
                                    : 'bg-blue-600 hover:bg-blue-700'
                                    } text-white transition-colors mb-4`}
                            >
                                {isLoading ? (
                                    <div className="flex items-center justify-center">
                                        <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                                        Sending...
                                    </div>
                                ) : (
                                    'Send Reset Link'
                                )}
                            </button>

                            <button
                                type="button"
                                onClick={() => setShowForgotPassword(false)}
                                className="w-full py-2 px-4 rounded font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                                Back to Login
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LoginMenu;