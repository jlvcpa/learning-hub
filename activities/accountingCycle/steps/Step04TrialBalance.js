// --- Step04TrialBalance.js ---
import React, { useState } from 'https://esm.sh/react@18.2.0';
import htm from 'https://esm.sh/htm';
import { Book, Check, X, ChevronDown, ChevronRight, Table, Trash2, Plus } from 'https://esm.sh/lucide-react@0.263.1';
import { sortAccounts, getLetterGrade } from '../utils.js';

const html = htm.bind(React.createElement);

// --- HELPER: NORMALIZE STRINGS ---
const norm = (str) => (str || '').toString().toLowerCase().trim();

// --- HELPER: CALCULATE EXPECTED DATA ---
const getExpectedData = (activityData) => {
    const { ledger, transactions } = activityData;
    
    // 1. Calculate Date (End of Month of first transaction)
    let dateStr = "";
    if (transactions && transactions.length > 0) {
        const tDate = new Date(transactions[0].date);
        const year = tDate.getFullYear();
        const month = tDate.getMonth(); // 0-indexed
        const lastDay = new Date(year, month + 1, 0); // Last day of month
        dateStr = lastDay.toLocaleString('default', { month: 'long', day: 'numeric', year: 'numeric' });
    }

    // 2. Process Accounts
    const accounts = {};
    let totalDr = 0;
    let totalCr = 0;

    Object.entries(ledger).forEach(([acc, val]) => {
        const net = (val.debit || 0) - (val.credit || 0);
        if (net !== 0) {
            const amount = Math.abs(net);
            const type = net > 0 ? 'dr' : 'cr';
            accounts[acc] = { amount, type };
            
            if (type === 'dr') totalDr += amount;
            else totalCr += amount;
        }
    });

    return {
        dateStr,
        accounts, // { "Cash": { amount: 50000, type: 'dr' } }
        totalDr,
        totalCr
    };
};

// --- VALIDATION FUNCTION ---
export const validateStep04 = (activityData, studentAnswer) => {
    const expected = getExpectedData(activityData);
    const rows = studentAnswer.rows || [];
    const footers = studentAnswer.footers || {};
    const header = studentAnswer.header || {};

    let totalScore = 0;
    let maxScore = 0;
    const validationDetails = { header: {}, rows: [], footers: {} };

    // --- 1. HEADER SCORING (3 pts) ---
    maxScore += 3;

    // Company Name: Ends with " Accounting Services" and has content before it
    const compName = header.company || "";
    const compValid = compName.length > 20 && norm(compName).endsWith("accounting services");
    if (compValid) { totalScore++; validationDetails.header.company = true; } 
    else { validationDetails.header.company = false; }

    // Document Name: "Trial Balance"
    const docName = header.doc || "";
    if (norm(docName) === "trial balance") { totalScore++; validationDetails.header.doc = true; }
    else { validationDetails.header.doc = false; }

    // Date
    const dateInput = header.date || "";
    // Allow strict match or just "Month Day, Year"
    if (norm(dateInput) === norm(expected.dateStr)) { totalScore++; validationDetails.header.date = true; }
    else { validationDetails.header.date = false; }


    // --- 2. ROW SCORING (2 pts per expected account) ---
    // 1 pt for Account Title, 1 pt for Amount in correct column
    
    // We iterate through student rows to match against expected
    // Any expected account not found is missed points.
    // Any extra student row that shouldn't exist is a deduction.

    const expectedAccounts = { ...expected.accounts }; // Copy to track usage
    const expectedKeys = Object.keys(expected.accounts);
    maxScore += (expectedKeys.length * 2);

    rows.forEach((row, idx) => {
        const res = { acc: null, dr: null, cr: null };
        const uAcc = row.account;
        
        // Find matching expected account (case insensitive)
        const expKey = Object.keys(expectedAccounts).find(k => norm(k) === norm(uAcc));
        
        if (expKey) {
            // Account Match Found
            totalScore += 1;
            res.acc = true;
            
            const expData = expectedAccounts[expKey];
            const uDr = Number(row.dr) || 0;
            const uCr = Number(row.cr) || 0;

            if (expData.type === 'dr') {
                // Expect Debit
                if (Math.abs(uDr - expData.amount) <= 1 && uCr === 0) {
                    totalScore += 1;
                    res.dr = true;
                } else {
                    res.dr = false;
                }
                // If they put something in Cr when it should be Dr, mark Cr false too
                if (uCr !== 0) res.cr = false;

            } else {
                // Expect Credit
                if (Math.abs(uCr - expData.amount) <= 1 && uDr === 0) {
                    totalScore += 1;
                    res.cr = true;
                } else {
                    res.cr = false;
                }
                if (uDr !== 0) res.dr = false;
            }

            // Remove from tracking to detect missing ones later (optional, but good for robust logic)
            // For now, we just validate what is present. 
            // The Max Score is based on Expected, so missing rows naturally result in lower score.
            delete expectedAccounts[expKey];

        } else if (uAcc || row.dr || row.cr) {
            // Extra / Wrong Row -> Deductions
            // Logic: "no point... if answered will be marked X and deducted"
            if (uAcc) { totalScore -= 1; res.acc = false; }
            if (row.dr) { totalScore -= 1; res.dr = false; }
            if (row.cr) { totalScore -= 1; res.cr = false; }
        }

        validationDetails.rows[idx] = res;
    });

    // --- 3. TOTALS SCORING (2 pts) ---
    maxScore += 2;

    const uTotalDr = Number(footers.totalDr) || 0;
    const uTotalCr = Number(footers.totalCr) || 0;

    if (Math.abs(uTotalDr - expected.totalDr) <= 1) { totalScore++; validationDetails.footers.dr = true; }
    else { validationDetails.footers.dr = false; }

    if (Math.abs(uTotalCr - expected.totalCr) <= 1) { totalScore++; validationDetails.footers.cr = true; }
    else { validationDetails.footers.cr = false; }

    if (totalScore < 0) totalScore = 0;

    return {
        isCorrect: totalScore === maxScore && maxScore > 0,
        score: totalScore,
        maxScore: maxScore,
        letterGrade: getLetterGrade(totalScore, maxScore),
        validationDetails
    };
};


