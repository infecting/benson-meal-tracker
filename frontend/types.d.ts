interface Transaction {
    id: string;
    date: string;
    description: string;
    amount: number;
    type: "earn" | "spend";
    category: string; // e.g., "Breakfast", "Lunch", "Snacks"
    location: string; // e.g., "Main Cafeteria", "Cafe Bytes"
}

interface PointsData {
    currentBalance: number;
    transactions: Transaction[];
}

interface Order {
    id: string;
    itemName: string;
    quantity: number;
    scheduledTime: string; // ISO string
    pickupLocation: string;
    status: "Pending" | "Confirmed" | "Ready" | "Picked Up" | "Cancelled";
}

interface WrappedStat {
    title: string;
    value: string | number;
    description?: string;
    icon?: React.ReactNode;
}
