"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import frLocale from '@fullcalendar/core/locales/fr';
import { toast } from "sonner";

export default function EmployeDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Données
  const [events, setEvents] = useState<any[]>([]);
  const [stats, setStats] = useState({ projets: 0, reservations: 0 });
  const [mesProjets, setMesProjets] = useState<any[]>([]);

  // --- GESTION DE LA MODALE ---
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
            // On s'assure que chaque event a un ID et des props interactives
            const formattedEvents = data.map((evt: any) => ({
                ...evt,
                id: evt.id_reservation || evt.id,
                className: "cursor-pointer hover:opacity-80 transition-opacity", 
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

  // 1. Clic sur un événement
  const handleEventClick = (clickInfo: any) => {
      const eventObj = {
          id: clickInfo.event.id,
          title: clickInfo.event.title,
          start: clickInfo.event.start,
          end: clickInfo.event.end,
          salle: clickInfo.event.extendedProps.salle, 
          id_salle: clickInfo.event.extendedProps.id_salle, 
          projet: clickInfo.event.extendedProps.projet,
          objet: clickInfo.event.extendedProps.objet || clickInfo.event.title
      };
      
      setSelectedEvent(eventObj);
      setEditMode(false);
      setShowModal(true);
  };

  // 2. Modifier (PUT)
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
              toast.success("Réservation modifiée !");
              setShowModal(false);
              loadData(user.id_employe);
          } else {
              const err = await res.json();
              toast.error(err.error || "Erreur modif");
          }
      } catch (err) { toast.error("Erreur serveur"); }
  };

  // 3. Supprimer (DELETE)
  const handleDelete = async () => {
      if(!confirm("Voulez-vous vraiment annuler cette réservation ?")) return;
      try {
          const res = await fetch(`/api/reservations/${selectedEvent.id}`, { method: "DELETE" });
          if(res.ok) {
              toast.success("Réservation annulée.");
              setShowModal(false);
              loadData(user.id_employe);
          } else {
              toast.error("Impossible de supprimer.");
          }
      } catch(err) { toast.error("Erreur réseau"); }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    localStorage.removeItem("user_info");
    router.push("/login");
  };

  if (!user) return null;

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto min-h-screen">
      
      <style jsx global>{`
        .fc { color: #e2e8f0; }
        .fc-theme-standard .fc-scrollgrid { border: 1px solid rgba(255,255,255,0.1); }
        .fc th { border-color: rgba(255,255,255,0.1); background-color: rgba(255,255,255,0.05); padding: 10px; }
        .fc td { border-color: rgba(255,255,255,0.1); }
        .fc-button-primary { background-color: rgba(59, 130, 246, 0.2) !important; border: 1px solid rgba(59, 130, 246, 0.4) !important; }
        .fc-event { border: none; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); cursor: pointer; }
      `}</style>

      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-center mb-8 glass-panel p-6 rounded-2xl shadow-lg border border-white/5">
        <div>
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
            Espace Employé
          </h1>
          <p className="text-gray-400 mt-1">
            Bienvenue, <span className="text-white font-bold">{user.prenom}</span>.
          </p>
        </div>
        
        {/* BOUTONS D'ACTION HEADER */}
        <div className="flex gap-4 mt-4 md:mt-0 items-center">
            {/* Bouton PROFIL remis ici ! */}
            <button 
                onClick={() => router.push('/employe/profile')} 
                className="px-4 py-2 rounded-lg border border-white/10 hover:bg-white/5 transition text-sm font-bold text-gray-300 flex items-center gap-2"
            >
                ⚙️ Profil
            </button>
            
            <button onClick={handleLogout} className="btn-neon-red px-4 py-2 rounded-lg font-bold text-sm hover:scale-105 transition-transform">
                Déconnexion
            </button>
        </div>
      </header>

      {/* STATS & ACTIONS RAPIDES */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
         <div className="glass-panel p-4 rounded-xl flex flex-col items-center border border-blue-500/20">
             <span className="text-gray-400 text-[10px] uppercase font-bold">Projets</span>
             <span className="text-2xl font-bold text-blue-400">{loading ? "-" : stats.projets}</span>
         </div>
         <div className="glass-panel p-4 rounded-xl flex flex-col items-center border border-purple-500/20">
             <span className="text-gray-400 text-[10px] uppercase font-bold">Réunions</span>
             <span className="text-2xl font-bold text-purple-400">{loading ? "-" : stats.reservations}</span>
         </div>
         <div onClick={() => router.push('/employe/reservations')} className="glass-panel p-4 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-white/5 border border-white/10 group">
             <span className="text-2xl mb-1 group-hover:scale-110 transition-transform">📅</span>
             <span className="text-blue-200 text-[10px] font-bold uppercase text-center">Réserver</span>
         </div>
         <div onClick={() => router.push('/employe/incidents')} className="glass-panel p-4 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-white/5 border border-white/10 group">
             <span className="text-2xl mb-1 group-hover:scale-110 transition-transform">⚠️</span>
             <span className="text-red-200 text-[10px] font-bold uppercase text-center">Incident</span>
         </div>
      </div>

      {/* LISTE DES PROJETS AFFILIÉS */}
      <section className="glass-panel p-6 rounded-2xl mb-8 shadow-lg border border-white/5">
        <h2 className="text-xl font-bold text-white mb-6">📁 Mes Projets</h2>
        {mesProjets.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {mesProjets.map((p) => (
              <div key={p.id_projet} className="p-5 rounded-2xl bg-white/5 border border-white/10 hover:border-blue-500/30 transition-all">
                <h3 className="font-bold text-blue-300 mb-2">{p.nom_projet}</h3>
                <p className="text-gray-400 text-xs mb-3 line-clamp-2">{p.description}</p>
                <div className="text-[10px] text-gray-500 font-mono">
                  Fin: {new Date(p.date_fin).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        ) : <p className="text-gray-500 italic">Aucun projet affilié.</p>}
      </section>

      {/* CALENDRIER INTERACTIF AVEC HAUTEUR FIXE */}
      <main className="glass-panel p-6 rounded-2xl shadow-xl border border-white/5">
        <h2 className="text-xl font-bold text-white mb-6 flex items-center">
          <span className="mr-2">📅</span> Mon Planning
        </h2>
        
        {/* Conteneur avec hauteur fixe indispensable pour FullCalendar en mode height="100%" */}
        <div className="h-[700px]">
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
            />
        </div>
      </main>

      {/* MODALE DETAILS / EDIT */}
      {showModal && selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
            <div className="glass-panel w-full max-w-md p-6 rounded-2xl border border-white/10 bg-[#0f172a] shadow-2xl">
                
                <div className="flex justify-between items-start mb-6 border-b border-white/10 pb-4">
                    <h2 className="text-xl font-bold text-white">{editMode ? "✏️ Modifier" : "📅 Détails"}</h2>
                    <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white">✕</button>
                </div>

                <form onSubmit={handleUpdate} className="space-y-4">
                    <div>
                        <label className="text-xs uppercase font-bold text-gray-500">Objet</label>
                        {editMode ? (
                            <input type="text" className="glass-input w-full mt-1" 
                                value={selectedEvent.objet} onChange={e => setSelectedEvent({...selectedEvent, objet: e.target.value})} />
                        ) : <p className="text-white font-medium text-lg">{selectedEvent.objet}</p>}
                    </div>

                    <div>
                        <label className="text-xs uppercase font-bold text-gray-500">Salle</label>
                        <p className="text-gray-300 mt-1">{selectedEvent.salle?.nom_salle || selectedEvent.salle || "Aucune"}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs uppercase font-bold text-gray-500">Début</label>
                            {editMode ? (
                                <input type="datetime-local" className="glass-input w-full text-xs" 
                                    value={new Date(selectedEvent.start).toISOString().slice(0, 16)}
                                    onChange={e => setSelectedEvent({...selectedEvent, start: e.target.value})}
                                />
                            ) : <p className="text-gray-300">{selectedEvent.start.toLocaleString()}</p>}
                        </div>
                        <div>
                            <label className="text-xs uppercase font-bold text-gray-500">Fin</label>
                            {editMode ? (
                                <input type="datetime-local" className="glass-input w-full text-xs" 
                                    value={new Date(selectedEvent.end).toISOString().slice(0, 16)}
                                    onChange={e => setSelectedEvent({...selectedEvent, end: e.target.value})}
                                />
                            ) : <p className="text-gray-300">{selectedEvent.end.toLocaleString()}</p>}
                        </div>
                    </div>

                    <div className="flex gap-3 pt-6 border-t border-white/10 mt-4">
                        {editMode ? (
                            <>
                                <button type="button" onClick={() => setEditMode(false)} className="flex-1 py-2 rounded-lg border border-white/10 text-gray-300">Annuler</button>
                                <button type="submit" className="flex-1 btn-neon-blue py-2 rounded-lg font-bold text-white">Sauvegarder</button>
                            </>
                        ) : (
                            <>
                                <button type="button" onClick={handleDelete} className="px-4 py-2 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10">🗑️ Supprimer</button>
                                <button type="button" onClick={() => setEditMode(true)} className="flex-1 btn-neon-blue py-2 rounded-lg font-bold text-white">Modifier</button>
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