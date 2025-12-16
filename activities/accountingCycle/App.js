// -----------------
// --- App.js ------
// -----------------
import React, { useState, useCallback, useEffect, useRef } from 'https://esm.sh/react@18.2.0';
import htm from 'https://esm.sh/htm';
import { Book, Check, RefreshCw, ArrowLeft, Save, Printer, FileText, Trash2, AlertCircle, Download, Loader } from 'https://esm.sh/lucide-react@0.263.1';
import { APP_VERSION, STEPS, generateTransactions, generateBeginningBalances, sortAccounts, generateAdjustments, getAccountType } from './utils.js';
import { TaskSection } from './steps.js';

// Import all modular steps
import Step01Analysis, { validateStep01 } from './steps/Step01Analysis.js';
import Step02Journalizing, { validateStep02 } from './steps/Step02Journalizing.js';
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

// --- COMPONENT: Full Report View (Hidden, used for Printing) ---
const ReportView = ({ activityData, answers }) => {
    return html`
        <div id="full-report-container" className="hidden">
            <div id="print-footer-template">
                <div className="w-full px-8 pb-4 font-serif text-xs">
                    <div className="flex justify-between items-end border-t border-gray-400 pt-2 mb-1">
                        <span className="font-bold">FABM 2</span>
                        <span className="page-number-slot"></span> 
                    </div>
                    <div className="border border-gray-800 p-1 text-center font-bold">
                        [4Cs: Christ-centeredness, Competence, Character, Compassion]
                    </div>
                </div>
            </div>

            <div className="p-8 space-y-8 report-body font-serif text-sm">
                <div className="text-center border-b-2 border-gray-800 pb-4 mb-8">
                    <h1 className="text-2xl font-bold text-blue-900 uppercase">Fundamentals of Accountancy, Business and Management 2</h1>
                    <h2 className="text-xl font-bold text-gray-700 mt-2">Comprehensive Activity Report</h2>
                    <div className="mt-4 flex justify-center gap-8">
                        <p><strong>Company:</strong> ${activityData.config.businessType} - ${activityData.config.ownership}</p>
                        <p><strong>Period:</strong> ${activityData.config.isSubsequentYear ? 'Subsequent Year' : 'First Year'}</p>
                    </div>
                </div>

                ${activityData.steps.map(step => {
                    const stepId = step.id;
                    const stepAnswer = answers[stepId] || {};
                    const props = {
                        activityData, 
                        data: stepAnswer, 
                        isReadOnly: true, 
                        showFeedback: true,
                        onChange: () => {} 
                    };

                    let content = null;
                    if (stepId === 1) content = html`<${Step01Analysis} transactions=${activityData.transactions} ...${props} />`;
                    else if (stepId === 2) content = html`<${Step02Journalizing} transactions=${activityData.transactions} validAccounts=${activityData.validAccounts} ...${props} />`;
                    else if (stepId === 3) {
                         const journalPRs = stepAnswer.journalPRs || {};
                         content = html`<${Step03Posting} validAccounts=${activityData.validAccounts} ledgerKey=${activityData.ledger} transactions=${activityData.transactions} beginningBalances=${activityData.beginningBalances} ...${props} journalPRs=${journalPRs} />`;
                    }
                    else if (stepId === 4) content = html`<${Step04TrialBalance} transactions=${activityData.transactions} validAccounts=${activityData.validAccounts} beginningBalances=${activityData.beginningBalances} isSubsequentYear=${activityData.config.isSubsequentYear} expectedLedger=${activityData.ledger} ...${props} />`;
                    else if (stepId === 5) content = html`<${Step05Worksheet} ledgerData=${activityData.ledger} adjustments=${activityData.adjustments} ...${props} />`;
                    else if (stepId === 6) content = html`<${Step06FinancialStatements} ledgerData=${activityData.ledger} adjustments=${activityData.adjustments} ...${props} />`;
                    else if (stepId === 7) content = html`<${Step07AdjustingEntries} ...${props} />`;
                    else if (stepId === 8) {
                        let valRes = null;
                        if(typeof validateStep08 === 'function') valRes = validateStep08(stepAnswer, activityData);
                        content = html`<${Step08ClosingEntries} ...${props} validationResult=${valRes} />`;
                    }
                    else if (stepId === 9) {
                         const closingJournal = answers[8]?.journal;
                         const step9Data = { ...stepAnswer, closingJournal };
                         content = html`<${Step09PostClosingTB} ...${props} data=${step9Data} />`;
                    }
                    else if (stepId === 10) content = html`<${Step10ReversingEntries} ...${props} />`;
                    else content = html`<${GenericStep} stepId=${stepId} title=${step.title} ...${props} />`;

                    return html`
                        <div key=${stepId} className="report-section mb-10 break-inside-avoid">
                            <h3 className="text-lg font-bold text-gray-800 border-b border-gray-300 mb-4 pb-1 uppercase">
                                Task ${stepId}: ${step.title}
                            </h3>
                            ${content}
                        </div>
                        ${(stepId === 5 || stepId === 6 || stepId === 9) ? html`<div className="page-break"></div>` : ''}
                    `;
                })}
            </div>
        </div>
    `;
};


