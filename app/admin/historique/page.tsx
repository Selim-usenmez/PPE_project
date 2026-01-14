"use client";

import { useEffect, useState } from "react";
import AdminSidebar from "../../components/AdminSidebar";
// 👇 Imports complets pour couvrir tous les cas de figure
import { 
  Search, Clock, LogIn, Trash2, PlusCircle, Edit3, 
  AlertTriangle, CheckCircle, FileText, ScrollText, 
  Loader2, ShieldAlert, Ban, RefreshCcw, User 
} from "lucide-react";

export default function AdminHistorique() {
  const [logs, setLogs] = useState<any[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // Chargement des données
  useEffect(() => {
    fetch("/api/logs")
      .then(res => res.json())
      .then(data => {
        const safeData = Array.isArray(data) ? data : [];
        setLogs(safeData);
        setFilteredLogs(safeData);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Filtrage dynamique
  useEffect(() => {
    const s = search.toLowerCase();
    setFilteredLogs(logs.filter(l => 
        l.action.toLowerCase().includes(s) || 
        l.auteur.toLowerCase().includes(s) || 
        l.details.toLowerCase().includes(s)
    ));
  }, [search, logs]);

  // Fonction pour styliser chaque ligne selon l'action
  const getActionStyle = (action: string) => {
    const act = action.toUpperCase();

    // 🔴 DANGER / SUPPRESSION / ECHEC CRITIQUE
    if (act.includes("SUPPRESSION") || act.includes("ECHEC") || act.includes("BAN")) {
        return { 
            bg: "bg-red-500/10", border: "border-red-500/20", text: "text-red-400", 
            icon: act.includes("ECHEC") ? <Ban size={14} /> : <Trash2 size={14} /> 
        };
    }
    // 🟠 ATTENTION / INCIDENT / MODIF MDP
    if (act.includes("INCIDENT") || act.includes("MDP") || act.includes("RESET")) {
        return { 
            bg: "bg-orange-500/10", border: "border-orange-500/20", text: "text-orange-400", 
            icon: act.includes("MDP") ? <RefreshCcw size={14} /> : <AlertTriangle size={14} /> 
        };
    }
    // 🟢 CREATION / AJOUT / SUCCES
    if (act.includes("CRÉATION") || act.includes("AJOUT") || act.includes("SUCCES")) {
        return { 
            bg: "bg-green-500/10", border: "border-green-500/20", text: "text-green-400", 
            icon: <PlusCircle size={14} /> 
        };
    }
    // 🟣 CONNEXION / LOGIN
    if (act.includes("CONNEXION") || act.includes("LOGIN")) {
        return { 
            bg: "bg-purple-500/10", border: "border-purple-500/20", text: "text-purple-400", 
            icon: <LogIn size={14} /> 
        };
    }
    // 🔵 PAR DEFAUT / MODIF / INFO
    return { 
        bg: "bg-blue-500/10", border: "border-blue-500/20", text: "text-blue-400", 
        icon: <FileText size={14} /> 
    };
  };

  return (
    <div className="min-h-screen text-gray-200 bg-[#030712]">
      <AdminSidebar />
      <main className="ml-64 p-8 animate-fade-in">
        
        {/* EN-TÊTE */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div className="flex items-center gap-3">
                <div className="p-3 bg-indigo-500/10 rounded-xl border border-indigo-500/20 text-indigo-400">
                    <ScrollText className="w-6 h-6" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-white">Journal d'Activité</h1>
                    <p className="text-gray-400 text-sm">Traçabilité et audit des actions système.</p>
                </div>
            </div>

            {/* BARRE DE RECHERCHE */}
            <div className="relative w-full md:w-96">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                <input 
                    type="text" 
                    placeholder="Rechercher par auteur, action..." 
                    className="w-full bg-[#0f172a] border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:border-blue-500 outline-none text-gray-300 transition-all placeholder:text-gray-600"
                    value={search} 
                    onChange={(e) => setSearch(e.target.value)} 
                />
            </div>
        </div>

        {/* TABLEAU */}
        <div className="glass-panel rounded-2xl overflow-hidden border border-white/10 shadow-2xl min-h-[500px]">
            {loading ? (
                <div className="flex flex-col items-center justify-center h-full py-20">
                    <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
                    <p className="text-gray-500 font-mono text-sm">Chargement de l'historique...</p>
                </div>
            ) : filteredLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                    <Search className="w-12 h-12 mb-3 opacity-20" />
                    <p>Aucun événement trouvé.</p>
                </div>
            ) : (
                <table className="min-w-full text-left">
                    <thead className="bg-white/5 border-b border-white/10 text-gray-400 text-xs uppercase font-semibold">
                        <tr>
                            <th className="px-6 py-4">Horodatage</th>
                            <th className="px-6 py-4">Auteur</th>
                            <th className="px-6 py-4">Action</th>
                            <th className="px-6 py-4">Détails</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {filteredLogs.map((log) => {
                            const style = getActionStyle(log.action);
                            return (
                                <tr key={log.id_action} className="hover:bg-white/5 transition group">
                                    {/* DATE */}
                                    <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500 font-mono">
                                        <div className="flex items-center gap-2">
                                            <Clock size={14} className="text-gray-600" /> 
                                            {new Date(log.createdAt).toLocaleString()}
                                        </div>
                                    </td>

                                    {/* AUTEUR */}
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center border border-white/10">
                                                <User size={12} className="text-gray-400" />
                                            </div>
                                            <span className="font-bold text-gray-200 text-sm">{log.auteur}</span>
                                        </div>
                                    </td>

                                    {/* ACTION (BADGE) */}
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-md text-[10px] font-bold border uppercase tracking-wider ${style.bg} ${style.border} ${style.text}`}>
                                            {style.icon} 
                                            {log.action.replace(/_/g, " ")}
                                        </span>
                                    </td>

                                    {/* DÉTAILS */}
                                    <td className="px-6 py-4 text-sm text-gray-400 truncate max-w-md group-hover:text-gray-200 transition-colors">
                                        {log.details}
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