import React from 'react';
import { Wand2 } from 'lucide-react';
import { TRANSLATIONS, Language } from '../types';

interface Props {
  lang: Language;
}

export const StepLoading: React.FC<Props> = ({ lang }) => {
  const t = TRANSLATIONS[lang];
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] animate-fadeIn">
      <div className="relative">
        <div className="w-32 h-32 rounded-full border-4 border-slate-800 border-t-primary animate-spin"></div>
        <div className="absolute inset-0 flex items-center justify-center text-primary">
          <Wand2 size={48} className="animate-bounce" />
        </div>
      </div>
      
      <h2 className="text-3xl font-bold mt-8 text-white text-center">
        {t.loadingTitle}
      </h2>
      <p className="text-slate-400 mt-2 text-center max-w-md">
        {t.loadingSubtitle}
      </p>
      
      <div className="flex gap-2 mt-6">
        <span className="w-3 h-3 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]"></span>
        <span className="w-3 h-3 bg-purple-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
        <span className="w-3 h-3 bg-pink-500 rounded-full animate-bounce"></span>
      </div>
    </div>
  );
};