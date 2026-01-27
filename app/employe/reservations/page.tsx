"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { CalendarRange, ArrowLeft, MapPin, Briefcase, FileText, Clock, Save, Loader2, Lightbulb, Box, Search, Sparkles, CheckCircle2, CalendarCheck, Lock } from "lucide-react";

// Fonction de formatage pour l'input datetime-local (Gère le fuseau horaire local)
const formatForInput = (d: string | Date) => {
    try {
        const date = new Date(d);
        const offset = date.getTimezoneOffset() * 60000;
        return (new Date(date.getTime() - offset)).toISOString().slice(0, 16);
    } catch (e) { return ""; }
};

export default function EmployeReservationsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [salles, setSalles] = useState<any[]>([]);
  const [ressources, setRessources] = useState<any[]>([]); 
  const [mesProjets, setMesProjets] = useState<any[]>([]);
  
  const [checking, setChecking] = useState(false);
  const [advice, setAdvice] = useState<any>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [occupied, setOccupied] = useState<{ rooms: string[], resources: string[] }>({ rooms: [], resources: [] });

  const [aiUsageCount, setAiUsageCount] = useState(0);
  const [quotaResetTime, setQuotaResetTime] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState("");

  const [form, setForm] = useState({ id_salle: "", id_ressource: "", id_projet: "", date_debut: "", date_fin: "", objet: "" });

  useEffect(() => {
    const initData = async () => {
      const stored = localStorage.getItem("user_info");
      if (!stored) { router.push("/login"); return; }
      const currentUser = JSON.parse(stored);
      setUser(currentUser);

      const savedQuota = localStorage.getItem(`ai_quota_${currentUser.id_employe}`);
      if(savedQuota) {
          const { count, resetAt } = JSON.parse(savedQuota);
          if (Date.now() < resetAt) { setAiUsageCount(count); setQuotaResetTime(resetAt); } 
          else { localStorage.removeItem(`ai_quota_${currentUser.id_employe}`); }
      }

      try {
        const [resSalles, resRessources, resProjets] = await Promise.all([
            fetch("/api/salles").then(r => r.json()),
            fetch("/api/ressources?etat=DISPONIBLE").then(r => r.json()), 
            fetch(`/api/employes/${currentUser.id_employe}/projets`).then(r => r.json()),
        ]);
        setSalles(resSalles); setRessources(resRessources); setMesProjets(Array.isArray(resProjets) ? resProjets : []);
        
        // Initialiser dates (Maintenant -> +1h)
        const now = new Date(); now.setMinutes(0,0,0); const end = new Date(now); end.setHours(end.getHours() + 1);
        setForm(f => ({ ...f, date_debut: formatForInput(now), date_fin: formatForInput(end) }));
        
        if (Array.isArray(resProjets) && resProjets.length > 0) setForm(f => ({ ...f, id_projet: resProjets[0].id_projet }));
      } catch (e) { toast.error("Erreur chargement"); } 
      finally { setLoading(false); }
    };
    initData();
  }, [router]);

  useEffect(() => {
    if (!quotaResetTime) return;
    const interval = setInterval(() => {
        const diff = quotaResetTime - Date.now();
        if (diff <= 0) { setAiUsageCount(0); setQuotaResetTime(null); setTimeLeft(""); localStorage.removeItem(`ai_quota_${user.id_employe}`); } 
        else { setTimeLeft(`${Math.floor(diff / 60000)}m ${Math.floor((diff % 60000) / 1000)}s`); }
    }, 1000);
    return () => clearInterval(interval);
  }, [quotaResetTime, user]);

  // Vérification Dispo en Temps Réel
  useEffect(() => {
    const checkAvailability = async () => {
        if (!form.date_debut || !form.date_fin) return;
        setChecking(true);
        try {
            const res = await fetch(`/api/reservations/check?start=${form.date_debut}&end=${form.date_fin}`);
            if (res.ok) { const data = await res.json(); setOccupied({ rooms: data.occupiedRooms || [], resources: data.occupiedResources || [] }); }
        } catch (error) { console.error(error); } finally { setChecking(false); }
    };
    const timer = setTimeout(checkAvailability, 500);
    return () => clearTimeout(timer);
  }, [form.date_debut, form.date_fin]);

  // Appel IA
  const handleAnalyzeAI = async () => {
    if (!form.objet || form.objet.length < 5) return toast.warning("Décrivez d'abord votre besoin.");
    setAnalyzing(true);
    try {
        const res = await fetch("/api/reservations/recommend", { // Note : Vérifie que l'URL est bien /api/reservations/recommend OU /api/recommend selon ton fichier route.ts
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ start: form.date_debut, end: form.date_fin, objet: form.objet, userId: user.id_employe })
        });
        if (res.ok) {
            const data = await res.json(); setAdvice(data);
            if (user.role !== "ADMIN") setAiUsageCount(prev => prev + 1);
        } else {
            if (res.status === 429) { const err = await res.json(); toast.error("⏳ " + err.error); } 
            else { toast.error("Erreur assistant IA"); }
        }
    } catch (e) { toast.error("Erreur connexion"); } finally { setAnalyzing(false); }
  };

  // Appliquer Suggestion IA
  const applySuggestion = () => {
    if (!advice) return;
    setForm(prev => ({
        ...prev,
        objet: advice.suggestedTitle || prev.objet,
        date_debut: advice.newDates ? formatForInput(advice.newDates.start) : prev.date_debut,
        date_fin: advice.newDates ? formatForInput(advice.newDates.end) : prev.date_fin,
        id_salle: advice.room ? advice.room.id_salle : prev.id_salle,
        id_ressource: advice.suggestedEquipment ? advice.suggestedEquipment.id_ressource : prev.id_ressource,
        id_projet: advice.suggestedProject ? advice.suggestedProject.id_projet : prev.id_projet 
    }));
    toast.success("Configuration appliquée !", { icon: "✨" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (new Date(form.date_debut) >= new Date(form.date_fin)) return toast.error("Dates invalides");
    try {
        const res = await fetch("/api/reservations", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...form, id_employe: user.id_employe, id_salle: form.id_salle || undefined, id_ressource: form.id_ressource || undefined })
        });
        if (res.ok) { 
            toast.success("Réservation validée !"); 
            router.push("/employe/dashboard"); 
        } 
        else { 
            const err = await res.json(); 
            // Affichage spécifique si c'est un conflit de congé
            toast.error(err.error || "Erreur lors de la réservation"); 
        }
    } catch (e) { toast.error("Erreur serveur"); }
  };

  if (loading || !user) return <div className="min-h-screen bg-[#030712] flex items-center justify-center"><Loader2 className="animate-spin text-white w-10 h-10"/></div>;
  const isAdmin = user.role === "ADMIN"; const isQuotaFull = !isAdmin && aiUsageCount >= 2;

  return (
    <div className="min-h-screen p-6 md:p-10 text-gray-200 bg-[#030712]">
      <div className="max-w-7xl mx-auto animate-fade-in-up">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row items-center justify-between mb-8 glass-panel p-6 rounded-2xl shadow-lg border border-white/10">
            <div className="flex items-center gap-4"><div className="p-3 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl border border-white/10 text-white"><CalendarRange className="w-8 h-8" /></div><div><h1 className="text-2xl font-bold text-white">Nouvelle Réservation</h1><p className="text-gray-400 text-sm">Assistant IA activé (Quota: {isAdmin ? "Illimité" : "2/10min"})</p></div></div>
            <Link href="/employe/dashboard" className="px-5 py-2.5 rounded-xl border border-white/10 hover:bg-white/5 transition text-sm font-bold flex items-center gap-2 text-white"><ArrowLeft className="w-4 h-4" /> Retour</Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* FORMULAIRE GAUCHE */}
            <div className="lg:col-span-2">
                <div className="glass-panel p-8 rounded-2xl border border-white/10 shadow-2xl bg-[#0f172a]/50">
                    <h2 className="text-lg font-bold mb-6 text-white border-b border-white/10 pb-4 flex items-center gap-2"><Search className="w-5 h-5 text-blue-400" /> Vos Critères</h2>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="relative group">
                            <label className="text-xs font-bold text-blue-300 uppercase tracking-widest mb-1.5 block ml-1">Exprimez votre besoin *</label>
                            <textarea className="glass-input w-full pl-4 pt-3 h-24 placeholder-gray-600 bg-white/5 border-blue-500/30 focus:border-blue-500 transition-all resize-none mb-2" placeholder="Ex: Réunion d'équipe lundi 14h, besoin d'un écran." autoFocus required value={form.objet} onChange={e => setForm({...form, objet: e.target.value})} />
                            <div className="flex justify-between items-center"><div className="text-[10px] text-gray-500 italic">{!isAdmin && isQuotaFull ? <span className="text-red-400 flex items-center gap-1"><Lock className="w-3 h-3"/> Quota atteint. Retour dans {timeLeft}</span> : <span>({isAdmin ? "∞" : `${2 - aiUsageCount} essais`})</span>}</div>
                                <button type="button" onClick={handleAnalyzeAI} disabled={analyzing || isQuotaFull || !form.objet} className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all shadow-lg ${isQuotaFull ? "bg-gray-800 text-gray-500 cursor-not-allowed" : "bg-gradient-to-r from-blue-600 to-purple-600 text-white"}`}>{analyzing ? <Loader2 className="w-3 h-3 animate-spin"/> : <Sparkles className="w-3 h-3"/>} {analyzing ? "Analyse..." : "Générer avec IA"}</button>
                            </div>
                        </div>
                        
                        {/* INPUTS DATES CORRIGÉS */}
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className="text-[10px] font-bold text-gray-500 uppercase block">Début</label><input type="datetime-local" className="glass-input w-full text-xs [color-scheme:dark]" required value={form.date_debut} onChange={e => setForm({...form, date_debut: e.target.value})} /></div>
                            <div><label className="text-[10px] font-bold text-gray-500 uppercase block">Fin</label><input type="datetime-local" className="glass-input w-full text-xs [color-scheme:dark]" required value={form.date_fin} onChange={e => setForm({...form, date_fin: e.target.value})} /></div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div><label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Projet</label><select className="glass-input w-full bg-[#0f172a]" value={form.id_projet} onChange={e => setForm({...form, id_projet: e.target.value})} required><option value="">-- Sélectionner --</option>{mesProjets.map(p => <option key={p.id_projet} value={p.id_projet}>{p.nom_projet}</option>)}</select></div>
                            <div><label className="text-xs font-bold text-gray-500 uppercase mb-1 block flex justify-between">Salle {checking && <span className="text-blue-400 text-[9px] animate-pulse">Vérif...</span>}</label><select className="glass-input w-full bg-[#0f172a]" value={form.id_salle} onChange={e => setForm({...form, id_salle: e.target.value})}><option value="">-- Aucune --</option>{salles.map(s => { const isTaken = occupied.rooms.includes(s.id_salle); return <option key={s.id_salle} value={s.id_salle} disabled={isTaken} className={isTaken ? "bg-red-900/20 text-gray-500" : "text-white"}>{s.nom_salle} {isTaken ? "🔴" : `(${s.capacite}p)`}</option> })}</select></div>
                        </div>
                        <div><label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Matériel</label><select className="glass-input w-full bg-[#0f172a]" value={form.id_ressource} onChange={e => setForm({...form, id_ressource: e.target.value})}><option value="">-- Aucun --</option>{ressources.map(r => { const isTaken = occupied.resources.includes(r.id_ressource); return <option key={r.id_ressource} value={r.id_ressource} disabled={isTaken} className={isTaken ? "bg-red-900/20 text-gray-500" : "text-white"}>{r.nom_ressource}</option> })}</select></div>
                        <button type="submit" disabled={mesProjets.length === 0 || checking} className="w-full btn-neon-blue py-4 rounded-xl font-bold mt-4 shadow-lg flex items-center justify-center gap-2 text-white text-lg hover:scale-[1.01] transition-transform disabled:opacity-50">{checking ? <Loader2 className="animate-spin w-5 h-5"/> : <Save className="w-5 h-5"/>} Confirmer la réservation</button>
                    </form>
                </div>
            </div>

            {/* PANEL IA DROITE */}
            <div className="lg:col-span-1">
                <div className="glass-panel p-6 rounded-2xl border border-blue-500/30 bg-gradient-to-b from-blue-900/20 to-[#0f172a] shadow-xl sticky top-8 h-fit">
                    <div className="flex items-center gap-3 mb-6 border-b border-blue-500/30 pb-4"><div className="bg-blue-500/20 p-2 rounded-lg text-blue-400"><Sparkles className="w-6 h-6" /></div><div><h3 className="font-bold text-white text-lg">Proposition IA</h3><p className="text-xs text-blue-300">Analyse intelligente</p></div></div>
                    {analyzing ? (<div className="py-10 text-center text-gray-400 flex flex-col items-center gap-3"><Loader2 className="animate-spin w-8 h-8 text-blue-500" /><span className="text-xs animate-pulse">L'assistant travaille...</span></div>) : advice ? (
                        <div className="space-y-5 animate-fade-in">
                            <button onClick={applySuggestion} className="w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 rounded-xl font-bold text-white shadow-lg flex items-center justify-center gap-2 transition-all hover:scale-[1.02] border border-white/20"><Sparkles className="w-4 h-4" /> Appliquer cette config</button>
                            {advice.suggestedTitle && (<div className="bg-purple-500/10 border border-purple-500/30 p-3 rounded-xl"><div className="text-[10px] uppercase font-bold text-purple-300 mb-1">Titre suggéré</div><div className="font-bold text-white text-lg">"{advice.suggestedTitle}"</div></div>)}
                            <div className="text-sm text-gray-300 italic">"{advice.analysis}"</div>
                            <div className="bg-white/5 rounded-xl p-4 border border-white/10 space-y-3">
                                {advice.newDates ? (<div className="flex items-center gap-3 text-blue-300"><CalendarCheck className="w-5 h-5 shrink-0" /><div><div className="text-[10px] uppercase font-bold text-gray-500">Créneau</div><div className="text-sm font-bold">{new Date(advice.newDates.start).toLocaleDateString()}</div><div className="text-xs">{new Date(advice.newDates.start).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} - {new Date(advice.newDates.end).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div></div></div>) : <div className="text-xs text-gray-500">Dates inchangées</div>}
                                <div className="h-px bg-white/10"></div>
                                {advice.room ? (<div className="flex items-center gap-3 text-green-300"><CheckCircle2 className="w-5 h-5 shrink-0" /><div><div className="text-[10px] uppercase font-bold text-gray-500">Salle</div><div className="text-sm font-bold">{advice.room.nom_salle}</div><div className="text-[10px] text-gray-400 flex items-center gap-2">Max: {advice.room.capacite}p {advice.pax && <span className="bg-white/10 px-1.5 rounded text-white">Besoin: {advice.pax}</span>}</div></div></div>) : <div className="text-xs text-red-400 flex gap-2"><Lock className="w-3 h-3"/> Pas de salle dispo</div>}
                                {advice.suggestedEquipment && (<div className="flex items-center gap-3 text-yellow-300 mt-2"><Lightbulb className="w-5 h-5 shrink-0" /><div><div className="text-[10px] uppercase font-bold text-gray-500">Ajout Matériel</div><div className="text-sm font-bold">{advice.suggestedEquipment.nom_ressource}</div></div></div>)}
                            </div>
                        </div>
                    ) : (<div className="text-center py-12 text-gray-500 text-sm border-2 border-dashed border-white/5 rounded-xl"><p>Cliquez sur <strong>"Générer avec IA"</strong></p></div>)}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}