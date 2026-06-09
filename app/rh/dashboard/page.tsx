"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  UserPlus, Users, Search, Trash2, Briefcase,
  ArrowLeft, Loader2, X, RotateCcw, Calendar,
  Pencil, Sun, CheckCircle2, XCircle, FileText,
  AlertTriangle, Filter
} from "lucide-react";
import { toast } from "sonner";

export default function RHDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"EFFECTIFS" | "RECRUTEMENT" | "CONGES">("EFFECTIFS");
  const [loading, setLoading] = useState(true);
  
  // --- DONNÉES RÉELLES ---
  const [employes, setEmployes] = useState<any[]>([]);
  const [conges, setConges] = useState<any[]>([]); // Données réelles
  const [search, setSearch] = useState("");

  // Données simulées (pour l'instant, seul le recrutement reste simulé)
  const [offres, setOffres] = useState([
      { id: 1, titre: "Dev React Senior", cands: 3, statut: "OUVERTE" },
      { id: 2, titre: "Commercial B2B", cands: 12, statut: "FERMEE" }
  ]);

  // --- ÉTATS CONGÉS ---
  const [projets, setProjets] = useState<any[]>([]);
  const [projetFilter, setProjetFilter] = useState("");
  const [statutFilter, setStatutFilter] = useState("TOUS");
  const today = new Date().toISOString().split("T")[0];
  const [statsDate, setStatsDate] = useState(today);
  const [statsJour, setStatsJour] = useState<{ totalEmployes: number; enConge: number; pourcentage: number; alerte50pct: boolean } | null>(null);

  // --- ÉTATS MODALES EFFECTIFS ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  // Formulaire Employé
  const [form, setForm] = useState({
    id_employe: "", nom: "", prenom: "", email: "", role: "EMPLOYE", dateDebut: "", dateFin: ""
  });

  // --- CHARGEMENT INITIAL ---
  useEffect(() => {
    const initData = async () => {
      await Promise.all([fetchEmployes(), fetchConges(""), fetchProjets(), fetchStatsJour(today, "")]);
      setLoading(false);
    };
    initData();
  }, []);

  // Re-fetch congés + stats quand le filtre projet ou la date changent
  useEffect(() => {
    fetchConges(projetFilter);
    fetchStatsJour(statsDate, projetFilter);
  }, [projetFilter, statsDate]);

  const fetchEmployes = async () => {
    try {
      const res = await fetch("/api/employes");
      if (res.ok) setEmployes(await res.json());
    } catch { toast.error("Erreur chargement employés"); }
  };

  const fetchProjets = async () => {
    try {
      const res = await fetch("/api/projets");
      if (res.ok) setProjets(await res.json());
    } catch { toast.error("Erreur chargement projets"); }
  };

  const fetchConges = async (projetId = "") => {
    try {
      const url = projetId ? `/api/conges?projetId=${projetId}` : "/api/conges";
      const res = await fetch(url);
      if (res.ok) setConges(await res.json());
    } catch { toast.error("Erreur chargement congés"); }
  };

  const fetchStatsJour = async (date: string, projetId = "") => {
    try {
      const params = new URLSearchParams({ date });
      if (projetId) params.set("projetId", projetId);
      const res = await fetch(`/api/conges/stats?${params}`);
      if (res.ok) setStatsJour(await res.json());
    } catch { /* silencieux */ }
  };

  // --- ACTION VALIDATION CONGÉS ---
  const handleConges = async (id_conge: string, action: string) => {
      try {
          const res = await fetch("/api/conges", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ id_conge, statut: action })
          });

          if (res.ok) {
              toast.success(`Demande ${action === 'VALIDE' ? 'validée' : 'refusée'} !`);
              // Mise à jour visuelle immédiate
              setConges(prev => prev.map(c => c.id_conge === id_conge ? { ...c, statut: action } : c));
          } else {
              toast.error("Erreur lors de la mise à jour");
          }
      } catch(e) { toast.error("Erreur serveur"); }
  };

  // --- GESTION EFFECTIFS (Création/Modif) ---
  const openCreate = () => { 
      setForm({ id_employe: "", nom: "", prenom: "", email: "", role: "EMPLOYE", dateDebut: "", dateFin: "" }); 
      setIsEditing(false); setIsModalOpen(true); 
  };
  
  const openEdit = (emp: any) => {
    setForm({
      id_employe: emp.id_employe, nom: emp.nom, prenom: emp.prenom, email: emp.email, role: emp.role,
      dateDebut: emp.date_debut_validite ? new Date(emp.date_debut_validite).toISOString().split('T')[0] : "",
      dateFin: emp.date_fin_validite ? new Date(emp.date_fin_validite).toISOString().split('T')[0] : ""
    });
    setIsEditing(true); setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    const method = isEditing ? "PUT" : "POST";
    const payload = { ...form, dateDebut: form.dateDebut || null, dateFin: form.dateFin || null };

    try {
        const res = await fetch("/api/employes", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        if (res.ok) { 
            toast.success(isEditing ? "Dossier mis à jour" : "Recrutement validé ! 📧"); 
            setIsModalOpen(false); fetchEmployes(); 
        } else { toast.error("Erreur (Email pris ?)"); }
    } catch (e) { toast.error("Erreur serveur"); } 
    finally { setFormLoading(false); }
  };

  const handleDelete = async () => {
    if(!confirmDeleteId) return;
    try {
        await fetch(`/api/employes?id=${confirmDeleteId}`, { method: "DELETE" });
        toast.success("Employé supprimé des effectifs"); fetchEmployes(); 
    } catch(e) { toast.error("Erreur suppression"); }
    setConfirmDeleteId(null);
  };

  const handleResetPassword = async () => {
    if(!form.id_employe) return;
    if(!confirm("Générer un nouveau mot de passe et l'envoyer par email ?")) return;
    setResetLoading(true);
    try {
        const res = await fetch("/api/employes/reset-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id_employe: form.id_employe }) });
        if(res.ok) toast.success("Nouveaux accès envoyés ! 📧");
        else toast.error("Erreur reset");
    } catch(e) { toast.error("Erreur"); }
    finally { setResetLoading(false); }
  };

  if (loading) return <div className="min-h-screen bg-[#030712] flex items-center justify-center"><Loader2 className="animate-spin text-white"/></div>;

  return (
    <div className="min-h-screen bg-[#030712] text-gray-200 p-8">
      <div className="max-w-7xl mx-auto space-y-8 animate-fade-in">
        
        {/* HEADER RH */}
        <header className="flex justify-between items-center glass-panel p-6 rounded-2xl border-l-4 border-pink-500">
             <div className="flex items-center gap-4">
                <div className="p-3 bg-pink-500/10 rounded-xl text-pink-500"><Users className="w-8 h-8"/></div>
                <div>
                    <h1 className="text-2xl font-bold text-white">Portail Ressources Humaines</h1>
                    <p className="text-sm text-gray-400">Gestion des effectifs, recrutements et absences</p>
                </div>
             </div>
             <button onClick={() => router.push('/employe/dashboard')} className="px-4 py-2 rounded-xl border border-white/10 hover:bg-white/5 text-gray-300 flex items-center gap-2">
                <ArrowLeft className="w-4 h-4"/> Retour Dashboard
             </button>
        </header>

        {/* NAVIGATION ONGLETS */}
        <div className="flex gap-6 border-b border-white/10 pb-1">
            <button onClick={() => setActiveTab("EFFECTIFS")} className={`pb-3 px-2 text-sm font-bold transition flex items-center gap-2 ${activeTab === "EFFECTIFS" ? "text-pink-400 border-b-2 border-pink-400" : "text-gray-500 hover:text-white"}`}>
                <Users className="w-4 h-4"/> Effectifs
            </button>
            <button onClick={() => setActiveTab("RECRUTEMENT")} className={`pb-3 px-2 text-sm font-bold transition flex items-center gap-2 ${activeTab === "RECRUTEMENT" ? "text-pink-400 border-b-2 border-pink-400" : "text-gray-500 hover:text-white"}`}>
                <Briefcase className="w-4 h-4"/> Recrutement
            </button>
            <button onClick={() => setActiveTab("CONGES")} className={`pb-3 px-2 text-sm font-bold transition flex items-center gap-2 ${activeTab === "CONGES" ? "text-pink-400 border-b-2 border-pink-400" : "text-gray-500 hover:text-white"}`}>
                <Sun className="w-4 h-4"/> Congés
                {/* Badge de notif */}
                {conges.filter(c => c.statut === 'EN_ATTENTE').length > 0 && (
                    <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                        {conges.filter(c => c.statut === 'EN_ATTENTE').length}
                    </span>
                )}
            </button>
        </div>

        {/* --- ONGLET 1 : GESTION DES EFFECTIFS --- */}
        {activeTab === "EFFECTIFS" && (
            <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="glass-panel p-6 rounded-2xl border border-white/5">
                        <p className="text-gray-400 text-xs font-bold uppercase">Effectif Total</p>
                        <p className="text-4xl font-bold text-white mt-2">{employes.length}</p>
                    </div>
                    <div className="glass-panel p-6 rounded-2xl border border-white/5">
                        <p className="text-gray-400 text-xs font-bold uppercase">Développeurs</p>
                        <p className="text-4xl font-bold text-blue-400 mt-2">{employes.filter(e => e.role === 'DEVELOPPEUR').length}</p>
                    </div>
                    <div className="glass-panel p-6 rounded-2xl border border-white/5 flex items-center justify-between cursor-pointer hover:bg-pink-500/10 transition" onClick={openCreate}>
                        <div><p className="text-pink-400 text-xs font-bold uppercase">Action Rapide</p><p className="text-xl font-bold text-white mt-1">Recruter +</p></div>
                        <UserPlus className="w-8 h-8 text-pink-500"/>
                    </div>
                </div>

                <div className="glass-panel rounded-2xl overflow-hidden border border-white/10">
                    <div className="p-4 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                        <h2 className="text-lg font-bold text-white pl-2">Annuaire du Personnel</h2>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500"/>
                            <input type="text" placeholder="Rechercher..." className="glass-input pl-9 py-2 w-64 text-sm bg-[#0f172a]" value={search} onChange={e => setSearch(e.target.value)} />
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-left">
                            <thead className="bg-white/5 border-b border-white/10 text-gray-400 text-xs uppercase font-semibold">
                                <tr><th className="px-6 py-4">Identité</th><th className="px-6 py-4">Rôle</th><th className="px-6 py-4">Contrat</th><th className="px-6 py-4 text-right">Actions</th></tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {employes.filter(e => e.nom.toLowerCase().includes(search.toLowerCase()) || e.email.toLowerCase().includes(search.toLowerCase())).map(emp => (
                                    <tr key={emp.id_employe} className="hover:bg-white/5 transition group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center font-bold text-white text-xs">{emp.prenom[0]}{emp.nom[0]}</div>
                                                <div><div className="font-bold text-white text-sm">{emp.prenom} {emp.nom}</div><div className="text-xs text-gray-500">{emp.email}</div></div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4"><span className={`px-2 py-1 rounded text-[10px] font-bold border uppercase tracking-wider ${emp.role === 'ADMIN' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : emp.role === 'RH' ? 'bg-pink-500/10 text-pink-400 border-pink-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>{emp.role}</span></td>
                                        <td className="px-6 py-4 text-xs text-gray-400 font-mono">{emp.date_debut_validite ? new Date(emp.date_debut_validite).toLocaleDateString() : "CDI"} <span className="mx-2">➔</span> {emp.date_fin_validite ? new Date(emp.date_fin_validite).toLocaleDateString() : "∞"}</td>
                                        <td className="px-6 py-4 text-right">
                                            {emp.role !== 'ADMIN' && (
                                                <div className="flex justify-end gap-2 opacity-60 group-hover:opacity-100 transition">
                                                    <button onClick={() => openEdit(emp)} className="p-2 hover:bg-blue-500/20 text-blue-400 rounded-lg transition"><Pencil className="w-4 h-4"/></button>
                                                    <button onClick={() => setConfirmDeleteId(emp.id_employe)} className="p-2 hover:bg-red-500/20 text-red-400 rounded-lg transition"><Trash2 className="w-4 h-4"/></button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </>
        )}

        {/* --- ONGLET 2 : RECRUTEMENT --- */}
        {activeTab === "RECRUTEMENT" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
                <div className="glass-panel p-6 rounded-2xl border border-white/10">
                    <div className="flex justify-between mb-4"><h3 className="font-bold text-white">Offres publiées</h3><button className="text-pink-400 text-xs font-bold hover:underline">+ Créer une offre</button></div>
                    <div className="space-y-3">
                        {offres.map(offre => (
                            <div key={offre.id} className="p-4 bg-white/5 rounded-xl border border-white/5 flex justify-between items-center">
                                <div><p className="text-white font-bold text-sm">{offre.titre}</p><p className="text-xs text-gray-500">{offre.statut} • {offre.cands} Candidatures</p></div>
                                <button className="p-2 bg-white/10 rounded-lg text-gray-300 hover:text-white"><Pencil className="w-4 h-4"/></button>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="glass-panel p-6 rounded-2xl border border-white/10">
                    <h3 className="font-bold text-white mb-4">Candidatures récentes</h3>
                    <div className="space-y-3">
                        <div className="p-3 border border-white/10 rounded-xl bg-white/[0.02]">
                            <div className="flex justify-between"><p className="text-sm font-bold text-white">Lucas B.</p><span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded">Pour: Dev React</span></div>
                            <div className="flex gap-2 mt-3">
                                <button className="flex-1 py-1 bg-green-500/10 text-green-400 text-xs rounded font-bold hover:bg-green-500/20">Accepter</button>
                                <button className="flex-1 py-1 bg-red-500/10 text-red-400 text-xs rounded font-bold hover:bg-red-500/20">Refuser</button>
                                <button className="flex-1 py-1 bg-white/10 text-gray-300 text-xs rounded font-bold hover:bg-white/20"><FileText className="w-3 h-3 inline"/> CV</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* --- ONGLET 3 : CONGÉS --- */}
        {activeTab === "CONGES" && (
            <div className="space-y-6 animate-fade-in">

                {/* KPI + ALERTE DU JOUR */}
                <div className={`glass-panel p-6 rounded-2xl border ${statsJour?.alerte50pct ? "border-red-500/50 bg-red-500/5" : "border-white/10"}`}>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-xl ${statsJour?.alerte50pct ? "bg-red-500/20 text-red-400" : "bg-pink-500/10 text-pink-400"}`}>
                                {statsJour?.alerte50pct ? <AlertTriangle className="w-7 h-7"/> : <Sun className="w-7 h-7"/>}
                            </div>
                            <div>
                                <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Employés en congé</p>
                                <p className={`text-4xl font-bold ${statsJour?.alerte50pct ? "text-red-400" : "text-white"}`}>
                                    {statsJour ? `${statsJour.pourcentage}%` : "—"}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                    {statsJour ? `${statsJour.enConge} / ${statsJour.totalEmployes} employé${statsJour.totalEmployes > 1 ? "s" : ""}` : "Chargement..."}
                                    {projetFilter && projets.find(p => p.id_projet === projetFilter) && (
                                        <span className="ml-2 text-pink-400">— {projets.find(p => p.id_projet === projetFilter)?.nom_projet}</span>
                                    )}
                                </p>
                            </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                            <label className="text-xs text-gray-500 font-bold uppercase">Jour consulté</label>
                            <input
                                type="date"
                                value={statsDate}
                                onChange={e => setStatsDate(e.target.value)}
                                className="glass-input text-sm bg-[#0f172a] px-3 py-2 rounded-lg border border-white/10"
                            />
                        </div>
                    </div>
                    {statsJour?.alerte50pct && (
                        <div className="mt-4 flex items-center gap-2 text-sm font-bold text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                            <AlertTriangle className="w-4 h-4 shrink-0"/>
                            ALERTE — {statsJour.pourcentage}% des effectifs{projetFilter && projets.find(p => p.id_projet === projetFilter) ? ` du projet "${projets.find(p => p.id_projet === projetFilter)?.nom_projet}"` : ""} sont en congé ce jour. Capacité critique !
                        </div>
                    )}
                </div>

                {/* FILTRES */}
                <div className="glass-panel p-4 rounded-2xl border border-white/10 flex flex-wrap gap-4 items-center">
                    <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4 text-gray-500"/>
                        <span className="text-xs text-gray-400 font-bold uppercase">Filtres</span>
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] text-gray-500 font-bold uppercase ml-1">Projet</label>
                        <select
                            value={projetFilter}
                            onChange={e => setProjetFilter(e.target.value)}
                            className="glass-input text-sm bg-[#0f172a] px-3 py-2 rounded-lg border border-white/10 min-w-[180px]"
                        >
                            <option value="">Tous les projets</option>
                            {projets.map(p => (
                                <option key={p.id_projet} value={p.id_projet}>{p.nom_projet}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] text-gray-500 font-bold uppercase ml-1">Statut</label>
                        <select
                            value={statutFilter}
                            onChange={e => setStatutFilter(e.target.value)}
                            className="glass-input text-sm bg-[#0f172a] px-3 py-2 rounded-lg border border-white/10"
                        >
                            <option value="TOUS">Tous</option>
                            <option value="EN_ATTENTE">En attente</option>
                            <option value="VALIDE">Validé</option>
                            <option value="REFUSE">Refusé</option>
                        </select>
                    </div>
                </div>

                {/* LISTE DES CONGÉS */}
                <div className="glass-panel p-6 rounded-2xl border border-white/10">
                    <h2 className="text-lg font-bold text-white mb-4">
                        Congés
                        <span className="ml-2 text-sm font-normal text-gray-500">
                            ({conges.filter(c => statutFilter === "TOUS" || c.statut === statutFilter).length} résultat{conges.filter(c => statutFilter === "TOUS" || c.statut === statutFilter).length > 1 ? "s" : ""})
                        </span>
                    </h2>

                    {conges.filter(c => statutFilter === "TOUS" || c.statut === statutFilter).length === 0 && (
                        <p className="text-gray-500 text-sm italic text-center py-10">Aucun congé pour ces filtres.</p>
                    )}

                    <div className="space-y-3">
                        {conges
                            .filter(c => statutFilter === "TOUS" || c.statut === statutFilter)
                            .map(c => (
                            <div key={c.id_conge} className="p-4 bg-white/5 rounded-xl border border-white/5 flex justify-between items-center group hover:border-pink-500/30 transition">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-pink-500/20 flex items-center justify-center text-pink-400 font-bold uppercase">
                                        {c.employe?.prenom?.[0] || "?"}{c.employe?.nom?.[0] || "?"}
                                    </div>
                                    <div>
                                        <p className="text-white font-bold text-sm">{c.employe?.prenom} {c.employe?.nom}</p>
                                        <p className="text-xs text-gray-400 flex gap-2 items-center mt-1">
                                            <span className="bg-white/10 px-1.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wide">{c.type}</span>
                                            <span>Du {new Date(c.date_debut).toLocaleDateString()} au {new Date(c.date_fin).toLocaleDateString()}</span>
                                        </p>
                                        {c.commentaire && <p className="text-xs text-gray-500 mt-1 italic">"{c.commentaire}"</p>}
                                    </div>
                                </div>

                                {c.statut === "EN_ATTENTE" ? (
                                    <div className="flex gap-2">
                                        <button onClick={() => handleConges(c.id_conge, "VALIDE")} className="px-3 py-1.5 bg-green-500/10 hover:bg-green-500/20 text-green-400 rounded-lg text-xs font-bold transition flex items-center gap-1">
                                            <CheckCircle2 className="w-3 h-3"/> Valider
                                        </button>
                                        <button onClick={() => handleConges(c.id_conge, "REFUSE")} className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-xs font-bold transition flex items-center gap-1">
                                            <XCircle className="w-3 h-3"/> Refuser
                                        </button>
                                    </div>
                                ) : (
                                    <span className={`text-xs font-bold px-3 py-1 rounded-full border ${
                                        c.statut === "VALIDE" ? "bg-green-500/10 text-green-400 border-green-500/20" :
                                        "bg-red-500/10 text-red-400 border-red-500/20"
                                    }`}>
                                        {c.statut}
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )}

        {/* MODALE SUPPRESSION */}
        {confirmDeleteId && (
            <div className="fixed inset-0 bg-black/80 flex justify-center items-center z-[60] backdrop-blur-sm">
                <div className="glass-panel p-6 rounded-2xl text-center border border-red-500/30 w-full max-w-sm">
                    <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4 text-red-500"><Trash2 className="w-6 h-6"/></div>
                    <h3 className="text-lg font-bold text-white mb-2">Licencier l'employé ?</h3>
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
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="glass-panel p-8 rounded-2xl w-full max-w-lg border border-white/10 bg-[#0f172a] relative shadow-2xl">
                    <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white transition"><X className="w-5 h-5"/></button>
                    <h2 className="text-2xl font-bold text-white mb-1 flex items-center gap-3">{isEditing ? <Pencil className="w-6 h-6 text-pink-400"/> : <UserPlus className="w-6 h-6 text-pink-400"/>}{isEditing ? "Modifier le Dossier" : "Nouveau Contrat"}</h2>
                    <p className="text-sm text-gray-500 mb-6">Informations administratives.</p>
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className="text-xs text-gray-500 font-bold mb-1.5 block ml-1">Prénom</label><input type="text" required className="glass-input w-full" value={form.prenom} onChange={e => setForm({...form, prenom: e.target.value})} /></div>
                            <div><label className="text-xs text-gray-500 font-bold mb-1.5 block ml-1">Nom</label><input type="text" required className="glass-input w-full" value={form.nom} onChange={e => setForm({...form, nom: e.target.value})} /></div>
                        </div>
                        <div><label className="text-xs text-gray-500 font-bold mb-1.5 block ml-1">Email Pro</label><input type="email" required className="glass-input w-full" value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></div>
                        <div>
                            <label className="text-xs text-gray-500 font-bold mb-1.5 block ml-1">Poste / Rôle</label>
                            <select className="glass-input w-full bg-[#0f172a]" value={form.role} onChange={e => setForm({...form, role: e.target.value})}>
                                <option value="EMPLOYE">Employé Standard</option>
                                <option value="DEVELOPPEUR">Développeur</option>
                                <option value="CHEF_DE_PROJET">Chef de Projet</option>
                                <option value="STAGIAIRE">Stagiaire</option>
                                <option value="RH">Ressources Humaines</option>
                            </select>
                        </div>
                        <div className="border-t border-white/10 pt-4 mt-2">
                            <label className="flex items-center gap-2 text-xs font-bold text-gray-400 mb-3 uppercase tracking-wider"><Calendar className="w-3 h-3"/> Durée du Contrat</label>
                            <div className="grid grid-cols-2 gap-4">
                                <input type="date" className="glass-input w-full text-sm" value={form.dateDebut} onChange={e => setForm({...form, dateDebut: e.target.value})} />
                                <input type="date" className="glass-input w-full text-sm" value={form.dateFin} onChange={e => setForm({...form, dateFin: e.target.value})} />
                            </div>
                        </div>
                        {isEditing && (
                            <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between bg-white/5 p-3 rounded-xl border border-white/10">
                                <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center text-orange-500"><RotateCcw className="w-4 h-4"/></div><div><p className="text-xs font-bold text-white uppercase">Sécurité</p><p className="text-[10px] text-gray-400">Réinitialiser accès</p></div></div>
                                <button type="button" onClick={handleResetPassword} disabled={resetLoading} className="text-xs bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/20 px-3 py-2 rounded-lg transition font-medium flex items-center gap-2">{resetLoading && <Loader2 className="w-3 h-3 animate-spin"/>} Envoyer Email</button>
                            </div>
                        )}
                        <div className="flex justify-end gap-3 mt-6">
                            <button type="button" onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white px-4 py-2 rounded-lg transition text-sm">Annuler</button>
                            <button type="submit" disabled={formLoading} className="btn-neon-blue px-6 py-2 rounded-lg font-bold text-white shadow-lg flex items-center gap-2">{formLoading && <Loader2 className="w-4 h-4 animate-spin"/>}{isEditing ? "Mettre à jour" : "Valider Contrat"}</button>
                        </div>
                    </form>
                </div>
            </div>
        )}

      </div>
    </div>
  );
}