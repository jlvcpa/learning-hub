import React, { useState, useMemo, useEffect } from 'https://esm.sh/react@18.2.0';
import htm from 'https://esm.sh/htm';
import { Table, Trash2, Plus, List, ChevronDown, ChevronRight, AlertCircle, Check, X } from 'https://esm.sh/lucide-react@0.263.1';
import { sortAccounts, getAccountType, getLetterGrade } from '../utils.js';

const html = htm.bind(React.createElement);

// --- HELPER: Value Parser & Validator ---
const parseUserValue = (val) => {
    if (!val) return 0;
    let str = val.toString().trim();
    let isNegative = false;
    if (str.startsWith('(') && str.endsWith(')')) {
        isNegative = true;
        str = str.slice(1, -1);
    } else if (str.startsWith('-')) {
        isNegative = true;
        str = str.substring(1);
    }
    const num = Number(str.replace(/,/g, ''));
    return isNegative ? -num : num;
};

const checkField = (userVal, expectedVal, isDeduction = false) => {
    // Round expected value to nearest integer for comparison
    const expRounded = Math.round(expectedVal);
    
    // Case 1: Expected is 0 (e.g. Income Tax, Beg Cap for new business)
    // Allowed to be blank or '0'
    if (Math.abs(expRounded) < 0.01) {
        return !userVal || parseUserValue(userVal) === 0;
    }

    // Case 2: Expected is NON-ZERO
    // Must NOT be blank. If blank, return FALSE (X mark).
    // This fixes the "Confusing Checkmarks" issue on empty total boxes.
    if (!userVal && userVal !== 0) return false;

    const parsedUser = parseUserValue(userVal);
    const matchesNumber = Math.abs(parsedUser - expRounded) <= 1 || Math.abs(parsedUser - (-expRounded)) <= 1;
    
    if (!matchesNumber) return false;
    
    // Sign check for deductions
    if (expRounded < 0 || isDeduction) {
        // Enforce explicit sign if needed, though mostly we just check magnitude above
        if (!userVal.toString().includes('(') && !userVal.toString().includes('-') && parsedUser > 0) return false;
    }
    return true;
};

// Modified input class to allow space for the icon on the right (pr-6)
const inputClass = (isError) => `w-full text-right p-1 text-xs outline-none border-b border-gray-300 bg-transparent focus:border-blue-500 font-mono pr-6 ${isError ? 'bg-red-50 text-red-600 font-bold' : ''}`;
const btnStyle = "mt-2 text-xs text-blue-900 font-medium hover:underline flex items-center gap-1 cursor-pointer";

// --- NEW INTERNAL COMPONENT: Input with Feedback Icon ---
const FeedbackInput = ({ value, onChange, expected, isDeduction, showFeedback, isReadOnly, placeholder, required }) => {
    // Determine validation status
    let isCorrect = checkField(value, expected, isDeduction);
    
    // ENHANCEMENT: If required is true, treat empty values as incorrect even if expected is 0
    if (required && (!value || value.toString().trim() === '')) {
        isCorrect = false;
    }
    
    // We show styling if feedback is enabled.
    const isError = showFeedback && !isCorrect;
    const isValid = showFeedback && isCorrect;

    return html`
        <div className="relative w-full">
            <input 
                type="text" 
                className=${inputClass(isError)} 
                value=${value || ''} 
                onChange=${onChange} 
                disabled=${isReadOnly} 
                placeholder=${placeholder}
            />
            ${showFeedback && html`
                <span className="absolute right-0 top-1/2 transform -translate-y-1/2 pointer-events-none pr-1">
                    ${isValid 
                        ? html`<${Check} size=${14} className="text-green-600"/>` 
                        : html`<${X} size=${14} className="text-red-500"/>`
                    }
                </span>
            `}
        </div>
    `;
};

// --- DRY VALIDATION LOGIC ---
export const validateStep06 = (ledgerData, adjustments, activityData, userAnswers) => {
    let score = 0;
    let maxScore = 0;
    
    // 1. Calculate Expected Data (The Truth)
    const s = new Set(Object.keys(ledgerData));
    adjustments.forEach(adj => { s.add(adj.drAcc); s.add(adj.crAcc); });
    
    // Buckets for expected accounts
    const expected = {
        revenues: [],
        expenses: [],
        currentAssets: [],
        nonCurrentAssets: [], // For PPE Cost
        contraAssets: [],     // For Accumulated Depreciation
        otherAssets: [],      // Land, etc.
        liabilities: [],
        currentLiabilities: [],
        nonCurrentLiabilities: [],
        equity: {}, // BegCap, Investments, Drawings
        totals: { 
            ni: 0, 
            rev: 0,
            exp: 0,
            curAssets: 0, 
            nonCurAssets: 0,
            assets: 0, 
            curLiabs: 0,
            nonCurLiabs: 0,
            liabs: 0, 
            endCap: 0,
            liabEquity: 0
        }
    };

    // Process Ledger + Adjustments to get Final Adjusted Balances
    Array.from(s).forEach(acc => {
        const lBal = (ledgerData[acc]?.debit || 0) - (ledgerData[acc]?.credit || 0);
        let aDr = 0; let aCr = 0;
        adjustments.forEach(a => { if(a.drAcc === acc) aDr += a.amount; if(a.crAcc === acc) aCr += a.amount; });
        const atbNet = lBal + (aDr - aCr); // Positive = Dr, Negative = Cr
        
        if (Math.abs(atbNet) < 0.01) return; // Skip zero balance accounts

        const type = getAccountType(acc);
        const val = Math.abs(atbNet);

        if (type === 'Revenue') {
            expected.revenues.push({ name: acc, amount: val });
            expected.totals.ni += val; 
            expected.totals.rev += val;
        } else if (type === 'Expense') {
            expected.expenses.push({ name: acc, amount: val });
            expected.totals.ni -= val; 
            expected.totals.exp += val;
        } else if (type === 'Asset') {
            const lowerAcc = acc.toLowerCase();
            const isCurrent = ['cash', 'receivable', 'inventory', 'supplies', 'prepaid'].some(k => lowerAcc.includes(k));
            const isContra = lowerAcc.includes('accumulated');
            
            if (isCurrent) {
                expected.currentAssets.push({ name: acc, amount: val });
                expected.totals.curAssets += val;
            } else if (isContra) {
                expected.contraAssets.push({ name: acc, amount: val }); 
                expected.totals.nonCurAssets -= val; // Contra reduces assets
            } else {
                // Non-current (PPE, Land)
                expected.nonCurrentAssets.push({ name: acc, amount: val });
                expected.totals.nonCurAssets += val;
            }
            expected.totals.assets += (isContra ? -val : val); // Net Asset Total
            
        } else if (type === 'Liability') {
            const isNonCurrent = acc.toLowerCase().includes('mortgage') || acc.toLowerCase().includes('bond') || acc.toLowerCase().includes('loan');
            
            if (isNonCurrent) {
                expected.nonCurrentLiabilities.push({ name: acc, amount: val });
                expected.totals.nonCurLiabs += val;
            } else {
                expected.currentLiabilities.push({ name: acc, amount: val });
                expected.totals.curLiabs += val;
            }
            expected.totals.liabs += val;
            
        } else if (acc.includes('Drawings') || acc.includes('Dividends')) {
            expected.equity.drawings = (expected.equity.drawings || 0) + val;
        } else if (type === 'Equity' && !acc.includes('Income Summary')) {
            expected.equity.capitalAccount = acc;
            expected.equity.begBal = Math.abs(activityData.beginningBalances?.balances?.[acc]?.cr || 0); 
            expected.equity.atbCapital = val; 
        }
    });

    // Special handling for Investments
    let investments = 0;
    activityData.transactions.forEach(t => {
        t.credits.forEach(c => {
             if (getAccountType(c.account) === 'Equity' && !c.account.includes('Drawings') && !c.account.includes('Retained')) {
                 investments += c.amount;
             }
        });
    });
    expected.equity.investments = investments;

    // Recalculate End Cap strictly (Assets - Liabilities = Equity)
    expected.totals.endCap = expected.totals.assets - expected.totals.liabs;
    expected.totals.liabEquity = expected.totals.liabs + expected.totals.endCap;


    // --- SCORING HELPER ---
    const scoreSection = (userRows, expectedItems) => {
        expectedItems.forEach(exp => {
            maxScore += 2; // 1 for Name, 1 for Amount
            const match = userRows.find(r => r.label && r.label.toLowerCase().trim() === exp.name.toLowerCase().trim());
            if (match) {
                score += 1; // Found the account
                if (checkField(match.amount, exp.amount)) {
                    score += 1; // Amount is correct
                }
            }
        });
    };

    const scoreField = (userVal, expectedVal) => {
        maxScore += 1;
        if (checkField(userVal, expectedVal)) score += 1;
    };


    // 2. Score Income Statement
    const isData = userAnswers.is || {};
    const allUserISRows = [
        ...(isData.revenues || []), 
        ...(isData.opRevenues || []), 
        ...(isData.otherIncome || []),
        ...(isData.expenses || []),
        ...(isData.opExpenses || []),
        ...(isData.nonOpItems || [])
    ];

    scoreSection(allUserISRows, expected.revenues);
    scoreSection(allUserISRows, expected.expenses);
    
    // Score Totals in IS
    scoreField(isData.totalRevenues || isData.totalOpRevenues, expected.totals.rev);
    scoreField(isData.totalExpenses || isData.totalOpExpenses, expected.totals.exp);
    scoreField(isData.netIncomeBeforeTax, expected.totals.ni);
    scoreField(isData.incomeTax, 0); // Income Tax is 0
    scoreField(isData.netIncomeAfterTax, expected.totals.ni); 

    // 3. Score SCE
    const sceData = userAnswers.sce || {};
    const begCapVal = activityData.config.isSubsequentYear ? expected.equity.begBal : 0; 
    scoreField(sceData.begCapital, begCapVal);
    
    const sceAdditions = sceData.additions || [];
    let additionsTotal = 0;
    if (expected.equity.investments > 0) {
        maxScore += 2;
        const invMatch = sceAdditions.find(r => r.label.toLowerCase().includes('investment') || r.label.toLowerCase().includes('capital'));
        if (invMatch) {
            score += 1;
            if (checkField(invMatch.amount, expected.equity.investments)) score += 1;
        }
        additionsTotal += expected.equity.investments;
    }
    if (expected.totals.ni > 0) {
        maxScore += 2;
        const niMatch = sceAdditions.find(r => r.label.toLowerCase().includes('income'));
        if (niMatch) {
            score += 1;
            if (checkField(niMatch.amount, expected.totals.ni)) score += 1;
        }
        additionsTotal += expected.totals.ni;
    }
    scoreField(sceData.totalAdditions, additionsTotal);

    // Capital During
    scoreField(sceData.totalCapDuring, begCapVal + additionsTotal);

    const sceDeductions = sceData.deductions || [];
    let deductionsTotal = 0;
    if (expected.equity.drawings > 0) {
        maxScore += 2;
        const drwMatch = sceDeductions.find(r => r.label.toLowerCase().includes('drawing'));
        if (drwMatch) {
            score += 1;
            if (checkField(drwMatch.amount, expected.equity.drawings)) score += 1;
        }
        deductionsTotal += expected.equity.drawings;
    }
    if (expected.totals.ni < 0) {
        maxScore += 2;
        const lossMatch = sceDeductions.find(r => r.label.toLowerCase().includes('loss'));
        if (lossMatch) {
            score += 1;
            if (checkField(lossMatch.amount, Math.abs(expected.totals.ni))) score += 1;
        }
        deductionsTotal += Math.abs(expected.totals.ni);
    }
    scoreField(sceData.totalDeductions, deductionsTotal);

    scoreField(sceData.endCapital, expected.totals.endCap);

    // 4. Score Balance Sheet
    const bsData = userAnswers.bs || {};
    
    // Score Current Assets
    scoreSection(bsData.curAssets || [], expected.currentAssets);
    scoreField(bsData.totalCurAssets, expected.totals.curAssets);

    // Score Depreciable Assets (Cost, Accum, Net)
    const userDepAssets = bsData.depAssets || [];
    const ppeAssets = expected.nonCurrentAssets.filter(a => !a.name.toLowerCase().includes('land')); 
    const landAssets = expected.nonCurrentAssets.filter(a => a.name.toLowerCase().includes('land'));

    ppeAssets.forEach(ppe => {
        // ENHANCEMENT: Increase max score to 5 per asset to include Names and all Amounts
        // 1. Asset Name (1)
        // 2. Cost Amount (1)
        // 3. Contra Name (1)
        // 4. Accum Amount (1)
        // 5. Net Amount (1)
        maxScore += 5; 

        // Matching logic: Check if user asset name contains key word from expected (e.g. "Equipment" from "Office Equipment")
        const keyword = ppe.name.toLowerCase().split(' ')[0];
        const userRow = userDepAssets.find(r => r.asset && r.asset.toLowerCase().includes(keyword));
        
        if (userRow) {
            // 1. Asset Name found
            score += 1;

            // 2. Check Cost Amount
            if (checkField(userRow.cost, ppe.amount)) score += 1;
            
            // 3. Check Contra Name (Should imply it's an Accumulated Depreciation account)
            // We check if it exists and reasonably looks like a contra account
            if (userRow.contra && userRow.contra.toLowerCase().includes('accumulated')) {
                score += 1;
            }

            // 4. Check Accum Amount (Contra)
            const contra = expected.contraAssets.find(c => c.name.toLowerCase().includes(keyword)); 
            const contraAmt = contra ? contra.amount : 0;
            if (checkField(userRow.accum, contraAmt, true)) score += 1; 

            // 5. Check Net
            const netAmt = ppe.amount - contraAmt;
            if (checkField(userRow.net, netAmt)) score += 1;
        }
    });

    // Score Other Assets (Land, etc)
    scoreSection(bsData.otherAssets || [], landAssets);
    
    scoreField(bsData.totalNonCurAssets, expected.totals.nonCurAssets);
    scoreField(bsData.totalAssets, expected.totals.assets);

    // Score Liabilities
    scoreSection(bsData.curLiabs || [], expected.currentLiabilities);
    scoreField(bsData.totalCurLiabs, expected.totals.curLiabs);
    
    scoreSection(bsData.nonCurLiabs || [], expected.nonCurrentLiabilities);
    scoreField(bsData.totalNonCurLiabs, expected.totals.nonCurLiabs);

    scoreField(bsData.totalLiabs, expected.totals.liabs);
    
    // Score Equity Section in BS
    scoreField(bsData.endCapital, expected.totals.endCap);
    scoreField(bsData.totalLiabEquity, expected.totals.liabEquity);

    const isCorrect = score === maxScore && maxScore > 0;
    const letterGrade = getLetterGrade(score, maxScore);
    
    return { score, maxScore, letterGrade, isCorrect, expected }; 
};


