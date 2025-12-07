import React from 'https://esm.sh/react@18.2.0';
import htm from 'https://esm.sh/htm';
import { Table, Trash2, Plus } from 'https://esm.sh/lucide-react@0.263.1';
import { LedgerSourceView } from '../components.js';

const html = htm.bind(React.createElement);

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
