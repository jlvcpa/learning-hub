import React, { useState, useMemo } from 'https://esm.sh/react@18.2.0';
import htm from 'https://esm.sh/htm';
import { Book, Check, X, ChevronDown, ChevronRight, AlertCircle } from 'https://esm.sh/lucide-react@0.263.1';
import { getAccountType, sortAccounts } from '../utils.js';

const html = htm.bind(React.createElement);

// --- INTERNAL COMPONENTS ---

const StatusIcon = ({ correct, show }) => {
    if (!show) return null;
    return correct 
        ? html`<${Check} size=${14} className="text-green-600 inline ml-1" />` 
        : html`<${X} size=${14} className="text-red-600 inline ml-1" />`;
};

// --- LEFT PANEL: HISTORICAL JOURNAL VIEW ---
const HistoricalJournalView = ({ entries }) => {
    const [expanded, setExpanded] = useState(true);
    
    return html`
        <div className="mb-4 border rounded bg-white overflow-hidden shadow-sm flex flex-col h-full">
            <div className="bg-gray-100 p-2 font-bold text-gray-700 cursor-pointer flex justify-between items-center flex-shrink-0" onClick=${()=>setExpanded(!expanded)}>
                <div className="flex items-center">
                    <${Book} size=${16} className="inline mr-2 w-4 h-4"/>
                    <span>Historical General Journal (Dec 31)</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-normal">
                    ${expanded ? html`<${ChevronDown} size={16} className="w-4 h-4"/>` : html`<${ChevronRight} size={16} className="w-4 h-4"/>`}
                </div>
            </div>
            ${expanded && html`
                <div className="flex flex-col flex-1 overflow-hidden border-t border-gray-200">
                    <div className="flex bg-gray-50 text-gray-700 border-b border-gray-300 font-bold text-xs text-center flex-shrink-0">
                        <div className="w-16 border-r p-2 flex-shrink-0">Date</div>
                        <div className="flex-1 border-r p-2 text-left">Account Titles and Explanation</div>
                        <div className="w-16 border-r p-2 flex-shrink-0">P.R.</div>
                        <div className="w-20 border-r p-2 text-right flex-shrink-0">Debit</div>
                        <div className="w-20 p-2 text-right flex-shrink-0">Credit</div>
                    </div>
                    <div className="overflow-y-auto flex-1 bg-white custom-scrollbar">
                        ${entries.map((t, tIdx) => {
                            const isFirst = true; // Simplified for combined view
                            
                            return html`
                                <React.Fragment key=${t.id + tIdx}>
                                    ${t.rows.map((row, i) => html`
                                        <div key=${i} className="flex border-b border-gray-100 text-xs h-6 items-center hover:bg-gray-50">
                                            <div className="w-16 border-r text-right pr-1 flex-shrink-0 text-gray-500">${i === 0 ? t.date : ''}</div>
                                            <div className="flex-1 border-r pl-1 font-medium text-gray-800 truncate" title=${row.account}>
                                                ${row.type === 'cr' ? html`<span className="ml-4">${row.account}</span>` : row.account}
                                            </div>
                                            <div className="w-16 border-r text-center flex justify-center items-center flex-shrink-0 text-gray-400">
                                                ${t.type === 'GJ' ? '1' : t.type === 'ADJ' ? '2' : '3'}
                                            </div>
                                            <div className="w-20 border-r text-right pr-1 flex-shrink-0 text-gray-800">
                                                ${row.type === 'dr' ? Number(row.amount).toLocaleString() : ''}
                                            </div>
                                            <div className="w-20 text-right pr-1 flex-shrink-0 text-gray-800">
                                                ${row.type === 'cr' ? Number(row.amount).toLocaleString() : ''}
                                            </div>
                                        </div>
                                    `)}
                                    <div className="flex border-b border-gray-200 text-xs h-6 items-center text-gray-500 italic bg-gray-50/50 mb-2">
                                        <div className="w-16 border-r flex-shrink-0"></div>
                                        <div className="flex-1 border-r pl-8 truncate" title=${t.description}>(${t.description})</div>
                                        <div className="w-16 border-r flex-shrink-0"></div>
                                        <div className="w-20 border-r flex-shrink-0"></div>
                                        <div className="w-20 flex-shrink-0"></div>
                                    </div>
                                </React.Fragment>
                            `;
                        })}
                        <div className="h-8"></div>
                    </div>
                </div>
            `}
        </div>
    `;
};

