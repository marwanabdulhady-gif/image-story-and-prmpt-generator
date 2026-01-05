import React from 'react';
import { StoryOutput, Scene, TRANSLATIONS, Language } from '../types';
import { Copy, Check, Video, Image as ImageIcon } from 'lucide-react';

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
    <div className="bg-surface border border-slate-700/50 rounded-2xl p-6 mb-6 hover:border-slate-600 transition-colors">
      <div className="flex items-center justify-between mb-4">
        <span className="bg-slate-800 text-slate-300 px-3 py-1 rounded-lg text-sm font-semibold border border-slate-700">
          Scene {scene.sceneNumber}
        </span>
      </div>
      
      <div className="mb-6">
        <p className="text-lg text-slate-200 leading-relaxed font-light">
          {scene.narrative}
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4" dir="ltr">
        <div className="bg-slate-900/80 rounded-xl p-4 border border-slate-800 relative group text-left">
          <div className="flex items-center gap-2 mb-2 text-primary font-semibold text-sm">
            <ImageIcon size={16} />
            <span>{t.imagePrompt}</span>
          </div>
          <p className="text-slate-400 text-sm leading-relaxed mb-8 font-mono line-clamp-3 hover:line-clamp-none">
            {scene.imagePrompt}
          </p>
          <button
            onClick={() => copyToClipboard(scene.imagePrompt, 'image')}
            className="absolute bottom-3 right-3 flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs rounded-lg text-white transition-all border border-slate-700"
          >
            {copiedImage ? <Check size={14} /> : <Copy size={14} />}
            {copiedImage ? t.copied : t.copy}
          </button>
        </div>

        <div className="bg-slate-900/80 rounded-xl p-4 border border-slate-800 relative group text-left">
           <div className="flex items-center gap-2 mb-2 text-accent font-semibold text-sm">
            <Video size={16} />
            <span>{t.motionPrompt}</span>
          </div>
          <p className="text-slate-400 text-sm leading-relaxed mb-8 font-mono line-clamp-3 hover:line-clamp-none">
            {scene.motionPrompt}
          </p>
           <button
            onClick={() => copyToClipboard(scene.motionPrompt, 'motion')}
            className="absolute bottom-3 right-3 flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs rounded-lg text-white transition-all border border-slate-700"
          >
             {copiedMotion ? <Check size={14} /> : <Copy size={14} />}
             {copiedMotion ? t.copied : t.copy}
          </button>
        </div>
      </div>
    </div>
  );
};

export const StepResult: React.FC<Props> = ({ data, lang }) => {
  const t = TRANSLATIONS[lang];
  return (
    <div className="w-full max-w-5xl mx-auto animate-fadeIn pb-20">
      <div className="mb-8 p-4 bg-primary/10 border border-primary/20 rounded-2xl">
          <h1 className="text-xl font-bold text-white mb-2">{data.title}</h1>
          <p className="text-sm text-slate-300">{data.summary}</p>
      </div>

      <div className="space-y-6">
        {data.scenes.map((scene) => (
          <SceneCard key={scene.sceneNumber} scene={scene} lang={lang} t={t} />
        ))}
      </div>
    </div>
  );
};