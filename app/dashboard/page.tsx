"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminSidebar from "../components/AdminSidebar"; 
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
// 👇 IMPORTS LUCIDE
import { 
  Briefcase, Users, CalendarRange, DoorOpen, 
  BarChart2, History, Loader2, TrendingUp 
} from "lucide-react";

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    const storedUser = localStorage.getItem("user_info");
    if (!storedUser) {
        router.push("/login"); 
    } else {
      const u = JSON.parse(storedUser);
      setUser(u);
      if (u.role !== "ADMIN") router.push("/employe/dashboard");
    }

    fetch("/api/stats")
      .then(res => res.json())
      .then(data => setStats(data))
      .catch(err => console.error(err));
  }, [router]);

  // État de chargement avec un beau spinner centré
  if (!stats || !user) return (
    <div className="min-h-screen flex items-center justify-center bg-[#030712]">
        <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
            <p className="text-blue-400 font-mono text-sm animate-pulse">Chargement des données...</p>
        </div>
    </div>
  );

  return (
    <div className="min-h-screen text-gray-200 bg-[#030712]">
      <AdminSidebar />
      
      <main className="ml-64 p-8 animate-fade-in">
        
        {/* EN-TÊTE */}
        <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                Tableau de Bord <span className="text-sm font-normal text-gray-500 bg-white/5 px-2 py-1 rounded-lg border border-white/10">v1.0</span>
            </h1>
            <p className="text-gray-400">
                Ravi de vous revoir, <span className="text-blue-400 font-bold">{user.prenom}</span>. Voici ce qu'il se passe aujourd'hui.
            </p>
        </div>

        {/* --- CARTES KPI --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          
          {/* CARTE 1 : PROJETS */}
          <div className="glass-panel p-6 rounded-2xl border-l-4 border-blue-500 relative overflow-hidden group hover:translate-y-[-2px] transition-all">
            <div className="absolute right-4 top-4 p-3 bg-blue-500/10 rounded-xl text-blue-500 group-hover:scale-110 transition-transform">
                <Briefcase className="w-6 h-6" />
            </div>
            <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Projets Actifs</h3>
            <p className="text-3xl font-bold text-white">{stats.projetsEnCours}</p>
            <div className="mt-2 text-[10px] text-blue-300 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" /> En cours de développement
            </div>
          </div>

          {/* CARTE 2 : EMPLOYÉS */}
          <div className="glass-panel p-6 rounded-2xl border-l-4 border-purple-500 relative overflow-hidden group hover:translate-y-[-2px] transition-all">
            <div className="absolute right-4 top-4 p-3 bg-purple-500/10 rounded-xl text-purple-500 group-hover:scale-110 transition-transform">
                <Users className="w-6 h-6" />
            </div>
            <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Collaborateurs</h3>
            <p className="text-3xl font-bold text-white">{stats.employes}</p>
            <div className="mt-2 text-[10px] text-purple-300 flex items-center gap-1">
                Effectif total enregistré
            </div>
          </div>

          {/* CARTE 3 : RÉSERVATIONS */}
          <div className="glass-panel p-6 rounded-2xl border-l-4 border-green-500 relative overflow-hidden group hover:translate-y-[-2px] transition-all">
            <div className="absolute right-4 top-4 p-3 bg-green-500/10 rounded-xl text-green-500 group-hover:scale-110 transition-transform">
                <CalendarRange className="w-6 h-6" />
            </div>
            <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Réservations</h3>
            <p className="text-3xl font-bold text-white">{stats.reservations}</p>
            <div className="mt-2 text-[10px] text-green-300 flex items-center gap-1">
                Prévues dans le futur
            </div>
          </div>

          {/* CARTE 4 : SALLES */}
          <div className="glass-panel p-6 rounded-2xl border-l-4 border-orange-500 relative overflow-hidden group hover:translate-y-[-2px] transition-all">
            <div className="absolute right-4 top-4 p-3 bg-orange-500/10 rounded-xl text-orange-500 group-hover:scale-110 transition-transform">
                <DoorOpen className="w-6 h-6" />
            </div>
            <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Salles & Labos</h3>
            <p className="text-3xl font-bold text-white">{stats.salles}</p>
            <div className="mt-2 text-[10px] text-orange-300 flex items-center gap-1">
                Disponibles à la réservation
            </div>
          </div>

        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* GRAPHIQUE */}
            <div className="glass-panel p-6 rounded-2xl h-96 flex flex-col border border-white/10 shadow-xl">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
                        <BarChart2 className="w-5 h-5" />
                    </div>
                    <h3 className="text-white font-bold text-lg">Occupation des Salles</h3>
                </div>
                
                <div className="flex-1 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={stats.chartData} barSize={32}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                            <XAxis 
                                dataKey="name" 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{fill: '#64748b', fontSize: 11}} 
                                dy={10} 
                            />
                            <YAxis 
                                axisLine={false} 
                                tickLine={false} 
                                allowDecimals={false} 
                                tick={{fill: '#64748b', fontSize: 11}} 
                            />
                            <Tooltip 
                                cursor={{fill: 'rgba(255,255,255,0.05)'}}
                                contentStyle={{ 
                                    backgroundColor: '#0f172a', 
                                    borderColor: 'rgba(255,255,255,0.1)', 
                                    color: '#fff',
                                    borderRadius: '12px',
                                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.5)'
                                }}
                            />
                            {/* DÉGRADÉ SUR LES BARRES */}
                            <defs>
                                <linearGradient id="colorBar" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.9}/>
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                </linearGradient>
                            </defs>
                            <Bar 
                                dataKey="reservations" 
                                fill="url(#colorBar)" 
                                radius={[6, 6, 0, 0]} 
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* TABLEAU DERNIERS PROJETS */}
            <div className="glass-panel rounded-2xl p-6 h-96 overflow-hidden flex flex-col border border-white/10 shadow-xl">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-purple-500/20 rounded-lg text-purple-400">
                        <History className="w-5 h-5" />
                    </div>
                    <h2 className="text-lg font-bold text-white">Derniers Projets Ajoutés</h2>
                </div>

                <div className="overflow-y-auto custom-scrollbar flex-1 pr-2">
                    <table className="min-w-full text-left">
                        <thead>
                            <tr className="border-b border-white/5 text-gray-500 text-[10px] uppercase tracking-widest font-semibold">
                                <th className="py-3 pl-2">Nom du projet</th>
                                <th className="py-3 text-right">État</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {stats.recents.map((proj: any) => (
                            <tr key={proj.id_projet} className="hover:bg-white/5 transition group">
                                <td className="py-3.5 pl-2 font-medium text-gray-200 text-sm flex items-center gap-3">
                                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                    {proj.nom_projet}
                                </td>
                                <td className="py-3.5 text-right">
                                    <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold border uppercase tracking-wide ${
                                        proj.statut === 'EN_COURS' 
                                        ? 'bg-blue-500/10 text-blue-300 border-blue-500/20' 
                                        : 'bg-gray-500/10 text-gray-400 border-gray-500/20'
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