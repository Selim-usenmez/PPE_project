"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";

export default function EmployeReservationsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  
  // Données
  const [salles, setSalles] = useState<any[]>([]);
  const [projets, setProjets] = useState<any[]>([]);
  const [reservations, setReservations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
    setUser(JSON.parse(stored));

    Promise.all([
      fetch("/api/salles").then(r => r.json()),
      fetch("/api/projets").then(r => r.json()), // L'employé ne devrait voir que SES projets idéalement
      fetch("/api/reservations").then(r => r.json())
    ]).then(([sallesData, projetsData, resasData]) => {
      setSalles(sallesData);
      setProjets(projetsData);
      setReservations(resasData);
      
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
            toast.success("Réservation confirmée ! 📅");
            const newResas = await fetch("/api/reservations").then(r => r.json());
            setReservations(newResas);
            setForm(f => ({ ...f, objet: "" }));
        } else {
            toast.error(data.error || "Erreur lors de la réservation");
        }
    } catch (e) { toast.error("Erreur serveur"); }
  };

  // L'employé ne peut pas supprimer (pour l'instant, pour simplifier)
  // Ou alors tu peux ajouter une vérification si c'est LUI qui a créé la resa.

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#030712]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
    </div>
  );

  return (
    <div className="min-h-screen p-6 md:p-10 text-gray-200 bg-[#030712]">
      <div className="max-w-7xl mx-auto animate-fade-in-up">
        
        {/* HEADER SIMPLE AVEC RETOUR DASHBOARD */}
        <div className="flex flex-col md:flex-row items-center justify-between mb-8 glass-panel p-6 rounded-2xl shadow-lg">
            <div>
                <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                    📅 Réserver une salle
                </h1>
                <p className="text-gray-400 mt-1 text-sm">Vérifiez les disponibilités et bloquez un créneau.</p>
            </div>
            <Link href="/employe/dashboard" className="mt-4 md:mt-0 px-5 py-2.5 rounded-xl border border-white/10 hover:bg-white/5 transition text-sm font-bold flex items-center gap-2 group">
                <span>←</span> <span className="group-hover:translate-x-1 transition-transform">Retour Dashboard</span>
            </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* --- FORMULAIRE --- */}
            <div className="lg:col-span-1">
                <div className="glass-panel p-8 rounded-2xl sticky top-8 border border-white/10">
                    <h2 className="text-xl font-bold mb-6 text-blue-400 border-b border-white/10 pb-4">Nouvelle Demande</h2>
                    
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Salle</label>
                            <select className="glass-input w-full cursor-pointer" 
                                value={form.id_salle} onChange={e => setForm({...form, id_salle: e.target.value})}>
                                {salles.map(s => <option key={s.id_salle} className="bg-slate-900" value={s.id_salle}>{s.nom_salle} ({s.capacite} pers.)</option>)}
                            </select>
                        </div>

                        <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Projet</label>
                            <select className="glass-input w-full cursor-pointer" 
                                value={form.id_projet} onChange={e => setForm({...form, id_projet: e.target.value})}>
                                {projets.map(p => <option key={p.id_projet} className="bg-slate-900" value={p.id_projet}>{p.nom_projet}</option>)}
                            </select>
                        </div>

                        <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Motif</label>
                            <input type="text" className="glass-input w-full placeholder-gray-600" placeholder="Ex: Point d'avancement" required
                                value={form.objet} onChange={e => setForm({...form, objet: e.target.value})} />
                        </div>

                        <div className="grid grid-cols-1 gap-4 bg-black/20 p-4 rounded-xl border border-white/5">
                            <div>
                                <label className="block text-[10px] font-bold text-blue-300 uppercase tracking-widest mb-2">Début</label>
                                <input type="datetime-local" className="glass-input w-full text-sm" required
                                    value={form.date_debut} onChange={e => setForm({...form, date_debut: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-purple-300 uppercase tracking-widest mb-2">Fin</label>
                                <input type="datetime-local" className="glass-input w-full text-sm" required
                                    value={form.date_fin} onChange={e => setForm({...form, date_fin: e.target.value})} />
                            </div>
                        </div>

                        <button type="submit" 
                            className="w-full btn-neon-blue py-3 rounded-xl font-bold mt-4 shadow-lg hover:shadow-blue-500/20 transition-all transform hover:scale-[1.02]">
                            Confirmer
                        </button>
                    </form>
                </div>
            </div>

            {/* --- LISTE (Lecture Seule pour l'employé) --- */}
            <div className="lg:col-span-2">
                <div className="glass-panel rounded-2xl overflow-hidden min-h-[600px] flex flex-col">
                    <div className="p-6 border-b border-white/10 bg-gradient-to-r from-blue-900/20 to-transparent">
                        <h2 className="text-xl font-bold text-white">📅 Planning Global</h2>
                    </div>
                    
                    {reservations.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-500 gap-4 opacity-50">
                            <span className="text-6xl">📭</span>
                            <p className="text-lg">Aucune réservation prévue.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-white/5 overflow-y-auto custom-scrollbar max-h-[800px]">
                            {reservations.map(res => (
                                <div key={res.id_reservation} className="p-5 hover:bg-white/5 transition flex justify-between items-center group">
                                    <div className="flex items-center gap-5">
                                        <div className="flex flex-col items-center justify-center bg-white/5 border border-white/10 rounded-xl p-3 w-16 h-16">
                                            <div className="text-[10px] text-blue-300 uppercase font-bold tracking-wide">
                                                {new Date(res.date_debut).toLocaleDateString('fr-FR', {weekday: 'short'})}
                                            </div>
                                            <div className="text-2xl font-bold text-white">
                                                {new Date(res.date_debut).getDate()}
                                            </div>
                                        </div>
                                        
                                        <div>
                                            <div className="flex items-center gap-3 mb-1">
                                                <span className="font-bold text-white text-lg">{res.salle.nom_salle}</span>
                                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20 uppercase font-bold">
                                                    {res.projet?.nom_projet}
                                                </span>
                                            </div>
                                            <div className="text-sm text-gray-400 flex items-center gap-2 font-mono">
                                                <span className="text-blue-200">{new Date(res.date_debut).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                                                <span className="text-gray-600">➔</span>
                                                <span className="text-purple-200">{new Date(res.date_fin).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                                                <span className="text-gray-600 mx-2">|</span>
                                                <span className="italic text-gray-500 font-sans">{res.objet}</span>
                                            </div>
                                        </div>
                                    </div>
                                    {/* Pas de bouton supprimer pour l'employé ici pour simplifier */}
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