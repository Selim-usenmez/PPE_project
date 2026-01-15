"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
// 👇 IMPORTS LUCIDE
import { 
  AlertTriangle, ArrowLeft, Box, FileText, 
  Send, Loader2, Monitor, AlertOctagon 
} from "lucide-react";

interface Ressource {
  id_ressource: string;
  nom_ressource: string;
  numero_serie: string;
  type?: string;
}

export default function EmployeIncidents() {
  const [ressources, setRessources] = useState<Ressource[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  const [form, setForm] = useState({
    id_ressource: "",
    description: ""
  });

  useEffect(() => {
    const storedUser = localStorage.getItem("user_info");
    if (!storedUser) { router.push("/login"); return; }
    setUser(JSON.parse(storedUser));

    fetch("/api/ressources")
      .then(res => res.json())
      .then(data => {
        setRessources(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => toast.error("Impossible de charger la liste du matériel"));
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.id_ressource || !form.description) return toast.error("Veuillez remplir tous les champs.");

    setSubmitting(true);
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
        toast.success("Signalement envoyé !", {
            description: "L'équipe technique a été notifiée.",
            icon: "🚨"
        });
        router.push("/employe/dashboard");
      } else {
        const err = await res.json();
        toast.error(err.error || "Erreur lors de l'envoi");
      }
    } catch (err) {
      toast.error("Erreur de connexion serveur");
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#030712]">
      <div className="glass-panel w-full max-w-lg p-8 rounded-2xl animate-fade-in shadow-[0_0_40px_rgba(239,68,68,0.1)] border border-red-500/20 relative overflow-hidden">
        
        {/* DÉCORATION D'ARRIÈRE PLAN */}
        <div className="absolute top-0 right-0 p-12 bg-red-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

        {/* HEADER */}
        <div className="mb-8">
            <button 
                onClick={() => router.back()} 
                className="flex items-center gap-2 text-gray-500 hover:text-white transition text-xs font-bold uppercase tracking-wider mb-6 group"
            >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> 
                Retour
            </button>

            <div className="flex items-center gap-4">
                <div className="p-3 bg-red-500/10 rounded-xl text-red-500 border border-red-500/20 shadow-lg shadow-red-500/10">
                    <AlertTriangle className="w-8 h-8" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-white">Signaler un Incident</h1>
                    <p className="text-gray-400 text-sm mt-0.5">Une panne ? Un dysfonctionnement ?</p>
                </div>
            </div>
        </div>

        {loading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <Loader2 className="w-10 h-10 text-red-500 animate-spin" />
                <p className="text-red-400/70 font-mono text-sm">Chargement du matériel...</p>
            </div>
        ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
                
                {/* SÉLECTEUR MATÉRIEL */}
                <div>
                    <label className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase mb-2 ml-1">
                        <Monitor className="w-3 h-3" /> Matériel concerné
                    </label>
                    <div className="relative">
                        <Box className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5 pointer-events-none" />
                        <select 
                            className="glass-input w-full pl-10 appearance-none bg-[#0f172a] cursor-pointer text-white focus:border-red-500 transition-colors"
                            value={form.id_ressource}
                            onChange={e => setForm({...form, id_ressource: e.target.value})}
                            required
                        >
                            <option value="" className="text-gray-500">-- Sélectionner un équipement --</option>
                            {ressources.map(r => (
                                <option key={r.id_ressource} value={r.id_ressource}>
                                    {r.nom_ressource} {r.numero_serie ? `(S/N: ${r.numero_serie})` : ''}
                                </option>
                            ))}
                        </select>
                        {/* Petite flèche custom CSS ou SVG si besoin, mais appearance-none + bg-transparent marche bien */}
                    </div>
                </div>

                {/* DESCRIPTION */}
                <div>
                    <label className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase mb-2 ml-1">
                        <FileText className="w-3 h-3" /> Description du problème
                    </label>
                    <div className="relative">
                        <textarea 
                            rows={5}
                            placeholder="Ex: L'écran scintille, le câble semble endommagé..."
                            className="glass-input w-full resize-none focus:border-red-500 transition-colors p-4"
                            value={form.description}
                            onChange={e => setForm({...form, description: e.target.value})}
                            required
                        />
                        <div className="absolute bottom-3 right-3">
                            <AlertOctagon className="w-4 h-4 text-red-500/30" />
                        </div>
                    </div>
                </div>

                {/* BOUTON D'ENVOI */}
                <button 
                    type="submit"
                    disabled={submitting}
                    className="w-full btn-neon-red py-3.5 rounded-xl font-bold text-white shadow-lg flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                    {submitting ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                        <>
                            <Send className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            Envoyer le signalement
                        </>
                    )}
                </button>

            </form>
        )}
      </div>
    </div>
  );
}