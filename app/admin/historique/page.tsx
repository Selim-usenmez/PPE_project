"use client";

import { useEffect, useState } from "react";
import AdminSidebar from "../../components/AdminSidebar";
import { 
  Search, Clock, LogIn, Trash2, PlusCircle, Edit3, 
  AlertTriangle, CheckCircle, FileText, ScrollText, 
  Loader2, Ban, RefreshCcw, User, X, ExternalLink,
  Calendar, User2
} from "lucide-react";

export default function AdminHistorique() {
  const [logs, setLogs] = useState<any[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<any>(null);

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

  const getActionStyle = (action: string) => {
    const act = action.toUpperCase();

    if (act.includes("SUPPRESSION") || act.includes("ECHEC") || act.includes("BAN")) {
        return { 
            bg: "bg-red-500/10", border: "border-red-500/20", text: "text-red-400", 
            icon: act.includes("ECHEC") ? <Ban size={14} /> : <Trash2 size={14} /> 
        };
    }
    if (act.includes("INCIDENT") || act.includes("MDP") || act.includes("RESET")) {
        return { 
            bg: "bg-orange-500/10", border: "border-orange-500/20", text: "text-orange-400", 
            icon: act.includes("MDP") ? <RefreshCcw size={14} /> : <AlertTriangle size={14} /> 
        };
    }
    if (act.includes("CRÉATION") || act.includes("AJOUT") || act.includes("SUCCES")) {
        return { 
            bg: "bg-green-500/10", border: "border-green-500/20", text: "text-green-400", 
            icon: <PlusCircle size={14} /> 
        };
    }
    if (act.includes("CONNEXION") || act.includes("LOGIN")) {
        return { 
            bg: "bg-purple-500/10", border: "border-purple-500/20", text: "text-purple-400", 
            icon: <LogIn size={14} /> 
        };
    }
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
        <div className="rounded-2xl overflow-hidden border border-white/10 shadow-2xl min-h-[500px] bg-white/5 backdrop-blur">
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
                                <tr 
                                  key={log.id_action} 
                                  className="hover:bg-white/5 transition group cursor-pointer"
                                  onClick={() => setSelectedLog(log)}
                                >
                                    <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500 font-mono">
                                        <div className="flex items-center gap-2">
                                            <Clock size={14} className="text-gray-600" /> 
                                            {new Date(log.createdAt).toLocaleString()}
                                        </div>
                                    </td>

                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center border border-white/10">
                                                <User size={12} className="text-gray-400" />
                                            </div>
                                            <span className="font-bold text-gray-200 text-sm">{log.auteur}</span>
                                        </div>
                                    </td>

                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-md text-[10px] font-bold border uppercase tracking-wider ${style.bg} ${style.border} ${style.text}`}>
                                            {style.icon} 
                                            {log.action.replace(/_/g, " ")}
                                        </span>
                                    </td>

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

      {/* MODAL DÉTAIL */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#0f172a] border border-white/10 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            
            {/* EN-TÊTE MODAL */}
            <div className="flex items-start justify-between p-6 border-b border-white/10 sticky top-0 bg-[#0f172a]">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${getActionStyle(selectedLog.action).bg}`}>
                  {getActionStyle(selectedLog.action).icon}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">
                    {selectedLog.action.replace(/_/g, " ")}
                  </h2>
                  <p className="text-gray-400 text-sm">Détails de l'événement</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-gray-400 hover:text-white transition"
              >
                <X size={24} />
              </button>
            </div>

            {/* CONTENU MODAL */}
            <div className="p-6 space-y-6">
              
              {/* DATE ET HEURE */}
              <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                <div className="flex items-center gap-2 text-gray-400 mb-2">
                  <Calendar size={16} />
                  <span className="text-xs uppercase font-semibold">Date et heure</span>
                </div>
                <p className="text-white font-mono text-sm">
                  {new Date(selectedLog.createdAt).toLocaleString('fr-FR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                  })}
                </p>
              </div>

              {/* AUTEUR */}
              <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                <div className="flex items-center gap-2 text-gray-400 mb-2">
                  <User2 size={16} />
                  <span className="text-xs uppercase font-semibold">Auteur</span>
                </div>
                <p className="text-white font-semibold">{selectedLog.auteur}</p>
              </div>

              {/* ACTION */}
              <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                <div className="flex items-center gap-2 text-gray-400 mb-2">
                  <FileText size={16} />
                  <span className="text-xs uppercase font-semibold">Action effectuée</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-md text-xs font-bold border uppercase tracking-wider ${getActionStyle(selectedLog.action).bg} ${getActionStyle(selectedLog.action).border} ${getActionStyle(selectedLog.action).text}`}>
                    {getActionStyle(selectedLog.action).icon}
                    {selectedLog.action.replace(/_/g, " ")}
                  </span>
                </div>
              </div>

              {/* DÉTAILS COMPLETS */}
              <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                <div className="flex items-center gap-2 text-gray-400 mb-2">
                  <ExternalLink size={16} />
                  <span className="text-xs uppercase font-semibold">Détails complets</span>
                </div>
                <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
                  {selectedLog.details || "Aucun détail disponible"}
                </p>
              </div>

              {/* ID ACTION (POUR DEBUG) */}
              <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                <div className="flex items-center gap-2 text-gray-400 mb-2">
                  <FileText size={16} />
                  <span className="text-xs uppercase font-semibold">ID de l'action</span>
                </div>
                <p className="text-gray-400 font-mono text-xs break-all">
                  {selectedLog.id_action}
                </p>
              </div>

            </div>

            {/* BOUTON FERMER */}
            <div className="p-6 border-t border-white/10 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-blue-500/20 border border-blue-500/30 rounded-lg text-blue-400 hover:bg-blue-500/30 transition font-semibold text-sm"
              >
                Fermer
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}