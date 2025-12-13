// --- Step03Posting.js ---
import React, { useState } from 'https://esm.sh/react@18.2.0';
import htm from 'https://esm.sh/htm';
import { Plus, Check, X, Trash2, Book, ChevronDown, ChevronRight } from 'https://esm.sh/lucide-react@0.263.1';
import { getLetterGrade } from '../utils.js';

const html = htm.bind(React.createElement);

// --- HELPER: LOGIC & VALIDATION ---

const getExpectedLedgerData = (transactions, beginningBalances, validAccounts) => {
    const expected = {};

    // 1. Initialize all valid accounts
    validAccounts.forEach(acc => {
        expected[acc] = {
            rows: [], // Mixed list of { date, part, pr, amount, type: 'dr'|'cr', isBegBal: bool }
            begBalDr: 0,
            begBalCr: 0,
            totalDr: 0,
            totalCr: 0
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
                    date: 'Jan 1', // Assuming Jan 1 for BB
                    part: 'BB',
                    pr: '',
                    amount: Math.abs(net),
                    type: isDr ? 'dr' : 'cr',
                    isBegBal: true,
                    txnDateObj: new Date('2023-01-01') // For sorting
                };
                expected[acc].rows.push(entry);
                if (isDr) expected[acc].begBalDr = Math.abs(net);
                else expected[acc].begBalCr = Math.abs(net);
            }
        });
    }

    // 3. Process Transactions
    transactions.forEach((t) => {
        const dateObj = new Date(t.date);
        const mm = dateObj.toLocaleString('default', { month: 'short' });
        const dd = dateObj.getDate().toString();
        const fullDate = `${mm} ${dd}`;
        
        // Debits
        t.debits.forEach(d => {
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
                    tId: t.id
                });
                expected[d.account].totalDr += d.amount;
            }
        });

        // Credits
        t.credits.forEach(c => {
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
                    tId: t.id
                });
                expected[c.account].totalCr += c.amount;
            }
        });
    });

    return expected;
};

