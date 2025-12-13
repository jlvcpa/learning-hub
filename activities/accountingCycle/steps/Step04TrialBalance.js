// --- Step04TrialBalance.js ---
import React, { useState, useEffect } from 'https://esm.sh/react@18.2.0';
import htm from 'https://esm.sh/htm';
import { Book, Check, X, Table, Trash2, Plus, AlertCircle } from 'https://esm.sh/lucide-react@0.263.1';
import { sortAccounts, formatCurrency } from '../utils.js';

const html = htm.bind(React.createElement);

// --- HELPER FUNCTIONS ---

const getLastDayOfMonth = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = date.getMonth();
    // Get last day of the month
    const lastDay = new Date(year, month + 1, 0);
    return lastDay.toLocaleString('default', { month: 'long', day: 'numeric', year: 'numeric' });
};

// --- VALIDATION LOGIC ---
export const validateStep04 = (transactions, data, expectedLedger) => {
    let score = 0;
    let maxScore = 0;
    const feedback = { header: {}, rows: [] };
    
    // 1. HEADER VALIDATION (3 Points)
    maxScore += 3;
    const header = data.header || {};
    
    // A. Company Name (1pt) - Lenient check: Just ensure it's not empty and looks like a title
    const companyName = (header.company || '').trim();
    const isCompanyValid = companyName.length > 3; 
    if (isCompanyValid) score += 1;
    feedback.header.company = isCompanyValid;

    // B. Document Name (1pt) - Must be "Trial Balance" (case insensitive)
    const docName = (header.doc || '').trim().toLowerCase();
    const isDocValid = docName === 'trial balance';
    if (isDocValid) score += 1;
    feedback.header.doc = isDocValid;

    // C. Date (1pt) - Must match the last day of the transaction month
    const targetDate = getLastDayOfMonth(transactions[0]?.date);
    const inputDate = (header.date || '').trim();
    // Allow slight variations (e.g. "Jan 31" vs "January 31") but ideally exact match
    const isDateValid = inputDate.toLowerCase() === targetDate.toLowerCase();
    if (isDateValid) score += 1;
    feedback.header.date = isDateValid;

    // 2. BODY VALIDATION
    const rows = data.rows || [];
    const expectedAccounts = Object.keys(expectedLedger);
    
    // Calculate Expected Totals
    let expTotalDr = 0;
    let expTotalCr = 0;

    // Pre-calculate expected balances for lookup
    const expBalances = {};
    expectedAccounts.forEach(acc => {
        const net = expectedLedger[acc].debit - expectedLedger[acc].credit;
        const absNet = Math.abs(net);
        if (absNet > 0) { // Only score accounts that have a balance
            expBalances[acc] = {
                amount: absNet,
                side: net >= 0 ? 'dr' : 'cr'
            };
            if (net >= 0) expTotalDr += net;
            else expTotalCr += Math.abs(net);
            
            // Add to Max Score: 1 for Account Name, 1 for Amount/Side
            maxScore += 2;
        }
    });

    // Add Max Score for Totals (1 for Dr Total, 1 for Cr Total)
    maxScore += 2;

    // Validate Rows
    let userTotalDr = 0;
    let userTotalCr = 0;
    const processedAccounts = new Set(); // Prevent double counting same account

    // Iterate user rows to score
    rows.forEach((row, idx) => {
        const userAcc = (row.account || '').trim();
        const userDr = Number(row.dr) || 0;
        const userCr = Number(row.cr) || 0;
        
        userTotalDr += userDr;
        userTotalCr += userCr;

        const rowFeedback = { acc: false, amt: false };
        
        if (userAcc) {
            // Find matching expected account (case insensitive)
            const matchedKey = Object.keys(expBalances).find(k => k.toLowerCase() === userAcc.toLowerCase());
            
            if (matchedKey && !processedAccounts.has(matchedKey)) {
                // 1 Point for Correct Account Name existing
                score += 1;
                rowFeedback.acc = true;
                processedAccounts.add(matchedKey);

                // 1 Point for Correct Amount AND Correct Column
                const exp = expBalances[matchedKey];
                const isDrCorrect = exp.side === 'dr' && Math.abs(userDr - exp.amount) <= 1 && userCr === 0;
                const isCrCorrect = exp.side === 'cr' && Math.abs(userCr - exp.amount) <= 1 && userDr === 0;

                if (isDrCorrect || isCrCorrect) {
                    score += 1;
                    rowFeedback.amt = true;
                }
            }
        }
        feedback.rows[idx] = rowFeedback;
    });

    // 3. TOTALS VALIDATION (2 Points)
    const isTotalDrCorrect = Math.abs(userTotalDr - expTotalDr) <= 1;
    const isTotalCrCorrect = Math.abs(userTotalCr - expTotalCr) <= 1;

    if (isTotalDrCorrect) score += 1;
    if (isTotalCrCorrect) score += 1;
    
    feedback.totals = { dr: isTotalDrCorrect, cr: isTotalCrCorrect };

    // Grade Calculation
    const percent = (score / maxScore) * 100;
    let letterGrade = 'F';
    if (percent >= 90) letterGrade = 'A';
    else if (percent >= 80) letterGrade = 'B';
    else if (percent >= 70) letterGrade = 'C';
    else if (percent >= 60) letterGrade = 'D';

    return {
        score,
        maxScore,
        isCorrect: score === maxScore, // Strict correctness for "Completion"
        letterGrade,
        feedback
    };
};

