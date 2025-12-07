import React, { useState } from 'https://esm.sh/react@18.2.0';
import htm from 'https://esm.sh/htm';
import { Book, Check, X, ChevronDown, ChevronRight, Table, Trash2, Plus } from 'https://esm.sh/lucide-react@0.263.1';
import { sortAccounts } from '../utils.js';

const html = htm.bind(React.createElement);

// --- INTERNAL COMPONENTS ---

const StatusIcon = ({ correct, show }) => {
    if (!show) return null;
    return correct 
        ? html`<${Check} size=${14} className="text-green-600 inline ml-1" />` 
        : html`<${X} size=${14} className="text-red-600 inline ml-1" />`;
};

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
                        const rowsL = [];
                        const rowsR = [];
                        
                        // Push Year Row First
                        rowsL.push({ date: '2023', part: '', pr: '', amount: null, isYear: true });
                        rowsR.push({ date: '2023', part: '', pr: '', amount: null, isYear: true });
                        
                        let bbDr = 0;
                        let bbCr = 0;
                        if (isSubsequentYear && beginningBalances && beginningBalances.balances[acc]) {
                            const b = beginningBalances.balances[acc];
                            if (b.dr > 0) {
                                rowsL.push({ date: 'Jan 01', part: 'BB', pr: '✓', amount: b.dr });
                                bbDr = b.dr;
                            }
                            if (b.cr > 0) {
                                rowsR.push({ date: 'Jan 01', part: 'BB', pr: '✓', amount: b.cr });
                                bbCr = b.cr;
                            }
                        }

                        let lastMonthL = '';
                        let lastMonthR = '';

                        if (bbDr > 0) lastMonthL = 'Jan';
                        if (bbCr > 0) lastMonthR = 'Jan';

                        transactions.forEach(t => {
                            const dateObj = new Date(t.date);
                            const mmm = dateObj.toLocaleString('default', { month: 'short' });
                            const dd = dateObj.getDate().toString().padStart(2, '0');
                            const dateStrFull = `${mmm} ${dd}`;

                            t.debits.forEach(d => {
                                if (d.account === acc) {
                                    let displayDate = dd;
                                    const isFirstEntry = rowsL.length === 1; 
                                    
                                    if (isFirstEntry || lastMonthL !== mmm) {
                                        displayDate = dateStrFull;
                                    }
                                    
                                    rowsL.push({ date: displayDate, part: 'GJ', pr: '1', amount: d.amount });
                                    lastMonthL = mmm;
                                }
                            });
                            t.credits.forEach(c => {
                                if (c.account === acc) {
                                    let displayDate = dd;
                                    const isFirstEntry = rowsR.length === 1;
                                    
                                    if (isFirstEntry || lastMonthR !== mmm) {
                                        displayDate = dateStrFull;
                                    }

                                    rowsR.push({ date: displayDate, part: 'GJ', pr: '1', amount: c.amount });
                                    lastMonthR = mmm;
                                }
                            });
                        });

                        const totalDr = rowsL.reduce((sum, r) => sum + (r.amount || 0), 0);
                        const totalCr = rowsR.reduce((sum, r) => sum + (r.amount || 0), 0);
                        const net = totalDr - totalCr;
                        const balance = Math.abs(net);
                        const balanceType = net >= 0 ? 'Dr' : 'Cr';

                        const maxCount = Math.max(rowsL.length, rowsR.length, 4);
                        const displayRows = Array.from({ length: maxCount }).map((_, i) => i);

                        return html`
                            <div key=${acc} className="border-y-2 border-gray-800 bg-white shadow-md">
                                <div className="border-b-2 border-gray-800 p-2 bg-gray-100 font-bold text-center text-lg text-gray-800">
                                    ${acc}
                                </div>
                                <div className="flex">
                                    <div className="flex-1 border-r-2 border-gray-800">
                                        <div className="text-center font-bold border-b border-gray-400 bg-gray-50 text-xs py-1">DEBIT</div>
                                        <div className="flex text-xs font-bold border-b border-gray-400 bg-white">
                                            <div className="w-16 border-r p-1 text-center flex-shrink-0">Date</div>
                                            <div className="flex-1 border-r p-1 text-center">Particulars</div>
                                            <div className="w-10 border-r p-1 text-center flex-shrink-0">PR</div>
                                            <div className="w-20 p-1 text-center flex-shrink-0">Amount</div>
                                        </div>
                                        ${displayRows.map(i => {
                                            const r = rowsL[i] || {};
                                            return html`
                                                <div className="flex text-xs border-b border-gray-200 h-6 items-center">
                                                    <div className="w-16 border-r text-right px-1 text-gray-600 whitespace-nowrap flex-shrink-0">${r.date || ''}</div>
                                                    <div className="flex-1 border-r px-1 truncate text-gray-800">${r.part || ''}</div>
                                                    <div className="w-10 border-r text-center text-gray-500 flex-shrink-0">${r.pr || ''}</div>
                                                    <div className="w-20 text-right px-1 text-gray-800 flex-shrink-0">${r.amount ? r.amount.toLocaleString() : ''}</div>
                                                </div>
                                            `;
                                        })}
                                        <div className="border-t-2 border-gray-800 p-1 flex justify-between items-center bg-gray-50 text-xs font-bold">
                                            <span>Total</span>
                                            <span>${totalDr.toLocaleString()}</span>
                                        </div>
                                    </div>

                                    <div className="flex-1">
                                        <div className="text-center font-bold border-b border-gray-400 bg-gray-50 text-xs py-1">CREDIT</div>
                                        <div className="flex text-xs font-bold border-b border-gray-400 bg-white">
                                            <div className="w-16 border-r p-1 text-center flex-shrink-0">Date</div>
                                            <div className="flex-1 border-r p-1 text-center">Particulars</div>
                                            <div className="w-10 border-r p-1 text-center flex-shrink-0">PR</div>
                                            <div className="w-20 p-1 text-center flex-shrink-0">Amount</div>
                                        </div>
                                        ${displayRows.map(i => {
                                            const r = rowsR[i] || {};
                                            return html`
                                                <div className="flex text-xs border-b border-gray-200 h-6 items-center">
                                                    <div className="w-16 border-r text-right px-1 text-gray-600 whitespace-nowrap flex-shrink-0">${r.date || ''}</div>
                                                    <div className="flex-1 border-r px-1 truncate text-gray-800">${r.part || ''}</div>
                                                    <div className="w-10 border-r text-center text-gray-500 flex-shrink-0">${r.pr || ''}</div>
                                                    <div className="w-20 text-right px-1 text-gray-800 flex-shrink-0">${r.amount ? r.amount.toLocaleString() : ''}</div>
                                                </div>
                                            `;
                                        })}
                                        <div className="border-t-2 border-gray-800 p-1 flex justify-between items-center bg-gray-50 text-xs font-bold">
                                            <span>Total</span>
                                            <span className="mr-1">${totalCr.toLocaleString()}</span>
                                        </div>
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

const TrialBalanceForm = ({ data, onChange, showFeedback, isReadOnly, expectedLedger }) => {
    const rows = data.rows || [{ account: '', dr: '', cr: '' }, { account: '', dr: '', cr: '' }, { account: '', dr: '', cr: '' }];
    
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

    const getRowFeedback = (row) => {
        if (!showFeedback) return { acc: '', dr: '', cr: '' };
        const accName = row.account.trim();
        if (!accName) return { acc: '', dr: '', cr: '' };
        const key = Object.keys(expectedLedger).find(k => k.toLowerCase() === accName.toLowerCase());
        if (!key) return { acc: 'bg-red-100', dr: 'bg-red-100', cr: 'bg-red-100' };
        
        const expNet = expectedLedger[key].debit - expectedLedger[key].credit;
        const expDr = expNet > 0 ? expNet : 0;
        const expCr = expNet < 0 ? Math.abs(expNet) : 0;
        const usrDr = Number(row.dr) || 0;
        const usrCr = Number(row.cr) || 0;

        return {
            acc: 'text-green-600 font-bold',
            dr: Math.abs(usrDr - expDr) <= 1 ? (expDr > 0 ? 'text-green-600' : '') : 'text-red-600 font-bold',
            cr: Math.abs(usrCr - expCr) <= 1 ? (expCr > 0 ? 'text-green-600' : '') : 'text-red-600 font-bold'
        };
    };

    return html`
        <div>
            <table className="w-full text-sm border-collapse">
                <thead className="bg-gray-100 sticky top-0">
                    <tr>
                        <th className="p-2 border text-left">Account Title</th>
                        <th className="p-2 border w-24 text-right">Debit</th>
                        <th className="p-2 border w-24 text-right">Credit</th>
                        <th className="p-2 border w-8"></th>
                    </tr>
                </thead>
                <tbody>
                    ${rows.map((row, idx) => {
                        const styles = getRowFeedback(row);
                        return html`
                            <tr key=${idx} className="border-b">
                                <td className="p-1 border">
                                    <input type="text" className=${`w-full outline-none ${styles.acc}`} value=${row.account} onChange=${(e)=>updateRow(idx, 'account', e.target.value)} disabled=${isReadOnly} placeholder="Account Name" />
                                </td>
                                <td className="p-1 border">
                                    <input type="number" className=${`w-full text-right outline-none ${styles.dr}`} value=${row.dr} onChange=${(e)=>updateRow(idx, 'dr', e.target.value)} disabled=${isReadOnly} />
                                </td>
                                <td className="p-1 border">
                                    <input type="number" className=${`w-full text-right outline-none ${styles.cr}`} value=${row.cr} onChange=${(e)=>updateRow(idx, 'cr', e.target.value)} disabled=${isReadOnly} />
                                </td>
                                <td className="p-1 border text-center">
                                    ${!isReadOnly && html`<button onClick=${() => deleteRow(idx)} className="text-gray-400 hover:text-red-600"><${Trash2} size=${14}/></button>`}
                                </td>
                            </tr>
                        `;
                    })}
                </tbody>
                <tfoot className="bg-gray-100 font-bold">
                    <tr>
                        <td className="p-2 text-right">Total</td>
                        <td className="p-2 text-right">${totalDr.toLocaleString()}</td>
                        <td className="p-2 text-right">${totalCr.toLocaleString()}</td>
                        <td></td>
                    </tr>
                </tfoot>
            </table>
            ${!isReadOnly && html`<button onClick=${addRow} className="mt-2 text-xs flex items-center gap-1 text-blue-600 hover:underline"><${Plus} size=${12}/> Add Row</button>`}
        </div>
    `;
};

// --- MAIN EXPORT ---

export default function Step4TrialBalance({ transactions, validAccounts, beginningBalances, isSubsequentYear, data, onChange, showFeedback, isReadOnly, expectedLedger }) {
    return html`
        <div className="flex flex-col lg:flex-row gap-4 h-[36rem]">
            <div className="lg:w-1/2 h-full">
                 <${LedgerSourceView} transactions=${transactions} validAccounts=${validAccounts} beginningBalances=${beginningBalances} isSubsequentYear=${isSubsequentYear} /> 
            </div>
            <div className="lg:w-1/2 border rounded bg-white flex flex-col shadow-sm overflow-hidden">
                <div className="bg-green-100 p-2 font-bold text-green-900"><${Table} size=${16} className="inline mr-2"/>Trial Balance</div>
                <div className="p-2 overflow-y-auto custom-scrollbar flex-1">
                     <${TrialBalanceForm} data=${data} onChange=${onChange} showFeedback=${showFeedback} isReadOnly=${isReadOnly} expectedLedger=${expectedLedger} />
                </div>
            </div>
        </div>
    `;
}
