export const VARK_STYLE_TYPES = {
  visual: "visual",
  auditory: "auditory",
  readingWriting: "readingWriting",
  kinesthetic: "kinesthetic",
};

export const AGE_GROUPS = {
  children: {
    key: "children",
    label: "نموذج الصغار",
    subtitle: "4 إلى 12 سنة",
    description: "أسئلة بسيطة ومناسبة للأطفال",
  },
  adults: {
    key: "adults",
    label: "نموذج الكبار",
    subtitle: "13 سنة فأكثر",
    description: "أسئلة مخصصة للطلاب الأكبر سنًا",
  },
};

const CHILDREN_QUESTIONS = [
  {
    id: "child-1",
    text: "عندما تتعلم شيئًا جديدًا، ماذا تحب أكثر؟",
    options: [
      { label: "أشاهد صورة أو رسمة", styleType: VARK_STYLE_TYPES.visual },
      { label: "أسمع الشرح", styleType: VARK_STYLE_TYPES.auditory },
      { label: "أقرأ أو أكتب", styleType: VARK_STYLE_TYPES.readingWriting },
      { label: "أجرب بيدي", styleType: VARK_STYLE_TYPES.kinesthetic },
    ],
  },
  {
    id: "child-2",
    text: "كيف تحفظ الدرس بسهولة؟",
    options: [
      { label: "أنظر إلى الصور والألوان", styleType: VARK_STYLE_TYPES.visual },
      { label: "أكرر الكلام بصوتي", styleType: VARK_STYLE_TYPES.auditory },
      { label: "أكتب الكلمات في دفتري", styleType: VARK_STYLE_TYPES.readingWriting },
      { label: "ألعب نشاطًا عن الدرس", styleType: VARK_STYLE_TYPES.kinesthetic },
    ],
  },
  {
    id: "child-3",
    text: "ماذا تحب في الحصة؟",
    options: [
      { label: "مشاهدة الصور على السبورة", styleType: VARK_STYLE_TYPES.visual },
      { label: "سماع قصة أو شرح", styleType: VARK_STYLE_TYPES.auditory },
      { label: "قراءة الكلمات والجمل", styleType: VARK_STYLE_TYPES.readingWriting },
      { label: "استخدام المكعبات أو الأدوات", styleType: VARK_STYLE_TYPES.kinesthetic },
    ],
  },
  {
    id: "child-4",
    text: "إذا أردت فهم قصة، ماذا يساعدك؟",
    options: [
      { label: "مشاهدة صور القصة", styleType: VARK_STYLE_TYPES.visual },
      { label: "سماع القصة من المعلم", styleType: VARK_STYLE_TYPES.auditory },
      { label: "قراءة القصة", styleType: VARK_STYLE_TYPES.readingWriting },
      { label: "تمثيل القصة بالحركة", styleType: VARK_STYLE_TYPES.kinesthetic },
    ],
  },
  {
    id: "child-5",
    text: "عندما تتعلم حرفًا أو كلمة، ماذا تفضل؟",
    options: [
      { label: "رؤية صورة للكلمة", styleType: VARK_STYLE_TYPES.visual },
      { label: "سماع نطق الكلمة", styleType: VARK_STYLE_TYPES.auditory },
      { label: "كتابة الكلمة", styleType: VARK_STYLE_TYPES.readingWriting },
      { label: "تكوين الكلمة ببطاقات أو أدوات", styleType: VARK_STYLE_TYPES.kinesthetic },
    ],
  },
  {
    id: "child-6",
    text: "كيف تحب أن يشرح لك المعلم؟",
    options: [
      { label: "يرسم على السبورة", styleType: VARK_STYLE_TYPES.visual },
      { label: "يتحدث ويشرح بصوته", styleType: VARK_STYLE_TYPES.auditory },
      { label: "يكتب الكلمات المهمة", styleType: VARK_STYLE_TYPES.readingWriting },
      { label: "يجعلنا نشارك في نشاط", styleType: VARK_STYLE_TYPES.kinesthetic },
    ],
  },
  {
    id: "child-7",
    text: "ما اللعبة التعليمية التي تحبها؟",
    options: [
      { label: "لعبة صور وبطاقات ملونة", styleType: VARK_STYLE_TYPES.visual },
      { label: "لعبة استماع وترديد", styleType: VARK_STYLE_TYPES.auditory },
      { label: "لعبة كلمات وكتابة", styleType: VARK_STYLE_TYPES.readingWriting },
      { label: "لعبة حركة وتركيب", styleType: VARK_STYLE_TYPES.kinesthetic },
    ],
  },
  {
    id: "child-8",
    text: "عندما تراجع الدرس في البيت، ماذا تفعل؟",
    options: [
      { label: "أنظر إلى الصور في الكتاب", styleType: VARK_STYLE_TYPES.visual },
      { label: "أطلب من أحد أن يشرح لي", styleType: VARK_STYLE_TYPES.auditory },
      { label: "أقرأ وأكتب", styleType: VARK_STYLE_TYPES.readingWriting },
      { label: "أطبق أو أمثل الدرس", styleType: VARK_STYLE_TYPES.kinesthetic },
    ],
  },
  {
    id: "child-9",
    text: "ماذا يساعدك على تذكر الأرقام أو الكلمات؟",
    options: [
      { label: "الألوان والأشكال", styleType: VARK_STYLE_TYPES.visual },
      { label: "الأغاني أو الترديد", styleType: VARK_STYLE_TYPES.auditory },
      { label: "كتابتها في ورقة", styleType: VARK_STYLE_TYPES.readingWriting },
      { label: "عدّها أو تركيبها بيدي", styleType: VARK_STYLE_TYPES.kinesthetic },
    ],
  },
  {
    id: "child-10",
    text: "إذا تعلمت تجربة بسيطة، ماذا تفضل؟",
    options: [
      { label: "أشاهد صور خطوات التجربة", styleType: VARK_STYLE_TYPES.visual },
      { label: "أسمع شرح خطواتها", styleType: VARK_STYLE_TYPES.auditory },
      { label: "أقرأ خطوات التجربة", styleType: VARK_STYLE_TYPES.readingWriting },
      { label: "أقوم بالتجربة بنفسي", styleType: VARK_STYLE_TYPES.kinesthetic },
    ],
  },
  {
    id: "child-11",
    text: "عندما لا تفهم سؤالًا، ماذا يساعدك؟",
    options: [
      { label: "رسم السؤال أو رؤيته بصورة", styleType: VARK_STYLE_TYPES.visual },
      { label: "سماع السؤال مرة أخرى", styleType: VARK_STYLE_TYPES.auditory },
      { label: "قراءة السؤال ببطء", styleType: VARK_STYLE_TYPES.readingWriting },
      { label: "استخدام أشياء تساعدني على الحل", styleType: VARK_STYLE_TYPES.kinesthetic },
    ],
  },
  {
    id: "child-12",
    text: "كيف تحب أن تعرض ما تعلمته؟",
    options: [
      { label: "أرسم لوحة جميلة", styleType: VARK_STYLE_TYPES.visual },
      { label: "أشرح بالكلام", styleType: VARK_STYLE_TYPES.auditory },
      { label: "أكتب جملة أو كلمات", styleType: VARK_STYLE_TYPES.readingWriting },
      { label: "أعمل نموذجًا أو نشاطًا", styleType: VARK_STYLE_TYPES.kinesthetic },
    ],
  },
  {
    id: "child-13",
    text: "في درس العلوم أو الرياضيات، ماذا تحب؟",
    options: [
      { label: "رؤية الصور والرسوم", styleType: VARK_STYLE_TYPES.visual },
      { label: "سماع الشرح من المعلم", styleType: VARK_STYLE_TYPES.auditory },
      { label: "قراءة المسألة أو كتابة الحل", styleType: VARK_STYLE_TYPES.readingWriting },
      { label: "استخدام العدادات أو الأدوات", styleType: VARK_STYLE_TYPES.kinesthetic },
    ],
  },
  {
    id: "child-14",
    text: "عندما تتعلم مكانًا أو اتجاهًا، ماذا يساعدك؟",
    options: [
      { label: "رؤية خريطة أو صورة", styleType: VARK_STYLE_TYPES.visual },
      { label: "سماع الوصف بالكلام", styleType: VARK_STYLE_TYPES.auditory },
      { label: "قراءة التعليمات", styleType: VARK_STYLE_TYPES.readingWriting },
      { label: "المشي أو الإشارة بيدي", styleType: VARK_STYLE_TYPES.kinesthetic },
    ],
  },
  {
    id: "child-15",
    text: "ماذا تفعل عندما تريد أن تتذكر واجبك؟",
    options: [
      { label: "أتذكر شكله في الكتاب", styleType: VARK_STYLE_TYPES.visual },
      { label: "أتذكر كلام المعلم", styleType: VARK_STYLE_TYPES.auditory },
      { label: "أكتبه في دفتري", styleType: VARK_STYLE_TYPES.readingWriting },
      { label: "أضع علامة أو أجهز أدواته", styleType: VARK_STYLE_TYPES.kinesthetic },
    ],
  },
  {
    id: "child-16",
    text: "ما الطريقة الممتعة للتعلم بالنسبة لك؟",
    options: [
      { label: "مشاهدة صور وفيديوهات", styleType: VARK_STYLE_TYPES.visual },
      { label: "سماع شرح أو قصة", styleType: VARK_STYLE_TYPES.auditory },
      { label: "قراءة وكتابة", styleType: VARK_STYLE_TYPES.readingWriting },
      { label: "لعب وتجربة وحركة", styleType: VARK_STYLE_TYPES.kinesthetic },
    ],
  },
];

