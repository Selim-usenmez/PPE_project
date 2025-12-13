"use client";

import { useEffect, useState } from "react";
import AdminSidebar from "../../components/AdminSidebar";
import { toast } from "sonner";

export default function AdminRessources() {
  const [ressources, setRessources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
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

  const fetchRessources = async () => { 
    const r = await fetch("/api/ressources"); 
    if(r.ok) setRessources(await r.json()); 
    setLoading(false); 
  };

  const handleSave = async () => {
    if(!form.nom_ressource) { toast.error("Le nom du matériel est requis"); return; }
    
    const url = editing ? `/api/ressources/${editing.id_ressource}` : "/api/ressources";
    
    // 👇 CORRECTION IMPORTANTE :
    // On transforme la chaîne vide en NULL pour éviter l'erreur "Unique constraint"
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
            toast.success(editing ? "Matériel mis à jour ! 💾" : "Matériel ajouté ! 📦");
            setModalOpen(false); 
            fetchRessources();
        } else {
            const data = await res.json();
            // Gestion erreur spécifique (doublon numéro série)
            if (data.error && data.error.includes("Unique")) {
                toast.error("Ce numéro de série existe déjà !");
            } else {
                toast.error("Erreur serveur lors de l'enregistrement");
            }
        }
    } catch (e) {
        toast.error("Erreur réseau");
    }
  };

  const handleDelete = async () => {
    if (!confirmDeleteId) return;
    try {
        const res = await fetch(`/api/ressources/${confirmDeleteId}`, { method: "DELETE" });
        if (res.ok) {
            toast.success("Ressource supprimée 🗑️");
            fetchRessources();
        } else {
            toast.error("Impossible de supprimer cette ressource");
        }
    } catch (e) {
        toast.error("Erreur réseau");
    }
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

  return (
    <div className="min-h-screen text-gray-200">
      <AdminSidebar />
      <main className="ml-64 p-8 animate-fade-in">
        
        {/* En-tête */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-white">Gestion Ressources</h1>
          <button onClick={openCreate} className="btn-neon-blue px-4 py-2 rounded-lg font-bold shadow-lg">
            + Ajouter
          </button>
        </div>

        {/* Tableau */}
        <div className="glass-panel rounded-2xl overflow-hidden">
            <table className="min-w-full text-left">
              <thead className="bg-white/5 border-b border-white/10 text-gray-400 text-xs uppercase">
                <tr>
                    <th className="px-6 py-3">Matériel</th>
                    <th className="px-6 py-3">État</th>
                    <th className="px-6 py-3">Infos</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {ressources.map((r) => (
                  <tr key={r.id_ressource} className="hover:bg-white/5 transition">
                    <td className="px-6 py-4">
                        <div className="font-bold text-white">{r.nom_ressource}</div>
                        <div className="text-xs text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded inline-block mt-1">
                            {r.type.replace('_',' ')}
                        </div>
                    </td>
                    <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-xs font-bold border ${
                            r.etat === 'DISPONIBLE' ? 'bg-green-500/20 text-green-300 border-green-500/30' : 
                            r.etat === 'EN_UTILISATION' ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' :
                            'bg-red-500/20 text-red-300 border-red-500/30'
                        }`}>
                            {r.etat.replace('_', ' ')}
                        </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-400">
                        {r.numero_serie ? (
                            <div className="text-gray-300">S/N: {r.numero_serie}</div>
                        ) : (
                            <span className="italic opacity-50">Sans S/N</span>
                        )}
                        <div className="mt-1">Loc: {r.localisation || "N/A"}</div>
                    </td>
                    <td className="px-6 py-4 text-right space-x-3">
                        <button onClick={() => openEdit(r)} className="text-blue-400 hover:text-blue-300 transition">Modifier</button>
                        <button onClick={() => setConfirmDeleteId(r.id_ressource)} className="text-red-400 hover:text-red-300 transition">Supprimer</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
        </div>

        {/* MODAL SUPPRESSION */}
        {confirmDeleteId && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-center z-[60] animate-fade-in">
                <div className="glass-panel p-6 rounded-2xl w-full max-w-sm text-center border border-red-500/30 shadow-[0_0_50px_rgba(239,68,68,0.2)]">
                    <h3 className="text-lg font-bold text-white mb-4">Supprimer cet élément ?</h3>
                    <div className="flex justify-center gap-4">
                        <button onClick={() => setConfirmDeleteId(null)} className="text-gray-400 hover:text-white transition">Annuler</button>
                        <button onClick={handleDelete} className="btn-neon-red px-4 py-2 rounded-lg font-bold">Oui, supprimer</button>
                    </div>
                </div>
            </div>
        )}

        {/* MODAL FORMULAIRE */}
        {modalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-center z-50 animate-fade-in">
            <div className="glass-panel p-8 rounded-2xl w-full max-w-md border border-white/20">
              <h2 className="text-xl font-bold text-white mb-6 border-b border-white/10 pb-4">
                  {editing ? "Modifier" : "Ajouter"} un Matériel
              </h2>
              
              <div className="flex flex-col gap-4">
                <div>
                    <label className="text-xs text-gray-400 uppercase font-bold mb-1 block">Nom</label>
                    <input placeholder="Ex: Dell XPS 15" className="glass-input w-full" value={form.nom_ressource} onChange={e => setForm({...form, nom_ressource: e.target.value})} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs text-gray-400 uppercase font-bold mb-1 block">Type</label>
                        <select className="glass-input w-full" value={form.type} onChange={e => setForm({...form, type: e.target.value})}>
                            <option className="bg-slate-900" value="MATERIEL_INFORMATIQUE">Informatique</option>
                            <option className="bg-slate-900" value="VEHICULE">Véhicule</option>
                            <option className="bg-slate-900" value="EQUIPEMENT_REUNION">Réunion</option>
                            <option className="bg-slate-900" value="AUTRE">Autre</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-xs text-gray-400 uppercase font-bold mb-1 block">État</label>
                        <select className="glass-input w-full" value={form.etat} onChange={e => setForm({...form, etat: e.target.value})}>
                            <option className="bg-slate-900" value="DISPONIBLE">Disponible</option>
                            <option className="bg-slate-900" value="EN_MAINTENANCE">Maintenance</option>
                            <option className="bg-slate-900" value="HORS_SERVICE">Hors Service</option>
                        </select>
                    </div>
                </div>

                <div>
                    <label className="text-xs text-gray-400 uppercase font-bold mb-1 block">Numéro Série</label>
                    <input 
                        placeholder="Numéro Série (Optionnel)" 
                        className="glass-input w-full" 
                        value={form.numero_serie} 
                        onChange={e => setForm({...form, numero_serie: e.target.value})} 
                    />
                </div>

                <div>
                    <label className="text-xs text-gray-400 uppercase font-bold mb-1 block">Localisation</label>
                    <input placeholder="Ex: Armoire A, Étage 2" className="glass-input w-full" value={form.localisation} onChange={e => setForm({...form, localisation: e.target.value})} />
                </div>

                <div className="flex justify-end gap-2 mt-6">
                    <button onClick={() => setModalOpen(false)} className="text-gray-400 px-4 hover:text-white transition">Annuler</button>
                    <button onClick={handleSave} className="btn-neon-blue px-6 py-2 rounded-lg font-bold">Sauvegarder</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}