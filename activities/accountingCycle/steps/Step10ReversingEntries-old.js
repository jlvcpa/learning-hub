// --- Step10ReversingEntries.js ---
import React, { useState, useMemo } from 'https://esm.sh/react@18.2.0';
import htm from 'https://esm.sh/htm';
import { Book, Check, X, ChevronDown, ChevronRight, AlertCircle } from 'https://esm.sh/lucide-react@0.263.1';
import { getAccountType, sortAccounts, getLetterGrade } from '../utils.js';

const html = htm.bind(React.createElement);

// --- INTERNAL COMPONENTS ---

const StatusIcon = ({ correct, show }) => {
    if (!show) return null;
    return correct 
        ? html`<${Check} size=${14} className="text-green-600 inline ml-1" />` 
        : html`<${X} size=${14} className="text-red-600 inline ml-1" />`;
};

// --- VALIDATION HELPER (Exported for App.js) ---
export const validateReversingEntry = (entry, adj, config, isFirst) => {
    // 1. Safe Inputs & Normalization
    const type = (adj.type || '').toLowerCase();
    const desc = (adj.desc || '').toLowerCase();
    const drAcc = (adj.drAcc || '').toLowerCase(); // Adjustment Debit Account
    const crAcc = (adj.crAcc || '').toLowerCase(); // Adjustment Credit Account
    
    // 2. Determine if Reversable (STRICT LOGIC)
    let shouldReverse = false;

    // --- CHECK 1: ACCRUALS ---
    const isAccruedExpense = crAcc.includes('payable') && !crAcc.includes('accounts payable') && !crAcc.includes('notes payable');
    const isAccruedIncome = drAcc.includes('receivable') && !drAcc.includes('accounts receivable') && !drAcc.includes('notes receivable');

    if (type.includes('accrued') || desc.includes('accrued') || isAccruedExpense || isAccruedIncome) {
        shouldReverse = true;
    }

    // --- CHECK 2: DEFERRALS (EXPENSE METHOD) ---
    if (config.deferredExpenseMethod === 'Expense') {
        const isAssetAdjustment = drAcc.includes('prepaid') || drAcc.includes('supplies');
        if (isAssetAdjustment) {
            shouldReverse = true;
        }
    }

    // --- CHECK 3: DEFERRALS (INCOME METHOD) ---
    if (config.deferredIncomeMethod === 'Income') {
        const isLiabilityAdjustment = crAcc.includes('unearned') || crAcc.includes('advance');
        if (isLiabilityAdjustment) {
            shouldReverse = true;
        }
    }

    // --- VALIDATION OF USER INPUT ---

    let isDrCorrect = false;
    let isCrCorrect = false;
    let isDescCorrect = false;
    let isDateCorrect = false;
    let isYearCorrect = true;

    if (shouldReverse) {
        // [SCENARIO A] REVERSING ENTRY IS REQUIRED
        
        const hasData = entry.drAcc || entry.crAcc || entry.drAmt;
        if (!hasData) {
            return { isEntryCorrect: false, shouldReverse: true, debug: 'Missing Required Entry' };
        }

        // 1. Validate Accounts (Must be Swapped vs Adjustment)
        const userDrAcc = (entry.drAcc || '').toLowerCase().trim();
        const userCrAcc = (entry.crAcc || '').toLowerCase().trim();
        
        // 2. Validate Amounts
        const userDrAmt = Number(entry.drAmt);
        const userCrAmt = Number(entry.crAmt);

        isDrCorrect = userDrAcc === crAcc && Math.abs(userDrAmt - adj.amount) <= 1;
        isCrCorrect = userCrAcc === drAcc && Math.abs(userCrAmt - adj.amount) <= 1;
        
        // 3. Description (Must contain 'reversing')
        isDescCorrect = (entry.desc || '').toLowerCase().includes('reversing');
        
        // 4. Date Logic (Jan 1)
        const d = (entry.date || '').toLowerCase().trim();
        const validDates = ['jan 1', 'jan 01', 'jan. 1', 'jan. 01', '1/1', '01/01', '1', '01'];
        if (isFirst) {
            isDateCorrect = validDates.some(vd => d.includes(vd)) || d === '1'; 
            isYearCorrect = !!entry.year; 
        } else {
            isDateCorrect = validDates.some(vd => d.includes(vd)) || d === '1';
            isYearCorrect = !entry.year; 
        }

    } else {
        // [SCENARIO B] NO ENTRY REQUIRED
        const hasData = entry.drAcc || entry.drAmt || entry.crAcc || entry.crAmt;
        
        isDrCorrect = !hasData;
        isCrCorrect = !hasData;
        isDescCorrect = !entry.desc;
        isDateCorrect = !entry.date;
        isYearCorrect = !entry.year;
    }

    const isEntryCorrect = isDrCorrect && isCrCorrect && isDescCorrect && isDateCorrect && isYearCorrect;
    return { isDrCorrect, isCrCorrect, isDescCorrect, isDateCorrect, isYearCorrect, isEntryCorrect, shouldReverse };
};

