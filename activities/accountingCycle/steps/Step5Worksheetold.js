// --- Step5Worksheet.js ---
import React, { useState, useEffect, useMemo } from 'https://esm.sh/react@18.2.0';
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
    
    // 1. Validation Logic
    const mergedAccounts = useMemo(() => { 
        const s = new Set(Object.keys(ledgerData)); 
        adjustments.forEach(adj => { s.add(adj.drAcc); s.add(adj.crAcc); }); 
        return sortAccounts(Array.from(s)); 
    }, [ledgerData, adjustments]);

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

    // 2. Rows State
    const initialRows = useMemo(() => Array.from({ length: 10 }).map((_, i) => ({ id: i, account: '', tbDr: '', tbCr: '', adjDr: '', adjCr: '', atbDr: '', atbCr: '', isDr: '', isCr: '', bsDr: '', bsCr: '' })), []);
    const rows = data.rows || initialRows;

    // 3. Footers State (LOCAL STATE FIX)
    // We initialize local state so inputs respond instantly, then sync to parent.
    const [localFooters, setLocalFooters] = useState({
        totals: {}, 
        net: {}, 
        final: {} 
    });

    // Sync local state with props on load (or if props change externally)
    useEffect(() => {
        if (data.footers) {
            setLocalFooters(prev => ({
                totals: { ...prev.totals, ...data.footers.totals },
                net: { ...prev.net, ...data.footers.net },
                final: { ...prev.final, ...data.footers.final }
            }));
        }
    }, [data.footers]);

    // 4. Handlers
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
        // 1. Update Local State (Instant Feedback)
        const newSection = { ...localFooters[section], [field]: val };
        const newFooters = { ...localFooters, [section]: newSection };
        setLocalFooters(newFooters);

        // 2. Update Parent State (Data Persistence)
        onChange('footers', newFooters);
    };

    // 5. Render Helpers
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
                        
                        <tr className="bg-purple-100 font-bold border-t-2 border-purple-500 text-purple-900">
                            <td className="p-1 border-r text-left pl-2 sticky left-0 bg-purple-100">COLUMN TOTALS</td>
                            ${['tbDr', 'tbCr', 'adjDr', 'adjCr', 'atbDr', 'atbCr', 'isDr', 'isCr', 'bsDr', 'bsCr'].map(col => html`
                                <td key=${col} className="border-r p-0">
                                    <input type="number" className="w-full text-right p-1 text-xs outline-none bg-transparent hover:bg-purple-200 focus:bg-white" 
                                           value=${localFooters.totals?.[col] ?? ''} 
                                           onChange=${(e) => updateFooter('totals', col, e.target.value)} 
                                           disabled=${isReadOnly} />
                                </td>
                            `)}
                            <td className="bg-purple-100"></td>
                        </tr>

                        <tr className="bg-green-50 font-bold text-green-800 border-t border-green-200">
                            <td className="p-1 border-r text-left pl-2 sticky left-0 bg-green-50">Net Income (Loss)</td>
                            <td colSpan="6" className="border-r bg-gray-50"></td>
                            <td className="border-r p-0"><input type="number" className="w-full text-right p-1 text-xs outline-none bg-transparent hover:bg-green-100 focus:bg-white" value=${localFooters.net?.isDr ?? ''} onChange=${(e) => updateFooter('net', 'isDr', e.target.value)} disabled=${isReadOnly} /></td>
                            <td className="border-r p-0"><input type="number" className="w-full text-right p-1 text-xs outline-none bg-transparent hover:bg-green-100 focus:bg-white" value=${localFooters.net?.isCr ?? ''} onChange=${(e) => updateFooter('net', 'isCr', e.target.value)} disabled=${isReadOnly} /></td>
                            <td className="border-r p-0"><input type="number" className="w-full text-right p-1 text-xs outline-none bg-transparent hover:bg-green-100 focus:bg-white" value=${localFooters.net?.bsDr ?? ''} onChange=${(e) => updateFooter('net', 'bsDr', e.target.value)} disabled=${isReadOnly} /></td>
                            <td className="border-r p-0"><input type="number" className="w-full text-right p-1 text-xs outline-none bg-transparent hover:bg-green-100 focus:bg-white" value=${localFooters.net?.bsCr ?? ''} onChange=${(e) => updateFooter('net', 'bsCr', e.target.value)} disabled=${isReadOnly} /></td>
                            <td className="bg-green-50"></td>
                        </tr>

                        <tr className="bg-indigo-100 font-extrabold text-indigo-900 border-t-2 border-indigo-700">
                            <td className="p-1 border-r text-center sticky left-0 bg-indigo-100">FINAL TOTALS</td>
                            ${['tbDr', 'tbCr', 'adjDr', 'adjCr', 'atbDr', 'atbCr', 'isDr', 'isCr', 'bsDr', 'bsCr'].map(col => html`
                                <td key=${col} className="border-r p-0">
                                    <input type="number" className="w-full text-right p-1 text-xs outline-none bg-transparent hover:bg-indigo-200 focus:bg-white" 
                                           value=${localFooters.final?.[col] ?? ''} 
                                           onChange=${(e) => updateFooter('final', col, e.target.value)} 
                                           disabled=${isReadOnly} />
                                </td>`
                            )}
                            <td className="bg-indigo-100"></td>
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
