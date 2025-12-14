// -------------------
// --- utils.js for Constants and Logic Helpers for Accounting Cycle ---
// ------------------


export const APP_VERSION = "Version: 2025-12-10 17:11 PST";

export const EQUITY_CAUSES = ['', 'Increase in Capital', 'Decrease in Capital', 'Increase in Drawings', 'Decrease in Drawings', 'Increase in Income', 'Decrease in Income', 'Increase in Expense', 'Decrease in Expense'];

export const CANONICAL_ACCOUNT_ORDER = ["Cash", "Accounts Receivable", "Merchandise Inventory", "Supplies", "Prepaid Rent", "Equipment", "Accumulated Depreciation - Equipment", "Furniture", "Accumulated Depreciation - Furniture", "Building", "Accumulated Depreciation - Building", "Land", "Accounts Payable", "Notes Payable", "Salaries Payable", "Utilities Payable", "Interest Payable", "Unearned Revenue", "Owner, Capital", "Owner, Drawings", "Share Capital", "Retained Earnings", "Dividends", "Service Revenue", "Sales", "Sales Discounts", "Sales Returns and Allowances", "Interest Income", "Cost of Goods Sold", "Purchases", "Purchase Discounts", "Purchase Returns and Allowances", "Freight In", "Freight Out", "Rent Expense", "Salaries Expense", "Utilities Expense", "Supplies Expense", "Repairs and Maintenance Expense", "Dues and Subscriptions Expense", "Depreciation Expense", "Insurance Expense", "Advertising Expense", "Interest Expense"];

export const STEPS = [
    { id: 1, title: 'Transaction Analysis', description: 'Identify impact on Assets, Liabilities, and Equity' },
    { id: 2, title: 'Journalizing', description: 'Record transactions in the General Journal' },
    { id: 3, title: 'Posting to Ledger', description: 'Post journal entries to T-Accounts/Ledger' },
    { id: 4, title: 'Trial Balance', description: 'Prepare Unadjusted Trial Balance' },
    { id: 5, title: '10-Column Worksheet', description: 'Prepare Worksheet with Adjustments' },
    { id: 6, title: 'Financial Statements', description: 'Prepare Income Statement and Balance Sheet' },
    { id: 7, title: 'Adjusting Entries', description: 'Journalize and Post Adjusting Entries' },
    { id: 8, title: 'Closing Entries', description: 'Journalize and Post Closing Entries' },
    { id: 9, title: 'Post-Closing Trial Balance', description: 'Prepare Post-Closing Trial Balance' },
    { id: 10, title: 'Reversing Entries', description: 'Setup new period and Reversing Entries' },
];

