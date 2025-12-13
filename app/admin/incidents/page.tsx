"use client";

import { useEffect, useState } from "react";
import AdminSidebar from "../../components/AdminSidebar";

export default function AdminIncidents() {
  const [list, setList] = useState<any[]>([]);
  const fetchIncidents = async () => { const r = await fetch("/api/signalements"); if(r.ok) setList(await r.json()); };
  useEffect(() => { fetchIncidents(); }, []);

  const handleAction = async (id: string, action: string) => {
    if (!confirm("Confirmer cette action ?")) return;
    await fetch(`/api/signalements/${id}`, { method: "PUT", headers: {"Content-Type": "application/json"}, body: JSON.stringify({ action }) });
    fetchIncidents();
  };

  return (
    <div className="min-h-screen text-gray-200">
      <AdminSidebar />
      <main className="ml-64 p-8 animate-fade-in">
        <h1 className="text-3xl font-bold text-white mb-6">🚨 Incidents Signalés</h1>
        
        <div className="glass-panel rounded-2xl overflow-hidden">
            <table className="min-w-full text-left">
              <thead className="bg-red-500/10 border-b border-red-500/20 text-red-200 text-xs uppercase">
                <tr><th className="px-6 py-3">Date</th><th className="px-6 py-3">Matériel</th><th className="px-6 py-3">Problème</th><th className="px-6 py-3">Employé</th><th className="px-6 py-3">Action</th></tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {list.map((item) => (
                  <tr key={item.id_signalement} className={`hover:bg-white/5 transition ${item.statut === 'RESOLU' ? 'opacity-50' : ''}`}>
                    <td className="px-6 py-4 text-sm text-gray-400">{new Date(item.createdAt).toLocaleDateString()}</td>
                    <td className="px-6 py-4"><div className="font-bold text-white">{item.ressource.nom_ressource}</div><div className="text-xs text-gray-500">S/N: {item.ressource.numero_serie}</div></td>
                    <td className="px-6 py-4">
                        <div className="text-gray-200">{item.description}</div>
                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${item.statut === 'EN_ATTENTE' ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-green-500/20 text-green-400 border-green-500/30'}`}>{item.statut}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-400">{item.employe.prenom} {item.employe.nom}</td>
                    <td className="px-6 py-4 space-x-2">
                        {item.statut === 'EN_ATTENTE' && (
                            <>
                                <button onClick={() => handleAction(item.id_signalement, "MAINTENANCE")} className="text-orange-400 hover:text-orange-300 text-xs border border-orange-500/30 px-2 py-1 rounded">🔧 Maint.</button>
                                <button onClick={() => handleAction(item.id_signalement, "RESOUDRE")} className="text-green-400 hover:text-green-300 text-xs border border-green-500/30 px-2 py-1 rounded">✅ Résolu</button>
                            </>
                        )}
                        {item.statut === 'RESOLU' && <span className="text-gray-500 italic text-xs">Clôturé</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
        </div>
      </main>
    </div>
  );
}