// --- Step03Posting.js ---
import React, { useState } from 'https://esm.sh/react@18.2.0';
import htm from 'https://esm.sh/htm';
import { Plus, Check, X, Trash2, Book, ChevronDown, ChevronRight } from 'https://esm.sh/lucide-react@0.263.1';
import { getLetterGrade } from '../utils.js';

const html = htm.bind(React.createElement);

// --- HELPER: NORMALIZE STRING ---
const norm = (str) => (str || '').toString().toLowerCase().trim();

// --- HELPER: GENERATE EXPECTED DATA (THE ANSWER KEY) ---
const getExpectedLedgerData = (transactions, beginningBalances, validAccounts) => {
    const expected = {};

    // 1. Initialize all valid accounts
    validAccounts.forEach(acc => {
        expected[acc] = {
            rows: [], 
            begBalDr: 0,
            begBalCr: 0,
            totalDr: 0,
            totalCr: 0,
            hasDrEntries: false,
            hasCrEntries: false
        };
    });

    // 2. Process Beginning Balances
    if (beginningBalances && beginningBalances.balances) {
        Object.entries(beginningBalances.balances).forEach(([acc, bal]) => {
            if (!expected[acc]) return;
            const net = bal.dr - bal.cr;
            if (net !== 0) {
                const isDr = net > 0;
                const entry = {
                    date: 'Jan 1', 
                    part: 'BB',
                    pr: '', 
                    amount: Math.abs(net),
                    type: isDr ? 'dr' : 'cr',
                    isBegBal: true,
                    txnDateObj: new Date('2023-01-01'),
                    refKey: null // No checkbox for beginning balance
                };
                expected[acc].rows.push(entry);
                if (isDr) { expected[acc].begBalDr = Math.abs(net); expected[acc].hasDrEntries = true; }
                else { expected[acc].begBalCr = Math.abs(net); expected[acc].hasCrEntries = true; }
            }
        });
    }

    // 3. Process Transactions
    transactions.forEach((t) => {
        const dateObj = new Date(t.date);
        const mm = dateObj.toLocaleString('default', { month: 'short' });
        const dd = dateObj.getDate().toString();
        const fullDate = `${mm} ${dd}`;
        
        t.debits.forEach((d, i) => {
            if (expected[d.account]) {
                expected[d.account].rows.push({
                    date: fullDate,
                    day: dd,
                    part: 'GJ',
                    pr: '1',
                    amount: d.amount,
                    type: 'dr',
                    isBegBal: false,
                    txnDateObj: dateObj,
                    refKey: `dr-${t.id}-${i}` // LINK TO CHECKBOX
                });
                expected[d.account].totalDr += d.amount;
                expected[d.account].hasDrEntries = true;
            }
        });

        t.credits.forEach((c, i) => {
            if (expected[c.account]) {
                expected[c.account].rows.push({
                    date: fullDate,
                    day: dd,
                    part: 'GJ',
                    pr: '1',
                    amount: c.amount,
                    type: 'cr',
                    isBegBal: false,
                    txnDateObj: dateObj,
                    refKey: `cr-${t.id}-${i}` // LINK TO CHECKBOX
                });
                expected[c.account].totalCr += c.amount;
                expected[c.account].hasCrEntries = true;
            }
        });
    });

    return expected;
};

