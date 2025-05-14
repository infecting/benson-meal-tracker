"use client";

import { CalendarCheck, CreditCard, ShoppingCart, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";

export default function DashboardPage() {
    // In a real app, this might fetch summary data
    const [summary, setSummary] = useState({
        pointsRemaining: 450,
        mealsUsed: 32,
        nextOrderDate: "Today, 6:00 PM",
        transactionsThisWeek: 8
    });

    useEffect(() => {
        // This would be where you fetch data from your API
        setSummary({
            pointsRemaining: 450,
            mealsUsed: 32,
            nextOrderDate: "Today, 6:00 PM",
            transactionsThisWeek: 8
        })
        // For now, we'll just use the mock data above
    }, []);

    return (
        <div className="p-6">
            <h1 className="text-3xl font-bold mb-6">Dashboard</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Points Remaining Card */}
                <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-green-500">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-gray-700">Points Remaining</h2>
                        <CreditCard className="text-green-500" size={24} />
                    </div>
                    <p className="text-3xl font-bold mt-2">{summary.pointsRemaining}</p>
                    <p className="text-sm text-gray-500 mt-1">Points available to spend</p>
                </div>

                {/* Meals Used Card */}
                <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-gray-700">Meals Used</h2>
                        <ShoppingCart className="text-blue-500" size={24} />
                    </div>
                    <p className="text-3xl font-bold mt-2">{summary.mealsUsed}</p>
                    <p className="text-sm text-gray-500 mt-1">This semester</p>
                </div>

                {/* Next Order Card */}
                <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-purple-500">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-gray-700">Next Order</h2>
                        <CalendarCheck className="text-purple-500" size={24} />
                    </div>
                    <p className="text-3xl font-bold mt-2">{summary.nextOrderDate}</p>
                    <p className="text-sm text-gray-500 mt-1">Scheduled pickup</p>
                </div>

                {/* Transactions Card */}
                <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-amber-500">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-gray-700">Transactions</h2>
                        <TrendingUp className="text-amber-500" size={24} />
                    </div>
                    <p className="text-3xl font-bold mt-2">{summary.transactionsThisWeek}</p>
                    <p className="text-sm text-gray-500 mt-1">This week</p>
                </div>
            </div>

            <div className="mt-10 grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Orders Section */}
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h2 className="text-xl font-semibold mb-4">Recent Orders</h2>
                    {/* This would be a list component in a real app */}
                    <div className="space-y-3">
                        <div className="p-3 border border-gray-200 rounded-md flex justify-between">
                            <div>
                                <p className="font-medium">Chicken Bowl</p>
                                <p className="text-sm text-gray-500">Yesterday, 12:30 PM</p>
                            </div>
                            <span className="text-green-600 font-medium">-15 points</span>
                        </div>
                        <div className="p-3 border border-gray-200 rounded-md flex justify-between">
                            <div>
                                <p className="font-medium">Pizza Slice (2)</p>
                                <p className="text-sm text-gray-500">May 11, 6:15 PM</p>
                            </div>
                            <span className="text-green-600 font-medium">-12 points</span>
                        </div>
                        <div className="p-3 border border-gray-200 rounded-md flex justify-between">
                            <div>
                                <p className="font-medium">Salad & Drink Combo</p>
                                <p className="text-sm text-gray-500">May 10, 1:45 PM</p>
                            </div>
                            <span className="text-green-600 font-medium">-18 points</span>
                        </div>
                    </div>
                </div>

                {/* Upcoming Orders Section */}
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h2 className="text-xl font-semibold mb-4">Upcoming Orders</h2>
                    <div className="space-y-3">
                        <div className="p-3 border border-gray-200 rounded-md flex justify-between">
                            <div>
                                <p className="font-medium">Burrito Bowl</p>
                                <p className="text-sm text-gray-500">Today, 6:00 PM</p>
                            </div>
                            <span className="text-blue-600 font-medium">Scheduled</span>
                        </div>
                        <div className="p-3 border border-gray-200 rounded-md flex justify-between">
                            <div>
                                <p className="font-medium">Pasta with Garlic Bread</p>
                                <p className="text-sm text-gray-500">Tomorrow, 12:30 PM</p>
                            </div>
                            <span className="text-blue-600 font-medium">Scheduled</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}