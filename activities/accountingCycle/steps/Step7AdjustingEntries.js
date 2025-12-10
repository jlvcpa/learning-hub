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
                    
                    // Validation Check (Visual only here, logic in App.js)
                    const isDrCorrect = entry.drAcc?.toLowerCase() === adj.drAcc.toLowerCase() && Math.abs(Number(entry.drAmt) - adj.amount) <= 1;
                    const isCrCorrect = entry.crAcc?.toLowerCase() === adj.crAcc.toLowerCase() && Math.abs(Number(entry.crAmt) - adj.amount) <= 1;
                    
                    return html`
                        <div key=${adj.id} className="mb-4 border border-blue-200 rounded overflow-hidden">
                            <div className="bg-blue-50 px-2 py-1 text-xs font-bold text-blue-800 border-b border-blue-200">AJE #${idx + 1} (Date: Dec 31)</div>
                            
                            <!-- Debit Row -->
                            <div className="flex border-b border-gray-100">
                                <div className="w-16 p-1 text-center border-r bg-gray-50 text-xs flex items-center justify-center">Dec 31</div>
                                <div className="flex-1 p-0 border-r relative">
                                    <input type="text" className=${`w-full h-full p-1 outline-none text-sm ${showFeedback && !isDrCorrect ? 'bg-red-50' : ''}`} 
                                        placeholder="Debit Account" 
                                        value=${entry.drAcc || ''} 
                                        onChange=${(e) => handleChange(adj.id, 'drAcc', e.target.value)} 
                                        disabled=${isReadOnly}
                                    />
                                    <div className="absolute right-1 top-1"><${StatusIcon} show=${showFeedback} correct=${entry.drAcc?.toLowerCase() === adj.drAcc.toLowerCase()} /></div>
                                </div>
                                <div className="w-24 p-0 border-r relative">
                                    <input type="number" className=${`w-full h-full p-1 text-right outline-none text-sm ${showFeedback && !isDrCorrect ? 'bg-red-50' : ''}`}
                                        placeholder="Debit" 
                                        value=${entry.drAmt || ''} 
                                        onChange=${(e) => handleChange(adj.id, 'drAmt', e.target.value)} 
                                        disabled=${isReadOnly}
                                    />
                                </div>
                                <div className="w-24 p-1 bg-gray-50 border-r"></div>
                            </div>

                            <!-- Credit Row -->
                            <div className="flex border-b border-gray-100">
                                <div className="w-16 border-r bg-gray-50"></div>
                                <div className="flex-1 p-0 border-r relative pl-6">
                                    <input type="text" className=${`w-full h-full p-1 outline-none text-sm ${showFeedback && !isCrCorrect ? 'bg-red-50' : ''}`} 
                                        placeholder="Credit Account" 
                                        value=${entry.crAcc || ''} 
                                        onChange=${(e) => handleChange(adj.id, 'crAcc', e.target.value)} 
                                        disabled=${isReadOnly}
                                    />
                                    <div className="absolute right-1 top-1"><${StatusIcon} show=${showFeedback} correct=${entry.crAcc?.toLowerCase() === adj.crAcc.toLowerCase()} /></div>
                                </div>
                                <div className="w-24 p-1 bg-gray-50 border-r"></div>
                                <div className="w-24 p-0 border-r relative">
                                    <input type="number" className=${`w-full h-full p-1 text-right outline-none text-sm ${showFeedback && !isCrCorrect ? 'bg-red-50' : ''}`}
                                        placeholder="Credit" 
                                        value=${entry.crAmt || ''} 
                                        onChange=${(e) => handleChange(adj.id, 'crAmt', e.target.value)} 
                                        disabled=${isReadOnly}
                                    />
                                </div>
                            </div>

                            <!-- Description Row -->
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
    // Filter historical transactions for this account
    const histRows = useMemo(() => {
        const rows = [];
        // Add Beg Bal if exists
        if (startingBalance) {
            if (startingBalance.dr > 0) rows.push({ date: 'Jan 01', item: 'Balance', pr: '✓', dr: startingBalance.dr, cr: null, isBal: true });
            if (startingBalance.cr > 0) rows.push({ date: 'Jan 01', item: 'Balance', pr: '✓', dr: null, cr: startingBalance.cr, isBal: true });
        }
        
        transactions.forEach(t => {
            const dateObj = new Date(t.date);
            const dateStr = `${dateObj.toLocaleString('default', { month: 'short' })} ${dateObj.getDate().toString().padStart(2, '0')}`;
            t.debits.forEach(d => {
                if (d.account === accName) rows.push({ date: dateStr, item: '', pr: 'J1', dr: d.amount, cr: null });
            });
            t.credits.forEach(c => {
                if (c.account === accName) rows.push({ date: dateStr, item: '', pr: 'J1', dr: null, cr: c.amount });
            });
        });
        return rows;
    }, [accName, transactions, startingBalance]);

    // Calculate unadjusted totals for display context
    const histDrTotal = histRows.reduce((sum, r) => sum + (r.dr || 0), 0);
    const histCrTotal = histRows.reduce((sum, r) => sum + (r.cr || 0), 0);

    // User added rows for Adjusting Entries
    const userRows = userLedger?.rows || [];
    
    const handleAddRow = () => {
        const newRows = [...userRows, { date: 'Dec 31', item: 'Adjusting', pr: 'J2', dr: '', cr: '' }];
        onUpdate({ ...userLedger, rows: newRows });
    };

    const handleDeleteRow = (idx) => {
        const newRows = userRows.filter((_, i) => i !== idx);
        onUpdate({ ...userLedger, rows: newRows });
    };

    const handleRowChange = (idx, field, val) => {
        const newRows = [...userRows];
        newRows[idx] = { ...newRows[idx], [field]: val };
        onUpdate({ ...userLedger, rows: newRows });
    };

    const handleTotalChange = (field, val) => {
        onUpdate({ ...userLedger, [field]: val });
    };

    // Correct Values for Validation
    const correctAdjDr = correctEndingValues.adjDr || 0;
    const correctAdjCr = correctEndingValues.adjCr || 0;
    const correctEndBal = Math.abs(correctEndingValues.endBal || 0);
    const correctBalType = (correctEndingValues.endBal || 0) >= 0 ? 'Dr' : 'Cr';

    return html`
        <div className="border border-gray-300 rounded shadow-sm bg-white mb-6">
            <div className="bg-gray-100 p-1 font-bold text-center border-b border-gray-300 text-sm flex justify-between items-center px-4">
                <span>${accName}</span>
                <${StatusIcon} show=${showFeedback} correct=${
                    // Loose validation for the card header icon: Check if ending balance matches
                    Math.abs(Number(userLedger?.endBal || 0) - correctEndBal) <= 1 &&
                    (userLedger?.balType === correctBalType || correctEndBal === 0)
                } />
            </div>
            
            <table className="w-full text-xs">
                <thead>
                    <tr className="bg-gray-50 border-b">
                        <th className="w-12 p-1 text-center">Date</th>
                        <th className="flex-1 p-1 text-left">Particulars</th>
                        <th className="w-8 p-1 text-center">PR</th>
                        <th className="w-16 p-1 text-right">Debit</th>
                        <th className="w-16 p-1 text-right">Credit</th>
                        <th className="w-6"></th>
                    </tr>
                </thead>
                <tbody>
                    <!-- Historical Rows (Read Only) -->
                    ${histRows.map((r, i) => html`
                        <tr key=${'hist'+i} className="text-gray-500 bg-gray-50/50">
                            <td className="p-1 text-center">${r.date}</td>
                            <td className="p-1 border-l border-r border-gray-100">${r.item}</td>
                            <td className="p-1 text-center">${r.pr}</td>
                            <td className="p-1 text-right border-r border-gray-100">${r.dr ? r.dr.toLocaleString() : ''}</td>
                            <td className="p-1 text-right">${r.cr ? r.cr.toLocaleString() : ''}</td>
                            <td></td>
                        </tr>
                    `)}
                    
                    <!-- User Rows (Adjusting) -->
                    ${userRows.map((r, i) => html`
                        <tr key=${'user'+i} className="border-t border-gray-200">
                            <td className="p-0"><input type="text" className="w-full text-center outline-none" value=${r.date} onChange=${(e)=>handleRowChange(i, 'date', e.target.value)} disabled=${isReadOnly}/></td>
                            <td className="p-0 border-l border-r"><input type="text" className="w-full px-1 outline-none" value=${r.item} onChange=${(e)=>handleRowChange(i, 'item', e.target.value)} disabled=${isReadOnly}/></td>
                            <td className="p-0"><input type="text" className="w-full text-center outline-none" value=${r.pr} onChange=${(e)=>handleRowChange(i, 'pr', e.target.value)} disabled=${isReadOnly}/></td>
                            <td className="p-0 border-l border-r"><input type="number" className="w-full text-right px-1 outline-none" value=${r.dr} onChange=${(e)=>handleRowChange(i, 'dr', e.target.value)} disabled=${isReadOnly}/></td>
                            <td className="p-0 border-r"><input type="number" className="w-full text-right px-1 outline-none" value=${r.cr} onChange=${(e)=>handleRowChange(i, 'cr', e.target.value)} disabled=${isReadOnly}/></td>
                            <td className="p-0 text-center">${!isReadOnly && html`<button onClick=${()=>handleDeleteRow(i)} class="text-red-400 hover:text-red-600"><${Trash2} size=${12}/></button>`}</td>
                        </tr>
                    `)}
                </tbody>
                <tfoot>
                    ${!isReadOnly && html`
                        <tr>
                            <td colSpan="6" className="p-1 bg-gray-50 border-t">
                                <button onClick=${handleAddRow} className="text-blue-600 flex items-center gap-1 hover:underline text-[10px] w-full justify-center">
                                    <${Plus} size=${10}/> Add Adjustment Row
                                </button>
                            </td>
                        </tr>
                    `}
                    <!-- Totals Row -->
                    <tr className="font-bold border-t border-black bg-gray-50">
                        <td colSpan="3" className="text-right pr-2">Totals</td>
                        <td className="p-0 border-r border-l border-black relative">
                            <input type="number" className=${`w-full text-right px-1 outline-none bg-transparent ${showFeedback && Math.abs(Number(userLedger?.totalDr) - (histDrTotal + correctAdjDr)) > 1 ? 'text-red-600' : ''}`} 
                                value=${userLedger?.totalDr || ''} onChange=${(e)=>handleTotalChange('totalDr', e.target.value)} disabled=${isReadOnly} placeholder="0"/>
                        </td>
                        <td className="p-0 border-r border-black relative">
                            <input type="number" className=${`w-full text-right px-1 outline-none bg-transparent ${showFeedback && Math.abs(Number(userLedger?.totalCr) - (histCrTotal + correctAdjCr)) > 1 ? 'text-red-600' : ''}`}
                                value=${userLedger?.totalCr || ''} onChange=${(e)=>handleTotalChange('totalCr', e.target.value)} disabled=${isReadOnly} placeholder="0"/>
                        </td>
                        <td></td>
                    </tr>
                    <!-- Balance Row -->
                    <tr className="font-bold border-t border-double border-black bg-yellow-50">
                        <td colSpan="3" className="text-right pr-2">Ending Balance</td>
                        <td colSpan="2" className="p-1 flex items-center gap-1 justify-end">
                            <select className="bg-transparent border-b border-gray-300 text-xs" value=${userLedger?.balType || ''} onChange=${(e)=>handleTotalChange('balType', e.target.value)} disabled=${isReadOnly}>
                                <option value="" disabled>Type</option>
                                <option value="Dr">Dr</option>
                                <option value="Cr">Cr</option>
                            </select>
                            <input type="number" className=${`w-24 text-right outline-none bg-transparent border-b border-black ${showFeedback && Math.abs(Number(userLedger?.endBal) - correctEndBal) > 1 ? 'text-red-600' : 'text-blue-900'}`}
                                value=${userLedger?.endBal || ''} onChange=${(e)=>handleTotalChange('endBal', e.target.value)} disabled=${isReadOnly} placeholder="0"/>
                        </td>
                        <td></td>
                    </tr>
                </tfoot>
            </table>
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
                    // Calculate Correct Ending Values for Validation
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
                    
                    // Adjustments
                    let adjDr = 0, adjCr = 0;
                    activityData.adjustments.forEach(a => {
                        if (a.drAcc === acc) adjDr += a.amount;
                        if (a.crAcc === acc) adjCr += a.amount;
                    });
                    
                    const totalDr = bbDr + transDr + adjDr;
                    const totalCr = bbCr + transCr + adjCr;
                    const endBal = totalDr - totalCr;
                    
                    const correctEndingValues = {
                        adjDr,
                        adjCr,
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
    // Data Structure:
    // data.journal = { 'adj1': { ... }, 'adj2': { ... } }
    // data.ledger = { 'Cash': { rows: [], totalDr: '', totalCr: '', endBal: '', balType: '' }, ... }
    
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
            <!-- LEFT PANEL: JOURNAL -->
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
            
            <!-- RIGHT PANEL: LEDGER -->
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
