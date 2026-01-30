"use client";

import { useEffect, useState } from "react";
import AdminSidebar from "../../components/AdminSidebar";
import { toast } from "sonner";
import { 
  DoorOpen, Plus, Pencil, Trash2, Users, MapPin, 
  Monitor, Projector, Armchair, Box, CheckSquare, Square, 
  X, Save, Loader2, LayoutGrid, Search, Filter, SlidersHorizontal 
} from "lucide-react";

interface Ressource {
  id_ressource: string;
  nom_ressource: string;
}

export default function AdminSalles() {
  const [salles, setSalles] = useState<any[]>([]);
  const [ressourcesDispo, setRessourcesDispo] = useState<Ressource[]>([]);
  const [loading, setLoading] = useState(true);
  
  // --- 🔍 ÉTATS DES FILTRES ---
  const [search, setSearch] = useState("");
  const [minCapacite, setMinCapacite] = useState<string>(""); // String pour gérer l'input vide
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false); // Pour afficher/masquer le panneau avancé

  // UI States
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [editingSalle, setEditingSalle] = useState<any>(null);
  
  // Formulaire
  const [form, setForm] = useState({ nom_salle: "", capacite: 5, localisation: "" });
  const [equipementsForm, setEquipementsForm] = useState<string[]>([]);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [resSalles, resRessources] = await Promise.all([
        fetch("/api/salles"),
        fetch("/api/ressources")
      ]);
      if(resSalles.ok) setSalles(await resSalles.json());
      if(resRessources.ok) setRessourcesDispo(await resRessources.json());
      setLoading(false);
    } catch (e) { console.error(e); }
  };

  // --- 🧠 LOGIQUE DE FILTRAGE AVANCÉE ---
  const filteredSalles = salles.filter(salle => {
      // 1. Recherche Texte
      const matchesSearch = 
          salle.nom_salle.toLowerCase().includes(search.toLowerCase()) ||
          (salle.localisation && salle.localisation.toLowerCase().includes(search.toLowerCase()));
      
      // 2. Capacité Minimum
      const cap = parseInt(minCapacite) || 0;
      const matchesCapacite = salle.capacite >= cap;

      // 3. Équipements (DOIT contenir TOUS les filtres sélectionnés)
      // On regarde si chaque équipement sélectionné est présent dans la string de la salle
      const matchesEquipements = selectedFilters.every(filter => 
          salle.equipements && salle.equipements.includes(filter)
      );

      return matchesSearch && matchesCapacite && matchesEquipements;
  });

  // Gestion des filtres
  const toggleFilter = (equip: string) => {
      setSelectedFilters(prev => 
          prev.includes(equip) ? prev.filter(e => e !== equip) : [...prev, equip]
      );
  };

  const clearFilters = () => {
      setSearch("");
      setMinCapacite("");
      setSelectedFilters([]);
  };

  // --- CRUD CLASSIQUE ---
  const handleCreate = () => {
    setEditingSalle(null);
    setForm({ nom_salle: "", capacite: 10, localisation: "" });
    setEquipementsForm([]); 
    setModalOpen(true);
  };

  const handleEdit = (salle: any) => {
    setEditingSalle(salle);
    setForm({ nom_salle: salle.nom_salle, capacite: salle.capacite, localisation: salle.localisation || "" });
    setEquipementsForm(salle.equipements ? salle.equipements.split(", ").filter((s: string) => s) : []);
    setModalOpen(true);
  };

  const toggleEquipementForm = (nom: string) => {
    setEquipementsForm(prev => prev.includes(nom) ? prev.filter(item => item !== nom) : [...prev, nom]);
  };

  const handleSubmit = async () => {
    if (!form.nom_salle) return toast.error("Nom requis");
    const body = { ...form, equipements: equipementsForm.join(", ") };
    const url = editingSalle ? `/api/salles/${editingSalle.id_salle}` : "/api/salles";
    const method = editingSalle ? "PUT" : "POST";

    try {
        const res = await fetch(url, { method, headers: {"Content-Type": "application/json"}, body: JSON.stringify(body) });
        if(res.ok) { toast.success("Sauvegardé !"); setModalOpen(false); fetchData(); } 
        else { toast.error("Erreur serveur"); }
    } catch(e) { toast.error("Erreur réseau"); }
  };

  const handleDelete = async () => {
    if (!confirmDeleteId) return;
    await fetch(`/api/salles/${confirmDeleteId}`, { method: "DELETE" });
    toast.success("Supprimé"); fetchData(); setConfirmDeleteId(null);
  };

  const getEquipIcon = (name: string) => {
      const n = name.toLowerCase();
      if(n.includes("projecteur") || n.includes("ecran")) return <Projector className="w-3 h-3"/>;
      if(n.includes("pc") || n.includes("ordi")) return <Monitor className="w-3 h-3"/>;
      return <Box className="w-3 h-3"/>;
  };

  return (
    <div className="min-h-screen text-gray-200 bg-[#030712]">
      <AdminSidebar />
      <main className="ml-64 p-8 animate-fade-in">
        
        {/* HEADER */}
        <div className="flex justify-between items-center mb-6">
          <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-3">Salles & Espaces</h1>
              <p className="text-gray-400 text-sm mt-1">Gérez vos salles de réunion.</p>
          </div>
          <button onClick={handleCreate} className="btn-neon-blue px-5 py-2.5 rounded-xl font-bold text-white shadow-lg flex items-center gap-2 hover:scale-105 transition-transform">
            <Plus className="w-5 h-5" /> Ajouter
          </button>
        </div>

        {/* --- 🛠️ ZONE DE FILTRES AVANCÉE --- */}
        <div className="glass-panel p-5 rounded-2xl border border-white/10 mb-8 space-y-4">
            <div className="flex flex-wrap gap-4 items-center justify-between">
                
                {/* Recherche & Toggle */}
                <div className="flex items-center gap-3 w-full md:w-auto flex-1">
                    <div className="relative w-full max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500"/>
                        <input 
                            type="text" placeholder="Rechercher (Nom, Localisation)..." 
                            className="w-full bg-[#0f172a] border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:border-blue-500 outline-none text-gray-300"
                            value={search} onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <button 
                        onClick={() => setShowFilters(!showFilters)} 
                        className={`p-2.5 rounded-xl border transition ${showFilters ? 'bg-blue-500/20 border-blue-500 text-blue-400' : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'}`}
                    >
                        <SlidersHorizontal className="w-5 h-5"/>
                    </button>
                </div>

                {/* Résumé des filtres actifs (Badges) */}
                <div className="flex flex-wrap gap-2 items-center">
                    {minCapacite && (
                        <span className="bg-purple-500/20 text-purple-300 text-xs px-3 py-1 rounded-full border border-purple-500/30 flex items-center gap-2">
                            Min {minCapacite} pers. 
                            <button onClick={() => setMinCapacite("")}><X className="w-3 h-3 hover:text-white"/></button>
                        </span>
                    )}
                    {selectedFilters.map(f => (
                        <span key={f} className="bg-blue-500/20 text-blue-300 text-xs px-3 py-1 rounded-full border border-blue-500/30 flex items-center gap-2">
                            {f} <button onClick={() => toggleFilter(f)}><X className="w-3 h-3 hover:text-white"/></button>
                        </span>
                    ))}
                    {(search || minCapacite || selectedFilters.length > 0) && (
                        <button onClick={clearFilters} className="text-xs text-red-400 hover:text-red-300 underline font-bold ml-2">
                            Tout effacer
                        </button>
                    )}
                </div>
            </div>

            {/* PANNEAU DÉPLIANT */}
            {showFilters && (
                <div className="pt-4 border-t border-white/10 grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in-down">
                    {/* Filtre Capacité */}
                    <div>
                        <label className="text-xs text-gray-500 font-bold uppercase mb-2 block">Capacité Minimum</label>
                        <div className="flex items-center gap-2 bg-[#0f172a] border border-white/10 rounded-xl px-3 py-2 w-32">
                            <Users className="w-4 h-4 text-gray-500"/>
                            <input 
                                type="number" min="0" placeholder="0" 
                                className="bg-transparent outline-none w-full text-sm text-white"
                                value={minCapacite} onChange={(e) => setMinCapacite(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Filtre Équipements */}
                    <div>
                        <label className="text-xs text-gray-500 font-bold uppercase mb-2 block">Doit contenir les équipements :</label>
                        <div className="flex flex-wrap gap-2">
                            {ressourcesDispo.map(res => {
                                const active = selectedFilters.includes(res.nom_ressource);
                                return (
                                    <button 
                                        key={res.id_ressource} 
                                        onClick={() => toggleFilter(res.nom_ressource)}
                                        className={`px-3 py-1.5 rounded-lg text-xs border transition flex items-center gap-2 ${
                                            active ? "bg-blue-500/20 border-blue-500 text-blue-300 font-bold" : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10"
                                        }`}
                                    >
                                        {active && <CheckSquare className="w-3 h-3"/>}
                                        {res.nom_ressource}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>

        {/* --- TABLEAU --- */}
        {loading ? <div className="flex justify-center py-20"><Loader2 className="animate-spin w-8 h-8 text-blue-500"/></div> : (
            <div className="glass-panel rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
                <table className="min-w-full text-left">
                <thead className="bg-white/5 border-b border-white/10 text-gray-400 text-xs uppercase font-semibold">
                    <tr>
                        <th className="px-6 py-4">Salle</th>
                        <th className="px-6 py-4">Capacité</th>
                        <th className="px-6 py-4">Équipements</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                    {filteredSalles.length === 0 ? (
                        <tr><td colSpan={4} className="text-center py-10 text-gray-500">Aucun résultat ne correspond à vos filtres.</td></tr>
                    ) : (
                        filteredSalles.map((salle) => (
                        <tr key={salle.id_salle} className="hover:bg-white/5 transition group">
                            <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400"><DoorOpen className="w-5 h-5" /></div>
                                    <div><div className="font-bold text-white">{salle.nom_salle}</div><div className="text-xs text-gray-500 flex items-center gap-1"><MapPin className="w-3 h-3" /> {salle.localisation || "Non localisé"}</div></div>
                                </div>
                            </td>
                            <td className="px-6 py-4"><span className="inline-flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-md text-xs font-bold border border-white/10 text-gray-300"><Users className="w-3 h-3 text-gray-500" /> {salle.capacite} pers.</span></td>
                            <td className="px-6 py-4">
                                {salle.equipements ? (
                                    <div className="flex flex-wrap gap-2">
                                        {salle.equipements.split(", ").map((eq: string, i: number) => (
                                            <span key={i} className={`inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded border font-medium ${selectedFilters.includes(eq) ? 'bg-green-500/10 text-green-400 border-green-500/30' : 'bg-blue-500/10 text-blue-300 border-blue-500/20'}`}>{getEquipIcon(eq)} {eq}</span>
                                        ))}
                                    </div>
                                ) : <span className="text-gray-600 italic text-xs">Vide</span>}
                            </td>
                            <td className="px-6 py-4 text-right">
                                <div className="flex items-center justify-end gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => handleEdit(salle)} className="p-2 rounded-lg hover:bg-blue-500/20 text-blue-400 transition"><Pencil className="w-4 h-4" /></button>
                                    <button onClick={() => setConfirmDeleteId(salle.id_salle)} className="p-2 rounded-lg hover:bg-red-500/20 text-red-400 transition"><Trash2 className="w-4 h-4" /></button>
                                </div>
                            </td>
                        </tr>
                        ))
                    )}
                </tbody>
                </table>
            </div>
        )}

        {/* MODALES DE SUPPRESSION ET CRÉATION (Inchangées, mais présentes) */}
        {confirmDeleteId && (<div className="fixed inset-0 bg-black/80 flex justify-center items-center z-[60] backdrop-blur-sm"><div className="glass-panel p-6 rounded-2xl w-full max-w-sm text-center border border-red-500/30"><h3 className="text-lg font-bold text-white mb-4">Confirmer suppression ?</h3><div className="flex gap-3"><button onClick={() => setConfirmDeleteId(null)} className="flex-1 py-2 bg-white/5 rounded-lg text-sm">Annuler</button><button onClick={handleDelete} className="flex-1 bg-red-500 text-white rounded-lg text-sm font-bold">Oui</button></div></div></div>)}
        
        {modalOpen && (
          <div className="fixed inset-0 bg-black/80 flex justify-center items-center z-50 backdrop-blur-sm">
            <div className="glass-panel p-8 rounded-2xl w-full max-w-lg border border-white/10 bg-[#0f172a]">
              <h2 className="text-xl font-bold text-white mb-6">{editingSalle ? "Modifier" : "Nouvelle Salle"}</h2>
              <div className="space-y-4">
                <input placeholder="Nom" className="glass-input w-full" value={form.nom_salle} onChange={e => setForm({...form, nom_salle: e.target.value})} />
                <div className="grid grid-cols-2 gap-4">
                    <input type="number" placeholder="Capacité" className="glass-input w-full" value={form.capacite} onChange={e => setForm({...form, capacite: parseInt(e.target.value)})} />
                    <input placeholder="Localisation" className="glass-input w-full" value={form.localisation} onChange={e => setForm({...form, localisation: e.target.value})} />
                </div>
                <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                    <label className="text-xs text-gray-400 uppercase font-bold mb-2 block">Équipements</label>
                    <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto custom-scrollbar">
                        {ressourcesDispo.map(r => (
                            <div key={r.id_ressource} onClick={() => toggleEquipementForm(r.nom_ressource)} className={`cursor-pointer px-3 py-2 rounded text-xs border ${equipementsForm.includes(r.nom_ressource) ? "bg-blue-500/20 border-blue-500 text-blue-300" : "border-transparent hover:bg-white/10"}`}>
                                {r.nom_ressource}
                            </div>
                        ))}
                    </div>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                    <button onClick={() => setModalOpen(false)} className="text-gray-400 px-4 text-sm">Annuler</button>
                    <button onClick={handleSubmit} className="btn-neon-blue px-6 py-2 rounded-lg font-bold text-white">Valider</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}