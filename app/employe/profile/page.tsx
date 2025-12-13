"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner"; 
import Link from "next/link";

export default function UserProfile() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [infoForm, setInfoForm] = useState({ nom: "", prenom: "", email: "" });
  const [passwords, setPasswords] = useState({ current: "", new: "", confirm: "" });

  useEffect(() => {
    const stored = localStorage.getItem("user_info");
    if (!stored) router.push("/login");
    else {
        const u = JSON.parse(stored);
        setUser(u);
        setInfoForm({ nom: u.nom, prenom: u.prenom, email: u.email });
    }
  }, [router]);

  const handleUpdateInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
        const res = await fetch("/api/employes/profile", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                type: "info", 
                id: user.id || user.id_employe, 
                ...infoForm 
            }),
        });
        const data = await res.json();
        if (res.ok) {
            toast.success("Infos mises à jour !");
            setUser(data.user);
            localStorage.setItem("user_info", JSON.stringify(data.user));
        } else {
            toast.error(data.error);
        }
    } catch (err) { toast.error("Erreur serveur"); } 
    finally { setLoading(false); }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwords.new !== passwords.confirm) {
        toast.error("Mots de passe non identiques.");
        return;
    }
    setLoading(true);
    try {
        const res = await fetch("/api/employes/profile", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                type: "password", 
                id: user.id || user.id_employe, 
                currentPassword: passwords.current, 
                newPassword: passwords.new 
            }),
        });
        const data = await res.json();
        if (res.ok) {
            toast.success("Mot de passe modifié !");
            setPasswords({ current: "", new: "", confirm: "" });
        } else {
            toast.error(data.error);
        }
    } catch (err) { toast.error("Erreur serveur"); } 
    finally { setLoading(false); }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen p-8 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold text-white">Mon Profil</h1>
            <Link href="/employe/dashboard" className="px-4 py-2 rounded-lg border border-white/10 hover:bg-white/5 text-sm font-bold transition">
                ← Retour
            </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-slide-up">
            
            {/* CARTE IDENTITÉ */}
            <div className="lg:col-span-1 glass-panel p-6 rounded-2xl text-center h-fit">
                <div className="h-24 w-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-3xl font-bold mx-auto mb-4 shadow-lg shadow-blue-500/30">
                    {user.prenom?.[0]}{user.nom?.[0]}
                </div>
                <h2 className="text-xl font-bold text-white">{user.prenom} {user.nom}</h2>
                <span className="inline-block mt-2 px-3 py-1 rounded-full bg-white/10 text-xs font-bold text-blue-300 border border-white/10 uppercase">
                    {user.role}
                </span>
                
                <div className="mt-6 border-t border-white/10 pt-4 text-left">
                    <p className="text-xs text-gray-500 uppercase font-bold mb-3">Validité du compte</p>
                    <div className="bg-black/20 p-4 rounded-xl space-y-3">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Début :</span>
                            <span className="text-green-400 font-bold">{user.date_debut_validite ? new Date(user.date_debut_validite).toLocaleDateString() : "Active"}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Fin :</span>
                            <span className="text-white font-bold">{user.date_fin_validite ? new Date(user.date_fin_validite).toLocaleDateString() : "Illimité ∞"}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* FORMULAIRES */}
            <div className="lg:col-span-2 space-y-8">
                
                {/* INFO PERSO */}
                <div className="glass-panel p-6 rounded-2xl">
                    <h3 className="text-lg font-bold text-blue-400 mb-6 border-b border-white/10 pb-2">👤 Mes Informations</h3>
                    <form onSubmit={handleUpdateInfo} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <input type="text" placeholder="Prénom" className="glass-input w-full"
                                value={infoForm.prenom} onChange={e => setInfoForm({...infoForm, prenom: e.target.value})} />
                            <input type="text" placeholder="Nom" className="glass-input w-full"
                                value={infoForm.nom} onChange={e => setInfoForm({...infoForm, nom: e.target.value})} />
                        </div>
                        <div className="relative">
                            <input type="email" disabled value={infoForm.email} className="glass-input w-full opacity-60 cursor-not-allowed" />
                            <span className="absolute right-3 top-3 text-xs text-gray-500">🔒 Email non modifiable</span>
                        </div>
                        <div className="text-right mt-4">
                            <button type="submit" disabled={loading} className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-bold transition">
                                {loading ? "..." : "Sauvegarder"}
                            </button>
                        </div>
                    </form>
                </div>

                {/* MOT DE PASSE */}
                <div className="glass-panel p-6 rounded-2xl border border-red-500/20">
                    <h3 className="text-lg font-bold text-red-400 mb-6 border-b border-white/10 pb-2">🔒 Sécurité</h3>
                    <form onSubmit={handleChangePassword} className="space-y-4">
                        <input type="password" placeholder="Mot de passe actuel" className="glass-input w-full" required
                            value={passwords.current} onChange={e => setPasswords({...passwords, current: e.target.value})} />
                        <div className="grid grid-cols-2 gap-4">
                            <input type="password" placeholder="Nouveau mot de passe" className="glass-input w-full" required minLength={6}
                                value={passwords.new} onChange={e => setPasswords({...passwords, new: e.target.value})} />
                            <input type="password" placeholder="Confirmer nouveau" className="glass-input w-full" required minLength={6}
                                value={passwords.confirm} onChange={e => setPasswords({...passwords, confirm: e.target.value})} />
                        </div>
                        <div className="text-right mt-4">
                            <button type="submit" disabled={loading} className="btn-neon-blue px-4 py-2 rounded-lg text-sm font-bold">
                                {loading ? "..." : "Mettre à jour mot de passe"}
                            </button>
                        </div>
                    </form>
                </div>

            </div>
        </div>
    </div>
  );
}