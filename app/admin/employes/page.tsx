"use client";

import { useEffect, useState } from "react";
import AdminSidebar from "../../components/AdminSidebar"; 
import { toast } from "sonner";
import { Plus, Pencil, Trash2, RotateCcw, Search, User, Mail, Briefcase, Calendar, Loader2, X, ShieldCheck } from "lucide-react";

export default function AdminEmployesPage() {
  const [employes, setEmployes] = useState<any[]>([]);
  
  // États UI
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  // Formulaire
  const [form, setForm] = useState({
    id_employe: "",
    nom: "", prenom: "", email: "", role: "EMPLOYE", 
    dateDebut: "", dateFin: ""
  });

  const loadEmployes = async () => { 
      try {
        const res = await fetch("/api/employes"); 
        if (res.ok) setEmployes(await res.json()); 
      } catch (e) { toast.error("Erreur chargement"); }
  };

  useEffect(() => { loadEmployes(); }, []);

  const openCreate = () => { 
      setForm({ id_employe: "", nom: "", prenom: "", email: "", role: "EMPLOYE", dateDebut: "", dateFin: "" }); 
      setIsEditing(false); 
      setIsModalOpen(true); 
  };
  
  const openEdit = (emp: any) => {
    setForm({
      id_employe: emp.id_employe,
      nom: emp.nom, 
      prenom: emp.prenom, 
      email: emp.email, 
      role: emp.role,
      dateDebut: emp.date_debut_validite ? new Date(emp.date_debut_validite).toISOString().split('T')[0] : "",
      dateFin: emp.date_fin_validite ? new Date(emp.date_fin_validite).toISOString().split('T')[0] : ""
    });
    setIsEditing(true); 
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const method = isEditing ? "PUT" : "POST";
    
    // On convertit les chaînes vides en null pour l'API
    const payload = {
        ...form,
        dateDebut: form.dateDebut || null,
        dateFin: form.dateFin || null
    };

    try {
        const res = await fetch("/api/employes", { 
            method, 
            headers: { "Content-Type": "application/json" }, 
            body: JSON.stringify(payload) 
        });

        if (res.ok) { 
            toast.success(isEditing ? "Employé mis à jour" : "Compte créé et email envoyé ! 📧"); 
            setIsModalOpen(false); 
            loadEmployes(); 
        } else { 
            const data = await res.json(); 
            toast.error(data.error); 
        }
    } catch (e) { toast.error("Erreur serveur"); } 
    finally { setLoading(false); }
  };

  const handleDelete = async () => {
    if(!confirmDeleteId) return;
    try {
        await fetch(`/api/employes?id=${confirmDeleteId}`, { method: "DELETE" });
        toast.success("Employé supprimé"); 
        loadEmployes(); 
    } catch(e) { toast.error("Erreur suppression"); }
    setConfirmDeleteId(null);
  };

  const handleResetPassword = async () => {
    if(!form.id_employe) return;
    if(!confirm("Ceci va générer un nouveau mot de passe et l'envoyer par email à l'utilisateur. Continuer ?")) return;

    setResetLoading(true);
    try {
        const res = await fetch("/api/employes/reset-password", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id_employe: form.id_employe })
        });
        
        if(res.ok) {
            toast.success("Nouveau mot de passe envoyé ! 📧");
        } else {
            const data = await res.json();
            toast.error(data.error || "Erreur lors du reset");
        }
    } catch(e) { toast.error("Erreur connexion"); }
    finally { setResetLoading(false); }
  };

  return (
    <div className="min-h-screen text-gray-200 bg-[#030712]">
      <AdminSidebar /> 

      <main className="ml-64 p-8 animate-fade-in">
        <div className="flex justify-between items-center mb-8">
            <div>
                <h1 className="text-3xl font-bold text-white">Employés & Contrats</h1>
                <p className="text-gray-400 text-sm mt-1">Gérez les accès et rôles</p>
            </div>
            <button onClick={openCreate} className="btn-neon-blue px-5 py-2.5 rounded-xl font-bold text-white shadow-lg flex items-center gap-2 hover:scale-105 transition-transform">
                <Plus className="w-5 h-5" />
                Nouveau Collaborateur
            </button>
        </div>
        
        <div className="glass-panel rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
            {/* Search Bar visuelle */}
            <div className="p-4 border-b border-white/5 bg-white/[0.02]">
                <div className="relative max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input type="text" placeholder="Rechercher..." className="w-full bg-[#0f172a] border border-white/10 rounded-lg py-2 pl-9 pr-4 text-sm focus:border-blue-500 outline-none text-gray-300" />
                </div>
            </div>

            <table className="min-w-full text-left">
                <thead className="bg-white/5 border-b border-white/10 text-gray-400 text-xs uppercase font-semibold">
                    <tr>
                        <th className="px-6 py-4">Identité</th>
                        <th className="px-6 py-4">Rôle</th>
                        <th className="px-6 py-4">Validité</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                    {employes.map(emp => (
                        <tr key={emp.id_employe} className="hover:bg-white/5 transition group">
                            <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center font-bold text-white">
                                        {emp.prenom[0]}{emp.nom[0]}
                                    </div>
                                    <div>
                                        <div className="font-bold text-white">{emp.prenom} {emp.nom}</div>
                                        <div className="text-xs text-gray-500 flex items-center gap-1">
                                            <Mail className="w-3 h-3" /> {emp.email}
                                        </div>
                                    </div>
                                </div>
                            </td>
                            <td className="px-6 py-4">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold border uppercase tracking-wider
                                    ${emp.role === 'ADMIN' ? 'bg-purple-500/10 border-purple-500/20 text-purple-300' : 
                                      emp.role === 'RH' ? 'bg-green-500/10 border-green-500/20 text-green-300' :
                                      'bg-slate-500/10 border-slate-500/20 text-slate-300'}`}>
                                    {emp.role === 'ADMIN' && <ShieldCheck className="w-3 h-3" />}
                                    {emp.role}
                                </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-400 font-mono">
                                {emp.date_debut_validite ? new Date(emp.date_debut_validite).toLocaleDateString() : "∞"} 
                                <span className="mx-2 text-gray-600">➔</span> 
                                {emp.date_fin_validite ? new Date(emp.date_fin_validite).toLocaleDateString() : "∞"}
                            </td>
                            <td className="px-6 py-4 text-right">
                                <div className="flex items-center justify-end gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => openEdit(emp)} className="p-2 rounded-lg hover:bg-blue-500/20 text-blue-400 transition" title="Modifier">
                                        <Pencil className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => setConfirmDeleteId(emp.id_employe)} className="p-2 rounded-lg hover:bg-red-500/20 text-red-400 transition" title="Supprimer">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>

        {/* MODALE SUPPRESSION */}
        {confirmDeleteId && (
            <div className="fixed inset-0 bg-black/80 flex justify-center items-center z-[60] backdrop-blur-sm">
                <div className="glass-panel p-6 rounded-2xl text-center border border-red-500/30 w-full max-w-sm">
                    <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4 text-red-500">
                        <Trash2 className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">Supprimer l'employé ?</h3>
                    <p className="text-sm text-gray-400 mb-6">Action irréversible.</p>
                    <div className="flex gap-3">
                        <button onClick={() => setConfirmDeleteId(null)} className="flex-1 py-2 rounded-lg border border-white/10 hover:bg-white/5 transition text-sm">Annuler</button>
                        <button onClick={handleDelete} className="flex-1 bg-red-500 hover:bg-red-600 text-white rounded-lg py-2 text-sm font-bold transition">Confirmer</button>
                    </div>
                </div>
            </div>
        )}

        {/* MODALE CRÉATION / ÉDITION */}
        {isModalOpen && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
                <div className="glass-panel p-8 rounded-2xl w-full max-w-lg border border-white/10 bg-[#0f172a] relative animate-fade-in-up shadow-2xl">
                    <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white transition">
                        <X className="w-5 h-5" />
                    </button>
                    
                    <h2 className="text-2xl font-bold text-white mb-1 flex items-center gap-3">
                        {isEditing ? <Pencil className="w-6 h-6 text-blue-400" /> : <Plus className="w-6 h-6 text-blue-400" />}
                        {isEditing ? "Modifier l'employé" : "Nouveau Compte"}
                    </h2>
                    <p className="text-sm text-gray-500 mb-6">Remplissez les informations ci-dessous.</p>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs text-gray-500 font-bold mb-1.5 block ml-1">Prénom</label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                                    <input type="text" required className="glass-input w-full pl-9" value={form.prenom} onChange={e => setForm({...form, prenom: e.target.value})} />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 font-bold mb-1.5 block ml-1">Nom</label>
                                <input type="text" required className="glass-input w-full" value={form.nom} onChange={e => setForm({...form, nom: e.target.value})} />
                            </div>
                        </div>

                        <div>
                            <label className="text-xs text-gray-500 font-bold mb-1.5 block ml-1">Email Professionnel</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                                <input type="email" required className="glass-input w-full pl-9" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
                            </div>
                        </div>
                        
                        <div>
                            <label className="text-xs text-gray-500 font-bold mb-1.5 block ml-1">Rôle Système</label>
                            <div className="relative">
                                <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                                <select className="glass-input w-full pl-9 bg-[#0f172a] appearance-none" value={form.role} onChange={e => setForm({...form, role: e.target.value})}>
                                    <option value="EMPLOYE">Employé Standard</option>
                                    <option value="DEVELOPPEUR">Développeur</option>
                                    <option value="CHEF_DE_PROJET">Chef de Projet</option>
                                    <option value="RH">Ressources Humaines</option>
                                    <option value="ADMIN">Administrateur</option>
                                </select>
                            </div>
                        </div>

                        <div className="border-t border-white/10 pt-4 mt-2">
                            <label className="flex items-center gap-2 text-xs font-bold text-gray-400 mb-3 uppercase tracking-wider">
                                <Calendar className="w-3 h-3" /> Période de validité
                            </label>
                            <div className="grid grid-cols-2 gap-4">
                                <input type="date" className="glass-input w-full text-sm" value={form.dateDebut} onChange={e => setForm({...form, dateDebut: e.target.value})} />
                                <input type="date" className="glass-input w-full text-sm" value={form.dateFin} onChange={e => setForm({...form, dateFin: e.target.value})} />
                            </div>
                        </div>

                        <div className="mt-4 pt-4 border-t border-white/10">
                            {!isEditing ? (
                                <div className="bg-blue-500/10 p-3 rounded-xl text-xs text-blue-300 border border-blue-500/20 flex items-center gap-2">
                                    <Mail className="w-4 h-4 shrink-0" />
                                    Un mot de passe sera généré et envoyé par email.
                                </div>
                            ) : (
                                <div className="flex items-center justify-between bg-white/5 p-3 rounded-xl border border-white/10">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center text-orange-500">
                                            <RotateCcw className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-white uppercase">Sécurité</p>
                                            <p className="text-[10px] text-gray-400">Réinitialiser les accès</p>
                                        </div>
                                    </div>
                                    <button 
                                        type="button" 
                                        onClick={handleResetPassword}
                                        disabled={resetLoading}
                                        className="text-xs bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/20 px-3 py-2 rounded-lg transition font-medium flex items-center gap-2"
                                    >
                                        {resetLoading && <Loader2 className="w-3 h-3 animate-spin" />}
                                        Envoyer Email
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <button type="button" onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white px-4 py-2 rounded-lg transition text-sm">Annuler</button>
                            <button type="submit" disabled={loading} className="btn-neon-blue px-6 py-2 rounded-lg font-bold text-white shadow-lg flex items-center gap-2">
                                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                                {isEditing ? "Sauvegarder" : "Créer le compte"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        )}
      </main>
    </div>
  );
}