// --- INTERNAL COMPONENT: Worksheet Source View (Read-Only) ---
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

// Generic Form for Cash Flows (and others if needed)
const FinancialStatementForm = ({ title, data, onChange, isReadOnly, headerColor = "bg-gray-100" }) => {
    const rows = data?.rows || [{ label: '', amount: '' }, { label: '', amount: '' }];
    const updateRow = (idx, field, val) => { const newRows = [...rows]; newRows[idx] = { ...newRows[idx], [field]: val }; onChange('rows', newRows); };
    const addRow = () => onChange('rows', [...rows, { label: '', amount: '' }]);
    const deleteRow = (idx) => { if (rows.length <= 1) return; onChange('rows', rows.filter((_, i) => i !== idx)); };

    return html`
        <div className="border rounded bg-white flex flex-col h-full shadow-sm">
            <div className=${`${headerColor} p-2 font-bold text-gray-800 border-b text-center text-sm`}>${title}</div>
            <div className="p-2 overflow-y-auto flex-1">
                <table className="w-full text-xs">
                    <thead><tr><th className="text-left p-1">Particulars</th><th className="text-right p-1 w-24">Amount</th><th className="w-6"></th></tr></thead>
                    <tbody>${rows.map((r, i) => html`<tr key=${i} className="border-b border-gray-100"><td className="p-1"><input type="text" className="w-full outline-none bg-transparent font-medium" placeholder="..." value=${r.label} onChange=${(e)=>updateRow(i, 'label', e.target.value)} disabled=${isReadOnly}/></td><td className="p-1"><input type="number" className="w-full text-right outline-none bg-transparent" placeholder="0" value=${r.amount} onChange=${(e)=>updateRow(i, 'amount', e.target.value)} disabled=${isReadOnly}/></td><td className="p-1 text-center">${!isReadOnly && html`<button onClick=${()=>deleteRow(i)} className="text-gray-400 hover:text-red-500"><${Trash2} size=${12}/></button>`}</td></tr>`)}</tbody>
                </table>
                ${!isReadOnly && html`<button onClick=${addRow} className=${btnStyle}><${Plus} size=${12}/> Add Line</button>`}
            </div>
        </div>
    `;
};

// --- BALANCE SHEET COMPONENT ---

