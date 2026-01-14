"use client";

import { useEffect, useState } from "react";
import AdminSidebar from "../../components/AdminSidebar";
import { toast } from "sonner";
// 👇 IMPORTS LUCIDE
import { 
  AlertTriangle, Wrench, CheckCircle2, Clock, Search, 
  Archive, User, Microscope, Loader2, Filter 
} from "lucide-react";

export default function AdminIncidents() {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // Charger les incidents
  const fetchIncidents = async () => {
    try {
      const r = await fetch("/api/signalements");
      if (r.ok) {
        setList(await r.json());
      }
    } catch (e) {
      toast.error("Erreur chargement");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchIncidents(); }, []);

  // Gérer les actions (Maintenance / Résoudre)
  const handleAction = async (id: string, action: string) => {
    const actionText = action === "MAINTENANCE" ? "passer en maintenance" : "marquer comme résolu";
    if (!confirm(`Voulez-vous ${actionText} cet équipement ?`)) return;

    setActionLoading(id);
    try {
      const res = await fetch(`/api/signalements/${id}`, { 
        method: "PUT", 
        headers: {"Content-Type": "application/json"}, 
        body: JSON.stringify({ action }) 
      });

      if (res.ok) {
        toast.success(action === "MAINTENANCE" ? "Équipement en maintenance 🔧" : "Incident résolu ✅");
        fetchIncidents();
      } else {
        toast.error("Erreur lors de l'action");
      }
    } catch (e) {
      toast.error("Erreur serveur");
    } finally {
      setActionLoading(null);
    }
  };

  // Filtrage simple
  const filteredList = list.filter(item => 
    item.ressource.nom_ressource.toLowerCase().includes(search.toLowerCase()) ||
    item.employe.nom.toLowerCase().includes(search.toLowerCase())
  );

  // Stats calculées à la volée
  const stats = {
    total: list.length,
    attente: list.filter(i => i.statut === 'EN_ATTENTE').length,
    resolu: list.filter(i => i.statut === 'RESOLU').length
  };

  return (
    <div className="min-h-screen text-gray-200 bg-[#030712]">
      <AdminSidebar />
      <main className="ml-64 p-8 animate-fade-in">
        
        {/* EN-TÊTE & STATS */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-6">
            <div>
                <h1 className="text-3xl font-bold text-white flex items-center gap-3 mb-2">
                    <span className="p-2 bg-red-500/10 rounded-lg text-red-500 border border-red-500/20">
                        <AlertTriangle className="w-8 h-8" />
                    </span>
                    Incidents & Pannes
                </h1>
                <div className="flex gap-4 text-sm">
                    <span className="text-gray-400">Total: <b className="text-white">{stats.total}</b></span>
                    <span className="text-red-400">⚠️ En attente: <b>{stats.attente}</b></span>
                    <span className="text-green-400">✅ Résolus: <b>{stats.resolu}</b></span>
                </div>
            </div>

            {/* BARRE RECHERCHE */}
            <div className="relative w-full md:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input 
                    type="text" 
                    placeholder="Rechercher équipement..." 
                    className="w-full bg-[#0f172a] border border-white/10 rounded-xl py-2.5 pl-9 pr-4 text-sm focus:border-red-500 outline-none text-gray-300 placeholder:text-gray-600 transition-all"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>
        </div>
        
        {/* TABLEAU */}
        <div className="glass-panel rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <Loader2 className="w-10 h-10 text-red-500 animate-spin mb-3" />
                    <p className="text-gray-500 font-mono text-sm">Chargement des signalements...</p>
                </div>
            ) : filteredList.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                    <CheckCircle2 className="w-16 h-16 mb-4 opacity-20 text-green-500" />
                    <p className="text-lg">Aucun incident à afficher.</p>
                </div>
            ) : (
                <table className="min-w-full text-left">
                  <thead className="bg-white/5 border-b border-white/10 text-gray-400 text-xs uppercase font-semibold">
                    <tr>
                        <th className="px-6 py-4">Date & Heure</th>
                        <th className="px-6 py-4">Matériel Concerné</th>
                        <th className="px-6 py-4">Problème Signalé</th>
                        <th className="px-6 py-4">Signalé par</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredList.map((item) => {
                      const isResolved = item.statut === 'RESOLU';
                      const isMaintenance = item.statut === 'MAINTENANCE' || item.statut === 'EN_MAINTENANCE'; // Gérer les deux cas au cas où

                      return (
                        <tr key={item.id_signalement} className={`hover:bg-white/5 transition group ${isResolved ? 'opacity-50 grayscale-[0.5]' : ''}`}>
                            
                            {/* DATE */}
                            <td className="px-6 py-4 text-xs text-gray-500 font-mono">
                                <div className="flex items-center gap-2">
                                    <Clock className="w-3 h-3" />
                                    {new Date(item.createdAt).toLocaleDateString()}
                                </div>
                            </td>

                            {/* MATÉRIEL */}
                            <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${isResolved ? 'bg-slate-800 border-white/10 text-gray-500' : 'bg-red-500/10 border-red-500/20 text-red-500'}`}>
                                        <Microscope className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <div className="font-bold text-white text-sm">{item.ressource.nom_ressource}</div>
                                        <div className="text-[10px] text-gray-500 uppercase tracking-wider font-mono">
                                            S/N: {item.ressource.numero_serie || "N/A"}
                                        </div>
                                    </div>
                                </div>
                            </td>

                            {/* DESCRIPTION & STATUT */}
                            <td className="px-6 py-4">
                                <div className="text-gray-300 text-sm mb-2 max-w-xs">{item.description}</div>
                                {item.statut === 'EN_ATTENTE' && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border uppercase bg-red-500/10 text-red-400 border-red-500/20">
                                        <AlertTriangle className="w-3 h-3" /> À Traiter
                                    </span>
                                )}
                                {isMaintenance && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border uppercase bg-orange-500/10 text-orange-400 border-orange-500/20">
                                        <Wrench className="w-3 h-3" /> En Maintenance
                                    </span>
                                )}
                                {isResolved && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border uppercase bg-green-500/10 text-green-400 border-green-500/20">
                                        <CheckCircle2 className="w-3 h-3" /> Résolu
                                    </span>
                                )}
                            </td>

                            {/* EMPLOYÉ */}
                            <td className="px-6 py-4">
                                <div className="flex items-center gap-2 text-sm text-gray-400">
                                    <User className="w-4 h-4" />
                                    {item.employe.prenom} {item.employe.nom}
                                </div>
                            </td>

                            {/* ACTIONS */}
                            <td className="px-6 py-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                    {!isResolved && (
                                        <>
                                            <button 
                                                onClick={() => handleAction(item.id_signalement, "MAINTENANCE")} 
                                                disabled={actionLoading === item.id_signalement}
                                                className="p-2 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400 hover:bg-orange-500/20 transition disabled:opacity-50"
                                                title="Mettre en maintenance"
                                            >
                                                {actionLoading === item.id_signalement ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wrench className="w-4 h-4" />}
                                            </button>

                                            <button 
                                                onClick={() => handleAction(item.id_signalement, "RESOUDRE")} 
                                                disabled={actionLoading === item.id_signalement}
                                                className="p-2 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500/20 transition disabled:opacity-50"
                                                title="Marquer comme résolu"
                                            >
                                                <CheckCircle2 className="w-4 h-4" />
                                            </button>
                                        </>
                                    )}
                                    {isResolved && (
                                        <div className="text-gray-600 flex items-center gap-1 text-xs justify-end w-full">
                                            <Archive className="w-3 h-3" /> Archivé
                                        </div>
                                    )}
                                </div>
                            </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
            )}
        </div>
      </main>
    </div>
  );
}