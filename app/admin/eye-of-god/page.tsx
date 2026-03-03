'use client';

import React, { useEffect, useState } from 'react';
import { getEyeOfGodData } from '@/services/eye-of-god.service';
import Card from '@/components/system/Card';
import { Button } from '@/components/system/Button';
import { CheckCircle, AlertTriangle, Box, MapPin, User, Activity } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import LoadingState from '@/components/system/LoadingState';

function KPICards({ data }: { data: any }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Card className="p-6 flex items-center justify-between border-l-4 border-blue-500">
        <div>
          <p className="text-sm font-medium text-gray-500 mb-1">Références en Stock</p>
          <h3 className="text-2xl font-bold">{data.stocks.length}</h3>
        </div>
        <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full text-blue-600">
          <Box className="w-6 h-6" />
        </div>
      </Card>

      <Card className="p-6 flex items-center justify-between border-l-4 border-amber-500">
        <div>
          <p className="text-sm font-medium text-gray-500 mb-1">Actions En Attente</p>
          <h3 className="text-2xl font-bold">{data.agentActivity.metrics.pending}</h3>
        </div>
        <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-full text-amber-600">
          <User className="w-6 h-6" />
        </div>
      </Card>

      <Card className="p-6 flex items-center justify-between border-l-4 border-red-500">
        <div>
          <p className="text-sm font-medium text-gray-500 mb-1">Anomalies Actives</p>
          <h3 className="text-2xl font-bold">{data.zones.anomaliesCount}</h3>
        </div>
        <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full text-red-600">
          <MapPin className="w-6 h-6" />
        </div>
      </Card>
    </div>
  );
}

function StocksSection({ data }: { data: any }) {
  return (
    <Card className="p-6 shadow-sm xl:col-span-1 border border-border/50">
      <div className="flex items-center gap-2 mb-6 border-b pb-4">
        <Box className="w-5 h-5 text-gray-400" />
        <h2 className="text-lg font-semibold">Stocks Globaux</h2>
      </div>
      {data.stocks.length === 0 ? (
        <p className="text-gray-500 text-sm text-center py-4">Aucune donnée de stock.</p>
      ) : (
        <div className="space-y-4">
          {data.stocks.map((item: any, idx: number) => (
            <div key={idx} className="flex flex-col p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">{item.itemName}</span>
                <Badge variant="outline" className="font-bold">
                  {item.totalQuantity.toLocaleString()} {item.unit}
                </Badge>
              </div>
              <div className="text-xs text-gray-500 flex items-center gap-1.5 flex-wrap">
                <MapPin className="w-3 h-3" />
                {item.zones.length > 0 ? item.zones.join(', ') : 'Aucune zone affectée'}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function AgentActivitySection({ data }: { data: any }) {
  return (
    <Card className="p-6 shadow-sm xl:col-span-1 border border-border/50">
      <div className="flex justify-between items-center mb-6 border-b pb-4">
        <div className="flex items-center gap-2">
          <User className="w-5 h-5 text-gray-400" />
          <h2 className="text-lg font-semibold">Activités Récentes</h2>
        </div>
        {data.agentActivity.metrics.failed > 0 && (
          <Badge variant="destructive" className="animate-pulse">
            {data.agentActivity.metrics.failed} échecs
          </Badge>
        )}
      </div>
      {data.agentActivity.recentActions.length === 0 ? (
        <p className="text-gray-500 text-sm text-center py-4">Aucune activité récente.</p>
      ) : (
        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
          {data.agentActivity.recentActions.map((action: any) => (
            <div key={action.id} className="relative pl-4 border-l-2 border-gray-200 dark:border-gray-700 py-2">
              <div className="absolute -left-[5px] top-3 w-2 h-2 rounded-full bg-blue-500" />
              <div className="flex justify-between mb-1">
                <span className="text-sm font-semibold truncate pr-2" title={action.agentName}>
                  {action.agentName}
                </span>
                <span className="text-xs text-gray-400 shrink-0">
                  {new Date(action.createdAt).toLocaleTimeString()}
                </span>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">{action.actionType}</p>
              <div>
                {action.status === 'PENDING' ? (
                  <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">En Attente</Badge>
                ) : action.status === 'FAILED' ? (
                  <Badge variant="destructive">Échec</Badge>
                ) : action.status === 'APPROVED' ? (
                  <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Approuvé</Badge>
                ) : (
                  <Badge variant="secondary">{action.status}</Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function AnomaliesSection({ data }: { data: any }) {
  return (
    <Card className="p-6 shadow-sm xl:col-span-1 border border-border/50">
      <div className="flex items-center gap-2 mb-6 border-b pb-4">
        <MapPin className="w-5 h-5 text-gray-400" />
        <h2 className="text-lg font-semibold">Anomalies de Terrain</h2>
      </div>
      {data.zones.anomalies.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-green-600">
          <CheckCircle className="w-10 h-10 mb-2 opacity-50" />
          <p className="text-sm font-medium">Aucune anomalie active.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {data.zones.anomalies.map((ano: any) => (
            <div key={ano.id} className="p-3 border border-red-100 bg-red-50 dark:bg-red-950/20 dark:border-red-900/50 rounded-lg">
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-semibold text-sm text-red-700 dark:text-red-400">{ano.title}</h4>
                <Badge variant="outline" className="text-red-500 border-red-200">
                  {ano.level}
                </Badge>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-300 mb-2 line-clamp-2">
                {ano.message || "Aucun détail"}
              </p>
              <div className="text-xs font-mono text-gray-500 flex items-center justify-between">
                <span>Zone: {ano.zone?.name || 'Inconnue'}</span>
                <span>{new Date(ano.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

export default function EyeOfGodDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getEyeOfGodData(); // pass org ID if Multi-Tenant later
      if (res.success) {
        setData(res.data);
      } else {
        setError(res.error || "Erreur de chargement");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 60000); // refresh every minute
    return () => clearInterval(interval);
  }, []);

  if (loading && !data) {
    return <LoadingState message="Chargement de l'Œil de Dieu (Eye of God)..." />;
  }

  if (error) {
    return (
      <div className="p-6 text-red-500 flex flex-col items-center justify-center min-h-[400px]">
        <AlertTriangle className="w-12 h-12 mb-4" />
        <h2 className="text-xl font-bold">Erreur</h2>
        <p>{error}</p>
        <Button onClick={loadData} className="mt-4">Réessayer</Button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 animate-in fade-in zoom-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Activity className="w-8 h-8 text-blue-600" />
            Tableau de Bord « Œil de Dieu »
          </h1>
          <p className="text-gray-500 mt-2">
            Supervision globale en temps réel : Stocks, Activités des Agents, et Suivi des Zones.
          </p>
        </div>
        <Button onClick={loadData} variant="outline" size="sm">
          Rafraîchir
        </Button>
      </div>

      <KPICards data={data} />

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
        <StocksSection data={data} />
        <AgentActivitySection data={data} />
        <AnomaliesSection data={data} />
      </div>
    </div>
  );
}
