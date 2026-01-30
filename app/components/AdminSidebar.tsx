"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { canManageEmployees } from "@/lib/permissions";
// 👇 IMPORTS LUCIDE (J'ai ajouté "Archive")
import { 
  LayoutDashboard, Users, DoorOpen, CalendarRange, 
  Briefcase, Box, AlertTriangle, ScrollText, LogOut, 
  KeyRound, Eye, Archive 
} from "lucide-react";

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [role, setRole] = useState("STAGIAIRE");
  const [userPrenom, setUserPrenom] = useState("");

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user_info") || "{}");
    if (user.role) setRole(user.role);
    if (user.prenom) setUserPrenom(user.prenom);
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    localStorage.removeItem("user_info");
    router.push("/login");
  };

  const isActive = (path: string) => pathname === path;

  // Configuration des liens
  const allLinks = [
    { name: "Dashboard", path: "/admin/dashboard", icon: LayoutDashboard, access: true },
    { name: "Employés", path: "/admin/employes", icon: Users, access: canManageEmployees(role) },
    { name: "Salles", path: "/admin/salles", icon: DoorOpen, access: true },
    { name: "Réservations", path: "/admin/reservations", icon: CalendarRange, access: true },
    { name: "Projets", path: "/admin/projets", icon: Briefcase, access: true },
    { name: "Ressources", path: "/admin/ressources", icon: Box, access: true },
    { name: "Incidents", path: "/admin/incidents", icon: AlertTriangle, access: true },
    { name: "Historique", path: "/admin/historique", icon: ScrollText, access: role === "ADMIN" },
    // 👇 NOUVEAU LIEN ARCHIVES (ADMIN ONLY)
    { name: "Archives", path: "/admin/archives", icon: Archive, access: role === "ADMIN" },
  ];

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 glass-panel border-r border-white/10 flex flex-col z-50 bg-[#030712]">
      
      {/* HEADER AVEC LOGO */}
      <div className="p-6 border-b border-white/10 flex items-center gap-3">
        <div className="relative h-10 w-10 flex-shrink-0">
           <Image 
             src="/logo.png" 
             alt="NexusPharm Logo" 
             fill
             className="object-contain"
             priority
           />
        </div>

        <div className="overflow-hidden">
            <h1 className="text-lg font-bold text-white tracking-wide leading-tight truncate">
                Nexus<span className="text-blue-400">Admin</span>
            </h1>
            <div className="flex items-center gap-1 mt-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                <p className="text-[10px] text-gray-400 uppercase tracking-widest font-medium truncate">
                    {role.replace("_", " ")}
                </p>
            </div>
        </div>
      </div>

      {/* NAVIGATION PRINCIPALE */}
      <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1 custom-scrollbar">
        <div className="text-[10px] uppercase text-gray-600 font-bold px-4 mb-2 tracking-widest">
            Menu Principal
        </div>
        
        {allLinks.filter(l => l.access).map((link) => {
          const Icon = link.icon;
          const active = isActive(link.path);
          
          return (
            <Link 
              key={link.path} 
              href={link.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative ${
                active
                  ? "bg-blue-600/10 text-blue-400 border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.1)]" 
                  : "text-gray-400 hover:bg-white/5 hover:text-gray-200 border border-transparent"
              }`}
            >
              <Icon className={`w-5 h-5 transition-transform group-hover:scale-110 ${active ? "text-blue-400" : "text-gray-500 group-hover:text-gray-300"}`} />
              <span className="font-medium text-sm">{link.name}</span>
              
              {active && <div className="absolute right-3 w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_5px_rgba(59,130,246,0.5)]"></div>}
            </Link>
          );
        })}
      </nav>

      {/* FOOTER (Switch View + User Info + Logout) */}
      <div className="p-4 border-t border-white/10 bg-black/20">
        
        {/* BOUTON SWITCH VUE EMPLOYÉ */}
        <Link 
            href="/employe/dashboard"
            className="w-full flex items-center justify-center gap-2 mb-4 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white py-2.5 rounded-xl text-sm font-bold transition-all group"
        >
            <Eye className="w-4 h-4 group-hover:text-blue-400 transition-colors" />
            <span>Vue Employé</span>
        </Link>

        {/* INFO UTILISATEUR */}
        <div className="mb-4 px-2 flex items-center gap-3">
             <div className="w-8 h-8 rounded-full bg-gray-800 border border-white/10 flex items-center justify-center text-xs font-bold text-white shadow-inner">
                {userPrenom ? userPrenom[0] : "U"}
             </div>
             <div className="overflow-hidden">
                <p className="text-sm text-white font-medium truncate">{userPrenom || "Utilisateur"}</p>
                <p className="text-[10px] text-gray-500">Connecté</p>
             </div>
        </div>

        {/* BOUTON DÉCONNEXION */}
        <button 
            onClick={handleLogout} 
            className="w-full flex items-center justify-center gap-2 text-red-400 hover:text-white bg-red-500/10 hover:bg-red-500 border border-red-500/20 hover:border-red-500 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 group"
        >
          <LogOut className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Déconnexion
        </button>
      </div>
    </aside>
  );
}