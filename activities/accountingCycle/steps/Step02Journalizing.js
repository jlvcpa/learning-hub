// --- steps/Step02Journalizing.js ---
import React from 'https://esm.sh/react@18.2.0';
import htm from 'https://esm.sh/htm';
import { Plus, Check, X, Trash2 } from 'https://esm.sh/lucide-react@0.263.1';

const html = htm.bind(React.createElement);

// --- HELPER: ROW VALIDATION ---
const validateRow = (row, t, tIdx, idx) => {
    const result = { date: null, acc: null, drAmt: null, crAmt: null };

    // 1. Date Validation
    if (tIdx === 0 && idx === 0) {
        // First row of first transaction: Needs Year
        const txnDate = new Date(t.date);
        const yyyy = txnDate.getFullYear().toString();
        const val = row.date?.trim() || ""; // Handle undefined/null
        const isEmptyOthers = !row.acc && !row.pr && !row.dr && !row.cr;
        result.date = (val === yyyy && isEmptyOthers);
    } else if ((tIdx === 0 && idx === 1) || (tIdx > 0 && idx === 0)) {
        // Date row (Month/Day)
        const txnDate = new Date(t.date);
        const mm = txnDate.toLocaleString('default', { month: 'short' });
        const dd = txnDate.getDate().toString();
        const dd0 = dd.padStart(2, '0');
        const val = row.date?.trim() || "";
        
        let dateValid = false;
        if (tIdx === 0 && idx === 1) dateValid = val === `${mm} ${dd}` || val === `${mm} ${dd0}`;
        else dateValid = val === dd || val === dd0;
        
        result.date = dateValid;
    } else {
        // Rows that shouldn't have dates
        result.date = true; 
    }

    // 2. Account & Amount Validation
    if (!row.isDescription) {
        const acc = row.acc || "";
        const dr = Number(row.dr) || 0;
        const cr = Number(row.cr) || 0;
        
        // Determine intent or default expectation
        // If user typed numbers, trust that column.
        // If both 0, assume Debit for Row 0, Credit for others (Heuristic for X placement)
        const isDebitEntry = dr > 0 || (dr === 0 && cr === 0 && idx === 0); 
        const isCreditEntry = cr > 0 || (dr === 0 && cr === 0 && idx > 0);

        // --- DEBIT PATH ---
        if (isDebitEntry && !isCreditEntry) {
            result.crAmt = null; // Don't show X on credit side

            // Account Name Check (Must not start with space)
            if (acc.length === 0 || acc.startsWith(' ')) {
                result.acc = false;
                result.drAmt = false;
            } else {
                // Find matching debit in transaction source
                const match = t.debits.find(item => item.account === acc.trim());
                if (!match) {
                    result.acc = false;
                    result.drAmt = false;
                } else {
                    result.acc = true;
                    // Check amount
                    result.drAmt = Math.abs(match.amount - dr) <= 1;
                }
            }
        }

        // --- CREDIT PATH ---
        else if (isCreditEntry) {
            result.drAmt = null; // Don't show X on debit side

            // Account Name Check (Must have 3 spaces)
            const threeSpaces = '   ';
            const startsWith3 = acc.startsWith(threeSpaces);
            const fourthCharNotSpace = acc.length > 3 && acc[3] !== ' '; 
            
            if (!startsWith3 || !fourthCharNotSpace) {
                result.acc = false;
                result.crAmt = false;
            } else {
                const cleanAccName = acc.substring(3);
                // Find matching credit
                const match = t.credits.find(item => item.account === cleanAccName);
                if (!match) {
                    result.acc = false;
                    result.crAmt = false;
                } else {
                    result.acc = true;
                    // Check amount
                    result.crAmt = Math.abs(match.amount - cr) <= 1;
                }
            }
        }
    }

    return result;
};

