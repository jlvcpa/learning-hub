import React, { useState, useMemo, useEffect } from 'https://esm.sh/react@18.2.0';
import htm from 'https://esm.sh/htm';
import { Table, Trash2, Plus, List } from 'https://esm.sh/lucide-react@0.263.1';
import { sortAccounts, getAccountType } from '../utils.js';

const html = htm.bind(React.createElement);

// --- INTERNAL COMPONENTS ---

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

// Generic Form for Balance Sheet, Equity, Cash Flows, etc.
const FinancialStatementForm = ({ title, data, onChange, isReadOnly, headerColor = "bg-gray-100" }) => {
    const rows = data?.rows || [{ label: '', amount: '' }, { label: '', amount: '' }];
    
    const updateRow = (idx, field, val) => {
        const newRows = [...rows];
        newRows[idx] = { ...newRows[idx], [field]: val };
        onChange('rows', newRows);
    };
    const addRow = () => onChange('rows', [...rows, { label: '', amount: '' }]);
    const deleteRow = (idx) => {
        if (rows.length <= 1) return;
        onChange('rows', rows.filter((_, i) => i !== idx));
    };

    return html`
        <div className="border rounded bg-white flex flex-col h-full shadow-sm">
            <div className=${`${headerColor} p-2 font-bold text-gray-800 border-b text-center text-sm`}>${title}</div>
            <div className="p-2 overflow-y-auto flex-1">
                <table className="w-full text-xs">
                    <thead><tr><th className="text-left p-1">Particulars</th><th className="text-right p-1 w-24">Amount</th><th className="w-6"></th></tr></thead>
                    <tbody>
                        ${rows.map((r, i) => html`
                            <tr key=${i} className="border-b border-gray-100">
                                <td className="p-1"><input type="text" className="w-full outline-none bg-transparent font-medium" placeholder="..." value=${r.label} onChange=${(e)=>updateRow(i, 'label', e.target.value)} disabled=${isReadOnly}/></td>
                                <td className="p-1"><input type="number" className="w-full text-right outline-none bg-transparent" placeholder="0" value=${r.amount} onChange=${(e)=>updateRow(i, 'amount', e.target.value)} disabled=${isReadOnly}/></td>
                                <td className="p-1 text-center">${!isReadOnly && html`<button onClick=${()=>deleteRow(i)} className="text-gray-400 hover:text-red-500"><${Trash2} size=${12}/></button>`}</td>
                            </tr>
                        `)}
                    </tbody>
                </table>
                ${!isReadOnly && html`<button onClick=${addRow} className="mt-2 text-xs text-blue-600 flex items-center gap-1 hover:underline"><${Plus} size=${12}/> Add Line</button>`}
            </div>
        </div>
    `;
};

