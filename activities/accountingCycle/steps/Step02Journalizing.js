// --- steps/Step02Journalizing.js ---
import React, { useEffect } from 'https://esm.sh/react@18.2.0';
import htm from 'https://esm.sh/htm';
import { Plus, Check, X, Trash2 } from 'https://esm.sh/lucide-react@0.263.1';
import { getLetterGrade } from '../utils.js';

const html = htm.bind(React.createElement);

// --- HELPER: DETERMINE LOGICAL LINE INDEX ---
// Maps the Grid Row Index (idx) to the Transaction Line Index (0, 1, 2...)
const getLogicalIndex = (tIdx, idx) => {
    if (tIdx === 0) {
        if (idx === 0) return -1; // Year Row (Special)
        return idx - 1; // Grid Row 1 -> Line 0
    }
    return idx; // Grid Row 0 -> Line 0
};

// --- HELPER: GET EXPECTED CONFIGURATION ---
// Determines if a specific line SHOULD be a Debit or Credit based on the Answer Key
const getExpectedConfig = (t, logicalIdx) => {
    if (logicalIdx < 0) return null; // Year row
    
    const numDebits = t.debits.length;
    const totalLines = numDebits + t.credits.length;
    
    if (logicalIdx >= totalLines) return null; // Out of bounds (extra row)

    if (logicalIdx < numDebits) {
        return { type: 'debit', data: t.debits[logicalIdx] };
    } else {
        return { type: 'credit', data: t.credits[logicalIdx - numDebits] };
    }
};

// --- HELPER: ROW VALIDATION ---
const validateRow = (row, t, tIdx, idx) => {
    const result = { date: null, acc: null, drAmt: null, crAmt: null, score: 0, maxScore: 0 };
    const logicalIdx = getLogicalIndex(tIdx, idx);

    // 1. Date Validation
    if (tIdx === 0 && idx === 0) {
        // First row of first transaction: Needs Year
        const txnDate = new Date(t.date);
        const yyyy = txnDate.getFullYear().toString();
        const val = row.date?.trim() || ""; 
        const isEmptyOthers = !row.acc && !row.pr && !row.dr && !row.cr;
        
        result.maxScore += 1;
        if (val === yyyy && isEmptyOthers) {
            result.date = true;
            result.score += 1;
        } else {
            result.date = false;
        }
    } else if ((tIdx === 0 && idx === 1) || (tIdx > 0 && idx === 0)) {
        // Date row (Month/Day)
        const txnDate = new Date(t.date);
        const mm = txnDate.toLocaleString('default', { month: 'short' });
        const dd = txnDate.getDate().toString();
        const dd0 = dd.padStart(2, '0');
        const val = row.date?.trim() || "";
        
        result.maxScore += 1;
        let dateValid = false;
        if (tIdx === 0 && idx === 1) dateValid = val === `${mm} ${dd}` || val === `${mm} ${dd0}`;
        else dateValid = val === dd || val === dd0;
        
        if (dateValid) {
            result.date = true;
            result.score += 1;
        } else {
            result.date = false;
        }
    } else {
        // Rows that shouldn't have dates
        result.date = true; 
    }

    // 2. Account & Amount Validation
    if (!row.isDescription) {
        const expected = getExpectedConfig(t, logicalIdx);
        
        if (expected) {
            result.maxScore += 2; // 1 for Account, 1 for Amount

            const acc = row.acc || "";
            const dr = Number(row.dr) || 0;
            const cr = Number(row.cr) || 0;

            // --- DEBIT EXPECTATION ---
            if (expected.type === 'debit') {
                result.crAmt = null; // Should not be in credit column

                // Account Name Check (Must not start with space)
                const accValid = acc.length > 0 && !acc.startsWith(' ') && acc.trim() === expected.data.account;
                
                if (!accValid) result.acc = false;
                else { result.acc = true; result.score += 1; }

                // Amount Check
                // Must be in Debit column, matches amount, Credit column is empty
                const amtValid = Math.abs(dr - expected.data.amount) <= 1 && cr === 0;
                
                if (!amtValid) result.drAmt = false;
                else { result.drAmt = true; result.score += 1; }
            }
            
            // --- CREDIT EXPECTATION ---
            else if (expected.type === 'credit') {
                result.drAmt = null; // Should not be in debit column

                // Account Name Check (Must have 3 spaces)
                const threeSpaces = '   ';
                const startsWith3 = acc.startsWith(threeSpaces);
                const fourthCharNotSpace = acc.length > 3 && acc[3] !== ' '; 
                const cleanName = acc.substring(3);
                
                const accValid = startsWith3 && fourthCharNotSpace && cleanName === expected.data.account;

                if (!accValid) result.acc = false;
                else { result.acc = true; result.score += 1; }

                // Amount Check
                // Must be in Credit column, matches amount, Debit column is empty
                const amtValid = Math.abs(cr - expected.data.amount) <= 1 && dr === 0;

                if (!amtValid) result.crAmt = false;
                else { result.crAmt = true; result.score += 1; }
            }
        } else if (logicalIdx >= 0) {
            // Extra row that shouldn't exist (but isn't description/year)
            // If user filled it, mark wrong
            if (row.acc || row.dr || row.cr) {
                result.acc = false;
                result.drAmt = false;
                result.crAmt = false;
            }
        }
    }

    return result;
};

