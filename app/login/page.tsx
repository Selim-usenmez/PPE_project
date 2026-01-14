"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import { Mail, Lock, Eye, EyeOff, ShieldCheck, KeyRound, ArrowRight, Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  
  // États de navigation
  const [step, setStep] = useState<1 | 2 | 3>(1); // 1: Login, 2: 2FA, 3: Reset Force
  const [loading, setLoading] = useState(false);
  
  // États de formulaire
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ email: "", password: "" });
  const [code, setCode] = useState("");
  const [newPass, setNewPass] = useState({ old: "", new: "", confirm: "" });

  // ÉTAPE 1 : Connexion
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (res.ok) {
        if (data.requirePasswordChange) {
            toast.info("Première connexion : Vous devez définir votre mot de passe.");
            setStep(3);
        } else if (data.require2fa) {
            toast.success("Identifiants valides. Code envoyé ! 📧");
            setStep(2);
        }
      } else {
        toast.error(data.error || "Erreur de connexion");
      }
    } catch (err) { toast.error("Erreur serveur"); } 
    finally { setLoading(false); }
  };

  // ÉTAPE 2 : Vérification 2FA
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify-2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email, code }),
      });
      const data = await res.json();

      if (res.ok) {
        toast.success(`Bienvenue ${data.prenom} ! 🚀`);
        localStorage.setItem("user_info", JSON.stringify(data));
        
        if (data.role === "ADMIN") router.push("/admin/dashboard");
        else router.push("/employe/dashboard");
      } else {
        toast.error(data.error || "Code invalide");
      }
    } catch (err) { toast.error("Erreur serveur"); } 
    finally { setLoading(false); }
  };

  // ÉTAPE 3 : Changement Mot de Passe
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPass.new !== newPass.confirm) return toast.error("Les mots de passe ne correspondent pas");
    
    setLoading(true);
    try {
        const res = await fetch("/api/auth/update-password", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                email: form.email,
                oldPassword: newPass.old,
                newPassword: newPass.new
            })
        });
        
        if (res.ok) {
            toast.success("Mot de passe mis à jour ! Veuillez vous reconnecter.");
            setStep(1); // Retour case départ
            setForm({...form, password: ""});
            setNewPass({old:"", new:"", confirm:""});
        } else {
            const d = await res.json();
            toast.error(d.error);
        }
    } catch (err) { toast.error("Erreur serveur"); } 
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#030712]">
      <div className="glass-panel w-full max-w-md p-8 rounded-2xl shadow-2xl border border-white/10 relative overflow-hidden">
        
        {/* Header Icone */}
        <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-500/10 mb-4 border border-blue-500/20">
                {step === 2 ? <ShieldCheck className="w-8 h-8 text-blue-400" /> : <Lock className="w-8 h-8 text-blue-400" />}
            </div>
            <h1 className="text-2xl font-bold text-white mb-1">
                {step === 1 ? "Connexion PPE" : step === 2 ? "Vérification 2FA" : "Sécurisation Compte"}
            </h1>
        </div>

        {/* --- STEP 1: EMAIL / PASSWORD --- */}
        {step === 1 && (
            <form onSubmit={handleLogin} className="space-y-5 animate-fade-in">
                <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input 
                        type="email" required 
                        className="glass-input w-full pl-10" 
                        placeholder="Email professionnel"
                        value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} 
                    />
                </div>
                
                <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input 
                        type={showPassword ? "text" : "password"} required 
                        className="glass-input w-full pl-10 pr-10" 
                        placeholder="Mot de passe"
                        value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} 
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition p-1">
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                </div>

                <button type="submit" disabled={loading} className="w-full btn-neon-blue py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all">
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Se connecter <ArrowRight className="w-4 h-4" /></>}
                </button>
                
                <div className="text-center mt-4">
                    <Link href="/forgot-password" className="text-sm text-blue-400 hover:text-blue-300 hover:underline transition">
                        Mot de passe oublié ?
                    </Link>
                </div>
            </form>
        )}

        {/* --- STEP 2: CODE 2FA --- */}
        {step === 2 && (
            <form onSubmit={handleVerifyCode} className="space-y-6 animate-fade-in">
                <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl text-center">
                    <p className="text-sm text-blue-200">Code envoyé à <strong className="text-white block mt-1">{form.email}</strong></p>
                </div>
                
                <input type="text" maxLength={6} placeholder="000000" autoFocus 
                    className="glass-input w-full text-center text-3xl tracking-[0.5em] font-mono py-4 focus:border-blue-400"
                    value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g,''))} />
                
                <button type="submit" disabled={loading || code.length < 6} className="w-full btn-neon-blue py-3 rounded-xl font-bold text-white flex justify-center items-center gap-2">
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Vérifier <ShieldCheck className="w-4 h-4" /></>}
                </button>
            </form>
        )}

        {/* --- STEP 3: RESET FORCE --- */}
        {step === 3 && (
            <form onSubmit={handleChangePassword} className="space-y-4 animate-fade-in">
                <div className="bg-yellow-500/10 p-4 rounded-xl border border-yellow-500/20 mb-4 flex gap-3 items-start">
                    <KeyRound className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-yellow-200 leading-relaxed">Pour votre sécurité, remplacez le mot de passe temporaire.</p>
                </div>
                
                <div className="space-y-3">
                    <input type="password" required className="glass-input w-full text-sm" placeholder="Mot de passe actuel (reçu par mail)"
                        value={newPass.old} onChange={e => setNewPass({...newPass, old: e.target.value})} />
                    
                    <div className="relative">
                        <input type={showPassword ? "text" : "password"} required className="glass-input w-full text-sm pr-10" placeholder="Nouveau mot de passe"
                            value={newPass.new} onChange={e => setNewPass({...newPass, new: e.target.value})} />
                        <button type="button" onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-1">
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                    </div>

                    <input type="password" required className="glass-input w-full text-sm" placeholder="Confirmer le nouveau"
                        value={newPass.confirm} onChange={e => setNewPass({...newPass, confirm: e.target.value})} />
                </div>
                
                <button type="submit" disabled={loading} className="w-full btn-neon-blue py-3 rounded-xl font-bold text-white mt-2">
                    Mettre à jour & Accéder
                </button>
            </form>
        )}
      </div>
    </div>
  );
}