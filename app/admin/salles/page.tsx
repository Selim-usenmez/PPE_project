"use client";

import { useEffect, useState } from "react";
import AdminSidebar from "../../components/AdminSidebar";
import { toast } from "sonner";

interface Ressource {
  id_ressource: string;
  nom_ressource: string;
}

export default function AdminSalles() {
  const [salles, setSalles] = useState<any[]>([]);
  const [ressourcesDispo, setRessourcesDispo] = useState<Ressource[]>([]); // Liste des ressources BDD
  const [loading, setLoading] = useState(true);
  
  // Modales
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  
  // Données d'édition
  const [editingSalle, setEditingSalle] = useState<any>(null);
  
  // Formulaire (on gère equipementsSelected à part pour l'UI)
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
    setEquipementsSelected([]); // Reset sélection
    setModalOpen(true);
  };

  const handleEdit = (salle: any) => {
    setEditingSalle(salle);
    setForm({
      nom_salle: salle.nom_salle,
      capacite: salle.capacite,
      localisation: salle.localisation || ""
    });
    
    // On transforme la string "Projecteur, PC" en tableau ["Projecteur", "PC"] pour l'UI
    if (salle.equipements) {
        setEquipementsSelected(salle.equipements.split(", ").filter((s: string) => s));
    } else {
        setEquipementsSelected([]);
    }
    setModalOpen(true);
  };

  // Gestion des cases à cocher
  const toggleEquipement = (nom: string) => {
    setEquipementsSelected(prev => 
        prev.includes(nom) 
        ? prev.filter(item => item !== nom) // Si présent, on retire
        : [...prev, nom] // Sinon, on ajoute
    );
  };

  const handleSubmit = async () => {
    if (!form.nom_salle) return toast.error("Nom de salle requis");

    // On transforme le tableau en string pour la BDD
    const equipementsString = equipementsSelected.join(", ");

    const url = editingSalle ? `/api/salles/${editingSalle.id_salle}` : "/api/salles";
    const method = editingSalle ? "PUT" : "POST";
    
    const body = { ...form, equipements: equipementsString };

    const res = await fetch(url, { method, headers: {"Content-Type": "application/json"}, body: JSON.stringify(body) });
    
    if(res.ok) {
        toast.success(editingSalle ? "Salle modifiée !" : "Salle ajoutée !");
        setModalOpen(false); fetchData();
    } else {
        toast.error("Erreur serveur");
    }
  };

  const handleDelete = async () => {
    if (!confirmDeleteId) return;
    const res = await fetch(`/api/salles/${confirmDeleteId}`, { method: "DELETE" });
    if (res.ok) { toast.success("Salle supprimée 🗑️"); fetchData(); }
    else toast.error("Erreur suppression");
    setConfirmDeleteId(null);
  };

  return (
    <div className="min-h-screen text-gray-200">
      <AdminSidebar />
      <main className="ml-64 p-8 animate-fade-in">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-white">Gestion des Salles</h1>
          <button onClick={handleCreate} className="btn-neon-blue px-4 py-2 rounded-lg font-bold">+ Ajouter Salle</button>
        </div>

        {loading ? <p className="text-center text-blue-400 animate-pulse">Chargement...</p> : (
            <div className="glass-panel rounded-2xl overflow-hidden">
                <table className="min-w-full text-left">
                <thead className="bg-white/5 border-b border-white/10 text-gray-400 text-xs uppercase">
                    <tr><th className="px-6 py-3">Salle</th><th className="px-6 py-3">Capacité</th><th className="px-6 py-3">Équipements</th><th className="px-6 py-3 text-right">Actions</th></tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                    {salles.map((salle) => (
                    <tr key={salle.id_salle} className="hover:bg-white/5 transition">
                        <td className="px-6 py-4"><div className="font-bold text-white">{salle.nom_salle}</div><div className="text-xs text-gray-500">{salle.localisation}</div></td>
                        <td className="px-6 py-4"><span className="bg-white/10 px-2 py-1 rounded text-xs font-bold">{salle.capacite} pers.</span></td>
                        <td className="px-6 py-4">
                            {/* Affichage des équipements sous forme de badges */}
                            {salle.equipements ? (
                                <div className="flex flex-wrap gap-1">
                                    {salle.equipements.split(", ").map((eq: string, i: number) => (
                                        <span key={i} className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded border border-blue-500/30">
                                            {eq}
                                        </span>
                                    ))}
                                </div>
                            ) : <span className="text-gray-500 italic text-xs">Vide</span>}
                        </td>
                        <td className="px-6 py-4 space-x-3 text-right">
                            <button onClick={() => handleEdit(salle)} className="text-blue-400 hover:text-blue-300">Modifier</button>
                            <button onClick={() => setConfirmDeleteId(salle.id_salle)} className="text-red-400 hover:text-red-300">Supprimer</button>
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
                <div className="glass-panel p-6 rounded-2xl w-full max-w-sm text-center border border-red-500/30">
                    <h3 className="text-lg font-bold text-white mb-4">Supprimer cette salle ?</h3>
                    <div className="flex justify-center gap-4">
                        <button onClick={() => setConfirmDeleteId(null)} className="text-gray-400 hover:text-white">Annuler</button>
                        <button onClick={handleDelete} className="btn-neon-red px-4 py-2 rounded-lg font-bold">Confirmer</button>
                    </div>
                </div>
            </div>
        )}

        {/* MODAL FORMULAIRE */}
        {modalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-center z-50 animate-fade-in">
            <div className="glass-panel p-8 rounded-2xl w-full max-w-lg border border-white/20">
              <h2 className="text-xl font-bold text-white mb-6 border-b border-white/10 pb-4">
                  {editingSalle ? "Modifier" : "Ajouter"} une Salle
              </h2>
              
              <div className="flex flex-col gap-4">
                <input placeholder="Nom" className="glass-input w-full" value={form.nom_salle} onChange={e => setForm({...form, nom_salle: e.target.value})} />
                
                <div className="flex gap-2">
                    <input type="number" placeholder="Capacité" className="glass-input w-1/3" value={form.capacite} onChange={e => setForm({...form, capacite: parseInt(e.target.value)})} />
                    <input placeholder="Localisation" className="glass-input w-2/3" value={form.localisation} onChange={e => setForm({...form, localisation: e.target.value})} />
                </div>

                {/* SÉLECTEUR D'ÉQUIPEMENTS */}
                <div className="bg-black/20 p-4 rounded-xl border border-white/10">
                    <label className="text-xs text-gray-400 uppercase font-bold mb-2 block">
                        Équipements disponibles (Cochez pour ajouter)
                    </label>
                    
                    {ressourcesDispo.length === 0 ? (
                        <p className="text-xs text-gray-500 italic">Aucune ressource créée dans la base.</p>
                    ) : (
                        <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto custom-scrollbar">
                            {ressourcesDispo.map(res => {
                                const isSelected = equipementsSelected.includes(res.nom_ressource);
                                return (
                                    <div 
                                        key={res.id_ressource} 
                                        onClick={() => toggleEquipement(res.nom_ressource)}
                                        className={`cursor-pointer px-3 py-2 rounded-lg text-sm transition flex items-center gap-2 border ${
                                            isSelected 
                                            ? "bg-blue-500/20 border-blue-500/50 text-blue-200" 
                                            : "bg-white/5 border-transparent text-gray-400 hover:bg-white/10"
                                        }`}
                                    >
                                        <div className={`w-4 h-4 rounded border flex items-center justify-center ${isSelected ? "bg-blue-500 border-blue-500" : "border-gray-500"}`}>
                                            {isSelected && <span className="text-white text-[10px]">✓</span>}
                                        </div>
                                        {res.nom_ressource}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-2 mt-4">
                    <button onClick={() => setModalOpen(false)} className="text-gray-400 px-4 hover:text-white transition">Annuler</button>
                    <button onClick={handleSubmit} className="btn-neon-blue px-4 py-2 rounded-lg font-bold">Valider</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}