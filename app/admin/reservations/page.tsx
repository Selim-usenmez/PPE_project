"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";

export default function ReservationsPage() {
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
    date_debut: "", // Format datetime-local : YYYY-MM-DDTHH:MM
    date_fin: "",
    objet: ""
  });

  useEffect(() => {
    const stored = localStorage.getItem("user_info");
    if (!stored) { router.push("/login"); return; }
    setUser(JSON.parse(stored));

    Promise.all([
      fetch("/api/salles").then(r => r.json()),
      fetch("/api/projets").then(r => r.json()),
      fetch("/api/reservations").then(r => r.json())
    ]).then(([sallesData, projetsData, resasData]) => {
      setSalles(sallesData);
      setProjets(projetsData);
      setReservations(resasData);
      
      // Pré-remplir la 1ère salle/projet
      if (sallesData.length > 0) setForm(f => ({ ...f, id_salle: sallesData[0].id_salle }));
      if (projetsData.length > 0) setForm(f => ({ ...f, id_projet: projetsData[0].id_projet }));
      
      setLoading(false);
    });
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
        const res = await fetch("/api/reservations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(form)
        });
        const data = await res.json();

        if (res.ok) {
            toast.success("Réservation confirmée ! 📅");
            // Rafraîchir la liste
            const newResas = await fetch("/api/reservations").then(r => r.json());
            setReservations(newResas);
        } else {
            toast.error(data.error || "Erreur lors de la réservation");
        }
    } catch (e) { toast.error("Erreur serveur"); }
  };

  const handleCancel = async (id: string) => {
    if(!confirm("Annuler cette réservation ?")) return;
    await fetch(`/api/reservations?id=${id}`, { method: "DELETE" });
    toast.success("Réservation annulée");
    setReservations(reservations.filter(r => r.id_reservation !== id));
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-blue-400 animate-pulse">Chargement du planning...</div>;

  return (
    <div className="min-h-screen p-8 text-gray-200">
      <div className="max-w-6xl mx-auto animate-fade-in-up">
        
        {/* Header Page */}
        <div className="flex items-center justify-between mb-8 glass-panel p-6 rounded-2xl">
            <div>
                <h1 className="text-3xl font-bold text-white">📅 Réservation de Salles</h1>
                <p className="text-gray-400 mt-1">Planifiez vos réunions en toute simplicité.</p>
            </div>
            <Link href="/employe/dashboard" className="px-4 py-2 rounded-lg border border-white/10 hover:bg-white/5 transition text-sm font-bold">
                ← Retour Dashboard
            </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* --- FORMULAIRE (Gauche) --- */}
            <div className="lg:col-span-1">
                <div className="glass-panel p-6 rounded-2xl sticky top-8">
                    <h2 className="text-xl font-bold mb-6 text-blue-400 border-b border-white/10 pb-4">Nouvelle Demande</h2>
                    
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Salle</label>
                            <select className="glass-input w-full" 
                                value={form.id_salle} onChange={e => setForm({...form, id_salle: e.target.value})}>
                                {salles.map(s => <option key={s.id_salle} className="bg-slate-900" value={s.id_salle}>{s.nom_salle} ({s.capacite} pers.)</option>)}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Projet associé</label>
                            {projets.length > 0 ? (
                                <select className="glass-input w-full" 
                                    value={form.id_projet} onChange={e => setForm({...form, id_projet: e.target.value})}>
                                    {projets.map(p => <option key={p.id_projet} className="bg-slate-900" value={p.id_projet}>{p.nom_projet}</option>)}
                                </select>
                            ) : (
                                <p className="text-sm text-red-400 italic">Aucun projet actif disponible.</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Motif</label>
                            <input type="text" className="glass-input w-full" placeholder="Ex: Daily Meeting" required
                                value={form.objet} onChange={e => setForm({...form, objet: e.target.value})} />
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Début</label>
                                <input type="datetime-local" className="glass-input w-full" required
                                    value={form.date_debut} onChange={e => setForm({...form, date_debut: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Fin</label>
                                <input type="datetime-local" className="glass-input w-full" required
                                    value={form.date_fin} onChange={e => setForm({...form, date_fin: e.target.value})} />
                            </div>
                        </div>

                        <button type="submit" disabled={projets.length === 0}
                            className="w-full btn-neon-blue py-3 rounded-xl font-bold mt-4 disabled:opacity-50">
                            Confirmer la réservation
                        </button>
                    </form>
                </div>
            </div>

            {/* --- LISTE DES RÉSERVATIONS (Droite) --- */}
            <div className="lg:col-span-2">
                <div className="glass-panel rounded-2xl overflow-hidden min-h-[500px]">
                    <div className="p-6 border-b border-white/10 bg-black/20">
                        <h2 className="text-xl font-bold text-white">Planning Global</h2>
                    </div>
                    
                    {reservations.length === 0 ? (
                        <div className="p-10 text-center text-gray-500 flex flex-col items-center">
                            <span className="text-4xl mb-4">📭</span>
                            <p>Aucune réservation à venir.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-white/5">
                            {reservations.map(res => (
                                <div key={res.id_reservation} className="p-5 hover:bg-white/5 transition flex justify-between items-center group">
                                    <div className="flex items-center gap-4">
                                        {/* Date Box */}
                                        <div className="bg-blue-500/10 border border-blue-500/30 text-blue-400 rounded-lg p-3 text-center min-w-[70px]">
                                            <div className="text-xs uppercase font-bold">{new Date(res.date_debut).toLocaleDateString('fr-FR', {weekday: 'short'})}</div>
                                            <div className="text-xl font-bold">{new Date(res.date_debut).getDate()}</div>
                                        </div>
                                        
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-bold text-white text-lg">{res.salle.nom_salle}</span>
                                                <span className="text-xs px-2 py-0.5 rounded bg-white/10 text-gray-300 border border-white/10">
                                                    {res.projet?.nom_projet}
                                                </span>
                                            </div>
                                            <div className="text-sm text-gray-400 flex items-center gap-2">
                                                <span>🕒 {new Date(res.date_debut).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                                                <span>➔</span>
                                                <span>{new Date(res.date_fin).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                                                <span className="text-gray-600 mx-2">|</span>
                                                <span className="italic text-gray-500">{res.objet}</span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <button onClick={() => handleCancel(res.id_reservation)} 
                                        className="btn-neon-red p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity" title="Annuler">
                                        🗑️
                                    </button>
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