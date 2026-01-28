"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { 
  Settings, LogOut, Calendar, AlertTriangle, Briefcase, Clock, MapPin, Loader2, 
  Plus, Trash2, Edit3, X, FolderOpen, ShieldCheck, User, 
  CheckCircle2, BellRing, StickyNote, Sun, XCircle, Box
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import frLocale from '@fullcalendar/core/locales/fr';
import { can, canAssignTasks, canAccessAdminPanel } from "@/lib/permissions";

// Formatage Date pour input
const formatForInput = (d: any) => {
    if (!d) return "";
    try {
        const date = new Date(d);
        const offset = date.getTimezoneOffset() * 60000;
        return (new Date(date.getTime() - offset)).toISOString().slice(0, 16);
    } catch (e) { return ""; }
};

function renderEventContent(eventInfo: any) {
    const props = eventInfo.event.extendedProps;
    if (props.type === 'CONGE') {
        const isMe = props.isMine;
        return (
            <div className={`w-full h-full p-1 flex items-center gap-2 rounded-md border-l-4 ${isMe ? 'bg-green-500/20 border-green-500 text-green-400' : 'bg-orange-500/20 border-orange-500 text-orange-400'} overflow-hidden`}>
                <Sun className="w-3 h-3 flex-shrink-0" />
                <span className="text-[10px] font-bold truncate">{eventInfo.event.title}</span>
            </div>
        );
    }
    const isMine = props.isMine;
    return (
      <div className={`w-full h-full p-1.5 flex flex-col justify-start rounded-md border-l-4 ${isMine ? 'border-blue-400 bg-blue-600/20' : 'border-gray-500 bg-gray-700/20'} overflow-hidden`}>
        <div className="flex items-center gap-1 text-[10px] font-bold opacity-80 uppercase tracking-wider mb-0.5">
            <Clock className="w-3 h-3" />
            {eventInfo.timeText}
        </div>
        <div className="font-bold text-xs truncate leading-tight">{eventInfo.event.title}</div>
        <div className="flex flex-col gap-0.5 mt-1">
            {props.nom_salle && <div className="text-[9px] flex items-center gap-1 opacity-70 truncate"><MapPin className="w-2.5 h-2.5" /> {props.nom_salle}</div>}
            {props.nom_ressource && <div className="text-[9px] flex items-center gap-1 opacity-70 truncate text-orange-300"><Box className="w-2.5 h-2.5" /> {props.nom_ressource}</div>}
        </div>
      </div>
    );
}

