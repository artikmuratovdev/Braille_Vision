export const BRAILLE_MAP: Record<string, string> = {
  // Latin lowercase
  'a': '⠁', 'b': '⠃', 'c': '⠉', 'd': '⠙', 'e': '⠑', 'f': '⠋', 'g': '⠛', 'h': '⠓', 'i': '⠊', 'j': '⠚',
  'k': '⠅', 'l': '⠇', 'm': '⠍', 'n': '⠝', 'o': '⠕', 'p': '⠏', 'q': '⠟', 'r': '⠗', 's': '⠎', 't': '⠞',
  'u': '⠥', 'v': '⠧', 'w': '⠺', 'x': '⠭', 'y': '⠽', 'z': '⠵',
  // Digits
  '0': '⠚', '1': '⠁', '2': '⠃', '3': '⠉', '4': '⠙', '5': '⠑', '6': '⠋', '7': '⠛', '8': '⠓', '9': '⠊',
  // Punctuation
  ' ': '⠀', ',': '⠂', '.': '⠲', '!': '⠖', '?': '⠦', ':': '⠒', ';': '⠆', '-': '⠤', '\'': '⠄', '"': '⠐⠂',
  // Cyrillic
  'а': '⠁', 'б': '⠃', 'в': '⠧', 'г': '⠛', 'д': '⠙', 'е': '⠑', 'ё': '⠑', 'ж': '⠚', 'з': '⠵', 'и': '⠊',
  'й': '⠚', 'к': '⠅', 'л': '⠇', 'м': '⠍', 'н': '⠝', 'о': '⠕', 'п': '⠏', 'р': '⠗', 'с': '⠎', 'т': '⠞',
  'у': '⠥', 'ф': '⠋', 'х': '⠭', 'ц': '⠉', 'ч': '⠡', 'ш': '⠩', 'щ': '⠩', 'ъ': '⠤', 'ы': '⠽', 'ь': '⠂',
  'э': '⠑', 'ю': '⠚', 'я': '⠽',
  '\n': '\n'
};

export function textToBraille(text: string): string {
  if (!text) return '';
  const lower = text.toLowerCase();
  let result = '';
  for (let i = 0; i < lower.length; i++) {
    const char = lower[i];
    if (char === '"') {
      result += BRAILLE_MAP['"'];
    } else {
      result += BRAILLE_MAP[char] || '⠿';
    }
  }
  return result;
}

export function brailleToOriginalMap(text: string): Array<{braille: string, original: string}> {
  if (!text) return [];
  const lower = text.toLowerCase();
  const result = [];
  for (let i = 0; i < lower.length; i++) {
    const char = lower[i];
    if (char === '"') {
      result.push({ braille: '⠐', original: '"' });
      result.push({ braille: '⠂', original: '"' });
    } else {
      result.push({ braille: BRAILLE_MAP[char] || '⠿', original: char });
    }
  }
  return result;
}
