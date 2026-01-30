"use client";

import { useEffect, useState } from "react";
import AdminSidebar from "../../components/AdminSidebar";
import { toast } from "sonner";
import { 
  Calendar, Search, Trash2, Pencil, X, 
  MapPin, Box, User, Loader2, Save, Clock, 
  Filter, CheckCircle2, History, RefreshCcw, 
  BarChart3, Activity, Timer, CalendarDays, ArrowRight 
} from "lucide-react";

// Helper Formatage Date Input
const formatForInput = (d: any) => {
    if (!d) return "";
    try {
        const date = new Date(d);
        const offset = date.getTimezoneOffset() * 60000;
        return (new Date(date.getTime() - offset)).toISOString().slice(0, 16);
    } catch (e) { return ""; }
};

// Helper Statut Visuel
const getStatus = (start: string, end: string) => {
    const now = new Date();
    const startDate = new Date(start);
    const endDate = new Date(end);
    
    if (now > endDate) return { label: "Terminé", color: "text-gray-500 bg-gray-500/10 border-gray-500/20", icon: <History className="w-3 h-3"/> };
    if (now >= startDate && now <= endDate) return { label: "En cours", color: "text-green-400 bg-green-500/10 border-green-500/20 animate-pulse", icon: <CheckCircle2 className="w-3 h-3"/> };
    return { label: "À venir", color: "text-blue-400 bg-blue-500/10 border-blue-500/20", icon: <Clock className="w-3 h-3"/> };
};

