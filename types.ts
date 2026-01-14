

export type Language = 'ar' | 'en' | 'fr' | 'es' | 'de';

export interface VoiceConfig {
  voiceType: 'man_deep' | 'man_soft' | 'man_drama' | 'woman' | 'child';
  tone: 'enthusiastic' | 'sad' | 'calm' | 'mysterious' | 'dramatic';
  accent: 'fusha' | 'egyptian' | 'khaleeji' | 'shami' | 'maghrebi' | 'neutral';
  language: Language;
}

export interface Character {
  id: string;
  name: string;
  role: 'protagonist' | 'antagonist' | 'supporting';
  description: string; // The "Visual Signature"
  image?: string; // Base64 reference image (for UI and analysis)
}

export interface StoryConfig {
  language: Language;
  category: string;
  // Enhanced Story Fields
  title: string;
  premise: string;
  setting: string;
  pacing: 'slow' | 'balanced' | 'fast';
  plotTwist: 'none' | 'mild' | 'shocking';
  // Enhanced Character Fields
  characters: Character[]; // New List-based approach
  sceneCount: number;
  characterCount: number;
}

export interface ImageStyleConfig {
  artStyle: string;
  cameraAngle: string;
  lighting: string;
  colorGrade: string;
  characterLook: string;
  clothingStyle: string;
}

export interface Scene {
  sceneNumber: number;
  narrative: string;
  imagePrompt: string;
  motionPrompt: string;
  characterNames: string[]; // List of characters present in this scene
  // Generated Media
  audioData?: string; // Base64 WAV
  imageUrl?: string;
  // Video URL removed as per request
}

export interface StoryOutput {
  title: string;
  summary: string;
  scenes: Scene[];
}

export type AspectRatio = '16:9' | '9:16' | '1:1' | '4:5' | '3:4' | '4:3';

// Allow both Pro (Primary) and Flash (Fallback)
export type ImageModel = 'gemini-3-pro-image-preview' | 'gemini-2.5-flash-image';

export interface MediaSettings {
  aspectRatio: AspectRatio;
  imageModel: ImageModel;
}

export interface Project {
  id: string;
  title?: string; // For archive display
  lastSaved?: number;
  createdAt: number;
  config: StoryConfig;
  output: StoryOutput | null;
  mediaSettings: MediaSettings;
  imageStyle: ImageStyleConfig;
  voiceConfig: VoiceConfig;
  apiKey?: string;
}

export interface Template {
  id: string;
  label: string;
  description: string;
  icon: string;
  config: Partial<StoryConfig>;
  imageStyle: Partial<ImageStyleConfig>;
  voiceConfig: Partial<VoiceConfig>;
}

export const CATEGORIES = [
  { id: 'horror', label: { en: 'Horror & Thriller', ar: 'رعب و إثارة' }, icon: '👻' },
  { id: 'history', label: { en: 'Historical', ar: 'تاريخي' }, icon: '🏛️' },
  { id: 'fantasy', label: { en: 'Fantasy & Magic', ar: 'خيال و سحر' }, icon: '✨' },
  { id: 'adventure', label: { en: 'Adventure', ar: 'مغامرة' }, icon: '🧭' },
  { id: 'scifi', label: { en: 'Sci-Fi & Cyberpunk', ar: 'خيال علمي' }, icon: '🦾' },
  { id: 'mythology', label: { en: 'Mythology', ar: 'أساطير' }, icon: '🐉' },
  { id: 'kids', label: { en: 'Kids', ar: 'أطفال' }, icon: '🧸' },
  { id: 'mystery', label: { en: 'Mystery', ar: 'غموض' }, icon: '🕵️' },
];

export const TEMPLATES: Template[] = [
  {
    id: 'cinematic_horror',
    label: 'Cinematic Horror',
    description: 'Dark, moody atmosphere with high contrast lighting.',
    icon: '👻',
    config: { category: 'horror', pacing: 'slow', plotTwist: 'shocking' },
    imageStyle: { artStyle: 'Cinematic Realistic', lighting: 'Dark & Moody', colorGrade: 'Desaturated' },
    voiceConfig: { voiceType: 'man_deep', tone: 'mysterious' }
  },
  {
    id: 'pixar_adventure',
    label: '3D Animation',
    description: 'Vibrant, colorful 3D style suitable for all ages.',
    icon: '🎈',
    config: { category: 'kids', pacing: 'fast', plotTwist: 'mild' },
    imageStyle: { artStyle: '3D Render (Pixar)', lighting: 'Studio Lighting', colorGrade: 'Vibrant' },
    voiceConfig: { voiceType: 'child', tone: 'enthusiastic' }
  },
  {
    id: 'cyberpunk',
    label: 'Cyberpunk',
    description: 'Neon lights, futuristic tech, and gritty characters.',
    icon: '🦾',
    config: { category: 'scifi', pacing: 'fast', plotTwist: 'mild' },
    imageStyle: { artStyle: 'Cyberpunk', lighting: 'Neon Lights', colorGrade: 'Cool Tone', clothingStyle: 'Sci-Fi Armor' },
    voiceConfig: { voiceType: 'woman', tone: 'calm' }
  },
  {
    id: 'historical_epic',
    label: 'Historical Epic',
    description: 'Grand scales, natural lighting, and period accuracy.',
    icon: '🏛️',
    config: { category: 'history', pacing: 'balanced', plotTwist: 'none' },
    imageStyle: { artStyle: 'Oil Painting', lighting: 'Golden Hour', colorGrade: 'Warm Tone', clothingStyle: 'Victorian' },
    voiceConfig: { voiceType: 'man_drama', tone: 'dramatic' }
  }
];