// --- GLOBAL VALIDATION FUNCTION (DRY) ---
export const validateStep02 = (transactions, currentAns = {}) => {
    let totalScore = 0;
    let maxScore = 0;
    let correctTx = 0;
    
    // Safety check
    if (!transactions || transactions.length === 0) {
        return { isCorrect: false, score: 0, maxScore: 0, letterGrade: 'IR' };
    }
    
    transactions.forEach((t, tIdx) => {
        const entry = currentAns[t.id] || {};
        const rows = entry.rows || [];
        
        let txScore = 0;
        let txMax = 0;
        let isTxPerfect = true;

        // Calculate Max Score for this transaction structure
        // Date pts: 2 for first Tx, 1 for others
        if (tIdx === 0) txMax += 2; else txMax += 1;
        // Line pts: 2 per line (Account + Amount)
        const expectedCount = t.debits.length + t.credits.length;
        txMax += (expectedCount * 2);

        // Validate existing rows
        rows.forEach((row, rIdx) => {
            const res = validateRow(row, t, tIdx, rIdx);
            txScore += res.score;
            
            // Check for failure flags
            if (res.date === false || res.acc === false || res.drAmt === false || res.crAmt === false) {
                isTxPerfect = false;
            }
        });

        // Penalize for missing rows (User hasn't added enough rows yet)
        // ✅ CORRECTED 
        const contentRows = rows.filter((r, rIdx) => !r.isDescription && !((r.id === 'year' || rIdx === 0) && tIdx === 0)); 
        // Note: Counting content rows accurately is tricky with the year row mixed in.
        // Simplified check: If score < max, it's not perfect.
        
        if (txScore < txMax) isTxPerfect = false;

        totalScore += txScore;
        maxScore += txMax;
        if (isTxPerfect) correctTx++;
    });

    return {
        isCorrect: correctTx === transactions.length,
        score: totalScore,
        maxScore: maxScore,
        letterGrade: getLetterGrade(totalScore, maxScore)
    };
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
    
    // --- AUTOMATIC ROW ADDITION EFFECT ---
    useEffect(() => {
        if (showFeedback && !isReadOnly) {
            transactions.forEach((t, tIdx) => {
                const entry = data[t.id] || {};
                const currentRows = entry.rows || [];
                
                // Calculate Required Rows
                // T1: 1 (Year) + Debits + Credits + 1 (Desc)
                // Tn: Debits + Credits + 1 (Desc)
                const lineItems = t.debits.length + t.credits.length;
                const requiredCount = (tIdx === 0 ? 1 : 0) + lineItems + 1;

                if (currentRows.length < requiredCount) {
                    const newRows = [...currentRows];
                    
                    // Temporarily remove desc row if exists
                    const descIndex = newRows.findIndex(r => r.isDescription);
                    const descRow = descIndex >= 0 ? newRows.splice(descIndex, 1)[0] : { id: 'desc', date: '', acc: `      ${t.description}`, dr: '', cr: '', pr: '', isDescription: true };
                    
                    // Fill lines
                    const needed = requiredCount - 1; // target count excluding desc
                    while (newRows.length < needed) {
                        newRows.push({ id: Date.now() + Math.random(), date: '', acc: '', dr: '', cr: '', pr: '' });
                    }
                    
                    // Put desc back
                    newRows.push(descRow);
                    onChange(t.id, newRows);
                }
            });
        }
    }, [showFeedback, isReadOnly, transactions, data, onChange]);

    if (!transactions || transactions.length === 0) return html`<div className="p-4 bg-red-50 text-red-600 rounded border border-red-200">No transactions generated.</div>`;
    
    // Calculate Score for Display (Read Only)
    const result = validateStep02(transactions, data);

    return html`
        <div>
            ${showFeedback && html`
                <div className="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-2 mb-4 flex justify-between items-center shadow-sm">
                    <span className="font-bold">Validation Results:</span>
                    <span className="font-mono font-bold text-lg">Score: ${result.score} of ${result.maxScore} - (${result.letterGrade})</span>
                </div>
            `}
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
        </div>
    `;
}