// --- INTERNAL COMPONENTS ---

const ValidationIcon = ({ status, show }) => {
    if (!show || status === undefined || status === null) return null;
    return html`
        <div className="absolute top-1 right-1 pointer-events-none z-10">
            ${status === true 
                ? html`<${Check} size=${12} className="text-green-600 bg-white rounded-full opacity-80 shadow-sm" />` 
                : html`<${X} size=${12} className="text-red-600 bg-white rounded-full opacity-80 shadow-sm" />`
            }
        </div>
    `;
};

// Reusing Ledger Source View from Step 3 logic (simplified for read-only viewing)
const LedgerSourceView = ({ transactions, validAccounts, beginningBalances, isSubsequentYear }) => {
    const [expanded, setExpanded] = useState(true);
    const sortedAccounts = sortAccounts(validAccounts);

    return html`
        <div className="mb-4 border rounded-lg shadow-sm bg-blue-50 overflow-hidden no-print h-full flex flex-col">
            <div className="bg-blue-100 p-2 font-bold text-blue-900 cursor-pointer flex justify-between items-center flex-shrink-0" onClick=${()=>setExpanded(!expanded)}>
                <span><${Book} size=${16} className="inline mr-2"/>Source: General Ledger</span>
                <div className="flex items-center gap-4">
                    ${expanded ? html`<${ChevronDown} size=${16}/>` : html`<${ChevronRight} size=${16}/>`}
                </div>
            </div>
            ${expanded && html`
                <div className="p-4 overflow-y-auto custom-scrollbar flex-1 flex flex-col gap-6 bg-gray-50">
                    ${sortedAccounts.map(acc => {
                        // Calculate basic running balance for display
                        let bal = 0;
                        if(isSubsequentYear && beginningBalances?.balances[acc]) {
                            bal += (beginningBalances.balances[acc].dr - beginningBalances.balances[acc].cr);
                        }
                        transactions.forEach(t => {
                            t.debits.forEach(d => { if(d.account === acc) bal += d.amount; });
                            t.credits.forEach(c => { if(c.account === acc) bal -= c.amount; });
                        });
                        const absBal = Math.abs(bal);
                        const type = bal >= 0 ? 'Dr' : 'Cr';

                        return html`
                            <div key=${acc} className="border border-gray-300 bg-white shadow-sm p-2 rounded">
                                <div className="font-bold text-sm text-gray-800 border-b pb-1 mb-1 flex justify-between">
                                    <span>${acc}</span>
                                    <span className=${`text-xs px-2 rounded ${type==='Dr'?'bg-green-100 text-green-800':'bg-red-100 text-red-800'}`}>${type} ${absBal.toLocaleString()}</span>
                                </div>
                                <div className="text-xs text-gray-500">Ending Balance: ${absBal.toLocaleString()}</div>
                            </div>
                        `;
                    })}
                </div>
            `}
        </div>
    `;
};

