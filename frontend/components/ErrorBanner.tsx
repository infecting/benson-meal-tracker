import React from 'react';

interface ErrorBannerProps {
    error: string;
    fetchFailed: boolean;
    retryCount: number;
    maxRetries: number;
    onRetry: () => void;
}

const ErrorBanner: React.FC<ErrorBannerProps> = ({
    error,
    fetchFailed,
    retryCount,
    maxRetries,
    onRetry
}) => {
    if (!error) return null;

    // If this is a critical error that blocks the whole UI
    if (fetchFailed && retryCount >= maxRetries) {
        return (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
                <div className="flex items-center">
                    <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <div>
                        <p className="font-bold">Error loading menu</p>
                        <p>{error}</p>
                    </div>
                </div>
                <div className="mt-3">
                    <button
                        onClick={onRetry}
                        className="bg-red-100 hover:bg-red-200 text-red-800 font-semibold py-2 px-4 rounded"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    // Non-critical error banner that doesn't block the UI
    return (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded mb-6 flex justify-between items-center">
            <div className="flex items-center">
                <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span>{error}</span>
            </div>
            <button
                onClick={onRetry}
                className="text-sm bg-yellow-100 hover:bg-yellow-200 text-yellow-800 font-semibold py-1 px-3 rounded ml-2"
            >
                Retry
            </button>
        </div>
    );
};

export default ErrorBanner;