// --- RIGHT PANEL: REVERSING ENTRY FORM ---
const ReversingEntryForm = ({ adjustments, data, onChange, isReadOnly, showFeedback, activityData }) => {
    
    // Helper to check if a specific adjustment SHOULD be reversed
    const isReversable = (adj) => {
        const { config } = activityData;
        const type = adj.type || '';
        
        // 1. Accruals: Always Reverse
        if (type.includes('Accrued')) return true;

        // 2. Deferrals: Reverse ONLY if Initial Entry was to Expense/Income (Alternative Method)
        if (type.includes('Deferred Expense') && config.deferredExpenseMethod === 'Expense') return true;
        if (type.includes('Deferred Income') && config.deferredIncomeMethod === 'Income') return true;

        return false;
    };

    const handleChange = (adjId, field, val) => {
        const current = data[adjId] || {};
        onChange(adjId, { ...current, [field]: val });
    };

    return html`
        <div className="border rounded bg-white shadow-sm flex flex-col flex-1 min-h-0 h-full">
            <div className="bg-blue-100 p-2 font-bold text-blue-900 border-b flex items-center justify-between">
                <div className="flex items-center">
                    <${Book} size=${16} className="inline mr-2 w-4 h-4"/>
                    Journalize Reversing Entries (Jan 01)
                </div>
            </div>
            <div className="bg-yellow-50 p-2 text-xs border-b border-yellow-200 text-yellow-800 flex items-start gap-2">
                <${AlertCircle} size=${14} className="mt-0.5 flex-shrink-0"/>
                <span>
                    <strong>Instruction:</strong> Review the Adjusting Entries. If an adjustment requires a reversing entry (Accruals or Deferrals under Expense/Income method), record it below. If no entry is needed, leave the fields blank.
                </span>
            </div>
            <div className="overflow-y-auto p-2 flex-1 custom-scrollbar">
                ${adjustments.map((adj, idx) => {
                    const entry = data[adj.id] || {};
                    const shouldReverse = isReversable(adj);
                    
                    // Validation Logic for Feedback
                    // Correct if:
                    // 1. Should Reverse AND (Dr matches Adj Cr AND Cr matches Adj Dr AND Amts match)
                    // 2. Should NOT Reverse AND (Fields are empty)
                    
                    let isDrCorrect = false;
                    let isCrCorrect = false;

                    if (shouldReverse) {
                        isDrCorrect = entry.drAcc?.toLowerCase() === adj.crAcc.toLowerCase() && Math.abs(Number(entry.drAmt) - adj.amount) <= 1;
                        isCrCorrect = entry.crAcc?.toLowerCase() === adj.drAcc.toLowerCase() && Math.abs(Number(entry.crAmt) - adj.amount) <= 1;
                    } else {
                        isDrCorrect = !entry.drAcc && !entry.drAmt;
                        isCrCorrect = !entry.crAcc && !entry.crAmt;
                    }
                    
                    const isEmpty = !entry.drAcc && !entry.drAmt && !entry.crAcc && !entry.crAmt;

                    return html`
                        <div key=${adj.id} className="mb-4 border border-blue-200 rounded overflow-hidden">
                            <div className="bg-blue-50 px-2 py-1 text-xs font-bold text-blue-800 border-b border-blue-200 flex justify-between">
                                <span>Reversing Entry for AJE #${idx + 1} (${adj.desc})</span>
                                <span className="text-gray-500 font-normal">Jan 01</span>
                            </div>
                            
                            <!-- Debit Row -->
                            <div className="flex border-b border-gray-100">
                                <div className="w-16 p-1 text-center border-r bg-gray-50 text-xs flex items-center justify-center text-gray-500">Jan 01</div>
                                <div className="flex-1 p-0 border-r relative">
                                    <input type="text" className=${`w-full h-full p-1 outline-none text-sm ${showFeedback && !isDrCorrect ? 'bg-red-50' : ''}`} placeholder=${shouldReverse ? "Account..." : "No Entry Needed"} value=${entry.drAcc || ''} onChange=${(e) => handleChange(adj.id, 'drAcc', e.target.value)} disabled=${isReadOnly}/>
                                    <div className="absolute right-1 top-1"><${StatusIcon} show=${showFeedback} correct=${isDrCorrect} /></div>
                                </div>
                                <div className="w-24 p-0 border-r relative">
                                    <input type="number" className=${`w-full h-full p-1 text-right outline-none text-sm ${showFeedback && !isDrCorrect ? 'bg-red-50' : ''}`} placeholder="Debit" value=${entry.drAmt || ''} onChange=${(e) => handleChange(adj.id, 'drAmt', e.target.value)} disabled=${isReadOnly}/>
                                </div>
                                <div className="w-24 p-1 bg-gray-50 border-r"></div>
                            </div>

                            <!-- Credit Row -->
                            <div className="flex border-b border-gray-100">
                                <div className="w-16 border-r bg-gray-50"></div>
                                <div className="flex-1 p-0 border-r relative pl-6">
                                    <input type="text" className=${`w-full h-full p-1 outline-none text-sm ${showFeedback && !isCrCorrect ? 'bg-red-50' : ''}`} placeholder=${shouldReverse ? "Account..." : "No Entry Needed"} value=${entry.crAcc || ''} onChange=${(e) => handleChange(adj.id, 'crAcc', e.target.value)} disabled=${isReadOnly}/>
                                    <div className="absolute right-1 top-1"><${StatusIcon} show=${showFeedback} correct=${isCrCorrect} /></div>
                                </div>
                                <div className="w-24 p-1 bg-gray-50 border-r"></div>
                                <div className="w-24 p-0 border-r relative">
                                    <input type="number" className=${`w-full h-full p-1 text-right outline-none text-sm ${showFeedback && !isCrCorrect ? 'bg-red-50' : ''}`} placeholder="Credit" value=${entry.crAmt || ''} onChange=${(e) => handleChange(adj.id, 'crAmt', e.target.value)} disabled=${isReadOnly}/>
                                </div>
                            </div>
                        </div>
                    `;
                })}
            </div>
        </div>
    `;
};