export default function AdminReservationsPage() {
  const [reservations, setReservations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // 🔍 FILTRES (Ajout de 'status')
  const [filters, setFilters] = useState({ 
      search: "", 
      user: "ALL", 
      type: "ALL", 
      status: "ALL", // 🆕 NOUVEAU
      dateStart: "", 
      dateEnd: "" 
  });

  const [salles, setSalles] = useState<any[]>([]);
  const [ressources, setRessources] = useState<any[]>([]);
  const [employes, setEmployes] = useState<any[]>([]);

  // ÉTATS MODALES
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  
  // DATA SÉLECTIONNÉE
  const [selectedResa, setSelectedResa] = useState<any>(null);
  const [selectedResaLogs, setSelectedResaLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const [form, setForm] = useState({ id_reservation: "", objet: "", date_debut: "", date_fin: "", id_salle: "", id_ressource: "" });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
      setLoading(true);
      try {
          const [resResa, resSalles, resRessources, resEmployes] = await Promise.all([
              fetch("/api/reservations").then(r => r.json()),
              fetch("/api/salles").then(r => r.json()),
              fetch("/api/ressources").then(r => r.json()),
              fetch("/api/employes").then(r => r.json())
          ]);
          setReservations(resResa); setSalles(resSalles); setRessources(resRessources); setEmployes(resEmployes);
      } catch(e) { toast.error("Erreur chargement"); }
      setLoading(false);
  };

  // 🧠 LOGIQUE DE FILTRAGE MISE À JOUR
  const filtered = reservations.filter(r => {
      const matchSearch = r.objet.toLowerCase().includes(filters.search.toLowerCase());
      const matchUser = filters.user === "ALL" || r.id_employe === filters.user;
      const matchType = filters.type === "ALL" || (filters.type === "SALLE" && r.id_salle) || (filters.type === "RESSOURCE" && r.id_ressource);
      
      // Filtre Date
      let matchDate = true;
      const rDate = new Date(r.date_debut).toISOString().split('T')[0];
      if (filters.dateStart) matchDate = matchDate && rDate >= filters.dateStart;
      if (filters.dateEnd) matchDate = matchDate && rDate <= filters.dateEnd;

      // 🆕 Filtre Statut
      let matchStatus = true;
      const now = new Date();
      const start = new Date(r.date_debut);
      const end = new Date(r.date_fin);
      
      if (filters.status === "EN_COURS") matchStatus = now >= start && now <= end;
      if (filters.status === "A_VENIR") matchStatus = now < start;
      if (filters.status === "TERMINE") matchStatus = now > end;

      return matchSearch && matchUser && matchType && matchDate && matchStatus;
  });

  const resetFilters = () => setFilters({ search: "", user: "ALL", type: "ALL", status: "ALL", dateStart: "", dateEnd: "" });

  // KPI STATS
  const stats = {
      total: reservations.length,
      enCours: reservations.filter(r => new Date() >= new Date(r.date_debut) && new Date() <= new Date(r.date_fin)).length,
      users: new Set(reservations.map(r => r.id_employe)).size
  };

  // ACTIONS
  const openEdit = (resa: any, e: any) => {
      e.stopPropagation();
      setForm({ id_reservation: resa.id_reservation, objet: resa.objet, date_debut: formatForInput(resa.date_debut), date_fin: formatForInput(resa.date_fin), id_salle: resa.id_salle || "", id_ressource: resa.id_ressource || "" });
      setIsModalOpen(true);
  };

  const openView = async (resa: any) => {
      setSelectedResa(resa); setIsViewModalOpen(true); setLogsLoading(true);
      try {
          const res = await fetch(`/api/logs/reservation?id=${resa.id_reservation}`);
          if (res.ok) setSelectedResaLogs(await res.json()); else setSelectedResaLogs([]);
      } catch (e) { console.error(e); }
      setLogsLoading(false);
  };

  const handleDelete = async () => {
      if(!confirmDeleteId) return;
      await fetch(`/api/reservations?id=${confirmDeleteId}`, { method: "DELETE" });
      toast.success("Supprimé"); loadData(); setConfirmDeleteId(null); setIsViewModalOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      try {
          const payload = { ...form, date_debut: new Date(form.date_debut).toISOString(), date_fin: new Date(form.date_fin).toISOString(), id_salle: form.id_salle || null, id_ressource: form.id_ressource || null };
          const res = await fetch("/api/reservations", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
          if(res.ok) { toast.success("Modifié !"); setIsModalOpen(false); loadData(); } else { toast.error("Erreur update"); }
      } catch(e) { toast.error("Erreur serveur"); }
  };

  return (
    <div className="min-h-screen text-gray-200 bg-[#030712]">
      <AdminSidebar /> 

      <main className="ml-64 p-8 animate-fade-in">
        
        <div className="flex justify-between items-end mb-8">
            <div><h1 className="text-3xl font-bold text-white flex items-center gap-3">Supervision Réservations</h1><p className="text-gray-400 text-sm mt-1">Gérez l'ensemble des plannings.</p></div>
            <button onClick={loadData} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 text-gray-400 transition"><RefreshCcw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`}/></button>
        </div>

        {/* KPI */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="glass-panel p-5 rounded-xl border border-white/5 flex items-center gap-4 relative overflow-hidden">
                <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400 border border-blue-500/20"><BarChart3 className="w-6 h-6"/></div>
                <div><p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Total Réservations</p><p className="text-3xl font-bold text-white mt-1">{stats.total}</p></div>
            </div>
            <div className="glass-panel p-5 rounded-xl border border-white/5 flex items-center gap-4 relative overflow-hidden">
                <div className="p-3 bg-green-500/10 rounded-xl text-green-400 border border-green-500/20"><Activity className="w-6 h-6"/></div>
                <div><p className="text-xs text-gray-500 uppercase font-bold tracking-wider">En cours actuellement</p><p className="text-3xl font-bold text-white mt-1">{stats.enCours}</p></div>
            </div>
            <div className="glass-panel p-5 rounded-xl border border-white/5 flex items-center gap-4 relative overflow-hidden">
                <div className="p-3 bg-purple-500/10 rounded-xl text-purple-400 border border-purple-500/20"><User className="w-6 h-6"/></div>
                <div><p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Utilisateurs Actifs</p><p className="text-3xl font-bold text-white mt-1">{stats.users}</p></div>
            </div>
        </div>

        {/* BARRE DE FILTRES AVEC STATUT */}
        <div className="glass-panel p-5 rounded-2xl border border-white/10 mb-6 bg-[#0f172a]/80 backdrop-blur-md sticky top-4 z-30 shadow-2xl">
            <div className="flex flex-col xl:flex-row gap-4 justify-between">
                <div className="relative flex-1 min-w-[200px]"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500"/><input type="text" placeholder="Rechercher (objet)..." className="w-full bg-[#030712] border border-white/10 rounded-xl py-2.5 pl-9 pr-4 text-sm focus:border-blue-500 outline-none text-gray-300" value={filters.search} onChange={e => setFilters({...filters, search: e.target.value})}/></div>
                <div className="flex flex-wrap gap-3">
                    {/* Filtre Employé */}
                    <div className="relative"><User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 z-10"/><select className="bg-[#030712] border border-white/10 rounded-xl py-2.5 pl-9 pr-8 text-sm focus:border-blue-500 outline-none text-gray-300 appearance-none cursor-pointer min-w-[150px]" value={filters.user} onChange={e => setFilters({...filters, user: e.target.value})}><option value="ALL">Tous employés</option>{employes.map(e => (<option key={e.id_employe} value={e.id_employe}>{e.nom} {e.prenom}</option>))}</select></div>
                    
                    {/* Filtre Type */}
                    <div className="relative"><Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 z-10"/><select className="bg-[#030712] border border-white/10 rounded-xl py-2.5 pl-9 pr-8 text-sm focus:border-blue-500 outline-none text-gray-300 appearance-none cursor-pointer" value={filters.type} onChange={e => setFilters({...filters, type: e.target.value})}><option value="ALL">Tous types</option><option value="SALLE">Salles</option><option value="RESSOURCE">Matériel</option></select></div>
                    
                    {/* 🆕 Filtre Statut */}
                    <div className="relative"><Timer className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 z-10"/><select className="bg-[#030712] border border-white/10 rounded-xl py-2.5 pl-9 pr-8 text-sm focus:border-blue-500 outline-none text-gray-300 appearance-none cursor-pointer" value={filters.status} onChange={e => setFilters({...filters, status: e.target.value})}><option value="ALL">Tous statuts</option><option value="EN_COURS">En cours</option><option value="A_VENIR">À venir</option><option value="TERMINE">Terminé</option></select></div>

                    <div className="flex items-center gap-2 bg-[#030712] border border-white/10 rounded-xl px-3 py-1.5"><span className="text-xs text-gray-500 font-bold uppercase">Du</span><input type="date" className="bg-transparent outline-none text-sm text-gray-300 [color-scheme:dark]" value={filters.dateStart} onChange={e => setFilters({...filters, dateStart: e.target.value})} /><span className="text-xs text-gray-500 font-bold uppercase">Au</span><input type="date" className="bg-transparent outline-none text-sm text-gray-300 [color-scheme:dark]" value={filters.dateEnd} onChange={e => setFilters({...filters, dateEnd: e.target.value})} /></div>
                    <button onClick={resetFilters} className="p-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl border border-red-500/20 transition"><X className="w-5 h-5"/></button>
                </div>
            </div>
        </div>

        {/* TABLEAU */}
        <div className="glass-panel rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
            <div className="overflow-x-auto">
                <table className="min-w-full text-left">
                    <thead className="bg-white/5 border-b border-white/10 text-gray-400 text-xs uppercase font-bold tracking-wider">
                        <tr><th className="px-6 py-4">Statut</th><th className="px-6 py-4">Objet & Lieu</th><th className="px-6 py-4">Utilisateur</th><th className="px-6 py-4">Créneaux (Début / Fin)</th><th className="px-6 py-4 text-right">Actions</th></tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {loading ? <tr><td colSpan={5} className="p-10 text-center"><Loader2 className="animate-spin mx-auto w-8 h-8 text-blue-500"/></td></tr> : 
                        filtered.length === 0 ? <tr><td colSpan={5} className="p-10 text-center text-gray-500 italic">Aucun résultat.</td></tr> :
                        filtered.map(r => {
                            const status = getStatus(r.date_debut, r.date_fin);
                            return (
                            <tr key={r.id_reservation} onClick={() => openView(r)} className="hover:bg-white/5 transition group cursor-pointer">
                                <td className="px-6 py-4"><span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider ${status.color}`}>{status.icon} {status.label}</span></td>
                                <td className="px-6 py-4"><div className="font-bold text-white text-sm mb-1">{r.objet}</div><div className="flex gap-2">{r.salle && <span className="inline-flex items-center gap-1 text-[10px] bg-blue-500/10 text-blue-300 px-2 py-0.5 rounded border border-blue-500/20"><MapPin className="w-3 h-3"/> {r.salle.nom_salle}</span>}{r.ressource && <span className="inline-flex items-center gap-1 text-[10px] bg-orange-500/10 text-orange-300 px-2 py-0.5 rounded border border-orange-500/20"><Box className="w-3 h-3"/> {r.ressource.nom_ressource}</span>}</div></td>
                                <td className="px-6 py-4">{r.employe ? (<div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs text-white font-bold border border-white/10">{r.employe.prenom[0]}{r.employe.nom[0]}</div><div><div className="text-sm text-gray-200">{r.employe.prenom} {r.employe.nom}</div><div className="text-[10px] text-gray-500">{r.employe.email}</div></div></div>) : <span className="text-gray-500 italic text-xs">Utilisateur supprimé</span>}</td>
                                <td className="px-6 py-4 text-xs text-gray-400 font-mono">
                                    <div className="flex flex-col gap-1.5">
                                        <div className="flex items-center gap-2"><span className="text-[10px] font-bold text-green-500 w-4">DU</span><span className="bg-white/5 px-2 py-0.5 rounded text-gray-300 font-mono border border-white/5">{new Date(r.date_debut).toLocaleDateString('fr-FR', {day: '2-digit', month: '2-digit', year: '2-digit'})} <span className="text-gray-500 mx-1">à</span> {new Date(r.date_debut).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span></div>
                                        <div className="flex items-center gap-2"><span className="text-[10px] font-bold text-red-500 w-4">AU</span><span className="bg-white/5 px-2 py-0.5 rounded text-gray-300 font-mono border border-white/5">{new Date(r.date_fin).toLocaleDateString('fr-FR', {day: '2-digit', month: '2-digit', year: '2-digit'})} <span className="text-gray-500 mx-1">à</span> {new Date(r.date_fin).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span></div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all duration-200">
                                        <button onClick={(e) => { e.stopPropagation(); openEdit(r, e); }} className="p-2 rounded-lg hover:bg-blue-500/20 text-blue-400 transition hover:scale-110"><Pencil className="w-4 h-4" /></button>
                                        <button onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(r.id_reservation); }} className="p-2 rounded-lg hover:bg-red-500/20 text-red-400 transition hover:scale-110"><Trash2 className="w-4 h-4" /></button>
                                    </div>
                                </td>
                            </tr>
                        )})}
                    </tbody>
                </table>
            </div>
        </div>

        {/* MODALE DÉTAILS AVEC DATES VISIBLES */}
        {isViewModalOpen && selectedResa && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in zoom-in-95 duration-200" onClick={() => setIsViewModalOpen(false)}>
                <div className="bg-[#0f172a] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
                    
                    <div className="p-6 border-b border-white/10 flex justify-between items-start bg-white/[0.02]">
                        <div>
                            <div className="flex items-center gap-3 mb-2"><h2 className="text-2xl font-bold text-white">{selectedResa.objet}</h2><span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${getStatus(selectedResa.date_debut, selectedResa.date_fin).color}`}>{getStatus(selectedResa.date_debut, selectedResa.date_fin).label}</span></div>
                            <p className="text-gray-400 text-sm font-mono flex items-center gap-2">ID: {selectedResa.id_reservation}</p>
                        </div>
                        <button onClick={() => setIsViewModalOpen(false)} className="text-gray-400 hover:text-white"><X className="w-6 h-6"/></button>
                    </div>

                    <div className="p-6 overflow-y-auto custom-scrollbar space-y-8">
                        {/* 1. INFOS PRINCIPALES */}
                        <div className="grid grid-cols-2 gap-6">
                            <div className="bg-white/5 p-4 rounded-xl border border-white/10"><p className="text-xs font-bold text-gray-500 uppercase mb-3 flex items-center gap-2"><User className="w-3 h-3"/> Organisateur</p><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">{selectedResa.employe?.prenom[0]}</div><div><p className="text-white font-bold">{selectedResa.employe?.prenom} {selectedResa.employe?.nom}</p><p className="text-xs text-gray-400">{selectedResa.employe?.email}</p></div></div></div>
                            <div className="bg-white/5 p-4 rounded-xl border border-white/10"><p className="text-xs font-bold text-gray-500 uppercase mb-3 flex items-center gap-2"><MapPin className="w-3 h-3"/> Lieu & Ressources</p><div className="space-y-2">{selectedResa.salle ? <div className="flex items-center gap-2 text-sm text-blue-300"><MapPin className="w-4 h-4"/> {selectedResa.salle.nom_salle}</div> : <p className="text-gray-600 text-sm italic">Aucune salle</p>}{selectedResa.ressource ? <div className="flex items-center gap-2 text-sm text-orange-300"><Box className="w-4 h-4"/> {selectedResa.ressource.nom_ressource}</div> : <p className="text-gray-600 text-sm italic">Aucun matériel</p>}</div></div>
                        </div>

                        {/* 🆕 2. CRÉNEAU RÉSERVÉ (DATES BIEN VISIBLES) */}
                        <div className="bg-gradient-to-r from-blue-900/10 to-purple-900/10 p-5 rounded-xl border border-white/10 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-blue-500/20 rounded-lg text-blue-400"><CalendarDays className="w-6 h-6"/></div>
                                <div>
                                    <p className="text-xs font-bold text-gray-400 uppercase mb-1">Début</p>
                                    <p className="text-lg font-bold text-white">{new Date(selectedResa.date_debut).toLocaleDateString()}</p>
                                    <p className="text-sm text-blue-300 font-mono">{new Date(selectedResa.date_debut).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p>
                                </div>
                            </div>
                            <ArrowRight className="w-6 h-6 text-gray-600"/>
                            <div className="flex items-center gap-4 text-right">
                                <div>
                                    <p className="text-xs font-bold text-gray-400 uppercase mb-1">Fin</p>
                                    <p className="text-lg font-bold text-white">{new Date(selectedResa.date_fin).toLocaleDateString()}</p>
                                    <p className="text-sm text-purple-300 font-mono">{new Date(selectedResa.date_fin).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p>
                                </div>
                                <div className="p-3 bg-purple-500/20 rounded-lg text-purple-400"><History className="w-6 h-6"/></div>
                            </div>
                        </div>

                        {/* 3. TIMELINE */}
                        <div>
                            <h3 className="text-sm font-bold text-white uppercase mb-4 flex items-center gap-2"><Activity className="w-4 h-4 text-purple-400"/> Historique d'activités</h3>
                            <div className="relative border-l-2 border-white/10 ml-2 space-y-6 pb-2">
                                {logsLoading ? <div className="pl-6"><Loader2 className="w-5 h-5 animate-spin text-blue-500"/></div> : 
                                selectedResaLogs.length === 0 ? (<div className="pl-6 relative"><div className="absolute -left-[5px] top-1 w-2.5 h-2.5 rounded-full bg-green-500 ring-4 ring-[#0f172a]"></div><p className="text-sm text-white font-bold">Création initiale</p><p className="text-xs text-gray-500">{new Date(selectedResa.createdAt || selectedResa.date_debut).toLocaleString()}</p></div>) : 
                                (selectedResaLogs.map((log: any, i: number) => (
                                    <div key={i} className="pl-6 relative group">
                                        <div className={`absolute -left-[5px] top-1 w-2.5 h-2.5 rounded-full ring-4 ring-[#0f172a] ${log.action.includes('CREATION') ? 'bg-green-500' : log.action.includes('MODIF') ? 'bg-blue-500' : 'bg-gray-500'}`}></div>
                                        <p className="text-sm text-white font-bold">{log.action.replace('RESERVATION_', '')}</p>
                                        <p className="text-xs text-gray-400 mt-0.5">{log.details}</p>
                                        <div className="flex items-center gap-2 mt-1 text-[10px] text-gray-500"><User className="w-3 h-3"/> {log.employe ? `${log.employe.prenom} ${log.employe.nom}` : "Système"} <span>•</span> {new Date(log.createdAt).toLocaleString()}</div>
                                    </div>
                                )))}
                            </div>
                        </div>
                    </div>
                    <div className="p-4 bg-white/5 border-t border-white/10 flex justify-end gap-3"><button onClick={() => { setIsViewModalOpen(false); setConfirmDeleteId(selectedResa.id_reservation); }} className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-sm font-bold border border-red-500/20 flex items-center gap-2"><Trash2 className="w-4 h-4"/> Supprimer</button><button onClick={() => { setIsViewModalOpen(false); openEdit(selectedResa, { stopPropagation: ()=>{} }); }} className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-bold flex items-center gap-2 shadow-lg shadow-blue-500/20"><Pencil className="w-4 h-4"/> Modifier</button></div>
                </div>
            </div>
        )}

        {/* MODALE SUPPRESSION */}
        {confirmDeleteId && (<div className="fixed inset-0 bg-black/80 flex justify-center items-center z-[60] backdrop-blur-sm"><div className="glass-panel p-6 rounded-2xl w-full max-w-sm text-center border border-red-500/30"><h3 className="text-lg font-bold text-white mb-2">Confirmer suppression ?</h3><div className="flex gap-3"><button onClick={() => setConfirmDeleteId(null)} className="flex-1 py-2 bg-white/5 rounded-lg text-sm">Annuler</button><button onClick={handleDelete} className="flex-1 bg-red-500 text-white rounded-lg text-sm font-bold">Oui</button></div></div></div>)}
        
        {/* MODALE ÉDITION */}
        {isModalOpen && (<div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"><div className="glass-panel p-8 rounded-2xl w-full max-w-md border border-white/10 bg-[#0f172a]"><button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-gray-400"><X/></button><h2 className="text-xl font-bold text-white mb-6">Modifier</h2><form onSubmit={handleSubmit} className="space-y-4"><input className="glass-input w-full" value={form.objet} onChange={e => setForm({...form, objet: e.target.value})} /><div className="grid grid-cols-2 gap-4"><input type="datetime-local" className="glass-input w-full text-xs [color-scheme:dark]" value={form.date_debut} onChange={e => setForm({...form, date_debut: e.target.value})} /><input type="datetime-local" className="glass-input w-full text-xs [color-scheme:dark]" value={form.date_fin} onChange={e => setForm({...form, date_fin: e.target.value})} /></div><button type="submit" className="w-full btn-neon-blue py-3 rounded-xl font-bold text-white">Sauvegarder</button></form></div></div>)}
      </main>
    </div>
  );
}