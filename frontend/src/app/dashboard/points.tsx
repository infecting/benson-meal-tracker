// import { useEffect, useState } from "react";
// import { mockPointsAPI } from "../../../api/points";
// import { PointsBalanceCard } from "../../../components/PointsBalanceCard";
// import { TransactionHistoryTable } from "../../../components/TransactionHistoryTable";
// import "../src/app/globals.css"
// export const PointsPage: React.FC = () => {
//     const [pointsData, setPointsData] = useState<PointsData | null>(null);
//     const [loading, setLoading] = useState(true);
//     const [error, setError] = useState<string | null>(null);

//     useEffect(() => {
//         const fetchData = async () => {
//             try {
//                 setLoading(true);
//                 setError(null);
//                 const data = await mockPointsAPI.getPointsData();
//                 setPointsData(data);
//             } catch (err) {
//                 setError("Failed to load points data. Please try again.");
//                 console.error(err);
//             } finally {
//                 setLoading(false);
//             }
//         };
//         fetchData();
//     }, []);

//     if (loading) {
//         return (
//             <div className="flex justify-center items-center h-64">
//                 <svg className="animate-spin h-10 w-10 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
//                     <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
//                     <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
//                 </svg>
//                 <span className="ml-3 text-gray-700">Loading points data...</span>
//             </div>
//         );
//     }
//     if (error) {
//         return <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative" role="alert">{error}</div>;
//     }
//     if (!pointsData) {
//         return <p className="text-gray-600">No data available.</p>;
//     }

//     return (
//         <div className="space-y-6">
//             <PointsBalanceCard balance={pointsData.currentBalance} />
//             <TransactionHistoryTable transactions={pointsData.transactions} />
//         </div>
//     );
// };

// export default PointsPage;