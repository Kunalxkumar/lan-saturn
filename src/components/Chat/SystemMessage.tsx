import React from 'react';
import { Info } from 'lucide-react';

interface SystemMessageProps {
    content: string;
}

export default function SystemMessage({ content }: SystemMessageProps) {
    return (
        <div className="flex items-center gap-3 my-2 px-4 py-1">
            <div className="flex-1 h-px bg-white/[0.06]" />
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-400 bg-white/[0.02] border border-white/5 px-2.5 py-0.5 rounded-md">
                <Info size={12} className="text-sky-400" />
                <span>{content}</span>
            </div>
            <div className="flex-1 h-px bg-white/[0.06]" />
        </div>
    );
}
