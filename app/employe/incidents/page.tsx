"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Ressource {
  id_ressource: string;
  nom_ressource: string;
  numero_serie: string;
}

export default function EmployeIncidents() {
  const [ressources, setRessources] = useState<Ressource[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const [form, setForm] = useState({
    id_ressource: "",
    description: ""
  });

  useEffect(() => {
    const storedUser = localStorage.getItem("user_info");
    if (!storedUser) { router.push("/"); return; }
    setUser(JSON.parse(storedUser));

    fetch("/api/ressources")
      .then(res => res.json())
      .then(data => {
        setRessources(Array.isArray(data) ? data : []);
        setLoading(false);
      });
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.id_ressource || !form.description) return alert("Tout remplir svp");

    try {
      const res = await fetch("/api/signalements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            id_employe: user.id || user.id_employe,
            ...form
        }),
      });

      if (res.ok) {
        alert("🚨 Incident signalé aux administrateurs.");
        router.push("/employe/dashboard");
      } else {
        alert("Erreur lors de l'envoi");
      }
    } catch (err) {
      alert("Erreur réseau");
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="glass-panel w-full max-w-2xl p-8 rounded-2xl animate-fade-in shadow-[0_0_50px_rgba(239,68,68,0.15)]">
        
        <div className="flex justify-between items-center mb-8 border-b border-white/10 pb-4">
            <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-400 flex items-center gap-2">
                ⚠️ Signaler un incident
            </h1>
            <button onClick={() => router.push("/employe/dashboard")} className="text-gray-400 hover:text-white transition">
                Fermer ✕
            </button>
        </div>

        <p className="text-gray-300 mb-8 text-sm">
            Vous avez constaté une panne ? Décrivez le problème ci-dessous pour le service technique.
        </p>

        {loading ? <p className="text-red-400 animate-pulse">Chargement du matériel...</p> : (
            <form onSubmit={handleSubmit} className="space-y-6">
                
                {/* SÉLECTEUR */}
                <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Quel matériel ?</label>
                    <select 
                        className="glass-input w-full text-white"
                        value={form.id_ressource}
                        onChange={e => setForm({...form, id_ressource: e.target.value})}
                        required
                    >
                        <option value="" className="bg-slate-900">-- Sélectionner --</option>
                        {ressources.map(r => (
                            <option key={r.id_ressource} value={r.id_ressource} className="bg-slate-900">
                                {r.nom_ressource} {r.numero_serie ? `(S/N: ${r.numero_serie})` : ''}
                            </option>
                        ))}
                    </select>
                </div>

                {/* DESCRIPTION */}
                <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Détails du problème</label>
                    <textarea 
                        rows={4}
                        placeholder="Ex: L'ordinateur ne démarre plus..."
                        className="glass-input w-full resize-none"
                        value={form.description}
                        onChange={e => setForm({...form, description: e.target.value})}
                        required
                    />
                </div>

                {/* BOUTON */}
                <button 
                    type="submit"
                    className="w-full btn-neon-red py-3 rounded-xl font-bold text-white shadow-lg mt-4"
                >
                    Envoyer le signalement
                </button>

            </form>
        )}
      </div>
    </div>
  );
}