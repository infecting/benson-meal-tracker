import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import "../src/app/globals.css"
import LoginMenu from './LoginModal';

// Define the types for our menu data
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

interface CartItem {
    itemid: number;
    sectionid: number;
    upsell_upsellid: number;
    upsell_variantid: number;
    options: {
        optionid: number;
        values: {
            valueid: number;
            combo_itemid: number;
            combo_items: any[];
        }[];
    }[];
    meal_ex_applied: boolean;
}

interface ScheduleOptions {
    isScheduled: boolean;
    date: string;
    time: string;
}

interface RequestOptions {
    isRequest: boolean;
    recipientName: string;
    recipientEmail: string;
    message: string;
}

interface SpecialRequest {
    hasRequest: boolean;
    requestText: string;
}

interface MenuProps {
    restaurantId: string;
    onRequestItem: (item: MenuItem) => void;
}

// Custom type for tracking selected options
interface SelectedOptions {
    [optionGroupIndex: number]: OptionVal;
}

// User data interface
interface UserData {
    token: {
        userId: number;
        sessionId: string;
        loginToken: string;
        name: string;
    }
}

// Order status interface
interface OrderStatus {
    orderId: string;
    status: string;
    message?: string;
}

const RestaurantMenu: React.FC<MenuProps> = ({ restaurantId, onRequestItem }) => {
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string>('');
    const [customizingItem, setCustomizingItem] = useState<MenuItem | null>(null);
    const [selectedOptions, setSelectedOptions] = useState<SelectedOptions>({});
    const [showCustomizationModal, setShowCustomizationModal] = useState<boolean>(false);
    const [showLoginModal, setShowLoginModal] = useState<boolean>(false);
    const [showScheduleModal, setShowScheduleModal] = useState<boolean>(false);
    const [user, setUser] = useState<UserData | null>(null);
    const [pendingItem, setPendingItem] = useState<MenuItem | null>(null);
    const [retryCount, setRetryCount] = useState<number>(0);
    const [fetchFailed, setFetchFailed] = useState<boolean>(false);
    const [orderStatus, setOrderStatus] = useState<OrderStatus | null>(null);
    const [isOrdering, setIsOrdering] = useState<boolean>(false);
    const [scheduleOptions, setScheduleOptions] = useState<ScheduleOptions>({
        isScheduled: false,
        date: new Date().toISOString().split('T')[0], // Today's date as default
        time: '12:00'
    });
    const [requestOptions, setRequestOptions] = useState<RequestOptions>({
        isRequest: false,
        recipientName: '',
        recipientEmail: '',
        message: ''
    });
    const [specialRequest, setSpecialRequest] = useState<SpecialRequest>({
        hasRequest: false,
        requestText: ''
    });
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 3000; // 3 seconds

    // Memoize fetchMenuItems to prevent recreation on every render
    const fetchMenuItems = useCallback(async () => {
        try {
            setIsLoading(true);
            // Replace with your actual API endpoint
            const response = await axios.post<MenuItem[]>(
                `http://localhost:3000/getMenu?l=${restaurantId}`,
                {
                    "userId": user?.token.userId,
                    "sessionId": user?.token.sessionId,
                    "loginToken": user?.token.loginToken
                },
                {
                    timeout: 10000, // 10 second timeout
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );

            setMenuItems(response.data);
            setIsLoading(false);
            setFetchFailed(false);
            setRetryCount(0); // Reset retry count on successful fetch
        } catch (err) {
            console.error('Error fetching menu items:', err);

            // Handle different types of errors
            if (axios.isAxiosError(err)) {
                if (err.code === 'ECONNABORTED') {
                    setError('Request timed out. The server might be busy.');
                } else if (!err.response) {
                    setError('Network error. Please check your connection.');
                } else {
                    const status = err.response.status;
                    if (status === 404) {
                        setError('Menu not found. Please check the restaurant ID.');
                    } else if (status >= 500) {
                        setError('Server error. Please try again later.');
                    } else {
                        setError(`Failed to load menu items (Status ${status}).`);
                    }
                }
            } else {
                setError('An unexpected error occurred. Please try again later.');
            }

            setIsLoading(false);
            setFetchFailed(true);

            // Implement retry logic with backoff
            if (retryCount < MAX_RETRIES) {
                console.log(`Retrying... Attempt ${retryCount + 1} of ${MAX_RETRIES}`);
                setTimeout(() => {
                    setRetryCount(prevCount => prevCount + 1);
                }, RETRY_DELAY * (retryCount + 1)); // Exponential backoff
            }
        }
    }, [restaurantId, user, retryCount]);

    useEffect(() => {
        // Try to get user data from localStorage on component mount
        const savedUserData = localStorage.getItem('userData');
        if (savedUserData) {
            try {
                setUser(JSON.parse(savedUserData));
            } catch (e) {
                // Invalid data in localStorage, clear it
                localStorage.removeItem('userData');
            }
        }
    }, []);

    useEffect(() => {
        // Only fetch if we haven't exceeded max retries
        if (retryCount <= MAX_RETRIES) {
            fetchMenuItems();
        } else {
            setError('Failed to load menu after multiple attempts. Please reload the page or try again later.');
        }
    }, [fetchMenuItems, retryCount]);

    const placeOrder = async (item: MenuItem, options?: SelectedOptions) => {
        if (!user) {
            setError('You must be logged in to place an order.');
            setShowLoginModal(true);
            return;
        }

        setIsOrdering(true);
        setOrderStatus(null);
        setError('');

        try {
            // Format the cart items as required
            const cartItems = [
                {
                    itemid: item.id,
                    sectionid: item.sectionid,
                    upsell_upsellid: 0,
                    upsell_variantid: 0,
                    options: options ?
                        Object.entries(options).map(([groupIndex, optionValue]) => ({
                            optionid: optionValue.optId,
                            values: [{
                                valueid: optionValue.valueId,
                                combo_itemid: 0,
                                combo_items: [],
                            }],
                        })) :
                        [],
                    meal_ex_applied: false,
                },
            ];

            // Calculate total in cents (e.g., $3.85 = 385)
            const priceInCents = Math.round(item.price * 100);

            // Prepare order data
            const orderData: any = {
                userId: user.token.userId,
                sessionId: user.token.sessionId,
                loginToken: user.token.loginToken,
                cartItems: cartItems,
                locationId: restaurantId,
                total: priceInCents
            };

            // If this is a scheduled order
            if (scheduleOptions.isScheduled) {
                orderData.scheduled = true;
                orderData.scheduleDate = scheduleOptions.date;
                orderData.scheduleTime = scheduleOptions.time;
            }

            // Add special request if present
            if (specialRequest.hasRequest && specialRequest.requestText.trim()) {
                orderData.specialRequest = specialRequest.requestText.trim();
            }

            // If this is a request for someone else to purchase
            if (requestOptions.isRequest) {
                // Call the request endpoint instead of order
                const requestResponse = await axios.post(
                    'http://localhost:3000/requestItem',
                    {
                        ...orderData,
                        isRequest: true,
                        recipientName: requestOptions.recipientName,
                        recipientEmail: requestOptions.recipientEmail,
                        message: requestOptions.message
                    },
                    {
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    }
                );

                if (requestResponse.data.requestId) {
                    setOrderStatus({
                        orderId: requestResponse.data.requestId,
                        status: 'success',
                        message: `Request #${requestResponse.data.requestId} sent to ${requestOptions.recipientName}!`
                    });

                    // Reset request options after successful request
                    setRequestOptions({
                        isRequest: false,
                        recipientName: '',
                        recipientEmail: '',
                        message: ''
                    });
                } else {
                    setOrderStatus({
                        orderId: '',
                        status: 'error',
                        message: 'Failed to send request. Please try again.'
                    });
                }
            } else {
                // Normal order flow
                const response = await axios.post(
                    'http://localhost:3000/order',
                    orderData,
                    {
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    }
                );

                if (response.data.orderId) {
                    const statusMessage = scheduleOptions.isScheduled
                        ? `Order #${response.data.orderId} scheduled for ${scheduleOptions.date} at ${scheduleOptions.time}!`
                        : `Order #${response.data.orderId} placed successfully!`;

                    setOrderStatus({
                        orderId: response.data.orderId,
                        status: 'success',
                        message: statusMessage
                    });

                    // Only check order status for non-scheduled orders
                    if (!scheduleOptions.isScheduled) {
                        checkOrderStatus(response.data.orderId);
                    }

                    // Reset schedule options after successful order
                    setScheduleOptions({
                        isScheduled: false,
                        date: new Date().toISOString().split('T')[0],
                        time: '12:00'
                    });

                    // Reset special request after successful order
                    setSpecialRequest({
                        hasRequest: false,
                        requestText: ''
                    });
                } else {
                    setOrderStatus({
                        orderId: '',
                        status: 'error',
                        message: 'Failed to place order. Please try again.'
                    });
                }
            }
        } catch (err) {
            console.error('Error placing order or sending request:', err);
            setOrderStatus({
                orderId: '',
                status: 'error',
                message: requestOptions.isRequest
                    ? 'Error sending request. Please try again later.'
                    : 'Error placing order. Please try again later.'
            });

            if (axios.isAxiosError(err) && err.response) {
                setError(`${requestOptions.isRequest ? 'Request' : 'Order'} failed: ${err.response.data.error || 'Unknown error'}`);
            } else {
                setError(`Failed to ${requestOptions.isRequest ? 'send request' : 'place order'}. Network error or server unavailable.`);
            }
        } finally {
            setIsOrdering(false);
        }
    };

    const checkOrderStatus = async (orderId: string) => {
        if (!user) return;

        try {
            const response = await axios.post(
                'http://localhost:3000/orderStatus',
                {
                    userId: user.token.userId,
                    sessionId: user.token.sessionId,
                    loginToken: user.token.loginToken,
                    orderId: orderId
                },
                {
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );

            setOrderStatus(prev => ({
                ...prev!,
                status: response.data.status || 'pending',
                message: `Order #${orderId}: ${response.data.status || 'Status pending'}`
            }));

            // Poll for updates if order is still processing
            if (response.data.status !== 'completed' && response.data.status !== 'cancelled') {
                setTimeout(() => checkOrderStatus(orderId), 5000);
            }
        } catch (err) {
            console.error('Error checking order status:', err);
        }
    };

    const handleRequestItem = (item: MenuItem) => {
        // If user is not logged in, show login modal and save the pending item
        if (!user) {
            setPendingItem(item);
            setShowLoginModal(true);
            return;
        }

        // Set the currently selected item and show schedule modal
        setCustomizingItem(item);
        setShowScheduleModal(true);
    };

    const handleProceedWithOrder = () => {
        if (!customizingItem) return;

        // If sending as a request and missing required fields, don't proceed
        if (requestOptions.isRequest &&
            (!requestOptions.recipientName.trim() || !requestOptions.recipientEmail.trim())) {
            return;
        }

        // If the item has options, open the customization modal
        if (customizingItem.options && customizingItem.options.length > 0 && customizingItem.options.some(group => group.length > 0)) {
            // Initialize selected options with the first option in each group
            const initialOptions: SelectedOptions = {};
            customizingItem.options.forEach((group, index) => {
                if (group.length > 0) {
                    initialOptions[index] = group[0];
                }
            });
            setSelectedOptions(initialOptions);
            setShowScheduleModal(false);
            setShowCustomizationModal(true);
        } else {
            // If no options, directly call the parent handler and place order
            // Just pass the item to onRequestItem if it's a request
            if (requestOptions.isRequest) {
                onRequestItem(customizingItem);
            }
            placeOrder(customizingItem);
            setShowScheduleModal(false);
        }
    };

    const handleOptionSelect = (groupIndex: number, option: OptionVal) => {
        setSelectedOptions(prev => ({
            ...prev,
            [groupIndex]: option
        }));
    };

    const handleSubmitCustomization = () => {
        if (!customizingItem) return;

        // Calculate the total price including options
        const basePrice = customizingItem.price;
        const optionsPrice = Object.values(selectedOptions).reduce((sum, option) => sum + option.price, 0);

        // Create a customized item with the selected options
        const customizedItem: MenuItem = {
            ...customizingItem,
            price: basePrice + optionsPrice,
            name: `${customizingItem.name} (Customized)`,
            description: `${customizingItem.description} | Options: ${Object.values(selectedOptions)
                .map(option => option.name)
                .join(', ')}`,
        };

        // Pass the customized item to the parent handler only if it's a request
        if (requestOptions.isRequest) {
            onRequestItem(customizedItem);
        }

        // Place the order with selected options
        placeOrder(customizingItem, selectedOptions);

        // Close the modal
        setShowCustomizationModal(false);
        setCustomizingItem(null);
    };

    const handleScheduleChange = (field: keyof ScheduleOptions, value: string | boolean) => {
        setScheduleOptions(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleRequestOptionsChange = (field: keyof RequestOptions, value: string | boolean) => {
        setRequestOptions(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleSpecialRequestChange = (field: keyof SpecialRequest, value: string | boolean) => {
        setSpecialRequest(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleLoginSuccess = (userData: UserData) => {
        // Save user data to state and localStorage
        setUser(userData);
        localStorage.setItem('userData', JSON.stringify(userData));

        // Close the login modal
        setShowLoginModal(false);

        // If there's a pending item, process it
        if (pendingItem) {
            handleRequestItem(pendingItem);
            setPendingItem(null);
        }
    };

    const handleLogout = () => {
        // Clear user data from state and localStorage
        setUser(null);
        localStorage.removeItem('userData');
        // Clear any order status
        setOrderStatus(null);
    };

    const handleRetry = () => {
        setError('');
        setFetchFailed(false);
        setRetryCount(0);
    };

    if (isLoading && !fetchFailed) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (error && fetchFailed && retryCount >= MAX_RETRIES) {
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
                        onClick={handleRetry}
                        className="bg-red-100 hover:bg-red-200 text-red-800 font-semibold py-2 px-4 rounded"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full max-w-6xl mx-auto">
            {/* User Account Section */}
            <div className="mb-6 flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-800">Menu</h2>

                {user ? (
                    <div className="flex items-center space-x-4">
                        <div className="text-right">
                            <p className="text-sm text-gray-600">Logged in as</p>
                            <p className="font-medium text-gray-900">SCU STUDENT</p>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm"
                        >
                            Logout
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={() => setShowLoginModal(true)}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm"
                    >
                        Login to Order
                    </button>
                )}
            </div>

            {/* Order Status Banner */}
            {orderStatus && (
                <div className={`mb-6 p-4 rounded-lg ${orderStatus.status === 'success' ? 'bg-green-50 border border-green-200 text-green-700' :
                    orderStatus.status === 'error' ? 'bg-red-50 border border-red-200 text-red-700' :
                        'bg-blue-50 border border-blue-200 text-blue-700'
                    }`}>
                    <div className="flex items-center">
                        {orderStatus.status === 'success' && (
                            <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                        )}
                        {orderStatus.status === 'error' && (
                            <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                        )}
                        {orderStatus.status !== 'success' && orderStatus.status !== 'error' && (
                            <svg className="animate-spin h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        )}
                        <span>{orderStatus.message}</span>
                    </div>
                </div>
            )}

            {/* Error banner that doesn't block the whole UI */}
            {error && !fetchFailed && (
                <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded mb-6 flex justify-between items-center">
                    <div className="flex items-center">
                        <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <span>{error}</span>
                    </div>
                    <button
                        onClick={handleRetry}
                        className="text-sm bg-yellow-100 hover:bg-yellow-200 text-yellow-800 font-semibold py-1 px-3 rounded ml-2"
                    >
                        Retry
                    </button>
                </div>
            )}

            {/* Menu Items Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {menuItems.map((item) => (
                    <motion.div
                        key={item.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-100"
                    >
                        {item.imageUrl && (
                            <div className="h-48 overflow-hidden">
                                <img
                                    src={item.imageUrl}
                                    alt={item.name}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                        e.currentTarget.src = '/placeholder-food.jpg'; // Fallback image
                                        e.currentTarget.onerror = null; // Prevent infinite error loop
                                    }}
                                />
                            </div>
                        )}
                        <div className="p-4">
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="text-lg font-semibold text-gray-900">{item.name}</h3>
                                <span className="font-medium text-blue-600">${item.price.toFixed(2)}</span>
                            </div>
                            <p className="text-gray-600 text-sm mb-4">{item.description}</p>
                            <button
                                onClick={() => handleRequestItem(item)}
                                disabled={!item.available || isOrdering}
                                className={`w-full py-2 px-4 rounded text-sm font-medium transition-colors ${!item.available
                                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                    : isOrdering
                                        ? 'bg-blue-400 text-white cursor-wait'
                                        : 'bg-blue-600 text-white hover:bg-blue-700'
                                    }`}
                            >
                                {!item.available
                                    ? 'Currently Unavailable'
                                    : isOrdering
                                        ? 'Processing...'
                                        : 'Order Item'}
                            </button>
                        </div>
                    </motion.div>
                ))}
            </div>

            {menuItems.length === 0 && !isLoading && !error && (
                <div className="text-center py-12 text-gray-500">
                    No items found.
                </div>
            )}

            {/* Customization Modal */}
            {showCustomizationModal && customizingItem && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
                    >
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xl font-bold">{customizingItem.name}</h3>
                                <button
                                    onClick={() => setShowCustomizationModal(false)}
                                    className="text-gray-500 hover:text-gray-700"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            <div className="mb-4">
                                <p className="text-gray-600">{customizingItem.description}</p>
                                <p className="font-medium text-blue-600 mt-2">Base Price: ${customizingItem.price.toFixed(2)}</p>
                            </div>

                            <div className="mb-6">
                                <h4 className="font-medium text-gray-800 mb-2">Customize Your Order:</h4>

                                {customizingItem.options?.map((optionGroup, groupIndex) => (
                                    <div key={groupIndex} className="mb-4">
                                        <p className="font-medium text-gray-700 mb-2">
                                            {optionGroup.length > 1
                                                ? `Choose one option:`
                                                : `Add option:`
                                            }
                                        </p>
                                        <div className="space-y-2">
                                            {optionGroup.map((option, optionIndex) => (
                                                <div key={optionIndex} className="flex items-center">
                                                    <input
                                                        type="radio"
                                                        id={`option-${groupIndex}-${optionIndex}`}
                                                        name={`option-group-${groupIndex}`}
                                                        checked={selectedOptions[groupIndex]?.name === option.name}
                                                        onChange={() => handleOptionSelect(groupIndex, option)}
                                                        className="mr-2"
                                                    />
                                                    <label htmlFor={`option-${groupIndex}-${optionIndex}`} className="flex-1">
                                                        {option.name}
                                                        {option.price > 0 && ` (+${option.price.toFixed(2)})`}
                                                    </label>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="flex justify-between items-center border-t pt-4">
                                <div>
                                    <p className="text-gray-700">Total Price:</p>
                                    <p className="text-xl font-bold text-blue-600">
                                        ${(
                                            customizingItem.price +
                                            Object.values(selectedOptions).reduce((sum, option) => sum + option.price, 0)
                                        ).toFixed(2)}
                                    </p>
                                </div>
                                <button
                                    onClick={handleSubmitCustomization}
                                    disabled={isOrdering}
                                    className={`py-2 px-6 rounded-lg transition-colors ${isOrdering
                                        ? 'bg-blue-400 text-white cursor-wait'
                                        : 'bg-blue-600 text-white hover:bg-blue-700'
                                        }`}
                                >
                                    {isOrdering ? 'Processing...' : 'Place Order'}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* Schedule Modal */}
            {showScheduleModal && customizingItem && (
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
                                    onClick={() => setShowScheduleModal(false)}
                                    className="text-gray-500 hover:text-gray-700"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            <div className="mb-4">
                                <h4 className="font-medium text-gray-800">{customizingItem.name}</h4>
                                <p className="text-gray-600 text-sm">{customizingItem.description}</p>
                                <p className="font-medium text-blue-600 mt-2">Price: ${customizingItem.price.toFixed(2)}</p>
                            </div>

                            {/* Order Type Selection */}
                            <div className="mb-6 border-t pt-4">
                                <div className="flex items-center space-x-4 mb-4">
                                    <button
                                        onClick={() => {
                                            setRequestOptions(prev => ({ ...prev, isRequest: false }));
                                            setScheduleOptions(prev => ({ ...prev, isScheduled: false }));
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
                                            setRequestOptions(prev => ({ ...prev, isRequest: true }));
                                            setScheduleOptions(prev => ({ ...prev, isScheduled: false }));
                                        }}
                                        className={`px-4 py-2 rounded-lg transition-colors ${requestOptions.isRequest
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                            }`}
                                    >
                                        Request from Someone
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
                                                onChange={(e) => handleScheduleChange('isScheduled', e.target.checked)}
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
                                                        onChange={(e) => handleScheduleChange('date', e.target.value)}
                                                        min={new Date().toISOString().split('T')[0]} // Can't schedule for past dates
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
                                                        onChange={(e) => handleScheduleChange('time', e.target.value)}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Special Request Section */}
                                    <div className="mb-6 border-t pt-4">
                                        <div className="flex items-center mb-3">
                                            <input
                                                type="checkbox"
                                                id="request-toggle"
                                                checked={specialRequest.hasRequest}
                                                onChange={(e) => handleSpecialRequestChange('hasRequest', e.target.checked)}
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
                                                    onChange={(e) => handleSpecialRequestChange('requestText', e.target.value)}
                                                    placeholder="E.g., No onions, extra sauce, etc."
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500 h-20"
                                                />
                                            </div>
                                        )}
                                    </div>
                                </>
                            ) : (
                                /* Request Section - when requesting someone else to order */
                                <div className="mb-6 space-y-4">
                                    <h4 className="font-medium text-gray-800">Request Item from Someone</h4>
                                    <div>
                                        <label htmlFor="recipient-name" className="block text-sm text-gray-700 mb-1">
                                            Recipient Name *
                                        </label>
                                        <input
                                            type="text"
                                            id="recipient-name"
                                            value={requestOptions.recipientName}
                                            onChange={(e) => handleRequestOptionsChange('recipientName', e.target.value)}
                                            placeholder="Enter recipient's name"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="recipient-email" className="block text-sm text-gray-700 mb-1">
                                            Recipient Email *
                                        </label>
                                        <input
                                            type="email"
                                            id="recipient-email"
                                            value={requestOptions.recipientEmail}
                                            onChange={(e) => handleRequestOptionsChange('recipientEmail', e.target.value)}
                                            placeholder="Enter recipient's email"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="request-message" className="block text-sm text-gray-700 mb-1">
                                            Message (Optional)
                                        </label>
                                        <textarea
                                            id="request-message"
                                            value={requestOptions.message}
                                            onChange={(e) => handleRequestOptionsChange('message', e.target.value)}
                                            placeholder="Add a message to the recipient"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500 h-20"
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-between items-center border-t pt-4">
                                <button
                                    onClick={() => setShowScheduleModal(false)}
                                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleProceedWithOrder}
                                    disabled={
                                        isOrdering ||
                                        (requestOptions.isRequest &&
                                            (!requestOptions.recipientName.trim() || !requestOptions.recipientEmail.trim())) ||
                                        (specialRequest.hasRequest && !specialRequest.requestText.trim())
                                    }
                                    className={`py-2 px-6 rounded-lg transition-colors ${isOrdering ||
                                        (requestOptions.isRequest &&
                                            (!requestOptions.recipientName.trim() || !requestOptions.recipientEmail.trim())) ||
                                        (specialRequest.hasRequest && !specialRequest.requestText.trim())
                                        ? 'bg-blue-400 text-white cursor-not-allowed'
                                        : 'bg-blue-600 text-white hover:bg-blue-700'
                                        }`}
                                >
                                    {isOrdering
                                        ? 'Processing...'
                                        : requestOptions.isRequest
                                            ? 'Send Request'
                                            : 'Continue'}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* Login Modal */}
            {showLoginModal && (
                <LoginMenu
                    onLoginSuccess={handleLoginSuccess}
                    onClose={() => {
                        setShowLoginModal(false);
                        setPendingItem(null);
                    }}
                />
            )}

        </div>
    );
};

export default RestaurantMenu;