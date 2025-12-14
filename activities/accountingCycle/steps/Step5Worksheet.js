// -------------------------
// --- Step5Worksheet.js ---
// -------------------------
import React, { useState, useMemo } from 'https://esm.sh/react@18.2.0';
import htm from 'https://esm.sh/htm';
import { Table, Trash2, Plus, List, ChevronDown, ChevronRight } from 'https://esm.sh/lucide-react@0.263.1';
import { sortAccounts } from '../utils.js';

const html = htm.bind(React.createElement);

// --- INTERNAL COMPONENTS ---

const SimpleLedgerView = ({ ledgerData }) => {
    const [expanded, setExpanded] = useState(true);
    const sortedKeys = sortAccounts(Object.keys(ledgerData));
    
    return html`
        <div className="mb-4 border rounded-lg shadow-sm bg-blue-50 overflow-hidden no-print">
            <div className="bg-blue-100 p-2 font-bold text-blue-900 cursor-pointer flex justify-between" onClick=${()=>setExpanded(!expanded)}>
                <span><${Table} size=${16} className="inline mr-2"/>Source: General Ledger Balances</span>
                ${expanded ? html`<${ChevronDown} size=${16}/>` : html`<${ChevronRight} size=${16}/>`}
            </div>
            ${expanded && html`
                <div className="p-2 max-h-40 overflow-y-auto flex flex-wrap gap-2">
                    ${sortedKeys.map(acc => { 
                        const bal = ledgerData[acc].debit - ledgerData[acc].credit; 
                        return html`
                            <div key=${acc} className="bg-white border px-2 py-1 text-xs rounded shadow-sm">
                                <span className="font-semibold">${acc}:</span> 
                                <span className=${bal >= 0 ? "text-blue-600 ml-1" : "text-green-600 ml-1"}>
                                    ${Math.abs(bal).toLocaleString()}
                                </span>
                            </div>
                        `; 
                    })}
                </div>
            `}
        </div>
    `;
};

// --- MAIN EXPORT ---