const BalanceSheet = ({ data, onChange, isReadOnly, showFeedback, sceEndingCapital, expectedTotals, expectedData }) => {
    const [showNonCurrentAssets, setShowNonCurrentAssets] = useState(false);
    const [showNonCurrentLiabs, setShowNonCurrentLiabs] = useState(false);

    // Initial load check for Depreciable Assets row
    useEffect(() => {
        if (!data?.depAssets || data.depAssets.length === 0) {
            if (!isReadOnly && onChange) {
                // Initialize with one empty block if missing
                onChange({ ...data, depAssets: [{ asset: '', cost: '', contra: '', accum: '', net: '' }] });
            }
        }
    }, []); 

    const updateData = (updates) => onChange({ ...data, ...updates });

    // --- Asset Lists ---
    const curAssets = data?.curAssets || [{ label: '', amount: '' }];
    const otherAssets = data?.otherAssets || [{ label: '', amount: '' }];
    const depAssets = data?.depAssets || []; 

    // --- Liability Lists ---
    const curLiabs = data?.curLiabs || [{ label: '', amount: '' }];
    const nonCurLiabs = data?.nonCurLiabs || [{ label: '', amount: '' }];

    // --- Helpers ---
    const handleArrChange = (arrKey, idx, field, val) => {
        const arr = [...(data?.[arrKey] || [])];
        if (!arr[idx]) arr[idx] = {}; // Safety check
        arr[idx] = { ...arr[idx], [field]: val };
        updateData({ [arrKey]: arr });
    };
    const addRow = (arrKey, defaultObj) => updateData({ [arrKey]: [...(data?.[arrKey]||[]), defaultObj] });
    const deleteRow = (arrKey, idx) => updateData({ [arrKey]: (data?.[arrKey]||[]).filter((_, i) => i !== idx) });

    // EXPECTED TOTALS (From Truth, passed via props)
    // Fallback to 0 if not provided
    const expTotals = expectedTotals || { curAssets:0, nonCurAssets:0, assets:0, curLiabs:0, nonCurLiabs:0, liabs:0, liabEquity:0 };

    return html`
        <div className="border rounded bg-white flex flex-col h-full shadow-sm">
            <div className="bg-blue-100 p-2 font-bold text-gray-800 border-b text-center text-sm">Balance Sheet (Sole Proprietorship)</div>
            <div className="p-4 overflow-y-auto flex-1 text-xs">
                
                <div className="text-center font-bold text-sm mb-2">Assets</div>
                
                <div className="font-bold text-gray-700 mb-1">Current Assets</div>
                ${curAssets.map((r, i) => html`
                    <div key=${i} className="flex justify-between items-center border-b border-gray-100 py-1">
                        <div className="flex-1 pl-4"><input type="text" className="w-full bg-transparent outline-none" placeholder="[Current asset account]" value=${r.label} onChange=${(e)=>handleArrChange('curAssets', i, 'label', e.target.value)} disabled=${isReadOnly}/></div>
                        <div className="w-24"><input type="text" className="w-full text-right bg-transparent outline-none" placeholder="0" value=${r.amount} onChange=${(e)=>handleArrChange('curAssets', i, 'amount', e.target.value)} disabled=${isReadOnly}/></div>
                        <div className="w-6 text-center">${!isReadOnly && html`<button onClick=${()=>deleteRow('curAssets', i)}><${Trash2} size=${12} class="text-gray-400 hover:text-red-500"/></button>`}</div>
                    </div>
                `)}
                ${!isReadOnly && html`<button onClick=${()=>addRow('curAssets', {label:'', amount:''})} className=${btnStyle}><${Plus} size=${12}/> Add Current Asset Row</button>`}
                <div className="flex justify-between items-center py-1 font-semibold border-t border-black mt-1">
                    <span className="pl-8">Total Current Assets</span>
                    <div className="w-full"><${FeedbackInput} value=${data?.totalCurAssets} onChange=${(e)=>updateData({ totalCurAssets: e.target.value })} expected=${expTotals.curAssets} showFeedback=${showFeedback} isReadOnly=${isReadOnly} /></div>
                </div>

                <div className="mt-4 mb-2 flex items-center gap-2 cursor-pointer text-blue-800 font-bold text-xs" onClick=${()=>setShowNonCurrentAssets(!showNonCurrentAssets)}>
                    ${showNonCurrentAssets ? html`<${ChevronDown} size=${14}/>` : html`<${ChevronRight} size=${14}/>`} Non-current Assets Section
                </div>
                
                ${showNonCurrentAssets && html`
                    <div className="pl-2 border-l-2 border-blue-100 mb-4">
                        ${depAssets.map((block, i) => {
                            // Enhancement: Find "True" expected values based on asset name entered by user
                            // This ensures that if the User has the correct name, we validate amounts against the ANSWER KEY, not just math.
                            let expCost = 0, expAccum = 0, expNet = 0;
                            if (expectedData && block.asset) {
                                const keyword = block.asset.toLowerCase().split(' ')[0];
                                const matchAsset = expectedData.nonCurrentAssets.find(a => a.name.toLowerCase().includes(keyword));
                                if (matchAsset) {
                                    expCost = matchAsset.amount;
                                    const matchContra = expectedData.contraAssets.find(c => c.name.toLowerCase().includes(keyword));
                                    expAccum = matchContra ? matchContra.amount : 0;
                                    expNet = expCost - expAccum;
                                } else {
                                    // Fallback to internal consistency check if no match found yet
                                    expNet = parseUserValue(block.cost) - Math.abs(parseUserValue(block.accum));
                                }
                            } else {
                                expNet = parseUserValue(block.cost) - Math.abs(parseUserValue(block.accum));
                            }

                            return html`
                            <div key=${i} className="mb-2 bg-gray-50 p-2 rounded relative group">
                                <div className="flex justify-between mb-1">
                                    <input type="text" className="bg-transparent w-full outline-none font-bold text-gray-800" placeholder="[Property/Equipment Account]" value=${block.asset} onChange=${(e)=>handleArrChange('depAssets', i, 'asset', e.target.value)} disabled=${isReadOnly}/>
                                    <div className="w-24 relative">
                                        <${FeedbackInput} value=${block.cost} onChange=${(e)=>handleArrChange('depAssets', i, 'cost', e.target.value)} expected=${expCost} showFeedback=${showFeedback} isReadOnly=${isReadOnly} placeholder="Cost" required=${true} />
                                    </div>
                                </div>
                                <div className="flex justify-between mb-1 text-gray-600">
                                    <span className="pl-4 flex-1">Less: <input type="text" className="inline-block bg-transparent outline-none w-3/4 italic" placeholder="[Accum. Depr.]" value=${block.contra} onChange=${(e)=>handleArrChange('depAssets', i, 'contra', e.target.value)} disabled=${isReadOnly}/></span>
                                    <div className="w-24 relative">
                                         <${FeedbackInput} value=${block.accum} onChange=${(e)=>handleArrChange('depAssets', i, 'accum', e.target.value)} expected=${expAccum} isDeduction=${false} showFeedback=${showFeedback} isReadOnly=${isReadOnly} placeholder="0" required=${true} />
                                    </div>
                                </div>
                                <div className="flex justify-between font-bold">
                                    <span className="pl-8">Net Book Value</span>
                                    <div className="w-full"><${FeedbackInput} value=${block.net} onChange=${(e)=>handleArrChange('depAssets', i, 'net', e.target.value)} expected=${expNet} showFeedback=${showFeedback} isReadOnly=${isReadOnly} placeholder="0" required=${true} /></div>
                                </div>
                                ${!isReadOnly && html`<button onClick=${()=>deleteRow('depAssets', i)} className="absolute top-1 right-[-20px] text-red-400 opacity-0 group-hover:opacity-100"><${Trash2} size=${12}/></button>`}
                            </div>
                        `})}
                        ${!isReadOnly && html`<button onClick=${()=>addRow('depAssets', {asset:'', cost:'', contra:'', accum:'', net:''})} className=${btnStyle}><${Plus} size=${12}/> Add Depreciable Asset Row</button>`}
                        
                        ${otherAssets.map((r, i) => html`
                            <div key=${i} className="flex justify-between items-center border-b border-gray-100 py-1 mt-2">
                                <div className="flex-1 pl-4"><input type="text" className="w-full bg-transparent outline-none" placeholder="[Land / Other asset account]" value=${r.label} onChange=${(e)=>handleArrChange('otherAssets', i, 'label', e.target.value)} disabled=${isReadOnly}/></div>
                                <div className="w-24"><input type="text" className="w-full text-right bg-transparent outline-none" placeholder="0" value=${r.amount} onChange=${(e)=>handleArrChange('otherAssets', i, 'amount', e.target.value)} disabled=${isReadOnly}/></div>
                                <div className="w-6 text-center">${!isReadOnly && html`<button onClick=${()=>deleteRow('otherAssets', i)}><${Trash2} size=${12} class="text-gray-400 hover:text-red-500"/></button>`}</div>
                            </div>
                        `)}
                        ${!isReadOnly && html`<button onClick=${()=>addRow('otherAssets', {label:'', amount:''})} className=${btnStyle}><${Plus} size=${12}/> Add Other Asset Row</button>`}
                        
                        <div className="flex justify-between items-center py-1 font-semibold border-t border-black mt-2">
                            <span className="pl-8">Total Non-current Assets</span>
                            <div className="w-full"><${FeedbackInput} value=${data?.totalNonCurAssets} onChange=${(e)=>updateData({ totalNonCurAssets: e.target.value })} expected=${expTotals.nonCurAssets} showFeedback=${showFeedback} isReadOnly=${isReadOnly}/></div>
                        </div>
                    </div>
                `}

                <div className="flex justify-between items-center py-2 font-bold border-t-2 border-black border-double border-b-4 mt-2 mb-6">
                    <span className="">Total Assets</span>
                    <div className="w-full"><${FeedbackInput} value=${data?.totalAssets} onChange=${(e)=>updateData({ totalAssets: e.target.value })} expected=${expTotals.assets} showFeedback=${showFeedback} isReadOnly=${isReadOnly}/></div>
                </div>

                <div className="text-center font-bold text-sm mb-2">Liabilities and Owner's Equity</div>

                <div className="font-bold text-gray-700 mb-1">Liabilities</div>
                <div className="pl-2 mb-2 font-medium text-gray-600">Current Liabilities</div>
                ${curLiabs.map((r, i) => html`
                    <div key=${i} className="flex justify-between items-center border-b border-gray-100 py-1">
                        <div className="flex-1 pl-4"><input type="text" className="w-full bg-transparent outline-none" placeholder="[Current liability account]" value=${r.label} onChange=${(e)=>handleArrChange('curLiabs', i, 'label', e.target.value)} disabled=${isReadOnly}/></div>
                        <div className="w-24"><input type="text" className="w-full text-right bg-transparent outline-none" placeholder="0" value=${r.amount} onChange=${(e)=>handleArrChange('curLiabs', i, 'amount', e.target.value)} disabled=${isReadOnly}/></div>
                        <div className="w-6 text-center">${!isReadOnly && html`<button onClick=${()=>deleteRow('curLiabs', i)}><${Trash2} size=${12} class="text-gray-400 hover:text-red-500"/></button>`}</div>
                    </div>
                `)}
                ${!isReadOnly && html`<button onClick=${()=>addRow('curLiabs', {label:'', amount:''})} className=${btnStyle}><${Plus} size=${12}/> Add Current Liability Row</button>`}
                
                <div className="flex justify-between items-center py-1 font-semibold border-t border-black mt-1">
                    <span className="pl-8">Total Current Liabilities</span>
                    <div className="w-full"><${FeedbackInput} value=${data?.totalCurLiabs} onChange=${(e)=>updateData({ totalCurLiabs: e.target.value })} expected=${expTotals.curLiabs} showFeedback=${showFeedback} isReadOnly=${isReadOnly}/></div>
                </div>

                 <div className="mt-4 mb-2 flex items-center gap-2 cursor-pointer text-blue-800 font-bold text-xs" onClick=${()=>setShowNonCurrentLiabs(!showNonCurrentLiabs)}>
                    ${showNonCurrentLiabs ? html`<${ChevronDown} size=${14}/>` : html`<${ChevronRight} size=${14}/>`} Non-current Liabilities Section
                </div>
                ${showNonCurrentLiabs && html`
                    <div className="pl-2 border-l-2 border-blue-100 mb-4">
                         ${nonCurLiabs.map((r, i) => html`
                            <div key=${i} className="flex justify-between items-center border-b border-gray-100 py-1">
                                <div className="flex-1 pl-4"><input type="text" className="w-full bg-transparent outline-none" placeholder="[Non-current liability account]" value=${r.label} onChange=${(e)=>handleArrChange('nonCurLiabs', i, 'label', e.target.value)} disabled=${isReadOnly}/></div>
                                <div className="w-24"><input type="text" className="w-full text-right bg-transparent outline-none" placeholder="0" value=${r.amount} onChange=${(e)=>handleArrChange('nonCurLiabs', i, 'amount', e.target.value)} disabled=${isReadOnly}/></div>
                                <div className="w-6 text-center">${!isReadOnly && html`<button onClick=${()=>deleteRow('nonCurLiabs', i)}><${Trash2} size=${12} class="text-gray-400 hover:text-red-500"/></button>`}</div>
                            </div>
                        `)}
                        ${!isReadOnly && html`<button onClick=${()=>addRow('nonCurLiabs', {label:'', amount:''})} className=${btnStyle}><${Plus} size=${12}/> Add Non-current Liability Row</button>`}
                         <div className="flex justify-between items-center py-1 font-semibold border-t border-black mt-1">
                            <span className="pl-8">Total Non-current Liabilities</span>
                            <div className="w-full"><${FeedbackInput} value=${data?.totalNonCurLiabs} onChange=${(e)=>updateData({ totalNonCurLiabs: e.target.value })} expected=${expTotals.nonCurLiabs} showFeedback=${showFeedback} isReadOnly=${isReadOnly}/></div>
                        </div>
                    </div>
                `}

                <div className="flex justify-between items-center py-1 font-bold mt-2">
                    <span className="pl-0">Total Liabilities</span>
                    <div className="w-full"><${FeedbackInput} value=${data?.totalLiabs} onChange=${(e)=>updateData({ totalLiabs: e.target.value })} expected=${expTotals.liabs} showFeedback=${showFeedback} isReadOnly=${isReadOnly}/></div>
                </div>

                <div className="font-bold text-gray-700 mt-4 mb-1">Owner's Equity</div>
                <div className="flex justify-between items-center py-1">
                    <span className="pl-4 text-gray-500 italic">[Owner, Capital Ending]</span>
                    <div className="w-full"><${FeedbackInput} value=${data?.endCapital} onChange=${(e)=>updateData({ endCapital: e.target.value })} expected=${sceEndingCapital} showFeedback=${showFeedback} isReadOnly=${isReadOnly} placeholder="From SCE..."/></div>
                </div>

                <div className="flex justify-between items-center py-2 font-bold mt-4 border-t-2 border-black border-double border-b-4">
                    <span className="">Total Liabilities and Owner's Equity</span>
                    <div className="w-full"><${FeedbackInput} value=${data?.totalLiabEquity} onChange=${(e)=>updateData({ totalLiabEquity: e.target.value })} expected=${expTotals.liabEquity} showFeedback=${showFeedback} isReadOnly=${isReadOnly}/></div>
                </div>

            </div>
        </div>
    `;
};


