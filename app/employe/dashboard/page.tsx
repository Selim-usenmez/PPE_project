"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import frLocale from '@fullcalendar/core/locales/fr';

export default function EmployeDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<any[]>([]);
  const [stats, setStats] = useState({ projets: 0, reservations: 0 });
  const [mesProjets, setMesProjets] = useState<any[]>([]); // Ajout de l'état pour la liste des projets

  // --- 1. FONCTION DE CHARGEMENT DU PLANNING ---
  const fetchPlanning = async (id_employe: string) => {
    try {
        const res = await fetch(`/api/employes/${id_employe}/planning`);
        if (res.ok) {
            const data = await res.json();
            setEvents(data);
            
            // On calcule uniquement le nombre de réservations ici
            setStats(prev => ({
                ...prev,
                reservations: data.length,
            }));
        }
    } catch (e) {
        console.error("Erreur fetchPlanning:", e);
    }
  };

  // --- 2. FONCTION DE CHARGEMENT DES PROJETS (Manquante) ---
  const fetchProjets = async (id: string) => {
    try {
        // Cette API est supposée renvoyer une liste de projets
        const res = await fetch(`/api/employes/${id}/projets`); 
        if (res.ok) {
            const data = await res.json();
            setMesProjets(data); // Stocke la liste pour un affichage futur
            
            // On utilise la liste de projets pour le compteur !
            setStats(prev => ({ 
                ...prev, 
                projets: data.length 
            })); 
        }
    } catch (e) { console.error("Erreur fetchProjets:", e); }
  };


  // --- 3. LOGIQUE D'INITIALISATION (useEffect) ---
  useEffect(() => {
    const stored = localStorage.getItem("user_info");
    if (!stored) {
      router.push("/login");
      return;
    }
    
    const userData = JSON.parse(stored);
    
    // VÉRIFICATION CRITIQUE : Si l'ID est manquant, on s'arrête.
    if (!userData || !userData.id_employe) {
        console.error("ERREUR FRONTEND: ID employé manquant dans localStorage.");
        router.push("/login");
        return;
    }
    
    setUser(userData); // Set l'utilisateur

    // 2. Charger les données SEULEMENT APRES AVOIR L'ID
    const loadAllData = async () => {
        setLoading(true);
        // On lance la récupération pour l'ID valide
        await Promise.all([
            fetchPlanning(userData.id_employe),
            fetchProjets(userData.id_employe) // Maintenant, cette fonction existe
        ]);
        setLoading(false);
    };

    loadAllData();
    
  }, [router]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    localStorage.removeItem("user_info");
    router.push("/login");
  };

  if (!user) return null;

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto min-h-screen">
      
      {/* CSS personnalisé pour forcer FullCalendar en mode Glass/Dark */}
      <style jsx global>{`
        .fc { color: #e2e8f0; } /* Texte clair */
        .fc-theme-standard .fc-scrollgrid { border: 1px solid rgba(255,255,255,0.1); }
        .fc th { border-color: rgba(255,255,255,0.1); background-color: rgba(255,255,255,0.05); padding: 10px; }
        .fc td { border-color: rgba(255,255,255,0.1); }
        .fc-timegrid-slot { border-color: rgba(255,255,255,0.05); }
        .fc-button-primary { background-color: rgba(59, 130, 246, 0.2) !important; border: 1px solid rgba(59, 130, 246, 0.4) !important; }
        .fc-button-primary:hover { background-color: rgba(59, 130, 246, 0.4) !important; }
        .fc-button-active { background-color: rgba(59, 130, 246, 0.6) !important; }
        .fc-event { border: none; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
        .fc-timegrid-now-indicator-line { border-color: #ef4444; }
        .fc-day-today { background-color: rgba(255,255,255,0.02) !important; }
      `}</style>

      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-center mb-8 glass-panel p-6 rounded-2xl animate-fade-in shadow-lg">
        <div>
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
            Mon Espace
          </h1>
          <p className="text-gray-400 mt-1">
            Bonjour, <span className="text-white font-bold">{user.prenom}</span>. Voici votre planning projet. 📅
          </p>
        </div>
        <div className="flex gap-4 mt-4 md:mt-0">
            <button onClick={() => router.push('/employe/profile')} className="px-4 py-2 rounded-lg border border-white/10 hover:bg-white/5 transition text-sm font-bold text-gray-300">
                ⚙️ Profil
            </button>
            <button onClick={handleLogout} className="btn-neon-red px-4 py-2 rounded-lg font-bold text-sm">
                Déconnexion
            </button>
        </div>
      </header>

      {/* Stats rapides */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
         <div className="glass-panel p-4 rounded-xl flex flex-col items-center">
             <span className="text-gray-400 text-xs uppercase font-bold">Projets Actifs</span>
             <span className="text-2xl font-bold text-blue-400">{loading ? "..." : stats.projets}</span>
         </div>
         <div className="glass-panel p-4 rounded-xl flex flex-col items-center">
             <span className="text-gray-400 text-xs uppercase font-bold">Réunions prévues</span>
             <span className="text-2xl font-bold text-purple-400">{loading ? "..." : stats.reservations}</span>
         </div>
         <div className="glass-panel p-4 rounded-xl flex flex-col items-center cursor-pointer hover:border-blue-500/50 transition" onClick={() => router.push('/employe/reservations')}>
             <span className="text-3xl mb-1">📅</span>
             <span className="text-xs font-bold text-blue-200">Nouvelle Réservation</span>
         </div>
         <div className="glass-panel p-4 rounded-xl flex flex-col items-center cursor-pointer hover:border-red-500/50 transition" onClick={() => router.push('/employe/incidents')}>
             <span className="text-3xl mb-1">⚠️</span>
             <span className="text-xs font-bold text-red-200">Signaler Incident</span>
         </div>
      </div>

      {/* CALENDRIER PRINCIPAL */}
      <main className="glass-panel p-6 rounded-2xl animate-slide-up min-h-[600px]">
        {loading ? (
             <div className="flex justify-center items-center h-96">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
             </div>
        ) : (
            <div className="h-[700px] text-sm">
                <FullCalendar
                    plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                    initialView="timeGridWeek" // Vue par semaine par défaut
                    headerToolbar={{
                        left: 'prev,next today',
                        center: 'title',
                        right: 'dayGridMonth,timeGridWeek,timeGridDay'
                    }}
                    locale={frLocale}
                    events={events}
                    nowIndicator={true}
                    allDaySlot={false}
                    slotMinTime="08:00:00" // Commence à 8h
                    slotMaxTime="20:00:00" // Finit à 20h
                    height="100%"
                    eventContent={(eventInfo) => (
                        <div className="p-1 overflow-hidden">
                            <div className="font-bold text-xs">{eventInfo.timeText}</div>
                            <div className="font-bold truncate">{eventInfo.event.title}</div>
                            <div className="text-[10px] opacity-80 italic">{eventInfo.event.extendedProps.salle}</div>
                        </div>
                    )}
                />
            </div>
        )}
      </main>
    </div>
  );
}