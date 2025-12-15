// --- Step07AdjustingEntries.js ---
import React, { useState, useMemo } from 'https://esm.sh/react@18.2.0';
import htm from 'https://esm.sh/htm';
import { Book, Check, X, ChevronDown, ChevronRight, Table, Trash2, Plus, AlertCircle } from 'https://esm.sh/lucide-react@0.263.1';
import { sortAccounts, getLetterGrade, getAccountType } from '../utils.js';

const html = htm.bind(React.createElement);

// --- HELPER: DRY VALIDATION LOGIC ---
export const validateStep07 = (arg1, arg2, arg3, arg4) => {
    // 1. Adapter for arguments to handle different calling signatures from App.js vs Internal
    let activityData, journalData, ledgerData;

    // Check if arg1 is activityData object (contains 'transactions' or 'adjustments' as full array)
    if (arg1 && (arg1.transactions || (arg1.adjustments && !Array.isArray(arg1)))) {
        activityData = arg1;
        journalData = arg2;
        ledgerData = arg3;
    } else {
        // Legacy/App.js signature: (adjustments, journalData, ledgerData, transactions)
        // We construct a fallback activityData
        const transactions = arg4 || [];
        const adjustments = arg1 || [];
        
        // Derive validAccounts for scoring iteration
        const accs = new Set();
        transactions.forEach(t => {
            t.debits.forEach(d => accs.add(d.account));
            t.credits.forEach(c => accs.add(c.account));
        });
        adjustments.forEach(a => {
            accs.add(a.drAcc);
            accs.add(a.crAcc);
        });

        activityData = {
            adjustments,
            transactions,
            beginningBalances: null, // Fallback
            config: {}, // Fallback
            validAccounts: Array.from(accs)
        };
        journalData = arg2;
        ledgerData = arg3;
    }

    const { adjustments, transactions, beginningBalances, config, validAccounts } = activityData;
    
    // 2. Determine Correct Date
    const baseDate = transactions.length > 0 ? new Date(transactions[0].date) : new Date();
    const year = baseDate.getFullYear().toString();
    const month = baseDate.getMonth();
    const lastDayOfMonth = new Date(year, month + 1, 0).getDate().toString();

    let score = 0;
    let maxScore = 0;
    const fieldStatus = {}; 

    // Helper: Check if matching row exists in ledger
    const findMatchingRow = (accName, side, date, amt) => {
        if (!accName || !ledgerData[accName]) return false;
        const rows = side === 'dr' ? (ledgerData[accName].leftRows || []) : (ledgerData[accName].rightRows || []);
        
        return rows.some(r => {
            const rAmt = Number(r.amount);
            const matchAmt = Math.abs(rAmt - amt) <= 1;
            const matchDate = (r.date || '').trim() === date;
            return matchAmt && matchDate;
        });
    };

    // A. Journal & Posting Validation
    adjustments.forEach(adj => {
        const entry = journalData[adj.id] || {};

        // 1. Journal Debit (4 pts)
        const drDateCorrect = (entry.drDate || '').trim() === lastDayOfMonth;
        const drAccCorrect = (entry.drAcc || '').toLowerCase() === adj.drAcc.toLowerCase();
        const drAmtCorrect = Math.abs(Number(entry.drAmt) - adj.amount) <= 1;
        
        const drPostedRowFound = findMatchingRow(adj.drAcc, 'dr', lastDayOfMonth, adj.amount);
        const drPrCorrect = entry.drPR === true && drPostedRowFound;

        if (drDateCorrect) score++;
        if (drAccCorrect) score++;
        if (drAmtCorrect) score++;
        if (drPrCorrect) score++;
        maxScore += 4;

        // 2. Journal Credit (3 pts - No Date)
        const crAccCorrect = (entry.crAcc || '').toLowerCase() === adj.crAcc.toLowerCase();
        const crAmtCorrect = Math.abs(Number(entry.crAmt) - adj.amount) <= 1;
        const crPostedRowFound = findMatchingRow(adj.crAcc, 'cr', lastDayOfMonth, adj.amount);
        const crPrCorrect = entry.crPR === true && crPostedRowFound;

        if (crAccCorrect) score++;
        if (crAmtCorrect) score++;
        if (crPrCorrect) score++;
        maxScore += 3;

        // 3. Ledger Posting Score (Double counting logic as requested)
        if (drPostedRowFound) score += 4;
        maxScore += 4;

        if (crPostedRowFound) score += 3;
        maxScore += 3;
        
        fieldStatus[`${adj.id}-dr-date`] = drDateCorrect;
        fieldStatus[`${adj.id}-dr-acc`] = drAccCorrect;
        fieldStatus[`${adj.id}-dr-amt`] = drAmtCorrect;
        fieldStatus[`${adj.id}-dr-pr`] = drPrCorrect;
        fieldStatus[`${adj.id}-cr-acc`] = crAccCorrect;
        fieldStatus[`${adj.id}-cr-amt`] = crAmtCorrect;
        fieldStatus[`${adj.id}-cr-pr`] = crPrCorrect;
    });

    // Determine New vs Historical Accounts
    const adjAccounts = new Set();
    adjustments.forEach(a => { adjAccounts.add(a.drAcc); adjAccounts.add(a.crAcc); });
    const historicalAccounts = new Set(validAccounts);
    // Accounts in adjustments that are NOT in original transactions/balances are "New"
    // Note: validAccounts usually includes all involved accounts. We check against the original set if possible.
    // If constructed from fallback, this distinction might be weak, but functional.
    const newLedgerAccounts = [...adjAccounts].filter(acc => !historicalAccounts.has(acc));
    
    // B. New Ledger Year Entry (1 pt each)
    // Note: In fallback mode, validAccounts derived from adj includes adj accounts, so newLedgerAccounts might be empty.
    // We rely on 'ledgerData.addedAccounts' list if available or check manually added props.
    // Enhanced check: Check if user added yearInput for any account
    const allRelevantAccounts = new Set([...validAccounts, ...adjAccounts]);
    
    allRelevantAccounts.forEach(acc => {
        const u = ledgerData[acc] || {};
        // If this account has a 'yearInput' field (meaning it was treated as new by UI), validate it
        if (u.yearInput !== undefined) {
             if ((u.yearInput || '').trim() === year) score++;
             maxScore += 1;
        }
    });

    // C. Ledger Totals & Balance (3 pts each)
    allRelevantAccounts.forEach(acc => {
        // Calculate Expected
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
        adjustments.forEach(a => {
            if (a.drAcc === acc) adjDr += a.amount;
            if (a.crAcc === acc) adjCr += a.amount;
        });
        const expTotalDr = bbDr + transDr + adjDr;
        const expTotalCr = bbCr + transCr + adjCr;
        const net = expTotalDr - expTotalCr;
        const expBal = Math.abs(net);
        const expType = net >= 0 ? 'Dr' : 'Cr';

        // Check User Inputs
        const u = ledgerData[acc] || {};
        const uDrTotal = Number(u.drTotal || 0);
        const uCrTotal = Number(u.crTotal || 0);
        const uBal = Number(u.balance || 0);
        const uType = u.balanceType;

        if (Math.abs(uDrTotal - expTotalDr) <= 1) score++;
        if (Math.abs(uCrTotal - expTotalCr) <= 1) score++;
        if (Math.abs(uBal - expBal) <= 1 && (uType === expType || expBal === 0)) score++;
        
        maxScore += 3;
    });

    const letterGrade = getLetterGrade(score, maxScore);

    return { score, maxScore, letterGrade, fieldStatus, lastDayOfMonth, year };
};


