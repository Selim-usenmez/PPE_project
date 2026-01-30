"use client";

import { useState } from "react";
import AdminSidebar from "../../components/AdminSidebar";
import { toast } from "sonner";
import { 
  Archive, Download, FileSpreadsheet, Calendar, 
  HardDrive, AlertTriangle, Loader2, CheckCircle2 
} from "lucide-react";

export default function AdminArchives() {
  const [loading, setLoading] = useState(false);
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");

  const handleExport = async () => {
    if (!dateDebut || !dateFin) return toast.error("Veuillez sélectionner une période.");
    
    setLoading(true);
    try {
      const res = await fetch("/api/admin/archive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dateDebut, dateFin })
      });

      if (res.ok) {
        // Astuce pour télécharger le fichier (Blob)
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ARCHIVE_PPE_${dateDebut}_${dateFin}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        toast.success("Archive téléchargée avec succès !");
      } else {
        const err = await res.json();
        toast.error(err.error || "Erreur export");
      }
    } catch (e) {
      toast.error("Erreur serveur");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen text-gray-200 bg-[#030712]">
      <AdminSidebar />
      <main className="ml-64 p-8 animate-fade-in">
        
        {/* EN-TÊTE */}
        <div className="flex items-center gap-4 mb-8">
            <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20 text-blue-400">
                <Archive className="w-8 h-8" />
            </div>
            <div>
                <h1 className="text-3xl font-bold text-white">Centre d'Archivage</h1>
                <p className="text-gray-400 text-sm mt-1">Exportez les données pour le stockage physique ou légal.</p>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* MODULE D'EXPORT */}
            <div className="glass-panel p-8 rounded-2xl border border-white/10 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-12 bg-blue-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                
                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5 text-green-400"/> Export CSV (Excel)
                </h2>

                <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase mb-2 block flex items-center gap-2">
                                <Calendar className="w-3 h-3"/> Date de début
                            </label>
                            <input 
                                type="date" 
                                className="glass-input w-full text-sm [color-scheme:dark]"
                                value={dateDebut}
                                onChange={(e) => setDateDebut(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase mb-2 block flex items-center gap-2">
                                <Calendar className="w-3 h-3"/> Date de fin
                            </label>
                            <input 
                                type="date" 
                                className="glass-input w-full text-sm [color-scheme:dark]"
                                value={dateFin}
                                onChange={(e) => setDateFin(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="bg-blue-900/10 border border-blue-500/20 p-4 rounded-xl flex items-start gap-3">
                        <HardDrive className="w-5 h-5 text-blue-400 mt-0.5 shrink-0"/>
                        <div>
                            <p className="text-sm font-bold text-blue-200">Format Standard</p>
                            <p className="text-xs text-gray-400 mt-1">
                                Le fichier généré est compatible avec Excel, Google Sheets et les systèmes d'archivage physique. Il contient l'intégralité des traces d'audit.
                            </p>
                        </div>
                    </div>

                    <button 
                        onClick={handleExport} 
                        disabled={loading || !dateDebut || !dateFin}
                        className="w-full btn-neon-blue py-4 rounded-xl font-bold text-white shadow-lg flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin"/> : <Download className="w-5 h-5 group-hover:translate-y-1 transition-transform"/>}
                        {loading ? "Génération..." : "Générer l'archive"}
                    </button>
                </div>
            </div>

            {/* INFO & POLITIQUE */}
            <div className="flex flex-col gap-6">
                <div className="glass-panel p-6 rounded-2xl border border-white/10 bg-[#0f172a]/50">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-yellow-500"/> Politique de conservation
                    </h3>
                    <ul className="space-y-4">
                        <li className="flex gap-3 text-sm text-gray-300">
                            <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 mt-2 shrink-0"></div>
                            <p>Les logs d'activité doivent être conservés pendant <strong>1 an minimum</strong> pour des raisons de sécurité interne.</p>
                        </li>
                        <li className="flex gap-3 text-sm text-gray-300">
                            <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 mt-2 shrink-0"></div>
                            <p>Il est recommandé d'exporter les données <strong>tous les mois</strong> et de les stocker sur un disque dur externe sécurisé.</p>
                        </li>
                        <li className="flex gap-3 text-sm text-gray-300">
                            <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 mt-2 shrink-0"></div>
                            <p>Le fichier CSV contient des données personnelles (noms, actions). Il doit être traité selon le RGPD.</p>
                        </li>
                    </ul>
                </div>

                <div className="glass-panel p-6 rounded-2xl border border-green-500/20 bg-green-900/5">
                    <div className="flex items-center gap-3 mb-2">
                        <CheckCircle2 className="w-5 h-5 text-green-400"/>
                        <h3 className="font-bold text-white">État du système</h3>
                    </div>
                    <p className="text-sm text-gray-400">
                        Le système d'archivage est opérationnel. Aucune purge automatique n'est activée pour le moment (Sécurité maximale).
                    </p>
                </div>
            </div>

        </div>
      </main>
    </div>
  );
}