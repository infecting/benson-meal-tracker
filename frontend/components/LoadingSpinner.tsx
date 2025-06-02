import React from 'react';

interface LoadingSpinnerProps {
    message?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
    message = "Loading..."
}) => {
    return (
        <div className="flex justify-center items-center h-64">
            <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
                <p className="mt-4 text-gray-600">{message}</p>
            </div>
        </div>
    );
};

export default LoadingSpinner;