"use client";

import { useEffect, useState } from "react";
import AdminSidebar from "../../components/AdminSidebar";
import { toast } from "sonner";
import { 
  AlertTriangle, Wrench, CheckCircle2, Clock, Search, 
  Archive, User, Microscope, Loader2, X, MessageSquare, ShieldAlert, Send, BarChart2, TrendingUp
} from "lucide-react";

export default function AdminIncidents() {
  const [list, setList] = useState<any[]>([]);
  const [statsPannes, setStatsPannes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // FILTRES
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");

  // MODALE
  const [processModal, setProcessModal] = useState<{ open: boolean, id: string | null, action: "MAINTENANCE" | "RESOUDRE" | null }>({ open: false, id: null, action: null });
  const [techNote, setTechNote] = useState("");
  const [userMessage, setUserMessage] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => { 
      fetchData(); 
  }, []);

  const fetchData = async () => {
    try {
      const [resList, resStats] = await Promise.all([
          fetch("/api/signalements"),
          fetch("/api/stats/pannes") // 👈 Appel de notre nouvelle API stats
      ]);
      
      if (resList.ok) setList(await resList.json());
      if (resStats.ok) setStatsPannes(await resStats.json());
    } catch (e) { toast.error("Erreur chargement"); } 
    finally { setLoading(false); }
  };

  const openProcessModal = (id: string, action: "MAINTENANCE" | "RESOUDRE") => {
      setProcessModal({ open: true, id, action });
      setTechNote("");
      setUserMessage(action === "MAINTENANCE" ? "Votre matériel est pris en charge par l'équipe technique." : "Le problème a été résolu, merci de votre signalement.");
  };

  const confirmAction = async () => {
    if (!processModal.id || !processModal.action) return;
    setProcessing(true);
    try {
      const res = await fetch(`/api/signalements/${processModal.id}`, { 
        method: "PUT", 
        headers: {"Content-Type": "application/json"}, 
        body: JSON.stringify({ action: processModal.action, commentaire_tech: techNote, message_reponse: userMessage }) 
      });
      if (res.ok) {
        toast.success("Statut mis à jour");
        fetchData(); // On recharge tout (y compris les stats)
        setProcessModal({ open: false, id: null, action: null });
      } else { toast.error("Erreur serveur"); }
    } catch (e) { toast.error("Erreur connexion"); } 
    finally { setProcessing(false); }
  };

  // Filtrage
  const filteredList = list.filter(item => {
    const matchSearch = item.ressource.nom_ressource.toLowerCase().includes(search.toLowerCase()) || item.employe.nom.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "ALL" || item.statut === filterStatus;
    return matchSearch && matchStatus;
  });

  const stats = {
    critique: list.filter(i => i.statut === 'EN_ATTENTE').length,
    maintenance: list.filter(i => i.statut === 'EN_COURS').length,
    resolu: list.filter(i => i.statut === 'RESOLU').length
  };

  return (
    <div className="min-h-screen text-gray-200 bg-[#030712]">
      <AdminSidebar />
      <main className="ml-64 p-8 animate-fade-in">
        
        {/* HEADER */}
        <div className="flex justify-between items-end mb-8">
            <div><h1 className="text-3xl font-bold text-white flex items-center gap-3">Incidents & Maintenance</h1><p className="text-gray-400 text-sm mt-1">Suivi des pannes matérielles.</p></div>
        </div>

        {/* --- ZONE DU HAUT : KPI + TOP PANNES --- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
             
             {/* COLONNE 1 & 2 : KPI CLASSIQUES */}
             <div className="lg:col-span-2 grid grid-cols-3 gap-4">
                <div className="glass-panel p-5 rounded-xl border-l-4 border-red-500 flex flex-col justify-between">
                    <div className="flex justify-between items-start"><AlertTriangle className="w-6 h-6 text-red-500"/><span className="text-xs font-bold text-red-400 bg-red-500/10 px-2 py-1 rounded">URGENT</span></div>
                    <div><p className="text-3xl font-bold text-white mt-2">{stats.critique}</p><p className="text-xs text-gray-400 mt-1">Incidents à traiter</p></div>
                </div>
                <div className="glass-panel p-5 rounded-xl border-l-4 border-orange-500 flex flex-col justify-between">
                    <div className="flex justify-between items-start"><Wrench className="w-6 h-6 text-orange-500"/><span className="text-xs font-bold text-orange-400 bg-orange-500/10 px-2 py-1 rounded">ATELIER</span></div>
                    <div><p className="text-3xl font-bold text-white mt-2">{stats.maintenance}</p><p className="text-xs text-gray-400 mt-1">Matériel indisponible</p></div>
                </div>
                <div className="glass-panel p-5 rounded-xl border-l-4 border-green-500 flex flex-col justify-between">
                    <div className="flex justify-between items-start"><CheckCircle2 className="w-6 h-6 text-green-500"/><span className="text-xs font-bold text-green-400 bg-green-500/10 px-2 py-1 rounded">OK</span></div>
                    <div><p className="text-3xl font-bold text-white mt-2">{stats.resolu}</p><p className="text-xs text-gray-400 mt-1">Incidents clos</p></div>
                </div>
             </div>

             {/* COLONNE 3 : 📊 TOP PANNES (NOUVEAU) */}
             <div className="glass-panel p-5 rounded-xl border border-white/10 relative overflow-hidden">
                <div className="flex items-center gap-2 mb-4 text-white font-bold border-b border-white/10 pb-2">
                    <BarChart2 className="w-4 h-4 text-purple-400"/> Top 5 Équipements Fragiles
                </div>
                <div className="space-y-3">
                    {statsPannes.length === 0 ? <p className="text-xs text-gray-500 italic">Pas assez de données.</p> :
                    statsPannes.map((stat, i) => (
                        <div key={stat.id} className="relative group">
                            <div className="flex justify-between text-xs mb-1">
                                <span className="text-gray-300 font-medium truncate max-w-[150px]">{stat.nom}</span>
                                <span className="text-purple-300 font-bold">{stat.count} pannes</span>
                            </div>
                            <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                                <div 
                                    className="bg-purple-500 h-full rounded-full transition-all duration-1000" 
                                    style={{ width: `${(stat.count / Math.max(...statsPannes.map(s=>s.count))) * 100}%` }}
                                ></div>
                            </div>
                        </div>
                    ))}
                </div>
             </div>
        </div>

        {/* FILTRES */}
        <div className="glass-panel p-4 rounded-2xl border border-white/10 mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:w-96"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" /><input type="text" placeholder="Rechercher..." className="w-full bg-[#0f172a] border border-white/10 rounded-xl py-2 pl-9 pr-4 text-sm focus:border-blue-500 outline-none text-gray-300" value={search} onChange={(e) => setSearch(e.target.value)}/></div>
            <div className="flex gap-2">{["ALL", "EN_ATTENTE", "EN_COURS", "RESOLU"].map(status => (<button key={status} onClick={() => setFilterStatus(status)} className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition uppercase ${filterStatus === status ? "bg-blue-500/20 border-blue-500 text-blue-300" : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10"}`}>{status.replace("_", " ")}</button>))}</div>
        </div>
        
        {/* TABLEAU */}
        <div className="glass-panel rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
            {loading ? <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 text-blue-500 animate-spin" /></div> : 
            filteredList.length === 0 ? <div className="py-20 text-center text-gray-500">Aucun incident.</div> : (
                <table className="min-w-full text-left">
                  <thead className="bg-white/5 border-b border-white/10 text-gray-400 text-xs uppercase font-semibold">
                    <tr><th className="px-6 py-4">Date</th><th className="px-6 py-4">Matériel</th><th className="px-6 py-4">Détails Incident</th><th className="px-6 py-4">Signalement</th><th className="px-6 py-4 text-right">Actions</th></tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredList.map((item) => {
                      const isResolved = item.statut === 'RESOLU';
                      const isMaintenance = item.statut === 'EN_COURS'; 

                      return (
                        <tr key={item.id_signalement} className={`hover:bg-white/5 transition group ${isResolved ? 'opacity-60' : ''}`}>
                            <td className="px-6 py-4 text-xs text-gray-500 font-mono"><div className="flex items-center gap-2"><Clock className="w-3 h-3" /> {new Date(item.createdAt).toLocaleDateString()}</div></td>
                            <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center border ${isResolved ? 'bg-slate-800 border-white/10 text-gray-500' : 'bg-red-500/10 border-red-500/20 text-red-500'}`}><Microscope className="w-4 h-4" /></div>
                                    <div>
                                        <div className="font-bold text-white text-sm">{item.ressource.nom_ressource}</div>
                                        {/* INDICATEUR SI BLOQUÉ */}
                                        {isMaintenance && <span className="text-[10px] text-orange-400 font-bold flex items-center gap-1"><ShieldAlert className="w-3 h-3"/> INDISPONIBLE</span>}
                                        {!isMaintenance && <span className="text-[10px] text-gray-500 font-mono">{item.ressource.numero_serie || "?"}</span>}
                                    </div>
                                </div>
                            </td>
                            <td className="px-6 py-4">
                                <div className="text-gray-300 text-sm mb-2 max-w-xs">{item.description}</div>
                                {item.statut === 'EN_ATTENTE' && <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-red-500/10 text-red-400 border border-red-500/20 text-[10px] font-bold uppercase tracking-wide animate-pulse"><AlertTriangle className="w-3 h-3" /> Action Requise</span>}
                                {isMaintenance && <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-orange-500/10 text-orange-400 border border-orange-500/20 text-[10px] font-bold uppercase tracking-wide"><Wrench className="w-3 h-3" /> En Atelier</span>}
                                {isResolved && <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-green-500/10 text-green-400 border border-green-500/20 text-[10px] font-bold uppercase tracking-wide"><CheckCircle2 className="w-3 h-3" /> Clôturé</span>}
                            </td>
                            <td className="px-6 py-4"><div className="flex items-center gap-2 text-sm text-gray-400"><User className="w-3 h-3" /> {item.employe.prenom} {item.employe.nom}</div></td>
                            <td className="px-6 py-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                    {!isResolved && (
                                        <>
                                            {item.statut === 'EN_ATTENTE' && (
                                                <button onClick={() => openProcessModal(item.id_signalement, "MAINTENANCE")} className="p-2 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400 hover:bg-orange-500/20 transition" title="Prendre en charge"><Wrench className="w-4 h-4"/></button>
                                            )}
                                            <button onClick={() => openProcessModal(item.id_signalement, "RESOUDRE")} className="p-2 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500/20 transition" title="Clôturer"><CheckCircle2 className="w-4 h-4" /></button>
                                        </>
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

        {/* MODALE DE TRAITEMENT AVANCÉE */}
        {processModal.open && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in zoom-in-95">
                <div className={`bg-[#0f172a] border rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col ${processModal.action === 'MAINTENANCE' ? 'border-orange-500/30' : 'border-green-500/30'}`}>
                    <div className={`p-6 border-b flex items-center gap-3 ${processModal.action === 'MAINTENANCE' ? 'bg-orange-500/10 border-orange-500/20' : 'bg-green-500/10 border-green-500/20'}`}>
                        <div className={`p-3 rounded-full ${processModal.action === 'MAINTENANCE' ? 'bg-orange-500/20 text-orange-400' : 'bg-green-500/20 text-green-400'}`}>
                            {processModal.action === 'MAINTENANCE' ? <Wrench className="w-6 h-6"/> : <CheckCircle2 className="w-6 h-6"/>}
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">{processModal.action === 'MAINTENANCE' ? "Mise en Maintenance" : "Résolution de l'incident"}</h2>
                            <p className="text-xs text-gray-300">Cette action informera l'employé.</p>
                        </div>
                    </div>
                    <div className="p-6 space-y-6">
                        <div><label className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase mb-2"><ShieldAlert className="w-3 h-3"/> Note Technique (Interne)</label><textarea rows={2} className="glass-input w-full text-xs font-mono text-gray-300 bg-black/20 border-white/5 focus:border-gray-500" placeholder="Ex: Remplacement de la pièce X effectué..." value={techNote} onChange={(e) => setTechNote(e.target.value)}/></div>
                        <div><label className="flex items-center gap-2 text-xs font-bold text-blue-400 uppercase mb-2"><MessageSquare className="w-3 h-3"/> Message à l'utilisateur</label><textarea rows={3} className="glass-input w-full text-sm focus:border-blue-500" placeholder="Message visible par l'employé..." value={userMessage} onChange={(e) => setUserMessage(e.target.value)}/></div>
                    </div>
                    <div className="p-4 bg-white/5 border-t border-white/10 flex justify-end gap-3">
                        <button onClick={() => setProcessModal({ open: false, id: null, action: null })} className="px-4 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition text-sm">Annuler</button>
                        <button onClick={confirmAction} disabled={processing} className={`px-6 py-2 rounded-lg font-bold text-white flex items-center gap-2 shadow-lg transition ${processModal.action === 'MAINTENANCE' ? 'bg-orange-500 hover:bg-orange-600 shadow-orange-500/20' : 'bg-green-600 hover:bg-green-700 shadow-green-500/20'}`}>{processing ? <Loader2 className="w-4 h-4 animate-spin"/> : <Send className="w-4 h-4"/>}{processModal.action === 'MAINTENANCE' ? "Confirmer Maintenance" : "Clôturer le Ticket"}</button>
                    </div>
                </div>
            </div>
        )}

      </main>
    </div>
  );
}