// --------------------------------------------------------
// SCE
// --------------------------------------------------------
const StatementOfChangesInEquity = ({ data, onChange, isReadOnly, showFeedback, calculatedTotals, activityData, expectedTotals }) => {
    const { isSubsequentYear } = activityData.config;
    const { beginningBalances, transactions, ledger } = activityData;

    let expBegCap = 0;
    if (isSubsequentYear && beginningBalances) {
        expBegCap = beginningBalances.balances['Owner, Capital']?.cr || 0;
    }

    let expInvestment = 0;
    transactions.forEach(t => {
        t.credits.forEach(c => {
            if (c.account === 'Owner, Capital') {
                expInvestment += c.amount;
            }
        });
    });
    
    const expNetInc = calculatedTotals.isCr - calculatedTotals.isDr; 
    const expDrawings = (ledger['Owner, Drawings']?.debit || 0) - (ledger['Owner, Drawings']?.credit || 0);

    const expTotalAdditions = expInvestment + (expNetInc > 0 ? expNetInc : 0);
    const expTotalCapDuring = expBegCap + expTotalAdditions;
    const expTotalDeductions = expDrawings + (expNetInc < 0 ? Math.abs(expNetInc) : 0);
    const expEndCap = expTotalCapDuring - expTotalDeductions;

    const additions = data?.additions || [{ label: '', amount: '' }];
    const deductions = data?.deductions || [{ label: '', amount: '' }];
    const updateData = (updates) => onChange({ ...data, ...updates });

    const handleArrChange = (key, idx, field, val) => {
        const arr = [...(key === 'additions' ? additions : deductions)];
        arr[idx] = { ...arr[idx], [field]: val };
        updateData({ [key]: arr });
    };
    const addRow = (key) => updateData({ [key]: [...(key==='additions'?additions:deductions), { label: '', amount: '' }] });
    const deleteRow = (key, idx) => {
        const arr = [...(key === 'additions' ? additions : deductions)];
        if (arr.length <= 1) return;
        updateData({ [key]: arr.filter((_, i) => i !== idx) });
    };

    return html`
        <div className="border rounded bg-white flex flex-col h-full shadow-sm">
            <div className="bg-yellow-100 p-2 font-bold text-gray-800 border-b text-center text-sm">Statement of Changes in Equity (Sole Proprietorship)</div>
            <div className="p-4 overflow-y-auto flex-1 text-xs">
                
                <div className="flex justify-between items-center py-1">
                    <span className="text-gray-500 italic pl-0">[Owner, Capital - beginning]</span>
                    <div className="w-full"><${FeedbackInput} value=${data?.begCapital} onChange=${(e)=>updateData({ begCapital: e.target.value })} expected=${expBegCap} showFeedback=${showFeedback} isReadOnly=${isReadOnly} placeholder="0"/></div>
                </div>

                <div className="mt-2 font-bold text-gray-800">Add: <span className="text-gray-400 font-normal italic">[Additions to Capital]</span></div>
                <table className="w-full mb-1"><tbody>${additions.map((r,i)=>html`<tr key=${i}><td className="p-1 pl-4"><input type="text" className="w-full bg-transparent" placeholder="Investment / Net Income..." value=${r.label} onChange=${(e)=>handleArrChange('additions',i,'label',e.target.value)} disabled=${isReadOnly}/></td><td className="w-24"><input type="text" className="w-full text-right bg-transparent border-b" value=${r.amount} onChange=${(e)=>handleArrChange('additions',i,'amount',e.target.value)} disabled=${isReadOnly}/></td><td><button onClick=${()=>deleteRow('additions',i)}><${Trash2} size=${12}/></button></td></tr>`)}</tbody></table>
                ${!isReadOnly && html`<button onClick=${()=>addRow('additions')} className=${btnStyle}><${Plus} size=${12}/> Add Addition Row</button>`}
                
                <div className="flex justify-between items-center py-1 font-semibold border-t border-black">
                    <span className="pl-8">Total Additions to Capital</span>
                    <div className="w-full"><${FeedbackInput} value=${data?.totalAdditions} onChange=${(e)=>updateData({ totalAdditions: e.target.value })} expected=${expTotalAdditions} showFeedback=${showFeedback} isReadOnly=${isReadOnly}/></div>
                </div>

                <div className="flex justify-between items-center py-2 font-semibold">
                    <span className="">Total Owner, Capital during the period</span>
                    <div className="w-full"><${FeedbackInput} value=${data?.totalCapDuring} onChange=${(e)=>updateData({ totalCapDuring: e.target.value })} expected=${expTotalCapDuring} showFeedback=${showFeedback} isReadOnly=${isReadOnly}/></div>
                </div>

                <div className="mt-2 font-bold text-gray-800">Less: <span className="text-gray-400 font-normal italic">[Deductions from Capital]</span></div>
                <table className="w-full mb-1"><tbody>${deductions.map((r,i)=>html`<tr key=${i}><td className="p-1 pl-4"><input type="text" className="w-full bg-transparent" placeholder="Drawings / Net Loss..." value=${r.label} onChange=${(e)=>handleArrChange('deductions',i,'label',e.target.value)} disabled=${isReadOnly}/></td><td className="w-24"><input type="text" className="w-full text-right bg-transparent border-b" value=${r.amount} onChange=${(e)=>handleArrChange('deductions',i,'amount',e.target.value)} disabled=${isReadOnly}/></td><td><button onClick=${()=>deleteRow('deductions',i)}><${Trash2} size=${12}/></button></td></tr>`)}</tbody></table>
                ${!isReadOnly && html`<button onClick=${()=>addRow('deductions')} className=${btnStyle}><${Plus} size=${12}/> Add Deduction Row</button>`}

                <div className="flex justify-between items-center py-1 font-semibold border-t border-black">
                    <span className="pl-8">Total Deductions from Capital</span>
                    <div className="w-full"><${FeedbackInput} value=${data?.totalDeductions} onChange=${(e)=>updateData({ totalDeductions: e.target.value })} expected=${expTotalDeductions} showFeedback=${showFeedback} isReadOnly=${isReadOnly}/></div>
                </div>

                <div className="flex justify-between items-center py-2 font-bold mt-2 border-t border-black border-b-4 border-double">
                    <span className="text-gray-500 italic">[Owner, Capital - ending]</span>
                    <div className="w-full"><${FeedbackInput} value=${data?.endCapital} onChange=${(e)=>updateData({ endCapital: e.target.value })} expected=${expEndCap} showFeedback=${showFeedback} isReadOnly=${isReadOnly} placeholder="0"/></div>
                </div>
            </div>
        </div>
    `;
};


// --- RESTORED INCOME STATEMENT COMPONENTS (FROM DEC 8) ---

