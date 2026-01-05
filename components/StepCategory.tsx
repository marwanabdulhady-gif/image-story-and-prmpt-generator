import React from 'react';
import { CATEGORIES, TRANSLATIONS, Language } from '../types';

interface Props {
  onSelect: (id: string) => void;
  lang: Language;
}

export const StepCategory: React.FC<Props> = ({ onSelect, lang }) => {
  const t = TRANSLATIONS[lang];
  return (
    <div className="w-full max-w-5xl mx-auto animate-fadeIn">
      <h2 className="text-3xl font-bold text-center mb-8 text-white">{t.chooseCategory}</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => onSelect(cat.id)}
            className="group relative flex flex-col items-center justify-center p-8 bg-surface border border-slate-700/50 rounded-2xl hover:border-primary/50 hover:shadow-[0_0_20px_rgba(139,92,246,0.3)] transition-all duration-300 h-48"
          >
            <div className="text-5xl mb-4 group-hover:scale-110 transition-transform duration-300 filter drop-shadow-lg">
              {cat.icon}
            </div>
            <span className="text-lg font-medium text-slate-300 group-hover:text-white">
              {cat.label[lang]}
            </span>
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 rounded-2xl transition-opacity pointer-events-none" />
          </button>
        ))}
      </div>
    </div>
  );
};