const TrialBalanceForm = ({ data, onChange, showFeedback, isReadOnly, validationDetails }) => {
    const rows = data.rows || Array(10).fill({ account: '', dr: '', cr: '' });
    const header = data.header || { company: '', doc: '', date: '' };
    const footers = data.footers || { totalDr: '', totalCr: '' };

    const updateHeader = (field, val) => onChange('header', { ...header, [field]: val });
    const updateFooter = (field, val) => onChange('footers', { ...footers, [field]: val });
    
    const updateRow = (idx, field, val) => {
        const newRows = [...rows];
        if(!newRows[idx]) newRows[idx] = {};
        newRows[idx] = { ...newRows[idx], [field]: val };
        onChange('rows', newRows);
    };

    const addRow = () => onChange('rows', [...rows, { account: '', dr: '', cr: '' }]);
    const deleteRow = (idx) => {
        if (rows.length <= 1) return;
        const newRows = rows.filter((_, i) => i !== idx);
        onChange('rows', newRows);
    };

    const vHead = validationDetails?.header || {};
    const vRows = validationDetails?.rows || [];
    const vFoot = validationDetails?.footers || {};

    return html`
        <div className="flex flex-col h-full">
            <div className="bg-gray-50 p-4 border-b text-center space-y-2">
                <div className="relative inline-block w-2/3">
                    <input type="text" className="w-full text-center font-bold text-lg border-b border-gray-400 bg-transparent outline-none placeholder-gray-400" 
                        placeholder="[Student Name] Accounting Services" 
                        value=${header.company} 
                        onChange=${(e)=>updateHeader('company', e.target.value)} 
                        disabled=${isReadOnly} 
                    />
                    <${ValidationIcon} show=${showFeedback} status=${vHead.company} />
                </div>
                <div className="relative inline-block w-1/2">
                    <input type="text" className="w-full text-center font-semibold text-md border-b border-gray-400 bg-transparent outline-none placeholder-gray-400" 
                        placeholder="Trial Balance" 
                        value=${header.doc} 
                        onChange=${(e)=>updateHeader('doc', e.target.value)} 
                        disabled=${isReadOnly} 
                    />
                    <${ValidationIcon} show=${showFeedback} status=${vHead.doc} />
                </div>
                <div className="relative inline-block w-1/2">
                    <input type="text" className="w-full text-center text-sm border-b border-gray-400 bg-transparent outline-none placeholder-gray-400" 
                        placeholder="Month Day, Year" 
                        value=${header.date} 
                        onChange=${(e)=>updateHeader('date', e.target.value)} 
                        disabled=${isReadOnly} 
                    />
                    <${ValidationIcon} show=${showFeedback} status=${vHead.date} />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto">
                <table className="w-full text-sm border-collapse">
                    <thead className="bg-gray-100 sticky top-0 z-10 shadow-sm">
                        <tr>
                            <th className="p-2 border text-left">Account Title</th>
                            <th className="p-2 border w-32 text-right">Debit</th>
                            <th className="p-2 border w-32 text-right">Credit</th>
                            <th className="p-2 border w-8"></th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows.map((row, idx) => {
                            const rVal = vRows[idx] || {};
                            return html`
                                <tr key=${idx} className="border-b hover:bg-gray-50">
                                    <td className="p-1 border relative">
                                        <input type="text" className="w-full outline-none bg-transparent px-2" value=${row.account||''} onChange=${(e)=>updateRow(idx, 'account', e.target.value)} disabled=${isReadOnly} placeholder="Account Name" />
                                        <${ValidationIcon} show=${showFeedback} status=${rVal.acc} />
                                    </td>
                                    <td className="p-1 border relative">
                                        <input type="number" className="w-full text-right outline-none bg-transparent px-2" value=${row.dr||''} onChange=${(e)=>updateRow(idx, 'dr', e.target.value)} disabled=${isReadOnly} />
                                        <${ValidationIcon} show=${showFeedback} status=${rVal.dr} />
                                    </td>
                                    <td className="p-1 border relative">
                                        <input type="number" className="w-full text-right outline-none bg-transparent px-2" value=${row.cr||''} onChange=${(e)=>updateRow(idx, 'cr', e.target.value)} disabled=${isReadOnly} />
                                        <${ValidationIcon} show=${showFeedback} status=${rVal.cr} />
                                    </td>
                                    <td className="p-1 border text-center">
                                        ${!isReadOnly && html`<button onClick=${() => deleteRow(idx)} className="text-gray-400 hover:text-red-600"><${Trash2} size=${14}/></button>`}
                                    </td>
                                </tr>
                            `;
                        })}
                    </tbody>
                </table>
                ${!isReadOnly && html`<button onClick=${addRow} className="m-2 text-xs flex items-center gap-1 text-blue-600 hover:underline"><${Plus} size=${12}/> Add Row</button>`}
            </div>

            <div className="bg-gray-100 border-t p-2">
                <table className="w-full text-sm font-bold">
                    <tr>
                        <td className="p-2 text-right">Total</td>
                        <td className="p-2 w-32 text-right border relative bg-white">
                            <input type="number" className="w-full text-right outline-none bg-transparent" value=${footers.totalDr} onChange=${(e)=>updateFooter('totalDr', e.target.value)} disabled=${isReadOnly} />
                            <${ValidationIcon} show=${showFeedback} status=${vFoot.dr} />
                        </td>
                        <td className="p-2 w-32 text-right border relative bg-white">
                            <input type="number" className="w-full text-right outline-none bg-transparent" value=${footers.totalCr} onChange=${(e)=>updateFooter('totalCr', e.target.value)} disabled=${isReadOnly} />
                            <${ValidationIcon} show=${showFeedback} status=${vFoot.cr} />
                        </td>
                        <td className="w-8"></td>
                    </tr>
                </table>
            </div>
        </div>
    `;
};