const ServiceSingleStepIS = ({ data, onChange, isReadOnly, showFeedback, calculatedTotals, expectedTotals }) => {
    const revenues = data?.revenues || [{ label: '', amount: '' }];
    const expenses = data?.expenses || [{ label: '', amount: '' }];
    const updateData = (updates) => onChange({ ...data, ...updates });
    const handleArrChange = (key, idx, field, val) => { const arr = [...(key==='revenues'?revenues:expenses)]; arr[idx] = {...arr[idx], [field]:val}; updateData({[key]: arr}); };
    const addRow = (key) => updateData({ [key]: [...(key==='revenues'?revenues:expenses), { label: '', amount: '' }] });
    const deleteRow = (key, idx) => { const arr = [...(key==='revenues'?revenues:expenses)]; if(arr.length<=1)return; updateData({[key]: arr.filter((_, i)=>i!==idx)}); };
    const expRev = calculatedTotals.isCr; const expExp = calculatedTotals.isDr; const expNI = expRev - expExp;
    return html`
        <div className="border rounded bg-white flex flex-col h-full shadow-sm">
            <div className="bg-green-100 p-2 font-bold text-gray-800 border-b text-center text-sm">Income Statement (Single-Step Service)</div>
            <div className="p-4 overflow-y-auto flex-1 text-xs">
                <div className="mb-4"><div className="font-bold mb-1 text-gray-800">Revenues</div><table className="w-full mb-1"><tbody>${revenues.map((r,i)=>html`<tr key=${i}><td className="p-1 pl-4"><input type="text" className="w-full outline-none bg-transparent" placeholder="[Revenue Account]" value=${r.label} onChange=${(e)=>handleArrChange('revenues',i,'label',e.target.value)} disabled=${isReadOnly}/></td><td className="p-1 w-24"><input type="text" className="w-full text-right outline-none bg-transparent border-b border-gray-200" value=${r.amount} onChange=${(e)=>handleArrChange('revenues',i,'amount',e.target.value)} disabled=${isReadOnly}/></td><td className="p-1 w-6 text-center">${!isReadOnly && html`<button onClick=${()=>deleteRow('revenues',i)}><${Trash2} size=${12}/></button>`}</td></tr>`)}</tbody></table>${!isReadOnly && html`<button onClick=${()=>addRow('revenues')} className=${btnStyle}><${Plus} size=${12}/> Add Revenue Row</button>`}<div className="flex justify-between items-center py-1 font-bold mt-1"><span className="pl-0">Total Revenues</span><div className="w-full"><${FeedbackInput} value=${data?.totalRevenues} onChange=${(e)=>updateData({ totalRevenues: e.target.value })} expected=${expectedTotals?.rev || expRev} showFeedback=${showFeedback} isReadOnly=${isReadOnly}/></div></div></div>
                <div className="mb-4"><div className="font-bold mb-1 text-gray-800">Less: Expenses</div><table className="w-full mb-1"><tbody>${expenses.map((r,i)=>html`<tr key=${i}><td className="p-1 pl-4"><input type="text" className="w-full outline-none bg-transparent" placeholder="[Expense Account]" value=${r.label} onChange=${(e)=>handleArrChange('expenses',i,'label',e.target.value)} disabled=${isReadOnly}/></td><td className="p-1 w-24"><input type="text" className="w-full text-right outline-none bg-transparent border-b border-gray-200" value=${r.amount} onChange=${(e)=>handleArrChange('expenses',i,'amount',e.target.value)} disabled=${isReadOnly}/></td><td className="p-1 w-6 text-center">${!isReadOnly && html`<button onClick=${()=>deleteRow('expenses',i)}><${Trash2} size=${12}/></button>`}</td></tr>`)}</tbody></table>${!isReadOnly && html`<button onClick=${()=>addRow('expenses')} className=${btnStyle}><${Plus} size=${12}/> Add Expense Row</button>`}<div className="flex justify-between items-center py-1 font-bold mt-1"><span className="pl-0">Total Expenses</span><div className="w-full"><${FeedbackInput} value=${data?.totalExpenses} onChange=${(e)=>updateData({ totalExpenses: e.target.value })} expected=${expectedTotals?.exp || expExp} showFeedback=${showFeedback} isReadOnly=${isReadOnly}/></div></div></div>
                <div className="space-y-1 mt-4 border-t-2 border-gray-400 pt-2"><div className="flex justify-between items-center py-1 font-semibold"><span className="">Net Income (Loss) before taxes</span><div className="w-full"><${FeedbackInput} value=${data?.netIncomeBeforeTax} onChange=${(e)=>updateData({ netIncomeBeforeTax: e.target.value })} expected=${expNI} showFeedback=${showFeedback} isReadOnly=${isReadOnly}/></div></div><div className="flex justify-between items-center py-1"><span className="pl-4">Less: Income Tax</span><div className="w-full"><${FeedbackInput} value=${data?.incomeTax} onChange=${(e)=>updateData({ incomeTax: e.target.value })} expected=${0} showFeedback=${showFeedback} isReadOnly=${isReadOnly} /></div></div><div className="flex justify-between items-center py-2 font-bold text-blue-900 bg-gray-50 border-t-2 border-black border-double border-b-4"><span className="">Net Income (Loss) after taxes</span><div className="w-full"><${FeedbackInput} value=${data?.netIncomeAfterTax} onChange=${(e)=>updateData({ netIncomeAfterTax: e.target.value })} expected=${expNI} showFeedback=${showFeedback} isReadOnly=${isReadOnly}/></div></div></div>
            </div>
        </div>
    `;
};

const ServiceMultiStepIS = ({ data, onChange, isReadOnly, showFeedback, calculatedTotals, expectedTotals }) => {
    const opRevenues = data?.opRevenues || [{ label: '', amount: '' }];
    const opExpenses = data?.opExpenses || [{ label: '', amount: '' }];
    const nonOpItems = data?.nonOpItems || [{ label: '', amount: '' }];
    const updateData = (updates) => onChange({ ...data, ...updates });
    const handleArrChange = (key, idx, field, val) => { const arr = [...(key==='opRevenues'?opRevenues:key==='opExpenses'?opExpenses:nonOpItems)]; arr[idx] = {...arr[idx], [field]:val}; updateData({[key]: arr}); };
    const addRow = (key) => updateData({ [key]: [...(key==='opRevenues'?opRevenues:key==='opExpenses'?opExpenses:nonOpItems), { label: '', amount: '' }] });
    const deleteRow = (key, idx) => { const arr = [...(key==='opRevenues'?opRevenues:key==='opExpenses'?opExpenses:nonOpItems)]; if(arr.length<=1)return; updateData({[key]: arr.filter((_, i)=>i!==idx)}); };
    const expRev = calculatedTotals.isCr; const expExp = calculatedTotals.isDr; const expNI = expRev - expExp;
    return html`
        <div className="border rounded bg-white flex flex-col h-full shadow-sm">
            <div className="bg-green-100 p-2 font-bold text-gray-800 border-b text-center text-sm">Income Statement (Multi-Step Service)</div>
            <div className="p-4 overflow-y-auto flex-1 text-xs">
                <div className="mb-4"><div className="font-bold mb-1">Operating Revenues</div><table className="w-full"><tbody>${opRevenues.map((r,i)=>html`<tr key=${i}><td className="pl-4"><input type="text" className="w-full bg-transparent" value=${r.label} onChange=${(e)=>handleArrChange('opRevenues',i,'label',e.target.value)} disabled=${isReadOnly} placeholder="[Revenue Account]"/></td><td className="w-24"><input type="text" className="w-full text-right bg-transparent border-b" value=${r.amount} onChange=${(e)=>handleArrChange('opRevenues',i,'amount',e.target.value)} disabled=${isReadOnly}/></td><td><button onClick=${()=>deleteRow('opRevenues',i)}><${Trash2} size=${12}/></button></td></tr>`)}</tbody></table><button onClick=${()=>addRow('opRevenues')} class=${btnStyle}><${Plus} size=${12}/> Add Revenue Row</button><div class="flex justify-between font-bold"><span>Total Operating Revenues</span><input type="text" class="w-24 text-right" value=${data?.totalOpRevenues} onChange=${(e)=>updateData({totalOpRevenues:e.target.value})} disabled=${isReadOnly}/></div></div>
                <div className="mb-4"><div className="font-bold mb-1">Operating Expenses</div><table className="w-full"><tbody>${opExpenses.map((r,i)=>html`<tr key=${i}><td className="pl-4"><input type="text" className="w-full bg-transparent" value=${r.label} onChange=${(e)=>handleArrChange('opExpenses',i,'label',e.target.value)} disabled=${isReadOnly} placeholder="[Operating Expense Account]"/></td><td className="w-24"><input type="text" className="w-full text-right bg-transparent border-b" value=${r.amount} onChange=${(e)=>handleArrChange('opExpenses',i,'amount',e.target.value)} disabled=${isReadOnly}/></td><td><button onClick=${()=>deleteRow('opExpenses',i)}><${Trash2} size=${12}/></button></td></tr>`)}</tbody></table><button onClick=${()=>addRow('opExpenses')} class=${btnStyle}><${Plus} size=${12}/> Add Expense Row</button><div class="flex justify-between font-bold"><span>Total Operating Expenses</span><input type="text" class="w-24 text-right" value=${data?.totalOpExpenses} onChange=${(e)=>updateData({totalOpExpenses:e.target.value})} disabled=${isReadOnly}/></div></div>
                <div className="flex justify-between items-center border-t border-b border-gray-300 py-1 font-bold bg-gray-50 mb-4"><span className="">Net Operating Income (Loss)</span><input type="text" className="w-24 text-right outline-none bg-transparent pr-7" value=${data?.netOpIncome || ''} onChange=${(e)=>updateData({ netOpIncome: e.target.value })} disabled=${isReadOnly}/></div>
                <div className="mb-4"><div className="font-bold mb-1">Non-Operating Income and Expenses</div><table className="w-full"><tbody>${nonOpItems.map((r,i)=>html`<tr key=${i}><td className="pl-4"><input type="text" className="w-full bg-transparent" value=${r.label} onChange=${(e)=>handleArrChange('nonOpItems',i,'label',e.target.value)} disabled=${isReadOnly} placeholder="[Non-Operating Account]"/></td><td className="w-24"><input type="text" className="w-full text-right bg-transparent border-b" value=${r.amount} onChange=${(e)=>handleArrChange('nonOpItems',i,'amount',e.target.value)} disabled=${isReadOnly}/></td><td><button onClick=${()=>deleteRow('nonOpItems',i)}><${Trash2} size=${12}/></button></td></tr>`)}</tbody></table><button onClick=${()=>addRow('nonOpItems')} class=${btnStyle}><${Plus} size=${12}/> Add Non-Operating Row</button><div class="flex justify-between font-bold"><span>Net Non-operating Income (Loss)</span><input type="text" class="w-24 text-right" value=${data?.netNonOpIncome} onChange=${(e)=>updateData({netNonOpIncome:e.target.value})} disabled=${isReadOnly}/></div></div>
                <div className="space-y-1 mt-4 border-t-2 border-gray-400 pt-2"><div className="flex justify-between items-center py-1 font-semibold"><span className="">Net Income (Loss) before taxes</span><div className="w-full"><${FeedbackInput} value=${data?.netIncomeBeforeTax} onChange=${(e)=>updateData({ netIncomeBeforeTax: e.target.value })} expected=${expNI} showFeedback=${showFeedback} isReadOnly=${isReadOnly}/></div></div><div className="flex justify-between items-center py-2 font-bold text-blue-900 bg-gray-50 border-t-2 border-black border-double border-b-4"><span className="">Net Income (Loss) after taxes</span><div className="w-full"><${FeedbackInput} value=${data?.netIncomeAfterTax} onChange=${(e)=>updateData({ netIncomeAfterTax: e.target.value })} expected=${expNI} showFeedback=${showFeedback} isReadOnly=${isReadOnly}/></div></div></div>
            </div>
        </div>
    `;
};

