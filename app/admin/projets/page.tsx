"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminSidebar from "../../components/AdminSidebar";
import { toast } from "sonner";
import { canManageProjects } from "@/lib/permissions";
import { 
  Plus, Pencil, Trash2, Users, Search, Calendar, 
  Briefcase, X, Save, Clock, Loader2, UserPlus, 
  AlertCircle, CheckCircle2, AlertTriangle // 👈 Nouvel import icône
} from "lucide-react";

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
  
  // 🆕 ÉTATS POUR L'ALERTE DE SURCHARGE (Remplacement du confirm())
  const [warningModalOpen, setWarningModalOpen] = useState(false);
  const [pendingMemberId, setPendingMemberId] = useState<string | null>(null);

  // Data States
  const [editingProjet, setEditingProjet] = useState<any>(null);
  const [currentProjectTeam, setCurrentProjectTeam] = useState<any>(null);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  
  // Recherche membre interne modale
  const [searchMember, setSearchMember] = useState("");

  const [form, setForm] = useState({ nom_projet: "", description: "", date_debut: "", date_fin: "", statut: "EN_COURS" });

  useEffect(() => {
    const storedUser = localStorage.getItem("user_info");
    if (!storedUser) { router.push("/"); } 
    else { setUserRole(JSON.parse(storedUser).role); }
    fetchProjets(); 
    fetchEmployes();
  }, [router]);

  useEffect(() => {
    setFilteredProjets(projets.filter(p => p.nom_projet.toLowerCase().includes(search.toLowerCase())));
  }, [search, projets]);

  const canEdit = canManageProjects(userRole);

  const fetchProjets = async () => {
    try { const res = await fetch("/api/projets"); if (res.ok) { const data = await res.json(); setProjets(data); setFilteredProjets(data); } } catch (e) { console.error(e); } setLoading(false);
  };
  
  const fetchEmployes = async () => { 
      try { const res = await fetch("/api/employes"); if (res.ok) setEmployes(await res.json()); } catch (e) { console.error(e); } 
  };

  // --- LOGIQUE ÉQUIPE ---
  const openTeamModal = async (proj: any) => { 
      setCurrentProjectTeam(proj); 
      setSearchMember(""); 
      try {
          const r = await fetch(`/api/projets/${proj.id_projet}/participations`); 
          if(r.ok) setTeamMembers(await r.json());
      } catch(e) { console.error(e); }
      setTeamModalOpen(true); 
  };

  // 1️⃣ ÉTAPE 1 : CLIC SUR LE BOUTON AJOUTER
  const initiateAddMember = (empId: string, isBusy: boolean) => {
    if (isBusy) {
        // Si occupé, on ouvre la modale d'alerte custom
        setPendingMemberId(empId);
        setWarningModalOpen(true);
    } else {
        // Sinon on ajoute direct
        confirmAddMember(empId);
    }
  };

  // 2️⃣ ÉTAPE 2 : EXÉCUTION DE L'AJOUT (API)
  const confirmAddMember = async (empId: string | null) => {
    if (!empId) return;

    try {
        const res = await fetch(`/api/projets/${currentProjectTeam.id_projet}/participations`, { 
            method: "POST", headers: {"Content-Type": "application/json"}, 
            body: JSON.stringify({ id_employe: empId, role_dans_projet: "Membre" }) 
        });
        if (res.ok) {
            const r = await fetch(`/api/projets/${currentProjectTeam.id_projet}/participations`); 
            setTeamMembers(await r.json());
            toast.success("Membre ajouté au projet !");
            fetchEmployes();
        } else { toast.error("Déjà dans l'équipe"); }
    } catch (e) { toast.error("Erreur serveur"); }
    
    // On ferme l'alerte et on reset l'ID en attente
    setWarningModalOpen(false);
    setPendingMemberId(null);
  };

  const removeMember = async (id_participation: string) => {
      try {
        await fetch(`/api/projets/${currentProjectTeam.id_projet}/participations?id_participation=${id_participation}`, {method: "DELETE"});
        const r = await fetch(`/api/projets/${currentProjectTeam.id_projet}/participations`); 
        setTeamMembers(await r.json());
        fetchEmployes(); 
        toast.success("Membre retiré");
      } catch (e) { toast.error("Erreur"); }
  };

  const availableEmployees = employes.filter(emp => {
      const isAlreadyIn = teamMembers.some(m => m.id_employe === emp.id_employe);
      const matchesSearch = emp.nom.toLowerCase().includes(searchMember.toLowerCase()) || emp.prenom.toLowerCase().includes(searchMember.toLowerCase());
      return !isAlreadyIn && matchesSearch;
  });

  // CRUD...
  const handleCreate = () => { setEditingProjet(null); setForm({ nom_projet: "", description: "", date_debut: "", date_fin: "", statut: "EN_COURS" }); setModalOpen(true); };
  const handleEdit = (proj: any) => { setEditingProjet(proj); setForm({ nom_projet: proj.nom_projet, description: proj.description || "", date_debut: proj.date_debut ? new Date(proj.date_debut).toISOString().slice(0, 16) : "", date_fin: proj.date_fin ? new Date(proj.date_fin).toISOString().slice(0, 16) : "", statut: proj.statut }); setModalOpen(true); };
  const handleSubmit = async () => { if (!form.nom_projet) return toast.error("Nom requis"); const url = editingProjet ? `/api/projets/${editingProjet.id_projet}` : "/api/projets"; const method = editingProjet ? "PUT" : "POST"; const payload = { ...form, date_debut: form.date_debut ? new Date(form.date_debut).toISOString() : new Date().toISOString(), date_fin: form.date_fin ? new Date(form.date_fin).toISOString() : null }; try { const res = await fetch(url, { method, headers: {"Content-Type": "application/json"}, body: JSON.stringify(payload) }); if(res.ok) { toast.success(editingProjet ? "Mis à jour" : "Créé"); setModalOpen(false); fetchProjets(); } else { toast.error("Erreur"); } } catch (e) { toast.error("Erreur réseau"); } };
  const handleDelete = async () => { if(!confirmDeleteId) return; await fetch(`/api/projets/${confirmDeleteId}`, { method: "DELETE" }); toast.success("Supprimé"); fetchProjets(); setConfirmDeleteId(null); };
  const getStatusBadge = (statut: string) => { if (statut === "EN_COURS") return "bg-blue-500/10 text-blue-400 border-blue-500/20"; if (statut === "TERMINE") return "bg-green-500/10 text-green-400 border-green-500/20"; return "bg-gray-500/10 text-gray-400 border-gray-500/20"; };

  return (
    <div className="min-h-screen text-gray-200 bg-[#030712]">
      <AdminSidebar />
      <main className="ml-64 p-8 animate-fade-in">
        
        {/* HEADER */}
        <div className="flex justify-between items-center mb-8">
          <div><h1 className="text-3xl font-bold text-white flex items-center gap-3">Projets & Missions</h1><p className="text-gray-400 text-sm mt-1">Portefeuille de projets.</p></div>
          {canEdit && (<button onClick={handleCreate} className="btn-neon-blue px-5 py-2.5 rounded-xl font-bold text-white shadow-lg flex items-center gap-2 hover:scale-105 transition-transform"><Plus className="w-5 h-5" /> Nouveau Projet</button>)}
        </div>

        <div className="glass-panel rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
            <div className="p-4 border-b border-white/5 bg-white/[0.02]">
                <div className="relative max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" /><input type="text" placeholder="Rechercher..." className="w-full bg-[#0f172a] border border-white/10 rounded-lg py-2 pl-9 pr-4 text-sm focus:border-blue-500 outline-none text-gray-300" value={search} onChange={(e) => setSearch(e.target.value)}/></div>
            </div>

            {loading ? <div className="py-20 text-center"><Loader2 className="w-10 h-10 text-blue-500 animate-spin mx-auto"/></div> : 
            filteredProjets.length === 0 ? <div className="p-8 text-center text-gray-500">Aucun projet trouvé.</div> : (
                <table className="min-w-full text-left">
                <thead className="bg-white/5 border-b border-white/10 text-gray-400 text-xs uppercase font-semibold"><tr><th className="px-6 py-4">Projet</th><th className="px-6 py-4">Planning</th><th className="px-6 py-4">Statut</th><th className="px-6 py-4 text-right">Actions</th></tr></thead>
                <tbody className="divide-y divide-white/5">
                    {filteredProjets.map((proj) => (
                    <tr key={proj.id_projet} className="hover:bg-white/5 transition group">
                        <td className="px-6 py-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400"><Briefcase className="w-5 h-5" /></div><div><div className="font-bold text-white">{proj.nom_projet}</div><div className="text-xs text-gray-500 truncate max-w-xs">{proj.description || "Pas de description"}</div></div></div></td>
                        <td className="px-6 py-4"><div className="flex items-center gap-2 text-xs text-gray-400 font-mono"><Calendar className="w-3 h-3 text-gray-600" />{new Date(proj.date_debut).toLocaleDateString()}<span className="text-gray-600">➔</span>{proj.date_fin ? new Date(proj.date_fin).toLocaleDateString() : "..."}</div></td>
                        <td className="px-6 py-4"><span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold border uppercase tracking-wider ${getStatusBadge(proj.statut)}`}>{proj.statut === "EN_COURS" && <Clock className="w-3 h-3" />}{proj.statut.replace("_", " ")}</span></td>
                        <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => openTeamModal(proj)} className="p-2 rounded-lg hover:bg-purple-500/20 text-purple-400 transition" title="Gérer l'équipe"><Users className="w-4 h-4" /></button>
                            {canEdit && (<><button onClick={() => handleEdit(proj)} className="p-2 rounded-lg hover:bg-blue-500/20 text-blue-400 transition"><Pencil className="w-4 h-4" /></button><button onClick={() => setConfirmDeleteId(proj.id_projet)} className="p-2 rounded-lg hover:bg-red-500/20 text-red-400 transition"><Trash2 className="w-4 h-4" /></button></>)}
                        </div>
                        </td>
                    </tr>
                    ))}
                </tbody>
                </table>
            )}
        </div>

        {/* MODALE SUPPRESSION PROJET */}
        {confirmDeleteId && (<div className="fixed inset-0 bg-black/80 flex justify-center items-center z-[60] backdrop-blur-sm"><div className="glass-panel p-6 rounded-2xl text-center border border-red-500/30 w-full max-w-sm"><h3 className="text-lg font-bold text-white mb-2">Supprimer ?</h3><div className="flex gap-3"><button onClick={() => setConfirmDeleteId(null)} className="flex-1 py-2 rounded-lg border border-white/10 hover:bg-white/5 transition text-sm">Annuler</button><button onClick={handleDelete} className="flex-1 bg-red-500 hover:bg-red-600 text-white rounded-lg py-2 font-bold text-sm">Supprimer</button></div></div></div>)}
        
        {/* MODALE CRÉATION/EDIT PROJET */}
        {modalOpen && canEdit && (<div className="fixed inset-0 bg-black/80 flex justify-center items-center z-50 p-4"><div className="glass-panel p-8 rounded-2xl w-full max-w-md border border-white/10 bg-[#0f172a]"><h2 className="text-xl font-bold text-white mb-6">Projet</h2><div className="space-y-4"><input className="glass-input w-full" value={form.nom_projet} onChange={e => setForm({...form, nom_projet: e.target.value})} placeholder="Nom"/><textarea className="glass-input w-full" value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Desc"/><div className="grid grid-cols-2 gap-4"><input type="datetime-local" className="glass-input w-full text-xs" value={form.date_debut} onChange={e => setForm({...form, date_debut: e.target.value})} /><input type="datetime-local" className="glass-input w-full text-xs" value={form.date_fin} onChange={e => setForm({...form, date_fin: e.target.value})} /></div><div className="flex justify-end gap-3"><button onClick={() => setModalOpen(false)} className="text-gray-400">Annuler</button><button onClick={handleSubmit} className="btn-neon-blue px-4 py-2 rounded-lg font-bold text-white">Valider</button></div></div></div></div>)}

        {/* 🌟 MODALE ÉQUIPE */}
        {teamModalOpen && currentProjectTeam && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-center z-50 animate-fade-in p-6">
            <div className="glass-panel w-full max-w-4xl border border-white/10 bg-[#0f172a] shadow-2xl relative flex flex-col md:flex-row h-[550px] overflow-hidden rounded-2xl">
              <button onClick={() => setTeamModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white z-20"><X className="w-5 h-5"/></button>
              
              {/* GAUCHE : MEMBRES */}
              <div className="w-full md:w-1/2 p-6 border-b md:border-b-0 md:border-r border-white/10 flex flex-col">
                  <h2 className="text-lg font-bold text-white mb-1 flex items-center gap-2"><Users className="w-5 h-5 text-purple-400"/> Équipe Actuelle</h2>
                  <p className="text-sm text-gray-400 mb-4 font-mono">{currentProjectTeam.nom_projet} ({teamMembers.length} membres)</p>
                  
                  <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-2">
                    {teamMembers.length === 0 ? <p className="text-center text-gray-600 mt-10 italic">Aucun membre.</p> : 
                    teamMembers.map(m => (
                        <div key={m.id_participation} className="flex justify-between items-center bg-white/5 p-3 rounded-xl hover:bg-white/10 transition group">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-xs font-bold text-purple-300">{m.employe.prenom[0]}{m.employe.nom[0]}</div>
                                <div><p className="text-gray-200 text-sm font-bold">{m.employe.prenom} {m.employe.nom}</p><p className="text-gray-500 text-[10px]">{m.employe.email}</p></div>
                            </div>
                            {canEdit && (<button onClick={() => removeMember(m.id_participation)} className="p-2 rounded-lg hover:bg-red-500/20 text-gray-600 hover:text-red-400 transition"><Trash2 className="w-4 h-4" /></button>)}
                        </div>
                    ))}
                  </div>
              </div>

              {/* DROITE : AJOUT + INDICATEURS */}
              {canEdit && (
              <div className="w-full md:w-1/2 p-6 flex flex-col bg-black/20">
                  <h2 className="text-lg font-bold text-white mb-1 flex items-center gap-2"><UserPlus className="w-5 h-5 text-blue-400"/> Ajouter des membres</h2>
                  <p className="text-sm text-gray-400 mb-4">Indique la disponibilité des employés.</p>
                  
                  <div className="relative mb-4">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500"/>
                      <input type="text" placeholder="Rechercher un collègue..." className="w-full bg-[#0f172a] border border-white/10 rounded-lg py-2 pl-9 pr-4 text-sm focus:border-blue-500 outline-none text-gray-300" value={searchMember} onChange={(e) => setSearchMember(e.target.value)}/>
                  </div>

                  <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-2">
                      {availableEmployees.length === 0 ? <p className="text-center text-gray-600 mt-10 italic">Aucun résultat.</p> : 
                      availableEmployees.map(emp => {
                          const activeProjets = emp.participations || []; 
                          const isBusy = activeProjets.length > 0;
                          const busyProjectName = isBusy ? activeProjets[0].projet.nom_projet : "";

                          return (
                          <div key={emp.id_employe} className={`flex justify-between items-center bg-[#0f172a] p-3 rounded-xl border border-white/5 cursor-pointer transition group ${isBusy ? 'hover:border-yellow-500/50' : 'hover:border-green-500/50'}`} onClick={() => initiateAddMember(emp.id_employe, isBusy)}>
                              <div className="flex items-center gap-3">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${isBusy ? 'bg-yellow-500/20 text-yellow-400' : 'bg-green-500/20 text-green-400'}`}>{emp.prenom[0]}{emp.nom[0]}</div>
                                  <div>
                                      <p className="text-gray-300 text-sm font-bold group-hover:text-white transition">{emp.prenom} {emp.nom}</p>
                                      {isBusy ? (
                                          <div className="flex items-center gap-1 text-[10px] text-yellow-400"><AlertCircle className="w-3 h-3"/> Occupé : {busyProjectName}</div>
                                      ) : (
                                          <div className="flex items-center gap-1 text-[10px] text-green-400"><CheckCircle2 className="w-3 h-3"/> Disponible</div>
                                      )}
                                  </div>
                              </div>
                              <div className="p-1.5 rounded-full bg-blue-500/10 text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition"><Plus className="w-4 h-4"/></div>
                          </div>
                          );
                      })}
                  </div>
              </div>
              )}
            </div>
          </div>
        )}

        {/* ⚠️ ALERTE SURCHARGE (DESIGN "ATTENTION") */}
        {warningModalOpen && (
            <div className="fixed inset-0 bg-black/80 flex justify-center items-center z-[70] backdrop-blur-sm animate-in zoom-in-95 duration-200">
                <div className="glass-panel p-6 rounded-2xl w-full max-w-sm text-center border border-yellow-500/30 shadow-[0_0_40px_rgba(234,179,8,0.2)]">
                    <div className="w-14 h-14 rounded-full bg-yellow-500/10 flex items-center justify-center mx-auto mb-4 text-yellow-500 animate-pulse">
                        <AlertTriangle className="w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Attention : Surcharge</h3>
                    <p className="text-sm text-gray-300 mb-6 leading-relaxed">
                        Cet employé est déjà actif sur un autre projet. L'ajouter ici pourrait impacter sa productivité.
                    </p>
                    <div className="flex gap-3">
                        <button 
                            onClick={() => { setWarningModalOpen(false); setPendingMemberId(null); }} 
                            className="flex-1 py-2.5 rounded-xl border border-white/10 hover:bg-white/5 transition text-sm text-gray-400 font-medium"
                        >
                            Annuler
                        </button>
                        <button 
                            onClick={() => confirmAddMember(pendingMemberId)} 
                            className="flex-1 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded-xl py-2.5 text-sm font-bold transition"
                        >
                            Forcer l'ajout
                        </button>
                    </div>
                </div>
            </div>
        )}

      </main>
    </div>
  );
}