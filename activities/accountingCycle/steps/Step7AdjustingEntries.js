// --- Step7AdjustingEntries.js ---
import React, { useState, useMemo } from 'https://esm.sh/react@18.2.0';
import htm from 'https://esm.sh/htm';
import { Book, Check, X, ChevronDown, ChevronRight, Table, Trash2, Plus } from 'https://esm.sh/lucide-react@0.263.1';
import { sortAccounts } from '../utils.js';

const html = htm.bind(React.createElement);

const StatusIcon = ({ correct, show }) => {
    if (!show) return null;
    return correct 
        ? html`<${Check} size=${14} className="text-green-600 inline ml-1" />` 
        : html`<${X} size=${14} className="text-red-600 inline ml-1" />`;
};

// --- LEFT PANEL: JOURNAL COMPONENTS ---

const HistoricalJournalView = ({ transactions }) => {
    const [expanded, setExpanded] = useState(false);
    
    return html`
        <div className="mb-4 border rounded bg-white overflow-hidden shadow-sm flex flex-col">
            <div className="bg-gray-100 p-2 font-bold text-gray-700 cursor-pointer flex justify-between items-center flex-shrink-0" onClick=${()=>setExpanded(!expanded)}>
                <div className="flex items-center">
                    <${Book} size=${16} className="inline mr-2 w-4 h-4"/>
                    <span>Historical Journal Entries (Read-Only)</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-normal">
                    ${expanded ? 'Click to Collapse' : 'Click to View'}
                    ${expanded ? html`<${ChevronDown} size={16} className="w-4 h-4"/>` : html`<${ChevronRight} size={16} className="w-4 h-4"/>`}
                </div>
            </div>
            ${expanded && html`
                <div className="h-64 flex flex-col overflow-hidden border-t border-gray-200">
                    <div className="flex bg-gray-50 text-gray-700 border-b border-gray-300 font-bold text-xs text-center flex-shrink-0">
                        <div className="w-16 border-r p-2 flex-shrink-0">Date</div>
                        <div className="flex-1 border-r p-2 text-left">Account Titles and Explanation</div>
                        <div className="w-16 border-r p-2 flex-shrink-0">P.R.</div>
                        <div className="w-24 border-r p-2 text-right flex-shrink-0">Debit</div>
                        <div className="w-24 p-2 text-right flex-shrink-0">Credit</div>
                    </div>
                    <div className="overflow-y-auto flex-1 bg-white">
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
                                        <div className="flex border-b border-gray-100 text-xs h-8 items-center text-gray-500">
                                            <div className="w-16 border-r text-right pr-1 font-bold flex-shrink-0">${yyyy}</div>
                                            <div className="flex-1 border-r"></div>
                                            <div className="w-16 border-r flex-shrink-0"></div>
                                            <div className="w-24 border-r flex-shrink-0"></div>
                                            <div className="w-24 flex-shrink-0"></div>
                                        </div>
                                    `}
                                    
                                    ${t.debits.map((d, i) => html`
                                        <div key=${`dr-${t.id}-${i}`} className="flex border-b border-gray-100 text-xs h-8 items-center hover:bg-gray-50">
                                            <div className="w-16 border-r text-right pr-1 flex-shrink-0 text-gray-500">${i === 0 ? dateDisplay : ''}</div>
                                            <div className="flex-1 border-r pl-1 font-medium text-gray-800 truncate" title=${d.account}>${d.account}</div>
                                            <div className="w-16 border-r text-center flex justify-center items-center flex-shrink-0 text-gray-400">1</div>
                                            <div className="w-24 border-r text-right pr-1 flex-shrink-0 text-gray-800">${d.amount.toLocaleString()}</div>
                                            <div className="w-24 text-right pr-1 flex-shrink-0"></div>
                                        </div>
                                    `)}
                                    
                                    ${t.credits.map((c, i) => html`
                                        <div key=${`cr-${t.id}-${i}`} className="flex border-b border-gray-100 text-xs h-8 items-center hover:bg-gray-50">
                                            <div className="w-16 border-r flex-shrink-0"></div>
                                            <div className="flex-1 border-r pl-6 text-gray-800 truncate" title=${c.account}>${c.account}</div>
                                            <div className="w-16 border-r text-center flex justify-center items-center flex-shrink-0 text-gray-400">1</div>
                                            <div className="w-24 border-r flex-shrink-0"></div>
                                            <div className="w-24 text-right pr-1 flex-shrink-0 text-gray-800">${c.amount.toLocaleString()}</div>
                                        </div>
                                    `)}
                                    
                                    <div key=${'desc' + t.id} className="flex border-b border-gray-200 text-xs h-8 items-center text-gray-500 italic bg-gray-50/50">
                                        <div className="w-16 border-r flex-shrink-0"></div>
                                        <div className="flex-1 border-r pl-8 truncate" title=${t.description}>(${t.description})</div>
                                        <div className="w-16 border-r flex-shrink-0"></div>
                                        <div className="w-24 border-r flex-shrink-0"></div>
                                        <div className="w-24 flex-shrink-0"></div>
                                    </div>
                                </React.Fragment>
                            `;
                        })}
                        <div className="h-8"></div>
                    </div>
                </div>
            `}
        </div>
    `;
};

