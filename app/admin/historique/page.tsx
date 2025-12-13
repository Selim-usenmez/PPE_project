"use client";

import { useEffect, useState } from "react";
import AdminSidebar from "../../components/AdminSidebar";
import { Search, Clock, LogIn, Trash2, PlusCircle, Edit3, AlertTriangle, CheckCircle, FileText } from "lucide-react";

export default function AdminHistorique() {
  const [logs, setLogs] = useState<any[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/logs").then(res => res.json()).then(data => {
        const safeData = Array.isArray(data) ? data : [];
        setLogs(safeData); setFilteredLogs(safeData);
    });
  }, []);

  useEffect(() => {
    const s = search.toLowerCase();
    setFilteredLogs(logs.filter(l => l.action.toLowerCase().includes(s) || l.auteur.toLowerCase().includes(s) || l.details.toLowerCase().includes(s)));
  }, [search, logs]);

  const getActionStyle = (action: string) => {
    const act = action.toUpperCase();
    if (act.includes("CONNEXION")) return { color: "text-purple-400", icon: <LogIn size={16} /> };
    if (act.includes("CRÉATION") || act.includes("AJOUT")) return { color: "text-green-400", icon: <PlusCircle size={16} /> };
    if (act.includes("SUPPRESSION")) return { color: "text-red-400", icon: <Trash2 size={16} /> };
    if (act.includes("INCIDENT")) return { color: "text-orange-400", icon: <AlertTriangle size={16} /> };
    return { color: "text-blue-400", icon: <FileText size={16} /> };
  };

  return (
    <div className="min-h-screen text-gray-200">
      <AdminSidebar />
      <main className="ml-64 p-8 animate-fade-in">
        
        <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">📜 Journal d'Activité</h1>
            <div className="relative w-96">
                <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                <input type="text" placeholder="Rechercher..." className="glass-input w-full pl-10"
                    value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
        </div>

        <div className="glass-panel rounded-2xl overflow-hidden">
            <table className="min-w-full text-left">
                <thead className="bg-white/5 border-b border-white/10 text-gray-400 text-xs uppercase">
                    <tr>
                    <th className="px-6 py-3">Date</th>
                    <th className="px-6 py-3">Auteur</th>
                    <th className="px-6 py-3">Action</th>
                    <th className="px-6 py-3">Détails</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                    {filteredLogs.map((log) => {
                        const style = getActionStyle(log.action);
                        return (
                            <tr key={log.id_action} className="hover:bg-white/5 transition">
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                                    <div className="flex items-center gap-2">
                                        <Clock size={14} /> {new Date(log.createdAt).toLocaleString()}
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap font-bold text-white">
                                    {log.auteur}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`flex items-center gap-2 ${style.color} font-bold text-xs uppercase`}>
                                        {style.icon} {log.action}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-300">{log.details}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
      </main>
    </div>
  );
}