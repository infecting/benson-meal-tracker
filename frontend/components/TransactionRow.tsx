interface TransactionRowProps {
    transaction: Transaction;
}
export const TransactionRow: React.FC<TransactionRowProps> = ({ transaction }) => {
    const isSpend = transaction.type === 'spend';
    return (
        <tr className="border-b border-gray-200 hover:bg-gray-50">
            <td className="py-3 px-4 text-sm text-gray-700">{new Date(transaction.date).toLocaleDateString()}</td>
            <td className="py-3 px-4 text-sm text-gray-700">{transaction.description}</td>
            <td className="py-3 px-4 text-sm text-gray-700">{transaction.category}</td>
            <td className="py-3 px-4 text-sm text-gray-700">{transaction.location}</td>
            <td className={`py-3 px-4 text-sm font-medium ${isSpend ? 'text-red-600' : 'text-green-600'}`}>
                {isSpend ? '-' : '+'}
                {Math.abs(transaction.amount).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
            </td>
        </tr>
    );
};