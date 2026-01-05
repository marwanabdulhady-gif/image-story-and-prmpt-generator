import React from 'react';
import { StoryOutput, Scene, TRANSLATIONS, Language } from '../types';
import { Copy, Check, Video, Image as ImageIcon, BookOpen, Quote } from 'lucide-react';

interface Props {
  data: StoryOutput;
  lang: Language;
}

const SceneCard: React.FC<{ scene: Scene; lang: Language; t: any }> = ({ scene, lang, t }) => {
  const [copiedImage, setCopiedImage] = React.useState(false);
  const [copiedMotion, setCopiedMotion] = React.useState(false);

  const copyToClipboard = (text: string, type: 'image' | 'motion') => {
    navigator.clipboard.writeText(text);
    if (type === 'image') {
      setCopiedImage(true);
      setTimeout(() => setCopiedImage(false), 2000);
    } else {
      setCopiedMotion(true);
      setTimeout(() => setCopiedMotion(false), 2000);
    }
  };

  return (
    <div className="bg-surface border border-slate-700/50 rounded-2xl p-5 hover:border-primary/50 transition-colors flex flex-col h-full shadow-lg">
      <div className="flex items-center justify-between mb-3 border-b border-slate-700/50 pb-3">
        <span className="bg-slate-800 text-white px-3 py-1 rounded-full text-xs font-bold border border-slate-700">
          Scene {scene.sceneNumber}
        </span>
      </div>
      
      <div className="mb-4 flex-grow">
        <p className="text-md text-slate-200 leading-relaxed font-light" dir="auto">
          {scene.narrative}
        </p>
      </div>

      <div className="space-y-3" dir="ltr">
        <div className="bg-slate-900/80 rounded-lg p-3 border border-slate-800 relative group text-left">
          <div className="flex items-center gap-2 mb-1 text-primary font-bold text-xs uppercase tracking-wider">
            <ImageIcon size={12} />
            <span>{t.imagePrompt}</span>
          </div>
          <p className="text-slate-400 text-xs leading-relaxed mb-4 font-mono line-clamp-3 hover:line-clamp-none">
            {scene.imagePrompt}
          </p>
          <button
            onClick={() => copyToClipboard(scene.imagePrompt, 'image')}
            className="absolute bottom-2 right-2 p-1.5 bg-slate-800 hover:bg-slate-700 text-xs rounded text-white transition-all border border-slate-700 opacity-0 group-hover:opacity-100"
            title={t.copy}
          >
            {copiedImage ? <Check size={12} /> : <Copy size={12} />}
          </button>
        </div>

        <div className="bg-slate-900/80 rounded-lg p-3 border border-slate-800 relative group text-left">
           <div className="flex items-center gap-2 mb-1 text-accent font-bold text-xs uppercase tracking-wider">
            <Video size={12} />
            <span>{t.motionPrompt}</span>
          </div>
          <p className="text-slate-400 text-xs leading-relaxed mb-4 font-mono line-clamp-3 hover:line-clamp-none">
            {scene.motionPrompt}
          </p>
           <button
            onClick={() => copyToClipboard(scene.motionPrompt, 'motion')}
            className="absolute bottom-2 right-2 p-1.5 bg-slate-800 hover:bg-slate-700 text-xs rounded text-white transition-all border border-slate-700 opacity-0 group-hover:opacity-100"
            title={t.copy}
          >
             {copiedMotion ? <Check size={12} /> : <Copy size={12} />}
          </button>
        </div>
      </div>
    </div>
  );
};

export const StepResult: React.FC<Props> = ({ data, lang }) => {
  const t = TRANSLATIONS[lang];
  return (
    <div className="w-full max-w-7xl mx-auto animate-fadeIn pb-20">
      
      {/* Grid Layout: Tools/Info (Left) vs Scenes (Right) */}
      <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-6">
          
          {/* Left Sidebar: Story Metadata */}
          <div className="space-y-6">
              <div className="bg-surface p-6 rounded-2xl border border-slate-700 sticky top-24">
                  <div className="mb-6">
                      <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                        <BookOpen size={16}/> {t.storyCore}
                      </h2>
                      <h1 className="text-2xl font-bold text-white mb-4 leading-tight">{data.title}</h1>
                      <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800/50">
                        <p className="text-sm text-slate-300 italic leading-relaxed">"{data.summary}"</p>
                      </div>
                  </div>

                  <div className="border-t border-slate-700/50 pt-4">
                      <div className="flex justify-between items-center text-sm text-slate-400 mb-2">
                        <span>Scenes</span>
                        <span className="text-white font-bold">{data.scenes.length}</span>
                      </div>
                      {/* Placeholder for future export buttons if needed */}
                  </div>
              </div>
          </div>

          {/* Right Column: Scenes Grid */}
          <div className="grid grid-cols-1 gap-6">
              {data.scenes.map((scene) => (
                <SceneCard key={scene.sceneNumber} scene={scene} lang={lang} t={t} />
              ))}
          </div>
      </div>
    </div>
  );
};