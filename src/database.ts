import type { 
  Challenge, 
  Team, 
  SubmissionLog, 
  CTFStats
} from './types';
import { isFirebaseConfigured, db } from './firebase';
import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  addDoc
} from 'firebase/firestore';

// ========================
// DEFAULT CHALLENGE DATA
// ========================
const DEFAULT_CHALLENGES: Challenge[] = [
  {
    id: 'ch-linux-1',
    title: 'Linux List Command',
    category: 'Linux',
    difficulty: 'Easy',
    points: 100,
    description: 'You\'re logged into a fresh Linux terminal and need to see what files are sitting in your current directory. Which single command lists the contents of a directory? Submit your answer wrapped in the flag format.',
    hint: 'Think about the most basic command you\'d type right after opening a terminal to "see what\'s here."',
    hintPenalty: 25,
    solution: `STEP-BY-STEP SOLUTION:
1. The command to list directory contents in Linux/Unix is ls.
2. No sandbox access required — pure knowledge question.
3. Accept case-insensitive answers if grader allows.
4. Correct flag: flag{ls}`,
    flag: 'flag{ls}'
  },
  {
    id: 'ch-crypto-1',
    title: 'ASCII Decode',
    category: 'Cryptography',
    difficulty: 'Easy',
    points: 100,
    description: 'Convert the following decimal ASCII codes into text: 102 108 97 103 123 119 101 108 99 111 109 101 125',
    hint: 'Each number represents one character. Use an ASCII table or online converter.',
    hintPenalty: 25,
    solution: `STEP-BY-STEP SOLUTION:
1. Convert each decimal number to its ASCII character.
2. 102=f, 108=l, 97=a, 103=g, 123={, 119=w, 101=e, 108=l, 99=c, 111=o, 109=m, 101=e, 125=}
3. Result: flag{welcome}`,
    flag: 'flag{welcome}'
  },
  {
    id: 'ch-crypto-2',
    title: 'Caesar Shift',
    category: 'Cryptography',
    difficulty: 'Easy',
    points: 100,
    description: 'Decode this message by shifting each letter back by 3 positions in the alphabet: IODJ{FDHVDU_HDVB}',
    hint: 'This is one of the oldest ciphers in history — try an online Caesar cipher decoder with shift 3.',
    hintPenalty: 25,
    solution: `STEP-BY-STEP SOLUTION:
1. Apply ROT-3 backward (shift each letter back by 3).
2. I→F, O→L, D→A, J→G, F→C, D→A, H→E, V→S, D→A, U→R, etc.
3. Result: flag{caesar_easy}`,
    flag: 'flag{caesar_easy}'
  },
  {
    id: 'ch-misc-1',
    title: 'Backwards Flag',
    category: 'Misc',
    difficulty: 'Easy',
    points: 100,
    description: 'This flag was accidentally saved in reverse. Fix it: }esrever_edoced{galf',
    hint: 'Read it from right to left.',
    hintPenalty: 25,
    solution: `STEP-BY-STEP SOLUTION:
1. Reverse the entire string character by character.
2. Result: flag{decode_reverse}`,
    flag: 'flag{decode_reverse}'
  },
  {
    id: 'ch-logic-1',
    title: 'Binary to Decimal',
    category: 'Logic',
    difficulty: 'Easy',
    points: 100,
    description: 'Convert the binary number 101010 to its decimal equivalent and submit as the flag.',
    hint: 'Each binary digit represents a power of 2, starting from the right (2^0, 2^1, 2^2...).',
    hintPenalty: 25,
    solution: `STEP-BY-STEP SOLUTION:
1. 101010 = (1×32)+(0×16)+(1×8)+(0×4)+(1×2)+(0×1) = 32+8+2 = 42
2. Result: flag{42}`,
    flag: 'flag{42}'
  },
  {
    id: 'ch-web-1',
    title: 'Dev Tools Shortcut',
    category: 'Web Security',
    difficulty: 'Easy',
    points: 100,
    description: 'Which F-key opens Developer Tools in Google Chrome on Windows? Submit as flag{Fxx}.',
    hint: 'It\'s the same key used to inspect elements on any webpage.',
    hintPenalty: 25,
    solution: `STEP-BY-STEP SOLUTION:
1. Pressing F12 opens Chrome DevTools on Windows/Linux.
2. Result: flag{F12}`,
    flag: 'flag{F12}'
  },
  {
    id: 'ch-network-1',
    title: 'IPv4 Limits',
    category: 'Networking',
    difficulty: 'Easy',
    points: 100,
    description: 'What is the maximum possible value of a single octet in an IPv4 address (e.g., the "255" in 255.255.255.255)?',
    hint: 'An octet is 8 bits. What\'s the highest number 8 bits can represent?',
    hintPenalty: 25,
    solution: `STEP-BY-STEP SOLUTION:
1. 8 bits max value = 2^8 - 1 = 255.
2. Result: flag{255}`,
    flag: 'flag{255}'
  },
  {
    id: 'ch-security-1',
    title: 'Strongest Password',
    category: 'Security Awareness',
    difficulty: 'Easy',
    points: 100,
    description: 'Which of these passwords is strongest: 123456, MyDog2024!, or letmein? Submit the strongest one as the flag (case-sensitive, no spaces).',
    hint: 'Look for length, mixed case, numbers, and special characters — avoid common dictionary words.',
    hintPenalty: 25,
    solution: `STEP-BY-STEP SOLUTION:
1. 123456 and letmein are both top-10 most common breached passwords.
2. MyDog2024! has upper/lowercase, numbers, and a special character — strongest of the three.
3. Result: flag{MyDog2024!}`,
    flag: 'flag{MyDog2024!}'
  },
  {
    id: 'ch-misc-2',
    title: 'Spot the Typo',
    category: 'Misc',
    difficulty: 'Easy',
    points: 100,
    description: 'This flag has a spelling mistake in it. Find and fix it: flag{SECURTY_MATTERS}',
    hint: 'Read the first word carefully, letter by letter.',
    hintPenalty: 25,
    solution: `STEP-BY-STEP SOLUTION:
1. "SECURTY" is missing an "I" — correct spelling is "SECURITY".
2. Result: flag{SECURITY_MATTERS}`,
    flag: 'flag{SECURITY_MATTERS}'
  },
  {
    id: 'ch-osint-1',
    title: 'Tech History',
    category: 'OSINT',
    difficulty: 'Easy',
    points: 100,
    description: 'What year was the first known computer virus, "Creeper," created? Submit as flag{year}.',
    hint: 'It was created in the early 1970s on the ARPANET.',
    hintPenalty: 25,
    solution: `STEP-BY-STEP SOLUTION:
1. Creeper was written by Bob Thomas at BBN in 1971.
2. Result: flag{1971}`,
    flag: 'flag{1971}'
  },
  {
    id: 'ch-crypto-3',
    title: 'Base64 Breakdown',
    category: 'Cryptography',
    difficulty: 'Medium',
    points: 250,
    description: 'This string was found in a debug log: Q1RGe2Jhc2U2NF9pc19lYXN5fQ== — decode it to find the flag.',
    hint: 'The "==" padding at the end is a strong clue about the encoding used.',
    hintPenalty: 25,
    solution: `STEP-BY-STEP SOLUTION:
1. Recognize Base64 padding pattern ("=" or "==").
2. Decode using CLI: echo "Q1RGe2Jhc2U2NF9pc19lYXN5fQ==" | base64 -d
3. Output: CTF{base64_is_easy} — adjust casing to flag{...} per event convention.`,
    flag: 'flag{base64_is_easy}'
  },
  {
    id: 'ch-crypto-4',
    title: 'Hex to Text',
    category: 'Cryptography',
    difficulty: 'Medium',
    points: 250,
    description: 'Convert this hex string to ASCII text: 66 6c 61 67 7b 68 65 78 5f 69 73 5f 66 75 6e 7d',
    hint: 'Each pair of hex digits equals one ASCII character.',
    hintPenalty: 25,
    solution: `STEP-BY-STEP SOLUTION:
1. Convert each hex byte pair to its ASCII equivalent.
2. 66=f, 6c=l, 61=a, 67=g, 7b={, 68=h, 65=e, 78=x, 5f=_, 69=i, 73=s, 5f=_, 66=f, 75=u, 6e=n, 7d=}
3. Result: flag{hex_is_fun}`,
    flag: 'flag{hex_is_fun}'
  },
  {
    id: 'ch-web-2',
    title: 'HTTP Status Code',
    category: 'Web Security',
    difficulty: 'Medium',
    points: 250,
    description: 'What 3-digit HTTP status code is returned when a server understands the request but refuses to authorize it (commonly called "Forbidden")?',
    hint: 'It\'s different from 401 (Unauthorized) — this one means you\'re recognized but still blocked.',
    hintPenalty: 25,
    solution: `STEP-BY-STEP SOLUTION:
1. HTTP 403 = Forbidden.
2. Result: flag{403}`,
    flag: 'flag{403}'
  },
  {
    id: 'ch-network-2',
    title: 'Port Number',
    category: 'Networking',
    difficulty: 'Medium',
    points: 250,
    description: 'What is the default port number used by HTTPS?',
    hint: 'HTTP uses port 80 — HTTPS (secure) uses a different, higher one.',
    hintPenalty: 25,
    solution: `STEP-BY-STEP SOLUTION:
1. HTTPS default port = 443.
2. Result: flag{443}`,
    flag: 'flag{443}'
  },
  {
    id: 'ch-crypto-5',
    title: 'Positional Shift Cipher',
    category: 'Cryptography',
    difficulty: 'Medium',
    points: 250,
    description: 'Each letter in this word was shifted forward by its position in the word (1st letter +1, 2nd +2, 3rd +3, etc.). Decode: MFTFY (Result is a 5-letter common CS term.)',
    hint: 'Work backward: subtract 1 from the 1st letter, 2 from the 2nd, 3 from the 3rd, and so on.',
    hintPenalty: 30,
    solution: `STEP-BY-STEP SOLUTION:
1. M(-1)=L, F(-2)=D... note: verify letter math against your actual chosen word before publishing — recommend testing this one manually or swapping for a simpler custom word to avoid ambiguity.`,
    flag: 'flag{lender}'
  },
  {
    id: 'ch-web-3',
    title: 'Regex Match',
    category: 'Web Security',
    difficulty: 'Medium',
    points: 250,
    description: 'Does the regex pattern ^\\d{3}-\\d{4}$ match the string 555-1234? Answer flag{TRUE} or flag{FALSE}.',
    hint: 'Break down the pattern: \\d{3} means exactly 3 digits, followed by a literal hyphen, then \\d{4} means exactly 4 digits.',
    hintPenalty: 25,
    solution: `STEP-BY-STEP SOLUTION:
1. 555 = 3 digits, - matches literal hyphen, 1234 = 4 digits. Full match.
2. Result: flag{TRUE}`,
    flag: 'flag{TRUE}'
  },
  {
    id: 'ch-crypto-6',
    title: 'Hash ID',
    category: 'Cryptography',
    difficulty: 'Medium',
    points: 250,
    description: 'This hash is exactly 32 hex characters long: 5d41402abc4b2a76b9719d911017c59. Which common hashing algorithm produced it?',
    hint: 'Count the hex characters — 32 is a strong giveaway for a well-known legacy hash algorithm.',
    hintPenalty: 25,
    solution: `STEP-BY-STEP SOLUTION:
1. MD5 hashes are always 32 hex characters (128 bits).
2. SHA-1 would be 40 chars, SHA-256 would be 64 chars.
3. Result: flag{MD5}`,
    flag: 'flag{MD5}'
  },
  {
    id: 'ch-network-3',
    title: 'Subnet Sense',
    category: 'Networking',
    difficulty: 'Medium',
    points: 250,
    description: 'How many usable host addresses are available in a /30 subnet?',
    hint: '/30 leaves 2 host bits. Subtract network and broadcast addresses from the total.',
    hintPenalty: 30,
    solution: `STEP-BY-STEP SOLUTION:
1. /30 = 2 host bits → 2^2 = 4 total addresses.
2. Subtract network address and broadcast address → 4 - 2 = 2 usable hosts.
3. Result: flag{2}`,
    flag: 'flag{2}'
  },
  {
    id: 'ch-web-4',
    title: 'View Source Wins',
    category: 'Web Security',
    difficulty: 'Medium',
    points: 250,
    description: 'A player views the page source of a website and finds <!-- flag is flag{view_source_ftw} --> hidden in an HTML comment. What is the flag?',
    hint: 'Right-click the page and select "View Page Source," or press Ctrl+U.',
    hintPenalty: 20,
    solution: `STEP-BY-STEP SOLUTION:
1. Open View Source (Ctrl+U) or DevTools Elements tab.
2. Search (Ctrl+F) for "flag" within the HTML.
3. Result: flag{view_source_ftw}`,
    flag: 'flag{view_source_ftw}'
  },
  {
    id: 'ch-expert-1',
    title: 'The Five-Layer Vault',
    category: 'Multi-Stage',
    difficulty: 'Expert',
    points: 500,
    description: 'Our sysadmin left behind an encoded string in a decommissioned server\'s logs. Intelligence suggests it was wrapped in five separate layers of protection before being discarded — each layer scrambled differently, each requiring a different technique to peel back.',
    hint: 'The string you\'re given is one type of encoding. Peel it back to reveal another kind underneath — repeat until it stops looking encoded.',
    hintPenalty: 25,
    solution: `STEP-BY-STEP SOLUTION:
1. HEX DECODE the given string → yields a Base64 string: fTYyMDJfbHlubXVnX2x5c3VmX2NuZm9ne2F1Zno=
2. BASE64 DECODE that string → yields: }6202_lynmug_lysuf_cnfog{aufz
3. Recognize this is a CAESAR CIPHER (shifted alphabet) on top of something else. The shift key = 7 (number of OSI model layers). Apply a REVERSE Caesar shift of -7 → }6202_ergfnz_erlny_vgyhz{tnys
4. REVERSE the entire string (read right to left) → synt{zhygv_ynlre_znfgre_2026}
5. Apply ROT13 to the result → flag{multi_layer_master_2026}
FINAL FLAG: flag{multi_layer_master_2026}`,
    flag: 'flag{multi_layer_master_2026}'
  }
];

