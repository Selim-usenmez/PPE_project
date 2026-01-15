"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image"; // 👈 IMPORT IMPORTANT POUR LE LOGO
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import frLocale from '@fullcalendar/core/locales/fr';
import { toast } from "sonner";
// 👇 IMPORTS LUCIDE
import { 
  LayoutDashboard, Settings, LogOut, Calendar, AlertTriangle, 
  Briefcase, Clock, MapPin, Loader2, Plus, Trash2, Edit3, X, 
  ChevronRight, CalendarRange, FolderOpen
} from "lucide-react";

export default function EmployeDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Données
  const [events, setEvents] = useState<any[]>([]);
  const [stats, setStats] = useState({ projets: 0, reservations: 0 });
  const [mesProjets, setMesProjets] = useState<any[]>([]);

  // Modale
  const [showModal, setShowModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [editMode, setEditMode] = useState(false);

  // Initialisation
  useEffect(() => {
    const stored = localStorage.getItem("user_info");
    if (!stored) { router.push("/login"); return; }
    const userData = JSON.parse(stored);
    
    if (!userData?.id_employe) { router.push("/login"); return; }
    
    setUser(userData);
    loadData(userData.id_employe);
  }, [router]);

  const loadData = async (id: string) => {
    setLoading(true);
    await Promise.all([ fetchPlanning(id), fetchProjets(id) ]);
    setLoading(false);
  };

  const fetchPlanning = async (id: string) => {
    try {
        const res = await fetch(`/api/employes/${id}/planning`);
        if (res.ok) {
            const data = await res.json();
            const formattedEvents = data.map((evt: any) => ({
                ...evt,
                id: evt.id_reservation || evt.id,
                title: evt.objet || "Réunion", // Fallback titre
                // Couleurs Pro
                backgroundColor: 'rgba(59, 130, 246, 0.2)', 
                borderColor: '#3b82f6',
                textColor: '#ffffff',
                // Props étendues
                extendedProps: {
                    salle: evt.salle,
                    id_salle: evt.id_salle,
                    projet: evt.projet,
                    objet: evt.objet
                }
            }));
            setEvents(formattedEvents);
            setStats(prev => ({ ...prev, reservations: data.length }));
        }
    } catch (e) { console.error(e); }
  };

  const fetchProjets = async (id: string) => {
    try {
        const res = await fetch(`/api/employes/${id}/projets`); 
        if (res.ok) {
            const data = await res.json();
            setMesProjets(data); 
            setStats(prev => ({ ...prev, projets: data.length })); 
        }
    } catch (e) { console.error(e); }
  };

  // --- ACTIONS ---
  const handleEventClick = (clickInfo: any) => {
      const props = clickInfo.event.extendedProps;
      const eventObj = {
          id: clickInfo.event.id,
          title: clickInfo.event.title,
          start: clickInfo.event.start,
          end: clickInfo.event.end,
          salle: props.salle, 
          id_salle: props.id_salle, 
          projet: props.projet,
          objet: props.objet || clickInfo.event.title
      };
      
      setSelectedEvent(eventObj);
      setEditMode(false);
      setShowModal(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
      e.preventDefault();
      try {
          const res = await fetch("/api/reservations", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                  id_reservation: selectedEvent.id,
                  id_salle: selectedEvent.id_salle, 
                  date_debut: selectedEvent.start,
                  date_fin: selectedEvent.end,
                  objet: selectedEvent.objet
              })
          });

          if(res.ok) {
              toast.success("Réservation mise à jour");
              setShowModal(false);
              loadData(user.id_employe);
          } else {
              toast.error("Erreur lors de la modification");
          }
      } catch (err) { toast.error("Erreur serveur"); }
  };

  const handleDelete = async () => {
      if(!confirm("Annuler cette réservation ?")) return;
      try {
          const res = await fetch(`/api/reservations/${selectedEvent.id}`, { method: "DELETE" });
          if(res.ok) {
              toast.success("Réservation annulée");
              setShowModal(false);
              loadData(user.id_employe);
          } else { toast.error("Erreur suppression"); }
      } catch(err) { toast.error("Erreur réseau"); }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    localStorage.removeItem("user_info");
    router.push("/login");
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#030712] text-gray-200 p-6 md:p-10">
      
      {/* CSS FullCalendar Dark Mode */}
      <style jsx global>{`
        .fc { font-family: ui-sans-serif, system-ui, sans-serif; color: #9ca3af; }
        .fc-toolbar-title { color: white; font-size: 1.25rem !important; font-weight: 700; }
        .fc-button { background-color: rgba(255, 255, 255, 0.05) !important; border: 1px solid rgba(255, 255, 255, 0.1) !important; color: white !important; }
        .fc-button:hover { background-color: rgba(59, 130, 246, 0.2) !important; color: #60a5fa !important; }
        .fc-button-active { background-color: #2563EB !important; border-color: #2563EB !important; }
        .fc-theme-standard td, .fc-theme-standard th, .fc-scrollgrid { border-color: rgba(255, 255, 255, 0.08) !important; }
        .fc-col-header-cell-cushion { color: #cbd5e1; text-transform: uppercase; font-size: 0.75rem; padding: 10px 0 !important; }
        .fc-timegrid-slot-label-cushion { color: #64748b; font-size: 0.75rem; }
        .fc-day-today { background-color: rgba(59, 130, 246, 0.03) !important; }
        .fc-event { border-radius: 6px; border: none; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
      `}</style>

      <div className="max-w-7xl mx-auto space-y-8 animate-fade-in">
        
        {/* HEADER */}
        <header className="flex flex-col md:flex-row justify-between items-center glass-panel p-6 rounded-2xl shadow-lg border border-white/5">
            <div className="flex items-center gap-4">
                
                {/* 👇 REMPLACEMENT DE L'ICÔNE PAR TON LOGO */}
                <div className="relative h-12 w-12 flex-shrink-0">
                    <Image 
                        src="/logo.png" 
                        alt="NexusPharm Logo"
                        fill
                        className="object-contain"
                        priority
                    />
                </div>

                <div>
                    <h1 className="text-2xl font-bold text-white">Espace Employé</h1>
                    <p className="text-gray-400 text-sm">
                        Bonjour, <span className="text-blue-400 font-bold">{user.prenom}</span>.
                    </p>
                </div>
            </div>
            
            <div className="flex gap-3 mt-4 md:mt-0">
                <button onClick={() => router.push('/employe/profile')} className="px-4 py-2 rounded-xl border border-white/10 hover:bg-white/5 transition text-sm font-bold text-gray-300 flex items-center gap-2">
                    <Settings className="w-4 h-4" /> Profil
                </button>
                <button onClick={handleLogout} className="btn-neon-red px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2">
                    <LogOut className="w-4 h-4" /> Déconnexion
                </button>
            </div>
        </header>

        {/* DASHBOARD GRID */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            
            {/* KPI 1 : Projets */}
            <div className="glass-panel p-5 rounded-2xl border-l-4 border-blue-500 flex items-center justify-between group">
                <div>
                    <p className="text-xs text-blue-400 font-bold uppercase tracking-wider mb-1">Mes Projets</p>
                    <p className="text-3xl font-bold text-white">{loading ? <Loader2 className="w-6 h-6 animate-spin"/> : stats.projets}</p>
                </div>
                <div className="p-3 bg-blue-500/10 rounded-xl text-blue-500 group-hover:scale-110 transition-transform">
                    <Briefcase className="w-6 h-6" />
                </div>
            </div>

            {/* KPI 2 : Réunions */}
            <div className="glass-panel p-5 rounded-2xl border-l-4 border-purple-500 flex items-center justify-between group">
                <div>
                    <p className="text-xs text-purple-400 font-bold uppercase tracking-wider mb-1">Réunions</p>
                    <p className="text-3xl font-bold text-white">{loading ? <Loader2 className="w-6 h-6 animate-spin"/> : stats.reservations}</p>
                </div>
                <div className="p-3 bg-purple-500/10 rounded-xl text-purple-500 group-hover:scale-110 transition-transform">
                    <CalendarRange className="w-6 h-6" />
                </div>
            </div>

            {/* ACTION 1 : Réserver */}
            <div onClick={() => router.push('/employe/reservations')} className="glass-panel p-1 rounded-2xl border border-white/10 hover:border-blue-500/50 cursor-pointer transition-all group relative overflow-hidden">
                <div className="absolute inset-0 bg-blue-500/0 group-hover:bg-blue-500/5 transition-colors"></div>
                <div className="h-full flex flex-col items-center justify-center p-4">
                    <div className="mb-2 p-3 bg-white/5 rounded-full group-hover:bg-blue-500/20 text-gray-300 group-hover:text-blue-400 transition-colors">
                        <Plus className="w-6 h-6" />
                    </div>
                    <span className="text-sm font-bold text-gray-300 group-hover:text-white">Réserver</span>
                </div>
            </div>

            {/* ACTION 2 : Incident */}
            <div onClick={() => router.push('/employe/incidents')} className="glass-panel p-1 rounded-2xl border border-white/10 hover:border-red-500/50 cursor-pointer transition-all group relative overflow-hidden">
                <div className="absolute inset-0 bg-red-500/0 group-hover:bg-red-500/5 transition-colors"></div>
                <div className="h-full flex flex-col items-center justify-center p-4">
                    <div className="mb-2 p-3 bg-white/5 rounded-full group-hover:bg-red-500/20 text-gray-300 group-hover:text-red-400 transition-colors">
                        <AlertTriangle className="w-6 h-6" />
                    </div>
                    <span className="text-sm font-bold text-gray-300 group-hover:text-white">Signaler un problème</span>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* COLONNE GAUCHE : Projets */}
            <div className="lg:col-span-1 space-y-6">
                <div className="glass-panel p-6 rounded-2xl border border-white/10 h-full">
                    <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                        <FolderOpen className="w-5 h-5 text-blue-400" /> Projets en cours
                    </h2>
                    
                    {mesProjets.length > 0 ? (
                        <div className="space-y-4">
                            {mesProjets.map((p) => (
                                <div key={p.id_projet} className="p-4 rounded-xl bg-white/5 border border-white/5 hover:border-blue-500/30 transition-all group">
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="font-bold text-blue-300 group-hover:text-blue-200 transition-colors">{p.nom_projet}</h3>
                                        <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded text-gray-400">
                                            {new Date(p.date_fin).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <p className="text-gray-400 text-xs line-clamp-2">{p.description}</p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-10 text-gray-500">
                            <FolderOpen className="w-10 h-10 mx-auto mb-2 opacity-20" />
                            <p className="text-sm">Aucun projet assigné.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* COLONNE DROITE : Calendrier */}
            <div className="lg:col-span-2">
                <div className="glass-panel p-6 rounded-2xl shadow-xl border border-white/10 h-full">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-purple-400" /> Mon Planning
                        </h2>
                    </div>
                    
                    <div className="h-[600px] overflow-hidden rounded-xl border border-white/5 bg-[#0f172a]/50">
                        <FullCalendar
                            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                            initialView="timeGridWeek"
                            locale={frLocale}
                            events={events}
                            eventClick={handleEventClick}
                            nowIndicator={true}
                            allDaySlot={false}
                            slotMinTime="08:00:00"
                            slotMaxTime="20:00:00"
                            height="100%"
                            headerToolbar={{
                                left: 'prev,next today',
                                center: 'title',
                                right: 'timeGridWeek,timeGridDay'
                            }}
                        />
                    </div>
                </div>
            </div>
        </div>
      </div>

      {/* MODALE DETAILS / EDIT */}
      {showModal && selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
            <div className="glass-panel w-full max-w-md p-8 rounded-2xl border border-white/10 bg-[#0f172a] shadow-2xl relative">
                
                <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white transition">
                    <X className="w-5 h-5" />
                </button>

                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    {editMode ? <Edit3 className="w-5 h-5 text-blue-400" /> : <Calendar className="w-5 h-5 text-purple-400" />}
                    {editMode ? "Modifier la réservation" : "Détails de la réservation"}
                </h2>

                <form onSubmit={handleUpdate} className="space-y-5">
                    <div>
                        <label className="text-xs uppercase font-bold text-gray-500 mb-1.5 block">Objet</label>
                        {editMode ? (
                            <input type="text" className="glass-input w-full" 
                                value={selectedEvent.objet} onChange={e => setSelectedEvent({...selectedEvent, objet: e.target.value})} />
                        ) : (
                            <div className="text-white font-medium text-lg flex items-center gap-2">
                                {selectedEvent.objet}
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="text-xs uppercase font-bold text-gray-500 mb-1.5 block">Salle & Projet</label>
                        <div className="flex items-center gap-2 text-sm text-gray-300 bg-white/5 p-3 rounded-lg border border-white/5">
                            <MapPin className="w-4 h-4 text-blue-400" />
                            <span className="font-bold">{selectedEvent.salle?.nom_salle || "Salle inconnue"}</span>
                            <span className="text-gray-600">|</span>
                            <Briefcase className="w-4 h-4 text-purple-400" />
                            <span>{selectedEvent.projet?.nom_projet || "Aucun projet"}</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs uppercase font-bold text-gray-500 mb-1.5 block">Début</label>
                            {editMode ? (
                                <input type="datetime-local" className="glass-input w-full text-xs" 
                                    value={new Date(selectedEvent.start).toISOString().slice(0, 16)}
                                    onChange={e => setSelectedEvent({...selectedEvent, start: e.target.value})}
                                />
                            ) : (
                                <div className="text-gray-300 text-sm flex items-center gap-2">
                                    <Clock className="w-3 h-3 text-gray-500" />
                                    {new Date(selectedEvent.start).toLocaleString()}
                                </div>
                            )}
                        </div>
                        <div>
                            <label className="text-xs uppercase font-bold text-gray-500 mb-1.5 block">Fin</label>
                            {editMode ? (
                                <input type="datetime-local" className="glass-input w-full text-xs" 
                                    value={new Date(selectedEvent.end).toISOString().slice(0, 16)}
                                    onChange={e => setSelectedEvent({...selectedEvent, end: e.target.value})}
                                />
                            ) : (
                                <div className="text-gray-300 text-sm flex items-center gap-2">
                                    <Clock className="w-3 h-3 text-gray-500" />
                                    {new Date(selectedEvent.end).toLocaleString()}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex gap-3 pt-6 border-t border-white/10 mt-2">
                        {editMode ? (
                            <>
                                <button type="button" onClick={() => setEditMode(false)} className="flex-1 py-2.5 rounded-xl border border-white/10 text-gray-400 hover:text-white transition text-sm">Annuler</button>
                                <button type="submit" className="flex-1 btn-neon-blue py-2.5 rounded-xl font-bold text-white text-sm">Sauvegarder</button>
                            </>
                        ) : (
                            <>
                                <button type="button" onClick={handleDelete} className="px-4 py-2.5 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 transition text-sm flex items-center gap-2">
                                    <Trash2 className="w-4 h-4" /> Supprimer
                                </button>
                                <button type="button" onClick={() => setEditMode(true)} className="flex-1 btn-neon-blue py-2.5 rounded-xl font-bold text-white text-sm flex items-center justify-center gap-2">
                                    <Edit3 className="w-4 h-4" /> Modifier
                                </button>
                            </>
                        )}
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
}