const AdjustmentEntryForm = ({ adjustments, data, onChange, isReadOnly, showFeedback }) => {
    const handleChange = (adjId, field, val) => {
        const current = data[adjId] || {};
        onChange(adjId, { ...current, [field]: val });
    };

    return html`
        <div className="border rounded bg-white shadow-sm flex flex-col flex-1 min-h-0">
            <div className="bg-blue-100 p-2 font-bold text-blue-900 border-b flex items-center">
                <${Book} size=${16} className="inline mr-2 w-4 h-4"/>
                Journalize Adjusting Entries
            </div>
            <div className="overflow-y-auto p-2 flex-1">
                ${adjustments.map((adj, idx) => {
                    const entry = data[adj.id] || {};
                    const isDrCorrect = entry.drAcc?.toLowerCase() === adj.drAcc.toLowerCase() && Math.abs(Number(entry.drAmt) - adj.amount) <= 1;
                    const isCrCorrect = entry.crAcc?.toLowerCase() === adj.crAcc.toLowerCase() && Math.abs(Number(entry.crAmt) - adj.amount) <= 1;
                    
                    return html`
                        <div key=${adj.id} className="mb-4 border border-blue-200 rounded overflow-hidden">
                            <div className="bg-blue-50 px-2 py-1 text-xs font-bold text-blue-800 border-b border-blue-200">AJE #${idx + 1} (Date: Dec 31)</div>
                            <div className="flex border-b border-gray-100">
                                <div className="w-16 p-1 text-center border-r bg-gray-50 text-xs flex items-center justify-center">Dec 31</div>
                                <div className="flex-1 p-0 border-r relative">
                                    <input type="text" className=${`w-full h-full p-1 outline-none text-sm ${showFeedback && !isDrCorrect ? 'bg-red-50' : ''}`} placeholder="Debit Account" value=${entry.drAcc || ''} onChange=${(e) => handleChange(adj.id, 'drAcc', e.target.value)} disabled=${isReadOnly}/>
                                    <div className="absolute right-1 top-1"><${StatusIcon} show=${showFeedback} correct=${entry.drAcc?.toLowerCase() === adj.drAcc.toLowerCase()} /></div>
                                </div>
                                <div className="w-24 p-0 border-r relative">
                                    <input type="number" className=${`w-full h-full p-1 text-right outline-none text-sm ${showFeedback && !isDrCorrect ? 'bg-red-50' : ''}`} placeholder="Debit" value=${entry.drAmt || ''} onChange=${(e) => handleChange(adj.id, 'drAmt', e.target.value)} disabled=${isReadOnly}/>
                                </div>
                                <div className="w-24 p-1 bg-gray-50 border-r"></div>
                            </div>
                            <div className="flex border-b border-gray-100">
                                <div className="w-16 border-r bg-gray-50"></div>
                                <div className="flex-1 p-0 border-r relative pl-6">
                                    <input type="text" className=${`w-full h-full p-1 outline-none text-sm ${showFeedback && !isCrCorrect ? 'bg-red-50' : ''}`} placeholder="Credit Account" value=${entry.crAcc || ''} onChange=${(e) => handleChange(adj.id, 'crAcc', e.target.value)} disabled=${isReadOnly}/>
                                    <div className="absolute right-1 top-1"><${StatusIcon} show=${showFeedback} correct=${entry.crAcc?.toLowerCase() === adj.crAcc.toLowerCase()} /></div>
                                </div>
                                <div className="w-24 p-1 bg-gray-50 border-r"></div>
                                <div className="w-24 p-0 border-r relative">
                                    <input type="number" className=${`w-full h-full p-1 text-right outline-none text-sm ${showFeedback && !isCrCorrect ? 'bg-red-50' : ''}`} placeholder="Credit" value=${entry.crAmt || ''} onChange=${(e) => handleChange(adj.id, 'crAmt', e.target.value)} disabled=${isReadOnly}/>
                                </div>
                            </div>
                            <div className="flex bg-gray-50 text-gray-500 italic text-xs">
                                <div className="w-16 border-r"></div>
                                <div className="flex-1 p-1 pl-8">(${adj.desc})</div>
                            </div>
                        </div>
                    `;
                })}
            </div>
        </div>
    `;
};