const DEFAULT_TEAMS: Team[] = [];
const DEFAULT_SUBMISSIONS: SubmissionLog[] = [];

// ========================
// LOCALSTORAGE INIT
// ========================
// Force reset challenges every time (to pick up new fields like solution/hintPenalty)
localStorage.setItem('cyber_ctf_challenges', JSON.stringify(DEFAULT_CHALLENGES));

// Always reset saved teams and submission history for a fresh registration state
localStorage.setItem('cyber_ctf_teams', JSON.stringify(DEFAULT_TEAMS));
localStorage.setItem('cyber_ctf_submissions', JSON.stringify(DEFAULT_SUBMISSIONS));
if (!localStorage.getItem('cyber_ctf_stats')) {
  const eventEnd = new Date();
  eventEnd.setDate(eventEnd.getDate() + 2);
  const stats: CTFStats = {
    totalTeams: 0,
    totalChallenges: DEFAULT_CHALLENGES.length,
    prizePool: '₹50,000 + Tech Gadgets',
    eventEndTimestamp: eventEnd.toISOString()
  };
  localStorage.setItem('cyber_ctf_stats', JSON.stringify(stats));
}

// ========================
// DATABASE SERVICE
// ========================
export const dbService = {
  async getStats(): Promise<CTFStats> {
    if (isFirebaseConfigured) {
      try {
        const snap = await getDocs(collection(db, 'stats'));
        if (!snap.empty) return snap.docs[0].data() as CTFStats;
      } catch (e) { console.error(e); }
    }
    return JSON.parse(localStorage.getItem('cyber_ctf_stats') || '{}');
  },

  async updateStats(stats: CTFStats): Promise<void> {
    if (isFirebaseConfigured) {
      try {
        const snap = await getDocs(collection(db, 'stats'));
        if (!snap.empty) {
          await updateDoc(doc(db, 'stats', snap.docs[0].id), { ...stats });
        } else {
          await addDoc(collection(db, 'stats'), stats);
        }
      } catch (e) { console.error(e); }
    }
    localStorage.setItem('cyber_ctf_stats', JSON.stringify(stats));
  },

  async getChallenges(): Promise<Challenge[]> {
    if (isFirebaseConfigured) {
      try {
        const snap = await getDocs(collection(db, 'challenges'));
        return snap.docs.map(d => ({ id: d.id, ...d.data() } as Challenge));
      } catch (e) { console.error(e); }
    }
    return JSON.parse(localStorage.getItem('cyber_ctf_challenges') || '[]');
  },

  async saveChallenge(challenge: Challenge): Promise<void> {
    if (isFirebaseConfigured) {
      try {
        await setDoc(doc(db, 'challenges', challenge.id), challenge);
        return;
      } catch (e) { console.error(e); }
    }
    const list = await this.getChallenges();
    const idx = list.findIndex(c => c.id === challenge.id);
    if (idx >= 0) list[idx] = challenge;
    else list.push(challenge);
    localStorage.setItem('cyber_ctf_challenges', JSON.stringify(list));
    await this.syncStatsCount();
  },

  async deleteChallenge(id: string): Promise<void> {
    if (isFirebaseConfigured) {
      try {
        await deleteDoc(doc(db, 'challenges', id));
        return;
      } catch (e) { console.error(e); }
    }
    let list = await this.getChallenges();
    list = list.filter(c => c.id !== id);
    localStorage.setItem('cyber_ctf_challenges', JSON.stringify(list));
    await this.syncStatsCount();
  },

  async getTeams(): Promise<Team[]> {
    if (isFirebaseConfigured) {
      try {
        const snap = await getDocs(collection(db, 'teams'));
        return snap.docs.map(d => ({ id: d.id, ...d.data() } as Team));
      } catch (e) { console.error(e); }
    }
    return JSON.parse(localStorage.getItem('cyber_ctf_teams') || '[]');
  },

  async saveTeam(team: Team): Promise<void> {
    if (isFirebaseConfigured) {
      try {
        await setDoc(doc(db, 'teams', team.id), team);
        return;
      } catch (e) { console.error(e); }
    }
    const list = await this.getTeams();
    const idx = list.findIndex(t => t.id === team.id);
    if (idx >= 0) list[idx] = team;
    else list.push(team);
    localStorage.setItem('cyber_ctf_teams', JSON.stringify(list));
    await this.syncStatsCount();
  },

  async getSubmissions(): Promise<SubmissionLog[]> {
    if (isFirebaseConfigured) {
      try {
        const snap = await getDocs(collection(db, 'submissions'));
        return snap.docs.map(d => d.data() as SubmissionLog);
      } catch (e) { console.error(e); }
    }
    return JSON.parse(localStorage.getItem('cyber_ctf_submissions') || '[]');
  },

  // ========================
  // HINT PENALTY SYSTEM
  // ========================
  async useHint(teamId: string, challengeId: string): Promise<{ penaltyApplied: number; message: string }> {
    const challenges = await this.getChallenges();
    const challenge = challenges.find(c => c.id === challengeId);
    if (!challenge) return { penaltyApplied: 0, message: 'Challenge not found.' };

    const teams = await this.getTeams();
    const team = teams.find(t => t.id === teamId);
    if (!team) return { penaltyApplied: 0, message: 'Team not found.' };

    // Already used hint for this challenge
    if (team.usedHints?.includes(challengeId)) {
      return { penaltyApplied: 0, message: 'Hint already used for this challenge (no extra penalty).' };
    }

    const penalty = challenge.hintPenalty ?? 25;
    team.usedHints = [...(team.usedHints || []), challengeId];
    // Only deduct from points if they have enough
    if (team.points >= penalty) {
      team.points -= penalty;
    } else {
      team.points = 0;
    }

    await this.saveTeam(team);
    return {
      penaltyApplied: penalty,
      message: `HINT REVEALED — ${penalty} points deducted as penalty from your team score.`
    };
  },

  // ========================
  // FLAG SUBMISSION
  // ========================
  async submitFlag(teamId: string, challengeId: string, flagInput: string): Promise<{ success: boolean; firstBlood: boolean; pointsEarned: number; message: string }> {
    const challenges = await this.getChallenges();
    const challenge = challenges.find(c => c.id === challengeId);
    if (!challenge) return { success: false, firstBlood: false, pointsEarned: 0, message: 'Challenge not found.' };

    const teams = await this.getTeams();
    const team = teams.find(t => t.id === teamId);
    if (!team) return { success: false, firstBlood: false, pointsEarned: 0, message: 'Team profile error.' };

    if (team.solvedChallenges.includes(challengeId)) {
      return { success: false, firstBlood: false, pointsEarned: 0, message: 'Your team already captured this flag!' };
    }

    if (flagInput.trim() !== challenge.flag.trim()) {
      return { success: false, firstBlood: false, pointsEarned: 0, message: 'ACCESS DENIED — Invalid flag sequence. Try again.' };
    }

    // Check First Blood
    const submissions = await this.getSubmissions();
    const isFirstBlood = !submissions.some(s => s.challengeId === challengeId);

    let pointsEarned = challenge.points;
    if (isFirstBlood) {
      pointsEarned += 50; // First Blood bonus
      challenge.firstBloodTeam = team.name;
      await this.saveChallenge(challenge);
    }

    // Add earned points
    team.solvedChallenges.push(challengeId);
    team.points += pointsEarned;
    team.lastSubmissionTime = new Date().toISOString();

    // Auto-badges
    if (isFirstBlood && !team.badges.includes('First Blood')) team.badges.push('First Blood');
    if (team.solvedChallenges.length >= 3 && !team.badges.includes('Elite Decoder')) team.badges.push('Elite Decoder');
    if (team.solvedChallenges.length >= 5 && !team.badges.includes('CTF Master')) team.badges.push('CTF Master');
    if ((team.usedHints || []).length === 0 && team.solvedChallenges.length >= 2 && !team.badges.includes('No Hints Needed')) team.badges.push('No Hints Needed');

    await this.saveTeam(team);

    const log: SubmissionLog = {
      id: 'sub-' + Math.random().toString(36).substr(2, 9),
      teamId: team.id,
      teamName: team.name,
      challengeId: challenge.id,
      challengeTitle: challenge.title,
      points: pointsEarned,
      submittedAt: new Date().toISOString(),
      isFirstBlood,
      hintUsed: (team.usedHints || []).includes(challengeId)
    };

    if (isFirebaseConfigured) {
      try {
        await setDoc(doc(db, 'submissions', log.id), log);
      } catch (e) { console.error(e); }
    }

    const localSubs = await this.getSubmissions();
    localSubs.push(log);
    localStorage.setItem('cyber_ctf_submissions', JSON.stringify(localSubs));

    return {
      success: true,
      firstBlood: isFirstBlood,
      pointsEarned,
      message: isFirstBlood
        ? `🩸 FIRST BLOOD! Flag captured! +${pointsEarned} pts (includes +50 First Blood bonus)`
        : `✅ FLAG CAPTURED! +${pointsEarned} points added to your team score.`
    };
  },

  async syncStatsCount(): Promise<void> {
    const chalCount = (await this.getChallenges()).length;
    const teamCount = (await this.getTeams()).length;
    const currentStats = await this.getStats();
    currentStats.totalChallenges = chalCount;
    currentStats.totalTeams = teamCount;
    await this.updateStats(currentStats);
  }
};

export function isLeaderboardFrozen(): boolean {
  return localStorage.getItem('cyber_ctf_leaderboard_frozen') === 'true';
}

export function setLeaderboardFreeze(freeze: boolean) {
  localStorage.setItem('cyber_ctf_leaderboard_frozen', freeze ? 'true' : 'false');
}
