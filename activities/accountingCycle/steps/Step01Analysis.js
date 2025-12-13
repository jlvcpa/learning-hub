// --- Step01Analysis.js ---
import React from 'https://esm.sh/react@18.2.0';
import htm from 'https://esm.sh/htm';
import { Check, X } from 'https://esm.sh/lucide-react@0.263.1';
import { EQUITY_CAUSES, getLetterGrade } from '../utils.js'; // Added getLetterGrade import

const html = htm.bind(React.createElement);

// --- HELPER: DRY Validation Logic ---
const checkRow = (transaction, answer = {}) => {
    const isAssetCorrect = answer.A === transaction.analysis.assets;
    const isLiabCorrect = answer.L === transaction.analysis.liabilities;
    const isEquityCorrect = answer.E === transaction.analysis.equity;
    
    // Normalize Cause: treat undefined/null as empty string
    const targetCause = transaction.analysis.cause || '';
    const userCause = answer.Cause || '';
    const isCauseCorrect = targetCause === userCause;

    // Calculate Score for this row (4 points possible)
    let score = 0;
    if (isAssetCorrect) score++;
    if (isLiabCorrect) score++;
    if (isEquityCorrect) score++;
    if (isCauseCorrect) score++;

    return {
        isAssetCorrect,
        isLiabCorrect,
        isEquityCorrect,
        isCauseCorrect,
        isRowFullyCorrect: isAssetCorrect && isLiabCorrect && isEquityCorrect && isCauseCorrect,
        score,
        maxScore: 4
    };
};

// --- EXPORTED VALIDATION FUNCTION (For App.js) ---
export const validateStep01 = (transactions, allAnswers) => {
    let totalScore = 0;
    let totalMax = 0;
    let perfectRows = 0;

    transactions.forEach(t => {
        const { score, maxScore, isRowFullyCorrect } = checkRow(t, allAnswers[t.id]);
        totalScore += score;
        totalMax += maxScore;
        if (isRowFullyCorrect) perfectRows++;
    });

    return {
        isCorrect: perfectRows === transactions.length, // Must be 100% perfect to auto-advance
        score: totalScore,
        maxScore: totalMax,
        letterGrade: getLetterGrade(totalScore, totalMax)
    };
};

// --- INTERNAL COMPONENTS ---
const StatusIcon = ({ correct, show }) => {
    if (!show) return null;
    return correct 
        ? html`<${Check} size=${14} className="text-green-600 inline ml-1" />` 
        : html`<${X} size=${14} className="text-red-600 inline ml-1" />`;
};

// --- MAIN COMPONENT ---
export default function Step01Analysis({ transactions = [], data, onChange, showFeedback, isReadOnly }) {
    if (!transactions || transactions.length === 0) return html`<div className="p-4 bg-red-50 text-red-600 rounded border border-red-200">No transactions generated. Please go back and regenerate the activity.</div>`;
    
    // Calculate result for display
    const result = validateStep01(transactions, data);

    return html`
        <div className="flex flex-col gap-4">
            ${showFeedback && html`
                <div className="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-2 flex justify-between items-center shadow-sm">
                    <span className="font-bold">Validation Results:</span>
                    <span className="font-mono font-bold text-lg">Score: ${result.score} of ${result.maxScore} - (${result.letterGrade})</span>
                </div>
            `}

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

                                    ${/* Cause Column */''}
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
        </div>
    `;
}
