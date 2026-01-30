"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { 
  AlertTriangle, ArrowLeft, Box, FileText, 
  Send, Loader2, Monitor, AlertOctagon, History, 
  CheckCircle2, Clock, Wrench, RefreshCcw, MessageSquare 
} from "lucide-react";

interface Ressource {
  id_ressource: string;
  nom_ressource: string;
  numero_serie: string;
}

export default function EmployeIncidents() {
  const [activeTab, setActiveTab] = useState<"NEW" | "HISTORY">("NEW");
  
  const [ressources, setRessources] = useState<Ressource[]>([]);
  const [myIncidents, setMyIncidents] = useState<any[]>([]);
  
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  const [form, setForm] = useState({ id_ressource: "", description: "" });

  useEffect(() => {
    const storedUser = localStorage.getItem("user_info");
    if (!storedUser) { router.push("/login"); return; }
    const u = JSON.parse(storedUser);
    setUser(u);

    // Chargement initial
    loadData(u.id_employe);
  }, [router]);

  const loadData = async (userId: string) => {
      setLoading(true);
      try {
        const [resRes, resInc] = await Promise.all([
            fetch("/api/ressources"),
            fetch(`/api/signalements?userId=${userId}`) // On filtre par utilisateur
        ]);
        
        if (resRes.ok) setRessources(await resRes.json());
        if (resInc.ok) setMyIncidents(await resInc.json());
      } catch (e) {
          toast.error("Erreur chargement données");
      } finally {
          setLoading(false);
      }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.id_ressource || !form.description) return toast.error("Formulaire incomplet.");

    setSubmitting(true);
    try {
      const res = await fetch("/api/signalements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_employe: user.id_employe, ...form }),
      });

      if (res.ok) {
        toast.success("Incident signalé avec succès !");
        setForm({ id_ressource: "", description: "" }); // Reset form
        setActiveTab("HISTORY"); // On bascule vers l'historique pour voir le ticket
        loadData(user.id_employe); // Refresh liste
      } else {
        toast.error("Erreur serveur");
      }
    } catch (err) { toast.error("Erreur connexion"); } 
    finally { setSubmitting(false); }
  };

  const getStatusBadge = (status: string) => {
      if (status === 'RESOLU') return <span className="flex items-center gap-1 text-[10px] font-bold text-green-400 bg-green-500/10 px-2 py-1 rounded border border-green-500/20"><CheckCircle2 className="w-3 h-3"/> RÉSOLU</span>;
      if (status === 'EN_COURS') return <span className="flex items-center gap-1 text-[10px] font-bold text-orange-400 bg-orange-500/10 px-2 py-1 rounded border border-orange-500/20"><Wrench className="w-3 h-3"/> PRISE EN CHARGE</span>;
      return <span className="flex items-center gap-1 text-[10px] font-bold text-red-400 bg-red-500/10 px-2 py-1 rounded border border-red-500/20"><Clock className="w-3 h-3"/> EN ATTENTE</span>;
  };

  if (!user) return null;

  return (
    <div className="min-h-screen flex flex-col items-center justify-start pt-12 p-4 bg-[#030712]">
      
      {/* HEADER GLOBAL */}
      <div className="w-full max-w-2xl mb-6 flex justify-between items-center animate-fade-in">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-500 hover:text-white transition text-xs font-bold uppercase tracking-wider group">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Retour Dashboard
        </button>
      </div>

      <div className="glass-panel w-full max-w-2xl p-1 rounded-2xl animate-fade-in border border-red-500/20 shadow-2xl relative overflow-hidden flex flex-col">
        
        {/* NAVIGATION ONGLETS */}
        <div className="flex bg-black/20 p-1 rounded-xl m-1">
            <button 
                onClick={() => setActiveTab("NEW")} 
                className={`flex-1 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${activeTab === "NEW" ? "bg-red-500 text-white shadow-lg shadow-red-500/20" : "text-gray-400 hover:text-white hover:bg-white/5"}`}
            >
                <AlertTriangle className="w-4 h-4"/> Signaler un problème
            </button>
            <button 
                onClick={() => setActiveTab("HISTORY")} 
                className={`flex-1 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${activeTab === "HISTORY" ? "bg-red-500 text-white shadow-lg shadow-red-500/20" : "text-gray-400 hover:text-white hover:bg-white/5"}`}
            >
                <History className="w-4 h-4"/> Mon Historique
            </button>
        </div>

        {/* CONTENU PRINCIPAL */}
        <div className="p-6 md:p-8">
            
            {/* --- ONGLET 1 : NOUVEAU SIGNALEMENT --- */}
            {activeTab === "NEW" && (
                <div className="animate-fade-in">
                    <div className="mb-6 text-center">
                        <h2 className="text-xl font-bold text-white">Nouveau Signalement</h2>
                        <p className="text-gray-400 text-sm">Décrivez le problème pour aider le support.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase mb-2 ml-1"><Monitor className="w-3 h-3" /> Matériel concerné</label>
                            <div className="relative">
                                <Box className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5 pointer-events-none" />
                                <select 
                                    className="glass-input w-full pl-10 bg-[#0f172a] appearance-none cursor-pointer text-white focus:border-red-500"
                                    value={form.id_ressource} onChange={e => setForm({...form, id_ressource: e.target.value})} required
                                >
                                    <option value="" className="text-gray-500">-- Choisir équipement --</option>
                                    {ressources.map(r => (<option key={r.id_ressource} value={r.id_ressource}>{r.nom_ressource} (S/N: {r.numero_serie || "?"})</option>))}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase mb-2 ml-1"><FileText className="w-3 h-3" /> Description détaillée</label>
                            <div className="relative">
                                <textarea 
                                    rows={4} placeholder="Ex: L'écran ne s'allume plus..." 
                                    className="glass-input w-full resize-none focus:border-red-500 p-4 text-sm"
                                    value={form.description} onChange={e => setForm({...form, description: e.target.value})} required
                                />
                                <AlertOctagon className="absolute bottom-3 right-3 w-4 h-4 text-red-500/30" />
                            </div>
                        </div>

                        <button type="submit" disabled={submitting} className="w-full btn-neon-red py-3 rounded-xl font-bold text-white shadow-lg flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed mt-4">
                            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Send className="w-4 h-4 group-hover:translate-x-1 transition-transform" /> Envoyer</>}
                        </button>
                    </form>
                </div>
            )}

            {/* --- ONGLET 2 : HISTORIQUE --- */}
            {activeTab === "HISTORY" && (
                <div className="animate-fade-in h-[400px] flex flex-col">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-bold text-white">Mes tickets</h2>
                        <button onClick={() => loadData(user.id_employe)} className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition"><RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}/></button>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-3">
                        {loading ? <div className="text-center py-10"><Loader2 className="w-8 h-8 text-red-500 animate-spin mx-auto"/></div> :
                        myIncidents.length === 0 ? (
                            <div className="text-center py-10 text-gray-500 flex flex-col items-center">
                                <CheckCircle2 className="w-12 h-12 mb-3 opacity-20"/>
                                <p>Aucun incident signalé.</p>
                            </div>
                        ) : (
                            myIncidents.map((incident) => (
                                <div key={incident.id_signalement} className="bg-white/5 p-4 rounded-xl border border-white/5 hover:border-red-500/30 transition group">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-red-500/10 rounded-lg text-red-500"><Monitor className="w-4 h-4"/></div>
                                            <div>
                                                <p className="text-white font-bold text-sm">{incident.ressource.nom_ressource}</p>
                                                <p className="text-[10px] text-gray-500 font-mono">{new Date(incident.createdAt).toLocaleDateString()} à {new Date(incident.createdAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p>
                                            </div>
                                        </div>
                                        {getStatusBadge(incident.statut)}
                                    </div>
                                    
                                    <div className="mt-3 p-3 bg-black/20 rounded-lg border border-white/5">
                                        <p className="text-xs text-gray-300 italic">"{incident.description}"</p>
                                    </div>

                                    {/* ✅ AFFICHAGE DU MESSAGE DE RÉPONSE */}
                                    {incident.message_reponse && (
                                        <div className="mt-3 bg-blue-500/10 border border-blue-500/20 p-3 rounded-lg flex items-start gap-3 animate-in fade-in slide-in-from-top-1">
                                            <div className="p-1.5 bg-blue-500/20 rounded-full mt-0.5">
                                                <MessageSquare className="w-3 h-3 text-blue-400"/>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold text-blue-300 uppercase mb-0.5">Réponse du Support</p>
                                                <p className="text-xs text-gray-300 leading-relaxed">"{incident.message_reponse}"</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

        </div>
      </div>
    </div>
  );
}