export default function Step5Worksheet({ ledgerData, adjustments, data, onChange, showFeedback, isReadOnly }) {
    // 1. Expected Data for Validation Coloring
    // Merged accounts derived from ledger + adjustments (Read-Only reference)
    const mergedAccounts = useMemo(() => { 
        const s = new Set(Object.keys(ledgerData)); 
        adjustments.forEach(adj => { s.add(adj.drAcc); s.add(adj.crAcc); }); 
        return sortAccounts(Array.from(s)); 
    }, [ledgerData, adjustments]);

    // Build map for easy validation lookup: { "Cash": { tbDr: 100, tbCr: 0, ... }, ... }
    const expectedValuesMap = useMemo(() => {
        const map = {};
        mergedAccounts.forEach(acc => {
             const ledgerBal = (ledgerData[acc]?.debit || 0) - (ledgerData[acc]?.credit || 0);
             const tbDr = ledgerBal > 0 ? ledgerBal : 0; 
             const tbCr = ledgerBal < 0 ? Math.abs(ledgerBal) : 0;
             let aDr = 0; let aCr = 0;
             adjustments.forEach(a => { if (a.drAcc === acc) aDr += a.amount; if (a.crAcc === acc) aCr += a.amount; });
             let atbNet = (tbDr - tbCr) + (aDr - aCr);
             const atbDr = atbNet > 0 ? atbNet : 0; 
             const atbCr = atbNet < 0 ? Math.abs(atbNet) : 0;
             map[acc] = { tbDr, tbCr, adjDr: aDr, adjCr: aCr, atbDr, atbCr };
        });
        return map;
    }, [mergedAccounts, ledgerData, adjustments]);

    // 2. State Initialization
    const initialRows = useMemo(() => Array.from({ length: 10 }).map((_, i) => ({ id: i, account: '', tbDr: '', tbCr: '', adjDr: '', adjCr: '', atbDr: '', atbCr: '', isDr: '', isCr: '', bsDr: '', bsCr: '' })), []);
    const rows = data.rows || initialRows;

    // --- FIX STARTS HERE ---
    // Safely decompose footers so keys always exist, even if data.footers is {}
    const rawFooters = data.footers || {};
    const footers = {
        totals: rawFooters.totals || {},
        net: rawFooters.net || {},
        final: rawFooters.final || {}
    };
    // --- FIX ENDS HERE ---

    // 3. Handlers
    const updateRow = (idx, field, val) => {
        const newRows = [...rows];
        newRows[idx] = { ...newRows[idx], [field]: val };
        onChange('rows', newRows);
    };

    const addRow = () => {
        const newId = rows.length > 0 ? Math.max(...rows.map(r => r.id)) + 1 : 0;
        onChange('rows', [...rows, { id: newId, account: '', tbDr: '', tbCr: '', adjDr: '', adjCr: '', atbDr: '', atbCr: '', isDr: '', isCr: '', bsDr: '', bsCr: '' }]);
    };

    const deleteRow = (idx) => {
        const newRows = rows.filter((_, i) => i !== idx);
        onChange('rows', newRows);
    };

    const updateFooter = (section, field, val) => {
        // Deep copy to prevent mutating props/state directly
        const newFooters = {
            totals: { ...footers.totals },
            net: { ...footers.net },
            final: { ...footers.final }
        };
        
        newFooters[section][field] = val;
        onChange('footers', newFooters);
    };

    // 4. Render Helpers
    const inputClass = (isError) => `w-full text-right p-1 text-xs outline-none border border-transparent hover:border-gray-300 focus:border-blue-500 bg-transparent ${isError ? 'bg-red-50 text-red-600 font-bold' : ''}`;

    const getRowFeedback = (row) => {
         if (!showFeedback) return {};
         const acc = row.account?.trim();
         if (!acc) return {};
         
         const expected = expectedValuesMap[Object.keys(expectedValuesMap).find(k => k.toLowerCase() === acc.toLowerCase())];
         if (!expected) return { account: 'bg-red-100 text-red-600' };

         const styles = { account: 'text-green-600 font-bold' };
         ['tbDr', 'tbCr', 'adjDr', 'adjCr', 'atbDr', 'atbCr'].forEach(key => {
             const userVal = Number(row[key]) || 0;
             const expVal = expected[key] || 0;
             if (Math.abs(userVal - expVal) > 1) styles[key] = 'text-red-600 font-bold bg-red-50';
         });
         return styles;
    };

    return html`
        <div className="w-full">
            <div className="flex flex-col lg:flex-row gap-4 mb-4">
                <div className="flex-1"><${SimpleLedgerView} ledgerData=${ledgerData} /></div>
                <div className="flex-1 border rounded-lg shadow-sm bg-yellow-50 overflow-hidden">
                    <div className="bg-yellow-100 p-2 font-bold text-yellow-900 flex items-center gap-2"><${List} size=${16}/> Adjustments Data</div>
                    <div className="p-2 max-h-40 overflow-y-auto"><ul className="list-decimal list-inside text-xs space-y-1">${adjustments.map(adj => html`<li key=${adj.id}>${adj.desc}</li>`)}</ul></div>
                </div>
            </div>

            <div className="border rounded-lg shadow-md bg-white overflow-x-auto custom-scrollbar">
                <table className="w-full text-xs min-w-[1200px] border-collapse">
                    <thead>
                        <tr className="bg-gray-800 text-white text-center">
                            <th rowSpan="2" className="p-2 border-r border-gray-600 text-left w-48 sticky left-0 bg-gray-800 z-10">Account Title</th>
                            <th colSpan="2" className="p-1 border-r border-gray-600 bg-blue-900">Unadjusted Trial Balance</th>
                            <th colSpan="2" className="p-1 border-r border-gray-600 bg-yellow-900">Adjustments</th>
                            <th colSpan="2" className="p-1 border-r border-gray-600 bg-purple-900">Adjusted Trial Balance</th>
                            <th colSpan="2" className="p-1 border-r border-gray-600 bg-green-900">Income Statement</th>
                            <th colSpan="2" className="p-1 bg-indigo-900">Balance Sheet</th>
                            <th rowSpan="2" className="w-8 bg-gray-800"></th>
                        </tr>
                        <tr className="bg-gray-700 text-white text-center">
                             ${['Debit', 'Credit', 'Debit', 'Credit', 'Debit', 'Credit', 'Debit', 'Credit', 'Debit', 'Credit'].map(h => html`<th className="p-1 w-20 border-r border-gray-600">${h}</th>`)}
                        </tr>
                    </thead>
                    <tbody>
                        ${rows.map((row, idx) => {
                            const feedback = getRowFeedback(row);
                            return html`
                                <tr key=${row.id} className="border-b hover:bg-blue-50">
                                    <td className="p-0 border-r text-left relative sticky left-0 z-0 bg-white">
                                        <input type="text" className=${`w-full h-full p-1 outline-none ${feedback.account || ''}`} value=${row.account} onChange=${(e) => updateRow(idx, 'account', e.target.value)} disabled=${isReadOnly} placeholder="Account Title"/>
                                    </td>
                                    ${['tbDr', 'tbCr', 'adjDr', 'adjCr', 'atbDr', 'atbCr', 'isDr', 'isCr', 'bsDr', 'bsCr'].map(col => html`
                                        <td key=${col} className="border-r p-0 relative">
                                            <input type="number" className=${inputClass(!!feedback[col])} value=${row[col]} onChange=${(e) => updateRow(idx, col, e.target.value)} disabled=${isReadOnly} />
                                        </td>
                                    `)}
                                    <td className="p-0 text-center">
                                        ${!isReadOnly && html`<button onClick=${() => deleteRow(idx)} className="text-gray-400 hover:text-red-600 p-1"><${Trash2} size=${14}/></button>`}
                                    </td>
                                </tr>
                            `;
                        })}
                        <tr className="bg-gray-100 font-bold border-t-2 border-gray-400">
                            <td className="p-1 border-r text-right sticky left-0 bg-gray-100">Column Totals</td>
                            ${['tbDr', 'tbCr', 'adjDr', 'adjCr', 'atbDr', 'atbCr', 'isDr', 'isCr', 'bsDr', 'bsCr'].map(col => html`
                                <td key=${col} className="border-r p-0">
                                    <input type="number" className=${inputClass(false)} value=${footers.totals[col] || ''} onChange=${(e) => updateFooter('totals', col, e.target.value)} disabled=${isReadOnly} />
                                </td>
                            `)}
                            <td></td>
                        </tr>
                        <tr className="bg-white border-t border-gray-200">
                            <td className="p-1 border-r text-right sticky left-0 bg-white font-medium">Net Income (Loss)</td>
                            <td colSpan="6" className="border-r bg-gray-50 text-center text-xs text-gray-400 italic"></td>
                            <td className="border-r p-0"><input type="number" className=${inputClass(false)} value=${footers.net.isDr || ''} onChange=${(e) => updateFooter('net', 'isDr', e.target.value)} disabled=${isReadOnly} placeholder="NI" /></td>
                            <td className="border-r p-0"><input type="number" className=${inputClass(false)} value=${footers.net.isCr || ''} onChange=${(e) => updateFooter('net', 'isCr', e.target.value)} disabled=${isReadOnly} placeholder="NL" /></td>
                            <td className="border-r p-0"><input type="number" className=${inputClass(false)} value=${footers.net.bsDr || ''} onChange=${(e) => updateFooter('net', 'bsDr', e.target.value)} disabled=${isReadOnly} placeholder="NL" /></td>
                            <td className="border-r p-0"><input type="number" className=${inputClass(false)} value=${footers.net.bsCr || ''} onChange=${(e) => updateFooter('net', 'bsCr', e.target.value)} disabled=${isReadOnly} placeholder="NI" /></td>
                            <td></td>
                        </tr>
                        <tr className="bg-gray-200 font-extrabold border-t-2 border-black border-b-2">
                            <td className="p-1 border-r text-right sticky left-0 bg-gray-200">Final Total</td>
                            ${['tbDr', 'tbCr', 'adjDr', 'adjCr', 'atbDr', 'atbCr', 'isDr', 'isCr', 'bsDr', 'bsCr'].map(col => html`<td key=${col} className="border-r p-0"><input type="number" className=${inputClass(false)} value=${footers.final[col] || ''} onChange=${(e) => updateFooter('final', col, e.target.value)} disabled=${isReadOnly} /></td>`)}
                            <td></td>
                        </tr>
                    </tbody>
                </table>
            </div>
            ${!isReadOnly && html`
                <div className="mt-2">
                    <button onClick=${addRow} className="text-xs bg-blue-50 border border-blue-200 text-blue-600 px-3 py-1 rounded hover:bg-blue-100 flex items-center gap-1 font-bold">
                        <${Plus} size=${14}/> Add Row
                    </button>
                </div>
            `}
        </div>
    `;
}
