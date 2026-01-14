"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
// 👇 IMPORT LUCIDE
import { LogOut, Loader2 } from "lucide-react";

export default function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);

    try {
        // 1. Appel API pour supprimer le cookie de session (HttpOnly)
        await fetch("/api/auth/logout", { method: "POST" });

        // 2. Nettoyage du LocalStorage (Infos utilisateur)
        localStorage.removeItem("user_info");

        toast.success("À bientôt ! 👋");
        
        // 3. Redirection vers la route de login (et non le chemin du fichier)
        router.push("/login");
        router.refresh(); // Force le rafraîchissement pour effacer les caches Next.js
        
    } catch (error) {
        console.error("Erreur logout:", error);
        // Fallback de sécurité : on redirige quand même
        localStorage.removeItem("user_info");
        router.push("/login");
    } finally {
        setLoading(false);
    }
  };

  return (
    <button 
      onClick={handleLogout}
      disabled={loading}
      className="flex items-center justify-center gap-2 w-full bg-red-500/10 hover:bg-red-500 border border-red-500/20 hover:border-red-500 text-red-400 hover:text-white font-bold py-2.5 px-4 rounded-xl transition-all duration-300 group shadow-lg shadow-red-500/5 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <LogOut className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
      )}
      <span>{loading ? "Déconnexion..." : "Se déconnecter"}</span>
    </button>
  );
}