// --- MAIN COMPONENT ---
export default function Step10ReversingEntries({ activityData, data, onChange, showFeedback, isReadOnly }) {
    
    // Combine all historical entries for the Left Panel View
    const combinedEntries = useMemo(() => {
        const { transactions, adjustments, validAccounts, beginningBalances, config } = activityData;
        const entries = [];

        // 1. Regular Transactions
        transactions.forEach(t => {
            const dateObj = new Date(t.date);
            const dateStr = `${dateObj.toLocaleString('default', { month: 'short' })} ${dateObj.getDate().toString().padStart(2,'0')}`;
            const rows = [];
            t.debits.forEach(d => rows.push({ account: d.account, amount: d.amount, type: 'dr' }));
            t.credits.forEach(c => rows.push({ account: c.account, amount: c.amount, type: 'cr' }));
            entries.push({ id: `txn-${t.id}`, date: dateStr, desc: t.description, type: 'GJ', rows });
        });

        // 2. Adjusting Entries
        adjustments.forEach((adj, i) => {
            const rows = [
                { account: adj.drAcc, amount: adj.amount, type: 'dr' },
                { account: adj.crAcc, amount: adj.amount, type: 'cr' }
            ];
            entries.push({ id: `adj-${i}`, date: 'Dec 31', desc: adj.desc, type: 'ADJ', rows });
        });

        // 3. Closing Entries (Generated on the fly for visualization)
        // Calculate Nominal Totals
        let totalRev = 0, totalExp = 0, totalDraw = 0;
        let revRows = [], expRows = [], drawRows = []; // For detailed entries if needed
        
        // Helper to get balance
        const getBal = (acc) => {
            let dr = 0, cr = 0;
            if (config.isSubsequentYear && beginningBalances?.balances[acc]) { dr += beginningBalances.balances[acc].dr; cr += beginningBalances.balances[acc].cr; }
            transactions.forEach(t => { t.debits.forEach(d => { if(d.account===acc) dr+=d.amount; }); t.credits.forEach(c => { if(c.account===acc) cr+=c.amount; }); });
            adjustments.forEach(a => { if(a.drAcc===acc) dr+=a.amount; if(a.crAcc===acc) cr+=a.amount; });
            return dr - cr;
        };

        validAccounts.forEach(acc => {
            const net = getBal(acc);
            const type = getAccountType(acc);
            if (type === 'Revenue') {
                totalRev += Math.abs(net);
                if (Math.abs(net) > 0) entries.push({ id: `close-rev-${acc}`, date: 'Dec 31', desc: 'Closing Entry', type: 'CLS', rows: [{account: acc, amount: Math.abs(net), type: 'dr'}, {account: 'Income Summary', amount: Math.abs(net), type: 'cr'}] });
            }
            if (type === 'Expense') {
                totalExp += net;
                if (net > 0) entries.push({ id: `close-exp-${acc}`, date: 'Dec 31', desc: 'Closing Entry', type: 'CLS', rows: [{account: 'Income Summary', amount: net, type: 'dr'}, {account: acc, amount: net, type: 'cr'}] });
            }
            if (acc.includes('Drawing') && net > 0) {
                const capAcc = validAccounts.find(a => getAccountType(a) === 'Equity' && !a.includes('Drawing'));
                entries.push({ id: `close-drw-${acc}`, date: 'Dec 31', desc: 'Closing Entry', type: 'CLS', rows: [{account: capAcc, amount: net, type: 'dr'}, {account: acc, amount: net, type: 'cr'}] });
            }
        });

        // Close Income Summary
        const ni = totalRev - totalExp;
        const capAcc = validAccounts.find(a => getAccountType(a) === 'Equity' && !a.includes('Drawing'));
        if (ni >= 0) {
            entries.push({ id: 'close-ni', date: 'Dec 31', desc: 'Close Net Income', type: 'CLS', rows: [{account: 'Income Summary', amount: ni, type: 'dr'}, {account: capAcc, amount: ni, type: 'cr'}] });
        } else {
            entries.push({ id: 'close-nl', date: 'Dec 31', desc: 'Close Net Loss', type: 'CLS', rows: [{account: capAcc, amount: Math.abs(ni), type: 'dr'}, {account: 'Income Summary', amount: Math.abs(ni), type: 'cr'}] });
        }

        return entries;
    }, [activityData]);

    return html`
        <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-140px)] min-h-[600px]">
            <div className="flex-1 lg:w-1/2 h-full min-h-0">
                 <${HistoricalJournalView} entries=${combinedEntries} />
            </div>
            <div className="flex-1 lg:w-1/2 min-h-0 flex flex-col">
                 <${ReversingEntryForm} 
                    adjustments=${activityData.adjustments} 
                    data=${data} 
                    onChange=${onChange} 
                    showFeedback=${showFeedback} 
                    isReadOnly=${isReadOnly}
                    activityData=${activityData}
                 />
            </div>
        </div>
    `;
}
