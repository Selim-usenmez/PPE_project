"use client";

import { useEffect, useState } from "react";
import AdminSidebar from "../../components/AdminSidebar";
import { toast } from "sonner";

export default function AdminEmployesPage() {
  const [employes, setEmployes] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [form, setForm] = useState({
    id_employe: "",
    nom: "", prenom: "", email: "", role: "DEVELOPPEUR", // Valeur par défaut sûre
    password: "", dateDebut: "", dateFin: ""
  });

  useEffect(() => { loadEmployes(); }, []);
  const loadEmployes = async () => { const res = await fetch("/api/employes"); if (res.ok) setEmployes(await res.json()); };

  const openCreate = () => { setForm({ id_employe: "", nom: "", prenom: "", email: "", role: "DEVELOPPEUR", password: "", dateDebut: "", dateFin: "" }); setIsEditing(false); setIsModalOpen(true); };
  
  const openEdit = (emp: any) => {
    setForm({
      id_employe: emp.id_employe,
      nom: emp.nom, prenom: emp.prenom, email: emp.email, role: emp.role,
      password: "",
      dateDebut: emp.date_debut_validite ? new Date(emp.date_debut_validite).toISOString().split('T')[0] : "",
      dateFin: emp.date_fin_validite ? new Date(emp.date_fin_validite).toISOString().split('T')[0] : ""
    });
    setIsEditing(true); setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const method = isEditing ? "PUT" : "POST";
    const res = await fetch("/api/employes", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    if (res.ok) { toast.success(isEditing ? "Employé modifié" : "Employé créé"); setIsModalOpen(false); loadEmployes(); }
    else { const data = await res.json(); toast.error(data.error); }
  };

  const handleDelete = async () => {
    if(!confirmDeleteId) return;
    await fetch(`/api/employes?id=${confirmDeleteId}`, { method: "DELETE" });
    toast.success("Employé supprimé"); loadEmployes(); setConfirmDeleteId(null);
  };

  return (
    <div className="min-h-screen text-gray-200">
      <AdminSidebar />
      <main className="ml-64 p-8 animate-fade-in">
        <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-white">Employés & Rôles</h1>
            <button onClick={openCreate} className="btn-neon-blue px-4 py-2 rounded-lg font-bold">+ Nouvel Employé</button>
        </div>
        
        <div className="glass-panel rounded-2xl overflow-hidden">
            <table className="min-w-full text-left">
                <thead className="bg-white/5 border-b border-white/10 text-gray-400 text-xs uppercase">
                    <tr><th className="px-6 py-3">Nom</th><th className="px-6 py-3">Rôle</th><th className="px-6 py-3">Validité</th><th className="px-6 py-3 text-right">Actions</th></tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                    {employes.map(emp => (
                        <tr key={emp.id_employe} className="hover:bg-white/5 transition">
                            <td className="px-6 py-4"><div className="font-bold text-white">{emp.prenom} {emp.nom}</div><div className="text-sm text-gray-500">{emp.email}</div></td>
                            <td className="px-6 py-4">
                                <span className={`px-2 py-1 rounded text-[10px] font-bold border uppercase tracking-wide
                                    ${emp.role === 'ADMIN' ? 'bg-red-500/20 text-red-300 border-red-500/30' : 
                                      emp.role === 'CHEF_DE_PROJET' ? 'bg-purple-500/20 text-purple-300 border-purple-500/30' : 
                                      emp.role === 'RH' ? 'bg-green-500/20 text-green-300 border-green-500/30' : 
                                      'bg-blue-500/20 text-blue-300 border-blue-500/30'}`}>
                                    {emp.role}
                                </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-400">{emp.date_debut_validite ? new Date(emp.date_debut_validite).toLocaleDateString() : "∞"} ➔ {emp.date_fin_validite ? new Date(emp.date_fin_validite).toLocaleDateString() : "∞"}</td>
                            <td className="px-6 py-4 text-right space-x-3">
                                <button onClick={() => openEdit(emp)} className="text-blue-400 hover:text-blue-300 transition">Modifier</button>
                                <button onClick={() => setConfirmDeleteId(emp.id_employe)} className="text-red-400 hover:text-red-300 transition">Supprimer</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>

        {/* MODALE SUPPRESSION */}
        {confirmDeleteId && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-center z-[60]">
                <div className="glass-panel p-6 rounded-2xl text-center border border-red-500/30">
                    <h3 className="text-lg font-bold text-white mb-4">Supprimer cet employé ?</h3>
                    <div className="flex gap-4 justify-center">
                        <button onClick={() => setConfirmDeleteId(null)} className="text-gray-400">Annuler</button>
                        <button onClick={handleDelete} className="btn-neon-red px-4 py-2 rounded font-bold">Confirmer</button>
                    </div>
                </div>
            </div>
        )}

        {/* MODALE FORMULAIRE */}
        {isModalOpen && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
                <div className="glass-panel p-8 rounded-2xl w-full max-w-lg">
                    <h2 className="text-xl font-bold text-white mb-6 border-b border-white/10 pb-4">{isEditing ? "Modifier" : "Créer"}</h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <input type="text" placeholder="Prénom" required className="glass-input w-full" value={form.prenom} onChange={e => setForm({...form, prenom: e.target.value})} />
                            <input type="text" placeholder="Nom" required className="glass-input w-full" value={form.nom} onChange={e => setForm({...form, nom: e.target.value})} />
                        </div>
                        <input type="email" placeholder="Email" required className="glass-input w-full" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
                        
                        {/* 👇 SÉLECTEUR DE RÔLE AMÉLIORÉ */}
                        <div>
                            <label className="text-xs text-gray-400 uppercase font-bold mb-1 block">Rôle Système</label>
                            <select className="glass-input w-full" value={form.role} onChange={e => setForm({...form, role: e.target.value})}>
                                <option className="bg-slate-900" value="DEVELOPPEUR">Développeur</option>
                                <option className="bg-slate-900" value="CHEF_DE_PROJET">Chef de Projet</option>
                                <option className="bg-slate-900" value="RH">Ressources Humaines</option>
                                <option className="bg-slate-900" value="ADMIN">Administrateur</option>
                                <option className="bg-slate-900" value="STAGIAIRE">Stagiaire</option>
                            </select>
                        </div>

                        <div className="border-t border-white/10 pt-4">
                            <p className="text-xs font-bold text-gray-400 mb-2 uppercase">Période de contrat (Optionnel)</p>
                            <div className="grid grid-cols-2 gap-4">
                                <input type="date" className="glass-input w-full text-sm" value={form.dateDebut} onChange={e => setForm({...form, dateDebut: e.target.value})} />
                                <input type="date" className="glass-input w-full text-sm" value={form.dateFin} onChange={e => setForm({...form, dateFin: e.target.value})} />
                            </div>
                        </div>

                        <input type="password" placeholder={isEditing ? "Nouveau mdp (optionnel)" : "Mot de passe *"} className="glass-input w-full" value={form.password} onChange={e => setForm({...form, password: e.target.value})} />

                        <div className="flex justify-end gap-3 mt-6">
                            <button type="button" onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white px-4">Annuler</button>
                            <button type="submit" className="btn-neon-blue px-6 py-2 rounded-lg font-bold">Sauvegarder</button>
                        </div>
                    </form>
                </div>
            </div>
        )}
      </main>
    </div>
  );
}