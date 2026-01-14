"use client";

import { useEffect, useState } from "react";
import AdminSidebar from "../../components/AdminSidebar";
import { toast } from "sonner";
// 👇 IMPORTS LUCIDE
import { 
  DoorOpen, Plus, Pencil, Trash2, Users, MapPin, 
  Monitor, Projector, Armchair, Box, CheckSquare, Square, 
  X, Save, Loader2, LayoutGrid 
} from "lucide-react";

interface Ressource {
  id_ressource: string;
  nom_ressource: string;
  type?: string;
}

export default function AdminSalles() {
  const [salles, setSalles] = useState<any[]>([]);
  const [ressourcesDispo, setRessourcesDispo] = useState<Ressource[]>([]);
  const [loading, setLoading] = useState(true);
  
  // UI States
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  
  // Édition
  const [editingSalle, setEditingSalle] = useState<any>(null);
  
  // Formulaire
  const [form, setForm] = useState({ nom_salle: "", capacite: 5, localisation: "" });
  const [equipementsSelected, setEquipementsSelected] = useState<string[]>([]);

  useEffect(() => { 
    fetchData(); 
  }, []);

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

  const handleCreate = () => {
    setEditingSalle(null);
    setForm({ nom_salle: "", capacite: 10, localisation: "" });
    setEquipementsSelected([]); 
    setModalOpen(true);
  };

  const handleEdit = (salle: any) => {
    setEditingSalle(salle);
    setForm({
      nom_salle: salle.nom_salle,
      capacite: salle.capacite,
      localisation: salle.localisation || ""
    });
    
    // Conversion String BDD -> Array UI
    if (salle.equipements) {
        setEquipementsSelected(salle.equipements.split(", ").filter((s: string) => s));
    } else {
        setEquipementsSelected([]);
    }
    setModalOpen(true);
  };

  // Gestion intelligente des équipements
  const toggleEquipement = (nom: string) => {
    setEquipementsSelected(prev => 
        prev.includes(nom) 
        ? prev.filter(item => item !== nom)
        : [...prev, nom]
    );
  };

  const handleSubmit = async () => {
    if (!form.nom_salle) return toast.error("Nom de salle requis");

    const equipementsString = equipementsSelected.join(", ");
    const url = editingSalle ? `/api/salles/${editingSalle.id_salle}` : "/api/salles";
    const method = editingSalle ? "PUT" : "POST";
    
    const body = { ...form, equipements: equipementsString };

    try {
        const res = await fetch(url, { method, headers: {"Content-Type": "application/json"}, body: JSON.stringify(body) });
        
        if(res.ok) {
            toast.success(editingSalle ? "Salle modifiée" : "Salle créée");
            setModalOpen(false); 
            fetchData();
        } else {
            toast.error("Erreur serveur");
        }
    } catch(e) { toast.error("Erreur réseau"); }
  };

  const handleDelete = async () => {
    if (!confirmDeleteId) return;
    try {
        const res = await fetch(`/api/salles/${confirmDeleteId}`, { method: "DELETE" });
        if (res.ok) { 
            toast.success("Salle supprimée"); 
            fetchData(); 
        } else {
            toast.error("Erreur suppression (réservations en cours ?)");
        }
    } catch(e) { toast.error("Erreur réseau"); }
    setConfirmDeleteId(null);
  };

  // Helper Icône Equipement
  const getEquipIcon = (name: string) => {
      const n = name.toLowerCase();
      if(n.includes("projecteur") || n.includes("ecran") || n.includes("tv")) return <Projector className="w-3 h-3"/>;
      if(n.includes("pc") || n.includes("ordi") || n.includes("mac")) return <Monitor className="w-3 h-3"/>;
      if(n.includes("chaise") || n.includes("fauteuil")) return <Armchair className="w-3 h-3"/>;
      return <Box className="w-3 h-3"/>;
  };

  return (
    <div className="min-h-screen text-gray-200 bg-[#030712]">
      <AdminSidebar />
      <main className="ml-64 p-8 animate-fade-in">
        
        {/* EN-TÊTE */}
        <div className="flex justify-between items-center mb-8">
          <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                Salles & Espaces
              </h1>
              <p className="text-gray-400 text-sm mt-1">Gestion des lieux de réunion et laboratoires.</p>
          </div>
          <button onClick={handleCreate} className="btn-neon-blue px-5 py-2.5 rounded-xl font-bold text-white shadow-lg flex items-center gap-2 hover:scale-105 transition-transform">
            <Plus className="w-5 h-5" />
            Ajouter une Salle
          </button>
        </div>

        {loading ? (
             <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-3" />
                <p className="text-gray-500 font-mono text-sm">Chargement des espaces...</p>
            </div>
        ) : (
            <div className="glass-panel rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
                <table className="min-w-full text-left">
                <thead className="bg-white/5 border-b border-white/10 text-gray-400 text-xs uppercase font-semibold">
                    <tr>
                        <th className="px-6 py-4">Nom de la Salle</th>
                        <th className="px-6 py-4">Capacité</th>
                        <th className="px-6 py-4">Équipements Disponibles</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                    {salles.map((salle) => (
                    <tr key={salle.id_salle} className="hover:bg-white/5 transition group">
                        <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                                    <DoorOpen className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="font-bold text-white">{salle.nom_salle}</div>
                                    <div className="text-xs text-gray-500 flex items-center gap-1">
                                        <MapPin className="w-3 h-3" /> {salle.localisation || "Non localisé"}
                                    </div>
                                </div>
                            </div>
                        </td>
                        <td className="px-6 py-4">
                            <span className="inline-flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-md text-xs font-bold border border-white/10 text-gray-300">
                                <Users className="w-3 h-3 text-gray-500" />
                                {salle.capacite} pers.
                            </span>
                        </td>
                        <td className="px-6 py-4">
                            {salle.equipements ? (
                                <div className="flex flex-wrap gap-2">
                                    {salle.equipements.split(", ").map((eq: string, i: number) => (
                                        <span key={i} className="inline-flex items-center gap-1 text-[10px] bg-blue-500/10 text-blue-300 px-2 py-1 rounded border border-blue-500/20 font-medium">
                                            {getEquipIcon(eq)} {eq}
                                        </span>
                                    ))}
                                </div>
                            ) : (
                                <span className="text-gray-600 italic text-xs flex items-center gap-1">
                                    <Box className="w-3 h-3" /> Vide
                                </span>
                            )}
                        </td>
                        <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => handleEdit(salle)} className="p-2 rounded-lg hover:bg-blue-500/20 text-blue-400 transition" title="Modifier">
                                    <Pencil className="w-4 h-4" />
                                </button>
                                <button onClick={() => setConfirmDeleteId(salle.id_salle)} className="p-2 rounded-lg hover:bg-red-500/20 text-red-400 transition" title="Supprimer">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </td>
                    </tr>
                    ))}
                </tbody>
                </table>
            </div>
        )}

        {/* MODAL SUPPRESSION */}
        {confirmDeleteId && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-center z-[60] animate-fade-in">
                <div className="glass-panel p-6 rounded-2xl w-full max-w-sm text-center border border-red-500/30 shadow-[0_0_50px_rgba(239,68,68,0.2)]">
                    <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4 text-red-500">
                        <Trash2 className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">Supprimer cette salle ?</h3>
                    <p className="text-sm text-gray-400 mb-6">Action irréversible.</p>
                    <div className="flex justify-center gap-3">
                        <button onClick={() => setConfirmDeleteId(null)} className="flex-1 py-2 rounded-lg border border-white/10 hover:bg-white/5 transition text-sm">Annuler</button>
                        <button onClick={handleDelete} className="flex-1 bg-red-500 hover:bg-red-600 text-white rounded-lg py-2 text-sm font-bold transition">Confirmer</button>
                    </div>
                </div>
            </div>
        )}

        {/* MODAL FORMULAIRE */}
        {modalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-center z-50 animate-fade-in">
            <div className="glass-panel p-8 rounded-2xl w-full max-w-lg border border-white/10 bg-[#0f172a] relative shadow-2xl">
              <button onClick={() => setModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white transition">
                  <X className="w-5 h-5" />
              </button>
              
              <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                  {editingSalle ? <Pencil className="w-5 h-5 text-blue-400" /> : <Plus className="w-5 h-5 text-blue-400" />}
                  {editingSalle ? "Modifier la Salle" : "Nouvelle Salle"}
              </h2>
              
              <div className="flex flex-col gap-5">
                <div>
                    <label className="text-xs text-gray-500 font-bold mb-1.5 block ml-1">Nom de la salle</label>
                    <div className="relative">
                        <DoorOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                        <input placeholder="Ex: Salle Turing" className="glass-input w-full pl-9" value={form.nom_salle} onChange={e => setForm({...form, nom_salle: e.target.value})} />
                    </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs text-gray-500 font-bold mb-1.5 block ml-1">Capacité (Pers.)</label>
                        <div className="relative">
                            <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                            <input type="number" className="glass-input w-full pl-9" value={form.capacite} onChange={e => setForm({...form, capacite: parseInt(e.target.value)})} />
                        </div>
                    </div>
                    <div>
                        <label className="text-xs text-gray-500 font-bold mb-1.5 block ml-1">Localisation</label>
                        <div className="relative">
                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                            <input placeholder="Ex: Aile B" className="glass-input w-full pl-9" value={form.localisation} onChange={e => setForm({...form, localisation: e.target.value})} />
                        </div>
                    </div>
                </div>

                {/* SÉLECTEUR D'ÉQUIPEMENTS */}
                <div className="bg-black/20 p-4 rounded-xl border border-white/10">
                    <label className="text-xs text-gray-400 uppercase font-bold mb-3 block flex items-center gap-2">
                        <LayoutGrid className="w-3 h-3" /> Équipements disponibles
                    </label>
                    
                    {ressourcesDispo.length === 0 ? (
                        <p className="text-xs text-gray-500 italic text-center py-4">
                            Aucune ressource créée dans la base.<br/>Allez dans l'onglet "Ressources" pour en ajouter.
                        </p>
                    ) : (
                        <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto custom-scrollbar p-1">
                            {ressourcesDispo.map(res => {
                                const isSelected = equipementsSelected.includes(res.nom_ressource);
                                return (
                                    <div 
                                        key={res.id_ressource} 
                                        onClick={() => toggleEquipement(res.nom_ressource)}
                                        className={`cursor-pointer px-3 py-2.5 rounded-lg text-xs transition flex items-center gap-3 border select-none group ${
                                            isSelected 
                                            ? "bg-blue-500/20 border-blue-500/50 text-blue-200" 
                                            : "bg-white/5 border-transparent text-gray-400 hover:bg-white/10"
                                        }`}
                                    >
                                        <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${isSelected ? "bg-blue-500 border-blue-500" : "border-gray-600 group-hover:border-gray-500"}`}>
                                            {isSelected && <CheckSquare className="w-3 h-3 text-white" />}
                                        </div>
                                        <span className="truncate">{res.nom_ressource}</span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-white/10">
                    <button onClick={() => setModalOpen(false)} className="text-gray-400 px-4 hover:text-white transition text-sm">Annuler</button>
                    <button onClick={handleSubmit} className="btn-neon-blue px-6 py-2 rounded-lg font-bold text-white shadow-lg flex items-center gap-2">
                        <Save className="w-4 h-4" /> Valider
                    </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}