// --- RESTORED MERCH COMPONENTS ---

const MerchPeriodicIS = ({ data, onChange, isReadOnly, showFeedback, calculatedTotals, type = "Single", expectedTotals }) => {
    const { ledger, adjustments } = calculatedTotals;
    const getBal = (accName) => { const acc = Object.keys(ledger).find(k => k.toLowerCase() === accName.toLowerCase()); if (!acc) return 0; return (ledger[acc].debit || 0) - (ledger[acc].credit || 0); };
    
    // Values for Validation
    const expSales = Math.abs(getBal('Sales')); 
    const expSalesDisc = getBal('Sales Discounts'); 
    const expSalesRet = getBal('Sales Returns and Allowances'); 
    const expNetSales = expSales - expSalesDisc - expSalesRet;
    const expPurch = getBal('Purchases'); 
    const expPurchDisc = Math.abs(getBal('Purchase Discounts')); 
    const expPurchRet = Math.abs(getBal('Purchase Returns and Allowances')); 
    const expNetPurch = expPurch - expPurchDisc - expPurchRet;
    const expFreightIn = getBal('Freight In'); 
    const expCostPurch = expNetPurch + expFreightIn;
    const expBegInv = getBal('Merchandise Inventory'); 
    const expTGAS = expBegInv + expCostPurch;
    let expEndInv = 0; adjustments.forEach(a => { if (a.drAcc === 'Merchandise Inventory' || a.crAcc === 'Merchandise Inventory') { expEndInv = a.amount; } });
    const expCOGS = expTGAS - expEndInv; 
    const expGross = expNetSales - expCOGS;
    
    // Expenses
    const totalExpenses = calculatedTotals.isDr; 
    const expOpExp = totalExpenses - (expBegInv + expPurch + expFreightIn + expSalesDisc + expSalesRet);
    const expOpIncome = expGross - expOpExp; 
    const expNonOp = 0; 
    const expNI = expOpIncome + expNonOp;
    
    const updateData = (updates) => onChange({ ...data, ...updates });
    const handleAmountChange = (key, val) => {
        if (/^[0-9.,\-() ]*$/.test(val)) updateData({ [key]: val });
    };

    const renderRow = (label, valueKey, expected, isDeduction=false, indent='pl-4', placeholder='0.00', showInput=true, labelKey=null) => html`<div className="flex justify-between items-center py-1">
        ${labelKey 
            ? html`<span className=${indent}><input type="text" className="w-64 outline-none bg-transparent border-b border-gray-300 focus:border-blue-500 placeholder-gray-400 italic" placeholder=${label} value=${data?.[labelKey] || ''} onChange=${(e)=>updateData({ [labelKey]: e.target.value })} disabled=${isReadOnly}/></span>`
            : html`<span className=${indent}>${label}</span>`
        }
        ${showInput ? html`<div className="w-full"><${FeedbackInput} value=${data?.[valueKey]} onChange=${(e)=>handleAmountChange(valueKey, e.target.value)} expected=${expected} isDeduction=${isDeduction} showFeedback=${showFeedback} isReadOnly=${isReadOnly} placeholder=${placeholder}/></div>` : ''}
    </div>`;

    // Dynamic Expense Rows
    const expenseRows = data?.expenses || [{label:'', amount:''}];
    const opExpenseRows = data?.opExpenses || [{label:'', amount:''}];
    const nonOpRows = data?.nonOpItems || [{label:'', amount:''}];
    const otherIncomeRows = data?.otherIncome || [{label:'', amount:''}];
    
    const handleArrChange = (key, idx, field, val) => { const arr = [...(data[key] || [{label:'', amount:''} ])]; arr[idx] = {...arr[idx], [field]:val}; updateData({[key]: arr}); };
    const handleArrAmountChange = (key, idx, val) => {
        if (/^[0-9.,\-() ]*$/.test(val)) handleArrChange(key, idx, 'amount', val);
    };
    const addRow = (key) => updateData({ [key]: [...(data[key]||[{label:'',amount:''}]), { label: '', amount: '' }] });
    const deleteRow = (key, idx) => { const arr = [...(data[key] || [])]; if(arr.length<=1)return; updateData({[key]: arr.filter((_, i)=>i!==idx)}); };
    
    return html`
        <div className="border rounded bg-white flex flex-col h-full shadow-sm">
            <div className="bg-blue-100 p-2 font-bold text-gray-800 border-b text-center text-sm">Income Statement (${type}-Step Periodic)</div>
            <div className="p-4 overflow-y-auto flex-1 text-xs">
                ${type === 'Single' ? html`<div className="mb-2 font-bold text-gray-800">Revenues</div>` : html`<div className="mb-2 font-bold text-gray-800">Operating Revenues</div>`}
                ${renderRow('[Sales Account]', 'sales', expSales, false, 'pl-4', '0.00', true, 'salesLabel')}
                <div className="flex items-center gap-2 pl-8 text-blue-600 mb-1 cursor-pointer hover:underline text-xs" onClick=${()=>updateData({showSalesDetails: !data.showSalesDetails})}>${data.showSalesDetails ? '- Hide' : '+ Show'} Sales Discounts / Allowances Row</div>
                ${data.showSalesDetails && html`
                    ${renderRow('Less: Sales Discounts', 'salesDisc', -expSalesDisc, true, 'pl-8')}
                    ${renderRow('Less: Sales Returns and Allowances', 'salesRet', -expSalesRet, true, 'pl-8')}
                `}
                <div className="border-t border-black mt-1 mb-2"></div>
                ${renderRow('Net Sales', 'netSales', expNetSales, false, 'pl-4 font-bold')}

                <div className="mt-4 mb-2 font-bold text-gray-800">Cost of Goods Sold</div>
                ${renderRow('[Inventory Account - beginning]', 'begInv', expBegInv, false, 'pl-4', '[Beg Inv]', true, 'begInvLabel')}
                ${renderRow('[Purchases Account]', 'purchases', expPurch, false, 'pl-4', '[Purchases]', true, 'purchasesLabel')}
                <div className="flex items-center gap-2 pl-8 text-blue-600 mb-1 cursor-pointer hover:underline text-xs" onClick=${()=>updateData({showPurchDetails: !data.showPurchDetails})}>${data.showPurchDetails ? '- Hide' : '+ Show'} Purchase Discounts / Allowances Row</div>
                ${data.showPurchDetails && html`
                     ${renderRow('Less: Purchase Discounts', 'purchDisc', -expPurchDisc, true, 'pl-12')}
                     ${renderRow('Less: Purchase Returns', 'purchRet', -expPurchRet, true, 'pl-12')}
                `}
                ${renderRow('Net Purchases', 'netPurch', expNetPurch, false, 'pl-8 font-semibold')}
                ${renderRow('[Freight-in / Transportation In]', 'freightIn', expFreightIn, false, 'pl-8', '[Freight In]', true, 'freightInLabel')}
                <div className="border-t border-gray-300 mt-1 mb-1"></div>
                ${renderRow('Total Cost of Goods Purchased', 'costPurch', expCostPurch, false, 'pl-4 font-semibold')}
                <div className="border-t border-black mt-1 mb-1"></div>
                ${renderRow('Total Goods Available for Sale', 'tgas', expTGAS, false, 'pl-4 font-bold')}
                ${renderRow('[Inventory Account - ending]', 'endInv', -expEndInv, true, 'pl-4', '[End Inv]', true, 'endInvLabel')}
                <div className="border-b border-black mb-2"></div>
                ${renderRow('Cost of Goods Sold', 'cogs', -expCOGS, true, 'pl-0 font-bold text-red-700')}
                
                <div className="border-b-2 border-black mb-4"></div>
                ${renderRow('GROSS INCOME', 'grossIncome', expGross, false, 'pl-0 font-bold')}

                ${type === 'Single' ? html`
                    <div className="mt-4 font-bold text-gray-800">Other Operating & Non-Operating Income</div>
                    <table className="w-full mb-1"><tbody>${(data.otherIncome||[{label:'',amount:''}]).map((r,i)=>html`<tr key=${i}><td className="p-1 pl-4"><input type="text" className="w-full bg-transparent" placeholder="[Other operating / non-operating income]" value=${r.label} onChange=${(e)=>handleArrChange('otherIncome',i,'label',e.target.value)} disabled=${isReadOnly}/></td><td className="w-24"><input type="text" className="w-full text-right bg-transparent border-b" value=${r.amount} onChange=${(e)=>handleArrAmountChange('otherIncome',i,e.target.value)} disabled=${isReadOnly}/></td><td><button onClick=${()=>deleteRow('otherIncome',i)}><${Trash2} size=${12}/></button></td></tr>`)}</tbody></table><button onClick=${()=>addRow('otherIncome')} class=${btnStyle}><${Plus} size=${12}/> Add Revenue Row</button>
                    ${renderRow('Total Revenues', 'totalRevenues', expGross, false, 'pl-0 font-bold')}

                    <div className="mt-4 font-bold text-gray-800">Expenses</div>
                    <table className="w-full mb-1"><tbody>${expenseRows.map((r,i)=>html`<tr key=${i}><td className="p-1 pl-4"><input type="text" className="w-full bg-transparent" placeholder="[Operating / Non-operating Expense Account]" value=${r.label} onChange=${(e)=>handleArrChange('expenses',i,'label',e.target.value)} disabled=${isReadOnly}/></td><td className="w-24"><input type="text" className="w-full text-right bg-transparent border-b" value=${r.amount} onChange=${(e)=>handleArrAmountChange('expenses',i,e.target.value)} disabled=${isReadOnly}/></td><td><button onClick=${()=>deleteRow('expenses',i)}><${Trash2} size=${12}/></button></td></tr>`)}</tbody></table><button onClick=${()=>addRow('expenses')} class=${btnStyle}><${Plus} size=${12}/> Add Expense Row</button>
                    ${renderRow('Total Expenses', 'totalExpenses', expOpExp, false, 'pl-0 font-bold')}
                ` : html`
                    <div className="mt-4 font-bold text-gray-800">Less: Operating Expenses</div>
                    <table className="w-full mb-1"><tbody>${opExpenseRows.map((r,i)=>html`<tr key=${i}><td className="p-1 pl-4"><input type="text" className="w-full bg-transparent" placeholder="[Operating Expense Account]" value=${r.label} onChange=${(e)=>handleArrChange('opExpenses',i,'label',e.target.value)} disabled=${isReadOnly}/></td><td className="w-24"><input type="text" className="w-full text-right bg-transparent border-b" value=${r.amount} onChange=${(e)=>handleArrAmountChange('opExpenses',i,e.target.value)} disabled=${isReadOnly}/></td><td><button onClick=${()=>deleteRow('opExpenses',i)}><${Trash2} size=${12}/></button></td></tr>`)}</tbody></table><button onClick=${()=>addRow('opExpenses')} class=${btnStyle}><${Plus} size=${12}/> Add Expense Row</button>
                    ${renderRow('Total Operating Expenses', 'totalOpExpenses', expOpExp, false, 'pl-4 font-semibold')}
                    ${renderRow('Net Operating Income (Loss)', 'netOpInc', expOpIncome, false, 'pl-0 font-bold')}
                    
                    <div className="mt-4 font-bold text-gray-800">Non-Operating Income and Expenses</div>
                    <table className="w-full mb-1"><tbody>${nonOpRows.map((r,i)=>html`<tr key=${i}><td className="p-1 pl-4"><input type="text" className="w-full bg-transparent" placeholder="[Non-Operating Expense Account]" value=${r.label} onChange=${(e)=>handleArrChange('nonOpItems',i,'label',e.target.value)} disabled=${isReadOnly}/></td><td className="w-24"><input type="text" className="w-full text-right bg-transparent border-b" value=${r.amount} onChange=${(e)=>handleArrAmountChange('nonOpItems',i,e.target.value)} disabled=${isReadOnly}/></td><td><button onClick=${()=>deleteRow('nonOpItems',i)}><${Trash2} size=${12}/></button></td></tr>`)}</tbody></table><button onClick=${()=>addRow('nonOpItems')} class=${btnStyle}><${Plus} size=${12}/> Add Non-Operating Row</button>
                    ${renderRow('Net Non-Operating Income (Loss)', 'netNonOp', expNonOp, false, 'pl-4')}
                `}

                <div className="mt-6 border-t-2 border-black pt-2">
                     ${renderRow('Net Income (Loss) before taxes', 'niBefore', expNI, false, 'pl-0 font-bold')}
                     ${renderRow('Income Tax', 'tax', 0, true, 'pl-4')}
                     <div className="border-b-4 border-double border-black mb-1"></div>
                     ${renderRow('Net Income (Loss) after taxes', 'niAfter', expNI, false, 'pl-0 font-bold')}
                </div>
            </div>
        </div>
    `;
};