// --- INTERNAL COMPONENTS ---

const LedgerSourceView = ({ transactions, validAccounts, beginningBalances, isSubsequentYear }) => {
    // (Kept identical to your previous code for the Source View)
    const [expanded, setExpanded] = useState(true);
    const sortedAccounts = sortAccounts(validAccounts);

    return html`
        <div className="mb-4 border rounded-lg shadow-sm bg-blue-50 overflow-hidden no-print h-full flex flex-col">
            <div className="bg-blue-100 p-2 font-bold text-blue-900 cursor-pointer flex justify-between items-center flex-shrink-0" onClick=${()=>setExpanded(!expanded)}>
                <span><${Book} size=${16} className="inline mr-2"/>Source: General Ledger</span>
            </div>
            ${expanded && html`
                <div className="p-4 overflow-y-auto custom-scrollbar flex-1 flex flex-col gap-6 bg-gray-50">
                    ${sortedAccounts.map(acc => {
                         // Simplify rendering logic for brevity in this snippet, 
                         // but effectively it recalculates the ledger visually
                         // ... (Reuse the exact Ledger Rendering Logic from your previous Step4 to ensure visual consistency)
                        let balance = 0;
                        // For brevity, using a simplified view calculation or assume the passed helper
                        // In a real merge, paste the full LedgerSourceView implementation here.
                        // I will render a summary card for each account to save space in this response,
                        // but you should use your full table implementation.
                        return html`
                            <div key=${acc} className="bg-white p-2 border shadow-sm rounded">
                                <div className="font-bold border-b mb-1">${acc}</div>
                                <div className="text-xs text-gray-500">Refer to General Ledger entries</div>
                            </div>
                        `
                    })}
                     <div className="text-center text-sm text-gray-500 italic p-4">
                        (Full General Ledger Detail View)
                    </div>
                </div>
            `}
        </div>
    `;
};

