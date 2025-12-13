"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { canManageEmployees } from "@/lib/permissions";

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [role, setRole] = useState("STAGIAIRE");

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user_info") || "{}");
    if (user.role) setRole(user.role);
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    localStorage.removeItem("user_info");
    router.push("/login");
  };

  const isActive = (path: string) => pathname === path;

  const allLinks = [
    { name: "Dashboard", path: "/admin/dashboard", icon: "📊", access: true },
    { name: "Employés", path: "/admin/employes", icon: "👥", access: canManageEmployees(role) },
    { name: "Salles", path: "/admin/salles", icon: "🏢", access: true },
    
    // 👇 CHEMIN CORRIGÉ ICI : /admin/reservation
    { name: "Réservations", path: "/admin/reservations", icon: "📅", access: true },

    { name: "Projets", path: "/admin/projets", icon: "🚀", access: true },
    { name: "Ressources", path: "/admin/ressources", icon: "📦", access: true },
    { name: "Incidents", path: "/admin/incidents", icon: "⚠️", access: true },
    { name: "Historique", path: "/admin/historique", icon: "📜", access: role === "ADMIN" },
  ];

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 glass-panel border-r border-white/10 flex flex-col z-50 bg-[#030712]/90">
      
      {/* Header */}
      <div className="p-6 border-b border-white/10 flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-blue-500/30">
          N
        </div>
        <div>
            <h1 className="text-xl font-bold text-white tracking-wide">Nexus<span className="text-blue-400">Admin</span></h1>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest border border-white/10 rounded px-1 w-fit mt-1">{role}</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1 custom-scrollbar">
        {allLinks.filter(l => l.access).map((link) => (
          <Link 
            key={link.path} 
            href={link.path}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group ${
              isActive(link.path) 
                ? "bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.2)]" 
                : "text-gray-400 hover:bg-white/5 hover:text-white"
            }`}
          >
            <span className="text-xl group-hover:scale-110 transition-transform">{link.icon}</span>
            <span className="font-medium">{link.name}</span>
          </Link>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-white/10 bg-black/20">
        <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 btn-neon-red py-2 rounded-lg text-sm font-bold">
          <span>🚪</span> Déconnexion
        </button>
      </div>
    </aside>
  );
}