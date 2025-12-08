import React, { useState, useMemo, useEffect } from 'https://esm.sh/react@18.2.0';
import htm from 'https://esm.sh/htm';
import { Table, Trash2, Plus, List } from 'https://esm.sh/lucide-react@0.263.1';
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
    if (Math.abs(expectedVal) < 0.01) {
        return !userVal || parseUserValue(userVal) === 0;
    }
    const parsedUser = parseUserValue(userVal);
    const matchesNumber = Math.abs(parsedUser - expectedVal) <= 1 || Math.abs(parsedUser - (-expectedVal)) <= 1;
    
    if (!matchesNumber) return false;
    if (expectedVal < 0 || isDeduction) {
        if (!userVal.toString().includes('(') && !userVal.toString().includes('-') && parsedUser > 0) return false;
    }
    return true;
};

const inputClass = (isError) => `w-full text-right p-1 text-xs outline-none border-b border-gray-300 bg-transparent focus:border-blue-500 font-mono ${isError ? 'bg-red-50 text-red-600 font-bold' : ''}`;

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

const FinancialStatementForm = ({ title, data, onChange, isReadOnly, headerColor = "bg-gray-100" }) => {
    const rows = data?.rows || [{ label: '', amount: '' }, { label: '', amount: '' }];
    const updateRow = (idx, field, val) => { const newRows = [...rows]; newRows[idx] = { ...newRows[idx], [field]: val }; onChange('rows', newRows); };
    const addRow = () => onChange('rows', [...rows, { label: '', amount: '' }]);
    const deleteRow = (idx) => { if (rows.length <= 1) return; onChange('rows', rows.filter((_, i) => i !== idx)); };
    
    // Updated Button Style: No fill, dark text
    const btnStyle = "mt-2 text-xs text-blue-900 font-medium flex items-center gap-1 hover:text-blue-700 transition-colors";

    return html`
        <div className="border rounded bg-white flex flex-col h-full shadow-sm">
            <div className=${`${headerColor} p-2 font-bold text-gray-800 border-b text-center text-sm`}>${title}</div>
            <div className="p-2 overflow-y-auto flex-1">
                <table className="w-full text-xs">
                    <thead><tr><th className="text-left p-1">Particulars</th><th className="text-right p-1 w-24">Amount</th><th className="w-6"></th></tr></thead>
                    <tbody>${rows.map((r, i) => html`<tr key=${i} className="border-b border-gray-100"><td className="p-1"><input type="text" className="w-full outline-none bg-transparent font-medium" placeholder="..." value=${r.label} onChange=${(e)=>updateRow(i, 'label', e.target.value)} disabled=${isReadOnly}/></td><td className="p-1"><input type="number" className="w-full text-right outline-none bg-transparent" placeholder="0" value=${r.amount} onChange=${(e)=>updateRow(i, 'amount', e.target.value)} disabled=${isReadOnly}/></td><td className="p-1 text-center">${!isReadOnly && html`<button onClick=${()=>deleteRow(i)} className="text-gray-400 hover:text-red-500"><${Trash2} size=${12}/></button>`}</td></tr>`)}</tbody>
                </table>
                ${!isReadOnly && html`<button onClick=${addRow} className=${btnStyle}><${Plus} size=${12}/> Line Item</button>`}
            </div>
        </div>
    `;
};

// --- SERVICE INCOME STATEMENTS ---