// --- RIGHT PANEL: LEDGER COMPONENTS ---

const LedgerAccountAdj = ({ accName, transactions, startingBalance, userLedger, onUpdate, isReadOnly, showFeedback, correctEndingValues }) => {
    // 1. Prepare Rows
    // We combine Historical (ReadOnly) and User (Editable) rows into one display list for the T-Account structure
    
    // A. Historical Rows (Left & Right)
    const leftRows = [];
    const rightRows = [];

    // Beg Bal
    if (startingBalance) {
        if (startingBalance.dr > 0) leftRows.push({ date: 'Jan 01', item: 'Bal', pr: '✓', amount: startingBalance.dr, isLocked: true });
        if (startingBalance.cr > 0) rightRows.push({ date: 'Jan 01', item: 'Bal', pr: '✓', amount: startingBalance.cr, isLocked: true });
    }

    // Transactions
    transactions.forEach(t => {
        const dateObj = new Date(t.date);
        const dd = dateObj.getDate().toString().padStart(2, '0');
        t.debits.forEach(d => { if(d.account === accName) leftRows.push({ date: dd, item: 'GJ', pr: '1', amount: d.amount, isLocked: true }); });
        t.credits.forEach(c => { if(c.account === accName) rightRows.push({ date: dd, item: 'GJ', pr: '1', amount: c.amount, isLocked: true }); });
    });

    // B. User Adjusting Rows
    const userRows = userLedger?.rows || [];
    userRows.forEach((r, idx) => {
        // User inputs can be on Left (Dr) or Right (Cr) based on what they type. 
        // For Step 7, we usually treat the "Dr" and "Cr" columns of the single row entry as putting values on respective sides.
        // But the Step 3 Ledger layout has separate Left/Right blocks.
        // To adapt the "Single Line Entry" user model to "Split T-Account", we need to know which side they intend.
        // Simpler approach for Step 7 with Step 3 Layout:
        // Provide "Add Debit Row" and "Add Credit Row" buttons? Or just generic rows on each side?
        // Step 3 layout expects separate arrays for Left and Right.
        
        // Let's use the `userLedger.leftRows` and `userLedger.rightRows` structure if possible.
    });
    
    // Let's adapt the props to use `leftRows` and `rightRows` in state to match Step 3 exactly.
    const userLeft = userLedger.leftRows || [];
    const userRight = userLedger.rightRows || [];

    // Combine for display
    const finalLeft = [...leftRows, ...userLeft];
    const finalRight = [...rightRows, ...userRight];
    const maxRows = Math.max(finalLeft.length, finalRight.length, 4);
    const displayRows = Array.from({length: maxRows}).map((_, i) => i);

    // Handlers
    const updateSide = (side, idx, field, val) => {
        // Only update if it's a user row (index >= historical length)
        const histLen = side === 'left' ? leftRows.length : rightRows.length;
        if (idx < histLen) return; // Locked

        const userIdx = idx - histLen;
        const currentArr = side === 'left' ? userLeft : userRight;
        const newArr = [...currentArr];
        if (!newArr[userIdx]) newArr[userIdx] = {}; // Initialize if new
        newArr[userIdx] = { ...newArr[userIdx], [field]: val };
        
        onUpdate({ 
            ...userLedger, 
            [side === 'left' ? 'leftRows' : 'rightRows']: newArr 
        });
    };

    const addRow = (side) => {
        const currentArr = side === 'left' ? userLeft : userRight;
        onUpdate({ 
            ...userLedger, 
            [side === 'left' ? 'leftRows' : 'rightRows']: [...currentArr, { date: 'Dec 31', item: 'Adj', pr: 'J2', amount: '' }] 
        });
    };

    const deleteRow = (side, idx) => {
         const histLen = side === 'left' ? leftRows.length : rightRows.length;
         if (idx < histLen) return; 
         const userIdx = idx - histLen;
         const currentArr = side === 'left' ? userLeft : userRight;
         onUpdate({
             ...userLedger,
             [side === 'left' ? 'leftRows' : 'rightRows']: currentArr.filter((_, i) => i !== userIdx)
         });
    };
    
    // Calculate Totals including user input
    // Note: user input 'amount' is string, need parsing
    const userDrSum = userLeft.reduce((sum, r) => sum + (Number(r.amount)||0), 0);
    const userCrSum = userRight.reduce((sum, r) => sum + (Number(r.amount)||0), 0);
    
    // Hist Totals
    const histDrSum = leftRows.reduce((sum, r) => sum + r.amount, 0);
    const histCrSum = rightRows.reduce((sum, r) => sum + r.amount, 0);

    const totalDr = histDrSum + userDrSum;
    const totalCr = histCrSum + userCrSum;

    // Validation
    const correctEndBal = correctEndingValues.endBal;
    const correctBalType = correctEndingValues.balType;

    return html`
        <div className="border-2 border-gray-800 bg-white shadow-md mb-6">
            <div className="border-b-2 border-gray-800 p-2 flex justify-between bg-gray-100 relative">
                <div className="absolute left-2 top-2"><${StatusIcon} show=${showFeedback} correct=${
                    Math.abs(Number(userLedger?.balance || 0) - correctEndBal) <= 1 &&
                    (userLedger?.balanceType === correctBalType || correctEndBal === 0)
                } /></div>
                <div className="w-full text-center mx-8 font-bold text-lg">${accName}</div>
            </div>
            
            <div className="flex">
                <!-- DEBIT SIDE -->
                <div className="flex-1 border-r-2 border-gray-800">
                    <div className="text-center font-bold border-b border-gray-400 bg-gray-50 text-xs py-1">DEBIT</div>
                    <div className="flex text-xs font-bold border-b border-gray-400">
                        <div className="w-12 border-r p-1 text-center">Date</div>
                        <div className="flex-1 border-r p-1 text-center">Particulars</div>
                        <div className="w-8 border-r p-1 text-center">PR</div>
                        <div className="w-16 p-1 text-center">Amount</div>
                        <div className="w-6"></div>
                    </div>
                    ${displayRows.map(i => {
                        const r = finalLeft[i] || {};
                        const isUser = i >= leftRows.length;
                        return html`
                            <div key=${`l-${i}`} className="flex text-xs border-b border-gray-200 h-6 relative ${!isUser ? 'bg-gray-50/50 text-gray-600' : ''}">
                                <div className="w-12 border-r relative"><input type="text" className="w-full h-full text-center px-1 outline-none bg-transparent" value=${r.date||''} onChange=${(e)=>updateSide('left', i, 'date', e.target.value)} disabled=${isReadOnly || !isUser}/></div>
                                <div className="flex-1 border-r relative"><input type="text" className="w-full h-full text-left px-1 outline-none bg-transparent" value=${r.item||''} onChange=${(e)=>updateSide('left', i, 'item', e.target.value)} disabled=${isReadOnly || !isUser}/></div>
                                <div className="w-8 border-r relative"><input type="text" className="w-full h-full text-center outline-none bg-transparent" value=${r.pr||''} onChange=${(e)=>updateSide('left', i, 'pr', e.target.value)} disabled=${isReadOnly || !isUser}/></div>
                                <div className="w-16 relative"><input type="number" className="w-full h-full text-right px-1 outline-none bg-transparent" value=${r.amount||''} onChange=${(e)=>updateSide('left', i, 'amount', e.target.value)} disabled=${isReadOnly || !isUser}/></div>
                                <div className="w-6 flex justify-center items-center">
                                    ${isUser && !isReadOnly && html`<button onClick=${()=>deleteRow('left', i)} class="text-red-400 hover:text-red-600"><${Trash2} size=${10}/></button>`}
                                </div>
                            </div>
                        `;
                    })}
                    ${!isReadOnly && html`<button onClick=${()=>addRow('left')} className="w-full text-center text-[10px] text-blue-600 hover:bg-blue-50 py-1 border-b border-gray-200"><${Plus} size=${10} className="inline"/> Add Debit</button>`}
                    <div className="border-t-2 border-gray-800 p-1 flex justify-between items-center bg-gray-50"><span className="text-xs font-bold">Total Debit</span><input type="number" className="w-20 text-right border border-gray-300 bg-white" value=${userLedger?.drTotal||''} onChange=${(e)=>onUpdate({...userLedger, drTotal: e.target.value})} disabled=${isReadOnly} /></div>
                </div>

                <!-- CREDIT SIDE -->
                <div className="flex-1">
                    <div className="text-center font-bold border-b border-gray-400 bg-gray-50 text-xs py-1">CREDIT</div>
                    <div className="flex text-xs font-bold border-b border-gray-400">
                        <div className="w-12 border-r p-1 text-center">Date</div>
                        <div className="flex-1 border-r p-1 text-center">Particulars</div>
                        <div className="w-8 border-r p-1 text-center">PR</div>
                        <div className="w-16 p-1 text-center">Amount</div>
                        <div className="w-6"></div>
                    </div>
                    ${displayRows.map(i => {
                        const r = finalRight[i] || {};
                        const isUser = i >= rightRows.length;
                        return html`
                            <div key=${`r-${i}`} className="flex text-xs border-b border-gray-200 h-6 relative ${!isUser ? 'bg-gray-50/50 text-gray-600' : ''}">
                                <div className="w-12 border-r relative"><input type="text" className="w-full h-full text-center px-1 outline-none bg-transparent" value=${r.date||''} onChange=${(e)=>updateSide('right', i, 'date', e.target.value)} disabled=${isReadOnly || !isUser}/></div>
                                <div className="flex-1 border-r relative"><input type="text" className="w-full h-full text-left px-1 outline-none bg-transparent" value=${r.item||''} onChange=${(e)=>updateSide('right', i, 'item', e.target.value)} disabled=${isReadOnly || !isUser}/></div>
                                <div className="w-8 border-r relative"><input type="text" className="w-full h-full text-center outline-none bg-transparent" value=${r.pr||''} onChange=${(e)=>updateSide('right', i, 'pr', e.target.value)} disabled=${isReadOnly || !isUser}/></div>
                                <div className="w-16 relative"><input type="number" className="w-full h-full text-right px-1 outline-none bg-transparent" value=${r.amount||''} onChange=${(e)=>updateSide('right', i, 'amount', e.target.value)} disabled=${isReadOnly || !isUser}/></div>
                                <div className="w-6 flex justify-center items-center">
                                    ${isUser && !isReadOnly && html`<button onClick=${()=>deleteRow('right', i)} class="text-red-400 hover:text-red-600"><${Trash2} size=${10}/></button>`}
                                </div>
                            </div>
                        `;
                    })}
                    ${!isReadOnly && html`<button onClick=${()=>addRow('right')} className="w-full text-center text-[10px] text-blue-600 hover:bg-blue-50 py-1 border-b border-gray-200"><${Plus} size=${10} className="inline"/> Add Credit</button>`}
                    <div className="border-t-2 border-gray-800 p-1 flex justify-between items-center bg-gray-50"><span className="text-xs font-bold">Total Credit</span><input type="number" className="w-20 text-right border border-gray-300 bg-white" value=${userLedger?.crTotal||''} onChange=${(e)=>onUpdate({...userLedger, crTotal: e.target.value})} disabled=${isReadOnly} /></div>
                </div>
            </div>
            
            <div className="border-t border-gray-300 p-2 bg-gray-100 flex justify-center items-center gap-2">
                <span className="text-xs font-bold uppercase text-gray-600">Balance:</span>
                <select className="border border-gray-300 rounded text-xs p-1 outline-none bg-white" value=${userLedger?.balanceType || ''} onChange=${(e)=>onUpdate({...userLedger, balanceType: e.target.value})} disabled=${isReadOnly}><option value="" disabled>Type</option><option value="Dr">Debit</option><option value="Cr">Credit</option></select>
                <input type="number" className="w-32 text-center border-b-2 border-double border-black bg-white font-bold text-sm outline-none" placeholder="0" value=${userLedger?.balance||''} onChange=${(e)=>onUpdate({...userLedger, balance: e.target.value})} disabled=${isReadOnly} />
            </div>
        </div>
    `;
};