export const ActivityHelper = {
    getRubricHTML: (taskNum, taskTitle) => {
        let competency;
        if (taskNum === 1) competency = 'To correctly analyze business transactions by determining the effect on the fundamental accounting equation (Assets = Liabilities + Equity).';
        else if (taskNum === 2) competency = 'To accurately record business transactions in the general journal following the double-entry system (Debits = Credits).';
        else if (taskNum === 3) competency = 'To accurately post journal entries to the appropriate General Ledger (T-Accounts) and calculate the correct running balance for each account.';
        else if (taskNum === 4) competency = 'To prepare an Unadjusted Trial Balance by extracting the final balances from all General Ledger accounts.';
        else if (taskNum === 5) competency = 'To prepare a 10-column worksheet, applying adjustments and correctly extending balances to Financial Statement columns.';
        else competency = `To correctly complete the process for: ${taskTitle}.`;

        return `<div class="rubric-box bg-white p-4 rounded-lg border-2 border-indigo-300 shadow-md mb-6"><div class="flex justify-between items-end mb-2 border-b-2 pb-1"><h4 class="font-extrabold text-indigo-700 print:text-black">TASK ${taskNum}: ${taskTitle.toUpperCase()} RUBRIC</h4></div><div class="overflow-x-auto"><table class="min-w-full text-xs border-collapse border border-gray-400"><thead><tr class="header-bg text-center text-white"><th class="p-2 border border-gray-300 w-1/5">Competency</th><th class="p-2 border border-gray-300 bg-green-600/90 print:bg-white">Advanced (A)</th><th class="p-2 border border-gray-300 bg-blue-600/90 print:bg-white">Proficient (P)</th><th class="p-2 border border-gray-300 bg-yellow-600/90 print:bg-white">Developing (D)</th><th class="p-2 border border-gray-300 bg-red-600/90 print:bg-white">Intervention Required (IR)</th></tr></thead><tbody><tr class="align-top"><td class="p-2 border border-gray-300 italic">${competency}</td><td class="p-2 border border-gray-300 text-green-800 print:text-black">Excellent performance. (95-100%)</td><td class="p-2 border border-gray-300 text-blue-800 print:text-black">Good performance. (85-94.9%)</td><td class="p-2 border border-gray-300 text-yellow-800 print:text-black">Acceptable performance. (75-84.9%)</td><td class="p-2 border border-gray-300 text-red-800 print:text-black">Unacceptable performance. (&lt;75%)</td></tr></tbody></table></div></div>`;
    },
    getPrintStudentInfoHTML: (stepTitle, stepDescription) => {
         return `<div id="student-print-info" class="hidden"><div class="w-full mb-2 text-sm text-black font-bold font-mono border-b-2 border-black pb-2"><div class="flex justify-between items-center"><span class="text-left">CN: ___</span><span class="text-right">Section: ___</span></div><div class="flex justify-between items-center"><span class="text-left">Name: ______________________</span><span class="text-right">Date: ________________</span></div></div><h1 id="task-header-title" class="font-extrabold text-2xl mb-1 text-black">${stepTitle}</h1><p class="text-sm text-gray-700">${stepDescription}</p></div>`;
    },
    getCustomPrintHeaderHTML: () => `<header class="text-center mb-8 pb-4 border-b-4 border-indigo-600 header-bg rounded-t-lg p-4 print:block hidden print-header-custom"><h1 class="text-3xl md:text-4xl font-extrabold text-yellow-300">Performance Task</h1></header>`,
    getCustomPrintFooterHTML: () => `<div id="print-footer" class="hidden print:block fixed bottom-0 left-0 right-0 z-50 bg-white border-t-8 border-indigo-600"></div>`,
    
    // --- UPDATED INSTRUCTIONS GENERATOR ---
    getInstructionsHTML: (stepId, taskTitle, validAccounts = [], isSubsequentYear = false, beginningBalances = null, deferredExpenseMethod = 'Asset', deferredIncomeMethod = 'Liability') => {
        let instructionsHTML = "";
        let accountsList = "";
        
        // Logic for the extra bullet point
        const showDeferredNote = (deferredExpenseMethod === 'Expense' || deferredIncomeMethod === 'Income');
        const deferredLine = showDeferredNote ? "<li>Expense or Income method is to be used in accounting for Deferred Items.</li>" : "";

        if (stepId === 2 || stepId === 3) {
            if (stepId === 3 && isSubsequentYear && beginningBalances) {
                 const accountsWithBalances = validAccounts.map(a => {
                     let balText = "";
                     if (beginningBalances.balances && beginningBalances.balances[a]) {
                         const b = beginningBalances.balances[a];
                         const net = b.dr - b.cr;
                         if (net !== 0) {
                             balText = ` (Beg: ${Math.abs(net).toLocaleString()} ${net > 0 ? 'Dr' : 'Cr'})`;
                         }
                     }
                     return `${a}${balText}`;
                 });
                 accountsList = `<span class="font-mono text-xs text-blue-700 font-bold">${accountsWithBalances.join(', ')}</span>`;
            } else {
                 accountsList = `<span class="font-mono text-xs text-blue-700 font-bold">${validAccounts.join(', ')}</span>`;
            }
        }

        if (stepId === 1) {
            instructionsHTML = `
                <li>Analyze the increase or decrease effects of each transactions on assets, liabilities, and equity. If it affects equity, determine the cause.</li>
                ${deferredLine}
                <li>Complete all required fields. Enter amounts without commas and decimal places. Round off centavos to the nearest peso. Validate each task to unlock the next one.</li>
            `;
        } else if (stepId === 2) {
            instructionsHTML = `
                <li>Journalize the transactions using the rules of debit and credit and the manual process of recording transactions.</li>
                ${deferredLine}
                <li>Complete all required fields. Enter amounts without commas and decimal places. Round off centavos to the nearest peso. Validate each task to unlock the next one.</li>
                <li>Use the following accounts in journalizing the transactions below: ${accountsList}</li>
            `;
        } else if (stepId === 3) {
            let firstBullet = `Setup the general ledger using the following accounts (chart of accounts): ${accountsList}`;
            
            if (isSubsequentYear) {
                instructionsHTML = `
                    <li>${firstBullet}</li>
                    ${deferredLine}
                    <li>Enter the beginning balances of the account general ledger created using the amounts provided together with the accounts in the first instruction - YYYY in the first row, date column. Date column second row shall be Mmm dd or Mmm, d. Second row particulars shall be BB that stands for beginning balance, 2nd row PR is blank, and then the debit or credit beginning balance amount.</li>
                    <li>Post the journal entries to the appropriate General Ledger accounts.</li>
                    <li>Complete all required fields. Enter amounts without commas and decimal places. Round off centavos to the nearest peso. Validate each task to unlock the next one.</li>
                `;
            } else {
                instructionsHTML = `
                    <li>${firstBullet}</li>
                    ${deferredLine}
                    <li>Post the journal entries to the appropriate General Ledger accounts.</li>
                    <li>Complete all required fields. Enter amounts without commas and decimal places. Round off centavos to the nearest peso. Validate each task to unlock the next one.</li>
                `;
            }
        } else if (stepId === 4) {
            instructionsHTML = `
                <li>Prepare the Unadjusted Trial Balance based on the balances in the General Ledger.</li>
                ${deferredLine}
                <li>Complete all required fields. Enter amounts without commas and decimal places. Round off centavos to the nearest peso. Validate each task to unlock the next one.</li>
            `;
        } else if (stepId === 5) {
            instructionsHTML = `
                <li>Complete the 10-column worksheet, applying adjustments and correctly extending balances.</li>
                ${deferredLine}
                <li>Complete all required fields. Enter amounts without commas and decimal places. Round off centavos to the nearest peso. Validate each task to unlock the next one.</li>
            `;
        } else {
             instructionsHTML = `
                <li>Perform the necessary procedures to complete the ${taskTitle}.</li>
                ${deferredLine}
                <li>Complete all required fields. Enter amounts without commas and decimal places. Round off centavos to the nearest peso. Validate each task to unlock the next one.</li>
            `;
        }

        return `
            <p class="font-bold">Instructions:</p>
            <ul class="list-disc list-inside space-y-1 ml-2">
                ${instructionsHTML}
            </ul>
        `;
    }
};