// --- MAIN EXPORT ---
export default function Step04TrialBalance({ activityData, data, onChange, showFeedback, isReadOnly }) {
    const { transactions, validAccounts, beginningBalances, isSubsequentYear } = activityData;
    
    // --- VALIDATION ---
    let validationDetails = {};
    let scoreInfo = { score: 0, maxScore: 0, letterGrade: 'IR' };

    if (showFeedback && activityData) {
        const result = validateStep04(activityData, data);
        validationDetails = result.validationDetails;
        scoreInfo = { score: result.score, maxScore: result.maxScore, letterGrade: result.letterGrade };
    }

    // Initialize rows if empty
    const currentData = {
        rows: data.rows || Array(validAccounts.length + 2).fill({ account: '', dr: '', cr: '' }),
        header: data.header || { company: '', doc: '', date: '' },
        footers: data.footers || { totalDr: '', totalCr: '' }
    };

    const handleDataChange = (key, val) => {
        onChange(key, val); // Pass up to App.js which merges into answers[4]
    };

    return html`
        <div className="flex flex-col gap-4 h-full">
            ${showFeedback && html`
                <div className="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-2 flex justify-between items-center shadow-sm">
                    <span className="font-bold">Validation Results:</span>
                    <span className="font-mono font-bold text-lg">Score: ${scoreInfo.score} of ${scoreInfo.maxScore} - (${scoreInfo.letterGrade})</span>
                </div>
            `}
            <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-220px)] min-h-[600px]">
                <div className="flex-1 lg:w-1/3 h-full min-h-0 hidden lg:block">
                     <${LedgerSourceView} transactions=${transactions} validAccounts=${validAccounts} beginningBalances=${beginningBalances} isSubsequentYear=${isSubsequentYear} /> 
                </div>
                <div className="flex-1 lg:w-2/3 border rounded bg-white flex flex-col shadow-sm overflow-hidden min-h-0">
                    <div className="bg-green-100 p-2 font-bold text-green-900 flex-shrink-0"><${Table} size=${16} className="inline mr-2"/>Trial Balance Workspace</div>
                    <div className="flex-1 overflow-hidden relative">
                         <${TrialBalanceForm} data=${data} onChange=${onChange} showFeedback=${showFeedback} isReadOnly=${isReadOnly} validationDetails=${validationDetails} />
                    </div>
                </div>
            </div>
        </div>
    `;
}