const MerchPerpetualIS = ({ data, onChange, isReadOnly, showFeedback, calculatedTotals, type = "Single", expectedTotals }) => {
    const { ledger } = calculatedTotals;
    const getBal = (accName) => { const acc = Object.keys(ledger).find(k => k.toLowerCase() === accName.toLowerCase()); if (!acc) return 0; return (ledger[acc].debit || 0) - (ledger[acc].credit || 0); };

    // Perpetual Values
    const expSales = Math.abs(getBal('Sales')); 
    const expSalesDisc = getBal('Sales Discounts'); 
    const expSalesRet = getBal('Sales Returns and Allowances'); 
    const expNetSales = expSales - expSalesDisc - expSalesRet;
    const expCOGS = getBal('Cost of Goods Sold'); 
    const expGross = expNetSales - expCOGS;
    const totalISDebits = calculatedTotals.isDr; 
    const expOpExp = totalISDebits - (expSalesDisc + expSalesRet + expCOGS);
    const expOpIncome = expGross - expOpExp;
    const expNonOp = 0; 
    const expNI = expOpIncome + expNonOp;

    const updateData = (updates) => onChange({ ...data, ...updates });
    const handleAmountChange = (key, val) => {
        if (/^[0-9.,\-() ]*$/.test(val)) updateData({ [key]: val });
    };

    const renderRow = (label, valueKey, expected, isDeduction=false, indent='pl-4', placeholder='0.00', showInput=true, labelKey=null) => html`<div className="flex justify-between items-center py-1">
        ${labelKey 
            ? html`<span className=${indent}><input type="text" className="w-64 outline-none bg-transparent border-b border-gray-300 focus:border-blue-500 placeholder-gray-400 italic" placeholder=${label} value=${data?.[labelKey] || ''} onChange=${(e)=>updateData({ [labelKey]: e.target.value })} disabled=${isReadOnly}/></span>`
            : html`<span className=${indent}>${label}</span>`
        }
        ${showInput ? html`<div className="w-full"><${FeedbackInput} value=${data?.[valueKey]} onChange=${(e)=>handleAmountChange(valueKey, e.target.value)} expected=${expected} isDeduction=${isDeduction} showFeedback=${showFeedback} isReadOnly=${isReadOnly} placeholder=${placeholder}/></div>` : ''}
    </div>`;
    
    // Dynamic Row Helpers
    const expenseRows = data?.expenses || [{label:'', amount:''}];
    const opExpenseRows = data?.opExpenses || [{label:'', amount:''}];
    const nonOpRows = data?.nonOpItems || [{label:'', amount:''}];
    const otherIncomeRows = data?.otherIncome || [{label:'', amount:''}];

    const handleArrChange = (key, idx, field, val) => { const arr = [...(data[key] || [{label:'', amount:''} ])]; arr[idx] = {...arr[idx], [field]:val}; updateData({[key]: arr}); };
    const handleArrAmountChange = (key, idx, val) => {
        if (/^[0-9.,\-() ]*$/.test(val)) handleArrChange(key, idx, 'amount', val);
    };
    const addRow = (key) => updateData({ [key]: [...(data[key]||[{label:'',amount:''}]), { label: '', amount: '' }] });
    const deleteRow = (key, idx) => { const arr = [...(data[key]||[])]; if(arr.length<=1)return; updateData({[key]: arr.filter((_, i)=>i!==idx)}); };

    return html`
        <div className="border rounded bg-white flex flex-col h-full shadow-sm">
            <div className="bg-blue-100 p-2 font-bold text-gray-800 border-b text-center text-sm">Income Statement (${type}-Step Perpetual)</div>
            <div className="p-4 overflow-y-auto flex-1 text-xs">
                ${type === 'Single' ? html`<div className="mb-2 font-bold text-gray-800">Revenues</div>` : html`<div className="mb-2 font-bold text-gray-800">Operating Revenues</div>`}
                ${renderRow('[Sales Account]', 'sales', expSales, false, 'pl-4', '0.00', true, 'salesLabel')}
                <div className="flex items-center gap-2 pl-8 text-blue-600 mb-1 cursor-pointer hover:underline text-xs" onClick=${()=>updateData({showSalesDetails: !data.showSalesDetails})}>${data.showSalesDetails ? '- Hide' : '+ Show'} Sales Discounts / Allowances Row</div>
                ${data.showSalesDetails && html`
                    ${renderRow('Less: Sales Discounts', 'salesDisc', -expSalesDisc, true, 'pl-8')}
                    ${renderRow('Less: Sales Returns and Allowances', 'salesRet', -expSalesRet, true, 'pl-8')}
                `}
                <div className="border-t border-black mt-1 mb-2"></div>
                ${renderRow('Net Sales', 'netSales', expNetSales, false, 'pl-4 font-bold')}

                ${renderRow('Cost of Goods Sold', 'cogs', -expCOGS, true, 'pl-4', '0.00', true, 'cogsLabel')}
                
                <div className="border-b-2 border-black mb-4"></div>
                ${renderRow('GROSS INCOME', 'grossIncome', expGross, false, 'pl-0 font-bold')}

                ${type === 'Single' ? html`
                    <div className="mt-4 font-bold text-gray-800">Other Operating & Non-Operating Income</div>
                    <table className="w-full mb-1"><tbody>${(otherIncomeRows).map((r,i)=>html`<tr key=${i}><td className="p-1 pl-4"><input type="text" className="w-full bg-transparent" placeholder="[Other operating / non-operating income]" value=${r.label} onChange=${(e)=>handleArrChange('otherIncome',i,'label',e.target.value)} disabled=${isReadOnly}/></td><td className="w-24"><input type="text" className="w-full text-right bg-transparent border-b" value=${r.amount} onChange=${(e)=>handleArrAmountChange('otherIncome',i,e.target.value)} disabled=${isReadOnly}/></td><td><button onClick=${()=>deleteRow('otherIncome',i)}><${Trash2} size=${12}/></button></td></tr>`)}</tbody></table><button onClick=${()=>addRow('otherIncome')} class=${btnStyle}><${Plus} size=${12}/> Add Revenue Row</button>
                    ${renderRow('Total Revenues', 'totalRevenues', expGross, false, 'pl-0 font-bold')}

                    <div className="mt-4 font-bold text-gray-800">Expenses</div>
                    <table className="w-full mb-1"><tbody>${expenseRows.map((r,i)=>html`<tr key=${i}><td className="p-1 pl-4"><input type="text" className="w-full bg-transparent" placeholder="[Operating / Non-operating Expense Account]" value=${r.label} onChange=${(e)=>handleArrChange('expenses',i,'label',e.target.value)} disabled=${isReadOnly}/></td><td className="w-24"><input type="text" className="w-full text-right bg-transparent border-b" value=${r.amount} onChange=${(e)=>handleArrAmountChange('expenses',i,e.target.value)} disabled=${isReadOnly}/></td><td><button onClick=${()=>deleteRow('expenses',i)}><${Trash2} size=${12}/></button></td></tr>`)}</tbody></table><button onClick=${()=>addRow('expenses')} class=${btnStyle}><${Plus} size=${12}/> Add Expense Row</button>
                    ${renderRow('Total Expenses', 'totalExpenses', expOpExp, false, 'pl-0 font-bold')}
                ` : html`
                    <div className="mt-4 font-bold text-gray-800">Operating Expenses</div>
                    <table className="w-full mb-1"><tbody>${opExpenseRows.map((r,i)=>html`<tr key=${i}><td className="p-1 pl-4"><input type="text" className="w-full bg-transparent" placeholder="[Operating Expense Account]" value=${r.label} onChange=${(e)=>handleArrChange('opExpenses',i,'label',e.target.value)} disabled=${isReadOnly}/></td><td className="w-24"><input type="text" className="w-full text-right bg-transparent border-b" value=${r.amount} onChange=${(e)=>handleArrAmountChange('opExpenses',i,e.target.value)} disabled=${isReadOnly}/></td><td><button onClick=${()=>deleteRow('opExpenses',i)}><${Trash2} size=${12}/></button></td></tr>`)}</tbody></table><button onClick=${()=>addRow('opExpenses')} class=${btnStyle}><${Plus} size=${12}/> Add Expense Row</button>
                    ${renderRow('Total Operating Expenses', 'totalOpExpenses', expOpExp, false, 'pl-4 font-semibold')}
                    ${renderRow('Net Operating Income (Loss)', 'netOpInc', expOpIncome, false, 'pl-0 font-bold')}
                    
                    <div className="mt-4 font-bold text-gray-800">Non-Operating Income and Expenses</div>
                    <table className="w-full mb-1"><tbody>${nonOpRows.map((r,i)=>html`<tr key=${i}><td className="p-1 pl-4"><input type="text" className="w-full bg-transparent" placeholder="[Non-Operating Expense Account]" value=${r.label} onChange=${(e)=>handleArrChange('nonOpItems',i,'label',e.target.value)} disabled=${isReadOnly}/></td><td className="w-24"><input type="text" className="w-full text-right bg-transparent border-b" value=${r.amount} onChange=${(e)=>handleArrAmountChange('nonOpItems',i,e.target.value)} disabled=${isReadOnly}/></td><td><button onClick=${()=>deleteRow('nonOpItems',i)}><${Trash2} size=${12}/></button></td></tr>`)}</tbody></table><button onClick=${()=>addRow('nonOpItems')} class=${btnStyle}><${Plus} size=${12}/> Add Non-Operating Row</button>
                    ${renderRow('Net Non-Operating Income (Loss)', 'netNonOp', expNonOp, false, 'pl-4')}
                `}

                <div className="mt-6 border-t-2 border-black pt-2">
                     ${renderRow('Net Income (Loss) before taxes', 'niBefore', expNI, false, 'pl-0 font-bold')}
                     ${renderRow('Income Tax', 'tax', 0, true, 'pl-4')}
                     <div className="border-b-4 border-double border-black mb-1"></div>
                     ${renderRow('Net Income (Loss) after taxes', 'niAfter', expNI, false, 'pl-0 font-bold')}
                </div>
            </div>
        </div>
    `;
};

