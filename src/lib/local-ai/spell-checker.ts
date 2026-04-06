/** 
 * Simple Levenshtein distance for fuzzy matching
 */
function getLevenshteinDistance(a: string, b: string): number {
  const tmp = [];
  for (let i = 0; i <= a.length; i++) tmp[i] = [i];
  for (let j = 0; j <= b.length; j++) tmp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      tmp[i][j] = Math.min(
        tmp[i - 1][j] + 1,
        tmp[i][j - 1] + 1,
        tmp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
  }
  return tmp[a.length][b.length];
}

const COMMON_CORRECTIONS: Record<string, string> = {
  'textt': 'text',
  'txt': 'text',
  'sennd': 'send',
  'messge': 'message',
  'massage': 'message',
  'msg': 'message',
  'leed': 'lead',
  'led': 'lead',
  'tassk': 'task',
  'statas': 'status',
  'staus': 'status',
  'creeat': 'create',
  'reemove': 'remove',
  'delte': 'delete',
  'deleet': 'delete',
  'updte': 'update',
  'updt': 'update',
  'remindr': 'reminder',
  'remmind': 'remind',
  'calender': 'calendar'
};

export function spellCheck(input: string): string {
  const words = input.split(/\s+/);
  const corrected = words.map(word => {
    const lower = word.toLowerCase();
    
    // Exact match in dictionary
    if (COMMON_CORRECTIONS[lower]) return COMMON_CORRECTIONS[lower];
    
    // Fuzzy match in dictionary
    for (const [wrong, right] of Object.entries(COMMON_CORRECTIONS)) {
      if (getLevenshteinDistance(lower, wrong) <= 1) {
        return right;
      }
    }
    
    return word;
  });
  
  return corrected.join(' ');
}
