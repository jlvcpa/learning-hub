import React, { useState, useMemo } from 'https://esm.sh/react@18.2.0';
import htm from 'https://esm.sh/htm';
import { Book, Check, X, ChevronDown, ChevronRight, Table, AlertCircle, Plus, Trash2, Printer, Lock, List } from 'https://esm.sh/lucide-react@0.263.1';
import { ActivityHelper, sortAccounts, getAccountType, EQUITY_CAUSES } from './utils.js';

const html = htm.bind(React.createElement);

const StatusIcon = ({ correct, show }) => {
    if (!show) return null;
    return correct 
        ? html`<${Check} size=${14} className="text-green-600 inline ml-1" />` 
        : html`<${X} size=${14} className="text-red-600 inline ml-1" />`;
};

// --- SUB-COMPONENTS TO PREVENT SYNTAX ERRORS ---

const JournalRow = ({ row, idx, tIdx, updateRow, deleteRow, showFeedback, isReadOnly, t }) => {
    const isDesc = row.isDescription;
    const isYearRow = tIdx === 0 && idx === 0;
    
    // Validation Logic extracted here
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

const LedgerAccount = ({ l, idx, ledgerKey, updateLedger, updateSideRow, addRow, deleteLedger, isReadOnly, showFeedback }) => {
    const correctDr = ledgerKey[l.account]?.debit || 0; 
    const correctCr = ledgerKey[l.account]?.credit || 0; 
    const correctBal = Math.abs(correctDr - correctCr); 
    const leftRows = l.leftRows && l.leftRows.length > 0 ? l.leftRows : [{}, {}, {}, {}]; 
    const rightRows = l.rightRows && l.rightRows.length > 0 ? l.rightRows : [{}, {}, {}, {}];
    const maxRows = Math.max(leftRows.length, rightRows.length);
    const displayRows = Array.from({length: maxRows}).map((_, i) => i);

    const getTotalStyle = (total, correct) => {
         if (!showFeedback && !isReadOnly) return "bg-white text-black";
         return Math.abs(Number(total) - correct) <= 1 ? "text-green-600 font-bold" : "text-red-600 font-bold";
    };

    return html`
        <div className="border-2 border-gray-800 bg-white shadow-md">
            <div className="border-b-2 border-gray-800 p-2 flex justify-between bg-gray-100 relative">
                <div className="absolute left-2 top-2"><${StatusIcon} show=${showFeedback} correct=${!!ledgerKey[l.account]} /></div>
                <div className="w-full text-center mx-8"><input list="step3-accs" className="w-full border-b border-gray-400 text-center bg-transparent font-bold text-lg outline-none" placeholder="Account Title" value=${l.account} onChange=${(e)=>updateLedger(idx,'account',e.target.value)} disabled=${isReadOnly} /></div>
                ${!isReadOnly && html`<button onClick=${() => deleteLedger(idx)} className="absolute right-2 top-2 text-red-500 hover:text-red-700"><${Trash2} size=${16}/></button>`}
            </div>
            <div className="flex">
                <div className="flex-1 border-r-2 border-gray-800">
                    <div className="text-center font-bold border-b border-gray-400 bg-gray-50">DEBIT</div>
                    <div className="flex text-xs font-bold border-b border-gray-400"><div className="w-16 border-r p-1 text-center">Date</div><div className="flex-1 border-r p-1 text-center">Particulars</div><div className="w-10 border-r p-1 text-center">PR</div><div className="w-20 p-1 text-center">Amount</div></div>
                    ${displayRows.map(rowIdx => {
                        const row = leftRows[rowIdx] || {};
                        return html`
                            <div key=${`l-${rowIdx}`} className="flex text-xs border-b border-gray-200 h-8 relative">
                                <div className="w-16 border-r relative"><input type="text" className="w-full h-full text-right px-1 outline-none bg-transparent" value=${row.date||''} onChange=${(e)=>updateSideRow(idx,'left',rowIdx,'date',e.target.value)} disabled=${isReadOnly}/></div>
                                <div className="flex-1 border-r relative"><input type="text" className="w-full h-full text-left px-1 outline-none bg-transparent" value=${row.part||''} onChange=${(e)=>updateSideRow(idx,'left',rowIdx,'part',e.target.value)} disabled=${isReadOnly}/></div>
                                <div className="w-10 border-r relative"><input type="text" className="w-full h-full text-center outline-none bg-transparent" value=${row.pr||''} onChange=${(e)=>updateSideRow(idx,'left',rowIdx,'pr',e.target.value)} disabled=${isReadOnly}/></div>
                                <div className="w-20 relative"><input type="number" className="w-full h-full text-right px-1 outline-none bg-transparent" value=${row.amount||''} onChange=${(e)=>updateSideRow(idx,'left',rowIdx,'amount',e.target.value)} disabled=${isReadOnly}/></div>
                            </div>
                        `;
                    })}
                    <div className="border-t-2 border-gray-800 p-1 flex justify-between items-center bg-gray-50"><span className="text-xs font-bold">Total Debit</span><input type="number" className=${`w-24 text-right border border-gray-300 ${getTotalStyle(l.drTotal, correctDr)}`} value=${l.drTotal||''} onChange=${(e)=>updateLedger(idx,'drTotal',e.target.value)} disabled=${isReadOnly} /></div>
                </div>
                <div className="flex-1">
                    <div className="text-center font-bold border-b border-gray-400 bg-gray-50">CREDIT</div>
                    <div className="flex text-xs font-bold border-b border-gray-400"><div className="w-16 border-r p-1 text-center">Date</div><div className="flex-1 border-r p-1 text-center">Particulars</div><div className="w-10 border-r p-1 text-center">PR</div><div className="w-20 p-1 text-center border-r">Amount</div><div className="w-6"></div></div>
                    ${displayRows.map(rowIdx => {
                        const row = rightRows[rowIdx] || {};
                        return html`
                            <div key=${`r-${rowIdx}`} className="flex text-xs border-b border-gray-200 h-8 relative">
                                <div className="w-16 border-r relative"><input type="text" className="w-full h-full text-right px-1 outline-none bg-transparent" value=${row.date||''} onChange=${(e)=>updateSideRow(idx,'right',rowIdx,'date',e.target.value)} disabled=${isReadOnly}/></div>
                                <div className="flex-1 border-r relative"><input type="text" className="w-full h-full text-left px-1 outline-none bg-transparent" value=${row.part||''} onChange=${(e)=>updateSideRow(idx,'right',rowIdx,'part',e.target.value)} disabled=${isReadOnly}/></div>
                                <div className="w-10 border-r relative"><input type="text" className="w-full h-full text-center outline-none bg-transparent" value=${row.pr||''} onChange=${(e)=>updateSideRow(idx,'right',rowIdx,'pr',e.target.value)} disabled=${isReadOnly}/></div>
                                <div className="w-20 border-r relative"><input type="number" className="w-full h-full text-right px-1 outline-none bg-transparent" value=${row.amount||''} onChange=${(e)=>updateSideRow(idx,'right',rowIdx,'amount',e.target.value)} disabled=${isReadOnly}/></div>
                            </div>
                        `;
                    })}
                    <div className="border-t-2 border-gray-800 p-1 flex justify-between items-center bg-gray-50"><span className="text-xs font-bold">Total Credit</span><input type="number" className=${`w-24 text-right border border-gray-300 ${getTotalStyle(l.crTotal, correctCr)}`} value=${l.crTotal||''} onChange=${(e)=>updateLedger(idx,'crTotal',e.target.value)} disabled=${isReadOnly} /></div>
                </div>
            </div>
            <div className="border-t border-gray-300 p-2 bg-gray-100 flex justify-center items-center gap-2">
                <span className="text-xs font-bold uppercase text-gray-600">Balance:</span>
                <select className="border border-gray-300 rounded text-xs p-1 outline-none bg-white" value=${l.balanceType || ''} onChange=${(e)=>updateLedger(idx, 'balanceType', e.target.value)} disabled=${isReadOnly}><option value="" disabled>Debit or Credit?</option><option value="Dr">Debit</option><option value="Cr">Credit</option></select>
                <input type="number" className="w-32 text-center border-b-2 border-double border-black bg-white font-bold text-sm outline-none" placeholder="0" value=${l.balance||''} onChange=${(e)=>updateLedger(idx,'balance',e.target.value)} disabled=${isReadOnly} />
                <div className="ml-2"><${StatusIcon} show=${showFeedback} correct=${!!(ledgerKey[l.account] && Math.abs(Number(l.balance)-correctBal)<=1 && l.balanceType === (correctDr >= correctCr ? 'Dr' : 'Cr'))} /></div>
            </div>
            ${!isReadOnly && html`<div className="p-2 text-center bg-gray-50 border-t border-gray-300"><button onClick=${()=>addRow(idx)} className="text-xs border border-dashed border-gray-400 rounded px-3 py-1 text-gray-600 hover:bg-white hover:text-blue-600 flex items-center gap-1 mx-auto"><${Plus} size=${12}/> Add Row</button></div>`}
        </div>
    `;
};

// --- MAIN COMPONENTS ---

const JournalSourceView = ({ transactions, journalPRs, onTogglePR, showFeedback, matchedJournalEntries, isReadOnly }) => {
    const [expanded, setExpanded] = useState(true);
    
    return html`
        <div className="mb-4 border rounded bg-white overflow-hidden shadow-sm h-[36rem]">
            <div className="bg-blue-100 p-2 font-bold text-blue-900 cursor-pointer flex justify-between items-center" onClick=${()=>setExpanded(!expanded)}>
                <span><${Book} size=${16} className="inline mr-2"/>Source: General Journal</span>
                <div className="flex items-center gap-4">
                    <span className="text-xs font-normal">Page 1</span>
                    ${expanded ? html`<${ChevronDown} size=${16}/>` : html`<${ChevronRight} size=${16}/>`}
                </div>
            </div>
            ${expanded && html`<div className="p-2 overflow-auto h-full">
                <table className="w-full text-xs table-fixed">
                    <colgroup>
                        <col className="w-16" />
                        <col />
                        <col className="w-10" />
                        <col className="w-24" />
                        <col className="w-24" />
                    </colgroup>
                    <thead className="sticky top-0 bg-white shadow-sm z-10">
                        <tr className="bg-gray-50 text-gray-700 font-semibold border-b">
                            <th className="p-2 text-center border-r">Date</th>
                            <th className="p-2 text-left border-r">Account Titles and Explanation</th>
                            <th className="p-2 text-center border-r">P.R.</th>
                            <th className="p-2 text-right border-r">Debit</th>
                            <th className="p-2 text-right">Credit</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${transactions.map((t, tIdx) => {
                            const txnDate = new Date(t.date);
                            const yyyy = txnDate.getFullYear();
                            const mm = txnDate.toLocaleString('default', { month: 'short' });
                            const dd = txnDate.getDate().toString().padStart(2, '0');
                            const isFirst = tIdx === 0;
                            const dateDisplay = isFirst ? `${mm} ${dd}` : dd;

                            return html`
                            <React.Fragment key=${t.id}>
                                ${isFirst && html`
                                    <tr key="year-row" className="bg-white border-b border-gray-100">
                                        <td className="text-right pr-1 font-bold border-r text-gray-500 py-1 align-top">${yyyy}</td>
                                        <td className="border-r"></td><td className="border-r"></td><td className="border-r"></td><td></td>
                                    </tr>
                                `}
                                
                                ${t.debits.map((d, i) => {
                                    const key = `dr-${t.id}-${i}`;
                                    const isChecked = !!journalPRs[key];
                                    const isPosted = matchedJournalEntries && matchedJournalEntries.has(key);
                                    let checkColor = "";
                                    if (showFeedback || isReadOnly) { 
                                        if (isChecked && isPosted) checkColor = "bg-green-200"; 
                                        else if (isChecked && !isPosted) checkColor = "bg-red-200"; 
                                        else if (!isChecked && isPosted) checkColor = "bg-red-200"; 
                                        else if (!isChecked && !isPosted) checkColor = "bg-red-50"; 
                                        if (!isPosted) checkColor = "bg-red-100"; 
                                    }

                                    return html`
                                        <tr key=${key} className="border-b border-gray-100 hover:bg-gray-50">
                                            <td className="text-right pr-1 py-1 align-top border-r">${i === 0 ? dateDisplay : ''}</td>
                                            <td className="pl-1 py-1 border-r font-medium text-gray-800 align-top">${d.account}</td>
                                            <td className=${`text-center border-r p-0 align-middle ${checkColor}`}>
                                                <input type="checkbox" checked=${isChecked} onChange=${() => onTogglePR(key)} disabled=${isReadOnly} className="cursor-pointer" /> 
                                            </td>
                                            <td className="text-right pr-1 py-1 border-r align-top">${d.amount.toLocaleString()}</td>
                                            <td className="py-1"></td>
                                        </tr>
                                    `;
                                })}
                                ${t.credits.map((c, i) => {
                                    const key = `cr-${t.id}-${i}`;
                                    const isChecked = !!journalPRs[key];
                                    const isPosted = matchedJournalEntries && matchedJournalEntries.has(key);
                                    let checkColor = "";
                                    if (showFeedback || isReadOnly) {
                                        if (isChecked && isPosted) checkColor = "bg-green-200";
                                        else if (isChecked && !isPosted) checkColor = "bg-red-200"; 
                                        else if (!isChecked && isPosted) checkColor = "bg-red-200";
                                        else if (!isPosted) checkColor = "bg-red-100";
                                    }

                                    return html`
                                        <tr key=${key} className="hover:bg-gray-50 border-b border-gray-100">
                                            <td className="border-r"></td>
                                            <td className="pl-6 py-1 border-r text-gray-800 align-top">${c.account}</td>
                                            <td className=${`text-center border-r p-0 align-middle ${checkColor}`}>
                                                <input type="checkbox" checked=${isChecked} onChange=${() => onTogglePR(key)} disabled=${isReadOnly} className="cursor-pointer" />
                                            </td>
                                            <td className="border-r"></td>
                                            <td className="text-right pr-1 py-1 align-top">${c.amount.toLocaleString()}</td>
                                        </tr>
                                    `;
                                })}
                                <tr key=${'desc' + t.id}>
                                    <td className="border-r"></td>
                                    <td className="pl-8 italic text-gray-500 text-xs py-1 border-r align-top">(${t.description})</td>
                                    <td className="border-r"></td>
                                    <td className="border-r"></td>
                                    <td></td>
                                </tr>
                                <tr className="h-2"><td colSpan="5" className="border-b border-gray-200"></td></tr>
                            </React.Fragment>
                        `})}
                    </tbody>
                </table>
            </div>`}
        </div>
    `;
};

const LedgerSourceView = ({ ledgerData }) => {
    const [expanded, setExpanded] = useState(true);
    const sortedKeys = sortAccounts(Object.keys(ledgerData));
    return html`
        <div className="mb-4 border rounded-lg shadow-sm bg-blue-50 overflow-hidden no-print">
            <div className="bg-blue-100 p-2 font-bold text-blue-900 cursor-pointer flex justify-between" onClick=${()=>setExpanded(!expanded)}><span><${Table} size=${16} className="inline mr-2"/>Source: General Ledger Balances</span>${expanded? html`<${ChevronDown} size=${16}/>`:html`<${ChevronRight} size=${16}/>`}</div>
            ${expanded && html`<div className="p-2 max-h-40 overflow-y-auto flex flex-wrap gap-2">${sortedKeys.map(acc => { const bal = ledgerData[acc].debit - ledgerData[acc].credit; return (html`<div key=${acc} className="bg-white border px-2 py-1 text-xs rounded shadow-sm"><span className="font-semibold">${acc}:</span> <span className=${bal >= 0 ? "text-blue-600 ml-1" : "text-green-600 ml-1"}>${Math.abs(bal).toLocaleString()}</span></div>`) })}</div>`}
        </div>
    `;
};

export const Step1Analysis = ({ transactions = [], data, onChange, showFeedback, isReadOnly }) => {
    if (!transactions || transactions.length === 0) return html`<div className="p-4 bg-red-50 text-red-600 rounded border border-red-200">No transactions generated. Please go back and regenerate the activity.</div>`;
    return html`
        <div className="overflow-x-auto min-h-[200px]">
            <table className="w-full text-sm border-collapse border min-w-[900px]">
                <thead className="bg-gray-100">
                    <tr>
                        <th className="border p-2">Date</th>
                        <th className="border p-2 w-1/3">Transaction</th>
                        <th className="border p-2">Assets</th>
                        <th className="border p-2">Liabilities</th>
                        <th className="border p-2">Equity</th>
                        <th className="border p-2 w-1/5">Cause</th>
                    </tr>
                </thead>
                <tbody>
                    ${transactions.map((t) => {
                        const ans = data[t.id] || {};
                        return html`
                            <tr key=${t.id} className="hover:bg-gray-50">
                                <td className="border p-2 text-center whitespace-nowrap">${t.date}</td>
                                <td className="border p-2">${t.description}</td>
                                ${['assets', 'liabilities', 'equity'].map((field) => (
                                    html`<td key=${field} className="border p-2">
                                        <div className="flex items-center">
                                            <select className=${`w-full bg-white border rounded p-1 ${showFeedback && (ans[field === 'assets' ? 'A' : field === 'liabilities' ? 'L' : 'E'] !== t.analysis[field]) ? 'border-red-300 bg-red-50' : ''}`} value=${ans[field === 'assets' ? 'A' : field === 'liabilities' ? 'L' : 'E'] || '-'} onChange=${(e) => onChange(t.id, field === 'assets' ? 'A' : field === 'liabilities' ? 'L' : 'E', e.target.value)} disabled=${isReadOnly}>
                                                <option>-</option><option>Increase</option><option>Decrease</option><option>No Effect</option>
                                            </select>
                                            <${StatusIcon} show=${showFeedback} correct=${ans[field === 'assets' ? 'A' : field === 'liabilities' ? 'L' : 'E'] === t.analysis[field]} />
                                        </div>
                                    </td>`
                                ))}
                                <td className="border p-2">
                                    <div className="flex items-center">
                                        <select className=${`w-full bg-white border rounded p-1 ${showFeedback && (ans['Cause'] !== t.analysis.cause && t.analysis.cause !== '') ? 'border-red-300 bg-red-50' : ''}`} value=${ans['Cause'] || ''} onChange=${(e) => onChange(t.id, 'Cause', e.target.value)} disabled=${isReadOnly}>
                                            ${EQUITY_CAUSES.map(c => html`<option key=${c} value=${c}>${c || '-'}</option>`)}
                                        </select>
                                        <${StatusIcon} show=${showFeedback} correct=${ans['Cause'] === t.analysis.cause} />
                                    </div>
                                </td>
                            </tr>
                        `;
                    })}
                </tbody>
            </table>
        </div>
    `;
};

export const Step2Journalizing = ({ transactions = [], data, onChange, showFeedback, validAccounts, isReadOnly }) => {
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
};

export const Step3Posting = ({ data, onChange, showFeedback, validAccounts, ledgerKey, transactions, beginningBalances, isReadOnly, journalPRs, onTogglePR, matchedJournalEntries }) => {
    const ledgers = data.ledgers || [{ id: 1, account: '', leftRows: [{}], rightRows: [{}] }];
    const updateLedger = (idx, field, val) => { const n = [...ledgers]; n[idx] = { ...n[idx], [field]: val }; onChange('ledgers', n); };
    const updateSideRow = (idx, side, rowIdx, field, val) => {
         const n = [...ledgers];
         const sideKey = side === 'left' ? 'leftRows' : 'rightRows';
         const rows = [...(n[idx][sideKey] || [{}])];
         if (!rows[rowIdx]) rows[rowIdx] = {};
         rows[rowIdx][field] = val;
         n[idx][sideKey] = rows;
         onChange('ledgers', n);
    };
    const addRow = (idx) => { const n = [...ledgers]; const left = n[idx].leftRows || [{}]; const right = n[idx].rightRows || [{}]; left.push({}); right.push({}); n[idx].leftRows = left; n[idx].rightRows = right; onChange('ledgers', n); };
    const deleteLedger = (idx) => { if (!window.confirm("Delete this entire ledger?")) return; const n = ledgers.filter((_, i) => i !== idx); onChange('ledgers', n); };
    
    return html`
        <div className="flex flex-col lg:flex-row gap-4 h-full">
            <div className="lg:w-5/12 h-full"><${JournalSourceView} transactions=${transactions} journalPRs=${journalPRs} onTogglePR=${onTogglePR} showFeedback=${showFeedback} matchedJournalEntries=${matchedJournalEntries} isReadOnly=${isReadOnly}/></div>
            <div className="lg:w-7/12 border rounded bg-white h-[36rem] flex flex-col">
                <div className="bg-blue-100 p-2 font-bold text-blue-900">General Ledger</div>
                <div className="p-4 overflow-y-auto custom-scrollbar flex-1">
                    <div className="flex flex-col gap-8 pb-4">
                        ${ledgers.map((l, idx) => html`<${LedgerAccount} key=${l.id} l=${l} idx=${idx} ledgerKey=${ledgerKey} updateLedger=${updateLedger} updateSideRow=${updateSideRow} addRow=${addRow} deleteLedger=${deleteLedger} isReadOnly=${isReadOnly} showFeedback=${showFeedback} />`)}
                    </div>
                    ${!isReadOnly && html`<button onClick=${()=>onChange('ledgers', [...ledgers, { id: Date.now(), account: '', leftRows:[{},{},{},{}], rightRows:[{},{},{},{}] }])} className="mt-8 w-full py-3 border-2 border-dashed border-gray-400 text-gray-500 hover:border-blue-400 flex justify-center items-center gap-2 font-bold bg-gray-50"><${Plus} size=${20}/> Add New Account Ledger</button>`}
                </div>
            </div>
        </div>
    `;
};

const TrialBalanceForm = ({ data, onChange, showFeedback, isReadOnly, expectedLedger }) => {
    const rows = data.rows || [{ account: '', dr: '', cr: '' }, { account: '', dr: '', cr: '' }, { account: '', dr: '', cr: '' }];
    
    const updateRow = (idx, field, val) => {
        const newRows = [...rows];
        newRows[idx] = { ...newRows[idx], [field]: val };
        onChange('rows', newRows);
    };

    const addRow = () => {
        onChange('rows', [...rows, { account: '', dr: '', cr: '' }]);
    };

    const deleteRow = (idx) => {
        if (rows.length <= 1) return;
        const newRows = rows.filter((_, i) => i !== idx);
        onChange('rows', newRows);
    };

    const totalDr = rows.reduce((sum, r) => sum + (Number(r.dr) || 0), 0);
    const totalCr = rows.reduce((sum, r) => sum + (Number(r.cr) || 0), 0);

    const getRowFeedback = (row) => {
        if (!showFeedback) return { acc: '', dr: '', cr: '' };
        const accName = row.account.trim();
        if (!accName) return { acc: '', dr: '', cr: '' };
        const key = Object.keys(expectedLedger).find(k => k.toLowerCase() === accName.toLowerCase());
        if (!key) return { acc: 'bg-red-100', dr: 'bg-red-100', cr: 'bg-red-100' };
        
        const expNet = expectedLedger[key].debit - expectedLedger[key].credit;
        const expDr = expNet > 0 ? expNet : 0;
        const expCr = expNet < 0 ? Math.abs(expNet) : 0;
        const usrDr = Number(row.dr) || 0;
        const usrCr = Number(row.cr) || 0;

        return {
            acc: 'text-green-600 font-bold',
            dr: Math.abs(usrDr - expDr) <= 1 ? (expDr > 0 ? 'text-green-600' : '') : 'text-red-600 font-bold',
            cr: Math.abs(usrCr - expCr) <= 1 ? (expCr > 0 ? 'text-green-600' : '') : 'text-red-600 font-bold'
        };
    };

    return html`
        <div>
            <table className="w-full text-sm border-collapse">
                <thead className="bg-gray-100 sticky top-0">
                    <tr>
                        <th className="p-2 border text-left">Account Title</th>
                        <th className="p-2 border w-24 text-right">Debit</th>
                        <th className="p-2 border w-24 text-right">Credit</th>
                        <th className="p-2 border w-8"></th>
                    </tr>
                </thead>
                <tbody>
                    ${rows.map((row, idx) => {
                        const styles = getRowFeedback(row);
                        return html`
                            <tr key=${idx} className="border-b">
                                <td className="p-1 border">
                                    <input type="text" className=${`w-full outline-none ${styles.acc}`} value=${row.account} onChange=${(e)=>updateRow(idx, 'account', e.target.value)} disabled=${isReadOnly} placeholder="Account Name" />
                                </td>
                                <td className="p-1 border">
                                    <input type="number" className=${`w-full text-right outline-none ${styles.dr}`} value=${row.dr} onChange=${(e)=>updateRow(idx, 'dr', e.target.value)} disabled=${isReadOnly} />
                                </td>
                                <td className="p-1 border">
                                    <input type="number" className=${`w-full text-right outline-none ${styles.cr}`} value=${row.cr} onChange=${(e)=>updateRow(idx, 'cr', e.target.value)} disabled=${isReadOnly} />
                                </td>
                                <td className="p-1 border text-center">
                                    ${!isReadOnly && html`<button onClick=${() => deleteRow(idx)} className="text-gray-400 hover:text-red-600"><${Trash2} size=${14}/></button>`}
                                </td>
                            </tr>
                        `;
                    })}
                </tbody>
                <tfoot className="bg-gray-100 font-bold">
                    <tr>
                        <td className="p-2 text-right">Total</td>
                        <td className="p-2 text-right">${totalDr.toLocaleString()}</td>
                        <td className="p-2 text-right">${totalCr.toLocaleString()}</td>
                        <td></td>
                    </tr>
                </tfoot>
            </table>
            ${!isReadOnly && html`<button onClick=${addRow} className="mt-2 text-xs flex items-center gap-1 text-blue-600 hover:underline"><${Plus} size=${12}/> Add Row</button>`}
        </div>
    `;
};

export const Step4TrialBalance = ({ ledgerData, data, onChange, showFeedback, isReadOnly }) => html`
    <div className="flex flex-col lg:flex-row gap-4 h-[36rem]">
        <div className="lg:w-5/12 border rounded bg-white flex flex-col shadow-sm overflow-hidden">
            <div className="bg-blue-100 p-2 font-bold text-blue-900"><${Book} size=${16} className="inline mr-2"/>Source: General Ledger</div>
            <div className="p-4 overflow-y-auto custom-scrollbar flex-1 bg-gray-50">
                 <${LedgerSourceView} ledgerData=${ledgerData} /> 
            </div>
        </div>
        <div className="lg:w-7/12 border rounded bg-white flex flex-col shadow-sm overflow-hidden">
            <div className="bg-green-100 p-2 font-bold text-green-900"><${Table} size=${16} className="inline mr-2"/>Trial Balance</div>
            <div className="p-2 overflow-y-auto custom-scrollbar flex-1">
                 <${TrialBalanceForm} data=${data} onChange=${onChange} showFeedback=${showFeedback} isReadOnly=${isReadOnly} expectedLedger=${ledgerData} />
            </div>
        </div>
    </div>
`;

export const Step5Worksheet = ({ ledgerData, adjustments, data, onChange, showFeedback, isReadOnly }) => {
    const mergedAccounts = useMemo(() => { 
        const s = new Set(Object.keys(ledgerData)); 
        adjustments.forEach(adj => { s.add(adj.drAcc); s.add(adj.crAcc); }); 
        return sortAccounts(Array.from(s)); 
    }, [ledgerData, adjustments]);

    const getVal = (acc, col) => data[acc]?.[col] === '' || data[acc]?.[col] === undefined ? 0 : Number(data[acc][col]);
    const inputClass = (isError) => `w-full text-right p-1 text-xs outline-none border border-transparent hover:border-gray-300 focus:border-blue-500 bg-transparent ${isError ? 'bg-red-50 text-red-600 font-bold' : ''}`;

    const handleChange = (acc, col, value) => onChange(acc, col, value);

    return html`
        <div className="w-full">
            <div className="flex flex-col lg:flex-row gap-4 mb-4">
                <div className="flex-1"><${LedgerSourceView} ledgerData=${ledgerData} /></div>
                <div className="flex-1 border rounded-lg shadow-sm bg-yellow-50 overflow-hidden">
                    <div className="bg-yellow-100 p-2 font-bold text-yellow-900 flex items-center gap-2"><${List} size=${16}/> Adjustments Data</div>
                    <div className="p-2 max-h-40 overflow-y-auto"><ul className="list-decimal list-inside text-xs space-y-1">${adjustments.map(adj => html`<li key=${adj.id}>${adj.desc}</li>`)}</ul></div>
                </div>
            </div>
            <div className="border rounded-lg shadow-md bg-white overflow-x-auto custom-scrollbar">
                <table className="w-full text-xs min-w-[1200px] border-collapse">
                    <thead>
                        <tr className="bg-gray-800 text-white text-center"><th rowSpan="2" className="p-2 border-r border-gray-600 text-left w-48 sticky left-0 bg-gray-800 z-10">Account Title</th><th colSpan="2" className="p-1 border-r border-gray-600 bg-blue-900">Unadjusted Trial Balance</th><th colSpan="2" className="p-1 border-r border-gray-600 bg-yellow-900">Adjustments</th><th colSpan="2" className="p-1 border-r border-gray-600 bg-purple-900">Adjusted Trial Balance</th><th colSpan="2" className="p-1 border-r border-gray-600 bg-green-900">Income Statement</th><th colSpan="2" className="p-1 bg-indigo-900">Balance Sheet</th></tr>
                        <tr className="bg-gray-700 text-white text-center"><th className="p-1 w-20 border-r border-gray-600">Debit</th><th className="p-1 w-20 border-r border-gray-600">Credit</th><th className="p-1 w-20 border-r border-gray-600">Debit</th><th className="p-1 w-20 border-r border-gray-600">Credit</th><th className="p-1 w-20 border-r border-gray-600">Debit</th><th className="p-1 w-20 border-r border-gray-600">Credit</th><th className="p-1 w-20 border-r border-gray-600">Debit</th><th className="p-1 w-20 border-r border-gray-600">Credit</th><th className="p-1 w-20 border-r border-gray-600">Debit</th><th className="p-1 w-20">Credit</th></tr>
                    </thead>
                    <tbody>
                        ${mergedAccounts.map((acc, idx) => {
                            const bgClass = idx % 2 === 0 ? 'bg-white' : 'bg-gray-50';
                            return html`
                                <tr key=${acc} className=${`border-b hover:bg-blue-50 ${bgClass}`}>
                                    <td className=${`p-1 border-r text-left truncate sticky left-0 z-0 ${bgClass} font-medium`}>${acc}</td>
                                    ${['tbDr', 'tbCr', 'adjDr', 'adjCr', 'atbDr', 'atbCr', 'isDr', 'isCr', 'bsDr', 'bsCr'].map((col) => (
                                        html`<td key=${col} className="border-r p-0 relative"><input type="number" className=${inputClass(false)} value=${data[acc]?.[col] || ''} onChange=${(e) => handleChange(acc, col, e.target.value)} disabled=${isReadOnly} /></td>`
                                    ))}
                                </tr>
                            `;
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    `;
};

export const GenericStep = ({ stepId, title, onChange, data }) => html`
    <div className="p-4 border rounded bg-white printable-area">
         <div className="mb-4 bg-yellow-50 p-3 border border-yellow-200 rounded text-sm text-yellow-800 flex items-start gap-2"><${AlertCircle} size=${16} className="mt-0.5" /><div><strong>Task:</strong> Complete the forms below based on the generated data.<br/><em>(Prototype Note: Enter any text below for steps 6-10)</em></div></div>
        <textarea className="w-full border p-2 h-32 rounded" value=${data?.text || ''} onChange=${(e) => onChange('text', e.target.value)} />
    </div>
`;

export const TaskSection = ({ step, activityData, answers, stepStatus, onValidate, updateAnswerFns, isCurrentActiveTask, isPrevStepCompleted }) => {
    const stepId = step.id;
    const status = stepStatus[stepId] || {};
    const isLocked = !isPrevStepCompleted;
    const isCompleted = status.completed;
    const isStickyActive = !isLocked && !isCompleted;

    const handlePrint = () => {
        const content = document.querySelector(`.task-content-${stepId}`);
        if (!content) return;
        const printWindow = window.open('', '', 'height=600,width=800');
        printWindow.document.write('<html><head><title>Print</title><script src="https://cdn.tailwindcss.com"></script></head><body class="bg-white">');
        printWindow.document.write(ActivityHelper.getCustomPrintHeaderHTML());
        printWindow.document.write(ActivityHelper.getPrintStudentInfoHTML(`Task ${stepId}: ${step.title}`, step.description));
        printWindow.document.write(ActivityHelper.getRubricHTML(stepId, step.title));
        printWindow.document.write('<div class="printable-area">' + content.innerHTML + '</div>');
        printWindow.document.write(ActivityHelper.getCustomPrintFooterHTML());
        printWindow.document.close();
        setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
    };

    const handleStep1Change = (id, key, val) => updateAnswerFns.updateNestedAnswer(1, id.toString(), key, val);
    const handleStep2Change = (id, newRows) => updateAnswerFns.updateNestedAnswer(2, id.toString(), 'rows', newRows);
    const handleStep3Change = (key, val) => updateAnswerFns.updateAnswer(3, { ...(answers[3] || {}), [key]: val });
    const handleStep3TogglePR = (key) => {
        const cur = answers[3]?.journalPRs || {};
        updateAnswerFns.updateAnswer(3, {...(answers[3] || {}), journalPRs: {...cur, [key]: !cur[key]}});
    };
    const handleStep4Change = (key, val) => updateAnswerFns.updateAnswer(4, { ...(answers[4] || {}), [key]: val });
    const handleStep5Change = (rowKey, colKey, val) => {
        const stepAnswer = answers[stepId];
        if (rowKey === 'footers') {
            const [section, field] = colKey.split('.');
            const curFooters = stepAnswer?.footers || {};
            const curSection = curFooters[section] || {};
            updateAnswerFns.updateAnswer(5, { ...stepAnswer, footers: { ...curFooters, [section]: { ...curSection, [field]: val } } });
        } else {
            const curRow = stepAnswer?.[rowKey] || {};
            updateAnswerFns.updateAnswer(5, { ...stepAnswer, [rowKey]: { ...curRow, [colKey]: val } });
        }
    };
    const handleGenericChange = (k, v) => updateAnswerFns.updateAnswer(stepId, { ...answers[stepId], [k]: v });

    const renderStepContent = () => {
        if (isLocked) return html`<div className="p-8 text-center bg-gray-100 rounded text-gray-500"><${Lock} size=${32} className="mx-auto mb-2" /> Task Locked (Complete previous task to unlock)</div>`;
        const showFeedback = status.attempts < 3;

        if (stepId === 1) return html`<${Step1Analysis} transactions=${activityData.transactions} data=${answers[1] || {}} onChange=${handleStep1Change} showFeedback=${showFeedback} isReadOnly=${status.completed} />`;
        if (stepId === 2) return html`<${Step2Journalizing} transactions=${activityData.transactions} data=${answers[2] || {}} onChange=${handleStep2Change} showFeedback=${showFeedback} validAccounts=${activityData.validAccounts} isReadOnly=${status.completed} />`;
        if (stepId === 3) return html`<${Step3Posting} data=${answers[3] || {}} onChange=${handleStep3Change} showFeedback=${showFeedback} validAccounts=${activityData.validAccounts} ledgerKey=${activityData.ledger} transactions=${activityData.transactions} beginningBalances=${activityData.beginningBalances} isReadOnly=${status.completed} journalPRs=${answers[3]?.journalPRs || {}} onTogglePR=${handleStep3TogglePR} matchedJournalEntries=${status.completed || showFeedback ? (answers[3]?.matched || new Set()) : null} />`;
        if (stepId === 4) return html`<${Step4TrialBalance} ledgerData=${activityData.ledger} data=${answers[4] || {}} onChange=${handleStep4Change} showFeedback=${showFeedback} isReadOnly=${status.completed} />`;
        if (stepId === 5) return html`<${Step5Worksheet} ledgerData=${activityData.ledger} adjustments=${activityData.adjustments} data=${answers[stepId] || {}} onChange=${handleStep5Change} showFeedback=${showFeedback} isReadOnly=${status.completed} />`;
        return html`<${GenericStep} stepId=${stepId} title=${step.title} onChange=${handleGenericChange} data=${answers[stepId]} />`;
    };

    return html`
        <div id=${`task-${stepId}`} className="mb-8">
            <div className=${`bg-white p-4 shadow-md rounded-lg mb-4 border-b border-gray-200 no-print ${isStickyActive ? 'task-sticky-header border-b-4 border-blue-600' : ''} ${isCompleted ? 'border-b-4 border-green-600' : ''}`}>
                <div className="flex justify-between items-start gap-4">
                    <div className="flex-1"><h2 className="text-2xl font-bold text-gray-800">Task #${stepId}: ${step.title}</h2><p className="text-gray-600 text-sm">${step.description}</p></div>
                    <div className="flex items-center gap-3">
                        ${isCompleted 
                            ? html`<span className=${`text-sm font-bold flex items-center bg-green-50 px-3 py-1 rounded border ${status.correct ? 'text-green-600 border-green-200' : 'text-red-600 border-red-200'}`}><${Check} size=${16} className="mr-1"/> ${status.correct ? 'Completed' : 'Completed (3 Attempts Used)'}</span>`
                            : isLocked 
                                ? html`<span className="text-gray-500 font-bold flex items-center bg-gray-100 px-3 py-1 rounded border border-gray-300"><${Lock} size=${16} className="mr-1"/> Locked</span>`
                                : html`<div className="text-right"><div className="text-xs font-semibold text-gray-500">Attempts: <span className=${status.attempts <= 1 ? 'text-red-500' : 'text-gray-700'}>${status.attempts}</span></div><button onClick=${() => onValidate(stepId)()} disabled=${status.attempts <= 0} className=${`px-4 py-2 mt-1 rounded font-bold text-white flex items-center gap-2 ${status.attempts > 0 ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-400'}`}><${Check} size=${18} /> Validate</button></div>`
                        }
                        <button onClick=${handlePrint} className="bg-red-600 text-white p-2 rounded-lg hover:bg-red-700 hidden sm:block"><${Printer} size=${18} /></button>
                    </div>
                </div>
                ${(stepId === 2) && html`<div className="mt-2 pt-2 border-t text-sm"><div className="bg-yellow-50 p-2 rounded border border-yellow-200" dangerouslySetInnerHTML=${{ __html: ActivityHelper.getInstructionsHTML(stepId, step.title, activityData.validAccounts) }} /></div>`}
                ${(stepId === 3) && html`<div className="mt-2 pt-2 border-t text-sm"><div className="bg-yellow-50 p-2 rounded border border-yellow-200" dangerouslySetInnerHTML=${{ __html: ActivityHelper.getInstructionsHTML(stepId, step.title, activityData.validAccounts, activityData.config.isSubsequentYear, activityData.beginningBalances) }} /></div>`}
            </div>
            <div className="no-print space-y-3 mb-6">
                ${stepId !== 2 && stepId !== 3 && html`<div className="bg-gray-100 p-3 rounded-lg border text-sm" dangerouslySetInnerHTML=${{ __html: ActivityHelper.getInstructionsHTML(stepId, step.title, activityData.validAccounts) }} />`}
                <div dangerouslySetInnerHTML=${{ __html: ActivityHelper.getRubricHTML(stepId, step.title) }} />
            </div>
            <div className=${`printable-area task-content-${stepId}`}>${renderStepContent()}</div>
        </div>
    `;
};
