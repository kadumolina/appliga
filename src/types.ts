export type PlayerGender = 'M' | 'F';

export type Player = {
  id: string;
  userId: string;
  name: string;
  photo?: string;
  phone?: string;
  birthDate?: string;
  gender?: PlayerGender;
  email?: string;
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
  setsScore1?: number[] | null;
  setsScore2?: number[] | null;
  status: MatchStatus;
};

export type TournamentStatus = 'draft' | 'group_stage' | 'playoffs' | 'completed';
export type TournamentModality = 'individual' | 'duplas_fixas' | 'mistas_aleatorias' | 'rei_da_quadra' | 'mata_mata';
export type TournamentCategory = 'masculino' | 'feminino' | 'misto';

export type TournamentExpense = {
  id: string;
  category: string;
  amount: number;
  paid: boolean;
  date?: string;
  paymentMethod?: 'Pix' | 'Cartão' | 'Dinheiro' | 'Isento';
};

export type TournamentPayment = {
  playerId: string;
  paid: boolean;
  amount: number;
  date?: string;
  paymentMethod?: 'Pix' | 'Cartão' | 'Dinheiro' | 'Isento';
};

export type Tournament = {
  id: string;
  userId: string;
  name: string;
  date: number;
  status: TournamentStatus;
  modality?: TournamentModality;
  category?: TournamentCategory;
  participants: string[] | {t1: string, t2: string}[]; // Allow array of players OR array of pairs for fixed duos
  courts?: number;
  groups: Record<string, string[] | {t1: string, t2: string}[]>;
  matches: Match[];
  points1?: number;
  points2?: number;
  points3?: number;
  finalRankings: {
    champion: string[]; // N players
    runnerUp: string[]; // N players
    thirdPlace: string[]; // N players
    fourthPlace: string[]; // N players
    eliminated: string[]; // N players
  };
  isPaid?: boolean;
  isRanked?: boolean;
  registrationFee?: number;
  payments?: Record<string, TournamentPayment>;
  expenses?: TournamentExpense[];
  withdrawnPlayers?: string[];
  substitutedPlayers?: Record<string, string>; // map of oldId -> newId
  history?: {
    id: string;
    timestamp: number;
    message: string;
    type: 'withdraw' | 'substitute' | 'reactivate';
  }[];
  format?: 'groups' | 'league';
  groupSize?: number;
  playoffType?: 'none' | 'final' | 'semis' | 'quarters';
  setsGroup?: number;
  setsPlayoff?: number;
  reiDaQuadraType?: 'individual' | 'duplas_fixas';
  reiDaQuadraDuration?: string;
  reiDaQuadraCourts?: number;
  reiDaQuadraEstimatedAthletes?: number;
  reiDaQuadraConsecutiveWinsLimit?: number | null;
  reiDaQuadraChampionCriterion?: 'wins' | 'sequence' | 'win_rate' | 'games_balance';
  reiDaQuadraQueue?: string[];
  reiDaQuadraFixedTeamsQueue?: string[][];
  reiDaQuadraStartedAt?: number;
  reiDaQuadraEndedAt?: number;
};

export type AppData = {
  players: Player[];
  tournaments: Tournament[];
};

export type Role = 'owner' | 'editor' | 'viewer';

export interface WorkspaceAccess {
  id: string; // Document ID (usually owner's uid)
  ownerId: string;
  ownerEmail: string;
  members: string[]; // uids of users with access
  roles: Record<string, Role>; // map of uid -> role
  memberDetails?: Record<string, { email: string, name: string }>;
  status?: 'active' | 'inactive';
  modules?: {
    tournaments?: boolean;
    courtRental?: boolean;
    classSchedule?: boolean;
    finance?: boolean;
  };
}

export interface Invite {
  id: string;
  email: string;
  name?: string;
  workspaceId: string;
  workspaceOwnerEmail: string;
  role: Role;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: number;
}