const LedgerPanel = ({ activityData, ledgerData, onChange, isReadOnly, showFeedback }) => {
    const { validAccounts, transactions, beginningBalances, config } = activityData;
    const sortedAccounts = sortAccounts(validAccounts);

    return html`
        <div className="h-full flex flex-col">
            <div className="bg-blue-100 p-2 font-bold text-blue-900 border-b border-blue-200 flex items-center">
                <${Table} size=${16} className="inline mr-2 w-4 h-4"/>
                General Ledger (Adjusted)
            </div>
            <div className="overflow-y-auto p-4 flex-1 bg-gray-50 custom-scrollbar">
                ${sortedAccounts.map(acc => {
                    // Calculate Correct Ending Values
                    let bbDr = 0, bbCr = 0;
                    if (config.isSubsequentYear && beginningBalances?.balances[acc]) {
                        bbDr = beginningBalances.balances[acc].dr;
                        bbCr = beginningBalances.balances[acc].cr;
                    }
                    let transDr = 0, transCr = 0;
                    transactions.forEach(t => {
                        t.debits.forEach(d => { if(d.account === acc) transDr += d.amount; });
                        t.credits.forEach(c => { if(c.account === acc) transCr += c.amount; });
                    });
                    let adjDr = 0, adjCr = 0;
                    activityData.adjustments.forEach(a => {
                        if (a.drAcc === acc) adjDr += a.amount;
                        if (a.crAcc === acc) adjCr += a.amount;
                    });
                    const totalDr = bbDr + transDr + adjDr;
                    const totalCr = bbCr + transCr + adjCr;
                    const endBal = totalDr - totalCr;
                    
                    const correctEndingValues = {
                        adjDr, adjCr,
                        endBal: Math.abs(endBal),
                        balType: endBal >= 0 ? 'Dr' : 'Cr'
                    };

                    return html`
                        <${LedgerAccountAdj} 
                            key=${acc} 
                            accName=${acc} 
                            transactions=${transactions}
                            startingBalance=${config.isSubsequentYear && beginningBalances ? beginningBalances.balances[acc] : null}
                            userLedger=${ledgerData[acc] || {}}
                            onUpdate=${(val) => onChange(acc, val)}
                            isReadOnly=${isReadOnly}
                            showFeedback=${showFeedback}
                            correctEndingValues=${correctEndingValues}
                        />
                    `;
                })}
            </div>
        </div>
    `;
};


