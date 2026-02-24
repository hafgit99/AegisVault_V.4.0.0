import React, { useState, useEffect } from 'react';
import { X, Sparkles, ChevronRight, CheckCircle2 } from 'lucide-react';

export function SpotlightWalkthrough() {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(0);

  // Sadece ilk defa giren kullanıcıya göster (ya da demo amaçlı hep göster)
  useEffect(() => {
    const hasSeenTour = localStorage.getItem('aegis_seen_tour');
    if (!hasSeenTour) {
      setTimeout(() => setIsOpen(true), 1500);
    }
  }, []);

  const closeTour = () => {
    setIsOpen(false);
    localStorage.setItem('aegis_seen_tour', 'true');
  };

  const steps = [
    {
      title: "Tarayıcı Eklentisini Keşfedin",
      content: "Aegis Vault WXT sayesinde şifrelerinizi kopyalamanıza gerek kalmaz. Girdiğiniz web sitelerinde (örn. Netflix, Google) otomatik doldurma aktif olur.",
      icon: <Sparkles className="w-6 h-6 text-white" />
    },
    {
      title: "Güvenli Otomatik Doldurma",
      content: "Şifre alanına tıkladığınızda 'Aegis' ikonunu göreceksiniz. Vault kasanız açıksa (Unlocked), şifreleriniz sıfır bilgi mimarisiyle anında doldurulur.",
      icon: <CheckCircle2 className="w-6 h-6 text-white" />
    }
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex animate-in fade-in duration-500 pointer-events-auto">
      {/* Background Spotlight Mask (Magic UI Effect) */}
      <div className="absolute inset-0 bg-[var(--color-deep-navy)]/80 backdrop-blur-sm transition-all" />
      
      {/* Spotlight Circle cut-out logic can be complex in raw React/CSS, 
          so we use a glowing centered modal that acts as a localized spotlight */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-4">
        <div className="w-[450px] relative pointer-events-auto">
          {/* Animated Glow Behind Modal */}
          <div className="absolute -inset-1 bg-gradient-to-r from-[var(--color-sage-green)] to-emerald-300 rounded-3xl blur-xl opacity-50 animate-pulse" />
          
          <div className="bg-[rgba(255,255,255,0.9)] backdrop-blur-xl border border-white/50 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
            <button onClick={closeTour} className="absolute top-4 right-4 p-2 text-gray-400 hover:text-red-500 transition-colors bg-black/5 hover:bg-red-50 rounded-full">
              <X className="w-4 h-4" />
            </button>

            <div className="flex flex-col items-center text-center gap-4 relative z-10">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--color-sage-green)] to-[var(--color-deep-navy)] flex items-center justify-center shadow-[0_0_30px_rgba(135,159,132,0.5)]">
                {steps[step].icon}
              </div>
              
              <h2 className="text-2xl font-bold text-[var(--color-deep-navy)] mt-2">
                {steps[step].title}
              </h2>
              <p className="text-sm text-gray-600 leading-relaxed font-medium">
                {steps[step].content}
              </p>

              <div className="flex items-center justify-between w-full mt-6 pt-6 border-t border-black/5">
                <div className="flex gap-1.5">
                  {steps.map((_, i) => (
                    <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${step === i ? 'w-6 bg-[var(--color-sage-green)]' : 'w-1.5 bg-black/10'}`} />
                  ))}
                </div>
                
                <button 
                  onClick={() => step < steps.length - 1 ? setStep(s => s + 1) : closeTour()}
                  className="flex items-center gap-2 bg-[var(--color-deep-navy)] text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-opacity-90 active:scale-95 transition-all shadow-md group"
                >
                  {step < steps.length - 1 ? 'İleri' : 'Başla'}
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