// --- VALIDATION FUNCTION ---
export const validateStep03 = (activityData, studentAnswer) => {
    const { transactions, beginningBalances, validAccounts, ledger: expectedLedgerAgg } = activityData;
    const studentLedgers = studentAnswer.ledgers || [];
    
    // Build expected structure
    const expectedData = getExpectedLedgerData(transactions, beginningBalances, validAccounts);
    
    let totalScore = 0;
    let maxScore = 0;
    
    // Store validation results per ledger ID to pass back to UI
    const validationResults = {}; 

    // Helper: Normalize strings for flexible comparison
    const norm = (str) => (str || '').toString().toLowerCase().trim();

    studentLedgers.forEach((l, idx) => {
        const accName = l.account;
        const expected = expectedData[accName];
        
        const ledgerResult = {
            acc: false,
            balance: false,
            leftRows: [],
            rightRows: []
        };

        // 1. Validate Account Title
        if (expected) {
            ledgerResult.acc = true;
            // Note: Prompt didn't specify points for Account Title itself, 
            // but implied "1 point each account... for combination of balance". 
            // We'll score the Balance line separately.
        } else {
            // Deduct? Prompt says "no point... input boxes that does not need answer... marked X and deducted"
            // If the whole ledger is for a wrong account, we might penalize. 
            // For now, we just won't give points for the content.
        }

        if (!expected) {
            validationResults[l.id] = ledgerResult;
            return; 
        }

        // Split expected rows into Dr and Cr
        const expDrRows = expected.rows.filter(r => r.type === 'dr');
        const expCrRows = expected.rows.filter(r => r.type === 'cr');

        // --- VALIDATE DEBIT SIDE (Left) ---
        const userLeft = l.leftRows || [];
        const maxLeftIndex = Math.max(userLeft.length, expDrRows.length + 1); // +1 for Year row

        // Check Year Row (Row 0)
        // Expected: Year "2023" or "(2023)" or "2023"
        // Prompt says: "formatted as (YYYY)" -> 1 point.
        const userYearLeft = userLeft[0] || {};
        const yearVal = norm(userYearLeft.date);
        
        let leftHasEntries = expDrRows.length > 0;
        
        if (leftHasEntries) {
            maxScore += 1; // Year point
            const yearMatches = yearVal === '(2023)' || yearVal === '2023';
            if (yearMatches) {
                totalScore += 1;
                ledgerResult.leftRows[0] = { date: true };
            } else if (yearVal !== '') {
                ledgerResult.leftRows[0] = { date: false }; // Wrong year format
            } else {
                 // Missing year
            }
        } else {
            // Should be empty
            if (yearVal !== '') { totalScore -= 1; ledgerResult.leftRows[0] = { date: false }; }
        }

        // Check Transaction Rows (Starting index 1 if we assume Row 0 is Year)
        // Wait, UI puts year in the same column. 
        // Let's assume User Row 0 = Year, User Row 1 = First Entry.
        // However, standard ledger often puts Year AND First Date in same box or Year above.
        // Looking at the UI code below, it's a list of rows. 
        // We will assume the Student puts the Year in the first Date box, or separate?
        // The UI has `displayRows`. Typically Year is put in the first row date box, or a header.
        // The instruction says "1 point... formatted as (YYYY) in the first row of the Date column".
        // So Row 0 Date = "(2023)". Row 0 Particulars/Amount = First Transaction? 
        // OR Row 0 is purely a header row?
        // Based on typical HTML ledgers, Row 0 is often reserved for Year, or Year is prefixed.
        // Let's assume Row 0 Date is JUST Year. And content starts Row 1.
        // OR: Row 0 Date = "(2023) Jan 1".
        // Let's stick to the prompt: "1 point... (YYYY) in the first row".
        // Implies Row 0 is dedicated or part of header.
        // Let's align with the UI: The UI renders `displayRows`. 
        // We will treat `userLeft[0].date` as the place for Year. 
        // And actual transactions start at `userLeft[1]`.
        
        // Actually, in many manual ledgers, the Year is written at the top of the date column, 
        // and the first transaction is on the same line or next.
        // Let's allow flexible parsing.
        
        // REVISED STRATEGY: 
        // Row 0: Expect Year. Content should be empty? 
        // If the user puts transaction data in Row 0, it shifts everything.
        // Let's assume strict structure:
        // Row 0: Date="(2023)", Part="", PR="", Amt="" (Score: 1pt for Date, Deduct for others)
        // Row 1..N: Transaction Data.

        // Check Row 0 (Year Line)
        const uRow0 = userLeft[0] || {};
        if (leftHasEntries) {
            // Already scored Year Date above.
            // Check Part, PR, Amt - should be empty?
            if (uRow0.part || uRow0.pr || uRow0.amount) {
                // Deduct if filled
               if(uRow0.part) { totalScore -= 1; ledgerResult.leftRows[0] = { ...ledgerResult.leftRows[0], part: false }; }
               if(uRow0.pr) { totalScore -= 1; ledgerResult.leftRows[0] = { ...ledgerResult.leftRows[0], pr: false }; }
               if(uRow0.amount) { totalScore -= 1; ledgerResult.leftRows[0] = { ...ledgerResult.leftRows[0], amount: false }; }
            }
        }

        // Check Content Rows (1 to N)
        expDrRows.forEach((row, i) => {
            const uRow = userLeft[i + 1] || {}; // Shift down by 1 for Year row
            const res = { date: null, part: null, pr: null, amount: null };
            
            // Expected Date format:
            // If i==0 (first data row), "Mmm d". Else "d".
            const expDate = i === 0 ? row.date : row.day; 
            
            // SCORES
            if (row.isBegBal) {
                maxScore += 3; // Date, Part(BB), Amt
                // PR is blank
            } else {
                maxScore += 4; // Date, Part(GJ), PR(1), Amt
            }

            // CHECK DATE
            const uDate = norm(uRow.date);
            const isDateCorrect = uDate === norm(expDate) || uDate === norm(row.date) || uDate === norm(row.day.padStart(2,'0')); 
            // Allow "Jan 1" even if "1" is expected for robustness, but prioritize exactness.
            if (isDateCorrect) { totalScore += 1; res.date = true; } 
            else { res.date = false; }

            // CHECK PART
            const uPart = norm(uRow.part);
            const expPart = norm(row.part); // BB or GJ
            if (uPart === expPart) { totalScore += 1; res.part = true; }
            else { res.part = false; }

            // CHECK PR
            const uPr = norm(uRow.pr);
            const expPr = norm(row.pr); // "" or "1"
            if (!row.isBegBal) {
                // Transaction
                if (uPr === expPr) { totalScore += 1; res.pr = true; }
                else { res.pr = false; }
            } else {
                // Beg Bal (PR Blank) - Deduct if filled
                if (uPr !== '') { totalScore -= 1; res.pr = false; }
            }

            // CHECK AMOUNT
            const uAmt = Number(uRow.amount) || 0;
            if (Math.abs(uAmt - row.amount) < 1) { totalScore += 1; res.amount = true; }
            else { res.amount = false; }

            ledgerResult.leftRows[i + 1] = res;
        });

        // DEDUCTIONS for Extra Rows (Left)
        for (let i = expDrRows.length + 1; i < userLeft.length; i++) {
            const uRow = userLeft[i];
            const res = {};
            if (uRow.date || uRow.part || uRow.pr || uRow.amount) {
                // Determine penalty. Prompt: "marked X and deducted from correct answers"
                // Assuming -1 per field or -1 per row? Let's do -1 per field to be precise.
                if(uRow.date) { totalScore -= 1; res.date = false; }
                if(uRow.part) { totalScore -= 1; res.part = false; }
                if(uRow.pr) { totalScore -= 1; res.pr = false; }
                if(uRow.amount) { totalScore -= 1; res.amount = false; }
            }
            ledgerResult.leftRows[i] = res;
        }


        // --- VALIDATE CREDIT SIDE (Right) ---
        // Duplicate logic from Left side
        const userRight = l.rightRows || [];
        
        const userYearRight = userRight[0] || {};
        const yearValR = norm(userYearRight.date);
        let rightHasEntries = expCrRows.length > 0;

        if (rightHasEntries) {
            maxScore += 1; 
            const yearMatches = yearValR === '(2023)' || yearValR === '2023';
            if (yearMatches) { totalScore += 1; ledgerResult.rightRows[0] = { date: true }; } 
            else if (yearValR !== '') { ledgerResult.rightRows[0] = { date: false }; }
        } else {
             if (yearValR !== '') { totalScore -= 1; ledgerResult.rightRows[0] = { date: false }; }
        }

        const uRow0R = userRight[0] || {};
        if (rightHasEntries) {
            if (uRow0R.part || uRow0R.pr || uRow0R.amount) {
               if(uRow0R.part) { totalScore -= 1; ledgerResult.rightRows[0] = { ...ledgerResult.rightRows[0], part: false }; }
               if(uRow0R.pr) { totalScore -= 1; ledgerResult.rightRows[0] = { ...ledgerResult.rightRows[0], pr: false }; }
               if(uRow0R.amount) { totalScore -= 1; ledgerResult.rightRows[0] = { ...ledgerResult.rightRows[0], amount: false }; }
            }
        }

        expCrRows.forEach((row, i) => {
            const uRow = userRight[i + 1] || {}; 
            const res = { date: null, part: null, pr: null, amount: null };
            const expDate = i === 0 ? row.date : row.day; 
            
            if (row.isBegBal) maxScore += 3; 
            else maxScore += 4; 

            const uDate = norm(uRow.date);
            if (uDate === norm(expDate) || uDate === norm(row.date) || uDate === norm(row.day.padStart(2,'0'))) { 
                totalScore += 1; res.date = true; 
            } else { res.date = false; }

            const uPart = norm(uRow.part);
            if (uPart === norm(row.part)) { totalScore += 1; res.part = true; }
            else { res.part = false; }

            const uPr = norm(uRow.pr);
            if (!row.isBegBal) {
                if (uPr === norm(row.pr)) { totalScore += 1; res.pr = true; }
                else { res.pr = false; }
            } else {
                if (uPr !== '') { totalScore -= 1; res.pr = false; }
            }

            const uAmt = Number(uRow.amount) || 0;
            if (Math.abs(uAmt - row.amount) < 1) { totalScore += 1; res.amount = true; }
            else { res.amount = false; }

            ledgerResult.rightRows[i + 1] = res;
        });

        for (let i = expCrRows.length + 1; i < userRight.length; i++) {
            const uRow = userRight[i];
            const res = {};
            if (uRow.date || uRow.part || uRow.pr || uRow.amount) {
                if(uRow.date) { totalScore -= 1; res.date = false; }
                if(uRow.part) { totalScore -= 1; res.part = false; }
                if(uRow.pr) { totalScore -= 1; res.pr = false; }
                if(uRow.amount) { totalScore -= 1; res.amount = false; }
            }
            ledgerResult.rightRows[i] = res;
        }

        // 4. Validate Balance
        // 1 point for combination of balance amount and type
        const totalExpDr = expected.begBalDr + expected.totalDr;
        const totalExpCr = expected.begBalCr + expected.totalCr;
        const netExp = totalExpDr - totalExpCr;
        const expBalAmt = Math.abs(netExp);
        const expType = netExp >= 0 ? 'Dr' : 'Cr';

        // Add 1 to Max Score if there was ANY activity
        if (leftHasEntries || rightHasEntries) {
            maxScore += 1;
            
            const uBal = Number(l.balance) || 0;
            const uType = l.balanceType;
            
            const isBalAmtCorrect = Math.abs(uBal - expBalAmt) <= 1;
            const isTypeCorrect = uType === expType;
            
            if (isBalAmtCorrect && isTypeCorrect) {
                totalScore += 1;
                ledgerResult.balance = true;
            } else {
                ledgerResult.balance = false;
            }
        }
        
        validationResults[l.id] = ledgerResult;
    });

    if (totalScore < 0) totalScore = 0; // Prevent negative total score

    return {
        isCorrect: totalScore === maxScore && maxScore > 0,
        score: totalScore,
        maxScore: maxScore,
        letterGrade: getLetterGrade(totalScore, maxScore),
        validationDetails: validationResults
    };
};


