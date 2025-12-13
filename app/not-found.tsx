"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function NotFound() {
  const router = useRouter();
  // Par défaut, on renvoie vers le login
  const [redirectPath, setRedirectPath] = useState("/login");
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    // On vérifie le localStorage côté client uniquement
    const storedUser = localStorage.getItem("user_info");
    
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        setIsLoggedIn(true);
        
        // Redirection intelligente selon le rôle
        if (user.role === "ADMIN") {
          setRedirectPath("/admin/dashboard");
        } else {
          setRedirectPath("/employe/dashboard");
        }
      } catch (e) {
        // Si le JSON est cassé, on renvoie au login
        setRedirectPath("/login");
      }
    }
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden">
      
      {/* Effet d'arrière-plan (Optionnel, pour renforcer l'immersion) */}
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-transparent to-transparent pointer-events-none"></div>

      {/* Carte Glassmorphism */}
      <div className="glass-panel p-10 md:p-14 rounded-3xl text-center max-w-lg w-full animate-fade-in shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-white/10">
        
        {/* Gros titre 404 Néon */}
        <h1 className="text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 mb-2 drop-shadow-[0_0_15px_rgba(139,92,246,0.5)]">
          404
        </h1>

        <h2 className="text-2xl font-bold text-white mb-4">
          Perdu dans l'espace ? 🪐
        </h2>
        
        <p className="text-gray-400 mb-8 text-sm md:text-base">
          La page que vous cherchez n'existe pas ou a été déplacée vers une autre galaxie.
        </p>

        {/* Bouton de retour intelligent */}
        <button
          onClick={() => router.push(redirectPath)}
          className="btn-neon-blue px-8 py-4 rounded-xl font-bold text-lg w-full transition-transform hover:scale-105 flex items-center justify-center gap-2"
        >
          {isLoggedIn ? "🏠 Retour au Dashboard" : "🔐 Se connecter"}
        </button>

      </div>
      
      {/* Petit footer discret */}
      <div className="absolute bottom-8 text-gray-600 text-xs">
        Erreur système • Protocole Nexus
      </div>
    </div>
  );
}