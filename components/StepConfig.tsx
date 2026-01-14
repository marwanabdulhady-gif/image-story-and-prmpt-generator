import React, { useState } from 'react';
import { StoryConfig, TRANSLATIONS, Language, VoiceConfig, Character } from '../types';
import { Button } from './Button';
import { Sparkles, Users, Globe, BookOpen, Clock, Zap, Wand2, Mic, Volume2, Plus, Trash2, Camera, User, Image as ImageIcon, CheckCircle2 } from 'lucide-react';
import { generateStoryIdeas, generateCharacterProfiles, analyzeImage } from '../services/geminiService';

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
  const [generatingChars, setGeneratingChars] = useState(false);
  const [analyzingImgId, setAnalyzingImgId] = useState<string | null>(null);

  // --- Core Helpers ---
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

  // --- Character Helpers ---
  const addCharacter = () => {
      const newChar: Character = {
          id: Date.now().toString(),
          name: '',
          role: 'supporting',
          description: '',
      };
      onUpdate({ characters: [...config.characters, newChar] });
  };

  const updateCharacter = (id: string, updates: Partial<Character>) => {
      const newChars = config.characters.map(c => c.id === id ? { ...c, ...updates } : c);
      onUpdate({ characters: newChars });
  };

  const removeCharacter = (id: string) => {
      const newChars = config.characters.filter(c => c.id !== id);
      onUpdate({ characters: newChars });
  };

  const handleAutoGenerateCharacters = async () => {
      if (!config.premise) {
          alert("Please enter a Story Core / Premise first.");
          return;
      }
      setGeneratingChars(true);
      try {
          const chars = await generateCharacterProfiles(config.premise, config.setting, config.characterCount, lang);
          onUpdate({ characters: chars });
      } catch (e) {
          console.error(e);
          alert("Failed to generate characters.");
      } finally {
          setGeneratingChars(false);
      }
  };

  const handleCharacterImageUpload = async (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (ev) => {
          const base64 = ev.target?.result as string;
          // Set image immediately
          updateCharacter(id, { image: base64 });
          
          // Trigger analysis
          setAnalyzingImgId(id);
          try {
              const description = await analyzeImage(base64, lang);
              updateCharacter(id, { description });
          } catch (err) {
              console.error(err);
              alert("Could not analyze image. Please fill description manually.");
          } finally {
              setAnalyzingImgId(null);
          }
      };
      reader.readAsDataURL(file);
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
        
        {section === 'core' && (
            <button 
                onClick={handleSuggest}
                disabled={isSuggesting}
                className="flex-shrink-0 ml-4 flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-accent to-pink-600 rounded-lg text-white text-sm font-bold shadow-lg hover:shadow-accent/20 transition-all disabled:opacity-50"
            >
                {isSuggesting ? <Wand2 className="animate-spin" size={16}/> : <Wand2 size={16}/>}
                {isSuggesting ? t.thinking : t.magicFill}
            </button>
        )}
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

        {/* --- STYLE & VOICE SECTION --- */}
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

        {/* --- CHARACTERS SECTION (REBUILT) --- */}
        {section === 'characters' && (
           <div className="space-y-6 animate-fadeIn">
              <div className="flex justify-between items-center bg-slate-900/50 p-4 rounded-xl border border-slate-700">
                  <div className="flex items-center gap-3">
                      <span className="text-sm text-slate-300">{t.numCharacters}: {config.characterCount}</span>
                      <input 
                          type="range" min="1" max="5" step="1"
                          value={config.characterCount}
                          onChange={(e) => onUpdate({ characterCount: parseInt(e.target.value) })}
                          className="w-24 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-primary"
                      />
                  </div>
                  <button 
                      onClick={handleAutoGenerateCharacters}
                      disabled={generatingChars}
                      className="px-4 py-2 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/50 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors disabled:opacity-50"
                  >
                      {generatingChars ? <Wand2 className="animate-spin" size={14}/> : <Sparkles size={14}/>}
                      {t.autoGenCharacters}
                  </button>
              </div>

              <div className="grid grid-cols-1 gap-4 max-h-[550px] overflow-y-auto pr-2 custom-scrollbar">
                  {config.characters.map((char, index) => (
                      <div key={char.id} className="bg-slate-900 border border-slate-700 rounded-xl p-4 relative group flex gap-5 hover:border-slate-500 transition-all">
                          <button 
                            onClick={() => removeCharacter(char.id)}
                            className="absolute top-2 right-2 p-1.5 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded transition-colors z-10"
                          >
                              <Trash2 size={16}/>
                          </button>

                          {/* Left: Card Image */}
                          <div className="flex-shrink-0 w-32 h-40">
                              <label className="block w-full h-full bg-slate-800 rounded-lg border-2 border-dashed border-slate-600 hover:border-primary hover:bg-slate-750 transition-all relative overflow-hidden cursor-pointer group/img">
                                   {char.image ? (
                                       <>
                                        <img src={char.image} alt="Ref" className="w-full h-full object-cover opacity-60 group-hover/img:opacity-100 transition-opacity"/>
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 group-hover/img:bg-transparent transition-colors">
                                            {analyzingImgId === char.id ? (
                                                 <Wand2 className="text-primary animate-spin drop-shadow-lg" size={24}/>
                                            ) : (
                                                 <div className="bg-black/60 p-1 rounded-full opacity-0 group-hover/img:opacity-100 transition-opacity">
                                                     <Camera className="text-white" size={16}/>
                                                 </div>
                                            )}
                                        </div>
                                       </>
                                   ) : (
                                       <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 gap-2">
                                            <User size={32}/>
                                            <span className="text-[10px] uppercase font-bold text-center px-2">Upload Ref</span>
                                       </div>
                                   )}
                                   <input type="file" accept="image/*" className="hidden" onChange={(e) => handleCharacterImageUpload(char.id, e)}/>
                              </label>
                          </div>

                          {/* Right: Card Details */}
                          <div className="flex-1 space-y-3 pt-1">
                               <div className="flex gap-2 items-start pr-8">
                                   <div className="flex-1">
                                      <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">{t.characterName}</label>
                                      <input 
                                        type="text" 
                                        value={char.name}
                                        onChange={(e) => updateCharacter(char.id, { name: e.target.value })}
                                        placeholder="Character Name"
                                        className="w-full bg-slate-800 border-b border-slate-600 pb-1 text-white font-bold text-lg focus:border-primary outline-none focus:bg-slate-800/50"
                                      />
                                   </div>
                                   <div className="w-32">
                                       <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Role</label>
                                       <select
                                            value={char.role}
                                            onChange={(e) => updateCharacter(char.id, { role: e.target.value as any })}
                                            className="w-full bg-slate-800 border-b border-slate-600 pb-1 text-xs text-slate-300 focus:border-primary outline-none"
                                        >
                                            <option value="protagonist">Protagonist</option>
                                            <option value="antagonist">Antagonist</option>
                                            <option value="supporting">Supporting</option>
                                        </select>
                                   </div>
                               </div>

                               <div className="flex-grow">
                                   <div className="flex justify-between items-center mb-1">
                                       <label className="text-[10px] text-slate-400 uppercase font-bold">{t.characterDesc}</label>
                                       {analyzingImgId === char.id && <span className="text-[10px] text-primary flex items-center gap-1"><Wand2 size={10} className="animate-spin"/> Analyzing visual signature...</span>}
                                       {char.image && !analyzingImgId && char.description && <span className="text-[10px] text-green-400 flex items-center gap-1"><CheckCircle2 size={10}/> Visual Ref Active</span>}
                                   </div>
                                   <textarea 
                                        value={char.description}
                                        onChange={(e) => updateCharacter(char.id, { description: e.target.value })}
                                        placeholder="Physical description used for image generation..."
                                        className={`w-full bg-black/20 border border-slate-700 rounded-lg p-3 text-xs text-slate-300 h-24 resize-none focus:border-primary outline-none transition-opacity ${analyzingImgId === char.id ? 'opacity-50' : ''}`}
                                    />
                               </div>
                          </div>
                      </div>
                  ))}

                  <button 
                    onClick={addCharacter}
                    className="w-full py-4 border-2 border-dashed border-slate-700 rounded-xl text-slate-400 hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2 font-bold bg-slate-900/50"
                  >
                      <Plus size={18}/> {t.addCharacter}
                  </button>
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