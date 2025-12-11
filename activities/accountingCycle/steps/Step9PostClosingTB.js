import React, { useState, useMemo } from 'https://esm.sh/react@18.2.0';
import htm from 'https://esm.sh/htm';
import { Book, Check, X, ChevronDown, ChevronRight, Table, Trash2, Plus } from 'https://esm.sh/lucide-react@0.263.1';
import { sortAccounts, getAccountType } from '../utils.js';

const html = htm.bind(React.createElement);

// --- INTERNAL COMPONENTS ---

const StatusIcon = ({ correct, show }) => {
    if (!show) return null;
    return correct 
        ? html`<${Check} size=${14} className="text-green-600 inline ml-1" />` 
        : html`<${X} size=${14} className="text-red-600 inline ml-1" />`;
};

// --- SOURCE VIEW: GENERAL LEDGER (Fully Posted) ---
const LedgerSourceView = ({ transactions, validAccounts, beginningBalances, isSubsequentYear, adjustments }) => {
    const [expanded, setExpanded] = useState(true);
    const sortedAccounts = sortAccounts(validAccounts);

    // Helper: Calculate nominal totals for closing to Capital/Income Summary
    const closingData = useMemo(() => {
        let totalRev = 0;
        let totalExp = 0;
        let totalDraw = 0;
        
        // Temporary ledger to calculate adjusted balances
        const tempLedger = {};
        
        validAccounts.forEach(acc => {
            let dr = 0, cr = 0;
            // BB
            if (isSubsequentYear && beginningBalances?.balances[acc]) {
                dr += beginningBalances.balances[acc].dr;
                cr += beginningBalances.balances[acc].cr;
            }
            // Trans
            transactions.forEach(t => {
                t.debits.forEach(d => { if(d.account === acc) dr += d.amount; });
                t.credits.forEach(c => { if(c.account === acc) cr += c.amount; });
            });
            // Adj
            adjustments.forEach(a => {
                if(a.drAcc === acc) dr += a.amount;
                if(a.crAcc === acc) cr += a.amount;
            });

            const net = dr - cr;
            const type = getAccountType(acc);
            if (type === 'Revenue') totalRev += Math.abs(net); // Rev is Credit normal
            if (type === 'Expense') totalExp += net; // Exp is Debit normal
            if (acc.includes('Drawing') || acc.includes('Dividends')) totalDraw += net; // Draw is Debit normal
            
            tempLedger[acc] = { dr, cr, net };
        });

        return { totalRev, totalExp, totalDraw, tempLedger };
    }, [transactions, validAccounts, beginningBalances, isSubsequentYear, adjustments]);

    return html`
        <div className="mb-4 border rounded-lg shadow-sm bg-blue-50 overflow-hidden no-print h-full flex flex-col">
            <div className="bg-blue-100 p-2 font-bold text-blue-900 cursor-pointer flex justify-between items-center flex-shrink-0" onClick=${()=>setExpanded(!expanded)}>
                <span><${Book} size=${16} className="inline mr-2"/>Source: General Ledger (Post-Closing)</span>
                <div className="flex items-center gap-4">
                    ${expanded ? html`<${ChevronDown} size=${16}/>` : html`<${ChevronRight} size=${16}/>`}
                </div>
            </div>
            ${expanded && html`
                <div className="p-4 overflow-y-auto custom-scrollbar flex-1 flex flex-col gap-6 bg-gray-50">
                    ${sortedAccounts.map(acc => {
                        const rowsL = [];
                        const rowsR = [];
                        const type = getAccountType(acc);
                        
                        // 1. Beginning Balances
                        if (isSubsequentYear && beginningBalances?.balances[acc]) {
                            const b = beginningBalances.balances[acc];
                            if (b.dr > 0) rowsL.push({ date: 'Jan 01', part: 'BB', pr: '✓', amount: b.dr });
                            if (b.cr > 0) rowsR.push({ date: 'Jan 01', part: 'BB', pr: '✓', amount: b.cr });
                        } else {
                            // Spacer for layout consistency
                            rowsL.push({ date: '2023', part: '', pr: '', amount: null, isSpacer: true });
                            rowsR.push({ date: '2023', part: '', pr: '', amount: null, isSpacer: true });
                        }

                        // 2. Transactions
                        transactions.forEach(t => {
                            const dateObj = new Date(t.date);
                            const dd = dateObj.getDate().toString().padStart(2, '0');
                            const mmm = dateObj.toLocaleString('default', { month: 'short' });
                            t.debits.forEach(d => { if(d.account === acc) rowsL.push({ date: `${mmm} ${dd}`, part: 'GJ', pr: '1', amount: d.amount }); });
                            t.credits.forEach(c => { if(c.account === acc) rowsR.push({ date: `${mmm} ${dd}`, part: 'GJ', pr: '1', amount: c.amount }); });
                        });

                        // 3. Adjusting Entries
                        adjustments.forEach(adj => {
                            if (adj.drAcc === acc) rowsL.push({ date: 'Dec 31', part: 'Adj', pr: 'J2', amount: adj.amount });
                            if (adj.crAcc === acc) rowsR.push({ date: 'Dec 31', part: 'Adj', pr: 'J2', amount: adj.amount });
                        });

                        // 4. Closing Entries (Calculated for Display)
                        const accData = closingData.tempLedger[acc] || { net: 0 };
                        // Balance before closing
                        const preCloseBal = accData.net; // +Dr, -Cr

                        if (type === 'Revenue') {
                            // Close Revenue (Credit Bal) with Debit
                            if (Math.abs(preCloseBal) > 0) rowsL.push({ date: 'Dec 31', part: 'Close', pr: 'J3', amount: Math.abs(preCloseBal) });
                        } else if (type === 'Expense') {
                            // Close Expense (Debit Bal) with Credit
                            if (preCloseBal > 0) rowsR.push({ date: 'Dec 31', part: 'Close', pr: 'J3', amount: preCloseBal });
                        } else if (acc.includes('Drawing') || acc.includes('Dividends')) {
                            // Close Drawing (Debit Bal) with Credit
                            if (preCloseBal > 0) rowsR.push({ date: 'Dec 31', part: 'Close', pr: 'J3', amount: preCloseBal });
                        } else if (type === 'Equity') {
                            // Capital Account receives Net Income/Loss and Drawings
                            const netIncome = closingData.totalRev - closingData.totalExp;
                            if (netIncome >= 0) {
                                rowsR.push({ date: 'Dec 31', part: 'Close (NI)', pr: 'J3', amount: netIncome });
                            } else {
                                rowsL.push({ date: 'Dec 31', part: 'Close (NL)', pr: 'J3', amount: Math.abs(netIncome) });
                            }
                            if (closingData.totalDraw > 0) {
                                rowsL.push({ date: 'Dec 31', part: 'Close (Drw)', pr: 'J3', amount: closingData.totalDraw });
                            }
                        } else if (acc === 'Income Summary') {
                            // Income Summary:
                            // 1. Credit Rev
                            rowsR.push({ date: 'Dec 31', part: 'Close', pr: 'J3', amount: closingData.totalRev });
                            // 2. Debit Exp
                            rowsL.push({ date: 'Dec 31', part: 'Close', pr: 'J3', amount: closingData.totalExp });
                            // 3. Close Net Income/Loss
                            const netIncome = closingData.totalRev - closingData.totalExp;
                             if (netIncome >= 0) {
                                rowsL.push({ date: 'Dec 31', part: 'Close', pr: 'J3', amount: netIncome });
                            } else {
                                rowsR.push({ date: 'Dec 31', part: 'Close', pr: 'J3', amount: Math.abs(netIncome) });
                            }
                        }

                        // Calculate Final Display Totals
                        const totalDr = rowsL.reduce((s, r) => s + (Number(r.amount)||0), 0);
                        const totalCr = rowsR.reduce((s, r) => s + (Number(r.amount)||0), 0);
                        const finalNet = totalDr - totalCr;
                        const balance = Math.abs(finalNet);
                        const isZero = balance === 0;

                        const maxCount = Math.max(rowsL.length, rowsR.length, 3);
                        const displayRows = Array.from({ length: maxCount }).map((_, i) => i);

                        return html`
                            <div key=${acc} className="border-y-2 border-gray-800 bg-white shadow-md">
                                <div className="border-b-2 border-gray-800 p-2 bg-gray-100 font-bold text-center text-lg text-gray-800 flex justify-between items-center">
                                    <span className="w-8"></span>
                                    <span>${acc}</span>
                                    <span className="w-8 text-xs font-normal text-gray-500">${getAccountType(acc)}</span>
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
                                                    <div className="flex-1 border-r px-1 truncate text-gray-800" title=${r.part}>${r.part || ''}</div>
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
                                                    <div className="flex-1 border-r px-1 truncate text-gray-800" title=${r.part}>${r.part || ''}</div>
                                                    <div className="w-10 border-r text-center text-gray-500 flex-shrink-0">${r.pr || ''}</div>
                                                    <div className="w-20 text-right px-1 text-gray-800 flex-shrink-0">${r.amount ? r.amount.toLocaleString() : ''}</div>
                                                </div>
                                            `;
                                        })}
                                        <div className="border-t-2 border-gray-800 p-1 flex justify-between items-center bg-gray-50 text-xs font-bold">
                                            <span>Total</span>
                                            <span>${totalCr.toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className=${`p-2 text-center border-t border-gray-300 text-sm font-bold ${isZero ? 'bg-gray-100 text-gray-400' : 'bg-yellow-50 text-gray-700'}`}>
                                    ${isZero ? 'Account Closed' : html`End Balance: <span className="text-blue-700 ml-2 text-base">${balance.toLocaleString()}</span>`}
                                </div>
                            </div>
                        `;
                    })}
                </div>
            `}
        </div>
    `;
};

// --- FORM: Post-Closing Trial Balance (Same structure as Step 4) ---
const PostClosingTBForm = ({ data, onChange, showFeedback, isReadOnly, expectedLedger }) => {
    const rows = data.rows || [{ account: '', dr: '', cr: '' }, { account: '', dr: '', cr: '' }, { account: '', dr: '', cr: '' }];
    
    const updateRow = (idx, field, val) => {
        const newRows = [...rows];
        newRows[idx] = { ...newRows[idx], [field]: val };
        onChange('rows', newRows);
    };

    const addRow = () => onChange('rows', [...rows, { account: '', dr: '', cr: '' }]);
    const deleteRow = (idx) => { if (rows.length > 1) onChange('rows', rows.filter((_, i) => i !== idx)); };

    const totalDr = rows.reduce((sum, r) => sum + (Number(r.dr) || 0), 0);
    const totalCr = rows.reduce((sum, r) => sum + (Number(r.cr) || 0), 0);

    const getRowFeedback = (row) => {
        if (!showFeedback) return { acc: '', dr: '', cr: '' };
        const accName = row.account.trim();
        if (!accName) return { acc: '', dr: '', cr: '' };
        
        // Find expected value
        const key = Object.keys(expectedLedger).find(k => k.toLowerCase() === accName.toLowerCase());
        
        // If account shouldn't exist (e.g., Nominal account), expectedLedger[key] might be 0 or undefined
        if (!key) return { acc: 'bg-red-100', dr: 'bg-red-100', cr: 'bg-red-100' };
        
        const expData = expectedLedger[key];
        const expDr = expData.debit;
        const expCr = expData.credit;

        // If it's a closed account (expDr & expCr are 0) and user entered it, that's wrong for a Post-Closing TB
        if (expDr === 0 && expCr === 0) return { acc: 'text-red-600 font-bold', dr: 'text-red-600', cr: 'text-red-600' };

        const usrDr = Number(row.dr) || 0;
        const usrCr = Number(row.cr) || 0;

        return {
            acc: 'text-green-600 font-bold',
            dr: Math.abs(usrDr - expDr) <= 1 ? (expDr > 0 ? 'text-green-600' : '') : 'text-red-600 font-bold',
            cr: Math.abs(usrCr - expCr) <= 1 ? (expCr > 0 ? 'text-green-600' : '') : 'text-red-600 font-bold'
        };
    };

    return html`
        <div>
            <table className="w-full text-sm border-collapse">
                <thead className="bg-gray-100 sticky top-0 z-10">
                    <tr>
                        <th className="p-2 border text-left">Account Title</th>
                        <th className="p-2 border w-24 text-right">Debit</th>
                        <th className="p-2 border w-24 text-right">Credit</th>
                        <th className="p-2 border w-8"></th>
                    </tr>
                </thead>
                <tbody>
                    ${rows.map((row, idx) => {
                        const styles = getRowFeedback(row);
                        return html`
                            <tr key=${idx} className="border-b">
                                <td className="p-1 border">
                                    <input type="text" className=${`w-full outline-none ${styles.acc}`} value=${row.account} onChange=${(e)=>updateRow(idx, 'account', e.target.value)} disabled=${isReadOnly} placeholder="Account Name" />
                                </td>
                                <td className="p-1 border">
                                    <input type="number" className=${`w-full text-right outline-none ${styles.dr}`} value=${row.dr} onChange=${(e)=>updateRow(idx, 'dr', e.target.value)} disabled=${isReadOnly} />
                                </td>
                                <td className="p-1 border">
                                    <input type="number" className=${`w-full text-right outline-none ${styles.cr}`} value=${row.cr} onChange=${(e)=>updateRow(idx, 'cr', e.target.value)} disabled=${isReadOnly} />
                                </td>
                                <td className="p-1 border text-center">
                                    ${!isReadOnly && html`<button onClick=${() => deleteRow(idx)} className="text-gray-400 hover:text-red-600"><${Trash2} size=${14}/></button>`}
                                </td>
                            </tr>
                        `;
                    })}
                </tbody>
                <tfoot className="bg-gray-100 font-bold">
                    <tr>
                        <td className="p-2 text-right">Total</td>
                        <td className="p-2 text-right">${totalDr.toLocaleString()}</td>
                        <td className="p-2 text-right">${totalCr.toLocaleString()}</td>
                        <td></td>
                    </tr>
                </tfoot>
            </table>
            ${!isReadOnly && html`<button onClick=${addRow} className="mt-2 text-xs flex items-center gap-1 text-blue-600 hover:underline"><${Plus} size=${12}/> Add Row</button>`}
        </div>
    `;
};

// --- MAIN COMPONENT ---
export default function Step9PostClosingTB({ activityData, data, onChange, showFeedback, isReadOnly }) {
    
    // Calculate Post-Closing Ledger State (Expected Values)
    const expectedLedger = useMemo(() => {
        const result = {};
        const { ledger, adjustments, validAccounts } = activityData;
        
        // 1. Calculate Adjusted Balances
        const adjBalances = {};
        validAccounts.forEach(acc => {
            const rawDr = ledger[acc]?.debit || 0;
            const rawCr = ledger[acc]?.credit || 0;
            let aDr = 0, aCr = 0;
            adjustments.forEach(a => {
                if (a.drAcc === acc) aDr += a.amount;
                if (a.crAcc === acc) aCr += a.amount;
            });
            adjBalances[acc] = (rawDr + aDr) - (rawCr + aCr); // +Dr, -Cr
        });

        // 2. Simulate Closing
        let netIncome = 0;
        let totalDrawings = 0;
        
        validAccounts.forEach(acc => {
            const type = getAccountType(acc);
            const bal = adjBalances[acc];
            
            if (type === 'Revenue') {
                netIncome += Math.abs(bal); // Add Rev to NI
                result[acc] = { debit: 0, credit: 0 }; // Closed
            } else if (type === 'Expense') {
                netIncome -= bal; // Subtract Exp from NI
                result[acc] = { debit: 0, credit: 0 }; // Closed
            } else if (acc.includes('Drawing') || acc.includes('Dividends')) {
                totalDrawings += bal;
                result[acc] = { debit: 0, credit: 0 }; // Closed
            } else if (type === 'Asset' || type === 'Liability') {
                // Real accounts remain
                if (bal >= 0) result[acc] = { debit: bal, credit: 0 };
                else result[acc] = { debit: 0, credit: Math.abs(bal) };
            }
        });

        // 3. Update Capital
        const capAcc = validAccounts.find(a => getAccountType(a) === 'Equity' && !a.includes('Drawing') && !a.includes('Dividends'));
        if (capAcc) {
            const oldCap = adjBalances[capAcc] || 0; // Likely a credit (negative in our math logic if using net, but here we used net as +Dr... wait)
            // Correction: adjBalances logic above: (Dr - Cr). So Credit balance is Negative.
            // Let's standardise: 
            // Credit Balance of 1000 => -1000.
            
            // Net Income (Rev - Exp). Rev (Credit/Neg) - Exp (Debit/Pos). 
            // If Rev=1000(Cr), Exp=500(Dr). Net = -1000 - 500?? No.
            
            // Recalculating NI cleanly:
            let rev = 0, exp = 0;
            validAccounts.forEach(acc => {
                 const type = getAccountType(acc);
                 const bal = adjBalances[acc]; // +Dr, -Cr
                 if (type === 'Revenue') rev += Math.abs(bal); // Rev is Credit, so bal is negative.
                 if (type === 'Expense') exp += bal; // Exp is Debit, bal is positive.
            });
            const NI = rev - exp;
            
            // Capital Logic
            const startCap = Math.abs(adjBalances[capAcc]); // Assuming Credit balance
            const finalCap = startCap + NI - totalDrawings;
            
            result[capAcc] = { debit: 0, credit: finalCap };
        }

        return result;
    }, [activityData]);

    return html`
        <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-140px)] min-h-[600px]">
            <div className="flex-1 lg:w-1/2 h-full min-h-0">
                 <${LedgerSourceView} 
                    transactions=${activityData.transactions} 
                    validAccounts=${activityData.validAccounts} 
                    beginningBalances=${activityData.beginningBalances} 
                    isSubsequentYear=${activityData.config.isSubsequentYear}
                    adjustments=${activityData.adjustments}
                 /> 
            </div>
            <div className="flex-1 lg:w-1/2 border rounded bg-white flex flex-col shadow-sm overflow-hidden min-h-0">
                <div className="bg-green-100 p-2 font-bold text-green-900"><${Table} size=${16} className="inline mr-2"/>Post-Closing Trial Balance</div>
                <div className="p-2 overflow-y-auto custom-scrollbar flex-1">
                     <${PostClosingTBForm} 
                        data=${data} 
                        onChange=${onChange} 
                        showFeedback=${showFeedback} 
                        isReadOnly=${isReadOnly} 
                        expectedLedger=${expectedLedger} 
                     />
                </div>
            </div>
        </div>
    `;
}
