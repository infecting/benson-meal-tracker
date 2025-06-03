/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import "../src/app/globals.css"
import LoginMenu from './LoginModal';

// Import the new components
import MenuItemCard from './MenuItemCard';
import UserAccountSection from './UserAccountSection';
import OrderStatusBanner from './OrderStatusBanner';
import CustomizationModal from './CustomizationModal';
import ScheduleModal from './ScheduleModal';
import ErrorBanner from './ErrorBanner';
import LoadingSpinner from './LoadingSpinner';

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
        date: new Date().toISOString().split('T')[0],
        time: '12:00'
    });
    const [requestOptions, setRequestOptions] = useState<RequestOptions>({
        isRequest: false,
        message: ''
    });
    const [specialRequest, setSpecialRequest] = useState<SpecialRequest>({
        hasRequest: false,
        requestText: ''
    });

    const MAX_RETRIES = 3;
    const RETRY_DELAY = 3000;

    // Fetch menu items function
    const fetchMenuItems = useCallback(async () => {
        try {
            setIsLoading(true);
            const response = await axios.post<MenuItem[]>(
                `${process.env.NEXT_PUBLIC_REQUESTURL}/getMenu?l=${restaurantId}`,
                {
                    "userId": user?.token.userId,
                    "sessionId": user?.token.sessionId,
                    "loginToken": user?.token.loginToken
                },
                {
                    timeout: 10000,
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (!response.data || response.data.length === 0) {
                setError('No menu items available for this location. The restaurant may be closed or updating their menu.');
                setMenuItems([]);
            } else {
                setMenuItems(response.data);
                setError('');
            }

            setIsLoading(false);
            setFetchFailed(false);
            setRetryCount(0);
        } catch (err) {
            console.error('Error fetching menu items:', err);

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

            if (retryCount < MAX_RETRIES) {
                console.log(`Retrying... Attempt ${retryCount + 1} of ${MAX_RETRIES}`);
                setTimeout(() => {
                    setRetryCount(prevCount => prevCount + 1);
                }, RETRY_DELAY * (retryCount + 1));
            }
        }
    }, [restaurantId, user, retryCount]);

    useEffect(() => {
        const savedUserData = localStorage.getItem('userData');
        if (savedUserData) {
            try {
                setUser(JSON.parse(savedUserData));
            } catch (e) {
                console.error(e)
                localStorage.removeItem('userData');
            }
        }
    }, []);

    useEffect(() => {
        if (retryCount <= MAX_RETRIES) {
            fetchMenuItems();
        } else {
            setError('Failed to load menu after multiple attempts. Please reload the page or try again later.');
        }
    }, [fetchMenuItems, retryCount]);

    const scheduleOrder = async (item: MenuItem, options?: SelectedOptions) => {
        if (!user) {
            setError('You must be logged in to schedule an order.');
            return;
        }

        setIsOrdering(true);
        setOrderStatus(null);
        setError('');

        try {
            // Calculate total price including options
            const basePrice = item.price;
            const optionsPrice = options ? Object.values(options).reduce((sum, option) => sum + option.price, 0) : 0;
            const totalPrice = basePrice + optionsPrice;

            // Prepare items array for the scheduled order
            const items = [{
                itemId: item.id.toString(),
                name: item.name,
                price: totalPrice,
                quantity: 1,
                options: options ? Object.values(options).map(option => ({
                    name: option.name,
                    value: option.name
                })) : []
            }];

            // Create scheduled date/time
            const scheduledDateTime = new Date(`${scheduleOptions.date}T${scheduleOptions.time}`);

            const scheduleData = {
                userId: user.token.userId,
                sessionId: user.token.sessionId,
                loginToken: user.token.loginToken,
                userEmail: `${user.token.name}@scu.edu`, // Assuming SCU email format
                locationId: restaurantId,
                locationName: 'Restaurant', // You might want to pass this as a prop
                items: items,
                scheduledTime: scheduledDateTime.toISOString(),
                notes: specialRequest.hasRequest ? specialRequest.requestText : ''
            };

            const response = await axios.post(
                `${process.env.NEXT_PUBLIC_REQUESTURL}/scheduleOrder`,
                scheduleData,
                {
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (response.data.id) {
                setOrderStatus({
                    orderId: response.data.id,
                    status: 'success',
                    message: `Order scheduled for ${scheduleOptions.date} at ${scheduleOptions.time}!`
                });

                // Reset form
                setScheduleOptions({
                    isScheduled: false,
                    date: new Date().toISOString().split('T')[0],
                    time: '12:00'
                });
                setSpecialRequest({
                    hasRequest: false,
                    requestText: ''
                });
            } else {
                setOrderStatus({
                    orderId: '',
                    status: 'error',
                    message: 'Failed to schedule order. Please try again.'
                });
            }
        } catch (err) {
            console.error('Error scheduling order:', err);
            setOrderStatus({
                orderId: '',
                status: 'error',
                message: 'Error scheduling order. Please try again later.'
            });

            if (axios.isAxiosError(err) && err.response) {
                setError(`Schedule failed: ${err.response.data.error || 'Unknown error'}`);
            } else {
                setError('Failed to schedule order. Network error or server unavailable.');
            }
        } finally {
            setIsOrdering(false);
        }
    };

    const requestItem = async (item: MenuItem, options?: SelectedOptions) => {
        if (!user) {
            setError('You must be logged in to request an item.');
            return;
        }

        setIsOrdering(true);
        setOrderStatus(null);
        setError('');

        try {
            // Create description including options if any
            let description = item.description;
            if (options && Object.keys(options).length > 0) {
                const optionsText = Object.values(options).map(option => option.name).join(', ');
                description += ` | Options: ${optionsText}`;
            }
            if (requestOptions.message.trim()) {
                description += ` | Message: ${requestOptions.message}`;
            }

            const requestData = {
                userId: user.token.userId,
                sessionId: user.token.sessionId,
                loginToken: user.token.loginToken,
                userEmail: `${user.token.name}@scu.edu`, // Assuming SCU email format
                itemName: item.name,
                description: description,
                locationId: restaurantId,
                locationName: 'Restaurant' // You might want to pass this as a prop
            };

            const response = await axios.post(
                `${process.env.NEXT_PUBLIC_REQUESTURL}/requestItem`,
                requestData,
                {
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (response.data.id) {
                // Instead of setting order status, redirect to the request page
                const requestId = response.data.id;

                // Close the modal first
                setShowScheduleModal(false);
                setCustomizingItem(null);

                // Reset form
                setRequestOptions({
                    isRequest: false,
                    message: ''
                });

                // Redirect to the request page
                window.location.href = `/requests/${requestId}`;

            } else {
                setOrderStatus({
                    orderId: '',
                    status: 'error',
                    message: 'Failed to submit item request. Please try again.'
                });
            }
        } catch (err) {
            console.error('Error requesting item:', err);
            setOrderStatus({
                orderId: '',
                status: 'error',
                message: 'Error submitting item request. Please try again later.'
            });

            if (axios.isAxiosError(err) && err.response) {
                setError(`Request failed: ${err.response.data.error || 'Unknown error'}`);
            } else {
                setError('Failed to submit request. Network error or server unavailable.');
            }
        } finally {
            setIsOrdering(false);
        }
    };

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

            const priceInCents = Math.round(item.price * 100);

            const orderData: any = {
                userId: user.token.userId,
                sessionId: user.token.sessionId,
                loginToken: user.token.loginToken,
                cartItems: cartItems,
                locationId: restaurantId,
                total: priceInCents
            };

            if (specialRequest.hasRequest && specialRequest.requestText.trim()) {
                orderData.specialRequest = specialRequest.requestText.trim();
            }

            const response = await axios.post(
                `${process.env.NEXT_PUBLIC_REQUESTURL}/order`,
                orderData,
                {
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (response.data.orderId) {
                setOrderStatus({
                    orderId: response.data.orderId,
                    status: 'success',
                    message: `Order #${response.data.orderId} placed successfully!`
                });

                checkOrderStatus(response.data.orderId);

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
        } catch (err) {
            console.error('Error placing order:', err);
            setOrderStatus({
                orderId: '',
                status: 'error',
                message: 'Error placing order. Please try again later.'
            });

            if (axios.isAxiosError(err) && err.response) {
                setError(`Order failed: ${err.response.data.error || 'Unknown error'}`);
            } else {
                setError('Failed to place order. Network error or server unavailable.');
            }
        } finally {
            setIsOrdering(false);
        }
    };

    const checkOrderStatus = async (orderId: string) => {
        if (!user) return;

        try {
            const response = await axios.post(
                `${process.env.NEXT_PUBLIC_REQUESTURL}/orderStatus`,
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

            if (response.data.status !== 'completed' && response.data.status !== 'cancelled') {
                setTimeout(() => checkOrderStatus(orderId), 5000);
            }
        } catch (err) {
            console.error('Error checking order status:', err);
        }
    };

    const handleRequestItem = (item: MenuItem) => {
        if (!user) {
            setPendingItem(item);
            setShowLoginModal(true);
            return;
        }

        setCustomizingItem(item);
        setShowScheduleModal(true);
    };

    const handleProceedWithOrder = () => {
        if (!customizingItem) return;

        // Check if item has customization options
        if (customizingItem.options && customizingItem.options.length > 0 && customizingItem.options.some(group => group.length > 0)) {
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
            // No customization needed, proceed directly
            if (requestOptions.isRequest) {
                requestItem(customizingItem);
            } else if (scheduleOptions.isScheduled) {
                scheduleOrder(customizingItem);
            } else {
                placeOrder(customizingItem);
            }
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

        if (requestOptions.isRequest) {
            requestItem(customizingItem, selectedOptions);
        } else if (scheduleOptions.isScheduled) {
            scheduleOrder(customizingItem, selectedOptions);
        } else {
            placeOrder(customizingItem, selectedOptions);
        }

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
        setUser(userData);
        localStorage.setItem('userData', JSON.stringify(userData));
        setShowLoginModal(false);

        if (pendingItem) {
            handleRequestItem(pendingItem);
            setPendingItem(null);
        }
    };

    const handleLogout = () => {
        setUser(null);
        localStorage.removeItem('userData');
        setOrderStatus(null);
    };

    const handleRetry = () => {
        setError('');
        setFetchFailed(false);
        setRetryCount(0);
    };

    if (isLoading && !fetchFailed) {
        return <LoadingSpinner />;
    }

    if (error && fetchFailed && retryCount >= MAX_RETRIES) {
        return (
            <ErrorBanner
                error={error}
                fetchFailed={fetchFailed}
                retryCount={retryCount}
                maxRetries={MAX_RETRIES}
                onRetry={handleRetry}
            />
        );
    }

    return (
        <div className="w-full max-w-6xl mx-auto">
            <UserAccountSection
                user={user}
                onLoginClick={() => setShowLoginModal(true)}
                onLogoutClick={handleLogout}
            />

            <OrderStatusBanner orderStatus={orderStatus} />

            <ErrorBanner
                error={error}
                fetchFailed={false}
                retryCount={retryCount}
                maxRetries={MAX_RETRIES}
                onRetry={handleRetry}
            />

            {/* Menu Items Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.isArray(menuItems) && menuItems.map((item) => (
                    <MenuItemCard
                        key={item.id}
                        item={item}
                        isOrdering={isOrdering}
                        onOrderClick={handleRequestItem}
                    />
                ))}
            </div>

            {menuItems.length === 0 && !isLoading && !error && (
                <div className="text-center py-12 text-gray-500">
                    No items found.
                </div>
            )}

            <CustomizationModal
                isOpen={showCustomizationModal}
                item={customizingItem}
                selectedOptions={selectedOptions}
                isOrdering={isOrdering}
                onClose={() => setShowCustomizationModal(false)}
                onOptionSelect={handleOptionSelect}
                onSubmit={handleSubmitCustomization}
            />

            <ScheduleModal
                isOpen={showScheduleModal}
                item={customizingItem}
                scheduleOptions={scheduleOptions}
                requestOptions={requestOptions}
                specialRequest={specialRequest}
                isOrdering={isOrdering}
                onClose={() => setShowScheduleModal(false)}
                onScheduleChange={handleScheduleChange}
                onRequestOptionsChange={handleRequestOptionsChange}
                onSpecialRequestChange={handleSpecialRequestChange}
                onProceed={handleProceedWithOrder}
            />

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