// Specialized Single-Step Income Statement for Service Business
const ServiceSingleStepIS = ({ data, onChange, isReadOnly }) => {
    // Initialize structure if empty
    const revenues = data?.revenues || [{ label: '', amount: '' }];
    const expenses = data?.expenses || [{ label: '', amount: '' }];
    
    const updateData = (updates) => {
        onChange({ ...data, ...updates });
    };

    const handleArrChange = (key, idx, field, val) => {
        const arr = [...(key === 'revenues' ? revenues : expenses)];
        arr[idx] = { ...arr[idx], [field]: val };
        updateData({ [key]: arr });
    };

    const addRow = (key) => {
        const arr = [...(key === 'revenues' ? revenues : expenses)];
        updateData({ [key]: [...arr, { label: '', amount: '' }] });
    };

    const deleteRow = (key, idx) => {
        const arr = [...(key === 'revenues' ? revenues : expenses)];
        if (arr.length <= 1) return;
        updateData({ [key]: arr.filter((_, i) => i !== idx) });
    };

    return html`
        <div className="border rounded bg-white flex flex-col h-full shadow-sm">
            <div className="bg-green-100 p-2 font-bold text-gray-800 border-b text-center text-sm">Income Statement (Single-Step)</div>
            <div className="p-2 overflow-y-auto flex-1 text-xs">
                
                <!-- Revenues Section -->
                <div className="mb-4">
                    <div className="font-bold mb-1 ml-1 text-gray-700">Revenues</div>
                    <table className="w-full">
                        <tbody>
                            ${revenues.map((r, i) => html`
                                <tr key=${i} className="border-b border-gray-100">
                                    <td className="p-1"><input type="text" className="w-full outline-none bg-transparent" placeholder="Revenue Account..." value=${r.label} onChange=${(e)=>handleArrChange('revenues', i, 'label', e.target.value)} disabled=${isReadOnly}/></td>
                                    <td className="p-1 w-24"><input type="number" className="w-full text-right outline-none bg-transparent" placeholder="0.00" value=${r.amount} onChange=${(e)=>handleArrChange('revenues', i, 'amount', e.target.value)} disabled=${isReadOnly}/></td>
                                    <td className="p-1 w-6 text-center">${!isReadOnly && html`<button onClick=${()=>deleteRow('revenues', i)} className="text-gray-400 hover:text-red-500"><${Trash2} size=${12}/></button>`}</td>
                                </tr>
                            `)}
                        </tbody>
                    </table>
                    ${!isReadOnly && html`<button onClick=${() => addRow('revenues')} className="mt-1 mb-2 text-xs bg-blue-600 text-white px-2 py-1 rounded flex items-center gap-1 hover:bg-blue-700 font-medium">Add Revenue Row</button>`}
                    
                    <div className="flex justify-between items-center border-t border-b border-gray-300 py-1 font-bold mt-1">
                        <span className="pl-1">Total Revenues</span>
                        <input type="number" className="w-24 text-right outline-none bg-transparent pr-7" placeholder="0.00" value=${data?.totalRevenues || ''} onChange=${(e)=>updateData({ totalRevenues: e.target.value })} disabled=${isReadOnly}/>
                    </div>
                </div>

                <!-- Expenses Section -->
                <div className="mb-4">
                    <div className="font-bold mb-1 ml-1 text-gray-700">Expenses</div>
                    <table className="w-full">
                        <tbody>
                            ${expenses.map((r, i) => html`
                                <tr key=${i} className="border-b border-gray-100">
                                    <td className="p-1"><input type="text" className="w-full outline-none bg-transparent" placeholder="Expense Account..." value=${r.label} onChange=${(e)=>handleArrChange('expenses', i, 'label', e.target.value)} disabled=${isReadOnly}/></td>
                                    <td className="p-1 w-24"><input type="number" className="w-full text-right outline-none bg-transparent" placeholder="0.00" value=${r.amount} onChange=${(e)=>handleArrChange('expenses', i, 'amount', e.target.value)} disabled=${isReadOnly}/></td>
                                    <td className="p-1 w-6 text-center">${!isReadOnly && html`<button onClick=${()=>deleteRow('expenses', i)} className="text-gray-400 hover:text-red-500"><${Trash2} size=${12}/></button>`}</td>
                                </tr>
                            `)}
                        </tbody>
                    </table>
                    ${!isReadOnly && html`<button onClick=${() => addRow('expenses')} className="mt-1 mb-2 text-xs bg-blue-600 text-white px-2 py-1 rounded flex items-center gap-1 hover:bg-blue-700 font-medium">Add Expense Row</button>`}
                    
                    <div className="flex justify-between items-center border-t border-b border-gray-300 py-1 font-bold mt-1">
                        <span className="pl-1">Total Expenses</span>
                        <input type="number" className="w-24 text-right outline-none bg-transparent pr-7" placeholder="0.00" value=${data?.totalExpenses || ''} onChange=${(e)=>updateData({ totalExpenses: e.target.value })} disabled=${isReadOnly}/>
                    </div>
                </div>

                <!-- Totals Section -->
                <div className="space-y-1 mt-2">
                    <div className="flex justify-between items-center border-b border-gray-200 py-1">
                        <span className="pl-1">Net Income (Loss) before taxes</span>
                        <input type="number" className="w-24 text-right outline-none bg-transparent pr-7" placeholder="0.00" value=${data?.netIncomeBeforeTax || ''} onChange=${(e)=>updateData({ netIncomeBeforeTax: e.target.value })} disabled=${isReadOnly}/>
                    </div>
                    <div className="flex justify-between items-center border-b border-gray-200 py-1">
                        <span className="pl-1">Less: Income Tax</span>
                        <input type="number" className="w-24 text-right outline-none bg-transparent pr-7" placeholder="0.00" value=${data?.incomeTax || ''} onChange=${(e)=>updateData({ incomeTax: e.target.value })} disabled=${isReadOnly}/>
                    </div>
                    <div className="flex justify-between items-center border-b-2 border-double border-gray-400 py-1 font-bold text-blue-900 bg-gray-50">
                        <span className="pl-1">Net Income (Loss) after taxes</span>
                        <input type="number" className="w-24 text-right outline-none bg-transparent pr-7" placeholder="0.00" value=${data?.netIncomeAfterTax || ''} onChange=${(e)=>updateData({ netIncomeAfterTax: e.target.value })} disabled=${isReadOnly}/>
                    </div>
                </div>

            </div>
        </div>
    `;
};

// --- MAIN EXPORT ---

