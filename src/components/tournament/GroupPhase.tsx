import React, { useMemo, useState } from 'react';
import { Tournament, Match } from '../../types';
import { useAppStore } from '../../store/AppContext';
import { calculatePlayerStats, getPlayerName, PlayerStats } from '../../lib/tournament';
import { Check, CheckCircle2, RefreshCw, Trash2, X, AlertTriangle, Users, Clock, History } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '../../lib/utils';

const COURT_COLORS = [
    'text-blue-800 bg-blue-100 border-blue-200',
    'text-green-800 bg-green-100 border-green-200',
    'text-purple-800 bg-purple-100 border-purple-200',
    'text-orange-800 bg-orange-100 border-orange-200',
    'text-pink-800 bg-pink-100 border-pink-200',
    'text-teal-800 bg-teal-100 border-teal-200'
];

export default function GroupPhase({ tournament }: { tournament: Tournament }) {
  const { data, updateTournament, currentRole } = useAppStore();
  
  const [substitutingPlayerId, setSubstitutingPlayerId] = useState<string | null>(null);
  const [selectedSubstituteId, setSelectedSubstituteId] = useState<string | null>(null);
  const [isGroupStageExpanded, setIsGroupStageExpanded] = useState(tournament.status === 'group_stage');

  const withdrawnList = tournament.withdrawnPlayers || [];
  const substitutedMap = tournament.substitutedPlayers || {};

  const getParticipantIds = (): string[] => {
    const list: string[] = [];
    tournament.participants.forEach((p) => {
      if (typeof p === 'string') {
        list.push(p);
      } else {
        list.push(p.t1, p.t2);
      }
    });
    return list;
  };

  const participantIds = getParticipantIds();
  const availableSubstitutes = data.players.filter(
    (p) => !participantIds.includes(p.id)
  );

  const addLog = (type: 'withdraw' | 'substitute' | 'reactivate', message: string) => {
    const newLog = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: Date.now(),
      message,
      type
    };
    return [newLog, ...(tournament.history || [])];
  };

  const handleWithdraw = async (playerId: string) => {
    if (currentRole === 'viewer') return;
    const player = data.players.find((p) => p.id === playerId);
    if (!player) return;

    const nextWithdrawn = [...withdrawnList, playerId];
    const updatedHistory = addLog('withdraw', `O atleta ${player.name} foi marcado como desistente/machucado.`);
    await updateTournament(tournament.id, {
      withdrawnPlayers: nextWithdrawn,
      history: updatedHistory
    });
  };

  const handleReactivate = async (playerId: string) => {
    if (currentRole === 'viewer') return;
    const player = data.players.find((p) => p.id === playerId);
    if (!player) return;

    const nextWithdrawn = withdrawnList.filter((id) => id !== playerId);
    const updatedHistory = addLog('reactivate', `O atleta ${player.name} foi reativado no campeonato.`);
    await updateTournament(tournament.id, {
      withdrawnPlayers: nextWithdrawn,
      history: updatedHistory
    });
  };

  const handleSubstitute = async (newPlayerId: string) => {
    if (!substitutingPlayerId || currentRole === 'viewer') return;

    const oldPlayer = data.players.find((p) => p.id === substitutingPlayerId);
    const newPlayer = data.players.find((p) => p.id === newPlayerId);
    if (!oldPlayer || !newPlayer) return;

    // 1. Update participants list
    const updatedParticipants = tournament.participants.map((p) => {
      if (typeof p === 'string') {
        return p === substitutingPlayerId ? newPlayerId : p;
      } else {
        return {
          t1: p.t1 === substitutingPlayerId ? newPlayerId : p.t1,
          t2: p.t2 === substitutingPlayerId ? newPlayerId : p.t2,
        };
      }
    }) as any;

    // 2. Update groups list
    const updatedGroups = { ...tournament.groups };
    Object.keys(updatedGroups).forEach((gKey) => {
      updatedGroups[gKey] = (updatedGroups[gKey] as any).map((p: any) => {
        if (typeof p === 'string') {
          return p === substitutingPlayerId ? newPlayerId : p;
        } else {
          return {
            t1: p.t1 === substitutingPlayerId ? newPlayerId : p.t1,
            t2: p.t2 === substitutingPlayerId ? newPlayerId : p.t2,
          };
        }
      });
    });

    // 3. Update matches list
    const updatedMatches = tournament.matches.map((m) => {
      const nextTeam1 = m.team1.map((id) => (id === substitutingPlayerId ? newPlayerId : id));
      const nextTeam2 = m.team2.map((id) => (id === substitutingPlayerId ? newPlayerId : id));
      return {
        ...m,
        team1: nextTeam1,
        team2: nextTeam2,
      };
    });

    // 4. Update substituted map
    const nextSubstituted = {
      ...substitutedMap,
      [substitutingPlayerId]: newPlayerId,
    };

    // 5. If old player was withdrawn, remove from withdrawn list
    const nextWithdrawn = withdrawnList.filter((id) => id !== substitutingPlayerId);
    const updatedHistory = addLog('substitute', `O atleta ${oldPlayer.name} foi substituído por ${newPlayer.name}.`);

    try {
      await updateTournament(tournament.id, {
        participants: updatedParticipants,
        groups: updatedGroups,
        matches: updatedMatches,
        substitutedPlayers: nextSubstituted,
        withdrawnPlayers: nextWithdrawn,
        history: updatedHistory
      });
      setSubstitutingPlayerId(null);
    } catch (e) {
      console.error(e);
      alert('Erro ao realizar substituição.');
    }
  };

  const groupMatches = tournament.matches.filter(m => m.type === 'group');

  const updateMatchScore = (matchId: string, score1: number, score2: number, setsScore1?: number[], setsScore2?: number[]) => {
    if (currentRole === 'viewer') return;
    const updated = tournament.matches.map(m => 
      m.id === matchId 
        ? { ...m, score1, score2, setsScore1: setsScore1 || null, setsScore2: setsScore2 || null, status: 'completed' as const } 
        : m
    );
    updateTournament(tournament.id, { matches: updated });
  };

  const handleGenerateSemis = () => {
    if (groupMatches.some(m => m.status !== 'completed')) return;

    const groupKeys = Object.keys(tournament.groups).sort((a, b) => a.localeCompare(b));
    const groupsCount = groupKeys.length;
    
    const sortFn = (a: PlayerStats, b: PlayerStats) => {
      if (b.wins !== a.wins) return b.wins - a.wins;
      if (b.gameBalance !== a.gameBalance) return b.gameBalance - a.gameBalance;
      if (b.gamesWon !== a.gamesWon) return b.gamesWon - a.gamesWon;
      return a.gamesLost - b.gamesLost;
    };

    // Custom: Individual with 4 players (1 group of 4) - Round Robin completes directly
    if (tournament.modality === 'individual' && groupsCount === 1) {
      const g0 = groupKeys[0];
      const stats = calculatePlayerStats(tournament.groups[g0] as string[], groupMatches.filter(m => m.groupId === g0));
      updateTournament(tournament.id, {
        status: 'completed',
        finalRankings: {
          champion: [stats[0]?.id || ''],
          runnerUp: [stats[1]?.id || ''],
          thirdPlace: [stats[2]?.id || ''],
          fourthPlace: [stats[3]?.id || ''],
          eliminated: [],
        }
      });
      return;
    }

    // Custom: Duplas Fixas with 4 duplas (1 group of 8 players / 4 duplas) - Direct Final
    if (tournament.modality === 'duplas_fixas' && groupsCount === 1) {
      const g0 = groupKeys[0];
      const gStats = calculatePlayerStats(tournament.groups[g0] as string[], groupMatches.filter(m => m.groupId === g0));
      const seen = new Set();
      const duosInGroup = [];
      for (const stat of gStats) {
        if (seen.has(stat.id)) continue;
        const groupList = tournament.groups[g0] || [];
        const playerIndex = (groupList as any[]).indexOf(stat.id);
        const partnerIndex = playerIndex % 2 === 0 ? playerIndex + 1 : playerIndex - 1;
        const partnerId = groupList[partnerIndex] || '';
        
        seen.add(stat.id);
        seen.add(partnerId);
        duosInGroup.push({
          team: [stat.id, partnerId] as [string, string]
        });
      }

      const finalMatch: Match = {
        id: crypto.randomUUID(),
        type: 'final',
        team1: duosInGroup[0]?.team || [],
        team2: duosInGroup[1]?.team || [],
        status: 'pending'
      };

      updateTournament(tournament.id, {
        matches: [...tournament.matches, finalMatch],
        status: 'playoffs'
      });
      return;
    }

    // Custom: Individual with 8 players (2 groups of 4)
    // 2v2 Semifinals pairing top and bottom players
    if (tournament.modality === 'individual' && groupsCount === 2) {
      const g0 = groupKeys[0];
      const g1 = groupKeys[1];
      const statsA = calculatePlayerStats(tournament.groups[g0] as string[], groupMatches.filter(m => m.groupId === g0));
      const statsB = calculatePlayerStats(tournament.groups[g1] as string[], groupMatches.filter(m => m.groupId === g1));

      const sf1: Match = {
        id: crypto.randomUUID(),
        type: 'sf1',
        team1: [statsA[0]?.id || '', statsB[3]?.id || ''], // 1º do A + 4º do B
        team2: [statsB[1]?.id || '', statsA[2]?.id || ''], // 2º do B + 3º do A
        status: 'pending'
      };

      const sf2: Match = {
        id: crypto.randomUUID(),
        type: 'sf2',
        team1: [statsB[0]?.id || '', statsA[3]?.id || ''], // 1º do B + 4º do A
        team2: [statsA[1]?.id || '', statsB[2]?.id || ''], // 2º do A + 3º do B
        status: 'pending'
      };

      updateTournament(tournament.id, {
        matches: [...tournament.matches, sf1, sf2],
        status: 'playoffs'
      });
      return;
    }

    let finalDuos: [string, string][] = [];

    if (tournament.modality === 'duplas_fixas') {
      let firsts: any[] = [];
      let seconds: any[] = [];
      let thirds: any[] = [];
      let fourths: any[] = [];

      groupKeys.forEach(g => {
        const gStats = calculatePlayerStats(tournament.groups[g] as string[], groupMatches.filter(m => m.groupId === g));
        const seen = new Set();
        const duosInGroup = [];
        for (const stat of gStats) {
            if (seen.has(stat.id)) continue;
            const groupList = tournament.groups[g] || [];
            const playerIndex = (groupList as any[]).indexOf(stat.id);
            const partnerIndex = playerIndex % 2 === 0 ? playerIndex + 1 : playerIndex - 1;
            const partnerId = groupList[partnerIndex] || '';
            
            seen.add(stat.id);
            seen.add(partnerId);
            duosInGroup.push({
                ...stat,
                team: [stat.id, partnerId] as [string, string],
                groupId: g
            });
        }
        if (duosInGroup[0]) firsts.push(duosInGroup[0]);
        if (duosInGroup[1]) seconds.push(duosInGroup[1]);
        if (duosInGroup[2]) thirds.push(duosInGroup[2]);
        if (duosInGroup[3]) fourths.push(duosInGroup[3]);
      });

      firsts.sort(sortFn);
      seconds.sort(sortFn);
      thirds.sort(sortFn);
      fourths.sort(sortFn);

      let qualifiers: any[] = [];
      if (groupsCount === 1) {
        qualifiers = [...firsts, ...seconds, ...thirds, ...fourths].slice(0, 4);
      } else if (groupsCount === 2) {
        qualifiers = [...firsts, ...seconds].slice(0, 4);
      } else if (groupsCount === 3) {
        qualifiers = [...firsts, ...seconds.slice(0, 1)];
      } else {
        qualifiers = [...firsts, ...seconds].slice(0, 4);
      }

      qualifiers.sort(sortFn);

      finalDuos = [
        qualifiers[0]?.team || [],
        qualifiers[1]?.team || [],
        qualifiers[2]?.team || [],
        qualifiers[3]?.team || []
      ];
    } else if (groupsCount === 2 && tournament.modality === 'mistas_aleatorias') {
      const g0 = groupKeys[0];
      const g1 = groupKeys[1];
      const statsA = calculatePlayerStats(tournament.groups[g0] as string[], groupMatches.filter(m => m.groupId === g0));
      const statsB = calculatePlayerStats(tournament.groups[g1] as string[], groupMatches.filter(m => m.groupId === g1));

      const finalMatch: Match = {
        id: crypto.randomUUID(),
        type: 'final',
        team1: [statsA[0]?.id || '', statsB[1]?.id || ''], // Best of A + 2nd Best of B
        team2: [statsB[0]?.id || '', statsA[1]?.id || ''], // Best of B + 2nd Best of A
        status: 'pending'
      };

      updateTournament(tournament.id, {
        matches: [...tournament.matches, finalMatch],
        status: 'playoffs'
      });
      return;
    } else {
      let firsts: any[] = [];
      let seconds: any[] = [];
      let thirds: any[] = [];

      groupKeys.forEach(g => {
        const gStats = calculatePlayerStats(tournament.groups[g] as string[], groupMatches.filter(m => m.groupId === g));
        firsts.push({ ...gStats[0], groupId: g });
        seconds.push({ ...gStats[1], groupId: g });
        if (gStats[2]) thirds.push({ ...gStats[2], groupId: g });
      });

      firsts.sort(sortFn);
      seconds.sort(sortFn);
      thirds.sort(sortFn);

      let qualifiers: any[] = [];

      if (groupsCount === 3) { // 12 players
        qualifiers = [...firsts, ...seconds, ...thirds.slice(0, 2)];
      } else if (groupsCount === 4) { // 16 players
        qualifiers = [...firsts, ...seconds];
      } else if (groupsCount === 5) { // 20 players
        qualifiers = [...firsts, ...seconds.slice(0, 3)];
      } else if (groupsCount === 6) { // 24 players
        qualifiers = [...firsts, ...seconds.slice(0, 2)];
      } else {
        qualifiers = [...firsts, ...seconds].slice(0, 8);
      }

      qualifiers.sort(sortFn);

      finalDuos = [
        [qualifiers[0]?.id || '', qualifiers[7]?.id || ''],
        [qualifiers[1]?.id || '', qualifiers[6]?.id || ''],
        [qualifiers[2]?.id || '', qualifiers[5]?.id || ''],
        [qualifiers[3]?.id || '', qualifiers[4]?.id || '']
      ];
    }

    // SF1: Duo 1 vs Duo 4
    const sf1: Match = {
      id: crypto.randomUUID(),
      type: 'sf1',
      team1: finalDuos[0],
      team2: finalDuos[3],
      status: 'pending'
    };

    // SF2: Duo 2 vs Duo 3
    const sf2: Match = {
      id: crypto.randomUUID(),
      type: 'sf2',
      team1: finalDuos[1],
      team2: finalDuos[2],
      status: 'pending'
    };

    updateTournament(tournament.id, {
      matches: [...tournament.matches, sf1, sf2],
      status: 'playoffs'
    });
  };

  const handleFinishWithoutFinal = () => {
    if (groupMatches.some(m => m.status !== 'completed')) return;

    const g0 = groupKeys[0];
    const gStats = calculatePlayerStats(tournament.groups[g0] as string[], groupMatches.filter(m => m.groupId === g0));
    
    const seen = new Set();
    const duosInGroup: string[][] = [];
    for (const stat of gStats) {
      if (seen.has(stat.id)) continue;
      const groupList = (tournament.groups[g0] || []) as any[];
      const playerIndex = groupList.indexOf(stat.id);
      const partnerIndex = playerIndex % 2 === 0 ? playerIndex + 1 : playerIndex - 1;
      const partnerId = groupList[partnerIndex] || '';
      
      seen.add(stat.id);
      seen.add(partnerId);
      duosInGroup.push([stat.id, partnerId]);
    }

    updateTournament(tournament.id, {
      status: 'completed',
      finalRankings: {
        champion: duosInGroup[0] || [],
        runnerUp: duosInGroup[1] || [],
        thirdPlace: duosInGroup[2] || [],
        fourthPlace: duosInGroup[3] || [],
        eliminated: [],
      }
    });
  };

  const groupKeys = Object.keys(tournament.groups).sort((a, b) => a.localeCompare(b));
  const allCompleted = groupMatches.length > 0 && groupMatches.every(m => m.status === 'completed');
  const canCollapse = tournament.status !== 'group_stage';

  return (
    <div className={cn("space-y-8 animate-in fade-in duration-500", allCompleted && tournament.status === 'group_stage' ? 'pb-28' : '')}>
      <div 
        onClick={() => {
          if (canCollapse) {
            setIsGroupStageExpanded(!isGroupStageExpanded);
          }
        }}
        className={cn(
          "flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4 rounded-2xl transition-all select-none border",
          canCollapse ? "bg-gray-50 border-gray-200 cursor-pointer hover:bg-gray-100 shadow-sm" : "border-transparent"
        )}
      >
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold">Fase de Grupos</h2>
            {canCollapse && (
              <span className="text-xs bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider transition-colors">
                {isGroupStageExpanded ? 'Clique para recolher ▴' : 'Clique para ver tabela ▾'}
              </span>
            )}
          </div>
          <p className="text-gray-500 text-sm">
            {canCollapse ? "A fase de grupos foi concluída." : "Registre os placares para definir os classificados."}
          </p>
        </div>
        {tournament.status === 'group_stage' && currentRole !== 'viewer' && (
          <div className="flex flex-wrap gap-2.5" onClick={(e) => e.stopPropagation()}>
            {tournament.modality === 'duplas_fixas' && groupKeys.length === 1 ? (
              <>
                <button 
                  onClick={handleFinishWithoutFinal}
                  disabled={!allCompleted}
                  className={`px-5 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 ${allCompleted ? 'bg-amber-600 hover:bg-amber-700 text-white cursor-pointer shadow-sm' : 'bg-gray-200 text-gray-500 cursor-not-allowed'}`}
                >
                  Encerrar Sem Final
                </button>
                <button 
                  onClick={handleGenerateSemis}
                  disabled={!allCompleted}
                  className={`px-5 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 ${allCompleted ? 'bg-black text-white hover:bg-gray-800 cursor-pointer shadow-sm' : 'bg-gray-200 text-gray-500 cursor-not-allowed'}`}
                >
                  Avançar para Final Direta
                </button>
              </>
            ) : (
              <button 
                onClick={handleGenerateSemis}
                disabled={!allCompleted}
                className={`px-5 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 ${allCompleted ? 'bg-black text-white hover:bg-gray-800 cursor-pointer shadow-sm' : 'bg-gray-200 text-gray-500 cursor-not-allowed'}`}
              >
                {tournament.modality === 'individual' && groupKeys.length === 1 ? 'Finalizar Campeonato' : (tournament.modality === 'mistas_aleatorias' && groupKeys.length === 2) ? 'Avançar para Final' : 'Avançar para Semifinais'}
              </button>
            )}
          </div>
        )}
      </div>

      {isGroupStageExpanded && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {groupKeys.map((g, index) => {
          const groupStats = calculatePlayerStats(tournament.groups[g] as string[], groupMatches.filter(m => m.groupId === g));
          const matches = groupMatches.filter(m => m.groupId === g);
          const courtAssigned = (index % (tournament.courts || 1)) + 1;
          const isGroupCompleted = matches.length > 0 && matches.every(m => m.status === 'completed');
          const courtColor = COURT_COLORS[(courtAssigned - 1) % COURT_COLORS.length];
          
          return (
            <div key={g} className={`bg-white rounded-2xl shadow-sm border overflow-hidden flex flex-col ${isGroupCompleted ? 'border-green-200' : 'border-gray-100'}`}>
              <div className={`p-4 font-bold text-lg text-center flex items-center justify-between ${isGroupCompleted ? 'bg-green-600 text-white' : 'bg-black text-white'}`}>
                <div className="flex items-center gap-2">
                    <span>Grupo {g}</span>
                    {isGroupCompleted && <CheckCircle2 className="w-5 h-5 opacity-80" />}
                </div>
                <span className={`text-xs border rounded-lg px-3 py-1 font-extrabold tracking-wide ${courtColor}`}>
                  Quadra {courtAssigned}
                </span>
              </div>
              
              {/* Standings Table */}
              <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="text-gray-500 border-b border-gray-200">
                      <th className="pb-2 font-medium">Pos</th>
                      <th className="pb-2 font-medium">{tournament.modality === 'duplas_fixas' ? 'Dupla' : 'Atleta'}</th>
                      <th className="pb-2 font-medium text-center" title="Vitórias">V</th>
                      <th className="pb-2 font-medium text-center" title="Saldo de Games">SG</th>
                      <th className="pb-2 font-medium text-center" title="Games Vencidos">GV</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      if (tournament.modality === 'duplas_fixas') {
                        const pairedStats = [];
                        const seen = new Set();
                        for (const stat of groupStats) {
                          if (seen.has(stat.id)) continue;
                          const groupList = tournament.groups[g] || [];
                          const playerIndex = (groupList as any[]).indexOf(stat.id);
                          const partnerIndex = playerIndex % 2 === 0 ? playerIndex + 1 : playerIndex - 1;
                          const partnerId = groupList[partnerIndex] || '';
                          
                          pairedStats.push({ ...stat, partnerId });
                          seen.add(stat.id);
                          seen.add(partnerId);
                        }
                        
                        return pairedStats.map((stat, idx) => {
                          const isWithdrawn1 = withdrawnList.includes(stat.id);
                          const isWithdrawn2 = withdrawnList.includes(stat.partnerId);

                          return (
                            <tr key={stat.id} className="border-b border-gray-100 last:border-0">
                              <td className="py-2 font-bold text-gray-400 w-12">{idx + 1}º</td>
                              <td className="py-2 font-medium truncate max-w-[200px]" title={`${getPlayerName(stat.id, data.players)} + ${getPlayerName(stat.partnerId, data.players)}`}>
                                  <div className="text-sm font-bold text-gray-900 group/p1 relative pr-16 py-0.5">
                                    <span className={cn(isWithdrawn1 && "line-through text-red-500 opacity-60")}>
                                      {getPlayerName(stat.id, data.players)}
                                    </span>
                                    {currentRole !== 'viewer' && (
                                      <div className="flex items-center gap-1 absolute right-1 top-1/2 -translate-y-1/2 bg-white/95 border border-gray-200 pl-1 py-0.5 rounded-lg shadow-sm z-20">
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setSubstitutingPlayerId(stat.id);
                                          }}
                                          title="Substituir Atleta"
                                          className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                        >
                                          <RefreshCw className="w-3 h-3" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if (isWithdrawn1) {
                                              handleReactivate(stat.id);
                                            } else {
                                              handleWithdraw(stat.id);
                                            }
                                          }}
                                          title={isWithdrawn1 ? "Reativar Atleta" : "Desistência / Machucado"}
                                          className={`p-1 rounded transition-colors ${
                                            isWithdrawn1 ? 'text-green-600 hover:bg-green-50' : 'text-red-500 hover:bg-red-50'
                                          }`}
                                        >
                                          {isWithdrawn1 ? <Check className="w-3 h-3" /> : <Trash2 className="w-3 h-3" />}
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                  <div className="text-xs font-semibold text-gray-500 group/p2 relative pr-16 py-0.5">
                                    <span className={cn(isWithdrawn2 && "line-through text-red-500 opacity-60")}>
                                      {getPlayerName(stat.partnerId, data.players)}
                                    </span>
                                    {currentRole !== 'viewer' && (
                                      <div className="flex items-center gap-1 absolute right-1 top-1/2 -translate-y-1/2 bg-white/95 border border-gray-200 pl-1 py-0.5 rounded-lg shadow-sm z-20">
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setSubstitutingPlayerId(stat.partnerId);
                                          }}
                                          title="Substituir Atleta"
                                          className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                        >
                                          <RefreshCw className="w-3 h-3" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if (isWithdrawn2) {
                                              handleReactivate(stat.partnerId);
                                            } else {
                                              handleWithdraw(stat.partnerId);
                                            }
                                          }}
                                          title={isWithdrawn2 ? "Reativar Atleta" : "Desistência / Machucado"}
                                          className={`p-1 rounded transition-colors ${
                                            isWithdrawn2 ? 'text-green-600 hover:bg-green-50' : 'text-red-500 hover:bg-red-50'
                                          }`}
                                        >
                                          {isWithdrawn2 ? <Check className="w-3 h-3" /> : <Trash2 className="w-3 h-3" />}
                                        </button>
                                      </div>
                                    )}
                                  </div>
                              </td>
                              <td className="py-2 text-center text-green-600 font-bold">{stat.wins}</td>
                              <td className="py-2 text-center font-semibold">{stat.gameBalance > 0 ? `+${stat.gameBalance}` : stat.gameBalance}</td>
                              <td className="py-2 text-center text-gray-500 font-medium">{stat.gamesWon}</td>
                            </tr>
                          );
                        });
                      }

                      return groupStats.map((stat, idx) => {
                        const isWithdrawn = withdrawnList.includes(stat.id);
                        return (
                          <tr key={stat.id} className="border-b border-gray-100 last:border-0 group relative">
                            <td className="py-2 font-bold text-gray-400 w-12">{idx + 1}º</td>
                            <td className="py-2 font-medium truncate max-w-[150px] relative pr-16">
                              <span className={cn(isWithdrawn && "line-through text-red-500 opacity-60")}>
                                {getPlayerName(stat.id, data.players)}
                              </span>
                              
                              {currentRole !== 'viewer' && (
                                <div className="flex items-center gap-1 absolute right-1 top-1/2 -translate-y-1/2 bg-white/95 border border-gray-200 pl-1 py-0.5 rounded-lg shadow-sm z-20">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSubstitutingPlayerId(stat.id);
                                    }}
                                    title="Substituir Atleta"
                                    className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                  >
                                    <RefreshCw className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (isWithdrawn) {
                                        handleReactivate(stat.id);
                                      } else {
                                        handleWithdraw(stat.id);
                                      }
                                    }}
                                    title={isWithdrawn ? "Reativar Atleta" : "Desistência / Machucado"}
                                    className={`p-1 rounded transition-colors ${
                                      isWithdrawn ? 'text-green-600 hover:bg-green-50' : 'text-red-500 hover:bg-red-50'
                                    }`}
                                  >
                                    {isWithdrawn ? <Check className="w-3.5 h-3.5" /> : <Trash2 className="w-3.5 h-3.5" />}
                                  </button>
                                </div>
                              )}
                            </td>
                            <td className="py-2 text-center text-green-600 font-bold">{stat.wins}</td>
                            <td className="py-2 text-center font-semibold">{stat.gameBalance > 0 ? `+${stat.gameBalance}` : stat.gameBalance}</td>
                            <td className="py-2 text-center text-gray-500 font-medium">{stat.gamesWon}</td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>

              {/* Matches List */}
              <div className="p-4 space-y-4 bg-white flex-1">
                {matches.map((m, idx) => {
                  const t1Wins = m.status === 'completed' && (m.score1 || 0) > (m.score2 || 0);
                  const t2Wins = m.status === 'completed' && (m.score2 || 0) > (m.score1 || 0);
                  const inputBgClasses = m.status === 'completed' ? 'bg-gray-100 text-gray-900 border-transparent shadow-inner focus:bg-white focus:ring-gray-300' : 'bg-red-50 text-red-900 border-red-200 focus:bg-white focus:border-red-400 focus:ring-red-500';

                  return (
                    <div key={m.id} className={`border rounded-xl p-3 shadow-sm relative ${m.status === 'completed' ? 'border-gray-100 bg-gray-50/30' : 'border-red-100 bg-red-50/10'}`}>
                        <div className={`absolute -top-3 left-3 px-2 text-xs font-bold rounded ${m.status === 'completed' ? 'bg-white text-gray-400' : 'bg-red-100 text-red-600'}`}>
                            {tournament.modality === 'individual' ? `Rodada ${idx + 1}` : `Jogo ${idx + 1}`}
                        </div>
                        
                        <div className="flex items-center justify-between gap-2 mt-2">
                        <div className="flex-1 text-right flex items-center justify-end gap-2">
                            {t1Wins && <Check className="w-5 h-5 text-green-500 stroke-[3]" />}
                            <div className="text-right flex flex-col justify-center">
                                {getPlayerName(m.team1[0], data.players) !== 'Desconhecido' && (
                                    <div className={`text-sm font-semibold truncate leading-tight ${t1Wins ? 'text-gray-900 font-bold' : 'text-gray-600'}`}>{getPlayerName(m.team1[0], data.players)}</div>
                                )}
                                {m.team1[1] && getPlayerName(m.team1[1], data.players) !== 'Desconhecido' && (
                                    <>
                                        <div className={`text-sm font-semibold truncate leading-tight ${t1Wins ? 'text-gray-900 font-bold' : 'text-gray-600'}`}>{getPlayerName(m.team1[1], data.players)}</div>
                                    </>
                                )}
                            </div>
                        </div>
                        
                        <MatchScoresInput
                          match={m}
                          maxSets={tournament.setsGroup || 1}
                          disabled={tournament.status !== 'group_stage' || currentRole === 'viewer'}
                          onSave={(score1, score2, sets1, sets2) => {
                            updateMatchScore(m.id, score1, score2, sets1, sets2);
                          }}
                          inputBgClasses={inputBgClasses}
                        />

                        <div className="flex-1 text-left flex items-center gap-2">
                            <div className="text-left flex flex-col justify-center">
                                <div className={`text-sm font-semibold truncate leading-tight ${t2Wins ? 'text-gray-900 font-bold' : 'text-gray-600'}`}>{getPlayerName(m.team2[0], data.players) !== 'Desconhecido' ? getPlayerName(m.team2[0], data.players) : ''}</div>
                                {m.team2[1] && getPlayerName(m.team2[1], data.players) !== 'Desconhecido' && (
                                    <>
                                        <div className={`text-sm font-semibold truncate leading-tight ${t2Wins ? 'text-gray-900 font-bold' : 'text-gray-600'}`}>{getPlayerName(m.team2[1], data.players)}</div>
                                    </>
                                )}
                            </div>
                            {t2Wins && <Check className="w-5 h-5 text-green-500 stroke-[3]" />}
                        </div>
                        </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      )}

      {/* Fixed bottom bar for tournament stage advancement */}
      {allCompleted && tournament.status === 'group_stage' && currentRole !== 'viewer' && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-4 shadow-[0_-8px_30px_rgb(0,0,0,0.12)] flex items-center justify-between z-45 animate-in slide-in-from-bottom duration-300">
          <div className="hidden sm:block">
            <h4 className="font-bold text-gray-950">Fase de Grupos Concluída!</h4>
            <p className="text-xs text-gray-500">Todos os placares foram registrados. Avance para a próxima etapa.</p>
          </div>
          <div className="flex-1 sm:flex-initial flex justify-end gap-3 w-full">
            {tournament.modality === 'duplas_fixas' && groupKeys.length === 1 ? (
              <>
                <button 
                  onClick={handleFinishWithoutFinal}
                  className="flex-1 sm:flex-initial px-5 py-3 rounded-xl font-bold bg-amber-600 hover:bg-amber-700 text-white cursor-pointer shadow-sm text-sm"
                >
                  Encerrar Sem Final
                </button>
                <button 
                  onClick={handleGenerateSemis}
                  className="flex-1 sm:flex-initial px-5 py-3 rounded-xl font-bold bg-black text-white hover:bg-gray-800 cursor-pointer shadow-sm text-sm"
                >
                  Avançar para Final Direta
                </button>
              </>
            ) : (
              <button 
                onClick={handleGenerateSemis}
                className="w-full sm:w-auto px-6 py-3 rounded-xl font-bold bg-green-500 hover:bg-green-600 text-black cursor-pointer shadow-md text-sm transition-all animate-bounce"
              >
                {tournament.modality === 'individual' && groupKeys.length === 1 ? 'Finalizar Campeonato' : (tournament.modality === 'mistas_aleatorias' && groupKeys.length === 2) ? 'Avançar para Final' : 'Avançar para Semifinais'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Histórico de Alterações dos Atletas */}
      {tournament.history && tournament.history.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-50 pb-3">
            <History className="w-5 h-5 text-blue-500" />
            <h3 className="font-bold text-gray-900 text-base">Histórico de Alterações de Atletas</h3>
          </div>
          <div className="space-y-3 max-h-60 overflow-y-auto">
            {tournament.history.map((log) => (
              <div key={log.id} className="flex gap-3 text-xs items-start bg-gray-50/50 p-2.5 rounded-lg border border-gray-100/50">
                <span className="text-gray-400 font-mono shrink-0 pt-0.5">
                  {format(new Date(log.timestamp), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                </span>
                <span className="text-gray-700 font-medium leading-relaxed">
                  {log.message}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {substitutingPlayerId && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setSubstitutingPlayerId(null);
              setSelectedSubstituteId(null);
            }
          }}
        >
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden relative animate-in fade-in zoom-in-95 duration-200">
            <button
              type="button"
              onClick={() => {
                setSubstitutingPlayerId(null);
                setSelectedSubstituteId(null);
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 rounded-lg p-1 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="p-6">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-2">
                <Users className="w-5 h-5 text-blue-500" />
                Substituir Atleta
              </h3>
              <p className="text-xs text-gray-500 mb-4">
                Selecione um atleta reserva para substituir <strong>{getPlayerName(substitutingPlayerId, data.players)}</strong> no restante das partidas do campeonato.
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Selecione o Substituto</label>
                  {availableSubstitutes.length === 0 ? (
                    <div className="p-3 bg-red-50 text-red-700 rounded-xl border border-red-100 flex items-center gap-2 text-xs">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>Não há atletas cadastrados disponíveis (todos os atletas já estão participando deste campeonato). Cadastre novos atletas na aba de Atletas.</span>
                    </div>
                  ) : (
                    <select
                      onChange={(e) => {
                        setSelectedSubstituteId(e.target.value || null);
                      }}
                      defaultValue=""
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                    >
                      <option value="" disabled>Selecione um atleta...</option>
                      {availableSubstitutes.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.gender === 'M' ? 'M' : 'F'})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSubstitutingPlayerId(null);
                      setSelectedSubstituteId(null);
                    }}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium text-sm"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={!selectedSubstituteId}
                    onClick={() => {
                      if (selectedSubstituteId) {
                        handleSubstitute(selectedSubstituteId);
                        setSelectedSubstituteId(null);
                      }
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium text-sm font-bold"
                  >
                    Confirmar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MatchScoresInput({ 
  match, 
  maxSets, 
  disabled, 
  onSave,
  inputBgClasses
}: { 
  match: Match; 
  maxSets: number; 
  disabled: boolean; 
  onSave: (score1: number, score2: number, sets1: number[], sets2: number[]) => void;
  inputBgClasses: string;
}) {
  const [sets1, setSets1] = useState<string[]>(() => {
    if (match.setsScore1 && match.setsScore1.length > 0) {
      return match.setsScore1.map(v => v === undefined || v === null ? '' : String(v));
    }
    return Array(maxSets).fill('');
  });
  const [sets2, setSets2] = useState<string[]>(() => {
    if (match.setsScore2 && match.setsScore2.length > 0) {
      return match.setsScore2.map(v => v === undefined || v === null ? '' : String(v));
    }
    return Array(maxSets).fill('');
  });

  const handleBlurOrSave = (currentSets1 = sets1, currentSets2 = sets2) => {
    const parsedSets1: number[] = [];
    const parsedSets2: number[] = [];
    let completedSets = 0;
    let t1SetsWon = 0;
    let t2SetsWon = 0;

    for (let i = 0; i < maxSets; i++) {
      const val1 = currentSets1[i];
      const val2 = currentSets2[i];
      if (val1 !== '' && val2 !== '') {
        const s1 = parseInt(val1);
        const s2 = parseInt(val2);
        parsedSets1.push(s1);
        parsedSets2.push(s2);
        completedSets++;
        if (s1 > s2) t1SetsWon++;
        else if (s2 > s1) t2SetsWon++;
      } else {
        parsedSets1.push(0);
        parsedSets2.push(0);
      }
    }

    if (completedSets > 0) {
      onSave(t1SetsWon, t2SetsWon, parsedSets1, parsedSets2);
    }
  };

  if (maxSets === 1) {
    return (
      <div className="flex items-center gap-1 font-mono">
        <input
          type="number"
          min={0}
          disabled={disabled}
          className={`w-10 sm:w-12 h-10 text-center text-lg font-bold rounded-lg border focus:ring-2 p-0 transition-colors ${inputBgClasses} ${disabled ? 'cursor-not-allowed opacity-80' : ''}`}
          value={sets1[0] ?? ''}
          onChange={(e) => {
            const next = [...sets1];
            next[0] = e.target.value;
            setSets1(next);
            if (e.target.value !== '' && sets2[0] !== '') {
              handleBlurOrSave(next, sets2);
            }
          }}
          onBlur={() => handleBlurOrSave()}
          onKeyDown={(ev) => {
            if (ev.key === 'Enter') (ev.target as HTMLInputElement).blur();
          }}
        />
        <span className="text-gray-400 font-bold px-1">x</span>
        <input
          type="number"
          min={0}
          disabled={disabled}
          className={`w-10 sm:w-12 h-10 text-center text-lg font-bold rounded-lg border focus:ring-2 p-0 transition-colors ${inputBgClasses} ${disabled ? 'cursor-not-allowed opacity-80' : ''}`}
          value={sets2[0] ?? ''}
          onChange={(e) => {
            const next = [...sets2];
            next[0] = e.target.value;
            setSets2(next);
            if (sets1[0] !== '' && e.target.value !== '') {
              handleBlurOrSave(sets1, next);
            }
          }}
          onBlur={() => handleBlurOrSave()}
          onKeyDown={(ev) => {
            if (ev.key === 'Enter') (ev.target as HTMLInputElement).blur();
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5 items-center bg-gray-50/60 p-2 rounded-xl border border-gray-150/70 max-w-[200px] w-full">
      <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none mb-0.5">
        Melhor de {maxSets} Sets
      </span>
      <div className="space-y-1.5 w-full">
        {Array.from({ length: maxSets }).map((_, idx) => {
          const s1 = sets1[idx];
          const s2 = sets2[idx];
          const isT1Winner = s1 !== '' && s2 !== '' && parseInt(s1) > parseInt(s2);
          const isT2Winner = s1 !== '' && s2 !== '' && parseInt(s2) > parseInt(s1);

          return (
            <div key={idx} className="flex items-center justify-between gap-2 text-xs">
              <span className="font-bold text-gray-400 text-[10px] w-10">Set {idx + 1}</span>
              <div className="flex items-center gap-1 font-mono">
                <input
                  type="number"
                  min={0}
                  disabled={disabled}
                  className={`w-8 h-8 text-center font-bold rounded-md border text-xs p-0 transition-colors ${
                    isT1Winner ? 'bg-green-100 border-green-300 text-green-900' : 'bg-white border-gray-200 focus:ring-2'
                  } disabled:cursor-not-allowed disabled:opacity-80`}
                  value={sets1[idx] ?? ''}
                  onChange={(e) => {
                    const next = [...sets1];
                    next[idx] = e.target.value;
                    setSets1(next);
                    if (e.target.value !== '' && sets2[idx] !== '') {
                      handleBlurOrSave(next, sets2);
                    }
                  }}
                  onBlur={() => handleBlurOrSave()}
                  onKeyDown={(ev) => {
                    if (ev.key === 'Enter') (ev.target as HTMLInputElement).blur();
                  }}
                />
                <span className="text-gray-300 px-0.5 font-sans">x</span>
                <input
                  type="number"
                  min={0}
                  disabled={disabled}
                  className={`w-8 h-8 text-center font-bold rounded-md border text-xs p-0 transition-colors ${
                    isT2Winner ? 'bg-green-100 border-green-300 text-green-900' : 'bg-white border-gray-200 focus:ring-2'
                  } disabled:cursor-not-allowed disabled:opacity-80`}
                  value={sets2[idx] ?? ''}
                  onChange={(e) => {
                    const next = [...sets2];
                    next[idx] = e.target.value;
                    setSets2(next);
                    if (sets1[idx] !== '' && e.target.value !== '') {
                      handleBlurOrSave(sets1, next);
                    }
                  }}
                  onBlur={() => handleBlurOrSave()}
                  onKeyDown={(ev) => {
                    if (ev.key === 'Enter') (ev.target as HTMLInputElement).blur();
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
      {match.status === 'completed' && (
        <span className="text-[10px] font-bold text-green-600 leading-none mt-1 bg-green-50 px-1.5 py-0.5 rounded">
          Placar: {match.score1} x {match.score2}
        </span>
      )}
    </div>
  );
}
