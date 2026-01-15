"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
// 👇 IMPORTS LUCIDE
import { 
  CalendarRange, ArrowLeft, MapPin, Briefcase, 
  FileText, Clock, Save, Loader2, CalendarX, 
  Box, Search, ChevronRight 
} from "lucide-react";

export default function EmployeReservationsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  
  // Données
  const [salles, setSalles] = useState<any[]>([]);
  const [ressources, setRessources] = useState<any[]>([]); 
  const [mesProjets, setMesProjets] = useState<any[]>([]);
  const [reservations, setReservations] = useState<any[]>([]);

  // Formulaire
  const [form, setForm] = useState({
    id_salle: "",
    id_ressource: "", 
    id_projet: "",
    date_debut: "", 
    date_fin: "",
    objet: ""
  });

  // Chargement des données
  useEffect(() => {
    const initData = async () => {
      const stored = localStorage.getItem("user_info");
      if (!stored) { router.push("/login"); return; }
      const user = JSON.parse(stored);

      try {
        const [resSalles, resRessources, resProjets, resResas] = await Promise.all([
            fetch("/api/salles").then(r => r.json()),
            fetch("/api/ressources?etat=DISPONIBLE").then(r => r.json()), 
            fetch(`/api/employes/${user.id_employe}/projets`).then(r => r.json()),
            fetch("/api/reservations").then(r => r.json())
        ]);

        setSalles(resSalles);
        setRessources(resRessources);
        setMesProjets(Array.isArray(resProjets) ? resProjets : []);
        setReservations(resResas);
        
        // Pré-sélection intelligente
        if (Array.isArray(resProjets) && resProjets.length > 0) {
            setForm(f => ({ ...f, id_projet: resProjets[0].id_projet }));
        }

      } catch (e) {
        toast.error("Impossible de charger les données.");
      } finally {
        setLoading(false);
      }
    };
    initData();
  }, [router]);

  // Soumission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if(new Date(form.date_debut) >= new Date(form.date_fin)) {
        toast.error("La date de fin doit être après le début.");
        return;
    }

    if(!form.id_salle && !form.id_ressource) {
        toast.error("Veuillez sélectionner une salle ou un équipement.");
        return;
    }

    const storedUser = localStorage.getItem("user_info");
    const user = JSON.parse(storedUser || "{}");

    const payload = {
        ...form,
        id_employe: user.id_employe,
        id_salle: form.id_salle || undefined,
        id_ressource: form.id_ressource || undefined
    };

    try {
        const res = await fetch("/api/reservations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        
        const data = await res.json();

        if (res.ok) {
            toast.success("Réservation validée !");
            
            // Rafraîchir
            const [newResas, newRessources] = await Promise.all([
                fetch("/api/reservations").then(r => r.json()),
                fetch("/api/ressources?etat=DISPONIBLE").then(r => r.json())
            ]);
            
            setReservations(newResas);
            setRessources(newRessources);
            setForm(f => ({ ...f, objet: "", id_ressource: "" })); 
        } else {
            toast.error(data.error || "Erreur lors de la réservation");
        }
    } catch (e) { toast.error("Erreur serveur"); }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#030712]">
        <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
            <p className="text-blue-400 animate-pulse font-mono text-sm">Chargement...</p>
        </div>
    </div>
  );

  return (
    <div className="min-h-screen p-6 md:p-10 text-gray-200 bg-[#030712]">
      <div className="max-w-7xl mx-auto animate-fade-in-up">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row items-center justify-between mb-8 glass-panel p-6 rounded-2xl shadow-lg border border-white/10">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl border border-white/10 text-white">
                    <CalendarRange className="w-8 h-8" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-white">Réservation & Emprunt</h1>
                    <p className="text-gray-400 text-sm">Réservez une salle ou empruntez du matériel.</p>
                </div>
            </div>
            <Link href="/employe/dashboard" className="mt-4 md:mt-0 px-5 py-2.5 rounded-xl border border-white/10 hover:bg-white/5 transition text-sm font-bold flex items-center gap-2 group text-gray-300 hover:text-white">
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> 
                Retour Dashboard
            </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* --- FORMULAIRE --- */}
            <div className="lg:col-span-1">
                <div className="glass-panel p-8 rounded-2xl sticky top-8 border border-white/10 shadow-2xl bg-[#0f172a]/50">
                    <h2 className="text-lg font-bold mb-6 text-white border-b border-white/10 pb-4 flex items-center gap-2">
                        <Search className="w-5 h-5 text-blue-400" /> Nouvelle Demande
                    </h2>
                    
                    <form onSubmit={handleSubmit} className="space-y-5">
                        
                        {/* Choix du Projet */}
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 block ml-1">Projet concerné *</label>
                            <div className="relative">
                                <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                <select 
                                    className="glass-input w-full pl-9 cursor-pointer appearance-none bg-[#0f172a]" 
                                    value={form.id_projet} 
                                    onChange={e => setForm({...form, id_projet: e.target.value})}
                                    required
                                >
                                    <option value="">-- Sélectionner un projet --</option>
                                    {mesProjets.map(p => (
                                        <option key={p.id_projet} value={p.id_projet}>{p.nom_projet}</option>
                                    ))}
                                </select>
                            </div>
                            {mesProjets.length === 0 && <p className="text-xs text-red-400 mt-2 flex items-center gap-1"><Loader2 className="w-3 h-3" /> Aucun projet affilié.</p>}
                        </div>

                        {/* Choix Salle */}
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 block ml-1">Salle (Optionnel)</label>
                            <div className="relative">
                                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                <select className="glass-input w-full pl-9 cursor-pointer appearance-none bg-[#0f172a]" 
                                    value={form.id_salle} onChange={e => setForm({...form, id_salle: e.target.value})}>
                                    <option value="">-- Aucune --</option>
                                    {salles.map(s => <option key={s.id_salle} value={s.id_salle}>{s.nom_salle} ({s.capacite}p)</option>)}
                                </select>
                            </div>
                        </div>

                        {/* Choix Matériel */}
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 block ml-1">Matériel (Optionnel)</label>
                            <div className="relative">
                                <Box className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                <select className="glass-input w-full pl-9 cursor-pointer appearance-none bg-[#0f172a]" 
                                    value={form.id_ressource} onChange={e => setForm({...form, id_ressource: e.target.value})}>
                                    <option value="">-- Aucun --</option>
                                    {ressources.map(r => (
                                        <option key={r.id_ressource} value={r.id_ressource}>
                                            {r.nom_ressource} ({r.type.replace('_',' ')})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <p className="text-[10px] text-blue-300/60 mt-1 italic ml-1">Seuls les équipements disponibles sont listés.</p>
                        </div>

                        {/* Dates */}
                        <div className="grid grid-cols-1 gap-4 bg-white/5 p-4 rounded-xl border border-white/5">
                            <div>
                                <label className="flex items-center gap-2 text-[10px] font-bold text-blue-300 uppercase tracking-widest mb-2">
                                    <Clock className="w-3 h-3" /> Début
                                </label>
                                <input type="datetime-local" className="glass-input w-full text-xs" required
                                    value={form.date_debut} onChange={e => setForm({...form, date_debut: e.target.value})} />
                            </div>
                            <div>
                                <label className="flex items-center gap-2 text-[10px] font-bold text-purple-300 uppercase tracking-widest mb-2">
                                    <Clock className="w-3 h-3" /> Fin
                                </label>
                                <input type="datetime-local" className="glass-input w-full text-xs" required
                                    value={form.date_fin} onChange={e => setForm({...form, date_fin: e.target.value})} />
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 block ml-1">Motif</label>
                            <div className="relative">
                                <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                <input type="text" className="glass-input w-full pl-9 placeholder-gray-600" placeholder="Ex: Besoin microscope" 
                                    value={form.objet} onChange={e => setForm({...form, objet: e.target.value})} />
                            </div>
                        </div>

                        <button type="submit" 
                            disabled={mesProjets.length === 0}
                            className="w-full btn-neon-blue py-3 rounded-xl font-bold mt-4 shadow-lg flex items-center justify-center gap-2 text-white disabled:opacity-50 disabled:cursor-not-allowed">
                            <Save className="w-4 h-4" /> Confirmer la demande
                        </button>
                    </form>
                </div>
            </div>

            {/* --- LISTE DES RÉSERVATIONS ACTUELLES --- */}
            <div className="lg:col-span-2">
                <div className="glass-panel rounded-2xl overflow-hidden min-h-[600px] flex flex-col border border-white/10 shadow-xl">
                    <div className="p-6 border-b border-white/10 bg-white/[0.02] flex items-center justify-between">
                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                            <CalendarRange className="w-5 h-5 text-purple-400" /> Planning des Salles
                        </h2>
                        <span className="text-xs bg-white/10 px-2 py-1 rounded text-gray-400 font-bold">{reservations.length} actifs</span>
                    </div>
                    
                    {reservations.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-500 gap-4 opacity-50 py-20">
                            <CalendarX className="w-16 h-16 text-gray-600" />
                            <p className="text-sm">Aucune réservation pour le moment.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-white/5 overflow-y-auto custom-scrollbar max-h-[800px]">
                            {reservations.map(res => (
                                <div key={res.id_reservation} className="p-5 hover:bg-white/5 transition flex justify-between items-center group relative">
                                    <div className="flex items-center gap-5">
                                        {/* Date Box */}
                                        <div className="flex flex-col items-center justify-center bg-[#0f172a] border border-white/10 rounded-xl w-16 h-16 shadow-inner shrink-0">
                                            <div className="text-[10px] text-blue-400 uppercase font-bold tracking-wide">
                                                {new Date(res.date_debut).toLocaleDateString('fr-FR', {weekday: 'short'})}
                                            </div>
                                            <div className="text-xl font-bold text-white">
                                                {new Date(res.date_debut).getDate()}
                                            </div>
                                        </div>
                                        
                                        <div>
                                            <div className="flex items-center gap-3 mb-1">
                                                <span className="font-bold text-white text-base">
                                                    {res.salle ? res.salle.nom_salle : res.ressource ? res.ressource.nom_ressource : "Réservation"}
                                                </span>
                                                <span className="text-[9px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20 uppercase font-bold flex items-center gap-1">
                                                    <Briefcase className="w-3 h-3" />
                                                    {res.projet?.nom_projet}
                                                </span>
                                            </div>
                                            <div className="text-xs text-gray-400 flex flex-wrap items-center gap-2 font-mono">
                                                <span className="text-blue-200">{new Date(res.date_debut).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                                                <ChevronRight className="w-3 h-3 text-gray-600" />
                                                <span className="text-purple-200">{new Date(res.date_fin).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                                                <span className="w-px h-3 bg-white/10 mx-1"></span>
                                                <span className="italic text-gray-500 font-sans flex items-center gap-1">
                                                    <FileText className="w-3 h-3" /> {res.objet}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

        </div>
      </div>
    </div>
  );
}