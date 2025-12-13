"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Toaster } from 'sonner';



export default function EmployeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen relative text-gray-200">
      {/* On laisse le fond du globals.css apparaître */}
      <div className="relative z-10">
        {children}
        <Toaster position="top-right" theme="dark" richColors />
      </div>
    </div>
  );

  const [bgColor, setBgColor] = useState("#f9fafb"); // Gris clair par défaut
  const pathname = usePathname(); // Pour détecter quand on change de page

  useEffect(() => {
    // À chaque changement de page, on vérifie la couleur
    const storedUser = localStorage.getItem("user_info");
    if (storedUser) {
      const user = JSON.parse(storedUser);
      if (user.couleur_fond) {
        setBgColor(user.couleur_fond);
      }
    }
  }, [pathname]); // Se déclenche quand on navigue

  return (
    <div 
      className="min-h-screen transition-colors duration-500"
      style={{ backgroundColor: bgColor }}
    >
      {children}
    </div>
  );

  
}

