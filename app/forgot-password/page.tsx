"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, ArrowLeft, Loader2, CheckCircle } from "lucide-react";
import { toast } from "sonner";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (res.ok) {
        setSent(true);
        toast.success("Email envoyé !");
      } else {
        toast.error("Une erreur est survenue.");
      }
    } catch (error) {
      toast.error("Erreur de connexion serveur.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#030712]">
      <div className="glass-panel w-full max-w-md p-8 rounded-2xl shadow-2xl border border-white/10 relative">
        
        <Link href="/login" className="absolute top-6 left-6 text-gray-400 hover:text-white transition">
            <ArrowLeft className="w-5 h-5" />
        </Link>

        <div className="text-center mb-8 mt-4">
            <h1 className="text-2xl font-bold text-white mb-2">Mot de passe oublié ?</h1>
            <p className="text-sm text-gray-400">Recevez un mot de passe temporaire par email.</p>
        </div>

        {!sent ? (
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input 
                        type="email" required 
                        className="glass-input w-full pl-10" 
                        placeholder="votre@email.com"
                        value={email} onChange={(e) => setEmail(e.target.value)} 
                    />
                </div>

                <button type="submit" disabled={loading} className="w-full btn-neon-blue py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2">
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Envoyer le mot de passe"}
                </button>
            </form>
        ) : (
            <div className="text-center space-y-6 animate-fade-in">
                <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto border border-green-500/20">
                    <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
                <div className="bg-white/5 p-4 rounded-xl text-sm text-gray-300">
                    <p>Si cet email existe, vous avez reçu un <strong>mot de passe temporaire</strong>.</p>
                    <p className="mt-2 text-xs text-gray-500">Utilisez-le pour vous connecter, vous pourrez ensuite le changer.</p>
                </div>
                <Link href="/login" className="block w-full btn-neon-blue py-3 rounded-xl font-bold text-white">
                    Retour à la connexion
                </Link>
            </div>
        )}
      </div>
    </div>
  );
}