export default function EmployeDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [allSalles, setAllSalles] = useState<any[]>([]);
  const [allRessources, setAllRessources] = useState<any[]>([]);
  const [dispoSalles, setDispoSalles] = useState<any[]>([]);
  const [dispoRessources, setDispoRessources] = useState<any[]>([]);
  const [checkingDispo, setCheckingDispo] = useState(false);

  const [events, setEvents] = useState<any[]>([]);
  const [mesProjets, setMesProjets] = useState<any[]>([]);
  const [mesTaches, setMesTaches] = useState<any[]>([]);
  const [mesNotes, setMesNotes] = useState<any[]>([]);
  const [mesConges, setMesConges] = useState<any[]>([]);
  
  const [stats, setStats] = useState({ projets: 0, reservations: 0, taches: 0 });

  const [showModalEvent, setShowModalEvent] = useState(false);
  const [showModalProjets, setShowModalProjets] = useState(false);
  const [showModalAssignTask, setShowModalAssignTask] = useState(false);
  const [showModalConges, setShowModalConges] = useState(false);

  const [editMode, setEditMode] = useState(false);
  const [displayEvent, setDisplayEvent] = useState<any>({});
  const [formData, setFormData] = useState({ id: "", objet: "", start: "", end: "", id_salle: "", id_ressource: "" });
  
  const [taskForm, setTaskForm] = useState({ titre: "", id_assigne_a: "", id_projet: "" });
  const [congeForm, setCongeForm] = useState({ type: "VACANCES", date_debut: "", date_fin: "", commentaire: "" });
  const [projetCible, setProjetCible] = useState<any>(null);
  const [equipeProjet, setEquipeProjet] = useState<any[]>([]);

  const [noteInput, setNoteInput] = useState("");
  const [noteToPlanId, setNoteToPlanId] = useState<string | null>(null);
  const [taskToPlanId, setTaskToPlanId] = useState<string | null>(null);

  // 🛑 DATE MINIMUM (MAINTENANT)
  const [minDate, setMinDate] = useState("");

  useEffect(() => {
    const checkSession = async () => {
        try {
            const res = await fetch("/api/auth/session");
            if (!res.ok) { localStorage.removeItem("user_info"); router.push("/login"); return; }
            const updatedUser = await res.json();
            setUser(updatedUser);
            
            // 🛑 Initialiser la date min à "Maintenant"
            setMinDate(formatForInput(new Date()));

            loadData(updatedUser.id_employe, updatedUser.role);
        } catch (e) { router.push("/login"); }
    };
    checkSession();
  }, [router]);

  useEffect(() => {
      if (showModalEvent && editMode && formData.start && formData.end) {
          checkAvailability();
      }
  }, [formData.start, formData.end, showModalEvent, editMode]);

  const checkAvailability = async () => {
      setCheckingDispo(true);
      try {
          const params = new URLSearchParams({
              start: new Date(formData.start).toISOString(),
              end: new Date(formData.end).toISOString(),
              ignoreId: formData.id || "" 
          });
          const res = await fetch(`/api/disponibilites?${params}`);
          if (res.ok) {
              const data = await res.json();
              setDispoSalles(data.salles);
              setDispoRessources(data.ressources);
          }
      } catch (e) { console.error("Erreur dispo"); }
      setCheckingDispo(false);
  };

  const loadData = async (userId: string, role: string) => {
    setLoading(true);
    const promises = [
        fetchReservations(userId, role),
        fetch(`/api/employes/${userId}/projets`).then(r => r.json()),
        fetch("/api/salles").then(r => r.json()),
        fetch("/api/ressources?etat=DISPONIBLE").then(r => r.json()),
        fetch(`/api/taches?userId=${userId}`).then(r => r.json()),
        fetch(`/api/notes?userId=${userId}`).then(r => r.json()),
        fetch(`/api/conges?userId=${userId}`).then(r => r.json()) 
    ];

    if (canAssignTasks(role)) {
        promises.push(fetch("/api/employes").then(r => r.json()));
    }

    const [resas, projets, sallesData, ressourcesData, tachesData, notesData, congesData] = await Promise.all(promises);

    setAllSalles(sallesData);
    setAllRessources(ressourcesData);
    setDispoSalles(sallesData); 
    setDispoRessources(ressourcesData);

    setMesProjets(Array.isArray(projets) ? projets : []);
    setMesTaches(Array.isArray(tachesData) ? tachesData : []);
    setMesNotes(Array.isArray(notesData) ? notesData : []);
    setMesConges(Array.isArray(congesData) ? congesData : []);

    setStats({
        reservations: (resas as any)?.length || 0,
        projets: (projets as any)?.length || 0,
        taches: (tachesData as any)?.filter((t:any) => t.statut === 'A_FAIRE').length || 0
    });

    setLoading(false);
  };

  const fetchReservations = async (userId: string, role: string) => {
      let finalEvents: any[] = [];
      const resResa = await fetch(`/api/reservations?userId=${userId}&refresh=${Date.now()}`);
      if(resResa.ok) {
          const dataResa = await resResa.json();
          const resaEvents = dataResa.map((evt: any) => ({
             id: evt.id_reservation,
             title: evt.objet,
             start: evt.date_debut, end: evt.date_fin,
             backgroundColor: 'transparent', borderColor: 'transparent',
             editable: evt.id_employe === userId,
             extendedProps: { isMine: evt.id_employe === userId, nom_salle: evt.salle?.nom_salle, nom_ressource: evt.ressource?.nom_ressource, type: 'RESERVATION' }
          }));
          finalEvents = [...finalEvents, ...resaEvents];
      }
      const param = role === 'CHEF_DE_PROJET' ? `managerId=${userId}` : `userId=${userId}`;
      const resConges = await fetch(`/api/conges?${param}`);
      if(resConges.ok) {
          const dataConges = await resConges.json();
          const congesEvents = dataConges.map((c: any) => ({
              id: c.id_conge,
              title: c.id_employe === userId ? `🌴 Mon Congé` : `⛔ ${c.employe.prenom} ${c.employe.nom[0]}.`,
              start: c.date_debut,
              end: c.date_fin,
              allDay: true,
              backgroundColor: 'transparent', borderColor: 'transparent',
              editable: false,
              extendedProps: { isMine: c.id_employe === userId, type: 'CONGE' }
          }));
          finalEvents = [...finalEvents, ...congesEvents];
      }
      setEvents(finalEvents);
      return finalEvents;
  };

  const handleEventClick = (info: any) => {
      const event = info.event; const props = event.extendedProps; if (props.type === 'CONGE') return;
      setDisplayEvent({ title: event.title, start: event.start, end: event.end, isMine: props.isMine, nom_salle: props.nom_salle || "Aucune salle", nom_ressource: props.nom_ressource || "Aucun matériel" });
      setFormData({ id: event.id, objet: event.title, start: formatForInput(event.start), end: formatForInput(event.end), id_salle: props.id_salle || "", id_ressource: props.id_ressource || "" });
      setEditMode(false); setShowModalEvent(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
      e.preventDefault();
      
      // 🛑 VÉRIFICATION FRONTEND : PAS DE PASSÉ
      if (new Date(formData.start) < new Date()) {
          return toast.error("⛔ Impossible de planifier dans le passé !");
      }

      try {
          const payload = { ...formData, date_debut: new Date(formData.start).toISOString(), date_fin: new Date(formData.end).toISOString() };
          const method = formData.id ? "PUT" : "POST";
          const bodyPayload = formData.id ? { ...payload, id_reservation: formData.id } : { ...payload, id_employe: user.id_employe };
          
          const res = await fetch("/api/reservations", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(bodyPayload) });
          
          if(res.ok) { 
              toast.success("Sauvegardé !"); 
              if (noteToPlanId) { await handleDeleteNote(noteToPlanId); setNoteToPlanId(null); }
              if (taskToPlanId) { await fetch("/api/taches", { method: "PUT", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ id_tache: taskToPlanId, statut: "PLANIFIE" }) }); setTaskToPlanId(null); }
              loadData(user.id_employe, user.role); 
              setShowModalEvent(false); 
          } else { 
              const err = await res.json();
              toast.error(err.error || "Erreur conflit"); 
          }
      } catch (err) { toast.error("Erreur"); }
  };

  const handleAddNote = async (e: React.FormEvent) => {
      e.preventDefault(); if(!noteInput.trim()) return;
      try { await fetch("/api/notes", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ contenu: noteInput, id_employe: user.id_employe }) }); setNoteInput(""); const newNotes = await fetch(`/api/notes?userId=${user.id_employe}`).then(r => r.json()); setMesNotes(newNotes); toast.success("Note ajoutée"); } catch(e) { toast.error("Erreur"); }
  };
  const handleDeleteNote = async (id_note: string) => { await fetch(`/api/notes?id=${id_note}`, { method: "DELETE" }); setMesNotes(mesNotes.filter(n => n.id_note !== id_note)); };
  
  const handlePlanNote = (note: any) => {
      const now = new Date(); const end = new Date(now.getTime() + 60*60*1000); 
      setFormData({ id: "", objet: note.contenu, start: formatForInput(now), end: formatForInput(end), id_salle: "", id_ressource: "" });
      setNoteToPlanId(note.id_note); setEditMode(true); setShowModalEvent(true);
  };

  const handlePlanTask = (tache: any) => {
      const now = new Date(); const end = new Date(now.getTime() + 60*60*1000); 
      setFormData({ id: "", objet: `Travail : ${tache.titre}`, start: formatForInput(now), end: formatForInput(end), id_salle: "", id_ressource: "" });
      setTaskToPlanId(tache.id_tache); setEditMode(true); setShowModalEvent(true);
  };

  const handleFinishTask = async (id_tache: string) => { await fetch("/api/taches", { method: "PUT", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ id_tache, statut: "TERMINE" }) }); toast.success("Tâche terminée !"); loadData(user.id_employe, user.role); };
  const handleRequestConge = async (e: React.FormEvent) => {
      e.preventDefault();
      try { const res = await fetch("/api/conges", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ ...congeForm, id_employe: user.id_employe }) }); if(res.ok) { toast.success("Demande envoyée !"); setCongeForm({ type: "VACANCES", date_debut: "", date_fin: "", commentaire: "" }); setShowModalConges(false); loadData(user.id_employe, user.role); } else { toast.error("Erreur envoi"); } } catch(e) { toast.error("Erreur serveur"); }
  };
  const handleOpenAssign = async (projet: any) => { setProjetCible(projet); setTaskForm({ titre: "", id_assigne_a: "", id_projet: "" }); try { const res = await fetch(`/api/projets/${projet.id_projet}/membres`); if (res.ok) { const membres = await res.json(); const uniqueMembres = membres.filter((v:any,i:any,a:any)=>a.findIndex((t:any)=>(t.id_employe===v.id_employe))===i); setEquipeProjet(uniqueMembres.filter((m: any) => m.id_employe !== user.id_employe)); setShowModalAssignTask(true); } } catch(e) { toast.error("Erreur équipe"); } };
  const handleAssignTask = async (e: React.FormEvent) => { e.preventDefault(); if (!projetCible) return; try { const res = await fetch("/api/taches", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ ...taskForm, id_projet: projetCible.id_projet, id_assigne_par: user.id_employe }) }); if(res.ok) { toast.success("Tâche envoyée !"); setShowModalAssignTask(false); } else { const err = await res.json(); toast.error(err.error || "Erreur"); } } catch(err) { toast.error("Erreur"); } };
  const handleDelete = async () => { if(!window.confirm("Supprimer ?")) return; await fetch(`/api/reservations?id=${formData.id}`, { method: "DELETE" }); loadData(user.id_employe, user.role); setShowModalEvent(false); };
  const handleEventDropOrResize = async (info: any) => { if (!info.event.extendedProps.isMine || info.event.extendedProps.type === 'CONGE') { info.revert(); return; } const payload = { id_reservation: info.event.id, date_debut: info.event.start.toISOString(), date_fin: info.event.end.toISOString() }; await fetch("/api/reservations", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }); };
  const handleLogout = async () => { await fetch("/api/auth/logout", { method: "POST" }); localStorage.removeItem("user_info"); router.push("/login"); };

  if (!user) return <div className="min-h-screen bg-[#030712] flex items-center justify-center"><Loader2 className="animate-spin text-white"/></div>;

  const isOwner = displayEvent.isMine;
  const canEdit = can(user.role, "RESERVATION", "UPDATE", isOwner);
  const canDelete = can(user.role, "RESERVATION", "DELETE", isOwner);
  const Container = editMode ? 'form' : 'div';

  return (
    <div className="min-h-screen bg-[#030712] text-gray-200 p-6 md:p-8 flex flex-col">
      <style jsx global>{` .fc { font-family: 'Inter', sans-serif; border: none !important; } .fc-toolbar-title { font-size: 1.8rem !important; font-weight: 800; background: linear-gradient(to right, #60a5fa, #a78bfa); -webkit-background-clip: text; color: transparent; text-transform: capitalize; } .fc-button-primary { background-color: rgba(255, 255, 255, 0.05) !important; border: 1px solid rgba(255, 255, 255, 0.1) !important; color: white !important; font-weight: 600; border-radius: 9999px !important; padding: 8px 16px !important; transition: all 0.2s; } .fc-button-primary:hover { background-color: rgba(59, 130, 246, 0.2) !important; border-color: #3b82f6 !important; } .fc-button-active { background-color: #2563EB !important; border-color: #2563EB !important; box-shadow: 0 0 15px rgba(37,99,235,0.4); } .fc-theme-standard td, .fc-theme-standard th { border-color: rgba(255,255,255,0.03) !important; } .fc-timegrid-slot { height: 40px !important; } .fc-timegrid-slot-label { font-size: 0.75rem; color: #6b7280; font-weight: 500; } .fc-timegrid-now-indicator-line { border-color: #ef4444; border-width: 2px; box-shadow: 0 0 10px #ef4444; } .fc-timegrid-now-indicator-arrow { border-color: #ef4444; border-width: 6px; } .fc-day-today { background-color: rgba(59, 130, 246, 0.03) !important; } .fc-col-header-cell-cushion { color: #e5e7eb; padding: 15px 0 !important; font-weight: 700; text-transform: uppercase; font-size: 0.85rem; letter-spacing: 0.05em; } .fc-event { background: transparent !important; border: none !important; box-shadow: none !important; } `}</style>

      <div className="max-w-[1920px] mx-auto w-full space-y-6 animate-fade-in flex-1 flex flex-col">
        <header className="flex justify-between items-center glass-panel px-6 py-4 rounded-2xl border border-white/5">
             <div className="flex items-center gap-4"><div className="relative h-10 w-10"><Image src="/logo.png" alt="Logo" width={40} height={40} className="object-contain"/></div><div><h1 className="text-xl font-bold text-white tracking-tight">Nexus<span className="text-blue-500">Pharm</span></h1><p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Espace {user.role?.replace('_', ' ')}</p></div></div>
             <div className="flex gap-2">
                {canAccessAdminPanel(user.role) && <button onClick={() => router.push('/admin/dashboard')} className="px-4 py-2 rounded-xl bg-purple-600/10 border border-purple-500/30 text-purple-400 font-bold flex items-center gap-2 hover:bg-purple-600/20 transition"><ShieldCheck className="w-4 h-4"/> Admin</button>}
                {user.role === 'RH' && <button onClick={() => router.push('/rh/dashboard')} className="px-4 py-2 rounded-xl bg-pink-600/10 border border-pink-500/30 text-pink-400 font-bold flex items-center gap-2 hover:bg-pink-600/20 transition"><User className="w-4 h-4"/> Espace RH</button>}
                <button onClick={() => router.push('/employe/profile')} className="p-2 rounded-xl border border-white/10 hover:bg-white/5 text-gray-300 transition"><Settings className="w-5 h-5"/></button>
                <button onClick={handleLogout} className="p-2 rounded-xl border border-red-500/20 hover:bg-red-500/10 text-red-400 transition"><LogOut className="w-5 h-5"/></button>
             </div>
        </header>

        <div className="flex flex-col lg:flex-row gap-6 h-full flex-1">
            <div className="lg:w-[320px] space-y-4 flex flex-col h-full">
                <div className="grid grid-cols-2 gap-3">
                    <div className="glass-panel p-4 rounded-xl border-l-2 border-blue-500 bg-gradient-to-br from-blue-500/5 to-transparent"><p className="text-[10px] text-blue-400 font-bold uppercase mb-1">Projets</p><p className="text-2xl font-bold text-white">{stats.projets}</p></div>
                    <div className="glass-panel p-4 rounded-xl border-l-2 border-orange-500 bg-gradient-to-br from-orange-500/5 to-transparent"><p className="text-[10px] text-orange-400 font-bold uppercase mb-1">Tâches</p><p className="text-2xl font-bold text-white">{stats.taches}</p></div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                    <button onClick={() => router.push('/employe/reservations')} className="p-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl flex items-center justify-center transition shadow-lg shadow-blue-900/20"><Plus className="w-5 h-5"/></button>
                    <button onClick={() => setShowModalConges(true)} className="p-3 bg-pink-600 hover:bg-pink-500 text-white rounded-xl flex items-center justify-center transition shadow-lg shadow-pink-900/20" title="Poser des congés"><Sun className="w-5 h-5"/></button>
                    <button onClick={() => router.push('/employe/incidents')} className="p-3 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl flex items-center justify-center transition border border-white/5"><AlertTriangle className="w-5 h-5"/></button>
                </div>
                <div className="glass-panel p-5 rounded-2xl border border-white/10 flex-1 min-h-[200px] flex flex-col">
                    <h3 className="font-bold text-white text-sm mb-3 flex items-center gap-2"><StickyNote className="w-4 h-4 text-yellow-400"/> Notes Rapides</h3>
                    <form onSubmit={handleAddNote} className="flex gap-2 mb-3">
                        <input type="text" className="glass-input w-full text-xs py-2" placeholder="Ajouter une note..." value={noteInput} onChange={e => setNoteInput(e.target.value)} />
                        <button type="submit" className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition"><Plus className="w-4 h-4"/></button>
                    </form>
                    <div className="space-y-2 overflow-y-auto flex-1 pr-1 custom-scrollbar">
                        {mesNotes.length === 0 && <p className="text-gray-600 text-xs italic text-center mt-4">Aucune note.</p>}
                        {mesNotes.map(note => (<div key={note.id_note} className="p-3 bg-white/5 rounded-lg border border-white/5 flex justify-between items-start group hover:border-blue-500/30 transition"><p className="text-gray-300 text-xs leading-relaxed">{note.contenu}</p><div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition ml-2"><button onClick={() => handlePlanNote(note)} className="text-blue-400 hover:text-white"><Calendar className="w-3 h-3"/></button><button onClick={() => handleDeleteNote(note.id_note)} className="text-red-400 hover:text-white"><X className="w-3 h-3"/></button></div></div>))}
                    </div>
                </div>
                <div className="glass-panel p-5 rounded-2xl border border-white/10 flex-1 min-h-[200px] flex flex-col">
                    <h3 className="font-bold text-white text-sm mb-3 flex items-center gap-2"><BellRing className="w-4 h-4 text-orange-400"/> Tâches Assignées</h3>
                    <div className="space-y-2 overflow-y-auto flex-1 pr-1 custom-scrollbar">
                        {mesTaches.filter(t => t.statut === 'A_FAIRE').length === 0 && <p className="text-gray-600 text-xs italic text-center mt-4">Tout est à jour !</p>}
                        {mesTaches.filter(t => t.statut === 'A_FAIRE').map(t => (<div key={t.id_tache} className="p-3 bg-white/5 rounded-lg border border-white/5 hover:border-orange-500/30 transition"><div className="flex justify-between"><p className="text-white font-bold text-xs">{t.titre}</p>{t.projet && <span className="text-[9px] bg-blue-500/10 text-blue-300 px-1.5 py-0.5 rounded border border-blue-500/20">{t.projet.nom_projet}</span>}</div><p className="text-[10px] text-gray-500 mt-1">De : {t.assigne_par.prenom}</p><div className="flex gap-2 mt-2"><button onClick={() => handlePlanTask(t)} className="flex-1 text-[10px] bg-blue-600/10 text-blue-400 py-1 rounded hover:bg-blue-600/20 border border-blue-500/20">Planifier</button><button onClick={() => handleFinishTask(t.id_tache)} className="flex-1 text-[10px] bg-green-600/10 text-green-400 py-1 rounded hover:bg-green-600/20 border border-green-500/20">Fait</button></div></div>))}
                    </div>
                </div>
                <button onClick={() => setShowModalProjets(true)} className="glass-panel p-4 rounded-xl flex items-center justify-between hover:bg-white/5 transition group w-full text-left"><span className="text-sm font-bold text-gray-300 group-hover:text-white">Voir mes Projets</span><FolderOpen className="w-5 h-5 text-gray-500 group-hover:text-blue-400 transition"/></button>
            </div>

            <div className="flex-1 glass-panel p-1 rounded-2xl shadow-2xl border border-white/10 overflow-hidden relative">
                 <div className="absolute inset-0 bg-gradient-to-b from-[#0f172a] via-[#0f172a] to-blue-900/10 pointer-events-none"></div>
                 <div className="relative h-full">
                    <FullCalendar 
                        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]} initialView="timeGridWeek" locale={frLocale} 
                        events={events} eventClick={handleEventClick} eventDrop={handleEventDropOrResize} eventResize={handleEventDropOrResize} 
                        height="85vh" slotMinTime="07:00:00" slotMaxTime="22:00:00" allDaySlot={false}
                        headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay' }}
                        eventContent={renderEventContent} nowIndicator={true}
                    />
                 </div>
            </div>
        </div>

        {/* MODALE CONGÉS */}
        {showModalConges && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                <div className="glass-panel w-full max-w-lg p-8 rounded-2xl border border-pink-500/30 bg-[#0f172a] relative shadow-2xl">
                    <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2"><Sun className="w-6 h-6 text-pink-500"/> Gestion des Congés</h2>
                    <div className="grid grid-cols-2 gap-6 mb-6">
                        <div className="p-4 bg-white/5 rounded-xl border border-white/5"><p className="text-xs text-gray-400 uppercase font-bold">En attente</p><p className="text-2xl font-bold text-white">{mesConges.filter((c:any) => c.statut === 'EN_ATTENTE').length}</p></div>
                        <div className="p-4 bg-white/5 rounded-xl border border-white/5"><p className="text-xs text-gray-400 uppercase font-bold">Validés</p><p className="text-2xl font-bold text-green-400">{mesConges.filter((c:any) => c.statut === 'VALIDE').length}</p></div>
                    </div>
                    <form onSubmit={handleRequestConge} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className="text-xs font-bold text-gray-500">Du</label><input type="date" required className="glass-input w-full [color-scheme:dark]" value={congeForm.date_debut} onChange={e => setCongeForm({...congeForm, date_debut: e.target.value})} /></div>
                            <div><label className="text-xs font-bold text-gray-500">Au</label><input type="date" required className="glass-input w-full [color-scheme:dark]" value={congeForm.date_fin} onChange={e => setCongeForm({...congeForm, date_fin: e.target.value})} /></div>
                        </div>
                        <div><label className="text-xs font-bold text-gray-500">Type</label><select className="glass-input w-full bg-[#0f172a]" value={congeForm.type} onChange={e => setCongeForm({...congeForm, type: e.target.value})}><option value="VACANCES">Vacances</option><option value="MALADIE">Arrêt Maladie</option><option value="RTT">RTT</option><option value="SANS_SOLDE">Sans Solde</option></select></div>
                        <button type="submit" className="w-full btn-neon-pink py-3 rounded-xl font-bold text-white mt-2">Envoyer la demande</button>
                    </form>
                    <button onClick={() => setShowModalConges(false)} className="absolute top-4 right-4 text-gray-400"><X/></button>
                </div>
            </div>
        )}

        {/* MODALE EVENT */}
        {showModalEvent && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                <div className="glass-panel w-full max-w-md p-8 rounded-2xl border border-white/10 bg-[#0f172a] shadow-2xl relative">
                     {/* @ts-ignore */}
                     <Container onSubmit={editMode ? handleUpdate : undefined} className="space-y-5">
                        <div><label className="text-gray-500 text-xs font-bold uppercase">Objet</label>{editMode ? <input className="glass-input w-full" value={formData.objet} onChange={e => setFormData({...formData, objet: e.target.value})} /> : <p className="text-white font-bold">{displayEvent.title}</p>}</div>
                        
                        {/* 🛑 INPUTS DATE AVEC RESTRICTION MIN={minDate} */}
                        <div className="grid grid-cols-2 gap-4">
                             <div><label className="text-gray-500 text-xs font-bold">Début</label>{editMode ? <input type="datetime-local" className="glass-input w-full text-xs [color-scheme:dark]" min={minDate} value={formData.start} onChange={e => setFormData({...formData, start: e.target.value})}/> : <p className="text-gray-300 text-sm">{new Date(displayEvent.start).toLocaleString()}</p>}</div>
                             <div><label className="text-gray-500 text-xs font-bold">Fin</label>{editMode ? <input type="datetime-local" className="glass-input w-full text-xs [color-scheme:dark]" min={minDate} value={formData.end} onChange={e => setFormData({...formData, end: e.target.value})}/> : <p className="text-gray-300 text-sm">{new Date(displayEvent.end).toLocaleString()}</p>}</div>
                        </div>

                        {editMode ? (
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="text-[10px] text-gray-500 uppercase font-bold mb-1 block">Salle</label><select className="glass-input bg-[#0f172a] w-full text-xs" value={formData.id_salle} onChange={e => setFormData({...formData, id_salle: e.target.value})}><option value="">Aucune</option>{allSalles.map(s => { const isDispo = dispoSalles.some((ds: any) => ds.id_salle === s.id_salle) || s.id_salle === formData.id_salle; return <option key={s.id_salle} value={s.id_salle} disabled={!isDispo} className={!isDispo ? "text-red-500" : ""}>{s.nom_salle} {!isDispo ? "(Occupé)" : ""}</option>})}</select></div>
                                <div><label className="text-[10px] text-gray-500 uppercase font-bold mb-1 block">Matériel</label><select className="glass-input bg-[#0f172a] w-full text-xs" value={formData.id_ressource} onChange={e => setFormData({...formData, id_ressource: e.target.value})}><option value="">Aucun</option>{allRessources.map(r => { const isDispo = dispoRessources.some((dr: any) => dr.id_ressource === r.id_ressource) || r.id_ressource === formData.id_ressource; return <option key={r.id_ressource} value={r.id_ressource} disabled={!isDispo} className={!isDispo ? "text-red-500" : ""}>{r.nom_ressource} {!isDispo ? "(Pris)" : ""}</option>})}</select></div>
                            </div>
                        ) : (
                            <div className="space-y-1">
                                {displayEvent.nom_salle && <p className="text-xs text-blue-300 flex items-center gap-2"><MapPin className="w-3 h-3"/> Salle : {displayEvent.nom_salle}</p>}
                                {displayEvent.nom_ressource && <p className="text-xs text-orange-300 flex items-center gap-2"><Box className="w-3 h-3"/> Matériel : {displayEvent.nom_ressource}</p>}
                                {!displayEvent.nom_salle && !displayEvent.nom_ressource && <p className="text-xs text-gray-500 italic">Aucune ressource associée.</p>}
                            </div>
                        )}

                        {editMode && checkingDispo && <p className="text-[10px] text-blue-400 animate-pulse text-center">Vérification disponibilités...</p>}

                        <div className="flex gap-3 pt-4 border-t border-white/10">
                             {editMode ? (
                                 <><button type="button" onClick={() => setShowModalEvent(false)} className="flex-1 text-gray-400">Annuler</button><button type="submit" className="flex-1 btn-neon-blue font-bold text-white">Sauvegarder</button></>
                             ) : (
                                 <>
                                    {canDelete && <button type="button" onClick={handleDelete} className="text-red-400 border border-red-500/30 px-4 py-2 rounded-lg flex gap-2"><Trash2 className="w-4 h-4"/> Supprimer</button>}
                                    {canEdit && <button type="button" onClick={() => setEditMode(true)} className="flex-1 btn-neon-blue font-bold text-white flex justify-center gap-2"><Edit3 className="w-4 h-4"/> Modifier</button>}
                                    {!canEdit && !canDelete && <p className="text-xs text-gray-500 italic">Lecture seule</p>}
                                 </>
                             )}
                        </div>
                     </Container>
                     <button onClick={() => setShowModalEvent(false)} className="absolute top-4 right-4 text-gray-400"><X/></button>
                </div>
            </div>
        )}

        {showModalProjets && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setShowModalProjets(false)}>
                <div className="glass-panel w-full max-w-2xl p-8 rounded-2xl border border-white/10 bg-[#0f172a] relative" onClick={e => e.stopPropagation()}>
                    <h2 className="text-2xl font-bold text-white mb-6">Mes Projets</h2>
                    {mesProjets.length === 0 ? <p className="text-gray-500">Aucun projet.</p> : mesProjets.map(p => (
                        <div key={p.id_projet} className="p-4 bg-white/5 rounded-xl mb-4 flex justify-between items-center group hover:bg-white/10 transition">
                            <div><h3 className="text-white font-bold">{p.nom_projet}</h3><p className="text-xs text-gray-400">{p.description}</p></div>
                            {canAssignTasks(user.role) && (
                                <button onClick={() => handleOpenAssign(p)} className="text-xs bg-orange-500/20 text-orange-400 px-3 py-2 rounded-lg font-bold hover:bg-orange-500/30 transition flex items-center gap-2"><Plus className="w-3 h-3"/> Assigner Tâche</button>
                            )}
                        </div>
                    ))}
                    <button onClick={() => setShowModalProjets(false)} className="absolute top-4 right-4 text-gray-400"><X/></button>
                </div>
            </div>
        )}

        {showModalAssignTask && projetCible && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
                <div className="glass-panel w-full max-w-md p-8 rounded-2xl border border-orange-500/30 bg-[#0f172a] shadow-2xl relative">
                    <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2"><Briefcase className="w-5 h-5 text-orange-500"/> Tâche : {projetCible.nom_projet}</h2>
                    <form onSubmit={handleAssignTask} className="space-y-4">
                        <div><label className="text-xs font-bold text-gray-500">Titre</label><input type="text" required className="glass-input w-full" value={taskForm.titre} onChange={e => setTaskForm({...taskForm, titre: e.target.value})} placeholder="Ex: Faire la maquette..." /></div>
                        <div>
                            <label className="text-xs font-bold text-gray-500">Assigner à (Membre du projet)</label>
                            <select className="glass-input w-full bg-[#0f172a]" required value={taskForm.id_assigne_a} onChange={e => setTaskForm({...taskForm, id_assigne_a: e.target.value})}>
                                <option value="">Choisir un membre...</option>
                                {Array.isArray(equipeProjet) && equipeProjet.map((emp: any, index: number) => (
                                    <option key={`${emp.id_employe}-${index}`} value={emp.id_employe}>{emp.nom} {emp.prenom} ({emp.role})</option>
                                ))}
                            </select>
                        </div>
                        <button type="submit" className="w-full btn-neon-blue py-3 rounded-xl font-bold text-white">Envoyer</button>
                    </form>
                    <button onClick={() => setShowModalAssignTask(false)} className="absolute top-4 right-4 text-gray-400"><X/></button>
                </div>
            </div>
        )}
      </div>
    </div>
  );
}