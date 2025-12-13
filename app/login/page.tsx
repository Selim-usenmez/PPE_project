"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  
  // État pour savoir si on est à l'étape 1 (Email/Mdp) ou 2 (Code)
  const [step, setStep] = useState<1 | 2>(1);
  
  const [form, setForm] = useState({ email: "", password: "" });
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  // ÉTAPE 1 : ENVOI EMAIL + MDP
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      
      // Sécurité : Vérifier le type de contenu retourné
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
         throw new Error("Le serveur ne répond pas correctement (Erreur API).");
      }

      const data = await res.json();

      if (res.ok && data.require2fa) {
        toast.success("Identifiants valides. Code envoyé par email ! 📧");
        setStep(2); // On passe à l'écran du code
      } else {
        toast.error(data.error || "Erreur de connexion");
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Erreur réseau");
    } finally {
      setLoading(false);
    }
  };

  // ÉTAPE 2 : VÉRIFICATION DU CODE
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

      console.log("Réponse API reçue :", data);

      if (res.ok) {
        toast.success(`Bienvenue ${data.user.prenom} ! 🚀`);
        
        // Stockage des infos pour l'affichage (important)
        localStorage.setItem("user_info", JSON.stringify(data.user));

        // Redirection
        if (data.user.role === "ADMIN") {
            window.location.href = "/admin/dashboard";
        } else {
            window.location.href = "/employe/dashboard";
        }
    
      } else {
        toast.error(data.error || "Code invalide");
      }
    } catch (err) {
      console.error(err);
      toast.error("Erreur réseau lors de la vérification");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      {/* Container en verre */}
      <div className="glass-panel w-full max-w-md p-8 rounded-2xl animate-fade-in shadow-[0_0_40px_rgba(0,0,0,0.5)]">
        
        <div className="text-center mb-8">
            <div className="text-4xl mb-2">🔐</div>
            <h1 className="text-3xl font-bold text-white mb-2">
                {step === 1 ? "Connexion PPE" : "Vérification 2FA"}
            </h1>
            <p className="text-gray-400 text-sm">
                {step === 1 ? "Accédez à votre espace sécurisé" : "Sécurité renforcée activée"}
            </p>
        </div>

        {step === 1 ? (
            // --- FORMULAIRE ETAPE 1 (Email/Mdp) ---
            <form onSubmit={handleLogin} className="space-y-5">
                <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1 ml-1">Email</label>
                    <input
                    type="email" required
                    className="glass-input w-full"
                    placeholder="exemple@chartreux.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    />
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1 ml-1">Mot de passe</label>
                    <input
                    type="password" required
                    className="glass-input w-full"
                    placeholder="••••••••"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    />
                </div>
                
                <button
                    type="submit" disabled={loading}
                    className="w-full btn-neon-blue py-3 rounded-xl font-bold text-lg transition disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                >
                    {loading ? "Vérification..." : "Se connecter"}
                </button>
                
                <div className="text-center mt-4">
                    <Link href="/forgot-password" className="text-sm text-blue-400 hover:text-blue-300 transition-colors hover:underline">
                        Mot de passe oublié ?
                    </Link>
                </div>
            </form>
        ) : (
            // --- FORMULAIRE ETAPE 2 (CODE) ---
            <form onSubmit={handleVerifyCode} className="space-y-6">
                <div className="bg-blue-500/10 border border-blue-500/20 p-3 rounded-lg text-center">
                    <p className="text-sm text-blue-200">
                        Un code à 6 chiffres a été envoyé à <br/>
                        <strong className="text-white font-mono">{form.email}</strong>
                    </p>
                </div>
                
                <div>
                    <label className="block text-center text-xs font-bold text-gray-400 uppercase mb-2">Code de sécurité</label>
                    <input
                        type="text" 
                        maxLength={6}
                        placeholder="123456"
                        className="glass-input w-full text-center text-3xl tracking-[0.5em] font-mono py-3 focus:border-blue-400"
                        value={code}
                        onChange={(e) => setCode(e.target.value.replace(/\D/g,''))} // Que des chiffres
                        autoFocus
                    />
                </div>

                <button
                    type="submit" disabled={loading || code.length < 6}
                    className="w-full btn-neon-blue py-3 rounded-xl font-bold text-lg transition disabled:opacity-50 mt-2"
                >
                    {loading ? "Validation..." : "Vérifier le code"}
                </button>

                <button 
                    type="button"
                    onClick={() => setStep(1)}
                    className="w-full text-gray-500 text-sm hover:text-white transition py-2"
                >
                    ← Retour
                </button>
            </form>
        )}
      </div>
    </div>
  );
}