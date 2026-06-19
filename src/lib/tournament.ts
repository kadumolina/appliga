import { Player, Tournament, Match, AppData } from '../types';

export function getPlayerName(id: string, players: Player[]) {
  return players.find(p => p.id === id)?.name || 'Desconhecido';
}

export function generateGroupMatches(
  groupId: string, 
  players: string[], 
  modality: 'individual' | 'duplas_fixas' | 'mistas_aleatorias' = 'individual',
  allPlayers: Player[] = []
): Match[] {
  
  if (modality === 'individual') {
    if (players.length !== 4) return [];
    const [p1, p2, p3, p4] = players;
    return [
      { id: crypto.randomUUID(), type: 'group', groupId, team1: [p1, p2], team2: [p3, p4], status: 'pending' },
      { id: crypto.randomUUID(), type: 'group', groupId, team1: [p1, p3], team2: [p2, p4], status: 'pending' },
      { id: crypto.randomUUID(), type: 'group', groupId, team1: [p1, p4], team2: [p2, p3], status: 'pending' }
    ];
  }
  
  if (modality === 'mistas_aleatorias') {
    if (players.length !== 4) return [];
    // Identify 2 men and 2 women
    const men = players.filter(id => allPlayers.find(p => p.id === id)?.gender === 'M');
    const women = players.filter(id => allPlayers.find(p => p.id === id)?.gender === 'F');
    if (men.length !== 2 || women.length !== 2) return [];
    
    return [
      { id: crypto.randomUUID(), type: 'group', groupId, team1: [men[0], women[0]], team2: [men[1], women[1]], status: 'pending' },
      { id: crypto.randomUUID(), type: 'group', groupId, team1: [men[0], women[1]], team2: [men[1], women[0]], status: 'pending' }
    ];
  }

  if (modality === 'duplas_fixas') {
    // Array of players represents pairs sequentially.
    // E.g., if there are 8 players, it's 4 pairs: (0,1), (2,3), (4,5), (6,7)
    const pairs: Array<[string, string]> = [];
    for (let i = 0; i < players.length; i += 2) {
      if (players[i+1]) pairs.push([players[i], players[i+1]]);
    }
    
    // Generate Round Robin for pairs
    const matches: Match[] = [];
    for (let i = 0; i < pairs.length; i++) {
      for (let j = i + 1; j < pairs.length; j++) {
        matches.push({
          id: crypto.randomUUID(),
          type: 'group',
          groupId,
          team1: pairs[i],
          team2: pairs[j],
          status: 'pending'
        });
      }
    }
    return matches;
  }

  return [];
}

// Calculate group standings 
export type PlayerStats = {
  id: string;
  matchesPlayed: number;
  wins: number;
  losses: number;
  gamesWon: number;
  gamesLost: number;
  gameBalance: number;
};

export function calculatePlayerStats(playersList: string[], matches: Match[]): PlayerStats[] {
  const stats: Record<string, PlayerStats> = {};
  
  playersList.forEach(id => {
    stats[id] = { id, matchesPlayed: 0, wins: 0, losses: 0, gamesWon: 0, gamesLost: 0, gameBalance: 0 };
  });

  matches.forEach(m => {
    if (m.status !== 'completed' || m.score1 === undefined || m.score2 === undefined) return;
    
    // team 1
    m.team1.forEach(id => {
      if (!stats[id]) return;
      stats[id].matchesPlayed += 1;
      stats[id].gamesWon += m.score1!;
      stats[id].gamesLost += m.score2!;
      stats[id].gameBalance += (m.score1! - m.score2!);
      if (m.score1! > m.score2!) stats[id].wins += 1;
      if (m.score1! < m.score2!) stats[id].losses += 1;
    });

    // team 2
    m.team2.forEach(id => {
      if (!stats[id]) return;
      stats[id].matchesPlayed += 1;
      stats[id].gamesWon += m.score2!;
      stats[id].gamesLost += m.score1!;
      stats[id].gameBalance += (m.score2! - m.score1!);
      if (m.score2! > m.score1!) stats[id].wins += 1;
      if (m.score2! < m.score1!) stats[id].losses += 1;
    });
  });

  return Object.values(stats).sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    if (b.gamesWon !== a.gamesWon) return b.gamesWon - a.gamesWon;
    if (b.gameBalance !== a.gameBalance) return b.gameBalance - a.gameBalance;
    return a.gamesLost - b.gamesLost;
  });
}