// --- MAIN EXPORT ---

export default function Step7AdjustingEntries({ activityData, data, onChange, showFeedback, isReadOnly }) {
    const journalData = data.journal || {};
    const ledgerData = data.ledger || {};

    const handleJournalChange = (id, val) => {
        onChange('journal', { ...journalData, [id]: val });
    };

    const handleLedgerChange = (acc, val) => {
        onChange('ledger', { ...ledgerData, [acc]: val });
    };

    return html`
        <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-140px)]">
            <div className="flex-1 lg:w-5/12 flex flex-col gap-4 min-h-0">
                <${HistoricalJournalView} transactions=${activityData.transactions} />
                <${AdjustmentEntryForm} 
                    adjustments=${activityData.adjustments} 
                    data=${journalData} 
                    onChange=${handleJournalChange} 
                    isReadOnly=${isReadOnly} 
                    showFeedback=${showFeedback}
                />
            </div>
            <div className="flex-1 lg:w-7/12 min-h-0 border rounded bg-white shadow-sm flex flex-col overflow-hidden">
                <${LedgerPanel} 
                    activityData=${activityData} 
                    ledgerData=${ledgerData} 
                    onChange=${handleLedgerChange} 
                    isReadOnly=${isReadOnly} 
                    showFeedback=${showFeedback}
                />
            </div>
        </div>
    `;
}
