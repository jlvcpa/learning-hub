import React, { useState, useMemo, useEffect } from 'https://esm.sh/react@18.2.0';
import htm from 'https://esm.sh/htm';
import { Table, Trash2, Plus, List, ChevronDown, ChevronRight } from 'https://esm.sh/lucide-react@0.263.1';
import { sortAccounts, getAccountType } from '../utils.js';

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
    
    if (Math.abs(expRounded) < 0.01) {
        return !userVal || parseUserValue(userVal) === 0;
    }
    const parsedUser = parseUserValue(userVal);
    const matchesNumber = Math.abs(parsedUser - expRounded) <= 1 || Math.abs(parsedUser - (-expRounded)) <= 1;
    
    if (!matchesNumber) return false;
    if (expRounded < 0 || isDeduction) {
        if (!userVal.toString().includes('(') && !userVal.toString().includes('-') && parsedUser > 0) return false;
    }
    return true;
};

const inputClass = (isError) => `w-full text-right p-1 text-xs outline-none border-b border-gray-300 bg-transparent focus:border-blue-500 font-mono ${isError ? 'bg-red-50 text-red-600 font-bold' : ''}`;
const btnStyle = "mt-2 text-xs text-blue-900 font-medium hover:underline flex items-center gap-1 cursor-pointer";

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

// --- BALANCE SHEET COMPONENT (NEW DEC 9 VERSION) ---

