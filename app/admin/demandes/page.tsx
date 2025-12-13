"use client";

import { useEffect, useState } from "react";
import AdminSidebar from "../../components/AdminSidebar";

interface Demande {
  id_demande: string;
  createdAt: string;
  employe: {
    id_employe: string;
    nom: string;
    prenom: string;
    email: string;
  };
}

export default function AdminDemandes() {
  const [demandes, setDemandes] = useState<Demande[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDemandes = async () => {
    setLoading(true);
    const res = await fetch("/api/demandes");
    if (res.ok) setDemandes(await res.json());
    setLoading(false);
  };

  useEffect(() => {
    fetchDemandes();
  }, []);

  const handleReset = async (demande: Demande) => {
    if (!confirm(`Réinitialiser le mot de passe de ${demande.employe.nom} à "123456" ?`)) return;

    const res = await fetch("/api/demandes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        id_demande: demande.id_demande, 
        id_employe: demande.employe.id_employe 
      }),
    });

    if (res.ok) {
      alert("Mot de passe réinitialisé avec succès !");
      fetchDemandes();
    } else {
      alert("Erreur lors de la réinitialisation");
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-100">
      <AdminSidebar />
      <main className="flex-1 p-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Demandes de mot de passe</h1>

        {loading ? <p>Chargement...</p> : (
          <div className="bg-white shadow rounded-lg overflow-hidden">
            {demandes.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                    ✅ Aucune demande en attente.
                </div>
            ) : (
                <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employé</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                    {demandes.map((d) => (
                    <tr key={d.id_demande} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-500">
                            {new Date(d.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4">
                            <div className="font-bold text-gray-900">{d.employe.nom} {d.employe.prenom}</div>
                            <div className="text-xs text-gray-500">{d.employe.email}</div>
                        </td>
                        <td className="px-6 py-4">
                        <button 
                            onClick={() => handleReset(d)} 
                            className="bg-yellow-100 text-yellow-800 border border-yellow-200 px-3 py-1 rounded text-xs font-bold hover:bg-yellow-200"
                        >
                            Réinitialiser (123456)
                        </button>
                        </td>
                    </tr>
                    ))}
                </tbody>
                </table>
            )}
          </div>
        )}
      </main>
    </div>
  );
}