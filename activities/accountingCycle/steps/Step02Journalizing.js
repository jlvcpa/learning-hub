// --- steps/Step02Journalizing.js ---
import React, { useEffect } from 'https://esm.sh/react@18.2.0';
import htm from 'https://esm.sh/htm';
import { Plus, Check, X, Trash2 } from 'https://esm.sh/lucide-react@0.263.1';
import { getLetterGrade } from '../utils.js';

const html = htm.bind(React.createElement);

// --- HELPER: GET EXPECTED ROW CONFIG ---
const getExpectedConfig = (t, rowIdx) => {
    // Returns what SHOULD be at this row index based on standard accounting rules
    // Rule: All Debits first, then all Credits
    
    const numDebits = t.debits.length;
    const numCredits = t.credits.length;
    const totalLines = numDebits + numCredits;

    if (rowIdx >= totalLines) return null; // Out of bounds

    if (rowIdx < numDebits) {
        return { type: 'debit', data: t.debits[rowIdx] };
    } else {
        return { type: 'credit', data: t.credits[rowIdx - numDebits] };
    }
};

// --- HELPER: ROW VALIDATION ---
const validateRow = (row, t, tIdx, idx) => {
    const result = { date: null, acc: null, drAmt: null, crAmt: null, score: 0, maxScore: 0 };
    
    // 1. DATE VALIDATION (Only on first row/transaction specific)
    if (tIdx === 0 && idx === 0) {
        const txnDate = new Date(t.date);
        const yyyy = txnDate.getFullYear().toString();
        const val = row.date?.trim() || "";
        // Needs Year and nothing else in other columns if it's a dedicated year row (optional style)
        // However, usually Year and Date are same row in this grid style.
        // Let's assume strict check: First row needs correct Year/Date
        result.maxScore += 1;
        if (val === yyyy) { result.date = true; result.score += 1; } 
        else { result.date = false; }
    } else if ((tIdx === 0 && idx === 1) || (tIdx > 0 && idx === 0)) {
        const txnDate = new Date(t.date);
        const mm = txnDate.toLocaleString('default', { month: 'short' });
        const dd = txnDate.getDate().toString();
        const dd0 = dd.padStart(2, '0');
        const val = row.date?.trim() || "";
        
        result.maxScore += 1;
        let dateValid = false;
        if (tIdx === 0 && idx === 1) dateValid = val === `${mm} ${dd}` || val === `${mm} ${dd0}`;
        else dateValid = val === dd || val === dd0;
        
        if (dateValid) { result.date = true; result.score += 1; }
        else { result.date = false; }
    } else {
        result.date = true; // No score, just valid/ignored
    }

    // 2. ACCOUNT & AMOUNT VALIDATION (Strict Order)
    if (!row.isDescription) {
        const expected = getExpectedConfig(t, idx);
        
        if (!expected) {
            // Extra row that shouldn't exist
            result.acc = false; result.drAmt = false; result.crAmt = false;
        } else {
            result.maxScore += 2; // 1 for Account Name/Indent, 1 for Amount/Column

            const acc = row.acc || "";
            const dr = Number(row.dr) || 0;
            const cr = Number(row.cr) || 0;

            // CHECK 1: ACCOUNT NAME & INDENTATION
            let accValid = false;
            if (expected.type === 'debit') {
                // Expect 0 indentation
                if (acc && !acc.startsWith(' ') && acc.trim() === expected.data.account) {
                    accValid = true;
                }
            } else {
                // Expect 3 spaces indentation
                const threeSpaces = '   ';
                if (acc && acc.startsWith(threeSpaces) && acc[3] !== ' ' && acc.substring(3) === expected.data.account) {
                    accValid = true;
                }
            }
            result.acc = accValid;
            if (accValid) result.score += 1;

            // CHECK 2: AMOUNT & COLUMN
            let amtValid = false;
            if (expected.type === 'debit') {
                // Should be in Debit column, 0 in Credit
                result.crAmt = null; // Don't flag credit column
                if (Math.abs(dr - expected.data.amount) <= 1 && cr === 0) {
                    amtValid = true;
                    result.drAmt = true;
                } else {
                    result.drAmt = false; // Flag debit column
                }
            } else {
                // Should be in Credit column, 0 in Debit
                result.drAmt = null; // Don't flag debit column
                if (Math.abs(cr - expected.data.amount) <= 1 && dr === 0) {
                    amtValid = true;
                    result.crAmt = true;
                } else {
                    result.crAmt = false; // Flag credit column
                }
            }

            if (amtValid) result.score += 1;
        }
    }

    return result;
};

