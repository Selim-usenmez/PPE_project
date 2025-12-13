"use client";

import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();

  const handleLogout = () => {
    // 1. Supprimer les infos stockées
    localStorage.removeItem("user_info");
    
    // 2. (Optionnel) Appeler une route API pour supprimer le cookie httpOnly côté serveur
    // fetch('/api/auth/logout'); 
    
    // 3. Rediriger vers la page de login
    router.push("../../auth/login/page.tsx");
  };

  return (
    <button 
      onClick={handleLogout}
      className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded transition duration-200"
    >
      Se déconnecter
    </button>
  );
}