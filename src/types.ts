export type ChallengeCategory = 'Linux' | 'Web Security' | 'Cryptography' | 'OSINT' | 'Digital Forensics' | 'Networking' | 'Reverse Engineering' | 'Misc' | 'Logic' | 'Security Awareness' | 'Multi-Stage';
export type ChallengeDifficulty = 'Easy' | 'Medium' | 'Hard' | 'Expert';

export interface Challenge {
  id: string;
  title: string;
  category: ChallengeCategory;
  difficulty: ChallengeDifficulty;
  points: number;
  description: string;
  attachmentUrl?: string;
  attachmentName?: string;
  hint?: string;
  hintReleased?: boolean;
  hintPenalty?: number; // Points deducted when hint is used
  solution?: string;    // Step-by-step solution (visible to admin only)
  flag: string;
  firstBloodTeam?: string;
}

export interface Team {
  id: string;
  name: string;
  leader: string;
  email: string;
  points: number;
  solvedChallenges: string[]; // Challenge IDs
  usedHints: string[];        // Challenge IDs where hint was used (for penalty tracking)
  badges: string[];
  lastSubmissionTime?: string;
}

export interface SubmissionLog {
  id: string;
  teamId: string;
  teamName: string;
  challengeId: string;
  challengeTitle: string;
  points: number;
  submittedAt: string;
  isFirstBlood: boolean;
  hintUsed?: boolean;
}

export interface CTFStats {
  totalTeams: number;
  totalChallenges: number;
  prizePool: string;
  eventEndTimestamp: string; // ISO String
}
