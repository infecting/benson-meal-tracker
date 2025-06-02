import { Metadata } from 'next';
import RequestPageClient from '../../../../components/RequestPageClient';

interface RequestPageProps {
    params: { requestId: string }
}

// Server component - handles metadata
export async function generateMetadata({ params }: RequestPageProps): Promise<Metadata> {
    console.log(params);
    return {
        title: 'Menu Item Request',
        description: 'View and support this menu item request',
        openGraph: {
            title: 'Menu Item Request',
            description: 'Help support this menu item request!',
            type: 'website',
        },
    };
}

// Server component wrapper
export default function RequestPage({ params }: RequestPageProps) {
    return <RequestPageClient requestId={params.requestId} />;
}