export const getAccountType = (acc) => {
    if (['Cash', 'Accounts Receivable', 'Merchandise Inventory', 'Supplies', 'Prepaid Rent', 'Equipment', 'Furniture', 'Building', 'Land'].includes(acc)) return 'Asset';
    if (acc.includes('Accumulated Depreciation')) return 'Asset';
    if (['Accounts Payable', 'Notes Payable', 'Salaries Payable', 'Utilities Payable', 'Interest Payable', 'Unearned Revenue'].includes(acc)) return 'Liability';
    if (['Owner, Capital', 'Share Capital', 'Retained Earnings'].includes(acc)) return 'Equity'; 
    if (['Owner, Drawings', 'Dividends'].includes(acc)) return 'Equity';
    if (acc.includes('Revenue') || acc === 'Sales' || acc.includes('Income') || acc.includes('Sales Discounts') || acc.includes('Sales Returns')) return 'Revenue';
    if (acc.includes('Expense') || acc === 'Cost of Goods Sold' || acc === 'Purchases' || acc.includes('Purchase Discounts') || acc.includes('Purchase Returns') || acc === 'Freight In' || acc === 'Freight Out') return 'Expense';
    return 'Asset';
};

export const sortAccounts = (accounts) => [...accounts].sort((a, b) => {
    const indexA = CANONICAL_ACCOUNT_ORDER.indexOf(a);
    const indexB = CANONICAL_ACCOUNT_ORDER.indexOf(b);
    if (indexA === -1 && indexB === -1) return a.localeCompare(b);
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
});

export const generateBeginningBalances = (businessType, ownership) => {
    const balances = {};
    let totalDr = 0; let totalCr = 0;
    const assetsPool = ["Cash", "Accounts Receivable", "Supplies", "Prepaid Rent", "Equipment", "Furniture"];
    const liabilityPool = ["Accounts Payable", "Notes Payable", "Salaries Payable", "Utilities Payable", "Unearned Revenue"];
    if (businessType === 'Merchandising' || businessType === 'Manufacturing') { assetsPool.push("Merchandise Inventory"); }
    const selectedAccounts = new Set(["Cash"]);
    const numAssets = Math.floor(Math.random() * 3) + 3;
    for(let i=0; i<numAssets; i++) selectedAccounts.add(assetsPool[Math.floor(Math.random() * assetsPool.length)]);
    const numLiabs = Math.floor(Math.random() * 3) + 2;
    for(let i=0; i<numLiabs; i++) selectedAccounts.add(liabilityPool[Math.floor(Math.random() * liabilityPool.length)]);
    const equityAcc = ownership === 'Sole Proprietorship' ? 'Owner, Capital' : 'Retained Earnings';
    selectedAccounts.add(equityAcc);
    
    Array.from(selectedAccounts).forEach(acc => {
        if (acc === equityAcc) return; 
        let amount = 0;
        if (acc === 'Cash') amount = Math.floor(Math.random() * 500000) + 100000; 
        else amount = Math.floor(Math.random() * 50000) + 5000;
        amount = Math.round(amount / 100) * 100;
        const type = getAccountType(acc);
        if (type === 'Asset') { balances[acc] = { dr: amount, cr: 0 }; totalDr += amount; } 
        else { balances[acc] = { dr: 0, cr: amount }; totalCr += amount; }
    });
    const equityNeeded = totalDr - totalCr;
    if (equityNeeded < 0) { balances['Cash'].dr += Math.abs(equityNeeded) + 200000; totalDr += Math.abs(equityNeeded) + 200000; balances[equityAcc] = { dr: 0, cr: 200000 }; totalCr += 200000; } 
    else { balances[equityAcc] = { dr: 0, cr: equityNeeded }; totalCr += equityNeeded; }
    return { balances, total: totalDr };
};

const fmt = (n) => `P${n.toLocaleString()}`;

