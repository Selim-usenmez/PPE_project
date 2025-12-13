"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";

export default function EmployeRessourcesPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [ressources, setRessources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("user_info");
    if (!stored) router.push("/login");
    else setUser(JSON.parse(stored));
    loadRessources();
  }, [router]);

  const loadRessources = async () => {
    const res = await fetch("/api/ressources");
    if (res.ok) setRessources(await res.json());
    setLoading(false);
  };

  const handleBorrow = async (id_ressource: string) => {
    try {
        const res = await fetch("/api/ressources/emprunt", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id_ressource, id_employe: user.id || user.id_employe })
        });
        if (res.ok) { toast.success("Matériel emprunté !"); loadRessources(); } 
        else toast.error("Erreur emprunt.");
    } catch (e) { toast.error("Erreur réseau"); }
  };

  const handleReturn = async (id_ressource: string) => {
    if(!confirm("Rendre ce matériel ?")) return;
    try {
        const res = await fetch("/api/ressources/emprunt", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id_ressource })
        });
        if (res.ok) { toast.success("Matériel rendu !"); loadRessources(); } 
        else toast.error("Erreur serveur");
    } catch (e) { toast.error("Erreur réseau"); }
  };

  if (!user || loading) return <div className="text-center p-10 text-blue-400 animate-pulse">Chargement de l'inventaire...</div>;

  const mesEmprunts = ressources.filter(r => r.id_emprunteur === (user.id || user.id_employe));
  const disponibles = ressources.filter(r => r.etat === 'DISPONIBLE');

  return (
    <div className="min-h-screen p-8 max-w-7xl mx-auto">
        
        <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold text-white">📦 Matériel & Stock</h1>
            <Link href="/employe/dashboard" className="px-4 py-2 rounded-lg border border-white/10 hover:bg-white/5 transition text-sm font-bold">
                ← Retour
            </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-slide-up">
            
            {/* 1. MES EMPRUNTS */}
            <div className="glass-panel p-6 rounded-2xl border-l-4 border-orange-500">
                <h2 className="text-xl font-bold mb-6 text-orange-400 flex items-center gap-2">🎒 Mes Emprunts</h2>
                {mesEmprunts.length === 0 ? (
                    <p className="text-gray-500 italic text-center py-8">Vous n'avez aucun matériel.</p>
                ) : (
                    <div className="space-y-4">
                        {mesEmprunts.map(r => (
                            <div key={r.id_ressource} className="flex justify-between items-center bg-orange-500/10 p-4 rounded-xl border border-orange-500/20">
                                <div>
                                    <div className="font-bold text-orange-200">{r.nom_ressource}</div>
                                    <div className="text-xs text-orange-400/70">{r.numero_serie}</div>
                                </div>
                                <button 
                                    onClick={() => handleReturn(r.id_ressource)}
                                    className="px-3 py-1 rounded-lg border border-orange-400/30 text-orange-300 text-sm hover:bg-orange-500/20 transition font-bold"
                                >
                                    Rendre ↩️
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* 2. DISPONIBLES */}
            <div className="glass-panel p-6 rounded-2xl border-l-4 border-green-500">
                <h2 className="text-xl font-bold mb-6 text-green-400 flex items-center gap-2">🛒 Disponible</h2>
                {disponibles.length === 0 ? (
                    <p className="text-gray-500 italic text-center py-8">Rupture de stock complète.</p>
                ) : (
                    <div className="grid grid-cols-1 gap-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                        {disponibles.map(r => (
                            <div key={r.id_ressource} className="flex justify-between items-center bg-white/5 p-4 rounded-xl border border-white/5 hover:bg-white/10 transition">
                                <div>
                                    <div className="font-bold text-gray-200">{r.nom_ressource}</div>
                                    <div className="text-xs text-gray-500 flex gap-2 mt-1">
                                        <span className="bg-white/10 px-2 py-0.5 rounded">{r.type.replace('_', ' ')}</span>
                                        {r.localisation && <span>📍 {r.localisation}</span>}
                                    </div>
                                </div>
                                <button 
                                    onClick={() => handleBorrow(r.id_ressource)}
                                    className="bg-green-600/20 text-green-400 border border-green-600/30 px-3 py-2 rounded-lg text-sm hover:bg-green-600 hover:text-white font-bold transition shadow-[0_0_10px_rgba(22,163,74,0.1)]"
                                >
                                    Emprunter
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

        </div>
    </div>
  );
}