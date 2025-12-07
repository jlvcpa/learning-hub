import React from 'https://esm.sh/react@18.2.0';
import htm from 'https://esm.sh/htm';
import { Plus } from 'https://esm.sh/lucide-react@0.263.1';
import { JournalSourceView, LedgerAccount } from '../components.js';

const html = htm.bind(React.createElement);

export default function Step3Posting({ data, onChange, showFeedback, validAccounts, ledgerKey, transactions, beginningBalances, isReadOnly, journalPRs, onTogglePR, matchedJournalEntries }) {
    const ledgers = data.ledgers || [{ id: 1, account: '', leftRows: [{}], rightRows: [{}] }];
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
        <div className="flex flex-col lg:flex-row gap-4 h-full">
            <div className="lg:w-5/12 h-full"><${JournalSourceView} transactions=${transactions} journalPRs=${journalPRs} onTogglePR=${onTogglePR} showFeedback=${showFeedback} matchedJournalEntries=${matchedJournalEntries} isReadOnly=${isReadOnly}/></div>
            <div className="lg:w-7/12 border rounded bg-white h-[36rem] flex flex-col">
                <div className="bg-blue-100 p-2 font-bold text-blue-900">General Ledger</div>
                <div className="p-4 overflow-y-auto custom-scrollbar flex-1">
                    <div className="flex flex-col gap-8 pb-4">
                        ${ledgers.map((l, idx) => html`<${LedgerAccount} key=${l.id} l=${l} idx=${idx} ledgerKey=${ledgerKey} updateLedger=${updateLedger} updateSideRow=${updateSideRow} addRow=${addRow} deleteLedger=${deleteLedger} isReadOnly=${isReadOnly} showFeedback=${showFeedback} />`)}
                    </div>
                    ${!isReadOnly && html`<button onClick=${()=>onChange('ledgers', [...ledgers, { id: Date.now(), account: '', leftRows:[{},{},{},{}], rightRows:[{},{},{},{}] }])} className="mt-8 w-full py-3 border-2 border-dashed border-gray-400 text-gray-500 hover:border-blue-400 flex justify-center items-center gap-2 font-bold bg-gray-50"><${Plus} size=${20}/> Add New Account Ledger</button>`}
                </div>
            </div>
        </div>
    `;
}