const ServiceSingleStepIS = ({ data, onChange, isReadOnly, showFeedback, calculatedTotals }) => {
    const revenues = data?.revenues || [{ label: '', amount: '' }];
    const expenses = data?.expenses || [{ label: '', amount: '' }];
    const updateData = (updates) => onChange({ ...data, ...updates });
    const handleArrChange = (key, idx, field, val) => { const arr = [...(key==='revenues'?revenues:expenses)]; arr[idx] = {...arr[idx], [field]:val}; updateData({[key]: arr}); };
    const addRow = (key) => updateData({ [key]: [...(key==='revenues'?revenues:expenses), { label: '', amount: '' }] });
    const deleteRow = (key, idx) => { const arr = [...(key==='revenues'?revenues:expenses)]; if(arr.length<=1)return; updateData({[key]: arr.filter((_, i)=>i!==idx)}); };
    const expRev = calculatedTotals.isCr; const expExp = calculatedTotals.isDr; const expNI = expRev - expExp;
    
    // Updated Button Style: No fill, dark text
    const btnStyle = "ml-4 mb-1 text-xs text-blue-900 font-medium flex items-center gap-1 hover:text-blue-700 transition-colors cursor-pointer";

    return html`
        <div className="border rounded bg-white flex flex-col h-full shadow-sm">
            <div className="bg-green-100 p-2 font-bold text-gray-800 border-b text-center text-sm">Income Statement (Single-Step Service)</div>
            <div className="p-4 overflow-y-auto flex-1 text-xs">
                <div className="mb-4">
                    <div className="font-bold mb-1 text-gray-800">Revenues</div>
                    <table className="w-full mb-1"><tbody>${revenues.map((r,i)=>html`<tr key=${i}><td className="p-1 pl-4"><input type="text" className="w-full outline-none bg-transparent" placeholder="[Revenue Account]" value=${r.label} onChange=${(e)=>handleArrChange('revenues',i,'label',e.target.value)} disabled=${isReadOnly}/></td><td className="p-1 w-24"><input type="text" className="w-full text-right outline-none bg-transparent border-b border-gray-200" value=${r.amount} onChange=${(e)=>handleArrChange('revenues',i,'amount',e.target.value)} disabled=${isReadOnly}/></td><td className="p-1 w-6 text-center">${!isReadOnly && html`<button onClick=${()=>deleteRow('revenues',i)}><${Trash2} size=${12}/></button>`}</td></tr>`)}</tbody></table>
                    ${!isReadOnly && html`<button onClick=${()=>addRow('revenues')} className=${btnStyle}><${Plus} size=${12}/> Revenue Row</button>`}
                    <div className="flex justify-between items-center py-1 font-semibold mt-1"><span className="pl-0">Total Revenues</span><input type="text" className=${inputClass(showFeedback && !checkField(data?.totalRevenues, expRev))} value=${data?.totalRevenues || ''} onChange=${(e)=>updateData({ totalRevenues: e.target.value })} disabled=${isReadOnly}/></div>
                </div>
                <div className="mb-4">
                    <div className="font-bold mb-1 text-gray-800">Less: Expenses</div>
                    <table className="w-full mb-1"><tbody>${expenses.map((r,i)=>html`<tr key=${i}><td className="p-1 pl-4"><input type="text" className="w-full outline-none bg-transparent" placeholder="[Expense Account]" value=${r.label} onChange=${(e)=>handleArrChange('expenses',i,'label',e.target.value)} disabled=${isReadOnly}/></td><td className="p-1 w-24"><input type="text" className="w-full text-right outline-none bg-transparent border-b border-gray-200" value=${r.amount} onChange=${(e)=>handleArrChange('expenses',i,'amount',e.target.value)} disabled=${isReadOnly}/></td><td className="p-1 w-6 text-center">${!isReadOnly && html`<button onClick=${()=>deleteRow('expenses',i)}><${Trash2} size=${12}/></button>`}</td></tr>`)}</tbody></table>
                    ${!isReadOnly && html`<button onClick=${()=>addRow('expenses')} className=${btnStyle}><${Plus} size=${12}/> Expense Row</button>`}
                    <div className="flex justify-between items-center py-1 font-semibold mt-1"><span className="pl-0">Total Expenses</span><input type="text" className=${inputClass(showFeedback && !checkField(data?.totalExpenses, expExp))} value=${data?.totalExpenses || ''} onChange=${(e)=>updateData({ totalExpenses: e.target.value })} disabled=${isReadOnly}/></div>
                </div>
                <div className="space-y-1 mt-4 border-t-2 border-gray-400 pt-2"><div className="flex justify-between items-center py-1 font-medium"><span className="">Net Income (Loss) before taxes</span><input type="text" className=${inputClass(showFeedback && !checkField(data?.netIncomeBeforeTax, expNI))} value=${data?.netIncomeBeforeTax || ''} onChange=${(e)=>updateData({ netIncomeBeforeTax: e.target.value })} disabled=${isReadOnly}/></div><div className="flex justify-between items-center py-1"><span className="pl-4">Less: Income Tax</span><input type="text" className=${inputClass(false)} value=${data?.incomeTax || ''} onChange=${(e)=>updateData({ incomeTax: e.target.value })} disabled=${isReadOnly}/></div><div className="flex justify-between items-center py-2 font-bold text-blue-900 bg-gray-50 border-t-2 border-black border-double border-b-4"><span className="">Net Income (Loss) after taxes</span><input type="text" className=${inputClass(showFeedback && !checkField(data?.netIncomeAfterTax, expNI))} value=${data?.netIncomeAfterTax || ''} onChange=${(e)=>updateData({ netIncomeAfterTax: e.target.value })} disabled=${isReadOnly}/></div></div>
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
    
    const btnStyle = "ml-4 mb-1 text-xs text-blue-900 font-medium flex items-center gap-1 hover:text-blue-700 transition-colors cursor-pointer";

    return html`
        <div className="border rounded bg-white flex flex-col h-full shadow-sm">
            <div className="bg-green-100 p-2 font-bold text-gray-800 border-b text-center text-sm">Income Statement (Multi-Step Service)</div>
            <div className="p-4 overflow-y-auto flex-1 text-xs">
                <div className="mb-4"><div className="font-bold mb-1">Operating Revenues</div><table className="w-full"><tbody>${opRevenues.map((r,i)=>html`<tr key=${i}><td className="pl-4"><input type="text" className="w-full bg-transparent" value=${r.label} onChange=${(e)=>handleArrChange('opRevenues',i,'label',e.target.value)} disabled=${isReadOnly} placeholder="[Revenue Account]"/></td><td className="w-24"><input type="text" className="w-full text-right bg-transparent border-b" value=${r.amount} onChange=${(e)=>handleArrChange('opRevenues',i,'amount',e.target.value)} disabled=${isReadOnly}/></td><td><button onClick=${()=>deleteRow('opRevenues',i)}><${Trash2} size=${12}/></button></td></tr>`)}</tbody></table><button onClick=${()=>addRow('opRevenues')} class=${btnStyle}><${Plus} size=${12}/> Revenue Row</button><div class="flex justify-between font-semibold"><span>Total Operating Revenues</span><input type="text" class="w-24 text-right" value=${data?.totalOpRevenues} onChange=${(e)=>updateData({totalOpRevenues:e.target.value})} disabled=${isReadOnly}/></div></div>
                <div className="mb-4"><div className="font-bold mb-1">Operating Expenses</div><table className="w-full"><tbody>${opExpenses.map((r,i)=>html`<tr key=${i}><td className="pl-4"><input type="text" className="w-full bg-transparent" value=${r.label} onChange=${(e)=>handleArrChange('opExpenses',i,'label',e.target.value)} disabled=${isReadOnly} placeholder="[Operating Expense Account]"/></td><td className="w-24"><input type="text" className="w-full text-right bg-transparent border-b" value=${r.amount} onChange=${(e)=>handleArrChange('opExpenses',i,'amount',e.target.value)} disabled=${isReadOnly}/></td><td><button onClick=${()=>deleteRow('opExpenses',i)}><${Trash2} size=${12}/></button></td></tr>`)}</tbody></table><button onClick=${()=>addRow('opExpenses')} class=${btnStyle}><${Plus} size=${12}/> Expense Row</button><div class="flex justify-between font-semibold"><span>Total Operating Expenses</span><input type="text" class="w-24 text-right" value=${data?.totalOpExpenses} onChange=${(e)=>updateData({totalOpExpenses:e.target.value})} disabled=${isReadOnly}/></div></div>
                <div className="flex justify-between items-center border-t border-b border-gray-300 py-1 font-semibold bg-gray-50 mb-4"><span className="">Net Operating Income (Loss)</span><input type="text" className="w-24 text-right outline-none bg-transparent pr-7" value=${data?.netOpIncome || ''} onChange=${(e)=>updateData({ netOpIncome: e.target.value })} disabled=${isReadOnly}/></div>
                <div className="mb-4"><div className="font-bold mb-1">Non-Operating Income and Expenses</div><table className="w-full"><tbody>${nonOpItems.map((r,i)=>html`<tr key=${i}><td className="pl-4"><input type="text" className="w-full bg-transparent" value=${r.label} onChange=${(e)=>handleArrChange('nonOpItems',i,'label',e.target.value)} disabled=${isReadOnly} placeholder="[Non-Operating Account]"/></td><td className="w-24"><input type="text" className="w-full text-right bg-transparent border-b" value=${r.amount} onChange=${(e)=>handleArrChange('nonOpItems',i,'amount',e.target.value)} disabled=${isReadOnly}/></td><td><button onClick=${()=>deleteRow('nonOpItems',i)}><${Trash2} size=${12}/></button></td></tr>`)}</tbody></table><button onClick=${()=>addRow('nonOpItems')} class=${btnStyle}><${Plus} size=${12}/> Non-Operating Row</button><div class="flex justify-between font-semibold"><span>Net Non-operating Income (Loss)</span><input type="text" class="w-24 text-right" value=${data?.netNonOpIncome} onChange=${(e)=>updateData({netNonOpIncome:e.target.value})} disabled=${isReadOnly}/></div></div>
                <div className="space-y-1 mt-4 border-t-2 border-gray-400 pt-2"><div className="flex justify-between items-center py-1 font-medium"><span className="">Net Income (Loss) before taxes</span><input type="text" className=${inputClass(showFeedback && !checkField(data?.netIncomeBeforeTax, expNI))} value=${data?.netIncomeBeforeTax || ''} onChange=${(e)=>updateData({ netIncomeBeforeTax: e.target.value })} disabled=${isReadOnly}/></div><div className="flex justify-between items-center py-1"><span className="pl-4">Less: Income Tax</span><input type="text" className=${inputClass(false)} value=${data?.incomeTax || ''} onChange=${(e)=>updateData({ incomeTax: e.target.value })} disabled=${isReadOnly}/></div><div className="flex justify-between items-center py-2 font-bold text-blue-900 bg-gray-50 border-t-2 border-black border-double border-b-4"><span className="">Net Income (Loss) after taxes</span><input type="text" className=${inputClass(showFeedback && !checkField(data?.netIncomeAfterTax, expNI))} value=${data?.netIncomeAfterTax || ''} onChange=${(e)=>updateData({ netIncomeAfterTax: e.target.value })} disabled=${isReadOnly}/></div></div>
            </div>
        </div>
    `;
};


// --------------------------------------------------------
// MERCHANDISING / MANUFACTURING COMPONENTS
// --------------------------------------------------------

const MerchPeriodicIS = ({ data, onChange, isReadOnly, showFeedback, calculatedTotals, type = "Single" }) => {
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
        ${showInput ? html`<input type="text" className=${inputClass(showFeedback && !checkField(data?.[valueKey], expected, isDeduction))} value=${data?.[valueKey] || ''} onChange=${(e)=>handleAmountChange(valueKey, e.target.value)} disabled=${isReadOnly} placeholder=${placeholder}/>` : ''}
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
    
    const btnStyle = "ml-4 mb-1 text-xs text-blue-900 font-medium flex items-center gap-1 hover:text-blue-700 transition-colors cursor-pointer";

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
                ${renderRow('GROSS INCOME', 'grossIncome', expGross, false, 'pl-0 font-extrabold text-sm')}

                ${type === 'Single' ? html`
                    <div className="mt-4 font-bold text-gray-800">Other Operating & Non-Operating Income</div>
                    <table className="w-full mb-1"><tbody>${(data.otherIncome||[{label:'',amount:''}]).map((r,i)=>html`<tr key=${i}><td className="p-1 pl-4"><input type="text" className="w-full bg-transparent" placeholder="[Other operating / non-operating income]" value=${r.label} onChange=${(e)=>handleArrChange('otherIncome',i,'label',e.target.value)} disabled=${isReadOnly}/></td><td className="w-24"><input type="text" className="w-full text-right bg-transparent border-b" value=${r.amount} onChange=${(e)=>handleArrAmountChange('otherIncome',i,e.target.value)} disabled=${isReadOnly}/></td><td><button onClick=${()=>deleteRow('otherIncome',i)}><${Trash2} size=${12}/></button></td></tr>`)}</tbody></table><button onClick=${()=>addRow('otherIncome')} class=${btnStyle}><${Plus} size=${12}/> Revenue Row</button>
                    ${renderRow('Total Revenues', 'totalRevenues', expGross, false, 'pl-0 font-bold')}

                    <div className="mt-4 font-bold text-gray-800">Expenses</div>
                    <table className="w-full mb-1"><tbody>${expenseRows.map((r,i)=>html`<tr key=${i}><td className="p-1 pl-4"><input type="text" className="w-full bg-transparent" placeholder="[Operating / Non-operating Expense Account]" value=${r.label} onChange=${(e)=>handleArrChange('expenses',i,'label',e.target.value)} disabled=${isReadOnly}/></td><td className="w-24"><input type="text" className="w-full text-right bg-transparent border-b" value=${r.amount} onChange=${(e)=>handleArrAmountChange('expenses',i,e.target.value)} disabled=${isReadOnly}/></td><td><button onClick=${()=>deleteRow('expenses',i)}><${Trash2} size=${12}/></button></td></tr>`)}</tbody></table><button onClick=${()=>addRow('expenses')} class=${btnStyle}><${Plus} size=${12}/> Expense Row</button>
                    ${renderRow('Total Expenses', 'totalExpenses', expOpExp, false, 'pl-0 font-bold')}
                ` : html`
                    <div className="mt-4 font-bold text-gray-800">Operating Expenses</div>
                    <table className="w-full mb-1"><tbody>${opExpenseRows.map((r,i)=>html`<tr key=${i}><td className="p-1 pl-4"><input type="text" className="w-full bg-transparent" placeholder="[Operating Expense Account]" value=${r.label} onChange=${(e)=>handleArrChange('opExpenses',i,'label',e.target.value)} disabled=${isReadOnly}/></td><td className="w-24"><input type="text" className="w-full text-right bg-transparent border-b" value=${r.amount} onChange=${(e)=>handleArrAmountChange('opExpenses',i,e.target.value)} disabled=${isReadOnly}/></td><td><button onClick=${()=>deleteRow('opExpenses',i)}><${Trash2} size=${12}/></button></td></tr>`)}</tbody></table><button onClick=${()=>addRow('opExpenses')} class=${btnStyle}><${Plus} size=${12}/> Expense Row</button>
                    ${renderRow('Total Operating Expenses', 'totalOpExpenses', expOpExp, false, 'pl-4 font-semibold')}
                    ${renderRow('Net Operating Income (Loss)', 'netOpInc', expOpIncome, false, 'pl-0 font-bold')}
                    
                    <div className="mt-4 font-bold text-gray-800">Non-Operating Income and Expenses</div>
                    <table className="w-full mb-1"><tbody>${nonOpRows.map((r,i)=>html`<tr key=${i}><td className="p-1 pl-4"><input type="text" className="w-full bg-transparent" placeholder="[Non-Operating Expense Account]" value=${r.label} onChange=${(e)=>handleArrChange('nonOpItems',i,'label',e.target.value)} disabled=${isReadOnly}/></td><td className="w-24"><input type="text" className="w-full text-right bg-transparent border-b" value=${r.amount} onChange=${(e)=>handleArrAmountChange('nonOpItems',i,e.target.value)} disabled=${isReadOnly}/></td><td><button onClick=${()=>deleteRow('nonOpItems',i)}><${Trash2} size=${12}/></button></td></tr>`)}</tbody></table><button onClick=${()=>addRow('nonOpItems')} class=${btnStyle}><${Plus} size=${12}/> Non-Operating Row</button>
                    ${renderRow('Net Non-Operating Income (Loss)', 'netNonOp', expNonOp, false, 'pl-4')}
                `}

                <div className="mt-6 border-t-2 border-black pt-2">
                     ${renderRow('Net Income (Loss) before taxes', 'niBefore', expNI, false, 'pl-0 font-bold')}
                     ${renderRow('Income Tax', 'tax', 0, true, 'pl-4')}
                     <div className="border-b-4 border-double border-black mb-1"></div>
                     ${renderRow('Net Income (Loss) after taxes', 'niAfter', expNI, false, 'pl-0 font-extrabold text-black')}
                </div>
            </div>
        </div>
    `;
};