// --- LEFT PANEL: HISTORICAL JOURNAL VIEW ---
const HistoricalJournalView = ({ entries }) => {
    const [expanded, setExpanded] = useState(true);
    const firstDate = entries.length > 0 ? new Date(entries[0].rawDate || Date.now()) : new Date();
    const year = firstDate.getFullYear();

    return html`
        <div className="mb-4 border rounded bg-white overflow-hidden shadow-sm flex flex-col h-full">
            <div className="bg-gray-100 p-2 font-bold text-gray-700 cursor-pointer flex justify-between items-center flex-shrink-0" onClick=${()=>setExpanded(!expanded)}>
                <div className="flex items-center">
                    <${Book} size=${16} className="inline mr-2 w-4 h-4"/>
                    <span>Historical General Journal (Dec 31)</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-normal">
                    ${expanded ? html`<${ChevronDown} size=${16} className="w-4 h-4"/>` : html`<${ChevronRight} size=${16} className="w-4 h-4"/>`}
                </div>
            </div>
            ${expanded && html`
                <div className="flex flex-col flex-1 overflow-hidden border-t border-gray-200">
                    <div className="flex bg-gray-50 text-gray-700 border-b border-gray-300 font-bold text-xs text-center flex-shrink-0">
                        <div className="w-16 border-r p-2 flex-shrink-0">Date</div>
                        <div className="flex-1 border-r p-2 text-left">Account Titles and Explanation</div>
                        <div className="w-16 border-r p-2 flex-shrink-0">P.R.</div>
                        <div className="w-20 border-r p-2 text-right flex-shrink-0">Debit</div>
                        <div className="w-20 p-2 text-right flex-shrink-0">Credit</div>
                    </div>
                    <div className="overflow-y-auto flex-1 bg-white custom-scrollbar">
                        <div className="flex border-b border-gray-100 text-xs h-6 items-center">
                            <div className="w-16 border-r text-center font-bold text-gray-800 flex-shrink-0 bg-gray-50">${year}</div>
                            <div className="flex-1 border-r"></div>
                            <div className="w-16 border-r"></div>
                            <div className="w-20 border-r"></div>
                            <div className="w-20"></div>
                        </div>

                        ${entries.map((t, tIdx) => {
                            const isFirst = tIdx === 0;
                            const dateParts = t.date.split(' '); 
                            const dateDisplay = isFirst ? t.date : (dateParts[1] || t.date); 
                            
                            return html`
                                <React.Fragment key=${t.id + tIdx}>
                                    ${t.rows.map((row, i) => html`
                                        <div key=${i} className="flex text-xs h-6 items-center hover:bg-gray-50">
                                            <div className="w-16 border-r text-center flex-shrink-0 text-gray-600 border-gray-100">
                                                ${i === 0 ? dateDisplay : ''}
                                            </div>
                                            <div className="flex-1 border-r border-gray-100 pl-1 font-medium text-gray-800 truncate" title=${row.account}>
                                                ${row.type === 'cr' ? html`<span className="ml-8">${row.account}</span>` : row.account}
                                            </div>
                                            <div className="w-16 border-r border-gray-100 text-center flex justify-center items-center flex-shrink-0 text-gray-400">
                                                ${t.type === 'GJ' ? '1' : t.type === 'ADJ' ? '2' : '3'}
                                            </div>
                                            <div className="w-20 border-r border-gray-100 text-right pr-1 flex-shrink-0 text-gray-800">
                                                ${row.type === 'dr' ? Number(row.amount).toLocaleString() : ''}
                                            </div>
                                            <div className="w-20 text-right pr-1 flex-shrink-0 text-gray-800 border-gray-100 border-r-0">
                                                ${row.type === 'cr' ? Number(row.amount).toLocaleString() : ''}
                                            </div>
                                        </div>
                                    `)}
                                    <div className="flex text-xs h-6 items-center text-gray-500 italic mb-2">
                                        <div className="w-16 border-r border-gray-100 flex-shrink-0"></div>
                                        <div className="flex-1 border-r border-gray-100 pl-12 truncate" title=${t.description}>${t.description}</div>
                                        <div className="w-16 border-r border-gray-100 flex-shrink-0"></div>
                                        <div className="w-20 border-r border-gray-100 flex-shrink-0"></div>
                                        <div className="w-20 flex-shrink-0"></div>
                                    </div>
                                    <div className="flex h-6 border-b border-gray-100">
                                        <div className="w-16 border-r border-gray-100"></div>
                                        <div className="flex-1 border-r border-gray-100"></div>
                                        <div className="w-16 border-r border-gray-100"></div>
                                        <div className="w-20 border-r border-gray-100"></div>
                                        <div className="w-20"></div>
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

// --- RIGHT PANEL: REVERSING ENTRY FORM ---
const ReversingEntryForm = ({ adjustments, data, onChange, isReadOnly, showFeedback, activityData }) => {
    
    const handleChange = (adjId, field, val) => {
        const current = data[adjId] || {};
        onChange(adjId, { ...current, [field]: val });
    };

    return html`
        <div className="border rounded bg-white shadow-sm flex flex-col flex-1 min-h-0 h-full">
            <div className="bg-blue-100 p-2 font-bold text-blue-900 border-b flex items-center justify-between">
                <div className="flex items-center">
                    <${Book} size=${16} className="inline mr-2 w-4 h-4"/>
                    Journalize Reversing Entries (Jan 01)
                </div>
            </div>
            
            <div className="bg-yellow-50 p-2 text-xs border-b border-yellow-200 text-yellow-800 flex items-start gap-2">
                <${AlertCircle} size=${14} className="mt-0.5 flex-shrink-0"/>
                <span>
                    <strong>Instruction:</strong> Review the Adjusting Entries. If an adjustment requires a reversing entry (Accruals or Deferrals under Expense/Income method), record it below. If no entry is needed, leave the fields blank.
                </span>
            </div>
            <div className="overflow-y-auto p-2 flex-1 custom-scrollbar">
                
                <div className="flex bg-gray-50 text-gray-700 border-b border-gray-300 font-bold text-xs text-center flex-shrink-0 mb-2">
                    <div className="w-16 border-r p-2 flex-shrink-0">Date</div>
                    <div className="flex-1 border-r p-2 text-left">Account Titles and Explanation</div>
                    <div className="w-16 border-r p-2 flex-shrink-0">P.R.</div>
                    <div className="w-20 border-r p-2 text-right flex-shrink-0">Debit</div>
                    <div className="w-20 p-2 text-right flex-shrink-0">Credit</div>
                </div>

                ${adjustments.map((adj, idx) => {
                    const entry = data[adj.id] || {};
                    const isFirst = idx === 0;
                    
                    const { 
                        isDrCorrect, isCrCorrect, isDescCorrect, isDateCorrect, isYearCorrect, shouldReverse 
                    } = validateReversingEntry(entry, adj, activityData.config, isFirst);

                    return html`
                        <div key=${adj.id} className="mb-4 rounded overflow-hidden">
                            <div className="bg-gray-100 px-2 py-1 text-[10px] font-bold text-gray-500 border-b border-gray-200 flex justify-between">
                                <span>Ref: AJE #${idx + 1} (${adj.desc})</span>
                                <span>${shouldReverse ? "Reversing Required" : "No Entry Needed"}</span>
                            </div>

                            ${isFirst && html`
                                <div className="flex border-b border-gray-100 h-7">
                                    <div className="w-16 border-r border-gray-200 bg-white p-0 relative">
                                        <input type="text" className=${`w-full h-full text-center font-bold text-xs outline-none ${showFeedback && !isYearCorrect ? 'bg-red-50' : ''}`} placeholder="YYYY" value=${entry.year || ''} onChange=${(e) => handleChange(adj.id, 'year', e.target.value)} disabled=${isReadOnly}/>
                                    </div>
                                    <div className="flex-1 border-r border-gray-200"></div>
                                    <div className="w-16 border-r border-gray-200"></div>
                                    <div className="w-20 border-r border-gray-200"></div>
                                    <div className="w-20"></div>
                                </div>
                            `}
                            
                            <div className="flex border-b border-gray-100 h-7">
                                <div className="w-16 border-r border-gray-200 p-0 relative">
                                    <input type="text" className=${`w-full h-full text-center text-xs outline-none ${showFeedback && !isDateCorrect ? 'bg-red-50' : ''}`} placeholder=${isFirst ? "Mmm d" : "d"} value=${entry.date || ''} onChange=${(e) => handleChange(adj.id, 'date', e.target.value)} disabled=${isReadOnly}/>
                                </div>
                                <div className="flex-1 p-0 border-r border-gray-200 relative">
                                    <input type="text" className=${`w-full h-full p-1 text-xs outline-none ${showFeedback && !isDrCorrect ? 'bg-red-50' : ''}`} placeholder="Debit Account" value=${entry.drAcc || ''} onChange=${(e) => handleChange(adj.id, 'drAcc', e.target.value)} disabled=${isReadOnly}/>
                                    <div className="absolute right-1 top-1"><${StatusIcon} show=${showFeedback} correct=${isDrCorrect} /></div>
                                </div>
                                <div className="w-16 border-r border-gray-200"></div>
                                <div className="w-20 p-0 border-r border-gray-200 relative">
                                    <input type="number" className=${`w-full h-full p-1 text-right text-xs outline-none ${showFeedback && !isDrCorrect ? 'bg-red-50' : ''}`} placeholder="Debit" value=${entry.drAmt || ''} onChange=${(e) => handleChange(adj.id, 'drAmt', e.target.value)} disabled=${isReadOnly}/>
                                </div>
                                <div className="w-20 p-1 bg-gray-50"></div>
                            </div>

                            <div className="flex border-b border-gray-100 h-7">
                                <div className="w-16 border-r border-gray-200 bg-white"></div>
                                <div className="flex-1 p-0 border-r border-gray-200 relative pl-8">
                                    <input type="text" className=${`w-full h-full p-1 text-xs outline-none ${showFeedback && !isCrCorrect ? 'bg-red-50' : ''}`} placeholder="Credit Account" value=${entry.crAcc || ''} onChange=${(e) => handleChange(adj.id, 'crAcc', e.target.value)} disabled=${isReadOnly}/>
                                    <div className="absolute right-1 top-1"><${StatusIcon} show=${showFeedback} correct=${isCrCorrect} /></div>
                                </div>
                                <div className="w-16 border-r border-gray-200"></div>
                                <div className="w-20 p-1 bg-gray-50 border-r border-gray-200"></div>
                                <div className="w-20 p-0 relative">
                                    <input type="number" className=${`w-full h-full p-1 text-right text-xs outline-none ${showFeedback && !isCrCorrect ? 'bg-red-50' : ''}`} placeholder="Credit" value=${entry.crAmt || ''} onChange=${(e) => handleChange(adj.id, 'crAmt', e.target.value)} disabled=${isReadOnly}/>
                                </div>
                            </div>

                            <div className="flex border-b border-gray-100 h-7">
                                <div className="w-16 border-r border-gray-200 bg-white"></div>
                                <div className="flex-1 p-0 border-r border-gray-200 relative pl-12">
                                    <input type="text" className=${`w-full h-full p-1 text-xs italic text-gray-600 outline-none ${showFeedback && !isDescCorrect ? 'bg-red-50' : ''}`} placeholder="Description" value=${entry.desc || ''} onChange=${(e) => handleChange(adj.id, 'desc', e.target.value)} disabled=${isReadOnly}/>
                                </div>
                                <div className="w-16 border-r border-gray-200"></div>
                                <div className="w-20 border-r border-gray-200"></div>
                                <div className="w-20"></div>
                            </div>
                        </div>
                    `;
                })}
            </div>
        </div>
    `;
};

// --- MAIN COMPONENT ---
export default function Step10ReversingEntries({ activityData, data, onChange, showFeedback, isReadOnly }) {
    
    // DRY Validation Calculation
    const validationResult = useMemo(() => {
        if (!showFeedback && !isReadOnly) return null;
        
        // This relies on the helper function validateStep10 at the bottom of the file
        return validateStep10(data, activityData);
    }, [data, activityData, showFeedback, isReadOnly]);

    // Combine all historical entries for the Left Panel View
    const combinedEntries = useMemo(() => {
        const { transactions, adjustments, validAccounts, beginningBalances, config } = activityData;
        const entries = [];

        // 1. Regular Transactions
        transactions.forEach(t => {
            const dateObj = new Date(t.date);
            const dateStr = `${dateObj.toLocaleString('default', { month: 'short' })} ${dateObj.getDate().toString().padStart(2,'0')}`;
            const rows = [];
            t.debits.forEach(d => rows.push({ account: d.account, amount: d.amount, type: 'dr' }));
            t.credits.forEach(c => rows.push({ account: c.account, amount: c.amount, type: 'cr' }));
            entries.push({ id: `txn-${t.id}`, date: dateStr, rawDate: t.date, description: t.description, type: 'GJ', rows });
        });

        // 2. Adjusting Entries
        adjustments.forEach((adj, i) => {
            const rows = [
                { account: adj.drAcc, amount: adj.amount, type: 'dr' },
                { account: adj.crAcc, amount: adj.amount, type: 'cr' }
            ];
            entries.push({ id: `adj-${i}`, date: 'Dec 31', rawDate: '2023-12-31', description: adj.desc, type: 'ADJ', rows });
        });

        // 3. Closing Entries
        let totalRev = 0, totalExp = 0;
        
        const tempLedger = {};
        const getBal = (acc) => {
             if (tempLedger[acc] !== undefined) return tempLedger[acc];
             let dr = 0, cr = 0;
             if (config.isSubsequentYear && beginningBalances?.balances[acc]) { dr += beginningBalances.balances[acc].dr; cr += beginningBalances.balances[acc].cr; }
             transactions.forEach(t => { t.debits.forEach(d => { if(d.account===acc) dr+=d.amount; }); t.credits.forEach(c => { if(c.account===acc) cr+=c.amount; }); });
             adjustments.forEach(a => { if(a.drAcc===acc) dr+=a.amount; if(a.crAcc===acc) cr+=a.amount; });
             const net = dr - cr;
             tempLedger[acc] = net;
             return net;
        };

        const closingEntries = [];
        
        validAccounts.forEach(acc => {
            const net = getBal(acc);
            const type = getAccountType(acc);
            
            if (type === 'Revenue' && Math.abs(net) > 0) {
                totalRev += Math.abs(net);
                closingEntries.push({ 
                    id: `close-rev-${acc}`, date: 'Dec 31', rawDate: '2023-12-31', 
                    description: 'To close the revenue accounts.', 
                    type: 'CLS', 
                    rows: [{account: acc, amount: Math.abs(net), type: 'dr'}, {account: 'Income Summary', amount: Math.abs(net), type: 'cr'}] 
                });
            }
        });

        validAccounts.forEach(acc => {
            const net = getBal(acc);
            const type = getAccountType(acc);
            if (type === 'Expense' && net > 0) {
                totalExp += net;
                closingEntries.push({ 
                    id: `close-exp-${acc}`, date: 'Dec 31', rawDate: '2023-12-31', 
                    description: 'To close the expense accounts.', 
                    type: 'CLS', 
                    rows: [{account: 'Income Summary', amount: net, type: 'dr'}, {account: acc, amount: net, type: 'cr'}] 
                });
            }
        });

        const ni = totalRev - totalExp;
        const capAcc = validAccounts.find(a => getAccountType(a) === 'Equity' && !a.includes('Drawing') && !a.includes('Dividends'));
        
        if (ni !== 0) {
             const rows = ni >= 0 
                ? [{account: 'Income Summary', amount: ni, type: 'dr'}, {account: capAcc, amount: ni, type: 'cr'}]
                : [{account: capAcc, amount: Math.abs(ni), type: 'dr'}, {account: 'Income Summary', amount: Math.abs(ni), type: 'cr'}];
             
             closingEntries.push({ 
                id: 'close-inc', date: 'Dec 31', rawDate: '2023-12-31', 
                description: 'To close the income summary account.', 
                type: 'CLS', rows 
            });
        }

        validAccounts.forEach(acc => {
            const net = getBal(acc);
            if ((acc.includes('Drawing') || acc.includes('Dividends')) && net > 0) {
                closingEntries.push({ 
                    id: `close-drw-${acc}`, date: 'Dec 31', rawDate: '2023-12-31', 
                    description: 'To close the drawing accounts.', 
                    type: 'CLS', 
                    rows: [{account: capAcc, amount: net, type: 'dr'}, {account: acc, amount: net, type: 'cr'}] 
                });
            }
        });

        return [...entries, ...closingEntries];
    }, [activityData]);

    return html`
        <div className="flex flex-col h-[calc(100vh-140px)] min-h-[600px]">
            ${(showFeedback || isReadOnly) && validationResult && html`
                <div className="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-2 mb-4 flex justify-between items-center shadow-sm w-full flex-shrink-0">
                    <span className="font-bold flex items-center gap-2"><${AlertCircle} size=${18}/> Validation Results:</span>
                    <span className="font-mono font-bold text-lg">Score: ${validationResult.score || 0} of ${validationResult.maxScore || 0} - (${validationResult.letterGrade || 'IR'})</span>
                </div>
            `}

            <div className="flex flex-col lg:flex-row gap-4 flex-1 min-h-0">
                <div className="flex-1 lg:w-1/2 h-full min-h-0">
                     <${HistoricalJournalView} entries=${combinedEntries} />
                </div>
                <div className="flex-1 lg:w-1/2 min-h-0 flex flex-col">
                     <${ReversingEntryForm} 
                        adjustments=${activityData.adjustments} 
                        data=${data} 
                        onChange=${onChange} 
                        showFeedback=${showFeedback} 
                        isReadOnly=${isReadOnly}
                        activityData=${activityData}
                     />
                </div>
            </div>
        </div>
    `;
}

// Add to bottom of Step10ReversingEntries.js
export const validateStep10 = (data, activityData) => {
    let score = 0;
    let maxScore = 0;
    
    activityData.adjustments.forEach((adj, idx) => {
        const entry = data[adj.id] || {};
        const isFirst = idx === 0;
        const res = validateReversingEntry(entry, adj, activityData.config, isFirst);
        
        maxScore += 1;
        if (res.isEntryCorrect) score += 1;
    });

    return {
        score,
        maxScore,
        isCorrect: score === maxScore,
        letterGrade: getLetterGrade(score, maxScore)
    };
};
