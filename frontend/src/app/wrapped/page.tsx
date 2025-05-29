/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useEffect, useState, useCallback } from "react";
import { Button } from "../../../components/Button";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import axios from "axios";
import DiningPlaceMap from "../../../components/Map";

// Update the interface to match the actual data structure
interface DiningWrappedData {
    money: number;
    place: string;
    order: string;
    hours: { [hour: string]: number };
    placeDist: any // This should be place names, not hours
}

// Helper function to format hours data for the histogram
const formatHoursForHistogram = (hoursData: { [hour: string]: number }) => {
    return Object.entries(hoursData).map(([hour, count]) => ({
        hour: parseInt(hour),
        count: count,
        // Format label (convert 24h to 12h format)
        label: parseInt(hour) >= 12
            ? `${parseInt(hour) === 12 ? 12 : parseInt(hour) - 12}:00 PM`
            : `${parseInt(hour) === 0 ? 12 : parseInt(hour)}:00 ${parseInt(hour) === 0 ? 'AM' : 'AM'}`
    })).sort((a, b) => a.hour - b.hour); // Sort by hour for chronological display
};

const WrappedPage: React.FC = () => {
    const [wrappedData, setWrappedData] = useState<DiningWrappedData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [animationComplete, setAnimationComplete] = useState(false);
    const [retryCount, setRetryCount] = useState(0);

    // Function to handle retry logic
    const handleRetry = useCallback(() => {
        if (retryCount < 3) {
            setRetryCount(prev => prev + 1);
            setError(null);
            setLoading(true);
        }
    }, [retryCount]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                setError(null);

                // Get user data from localStorage
                const savedUserData = localStorage.getItem('userData');
                if (!savedUserData) {
                    throw new Error("Please login to SCU first");
                }

                // Parse user data and validate required fields
                let user;
                try {
                    user = JSON.parse(savedUserData);

                } catch (parseError) {
                    console.error("Error parsing user data:", parseError);
                    throw new Error("Invalid user data format. Please login again");
                }

                // Make API call to getWrapped endpoint with timeout and retry
                let attempts = 0;
                const maxAttempts = 3;

                while (attempts < maxAttempts) {
                    console.log(user)
                    try {
                        const response = await axios.post<DiningWrappedData>(
                            `${process.env.NEXT_PUBLIC_REQUESTURL}/getWrapped`,
                            {
                                userId: user.token.userId,
                                sessionId: user.token.sessionId,
                                loginToken: user.token.loginToken,
                            },
                            { timeout: 8000 } // 8 second timeout
                        );

                        // Validate response data
                        if (!response.data || typeof response.data !== 'object') {
                            throw new Error("Invalid response data format");
                        }

                        // Log the actual structure to help debug
                        console.log("Received wrapped data:", response.data);
                        console.log("placeDist structure:", response.data.placeDist);

                        setWrappedData(response.data);
                        break; // Success - exit the retry loop
                    } catch (apiError) {
                        attempts++;

                        // Check if it's the last attempt
                        if (attempts >= maxAttempts) {
                            if (axios.isAxiosError(apiError)) {
                                if (apiError.code === 'ECONNABORTED') {
                                    throw new Error("Connection timeout. Please try again later");
                                } else if (apiError.response) {
                                    // Server responded with an error status
                                    if (apiError.response.status === 401 || apiError.response.status === 403) {
                                        throw new Error("Session expired. Please login again");
                                    } else if (apiError.response.status === 404) {
                                        throw new Error("Dining data service not available");
                                    } else {
                                        throw new Error(`Server error: ${apiError.response.status}`);
                                    }
                                } else {
                                    throw new Error("Network error. Please check your connection");
                                }
                            } else {
                                // Re-throw non-Axios errors on last attempt
                                throw apiError;
                            }
                        }

                        // Wait before retry (exponential backoff)
                        await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
                    }
                }
            } catch (err) {
                console.error("Error fetching wrapped data:", err);
                setError(
                    err instanceof Error
                        ? err.message
                        : "Failed to load your dining wrapped data"
                );
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [retryCount]); // Depend on retryCount to trigger refetching

    // Function to start animation sequence
    const startAnimation = useCallback(() => {
        setAnimationComplete(false);
        setTimeout(() => setAnimationComplete(true), 1500); // Delay to show animation
    }, []);

    // Restart the animation sequence
    const restartAnimation = useCallback(() => {
        setAnimationComplete(false);
        setTimeout(() => setAnimationComplete(true), 100); // Brief delay before restarting
    }, []);

    useEffect(() => {
        if (wrappedData && !animationComplete) {
            startAnimation();
        }
    }, [wrappedData, animationComplete, startAnimation]);

    if (loading) return <div className="text-center p-10">Generating your Dining Wrapped... ✨</div>;

    if (error) {
        return (
            <div className="flex flex-col items-center p-10">
                <div className="text-red-500 text-center font-medium text-lg mb-4">
                    {error}
                </div>
                {retryCount < 3 && (
                    <Button
                        variant="primary"
                        size="md"
                        onClick={handleRetry}
                        className="mt-2"
                    >
                        Try Again
                    </Button>
                )}
                {error.includes("login") && (
                    <Button
                        variant="secondary"
                        size="md"
                        onClick={() => window.location.href = "/login"}
                        className="mt-2"
                    >
                        Go to Login
                    </Button>
                )}
            </div>
        );
    }

    if (!wrappedData) return <div className="text-center p-10">No wrapped data available.</div>;

    // Format the hours data for the histogram
    const hoursData = formatHoursForHistogram(wrappedData.hours);

    // Find most frequent dining hour
    const mostFrequentHour = hoursData.reduce(
        (max, curr) => curr.count > max.count ? curr : max,
        hoursData[0]
    );

    // Format currency amount
    const formattedMoney = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(wrappedData.money);

    return (
        <div className="space-y-8 text-center">
            <h2 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-500 via-pink-500 to-red-500">
                Your Campus Dining Wrapped!
            </h2>
            <p className="text-lg text-gray-600">Here&apos;s a look back at your dining habits.</p>

            {/* Hours Histogram */}
            <div className="bg-white p-6 rounded-xl shadow-lg mt-8">
                <h3 className="text-xl font-semibold text-gray-800 mb-4">Your Dining Hours</h3>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={hoursData} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis
                                dataKey="label"
                                tick={{ fontSize: 12 }}
                                tickMargin={10}
                            />
                            <YAxis
                                label={{
                                    value: 'Number of Visits',
                                    angle: -90,
                                    position: 'insideLeft',
                                    style: { textAnchor: 'middle' }
                                }}
                            />
                            <Tooltip
                                formatter={(value) => [`${value} visits`, 'Frequency']}
                                labelFormatter={(label) => `Time: ${label}`}
                            />
                            <Bar
                                dataKey="count"
                                name="Visits"
                                fill="#8884d8"
                                radius={[4, 4, 0, 0]}
                                isAnimationActive={true}
                                animationDuration={1000}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                {mostFrequentHour && (
                    <p className="text-gray-600 mt-4 text-sm">
                        You most frequently dine at {mostFrequentHour.label}
                    </p>
                )}
            </div>

            {/* Key Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-6">
                {/* Total Spent Card */}
                <div className={`animate-fadeIn ${animationComplete ? 'delay-0' : 'opacity-0'}`}>
                    <div className="bg-white p-6 rounded-xl shadow-lg h-full">
                        <h3 className="text-xl font-semibold text-gray-800 mb-2">Total Spent</h3>
                        <p className="text-2xl font-bold text-purple-600">{formattedMoney}</p>
                        <p className="text-gray-500 text-sm mt-2">on campus dining this year</p>
                    </div>
                </div>

                {/* Favorite Place Card */}
                <div className={`animate-fadeIn ${animationComplete ? 'delay-150' : 'opacity-0'}`}>
                    <div className="bg-white p-6 rounded-xl shadow-lg h-full">
                        <h3 className="text-xl font-semibold text-gray-800 mb-2">Favorite Place</h3>
                        <p className="text-2xl font-bold text-pink-600">{wrappedData.place}</p>
                        <p className="text-gray-500 text-sm mt-2">most visited dining location</p>
                    </div>
                </div>

                {/* Most Ordered Item Card */}
                <div className={`animate-fadeIn ${animationComplete ? 'delay-300' : 'opacity-0'}`}>
                    <div className="bg-white p-6 rounded-xl shadow-lg h-full">
                        <h3 className="text-xl font-semibold text-gray-800 mb-2">Top Order</h3>
                        <p className="text-2xl font-bold text-red-600">{wrappedData.order}</p>
                        <p className="text-gray-500 text-sm mt-2">your most ordered item</p>
                    </div>
                </div>
            </div>

            {/* Replay Button */}
            <div className="mt-10">
                <Button variant="primary" size="lg" onClick={restartAnimation}>
                    Replay Wrapped
                </Button>
            </div>

            <style jsx global>{`
                .animate-fadeIn {
                    animation: fadeIn 0.8s ease-out forwards;
                }
                .delay-0 {
                    animation-delay: 0s;
                }
                .delay-150 {
                    animation-delay: 0.15s;
                }
                .delay-300 {
                    animation-delay: 0.3s;
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>

            {/* Only render the map if placeDist exists and has data */}
            {wrappedData.placeDist && Object.keys(wrappedData.placeDist).length > 0 && (
                <DiningPlaceMap placeData={wrappedData.placeDist} />
            )}
        </div>
    );
};

export default WrappedPage;