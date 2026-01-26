"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { 
  Settings, LogOut, Calendar, AlertTriangle, Briefcase, Clock, MapPin, Loader2, 
  Plus, Trash2, Edit3, X, CalendarRange, FolderOpen, ShieldCheck, User, Box, 
  CheckCircle2, BellRing 
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import frLocale from '@fullcalendar/core/locales/fr';
import { can, canAssignTasks, canAccessAdminPanel } from "@/lib/permissions";

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
  
  // Données Globales
  const [allSalles, setAllSalles] = useState<any[]>([]);
  const [allRessources, setAllRessources] = useState<any[]>([]);
  
  // Données Filtrées
  const [dispoSalles, setDispoSalles] = useState<any[]>([]);
  const [dispoRessources, setDispoRessources] = useState<any[]>([]);
  const [checkingDispo, setCheckingDispo] = useState(false);

  const [events, setEvents] = useState<any[]>([]);
  const [mesProjets, setMesProjets] = useState<any[]>([]);
  const [mesTaches, setMesTaches] = useState<any[]>([]);
  const [employesList, setEmployesList] = useState<any[]>([]); 

  const [stats, setStats] = useState({ projets: 0, reservations: 0, taches: 0 });

  const [showModalEvent, setShowModalEvent] = useState(false);
  const [showModalProjets, setShowModalProjets] = useState(false);
  const [showModalReunions, setShowModalReunions] = useState(false);
  const [showModalAssignTask, setShowModalAssignTask] = useState(false);

  const [editMode, setEditMode] = useState(false);
  const [displayEvent, setDisplayEvent] = useState<any>({});
  const [formData, setFormData] = useState({ id: "", objet: "", start: "", end: "", id_salle: "", id_ressource: "" });
  const [taskForm, setTaskForm] = useState({ titre: "", id_assigne_a: "", id_projet: "" });

  const [projetCible, setProjetCible] = useState<any>(null);
  const [equipeProjet, setEquipeProjet] = useState<any[]>([]);

  useEffect(() => {
    const checkSession = async () => {
        try {
            const res = await fetch("/api/auth/session");
            if (!res.ok) { localStorage.removeItem("user_info"); router.push("/login"); return; }
            const updatedUser = await res.json();
            setUser(updatedUser);
            loadData(updatedUser.id_employe, updatedUser.role);
        } catch (e) { router.push("/login"); }
    };
    checkSession();
  }, [router]);

  // EFFET DE VÉRIFICATION DISPO
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
        fetchReservations(userId),
        fetch(`/api/employes/${userId}/projets`).then(r => r.json()),
        fetch("/api/salles").then(r => r.json()),
        fetch("/api/ressources?etat=DISPONIBLE").then(r => r.json()),
        fetch(`/api/taches?userId=${userId}`).then(r => r.json())
    ];

    if (canAssignTasks(role)) {
        promises.push(fetch("/api/employes").then(r => r.json()));
    }

    const [resas, projets, sallesData, ressourcesData, tachesData, allEmployes] = await Promise.all(promises);

    setAllSalles(sallesData);
    setAllRessources(ressourcesData);
    setDispoSalles(sallesData); 
    setDispoRessources(ressourcesData);

    setMesProjets(Array.isArray(projets) ? projets : []);
    setMesTaches(Array.isArray(tachesData) ? tachesData : []);
    if (allEmployes) setEmployesList(allEmployes);

    setStats({
        reservations: (resas as any)?.length || 0,
        projets: (projets as any)?.length || 0,
        taches: (tachesData as any)?.filter((t:any) => t.statut === 'A_FAIRE').length || 0
    });

    setLoading(false);
  };

  const fetchReservations = async (userId: string) => {
      const res = await fetch(`/api/reservations?userId=${userId}&refresh=${Date.now()}`);
      if(res.ok) {
          const data = await res.json();
          const evts = data.map((evt: any) => ({
             id: evt.id_reservation,
             title: `${evt.objet} - ${evt.salle?.nom_salle || 'Sans lieu'}`,
             start: evt.date_debut, end: evt.date_fin,
             backgroundColor: evt.id_employe === userId ? '#3b82f6' : '#4b5563',
             editable: evt.id_employe === userId,
             extendedProps: { ...evt, isMine: evt.id_employe === userId }
          }));
          setEvents(evts);
          return evts;
      }
      return [];
  };

  const handlePlanTask = (tache: any) => {
      const now = new Date();
      const end = new Date(now.getTime() + 60*60*1000); 
      setFormData({ id: "", objet: `Travail : ${tache.titre}`, start: formatForInput(now), end: formatForInput(end), id_salle: "", id_ressource: "" });
      fetch("/api/taches", { method: "PUT", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ id_tache: tache.id_tache, statut: "PLANIFIE" }) });
      setEditMode(true);
      setShowModalEvent(true);
  };

  const handleFinishTask = async (id_tache: string) => {
      await fetch("/api/taches", { method: "PUT", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ id_tache, statut: "TERMINE" }) });
      toast.success("Tâche terminée !");
      loadData(user.id_employe, user.role); 
  };

  const handleOpenAssign = async (projet: any) => {
      setProjetCible(projet); 
      setTaskForm({ titre: "", id_assigne_a: "", id_projet: "" });
      try {
          const res = await fetch(`/api/projets/${projet.id_projet}/membres`);
          if (res.ok) {
              const membres = await res.json();
              
              // 🛡️ FIX : On enlève les doublons éventuels renvoyés par l'API
              const uniqueMembres = membres.filter((v:any,i:any,a:any)=>a.findIndex((t:any)=>(t.id_employe===v.id_employe))===i);
              
              // On filtre pour ne pas s'assigner à soi-même
              setEquipeProjet(uniqueMembres.filter((m: any) => m.id_employe !== user.id_employe));
              setShowModalAssignTask(true);
          }
      } catch(e) { toast.error("Erreur équipe"); }
  };

  const handleAssignTask = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!projetCible) return;
      try {
          const res = await fetch("/api/taches", { 
              method: "POST", 
              headers: {"Content-Type":"application/json"}, 
              body: JSON.stringify({ ...taskForm, id_projet: projetCible.id_projet, id_assigne_par: user.id_employe }) 
          });
          if(res.ok) { toast.success("Tâche envoyée !"); setShowModalAssignTask(false); }
          else { toast.error("Erreur"); }
      } catch(err) { toast.error("Erreur"); }
  };
  
  const handleEventClick = (info: any) => {
      const event = info.event;
      const props = event.extendedProps;
      setDisplayEvent({ ...props, start: event.start, end: event.end, isMine: props.isMine });
      setFormData({ id: event.id, objet: props.objet, start: formatForInput(event.start), end: formatForInput(event.end), id_salle: props.id_salle || "", id_ressource: props.id_ressource || "" });
      setEditMode(false);
      setShowModalEvent(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
      e.preventDefault();
      try {
          const payload = { ...formData, date_debut: new Date(formData.start).toISOString(), date_fin: new Date(formData.end).toISOString() };
          const res = await fetch("/api/reservations", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...payload, id_reservation: formData.id }) });
          if(res.ok) { toast.success("Modifié !"); loadData(user.id_employe, user.role); setShowModalEvent(false); }
          else { toast.error("Conflit ou erreur !"); }
      } catch (err) { toast.error("Erreur"); }
  };

  const handleDelete = async () => {
      if(!window.confirm("Supprimer ?")) return;
      await fetch(`/api/reservations?id=${formData.id}`, { method: "DELETE" });
      loadData(user.id_employe, user.role);
      setShowModalEvent(false);
  };

  const handleEventDropOrResize = async (info: any) => {
      if (!info.event.extendedProps.isMine) { info.revert(); return; }
      const payload = { id_reservation: info.event.id, date_debut: info.event.start.toISOString(), date_fin: info.event.end.toISOString() };
      await fetch("/api/reservations", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  };

  const handleLogout = async () => { await fetch("/api/auth/logout", { method: "POST" }); localStorage.removeItem("user_info"); router.push("/login"); };

  if (!user) return <div className="min-h-screen bg-[#030712] flex items-center justify-center"><Loader2 className="animate-spin text-white"/></div>;

  const isOwner = displayEvent.isMine;
  const canEdit = can(user.role, "RESERVATION", "UPDATE", isOwner);
  const canDelete = can(user.role, "RESERVATION", "DELETE", isOwner);
  const Container = editMode ? 'form' : 'div';

  return (
    <div className="min-h-screen bg-[#030712] text-gray-200 p-6 md:p-10">
      <div className="max-w-[1600px] mx-auto space-y-8 animate-fade-in">
        
        {/* HEADER */}
        <header className="flex flex-col md:flex-row justify-between items-center glass-panel p-6 rounded-2xl shadow-lg border border-white/5">
             <div className="flex items-center gap-4"><Image src="/logo.png" alt="Logo" width={48} height={48}/><h1 className="text-2xl font-bold text-white">Espace {user.role === 'CHEF_DE_PROJET' ? 'Chef de Projet' : user.role === 'RH' ? 'Ressources Humaines' : 'Employé'}</h1></div>
             <div className="flex gap-3">
                {canAccessAdminPanel(user.role) && <button onClick={() => router.push('/admin/dashboard')} className="px-4 py-2 rounded-xl bg-purple-600/10 border border-purple-500/30 text-purple-400 font-bold flex items-center gap-2"><ShieldCheck className="w-4 h-4"/> Admin</button>}
                <button onClick={() => router.push('/employe/profile')} className="px-4 py-2 rounded-xl border border-white/10 hover:bg-white/5 font-bold text-gray-300 flex items-center gap-2"><Settings className="w-4 h-4"/> Profil</button>
                <button onClick={handleLogout} className="btn-neon-red px-4 py-2 rounded-xl font-bold flex items-center gap-2"><LogOut className="w-4 h-4"/> Déco</button>
            </div>
        </header>

        {/* WIDGETS */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="glass-panel p-5 rounded-2xl border-l-4 border-orange-500 flex items-center justify-between"><div><p className="text-xs text-orange-400 font-bold uppercase">Mes Tâches</p><p className="text-3xl font-bold text-white">{stats.taches}</p></div><div className="p-3 bg-orange-500/10 rounded-xl text-orange-500"><BellRing className="w-6 h-6" /></div></div>
            <div onClick={() => setShowModalProjets(true)} className="glass-panel p-5 rounded-2xl border-l-4 border-blue-500 cursor-pointer hover:bg-white/5"><div><p className="text-xs text-blue-400 font-bold uppercase">Projets</p><p className="text-3xl font-bold text-white">{stats.projets}</p></div></div>
            <div onClick={() => router.push('/employe/reservations')} className="glass-panel p-1 rounded-2xl border border-white/10 hover:border-blue-500/50 cursor-pointer transition active:scale-95"><div className="h-full flex flex-col items-center justify-center p-4"><div className="mb-2 p-3 bg-white/5 rounded-full text-blue-400"><Plus className="w-6 h-6" /></div><span className="text-sm font-bold text-gray-300">Réserver</span></div></div>
            <div onClick={() => router.push('/employe/incidents')} className="glass-panel p-1 rounded-2xl border border-white/10 hover:border-red-500/50 cursor-pointer transition active:scale-95"><div className="h-full flex flex-col items-center justify-center p-4"><div className="mb-2 p-3 bg-white/5 rounded-full text-red-400"><AlertTriangle className="w-6 h-6" /></div><span className="text-sm font-bold text-gray-300">Signaler</span></div></div>
        </div>

        {/* MAIN */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div className="lg:col-span-1 glass-panel p-6 rounded-2xl border border-white/10 h-[750px] overflow-y-auto">
                <h3 className="font-bold text-white mb-4 flex items-center gap-2"><BellRing className="w-4 h-4 text-orange-400"/> À faire</h3>
                <div className="space-y-3">
                    {mesTaches.filter(t => t.statut === 'A_FAIRE').length === 0 && <p className="text-gray-500 text-sm italic">Aucune tâche.</p>}
                    {mesTaches.filter(t => t.statut === 'A_FAIRE').map(t => (
                        <div key={t.id_tache} className="p-4 bg-white/5 rounded-xl border border-white/5 hover:border-orange-500/30 transition group">
                            <p className="text-white font-bold text-sm">{t.titre}</p>
                            <p className="text-xs text-gray-400 mt-1">Par : {t.assigne_par.prenom}</p>
                            {t.projet && <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded mt-2 inline-block">{t.projet.nom_projet}</span>}
                            <div className="flex gap-2 mt-3 pt-3 border-t border-white/5">
                                <button onClick={() => handlePlanTask(t)} className="flex-1 text-xs bg-blue-600/20 text-blue-400 py-1.5 rounded hover:bg-blue-600/30 font-bold flex items-center justify-center gap-1"><Calendar className="w-3 h-3"/> Planifier</button>
                                <button onClick={() => handleFinishTask(t.id_tache)} className="flex-1 text-xs bg-green-600/20 text-green-400 py-1.5 rounded hover:bg-green-600/30 font-bold flex items-center justify-center gap-1"><CheckCircle2 className="w-3 h-3"/> Fait</button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="lg:col-span-3 glass-panel p-6 rounded-2xl border border-white/10">
                 <FullCalendar plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]} initialView="timeGridWeek" locale={frLocale} events={events} eventClick={handleEventClick} eventDrop={handleEventDropOrResize} eventResize={handleEventDropOrResize} height="100%" />
            </div>
        </div>

        {/* MODALE PROJETS */}
        {showModalProjets && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setShowModalProjets(false)}>
                <div className="glass-panel w-full max-w-2xl p-8 rounded-2xl border border-white/10 bg-[#0f172a] relative" onClick={e => e.stopPropagation()}>
                    <h2 className="text-2xl font-bold text-white mb-6">Mes Projets</h2>
                    {mesProjets.map(p => (
                        <div key={p.id_projet} className="p-4 bg-white/5 rounded-xl mb-4 flex justify-between items-center group hover:bg-white/10 transition">
                            <div><h3 className="text-white font-bold">{p.nom_projet}</h3></div>
                            {canAssignTasks(user.role) && (
                                <button onClick={() => handleOpenAssign(p)} className="text-xs bg-orange-500/20 text-orange-400 px-3 py-2 rounded-lg font-bold hover:bg-orange-500/30 transition flex items-center gap-2"><Plus className="w-3 h-3"/> Assigner Tâche</button>
                            )}
                        </div>
                    ))}
                    <button onClick={() => setShowModalProjets(false)} className="absolute top-4 right-4 text-gray-400"><X/></button>
                </div>
            </div>
        )}

        {/* MODALE ASSIGNATION */}
        {showModalAssignTask && projetCible && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
                <div className="glass-panel w-full max-w-md p-8 rounded-2xl border border-orange-500/30 bg-[#0f172a] shadow-2xl relative">
                    <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2"><Briefcase className="w-5 h-5 text-orange-500"/> Tâche : {projetCible.nom_projet}</h2>
                    <form onSubmit={handleAssignTask} className="space-y-4">
                        <div><label className="text-xs font-bold text-gray-500">Titre</label><input type="text" required className="glass-input w-full" value={taskForm.titre} onChange={e => setTaskForm({...taskForm, titre: e.target.value})} placeholder="Ex: Faire la maquette..." /></div>
                        <div>
                            <label className="text-xs font-bold text-gray-500">Assigner à (Membre du projet)</label>
                            
                            {/* 🛡️ CORRECTION FINALE : Clé composite (id + index) pour éviter les doublons */}
                            <select 
                                className="glass-input w-full bg-[#0f172a]" 
                                required 
                                value={taskForm.id_assigne_a} 
                                onChange={e => setTaskForm({...taskForm, id_assigne_a: e.target.value})}
                            >
                                <option value="">Choisir un membre...</option>
                                
                                {Array.isArray(equipeProjet) && equipeProjet.map((emp: any, index: number) => (
                                    <option key={`${emp.id_employe}-${index}`} value={emp.id_employe}>
                                        {emp.nom} {emp.prenom} ({emp.role})
                                    </option>
                                ))}
                            </select>
                            
                            {equipeProjet.length === 0 && <p className="text-[10px] text-red-400 mt-1">Aucun autre membre dans ce projet.</p>}
                        </div>
                        <button type="submit" className="w-full btn-neon-blue py-3 rounded-xl font-bold text-white">Envoyer</button>
                    </form>
                    <button onClick={() => setShowModalAssignTask(false)} className="absolute top-4 right-4 text-gray-400"><X/></button>
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
                        
                        <div className="grid grid-cols-2 gap-4">
                             <div><label className="text-gray-500 text-xs font-bold">Début</label>{editMode ? <input type="datetime-local" className="glass-input w-full text-xs" value={formData.start} onChange={e => setFormData({...formData, start: e.target.value})}/> : <p className="text-gray-300 text-sm">{new Date(displayEvent.start).toLocaleString()}</p>}</div>
                             <div><label className="text-gray-500 text-xs font-bold">Fin</label>{editMode ? <input type="datetime-local" className="glass-input w-full text-xs" value={formData.end} onChange={e => setFormData({...formData, end: e.target.value})}/> : <p className="text-gray-300 text-sm">{new Date(displayEvent.end).toLocaleString()}</p>}</div>
                        </div>

                        {/* SELECTS INTELLIGENTS */}
                        {editMode && (
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] text-gray-500 uppercase font-bold mb-1 block">Salle</label>
                                    <select className="glass-input bg-[#0f172a] w-full text-xs" value={formData.id_salle} onChange={e => setFormData({...formData, id_salle: e.target.value, id_ressource: ""})}>
                                        <option value="">Aucune</option>
                                        {allSalles.map(s => {
                                            const isDispo = dispoSalles.some((ds: any) => ds.id_salle === s.id_salle) || s.id_salle === formData.id_salle; // Dispo OU c'est celle qu'on a déjà
                                            return (
                                                <option key={s.id_salle} value={s.id_salle} disabled={!isDispo} className={!isDispo ? "text-red-500" : ""}>
                                                    {s.nom_salle} {!isDispo ? "(Occupé)" : ""}
                                                </option>
                                            )
                                        })}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] text-gray-500 uppercase font-bold mb-1 block">Matériel</label>
                                    <select className="glass-input bg-[#0f172a] w-full text-xs" value={formData.id_ressource} onChange={e => setFormData({...formData, id_ressource: e.target.value, id_salle: ""})}>
                                        <option value="">Aucun</option>
                                        {allRessources.map(r => {
                                            const isDispo = dispoRessources.some((dr: any) => dr.id_ressource === r.id_ressource) || r.id_ressource === formData.id_ressource;
                                            return (
                                                <option key={r.id_ressource} value={r.id_ressource} disabled={!isDispo} className={!isDispo ? "text-red-500" : ""}>
                                                    {r.nom_ressource} {!isDispo ? "(Pris)" : ""}
                                                </option>
                                            )
                                        })}
                                    </select>
                                </div>
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
      </div>
    </div>
  );
}