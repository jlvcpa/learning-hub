import React from 'https://esm.sh/react@18.2.0';
import htm from 'https://esm.sh/htm';
import { AlertCircle } from 'https://esm.sh/lucide-react@0.263.1';

const html = htm.bind(React.createElement);

export default function GenericStep({ stepId, title, onChange, data }) {
    return html`
        <div className="p-4 border rounded bg-white printable-area">
             <div className="mb-4 bg-yellow-50 p-3 border border-yellow-200 rounded text-sm text-yellow-800 flex items-start gap-2"><${AlertCircle} size=${16} className="mt-0.5" /><div><strong>Task:</strong> Complete the forms below based on the generated data.<br/><em>(Prototype Note: Enter any text below for steps 6-10)</em></div></div>
            <textarea className="w-full border p-2 h-32 rounded" value=${data?.text || ''} onChange=${(e) => onChange('text', e.target.value)} />
        </div>
    `;
}
