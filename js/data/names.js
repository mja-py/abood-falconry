// Falcon names. A falcon's name travels in a friend code as its index here, so no free text ever leaves the device.
// APPEND ONLY: never reorder or remove, or old saves and codes would rename their birds.
// The first three belong to Baba's birds.
export const NAMES = [
  ['الدانة', 'Al Dana'], ['عنتر', 'Antar'], ['ظبيان', 'Dhabyan'],
  ['شامخ', 'Shamekh'], ['هيبة', 'Haybah'], ['وضحى', 'Wadha'], ['جسّار', 'Jassar'], ['نجم', 'Najm'], ['رعد', 'Raad'], ['غيمة', 'Ghaimah'],
  ['صخر', 'Sakhr'], ['لمّاح', 'Lammah'], ['ريم', 'Reem'], ['فارس', 'Faris'], ['سرى', 'Sura'], ['مزنة', 'Muznah'], ['طويق', 'Tuwaiq'], ['شهد', 'Shahad'],
  ['عزّام', 'Azzam'], ['نوف', 'Nouf'], ['ذيب', 'Theeb'], ['جود', 'Joud'], ['هتّان', 'Hattan'], ['غلا', 'Ghala'], ['مقدام', 'Miqdam'], ['سما', 'Sama'],
  ['حزام', 'Hizam'], ['وعد', 'Waad'], ['صيّاح', 'Sayyah'], ['نسمة', 'Nasmah'], ['فهد', 'Fahad'], ['دانة', 'Danah'], ['سيف', 'Saif'], ['غزيّل', 'Ghuzayyil'],
  ['همّام', 'Hammam'], ['مها', 'Maha'], ['ثاير', 'Thayer'], ['لولوة', 'Lulwah'], ['جبل', 'Jabal'], ['بشاير', 'Bashayer'],
];
export const NAME_COUNT = NAMES.length;
export const nameOf = (i, lang) => (NAMES[i] || NAMES[3])[lang === 'ar' ? 0 : 1];