const BalanceSheet = ({ data, onChange, isReadOnly, showFeedback, sceEndingCapital }) => {
    const [showNonCurrentAssets, setShowNonCurrentAssets] = useState(false);
    const [showNonCurrentLiabs, setShowNonCurrentLiabs] = useState(false);

    const updateData = (updates) => onChange({ ...data, ...updates });

    // --- Asset Lists ---
    const curAssets = data?.curAssets || [{ label: '', amount: '' }];
    const otherAssets = data?.otherAssets || [{ label: '', amount: '' }];
    const depAssets = data?.depAssets || []; // Array of blocks: { asset: '', cost: '', contra: '', accum: '', net: '' }

    // --- Liability Lists ---
    const curLiabs = data?.curLiabs || [{ label: '', amount: '' }];
    const nonCurLiabs = data?.nonCurLiabs || [{ label: '', amount: '' }];

    // --- Helpers ---
    const handleArrChange = (arrKey, idx, field, val) => {
        const arr = [...(data?.[arrKey] || [])];
        arr[idx] = { ...arr[idx], [field]: val };
        updateData({ [arrKey]: arr });
    };
    const addRow = (arrKey, defaultObj) => updateData({ [arrKey]: [...(data?.[arrKey]||[]), defaultObj] });
    const deleteRow = (arrKey, idx) => updateData({ [arrKey]: (data?.[arrKey]||[]).filter((_, i) => i !== idx) });

    // Calculations for Validation
    const sumArr = (arr) => arr.reduce((acc, r) => acc + parseUserValue(r.amount), 0);
    const sumDepNet = depAssets.reduce((acc, r) => acc + parseUserValue(r.net), 0);
    
    const calcTotalCurAssets = sumArr(curAssets);
    const calcTotalNonCurAssets = sumArr(otherAssets) + sumDepNet;
    const calcTotalAssets = calcTotalCurAssets + calcTotalNonCurAssets;

    const calcTotalCurLiabs = sumArr(curLiabs);
    const calcTotalNonCurLiabs = sumArr(nonCurLiabs);
    const calcTotalLiabs = calcTotalCurLiabs + calcTotalNonCurLiabs;
    
    const calcTotalLiabEquity = calcTotalLiabs + parseUserValue(data?.endCapital);

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
                    <input type="text" className=${inputClass(showFeedback && !checkField(data?.totalCurAssets, calcTotalCurAssets))} value=${data?.totalCurAssets || ''} onChange=${(e)=>updateData({ totalCurAssets: e.target.value })} disabled=${isReadOnly}/>
                </div>

                <div className="mt-4 mb-2 flex items-center gap-2 cursor-pointer text-blue-800 font-bold text-xs" onClick=${()=>setShowNonCurrentAssets(!showNonCurrentAssets)}>
                    ${showNonCurrentAssets ? html`<${ChevronDown} size=${14}/>` : html`<${ChevronRight} size=${14}/>`} Non-current Assets Section
                </div>
                
                ${showNonCurrentAssets && html`
                    <div className="pl-2 border-l-2 border-blue-100 mb-4">
                        ${depAssets.map((block, i) => html`
                            <div key=${i} className="mb-2 bg-gray-50 p-2 rounded relative group">
                                <div className="flex justify-between mb-1">
                                    <input type="text" className="bg-transparent w-full outline-none" placeholder="[Property/Equipment Account]" value=${block.asset} onChange=${(e)=>handleArrChange('depAssets', i, 'asset', e.target.value)} disabled=${isReadOnly}/>
                                    <input type="text" className="w-20 text-right bg-transparent outline-none" placeholder="0" value=${block.cost} onChange=${(e)=>handleArrChange('depAssets', i, 'cost', e.target.value)} disabled=${isReadOnly}/>
                                </div>
                                <div className="flex justify-between mb-1 text-gray-600">
                                    <span className="pl-4">Less: <input type="text" className="inline-block bg-transparent outline-none w-32" placeholder="[Accum. Depr.]" value=${block.contra} onChange=${(e)=>handleArrChange('depAssets', i, 'contra', e.target.value)} disabled=${isReadOnly}/></span>
                                    <input type="text" className="w-20 text-right bg-transparent outline-none border-b border-gray-300" placeholder="(0)" value=${block.accum} onChange=${(e)=>handleArrChange('depAssets', i, 'accum', e.target.value)} disabled=${isReadOnly}/>
                                </div>
                                <div className="flex justify-between font-bold">
                                    <span className="pl-8">Net Book Value</span>
                                    <input type="text" className=${inputClass(showFeedback && !checkField(block.net, parseUserValue(block.cost) - Math.abs(parseUserValue(block.accum))))} value=${block.net} onChange=${(e)=>handleArrChange('depAssets', i, 'net', e.target.value)} disabled=${isReadOnly} placeholder="0"/>
                                </div>
                                ${!isReadOnly && html`<button onClick=${()=>deleteRow('depAssets', i)} className="absolute top-1 right-[-20px] text-red-400 opacity-0 group-hover:opacity-100"><${Trash2} size=${12}/></button>`}
                            </div>
                        `)}
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
                            <input type="text" className=${inputClass(showFeedback && !checkField(data?.totalNonCurAssets, calcTotalNonCurAssets))} value=${data?.totalNonCurAssets || ''} onChange=${(e)=>updateData({ totalNonCurAssets: e.target.value })} disabled=${isReadOnly}/>
                        </div>
                    </div>
                `}

                <div className="flex justify-between items-center py-2 font-bold border-t-2 border-black border-double border-b-4 mt-2 mb-6">
                    <span className="">Total Assets</span>
                    <input type="text" className=${inputClass(showFeedback && !checkField(data?.totalAssets, calcTotalAssets))} value=${data?.totalAssets || ''} onChange=${(e)=>updateData({ totalAssets: e.target.value })} disabled=${isReadOnly}/>
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
                    <input type="text" className=${inputClass(showFeedback && !checkField(data?.totalCurLiabs, calcTotalCurLiabs))} value=${data?.totalCurLiabs || ''} onChange=${(e)=>updateData({ totalCurLiabs: e.target.value })} disabled=${isReadOnly}/>
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
                            <input type="text" className=${inputClass(showFeedback && !checkField(data?.totalNonCurLiabs, calcTotalNonCurLiabs))} value=${data?.totalNonCurLiabs || ''} onChange=${(e)=>updateData({ totalNonCurLiabs: e.target.value })} disabled=${isReadOnly}/>
                        </div>
                    </div>
                `}

                <div className="flex justify-between items-center py-1 font-bold mt-2">
                    <span className="pl-0">Total Liabilities</span>
                    <input type="text" className=${inputClass(showFeedback && !checkField(data?.totalLiabs, calcTotalLiabs))} value=${data?.totalLiabs || ''} onChange=${(e)=>updateData({ totalLiabs: e.target.value })} disabled=${isReadOnly}/>
                </div>

                <div className="font-bold text-gray-700 mt-4 mb-1">Owner's Equity</div>
                <div className="flex justify-between items-center py-1">
                    <span className="pl-4 text-gray-500 italic">[Owner, Capital Ending]</span>
                    <input type="text" className=${inputClass(showFeedback && !checkField(data?.endCapital, sceEndingCapital))} value=${data?.endCapital || ''} onChange=${(e)=>updateData({ endCapital: e.target.value })} disabled=${isReadOnly} placeholder="From SCE..."/>
                </div>

                <div className="flex justify-between items-center py-2 font-bold mt-4 border-t-2 border-black border-double border-b-4">
                    <span className="">Total Liabilities and Owner's Equity</span>
                    <input type="text" className=${inputClass(showFeedback && !checkField(data?.totalLiabEquity, calcTotalLiabEquity))} value=${data?.totalLiabEquity || ''} onChange=${(e)=>updateData({ totalLiabEquity: e.target.value })} disabled=${isReadOnly}/>
                </div>

            </div>
        </div>
    `;
};


