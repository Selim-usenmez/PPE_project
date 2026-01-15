"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner"; 
import Link from "next/link";
// 👇 IMPORTS LUCIDE
import { 
  User, Mail, Lock, ShieldCheck, Calendar, Save, 
  Loader2, ArrowLeft, KeyRound, CheckCircle2 
} from "lucide-react";

export default function UserProfile() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  
  // États Formulaires
  const [infoForm, setInfoForm] = useState({ nom: "", prenom: "", email: "" });
  const [passwords, setPasswords] = useState({ current: "", new: "", confirm: "" });

  useEffect(() => {
    const stored = localStorage.getItem("user_info");
    if (!stored) {
        router.push("/login");
    } else {
        const u = JSON.parse(stored);
        setUser(u);
        setInfoForm({ nom: u.nom, prenom: u.prenom, email: u.email });
    }
  }, [router]);

  // MISE À JOUR INFOS
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
            toast.success("Informations mises à jour !");
            setUser(data.user);
            localStorage.setItem("user_info", JSON.stringify(data.user));
        } else {
            toast.error(data.error);
        }
    } catch (err) { toast.error("Erreur serveur"); } 
    finally { setLoading(false); }
  };

  // CHANGEMENT MOT DE PASSE
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwords.new !== passwords.confirm) {
        toast.error("Les nouveaux mots de passe ne correspondent pas.");
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
            toast.success("Mot de passe modifié avec succès ! 🔒");
            setPasswords({ current: "", new: "", confirm: "" });
        } else {
            toast.error(data.error);
        }
    } catch (err) { toast.error("Erreur serveur"); } 
    finally { setLoading(false); }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen p-6 md:p-10 bg-[#030712] text-gray-200">
        <div className="max-w-6xl mx-auto animate-fade-in">
            
            {/* HEADER */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                        <User className="w-8 h-8 text-blue-500" />
                        Mon Profil
                    </h1>
                    <p className="text-gray-400 text-sm mt-1">Gérez vos informations personnelles et votre sécurité.</p>
                </div>
                <Link 
                    href="/employe/dashboard" 
                    className="px-4 py-2 rounded-xl border border-white/10 hover:bg-white/5 text-sm font-bold transition flex items-center gap-2 text-gray-300 hover:text-white group"
                >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Retour
                </Link>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* --- COLONNE GAUCHE : CARTE IDENTITÉ --- */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="glass-panel p-8 rounded-2xl text-center border border-white/10 shadow-2xl relative overflow-hidden">
                        
                        {/* Effet de fond */}
                        <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-b from-blue-500/10 to-transparent"></div>

                        <div className="relative">
                            <div className="h-28 w-28 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white text-4xl font-bold mx-auto mb-4 shadow-xl border-4 border-[#030712]">
                                {user.prenom?.[0]}{user.nom?.[0]}
                            </div>
                            <div className="absolute bottom-4 right-1/2 translate-x-10 bg-[#030712] p-1 rounded-full border border-white/10">
                                <ShieldCheck className="w-5 h-5 text-green-400" />
                            </div>
                        </div>

                        <h2 className="text-2xl font-bold text-white">{user.prenom} {user.nom}</h2>
                        
                        <div className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></span>
                            <span className="text-xs font-bold text-blue-300 uppercase tracking-wide">{user.role.replace("_", " ")}</span>
                        </div>
                        
                        <div className="mt-8 border-t border-white/10 pt-6 text-left space-y-4">
                            <p className="text-xs text-gray-500 uppercase font-bold flex items-center gap-2">
                                <Calendar className="w-3 h-3" /> Validité du compte
                            </p>
                            <div className="bg-black/30 p-4 rounded-xl space-y-3 border border-white/5">
                                <div className="flex justify-between text-sm items-center">
                                    <span className="text-gray-400">Début contrat</span>
                                    <span className="text-white font-mono">{user.date_debut_validite ? new Date(user.date_debut_validite).toLocaleDateString() : "N/A"}</span>
                                </div>
                                <div className="w-full h-px bg-white/5"></div>
                                <div className="flex justify-between text-sm items-center">
                                    <span className="text-gray-400">Fin contrat</span>
                                    <span className="text-blue-300 font-bold font-mono">{user.date_fin_validite ? new Date(user.date_fin_validite).toLocaleDateString() : "Indéterminé"}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- COLONNE DROITE : FORMULAIRES --- */}
                <div className="lg:col-span-2 space-y-8">
                    
                    {/* INFO PERSO */}
                    <div className="glass-panel p-8 rounded-2xl border border-white/10">
                        <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                            <User className="w-5 h-5 text-blue-400" /> Informations Personnelles
                        </h3>
                        
                        <form onSubmit={handleUpdateInfo} className="space-y-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block ml-1">Prénom</label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                        <input type="text" className="glass-input w-full pl-10"
                                            value={infoForm.prenom} onChange={e => setInfoForm({...infoForm, prenom: e.target.value})} />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block ml-1">Nom</label>
                                    <input type="text" className="glass-input w-full"
                                        value={infoForm.nom} onChange={e => setInfoForm({...infoForm, nom: e.target.value})} />
                                </div>
                            </div>
                            
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block ml-1">Email Professionnel</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                    <input type="email" disabled value={infoForm.email} className="glass-input w-full pl-10 opacity-60 cursor-not-allowed bg-black/20" />
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs text-orange-400/80 bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/20">
                                        <Lock className="w-3 h-3" /> Fixe
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end pt-4">
                                <button type="submit" disabled={loading} className="btn-neon-blue px-6 py-2.5 rounded-xl font-bold text-white flex items-center gap-2 text-sm shadow-lg">
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    Enregistrer les modifications
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* SÉCURITÉ */}
                    <div className="glass-panel p-8 rounded-2xl border border-red-500/20 bg-red-500/[0.02]">
                        <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                            <KeyRound className="w-5 h-5 text-red-400" /> Sécurité & Mot de passe
                        </h3>
                        
                        <form onSubmit={handleChangePassword} className="space-y-5">
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block ml-1">Mot de passe actuel</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                    <input type="password" placeholder="••••••••" className="glass-input w-full pl-10 focus:border-red-500" required
                                        value={passwords.current} onChange={e => setPasswords({...passwords, current: e.target.value})} />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block ml-1">Nouveau mot de passe</label>
                                    <input type="password" placeholder="Minimum 6 caractères" className="glass-input w-full focus:border-red-500" required minLength={6}
                                        value={passwords.new} onChange={e => setPasswords({...passwords, new: e.target.value})} />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block ml-1">Confirmer</label>
                                    <input type="password" placeholder="Répétez le mot de passe" className="glass-input w-full focus:border-red-500" required minLength={6}
                                        value={passwords.confirm} onChange={e => setPasswords({...passwords, confirm: e.target.value})} />
                                </div>
                            </div>

                            <div className="flex justify-end pt-4">
                                <button type="submit" disabled={loading} className="px-6 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-red-500/20 transition-all flex items-center gap-2">
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                    Mettre à jour le mot de passe
                                </button>
                            </div>
                        </form>
                    </div>

                </div>
            </div>
        </div>
    </div>
  );
}