// --- INTERNAL COMPONENTS ---

const StatusIcon = ({ status, show }) => {
    if (!show || status === undefined || status === null) return null;
    return status === true
        ? html`<${Check} size=${14} className="text-green-600 inline ml-1" />`
        : html`<${X} size=${14} className="text-red-600 inline ml-1" />`;
};

const JournalSourceView = ({ transactions, journalPRs, onTogglePR, showFeedback, matchedJournalEntries, isReadOnly }) => {
    const [expanded, setExpanded] = useState(true);
    
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
                                        const isPosted = matchedJournalEntries && matchedJournalEntries.has(key);
                                        let checkColor = "";
                                        if (showFeedback || isReadOnly) { 
                                            if (isChecked && isPosted) checkColor = "bg-green-200"; 
                                            else if (isChecked && !isPosted) checkColor = "bg-red-200"; 
                                            else if (!isChecked && isPosted) checkColor = "bg-red-200"; 
                                            else if (!isChecked && !isPosted) checkColor = "bg-red-50"; 
                                            if (!isPosted) checkColor = "bg-red-100"; 
                                        }

                                        return html`
                                            <div key=${key} className="flex border-b border-gray-100 text-xs h-8 items-center hover:bg-gray-50">
                                                <div className="w-16 border-r text-right pr-1 flex-shrink-0">${i === 0 ? dateDisplay : ''}</div>
                                                <div className="flex-1 border-r pl-1 font-medium text-gray-800 truncate" title=${d.account}>${d.account}</div>
                                                <div className=${`w-16 border-r text-center flex justify-center items-center flex-shrink-0 ${checkColor}`}>
                                                    <input type="checkbox" checked=${isChecked} onChange=${() => onTogglePR(key)} disabled=${isReadOnly} className="cursor-pointer" /> 
                                                </div>
                                                <div className="w-24 border-r text-right pr-1 flex-shrink-0">${d.amount.toLocaleString()}</div>
                                                <div className="w-24 text-right pr-1 flex-shrink-0"></div>
                                            </div>
                                        `;
                                    })}
                                    ${t.credits.map((c, i) => {
                                        const key = `cr-${t.id}-${i}`;
                                        const isChecked = !!journalPRs[key];
                                        const isPosted = matchedJournalEntries && matchedJournalEntries.has(key);
                                        let checkColor = "";
                                        if (showFeedback || isReadOnly) {
                                            if (isChecked && isPosted) checkColor = "bg-green-200";
                                            else if (isChecked && !isPosted) checkColor = "bg-red-200"; 
                                            else if (!isChecked && isPosted) checkColor = "bg-red-200";
                                            else if (!isPosted) checkColor = "bg-red-100";
                                        }

                                        return html`
                                            <div key=${key} className="flex border-b border-gray-100 text-xs h-8 items-center hover:bg-gray-50">
                                                <div className="w-16 border-r flex-shrink-0"></div>
                                                <div className="flex-1 border-r pl-6 text-gray-800 truncate" title=${c.account}>${c.account}</div>
                                                <div className=${`w-16 border-r text-center flex justify-center items-center flex-shrink-0 ${checkColor}`}>
                                                     <input type="checkbox" checked=${isChecked} onChange=${() => onTogglePR(key)} disabled=${isReadOnly} className="cursor-pointer" />
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

const LedgerAccount = ({ l, idx, ledgerKey, updateLedger, updateSideRow, addRow, deleteLedger, isReadOnly, showFeedback, validationDetails }) => {
    const leftRows = l.leftRows && l.leftRows.length > 0 ? l.leftRows : [{}, {}, {}, {}]; 
    const rightRows = l.rightRows && l.rightRows.length > 0 ? l.rightRows : [{}, {}, {}, {}];
    const maxRows = Math.max(leftRows.length, rightRows.length);
    const displayRows = Array.from({length: maxRows}).map((_, i) => i);
    
    const vResult = validationDetails && validationDetails[l.id] ? validationDetails[l.id] : null;

    // Helper to get bg color based on validation
    const getBg = (status) => {
        if (!showFeedback || status === undefined || status === null) return '';
        return status === true ? 'bg-green-100' : 'bg-red-100';
    };

    return html`
        <div className="border-2 border-gray-800 bg-white shadow-md">
            <div className="border-b-2 border-gray-800 p-2 flex justify-between bg-gray-100 relative">
                <div className="absolute left-2 top-2"><${StatusIcon} show=${showFeedback} status=${vResult?.acc} /></div>
                <div className="w-full text-center mx-8">
                    <input list="step3-accs" className=${`w-full border-b border-gray-400 text-center bg-transparent font-bold text-lg outline-none ${getBg(vResult?.acc)}`} placeholder="Account Title" value=${l.account} onChange=${(e)=>updateLedger(idx,'account',e.target.value)} disabled=${isReadOnly} />
                </div>
                ${!isReadOnly && html`<button onClick=${() => deleteLedger(idx)} className="absolute right-2 top-2 text-red-500 hover:text-red-700"><${Trash2} size=${16}/></button>`}
            </div>
            <div className="flex">
                <div className="flex-1 border-r-2 border-gray-800">
                    <div className="text-center font-bold border-b border-gray-400 bg-gray-50 text-xs py-1">DEBIT</div>
                    <div className="flex text-xs font-bold border-b border-gray-400"><div className="w-16 border-r p-1 text-center">Date</div><div className="flex-1 border-r p-1 text-center">Particulars</div><div className="w-10 border-r p-1 text-center">PR</div><div className="w-20 p-1 text-center">Amount</div></div>
                    ${displayRows.map(rowIdx => {
                        const row = leftRows[rowIdx] || {};
                        const rVal = vResult && vResult.leftRows[rowIdx] ? vResult.leftRows[rowIdx] : {};
                        return html`
                            <div key=${`l-${rowIdx}`} className="flex text-xs border-b border-gray-200 h-8 relative">
                                <div className="w-16 border-r relative group">
                                    <input type="text" className=${`w-full h-full text-right px-1 outline-none bg-transparent ${getBg(rVal.date)}`} value=${row.date||''} onChange=${(e)=>updateSideRow(idx,'left',rowIdx,'date',e.target.value)} disabled=${isReadOnly} placeholder=${rowIdx===0 ? "(YYYY)" : ""}/>
                                    ${showFeedback && rVal.date === false && html`<div className="absolute top-1 left-1"><${X} size=${10} className="text-red-500"/></div>`}
                                </div>
                                <div className="flex-1 border-r relative group">
                                    <input type="text" className=${`w-full h-full text-left px-1 outline-none bg-transparent ${getBg(rVal.part)}`} value=${row.part||''} onChange=${(e)=>updateSideRow(idx,'left',rowIdx,'part',e.target.value)} disabled=${isReadOnly}/>
                                    ${showFeedback && rVal.part === false && html`<div className="absolute top-1 left-1"><${X} size=${10} className="text-red-500"/></div>`}
                                </div>
                                <div className="w-10 border-r relative group">
                                    <input type="text" className=${`w-full h-full text-center outline-none bg-transparent ${getBg(rVal.pr)}`} value=${row.pr||''} onChange=${(e)=>updateSideRow(idx,'left',rowIdx,'pr',e.target.value)} disabled=${isReadOnly}/>
                                    ${showFeedback && rVal.pr === false && html`<div className="absolute top-1 left-1"><${X} size=${10} className="text-red-500"/></div>`}
                                </div>
                                <div className="w-20 relative group">
                                    <input type="number" className=${`w-full h-full text-right px-1 outline-none bg-transparent ${getBg(rVal.amount)}`} value=${row.amount||''} onChange=${(e)=>updateSideRow(idx,'left',rowIdx,'amount',e.target.value)} disabled=${isReadOnly}/>
                                    ${showFeedback && rVal.amount === false && html`<div className="absolute top-1 left-1"><${X} size=${10} className="text-red-500"/></div>`}
                                </div>
                            </div>
                        `;
                    })}
                    <div className="border-t-2 border-gray-800 p-1 flex justify-between items-center bg-gray-50"><span className="text-xs font-bold">Total Debit</span><input type="number" className="w-24 text-right border border-gray-300" value=${l.drTotal||''} onChange=${(e)=>updateLedger(idx,'drTotal',e.target.value)} disabled=${isReadOnly} /></div>
                </div>
                <div className="flex-1">
                    <div className="text-center font-bold border-b border-gray-400 bg-gray-50 text-xs py-1">CREDIT</div>
                    <div className="flex text-xs font-bold border-b border-gray-400 bg-white"><div className="w-16 border-r p-1 text-center">Date</div><div className="flex-1 border-r p-1 text-center">Particulars</div><div className="w-10 border-r p-1 text-center">PR</div><div className="w-20 p-1 text-center border-r">Amount</div><div className="w-6"></div></div>
                    ${displayRows.map(rowIdx => {
                        const row = rightRows[rowIdx] || {};
                        const rVal = vResult && vResult.rightRows[rowIdx] ? vResult.rightRows[rowIdx] : {};
                        return html`
                            <div key=${`r-${rowIdx}`} className="flex text-xs border-b border-gray-200 h-8 relative">
                                <div className="w-16 border-r relative group">
                                    <input type="text" className=${`w-full h-full text-right px-1 outline-none bg-transparent ${getBg(rVal.date)}`} value=${row.date||''} onChange=${(e)=>updateSideRow(idx,'right',rowIdx,'date',e.target.value)} disabled=${isReadOnly} placeholder=${rowIdx===0 ? "(YYYY)" : ""}/>
                                    ${showFeedback && rVal.date === false && html`<div className="absolute top-1 left-1"><${X} size=${10} className="text-red-500"/></div>`}
                                </div>
                                <div className="flex-1 border-r relative group">
                                    <input type="text" className=${`w-full h-full text-left px-1 outline-none bg-transparent ${getBg(rVal.part)}`} value=${row.part||''} onChange=${(e)=>updateSideRow(idx,'right',rowIdx,'part',e.target.value)} disabled=${isReadOnly}/>
                                    ${showFeedback && rVal.part === false && html`<div className="absolute top-1 left-1"><${X} size=${10} className="text-red-500"/></div>`}
                                </div>
                                <div className="w-10 border-r relative group">
                                    <input type="text" className=${`w-full h-full text-center outline-none bg-transparent ${getBg(rVal.pr)}`} value=${row.pr||''} onChange=${(e)=>updateSideRow(idx,'right',rowIdx,'pr',e.target.value)} disabled=${isReadOnly}/>
                                    ${showFeedback && rVal.pr === false && html`<div className="absolute top-1 left-1"><${X} size=${10} className="text-red-500"/></div>`}
                                </div>
                                <div className="w-20 border-r relative group">
                                    <input type="number" className=${`w-full h-full text-right px-1 outline-none bg-transparent ${getBg(rVal.amount)}`} value=${row.amount||''} onChange=${(e)=>updateSideRow(idx,'right',rowIdx,'amount',e.target.value)} disabled=${isReadOnly}/>
                                    ${showFeedback && rVal.amount === false && html`<div className="absolute top-1 left-1"><${X} size=${10} className="text-red-500"/></div>`}
                                </div>
                            </div>
                        `;
                    })}
                    <div className="border-t-2 border-gray-800 p-1 flex justify-between items-center bg-gray-50"><span className="text-xs font-bold">Total Credit</span><input type="number" className="w-24 text-right border border-gray-300" value=${l.crTotal||''} onChange=${(e)=>updateLedger(idx,'crTotal',e.target.value)} disabled=${isReadOnly} /></div>
                </div>
            </div>
            <div className=${`border-t border-gray-300 p-2 flex justify-center items-center gap-2 ${getBg(vResult?.balance)}`}>
                <span className="text-xs font-bold uppercase text-gray-600">Balance:</span>
                <select className="border border-gray-300 rounded text-xs p-1 outline-none bg-white" value=${l.balanceType || ''} onChange=${(e)=>updateLedger(idx, 'balanceType', e.target.value)} disabled=${isReadOnly}><option value="" disabled>Debit or Credit?</option><option value="Dr">Debit</option><option value="Cr">Credit</option></select>
                <input type="number" className="w-32 text-center border-b-2 border-double border-black bg-white font-bold text-sm outline-none" placeholder="0" value=${l.balance||''} onChange=${(e)=>updateLedger(idx,'balance',e.target.value)} disabled=${isReadOnly} />
                <div className="ml-2"><${StatusIcon} show=${showFeedback} status=${vResult?.balance} /></div>
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
                <div className="lg:w-5/12 h-full"><${JournalSourceView} transactions=${transactions} journalPRs=${journalPRs} onTogglePR=${onTogglePR} showFeedback=${showFeedback} matchedJournalEntries=${matchedJournalEntries} isReadOnly=${isReadOnly}/></div>
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
