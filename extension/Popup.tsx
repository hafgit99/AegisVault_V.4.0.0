import React from 'react';
import { createRoot } from 'react-dom/client';
import '../src/index.css';

const Popup = () => {
  return (
    <div className="w-full h-full bg-[#f0eee9] text-[#0a1128] font-geist flex flex-col p-5 custom-scrollbar">
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold tracking-tight text-[#72886f]">Aegis Vault</h1>
        <div className="w-8 h-8 rounded-full bg-white/40 shadow-sm border border-white/20 flex items-center justify-center">
          <span className="text-sm font-medium">A</span>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-4">
        {/* Bento Grid layout */}
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 glass-card p-4 flex items-center justify-between cursor-pointer hover:bg-white/50 transition-colors">
            <div>
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Quick Access</p>
              <p className="text-lg font-semibold text-[#0a1128]">GitHub</p>
            </div>
            <button className="px-3 py-1.5 bg-[#72886f] text-white rounded-lg text-sm font-medium shadow-sm hover:bg-[#5a6b57] transition-colors">
              Copy
            </button>
          </div>

          <div className="glass-card p-4 flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-white/50 transition-colors">
            <div className="w-10 h-10 rounded-full bg-[#72886f]/10 flex items-center justify-center text-[#72886f]">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
            </div>
            <span className="text-sm font-medium text-[#0a1128]">Passwords</span>
          </div>

          <div className="glass-card p-4 flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-white/50 transition-colors">
            <div className="w-10 h-10 rounded-full bg-[#72886f]/10 flex items-center justify-center text-[#72886f]">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"></rect><line x1="2" y1="10" x2="22" y2="10"></line></svg>
            </div>
            <span className="text-sm font-medium text-[#0a1128]">Cards</span>
          </div>

          <div className="col-span-2 glass-card p-4 mt-2 border border-[#72886f]/20 bg-white/30">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-[#72886f]">Security Score</h3>
              <span className="text-sm font-semibold text-[#72886f]">85%</span>
            </div>
            <div className="w-full bg-slate-200/50 rounded-full h-1.5 overflow-hidden">
              <div className="bg-[#72886f] h-full rounded-full" style={{ width: '85%' }}></div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(<Popup />);
}