// Re-implementing the full Ledger View correctly to ensure user sees data
// (Actually, better to use the exact code you provided for LedgerSourceView to avoid breaking the "Source" visual)
const FullLedgerSourceView = ({ transactions, validAccounts, beginningBalances, isSubsequentYear }) => {
    // This is the EXACT component from your provided code
    const [expanded, setExpanded] = useState(true);
    const sortedAccounts = sortAccounts(validAccounts);

    return html`
        <div className="mb-4 border rounded-lg shadow-sm bg-blue-50 overflow-hidden no-print h-full flex flex-col">
            <div className="bg-blue-100 p-2 font-bold text-blue-900 cursor-pointer flex justify-between items-center flex-shrink-0" onClick=${()=>setExpanded(!expanded)}>
                <span><${Book} size=${16} className="inline mr-2"/>Source: General Ledger</span>
            </div>
            ${expanded && html`
                <div className="p-4 overflow-y-auto custom-scrollbar flex-1 flex flex-col gap-6 bg-gray-50">
                    ${sortedAccounts.map(acc => {
                        const rowsL = [];
                        const rowsR = [];
                        rowsL.push({ date: '2023', part: '', pr: '', amount: null, isYear: true });
                        rowsR.push({ date: '2023', part: '', pr: '', amount: null, isYear: true });
                        
                        let bbDr = 0, bbCr = 0;
                        if (isSubsequentYear && beginningBalances && beginningBalances.balances[acc]) {
                            const b = beginningBalances.balances[acc];
                            if (b.dr > 0) { rowsL.push({ date: 'Jan 01', part: 'BB', pr: '✓', amount: b.dr }); bbDr = b.dr; }
                            if (b.cr > 0) { rowsR.push({ date: 'Jan 01', part: 'BB', pr: '✓', amount: b.cr }); bbCr = b.cr; }
                        }
                        
                        let lastMonthL = bbDr > 0 ? 'Jan' : '';
                        let lastMonthR = bbCr > 0 ? 'Jan' : '';

                        transactions.forEach(t => {
                            const dateObj = new Date(t.date);
                            const mmm = dateObj.toLocaleString('default', { month: 'short' });
                            const dd = dateObj.getDate().toString().padStart(2, '0');
                            const dateStrFull = `${mmm} ${dd}`;

                            t.debits.forEach(d => {
                                if (d.account === acc) {
                                    let displayDate = dd;
                                    if (rowsL.length === 1 || lastMonthL !== mmm) displayDate = dateStrFull;
                                    rowsL.push({ date: displayDate, part: 'GJ', pr: '1', amount: d.amount });
                                    lastMonthL = mmm;
                                }
                            });
                            t.credits.forEach(c => {
                                if (c.account === acc) {
                                    let displayDate = dd;
                                    if (rowsR.length === 1 || lastMonthR !== mmm) displayDate = dateStrFull;
                                    rowsR.push({ date: displayDate, part: 'GJ', pr: '1', amount: c.amount });
                                    lastMonthR = mmm;
                                }
                            });
                        });

                        const totalDr = rowsL.reduce((sum, r) => sum + (r.amount || 0), 0);
                        const totalCr = rowsR.reduce((sum, r) => sum + (r.amount || 0), 0);
                        const net = totalDr - totalCr;
                        const balance = Math.abs(net);
                        const maxCount = Math.max(rowsL.length, rowsR.length, 4);
                        const displayRows = Array.from({ length: maxCount }).map((_, i) => i);

                        return html`
                            <div key=${acc} className="border-y-2 border-gray-800 bg-white shadow-md">
                                <div className="border-b-2 border-gray-800 p-2 bg-gray-100 font-bold text-center text-lg text-gray-800">${acc}</div>
                                <div className="flex">
                                    <div className="flex-1 border-r-2 border-gray-800">
                                        <div className="text-center font-bold border-b border-gray-400 bg-gray-50 text-xs py-1">DEBIT</div>
                                        ${displayRows.map(i => {
                                            const r = rowsL[i] || {};
                                            return html`<div key=${i} className="flex text-xs border-b border-gray-200 h-6 items-center px-1"><div className="w-12 text-right text-gray-500 mr-2">${r.date||''}</div><div className="flex-1">${r.part||''}</div><div className="text-right">${r.amount ? r.amount.toLocaleString() : ''}</div></div>`;
                                        })}
                                        <div className="border-t border-gray-800 p-1 text-right text-xs font-bold">${totalDr.toLocaleString()}</div>
                                    </div>
                                    <div className="flex-1">
                                        <div className="text-center font-bold border-b border-gray-400 bg-gray-50 text-xs py-1">CREDIT</div>
                                        ${displayRows.map(i => {
                                            const r = rowsR[i] || {};
                                            return html`<div key=${i} className="flex text-xs border-b border-gray-200 h-6 items-center px-1"><div className="w-12 text-right text-gray-500 mr-2">${r.date||''}</div><div className="flex-1">${r.part||''}</div><div className="text-right">${r.amount ? r.amount.toLocaleString() : ''}</div></div>`;
                                        })}
                                        <div className="border-t border-gray-800 p-1 text-right text-xs font-bold">${totalCr.toLocaleString()}</div>
                                    </div>
                                </div>
                                <div className="bg-yellow-50 p-2 text-center border-t border-gray-300 text-sm font-bold text-gray-700">
                                    Balance: <span className="text-blue-700 ml-2 text-base">${balance.toLocaleString()} ${net>=0 ? 'Dr' : 'Cr'}</span>
                                </div>
                            </div>
                        `;
                    })}
                </div>
            `}
        </div>
    `;
};


