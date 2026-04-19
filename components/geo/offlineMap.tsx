'use client';

import dynamic from 'next/dynamic';

const OfflineMapClient = dynamic(() => import('./offlineMap.client'), {
    ssr: false,
    loading: () => <div style={{ height: '250px', width: '100%' }} />,
});

export default function OfflineMap(props: { lat: number; lng: number }) {
    return <OfflineMapClient {...props} />;
}