// --- Step08ClosingEntries.js ---
import React, { useState, useMemo, useEffect } from 'https://esm.sh/react@18.2.0';
import htm from 'https://esm.sh/htm';
import { Book, Check, X, Table, Trash2, Plus, AlertCircle } from 'https://esm.sh/lucide-react@0.263.1';
import { sortAccounts, getAccountType, getLetterGrade } from '../utils.js';

const html = htm.bind(React.createElement);

// --- HELPER: Status Icon ---
const StatusIcon = ({ isCorrect, show }) => {
    if (!show || isCorrect === undefined) return null;
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
const ClosingEntryForm = ({ entries, onChange, isReadOnly, showFeedback, validationResult }) => {
    const { fieldStatus } = validationResult || {};

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

    // Helper for validation styling
    const getInputClass = (isOk) => 
        `w-full h-full p-1 outline-none text-sm ${showFeedback && isOk === false ? 'bg-red-50' : ''}`;

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

                            ${rows.map((row, rIdx) => {
                                // Validation Keys
                                const baseKey = `journal-${bIdx}-${rIdx}`;
                                const accOk = fieldStatus?.[`${baseKey}-acc`];
                                const drOk = fieldStatus?.[`${baseKey}-dr`];
                                const crOk = fieldStatus?.[`${baseKey}-cr`];
                                const prOk = fieldStatus?.[`${baseKey}-pr`];

                                return html`
                                <div key=${rIdx} className="flex border-b border-gray-100 h-8">
                                    <div className="w-14 border-r relative">
                                        <input type="text" className="w-full h-full p-1 outline-none text-sm text-center" placeholder="Dec 31" value=${rIdx === 0 ? 'Dec 31' : ''} disabled />
                                    </div>
                                    <div className="flex-1 border-r relative">
                                        <input type="text" className=${getInputClass(accOk)} placeholder="Account Title" value=${row.acc || ''} onChange=${(e) => handleRowChange(bIdx, rIdx, 'acc', e.target.value)} disabled=${isReadOnly}/>
                                        <div className="absolute top-1 right-1"><${StatusIcon} show=${showFeedback} isCorrect=${accOk}/></div>
                                    </div>
                                    <div className="w-8 border-r relative flex items-center justify-center">
                                        <input type="checkbox" className="w-4 h-4 cursor-pointer" checked=${row.pr || false} onChange=${(e) => handleRowChange(bIdx, rIdx, 'pr', e.target.checked)} disabled=${isReadOnly}/>
                                        <div className="absolute top-0 right-0 pointer-events-none"><${StatusIcon} show=${showFeedback} isCorrect=${prOk}/></div>
                                    </div>
                                    <div className="w-24 border-r relative">
                                        <input type="number" className=${getInputClass(drOk) + " text-right"} placeholder="Debit" value=${row.dr || ''} onChange=${(e) => handleRowChange(bIdx, rIdx, 'dr', e.target.value)} disabled=${isReadOnly}/>
                                        <div className="absolute top-0 right-0"><${StatusIcon} show=${showFeedback} isCorrect=${drOk}/></div>
                                    </div>
                                    <div className="w-24 border-r relative">
                                        <input type="number" className=${getInputClass(crOk) + " text-right"} placeholder="Credit" value=${row.cr || ''} onChange=${(e) => handleRowChange(bIdx, rIdx, 'cr', e.target.value)} disabled=${isReadOnly}/>
                                        <div className="absolute top-0 right-0"><${StatusIcon} show=${showFeedback} isCorrect=${crOk}/></div>
                                    </div>
                                    <div className="w-8 flex justify-center items-center bg-gray-50">
                                        ${!isReadOnly && html`<button onClick=${() => removeRow(bIdx, rIdx)} className="text-gray-400 hover:text-red-500"><${Trash2} size=${12}/></button>`}
                                    </div>
                                </div>
                            `})}

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
const LedgerAccount = ({ accName, transactions, startingBalance, adjustments, userLedger, onUpdate, isReadOnly, showFeedback, validationResult, contextYear, isNewAccount }) => {
    // Validation
    const { fieldStatus } = validationResult || {};
    const ledgerKeyBase = `ledger-${accName}`;
    const overallOk = fieldStatus?.[`${ledgerKeyBase}-overall`];
    const drTotalOk = fieldStatus?.[`${ledgerKeyBase}-drTotal`];
    const crTotalOk = fieldStatus?.[`${ledgerKeyBase}-crTotal`];
    const balAmtOk = fieldStatus?.[`${ledgerKeyBase}-bal`];
    const balTypeOk = fieldStatus?.[`${ledgerKeyBase}-balType`];

    // 1. Prepare Data Rows
    const leftRows = [];
    const rightRows = [];

    // Beg Bal
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

    // Adjusting Entries
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
                <div className="absolute left-2 top-2"><${StatusIcon} show=${showFeedback} isCorrect=${overallOk} /></div>
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
                    <div className="border-t-2 border-gray-800 p-1 flex justify-between items-center bg-gray-50 relative">
                        <span className="text-xs font-bold">Total Debit</span>
                        <input type="number" className=${`w-20 text-right border border-gray-300 bg-white ${showFeedback && drTotalOk === false ? 'bg-red-50' : ''}`} value=${userLedger?.drTotal||''} onChange=${(e)=>onUpdate({...userLedger, drTotal: e.target.value})} disabled=${isReadOnly} />
                        <div className="absolute right-0 top-1"><${StatusIcon} show=${showFeedback} isCorrect=${drTotalOk}/></div>
                    </div>
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
                    <div className="border-t-2 border-gray-800 p-1 flex justify-between items-center bg-gray-50 relative">
                        <span className="text-xs font-bold">Total Credit</span>
                        <input type="number" className=${`w-20 text-right border border-gray-300 bg-white ${showFeedback && crTotalOk === false ? 'bg-red-50' : ''}`} value=${userLedger?.crTotal||''} onChange=${(e)=>onUpdate({...userLedger, crTotal: e.target.value})} disabled=${isReadOnly} />
                        <div className="absolute right-0 top-1"><${StatusIcon} show=${showFeedback} isCorrect=${crTotalOk}/></div>
                    </div>
                </div>
            </div>
            
            ${!isReadOnly && html`<button onClick=${addCombinedRow} className="w-full text-center text-[10px] text-blue-600 hover:bg-blue-50 py-1 border-b border-gray-200 bg-gray-50"><${Plus} size=${10} className="inline"/> Add Row (Dr/Cr)</button>`}

            <div className="border-t border-gray-300 p-2 bg-gray-100 flex justify-center items-center gap-2 relative">
                <span className="text-xs font-bold uppercase text-gray-600">Balance:</span>
                <div className="relative">
                    <select className=${`border border-gray-300 rounded text-xs p-1 outline-none bg-white ${showFeedback && balTypeOk === false ? 'bg-red-50' : ''}`} value=${userLedger?.balanceType || ''} onChange=${(e)=>onUpdate({...userLedger, balanceType: e.target.value})} disabled=${isReadOnly}><option value="" disabled>Type</option><option value="Dr">Debit</option><option value="Cr">Credit</option></select>
                </div>
                <div className="relative">
                    <input type="number" className=${`w-32 text-center border-b-2 border-double border-black bg-white font-bold text-sm outline-none ${showFeedback && balAmtOk === false ? 'bg-red-50' : ''}`} placeholder="0" value=${userLedger?.balance||''} onChange=${(e)=>onUpdate({...userLedger, balance: e.target.value})} disabled=${isReadOnly} />
                    <div className="absolute -right-5 top-1"><${StatusIcon} show=${showFeedback} isCorrect=${balAmtOk}/></div>
                </div>
            </div>
        </div>
    `;
};

// --- MAIN COMPONENT ---
export default function Step08ClosingEntries({ activityData, data, onChange, showFeedback, isReadOnly, validationResult }) {
    
    // Ensure data structures exist
    const ledgers = data.ledgers || {}; 
    const handleJournalChange = (entries) => onChange('journal', entries);
    
    const updateLedgerData = (accName, val) => {
        const newLedgers = { ...ledgers, [accName]: val };
        onChange('ledgers', newLedgers);
    };

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
                        <${ClosingEntryForm} entries=${data.journal} onChange=${handleJournalChange} isReadOnly=${isReadOnly} showFeedback=${showFeedback} validationResult=${validationResult} />
                    </div>
                </div>
                
                <div className="flex-1 lg:w-7/12 border rounded bg-white h-full flex flex-col shadow-sm">
                    <div className="bg-blue-100 p-2 font-bold text-blue-900 border-b border-blue-200 flex items-center">
                        <${Table} size=${16} className="inline mr-2 w-4 h-4"/> General Ledger (Post-Closing)
                    </div>
                    <div className="p-4 overflow-y-auto custom-scrollbar flex-1 bg-gray-50">
                        <div className="flex flex-col gap-4 pb-4">
                            ${sortedAccounts.map(acc => {
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
                                        validationResult=${validationResult}
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

// --- VALIDATION HELPER ---
export const validateStep08 = (data, activityData) => {
    const { validAccounts, ledger, adjustments } = activityData;
    const userJournal = data.journal || [];
    const userLedgers = data.ledgers || {};

    let score = 0;
    let maxScore = 0;
    const fieldStatus = {};

    // 1. Calculate Correct Closing Amounts
    let totalRev = 0, totalExp = 0, drawingAmt = 0;
    const revAccounts = [];
    const expAccounts = [];
    let drawingAccName = '';
    let capitalAccName = '';

    validAccounts.forEach(acc => {
        const type = getAccountType(acc);
        const rawDr = ledger[acc]?.debit || 0;
        const rawCr = ledger[acc]?.credit || 0;
        let adjDr = 0, adjCr = 0;
        adjustments.forEach(a => { if (a.drAcc === acc) adjDr += a.amount; if (a.crAcc === acc) adjCr += a.amount; });
        
        const net = (rawDr + adjDr) - (rawCr + adjCr); // +Dr, -Cr

        if (type === 'Revenue') {
            totalRev += Math.abs(net); // Normal Balance Cr
            revAccounts.push({ acc, amt: Math.abs(net) });
        } else if (type === 'Expense') {
            totalExp += Math.abs(net); // Normal Balance Dr
            expAccounts.push({ acc, amt: Math.abs(net) });
        } else if (acc.includes('Drawing') || acc.includes('Dividends')) {
            drawingAmt = Math.abs(net);
            drawingAccName = acc;
        } else if (acc.includes('Capital') || acc.includes('Retained Earnings')) {
            capitalAccName = acc;
        }
    });

    const netIncome = totalRev - totalExp;

    // 2. Validate Journal Entries (REID)
    // Structure: 0=Rev, 1=Exp, 2=IncSum, 3=Draw

    // --- Block 0: Close Revenues ---
    // Dr Revenue Accounts, Cr Income Summary
    const b0 = userJournal[0]?.rows || [];
    const expectedB0 = [
        ...revAccounts.map(r => ({ acc: r.acc, dr: r.amt, cr: 0 })),
        { acc: 'Income Summary', dr: 0, cr: totalRev }
    ];
    // Simple validation: Check if user rows match expected set (ignoring order for revs)
    b0.forEach((row, rIdx) => {
        const keyBase = `journal-0-${rIdx}`;
        // Find match in expected
        const match = expectedB0.find(e => e.acc === row.acc);
        
        const accOk = !!match;
        const drOk = accOk && Math.abs((Number(row.dr)||0) - match.dr) < 1;
        const crOk = accOk && Math.abs((Number(row.cr)||0) - match.cr) < 1;
        
        fieldStatus[`${keyBase}-acc`] = accOk;
        fieldStatus[`${keyBase}-dr`] = drOk;
        fieldStatus[`${keyBase}-cr`] = crOk;
        fieldStatus[`${keyBase}-pr`] = row.pr === true; // Simplified PR check

        if (accOk && drOk && crOk) score++;
        maxScore++;
    });

    // --- Block 1: Close Expenses ---
    // Dr Income Summary, Cr Expenses
    const b1 = userJournal[1]?.rows || [];
    const expectedB1 = [
        { acc: 'Income Summary', dr: totalExp, cr: 0 },
        ...expAccounts.map(e => ({ acc: e.acc, dr: 0, cr: e.amt }))
    ];
    b1.forEach((row, rIdx) => {
        const keyBase = `journal-1-${rIdx}`;
        const match = expectedB1.find(e => e.acc === row.acc);
        
        const accOk = !!match;
        const drOk = accOk && Math.abs((Number(row.dr)||0) - match.dr) < 1;
        const crOk = accOk && Math.abs((Number(row.cr)||0) - match.cr) < 1;
        
        fieldStatus[`${keyBase}-acc`] = accOk;
        fieldStatus[`${keyBase}-dr`] = drOk;
        fieldStatus[`${keyBase}-cr`] = crOk;
        fieldStatus[`${keyBase}-pr`] = row.pr === true;

        if (accOk && drOk && crOk) score++;
        maxScore++;
    });

    // --- Block 2: Close Income Summary (Net Income) ---
    // Dr Income Summary, Cr Capital (if NI)
    const b2 = userJournal[2]?.rows || [];
    const expectedB2 = netIncome >= 0 
        ? [ { acc: 'Income Summary', dr: netIncome, cr: 0 }, { acc: capitalAccName, dr: 0, cr: netIncome } ]
        : [ { acc: capitalAccName, dr: Math.abs(netIncome), cr: 0 }, { acc: 'Income Summary', dr: 0, cr: Math.abs(netIncome) } ];
    
    b2.forEach((row, rIdx) => {
        const keyBase = `journal-2-${rIdx}`;
        const match = expectedB2.find(e => e.acc === row.acc);
        const accOk = !!match;
        const drOk = accOk && Math.abs((Number(row.dr)||0) - match.dr) < 1;
        const crOk = accOk && Math.abs((Number(row.cr)||0) - match.cr) < 1;
        fieldStatus[`${keyBase}-acc`] = accOk;
        fieldStatus[`${keyBase}-dr`] = drOk;
        fieldStatus[`${keyBase}-cr`] = crOk;
        fieldStatus[`${keyBase}-pr`] = row.pr === true;
        if (accOk && drOk && crOk) score++;
        maxScore++;
    });

    // --- Block 3: Close Drawings ---
    // Dr Capital, Cr Drawing
    const b3 = userJournal[3]?.rows || [];
    const expectedB3 = [
        { acc: capitalAccName, dr: drawingAmt, cr: 0 },
        { acc: drawingAccName, dr: 0, cr: drawingAmt }
    ];
    b3.forEach((row, rIdx) => {
        const keyBase = `journal-3-${rIdx}`;
        const match = expectedB3.find(e => e.acc === row.acc);
        const accOk = !!match;
        const drOk = accOk && Math.abs((Number(row.dr)||0) - match.dr) < 1;
        const crOk = accOk && Math.abs((Number(row.cr)||0) - match.cr) < 1;
        fieldStatus[`${keyBase}-acc`] = accOk;
        fieldStatus[`${keyBase}-dr`] = drOk;
        fieldStatus[`${keyBase}-cr`] = crOk;
        fieldStatus[`${keyBase}-pr`] = row.pr === true;
        if (accOk && drOk && crOk) score++;
        maxScore++;
    });

    // 3. Validate Ledger Post-Closing Balances
    // Calculate Post-Closing Values
    const postClosingVals = {};
    validAccounts.forEach(acc => {
        const type = getAccountType(acc);
        let rawDr = ledger[acc]?.debit || 0;
        let rawCr = ledger[acc]?.credit || 0;
        adjustments.forEach(a => { if (a.drAcc === acc) rawDr += a.amount; if (a.crAcc === acc) rawCr += a.amount; });
        let net = rawDr - rawCr;

        // Apply Closing Effects
        if (type === 'Revenue') net -= net; // Should be 0
        else if (type === 'Expense') net += Math.abs(net); // Should be 0 (dr + cr to close) -> actually net becomes 0.
        // Simplification:
        if (['Revenue', 'Expense'].includes(type) || acc === drawingAccName || acc === 'Income Summary') {
            postClosingVals[acc] = 0;
        } else if (acc === capitalAccName) {
            // Capital = Old + NI - Drawings
            // Original Net (Credit is negative in logic? No, let's keep Dr +, Cr -)
            // Capital is Credit normal (-).
            // Net Income adds to Credit (more negative).
            // Drawings reduces Credit (positive Dr).
            // Let's rely on absolute checks for this validator to be safe.
            // Expected Capital = Adjusted Capital + Net Income - Drawings
            // We'll calculate the final Number directly.
            let capBal = (ledger[acc]?.credit || 0) - (ledger[acc]?.debit || 0); // Cr Balance
            capBal += netIncome;
            capBal -= drawingAmt;
            postClosingVals[acc] = capBal; // Expected Credit Balance
        } else {
            // Assets / Liabilities remain adjusted
            postClosingVals[acc] = Math.abs(net);
        }
    });

    validAccounts.forEach(acc => {
        const userL = userLedgers[acc] || {};
        const keyBase = `ledger-${acc}`;
        
        // 1. Calculate user totals from their rows
        const uLeft = userL.leftRows || [];
        const uRight = userL.rightRows || [];
        // We trust the totals entered in the input boxes for validation grading usually, 
        // or we sum the rows. Step 8 usually requires user to input totals.
        const uDrTotal = Number(userL.drTotal) || 0;
        const uCrTotal = Number(userL.crTotal) || 0;
        
        // Expected Totals? This is hard because Closing entries add lines.
        // Instead, we validate the FINAL BALANCE match.
        
        const expectedBal = postClosingVals[acc];
        const userBal = Number(userL.balance) || 0;
        const userType = userL.balanceType;

        const isZero = Math.abs(expectedBal) < 1;
        const matchesAmt = Math.abs(userBal - Math.abs(expectedBal)) < 1;
        
        // Determine Expected Type
        let expectedType = '';
        if (!isZero) {
            const type = getAccountType(acc);
            if (acc === capitalAccName) expectedType = 'Cr'; // Capital usually Cr
            else if (type === 'Asset') expectedType = 'Dr';
            else if (type === 'Liability') expectedType = 'Cr';
        }

        const matchesType = isZero ? true : (userType === expectedType);

        fieldStatus[`${keyBase}-bal`] = matchesAmt;
        fieldStatus[`${keyBase}-balType`] = matchesType;
        fieldStatus[`${keyBase}-overall`] = matchesAmt && matchesType;
        
        // Dummy checks for totals to prevent undefined errors in UI, 
        // or implement logic if we want to enforce summing.
        fieldStatus[`${keyBase}-drTotal`] = true; 
        fieldStatus[`${keyBase}-crTotal`] = true;

        if (matchesAmt && matchesType) score += 2;
        maxScore += 2;
    });

    return {
        score,
        maxScore,
        letterGrade: getLetterGrade(score, maxScore),
        fieldStatus,
        year: '20XX' // Placeholder
    };
};
