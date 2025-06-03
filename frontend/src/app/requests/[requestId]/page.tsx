import { Metadata } from 'next';
import RequestPageClient from '../../../../components/RequestPageClient';

interface RequestPageProps {
    params: Promise<{ requestId: string }>
}

// Server component - handles metadata
export async function generateMetadata({ params }: RequestPageProps): Promise<Metadata> {
    const { requestId } = await params;
    console.log({ requestId });

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
export default async function RequestPage({ params }: RequestPageProps) {
    const { requestId } = await params;
    return <RequestPageClient requestId={requestId} />;
}