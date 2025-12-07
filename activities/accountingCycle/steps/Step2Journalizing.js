import React from 'https://esm.sh/react@18.2.0';
import htm from 'https://esm.sh/htm';
import { Plus } from 'https://esm.sh/lucide-react@0.263.1';
import { JournalRow } from '../components.js';

const html = htm.bind(React.createElement);

export default function Step2Journalizing({ transactions = [], data, onChange, showFeedback, validAccounts, isReadOnly }) {
    if (!transactions || transactions.length === 0) return html`<div className="p-4 bg-red-50 text-red-600 rounded border border-red-200">No transactions generated.</div>`;
    
    return html`
        <div className="border border-gray-400 shadow-sm min-h-[200px]">
            <div className="flex bg-gray-800 text-white border-b border-gray-400 font-bold text-sm text-center"><div className="w-16 border-r p-2">Date</div><div className="flex-1 border-r p-2">Account Titles</div><div className="w-16 border-r p-2">PR</div><div className="w-24 border-r p-2">Debit</div><div className="w-24 p-2">Credit</div><div className="w-8"></div></div>
            ${transactions.map((t, tIdx) => {
                const entry = data[t.id] || {};
                let initialRows = entry.rows;
                if (!initialRows) {
                    if (tIdx === 0) { initialRows = [{ id: 'year', date: '', acc: '', dr: '', cr: '', pr: '' }, { id: 1, date: '', acc: '', dr: '', cr: '', pr: '' }, { id: 2, date: '', acc: '', dr: '', cr: '', pr: '' }, { id: 'desc', date: '', acc: `        ${t.description}`, dr: '', cr: '', pr: '', isDescription: true }]; } 
                    else { initialRows = [{ id: 1, date: '', acc: '', dr: '', cr: '', pr: '' }, { id: 2, date: '', acc: '', dr: '', cr: '', pr: '' }, { id: 'desc', date: '', acc: `        ${t.description}`, dr: '', cr: '', pr: '', isDescription: true }]; }
                }
                const rows = initialRows;
                const updateRow = (idx, field, val) => { const newRows = [...rows]; if(!newRows[idx]) newRows[idx] = {}; newRows[idx] = { ...newRows[idx], [field]: val }; onChange(t.id, newRows); };
                const addRow = () => { const newRows = [...rows]; const descRow = newRows.pop(); newRows.push({ id: Date.now(), date: '', acc: '', dr: '', cr: '', pr: '' }); newRows.push(descRow); onChange(t.id, newRows); };
                const deleteRow = (idx) => { const minRows = tIdx === 0 ? 4 : 3; if (rows.length <= minRows) return; const newRows = rows.filter((_, i) => i !== idx); onChange(t.id, newRows); };
                
                return html`
                    <div key=${t.id} className="border-b border-gray-300 text-sm">
                        <div className="bg-gray-50 px-2 py-1 text-xs font-bold text-gray-700 border-b border-gray-200">${t.date}. ${t.description}</div>
                        ${rows.map((row, idx) => html`<${JournalRow} key=${idx} row=${row} idx=${idx} tIdx=${tIdx} updateRow=${updateRow} deleteRow=${deleteRow} showFeedback=${showFeedback} isReadOnly=${isReadOnly} t=${t} />`)}
                        <div className="bg-gray-50 p-1 flex justify-center border-t">${!isReadOnly && html`<button onClick=${addRow} className="text-xs border border-dashed border-gray-400 rounded px-2 py-1 text-gray-600 hover:bg-white hover:text-blue-600 flex items-center gap-1 transition-colors"><${Plus} size=${12}/> Add Row</button>`}</div>
                    </div>
                `;
            })}
        </div>
    `;
}
