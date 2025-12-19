import React, { useState, useMemo, useEffect } from 'https://esm.sh/react@18.2.0';
import htm from 'https://esm.sh/htm';
import { Book, Check, X, Table, Trash2, Plus, AlertCircle } from 'https://esm.sh/lucide-react@0.263.1';
import { sortAccounts, getAccountType, getLetterGrade } from '../utils.js';

const html = htm.bind(React.createElement);

// --- HELPER: Status Icon ---
const StatusIcon = ({ isCorrect, show }) => {
    if (!show || isCorrect === undefined) return null;
    return isCorrect 
        ? html`<${Check} size=${14} className="text-green-600 inline ml-1 flex-shrink-0" />` 
        : html`<${X} size=${14} className="text-red-600 inline ml-1 flex-shrink-0" />`;
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

        if (field === 'dr' && val > 0) {
            const hasPriorCredit = rows.some((r, idx) => idx < rowIdx && (Number(r.cr) || 0) > 0);
            if (hasPriorCredit) {
                alert("Please enter all Debit entries first before entering any Credit entries.");
                return;
            }
            if (rows[rowIdx].acc && rows[rowIdx].acc.startsWith("    ")) {
                rows[rowIdx].acc = rows[rowIdx].acc.trim();
            }
        }

        if (field === 'cr' && val > 0) {
            const currentAcc = rows[rowIdx].acc || '';
            if (!currentAcc.startsWith("    ")) {
                rows[rowIdx].acc = "    " + currentAcc;
            }
        }

        if (field === 'date' && rowIdx !== 0) return;

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
                                <div className="w-14 border-r p-1 text-right pr-2">Date</div>
                                <div className="flex-1 border-r p-1">Account Title</div>
                                <div className="w-8 border-r p-1">PR</div>
                                <div className="w-24 border-r p-1 text-right pr-2">Debit</div>
                                <div className="w-24 p-1 text-right pr-2">Credit</div>
                                <div className="w-8"></div>
                            </div>

                            ${rows.map((row, rIdx) => {
                                const baseKey = `journal-${bIdx}-${rIdx}`;
                                const accOk = fieldStatus?.[`${baseKey}-acc`];
                                const drOk = fieldStatus?.[`${baseKey}-dr`];
                                const crOk = fieldStatus?.[`${baseKey}-cr`];
                                const prOk = fieldStatus?.[`${baseKey}-pr`];
                                const dateOk = fieldStatus?.[`${baseKey}-date`]; 

                                return html`
                                <div key=${rIdx} className="flex border-b border-gray-100 h-8">
                                    <div className="w-14 border-r relative">
                                        ${rIdx === 0 
                                            ? html`
                                                <input type="text" className=${getInputClass(dateOk) + " text-right"} placeholder="dd" value=${row.date || ''} onChange=${(e) => handleRowChange(bIdx, rIdx, 'date', e.target.value)} disabled=${isReadOnly}/>
                                                <div className="absolute top-0 left-0 pointer-events-none"><${StatusIcon} show=${showFeedback} isCorrect=${dateOk}/></div>
                                                `
                                            : html`<div className="w-full h-full bg-gray-50"></div>`
                                        }
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
                                        <div className="absolute top-0 left-0"><${StatusIcon} show=${showFeedback} isCorrect=${drOk}/></div>
                                    </div>
                                    <div className="w-24 border-r relative">
                                        <input type="number" className=${getInputClass(crOk) + " text-right"} placeholder="Credit" value=${row.cr || ''} onChange=${(e) => handleRowChange(bIdx, rIdx, 'cr', e.target.value)} disabled=${isReadOnly}/>
                                        <div className="absolute top-0 left-0"><${StatusIcon} show=${showFeedback} isCorrect=${crOk}/></div>
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
const LedgerAccount = ({ accName, transactions, startingBalance, adjustments, userLedger, onUpdate, isReadOnly, showFeedback, validationResult, contextYear }) => {
    const { fieldStatus, ledgerRowFeedback } = validationResult || {};
    const ledgerKeyBase = `ledger-${accName}`;
    
    // Header Validations
    const overallOk = fieldStatus?.[`${ledgerKeyBase}-overall`];
    const drTotalOk = fieldStatus?.[`${ledgerKeyBase}-drTotal`];
    const crTotalOk = fieldStatus?.[`${ledgerKeyBase}-crTotal`];
    const balAmtOk = fieldStatus?.[`${ledgerKeyBase}-bal`];
    const balTypeOk = fieldStatus?.[`${ledgerKeyBase}-balType`];

    // Row Validations
    const rowFeedback = ledgerRowFeedback?.[accName] || { left: [], right: [] };

    // 1. Prepare Data Rows (Historical)
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

    // Adjusting Entries (Read-Only here)
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
            // Year Input is handled independently for left/right
            const key = side === 'left' ? 'yearInputLeft' : 'yearInputRight';
            onUpdate({ ...userLedger, [key]: val });
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
        const histLen = side === 'left' ? leftRows.length : rightRows.length;
        const hasHistory = histLen > 0;

        if (visualIdx === 0) {
            // Year Row
            const userYearInput = side === 'left' ? userLedger.yearInputLeft : userLedger.yearInputRight;
            // Inputtable ONLY if no history on this side
            const isLocked = hasHistory;
            const val = isLocked ? contextYear : (userYearInput || '');
            
            // Check for year feedback
            let fb = null;
            if (!isLocked && showFeedback) {
                // If expected entries exist, this year input is required.
                const sideFbArr = side === 'left' ? rowFeedback.left : rowFeedback.right;
                // If there are valid user entries, we expect a year.
                // Or simply check ledgerRowFeedback for a year flag? 
                // Let's rely on `rowFeedback.year` which we will set in validation.
                const sideFeedbackObj = rowFeedback[`${side}Year`];
                if (sideFeedbackObj !== undefined) {
                    fb = sideFeedbackObj;
                }
            }

            return {
                isYearRow: true,
                date: val, 
                item: '', pr: '', amount: '',
                isUser: !isLocked, 
                isLocked: isLocked,
                feedback: fb
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
        let datePlaceholder = "dd";

        if (hasHistory) {
            // If history exists, row 1 is history, formatted "Mmm dd"
            // User rows are later, formatted "dd"
            if (visualIdx === 1) {
                // Keep existing display date (likely "Jan 01" or similar)
            } else {
                if (row.isLocked && displayDate.includes(' ')) {
                    displayDate = displayDate.split(' ')[1];
                }
            }
        } else {
            // If NO history, the first user row (visualIdx 1) must be "Mmm dd"
            if (visualIdx === 1) datePlaceholder = "Mmm dd";
        }

        // Get Row Feedback
        let feedback = null;
        if (isUser && showFeedback) {
            const userIdx = dataIdx - histLen;
            const sideArr = side === 'left' ? rowFeedback.left : rowFeedback.right;
            feedback = sideArr[userIdx];
        }

        return {
            isYearRow: false,
            date: displayDate,
            datePlaceholder,
            item: row.item,
            pr: row.pr,
            amount: row.amount,
            isUser: isUser,
            isLocked: row.isLocked,
            feedback
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
                        const fb = props.feedback || {};
                        const showRowFeedback = showFeedback && (props.isUser || (props.isYearRow && props.isUser));

                        // Year Row Logic
                        if (props.isYearRow) {
                            return html`
                                <div key=${`l-${i}`} className="flex text-xs border-b border-gray-200 h-6 relative bg-gray-50">
                                    <div className="w-14 border-r relative">
                                        <input type="text" className=${`w-full h-full text-center px-1 outline-none bg-transparent font-bold`} placeholder="YYYY" value=${props.date} onChange=${(e)=>updateSide('left', i, 'date', e.target.value)} disabled=${isRowDisabled}/>
                                        ${showRowFeedback && props.feedback !== null && html`<div className="absolute top-0 left-0"><${StatusIcon} show=${true} isCorrect=${props.feedback}/></div>`}
                                    </div>
                                    <div className="flex-1 border-r"></div><div className="w-8 border-r"></div><div className="w-16"></div>
                                </div>
                            `;
                        }

                        return html`
                            <div key=${`l-${i}`} className="flex text-xs border-b border-gray-200 h-6 relative ${!props.isUser && !props.isYearRow && props.date ? 'bg-gray-50/50 text-gray-600' : ''}">
                                <div className="w-14 border-r relative">
                                    <input type="text" className=${`w-full h-full text-right px-1 outline-none bg-transparent`} placeholder=${props.datePlaceholder} value=${props.date} onChange=${(e)=>updateSide('left', i, 'date', e.target.value)} disabled=${isRowDisabled}/>
                                    ${showRowFeedback && html`<div className="absolute top-0 left-0"><${StatusIcon} show=${true} isCorrect=${fb.date}/></div>`}
                                </div>
                                <div className="flex-1 border-r relative">
                                    <input type="text" className="w-full h-full text-left px-1 outline-none bg-transparent" value=${props.item||''} onChange=${(e)=>updateSide('left', i, 'item', e.target.value)} disabled=${isRowDisabled}/>
                                    ${showRowFeedback && html`<div className="absolute top-0 right-0"><${StatusIcon} show=${true} isCorrect=${fb.item}/></div>`}
                                </div>
                                <div className="w-8 border-r relative">
                                    <input type="text" className="w-full h-full text-center outline-none bg-transparent" value=${props.pr||''} onChange=${(e)=>updateSide('left', i, 'pr', e.target.value)} disabled=${isRowDisabled}/>
                                    ${showRowFeedback && html`<div className="absolute top-0 right-0 pointer-events-none"><${StatusIcon} show=${true} isCorrect=${fb.pr}/></div>`}
                                </div>
                                <div className="w-16 relative">
                                    <input type="number" className="w-full h-full text-right px-1 outline-none bg-transparent" value=${props.amount||''} onChange=${(e)=>updateSide('left', i, 'amount', e.target.value)} disabled=${isRowDisabled}/>
                                    ${showRowFeedback && html`<div className="absolute top-0 left-0"><${StatusIcon} show=${true} isCorrect=${fb.amount}/></div>`}
                                </div>
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
                        const fb = props.feedback || {};
                        const showRowFeedback = showFeedback && (props.isUser || (props.isYearRow && props.isUser));

                        if (props.isYearRow) {
                            return html`
                                <div key=${`r-${i}`} className="flex text-xs border-b border-gray-200 h-6 relative bg-gray-50">
                                    <div className="w-14 border-r relative">
                                        <input type="text" className=${`w-full h-full text-center px-1 outline-none bg-transparent font-bold`} placeholder="YYYY" value=${props.date} onChange=${(e)=>updateSide('right', i, 'date', e.target.value)} disabled=${isRowDisabled}/>
                                        ${showRowFeedback && props.feedback !== null && html`<div className="absolute top-0 left-0"><${StatusIcon} show=${true} isCorrect=${props.feedback}/></div>`}
                                    </div>
                                    <div className="flex-1 border-r"></div><div className="w-8 border-r"></div><div className="w-16"></div><div className="w-6"></div>
                                </div>
                            `;
                        }

                        return html`
                            <div key=${`r-${i}`} className="flex text-xs border-b border-gray-200 h-6 relative ${!props.isUser && !props.isYearRow && props.date ? 'bg-gray-50/50 text-gray-600' : ''}">
                                <div className="w-14 border-r relative">
                                    <input type="text" className=${`w-full h-full text-right px-1 outline-none bg-transparent ${props.isYearRow ? 'font-bold text-center' : ''}`} placeholder=${props.datePlaceholder} value=${props.date} onChange=${(e)=>updateSide('right', i, 'date', e.target.value)} disabled=${isRowDisabled}/>
                                    ${showRowFeedback && html`<div className="absolute top-0 left-0"><${StatusIcon} show=${true} isCorrect=${fb.date}/></div>`}
                                </div>
                                <div className="flex-1 border-r relative">
                                    <input type="text" className="w-full h-full text-left px-1 outline-none bg-transparent" value=${props.item||''} onChange=${(e)=>updateSide('right', i, 'item', e.target.value)} disabled=${isRowDisabled}/>
                                    ${showRowFeedback && html`<div className="absolute top-0 right-0"><${StatusIcon} show=${true} isCorrect=${fb.item}/></div>`}
                                </div>
                                <div className="w-8 border-r relative">
                                    <input type="text" className="w-full h-full text-center outline-none bg-transparent" value=${props.pr||''} onChange=${(e)=>updateSide('right', i, 'pr', e.target.value)} disabled=${isRowDisabled}/>
                                    ${showRowFeedback && html`<div className="absolute top-0 right-0 pointer-events-none"><${StatusIcon} show=${true} isCorrect=${fb.pr}/></div>`}
                                </div>
                                <div className="w-16 relative">
                                    <input type="number" className="w-full h-full text-right px-1 outline-none bg-transparent" value=${props.amount||''} onChange=${(e)=>updateSide('right', i, 'amount', e.target.value)} disabled=${isRowDisabled}/>
                                    ${showRowFeedback && html`<div className="absolute top-0 left-0"><${StatusIcon} show=${true} isCorrect=${fb.amount}/></div>`}
                                </div>
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
export default function Step08ClosingEntries({ activityData, data, onChange, showFeedback, isReadOnly }) {
    
    // Internal Validation Calculation (DRY)
    const validationResult = useMemo(() => {
        return validateStep08(data, activityData);
    }, [data, activityData]);

    // Ensure data structures exist
    const ledgers = data.ledgers || {}; 
    
    // Define Handlers BEFORE use
    const handleJournalChange = (entries) => onChange('journal', entries);
    
    const updateLedgerData = (accName, val) => {
        const newLedgers = { ...ledgers, [accName]: val };
        onChange('ledgers', newLedgers);
    };

    const { validAccounts, transactions, beginningBalances, config } = activityData;
    const sortedAccounts = sortAccounts(validAccounts);

    const contextYear = useMemo(() => {
        if (transactions && transactions.length > 0) {
            return new Date(transactions[0].date).getFullYear();
        }
        return new Date().getFullYear();
    }, [transactions]);

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
                                        startingBalance={config.isSubsequentYear && beginningBalances ? beginningBalances.balances[acc] : null}
                                        adjustments=${activityData.adjustments}
                                        userLedger=${ledgers[acc] || {}}
                                        onUpdate=${(val) => updateLedgerData(acc, val)}
                                        isReadOnly=${isReadOnly}
                                        showFeedback=${showFeedback}
                                        validationResult=${validationResult}
                                        contextYear=${contextYear}
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
    const { validAccounts, ledger, adjustments, transactions } = activityData;
    const userJournal = data.journal || [];
    const userLedgers = data.ledgers || {};

    let expectedDate = '31';
    let contextYear = new Date().getFullYear();
    if (transactions && transactions.length > 0) {
        const d = new Date(transactions[transactions.length - 1].date);
        const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
        expectedDate = lastDay.toString();
        contextYear = d.getFullYear();
    }

    let score = 0;
    let maxScore = 0;
    const fieldStatus = {};
    const ledgerRowFeedback = {};

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
        
        const net = (rawDr + adjDr) - (rawCr + adjCr);

        if (type === 'Revenue') {
            totalRev += Math.abs(net); 
            revAccounts.push({ acc, amt: Math.abs(net) });
        } else if (type === 'Expense') {
            totalExp += Math.abs(net); 
            expAccounts.push({ acc, amt: Math.abs(net) });
        } else if (acc.includes('Drawing') || acc.includes('Dividends')) {
            drawingAmt = Math.abs(net);
            drawingAccName = acc;
        } else if (acc.includes('Capital') || acc.includes('Retained Earnings')) {
            capitalAccName = acc;
        }
    });

    const netIncome = totalRev - totalExp;

    const isEntryPosted = (accName, side, amount) => {
        const u = userLedgers[accName] || {};
        const rows = side === 'dr' ? (u.leftRows || []) : (u.rightRows || []);
        return rows.some(r => {
            const rAmt = Number(r.amount);
            return Math.abs(rAmt - amount) <= 1;
        });
    };

    // --- 2. VALIDATE JOURNAL ENTRIES ---
    const validateBlock = (blockIndex, expectedRows) => {
        const userRows = userJournal[blockIndex]?.rows || [];
        const matchedUserIndices = new Set();
        
        expectedRows.forEach((expected, expIdx) => {
            maxScore += 4; // Acc, Amount, PR, Date(if first) -> Roughly 4 pts worth per row? 
            // Request says: "Input boxes ... shall be counted as part of highest possible score"
            // Typically: Acc(1), Dr/Cr(1), PR(1). Date(1) only for first row.
            // Let's stick to 1 point per correct field.
            
            // Check if date is expected for this row (index 0)
            const dateExpected = (expIdx === 0);
            
            // Find matching user row
            const uIdx = userRows.findIndex((r, idx) => 
                !matchedUserIndices.has(idx) && 
                r.acc && r.acc.trim() === expected.acc
            );

            if (uIdx !== -1) {
                matchedUserIndices.add(uIdx);
                const row = userRows[uIdx];
                const keyBase = `journal-${blockIndex}-${uIdx}`;

                // Account Name
                score++; 
                fieldStatus[`${keyBase}-acc`] = true;

                const drVal = Number(row.dr) || 0;
                const crVal = Number(row.cr) || 0;

                // Dr Amount
                if (expected.dr > 0) {
                    if (Math.abs(drVal - expected.dr) <= 1) { score++; fieldStatus[`${keyBase}-dr`] = true; }
                    else { fieldStatus[`${keyBase}-dr`] = false; }
                } else if (drVal > 0) {
                    score--; 
                    fieldStatus[`${keyBase}-dr`] = false;
                }

                // Cr Amount
                if (expected.cr > 0) {
                    if (Math.abs(crVal - expected.cr) <= 1) { score++; fieldStatus[`${keyBase}-cr`] = true; }
                    else { fieldStatus[`${keyBase}-cr`] = false; }
                } else if (crVal > 0) {
                    score--; 
                    fieldStatus[`${keyBase}-cr`] = false;
                }

                // Date
                if (dateExpected) {
                    const d = (row.date || '').trim();
                    if (d === expectedDate.toString()) { score++; fieldStatus[`${keyBase}-date`] = true; }
                    else { fieldStatus[`${keyBase}-date`] = false; }
                }

                // PR Check
                const isPosted = isEntryPosted(expected.acc, expected.dr > 0 ? 'dr' : 'cr', expected.dr > 0 ? expected.dr : expected.cr);
                if (row.pr === true && isPosted) { score++; fieldStatus[`${keyBase}-pr`] = true; }
                else if (row.pr === true && !isPosted) { fieldStatus[`${keyBase}-pr`] = false; }
            }
        });

        // Penalize extra rows
        userRows.forEach((row, idx) => {
            if (!matchedUserIndices.has(idx)) {
                if (row.acc || row.dr || row.cr) {
                    score--; 
                    const keyBase = `journal-${blockIndex}-${idx}`;
                    fieldStatus[`${keyBase}-acc`] = false;
                }
            }
        });
    };

    const b0Exp = [...revAccounts.map(r => ({ acc: r.acc, dr: r.amt, cr: 0 })), { acc: 'Income Summary', dr: 0, cr: totalRev }];
    validateBlock(0, b0Exp);

    const b1Exp = [{ acc: 'Income Summary', dr: totalExp, cr: 0 }, ...expAccounts.map(e => ({ acc: e.acc, dr: 0, cr: e.amt }))];
    validateBlock(1, b1Exp);

    const b2Exp = netIncome >= 0 ? [ { acc: 'Income Summary', dr: netIncome, cr: 0 }, { acc: capitalAccName, dr: 0, cr: netIncome } ] : [ { acc: capitalAccName, dr: Math.abs(netIncome), cr: 0 }, { acc: 'Income Summary', dr: 0, cr: Math.abs(netIncome) } ];
    validateBlock(2, b2Exp);

    const b3Exp = [ { acc: capitalAccName, dr: drawingAmt, cr: 0 }, { acc: drawingAccName, dr: 0, cr: drawingAmt } ];
    validateBlock(3, b3Exp);


    // --- 3. VALIDATE LEDGER POSTINGS ---
    const expectedPostings = {};
    const addExpected = (acc, side, amt) => {
        if (!expectedPostings[acc]) expectedPostings[acc] = { dr: [], cr: [] };
        expectedPostings[acc][side].push(amt);
    };

    // Fill Expected Ledger Postings from Journal Expectations
    [...b0Exp, ...b1Exp, ...b2Exp, ...b3Exp].forEach(e => {
        addExpected(e.acc, e.dr > 0 ? 'dr' : 'cr', e.dr > 0 ? e.dr : e.cr);
    });

    validAccounts.forEach(acc => {
        ledgerRowFeedback[acc] = { left: [], right: [] };
        // Year Row Feedback Container
        ledgerRowFeedback[acc].leftYear = null; 
        ledgerRowFeedback[acc].rightYear = null;

        const u = userLedgers[acc] || {};
        const exp = expectedPostings[acc] || { dr: [], cr: [] };

        // Determine if history exists to decide on Year Input Requirement
        // Note: We need access to history (trans/adj/beg) to know if a side is empty.
        // We reconstruct history counts here.
        let histDrCount = 0;
        let histCrCount = 0;
        
        // Beg Bal
        if (ledger[acc]?.debit > 0) histDrCount++; // Simplification: raw ledger has beg+trans
        // Actually ledger prop has aggregated data. Let's trust the 'ledger' prop for non-zero check? 
        // Better: Re-iterate transactions/adjustments if needed, OR just assume if rawDr > 0 there's history.
        // Wait, rawDr includes Adjustments? No, rawDr is usually Beg+Trans.
        // Let's refine history check:
        // Adjustments are passed in.
        
        // NOTE: We need exact history counts to determine if the Closing Entry is the FIRST entry.
        // Let's loop transactions/adjustments again for this account.
        let hasHistDr = false; 
        let hasHistCr = false;
        
        // Check BegBal/Trans (Proxy via ledger data being > 0 is risky if net is 0 but entries exist)
        // Let's iterate transactions provided in activityData
        if (config.isSubsequentYear && ledger[acc]) { // Assuming ledger matches
             // This is tricky without the exact breakdown. 
             // Let's assume if transactions array has entries for this account
        }
        
        // Re-scan transactions for this account
        transactions.forEach(t => {
            t.debits.forEach(d => { if(d.account === acc) hasHistDr = true; });
            t.credits.forEach(c => { if(c.account === acc) hasHistCr = true; });
        });
        adjustments.forEach(a => {
            if (a.drAcc === acc) hasHistDr = true;
            if (a.crAcc === acc) hasHistCr = true;
        });
        // Check Beg Bal
        // We don't have direct access to 'beginningBalances' object structure here easily without passing it down or assuming.
        // But we know 'ledger' contains the pre-closing balance. 
        // If ledger[acc].debit > 0, does it mean it has history? Yes.
        // However, Adjustments are separate.
        
        // Let's use the 'ledger' object from args. It usually contains BegBal + Posted Transactions.
        if ((ledger[acc]?.debit || 0) > 0) hasHistDr = true;
        if ((ledger[acc]?.credit || 0) > 0) hasHistCr = true;


        const validateSide = (userSideRows, expectedAmts, sideName, hasHistory) => {
            // YEAR INPUT VALIDATION
            // If !hasHistory AND expectedAmts.length > 0 -> Year Input Required
            if (!hasHistory && expectedAmts.length > 0) {
                maxScore++; // Year is expected
                const userYear = sideName === 'left' ? u.yearInputLeft : u.yearInputRight;
                if ((userYear || '').toString().trim() === contextYear.toString()) {
                    score++;
                    ledgerRowFeedback[acc][`${sideName}Year`] = true;
                } else {
                    // If empty or wrong, no point. If entered wrong, maybe just X?
                    // User says: "must be included in highest possible score... must have X feedback"
                    ledgerRowFeedback[acc][`${sideName}Year`] = false; 
                }
            }

            const usedExpIndices = new Set();

            userSideRows.forEach((row, rIdx) => {
                // Ignore empty rows
                if (!row.date && !row.item && !row.pr && !row.amount) {
                    ledgerRowFeedback[acc][sideName][rIdx] = null;
                    return;
                }

                const rAmt = Number(row.amount);
                // Find Match by Amount
                const matchIdx = expectedAmts.findIndex((amt, idx) => !usedExpIndices.has(idx) && Math.abs(amt - rAmt) <= 1);

                if (matchIdx !== -1) {
                    // MATCH
                    usedExpIndices.add(matchIdx);
                    const fb = { date: false, item: false, pr: false, amount: true };
                    
                    // Amount (Correct by match)
                    score++;

                    // Date
                    // User Rule: "If the closing entry is the first entry... the second row date must be Mmm dd."
                    // If !hasHistory, this IS the first entry.
                    const expectedDateString = (!hasHistory && rIdx === 0) ? `Dec ${expectedDate}` : expectedDate.toString();
                    
                    const d = (row.date || '').trim();
                    // Loose match for day
                    const dayMatch = d === expectedDate.toString() || d === `Dec ${expectedDate}`;
                    // Strict match if first entry logic applies? 
                    // Let's accept both "31" and "Dec 31" to be lenient, unless user demands strictness.
                    // User said: "must be Mmm dd". So if !hasHistory, we enforce "Dec 31".
                    if (!hasHistory) {
                        if (d.toLowerCase() === `dec ${expectedDate}`) { fb.date = true; score++; }
                    } else {
                        if (d === expectedDate.toString()) { fb.date = true; score++; }
                    }

                    // Item
                    if ((row.item || '').toLowerCase().includes('clos')) { fb.item = true; score++; }

                    // PR
                    if ((row.pr || '').trim().length > 0) { fb.pr = true; score++; }

                    ledgerRowFeedback[acc][sideName][rIdx] = fb;

                } else {
                    // SPURIOUS
                    score--; // Amount wrong
                    if (row.date) score--;
                    if (row.item) score--;
                    if (row.pr) score--;
                    ledgerRowFeedback[acc][sideName][rIdx] = { date: false, item: false, pr: false, amount: false };
                }
            });

            // Add Max Score for Expected Items
            // 4 pts per expected entry (Date, Item, PR, Amt)
            maxScore += (expectedAmts.length * 4);
        };

        validateSide(u.leftRows || [], exp.dr, 'left', hasHistDr);
        validateSide(u.rightRows || [], exp.cr, 'right', hasHistCr);

        // Totals Validation
        // Calculate Final Totals
        const rawDr = ledger[acc]?.debit || 0;
        const rawCr = ledger[acc]?.credit || 0;
        let adjDr = 0, adjCr = 0;
        adjustments.forEach(a => { if (a.drAcc === acc) adjDr += a.amount; if (a.crAcc === acc) adjCr += a.amount; });
        
        const preDr = rawDr + adjDr;
        const preCr = rawCr + adjCr;
        const closDr = (exp.dr || []).reduce((a,b)=>a+b,0);
        const closCr = (exp.cr || []).reduce((a,b)=>a+b,0);

        const finalExpDrTotal = preDr + closDr;
        const finalExpCrTotal = preCr + closCr;
        const finalNet = finalExpDrTotal - finalExpCrTotal;
        const finalExpBal = Math.abs(finalNet);
        const finalExpType = finalNet >= 0 ? 'Dr' : 'Cr';

        const uDrTotal = Number(u.drTotal || 0);
        const uCrTotal = Number(u.crTotal || 0);
        const uBal = Number(u.balance || 0);
        const uType = u.balanceType;

        maxScore += 3;
        if (Math.abs(uDrTotal - finalExpDrTotal) <= 1) { score++; fieldStatus[`ledger-${acc}-drTotal`] = true; }
        else fieldStatus[`ledger-${acc}-drTotal`] = false;

        if (Math.abs(uCrTotal - finalExpCrTotal) <= 1) { score++; fieldStatus[`ledger-${acc}-crTotal`] = true; }
        else fieldStatus[`ledger-${acc}-crTotal`] = false;

        if (Math.abs(uBal - finalExpBal) <= 1 && (finalExpBal < 1 || uType === finalExpType)) {
             score++; fieldStatus[`ledger-${acc}-bal`] = true; fieldStatus[`ledger-${acc}-balType`] = true; 
        } else {
             fieldStatus[`ledger-${acc}-bal`] = false; fieldStatus[`ledger-${acc}-balType`] = false; 
        }
        fieldStatus[`ledger-${acc}-overall`] = fieldStatus[`ledger-${acc}-bal`];
    });

    return {
        score: Math.max(0, score),
        maxScore,
        letterGrade: getLetterGrade(Math.max(0, score), maxScore),
        fieldStatus,
        ledgerRowFeedback
    };
};