const MerchPerpetualIS = ({ data, onChange, isReadOnly, showFeedback, calculatedTotals, type = "Single" }) => {
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
        ${showInput ? html`<input type="text" className=${inputClass(showFeedback && !checkField(data?.[valueKey], expected, isDeduction))} value=${data?.[valueKey] || ''} onChange=${(e)=>handleAmountChange(valueKey, e.target.value)} disabled=${isReadOnly} placeholder=${placeholder}/>` : ''}
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

    const btnStyle = "ml-4 mb-1 text-xs text-blue-900 font-medium flex items-center gap-1 hover:text-blue-700 transition-colors cursor-pointer";

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
                ${renderRow('GROSS INCOME', 'grossIncome', expGross, false, 'pl-0 font-extrabold text-sm')}

                ${type === 'Single' ? html`
                    <div className="mt-4 font-bold text-gray-800">Other Operating & Non-Operating Income</div>
                    <table className="w-full mb-1"><tbody>${(otherIncomeRows).map((r,i)=>html`<tr key=${i}><td className="p-1 pl-4"><input type="text" className="w-full bg-transparent" placeholder="[Other operating / non-operating income]" value=${r.label} onChange=${(e)=>handleArrChange('otherIncome',i,'label',e.target.value)} disabled=${isReadOnly}/></td><td className="w-24"><input type="text" className="w-full text-right bg-transparent border-b" value=${r.amount} onChange=${(e)=>handleArrAmountChange('otherIncome',i,e.target.value)} disabled=${isReadOnly}/></td><td><button onClick=${()=>deleteRow('otherIncome',i)}><${Trash2} size=${12}/></button></td></tr>`)}</tbody></table><button onClick=${()=>addRow('otherIncome')} class=${btnStyle}><${Plus} size=${12}/> Revenue Row</button>
                    ${renderRow('Total Revenues', 'totalRevenues', expGross, false, 'pl-0 font-bold')}

                    <div className="mt-4 font-bold text-gray-800">Expenses</div>
                    <table className="w-full mb-1"><tbody>${expenseRows.map((r,i)=>html`<tr key=${i}><td className="p-1 pl-4"><input type="text" className="w-full bg-transparent" placeholder="[Operating / Non-operating Expense Account]" value=${r.label} onChange=${(e)=>handleArrChange('expenses',i,'label',e.target.value)} disabled=${isReadOnly}/></td><td className="w-24"><input type="text" className="w-full text-right bg-transparent border-b" value=${r.amount} onChange=${(e)=>handleArrAmountChange('expenses',i,e.target.value)} disabled=${isReadOnly}/></td><td><button onClick=${()=>deleteRow('expenses',i)}><${Trash2} size=${12}/></button></td></tr>`)}</tbody></table><button onClick=${()=>addRow('expenses')} class=${btnStyle}><${Plus} size=${12}/> Expense Row</button>
                    ${renderRow('Total Expenses', 'totalExpenses', expOpExp, false, 'pl-0 font-bold')}
                ` : html`
                    <div className="mt-4 font-bold text-gray-800">Less: Operating Expenses</div>
                    <table className="w-full mb-1"><tbody>${opExpenseRows.map((r,i)=>html`<tr key=${i}><td className="p-1 pl-4"><input type="text" className="w-full bg-transparent" placeholder="[Operating Expense Account]" value=${r.label} onChange=${(e)=>handleArrChange('opExpenses',i,'label',e.target.value)} disabled=${isReadOnly}/></td><td className="w-24"><input type="text" className="w-full text-right bg-transparent border-b" value=${r.amount} onChange=${(e)=>handleArrAmountChange('opExpenses',i,e.target.value)} disabled=${isReadOnly}/></td><td><button onClick=${()=>deleteRow('opExpenses',i)}><${Trash2} size=${12}/></button></td></tr>`)}</tbody></table><button onClick=${()=>addRow('opExpenses')} class=${btnStyle}><${Plus} size=${12}/> Expense Row</button>
                    ${renderRow('Total Operating Expenses', 'totalOpExpenses', expOpExp, false, 'pl-4 font-semibold')}
                    ${renderRow('Net Operating Income (Loss)', 'netOpInc', expOpIncome, false, 'pl-0 font-bold')}
                    
                    <div className="mt-4 font-bold text-gray-800">Non-Operating Income and Expenses</div>
                    <table className="w-full mb-1"><tbody>${nonOpRows.map((r,i)=>html`<tr key=${i}><td className="p-1 pl-4"><input type="text" className="w-full bg-transparent" placeholder="[Non-Operating Expense Account]" value=${r.label} onChange=${(e)=>handleArrChange('nonOpItems',i,'label',e.target.value)} disabled=${isReadOnly}/></td><td className="w-24"><input type="text" className="w-full text-right bg-transparent border-b" value=${r.amount} onChange=${(e)=>handleArrAmountChange('nonOpItems',i,e.target.value)} disabled=${isReadOnly}/></td><td><button onClick=${()=>deleteRow('nonOpItems',i)}><${Trash2} size=${12}/></button></td></tr>`)}</tbody></table><button onClick=${()=>addRow('nonOpItems')} class=${btnStyle}><${Plus} size=${12}/> Non-Operating Row</button>
                    ${renderRow('Net Non-Operating Income (Loss)', 'netNonOp', expNonOp, false, 'pl-4')}
                `}

                <div className="mt-6 border-t-2 border-black pt-2">
                     ${renderRow('Net Income (Loss) before taxes', 'niBefore', expNI, false, 'pl-0 font-bold')}
                     ${renderRow('Income Tax', 'tax', 0, true, 'pl-4')}
                     <div className="border-b-4 border-double border-black mb-1"></div>
                     ${renderRow('Net Income (Loss) after taxes', 'niAfter', expNI, false, 'pl-0 font-extrabold text-black')}
                </div>
            </div>
        </div>
    `;
};


// --- MAIN EXPORT ---

export default function Step6FinancialStatements({ ledgerData, adjustments, activityData, data, onChange, showFeedback, isReadOnly }) {
    const { fsFormat, includeCashFlows, businessType, inventorySystem } = activityData.config;
    const isMerch = businessType === 'Merchandising' || businessType === 'Manufacturing';
    const isPerpetual = inventorySystem === 'Perpetual';

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
    
    const handleFormChange = (formKey, key, val) => onChange(formKey, { ...(data[formKey] || {}), [key]: val });
    const handleSpecificFormChange = (formKey, newData) => onChange(formKey, newData);

    const renderIncomeStatement = () => {
        // Fix: Default empty data object if undefined to prevent crash
        const currentData = data.is || {};
        
        if (!isMerch) {
            // SERVICE BUSINESS
            if (fsFormat === 'Single') {
                return html`<${ServiceSingleStepIS} data=${currentData} onChange=${(d) => handleSpecificFormChange('is', d)} isReadOnly=${isReadOnly} showFeedback=${showFeedback} calculatedTotals=${calculatedTotals} />`;
            } else {
                return html`<${ServiceMultiStepIS} data=${currentData} onChange=${(d) => handleSpecificFormChange('is', d)} isReadOnly=${isReadOnly} showFeedback=${showFeedback} calculatedTotals=${calculatedTotals} />`;
            }
        } else {
            // MERCHANDISING BUSINESS
            if (isPerpetual) {
                return html`<${MerchPerpetualIS} type=${fsFormat} data=${currentData} onChange=${(d) => handleSpecificFormChange('is', d)} isReadOnly=${isReadOnly} showFeedback=${showFeedback} calculatedTotals=${calculatedTotals} />`;
            } else {
                return html`<${MerchPeriodicIS} type=${fsFormat} data=${currentData} onChange=${(d) => handleSpecificFormChange('is', d)} isReadOnly=${isReadOnly} showFeedback=${showFeedback} calculatedTotals=${calculatedTotals} />`;
            }
        }
    };

    return html`
        <div className="flex flex-col h-[calc(100vh-140px)]">
            <div className="h-1/2 overflow-hidden border-b-4 border-gray-300 pb-2 bg-white relative">
                <${WorksheetSourceView} ledgerData=${ledgerData} adjustments=${adjustments} />
            </div>
            <div className="h-1/2 overflow-hidden bg-gray-100 p-2">
                <div className="h-full w-full overflow-y-auto">
                    ${includeCashFlows 
                        ? html`
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-full min-h-[500px]">
                                <div className="flex flex-col gap-4 h-full">
                                    <div className="flex-1 flex flex-col h-1/2">
                                        ${renderIncomeStatement()}
                                    </div>
                                    <div className="flex-1 flex flex-col h-1/2">
                                        <${FinancialStatementForm} title="Statement of Changes in Equity" headerColor="bg-yellow-100" data=${data.sce} onChange=${(k, v) => handleFormChange('sce', k, v)} isReadOnly=${isReadOnly} />
                                    </div>
                                </div>
                                <div className="h-full">
                                    <${FinancialStatementForm} title="Balance Sheet" headerColor="bg-blue-100" data=${data.bs} onChange=${(k, v) => handleFormChange('bs', k, v)} isReadOnly=${isReadOnly} />
                                </div>
                                <div className="h-full">
                                    <${FinancialStatementForm} title="Statement of Cash Flows" headerColor="bg-indigo-100" data=${data.scf} onChange=${(k, v) => handleFormChange('scf', k, v)} isReadOnly=${isReadOnly} />
                                </div>
                            </div>
                        ` 
                        : html`
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-full min-h-[400px]">
                                <div className="h-full">
                                    ${renderIncomeStatement()}
                                </div>
                                <div className="h-full">
                                    <${FinancialStatementForm} title="Statement of Changes in Equity" headerColor="bg-yellow-100" data=${data.sce} onChange=${(k, v) => handleFormChange('sce', k, v)} isReadOnly=${isReadOnly} />
                                </div>
                                <div className="h-full">
                                    <${FinancialStatementForm} title="Balance Sheet" headerColor="bg-blue-100" data=${data.bs} onChange=${(k, v) => handleFormChange('bs', k, v)} isReadOnly=${isReadOnly} />
                                </div>
                            </div>
                        `
                    }
                </div>
            </div>
        </div>
    `;
}
