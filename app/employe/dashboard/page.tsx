"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { 
  Settings, LogOut, Calendar, AlertTriangle, 
  Briefcase, Clock, MapPin, Loader2, Plus, Trash2, Edit3, X, 
  CalendarRange, FolderOpen, ShieldCheck, User, Box, Search 
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import frLocale from '@fullcalendar/core/locales/fr';

const formatForInput = (d: any) => {
    if (!d) return "";
    try {
        const date = new Date(d);
        const offset = date.getTimezoneOffset() * 60000;
        return (new Date(date.getTime() - offset)).toISOString().slice(0, 16);
    } catch (e) { return ""; }
};

export default function EmployeDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Données
  const [events, setEvents] = useState<any[]>([]);
  const [salles, setSalles] = useState<any[]>([]);
  const [ressources, setRessources] = useState<any[]>([]);
  const [stats, setStats] = useState({ projets: 0, reservations: 0 });
  const [mesProjets, setMesProjets] = useState<any[]>([]);

  // États Modales
  const [showModalEvent, setShowModalEvent] = useState(false); // Modale Détail/Edit
  const [showModalProjets, setShowModalProjets] = useState(false); // Modale Liste Projets
  const [showModalReunions, setShowModalReunions] = useState(false); // Modale Liste Réunions

  const [editMode, setEditMode] = useState(false);

  const [displayEvent, setDisplayEvent] = useState({ title: "", nom_salle: "", nom_ressource: "", nom_projet: "", auteur: "", start: "", end: "", isMine: false });
  const [formData, setFormData] = useState({ id: "", objet: "", start: "", end: "", id_salle: "", id_ressource: "" });

  useEffect(() => {
    const stored = localStorage.getItem("user_info");
    if (!stored) { router.push("/login"); return; }
    try { const userData = JSON.parse(stored); setUser(userData); loadData(userData.id_employe, false); } catch(e) { router.push("/login"); }
  }, [router]);

  const loadData = async (userId: string, isBackground = false) => {
    if (!isBackground) setLoading(true);
    await Promise.all([ 
        fetchReservations(userId), 
        fetchProjets(userId),
        fetch("/api/salles").then(r => r.json()).then(setSalles),
        fetch("/api/ressources?etat=DISPONIBLE").then(r => r.json()).then(setRessources)
    ]);
    if (!isBackground) setLoading(false);
  };

  const fetchReservations = async (currentUserId: string) => {
    try {
        const res = await fetch(`/api/reservations?userId=${currentUserId}&refresh=${Date.now()}`, { cache: 'no-store' });
        if (res.ok) {
            const data = await res.json();
            const formattedEvents = Array.isArray(data) ? data.map((evt: any) => {
                const isMine = evt.id_employe === currentUserId;
                const auteurNom = evt.employe ? `${evt.employe.prenom} ${evt.employe.nom}` : "Inconnu";
                let locationLabel = "Sans lieu";
                if (evt.salle) locationLabel = evt.salle.nom_salle;
                else if (evt.ressource) locationLabel = evt.ressource.nom_ressource;

                return {
                    id: evt.id_reservation, 
                    title: `${evt.objet} - ${locationLabel}`,
                    start: evt.date_debut, 
                    end: evt.date_fin,
                    backgroundColor: isMine ? '#3b82f6' : '#4b5563', 
                    borderColor: isMine ? '#2563eb' : '#374151',
                    textColor: '#ffffff',
                    editable: isMine,
                    extendedProps: {
                        objet: evt.objet,
                        nom_salle: evt.salle?.nom_salle || null,
                        nom_ressource: evt.ressource?.nom_ressource || null,
                        nom_projet: evt.projet?.nom_projet || "Projet Inconnu",
                        auteur: auteurNom,
                        id_salle: evt.id_salle,
                        id_ressource: evt.id_ressource,
                        isMine: isMine
                    }
                };
            }) : [];
            setEvents(formattedEvents); setStats(prev => ({ ...prev, reservations: formattedEvents.length }));
        }
    } catch (e) { console.error(e); }
  };

  const fetchProjets = async (id: string) => {
    try { const res = await fetch(`/api/employes/${id}/projets`); if (res.ok) { const data = await res.json(); setMesProjets(Array.isArray(data) ? data : []); setStats(prev => ({ ...prev, projets: (data as any[]).length })); } } catch (e) { console.error(e); }
  };

  const handleEventDropOrResize = async (info: any) => {
      const { event } = info;
      try {
          const payload = {
              id_reservation: event.id,
              date_debut: event.start.toISOString(),
              date_fin: event.end ? event.end.toISOString() : event.start.toISOString(),
          };
          const res = await fetch("/api/reservations", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
          if (!res.ok) { const err = await res.json(); toast.error(err.error || "Impossible de déplacer"); info.revert(); } 
          else { toast.success("Horaire modifié !"); }
      } catch (e) { toast.error("Erreur serveur"); info.revert(); }
  };

  const handleEventClick = (clickInfo: any) => {
      const event = clickInfo.event; const props = event.extendedProps;
      let startDate = event.start; let endDate = event.end;
      if (!endDate) endDate = new Date(startDate.getTime() + 60 * 60 * 1000);

      setDisplayEvent({ title: props.objet, start: startDate, end: endDate, nom_salle: props.nom_salle, nom_ressource: props.nom_ressource, nom_projet: props.nom_projet, auteur: props.auteur, isMine: props.isMine });
      setFormData({ id: event.id, objet: props.objet, start: formatForInput(startDate), end: formatForInput(endDate), id_salle: props.id_salle || "", id_ressource: props.id_ressource || "" });
      setEditMode(false); setShowModalEvent(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
      e.preventDefault(); e.stopPropagation();
      if (!editMode) return;
      try {
          const payload = { id_reservation: formData.id, id_salle: formData.id_salle || null, id_ressource: formData.id_ressource || null, date_debut: new Date(formData.start).toISOString(), date_fin: new Date(formData.end).toISOString(), objet: formData.objet };
          const res = await fetch("/api/reservations", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
          if(res.ok) { toast.success("Mise à jour réussie !"); await loadData(user.id_employe, true); setEditMode(false); } else { const err = await res.json(); toast.error(err.error || "Erreur"); }
      } catch (err) { toast.error("Erreur serveur"); }
  };

  const handleDelete = async () => {
      if(!window.confirm("Supprimer cette réservation ?")) return;
      try { const res = await fetch(`/api/reservations?id=${formData.id}`, { method: "DELETE" }); if(res.ok) { toast.success("Supprimé"); setShowModalEvent(false); loadData(user.id_employe, false); } else { toast.error("Erreur"); } } catch(err) { toast.error("Erreur serveur"); }
  };

  const handleLogout = async () => { await fetch("/api/auth/logout", { method: "POST" }); localStorage.removeItem("user_info"); router.push("/login"); };
  if (!user) return <div className="min-h-screen bg-[#030712] flex items-center justify-center"><Loader2 className="animate-spin text-white"/></div>;

  const Container = editMode ? 'form' : 'div';

  return (
    <div className="min-h-screen bg-[#030712] text-gray-200 p-6 md:p-10">
      
      {/* --- STYLES CALENDRIER PREMIUM --- */}
      <style jsx global>{`
        .fc { color: #9ca3af; font-family: 'Inter', sans-serif; }
        .fc-theme-standard td, .fc-theme-standard th { border-color: rgba(255,255,255,0.05); }
        .fc-toolbar-title { color: white; font-size: 1.5rem !important; font-weight: 800; }
        .fc-button { background-color: rgba(255, 255, 255, 0.05) !important; border: 1px solid rgba(255, 255, 255, 0.1) !important; color: white !important; font-weight: 600; text-transform: capitalize; border-radius: 8px !important; padding: 8px 16px !important; }
        .fc-button:hover { background-color: rgba(59, 130, 246, 0.2) !important; border-color: #3b82f6 !important; color: white !important; }
        .fc-button-active { background-color: #2563EB !important; border-color: #2563EB !important; color: white !important; }
        .fc-timegrid-slot-label { color: #6b7280; font-size: 0.8rem; }
        .fc-col-header-cell-cushion { color: #e5e7eb; padding: 10px 0 !important; font-weight: 600; text-transform: uppercase; font-size: 0.8rem; letter-spacing: 0.05em; }
        .fc-event { border: none; border-radius: 6px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); padding: 2px 4px; font-size: 0.85rem; font-weight: 500; }
        .fc-timegrid-now-indicator-line { border-color: #ef4444; border-width: 2px; }
        .fc-timegrid-now-indicator-arrow { border-color: #ef4444; border-width: 6px; }
        .fc-day-today { background-color: rgba(59, 130, 246, 0.02) !important; }
      `}</style>
      
      <div className="max-w-[1600px] mx-auto space-y-8 animate-fade-in">
        
        {/* HEADER */}
        <header className="flex flex-col md:flex-row justify-between items-center glass-panel p-6 rounded-2xl shadow-lg border border-white/5">
            <div className="flex items-center gap-4"><div className="relative h-12 w-12 flex-shrink-0"><Image src="/logo.png" alt="Logo" width={48} height={48} className="object-contain" priority /></div><div><h1 className="text-2xl font-bold text-white">Espace Employé</h1><p className="text-gray-400 text-sm">Bonjour, <span className="text-blue-400 font-bold">{user.prenom}</span>.</p></div></div>
            <div className="flex gap-3 mt-4 md:mt-0">{user.role === "ADMIN" && (<button onClick={() => router.push('/admin/dashboard')} className="px-4 py-2 rounded-xl bg-purple-600/10 border border-purple-500/30 text-purple-400 font-bold flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> Vue Admin</button>)}<button onClick={() => router.push('/employe/profile')} className="px-4 py-2 rounded-xl border border-white/10 hover:bg-white/5 font-bold text-gray-300 flex items-center gap-2"><Settings className="w-4 h-4" /> Profil</button><button onClick={handleLogout} className="btn-neon-red px-4 py-2 rounded-xl font-bold flex items-center gap-2"><LogOut className="w-4 h-4" /> Déconnexion</button></div>
        </header>

        {/* WIDGETS CLIQUABLES */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div onClick={() => setShowModalProjets(true)} className="glass-panel p-5 rounded-2xl border-l-4 border-blue-500 flex items-center justify-between cursor-pointer hover:bg-white/5 transition group">
                <div><p className="text-xs text-blue-400 font-bold uppercase group-hover:text-blue-300 transition">Mes Projets</p><p className="text-3xl font-bold text-white">{stats.projets}</p></div>
                <div className="p-3 bg-blue-500/10 rounded-xl text-blue-500 group-hover:bg-blue-500/20 transition"><Briefcase className="w-6 h-6" /></div>
            </div>
            
            <div onClick={() => setShowModalReunions(true)} className="glass-panel p-5 rounded-2xl border-l-4 border-purple-500 flex items-center justify-between cursor-pointer hover:bg-white/5 transition group">
                <div><p className="text-xs text-purple-400 font-bold uppercase group-hover:text-purple-300 transition">Réunions</p><p className="text-3xl font-bold text-white">{stats.reservations}</p></div>
                <div className="p-3 bg-purple-500/10 rounded-xl text-purple-500 group-hover:bg-purple-500/20 transition"><CalendarRange className="w-6 h-6" /></div>
            </div>
            
            <div onClick={() => router.push('/employe/reservations')} className="glass-panel p-1 rounded-2xl border border-white/10 hover:border-blue-500/50 cursor-pointer transition active:scale-95"><div className="h-full flex flex-col items-center justify-center p-4"><div className="mb-2 p-3 bg-white/5 rounded-full text-blue-400"><Plus className="w-6 h-6" /></div><span className="text-sm font-bold text-gray-300">Réserver</span></div></div>
            <div onClick={() => router.push('/employe/incidents')} className="glass-panel p-1 rounded-2xl border border-white/10 hover:border-red-500/50 cursor-pointer transition active:scale-95"><div className="h-full flex flex-col items-center justify-center p-4"><div className="mb-2 p-3 bg-white/5 rounded-full text-red-400"><AlertTriangle className="w-6 h-6" /></div><span className="text-sm font-bold text-gray-300">Signaler</span></div></div>
        </div>

        {/* CALENDRIER PLEINE LARGEUR */}
        <div className="glass-panel p-6 rounded-2xl shadow-2xl border border-white/10">
            <div className="h-[750px] overflow-hidden rounded-xl bg-[#0f172a]/40 border border-white/5">
                <FullCalendar 
                    plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]} 
                    initialView="timeGridWeek" 
                    locale={frLocale} 
                    events={events} 
                    eventClick={handleEventClick} 
                    eventDrop={handleEventDropOrResize} 
                    eventResize={handleEventDropOrResize} 
                    editable={true} 
                    nowIndicator={true} 
                    allDaySlot={false} 
                    slotMinTime="07:00:00" 
                    slotMaxTime="21:00:00" 
                    height="100%"
                    headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay' }} 
                />
            </div>
        </div>

      </div>

      {/* --- MODALE DÉTAIL / EDIT (La même qu'avant) --- */}
      {showModalEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setShowModalEvent(false)}>
            <div className="glass-panel w-full max-w-md p-8 rounded-2xl border border-white/10 bg-[#0f172a] shadow-2xl relative" onClick={(e) => e.stopPropagation()}>
                <button onClick={() => setShowModalEvent(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white transition"><X className="w-5 h-5" /></button>
                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">{editMode ? <Edit3 className="w-5 h-5 text-blue-400" /> : <Calendar className="w-5 h-5 text-purple-400" />}{editMode ? "Modifier" : "Détails"}</h2>
                {/* @ts-ignore */}
                <Container onSubmit={editMode ? handleUpdate : undefined} className="space-y-5">
                    <div><label className="text-xs uppercase font-bold text-gray-500 mb-1.5 block">Objet</label>{editMode ? (<input type="text" className="glass-input w-full" value={formData.objet} onChange={e => setFormData({...formData, objet: e.target.value})} />) : (<div className="text-white font-medium text-lg">{displayEvent.title}</div>)}</div>
                    {!editMode && (<div className="bg-purple-500/10 p-3 rounded-lg border border-purple-500/20 flex items-center gap-3"><div className="p-2 bg-purple-500/20 rounded-full text-purple-400"><User className="w-4 h-4" /></div><div><p className="text-[10px] uppercase font-bold text-purple-300">Réservé par</p><p className="text-sm font-bold text-white">Moi ({displayEvent.auteur})</p></div></div>)}
                    <div><label className="text-xs uppercase font-bold text-gray-500 mb-1.5 block">Lieu / Matériel</label>{editMode ? (<div className="space-y-2"><select className="glass-input w-full bg-[#0f172a]" value={formData.id_salle} onChange={e => setFormData({...formData, id_salle: e.target.value, id_ressource: ""})}><option value="">-- Aucune Salle --</option>{salles.map(s => <option key={s.id_salle} value={s.id_salle}>{s.nom_salle}</option>)}</select><select className="glass-input w-full bg-[#0f172a]" value={formData.id_ressource} onChange={e => setFormData({...formData, id_ressource: e.target.value, id_salle: ""})}><option value="">-- Aucun Matériel --</option>{ressources.map(r => <option key={r.id_ressource} value={r.id_ressource}>{r.nom_ressource}</option>)}</select><p className="text-[10px] text-gray-500">* Sélectionnez soit une salle, soit un matériel.</p></div>) : (<div className="flex items-center gap-2 text-sm text-gray-300 bg-white/5 p-3 rounded-lg border border-white/5">{displayEvent.nom_salle ? <MapPin className="w-4 h-4 text-blue-400" /> : <Box className="w-4 h-4 text-yellow-400" />}<span className="font-bold">{displayEvent.nom_salle || displayEvent.nom_ressource || "Aucun lieu défini"}</span><span className="text-gray-600">|</span><Briefcase className="w-4 h-4 text-purple-400" /><span>{displayEvent.nom_projet}</span></div>)}</div>
                    <div className="grid grid-cols-2 gap-4"><div><label className="text-xs uppercase font-bold text-gray-500 mb-1.5 block">Début</label>{editMode ? <input type="datetime-local" className="glass-input w-full text-xs" value={formData.start} onChange={e => setFormData({...formData, start: e.target.value})}/> : <div className="text-gray-300 text-sm flex items-center gap-2"><Clock className="w-3 h-3 text-gray-500" />{displayEvent.start ? new Date(displayEvent.start).toLocaleString() : "-"}</div>}</div><div><label className="text-xs uppercase font-bold text-gray-500 mb-1.5 block">Fin</label>{editMode ? <input type="datetime-local" className="glass-input w-full text-xs" value={formData.end} onChange={e => setFormData({...formData, end: e.target.value})}/> : <div className="text-gray-300 text-sm flex items-center gap-2"><Clock className="w-3 h-3 text-gray-500" />{displayEvent.end ? new Date(displayEvent.end).toLocaleString() : "-"}</div>}</div></div>
                    <div className="flex gap-3 pt-6 border-t border-white/10 mt-2">{editMode ? (<><button type="button" onClick={() => setEditMode(false)} className="flex-1 py-2.5 rounded-xl border border-white/10 text-gray-400 hover:text-white transition text-sm">Annuler</button><button type="submit" className="flex-1 btn-neon-blue py-2.5 rounded-xl font-bold text-white text-sm">Sauvegarder</button></>) : (<><button type="button" onClick={handleDelete} className="px-4 py-2.5 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 transition text-sm flex items-center gap-2"><Trash2 className="w-4 h-4" /> Supprimer</button><button type="button" onClick={() => setEditMode(true)} className="flex-1 btn-neon-blue py-2.5 rounded-xl font-bold text-white text-sm flex items-center justify-center gap-2"><Edit3 className="w-4 h-4" /> Modifier</button></>)}</div>
                </Container>
            </div>
        </div>
      )}

      {/* --- MODALE LISTE PROJETS --- */}
      {showModalProjets && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setShowModalProjets(false)}>
            <div className="glass-panel w-full max-w-2xl p-8 rounded-2xl border border-white/10 bg-[#0f172a] shadow-2xl relative max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <button onClick={() => setShowModalProjets(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white transition"><X className="w-5 h-5" /></button>
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2"><FolderOpen className="w-6 h-6 text-blue-400" /> Mes Projets</h2>
                <div className="space-y-4">
                    {mesProjets.length > 0 ? mesProjets.map(p => (
                        <div key={p.id_projet} className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-blue-500/30 transition flex justify-between items-center">
                            <div><h3 className="font-bold text-white text-lg">{p.nom_projet}</h3><p className="text-gray-400 text-sm mt-1">{p.description || "Pas de description"}</p></div>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${p.statut === 'EN_COURS' ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-700 text-gray-400'}`}>{p.statut}</span>
                        </div>
                    )) : <div className="text-center py-10 text-gray-500">Aucun projet.</div>}
                </div>
            </div>
        </div>
      )}

      {/* --- MODALE LISTE RÉUNIONS --- */}
      {showModalReunions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setShowModalReunions(false)}>
            <div className="glass-panel w-full max-w-2xl p-8 rounded-2xl border border-white/10 bg-[#0f172a] shadow-2xl relative max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <button onClick={() => setShowModalReunions(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white transition"><X className="w-5 h-5" /></button>
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2"><CalendarRange className="w-6 h-6 text-purple-400" /> Toutes mes Réunions</h2>
                <div className="space-y-4">
                    {events.length > 0 ? events.sort((a,b) => new Date(a.start).getTime() - new Date(b.start).getTime()).map(e => (
                        <div key={e.id} className="p-4 rounded-xl bg-white/5 border border-white/10 flex gap-4 items-center cursor-pointer hover:bg-white/10 transition" onClick={() => { setShowModalReunions(false); handleEventClick({ event: { ...e, extendedProps: e.extendedProps, start: new Date(e.start), end: new Date(e.end), id: e.id } }); }}>
                            <div className="flex flex-col items-center justify-center bg-purple-500/20 p-3 rounded-lg w-16 text-purple-300">
                                <span className="text-xs font-bold uppercase">{new Date(e.start).toLocaleString('fr-FR', { month: 'short' })}</span>
                                <span className="text-xl font-bold">{new Date(e.start).getDate()}</span>
                            </div>
                            <div>
                                <h3 className="font-bold text-white">{e.extendedProps.objet}</h3>
                                <p className="text-xs text-gray-400 flex items-center gap-2 mt-1"><Clock className="w-3 h-3"/> {new Date(e.start).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} - {new Date(e.end).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} | {e.extendedProps.nom_salle || e.extendedProps.nom_ressource || "Sans lieu"}</p>
                            </div>
                        </div>
                    )) : <div className="text-center py-10 text-gray-500">Aucune réunion prévue.</div>}
                </div>
            </div>
        </div>
      )}

    </div>
  );
}