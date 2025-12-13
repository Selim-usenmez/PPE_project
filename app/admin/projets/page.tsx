"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminSidebar from "../../components/AdminSidebar";
import { toast } from "sonner";
import { canManageProjects } from "@/lib/permissions";

// 👇 1. DÉFINITION DES RÔLES POSSIBLES DANS UN PROJET
const PROJECT_ROLES = [
  "Chef de Projet",
  "Tech Lead",
  "Développeur",
  "Ingénieur R&D",
  "Technicien Qualité",
  "Technicien Maintenance",
  "Consultant",
  "Observateur"
];

export default function AdminProjets() {
  const [projets, setProjets] = useState<any[]>([]);
  const [employes, setEmployes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState("DEVELOPPEUR");
  const router = useRouter();
  
  // UI States
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [teamModalOpen, setTeamModalOpen] = useState(false);
  
  // Data States
  const [editingProjet, setEditingProjet] = useState<any>(null);
  const [currentProjectTeam, setCurrentProjectTeam] = useState<any>(null);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  
  // Forms
  const [form, setForm] = useState({ 
    nom_projet: "", 
    description: "", 
    date_debut: "", 
    date_fin: "", 
    statut: "EN_COURS" 
  });
  
  const [teamForm, setTeamForm] = useState({ 
    id_employe: "", 
    role: "" // Sera rempli par le select
  });

  useEffect(() => {
    const storedUser = localStorage.getItem("user_info");
    if (!storedUser) {
        router.push("/");
    } else {
        const u = JSON.parse(storedUser);
        setUserRole(u.role);
    }
    fetchProjets(); 
    fetchEmployes();
  }, [router]);

  const canEdit = canManageProjects(userRole);

  const fetchProjets = async () => {
    try {
        const res = await fetch("/api/projets");
        if (res.ok) setProjets(await res.json());
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const fetchEmployes = async () => {
    try {
        const res = await fetch("/api/employes");
        if (res.ok) setEmployes(await res.json());
    } catch (e) { console.error(e); }
  };

  const handleCreate = () => {
    setEditingProjet(null);
    setForm({ nom_projet: "", description: "", date_debut: "", date_fin: "", statut: "EN_COURS" });
    setModalOpen(true);
  };

  const handleEdit = (proj: any) => {
    setEditingProjet(proj);
    setForm({
      nom_projet: proj.nom_projet,
      description: proj.description || "",
      date_debut: proj.date_debut ? new Date(proj.date_debut).toISOString().slice(0, 16) : "",
      date_fin: proj.date_fin ? new Date(proj.date_fin).toISOString().slice(0, 16) : "",
      statut: proj.statut
    });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.nom_projet) return toast.error("Le nom du projet est requis");
    
    const url = editingProjet ? `/api/projets/${editingProjet.id_projet}` : "/api/projets";
    const method = editingProjet ? "PUT" : "POST";
    
    const payload = { 
        ...form, 
        date_debut: form.date_debut ? new Date(form.date_debut).toISOString() : new Date().toISOString(), 
        date_fin: form.date_fin ? new Date(form.date_fin).toISOString() : null 
    };
    
    try {
        const res = await fetch(url, { 
            method, 
            headers: {"Content-Type": "application/json"}, 
            body: JSON.stringify(payload) 
        });
        
        if(res.ok) {
            toast.success(editingProjet ? "Projet mis à jour ! 🚀" : "Projet créé ! 🎉");
            setModalOpen(false); 
            fetchProjets();
        } else { 
            toast.error("Erreur serveur lors de l'enregistrement"); 
        }
    } catch (e) { toast.error("Erreur réseau"); }
  };

  const handleDelete = async () => {
    if(!confirmDeleteId) return;
    try {
        const res = await fetch(`/api/projets/${confirmDeleteId}`, { method: "DELETE" });
        if (res.ok) {
            toast.success("Projet supprimé 🗑️");
            fetchProjets(); 
        } else {
            toast.error("Impossible de supprimer");
        }
    } catch (e) { toast.error("Erreur réseau"); }
    setConfirmDeleteId(null);
  };

  const openTeamModal = async (proj: any) => { 
      setCurrentProjectTeam(proj); 
      setTeamForm({ id_employe: "", role: PROJECT_ROLES[0] }); // Par défaut le 1er rôle
      
      try {
          const r = await fetch(`/api/projets/${proj.id_projet}/participations`); 
          if(r.ok) setTeamMembers(await r.json());
      } catch(e) { console.error(e); }
      
      setTeamModalOpen(true); 
  };

  const handleAddMember = async () => {
    if (!teamForm.id_employe) {
        toast.error("Veuillez sélectionner un employé");
        return;
    }
    // Si pas de rôle sélectionné (cas rare), on met le premier par défaut
    const roleToSend = teamForm.role || PROJECT_ROLES[0];

    try {
        const res = await fetch(`/api/projets/${currentProjectTeam.id_projet}/participations`, { 
            method: "POST", 
            headers: {"Content-Type": "application/json"}, 
            body: JSON.stringify({ 
                id_employe: teamForm.id_employe, 
                role_dans_projet: roleToSend
            }) 
        });

        if (res.ok) {
            toast.success("Membre ajouté au projet !");
            const r = await fetch(`/api/projets/${currentProjectTeam.id_projet}/participations`); 
            setTeamMembers(await r.json());
            setTeamForm({ id_employe: "", role: PROJECT_ROLES[0] }); // Reset
        } else {
            const data = await res.json();
            toast.error(data.error || "Erreur lors de l'ajout");
        }
    } catch (e) { toast.error("Erreur de connexion"); }
  };

  const removeMember = async (id_participation: string) => {
      try {
        await fetch(`/api/projets/${currentProjectTeam.id_projet}/participations?id_participation=${id_participation}`, {method: "DELETE"});
        const r = await fetch(`/api/projets/${currentProjectTeam.id_projet}/participations`); 
        setTeamMembers(await r.json());
        toast.success("Membre retiré");
      } catch (e) { toast.error("Erreur lors du retrait"); }
  };

  return (
    <div className="min-h-screen text-gray-200">
      <AdminSidebar />
      <main className="ml-64 p-8 animate-fade-in">
        
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-white">Gestion des Projets</h1>
          {canEdit && (
            <button onClick={handleCreate} className="btn-neon-blue px-4 py-2 rounded-lg font-bold shadow-lg">
                + Nouveau Projet
            </button>
          )}
        </div>

        <div className="glass-panel rounded-2xl overflow-hidden">
            <table className="min-w-full text-left">
              <thead className="bg-white/5 border-b border-white/10 text-gray-400 text-xs uppercase">
                <tr>
                    <th className="px-6 py-3">Projet</th>
                    <th className="px-6 py-3">Planning</th>
                    <th className="px-6 py-3">Statut</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {projets.map((proj) => (
                  <tr key={proj.id_projet} className="hover:bg-white/5 transition">
                    <td className="px-6 py-4">
                      <div className="font-bold text-white">{proj.nom_projet}</div>
                      <div className="text-xs text-gray-500 truncate max-w-xs">{proj.description}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-400">
                      {new Date(proj.date_debut).toLocaleDateString()} ➔ {proj.date_fin ? new Date(proj.date_fin).toLocaleDateString() : "..."}
                    </td>
                    <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-xs font-bold border ${
                            proj.statut === "EN_COURS" ? "bg-blue-500/20 text-blue-300 border-blue-500/30" :
                            proj.statut === "TERMINE" ? "bg-green-500/20 text-green-300 border-green-500/30" :
                            "bg-gray-500/20 text-gray-300 border-gray-500/30"
                        }`}>
                            {proj.statut.replace("_", " ")}
                        </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-3">
                      <button onClick={() => openTeamModal(proj)} className="text-purple-400 hover:text-purple-300 transition text-sm font-medium">👥 Équipe</button>
                      
                      {canEdit ? (
                          <>
                            <button onClick={() => handleEdit(proj)} className="text-blue-400 hover:text-blue-300 transition text-sm font-medium">Modifier</button>
                            <button onClick={() => setConfirmDeleteId(proj.id_projet)} className="text-red-400 hover:text-red-300 transition text-sm font-medium">Supprimer</button>
                          </>
                      ) : (
                          <span className="text-gray-600 text-xs italic ml-2">Lecture seule</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
        </div>

        {confirmDeleteId && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-center z-[60] animate-fade-in">
                <div className="glass-panel p-6 rounded-2xl text-center border border-red-500/30 w-full max-w-sm">
                    <h3 className="text-lg font-bold text-white mb-4">Supprimer ce projet ?</h3>
                    <div className="flex gap-4 justify-center">
                        <button onClick={() => setConfirmDeleteId(null)} className="text-gray-400 hover:text-white transition">Annuler</button>
                        <button onClick={handleDelete} className="btn-neon-red px-4 py-2 rounded-lg font-bold">Confirmer</button>
                    </div>
                </div>
            </div>
        )}

        {modalOpen && canEdit && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-center z-50 animate-fade-in">
            <div className="glass-panel p-8 rounded-2xl w-full max-w-md border border-white/20">
              <h2 className="text-xl font-bold text-white mb-6 border-b border-white/10 pb-4">{editingProjet ? "Modifier" : "Créer"} Projet</h2>
              <div className="flex flex-col gap-4">
                <input placeholder="Nom du projet" className="glass-input w-full" value={form.nom_projet} onChange={e => setForm({...form, nom_projet: e.target.value})} />
                <textarea placeholder="Description" rows={3} className="glass-input w-full" value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs text-gray-400 uppercase font-bold mb-1 block">Début</label>
                        <input type="datetime-local" className="glass-input w-full text-sm" value={form.date_debut} onChange={e => setForm({...form, date_debut: e.target.value})} />
                    </div>
                    <div>
                        <label className="text-xs text-gray-400 uppercase font-bold mb-1 block">Fin (Optionnel)</label>
                        <input type="datetime-local" className="glass-input w-full text-sm" value={form.date_fin} onChange={e => setForm({...form, date_fin: e.target.value})} />
                    </div>
                </div>
                <select className="glass-input w-full" value={form.statut} onChange={e => setForm({...form, statut: e.target.value})}>
                  <option className="bg-slate-900" value="EN_COURS">En cours</option>
                  <option className="bg-slate-900" value="TERMINE">Terminé</option>
                  <option className="bg-slate-900" value="EN_ATTENTE">En attente</option>
                  <option className="bg-slate-900" value="ANNULE">Annulé</option>
                </select>
                <div className="flex justify-end gap-3 mt-4">
                  <button onClick={() => setModalOpen(false)} className="text-gray-400 px-4 hover:text-white transition">Annuler</button>
                  <button onClick={handleSubmit} className="btn-neon-blue px-6 py-2 rounded-lg font-bold">Valider</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {teamModalOpen && currentProjectTeam && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-center z-50 animate-fade-in">
            <div className="glass-panel p-8 rounded-2xl w-full max-w-lg border border-white/20">
              <h2 className="text-xl font-bold text-white mb-2">Équipe du projet</h2>
              <p className="text-sm text-blue-400 mb-4 font-medium">{currentProjectTeam.nom_projet}</p>
              
              <div className="bg-black/20 p-4 rounded-xl mb-6 max-h-56 overflow-y-auto custom-scrollbar border border-white/5">
                {teamMembers.length === 0 ? (
                    <p className="text-gray-500 text-center italic text-sm">Aucun membre assigné.</p>
                ) : (
                    <ul className="space-y-2">
                        {teamMembers.map(m => (
                            <li key={m.id_participation} className="flex justify-between items-center bg-white/5 p-2 rounded-lg hover:bg-white/10 transition">
                                <div className="flex flex-col">
                                    <span className="text-gray-200 text-sm font-bold">{m.employe.prenom} {m.employe.nom}</span>
                                    <span className="text-gray-500 text-xs uppercase">{m.role_dans_projet}</span>
                                </div>
                                {canEdit && (
                                    <button 
                                        onClick={() => removeMember(m.id_participation)} 
                                        className="text-red-400 text-xs border border-red-500/30 px-2 py-1 rounded hover:bg-red-500/20 transition"
                                    >
                                        Retirer
                                    </button>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
              </div>
              
              {canEdit && (
                <div className="border-t border-white/10 pt-4">
                    <label className="text-xs text-gray-400 uppercase font-bold mb-2 block">Ajouter un membre</label>
                    <div className="flex gap-2">
                        <select 
                            className="glass-input w-full text-sm" 
                            value={teamForm.id_employe} 
                            onChange={e => setTeamForm({...teamForm, id_employe: e.target.value})}
                        >
                            <option className="bg-slate-900" value="">Choisir un employé...</option>
                            {employes.map(e => (
                                <option key={e.id_employe} className="bg-slate-900" value={e.id_employe}>
                                    {e.nom} {e.prenom} ({e.role})
                                </option>
                            ))}
                        </select>
                        
                        {/* 👇 LE SÉLECTEUR DE RÔLE (Correction demandée) */}
                        <select 
                            className="glass-input w-1/3 text-sm"
                            value={teamForm.role}
                            onChange={e => setTeamForm({...teamForm, role: e.target.value})}
                        >
                            <option className="bg-slate-900" value="">Rôle...</option>
                            {PROJECT_ROLES.map(r => (
                                <option key={r} value={r} className="bg-slate-900">{r}</option>
                            ))}
                        </select>
                        
                        <button onClick={handleAddMember} className="btn-neon-blue px-3 rounded-lg font-bold shadow-lg">
                            +
                        </button>
                    </div>
                </div>
              )}
              
              <button onClick={() => setTeamModalOpen(false)} className="mt-6 w-full text-gray-500 hover:text-white text-sm transition">Fermer</button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}