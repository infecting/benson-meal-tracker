interface PointsBalanceCardProps {
    balance: number;
}
export const PointsBalanceCard: React.FC<PointsBalanceCardProps> = ({ balance }) => {
    return (
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 rounded-xl shadow-lg">
            <h2 className="text-lg font-medium text-indigo-200">Current Balance</h2>
            <p className="text-4xl font-bold mt-1">
                {balance.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
            </p>
            <p className="text-sm text-indigo-200 mt-2">Available Dining Points</p>
        </div>
    );
};