import { randomBytes } from './crypto';

const WORDS_AR = [
  'أمان','بيت','سحاب','بحر','نور','قمر','شمس','جبل','وادي','غابة','نهر','وردة','كوكب','نجم','طائر',
  'سمكة','حصان','أسد','فهد','صقر','نخلة','زيتون','تفاح','برتقال','عنب','فراشة','ينبوع','مفتاح','كنز','درع',
  'سيف','قصر','حديقة','جسر','طريق','نافذة','باب','مصباح','قلم','كتاب','دفتر','ساعة','خاتم','تاج','مرآة',
  'حرير','ذهب','فضة','نحاس','حديد','خشب','زجاج','بلور','عاج','صوف','حجر','رمل','تراب','هواء','لهب',
  'دخان','ظل','صدى','صوت','لحن','وتر','زهر','بذرة','ثمر','غصن','عرش','سهم','ترس','بيضة','عش',
  'كهف','مغارة','واحة','مرفأ','منارة','ربوة','سهل','مزرعة','حقل','بستان','كرم','نبع','مطر','ثلج','برد',
  'ضباب','غيم','قوس','فجر','شفق','بدر','وميض','شهاب','كوكب','أثير','غدير','ينبوع','زهرة','نرجس','ياسمين'
];

const WORDS_EN = [
  'apple','autumn','breeze','bridge','butterfly','canyon','castle','cloud','crystal','dawn','desert','diamond',
  'echo','ember','falcon','feather','forest','garden','gemstone','glacier','golden','harbor','horizon','island',
  'ivory','jade','journey','jungle','lighthouse','lotus','meadow','mirror','moonlight','mountain','nebula','ocean',
  'orchid','pacific','palace','pencil','phoenix','planet','quartz','rainbow','reef','river','rocket','ruby',
  'sapphire','saturn','shadow','silence','silver','solar','sparrow','star','storm','summit','sunset','temple',
  'thunder','tiger','tornado','treasure','turtle','valley','velvet','violet','volcano','voyage','waterfall','wave',
  'whisper','wild','winter','wisdom','xenon','yellow','zenith','zephyr','zircon','acacia','blossom','cascade'
];

const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const LOWER = 'abcdefghijklmnopqrstuvwxyz';
const DIGITS = '0123456789';
const SYMBOLS = '!@#$%^&*()_+-=[]{}|;:,.<>?/~';

function rndIndex(max: number): number {
  return randomBytes(4)[0] % max;
}

export function genPassword(length: number, opts: { u: boolean; l: boolean; n: boolean; s: boolean; av: boolean }) {
  let pool = '';
  const reqs: string[] = [];

  if (opts.u) { const s = opts.av ? UPPER.replace(/[IO]/g, '') : UPPER; pool += s; reqs.push(s); }
  if (opts.l) { const s = opts.av ? LOWER.replace(/[l]/g, '') : LOWER; pool += s; reqs.push(s); }
  if (opts.n) { const s = opts.av ? DIGITS.replace(/[01]/g, '') : DIGITS; pool += s; reqs.push(s); }
  if (opts.s) { pool += SYMBOLS; reqs.push(SYMBOLS); }

  if (!pool) return { pw: '', ent: 0 };

  const result: string[] = [];
  reqs.forEach(s => result.push(s[rndIndex(s.length)]));
  for (let i = result.length; i < length; i++) result.push(pool[rndIndex(pool.length)]);

  for (let i = result.length - 1; i > 0; i--) {
    const j = rndIndex(i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }

  return { pw: result.join(''), ent: Math.floor(length * Math.log2(pool.length)) };
}

export function genPhrase(
  wordCount: number,
  separator: string,
  capitalize: boolean,
  addNumber: boolean,
  lang: 'ar' | 'en' = 'en'
) {
  const words = lang === 'ar' ? WORDS_AR : WORDS_EN;
  const result: string[] = [];

  for (let i = 0; i < wordCount; i++) {
    let w = words[rndIndex(words.length)];
    if (capitalize && lang === 'en') w = w.charAt(0).toUpperCase() + w.slice(1);
    if (capitalize && lang === 'ar') w = w.charAt(0).toUpperCase() + w.slice(1);
    result.push(w);
  }

  if (addNumber) result.push(String(rndIndex(1000)));
  return { pw: result.join(separator), ent: Math.floor(wordCount * Math.log2(words.length)) };
}

export function genPin(length: number) {
  let r = '';
  for (let i = 0; i < length; i++) r += rndIndex(10);
  return { pw: r, ent: Math.floor(length * Math.log2(10)) };
}

export function strengthLabel(pw: string) {
  if (!pw) return { sc: 0, lb: '-', hx: '#64748b' };
  let s = 0;
  if (pw.length >= 8) s += 2;
  if (pw.length >= 12) s += 2;
  if (pw.length >= 16) s += 2;
  if (pw.length >= 20) s += 1;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s += 2;
  if (/\d/.test(pw)) s += 1;
  if (/[^A-Za-z0-9]/.test(pw)) s += 2;

  if (s <= 2) return { sc: 20, lb: 'ضعيفة جداً/Very Weak', hx: '#ef4444' };
  if (s <= 4) return { sc: 40, lb: 'ضعيفة/Weak', hx: '#f97316' };
  if (s <= 6) return { sc: 60, lb: 'متوسطة/Fair', hx: '#eab308' };
  if (s <= 8) return { sc: 80, lb: 'قوية/Strong', hx: '#3b82f6' };
  return { sc: 100, lb: 'قوية جداً/Very Strong', hx: '#22c55e' };
}

export function healthAnalysis(pw: string) {
  if (!pw) return { sc: 0, iss: ['empty'] };
  const iss: string[] = [];

  if (pw.length < 8) iss.push('short');
  else if (pw.length < 12) iss.push('could_be_longer');

  if (!/[A-Z]/.test(pw)) iss.push('no_upper');
  if (!/[a-z]/.test(pw)) iss.push('no_lower');
  if (!/\d/.test(pw)) iss.push('no_digit');
  if (!/[^A-Za-z0-9]/.test(pw)) iss.push('no_symbol');

  const common = ['password','123456','qwerty','admin','letmein','welcome',
    'passw0rd','abc123','iloveyou','monkey','dragon','master','pass','1234'];
  if (common.some(c => pw.toLowerCase().includes(c))) iss.push('common_pattern');

  return { sc: Math.max(0, 100 - iss.length * 15), iss };
}
