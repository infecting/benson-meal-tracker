import React from 'react';

interface UserData {
    token: {
        userId: number;
        sessionId: string;
        loginToken: string;
        name: string;
    }
}

interface UserAccountSectionProps {
    user: UserData | null;
    onLoginClick: () => void;
    onLogoutClick: () => void;
}

const UserAccountSection: React.FC<UserAccountSectionProps> = ({
    user,
    onLoginClick,
    onLogoutClick
}) => {
    return (
        <div className="mb-6 flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-800">Menu</h2>

            {user ? (
                <div className="flex items-center space-x-4">
                    <div className="text-right">
                        <p className="text-sm text-gray-600">Logged in as</p>
                        <p className="font-medium text-gray-900">SCU STUDENT</p>
                    </div>
                    <button
                        onClick={onLogoutClick}
                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm"
                    >
                        Logout
                    </button>
                </div>
            ) : (
                <button
                    onClick={onLoginClick}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm"
                >
                    Login to Order
                </button>
            )}
        </div>
    );
};

export default UserAccountSection;