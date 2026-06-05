"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "pronomaster2024";
const ADMIN_HASH = "b7e94b17b5a3e4f1e8c2d6a9f8b4c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a7b6";

export default function AdminMontantePage() {
    const [authenticated, setAuthenticated] = useState(false);
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

    const [montanteRows, setMontanteRows] = useState<any[]>([]);
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");

    // Form state
    const [formJour, setFormJour] = useState(1);
    const [formMise, setFormMise] = useState("1000");
    const [formCote, setFormCote] = useState("1.50");
    const [formStatut, setFormStatut] = useState("EN_COURS");
    const [formHome, setFormHome] = useState("");
    const [formAway, setFormAway] = useState("");
    const [formPrediction, setFormPrediction] = useState("");
    const [formMatchCote, setFormMatchCote] = useState("1.50");
    const [editingId, setEditingId] = useState<number | null>(null);

    // Simple hash function for password check
    async function hashPassword(pwd: string): Promise<string> {
        const msgBuffer = new TextEncoder().encode(pwd);
        const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
    }

    const handleLogin = async () => {
        const hashed = await hashPassword(password);
        if (hashed === ADMIN_HASH) {
            setAuthenticated(true);
            setError("");
            loadData();
        } else {
            setError("Mot de passe incorrect");
        }
    };

    const loadData = async () => {
        setLoading(true);
        const { data: rows } = await supabase
            .from("montante_du_jour")
            .select("*")
            .order("id", { ascending: false })
            .limit(20);
        if (rows) setMontanteRows(rows);

        const { data: logData } = await supabase
            .from("logs_robot")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(20);
        if (logData) setLogs(logData);

        setLoading(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage("");

        const matchData = {
            home_team: formHome,
            away_team: formAway,
            prediction: formPrediction,
            cote: parseFloat(formMatchCote),
            commence_at: new Date().toISOString(),
        };

        const payload = {
            jour_actuel: formJour,
            mise_actuelle: parseInt(formMise),
            cote_cible: parseFloat(formCote),
            statut: formStatut,
            matchs: formHome ? [matchData] : null,
        };

        if (editingId) {
            const { error } = await supabase
                .from("montante_du_jour")
                .update(payload)
                .eq("id", editingId);
            if (error) setMessage(`❌ Erreur modification : ${error.message}`);
            else setMessage("✅ Ligne modifiée !");
        } else {
            const { error } = await supabase
                .from("montante_du_jour")
                .insert([payload]);
            if (error) setMessage(`❌ Erreur ajout : ${error.message}`);
            else setMessage("✅ Ligne ajoutée !");
        }

        resetForm();
        loadData();
    };

    const handleEdit = (row: any) => {
        setEditingId(row.id);
        setFormJour(row.jour_actuel);
        setFormMise(String(row.mise_actuelle));
        setFormCote(String(row.cote_cible));
        setFormStatut(row.statut);
        const m = row.matchs?.[0];
        setFormHome(m?.home_team || "");
        setFormAway(m?.away_team || "");
        setFormPrediction(m?.prediction || "");
        setFormMatchCote(m?.cote ? String(m.cote) : "1.50");
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Supprimer cette ligne ?")) return;
        const { error } = await supabase.from("montante_du_jour").delete().eq("id", id);
        if (error) setMessage(`❌ ${error.message}`);
        else setMessage("✅ Ligne supprimée");
        loadData();
    };

    const resetForm = () => {
        setEditingId(null);
        setFormJour(1);
        setFormMise("1000");
        setFormCote("1.50");
        setFormStatut("EN_COURS");
        setFormHome("");
        setFormAway("");
        setFormPrediction("");
        setFormMatchCote("1.50");
    };

    if (!authenticated) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
                <div className="bg-slate-800 rounded-2xl p-8 w-full max-w-sm border border-slate-700">
                    <h1 className="text-white font-black text-xl mb-6 text-center">🔐 Admin Montante</h1>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                        placeholder="Mot de passe"
                        className="w-full px-4 py-3 rounded-xl bg-slate-700 text-white border border-slate-600 placeholder:text-slate-400 mb-4 text-sm"
                    />
                    {error && <p className="text-red-400 text-xs mb-4">{error}</p>}
                    <button
                        onClick={handleLogin}
                        className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold rounded-xl hover:opacity-90 transition"
                    >
                        Connexion
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-900 text-white p-4 sm:p-8">
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <h1 className="text-xl font-black">⚙️ Admin Montante</h1>
                    <button onClick={loadData} className="text-xs text-slate-400 hover:text-white transition">
                        🔄 Rafraîchir
                    </button>
                </div>

                {message && (
                    <div className="bg-slate-800 rounded-xl p-3 mb-6 text-sm border border-slate-700">
                        {message}
                    </div>
                )}

                {/* Formulaire */}
                <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 mb-8">
                    <h2 className="font-black text-sm mb-4">{editingId ? `✏️ Modifier #${editingId}` : "➕ Ajouter une ligne"}</h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-3 gap-3">
                            <div>
                                <label className="text-[10px] text-slate-400 uppercase font-bold">Jour</label>
                                <input type="number" value={formJour} onChange={e => setFormJour(parseInt(e.target.value) || 1)}
                                    className="w-full px-3 py-2 rounded-xl bg-slate-700 border border-slate-600 text-white text-sm" />
                            </div>
                            <div>
                                <label className="text-[10px] text-slate-400 uppercase font-bold">Mise (FCFA)</label>
                                <input type="number" value={formMise} onChange={e => setFormMise(e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl bg-slate-700 border border-slate-600 text-white text-sm" />
                            </div>
                            <div>
                                <label className="text-[10px] text-slate-400 uppercase font-bold">Cote cible</label>
                                <input type="number" step="0.01" value={formCote} onChange={e => setFormCote(e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl bg-slate-700 border border-slate-600 text-white text-sm" />
                            </div>
                        </div>

                        <div>
                            <label className="text-[10px] text-slate-400 uppercase font-bold">Statut</label>
                            <select value={formStatut} onChange={e => setFormStatut(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl bg-slate-700 border border-slate-600 text-white text-sm">
                                <option value="EN_COURS">⏳ En cours</option>
                                <option value="GAGNE">✅ Gagné</option>
                                <option value="PERDU">❌ Perdu</option>
                                <option value="COMPLETED">🏁 Complété</option>
                                <option value="GAGNE_COTE_1">🔄 Reporté (cote 1.0)</option>
                            </select>
                        </div>

                        <div className="border-t border-slate-700 pt-4">
                            <p className="text-[10px] text-slate-400 uppercase font-bold mb-3">Match associé (optionnel)</p>
                            <div className="grid grid-cols-2 gap-3">
                                <input type="text" value={formHome} onChange={e => setFormHome(e.target.value)}
                                    placeholder="Équipe domicile"
                                    className="px-3 py-2 rounded-xl bg-slate-700 border border-slate-600 text-white text-sm placeholder:text-slate-500" />
                                <input type="text" value={formAway} onChange={e => setFormAway(e.target.value)}
                                    placeholder="Équipe extérieure"
                                    className="px-3 py-2 rounded-xl bg-slate-700 border border-slate-600 text-white text-sm placeholder:text-slate-500" />
                                <input type="text" value={formPrediction} onChange={e => setFormPrediction(e.target.value)}
                                    placeholder="Pronostic (ex: Double chance : 1X)"
                                    className="col-span-2 px-3 py-2 rounded-xl bg-slate-700 border border-slate-600 text-white text-sm placeholder:text-slate-500" />
                                <input type="number" step="0.01" value={formMatchCote} onChange={e => setFormMatchCote(e.target.value)}
                                    placeholder="Cote du match"
                                    className="px-3 py-2 rounded-xl bg-slate-700 border border-slate-600 text-white text-sm placeholder:text-slate-500" />
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button type="submit"
                                className="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold rounded-xl hover:opacity-90 transition text-sm">
                                {editingId ? "💾 Enregistrer" : "➕ Ajouter"}
                            </button>
                            {editingId && (
                                <button type="button" onClick={resetForm}
                                    className="py-3 px-6 bg-slate-700 text-white font-bold rounded-xl hover:bg-slate-600 transition text-sm">
                                    Annuler
                                </button>
                            )}
                        </div>
                    </form>
                </div>

                {/* Tableau des lignes */}
                <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 mb-8">
                    <h2 className="font-black text-sm mb-4">📋 Lignes montante ({montanteRows.length})</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="text-slate-400 uppercase tracking-wider">
                                    <th className="text-left py-2 pr-2">ID</th>
                                    <th className="text-left py-2 pr-2">Jour</th>
                                    <th className="text-left py-2 pr-2">Mise</th>
                                    <th className="text-left py-2 pr-2">Statut</th>
                                    <th className="text-left py-2 pr-2">Match</th>
                                    <th className="text-right py-2">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {montanteRows.map(row => (
                                    <tr key={row.id} className="border-t border-slate-700/50">
                                        <td className="py-2 pr-2 font-bold">#{row.id}</td>
                                        <td className="py-2 pr-2">{row.jour_actuel}/17</td>
                                        <td className="py-2 pr-2">{row.mise_actuelle.toLocaleString()} F</td>
                                        <td className="py-2 pr-2">
                                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${row.statut === "GAGNE" ? "bg-emerald-500/20 text-emerald-400" :
                                                    row.statut === "PERDU" ? "bg-red-500/20 text-red-400" :
                                                        row.statut === "EN_COURS" ? "bg-orange-500/20 text-orange-400" :
                                                            "bg-slate-500/20 text-slate-400"
                                                }`}>{row.statut}</span>
                                        </td>
                                        <td className="py-2 pr-2 truncate max-w-[150px]">
                                            {row.matchs?.[0]?.home_team
                                                ? `${row.matchs[0].home_team} vs ${row.matchs[0].away_team}`
                                                : "—"}
                                        </td>
                                        <td className="py-2 text-right">
                                            <button onClick={() => handleEdit(row)} className="text-blue-400 hover:text-blue-300 mr-2">✏️</button>
                                            <button onClick={() => handleDelete(row.id)} className="text-red-400 hover:text-red-300">🗑️</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Logs */}
                <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
                    <h2 className="font-black text-sm mb-4">📝 Logs robot ({logs.length})</h2>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                        {logs.map((log, i) => (
                            <div key={i} className={`text-xs p-2 rounded-lg ${log.level === "error" ? "bg-red-500/10 text-red-400" :
                                    log.level === "warning" ? "bg-orange-500/10 text-orange-400" :
                                        "bg-slate-700/50 text-slate-400"
                                }`}>
                                <span className="font-mono text-[9px] opacity-60">
                                    {new Date(log.created_at).toLocaleString("fr-FR")}
                                </span>
                                {" "}
                                <span className="font-bold">[{log.level.toUpperCase()}]</span> {log.message}
                            </div>
                        ))}
                        {logs.length === 0 && <p className="text-slate-500 text-xs">Aucun log pour le moment.</p>}
                    </div>
                </div>
            </div>
        </div>
    );
}