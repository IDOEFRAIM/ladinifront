'use client';

import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix pour l'icône qui disparaît avec Webpack/Next.js
const customIcon = L.icon({
    iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
});

function ChangeView({ center }: { center: [number, number] }) {
    const map = useMap();
    useEffect(() => {
        map.setView(center, map.getZoom());
    }, [center, map]);
    return null;
}

export default function OfflineMap({ lat, lng }: { lat: number; lng: number }) {
    return (
        <div style={{ 
            height: '250px', width: '100%', borderRadius: '20px', 
            overflow: 'hidden', marginTop: '15px', border: '1px solid #F1EDE9' 
        }}>
            <MapContainer center={[lat, lng]} zoom={15} style={{ height: '100%', width: '100%' }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <Marker position={[lat, lng]} icon={customIcon} />
                <ChangeView center={[lat, lng]} />
            </MapContainer>
        </div>
    );
}