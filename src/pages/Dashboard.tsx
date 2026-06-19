import React, { useState, useMemo } from 'react';
import { useAppStore } from '../store/AppContext';
import { useNavigate } from 'react-router-dom';
import { Trophy, Plus, ArrowRight, Activity, Calendar, Users, Trash2, AlertTriangle, Medal } from 'lucide-react';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { calculateGlobalRankings, getPlayerName } from '../lib/tournament';

export default function Dashboard() {
  const { data, createTournament, clearData } = useAppStore();
  const navigate = useNavigate();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [newTourneyName, setNewTourneyName] = useState('');
  const [newModality, setNewModality] = useState<'individual' | 'duplas_fixas' | 'mistas_aleatorias'>('individual');
  const [newCategory, setNewCategory] = useState<'masculino' | 'feminino' | 'misto'>('masculino');
  
  const activeTournaments = data.tournaments.filter(t => t.status !== 'completed');
  const pastTournaments = data.tournaments.filter(t => t.status === 'completed').sort((a,b) => b.date - a.date);

  // Get Rankings
  const rankings = useMemo(() => calculateGlobalRankings(data), [data]);
  const topRankings = rankings.slice(0, 5); // Top 5
  
  const lastTournament = pastTournaments[0];

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTourneyName.trim()) return;
    const id = createTournament(newTourneyName, Date.now(), newModality, newCategory);
    navigate(`/tournaments/${id}`);
  };

  const handleReset = () => {
    clearData();
    setShowResetModal(false);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Dashboard</h1>
          <p className="text-gray-500">Visão geral da liga e campeonatos ativos.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowResetModal(true)}
            className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
            title="Zerar Histórico de Dados"
          >
            <Trash2 className="w-5 h-5" />
          </button>
          <button 
            onClick={() => navigate('/players')}
            className="bg-black border border-black hover:bg-gray-800 text-white font-semibold py-2.5 px-5 rounded-xl transition-all flex items-center gap-2"
          >
            <Users className="w-5 h-5" />
            Atletas
          </button>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="bg-green-500 hover:bg-green-600 text-black font-semibold py-2.5 px-5 rounded-xl shadow-sm shadow-green-500/20 transition-all flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Novo Campeonato
          </button>
        </div>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">Criar Novo Campeonato</h2>
              <form onSubmit={handleCreate}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Etapa</label>
                    <input 
                      type="text" 
                      value={newTourneyName}
                      onChange={(e) => setNewTourneyName(e.target.value)}
                      placeholder="Ex: Etapa Verão 2024"
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Modalidade</label>
                    <select 
                      value={newModality}
                      onChange={(e) => {
                        const val = e.target.value as 'individual' | 'duplas_fixas' | 'mistas_aleatorias';
                        setNewModality(val);
                        if (val === 'mistas_aleatorias') setNewCategory('misto');
                      }}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                    >
                      <option value="individual">Individual</option>
                      <option value="duplas_fixas">Duplas Fixas</option>
                      <option value="mistas_aleatorias">Duplas Mistas Aleatórias</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Categoria (Gênero)</label>
                    <select 
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value as 'masculino' | 'feminino' | 'misto')}
                      disabled={newModality === 'mistas_aleatorias'}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none disabled:bg-gray-100 disabled:text-gray-500"
                    >
                      <option value="masculino">Masculino</option>
                      <option value="feminino">Feminino</option>
                      <option value="misto">Misto</option>
                    </select>
                  </div>
                  <div className="flex justify-end gap-3 pt-4">
                    <button 
                      type="button" 
                      onClick={() => setShowCreateModal(false)}
                      className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium"
                    >
                      Cancelar
                    </button>
                    <button 
                      type="submit" 
                      className="px-4 py-2 bg-black text-white hover:bg-gray-800 rounded-lg font-medium"
                    >
                      Criar & Iniciar
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Atenção!</h2>
              <p className="text-gray-500 mb-6">
                Essa ação excluirá <strong className="text-gray-900">todo o histórico de campeonatos e atletas</strong>. Esta operação não pode ser desfeita. Tem certeza que deseja continuar?
              </p>
              <div className="flex justify-center gap-3">
                <button 
                  onClick={() => setShowResetModal(false)}
                  className="px-6 py-2.5 text-gray-700 hover:bg-gray-100 rounded-xl font-bold transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleReset}
                  className="px-6 py-2.5 bg-red-500 text-white hover:bg-red-600 rounded-xl font-bold shadow-sm transition-all shadow-red-500/20"
                >
                  Sim, Zerar Tudo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div 
          onClick={() => navigate('/tournaments')}
          className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between cursor-pointer hover:shadow-md hover:border-green-300 transition-all group"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="bg-green-100 p-4 rounded-full group-hover:scale-110 transition-transform">
                <Trophy className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 group-hover:text-green-600 transition-colors">Etapas Realizadas</p>
                <p className="text-2xl font-bold text-gray-900">{pastTournaments.length}</p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-green-500 transition-all opacity-0 group-hover:opacity-100" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-blue-100 p-4 rounded-full">
              <Activity className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Etapas Ativas</p>
              <p className="text-2xl font-bold text-gray-900">{activeTournaments.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-purple-100 p-4 rounded-full">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Total de Atletas</p>
              <p className="text-2xl font-bold text-gray-900">{data.players.length}</p>
            </div>
          </div>
        </div>

        {lastTournament && (
          <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-6 rounded-2xl shadow-sm border border-yellow-200 flex flex-col justify-between">
            <div>
              <p className="text-sm font-bold text-yellow-700 mb-1">Últimos Campeões</p>
              <h3 className="font-bold text-gray-900 leading-tight">
                {getPlayerName(lastTournament.finalRankings.champion[0], data.players)}
              </h3>
              <h3 className="font-bold text-gray-900 leading-tight">
                {getPlayerName(lastTournament.finalRankings.champion[1], data.players)}
              </h3>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Ativos */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            Em Andamento
          </h2>
          
          {activeTournaments.length === 0 ? (
            <div className="bg-gray-50 border border-gray-200 border-dashed rounded-2xl p-8 text-center text-gray-500">
              Nenhuma etapa em andamento no momento.
            </div>
          ) : (
            <div className="grid gap-4">
              {activeTournaments.map(t => (
                <div 
                  key={t.id} 
                  onClick={() => navigate(`/tournaments/${t.id}`)}
                  className="bg-white p-6 rounded-2xl shadow-sm border border-green-100 hover:shadow-md hover:border-green-300 transition-all cursor-pointer group"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-bold text-lg text-gray-900 group-hover:text-green-600 transition-colors">{t.name}</h3>
                      <p className="text-sm text-gray-500 mb-1">
                        {format(t.date, "dd 'de' MMMM, yyyy", { locale: ptBR })} • {t.participants.length} Atleta{t.participants.length !== 1 ? 's' : ''}
                      </p>
                      <div className="flex gap-2 text-xs font-semibold text-gray-500">
                        <span className="bg-gray-100 px-2 py-0.5 rounded-md">
                          {t.modality === 'individual' ? 'Individual' : t.modality === 'duplas_fixas' ? 'Duplas Fixas' : 'Duplas Mistas'}
                        </span>
                        <span className="bg-gray-100 px-2 py-0.5 rounded-md capitalize">
                          {t.category || (t.modality === 'mistas_aleatorias' ? 'Misto' : 'Masculino')}
                        </span>
                      </div>
                    </div>
                    <span className="bg-green-100 text-green-700 text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wide">
                      {t.status === 'draft' ? 'RASCUNHO' :
                       t.status === 'group_stage' ? 'FASE DE GRUPOS' :
                       t.status === 'playoffs' ? 'ELIMINATÓRIAS' : 'FINALIZADO'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm font-medium text-gray-600">
                    <span>{t.participants.length} atletas inscritos</span>
                    <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-green-500 group-hover:translate-x-1 transition-all" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Ranking */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              Ranking (Top 5)
            </h2>
            <button 
              onClick={() => navigate('/rankings')}
              className="text-sm text-green-600 hover:text-green-700 font-bold flex items-center gap-1"
            >
              Ver Completo <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto">
            {topRankings.length === 0 ? (
               <div className="p-8 text-center text-gray-500">
                 Nenhum torneio finalizado. A classificação está vazia.
               </div>
            ) : (
               <table className="w-full text-left text-sm whitespace-nowrap">
                 <thead className="bg-gray-50 border-b border-gray-100">
                   <tr>
                     <th className="px-4 py-3 font-semibold text-gray-500">Pos</th>
                     <th className="px-4 py-3 font-semibold text-gray-500">Atleta</th>
                     <th className="px-4 py-3 font-semibold text-gray-500 text-center">Etapas</th>
                     <th className="px-4 py-3 font-semibold text-gray-500 text-center">% Aprov</th>
                     <th className="px-4 py-3 font-semibold text-gray-500 text-center">Jogos</th>
                     <th className="px-4 py-3 font-semibold text-gray-500 text-center">Vit</th>
                     <th className="px-4 py-3 font-bold text-gray-900 text-right">Pts</th>
                   </tr>
                 </thead>
                 <tbody>
                   {topRankings.map((r, idx) => {
                     let MedalIcon = null;
                     if (idx === 0) MedalIcon = <span className="text-yellow-500 font-black text-base">🥇</span>;
                     else if (idx === 1) MedalIcon = <span className="text-gray-400 font-black text-base">🥈</span>;
                     else if (idx === 2) MedalIcon = <span className="text-orange-400 font-black text-base">🥉</span>;

                     return (
                       <tr 
                         key={r.id} 
                         onClick={() => navigate(`/players/${r.id}`)}
                         className="border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer"
                       >
                         <td className="px-4 py-3 font-bold text-gray-400">
                            {MedalIcon ? MedalIcon : `${idx + 1}º`}
                         </td>
                         <td className="px-4 py-3 font-bold text-gray-900 truncate max-w-[120px]">
                           {getPlayerName(r.id, data.players)}
                         </td>
                         <td className="px-4 py-3 text-center text-gray-500">
                           {r.played}
                         </td>
                         <td className="px-4 py-3 text-center text-gray-500">
                           {r.winRate.toFixed(1)}%
                         </td>
                         <td className="px-4 py-3 text-center text-gray-500">
                           {r.totalMatches}
                         </td>
                         <td className="px-4 py-3 text-center text-gray-500">
                           {r.totalWins}
                         </td>
                         <td className="px-4 py-3 text-right">
                           <span className="bg-black text-white px-2 py-1 rounded font-bold">{r.points}</span>
                         </td>
                       </tr>
                     );
                   })}
                 </tbody>
               </table>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