export const generateTransactions = (count, type, ownership, inventorySystem, options, isSubsequentYear, deferredExpenseMethod, deferredIncomeMethod) => {
    const transactions = [];
    // Define business type check early
    const isMerch = type === 'Merchandising' || type === 'Manufacturing'; 
    
    const createAnalysis = (debits, credits, isInvest = false, isDraw = false) => {
        let a = { assets: 'No Effect', liabilities: 'No Effect', equity: 'No Effect', cause: '' };
        const dr = debits[0].account; const cr = credits[0].account;
        const drType = getAccountType(dr); const crType = getAccountType(cr);
        if (drType === 'Asset') a.assets = 'Increase';
        if (crType === 'Asset') a.assets = a.assets === 'Increase' ? 'No Effect' : 'Decrease'; 
        if (crType === 'Liability') a.liabilities = 'Increase';
        if (drType === 'Liability') a.liabilities = 'Decrease';
        if (isInvest) { a.equity = 'Increase'; a.cause = 'Increase in Capital'; }
        else if (isDraw) { a.equity = 'Decrease'; a.cause = ownership === 'Sole Proprietorship' ? 'Increase in Drawings' : 'Decrease in Capital'; } 
        else if (crType === 'Revenue' && cr !== 'Sales Returns and Allowances') { a.equity = 'Increase'; a.cause = 'Increase in Income'; }
        else if (drType === 'Expense' || dr === 'Sales Returns and Allowances') { a.equity = 'Decrease'; a.cause = 'Increase in Expense'; }
        if (debits.some(d => d.account === 'Cost of Goods Sold')) { a.assets = 'Increase'; a.equity = 'Increase'; a.cause = 'Increase in Income'; } 
        else if (dr === 'Sales Returns and Allowances') { a.equity = 'Decrease'; a.cause = 'Decrease in Income'; } 
        else if (cr === 'Purchase Returns and Allowances') { a.equity = 'Increase'; a.cause = 'Decrease in Expense'; }
        return a;
    };
    
    // --- Helper for Shipping Terms ---
    const getShippingTerms = () => {
        const term = Math.random() > 0.5 ? 'FOB Shipping Point' : 'FOB Destination';
        const pay = Math.random() > 0.5 ? 'Freight Collect' : 'Freight Prepaid';
        return `${term}, ${pay}`;
    };

    // --- Transaction Templates ---
    const transactionTemplates = [];
    const revenueAcc = type === 'Merchandising' ? 'Sales' : 'Service Revenue';
    const capitalAcc = ownership === 'Sole Proprietorship' ? 'Owner, Capital' : 'Share Capital';
    const drawAcc = ownership === 'Sole Proprietorship' ? 'Owner, Drawings' : 'Dividends';
    
    // Determine Account Names based on Method
    const suppliesAssetAcc = 'Supplies';
    const suppliesExpAcc = 'Supplies Expense';
    const suppliesDebit = deferredExpenseMethod === 'Asset' ? suppliesAssetAcc : suppliesExpAcc;

    const prepaidRentAssetAcc = 'Prepaid Rent';
    const rentExpAcc = 'Rent Expense';
    const rentDebit = deferredExpenseMethod === 'Asset' ? prepaidRentAssetAcc : rentExpAcc;

    const unearnedRevLiabAcc = 'Unearned Revenue';
    const unearnedRevIncAcc = revenueAcc; // Service Revenue or Sales
    const unearnedCredit = deferredIncomeMethod === 'Liability' ? unearnedRevLiabAcc : unearnedRevIncAcc;


    const revenueArAmt = Math.round((Math.random() * 10000 + 10000) / 100) * 100;
    const suppliesAmt = Math.round((Math.random() * 3000 + 4000) / 100) * 100;
    const rentAmt = 12000;
    const salaryAmt = Math.round((Math.random() * 5000 + 7000) / 100) * 100;
    const utilityAmt = Math.round((Math.random() * 1000 + 2000) / 100) * 100;
    const drawAmt = Math.round((Math.random() * 2000 + 4000) / 100) * 100;
    const equipAmt = Math.round((Math.random() * 20000 + 40000) / 100) * 100;
    const unearnedAmt = Math.round((Math.random() * 5000 + 8000) / 100) * 100;
    const merchAmt = Math.round((Math.random() * 10000 + 15000) / 100) * 100;

    // 1. Initial Investment (Only if first year)
    if (!isSubsequentYear) {
        const investAmount = 800000; 
        transactionTemplates.push({ type: 'Investment', description: `Initial capital investment of ${fmt(investAmount)}`, debits: [{ account: 'Cash', amount: investAmount }], credits: [{ account: capitalAcc, amount: investAmount }], amount: investAmount, analysis: createAnalysis([{account: 'Cash'}], [{account: capitalAcc}], true) });
    }
    
    // 2. Pay Rent in Advance (Deferred Expense)
    transactionTemplates.push({ type: 'Rent Advance', description: `Paid 3 months office rent in advance, ${fmt(rentAmt)}`, debits: [{ account: rentDebit, amount: rentAmt }], credits: [{ account: 'Cash', amount: rentAmt }], amount: rentAmt, analysis: createAnalysis([{account: rentDebit}], [{account: 'Cash'}]) });

    // 3. Purchase Supplies on Account (Deferred Expense)
    transactionTemplates.push({ type: 'Supplies Credit', description: `Purchased office supplies on account for ${fmt(suppliesAmt)}`, debits: [{ account: suppliesDebit, amount: suppliesAmt }], credits: [{ account: 'Accounts Payable', amount: suppliesAmt }], amount: suppliesAmt, analysis: createAnalysis([{account: suppliesDebit}], [{account: 'Accounts Payable'}]) });

    // 3b. Purchase Supplies on Cash (Deferred Expense)
    transactionTemplates.push({ type: 'Supplies Cash', description: `Purchased office supplies for cash, ${fmt(suppliesAmt)}`, debits: [{ account: suppliesDebit, amount: suppliesAmt }], credits: [{ account: 'Cash', amount: suppliesAmt }], amount: suppliesAmt, analysis: createAnalysis([{account: suppliesDebit}], [{account: 'Cash'}]) });

    // 4. Revenue for Cash (Service Only)
    if (!isMerch) {
        const revenueCashAmt = revenueArAmt + 10000;
        transactionTemplates.push({ type: 'Revenue Cash', description: `Provided services for cash, ${fmt(revenueCashAmt)}`, debits: [{ account: 'Cash', amount: revenueCashAmt }], credits: [{ account: revenueAcc, amount: revenueCashAmt }], amount: revenueCashAmt, analysis: createAnalysis([{account: 'Cash'}], [{account: revenueAcc}]) });

        // 5. Revenue on Account (Service Only)
        transactionTemplates.push({ type: 'Revenue Credit', description: `Provided services on account, ${fmt(revenueArAmt)}`, debits: [{ account: 'Accounts Receivable', amount: revenueArAmt }], credits: [{ account: revenueAcc, amount: revenueArAmt }], amount: revenueArAmt, analysis: createAnalysis([{account: 'Accounts Receivable'}], [{account: revenueAcc}]) });
    }

    // 6. Expense: Salaries Paid
    transactionTemplates.push({ type: 'Salary Expense', description: `Paid monthly salaries: ${fmt(salaryAmt)}`, debits: [{ account: 'Salaries Expense', amount: salaryAmt }], credits: [{ account: 'Cash', amount: salaryAmt }], amount: salaryAmt, analysis: createAnalysis([{account: 'Salaries Expense'}], [{account: 'Cash'}]) });

    // 7. Expense: Utilities Paid
    transactionTemplates.push({ type: 'Utility Expense', description: `Paid electricity and water bills: ${fmt(utilityAmt)}`, debits: [{ account: 'Utilities Expense', amount: utilityAmt }], credits: [{ account: 'Cash', amount: utilityAmt }], amount: utilityAmt, analysis: createAnalysis([{account: 'Utilities Expense'}], [{account: 'Cash'}]) });
    
    // 8. Owner's Withdrawal
    transactionTemplates.push({ type: 'Drawings', description: `Owner withdrew cash for personal use: ${fmt(drawAmt)}`, debits: [{ account: drawAcc, amount: drawAmt }], credits: [{ account: 'Cash', amount: drawAmt }], amount: drawAmt, analysis: createAnalysis([{account: drawAcc}], [{account: 'Cash'}], false, true) });

    // 9. Purchase Equipment for Cash
    transactionTemplates.push({ type: 'Equip Cash', description: `Purchased new equipment for cash: ${fmt(equipAmt)}`, debits: [{ account: 'Equipment', amount: equipAmt }], credits: [{ account: 'Cash', amount: equipAmt }], amount: equipAmt, analysis: createAnalysis([{account: 'Equipment'}], [{account: 'Cash'}]) });
    
    // 10. Revenue in Advance (Deferred Income)
    transactionTemplates.push({ type: 'Unearned Revenue', description: `Received cash in advance for services to be performed next month: ${fmt(unearnedAmt)}`, debits: [{ account: 'Cash', amount: unearnedAmt }], credits: [{ account: unearnedCredit, amount: unearnedAmt }], amount: unearnedAmt, analysis: createAnalysis([{account: 'Cash'}], [{account: unearnedCredit}]) });

    // --- OPTIONAL / REPEAT TRANSACTIONS ---
    // A. Collection (Standard)
    transactionTemplates.push({ type: 'Collection AR', description: `Received payment on account from customer, ${fmt(revenueArAmt)}`, debits: [{ account: 'Cash', amount: revenueArAmt }], credits: [{ account: 'Accounts Receivable', amount: revenueArAmt }], amount: revenueArAmt, analysis: createAnalysis([{account: 'Cash'}], [{account: 'Accounts Receivable'}]) });

    // B. Payment (Standard)
    transactionTemplates.push({ type: 'Payment AP', description: `Paid supplier for goods/supplies purchased earlier, ${fmt(suppliesAmt)}`, debits: [{ account: 'Accounts Payable', amount: suppliesAmt }], credits: [{ account: 'Cash', amount: suppliesAmt }], amount: suppliesAmt, analysis: createAnalysis([{account: 'Accounts Payable'}], [{account: 'Cash'}]) });
    
    // Merchandising specific
    if (isMerch) {
        const merchDrAcc = inventorySystem === 'Perpetual' ? 'Merchandise Inventory' : 'Purchases';
        const freightAccIn = inventorySystem === 'Perpetual' ? 'Merchandise Inventory' : 'Freight In';
        
        // Purchase Logic (Cash & Credit, with options)
        const basePurAmt = merchAmt;
        let purAmount = basePurAmt;
        let purDesc = `Purchased merchandise on account`;
        let purTerms = `Terms: ${getShippingTerms()}`;
        
        // Trade Discount Logic
        if (options.includeTradeDiscounts) {
            const tdRate = 0.20; 
            purAmount = basePurAmt * (1 - tdRate);
            purDesc += `, list price ${fmt(basePurAmt)} less 20% trade discount`;
        } else {
            purDesc += ` for ${fmt(purAmount)}`;
        }
        
        // Cash Discount Logic (Terms)
        if (options.includeCashDiscounts) {
            purDesc += `, terms 2/10, n/30`;
        }
        
        purDesc += `. ${purTerms}`;

        // Add Purchase Credit
        transactionTemplates.push({ 
            type: 'Merch Purchase Credit', 
            description: purDesc, 
            debits: [{ account: merchDrAcc, amount: purAmount }], 
            credits: [{ account: 'Accounts Payable', amount: purAmount }], 
            amount: purAmount, 
            analysis: createAnalysis([{account: merchDrAcc}], [{account: 'Accounts Payable'}]) 
        });

        // Add Purchase Cash
        let purCashDesc = `Purchased merchandise for cash`;
        if (options.includeTradeDiscounts) {
             purCashDesc += `, list price ${fmt(basePurAmt)} less 20% trade discount`;
        } else {
             purCashDesc += ` for ${fmt(purAmount)}`;
        }
        purCashDesc += `. ${purTerms}`;

        transactionTemplates.push({ 
            type: 'Merch Purchase Cash', 
            description: purCashDesc, 
            debits: [{ account: merchDrAcc, amount: purAmount }], 
            credits: [{ account: 'Cash', amount: purAmount }], 
            amount: purAmount, 
            analysis: createAnalysis([{account: merchDrAcc}], [{account: 'Cash'}]) 
        });

        // Freight In Logic
        if (options.includeFreight) {
            const freightAmt = 1200;
            transactionTemplates.push({ 
                type: 'Freight In', 
                description: `Paid freight on merchandise purchased: ${fmt(freightAmt)}`, 
                debits: [{ account: freightAccIn, amount: freightAmt }], 
                credits: [{ account: 'Cash', amount: freightAmt }], 
                amount: freightAmt, 
                analysis: createAnalysis([{account: freightAccIn}], [{account: 'Cash'}]) 
            });
        }
        
        // Sale Logic (Cash & Credit, with options)
        const baseSaleAmt = revenueArAmt + 5000;
        let saleAmount = baseSaleAmt;
        let saleDesc = `Sold merchandise on account`;
        let saleTerms = `Terms: ${getShippingTerms()}`;
        
        if (options.includeTradeDiscounts) {
            const tdRate = 0.10;
            saleAmount = baseSaleAmt * (1 - tdRate);
            saleDesc += `, list price ${fmt(baseSaleAmt)} less 10% trade discount`;
        } else {
            saleDesc += ` for ${fmt(saleAmount)}`;
        }
        
        if (options.includeCashDiscounts) {
            saleDesc += `, terms 2/10, n/30`;
        }
        
        saleDesc += `. ${saleTerms}`;

        // Add Sale Credit
        transactionTemplates.push({ 
            type: 'Merch Sale Credit', 
            description: saleDesc, 
            debits: [{ account: 'Accounts Receivable', amount: saleAmount }], 
            credits: [{ account: 'Sales', amount: saleAmount }], 
            amount: saleAmount, 
            analysis: createAnalysis([{account: 'Accounts Receivable'}], [{account: 'Sales'}]) 
        });
        
        // Add Sale Cash
        let saleCashDesc = `Sold merchandise for cash`;
        if (options.includeTradeDiscounts) {
            saleCashDesc += `, list price ${fmt(baseSaleAmt)} less 10% trade discount`;
        } else {
            saleCashDesc += ` for ${fmt(saleAmount)}`;
        }
        saleCashDesc += `. ${saleTerms}`;
        
        transactionTemplates.push({ 
            type: 'Merch Sale Cash', 
            description: saleCashDesc, 
            debits: [{ account: 'Cash', amount: saleAmount }], 
            credits: [{ account: 'Sales', amount: saleAmount }], 
            amount: saleAmount, 
            analysis: createAnalysis([{account: 'Cash'}], [{account: 'Sales'}]) 
        });
        
        // Freight Out Logic
        if (options.includeFreight) {
            const foAmt = 1500;
            transactionTemplates.push({
                type: 'Freight Out',
                description: `Paid freight on merchandise sold (FOB Destination): ${fmt(foAmt)}`,
                debits: [{ account: 'Freight Out', amount: foAmt }],
                credits: [{ account: 'Cash', amount: foAmt }],
                amount: foAmt,
                analysis: createAnalysis([{account: 'Freight Out'}], [{account: 'Cash'}])
            });
        }

        // --- NEW DISCOUNT TRANSACTIONS ---
        if (options.includeCashDiscounts) {
            // Collection with Discount
            const colGross = 8000;
            const colDisc = colGross * 0.02; // 2%
            const colNet = colGross - colDisc;
            transactionTemplates.push({
                type: 'Collection Discount',
                description: `Collected ${fmt(colGross)} accounts receivable within discount period (2/10, n/30)`,
                debits: [
                    { account: 'Cash', amount: colNet },
                    { account: 'Sales Discounts', amount: colDisc }
                ],
                credits: [{ account: 'Accounts Receivable', amount: colGross }],
                amount: colGross,
                // Manual analysis object because Sales Discounts (Revenue) behaves like Expense (Equity Decrease) in analysis
                analysis: { assets: 'Decrease', liabilities: 'No Effect', equity: 'Decrease', cause: 'Decrease in Income' }
            });

            // Payment with Discount
            const payGross = 6000;
            const payDisc = payGross * 0.02;
            const payNet = payGross - payDisc;
            const discountAccount = inventorySystem === 'Perpetual' ? 'Merchandise Inventory' : 'Purchase Discounts';
            
            let payAnalysis = { assets: 'Decrease', liabilities: 'Decrease', equity: 'Increase', cause: 'Decrease in Expense' };
            if (inventorySystem === 'Perpetual') {
                // Cr Inventory -> Assets Decrease. Net Asset change (-Cash -Inv) matches Liab change (-AP). No Equity effect.
                payAnalysis = { assets: 'Decrease', liabilities: 'Decrease', equity: 'No Effect', cause: '' };
            }

            transactionTemplates.push({
                type: 'Payment Discount',
                description: `Paid ${fmt(payGross)} accounts payable within discount period (2/10, n/30)`,
                debits: [{ account: 'Accounts Payable', amount: payGross }],
                credits: [
                    { account: 'Cash', amount: payNet },
                    { account: discountAccount, amount: payDisc }
                ],
                amount: payGross,
                analysis: payAnalysis
            });
        }
    }

    // --- Dynamic Selection and Ordering ---
    let coreTypes = ['Rent Advance', 'Supplies Credit', 'Revenue Cash', 'Revenue Credit', 'Salary Expense', 'Utility Expense', 'Drawings', 'Equip Cash', 'Unearned Revenue'];
    
    if (isMerch) {
        coreTypes = [];
        coreTypes.push('Merch Purchase Credit');
        coreTypes.push('Merch Sale Credit');
        if (options.includeCashDiscounts) coreTypes.push('Collection Discount');
        else coreTypes.push('Collection AR');
        if (options.includeCashDiscounts) coreTypes.push('Payment Discount');
        else coreTypes.push('Payment AP');
        if (options.includeFreight) {
            coreTypes.push('Freight In'); 
        }
        coreTypes.push('Rent Advance');
        coreTypes.push('Salary Expense');
        coreTypes.push('Utility Expense');
        coreTypes.push('Supplies Cash');
    }
    
    let selectedTemplates = [];
    
    // Handle Investment First
    if (!isSubsequentYear) {
        const invest = transactionTemplates.find(t => t.type === 'Investment');
        if (invest) selectedTemplates.push(invest);
    }

    // Select Core
    coreTypes.forEach(type => {
        const template = transactionTemplates.find(t => t.type === type);
        if (template) {
            selectedTemplates.push(template);
        }
    });

    // Fill the remaining spots
    const fillPool = transactionTemplates.filter(t => t.type !== 'Investment');

    while (selectedTemplates.length < count) {
        if (fillPool.length === 0) break;
        const randomIndex = Math.floor(Math.random() * fillPool.length);
        const template = fillPool[randomIndex];
        const transaction = JSON.parse(JSON.stringify(template)); 
        
        if (['Revenue Cash', 'Salary Expense', 'Collection AR', 'Utility Expense', 'Revenue Credit', 'Merch Purchase Cash', 'Merch Sale Cash', 'Collection Discount', 'Payment Discount'].includes(transaction.type)) {
            transaction.amount = transaction.amount + Math.floor(Math.random() * 2000) - 1000;
            if (transaction.amount < 1000) transaction.amount = 1000; 
            
            if (transaction.debits.length > 1 || transaction.credits.length > 1) {
                const ratio = transaction.amount / template.amount;
                transaction.debits.forEach(d => d.amount = Math.round(d.amount * ratio));
                transaction.credits.forEach(c => c.amount = Math.round(c.amount * ratio));
            } else {
                transaction.debits[0].amount = transaction.amount;
                transaction.credits[0].amount = transaction.amount;
            }
            transaction.description = transaction.description.replace(/P[\d,]+/, fmt(transaction.amount));
        }

        selectedTemplates.push(transaction);
    }
    
    const randomDays = Array.from({ length: count }, () => Math.floor(Math.random() * 30) + 1).sort((a, b) => a - b);
    
    const finalTransactions = selectedTemplates.slice(0, count).map((t, index) => {
        const day = randomDays[index];
        const dateStr = `2023-01-${day.toString().padStart(2, '0')}`;
        const transaction = { ...t, id: index + 1, date: dateStr };
        return transaction;
    });
    
    return finalTransactions.filter(t => t && t.analysis && t.debits && t.debits.length > 0 && t.credits && t.credits.length > 0);
};

