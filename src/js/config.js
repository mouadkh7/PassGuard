/* ===============================================
   PassGuard v6.0 - Config & State
   =============================================== */

const APP = {
  name: 'PassGuard',
  version: '6.0.0',
  key: 'pg_v6'
};

const WORDS = [
  'أمان','بيت','سحاب','بحر','نور','قمر','شمس','جبل','وادي','غابة',
  'نهر','وردة','كوكب','نجم','طائر','سمكة','حصان','أسد','فهد','صقر',
  'نخلة','زيتون','تفاح','برتقال','عنب','فراشة','ينبوع','مفتاح','كنز','درع',
  'سيف','قصر','حديقة','جسر','طريق','نافذة','باب','مصباح','قلم','كتاب',
  'دفتر','ساعة','خاتم','تاج','مرآة','سجادة','وسادة','قماش','حرير','ذهب',
  'فضة','نحاس','حديد','خشب','زجاج','بلور','عاج','صوف','حجر','رمل',
  'تراب','هواء','لهب','دخان','ظل','صدى','صوت','لحن','وتر','زهر',
  'بذرة','ثمر','غصن','عرش','سهم','ترس','بيضة','عش','كهف','مغارة',
  'واحة','مرفأ','منارة','ربوة','سهل','مزرعة','حقل','بستان','كرم','نبع',
  'مطر','ثلج','برد','ضباب','غيم','قوس','فجر','شفق'
];

const STATE = {
  key: null,
  mp: null,
  data: [],
  folders: [],
  tab: 'generator',
  genPwd: '',
  pinEnabled: false,
  pinHash: null,
  pinEncryptedMp: null,
  pinSalt: null
};

let _sort = 'date-desc';
let _filter = 'all';
let _folder = '__all';
let _genMode = 'pwd';
let _inactivityTimer = null;

/* DOM Helpers */
const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

const $val = id => document.getElementById(id)?.value || '';
const $set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };

const escapeHtml = s => {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
};

const genId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

const now = () => Date.now();

const daysAgo = ts => {
  if (!ts) return '';
  const d = Math.floor((now() - ts) / 864e5);
  if (d === 0) return 'اليوم';
  if (d === 1) return 'أمس';
  if (d < 7) return `منذ ${d} أيام`;
  if (d < 30) return `منذ ${Math.floor(d / 7)} أسابيع`;
  if (d < 365) return `منذ ${Math.floor(d / 30)} شهر`;
  return `منذ ${Math.floor(d / 365)} سنة`;
};

const show = id => document.getElementById(id)?.classList.remove('hidden');
const hide = id => document.getElementById(id)?.classList.add('hidden');
