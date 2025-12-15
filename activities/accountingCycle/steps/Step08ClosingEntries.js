// --- Step08ClosingEntries.js ---
import React, { useState, useMemo, useEffect } from 'https://esm.sh/react@18.2.0';
import htm from 'https://esm.sh/htm';
import { Book, Check, X, Table, Trash2, Plus, AlertCircle } from 'https://esm.sh/lucide-react@0.263.1';
import { sortAccounts, getAccountType, getLetterGrade } from '../utils.js';

const html = htm.bind(React.createElement);

// --- HELPER: Status Icon ---
const StatusIcon = ({ isCorrect, show }) => {
    if (!show) return null;
    return isCorrect 
        ? html`<${Check} size=${14} className="text-green-600 inline ml-1" />` 
        : html`<${X} size=${14} className="text-red-600 inline ml-1" />`;
};

// --- COMPONENT: Worksheet Source View (Read-Only) ---
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

// --- COMPONENT: Closing Entry Form (REID) ---
const ClosingEntryForm = ({ entries, onChange, isReadOnly, showFeedback }) => {
    // Default REID Structure
    const defaultStructure = [
        { id: 'closeRev', title: '1. Close Revenue', desc: 'To close the revenue accounts.' },
        { id: 'closeExp', title: '2. Close Expense', desc: 'To close the expense accounts.' },
        { id: 'closeInc', title: '3. Close Income Summary', desc: 'To close the income summary account.' },
        { id: 'closeDrw', title: '4. Close Drawings', desc: 'To close the drawing accounts.' }
    ];

    const currentEntries = entries || defaultStructure.map(s => ({ ...s, rows: [{}, {}] }));

    const updateBlock = (blockIdx, newRows) => {
        const newEntries = [...currentEntries];
        newEntries[blockIdx] = { ...newEntries[blockIdx], rows: newRows };
        onChange(newEntries);
    };

    const handleRowChange = (blockIdx, rowIdx, field, val) => {
        const rows = [...currentEntries[blockIdx].rows];
        if (!rows[rowIdx]) rows[rowIdx] = {};
        rows[rowIdx][field] = val;
        updateBlock(blockIdx, rows);
    };

    const addRow = (blockIdx) => {
        const rows = [...currentEntries[blockIdx].rows, {}];
        updateBlock(blockIdx, rows);
    };

    const removeRow = (blockIdx, rowIdx) => {
        const rows = currentEntries[blockIdx].rows.filter((_, i) => i !== rowIdx);
        updateBlock(blockIdx, rows);
    };

    return html`
        <div className="border rounded bg-white shadow-sm flex flex-col flex-1 min-h-0">
            <div className="bg-blue-100 p-2 font-bold text-blue-900 border-b flex items-center">
                <${Book} size=${16} className="inline mr-2 w-4 h-4"/>
                Journalize Closing Entries (REID)
            </div>
            <div className="overflow-y-auto p-2 flex-1">
                ${currentEntries.map((block, bIdx) => {
                    const rows = block.rows || [{}, {}];
                    return html`
                        <div key=${block.id} className="mb-4 border border-blue-200 rounded overflow-hidden">
                            <div className="bg-blue-50 px-2 py-1 text-xs font-bold text-blue-800 border-b border-blue-200">${block.title}</div>
                            
                            <div className="flex bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-600 text-center">
                                <div className="w-14 border-r p-1">Date</div>
                                <div className="flex-1 border-r p-1">Account Title</div>
                                <div className="w-8 border-r p-1">PR</div>
                                <div className="w-24 border-r p-1">Debit</div>
                                <div className="w-24 p-1">Credit</div>
                                <div className="w-8"></div>
                            </div>

                            ${rows.map((row, rIdx) => html`
                                <div key=${rIdx} className="flex border-b border-gray-100 h-8">
                                    <div className="w-14 border-r relative">
                                        <input type="text" className="w-full h-full p-1 outline-none text-sm text-center" placeholder="Dec 31" value=${rIdx === 0 ? 'Dec 31' : ''} disabled />
                                    </div>
                                    <div className="flex-1 border-r relative">
                                        <input type="text" className="w-full h-full p-1 outline-none text-sm" placeholder="Account Title" value=${row.acc || ''} onChange=${(e) => handleRowChange(bIdx, rIdx, 'acc', e.target.value)} disabled=${isReadOnly}/>
                                    </div>
                                    <div className="w-8 border-r relative">
                                        <input type="checkbox" className="w-full h-full p-1 cursor-pointer" checked=${row.pr || false} onChange=${(e) => handleRowChange(bIdx, rIdx, 'pr', e.target.checked)} disabled=${isReadOnly}/>
                                    </div>
                                    <div className="w-24 border-r relative">
                                        <input type="number" className="w-full h-full p-1 outline-none text-sm text-right" placeholder="Debit" value=${row.dr || ''} onChange=${(e) => handleRowChange(bIdx, rIdx, 'dr', e.target.value)} disabled=${isReadOnly}/>
                                    </div>
                                    <div className="w-24 border-r relative">
                                        <input type="number" className="w-full h-full p-1 outline-none text-sm text-right" placeholder="Credit" value=${row.cr || ''} onChange=${(e) => handleRowChange(bIdx, rIdx, 'cr', e.target.value)} disabled=${isReadOnly}/>
                                    </div>
                                    <div className="w-8 flex justify-center items-center bg-gray-50">
                                        ${!isReadOnly && html`<button onClick=${() => removeRow(bIdx, rIdx)} className="text-gray-400 hover:text-red-500"><${Trash2} size=${12}/></button>`}
                                    </div>
                                </div>
                            `)}

                            <div className="flex bg-gray-50 text-gray-500 italic text-xs border-b border-gray-100">
                                <div className="w-14 border-r"></div>
                                <div className="flex-1 p-1 pl-8">(${block.desc})</div>
                            </div>

                            ${!isReadOnly && html`
                                <div className="bg-gray-50 p-1 text-center">
                                    <button onClick=${() => addRow(bIdx)} className="text-[10px] text-blue-600 hover:underline flex items-center justify-center w-full">
                                        <${Plus} size=${10} className="mr-1"/> Add Row
                                    </button>
                                </div>
                            `}
                        </div>
                    `;
                })}
            </div>
        </div>
    `;
};

