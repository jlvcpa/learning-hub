// --- Step08ClosingEntries.js ---
import React, { useState, useMemo, useEffect } from 'https://esm.sh/react@18.2.0';
import htm from 'https://esm.sh/htm';
import { Book, Check, X, Table, Trash2, Plus, AlertCircle } from 'https://esm.sh/lucide-react@0.263.1';
import { sortAccounts, getAccountType, getLetterGrade } from '../utils.js';

const html = htm.bind(React.createElement);

// --- HELPER: Status Icon ---
const StatusIcon = ({ isCorrect, show }) => {
    if (!show || isCorrect === undefined || isCorrect === null) return null;
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
        `w-full h-full p-1 outline-none text-sm ${showFeedback && isOk === false ? 'bg-red-50 text-red-600' : ''}`;

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
    // Validation Statuses
    const { fieldStatus } = validationResult || {};
    const ledgerKeyBase = `ledger-${accName}`;
    const overallOk = fieldStatus?.[`${ledgerKeyBase}-overall`];
    const drTotalOk = fieldStatus?.[`${ledgerKeyBase}-drTotal`];
    const crTotalOk = fieldStatus?.[`${ledgerKeyBase}-crTotal`];
    const balAmtOk = fieldStatus?.[`${ledgerKeyBase}-bal`];
    const balTypeOk = fieldStatus?.[`${ledgerKeyBase}-balType`];

    // Helper for input class
    const getFieldClass = (keySuffix) => {
        const status = fieldStatus?.[`${ledgerKeyBase}-${keySuffix}`];
        if (showFeedback && status === false) return "bg-red-50 text-red-600";
        if (showFeedback && status === true) return "bg-green-50 text-green-800";
        return "";
    };

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
      
    // Determine if Year inputs are needed (if history is empty but user added rows)
    const hasHistoryLeft = leftRows.length > 0;
    const hasHistoryRight = rightRows.length > 0;
    
    // VISUAL ROWS MAPPING
    const maxDataRows = Math.max(finalLeft.length, finalRight.length, 4);
    const displayRowsCount = maxDataRows + 1; // +1 for Year Row
    const displayRows = Array.from({length: displayRowsCount}).map((_, i) => i);

    const updateSide = (side, visualIdx, field, val) => {
        if (visualIdx === 0) {
            // Update Year Input only if allowed
            const isLeft = side === 'left';
            if (isLeft && !hasHistoryLeft) onUpdate({ ...userLedger, yearInputLeft: val });
            if (!isLeft && !hasHistoryRight) onUpdate({ ...userLedger, yearInputRight: val });
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
            leftRows: [...userLeft, { date: '', item: 'Closing', pr: '', amount: '' }],
            rightRows: [...userRight, { date: '', item: 'Closing', pr: '', amount: '' }]
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
        const isLeft = side === 'left';
        const hasHistory = isLeft ? hasHistoryLeft : hasHistoryRight;
        const userHasRows = isLeft ? userLeft.length > 0 : userRight.length > 0;

        if (visualIdx === 0) {
            let dateVal = '';
            let isLocked = true;
            let showInput = false;

            if (hasHistory) {
                dateVal = contextYear;
                showInput = true;
            } else if (userHasRows) {
                dateVal = isLeft ? (userLedger.yearInputLeft || '') : (userLedger.yearInputRight || '');
                isLocked = false;
                showInput = true;
            }

            return {
                isYearRow: true,
                date: dateVal, 
                item: '', pr: '', amount: '',
                isUser: !hasHistory && userHasRows, 
                isLocked: isLocked,
                showInput: showInput
            };
        }

        const dataIdx = visualIdx - 1;
        const dataArr = isLeft ? finalLeft : finalRight;
        const row = dataArr[dataIdx];
        const histLen = isLeft ? leftRows.length : rightRows.length;
        const isUser = dataIdx >= histLen;
        const userIdx = isUser ? dataIdx - histLen : -1;

        if (!row) {
            return { isYearRow: false, date: '', item: '', pr: '', amount: '', isUser: isUser, isLocked: !isUser, userIdx: -1 };
        }

        let displayDate = row.date || '';
        if (visualIdx > 1 && row.isLocked && displayDate.includes(' ')) {
             displayDate = displayDate.split(' ')[1];
        }

        return {
            isYearRow: false,
            date: displayDate,
            item: row.item,
            pr: row.pr,
            amount: row.amount,
            isUser: isUser,
            isLocked: row.isLocked,
            userIdx: userIdx
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
                        let datePlaceholder = "dd";
                        if (i === 0) datePlaceholder = "YYYY";
                        else if (i === 1) datePlaceholder = "Mmm dd";
                        else datePlaceholder = "dd";
                        
                        const uIdx = props.userIdx;
                        const rowStatusKey = uIdx >= 0 ? `l-${uIdx}` : null;
                        
                        return html`
                            <div key=${`l-${i}`} className="flex text-xs border-b border-gray-200 h-6 relative ${!props.isUser && !props.isYearRow && props.date ? 'bg-gray-50/50 text-gray-600' : ''}">
                                <div className="w-14 border-r relative">
                                    ${props.isYearRow 
                                        ? (props.showInput 
                                            ? html`
                                                <input type="text" className=${`w-full h-full text-center px-1 outline-none bg-transparent ${props.isUser ? getFieldClass('year-left') : ''}`} placeholder=${datePlaceholder} value=${props.date} onChange=${(e)=>updateSide('left', i, 'year', e.target.value)} disabled=${isRowDisabled}/>
                                                ${props.isUser && html`<div className="absolute top-0 left-0 pointer-events-none scale-75"><${StatusIcon} show=${showFeedback} isCorrect=${fieldStatus?.[ledgerKeyBase+'-year-left']}/></div>`}
                                              ` 
                                            : null)
                                        : html`
                                            <input type="text" className=${`w-full h-full text-right px-1 outline-none bg-transparent ${rowStatusKey ? getFieldClass(rowStatusKey+'-date') : ''}`} placeholder=${datePlaceholder} value=${props.date} onChange=${(e)=>updateSide('left', i, 'date', e.target.value)} disabled=${isRowDisabled}/>
                                            ${rowStatusKey && html`<div className="absolute top-0 left-0 pointer-events-none scale-75"><${StatusIcon} show=${showFeedback} isCorrect=${fieldStatus?.[ledgerKeyBase+'-'+rowStatusKey+'-date']}/></div>`}
                                          `
                                    }
                                </div>
                                <div className="flex-1 border-r relative">
                                    <input type="text" className=${`w-full h-full text-left px-1 outline-none bg-transparent ${rowStatusKey ? getFieldClass(rowStatusKey+'-item') : ''}`} value=${props.item||''} onChange=${(e)=>updateSide('left', i, 'item', e.target.value)} disabled=${props.isYearRow || isRowDisabled}/>
                                    ${rowStatusKey && html`<div className="absolute top-0 right-0 pointer-events-none scale-75"><${StatusIcon} show=${showFeedback} isCorrect=${fieldStatus?.[ledgerKeyBase+'-'+rowStatusKey+'-item']}/></div>`}
                                </div>
                                <div className="w-8 border-r relative">
                                    <input type="text" className=${`w-full h-full text-center outline-none bg-transparent ${rowStatusKey ? getFieldClass(rowStatusKey+'-pr') : ''}`} value=${props.pr||''} onChange=${(e)=>updateSide('left', i, 'pr', e.target.value)} disabled=${props.isYearRow || isRowDisabled}/>
                                    ${rowStatusKey && html`<div className="absolute top-0 right-0 pointer-events-none scale-75"><${StatusIcon} show=${showFeedback} isCorrect=${fieldStatus?.[ledgerKeyBase+'-'+rowStatusKey+'-pr']}/></div>`}
                                </div>
                                <div className="w-16 relative">
                                    <input type="number" className=${`w-full h-full text-right px-1 outline-none bg-transparent ${rowStatusKey ? getFieldClass(rowStatusKey+'-amt') : ''}`} value=${props.amount||''} onChange=${(e)=>updateSide('left', i, 'amount', e.target.value)} disabled=${props.isYearRow || isRowDisabled}/>
                                    ${rowStatusKey && html`<div className="absolute top-0 right-0 pointer-events-none scale-75"><${StatusIcon} show=${showFeedback} isCorrect=${fieldStatus?.[ledgerKeyBase+'-'+rowStatusKey+'-amt']}/></div>`}
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
                        let datePlaceholder = "dd";
                        if (i === 0) datePlaceholder = "YYYY";
                        else if (i === 1) datePlaceholder = "Mmm dd";
                        else datePlaceholder = "dd";
                        
                        const isDeletable = props.isUser && !isReadOnly && !props.isYearRow;
                        const uIdx = props.userIdx;
                        const rowStatusKey = uIdx >= 0 ? `r-${uIdx}` : null;

                        return html`
                            <div key=${`r-${i}`} className="flex text-xs border-b border-gray-200 h-6 relative ${!props.isUser && !props.isYearRow && props.date ? 'bg-gray-50/50 text-gray-600' : ''}">
                                <div className="w-14 border-r relative">
                                    ${props.isYearRow 
                                        ? (props.showInput 
                                            ? html`
                                                <input type="text" className=${`w-full h-full text-center px-1 outline-none bg-transparent ${props.isUser ? getFieldClass('year-right') : ''}`} placeholder=${datePlaceholder} value=${props.date} onChange=${(e)=>updateSide('right', i, 'year', e.target.value)} disabled=${isRowDisabled}/>
                                                ${props.isUser && html`<div className="absolute top-0 left-0 pointer-events-none scale-75"><${StatusIcon} show=${showFeedback} isCorrect=${fieldStatus?.[ledgerKeyBase+'-year-right']}/></div>`}
                                              ` 
                                            : null)
                                        : html`
                                            <input type="text" className=${`w-full h-full text-right px-1 outline-none bg-transparent ${rowStatusKey ? getFieldClass(rowStatusKey+'-date') : ''}`} placeholder=${datePlaceholder} value=${props.date} onChange=${(e)=>updateSide('right', i, 'date', e.target.value)} disabled=${isRowDisabled}/>
                                            ${rowStatusKey && html`<div className="absolute top-0 left-0 pointer-events-none scale-75"><${StatusIcon} show=${showFeedback} isCorrect=${fieldStatus?.[ledgerKeyBase+'-'+rowStatusKey+'-date']}/></div>`}
                                          `
                                    }
                                </div>
                                <div className="flex-1 border-r relative">
                                    <input type="text" className=${`w-full h-full text-left px-1 outline-none bg-transparent ${rowStatusKey ? getFieldClass(rowStatusKey+'-item') : ''}`} value=${props.item||''} onChange=${(e)=>updateSide('right', i, 'item', e.target.value)} disabled=${props.isYearRow || isRowDisabled}/>
                                    ${rowStatusKey && html`<div className="absolute top-0 right-0 pointer-events-none scale-75"><${StatusIcon} show=${showFeedback} isCorrect=${fieldStatus?.[ledgerKeyBase+'-'+rowStatusKey+'-item']}/></div>`}
                                </div>
                                <div className="w-8 border-r relative">
                                    <input type="text" className=${`w-full h-full text-center outline-none bg-transparent ${rowStatusKey ? getFieldClass(rowStatusKey+'-pr') : ''}`} value=${props.pr||''} onChange=${(e)=>updateSide('right', i, 'pr', e.target.value)} disabled=${props.isYearRow || isRowDisabled}/>
                                    ${rowStatusKey && html`<div className="absolute top-0 right-0 pointer-events-none scale-75"><${StatusIcon} show=${showFeedback} isCorrect=${fieldStatus?.[ledgerKeyBase+'-'+rowStatusKey+'-pr']}/></div>`}
                                </div>
                                <div className="w-16 relative">
                                    <input type="number" className=${`w-full h-full text-right px-1 outline-none bg-transparent ${rowStatusKey ? getFieldClass(rowStatusKey+'-amt') : ''}`} value=${props.amount||''} onChange=${(e)=>updateSide('right', i, 'amount', e.target.value)} disabled=${props.isYearRow || isRowDisabled}/>
                                    ${rowStatusKey && html`<div className="absolute top-0 right-0 pointer-events-none scale-75"><${StatusIcon} show=${showFeedback} isCorrect=${fieldStatus?.[ledgerKeyBase+'-'+rowStatusKey+'-amt']}/></div>`}
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
        if (!showFeedback && !isReadOnly) return null;
        return validateStep08(data, activityData);
    }, [data, activityData, showFeedback, isReadOnly]);

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
                    <div className="flex flex-col">
                        <span className="font-bold flex items-center gap-2"><${AlertCircle} size=${18}/> Validation Results:</span>
                        <span className="text-xs">Journal inputs must exactly match the worksheet. Ledger entries must match the journal. Extra/Empty rows may cause deductions.</span>
                    </div>
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

    // Determine correct date (End of Month of last transaction)
    let expectedDate = 31;
    let expectedYearStr = "20XX";
    if (transactions && transactions.length > 0) {
        const d = new Date(transactions[transactions.length - 1].date);
        const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
        expectedDate = lastDay;
        expectedYearStr = d.getFullYear().toString();
    }

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

    // --- Prepare Expected Journal Data ---
    const expectedJournal = {
        0: [ 
            ...revAccounts.map(r => ({ acc: r.acc, dr: r.amt, cr: 0 })),
            { acc: 'Income Summary', dr: 0, cr: totalRev }
        ],
        1: [ 
            { acc: 'Income Summary', dr: totalExp, cr: 0 },
            ...expAccounts.map(e => ({ acc: e.acc, dr: 0, cr: e.amt }))
        ],
        2: [ 
             netIncome >= 0 
                ? [{ acc: 'Income Summary', dr: netIncome, cr: 0 }, { acc: capitalAccName, dr: 0, cr: netIncome }]
                : [{ acc: capitalAccName, dr: Math.abs(netIncome), cr: 0 }, { acc: 'Income Summary', dr: 0, cr: Math.abs(netIncome) }]
        ],
        3: [ 
             { acc: capitalAccName, dr: drawingAmt, cr: 0 },
             { acc: drawingAccName, dr: 0, cr: drawingAmt }
        ]
    };


    // --- Validate Ledger Postings First (to check if Journal PR is valid) ---
    const expectedPostings = {};
    validAccounts.forEach(acc => expectedPostings[acc] = []);

    // Helper to push expectation
    const expPost = (acc, side, amt) => {
        if (!expectedPostings[acc]) expectedPostings[acc] = [];
        expectedPostings[acc].push({ side, amt, isPosted: false });
    };

    // Generate Expectations from Journal Logic
    revAccounts.forEach(r => expPost(r.acc, 'left', r.amt));
    expPost('Income Summary', 'right', totalRev);
    expPost('Income Summary', 'left', totalExp);
    expAccounts.forEach(e => expPost(e.acc, 'right', e.amt));

    if (netIncome >= 0) {
        expPost('Income Summary', 'left', netIncome);
        expPost(capitalAccName, 'right', netIncome);
    } else {
        expPost(capitalAccName, 'left', Math.abs(netIncome));
        expPost('Income Summary', 'right', Math.abs(netIncome));
    }
    expPost(capitalAccName, 'left', drawingAmt);
    expPost(drawingAccName, 'right', drawingAmt);

    // Validate Ledgers
    validAccounts.forEach(acc => {
        const userL = userLedgers[acc] || {};
        const exps = expectedPostings[acc] || [];
        const ledgerKeyBase = `ledger-${acc}`;

        const expLeft = exps.filter(e => e.side === 'left');
        const expRight = exps.filter(e => e.side === 'right');

        // History check
        const hasHistoryLeft = transactions.some(t => t.debits.some(d => d.account === acc)) || (ledger[acc]?.debit > 0) || adjustments.some(a => a.drAcc === acc);
        const hasHistoryRight = transactions.some(t => t.credits.some(c => c.account === acc)) || (ledger[acc]?.credit > 0) || adjustments.some(a => a.crAcc === acc);
        
        // Calculate Expected Totals for Validation
        let expDrTotal = 0; 
        let expCrTotal = 0;
        // Add History
        if(ledger[acc]?.debit) expDrTotal += ledger[acc].debit;
        if(ledger[acc]?.credit) expCrTotal += ledger[acc].credit;
        transactions.forEach(t => {
            t.debits.forEach(d => { if(d.account === acc) expDrTotal += d.amount; });
            t.credits.forEach(c => { if(c.account === acc) expCrTotal += c.amount; });
        });
        adjustments.forEach(a => {
            if(a.drAcc === acc) expDrTotal += a.amount;
            if(a.crAcc === acc) expCrTotal += a.amount;
        });
        // Add Expected Closing
        expLeft.forEach(e => expDrTotal += e.amt);
        expRight.forEach(e => expCrTotal += e.amt);


        const validateSide = (userSideRows, expSideRows, sidePrefix, hasHistory, yearInput) => {
            const activeUserRows = userSideRows.map((r, i) => ({...r, idx: i})).filter(r => r.amount || r.item || r.pr || r.date);
            const userHasRows = activeUserRows.length > 0;

            // YEAR VALIDATION
            if (!hasHistory && userHasRows) {
                maxScore += 1;
                const yearOk = yearInput && yearInput.toString().trim() === expectedYearStr;
                fieldStatus[`${ledgerKeyBase}-year-${sidePrefix === 'l' ? 'left' : 'right'}`] = yearOk;
                if (yearOk) score++;
            }

            // ROW VALIDATION
            const usedExpIndices = new Set();
            expSideRows.forEach(() => { maxScore += 2; }); // Part(1) + PR(1)

            activeUserRows.forEach(uRow => {
                const key = `${sidePrefix}-${uRow.idx}`;
                
                const matchIndex = expSideRows.findIndex((e, i) => !usedExpIndices.has(i) && Math.abs(e.amt - (Number(uRow.amount)||0)) < 1);
                
                if (matchIndex !== -1) {
                    usedExpIndices.add(matchIndex);
                    const match = expSideRows[matchIndex];
                    match.isPosted = true; // Mark as posted for Journal PR check
                    
                    fieldStatus[`${ledgerKeyBase}-${key}-amt`] = true;

                    const dStr = (uRow.date || '').toString();
                    const dateOk = dStr.includes(expectedDate.toString());
                    fieldStatus[`${ledgerKeyBase}-${key}-date`] = dateOk;

                    const item = (uRow.item || '').toLowerCase();
                    const itemOk = item === 'closing' || item === 'clos';
                    fieldStatus[`${ledgerKeyBase}-${key}-item`] = itemOk;
                    if (itemOk) score++;

                    const pr = (uRow.pr || '').toLowerCase();
                    const prOk = pr.includes('j'); 
                    fieldStatus[`${ledgerKeyBase}-${key}-pr`] = prOk;
                    if (prOk) score++;

                } else {
                    fieldStatus[`${ledgerKeyBase}-${key}-date`] = false;
                    fieldStatus[`${ledgerKeyBase}-${key}-item`] = false;
                    fieldStatus[`${ledgerKeyBase}-${key}-pr`] = false;
                    fieldStatus[`${ledgerKeyBase}-${key}-amt`] = false;
                    score -= 1;
                }
            });
        };

        validateSide(userL.leftRows || [], expLeft, 'l', hasHistoryLeft, userL.yearInputLeft);
        validateSide(userL.rightRows || [], expRight, 'r', hasHistoryRight, userL.yearInputRight);

        // TOTALS Check
        const checkTotal = (userVal, expVal, key) => {
             const val = Number(userVal);
             if (expVal > 0) {
                 const ok = Math.abs(val - expVal) < 1;
                 fieldStatus[key] = ok; // If empty -> 0 != exp -> False(X).
             } else {
                 // Expect 0. If user has input -> False. If empty -> Null.
                 fieldStatus[key] = userVal ? false : null;
             }
        };
        checkTotal(userL.drTotal, expDrTotal, `${ledgerKeyBase}-drTotal`);
        checkTotal(userL.crTotal, expCrTotal, `${ledgerKeyBase}-crTotal`);


        // BALANCE Check
        const type = getAccountType(acc);
        let rawDr = ledger[acc]?.debit || 0;
        let rawCr = ledger[acc]?.credit || 0;
        adjustments.forEach(a => { if (a.drAcc === acc) rawDr += a.amount; if (a.crAcc === acc) rawCr += a.amount; });
        let net = rawDr - rawCr;
        if (type === 'Revenue') net -= net; 
        else if (type === 'Expense') net += Math.abs(net);
        
        let expectedBal = 0;
        if (['Revenue', 'Expense'].includes(type) || acc === drawingAccName || acc === 'Income Summary') expectedBal = 0;
        else if (acc === capitalAccName) {
            let capBal = (ledger[acc]?.credit || 0) - (ledger[acc]?.debit || 0); 
            capBal += netIncome; capBal -= drawingAmt; expectedBal = capBal;
        } else expectedBal = Math.abs(net);

        const userBal = Number(userL.balance);
        const userType = userL.balanceType;
        const isZero = Math.abs(expectedBal) < 1;
        
        let expectedType = '';
        if (!isZero) {
            const aType = getAccountType(acc);
            if (acc === capitalAccName) expectedType = expectedBal >= 0 ? 'Cr' : 'Dr'; 
            else if (aType === 'Asset') expectedType = 'Dr';
            else if (aType === 'Liability') expectedType = 'Cr';
        }
        
        maxScore += 2;
        // Balance Amt
        if (expectedBal > 0) {
            const matchesAmt = Math.abs(userBal - Math.abs(expectedBal)) < 1;
            fieldStatus[`${ledgerKeyBase}-bal`] = matchesAmt;
            if (matchesAmt) score++;
        } else {
             // Expect 0. If user has input -> False. If empty -> Null (Wait, usually balanced accounts show 0? No, usually empty or lines).
             // Prompt says "if expecting a nonzero amount must be X... if no entry".
             // If expecting zero, usually we put 0 or leave empty?
             // Prompt implies X only if nonzero expectation and empty.
             // Let's stick to: if exp > 0, strict check. If exp == 0, check if user put nonzero.
             if (userBal) fieldStatus[`${ledgerKeyBase}-bal`] = false; else fieldStatus[`${ledgerKeyBase}-bal`] = null;
        }
        
        // Balance Type
        if (!isZero) {
            const matchesType = userType === expectedType;
            fieldStatus[`${ledgerKeyBase}-balType`] = matchesType;
            if (matchesType) score++;
        } else {
             fieldStatus[`${ledgerKeyBase}-balType`] = userType ? false : null; 
        }

        fieldStatus[`${ledgerKeyBase}-overall`] = (fieldStatus[`${ledgerKeyBase}-bal`] !== false) && (fieldStatus[`${ledgerKeyBase}-balType`] !== false);
    });


    // --- Validate Journal ---
    Object.keys(expectedJournal).forEach(bIdx => {
        const expectedRows = expectedJournal[bIdx];
        const userRows = userJournal[bIdx]?.rows || [];

        expectedRows.forEach((expected, i) => {
             maxScore += 3; if (i === 0) maxScore += 1;

             const uRow = userRows.find(r => r.acc && r.acc.trim() === expected.acc);
             if (uRow) {
                 const accOk = true; 
                 // Debit Check
                 let drOk = null;
                 if (expected.dr > 0) {
                     drOk = Math.abs((Number(uRow.dr)||0) - expected.dr) < 1; // Empty -> 0 -> False(X)
                 } else {
                     drOk = uRow.dr ? false : null; // Expect 0. Val -> False. Empty -> Null.
                     if (uRow.dr) score -= 1; // Deduction for unexpected input
                 }

                 // Credit Check
                 let crOk = null;
                 if (expected.cr > 0) {
                     crOk = Math.abs((Number(uRow.cr)||0) - expected.cr) < 1;
                 } else {
                     crOk = uRow.cr ? false : null;
                     if (uRow.cr) score -= 1;
                 }

                 const dateOk = i === 0 ? (Number(userRows[0].date) === expectedDate) : true;
                 
                 // PR Check: Only granted if Journal Row is correct AND Ledger is Posted
                 const rowIsCorrect = accOk && (drOk === true || drOk === null) && (crOk === true || crOk === null) && dateOk;
                 let prOk = false;
                 if (rowIsCorrect && uRow.pr === true) {
                      // Check Ledger Posting
                      const accPostings = expectedPostings[expected.acc] || [];
                      // Find if any posting for this side/amt is marked posted
                      const side = expected.dr > 0 ? 'left' : 'right';
                      const amt = expected.dr > 0 ? expected.dr : expected.cr;
                      const matchingPosting = accPostings.find(p => p.side === side && Math.abs(p.amt - amt) < 1 && p.isPosted);
                      if (matchingPosting) prOk = true;
                 }

                 const uIdx = userRows.indexOf(uRow);
                 const keyBase = `journal-${bIdx}-${uIdx}`;
                 
                 fieldStatus[`${keyBase}-acc`] = accOk;
                 fieldStatus[`${keyBase}-dr`] = drOk;
                 fieldStatus[`${keyBase}-cr`] = crOk;
                 fieldStatus[`${keyBase}-date`] = dateOk;
                 fieldStatus[`${keyBase}-pr`] = prOk; 

                 if (accOk) score++;
                 if ((drOk === true) && (crOk === true || crOk === null)) score++; // Point for Amounts (Dr must be right, Cr must be right/empty)
                 else if ((crOk === true) && (drOk === true || drOk === null)) score++;

                 if (prOk) score++;
                 if (i === 0 && dateOk) score++;
             }
        });

        userRows.forEach((uRow, uIdx) => {
            const isExpected = expectedRows.some(ex => ex.acc === (uRow.acc ? uRow.acc.trim() : ''));
            if (!isExpected && (uRow.acc || uRow.dr || uRow.cr)) {
                 const keyBase = `journal-${bIdx}-${uIdx}`;
                 fieldStatus[`${keyBase}-acc`] = false;
                 fieldStatus[`${keyBase}-dr`] = false;
                 fieldStatus[`${keyBase}-cr`] = false;
                 fieldStatus[`${keyBase}-pr`] = false;
                 score -= 1; 
            }
        });
    });

    return {
        score: Math.max(0, score), 
        maxScore,
        letterGrade: getLetterGrade(Math.max(0, score), maxScore),
        fieldStatus,
        year: '20XX' 
    };
};
