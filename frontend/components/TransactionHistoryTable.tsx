import { TransactionRow } from "./TransactionRow";

interface TransactionHistoryTableProps {
    transactions: Transaction[];
}
export const TransactionHistoryTable: React.FC<TransactionHistoryTableProps> = ({ transactions }) => {
    if (transactions.length === 0) {
        return <p className="text-gray-600 mt-4">No transactions yet.</p>;
    }
    return (
        <div className="bg-white p-6 rounded-xl shadow-lg mt-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Transaction History</h3>
            <div className="overflow-x-auto">
                <table className="w-full min-w-max">
                    <thead>
                        <tr className="bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            <th className="py-3 px-4">Date</th>
                            <th className="py-3 px-4">Description</th>
                            <th className="py-3 px-4">Category</th>
                            <th className="py-3 px-4">Location</th>
                            <th className="py-3 px-4">Amount</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {transactions.map((tx) => (
                            <TransactionRow key={tx.id} transaction={tx} />
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};