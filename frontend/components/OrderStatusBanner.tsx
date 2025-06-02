import React, { useState } from 'react';

interface OrderStatus {
    orderId?: string;
    requestId?: string;
    requestUrl?: string;
    status: string;
    message?: string;
}

interface OrderStatusBannerProps {
    orderStatus: OrderStatus | null;
}

const OrderStatusBanner: React.FC<OrderStatusBannerProps> = ({ orderStatus }) => {
    const [copied, setCopied] = useState(false);

    if (!orderStatus) return null;

    const getStatusStyles = () => {
        switch (orderStatus.status) {
            case 'success':
                return 'bg-green-50 border border-green-200 text-green-700';
            case 'error':
                return 'bg-red-50 border border-red-200 text-red-700';
            case 'request_generated':
                return 'bg-blue-50 border border-blue-200 text-blue-700';
            default:
                return 'bg-blue-50 border border-blue-200 text-blue-700';
        }
    };

    const getStatusIcon = () => {
        if (orderStatus.status === 'success') {
            return (
                <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
            );
        }

        if (orderStatus.status === 'error') {
            return (
                <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
            );
        }

        if (orderStatus.status === 'request_generated') {
            return (
                <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" />
                </svg>
            );
        }

        return (
            <svg className="animate-spin h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
        );
    };

    const copyToClipboard = async () => {
        if (orderStatus.requestUrl) {
            try {
                await navigator.clipboard.writeText(orderStatus.requestUrl);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            } catch (err) {
                console.error(err)
                // Fallback for older browsers
                const textArea = document.createElement('textarea');
                textArea.value = orderStatus.requestUrl;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            }
        }
    };

    return (
        <div className={`mb-6 p-4 rounded-lg ${getStatusStyles()}`}>
            <div className="flex items-start justify-between">
                <div className="flex items-center flex-1">
                    {getStatusIcon()}
                    <span>{orderStatus.message}</span>
                </div>

                {/* Show copy button and link for request generation */}
                {orderStatus.status === 'request_generated' && orderStatus.requestUrl && (
                    <div className="ml-4 flex-shrink-0">
                        <button
                            onClick={copyToClipboard}
                            className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
                        >
                            {copied ? (
                                <>
                                    <svg className="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                    Copied!
                                </>
                            ) : (
                                <>
                                    <svg className="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z"></path>
                                        <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z"></path>
                                    </svg>
                                    Copy Link
                                </>
                            )}
                        </button>
                    </div>
                )}
            </div>

            {/* Show the actual URL for reference */}
            {orderStatus.status === 'request_generated' && orderStatus.requestUrl && (
                <div className="mt-3 p-2 bg-white bg-opacity-50 rounded border text-sm">
                    <p className="font-medium mb-1">Shareable Link:</p>
                    <p className="font-mono text-xs break-all text-blue-800">{orderStatus.requestUrl}</p>
                </div>
            )}
        </div>
    );
};

export default OrderStatusBanner;