"use client";

import { useEffect, useState } from "react";
import AdminSidebar from "../../components/AdminSidebar";
import { 
  Search, Clock, LogIn, Trash2, PlusCircle, AlertTriangle, 
  FileText, ScrollText, Loader2, Ban, RefreshCcw, User, X, 
  ExternalLink, Calendar, Bot, Sparkles, MapPin, Shield
} from "lucide-react";

// Type correspondant à l'API unifiée
interface LogEntry {
  id: string;
  type: "ACTION" | "IA" | "RESERVATION";
  message: string;
  user: string;
  role: string;
  date: string;
}

export default function AdminHistorique() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<LogEntry[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);

  // Chargement des données via la NOUVELLE API
  useEffect(() => {
    fetch("/api/admin/historique")
      .then(res => res.json())
      .then(data => {
        const safeData = Array.isArray(data) ? data : [];
        setLogs(safeData);
        setFilteredLogs(safeData);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  // Filtrage dynamique
  useEffect(() => {
    const s = search.toLowerCase();
    setFilteredLogs(logs.filter(l => 
        l.message.toLowerCase().includes(s) || 
        l.user.toLowerCase().includes(s) || 
        l.type.toLowerCase().includes(s)
    ));
  }, [search, logs]);

  // Fonction de style intelligente
  const getLogStyle = (log: LogEntry) => {
    // 1. STYLE INTELLIGENCE ARTIFICIELLE
    if (log.type === "IA") {
        return { 
            bg: "bg-purple-500/10", border: "border-purple-500/20", text: "text-purple-400", 
            icon: <Bot size={16} />, label: "ASSISTANT IA"
        };
    }

    // 2. STYLE RÉSERVATION
    if (log.type === "RESERVATION") {
        return { 
            bg: "bg-blue-500/10", border: "border-blue-500/20", text: "text-blue-400", 
            icon: <Calendar size={16} />, label: "RÉSERVATION"
        };
    }

    // 3. STYLE ACTIONS SYSTÈME (Selon le contenu du message)
    const msg = log.message.toUpperCase();

    if (msg.includes("SUPPRESSION") || msg.includes("BAN") || msg.includes("ERREUR")) {
        return { 
            bg: "bg-red-500/10", border: "border-red-500/20", text: "text-red-400", 
            icon: <Trash2 size={16} />, label: "DANGER"
        };
    }
    if (msg.includes("LOGIN") || msg.includes("CONNEXION")) {
        return { 
            bg: "bg-emerald-500/10", border: "border-emerald-500/20", text: "text-emerald-400", 
            icon: <LogIn size={16} />, label: "CONNEXION"
        };
    }
    if (msg.includes("CRÉATION") || msg.includes("AJOUT")) {
        return { 
            bg: "bg-green-500/10", border: "border-green-500/20", text: "text-green-400", 
            icon: <PlusCircle size={16} />, label: "CRÉATION"
        };
    }

    // Par défaut
    return { 
        bg: "bg-slate-500/10", border: "border-slate-500/20", text: "text-slate-400", 
        icon: <FileText size={16} />, label: "ACTION"
    };
  };

  return (
    <div className="min-h-screen text-gray-200 bg-[#030712]">
      <AdminSidebar />
      <main className="ml-64 p-8 animate-fade-in">
        
        {/* EN-TÊTE */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-xl border border-white/10 text-white">
                    <ScrollText className="w-6 h-6" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-white">Journal Global</h1>
                    <p className="text-gray-400 text-sm">Vue unifiée : IA, Réservations & Système.</p>
                </div>
            </div>

            {/* BARRE DE RECHERCHE */}
            <div className="relative w-full md:w-96">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                <input 
                    type="text" 
                    placeholder="Rechercher (ex: 'IA', 'Jean', 'Salle')..." 
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
                    <p className="text-gray-500 font-mono text-sm">Chargement du journal unifié...</p>
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
                            <th className="px-6 py-4">Type</th>
                            <th className="px-6 py-4">Utilisateur</th>
                            <th className="px-6 py-4">Message / Détail</th>
                            <th className="px-6 py-4 text-right">Date</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {filteredLogs.map((log) => {
                            const style = getLogStyle(log);
                            return (
                                <tr 
                                  key={log.id} 
                                  className="hover:bg-white/5 transition group cursor-pointer"
                                  onClick={() => setSelectedLog(log)}
                                >
                                    {/* TYPE (ICÔNE) */}
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[10px] font-bold border uppercase tracking-wider ${style.bg} ${style.border} ${style.text}`}>
                                            {style.icon} 
                                            {style.label}
                                        </span>
                                    </td>

                                    {/* UTILISATEUR */}
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center border border-white/10 text-gray-400">
                                                <User size={14} />
                                            </div>
                                            <div>
                                                <div className="font-bold text-gray-200 text-sm">{log.user}</div>
                                                <div className="text-[10px] text-gray-500 uppercase">{log.role}</div>
                                            </div>
                                        </div>
                                    </td>

                                    {/* MESSAGE */}
                                    <td className="px-6 py-4 text-sm text-gray-400 max-w-lg truncate">
                                        {log.type === 'IA' && <span className="text-purple-400 mr-2 font-mono text-xs">[PROMPT]</span>}
                                        <span className="group-hover:text-white transition-colors">{log.message}</span>
                                    </td>

                                    {/* DATE */}
                                    <td className="px-6 py-4 text-right whitespace-nowrap text-xs text-gray-600 font-mono">
                                        {new Date(log.date).toLocaleString('fr-FR')}
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
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in" onClick={() => setSelectedLog(null)}>
          <div className="bg-[#0f172a] border border-white/10 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto relative" onClick={e => e.stopPropagation()}>
            
            <button onClick={() => setSelectedLog(null)} className="absolute top-4 right-4 text-gray-400 hover:text-white transition">
                <X size={24} />
            </button>

            <div className="p-8">
                {/* HEADER MODAL */}
                <div className="flex items-center gap-4 mb-6">
                    <div className={`p-4 rounded-xl ${getLogStyle(selectedLog).bg} ${getLogStyle(selectedLog).text}`}>
                        {getLogStyle(selectedLog).icon}
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-white">Détails de l'événement</h2>
                        <p className="text-gray-400 text-sm flex items-center gap-2">
                            ID: <span className="font-mono text-xs bg-white/5 px-2 py-0.5 rounded">{selectedLog.id}</span>
                        </p>
                    </div>
                </div>

                <div className="space-y-6">
                    {/* INFO UTILISATEUR */}
                    <div className="bg-white/5 rounded-xl p-5 border border-white/10">
                        <h3 className="text-xs uppercase font-bold text-gray-500 mb-4 flex items-center gap-2"><User size={14}/> Acteur</h3>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-lg font-bold text-white">{selectedLog.user}</p>
                                <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded border border-blue-500/30">{selectedLog.role}</span>
                            </div>
                            <div className="text-right">
                                <p className="text-sm text-gray-400">Date de l'action</p>
                                <p className="text-white font-mono">{new Date(selectedLog.date).toLocaleString()}</p>
                            </div>
                        </div>
                    </div>

                    {/* CONTENU PRINCIPAL */}
                    <div className="bg-white/5 rounded-xl p-5 border border-white/10">
                        <h3 className="text-xs uppercase font-bold text-gray-500 mb-4 flex items-center gap-2">
                            {selectedLog.type === 'IA' ? <Sparkles size={14} className="text-purple-400"/> : <FileText size={14}/>} 
                            Contenu
                        </h3>
                        
                        <div className="bg-black/40 p-4 rounded-lg border border-white/5 font-mono text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">
                            {selectedLog.message}
                        </div>

                        {selectedLog.type === 'IA' && (
                             <div className="mt-4 p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg flex items-start gap-3">
                                <Bot className="w-5 h-5 text-purple-400 shrink-0 mt-0.5"/>
                                <p className="text-xs text-purple-300">
                                    Ceci est un prompt envoyé à l'Assistant Intelligent pour analyse.
                                </p>
                             </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="p-6 border-t border-white/10 bg-white/5 flex justify-end">
                <button onClick={() => setSelectedLog(null)} className="px-6 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-sm transition">
                    Fermer
                </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}