// --- COMPONENT: Enhanced Ledger Account ---
const LedgerAccount = ({ accName, transactions, startingBalance, adjustments, userLedger, onUpdate, isReadOnly, showFeedback, correctEndingValues, contextYear, isNewAccount }) => {
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

    // Adjusting Entries (From Step 7 - Treated as History in Step 8)
    if (adjustments) {
        adjustments.forEach(adj => {
            if (adj.drAcc === accName) leftRows.push({ date: 'Dec 31', item: 'Adj', pr: 'J2', amount: adj.amount, isLocked: true });
            if (adj.crAcc === accName) rightRows.push({ date: 'Dec 31', item: 'Adj', pr: 'J2', amount: adj.amount, isLocked: true });
        });
    }

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
            leftRows: [...userLeft, { date: '', item: 'Clos', pr: '', amount: '' }],
            rightRows: [...userRight, { date: '', item: 'Clos', pr: '', amount: '' }]
        });
    };

    const deleteCombinedRow = (visualIdx) => {
         if (visualIdx === 0) return;
         const dataIdx = visualIdx - 1;
         
         const histLenLeft = leftRows.length;
         const histLenRight = rightRows.length;
         
         if (dataIdx < Math.max(histLenLeft, histLenRight)) return;

         const userIdxLeft = dataIdx - histLenLeft;
         const userIdxRight = dataIdx - histLenRight;

         const newLeft = [...userLeft];
         const newRight = [...userRight];

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
            return {
                isYearRow: true,
                date: isNewAccount ? (userLedger.yearInput || '') : contextYear, 
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
                        const isRowDisabled = props.isLocked; 
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

// --- MAIN COMPONENT ---
export default function Step08ClosingEntries({ activityData, data, onChange, showFeedback, isReadOnly, validationResult }) {
    
    // Ensure data structures exist
    const ledgers = data.ledgers || {}; 
    // We expect data.ledgers to be an object map: { 'Cash': { leftRows:[], ... }, ... } for this enhanced component style
    // The previous version might have been an array. We need to handle that if upgrading.
    // For this enhanced version, we'll iterate activityData.validAccounts
    
    const handleJournalChange = (entries) => onChange('journal', entries);
    
    const updateLedgerData = (accName, val) => {
        const newLedgers = { ...ledgers, [accName]: val };
        onChange('ledgers', newLedgers);
    };

    // Calculate Correct Values for Ledger Validation
    const ledgerKey = useMemo(() => {
        const key = {};
        const { ledger, adjustments } = activityData; 
        
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

        activityData.validAccounts.forEach(acc => {
            const type = getAccountType(acc);
            const bal = adjBalances[acc];
            
            // Nominal Accounts -> Should be zero after closing
            if (['Revenue', 'Expense'].includes(type) || acc.includes('Drawing') || acc.includes('Dividends') || acc === 'Income Summary') {
                key[acc] = { endBal: 0, balType: '' }; // Should be zero
            } 
            // Real Accounts (Asset, Liability) -> Remain as Adjusted
            else if (type === 'Asset' || type === 'Liability') {
                 if (bal > 0) key[acc] = { endBal: bal, balType: 'Dr' };
                 else key[acc] = { endBal: Math.abs(bal), balType: 'Cr' };
            }
            // Capital -> Updates. For simplification in Step 8 UI validation, we might just check if it's updated or leave it loose.
            // For now, setting it to 0 effectively hides the check or requires 0 if logic dictates.
            // A smarter way: Real accounts should match adjusted balance (except Capital which changes).
            else if (type === 'Equity') {
                key[acc] = { endBal: 0, balType: '' }; // Placeholder, strict validation happens in grading logic
            }
        });
        return key;
    }, [activityData]);

    const { validAccounts, transactions, beginningBalances, config } = activityData;
    const sortedAccounts = sortAccounts(validAccounts);

    return html`
        <div className="h-full flex flex-col">
            ${(showFeedback || isReadOnly) && validationResult && html`
                <div className="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-2 mb-4 flex justify-between items-center shadow-sm w-full flex-shrink-0">
                    <span className="font-bold flex items-center gap-2"><${AlertCircle} size=${18}/> Validation Results:</span>
                    <span className="font-mono font-bold text-lg">Score: ${validationResult.score || 0} of ${validationResult.maxScore || 0} - (${validationResult.letterGrade || 'IR'})</span>
                </div>
            `}

            <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-180px)]">
                <div className="flex-1 lg:w-5/12 flex flex-col gap-4 min-h-0">
                    <div className="h-1/2 min-h-0 flex flex-col border rounded overflow-hidden shadow-sm">
                         <${WorksheetSourceView} ledgerData=${activityData.ledger} adjustments=${activityData.adjustments} />
                    </div>
                    <div className="h-1/2 min-h-0 flex flex-col">
                        <${ClosingEntryForm} entries=${data.journal} onChange=${handleJournalChange} isReadOnly=${isReadOnly} showFeedback=${showFeedback} />
                    </div>
                </div>
                
                <div className="flex-1 lg:w-7/12 border rounded bg-white h-full flex flex-col shadow-sm">
                    <div className="bg-blue-100 p-2 font-bold text-blue-900 border-b border-blue-200 flex items-center">
                        <${Table} size=${16} className="inline mr-2 w-4 h-4"/> General Ledger (Post-Closing)
                    </div>
                    <div className="p-4 overflow-y-auto custom-scrollbar flex-1 bg-gray-50">
                        <div className="flex flex-col gap-4 pb-4">
                            ${sortedAccounts.map(acc => {
                                // Determine correctness values
                                const correctVals = ledgerKey[acc] || { endBal: 0, balType: '' };
                                const isNew = !validAccounts.includes(acc);

                                return html`
                                    <${LedgerAccount} 
                                        key=${acc} 
                                        accName=${acc} 
                                        transactions=${transactions}
                                        startingBalance=${config.isSubsequentYear && beginningBalances ? beginningBalances.balances[acc] : null}
                                        adjustments=${activityData.adjustments}
                                        userLedger=${ledgers[acc] || {}}
                                        onUpdate=${(val) => updateLedgerData(acc, val)}
                                        isReadOnly=${isReadOnly}
                                        showFeedback=${showFeedback}
                                        correctEndingValues=${correctVals}
                                        contextYear=${validationResult?.year || '20XX'}
                                        isNewAccount=${isNew}
                                    />
                                `;
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}
