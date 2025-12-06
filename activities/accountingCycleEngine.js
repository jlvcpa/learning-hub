import React from 'https://esm.sh/react@18.2.0';
import { createRoot } from 'https://esm.sh/react-dom@18.2.0/client';
import htm from 'https://esm.sh/htm';
import { App } from './accountingCycle/App.js';

const html = htm.bind(React.createElement);

// Inject Styles for the React App
const AC_STYLES = `
<style id="ac-styles">
    /* Custom Scrollbar Styles */
    .custom-scrollbar::-webkit-scrollbar { width: 8px; height: 8px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: #f1f1f1; border-radius: 4px; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
    
    /* Hide number input spinners */
    input[type=number]::-webkit-inner-spin-button, input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; } 
    input[type=number] { -moz-appearance: textfield; }

    /* --- UI STYLES --- */
    .task-sticky-header { position: sticky; top: 123px; z-index: 45; }
    .header-bg { background-color: #0f172a; color: white; }

    /* --- PRINT STYLES --- */
    @media print {
        @page { margin: 0.5in; size: landscape; }
        body { background-color: white; color: black; margin: 0; zoom: 75%; }
        .no-print, #timer-box, #action-area, #screen-footer, .sticky-btn-area, #login-step-btn, #sidebar, header { display: none !important; }
        .print-header-custom, #student-print-info, #print-instructions, #print-footer { display: block !important; }
        .printable-area { width: 100% !important; max-width: 100% !important; margin: 0 !important; padding: 0 !important; border: none !important; box-shadow: none !important; padding-bottom: 2in !important; }
        input, select { border: none !important; border-bottom: 1px solid #ccc !important; background-color: white !important; color: black !important; font-size: 8pt !important; padding: 1px 0px !important; font-weight: normal !important; }
        select { appearance: none; padding-right: 15px !important; }
        #task-header-title { display: block !important; color: black !important; margin-top: 10px; }
        .task-sticky-header { position: static !important; background-color: white !important; border-bottom: none !important; padding: 0 !important; margin: 0 !important; }
        #student-print-info { margin-bottom: 15px; width: 100%; }
        .rubric-box { border: 1px solid black !important; background: white !important; page-break-inside: avoid; margin-bottom: 20px; box-shadow: none !important; }
        .rubric-box th, .rubric-box td { border: 1px solid black !important; color: black !important; font-size: 7pt !important; }
        .validation-icon { display: none !important; } 
    }
</style>
`;

/**
 * Initializes the Accounting Cycle Activity Creator Module.
 * @param {object} db - Firestore instance
 * @param {string} userId - Current user ID
 * @param {string} appId - Current app ID
 */
export async function initAccountingCycle(db, userId, appId) {
    const container = document.getElementById('accounting-cycle-module-container');
    
    // 1. Inject Styles
    if (!document.getElementById('ac-styles')) {
        document.head.insertAdjacentHTML('beforeend', AC_STYLES);
    }

    // 2. Mount React App
    // We use a unique root for this container to allow re-mounting if needed
    if (!container._reactRoot) {
        container._reactRoot = createRoot(container);
    }
    
    // Clear previous HTML content just in case, though render handles it
    container.innerHTML = ''; 
    container._reactRoot.render(html`<${App} />`);
    
    // Ensure visibility
    document.getElementById('section-accounting_cycle').classList.remove('hidden');
}
