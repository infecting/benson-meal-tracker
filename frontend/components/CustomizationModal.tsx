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

interface SelectedOptions {
    [optionGroupIndex: number]: OptionVal;
}

interface CustomizationModalProps {
    isOpen: boolean;
    item: MenuItem | null;
    selectedOptions: SelectedOptions;
    isOrdering: boolean;
    onClose: () => void;
    onOptionSelect: (groupIndex: number, option: OptionVal) => void;
    onSubmit: () => void;
}

const CustomizationModal: React.FC<CustomizationModalProps> = ({
    isOpen,
    item,
    selectedOptions,
    isOrdering,
    onClose,
    onOptionSelect,
    onSubmit
}) => {
    if (!isOpen || !item) return null;

    const calculateTotalPrice = () => {
        const basePrice = item.price;
        const optionsPrice = Object.values(selectedOptions).reduce((sum, option) => sum + option.price, 0);
        return basePrice + optionsPrice;
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
                        <h3 className="text-xl font-bold">{item.name}</h3>
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
                        <p className="text-gray-600">{item.description}</p>
                        <p className="font-medium text-blue-600 mt-2">Base Price: ${item.price.toFixed(2)}</p>
                    </div>

                    <div className="mb-6">
                        <h4 className="font-medium text-gray-800 mb-2">Customize Your Order:</h4>

                        {item.options?.map((optionGroup, groupIndex) => (
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
                                                onChange={() => onOptionSelect(groupIndex, option)}
                                                className="mr-2"
                                            />
                                            <label htmlFor={`option-${groupIndex}-${optionIndex}`} className="flex-1">
                                                {option.name}
                                                {option.price > 0 && ` (+$${option.price.toFixed(2)})`}
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
                                ${calculateTotalPrice().toFixed(2)}
                            </p>
                        </div>
                        <button
                            onClick={onSubmit}
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
    );
};

export default CustomizationModal;