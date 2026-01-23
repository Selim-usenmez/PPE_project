"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { 
  Loader2, Mail, Lock, ShieldCheck, ArrowRight, 
  Check, X, AlertTriangle, Eye, EyeOff, CheckCircle2 
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  
  // États de navigation
  const [step, setStep] = useState<1 | 2 | 3>(1); // 1=Login, 2=2FA, 3=ChangePassword
  const [loading, setLoading] = useState(false);

  // Données Login
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false); // 👈 État pour la checkbox
  const [showLoginPassword, setShowLoginPassword] = useState(false); // 👈 État pour voir le MDP login

  // Données 2FA
  const [twoFactorCode, setTwoFactorCode] = useState("");
  
  // Données Changement MDP
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false); // Pour l'étape 3

  // CRITÈRES DE MOT DE PASSE (Step 3)
  const [criteria, setCriteria] = useState({
    length: false, upper: false, lower: false, number: false, special: false
  });

  useEffect(() => {
    setCriteria({
      length: newPassword.length >= 12,
      upper: /[A-Z]/.test(newPassword),
      lower: /[a-z]/.test(newPassword),
      number: /[0-9]/.test(newPassword),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(newPassword),
    });
  }, [newPassword]);

  const isPasswordValid = Object.values(criteria).every(Boolean) && newPassword === confirmPassword;

  // --- ÉTAPE 1 : LOGIN ---
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
            email, 
            password,
            rememberMe // 👈 On envoie l'info au backend
        }),
      });
      const data = await res.json();

      if (res.ok) {
        if (data.requirePasswordChange) {
            setStep(3);
            toast.info("Sécurité : Changement de mot de passe requis.");
        } else if (data.require2fa) {
            setStep(2);
            toast.success("Code envoyé par email !");
        } else if (data.success) {
            localStorage.setItem("user_info", JSON.stringify(data));
            toast.success(`Bon retour, ${data.prenom} !`);
            router.push("/employe/dashboard");
        }
      } else {
        toast.error(data.error || "Erreur connexion");
      }
    } catch (error) { toast.error("Erreur serveur"); }
    finally { setLoading(false); }
  };

  // --- ÉTAPE 2 : 2FA ---
  // --- ÉTAPE 2 : VÉRIFICATION CODE 2FA ---
  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify-2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
            email, 
            code: twoFactorCode,
            rememberMe // 👈 IMPORTANT : On transmet le choix de l'utilisateur
        }),
      });
      const data = await res.json();

      if (res.ok) {
        // On stocke aussi dans le localStorage pour l'affichage facile côté client
        localStorage.setItem("user_info", JSON.stringify(data.user));
        toast.success("Connexion réussie !");
        
        // Petit délai pour laisser le temps au cookie de s'écrire
        setTimeout(() => {
            router.push("/employe/dashboard");
            router.refresh(); // Force le rafraîchissement pour que le Middleware voie le cookie
        }, 500);
        
      } else {
        toast.error(data.error || "Code invalide");
      }
    } catch (error) { toast.error("Erreur serveur"); }
    finally { setLoading(false); }
  };

  // --- ÉTAPE 3 : UPDATE MDP ---
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPasswordValid) return toast.error("Critères non respectés.");

    setLoading(true);
    try {
      const res = await fetch("/api/auth/update-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, oldPassword: password, newPassword }),
      });
      const data = await res.json();

      if (res.ok) {
        toast.success("Mot de passe mis à jour ! Reconnectez-vous.");
        window.location.reload();
      } else {
        toast.error(data.error);
      }
    } catch (error) { toast.error("Erreur serveur"); }
    finally { setLoading(false); }
  };

  const RequirementItem = ({ met, text }: { met: boolean, text: string }) => (
    <div className={`flex items-center gap-2 text-xs transition-colors duration-300 ${met ? "text-green-400" : "text-gray-500"}`}>
        {met ? <CheckCircle2 className="w-3.5 h-3.5" /> : <div className="w-3.5 h-3.5 rounded-full border border-gray-600"></div>}
        <span className={met ? "font-bold" : ""}>{text}</span>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#030712] p-4 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-[#030712] to-[#030712]"></div>

      <div className="glass-panel w-full max-w-md p-8 rounded-2xl border border-white/10 shadow-2xl relative z-10 animate-fade-in-up">
        
        <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-600/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-500/30 shadow-[0_0_15px_rgba(37,99,235,0.3)]">
                <ShieldCheck className="w-8 h-8 text-blue-500" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">NexusPharm Access</h1>
            <p className="text-sm text-gray-400 mt-1">
                {step === 1 && "Portail Employé Sécurisé"}
                {step === 2 && "Double Authentification"}
                {step === 3 && "Sécurisation du Compte"}
            </p>
        </div>

        {/* --- FORMULAIRE 1 : LOGIN --- */}
        {step === 1 && (
            <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase ml-1">Email Professionnel</label>
                    <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                        <input type="email" required className="glass-input w-full pl-10" 
                            placeholder="nom@nexuspharm.com"
                            value={email} onChange={e => setEmail(e.target.value)} />
                    </div>
                </div>

                <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase ml-1">Mot de passe</label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                        
                        {/* 👇 INPUT AVEC BOUTON OEIL */}
                        <input 
                            type={showLoginPassword ? "text" : "password"} 
                            required 
                            className="glass-input w-full pl-10 pr-10" 
                            placeholder="••••••••"
                            value={password} onChange={e => setPassword(e.target.value)} 
                        />
                        <button 
                            type="button"
                            onClick={() => setShowLoginPassword(!showLoginPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-blue-400 transition"
                        >
                            {showLoginPassword ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                        </button>
                    </div>
                </div>

                {/* 👇 CHECKBOX + LIEN OUBLIÉ */}
                <div className="flex justify-between items-center text-sm">
                    <label className="flex items-center gap-2 cursor-pointer group">
                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${rememberMe ? "bg-blue-600 border-blue-600" : "border-gray-600 bg-transparent"}`}>
                            {rememberMe && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <input type="checkbox" className="hidden" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} />
                        <span className={`text-xs ${rememberMe ? "text-blue-400" : "text-gray-500"} group-hover:text-blue-300 transition`}>Se souvenir de moi (30j)</span>
                    </label>
                    <Link href="/forgot-password" className="text-xs text-blue-500 hover:text-blue-400 transition font-medium">Mot de passe oublié ?</Link>
                </div>

                <button type="submit" disabled={loading} className="w-full btn-neon-blue py-3 rounded-xl font-bold text-white flex justify-center items-center gap-2 group">
                    {loading ? <Loader2 className="animate-spin" /> : <>Se connecter <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></>}
                </button>
            </form>
        )}

        {/* --- FORMULAIRE 2 : 2FA --- */}
        {step === 2 && (
            <form onSubmit={handleVerify2FA} className="space-y-6">
                <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl text-sm text-blue-200 text-center">
                    Un code à 6 chiffres a été envoyé à <strong>{email}</strong>
                </div>
                <div className="text-center">
                    <input 
                        type="text" maxLength={6} required 
                        className="bg-[#0f172a] border-2 border-white/10 rounded-xl w-40 text-center text-3xl tracking-[0.5em] py-3 font-mono text-white focus:border-blue-500 outline-none transition-all"
                        placeholder="000000"
                        value={twoFactorCode} onChange={e => setTwoFactorCode(e.target.value.replace(/\D/g,''))} 
                    />
                </div>
                <button type="submit" disabled={loading} className="w-full btn-neon-blue py-3 rounded-xl font-bold text-white flex justify-center items-center gap-2">
                    {loading ? <Loader2 className="animate-spin" /> : "Vérifier le code"}
                </button>
                <button type="button" onClick={() => setStep(1)} className="w-full text-sm text-gray-500 hover:text-white transition">Retour</button>
            </form>
        )}

        {/* --- FORMULAIRE 3 : CHANGEMENT MDP --- */}
        {step === 3 && (
            <form onSubmit={handleChangePassword} className="space-y-5">
                <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-xl flex gap-3 items-start">
                    <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-yellow-200/80 leading-relaxed">
                        Première connexion : Définissez un nouveau mot de passe.
                    </p>
                </div>

                <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase ml-1">Nouveau mot de passe</label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input 
                            type={showNewPassword ? "text" : "password"} 
                            required 
                            className="glass-input w-full pl-9 pr-10 focus:border-blue-500" 
                            placeholder="Nouveau mot de passe"
                            value={newPassword} 
                            onChange={e => setNewPassword(e.target.value)} 
                        />
                        <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
                            {showNewPassword ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                        </button>
                    </div>
                </div>

                <div className="bg-black/20 p-3 rounded-xl border border-white/5 space-y-2">
                    <div className="grid grid-cols-2 gap-y-1 gap-x-2">
                        <RequirementItem met={criteria.length} text="12 char." />
                        <RequirementItem met={criteria.upper} text="1 Majuscule" />
                        <RequirementItem met={criteria.lower} text="1 Minuscule" />
                        <RequirementItem met={criteria.number} text="1 Chiffre" />
                        <RequirementItem met={criteria.special} text="1 Spécial" />
                    </div>
                </div>

                <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase ml-1">Confirmer</label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input 
                            type="password" 
                            required 
                            className={`glass-input w-full pl-9 ${confirmPassword && confirmPassword !== newPassword ? 'border-red-500' : ''}`} 
                            placeholder="Répétez le mot de passe"
                            value={confirmPassword} 
                            onChange={e => setConfirmPassword(e.target.value)} 
                        />
                    </div>
                </div>

                <button type="submit" disabled={loading || !isPasswordValid} className="w-full btn-neon-blue py-3 rounded-xl font-bold text-white flex justify-center items-center gap-2 disabled:opacity-50">
                    {loading ? <Loader2 className="animate-spin" /> : "Mettre à jour & Accéder"}
                </button>
            </form>
        )}

      </div>
    </div>
  );
}