// --- VALIDATION FUNCTION ---
export const validateStep03 = (activityData, studentAnswer) => {
    const { transactions, beginningBalances, validAccounts } = activityData;
    const studentLedgers = studentAnswer.ledgers || [];
    const journalPRs = studentAnswer.journalPRs || {};
    
    // 1. Generate Answer Key
    const expectedData = getExpectedLedgerData(transactions, beginningBalances, validAccounts);
    
    let totalScore = 0;
    let maxScore = 0;
    
    // Track correctly posted transaction keys (e.g. "dr-1-0") to award points for checkboxes
    const correctlyPostedKeys = new Set();
    const validationResults = { ledgers: {}, checkboxes: {} }; 

    // --- A. CALCULATE MAX SCORE ---
    
    // Ledger Points
    Object.keys(expectedData).forEach(accName => {
        const exp = expectedData[accName];
        maxScore += 1; // Account Title
        if (exp.hasDrEntries || exp.hasCrEntries) maxScore += 1; // Balance Line

        ['dr', 'cr'].forEach(type => {
            const hasEntries = type === 'dr' ? exp.hasDrEntries : exp.hasCrEntries;
            const expRows = exp.rows.filter(r => r.type === type);
            if (hasEntries) {
                maxScore += 1; // Year
                maxScore += 1; // Total
                expRows.forEach(row => {
                    if (row.isBegBal) maxScore += 3;
                    else maxScore += 4;
                });
            }
        });
    });

    // Checkbox Points (Max Score = Total Debits + Credits)
    transactions.forEach(t => {
        maxScore += (t.debits.length + t.credits.length);
    });

    // --- B. SCORE LEDGERS FIRST (To determine valid postings) ---

    studentLedgers.forEach(l => {
        const accName = l.account;
        const exp = expectedData[accName]; 
        const ledgerRes = { acc: false, balance: false, leftRows: [], rightRows: [], drTotal: null, crTotal: null };

        if (exp) {
            // Account Title
            if (norm(l.account) === norm(accName)) {
                totalScore += 1;
                ledgerRes.acc = true;
            }

            // --- DEBIT SIDE ---
            const uLeft = l.leftRows || [];
            const eDrRows = exp.rows.filter(r => r.type === 'dr');
            
            // Year
            const uYearL = uLeft[0] || {};
            if (exp.hasDrEntries) {
                const yValid = norm(uYearL.date) === '(2023)' || norm(uYearL.date) === '2023';
                if (yValid) { totalScore += 1; ledgerRes.leftRows[0] = { date: true }; }
                else { ledgerRes.leftRows[0] = { date: false }; }
            } else if (uYearL.date) {
                totalScore -= 1; 
                ledgerRes.leftRows[0] = { date: false };
            }
            if (uYearL.part) { totalScore -= 1; ledgerRes.leftRows[0] = { ...ledgerRes.leftRows[0], part: false }; }
            if (uYearL.pr) { totalScore -= 1; ledgerRes.leftRows[0] = { ...ledgerRes.leftRows[0], pr: false }; }
            if (uYearL.amount) { totalScore -= 1; ledgerRes.leftRows[0] = { ...ledgerRes.leftRows[0], amount: false }; }

            // Rows
            eDrRows.forEach((row, i) => {
                const uRow = uLeft[i + 1] || {};
                const res = {};
                
                const expDate = i === 0 ? row.date : row.day; 
                const dValid = norm(uRow.date) === norm(expDate) || norm(uRow.date) === norm(row.date) || norm(uRow.date) === norm(row.day.padStart(2,'0'));
                if (dValid) { totalScore += 1; res.date = true; } else res.date = false;

                const pValid = norm(uRow.part) === norm(row.part);
                if (pValid) { totalScore += 1; res.part = true; } else res.part = false;

                let prValid = false;
                if (!row.isBegBal) {
                    prValid = norm(uRow.pr) === norm(row.pr);
                    if (prValid) { totalScore += 1; res.pr = true; } else res.pr = false;
                } else if (uRow.pr) {
                    totalScore -= 1; res.pr = false; 
                } else {
                    prValid = true; // technically correct empty PR for BB
                }

                const aValid = Math.abs((Number(uRow.amount) || 0) - row.amount) < 1;
                if (aValid) { totalScore += 1; res.amount = true; } else res.amount = false;

                ledgerRes.leftRows[i + 1] = res;

                // **CRITICAL**: If row is FULLY correct (excluding PR for BB), mark reference key as posted
                // For BB, prValid is effectively true if empty. For GJ, needs match.
                // We check Date, Part, PR, Amount.
                if (dValid && pValid && prValid && aValid && row.refKey) {
                    correctlyPostedKeys.add(row.refKey);
                }
            });

            // Total
            if (exp.hasDrEntries) {
                const expTot = exp.begBalDr + exp.totalDr;
                if (Math.abs((Number(l.drTotal) || 0) - expTot) < 1) { totalScore += 1; ledgerRes.drTotal = true; }
                else ledgerRes.drTotal = false;
            } else if (l.drTotal) {
                totalScore -= 1; ledgerRes.drTotal = false;
            }

            // Deductions
            for(let i = eDrRows.length + 1; i < uLeft.length; i++) {
                const r = uLeft[i];
                const res = {};
                if(r.date){ totalScore-=1; res.date=false; }
                if(r.part){ totalScore-=1; res.part=false; }
                if(r.pr){ totalScore-=1; res.pr=false; }
                if(r.amount){ totalScore-=1; res.amount=false; }
                ledgerRes.leftRows[i] = res;
            }

            // --- CREDIT SIDE ---
            const uRight = l.rightRows || [];
            const eCrRows = exp.rows.filter(r => r.type === 'cr');

            // Year
            const uYearR = uRight[0] || {};
            if (exp.hasCrEntries) {
                const yValid = norm(uYearR.date) === '(2023)' || norm(uYearR.date) === '2023';
                if (yValid) { totalScore += 1; ledgerRes.rightRows[0] = { date: true }; }
                else { ledgerRes.rightRows[0] = { date: false }; }
            } else if (uYearR.date) {
                totalScore -= 1; 
                ledgerRes.rightRows[0] = { date: false };
            }
            if (uYearR.part) { totalScore -= 1; ledgerRes.rightRows[0] = { ...ledgerRes.rightRows[0], part: false }; }
            if (uYearR.pr) { totalScore -= 1; ledgerRes.rightRows[0] = { ...ledgerRes.rightRows[0], pr: false }; }
            if (uYearR.amount) { totalScore -= 1; ledgerRes.rightRows[0] = { ...ledgerRes.rightRows[0], amount: false }; }

            // Rows
            eCrRows.forEach((row, i) => {
                const uRow = uRight[i + 1] || {};
                const res = {};
                
                const expDate = i === 0 ? row.date : row.day; 
                const dValid = norm(uRow.date) === norm(expDate) || norm(uRow.date) === norm(row.date) || norm(uRow.date) === norm(row.day.padStart(2,'0'));
                if (dValid) { totalScore += 1; res.date = true; } else res.date = false;

                const pValid = norm(uRow.part) === norm(row.part);
                if (pValid) { totalScore += 1; res.part = true; } else res.part = false;

                let prValid = false;
                if (!row.isBegBal) {
                    prValid = norm(uRow.pr) === norm(row.pr);
                    if (prValid) { totalScore += 1; res.pr = true; } else res.pr = false;
                } else if (uRow.pr) {
                    totalScore -= 1; res.pr = false; 
                } else { prValid = true; }

                const aValid = Math.abs((Number(uRow.amount) || 0) - row.amount) < 1;
                if (aValid) { totalScore += 1; res.amount = true; } else res.amount = false;

                ledgerRes.rightRows[i + 1] = res;

                if (dValid && pValid && prValid && aValid && row.refKey) {
                    correctlyPostedKeys.add(row.refKey);
                }
            });

            // Total
            if (exp.hasCrEntries) {
                const expTot = exp.begBalCr + exp.totalCr;
                if (Math.abs((Number(l.crTotal) || 0) - expTot) < 1) { totalScore += 1; ledgerRes.crTotal = true; }
                else ledgerRes.crTotal = false;
            } else if (l.crTotal) {
                totalScore -= 1; ledgerRes.crTotal = false;
            }

            // Deductions
            for(let i = eCrRows.length + 1; i < uRight.length; i++) {
                const r = uRight[i];
                const res = {};
                if(r.date){ totalScore-=1; res.date=false; }
                if(r.part){ totalScore-=1; res.part=false; }
                if(r.pr){ totalScore-=1; res.pr=false; }
                if(r.amount){ totalScore-=1; res.amount=false; }
                ledgerRes.rightRows[i] = res;
            }

            // --- BALANCE ---
            const hasActivity = exp.hasDrEntries || exp.hasCrEntries;
            if (hasActivity) {
                const totalDr = exp.begBalDr + exp.totalDr;
                const totalCr = exp.begBalCr + exp.totalCr;
                const net = totalDr - totalCr;
                const expBal = Math.abs(net);
                const expType = net >= 0 ? 'Dr' : 'Cr';
                
                const uBal = Number(l.balance) || 0;
                const uType = l.balanceType;
                
                if (Math.abs(uBal - expBal) <= 1 && uType === expType) {
                    totalScore += 1;
                    ledgerRes.balance = true;
                } else {
                    ledgerRes.balance = false;
                }
            } else if (l.balance || l.balanceType) {
                totalScore -= 1;
                ledgerRes.balance = false;
            }

        } else {
            // Wrong Account Title used -> assume deductions or just zero points for content
            // Assuming strict: deductions for all filled content in a wrong account?
            // To keep it simple based on previous steps, just 0 for account match. 
            // Deductions for filled fields in wrong account is harsh but consistent. 
            // For now, let's just NOT add points.
            ledgerRes.acc = false;
        }

        validationResults.ledgers[l.id] = ledgerRes;
    });

    // --- C. SCORE CHECKBOXES (Dependent on Ledger Posting) ---
    transactions.forEach(t => {
        t.debits.forEach((d, i) => {
            const key = `dr-${t.id}-${i}`;
            const isChecked = !!journalPRs[key];
            const isPosted = correctlyPostedKeys.has(key);
            
            // SCORE RULE: 1 point if Checked AND Posted
            if (isChecked) {
                if (isPosted) {
                    totalScore += 1;
                    validationResults.checkboxes[key] = true; // Green Check
                } else {
                    // Checked but NOT posted/wrong posting -> 0 Points (no deduction, but marked wrong visually)
                    validationResults.checkboxes[key] = false; // Red X
                }
            } else {
                // Not Checked.
                // Was it supposed to be checked? Yes, if posted.
                // But generally students lose the point simply by not checking.
                // Visuals: If it SHOULD have been checked (and posted), show nothing or show missing?
                // Let's just leave it blank if unchecked.
                validationResults.checkboxes[key] = null;
            }
        });
        t.credits.forEach((c, i) => {
            const key = `cr-${t.id}-${i}`;
            const isChecked = !!journalPRs[key];
            const isPosted = correctlyPostedKeys.has(key);
            
            if (isChecked) {
                if (isPosted) {
                    totalScore += 1;
                    validationResults.checkboxes[key] = true;
                } else {
                    validationResults.checkboxes[key] = false;
                }
            } else {
                validationResults.checkboxes[key] = null;
            }
        });
    });

    if (totalScore < 0) totalScore = 0;

    return {
        isCorrect: totalScore === maxScore && maxScore > 0,
        score: totalScore,
        maxScore: maxScore,
        letterGrade: getLetterGrade(totalScore, maxScore),
        validationDetails: validationResults
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

// Simplified Icon for Checkboxes (Static position)
const CheckboxStatus = ({ status, show }) => {
    if (!show || status === null) return null;
    return status === true 
        ? html`<${Check} size=${14} className="text-green-600 ml-1" />` 
        : html`<${X} size=${14} className="text-red-600 ml-1" />`;
};

const JournalSourceView = ({ transactions, journalPRs, onTogglePR, showFeedback, isReadOnly, validationDetails }) => {
    const [expanded, setExpanded] = useState(true);
    const cbResults = validationDetails?.checkboxes || {};
    
    return html`
        <div className="mb-4 border rounded bg-white overflow-hidden shadow-sm h-[36rem] flex flex-col">
            <div className="bg-blue-100 p-2 font-bold text-blue-900 cursor-pointer flex justify-between items-center flex-shrink-0" onClick=${()=>setExpanded(!expanded)}>
                <span><${Book} size=${16} className="inline mr-2"/>Source: General Journal</span>
                <div className="flex items-center gap-4">
                    <span className="text-xs font-normal">Page 1</span>
                    ${expanded ? html`<${ChevronDown} size=${16}/>` : html`<${ChevronRight} size=${16}/>`}
                </div>
            </div>
            ${expanded && html`
                <div className="flex flex-col h-full overflow-hidden">
                    <div className="flex bg-gray-50 text-gray-700 border-b border-gray-300 font-bold text-xs text-center flex-shrink-0">
                        <div className="w-16 border-r p-2 flex-shrink-0">Date</div>
                        <div className="flex-1 border-r p-2 text-left">Account Titles and Explanation</div>
                        <div className="w-16 border-r p-2 flex-shrink-0">P.R.</div>
                        <div className="w-24 border-r p-2 text-right flex-shrink-0">Debit</div>
                        <div className="w-24 p-2 text-right flex-shrink-0">Credit</div>
                    </div>
                    <div className="overflow-y-auto flex-1">
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
                                        <div className="flex border-b border-gray-100 text-xs h-8 items-center">
                                            <div className="w-16 border-r text-right pr-1 font-bold text-gray-500 flex-shrink-0">${yyyy}</div>
                                            <div className="flex-1 border-r"></div>
                                            <div className="w-16 border-r flex-shrink-0"></div>
                                            <div className="w-24 border-r flex-shrink-0"></div>
                                            <div className="w-24 flex-shrink-0"></div>
                                        </div>
                                    `}
                                    
                                    ${t.debits.map((d, i) => {
                                        const key = `dr-${t.id}-${i}`;
                                        const isChecked = !!journalPRs[key];
                                        return html`
                                            <div key=${key} className="flex border-b border-gray-100 text-xs h-8 items-center hover:bg-gray-50">
                                                <div className="w-16 border-r text-right pr-1 flex-shrink-0">${i === 0 ? dateDisplay : ''}</div>
                                                <div className="flex-1 border-r pl-1 font-medium text-gray-800 truncate" title=${d.account}>${d.account}</div>
                                                <div className="w-16 border-r text-center flex justify-center items-center flex-shrink-0">
                                                    <input type="checkbox" checked=${isChecked} onChange=${() => onTogglePR(key)} disabled=${isReadOnly} className="cursor-pointer accent-blue-600" /> 
                                                    <${CheckboxStatus} show=${showFeedback} status=${cbResults[key]} />
                                                </div>
                                                <div className="w-24 border-r text-right pr-1 flex-shrink-0">${d.amount.toLocaleString()}</div>
                                                <div className="w-24 text-right pr-1 flex-shrink-0"></div>
                                            </div>
                                        `;
                                    })}
                                    ${t.credits.map((c, i) => {
                                        const key = `cr-${t.id}-${i}`;
                                        const isChecked = !!journalPRs[key];
                                        return html`
                                            <div key=${key} className="flex border-b border-gray-100 text-xs h-8 items-center hover:bg-gray-50">
                                                <div className="w-16 border-r flex-shrink-0"></div>
                                                <div className="flex-1 border-r pl-6 text-gray-800 truncate" title=${c.account}>${c.account}</div>
                                                <div className="w-16 border-r text-center flex justify-center items-center flex-shrink-0">
                                                     <input type="checkbox" checked=${isChecked} onChange=${() => onTogglePR(key)} disabled=${isReadOnly} className="cursor-pointer accent-blue-600" />
                                                     <${CheckboxStatus} show=${showFeedback} status=${cbResults[key]} />
                                                </div>
                                                <div className="w-24 border-r flex-shrink-0"></div>
                                                <div className="w-24 text-right pr-1 flex-shrink-0">${c.amount.toLocaleString()}</div>
                                            </div>
                                        `;
                                    })}
                                    <div key=${'desc' + t.id} className="flex border-b border-gray-200 text-xs h-8 items-center text-gray-500 italic">
                                        <div className="w-16 border-r flex-shrink-0"></div>
                                        <div className="flex-1 border-r pl-8 truncate" title=${t.description}>(${t.description})</div>
                                        <div className="w-16 border-r flex-shrink-0"></div>
                                        <div className="w-24 border-r flex-shrink-0"></div>
                                        <div className="w-24 flex-shrink-0"></div>
                                    </div>
                                </React.Fragment>
                            `;
                        })}
                        <div className="h-12"></div>
                    </div>
                </div>
            `}
        </div>
    `;
};

