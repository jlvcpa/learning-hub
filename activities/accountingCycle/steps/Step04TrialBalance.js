// --- Step04TrialBalance.js ---
import React, { useState } from 'https://esm.sh/react@18.2.0';
import htm from 'https://esm.sh/htm';
import { Book, Check, X, Table, Trash2, Plus, AlertCircle } from 'https://esm.sh/lucide-react@0.263.1';
import { sortAccounts, getLetterGrade } from '../utils.js';

const html = htm.bind(React.createElement);

// --- HELPER FUNCTIONS ---

const getLastDayOfMonth = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = date.getMonth();
    const lastDay = new Date(year, month + 1, 0);
    return lastDay.toLocaleString('default', { month: 'long', day: 'numeric', year: 'numeric' });
};

// --- VALIDATION LOGIC ---
export const validateStep04 = (transactions, data, expectedLedger) => {
    // Safety guard
    if (!expectedLedger || !data) {
        return { 
            score: 0, maxScore: 0, isCorrect: false, letterGrade: 'IR', 
            feedback: { header: {}, rows: [], totals: {} } 
        };
    }

    let score = 0;
    let maxScore = 0;
    const feedback = { header: {}, rows: [], totals: {} };
    
    // 1. HEADER VALIDATION (3 Points)
    maxScore += 3;
    const header = data.header || {};
    
    // A. Company Name
    const companyName = (header.company || '').trim();
    const isCompanyValid = companyName.length > 3; 
    if (isCompanyValid) score += 1;
    feedback.header.company = isCompanyValid;

    // B. Document Name
    const docName = (header.doc || '').trim().toLowerCase();
    const isDocValid = docName === 'trial balance';
    if (isDocValid) score += 1;
    feedback.header.doc = isDocValid;

    // C. Date
    const targetDate = getLastDayOfMonth(transactions ? transactions[0]?.date : '');
    const inputDate = (header.date || '').trim();
    const isDateValid = targetDate && inputDate.toLowerCase() === targetDate.toLowerCase();
    if (isDateValid) score += 1;
    feedback.header.date = isDateValid;

    // 2. BODY VALIDATION
    const rows = data.rows || [];
    const totals = data.totals || { dr: '', cr: '' };
    const expectedAccounts = Object.keys(expectedLedger);
    
    // Calculate Expected Totals & Map for Lookup
    let expTotalDr = 0;
    let expTotalCr = 0;
    const expBalances = {};

    expectedAccounts.forEach(acc => {
        const net = expectedLedger[acc].debit - expectedLedger[acc].credit;
        const absNet = Math.abs(net);
        if (absNet > 0) { 
            expBalances[acc] = { amount: absNet, side: net >= 0 ? 'dr' : 'cr' };
            if (net >= 0) expTotalDr += net;
            else expTotalCr += Math.abs(net);
            maxScore += 2; // 1 for Acc Name, 1 for Amount
        }
    });

    // Max Score for Totals
    maxScore += 2;

    const processedAccounts = new Set();

    rows.forEach((row, idx) => {
        const userAcc = (row.account || '').trim();
        const userDr = Number(row.dr) || 0;
        const userCr = Number(row.cr) || 0;
        
        const rowFeedback = { acc: false, amt: false };
        
        if (userAcc) {
            const matchedKey = Object.keys(expBalances).find(k => k.toLowerCase() === userAcc.toLowerCase());
            
            if (matchedKey && !processedAccounts.has(matchedKey)) {
                // Point 1: Account Name Match
                score += 1;
                rowFeedback.acc = true;
                processedAccounts.add(matchedKey);

                // Point 2: Correct Amount AND Side
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

    // 3. TOTALS VALIDATION (Compare USER INPUT to EXPECTED SUMS)
    const userTotalDrInput = Number(totals.dr) || 0;
    const userTotalCrInput = Number(totals.cr) || 0;

    const isTotalDrCorrect = Math.abs(userTotalDrInput - expTotalDr) <= 1;
    const isTotalCrCorrect = Math.abs(userTotalCrInput - expTotalCr) <= 1;

    if (isTotalDrCorrect) score += 1;
    if (isTotalCrCorrect) score += 1;
    
    feedback.totals = { dr: isTotalDrCorrect, cr: isTotalCrCorrect };

    // Grade Calculation using Utility
    const letterGrade = getLetterGrade(score, maxScore);

    return { score, maxScore, isCorrect: score === maxScore, letterGrade, feedback };
};

// --- INTERNAL COMPONENTS ---

const StatusIcon = ({ correct, show }) => {
    if (!show) return null;
    return correct 
        ? html`<${Check} size=${16} className="text-green-600 inline ml-1 flex-shrink-0" strokeWidth=${3} />` 
        : html`<${X} size=${16} className="text-red-600 inline ml-1 flex-shrink-0" strokeWidth=${3} />`;
};

const LedgerSourceView = ({ transactions, validAccounts, beginningBalances, isSubsequentYear }) => {
    const [expanded, setExpanded] = useState(true);
    const sortedAccounts = sortAccounts(validAccounts || []);

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

                        if (transactions) {
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
                        }

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
                                    Balance: <span className="text-blue-700 ml-2 text-base">${balance.toLocaleString()}</span>
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
    const totals = data.totals || { dr: '', cr: '' };
    const fb = validationResult?.feedback || { header: {}, rows: [], totals: {} };

    const updateHeader = (field, val) => {
        onChange('header', { ...header, [field]: val });
    };

    const updateRow = (idx, field, val) => {
        const newRows = [...rows];
        newRows[idx] = { ...newRows[idx], [field]: val };
        onChange('rows', newRows);
    };
    
    const updateTotals = (field, val) => {
        onChange('totals', { ...totals, [field]: val });
    };

    const addRow = () => {
        onChange('rows', [...rows, { account: '', dr: '', cr: '' }]);
    };

    const deleteRow = (idx) => {
        if (rows.length <= 1) return;
        const newRows = rows.filter((_, i) => i !== idx);
        onChange('rows', newRows);
    };

    const getHeaderStyle = (isValid) => {
        if (!showFeedback) return 'border-black';
        return isValid ? 'border-green-600 bg-green-50 text-green-700' : 'border-red-600 bg-red-50';
    };

    return html`
        <div className="flex flex-col h-full">
            
            <div className="flex flex-col gap-2 mb-6 items-center px-8 mt-2">
                <div className="w-3/4 flex items-center justify-center relative">
                    <input type="text" placeholder="[StudentLastName] Accounting Services" className=${`text-center font-bold text-lg border-b-2 outline-none w-full transition-colors ${getHeaderStyle(fb.header.company)}`} value=${header.company} onChange=${(e) => updateHeader('company', e.target.value)} disabled=${isReadOnly}/>
                    <div className="absolute -right-6"><${StatusIcon} show=${showFeedback} correct=${fb.header.company} /></div>
                </div>
                <div className="w-1/2 flex items-center justify-center relative">
                    <input type="text" placeholder="Trial Balance" className=${`text-center font-bold text-md border-b-2 outline-none w-full transition-colors ${getHeaderStyle(fb.header.doc)}`} value=${header.doc} onChange=${(e) => updateHeader('doc', e.target.value)} disabled=${isReadOnly}/>
                    <div className="absolute -right-6"><${StatusIcon} show=${showFeedback} correct=${fb.header.doc} /></div>
                </div>
                <div className="w-1/3 flex items-center justify-center relative">
                    <input type="text" placeholder="Month DD, YYYY" className=${`text-center text-sm border-b-2 outline-none w-full transition-colors ${getHeaderStyle(fb.header.date)}`} value=${header.date} onChange=${(e) => updateHeader('date', e.target.value)} disabled=${isReadOnly}/>
                    <div className="absolute -right-6"><${StatusIcon} show=${showFeedback} correct=${fb.header.date} /></div>
                </div>
            </div>

            <div className="flex-1 overflow-auto px-2">
                <table className="w-full text-sm border-collapse">
                    <thead className="bg-gray-100 sticky top-0 z-10 shadow-sm">
                        <tr>
                            <th className="p-2 border text-left">Account Title</th>
                            <th className="p-2 border w-28 text-right">Debit</th>
                            <th className="p-2 border w-28 text-right">Credit</th>
                            <th className="p-2 border w-8"></th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows.map((row, idx) => {
                            const rowFB = fb.rows[idx] || {};
                            const hasAccInput = row.account && row.account.trim().length > 0;
                            const hasAmtInput = Number(row.dr) > 0 || Number(row.cr) > 0;

                            return html`
                            <tr key=${idx} className="border-b hover:bg-gray-50">
                                <td className="p-1 border relative">
                                    <div className="flex items-center">
                                        <input type="text" className="w-full outline-none bg-transparent" value=${row.account} onChange=${(e)=>updateRow(idx, 'account', e.target.value)} disabled=${isReadOnly} />
                                        ${hasAccInput && html`<${StatusIcon} show=${showFeedback} correct=${rowFB.acc} />`}
                                    </div>
                                </td>
                                <td className="p-1 border relative">
                                    <div className="flex items-center">
                                        <input type="number" className="w-full text-right outline-none bg-transparent" value=${row.dr} onChange=${(e)=>updateRow(idx, 'dr', e.target.value)} disabled=${isReadOnly} />
                                        ${Number(row.dr) > 0 && html`<${StatusIcon} show=${showFeedback} correct=${rowFB.amt} />`}
                                    </div>
                                </td>
                                <td className="p-1 border relative">
                                    <div className="flex items-center">
                                        <input type="number" className="w-full text-right outline-none bg-transparent" value=${row.cr} onChange=${(e)=>updateRow(idx, 'cr', e.target.value)} disabled=${isReadOnly} />
                                        ${Number(row.cr) > 0 && html`<${StatusIcon} show=${showFeedback} correct=${rowFB.amt} />`}
                                    </div>
                                </td>
                                <td className="p-1 border text-center">
                                    ${!isReadOnly && html`<button onClick=${() => deleteRow(idx)} className="text-gray-400 hover:text-red-600"><${Trash2} size=${14}/></button>`}
                                </td>
                            </tr>
                        `})} 
                    </tbody>
                    <tfoot className="bg-gray-100 font-bold sticky bottom-0 border-t-2 border-gray-300">
                        <tr>
                            <td className="p-2 text-right uppercase text-xs text-gray-600">Total</td>
                            <td className="p-1 border-double border-gray-400 relative">
                                <div className="flex items-center justify-end">
                                    <input 
                                        type="number" 
                                        className=${`w-full text-right outline-none bg-transparent font-bold ${showFeedback ? (fb.totals.dr ? 'text-green-700' : 'text-red-600') : ''}`} 
                                        value=${totals.dr} 
                                        onChange=${(e) => updateTotals('dr', e.target.value)}
                                        disabled=${isReadOnly}
                                        placeholder="0"
                                    />
                                    ${(totals.dr !== '' && Number(totals.dr) > 0) && html`<${StatusIcon} show=${showFeedback} correct=${fb.totals.dr} />`}
                                </div>
                            </td>
                            <td className="p-1 border-double border-gray-400 relative">
                                <div className="flex items-center justify-end">
                                    <input 
                                        type="number" 
                                        className=${`w-full text-right outline-none bg-transparent font-bold ${showFeedback ? (fb.totals.cr ? 'text-green-700' : 'text-red-600') : ''}`} 
                                        value=${totals.cr} 
                                        onChange=${(e) => updateTotals('cr', e.target.value)}
                                        disabled=${isReadOnly}
                                        placeholder="0"
                                    />
                                    ${(totals.cr !== '' && Number(totals.cr) > 0) && html`<${StatusIcon} show=${showFeedback} correct=${fb.totals.cr} />`}
                                </div>
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
    const validationResult = showFeedback 
        ? validateStep04(transactions, data, expectedLedger) 
        : null;

    const result = validationResult || {};

    const handleChange = (key, val) => {
        onChange(key, val);
    };

    return html`
        <div className="flex flex-col h-[calc(100vh-140px)] min-h-[600px]">
            ${showFeedback && html`
                <div className="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-2 mb-4 flex justify-between items-center shadow-sm w-full flex-shrink-0">
                    <span className="font-bold flex items-center gap-2"><${AlertCircle} size=${18}/> Validation Results:</span>
                    <span className="font-mono font-bold text-lg">Score: ${result.score || 0} of ${result.maxScore || 0} - (${result.letterGrade || 'IR'})</span>
                </div>
            `}

            <div className="flex flex-col lg:flex-row gap-4 flex-1 min-h-0">
                <div className="flex-1 lg:w-1/2 h-full min-h-0">
                     <${LedgerSourceView} transactions=${transactions} validAccounts=${validAccounts} beginningBalances=${beginningBalances} isSubsequentYear=${isSubsequentYear} /> 
                </div>
                <div className="flex-1 lg:w-1/2 border rounded bg-white flex flex-col shadow-sm overflow-hidden min-h-0">
                    <div className="bg-green-100 p-2 font-bold text-green-900 flex justify-between items-center">
                        <span><${Table} size=${16} className="inline mr-2"/>Trial Balance</span>
                    </div>
                    <div className="p-0 overflow-y-auto custom-scrollbar flex-1 bg-white">
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
        </div>
    `;
}
