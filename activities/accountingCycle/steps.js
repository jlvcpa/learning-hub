// -------------------
// --- steps.js ---
// ------------------
import React from 'https://esm.sh/react@18.2.0';
import htm from 'https://esm.sh/htm';
import { Lock, Check, Printer } from 'https://esm.sh/lucide-react@0.263.1';
import { ActivityHelper } from './utils.js';

// Import all modular steps with their validation functions
import Step01Analysis from './steps/Step01Analysis.js';
import Step02Journalizing from './steps/Step02Journalizing.js';
import Step03Posting, { validateStep03 } from './steps/Step03Posting.js';
import Step04TrialBalance, { validateStep04 } from './steps/Step04TrialBalance.js';
import Step05Worksheet, { validateStep05 } from './steps/Step05Worksheet.js';
import Step06FinancialStatements, { validateStep06 } from './steps/Step06FinancialStatements.js';
import Step07AdjustingEntries, { validateStep07 } from './steps/Step07AdjustingEntries.js'; 
import Step08ClosingEntries, { validateStep08 } from './steps/Step08ClosingEntries.js'; 
import Step09PostClosingTB, { validateStep09 } from './steps/Step09PostClosingTB.js'; 
import Step10ReversingEntries, { validateStep10 } from './steps/Step10ReversingEntries.js';
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
    const handleStep05Change = (type, payload) => {
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
    const handleStep06Change = (section, data) => updateAnswerFns.updateAnswer(6, { ...(answers[6] || {}), [section]: data });
    const handleStep07Change = (section, data) => updateAnswerFns.updateAnswer(7, { ...(answers[7] || {}), [section]: data });
    const handleStep08Change = (section, data) => updateAnswerFns.updateAnswer(8, { ...(answers[8] || {}), [section]: data });
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
    // Step 4
    else if (stepId === 4 && answers[4] && (status.completed || status.attempts < 3)) {
        if (typeof validateStep04 === 'function') {
            const res = validateStep04(activityData, answers[4]);
            if (res.maxScore > 0) {
                scoreDisplay = html`<span className="ml-3 font-mono text-sm font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded border border-blue-200">Score: ${res.score} of ${res.maxScore} - ([${res.letterGrade}])</span>`;
            }
        }
    }
    // Step 5
    else if (stepId === 5 && answers[5] && (status.completed || status.attempts < 3)) {
        if (typeof validateStep05 === 'function') {
            const res = validateStep05(activityData.ledger, activityData.adjustments, answers[5]);
            if (res.maxScore > 0) {
                scoreDisplay = html`<span className="ml-3 font-mono text-sm font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded border border-blue-200">Score: ${res.score} of ${res.maxScore} - ([${res.letterGrade}])</span>`;
            }
        }
    }
    // Step 6
    else if (stepId === 6 && answers[6] && (status.completed || status.attempts < 3)) {
        if (typeof validateStep06 === 'function') {
            const res = validateStep06(activityData.ledger, activityData.adjustments, activityData, answers[6]);
            if (res.maxScore > 0) {
                scoreDisplay = html`<span className="ml-3 font-mono text-sm font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded border border-blue-200">Score: ${res.score} of ${res.maxScore} - ([${res.letterGrade}])</span>`;
            }
        }
    }
    // Step 7
    else if (stepId === 7 && answers[7] && (status.completed || status.attempts < 3)) {
        if (typeof validateStep07 === 'function') {
            const res = validateStep07(activityData.adjustments, answers[7].journal || {}, answers[7].ledger || {}, activityData.transactions);
            if (res.maxScore > 0) {
                scoreDisplay = html`<span className="ml-3 font-mono text-sm font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded border border-blue-200">Score: ${res.score} of ${res.maxScore} - ([${res.letterGrade}])</span>`;
            }
        }
    }
    // Step 8
    else if (stepId === 8 && answers[8] && (status.completed || status.attempts < 3)) {
        if (typeof validateStep08 === 'function') {
            const res = validateStep08(answers[8], activityData);
            if (res.maxScore > 0) {
                scoreDisplay = html`<span className="ml-3 font-mono text-sm font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded border border-blue-200">Score: ${res.score} of ${res.maxScore} - ([${res.letterGrade}])</span>`;
            }
        }
    }
    // Step 9
    else if (stepId === 9 && answers[9] && (status.completed || status.attempts < 3)) {
        if (typeof validateStep09 === 'function') {
            const res = validateStep09(answers[9], activityData);
            if (res.maxScore > 0) {
                scoreDisplay = html`<span className="ml-3 font-mono text-sm font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded border border-blue-200">Score: ${res.score} of ${res.maxScore} - ([${res.letterGrade}])</span>`;
            }
        }
    }

    else if (stepId === 10 && answers[10] && (status.completed || status.attempts < 3)) {
        if (typeof validateStep10 === 'function') {
            const res = validateStep10(answers[10], activityData);
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
        if (stepId === 4) return html`<${Step04TrialBalance} activityData=${activityData} transactions=${activityData.transactions} validAccounts=${activityData.validAccounts} beginningBalances=${activityData.beginningBalances} isSubsequentYear=${activityData.config.isSubsequentYear} data=${answers[4] || {}} onChange=${handleStep04Change} showFeedback=${showFeedback} isReadOnly=${status.completed} expectedLedger=${activityData.ledger} />`;
        if (stepId === 5) return html`<${Step05Worksheet} ledgerData=${activityData.ledger} adjustments=${activityData.adjustments} data=${answers[stepId] || {}} onChange=${handleStep05Change} showFeedback=${showFeedback} isReadOnly=${status.completed} />`;
        if (stepId === 6) return html`<${Step06FinancialStatements} ledgerData=${activityData.ledger} adjustments=${activityData.adjustments} activityData=${activityData} data=${answers[stepId] || {}} onChange=${handleStep06Change} showFeedback=${showFeedback} isReadOnly=${status.completed} />`;
        if (stepId === 7) return html`<${Step07AdjustingEntries} activityData=${activityData} data=${answers[stepId] || {}} onChange=${handleStep07Change} showFeedback=${showFeedback} isReadOnly=${status.completed} />`;
        if (stepId === 8) return html`<${Step08ClosingEntries} activityData=${activityData} data=${answers[stepId] || {}} onChange=${handleStep08Change} showFeedback=${showFeedback} isReadOnly=${status.completed} />`;
        if (stepId === 9) {
            // We only need to inject the Closing Entries from Step 8 so the Ledger View can show them.
            // The component handles its own validation logic internally.
            const closingJournal = answers[8]?.journal; 
            const step9Data = { ...(answers[stepId] || {}), closingJournal };

            return html`<${Step09PostClosingTB} activityData=${activityData} data=${step9Data} onChange=${handleStep9Change} showFeedback=${showFeedback} isReadOnly=${status.completed} />`;
        }
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
