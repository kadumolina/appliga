import React, { useState } from 'react';
import { Tournament, Match } from '../../types';
import { useAppStore } from '../../store/AppContext';
import { getPlayerName, calculatePlayerStats } from '../../lib/tournament';
import { RefreshCw, Users, X, AlertTriangle, ArrowRightLeft } from 'lucide-react';

export default function PlayoffPhase({ tournament }: { tournament: Tournament }) {
  const { data, updateTournament, currentRole } = useAppStore();

  const [substitutingPlayerId, setSubstitutingPlayerId] = useState<string | null>(null);
  const [selectedSubstituteId, setSelectedSubstituteId] = useState<string | null>(null);

  const [showPlayoffEndModal, setShowPlayoffEndModal] = useState(false);
  const [playoffEndType, setPlayoffEndType] = useState<'normal' | 'without-final'>('normal');
  const [playoffSumRanking, setPlayoffSumRanking] = useState(true);

  const [showManageBracketsModal, setShowManageBracketsModal] = useState(false);
  const [activeSwapSource, setActiveSwapSource] = useState<{
    matchId: string;
    teamKey: 'team1' | 'team2';
    playerIndex?: number;
    playerId?: string;
  } | null>(null);

  const handleConfirmFinish = () => {
    if (playoffEndType === 'normal') {
      handleFinish(playoffSumRanking);
    } else {
      handleFinishWithoutFinalDirectly(playoffSumRanking);
    }
  };

  const handleSwapEntireTeams = (
    matchIdA: string,
    teamKeyA: 'team1' | 'team2',
    matchIdB: string,
    teamKeyB: 'team1' | 'team2'
  ) => {
    const matchA = tournament.matches.find(m => m.id === matchIdA);
    const matchB = tournament.matches.find(m => m.id === matchIdB);
    if (!matchA || !matchB) return;

    const updatedMatches = tournament.matches.map(m => {
      if (m.id === matchIdA) {
        return {
          ...m,
          [teamKeyA]: matchB[teamKeyB]
        };
      }
      if (m.id === matchIdB) {
        return {
          ...m,
          [teamKeyB]: matchA[teamKeyA]
        };
      }
      return m;
    });

    const message = `Ajuste de chaves: as duplas foram trocadas entre os confrontos do mata-mata.`;
    const newLog = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: Date.now(),
      message,
      type: 'substitute' as const
    };
    const updatedHistory = [newLog, ...(tournament.history || [])];

    updateTournament(tournament.id, {
      matches: updatedMatches,
      history: updatedHistory
    });
  };

  const handleSwapIndividualPlayers = (
    matchIdA: string,
    teamKeyA: 'team1' | 'team2',
    playerIndexA: number,
    matchIdB: string,
    teamKeyB: 'team1' | 'team2',
    playerIndexB: number
  ) => {
    const matchA = tournament.matches.find(m => m.id === matchIdA);
    const matchB = tournament.matches.find(m => m.id === matchIdB);
    if (!matchA || !matchB) return;

    const playerA = matchA[teamKeyA][playerIndexA];
    const playerB = matchB[teamKeyB][playerIndexB];

    const updatedMatches = tournament.matches.map(m => {
      let nextTeam1 = [...m.team1];
      let nextTeam2 = [...m.team2];

      if (m.id === matchIdA) {
        if (teamKeyA === 'team1') {
          nextTeam1[playerIndexA] = playerB;
        } else {
          nextTeam2[playerIndexA] = playerB;
        }
      }
      if (m.id === matchIdB) {
        if (teamKeyB === 'team1') {
          nextTeam1[playerIndexB] = playerA;
        } else {
          nextTeam2[playerIndexB] = playerA;
        }
      }

      return {
        ...m,
        team1: nextTeam1,
        team2: nextTeam2
      };
    });

    const nameA = getPlayerName(playerA, data.players);
    const nameB = getPlayerName(playerB, data.players);
    const message = `Ajuste de chaves: os atletas ${nameA} e ${nameB} foram trocados de posição.`;
    const newLog = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: Date.now(),
      message,
      type: 'substitute' as const
    };
    const updatedHistory = [newLog, ...(tournament.history || [])];

    updateTournament(tournament.id, {
      matches: updatedMatches,
      history: updatedHistory
    });
  };

  const handleSubstituteForPlayerDirect = async (oldPlayerId: string, newPlayerId: string) => {
    if (currentRole === 'viewer') return;

    const oldPlayer = data.players.find((p) => p.id === oldPlayerId);
    const newPlayer = data.players.find((p) => p.id === newPlayerId);
    if (!oldPlayer || !newPlayer) return;

    const updatedParticipants = tournament.participants.map((p) => {
      if (typeof p === 'string') {
        return p === oldPlayerId ? newPlayerId : p;
      } else {
        return {
          t1: p.t1 === oldPlayerId ? newPlayerId : p.t1,
          t2: p.t2 === oldPlayerId ? newPlayerId : p.t2,
        };
      }
    }) as any;

    const updatedGroups = { ...tournament.groups };
    Object.keys(updatedGroups).forEach((gKey) => {
      updatedGroups[gKey] = (updatedGroups[gKey] as any).map((p: any) => {
        if (typeof p === 'string') {
          return p === oldPlayerId ? newPlayerId : p;
        } else {
          return {
            t1: p.t1 === oldPlayerId ? newPlayerId : p.t1,
            t2: p.t2 === oldPlayerId ? newPlayerId : p.t2,
          };
        }
      });
    });

    const updatedMatches = tournament.matches.map((m) => {
      const nextTeam1 = m.team1.map((id) => (id === oldPlayerId ? newPlayerId : id));
      const nextTeam2 = m.team2.map((id) => (id === oldPlayerId ? newPlayerId : id));
      return {
        ...m,
        team1: nextTeam1,
        team2: nextTeam2,
      };
    });

    const nextSubstituted = {
      ...(tournament.substitutedPlayers || {}),
      [oldPlayerId]: newPlayerId,
    };

    const newLog = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: Date.now(),
      message: `O atleta ${oldPlayer.name} foi substituído por ${newPlayer.name} nas Eliminatórias.`,
      type: 'substitute' as const
    };
    const updatedHistory = [newLog, ...(tournament.history || [])];

    try {
      await updateTournament(tournament.id, {
        participants: updatedParticipants,
        groups: updatedGroups,
        matches: updatedMatches,
        substitutedPlayers: nextSubstituted,
        history: updatedHistory
      });
    } catch (e) {
      console.error(e);
      alert('Erro ao realizar substituição.');
    }
  };

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

  const getMatch = (type: string) => tournament.matches.find(m => m.type === type);
  
  const sf1 = getMatch('sf1');
  const sf2 = getMatch('sf2');
  const final = getMatch('final');
  const third = getMatch('3rd');

  const isDirectFinal = !sf1 && !sf2;

  const updateMatchScore = (matchId: string, score1: number, score2: number, setsScore1?: number[], setsScore2?: number[]) => {
    if (currentRole === 'viewer') return;
    let updated = tournament.matches.map(m => 
      m.id === matchId 
        ? { ...m, score1, score2, setsScore1: setsScore1 || null, setsScore2: setsScore2 || null, status: 'completed' as const } 
        : m
    );

    // If it's a semifinal, check if both SF are done to generate Finals
    const newSf1 = updated.find(m => m.type === 'sf1');
    const newSf2 = updated.find(m => m.type === 'sf2');
    
    if ((matchId === sf1?.id || matchId === sf2?.id) && newSf1?.status === 'completed' && newSf2?.status === 'completed') {
      const hasFinal = updated.some(m => m.type === 'final');
      if (!hasFinal) {
        const sf1Winner = newSf1.score1! > newSf2.score2! ? newSf1.team1 : newSf1.team2;
        const sf1Loser = newSf1.score1! < newSf2.score2! ? newSf1.team1 : newSf1.team2;
        
        // Wait, fixing logic: score1 > score2!
        const w1 = newSf1.score1! > newSf1.score2! ? newSf1.team1 : newSf1.team2;
        const l1 = newSf1.score1! < newSf1.score2! ? newSf1.team1 : newSf1.team2;
        
        const w2 = newSf2.score1! > newSf2.score2! ? newSf2.team1 : newSf2.team2;
        const l2 = newSf2.score1! < newSf2.score2! ? newSf2.team1 : newSf2.team2;

        updated.push({
          id: crypto.randomUUID(),
          type: 'final',
          team1: w1,
          team2: w2,
          status: 'pending'
        });

        updated.push({
          id: crypto.randomUUID(),
          type: '3rd',
          team1: l1,
          team2: l2,
          status: 'pending'
        });
      }
    }

    updateTournament(tournament.id, { matches: updated });
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

    // 3. Update matches list (replaces player inside ALL matches, including playoff ones!)
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
      ...(tournament.substitutedPlayers || {}),
      [substitutingPlayerId]: newPlayerId,
    };

    // 5. Update history
    const newLog = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: Date.now(),
      message: `O atleta ${oldPlayer.name} foi substituído por ${newPlayer.name} nas Eliminatórias.`,
      type: 'substitute' as const
    };
    const updatedHistory = [newLog, ...(tournament.history || [])];

    try {
      await updateTournament(tournament.id, {
        participants: updatedParticipants,
        groups: updatedGroups,
        matches: updatedMatches,
        substitutedPlayers: nextSubstituted,
        history: updatedHistory
      });
      setSubstitutingPlayerId(null);
    } catch (e) {
      console.error(e);
      alert('Erro ao realizar substituição.');
    }
  };

  const handleFinish = (isRanked: boolean = true) => {
    // Collect all eliminated players from group stage
    const groupMatches = tournament.matches.filter(m => m.type === 'group');
    
    const fMatch = getMatch('final')!;

    const champion = fMatch.score1! > fMatch.score2! ? fMatch.team1 : fMatch.team2;
    const runnerUp = fMatch.score1! < fMatch.score2! ? fMatch.team1 : fMatch.team2;

    let thirdPlace: string[] = [];
    let fourthPlace: string[] = [];

    if (isDirectFinal) {
      // Get 3rd and 4th place from the group phase standings
      const gKeys = Object.keys(tournament.groups).sort((a, b) => a.localeCompare(b));
      const gStats = calculatePlayerStats(tournament.groups[gKeys[0]] as string[], groupMatches);
      
      const seen = new Set();
      const duosInGroup: string[][] = [];
      for (const stat of gStats) {
        if (seen.has(stat.id)) continue;
        const groupList = (tournament.groups[gKeys[0]] || []) as any[];
        const playerIndex = groupList.indexOf(stat.id);
        const partnerIndex = playerIndex % 2 === 0 ? playerIndex + 1 : playerIndex - 1;
        const partnerId = groupList[partnerIndex] || '';
        
        seen.add(stat.id);
        seen.add(partnerId);
        duosInGroup.push([stat.id, partnerId]);
      }
      thirdPlace = duosInGroup[2] || [];
      fourthPlace = duosInGroup[3] || [];
    } else {
      const tMatch = getMatch('3rd')!;
      thirdPlace = tMatch.score1! > tMatch.score2! ? tMatch.team1 : tMatch.team2;
      fourthPlace = tMatch.score1! < tMatch.score2! ? tMatch.team1 : tMatch.team2;
    }

    const top8 = [...champion, ...runnerUp, ...thirdPlace, ...fourthPlace];
    const participantsList = tournament.participants.map(p => typeof p === 'string' ? p : [p.t1, p.t2]).flat() as string[];
    const eliminatedIds = participantsList.filter(id => !top8.includes(id));
    
    const eliminatedStats = calculatePlayerStats(eliminatedIds, groupMatches);
    const finalEliminated = eliminatedStats.map(s => s.id); // already sorted by playerStats logic

    updateTournament(tournament.id, {
      status: 'completed',
      isRanked: isRanked,
      finalRankings: {
        champion,
        runnerUp,
        thirdPlace,
        fourthPlace,
        eliminated: finalEliminated
      }
    });
  };

  const handleFinishWithoutFinalDirectly = (isRanked: boolean = true) => {
    const groupMatches = tournament.matches.filter(m => m.type === 'group');
    const gKeys = Object.keys(tournament.groups).sort((a, b) => a.localeCompare(b));
    const gStats = calculatePlayerStats(tournament.groups[gKeys[0]] as string[], groupMatches);
    
    const seen = new Set();
    const duosInGroup: string[][] = [];
    for (const stat of gStats) {
      if (seen.has(stat.id)) continue;
      const groupList = (tournament.groups[gKeys[0]] || []) as any[];
      const playerIndex = groupList.indexOf(stat.id);
      const partnerIndex = playerIndex % 2 === 0 ? playerIndex + 1 : playerIndex - 1;
      const partnerId = groupList[partnerIndex] || '';
      
      seen.add(stat.id);
      seen.add(partnerId);
      duosInGroup.push([stat.id, partnerId]);
    }

    updateTournament(tournament.id, {
      status: 'completed',
      isRanked: isRanked,
      finalRankings: {
        champion: duosInGroup[0] || [],
        runnerUp: duosInGroup[1] || [],
        thirdPlace: duosInGroup[2] || [],
        fourthPlace: duosInGroup[3] || [],
        eliminated: [],
      }
    });
  };

  const MatchCard = ({ match, title }: { match?: Match, title: string }) => {
    if (!match) return <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl h-32 flex items-center justify-center text-gray-400 font-medium p-4 text-center text-sm md:text-base">Aguardando {title}</div>;

    const t1Wins = match.status === 'completed' && (match.score1 || 0) > (match.score2 || 0);
    const t2Wins = match.status === 'completed' && (match.score2 || 0) > (match.score1 || 0);
    const inputBgClasses = match.status === 'completed' ? 'bg-gray-100 text-gray-900 border-transparent shadow-inner focus:bg-white focus:ring-gray-300' : 'bg-red-50 text-red-900 border-red-200 focus:bg-white focus:border-red-400 focus:ring-red-500';

    const renderPlayerLine = (playerId?: string, isWinner?: boolean, align: 'left' | 'right' = 'left') => {
      if (!playerId) return null;
      const name = getPlayerName(playerId, data.players);
      if (name === 'Desconhecido') return null;
      return (
        <div className="flex items-center gap-2 group/p relative py-1">
          <span className={`text-sm font-semibold truncate leading-tight ${isWinner ? 'text-gray-900 font-bold' : 'text-gray-605'}`}>
            {name}
          </span>
          {currentRole !== 'viewer' && tournament.status !== 'completed' && (
            <button
              onClick={() => setSubstitutingPlayerId(playerId)}
              title="Substituir Atleta"
              className="p-1 text-blue-600 hover:bg-blue-50 bg-blue-50/60 border border-blue-100 rounded-lg transition-all cursor-pointer shrink-0 inline-flex items-center justify-center shadow-sm"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      );
    };

    return (
      <div className={`rounded-2xl p-4 shadow-sm border relative ${match.status === 'completed' ? 'border-gray-100 bg-gray-50/30' : 'border-red-100 bg-red-50/10'}`}>
        <div className="flex justify-between items-center mb-3">
          <h4 className={`text-xs md:text-sm font-black uppercase tracking-wider ${match.status === 'completed' ? 'text-gray-500' : 'text-red-900'}`}>
            {title}
          </h4>
          {match.status === 'completed' && (
            <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full uppercase tracking-wider">
              Finalizado
            </span>
          )}
        </div>
        
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="w-full space-y-3 sm:flex-1">
            <div className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
              t1Wins ? 'bg-green-50/30 border-green-200/50' : 'bg-white border-gray-150'
            }`}>
              <div className="flex items-center gap-2">
                {t1Wins && <span className="text-green-500 font-bold shrink-0">✓</span>}
                <div className="flex flex-col">
                  {renderPlayerLine(match.team1[0], t1Wins, 'left')}
                  {renderPlayerLine(match.team1[1], t1Wins, 'left')}
                </div>
              </div>
            </div>

            <div className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
              t2Wins ? 'bg-green-50/30 border-green-200/50' : 'bg-white border-gray-150'
            }`}>
              <div className="flex items-center gap-2">
                {t2Wins && <span className="text-green-500 font-bold shrink-0">✓</span>}
                <div className="flex flex-col">
                  {renderPlayerLine(match.team2[0], t2Wins, 'left')}
                  {renderPlayerLine(match.team2[1], t2Wins, 'left')}
                </div>
              </div>
            </div>
          </div>

          <div className="w-full sm:w-auto shrink-0 flex justify-center sm:justify-end">
            <MatchScoresInput
              match={match}
              maxSets={tournament.setsPlayoff || 1}
              disabled={tournament.status === 'completed' || currentRole === 'viewer'}
              onSave={(score1, score2, sets1, sets2) => {
                updateMatchScore(match.id, score1, score2, sets1, sets2);
              }}
              inputBgClasses={inputBgClasses}
            />
          </div>
        </div>
      </div>
    );
  };

  const allCompleted = isDirectFinal
    ? final?.status === 'completed'
    : final?.status === 'completed' && third?.status === 'completed';

  const uncompletedMatches = tournament.matches.filter(
    m => m.type !== 'group' && m.status !== 'completed'
  );

  return (
    <div className="space-y-12 animate-in fade-in duration-500">
      
      {tournament.status !== 'completed' && currentRole !== 'viewer' && uncompletedMatches.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between bg-white rounded-2xl border border-gray-150 p-5 shadow-xs">
          <div className="flex gap-3 items-start">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500 shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-gray-950 text-sm sm:text-base">Gerenciar Chaves & Duplas</h4>
              <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                Reordene as chaves, troque duplas de semifinal ou mude atletas de posição antes dos confrontos começarem.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowManageBracketsModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all shadow-sm flex items-center justify-center gap-2 shrink-0 cursor-pointer"
          >
            <ArrowRightLeft className="w-4 h-4" />
            Ajustar Chaves / Duplas
          </button>
        </div>
      )}

      {tournament.status !== 'completed' && currentRole !== 'viewer' && uncompletedMatches.length === 0 && (
        <div className="bg-blue-50 text-blue-800 rounded-2xl border border-blue-100 p-4 text-xs sm:text-sm flex items-center gap-2.5 shadow-sm">
          <Users className="w-5 h-5 text-blue-500 shrink-0" />
          <div>
            <span className="font-bold text-blue-900">Alteração de Duplas:</span> É possível alterar integrantes das duplas manualmente a qualquer momento do mata-mata. Basta passar o mouse ou tocar sobre o nome de um atleta nas partidas abaixo e clicar no botão <RefreshCw className="w-3 h-3 inline text-blue-600 mx-0.5" /> para substituí-lo.
          </div>
        </div>
      )}

      {tournament.status === 'completed' && (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 text-center animate-in fade-in zoom-in duration-500 mb-8">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">🏆</span>
          </div>
          <h2 className="text-3xl font-black text-gray-900 mb-2">Campeonato Finalizado!</h2>
          <p className="text-gray-500 mb-8">O ranking foi atualizado com base nos resultados.</p>

          <div className="flex flex-col md:grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="bg-gradient-to-b from-yellow-100 to-white pt-8 pb-6 px-4 rounded-3xl md:rounded-t-3xl md:rounded-b-none border border-yellow-200 shadow-xl relative z-10 order-1 md:order-2">
              <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-yellow-400 text-yellow-900 w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ring-4 ring-white">1</div>
              <h3 className="font-bold text-xl text-gray-900">{getPlayerName(tournament.finalRankings.champion[0], data.players)}</h3>
              <h3 className="font-bold text-xl text-gray-900">{getPlayerName(tournament.finalRankings.champion[1], data.players)}</h3>
              <span className="text-xs font-bold text-yellow-600 uppercase tracking-widest mt-2 block">{tournament.points1 || 100} Pontos</span>
            </div>

            <div className="bg-gradient-to-b from-gray-100 to-white pt-6 pb-6 px-4 rounded-3xl md:rounded-t-3xl md:rounded-b-none border border-gray-200 md:mt-8 relative order-2 md:order-1 mt-4 md:mt-0">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gray-200 text-gray-700 w-8 h-8 rounded-full flex items-center justify-center font-bold">2</div>
              <h3 className="font-bold text-gray-900">{getPlayerName(tournament.finalRankings.runnerUp[0], data.players)}</h3>
              <h3 className="font-bold text-gray-900">{getPlayerName(tournament.finalRankings.runnerUp[1], data.players)}</h3>
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-2 block">{tournament.points2 || 80} Pontos</span>
            </div>
            
            <div className="bg-gradient-to-b from-orange-100 to-white pt-6 pb-6 px-4 rounded-3xl md:rounded-t-3xl md:rounded-b-none border border-orange-200 md:mt-12 relative order-3 md:order-3 mt-4 md:mt-0">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-orange-300 text-orange-900 w-8 h-8 rounded-full flex items-center justify-center font-bold">3</div>
              <h3 className="font-bold text-gray-900">{getPlayerName(tournament.finalRankings.thirdPlace[0], data.players)}</h3>
              <h3 className="font-bold text-gray-900">{getPlayerName(tournament.finalRankings.thirdPlace[1], data.players)}</h3>
              <span className="text-xs font-bold text-orange-600 uppercase tracking-widest mt-2 block">{tournament.points3 || 65} Pontos</span>
            </div>
          </div>
        </div>
      )}

      {isDirectFinal && tournament.status !== 'completed' && currentRole !== 'viewer' && (
        <div className="bg-white border border-amber-200 p-6 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
          <div>
            <h3 className="font-bold text-lg text-amber-900">Opções do Campeonato</h3>
            <p className="text-gray-500 text-sm">Você pode preencher o placar da Grande Final ou encerrar o campeonato imediatamente usando as posições atuais da fase de grupos.</p>
          </div>
          <button 
            onClick={() => {
              setPlayoffEndType('without-final');
              setShowPlayoffEndModal(true);
            }}
            className="bg-amber-600 hover:bg-amber-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-colors shadow-sm"
          >
            Encerrar Sem Final
          </button>
        </div>
      )}

      {!isDirectFinal && (
        <div>
          <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
            <span className="w-8 h-8 rounded-xl bg-gray-900 text-white flex items-center justify-center text-sm">1</span> 
            Semifinais
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <MatchCard match={sf1} title="Semifinal 1" />
            <MatchCard match={sf2} title="Semifinal 2" />
          </div>
        </div>
      )}

      <div className={`grid grid-cols-1 gap-6 pt-6 border-t border-gray-200 ${isDirectFinal ? 'max-w-lg mx-auto' : 'lg:grid-cols-2'}`}>
        <div>
          <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3 text-yellow-600">
            <span className="w-8 h-8 rounded-xl bg-yellow-400 text-yellow-900 flex items-center justify-center text-sm">
              {isDirectFinal ? '1' : '2'}
            </span> 
            Grande Final
          </h3>
          <MatchCard match={final} title="Final" />
        </div>
        {!isDirectFinal && (
          <div>
            <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3 text-orange-600">
              <span className="w-8 h-8 rounded-xl bg-orange-200 text-orange-900 flex items-center justify-center text-sm">3</span> 
              Terceiro Lugar
            </h3>
            <MatchCard match={third} title="Disputa - 3º Lugar" />
          </div>
        )}
      </div>

      {allCompleted && tournament.status !== 'completed' && currentRole !== 'viewer' && (
        <div className="mt-8 bg-green-50 border-2 border-green-500 p-6 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg shadow-green-500/5 animate-in slide-in-from-bottom duration-300">
          <div>
            <h3 className="font-extrabold text-xl text-green-950 flex items-center gap-2">
              🏆 Finais Concluídas
            </h3>
            <p className="text-green-800 text-sm mt-1">
              Todos os jogos eliminatórios foram preenchidos! Você já pode salvar os resultados e finalizar o campeonato.
            </p>
          </div>
          <button 
            onClick={() => {
              setPlayoffEndType('normal');
              setShowPlayoffEndModal(true);
            }}
            className="w-full sm:w-auto bg-green-500 hover:bg-green-600 text-black px-8 py-3.5 rounded-2xl font-black text-sm uppercase tracking-wider transition-all duration-200 shadow-md shadow-green-500/20 active:scale-95 shrink-0"
          >
            Finalizar Campeonato
          </button>
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
                Selecione um atleta reserva para substituir <strong>{getPlayerName(substitutingPlayerId, data.players)}</strong> nas Eliminatórias deste campeonato.
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

      {showPlayoffEndModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl border border-gray-100 relative animate-in zoom-in-95 duration-200">
            <button 
              onClick={() => setShowPlayoffEndModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-xl font-bold mb-2 text-gray-900">
              Encerrar Campeonato
            </h3>
            <p className="text-gray-600 text-sm mb-6 leading-relaxed">
              Você tem certeza que deseja encerrar o campeonato? Esta ação não pode ser desfeita. O pódio e as classificações finais serão gerados com base nos resultados das partidas jogadas até o momento.
            </p>
            
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200/50 space-y-4 mb-6 text-left">
              <span className="font-bold text-xs text-gray-500 uppercase tracking-wider block">Configuração de Ranking</span>
              
              <label className="flex items-start gap-3 cursor-pointer">
                <input 
                  type="checkbox"
                  checked={playoffSumRanking}
                  onChange={(e) => setPlayoffSumRanking(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                />
                <div className="text-sm">
                  <span className="font-semibold text-gray-800 block">Somar ao Ranking Geral</span>
                  <span className="text-xs text-gray-500">As pontuações e partidas deste torneio serão computadas no ranking dos atletas.</span>
                </div>
              </label>
            </div>

            <div className="flex gap-3 justify-end">
              <button 
                onClick={() => setShowPlayoffEndModal(false)}
                className="px-4 py-2 font-semibold text-gray-700 hover:bg-gray-100 rounded-xl text-sm"
              >
                Cancelar
              </button>
              <button 
                onClick={handleConfirmFinish}
                className="px-4 py-2 font-bold text-white bg-green-500 hover:bg-green-600 rounded-xl text-sm shadow-sm transition-colors"
              >
                Confirmar e Encerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {showManageBracketsModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 w-full max-w-2xl shadow-2xl border border-gray-100 relative animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <button 
              onClick={() => {
                setShowManageBracketsModal(false);
                setActiveSwapSource(null);
              }}
              className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 p-1.5 hover:bg-gray-100 rounded-xl transition-all"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-black text-gray-900 mb-1 flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5 text-blue-500" />
              Ajustar Confrontos e Chaves
            </h3>
            <p className="text-gray-500 text-xs mb-6">
              Selecione as duplas ou atletas individuais abaixo para trocá-los de chaves, reorganizar confrontos ou alterar a composição das duplas antes que os jogos ocorram.
            </p>

            {activeSwapSource ? (
              <div className="bg-blue-50/70 border border-blue-100 rounded-2xl p-4 mb-6">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">Passo 2: Selecione o Destino da Troca</span>
                    <h4 className="text-sm font-bold text-gray-800">
                      {activeSwapSource.playerIndex !== undefined ? (
                        <>Trocando o atleta: <strong className="text-blue-700">{getPlayerName(activeSwapSource.playerId, data.players)}</strong></>
                      ) : (
                        <>Trocando toda a dupla do confronto <strong className="text-blue-700">{
                          activeSwapSource.matchId === sf1?.id ? 'Semifinal 1' :
                          activeSwapSource.matchId === sf2?.id ? 'Semifinal 2' :
                          activeSwapSource.matchId === final?.id ? 'Grande Final' : 'Terceiro Lugar'
                        } ({activeSwapSource.teamKey === 'team1' ? 'Lado A' : 'Lado B'})</strong></>
                      )}
                    </h4>
                  </div>
                  <button 
                    onClick={() => setActiveSwapSource(null)}
                    className="text-xs font-bold text-blue-600 hover:text-blue-800 bg-white border border-blue-200 px-3 py-1 rounded-lg shadow-xs"
                  >
                    Cancelar Seleção
                  </button>
                </div>

                {activeSwapSource.playerIndex !== undefined ? (
                  <div className="space-y-4">
                    <div>
                      <span className="text-xs font-black text-gray-400 uppercase tracking-wider block mb-2">Destinos no Mata-Mata (Trocar posições):</span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {uncompletedMatches.map(m => {
                          const matchTitle = m.type === 'sf1' ? 'Semifinal 1' : m.type === 'sf2' ? 'Semifinal 2' : m.type === 'final' ? 'Grande Final' : '3º Lugar';
                          return (
                            <React.Fragment key={m.id}>
                              {m.team1.map((pId, idx) => {
                                if (m.id === activeSwapSource.matchId && activeSwapSource.teamKey === 'team1' && activeSwapSource.playerIndex === idx) return null;
                                return (
                                  <button
                                    key={`t1-${idx}`}
                                    onClick={() => {
                                      handleSwapIndividualPlayers(
                                        activeSwapSource.matchId,
                                        activeSwapSource.teamKey,
                                        activeSwapSource.playerIndex!,
                                        m.id,
                                        'team1',
                                        idx
                                      );
                                      setActiveSwapSource(null);
                                    }}
                                    className="text-left p-2.5 bg-white hover:bg-blue-100 border border-gray-200 rounded-xl hover:border-blue-300 transition-all text-xs font-medium text-gray-700 flex justify-between items-center group shadow-xs cursor-pointer"
                                  >
                                    <span className="truncate max-w-[120px]">{getPlayerName(pId, data.players)}</span>
                                    <span className="text-[10px] font-bold text-gray-400 group-hover:text-blue-600 shrink-0">{matchTitle} (A)</span>
                                  </button>
                                );
                              })}
                              {m.team2.map((pId, idx) => {
                                if (m.id === activeSwapSource.matchId && activeSwapSource.teamKey === 'team2' && activeSwapSource.playerIndex === idx) return null;
                                return (
                                  <button
                                    key={`t2-${idx}`}
                                    onClick={() => {
                                      handleSwapIndividualPlayers(
                                        activeSwapSource.matchId,
                                        activeSwapSource.teamKey,
                                        activeSwapSource.playerIndex!,
                                        m.id,
                                        'team2',
                                        idx
                                      );
                                      setActiveSwapSource(null);
                                    }}
                                    className="text-left p-2.5 bg-white hover:bg-blue-100 border border-gray-200 rounded-xl hover:border-blue-300 transition-all text-xs font-medium text-gray-700 flex justify-between items-center group shadow-xs cursor-pointer"
                                  >
                                    <span className="truncate max-w-[120px]">{getPlayerName(pId, data.players)}</span>
                                    <span className="text-[10px] font-bold text-gray-400 group-hover:text-blue-600 shrink-0">{matchTitle} (B)</span>
                                  </button>
                                );
                              })}
                            </React.Fragment>
                          );
                        })}
                      </div>
                    </div>

                    {availableSubstitutes.length > 0 && (
                      <div>
                        <span className="text-xs font-black text-gray-400 uppercase tracking-wider block mb-2">Substituir por Atleta Reserva (Disponíveis):</span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[160px] overflow-y-auto pr-1">
                          {availableSubstitutes.map(sub => (
                            <button
                              key={sub.id}
                              onClick={() => {
                                handleSubstituteForPlayerDirect(activeSwapSource.playerId!, sub.id);
                                setActiveSwapSource(null);
                              }}
                              className="text-left p-2.5 bg-white hover:bg-green-50 border border-gray-200 rounded-xl hover:border-green-300 transition-all text-xs font-medium text-gray-700 flex justify-between items-center group shadow-xs cursor-pointer"
                            >
                              <span>{sub.name}</span>
                              <span className="text-[10px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded uppercase tracking-wider">Substituir</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <span className="text-xs font-black text-gray-400 uppercase tracking-wider block mb-2">Selecione qual dupla/posição deseja trocar de lugar:</span>
                    <div className="grid grid-cols-1 gap-2">
                      {uncompletedMatches.map(m => {
                        const matchTitle = m.type === 'sf1' ? 'Semifinal 1' : m.type === 'sf2' ? 'Semifinal 2' : m.type === 'final' ? 'Grande Final' : '3º Lugar';
                        return (
                          <div key={m.id} className="border border-gray-150 rounded-xl p-3 bg-white space-y-2">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider block">{matchTitle}</span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {!(m.id === activeSwapSource.matchId && activeSwapSource.teamKey === 'team1') && (
                                <button
                                  onClick={() => {
                                    handleSwapEntireTeams(activeSwapSource.matchId, activeSwapSource.teamKey, m.id, 'team1');
                                    setActiveSwapSource(null);
                                  }}
                                  className="text-left p-2.5 bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-300 rounded-xl transition-all text-xs flex flex-col justify-between cursor-pointer"
                                >
                                  <span className="font-semibold text-gray-800 mb-1">Lado A</span>
                                  <span className="text-gray-500 font-medium text-[11px] truncate">
                                    {m.team1.map(pId => getPlayerName(pId, data.players)).join(' + ') || 'Sem atletas'}
                                  </span>
                                </button>
                              )}
                              {!(m.id === activeSwapSource.matchId && activeSwapSource.teamKey === 'team2') && (
                                <button
                                  onClick={() => {
                                    handleSwapEntireTeams(activeSwapSource.matchId, activeSwapSource.teamKey, m.id, 'team2');
                                    setActiveSwapSource(null);
                                  }}
                                  className="text-left p-2.5 bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-300 rounded-xl transition-all text-xs flex flex-col justify-between cursor-pointer"
                                >
                                  <span className="font-semibold text-gray-800 mb-1">Lado B</span>
                                  <span className="text-gray-500 font-medium text-[11px] truncate">
                                    {m.team2.map(pId => getPlayerName(pId, data.players)).join(' + ') || 'Sem atletas'}
                                  </span>
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                {uncompletedMatches.length === 0 ? (
                  <div className="p-6 text-center text-gray-500 font-semibold border-2 border-dashed border-gray-200 rounded-2xl">
                    Não há partidas pendentes na fase eliminatória para gerenciar.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {uncompletedMatches.map(m => {
                      const matchTitle = m.type === 'sf1' ? 'Semifinal 1' : m.type === 'sf2' ? 'Semifinal 2' : m.type === 'final' ? 'Grande Final' : '3º Lugar';
                      return (
                        <div key={m.id} className="border border-gray-200 rounded-2xl p-4 bg-gray-50/50 space-y-3">
                          <span className="font-black text-xs text-gray-400 uppercase tracking-wider block">{matchTitle}</span>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-white p-3.5 rounded-xl border border-gray-150 flex flex-col justify-between gap-3 shadow-xs">
                              <div>
                                <span className="text-[10px] font-black text-gray-400 uppercase block mb-2">Lado A</span>
                                <div className="space-y-1.5">
                                  {m.team1.map((pId, idx) => (
                                    <div key={pId} className="flex items-center justify-between gap-2 text-xs font-semibold text-gray-700 bg-gray-50 px-2.5 py-1.5 rounded-lg border border-gray-100">
                                      <span className="truncate max-w-[150px]">{getPlayerName(pId, data.players)}</span>
                                      <button
                                        onClick={() => setActiveSwapSource({
                                          matchId: m.id,
                                          teamKey: 'team1',
                                          playerIndex: idx,
                                          playerId: pId
                                        })}
                                        title="Trocar este atleta de posição ou dupla"
                                        className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-1 px-2 rounded-md transition-all inline-flex items-center gap-1 font-bold text-[10px] cursor-pointer border border-blue-100 bg-blue-50/20"
                                      >
                                        <ArrowRightLeft className="w-3 h-3" />
                                        Trocar
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {m.team1.length > 0 && (
                                <button
                                  onClick={() => setActiveSwapSource({
                                    matchId: m.id,
                                    teamKey: 'team1'
                                  })}
                                  className="mt-2 text-[10px] font-bold text-gray-500 hover:text-blue-600 bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-300 py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                                >
                                  <ArrowRightLeft className="w-3.5 h-3.5" />
                                  Trocar Dupla Inteira
                                </button>
                              )}
                            </div>

                            <div className="bg-white p-3.5 rounded-xl border border-gray-150 flex flex-col justify-between gap-3 shadow-xs">
                              <div>
                                <span className="text-[10px] font-black text-gray-400 uppercase block mb-2">Lado B</span>
                                <div className="space-y-1.5">
                                  {m.team2.map((pId, idx) => (
                                    <div key={pId} className="flex items-center justify-between gap-2 text-xs font-semibold text-gray-700 bg-gray-50 px-2.5 py-1.5 rounded-lg border border-gray-100">
                                      <span className="truncate max-w-[150px]">{getPlayerName(pId, data.players)}</span>
                                      <button
                                        onClick={() => setActiveSwapSource({
                                          matchId: m.id,
                                          teamKey: 'team2',
                                          playerIndex: idx,
                                          playerId: pId
                                        })}
                                        title="Trocar este atleta de posição ou dupla"
                                        className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-1 px-2 rounded-md transition-all inline-flex items-center gap-1 font-bold text-[10px] cursor-pointer border border-blue-100 bg-blue-50/20"
                                      >
                                        <ArrowRightLeft className="w-3 h-3" />
                                        Trocar
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {m.team2.length > 0 && (
                                <button
                                  onClick={() => setActiveSwapSource({
                                    matchId: m.id,
                                    teamKey: 'team2'
                                  })}
                                  className="mt-2 text-[10px] font-bold text-gray-500 hover:text-blue-600 bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-300 py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                                >
                                  <ArrowRightLeft className="w-3.5 h-3.5" />
                                  Trocar Dupla Inteira
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3 justify-end mt-8 border-t border-gray-100 pt-5">
              <button 
                onClick={() => {
                  setShowManageBracketsModal(false);
                  setActiveSwapSource(null);
                }}
                className="px-5 py-2.5 font-bold text-gray-700 hover:bg-gray-100 rounded-xl text-xs sm:text-sm shadow-xs border border-gray-200 transition-all cursor-pointer"
              >
                Fechar
              </button>
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
    <div className="flex flex-col gap-2.5 items-center bg-gray-50/70 p-3 rounded-2xl border border-gray-150/80 w-full sm:w-auto">
      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">
        Melhor de {maxSets} Sets
      </span>
      <div className="flex flex-row flex-wrap sm:flex-nowrap gap-2 items-center justify-center">
        {Array.from({ length: maxSets }).map((_, idx) => {
          const s1 = sets1[idx];
          const s2 = sets2[idx];
          const isT1Winner = s1 !== '' && s2 !== '' && parseInt(s1) > parseInt(s2);
          const isT2Winner = s1 !== '' && s2 !== '' && parseInt(s2) > parseInt(s1);

          return (
            <div key={idx} className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-gray-200 shadow-sm min-w-[120px] justify-between">
              <span className="font-extrabold text-gray-400 text-[10px] uppercase tracking-wider shrink-0">SET {idx + 1}</span>
              <div className="flex items-center gap-1 font-mono shrink-0">
                <input
                  type="number"
                  min={0}
                  disabled={disabled}
                  className={`w-9 h-9 text-center font-bold rounded-lg border text-sm p-0 transition-colors ${
                    isT1Winner ? 'bg-green-100 border-green-300 text-green-900 font-extrabold' : 'bg-white border-gray-200 focus:ring-2'
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
                <span className="text-[10px] text-gray-350 font-bold px-0.5">x</span>
                <input
                  type="number"
                  min={0}
                  disabled={disabled}
                  className={`w-9 h-9 text-center font-bold rounded-lg border text-sm p-0 transition-colors ${
                    isT2Winner ? 'bg-green-100 border-green-300 text-green-900 font-extrabold' : 'bg-white border-gray-200 focus:ring-2'
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
        <span className="text-[10px] font-black text-green-700 leading-none mt-1.5 bg-green-100/80 border border-green-200/50 px-2.5 py-1 rounded-full uppercase tracking-wider">
          Placar: {match.score1} x {match.score2}
        </span>
      )}
    </div>
  );
}
