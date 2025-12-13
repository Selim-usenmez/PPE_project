"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function EmployeDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ projets: 0, reservations: 0 });

  useEffect(() => {
    const stored = localStorage.getItem("user_info");
    if (!stored) {
      router.push("/login");
      return;
    }
    setUser(JSON.parse(stored));
    
    setTimeout(() => {
        setStats({ projets: 3, reservations: 1 });
        setLoading(false);
    }, 800);
  }, [router]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    localStorage.removeItem("user_info");
    router.push("/login");
  };

  if (!user) return null;

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto">
      
      {/* Header Glass */}
      <header className="flex flex-col md:flex-row justify-between items-center mb-10 glass-panel p-6 rounded-2xl animate-fade-in shadow-lg">
        <div>
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
            Mon Espace
          </h1>
          <p className="text-gray-400 mt-1">
            Ravi de vous revoir, <span className="text-white font-bold">{user.prenom} {user.nom}</span> 👋
          </p>
        </div>
        <div className="flex gap-4 mt-4 md:mt-0">
            <button 
                onClick={() => router.push('/employe/profile')} 
                className="px-4 py-2 rounded-lg border border-white/10 hover:bg-white/5 transition text-sm font-bold text-gray-300"
            >
                ⚙️ Profil
            </button>
            <button 
                onClick={handleLogout} 
                className="btn-neon-red px-4 py-2 rounded-lg font-bold text-sm"
            >
                Déconnexion
            </button>
        </div>
      </header>

      {/* Grille Principale */}
      <main className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-slide-up">
        
        {/* Actions Rapides (Cartes Interactives) */}
        <div onClick={() => router.push('/reservations')} 
             className="glass-panel p-6 rounded-2xl hover:border-blue-500/50 cursor-pointer group transition-all duration-300">
            <div className="text-4xl mb-4 group-hover:scale-110 transition-transform duration-300">📅</div>
            <h3 className="text-xl font-bold text-white">Réserver Salle</h3>
            <p className="text-gray-400 text-sm mt-2">Planifier une réunion pour vos projets.</p>
        </div>

        <div onClick={() => router.push('/employe/ressources')} 
             className="glass-panel p-6 rounded-2xl hover:border-purple-500/50 cursor-pointer group transition-all duration-300">
            <div className="text-4xl mb-4 group-hover:scale-110 transition-transform duration-300">📦</div>
            <h3 className="text-xl font-bold text-white">Emprunter Matériel</h3>
            <p className="text-gray-400 text-sm mt-2">Accéder à l'inventaire et faire une demande.</p>
        </div>

        <div onClick={() => router.push('/employe/incidents')} 
             className="glass-panel p-6 rounded-2xl hover:border-red-500/50 cursor-pointer group transition-all duration-300">
            <div className="text-4xl mb-4 group-hover:scale-110 transition-transform duration-300">⚠️</div>
            <h3 className="text-xl font-bold text-white">Signaler Incident</h3>
            <p className="text-gray-400 text-sm mt-2">Un problème technique ? Dites-le nous.</p>
        </div>

        {/* Section Projets */}
        <div className="md:col-span-2 glass-panel p-6 rounded-2xl mt-4 border-l-4 border-l-blue-500">
            <h2 className="text-xl font-bold text-white mb-6 border-b border-white/10 pb-4">📂 Mes Projets en cours</h2>
            {loading ? (
                <div className="flex items-center gap-2 text-blue-400 animate-pulse">
                    <div className="h-2 w-2 rounded-full bg-blue-400"></div> Chargement...
                </div>
            ) : (
                <div className="space-y-3">
                    <div className="bg-white/5 p-4 rounded-xl border border-white/5 flex justify-between items-center hover:bg-white/10 transition">
                        <div>
                            <h4 className="font-bold text-blue-300">Refonte Site Web</h4>
                            <p className="text-xs text-gray-400 mt-1">Date fin: 24 Dec 2025</p>
                        </div>
                        <span className="px-3 py-1 rounded-full bg-green-500/10 text-green-400 text-xs border border-green-500/20 font-bold shadow-[0_0_10px_rgba(34,197,94,0.2)]">EN COURS</span>
                    </div>
                    {/* Tu ajouteras ton .map ici plus tard */}
                </div>
            )}
        </div>

        {/* Section Stats */}
        <div className="glass-panel p-6 rounded-2xl mt-4">
            <h2 className="text-xl font-bold text-white mb-6">📊 Activité</h2>
            <div className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-black/20 rounded-xl border border-white/5">
                    <span className="text-gray-400">Projets assignés</span>
                    <span className="font-bold text-2xl text-blue-400">{stats.projets}</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-black/20 rounded-xl border border-white/5">
                    <span className="text-gray-400">Réservations</span>
                    <span className="font-bold text-2xl text-purple-400">{stats.reservations}</span>
                </div>
            </div>
        </div>

      </main>
    </div>
  );
}