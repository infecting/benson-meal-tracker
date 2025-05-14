interface ScheduledOrderItemProps {
    order: Order;
}
export const ScheduledOrderItem: React.FC<ScheduledOrderItemProps> = ({ order }) => {
    const getStatusColor = (status: Order['status']) => {
        switch (status) {
            case 'Pending': return 'bg-yellow-100 text-yellow-800';
            case 'Confirmed': return 'bg-blue-100 text-blue-800';
            case 'Ready': return 'bg-green-100 text-green-800';
            case 'Picked Up': return 'bg-gray-100 text-gray-800';
            case 'Cancelled': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <div className="bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
                <div>
                    <h4 className="font-semibold text-gray-800">{order.itemName} (x{order.quantity})</h4>
                    <p className="text-sm text-gray-600">Pickup: {order.pickupLocation}</p>
                </div>
                <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${getStatusColor(order.status)}`}>
                    {order.status}
                </span>
            </div>
            <p className="text-sm text-gray-500 mt-2">
                Scheduled for: {new Date(order.scheduledTime).toLocaleString()}
            </p>
            {/* Add cancel/modify buttons if needed */}
        </div>
    );
};