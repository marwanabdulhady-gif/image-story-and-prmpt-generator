import React, { useState } from 'react';
import { StoryConfig, TRANSLATIONS, Language, VoiceConfig } from '../types';
import { Button } from './Button';
import { Sparkles, Users, Globe, BookOpen, Clock, Zap, Wand2, Mic, Volume2 } from 'lucide-react';
import { generateStoryIdeas } from '../services/geminiService';

interface Props {
  config: StoryConfig;
  voiceConfig: VoiceConfig;
  onUpdate: (updates: Partial<StoryConfig>) => void;
  onVoiceUpdate: (updates: Partial<VoiceConfig>) => void;
  onGenerate: () => void;
  lang: Language;
}

export const StepConfig: React.FC<Props> = ({ config, voiceConfig, onUpdate, onVoiceUpdate, onGenerate, lang }) => {
  const t = TRANSLATIONS[lang];
  const [section, setSection] = useState<'core' | 'style' | 'characters' | 'world'>('core');
  const [isSuggesting, setIsSuggesting] = useState(false);

  const handleSuggest = async () => {
      setIsSuggesting(true);
      try {
          const suggestions = await generateStoryIdeas(config.category || 'General', lang);
          onUpdate(suggestions);
      } catch (e) {
          console.error(e);
          alert("Could not generate suggestions. Try again.");
      } finally {
          setIsSuggesting(false);
      }
  };

  const SectionButton = ({ id, label, icon: Icon }: any) => (
    <button
      onClick={() => setSection(id)}
      className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-all text-sm whitespace-nowrap ${
        section === id 
        ? 'bg-primary text-white shadow-lg shadow-primary/25' 
        : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
      }`}
    >
      <Icon size={16} /> {label}
    </button>
  );

  const OptionChip = ({ label, selected, onClick }: any) => (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
        selected 
        ? 'bg-primary border-primary text-white' 
        : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="w-full max-w-4xl mx-auto animate-fadeIn pb-10">
      
      {/* Section Nav */}
      <div className="flex justify-between items-center mb-6 overflow-x-auto pb-2 scrollbar-hide">
        <div className="flex gap-2">
            <SectionButton id="core" label={t.storyCore} icon={BookOpen} />
            <SectionButton id="style" label={t.styleAndVoice} icon={Mic} />
            <SectionButton id="characters" label={t.characters} icon={Users} />
            <SectionButton id="world" label={t.world} icon={Globe} />
        </div>
        
        <button 
            onClick={handleSuggest}
            disabled={isSuggesting}
            className="flex-shrink-0 ml-4 flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-accent to-pink-600 rounded-lg text-white text-sm font-bold shadow-lg hover:shadow-accent/20 transition-all disabled:opacity-50"
        >
            {isSuggesting ? <Wand2 className="animate-spin" size={16}/> : <Wand2 size={16}/>}
            {isSuggesting ? t.thinking : t.magicFill}
        </button>
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
                    <div className="flex gap-2 flex-wrap">
                        {['slow', 'balanced', 'fast'].map((p) => (
                            <OptionChip 
                                key={p} 
                                label={(t as any)[p] || p} 
                                selected={config.pacing === p} 
                                onClick={() => onUpdate({ pacing: p as any })} 
                            />
                        ))}
                    </div>
                 </div>

                 <div>
                    <label className="block text-slate-300 font-semibold mb-2">{t.plotTwist}</label>
                    <div className="flex gap-2 flex-wrap">
                        {['none', 'mild', 'shocking'].map((p) => (
                            <OptionChip 
                                key={p} 
                                label={(t as any)[p] || p} 
                                selected={config.plotTwist === p} 
                                onClick={() => onUpdate({ plotTwist: p as any })} 
                            />
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

        {/* --- STYLE & VOICE SECTION (New) --- */}
        {section === 'style' && (
             <div className="space-y-8 animate-fadeIn">
                 <div>
                    <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                        <Mic size={20} className="text-accent"/> {t.accent}
                    </h3>
                    <p className="text-sm text-slate-400 mb-3">{(t as any).dialectDesc}</p>
                    <div className="flex flex-wrap gap-2">
                        {['neutral', 'fusha', 'egyptian', 'khaleeji', 'shami', 'maghrebi'].map((acc) => (
                             <OptionChip 
                                key={acc} 
                                label={(t as any)[acc] || acc} 
                                selected={voiceConfig.accent === acc} 
                                onClick={() => onVoiceUpdate({ accent: acc as any })} 
                            />
                        ))}
                    </div>
                 </div>

                 <div className="border-t border-slate-700/50 pt-6">
                    <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                        <Volume2 size={20} className="text-secondary"/> {t.tone}
                    </h3>
                    <p className="text-sm text-slate-400 mb-3">{(t as any).toneDesc}</p>
                    <div className="flex flex-wrap gap-2">
                        {['enthusiastic', 'sad', 'calm', 'mysterious', 'dramatic'].map((tn) => (
                             <OptionChip 
                                key={tn} 
                                label={(t as any)[tn] || tn} 
                                selected={voiceConfig.tone === tn} 
                                onClick={() => onVoiceUpdate({ tone: tn as any })} 
                            />
                        ))}
                    </div>
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
                          placeholder={t.protagonist + "..."}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm h-32 resize-none focus:border-primary"
                      />
                  </div>
                  <div>
                      <label className="block text-accent font-bold mb-2">{t.antagonist}</label>
                      <textarea 
                          value={config.antagonist}
                          onChange={(e) => onUpdate({ antagonist: e.target.value })}
                          placeholder={t.antagonist + "..."}
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
                      placeholder={t.supporting + "..."}
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
                        placeholder={t.setting + "..."}
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