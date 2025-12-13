"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminSidebar from "../../components/AdminSidebar"; 
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

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

  if (!stats || !user) return <div className="ml-64 p-10 text-blue-400 animate-pulse">Chargement...</div>;

  return (
    <div className="min-h-screen text-gray-200">
      <AdminSidebar />
      
      <main className="ml-64 p-8 animate-fade-in">
        <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 mb-2">
            Tableau de Bord
        </h1>
        <p className="text-gray-400 mb-8">Bienvenue, <span className="text-white font-bold">{user.prenom}</span>.</p>

        {/* --- CARTES KPI --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="glass-panel p-6 rounded-2xl border-l-4 border-blue-500">
            <h3 className="text-blue-400 text-xs font-bold uppercase tracking-wider">Projets en cours</h3>
            <p className="text-4xl font-bold text-white mt-2">{stats.projetsEnCours}</p>
          </div>
          <div className="glass-panel p-6 rounded-2xl border-l-4 border-purple-500">
            <h3 className="text-purple-400 text-xs font-bold uppercase tracking-wider">Employés Total</h3>
            <p className="text-4xl font-bold text-white mt-2">{stats.employes}</p>
          </div>
          <div className="glass-panel p-6 rounded-2xl border-l-4 border-green-500">
            <h3 className="text-green-400 text-xs font-bold uppercase tracking-wider">Réservations (Futur)</h3>
            <p className="text-4xl font-bold text-white mt-2">{stats.reservations}</p>
          </div>
          <div className="glass-panel p-6 rounded-2xl border-l-4 border-orange-500">
            <h3 className="text-orange-400 text-xs font-bold uppercase tracking-wider">Salles gérées</h3>
            <p className="text-4xl font-bold text-white mt-2">{stats.salles}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* GRAPHIQUE */}
            <div className="glass-panel p-6 rounded-2xl h-80 flex flex-col">
                <h3 className="text-white font-bold mb-4">Occupation des salles</h3>
                <div className="flex-1 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={stats.chartData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.1)" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} dy={10} />
                            <YAxis axisLine={false} tickLine={false} allowDecimals={false} tick={{fill: '#9ca3af', fontSize: 12}} />
                            <Tooltip 
                                cursor={{fill: 'rgba(255,255,255,0.05)'}}
                                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff' }}
                            />
                            <Bar dataKey="reservations" fill="#3B82F6" radius={[4, 4, 0, 0]} barSize={40} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* TABLEAU DERNIERS PROJETS */}
            <div className="glass-panel rounded-2xl p-6 h-80 overflow-y-auto custom-scrollbar">
                <h2 className="text-xl font-bold text-white mb-4">Derniers projets</h2>
                <table className="min-w-full text-left">
                    <thead>
                        <tr className="border-b border-white/10 text-gray-400 text-xs uppercase">
                            <th className="py-3">Nom</th>
                            <th className="py-3 text-right">Statut</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {stats.recents.map((proj: any) => (
                        <tr key={proj.id_projet} className="hover:bg-white/5 transition">
                            <td className="py-3 font-medium text-gray-200 text-sm">{proj.nom_projet}</td>
                            <td className="py-3 text-right">
                                <span className={`px-2 py-1 rounded text-[10px] font-bold border ${
                                    proj.statut === 'EN_COURS' 
                                    ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' 
                                    : 'bg-gray-700/50 text-gray-400 border-gray-600'
                                }`}>
                                    {proj.statut}
                                </span>
                            </td>
                        </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
      </main>
    </div>
  );
}