const TeacherDashboard = ({ onGenerate, onResume }) => {
    // PERSISTENCE
    const [businessType, setBusinessType] = useState(() => localStorage.getItem('ac_businessType') || 'Service');
    const [ownership, setOwnership] = useState(() => localStorage.getItem('ac_ownership') || 'Sole Proprietorship');
    const [inventorySystem, setInventorySystem] = useState(() => localStorage.getItem('ac_inventorySystem') || 'Periodic');
    const [numTransactions, setNumTransactions] = useState(() => Number(localStorage.getItem('ac_numTransactions')) || 10);
    const [selectedSteps, setSelectedSteps] = useState(() => localStorage.getItem('ac_selectedSteps') ? JSON.parse(localStorage.getItem('ac_selectedSteps')) : STEPS.map(s => s.id));
    const [fsFormat, setFsFormat] = useState(() => localStorage.getItem('ac_fsFormat') || 'Single');
    const [includeCashFlows, setIncludeCashFlows] = useState(() => localStorage.getItem('ac_includeCashFlows') === 'true');
    const [enableAutoSave, setEnableAutoSave] = useState(() => localStorage.getItem('ac_enableAutoSave') === 'true');
    const [isGenerating, setIsGenerating] = useState(false);

    // Standard Options
    const [includeTradeDiscounts, setIncludeTradeDiscounts] = useState(false);
    const [includeCashDiscounts, setIncludeCashDiscounts] = useState(false);
    const [includeFreight, setIncludeFreight] = useState(false);
    const [numPartners, setNumPartners] = useState(2);
    const [isSubsequentYear, setIsSubsequentYear] = useState(false);
    const [deferredExpenseMethod, setDeferredExpenseMethod] = useState('Asset');
    const [deferredIncomeMethod, setDeferredIncomeMethod] = useState('Liability');
    
    // Check for saved progress
    const [savedProgress, setSavedProgress] = useState(null);

    useEffect(() => { 
        const saved = localStorage.getItem('ac_student_progress');
        if (saved) {
            try {
                setSavedProgress(JSON.parse(saved));
            } catch (e) { console.error("Error loading progress", e); }
        }
    }, []);

    // PERSISTENCE EFFECTS
    useEffect(() => { localStorage.setItem('ac_businessType', businessType); }, [businessType]);
    useEffect(() => { localStorage.setItem('ac_ownership', ownership); }, [ownership]);
    useEffect(() => { localStorage.setItem('ac_inventorySystem', inventorySystem); }, [inventorySystem]);
    useEffect(() => { localStorage.setItem('ac_numTransactions', numTransactions); }, [numTransactions]);
    useEffect(() => { localStorage.setItem('ac_selectedSteps', JSON.stringify(selectedSteps)); }, [selectedSteps]);
    useEffect(() => { localStorage.setItem('ac_fsFormat', fsFormat); }, [fsFormat]);
    useEffect(() => { localStorage.setItem('ac_includeCashFlows', includeCashFlows); }, [includeCashFlows]);
    useEffect(() => { localStorage.setItem('ac_enableAutoSave', enableAutoSave); }, [enableAutoSave]);

    const toggleStep = (id) => setSelectedSteps(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    const handleSelectAll = (e) => e.target.checked ? setSelectedSteps(STEPS.map(s => s.id)) : setSelectedSteps([]);
    const isAllSelected = selectedSteps.length === STEPS.length;
    const isMerchOrMfg = businessType === 'Merchandising' || businessType === 'Manufacturing';

    const clearSave = () => {
        if(confirm("Are you sure you want to delete the saved progress?")) {
            localStorage.removeItem('ac_student_progress');
            setSavedProgress(null);
        }
    };

    const handleDownloadStandalone = async () => {
        if (window.location.protocol === 'file:') {
            alert("Security Restriction: Browsers block reading files directly from the hard drive (file:// protocol).\n\nPlease host this on GitHub Pages or use a local server.");
            return;
        }

        setIsGenerating(true);
        const config = { 
            businessType, ownership, inventorySystem, 
            numTransactions: Number(numTransactions) || 10, 
            selectedSteps, numPartners: Number(numPartners) || 2, 
            isSubsequentYear, deferredExpenseMethod, deferredIncomeMethod, 
            fsFormat, includeCashFlows, enableAutoSave, 
            options: { includeTradeDiscounts, includeCashDiscounts, includeFreight } 
        };
        await onGenerate(config, true); 
        setIsGenerating(false);
    };

    return html`
        <div className="bg-white p-6 rounded-lg shadow-md max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-6 border-b pb-2">
                 <h2 className="text-2xl font-bold text-gray-800">Activity Configuration</h2>
                 ${savedProgress && html`
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-green-600 font-bold bg-green-50 px-2 py-1 rounded">Resume Available</span>
                        <button onClick=${() => onResume(savedProgress)} className="bg-green-600 text-white text-xs px-3 py-1 rounded hover:bg-green-700 flex items-center gap-1"><${FileText} size=${14}/> Resume Activity</button>
                        <button onClick=${clearSave} className="text-red-500 hover:bg-red-50 p-1 rounded"><${Trash2} size=${14}/></button>
                    </div>
                 `}
            </div>
            
            <div className="mb-6 bg-yellow-50 p-3 rounded border border-yellow-200 flex items-center justify-between">
                <div>
                    <h3 className="font-bold text-yellow-900 text-sm">Student Session Settings</h3>
                    <p className="text-xs text-yellow-700">Enable this to allow students to close the browser and continue later on the same device.</p>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                    <span className="text-sm font-bold text-gray-700">Enable Auto-Save to Device</span>
                    <input type="checkbox" checked=${enableAutoSave} onChange=${(e)=>setEnableAutoSave(e.target.checked)} className="rounded text-green-600 focus:ring-green-500 w-5 h-5"/>
                </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6 items-end">
                <div className="text-left">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Business Organization</label>
                    <select value=${businessType} onChange=${(e) => setBusinessType(e.target.value)} className="w-full p-2 border rounded-md">
                        <option>Service</option>
                        <option>Merchandising</option>
                        <option>Manufacturing</option>
                        <option>Banking</option>
                    </select>
                </div>
                <div className="text-center">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Form of Ownership</label>
                    <select value=${ownership} onChange=${(e) => setOwnership(e.target.value)} className="w-full p-2 border rounded-md">
                        <option>Sole Proprietorship</option>
                        <option>Partnership</option>
                        <option>One Person Corporation</option><option>Cooperative</option>
                    </select>
                </div>
                <div className="text-right">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Number of Transactions</label>
                    <input type="number" min="5" max="30" value=${numTransactions} onChange=${(e) => setNumTransactions(e.target.value)} className="w-full p-2 border rounded-md text-right" />
                </div>
            </div>
            
            ${isMerchOrMfg && html`
                <div className="bg-blue-50 p-4 rounded border border-blue-200 mb-6">
                    <h3 className="font-bold text-blue-900 mb-3 text-sm uppercase">Merchandising & Manufacturing Options</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Inventory System</label>
                            <select value=${inventorySystem} onChange=${(e) => setInventorySystem(e.target.value)} className="w-full p-2 border rounded-md bg-white">
                                <option>Periodic</option>
                                <option>Perpetual</option>
                            </select>
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="font-medium text-sm text-gray-700">Include Transactions:</label>
                            <label className="flex items-center gap-2 cursor-pointer hover:bg-blue-100 p-1 rounded">
                                <input type="checkbox" checked=${includeTradeDiscounts} onChange=${(e) => setIncludeTradeDiscounts(e.target.checked)} className="rounded text-blue-600 focus:ring-blue-500" />
                                <span className="text-sm">Trade Discounts</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer hover:bg-blue-100 p-1 rounded">
                                <input type="checkbox" checked=${includeCashDiscounts} onChange=${(e) => setIncludeCashDiscounts(e.target.checked)} className="rounded text-blue-600 focus:ring-blue-500" />
                                <span className="text-sm">Cash Discounts (e.g. 2/10, n/30)</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer hover:bg-blue-100 p-1 rounded">
                                <input type="checkbox" checked=${includeFreight} onChange=${(e) => setIncludeFreight(e.target.checked)} className="rounded text-blue-600 focus:ring-blue-500" />
                                <span className="text-sm">Freight In/Out</span>
                            </label>
                        </div>
                    </div>
                </div>
            `}

            <div className="bg-green-50 p-4 rounded border border-green-200 mb-6">
                 <h3 className="font-bold text-green-900 mb-3 text-sm uppercase">Step 6: Financial Statement Options</h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Income Statement Format</label>
                        <select value=${fsFormat} onChange=${(e) => setFsFormat(e.target.value)} className="w-full p-2 border rounded-md">
                            <option value="Single">Single-Step</option>
                            <option value="Multi">Multi-Step</option>
                        </select>
                    </div>
                    <div className="flex items-end pb-2">
                        <label className="flex items-center gap-2 cursor-pointer hover:bg-green-100 p-2 rounded w-full border border-transparent hover:border-green-300">
                            <input type="checkbox" checked=${includeCashFlows} onChange=${(e) => setIncludeCashFlows(e.target.checked)} className="rounded text-green-600 focus:ring-green-500 w-5 h-5" />
                            <span className="font-medium text-gray-800">Include Statement of Cash Flows</span>
                        </label>
                    </div>
                 </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="bg-orange-50 p-3 rounded border border-orange-200">
                    <h3 className="font-bold text-orange-900 mb-3 text-sm text-left">Deferred Items Method</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="text-left">
                            <label className="block text-xs font-medium text-gray-700 mb-1">Deferred Expense</label>
                            <select value=${deferredExpenseMethod} onChange=${(e)=>setDeferredExpenseMethod(e.target.value)} className="w-full p-1 border rounded text-sm">
                                <option value="Asset">Asset Method (Default)</option>
                                <option value="Expense">Expense Method</option>
                            </select>
                        </div>
                        <div className="text-right">
                            <label className="block text-xs font-medium text-gray-700 mb-1">Deferred Income</label>
                            <select value=${deferredIncomeMethod} onChange=${(e)=>setDeferredIncomeMethod(e.target.value)} className="w-full p-1 border rounded text-sm text-right">
                                <option value="Liability">Liability Method (Default)</option>
                                <option value="Income">Income Method</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="bg-purple-50 p-3 rounded border border-purple-200">
                    <h3 className="font-bold text-purple-900 mb-2 text-sm text-right">Accounting Period</h3>
                    <div className="flex flex-col gap-2 items-end">
                        <label className="flex items-center gap-2 cursor-pointer justify-end w-full">
                            <span className="text-sm">First Year of Operations (Start from zero)</span>
                            <input type="radio" checked=${!isSubsequentYear} onChange=${() => setIsSubsequentYear(false)} />
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer justify-end w-full">
                            <span className="text-sm">Subsequent Year (Has Beginning Balances)</span>
                            <input type="radio" checked=${isSubsequentYear} onChange=${() => setIsSubsequentYear(true)} />
                        </label>
                    </div>
                </div>
            </div>

            <div className="mb-8">
                <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">Include Accounting Cycle Steps</label>
                    <label className="flex items-center space-x-2 text-sm text-blue-600 cursor-pointer bg-blue-50 px-3 py-1 rounded">
                        <input type="checkbox" checked=${isAllSelected} onChange=${handleSelectAll} />
                        <span className="font-semibold">${isAllSelected ? 'Deselect All' : 'Select All'}</span>
                    </label>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-72 overflow-y-auto border p-4 rounded-md bg-gray-50">
                    ${STEPS.map(step => html`
                        <div key=${step.id} className="flex items-start space-x-2">
                            <input type="checkbox" checked=${selectedSteps.includes(step.id)} onChange=${() => toggleStep(step.id)} className="mt-1" />
                            <div>
                                <span className="font-semibold block text-sm">Step ${step.id}: ${step.title}</span>
                                <span className="text-xs text-gray-500">${step.description}</span>
                            </div>
                        </div>
                    `)}
                </div>
            </div>

            <div className="flex gap-4">
                <button onClick=${() => onGenerate({ businessType, ownership, inventorySystem, numTransactions: Number(numTransactions) || 10, selectedSteps, numPartners: Number(numPartners) || 2, isSubsequentYear, deferredExpenseMethod, deferredIncomeMethod, fsFormat, includeCashFlows, enableAutoSave, options: { includeTradeDiscounts, includeCashDiscounts, includeFreight } })} className="flex-1 bg-blue-600 text-white py-3 rounded-md hover:bg-blue-700 font-bold flex items-center justify-center gap-2"><${RefreshCw} size=${20} /> Generate Activity</button>
                <button onClick=${handleDownloadStandalone} disabled=${isGenerating} className=${`bg-gray-800 text-white py-3 px-6 rounded-md hover:bg-black font-bold flex items-center justify-center gap-2 ${isGenerating ? 'opacity-70 cursor-wait' : ''}`}>
                    ${isGenerating ? html`<${Loader} size=${20} className="animate-spin"/>` : html`<${Download} size=${20} />`}
                    Download as HTML File
                </button>
            </div>
            <div className="mt-4 pt-4 border-t text-xs text-gray-400 text-center">${APP_VERSION}</div>
        </div>
    `;
};

const App = () => {
    // STUDENT MODE CHECK
    const preloadedData = window.STUDENT_CONFIG || null;

    const [mode, setMode] = useState(preloadedData ? 'activity' : 'config');
    const [activityData, setActivityData] = useState(preloadedData);
    const [currentStepIndex, setCurrentStepIndex] = useState(0); 
    const [stepStatus, setStepStatus] = useState(preloadedData ? preloadedData.initialStatus : {});
    const [answers, setAnswers] = useState({});
    
    // Auto-Save Effect
    useEffect(() => {
        if (activityData?.config?.enableAutoSave && mode === 'activity') {
            const progress = {
                activityData,
                currentStepIndex,
                stepStatus,
                answers,
                timestamp: Date.now()
            };
            localStorage.setItem('ac_student_progress', JSON.stringify(progress));
        }
    }, [answers, stepStatus, currentStepIndex, activityData, mode]);

    const updateAnswer = useCallback((stepId, data) => setAnswers(p => ({ ...p, [stepId]: data })), []);
    const updateNestedAnswer = useCallback((stepId, key, subKey, value) => setAnswers(prev => { const stepData = prev[stepId] || {}; const keyData = stepData[key] || {}; return { ...prev, [stepId]: { ...stepData, [key]: { ...keyData, [subKey]: value } } }; }), []);
    
    const updateTrialBalanceAnswer = useCallback((stepId, acc, side, val) => {
        setAnswers(prev => {
            const stepData = prev[stepId] || {};
            const accData = stepData[acc] || {};
            return { ...prev, [stepId]: { ...stepData, [acc]: { ...accData, [side]: val } } };
        });
    }, []);

    const handleResume = (savedData) => {
        setActivityData(savedData.activityData);
        setStepStatus(savedData.stepStatus);
        setAnswers(savedData.answers);
        setCurrentStepIndex(savedData.currentStepIndex);
        setMode('activity');
        setTimeout(() => document.getElementById(`task-${savedData.activityData.steps[savedData.currentStepIndex].id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
    };

    const generateData = (config) => {
        const transactions = generateTransactions(config.numTransactions, config.businessType, config.ownership, config.inventorySystem, config.options, config.isSubsequentYear, config.deferredExpenseMethod, config.deferredIncomeMethod);
        const usedAccounts = new Set();
        transactions.forEach(t => { t.debits.forEach(d => usedAccounts.add(d.account)); t.credits.forEach(c => usedAccounts.add(c.account)); });
        let beginningBalances = null;
        if (config.isSubsequentYear) {
            beginningBalances = generateBeginningBalances(config.businessType, config.ownership);
            Object.keys(beginningBalances.balances).forEach(acc => { if (!usedAccounts.has(acc)) usedAccounts.add(acc); });
        }
        const finalValidAccounts = sortAccounts(Array.from(usedAccounts));
        const ledgerAgg = {};
        if (beginningBalances) Object.keys(beginningBalances.balances).forEach(acc => ledgerAgg[acc] = { debit: beginningBalances.balances[acc].dr, credit: beginningBalances.balances[acc].cr });
        transactions.forEach(t => {
            t.debits.forEach(d => { if(!ledgerAgg[d.account]) ledgerAgg[d.account] = { debit: 0, credit: 0 }; ledgerAgg[d.account].debit += d.amount; });
            t.credits.forEach(c => { if(!ledgerAgg[c.account]) ledgerAgg[c.account] = { debit: 0, credit: 0 }; ledgerAgg[c.account].credit += c.amount; });
        });
        const adjustments = generateAdjustments(ledgerAgg, config.businessType, config.deferredExpenseMethod, config.deferredIncomeMethod);
        const initialStatus = {};
        const selectedSteps = STEPS.filter(s => config.selectedSteps.includes(s.id));
        selectedSteps.forEach((s) => { initialStatus[s.id] = { completed: false, attempts: 3, correct: false }; });
        
        return { config, transactions, ledger: ledgerAgg, validAccounts: finalValidAccounts, beginningBalances, adjustments, steps: selectedSteps, initialStatus };
    };

    // --- CLIENT-SIDE BUNDLER LOGIC ---
    const handleGenerate = async (config, isDownload = false) => {
        const data = generateData(config);
        
        if (isDownload) {
            try {
                // 1. Resolve Path Base
                const baseUrl = new URL('.', import.meta.url).href;

                // 2. Fetch files
                const files = [
                    'utils.js', 'steps.js', 'App.js',
                    'steps/Step01Analysis.js', 'steps/Step02Journalizing.js',
                    'steps/Step03Posting.js', 'steps/Step04TrialBalance.js',
                    'steps/Step05Worksheet.js', 'steps/Step06FinancialStatements.js',
                    'steps/Step07AdjustingEntries.js', 'steps/Step08ClosingEntries.js',
                    'steps/Step09PostClosingTB.js', 'steps/Step10ReversingEntries.js',
                    'steps/GenericStep.js'
                ];
                
                const fetchedCodes = await Promise.all(files.map(async f => {
                    const url = new URL(f, baseUrl).href;
                    const res = await fetch(url);
                    if (!res.ok) throw new Error(`Failed to load ${f}`);
                    return await res.text();
                }));

                // 3. Process code: Strip ALL imports and exports
                const mergedCode = fetchedCodes.map(code => {
                     // Aggressively remove ANY import statement
                     let c = code.replace(/import\s+.*?;/g, ''); 
                     
                     // Clean up exports (turn them into simple variable declarations)
                     c = c.replace(/export default function/g, 'function');
                     c = c.replace(/export default const/g, 'const');
                     c = c.replace(/export const/g, 'const');
                     c = c.replace(/export function/g, 'function');
                     c = c.replace(/export default/g, '');
                     
                     // Remove 'const html = ...' from sub-files because we declare it globally in the wrapper
                     c = c.replace(/const html = htm.bind\(React.createElement\);/g, '');

                     // Escape closing script tags
                     c = c.replace(/<\/script>/g, '<\\/script>');
                     return c;
                }).join('\n\n');

                // 4. Construct HTML via ARRAY
                const htmlParts = [
                    '<!DOCTYPE html>',
                    '<html lang="en">',
                    '<head>',
                    '    <meta charset="UTF-8">',
                    '    <meta name="viewport" content="width=device-width, initial-scale=1.0">',
                    '    <title>Accounting Activity: ' + config.businessType + '</title>',
                    '    <script src="https://cdn.tailwindcss.com"></script>',
                    '    <script>window.STUDENT_CONFIG = ' + JSON.stringify(data) + ';</script>',
                    '    <style>',
                    '        @page { size: 8.5in 13in; margin: 0.5in; margin-bottom: 0.8in; }',
                    '        @media print { ',
                    '            body { -webkit-print-color-adjust: exact; } ',
                    '            .page-break { page-break-after: always; }',
                    '            .break-inside-avoid { break-inside: avoid; }',
                    '            .hidden { display: block !important; }',
                    '            button, .no-print { display: none !important; }',
                    '            .print-footer { position: fixed; bottom: 0; left: 0; right: 0; height: 0.8in; }',
                    '            .report-body { margin-bottom: 0.8in; }',
                    '        }',
                    '        ::-webkit-scrollbar { display: none; }',
                    '        .custom-scrollbar::-webkit-scrollbar { width: 8px; height: 8px; }',
                    '        .custom-scrollbar::-webkit-scrollbar-track { background: #f1f1f1; }',
                    '        .custom-scrollbar::-webkit-scrollbar-thumb { background: #c1c1c1; border-radius: 4px; }',
                    '        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #a8a8a8; }',
                    '    </style>',
                    '</head>',
                    '<body class="bg-gray-50 text-gray-900">',
                    '    <div id="root"></div>',
                    '    <script type="module">',
                    '        import React, { useState, useCallback, useEffect, useMemo, useRef } from \'https://esm.sh/react@18.2.0\';',
                    '        import { createRoot } from \'https://esm.sh/react-dom@18.2.0/client\';',
                    '        import htm from \'https://esm.sh/htm\';',
                    '        import * as Lucide from \'https://esm.sh/lucide-react@0.263.1\';',
                    '        ',
                    '        const { Book, Check, RefreshCw, ArrowLeft, Save, Printer, FileText, Trash2, AlertCircle, Download, Loader, Lock, ChevronDown, ChevronRight, Table, Plus, X } = Lucide;',
                    '        const html = htm.bind(React.createElement);', // Single Declaration
                    '',
                    mergedCode,
                    '',
                    '        const root = createRoot(document.getElementById(\'root\'));',
                    '        root.render(React.createElement(App));',
                    '    </script>',
                    '</body>',
                    '</html>'
                ];

                // 5. Download Blob
                const blob = new Blob(htmlParts, { type: 'text/html' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `Activity_${config.businessType}_${new Date().toISOString().slice(0,10)}.html`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);

            } catch (err) {
                console.error(err);
                alert("Failed to bundle standalone file. \nError: " + err.message);
            }
            return;
        }

        // Clear old save if starting new
        if(config.enableAutoSave) {
             localStorage.removeItem('ac_student_progress');
        }

        setActivityData({ 
            config: data.config, 
            transactions: data.transactions, 
            ledger: data.ledger, 
            validAccounts: data.validAccounts, 
            beginningBalances: data.beginningBalances, 
            adjustments: data.adjustments, 
            steps: data.steps 
        });
        setStepStatus(data.initialStatus);
        setAnswers({});
        setCurrentStepIndex(0);
        setTimeout(() => document.getElementById(`task-${data.steps[0].id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50); 
        setMode('activity');
    };

    const handlePrint = () => {
        const content = document.getElementById('full-report-container');
        if (!content) return;
        const printWindow = window.open('', '', 'height=800,width=1000');
        
        printWindow.document.write('<html><head><title>Activity Report</title>');
        // Escaped script tag to prevent closing the string early
        printWindow.document.write('<script src="https://cdn.tailwindcss.com"></' + 'script>');
        printWindow.document.write(`
            <style>
                @page {
                    size: 8.5in 13in; /* Folio Size */
                    margin: 0.5in;
                    margin-bottom: 0.8in; /* Allowance for Footer */
                }
                @media print {
                    body { -webkit-print-color-adjust: exact; }
                    .page-break { page-break-after: always; }
                    .break-inside-avoid { break-inside: avoid; }
                    .hidden { display: block !important; } 
                    
                    button, .no-print { display: none !important; }

                    /* Custom Footer Logic */
                    .print-footer {
                        position: fixed;
                        bottom: 0;
                        left: 0;
                        right: 0;
                        height: 0.8in;
                    }
                    .report-body { margin-bottom: 0.8in; }
                }
                ::-webkit-scrollbar { display: none; }
            </style>
        `);
        printWindow.document.write('</head><body class="bg-white">');
        
        // Wrap content
        printWindow.document.write('<div class="report-body">');
        printWindow.document.write(content.innerHTML);
        printWindow.document.write('</div>');

        // Extract Footer Template and inject as Fixed Footer
        const footerHTML = content.querySelector('#print-footer-template').innerHTML;
        printWindow.document.write(`<div class="print-footer">${footerHTML}</div>`);

        printWindow.document.write('</body></html>');
        printWindow.document.close();
        
        setTimeout(() => { 
            printWindow.focus(); 
            printWindow.print(); 
            printWindow.close(); 
        }, 1000);
    };

    const handleValidateStepById = (stepId) => () => {
        const status = stepStatus[stepId];
        if (status.attempts <= 0 && status.completed) return;
        const currentAns = answers[stepId] || {};
        let isCorrect = false;

        if (stepId === 1) {
            const result = validateStep01(activityData.transactions, currentAns);
            isCorrect = result.isCorrect;
        } else if (stepId === 2) {
            const result = validateStep02(activityData.transactions, currentAns);
            isCorrect = result.isCorrect;
        } else if (stepId === 3) {
            const result = validateStep03(activityData, currentAns);
            isCorrect = result.isCorrect;
        } else if (stepId === 4) {
            const result = validateStep04(activityData.transactions, currentAns, activityData.ledger);
            isCorrect = result.isCorrect;
        } else if (stepId === 5) {
             const result = validateStep05(activityData.ledger, activityData.adjustments, currentAns);
             isCorrect = result.isCorrect;
        } else if (stepId === 6) {
             const result = validateStep06(activityData.ledger, activityData.adjustments, activityData, currentAns);
             isCorrect = result.isCorrect;
        } else if (stepId === 7) {
             const journalData = currentAns.journal || {};
             const ledgerData = currentAns.ledger || {};
             const result = validateStep07(activityData.adjustments, journalData, ledgerData, activityData.transactions);
             isCorrect = result.score === result.maxScore && result.maxScore > 0;
        } else if (stepId === 8) {
            const result = validateStep08(currentAns, activityData);
            isCorrect = result.score === result.maxScore && result.maxScore > 0;
        } else if (stepId === 9) {
             const result = validateStep09(currentAns, activityData);
             isCorrect = result.isCorrect;
        } else if (stepId === 10) {
            const result = validateStep10(currentAns, activityData);
            isCorrect = result.isCorrect;
        } else {
             isCorrect = true;
        }

        setStepStatus(prev => {
            const newStatus = { ...prev };
            const currentStatus = prev[stepId];
            let nextStepShouldBeCompleted = false;
            if (isCorrect) {
                newStatus[stepId] = { ...currentStatus, completed: true, correct: true, attempts: currentStatus.attempts };
                nextStepShouldBeCompleted = true;
            } else {
                const remainingAttempts = currentStatus.attempts - 1;
                if (remainingAttempts <= 0) {
                    newStatus[stepId] = { ...currentStatus, completed: true, correct: false, attempts: 0 };
                    nextStepShouldBeCompleted = true;
                } else {
                    newStatus[stepId] = { ...currentStatus, attempts: remainingAttempts, completed: false, correct: false };
                }
            }
            if (nextStepShouldBeCompleted) {
                const nextActiveIndex = activityData.steps.findIndex((s, idx) => s.id === stepId) + 1;
                if (nextActiveIndex < activityData.steps.length) {
                    setCurrentStepIndex(nextActiveIndex); 
                    setTimeout(() => document.getElementById(`task-${activityData.steps[nextActiveIndex].id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100); 
                } else { 
                    setCurrentStepIndex(activityData.steps.length); 
                }
            }
            return newStatus;
        });
    };
    
    const isAllComplete = activityData?.steps.every(s => stepStatus[s.id]?.completed);

    if (mode === 'config') return html`<div className="min-h-screen bg-gray-50 p-8"><div className="max-w-4xl mx-auto mb-8 text-center"><h1 className="text-4xl font-extrabold text-blue-900 flex justify-center items-center gap-3"><${Book} size=${40} /> Accounting Cycle Simulator</h1><p className="text-gray-600 mt-2">Generate unique accounting scenarios and practice every step of the cycle.</p></div><${TeacherDashboard} onGenerate=${handleGenerate} onResume=${handleResume} /></div>`;

    return html`
        <div className="min-h-screen flex flex-col bg-gray-50">
            <header id="main-header" className="bg-white border-b shadow-md p-4 flex justify-between items-center sticky top-0 z-50 no-print">
                <div className="flex items-center gap-4"><button onClick=${() => setMode('config')} className="p-2 hover:bg-gray-100 rounded-full text-gray-600"><${ArrowLeft} size=${20} /></button><div><h1 id="company-name" className="font-bold text-xl text-blue-900">${activityData.config.businessType} - ${activityData.config.ownership}</h1><p className="text-xs text-gray-500">Inventory: ${activityData.config.inventorySystem} • ${activityData.config.isSubsequentYear ? 'Subsequent Year' : 'New Business'}</p></div></div>
                <div className="text-right flex items-center gap-4">
                    ${isAllComplete && html`
                        <button onClick=${handlePrint} className="flex items-center gap-2 bg-blue-700 text-white px-4 py-2 rounded shadow hover:bg-blue-800 transition-colors animate-pulse">
                            <${Printer} size=${18} /> Print / Save PDF
                        </button>
                    `}
                    <div>
                        <div className="text-xs font-bold text-gray-500 uppercase">First Uncompleted Task</div>
                        <div className="font-semibold text-blue-700">${activityData.steps[currentStepIndex] ? `Task #${activityData.steps[currentStepIndex].id}: ${activityData.steps[currentStepIndex].title}` : 'All Tasks Complete'}</div>
                    </div>
                </div>
            </header>
            <div className="bg-white border-b overflow-x-auto shadow-sm sticky top-[73px] z-40 no-print"><div className="flex min-w-max px-4">${activityData.steps.map((s, idx) => html`<div key=${s.id} className=${`p-3 flex items-center gap-2 text-sm border-b-2 transition-colors ${idx === currentStepIndex ? 'border-blue-600 text-blue-700 font-bold' : 'border-transparent text-gray-500'} ${stepStatus[s.id].completed ? 'text-green-600' : ''} cursor-pointer hover:bg-gray-50`} onClick=${() => setCurrentStepIndex(idx)}><div className=${`w-6 h-6 rounded-full flex items-center justify-center text-xs border ${stepStatus[s.id].completed ? 'bg-green-100 border-green-300 text-green-700' : idx === currentStepIndex ? 'bg-blue-100 border-blue-300 text-blue-700' : 'bg-gray-50 border-gray-200'}`}><${stepStatus[s.id].completed ? Check : 'span'} size=${14}>${stepStatus[s.id].completed ? '' : s.id}</${stepStatus[s.id].completed ? Check : 'span'}></div><span>${s.title}</span></div>`)}</div></div>
            <main className="flex-1 p-6"><div className="max-w-7xl mx-auto">${activityData.steps.map((step, idx) => html`<${TaskSection} key=${step.id} step=${step} activityData=${activityData} answers=${answers} stepStatus=${stepStatus} onValidate=${handleValidateStepById} updateAnswerFns=${{ updateNestedAnswer, updateTrialBalanceAnswer, updateAnswer }} isCurrentActiveTask=${idx === currentStepIndex} isPrevStepCompleted=${idx === 0 || stepStatus[activityData.steps[idx - 1].id]?.completed} />`)}</div></main>
            <footer className="bg-gray-100 border-t p-2 text-center text-sm text-gray-500 no-print flex justify-between items-center px-6">
                <span className="text-xs text-gray-400">${APP_VERSION}</span>
                ${isAllComplete ? html`<span className="font-bold text-green-700">Accounting Cycle Activity Fully Completed! 🎉</span>` : html`<span>Scroll up to continue the exercise.</span>`}
                <span className="w-20"></span>
            </footer>
            
            <${ReportView} activityData=${activityData} answers=${answers} />
        </div>
    `;
};

export default App;
