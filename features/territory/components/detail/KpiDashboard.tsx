'use client';

import { FaUsers, FaShoppingCart, FaTractor, FaChartLine } from 'react-icons/fa';
import KpiCard from '@/features/territory/components/KpiCard';
import { traceAction } from '@/features/territory/services/agri-persister';

export function KpiDashboard({ displayCounts, onOpenDiagnostic, traceAction }: any) {
  
  // 1. Définition de la structure des KPIs
  const kpiConfigs = [
    {
      id: 'producers',
      label: "Producteurs",
      value: displayCounts.producers,
      icon: <FaUsers />,
      color: "blue",
      trend: 5,
    },
    {
      id: 'orders',
      label: "Volume Commandes",
      value: displayCounts.orders,
      icon: <FaShoppingCart />,
      color: "green",
      trend: 12,
    },
    {
      id: 'farms',
      label: "Fermes Actives",
      value: displayCounts.farms,
      icon: <FaTractor />,
      color: "amber",
      trend: 2,
    },
    {
      id: 'score',
      label: "Score Potentiel",
      value: "88/100",
      icon: <FaChartLine />,
      color: "indigo",
      trend: 0,
      onClick: onOpenDiagnostic, // Action spécifique pour le score
    },
  ];

  // 2. Rendu via itération
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
      {kpiConfigs.map((kpi) => (
        <div
          key={kpi.id}
          style={{ cursor: 'pointer' }}
          onClick={() => {
            if (kpi.onClick) kpi.onClick();
            traceAction({ action: 'kpi_click', meta: { kpi: kpi.id } });
          }}
        >
          <KpiCard 
            icon={kpi.icon} 
            label={kpi.label} 
            value={kpi.value} 
            color={kpi.color} 
            trend={kpi.trend} 
          />
        </div>
      ))}
    </div>
  );
}