// --- MAIN EXPORT ---

export default function Step06FinancialStatements({ ledgerData, adjustments, activityData, data, onChange, showFeedback, isReadOnly }) {
    const { fsFormat, includeCashFlows, businessType, inventorySystem } = activityData.config;
    const isMerch = businessType === 'Merchandising' || businessType === 'Manufacturing';
    const isPerpetual = inventorySystem === 'Perpetual';

    // Calculated totals for validation logic (if needed in main)
    const calculatedTotals = { 
        ...useMemo(() => {
            const s = new Set(Object.keys(ledgerData)); 
            adjustments.forEach(adj => { s.add(adj.drAcc); s.add(adj.crAcc); }); 
            let isDr = 0; let isCr = 0;
            Array.from(s).forEach(acc => {
                const lBal = (ledgerData[acc]?.debit || 0) - (ledgerData[acc]?.credit || 0);
                let aDr = 0; let aCr = 0;
                adjustments.forEach(a => { if(a.drAcc === acc) aDr += a.amount; if(a.crAcc === acc) aCr += a.amount; });
                const atbNet = lBal + (aDr - aCr);
                const atbDr = atbNet > 0 ? atbNet : 0; const atbCr = atbNet < 0 ? Math.abs(atbNet) : 0;
                const type = getAccountType(acc);
                if (type === 'Revenue' || type === 'Expense') { isDr += atbDr; isCr += atbCr; }
            });
            return { isDr, isCr, ledger: ledgerData, adjustments };
        }, [ledgerData, adjustments])
    };

    const handleSCEChange = (newData) => onChange('sce', newData);
    const handleBSChange = (key, val) => onChange('bs', { ...data.bs, [key]: val });
    const handleSCFChange = (key, val) => onChange('scf', { ...data.scf, [key]: val });

    // Derive ending capital from SCE data to pass to Balance Sheet for validation
    const sceEndingCapital = parseUserValue(data.sce?.endCapital);

    // Calculate Banner Results and Get Expected Totals
    const validationResult = useMemo(() => {
        if (!showFeedback && !isReadOnly) return null;
        return validateStep06(ledgerData, adjustments, activityData, data);
    }, [ledgerData, adjustments, activityData, data, showFeedback, isReadOnly]);

    const expectedTotals = validationResult?.expected?.totals;
    // Pass detailed expected data for advanced validation in child components (e.g. Balance Sheet)
    const expectedData = validationResult?.expected; 

    const renderIncomeStatement = () => {
        const currentData = data.is || {};
        const props = {
            data: currentData,
            onChange: (d) => onChange('is', d),
            isReadOnly,
            showFeedback,
            calculatedTotals,
            expectedTotals // Pass expected totals for scoring IS
        };
        
        if (!isMerch) {
            return fsFormat === 'Single' 
                ? html`<${ServiceSingleStepIS} ...${props} />`
                : html`<${ServiceMultiStepIS} ...${props} />`;
        } else {
            return isPerpetual 
                ? html`<${MerchPerpetualIS} type=${fsFormat} ...${props} />`
                : html`<${MerchPeriodicIS} type=${fsFormat} ...${props} />`;
        }
    };

    return html`
        <div className="flex flex-col h-[calc(100vh-140px)]">
            ${(showFeedback || isReadOnly) && validationResult && html`
                <div className="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-2 mb-4 flex justify-between items-center shadow-sm w-full flex-shrink-0">
                    <span className="font-bold flex items-center gap-2"><${AlertCircle} size=${18}/> Validation Results:</span>
                    <span className="font-mono font-bold text-lg">Score: ${validationResult.score || 0} of ${validationResult.maxScore || 0} - (${validationResult.letterGrade || 'IR'})</span>
                </div>
            `}
            <div className="h-1/2 overflow-hidden border-b-4 border-gray-300 pb-2 bg-white relative">
                <${WorksheetSourceView} ledgerData=${ledgerData} adjustments=${adjustments} />
            </div>
            <div className="h-1/2 overflow-hidden bg-gray-100 p-2">
                <div className="h-full w-full overflow-y-auto">
                    ${includeCashFlows 
                        ? html`
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-full min-h-[500px]">
                                <div className="flex flex-col gap-4 h-full">
                                    <div className="flex-1 flex flex-col h-1/2">${renderIncomeStatement()}</div>
                                    <div className="flex-1 flex flex-col h-1/2">
                                        <${StatementOfChangesInEquity} data=${data.sce} onChange=${handleSCEChange} isReadOnly=${isReadOnly} showFeedback=${showFeedback} calculatedTotals=${calculatedTotals} activityData=${activityData} expectedTotals=${expectedTotals}/>
                                    </div>
                                </div>
                                <div className="h-full">
                                    <${BalanceSheet} data=${data.bs} onChange=${(d)=>onChange('bs', d)} isReadOnly=${isReadOnly} showFeedback=${showFeedback} sceEndingCapital=${sceEndingCapital} expectedTotals=${expectedTotals} expectedData=${expectedData}/>
                                </div>
                                <div className="h-full">
                                    <${FinancialStatementForm} title="Statement of Cash Flows" headerColor="bg-indigo-100" data=${data.scf} onChange=${(k, v) => handleSCFChange(k, v)} isReadOnly=${isReadOnly} />
                                </div>
                            </div>
                        ` 
                        : html`
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-full min-h-[400px]">
                                <div className="h-full">${renderIncomeStatement()}</div>
                                <div className="h-full">
                                    <${StatementOfChangesInEquity} data=${data.sce} onChange=${handleSCEChange} isReadOnly=${isReadOnly} showFeedback=${showFeedback} calculatedTotals=${calculatedTotals} activityData=${activityData} expectedTotals=${expectedTotals}/>
                                </div>
                                <div className="h-full">
                                    <${BalanceSheet} data=${data.bs} onChange=${(d)=>onChange('bs', d)} isReadOnly=${isReadOnly} showFeedback=${showFeedback} sceEndingCapital=${sceEndingCapital} expectedTotals=${expectedTotals} expectedData=${expectedData}/>
                                </div>
                            </div>
                        `
                    }
                </div>
            </div>
        </div>
    `;
}
