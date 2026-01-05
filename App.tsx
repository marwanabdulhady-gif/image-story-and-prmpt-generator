import React, { useState } from 'react';
import { 
    StoryConfig, Project, Language, TRANSLATIONS, 
    MediaSettings, VoiceConfig, ImageStyleConfig, STYLE_OPTIONS,
    TEMPLATES, Template
} from './types';
import { StepCategory } from './components/StepCategory';
import { StepConfig } from './components/StepConfig';
import { StepLoading } from './components/StepLoading';
import { StepResult } from './components/StepResult';
import { generateStory, generateSpeech, generateImage, generateVideo } from './services/geminiService';
import { Sparkles, Globe, Download, Save, Upload, Image as ImageIcon, Video, Music, Settings, X, Mic, Plus, Camera, Palette, Sun, User, LayoutTemplate, AlertCircle, RefreshCw, CreditCard, Info } from 'lucide-react';

// Factory functions to ensure fresh state
const getInitialConfig = (): StoryConfig => ({
  language: 'ar',
  category: '',
  title: '',
  premise: '',
  setting: '',
  pacing: 'balanced',
  plotTwist: 'mild',
  protagonist: '',
  antagonist: '',
  supportingCharacters: '',
  sceneCount: 3,
  characterCount: 2,
});

const getInitialVoice = (): VoiceConfig => ({
    voiceType: 'man_soft', tone: 'calm', accent: 'neutral', language: 'ar'
});

const getInitialImageStyle = (): ImageStyleConfig => ({
    artStyle: 'Cinematic Realistic',
    cameraAngle: 'Wide Shot',
    lighting: 'Cinematic Volumetric',
    colorGrade: 'Vibrant',
    characterLook: 'Detailed Realistic',
    clothingStyle: 'Modern Casual'
});

const getInitialMediaSettings = (): MediaSettings => ({
    aspectRatio: '16:9',
    imageModel: 'gemini-2.5-flash-image', // Default to free tier
    videoModel: 'veo-3.1-fast-generate-preview', // Will fail if free, handled in UI
    videoResolution: '720p',
    customVideoEndpoint: '',
    customVideoKey: ''
});