// --- GLOBAL VALIDATION FUNCTION (DRY) ---
export const validateStep02 = (transactions, currentAns) => {
    let correctTx = 0;
    
    transactions.forEach((t, tIdx) => {
        const entry = currentAns[t.id] || {};
        const rows = entry.rows || [];
        
        let txValid = true;

        // 1. Validate Date (First row of transaction)
        const dateRowIndex = tIdx === 0 ? 1 : 0; 
        if (rows[dateRowIndex]) {
            const dateRes = validateRow(rows[dateRowIndex], t, tIdx, dateRowIndex);
            if (dateRes.date === false) txValid = false;
        } else {
            txValid = false;
        }

        // 2. Validate Debits
        const debitsFound = t.debits.every(exp => {
            return rows.some(r => {
                const isZeroIndent = r.acc && !r.acc.startsWith(' ');
                const nameMatch = r.acc && r.acc.trim() === exp.account;
                const amtMatch = Math.abs(Number(r.dr) - exp.amount) <= 1;
                return isZeroIndent && nameMatch && amtMatch;
            });
        });

        // 3. Validate Credits
        const creditsFound = t.credits.every(exp => {
            return rows.some(r => {
                const isThreeSpaceIndent = r.acc && r.acc.startsWith('   ') && r.acc[3] !== ' ';
                const nameMatch = r.acc && r.acc.substring(3) === exp.account;
                const amtMatch = Math.abs(Number(r.cr) - exp.amount) <= 1;
                return isThreeSpaceIndent && nameMatch && amtMatch;
            });
        });

        if (!debitsFound || !creditsFound) txValid = false;

        if (txValid) correctTx++;
    });

    return correctTx === transactions.length;
};


// --- INTERNAL COMPONENTS ---

const StatusIcon = ({ status, show }) => {
    if (!show) return null;
    if (status === true) return html`<${Check} size=${14} className="text-green-600" />`;
    if (status === false) return html`<${X} size=${14} className="text-red-600" />`;
    return null; // status is null/undefined
};

const JournalRow = ({ row, idx, tIdx, updateRow, deleteRow, showFeedback, isReadOnly, t }) => {
    const isDesc = row.isDescription;
    const isYearRow = tIdx === 0 && idx === 0;
    
    // Run validation logic
    const valResult = validateRow(row, t, tIdx, idx);
    
    // Determine placeholders
    let datePlaceholder = "";
    if (tIdx === 0) { 
        if (idx === 0) datePlaceholder = "YYYY"; 
        else if (idx === 1) datePlaceholder = "Mmm dd"; 
    } else { 
        if (idx === 0) datePlaceholder = "dd"; 
    }

    // Input background helper
    const bgClass = (status) => showFeedback && status === false ? 'bg-red-50' : '';

    return html`
        <div className=${`flex h-8 items-center border-t border-gray-100 ${isDesc ? 'bg-white text-gray-600' : ''}`}>
            
            <div className="w-16 h-full border-r relative group">
                ${!isDesc && html`
                    <input type="text" 
                        className=${`w-full h-full px-1 text-xs outline-none bg-transparent text-right ${bgClass(valResult?.date)}`} 
                        value=${row.date || ''} 
                        onChange=${(e)=>updateRow(idx, 'date', e.target.value)} 
                        placeholder=${datePlaceholder} 
                        disabled=${isReadOnly}
                    />
                    ${(idx === 0 || (tIdx===0 && idx===1)) && html`
                        <div className="absolute left-1 top-1/2 -translate-y-1/2 pointer-events-none">
                            <${StatusIcon} show=${showFeedback} status=${valResult?.date} />
                        </div>
                    `}
                `}
            </div>

            <div className="flex-1 h-full border-r relative">
                ${isDesc 
                    ? html`<div className="px-2 w-full h-full flex items-center overflow-hidden whitespace-pre-wrap text-xs font-mono absolute top-0 left-0 z-10 bg-white border-r" style=${{width: 'calc(100% + 16rem)'}}>${row.acc}</div>`
                    : (!isYearRow && html`
                        <input type="text" 
                            className=${`w-full h-full px-2 pr-6 outline-none font-mono text-xs ${bgClass(valResult?.acc)}`} 
                            value=${row.acc || ''} 
                            onChange=${(e)=>updateRow(idx, 'acc', e.target.value)} 
                            placeholder="Account Title" 
                            disabled=${isReadOnly}
                        />
                        <div className="absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none">
                            <${StatusIcon} show=${showFeedback} status=${valResult?.acc} />
                        </div>
                    `)
                }
            </div>

            <div className="w-16 h-full border-r">
                ${!isDesc && !isYearRow && html`<input type="text" className="w-full h-full text-center outline-none bg-transparent" value=${row.pr || ''} onChange=${(e)=>updateRow(idx, 'pr', e.target.value)} disabled=${isReadOnly} />`}
            </div>

            <div className="w-24 h-full border-r relative">
                ${!isDesc && !isYearRow && html`
                    <input type="number" 
                        className=${`w-full h-full px-2 pr-6 text-right outline-none bg-transparent ${bgClass(valResult?.drAmt)}`} 
                        value=${row.dr||''} 
                        onChange=${(e)=>updateRow(idx,'dr',e.target.value)} 
                        disabled=${isReadOnly} 
                    />
                    <div className="absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none">
                        <${StatusIcon} show=${showFeedback} status=${valResult?.drAmt} />
                    </div>
                `}
            </div>

            <div className="w-24 h-full border-r relative">
                ${!isDesc && !isYearRow && html`
                    <input type="number" 
                        className=${`w-full h-full px-2 pr-6 text-right outline-none bg-transparent ${bgClass(valResult?.crAmt)}`} 
                        value=${row.cr||''} 
                        onChange=${(e)=>updateRow(idx,'cr',e.target.value)} 
                        disabled=${isReadOnly} 
                    />
                    <div className="absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none">
                        <${StatusIcon} show=${showFeedback} status=${valResult?.crAmt} />
                    </div>
                `}
            </div>

            <div className="w-8 flex justify-center items-center">
                ${!isDesc && !isYearRow && !isReadOnly && html`<button onClick=${() => deleteRow(idx)} className="text-red-400 hover:text-red-600"><${Trash2} size=${14}/></button>`}
            </div>
        </div>
    `;
};

