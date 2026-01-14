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
  salle: { nom_salle: string };
  projet: { nom_projet: string };
}

export default function ReservationCalendar({ reservations }: { reservations: Reservation[] }) {
  
  // Transformation des données
  const events = reservations.map(r => ({
    id: r.id_reservation,
    title: `${r.salle.nom_salle}`, // Titre principal
    start: r.date_debut,
    end: r.date_fin,
    // Métadonnées pour l'affichage custom
    extendedProps: {
      projet: r.projet?.nom_projet || "Aucun projet",
      objet: r.objet
    },
    // Couleurs "Neon"
    backgroundColor: 'rgba(59, 130, 246, 0.2)', // Blue-500 avec opacité
    borderColor: '#3b82f6',
    textColor: '#ffffff',
  }));

  const handleEventClick = (info: any) => {
    // Petit toast sympa au clic pour voir les détails
    const props = info.event.extendedProps;
    toast.message(info.event.title, {
      description: `${props.objet} (Projet: ${props.projet}) \n ${new Date(info.event.start).toLocaleTimeString().slice(0,5)} - ${new Date(info.event.end).toLocaleTimeString().slice(0,5)}`,
    });
  };

  // Rendu personnalisé des blocs événements
  const renderEventContent = (eventInfo: any) => {
    return (
      <div className="flex flex-col h-full justify-center px-1 overflow-hidden">
        <div className="font-bold text-[10px] uppercase tracking-wider text-blue-200 truncate">
          {eventInfo.event.title}
        </div>
        <div className="text-xs text-white truncate font-medium">
          {eventInfo.event.extendedProps.objet}
        </div>
        <div className="text-[10px] text-blue-300/70 truncate italic">
           {eventInfo.timeText}
        </div>
      </div>
    );
  };

  return (
    <div className="glass-panel p-6 rounded-2xl shadow-2xl border border-white/10 mt-6 relative overflow-hidden">
      
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
          font-size: 1.5rem !important; 
          font-weight: 700;
        }

        /* Boutons de navigation */
        .fc-button { 
          background-color: rgba(255, 255, 255, 0.05) !important; 
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
          color: white !important;
          font-weight: 600 !important;
          text-transform: capitalize;
          transition: all 0.2s;
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
          border-color: rgba(255, 255, 255, 0.08) !important;
        }

        /* En-têtes des jours (Lun, Mar...) */
        .fc-col-header-cell-cushion {
          color: #cbd5e1; /* slate-300 */
          text-transform: uppercase;
          font-size: 0.75rem;
          padding: 10px 0 !important;
          letter-spacing: 0.05em;
        }

        /* Heures sur le côté */
        .fc-timegrid-slot-label-cushion {
          color: #64748b; /* slate-500 */
          font-size: 0.75rem;
        }

        /* Case "Aujourd'hui" */
        .fc-day-today {
          background-color: rgba(59, 130, 246, 0.03) !important;
        }

        /* Indicateur de l'heure actuelle (Ligne rouge) */
        .fc-timegrid-now-indicator-line {
          border-color: #f43f5e; /* rose-500 */
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
        }
        .fc-event:hover {
          transform: scale(1.02);
          z-index: 50;
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
        height="600px"
        slotMinTime="07:00:00"
        slotMaxTime="21:00:00"
        allDaySlot={false}
        nowIndicator={true}
        eventClick={handleEventClick}
        eventContent={renderEventContent}
        dayHeaderFormat={{ weekday: 'long', day: 'numeric' }}
        slotDuration="00:30:00"
      />
    </div>
  );
}