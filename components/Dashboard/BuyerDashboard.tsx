// components/Dashboard/BuyerDashboard.tsx

import React from 'react';

// Mock de données pour l'Acheteur
const mockBuyerData = {
    pendingOrders: 3,
    marketTrends: [
        { product: 'Mangues', trend: '+5%', status: 'rising' },
        { product: 'Maïs', trend: '-2%', status: 'falling' },
    ],
    lastOrder: 'Commande #AC-2025001'
};

export default function BuyerDashboard() {
    return (
        <div style={{ padding: '20px' }}>
            <h1 style={{ color: '#0070f3', marginBottom: '20px' }}>👋 Bienvenue, Acheteur !</h1>
            
            <p style={{ marginBottom: '30px', fontSize: '1.1em' }}>
                Accédez rapidement à vos commandes et aux tendances du marché.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                
                {/* Carte 1 : Commandes en attente */}
                <div style={cardStyle}>
                    <h3 style={cardTitleStyle}>🛒 Commandes en cours</h3>
                    <p style={cardValueStyle}>{mockBuyerData.pendingOrders}</p>
                    <a href="/checkout" style={linkStyle}>Voir le suivi des commandes</a>
                </div>

                {/* Carte 2 : Tendances du marché */}
                <div style={cardStyle}>
                    <h3 style={cardTitleStyle}>📈 Tendances Populaires</h3>
                    <ul>
                        {mockBuyerData.marketTrends.map((trend, index) => (
                            <li key={index} style={{ marginBottom: '5px' }}>
                                **{trend.product}** : <span style={{ color: trend.status === 'rising' ? 'green' : 'red', fontWeight: 'bold' }}>{trend.trend}</span>
                            </li>
                        ))}
                    </ul>
                    <a href="/market" style={linkStyle}>Explorer le marché</a>
                </div>

                {/* Carte 3 : Dernière activité */}
                <div style={cardStyle}>
                    <h3 style={cardTitleStyle}>⌛ Dernière Commande</h3>
                    <p style={cardValueStyle}>{mockBuyerData.lastOrder}</p>
                    <a href="/claims" style={linkStyle}>Faire une réclamation ?</a>
                </div>

            </div>
        </div>
    );
}

// Styles simples
const cardStyle: React.CSSProperties = {
    backgroundColor: '#ffffff',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    borderLeft: '5px solid #0070f3'
};

const cardTitleStyle: React.CSSProperties = {
    fontSize: '1.2em',
    marginBottom: '10px',
    color: '#333'
};

const cardValueStyle: React.CSSProperties = {
    fontSize: '2em',
    fontWeight: 'bold',
    marginBottom: '10px'
};

const linkStyle: React.CSSProperties = {
    color: '#0070f3',
    textDecoration: 'none',
    fontSize: '0.9em'
};