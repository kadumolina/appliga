import React, { useState, useEffect, useMemo } from 'react';
import { Tournament, Match, Player } from '../../types';
import { useAppStore } from '../../store/AppContext';
import { getPlayerName } from '../../lib/tournament';
import { 
  Trophy, 
  Clock, 
  Flame, 
  RefreshCw, 
  Plus, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  UserPlus, 
  Timer, 
  Undo2, 
  AlertCircle, 
  CheckCircle2, 
  ArrowRightLeft, 
  PlusCircle, 
  Play, 
  Check, 
  Award,
  Users,
  Edit3,
  X
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ReiDaQuadraPhaseProps {
  tournament: Tournament;
}

type IndividualStat = {
  id: string;
  name: string;
  played: number;
  wins: number;
  losses: number;
  gamesWon: number;
  gamesLost: number;
  gameBalance: number;
  winRate: number;
  currentStreak: number;
  maxStreak: number;
};

type DuoStat = {
  teamKey: string; // "id1-id2"
  team: [string, string];
  played: number;
  wins: number;
  losses: number;
  gamesWon: number;
  gamesLost: number;
  gameBalance: number;
  winRate: number;
  currentStreak: number;
  maxStreak: number;
};

export default function ReiDaQuadraPhase({ tournament }: ReiDaQuadraPhaseProps) {
  const { data, updateTournament, currentRole } = useAppStore();
  const [showEndModal, setShowEndModal] = useState(false);
  const [showAddPlayerModal, setShowAddPlayerModal] = useState(false);

  // Score keeping state for each active court
  // Keyed by court/match ID
  const [setsInput1, setSetsInput1] = useState<Record<string, string[]>>({});
  const [setsInput2, setSetsInput2] = useState<Record<string, string[]>>({});
  const [score1, setScore1] = useState<Record<string, string>>({});
  const [score2, setScore2] = useState<Record<string, string>>({});

  // Active swap state to replace a player on court with one from the queue
  const [swappingCourtMatchId, setSwappingCourtMatchId] = useState<string | null>(null);
  const [playerToReplaceId, setPlayerToReplaceId] = useState<string | null>(null);

  // Time elapsed state
  const [elapsedTimeStr, setElapsedTimeStr] = useState<string>('');

  useEffect(() => {
    if (!tournament.reiDaQuadraStartedAt) return;
    
    const updateTimer = () => {
      const endTime = tournament.reiDaQuadraEndedAt || Date.now();
      const diffMs = endTime - tournament.reiDaQuadraStartedAt!;
      const hrs = Math.floor(diffMs / 3600000);
      const mins = Math.floor((diffMs % 3600000) / 60000);
      const secs = Math.floor((diffMs % 60000) / 1000);
      const hStr = hrs > 0 ? `${hrs}h ` : '';
      setElapsedTimeStr(`${hStr}${mins}m ${secs}s`);
    };

    updateTimer();

    if (tournament.reiDaQuadraEndedAt || tournament.status === 'completed') {
      return;
    }

    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [tournament.reiDaQuadraStartedAt, tournament.reiDaQuadraEndedAt, tournament.status]);

  const completedMatches = useMemo(() => {
    return tournament.matches.filter(m => m.status === 'completed');
  }, [tournament.matches]);

  const activeMatches = useMemo(() => {
    return tournament.matches.filter(m => m.status === 'pending');
  }, [tournament.matches]);

  // Compute individual or duo statistics on the fly
  const individualStats = useMemo(() => {
    if (tournament.reiDaQuadraType !== 'individual') return [];

    const statsMap: Record<string, IndividualStat> = {};
    const participantsList = (tournament.participants || []) as string[];

    participantsList.forEach(id => {
      const player = data.players.find(p => p.id === id);
      statsMap[id] = {
        id,
        name: player?.name || 'Desconhecido',
        played: 0,
        wins: 0,
        losses: 0,
        gamesWon: 0,
        gamesLost: 0,
        gameBalance: 0,
        winRate: 0,
        currentStreak: 0,
        maxStreak: 0
      };
    });

    // Populate play statistics from completed matches
    completedMatches.forEach(m => {
      const isT1 = m.team1.includes('');
      const isT2 = m.team2.includes('');
      
      const s1 = m.score1 ?? 0;
      const s2 = m.score2 ?? 0;
      const isT1Winner = s1 > s2;
      const isT2Winner = s2 > s1;

      m.team1.forEach(pid => {
        if (!statsMap[pid]) return;
        statsMap[pid].played++;
        statsMap[pid].gamesWon += s1;
        statsMap[pid].gamesLost += s2;
        statsMap[pid].gameBalance += (s1 - s2);
        if (isT1Winner) {
          statsMap[pid].wins++;
        } else if (isT2Winner) {
          statsMap[pid].losses++;
        }
      });

      m.team2.forEach(pid => {
        if (!statsMap[pid]) return;
        statsMap[pid].played++;
        statsMap[pid].gamesWon += s2;
        statsMap[pid].gamesLost += s1;
        statsMap[pid].gameBalance += (s2 - s1);
        if (isT2Winner) {
          statsMap[pid].wins++;
        } else if (isT1Winner) {
          statsMap[pid].losses++;
        }
      });
    });

    // Compute Streaks
    participantsList.forEach(id => {
      let running = 0;
      let maxStr = 0;
      completedMatches.forEach(m => {
        const hasT1 = m.team1.includes(id);
        const hasT2 = m.team2.includes(id);
        if (!hasT1 && !hasT2) return;

        const s1 = m.score1 ?? 0;
        const s2 = m.score2 ?? 0;
        const won = (hasT1 && s1 > s2) || (hasT2 && s2 > s1);

        if (won) {
          running++;
          if (running > maxStr) maxStr = running;
        } else {
          running = 0;
        }
      });
      statsMap[id].currentStreak = running;
      statsMap[id].maxStreak = maxStr;
      statsMap[id].winRate = statsMap[id].played > 0 ? Math.round((statsMap[id].wins / statsMap[id].played) * 100) : 0;
    });

    // Sort based on preferred champion criterion
    const criterion = tournament.reiDaQuadraChampionCriterion || 'wins';
    return Object.values(statsMap).sort((a, b) => {
      if (criterion === 'wins') {
        if (b.wins !== a.wins) return b.wins - a.wins;
      } else if (criterion === 'sequence') {
        if (b.maxStreak !== a.maxStreak) return b.maxStreak - a.maxStreak;
      } else if (criterion === 'win_rate') {
        if (b.winRate !== a.winRate) return b.winRate - a.winRate;
      } else if (criterion === 'games_balance') {
        if (b.gameBalance !== a.gameBalance) return b.gameBalance - a.gameBalance;
      }

      // Fallbacks
      if (b.wins !== a.wins) return b.wins - a.wins;
      if (b.gameBalance !== a.gameBalance) return b.gameBalance - a.gameBalance;
      if (b.gamesWon !== a.gamesWon) return b.gamesWon - a.gamesWon;
      return a.gamesLost - b.gamesLost;
    });
  }, [tournament, data.players, completedMatches]);

  const duoStats = useMemo(() => {
    if (tournament.reiDaQuadraType !== 'duplas_fixas') return [];

    const statsMap: Record<string, DuoStat> = {};
    const participantsList = (tournament.participants || []) as string[];

    // Generate fixed pairs
    const pairs: Array<[string, string]> = [];
    for (let i = 0; i < participantsList.length; i += 2) {
      if (participantsList[i+1]) {
        pairs.push([participantsList[i], participantsList[i+1]]);
      }
    }

    pairs.forEach(pair => {
      const sortedIds = [...pair].sort();
      const teamKey = sortedIds.join('-');
      statsMap[teamKey] = {
        teamKey,
        team: pair,
        played: 0,
        wins: 0,
        losses: 0,
        gamesWon: 0,
        gamesLost: 0,
        gameBalance: 0,
        winRate: 0,
        currentStreak: 0,
        maxStreak: 0
      };
    });

    completedMatches.forEach(m => {
      const key1 = [...m.team1].sort().join('-');
      const key2 = [...m.team2].sort().join('-');

      const s1 = m.score1 ?? 0;
      const s2 = m.score2 ?? 0;
      const isT1Winner = s1 > s2;
      const isT2Winner = s2 > s1;

      if (statsMap[key1]) {
        statsMap[key1].played++;
        statsMap[key1].gamesWon += s1;
        statsMap[key1].gamesLost += s2;
        statsMap[key1].gameBalance += (s1 - s2);
        if (isT1Winner) statsMap[key1].wins++;
        else if (isT2Winner) statsMap[key1].losses++;
      }

      if (statsMap[key2]) {
        statsMap[key2].played++;
        statsMap[key2].gamesWon += s2;
        statsMap[key2].gamesLost += s1;
        statsMap[key2].gameBalance += (s2 - s1);
        if (isT2Winner) statsMap[key2].wins++;
        else if (isT1Winner) statsMap[key2].losses++;
      }
    });

    // Compute streaks for pairs
    pairs.forEach(pair => {
      const teamKey = [...pair].sort().join('-');
      if (!statsMap[teamKey]) return;

      let running = 0;
      let maxStr = 0;
      completedMatches.forEach(m => {
        const mKey1 = [...m.team1].sort().join('-');
        const mKey2 = [...m.team2].sort().join('-');
        const isM1 = mKey1 === teamKey;
        const isM2 = mKey2 === teamKey;
        if (!isM1 && !isM2) return;

        const s1 = m.score1 ?? 0;
        const s2 = m.score2 ?? 0;
        const won = (isM1 && s1 > s2) || (isM2 && s2 > s1);

        if (won) {
          running++;
          if (running > maxStr) maxStr = running;
        } else {
          running = 0;
        }
      });
      statsMap[teamKey].currentStreak = running;
      statsMap[teamKey].maxStreak = maxStr;
      statsMap[teamKey].winRate = statsMap[teamKey].played > 0 ? Math.round((statsMap[teamKey].wins / statsMap[teamKey].played) * 100) : 0;
    });

    const criterion = tournament.reiDaQuadraChampionCriterion || 'wins';
    return Object.values(statsMap).sort((a, b) => {
      if (criterion === 'wins') {
        if (b.wins !== a.wins) return b.wins - a.wins;
      } else if (criterion === 'sequence') {
        if (b.maxStreak !== a.maxStreak) return b.maxStreak - a.maxStreak;
      } else if (criterion === 'win_rate') {
        if (b.winRate !== a.winRate) return b.winRate - a.winRate;
      } else if (criterion === 'games_balance') {
        if (b.gameBalance !== a.gameBalance) return b.gameBalance - a.gameBalance;
      }

      // Fallbacks
      if (b.wins !== a.wins) return b.wins - a.wins;
      if (b.gameBalance !== a.gameBalance) return b.gameBalance - a.gameBalance;
      if (b.gamesWon !== a.gamesWon) return b.gamesWon - a.gamesWon;
      return a.gamesLost - b.gamesLost;
    });
  }, [tournament, completedMatches]);

  // Handle saving the result of a match and executing queue rotation
  const handleSaveResult = async (match: Match) => {
    if (currentRole === 'viewer') return;

    const gameScore1 = parseInt(score1[match.id] || '0');
    const gameScore2 = parseInt(score2[match.id] || '0');

    if (gameScore1 === gameScore2) {
      alert('Partidas de tênis de praia / vôlei de praia não podem terminar empatadas.');
      return;
    }

    const setsS1 = (setsInput1[match.id] || []).map(s => parseInt(s) || 0);
    const setsS2 = (setsInput2[match.id] || []).map(s => parseInt(s) || 0);

    // 1. Mark this match as completed
    const updatedMatches = tournament.matches.map(m => {
      if (m.id === match.id) {
        return {
          ...m,
          score1: gameScore1,
          score2: gameScore2,
          setsScore1: setsS1,
          setsScore2: setsS2,
          status: 'completed' as const
        };
      }
      return m;
    });

    // 2. Queue rotation algorithm
    const limit = typeof tournament.reiDaQuadraConsecutiveWinsLimit === 'number' ? tournament.reiDaQuadraConsecutiveWinsLimit : 3;
    const isT1Winner = gameScore1 > gameScore2;
    const winners = isT1Winner ? match.team1 : match.team2;
    const losers = isT1Winner ? match.team2 : match.team1;

    let nextQueue = tournament.reiDaQuadraQueue ? [...tournament.reiDaQuadraQueue] : [];
    let nextFixedTeamsQueue = tournament.reiDaQuadraFixedTeamsQueue ? [...tournament.reiDaQuadraFixedTeamsQueue] : [];

    let stayersOnCourt: string[] = [];
    let stayersDuoOnCourt: string[][] = [];

    if (tournament.reiDaQuadraType === 'individual') {
      // Find current consecutive wins for each winner *including this match*
      // Let's compute their new streak
      const winnerStreak1 = getStreakForPlayer(winners[0], updatedMatches.filter(m => m.status === 'completed'));
      const winnerStreak2 = getStreakForPlayer(winners[1], updatedMatches.filter(m => m.status === 'completed'));

      const w1ReachesLimit = winnerStreak1 >= limit;
      const w2ReachesLimit = winnerStreak2 >= limit;

      // Handle winner 1
      if (w1ReachesLimit) {
        nextQueue.push(winners[0]); // Goes to back of the queue
      } else {
        stayersOnCourt.push(winners[0]); // Stays on court
      }

      // Handle winner 2
      if (w2ReachesLimit) {
        nextQueue.push(winners[1]);
      } else {
        stayersOnCourt.push(winners[1]);
      }

      // Losers always go to the back of the queue
      nextQueue.push(losers[0], losers[1]);

      // Fill court up to 4 players by taking from the front of the queue
      const slotsNeeded = 4 - stayersOnCourt.length;
      const entrants: string[] = [];
      for (let i = 0; i < slotsNeeded; i++) {
        if (nextQueue.length > 0) {
          entrants.push(nextQueue.shift()!);
        }
      }

      const activeOnCourt = [...stayersOnCourt, ...entrants];
      
      let nextTeam1: string[];
      let nextTeam2: string[];

      // If playing individual with exactly 4 participants, rotate the duplas so they play all 3 possible matchups
      const participantsList = (tournament.participants || []) as string[];
      if (participantsList.length === 4) {
        const [p0, p1, p2, p3] = [...participantsList].sort();

        let countA = 0;
        let countB = 0;
        let countC = 0;

        const previousCompletedMatches = updatedMatches.filter(m => m.status === 'completed');

        previousCompletedMatches.forEach(m => {
          const t1 = m.team1 || [];
          const t2 = m.team2 || [];
          const allPlayers = [...t1, ...t2];
          if (allPlayers.length === 4) {
            if ((t1.includes(p0) && t1.includes(p1)) || (t2.includes(p0) && t2.includes(p1))) {
              countA++;
            } else if ((t1.includes(p0) && t1.includes(p2)) || (t2.includes(p0) && t2.includes(p2))) {
              countB++;
            } else if ((t1.includes(p0) && t1.includes(p3)) || (t2.includes(p0) && t2.includes(p3))) {
              countC++;
            }
          }
        });

        const currentT1 = match.team1 || [];
        const currentT2 = match.team2 || [];
        let currentMatchup: 'A' | 'B' | 'C' | null = null;
        if ((currentT1.includes(p0) && currentT1.includes(p1)) || (currentT2.includes(p0) && currentT2.includes(p1))) {
          currentMatchup = 'A';
        } else if ((currentT1.includes(p0) && currentT1.includes(p2)) || (currentT2.includes(p0) && currentT2.includes(p2))) {
          currentMatchup = 'B';
        } else if ((currentT1.includes(p0) && currentT1.includes(p3)) || (currentT2.includes(p0) && currentT2.includes(p3))) {
          currentMatchup = 'C';
        }

        const matchups = [
          { name: 'A', count: countA, team1: [p0, p1], team2: [p2, p3] },
          { name: 'B', count: countB, team1: [p0, p2], team2: [p1, p3] },
          { name: 'C', count: countC, team1: [p0, p3], team2: [p1, p2] }
        ] as const;

        const sortedMatchups = [...matchups].sort((x, y) => {
          if (x.count !== y.count) {
            return x.count - y.count;
          }
          if (x.name === currentMatchup) return 1;
          if (y.name === currentMatchup) return -1;
          return 0;
        });

        const chosen = sortedMatchups[0];
        nextTeam1 = [...chosen.team1] as string[];
        nextTeam2 = [...chosen.team2] as string[];
      } else {
        // Shuffle/Randomize active players into two duplas of 2!
        const shuffled = [...activeOnCourt].sort(() => Math.random() - 0.5);
        nextTeam1 = [shuffled[0], shuffled[1]];
        nextTeam2 = [shuffled[2], shuffled[3]];
      }

      // Create the NEXT match on this same court/group
      const nextMatchId = `court-${match.groupId || '1'}-match-${Date.now()}`;
      const nextMatch: Match = {
        id: nextMatchId,
        type: 'group',
        status: 'pending',
        team1: nextTeam1,
        team2: nextTeam2,
        score1: undefined,
        score2: undefined,
        setsScore1: [],
        setsScore2: [],
        groupId: match.groupId || 'Quadra 1'
      };

      updatedMatches.push(nextMatch);

    } else {
      // Duplas Fixas Mode
      const winnerDuoKey = winners.sort().join('-');
      const duoStreak = getStreakForDuo(winners, updatedMatches.filter(m => m.status === 'completed'));
      const duoReachesLimit = duoStreak >= limit;

      if (duoReachesLimit) {
        // Winner duo goes to back of queue
        nextFixedTeamsQueue.push(winners);
      } else {
        stayersDuoOnCourt.push(winners);
      }

      // Loser duo goes to back of queue
      nextFixedTeamsQueue.push(losers);

      // Fill court up to 2 duplas
      const duosNeeded = 2 - stayersDuoOnCourt.length;
      const duoEntrants: string[][] = [];
      for (let i = 0; i < duosNeeded; i++) {
        if (nextFixedTeamsQueue.length > 0) {
          duoEntrants.push(nextFixedTeamsQueue.shift()!);
        }
      }

      const activeDuos = [...stayersDuoOnCourt, ...duoEntrants];
      const nextMatchId = `court-${match.groupId || '1'}-match-${Date.now()}`;
      const nextMatch: Match = {
        id: nextMatchId,
        type: 'group',
        status: 'pending',
        team1: activeDuos[0] || [],
        team2: activeDuos[1] || [],
        score1: undefined,
        score2: undefined,
        setsScore1: [],
        setsScore2: [],
        groupId: match.groupId || 'Quadra 1'
      };

      updatedMatches.push(nextMatch);
    }

    // Save to Firestore!
    await updateTournament(tournament.id, {
      matches: updatedMatches,
      reiDaQuadraQueue: nextQueue,
      reiDaQuadraFixedTeamsQueue: nextFixedTeamsQueue
    });

    // Clear score state for this match
    setScore1(prev => { const n = {...prev}; delete n[match.id]; return n; });
    setScore2(prev => { const n = {...prev}; delete n[match.id]; return n; });
    setSetsInput1(prev => { const n = {...prev}; delete n[match.id]; return n; });
    setSetsInput2(prev => { const n = {...prev}; delete n[match.id]; return n; });
  };

  // Helper: compute streak for a player from completed matches
  const getStreakForPlayer = (playerId: string, matchesList: Match[]): number => {
    let running = 0;
    for (let i = 0; i < matchesList.length; i++) {
      const m = matchesList[i];
      const hasT1 = m.team1.includes(playerId);
      const hasT2 = m.team2.includes(playerId);
      if (!hasT1 && !hasT2) continue;

      const s1 = m.score1 ?? 0;
      const s2 = m.score2 ?? 0;
      const won = (hasT1 && s1 > s2) || (hasT2 && s2 > s1);
      if (won) {
        running++;
      } else {
        running = 0;
      }
    }
    return running;
  };

  // Helper: compute streak for a duo
  const getStreakForDuo = (team: string[], matchesList: Match[]): number => {
    const key = [...team].sort().join('-');
    let running = 0;
    for (let i = 0; i < matchesList.length; i++) {
      const m = matchesList[i];
      const key1 = [...m.team1].sort().join('-');
      const key2 = [...m.team2].sort().join('-');
      const isT1 = key1 === key;
      const isT2 = key2 === key;
      if (!isT1 && !isT2) continue;

      const s1 = m.score1 ?? 0;
      const s2 = m.score2 ?? 0;
      const won = (isT1 && s1 > s2) || (isT2 && s2 > s1);
      if (won) {
        running++;
      } else {
        running = 0;
      }
    }
    return running;
  };

  // Queue manipulation functions
  const moveQueueItem = async (index: number, direction: 'up' | 'down') => {
    if (currentRole === 'viewer') return;

    if (tournament.reiDaQuadraType === 'individual') {
      const queue = [...(tournament.reiDaQuadraQueue || [])];
      const targetIndex = index + (direction === 'up' ? -1 : 1);
      if (targetIndex < 0 || targetIndex >= queue.length) return;

      const temp = queue[index];
      queue[index] = queue[targetIndex];
      queue[targetIndex] = temp;

      await updateTournament(tournament.id, { reiDaQuadraQueue: queue });
    } else {
      const queue = [...(tournament.reiDaQuadraFixedTeamsQueue || [])];
      const targetIndex = index + (direction === 'up' ? -1 : 1);
      if (targetIndex < 0 || targetIndex >= queue.length) return;

      const temp = queue[index];
      queue[index] = queue[targetIndex];
      queue[targetIndex] = temp;

      await updateTournament(tournament.id, { reiDaQuadraFixedTeamsQueue: queue });
    }
  };

  const removeQueueItem = async (index: number) => {
    if (currentRole === 'viewer') return;

    if (tournament.reiDaQuadraType === 'individual') {
      const queue = [...(tournament.reiDaQuadraQueue || [])];
      queue.splice(index, 1);
      await updateTournament(tournament.id, { reiDaQuadraQueue: queue });
    } else {
      const queue = [...(tournament.reiDaQuadraFixedTeamsQueue || [])];
      queue.splice(index, 1);
      await updateTournament(tournament.id, { reiDaQuadraFixedTeamsQueue: queue });
    }
  };

  // Swapping a player currently on court with one from the queue, or swapping/permuting positions, or with any participant
  const handleSwapPlayerOnCourt = async (targetPlayerId: string) => {
    if (!swappingCourtMatchId || !playerToReplaceId || currentRole === 'viewer') return;

    // Find if the target player is already in this match
    const activeMatch = tournament.matches.find(m => m.id === swappingCourtMatchId);
    const targetIsOnCourt = activeMatch ? [...(activeMatch.team1 || []), ...(activeMatch.team2 || [])].includes(targetPlayerId) : false;

    const updatedMatches = tournament.matches.map(m => {
      if (m.id === swappingCourtMatchId) {
        if (targetIsOnCourt) {
          // Pure swap between two players already on court
          const nextTeam1 = m.team1.map(pid => {
            if (pid === playerToReplaceId) return targetPlayerId;
            if (pid === targetPlayerId) return playerToReplaceId;
            return pid;
          });
          const nextTeam2 = m.team2.map(pid => {
            if (pid === playerToReplaceId) return targetPlayerId;
            if (pid === targetPlayerId) return playerToReplaceId;
            return pid;
          });
          return {
            ...m,
            team1: nextTeam1,
            team2: nextTeam2
          };
        } else {
          // Normal replace with a player not on court
          const nextTeam1 = m.team1.map(pid => pid === playerToReplaceId ? targetPlayerId : pid);
          const nextTeam2 = m.team2.map(pid => pid === playerToReplaceId ? targetPlayerId : pid);
          return {
            ...m,
            team1: nextTeam1,
            team2: nextTeam2
          };
        }
      }
      return m;
    });

    let nextQueue = [...(tournament.reiDaQuadraQueue || [])];

    if (!targetIsOnCourt) {
      // If target was not on court, we need to manage the queue
      const targetIdxInQueue = nextQueue.indexOf(targetPlayerId);
      if (targetIdxInQueue !== -1) {
        // Put the replaced player in the queue where the target player was
        nextQueue[targetIdxInQueue] = playerToReplaceId;
      } else {
        // Put at the back of the queue
        nextQueue.push(playerToReplaceId);
      }
    }

    await updateTournament(tournament.id, {
      matches: updatedMatches,
      reiDaQuadraQueue: nextQueue
    });

    setSwappingCourtMatchId(null);
    setPlayerToReplaceId(null);
  };

  // Add player to the queue (if they are resting or just joined)
  const [selectedAddPlayerId, setSelectedAddPlayerId] = useState<string>('');
  const handleAddPlayerToQueue = async () => {
    if (!selectedAddPlayerId || currentRole === 'viewer') return;

    if (tournament.reiDaQuadraType === 'individual') {
      const queue = [...(tournament.reiDaQuadraQueue || [])];
      if (queue.includes(selectedAddPlayerId)) {
        alert('Este atleta já está na fila.');
        return;
      }
      queue.push(selectedAddPlayerId);
      await updateTournament(tournament.id, { reiDaQuadraQueue: queue });
    } else {
      // For fixed teams, find their partner to form the pair
      const participants = tournament.participants as string[];
      const pIdx = participants.indexOf(selectedAddPlayerId);
      const partnerIdx = pIdx % 2 === 0 ? pIdx + 1 : pIdx - 1;
      const partnerId = participants[partnerIdx];
      if (!partnerId) {
        alert('Este atleta não tem uma dupla formada no campeonato.');
        return;
      }

      const team = [selectedAddPlayerId, partnerId].sort();
      const queue = [...(tournament.reiDaQuadraFixedTeamsQueue || [])];
      
      const exists = queue.some(t => [...t].sort().join('-') === team.join('-'));
      if (exists) {
        alert('Esta dupla já está na fila.');
        return;
      }

      queue.push([selectedAddPlayerId, partnerId]);
      await updateTournament(tournament.id, { reiDaQuadraFixedTeamsQueue: queue });
    }

    setSelectedAddPlayerId('');
    setShowAddPlayerModal(false);
  };

  // Add completely new players to the tournament during runtime (if they arrived late!)
  const [showAddLatePlayerModal, setShowAddLatePlayerModal] = useState(false);
  const [latePlayerId, setLatePlayerId] = useState('');

  const unusedTournamentPlayers = useMemo(() => {
    const list = data.players.filter(p => {
      if (tournament.category === 'masculino' && p.gender !== 'M') return false;
      if (tournament.category === 'feminino' && p.gender !== 'F') return false;
      return true;
    });
    return list.filter(p => !tournament.participants.includes(p.id));
  }, [data.players, tournament]);

  const handleAddLatePlayer = async () => {
    if (!latePlayerId || currentRole === 'viewer') return;

    const nextParticipants = [...tournament.participants, latePlayerId];
    
    if (tournament.reiDaQuadraType === 'individual') {
      const nextQueue = [...(tournament.reiDaQuadraQueue || []), latePlayerId];
      await updateTournament(tournament.id, {
        participants: nextParticipants,
        reiDaQuadraQueue: nextQueue
      });
    } else {
      // Requires pairs, need 2 players. If odd count, we wait for partner
      if (nextParticipants.length % 2 === 0) {
        const partnerId = nextParticipants[nextParticipants.length - 2];
        const nextFixedQueue = [...(tournament.reiDaQuadraFixedTeamsQueue || []), [partnerId, latePlayerId]];
        await updateTournament(tournament.id, {
          participants: nextParticipants,
          reiDaQuadraFixedTeamsQueue: nextFixedQueue
        });
      } else {
        await updateTournament(tournament.id, {
          participants: nextParticipants
        });
      }
    }

    setLatePlayerId('');
    setShowAddLatePlayerModal(false);
  };

  // Recalculates stats and updates tournament status to 'completed'
  const handleFinishTournament = async () => {
    if (currentRole === 'viewer') return;

    const endTimestamp = Date.now();

    if (tournament.reiDaQuadraType === 'individual') {
      const sorted = [...individualStats];
      await updateTournament(tournament.id, {
        status: 'completed',
        reiDaQuadraEndedAt: endTimestamp,
        finalRankings: {
          champion: sorted[0] ? [sorted[0].id] : [],
          runnerUp: sorted[1] ? [sorted[1].id] : [],
          thirdPlace: sorted[2] ? [sorted[2].id] : [],
          fourthPlace: sorted[3] ? [sorted[3].id] : [],
          eliminated: sorted.slice(4).map(s => s.id)
        }
      });
    } else {
      const sorted = [...duoStats];
      await updateTournament(tournament.id, {
        status: 'completed',
        reiDaQuadraEndedAt: endTimestamp,
        finalRankings: {
          champion: sorted[0] ? sorted[0].team : [],
          runnerUp: sorted[1] ? sorted[1].team : [],
          thirdPlace: sorted[2] ? sorted[2].team : [],
          fourthPlace: sorted[3] ? sorted[3].team : [],
          eliminated: sorted.slice(4).map(s => s.team).flat()
        }
      });
    }
    setShowEndModal(false);
  };

  // past matches score/team update & deletion helpers
  const [matchToDelete, setMatchToDelete] = useState<Match | null>(null);
  const [matchToEdit, setMatchToEdit] = useState<Match | null>(null);
  const [editTeam1, setEditTeam1] = useState<string[]>([]);
  const [editTeam2, setEditTeam2] = useState<string[]>([]);
  const [editScore1, setEditScore1] = useState('');
  const [editScore2, setEditScore2] = useState('');

  const openEditPastMatch = (m: Match) => {
    setMatchToEdit(m);
    setEditTeam1([...m.team1]);
    setEditTeam2([...m.team2]);
    setEditScore1(String(m.score1 ?? 0));
    setEditScore2(String(m.score2 ?? 0));
  };

  const handleSaveEditedMatch = async () => {
    if (!matchToEdit || currentRole === 'viewer') return;

    const s1 = parseInt(editScore1) || 0;
    const s2 = parseInt(editScore2) || 0;

    const updated = tournament.matches.map(m => {
      if (m.id === matchToEdit.id) {
        return {
          ...m,
          team1: editTeam1.filter(Boolean),
          team2: editTeam2.filter(Boolean),
          score1: s1,
          score2: s2,
        };
      }
      return m;
    });

    await updateTournament(tournament.id, { matches: updated });
    setMatchToEdit(null);
  };

  const handleConfirmDeleteMatch = async () => {
    if (!matchToDelete || currentRole === 'viewer') return;
    const updated = tournament.matches.filter(m => m.id !== matchToDelete.id);
    await updateTournament(tournament.id, { matches: updated });
    setMatchToDelete(null);
  };

  const swapCandidates = useMemo(() => {
    if (!swappingCourtMatchId || !playerToReplaceId) return null;

    const activeMatch = tournament.matches.find(m => m.id === swappingCourtMatchId);
    if (!activeMatch) return null;

    const participantsList = (tournament.participants || []) as string[];

    // Players on court in this match (excluding the player being replaced)
    const onCourtInMatch = [...(activeMatch.team1 || []), ...(activeMatch.team2 || [])].filter(
      pid => pid !== playerToReplaceId
    );

    // Queue of waiting players (for individual mode)
    const queuePlayers = (tournament.reiDaQuadraQueue || []).filter(
      pid => pid !== playerToReplaceId
    );

    // All other tournament participants who are not on court in this match and not in the queue
    const otherParticipants = participantsList.filter(
      pid =>
        pid !== playerToReplaceId &&
        !onCourtInMatch.includes(pid) &&
        !queuePlayers.includes(pid)
    );

    return {
      onCourtInMatch,
      queuePlayers,
      otherParticipants
    };
  }, [swappingCourtMatchId, playerToReplaceId, tournament.matches, tournament.participants, tournament.reiDaQuadraQueue]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-24">
      
      {/* 1. Header Card with Live Status */}
      <div className="bg-black text-white p-6 rounded-3xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 rounded-full bg-orange-500/10 blur-3xl pointer-events-none"></div>
        
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            {tournament.status === 'completed' ? (
              <span className="bg-green-500 text-black text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md">
                Finalizado
              </span>
            ) : (
              <span className="bg-orange-500 text-black text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md animate-pulse">
                Em Andamento
              </span>
            )}
            <h1 className="text-xl font-extrabold tracking-tight md:text-2xl italic uppercase">
              Rei da Quadra {tournament.reiDaQuadraType === 'individual' ? '👤 Individual' : '👥 em Duplas'}
            </h1>
          </div>
          <p className="text-gray-400 text-sm">
            Disputa contínua de quadras com rotatividade automática de desafiantes.
          </p>
        </div>

        <div className="flex flex-wrap gap-4 items-center">
          <div className="bg-white/5 border border-white/10 px-4 py-2.5 rounded-2xl flex items-center gap-3">
            <Clock className="w-5 h-5 text-orange-400" />
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400 block">Tempo Decorrido</span>
              <span className="font-mono text-sm font-extrabold text-white">{elapsedTimeStr || 'Calculando...'}</span>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 px-4 py-2.5 rounded-2xl flex items-center gap-3">
            <Flame className="w-5 h-5 text-amber-500" />
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400 block">Limite de Vitórias</span>
              {currentRole !== 'viewer' && tournament.status !== 'completed' ? (
                <select
                  value={tournament.reiDaQuadraConsecutiveWinsLimit === null || tournament.reiDaQuadraConsecutiveWinsLimit === undefined ? 'unlimited' : tournament.reiDaQuadraConsecutiveWinsLimit}
                  onChange={(e) => {
                    const val = e.target.value;
                    updateTournament(tournament.id, {
                      reiDaQuadraConsecutiveWinsLimit: val === 'unlimited' ? null : Number(val)
                    });
                  }}
                  className="bg-transparent text-sm font-extrabold text-white focus:outline-none focus:ring-1 focus:ring-orange-500 rounded border-0 p-0 cursor-pointer pr-6 font-sans"
                  style={{ colorScheme: 'dark' }}
                >
                  <option value="unlimited" className="bg-gray-900 text-white">Sem limite</option>
                  <option value={0} className="bg-gray-900 text-white">0 Jogos (Sempre rotaciona)</option>
                  <option value={1} className="bg-gray-900 text-white">1 vitória (Sai imediato)</option>
                  {[2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                    <option key={n} value={n} className="bg-gray-900 text-white">
                      {n} vitórias seguidas
                    </option>
                  ))}
                </select>
              ) : (
                <span className="text-sm font-extrabold text-white">
                  {tournament.reiDaQuadraConsecutiveWinsLimit === 0 
                    ? 'Sempre rotaciona (0 jogos)' 
                    : (tournament.reiDaQuadraConsecutiveWinsLimit === null || tournament.reiDaQuadraConsecutiveWinsLimit === undefined)
                      ? 'Sem limite'
                      : tournament.reiDaQuadraConsecutiveWinsLimit === 1
                        ? '1 vitória'
                        : `${tournament.reiDaQuadraConsecutiveWinsLimit} vitórias seguidas`}
                </span>
              )}
            </div>
          </div>

          {currentRole !== 'viewer' && tournament.status !== 'completed' && (
            <button
              onClick={() => setShowEndModal(true)}
              className="bg-green-500 hover:bg-green-600 text-black px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-md shadow-green-500/10 hover:shadow-green-500/25 active:scale-95"
            >
              Finalizar Evento
            </button>
          )}
        </div>
      </div>

      {/* 1B. Beautiful Champions Podium Banner */}
      {tournament.status === 'completed' && (
        <div className="bg-gradient-to-r from-amber-50 to-amber-100/50 border border-amber-200 rounded-3xl p-6 md:p-8 space-y-6 shadow-md relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
            <Trophy className="w-48 h-48 text-amber-600" />
          </div>
          <div className="flex flex-col items-center text-center space-y-2">
            <div className="bg-amber-500 text-black p-3.5 rounded-full shadow-md shadow-amber-500/25">
              <Trophy className="w-8 h-8" />
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-amber-950 tracking-tight uppercase italic">
              🏆 Campeões do Rei da Quadra 🏆
            </h2>
            <p className="text-amber-900/80 text-xs font-semibold max-w-md">
              O evento foi finalizado! Confira abaixo os atletas consagrados no pódio.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 relative z-10">
            {/* 2º Lugar */}
            <div className="bg-white border border-gray-200/80 shadow-sm rounded-2xl p-5 flex flex-col items-center justify-center text-center space-y-2 order-2 md:order-1 self-end md:h-[180px]">
              <span className="bg-slate-100 text-slate-800 text-[10px] font-black uppercase px-2.5 py-1 rounded-full tracking-wider border border-slate-200">
                🥈 2º Lugar
              </span>
              <div className="font-extrabold text-gray-950 text-base leading-tight">
                {tournament.finalRankings?.runnerUp && tournament.finalRankings.runnerUp.length > 0 ? (
                  tournament.finalRankings.runnerUp.map(pid => (
                    <div key={pid}>{getPlayerName(pid, data.players)}</div>
                  ))
                ) : (
                  <span className="text-gray-400 font-normal text-sm">Sem dados</span>
                )}
              </div>
              <span className="text-gray-500 text-xs font-bold bg-gray-50 px-2 py-0.5 rounded">
                {tournament.reiDaQuadraType === 'individual' ? (
                  individualStats.find(s => s.id === tournament.finalRankings?.runnerUp?.[0]) ? (
                    `${individualStats.find(s => s.id === tournament.finalRankings.runnerUp[0])?.wins} vitórias`
                  ) : null
                ) : (
                  duoStats.find(s => s.team.includes(tournament.finalRankings?.runnerUp?.[0] || '')) ? (
                    `${duoStats.find(s => s.team.includes(tournament.finalRankings?.runnerUp?.[0] || ''))?.wins} vitórias`
                  ) : null
                )}
              </span>
            </div>

            {/* 1º Lugar */}
            <div className="bg-gradient-to-b from-amber-100 to-amber-50/30 border-2 border-amber-400 shadow-md rounded-3xl p-6 flex flex-col items-center justify-center text-center space-y-3 order-1 md:order-2 md:h-[220px]">
              <span className="bg-amber-500 text-black text-[11px] font-black uppercase px-3.5 py-1 rounded-full tracking-wider shadow-sm animate-bounce">
                👑 Campeão (Rei da Quadra)
              </span>
              <div className="font-black text-amber-950 text-xl md:text-2xl leading-tight tracking-tight uppercase">
                {tournament.finalRankings?.champion && tournament.finalRankings.champion.length > 0 ? (
                  tournament.finalRankings.champion.map(pid => (
                    <div key={pid}>{getPlayerName(pid, data.players)}</div>
                  ))
                ) : (
                  <span className="text-gray-400 font-normal text-sm">Sem dados</span>
                )}
              </div>
              <span className="text-amber-800 text-sm font-black bg-amber-200/50 px-2.5 py-0.5 rounded-lg border border-amber-300/30">
                {tournament.reiDaQuadraType === 'individual' ? (
                  individualStats.find(s => s.id === tournament.finalRankings?.champion?.[0]) ? (
                    `${individualStats.find(s => s.id === tournament.finalRankings.champion[0])?.wins} vitórias`
                  ) : null
                ) : (
                  duoStats.find(s => s.team.includes(tournament.finalRankings?.champion?.[0] || '')) ? (
                    `${duoStats.find(s => s.team.includes(tournament.finalRankings?.champion?.[0] || ''))?.wins} vitórias`
                  ) : null
                )}
              </span>
            </div>

            {/* 3º Lugar */}
            <div className="bg-white border border-gray-200/80 shadow-sm rounded-2xl p-5 flex flex-col items-center justify-center text-center space-y-2 order-3 self-end md:h-[180px]">
              <span className="bg-amber-100 text-amber-800 text-[10px] font-black uppercase px-2.5 py-1 rounded-full tracking-wider border border-amber-200/50">
                🥉 3º Lugar
              </span>
              <div className="font-extrabold text-gray-950 text-base leading-tight">
                {tournament.finalRankings?.thirdPlace && tournament.finalRankings.thirdPlace.length > 0 ? (
                  tournament.finalRankings.thirdPlace.map(pid => (
                    <div key={pid}>{getPlayerName(pid, data.players)}</div>
                  ))
                ) : (
                  <span className="text-gray-400 font-normal text-sm">Sem dados</span>
                )}
              </div>
              <span className="text-gray-500 text-xs font-bold bg-gray-50 px-2 py-0.5 rounded">
                {tournament.reiDaQuadraType === 'individual' ? (
                  individualStats.find(s => s.id === tournament.finalRankings?.thirdPlace?.[0]) ? (
                    `${individualStats.find(s => s.id === tournament.finalRankings.thirdPlace[0])?.wins} vitórias`
                  ) : null
                ) : (
                  duoStats.find(s => s.team.includes(tournament.finalRankings?.thirdPlace?.[0] || '')) ? (
                    `${duoStats.find(s => s.team.includes(tournament.finalRankings?.thirdPlace?.[0] || ''))?.wins} vitórias`
                  ) : null
                )}
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: ACTIVE COURTS & GAMES */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-lg font-black text-gray-950 uppercase italic tracking-wider flex items-center gap-2">
            🎾 Quadras Ativas ({activeMatches.length})
          </h2>

          <div className="space-y-6">
            {activeMatches.map((m) => {
              const courtNum = m.groupId || 'Quadra 1';
              
              return (
                <div key={m.id} className="bg-white border-2 border-gray-100 rounded-3xl shadow-sm p-6 space-y-6 transition-all hover:border-gray-200">
                  
                  {/* Court Title */}
                  <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                    <span className="bg-orange-100 text-orange-800 text-xs font-black px-3.5 py-1 rounded-xl uppercase tracking-wider border border-orange-200">
                      {courtNum}
                    </span>
                    <span className="text-xs text-gray-500 font-bold flex items-center gap-1.5">
                      <span className="w-2 h-2 bg-green-500 rounded-full animate-ping"></span>
                      Em Jogo
                    </span>
                  </div>

                  {/* Players Matchup Grid */}
                  <div className="grid grid-cols-5 items-center gap-2 text-center bg-gray-50 p-4 rounded-2xl border border-gray-100">
                    
                    {/* Team 1 */}
                    <div className="col-span-2 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Dupla Defensora (Rei)</span>
                      {m.team1.map(pid => {
                        const isClickable = currentRole !== 'viewer';
                        return (
                          <div 
                            key={pid} 
                            onClick={() => {
                              if (isClickable) {
                                setSwappingCourtMatchId(m.id);
                                setPlayerToReplaceId(pid);
                              }
                            }}
                            className={`flex items-center justify-between gap-2 py-1 px-2 rounded-xl border border-transparent transition-all ${
                              isClickable 
                                ? 'hover:bg-orange-50 hover:border-orange-200 cursor-pointer group' 
                                : ''
                            }`}
                          >
                            <span className="text-sm font-extrabold text-gray-950 truncate max-w-[120px]">
                              {getPlayerName(pid, data.players)}
                            </span>
                            {isClickable && (
                              <button
                                className="text-orange-600 bg-orange-50 group-hover:bg-orange-500 group-hover:text-white p-1 rounded-lg transition-all flex items-center justify-center border border-orange-100 group-hover:border-orange-400 shadow-sm shrink-0"
                                title="Substituir/Trocar este jogador por um da fila"
                              >
                                <ArrowRightLeft className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* VS divider */}
                    <div className="col-span-1">
                      <span className="text-xs font-black text-gray-400 uppercase italic">VS</span>
                    </div>

                    {/* Team 2 */}
                    <div className="col-span-2 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Desafiantes</span>
                      {m.team2.map(pid => {
                        const isClickable = currentRole !== 'viewer';
                        return (
                          <div 
                            key={pid} 
                            onClick={() => {
                              if (isClickable) {
                                setSwappingCourtMatchId(m.id);
                                setPlayerToReplaceId(pid);
                              }
                            }}
                            className={`flex items-center justify-between gap-2 py-1 px-2 rounded-xl border border-transparent transition-all ${
                              isClickable 
                                ? 'hover:bg-orange-50 hover:border-orange-200 cursor-pointer group' 
                                : ''
                            }`}
                          >
                            <span className="text-sm font-extrabold text-gray-950 truncate max-w-[120px]">
                              {getPlayerName(pid, data.players)}
                            </span>
                            {isClickable && (
                              <button
                                className="text-orange-600 bg-orange-50 group-hover:bg-orange-500 group-hover:text-white p-1 rounded-lg transition-all flex items-center justify-center border border-orange-100 group-hover:border-orange-400 shadow-sm shrink-0"
                                title="Substituir/Trocar este jogador por um da fila"
                              >
                                <ArrowRightLeft className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>

                  </div>

                  {/* SCORE INPUT PANEL */}
                  {currentRole !== 'viewer' && (
                    <div className="space-y-4">
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-orange-50/50 border border-orange-100 rounded-2xl">
                        
                        <div className="space-y-0.5 text-center sm:text-left">
                          <span className="text-xs font-black text-orange-950 flex items-center gap-1">
                            Placar da Partida
                          </span>
                          <span className="text-[10px] text-orange-800 font-bold block">
                            Insira os sets (Ex: 21x19) ou apenas o placar final
                          </span>
                        </div>

                        {/* Input Inputs */}
                        <div className="flex items-center gap-3">
                          
                          {/* Score Input Team 1 */}
                          <input
                            type="number"
                            min={0}
                            placeholder="0"
                            value={score1[m.id] || ''}
                            onChange={(e) => setScore1(prev => ({ ...prev, [m.id]: e.target.value }))}
                            className="w-20 text-center font-mono font-black text-3xl p-3 bg-white border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 focus:outline-none transition-all"
                          />

                          <span className="text-gray-400 font-black text-xl">x</span>

                          {/* Score Input Team 2 */}
                          <input
                            type="number"
                            min={0}
                            placeholder="0"
                            value={score2[m.id] || ''}
                            onChange={(e) => setScore2(prev => ({ ...prev, [m.id]: e.target.value }))}
                            className="w-20 text-center font-mono font-black text-3xl p-3 bg-white border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 focus:outline-none transition-all"
                          />

                          <button
                            onClick={() => handleSaveResult(m)}
                            disabled={!score1[m.id] || !score2[m.id]}
                            className={`px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-md ${
                              (score1[m.id] && score2[m.id]) 
                                ? 'bg-orange-500 text-black hover:bg-orange-600 cursor-pointer shadow-orange-500/10' 
                                : 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none'
                            }`}
                          >
                            Salvar & Rotacionar
                          </button>

                        </div>

                      </div>
                    </div>
                  )}

                </div>
              );
            })}

            {activeMatches.length === 0 && (
              <div className="text-center py-12 bg-gray-50 border-2 border-dashed border-gray-200 rounded-3xl p-6">
                <AlertCircle className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                <h3 className="font-extrabold text-gray-800 text-base">Nenhum jogo ativo</h3>
                <p className="text-xs text-gray-500 mt-1">O torneio foi concluído ou precisa ser reiniciado.</p>
              </div>
            )}
          </div>

          {/* CLASSIFICATION TABLE (Standings) */}
          <div className="bg-white border border-gray-100 rounded-3xl shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h2 className="text-lg font-black text-gray-950 uppercase italic tracking-wider flex items-center gap-2">
                🏆 Classificação em Tempo Real
              </h2>
              <span className="text-xs font-semibold text-gray-500">
                Critério: {
                  tournament.reiDaQuadraChampionCriterion === 'wins' ? 'Vitórias' :
                  tournament.reiDaQuadraChampionCriterion === 'sequence' ? 'Sequência Máxima' :
                  tournament.reiDaQuadraChampionCriterion === 'win_rate' ? 'Aproveitamento (%)' :
                  'Saldo de Games'
                }
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="text-gray-500 border-b border-gray-200 text-xs uppercase tracking-wider">
                    <th className="pb-3 font-extrabold w-12">Pos</th>
                    <th className="pb-3 font-extrabold">
                      {tournament.reiDaQuadraType === 'duplas_fixas' ? 'Dupla Formada' : 'Atleta'}
                    </th>
                    <th className="pb-3 font-extrabold text-center">J</th>
                    <th className="pb-3 font-extrabold text-center">V</th>
                    <th className="pb-3 font-extrabold text-center">D</th>
                    <th className="pb-3 font-extrabold text-center text-orange-500">🔥 Seq</th>
                    <th className="pb-3 font-extrabold text-center">SG</th>
                    <th className="pb-3 font-extrabold text-center">GV</th>
                    <th className="pb-3 font-extrabold text-center">%</th>
                  </tr>
                </thead>
                <tbody>
                  {tournament.reiDaQuadraType === 'individual' ? (
                    individualStats.map((stat, idx) => {
                      const isChampion = idx === 0;
                      return (
                        <tr key={stat.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50">
                          <td className="py-3.5 font-black text-gray-400 w-12 flex items-center gap-1">
                            {idx + 1}º
                            {isChampion && <Award className="w-4 h-4 text-orange-500 inline shrink-0" />}
                          </td>
                          <td className="py-3.5 font-bold text-gray-900 truncate max-w-[200px]">
                            {stat.name}
                          </td>
                          <td className="py-3.5 font-mono text-center text-gray-600">{stat.played}</td>
                          <td className="py-3.5 font-mono text-center text-green-600 font-bold">{stat.wins}</td>
                          <td className="py-3.5 font-mono text-center text-red-500">{stat.losses}</td>
                          <td className="py-3.5 font-mono text-center font-bold text-orange-500 flex items-center justify-center gap-0.5">
                            <Flame className="w-3.5 h-3.5 shrink-0 inline" />
                            {stat.currentStreak} <span className="text-[10px] text-gray-400">({stat.maxStreak})</span>
                          </td>
                          <td className="py-3.5 font-mono text-center text-gray-900">{stat.gameBalance > 0 ? `+${stat.gameBalance}` : stat.gameBalance}</td>
                          <td className="py-3.5 font-mono text-center text-gray-500">{stat.gamesWon}</td>
                          <td className="py-3.5 font-mono text-center text-gray-500">{stat.winRate}%</td>
                        </tr>
                      );
                    })
                  ) : (
                    duoStats.map((stat, idx) => {
                      const isChampion = idx === 0;
                      return (
                        <tr key={stat.teamKey} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50">
                          <td className="py-3.5 font-black text-gray-400 w-12 flex items-center gap-1">
                            {idx + 1}º
                            {isChampion && <Award className="w-4 h-4 text-orange-500 inline shrink-0" />}
                          </td>
                          <td className="py-3.5 font-bold text-gray-900">
                            <div className="flex flex-col text-xs leading-tight">
                              <span className="font-extrabold text-sm text-gray-900">{getPlayerName(stat.team[0], data.players)}</span>
                              <span className="text-gray-500">{getPlayerName(stat.team[1], data.players)}</span>
                            </div>
                          </td>
                          <td className="py-3.5 font-mono text-center text-gray-600">{stat.played}</td>
                          <td className="py-3.5 font-mono text-center text-green-600 font-bold">{stat.wins}</td>
                          <td className="py-3.5 font-mono text-center text-red-500">{stat.losses}</td>
                          <td className="py-3.5 font-mono text-center font-bold text-orange-500 flex items-center justify-center gap-0.5">
                            <Flame className="w-3.5 h-3.5 shrink-0 inline" />
                            {stat.currentStreak} <span className="text-[10px] text-gray-400">({stat.maxStreak})</span>
                          </td>
                          <td className="py-3.5 font-mono text-center text-gray-900">{stat.gameBalance > 0 ? `+${stat.gameBalance}` : stat.gameBalance}</td>
                          <td className="py-3.5 font-mono text-center text-gray-500">{stat.gamesWon}</td>
                          <td className="py-3.5 font-mono text-center text-gray-500">{stat.winRate}%</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: QUEUE & CONTROLS */}
        <div className="space-y-6">
          
          <div className="bg-white border border-gray-100 rounded-3xl shadow-sm p-6 space-y-4">
            
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h2 className="text-lg font-black text-gray-950 uppercase italic tracking-wider flex items-center gap-2">
                📋 Fila de Espera
              </h2>
              {currentRole !== 'viewer' && (
                <button
                  onClick={() => setShowAddPlayerModal(true)}
                  className="p-1 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors flex items-center gap-1 text-xs font-black"
                >
                  <Plus className="w-4 h-4" /> Adicionar
                </button>
              )}
            </div>

            {/* Waiting list */}
            <div className="space-y-2">
              {tournament.reiDaQuadraType === 'individual' ? (
                (tournament.reiDaQuadraQueue || []).map((pid, idx) => (
                  <div key={`${pid}-${idx}`} className="bg-gray-50 p-3 rounded-xl border border-gray-100 flex items-center justify-between gap-3 shadow-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-black/5 text-[9px] font-black text-gray-500 flex items-center justify-center shrink-0">
                        {idx + 1}º
                      </span>
                      <span className="font-extrabold text-sm text-gray-950 truncate max-w-[130px]">
                        {getPlayerName(pid, data.players)}
                      </span>
                    </div>

                    {currentRole !== 'viewer' && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => moveQueueItem(idx, 'up')}
                          disabled={idx === 0}
                          className="p-1 text-gray-400 hover:text-black disabled:opacity-30 rounded transition-colors"
                        >
                          <ArrowUp className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => moveQueueItem(idx, 'down')}
                          disabled={idx === (tournament.reiDaQuadraQueue || []).length - 1}
                          className="p-1 text-gray-400 hover:text-black disabled:opacity-30 rounded transition-colors"
                        >
                          <ArrowDown className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => removeQueueItem(idx)}
                          className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                (tournament.reiDaQuadraFixedTeamsQueue || []).map((team, idx) => (
                  <div key={`${team.join('-')}-${idx}`} className="bg-gray-50 p-3 rounded-xl border border-gray-100 flex items-center justify-between gap-3 shadow-xs">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <span className="w-5 h-5 rounded-full bg-black/5 text-[9px] font-black text-gray-500 flex items-center justify-center shrink-0">
                        {idx + 1}º
                      </span>
                      <div className="flex flex-col text-xs truncate leading-snug">
                        <span className="font-extrabold text-gray-900 truncate">{getPlayerName(team[0], data.players)}</span>
                        <span className="text-gray-500 truncate">{getPlayerName(team[1], data.players)}</span>
                      </div>
                    </div>

                    {currentRole !== 'viewer' && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => moveQueueItem(idx, 'up')}
                          disabled={idx === 0}
                          className="p-1 text-gray-400 hover:text-black disabled:opacity-30 rounded transition-colors"
                        >
                          <ArrowUp className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => moveQueueItem(idx, 'down')}
                          disabled={idx === (tournament.reiDaQuadraFixedTeamsQueue || []).length - 1}
                          className="p-1 text-gray-400 hover:text-black disabled:opacity-30 rounded transition-colors"
                        >
                          <ArrowDown className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => removeQueueItem(idx)}
                          className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}

              {((tournament.reiDaQuadraType === 'individual' && (!tournament.reiDaQuadraQueue || tournament.reiDaQuadraQueue.length === 0)) ||
                (tournament.reiDaQuadraType === 'duplas_fixas' && (!tournament.reiDaQuadraFixedTeamsQueue || tournament.reiDaQuadraFixedTeamsQueue.length === 0))) && (
                <p className="text-center py-8 text-xs text-gray-400 font-bold bg-gray-50 border border-dashed border-gray-200 rounded-2xl">
                  Fila vazia. Adicione atletas para que fiquem de prontidão.
                </p>
              )}
            </div>

            {/* Latecomer player insertion (arrived late) */}
            {currentRole !== 'viewer' && (
              <div className="pt-3 border-t border-gray-100 flex flex-col gap-2">
                <button
                  onClick={() => setShowAddLatePlayerModal(true)}
                  className="w-full bg-black text-white hover:bg-gray-800 text-xs font-bold py-2 px-4 rounded-xl transition-all flex items-center justify-center gap-1.5"
                >
                  <UserPlus className="w-4 h-4" /> Atleta chegou atrasado(a)?
                </button>
              </div>
            )}

          </div>

          {/* HISTÓRICO DE JOGOS */}
          <div className="bg-white border border-gray-100 rounded-3xl shadow-sm p-6 space-y-4">
            <h2 className="text-base font-black text-gray-950 uppercase italic tracking-wider flex items-center gap-2 border-b border-gray-100 pb-3">
              <Clock className="w-4 h-4 text-orange-500" /> Histórico de Jogos ({completedMatches.length})
            </h2>

            <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
              {completedMatches.map((m, idx) => {
                const s1 = m.score1 ?? 0;
                const s2 = m.score2 ?? 0;
                const isT1Winner = s1 > s2;

                return (
                  <div key={m.id} className="bg-gray-50 p-3 rounded-xl border border-gray-100 space-y-2">
                    
                    {/* Court and Score */}
                    <div className="flex items-center justify-between text-[10px] font-bold text-gray-400 uppercase">
                      <span>{m.groupId || 'Quadra 1'}</span>
                      <span className="bg-gray-200 text-gray-700 font-black px-1.5 py-0.5 rounded">
                        Jogo #{completedMatches.length - idx}
                      </span>
                    </div>

                    <div className="grid grid-cols-5 items-center gap-1 text-xs">
                      
                      {/* T1 */}
                      <div className="col-span-2 overflow-hidden truncate font-bold text-gray-900 pr-1">
                        {m.team1.map(pid => (
                          <div key={pid} className="truncate">{getPlayerName(pid, data.players)}</div>
                        ))}
                      </div>

                      {/* Scores */}
                      <div className="col-span-1 text-center font-mono font-black text-sm bg-white border border-gray-200 py-1 rounded-lg">
                        {s1} - {s2}
                      </div>

                      {/* T2 */}
                      <div className="col-span-2 overflow-hidden truncate text-right font-bold text-gray-900 pl-1">
                        {m.team2.map(pid => (
                          <div key={pid} className="truncate">{getPlayerName(pid, data.players)}</div>
                        ))}
                      </div>

                    </div>

                    {/* Past Score Edit & Delete Actions */}
                    {currentRole !== 'viewer' && (
                      <div className="flex items-center justify-end gap-3 text-[11px] pt-2 border-t border-gray-200/60">
                        <button
                          onClick={() => openEditPastMatch(m)}
                          className="text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <Edit3 className="w-3.5 h-3.5" /> Editar Jogo
                        </button>
                        <span className="text-gray-300">|</span>
                        <button
                          onClick={() => setMatchToDelete(m)}
                          className="text-red-500 hover:text-red-700 font-bold flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Excluir
                        </button>
                      </div>
                    )}

                  </div>
                );
              })}

              {completedMatches.length === 0 && (
                <p className="text-center py-6 text-xs text-gray-400 font-bold">
                  Nenhum jogo concluído ainda.
                </p>
              )}
            </div>
          </div>

        </div>

      </div>

      {/* SWAPPING PLAYER DIALOG (Interactive) */}
      {swappingCourtMatchId && playerToReplaceId && swapCandidates && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-gray-100 shadow-2xl space-y-4 animate-in zoom-in-95 duration-250 flex flex-col max-h-[90vh]">
            <div>
              <h3 className="font-extrabold text-gray-950 text-base uppercase tracking-tight flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-orange-500" /> Substituir Atleta em Jogo
              </h3>
              <p className="text-xs text-gray-600 leading-relaxed mt-1">
                Substituir <strong>{getPlayerName(playerToReplaceId, data.players)}</strong> na quadra por qual atleta?
              </p>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 space-y-4 scrollbar-thin">
              {/* Category 1: Queue */}
              {swapCandidates.queuePlayers.length > 0 && (
                <div className="space-y-1.5">
                  <h4 className="text-[10px] uppercase font-black text-amber-600 tracking-wider flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" /> Fila de Espera
                  </h4>
                  <div className="grid grid-cols-1 gap-1.5">
                    {swapCandidates.queuePlayers.map((pid) => {
                      const queueIdx = (tournament.reiDaQuadraQueue || []).indexOf(pid);
                      return (
                        <button
                          key={`queue-${pid}`}
                          onClick={() => handleSwapPlayerOnCourt(pid)}
                          className="w-full text-left bg-gray-50 hover:bg-orange-50 hover:border-orange-200 border border-gray-100 p-2.5 rounded-xl transition-all flex items-center justify-between"
                        >
                          <span className="font-extrabold text-xs text-gray-950">{getPlayerName(pid, data.players)}</span>
                          <span className="text-[10px] bg-amber-500/10 text-amber-700 font-bold px-1.5 py-0.5 rounded">
                            #{queueIdx + 1} da Fila
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Category 2: On Court Swaps (Permute) */}
              {swapCandidates.onCourtInMatch.length > 0 && (
                <div className="space-y-1.5">
                  <h4 className="text-[10px] uppercase font-black text-orange-600 tracking-wider flex items-center gap-1.5">
                    <ArrowRightLeft className="w-3.5 h-3.5" /> Permutar com Atleta em Quadra
                  </h4>
                  <p className="text-[10px] text-gray-500 leading-tight">
                    Troca as posições/duplas entre eles diretamente na quadra atual.
                  </p>
                  <div className="grid grid-cols-1 gap-1.5">
                    {swapCandidates.onCourtInMatch.map((pid) => {
                      const activeMatch = tournament.matches.find(m => m.id === swappingCourtMatchId);
                      const isT1 = activeMatch?.team1.includes(pid);
                      const roleLabel = isT1 ? "Dupla Defensora (Rei)" : "Desafiante";
                      return (
                        <button
                          key={`court-${pid}`}
                          onClick={() => handleSwapPlayerOnCourt(pid)}
                          className="w-full text-left bg-orange-50/40 hover:bg-orange-50 hover:border-orange-200 border border-orange-100/50 p-2.5 rounded-xl transition-all flex items-center justify-between"
                        >
                          <span className="font-extrabold text-xs text-gray-950">{getPlayerName(pid, data.players)}</span>
                          <span className="text-[10px] bg-orange-500/10 text-orange-700 font-bold px-1.5 py-0.5 rounded">
                            {roleLabel}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Category 3: Other Tournament Participants */}
              {swapCandidates.otherParticipants.length > 0 && (
                <div className="space-y-1.5">
                  <h4 className="text-[10px] uppercase font-black text-green-600 tracking-wider flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" /> Outros Atletas Inscritos
                  </h4>
                  <p className="text-[10px] text-gray-500 leading-tight">
                    Substitui o atleta na quadra (o atual irá para a fila de espera).
                  </p>
                  <div className="grid grid-cols-1 gap-1.5">
                    {swapCandidates.otherParticipants.map((pid) => {
                      return (
                        <button
                          key={`other-${pid}`}
                          onClick={() => handleSwapPlayerOnCourt(pid)}
                          className="w-full text-left bg-gray-50 hover:bg-green-50 hover:border-green-200 border border-gray-100 p-2.5 rounded-xl transition-all flex items-center justify-between"
                        >
                          <span className="font-extrabold text-xs text-gray-950">{getPlayerName(pid, data.players)}</span>
                          <span className="text-[10px] bg-green-500/10 text-green-700 font-bold px-1.5 py-0.5 rounded">
                            Disponível
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {swapCandidates.queuePlayers.length === 0 && 
               swapCandidates.onCourtInMatch.length === 0 && 
               swapCandidates.otherParticipants.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-4">Nenhum outro atleta disponível.</p>
              )}
            </div>

            <button
              onClick={() => {
                setSwappingCourtMatchId(null);
                setPlayerToReplaceId(null);
              }}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* MODAL: ADD PLAYER TO WAITING LIST */}
      {showAddPlayerModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full border border-gray-100 shadow-2xl space-y-4">
            <h3 className="font-extrabold text-gray-950 text-base uppercase tracking-tight flex items-center gap-1.5">
              <PlusCircle className="w-5 h-5 text-orange-500" /> Adicionar na Fila de Espera
            </h3>
            <p className="text-xs text-gray-600">
              Selecione um atleta participante para inserir de volta na fila de espera.
            </p>

            <select
              value={selectedAddPlayerId}
              onChange={e => setSelectedAddPlayerId(e.target.value)}
              className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none bg-white font-semibold"
            >
              <option value="">-- Selecione o Atleta --</option>
              {(tournament.participants as string[]).map(pid => (
                <option key={pid} value={pid}>
                  {getPlayerName(pid, data.players)}
                </option>
              ))}
            </select>

            <div className="flex gap-3">
              <button
                onClick={() => setShowAddPlayerModal(false)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-xl text-xs font-bold transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddPlayerToQueue}
                disabled={!selectedAddPlayerId}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  selectedAddPlayerId ? 'bg-orange-500 text-black hover:bg-orange-600' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                Adicionar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD LATE PLAYER */}
      {showAddLatePlayerModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full border border-gray-100 shadow-2xl space-y-4">
            <h3 className="font-extrabold text-gray-950 text-base uppercase tracking-tight flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-orange-500" /> Atleta Chegou Atrasado(a)
            </h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              O atleta selecionado será adicionado aos participantes deste torneio e colocado imediatamente no final da fila de espera.
            </p>

            <select
              value={latePlayerId}
              onChange={e => setLatePlayerId(e.target.value)}
              className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none bg-white font-semibold"
            >
              <option value="">-- Selecione o Atleta --</option>
              {unusedTournamentPlayers.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.gender === 'M' ? 'Masc' : 'Fem'})
                </option>
              ))}
            </select>

            {unusedTournamentPlayers.length === 0 && (
              <p className="text-[11px] text-red-500 font-bold bg-red-50 p-2.5 rounded-xl text-center">
                Não há atletas disponíveis cadastrados na categoria/gênero deste torneio.
              </p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setLatePlayerId('');
                  setShowAddLatePlayerModal(false);
                }}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-xl text-xs font-bold transition-all"
              >
                Sair
              </button>
              <button
                onClick={handleAddLatePlayer}
                disabled={!latePlayerId}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  latePlayerId ? 'bg-orange-500 text-black hover:bg-orange-600' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                Inserir Atleta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT COMPLETED MATCH MODAL */}
      {matchToEdit && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full border border-gray-100 shadow-2xl space-y-5 animate-in zoom-in-95 duration-250 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-extrabold text-gray-950 text-base uppercase tracking-tight flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-blue-600" /> Editar Jogo do Histórico
              </h3>
              <button
                onClick={() => setMatchToEdit(null)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-gray-600">
              Você pode alterar o placar ou corrigir os atletas/duplas que participaram desta partida. A classificação será recalculada automaticamente ao salvar.
            </p>

            {/* Score inputs */}
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-3">
              <span className="text-[11px] font-black text-gray-400 uppercase tracking-wider block text-center">
                Placar da Partida
              </span>
              <div className="flex items-center justify-center gap-3">
                <div className="text-center">
                  <span className="text-[10px] font-bold text-gray-500 block mb-1">Time 1</span>
                  <input
                    type="number"
                    min={0}
                    value={editScore1}
                    onChange={e => setEditScore1(e.target.value)}
                    className="w-20 text-center font-mono font-black text-2xl p-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <span className="text-gray-400 font-black text-xl pt-4">x</span>
                <div className="text-center">
                  <span className="text-[10px] font-bold text-gray-500 block mb-1">Time 2</span>
                  <input
                    type="number"
                    min={0}
                    value={editScore2}
                    onChange={e => setEditScore2(e.target.value)}
                    className="w-20 text-center font-mono font-black text-2xl p-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Teams & Athletes selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Team 1 */}
              <div className="bg-orange-50/60 p-3.5 rounded-2xl border border-orange-100 space-y-2">
                <span className="text-xs font-black text-orange-950 block uppercase">
                  Atletas - Time 1
                </span>
                {editTeam1.map((pid, idx) => (
                  <div key={idx} className="space-y-1">
                    <span className="text-[10px] font-bold text-orange-800">Jogador {idx + 1}</span>
                    <select
                      value={pid}
                      onChange={e => {
                        const newTeam = [...editTeam1];
                        newTeam[idx] = e.target.value;
                        setEditTeam1(newTeam);
                      }}
                      className="w-full text-xs font-bold border border-orange-200 rounded-xl p-2 bg-white focus:ring-2 focus:ring-orange-500 focus:outline-none"
                    >
                      <option value="">-- Selecione o Atleta --</option>
                      {(tournament.participants as string[]).map(pId => (
                        <option key={pId} value={pId}>
                          {getPlayerName(pId, data.players)}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              {/* Team 2 */}
              <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-200 space-y-2">
                <span className="text-xs font-black text-gray-950 block uppercase">
                  Atletas - Time 2
                </span>
                {editTeam2.map((pid, idx) => (
                  <div key={idx} className="space-y-1">
                    <span className="text-[10px] font-bold text-gray-600">Jogador {idx + 1}</span>
                    <select
                      value={pid}
                      onChange={e => {
                        const newTeam = [...editTeam2];
                        newTeam[idx] = e.target.value;
                        setEditTeam2(newTeam);
                      }}
                      className="w-full text-xs font-bold border border-gray-200 rounded-xl p-2 bg-white focus:ring-2 focus:ring-orange-500 focus:outline-none"
                    >
                      <option value="">-- Selecione o Atleta --</option>
                      {(tournament.participants as string[]).map(pId => (
                        <option key={pId} value={pId}>
                          {getPlayerName(pId, data.players)}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-gray-100">
              <button
                onClick={() => {
                  const m = matchToEdit;
                  setMatchToEdit(null);
                  setMatchToDelete(m);
                }}
                className="w-full sm:w-auto text-red-500 hover:text-red-700 hover:bg-red-50 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" /> Excluir este Jogo
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={() => setMatchToEdit(null)}
                  className="flex-1 sm:flex-initial bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveEditedMatch}
                  className="flex-1 sm:flex-initial bg-blue-600 hover:bg-blue-700 text-white py-2.5 px-5 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md cursor-pointer"
                >
                  Salvar Alterações
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DELETE MATCH CONFIRMATION MODAL */}
      {matchToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-gray-100 shadow-2xl space-y-4 animate-in zoom-in-95 duration-250">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="font-extrabold text-gray-950 text-base uppercase tracking-tight">
                Excluir Jogo do Histórico?
              </h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                Tem certeza de que deseja excluir este jogo? As vitórias, pontuações, sequências e a classificação geral serão recalculadas automaticamente.
              </p>
            </div>

            {/* Game Summary Box */}
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-150 space-y-2 text-center">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">
                {matchToDelete.groupId || 'Quadra 1'}
              </span>
              <div className="flex items-center justify-between text-xs font-bold text-gray-900 px-2">
                <span className="truncate max-w-[120px] text-left">
                  {matchToDelete.team1.map(pid => getPlayerName(pid, data.players)).join(' + ')}
                </span>
                <span className="font-mono font-black text-sm bg-white border border-gray-200 px-2 py-0.5 rounded-md">
                  {matchToDelete.score1 ?? 0} x {matchToDelete.score2 ?? 0}
                </span>
                <span className="truncate max-w-[120px] text-right">
                  {matchToDelete.team2.map(pid => getPlayerName(pid, data.players)).join(' + ')}
                </span>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setMatchToDelete(null)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDeleteMatch}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-red-600/20 cursor-pointer"
              >
                Sim, Excluir Jogo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* END CHAMPIONSHIP MODAL */}
      {showEndModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-gray-100 shadow-2xl space-y-4">
            <h3 className="font-extrabold text-gray-950 text-base uppercase tracking-tight flex items-center gap-1.5 text-center">
              🏆 Confirmar Encerramento do Rei da Quadra
            </h3>
            <p className="text-xs text-gray-600 leading-relaxed text-center">
              Você está prestes a encerrar o campeonato. Os atletas serão ordenados de acordo com as vitórias, streaks e saldos para gerar o pódio/ranking definitivo.
            </p>

            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-150 space-y-2">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block text-center mb-1">
                Visualização do Pódio
              </span>
              {tournament.reiDaQuadraType === 'individual' ? (
                individualStats.slice(0, 3).map((stat, idx) => (
                  <div key={stat.id} className="flex items-center justify-between text-xs">
                    <span className="font-bold text-gray-500">{idx + 1}º lugar:</span>
                    <span className="font-black text-gray-950">{stat.name} ({stat.wins} vitórias)</span>
                  </div>
                ))
              ) : (
                duoStats.slice(0, 3).map((stat, idx) => (
                  <div key={stat.teamKey} className="flex items-center justify-between text-xs">
                    <span className="font-bold text-gray-500">{idx + 1}º lugar:</span>
                    <span className="font-black text-gray-950 leading-tight text-right">
                      {getPlayerName(stat.team[0], data.players)} + <br />
                      {getPlayerName(stat.team[1], data.players)} ({stat.wins} vitórias)
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowEndModal(false)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-xl text-xs font-bold transition-all"
              >
                Voltar
              </button>
              <button
                onClick={handleFinishTournament}
                className="flex-1 bg-green-500 hover:bg-green-600 text-black py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
              >
                Encerrar Campeonato
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
