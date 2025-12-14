// --- Step06FinancialStatements.js ---
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

// Check if value matches expected (with rounding tolerance)
const checkVal = (userVal, expectedVal) => {
    if (userVal === undefined || userVal === null || userVal === '') return Math.abs(expectedVal) < 0.01;
    const u = parseUserValue(userVal);
    const e = Math.round(expectedVal);
    return Math.abs(u - e) <= 1;
};

const inputClass = (isError) => `w-full text-right p-1 pr-6 text-xs outline-none border-b border-gray-300 bg-transparent focus:border-blue-500 font-mono ${isError ? 'bg-red-50 text-red-600 font-bold' : ''}`;
const btnStyle = "mt-2 text-xs text-blue-900 font-medium hover:underline flex items-center gap-1 cursor-pointer";

// --- DRY VALIDATION LOGIC ---
export const validateStep06 = (ledgerData, adjustments, activityData, userAnswers) => {
    let score = 0;
    let maxScore = 0;
    
    // 1. Calculate Expected Data (The Truth)
    const s = new Set(Object.keys(ledgerData));
    adjustments.forEach(adj => { s.add(adj.drAcc); s.add(adj.crAcc); });
    
    const expected = {
        revenues: [], expenses: [], assets: [], liabilities: [],
        equity: { investments: 0, drawings: 0, begBal: 0 },
        totals: { ni: 0, assets: 0, liabs: 0, endCap: 0 }
    };

    // Calculate Adjusted Balances
    Array.from(s).forEach(acc => {
        const lBal = (ledgerData[acc]?.debit || 0) - (ledgerData[acc]?.credit || 0);
        let aDr = 0; let aCr = 0;
        adjustments.forEach(a => { if(a.drAcc === acc) aDr += a.amount; if(a.crAcc === acc) aCr += a.amount; });
        const atbNet = lBal + (aDr - aCr);
        
        if (Math.abs(atbNet) < 0.01) return; 

        const type = getAccountType(acc);
        const val = Math.abs(atbNet);

        if (type === 'Revenue') {
            expected.revenues.push({ name: acc, amount: val });
            expected.totals.ni += val; 
        } else if (type === 'Expense') {
            expected.expenses.push({ name: acc, amount: val });
            expected.totals.ni -= val; 
        } else if (type === 'Asset') {
            expected.assets.push({ name: acc, amount: val }); 
            expected.totals.assets += val;
        } else if (type === 'Liability') {
            expected.liabilities.push({ name: acc, amount: val });
            expected.totals.liabs += val;
        } else if (acc.includes('Drawings') || acc.includes('Dividends')) {
            expected.equity.drawings = (expected.equity.drawings || 0) + val;
        } else if (type === 'Equity' && !acc.includes('Income Summary')) {
            expected.equity.capitalAccount = acc;
            expected.equity.begBal = Math.abs(activityData.beginningBalances?.balances?.[acc]?.cr || 0); 
            if (!activityData.config.isSubsequentYear) expected.equity.begBal = 0;
        }
    });

    activityData.transactions.forEach(t => {
        t.credits.forEach(c => {
             if (getAccountType(c.account) === 'Equity' && !c.account.includes('Drawings') && !c.account.includes('Retained')) {
                 expected.equity.investments += c.amount;
             }
        });
    });

    expected.totals.endCap = expected.totals.assets - expected.totals.liabilities;

    // --- Validation Map ---
    const validationMap = { is: {}, bs: {}, sce: {} };

    // Helper to score a dynamic row against expected items
    const validateDynamicRows = (userRows, expectedItems, mapKey) => {
        const rowResults = [];
        userRows.forEach((row) => {
            const rowRes = { label: false, amount: false };
            maxScore += 2; // 1 for Label, 1 for Amount
            
            if (row.label) {
                // Find match in expected items
                const match = expectedItems.find(exp => exp.name.toLowerCase().trim() === row.label.toLowerCase().trim());
                if (match) {
                    score += 1; // Label Correct
                    rowRes.label = true;
                    if (checkVal(row.amount, match.amount)) {
                        score += 1; // Amount Correct
                        rowRes.amount = true;
                    }
                }
            }
            rowResults.push(rowRes);
        });
        return rowResults;
    };

    const validateSingleField = (val, expected) => {
        maxScore += 1;
        const pass = checkVal(val, expected);
        if (pass) score += 1;
        return pass;
    };

    // 2. Score Income Statement
    const isData = userAnswers.is || {};
    validationMap.is.revenues = validateDynamicRows(isData.revenues || [], expected.revenues);
    validationMap.is.opRevenues = validateDynamicRows(isData.opRevenues || [], expected.revenues);
    validationMap.is.otherIncome = validateDynamicRows(isData.otherIncome || [], []); // Usually empty for simple cases or specific matches
    
    // Combine expenses for validation if needed, or validate sections
    validationMap.is.expenses = validateDynamicRows(isData.expenses || [], expected.expenses);
    validationMap.is.opExpenses = validateDynamicRows(isData.opExpenses || [], expected.expenses);
    validationMap.is.nonOpItems = validateDynamicRows(isData.nonOpItems || [], []);

    // IS Totals
    validationMap.is.netIncome = validateSingleField(isData.netIncomeAfterTax || isData.netIncomeBeforeTax, expected.totals.ni);
    
    // 3. Score SCE
    const sceData = userAnswers.sce || {};
    validationMap.sce.begCapital = validateSingleField(sceData.begCapital, expected.equity.begBal);
    
    // SCE Additions
    const sceAddRows = sceData.additions || [];
    validationMap.sce.additions = sceAddRows.map(r => {
        maxScore += 2;
        let pLabel = false, pAmt = false;
        const l = r.label?.toLowerCase() || '';
        // Check Investment
        if (expected.equity.investments > 0 && (l.includes('invest') || l.includes('capital'))) {
            pLabel = true; if(checkVal(r.amount, expected.equity.investments)) pAmt = true;
        }
        // Check Net Income
        else if (expected.totals.ni > 0 && (l.includes('income') || l.includes('profit'))) {
            pLabel = true; if(checkVal(r.amount, expected.totals.ni)) pAmt = true;
        }
        if(pLabel) score++; if(pAmt) score++;
        return { label: pLabel, amount: pAmt };
    });

    // SCE Deductions
    const sceDedRows = sceData.deductions || [];
    validationMap.sce.deductions = sceDedRows.map(r => {
        maxScore += 2;
        let pLabel = false, pAmt = false;
        const l = r.label?.toLowerCase() || '';
        // Check Drawings
        if (expected.equity.drawings > 0 && (l.includes('drawing') || l.includes('withdrawal'))) {
            pLabel = true; if(checkVal(r.amount, expected.equity.drawings)) pAmt = true;
        }
        // Check Net Loss
        else if (expected.totals.ni < 0 && (l.includes('loss'))) {
            pLabel = true; if(checkVal(r.amount, Math.abs(expected.totals.ni))) pAmt = true;
        }
        if(pLabel) score++; if(pAmt) score++;
        return { label: pLabel, amount: pAmt };
    });

    validationMap.sce.endCapital = validateSingleField(sceData.endCapital, expected.totals.endCap);

    // 4. Score Balance Sheet
    const bsData = userAnswers.bs || {};
    validationMap.bs.curAssets = validateDynamicRows(bsData.curAssets || [], expected.assets);
    validationMap.bs.otherAssets = validateDynamicRows(bsData.otherAssets || [], expected.assets);
    // Depreciable Assets Special Handling (Simplified: Check Net against Asset List)
    validationMap.bs.depAssets = (bsData.depAssets || []).map(r => {
        // We score based on Net Book Value matching an Asset amount in expected list
        maxScore += 2; 
        const match = expected.assets.find(a => a.name.toLowerCase() === r.asset?.toLowerCase());
        let l=false, a=false;
        if(match) {
            l = true; score++;
            if(checkVal(r.net, match.amount)) { a = true; score++; }
        }
        return { label: l, amount: a }; // abusing keys for consistent mapping
    });

    validationMap.bs.curLiabs = validateDynamicRows(bsData.curLiabs || [], expected.liabilities);
    validationMap.bs.nonCurLiabs = validateDynamicRows(bsData.nonCurLiabs || [], expected.liabilities);

    validationMap.bs.totalAssets = validateSingleField(bsData.totalAssets, expected.totals.assets);
    validationMap.bs.totalLiabs = validateSingleField(bsData.totalLiabs, expected.totals.liabs);
    validationMap.bs.totalLiabEquity = validateSingleField(bsData.totalLiabEquity, expected.totals.assets);

    const isCorrect = score === maxScore && maxScore > 0;
    const letterGrade = getLetterGrade(score, maxScore);
    
    return { score, maxScore, letterGrade, isCorrect, validationMap };
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

// Generic Input with Feedback Icon
const renderInput = (val, onChange, isCorrect, showFeedback, isReadOnly, placeholder="0") => {
    let icon = null;
    let bgClass = "bg-transparent";
    
    // Determine status
    if (showFeedback || isReadOnly) {
        if (isCorrect === true) {
            icon = html`<${Check} size=${14} className="text-green-600 absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none"/>`;
            bgClass = "bg-green-50 text-green-900 font-medium";
        } else if (isCorrect === false) {
            icon = html`<${X} size=${14} className="text-red-500 absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none"/>`;
            bgClass = "bg-red-50 text-red-900 font-medium";
        }
    }

    return html`
        <div className="relative w-full">
            <input type="text"
                className=${`w-full text-right p-1 ${icon ? 'pr-6' : ''} text-xs outline-none border-b border-gray-300 focus:border-blue-500 font-mono ${bgClass}`}
                value=${val || ''}
                onChange=${onChange}
                disabled=${isReadOnly}
                placeholder=${placeholder}
            />
            ${icon}
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

const BalanceSheet = ({ data, onChange, isReadOnly, showFeedback, validationMap }) => {
    const [showNonCurrentAssets, setShowNonCurrentAssets] = useState(false);
    const [showNonCurrentLiabs, setShowNonCurrentLiabs] = useState(false);

    const updateData = (updates) => onChange({ ...data, ...updates });

    // --- Asset Lists ---
    const curAssets = data?.curAssets || [{ label: '', amount: '' }];
    const otherAssets = data?.otherAssets || [{ label: '', amount: '' }];
    const depAssets = data?.depAssets || []; 

    // --- Liability Lists ---
    const curLiabs = data?.curLiabs || [{ label: '', amount: '' }];
    const nonCurLiabs = data?.nonCurLiabs || [{ label: '', amount: '' }];

    const handleArrChange = (arrKey, idx, field, val) => {
        const arr = [...(data?.[arrKey] || [])];
        arr[idx] = { ...arr[idx], [field]: val };
        updateData({ [arrKey]: arr });
    };
    const addRow = (arrKey, defaultObj) => updateData({ [arrKey]: [...(data?.[arrKey]||[]), defaultObj] });
    const deleteRow = (arrKey, idx) => updateData({ [arrKey]: (data?.[arrKey]||[]).filter((_, i) => i !== idx) });

    const valMap = validationMap?.bs || {};

    return html`
        <div className="border rounded bg-white flex flex-col h-full shadow-sm">
            <div className="bg-blue-100 p-2 font-bold text-gray-800 border-b text-center text-sm">Balance Sheet (Sole Proprietorship)</div>
            <div className="p-4 overflow-y-auto flex-1 text-xs">
                
                <div className="text-center font-bold text-sm mb-2">Assets</div>
                
                <div className="font-bold text-gray-700 mb-1">Current Assets</div>
                ${curAssets.map((r, i) => html`
                    <div key=${i} className="flex justify-between items-center border-b border-gray-100 py-1">
                        <div className="flex-1 pl-4 relative">
                            <input type="text" className="w-full bg-transparent outline-none" placeholder="[Current asset account]" value=${r.label} onChange=${(e)=>handleArrChange('curAssets', i, 'label', e.target.value)} disabled=${isReadOnly}/>
                            ${(showFeedback || isReadOnly) && (valMap.curAssets?.[i]?.label ? html`<${Check} size=${12} class="text-green-600 absolute right-0 top-1"/>` : html`<${X} size=${12} class="text-red-500 absolute right-0 top-1"/>`)}
                        </div>
                        <div className="w-24">
                            ${renderInput(r.amount, (e)=>handleArrChange('curAssets', i, 'amount', e.target.value), valMap.curAssets?.[i]?.amount, showFeedback, isReadOnly)}
                        </div>
                        <div className="w-6 text-center">${!isReadOnly && html`<button onClick=${()=>deleteRow('curAssets', i)}><${Trash2} size=${12} class="text-gray-400 hover:text-red-500"/></button>`}</div>
                    </div>
                `)}
                ${!isReadOnly && html`<button onClick=${()=>addRow('curAssets', {label:'', amount:''})} className=${btnStyle}><${Plus} size=${12}/> Add Current Asset Row</button>`}
                
                <div className="flex justify-between items-center py-1 font-semibold border-t border-black mt-1">
                    <span className="pl-8">Total Current Assets</span>
                    <div className="w-24">${renderInput(data?.totalCurAssets, (e)=>updateData({ totalCurAssets: e.target.value }), null, false, isReadOnly)}</div>
                </div>

                <div className="mt-4 mb-2 flex items-center gap-2 cursor-pointer text-blue-800 font-bold text-xs" onClick=${()=>setShowNonCurrentAssets(!showNonCurrentAssets)}>
                    ${showNonCurrentAssets ? html`<${ChevronDown} size=${14}/>` : html`<${ChevronRight} size=${14}/>`} Non-current Assets Section
                </div>
                
                ${showNonCurrentAssets && html`
                    <div className="pl-2 border-l-2 border-blue-100 mb-4">
                        ${depAssets.map((block, i) => html`
                            <div key=${i} className="mb-2 bg-gray-50 p-2 rounded relative group">
                                <div className="flex justify-between mb-1">
                                    <div class="relative w-full mr-2"><input type="text" className="bg-transparent w-full outline-none" placeholder="[Property/Equipment Account]" value=${block.asset} onChange=${(e)=>handleArrChange('depAssets', i, 'asset', e.target.value)} disabled=${isReadOnly}/></div>
                                    <div class="w-20"><input type="text" className="w-full text-right bg-transparent outline-none" placeholder="0" value=${block.cost} onChange=${(e)=>handleArrChange('depAssets', i, 'cost', e.target.value)} disabled=${isReadOnly}/></div>
                                </div>
                                <div className="flex justify-between mb-1 text-gray-600">
                                    <span className="pl-4">Less: <input type="text" className="inline-block bg-transparent outline-none w-32" placeholder="[Accum. Depr.]" value=${block.contra} onChange=${(e)=>handleArrChange('depAssets', i, 'contra', e.target.value)} disabled=${isReadOnly}/></span>
                                    <input type="text" className="w-20 text-right bg-transparent outline-none border-b border-gray-300" placeholder="(0)" value=${block.accum} onChange=${(e)=>handleArrChange('depAssets', i, 'accum', e.target.value)} disabled=${isReadOnly}/>
                                </div>
                                <div className="flex justify-between font-bold">
                                    <span className="pl-8">Net Book Value</span>
                                    <div class="w-24">${renderInput(block.net, (e)=>handleArrChange('depAssets', i, 'net', e.target.value), valMap.depAssets?.[i]?.amount, showFeedback, isReadOnly)}</div>
                                </div>
                                ${!isReadOnly && html`<button onClick=${()=>deleteRow('depAssets', i)} className="absolute top-1 right-[-20px] text-red-400 opacity-0 group-hover:opacity-100"><${Trash2} size=${12}/></button>`}
                            </div>
                        `)}
                        ${!isReadOnly && html`<button onClick=${()=>addRow('depAssets', {asset:'', cost:'', contra:'', accum:'', net:''})} className=${btnStyle}><${Plus} size=${12}/> Add Depreciable Asset Row</button>`}
                        
                        ${otherAssets.map((r, i) => html`
                            <div key=${i} className="flex justify-between items-center border-b border-gray-100 py-1 mt-2">
                                <div className="flex-1 pl-4 relative">
                                    <input type="text" className="w-full bg-transparent outline-none" placeholder="[Land / Other asset account]" value=${r.label} onChange=${(e)=>handleArrChange('otherAssets', i, 'label', e.target.value)} disabled=${isReadOnly}/>
                                    ${(showFeedback || isReadOnly) && (valMap.otherAssets?.[i]?.label ? html`<${Check} size=${12} class="text-green-600 absolute right-0 top-1"/>` : html`<${X} size=${12} class="text-red-500 absolute right-0 top-1"/>`)}
                                </div>
                                <div className="w-24">
                                    ${renderInput(r.amount, (e)=>handleArrChange('otherAssets', i, 'amount', e.target.value), valMap.otherAssets?.[i]?.amount, showFeedback, isReadOnly)}
                                </div>
                                <div className="w-6 text-center">${!isReadOnly && html`<button onClick=${()=>deleteRow('otherAssets', i)}><${Trash2} size=${12} class="text-gray-400 hover:text-red-500"/></button>`}</div>
                            </div>
                        `)}
                        ${!isReadOnly && html`<button onClick=${()=>addRow('otherAssets', {label:'', amount:''})} className=${btnStyle}><${Plus} size=${12}/> Add Other Asset Row</button>`}
                        
                        <div className="flex justify-between items-center py-1 font-semibold border-t border-black mt-2">
                            <span className="pl-8">Total Non-current Assets</span>
                            <div class="w-24">${renderInput(data?.totalNonCurAssets, (e)=>updateData({ totalNonCurAssets: e.target.value }), null, false, isReadOnly)}</div>
                        </div>
                    </div>
                `}

                <div className="flex justify-between items-center py-2 font-bold border-t-2 border-black border-double border-b-4 mt-2 mb-6">
                    <span className="">Total Assets</span>
                    <div class="w-24">${renderInput(data?.totalAssets, (e)=>updateData({ totalAssets: e.target.value }), valMap.totalAssets, showFeedback, isReadOnly)}</div>
                </div>

                <div className="text-center font-bold text-sm mb-2">Liabilities and Owner's Equity</div>

                <div className="font-bold text-gray-700 mb-1">Liabilities</div>
                <div className="pl-2 mb-2 font-medium text-gray-600">Current Liabilities</div>
                ${curLiabs.map((r, i) => html`
                    <div key=${i} className="flex justify-between items-center border-b border-gray-100 py-1">
                        <div className="flex-1 pl-4 relative">
                            <input type="text" className="w-full bg-transparent outline-none" placeholder="[Current liability account]" value=${r.label} onChange=${(e)=>handleArrChange('curLiabs', i, 'label', e.target.value)} disabled=${isReadOnly}/>
                            ${(showFeedback || isReadOnly) && (valMap.curLiabs?.[i]?.label ? html`<${Check} size=${12} class="text-green-600 absolute right-0 top-1"/>` : html`<${X} size=${12} class="text-red-500 absolute right-0 top-1"/>`)}
                        </div>
                        <div className="w-24">${renderInput(r.amount, (e)=>handleArrChange('curLiabs', i, 'amount', e.target.value), valMap.curLiabs?.[i]?.amount, showFeedback, isReadOnly)}</div>
                        <div className="w-6 text-center">${!isReadOnly && html`<button onClick=${()=>deleteRow('curLiabs', i)}><${Trash2} size=${12} class="text-gray-400 hover:text-red-500"/></button>`}</div>
                    </div>
                `)}
                ${!isReadOnly && html`<button onClick=${()=>addRow('curLiabs', {label:'', amount:''})} className=${btnStyle}><${Plus} size=${12}/> Add Current Liability Row</button>`}
                
                <div className="flex justify-between items-center py-1 font-semibold border-t border-black mt-1">
                    <span className="pl-8">Total Current Liabilities</span>
                    <div class="w-24">${renderInput(data?.totalCurLiabs, (e)=>updateData({ totalCurLiabs: e.target.value }), null, false, isReadOnly)}</div>
                </div>

                 <div className="mt-4 mb-2 flex items-center gap-2 cursor-pointer text-blue-800 font-bold text-xs" onClick=${()=>setShowNonCurrentLiabs(!showNonCurrentLiabs)}>
                    ${showNonCurrentLiabs ? html`<${ChevronDown} size=${14}/>` : html`<${ChevronRight} size=${14}/>`} Non-current Liabilities Section
                </div>
                ${showNonCurrentLiabs && html`
                    <div className="pl-2 border-l-2 border-blue-100 mb-4">
                         ${nonCurLiabs.map((r, i) => html`
                            <div key=${i} className="flex justify-between items-center border-b border-gray-100 py-1">
                                <div className="flex-1 pl-4 relative">
                                    <input type="text" className="w-full bg-transparent outline-none" placeholder="[Non-current liability account]" value=${r.label} onChange=${(e)=>handleArrChange('nonCurLiabs', i, 'label', e.target.value)} disabled=${isReadOnly}/>
                                    ${(showFeedback || isReadOnly) && (valMap.nonCurLiabs?.[i]?.label ? html`<${Check} size=${12} class="text-green-600 absolute right-0 top-1"/>` : html`<${X} size=${12} class="text-red-500 absolute right-0 top-1"/>`)}
                                </div>
                                <div className="w-24">${renderInput(r.amount, (e)=>handleArrChange('nonCurLiabs', i, 'amount', e.target.value), valMap.nonCurLiabs?.[i]?.amount, showFeedback, isReadOnly)}</div>
                                <div className="w-6 text-center">${!isReadOnly && html`<button onClick=${()=>deleteRow('nonCurLiabs', i)}><${Trash2} size=${12} class="text-gray-400 hover:text-red-500"/></button>`}</div>
                            </div>
                        `)}
                        ${!isReadOnly && html`<button onClick=${()=>addRow('nonCurLiabs', {label:'', amount:''})} className=${btnStyle}><${Plus} size=${12}/> Add Non-current Liability Row</button>`}
                         <div className="flex justify-between items-center py-1 font-semibold border-t border-black mt-1">
                            <span className="pl-8">Total Non-current Liabilities</span>
                            <div class="w-24">${renderInput(data?.totalNonCurLiabs, (e)=>updateData({ totalNonCurLiabs: e.target.value }), null, false, isReadOnly)}</div>
                        </div>
                    </div>
                `}

                <div className="flex justify-between items-center py-1 font-bold mt-2">
                    <span className="pl-0">Total Liabilities</span>
                    <div class="w-24">${renderInput(data?.totalLiabs, (e)=>updateData({ totalLiabs: e.target.value }), valMap.totalLiabs, showFeedback, isReadOnly)}</div>
                </div>

                <div className="font-bold text-gray-700 mt-4 mb-1">Owner's Equity</div>
                <div className="flex justify-between items-center py-1">
                    <span className="pl-4 text-gray-500 italic">[Owner, Capital Ending]</span>
                    <div class="w-24">${renderInput(data?.endCapital, (e)=>updateData({ endCapital: e.target.value }), null, false, isReadOnly)}</div>
                </div>

                <div className="flex justify-between items-center py-2 font-bold mt-4 border-t-2 border-black border-double border-b-4">
                    <span className="">Total Liabilities and Owner's Equity</span>
                    <div class="w-24">${renderInput(data?.totalLiabEquity, (e)=>updateData({ totalLiabEquity: e.target.value }), valMap.totalLiabEquity, showFeedback, isReadOnly)}</div>
                </div>

            </div>
        </div>
    `;
};


// --------------------------------------------------------
// SCE
// --------------------------------------------------------
const StatementOfChangesInEquity = ({ data, onChange, isReadOnly, showFeedback, validationMap }) => {
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

    const valMap = validationMap?.sce || {};

    return html`
        <div className="border rounded bg-white flex flex-col h-full shadow-sm">
            <div className="bg-yellow-100 p-2 font-bold text-gray-800 border-b text-center text-sm">Statement of Changes in Equity (Sole Proprietorship)</div>
            <div className="p-4 overflow-y-auto flex-1 text-xs">
                
                <div className="flex justify-between items-center py-1">
                    <span className="text-gray-500 italic pl-0">[Owner, Capital - beginning]</span>
                    <div class="w-24">${renderInput(data?.begCapital, (e)=>updateData({ begCapital: e.target.value }), valMap.begCapital, showFeedback, isReadOnly)}</div>
                </div>

                <div className="mt-2 font-bold text-gray-800">Add: <span className="text-gray-400 font-normal italic">[Additions to Capital]</span></div>
                <table className="w-full mb-1"><tbody>${additions.map((r,i)=>html`
                    <tr key=${i}>
                        <td className="p-1 pl-4 relative">
                            <input type="text" className="w-full bg-transparent" placeholder="Investment / Net Income..." value=${r.label} onChange=${(e)=>handleArrChange('additions',i,'label',e.target.value)} disabled=${isReadOnly}/>
                            ${(showFeedback || isReadOnly) && (valMap.additions?.[i]?.label ? html`<${Check} size=${12} class="text-green-600 absolute right-0 top-1"/>` : html`<${X} size=${12} class="text-red-500 absolute right-0 top-1"/>`)}
                        </td>
                        <td className="w-24">${renderInput(r.amount, (e)=>handleArrChange('additions',i,'amount',e.target.value), valMap.additions?.[i]?.amount, showFeedback, isReadOnly)}</td>
                        <td><button onClick=${()=>deleteRow('additions',i)}><${Trash2} size=${12}/></button></td>
                    </tr>
                `)}</tbody></table>
                ${!isReadOnly && html`<button onClick=${()=>addRow('additions')} className=${btnStyle}><${Plus} size=${12}/> Add Addition Row</button>`}
                
                <div className="flex justify-between items-center py-1 font-semibold border-t border-black">
                    <span className="pl-8">Total Additions to Capital</span>
                    <div class="w-24">${renderInput(data?.totalAdditions, (e)=>updateData({ totalAdditions: e.target.value }), null, false, isReadOnly)}</div>
                </div>

                <div className="flex justify-between items-center py-2 font-semibold">
                    <span className="">Total Owner, Capital during the period</span>
                    <div class="w-24">${renderInput(data?.totalCapDuring, (e)=>updateData({ totalCapDuring: e.target.value }), null, false, isReadOnly)}</div>
                </div>

                <div className="mt-2 font-bold text-gray-800">Less: <span className="text-gray-400 font-normal italic">[Deductions from Capital]</span></div>
                <table className="w-full mb-1"><tbody>${deductions.map((r,i)=>html`
                    <tr key=${i}>
                        <td className="p-1 pl-4 relative">
                            <input type="text" className="w-full bg-transparent" placeholder="Drawings / Net Loss..." value=${r.label} onChange=${(e)=>handleArrChange('deductions',i,'label',e.target.value)} disabled=${isReadOnly}/>
                            ${(showFeedback || isReadOnly) && (valMap.deductions?.[i]?.label ? html`<${Check} size=${12} class="text-green-600 absolute right-0 top-1"/>` : html`<${X} size=${12} class="text-red-500 absolute right-0 top-1"/>`)}
                        </td>
                        <td className="w-24">${renderInput(r.amount, (e)=>handleArrChange('deductions',i,'amount',e.target.value), valMap.deductions?.[i]?.amount, showFeedback, isReadOnly)}</td>
                        <td><button onClick=${()=>deleteRow('deductions',i)}><${Trash2} size=${12}/></button></td>
                    </tr>
                `)}</tbody></table>
                ${!isReadOnly && html`<button onClick=${()=>addRow('deductions')} className=${btnStyle}><${Plus} size=${12}/> Add Deduction Row</button>`}

                <div className="flex justify-between items-center py-1 font-semibold border-t border-black">
                    <span className="pl-8">Total Deductions from Capital</span>
                    <div class="w-24">${renderInput(data?.totalDeductions, (e)=>updateData({ totalDeductions: e.target.value }), null, false, isReadOnly)}</div>
                </div>

                <div className="flex justify-between items-center py-2 font-bold mt-2 border-t border-black border-b-4 border-double">
                    <span className="text-gray-500 italic">[Owner, Capital - ending]</span>
                    <div class="w-24">${renderInput(data?.endCapital, (e)=>updateData({ endCapital: e.target.value }), valMap.endCapital, showFeedback, isReadOnly)}</div>
                </div>
            </div>
        </div>
    `;
};


// --- INCOME STATEMENT COMPONENTS ---

const ServiceSingleStepIS = ({ data, onChange, isReadOnly, showFeedback, validationMap }) => {
    const revenues = data?.revenues || [{ label: '', amount: '' }];
    const expenses = data?.expenses || [{ label: '', amount: '' }];
    const updateData = (updates) => onChange({ ...data, ...updates });
    const handleArrChange = (key, idx, field, val) => { const arr = [...(key==='revenues'?revenues:expenses)]; arr[idx] = {...arr[idx], [field]:val}; updateData({[key]: arr}); };
    const addRow = (key) => updateData({ [key]: [...(key==='revenues'?revenues:expenses), { label: '', amount: '' }] });
    const deleteRow = (key, idx) => { const arr = [...(key==='revenues'?revenues:expenses)]; if(arr.length<=1)return; updateData({[key]: arr.filter((_, i)=>i!==idx)}); };
    
    const valMap = validationMap?.is || {};

    return html`
        <div className="border rounded bg-white flex flex-col h-full shadow-sm">
            <div className="bg-green-100 p-2 font-bold text-gray-800 border-b text-center text-sm">Income Statement (Single-Step Service)</div>
            <div className="p-4 overflow-y-auto flex-1 text-xs">
                <div className="mb-4"><div className="font-bold mb-1 text-gray-800">Revenues</div><table className="w-full mb-1"><tbody>${revenues.map((r,i)=>html`<tr key=${i}><td className="p-1 pl-4 relative"><input type="text" className="w-full outline-none bg-transparent" placeholder="[Revenue Account]" value=${r.label} onChange=${(e)=>handleArrChange('revenues',i,'label',e.target.value)} disabled=${isReadOnly}/>${(showFeedback || isReadOnly) && (valMap.revenues?.[i]?.label ? html`<${Check} size=${12} class="text-green-600 absolute right-0 top-1"/>` : html`<${X} size=${12} class="text-red-500 absolute right-0 top-1"/>`)}</td><td className="p-1 w-24">${renderInput(r.amount, (e)=>handleArrChange('revenues',i,'amount',e.target.value), valMap.revenues?.[i]?.amount, showFeedback, isReadOnly)}</td><td className="p-1 w-6 text-center">${!isReadOnly && html`<button onClick=${()=>deleteRow('revenues',i)}><${Trash2} size=${12}/></button>`}</td></tr>`)}</tbody></table>${!isReadOnly && html`<button onClick=${()=>addRow('revenues')} className=${btnStyle}><${Plus} size=${12}/> Add Revenue Row</button>`}<div className="flex justify-between items-center py-1 font-bold mt-1"><span className="pl-0">Total Revenues</span><div class="w-24">${renderInput(data?.totalRevenues, (e)=>updateData({ totalRevenues: e.target.value }), null, false, isReadOnly)}</div></div></div>
                <div className="mb-4"><div className="font-bold mb-1 text-gray-800">Less: Expenses</div><table className="w-full mb-1"><tbody>${expenses.map((r,i)=>html`<tr key=${i}><td className="p-1 pl-4 relative"><input type="text" className="w-full outline-none bg-transparent" placeholder="[Expense Account]" value=${r.label} onChange=${(e)=>handleArrChange('expenses',i,'label',e.target.value)} disabled=${isReadOnly}/>${(showFeedback || isReadOnly) && (valMap.expenses?.[i]?.label ? html`<${Check} size=${12} class="text-green-600 absolute right-0 top-1"/>` : html`<${X} size=${12} class="text-red-500 absolute right-0 top-1"/>`)}</td><td className="p-1 w-24">${renderInput(r.amount, (e)=>handleArrChange('expenses',i,'amount',e.target.value), valMap.expenses?.[i]?.amount, showFeedback, isReadOnly)}</td><td className="p-1 w-6 text-center">${!isReadOnly && html`<button onClick=${()=>deleteRow('expenses',i)}><${Trash2} size=${12}/></button>`}</td></tr>`)}</tbody></table>${!isReadOnly && html`<button onClick=${()=>addRow('expenses')} className=${btnStyle}><${Plus} size=${12}/> Add Expense Row</button>`}<div className="flex justify-between items-center py-1 font-bold mt-1"><span className="pl-0">Total Expenses</span><div class="w-24">${renderInput(data?.totalExpenses, (e)=>updateData({ totalExpenses: e.target.value }), null, false, isReadOnly)}</div></div></div>
                <div className="space-y-1 mt-4 border-t-2 border-gray-400 pt-2"><div className="flex justify-between items-center py-1 font-semibold"><span className="">Net Income (Loss) before taxes</span><div class="w-24">${renderInput(data?.netIncomeBeforeTax, (e)=>updateData({ netIncomeBeforeTax: e.target.value }), null, false, isReadOnly)}</div></div><div className="flex justify-between items-center py-1"><span className="pl-4">Less: Income Tax</span><div class="w-24">${renderInput(data?.incomeTax, (e)=>updateData({ incomeTax: e.target.value }), null, false, isReadOnly)}</div></div><div className="flex justify-between items-center py-2 font-bold text-blue-900 bg-gray-50 border-t-2 border-black border-double border-b-4"><span className="">Net Income (Loss) after taxes</span><div class="w-24">${renderInput(data?.netIncomeAfterTax, (e)=>updateData({ netIncomeAfterTax: e.target.value }), valMap.netIncome, showFeedback, isReadOnly)}</div></div></div>
            </div>
        </div>
    `;
};

const ServiceMultiStepIS = ({ data, onChange, isReadOnly, showFeedback, validationMap }) => {
    const opRevenues = data?.opRevenues || [{ label: '', amount: '' }];
    const opExpenses = data?.opExpenses || [{ label: '', amount: '' }];
    const nonOpItems = data?.nonOpItems || [{ label: '', amount: '' }];
    const updateData = (updates) => onChange({ ...data, ...updates });
    const handleArrChange = (key, idx, field, val) => { const arr = [...(key==='opRevenues'?opRevenues:key==='opExpenses'?opExpenses:nonOpItems)]; arr[idx] = {...arr[idx], [field]:val}; updateData({[key]: arr}); };
    const addRow = (key) => updateData({ [key]: [...(key==='opRevenues'?opRevenues:key==='opExpenses'?opExpenses:nonOpItems), { label: '', amount: '' }] });
    const deleteRow = (key, idx) => { const arr = [...(key==='opRevenues'?opRevenues:key==='opExpenses'?opExpenses:nonOpItems)]; if(arr.length<=1)return; updateData({[key]: arr.filter((_, i)=>i!==idx)}); };
    
    const valMap = validationMap?.is || {};

    return html`
        <div className="border rounded bg-white flex flex-col h-full shadow-sm">
            <div className="bg-green-100 p-2 font-bold text-gray-800 border-b text-center text-sm">Income Statement (Multi-Step Service)</div>
            <div className="p-4 overflow-y-auto flex-1 text-xs">
                <div className="mb-4"><div className="font-bold mb-1">Operating Revenues</div><table className="w-full"><tbody>${opRevenues.map((r,i)=>html`<tr key=${i}><td className="pl-4 relative"><input type="text" className="w-full bg-transparent" value=${r.label} onChange=${(e)=>handleArrChange('opRevenues',i,'label',e.target.value)} disabled=${isReadOnly} placeholder="[Revenue Account]"/>${(showFeedback || isReadOnly) && (valMap.opRevenues?.[i]?.label ? html`<${Check} size=${12} class="text-green-600 absolute right-0 top-1"/>` : html`<${X} size=${12} class="text-red-500 absolute right-0 top-1"/>`)}</td><td className="w-24">${renderInput(r.amount, (e)=>handleArrChange('opRevenues',i,'amount',e.target.value), valMap.opRevenues?.[i]?.amount, showFeedback, isReadOnly)}</td><td><button onClick=${()=>deleteRow('opRevenues',i)}><${Trash2} size=${12}/></button></td></tr>`)}</tbody></table><button onClick=${()=>addRow('opRevenues')} class=${btnStyle}><${Plus} size=${12}/> Add Revenue Row</button><div class="flex justify-between font-bold"><span>Total Operating Revenues</span><div class="w-24">${renderInput(data?.totalOpRevenues, (e)=>updateData({totalOpRevenues:e.target.value}), null, false, isReadOnly)}</div></div></div>
                <div className="mb-4"><div className="font-bold mb-1">Operating Expenses</div><table className="w-full"><tbody>${opExpenses.map((r,i)=>html`<tr key=${i}><td className="pl-4 relative"><input type="text" className="w-full bg-transparent" value=${r.label} onChange=${(e)=>handleArrChange('opExpenses',i,'label',e.target.value)} disabled=${isReadOnly} placeholder="[Operating Expense Account]"/>${(showFeedback || isReadOnly) && (valMap.opExpenses?.[i]?.label ? html`<${Check} size=${12} class="text-green-600 absolute right-0 top-1"/>` : html`<${X} size=${12} class="text-red-500 absolute right-0 top-1"/>`)}</td><td className="w-24">${renderInput(r.amount, (e)=>handleArrChange('opExpenses',i,'amount',e.target.value), valMap.opExpenses?.[i]?.amount, showFeedback, isReadOnly)}</td><td><button onClick=${()=>deleteRow('opExpenses',i)}><${Trash2} size=${12}/></button></td></tr>`)}</tbody></table><button onClick=${()=>addRow('opExpenses')} class=${btnStyle}><${Plus} size=${12}/> Add Expense Row</button><div class="flex justify-between font-bold"><span>Total Operating Expenses</span><div class="w-24">${renderInput(data?.totalOpExpenses, (e)=>updateData({totalOpExpenses:e.target.value}), null, false, isReadOnly)}</div></div></div>
                <div className="flex justify-between items-center border-t border-b border-gray-300 py-1 font-bold bg-gray-50 mb-4"><span className="">Net Operating Income (Loss)</span><div class="w-24">${renderInput(data?.netOpIncome, (e)=>updateData({ netOpIncome: e.target.value }), null, false, isReadOnly)}</div></div>
                <div className="mb-4"><div className="font-bold mb-1">Non-Operating Income and Expenses</div><table className="w-full"><tbody>${nonOpItems.map((r,i)=>html`<tr key=${i}><td className="pl-4 relative"><input type="text" className="w-full bg-transparent" value=${r.label} onChange=${(e)=>handleArrChange('nonOpItems',i,'label',e.target.value)} disabled=${isReadOnly} placeholder="[Non-Operating Account]"/>${(showFeedback || isReadOnly) && (valMap.nonOpItems?.[i]?.label ? html`<${Check} size=${12} class="text-green-600 absolute right-0 top-1"/>` : html`<${X} size=${12} class="text-red-500 absolute right-0 top-1"/>`)}</td><td className="w-24">${renderInput(r.amount, (e)=>handleArrChange('nonOpItems',i,'amount',e.target.value), valMap.nonOpItems?.[i]?.amount, showFeedback, isReadOnly)}</td><td><button onClick=${()=>deleteRow('nonOpItems',i)}><${Trash2} size=${12}/></button></td></tr>`)}</tbody></table><button onClick=${()=>addRow('nonOpItems')} class=${btnStyle}><${Plus} size=${12}/> Add Non-Operating Row</button><div class="flex justify-between font-bold"><span>Net Non-operating Income (Loss)</span><div class="w-24">${renderInput(data?.netNonOpIncome, (e)=>updateData({netNonOpIncome:e.target.value}), null, false, isReadOnly)}</div></div></div>
                <div className="space-y-1 mt-4 border-t-2 border-gray-400 pt-2"><div className="flex justify-between items-center py-1 font-semibold"><span className="">Net Income (Loss) before taxes</span><div class="w-24">${renderInput(data?.netIncomeBeforeTax, (e)=>updateData({ netIncomeBeforeTax: e.target.value }), null, false, isReadOnly)}</div></div><div className="flex justify-between items-center py-2 font-bold text-blue-900 bg-gray-50 border-t-2 border-black border-double border-b-4"><span className="">Net Income (Loss) after taxes</span><div class="w-24">${renderInput(data?.netIncomeAfterTax, (e)=>updateData({ netIncomeAfterTax: e.target.value }), valMap.netIncome, showFeedback, isReadOnly)}</div></div></div>
            </div>
        </div>
    `;
};

// --- RESTORED MERCH COMPONENTS ---

const MerchPeriodicIS = ({ data, onChange, isReadOnly, showFeedback, validationMap, type = "Single" }) => {
    const updateData = (updates) => onChange({ ...data, ...updates });
    const handleAmountChange = (key, val) => {
        if (/^[0-9.,\-() ]*$/.test(val)) updateData({ [key]: val });
    };

    const renderRow = (label, valueKey, indent='pl-4', placeholder='0.00', showInput=true, labelKey=null) => html`<div className="flex justify-between items-center py-1">
        ${labelKey 
            ? html`<span className=${indent}><input type="text" className="w-64 outline-none bg-transparent border-b border-gray-300 focus:border-blue-500 placeholder-gray-400 italic" placeholder=${label} value=${data?.[labelKey] || ''} onChange=${(e)=>updateData({ [labelKey]: e.target.value })} disabled=${isReadOnly}/></span>`
            : html`<span className=${indent}>${label}</span>`
        }
        ${showInput ? html`<div class="w-24">${renderInput(data?.[valueKey], (e)=>handleAmountChange(valueKey, e.target.value), null, false, isReadOnly, placeholder)}</div>` : ''}
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
    
    const valMap = validationMap?.is || {};

    return html`
        <div className="border rounded bg-white flex flex-col h-full shadow-sm">
            <div className="bg-blue-100 p-2 font-bold text-gray-800 border-b text-center text-sm">Income Statement (${type}-Step Periodic)</div>
            <div className="p-4 overflow-y-auto flex-1 text-xs">
                ${type === 'Single' ? html`<div className="mb-2 font-bold text-gray-800">Revenues</div>` : html`<div className="mb-2 font-bold text-gray-800">Operating Revenues</div>`}
                ${renderRow('[Sales Account]', 'sales', 'pl-4', '0.00', true, 'salesLabel')}
                <div className="flex items-center gap-2 pl-8 text-blue-600 mb-1 cursor-pointer hover:underline text-xs" onClick=${()=>updateData({showSalesDetails: !data.showSalesDetails})}>${data.showSalesDetails ? '- Hide' : '+ Show'} Sales Discounts / Allowances Row</div>
                ${data.showSalesDetails && html`
                    ${renderRow('Less: Sales Discounts', 'salesDisc', 'pl-8')}
                    ${renderRow('Less: Sales Returns and Allowances', 'salesRet', 'pl-8')}
                `}
                <div className="border-t border-black mt-1 mb-2"></div>
                ${renderRow('Net Sales', 'netSales', 'pl-4 font-bold')}

                <div className="mt-4 mb-2 font-bold text-gray-800">Cost of Goods Sold</div>
                ${renderRow('[Inventory Account - beginning]', 'begInv', 'pl-4', '[Beg Inv]', true, 'begInvLabel')}
                ${renderRow('[Purchases Account]', 'purchases', 'pl-4', '[Purchases]', true, 'purchasesLabel')}
                <div className="flex items-center gap-2 pl-8 text-blue-600 mb-1 cursor-pointer hover:underline text-xs" onClick=${()=>updateData({showPurchDetails: !data.showPurchDetails})}>${data.showPurchDetails ? '- Hide' : '+ Show'} Purchase Discounts / Allowances Row</div>
                ${data.showPurchDetails && html`
                     ${renderRow('Less: Purchase Discounts', 'purchDisc', 'pl-12')}
                     ${renderRow('Less: Purchase Returns', 'purchRet', 'pl-12')}
                `}
                ${renderRow('Net Purchases', 'netPurch', 'pl-8 font-semibold')}
                ${renderRow('[Freight-in / Transportation In]', 'freightIn', 'pl-8', '[Freight In]', true, 'freightInLabel')}
                <div className="border-t border-gray-300 mt-1 mb-1"></div>
                ${renderRow('Total Cost of Goods Purchased', 'costPurch', 'pl-4 font-semibold')}
                <div className="border-t border-black mt-1 mb-1"></div>
                ${renderRow('Total Goods Available for Sale', 'tgas', 'pl-4 font-bold')}
                ${renderRow('[Inventory Account - ending]', 'endInv', 'pl-4', '[End Inv]', true, 'endInvLabel')}
                <div className="border-b border-black mb-2"></div>
                ${renderRow('Cost of Goods Sold', 'cogs', 'pl-0 font-bold text-red-700')}
                
                <div className="border-b-2 border-black mb-4"></div>
                ${renderRow('GROSS INCOME', 'grossIncome', 'pl-0 font-bold')}

                ${type === 'Single' ? html`
                    <div className="mt-4 font-bold text-gray-800">Other Operating & Non-Operating Income</div>
                    <table className="w-full mb-1"><tbody>${(otherIncomeRows).map((r,i)=>html`<tr key=${i}><td className="p-1 pl-4 relative"><input type="text" className="w-full bg-transparent" placeholder="[Other operating / non-operating income]" value=${r.label} onChange=${(e)=>handleArrChange('otherIncome',i,'label',e.target.value)} disabled=${isReadOnly}/>${(showFeedback || isReadOnly) && (valMap.otherIncome?.[i]?.label ? html`<${Check} size=${12} class="text-green-600 absolute right-0 top-1"/>` : html`<${X} size=${12} class="text-red-500 absolute right-0 top-1"/>`)}</td><td className="w-24">${renderInput(r.amount, (e)=>handleArrAmountChange('otherIncome',i,e.target.value), valMap.otherIncome?.[i]?.amount, showFeedback, isReadOnly)}</td><td><button onClick=${()=>deleteRow('otherIncome',i)}><${Trash2} size=${12}/></button></td></tr>`)}</tbody></table><button onClick=${()=>addRow('otherIncome')} class=${btnStyle}><${Plus} size=${12}/> Add Revenue Row</button>
                    ${renderRow('Total Revenues', 'totalRevenues', 'pl-0 font-bold')}

                    <div className="mt-4 font-bold text-gray-800">Expenses</div>
                    <table className="w-full mb-1"><tbody>${expenseRows.map((r,i)=>html`<tr key=${i}><td className="p-1 pl-4 relative"><input type="text" className="w-full bg-transparent" placeholder="[Operating / Non-operating Expense Account]" value=${r.label} onChange=${(e)=>handleArrChange('expenses',i,'label',e.target.value)} disabled=${isReadOnly}/>${(showFeedback || isReadOnly) && (valMap.expenses?.[i]?.label ? html`<${Check} size=${12} class="text-green-600 absolute right-0 top-1"/>` : html`<${X} size=${12} class="text-red-500 absolute right-0 top-1"/>`)}</td><td className="w-24">${renderInput(r.amount, (e)=>handleArrAmountChange('expenses',i,e.target.value), valMap.expenses?.[i]?.amount, showFeedback, isReadOnly)}</td><td><button onClick=${()=>deleteRow('expenses',i)}><${Trash2} size=${12}/></button></td></tr>`)}</tbody></table><button onClick=${()=>addRow('expenses')} class=${btnStyle}><${Plus} size=${12}/> Add Expense Row</button>
                    ${renderRow('Total Expenses', 'totalExpenses', 'pl-0 font-bold')}
                ` : html`
                    <div className="mt-4 font-bold text-gray-800">Less: Operating Expenses</div>
                    <table className="w-full mb-1"><tbody>${opExpenseRows.map((r,i)=>html`<tr key=${i}><td className="p-1 pl-4 relative"><input type="text" className="w-full bg-transparent" placeholder="[Operating Expense Account]" value=${r.label} onChange=${(e)=>handleArrChange('opExpenses',i,'label',e.target.value)} disabled=${isReadOnly}/>${(showFeedback || isReadOnly) && (valMap.opExpenses?.[i]?.label ? html`<${Check} size=${12} class="text-green-600 absolute right-0 top-1"/>` : html`<${X} size=${12} class="text-red-500 absolute right-0 top-1"/>`)}</td><td className="w-24">${renderInput(r.amount, (e)=>handleArrAmountChange('opExpenses',i,e.target.value), valMap.opExpenses?.[i]?.amount, showFeedback, isReadOnly)}</td><td><button onClick=${()=>deleteRow('opExpenses',i)}><${Trash2} size=${12}/></button></td></tr>`)}</tbody></table><button onClick=${()=>addRow('opExpenses')} class=${btnStyle}><${Plus} size=${12}/> Add Expense Row</button>
                    ${renderRow('Total Operating Expenses', 'totalOpExpenses', 'pl-4 font-semibold')}
                    ${renderRow('Net Operating Income (Loss)', 'netOpInc', 'pl-0 font-bold')}
                    
                    <div className="mt-4 font-bold text-gray-800">Non-Operating Income and Expenses</div>
                    <table className="w-full mb-1"><tbody>${nonOpRows.map((r,i)=>html`<tr key=${i}><td className="p-1 pl-4 relative"><input type="text" className="w-full bg-transparent" placeholder="[Non-Operating Expense Account]" value=${r.label} onChange=${(e)=>handleArrChange('nonOpItems',i,'label',e.target.value)} disabled=${isReadOnly}/>${(showFeedback || isReadOnly) && (valMap.nonOpItems?.[i]?.label ? html`<${Check} size=${12} class="text-green-600 absolute right-0 top-1"/>` : html`<${X} size=${12} class="text-red-500 absolute right-0 top-1"/>`)}</td><td className="w-24">${renderInput(r.amount, (e)=>handleArrAmountChange('nonOpItems',i,e.target.value), valMap.nonOpItems?.[i]?.amount, showFeedback, isReadOnly)}</td><td><button onClick=${()=>deleteRow('nonOpItems',i)}><${Trash2} size=${12}/></button></td></tr>`)}</tbody></table><button onClick=${()=>addRow('nonOpItems')} class=${btnStyle}><${Plus} size=${12}/> Add Non-Operating Row</button>
                    ${renderRow('Net Non-Operating Income (Loss)', 'netNonOp', 'pl-4')}
                `}

                <div className="mt-6 border-t-2 border-black pt-2">
                     ${renderRow('Net Income (Loss) before taxes', 'niBefore', 'pl-0 font-bold')}
                     ${renderRow('Income Tax', 'tax', 'pl-4')}
                     <div className="border-b-4 border-double border-black mb-1"></div>
                     <div className="flex justify-between items-center py-1">
                        <span className="pl-0 font-bold">Net Income (Loss) after taxes</span>
                        <div class="w-24">${renderInput(data?.netIncomeAfterTax, (e)=>updateData({ netIncomeAfterTax: e.target.value }), valMap.netIncome, showFeedback, isReadOnly)}</div>
                     </div>
                </div>
            </div>
        </div>
    `;
};

const MerchPerpetualIS = ({ data, onChange, isReadOnly, showFeedback, validationMap, type = "Single" }) => {
    const updateData = (updates) => onChange({ ...data, ...updates });
    const handleAmountChange = (key, val) => {
        if (/^[0-9.,\-() ]*$/.test(val)) updateData({ [key]: val });
    };

    const renderRow = (label, valueKey, indent='pl-4', placeholder='0.00', showInput=true, labelKey=null) => html`<div className="flex justify-between items-center py-1">
        ${labelKey 
            ? html`<span className=${indent}><input type="text" className="w-64 outline-none bg-transparent border-b border-gray-300 focus:border-blue-500 placeholder-gray-400 italic" placeholder=${label} value=${data?.[labelKey] || ''} onChange=${(e)=>updateData({ [labelKey]: e.target.value })} disabled=${isReadOnly}/></span>`
            : html`<span className=${indent}>${label}</span>`
        }
        ${showInput ? html`<div class="w-24">${renderInput(data?.[valueKey], (e)=>handleAmountChange(valueKey, e.target.value), null, false, isReadOnly, placeholder)}</div>` : ''}
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

    const valMap = validationMap?.is || {};

    return html`
        <div className="border rounded bg-white flex flex-col h-full shadow-sm">
            <div className="bg-blue-100 p-2 font-bold text-gray-800 border-b text-center text-sm">Income Statement (${type}-Step Perpetual)</div>
            <div className="p-4 overflow-y-auto flex-1 text-xs">
                ${type === 'Single' ? html`<div className="mb-2 font-bold text-gray-800">Revenues</div>` : html`<div className="mb-2 font-bold text-gray-800">Operating Revenues</div>`}
                ${renderRow('[Sales Account]', 'sales', 'pl-4', '0.00', true, 'salesLabel')}
                <div className="flex items-center gap-2 pl-8 text-blue-600 mb-1 cursor-pointer hover:underline text-xs" onClick=${()=>updateData({showSalesDetails: !data.showSalesDetails})}>${data.showSalesDetails ? '- Hide' : '+ Show'} Sales Discounts / Allowances Row</div>
                ${data.showSalesDetails && html`
                    ${renderRow('Less: Sales Discounts', 'salesDisc', 'pl-8')}
                    ${renderRow('Less: Sales Returns and Allowances', 'salesRet', 'pl-8')}
                `}
                <div className="border-t border-black mt-1 mb-2"></div>
                ${renderRow('Net Sales', 'netSales', 'pl-4 font-bold')}

                ${renderRow('Cost of Goods Sold', 'cogs', 'pl-4', '0.00', true, 'cogsLabel')}
                
                <div className="border-b-2 border-black mb-4"></div>
                ${renderRow('GROSS INCOME', 'grossIncome', 'pl-0 font-bold')}

                ${type === 'Single' ? html`
                    <div className="mt-4 font-bold text-gray-800">Other Operating & Non-Operating Income</div>
                    <table className="w-full mb-1"><tbody>${(otherIncomeRows).map((r,i)=>html`<tr key=${i}><td className="p-1 pl-4 relative"><input type="text" className="w-full bg-transparent" placeholder="[Other operating / non-operating income]" value=${r.label} onChange=${(e)=>handleArrChange('otherIncome',i,'label',e.target.value)} disabled=${isReadOnly}/>${(showFeedback || isReadOnly) && (valMap.otherIncome?.[i]?.label ? html`<${Check} size=${12} class="text-green-600 absolute right-0 top-1"/>` : html`<${X} size=${12} class="text-red-500 absolute right-0 top-1"/>`)}</td><td className="w-24">${renderInput(r.amount, (e)=>handleArrAmountChange('otherIncome',i,e.target.value), valMap.otherIncome?.[i]?.amount, showFeedback, isReadOnly)}</td><td><button onClick=${()=>deleteRow('otherIncome',i)}><${Trash2} size=${12}/></button></td></tr>`)}</tbody></table><button onClick=${()=>addRow('otherIncome')} class=${btnStyle}><${Plus} size=${12}/> Add Revenue Row</button>
                    ${renderRow('Total Revenues', 'totalRevenues', 'pl-0 font-bold')}

                    <div className="mt-4 font-bold text-gray-800">Expenses</div>
                    <table className="w-full mb-1"><tbody>${expenseRows.map((r,i)=>html`<tr key=${i}><td className="p-1 pl-4 relative"><input type="text" className="w-full bg-transparent" placeholder="[Operating / Non-operating Expense Account]" value=${r.label} onChange=${(e)=>handleArrChange('expenses',i,'label',e.target.value)} disabled=${isReadOnly}/>${(showFeedback || isReadOnly) && (valMap.expenses?.[i]?.label ? html`<${Check} size=${12} class="text-green-600 absolute right-0 top-1"/>` : html`<${X} size=${12} class="text-red-500 absolute right-0 top-1"/>`)}</td><td className="w-24">${renderInput(r.amount, (e)=>handleArrAmountChange('expenses',i,e.target.value), valMap.expenses?.[i]?.amount, showFeedback, isReadOnly)}</td><td><button onClick=${()=>deleteRow('expenses',i)}><${Trash2} size=${12}/></button></td></tr>`)}</tbody></table><button onClick=${()=>addRow('expenses')} class=${btnStyle}><${Plus} size=${12}/> Add Expense Row</button>
                    ${renderRow('Total Expenses', 'totalExpenses', 'pl-0 font-bold')}
                ` : html`
                    <div className="mt-4 font-bold text-gray-800">Operating Expenses</div>
                    <table className="w-full mb-1"><tbody>${opExpenseRows.map((r,i)=>html`<tr key=${i}><td className="p-1 pl-4 relative"><input type="text" className="w-full bg-transparent" placeholder="[Operating Expense Account]" value=${r.label} onChange=${(e)=>handleArrChange('opExpenses',i,'label',e.target.value)} disabled=${isReadOnly}/>${(showFeedback || isReadOnly) && (valMap.opExpenses?.[i]?.label ? html`<${Check} size=${12} class="text-green-600 absolute right-0 top-1"/>` : html`<${X} size=${12} class="text-red-500 absolute right-0 top-1"/>`)}</td><td className="w-24">${renderInput(r.amount, (e)=>handleArrAmountChange('opExpenses',i,e.target.value), valMap.opExpenses?.[i]?.amount, showFeedback, isReadOnly)}</td><td><button onClick=${()=>deleteRow('opExpenses',i)}><${Trash2} size=${12}/></button></td></tr>`)}</tbody></table><button onClick=${()=>addRow('opExpenses')} class=${btnStyle}><${Plus} size=${12}/> Add Expense Row</button>
                    ${renderRow('Total Operating Expenses', 'totalOpExpenses', 'pl-4 font-semibold')}
                    ${renderRow('Net Operating Income (Loss)', 'netOpInc', 'pl-0 font-bold')}
                    
                    <div className="mt-4 font-bold text-gray-800">Non-Operating Income and Expenses</div>
                    <table className="w-full mb-1"><tbody>${nonOpRows.map((r,i)=>html`<tr key=${i}><td className="p-1 pl-4 relative"><input type="text" className="w-full bg-transparent" placeholder="[Non-Operating Expense Account]" value=${r.label} onChange=${(e)=>handleArrChange('nonOpItems',i,'label',e.target.value)} disabled=${isReadOnly}/>${(showFeedback || isReadOnly) && (valMap.nonOpItems?.[i]?.label ? html`<${Check} size=${12} class="text-green-600 absolute right-0 top-1"/>` : html`<${X} size=${12} class="text-red-500 absolute right-0 top-1"/>`)}</td><td className="w-24">${renderInput(r.amount, (e)=>handleArrAmountChange('nonOpItems',i,e.target.value), valMap.nonOpItems?.[i]?.amount, showFeedback, isReadOnly)}</td><td><button onClick=${()=>deleteRow('nonOpItems',i)}><${Trash2} size=${12}/></button></td></tr>`)}</tbody></table><button onClick=${()=>addRow('nonOpItems')} class=${btnStyle}><${Plus} size=${12}/> Add Non-Operating Row</button>
                    ${renderRow('Net Non-Operating Income (Loss)', 'netNonOp', 'pl-4')}
                `}

                <div className="mt-6 border-t-2 border-black pt-2">
                     ${renderRow('Net Income (Loss) before taxes', 'niBefore', 'pl-0 font-bold')}
                     ${renderRow('Income Tax', 'tax', 'pl-4')}
                     <div className="border-b-4 border-double border-black mb-1"></div>
                     <div className="flex justify-between items-center py-1">
                        <span className="pl-0 font-bold">Net Income (Loss) after taxes</span>
                        <div class="w-24">${renderInput(data?.netIncomeAfterTax, (e)=>updateData({ netIncomeAfterTax: e.target.value }), valMap.netIncome, showFeedback, isReadOnly)}</div>
                     </div>
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

    // Calculate Banner Results
    const validationResult = useMemo(() => {
        if (!showFeedback && !isReadOnly) return null;
        return validateStep06(ledgerData, adjustments, activityData, data);
    }, [ledgerData, adjustments, activityData, data, showFeedback, isReadOnly]);

    const renderIncomeStatement = () => {
        const currentData = data.is || {};
        if (!isMerch) {
            return fsFormat === 'Single' 
                ? html`<${ServiceSingleStepIS} data=${currentData} onChange=${(d)=>onChange('is', d)} isReadOnly=${isReadOnly} showFeedback=${showFeedback} validationMap=${validationResult?.validationMap} />`
                : html`<${ServiceMultiStepIS} data=${currentData} onChange=${(d)=>onChange('is', d)} isReadOnly=${isReadOnly} showFeedback=${showFeedback} validationMap=${validationResult?.validationMap} />`;
        } else {
            return isPerpetual 
                ? html`<${MerchPerpetualIS} type=${fsFormat} data=${currentData} onChange=${(d)=>onChange('is', d)} isReadOnly=${isReadOnly} showFeedback=${showFeedback} validationMap=${validationResult?.validationMap} />`
                : html`<${MerchPeriodicIS} type=${fsFormat} data=${currentData} onChange=${(d)=>onChange('is', d)} isReadOnly=${isReadOnly} showFeedback=${showFeedback} validationMap=${validationResult?.validationMap} />`;
        }
    };

    const handleSCEChange = (newData) => onChange('sce', newData);
    const handleBSChange = (key, val) => onChange('bs', { ...data.bs, [key]: val });
    const handleSCFChange = (key, val) => onChange('scf', { ...data.scf, [key]: val });

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
                                        <${StatementOfChangesInEquity} data=${data.sce} onChange=${handleSCEChange} isReadOnly=${isReadOnly} showFeedback=${showFeedback} validationMap=${validationResult?.validationMap} activityData=${activityData} />
                                    </div>
                                </div>
                                <div className="h-full">
                                    <${BalanceSheet} data=${data.bs} onChange=${(d)=>onChange('bs', d)} isReadOnly=${isReadOnly} showFeedback=${showFeedback} validationMap=${validationResult?.validationMap} />
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
                                    <${StatementOfChangesInEquity} data=${data.sce} onChange=${handleSCEChange} isReadOnly=${isReadOnly} showFeedback=${showFeedback} validationMap=${validationResult?.validationMap} activityData=${activityData} />
                                </div>
                                <div className="h-full">
                                    <${BalanceSheet} data=${data.bs} onChange=${(d)=>onChange('bs', d)} isReadOnly=${isReadOnly} showFeedback=${showFeedback} validationMap=${validationResult?.validationMap} />
                                </div>
                            </div>
                        `
                    }
                </div>
            </div>
        </div>
    `;
}
