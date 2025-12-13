"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  // Analyse en temps réel de la force du mot de passe
  const checks = {
    length: password.length >= 12,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  };
  
  // Le mot de passe est valide seulement si TOUS les checks sont vrais
  const isValid = Object.values(checks).every(Boolean);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Double vérification côté client
    if (password !== confirm) {
        setMsg("❌ Les mots de passe ne correspondent pas.");
        return;
    }
    if (!isValid) {
        setMsg("❌ Le mot de passe ne respecte pas les critères de sécurité.");
        return;
    }

    setLoading(true);
    setMsg("");

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (res.ok) {
        setMsg("✅ Mot de passe modifié avec succès ! Redirection...");
        setTimeout(() => router.push("/"), 2000); // Retour au login
      } else {
        setMsg("❌ " + data.error);
      }
    } catch (error) {
      setMsg("❌ Erreur réseau. Vérifiez votre connexion.");
    } finally {
      setLoading(false);
    }
  };

  if (!token) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-red-600 font-bold bg-white p-6 rounded shadow">
            ⚠️ Lien invalide ou incomplet (Token manquant).
        </p>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md border-t-4 border-blue-600">
        <h1 className="text-2xl font-bold text-gray-800 mb-2 text-center">Nouveau mot de passe</h1>
        <p className="text-sm text-gray-500 mb-6 text-center">Choisissez un mot de passe fort pour sécuriser votre compte.</p>
        
        {msg && (
            <div className={`mb-4 p-3 rounded text-sm text-center font-bold ${msg.startsWith("✅") ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                {msg}
            </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          
          {/* CHAMP MOT DE PASSE */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Nouveau mot de passe</label>
            <input 
                type="password" 
                required 
                className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none transition"
                placeholder="••••••••••••"
                value={password} 
                onChange={e => setPassword(e.target.value)} 
            />
          </div>
          
          {/* INDICATEURS VISUELS (Strength Meter) */}
          <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
            <p className="text-xs font-bold text-gray-500 mb-2 uppercase">Critères de sécurité :</p>
            <div className="text-xs space-y-1">
                <CheckItem valid={checks.length} label="12 caractères minimum" />
                <CheckItem valid={checks.upper} label="Au moins une Majuscule (A-Z)" />
                <CheckItem valid={checks.lower} label="Au moins une Minuscule (a-z)" />
                <CheckItem valid={checks.number} label="Au moins un Chiffre (0-9)" />
                <CheckItem valid={checks.special} label="Au moins un Caractère spécial (!@#...)" />
            </div>
          </div>

          {/* CHAMP CONFIRMATION */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Confirmer le mot de passe</label>
            <input 
                type="password" 
                required 
                className={`w-full border p-2 rounded focus:ring-2 outline-none transition ${
                    confirm && password !== confirm ? "border-red-500 focus:ring-red-500" : "focus:ring-blue-500"
                }`}
                placeholder="Répétez le mot de passe"
                value={confirm} 
                onChange={e => setConfirm(e.target.value)} 
            />
            {confirm && password !== confirm && (
                <p className="text-xs text-red-500 mt-1">Les mots de passe ne correspondent pas.</p>
            )}
          </div>

          <button 
            type="submit" 
            disabled={loading || !isValid || password !== confirm}
            className="w-full bg-blue-600 text-white font-bold py-3 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {loading ? "Mise à jour en cours..." : "Valider et se connecter"}
          </button>
        </form>
      </div>
    </div>
  );
}

// Petit composant visuel pour les lignes de critères
function CheckItem({ valid, label }: { valid: boolean, label: string }) {
    return (
        <div className={`flex items-center gap-2 transition-colors duration-300 ${valid ? "text-green-600" : "text-gray-400"}`}>
            <span className={`flex items-center justify-center w-4 h-4 rounded-full text-[10px] ${valid ? "bg-green-100" : "bg-gray-200"}`}>
                {valid ? "✓" : "•"}
            </span>
            <span className={valid ? "font-bold" : ""}>{label}</span>
        </div>
    );
}

// Obligatoire pour useSearchParams dans Next.js
export default function ResetPasswordPage() {
    return (
        <Suspense fallback={<div className="p-10 text-center">Chargement de l'interface...</div>}>
            <ResetPasswordForm />
        </Suspense>
    );
}