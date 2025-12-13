// --- Step2Journalizing.js ---
import React from 'https://esm.sh/react@18.2.0';
import htm from 'https://esm.sh/htm';
import { Plus, Check, X, Trash2 } from 'https://esm.sh/lucide-react@0.263.1';

const html = htm.bind(React.createElement);

// --- INTERNAL COMPONENTS ---

const StatusIcon = ({ correct, show }) => {
    if (!show) return null;
    return correct 
        ? html`<${Check} size=${14} className="text-green-600 inline ml-1" />` 
        : html`<${X} size=${14} className="text-red-600 inline ml-1" />`;
};

const JournalRow = ({ row, idx, tIdx, updateRow, deleteRow, showFeedback, isReadOnly, t }) => {
    const isDesc = row.isDescription;
    const isYearRow = tIdx === 0 && idx === 0;
    
    const getValidationState = () => {
        if (!showFeedback) return null;
        if (tIdx === 0 && idx === 0) { 
            const txnDate = new Date(t.date); 
            const yyyy = txnDate.getFullYear().toString(); 
            const val = row.date?.trim(); 
            const isEmptyOthers = !row.acc && !row.pr && !row.dr && !row.cr; 
            return val === yyyy && isEmptyOthers; 
        }
        if ((tIdx === 0 && idx === 1) || (tIdx > 0 && idx === 0)) { 
            const txnDate = new Date(t.date); 
            const mm = txnDate.toLocaleString('default', { month: 'short' }); 
            const dd = txnDate.getDate().toString(); 
            const dd0 = dd.padStart(2, '0'); 
            const val = row.date?.trim(); 
            let dateValid = false; 
            if (tIdx === 0 && idx === 1) dateValid = val === `${mm} ${dd}` || val === `${mm} ${dd0}`; 
            else dateValid = val === dd || val === dd0; 
            if (!dateValid) return false; 
        }
        if (!row.isDescription && row.acc) { 
            const acc = row.acc.trim(); 
            const dr = Number(row.dr) || 0; 
            const cr = Number(row.cr) || 0; 
            const isDebit = dr > 0; 
            const isCredit = cr > 0; 
            if (!isDebit && !isCredit) return null; 
            if (isDebit && row.acc[0] === ' ') return false; 
            if (isCredit && !row.acc.startsWith('     ')) return false; 
            const targetList = isDebit ? t.debits : t.credits; 
            const match = targetList.some(item => item.account === acc && Math.abs(item.amount - (isDebit ? dr : cr)) <= 1); 
            return match; 
        }
        return null;
    };

    const isValid = getValidationState();
    let datePlaceholder = "";
    if (tIdx === 0) { if (idx === 0) datePlaceholder = "YYYY"; else if (idx === 1) datePlaceholder = "Mmm dd"; } else { if (idx === 0) datePlaceholder = "dd"; }

    return html`
        <div className=${`flex h-8 items-center border-t border-gray-100 ${isDesc ? 'bg-white text-gray-600' : ''}`}>
            <div className="w-16 h-full border-r relative">
                ${!isDesc && html`
                    <input type="text" className=${`w-full h-full px-1 text-xs outline-none bg-transparent text-right ${isValid === false && (idx===0 || (tIdx===0 && idx===1)) ? 'bg-red-50' : ''}`} value=${row.date || ''} onChange=${(e)=>updateRow(idx, 'date', e.target.value)} placeholder=${datePlaceholder} disabled=${isReadOnly}/>
                    ${(idx === 0 || (tIdx===0 && idx===1)) && html`<div className="absolute left-0 top-1"><${StatusIcon} show=${showFeedback} correct=${isValid} /></div>`}
                `}
            </div>
            <div className="flex-1 h-full border-r relative">
                ${isDesc 
                    ? html`<div className="px-2 w-full h-full flex items-center overflow-hidden whitespace-pre-wrap text-xs font-mono absolute top-0 left-0 z-10 bg-white border-r" style=${{width: 'calc(100% + 16rem)'}}>${row.acc}</div>`
                    : (!isYearRow && html`
                        <input type="text" className=${`w-full h-full px-2 outline-none font-mono text-xs ${isValid === false ? 'bg-red-50' : ''}`} value=${row.acc || ''} onChange=${(e)=>updateRow(idx, 'acc', e.target.value)} placeholder="Account Title" disabled=${isReadOnly}/>
                        <div className="absolute right-1 top-1"><${StatusIcon} show=${showFeedback && (row.dr > 0 || row.cr > 0)} correct=${isValid} /></div>
                    `)
                }
            </div>
            <div className="w-16 h-full border-r">
                ${!isDesc && !isYearRow && html`<input type="text" className="w-full h-full text-center outline-none bg-transparent" value=${row.pr || ''} onChange=${(e)=>updateRow(idx, 'pr', e.target.value)} disabled=${isReadOnly} />`}
            </div>
            <div className="w-24 h-full border-r relative">
                ${!isDesc && !isYearRow && html`<input type="number" className="w-full h-full px-2 text-right outline-none bg-transparent" value=${row.dr||''} onChange=${(e)=>updateRow(idx,'dr',e.target.value)} disabled=${isReadOnly} />`}
            </div>
            <div className="w-24 h-full border-r relative">
                ${!isDesc && !isYearRow && html`<input type="number" className="w-full h-full px-2 text-right outline-none bg-transparent" value=${row.cr||''} onChange=${(e)=>updateRow(idx,'cr',e.target.value)} disabled=${isReadOnly} />`}
            </div>
            <div className="w-8 flex justify-center items-center">
                ${!isDesc && !isYearRow && !isReadOnly && html`<button onClick=${() => deleteRow(idx)} className="text-red-400 hover:text-red-600"><${Trash2} size=${14}/></button>`}
            </div>
        </div>
    `;
};

// --- MAIN EXPORT ---

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
