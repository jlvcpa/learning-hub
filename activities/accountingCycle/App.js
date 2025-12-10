import React, { useState, useCallback, useEffect } from 'https://esm.sh/react@18.2.0';
import htm from 'https://esm.sh/htm';
import { Book, Check, RefreshCw, ArrowLeft } from 'https://esm.sh/lucide-react@0.263.1';
import { APP_VERSION, STEPS, generateTransactions, generateBeginningBalances, sortAccounts, generateAdjustments, getAccountType } from './utils.js';
import { TaskSection } from './steps.js';

// Import all modular steps
import Step1Analysis from './steps/Step1Analysis.js';
import Step2Journalizing from './steps/Step2Journalizing.js';
import Step3Posting from './steps/Step3Posting.js';
import Step4TrialBalance from './steps/Step4TrialBalance.js';
import Step5Worksheet from './steps/Step5Worksheet.js';
import Step6FinancialStatements from './steps/Step6FinancialStatements.js';
import Step7AdjustingEntries from './steps/Step7AdjustingEntries.js';
import Step8ClosingEntries from './steps/Step8ClosingEntries.js';
import GenericStep from './steps/GenericStep.js';

const html = htm.bind(React.createElement);

const TeacherDashboard = ({ onGenerate }) => {
    // PERSISTENCE: Initialize state from localStorage if available, otherwise default
    const [businessType, setBusinessType] = useState(() => localStorage.getItem('ac_businessType') || 'Service');
    const [ownership, setOwnership] = useState(() => localStorage.getItem('ac_ownership') || 'Sole Proprietorship');
    const [inventorySystem, setInventorySystem] = useState(() => localStorage.getItem('ac_inventorySystem') || 'Periodic');
    
    // PERSISTENCE: Initialize state from localStorage
    const [numTransactions, setNumTransactions] = useState(() => {
        const saved = localStorage.getItem('ac_numTransactions');
        return saved ? Number(saved) : 10;
    });
    
    const [selectedSteps, setSelectedSteps] = useState(() => {
        const saved = localStorage.getItem('ac_selectedSteps');
        return saved ? JSON.parse(saved) : STEPS.map(s => s.id);
    });

    // New Persistence for Financial Statement Options
    const [fsFormat, setFsFormat] = useState(() => localStorage.getItem('ac_fsFormat') || 'Single');
    const [includeCashFlows, setIncludeCashFlows] = useState(() => localStorage.getItem('ac_includeCashFlows') === 'true');

    // Standard Options (Not currently persisted, but can be if needed)
    const [includeTradeDiscounts, setIncludeTradeDiscounts] = useState(false);
    const [includeCashDiscounts, setIncludeCashDiscounts] = useState(false);
    const [includeFreight, setIncludeFreight] = useState(false);
    const [numPartners, setNumPartners] = useState(2);
    const [isSubsequentYear, setIsSubsequentYear] = useState(false);
    const [deferredExpenseMethod, setDeferredExpenseMethod] = useState('Asset');
    const [deferredIncomeMethod, setDeferredIncomeMethod] = useState('Liability');
    
    // PERSISTENCE EFFECTS: Save to localStorage on change
    useEffect(() => { localStorage.setItem('ac_businessType', businessType); }, [businessType]);
    useEffect(() => { localStorage.setItem('ac_ownership', ownership); }, [ownership]);
    useEffect(() => { localStorage.setItem('ac_inventorySystem', inventorySystem); }, [inventorySystem]);
    useEffect(() => { localStorage.setItem('ac_numTransactions', numTransactions); }, [numTransactions]);
    useEffect(() => { localStorage.setItem('ac_selectedSteps', JSON.stringify(selectedSteps)); }, [selectedSteps]);
    useEffect(() => { localStorage.setItem('ac_fsFormat', fsFormat); }, [fsFormat]);
    useEffect(() => { localStorage.setItem('ac_includeCashFlows', includeCashFlows); }, [includeCashFlows]);

    const toggleStep = (id) => setSelectedSteps(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    const handleSelectAll = (e) => e.target.checked ? setSelectedSteps(STEPS.map(s => s.id)) : setSelectedSteps([]);
    const isAllSelected = selectedSteps.length === STEPS.length;
    const isMerchOrMfg = businessType === 'Merchandising' || businessType === 'Manufacturing';

    return html`
        <div className="bg-white p-6 rounded-lg shadow-md max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-6 border-b pb-2">
                 <h2 className="text-2xl font-bold text-gray-800">Activity Configuration</h2>
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

            <button onClick=${() => onGenerate({ businessType, ownership, inventorySystem, numTransactions: Number(numTransactions) || 10, selectedSteps, numPartners: Number(numPartners) || 2, isSubsequentYear, deferredExpenseMethod, deferredIncomeMethod, fsFormat, includeCashFlows, options: { includeTradeDiscounts, includeCashDiscounts, includeFreight } })} className="w-full bg-blue-600 text-white py-3 rounded-md hover:bg-blue-700 font-bold flex items-center justify-center gap-2"><${RefreshCw} size=${20} /> Generate Activity</button>
            <div className="mt-4 pt-4 border-t text-xs text-gray-400 text-center">${APP_VERSION}</div>
        </div>
    `;
};

const App = () => {
    const [mode, setMode] = useState('config');
    const [activityData, setActivityData] = useState(null);
    const [currentStepIndex, setCurrentStepIndex] = useState(0); 
    const [stepStatus, setStepStatus] = useState({});
    const [answers, setAnswers] = useState({});
    
    const updateAnswer = useCallback((stepId, data) => setAnswers(p => ({ ...p, [stepId]: data })), []);
    const updateNestedAnswer = useCallback((stepId, key, subKey, value) => setAnswers(prev => { const stepData = prev[stepId] || {}; const keyData = stepData[key] || {}; return { ...prev, [stepId]: { ...stepData, [key]: { ...keyData, [subKey]: value } } }; }), []);
    
    const updateTrialBalanceAnswer = useCallback((stepId, acc, side, val) => {
        setAnswers(prev => {
            const stepData = prev[stepId] || {};
            const accData = stepData[acc] || {};
            return { ...prev, [stepId]: { ...stepData, [acc]: { ...accData, [side]: val } } };
        });
    }, []);

    const handleGenerate = (config) => {
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
        setActivityData({ config, transactions, ledger: ledgerAgg, validAccounts: finalValidAccounts, beginningBalances, adjustments, steps: selectedSteps });
        setStepStatus(initialStatus);
        setAnswers({});
        setCurrentStepIndex(0);
        setTimeout(() => document.getElementById(`task-${selectedSteps[0].id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50); 
        setMode('activity');
    };

    const handleValidateStepById = (stepId) => () => {
        const status = stepStatus[stepId];
        if (status.attempts <= 0 && status.completed) return;
        const currentAns = answers[stepId] || {};
        let isCorrect = false;

        if (stepId === 1) {
            let correctChecks = 0;
            activityData.transactions.forEach((t) => {
                const a = currentAns[t.id] || {};
                if (a.A === t.analysis.assets && a.L === t.analysis.liabilities && a.E === t.analysis.equity && (a.Cause === t.analysis.cause || (t.analysis.cause === '' && !a.Cause))) correctChecks++;
            });
            isCorrect = correctChecks === activityData.transactions.length;
        } else if (stepId === 2) {
            let correctTx = 0;
            activityData.transactions.forEach((t, tIdx) => {
                const entry = currentAns[t.id] || {};
                const userRows = entry.rows || [];
                if (userRows.length > 0) correctTx++; 
            });
            isCorrect = correctTx === activityData.transactions.length;
        } else if (stepId === 3) {
             const ledgers = currentAns.ledgers || [];
             let allAccountsValid = true;
             ledgers.forEach(l => {
                 if (!activityData.validAccounts.includes(l.account)) allAccountsValid = false;
             });
             isCorrect = allAccountsValid && ledgers.length > 0;
        } else if (stepId === 4) {
             const rows = currentAns.rows || [];
             const expectedAccounts = Object.keys(activityData.ledger);
             let allRowsCorrect = true;
             
             const populatedRows = rows.filter(r => r.account && r.account.trim() !== '');
             if (populatedRows.length !== expectedAccounts.length) {
                 allRowsCorrect = false;
             }

             populatedRows.forEach(r => {
                 const acc = r.account.trim();
                 const key = expectedAccounts.find(k => k.toLowerCase() === acc.toLowerCase());
                 if (!key) { 
                     allRowsCorrect = false; 
                     return; 
                 }
                 const expNet = (activityData.ledger[key].debit || 0) - (activityData.ledger[key].credit || 0);
                 const expDr = expNet > 0 ? expNet : 0;
                 const expCr = expNet < 0 ? Math.abs(expNet) : 0;
                 const usrDr = Number(r.dr) || 0;
                 const usrCr = Number(r.cr) || 0;

                 if (Math.abs(usrDr - expDr) > 1 || Math.abs(usrCr - expCr) > 1) {
                     allRowsCorrect = false; 
                 }
             });

             isCorrect = allRowsCorrect;

        } else if (stepId === 5) {
             const userFinal = currentAns.footers?.final || {};
             isCorrect = Number(userFinal.finBSDr) > 0 && Math.abs(Number(userFinal.finBSDr) - Number(userFinal.finBSCr)) <= 1;
        } else if (stepId === 6) {
             const { ledger, adjustments } = activityData;
             const mergedAccounts = new Set(Object.keys(ledger));
             adjustments.forEach(adj => { mergedAccounts.add(adj.drAcc); mergedAccounts.add(adj.crAcc); });
             
             let calcBSDr = 0;
             let calcISDr = 0;
             let calcISCr = 0;
             
             Array.from(mergedAccounts).forEach(acc => {
                 const lBal = (ledger[acc]?.debit || 0) - (ledger[acc]?.credit || 0);
                 let aDr = 0; let aCr = 0;
                 adjustments.forEach(a => { if(a.drAcc === acc) aDr += a.amount; if(a.crAcc === acc) aCr += a.amount; });
                 const atbNet = lBal + (aDr - aCr);
                 const atbDr = atbNet > 0 ? atbNet : 0; 
                 const atbCr = atbNet < 0 ? Math.abs(atbNet) : 0;
                 
                 const type = getAccountType(acc);
                 const isIS = type === 'Revenue' || type === 'Expense';
                 
                 if (isIS) {
                     calcISDr += atbDr;
                     calcISCr += atbCr;
                 } else {
                     calcBSDr += atbDr;
                 }
             });
             
             const netInc = calcISCr - calcISDr;
             const expectedBSTotal = calcBSDr + (netInc < 0 ? Math.abs(netInc) : 0);
             
             const userBSRows = currentAns.bs?.rows || [];
             const matchFound = userBSRows.some(r => Math.abs(Number(r.amount) - expectedBSTotal) <= 1);
             
             isCorrect = matchFound;
        } else if (stepId === 7) {
             // --- STEP 7 VALIDATION (Adjusting Entries) ---
             const journalData = currentAns.journal || {};
             const ledgerData = currentAns.ledger || {};
             const { adjustments, ledger } = activityData;
             
             let allJournalCorrect = true;
             let allLedgerCorrect = true;

             // 1. Validate Journal
             adjustments.forEach(adj => {
                 const entry = journalData[adj.id] || {};
                 const drMatch = entry.drAcc?.toLowerCase() === adj.drAcc.toLowerCase() && Math.abs(Number(entry.drAmt) - adj.amount) <= 1;
                 const crMatch = entry.crAcc?.toLowerCase() === adj.crAcc.toLowerCase() && Math.abs(Number(entry.crAmt) - adj.amount) <= 1;
                 if (!drMatch || !crMatch) allJournalCorrect = false;
             });

             // 2. Validate Ledger
             const affectedAccounts = new Set();
             adjustments.forEach(a => { affectedAccounts.add(a.drAcc); affectedAccounts.add(a.crAcc); });
             
             Array.from(affectedAccounts).forEach(acc => {
                 const rawDr = ledger[acc]?.debit || 0;
                 const rawCr = ledger[acc]?.credit || 0;
                 let adjDr = 0, adjCr = 0;
                 adjustments.forEach(a => {
                     if (a.drAcc === acc) adjDr += a.amount;
                     if (a.crAcc === acc) adjCr += a.amount;
                 });
                 const finalNet = (rawDr + adjDr) - (rawCr + adjCr);
                 const expBal = Math.abs(finalNet);
                 const expType = finalNet >= 0 ? 'Dr' : 'Cr';

                 const userAcc = ledgerData[acc] || {};
                 if (Math.abs(Number(userAcc.endBal) - expBal) > 1 || userAcc.balType !== expType) {
                     allLedgerCorrect = false;
                 }
             });
             
             isCorrect = allJournalCorrect && allLedgerCorrect;

        } else if (stepId === 8) {
             // --- STEP 8 VALIDATION (Closing Entries) ---
             const ledgers = currentAns.ledgers || [];
             const journalData = currentAns.journal || {};
             const { ledger, adjustments, validAccounts, config, beginningBalances } = activityData;

             // 1. Nominal Accounts Check (Must be 0)
             let allNominalClosed = true;
             ledgers.forEach(l => {
                 const type = getAccountType(l.account);
                 const isNominal = ['Revenue', 'Expense'].includes(type) || l.account.includes('Drawing') || l.account === 'Income Summary';
                 if (isNominal) {
                     if (Number(l.balance) !== 0) allNominalClosed = false;
                 }
             });

             // 2. Journal Validation (Totals)
             const getBlockTotal = (blockId) => {
                 const rows = journalData[blockId]?.rows || [];
                 // Averages Dr and Cr to get the transaction amount
                 return rows.reduce((sum, r) => sum + (Number(r.dr) || 0) + (Number(r.cr) || 0), 0) / 2;
             };

             // Calculate targets
             let totalRev = 0, totalExp = 0, totalDraw = 0;
             validAccounts.forEach(acc => {
                 const rawDr = ledger[acc]?.debit || 0;
                 const rawCr = ledger[acc]?.credit || 0;
                 let val = rawDr - rawCr; // +Dr, -Cr
                 adjustments.forEach(a => { if (a.drAcc === acc) val += a.amount; if (a.crAcc === acc) val -= a.amount; });
                 const type = getAccountType(acc);
                 if (type === 'Revenue') totalRev += Math.abs(val);
                 if (type === 'Expense') totalExp += val;
                 if (acc.includes('Drawing')) totalDraw += Math.abs(val);
             });
             const netIncome = totalRev - totalExp;

             const revCorrect = Math.abs(getBlockTotal('closeRev') - totalRev) <= 1;
             const expCorrect = Math.abs(getBlockTotal('closeExp') - totalExp) <= 1;
             const incSumCorrect = Math.abs(getBlockTotal('closeInc') - Math.abs(netIncome)) <= 1;
             const drawCorrect = Math.abs(getBlockTotal('closeDrw') - totalDraw) <= 1;
             
             const journalValid = revCorrect && expCorrect && incSumCorrect && drawCorrect;

             // 3. Capital Account Check
             let begCap = 0;
             if (config.isSubsequentYear && beginningBalances) {
                 const capAcc = validAccounts.find(a => getAccountType(a) === 'Equity' && !a.includes('Drawing'));
                 if (capAcc && beginningBalances.balances[capAcc]) begCap = beginningBalances.balances[capAcc].cr;
             } else {
                 const capAccName = validAccounts.find(a => getAccountType(a) === 'Equity' && !a.includes('Drawing'));
                 // For first year, calculate adjusted capital before closing
                 const rawDr = ledger[capAccName]?.debit || 0;
                 const rawCr = ledger[capAccName]?.credit || 0;
                 begCap = Math.abs(rawDr - rawCr); // Net credits
             }
             
             const endCap = begCap + netIncome - totalDraw;
             const capAccName = validAccounts.find(a => getAccountType(a) === 'Equity' && !a.includes('Drawing'));
             const userCap = ledgers.find(l => l.account === capAccName);
             const capitalValid = userCap && Math.abs(Number(userCap.balance) - endCap) <= 1;

             isCorrect = allNominalClosed && journalValid && capitalValid;

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

    if (mode === 'config') return html`<div className="min-h-screen bg-gray-50 p-8"><div className="max-w-4xl mx-auto mb-8 text-center"><h1 className="text-4xl font-extrabold text-blue-900 flex justify-center items-center gap-3"><${Book} size=${40} /> Accounting Cycle Simulator</h1><p className="text-gray-600 mt-2">Generate unique accounting scenarios and practice every step of the cycle.</p></div><${TeacherDashboard} onGenerate=${handleGenerate} /></div>`;

    return html`
        <div className="min-h-screen flex flex-col bg-gray-50">
            <header id="main-header" className="bg-white border-b shadow-md p-4 flex justify-between items-center sticky top-0 z-50 no-print">
                <div className="flex items-center gap-4"><button onClick=${() => setMode('config')} className="p-2 hover:bg-gray-100 rounded-full text-gray-600"><${ArrowLeft} size=${20} /></button><div><h1 id="company-name" className="font-bold text-xl text-blue-900">${activityData.config.businessType} - ${activityData.config.ownership}</h1><p className="text-xs text-gray-500">Inventory: ${activityData.config.inventorySystem} • ${activityData.config.isSubsequentYear ? 'Subsequent Year' : 'New Business'}</p></div></div>
                <div className="text-right"><div className="text-xs font-bold text-gray-500 uppercase">First Uncompleted Task</div><div className="font-semibold text-blue-700">${activityData.steps[currentStepIndex] ? `Task #${activityData.steps[currentStepIndex].id}: ${activityData.steps[currentStepIndex].title}` : 'All Tasks Complete'}</div></div>
            </header>
            <div className="bg-white border-b overflow-x-auto shadow-sm sticky top-[73px] z-40 no-print"><div className="flex min-w-max px-4">${activityData.steps.map((s, idx) => html`<div key=${s.id} className=${`p-3 flex items-center gap-2 text-sm border-b-2 transition-colors ${idx === currentStepIndex ? 'border-blue-600 text-blue-700 font-bold' : 'border-transparent text-gray-500'} ${stepStatus[s.id].completed ? 'text-green-600' : ''} cursor-pointer hover:bg-gray-50`} onClick=${() => setCurrentStepIndex(idx)}><div className=${`w-6 h-6 rounded-full flex items-center justify-center text-xs border ${stepStatus[s.id].completed ? 'bg-green-100 border-green-300 text-green-700' : idx === currentStepIndex ? 'bg-blue-100 border-blue-300 text-blue-700' : 'bg-gray-50 border-gray-200'}`}><${stepStatus[s.id].completed ? Check : 'span'} size=${14}>${stepStatus[s.id].completed ? '' : s.id}</${stepStatus[s.id].completed ? Check : 'span'}></div><span>${s.title}</span></div>`)}</div></div>
            <main className="flex-1 p-6"><div className="max-w-7xl mx-auto">${activityData.steps.map((step, idx) => html`<${TaskSection} key=${step.id} step=${step} activityData=${activityData} answers=${answers} stepStatus=${stepStatus} onValidate=${handleValidateStepById} updateAnswerFns=${{ updateNestedAnswer, updateTrialBalanceAnswer, updateAnswer }} isCurrentActiveTask=${idx === currentStepIndex} isPrevStepCompleted=${idx === 0 || stepStatus[activityData.steps[idx - 1].id]?.completed} />`)}</div></main>
            <footer className="bg-gray-100 border-t p-2 text-center text-sm text-gray-500 no-print flex justify-between items-center px-6">
                <span className="text-xs text-gray-400">${APP_VERSION}</span>
                ${activityData.steps.every(s => stepStatus[s.id]?.completed) ? html`<span className="font-bold text-green-700">Accounting Cycle Activity Fully Completed! 🎉</span>` : html`<span>Scroll up to continue the exercise.</span>`}
                <span className="w-20"></span>
            </footer>
        </div>
    `;
};

export default App;
