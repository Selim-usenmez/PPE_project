"use client";

import { useEffect, useState } from "react";
import AdminSidebar from "../../components/AdminSidebar";
import { toast } from "sonner";
// 👇 Imports Icônes Pro
import { KeyRound, Clock, CheckCircle2, XCircle, User, Mail, Loader2, ShieldAlert } from "lucide-react";

interface Demande {
  id_demande: string;
  createdAt: string;
  employe: {
    id_employe: string;
    nom: string;
    prenom: string;
    email: string;
    role: string;
  };
}

export default function AdminDemandes() {
  const [demandes, setDemandes] = useState<Demande[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null); // Pour savoir quelle ligne charge

  // Charger les demandes
  const fetchDemandes = async () => {
    try {
      const res = await fetch("/api/demandes");
      if (res.ok) setDemandes(await res.json());
    } catch (e) {
      toast.error("Erreur de chargement");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDemandes();
  }, []);

  // ✅ ACCEPTER : Génère un MDP et l'envoie par mail (via ton API existante)
  const handleApprove = async (demande: Demande) => {
    if (!confirm(`Générer un nouveau mot de passe pour ${demande.employe.prenom} et l'envoyer par email ?`)) return;

    setActionLoading(demande.id_demande);
    try {
      // 1. On appelle l'API de reset sécurisé (celle qu'on a créée avant)
      const resReset = await fetch("/api/employes/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_employe: demande.employe.id_employe }),
      });

      if (!resReset.ok) throw new Error("Erreur lors du reset");

      // 2. On supprime la demande de la liste (via l'API demandes avec DELETE)
      // (Supposons que ton API DELETE /api/demandes?id=... existe, sinon il faudra la créer)
      await fetch(`/api/demandes?id=${demande.id_demande}`, { method: "DELETE" });

      toast.success("Mot de passe réinitialisé et envoyé par email ! 📧");
      setDemandes(prev => prev.filter(d => d.id_demande !== demande.id_demande));

    } catch (e) {
      toast.error("Une erreur est survenue.");
    } finally {
      setActionLoading(null);
    }
  };

  // ❌ REFUSER : Supprime juste la demande sans rien changer
  const handleReject = async (id_demande: string) => {
    if (!confirm("Supprimer cette demande sans changer le mot de passe ?")) return;

    setActionLoading(id_demande);
    try {
      const res = await fetch(`/api/demandes?id=${id_demande}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Demande ignorée et supprimée.");
        setDemandes(prev => prev.filter(d => d.id_demande !== id_demande));
      } else {
        toast.error("Erreur serveur");
      }
    } catch (e) {
      toast.error("Erreur connexion");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#030712] text-gray-200">
      <AdminSidebar />
      
      <main className="ml-64 p-8 animate-fade-in">
        {/* EN-TÊTE */}
        <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-yellow-500/10 rounded-xl border border-yellow-500/20 text-yellow-500">
                <KeyRound className="w-6 h-6" />
            </div>
            <div>
                <h1 className="text-3xl font-bold text-white">Demandes de Réinitialisation</h1>
                <p className="text-gray-400 text-sm">Employés ayant signalé un oubli de mot de passe.</p>
            </div>
        </div>

        <div className="mt-8">
          {loading ? (
             <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-3" />
                <p className="text-gray-500 font-mono text-sm">Chargement des demandes...</p>
             </div>
          ) : (
            <div className="glass-panel rounded-2xl overflow-hidden border border-white/10 shadow-xl">
              {demandes.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                      <CheckCircle2 className="w-12 h-12 mb-3 text-green-500/50" />
                      <p className="text-lg font-medium text-white">Tout est en ordre !</p>
                      <p className="text-sm">Aucune demande de mot de passe en attente.</p>
                  </div>
              ) : (
                  <table className="min-w-full text-left">
                    <thead className="bg-white/5 border-b border-white/10 text-gray-400 text-xs uppercase font-semibold">
                        <tr>
                        <th className="px-6 py-4">Date demande</th>
                        <th className="px-6 py-4">Demandeur</th>
                        <th className="px-6 py-4">Rôle</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {demandes.map((d) => (
                        <tr key={d.id_demande} className="hover:bg-white/5 transition group">
                            <td className="px-6 py-4">
                                <div className="flex items-center gap-2 text-gray-400 text-sm font-mono">
                                    <Clock className="w-4 h-4" />
                                    {new Date(d.createdAt).toLocaleDateString()}
                                </div>
                            </td>
                            <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center font-bold text-white text-xs">
                                        {d.employe.prenom[0]}{d.employe.nom[0]}
                                    </div>
                                    <div>
                                        <div className="font-bold text-white text-sm">{d.employe.prenom} {d.employe.nom}</div>
                                        <div className="text-xs text-gray-500 flex items-center gap-1">
                                            <Mail className="w-3 h-3" /> {d.employe.email}
                                        </div>
                                    </div>
                                </div>
                            </td>
                            <td className="px-6 py-4">
                                <span className="px-2.5 py-1 rounded-md text-[10px] font-bold border uppercase tracking-wider bg-slate-500/10 border-slate-500/20 text-slate-300">
                                    {d.employe.role || "EMPLOYE"}
                                </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                    {/* BOUTON REFUSER */}
                                    <button 
                                        onClick={() => handleReject(d.id_demande)}
                                        disabled={actionLoading === d.id_demande}
                                        className="p-2 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/20 transition disabled:opacity-50"
                                        title="Ignorer / Supprimer"
                                    >
                                        <XCircle className="w-5 h-5" />
                                    </button>

                                    {/* BOUTON ACCEPTER */}
                                    <button 
                                        onClick={() => handleApprove(d)} 
                                        disabled={actionLoading === d.id_demande}
                                        className="btn-neon-blue px-4 py-2 rounded-lg font-bold text-white text-xs flex items-center gap-2 shadow-lg disabled:opacity-50"
                                    >
                                        {actionLoading === d.id_demande ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldAlert className="w-4 h-4" />}
                                        Reset & Envoyer Email
                                    </button>
                                </div>
                            </td>
                        </tr>
                        ))}
                    </tbody>
                  </table>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}