export const generateAdjustments = (ledgerData, businessType, deferredExpenseMethod, deferredIncomeMethod) => {
    const adjustments = [];
    const isMerch = businessType === 'Merchandising' || businessType === 'Manufacturing';
    
    // 1. Supplies
    const suppliesAssetAmt = ledgerData['Supplies'] ? ledgerData['Supplies'].debit : 0;
    const suppliesExpAmt = ledgerData['Supplies Expense'] ? ledgerData['Supplies Expense'].debit : 0;
    const totalSupplies = suppliesAssetAmt + suppliesExpAmt;
    if (totalSupplies > 0) {
        const endingSupplies = Math.round(totalSupplies * 0.3); 
        if (deferredExpenseMethod === 'Asset') {
            const used = totalSupplies - endingSupplies;
             adjustments.push({ id: 'adj1', desc: `Supplies on hand at end of period are P${endingSupplies.toLocaleString()}.`, drAcc: 'Supplies Expense', crAcc: 'Supplies', amount: used });
        } else { // Expense Method
            const unused = endingSupplies;
             adjustments.push({ id: 'adj1', desc: `Supplies on hand at end of period are P${endingSupplies.toLocaleString()}.`, drAcc: 'Supplies', crAcc: 'Supplies Expense', amount: unused });
        }
    }

    // 2. Prepaid Rent
    const rentAssetAmt = ledgerData['Prepaid Rent'] ? ledgerData['Prepaid Rent'].debit : 0;
    const rentExpAmt = ledgerData['Rent Expense'] ? ledgerData['Rent Expense'].debit : 0;
    const totalRent = rentAssetAmt + rentExpAmt;
    if (totalRent > 0) {
        if (deferredExpenseMethod === 'Asset') {
            const expired = Math.round(totalRent / 3);
            adjustments.push({ id: 'adj2', desc: `One month of prepaid rent has expired: P${expired.toLocaleString()}.`, drAcc: 'Rent Expense', crAcc: 'Prepaid Rent', amount: expired });
        } else { // Expense Method
            const unexpired = Math.round((totalRent / 3) * 2);
            adjustments.push({ id: 'adj2', desc: `Two months of rent are still unexpired: P${unexpired.toLocaleString()}.`, drAcc: 'Prepaid Rent', crAcc: 'Rent Expense', amount: unexpired });
        }
    }

    // 3. Unearned Revenue
    const revAccName = isMerch ? 'Sales' : 'Service Revenue';
    const unearnedLiabAmt = ledgerData['Unearned Revenue'] ? ledgerData['Unearned Revenue'].credit : 0;
    const revenueAmt = ledgerData[revAccName] ? ledgerData[revAccName].credit : 0;
    
    if (unearnedLiabAmt > 0 || (deferredIncomeMethod === 'Income' && revenueAmt > 20000)) { 
         if (deferredIncomeMethod === 'Liability') {
             const earned = 2500;
             adjustments.push({ id: 'adj3', desc: `Services performed related to advance payments: P${earned.toLocaleString()}.`, drAcc: 'Unearned Revenue', crAcc: revAccName, amount: earned });
         } else { // Income Method
             const unearned = 3500;
             adjustments.push({ id: 'adj3', desc: `Services paid in advance but not yet performed: P${unearned.toLocaleString()}.`, drAcc: revAccName, crAcc: 'Unearned Revenue', amount: unearned });
         }
    }

    // 4. Accrued Salaries
    adjustments.push({ id: 'adj4', desc: `Accrued salaries: P2,000.`, drAcc: 'Salaries Expense', crAcc: 'Salaries Payable', amount: 2000 });
    
    // 5. Depreciation
    adjustments.push({ id: 'adj5', desc: `Depreciation: P1,500.`, drAcc: 'Depreciation Expense', crAcc: 'Accumulated Depreciation - Equipment', amount: 1500 });

    // 6. Ending Inventory (Merch/Mfg only)
    if (isMerch) {
         const endingInv = 25000;
         adjustments.push({ id: 'adj6', desc: `Merchandise Inventory, End: P${endingInv.toLocaleString()}.`, drAcc: 'Merchandise Inventory', crAcc: 'Income Summary', amount: endingInv });
    }

    return adjustments;
};

// --- NEW HELPER ---
export const getLetterGrade = (score, maxScore) => {
    if (maxScore === 0) return 'IR';
    const percentage = (score / maxScore) * 100;
    
    if (percentage >= 95) return 'A';    // Advanced
    if (percentage >= 85) return 'P';    // Proficient
    if (percentage >= 75) return 'D';    // Developing
    return 'IR';                         // Intervention Required
};
