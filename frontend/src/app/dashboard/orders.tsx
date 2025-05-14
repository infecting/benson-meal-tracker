import { useEffect, useState } from "react";
import { mockOrdersAPI } from "../../../api/orders";
import { ScheduledOrderItem } from "../../../components/ScheduledOrderItem";
import "../src/app/globals.css"
export const MyOrdersPage: React.FC = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchOrders = async () => {
            try {
                setLoading(true);
                setError(null);
                const fetchedOrders = await mockOrdersAPI.getScheduledOrders();
                setOrders(fetchedOrders.sort((a, b) => new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime()));
            } catch (err) {
                setError("Failed to load orders.");
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchOrders();
    }, []);

    if (loading) return <div className="text-center p-8">Loading your orders...</div>;
    if (error) return <div className="text-red-500 text-center p-8">{error}</div>;

    return (
        <div className="space-y-6">
            {orders.length === 0 ? (
                <p className="text-gray-600 text-center py-10">You have no scheduled orders.</p>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {orders.map(order => <ScheduledOrderItem key={order.id} order={order} />)}
                </div>
            )}
        </div>
    );
};
export default MyOrdersPage;