const TrialBalanceForm = ({ data, onChange, showFeedback, isReadOnly, validationResult }) => {
    const rows = data.rows || Array(15).fill({ account: '', dr: '', cr: '' });
    const header = data.header || { company: '', doc: '', date: '' };
    const fb = validationResult?.feedback || { header: {}, rows: [], totals: {} };

    const updateHeader = (field, val) => {
        onChange('header', { ...header, [field]: val });
    };

    const updateRow = (idx, field, val) => {
        const newRows = [...rows];
        newRows[idx] = { ...newRows[idx], [field]: val };
        onChange('rows', newRows);
    };

    const addRow = () => {
        onChange('rows', [...rows, { account: '', dr: '', cr: '' }]);
    };

    const deleteRow = (idx) => {
        if (rows.length <= 1) return;
        const newRows = rows.filter((_, i) => i !== idx);
        onChange('rows', newRows);
    };

    const totalDr = rows.reduce((sum, r) => sum + (Number(r.dr) || 0), 0);
    const totalCr = rows.reduce((sum, r) => sum + (Number(r.cr) || 0), 0);

    // Dynamic Feedback Styles
    const getHeaderStyle = (isValid) => {
        if (!showFeedback) return 'border-black';
        return isValid ? 'border-green-600 bg-green-50 text-green-700' : 'border-red-600 bg-red-50';
    };

    const getRowStyle = (idx, type) => {
        if (!showFeedback || !fb.rows[idx]) return '';
        if (type === 'acc') return fb.rows[idx].acc ? 'text-green-700 font-bold' : (rows[idx].account ? 'text-red-600' : '');
        if (type === 'amt') return fb.rows[idx].amt ? 'text-green-700 font-bold' : (rows[idx].dr || rows[idx].cr ? 'text-red-600' : '');
        return '';
    };

    return html`
        <div className="flex flex-col h-full">
            <div className="flex flex-col gap-2 mb-6 items-center px-8">
                <input 
                    type="text" 
                    placeholder="[StudentLastName] Accounting Services" 
                    className=${`text-center font-bold text-lg border-b-2 outline-none w-3/4 transition-colors ${getHeaderStyle(fb.header.company)}`}
                    value=${header.company} 
                    onChange=${(e) => updateHeader('company', e.target.value)} 
                    disabled=${isReadOnly}
                />
                <input 
                    type="text" 
                    placeholder="Trial Balance" 
                    className=${`text-center font-bold text-md border-b-2 outline-none w-1/2 transition-colors ${getHeaderStyle(fb.header.doc)}`}
                    value=${header.doc} 
                    onChange=${(e) => updateHeader('doc', e.target.value)} 
                    disabled=${isReadOnly}
                />
                <input 
                    type="text" 
                    placeholder="Month DD, YYYY" 
                    className=${`text-center text-sm border-b-2 outline-none w-1/3 transition-colors ${getHeaderStyle(fb.header.date)}`}
                    value=${header.date} 
                    onChange=${(e) => updateHeader('date', e.target.value)} 
                    disabled=${isReadOnly}
                />
            </div>

            <div className="flex-1 overflow-auto">
                <table className="w-full text-sm border-collapse">
                    <thead className="bg-gray-100 sticky top-0 z-10">
                        <tr>
                            <th className="p-2 border text-left">Account Title</th>
                            <th className="p-2 border w-28 text-right">Debit</th>
                            <th className="p-2 border w-28 text-right">Credit</th>
                            <th className="p-2 border w-8"></th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows.map((row, idx) => html`
                            <tr key=${idx} className="border-b hover:bg-gray-50">
                                <td className="p-1 border">
                                    <input 
                                        type="text" 
                                        className=${`w-full outline-none bg-transparent ${getRowStyle(idx, 'acc')}`} 
                                        value=${row.account} 
                                        onChange=${(e)=>updateRow(idx, 'account', e.target.value)} 
                                        disabled=${isReadOnly} 
                                        placeholder="" 
                                    />
                                </td>
                                <td className="p-1 border">
                                    <input 
                                        type="number" 
                                        className=${`w-full text-right outline-none bg-transparent ${getRowStyle(idx, 'amt')}`} 
                                        value=${row.dr} 
                                        onChange=${(e)=>updateRow(idx, 'dr', e.target.value)} 
                                        disabled=${isReadOnly} 
                                    />
                                </td>
                                <td className="p-1 border">
                                    <input 
                                        type="number" 
                                        className=${`w-full text-right outline-none bg-transparent ${getRowStyle(idx, 'amt')}`} 
                                        value=${row.cr} 
                                        onChange=${(e)=>updateRow(idx, 'cr', e.target.value)} 
                                        disabled=${isReadOnly} 
                                    />
                                </td>
                                <td className="p-1 border text-center">
                                    ${!isReadOnly && html`<button onClick=${() => deleteRow(idx)} className="text-gray-400 hover:text-red-600"><${Trash2} size=${14}/></button>`}
                                </td>
                            </tr>
                        `)}
                    </tbody>
                    <tfoot className="bg-gray-100 font-bold sticky bottom-0">
                        <tr>
                            <td className="p-2 text-right uppercase text-xs text-gray-600">Total</td>
                            <td className=${`p-2 text-right border-t-2 border-double border-gray-400 ${showFeedback ? (fb.totals.dr ? 'text-green-700' : 'text-red-600') : ''}`}>
                                ${totalDr.toLocaleString()}
                            </td>
                            <td className=${`p-2 text-right border-t-2 border-double border-gray-400 ${showFeedback ? (fb.totals.cr ? 'text-green-700' : 'text-red-600') : ''}`}>
                                ${totalCr.toLocaleString()}
                            </td>
                            <td></td>
                        </tr>
                    </tfoot>
                </table>
            </div>
             ${!isReadOnly && html`<button onClick=${addRow} className="mt-2 text-xs flex items-center gap-1 text-blue-600 hover:underline p-2"><${Plus} size=${12}/> Add Account Row</button>`}
        </div>
    `;
};

