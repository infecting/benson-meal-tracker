interface StatCardProps {
    stat: WrappedStat;
}
export const StatCard: React.FC<StatCardProps> = ({ stat }) => {
    return (
        <div className="bg-white p-6 rounded-xl shadow-lg flex flex-col items-center text-center transform hover:scale-105 transition-transform duration-200">
            {stat.icon && <div className="text-indigo-500 mb-3">{stat.icon}</div>}
            <h3 className="text-2xl font-bold text-gray-800">{stat.value}</h3>
            <p className="text-md font-medium text-indigo-600">{stat.title}</p>
            {stat.description && <p className="text-sm text-gray-500 mt-1">{stat.description}</p>}
        </div>
    );
};