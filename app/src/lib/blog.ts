import type { Locale } from '@/i18n/routing';

/** Structured content blocks — rendered by a small mapper, so no markdown/HTML injection. */
export type BlogBlock =
  | { type: 'p'; text: string }
  | { type: 'h2'; text: string }
  | { type: 'ul'; items: string[] };

export interface BlogContent {
  title: string;
  description: string;
  body: BlogBlock[];
}

export interface BlogPost {
  slug: string;
  date: string; // ISO (publish date)
  readingMinutes: number;
  tags: string[];
  content: Record<Locale, BlogContent>;
}

export const POSTS: BlogPost[] = [
  {
    slug: 'getting-started-online-coaching',
    date: '2026-06-01',
    readingMinutes: 5,
    tags: ['coaching', 'getting-started'],
    content: {
      en: {
        title: 'Getting started as an online fitness coach',
        description:
          'A simple, five-step playbook for taking your coaching online — from your first client to a repeatable program-delivery workflow.',
        body: [
          {
            type: 'p',
            text: 'Going online lets you coach more athletes without trading every hour for a session. But most coaches stall on the same thing: an unclear workflow. Here is a lean setup you can start today.',
          },
          { type: 'h2', text: '1. Build a small, reusable exercise library' },
          {
            type: 'p',
            text: 'Before you write a single program, add the 30–50 movements you actually prescribe. Give each a clear name, default sets and reps, and a short cue or a demo video link. You will reuse these across every client, so this one-time effort pays off forever.',
          },
          { type: 'h2', text: '2. Write programs against a phone number' },
          {
            type: 'p',
            text: 'You should not wait for a client to install anything before you start working. With fitlo you can author a full day-by-day program against a student’s phone number — before they have an account. When they register with that number later, every program you wrote links to them automatically.',
          },
          { type: 'h2', text: '3. Standardize how you deliver' },
          {
            type: 'ul',
            items: [
              'Export a clean, RTL-aware PDF for clients who prefer a file.',
              'Group supersets so the intended pairing is obvious.',
              'Keep a demo link on each exercise so form questions answer themselves.',
            ],
          },
          { type: 'h2', text: '4. Put up a public page' },
          {
            type: 'p',
            text: 'A single link-in-bio page turns your social following into intake requests. Prospects see your bio, specialties and contact, then submit their stats and goals in one form that lands directly in your inbox.',
          },
          { type: 'h2', text: '5. Review, iterate, retain' },
          {
            type: 'p',
            text: 'The coaches who keep clients are the ones who make progression obvious. Revisit each program on a fixed cadence, adjust loads, and communicate the “why.” A tidy system frees your attention for exactly that.',
          },
        ],
      },
      fa: {
        title: 'شروع مربیگری آنلاین از صفر',
        description:
          'یک راهنمای ساده‌ی پنج‌مرحله‌ای برای آنلاین‌کردن مربیگری — از اولین شاگرد تا یک روند تکرارپذیر برای تحویل برنامه.',
        body: [
          {
            type: 'p',
            text: 'مربیگری آنلاین به تو اجازه می‌دهد شاگردان بیشتری بگیری بدون این‌که هر ساعت را با یک جلسه معاوضه کنی. اما بیشتر مربی‌ها سر یک چیز گیر می‌کنند: نبودِ یک روند مشخص. این یک ساختار سبک است که همین امروز می‌توانی شروع کنی.',
          },
          { type: 'h2', text: '۱. یک کتابخانه‌ی تمرین کوچک و قابل‌استفاده بساز' },
          {
            type: 'p',
            text: 'قبل از نوشتن حتی یک برنامه، همان ۳۰ تا ۵۰ حرکتی را که واقعاً تجویز می‌کنی اضافه کن. برای هرکدام یک نام واضح، ست و تکرار پیش‌فرض و یک نکته‌ی کوتاه یا لینک ویدیوی نمونه بگذار. این‌ها را در همه‌ی برنامه‌ها دوباره استفاده می‌کنی، پس این تلاش یک‌باره برای همیشه جواب می‌دهد.',
          },
          { type: 'h2', text: '۲. برنامه را روی شماره‌ی موبایل بنویس' },
          {
            type: 'p',
            text: 'لازم نیست منتظر بمانی شاگرد چیزی نصب کند تا کار را شروع کنی. با فیتلو می‌توانی یک برنامه‌ی کامل روزبه‌روز را روی شماره‌ی موبایل شاگرد بنویسی — حتی قبل از این‌که حساب داشته باشد. وقتی بعداً با همان شماره ثبت‌نام کند، همه‌ی برنامه‌هایی که برایش نوشته‌ای خودکار به او وصل می‌شوند.',
          },
          { type: 'h2', text: '۳. روش تحویل را استاندارد کن' },
          {
            type: 'ul',
            items: [
              'برای شاگردانی که فایل را ترجیح می‌دهند، یک PDF تمیز و راست‌به‌چپ بگیر.',
              'سوپرست‌ها را گروه کن تا ترکیب موردنظر واضح باشد.',
              'روی هر تمرین یک لینک نمونه بگذار تا سؤال‌های فرم خودشان جواب داده شوند.',
            ],
          },
          { type: 'h2', text: '۴. یک صفحه‌ی عمومی بساز' },
          {
            type: 'p',
            text: 'یک لینک اختصاصی، دنبال‌کننده‌های شبکه‌های اجتماعی‌ات را به درخواست برنامه تبدیل می‌کند. مخاطب بیو، تخصص‌ها و راه ارتباطی‌ات را می‌بیند و بعد مشخصات و هدفش را در یک فرم می‌فرستد که مستقیم به صندوق درخواست‌های تو می‌رسد.',
          },
          { type: 'h2', text: '۵. بازبینی کن، اصلاح کن، نگه‌دار' },
          {
            type: 'p',
            text: 'مربی‌هایی شاگرد نگه می‌دارند که پیشرفت را واضح می‌کنند. هر برنامه را با یک نظم مشخص مرور کن، وزنه‌ها را تنظیم کن و «چرایی» را توضیح بده. یک سیستم مرتب، تمرکز تو را دقیقاً برای همین آزاد می‌کند.',
          },
        ],
      },
    },
  },
  {
    slug: 'write-better-training-programs',
    date: '2026-06-08',
    readingMinutes: 6,
    tags: ['programming', 'coaching'],
    content: {
      en: {
        title: 'How to write training programs your clients actually follow',
        description:
          'Adherence beats theory. Five principles for building programs that are clear, progressive, and easy to stick with.',
        body: [
          {
            type: 'p',
            text: 'The best program is the one your client completes. Clever periodization is worthless if the athlete is confused, bored, or overwhelmed. Optimize for adherence first.',
          },
          { type: 'h2', text: 'Structure the week around recovery, not just muscles' },
          {
            type: 'p',
            text: 'Decide how many days the client can realistically train, then design that many days — not the ideal you wish they had. A four-day plan that gets done beats a six-day plan that gets skipped.',
          },
          { type: 'h2', text: 'Make progression the default' },
          {
            type: 'p',
            text: 'Every exercise should have a clear target: sets, a rep range, and a way to move up. When the target is explicit, clients self-manage between check-ins and you spend your time coaching, not chasing.',
          },
          { type: 'h2', text: 'Use supersets deliberately' },
          {
            type: 'ul',
            items: [
              'Pair non-competing movements (e.g. a push with a pull) to save time.',
              'Group the pairing visually so the client never guesses the order.',
              'Reserve intensity techniques for accessories, not heavy compounds.',
            ],
          },
          { type: 'h2', text: 'Write cues, not essays' },
          {
            type: 'p',
            text: 'One sharp cue per exercise beats a paragraph nobody reads. Attach a short demo link for anything technical and let the video do the teaching.',
          },
          { type: 'h2', text: 'Keep one source of truth' },
          {
            type: 'p',
            text: 'When the program lives in one place and exports cleanly to PDF, there is no version confusion. Edit once, and the client always sees the current plan.',
          },
        ],
      },
      fa: {
        title: 'چطور برنامه‌ای بنویسیم که شاگرد واقعاً انجامش بدهد',
        description:
          'پایبندی از تئوری مهم‌تر است. پنج اصل برای ساختن برنامه‌هایی که واضح، پیش‌رونده و ساده برای ادامه‌دادن هستند.',
        body: [
          {
            type: 'p',
            text: 'بهترین برنامه همانی است که شاگردت تمامش می‌کند. دوره‌بندی هوشمندانه وقتی ارزشی ندارد که ورزشکار گیج، خسته یا سردرگم باشد. اول برای پایبندی بهینه کن.',
          },
          { type: 'h2', text: 'هفته را حول ریکاوری بچین، نه فقط عضلات' },
          {
            type: 'p',
            text: 'اول تصمیم بگیر شاگرد واقعاً چند روز می‌تواند تمرین کند، بعد همان تعداد روز را طراحی کن — نه حالت ایده‌آلی که آرزویش را داری. یک برنامه‌ی چهارروزه که انجام می‌شود بهتر از یک برنامه‌ی شش‌روزه است که رها می‌شود.',
          },
          { type: 'h2', text: 'پیشروی را به حالت پیش‌فرض تبدیل کن' },
          {
            type: 'p',
            text: 'هر تمرین باید یک هدف واضح داشته باشد: تعداد ست، بازه‌ی تکرار و راهی برای بالا رفتن. وقتی هدف صریح باشد، شاگرد بین جلسه‌های بررسی خودش را مدیریت می‌کند و تو وقتت را صرف مربیگری می‌کنی، نه دنبال‌کردن.',
          },
          { type: 'h2', text: 'از سوپرست هدفمند استفاده کن' },
          {
            type: 'ul',
            items: [
              'حرکت‌های غیررقیب را جفت کن (مثلاً یک حرکت هل‌دادن با یک حرکت کشیدن) تا در زمان صرفه‌جویی شود.',
              'جفت‌شدن را به‌صورت بصری گروه کن تا شاگرد هیچ‌وقت ترتیب را حدس نزند.',
              'تکنیک‌های شدت را برای حرکات کمکی نگه دار، نه حرکات ترکیبی سنگین.',
            ],
          },
          { type: 'h2', text: 'نکته بنویس، نه انشا' },
          {
            type: 'p',
            text: 'یک نکته‌ی دقیق برای هر تمرین بهتر از یک پاراگراف است که کسی نمی‌خواند. برای هر چیز فنی یک لینک نمونه‌ی کوتاه بگذار و بگذار ویدیو آموزش بدهد.',
          },
          { type: 'h2', text: 'یک منبع حقیقت نگه دار' },
          {
            type: 'p',
            text: 'وقتی برنامه در یک جا باشد و تمیز به PDF خروجی بگیرد، سردرگمی نسخه‌ها پیش نمی‌آید. یک‌بار ویرایش کن و شاگرد همیشه نسخه‌ی فعلی را می‌بیند.',
          },
        ],
      },
    },
  },
  {
    slug: 'supersets-explained',
    date: '2026-06-15',
    readingMinutes: 4,
    tags: ['programming', 'technique'],
    content: {
      en: {
        title: 'Supersets explained: when and why to use them',
        description:
          'What a superset actually is, the main types, and how to program them without wrecking your main lifts.',
        body: [
          {
            type: 'p',
            text: 'A superset is two exercises performed back-to-back with little or no rest in between. Used well, supersets save time and add training density. Used carelessly, they sabotage your heavy work.',
          },
          { type: 'h2', text: 'The three useful types' },
          {
            type: 'ul',
            items: [
              'Antagonist pairs — e.g. a press and a row. Each muscle rests while the other works, so quality stays high.',
              'Same-muscle pairs — two movements for one muscle to drive fatigue on accessories.',
              'Non-competing pairs — an upper and a lower movement to keep moving with minimal interference.',
            ],
          },
          { type: 'h2', text: 'When to reach for them' },
          {
            type: 'p',
            text: 'Supersets shine on accessory work and when time is tight. Keep your heaviest compound lifts as straight sets with full rest — pairing them with anything usually costs you load and clean technique.',
          },
          { type: 'h2', text: 'Make the pairing obvious' },
          {
            type: 'p',
            text: 'The most common failure is presentation: the client does not realize two moves belong together. Group them clearly on the program so the intended order is never in doubt.',
          },
        ],
      },
      fa: {
        title: 'سوپرست به زبان ساده: کِی و چرا از آن استفاده کنیم',
        description:
          'سوپرست دقیقاً چیست، انواع اصلی‌اش کدام‌اند و چطور آن را برنامه‌ریزی کنیم بدون این‌که حرکت‌های اصلی خراب شوند.',
        body: [
          {
            type: 'p',
            text: 'سوپرست یعنی دو تمرین که پشت‌سرهم و با استراحت کم یا بدون استراحت اجرا می‌شوند. اگر درست استفاده شود، در زمان صرفه‌جویی می‌کند و تراکم تمرین را بالا می‌برد. اگر بی‌دقت استفاده شود، به حرکت‌های سنگینت ضربه می‌زند.',
          },
          { type: 'h2', text: 'سه نوع کاربردی' },
          {
            type: 'ul',
            items: [
              'جفت‌های متضاد — مثل یک حرکت پرس و یک حرکت زیربغل. هر عضله وقتی دیگری کار می‌کند استراحت می‌کند، پس کیفیت بالا می‌ماند.',
              'جفت‌های هم‌عضله — دو حرکت برای یک عضله تا خستگی روی حرکات کمکی بیشتر شود.',
              'جفت‌های غیررقیب — یک حرکت بالاتنه و یک حرکت پایین‌تنه تا با کمترین تداخل در حرکت بمانی.',
            ],
          },
          { type: 'h2', text: 'کِی سراغش برویم' },
          {
            type: 'p',
            text: 'سوپرست روی حرکات کمکی و وقتی زمان کم است می‌درخشد. سنگین‌ترین حرکات ترکیبی را به‌صورت ست مستقیم و با استراحت کامل نگه دار — جفت‌کردنشان با هر چیزی معمولاً به قیمت از دست دادن وزنه و تکنیک تمیز تمام می‌شود.',
          },
          { type: 'h2', text: 'جفت‌شدن را واضح کن' },
          {
            type: 'p',
            text: 'رایج‌ترین اشتباه، نحوه‌ی نمایش است: شاگرد متوجه نمی‌شود دو حرکت به هم مربوط‌اند. آن‌ها را در برنامه واضح گروه کن تا ترتیب موردنظر هیچ‌وقت مبهم نباشد.',
          },
        ],
      },
    },
  },
  {
    slug: 'grow-with-a-public-link',
    date: '2026-06-22',
    readingMinutes: 4,
    tags: ['growth', 'marketing'],
    content: {
      en: {
        title: 'Turn your bio link into a client pipeline',
        description:
          'A public coach page collects qualified intake requests on autopilot. Here is how to set one up that converts.',
        body: [
          {
            type: 'p',
            text: 'Every coach already has an audience on social media. The gap is the last step: turning a viewer into a structured request you can act on. A dedicated public page closes that gap.',
          },
          { type: 'h2', text: 'What a good public page does' },
          {
            type: 'ul',
            items: [
              'Shows who you are — name, specialties, a short bio, and a photo.',
              'Gives one obvious call to action: request a program.',
              'Collects the stats you need up front, so no back-and-forth DMs.',
            ],
          },
          { type: 'h2', text: 'Reduce friction, not information' },
          {
            type: 'p',
            text: 'Ask for exactly what you need to write a first program — goals, training history, a few measurements, and optional photos — and nothing more. A form that takes two minutes gets finished; a ten-minute form gets abandoned.',
          },
          { type: 'h2', text: 'Make the money step clear' },
          {
            type: 'p',
            text: 'Show your price and payment details on the same page as the request, so a motivated prospect can commit in one sitting instead of waiting for a reply.',
          },
          { type: 'h2', text: 'Then just share it' },
          {
            type: 'p',
            text: 'Put the link in every bio, story highlight, and pinned post. Each request lands in your inbox with the athlete’s details already attached — ready for you to write their first program.',
          },
        ],
      },
      fa: {
        title: 'لینک بیو را به یک مسیر جذب شاگرد تبدیل کن',
        description:
          'یک صفحه‌ی عمومی مربی، درخواست‌های باکیفیت را خودکار جمع می‌کند. این‌طور یکی بساز که به نتیجه برسد.',
        body: [
          {
            type: 'p',
            text: 'هر مربی از قبل یک مخاطب در شبکه‌های اجتماعی دارد. شکاف در آخرین قدم است: تبدیل یک بیننده به یک درخواست ساختارمند که بتوانی روی آن کار کنی. یک صفحه‌ی عمومی اختصاصی همین شکاف را پر می‌کند.',
          },
          { type: 'h2', text: 'یک صفحه‌ی عمومی خوب چه می‌کند' },
          {
            type: 'ul',
            items: [
              'می‌گوید تو کی هستی — نام، تخصص‌ها، یک بیو کوتاه و یک عکس.',
              'یک دعوت به اقدام واضح می‌دهد: درخواست برنامه.',
              'مشخصات لازم را از همان اول می‌گیرد تا رفت‌وبرگشتِ دایرکت پیش نیاید.',
            ],
          },
          { type: 'h2', text: 'اصطکاک را کم کن، نه اطلاعات را' },
          {
            type: 'p',
            text: 'دقیقاً همان چیزی را بخواه که برای نوشتن اولین برنامه لازم داری — هدف‌ها، سابقه‌ی تمرینی، چند اندازه و عکس‌های اختیاری — و نه بیشتر. فرمی که دو دقیقه طول بکشد تمام می‌شود؛ فرم ده‌دقیقه‌ای رها می‌شود.',
          },
          { type: 'h2', text: 'قدم پرداخت را شفاف کن' },
          {
            type: 'p',
            text: 'قیمت و اطلاعات پرداختت را در همان صفحه‌ی درخواست نشان بده تا یک مخاطب مشتاق در همان نشست تصمیم بگیرد، نه این‌که منتظر جواب بماند.',
          },
          { type: 'h2', text: 'بعد فقط به اشتراکش بگذار' },
          {
            type: 'p',
            text: 'لینک را در هر بیو، هایلایت استوری و پست پین‌شده بگذار. هر درخواست با مشخصات ورزشکار به صندوق تو می‌رسد — آماده تا اولین برنامه‌اش را بنویسی.',
          },
        ],
      },
    },
  },
];

export function getAllPostSlugs(): string[] {
  return POSTS.map((p) => p.slug);
}

export function getPost(slug: string): BlogPost | undefined {
  return POSTS.find((p) => p.slug === slug);
}

/** Posts newest-first, with the requested locale's content pre-selected. */
export function listPosts(locale: Locale) {
  return [...POSTS]
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((p) => ({ slug: p.slug, date: p.date, readingMinutes: p.readingMinutes, tags: p.tags, ...p.content[locale] }));
}