const ADULTS_QUESTIONS = [
  {
    id: "adult-1",
    text: "عندما تتعلم درسًا جديدًا، ما الطريقة التي تساعدك أكثر؟",
    options: [
      { label: "رؤية الصور والرسوم والمخططات", styleType: VARK_STYLE_TYPES.visual },
      { label: "سماع شرح المعلم أو النقاش", styleType: VARK_STYLE_TYPES.auditory },
      { label: "قراءة الشرح أو كتابة الملاحظات", styleType: VARK_STYLE_TYPES.readingWriting },
      { label: "تجربة النشاط أو التطبيق العملي", styleType: VARK_STYLE_TYPES.kinesthetic },
    ],
  },
  {
    id: "adult-2",
    text: "إذا أردت تذكر معلومة مهمة، ماذا تفعل غالبًا؟",
    options: [
      { label: "أتخيل شكلها أو مكانها في الصفحة", styleType: VARK_STYLE_TYPES.visual },
      { label: "أرددها بصوت مسموع", styleType: VARK_STYLE_TYPES.auditory },
      { label: "أكتبها أكثر من مرة", styleType: VARK_STYLE_TYPES.readingWriting },
      { label: "أربطها بحركة أو تجربة عملية", styleType: VARK_STYLE_TYPES.kinesthetic },
    ],
  },
  {
    id: "adult-3",
    text: "عند مراجعة اختبار، ما الأسلوب المفضل لديك؟",
    options: [
      { label: "استخدام خرائط ذهنية وألوان", styleType: VARK_STYLE_TYPES.visual },
      { label: "الاستماع لشرح أو تسجيل صوتي", styleType: VARK_STYLE_TYPES.auditory },
      { label: "قراءة الملخصات وكتابة النقاط", styleType: VARK_STYLE_TYPES.readingWriting },
      { label: "حل أسئلة وتطبيقات عملية", styleType: VARK_STYLE_TYPES.kinesthetic },
    ],
  },
  {
    id: "adult-4",
    text: "إذا أعطاك المعلم تعليمات لمهمة، تفضل أن تكون:",
    options: [
      { label: "على شكل رسم أو خطوات مصورة", styleType: VARK_STYLE_TYPES.visual },
      { label: "مشروحة شفهيًا", styleType: VARK_STYLE_TYPES.auditory },
      { label: "مكتوبة في ورقة أو ملف", styleType: VARK_STYLE_TYPES.readingWriting },
      { label: "موضحة بتجربة أمامك", styleType: VARK_STYLE_TYPES.kinesthetic },
    ],
  },
  {
    id: "adult-5",
    text: "عندما تحاول فهم فكرة صعبة، ماذا يساعدك؟",
    options: [
      { label: "مشاهدة رسم توضيحي أو فيديو بصري", styleType: VARK_STYLE_TYPES.visual },
      { label: "مناقشة الفكرة مع شخص آخر", styleType: VARK_STYLE_TYPES.auditory },
      { label: "قراءة شرح مفصل عنها", styleType: VARK_STYLE_TYPES.readingWriting },
      { label: "تنفيذ مثال عملي عليها", styleType: VARK_STYLE_TYPES.kinesthetic },
    ],
  },
  {
    id: "adult-6",
    text: "في العمل الجماعي، ما الدور الأقرب لك؟",
    options: [
      { label: "تصميم العرض أو ترتيب الأفكار بصريًا", styleType: VARK_STYLE_TYPES.visual },
      { label: "شرح الأفكار والتحدث باسم المجموعة", styleType: VARK_STYLE_TYPES.auditory },
      { label: "كتابة التقرير أو تلخيص النقاط", styleType: VARK_STYLE_TYPES.readingWriting },
      { label: "تنفيذ التجربة أو تجهيز الأدوات", styleType: VARK_STYLE_TYPES.kinesthetic },
    ],
  },
  {
    id: "adult-7",
    text: "إذا أردت تعلم برنامج أو تطبيق جديد، كيف تبدأ؟",
    options: [
      { label: "أشاهد الواجهة وأتبع الأيقونات", styleType: VARK_STYLE_TYPES.visual },
      { label: "أستمع لشخص يشرح طريقة الاستخدام", styleType: VARK_STYLE_TYPES.auditory },
      { label: "أقرأ التعليمات أو الدليل", styleType: VARK_STYLE_TYPES.readingWriting },
      { label: "أجرب بنفسي حتى أتعلم", styleType: VARK_STYLE_TYPES.kinesthetic },
    ],
  },
  {
    id: "adult-8",
    text: "ما نوع الواجبات التي تفضلها؟",
    options: [
      { label: "تصميم خريطة مفاهيم أو ملصق", styleType: VARK_STYLE_TYPES.visual },
      { label: "تقديم عرض شفهي", styleType: VARK_STYLE_TYPES.auditory },
      { label: "كتابة بحث أو ملخص", styleType: VARK_STYLE_TYPES.readingWriting },
      { label: "تنفيذ مشروع أو تجربة", styleType: VARK_STYLE_TYPES.kinesthetic },
    ],
  },
  {
    id: "adult-9",
    text: "عند حضور درس، ما أكثر شيء يجذب انتباهك؟",
    options: [
      { label: "الألوان والصور والعروض المرئية", styleType: VARK_STYLE_TYPES.visual },
      { label: "صوت المعلم وطريقة الشرح", styleType: VARK_STYLE_TYPES.auditory },
      { label: "النصوص والنقاط المكتوبة", styleType: VARK_STYLE_TYPES.readingWriting },
      { label: "الأنشطة والتطبيقات داخل الدرس", styleType: VARK_STYLE_TYPES.kinesthetic },
    ],
  },
  {
    id: "adult-10",
    text: "إذا نسيت معلومة، كيف تحاول استرجاعها؟",
    options: [
      { label: "أتذكر شكل الصفحة أو الرسم", styleType: VARK_STYLE_TYPES.visual },
      { label: "أتذكر صوت الشرح أو الحوار", styleType: VARK_STYLE_TYPES.auditory },
      { label: "أرجع للملاحظات المكتوبة", styleType: VARK_STYLE_TYPES.readingWriting },
      { label: "أتذكر النشاط الذي قمت به", styleType: VARK_STYLE_TYPES.kinesthetic },
    ],
  },
  {
    id: "adult-11",
    text: "عندما تشاهد فيديو تعليميًا، ما الذي يفيدك أكثر؟",
    options: [
      { label: "الرسوم والمؤثرات البصرية", styleType: VARK_STYLE_TYPES.visual },
      { label: "صوت الشرح والتعليق", styleType: VARK_STYLE_TYPES.auditory },
      { label: "النصوص المكتوبة على الشاشة", styleType: VARK_STYLE_TYPES.readingWriting },
      { label: "التجربة العملية المعروضة", styleType: VARK_STYLE_TYPES.kinesthetic },
    ],
  },
  {
    id: "adult-12",
    text: "عند تعلم مفردات أو مصطلحات جديدة، تفضل:",
    options: [
      { label: "ربطها بصورة أو رمز", styleType: VARK_STYLE_TYPES.visual },
      { label: "سماع نطقها وتكرارها", styleType: VARK_STYLE_TYPES.auditory },
      { label: "كتابتها وتعريفها في الدفتر", styleType: VARK_STYLE_TYPES.readingWriting },
      { label: "استخدامها في نشاط أو موقف عملي", styleType: VARK_STYLE_TYPES.kinesthetic },
    ],
  },
  {
    id: "adult-13",
    text: "في الحصة الدراسية، متى تشعر أنك تعلمت بشكل أفضل؟",
    options: [
      { label: "عندما أرى مخططًا أو عرضًا واضحًا", styleType: VARK_STYLE_TYPES.visual },
      { label: "عندما أسمع الشرح بتفصيل", styleType: VARK_STYLE_TYPES.auditory },
      { label: "عندما أقرأ وأدوّن ملاحظات", styleType: VARK_STYLE_TYPES.readingWriting },
      { label: "عندما أشارك في نشاط أو تجربة", styleType: VARK_STYLE_TYPES.kinesthetic },
    ],
  },
  {
    id: "adult-14",
    text: "إذا طُلب منك شرح درس لزميلك، كيف تشرحه؟",
    options: [
      { label: "أرسم له مخططًا أو شكلًا توضيحيًا", styleType: VARK_STYLE_TYPES.visual },
      { label: "أشرح له بالكلام خطوة بخطوة", styleType: VARK_STYLE_TYPES.auditory },
      { label: "أكتب له النقاط المهمة", styleType: VARK_STYLE_TYPES.readingWriting },
      { label: "أطبق معه مثالًا عمليًا", styleType: VARK_STYLE_TYPES.kinesthetic },
    ],
  },
  {
    id: "adult-15",
    text: "ما الطريقة التي تساعدك على التركيز؟",
    options: [
      { label: "تنظيم الدرس بالألوان والرسوم", styleType: VARK_STYLE_TYPES.visual },
      { label: "الاستماع للشرح أو النقاش", styleType: VARK_STYLE_TYPES.auditory },
      { label: "القراءة والكتابة في مكان هادئ", styleType: VARK_STYLE_TYPES.readingWriting },
      { label: "الحركة أو استخدام الأدوات أثناء التعلم", styleType: VARK_STYLE_TYPES.kinesthetic },
    ],
  },
  {
    id: "adult-16",
    text: "عند تعلم مهارة جديدة، تفضل:",
    options: [
      { label: "مشاهدة خطواتها أمامك", styleType: VARK_STYLE_TYPES.visual },
      { label: "سماع شرح خطواتها", styleType: VARK_STYLE_TYPES.auditory },
      { label: "قراءة خطواتها مكتوبة", styleType: VARK_STYLE_TYPES.readingWriting },
      { label: "تجربتها بنفسك مباشرة", styleType: VARK_STYLE_TYPES.kinesthetic },
    ],
  },
];

