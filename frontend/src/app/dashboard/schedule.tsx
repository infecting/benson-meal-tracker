// import { mockOrdersAPI } from "../../../api/orders";
// import { OrderForm } from "../../../components/OrderForm";
// import "../src/app/globals.css"
// export const ScheduleOrderPage: React.FC = () => {
//     const handleOrderSubmit = async (newOrderData: Omit<Order, 'id' | 'status'>) => {
//         // In a real app, you might want to update a list of orders or navigate
//         console.log("New order submitted:", newOrderData);
//         const scheduledOrder = await mockOrdersAPI.scheduleNewOrder(newOrderData);
//         console.log("API Response (mock):", scheduledOrder);
//         // Potentially add to a local state list of orders or trigger a refetch
//     };

//     return (
//         <div className="max-w-2xl mx-auto">
//             <OrderForm onOrderSubmit={handleOrderSubmit} />
//             {/* Future: Display a list of recently scheduled orders here */}
//         </div>
//     );
// };
// export default ScheduleOrderPage;