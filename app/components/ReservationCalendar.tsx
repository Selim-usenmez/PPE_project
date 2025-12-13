"use client";

import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import frLocale from '@fullcalendar/core/locales/fr';

interface Reservation {
  id_reservation: string;
  date_debut: string;
  date_fin: string;
  objet: string;
  salle: { nom_salle: string };
  projet: { nom_projet: string };
}

export default function ReservationCalendar({ reservations }: { reservations: Reservation[] }) {
  
  // Transformation des données pour FullCalendar
  const events = reservations.map(r => ({
    id: r.id_reservation,
    title: `${r.salle.nom_salle} - ${r.objet}`,
    start: r.date_debut,
    end: r.date_fin,
    backgroundColor: '#3B82F6', // Bleu
    borderColor: '#2563EB',
    textColor: '#ffffff'
  }));

  return (
    <div className="bg-white p-4 rounded-lg shadow border mt-4">
      <style jsx global>{`
        .fc-event { cursor: pointer; }
        .fc-toolbar-title { font-size: 1.25rem !important; }
        .fc-button { background-color: #2563EB !important; border-color: #2563EB !important; }
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
        height="auto"
        slotMinTime="07:00:00"
        slotMaxTime="20:00:00"
        allDaySlot={false}
        nowIndicator={true}
        eventTimeFormat={{
          hour: '2-digit',
          minute: '2-digit',
          meridiem: false
        }}
      />
    </div>
  );
}