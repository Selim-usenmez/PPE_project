"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { 
  Settings, LogOut, Calendar, AlertTriangle, 
  Briefcase, Clock, MapPin, Loader2, Plus, Trash2, Edit3, X, 
  CalendarRange, FolderOpen, ShieldCheck, User 
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
  
  const [events, setEvents] = useState<any[]>([]);
  const [stats, setStats] = useState({ projets: 0, reservations: 0 });
  const [mesProjets, setMesProjets] = useState<any[]>([]);

  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);

  const [displayEvent, setDisplayEvent] = useState({
      title: "",
      nom_salle: "",
      nom_projet: "",
      auteur: "",
      start: "",
      end: "",
      isMine: false
  });

  const [formData, setFormData] = useState({
      id: "",
      objet: "",
      start: "",
      end: "",
      id_salle: ""
  });

  useEffect(() => {
    const stored = localStorage.getItem("user_info");
    if (!stored) { router.push("/login"); return; }
    try {
        const userData = JSON.parse(stored);
        setUser(userData);
        // Au premier chargement, on veut le loader (isBackground = false)
        loadData(userData.id_employe, false);
    } catch(e) { router.push("/login"); }
  }, [router]);

  // 👇 CORRECTION ICI : Ajout du paramètre isBackground
  const loadData = async (userId: string, isBackground = false) => {
    // Si c'est en arrière-plan (update), on NE met PAS le loading à true
    // pour éviter que la modale ne se ferme.
    if (!isBackground) setLoading(true);
    
    await Promise.all([ fetchReservations(userId), fetchProjets(userId) ]);
    
    if (!isBackground) setLoading(false);
  };

  const fetchReservations = async (currentUserId: string) => {
    try {
        const res = await fetch(`/api/reservations?refresh=${Date.now()}`, {
            cache: 'no-store'
        });
        
        if (res.ok) {
            const data = await res.json();
            const formattedEvents = Array.isArray(data) ? data.map((evt: any) => {
                const isMine = evt.id_employe === currentUserId;
                const auteurPrenom = evt.employe ? evt.employe.prenom : "?";
                const auteurNom = evt.employe ? `${evt.employe.prenom} ${evt.employe.nom}` : "Inconnu";

                return {
                    id: evt.id_reservation, 
                    title: `${evt.objet} • ${auteurPrenom}`, 
                    start: evt.date_debut, 
                    end: evt.date_fin,
                    backgroundColor: isMine ? '#3b82f6' : '#64748b', 
                    borderColor: isMine ? '#2563eb' : '#475569',
                    textColor: '#ffffff',
                    extendedProps: {
                        objet: evt.objet,
                        nom_salle: evt.salle?.nom_salle || "Sans salle",
                        nom_projet: evt.projet?.nom_projet || "Projet Inconnu",
                        auteur: auteurNom,
                        id_salle: evt.id_salle,
                        isMine: isMine
                    }
                };
            }) : [];
            setEvents(formattedEvents);
            setStats(prev => ({ ...prev, reservations: formattedEvents.length }));
        }
    } catch (e) { console.error(e); }
  };

  const fetchProjets = async (id: string) => {
    try {
        const res = await fetch(`/api/employes/${id}/projets`); 
        if (res.ok) {
            const data = await res.json();
            const list = Array.isArray(data) ? data : [];
            setMesProjets(list); 
            setStats(prev => ({ ...prev, projets: list.length })); 
        }
    } catch (e) { console.error(e); }
  };

  const handleEventClick = (clickInfo: any) => {
      const event = clickInfo.event;
      const props = event.extendedProps;
      
      setDisplayEvent({
          title: props.objet,
          start: event.start,
          end: event.end || event.start,
          nom_salle: props.nom_salle, 
          nom_projet: props.nom_projet,
          auteur: props.auteur,
          isMine: props.isMine
      });

      setFormData({
          id: event.id, 
          objet: props.objet,
          start: formatForInput(event.start),
          end: formatForInput(event.end || event.start),
          id_salle: props.id_salle
      });
      
      setEditMode(false);
      setShowModal(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      if(!formData.id) {
          toast.error("Erreur technique : ID manquant");
          return;
      }

      try {
          const payload = {
              id_reservation: formData.id,
              id_salle: formData.id_salle, 
              date_debut: new Date(formData.start).toISOString(),
              date_fin: new Date(formData.end).toISOString(),
              objet: formData.objet
          };

          const res = await fetch("/api/reservations", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload)
          });

          if(res.ok) {
              toast.success("Mise à jour réussie !");
              
              // 1. Mise à jour immédiate de l'affichage local
              setDisplayEvent(prev => ({
                  ...prev,
                  title: formData.objet,
                  start: new Date(formData.start).toISOString(),
                  end: new Date(formData.end).toISOString()
              }));

              // 2. Rechargement des données en mode SILENCIEUX (true)
              // Cela empêche le loader d'apparaître et de fermer la modale
              await loadData(user.id_employe, true);

              // 3. On reste sur la modale, en mode lecture
              setEditMode(false);
          } else { 
              const err = await res.json();
              toast.error(err.error || "Erreur lors de la modification"); 
          }
      } catch (err) { toast.error("Erreur serveur"); }
  };

  const handleDelete = async () => {
      if(!window.confirm("Supprimer cette réservation ?")) return;
      try {
          const res = await fetch(`/api/reservations?id=${formData.id}`, { method: "DELETE" });
          if(res.ok) {
              toast.success("Réservation supprimée");
              setShowModal(false);
              loadData(user.id_employe, false); // Là on peut recharger normalement
          } else { toast.error("Erreur suppression"); }
      } catch(err) { toast.error("Erreur serveur"); }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    localStorage.removeItem("user_info");
    router.push("/login");
  };

  if (!user) return <div className="min-h-screen bg-[#030712] text-white flex items-center justify-center"><Loader2 className="animate-spin"/></div>;

  return (
    <div className="min-h-screen bg-[#030712] text-gray-200 p-6 md:p-10">
      
      <style jsx global>{`
        .fc { font-family: ui-sans-serif, system-ui, sans-serif; color: #9ca3af; }
        .fc-toolbar-title { color: white; font-size: 1.25rem !important; font-weight: 700; }
        .fc-button { background-color: rgba(255, 255, 255, 0.05) !important; border: 1px solid rgba(255, 255, 255, 0.1) !important; color: white !important; }
        .fc-button:hover { background-color: rgba(59, 130, 246, 0.2) !important; color: #60a5fa !important; }
        .fc-button-active { background-color: #2563EB !important; border-color: #2563EB !important; }
        .fc-event { border: none; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); cursor: pointer; }
      `}</style>

      <div className="max-w-7xl mx-auto space-y-8 animate-fade-in">
        
        {/* HEADER */}
        <header className="flex flex-col md:flex-row justify-between items-center glass-panel p-6 rounded-2xl shadow-lg border border-white/5">
            <div className="flex items-center gap-4">
                <div className="relative h-12 w-12 flex-shrink-0">
                    <Image src="/logo.png" alt="Logo" width={48} height={48} className="object-contain" priority />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-white">Espace Employé</h1>
                    <p className="text-gray-400 text-sm">Bonjour, <span className="text-blue-400 font-bold">{user.prenom}</span>.</p>
                </div>
            </div>
            <div className="flex gap-3 mt-4 md:mt-0">
                {user.role === "ADMIN" && (
                    <button onClick={() => router.push('/admin/dashboard')} className="px-4 py-2 rounded-xl bg-purple-600/10 border border-purple-500/30 text-purple-400 hover:bg-purple-600 hover:text-white transition text-sm font-bold flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4" /> Vue Admin
                    </button>
                )}
                <button onClick={() => router.push('/employe/profile')} className="px-4 py-2 rounded-xl border border-white/10 hover:bg-white/5 transition text-sm font-bold text-gray-300 flex items-center gap-2"><Settings className="w-4 h-4" /> Profil</button>
                <button onClick={handleLogout} className="btn-neon-red px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2"><LogOut className="w-4 h-4" /> Déconnexion</button>
            </div>
        </header>

        {/* DASHBOARD GRID */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="glass-panel p-5 rounded-2xl border-l-4 border-blue-500 flex items-center justify-between"><div><p className="text-xs text-blue-400 font-bold uppercase tracking-wider mb-1">Mes Projets</p><p className="text-3xl font-bold text-white">{stats.projets}</p></div><div className="p-3 bg-blue-500/10 rounded-xl text-blue-500"><Briefcase className="w-6 h-6" /></div></div>
            <div className="glass-panel p-5 rounded-2xl border-l-4 border-purple-500 flex items-center justify-between"><div><p className="text-xs text-purple-400 font-bold uppercase tracking-wider mb-1">Réunions</p><p className="text-3xl font-bold text-white">{stats.reservations}</p></div><div className="p-3 bg-purple-500/10 rounded-xl text-purple-500"><CalendarRange className="w-6 h-6" /></div></div>
            <div onClick={() => router.push('/employe/reservations')} className="glass-panel p-1 rounded-2xl border border-white/10 hover:border-blue-500/50 cursor-pointer transition-all"><div className="h-full flex flex-col items-center justify-center p-4"><div className="mb-2 p-3 bg-white/5 rounded-full text-blue-400"><Plus className="w-6 h-6" /></div><span className="text-sm font-bold text-gray-300">Réserver</span></div></div>
            <div onClick={() => router.push('/employe/incidents')} className="glass-panel p-1 rounded-2xl border border-white/10 hover:border-red-500/50 cursor-pointer transition-all"><div className="h-full flex flex-col items-center justify-center p-4"><div className="mb-2 p-3 bg-white/5 rounded-full text-red-400"><AlertTriangle className="w-6 h-6" /></div><span className="text-sm font-bold text-gray-300">Signaler</span></div></div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* LISTE PROJETS */}
            <div className="lg:col-span-1 space-y-6">
                <div className="glass-panel p-6 rounded-2xl border border-white/10 h-full">
                    <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2"><FolderOpen className="w-5 h-5 text-blue-400" /> Projets en cours</h2>
                    {mesProjets.length > 0 ? (
                        <div className="space-y-4">{mesProjets.map((p) => (<div key={p.id_projet} className="p-4 rounded-xl bg-white/5 border border-white/5"><h3 className="font-bold text-blue-300">{p.nom_projet}</h3><p className="text-gray-400 text-xs line-clamp-2">{p.description}</p></div>))}</div>
                    ) : <div className="text-center py-10 text-gray-500">Aucun projet assigné.</div>}
                </div>
            </div>

            {/* CALENDRIER */}
            <div className="lg:col-span-2">
                <div className="glass-panel p-6 rounded-2xl shadow-xl border border-white/10 h-full">
                    <div className="flex justify-between items-center mb-6"><h2 className="text-lg font-bold text-white flex items-center gap-2"><Calendar className="w-5 h-5 text-purple-400" /> Planning des Salles</h2></div>
                    <div className="h-[600px] overflow-hidden rounded-xl border border-white/5 bg-[#0f172a]/50">
                        <FullCalendar
                            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                            initialView="timeGridWeek"
                            locale={frLocale}
                            events={events}
                            eventClick={handleEventClick}
                            nowIndicator={true}
                            allDaySlot={false}
                            slotMinTime="07:00:00"
                            slotMaxTime="21:00:00"
                            height="100%"
                            headerToolbar={{ left: 'prev,next today', center: 'title', right: 'timeGridWeek,timeGridDay' }}
                        />
                    </div>
                </div>
            </div>
        </div>
      </div>

      {/* MODALE DETAILS / EDIT */}
      {showModal && (
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in"
            onClick={() => setShowModal(false)}
        >
            <div 
                className="glass-panel w-full max-w-md p-8 rounded-2xl border border-white/10 bg-[#0f172a] shadow-2xl relative"
                onClick={(e) => e.stopPropagation()}
            >
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)} 
                  className="absolute top-4 right-4 text-gray-400 hover:text-white transition"
                >
                    <X className="w-5 h-5" />
                </button>

                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    {editMode ? <Edit3 className="w-5 h-5 text-blue-400" /> : <Calendar className="w-5 h-5 text-purple-400" />}
                    {editMode ? "Modifier" : "Détails"}
                </h2>

                <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
                    
                    {/* OBJET */}
                    <div>
                        <label className="text-xs uppercase font-bold text-gray-500 mb-1.5 block">Objet</label>
                        {editMode ? (
                            <input type="text" className="glass-input w-full" value={formData.objet} onChange={e => setFormData({...formData, objet: e.target.value})} />
                        ) : (
                            <div className="text-white font-medium text-lg">{displayEvent.title}</div>
                        )}
                    </div>

                    {/* AUTEUR */}
                    {!editMode && (
                        <div className="bg-purple-500/10 p-3 rounded-lg border border-purple-500/20 flex items-center gap-3">
                            <div className="p-2 bg-purple-500/20 rounded-full text-purple-400"><User className="w-4 h-4" /></div>
                            <div>
                                <p className="text-[10px] uppercase font-bold text-purple-300">Réservé par</p>
                                <p className="text-sm font-bold text-white">{displayEvent.auteur}</p>
                            </div>
                        </div>
                    )}

                    {/* LIEU */}
                    <div>
                        <label className="text-xs uppercase font-bold text-gray-500 mb-1.5 block">Lieu & Projet</label>
                        <div className="flex items-center gap-2 text-sm text-gray-300 bg-white/5 p-3 rounded-lg border border-white/5">
                            <MapPin className="w-4 h-4 text-blue-400" /><span className="font-bold">{displayEvent.nom_salle}</span>
                            <span className="text-gray-600">|</span>
                            <Briefcase className="w-4 h-4 text-purple-400" /><span>{displayEvent.nom_projet}</span>
                        </div>
                    </div>

                    {/* DATES */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs uppercase font-bold text-gray-500 mb-1.5 block">Début</label>
                            {editMode ? <input type="datetime-local" className="glass-input w-full text-xs" value={formData.start} onChange={e => setFormData({...formData, start: e.target.value})}/> : 
                            <div className="text-gray-300 text-sm flex items-center gap-2"><Clock className="w-3 h-3 text-gray-500" />{displayEvent.start ? new Date(displayEvent.start).toLocaleString() : "-"}</div>}
                        </div>
                        <div>
                            <label className="text-xs uppercase font-bold text-gray-500 mb-1.5 block">Fin</label>
                            {editMode ? <input type="datetime-local" className="glass-input w-full text-xs" value={formData.end} onChange={e => setFormData({...formData, end: e.target.value})}/> : 
                            <div className="text-gray-300 text-sm flex items-center gap-2"><Clock className="w-3 h-3 text-gray-500" />{displayEvent.end ? new Date(displayEvent.end).toLocaleString() : "-"}</div>}
                        </div>
                    </div>

                    {/* ACTIONS */}
                    <div className="flex gap-3 pt-6 border-t border-white/10 mt-2">
                        {editMode ? (
                            <>
                                <button type="button" onClick={() => setEditMode(false)} className="flex-1 py-2.5 rounded-xl border border-white/10 text-gray-400 hover:text-white transition text-sm">Annuler</button>
                                <button type="button" onClick={handleUpdate} className="flex-1 btn-neon-blue py-2.5 rounded-xl font-bold text-white text-sm">Sauvegarder</button>
                            </>
                        ) : (
                            displayEvent.isMine ? (
                                <>
                                    <button type="button" onClick={handleDelete} className="px-4 py-2.5 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 transition text-sm flex items-center gap-2"><Trash2 className="w-4 h-4" /> Supprimer</button>
                                    <button type="button" onClick={() => setEditMode(true)} className="flex-1 btn-neon-blue py-2.5 rounded-xl font-bold text-white text-sm flex items-center justify-center gap-2"><Edit3 className="w-4 h-4" /> Modifier</button>
                                </>
                            ) : (
                                <p className="text-xs text-gray-500 w-full text-center italic">Lecture seule (Ce n'est pas votre réservation)</p>
                            )
                        )}
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
}