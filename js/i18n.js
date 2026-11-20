// i18n for an Abood family game. Arabic (Emirati tone) is the default; English is one tap away on the flag pills.
// Rules the whole family follows:
//   - Every key exists in both languages. A key + 'G' is Mozah's version (feminine Arabic / her name in English);
//     T() prefers it while Mozah is playing, so you never branch on gender in game code.
//   - Numbers use Western digits in both languages (nf), so a screen never mixes two digit systems.
//   - The language key 'abood-lang' is shared by every Abood game on purpose: a choice made in one carries to the others.
//   - Strings may be functions (take arguments) or arrays (TL picks a random line, never the same twice in a row).
import { UI_AR, UI_EN } from './i18n/strings.js';
import { FACTS_AR, FACTS_EN } from './i18n/facts.js';
// an isolate, so a number or a code keeps its own direction inside Arabic text
export const iso = s => '\u2068' + s + '\u2069';
export const nf = n => (typeof n === 'string' && n[0] === '+') ? '+' + nf(n.slice(1)) : Number(n).toLocaleString('en-US');

export const STR = {
  ar: {
    title: 'عبود الصقّار', titleG: 'عبود الصقّار',
    kicker: 'يلا، جاهز؟', kickerG: 'يلا، جاهزة؟',
    story: 'الشتا وصل والموسم بدا. بابا عطى عبود أول صقر له، حرّ صغير، وقال: الصقر أمانة يا ولدي.',
    coins: n => `${nf(n)} د.إ`, sec: 'ث',
    b_play: 'يلا نلعب!', b_again: 'مرة ثانية', b_menu: 'القائمة', b_close: 'إغلاق', b_resume: 'كمّل', b_replay: 'من جديد', b_ok: 'تمام',
    b_wardrobe: 'الخزانة', b_shop: 'المحل', b_missions: 'المهمات', b_badges: 'الأوسمة', b_help: 'طريقة اللعب',
    m_levels: 'المراحل', m_locked: 'مقفل', m_best: n => `الأفضل ${nf(n)}`,
    h_score: 'النقاط', a_pause: 'إيقاف مؤقت', a_sound: 'الصوت', a_fullscreen: 'ملء الشاشة',
    pa_title: 'إيقاف مؤقت', pa_hint: 'اضغط «كمّل» أو P عشان ترجع',
    r_win: 'عفية يا عبود!', r_winG: 'عفية يا موزة!', r_lose: 'ما عليه، جرّب مرة ثانية', r_newBest: 'رقم جديد!',
    r_score: 'النقاط', r_best: 'الأفضل', r_picked: 'جمعت', r_swap: 'الدراهم',
    r_part_score: n => `النقاط ${nf(n)}`, r_part_mult: m => `× ${m}`,
    q_win: ['شفت؟ قلت لك تقدر!', 'عفية! بابا فخور فيك', 'هذا ولد الإمارات!'], q_winG: ['شفتي؟ قلت لج تقدرين!', 'عفية! بابا فخور فيج', 'هذي بنت الإمارات!'],
    q_lose: ['ما عليه، المرة الياية أحسن', 'يلا من جديد، أنا وياك', 'الحلاوة ما تطير، جرّب بعد'], q_loseG: ['ما عليه، المرة الياية أحسن', 'يلا من جديد، أنا وياج', 'الحلاوة ما تطير، جرّبي بعد'],
    menu_say: ['يلا نلعب شوي؟', 'اليوم يومك!', 'ما تنسى تشرب ماي'], menu_sayG: ['يلا نلعب شوي؟', 'اليوم يومج!', 'ما تنسين تشربين ماي'],
    w_title: 'الخزانة', w_char: 'مع منو تلعب؟', ch_abood: 'عبود', ch_mozah: 'موزة', w_pick: 'العب فيه', w_pickG: 'العب فيها', w_playing: 'تلعب فيه', w_playingG: 'تلعب فيها',
    shopTitle: 'المحل', shopNote: 'دراهم داخل اللعبة فقط، للتجربة. ما في دفع حقيقي.', buy: n => `اشتر · ${nf(n)} د.إ`, bought: 'تم الشراء!', notEnough: 'ما عندك دراهم كفاية',
    ms_title: 'المهمات', ms_daily: 'مهمات اليوم', ms_note: 'تتجدد كل يوم. استلم جوايزها من هني.', claim: 'استلم', claimed: 'تم',
    bg_title: 'الأوسمة', bg_locked: 'مقفل', bg_reward: n => `+${nf(n)} د.إ`, tier_0: 'برونزي', tier_1: 'فضي', tier_2: 'ذهبي',
    help_title: 'طريقة اللعب', help_body: 'اسحب عشان تتحرك، واجمع الحلاوة قبل ما تطيح.',
    lg_title: 'هدية اليوم', lg_claim: n => `استلم ${nf(n)} د.إ`,
    rotate: 'لفّ التلفون بالعرض!', rotate_hint: 'اللعبة تحتاج مكان',
    update: 'في نسخة جديدة من اللعبة!', updateBtn: 'حدّث',
    pickTitle: 'اختر اللغة', pickHint: 'تقدر تغيّرها بعدين من الأعلام.',
    ld_fonts: 'نجهّز الخط…', ld_art: 'نرسم عبود…', ld_artG: 'نرسم موزة…', ld_sound: 'نضبط الصوت…', ld_ready: 'جاهزين!',
    tips: ['الدراهم في اللعبة بس، ما في دفع حقيقي.', 'العلم في أعلى القائمة يبدّل اللغة.', 'ثبّت اللعبة على الشاشة وتشتغل بدون نت.'],
    n_abood: 'عبود', n_mozah: 'موزة', n_baba: 'بابا', n_mama: 'ماما', n_nabeeh: 'نبيه', n_usta: 'الأسطى',
    // online:start  (race a friend: keep these words, they are the family's; only mp_rules and mp_faster are per game)
    mp_btn: 'تحدّى ربعك', mp_btnG: 'تحدّي ربعج', mp_kicker: 'تحدّي جديد!', mp_title: 'سباق مع ربعك', mp_titleG: 'سباق مع ربعج',
    mp_host: 'سوّ غرفة', mp_hostG: 'سوّي غرفة', mp_join: 'ادخل غرفة', mp_joinG: 'ادخلي غرفة', mp_leave: 'اطلع', mp_leaveG: 'اطلعي',
    mp_choose: 'سوّ غرفة وعط ربعك الرمز، أو ادخل غرفة ربعك برمزها.', mp_chooseG: 'سوّي غرفة وعطي ربعج الرمز، أو ادخلي غرفة ربعج برمزها.',
    mp_send: 'عط ربعك هالرمز. يكتبه في «ادخل غرفة» من أي مكان.', mp_sendG: 'عطي ربعج هالرمز. تكتبه في «ادخلي غرفة» من أي مكان.',
    mp_hello: 'وصلنا! لحظة…', mp_joined: (n, g) => g ? `${n} دخلت السباق!` : `${n} دخل السباق!`, mp_waitHost: 'ننتظر صاحب الغرفة يبدأ السباق…',
    mp_start: 'يلا نتسابق!', mp_rules: 'نفس الجولة لكم الثنين، بدون معززات ولا فرصة ثانية. اللي يجمع أكثر يفوز!',
    mp_rematch: 'سباق ثاني', mp_hint: 'صاحب الغرفة يبدأ السباق الجاي', mp_vs: 'ضد', mp_go: 'يلا!', mp_me: 'انت', mp_meG: 'انتي',
    mp_wait: (n, g) => g ? `${n} بعدها تلعب…` : `${n} بعده يلعب…`, mp_win: 'فزت!', mp_winG: 'فزتي!', mp_lose: (n, g) => g ? `${n} سبقتك!` : `${n} سبقك!`, mp_loseG: (n, g) => g ? `${n} سبقتج!` : `${n} سبقج!`,
    mp_tie: 'تعادل!', mp_winLeft: 'فزت! ربعك طلع من السباق', mp_winLeftG: 'فزتي! ربعج طلعت من السباق', mp_left: (n, g) => g ? `${n} طلعت من السباق` : `${n} طلع من السباق`,
    mp_oppOut: (n, s) => `خلص سباق ${n}: ${nf(s)}`, mp_faster: 'الوقت يضيق!',
    mp_lost: (n, g) => `انقطع الاتصال مع ${n}. كمل لعب!`, mp_lostG: (n, g) => `انقطع الاتصال مع ${n}. كمّلي لعب!`, mp_lostTag: n => `${n}: ننتظر الاتصال…`,
    mp_back: (n, g) => g ? `${n} رجعت!` : `${n} رجع!`, mp_lostWait: (n, g) => `انقطع اتصال ${n}. ننتظر شوي…`, mp_reconnecting: 'نحاول نرجّع الاتصال…',
    mp_full: 'السباق فيه لاعبين ثنين، ما في مكان.', mp_version: 'عندكم نسختين مختلفتين من اللعبة. حدّثوا اللعبة وجرّبوا.',
    mp_err_badcode: 'الرمز 6 أرقام. تأكد منه.', mp_err_badcodeG: 'الرمز 6 أرقام. تأكدي منه.',
    mp_err_offline: 'ما قدرنا نوصل. تأكد من النت وجرّب مرة ثانية.', mp_err_offlineG: 'ما قدرنا نوصل. تأكدي من النت وجرّبي مرة ثانية.',
    mp_err_noroom: 'ما لقينا غرفة بهالرمز. تأكد منه أو اطلب رمز جديد.', mp_err_noroomG: 'ما لقينا غرفة بهالرمز. تأكدي منه أو اطلبي رمز جديد.',
    mp_err_timeout: 'ما قدرنا نوصل لربعك. بعض الشبكات تمنع اللعب المباشر، جرّبوا واي فاي ثاني.', mp_err_error: 'صار خطأ في الاتصال. جرّبوا مرة ثانية.',
    mp_st_lib: 'نجهّز اللعب أونلاين…', mp_st_make: 'نسوّي غرفتك على خادم السباقات…', mp_st_retry: 'الرمز مستخدم، نختار رمز ثاني…', mp_st_server: 'نتصل بخادم السباقات…', mp_st_peer: 'ندوّر على الغرفة ونوصلك بربعك…', mp_st_peerG: 'ندوّر على الغرفة ونوصلج بربعج…',
    mp_noTap: 'ما يحتاج تضغط مرة ثانية، احنا نكمل.', mp_noTapG: 'ما يحتاج تضغطين مرة ثانية، احنا نكمل.', mp_slow: 'الخادم يصحى من النوم، ممكن ياخذ لين دقيقة. خلك هني وما يحتاج تضغط.', mp_slowG: 'الخادم يصحى من النوم، ممكن ياخذ لين دقيقة. خلج هني وما يحتاج تضغطين.',
    mp_gateLead: 'قبل أول سباق: خل واحد من أهلك يقرا هذا.', mp_gateLeadG: 'قبل أول سباق: خلي وحدة من أهلج تقرا هذا.',
    mp_gateText: 'السباق أونلاين يوصل هالجهاز بجهاز الربع مباشرة. عشان يتصلون، جهاز الربع وخدمة الاتصال (PeerJS و Google) يشوفون عنوان الإنترنت (IP)، واللي ممكن يبين المدينة تقريباً. ما نرسل غير اسم السباق اللي تكتبونه (خلوه لقب، مو الاسم الكامل)، وما نرسل موقع ولا أي شي ثاني، واللعب بروحك يظل بدون نت. العبوا بس مع ناس تعرفونهم.',
    mp_gateQ: (a, b) => `للكبار: كم ${a} × ${b}؟`, mp_gateOk: 'موافق، كمّل', mp_gateWrong: 'الجواب غلط. جرّبوا مرة ثانية.',
    help_privacy: 'الخصوصية: اللعب بروحك كله على جهازك، بدون حساب وبدون نت. «تحدّى ربعك» بس يستخدم النت: يوصل الجهازين مباشرة، وجهاز الربع وخدمة الاتصال يشوفون عنوان الإنترنت (IP). نرسل بس اسم السباق اللي تكتبه ومكانك في السباق.', help_privacyReset: 'اسأل الكبار مرة ثانية قبل السباق',
    mp_name: 'اسمك في السباق', mp_nameG: 'اسمج في السباق', mp_editName: 'غيّر الاسم', mp_namePop: 'اكتب اسمك في السباق', mp_namePopG: 'اكتبي اسمج في السباق', mp_save: 'حفظ', mp_cancel: 'إلغاء',
    mp_nameHintAr: 'حروف عربية بس، من 2 إلى 12. لا أرقام ولا رموز. اكتب لقب، مو اسمك الكامل.', mp_nameHintArG: 'حروف عربية بس، من 2 إلى 12. لا أرقام ولا رموز. اكتبي لقب، مو اسمج الكامل.', mp_nameHintEn: 'English letters only, 2 to 12. No numbers or symbols. Use a nickname, not your full name.',
    mp_nameBadAr: 'الاسم لازم يكون من 2 إلى 12 حرف عربي.', mp_nameBadEn: 'The name needs 2 to 12 English letters.',
    mp_codePop: 'اكتب رمز الغرفة', mp_codePopG: 'اكتبي رمز الغرفة', mp_codeHint: 'الرمز 6 أرقام يعطيك إياه ربعك.', mp_codeHintG: 'الرمز 6 أرقام تعطيج إياه ربيعتج.',
    // online:end
  },
  en: {
    title: 'Abood the Falconer', titleG: 'Abood the Falconer',
    kicker: 'Ready?', story: 'Winter is here and the season has begun. Baba gives Abood his first falcon, a young saker, and says: a falcon is a trust, my son.',
    coins: n => `AED ${nf(n)}`, sec: 's',
    b_play: "Let's play!", b_again: 'Again', b_menu: 'Menu', b_close: 'Close', b_resume: 'Resume', b_replay: 'Restart', b_ok: 'OK',
    b_wardrobe: 'Wardrobe', b_shop: 'Shop', b_missions: 'Missions', b_badges: 'Badges', b_help: 'How to play',
    m_levels: 'Levels', m_locked: 'Locked', m_best: n => `Best ${nf(n)}`,
    h_score: 'Score', a_pause: 'Pause', a_sound: 'Sound', a_fullscreen: 'Full screen',
    pa_title: 'Paused', pa_hint: 'Press Resume or P to carry on',
    r_win: 'Well done, Abood!', r_winG: 'Well done, Mozah!', r_lose: 'Never mind, try again', r_newBest: 'New best!',
    r_score: 'Score', r_best: 'Best', r_picked: 'Picked up', r_swap: 'Dirhams',
    r_part_score: n => `Score ${nf(n)}`, r_part_mult: m => `× ${m}`,
    q_win: ['See? I told you you could!', 'Well done! Baba is proud of you', 'A child of the Emirates!'],
    q_lose: ['Never mind, next time is better', 'Again, I am with you', 'The sweets will wait, try again'],
    menu_say: ['Shall we play a bit?', 'Today is your day!', "Don't forget to drink water"],
    w_title: 'Wardrobe', w_char: 'Who are you playing?', ch_abood: 'Abood', ch_mozah: 'Mozah', w_pick: 'Play as him', w_pickG: 'Play as her', w_playing: 'Playing',
    shopTitle: 'Shop', shopNote: 'In-game dirhams only, for fun. No real payments.', buy: n => `Buy · AED ${nf(n)}`, bought: 'Bought!', notEnough: 'Not enough dirhams',
    ms_title: 'Missions', ms_daily: "Today's missions", ms_note: 'New ones every day. Claim the rewards here.', claim: 'Claim', claimed: 'Done',
    bg_title: 'Badges', bg_locked: 'Locked', bg_reward: n => `+AED ${nf(n)}`, tier_0: 'Bronze', tier_1: 'Silver', tier_2: 'Gold',
    help_title: 'How to play', help_body: 'Drag to move and catch the sweets before they fall.',
    lg_title: "Today's gift", lg_claim: n => `Claim AED ${nf(n)}`,
    rotate: 'Turn your phone sideways!', rotate_hint: 'The game needs the room',
    update: 'A new version of the game is ready!', updateBtn: 'Update',
    pickTitle: 'Choose a language', pickHint: 'You can change it later from the flags.',
    ld_fonts: 'Warming up the font…', ld_art: 'Drawing Abood…', ld_artG: 'Drawing Mozah…', ld_sound: 'Tuning the sound…', ld_ready: 'Ready!',
    tips: ['Dirhams are in-game only. No real payments.', 'The flag at the top switches the language.', 'Install the game to play offline.'],
    n_abood: 'Abood', n_mozah: 'Mozah', n_baba: 'Baba', n_mama: 'Mama', n_nabeeh: 'Nabeeh', n_usta: 'Usta',
    // online:start
    mp_btn: 'Race a friend', mp_kicker: 'New challenge!', mp_title: 'Race a friend',
    mp_host: 'Create room', mp_join: 'Join room', mp_leave: 'Leave',
    mp_choose: "Create a room and tell your friend the code, or join your friend's room with its code.",
    mp_send: "Tell your friend this code. They type it under 'Join room', from any network.",
    mp_hello: 'Connected! One moment…', mp_joined: n => `${n} joined the race!`, mp_waitHost: 'Waiting for the host to start the race…',
    mp_start: "Let's race!", mp_rules: 'The same round for both of you, no boosters and no second chance. The higher score wins!',
    mp_rematch: 'Race again', mp_hint: 'The host starts the next race', mp_vs: 'vs', mp_go: 'Go!', mp_me: 'You',
    mp_wait: n => `${n} is still playing…`, mp_win: 'You win!', mp_lose: n => `${n} wins!`,
    mp_tie: "It's a tie!", mp_winLeft: 'You win! Your friend left the race', mp_left: n => `${n} left the race`,
    mp_oppOut: (n, s) => `${n} finished with ${nf(s)}`, mp_faster: 'Time is running out!',
    mp_lost: n => `Lost the connection to ${n}. Keep playing!`, mp_lostTag: n => `${n}: reconnecting…`,
    mp_back: n => `${n} is back!`, mp_lostWait: n => `${n} dropped out. Waiting a moment…`, mp_reconnecting: 'Trying to reconnect…',
    mp_full: 'This race already has two players.', mp_version: 'You have two different versions of the game. Reload it and try again.',
    mp_err_badcode: 'The code has 6 numbers. Check it and try again.',
    mp_err_offline: "Couldn't connect. Check the internet and try again.",
    mp_err_noroom: 'No room has this code. Check it or ask for a new one.',
    mp_err_timeout: "Couldn't reach your friend. Some networks block direct play; try another Wi-Fi.", mp_err_error: 'Something went wrong with the connection. Try again.',
    mp_st_lib: 'Getting online play ready…', mp_st_make: 'Creating your room on the race server…', mp_st_retry: 'That code is taken, picking another…', mp_st_server: 'Connecting to the race server…', mp_st_peer: 'Finding the room and connecting you…',
    mp_noTap: "No need to tap again, we're on it.", mp_slow: 'The server is waking up; this can take up to a minute. Stay here, no need to tap again.',
    mp_gateLead: 'Before your first race: ask a grown-up to read this.',
    mp_gateText: "Online races connect this device directly to your friend's. To connect, the friend's device and the connection services (PeerJS and Google) see this device's internet (IP) address, which can show roughly which city you are in. We send only the race name you type (make it a nickname, not a full name), never a location or anything else, and playing on your own stays offline. Only race people you know.",
    mp_gateQ: (a, b) => `For grown-ups: what is ${a} × ${b}?`, mp_gateOk: 'Agree and continue', mp_gateWrong: "That's not right. Try again.",
    help_privacy: "Privacy: playing on your own stays on this device, with no account and no internet. Only 'Race a friend' goes online: it connects the two devices directly, and the friend's device and the connection services see this device's internet (IP) address. The game sends only the race name you type and your place in the race.", help_privacyReset: 'Ask a grown-up again before racing',
    mp_name: 'Your race name', mp_editName: 'Change name', mp_namePop: 'Type your race name', mp_save: 'Save', mp_cancel: 'Cancel',
    mp_nameHintAr: 'Arabic letters only, 2 to 12. No numbers or symbols. Use a nickname, not your full name.', mp_nameHintEn: 'English letters only, 2 to 12. No numbers or symbols. Use a nickname, not your full name.',
    mp_nameBadAr: 'The name needs 2 to 12 Arabic letters.', mp_nameBadEn: 'The name needs 2 to 12 English letters.',
    mp_codePop: 'Type the room code', mp_codeHint: 'The 6-digit code from your friend.',
    // online:end
  },
};