// --------------------------------------------------------
// SCE
// --------------------------------------------------------
const StatementOfChangesInEquity = ({ data, onChange, isReadOnly, showFeedback, calculatedTotals, activityData }) => {
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
                    <input type="text" className=${inputClass(showFeedback && !checkField(data?.begCapital, expBegCap))} value=${data?.begCapital || ''} onChange=${(e)=>updateData({ begCapital: e.target.value })} disabled=${isReadOnly} placeholder="0"/>
                </div>

                <div className="mt-2 font-bold text-gray-800">Add: <span className="text-gray-400 font-normal italic">[Additions to Capital]</span></div>
                <table className="w-full mb-1"><tbody>${additions.map((r,i)=>html`<tr key=${i}><td className="p-1 pl-4"><input type="text" className="w-full bg-transparent" placeholder="Investment / Net Income..." value=${r.label} onChange=${(e)=>handleArrChange('additions',i,'label',e.target.value)} disabled=${isReadOnly}/></td><td className="w-24"><input type="text" className="w-full text-right bg-transparent border-b" value=${r.amount} onChange=${(e)=>handleArrChange('additions',i,'amount',e.target.value)} disabled=${isReadOnly}/></td><td><button onClick=${()=>deleteRow('additions',i)}><${Trash2} size=${12}/></button></td></tr>`)}</tbody></table>
                ${!isReadOnly && html`<button onClick=${()=>addRow('additions')} className=${btnStyle}><${Plus} size=${12}/> Add Addition Row</button>`}
                
                <div className="flex justify-between items-center py-1 font-semibold border-t border-black">
                    <span className="pl-8">Total Additions to Capital</span>
                    <input type="text" className=${inputClass(showFeedback && !checkField(data?.totalAdditions, expTotalAdditions))} value=${data?.totalAdditions || ''} onChange=${(e)=>updateData({ totalAdditions: e.target.value })} disabled=${isReadOnly}/>
                </div>

                <div className="flex justify-between items-center py-2 font-semibold">
                    <span className="">Total Owner, Capital during the period</span>
                    <input type="text" className=${inputClass(showFeedback && !checkField(data?.totalCapDuring, expTotalCapDuring))} value=${data?.totalCapDuring || ''} onChange=${(e)=>updateData({ totalCapDuring: e.target.value })} disabled=${isReadOnly}/>
                </div>

                <div className="mt-2 font-bold text-gray-800">Less: <span className="text-gray-400 font-normal italic">[Deductions from Capital]</span></div>
                <table className="w-full mb-1"><tbody>${deductions.map((r,i)=>html`<tr key=${i}><td className="p-1 pl-4"><input type="text" className="w-full bg-transparent" placeholder="Drawings / Net Loss..." value=${r.label} onChange=${(e)=>handleArrChange('deductions',i,'label',e.target.value)} disabled=${isReadOnly}/></td><td className="w-24"><input type="text" className="w-full text-right bg-transparent border-b" value=${r.amount} onChange=${(e)=>handleArrChange('deductions',i,'amount',e.target.value)} disabled=${isReadOnly}/></td><td><button onClick=${()=>deleteRow('deductions',i)}><${Trash2} size=${12}/></button></td></tr>`)}</tbody></table>
                ${!isReadOnly && html`<button onClick=${()=>addRow('deductions')} className=${btnStyle}><${Plus} size=${12}/> Add Deduction Row</button>`}

                <div className="flex justify-between items-center py-1 font-semibold border-t border-black">
                    <span className="pl-8">Total Deductions from Capital</span>
                    <input type="text" className=${inputClass(showFeedback && !checkField(data?.totalDeductions, expTotalDeductions))} value=${data?.totalDeductions || ''} onChange=${(e)=>updateData({ totalDeductions: e.target.value })} disabled=${isReadOnly}/>
                </div>

                <div className="flex justify-between items-center py-2 font-bold mt-2 border-t border-black border-b-4 border-double">
                    <span className="text-gray-500 italic">[Owner, Capital - ending]</span>
                    <input type="text" className=${inputClass(showFeedback && !checkField(data?.endCapital, expEndCap))} value=${data?.endCapital || ''} onChange=${(e)=>updateData({ endCapital: e.target.value })} disabled=${isReadOnly} placeholder="0"/>
                </div>
            </div>
        </div>
    `;
};


// --- RESTORED INCOME STATEMENT COMPONENTS (FROM DEC 8) ---

const ServiceSingleStepIS = ({ data, onChange, isReadOnly, showFeedback, calculatedTotals }) => {
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
                <div className="mb-4"><div className="font-bold mb-1 text-gray-800">Revenues</div><table className="w-full mb-1"><tbody>${revenues.map((r,i)=>html`<tr key=${i}><td className="p-1 pl-4"><input type="text" className="w-full outline-none bg-transparent" placeholder="[Revenue Account]" value=${r.label} onChange=${(e)=>handleArrChange('revenues',i,'label',e.target.value)} disabled=${isReadOnly}/></td><td className="p-1 w-24"><input type="text" className="w-full text-right outline-none bg-transparent border-b border-gray-200" value=${r.amount} onChange=${(e)=>handleArrChange('revenues',i,'amount',e.target.value)} disabled=${isReadOnly}/></td><td className="p-1 w-6 text-center">${!isReadOnly && html`<button onClick=${()=>deleteRow('revenues',i)}><${Trash2} size=${12}/></button>`}</td></tr>`)}</tbody></table>${!isReadOnly && html`<button onClick=${()=>addRow('revenues')} className=${btnStyle}><${Plus} size=${12}/> Add Revenue Row</button>`}<div className="flex justify-between items-center py-1 font-bold mt-1"><span className="pl-0">Total Revenues</span><input type="text" className=${inputClass(showFeedback && !checkField(data?.totalRevenues, expRev))} value=${data?.totalRevenues || ''} onChange=${(e)=>updateData({ totalRevenues: e.target.value })} disabled=${isReadOnly}/></div></div>
                <div className="mb-4"><div className="font-bold mb-1 text-gray-800">Less: Expenses</div><table className="w-full mb-1"><tbody>${expenses.map((r,i)=>html`<tr key=${i}><td className="p-1 pl-4"><input type="text" className="w-full outline-none bg-transparent" placeholder="[Expense Account]" value=${r.label} onChange=${(e)=>handleArrChange('expenses',i,'label',e.target.value)} disabled=${isReadOnly}/></td><td className="p-1 w-24"><input type="text" className="w-full text-right outline-none bg-transparent border-b border-gray-200" value=${r.amount} onChange=${(e)=>handleArrChange('expenses',i,'amount',e.target.value)} disabled=${isReadOnly}/></td><td className="p-1 w-6 text-center">${!isReadOnly && html`<button onClick=${()=>deleteRow('expenses',i)}><${Trash2} size=${12}/></button>`}</td></tr>`)}</tbody></table>${!isReadOnly && html`<button onClick=${()=>addRow('expenses')} className=${btnStyle}><${Plus} size=${12}/> Add Expense Row</button>`}<div className="flex justify-between items-center py-1 font-bold mt-1"><span className="pl-0">Total Expenses</span><input type="text" className=${inputClass(showFeedback && !checkField(data?.totalExpenses, expExp))} value=${data?.totalExpenses || ''} onChange=${(e)=>updateData({ totalExpenses: e.target.value })} disabled=${isReadOnly}/></div></div>
                <div className="space-y-1 mt-4 border-t-2 border-gray-400 pt-2"><div className="flex justify-between items-center py-1 font-semibold"><span className="">Net Income (Loss) before taxes</span><input type="text" className=${inputClass(showFeedback && !checkField(data?.netIncomeBeforeTax, expNI))} value=${data?.netIncomeBeforeTax || ''} onChange=${(e)=>updateData({ netIncomeBeforeTax: e.target.value })} disabled=${isReadOnly}/></div><div className="flex justify-between items-center py-1"><span className="pl-4">Less: Income Tax</span><input type="text" className=${inputClass(false)} value=${data?.incomeTax || ''} onChange=${(e)=>updateData({ incomeTax: e.target.value })} disabled=${isReadOnly}/></div><div className="flex justify-between items-center py-2 font-bold text-blue-900 bg-gray-50 border-t-2 border-black border-double border-b-4"><span className="">Net Income (Loss) after taxes</span><input type="text" className=${inputClass(showFeedback && !checkField(data?.netIncomeAfterTax, expNI))} value=${data?.netIncomeAfterTax || ''} onChange=${(e)=>updateData({ netIncomeAfterTax: e.target.value })} disabled=${isReadOnly}/></div></div>
            </div>
        </div>
    `;
};

const ServiceMultiStepIS = ({ data, onChange, isReadOnly, showFeedback, calculatedTotals }) => {
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
                <div className="mb-4"><div className="font-bold mb-1">Operating Expenses</div><table className="w-full"><tbody>${opExpenses.map((r,i)=>html`<tr key=${i}><td className="pl-4"><input type="text" className="w-full bg-transparent" value=${r.label} onChange=${(e)=>handleArrChange('opExpenses',i,'label',e.target.value)} disabled=${isReadOnly}