export const getVarkQuestions = (ageGroup) => (ageGroup === AGE_GROUPS.adults.key ? ADULTS_QUESTIONS : CHILDREN_QUESTIONS);

export const getStyleMeta = (styleType) => {
  const meta = {
    [VARK_STYLE_TYPES.visual]: {
      label: "بصري",
      description: "تتعلم بشكل أفضل عندما ترى الرسوم والألوان والمخططات.",
      tips: "استخدم صورًا، خرائط ذهنية، ومخططات ملونة لتسهيل الفهم.",
    },
    [VARK_STYLE_TYPES.auditory]: {
      label: "سمعي",
      description: "تتعلم بشكل أفضل عندما تسمع الشرح والتعليقات.",
      tips: "استمع إلى التسجيلات، وشارك في المناقشات الشفهية.",
    },
    [VARK_STYLE_TYPES.readingWriting]: {
      label: "قرائي/كتابي",
      description: "تتعلم بشكل أفضل من خلال القراءة والكتابة.",
      tips: "اكتب الملخصات، اقرأ التعليمات، واستخدم الملاحظات الموجزة.",
    },
    [VARK_STYLE_TYPES.kinesthetic]: {
      label: "حركي",
      description: "تتعلم بشكل أفضل من خلال الحركة والتطبيق العملي.",
      tips: "شارك في الأنشطة، التجارب، والتمارين العملية.",
    },
  };
  return meta[styleType] || meta[VARK_STYLE_TYPES.visual];
};

export const calculateVarkResult = (selectedAnswers) => {
  const scores = {
    [VARK_STYLE_TYPES.visual]: 0,
    [VARK_STYLE_TYPES.auditory]: 0,
    [VARK_STYLE_TYPES.readingWriting]: 0,
    [VARK_STYLE_TYPES.kinesthetic]: 0,
  };
  selectedAnswers.forEach((answer) => {
    if (answer?.styleType) {
      scores[answer.styleType] += 1;
    }
  });
  const maxScore = Math.max(...Object.values(scores));
  const dominantStyles = Object.entries(scores)
    .filter(([, value]) => value === maxScore)
    .map(([key]) => key);

  const dominantStyle = dominantStyles.length === 1 ? dominantStyles[0] : "multiple";
  const percentages = Object.fromEntries(
    Object.entries(scores).map(([key, value]) => [key, Number((value / 16) * 100).toFixed(1)])
  );
  return { scores, dominantStyle, dominantStyles, percentages };
};
