// --- Step1Analysis.js ---
import React from 'https://esm.sh/react@18.2.0';
import htm from 'https://esm.sh/htm';
import { Check, X } from 'https://esm.sh/lucide-react@0.263.1';
import { EQUITY_CAUSES } from '../utils.js';

const html = htm.bind(React.createElement);

// --- HELPER: DRY Validation Logic ---
// We treat null, undefined, and "" as the same thing for the "Cause" field
const checkRow = (transaction, answer = {}) => {
    const isAssetCorrect = answer.A === transaction.analysis.assets;
    const isLiabCorrect = answer.L === transaction.analysis.liabilities;
    const isEquityCorrect = answer.E === transaction.analysis.equity;
    
    // Normalize Cause: treat undefined/null as empty string
    const targetCause = transaction.analysis.cause || '';
    const userCause = answer.Cause || '';
    const isCauseCorrect = targetCause === userCause;

    return {
        isAssetCorrect,
        isLiabCorrect,
        isEquityCorrect,
        isCauseCorrect,
        isRowFullyCorrect: isAssetCorrect && isLiabCorrect && isEquityCorrect && isCauseCorrect
    };
};

// --- EXPORTED VALIDATION FUNCTION (For App.js) ---
export const validateStep1 = (transactions, allAnswers) => {
    let correctCount = 0;
    transactions.forEach(t => {
        const { isRowFullyCorrect } = checkRow(t, allAnswers[t.id]);
        if (isRowFullyCorrect) correctCount++;
    });
    return correctCount === transactions.length;
};

// --- INTERNAL COMPONENTS ---
const StatusIcon = ({ correct, show }) => {
    if (!show) return null;
    return correct 
        ? html`<${Check} size=${14} className="text-green-600 inline ml-1" />` 
        : html`<${X} size=${14} className="text-red-600 inline ml-1" />`;
};

// --- MAIN COMPONENT ---
export default function Step1Analysis({ transactions = [], data, onChange, showFeedback, isReadOnly }) {
    if (!transactions || transactions.length === 0) return html`<div className="p-4 bg-red-50 text-red-600 rounded border border-red-200">No transactions generated. Please go back and regenerate the activity.</div>`;
    
    return html`
        <div className="overflow-x-auto min-h-[200px]">
            <table className="w-full text-sm border-collapse border min-w-[900px]">
                <thead className="bg-gray-100">
                    <tr>
                        <th className="border p-2">Date</th>
                        <th className="border p-2 w-1/3">Transaction</th>
                        <th className="border p-2">Assets</th>
                        <th className="border p-2">Liabilities</th>
                        <th className="border p-2">Equity</th>
                        <th className="border p-2 w-1/5">Cause</th>
                    </tr>
                </thead>
                <tbody>
                    ${transactions.map((t) => {
                        const ans = data[t.id] || {};
                        // USE THE HELPER HERE to ensure UI matches Logic
                        const status = checkRow(t, ans);

                        return html`
                            <tr key=${t.id} className="hover:bg-gray-50">
                                <td className="border p-2 text-center whitespace-nowrap">${t.date}</td>
                                <td className="border p-2">${t.description}</td>
                                
                                ${/* Assets Column */''}
                                <td className="border p-2">
                                    <div className="flex items-center">
                                        <select className=${`w-full bg-white border rounded p-1 ${showFeedback && !status.isAssetCorrect ? 'border-red-300 bg-red-50' : ''}`} 
                                            value=${ans.A || '-'} 
                                            onChange=${(e) => onChange(t.id, 'A', e.target.value)} 
                                            disabled=${isReadOnly}>
                                            <option>-</option><option>Increase</option><option>Decrease</option><option>No Effect</option>
                                        </select>
                                        <${StatusIcon} show=${showFeedback} correct=${status.isAssetCorrect} />
                                    </div>
                                </td>

                                ${/* Liabilities Column */''}
                                <td className="border p-2">
                                    <div className="flex items-center">
                                        <select className=${`w-full bg-white border rounded p-1 ${showFeedback && !status.isLiabCorrect ? 'border-red-300 bg-red-50' : ''}`} 
                                            value=${ans.L || '-'} 
                                            onChange=${(e) => onChange(t.id, 'L', e.target.value)} 
                                            disabled=${isReadOnly}>
                                            <option>-</option><option>Increase</option><option>Decrease</option><option>No Effect</option>
                                        </select>
                                        <${StatusIcon} show=${showFeedback} correct=${status.isLiabCorrect} />
                                    </div>
                                </td>

                                ${/* Equity Column */''}
                                <td className="border p-2">
                                    <div className="flex items-center">
                                        <select className=${`w-full bg-white border rounded p-1 ${showFeedback && !status.isEquityCorrect ? 'border-red-300 bg-red-50' : ''}`} 
                                            value=${ans.E || '-'} 
                                            onChange=${(e) => onChange(t.id, 'E', e.target.value)} 
                                            disabled=${isReadOnly}>
                                            <option>-</option><option>Increase</option><option>Decrease</option><option>No Effect</option>
                                        </select>
                                        <${StatusIcon} show=${showFeedback} correct=${status.isEquityCorrect} />
                                    </div>
                                </td>

                                ${/* Cause Column - FIX APPLIED HERE VIA STATUS HELPER */''}
                                <td className="border p-2">
                                    <div className="flex items-center">
                                        <select className=${`w-full bg-white border rounded p-1 ${showFeedback && !status.isCauseCorrect ? 'border-red-300 bg-red-50' : ''}`} 
                                            value=${ans.Cause || ''} 
                                            onChange=${(e) => onChange(t.id, 'Cause', e.target.value)} 
                                            disabled=${isReadOnly}>
                                            ${EQUITY_CAUSES.map(c => html`<option key=${c} value=${c}>${c || '-'}</option>`)}
                                        </select>
                                        <${StatusIcon} show=${showFeedback} correct=${status.isCauseCorrect} />
                                    </div>
                                </td>
                            </tr>
                        `;
                    })}
                </tbody>
            </table>
        </div>
    `;
}
