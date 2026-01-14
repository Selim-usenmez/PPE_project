"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";

export default function EmployeReservationsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  
  // Données
  const [salles, setSalles] = useState<any[]>([]);
  const [ressources, setRessources] = useState<any[]>([]); // Pour le matériel
  const [mesProjets, setMesProjets] = useState<any[]>([]);
  const [reservations, setReservations] = useState<any[]>([]);

  // Formulaire
  const [form, setForm] = useState({
    id_salle: "",
    id_ressource: "", // Nouveau champ
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
            fetch("/api/ressources?etat=DISPONIBLE").then(r => r.json()), // Seulement dispo
            fetch(`/api/employes/${user.id_employe}/projets`).then(r => r.json()), // Ses projets
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
        console.error("Erreur chargement", e);
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
    
    // Validation basique dates
    if(new Date(form.date_debut) >= new Date(form.date_fin)) {
        toast.error("La date de fin doit être après le début.");
        return;
    }

    // Validation : Au moins une salle OU une ressource
    if(!form.id_salle && !form.id_ressource) {
        toast.error("Veuillez sélectionner une salle ou un équipement.");
        return;
    }

    const storedUser = localStorage.getItem("user_info");
    const user = JSON.parse(storedUser || "{}");

    // Nettoyage des champs vides pour l'API
    const payload = {
        ...form,
        id_employe: user.id_employe, // Pour l'historique
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
            toast.success("Réservation validée ! 🚀");
            
            // Rafraîchir les listes
            const [newResas, newRessources] = await Promise.all([
                fetch("/api/reservations").then(r => r.json()),
                fetch("/api/ressources?etat=DISPONIBLE").then(r => r.json())
            ]);
            
            setReservations(newResas);
            setRessources(newRessources);
            
            // Reset partiel du formulaire
            setForm(f => ({ ...f, objet: "", id_ressource: "" })); 
        } else {
            toast.error(data.error || "Erreur lors de la réservation");
        }
    } catch (e) { toast.error("Erreur serveur"); }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#030712]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
    </div>
  );

  return (
    <div className="min-h-screen p-6 md:p-10 text-gray-200 bg-[#030712]">
      <div className="max-w-7xl mx-auto animate-fade-in-up">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row items-center justify-between mb-8 glass-panel p-6 rounded-2xl shadow-lg border border-white/5">
            <div>
                <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                    📅 Réservation & Emprunt
                </h1>
                <p className="text-gray-400 mt-1 text-sm">Réservez une salle ou empruntez du matériel pour vos projets.</p>
            </div>
            <Link href="/employe/dashboard" className="mt-4 md:mt-0 px-5 py-2.5 rounded-xl border border-white/10 hover:bg-white/5 transition text-sm font-bold flex items-center gap-2 group">
                <span>←</span> <span className="group-hover:translate-x-1 transition-transform">Retour Dashboard</span>
            </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* --- FORMULAIRE --- */}
            <div className="lg:col-span-1">
                <div className="glass-panel p-8 rounded-2xl sticky top-8 border border-white/10 shadow-xl bg-gradient-to-b from-white/5 to-transparent">
                    <h2 className="text-xl font-bold mb-6 text-white border-b border-white/10 pb-4 flex items-center gap-2">
                        <span>📝</span> Nouvelle Demande
                    </h2>
                    
                    <form onSubmit={handleSubmit} className="space-y-5">
                        
                        {/* Choix du Projet */}
                        <div>
                            <label className="block text-[10px] font-bold text-blue-300 uppercase tracking-widest mb-2">Projet concerné *</label>
                            <select 
                                className="glass-input w-full cursor-pointer bg-slate-900 border-blue-500/30 focus:border-blue-400" 
                                value={form.id_projet} 
                                onChange={e => setForm({...form, id_projet: e.target.value})}
                                required
                            >
                                <option value="">-- Sélectionner --</option>
                                {mesProjets.map(p => (
                                    <option key={p.id_projet} value={p.id_projet}>{p.nom_projet}</option>
                                ))}
                            </select>
                            {mesProjets.length === 0 && <p className="text-xs text-red-400 mt-1">Aucun projet affilié.</p>}
                        </div>

                        {/* Choix Salle */}
                        <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Salle (Optionnel)</label>
                            <select className="glass-input w-full cursor-pointer bg-slate-900" 
                                value={form.id_salle} onChange={e => setForm({...form, id_salle: e.target.value})}>
                                <option value="">-- Aucune --</option>
                                {salles.map(s => <option key={s.id_salle} value={s.id_salle}>{s.nom_salle} ({s.capacite}p)</option>)}
                            </select>
                        </div>

                        {/* Choix Matériel */}
                        <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Matériel (Optionnel)</label>
                            <select className="glass-input w-full cursor-pointer bg-slate-900" 
                                value={form.id_ressource} onChange={e => setForm({...form, id_ressource: e.target.value})}>
                                <option value="">-- Aucun --</option>
                                {ressources.map(r => (
                                    <option key={r.id_ressource} value={r.id_ressource}>
                                        {r.nom_ressource} ({r.type})
                                    </option>
                                ))}
                            </select>
                            <p className="text-[10px] text-gray-500 mt-1 italic">Seuls les équipements disponibles sont listés.</p>
                        </div>

                        {/* Dates */}
                        <div className="grid grid-cols-1 gap-4 bg-black/20 p-4 rounded-xl border border-white/5">
                            <div>
                                <label className="block text-[10px] font-bold text-gray-300 uppercase tracking-widest mb-2">Début *</label>
                                <input type="datetime-local" className="glass-input w-full text-sm" required
                                    value={form.date_debut} onChange={e => setForm({...form, date_debut: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-gray-300 uppercase tracking-widest mb-2">Fin *</label>
                                <input type="datetime-local" className="glass-input w-full text-sm" required
                                    value={form.date_fin} onChange={e => setForm({...form, date_fin: e.target.value})} />
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Motif</label>
                            <input type="text" className="glass-input w-full placeholder-gray-600" placeholder="Ex: Besoin microscope" 
                                value={form.objet} onChange={e => setForm({...form, objet: e.target.value})} />
                        </div>

                        <button type="submit" 
                            disabled={mesProjets.length === 0}
                            className="w-full btn-neon-blue py-3 rounded-xl font-bold mt-4 shadow-lg hover:shadow-blue-500/20 transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed">
                            Confirmer la demande
                        </button>
                    </form>
                </div>
            </div>

            {/* --- LISTE DES RÉSERVATIONS ACTUELLES --- */}
            <div className="lg:col-span-2">
                <div className="glass-panel rounded-2xl overflow-hidden min-h-[600px] flex flex-col border border-white/10">
                    <div className="p-6 border-b border-white/10 bg-gradient-to-r from-blue-900/10 to-transparent">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <span>📅</span> Planning des Salles
                        </h2>
                    </div>
                    
                    {reservations.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-500 gap-4 opacity-50">
                            <span className="text-5xl">📭</span>
                            <p className="text-sm">Aucune réservation pour le moment.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-white/5 overflow-y-auto custom-scrollbar max-h-[800px]">
                            {reservations.map(res => (
                                <div key={res.id_reservation} className="p-5 hover:bg-white/5 transition flex justify-between items-center group">
                                    <div className="flex items-center gap-5">
                                        <div className="flex flex-col items-center justify-center bg-white/5 border border-white/10 rounded-xl p-3 w-14 h-14">
                                            <div className="text-[9px] text-blue-300 uppercase font-bold tracking-wide">
                                                {new Date(res.date_debut).toLocaleDateString('fr-FR', {weekday: 'short'})}
                                            </div>
                                            <div className="text-xl font-bold text-white">
                                                {new Date(res.date_debut).getDate()}
                                            </div>
                                        </div>
                                        
                                        <div>
                                            <div className="flex items-center gap-3 mb-1">
                                                <span className="font-bold text-white text-base">{res.salle.nom_salle}</span>
                                                <span className="text-[9px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20 uppercase font-bold">
                                                    {res.projet?.nom_projet}
                                                </span>
                                            </div>
                                            <div className="text-xs text-gray-400 flex items-center gap-2 font-mono">
                                                <span className="text-blue-200">{new Date(res.date_debut).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                                                <span className="text-gray-600">➔</span>
                                                <span className="text-purple-200">{new Date(res.date_fin).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                                                <span className="text-gray-600 mx-2">|</span>
                                                <span className="italic text-gray-500 font-sans">{res.objet}</span>
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