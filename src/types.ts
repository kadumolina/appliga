export type PlayerGender = 'M' | 'F';

export type Player = {
  id: string;
  name: string;
  photo?: string;
  phone?: string;
  birthDate?: string;
  gender?: PlayerGender;
  createdAt: number;
};

export type MatchStatus = 'pending' | 'completed';
export type MatchType = 'group' | 'sf1' | 'sf2' | '3rd' | 'final';

export type Match = {
  id: string;
  type: MatchType;
  groupId?: string;
  team1: string[];
  team2: string[];
  score1?: number;
  score2?: number;
  status: MatchStatus;
};

export type TournamentStatus = 'draft' | 'group_stage' | 'playoffs' | 'completed';
export type TournamentModality = 'individual' | 'duplas_fixas' | 'mistas_aleatorias';
export type TournamentCategory = 'masculino' | 'feminino' | 'misto';

export type Tournament = {
  id: string;
  name: string;
  date: number;
  status: TournamentStatus;
  modality?: TournamentModality;
  category?: TournamentCategory;
  participants: string[] | {t1: string, t2: string}[]; // Allow array of players OR array of pairs for fixed duos
  courts?: number;
  groups: Record<string, string[] | {t1: string, t2: string}[]>;
  matches: Match[];
  finalRankings: {
    champion: string[]; // N players
    runnerUp: string[]; // N players
    thirdPlace: string[]; // N players
    fourthPlace: string[]; // N players
    eliminated: string[]; // N players
  };
};

export type AppData = {
  players: Player[];
  tournaments: Tournament[];
};
