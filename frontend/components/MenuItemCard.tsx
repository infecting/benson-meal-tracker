import React from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';

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

interface MenuItemCardProps {
    item: MenuItem;
    isOrdering: boolean;
    onOrderClick: (item: MenuItem) => void;
}

const MenuItemCard: React.FC<MenuItemCardProps> = ({
    item,
    isOrdering,
    onOrderClick
}) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-100"
        >
            {item.imageUrl && (
                <div className="h-48 overflow-hidden">
                    <Image
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                            e.currentTarget.src = '/placeholder-food.jpg';
                            e.currentTarget.onerror = null;
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
                    onClick={() => onOrderClick(item)}
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
    );
};

export default MenuItemCard;