const StatusIcon = ({ isCorrect, show }) => {
    if (!show) return null;
    return isCorrect 
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
                    ${expanded ? html`<${ChevronDown} size=${16} className="w-4 h-4"/>` : html`<${ChevronRight} size=${16} className="w-4 h-4"/>`}
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

const AdjustmentEntryForm = ({ adjustments, data, onChange, isReadOnly, showFeedback, validationResult }) => {
    const handleChange = (adjId, field, val) => {
        const current = data[adjId] || {};
        onChange(adjId, { ...current, [field]: val });
    };

    const { fieldStatus, year } = validationResult || {};

    return html`
        <div className="border rounded bg-white shadow-sm flex flex-col flex-1 min-h-0">
            <div className="bg-blue-100 p-2 font-bold text-blue-900 border-b flex items-center">
                <${Book} size=${16} className="inline mr-2 w-4 h-4"/>
                Journalize Adjusting Entries (${year})
            </div>
            <div className="overflow-y-auto p-2 flex-1">
                ${adjustments.map((adj, idx) => {
                    const entry = data[adj.id] || {};
                    
                    const drDateOk = fieldStatus?.[`${adj.id}-dr-date`];
                    const drAccOk = fieldStatus?.[`${adj.id}-dr-acc`];
                    const drAmtOk = fieldStatus?.[`${adj.id}-dr-amt`];
                    const drPrOk = fieldStatus?.[`${adj.id}-dr-pr`];

                    const crAccOk = fieldStatus?.[`${adj.id}-cr-acc`];
                    const crAmtOk = fieldStatus?.[`${adj.id}-cr-amt`];
                    const crPrOk = fieldStatus?.[`${adj.id}-cr-pr`];

                    const inputClass = (isOk) => `w-full h-full p-1 outline-none text-sm ${showFeedback && !isOk ? 'bg-red-50' : ''}`;

                    return html`
                        <div key=${adj.id} className="mb-4 border border-blue-200 rounded overflow-hidden">
                            <div className="bg-blue-50 px-2 py-1 text-xs font-bold text-blue-800 border-b border-blue-200">AJE #${idx + 1}</div>
                            
                            <div className="flex bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-600 text-center">
                                <div className="w-14 border-r p-1">Date</div>
                                <div className="flex-1 border-r p-1">Account Title</div>
                                <div className="w-8 border-r p-1">PR</div>
                                <div className="w-24 border-r p-1">Debit</div>
                                <div className="w-24 p-1">Credit</div>
                            </div>

                            <div className="flex border-b border-gray-100 h-8">
                                <div className="w-14 border-r relative">
                                    <input type="text" className=${inputClass(drDateOk) + " text-center"} placeholder="dd" value=${entry.drDate || ''} onChange=${(e) => handleChange(adj.id, 'drDate', e.target.value)} disabled=${isReadOnly}/>
                                    <div className="absolute top-0 right-0"><${StatusIcon} show=${showFeedback} isCorrect=${drDateOk}/></div>
                                </div>
                                <div className="flex-1 border-r relative">
                                    <input type="text" className=${inputClass(drAccOk)} placeholder="Debit Account" value=${entry.drAcc || ''} onChange=${(e) => handleChange(adj.id, 'drAcc', e.target.value)} disabled=${isReadOnly}/>
                                    <div className="absolute top-1 right-1"><${StatusIcon} show=${showFeedback} isCorrect=${drAccOk}/></div>
                                </div>
                                <div className="w-8 border-r flex justify-center items-center bg-white relative">
                                    <input type="checkbox" className="w-4 h-4 cursor-pointer" checked=${entry.drPR || false} onChange=${(e) => handleChange(adj.id, 'drPR', e.target.checked)} disabled=${isReadOnly}/>
                                    <div className="absolute top-0 right-0 pointer-events-none"><${StatusIcon} show=${showFeedback} isCorrect=${drPrOk}/></div>
                                </div>
                                <div className="w-24 border-r relative">
                                    <input type="number" className=${inputClass(drAmtOk) + " text-right"} placeholder="Debit" value=${entry.drAmt || ''} onChange=${(e) => handleChange(adj.id, 'drAmt', e.target.value)} disabled=${isReadOnly}/>
                                    <div className="absolute top-0 right-0"><${StatusIcon} show=${showFeedback} isCorrect=${drAmtOk}/></div>
                                </div>
                                <div className="w-24 bg-gray-50"></div>
                            </div>

                            <div className="flex border-b border-gray-100 h-8">
                                <div className="w-14 border-r relative bg-gray-50">
                                    <input type="text" className="w-full h-full bg-gray-50 outline-none" disabled value="" />
                                </div>
                                <div className="flex-1 border-r relative pl-6">
                                    <input type="text" className=${inputClass(crAccOk)} placeholder="Credit Account" value=${entry.crAcc || ''} onChange=${(e) => handleChange(adj.id, 'crAcc', e.target.value)} disabled=${isReadOnly}/>
                                    <div className="absolute top-1 right-1"><${StatusIcon} show=${showFeedback} isCorrect=${crAccOk}/></div>
                                </div>
                                <div className="w-8 border-r flex justify-center items-center bg-white relative">
                                    <input type="checkbox" className="w-4 h-4 cursor-pointer" checked=${entry.crPR || false} onChange=${(e) => handleChange(adj.id, 'crPR', e.target.checked)} disabled=${isReadOnly}/>
                                    <div className="absolute top-0 right-0 pointer-events-none"><${StatusIcon} show=${showFeedback} isCorrect=${crPrOk}/></div>
                                </div>
                                <div className="w-24 border-r bg-gray-50"></div>
                                <div className="w-24 relative">
                                    <input type="number" className=${inputClass(crAmtOk) + " text-right"} placeholder="Credit" value=${entry.crAmt || ''} onChange=${(e) => handleChange(adj.id, 'crAmt', e.target.value)} disabled=${isReadOnly}/>
                                    <div className="absolute top-0 right-0"><${StatusIcon} show=${showFeedback} isCorrect=${crAmtOk}/></div>
                                </div>
                            </div>

                            <div className="flex bg-gray-50 text-gray-500 italic text-xs">
                                <div className="w-14 border-r"></div>
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

const LedgerAccountAdj = ({ accName, transactions, startingBalance, userLedger, onUpdate, isReadOnly, showFeedback, correctEndingValues, contextYear, isNewAccount }) => {
    // 1. Prepare Data Rows
    const leftRows = [];
    const rightRows = [];

    // Beg Bal (Only for historical accounts)
    if (startingBalance) {
        if (startingBalance.dr > 0) leftRows.push({ date: 'Jan 01', item: 'Bal', pr: '✓', amount: startingBalance.dr, isLocked: true });
        if (startingBalance.cr > 0) rightRows.push({ date: 'Jan 01', item: 'Bal', pr: '✓', amount: startingBalance.cr, isLocked: true });
    }

    // Historical Transactions
    transactions.forEach(t => {
        const dateObj = new Date(t.date);
        const mm = dateObj.toLocaleString('default', { month: 'short' });
        const dd = dateObj.getDate().toString().padStart(2, '0');
        const dateStr = `${mm} ${dd}`;

        t.debits.forEach(d => { if(d.account === accName) leftRows.push({ date: dateStr, item: 'GJ', pr: '1', amount: d.amount, isLocked: true }); });
        t.credits.forEach(c => { if(c.account === accName) rightRows.push({ date: dateStr, item: 'GJ', pr: '1', amount: c.amount, isLocked: true }); });
    });

    const userLeft = userLedger?.leftRows || [];
    const userRight = userLedger?.rightRows || [];

    const finalLeft = [...leftRows, ...userLeft];
    const finalRight = [...rightRows, ...userRight];
    
    // VISUAL ROWS MAPPING
    const maxDataRows = Math.max(finalLeft.length, finalRight.length, 4);
    const displayRowsCount = maxDataRows + 1; // +1 for Year Row
    const displayRows = Array.from({length: displayRowsCount}).map((_, i) => i);

    const updateSide = (side, visualIdx, field, val) => {
        // Visual Index 0 is Year Row
        if (visualIdx === 0) {
            if (isNewAccount && side === 'left') { // Store year in userLedger root or special field
                onUpdate({ ...userLedger, yearInput: val });
            }
            return;
        }

        const dataIdx = visualIdx - 1; 
        const histLen = side === 'left' ? leftRows.length : rightRows.length;
        if (dataIdx < histLen) return; 

        const userIdx = dataIdx - histLen;
        const currentArr = side === 'left' ? userLeft : userRight;
        const newArr = [...currentArr];
        if (!newArr[userIdx]) newArr[userIdx] = {}; 
        newArr[userIdx] = { ...newArr[userIdx], [field]: val };
        
        onUpdate({ 
            ...userLedger, 
            [side === 'left' ? 'leftRows' : 'rightRows']: newArr 
        });
    };

    const addCombinedRow = () => {
        onUpdate({ 
            ...userLedger, 
            leftRows: [...userLeft, { date: '', item: 'Adj', pr: '', amount: '' }],
            rightRows: [...userRight, { date: '', item: 'Adj', pr: '', amount: '' }]
        });
    };

    const deleteCombinedRow = (visualIdx) => {
         if (visualIdx === 0) return;
         const dataIdx = visualIdx - 1;
         
         const histLenLeft = leftRows.length;
         const histLenRight = rightRows.length;
         
         // Adjusting entries step usually appends to existing. Historical rows are at top.
         // So if dataIdx >= max(histLenLeft, histLenRight), it is safe.
         if (dataIdx < Math.max(histLenLeft, histLenRight)) return;

         const userIdxLeft = dataIdx - histLenLeft;
         const userIdxRight = dataIdx - histLenRight;

         const newLeft = [...userLeft];
         const newRight = [...userRight];

         // Remove if index exists in user array
         if (userIdxLeft >= 0 && userIdxLeft < newLeft.length) newLeft.splice(userIdxLeft, 1);
         if (userIdxRight >= 0 && userIdxRight < newRight.length) newRight.splice(userIdxRight, 1);

         onUpdate({
             ...userLedger,
             leftRows: newLeft,
             rightRows: newRight
         });
    };
    
    const getCellProps = (side, visualIdx) => {
        if (visualIdx === 0) {
            // Year Row
            return {
                isYearRow: true,
                date: isNewAccount ? (userLedger.yearInput || '') : contextYear, // Editable if new
                item: '', pr: '', amount: '',
                isUser: isNewAccount, 
                isLocked: !isNewAccount
            };
        }

        const dataIdx = visualIdx - 1;
        const dataArr = side === 'left' ? finalLeft : finalRight;
        const row = dataArr[dataIdx];
        const isUser = side === 'left' ? dataIdx >= leftRows.length : dataIdx >= rightRows.length;

        if (!row) {
            return { isYearRow: false, date: '', item: '', pr: '', amount: '', isUser: isUser, isLocked: !isUser };
        }

        let displayDate = row.date || '';
        if (visualIdx === 1) {
            // First Data Row: "Mmm dd"
        } else {
            // Subsequent: "dd"
            if (row.isLocked && displayDate.includes(' ')) {
                displayDate = displayDate.split(' ')[1];
            }
        }

        return {
            isYearRow: false,
            date: displayDate,
            item: row.item,
            pr: row.pr,
            amount: row.amount,
            isUser: isUser,
            isLocked: row.isLocked
        };
    };

    return html`
        <div className="border-2 border-gray-800 bg-white shadow-md mb-6">
            <div className="border-b-2 border-gray-800 p-2 flex justify-between bg-gray-100 relative">
                <div className="absolute left-2 top-2"><${StatusIcon} show=${showFeedback} isCorrect=${
                    Math.abs(Number(userLedger?.balance || 0) - correctEndingValues.endBal) <= 1 &&
                    (userLedger?.balanceType === correctEndingValues.balType || correctEndingValues.endBal === 0)
                } /></div>
                <div className="w-full text-center mx-8 font-bold text-lg">${accName}</div>
            </div>
            
            <div className="flex">
                <!-- DEBIT SIDE -->
                <div className="flex-1 border-r-2 border-gray-800">
                    <div className="text-center font-bold border-b border-gray-400 bg-gray-50 text-xs py-1">DEBIT</div>
                    <div className="flex text-xs font-bold border-b border-gray-400">
                        <div className="w-14 border-r p-1 text-center">Date</div>
                        <div className="flex-1 border-r p-1 text-center">Particulars</div>
                        <div className="w-8 border-r p-1 text-center">PR</div>
                        <div className="w-16 p-1 text-center">Amount</div>
                    </div>
                    ${displayRows.map(i => {
                        const props = getCellProps('left', i);
                        const isRowDisabled = props.isLocked; // Year row is editable if isNewAccount
                        const datePlaceholder = i === 0 ? "YYYY" : (i === 1 ? "Mmm dd" : "dd");

                        return html`
                            <div key=${`l-${i}`} className="flex text-xs border-b border-gray-200 h-6 relative ${!props.isUser && !props.isYearRow && props.date ? 'bg-gray-50/50 text-gray-600' : ''}">
                                <div className="w-14 border-r relative"><input type="text" className="w-full h-full text-center px-1 outline-none bg-transparent" placeholder=${datePlaceholder} value=${props.date} onChange=${(e)=>updateSide('left', i, 'date', e.target.value)} disabled=${isRowDisabled}/></div>
                                <div className="flex-1 border-r relative"><input type="text" className="w-full h-full text-left px-1 outline-none bg-transparent" value=${props.item||''} onChange=${(e)=>updateSide('left', i, 'item', e.target.value)} disabled=${props.isYearRow || isRowDisabled}/></div>
                                <div className="w-8 border-r relative"><input type="text" className="w-full h-full text-center outline-none bg-transparent" value=${props.pr||''} onChange=${(e)=>updateSide('left', i, 'pr', e.target.value)} disabled=${props.isYearRow || isRowDisabled}/></div>
                                <div className="w-16 relative"><input type="number" className="w-full h-full text-right px-1 outline-none bg-transparent" value=${props.amount||''} onChange=${(e)=>updateSide('left', i, 'amount', e.target.value)} disabled=${props.isYearRow || isRowDisabled}/></div>
                            </div>
                        `;
                    })}
                    <div className="border-t-2 border-gray-800 p-1 flex justify-between items-center bg-gray-50"><span className="text-xs font-bold">Total Debit</span><input type="number" className="w-20 text-right border border-gray-300 bg-white" value=${userLedger?.drTotal||''} onChange=${(e)=>onUpdate({...userLedger, drTotal: e.target.value})} disabled=${isReadOnly} /></div>
                </div>

                <!-- CREDIT SIDE -->
                <div className="flex-1">
                    <div className="text-center font-bold border-b border-gray-400 bg-gray-50 text-xs py-1">CREDIT</div>
                    <div className="flex text-xs font-bold border-b border-gray-400">
                        <div className="w-14 border-r p-1 text-center">Date</div>
                        <div className="flex-1 border-r p-1 text-center">Particulars</div>
                        <div className="w-8 border-r p-1 text-center">PR</div>
                        <div className="w-16 p-1 text-center">Amount</div>
                        <div className="w-6"></div>
                    </div>
                    ${displayRows.map(i => {
                        const props = getCellProps('right', i);
                        const isRowDisabled = props.isLocked;
                        const datePlaceholder = i === 0 ? "YYYY" : (i === 1 ? "Mmm dd" : "dd");
                        
                        // Check if row is deletable (user row and not year row)
                        const isDeletable = props.isUser && !isReadOnly && !props.isYearRow;

                        return html`
                            <div key=${`r-${i}`} className="flex text-xs border-b border-gray-200 h-6 relative ${!props.isUser && !props.isYearRow && props.date ? 'bg-gray-50/50 text-gray-600' : ''}">
                                <div className="w-14 border-r relative"><input type="text" className="w-full h-full text-center px-1 outline-none bg-transparent" placeholder=${datePlaceholder} value=${props.date} onChange=${(e)=>updateSide('right', i, 'date', e.target.value)} disabled=${isRowDisabled}/></div>
                                <div className="flex-1 border-r relative"><input type="text" className="w-full h-full text-left px-1 outline-none bg-transparent" value=${props.item||''} onChange=${(e)=>updateSide('right', i, 'item', e.target.value)} disabled=${props.isYearRow || isRowDisabled}/></div>
                                <div className="w-8 border-r relative"><input type="text" className="w-full h-full text-center outline-none bg-transparent" value=${props.pr||''} onChange=${(e)=>updateSide('right', i, 'pr', e.target.value)} disabled=${props.isYearRow || isRowDisabled}/></div>
                                <div className="w-16 relative"><input type="number" className="w-full h-full text-right px-1 outline-none bg-transparent" value=${props.amount||''} onChange=${(e)=>updateSide('right', i, 'amount', e.target.value)} disabled=${props.isYearRow || isRowDisabled}/></div>
                                <div className="w-6 flex justify-center items-center">
                                    ${isDeletable && html`<button onClick=${()=>deleteCombinedRow(i)} class="text-red-400 hover:text-red-600"><${Trash2} size=${10}/></button>`}
                                </div>
                            </div>
                        `;
                    })}
                    <div className="border-t-2 border-gray-800 p-1 flex justify-between items-center bg-gray-50"><span className="text-xs font-bold">Total Credit</span><input type="number" className="w-20 text-right border border-gray-300 bg-white" value=${userLedger?.crTotal||''} onChange=${(e)=>onUpdate({...userLedger, crTotal: e.target.value})} disabled=${isReadOnly} /></div>
                </div>
            </div>
            
            ${!isReadOnly && html`<button onClick=${addCombinedRow} className="w-full text-center text-[10px] text-blue-600 hover:bg-blue-50 py-1 border-b border-gray-200 bg-gray-50"><${Plus} size=${10} className="inline"/> Add Row (Dr/Cr)</button>`}

            <div className="border-t border-gray-300 p-2 bg-gray-100 flex justify-center items-center gap-2">
                <span className="text-xs font-bold uppercase text-gray-600">Balance:</span>
                <select className="border border-gray-300 rounded text-xs p-1 outline-none bg-white" value=${userLedger?.balanceType || ''} onChange=${(e)=>onUpdate({...userLedger, balanceType: e.target.value})} disabled=${isReadOnly}><option value="" disabled>Type</option><option value="Dr">Debit</option><option value="Cr">Credit</option></select>
                <input type="number" className="w-32 text-center border-b-2 border-double border-black bg-white font-bold text-sm outline-none" placeholder="0" value=${userLedger?.balance||''} onChange=${(e)=>onUpdate({...userLedger, balance: e.target.value})} disabled=${isReadOnly} />
            </div>
        </div>
    `;
};

const LedgerPanel = ({ activityData, ledgerData, onChange, isReadOnly, showFeedback, validationResult }) => {
    const { validAccounts, transactions, beginningBalances, config } = activityData;
    const sortedAccounts = sortAccounts(validAccounts);
    const { year } = validationResult || {};
    
    const [isAdding, setIsAdding] = useState(false);
    const [newAccName, setNewAccName] = useState('');

    // Ensure addedAccounts is always an array
    const addedAccounts = useMemo(() => {
        return (ledgerData.addedAccounts || []);
    }, [ledgerData.addedAccounts]);

    const handleAddAccount = () => {
        if (!newAccName.trim()) return;
        const name = newAccName.trim();
        if (validAccounts.includes(name) || addedAccounts.includes(name)) {
            alert('Account already exists.');
            return;
        }
        
        const newAdded = [...addedAccounts, name];
        // Initialize with 2 empty rows per side as requested
        const initialLedger = {
            leftRows: [{}, {}], 
            rightRows: [{}, {}]
        };
        
        onChange(name, initialLedger); 
        onChange('addedAccounts', newAdded);
        
        setNewAccName('');
        setIsAdding(false);
    };

    const allAccountsToRender = [...sortedAccounts, ...addedAccounts];

    return html`
        <div className="h-full flex flex-col">
            <div className="bg-blue-100 p-2 font-bold text-blue-900 border-b border-blue-200 flex items-center justify-between">
                <div className="flex items-center"><${Table} size=${16} className="inline mr-2 w-4 h-4"/> General Ledger (Adjusted)</div>
                ${!isReadOnly && html`
                    <button onClick=${() => setIsAdding(true)} className="bg-blue-600 text-white text-xs px-2 py-1 rounded hover:bg-blue-700 flex items-center"><${Plus} size=${12} className="mr-1"/> Add Ledger</button>
                `}
            </div>

            ${isAdding && html`
                <div className="p-2 bg-blue-50 border-b border-blue-200 flex gap-2">
                    <input type="text" className="flex-1 border rounded px-2 py-1 text-sm" placeholder="Enter Account Name" value=${newAccName} onChange=${(e)=>setNewAccName(e.target.value)} />
                    <button onClick=${handleAddAccount} className="bg-green-600 text-white text-xs px-3 py-1 rounded hover:bg-green-700">Add</button>
                    <button onClick=${() => setIsAdding(false)} className="bg-gray-400 text-white text-xs px-3 py-1 rounded hover:bg-gray-500">Cancel</button>
                </div>
            `}

            <div className="overflow-y-auto p-4 flex-1 bg-gray-50 custom-scrollbar">
                ${allAccountsToRender.map(acc => {
                    const isNew = !validAccounts.includes(acc);
                    
                    // Calculate Correct Ending Values
                    let bbDr = 0, bbCr = 0;
                    if (!isNew && config.isSubsequentYear && beginningBalances?.balances[acc]) {
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
                            startingBalance={config.isSubsequentYear && beginningBalances ? beginningBalances.balances[acc] : null}
                            userLedger=${ledgerData[acc] || {}}
                            onUpdate=${(val) => onChange(acc, val)}
                            isReadOnly=${isReadOnly}
                            showFeedback=${showFeedback}
                            correctEndingValues=${correctEndingValues}
                            contextYear=${year}
                            isNewAccount=${isNew}
                        />
                    `;
                })}
            </div>
        </div>
    `;
};


// --- MAIN EXPORT ---

export default function Step07AdjustingEntries({ activityData, data, onChange, showFeedback, isReadOnly }) {
    const journalData = data.journal || {};
    const ledgerData = data.ledger || {};

    const validationResult = useMemo(() => {
        return validateStep07(activityData, journalData, ledgerData);
    }, [activityData, journalData, ledgerData]);

    const handleJournalChange = (id, val) => {
        onChange('journal', { ...journalData, [id]: val });
    };

    const handleLedgerChange = (acc, val) => {
        // If acc is 'addedAccounts', we update that specific key in the ledger object
        onChange('ledger', { ...ledgerData, [acc]: val });
    };

    return html`
        <div className="flex flex-col h-[calc(100vh-140px)]">
            <!-- VALIDATION BANNER -->
            ${(showFeedback || isReadOnly) && validationResult && html`
                <div className="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-2 mb-4 flex justify-between items-center shadow-sm w-full flex-shrink-0">
                    <span className="font-bold flex items-center gap-2"><${AlertCircle} size=${18}/> Validation Results:</span>
                    <span className="font-mono font-bold text-lg">Score: ${validationResult.score || 0} of ${validationResult.maxScore || 0} - (${validationResult.letterGrade || 'IR'})</span>
                </div>
            `}

            <div className="flex flex-col lg:flex-row gap-4 flex-1 min-h-0">
                <div className="flex-1 lg:w-5/12 flex flex-col gap-4 min-h-0">
                    <${HistoricalJournalView} transactions=${activityData.transactions} />
                    <${AdjustmentEntryForm} 
                        adjustments=${activityData.adjustments} 
                        data=${journalData} 
                        onChange=${handleJournalChange} 
                        isReadOnly=${isReadOnly} 
                        showFeedback=${showFeedback}
                        validationResult=${validationResult}
                    />
                </div>
                <div className="flex-1 lg:w-7/12 min-h-0 border rounded bg-white shadow-sm flex flex-col overflow-hidden">
                    <${LedgerPanel} 
                        activityData=${activityData} 
                        ledgerData=${ledgerData} 
                        onChange=${handleLedgerChange} 
                        isReadOnly=${isReadOnly} 
                        showFeedback=${showFeedback}
                        validationResult=${validationResult}
                    />
                </div>
            </div>
        </div>
    `;
}
