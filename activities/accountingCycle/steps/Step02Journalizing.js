// --- steps/Step02Journalizing.js ---
import React, { useEffect } from 'https://esm.sh/react@18.2.0';
import htm from 'https://esm.sh/htm';
import { Plus, Check, X, Trash2 } from 'https://esm.sh/lucide-react@0.263.1';
import { getLetterGrade } from '../utils.js';

const html = htm.bind(React.createElement);

// --- HELPER: GET EXPECTED ROW CONFIG ---
const getExpectedConfig = (t, rowIdx) => {
    const numDebits = t.debits.length;
    const numCredits = t.credits.length;
    const totalLines = numDebits + numCredits;

    if (rowIdx >= totalLines) return null;

    if (rowIdx < numDebits) {
        return { type: 'debit', data: t.debits[rowIdx] };
    } else {
        return { type: 'credit', data: t.credits[rowIdx - numDebits] };
    }
};

// --- HELPER: ROW VALIDATION ---
const validateRow = (row, t, tIdx, idx) => {
    const result = { date: null, acc: null, drAmt: null, crAmt: null, score: 0, maxScore: 0 };
    
    // 1. DATE VALIDATION
    if (tIdx === 0 && idx === 0) {
        const txnDate = new Date(t.date);
        const yyyy = txnDate.getFullYear().toString();
        const val = row.date?.trim() || "";
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
        result.date = true;
    }

    // 2. ACCOUNT & AMOUNT VALIDATION
    if (!row.isDescription) {
        const expected = getExpectedConfig(t, idx);
        
        if (!expected) {
            result.acc = false; result.drAmt = false; result.crAmt = false;
        } else {
            result.maxScore += 2; 

            const acc = row.acc || "";
            const dr = Number(row.dr) || 0;
            const cr = Number(row.cr) || 0;

            // CHECK 1: ACCOUNT NAME & INDENTATION
            let accValid = false;
            if (expected.type === 'debit') {
                if (acc && !acc.startsWith(' ') && acc.trim() === expected.data.account) {
                    accValid = true;
                }
            } else {
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
                result.crAmt = null; 
                if (Math.abs(dr - expected.data.amount) <= 1 && cr === 0) {
                    amtValid = true;
                    result.drAmt = true;
                } else {
                    result.drAmt = false; 
                }
            } else {
                result.drAmt = null;
                if (Math.abs(cr - expected.data.amount) <= 1 && dr === 0) {
                    amtValid = true;
                    result.crAmt = true;
                } else {
                    result.crAmt = false;
                }
            }

            if (amtValid) result.score += 1;
        }
    }

    return result;
};

