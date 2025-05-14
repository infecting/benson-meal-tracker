import { useState } from "react";
import { Button } from "./Button";

interface OrderFormProps {
    onOrderSubmit: (order: Omit<Order, 'id' | 'status'>) => Promise<void>;
}
export const OrderForm: React.FC<OrderFormProps> = ({ onOrderSubmit }) => {
    const [itemName, setItemName] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [pickupLocation, setPickupLocation] = useState('Main Cafeteria');
    const [scheduledTime, setScheduledTime] = useState(''); // Should be datetime-local input
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitMessage, setSubmitMessage] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!itemName || quantity < 1 || !pickupLocation || !scheduledTime) {
            setSubmitMessage("Please fill in all fields.");
            return;
        }
        setIsSubmitting(true);
        setSubmitMessage(null);
        try {
            await onOrderSubmit({ itemName, quantity, pickupLocation, scheduledTime });
            setSubmitMessage("Order submitted successfully!");
            setItemName('');
            setQuantity(1);
            // setScheduledTime(''); // Keep or clear based on preference
        } catch (error) {
            setSubmitMessage("Failed to submit order. Please try again.");
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="bg-white p-6 sm:p-8 rounded-xl shadow-lg space-y-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Create New Order</h3>

            <div>
                <label htmlFor="itemName" className="block text-sm font-medium text-gray-700 mb-1">Item Name</label>
                <input
                    type="text"
                    id="itemName"
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="e.g., Chicken Caesar Salad"
                />
            </div>

            <div>
                <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                <input
                    type="number"
                    id="quantity"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10)))}
                    min="1"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
            </div>

            <div>
                <label htmlFor="pickupLocation" className="block text-sm font-medium text-gray-700 mb-1">Pickup Location</label>
                <select
                    id="pickupLocation"
                    value={pickupLocation}
                    onChange={(e) => setPickupLocation(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                >
                    <option>Main Cafeteria</option>
                    <option>Cafe Bytes</option>
                    <option>Pizza Spot</option>
                    <option>Library Cafe</option>
                </select>
            </div>

            <div>
                <label htmlFor="scheduledTime" className="block text-sm font-medium text-gray-700 mb-1">Scheduled Pickup Time</label>
                <input
                    type="datetime-local"
                    id="scheduledTime"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    min={new Date().toISOString().slice(0, 16)} // Prevent past dates
                />
            </div>

            <Button type="submit" variant="primary" size="lg" isLoading={isSubmitting} className="w-full">
                {isSubmitting ? 'Submitting...' : 'Schedule Order'}
            </Button>

            {submitMessage && (
                <p className={`text-sm mt-2 ${submitMessage.includes("success") ? 'text-green-600' : 'text-red-600'}`}>
                    {submitMessage}
                </p>
            )}
        </form>
    );
};