export default function Step6FinancialStatements({ ledgerData, adjustments, activityData, data, onChange, showFeedback, isReadOnly }) {
    const { fsFormat, includeCashFlows, businessType } = activityData.config;
    const isMerch = businessType === 'Merchandising' || businessType === 'Manufacturing';
    
    // Auto-populate Income Statement structure if empty AND NOT using the special Service Single-Step
    useEffect(() => {
        // Skip auto-population if using the specialized component (Service Single Step) as it manages its own state structure
        if (!isMerch && fsFormat === 'Single') return;

        if (!data.is || !data.is.rows || data.is.rows.length <= 2) {
            let template = [];
            
            if (!isMerch) {
                // SERVICE Multi-Step
                if (fsFormat === 'Multi') {
                    template = [
                        { label: 'Service Revenue', amount: '' },
                        { label: 'Operating Expenses', amount: '' },
                        { label: 'Operating Income', amount: '' },
                        { label: 'Non-Operating Items', amount: '' },
                        { label: 'Net Income', amount: '' }
                    ];
                }
            } else {
                // MERCHANDISING
                if (fsFormat === 'Single') {
                    template = [
                        { label: 'Net Sales', amount: '' },
                        { label: 'Cost of Goods Sold', amount: '' },
                        { label: 'Gross Profit', amount: '' },
                        { label: 'Total Expenses', amount: '' },
                        { label: 'Net Income', amount: '' }
                    ];
                } else {
                    // Multi-Step Merchandising
                    template = [
                        { label: 'Net Sales', amount: '' },
                        { label: 'Cost of Goods Sold', amount: '' },
                        { label: 'Gross Profit', amount: '' },
                        { label: 'Operating Expenses', amount: '' },
                        { label: 'Operating Income', amount: '' },
                        { label: 'Non-Operating Income/Exp', amount: '' },
                        { label: 'Net Income', amount: '' }
                    ];
                }
            }
            if (template.length > 0 && !data.is?.rows) {
                 onChange('is', { rows: template });
            }
        }
    }, [fsFormat, isMerch, data.is]);

    const handleFormChange = (formKey, key, val) => onChange(formKey, { ...(data[formKey] || {}), [key]: val });
    const handleSpecificFormChange = (formKey, newData) => onChange(formKey, newData); // For replacing entire object

    return html`
        <div className="flex flex-col h-[calc(100vh-140px)]">
            <!-- TOP PANEL: Source Worksheet -->
            <div className="h-1/2 overflow-hidden border-b-4 border-gray-300 pb-2 bg-white relative">
                <${WorksheetSourceView} ledgerData=${ledgerData} adjustments=${adjustments} />
            </div>
            
            <!-- BOTTOM PANEL: Financial Statements Workspace -->
            <div className="h-1/2 overflow-hidden bg-gray-100 p-2">
                <div className="h-full w-full overflow-y-auto">
                    
                    ${includeCashFlows 
                        ? html`
                            <!-- LAYOUT WITH CASH FLOWS (3 Cols: [IS, Equity] | [BS] | [SCF]) -->
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-full min-h-[500px]">
                                <!-- Col 1: Income Statement & Equity (Stacked) -->
                                <div className="flex flex-col gap-4 h-full">
                                    <div className="flex-1 flex flex-col h-1/2">
                                        ${!isMerch && fsFormat === 'Single' 
                                            ? html`<${ServiceSingleStepIS} data=${data.is} onChange=${(d) => handleSpecificFormChange('is', d)} isReadOnly=${isReadOnly} />`
                                            : html`<${FinancialStatementForm} title="Income Statement" headerColor="bg-green-100" data=${data.is} onChange=${(k, v) => handleFormChange('is', k, v)} isReadOnly=${isReadOnly} />`
                                        }
                                    </div>
                                    <div className="flex-1 flex flex-col h-1/2">
                                        <${FinancialStatementForm} title="Statement of Changes in Equity" headerColor="bg-yellow-100" data=${data.sce} onChange=${(k, v) => handleFormChange('sce', k, v)} isReadOnly=${isReadOnly} />
                                    </div>
                                </div>
                                
                                <!-- Col 2: Balance Sheet -->
                                <div className="h-full">
                                    <${FinancialStatementForm} title="Balance Sheet" headerColor="bg-blue-100" data=${data.bs} onChange=${(k, v) => handleFormChange('bs', k, v)} isReadOnly=${isReadOnly} />
                                </div>
                                
                                <!-- Col 3: Cash Flows -->
                                <div className="h-full">
                                    <${FinancialStatementForm} title="Statement of Cash Flows" headerColor="bg-indigo-100" data=${data.scf} onChange=${(k, v) => handleFormChange('scf', k, v)} isReadOnly=${isReadOnly} />
                                </div>
                            </div>
                        ` 
                        : html`
                            <!-- STANDARD LAYOUT (3 Cols: IS | Equity | BS) -->
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-full min-h-[400px]">
                                <div className="h-full">
                                    ${!isMerch && fsFormat === 'Single' 
                                        ? html`<${ServiceSingleStepIS} data=${data.is} onChange=${(d) => handleSpecificFormChange('is', d)} isReadOnly=${isReadOnly} />`
                                        : html`<${FinancialStatementForm} title="Income Statement" headerColor="bg-green-100" data=${data.is} onChange=${(k, v) => handleFormChange('is', k, v)} isReadOnly=${isReadOnly} />`
                                    }
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
