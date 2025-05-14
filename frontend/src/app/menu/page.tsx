"use client";
// pages/menu.tsx
import React, { useState } from 'react';
import Head from 'next/head';
import RestaurantMenu from '../../../components/Menu';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

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

// Mock types from the component
interface MenuItem {
    id: string;
    name: string;
    description: string;
    price: number;
    category: string;
    imageUrl?: string;
    available: boolean;
}

const MenuPage: React.FC = () => {
    const [requestedItems, setRequestedItems] = useState<MenuItem[]>([]);
    const [selectedRestaurantId, setSelectedRestaurantId] = useState<string>("6"); // Default to Spice Market

    const handleRequestItem = (item: MenuItem) => {
        // Add the requested item to our list
        setRequestedItems(prev => [...prev, item]);
        // Show a toast notification
        toast.success(`Added ${item.name} to your requests!`, {
            position: "bottom-right",
            autoClose: 3000
        });
        // Here you could also make an API call to save the request
        // Example: saveItemRequest(item.id, userId, etc)
    };

    const handleRestaurantChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newRestaurantId = e.target.value;
        setSelectedRestaurantId(newRestaurantId);
        setRequestedItems([]); // Clear the cart when switching restaurants
        toast.info(`Switched to ${restaurantMapping[newRestaurantId]}`);
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <Head>
                <title>{restaurantMapping[selectedRestaurantId]} Menu</title>
                <meta name="description" content={`Browse ${restaurantMapping[selectedRestaurantId]}'s delicious menu options`} />
            </Head>
            <header className="bg-white shadow-sm">
                <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center">
                        <h1 className="text-2xl font-bold text-gray-900">
                            {restaurantMapping[selectedRestaurantId]}
                        </h1>

                        {/* Restaurant Selector */}
                        <div className="w-64">
                            <label htmlFor="restaurant-select" className="block text-sm font-medium text-gray-700 mb-1">
                                Select Restaurant
                            </label>
                            <select
                                id="restaurant-select"
                                className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                value={selectedRestaurantId}
                                onChange={handleRestaurantChange}
                            >
                                {Object.entries(restaurantMapping).map(([id, name]) => (
                                    <option key={id} value={id}>
                                        {name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
            </header>
            <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                {/* Pass the selected restaurant ID to the menu component */}
                <RestaurantMenu
                    restaurantId={selectedRestaurantId}
                    onRequestItem={handleRequestItem}
                />

                {/* Requested Items Summary */}
                {requestedItems.length > 0 && (
                    <div className="mt-10 bg-white p-6 rounded-lg shadow-md">
                        <h2 className="text-xl font-semibold mb-4">Your Order from {restaurantMapping[selectedRestaurantId]}</h2>
                        <ul className="divide-y divide-gray-200">
                            {requestedItems.map((item, index) => (
                                <li key={`${item.id}-${index}`} className="py-4 flex justify-between">
                                    <div>
                                        <p className="font-medium">{item.name}</p>
                                        <p className="text-sm text-gray-600">{item.description}</p>
                                    </div>
                                    <p className="font-medium">${item.price.toFixed(2)}</p>
                                </li>
                            ))}
                        </ul>
                        <div className="mt-6 flex justify-between items-center">
                            <p className="text-lg font-semibold">Total</p>
                            <p className="text-lg font-semibold">
                                ${requestedItems.reduce((sum, item) => sum + item.price, 0).toFixed(2)}
                            </p>
                        </div>
                        <button
                            className="mt-4 w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors"
                            onClick={() => {
                                toast.info(`Order submitted to ${restaurantMapping[selectedRestaurantId]}! The restaurant will prepare your items.`);
                                setRequestedItems([]);
                            }}
                        >
                            Submit Order
                        </button>
                    </div>
                )}
            </main>
            {/* Toast Container for notifications */}
            <ToastContainer />
        </div>
    );
};

export default MenuPage;