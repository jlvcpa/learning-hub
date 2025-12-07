import React, { useState } from 'https://esm.sh/react@18.2.0';
import htm from 'https://esm.sh/htm';
import { Plus, Check, X, Trash2, Book, ChevronDown, ChevronRight } from 'https://esm.sh/lucide-react@0.263.1';

const html = htm.bind(React.createElement);

// --- INTERNAL COMPONENTS ---

const StatusIcon = ({ correct, show }) => {
    if (!show) return null;
    return correct 
        ? html`<${Check} size=${14} className="text-green-600 inline ml-1" />` 
        : html`<${X} size=${14} className="text-red-600 inline ml-1" />`;
};

const JournalSourceView = ({ transactions, journalPRs, onTogglePR, showFeedback, matchedJournalEntries, isReadOnly }) => {
    const [expanded, setExpanded] = useState(true);
    
    return html`
        <div className="mb-4 border rounded bg-white overflow-hidden shadow-sm h-[36rem] flex flex-col">
            <div className="bg-blue-100 p-2 font-bold text-blue-900 cursor-pointer flex justify-between items-center flex-shrink-0" onClick=${()=>setExpanded(!expanded)}>
                <span><${Book} size=${16} className="inline mr-2"/>Source: General Journal</span>
                <div className="flex items-center gap-4">
                    <span className="text-xs font-normal">Page 1</span>
                    ${expanded ? html`<${ChevronDown} size=${16}/>` : html`<${ChevronRight} size=${16}/>`}
                </div>
            </div>
            ${expanded && html`
                <div className="flex flex-col h-full overflow-hidden">
                    <div className="flex bg-gray-50 text-gray-700 border-b border-gray-300 font-bold text-xs text-center flex-shrink-0">
                        <div className="w-16 border-r p-2 flex-shrink-0">Date</div>
                        <div className="flex-1 border-r p-2 text-left">Account Titles and Explanation</div>
                        <div className="w-16 border-r p-2 flex-shrink-0">P.R.</div>
                        <div className="w-24 border-r p-2 text-right flex-shrink-0">Debit</div>
                        <div className="w-24 p-2 text-right flex-shrink-0">Credit</div>
                    </div>
                    <div className="overflow-y-auto flex-1">
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
                                        <div className="flex border-b border-gray-100 text-xs h-8 items-center">
                                            <div className="w-16 border-r text-right pr-1 font-bold text-gray-500 flex-shrink-0">${yyyy}</div>
                                            <div className="flex-1 border-r"></div>
                                            <div className="w-16 border-r flex-shrink-0"></div>
                                            <div className="w-24 border-r flex-shrink-0"></div>
                                            <div className="w-24 flex-shrink-0"></div>
                                        </div>
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
                                            <div key=${key} className="flex border-b border-gray-100 text-xs h-8 items-center hover:bg-gray-50">
                                                <div className="w-16 border-r text-right pr-1 flex-shrink-0">${i === 0 ? dateDisplay : ''}</div>
                                                <div className="flex-1 border-r pl-1 font-medium text-gray-800 truncate" title=${d.account}>${d.account}</div>
                                                <div className=${`w-16 border-r text-center flex justify-center items-center flex-shrink-0 ${checkColor}`}>
                                                    <input type="checkbox" checked=${isChecked} onChange=${() => onTogglePR(key)} disabled=${isReadOnly} className="cursor-pointer" /> 
                                                </div>
                                                <div className="w-24 border-r text-right pr-1 flex-shrink-0">${d.amount.toLocaleString()}</div>
                                                <div className="w-24 text-right pr-1 flex-shrink-0"></div>
                                            </div>
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
                                            <div key=${key} className="flex border-b border-gray-100 text-xs h-8 items-center hover:bg-gray-50">
                                                <div className="w-16 border-r flex-shrink-0"></div>
                                                <div className="flex-1 border-r pl-6 text-gray-800 truncate" title=${c.account}>${c.account}</div>
                                                <div className=${`w-16 border-r text-center flex justify-center items-center flex-shrink-0 ${checkColor}`}>
                                                     <input type="checkbox" checked=${isChecked} onChange=${() => onTogglePR(key)} disabled=${isReadOnly} className="cursor-pointer" />
                                                </div>
                                                <div className="w-24 border-r flex-shrink-0"></div>
                                                <div className="w-24 text-right pr-1 flex-shrink-0">${c.amount.toLocaleString()}</div>
                                            </div>
                                        `;
                                    })}
                                    <div key=${'desc' + t.id} className="flex border-b border-gray-200 text-xs h-8 items-center text-gray-500 italic">
                                        <div className="w-16 border-r flex-shrink-0"></div>
                                        <div className="flex-1 border-r pl-8 truncate" title=${t.description}>(${t.description})</div>
                                        <div className="w-16 border-r flex-shrink-0"></div>
                                        <div className="w-24 border-r flex-shrink-0"></div>
                                        <div className="w-24 flex-shrink-0"></div>
                                    </div>
                                </React.Fragment>
                            `;
                        })}
                        <div className="h-12"></div>
                    </div>
                </div>
            `}
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

    return html`
        <div className="border-2 border-gray-800 bg-white shadow-md">
            <div className="border-b-2 border-gray-800 p-2 flex justify-between bg-gray-100 relative">
                <div className="absolute left-2 top-2"><${StatusIcon} show=${showFeedback} correct=${!!ledgerKey[l.account]} /></div>
                <div className="w-full text-center mx-8"><input list="step3-accs" className="w-full border-b border-gray-400 text-center bg-transparent font-bold text-lg outline-none" placeholder="Account Title" value=${l.account} onChange=${(e)=>updateLedger(idx,'account',e.target.value)} disabled=${isReadOnly} /></div>
                ${!isReadOnly && html`<button onClick=${() => deleteLedger(idx)} className="absolute right-2 top-2 text-red-500 hover:text-red-700"><${Trash2} size=${16}/></button>`}
            </div>
            <div className="flex">
                <div className="flex-1 border-r-2 border-gray-800">
                    <div className="text-center font-bold border-b border-gray-400 bg-gray-50 text-xs py-1">DEBIT</div>
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
                    <div className="border-t-2 border-gray-800 p-1 flex justify-between items-center bg-gray-50"><span className="text-xs font-bold">Total Debit</span><input type="number" className=${`w-24 text-right border border-gray-300 ${Math.abs(Number(l.drTotal) - correctDr) <= 1 ? (showFeedback ? "text-green-600 font-bold" : "") : (showFeedback ? "text-red-600 font-bold" : "")}`} value=${l.drTotal||''} onChange=${(e)=>updateLedger(idx,'drTotal',e.target.value)} disabled=${isReadOnly} /></div>
                </div>
                <div className="flex-1">
                    <div className="text-center font-bold border-b border-gray-400 bg-gray-50 text-xs py-1">CREDIT</div>
                    <div className="flex text-xs font-bold border-b border-gray-400 bg-white"><div className="w-16 border-r p-1 text-center">Date</div><div className="flex-1 border-r p-1 text-center">Particulars</div><div className="w-10 border-r p-1 text-center">PR</div><div className="w-20 p-1 text-center border-r">Amount</div><div className="w-6"></div></div>
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
                    <div className="border-t-2 border-gray-800 p-1 flex justify-between items-center bg-gray-50"><span className="text-xs font-bold">Total Credit</span><input type="number" className=${`w-24 text-right border border-gray-300 ${Math.abs(Number(l.crTotal) - correctCr) <= 1 ? (showFeedback ? "text-green-600 font-bold" : "") : (showFeedback ? "text-red-600 font-bold" : "")}`} value=${l.crTotal||''} onChange=${(e)=>updateLedger(idx,'crTotal',e.target.value)} disabled=${isReadOnly} /></div>
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

// --- MAIN EXPORT ---

export default function Step3Posting({ data, onChange, showFeedback, validAccounts, ledgerKey, transactions, beginningBalances, isReadOnly, journalPRs, onTogglePR, matchedJournalEntries }) {
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
}
