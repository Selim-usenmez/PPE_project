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

  // Données
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  
  // États pour le changement de mot de passe (Step 3)
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // CRITÈRES DE MOT DE PASSE (Pour l'effet visuel)
  const [criteria, setCriteria] = useState({
    length: false,  // 12 caractères
    upper: false,   // Majuscule
    lower: false,   // Minuscule
    number: false,  // Chiffre
    special: false  // Caractère spécial
  });

  // Vérification en temps réel du mot de passe
  useEffect(() => {
    setCriteria({
      length: newPassword.length >= 12,
      upper: /[A-Z]/.test(newPassword),
      lower: /[a-z]/.test(newPassword),
      number: /[0-9]/.test(newPassword),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(newPassword),
    });
  }, [newPassword]);

  // Est-ce que tout est bon ?
  const isPasswordValid = Object.values(criteria).every(Boolean) && newPassword === confirmPassword;

  // --- ÉTAPE 1 : LOGIN CLASSIQUE ---
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (res.ok) {
        // CAS 1 : Changement de MDP obligatoire
        if (data.requirePasswordChange) {
            setStep(3);
            toast.info("Sécurité : Vous devez changer votre mot de passe.");
        } 
        // CAS 2 : 2FA requis
        else if (data.require2fa) {
            setStep(2);
            toast.success("Code envoyé par email !");
        } 
        // CAS 3 : Connexion directe (Device de confiance)
        else if (data.success) {
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

  // --- ÉTAPE 2 : VÉRIFICATION CODE 2FA ---
  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify-2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: twoFactorCode }),
      });
      const data = await res.json();

      if (res.ok) {
        localStorage.setItem("user_info", JSON.stringify(data.user));
        toast.success("Connexion réussie !");
        router.push("/employe/dashboard");
      } else {
        toast.error(data.error || "Code invalide");
      }
    } catch (error) { toast.error("Erreur serveur"); }
    finally { setLoading(false); }
  };

  // --- ÉTAPE 3 : CHANGEMENT MOT DE PASSE (Avec validation visuelle) ---
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isPasswordValid) {
        return toast.error("Le mot de passe ne respecte pas les critères.");
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/update-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
            email, 
            oldPassword: password, // On utilise le MDP saisi à l'étape 1
            newPassword 
        }),
      });
      
      const data = await res.json();

      if (res.ok) {
        toast.success("Mot de passe mis à jour ! Veuillez vous reconnecter.");
        // On recharge la page pour forcer une reconnexion propre
        window.location.reload();
      } else {
        toast.error(data.error);
      }
    } catch (error) { toast.error("Erreur serveur"); }
    finally { setLoading(false); }
  };

  // Composant visuel pour une ligne de critère
  const RequirementItem = ({ met, text }: { met: boolean, text: string }) => (
    <div className={`flex items-center gap-2 text-xs transition-colors duration-300 ${met ? "text-green-400" : "text-gray-500"}`}>
        {met ? <CheckCircle2 className="w-3.5 h-3.5" /> : <div className="w-3.5 h-3.5 rounded-full border border-gray-600"></div>}
        <span className={met ? "font-bold" : ""}>{text}</span>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#030712] p-4 relative overflow-hidden">
      
      {/* Effets de fond */}
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-[#030712] to-[#030712]"></div>

      <div className="glass-panel w-full max-w-md p-8 rounded-2xl border border-white/10 shadow-2xl relative z-10 animate-fade-in-up">
        
        {/* LOGO / TITRE */}
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

        {/* --- FORMULAIRE ETAPE 1 : LOGIN --- */}
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
                    <div className="flex justify-between items-center ml-1">
                        <label className="text-xs font-bold text-gray-500 uppercase">Mot de passe</label>
                        <Link href="/forgot-password" className="text-xs text-blue-400 hover:text-blue-300 transition">Oublié ?</Link>
                    </div>
                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                        <input type="password" required className="glass-input w-full pl-10" 
                            placeholder="••••••••"
                            value={password} onChange={e => setPassword(e.target.value)} />
                    </div>
                </div>
                <button type="submit" disabled={loading} className="w-full btn-neon-blue py-3 rounded-xl font-bold text-white flex justify-center items-center gap-2 group">
                    {loading ? <Loader2 className="animate-spin" /> : <>Se connecter <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></>}
                </button>
            </form>
        )}

        {/* --- FORMULAIRE ETAPE 2 : 2FA --- */}
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

        {/* --- FORMULAIRE ETAPE 3 : CHANGEMENT MDP OBLIGATOIRE --- */}
        {step === 3 && (
            <form onSubmit={handleChangePassword} className="space-y-5">
                <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-xl flex gap-3 items-start">
                    <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-yellow-200/80 leading-relaxed">
                        C'est votre première connexion ou une réinitialisation. Veuillez définir un nouveau mot de passe sécurisé pour continuer.
                    </p>
                </div>

                {/* Champ Nouveau MDP */}
                <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase ml-1">Nouveau mot de passe</label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input 
                            type={showPassword ? "text" : "password"} 
                            required 
                            className="glass-input w-full pl-9 pr-10 focus:border-blue-500" 
                            placeholder="Nouveau mot de passe"
                            value={newPassword} 
                            onChange={e => setNewPassword(e.target.value)} 
                        />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
                            {showPassword ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                        </button>
                    </div>
                </div>

                {/* Indicateurs Visuels de Force */}
                <div className="bg-black/20 p-3 rounded-xl border border-white/5 space-y-2">
                    <p className="text-[10px] uppercase font-bold text-gray-500 mb-2">Critères de sécurité :</p>
                    <div className="grid grid-cols-2 gap-y-1 gap-x-2">
                        <RequirementItem met={criteria.length} text="12 caractères min." />
                        <RequirementItem met={criteria.upper} text="1 Majuscule" />
                        <RequirementItem met={criteria.lower} text="1 Minuscule" />
                        <RequirementItem met={criteria.number} text="1 Chiffre" />
                        <RequirementItem met={criteria.special} text="1 Caractère spécial" />
                    </div>
                </div>

                {/* Champ Confirmation */}
                <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase ml-1">Confirmer</label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input 
                            type="password" 
                            required 
                            className={`glass-input w-full pl-9 ${confirmPassword && confirmPassword !== newPassword ? 'border-red-500 focus:border-red-500' : ''}`} 
                            placeholder="Répétez le mot de passe"
                            value={confirmPassword} 
                            onChange={e => setConfirmPassword(e.target.value)} 
                        />
                    </div>
                    {confirmPassword && confirmPassword !== newPassword && (
                        <p className="text-xs text-red-400 mt-1 flex items-center gap-1"><X className="w-3 h-3"/> Les mots de passe ne correspondent pas</p>
                    )}
                </div>

                <button 
                    type="submit" 
                    disabled={loading || !isPasswordValid} 
                    className="w-full btn-neon-blue py-3 rounded-xl font-bold text-white flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                    {loading ? <Loader2 className="animate-spin" /> : "Mettre à jour & Accéder"}
                </button>
            </form>
        )}

      </div>
    </div>
  );
}