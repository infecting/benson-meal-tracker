import Image from "next/image";
import React, { useState } from "react";
import img from "../public/dining.png"

// Modified component to accept placeData as a prop with default value
const DiningPlaceMap = ({ placeData = {
    "8": 19,
    "12": 4,
    "1364": 2,
    "Trattoria": 27,
    "Simply Oasis": 19,
    "Spice Market": 11,
    "The Chef's Table": 11,
    "La Parilla": 6,
    "Fire Grill": 1,
} }) => {
    // Calculate total visits for percentage calculation
    const totalVisits = Object.values(placeData).reduce(
        (sum, value) => sum + value,
        0
    );

    // Normalize sizes for visualization
    const getSize = (count) => {
        const minSize = 60;
        const maxSize = 150;
        const percentage = count / totalVisits;
        return minSize + (maxSize - minSize) * percentage;
    };

    // Generate a color based on the location name (for consistency)
    const getColor = (name) => {
        const colors = [
            "bg-red-500",
            "bg-blue-500",
            "bg-green-500",
            "bg-yellow-500",
            "bg-purple-500",
            "bg-pink-500",
            "bg-indigo-500",
            "bg-teal-500",
            "bg-orange-500",
        ];

        // Hash the name to get a consistent index
        const hash =
            name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) %
            colors.length;
        return colors[hash];
    };

    // Tooltip state for hover information
    const [tooltip, setTooltip] = useState<string | null>(null);

    // Sort places by visit count (decreasing)
    const sortedPlaces = Object.entries(placeData).sort((a, b) => b[1] - a[1]);

    return (
        <div className="flex flex-col items-center p-6 bg-gray-50 rounded-xl">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">
                Campus Dining Visits
            </h2>

            {/* Combined Floor Plan and Bubble Map */}
            <div className="relative w-full max-w-2xl bg-white rounded-lg shadow-md p-4">
                {/* Floor Plan as the base layer */}
                <Image
                    src={img}
                    alt="Campus Dining Floor Plan"
                    className="w-full h-auto border border-gray-200 rounded"
                />

                {/* Interactive Bubble Overlay */}
                <div className="absolute inset-0">
                    {/* Place bubbles */}
                    {sortedPlaces.map(([place, count], index) => {
                        const size = getSize(count);
                        const percentage = ((count / totalVisits) * 100).toFixed(1);

                        // Define specific positions mapped to floor plan locations
                        // Adjust these coordinates to match locations on your floor plan
                        const locations = {
                            "Trattoria": { x: 50, y: 30 },
                            "Simply Oasis": { x: 35, y: 45 },
                            "Spice Market": { x: 55, y: 55 },
                            "The Chef's Table": { x: 25, y: 35 },
                            "La Parilla": { x: 25, y: 55 },
                            "Fire Grill": { x: 15, y: 70 },
                            "8": { x: 75, y: 35 },
                            "12": { x: 80, y: 50 },
                            "1364": { x: 70, y: 65 }
                        };

                        // Use mapped location or fallback to grid positions
                        const position = locations[place] || {
                            x: 20 + (index % 3) * 30,
                            y: 20 + Math.floor(index / 3) * 25
                        };

                        return (
                            <div
                                key={place}
                                className={`absolute rounded-full flex items-center justify-center 
                  shadow-lg cursor-pointer transition-all duration-300 
                  hover:shadow-xl ${getColor(place)}`}
                                style={{
                                    width: `${size}px`,
                                    height: `${size}px`,
                                    left: `${position.x}%`,
                                    top: `${position.y}%`,
                                    transform: tooltip === place ? "scale(1.05)" : "scale(1)",
                                    zIndex: tooltip === place ? 10 : 1,
                                }}
                                onMouseEnter={() => setTooltip(place)}
                                onMouseLeave={() => setTooltip(null)}
                            >
                                <div className="text-white text-center p-2">
                                    <div className="font-bold text-sm">
                                        {place.length > 8 ? `${place.substring(0, 7)}...` : place}
                                    </div>
                                    <div className="text-xs">{count}</div>
                                </div>

                                {/* Tooltip */}
                                {tooltip === place && (
                                    <div className="absolute top-full mt-2 bg-gray-800 text-white p-2 rounded text-xs whitespace-nowrap z-20">
                                        <strong>{place}</strong>: {count} visits ({percentage}%)
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Legend */}
                <div className="absolute bottom-2 right-2 bg-white p-2 rounded-md text-xs text-gray-700 border border-gray-200">
                    <div className="font-semibold mb-1">
                        Bubble Size = Visit Frequency
                    </div>
                    <div className="flex items-center">
                        <div className="w-3 h-3 rounded-full bg-green-500 mr-1"></div>
                        <span>Higher % = Larger Bubble</span>
                    </div>
                </div>
            </div>

            {/* Stats table */}
            <div className="mt-6 w-full max-w-md">
                <h3 className="text-lg font-semibold mb-2 text-gray-700">
                    Visit Distribution
                </h3>
                <div className="bg-white rounded-md shadow overflow-hidden">
                    <table className="min-w-full">
                        <thead className="bg-gray-100">
                            <tr>
                                <th className="text-left py-2 px-4 text-sm font-medium text-gray-700">
                                    Location
                                </th>
                                <th className="text-right py-2 px-4 text-sm font-medium text-gray-700">
                                    Visits
                                </th>
                                <th className="text-right py-2 px-4 text-sm font-medium text-gray-700">
                                    Percentage
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {sortedPlaces.map(([place, count]) => {
                                const percentage = ((count / totalVisits) * 100).toFixed(1);
                                return (
                                    <tr key={place} className="hover:bg-gray-50">
                                        <td className="py-2 px-4 text-sm text-gray-700">
                                            {place}
                                        </td>
                                        <td className="py-2 px-4 text-sm text-gray-700 text-right">
                                            {count}
                                        </td>
                                        <td className="py-2 px-4 text-sm text-gray-700 text-right">
                                            {percentage}%
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default DiningPlaceMap;