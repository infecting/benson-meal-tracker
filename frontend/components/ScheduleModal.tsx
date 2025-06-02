import React from 'react';
import { motion } from 'framer-motion';

interface MenuItem {
    id: number;
    sectionid: number;
    name: string;
    description: string;
    price: number;
    category: string;
    imageUrl?: string;
    available: boolean;
    options?: OptionVal[][];
}

interface OptionVal {
    price: number;
    name: string;
    optId: number;
    valueId: number;
}

interface ScheduleOptions {
    isScheduled: boolean;
    date: string;
    time: string;
}

interface RequestOptions {
    isRequest: boolean;
    message: string;
}

interface SpecialRequest {
    hasRequest: boolean;
    requestText: string;
}

interface ScheduleModalProps {
    isOpen: boolean;
    item: MenuItem | null;
    scheduleOptions: ScheduleOptions;
    requestOptions: RequestOptions;
    specialRequest?: SpecialRequest; // Make this optional
    isOrdering: boolean;
    onClose: () => void;
    onScheduleChange: (field: keyof ScheduleOptions, value: string | boolean) => void;
    onRequestOptionsChange: (field: keyof RequestOptions, value: string | boolean) => void;
    onSpecialRequestChange?: (field: keyof SpecialRequest, value: string | boolean) => void; // Make this optional
    onProceed: () => void;
}

const ScheduleModal: React.FC<ScheduleModalProps> = ({
    isOpen,
    item,
    scheduleOptions,
    requestOptions,
    specialRequest,
    isOrdering,
    onClose,
    onScheduleChange,
    onRequestOptionsChange,
    onSpecialRequestChange,
    onProceed
}) => {
    if (!isOpen || !item) return null;

    const isFormValid = () => {
        // if (requestOptions.isRequest) {
        //     return requestOptions.recipientName.trim() && requestOptions.recipientEmail.trim();
        // }
        // if (specialRequest?.hasRequest) {
        //     return specialRequest.requestText.trim();
        // }
        return true;
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
            >
                <div className="p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-bold">Order Options</h3>
                        <button
                            onClick={onClose}
                            className="text-gray-500 hover:text-gray-700"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <div className="mb-4">
                        <h4 className="font-medium text-gray-800">{item.name}</h4>
                        <p className="text-gray-600 text-sm">{item.description}</p>
                        <p className="font-medium text-blue-600 mt-2">Price: ${item.price.toFixed(2)}</p>
                    </div>

                    {/* Order Type Selection */}
                    <div className="mb-6 border-t pt-4">
                        <div className="flex items-center space-x-4 mb-4">
                            <button
                                onClick={() => {
                                    onRequestOptionsChange('isRequest', false);
                                    onScheduleChange('isScheduled', false);
                                }}
                                className={`px-4 py-2 rounded-lg transition-colors ${!requestOptions.isRequest
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                            >
                                Place Order
                            </button>
                            <button
                                onClick={() => {
                                    onRequestOptionsChange('isRequest', true);
                                    onScheduleChange('isScheduled', false);
                                }}
                                className={`px-4 py-2 rounded-lg transition-colors ${requestOptions.isRequest
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                            >
                                Generate Request Link
                            </button>
                        </div>
                    </div>

                    {/* Based on selection, show appropriate options */}
                    {!requestOptions.isRequest ? (
                        <>
                            {/* Schedule Section - for normal orders */}
                            <div className="mb-6">
                                <div className="flex items-center mb-3">
                                    <input
                                        type="checkbox"
                                        id="schedule-toggle"
                                        checked={scheduleOptions.isScheduled}
                                        onChange={(e) => onScheduleChange('isScheduled', e.target.checked)}
                                        className="mr-2"
                                    />
                                    <label htmlFor="schedule-toggle" className="font-medium text-gray-800">
                                        Schedule for later
                                    </label>
                                </div>

                                {scheduleOptions.isScheduled && (
                                    <div className="pl-6 space-y-3">
                                        <div>
                                            <label htmlFor="schedule-date" className="block text-sm text-gray-700 mb-1">
                                                Date
                                            </label>
                                            <input
                                                type="date"
                                                id="schedule-date"
                                                value={scheduleOptions.date}
                                                onChange={(e) => onScheduleChange('date', e.target.value)}
                                                min={new Date().toISOString().split('T')[0]}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor="schedule-time" className="block text-sm text-gray-700 mb-1">
                                                Time
                                            </label>
                                            <input
                                                type="time"
                                                id="schedule-time"
                                                value={scheduleOptions.time}
                                                onChange={(e) => onScheduleChange('time', e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Special Request Section */}
                            {specialRequest && onSpecialRequestChange && (
                                <div className="mb-6 border-t pt-4">
                                    <div className="flex items-center mb-3">
                                        <input
                                            type="checkbox"
                                            id="request-toggle"
                                            checked={specialRequest.hasRequest}
                                            onChange={(e) => onSpecialRequestChange('hasRequest', e.target.checked)}
                                            className="mr-2"
                                        />
                                        <label htmlFor="request-toggle" className="font-medium text-gray-800">
                                            Add special request
                                        </label>
                                    </div>

                                    {specialRequest.hasRequest && (
                                        <div className="pl-6">
                                            <label htmlFor="request-text" className="block text-sm text-gray-700 mb-1">
                                                Your request
                                            </label>
                                            <textarea
                                                id="request-text"
                                                value={specialRequest.requestText}
                                                onChange={(e) => onSpecialRequestChange('requestText', e.target.value)}
                                                placeholder="E.g., No onions, extra sauce, etc."
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500 h-20"
                                            />
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    ) : (
                        /* Request Section - when generating a shareable link */
                        <div className="mb-6 space-y-4">
                            <h4 className="font-medium text-gray-800">Generate Request Link</h4>
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <div className="flex items-start">
                                    <svg className="h-5 w-5 text-blue-400 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                    </svg>
                                    <div className="text-sm text-blue-700">
                                        <p className="font-medium mb-1">How it works:</p>
                                        <ul className="list-disc list-inside space-y-1 text-xs">
                                            <li>Well generate a unique link for this item</li>
                                            <li>Share the link with anyone you want</li>
                                            <li>They can click the link to order this item for you</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label htmlFor="request-note" className="block text-sm text-gray-700 mb-1">
                                    Note for the link (Optional)
                                </label>
                                <textarea
                                    id="request-note"
                                    value={requestOptions.message}
                                    onChange={(e) => onRequestOptionsChange('message', e.target.value)}
                                    placeholder="Add a note that will be shown with the request (e.g., 'Please order this for me, thanks!')"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500 h-20"
                                />
                            </div>
                        </div>
                    )}

                    <div className="flex justify-between items-center border-t pt-4">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={onProceed}
                            disabled={isOrdering || !isFormValid()}
                            className={`py-2 px-6 rounded-lg transition-colors ${isOrdering || !isFormValid()
                                ? 'bg-blue-400 text-white cursor-not-allowed'
                                : 'bg-blue-600 text-white hover:bg-blue-700'
                                }`}
                        >
                            {isOrdering
                                ? 'Processing...'
                                : requestOptions.isRequest
                                    ? 'Generate Link'
                                    : 'Continue'}
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default ScheduleModal;