export function calculateGlobalRankings(
  data: AppData, 
  modalityFilter?: 'geral' | 'individual' | 'duplas_fixas' | 'mistas_aleatorias',
  genderFilter?: 'M' | 'F' | 'all'
) {
  const scores: Record<string, { 
    id: string, points: number, titles: number, played: number, 
    totalMatches: number, totalWins: number, totalLosses: number,
    gamesWon: number, gamesLost: number, gameBalance: number
  }> = {};
  
  data.players.forEach(p => {
    if (genderFilter && genderFilter !== 'all' && p.gender !== genderFilter) return;
    scores[p.id] = { id: p.id, points: 0, titles: 0, played: 0, totalMatches: 0, totalWins: 0, totalLosses: 0, gamesWon: 0, gamesLost: 0, gameBalance: 0 };
  });

  data.tournaments.forEach(t => {
    if (modalityFilter && modalityFilter !== 'geral' && t.modality !== modalityFilter) return;

    // Add matches to total
    t.matches.forEach(m => {
      if (m.status !== 'completed' || m.score1 === undefined || m.score2 === undefined) return;
      m.team1.forEach(id => {
        if (!scores[id]) return;
        scores[id].totalMatches += 1;
        scores[id].gamesWon += m.score1!;
        scores[id].gamesLost += m.score2!;
        scores[id].gameBalance += (m.score1! - m.score2!);
        if (m.score1! > m.score2!) scores[id].totalWins += 1;
        if (m.score1! < m.score2!) scores[id].totalLosses += 1;
      });
      m.team2.forEach(id => {
        if (!scores[id]) return;
        scores[id].totalMatches += 1;
        scores[id].gamesWon += m.score2!;
        scores[id].gamesLost += m.score1!;
        scores[id].gameBalance += (m.score2! - m.score1!);
        if (m.score2! > m.score1!) scores[id].totalWins += 1;
        if (m.score2! < m.score1!) scores[id].totalLosses += 1;
      });
    });

    if (t.status !== 'completed') return;

    const flattenRankings = Object.values(t.finalRankings).flat() as string[];
    // To avoid doubling up players if they're recorded oddly, we use a Set
    const uniquePlayers = Array.from(new Set(flattenRankings));
    uniquePlayers.forEach(pid => {
      if (scores[pid]) scores[pid].played++;
    });

    t.finalRankings.champion.forEach(pid => {
      if (scores[pid]) { scores[pid].points += 100; scores[pid].titles++; }
    });
    t.finalRankings.runnerUp.forEach(pid => {
      if (scores[pid]) scores[pid].points += 80;
    });
    t.finalRankings.thirdPlace.forEach(pid => {
      if (scores[pid]) scores[pid].points += 65;
    });
    t.finalRankings.fourthPlace.forEach(pid => {
      if (scores[pid]) scores[pid].points += 55;
    });
    
    // Eliminated points (45, 40, 35, 30...)
    t.finalRankings.eliminated.forEach((pid, idx) => {
      const p = Math.max(10, 45 - (idx * 5)); // Minimum 10 points
      if (scores[pid]) {
        scores[pid].points += p;
      }
    });
  });

  return Object.values(scores)
    .map(s => {
      const winRate = s.totalMatches > 0 ? (s.totalWins / s.totalMatches) * 100 : 0;
      let stars = 1;
      if (s.totalMatches > 0) {
        if (winRate >= 80) stars = 5;
        else if (winRate >= 60) stars = 4;
        else if (winRate >= 40) stars = 3;
        else if (winRate >= 20) stars = 2;
      }
      return {
        ...s,
        winRate,
        stars
      };
    })
    .sort((a, b) => b.points - a.points || b.titles - a.titles || b.winRate - a.winRate || b.played - a.played);
}
