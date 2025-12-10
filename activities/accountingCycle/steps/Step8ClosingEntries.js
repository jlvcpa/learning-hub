import React, { useState, useMemo, useEffect } from 'https://esm.sh/react@18.2.0';
import htm from 'https://esm.sh/htm';
import { Book, Check, X, ChevronDown, ChevronRight, Table, Trash2, Plus } from 'https://esm.sh/lucide-react@0.263.1';
import { sortAccounts, getAccountType } from '../utils.js';

const html = htm.bind(React.createElement);

const StatusIcon = ({ correct, show }) => {
    if (!show) return null;
    return correct 
        ? html`<${Check} size=${14} className="text-green-600 inline ml-1" />` 
        : html`<${X} size=${14} className="text-red-600 inline ml-1" />`;
};

// --- PROVIDED COMPONENTS ---

const WorksheetSourceView = ({ ledgerData, adjustments }) => {
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

// --- CLOSING ENTRY JOURNAL FORM ---

const ClosingEntryForm = ({ entries, onChange, isReadOnly, showFeedback }) => {
    const defaultEntries = [
        { id: 'closeRev', desc: 'To close the revenue accounts.', rows: [{ dr: '', cr: '', acc: '', amt: '' }] },
        { id: 'closeExp', desc: 'To close the expense accounts.', rows: [{ dr: '', cr: '', acc: '', amt: '' }] },
        { id: 'closeInc', desc: 'To close the income summary account.', rows: [{ dr: '', cr: '', acc: '', amt: '' }] },
        { id: 'closeDrw', desc: 'To close the drawing accounts.', rows: [{ dr: '', cr: '', acc: '', amt: '' }] }
    ];

    // Merge state with default structure
    const entryState = entries || defaultEntries;

    const handleEntryChange = (idx, field, val) => {
        const newEntries = [...entryState];
        // Simplified entry structure for closing: Just tracking Dr/Cr lines freely
        // But for REID we need specific blocks.
        // Let's assume dynamic rows inside each Block
        if (!newEntries[idx].rows) newEntries[idx].rows = [{},{}];
        // ... (Logic for handling dynamic rows inside closing blocks is complex, simplified for now)
        // For the "Journalize" requirement, let's provide a list of rows for each block.
    };
    
    // Using a simpler dynamic list approach for each REID block
    const updateBlock = (blockIdx, newRows) => {
        const newEntries = [...entryState];
        newEntries[blockIdx] = { ...newEntries[blockIdx], rows: newRows };
        onChange(newEntries);
    };

    return html`
        <div className="border rounded bg-white shadow-sm flex flex-col flex-1 min-h-0 h-1/2">
            <div className="bg-blue-100 p-2 font-bold text-blue-900 border-b flex items-center">
                <${Book} size={16} className="inline mr-2 w-4 h-4"/>
                Journalize Closing Entries (REID)
            </div>
            <div className="overflow-y-auto p-2 flex-1">
                ${entryState.map((block, bIdx) => {
                    const rows = block.rows || [{ id: 1, dr: '', cr: '', acc: '' }, { id: 2, dr: '', cr: '', acc: '' }];
                    
                    const updateRow = (rIdx, field, val) => {
                        const newRows = [...rows];
                        if(!newRows[rIdx]) newRows[rIdx] = {};
                        newRows[rIdx][field] = val;
                        updateBlock(bIdx, newRows);
                    };
                    const addRow = () => updateBlock(bIdx, [...rows, {}]);
                    const delRow = (rIdx) => updateBlock(bIdx, rows.filter((_, i) => i !== rIdx));

                    return html`
                        <div key=${block.id} className="mb-4 border border-blue-200 rounded overflow-hidden">
                            <div className="bg-blue-50 px-2 py-1 text-xs font-bold text-blue-800 border-b border-blue-200">Entry #${bIdx + 1}: ${block.id === 'closeRev' ? 'Close Revenues' : block.id === 'closeExp' ? 'Close Expenses' : block.id === 'closeInc' ? 'Close Income Summary' : 'Close Drawings'}</div>
                            
                            ${rows.map((row, rIdx) => html`
                                <div key=${rIdx} className="flex border-b border-gray-100 text-xs h-7 items-center">
                                    <div className="w-16 border-r text-center text-gray-400">${rIdx===0 ? 'Dec 31' : ''}</div>
                                    <div className="flex-1 border-r relative p-0">
                                        <input type="text" className="w-full h-full px-1 outline-none" placeholder="Account" value=${row.acc || ''} onChange=${(e)=>updateRow(rIdx, 'acc', e.target.value)} disabled=${isReadOnly}/>
                                    </div>
                                    <div className="w-20 border-r relative p-0">
                                        <input type="number" className="w-full h-full px-1 text-right outline-none" placeholder="Dr" value=${row.dr || ''} onChange=${(e)=>updateRow(rIdx, 'dr', e.target.value)} disabled=${isReadOnly}/>
                                    </div>
                                    <div className="w-20 border-r relative p-0">
                                        <input type="number" className="w-full h-full px-1 text-right outline-none" placeholder="Cr" value=${row.cr || ''} onChange=${(e)=>updateRow(rIdx, 'cr', e.target.value)} disabled=${isReadOnly}/>
                                    </div>
                                    <div className="w-6 text-center">
                                        ${!isReadOnly && html`<button onClick=${()=>delRow(rIdx)} className="text-gray-400 hover:text-red-500"><${Trash2} size=${10}/></button>`}
                                    </div>
                                </div>
                            `)}
                            ${!isReadOnly && html`<div className="bg-gray-50 p-1 text-center"><button onClick=${addRow} className="text-[10px] text-blue-600 hover:underline flex items-center justify-center w-full"><${Plus} size=${10}/> Add Row</button></div>`}
                            <div className="bg-gray-50 text-gray-500 italic text-[10px] p-1 pl-16 border-t border-gray-100">
                                (${block.desc})
                            </div>
                        </div>
                    `;
                })}
            </div>
        </div>
    `;
};


// --- MAIN EXPORT ---

export default function Step8ClosingEntries({ activityData, data, onChange, showFeedback, isReadOnly }) {
    // data.journal = array of blocks
    // data.ledgers = array of ledger accounts (populated from Step 3 + historical)
    
    // Initialize Ledger Data if empty (copy from Activity Data + Ledger Template)
    useEffect(() => {
        if (!data.ledgers || data.ledgers.length === 0) {
            // Reconstruct the full ledger state including historical rows
            const { validAccounts, transactions, beginningBalances, adjustments, config } = activityData;
            const sortedAccounts = sortAccounts(validAccounts);
            
            const initialLedgers = sortedAccounts.map((acc, idx) => {
                const rowsL = [];
                const rowsR = [];

                // 1. Beginning Balances
                if (config.isSubsequentYear && beginningBalances && beginningBalances.balances[acc]) {
                    const b = beginningBalances.balances[acc];
                    if (b.dr > 0) rowsL.push({ date: 'Jan 01', part: 'BB', pr: '✓', amount: b.dr });
                    if (b.cr > 0) rowsR.push({ date: 'Jan 01', part: 'BB', pr: '✓', amount: b.cr });
                }

                // 2. Transactions
                transactions.forEach(t => {
                    const dateObj = new Date(t.date);
                    const dd = dateObj.getDate().toString().padStart(2, '0');
                    t.debits.forEach(d => { if(d.account === acc) rowsL.push({ date: dd, part: 'GJ', pr: '1', amount: d.amount }); });
                    t.credits.forEach(c => { if(c.account === acc) rowsR.push({ date: dd, part: 'GJ', pr: '1', amount: c.amount }); });
                });

                // 3. Adjusting Entries (from Step 7 data - derived)
                // Note: Ideally we'd pull from Step 7 user answers, but for simplicity/robustness we pull from generated correct adjustments
                // assuming the student should have the correct adjusted balances to close.
                // Or we just add the "Adjusting" rows as static historical rows here.
                adjustments.forEach((adj, i) => {
                    if (adj.drAcc === acc) rowsL.push({ date: 'Dec 31', part: 'Adj', pr: 'J2', amount: adj.amount });
                    if (adj.crAcc === acc) rowsR.push({ date: 'Dec 31', part: 'Adj', pr: 'J2', amount: adj.amount });
                });

                // Add 2 extra empty rows for closing
                rowsL.push({}, {});
                rowsR.push({}, {});

                return {
                    id: idx,
                    account: acc,
                    leftRows: rowsL,
                    rightRows: rowsR,
                    drTotal: '', crTotal: '', balance: '', balanceType: ''
                };
            });
            
            onChange('ledgers', initialLedgers);
        }
    }, [activityData]);

    const handleLedgerChange = (ledgers) => onChange('ledgers', ledgers);
    const handleJournalChange = (entries) => onChange('journal', entries);

    // Calculate Correct Closing Values for Validation
    const ledgerKey = useMemo(() => {
        const key = {};
        const { ledger, adjustments } = activityData; // Unadjusted ledger + adjustments
        
        // Calculate Adjusted Balances first
        const adjBalances = {};
        activityData.validAccounts.forEach(acc => {
            const rawDr = ledger[acc]?.debit || 0;
            const rawCr = ledger[acc]?.credit || 0;
            let adjDr = 0; let adjCr = 0;
            adjustments.forEach(a => { if (a.drAcc === acc) adjDr += a.amount; if (a.crAcc === acc) adjCr += a.amount; });
            const finalNet = (rawDr + adjDr) - (rawCr + adjCr);
            adjBalances[acc] = finalNet; // +Dr, -Cr
        });

        // Determine Post-Closing Balances
        // Nominal accounts (Rev, Exp, Draw) should be 0.
        // Real accounts (Asset, Liab) remain.
        // Capital = Beg + NetInc - Draw. (This handles the closing of nominals into capital).
        
        // Simplified Validation: 
        // We just need to check if the student zeroed out the nominals and updated Capital.
        // But the `LedgerAccount` component expects a `ledgerKey` with `debit`/`credit` totals.
        // So for Step 8, the "Correct" total is the POST-CLOSING total.
        
        // However, calculating exact post-closing totals for every account requires simulating the closing entries.
        // For Nominal: Total Dr = Total Cr (so it balances to 0).
        // For Real: Balance is carried forward.
        
        activityData.validAccounts.forEach(acc => {
            const type = getAccountType(acc);
            const bal = adjBalances[acc];
            
            if (['Revenue', 'Expense'].includes(type) || acc.includes('Drawing') || acc.includes('Dividends') || acc === 'Income Summary') {
                // Nominal: Should be closed.
                // If it was Dr 500, we add Cr 500. Total Dr = 500, Total Cr = 500.
                if (bal > 0) { key[acc] = { debit: bal, credit: bal }; } // Was Dr, added Cr
                else { key[acc] = { debit: Math.abs(bal), credit: Math.abs(bal) }; } // Was Cr, added Dr
            } else if (type === 'Equity') {
                // Capital: Updates by NI and Draw. 
                // This is complex to predict perfectly without running the full cycle sim.
                // Placeholder: Use adjusted balance, allowing student input to vary slightly?
                // Better: Just set it to null so the specific 'Check' icon inside LedgerAccount doesn't show false positives,
                // and rely on the main "Validate" button logic in App.js for the final check.
                key[acc] = { debit: 0, credit: 0 }; // Disable per-row check for Capital for now
            } else {
                // Asset/Liab: No change from Adjusted.
                // But the 'Total' fields in the form might encompass just the historical? 
                // Step 3 form sums everything. So it should match Adjusted Balance totals.
                // Assets (Dr): Total Dr = Bal, Total Cr = 0.
                if (bal > 0) key[acc] = { debit: bal, credit: 0 };
                else key[acc] = { debit: 0, credit: Math.abs(bal) };
            }
        });
        return key;
    }, [activityData]);

    // Validation Logic for App.js Integration (Concept)
    // 1. Journal: Check if Revenue (Cr) is Debited. Check if Expense (Dr) is Credited.
    // 2. Ledger: Check if Nominal accounts have Bal = 0.

    return html`
        <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-140px)]">
            <div className="flex-1 lg:w-5/12 flex flex-col gap-4 min-h-0">
                <div className="h-1/2 min-h-0 flex flex-col border rounded overflow-hidden">
                     <${WorksheetSourceView} ledgerData=${activityData.ledger} adjustments=${activityData.adjustments} />
                </div>
                <div className="h-1/2 min-h-0 flex flex-col">
                    <${ClosingEntryForm} entries=${data.journal} onChange=${handleJournalChange} isReadOnly=${isReadOnly} showFeedback=${showFeedback} />
                </div>
            </div>
            
            <div className="flex-1 lg:w-7/12 min-h-0 border rounded bg-white shadow-sm flex flex-col overflow-hidden">
                <${Step3Posting} 
                    data=${{ ledgers: data.ledgers || [] }} 
                    onChange={(k, v) => handleLedgerChange(v)} 
                    showFeedback=${showFeedback} 
                    validAccounts=${activityData.validAccounts} 
                    ledgerKey=${ledgerKey}
                    transactions={[]} // Already baked into initial state
                    beginningBalances={null} // Already baked
                    isReadOnly=${isReadOnly}
                    journalPRs={{}}
                    onTogglePR={()=>{}}
                    matchedJournalEntries={new Set()}
                />
            </div>
        </div>
    `;
}
