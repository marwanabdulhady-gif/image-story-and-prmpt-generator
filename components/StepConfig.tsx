import React, { useState } from 'react';
import { StoryConfig, TRANSLATIONS, Language } from '../types';
import { Button } from './Button';
import { Sparkles, Users, Globe, BookOpen, Clock, Zap } from 'lucide-react';

interface Props {
  config: StoryConfig;
  onUpdate: (updates: Partial<StoryConfig>) => void;
  onGenerate: () => void;
  lang: Language;
}

export const StepConfig: React.FC<Props> = ({ config, onUpdate, onGenerate, lang }) => {
  const t = TRANSLATIONS[lang];
  const [section, setSection] = useState<'core' | 'characters' | 'world'>('core');

  const SectionButton = ({ id, label, icon: Icon }: any) => (
    <button
      onClick={() => setSection(id)}
      className={`flex items-center gap-2 px-6 py-3 rounded-full font-medium transition-all ${
        section === id 
        ? 'bg-primary text-white shadow-lg shadow-primary/25' 
        : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
      }`}
    >
      <Icon size={18} /> {label}
    </button>
  );

  return (
    <div className="w-full max-w-4xl mx-auto animate-fadeIn pb-10">
      
      {/* Section Nav */}
      <div className="flex justify-center gap-4 mb-8 flex-wrap">
        <SectionButton id="core" label={t.storyCore} icon={BookOpen} />
        <SectionButton id="characters" label={t.characters} icon={Users} />
        <SectionButton id="world" label={t.world} icon={Globe} />
      </div>

      <div className="bg-surface/50 border border-slate-700/50 rounded-3xl p-8 backdrop-blur-sm min-h-[400px]">
        
        {/* --- CORE SECTION --- */}
        {section === 'core' && (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <label className="block text-slate-300 font-semibold mb-2">{t.premise}</label>
              <textarea 
                value={config.premise}
                onChange={(e) => onUpdate({ premise: e.target.value })}
                placeholder={t.yourIdeaPlaceholder}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-slate-200 focus:border-primary focus:ring-1 focus:ring-primary outline-none h-32 resize-none"
              />
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
                 <div>
                    <label className="block text-slate-300 font-semibold mb-2">{t.pacing}</label>
                    <div className="flex bg-slate-900 rounded-xl p-1 border border-slate-700">
                        {['slow', 'balanced', 'fast'].map((p) => (
                            <button
                                key={p}
                                onClick={() => onUpdate({ pacing: p as any })}
                                className={`flex-1 py-2 rounded-lg text-sm capitalize transition-colors ${config.pacing === p ? 'bg-slate-700 text-white font-bold' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                {p}
                            </button>
                        ))}
                    </div>
                 </div>

                 <div>
                    <label className="block text-slate-300 font-semibold mb-2">{t.plotTwist}</label>
                    <div className="flex bg-slate-900 rounded-xl p-1 border border-slate-700">
                        {['none', 'mild', 'shocking'].map((p) => (
                            <button
                                key={p}
                                onClick={() => onUpdate({ plotTwist: p as any })}
                                className={`flex-1 py-2 rounded-lg text-sm capitalize transition-colors ${config.plotTwist === p ? 'bg-slate-700 text-white font-bold' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                {p}
                            </button>
                        ))}
                    </div>
                 </div>
            </div>

            <div>
                 <div className="flex justify-between mb-2">
                    <label className="text-slate-300 font-semibold flex items-center gap-2"><Zap size={16}/> {t.numScenes}</label>
                    <span className="text-primary font-bold bg-primary/10 px-2 py-0.5 rounded">{config.sceneCount}</span>
                </div>
                <input 
                    type="range" min="1" max="10" step="1"
                    value={config.sceneCount}
                    onChange={(e) => onUpdate({ sceneCount: parseInt(e.target.value) })}
                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-primary"
                />
            </div>
          </div>
        )}

        {/* --- CHARACTERS SECTION --- */}
        {section === 'characters' && (
           <div className="space-y-6 animate-fadeIn">
              <div>
                 <div className="flex justify-between mb-2">
                    <label className="text-slate-300 font-semibold flex items-center gap-2"><Users size={16}/> {t.numCharacters}</label>
                    <span className="text-primary font-bold bg-primary/10 px-2 py-0.5 rounded">{config.characterCount}</span>
                </div>
                <input 
                    type="range" min="1" max="5" step="1"
                    value={config.characterCount}
                    onChange={(e) => onUpdate({ characterCount: parseInt(e.target.value) })}
                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-primary"
                />
            </div>

              <div className="grid md:grid-cols-2 gap-6">
                  <div>
                      <label className="block text-primary font-bold mb-2">{t.protagonist}</label>
                      <textarea 
                          value={config.protagonist}
                          onChange={(e) => onUpdate({ protagonist: e.target.value })}
                          placeholder="Name, Age, Role, Key Motivation..."
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm h-32 resize-none focus:border-primary"
                      />
                  </div>
                  <div>
                      <label className="block text-accent font-bold mb-2">{t.antagonist}</label>
                      <textarea 
                          value={config.antagonist}
                          onChange={(e) => onUpdate({ antagonist: e.target.value })}
                          placeholder="Name, Role, Why they oppose the hero..."
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm h-32 resize-none focus:border-accent"
                      />
                  </div>
              </div>
              <div>
                  <label className="block text-slate-300 font-semibold mb-2">{t.supporting}</label>
                  <input 
                      type="text"
                      value={config.supportingCharacters}
                      onChange={(e) => onUpdate({ supportingCharacters: e.target.value })}
                      placeholder="Sidekicks, mentors, etc..."
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 focus:border-primary outline-none"
                  />
              </div>
           </div>
        )}

        {/* --- WORLD SECTION --- */}
        {section === 'world' && (
            <div className="space-y-6 animate-fadeIn">
                <div>
                    <label className="block text-slate-300 font-semibold mb-2">{t.setting}</label>
                     <textarea 
                        value={config.setting}
                        onChange={(e) => onUpdate({ setting: e.target.value })}
                        placeholder="Time period, location, rules of the world..."
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-slate-200 focus:border-primary focus:ring-1 focus:ring-primary outline-none h-40 resize-none"
                    />
                </div>
            </div>
        )}

      </div>

      <div className="mt-8">
        <Button onClick={onGenerate} fullWidth className="text-lg py-4">
          <Sparkles className="animate-pulse" size={24} />
          {t.generate}
        </Button>
      </div>
    </div>
  );
};