// --- MAIN EXPORT ---

export default function Step02Journalizing({ transactions = [], data, onChange, showFeedback, validAccounts, isReadOnly }) {
    if (!transactions || transactions.length === 0) return html`<div className="p-4 bg-red-50 text-red-600 rounded border border-red-200">No transactions generated.</div>`;
    
    return html`
        <div className="border border-gray-400 shadow-sm min-h-[200px]">
            <div className="flex bg-gray-800 text-white border-b border-gray-400 font-bold text-sm text-center">
                <div className="w-16 border-r p-2">Date</div>
                <div className="flex-1 border-r p-2">Account Titles</div>
                <div className="w-16 border-r p-2">PR</div>
                <div className="w-24 border-r p-2">Debit</div>
                <div className="w-24 p-2">Credit</div>
                <div className="w-8"></div>
            </div>
            ${transactions.map((t, tIdx) => {
                const entry = data[t.id] || {};
                let initialRows = entry.rows;
                if (!initialRows) {
                    if (tIdx === 0) { 
                        initialRows = [
                            { id: 'year', date: '', acc: '', dr: '', cr: '', pr: '' }, 
                            { id: 1, date: '', acc: '', dr: '', cr: '', pr: '' }, 
                            { id: 2, date: '', acc: '', dr: '', cr: '', pr: '' }, 
                            { id: 'desc', date: '', acc: `      ${t.description}`, dr: '', cr: '', pr: '', isDescription: true }
                        ]; 
                    } else { 
                        initialRows = [
                            { id: 1, date: '', acc: '', dr: '', cr: '', pr: '' }, 
                            { id: 2, date: '', acc: '', dr: '', cr: '', pr: '' }, 
                            { id: 'desc', date: '', acc: `      ${t.description}`, dr: '', cr: '', pr: '', isDescription: true }
                        ]; 
                    }
                }
                const rows = initialRows;
                const updateRow = (idx, field, val) => { const newRows = [...rows]; if(!newRows[idx]) newRows[idx] = {}; newRows[idx] = { ...newRows[idx], [field]: val }; onChange(t.id, newRows); };
                const addRow = () => { const newRows = [...rows]; const descRow = newRows.pop(); newRows.push({ id: Date.now(), date: '', acc: '', dr: '', cr: '', pr: '' }); newRows.push(descRow); onChange(t.id, newRows); };
                const deleteRow = (idx) => { const minRows = tIdx === 0 ? 4 : 3; if (rows.length <= minRows) return; const newRows = rows.filter((_, i) => i !== idx); onChange(t.id, newRows); };
                
                return html`
                    <div key=${t.id} className="border-b border-gray-300 text-sm">
                        <div className="bg-gray-50 px-2 py-1 text-xs font-bold text-gray-700 border-b border-gray-200 block no-print">${t.date}. ${t.description}</div>
                        ${rows.map((row, idx) => html`<${JournalRow} key=${idx} row=${row} idx=${idx} tIdx=${tIdx} updateRow=${updateRow} deleteRow=${deleteRow} showFeedback=${showFeedback} isReadOnly=${isReadOnly} t=${t} />`)}
                        <div className="bg-gray-50 p-1 flex justify-center border-t no-print">${!isReadOnly && html`<button onClick=${addRow} className="text-xs border border-dashed border-gray-400 rounded px-2 py-1 text-gray-600 hover:bg-white hover:text-blue-600 flex items-center gap-1 transition-colors"><${Plus} size=${12}/> Add Row</button>`}</div>
                    </div>
                `;
            })}
        </div>
    `;
}
