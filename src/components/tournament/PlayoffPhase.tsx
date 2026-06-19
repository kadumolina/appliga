import React from 'react';
import { Tournament, Match } from '../../types';
import { useAppStore } from '../../store/AppContext';
import { getPlayerName, calculatePlayerStats } from '../../lib/tournament';

export default function PlayoffPhase({ tournament }: { tournament: Tournament }) {
  const { data, updateTournament } = useAppStore();

  const getMatch = (type: string) => tournament.matches.find(m => m.type === type);
  
  const sf1 = getMatch('sf1');
  const sf2 = getMatch('sf2');
  const final = getMatch('final');
  const third = getMatch('3rd');

  const updateMatchScore = (matchId: string, score1: number, score2: number) => {
    let updated = tournament.matches.map(m => 
      m.id === matchId 
        ? { ...m, score1, score2, status: 'completed' as const } 
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

  const handleFinish = () => {
    // Collect all eliminated players from group stage
    const groupMatches = tournament.matches.filter(m => m.type === 'group');
    
    const fMatch = getMatch('final')!;
    const tMatch = getMatch('3rd')!;

    const champion = fMatch.score1! > fMatch.score2! ? fMatch.team1 : fMatch.team2;
    const runnerUp = fMatch.score1! < fMatch.score2! ? fMatch.team1 : fMatch.team2;

    const thirdPlace = tMatch.score1! > tMatch.score2! ? tMatch.team1 : tMatch.team2;
    const fourthPlace = tMatch.score1! < tMatch.score2! ? tMatch.team1 : tMatch.team2;

    const top8 = [...champion, ...runnerUp, ...thirdPlace, ...fourthPlace];
    const eliminatedIds = tournament.participants.filter(id => !top8.includes(id));
    
    const eliminatedStats = calculatePlayerStats(eliminatedIds, groupMatches);
    const finalEliminated = eliminatedStats.map(s => s.id); // already sorted by playerStats logic

    updateTournament(tournament.id, {
      status: 'completed',
      finalRankings: {
        champion,
        runnerUp,
        thirdPlace,
        fourthPlace,
        eliminated: finalEliminated
      }
    });
  };

  const MatchCard = ({ match, title }: { match?: Match, title: string }) => {
    if (!match) return <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl h-32 flex items-center justify-center text-gray-400 font-medium p-4 text-center text-sm md:text-base">Aguardando {title}</div>;

    const t11 = getPlayerName(match.team1[0], data.players);
    const t12 = getPlayerName(match.team1[1], data.players);
    const t21 = getPlayerName(match.team2[0], data.players);
    const t22 = getPlayerName(match.team2[1], data.players);

    const t1Wins = match.status === 'completed' && (match.score1 || 0) > (match.score2 || 0);
    const t2Wins = match.status === 'completed' && (match.score2 || 0) > (match.score1 || 0);
    const inputBgClasses = match.status === 'completed' ? 'bg-gray-100 text-gray-900 border-transparent shadow-inner focus:bg-white focus:ring-gray-300' : 'bg-red-50 text-red-900 border-red-200 focus:bg-white focus:border-red-400 focus:ring-red-500';

    return (
      <div className={`rounded-2xl p-3 md:p-4 shadow-sm border relative ${match.status === 'completed' ? 'border-gray-100 bg-gray-50/30' : 'border-red-100 bg-red-50/10'}`}>
        <h4 className={`text-xs md:text-sm font-bold uppercase tracking-wider mb-4 text-center ${match.status === 'completed' ? 'text-gray-500' : 'text-red-900'}`}>{title}</h4>
        
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
          <div className="w-full sm:w-auto sm:flex-1 text-center sm:text-right flex items-center justify-center sm:justify-end gap-2">
            {t1Wins && <span className="text-green-500 font-black">✓</span>}
            <div>
              <div className={`text-sm font-semibold truncate leading-tight ${t1Wins ? 'text-gray-900' : 'text-gray-600'}`}>{t11}</div>
              <div className={`text-sm font-semibold truncate leading-tight ${t1Wins ? 'text-gray-900' : 'text-gray-600'}`}>{t12}</div>
            </div>
          </div>
          
          <div className="flex items-center gap-1 font-mono my-2 sm:my-0">
            <input 
              type="number" 
              min={0}
              className={`w-10 sm:w-12 h-10 text-center text-base sm:text-lg font-bold rounded-lg border focus:ring-2 p-0 transition-colors ${inputBgClasses}`}
              defaultValue={match.score1}
              onBlur={(e) => {
                if(e.target.value !== '') {
                  const s1 = parseInt(e.target.value);
                  const s2Input = e.target.parentElement?.querySelector('input:last-child') as HTMLInputElement;
                  if (s2Input && s2Input.value !== '') {
                    updateMatchScore(match.id, s1, parseInt(s2Input.value));
                  }
                }
              }}
            />
            <span className="text-gray-400 font-bold px-1">x</span>
            <input 
              type="number" 
              min={0}
              className={`w-10 sm:w-12 h-10 text-center text-base sm:text-lg font-bold rounded-lg border focus:ring-2 p-0 transition-colors ${inputBgClasses}`}
              defaultValue={match.score2}
              onBlur={(e) => {
                if(e.target.value !== '') {
                  const s2 = parseInt(e.target.value);
                  const s1Input = e.target.parentElement?.querySelector('input:first-child') as HTMLInputElement;
                  if (s1Input && s1Input.value !== '') {
                    updateMatchScore(match.id, parseInt(s1Input.value), s2);
                  }
                }
              }}
            />
          </div>

          <div className="w-full sm:w-auto sm:flex-1 text-center sm:text-left flex items-center justify-center sm:justify-start gap-2">
            <div>
              <div className={`text-sm font-semibold truncate leading-tight ${t2Wins ? 'text-gray-900' : 'text-gray-600'}`}>{t21}</div>
              <div className={`text-sm font-semibold truncate leading-tight ${t2Wins ? 'text-gray-900' : 'text-gray-600'}`}>{t22}</div>
            </div>
            {t2Wins && <span className="text-green-500 font-black">✓</span>}
          </div>
        </div>
      </div>
    );
  };

  const allCompleted = final?.status === 'completed' && third?.status === 'completed';

  if (tournament.status === 'completed') {
    return (
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 text-center animate-in fade-in zoom-in duration-500">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <span className="text-4xl">🏆</span>
        </div>
        <h2 className="text-3xl font-black text-gray-900 mb-2">Campeonato Finalizado!</h2>
        <p className="text-gray-500 mb-8">O ranking foi atualizado com base nos resultados.</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <div className="bg-gradient-to-b from-gray-100 to-white pt-6 pb-6 px-4 rounded-t-3xl border border-gray-200 mt-8 relative">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gray-200 text-gray-700 w-8 h-8 rounded-full flex items-center justify-center font-bold">2</div>
            <h3 className="font-bold text-gray-900">{getPlayerName(tournament.finalRankings.runnerUp[0], data.players)}</h3>
            <h3 className="font-bold text-gray-900">{getPlayerName(tournament.finalRankings.runnerUp[1], data.players)}</h3>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-2 block">80 Pontos</span>
          </div>
          
          <div className="bg-gradient-to-b from-yellow-100 to-white pt-8 pb-6 px-4 rounded-t-3xl border border-yellow-200 shadow-xl relative z-10">
            <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-yellow-400 text-yellow-900 w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ring-4 ring-white">1</div>
            <h3 className="font-bold text-xl text-gray-900">{getPlayerName(tournament.finalRankings.champion[0], data.players)}</h3>
            <h3 className="font-bold text-xl text-gray-900">{getPlayerName(tournament.finalRankings.champion[1], data.players)}</h3>
            <span className="text-xs font-bold text-yellow-600 uppercase tracking-widest mt-2 block">100 Pontos</span>
          </div>

          <div className="bg-gradient-to-b from-orange-100 to-white pt-6 pb-6 px-4 rounded-t-3xl border border-orange-200 mt-12 relative">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-orange-300 text-orange-900 w-8 h-8 rounded-full flex items-center justify-center font-bold">3</div>
            <h3 className="font-bold text-gray-900">{getPlayerName(tournament.finalRankings.thirdPlace[0], data.players)}</h3>
            <h3 className="font-bold text-gray-900">{getPlayerName(tournament.finalRankings.thirdPlace[1], data.players)}</h3>
            <span className="text-xs font-bold text-orange-600 uppercase tracking-widest mt-2 block">65 Pontos</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-12 animate-in fade-in duration-500">
      
      {allCompleted && (
        <div className="bg-white border-2 border-green-500 p-6 rounded-2xl flex items-center justify-between shadow-xl shadow-green-500/10">
          <div>
            <h3 className="font-bold text-xl">Finais Concluídas</h3>
            <p className="text-gray-500 text-sm">Pronto para encerrar e gerar o pódio/ranking.</p>
          </div>
          <button 
            onClick={handleFinish}
            className="bg-green-500 hover:bg-green-600 text-black px-6 py-3 rounded-xl font-bold tracking-tight transition-colors"
          >
            Encerrar Campeonato
          </button>
        </div>
      )}

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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-6 border-t border-gray-200">
        <div>
          <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3 text-yellow-600">
            <span className="w-8 h-8 rounded-xl bg-yellow-400 text-yellow-900 flex items-center justify-center text-sm">2</span> 
            Grande Final
          </h3>
          <MatchCard match={final} title="Final" />
        </div>
        <div>
          <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3 text-orange-600">
            <span className="w-8 h-8 rounded-xl bg-orange-200 text-orange-900 flex items-center justify-center text-sm">3</span> 
            Terceiro Lugar
          </h3>
          <MatchCard match={third} title="Disputa - 3º Lugar" />
        </div>
      </div>

    </div>
  );
}