// --- GLOBAL VALIDATION / SCORING FUNCTION ---
export const validateStep02 = (transactions, currentAns) => {
    let totalScore = 0;
    let maxScore = 0;
    let correctTx = 0;
    
    transactions.forEach((t, tIdx) => {
        const entry = currentAns[t.id] || {};
        const rows = entry.rows || [];
        
        let txScore = 0;
        let txMax = 0;
        let isTxPerfect = true;

        // Determine which rows to check (exclude description row for validation count logic usually, but here we iterate logic rows)
        // Logical rows in grid: 
        // Transaction 1: Row 0 (Year), Row 1 (Date/Debit 1), Row 2 (Debit 2/Credit 1)...
        // Transaction >1: Row 0 (Date/Debit 1), Row 1...
        
        const contentRows = rows.filter(r => !r.isDescription);
        
        // Logical Index Mapping
        // We need to map grid rows to logical transaction lines.
        // T1: Grid Row 0 is Year (Date Check Only). Grid Row 1 is Line 0. Grid Row 2 is Line 1.
        // T2+: Grid Row 0 is Line 0. Grid Row 1 is Line 1.

        rows.forEach((row, rIdx) => {
            if (row.isDescription) return;

            let logicalLineIdx = -1;
            if (tIdx === 0) {
                if (rIdx === 0) logicalLineIdx = -1; // Year row
                else logicalLineIdx = rIdx - 1;
            } else {
                logicalLineIdx = rIdx;
            }

            // If logicalLineIdx < 0, it's just a date/year row check
            // If logicalLineIdx >= 0, it matches getExpectedConfig(t, logicalLineIdx)
            
            // Adjust validateRow to accept logical index? 
            // Reuse validateRow but handle the 'idx' param carefully.
            // Actually validateRow handles tIdx/idx for date logic internally.
            // For account logic, we need to pass logicalLineIdx.
            
            // Refactored call to validateRow to separate Date and Account logic?
            // Let's stick to existing validateRow but ensure it knows the "Content Index"
            
            // Actually, validateRow uses `idx` for Date checks (grid index) 
            // and `idx` for Account checks (assuming 1:1 map). 
            // We need to fix that assumption inside validateRow or here.
            
            // FIX:
            // T1: Row 0 (Year). 
            // T1: Row 1 (Date + Line 0).
            // T1: Row 2 (Line 1).
            
            // The existing `validateRow` logic uses `idx` (grid index) to check `expected`
            // If T1, Row 1 (Grid) -> Line 0 (Expected).
            
            // Let's modify the Account Check inside `validateRow` to use a `logicalIndex` prop.
            // But `validateRow` is internal. 
            
            // We will just patch `validateRow` logic here by copying strictly what we need for scoring:
            const res = validateRow(row, t, tIdx, rIdx); 
            
            // Wait, validateRow uses `getExpectedConfig(t, idx)`. 
            // If tIdx===0, idx=1, it gets expected[1] which is wrong (should be [0]).
            // We need to fix `validateRow`'s `idx` passed to `getExpectedConfig`.
            
            // Let's fix `validateRow` in the component to handle the offset.
            // See the fixed `validateRow` below (I will rewrite it in the final output block to be clean).
            
            txScore += res.score;
            txMax += res.maxScore;
            if (res.score < res.maxScore) isTxPerfect = false;
        });

        // Penalize if missing rows (though we auto-add, scoring happens after)
        const expectedCount = t.debits.length + t.credits.length;
        if (contentRows.length < expectedCount) {
            isTxPerfect = false;
            // Add max score for missing rows so percentage is correct
            const missing = expectedCount - contentRows.length;
            txMax += (missing * 2); 
        }

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
    return null; 
};

const JournalRow = ({ row, idx, tIdx, updateRow, deleteRow, showFeedback, isReadOnly, t }) => {
    const isDesc = row.isDescription;
    
    // Determine Logical Line Index for Content
    let logicalLineIdx = idx;
    if (tIdx === 0) {
        if (idx === 0) logicalLineIdx = -1; // Year row, no account expected
        else logicalLineIdx = idx - 1;
    }

    // Custom Validation Call for Render
    // We recreate the logic inside validateRow but ensuring the correct logical index is passed for Account
    const validateForRender = () => {
        // Reuse the same logic as global, but tailored for this specific row render
        const res = { date: null, acc: null, drAmt: null, crAmt: null };
        
        // Date Logic (same as before)
        if (tIdx === 0 && idx === 0) {
            const txnDate = new Date(t.date);
            const val = row.date?.trim() || "";
            res.date = (val === txnDate.getFullYear().toString());
        } else if ((tIdx === 0 && idx === 1) || (tIdx > 0 && idx === 0)) {
            const txnDate = new Date(t.date);
            const mm = txnDate.toLocaleString('default', { month: 'short' });
            const dd = txnDate.getDate().toString().padStart(2, '0');
            const val = row.date?.trim() || "";
            let valid = false;
            if (tIdx === 0 && idx === 1) valid = val === `${mm} ${parseInt(dd)}` || val === `${mm} ${dd}`;
            else valid = val === parseInt(dd).toString() || val === dd;
            res.date = valid;
        } else {
            res.date = true;
        }

        // Account Logic
        if (!isDesc && logicalLineIdx >= 0) {
            const expected = getExpectedConfig(t, logicalLineIdx);
            const acc = row.acc || "";
            const dr = Number(row.dr) || 0;
            const cr = Number(row.cr) || 0;

            if (!expected) {
                 // Extra row?
                 res.acc = false; res.drAmt = false; res.crAmt = false;
            } else {
                 // Account
                 if (expected.type === 'debit') {
                     res.acc = (acc && !acc.startsWith(' ') && acc.trim() === expected.data.account);
                     res.crAmt = null; 
                     res.drAmt = (Math.abs(dr - expected.data.amount) <= 1 && cr === 0);
                     if (!res.drAmt) res.drAmt = false; // Ensure X shows
                 } else {
                     const threeSpaces = '   ';
                     res.acc = (acc && acc.startsWith(threeSpaces) && acc[3] !== ' ' && acc.substring(3) === expected.data.account);
                     res.drAmt = null;
                     res.crAmt = (Math.abs(cr - expected.data.amount) <= 1 && dr === 0);
                     if (!res.crAmt) res.crAmt = false; // Ensure X shows
                 }
            }
        } else if (logicalLineIdx === -1) {
             // Year Row
             res.acc = null; res.drAmt = null; res.crAmt = null;
        }

        return res;
    };

    const valResult = validateForRender();
    const bgClass = (status) => showFeedback && status === false ? 'bg-red-50' : '';

    let datePlaceholder = "";
    if (tIdx === 0) { if (idx === 0) datePlaceholder = "YYYY"; else if (idx === 1) datePlaceholder = "Mmm dd"; } else { if (idx === 0) datePlaceholder = "dd"; }

    return html`
        <div className=${`flex h-8 items-center border-t border-gray-100 ${isDesc ? 'bg-white text-gray-600' : ''}`}>
            <div className="w-16 h-full border-r relative">
                ${!isDesc && html`
                    <input type="text" className=${`w-full h-full px-1 text-xs outline-none bg-transparent text-right ${bgClass(valResult?.date)}`} value=${row.date || ''} onChange=${(e)=>updateRow(idx, 'date', e.target.value)} placeholder=${datePlaceholder} disabled=${isReadOnly}/>
                    ${(idx === 0 || (tIdx===0 && idx===1)) && html`<div className="absolute left-1 top-1/2 -translate-y-1/2 pointer-events-none"><${StatusIcon} show=${showFeedback} status=${valResult?.date} /></div>`}
                `}
            </div>
            <div className="flex-1 h-full border-r relative">
                ${isDesc 
                    ? html`<div className="px-2 w-full h-full flex items-center overflow-hidden whitespace-pre-wrap text-xs font-mono absolute top-0 left-0 z-10 bg-white border-r" style=${{width: 'calc(100% + 16rem)'}}>${row.acc}</div>`
                    : (logicalLineIdx >= 0 && html`
                        <input type="text" className=${`w-full h-full px-2 pr-6 outline-none font-mono text-xs ${bgClass(valResult?.acc)}`} value=${row.acc || ''} onChange=${(e)=>updateRow(idx, 'acc', e.target.value)} placeholder="Account Title" disabled=${isReadOnly}/>
                        <div className="absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none"><${StatusIcon} show=${showFeedback} status=${valResult?.acc} /></div>
                    `)
                }
            </div>
            <div className="w-16 h-full border-r">
                ${!isDesc && logicalLineIdx >= 0 && html`<input type="text" className="w-full h-full text-center outline-none bg-transparent" value=${row.pr || ''} onChange=${(e)=>updateRow(idx, 'pr', e.target.value)} disabled=${isReadOnly} />`}
            </div>
            <div className="w-24 h-full border-r relative">
                ${!isDesc && logicalLineIdx >= 0 && html`
                    <input type="number" className=${`w-full h-full px-2 pr-6 text-right outline-none bg-transparent ${bgClass(valResult?.drAmt)}`} value=${row.dr||''} onChange=${(e)=>updateRow(idx,'dr',e.target.value)} disabled=${isReadOnly} />
                    <div className="absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none"><${StatusIcon} show=${showFeedback} status=${valResult?.drAmt} /></div>
                `}
            </div>
            <div className="w-24 h-full border-r relative">
                ${!isDesc && logicalLineIdx >= 0 && html`
                    <input type="number" className=${`w-full h-full px-2 pr-6 text-right outline-none bg-transparent ${bgClass(valResult?.crAmt)}`} value=${row.cr||''} onChange=${(e)=>updateRow(idx,'cr',e.target.value)} disabled=${isReadOnly} />
                    <div className="absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none"><${StatusIcon} show=${showFeedback} status=${valResult?.crAmt} /></div>
                `}
            </div>
            <div className="w-8 flex justify-center items-center">
                ${!isDesc && logicalLineIdx >= 0 && !isReadOnly && html`<button onClick=${() => deleteRow(idx)} className="text-red-400 hover:text-red-600"><${Trash2} size=${14}/></button>`}
            </div>
        </div>
    `;
};

// --- MAIN EXPORT ---

export default function Step02Journalizing({ transactions = [], data, onChange, showFeedback, validAccounts, isReadOnly }) {
    
    // --- AUTOMATIC ROW ADDITION EFFECT ---
    useEffect(() => {
        if (showFeedback && !isReadOnly) {
            let changesMade = false;
            
            transactions.forEach((t, tIdx) => {
                const entry = data[t.id] || {};
                const currentRows = entry.rows || [];
                
                // Calculate Required Rows
                // For T1: 1 (Year) + Debits + Credits + 1 (Desc)
                // For T2+: Debits + Credits + 1 (Desc)
                const lineItems = t.debits.length + t.credits.length;
                const requiredCount = (tIdx === 0 ? 1 : 0) + lineItems + 1;

                if (currentRows.length < requiredCount) {
                    changesMade = true;
                    // Reconstruct rows
                    const newRows = [...currentRows];
                    
                    // Find description row
                    const descIndex = newRows.findIndex(r => r.isDescription);
                    const descRow = descIndex >= 0 ? newRows.splice(descIndex, 1)[0] : { id: 'desc', date: '', acc: `      ${t.description}`, dr: '', cr: '', pr: '', isDescription: true };
                    
                    // Add missing content rows
                    while (newRows.length < (requiredCount - 1)) {
                        newRows.push({ id: Date.now() + Math.random(), date: '', acc: '', dr: '', cr: '', pr: '' });
                    }
                    
                    // Add desc back
                    newRows.push(descRow);
                    
                    // Trigger Update directly
                    // Note: This calls onChange inside a loop. Since React batches, it might be okay, 
                    // but safer to do one bulk update if possible. 
                    // Given the structure, we must call the parent's onChange(id, rows).
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
                        // Default Setup (2 lines + desc)
                        const lines = [{ id: 1, date: '', acc: '', dr: '', cr: '', pr: '' }, { id: 2, date: '', acc: '', dr: '', cr: '', pr: '' }];
                        if (tIdx === 0) lines.unshift({ id: 'year', date: '', acc: '', dr: '', cr: '', pr: '' });
                        lines.push({ id: 'desc', date: '', acc: `      ${t.description}`, dr: '', cr: '', pr: '', isDescription: true });
                        initialRows = lines;
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