const LedgerAccount = ({ l, idx, updateLedger, updateSideRow, addRow, deleteLedger, isReadOnly, showFeedback, validationDetails }) => {
    const leftRows = l.leftRows && l.leftRows.length > 0 ? l.leftRows : [{}, {}, {}, {}]; 
    const rightRows = l.rightRows && l.rightRows.length > 0 ? l.rightRows : [{}, {}, {}, {}];
    const maxRows = Math.max(leftRows.length, rightRows.length);
    const displayRows = Array.from({length: maxRows}).map((_, i) => i);
    
    // Safety check for validation details
    const vResult = (validationDetails && validationDetails.ledgers && validationDetails.ledgers[l.id]) 
        ? validationDetails.ledgers[l.id] 
        : null;

    return html`
        <div className="border-2 border-gray-800 bg-white shadow-md">
            <div className="border-b-2 border-gray-800 p-2 flex justify-between bg-gray-100 relative">
                <div className="absolute left-2 top-2">
                    ${showFeedback && (vResult?.acc === true 
                        ? html`<${Check} size=${16} className="text-green-600"/>` 
                        : vResult?.acc === false ? html`<${X} size=${16} className="text-red-600"/>` : null)}
                </div>
                <div className="w-full text-center mx-8 relative">
                    <input list="step3-accs" className="w-full border-b border-gray-400 text-center bg-transparent font-bold text-lg outline-none" placeholder="Account Title" value=${l.account} onChange=${(e)=>updateLedger(idx,'account',e.target.value)} disabled=${isReadOnly} />
                </div>
                ${!isReadOnly && html`<button onClick=${() => deleteLedger(idx)} className="absolute right-2 top-2 text-red-500 hover:text-red-700"><${Trash2} size=${16}/></button>`}
            </div>
            <div className="flex">
                ${/* DEBIT SIDE */''}
                <div className="flex-1 border-r-2 border-gray-800">
                    <div className="text-center font-bold border-b border-gray-400 bg-gray-50 text-xs py-1">DEBIT</div>
                    <div className="flex text-xs font-bold border-b border-gray-400"><div className="w-16 border-r p-1 text-center">Date</div><div className="flex-1 border-r p-1 text-center">Particulars</div><div className="w-10 border-r p-1 text-center">PR</div><div className="w-20 p-1 text-center">Amount</div></div>
                    ${displayRows.map(rowIdx => {
                        const row = leftRows[rowIdx] || {};
                        const rVal = vResult && vResult.leftRows[rowIdx] ? vResult.leftRows[rowIdx] : {};
                        return html`
                            <div key=${`l-${rowIdx}`} className="flex text-xs border-b border-gray-200 h-8 relative">
                                <div className="w-16 border-r relative group">
                                    <input type="text" className="w-full h-full text-right px-1 outline-none bg-transparent" value=${row.date||''} onChange=${(e)=>updateSideRow(idx,'left',rowIdx,'date',e.target.value)} disabled=${isReadOnly} placeholder=${rowIdx===0 ? "(YYYY)" : ""}/>
                                    <${ValidationIcon} show=${showFeedback} status=${rVal.date} />
                                </div>
                                <div className="flex-1 border-r relative group">
                                    <input type="text" className="w-full h-full text-left px-1 outline-none bg-transparent" value=${row.part||''} onChange=${(e)=>updateSideRow(idx,'left',rowIdx,'part',e.target.value)} disabled=${isReadOnly}/>
                                    <${ValidationIcon} show=${showFeedback} status=${rVal.part} />
                                </div>
                                <div className="w-10 border-r relative group">
                                    <input type="text" className="w-full h-full text-center outline-none bg-transparent" value=${row.pr||''} onChange=${(e)=>updateSideRow(idx,'left',rowIdx,'pr',e.target.value)} disabled=${isReadOnly}/>
                                    <${ValidationIcon} show=${showFeedback} status=${rVal.pr} />
                                </div>
                                <div className="w-20 relative group">
                                    <input type="number" className="w-full h-full text-right px-1 outline-none bg-transparent" value=${row.amount||''} onChange=${(e)=>updateSideRow(idx,'left',rowIdx,'amount',e.target.value)} disabled=${isReadOnly}/>
                                    <${ValidationIcon} show=${showFeedback} status=${rVal.amount} />
                                </div>
                            </div>
                        `;
                    })}
                    <div className="border-t-2 border-gray-800 p-1 flex justify-between items-center bg-gray-50 relative">
                        <span className="text-xs font-bold">Total Debit</span>
                        <div className="relative">
                            <input type="number" className="w-24 text-right border border-gray-300" value=${l.drTotal||''} onChange=${(e)=>updateLedger(idx,'drTotal',e.target.value)} disabled=${isReadOnly} />
                            <${ValidationIcon} show=${showFeedback} status=${vResult?.drTotal} />
                        </div>
                    </div>
                </div>
                
                ${/* CREDIT SIDE */''}
                <div className="flex-1">
                    <div className="text-center font-bold border-b border-gray-400 bg-gray-50 text-xs py-1">CREDIT</div>
                    <div className="flex text-xs font-bold border-b border-gray-400 bg-white"><div className="w-16 border-r p-1 text-center">Date</div><div className="flex-1 border-r p-1 text-center">Particulars</div><div className="w-10 border-r p-1 text-center">PR</div><div className="w-20 p-1 text-center border-r">Amount</div><div className="w-6"></div></div>
                    ${displayRows.map(rowIdx => {
                        const row = rightRows[rowIdx] || {};
                        const rVal = vResult && vResult.rightRows[rowIdx] ? vResult.rightRows[rowIdx] : {};
                        return html`
                            <div key=${`r-${rowIdx}`} className="flex text-xs border-b border-gray-200 h-8 relative">
                                <div className="w-16 border-r relative group">
                                    <input type="text" className="w-full h-full text-right px-1 outline-none bg-transparent" value=${row.date||''} onChange=${(e)=>updateSideRow(idx,'right',rowIdx,'date',e.target.value)} disabled=${isReadOnly} placeholder=${rowIdx===0 ? "(YYYY)" : ""}/>
                                    <${ValidationIcon} show=${showFeedback} status=${rVal.date} />
                                </div>
                                <div className="flex-1 border-r relative group">
                                    <input type="text" className="w-full h-full text-left px-1 outline-none bg-transparent" value=${row.part||''} onChange=${(e)=>updateSideRow(idx,'right',rowIdx,'part',e.target.value)} disabled=${isReadOnly}/>
                                    <${ValidationIcon} show=${showFeedback} status=${rVal.part} />
                                </div>
                                <div className="w-10 border-r relative group">
                                    <input type="text" className="w-full h-full text-center outline-none bg-transparent" value=${row.pr||''} onChange=${(e)=>updateSideRow(idx,'right',rowIdx,'pr',e.target.value)} disabled=${isReadOnly}/>
                                    <${ValidationIcon} show=${showFeedback} status=${rVal.pr} />
                                </div>
                                <div className="w-20 border-r relative group">
                                    <input type="number" className="w-full h-full text-right px-1 outline-none bg-transparent" value=${row.amount||''} onChange=${(e)=>updateSideRow(idx,'right',rowIdx,'amount',e.target.value)} disabled=${isReadOnly}/>
                                    <${ValidationIcon} show=${showFeedback} status=${rVal.amount} />
                                </div>
                            </div>
                        `;
                    })}
                    <div className="border-t-2 border-gray-800 p-1 flex justify-between items-center bg-gray-50 relative">
                        <span className="text-xs font-bold">Total Credit</span>
                        <div className="relative">
                            <input type="number" className="w-24 text-right border border-gray-300" value=${l.crTotal||''} onChange=${(e)=>updateLedger(idx,'crTotal',e.target.value)} disabled=${isReadOnly} />
                            <${ValidationIcon} show=${showFeedback} status=${vResult?.crTotal} />
                        </div>
                    </div>
                </div>
            </div>
            <div className="border-t border-gray-300 p-2 flex justify-center items-center gap-2 relative">
                <span className="text-xs font-bold uppercase text-gray-600">Balance:</span>
                <select className="border border-gray-300 rounded text-xs p-1 outline-none bg-white" value=${l.balanceType || ''} onChange=${(e)=>updateLedger(idx, 'balanceType', e.target.value)} disabled=${isReadOnly}><option value="" disabled>Debit or Credit?</option><option value="Dr">Debit</option><option value="Cr">Credit</option></select>
                <div className="relative">
                    <input type="number" className="w-32 text-center border-b-2 border-double border-black bg-white font-bold text-sm outline-none" placeholder="0" value=${l.balance||''} onChange=${(e)=>updateLedger(idx,'balance',e.target.value)} disabled=${isReadOnly} />
                    <${ValidationIcon} show=${showFeedback} status=${vResult?.balance} />
                </div>
            </div>
            ${!isReadOnly && html`<div className="p-2 text-center bg-gray-50 border-t border-gray-300"><button onClick=${()=>addRow(idx)} className="text-xs border border-dashed border-gray-400 rounded px-3 py-1 text-gray-600 hover:bg-white hover:text-blue-600 flex items-center gap-1 mx-auto"><${Plus} size=${12}/> Add Row</button></div>`}
        </div>
    `;
};

