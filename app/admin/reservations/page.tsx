"use client";

import { useEffect, useState } from "react";
import AdminSidebar from "../../components/AdminSidebar";
import { toast } from "sonner";
import { 
  Calendar, Search, Trash2, Pencil, X, 
  MapPin, Box, User, Loader2, Save, Clock 
} from "lucide-react";

// ✅ FONCTION DE FORMATAGE DATE (Indispensable pour l'input)
const formatForInput = (d: any) => {
    if (!d) return "";
    try {
        const date = new Date(d);
        // On décale l'heure pour compenser le fuseau horaire et avoir la bonne heure locale dans l'input
        const offset = date.getTimezoneOffset() * 60000;
        return (new Date(date.getTime() - offset)).toISOString().slice(0, 16);
    } catch (e) { return ""; }
};

export default function AdminReservationsPage() {
  const [reservations, setReservations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  
  // États Modale
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  // Formulaire
  const [form, setForm] = useState({
      id_reservation: "",
      objet: "",
      date_debut: "",
      date_fin: "",
      id_salle: "",
      id_ressource: ""
  });

  const [salles, setSalles] = useState<any[]>([]);
  const [ressources, setRessources] = useState<any[]>([]);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
      try {
          const [resResa, resSalles, resRessources] = await Promise.all([
              fetch("/api/reservations").then(r => r.json()),
              fetch("/api/salles").then(r => r.json()),
              fetch("/api/ressources").then(r => r.json())
          ]);
          setReservations(resResa);
          setSalles(resSalles);
          setRessources(resRessources);
      } catch(e) { toast.error("Erreur chargement"); }
      setLoading(false);
  };

  const openEdit = (resa: any) => {
      setForm({
          id_reservation: resa.id_reservation,
          objet: resa.objet,
          // ✅ ICI ON APPLIQUE LE FORMATAGE
          date_debut: formatForInput(resa.date_debut),
          date_fin: formatForInput(resa.date_fin),
          id_salle: resa.id_salle || "",
          id_ressource: resa.id_ressource || ""
      });
      setIsEditing(true);
      setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
      if(!confirm("Supprimer cette réservation ?")) return;
      await fetch(`/api/reservations?id=${id}`, { method: "DELETE" });
      toast.success("Réservation supprimée");
      loadData();
  };

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      try {
          // On reconvertit en ISO standard pour la base de données
          const payload = {
              ...form,
              date_debut: new Date(form.date_debut).toISOString(),
              date_fin: new Date(form.date_fin).toISOString(),
              id_salle: form.id_salle || null,
              id_ressource: form.id_ressource || null
          };

          const res = await fetch("/api/reservations", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload)
          });

          if(res.ok) {
              toast.success("Mise à jour réussie");
              setIsModalOpen(false);
              loadData();
          } else {
              toast.error("Erreur ou conflit");
          }
      } catch(e) { toast.error("Erreur serveur"); }
  };

  const filtered = reservations.filter(r => 
      r.objet.toLowerCase().includes(search.toLowerCase()) ||
      r.employe?.nom?.toLowerCase().includes(search.toLowerCase()) ||
      r.salle?.nom_salle?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen text-gray-200 bg-[#030712]">
      <AdminSidebar /> 

      <main className="ml-64 p-8 animate-fade-in">
        <div className="flex justify-between items-center mb-8">
            <div>
                <h1 className="text-3xl font-bold text-white">Gestion Réservations</h1>
                <p className="text-gray-400 text-sm mt-1">Vue globale du planning</p>
            </div>
        </div>
        
        <div className="glass-panel rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
            <div className="p-4 border-b border-white/5 bg-white/[0.02]">
                <div className="relative max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input type="text" placeholder="Rechercher..." className="w-full bg-[#0f172a] border border-white/10 rounded-lg py-2 pl-9 pr-4 text-sm focus:border-blue-500 outline-none text-gray-300" value={search} onChange={e => setSearch(e.target.value)} />
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full text-left">
                    <thead className="bg-white/5 border-b border-white/10 text-gray-400 text-xs uppercase font-semibold">
                        <tr>
                            <th className="px-6 py-4">Objet</th>
                            <th className="px-6 py-4">Lieu / Ressource</th>
                            <th className="px-6 py-4">Créneau</th>
                            <th className="px-6 py-4">Par</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {loading ? <tr><td colSpan={5} className="p-8 text-center"><Loader2 className="animate-spin mx-auto"/></td></tr> : filtered.map(r => (
                            <tr key={r.id_reservation} className="hover:bg-white/5 transition group">
                                <td className="px-6 py-4 font-bold text-white">{r.objet}</td>
                                <td className="px-6 py-4 text-sm">
                                    {r.salle ? <div className="flex items-center gap-2 text-blue-300"><MapPin className="w-3 h-3"/> {r.salle.nom_salle}</div> : null}
                                    {r.ressource ? <div className="flex items-center gap-2 text-orange-300"><Box className="w-3 h-3"/> {r.ressource.nom_ressource}</div> : null}
                                </td>
                                <td className="px-6 py-4 text-xs text-gray-400">
                                    <div className="flex items-center gap-2 mb-1"><Calendar className="w-3 h-3"/> {new Date(r.date_debut).toLocaleDateString()}</div>
                                    <div className="flex items-center gap-2"><Clock className="w-3 h-3"/> {new Date(r.date_debut).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} - {new Date(r.date_fin).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
                                </td>
                                <td className="px-6 py-4 text-sm">
                                    <div className="flex items-center gap-2 bg-white/5 px-2 py-1 rounded-lg w-fit">
                                        <User className="w-3 h-3 text-gray-500"/> 
                                        {r.employe ? `${r.employe.prenom} ${r.employe.nom}` : <span className="italic text-gray-600">Supprimé</span>}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-2 opacity-60 group-hover:opacity-100 transition">
                                        <button onClick={() => openEdit(r)} className="p-2 rounded-lg hover:bg-blue-500/20 text-blue-400 transition"><Pencil className="w-4 h-4" /></button>
                                        <button onClick={() => handleDelete(r.id_reservation)} className="p-2 rounded-lg hover:bg-red-500/20 text-red-400 transition"><Trash2 className="w-4 h-4" /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>

        {/* MODALE ÉDITION */}
        {isModalOpen && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="glass-panel p-8 rounded-2xl w-full max-w-md border border-white/10 bg-[#0f172a] relative shadow-2xl">
                    <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white transition"><X className="w-5 h-5" /></button>
                    <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2"><Pencil className="w-5 h-5 text-blue-400"/> Modifier Réservation</h2>
                    
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="text-xs text-gray-500 font-bold mb-1 block">Objet</label>
                            <input className="glass-input w-full" value={form.objet} onChange={e => setForm({...form, objet: e.target.value})} />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs text-gray-500 font-bold mb-1 block">Début</label>
                                {/* 👇 LE SECRET EST ICI : [color-scheme:dark] */}
                                <input 
                                    type="datetime-local" 
                                    className="glass-input w-full text-xs [color-scheme:dark]" 
                                    value={form.date_debut} 
                                    onChange={e => setForm({...form, date_debut: e.target.value})} 
                                />
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 font-bold mb-1 block">Fin</label>
                                {/* 👇 LE SECRET EST ICI : [color-scheme:dark] */}
                                <input 
                                    type="datetime-local" 
                                    className="glass-input w-full text-xs [color-scheme:dark]" 
                                    value={form.date_fin} 
                                    onChange={e => setForm({...form, date_fin: e.target.value})} 
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs text-gray-500 font-bold mb-1 block">Salle</label>
                                <select className="glass-input w-full bg-[#0f172a]" value={form.id_salle} onChange={e => setForm({...form, id_salle: e.target.value, id_ressource: ""})}>
                                    <option value="">Aucune</option>
                                    {salles.map(s => <option key={s.id_salle} value={s.id_salle}>{s.nom_salle}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 font-bold mb-1 block">Matériel</label>
                                <select className="glass-input w-full bg-[#0f172a]" value={form.id_ressource} onChange={e => setForm({...form, id_ressource: e.target.value, id_salle: ""})}>
                                    <option value="">Aucun</option>
                                    {ressources.map(r => <option key={r.id_ressource} value={r.id_ressource}>{r.nom_ressource}</option>)}
                                </select>
                            </div>
                        </div>

                        <button type="submit" className="w-full btn-neon-blue py-3 rounded-xl font-bold text-white mt-4 flex justify-center gap-2">
                            <Save className="w-4 h-4"/> Enregistrer
                        </button>
                    </form>
                </div>
            </div>
        )}
      </main>
    </div>
  );
}