"use client";

import { useEffect, useState } from "react";
import AdminSidebar from "../../components/AdminSidebar";
import { toast } from "sonner";
// 👇 IMPORTS LUCIDE
import { 
  Box, Plus, Pencil, Trash2, Search, Monitor, Car, 
  Wrench, MapPin, Barcode, Tag, X, Loader2, Armchair, HelpCircle, CheckCircle2, AlertOctagon 
} from "lucide-react";

export default function AdminRessources() {
  const [ressources, setRessources] = useState<any[]>([]);
  const [filteredRessources, setFilteredRessources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  
  // Modales
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  
  // Édition
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ 
    nom_ressource: "", 
    type: "MATERIEL_INFORMATIQUE", 
    etat: "DISPONIBLE", 
    localisation: "", 
    numero_serie: "" 
  });

  useEffect(() => { fetchRessources(); }, []);

  // Filtrage dynamique
  useEffect(() => {
    setFilteredRessources(
      ressources.filter(r => 
        r.nom_ressource.toLowerCase().includes(search.toLowerCase()) ||
        (r.numero_serie && r.numero_serie.toLowerCase().includes(search.toLowerCase())) ||
        (r.localisation && r.localisation.toLowerCase().includes(search.toLowerCase()))
      )
    );
  }, [search, ressources]);

  const fetchRessources = async () => { 
    try {
        const r = await fetch("/api/ressources"); 
        if(r.ok) {
            const data = await r.json();
            setRessources(data);
            setFilteredRessources(data);
        }
    } catch (e) { console.error(e); }
    setLoading(false); 
  };

  const handleSave = async () => {
    if(!form.nom_ressource) { toast.error("Le nom du matériel est requis"); return; }
    
    const url = editing ? `/api/ressources/${editing.id_ressource}` : "/api/ressources";
    
    // 👇 Gestion du Numéro de Série unique (vide = null)
    const payload = {
        ...form,
        numero_serie: form.numero_serie.trim() === "" ? null : form.numero_serie
    };

    try {
        const res = await fetch(url, { 
            method: editing ? "PUT" : "POST", 
            headers: {"Content-Type": "application/json"}, 
            body: JSON.stringify(payload) 
        });

        if (res.ok) {
            toast.success(editing ? "Matériel mis à jour" : "Matériel ajouté");
            setModalOpen(false); 
            fetchRessources();
        } else {
            const data = await res.json();
            if (data.error && data.error.includes("Unique")) {
                toast.error("Ce numéro de série existe déjà !");
            } else {
                toast.error("Erreur serveur");
            }
        }
    } catch (e) { toast.error("Erreur réseau"); }
  };

  const handleDelete = async () => {
    if (!confirmDeleteId) return;
    try {
        const res = await fetch(`/api/ressources/${confirmDeleteId}`, { method: "DELETE" });
        if (res.ok) {
            toast.success("Ressource supprimée");
            fetchRessources();
        } else {
            toast.error("Impossible de supprimer (Probablement liée à une réservation)");
        }
    } catch (e) { toast.error("Erreur réseau"); }
    setConfirmDeleteId(null);
  };

  const openEdit = (res: any) => { 
      setEditing(res); 
      setForm({ 
          ...res, 
          localisation: res.localisation || "", 
          numero_serie: res.numero_serie || "" 
      }); 
      setModalOpen(true); 
  };

  const openCreate = () => { 
      setEditing(null); 
      setForm({ 
          nom_ressource: "", 
          type: "MATERIEL_INFORMATIQUE", 
          etat: "DISPONIBLE", 
          localisation: "", 
          numero_serie: "" 
      }); 
      setModalOpen(true); 
  };

  // Helper pour l'icône selon le type
  const getTypeIcon = (type: string) => {
      switch(type) {
          case 'MATERIEL_INFORMATIQUE': return <Monitor className="w-5 h-5" />;
          case 'VEHICULE': return <Car className="w-5 h-5" />;
          case 'EQUIPEMENT_REUNION': return <Armchair className="w-5 h-5" />;
          default: return <Box className="w-5 h-5" />;
      }
  };

  // Helper pour le badge d'état
  const getStatusBadge = (etat: string) => {
      if(etat === 'DISPONIBLE') return { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/20', icon: <CheckCircle2 className="w-3 h-3"/> };
      if(etat === 'EN_UTILISATION') return { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20', icon: <HelpCircle className="w-3 h-3"/> };
      return { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20', icon: <AlertOctagon className="w-3 h-3"/> };
  };

  return (
    <div className="min-h-screen text-gray-200 bg-[#030712]">
      <AdminSidebar />
      <main className="ml-64 p-8 animate-fade-in">
        
        {/* En-tête */}
        <div className="flex justify-between items-center mb-8">
          <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                Inventaire & Matériel
              </h1>
              <p className="text-gray-400 text-sm mt-1">Gérez le parc informatique et les équipements.</p>
          </div>
          <button onClick={openCreate} className="btn-neon-blue px-5 py-2.5 rounded-xl font-bold text-white shadow-lg flex items-center gap-2 hover:scale-105 transition-transform">
            <Plus className="w-5 h-5" />
            Ajouter un Matériel
          </button>
        </div>

        <div className="glass-panel rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
            {/* Barre de recherche */}
            <div className="p-4 border-b border-white/5 bg-white/[0.02]">
                <div className="relative max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input 
                        type="text" 
                        placeholder="Rechercher (Nom, S/N, Localisation)..." 
                        className="w-full bg-[#0f172a] border border-white/10 rounded-lg py-2 pl-9 pr-4 text-sm focus:border-blue-500 outline-none text-gray-300 placeholder:text-gray-600 transition-all"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-3" />
                    <p className="text-gray-500 font-mono text-sm">Chargement de l'inventaire...</p>
                </div>
            ) : filteredRessources.length === 0 ? (
                <div className="p-8 text-center text-gray-500 flex flex-col items-center">
                    <Box className="w-12 h-12 mb-3 opacity-20" />
                    <p>Aucun matériel trouvé.</p>
                </div>
            ) : (
                <table className="min-w-full text-left">
                  <thead className="bg-white/5 border-b border-white/10 text-gray-400 text-xs uppercase font-semibold">
                    <tr>
                        <th className="px-6 py-4">Matériel</th>
                        <th className="px-6 py-4">État</th>
                        <th className="px-6 py-4">Détails Techniques</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredRessources.map((r) => {
                        const status = getStatusBadge(r.etat);
                        return (
                          <tr key={r.id_ressource} className="hover:bg-white/5 transition group">
                            <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                                        {getTypeIcon(r.type)}
                                    </div>
                                    <div>
                                        <div className="font-bold text-white">{r.nom_ressource}</div>
                                        <div className="text-[10px] uppercase tracking-wide text-gray-500">
                                            {r.type.replace('_',' ')}
                                        </div>
                                    </div>
                                </div>
                            </td>
                            <td className="px-6 py-4">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold border uppercase tracking-wider ${status.bg} ${status.text} ${status.border}`}>
                                    {status.icon}
                                    {r.etat.replace('_', ' ')}
                                </span>
                            </td>
                            <td className="px-6 py-4">
                                <div className="flex flex-col gap-1">
                                    <div className="text-xs text-gray-400 flex items-center gap-2">
                                        <Barcode className="w-3 h-3 text-gray-600" />
                                        {r.numero_serie ? <span className="font-mono text-gray-300">{r.numero_serie}</span> : <span className="italic opacity-50">Sans S/N</span>}
                                    </div>
                                    <div className="text-xs text-gray-400 flex items-center gap-2">
                                        <MapPin className="w-3 h-3 text-gray-600" />
                                        {r.localisation ? r.localisation : <span className="italic opacity-50">Non localisé</span>}
                                    </div>
                                </div>
                            </td>
                            <td className="px-6 py-4 text-right">
                                <div className="flex items-center justify-end gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => openEdit(r)} className="p-2 rounded-lg hover:bg-blue-500/20 text-blue-400 transition" title="Modifier">
                                        <Pencil className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => setConfirmDeleteId(r.id_ressource)} className="p-2 rounded-lg hover:bg-red-500/20 text-red-400 transition" title="Supprimer">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </td>
                          </tr>
                        );
                    })}
                  </tbody>
                </table>
            )}
        </div>

        {/* MODAL SUPPRESSION */}
        {confirmDeleteId && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-center z-[60] animate-fade-in">
                <div className="glass-panel p-6 rounded-2xl w-full max-w-sm text-center border border-red-500/30 shadow-[0_0_50px_rgba(239,68,68,0.2)]">
                    <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4 text-red-500">
                        <Trash2 className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">Supprimer cet élément ?</h3>
                    <p className="text-sm text-gray-400 mb-6">Action irréversible.</p>
                    <div className="flex justify-center gap-3">
                        <button onClick={() => setConfirmDeleteId(null)} className="flex-1 py-2 rounded-lg border border-white/10 hover:bg-white/5 transition text-sm">Annuler</button>
                        <button onClick={handleDelete} className="flex-1 bg-red-500 hover:bg-red-600 text-white rounded-lg py-2 text-sm font-bold transition">Supprimer</button>
                    </div>
                </div>
            </div>
        )}

        {/* MODAL FORMULAIRE */}
        {modalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-center z-50 animate-fade-in">
            <div className="glass-panel p-8 rounded-2xl w-full max-w-md border border-white/10 bg-[#0f172a] relative shadow-2xl">
              <button onClick={() => setModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white transition">
                  <X className="w-5 h-5" />
              </button>
              
              <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                  {editing ? <Pencil className="w-5 h-5 text-blue-400" /> : <Plus className="w-5 h-5 text-blue-400" />}
                  {editing ? "Modifier" : "Nouveau"} Matériel
              </h2>
              
              <div className="flex flex-col gap-5">
                <div>
                    <label className="text-xs text-gray-500 font-bold mb-1.5 block ml-1">Nom du produit</label>
                    <div className="relative">
                        <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                        <input type="text" placeholder="Ex: Dell XPS 15" className="glass-input w-full pl-9" value={form.nom_ressource} onChange={e => setForm({...form, nom_ressource: e.target.value})} />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs text-gray-500 font-bold mb-1.5 block ml-1">Type</label>
                        <select className="glass-input w-full bg-[#0f172a]" value={form.type} onChange={e => setForm({...form, type: e.target.value})}>
                            <option value="MATERIEL_INFORMATIQUE">Informatique</option>
                            <option value="VEHICULE">Véhicule</option>
                            <option value="EQUIPEMENT_REUNION">Réunion</option>
                            <option value="AUTRE">Autre</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-xs text-gray-500 font-bold mb-1.5 block ml-1">État actuel</label>
                        <select className="glass-input w-full bg-[#0f172a]" value={form.etat} onChange={e => setForm({...form, etat: e.target.value})}>
                            <option value="DISPONIBLE">Disponible</option>
                            <option value="EN_MAINTENANCE">Maintenance</option>
                            <option value="HORS_SERVICE">Hors Service</option>
                        </select>
                    </div>
                </div>

                <div>
                    <label className="text-xs text-gray-500 font-bold mb-1.5 block ml-1">Numéro Série</label>
                    <div className="relative">
                        <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                        <input 
                            type="text"
                            placeholder="Optionnel" 
                            className="glass-input w-full pl-9 font-mono text-sm" 
                            value={form.numero_serie} 
                            onChange={e => setForm({...form, numero_serie: e.target.value})} 
                        />
                    </div>
                </div>

                <div>
                    <label className="text-xs text-gray-500 font-bold mb-1.5 block ml-1">Localisation</label>
                    <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                        <input type="text" placeholder="Ex: Armoire A, Étage 2" className="glass-input w-full pl-9" value={form.localisation} onChange={e => setForm({...form, localisation: e.target.value})} />
                    </div>
                </div>

                <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-white/10">
                    <button onClick={() => setModalOpen(false)} className="text-gray-400 px-4 hover:text-white transition text-sm">Annuler</button>
                    <button onClick={handleSave} className="btn-neon-blue px-6 py-2 rounded-lg font-bold text-white shadow-lg">Sauvegarder</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}