// --- GLOBAL VALIDATION / SCORING FUNCTION ---
export const validateStep02 = (transactions, currentAns = {}) => {
    let totalScore = 0;
    let maxScore = 0;
    let correctTx = 0;
    
    // Safety check if transactions are empty
    if (!transactions || transactions.length === 0) {
        return { isCorrect: false, score: 0, maxScore: 0, letterGrade: 'IR' };
    }

    transactions.forEach((t, tIdx) => {
        const entry = currentAns[t.id] || {};
        const rows = entry.rows || [];
        
        let txScore = 0;
        let txMax = 0;
        let isTxPerfect = true;

        const contentRows = rows.filter(r => !r.isDescription);
        const expectedCount = t.debits.length + t.credits.length;

        // Iterate based on EXPECTED lines to ensure we count score for missing lines
        // We calculate max score based on what SHOULD be there.
        
        // Calculate Max Score for this transaction first
        // Date/Year pts
        if (tIdx === 0) txMax += 2; // Year + Date
        else txMax += 1; // Date only
        
        // Account/Amount pts (2 pts per line)
        txMax += (expectedCount * 2);

        // Calculate Actual Score by iterating rows
        rows.forEach((row, rIdx) => {
            if (row.isDescription) return;

            let logicalLineIdx = -1;
            if (tIdx === 0) {
                if (rIdx === 0) logicalLineIdx = -1; 
                else logicalLineIdx = rIdx - 1;
            } else {
                logicalLineIdx = rIdx;
            }

            // We only validate rows that map to actual expected lines (or date rows)
            // If user added 100 extra rows, we don't score them (they are just wrong)
            
            const res = validateRow(row, t, tIdx, logicalLineIdx);
            txScore += res.score;
            
            // If any specific field is wrong, the transaction is not perfect
            if (res.date === false || res.acc === false || res.drAmt === false || res.crAmt === false) {
                isTxPerfect = false;
            }
        });

        // Penalize for missing rows (score won't increase, so implies penalty against max)
        if (contentRows.length < expectedCount) isTxPerfect = false;
        // Penalize for extra rows
        if (contentRows.length > expectedCount) isTxPerfect = false;
        
        // Double check perfect status against score
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
    return null; 
};

const JournalRow = ({ row, idx, tIdx, updateRow, deleteRow, showFeedback, isReadOnly, t }) => {
    const isDesc = row.isDescription;
    
    let logicalLineIdx = idx;
    if (tIdx === 0) {
        if (idx === 0) logicalLineIdx = -1; 
        else logicalLineIdx = idx - 1;
    }

    const validateForRender = () => {
        const res = { date: null, acc: null, drAmt: null, crAmt: null };
        
        if (tIdx === 0 && idx === 0) {
            const txnDate = new Date(t.date);
            const val = row.date?.trim() || "";
            res.date = (val === txnDate.getFullYear().toString());
        } else if ((tIdx === 0 && idx === 1) || (tIdx > 0 && idx === 0)) {
            const txnDate = new Date(t.date);
            const mm = txnDate.toLocaleString('default', { month: 'short' });
            const dd = txnDate.getDate().toString(); // Fixed: check raw string match logic in helper
            const dd0 = dd.padStart(2, '0');
            const val = row.date?.trim() || "";
            let valid = false;
            if (tIdx === 0 && idx === 1) valid = val === `${mm} ${dd}` || val === `${mm} ${dd0}`;
            else valid = val === dd || val === dd0;
            res.date = valid;
        } else {
            res.date = true;
        }

        if (!isDesc && logicalLineIdx >= 0) {
            const expected = getExpectedConfig(t, logicalLineIdx);
            const acc = row.acc || "";
            const dr = Number(row.dr) || 0;
            const cr = Number(row.cr) || 0;

            if (!expected) {
                 res.acc = false; res.drAmt = false; res.crAmt = false;
            } else {
                 if (expected.type === 'debit') {
                     res.acc = (acc && !acc.startsWith(' ') && acc.trim() === expected.data.account);
                     res.crAmt = null; 
                     res.drAmt = (Math.abs(dr - expected.data.amount) <= 1 && cr === 0);
                     if (!res.drAmt) res.drAmt = false; 
                 } else {
                     const threeSpaces = '   ';
                     res.acc = (acc && acc.startsWith(threeSpaces) && acc[3] !== ' ' && acc.substring(3) === expected.data.account);
                     res.drAmt = null;
                     res.crAmt = (Math.abs(cr - expected.data.amount) <= 1 && dr === 0);
                     if (!res.crAmt) res.crAmt = false; 
                 }
            }
        } else if (logicalLineIdx === -1) {
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
                
                const lineItems = t.debits.length + t.credits.length;
                const requiredCount = (tIdx === 0 ? 1 : 0) + lineItems + 1; // +1 for desc

                if (currentRows.length < requiredCount) {
                    changesMade = true;
                    const newRows = [...currentRows];
                    
                    const descIndex = newRows.findIndex(r => r.isDescription);
                    const descRow = descIndex >= 0 ? newRows.splice(descIndex, 1)[0] : { id: 'desc', date: '', acc: `      ${t.description}`, dr: '', cr: '', pr: '', isDescription: true };
                    
                    // Add rows until we have enough for Lines + Year (if needed)
                    // The description is added last.
                    const neededContentRows = requiredCount - 1; // remove desc from count
                    
                    while (newRows.length < neededContentRows) {
                        newRows.push({ id: Date.now() + Math.random(), date: '', acc: '', dr: '', cr: '', pr: '' });
                    }
                    
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
