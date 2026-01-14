"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminSidebar from "../../components/AdminSidebar";
import { toast } from "sonner";
import { canManageProjects } from "@/lib/permissions";
// 👇 IMPORTS LUCIDE
import { 
  Plus, Pencil, Trash2, Users, Search, Calendar, 
  Briefcase, Layers, X, Save, Clock, Loader2, UserPlus 
} from "lucide-react";

// Rôles possibles dans un projet
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
  const [filteredProjets, setFilteredProjets] = useState<any[]>([]);
  const [employes, setEmployes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState("DEVELOPPEUR");
  const [search, setSearch] = useState("");
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
    role: PROJECT_ROLES[2] // Par défaut "Développeur"
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

  // Filtrage dynamique
  useEffect(() => {
    setFilteredProjets(
      projets.filter(p => 
        p.nom_projet.toLowerCase().includes(search.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(search.toLowerCase()))
      )
    );
  }, [search, projets]);

  const canEdit = canManageProjects(userRole);

  const fetchProjets = async () => {
    try {
        const res = await fetch("/api/projets");
        if (res.ok) {
            const data = await res.json();
            setProjets(data);
            setFilteredProjets(data);
        }
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
            toast.success(editingProjet ? "Projet mis à jour" : "Projet créé avec succès");
            setModalOpen(false); 
            fetchProjets();
        } else { 
            toast.error("Erreur serveur"); 
        }
    } catch (e) { toast.error("Erreur réseau"); }
  };

  const handleDelete = async () => {
    if(!confirmDeleteId) return;
    try {
        const res = await fetch(`/api/projets/${confirmDeleteId}`, { method: "DELETE" });
        if (res.ok) {
            toast.success("Projet supprimé");
            fetchProjets(); 
        } else {
            toast.error("Impossible de supprimer");
        }
    } catch (e) { toast.error("Erreur réseau"); }
    setConfirmDeleteId(null);
  };

  const openTeamModal = async (proj: any) => { 
      setCurrentProjectTeam(proj); 
      setTeamForm({ id_employe: "", role: PROJECT_ROLES[2] });
      
      try {
          const r = await fetch(`/api/projets/${proj.id_projet}/participations`); 
          if(r.ok) setTeamMembers(await r.json());
      } catch(e) { console.error(e); }
      
      setTeamModalOpen(true); 
  };

  const handleAddMember = async () => {
    if (!teamForm.id_employe) return toast.error("Sélectionnez un employé");
    
    try {
        const res = await fetch(`/api/projets/${currentProjectTeam.id_projet}/participations`, { 
            method: "POST", 
            headers: {"Content-Type": "application/json"}, 
            body: JSON.stringify({ 
                id_employe: teamForm.id_employe, 
                role_dans_projet: teamForm.role
            }) 
        });

        if (res.ok) {
            toast.success("Membre ajouté !");
            const r = await fetch(`/api/projets/${currentProjectTeam.id_projet}/participations`); 
            setTeamMembers(await r.json());
            setTeamForm({ id_employe: "", role: PROJECT_ROLES[2] }); 
        } else {
            const data = await res.json();
            toast.error(data.error || "Erreur ajout");
        }
    } catch (e) { toast.error("Erreur connexion"); }
  };

  const removeMember = async (id_participation: string) => {
      try {
        await fetch(`/api/projets/${currentProjectTeam.id_projet}/participations?id_participation=${id_participation}`, {method: "DELETE"});
        const r = await fetch(`/api/projets/${currentProjectTeam.id_projet}/participations`); 
        setTeamMembers(await r.json());
        toast.success("Membre retiré");
      } catch (e) { toast.error("Erreur retrait"); }
  };

  const getStatusBadge = (statut: string) => {
      if (statut === "EN_COURS") return "bg-blue-500/10 text-blue-400 border-blue-500/20";
      if (statut === "TERMINE") return "bg-green-500/10 text-green-400 border-green-500/20";
      if (statut === "ANNULE") return "bg-red-500/10 text-red-400 border-red-500/20";
      return "bg-gray-500/10 text-gray-400 border-gray-500/20";
  };

  return (
    <div className="min-h-screen text-gray-200 bg-[#030712]">
      <AdminSidebar />
      <main className="ml-64 p-8 animate-fade-in">
        
        {/* EN-TÊTE */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                Projets & Missions
            </h1>
            <p className="text-gray-400 text-sm mt-1">Gérez le portefeuille de projets et les équipes.</p>
          </div>
          {canEdit && (
            <button onClick={handleCreate} className="btn-neon-blue px-5 py-2.5 rounded-xl font-bold text-white shadow-lg flex items-center gap-2 hover:scale-105 transition-transform">
                <Plus className="w-5 h-5" />
                Nouveau Projet
            </button>
          )}
        </div>

        <div className="glass-panel rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
            {/* Barre de recherche */}
            <div className="p-4 border-b border-white/5 bg-white/[0.02]">
                <div className="relative max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input 
                        type="text" 
                        placeholder="Rechercher un projet..." 
                        className="w-full bg-[#0f172a] border border-white/10 rounded-lg py-2 pl-9 pr-4 text-sm focus:border-blue-500 outline-none text-gray-300 placeholder:text-gray-600 transition-all"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-3" />
                    <p className="text-gray-500 font-mono text-sm">Chargement des projets...</p>
                </div>
            ) : filteredProjets.length === 0 ? (
                <div className="p-8 text-center text-gray-500 flex flex-col items-center">
                    <Layers className="w-12 h-12 mb-3 opacity-20" />
                    <p>Aucun projet trouvé.</p>
                </div>
            ) : (
                <table className="min-w-full text-left">
                <thead className="bg-white/5 border-b border-white/10 text-gray-400 text-xs uppercase font-semibold">
                    <tr>
                        <th className="px-6 py-4">Projet</th>
                        <th className="px-6 py-4">Planning</th>
                        <th className="px-6 py-4">Statut</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                    {filteredProjets.map((proj) => (
                    <tr key={proj.id_projet} className="hover:bg-white/5 transition group">
                        <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                                    <Briefcase className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="font-bold text-white">{proj.nom_projet}</div>
                                    <div className="text-xs text-gray-500 truncate max-w-xs">{proj.description || "Pas de description"}</div>
                                </div>
                            </div>
                        </td>
                        <td className="px-6 py-4">
                            <div className="flex items-center gap-2 text-xs text-gray-400 font-mono">
                                <Calendar className="w-3 h-3 text-gray-600" />
                                {new Date(proj.date_debut).toLocaleDateString()}
                                <span className="text-gray-600">➔</span>
                                {proj.date_fin ? new Date(proj.date_fin).toLocaleDateString() : "..."}
                            </div>
                        </td>
                        <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold border uppercase tracking-wider ${getStatusBadge(proj.statut)}`}>
                                {proj.statut === "EN_COURS" && <Clock className="w-3 h-3" />}
                                {proj.statut.replace("_", " ")}
                            </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                            <button 
                                onClick={() => openTeamModal(proj)} 
                                className="p-2 rounded-lg hover:bg-purple-500/20 text-purple-400 transition" 
                                title="Gérer l'équipe"
                            >
                                <Users className="w-4 h-4" />
                            </button>
                            
                            {canEdit && (
                                <>
                                    <button 
                                        onClick={() => handleEdit(proj)} 
                                        className="p-2 rounded-lg hover:bg-blue-500/20 text-blue-400 transition" 
                                        title="Modifier le projet"
                                    >
                                        <Pencil className="w-4 h-4" />
                                    </button>
                                    <button 
                                        onClick={() => setConfirmDeleteId(proj.id_projet)} 
                                        className="p-2 rounded-lg hover:bg-red-500/20 text-red-400 transition" 
                                        title="Supprimer le projet"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </>
                            )}
                        </div>
                        </td>
                    </tr>
                    ))}
                </tbody>
                </table>
            )}
        </div>

        {/* MODALE SUPPRESSION */}
        {confirmDeleteId && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-center z-[60] animate-fade-in">
                <div className="glass-panel p-6 rounded-2xl text-center border border-red-500/30 w-full max-w-sm">
                    <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4 text-red-500">
                        <Trash2 className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">Supprimer ce projet ?</h3>
                    <p className="text-sm text-gray-400 mb-6">Action irréversible. L'historique sera conservé.</p>
                    <div className="flex gap-3">
                        <button onClick={() => setConfirmDeleteId(null)} className="flex-1 py-2 rounded-lg border border-white/10 hover:bg-white/5 transition text-sm">Annuler</button>
                        <button onClick={handleDelete} className="flex-1 bg-red-500 hover:bg-red-600 text-white rounded-lg py-2 font-bold text-sm">Supprimer</button>
                    </div>
                </div>
            </div>
        )}

        {/* MODALE CRÉATION / ÉDITION */}
        {modalOpen && canEdit && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-center z-50 animate-fade-in">
            <div className="glass-panel p-8 rounded-2xl w-full max-w-md border border-white/10 bg-[#0f172a] relative shadow-2xl">
              <button onClick={() => setModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white"><X className="w-5 h-5"/></button>
              
              <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                {editingProjet ? <Pencil className="w-5 h-5 text-blue-400"/> : <Plus className="w-5 h-5 text-blue-400"/>}
                {editingProjet ? "Modifier le Projet" : "Nouveau Projet"}
              </h2>
              
              <div className="flex flex-col gap-4">
                <div>
                    <label className="text-xs text-gray-500 font-bold mb-1.5 block ml-1">Nom du projet</label>
                    <input className="glass-input w-full" value={form.nom_projet} onChange={e => setForm({...form, nom_projet: e.target.value})} />
                </div>
                <div>
                    <label className="text-xs text-gray-500 font-bold mb-1.5 block ml-1">Description</label>
                    <textarea rows={3} className="glass-input w-full" value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs text-gray-500 uppercase font-bold mb-1.5 block ml-1">Début</label>
                        <input type="datetime-local" className="glass-input w-full text-xs" value={form.date_debut} onChange={e => setForm({...form, date_debut: e.target.value})} />
                    </div>
                    <div>
                        <label className="text-xs text-gray-500 uppercase font-bold mb-1.5 block ml-1">Fin (Est.)</label>
                        <input type="datetime-local" className="glass-input w-full text-xs" value={form.date_fin} onChange={e => setForm({...form, date_fin: e.target.value})} />
                    </div>
                </div>
                
                <div>
                    <label className="text-xs text-gray-500 font-bold mb-1.5 block ml-1">Statut</label>
                    <select className="glass-input w-full bg-[#0f172a]" value={form.statut} onChange={e => setForm({...form, statut: e.target.value})}>
                        <option value="EN_COURS">En cours</option>
                        <option value="TERMINE">Terminé</option>
                        <option value="EN_ATTENTE">En attente</option>
                        <option value="ANNULE">Annulé</option>
                    </select>
                </div>

                <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-white/10">
                  <button onClick={() => setModalOpen(false)} className="text-gray-400 px-4 py-2 hover:text-white transition text-sm">Annuler</button>
                  <button onClick={handleSubmit} className="btn-neon-blue px-6 py-2 rounded-lg font-bold text-white flex items-center gap-2">
                    <Save className="w-4 h-4" /> Valider
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODALE ÉQUIPE */}
        {teamModalOpen && currentProjectTeam && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-center z-50 animate-fade-in">
            <div className="glass-panel p-8 rounded-2xl w-full max-w-lg border border-white/10 bg-[#0f172a] shadow-2xl relative">
              <button onClick={() => setTeamModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white"><X className="w-5 h-5"/></button>
              
              <h2 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-400"/> Équipe du projet
              </h2>
              <p className="text-sm text-purple-300 mb-6 font-medium border-b border-white/10 pb-4">{currentProjectTeam.nom_projet}</p>
              
              {/* LISTE MEMBRES */}
              <div className="bg-black/20 p-4 rounded-xl mb-6 max-h-60 overflow-y-auto custom-scrollbar border border-white/5 space-y-2">
                {teamMembers.length === 0 ? (
                    <div className="text-center py-8">
                        <UserPlus className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                        <p className="text-gray-500 text-sm">Aucun membre assigné pour le moment.</p>
                    </div>
                ) : (
                    teamMembers.map(m => (
                        <div key={m.id_participation} className="flex justify-between items-center bg-white/5 p-3 rounded-lg hover:bg-white/10 transition group">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white">
                                    {m.employe.prenom[0]}{m.employe.nom[0]}
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-gray-200 text-sm font-bold">{m.employe.prenom} {m.employe.nom}</span>
                                    <span className="text-gray-500 text-[10px] uppercase tracking-wide">{m.role_dans_projet}</span>
                                </div>
                            </div>
                            {canEdit && (
                                <button 
                                    onClick={() => removeMember(m.id_participation)} 
                                    className="p-1.5 rounded-md hover:bg-red-500/20 text-red-500/50 hover:text-red-400 transition"
                                    title="Retirer du projet"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    ))
                )}
              </div>
              
              {/* AJOUT MEMBRE */}
              {canEdit && (
                <div className="border-t border-white/10 pt-4 bg-white/5 p-4 rounded-xl">
                    <label className="text-xs text-gray-400 uppercase font-bold mb-3 block flex items-center gap-2">
                        <UserPlus className="w-3 h-3" /> Ajouter un membre
                    </label>
                    <div className="flex flex-col sm:flex-row gap-2">
                        <select 
                            className="glass-input w-full text-sm bg-[#0f172a]" 
                            value={teamForm.id_employe} 
                            onChange={e => setTeamForm({...teamForm, id_employe: e.target.value})}
                        >
                            <option value="">Sélectionner un employé...</option>
                            {employes.map(e => (
                                <option key={e.id_employe} value={e.id_employe}>
                                    {e.nom} {e.prenom}
                                </option>
                            ))}
                        </select>
                        
                        <select 
                            className="glass-input w-full sm:w-1/2 text-sm bg-[#0f172a]"
                            value={teamForm.role}
                            onChange={e => setTeamForm({...teamForm, role: e.target.value})}
                        >
                            {PROJECT_ROLES.map(r => (
                                <option key={r} value={r}>{r}</option>
                            ))}
                        </select>
                        
                        <button onClick={handleAddMember} className="btn-neon-blue px-4 py-2 rounded-lg font-bold shadow-lg flex items-center justify-center">
                            <Plus className="w-5 h-5" />
                        </button>
                    </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}