import React, { useState, useEffect } from 'react';
import { 
    StoryConfig, Project, Language, TRANSLATIONS, 
    MediaSettings, VoiceConfig, ImageStyleConfig, STYLE_OPTIONS,
    TEMPLATES, Template
} from './types';
import { StepCategory } from './components/StepCategory';
import { StepConfig } from './components/StepConfig';
import { StepLoading } from './components/StepLoading';
import { StepResult } from './components/StepResult';
import { generateStory, generateSpeech, generateImage } from './services/geminiService';
import { Sparkles, Globe, Download, Save, Upload, Image as ImageIcon, Video, Music, Settings, X, Mic, Palette, Sun, User, LayoutTemplate, AlertCircle, RefreshCw, Archive, Trash2, FolderOpen, Info, Camera, Menu, FileJson, ChevronDown } from 'lucide-react';

// Factory functions to ensure fresh state
const getInitialConfig = (): StoryConfig => ({
  language: 'ar',
  category: '',
  title: '',
  premise: '',
  setting: '',
  pacing: 'balanced',
  plotTwist: 'mild',
  characters: [], // New Character List
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
    imageModel: 'gemini-3-pro-image-preview',
});

const ARCHIVE_KEY = 'story_studio_projects';

const App: React.FC = () => {
  // State
  const [lang, setLang] = useState<Language>('ar');
  const [showSettings, setShowSettings] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  const [savedProjects, setSavedProjects] = useState<Project[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
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
  
  // Specific loading states to prevent UI overlap
  const [audioLoadingIndex, setAudioLoadingIndex] = useState<number | null>(null);
  const [imageLoadingIndex, setImageLoadingIndex] = useState<number | null>(null);
  
  const [generatingAllAudio, setGeneratingAllAudio] = useState(false);
  const [generatingAllImages, setGeneratingAllImages] = useState(false);
  
  const [error, setError] = useState<string | null>(null);

  const t = TRANSLATIONS[lang];

  // --- Archive Logic ---
  useEffect(() => {
    const saved = localStorage.getItem(ARCHIVE_KEY);
    if (saved) {
      try {
        setSavedProjects(JSON.parse(saved));
      } catch (e) { console.error("Failed to load archive", e); }
    }
  }, []);

  const saveToArchive = () => {
     if (!project.output) {
         setError("Cannot save an empty project. Generate a story first.");
         return;
     }
     
     const projectToSave = { 
         ...project, 
         title: project.output.title || project.config.premise.substring(0, 30),
         lastSaved: Date.now() 
     };
     
     // Update if exists, otherwise add new
     const existingIndex = savedProjects.findIndex(p => p.id === project.id);
     let newProjects = [...savedProjects];
     
     if (existingIndex >= 0) {
         newProjects[existingIndex] = projectToSave;
     } else {
         newProjects = [projectToSave, ...savedProjects];
     }
     
     // Limit to 50
     if (newProjects.length > 50) {
         newProjects = newProjects.slice(0, 50);
     }
     
     setSavedProjects(newProjects);
     localStorage.setItem(ARCHIVE_KEY, JSON.stringify(newProjects));
     alert("Project saved to Archive!");
  };

  const loadFromArchive = (saved: Project) => {
      setProject({
          ...saved,
          // Ensure potentially missing fields from older versions are present
          mediaSettings: { ...getInitialMediaSettings(), ...saved.mediaSettings },
          imageStyle: { ...getInitialImageStyle(), ...saved.imageStyle },
          voiceConfig: { ...getInitialVoice(), ...saved.voiceConfig },
          config: { ...getInitialConfig(), ...saved.config, characters: saved.config.characters || [] }
      });
      setShowArchive(false);
      setCurrentTab('script');
  };

  const deleteFromArchive = (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (!window.confirm("Delete this project?")) return;
      const newProjects = savedProjects.filter(p => p.id !== id);
      setSavedProjects(newProjects);
      localStorage.setItem(ARCHIVE_KEY, JSON.stringify(newProjects));
  };

  // --- Logic ---
  const goHome = () => {
    if (project.output && !window.confirm(t.confirmDelete)) return;
    setLoading(false);
    setAudioLoadingIndex(null);
    setImageLoadingIndex(null);
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
        apiKey: prev.apiKey 
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
    if (updates.language) {
        handleConfigUpdate({ language: updates.language });
        setLang(updates.language);
    }
    setProject(p => ({ ...p, voiceConfig: newConfig }));
  };

  const handleStyleUpdate = (updates: Partial<ImageStyleConfig>) => {
      setProject(p => ({ ...p, imageStyle: { ...p.imageStyle, ...updates } }));
  };

  // --- Generation Functions ---

  const generateScript = async () => {
    setLoading(true);
    setError(null);
    
    let configToUse = { ...project.config };
    // Try to auto-fix missing characters if user skipped the step
    if (configToUse.characters.length === 0 && configToUse.premise) {
        // Warning: This silently proceeds, relying on Gemini to generate generic characters if list is empty
    }

    try {
      const output = await generateStory(
          { ...configToUse, language: lang }, 
          project.voiceConfig,
          project.imageStyle, // Pass Image Style for prompt consistency
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
    setAudioLoadingIndex(sceneIndex);
    try {
        const scene = project.output.scenes[sceneIndex];
        const base64Wav = await generateSpeech(scene.narrative, project.voiceConfig.voiceType, project.apiKey);
        
        // Functional update to avoid stale closure in loops
        setProject(p => {
             if (!p.output) return p;
             const newScenes = [...p.output.scenes];
             newScenes[sceneIndex] = { ...scene, audioData: base64Wav };
             return { ...p, output: { ...p.output, scenes: newScenes } };
        });
    } catch (err: any) {
        console.error(err);
        setError(`Audio failed: ${err.message}`);
    } finally {
        setAudioLoadingIndex(null);
    }
  };

  const handleGenerateAllAudio = async () => {
    if (!project.output) return;
    setGeneratingAllAudio(true);
    setError(null);
    
    // Sequential to avoid rate limits
    for (let i = 0; i < project.output.scenes.length; i++) {
        try {
            const scene = project.output.scenes[i];
            setAudioLoadingIndex(i);
            const base64Wav = await generateSpeech(scene.narrative, project.voiceConfig.voiceType, project.apiKey);
            setProject(p => {
                if (!p.output) return p;
                const newScenes = [...p.output.scenes];
                newScenes[i] = { ...newScenes[i], audioData: base64Wav };
                return { ...p, output: { ...p.output, scenes: newScenes } };
           });
        } catch (err: any) {
            console.error(err);
            // Continue with next
        }
    }
    setAudioLoadingIndex(null);
    setGeneratingAllAudio(false);
  };

  const handleGenerateImage = async (sceneIndex: number) => {
    if (!project.output) return;
    setImageLoadingIndex(sceneIndex);
    try {
        const scene = project.output.scenes[sceneIndex];
        
        // Resolve active characters for consistency: partial match names
        const activeChars = project.config.characters.filter(c => 
            scene.characterNames?.some(n => n.toLowerCase().includes(c.name.toLowerCase()) || c.name.toLowerCase().includes(n.toLowerCase()))
        );

        const base64Img = await generateImage(
            scene.imagePrompt, 
            project.mediaSettings, 
            project.imageStyle, 
            project.apiKey,
            activeChars
        );
        
        setProject(p => {
             if (!p.output) return p;
             const newScenes = [...p.output.scenes];
             newScenes[sceneIndex] = { ...scene, imageUrl: base64Img };
             return { ...p, output: { ...p.output, scenes: newScenes } };
        });
    } catch (err: any) {
        console.error(err);
        setError(`Image failed: ${err.message}`);
    } finally {
        setImageLoadingIndex(null);
    }
  };

  const handleGenerateAllImages = async () => {
    if (!project.output) return;
    setGeneratingAllImages(true);
    setError(null);
    
    for (let i = 0; i < project.output.scenes.length; i++) {
        try {
            const scene = project.output.scenes[i];
            setImageLoadingIndex(i);
            
            // Resolve active characters for consistency
            const activeChars = project.config.characters.filter(c => 
                scene.characterNames?.some(n => n.toLowerCase().includes(c.name.toLowerCase()) || c.name.toLowerCase().includes(n.toLowerCase()))
            );

            const base64Img = await generateImage(
                scene.imagePrompt, 
                project.mediaSettings, 
                project.imageStyle, 
                project.apiKey,
                activeChars
            );
            setProject(p => {
                if (!p.output) return p;
                const newScenes = [...p.output.scenes];
                newScenes[i] = { ...newScenes[i], imageUrl: base64Img };
                return { ...p, output: { ...p.output, scenes: newScenes } };
           });
        } catch (err: any) {
            console.error(err);
            // Continue to try other images even if one fails
        }
    }
    setImageLoadingIndex(null);
    setGeneratingAllImages(false);
  };

  const handleImageUpload = (sceneIndex: number, e: React.ChangeEvent<HTMLInputElement>) => {
     if (!project.output || !e.target.files?.[0]) return;
     const file = e.target.files[0];
     const reader = new FileReader();
     reader.onload = (ev) => {
         const base64 = ev.target?.result as string;
         setProject(p => {
             if (!p.output) return p;
             const newScenes = [...p.output.scenes];
             newScenes[sceneIndex] = { ...newScenes[sceneIndex], imageUrl: base64 };
             return { ...p, output: { ...p.output, scenes: newScenes } };
         });
     };
     reader.readAsDataURL(file);
  };

  const downloadFile = (dataUrl: string, filename: string) => {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadProjectFile = () => {
    const json = JSON.stringify(project);
    const blob = new Blob([json], {type: "application/json"});
    const url = URL.createObjectURL(blob);
    downloadFile(url, `project-${project.config.category || 'untitled'}-${Date.now()}.json`);
  };

  const loadProjectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
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
  
  // UI Helpers
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
              <div className="bg-surface border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl animate-fadeIn">
                  <div className="flex justify-between items-center mb-6">
                      <h2 className="text-xl font-bold text-white flex items-center gap-2"><Settings size={20}/> {t.apiSettings}</h2>
                      <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-white"><X size={24}/></button>
                  </div>
                  <div className="space-y-6">
                      <div>
                          <label className="block text-sm text-slate-400 mb-2 font-semibold">Custom Gemini API Key</label>
                          <input 
                            type="password"
                            value={project.apiKey}
                            onChange={(e) => setProject(p => ({...p, apiKey: e.target.value}))}
                            placeholder={t.apiKeyPlaceholder}
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-primary outline-none"
                          />
                          <p className="text-xs text-slate-500 mt-2">Required for Gemini 3 Pro Images (Nano Banana Pro).</p>
                      </div>
                      
                      <button 
                        onClick={async () => {
                            if ((window as any).aistudio?.openSelectKey) {
                                await (window as any).aistudio.openSelectKey();
                            } else {
                                alert("Google AI Studio key selector not available.");
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

      {/* Archive Modal */}
      {showArchive && (
          <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
              <div className="bg-surface border border-slate-700 rounded-2xl p-6 w-full max-w-3xl shadow-2xl h-[80vh] flex flex-col animate-fadeIn">
                  <div className="flex justify-between items-center mb-6">
                      <h2 className="text-2xl font-bold text-white flex items-center gap-2"><Archive size={24} className="text-secondary"/> {t.openArchive} ({savedProjects.length}/50)</h2>
                      <button onClick={() => setShowArchive(false)} className="text-slate-400 hover:text-white"><X size={24}/></button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                      {savedProjects.length === 0 ? (
                          <div className="text-center text-slate-500 py-20">No saved projects found.</div>
                      ) : (
                          savedProjects.map(p => (
                              <div key={p.id} className="flex items-center justify-between bg-slate-900 border border-slate-800 p-4 rounded-xl hover:border-slate-600 transition-colors">
                                  <div onClick={() => loadFromArchive(p)} className="cursor-pointer flex-1">
                                      <h3 className="font-bold text-white mb-1">{p.title || "Untitled Project"}</h3>
                                      <p className="text-xs text-slate-400">
                                          {new Date(p.lastSaved || p.createdAt).toLocaleString()} • {p.config.sceneCount} Scenes • {p.config.category}
                                      </p>
                                  </div>
                                  <div className="flex gap-2">
                                      <button onClick={() => loadFromArchive(p)} className="p-2 hover:bg-primary/20 text-primary rounded-lg" title="Load">
                                          <FolderOpen size={18}/>
                                      </button>
                                      <button onClick={(e) => deleteFromArchive(p.id, e)} className="p-2 hover:bg-red-500/20 text-red-400 rounded-lg" title="Delete">
                                          <Trash2 size={18}/>
                                      </button>
                                  </div>
                              </div>
                          ))
                      )}
                  </div>
              </div>
          </div>
      )}

      {/* Templates Modal */}
      {showTemplates && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
           <div className="bg-surface border border-slate-700 rounded-2xl p-6 w-full max-w-3xl shadow-2xl overflow-y-auto max-h-[90vh] animate-fadeIn">
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

      {/* NEW HEADER DESIGN */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/40 backdrop-blur-md border-b border-white/10 h-16 transition-all">
        <div className="h-full max-w-[1920px] mx-auto px-4 flex items-center justify-between">
          
          {/* LEFT: Branding & Title */}
          <div className="flex items-center gap-6">
            <div 
               onClick={goHome}
               className="flex items-center gap-2.5 cursor-pointer hover:opacity-80 transition-opacity"
               title="Go Home"
            >
               <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20">
                  <Sparkles className="text-white w-5 h-5" />
               </div>
               <span className="font-bold text-lg tracking-tight hidden md:block">{t.appTitle}</span>
            </div>

            <div className="hidden md:block h-6 w-px bg-white/10" />

            <div className="hidden md:block">
                <input 
                    type="text" 
                    value={project.config.title}
                    onChange={(e) => handleConfigUpdate({ title: e.target.value })}
                    placeholder="Untitled Project"
                    className="bg-transparent border border-transparent hover:border-white/10 focus:border-primary/50 rounded px-2 py-1 text-sm font-medium text-slate-200 placeholder-slate-500 outline-none w-48 transition-all"
                />
            </div>
          </div>

          {/* RIGHT: Actions */}
          <div className="flex items-center gap-2">
            
            <button 
                onClick={() => setLang(l => l === 'ar' ? 'en' : 'ar')} 
                className="h-9 px-3 rounded-lg text-xs font-bold text-slate-400 hover:text-white hover:bg-white/5 transition-colors uppercase tracking-wider"
            >
                {lang}
            </button>

            <button 
                onClick={() => setShowSettings(true)} 
                className="h-9 w-9 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                title={t.settings}
            >
                <Settings size={18} />
            </button>

            <div className="h-6 w-px bg-white/10 mx-1" />

            {/* Archive Actions Group */}
             <div className="flex bg-white/5 rounded-lg p-1 gap-1">
                <button 
                    onClick={() => setShowArchive(true)} 
                    className="h-8 px-3 rounded flex items-center gap-2 text-xs font-medium text-slate-300 hover:bg-white/10 hover:text-white transition-all"
                >
                    <FolderOpen size={14} /> <span className="hidden lg:inline">{t.openArchive}</span>
                </button>
                <button 
                    onClick={saveToArchive} 
                    className="h-8 px-3 rounded flex items-center gap-2 text-xs font-medium bg-primary/20 text-primary hover:bg-primary hover:text-white transition-all border border-primary/20 hover:border-primary/50"
                >
                    <Save size={14} /> <span className="hidden lg:inline">{t.archiveProject}</span>
                </button>
             </div>

             <div className="h-6 w-px bg-white/10 mx-1 hidden sm:block" />

             {/* File Actions */}
             <div className="hidden sm:flex gap-1">
                <button 
                    onClick={downloadProjectFile} 
                    className="h-9 w-9 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                    title={t.saveProject}
                >
                    <Download size={18} />
                </button>
                <label 
                    className="h-9 w-9 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                    title={t.loadProject}
                >
                    <Upload size={18} />
                    <input type="file" accept=".json" onChange={loadProjectFile} className="hidden" />
                </label>
             </div>
          </div>
        </div>
      </header>

      {/* Spacer for fixed header */}
      <div className="h-16" />

      {/* Timeline Tabs - Sticky below header */}
      <div className="bg-background/95 backdrop-blur border-b border-slate-800 sticky top-16 z-40 shadow-sm">
         <div className="max-w-3xl mx-auto flex">
            {['script', 'audio', 'visuals'].map((tab) => (
                <button 
                    key={tab}
                    onClick={() => setCurrentTab(tab as any)}
                    className={`flex-1 py-3 text-center text-sm font-semibold border-b-2 transition-all ${
                        currentTab === tab 
                        ? 'border-primary text-white' 
                        : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-white/5'
                    }`}
                >
                    {t[`timeline_${tab}` as keyof typeof t]}
                </button>
            ))}
         </div>
      </div>

      <main className="container mx-auto px-4 py-8 max-w-[1600px]">
        {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-200 p-4 rounded-xl mb-6 flex justify-between items-start animate-fadeIn max-w-4xl mx-auto">
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
                        <div className="flex justify-end max-w-7xl mx-auto">
                            <button 
                                onClick={() => setProject(p => ({...p, output: null}))}
                                className="text-xs text-slate-400 hover:text-white underline"
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
            <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-8 max-w-[1600px] mx-auto animate-fadeIn">
                 {/* Audio Settings Sidebar */}
                 <div className="w-full">
                    <div className="bg-surface border border-slate-700/50 rounded-2xl p-5 sticky top-36">
                        <div className="flex items-center gap-2 mb-6 text-accent">
                            <Mic size={20} />
                            <h3 className="font-bold text-white tracking-wide text-sm uppercase">{t.voiceSettings}</h3>
                        </div>

                         <div className="mb-6 pb-6 border-b border-slate-700/50">
                            <label className="text-xs text-slate-400 mb-2 block font-bold uppercase tracking-wider">{t.language}</label>
                            <select 
                                value={project.voiceConfig.language}
                                onChange={(e) => handleVoiceUpdate({ language: e.target.value as any })}
                                className="w-full bg-black/40 border border-slate-700 rounded-lg p-2.5 text-sm text-slate-200 focus:border-primary outline-none hover:border-slate-600 transition-colors"
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
                        
                         <OptionGroup 
                            title={t.accent} 
                            options={['neutral', 'fusha', 'egyptian', 'khaleeji', 'shami', 'maghrebi']} 
                            selectedValue={project.voiceConfig.accent}
                            onChange={(val: any) => handleVoiceUpdate({accent: val})}
                        />
                    </div>
                </div>

                <div className="flex-1">
                    {!project.output ? (
                        <div className="text-center py-32 text-slate-500 bg-slate-900/30 rounded-3xl border border-slate-800 border-dashed">{t.noScript}</div>
                    ) : (
                        <>
                             {/* GENERATE ALL AUDIO BUTTON */}
                            <div className="mb-6 flex justify-end">
                                <button 
                                    onClick={handleGenerateAllAudio}
                                    disabled={generatingAllAudio}
                                    className="px-6 py-2.5 bg-gradient-to-r from-primary to-secondary text-white rounded-xl font-bold shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all flex items-center gap-2 disabled:opacity-50"
                                >
                                    {generatingAllAudio ? <RefreshCw className="animate-spin" size={18}/> : <Sparkles size={18}/>}
                                    {t.generateAllAudio}
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                {project.output.scenes.map((scene, idx) => (
                                    <div key={idx} className="bg-surface border border-slate-700/50 p-6 rounded-2xl hover:border-slate-600 transition-all flex flex-col h-full group">
                                        <div className="flex justify-between items-center mb-4">
                                            <h3 className="font-bold text-white bg-slate-800 px-3 py-1 rounded-full text-xs">Scene {scene.sceneNumber}</h3>
                                        </div>
                                        <p className="text-slate-300 mb-6 font-light leading-relaxed text-sm flex-grow" dir="auto">{scene.narrative}</p>
                                        
                                        <div className="mt-auto pt-4 border-t border-slate-700/50">
                                            {scene.audioData ? (
                                                <div className="space-y-3">
                                                    <audio controls src={`data:audio/wav;base64,${scene.audioData}`} className="w-full h-10 rounded-lg opacity-80 hover:opacity-100 transition-opacity" />
                                                    <div className="flex gap-2">
                                                        <button 
                                                            onClick={() => downloadFile(`data:audio/wav;base64,${scene.audioData}`, `scene-${scene.sceneNumber}.wav`)}
                                                            className="flex-1 flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 py-2 rounded-lg text-xs font-bold transition-colors"
                                                        >
                                                            <Download size={14} /> {t.downloadMp3}
                                                        </button>
                                                        <button 
                                                            onClick={() => handleGenerateAudio(idx)}
                                                            disabled={audioLoadingIndex === idx || generatingAllAudio}
                                                            className="px-3 bg-slate-800 hover:bg-primary hover:text-white rounded-lg transition-colors"
                                                            title={t.regenerate}
                                                        >
                                                            <RefreshCw size={14} className={audioLoadingIndex === idx ? "animate-spin" : ""} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <button 
                                                    onClick={() => handleGenerateAudio(idx)}
                                                    disabled={audioLoadingIndex === idx || generatingAllAudio}
                                                    className="w-full btn-primary text-sm py-3 rounded-lg"
                                                >
                                                    {audioLoadingIndex === idx ? t.generating : <><Music size={16} className="inline mx-2"/> Generate Audio</>}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>
        )}

        {/* --- VISUALS TAB --- */}
        {currentTab === 'visuals' && (
             <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-8 max-w-[1600px] mx-auto animate-fadeIn">
                {/* Visual Settings Sidebar */}
                <div className="w-full">
                    <div className="bg-surface border border-slate-700/50 rounded-2xl p-5 sticky top-36 h-[calc(100vh-160px)] overflow-y-auto custom-scrollbar">
                        <h3 className="font-bold mb-6 flex items-center gap-2 text-white text-sm uppercase tracking-wide"><ImageIcon size={18}/> {t.visualStyle}</h3>
                        
                        {/* Style Controls */}
                        <div className="space-y-6 mb-8 border-b border-slate-700/50 pb-8">
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
                        <h3 className="font-bold mb-4 flex items-center gap-2 text-white text-sm uppercase tracking-wide"><Settings size={14}/> {t.technical}</h3>

                        <div className="mb-6">
                            <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">{t.aspectRatio}</label>
                            <div className="grid grid-cols-3 gap-2">
                                {['16:9', '9:16', '1:1'].map(ratio => (
                                    <button 
                                        key={ratio}
                                        onClick={() => handleMediaSettingsUpdate({ aspectRatio: ratio as any })}
                                        className={`py-2 rounded-lg text-xs border transition-all ${project.mediaSettings.aspectRatio === ratio ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20' : 'bg-black/40 border-slate-700 text-slate-400 hover:border-slate-500'}`}
                                    >
                                        {ratio}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="mb-6">
                            <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">{t.modelQuality}</label>
                            {/* Force Gemini 3 Pro - Read Only */}
                             <div className="w-full bg-black/40 border border-slate-700 rounded-lg p-3 text-xs text-slate-300">
                                 {t.pro} (Nano Banana Pro)
                             </div>
                        </div>
                    </div>
                </div>

                {/* Visuals Main Content - GRID LAYOUT */}
                <div className="flex-1">
                    {!project.output ? (
                         <div className="text-center py-32 text-slate-500 bg-slate-900/30 rounded-3xl border border-slate-800 border-dashed">{t.noScript}</div>
                    ) : (
                        <>
                             {/* GENERATE ALL IMAGES BUTTON */}
                            <div className="mb-6 flex justify-end">
                                <button 
                                    onClick={handleGenerateAllImages}
                                    disabled={generatingAllImages}
                                    className="px-6 py-2.5 bg-gradient-to-r from-accent to-pink-600 text-white rounded-xl font-bold shadow-lg shadow-accent/20 hover:shadow-accent/40 transition-all flex items-center gap-2 disabled:opacity-50"
                                >
                                    {generatingAllImages ? <RefreshCw className="animate-spin" size={18}/> : <Sparkles size={18}/>}
                                    {t.generateAllImages}
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-8">
                                {project.output.scenes.map((scene, idx) => (
                                    <div key={idx} className="bg-surface border border-slate-700/50 p-5 rounded-3xl flex flex-col group hover:border-slate-600 transition-all">
                                        <div className="flex justify-between items-start mb-4 px-1">
                                            <div className="flex-1 mr-4">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="font-bold text-white bg-slate-800 px-3 py-1 rounded-full text-xs">Scene {scene.sceneNumber}</span>
                                                    {scene.characterNames?.map(name => (
                                                        <span key={name} className="text-[10px] px-2 py-1 bg-slate-900 border border-slate-700 rounded-full text-slate-400">{name}</span>
                                                    ))}
                                                </div>
                                                <p className="text-xs text-slate-400 line-clamp-2">{scene.imagePrompt}</p>
                                            </div>
                                        </div>
                                        
                                        <div className="space-y-4 flex-grow">
                                            {/* Image Section */}
                                            <div className="bg-black/40 rounded-2xl p-3 border border-slate-800">
                                                <div className="flex justify-between items-center mb-2 px-1">
                                                    <span className="text-xs font-bold text-primary flex items-center gap-1.5"><ImageIcon size={14}/> {t.imagePrompt}</span>
                                                    <div className="flex gap-2">
                                                        <label className="cursor-pointer p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors" title={t.uploadImage}>
                                                            <Upload size={16} />
                                                            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(idx, e)} />
                                                        </label>
                                                        <button 
                                                            onClick={() => handleGenerateImage(idx)} 
                                                            disabled={imageLoadingIndex === idx || generatingAllImages}
                                                            className="p-2 hover:bg-slate-800 rounded-lg text-primary hover:text-white transition-colors"
                                                            title={t.generateImage}
                                                        >
                                                            {imageLoadingIndex === idx ? <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full"/> : <Sparkles size={16}/>}
                                                        </button>
                                                    </div>
                                                </div>
                                                
                                                <div className="aspect-video bg-slate-900 rounded-xl overflow-hidden flex items-center justify-center relative group/image shadow-inner">
                                                    {scene.imageUrl ? (
                                                        <>
                                                            <img src={scene.imageUrl} alt={`Scene ${scene.sceneNumber}`} className="w-full h-full object-cover transition-transform duration-700 group-hover/image:scale-105" />
                                                            <button 
                                                                onClick={() => downloadFile(scene.imageUrl!, `scene-${scene.sceneNumber}.png`)}
                                                                className="absolute top-3 right-3 p-2 bg-black/60 backdrop-blur text-white rounded-lg opacity-0 group-hover/image:opacity-100 transition-opacity hover:bg-black/80"
                                                            >
                                                                <Download size={16}/>
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <div className="text-slate-600 flex flex-col items-center gap-2">
                                                            <ImageIcon size={32} opacity={0.5} />
                                                            <span className="text-xs font-medium">No image generated</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Motion Prompt Text Display */}
                                            <div className="bg-slate-900/30 rounded-xl p-4 border border-slate-800/50">
                                                <div className="flex items-center gap-2 mb-2 text-slate-500">
                                                    <Video size={14} />
                                                    <span className="text-xs font-bold uppercase tracking-wider">{t.motionPrompt}</span>
                                                </div>
                                                <p className="text-xs text-slate-400 font-mono leading-relaxed bg-black/20 p-2.5 rounded-lg border border-white/5">
                                                    {scene.motionPrompt}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>
        )}

      </main>
    </div>
  );
};

export default App;