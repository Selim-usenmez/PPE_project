"use client";

import { useEffect, useState } from "react";
import AdminSidebar from "../../components/AdminSidebar"; 
import { toast } from "sonner";
import { 
  Plus, Pencil, Trash2, Search, Mail, 
  Loader2, X, ShieldCheck, Filter, 
  Upload, FileSpreadsheet, Download, CheckCircle2, AlertOctagon, FileText,
  UserCog, Eye // 👈 J'ai ajouté l'icône Eye
} from "lucide-react";

export default function AdminEmployesPage() {
  const [employes, setEmployes] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  // RECHERCHE & FILTRES
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("TOUS");

  // ÉTATS UI
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"INFO" | "LOGS">("INFO");
  
  // LOGS
  const [targetLogs, setTargetLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // ACTIONS
  const [isEditing, setIsEditing] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  // IMPORT
  const [importProgress, setImportProgress] = useState(0);
  const [importReport, setImportReport] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);

  const [form, setForm] = useState({ id_employe: "", nom: "", prenom: "", email: "", role: "EMPLOYE", dateDebut: "", dateFin: "" });

  useEffect(() => { 
      const userStr = localStorage.getItem("user_info");
      if(userStr) setCurrentUser(JSON.parse(userStr));
      loadEmployes(); 
  }, []);

  const loadEmployes = async () => { 
      try { const res = await fetch("/api/employes"); if (res.ok) setEmployes(await res.json()); } 
      catch (e) { toast.error("Erreur chargement"); }
  };

  const fetchTargetLogs = async (email: string) => {
      setLoadingLogs(true);
      setTargetLogs([]);
      try {
          const res = await fetch(`/api/logs/search?q=${email}`);
          if (res.ok) setTargetLogs(await res.json());
      } catch(e) { console.error("Erreur logs", e); }
      finally { setLoadingLogs(false); }
  };

  const filteredEmployes = employes.filter((emp) => {
    const matchesSearch = emp.nom.toLowerCase().includes(search.toLowerCase()) || emp.prenom.toLowerCase().includes(search.toLowerCase()) || emp.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === "TOUS" || emp.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  // --- ACTIONS CRUD ---
  const openCreate = () => { 
      setForm({ id_employe: "", nom: "", prenom: "", email: "", role: "EMPLOYE", dateDebut: "", dateFin: "" }); 
      setIsEditing(false); 
      setActiveTab("INFO"); 
      setIsModalOpen(true); 
  };
  
  const openEdit = (emp: any) => {
    setForm({
      id_employe: emp.id_employe, nom: emp.nom, prenom: emp.prenom, email: emp.email, role: emp.role,
      dateDebut: emp.date_debut_validite ? new Date(emp.date_debut_validite).toISOString().split('T')[0] : "",
      dateFin: emp.date_fin_validite ? new Date(emp.date_fin_validite).toISOString().split('T')[0] : ""
    });
    setIsEditing(true); 
    setActiveTab("INFO"); 
    setIsModalOpen(true); 
    fetchTargetLogs(emp.email); 
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(form.email)) { toast.error("Email invalide"); return; }
    setLoading(true);
    const method = isEditing ? "PUT" : "POST";
    const payload = { ...form, dateDebut: form.dateDebut || null, dateFin: form.dateFin || null, adminId: currentUser?.id_employe };
    try {
        const res = await fetch("/api/employes", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        if (res.ok) { toast.success(isEditing ? "Mis à jour" : "Compte créé !"); setIsModalOpen(false); loadEmployes(); } 
        else { const data = await res.json(); toast.error(data.error); }
    } catch (e) { toast.error("Erreur serveur"); } finally { setLoading(false); }
  };

  const handleDelete = async () => {
    if(!confirmDeleteId) return;
    try { await fetch(`/api/employes?id=${confirmDeleteId}&adminId=${currentUser?.id_employe}`, { method: "DELETE" }); toast.success("Supprimé"); loadEmployes(); } 
    catch(e) { toast.error("Erreur suppression"); }
    setConfirmDeleteId(null);
  };

  const handleResetPassword = async () => {
    if(!form.id_employe || !confirm("Regénérer MDP ?")) return;
    setResetLoading(true);
    try {
        const res = await fetch("/api/employes/reset-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id_employe: form.id_employe }) });
        if(res.ok) toast.success("Email envoyé !"); else toast.error("Erreur");
    } catch(e) { toast.error("Erreur"); } finally { setResetLoading(false); }
  };

  const handleSmartImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvFile) return toast.error("Fichier requis");
    setIsProcessing(true); setImportProgress(0); setImportReport(null);

    const CHUNK_SIZE = 3; 
    const text = await csvFile.text();
    let rows = text.split("\n").map(r => r.trim()).filter(r => r.length > 0);
    if(rows[0].toLowerCase().includes("email")) rows.shift();
    if (rows.length === 0) { toast.error("Fichier vide !"); setIsProcessing(false); return; }

    const report = { success: [] as any[], errors: [] as any[] };
    let processedCount = 0;

    for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
        const chunk = rows.slice(i, i + CHUNK_SIZE);
        const blob = new Blob([chunk.join("\n")], { type: "text/csv" });
        const formData = new FormData();
        formData.append("file", blob);

        try {
            const res = await fetch("/api/employes/import", { method: "POST", body: formData });
            const data = await res.json();
            if (res.ok && data.results) {
                data.results.forEach((item: any) => { if (item.status === "SUCCESS") report.success.push(item); else report.errors.push(item); });
            } else { chunk.forEach(row => report.errors.push({ name: "Erreur Bloc", email: "API", reason: "Crash" })); }
        } catch (err) { chunk.forEach(row => report.errors.push({ name: "Erreur Bloc", email: "Réseau", reason: "Timeout" })); }

        processedCount += chunk.length;
        setImportProgress(Math.round((processedCount / rows.length) * 100));
    }
    setImportReport(report); setIsProcessing(false); loadEmployes(); toast.success("Terminé !");
  };

  const downloadTemplate = () => { const link = document.createElement("a"); link.href = "data:text/csv;charset=utf-8,Nom,Prenom,Email,Role,DateDebut,DateFin\nDupont,Jean,jean@test.com,EMPLOYE,,"; link.download = "template.csv"; link.click(); };

  return (
    <div className="min-h-screen text-gray-200 bg-[#030712]">
      <AdminSidebar /> 
      <main className="ml-64 p-8 animate-fade-in relative">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div><h1 className="text-3xl font-bold text-white">Employés & Contrats</h1><p className="text-gray-400 text-sm mt-1">Gérez les accès et rôles</p></div>
            <div className="flex gap-3">
                <button onClick={() => { setIsImportModalOpen(true); setImportReport(null); setCsvFile(null); setImportProgress(0); }} className="px-5 py-2.5 rounded-xl border border-white/10 hover:bg-white/5 text-gray-300 font-bold flex items-center gap-2 transition-all"><Upload className="w-5 h-5" /> Import CSV</button>
                <button onClick={openCreate} className="btn-neon-blue px-5 py-2.5 rounded-xl font-bold text-white shadow-lg flex items-center gap-2 hover:scale-105 transition-transform"><Plus className="w-5 h-5" /> Nouveau Collaborateur</button>
            </div>
        </div>
        
        {/* FILTRES & TABLEAU */}
        <div className="glass-panel rounded-2xl overflow-hidden border border-white/10 shadow-2xl mb-6">
            <div className="p-4 bg-white/[0.02] flex flex-col md:flex-row gap-4">
                <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" /><input type="text" placeholder="Rechercher..." className="w-full bg-[#0f172a] border border-white/10 rounded-lg py-2.5 pl-9 pr-4 text-sm focus:border-blue-500 outline-none text-gray-300" value={search} onChange={(e) => setSearch(e.target.value)}/></div>
                <div className="relative w-full md:w-64"><Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" /><select className="w-full bg-[#0f172a] border border-white/10 rounded-lg py-2.5 pl-9 pr-4 text-sm focus:border-blue-500 outline-none text-gray-300 appearance-none cursor-pointer" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}><option value="TOUS">Tous les rôles</option><option value="ADMIN">Administrateurs</option><option value="RH">Ressources Humaines</option><option value="CHEF_DE_PROJET">Chefs de Projet</option><option value="DEVELOPPEUR">Développeurs</option><option value="EMPLOYE">Employés</option><option value="STAGIAIRE">Stagiaires</option></select></div>
            </div>
            
            <div className="overflow-x-auto">
                <table className="min-w-full text-left">
                    <thead className="bg-white/5 border-b border-white/10 text-gray-400 text-xs uppercase font-semibold"><tr><th className="px-6 py-4">Identité</th><th className="px-6 py-4">Rôle</th><th className="px-6 py-4">Validité</th><th className="px-6 py-4 text-right">Actions</th></tr></thead>
                    <tbody className="divide-y divide-white/5">
                        {filteredEmployes.map(emp => (
                            <tr 
                                key={emp.id_employe} 
                                onClick={() => openEdit(emp)} // 👈 LIGNE CLIQUABLE
                                className="hover:bg-white/5 transition group cursor-pointer" // 👈 CURSEUR MAIN
                            >
                                <td className="px-6 py-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center font-bold text-white">{emp.prenom[0]}{emp.nom[0]}</div><div><div className="font-bold text-white">{emp.prenom} {emp.nom}</div><div className="text-xs text-gray-500 flex items-center gap-1"><Mail className="w-3 h-3" /> {emp.email}</div></div></div></td>
                                <td className="px-6 py-4"><span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold border uppercase tracking-wider ${emp.role === 'ADMIN' ? 'bg-purple-500/10 border-purple-500/20 text-purple-300' : 'bg-slate-500/10 border-slate-500/20 text-slate-300'}`}>{emp.role === 'ADMIN' && <ShieldCheck className="w-3 h-3" />}{emp.role}</span></td>
                                <td className="px-6 py-4 text-sm text-gray-400 font-mono">{emp.date_debut_validite ? new Date(emp.date_debut_validite).toLocaleDateString() : "∞"} <span className="mx-2 text-gray-600">➔</span> {emp.date_fin_validite ? new Date(emp.date_fin_validite).toLocaleDateString() : "∞"}</td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                                        <button 
                                            title="Voir / Modifier"
                                            className="p-2 rounded-lg hover:bg-blue-500/20 text-blue-400 transition cursor-pointer z-10"
                                        >
                                            <Eye className="w-4 h-4" /> {/* 👈 Icône Voir */}
                                        </button>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(emp.id_employe); }} 
                                            className="p-2 rounded-lg hover:bg-red-500/20 text-red-400 transition cursor-pointer z-10"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>

        {/* MODALE SUPPRESSION */}
        {confirmDeleteId && (<div className="fixed inset-0 bg-black/80 flex justify-center items-center z-[60] backdrop-blur-sm"><div className="glass-panel p-6 rounded-2xl text-center border border-red-500/30 w-full max-w-sm"><h3 className="text-lg font-bold text-white mb-2">Supprimer ?</h3><div className="flex gap-3"><button onClick={() => setConfirmDeleteId(null)} className="flex-1 py-2 rounded-lg border border-white/10 hover:bg-white/5 transition text-sm">Annuler</button><button onClick={handleDelete} className="flex-1 bg-red-500 hover:bg-red-600 text-white rounded-lg py-2 text-sm font-bold transition">Confirmer</button></div></div></div>)}

        {/* MODALE IMPORT CSV */}
        {isImportModalOpen && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="glass-panel p-8 rounded-2xl w-full max-w-lg border border-white/10 bg-[#0f172a] relative shadow-2xl animate-in zoom-in-95">
                    
                    {!importReport ? (
                        <>
                            <button onClick={() => !isProcessing && setIsImportModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white"><X className="w-5 h-5"/></button>
                            <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2"><FileSpreadsheet className="w-6 h-6 text-green-400"/> Import de masse</h2>
                            <p className="text-sm text-gray-400 mb-6">Importez une liste d'employés via CSV.</p>

                            <form onSubmit={handleSmartImport} className="space-y-6">
                                <div className="bg-white/5 border-2 border-dashed border-white/10 rounded-xl p-6 text-center hover:bg-white/10 transition cursor-pointer relative">
                                    <input type="file" accept=".csv" disabled={isProcessing} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={(e) => setCsvFile(e.target.files?.[0] || null)}/>
                                    <div className="flex flex-col items-center gap-2">
                                        <Upload className={`w-8 h-8 ${csvFile ? 'text-green-400' : 'text-gray-500'}`}/>
                                        <p className="text-sm font-bold text-gray-300">{csvFile ? csvFile.name : "Cliquez pour déposer un fichier"}</p>
                                    </div>
                                </div>
                                {isProcessing && (
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-xs text-gray-400"><span>Traitement...</span><span>{importProgress}%</span></div>
                                        <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden"><div className="bg-blue-500 h-full transition-all duration-300" style={{ width: `${importProgress}%` }}></div></div>
                                    </div>
                                )}
                                <div className="flex justify-between items-center text-xs">
                                    <button type="button" onClick={downloadTemplate} className="text-blue-400 hover:text-blue-300 flex items-center gap-1 hover:underline"><Download className="w-3 h-3"/> Modèle CSV</button>
                                </div>
                                <button type="submit" disabled={isProcessing || !csvFile} className="w-full btn-neon-blue py-3 rounded-xl font-bold text-white shadow-lg flex items-center justify-center gap-2 disabled:opacity-50">
                                    {isProcessing ? <Loader2 className="w-5 h-5 animate-spin"/> : <Upload className="w-5 h-5"/>}
                                    {isProcessing ? "Importation en cours..." : "Lancer l'import"}
                                </button>
                            </form>
                        </>
                    ) : (
                        <>
                            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2"><FileText className="w-6 h-6 text-blue-400"/> Rapport d'Importation</h2>
                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div className="bg-green-500/10 border border-green-500/20 p-3 rounded-xl text-center"><p className="text-2xl font-bold text-green-400">{importReport.success.length}</p><p className="text-xs text-green-300 uppercase">Réussis</p></div>
                                <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl text-center"><p className="text-2xl font-bold text-red-400">{importReport.errors.length}</p><p className="text-xs text-red-300 uppercase">Échecs</p></div>
                            </div>
                            <div className="bg-black/20 rounded-xl p-4 h-64 overflow-y-auto custom-scrollbar border border-white/5 space-y-2">
                                {importReport.errors.length === 0 && importReport.success.length > 0 && (<div className="text-center text-gray-500 py-10 flex flex-col items-center"><CheckCircle2 className="w-10 h-10 text-green-500 mb-2"/><p>Aucune erreur ! Tout est parfait.</p></div>)}
                                {importReport.errors.map((err: any, i: number) => (<div key={i} className="flex items-start gap-3 text-xs bg-red-900/10 p-2 rounded-lg border border-red-900/20"><AlertOctagon className="w-4 h-4 text-red-500 shrink-0 mt-0.5"/><div><p className="font-bold text-red-300">{err.name} ({err.email})</p><p className="text-red-400/70">{err.reason}</p></div></div>))}
                                {importReport.success.map((succ: any, i: number) => (<div key={i} className="flex items-start gap-3 text-xs bg-green-900/10 p-2 rounded-lg border border-green-900/20"><CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5"/><div><p className="font-bold text-green-300">{succ.name}</p><p className="text-green-400/70">Compte créé</p></div></div>))}
                            </div>
                            <button onClick={() => setIsImportModalOpen(false)} className="w-full mt-4 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-bold text-white transition">Fermer le rapport</button>
                        </>
                    )}
                </div>
            </div>
        )}

        {/* MODALE CRÉATION / ÉDITION / HISTORIQUE */}
        {isModalOpen && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="glass-panel p-8 rounded-2xl w-full max-w-lg border border-white/10 bg-[#0f172a] relative animate-fade-in-up shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                    <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white transition"><X className="w-5 h-5" /></button>
                    
                    <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                        {isEditing ? <Pencil className="w-6 h-6 text-blue-400" /> : <Plus className="w-6 h-6 text-blue-400" />}
                        {isEditing ? "Détails & Édition" : "Nouveau Compte"}
                    </h2>
                    
                    {isEditing && (
                        <div className="flex bg-white/5 p-1 rounded-xl mb-6">
                            <button onClick={() => setActiveTab("INFO")} className={`flex-1 py-2 rounded-lg text-sm font-bold transition ${activeTab === "INFO" ? "bg-blue-600 text-white shadow" : "text-gray-400 hover:text-white"}`}>Informations</button>
                            <button onClick={() => setActiveTab("LOGS")} className={`flex-1 py-2 rounded-lg text-sm font-bold transition ${activeTab === "LOGS" ? "bg-blue-600 text-white shadow" : "text-gray-400 hover:text-white"}`}>Historique</button>
                        </div>
                    )}

                    {activeTab === "INFO" && (
                        <form onSubmit={handleSubmit} className="space-y-5 overflow-y-auto custom-scrollbar pr-2">
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="text-xs text-gray-500 font-bold mb-1 block">Prénom</label><input type="text" required className="glass-input w-full" value={form.prenom} onChange={e => setForm({...form, prenom: e.target.value})} /></div>
                                <div><label className="text-xs text-gray-500 font-bold mb-1 block">Nom</label><input type="text" required className="glass-input w-full" value={form.nom} onChange={e => setForm({...form, nom: e.target.value})} /></div>
                            </div>
                            <div><label className="text-xs text-gray-500 font-bold mb-1 block">Email</label><input type="email" required className="glass-input w-full" value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></div>
                            <div><label className="text-xs text-gray-500 font-bold mb-1 block">Rôle</label><select className="glass-input w-full bg-[#0f172a]" value={form.role} onChange={e => setForm({...form, role: e.target.value})}><option value="EMPLOYE">Employé Standard</option><option value="DEVELOPPEUR">Développeur</option><option value="CHEF_DE_PROJET">Chef de Projet</option><option value="RH">Ressources Humaines</option><option value="ADMIN">Administrateur</option></select></div>
                            <div className="grid grid-cols-2 gap-4">
                                <input type="date" className="glass-input w-full text-sm" value={form.dateDebut} onChange={e => setForm({...form, dateDebut: e.target.value})} />
                                <input type="date" className="glass-input w-full text-sm" value={form.dateFin} onChange={e => setForm({...form, dateFin: e.target.value})} />
                            </div>
                            {isEditing && <button type="button" onClick={handleResetPassword} disabled={resetLoading} className="w-full mt-2 text-xs bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/20 px-3 py-2 rounded-lg transition font-medium flex items-center justify-center gap-2">{resetLoading && <Loader2 className="w-3 h-3 animate-spin" />} Réinitialiser MDP</button>}
                            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-white/10">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white px-4 py-2 rounded-lg transition text-sm">Annuler</button>
                                <button type="submit" disabled={loading} className="btn-neon-blue px-6 py-2 rounded-lg font-bold text-white shadow-lg flex items-center gap-2">{loading && <Loader2 className="w-4 h-4 animate-spin" />}{isEditing ? "Sauvegarder" : "Créer"}</button>
                            </div>
                        </form>
                    )}

                    {activeTab === "LOGS" && (
                        <div className="h-64 overflow-y-auto custom-scrollbar pr-2 space-y-4">
                            {loadingLogs ? <div className="text-center py-10"><Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto"/></div> : 
                            targetLogs.length === 0 ? <p className="text-center text-gray-500 py-10 italic">Aucune action récente enregistrée pour cet utilisateur.</p> :
                            targetLogs.map((log) => (
                                <div key={log.id_action} className="bg-white/5 p-3 rounded-xl border border-white/5 flex items-start gap-3">
                                    <div className="mt-1 p-1.5 bg-blue-500/10 rounded-lg text-blue-400"><UserCog className="w-4 h-4"/></div>
                                    <div>
                                        <p className="text-sm text-white font-bold">{log.action.replace(/_/g, " ")}</p>
                                        <p className="text-xs text-gray-400 mt-0.5">{new Date(log.createdAt).toLocaleString()}</p>
                                        <div className="mt-2 flex items-center gap-1.5 text-[10px] bg-black/30 px-2 py-1 rounded w-fit text-gray-300">
                                            <span>Par :</span>
                                            <span className="text-blue-300 font-bold">{log.employe ? `${log.employe.prenom} ${log.employe.nom}` : "Système"}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        )}
      </main>
    </div>
  );
}