const App: React.FC = () => {
  // State
  const [lang, setLang] = useState<Language>('ar');
  const [showSettings, setShowSettings] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [project, setProject] = useState<Project>({
      id: Date.now().toString(),
      createdAt: Date.now(),
      config: getInitialConfig(),
      output: null,
      mediaSettings: getInitialMediaSettings(),
      imageStyle: getInitialImageStyle(),
      voiceConfig: getInitialVoice(),
      apiKey: ''
  });
  
  const [currentTab, setCurrentTab] = useState<'script' | 'audio' | 'visuals'>('script');
  const [loading, setLoading] = useState(false);
  const [loadingScene, setLoadingScene] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Settings State for Custom Inputs
  const [customImageModel, setCustomImageModel] = useState(false);
  const [customVideoModel, setCustomVideoModel] = useState(false);

  const t = TRANSLATIONS[lang];

  // Logic
  const goHome = () => {
    // Only confirm if we have output, otherwise just go home immediately
    if (project.output && !window.confirm(t.confirmDelete)) {
        return;
    }
    
    // Explicitly reset all loading and error states
    setLoading(false);
    setLoadingScene(null);
    setError(null);
    setCurrentTab('script');

    setProject(prev => ({
        id: Date.now().toString(),
        createdAt: Date.now(),
        config: getInitialConfig(),
        output: null,
        mediaSettings: getInitialMediaSettings(),
        imageStyle: getInitialImageStyle(),
        voiceConfig: getInitialVoice(),
        apiKey: prev.apiKey // Preserve API key
    }));
  };

  const applyTemplate = (template: Template) => {
    setProject(p => ({
      ...p,
      config: { ...p.config, ...template.config },
      imageStyle: { ...p.imageStyle, ...template.imageStyle },
      voiceConfig: { ...p.voiceConfig, ...template.voiceConfig }
    }));
    setShowTemplates(false);
  };

  const handleConfigUpdate = (updates: Partial<StoryConfig>) => {
    setProject(p => ({ ...p, config: { ...p.config, ...updates } }));
  };

  const handleMediaSettingsUpdate = (updates: Partial<MediaSettings>) => {
    setProject(p => ({ ...p, mediaSettings: { ...p.mediaSettings, ...updates } }));
  };
  
  const handleVoiceUpdate = (updates: Partial<VoiceConfig>) => {
    const newConfig = { ...project.voiceConfig, ...updates };
    // Sync language if language was updated
    if (updates.language) {
        handleConfigUpdate({ language: updates.language });
        setLang(updates.language); // Update UI lang too
    }
    setProject(p => ({ ...p, voiceConfig: newConfig }));
  };

  const handleStyleUpdate = (updates: Partial<ImageStyleConfig>) => {
      setProject(p => ({ ...p, imageStyle: { ...p.imageStyle, ...updates } }));
  };

  const generateScript = async () => {
    setLoading(true);
    setError(null);
    try {
      const output = await generateStory(
          { ...project.config, language: lang }, 
          project.voiceConfig,
          project.apiKey
      );
      setProject(p => ({ ...p, output }));
    } catch (err: any) {
      setError(err.message || "Script generation failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateAudio = async (sceneIndex: number) => {
    if (!project.output) return;
    setLoadingScene(sceneIndex);
    try {
        const scene = project.output.scenes[sceneIndex];
        const base64Wav = await generateSpeech(scene.narrative, project.voiceConfig.voiceType, project.apiKey);
        
        const newScenes = [...project.output.scenes];
        newScenes[sceneIndex] = { ...scene, audioData: base64Wav };
        setProject(p => ({ ...p, output: { ...p.output!, scenes: newScenes } }));
    } catch (err: any) {
        console.error(err);
        setError(`Audio failed: ${err.message || 'Unknown error'}`);
    } finally {
        setLoadingScene(null);
    }
  };

  const handleGenerateImage = async (sceneIndex: number) => {
    if (!project.output) return;
    setLoadingScene(sceneIndex);
    try {
        const scene = project.output.scenes[sceneIndex];
        const base64Img = await generateImage(
            scene.imagePrompt, 
            project.mediaSettings, 
            project.imageStyle, 
            project.apiKey
        );
        
        const newScenes = [...project.output.scenes];
        newScenes[sceneIndex] = { ...scene, imageUrl: base64Img };
        setProject(p => ({ ...p, output: { ...p.output!, scenes: newScenes } }));
    } catch (err: any) {
        console.error(err);
        if (err.message.includes('403') || err.message.includes('Paid')) {
            setError("Billing Error: This model requires a Paid Google Cloud Project. Please use 'Flash' for free generation or add a paid API key.");
        } else {
            setError(`Image failed: ${err.message}`);
        }
    } finally {
        setLoadingScene(null);
    }
  };

  const handleImageUpload = (sceneIndex: number, e: React.ChangeEvent<HTMLInputElement>) => {
     if (!project.output || !e.target.files?.[0]) return;
     const file = e.target.files[0];
     const reader = new FileReader();
     reader.onload = (ev) => {
         const base64 = ev.target?.result as string;
         const newScenes = [...project.output!.scenes];
         newScenes[sceneIndex] = { ...newScenes[sceneIndex], imageUrl: base64 };
         setProject(p => ({ ...p, output: { ...p.output!, scenes: newScenes } }));
     };
     reader.readAsDataURL(file);
  };

  const handleGenerateVideo = async (sceneIndex: number) => {
    if (!project.output) return;
    const scene = project.output.scenes[sceneIndex];
    if (!scene.imageUrl) {
        setError("Image required for video generation.");
        return;
    }
    
    // Key Check for Veo models (skip if Kling/Custom)
    if (project.mediaSettings.videoModel.includes('veo') && !project.apiKey && (window as any).aistudio?.hasSelectedApiKey) {
         const hasKey = await (window as any).aistudio.hasSelectedApiKey();
         if (!hasKey) {
             if((window as any).aistudio.openSelectKey) {
                 await (window as any).aistudio.openSelectKey();
             }
         }
    }

    setLoadingScene(sceneIndex);
    try {
        const videoUrl = await generateVideo(scene.motionPrompt, scene.imageUrl, project.mediaSettings, project.apiKey);
        const newScenes = [...project.output.scenes];
        newScenes[sceneIndex] = { ...scene, videoUrl: videoUrl };
        setProject(p => ({ ...p, output: { ...p.output!, scenes: newScenes } }));
    } catch (err: any) {
         console.error(err);
         if (err.message === "404_NOT_FOUND" || err.message.includes("404")) {
             setError("API Key Error: Requested entity not found. Please re-select your key.");
             if((window as any).aistudio?.openSelectKey) {
                 setTimeout(() => (window as any).aistudio.openSelectKey(), 1000);
             }
         } else if (err.message.includes('Paid Project') || err.message.includes('billing')) {
             setError("Billing Required: Veo video generation requires a Paid Google Cloud Project. Please enable billing or switch to a free model (if available).");
         } else {
             setError(`Video failed: ${err.message}.`);
         }
    } finally {
        setLoadingScene(null);
    }
  };

  const downloadFile = (dataUrl: string, filename: string) => {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const saveProject = () => {
    const json = JSON.stringify(project);
    const blob = new Blob([json], {type: "application/json"});
    const url = URL.createObjectURL(blob);
    downloadFile(url, `project-${project.config.category}-${Date.now()}.json`);
  };

  const loadProject = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
          try {
              const loaded = JSON.parse(event.target?.result as string);
              setProject({
                  ...loaded,
                  imageStyle: { ...getInitialImageStyle(), ...(loaded.imageStyle || {}) }
              });
              setLang(loaded.config.language || 'ar');
          } catch (err) {
              setError("Invalid project file");
          }
      };
      reader.readAsText(file);
  };
  
  const OptionGroup = ({ title, options, selectedValue, onChange }: any) => (
    <div className="mb-6">
      <h3 className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-3">{title}</h3>
      <div className="flex flex-wrap gap-2">
        {options.map((opt: string) => {
           const isSelected = selectedValue === opt;
           return (
            <button
              key={opt}
              onClick={() => onChange(opt)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 border ${
                isSelected 
                  ? 'bg-primary border-primary text-white' 
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'
              }`}
            >
              {(t as any)[opt] || opt}
            </button>
           );
        })}
      </div>
    </div>
  );

  const VisualSelect = ({ label, icon: Icon, value, options, onChange }: any) => (
      <div className="mb-4">
        <label className="text-xs text-slate-400 mb-1.5 flex items-center gap-1"><Icon size={12}/> {label}</label>
        <select 
            value={value} 
            onChange={(e) => onChange(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-slate-200 focus:border-primary outline-none"
        >
            {options.map((opt: string) => (
                <option key={opt} value={opt}>{opt}</option>
            ))}
        </select>
      </div>
  );

  return (
    <div className="min-h-screen bg-background text-slate-200" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      
      {/* Settings Modal */}
      {showSettings && (
          <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" dir="ltr">
              <div className="bg-surface border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl overflow-y-auto max-h-[90vh]">
                  <div className="flex justify-between items-center mb-6">
                      <h2 className="text-xl font-bold text-white flex items-center gap-2"><Settings size={20}/> {t.apiSettings}</h2>
                      <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-white"><X size={24}/></button>
                  </div>
                  <div className="space-y-6">
                      {/* API Key Section */}
                      <div>
                          <label className="block text-sm text-slate-400 mb-2 font-semibold">Custom Gemini API Key</label>
                          <input 
                            type="password"
                            value={project.apiKey}
                            onChange={(e) => setProject(p => ({...p, apiKey: e.target.value}))}
                            placeholder={t.apiKeyPlaceholder}
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-primary outline-none"
                          />
                          <p className="text-xs text-slate-500 mt-2">Required for Veo and Imagen. Overrides default.</p>
                      </div>

                      {/* Kling / Custom Video API */}
                      <div className="border-t border-slate-700 pt-4">
                          <h3 className="text-sm font-bold text-white mb-3">External Video API (e.g., Kling)</h3>
                          <div className="space-y-3">
                              <div>
                                  <label className="block text-xs text-slate-400 mb-1">{t.customVideoEndpoint}</label>
                                  <input 
                                    type="text"
                                    value={project.mediaSettings.customVideoEndpoint}
                                    onChange={(e) => handleMediaSettingsUpdate({customVideoEndpoint: e.target.value})}
                                    placeholder="https://api.kling.ai/v1/videos"
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs"
                                  />
                              </div>
                              <div>
                                  <label className="block text-xs text-slate-400 mb-1">{t.customVideoKey}</label>
                                  <input 
                                    type="password"
                                    value={project.mediaSettings.customVideoKey}
                                    onChange={(e) => handleMediaSettingsUpdate({customVideoKey: e.target.value})}
                                    placeholder="sk-..."
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs"
                                  />
                              </div>
                          </div>
                      </div>

                      {/* Image Model Customization */}
                      <div>
                          <label className="block text-sm text-slate-400 mb-2 font-semibold">Image Generation Model</label>
                          <select 
                             className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-primary outline-none text-sm mb-2"
                             value={customImageModel ? 'custom' : project.mediaSettings.imageModel}
                             onChange={(e) => {
                                 if (e.target.value === 'custom') {
                                     setCustomImageModel(true);
                                 } else {
                                     setCustomImageModel(false);
                                     handleMediaSettingsUpdate({ imageModel: e.target.value });
                                 }
                             }}
                          >
                             <option value="gemini-2.5-flash-image">{t.model_fast}</option>
                             <option value="imagen-3.0-generate-001">{t.artistic}</option>
                             <option value="gemini-3-pro-image-preview">{t.pro}</option>
                             <option value="custom">Use Custom Model ID...</option>
                          </select>
                          
                          {customImageModel && (
                              <input 
                                type="text"
                                value={project.mediaSettings.imageModel}
                                onChange={(e) => handleMediaSettingsUpdate({imageModel: e.target.value})}
                                placeholder="Enter Custom Image Model ID (e.g., gemini-experimental)"
                                className="w-full bg-slate-800 border border-primary/50 rounded-xl px-4 py-2 text-white outline-none text-sm font-mono animate-fadeIn"
                              />
                          )}
                      </div>

                      {/* Video Model Customization */}
                      <div>
                          <label className="block text-sm text-slate-400 mb-2 font-semibold">Video Generation Model</label>
                          <select 
                             className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-primary outline-none text-sm mb-2"
                             value={customVideoModel ? 'custom' : project.mediaSettings.videoModel}
                             onChange={(e) => {
                                 if (e.target.value === 'custom') {
                                     setCustomVideoModel(true);
                                 } else {
                                     setCustomVideoModel(false);
                                     handleMediaSettingsUpdate({ videoModel: e.target.value });
                                 }
                             }}
                          >
                             <option value="veo-3.1-fast-generate-preview">{t.model_fast}</option>
                             <option value="veo-3.1-generate-preview">{t.quality}</option>
                             <option value="kling-custom">{t.kling}</option>
                             <option value="custom">Use Custom Model ID...</option>
                          </select>

                          {customVideoModel && (
                              <input 
                                type="text"
                                value={project.mediaSettings.videoModel}
                                onChange={(e) => handleMediaSettingsUpdate({videoModel: e.target.value})}
                                placeholder="Enter Custom Video Model ID"
                                className="w-full bg-slate-800 border border-primary/50 rounded-xl px-4 py-2 text-white outline-none text-sm font-mono animate-fadeIn"
                              />
                          )}
                      </div>
                      
                      <button 
                        onClick={async () => {
                            if ((window as any).aistudio?.openSelectKey) {
                                await (window as any).aistudio.openSelectKey();
                            } else {
                                alert("Google AI Studio key selector not available in this environment. Please paste manually.");
                            }
                        }}
                        className="w-full py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm text-slate-300 border border-slate-600"
                      >
                          Select Google AI Studio Key
                      </button>

                      <button onClick={() => setShowSettings(false)} className="w-full py-3 bg-primary hover:bg-primary/90 rounded-xl text-white font-bold mt-4">Save & Close</button>
                  </div>
              </div>
          </div>
      )}

      {/* Templates Modal */}
      {showTemplates && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
           <div className="bg-surface border border-slate-700 rounded-2xl p-6 w-full max-w-3xl shadow-2xl overflow-y-auto max-h-[90vh]">
               <div className="flex justify-between items-center mb-6">
                   <h2 className="text-2xl font-bold text-white flex items-center gap-2"><LayoutTemplate size={24} className="text-primary"/> {t.templates}</h2>
                   <button onClick={() => setShowTemplates(false)} className="text-slate-400 hover:text-white"><X size={24}/></button>
               </div>
               
               <div className="grid md:grid-cols-2 gap-4">
                  {TEMPLATES.map(template => (
                    <button 
                      key={template.id}
                      onClick={() => applyTemplate(template)}
                      className="group flex flex-col items-start text-left p-6 bg-slate-900 border border-slate-800 rounded-xl hover:border-primary/50 hover:bg-slate-800 transition-all"
                    >
                      <span className="text-4xl mb-4 bg-surface p-3 rounded-lg border border-slate-700 group-hover:scale-110 transition-transform">{template.icon}</span>
                      <h3 className="text-lg font-bold text-white mb-2">{template.label}</h3>
                      <p className="text-sm text-slate-400">{template.description}</p>
                      <span className="mt-4 text-xs font-bold text-primary flex items-center gap-1">
                        {t.useTemplate} →
                      </span>
                    </button>
                  ))}
               </div>
           </div>
        </div>
      )}

      {/* Top Bar */}
      <header className="border-b border-slate-800 bg-surface/50 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div 
             onClick={goHome}
             className="flex items-center gap-2 font-bold text-xl cursor-pointer hover:opacity-80 transition-opacity"
             title="Go Home"
          >
             <Sparkles className="text-primary" />
             <span className="hidden sm:inline">{t.appTitle}</span>
          </div>
          
          <div className="flex gap-2">
            <button onClick={() => setShowSettings(true)} className="btn-icon text-accent border-accent/50 hover:bg-accent/10">
                <Settings size={18} />
            </button>
            <button onClick={() => setLang(l => l === 'ar' ? 'en' : 'ar')} className="btn-icon">
                <Globe size={18} /> {lang.toUpperCase()}
            </button>
            <button onClick={saveProject} className="btn-secondary flex">
                <Save size={18} /> <span className="hidden sm:inline">{t.saveProject}</span>
            </button>
            <label className="btn-secondary flex cursor-pointer">
                <Upload size={18} /> <span className="hidden sm:inline">{t.loadProject}</span>
                <input type="file" accept=".json" onChange={loadProject} className="hidden" />
            </label>
          </div>
        </div>
      </header>

      {/* Timeline Tabs */}
      <div className="bg-slate-900 border-b border-slate-800">
         <div className="max-w-3xl mx-auto flex">
            {['script', 'audio', 'visuals'].map((tab) => (
                <button 
                    key={tab}
                    onClick={() => setCurrentTab(tab as any)}
                    className={`flex-1 py-4 text-center font-semibold border-b-2 transition-colors ${
                        currentTab === tab 
                        ? 'border-primary text-white bg-primary/5' 
                        : 'border-transparent text-slate-500 hover:text-slate-300'
                    }`}
                >
                    {t[`timeline_${tab}` as keyof typeof t]}
                </button>
            ))}
         </div>
      </div>

      <main className="container mx-auto px-4 py-8">
        {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-200 p-4 rounded-xl mb-6 flex justify-between items-start animate-fadeIn">
                <div className="flex items-start gap-3">
                  <AlertCircle className="shrink-0 mt-0.5" size={20} />
                  <div>
                    <h3 className="font-bold text-red-100 mb-1">Error Occurred</h3>
                    <p className="text-sm opacity-90">{error}</p>
                  </div>
                </div>
                <button onClick={() => setError(null)} className="text-red-300 hover:text-white"><X size={18}/></button>
            </div>
        )}

        {/* --- SCRIPT TAB --- */}
        {currentTab === 'script' && (
            <>
                {!project.output ? (
                    loading ? <StepLoading lang={lang} /> : (
                        <>
                            {project.config.category === '' ? (
                                <StepCategory lang={lang} onSelect={(c) => handleConfigUpdate({ category: c })} />
                            ) : (
                                <StepConfig 
                                    lang={lang} 
                                    config={project.config} 
                                    voiceConfig={project.voiceConfig}
                                    onUpdate={handleConfigUpdate} 
                                    onVoiceUpdate={handleVoiceUpdate}
                                    onGenerate={generateScript} 
                                />
                            )}
                        </>
                    )
                ) : (
                    <div className="space-y-4">
                        <div className="flex justify-end">
                            <button 
                                onClick={() => setProject(p => ({...p, output: null}))}
                                className="text-xs text-slate-400 underline"
                            >
                                {t.back}
                            </button>
                        </div>
                        <StepResult data={project.output} lang={lang} />
                    </div>
                )}
            </>
        )}

        {/* --- AUDIO TAB --- */}
        {currentTab === 'audio' && (
            <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6 max-w-7xl mx-auto">
                 {/* Audio Settings Sidebar */}
                 <div className="w-full">
                    <div className="bg-surface p-6 rounded-2xl sticky top-24 border border-slate-700">
                        <div className="flex items-center gap-2 mb-6 text-accent">
                            <Mic size={20} />
                            <h3 className="font-semibold text-white">{t.voiceSettings}</h3>
                        </div>

                        {/* RESTORED LANGUAGE SELECTOR */}
                         <div className="mb-6 pb-6 border-b border-slate-700/50">
                            <label className="text-xs text-slate-400 mb-2 block font-bold uppercase">{t.language}</label>
                            <select 
                                value={project.voiceConfig.language}
                                onChange={(e) => handleVoiceUpdate({ language: e.target.value as any })}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-slate-200 focus:border-primary outline-none"
                            >
                                <option value="ar">{t.ar}</option>
                                <option value="en">{t.en}</option>
                                <option value="fr">{t.fr}</option>
                                <option value="es">{t.es}</option>
                                <option value="de">{t.de}</option>
                            </select>
                        </div>

                        <OptionGroup 
                            title={t.voiceType} 
                            options={['man_deep', 'man_soft', 'man_drama', 'woman', 'child']} 
                            selectedValue={project.voiceConfig.voiceType}
                            onChange={(val: any) => handleVoiceUpdate({voiceType: val})}
                        />
                        <OptionGroup 
                            title={t.tone} 
                            options={['enthusiastic', 'sad', 'calm', 'mysterious', 'dramatic']} 
                            selectedValue={project.voiceConfig.tone}
                            onChange={(val: any) => handleVoiceUpdate({tone: val})}
                        />
                        
                        {/* RESTORED ACCENT SELECTOR */}
                         <OptionGroup 
                            title={t.accent} 
                            options={['neutral', 'fusha', 'egyptian', 'khaleeji', 'shami', 'maghrebi']} 
                            selectedValue={project.voiceConfig.accent}
                            onChange={(val: any) => handleVoiceUpdate({accent: val})}
                        />

                         <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                            <p className="text-xs text-blue-200 flex items-start gap-2">
                                <Info size={14} className="shrink-0 mt-0.5"/>
                                Note: Changing accent/language here affects future text generation. To change current audio dialect, you may need to edit the script text manually or regenerate the script.
                            </p>
                         </div>
                    </div>
                </div>

                <div className="flex-1">
                    {!project.output ? (
                        <div className="text-center py-20 text-slate-500 bg-slate-900/50 rounded-2xl border border-slate-800 border-dashed">{t.noScript}</div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {project.output.scenes.map((scene, idx) => (
                                <div key={idx} className="bg-surface p-6 rounded-2xl border border-slate-700 hover:border-slate-600 transition-colors flex flex-col h-full">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="font-bold text-white">Scene {scene.sceneNumber}</h3>
                                    </div>
                                    <p className="text-slate-300 mb-4 font-light leading-relaxed flex-grow" dir="auto">{scene.narrative}</p>
                                    
                                    <div className="mt-auto pt-4 border-t border-slate-700/50">
                                        {scene.audioData ? (
                                            <div className="space-y-3">
                                                <audio controls src={`data:audio/wav;base64,${scene.audioData}`} className="w-full h-10 rounded-lg" />
                                                <div className="flex gap-2">
                                                    <button 
                                                        onClick={() => downloadFile(`data:audio/wav;base64,${scene.audioData}`, `scene-${scene.sceneNumber}.wav`)}
                                                        className="flex-1 flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 py-2 rounded-lg text-xs font-bold transition-colors"
                                                    >
                                                        <Download size={14} /> {t.downloadMp3}
                                                    </button>
                                                    <button 
                                                        onClick={() => handleGenerateAudio(idx)}
                                                        disabled={loadingScene === idx}
                                                        className="px-3 bg-slate-800 hover:bg-primary hover:text-white rounded-lg transition-colors"
                                                        title={t.regenerate}
                                                    >
                                                        <RefreshCw size={14} className={loadingScene === idx ? "animate-spin" : ""} />
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <button 
                                                onClick={() => handleGenerateAudio(idx)}
                                                disabled={loadingScene === idx}
                                                className="w-full btn-primary text-sm py-3 rounded-lg"
                                            >
                                                {loadingScene === idx ? t.generating : <><Music size={16} className="inline mx-2"/> Generate Audio</>}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        )}

        {/* --- VISUALS TAB --- */}
        {currentTab === 'visuals' && (
             <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6 max-w-7xl mx-auto">
                {/* Visual Settings Sidebar */}
                <div className="w-full">
                    <div className="bg-surface p-6 rounded-2xl sticky top-24 border border-slate-700 h-[calc(100vh-120px)] overflow-y-auto custom-scrollbar">
                        <h3 className="font-bold mb-6 flex items-center gap-2 text-white"><ImageIcon size={18}/> {t.visualStyle}</h3>
                        
                        {/* Style Controls */}
                        <div className="space-y-6 mb-8 border-b border-slate-800 pb-8">
                             <VisualSelect 
                                label={t.artStyle} icon={Palette}
                                options={STYLE_OPTIONS.artStyle} 
                                value={project.imageStyle.artStyle} 
                                onChange={(v: string) => handleStyleUpdate({ artStyle: v })}
                             />
                             <VisualSelect 
                                label={t.cameraAngle} icon={Camera}
                                options={STYLE_OPTIONS.cameraAngle} 
                                value={project.imageStyle.cameraAngle} 
                                onChange={(v: string) => handleStyleUpdate({ cameraAngle: v })}
                             />
                             <VisualSelect 
                                label={t.lighting} icon={Sun}
                                options={STYLE_OPTIONS.lighting} 
                                value={project.imageStyle.lighting} 
                                onChange={(v: string) => handleStyleUpdate({ lighting: v })}
                             />
                              <VisualSelect 
                                label={t.characterLook} icon={User}
                                options={STYLE_OPTIONS.characterLook} 
                                value={project.imageStyle.characterLook} 
                                onChange={(v: string) => handleStyleUpdate({ characterLook: v })}
                             />
                             <VisualSelect 
                                label={t.clothingStyle} icon={User}
                                options={STYLE_OPTIONS.clothingStyle} 
                                value={project.imageStyle.clothingStyle} 
                                onChange={(v: string) => handleStyleUpdate({ clothingStyle: v })}
                             />
                        </div>

                        {/* Technical Settings */}
                        <h3 className="font-bold mb-4 flex items-center gap-2 text-white text-sm"><Settings size={14}/> {t.technical}</h3>

                        <div className="mb-6">
                            <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">{t.aspectRatio}</label>
                            <div className="grid grid-cols-3 gap-2">
                                {['16:9', '9:16', '1:1'].map(ratio => (
                                    <button 
                                        key={ratio}
                                        onClick={() => handleMediaSettingsUpdate({ aspectRatio: ratio as any })}
                                        className={`py-2 rounded-lg text-xs border ${project.mediaSettings.aspectRatio === ratio ? 'bg-primary border-primary text-white' : 'bg-slate-900 border-slate-700 text-slate-400'}`}
                                    >
                                        {ratio}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="mb-6">
                            <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">{t.modelQuality}</label>
                            {/* Added conditional to show custom values */}
                            <select 
                                value={project.mediaSettings.imageModel}
                                onChange={(e) => handleMediaSettingsUpdate({ imageModel: e.target.value })}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-slate-200 focus:border-primary outline-none"
                            >
                                <option value="gemini-2.5-flash-image">{t.model_fast}</option>
                                <option value="imagen-3.0-generate-001">{t.artistic}</option>
                                <option value="gemini-3-pro-image-preview">{t.pro}</option>
                                {!['gemini-2.5-flash-image', 'imagen-3.0-generate-001', 'gemini-3-pro-image-preview'].includes(project.mediaSettings.imageModel) && (
                                    <option value={project.mediaSettings.imageModel}>Custom: {project.mediaSettings.imageModel}</option>
                                )}
                            </select>
                            
                            <label className="block text-xs font-semibold text-slate-400 mt-4 mb-2 uppercase tracking-wide">Video Model</label>
                            <select 
                                value={project.mediaSettings.videoModel}
                                onChange={(e) => handleMediaSettingsUpdate({ videoModel: e.target.value })}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-slate-200 focus:border-primary outline-none"
                            >
                                <option value="veo-3.1-fast-generate-preview">{t.model_fast}</option>
                                <option value="veo-3.1-generate-preview">{t.quality}</option>
                                <option value="kling-custom">{t.kling}</option>
                                 {!['veo-3.1-fast-generate-preview', 'veo-3.1-generate-preview', 'kling-custom'].includes(project.mediaSettings.videoModel) && (
                                    <option value={project.mediaSettings.videoModel}>Custom: {project.mediaSettings.videoModel}</option>
                                )}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Visuals Main Content - GRID LAYOUT */}
                <div className="flex-1">
                    {!project.output ? (
                         <div className="text-center py-20 text-slate-500 bg-slate-900/50 rounded-2xl border border-slate-800 border-dashed">{t.noScript}</div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {project.output.scenes.map((scene, idx) => (
                                <div key={idx} className="bg-surface p-5 rounded-2xl border border-slate-700 flex flex-col">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex-1 mr-4">
                                            <h3 className="font-bold text-white mb-1">Scene {scene.sceneNumber}</h3>
                                            <p className="text-xs text-slate-400 line-clamp-2">{scene.imagePrompt}</p>
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-4 flex-grow">
                                        {/* Image Section */}
                                        <div className="bg-slate-900/50 rounded-xl p-3 border border-slate-800">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-xs font-bold text-primary flex items-center gap-1"><ImageIcon size={12}/> Image</span>
                                                <div className="flex gap-2">
                                                    <label className="cursor-pointer p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors" title={t.uploadImage}>
                                                        <Upload size={14} />
                                                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(idx, e)} />
                                                    </label>
                                                    <button 
                                                        onClick={() => handleGenerateImage(idx)} 
                                                        disabled={loadingScene === idx}
                                                        className="p-1.5 hover:bg-slate-800 rounded text-primary hover:text-white transition-colors"
                                                        title={t.generateImage}
                                                    >
                                                        {loadingScene === idx ? <div className="animate-spin w-3 h-3 border-2 border-primary border-t-transparent rounded-full"/> : <Sparkles size={14}/>}
                                                    </button>
                                                </div>
                                            </div>
                                            
                                            <div className="aspect-video bg-black/40 rounded-lg overflow-hidden flex items-center justify-center relative group">
                                                {scene.imageUrl ? (
                                                    <>
                                                        <img src={scene.imageUrl} alt={`Scene ${scene.sceneNumber}`} className="w-full h-full object-cover" />
                                                        <button 
                                                            onClick={() => downloadFile(scene.imageUrl!, `scene-${scene.sceneNumber}.png`)}
                                                            className="absolute top-2 right-2 p-1.5 bg-black/60 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                                        >
                                                            <Download size={14}/>
                                                        </button>
                                                    </>
                                                ) : (
                                                    <div className="text-slate-600 flex flex-col items-center gap-2">
                                                        <ImageIcon size={24} />
                                                        <span className="text-xs">No image yet</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Video Section */}
                                        <div className="bg-slate-900/50 rounded-xl p-3 border border-slate-800">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-xs font-bold text-accent flex items-center gap-1"><Video size={12}/> Video</span>
                                                <button 
                                                    onClick={() => handleGenerateVideo(idx)} 
                                                    disabled={loadingScene === idx || !scene.imageUrl}
                                                    className="p-1.5 hover:bg-slate-800 rounded text-accent hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                    title={t.generateVideo}
                                                >
                                                    {loadingScene === idx ? <div className="animate-spin w-3 h-3 border-2 border-accent border-t-transparent rounded-full"/> : <Sparkles size={14}/>}
                                                </button>
                                            </div>

                                            <div className="aspect-video bg-black/40 rounded-lg overflow-hidden flex items-center justify-center relative group">
                                                 {scene.videoUrl ? (
                                                    <>
                                                        <video src={scene.videoUrl} controls className="w-full h-full object-cover" />
                                                        <button 
                                                            onClick={() => downloadFile(scene.videoUrl!, `scene-${scene.sceneNumber}.mp4`)}
                                                            className="absolute top-2 right-2 p-1.5 bg-black/60 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                                        >
                                                            <Download size={14}/>
                                                        </button>
                                                    </>
                                                ) : (
                                                    <div className="text-slate-600 flex flex-col items-center gap-2">
                                                        <Video size={24} />
                                                        <span className="text-xs">No video yet</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        )}

      </main>
    </div>
  );
};

export default App;