import React, { useMemo } from 'react';
import { Tournament, Match } from '../../types';
import { useAppStore } from '../../store/AppContext';
import { calculatePlayerStats, getPlayerName, PlayerStats } from '../../lib/tournament';
import { Check, CheckCircle2 } from 'lucide-react';

const COURT_COLORS = [
    'text-blue-800 bg-blue-100 border-blue-200',
    'text-green-800 bg-green-100 border-green-200',
    'text-purple-800 bg-purple-100 border-purple-200',
    'text-orange-800 bg-orange-100 border-orange-200',
    'text-pink-800 bg-pink-100 border-pink-200',
    'text-teal-800 bg-teal-100 border-teal-200'
];

export default function GroupPhase({ tournament }: { tournament: Tournament }) {
  const { data, updateTournament } = useAppStore();

  const groupMatches = tournament.matches.filter(m => m.type === 'group');

  const updateMatchScore = (matchId: string, score1: number, score2: number) => {
    const updated = tournament.matches.map(m => 
      m.id === matchId 
        ? { ...m, score1, score2, status: 'completed' as const } 
        : m
    );
    updateTournament(tournament.id, { matches: updated });
  };

  const handleGenerateSemis = () => {
    if (groupMatches.some(m => m.status !== 'completed')) return;

    const groupKeys = Object.keys(tournament.groups);
    const groupsCount = groupKeys.length;
    
    const sortFn = (a: PlayerStats, b: PlayerStats) => {
      if (b.wins !== a.wins) return b.wins - a.wins;
      if (b.gameBalance !== a.gameBalance) return b.gameBalance - a.gameBalance;
      if (b.gamesWon !== a.gamesWon) return b.gamesWon - a.gamesWon;
      return a.gamesLost - b.gamesLost;
    };

    let finalDuos: [string, string][] = [];

    if (tournament.modality === 'duplas_fixas') {
      let firsts: any[] = [];
      let seconds: any[] = [];
      let thirds: any[] = [];
      let fourths: any[] = [];

      groupKeys.forEach(g => {
        const gStats = calculatePlayerStats(tournament.groups[g], groupMatches.filter(m => m.groupId === g));
        const seen = new Set();
        const duosInGroup = [];
        for (const stat of gStats) {
            if (seen.has(stat.id)) continue;
            const groupList = tournament.groups[g] || [];
            const playerIndex = groupList.indexOf(stat.id);
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
    } else {
      let firsts: any[] = [];
      let seconds: any[] = [];
      let thirds: any[] = [];

      groupKeys.forEach(g => {
        const gStats = calculatePlayerStats(tournament.groups[g], groupMatches.filter(m => m.groupId === g));
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

  const groupKeys = Object.keys(tournament.groups);
  const allCompleted = groupMatches.length > 0 && groupMatches.every(m => m.status === 'completed');

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold">Fase de Grupos</h2>
          <p className="text-gray-500">Registre os placares para definir os 8 classificados.</p>
        </div>
        <button 
          onClick={handleGenerateSemis}
          disabled={!allCompleted}
          className={`px-5 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 ${allCompleted ? 'bg-black text-white hover:bg-gray-800' : 'bg-gray-200 text-gray-500 cursor-not-allowed'}`}
        >
          Avançar para Semifinais
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {groupKeys.map((g, index) => {
          const groupStats = calculatePlayerStats(tournament.groups[g], groupMatches.filter(m => m.groupId === g));
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
                          const playerIndex = groupList.indexOf(stat.id);
                          const partnerIndex = playerIndex % 2 === 0 ? playerIndex + 1 : playerIndex - 1;
                          const partnerId = groupList[partnerIndex] || '';
                          
                          pairedStats.push({ ...stat, partnerId });
                          seen.add(stat.id);
                          seen.add(partnerId);
                        }
                        
                        return pairedStats.map((stat, idx) => (
                          <tr key={stat.id} className="border-b border-gray-100 last:border-0">
                            <td className="py-2 font-bold text-gray-400 w-12">{idx + 1}º</td>
                            <td className="py-2 font-medium truncate max-w-[200px]" title={`${getPlayerName(stat.id, data.players)} + ${getPlayerName(stat.partnerId, data.players)}`}>
                                <div className="text-sm font-bold text-gray-900">{getPlayerName(stat.id, data.players)}</div>
                                <div className="text-xs font-semibold text-gray-500">+ {getPlayerName(stat.partnerId, data.players)}</div>
                            </td>
                            <td className="py-2 text-center text-green-600 font-bold">{stat.wins}</td>
                            <td className="py-2 text-center font-semibold">{stat.gameBalance > 0 ? `+${stat.gameBalance}` : stat.gameBalance}</td>
                            <td className="py-2 text-center text-gray-500 font-medium">{stat.gamesWon}</td>
                          </tr>
                        ));
                      }

                      return groupStats.map((stat, idx) => (
                        <tr key={stat.id} className="border-b border-gray-100 last:border-0">
                          <td className="py-2 font-bold text-gray-400 w-12">{idx + 1}º</td>
                          <td className="py-2 font-medium truncate max-w-[120px]">{getPlayerName(stat.id, data.players)}</td>
                          <td className="py-2 text-center text-green-600 font-bold">{stat.wins}</td>
                          <td className="py-2 text-center font-semibold">{stat.gameBalance > 0 ? `+${stat.gameBalance}` : stat.gameBalance}</td>
                          <td className="py-2 text-center text-gray-500 font-medium">{stat.gamesWon}</td>
                        </tr>
                      ));
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
                            Jogo {idx + 1}
                        </div>
                        
                        <div className="flex items-center justify-between gap-2 mt-2">
                        <div className="flex-1 text-right flex items-center justify-end gap-2">
                            {t1Wins && <Check className="w-5 h-5 text-green-500 stroke-[3]" />}
                            <div>
                                <div className={`text-sm font-semibold truncate leading-tight ${t1Wins ? 'text-gray-900' : 'text-gray-600'}`}>{getPlayerName(m.team1[0], data.players)}</div>
                                <div className={`text-sm font-semibold truncate leading-tight ${t1Wins ? 'text-gray-900' : 'text-gray-600'}`}>{getPlayerName(m.team1[1], data.players)}</div>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-1 font-mono">
                            <input 
                            type="number" 
                            min={0}
                            className={`w-10 sm:w-12 h-10 text-center text-lg font-bold rounded-lg border focus:ring-2 p-0 transition-colors ${inputBgClasses}`}
                            defaultValue={m.score1}
                            onBlur={(e) => {
                                if(e.target.value !== '') {
                                const s1 = parseInt(e.target.value);
                                const s2Input = e.target.parentElement?.querySelector('input:last-child') as HTMLInputElement;
                                if (s2Input && s2Input.value !== '') {
                                    updateMatchScore(m.id, s1, parseInt(s2Input.value));
                                }
                                }
                            }}
                            />
                            <span className="text-gray-400 font-bold px-1">x</span>
                            <input 
                            type="number" 
                            min={0}
                            className={`w-10 sm:w-12 h-10 text-center text-lg font-bold rounded-lg border focus:ring-2 p-0 transition-colors ${inputBgClasses}`}
                            defaultValue={m.score2}
                            onBlur={(e) => {
                                if(e.target.value !== '') {
                                const s2 = parseInt(e.target.value);
                                const s1Input = e.target.parentElement?.querySelector('input:first-child') as HTMLInputElement;
                                if (s1Input && s1Input.value !== '') {
                                    updateMatchScore(m.id, parseInt(s1Input.value), s2);
                                }
                                }
                            }}
                            />
                        </div>

                        <div className="flex-1 text-left flex items-center gap-2">
                            <div>
                                <div className={`text-sm font-semibold truncate leading-tight ${t2Wins ? 'text-gray-900' : 'text-gray-600'}`}>{getPlayerName(m.team2[0], data.players)}</div>
                                <div className={`text-sm font-semibold truncate leading-tight ${t2Wins ? 'text-gray-900' : 'text-gray-600'}`}>{getPlayerName(m.team2[1], data.players)}</div>
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
    </div>
  );
}