export const STYLE_OPTIONS = {
  artStyle: ['Cinematic Realistic', 'Anime', '3D Render (Pixar)', 'Oil Painting', 'Cyberpunk', 'Film Noir', 'Watercolors', 'Sketch'],
  cameraAngle: ['Wide Shot', 'Close-up', 'Drone View', 'Low Angle (Heroic)', 'Dutch Angle (Uneasy)', 'Over the Shoulder'],
  lighting: ['Golden Hour', 'Cinematic Volumetric', 'Neon Lights', 'Dark & Moody', 'Studio Lighting', 'Natural Daylight'],
  colorGrade: ['Vibrant', 'Desaturated', 'Warm Tone', 'Cool Tone', 'Black & White', 'Pastel'],
  characterLook: ['Detailed Realistic', 'Stylized', 'Rugged', 'Ethereal', 'Cybernetic'],
  clothingStyle: ['Modern Casual', 'Sci-Fi Armor', 'Victorian', 'Fantasy Robes', 'Tactical Gear', 'Streetwear']
};

export const TRANSLATIONS = {
  ar: {
    appTitle: 'استوديو القصص',
    timeline_script: 'السيناريو',
    timeline_audio: 'الصوت',
    timeline_visuals: 'المرئيات',
    saveProject: 'تنزيل المشروع',
    archiveProject: 'حفظ في الأرشيف',
    openArchive: 'الأرشيف',
    loadProject: 'تحميل ملف',
    downloadMp3: 'MP3',
    generateImage: 'توليد',
    generateAllAudio: 'توليد كل الأصوات',
    generateAllImages: 'توليد كل الصور',
    uploadImage: 'رفع',
    settings: 'الإعدادات',
    apiSettings: 'إعدادات API',
    apiKeyPlaceholder: 'أدخل مفتاح Gemini API...',
    aspectRatio: 'أبعاد الصورة',
    modelQuality: 'نموذج التوليد',
    pro: 'Gemini 3.0 Pro (جودة عالية)',
    back: 'رجوع',
    generate: 'تشغيل القصة',
    regenerate: 'إعادة',
    chooseCategory: 'اختر نوع القصة',
    yourIdea: 'فكرة القصة',
    yourIdeaPlaceholder: 'اكتب الفكرة الأساسية...',
    voiceSettings: 'إعدادات الصوت',
    generating: 'جاري التوليد...',
    noScript: 'لم يتم إنشاء قصة بعد. ابدأ من تبويب السيناريو.',
    confirmDelete: 'هل أنت متأكد؟ سيفقد العمل غير المحفوظ.',
    downloadProject: 'تنزيل ملف المشروع',
    voiceType: 'نوع الصوت',
    tone: 'نبرة الصوت',
    accent: 'اللهجة',
    templates: 'القوالب الجاهزة',
    useTemplate: 'استخدم القالب',
    // New Scenario Fields
    storyCore: 'أساس القصة',
    styleAndVoice: 'النمط والصوت',
    characters: 'الشخصيات',
    world: 'العالم والأجواء',
    premise: 'المقدمة / الحبكة',
    setting: 'الزمان والمكان',
    pacing: 'إيقاع القصة',
    plotTwist: 'مستوى المفاجأة',
    protagonist: 'البطل',
    antagonist: 'الشرير / العقبة',
    supporting: 'شخصيات ثانوية',
    numScenes: 'عدد المشاهد',
    numCharacters: 'عدد الشخصيات',
    magicFill: 'تعبئة سحرية ✨',
    thinking: 'جاري التفكير...',
    dialectDesc: 'اختر اللهجة المستخدمة في سرد القصة.',
    toneDesc: 'يحدد النغمة العاطفية للكتابة.',
    addCharacter: 'أضف شخصية',
    analyzeImage: 'تحليل الصورة',
    characterName: 'الاسم',
    characterDesc: 'الوصف البصري (للصور)',
    autoGenCharacters: 'توليد الشخصيات تلقائياً',
    // Visual Styles
    visualStyle: 'النمط البصري',
    artStyle: 'النمط الفني',
    cameraAngle: 'زاوية الكاميرا',
    lighting: 'الإضاءة',
    colorGrade: 'الألوان',
    characterLook: 'مظهر الشخصية',
    clothingStyle: 'الملابس',
    technical: 'إعدادات تقنية',
    // Chips & Options
    slow: 'بطيء',
    balanced: 'متوازن',
    fast: 'سريع',
    none: 'لا يوجد',
    mild: 'خفيف',
    shocking: 'صادم',
    // Voice Options
    man_deep: 'رجل (عميق)',
    man_soft: 'رجل (هادئ)',
    man_drama: 'رجل (درامي)',
    woman: 'امرأة',
    child: 'طفل',
    enthusiastic: 'حماسي',
    sad: 'حزين',
    calm: 'هادئ',
    mysterious: 'غامض',
    dramatic: 'درامي',
    fusha: 'فصحى',
    egyptian: 'مصري عامي',
    khaleeji: 'خليجي',
    shami: 'شامي',
    maghrebi: 'مغربي',
    neutral: 'محايد',
    language: 'اللغة',
    en: 'الإنجليزية',
    ar: 'العربية',
    fr: 'الفرنسية',
    es: 'الإسبانية',
    de: 'الألمانية',
    // Steps
    copied: 'تم النسخ',
    copy: 'نسخ',
    imagePrompt: 'وصف الصورة',
    motionPrompt: 'وصف الحركة',
    loadingTitle: 'جاري تأليف القصة',
    loadingSubtitle: 'يقوم الذكاء الاصطناعي الآن ببناء العالم والشخصيات...'
  },
  en: {
    appTitle: 'Story Studio',
    timeline_script: 'Script',
    timeline_audio: 'Audio',
    timeline_visuals: 'Visuals',
    saveProject: 'Download File',
    archiveProject: 'Save to Archive',
    openArchive: 'Archive',
    loadProject: 'Load File',
    downloadMp3: 'MP3',
    generateImage: 'Generate',
    generateAllAudio: 'Generate All Audio',
    generateAllImages: 'Generate All Images',
    uploadImage: 'Upload',
    settings: 'Settings',
    apiSettings: 'API Settings',
    apiKeyPlaceholder: 'Enter your custom Gemini API Key...',
    aspectRatio: 'Aspect Ratio',
    modelQuality: 'Generation Model',
    pro: 'Gemini 3.0 Pro (High Quality)',
    back: 'Back',
    generate: 'Generate Story',
    regenerate: 'Regenerate',
    chooseCategory: 'Choose Category',
    yourIdea: 'Story Concept',
    yourIdeaPlaceholder: 'The core concept...',
    voiceSettings: 'Voice Settings',
    generating: 'Generating...',
    noScript: 'No story generated yet. Start at the Script tab.',
    confirmDelete: 'Are you sure? Unsaved work will be lost.',
    downloadProject: 'Download Project File',
    voiceType: 'Voice Type',
    tone: 'Tone',
    accent: 'Accent',
    templates: 'Templates',
    useTemplate: 'Use Template',
    // New Scenario Fields
    storyCore: 'Story Core',
    styleAndVoice: 'Style & Voice',
    characters: 'Characters',
    world: 'World & Vibe',
    premise: 'Premise / Plot',
    setting: 'Setting (Time/Place)',
    pacing: 'Pacing',
    plotTwist: 'Plot Twist Level',
    protagonist: 'Protagonist',
    antagonist: 'Antagonist',
    supporting: 'Supporting Cast',
    numScenes: 'Number of Scenes',
    numCharacters: 'Number of Characters',
    magicFill: 'Magic Fill ✨',
    thinking: 'Thinking...',
    dialectDesc: 'Choose the dialect for the narration text generation.',
    toneDesc: 'Sets the emotional tone of the story writing.',
    addCharacter: 'Add Character',
    analyzeImage: 'Analyze Image',
    characterName: 'Name',
    characterDesc: 'Visual Description (for consistency)',
    autoGenCharacters: 'Auto-Generate Characters',
    // Visual Styles
    visualStyle: 'Visual Style',
    artStyle: 'Art Style',
    cameraAngle: 'Camera Angle',
    lighting: 'Lighting',
    colorGrade: 'Color Grading',
    characterLook: 'Character Look',
    clothingStyle: 'Clothes',
    technical: 'Technical Settings',
    // Chips & Options
    slow: 'Slow',
    balanced: 'Balanced',
    fast: 'Fast',
    none: 'None',
    mild: 'Mild',
    shocking: 'Shocking',
    // Voice Options
    man_deep: 'Man (Deep)',
    man_soft: 'Man (Soft)',
    man_drama: 'Man (Dramatic)',
    woman: 'Woman',
    child: 'Child',
    enthusiastic: 'Enthusiastic',
    sad: 'Sad',
    calm: 'Calm',
    mysterious: 'Mysterious',
    dramatic: 'Dramatic',
    fusha: 'Modern Standard (Fusha)',
    egyptian: 'Egyptian',
    khaleeji: 'Khaleeji',
    shami: 'Levantine (Shami)',
    maghrebi: 'Maghrebi',
    neutral: 'Neutral',
    language: 'Language',
    en: 'English',
    ar: 'Arabic',
    fr: 'French',
    es: 'Spanish',
    de: 'German',
    // Steps
    copied: 'Copied',
    copy: 'Copy',
    imagePrompt: 'Image Prompt',
    motionPrompt: 'Motion Prompt',
    loadingTitle: 'Writing Your Story',
    loadingSubtitle: 'AI is constructing the world and characters...'
  }
};