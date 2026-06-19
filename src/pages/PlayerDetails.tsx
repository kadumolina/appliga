import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/AppContext';
import { ArrowLeft, Trophy, Activity, Target, Star } from 'lucide-react';
import { getPlayerName, calculateGlobalRankings } from '../lib/tournament';
import { cn } from '../lib/utils';

function calculateAge(birthDateString?: string) {
  if (!birthDateString) return null;
  const today = new Date();
  const birthDate = new Date(birthDateString);
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
  }
  return age;
}

export default function PlayerDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data } = useAppStore();

  const player = data.players.find(p => p.id === id);
  const age = calculateAge(player?.birthDate);

  const rankings = useMemo(() => calculateGlobalRankings(data), [data]);
  const rankingStats = rankings.find(r => r.id === id);

  const stats = useMemo(() => {
    if (!id) return null;
    
    let tournamentsPlayed = 0;
    let wins = 0;
    let losses = 0;
    let gamesWon = 0;
    let gamesLost = 0;
    let titles = 0;
    let podiums = 0;

    const partners: Record<string, number> = {};
    const opponents: Record<string, number> = {};

    data.tournaments.forEach(t => {
      if (t.status !== 'completed') return;
      if (t.participants.includes(id)) {
        tournamentsPlayed++;
        
        if (t.finalRankings.champion.includes(id)) { titles++; podiums++; }
        if (t.finalRankings.runnerUp.includes(id)) { podiums++; }
        if (t.finalRankings.thirdPlace.includes(id)) { podiums++; }

        t.matches.forEach(m => {
          if (m.status !== 'completed' || m.score1 === undefined || m.score2 === undefined) return;
          
          let isTeam1 = m.team1.includes(id);
          let isTeam2 = m.team2.includes(id);
          
          if (!isTeam1 && !isTeam2) return;

          let myTeam = isTeam1 ? m.team1 : m.team2;
          let oppTeam = isTeam1 ? m.team2 : m.team1;
          let myScore = isTeam1 ? m.score1 : m.score2;
          let oppScore = isTeam1 ? m.score2 : m.score1;

          if (myScore > oppScore) wins++;
          else losses++;

          gamesWon += myScore;
          gamesLost += oppScore;

          let partnerId = myTeam.find(pid => pid !== id);
          if (partnerId) partners[partnerId] = (partners[partnerId] || 0) + 1;

          oppTeam.forEach(oppId => {
            opponents[oppId] = (opponents[oppId] || 0) + 1;
          });
        });
      }
    });

    const topPartners = Object.entries(partners).sort((a,b) => b[1] - a[1]).slice(0, 3);
    const topOpponents = Object.entries(opponents).sort((a,b) => b[1] - a[1]).slice(0, 3);

    return {
      tournamentsPlayed, wins, losses, gamesWon, gamesLost, titles, podiums, topPartners, topOpponents
    };
  }, [id, data]);

  if (!player || !stats) {
    return (
      <div className="p-12 text-center text-gray-500">
        Jogador não encontrado.
      </div>
    );
  }

  const winRate = stats.wins + stats.losses > 0 
    ? Math.round((stats.wins / (stats.wins + stats.losses)) * 100) 
    : 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-4xl mx-auto">
      
      <div className="flex items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <button 
          onClick={() => navigate('/players')}
          className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">{player.name}</h1>
          <p className="text-gray-500">
            {age !== null ? `${age} anos • ` : ''}Perfil e Estatísticas
          </p>
        </div>
        {rankingStats && (
            <div className="flex items-center justify-center gap-1 bg-gray-50 px-4 py-2 rounded-xl border border-gray-100">
              {[1,2,3,4,5].map(star => (
                  <Star key={star} className={cn("w-5 h-5", rankingStats.stars >= star ? "fill-yellow-400 text-yellow-400" : "fill-gray-200 text-gray-200")} />
              ))}
            </div>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 text-center">
          <div className="text-3xl font-black text-gray-900 mb-1">{stats.tournamentsPlayed}</div>
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Etapas</div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 text-center">
          <div className="text-3xl font-black text-green-600 mb-1">{stats.wins}</div>
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Vitórias</div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 text-center">
          <div className="text-3xl font-black text-red-500 mb-1">{stats.losses}</div>
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Derrotas</div>
        </div>
        <div className="bg-black p-6 rounded-2xl shadow-sm border border-gray-800 text-center">
          <div className="text-3xl font-black text-white mb-1">{winRate}%</div>
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Aprov.</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" /> Histórico de Pódios
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-gray-50">
              <span className="text-gray-600 font-medium">Títulos (1º Lugar)</span>
              <span className="text-xl font-bold text-gray-900">{stats.titles}</span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b border-gray-50">
              <span className="text-gray-600 font-medium">Pódios Realizados</span>
              <span className="text-xl font-bold text-gray-900">{stats.podiums}</span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b border-gray-50">
              <span className="text-gray-600 font-medium">Games Vencidos</span>
              <span className="text-xl font-bold text-gray-900">{stats.gamesWon}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 font-medium">Games Perdidos</span>
              <span className="text-xl font-bold text-gray-900">{stats.gamesLost}</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-500" /> Conexões Frequentes
          </h3>
          <div className="space-y-6">
            <div>
              <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Principais Parceiros</h4>
              {stats.topPartners.length === 0 ? <p className="text-sm text-gray-400">Sem dados</p> : 
                stats.topPartners.map(([pid, count]) => (
                  <div key={pid} className="flex justify-between items-center text-sm mb-2">
                    <span className="font-medium">{getPlayerName(pid, data.players)}</span>
                    <span className="bg-gray-100 px-2 py-1 rounded text-gray-600 font-bold">{count}x</span>
                  </div>
                ))
              }
            </div>
            <div>
              <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Principais Adversários</h4>
              {stats.topOpponents.length === 0 ? <p className="text-sm text-gray-400">Sem dados</p> : 
                stats.topOpponents.map(([pid, count]) => (
                  <div key={pid} className="flex justify-between items-center text-sm mb-2">
                    <span className="font-medium">{getPlayerName(pid, data.players)}</span>
                    <span className="bg-gray-100 px-2 py-1 rounded text-gray-600 font-bold">{count}x</span>
                  </div>
                ))
              }
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
