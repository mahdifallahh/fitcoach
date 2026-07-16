import type { Locale } from '@/i18n/routing';

/**
 * Legal documents (Terms of Service + Privacy Policy) as structured, bilingual
 * content blocks — same approach as `lib/blog.ts`, so nothing is markdown-parsed
 * or `dangerouslySetInnerHTML`'d and both locales stay in lockstep.
 *
 * NB: this is honest, product-accurate boilerplate, not legal advice. Have a
 * qualified lawyer review it before relying on it in production. Bump `updated`
 * whenever the substance changes.
 */
export type LegalBlock =
  | { type: 'p'; text: string }
  | { type: 'h2'; text: string }
  | { type: 'ul'; items: string[] };

export interface LegalContent {
  title: string;
  intro: string;
  body: LegalBlock[];
}

export type LegalSlug = 'terms' | 'privacy';

export interface LegalDoc {
  slug: LegalSlug;
  updated: string; // ISO date of last substantive change
  content: Record<Locale, LegalContent>;
}

const CONTACT_EMAIL = 'support@fitlo.ir';

export const LEGAL_DOCS: Record<LegalSlug, LegalDoc> = {
  privacy: {
    slug: 'privacy',
    updated: '2026-07-16',
    content: {
      fa: {
        title: 'سیاست حریم خصوصی',
        intro:
          'این سیاست توضیح می‌دهد فیتلو چه اطلاعاتی را جمع‌آوری می‌کند، چرا و چطور از آن‌ها نگه‌داری و محافظت می‌کند. با استفاده از فیتلو این سیاست را می‌پذیری.',
        body: [
          { type: 'h2', text: 'چه اطلاعاتی جمع‌آوری می‌کنیم' },
          {
            type: 'ul',
            items: [
              'شماره موبایل — برای ورود و احراز هویت با کد یک‌بار مصرف.',
              'رمز عبور — فقط به‌صورت هش‌شده (scrypt) ذخیره می‌شود؛ ما هرگز رمز واقعی تو را نمی‌بینیم و ذخیره نمی‌کنیم.',
              'اطلاعات پروفایل مربی — نام، بیو، عکس پروفایل، لینک‌های شبکه‌های اجتماعی و اطلاعات تماسی که خودت وارد می‌کنی.',
              'مشخصات شاگرد — سن، قد، وزن و سابقه‌ی تمرینی که برای نوشتن برنامه لازم است.',
              'عکس‌ها و فایل‌ها — عکس‌هایی که در فرم درخواست بارگذاری می‌کنی (مثل عکس بدن) و رسید پرداخت.',
              'محتوای برنامه — تمرین‌ها، برنامه‌های تمرینی و یادداشت‌هایی که می‌سازی.',
              'اطلاعات فنی — مانند نشانی IP، نوع مرورگر و لاگ‌های فنی که برای امنیت و رفع اشکال لازم‌اند.',
            ],
          },
          { type: 'h2', text: 'چطور از این اطلاعات استفاده می‌کنیم' },
          {
            type: 'ul',
            items: [
              'برای احراز هویت و ورود امن به حساب.',
              'برای ارائه‌ی سرویس: ساخت برنامه، کتابخانه‌ی تمرین، خروجی PDF و صفحه‌ی عمومی مربی.',
              'برای رساندن درخواست شاگرد به مربی مربوطه.',
              'برای پردازش پرداخت اشتراک.',
              'برای بهبود سرویس، پشتیبانی و حفظ امنیت.',
            ],
          },
          { type: 'h2', text: 'اشتراک‌گذاری اطلاعات' },
          {
            type: 'p',
            text: 'ما اطلاعات شخصی تو را نمی‌فروشیم. اطلاعات و عکس‌هایی که در فرم درخواست ثبت می‌کنی فقط برای همان مربی‌ای که برایش می‌فرستی قابل مشاهده است. برای اجرای سرویس از چند ارائه‌دهنده‌ی خدمات کمک می‌گیریم که فقط به بخش لازم دسترسی دارند: سرویس پیامک (SMS.ir) برای ارسال کد ورود، درگاه پرداخت (زرین‌پال) برای پرداخت اشتراک، و زیرساخت میزبانی و ذخیره‌سازی فایل.',
          },
          { type: 'h2', text: 'عکس‌ها و فایل‌های خصوصی' },
          {
            type: 'p',
            text: 'عکس‌های بدن و رسیدهای پرداخت در یک فضای ذخیره‌سازی خصوصی نگه‌داری می‌شوند و به‌صورت عمومی قابل دسترس نیستند. مربی آن‌ها را فقط از طریق یک لینک امنِ کوتاه‌مدت می‌بیند. عکس پروفایل و گیف تمرین‌ها چون قرار است در اپ نمایش داده شوند، عمومی هستند.',
          },
          { type: 'h2', text: 'نگه‌داری اطلاعات' },
          {
            type: 'p',
            text: 'اطلاعات تو را تا زمانی که حسابت فعال است یا برای ارائه‌ی سرویس لازم است نگه می‌داریم. اگر حسابت را حذف کنی، داده‌های شخصی‌ات را در بازه‌ی معقولی حذف یا غیرقابل‌شناسایی می‌کنیم، مگر بخشی که طبق قانون باید نگه‌داری شود (مثل سوابق مالی).',
          },
          { type: 'h2', text: 'امنیت' },
          {
            type: 'p',
            text: 'ارتباط با سایت رمزنگاری‌شده (HTTPS) است، رمز عبور به‌صورت هش‌شده ذخیره می‌شود و دسترسی به عکس‌های خصوصی محدود و موقت است. با این حال هیچ سیستمی صددرصد امن نیست و نمی‌توانیم امنیت مطلق را تضمین کنیم.',
          },
          { type: 'h2', text: 'حقوق تو' },
          {
            type: 'ul',
            items: [
              'دسترسی به اطلاعاتی که از تو داریم و اصلاح آن‌ها.',
              'حذف حساب و اطلاعات شخصی‌ات.',
              'انصراف از دریافت پیام‌های غیرضروری.',
            ],
          },
          { type: 'h2', text: 'کودکان' },
          {
            type: 'p',
            text: 'فیتلو برای افراد زیر سن قانونی طراحی نشده است. اگر زیر سن قانونی هستی، لطفاً فقط با اجازه و نظارت سرپرست قانونی از سرویس استفاده کن.',
          },
          { type: 'h2', text: 'تغییرات این سیاست' },
          {
            type: 'p',
            text: 'ممکن است این سیاست را به‌روزرسانی کنیم. نسخه‌ی جدید با تاریخ به‌روزرسانی در همین صفحه منتشر می‌شود و ادامه‌ی استفاده از سرویس به‌معنای پذیرش نسخه‌ی جدید است.',
          },
          { type: 'h2', text: 'تماس با ما' },
          {
            type: 'p',
            text: `برای هر پرسش درباره‌ی حریم خصوصی یا درخواست حذف اطلاعات، با ما در ${CONTACT_EMAIL} در تماس باش.`,
          },
        ],
      },
      en: {
        title: 'Privacy Policy',
        intro:
          'This policy explains what information fitlo collects, why, and how we store and protect it. By using fitlo you agree to this policy.',
        body: [
          { type: 'h2', text: 'What we collect' },
          {
            type: 'ul',
            items: [
              'Phone number — for sign-in and one-time-code authentication.',
              'Password — stored only as a hash (scrypt); we never see or store your actual password.',
              'Coach profile — name, bio, avatar, social links and contact details you enter.',
              'Student details — age, height, weight and training history needed to write a program.',
              'Photos and files — images you upload in the request form (e.g. physique photos) and payment receipts.',
              'Program content — exercises, training programs and notes you create.',
              'Technical data — such as IP address, browser type and technical logs needed for security and debugging.',
            ],
          },
          { type: 'h2', text: 'How we use it' },
          {
            type: 'ul',
            items: [
              'To authenticate you and secure your account.',
              'To provide the service: building programs, the exercise library, PDF export and the public coach page.',
              'To deliver a student’s request to the intended coach.',
              'To process subscription payments.',
              'To improve the service, provide support and maintain security.',
            ],
          },
          { type: 'h2', text: 'Sharing' },
          {
            type: 'p',
            text: 'We do not sell your personal data. Information and photos you submit in a request form are visible only to the coach you send them to. To run the service we rely on a few service providers with access limited to what they need: an SMS provider (SMS.ir) to send sign-in codes, a payment gateway (ZarinPal) for subscriptions, and hosting/file-storage infrastructure.',
          },
          { type: 'h2', text: 'Private photos and files' },
          {
            type: 'p',
            text: 'Physique photos and payment receipts are kept in private storage and are not publicly accessible. A coach views them only through a short-lived, secure link. Profile avatars and exercise GIFs are public because they are meant to be shown in the app.',
          },
          { type: 'h2', text: 'Retention' },
          {
            type: 'p',
            text: 'We keep your data while your account is active or as needed to provide the service. If you delete your account, we delete or anonymize your personal data within a reasonable period, except where the law requires us to retain some of it (e.g. financial records).',
          },
          { type: 'h2', text: 'Security' },
          {
            type: 'p',
            text: 'Traffic is encrypted (HTTPS), passwords are stored hashed, and access to private photos is restricted and time-limited. Still, no system is perfectly secure and we cannot guarantee absolute security.',
          },
          { type: 'h2', text: 'Your rights' },
          {
            type: 'ul',
            items: [
              'Access and correct the information we hold about you.',
              'Delete your account and personal data.',
              'Opt out of non-essential messages.',
            ],
          },
          { type: 'h2', text: 'Children' },
          {
            type: 'p',
            text: 'fitlo is not designed for people under the age of majority. If you are underage, please use the service only with the permission and supervision of a legal guardian.',
          },
          { type: 'h2', text: 'Changes to this policy' },
          {
            type: 'p',
            text: 'We may update this policy. The new version is published on this page with an updated date, and continued use of the service means you accept it.',
          },
          { type: 'h2', text: 'Contact' },
          {
            type: 'p',
            text: `For any privacy question or a data-deletion request, contact us at ${CONTACT_EMAIL}.`,
          },
        ],
      },
    },
  },

  terms: {
    slug: 'terms',
    updated: '2026-07-16',
    content: {
      fa: {
        title: 'قوانین و مقررات',
        intro:
          'این قوانین شرایط استفاده از فیتلو را مشخص می‌کنند. با ساختن حساب یا استفاده از سرویس، این شرایط را می‌پذیری.',
        body: [
          { type: 'h2', text: 'پذیرش شرایط' },
          {
            type: 'p',
            text: 'استفاده از فیتلو به‌معنای پذیرش این قوانین و سیاست حریم خصوصی است. اگر با آن‌ها موافق نیستی، لطفاً از سرویس استفاده نکن.',
          },
          { type: 'h2', text: 'حساب کاربری' },
          {
            type: 'p',
            text: 'مسئولیت حفظ شماره‌ی موبایل و رمز عبورت با خودت است و مسئول فعالیت‌هایی هستی که از طریق حسابت انجام می‌شود. اطلاعاتی که وارد می‌کنی باید درست و متعلق به خودت باشد.',
          },
          { type: 'h2', text: 'نقش مربی و شاگرد' },
          {
            type: 'p',
            text: 'فیتلو ابزاری برای نوشتن و مدیریت برنامه‌ی تمرینی است. مسئولیت محتوای برنامه‌ها، تمرین‌ها و توصیه‌هایی که مربی می‌نویسد کاملاً بر عهده‌ی همان مربی است، نه فیتلو. رابطه‌ی مالی و حرفه‌ای میان مربی و شاگرد مستقیم است و فیتلو طرف آن نیست.',
          },
          { type: 'h2', text: 'اشتراک و پرداخت' },
          {
            type: 'p',
            text: 'مربی‌ها یک نسخه‌ی آزمایشی رایگان ۱۵ روزه دارند که فقط یک‌بار قابل فعال‌سازی است؛ پس از آن برای ساخت و ویرایش برنامه به اشتراک نیاز است. پرداخت از طریق درگاه زرین‌پال انجام می‌شود. مبالغ پرداخت‌شده جز در مواردی که قانون تعیین می‌کند بازگردانده نمی‌شوند.',
          },
          { type: 'h2', text: 'محتوای کاربر' },
          {
            type: 'p',
            text: 'مالکیت محتوایی که می‌سازی یا بارگذاری می‌کنی (برنامه‌ها، عکس‌ها، اطلاعات) با خودت می‌ماند. تو به فیتلو اجازه‌ی محدودی می‌دهی که این محتوا را صرفاً برای ارائه‌ی سرویس ذخیره و نمایش دهد. بارگذاری محتوای غیرقانونی، توهین‌آمیز یا متعلق به دیگران بدون اجازه ممنوع است.',
          },
          { type: 'h2', text: 'استفاده‌ی مجاز' },
          {
            type: 'p',
            text: 'حق نداری از سرویس برای فعالیت غیرقانونی، دسترسی غیرمجاز، اخلال در سیستم یا سوءاستفاده از اطلاعات دیگران استفاده کنی.',
          },
          { type: 'h2', text: 'سلب مسئولیت پزشکی' },
          {
            type: 'p',
            text: 'برنامه‌های تمرینی موجود در فیتلو جایگزین مشاوره‌ی پزشکی نیستند. پیش از شروع هر برنامه‌ی تمرینی، به‌ویژه اگر شرایط پزشکی خاص یا آسیب‌دیدگی داری، با پزشک مشورت کن. مسئولیت هر آسیب ناشی از تمرین بر عهده‌ی خودت و مربی‌ات است.',
          },
          { type: 'h2', text: 'محدودیت مسئولیت' },
          {
            type: 'p',
            text: 'فیتلو «همان‌طور که هست» ارائه می‌شود. تا حدی که قانون اجازه می‌دهد، ما مسئول خسارت‌های غیرمستقیم، از دست رفتن داده یا زیان‌های ناشی از استفاده یا قطع سرویس نیستیم.',
          },
          { type: 'h2', text: 'تعلیق و خاتمه' },
          {
            type: 'p',
            text: 'در صورت نقض این قوانین می‌توانیم دسترسی به حساب را محدود یا مسدود کنیم. تو هم هر زمان می‌توانی حسابت را حذف کنی.',
          },
          { type: 'h2', text: 'تغییرات' },
          {
            type: 'p',
            text: 'ممکن است این قوانین را به‌روزرسانی کنیم. نسخه‌ی جدید در همین صفحه با تاریخ به‌روزرسانی منتشر می‌شود و ادامه‌ی استفاده به‌معنای پذیرش آن است.',
          },
          { type: 'h2', text: 'قانون حاکم' },
          {
            type: 'p',
            text: 'این قوانین تابع قوانین جمهوری اسلامی ایران است.',
          },
          { type: 'h2', text: 'تماس با ما' },
          {
            type: 'p',
            text: `برای هر پرسشی درباره‌ی این قوانین با ما در ${CONTACT_EMAIL} در تماس باش.`,
          },
        ],
      },
      en: {
        title: 'Terms & Conditions',
        intro:
          'These terms set out the rules for using fitlo. By creating an account or using the service, you accept them.',
        body: [
          { type: 'h2', text: 'Acceptance' },
          {
            type: 'p',
            text: 'Using fitlo means you accept these terms and the Privacy Policy. If you do not agree, please do not use the service.',
          },
          { type: 'h2', text: 'Your account' },
          {
            type: 'p',
            text: 'You are responsible for keeping your phone number and password safe and for activity carried out through your account. The information you enter must be accurate and your own.',
          },
          { type: 'h2', text: 'Coach and student roles' },
          {
            type: 'p',
            text: 'fitlo is a tool for writing and managing training programs. The coach — not fitlo — is fully responsible for the content, exercises and advice they write. The financial and professional relationship between coach and student is direct, and fitlo is not a party to it.',
          },
          { type: 'h2', text: 'Subscriptions and payment' },
          {
            type: 'p',
            text: 'Coaches get a one-time 15-day free trial; after that, an active subscription is required to create or edit programs. Payments are processed through the ZarinPal gateway. Amounts paid are non-refundable except where the law requires otherwise.',
          },
          { type: 'h2', text: 'Your content' },
          {
            type: 'p',
            text: 'You keep ownership of the content you create or upload (programs, photos, data). You grant fitlo a limited permission to store and display that content solely to provide the service. Uploading unlawful, offensive, or third-party content without permission is prohibited.',
          },
          { type: 'h2', text: 'Acceptable use' },
          {
            type: 'p',
            text: 'You may not use the service for unlawful activity, unauthorized access, disrupting the system, or misusing other people’s information.',
          },
          { type: 'h2', text: 'Medical disclaimer' },
          {
            type: 'p',
            text: 'Training programs on fitlo are not a substitute for medical advice. Consult a physician before starting any program, especially if you have a medical condition or injury. Responsibility for any injury arising from training rests with you and your coach.',
          },
          { type: 'h2', text: 'Limitation of liability' },
          {
            type: 'p',
            text: 'fitlo is provided “as is.” To the extent permitted by law, we are not liable for indirect damages, loss of data, or losses arising from use or interruption of the service.',
          },
          { type: 'h2', text: 'Suspension and termination' },
          {
            type: 'p',
            text: 'We may limit or suspend access to an account that violates these terms. You may also delete your account at any time.',
          },
          { type: 'h2', text: 'Changes' },
          {
            type: 'p',
            text: 'We may update these terms. The new version is published on this page with an updated date, and continued use means you accept it.',
          },
          { type: 'h2', text: 'Governing law' },
          {
            type: 'p',
            text: 'These terms are governed by the laws of the Islamic Republic of Iran.',
          },
          { type: 'h2', text: 'Contact' },
          {
            type: 'p',
            text: `For any question about these terms, contact us at ${CONTACT_EMAIL}.`,
          },
        ],
      },
    },
  },
};

export function getLegalDoc(slug: LegalSlug): LegalDoc {
  return LEGAL_DOCS[slug];
}
