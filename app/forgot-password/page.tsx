"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage({ type: 'success', text: "✅ Email envoyé ! Vérifiez votre boîte de réception." });
        setEmail(""); 
      } else {
        setMessage({ type: 'error', text: "❌ " + (data.error || "Erreur inconnue") });
      }
    } catch (error) {
      setMessage({ type: 'error', text: "❌ Erreur de connexion au serveur." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      
      {/* Carte Glassmorphism */}
      <div className="glass-panel w-full max-w-md p-8 rounded-2xl animate-fade-in shadow-[0_0_50px_rgba(0,0,0,0.5)]">
        
        <div className="text-center mb-8">
            <div className="text-4xl mb-4">🔑</div>
            <h1 className="text-2xl font-bold text-white mb-2">Mot de passe oublié ?</h1>
            <p className="text-sm text-gray-400">
                Entrez votre email professionnel. Nous vous enverrons un lien sécurisé pour le réinitialiser.
            </p>
        </div>

        {message && (
          <div className={`mb-6 p-4 rounded-xl text-sm font-bold text-center border ${
            message.type === 'success' 
            ? 'bg-green-500/20 text-green-300 border-green-500/30' 
            : 'bg-red-500/20 text-red-300 border-red-500/30'
          }`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-2 ml-1">Email professionnel</label>
            <input 
              type="email" 
              required 
              placeholder="exemple@chartreux.com"
              className="glass-input w-full placeholder-gray-600"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full btn-neon-blue font-bold py-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition flex justify-center items-center gap-2"
          >
            {loading ? (
                <>
                    <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
                    Envoi...
                </>
            ) : "Recevoir le lien"}
          </button>
        </form>

        <div className="mt-8 text-center border-t border-white/10 pt-6">
          <Link href="/login" className="text-sm text-gray-400 hover:text-white transition-colors flex items-center justify-center gap-2">
            <span>←</span> Retour à la connexion
          </Link>
        </div>
      </div>
    </div>
  );
}