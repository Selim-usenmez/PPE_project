"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
// 👇 IMPORTS LUCIDE
import { 
  Box, ArrowLeft, Monitor, Car, Armchair, HelpCircle, 
  Search, Repeat, PlusCircle, MapPin, Loader2, PackageOpen, CheckCircle2 
} from "lucide-react";

interface Ressource {
  id_ressource: string;
  nom_ressource: string;
  numero_serie: string;
  type: string;
  etat: string;
  localisation: string;
  id_emprunteur?: string; // Pour savoir si c'est moi
}

export default function EmployeRessourcesPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [ressources, setRessources] = useState<Ressource[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  // Recherche
  const [search, setSearch] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem("user_info");
    if (!stored) router.push("/login");
    else setUser(JSON.parse(stored));
    loadRessources();
  }, [router]);

  const loadRessources = async () => {
    try {
        const res = await fetch("/api/ressources");
        if (res.ok) setRessources(await res.json());
    } catch(e) { console.error(e); }
    setLoading(false);
  };

  // EMPRUNTER
  const handleBorrow = async (id_ressource: string) => {
    if (!user) return;
    setActionLoading(id_ressource);
    
    try {
        const res = await fetch("/api/ressources/emprunt", {
            method: "POST", // On suppose que ton API gère ça via un endpoint dédié ou un update
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                id_ressource, 
                id_employe: user.id || user.id_employe,
                action: "EMPRUNTER" 
            })
        });

        if (res.ok) { 
            toast.success("Matériel ajouté à vos emprunts ! 🎒"); 
            loadRessources(); 
        } else { 
            toast.error("Impossible d'emprunter cet objet.");
        }
    } catch (e) { toast.error("Erreur réseau"); }
    finally { setActionLoading(null); }
  };

  // RENDRE
  const handleReturn = async (id_ressource: string) => {
    if(!confirm("Confirmer le retour de ce matériel ?")) return;
    setActionLoading(id_ressource);

    try {
        const res = await fetch("/api/ressources/emprunt", {
            method: "PUT", // Ou POST selon ton API
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                id_ressource, 
                action: "RENDRE" 
            })
        });

        if (res.ok) { 
            toast.success("Matériel rendu avec succès ! ✅"); 
            loadRessources(); 
        } else { 
            toast.error("Erreur lors du retour.");
        }
    } catch (e) { toast.error("Erreur réseau"); }
    finally { setActionLoading(null); }
  };

  // Helper Icône
  const getTypeIcon = (type: string) => {
      switch(type) {
          case 'MATERIEL_INFORMATIQUE': return <Monitor className="w-5 h-5" />;
          case 'VEHICULE': return <Car className="w-5 h-5" />;
          case 'EQUIPEMENT_REUNION': return <Armchair className="w-5 h-5" />;
          default: return <Box className="w-5 h-5" />;
      }
  };

  if (!user) return null;

  // Filtrage
  const mesEmprunts = ressources.filter(r => r.id_emprunteur === (user.id || user.id_employe));
  
  const disponibles = ressources.filter(r => 
    r.etat === 'DISPONIBLE' && 
    (r.nom_ressource.toLowerCase().includes(search.toLowerCase()) || 
     r.type.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="min-h-screen p-6 md:p-10 bg-[#030712] text-gray-200">
        <div className="max-w-7xl mx-auto animate-fade-in">
            
            {/* HEADER */}
            <div className="flex flex-col md:flex-row items-center justify-between mb-8 glass-panel p-6 rounded-2xl shadow-lg border border-white/5">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-gradient-to-br from-orange-500/20 to-yellow-500/20 rounded-xl border border-white/10 text-white">
                        <Box className="w-8 h-8" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white">Matériel & Stock</h1>
                        <p className="text-gray-400 text-sm">Gérez vos emprunts et consultez le stock disponible.</p>
                    </div>
                </div>
                <Link href="/employe/dashboard" className="mt-4 md:mt-0 px-5 py-2.5 rounded-xl border border-white/10 hover:bg-white/5 transition text-sm font-bold flex items-center gap-2 group text-gray-300 hover:text-white">
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> 
                    Retour Dashboard
                </Link>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* 1. MES EMPRUNTS (Gauche) */}
                <div className="glass-panel p-6 rounded-2xl border-l-4 border-orange-500 h-fit">
                    <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-4">
                        <h2 className="text-xl font-bold text-orange-400 flex items-center gap-2">
                            <PackageOpen className="w-5 h-5" /> Mes Emprunts
                        </h2>
                        <span className="text-xs font-bold bg-orange-500/10 text-orange-300 px-2 py-1 rounded border border-orange-500/20">
                            {mesEmprunts.length} actifs
                        </span>
                    </div>

                    {loading ? (
                        <div className="text-center py-10"><Loader2 className="w-8 h-8 animate-spin mx-auto text-orange-500"/></div>
                    ) : mesEmprunts.length === 0 ? (
                        <div className="text-gray-500 italic text-center py-12 flex flex-col items-center gap-2 opacity-60">
                            <Box className="w-10 h-10" />
                            <p>Vous n'avez aucun matériel en votre possession.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {mesEmprunts.map(r => (
                                <div key={r.id_ressource} className="flex justify-between items-center bg-orange-500/5 hover:bg-orange-500/10 p-4 rounded-xl border border-orange-500/20 transition group">
                                    <div className="flex items-center gap-4">
                                        <div className="p-2 bg-orange-900/30 rounded-lg text-orange-300">
                                            {getTypeIcon(r.type)}
                                        </div>
                                        <div>
                                            <div className="font-bold text-orange-100">{r.nom_ressource}</div>
                                            <div className="text-xs text-orange-400/60 font-mono tracking-wider">{r.numero_serie || "Sans S/N"}</div>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => handleReturn(r.id_ressource)}
                                        disabled={actionLoading === r.id_ressource}
                                        className="px-4 py-2 rounded-lg border border-orange-500/30 text-orange-300 text-xs hover:bg-orange-500 hover:text-white transition font-bold flex items-center gap-2 disabled:opacity-50"
                                    >
                                        {actionLoading === r.id_ressource ? <Loader2 className="w-3 h-3 animate-spin"/> : <Repeat className="w-3 h-3" />}
                                        Rendre
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* 2. DISPONIBLES (Droite) */}
                <div className="glass-panel p-6 rounded-2xl border-l-4 border-green-500 h-full flex flex-col">
                    <div className="mb-6">
                        <h2 className="text-xl font-bold text-green-400 flex items-center gap-2 mb-4">
                            <CheckCircle2 className="w-5 h-5" /> Stock Disponible
                        </h2>
                        
                        {/* Barre de recherche */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                            <input 
                                type="text" 
                                placeholder="Rechercher un équipement..." 
                                className="w-full bg-[#0f172a] border border-white/10 rounded-xl py-2.5 pl-9 pr-4 text-sm focus:border-green-500 outline-none text-gray-300 placeholder:text-gray-600 transition-all"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                    </div>

                    {loading ? (
                        <div className="text-center py-10"><Loader2 className="w-8 h-8 animate-spin mx-auto text-green-500"/></div>
                    ) : disponibles.length === 0 ? (
                        <div className="text-gray-500 italic text-center py-12 flex flex-col items-center gap-2 opacity-60">
                            <HelpCircle className="w-10 h-10" />
                            <p>Aucun matériel disponible correspondant.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-3 overflow-y-auto pr-2 custom-scrollbar max-h-[600px]">
                            {disponibles.map(r => (
                                <div key={r.id_ressource} className="flex justify-between items-center bg-white/5 p-4 rounded-xl border border-white/5 hover:bg-white/10 transition group">
                                    <div className="flex items-center gap-4">
                                        <div className="p-2 bg-slate-800 rounded-lg text-gray-400 group-hover:text-white transition-colors">
                                            {getTypeIcon(r.type)}
                                        </div>
                                        <div>
                                            <div className="font-bold text-gray-200 group-hover:text-white transition-colors">{r.nom_ressource}</div>
                                            <div className="text-xs text-gray-500 flex items-center gap-3 mt-1">
                                                <span className="bg-white/10 px-2 py-0.5 rounded text-[10px] uppercase tracking-wide">{r.type.replace('_', ' ')}</span>
                                                {r.localisation && <span className="flex items-center gap-1"><MapPin className="w-3 h-3"/> {r.localisation}</span>}
                                            </div>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => handleBorrow(r.id_ressource)}
                                        disabled={actionLoading === r.id_ressource}
                                        className="bg-green-500/10 text-green-400 border border-green-500/30 px-3 py-2 rounded-lg text-xs hover:bg-green-500 hover:text-white font-bold transition flex items-center gap-2 disabled:opacity-50"
                                    >
                                        {actionLoading === r.id_ressource ? <Loader2 className="w-3 h-3 animate-spin"/> : <PlusCircle className="w-3 h-3" />}
                                        Emprunter
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

            </div>
        </div>
    </div>
  );
}