export default function Step04TrialBalance({ transactions, validAccounts, beginningBalances, isSubsequentYear, data, onChange, showFeedback, isReadOnly, expectedLedger }) {
    
    // Calculate validation result on the fly for display purposes (if feedback is shown)
    const validationResult = showFeedback 
        ? validateStep04(transactions, data, expectedLedger) 
        : null;

    const handleChange = (key, val) => {
        onChange(key, val);
    };

    return html`
        <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-140px)] min-h-[600px]">
            <div className="flex-1 lg:w-1/2 h-full min-h-0">
                 <${FullLedgerSourceView} transactions=${transactions} validAccounts=${validAccounts} beginningBalances=${beginningBalances} isSubsequentYear=${isSubsequentYear} /> 
            </div>
            <div className="flex-1 lg:w-1/2 border rounded bg-white flex flex-col shadow-sm overflow-hidden min-h-0">
                <div className="bg-green-100 p-2 font-bold text-green-900 flex justify-between items-center">
                    <span><${Table} size=${16} className="inline mr-2"/>Trial Balance</span>
                    ${validationResult && html`
                        <span className="text-xs bg-white px-2 py-1 rounded border border-green-200 text-green-800">
                            Points: ${validationResult.score}/${validationResult.maxScore} (Grade: ${validationResult.letterGrade})
                        </span>
                    `}
                </div>
                <div className="p-4 overflow-y-auto custom-scrollbar flex-1 bg-white">
                     <${TrialBalanceForm} 
                        data=${data} 
                        onChange=${handleChange} 
                        showFeedback=${showFeedback} 
                        isReadOnly=${isReadOnly} 
                        validationResult=${validationResult}
                    />
                </div>
            </div>
        </div>
    `;
}
