import React, { useState, useMemo } from 'https://esm.sh/react@18.2.0';
import htm from 'https://esm.sh/htm';
import { Book, Check, X, ChevronDown, ChevronRight, Table, Trash2, Plus, List } from 'https://esm.sh/lucide-react@0.263.1';
import { sortAccounts, getAccountType } from './utils.js'; // Added getAccountType

const html = htm.bind(React.createElement);

export const StatusIcon = ({ correct, show }) => {
    if (!show) return null;
    return correct 
        ? html`<${Check} size=${14} className="text-green-600 inline ml-1" />` 
        : html`<${X} size=${14} className="text-red-600 inline ml-1" />`;
};

export const JournalRow = ({ row, idx, tIdx, updateRow, deleteRow, showFeedback, isReadOnly, t }) => {
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

export const LedgerAccount = ({ l, idx, ledgerKey, updateLedger, updateSideRow, addRow, deleteLedger, isReadOnly, showFeedback }) => {
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

export const JournalSourceView = ({ transactions, journalPRs, onTogglePR, showFeedback, matchedJournalEntries, isReadOnly }) => {
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

export const LedgerSourceView = ({ transactions, validAccounts, beginningBalances, isSubsequentYear }) => {
    const [expanded, setExpanded] = useState(true);
    const sortedAccounts = sortAccounts(validAccounts);

    return html`
        <div className="mb-4 border rounded-lg shadow-sm bg-blue-50 overflow-hidden no-print h-full flex flex-col">
            <div className="bg-blue-100 p-2 font-bold text-blue-900 cursor-pointer flex justify-between items-center flex-shrink-0" onClick=${()=>setExpanded(!expanded)}>
                <span><${Book} size=${16} className="inline mr-2"/>Source: General Ledger</span>
                <div className="flex items-center gap-4">
                    ${expanded ? html`<${ChevronDown} size=${16}/>` : html`<${ChevronRight} size=${16}/>`}
                </div>
            </div>
            ${expanded && html`
                <div className="p-4 overflow-y-auto custom-scrollbar flex-1 flex flex-col gap-6 bg-gray-50">
                    ${sortedAccounts.map(acc => {
                        const rowsL = [];
                        const rowsR = [];
                        
                        // Push Year Row First
                        rowsL.push({ date: '2023', part: '', pr: '', amount: null, isYear: true });
                        rowsR.push({ date: '2023', part: '', pr: '', amount: null, isYear: true });
                        
                        let bbDr = 0;
                        let bbCr = 0;
                        if (isSubsequentYear && beginningBalances && beginningBalances.balances[acc]) {
                            const b = beginningBalances.balances[acc];
                            if (b.dr > 0) {
                                rowsL.push({ date: 'Jan 01', part: 'BB', pr: '✓', amount: b.dr });
                                bbDr = b.dr;
                            }
                            if (b.cr > 0) {
                                rowsR.push({ date: 'Jan 01', part: 'BB', pr: '✓', amount: b.cr });
                                bbCr = b.cr;
                            }
                        }

                        let lastMonthL = '';
                        let lastMonthR = '';

                        if (bbDr > 0) lastMonthL = 'Jan';
                        if (bbCr > 0) lastMonthR = 'Jan';

                        transactions.forEach(t => {
                            const dateObj = new Date(t.date);
                            const mmm = dateObj.toLocaleString('default', { month: 'short' });
                            const dd = dateObj.getDate().toString().padStart(2, '0');
                            const dateStrFull = `${mmm} ${dd}`;

                            t.debits.forEach(d => {
                                if (d.account === acc) {
                                    let displayDate = dd;
                                    const isFirstEntry = rowsL.length === 1; 
                                    
                                    if (isFirstEntry || lastMonthL !== mmm) {
                                        displayDate = dateStrFull;
                                    }
                                    
                                    rowsL.push({ date: displayDate, part: 'GJ', pr: '1', amount: d.amount });
                                    lastMonthL = mmm;
                                }
                            });
                            t.credits.forEach(c => {
                                if (c.account === acc) {
                                    let displayDate = dd;
                                    const isFirstEntry = rowsR.length === 1;
                                    
                                    if (isFirstEntry || lastMonthR !== mmm) {
                                        displayDate = dateStrFull;
                                    }

                                    rowsR.push({ date: displayDate, part: 'GJ', pr: '1', amount: c.amount });
                                    lastMonthR = mmm;
                                }
                            });
                        });

                        const totalDr = rowsL.reduce((sum, r) => sum + (r.amount || 0), 0);
                        const totalCr = rowsR.reduce((sum, r) => sum + (r.amount || 0), 0);
                        const net = totalDr - totalCr;
                        const balance = Math.abs(net);
                        const balanceType = net >= 0 ? 'Dr' : 'Cr';

                        const maxCount = Math.max(rowsL.length, rowsR.length, 4);
                        const displayRows = Array.from({ length: maxCount }).map((_, i) => i);

                        return html`
                            <div key=${acc} className="border-y-2 border-gray-800 bg-white shadow-md">
                                <div className="border-b-2 border-gray-800 p-2 bg-gray-100 font-bold text-center text-lg text-gray-800">
                                    ${acc}
                                </div>
                                <div className="flex">
                                    <div className="flex-1 border-r-2 border-gray-800">
                                        <div className="text-center font-bold border-b border-gray-400 bg-gray-50 text-xs py-1">DEBIT</div>
                                        <div className="flex text-xs font-bold border-b border-gray-400 bg-white">
                                            <div className="w-16 border-r p-1 text-center flex-shrink-0">Date</div>
                                            <div className="flex-1 border-r p-1 text-center">Particulars</div>
                                            <div className="w-10 border-r p-1 text-center flex-shrink-0">PR</div>
                                            <div className="w-20 p-1 text-center flex-shrink-0">Amount</div>
                                        </div>
                                        ${displayRows.map(i => {
                                            const r = rowsL[i] || {};
                                            return html`
                                                <div className="flex text-xs border-b border-gray-200 h-6 items-center">
                                                    <div className="w-16 border-r text-right px-1 text-gray-600 whitespace-nowrap flex-shrink-0">${r.date || ''}</div>
                                                    <div className="flex-1 border-r px-1 truncate text-gray-800">${r.part || ''}</div>
                                                    <div className="w-10 border-r text-center text-gray-500 flex-shrink-0">${r.pr || ''}</div>
                                                    <div className="w-20 text-right px-1 text-gray-800 flex-shrink-0">${r.amount ? r.amount.toLocaleString() : ''}</div>
                                                </div>
                                            `;
                                        })}
                                        <div className="border-t-2 border-gray-800 p-1 flex justify-between items-center bg-gray-50 text-xs font-bold">
                                            <span>Total</span>
                                            <span>${totalDr.toLocaleString()}</span>
                                        </div>
                                    </div>

                                    <div className="flex-1">
                                        <div className="text-center font-bold border-b border-gray-400 bg-gray-50 text-xs py-1">CREDIT</div>
                                        <div className="flex text-xs font-bold border-b border-gray-400 bg-white">
                                            <div className="w-16 border-r p-1 text-center flex-shrink-0">Date</div>
                                            <div className="flex-1 border-r p-1 text-center">Particulars</div>
                                            <div className="w-10 border-r p-1 text-center flex-shrink-0">PR</div>
                                            <div className="w-20 p-1 text-center flex-shrink-0">Amount</div>
                                        </div>
                                        ${displayRows.map(i => {
                                            const r = rowsR[i] || {};
                                            return html`
                                                <div className="flex text-xs border-b border-gray-200 h-6 items-center">
                                                    <div className="w-16 border-r text-right px-1 text-gray-600 whitespace-nowrap flex-shrink-0">${r.date || ''}</div>
                                                    <div className="flex-1 border-r px-1 truncate text-gray-800">${r.part || ''}</div>
                                                    <div className="w-10 border-r text-center text-gray-500 flex-shrink-0">${r.pr || ''}</div>
                                                    <div className="w-20 text-right px-1 text-gray-800 flex-shrink-0">${r.amount ? r.amount.toLocaleString() : ''}</div>
                                                </div>
                                            `;
                                        })}
                                        <div className="border-t-2 border-gray-800 p-1 flex justify-between items-center bg-gray-50 text-xs font-bold">
                                            <span>Total</span>
                                            <span className="mr-1">${totalCr.toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-yellow-50 p-2 text-center border-t border-gray-300 text-sm font-bold text-gray-700">
                                    Balance: <span className="text-blue-700 ml-2 text-base">${balance.toLocaleString()}</span>
                                </div>
                            </div>
                        `;
                    })}
                </div>
            `}
        </div>
    `;
};

export const SimpleLedgerView = ({ ledgerData }) => {
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

// --- WORKSHEET SOURCE VIEW ---

export const WorksheetSourceView = ({ ledgerData, adjustments }) => {
    const mergedAccounts = useMemo(() => { 
        const s = new Set(Object.keys(ledgerData)); 
        adjustments.forEach(adj => { s.add(adj.drAcc); s.add(adj.crAcc); }); 
        return sortAccounts(Array.from(s)); 
    }, [ledgerData, adjustments]);

    const data = useMemo(() => {
        return mergedAccounts.map(acc => {
            const ledgerBal = (ledgerData[acc]?.debit || 0) - (ledgerData[acc]?.credit || 0);
            const tbDr = ledgerBal > 0 ? ledgerBal : 0; const tbCr = ledgerBal < 0 ? Math.abs(ledgerBal) : 0;
            let aDr = 0; let aCr = 0;
            adjustments.forEach(a => { if(a.drAcc === acc) aDr += a.amount; if(a.crAcc === acc) aCr += a.amount; });
            const atbNet = (tbDr - tbCr) + (aDr - aCr);
            const atbDr = atbNet > 0 ? atbNet : 0; const atbCr = atbNet < 0 ? Math.abs(atbNet) : 0;
            const type = getAccountType(acc); const isIS = type === 'Revenue' || type === 'Expense';
            const isDr = isIS ? atbDr : 0; const isCr = isIS ? atbCr : 0; 
            const bsDr = !isIS ? atbDr : 0; const bsCr = !isIS ? atbCr : 0;
            return { acc, tbDr, tbCr, adjDr: aDr, adjCr: aCr, atbDr, atbCr, isDr, isCr, bsDr, bsCr };
        });
    }, [mergedAccounts, ledgerData, adjustments]);

    return html`
        <div className="h-full flex flex-col">
            <div className="bg-purple-100 p-2 font-bold text-purple-900 border-b border-purple-200"><${Table} size=${16} className="inline mr-2"/>Source: Worksheet (Correct Answers)</div>
            <div className="overflow-auto custom-scrollbar flex-1 bg-white">
                <table className="w-full text-xs min-w-[1000px] border-collapse">
                    <thead className="sticky top-0 z-10">
                        <tr className="bg-purple-900 text-white text-center"><th className="p-1 sticky left-0 bg-purple-900 z-20">Account</th><th colSpan="2">Adjusted TB</th><th colSpan="2">Income Statement</th><th colSpan="2">Balance Sheet</th></tr>
                        <tr className="bg-purple-800 text-white text-center"><th className="p-1 sticky left-0 bg-purple-800 z-20"></th><th>Dr</th><th>Cr</th><th>Dr</th><th>Cr</th><th>Dr</th><th>Cr</th></tr>
                    </thead>
                    <tbody>
                        ${data.map((row, idx) => html`
                            <tr key=${idx} className="border-b border-purple-100 hover:bg-purple-50">
                                <td className="p-1 border-r sticky left-0 bg-white z-0 truncate font-medium w-40">${row.acc}</td>
                                <td className="p-1 border-r text-right w-20">${row.atbDr || ''}</td>
                                <td className="p-1 border-r text-right w-20">${row.atbCr || ''}</td>
                                <td className="p-1 border-r text-right w-20 bg-green-50">${row.isDr || ''}</td>
                                <td className="p-1 border-r text-right w-20 bg-green-50">${row.isCr || ''}</td>
                                <td className="p-1 border-r text-right w-20 bg-indigo-50">${row.bsDr || ''}</td>
                                <td className="p-1 text-right w-20 bg-indigo-50">${row.bsCr || ''}</td>
                            </tr>
                        `)}
                    </tbody>
                </table>
            </div>
        </div>
    `;
};
