// --- steps.js ---
import React from 'https://esm.sh/react@18.2.0';
import htm from 'https://esm.sh/htm';
import { Lock, Check, Printer } from 'https://esm.sh/lucide-react@0.263.1';
import { ActivityHelper } from './utils.js';

// Import all modular steps with their validation functions
import Step01Analysis from './steps/Step01Analysis.js';
import Step02Journalizing from './steps/Step02Journalizing.js';
import Step03Posting, { validateStep03 } from './steps/Step03Posting.js';
import Step04TrialBalance, { validateStep04 } from './steps/Step04TrialBalance.js'; // RENAMED & IMPORT VALIDATOR
import Step5Worksheet from './steps/Step5Worksheet.js';
import Step6FinancialStatements from './steps/Step6FinancialStatements.js';
import Step7AdjustingEntries from './steps/Step7AdjustingEntries.js';
import Step8ClosingEntries from './steps/Step8ClosingEntries.js';
import Step9PostClosingTB from './steps/Step9PostClosingTB.js';
import Step10ReversingEntries from './steps/Step10ReversingEntries.js';
import GenericStep from './steps/GenericStep.js';

const html = htm.bind(React.createElement);

export const TaskSection = ({ step, activityData, answers, stepStatus, onValidate, updateAnswerFns, isCurrentActiveTask, isPrevStepCompleted }) => {
    const stepId = step.id;
    const status = stepStatus[stepId] || { attempts: 3, completed: false, correct: false };
    const isLocked = !isPrevStepCompleted;
    const isCompleted = status.completed;
    const isStickyActive = !isLocked && !isCompleted;
    const { deferredExpenseMethod, deferredIncomeMethod } = activityData.config; // Extract config

    const handlePrint = () => {
        const content = document.querySelector(`.task-content-${stepId}`);
        if (!content) return;
        const printWindow = window.open('', '', 'height=600,width=800');
        printWindow.document.write('<html><head><title>Print</title><script src="https://cdn.tailwindcss.com"></script></head><body class="bg-white">');
        printWindow.document.write(ActivityHelper.getCustomPrintHeaderHTML());
        printWindow.document.write(ActivityHelper.getPrintStudentInfoHTML(`Task ${stepId}: ${step.title}`, step.description));
        printWindow.document.write(ActivityHelper.getRubricHTML(stepId, step.title));
        printWindow.document.write('<div class="printable-area">' + content.innerHTML + '</div>');
        printWindow.document.write(ActivityHelper.getCustomPrintFooterHTML());
        printWindow.document.close();
        setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
    };

    const handleStep01Change = (id, key, val) => updateAnswerFns.updateNestedAnswer(1, id.toString(), key, val);
    const handleStep02Change = (id, newRows) => updateAnswerFns.updateNestedAnswer(2, id.toString(), 'rows', newRows);
    const handleStep03Change = (key, val) => updateAnswerFns.updateAnswer(3, { ...(answers[3] || {}), [key]: val });
    const handleStep03TogglePR = (key) => {
        const cur = answers[3]?.journalPRs || {};
        updateAnswerFns.updateAnswer(3, {...(answers[3] || {}), journalPRs: {...cur, [key]: !cur[key]}});
    };
    const handleStep04Change = (key, val) => updateAnswerFns.updateAnswer(4, { ...(answers[4] || {}), [key]: val });
    const handleStep5Change = (type, payload) => {
        const stepAnswer = answers[stepId] || {};
        const currentFooters = stepAnswer.footers || {};
        if (type === 'rows') {
             updateAnswerFns.updateAnswer(5, { ...stepAnswer, rows: payload });
        } else if (type === 'footers') {
             const { section, field, val } = payload;
             const newSection = { ...currentFooters[section], [field]: val };
             updateAnswerFns.updateAnswer(5, { ...stepAnswer, footers: { ...currentFooters, [section]: newSection } });
        }
    };
    const handleStep6Change = (section, data) => updateAnswerFns.updateAnswer(6, { ...(answers[6] || {}), [section]: data });
    const handleStep7Change = (section, data) => updateAnswerFns.updateAnswer(7, { ...(answers[7] || {}), [section]: data });
    const handleStep8Change = (section, data) => updateAnswerFns.updateAnswer(8, { ...(answers[8] || {}), [section]: data });
    const handleStep9Change = (key, val) => updateAnswerFns.updateAnswer(9, { ...(answers[9] || {}), [key]: val });
    const handleStep10Change = (adjId, val) => updateAnswerFns.updateAnswer(10, { ...(answers[10] || {}), [adjId]: val });

    const handleGenericChange = (k, v) => updateAnswerFns.updateAnswer(stepId, { ...(answers[stepId] || {}), [k]: v });

    // --- SCORE DISPLAY LOGIC ---
    let scoreDisplay = null;
    
    // Step 2
    if (stepId === 2 && answers[2] && (status.completed || status.attempts < 3)) {
        if (typeof validateStep02 === 'function') {
            const res = validateStep02(activityData.transactions, answers[2]);
            if (res.maxScore > 0) {
                scoreDisplay = html`<span className="ml-3 font-mono text-sm font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded border border-blue-200">Score: ${res.score} of ${res.maxScore} - ([${res.letterGrade}])</span>`;
            }
        }
    }
    // Step 3
    else if (stepId === 3 && answers[3] && (status.completed || status.attempts < 3)) {
        if (typeof validateStep03 === 'function') {
            const res = validateStep03(activityData, answers[3]);
            if (res.maxScore > 0) {
                scoreDisplay = html`<span className="ml-3 font-mono text-sm font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded border border-blue-200">Score: ${res.score} of ${res.maxScore} - ([${res.letterGrade}])</span>`;
            }
        }
    }
    // Step 4 (NEW)
    else if (stepId === 4 && answers[4] && (status.completed || status.attempts < 3)) {
        if (typeof validateStep04 === 'function') {
            const res = validateStep04(activityData, answers[4]);
            if (res.maxScore > 0) {
                scoreDisplay = html`<span className="ml-3 font-mono text-sm font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded border border-blue-200">Score: ${res.score} of ${res.maxScore} - ([${res.letterGrade}])</span>`;
            }
        }
    }

    const renderStepContent = () => {
        if (isLocked) return html`<div className="p-8 text-center bg-gray-100 rounded text-gray-500"><${Lock} size=${32} className="mx-auto mb-2" /> Task Locked (Complete previous task to unlock)</div>`;
        // Show feedback if attempts are used OR if the task is marked completed (perfect score)
        const showFeedback = status.attempts < 3 || status.completed;
        
        if (stepId === 1) return html`<${Step01Analysis} transactions=${activityData.transactions} data=${answers[1] || {}} onChange=${handleStep01Change} showFeedback=${showFeedback} isReadOnly=${status.completed} />`;
        if (stepId === 2) return html`<${Step02Journalizing} transactions=${activityData.transactions} data=${answers[2] || {}} onChange=${handleStep02Change} showFeedback=${showFeedback} validAccounts=${activityData.validAccounts} isReadOnly=${status.completed} />`;
        if (stepId === 3) return html`<${Step03Posting} activityData=${activityData} data=${answers[3] || {}} onChange=${handleStep03Change} showFeedback=${showFeedback} validAccounts=${activityData.validAccounts} ledgerKey=${activityData.ledger} transactions=${activityData.transactions} beginningBalances=${activityData.beginningBalances} isReadOnly=${status.completed} journalPRs=${answers[3]?.journalPRs || {}} onTogglePR=${handleStep03TogglePR} matchedJournalEntries=${status.completed || showFeedback ? (answers[3]?.matched || new Set()) : null} />`;
        
        // --- UPDATED STEP 4 RENDER ---
        if (stepId === 4) return html`<${Step04TrialBalance} activityData=${activityData} transactions=${activityData.transactions} validAccounts=${activityData.validAccounts} beginningBalances=${activityData.beginningBalances} isSubsequentYear=${activityData.config.isSubsequentYear} data=${answers[4] || {}} onChange=${handleStep04Change} showFeedback=${showFeedback} isReadOnly=${status.completed} expectedLedger=${activityData.ledger} />`;
        
        if (stepId === 5) return html`<${Step5Worksheet} ledgerData=${activityData.ledger} adjustments=${activityData.adjustments} data=${answers[stepId] || {}} onChange=${handleStep5Change} showFeedback=${showFeedback} isReadOnly=${status.completed} />`;
        if (stepId === 6) return html`<${Step6FinancialStatements} ledgerData=${activityData.ledger} adjustments=${activityData.adjustments} activityData=${activityData} data=${answers[stepId] || {}} onChange=${handleStep6Change} showFeedback=${showFeedback} isReadOnly=${status.completed} />`;
        if (stepId === 7) return html`<${Step7AdjustingEntries} activityData=${activityData} data=${answers[stepId] || {}} onChange=${handleStep7Change} showFeedback=${showFeedback} isReadOnly=${status.completed} />`;
        if (stepId === 8) return html`<${Step8ClosingEntries} activityData=${activityData} data=${answers[stepId] || {}} onChange=${handleStep8Change} showFeedback=${showFeedback} isReadOnly=${status.completed} />`;
        if (stepId === 9) return html`<${Step9PostClosingTB} activityData=${activityData} data=${answers[stepId] || {}} onChange=${handleStep9Change} showFeedback=${showFeedback} isReadOnly=${status.completed} />`; 
        if (stepId === 10) return html`<${Step10ReversingEntries} activityData=${activityData} data=${answers[stepId] || {}} onChange=${handleStep10Change} showFeedback=${showFeedback} isReadOnly=${status.completed} />`;
        
        return html`<${GenericStep} stepId=${stepId} title=${step.title} onChange=${handleGenericChange} data=${answers[stepId]} />`;
    };

    // Calculate conditional instruction for the hardcoded Step 8 block
    const showDeferredNote = (deferredExpenseMethod === 'Expense' || deferredIncomeMethod === 'Income');
    const deferredLine = showDeferredNote ? "<li>Expense or Income method is to be used in accounting for Deferred Items.</li>" : "";

    return html`
        <div id=${`task-${stepId}`} className="mb-8">
            <div className=${`bg-white p-4 shadow-md rounded-lg mb-4 border-b border-gray-200 no-print ${isStickyActive ? 'task-sticky-header border-b-4 border-blue-600' : ''} ${isCompleted ? 'border-b-4 border-green-600' : ''}`}>
                <div className="flex justify-between items-start gap-4">
                    <div className="flex-1"><h2 className="text-2xl font-bold text-gray-800">Task #${stepId}: ${step.title}</h2><p className="text-gray-600 text-sm">${step.description}</p></div>
                    <div className="flex items-center gap-3">
                        ${isCompleted 
                            ? html`<span className=${`text-sm font-bold flex items-center bg-green-50 px-3 py-1 rounded border ${status.correct ? 'text-green-600 border-green-200' : 'text-red-600 border-red-200'}`}><${Check} size=${16} className="mr-1"/> ${status.correct ? 'Completed' : 'Completed (3 Attempts Used)'}</span>`
                            : isLocked 
                                ? html`<span className="text-gray-500 font-bold flex items-center bg-gray-100 px-3 py-1 rounded border border-gray-300"><${Lock} size=${16} className="mr-1"/> Locked</span>`
                                : html`<div className="text-right flex items-center">
                                    <div className="mr-3 text-xs font-semibold text-gray-500">Attempts: <span className=${status.attempts <= 1 ? 'text-red-500' : 'text-gray-700'}>${status.attempts}</span></div>
                                    <button onClick=${() => onValidate(stepId)()} disabled=${status.attempts <= 0} className=${`px-4 py-2 rounded font-bold text-white flex items-center gap-2 ${status.attempts > 0 ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-400'}`}><${Check} size=${18} /> Validate</button>
                                    ${scoreDisplay}
                                </div>`
                        }
                        <button onClick=${handlePrint} className="bg-red-600 text-white p-2 rounded-lg hover:bg-red-700 hidden sm:block"><${Printer} size=${18} /></button>
                    </div>
                </div>
                ${(stepId === 2) && html`<div className="mt-2 pt-2 border-t text-sm"><div className="bg-yellow-50 p-2 rounded border border-yellow-200" dangerouslySetInnerHTML=${{ __html: ActivityHelper.getInstructionsHTML(stepId, step.title, activityData.validAccounts, false, null, deferredExpenseMethod, deferredIncomeMethod) }} /></div>`}
                ${(stepId === 3) && html`<div className="mt-2 pt-2 border-t text-sm"><div className="bg-yellow-50 p-2 rounded border border-yellow-200" dangerouslySetInnerHTML=${{ __html: ActivityHelper.getInstructionsHTML(stepId, step.title, activityData.validAccounts, activityData.config.isSubsequentYear, activityData.beginningBalances, deferredExpenseMethod, deferredIncomeMethod) }} /></div>`}
                ${(stepId === 8) && html`<div className="mt-2 pt-2 border-t text-sm"><div className="bg-yellow-50 p-2 rounded border border-yellow-200"><p class="font-bold">Instructions:</p><ul class="list-disc list-inside space-y-1 ml-2"><li>Journalize the closing entries using the REID method (Revenue, Expenses, Income Summary, Drawings).</li><li dangerouslySetInnerHTML=${{ __html: deferredLine.replace(/<\/?li>/g, '') }} style=${{ display: showDeferredNote ? 'list-item' : 'none' }}></li><li>Post the closing entries to the General Ledger.</li><li>Ensure all nominal accounts (Revenues, Expenses, Drawings) have a zero balance.</li></ul></div></div>`}
            </div>
            <div className="no-print space-y-3 mb-6">
                ${stepId !== 2 && stepId !== 3 && stepId !== 7 && stepId !== 8 && html`<div className="bg-gray-100 p-3 rounded-lg border text-sm" dangerouslySetInnerHTML=${{ __html: ActivityHelper.getInstructionsHTML(stepId, step.title, activityData.validAccounts, false, null, deferredExpenseMethod, deferredIncomeMethod) }} />`}
                <div dangerouslySetInnerHTML=${{ __html: ActivityHelper.getRubricHTML(stepId, step.title) }} />
            </div>
            <div className=${`printable-area task-content-${stepId}`}>${renderStepContent()}</div>
        </div>
    `;
};
