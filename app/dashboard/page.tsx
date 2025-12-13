"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminSidebar from "../components/AdminSidebar"; // Vérifie bien le chemin d'import
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function DashboardHome() {
  const [stats, setStats] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    // 1. Sécurité
    const storedUser = localStorage.getItem("user_info");
    if (!storedUser) router.push("/login");
    else {
      const u = JSON.parse(storedUser);
      setUser(u);
      if (u.role !== "ADMIN") router.push("/employe/dashboard");
    }

    // 2. Charger les stats
    fetch("/api/stats")
      .then(res => res.json())
      .then(data => setStats(data))
      .catch(err => console.error(err));
  }, [router]);

  if (!stats || !user) return (
    <div className="min-h-screen ml-64 flex items-center justify-center text-blue-400 animate-pulse">
        Chargement des données...
    </div>
  );

  return (
    <div className="min-h-screen text-gray-200">
      <AdminSidebar />
      
      {/* Ajout de ml-64 car la Sidebar est "fixed" */}
      <main className="ml-64 p-8 animate-fade-in">
        
        {/* Header */}
        <div className="mb-8 flex justify-between items-end">
            <div>
                <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                    Tableau de Bord
                </h1>
                <p className="text-gray-400 mt-2">
                    Vue d'ensemble pour <span className="text-white font-bold">{user.prenom}</span> 🚀
                </p>
            </div>
            <div className="text-xs text-gray-500 bg-black/20 px-3 py-1 rounded-full border border-white/5">
                Dernière mise à jour : {new Date().toLocaleTimeString()}
            </div>
        </div>

        {/* --- CARTES KPI (CHIFFRES CLÉS) --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          
          <div className="glass-panel p-6 rounded-2xl border-l-4 border-l-blue-500 relative overflow-hidden group">
            <div className="absolute right-0 top-0 p-4 opacity-10 text-6xl group-hover:scale-110 transition">📂</div>
            <h3 className="text-blue-400 text-xs font-bold uppercase tracking-wider">Projets en cours</h3>
            <p className="text-4xl font-bold text-white mt-2">{stats.projetsEnCours}</p>
          </div>

          <div className="glass-panel p-6 rounded-2xl border-l-4 border-l-purple-500 relative overflow-hidden group">
            <div className="absolute right-0 top-0 p-4 opacity-10 text-6xl group-hover:scale-110 transition">👥</div>
            <h3 className="text-purple-400 text-xs font-bold uppercase tracking-wider">Employés Total</h3>
            <p className="text-4xl font-bold text-white mt-2">{stats.employes}</p>
          </div>

          <div className="glass-panel p-6 rounded-2xl border-l-4 border-l-green-500 relative overflow-hidden group">
            <div className="absolute right-0 top-0 p-4 opacity-10 text-6xl group-hover:scale-110 transition">📅</div>
            <h3 className="text-green-400 text-xs font-bold uppercase tracking-wider">Réservations (Futur)</h3>
            <p className="text-4xl font-bold text-white mt-2">{stats.reservations}</p>
          </div>

          <div className="glass-panel p-6 rounded-2xl border-l-4 border-l-orange-500 relative overflow-hidden group">
            <div className="absolute right-0 top-0 p-4 opacity-10 text-6xl group-hover:scale-110 transition">🏢</div>
            <h3 className="text-orange-400 text-xs font-bold uppercase tracking-wider">Salles gérées</h3>
            <p className="text-4xl font-bold text-white mt-2">{stats.salles}</p>
          </div>

        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* --- GRAPHIQUE --- */}
            <div className="glass-panel p-6 rounded-2xl h-96 flex flex-col">
                <h3 className="text-white font-bold mb-6 flex items-center gap-2">
                    📊 Occupation des salles <span className="text-xs font-normal text-gray-500">(7 prochains jours)</span>
                </h3>
                <div className="flex-1 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={stats.chartData}>
                            {/* Grille subtile */}
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.1)" />
                            
                            {/* Axes en gris clair */}
                            <XAxis 
                                dataKey="name" 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fill: '#9ca3af', fontSize: 12 }} 
                                dy={10}
                            />
                            <YAxis 
                                axisLine={false} 
                                tickLine={false} 
                                allowDecimals={false} 
                                tick={{ fill: '#9ca3af', fontSize: 12 }} 
                            />
                            
                            {/* Tooltip sombre */}
                            <Tooltip 
                                cursor={{fill: 'rgba(255,255,255,0.05)'}}
                                contentStyle={{ 
                                    backgroundColor: 'rgba(17, 25, 40, 0.9)', 
                                    border: '1px solid rgba(255,255,255,0.1)', 
                                    borderRadius: '8px',
                                    color: '#fff'
                                }}
                            />
                            
                            {/* Barres Néon */}
                            <Bar 
                                dataKey="reservations" 
                                fill="#3B82F6" 
                                radius={[6, 6, 0, 0]} 
                                barSize={50}
                                className="hover:opacity-80 transition-opacity"
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* --- TABLEAU DERNIERS PROJETS --- */}
            <div className="glass-panel rounded-2xl overflow-hidden h-96 flex flex-col">
                <div className="p-6 border-b border-white/10 bg-white/5">
                    <h2 className="text-xl font-bold text-white">🚀 Derniers projets créés</h2>
                </div>
                
                <div className="overflow-y-auto custom-scrollbar flex-1 p-2">
                    <table className="min-w-full text-left">
                        <thead className="text-gray-500 text-xs uppercase sticky top-0 bg-[#0f172a] z-10">
                            <tr>
                                <th className="px-4 py-3">Nom du projet</th>
                                <th className="px-4 py-3 text-right">Statut</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {stats.recents.map((proj: any) => (
                            <tr key={proj.id_projet} className="hover:bg-white/5 transition group">
                                <td className="px-4 py-3">
                                    <div className="font-medium text-gray-200 group-hover:text-blue-300 transition-colors">
                                        {proj.nom_projet}
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <span className={`px-2 py-1 rounded text-[10px] font-bold border ${
                                        proj.statut === 'EN_COURS' 
                                        ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' 
                                        : 'bg-gray-700/50 text-gray-400 border-gray-600'
                                    }`}>
                                        {proj.statut.replace('_', ' ')}
                                    </span>
                                </td>
                            </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

        </div>
      </main>
    </div>
  );
}