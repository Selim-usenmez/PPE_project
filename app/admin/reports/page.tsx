"use client";
import { useEffect, useState } from "react";
import AdminSidebar from "../../components/AdminSidebar";
import { AlertTriangle, BarChart3, CheckCircle, XCircle } from "lucide-react";

export default function AdminReportsPage() {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
      // Tu devras créer une route API /api/stats qui fait des prisma.count()
      // Pour l'exemple, je simule :
      setStats({
          incidentsOpen: 5,
          tauxOccupation: 75,
          congesPending: 3,
          incidentsCritical: 2
      });
  }, []);

  if (!stats) return <div className="p-10 text-white">Chargement...</div>;

  return (
    <div className="min-h-screen bg-[#030712] text-gray-200">
      <AdminSidebar />
      <main className="ml-64 p-8">
        <h1 className="text-3xl font-bold text-white mb-8">Rapports & Alertes</h1>

        {/* ALERTES */}
        <div className="mb-8 space-y-4">
            {stats.incidentsCritical > 0 && (
                <div className="bg-red-500/10 border border-red-500/50 p-4 rounded-xl flex items-center gap-4 animate-pulse">
                    <AlertTriangle className="w-6 h-6 text-red-500"/>
                    <div>
                        <h3 className="font-bold text-red-400">Attention requise</h3>
                        <p className="text-sm text-red-200">{stats.incidentsCritical} incidents critiques non résolus sur le matériel.</p>
                    </div>
                </div>
            )}
        </div>

        {/* STATS GRID */}
        <div className="grid grid-cols-3 gap-6">
            <div className="glass-panel p-6 rounded-2xl border border-white/10">
                <p className="text-gray-400 text-xs font-bold uppercase">Incidents Ouverts</p>
                <p className="text-4xl font-bold text-white mt-2">{stats.incidentsOpen}</p>
            </div>
            <div className="glass-panel p-6 rounded-2xl border border-white/10">
                <p className="text-gray-400 text-xs font-bold uppercase">Taux Occupation Salles</p>
                <div className="flex items-end gap-2">
                    <p className="text-4xl font-bold text-blue-400 mt-2">{stats.tauxOccupation}%</p>
                    <div className="h-2 w-full bg-gray-700 rounded-full mb-2 overflow-hidden">
                        <div className="h-full bg-blue-500" style={{width: `${stats.tauxOccupation}%`}}></div>
                    </div>
                </div>
            </div>
        </div>
      </main>
    </div>
  );
}