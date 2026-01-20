"use client";

import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import frLocale from '@fullcalendar/core/locales/fr';
import { toast } from "sonner";

interface Reservation {
  id_reservation: string;
  date_debut: string;
  date_fin: string;
  objet: string;
  // On met les relations en optionnel (?) pour éviter les crashs si null
  salle?: { nom_salle: string };
  projet?: { nom_projet: string };
  ressource?: { nom_ressource: string }; // Ajouté au cas où
}

export default function ReservationCalendar({ reservations = [] }: { reservations: Reservation[] }) {
  
  // Transformation des données sécurisée
  const events = Array.isArray(reservations) ? reservations.map(r => {
    // Logique pour le titre : Salle > Ressource > Objet
    let mainTitle = "Réservation";
    if (r.salle?.nom_salle) mainTitle = r.salle.nom_salle;
    else if (r.ressource?.nom_ressource) mainTitle = r.ressource.nom_ressource;
    else if (r.objet) mainTitle = r.objet;

    return {
        id: r.id_reservation,
        title: mainTitle,
        start: r.date_debut,
        end: r.date_fin,
        // Métadonnées pour l'affichage custom
        extendedProps: {
            projet: r.projet?.nom_projet || "Hors projet",
            objet: r.objet || "Aucun détail",
            type: r.salle ? "Salle" : "Matériel"
        },
        // Couleurs "Neon" basées sur le type (Bleu = Salle, Violet = Autre)
        backgroundColor: r.salle ? 'rgba(59, 130, 246, 0.15)' : 'rgba(168, 85, 247, 0.15)',
        borderColor: r.salle ? '#3b82f6' : '#a855f7',
        textColor: '#ffffff',
    };
  }) : [];

  const handleEventClick = (info: any) => {
    const props = info.event.extendedProps;
    toast.info(info.event.title, {
      description: (
        <div className="text-xs">
            <p>📝 <span className="font-bold">{props.objet}</span></p>
            <p className="mt-1 opacity-70">📂 {props.projet}</p>
            <p className="mt-1 font-mono text-[10px]">
                {new Date(info.event.start).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - 
                {new Date(info.event.end).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
            </p>
        </div>
      ),
    });
  };

  // Rendu personnalisé des blocs événements (Trés compact)
  const renderEventContent = (eventInfo: any) => {
    return (
      <div className="flex flex-col h-full justify-center px-1.5 py-0.5 overflow-hidden leading-tight">
        <div className="font-bold text-[10px] uppercase tracking-wider text-blue-200 truncate">
          {eventInfo.event.title}
        </div>
        {/* On masque l'objet si la case est trop petite (vue mois) */}
        {eventInfo.view.type !== 'dayGridMonth' && (
            <div className="text-[10px] text-white/70 truncate font-medium mt-0.5">
            {eventInfo.event.extendedProps.objet}
            </div>
        )}
      </div>
    );
  };

  return (
    <div className="glass-panel p-1 rounded-2xl shadow-2xl border border-white/10 mt-6 relative overflow-hidden bg-[#0f172a]/40">
      
      {/* OVERRIDE CSS POUR DARK MODE FULLCALENDAR */}
      <style jsx global>{`
        /* Fond et Texte Général */
        .fc { 
          font-family: ui-sans-serif, system-ui, sans-serif;
          color: #9ca3af; 
        }

        /* En-tête (Mois, Semaine, Jour) */
        .fc-toolbar-title { 
          color: white; 
          font-size: 1.25rem !important; 
          font-weight: 700;
          padding-left: 1rem;
        }
        
        .fc-header-toolbar {
            margin-bottom: 1rem !important;
            padding: 1rem;
        }

        /* Boutons de navigation */
        .fc-button { 
          background-color: rgba(255, 255, 255, 0.05) !important; 
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
          color: white !important;
          font-weight: 600 !important;
          font-size: 0.8rem !important;
          text-transform: capitalize;
          transition: all 0.2s;
          border-radius: 8px !important;
        }
        .fc-button:hover {
          background-color: rgba(59, 130, 246, 0.2) !important;
          border-color: rgba(59, 130, 246, 0.5) !important;
          color: #60a5fa !important;
        }
        .fc-button-active {
          background-color: #2563EB !important;
          border-color: #2563EB !important;
        }

        /* Grille et Bordures */
        .fc-theme-standard td, .fc-theme-standard th, .fc-scrollgrid {
          border-color: rgba(255, 255, 255, 0.05) !important;
        }

        /* En-têtes des jours (Lun, Mar...) */
        .fc-col-header-cell-cushion {
          color: #cbd5e1;
          text-transform: uppercase;
          font-size: 0.7rem;
          padding: 12px 0 !important;
          letter-spacing: 0.05em;
        }

        /* Heures sur le côté */
        .fc-timegrid-slot-label-cushion {
          color: #64748b;
          font-size: 0.7rem;
        }

        /* Case "Aujourd'hui" */
        .fc-day-today {
          background-color: rgba(59, 130, 246, 0.03) !important;
        }

        /* Indicateur de l'heure actuelle (Ligne rouge) */
        .fc-timegrid-now-indicator-line {
          border-color: #f43f5e;
          border-width: 2px;
        }
        .fc-timegrid-now-indicator-arrow {
          border-color: #f43f5e; 
        }

        /* Événements */
        .fc-event {
          border-radius: 6px;
          border: none;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          transition: transform 0.1s;
          cursor: pointer;
        }
        .fc-event:hover {
          transform: scale(1.01);
          z-index: 50;
          filter: brightness(1.1);
        }
      `}</style>

      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="timeGridWeek"
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridDay'
        }}
        locale={frLocale}
        events={events}
        height="650px"
        slotMinTime="07:00:00"
        slotMaxTime="21:00:00"
        allDaySlot={false}
        nowIndicator={true}
        eventClick={handleEventClick}
        eventContent={renderEventContent}
        dayHeaderFormat={{ weekday: 'short', day: 'numeric' }}
        slotDuration="00:30:00"
        slotLabelFormat={{
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        }}
      />
    </div>
  );
}