Object.assign(STR.ar, UI_AR, FACTS_AR); Object.assign(STR.en, UI_EN, FACTS_EN);

export const FLAG = {
  en: '<svg viewBox="0 0 60 30" aria-hidden="true"><clipPath id="ukS"><path d="M0,0v30h60V0z"/></clipPath><clipPath id="ukT"><path d="M30,15h30v15zv15H0zH0V0zV0h30z"/></clipPath><g clip-path="url(#ukS)"><path d="M0,0v30h60V0z" fill="#012169"/><path d="M0,0L60,30M60,0L0,30" stroke="#fff" stroke-width="6"/><path d="M0,0L60,30M60,0L0,30" clip-path="url(#ukT)" stroke="#C8102E" stroke-width="4"/><path d="M30,0v30M0,15h60" stroke="#fff" stroke-width="10"/><path d="M30,0v30M0,15h60" stroke="#C8102E" stroke-width="6"/></g></svg>',
  ar: '<svg viewBox="0 0 12 6" aria-hidden="true"><rect width="12" height="2" fill="#00732f"/><rect y="2" width="12" height="2" fill="#fff"/><rect y="4" width="12" height="2" fill="#000"/><rect width="3" height="6" fill="#ff0000"/></svg>',
};

const LANG_KEY = 'abood-lang';
const stored = () => { try { const v = localStorage.getItem(LANG_KEY); return v === 'ar' || v === 'en' ? v : null; } catch (e) { return null; } };
let cur = stored() || 'ar', girl = false;
const listeners = [], lastLine = {};
export const lang = () => cur;
export const dir = () => cur === 'ar' ? 'rtl' : 'ltr';
export const hasPickedLang = () => !!stored();
export function setGirl(b) { girl = !!b; }
export const isGirl = () => girl;
export function onLang(fn) { listeners.push(fn); }
const look = key => (girl ? STR[cur][key + 'G'] : undefined) ?? STR[cur][key] ?? (girl ? STR.en[key + 'G'] : undefined) ?? STR.en[key];
export function T(key, ...args) { const v = look(key) ?? key; return typeof v === 'function' ? v(...args) : v; }
export function TL(key) {
  const v = look(key);
  if (!Array.isArray(v)) return typeof v === 'function' ? v() : (v ?? key);
  if (v.length < 2) return v[0] ?? '';
  const mk = key + (girl ? 'G' : ''); let i = Math.floor(Math.random() * v.length);
  if (i === lastLine[mk]) i = (i + 1 + Math.floor(Math.random() * (v.length - 1))) % v.length;
  lastLine[mk] = i; return v[i];
}
export function applyI18n(root = document) {
  const html = document.documentElement; html.lang = cur; html.dir = dir();
  if (root === document) document.title = T('title');
  root.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = T(el.dataset.i18n); });
  root.querySelectorAll('[data-i18n-aria]').forEach(el => { el.setAttribute('aria-label', T(el.dataset.i18nAria)); });
  root.querySelectorAll('.lang').forEach(g => {
    g.innerHTML = ['ar', 'en'].map(l => `<button type="button" data-lang="${l}" class="${l === cur ? 'on' : ''}" aria-pressed="${l === cur}" aria-label="${l === 'ar' ? 'العربية' : 'English'}">${FLAG[l]}</button>`).join('');
    g.querySelectorAll('button').forEach(b => { b.onclick = () => setLang(b.dataset.lang); });
  });
  const fa = document.getElementById('flagAr'), fe = document.getElementById('flagEn');
  if (fa && !fa.firstChild) fa.innerHTML = FLAG.ar; if (fe && !fe.firstChild) fe.innerHTML = FLAG.en;
}
export function setLang(l) {
  if (l !== 'ar' && l !== 'en') return;
  cur = l; try { localStorage.setItem(LANG_KEY, l); } catch (e) {}
  applyI18n(); listeners.forEach(fn => { try { fn(cur); } catch (e) {} });
  window.dispatchEvent(new CustomEvent('langchange', { detail: { lang: cur } }));
}
