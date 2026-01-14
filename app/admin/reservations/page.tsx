"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
// 👇 IMPORTS LUCIDE
import { 
  CalendarRange, ArrowLeft, PlusCircle, MapPin, Briefcase, 
  FileText, Clock, Save, Trash2, Loader2, CalendarX, 
  AlertTriangle, X, CheckCircle2 
} from "lucide-react";

export default function ReservationsPage() {
  const router = useRouter();
  
  // Données
  const [salles, setSalles] = useState<any[]>([]);
  const [projets, setProjets] = useState<any[]>([]);
  const [reservations, setReservations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // UI States
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Formulaire
  const [form, setForm] = useState({
    id_salle: "",
    id_projet: "",
    date_debut: "", 
    date_fin: "",
    objet: ""
  });

  useEffect(() => {
    const stored = localStorage.getItem("user_info");
    if (!stored) { router.push("/login"); return; }

    Promise.all([
      fetch("/api/salles").then(r => r.json()),
      fetch("/api/projets").then(r => r.json()),
      fetch("/api/reservations").then(r => r.json())
    ]).then(([sallesData, projetsData, resasData]) => {
      setSalles(sallesData);
      setProjets(projetsData);
      setReservations(resasData);
      
      // Pré-remplir intelligemment
      if (sallesData.length > 0) setForm(f => ({ ...f, id_salle: sallesData[0].id_salle }));
      if (projetsData.length > 0) setForm(f => ({ ...f, id_projet: projetsData[0].id_projet }));
      
      setLoading(false);
    });
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if(new Date(form.date_debut) >= new Date(form.date_fin)) {
        toast.error("La date de fin doit être après le début.");
        return;
    }

    try {
        const res = await fetch("/api/reservations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(form)
        });
        
        const data = await res.json();

        if (res.ok) {
            toast.success("Réservation confirmée !");
            const newResas = await fetch("/api/reservations").then(r => r.json());
            setReservations(newResas);
            setForm(f => ({ ...f, objet: "" }));
        } else {
            toast.error(data.error || "Erreur lors de la réservation");
        }
    } catch (e) { toast.error("Erreur serveur"); }
  };

  const handleDelete = async () => {
    if(!confirmDeleteId) return;

    try {
        const res = await fetch(`/api/reservations?id=${confirmDeleteId}`, { method: "DELETE" });
        if(res.ok) {
            toast.success("Réservation annulée");
            setReservations(reservations.filter(r => r.id_reservation !== confirmDeleteId));
        } else {
            toast.error("Impossible d'annuler");
        }
    } catch (e) { toast.error("Erreur réseau"); }
    
    setConfirmDeleteId(null);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#030712]">
        <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
            <p className="text-blue-400 animate-pulse font-mono text-sm">Chargement du planning...</p>
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
                    <h1 className="text-2xl font-bold text-white">Réservation de Salles</h1>
                    <p className="text-gray-400 text-sm">Organisez vos réunions et vérifiez les disponibilités.</p>
                </div>
            </div>
            <Link href="/employe/dashboard" className="mt-4 md:mt-0 px-5 py-2.5 rounded-xl border border-white/10 hover:bg-white/5 transition text-sm font-bold flex items-center gap-2 group text-gray-300 hover:text-white">
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> 
                Retour Dashboard
            </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* --- FORMULAIRE (Gauche) --- */}
            <div className="lg:col-span-1">
                <div className="glass-panel p-8 rounded-2xl sticky top-8 border border-white/10 shadow-2xl bg-[#0f172a]/50">
                    <h2 className="text-lg font-bold mb-6 text-white border-b border-white/10 pb-4 flex items-center gap-2">
                        <PlusCircle className="w-5 h-5 text-blue-400" /> Nouvelle Demande
                    </h2>
                    
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Salle */}
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 block ml-1">Salle</label>
                            <div className="relative">
                                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                <select className="glass-input w-full pl-9 cursor-pointer appearance-none bg-[#0f172a]" 
                                    value={form.id_salle} onChange={e => setForm({...form, id_salle: e.target.value})}>
                                    {salles.map(s => <option key={s.id_salle} value={s.id_salle}>{s.nom_salle} ({s.capacite} pers.)</option>)}
                                </select>
                            </div>
                        </div>

                        {/* Projet */}
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 block ml-1">Projet</label>
                            {projets.length > 0 ? (
                                <div className="relative">
                                    <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                    <select className="glass-input w-full pl-9 cursor-pointer appearance-none bg-[#0f172a]" 
                                        value={form.id_projet} onChange={e => setForm({...form, id_projet: e.target.value})}>
                                        {projets.map(p => <option key={p.id_projet} value={p.id_projet}>{p.nom_projet}</option>)}
                                    </select>
                                </div>
                            ) : (
                                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-300 text-xs text-center flex items-center justify-center gap-2">
                                    <AlertTriangle className="w-4 h-4" /> Aucun projet actif.
                                </div>
                            )}
                        </div>

                        {/* Motif */}
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 block ml-1">Motif</label>
                            <div className="relative">
                                <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                <input type="text" className="glass-input w-full pl-9 placeholder-gray-600" placeholder="Ex: Daily Meeting" required
                                    value={form.objet} onChange={e => setForm({...form, objet: e.target.value})} />
                            </div>
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

                        <button type="submit" disabled={projets.length === 0}
                            className="w-full btn-neon-blue py-3 rounded-xl font-bold mt-4 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg flex items-center justify-center gap-2 text-white">
                            <Save className="w-4 h-4" /> Confirmer la réservation
                        </button>
                    </form>
                </div>
            </div>

            {/* --- LISTE DES RÉSERVATIONS (Droite) --- */}
            <div className="lg:col-span-2">
                <div className="glass-panel rounded-2xl overflow-hidden min-h-[600px] flex flex-col border border-white/10 shadow-2xl">
                    <div className="p-6 border-b border-white/10 bg-white/[0.02] flex items-center justify-between">
                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                            <CalendarRange className="w-5 h-5 text-purple-400" /> Planning Global
                        </h2>
                        <span className="text-xs font-bold bg-white/10 px-2 py-1 rounded text-gray-400">
                            {reservations.length} créneaux
                        </span>
                    </div>
                    
                    {reservations.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-500 gap-4 opacity-50 py-20">
                            <CalendarX className="w-16 h-16 text-gray-600" />
                            <p className="text-sm">Aucune réservation prévue.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-white/5 overflow-y-auto custom-scrollbar max-h-[800px]">
                            {reservations.map(res => (
                                <div key={res.id_reservation} className="p-5 hover:bg-white/5 transition flex justify-between items-center group relative">
                                    <div className="flex items-center gap-5 relative z-10">
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
                                                <span className="font-bold text-white text-lg tracking-tight flex items-center gap-2">
                                                    {res.salle.nom_salle}
                                                </span>
                                                <span className="text-[10px] px-2 py-0.5 rounded text-blue-300 border border-blue-500/20 bg-blue-500/10 uppercase font-bold flex items-center gap-1">
                                                    <Briefcase className="w-3 h-3" />
                                                    {res.projet?.nom_projet}
                                                </span>
                                            </div>
                                            <div className="text-sm text-gray-400 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono">
                                                <div className="flex items-center gap-1.5 text-gray-300">
                                                    <Clock className="w-3 h-3 text-blue-400" />
                                                    {new Date(res.date_debut).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                                                    <span className="text-gray-600">➔</span>
                                                    {new Date(res.date_fin).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                                                </div>
                                                <div className="flex items-center gap-1.5 text-gray-500 italic font-sans">
                                                    <FileText className="w-3 h-3" />
                                                    {res.objet}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <button onClick={() => setConfirmDeleteId(res.id_reservation)} 
                                        className="text-red-400/50 hover:text-red-400 p-2 rounded-lg transition-all hover:bg-red-500/10 transform hover:scale-110" 
                                        title="Annuler">
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

        </div>

        {/* MODALE DE SUPPRESSION */}
        {confirmDeleteId && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-center z-[999] animate-fade-in">
                <div className="glass-panel p-8 rounded-2xl w-full max-w-sm text-center border border-red-500/30 shadow-[0_0_50px_rgba(239,68,68,0.2)]">
                    <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500">
                        <Trash2 className="w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Annuler la réservation ?</h3>
                    <p className="text-gray-400 text-sm mb-6">Cette action libérera le créneau pour les autres équipes.</p>
                    <div className="flex justify-center gap-3">
                        <button 
                            onClick={() => setConfirmDeleteId(null)} 
                            className="flex-1 px-4 py-2.5 rounded-xl border border-white/10 text-gray-300 hover:bg-white/5 transition text-sm"
                        >
                            Retour
                        </button>
                        <button 
                            onClick={handleDelete} 
                            className="flex-1 bg-red-500 hover:bg-red-600 text-white px-4 py-2.5 rounded-xl font-bold text-sm transition shadow-lg"
                        >
                            Oui, annuler
                        </button>
                    </div>
                </div>
            </div>
        )}

      </div>
    </div>
  );
}