// --- MAIN COMPONENT ---

export default function Step03Posting({ activityData, data, onChange, showFeedback, validAccounts, ledgerKey, transactions, beginningBalances, isReadOnly, journalPRs, onTogglePR, matchedJournalEntries }) {
    const ledgers = data.ledgers || [{ id: 1, account: '', leftRows: [{}], rightRows: [{}] }];
    
    // --- RUN VALIDATION FOR FEEDBACK ---
    let validationDetails = {};
    let scoreInfo = { score: 0, maxScore: 0, letterGrade: 'IR' };
    
    if (showFeedback && activityData) {
        // Need to pass full activityData to the validator
        const result = validateStep03(activityData, data);
        validationDetails = result.validationDetails;
        scoreInfo = { score: result.score, maxScore: result.maxScore, letterGrade: result.letterGrade };
    }

    const updateLedger = (idx, field, val) => { const n = [...ledgers]; n[idx] = { ...n[idx], [field]: val }; onChange('ledgers', n); };
    const updateSideRow = (idx, side, rowIdx, field, val) => {
         const n = [...ledgers];
         const sideKey = side === 'left' ? 'leftRows' : 'rightRows';
         const rows = [...(n[idx][sideKey] || [{}])];
         if (!rows[rowIdx]) rows[rowIdx] = {};
         rows[rowIdx][field] = val;
         n[idx][sideKey] = rows;
         onChange('ledgers', n);
    };
    const addRow = (idx) => { const n = [...ledgers]; const left = n[idx].leftRows || [{}]; const right = n[idx].rightRows || [{}]; left.push({}); right.push({}); n[idx].leftRows = left; n[idx].rightRows = right; onChange('ledgers', n); };
    const deleteLedger = (idx) => { if (!window.confirm("Delete this entire ledger?")) return; const n = ledgers.filter((_, i) => i !== idx); onChange('ledgers', n); };
    
    return html`
        <div className="flex flex-col gap-4 h-full">
            ${showFeedback && html`
                <div className="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-2 flex justify-between items-center shadow-sm">
                    <span className="font-bold">Validation Results:</span>
                    <span className="font-mono font-bold text-lg">Score: ${scoreInfo.score} of ${scoreInfo.maxScore} - (${scoreInfo.letterGrade})</span>
                </div>
            `}
            <div className="flex flex-col lg:flex-row gap-4 h-full">
                <div className="lg:w-5/12 h-full"><${JournalSourceView} transactions=${transactions} journalPRs=${journalPRs} onTogglePR=${onTogglePR} showFeedback=${showFeedback} isReadOnly=${isReadOnly} validationDetails=${validationDetails} /></div>
                <div className="lg:w-7/12 border rounded bg-white h-[36rem] flex flex-col">
                    <div className="bg-blue-100 p-2 font-bold text-blue-900">General Ledger</div>
                    <div className="p-4 overflow-y-auto custom-scrollbar flex-1">
                        <div className="flex flex-col gap-8 pb-4">
                            ${ledgers.map((l, idx) => html`<${LedgerAccount} key=${l.id} l=${l} idx=${idx} ledgerKey=${ledgerKey} updateLedger=${updateLedger} updateSideRow=${updateSideRow} addRow=${addRow} deleteLedger=${deleteLedger} isReadOnly=${isReadOnly} showFeedback=${showFeedback} validationDetails=${validationDetails} />`)}
                        </div>
                        ${!isReadOnly && html`<button onClick=${()=>onChange('ledgers', [...ledgers, { id: Date.now(), account: '', leftRows:[{},{},{},{}], rightRows:[{},{},{},{}] }])} className="mt-8 w-full py-3 border-2 border-dashed border-gray-400 text-gray-500 hover:border-blue-400 flex justify-center items-center gap-2 font-bold bg-gray-50"><${Plus} size=${20}/> Add New Account Ledger</button>`}
                    </div>
                </div>
            </div>
        </div>
    `;
                  }
