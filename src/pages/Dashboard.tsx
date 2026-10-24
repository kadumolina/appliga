import React, { useState, useMemo } from 'react';
import { useAppStore } from '../store/AppContext';
import { useNavigate } from 'react-router-dom';
import { Trophy, Plus, ArrowRight, Check, Activity, Calendar, Users, Trash2, AlertTriangle, Medal, Key, Send, Settings, X, HelpCircle, BookOpen } from 'lucide-react';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { calculateGlobalRankings, getPlayerName } from '../lib/tournament';
import { GAME_MODES, GameMode } from '../data/gameModes';
import { TournamentModality } from '../types';

export default function Dashboard() {
  const { data, createTournament, updateTournament, currentUser, signIn, loading, currentRole, inviteUser, cancelInvite, sentInvites, updateUserRole, removeUserFromWorkspace, activeWorkspaceId, workspaces } = useAppStore();
  const navigate = useNavigate();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAccessModal, setShowAccessModal] = useState(false);
  
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<'editor' | 'viewer'>('viewer');
  const [newTourneyName, setNewTourneyName] = useState('');
  const [newModality, setNewModality] = useState<TournamentModality>('individual');
  const [newCategory, setNewCategory] = useState<'masculino' | 'feminino' | 'misto'>('masculino');
  const [newPoints1, setNewPoints1] = useState(100);
  const [newPoints2, setNewPoints2] = useState(80);
  const [newPoints3, setNewPoints3] = useState(65);
  const [newIsPaid, setNewIsPaid] = useState(false);
  const [newRegistrationFee, setNewRegistrationFee] = useState(0);
  const [isFeeFocused, setIsFeeFocused] = useState(false);
  const [newIsRanked, setNewIsRanked] = useState(false);
  const [selectedRuleMode, setSelectedRuleMode] = useState<GameMode | null>(null);
  
  const [reiStep, setReiStep] = useState<'normal_flow' | 'variation_select' | 'rei_config'>('normal_flow');
  const [reiType, setReiType] = useState<'individual' | 'duplas_fixas'>('individual');
  const [reiDuration, setReiDuration] = useState<string>('60');
  const [reiCourts, setReiCourts] = useState<number>(2);
  const [reiEstimatedAthletesType, setReiEstimatedAthletesType] = useState<'8' | '12' | '16' | '20' | '24' | 'custom'>('12');
  const [reiEstimatedAthletesCustom, setReiEstimatedAthletesCustom] = useState<number>(12);
  const [reiConsecutiveWinsLimitEnabled, setReiConsecutiveWinsLimitEnabled] = useState<boolean>(false);
  const [reiConsecutiveWinsLimit, setReiConsecutiveWinsLimit] = useState<number>(3);
  const [reiChampionCriterion, setReiChampionCriterion] = useState<'wins' | 'sequence' | 'win_rate' | 'games_balance'>('wins');
  const [selectedReiHowItWorks, setSelectedReiHowItWorks] = useState<'individual' | 'duplas_fixas' | null>(null);
  
  const activeTournaments = data.tournaments.filter(t => t.status !== 'completed');
  const pastTournaments = data.tournaments.filter(t => t.status === 'completed').sort((a,b) => b.date - a.date);

  // Get Rankings
  const rankings = useMemo(() => calculateGlobalRankings(data), [data]);
  const topRankings = rankings.slice(0, 5); // Top 5
  
  const lastTournament = pastTournaments[0];

  if (loading) {
    return <div className="flex justify-center p-12 text-gray-400 font-bold">Carregando...</div>;
  }

  if (!currentUser) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 animate-in fade-in zoom-in duration-500">
        <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
          <Trophy className="w-12 h-12" />
        </div>
        <div>
          <h1 className="text-4xl font-black tracking-tighter text-gray-900 uppercase italic mb-2">RankUP</h1>
          <p className="text-xl text-gray-500 max-w-lg mx-auto">Faça login para criar e gerenciar seus próprios campeonatos de Beach Tennis.</p>
        </div>
        <button 
          onClick={signIn}
          className="bg-black text-white hover:bg-gray-800 font-bold py-4 px-8 rounded-xl shadow-lg transition-all text-lg"
        >
          Entrar com o Google
        </button>
      </div>
    );
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    let finalName = newTourneyName.trim();
    if (!finalName) {
      const formattedDate = format(new Date(), "dd/MM/yyyy");
      const modeLabel = newModality === 'individual' ? 'Individual' : newModality === 'duplas_fixas' ? 'Duplas Fixas' : newModality === 'rei_da_quadra' ? 'Rei da Quadra' : 'Duplas Mistas';
      const catLabel = newCategory === 'masculino' ? 'Masc' : newCategory === 'feminino' ? 'Fem' : 'Misto';
      finalName = `${formattedDate} - ${modeLabel} - ${catLabel}`;
    }
    const id = await createTournament(
      finalName, 
      Date.now(), 
      newModality, 
      newCategory, 
      newPoints1, 
      newPoints2, 
      newPoints3,
      newIsPaid,
      newRegistrationFee,
      newIsRanked
    );

    if (newModality === 'rei_da_quadra') {
      const finalAthletesCount = reiEstimatedAthletesType === 'custom' ? reiEstimatedAthletesCustom : Number(reiEstimatedAthletesType);
      await updateTournament(id, {
        reiDaQuadraType: reiType,
        reiDaQuadraDuration: reiDuration,
        reiDaQuadraCourts: reiCourts,
        reiDaQuadraEstimatedAthletes: finalAthletesCount,
        reiDaQuadraConsecutiveWinsLimit: reiConsecutiveWinsLimitEnabled ? reiConsecutiveWinsLimit : null,
        reiDaQuadraChampionCriterion: reiChampionCriterion,
        courts: reiCourts
      });
    }

    navigate(`/tournaments/${id}`);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-green-500 p-2 rounded-lg">
            <Trophy className="text-black w-8 h-8" />
          </div>
          <div>
            <h1 className="text-4xl font-black tracking-tighter text-gray-900 uppercase italic">RankUP</h1>
            <p className="text-gray-500 font-medium">Gestão de Ligas e Campeonatos</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/players')}
            className="bg-black hover:bg-gray-800 text-white font-semibold py-2.5 px-5 rounded-xl transition-all flex items-center gap-2"
          >
            <Users className="w-5 h-5 text-green-500" />
            <span className="hidden sm:inline">Atletas</span>
          </button>
          {currentRole !== 'viewer' && (
            <button 
              onClick={() => setShowCreateModal(true)}
              className="bg-green-500 hover:bg-green-600 text-black font-semibold py-2.5 px-5 rounded-xl shadow-sm shadow-green-500/20 transition-all flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              <span className="hidden sm:inline">Novo Campeonato</span>
            </button>
          )}
          {(currentRole === 'owner' || currentRole === 'admin') && (
            <button 
              onClick={() => setShowAccessModal(true)}
              className="bg-gray-250 border border-gray-300 hover:bg-gray-300 text-black font-semibold p-2.5 rounded-xl transition-all flex items-center justify-center"
              title="Configurações & Acessos"
            >
              <Settings className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {showCreateModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowCreateModal(false);
            }
          }}
        >
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto relative my-auto">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 rounded-lg p-1 transition-colors z-10"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="p-6 md:p-8">
              <h2 className="text-2xl font-black text-gray-900 tracking-tight mb-6">Criar Novo Campeonato</h2>
              <form onSubmit={handleCreate}>
                {newModality === 'rei_da_quadra' && reiStep === 'variation_select' ? (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-black text-gray-900 uppercase italic tracking-tight">Como será o Rei da Quadra?</h3>
                      <p className="text-sm text-gray-500">Escolha a variação de dinâmica de jogo para esta etapa.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Card Individual */}
                      <div 
                        onClick={() => setReiType('individual')}
                        className={cn(
                          "p-5 rounded-2xl border-2 text-left transition-all duration-300 cursor-pointer select-none relative flex flex-col justify-between",
                          reiType === 'individual'
                            ? "border-green-500 bg-green-50/10 ring-1 ring-green-500"
                            : "border-gray-200 hover:border-gray-300 bg-white"
                        )}
                      >
                        <div>
                          <div className="flex items-center gap-3 mb-3">
                            <span className="text-3xl p-2 bg-gray-100 rounded-xl">👤</span>
                            <div>
                              <h4 className="font-bold text-base text-gray-950">Individual</h4>
                              <span className="text-[10px] font-extrabold bg-green-100 text-green-800 px-2 py-0.5 rounded-full uppercase tracking-wider">Recomendado</span>
                            </div>
                          </div>
                          <p className="text-xs text-gray-600 leading-relaxed">
                            Cada atleta joga com parceiros diferentes e disputa um ranking individual em tempo real. Dinâmico e integrador.
                          </p>
                        </div>
                        <div className="mt-5 pt-3 border-t border-gray-100 flex justify-between items-center">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedReiHowItWorks('individual');
                            }}
                            className="text-xs text-green-600 hover:text-green-700 font-bold flex items-center gap-1 hover:underline outline-none"
                          >
                            Como funciona
                          </button>
                          {reiType === 'individual' && (
                            <span className="bg-green-500 text-black text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase">Selecionado</span>
                          )}
                        </div>
                      </div>

                      {/* Card Duplas Fixas */}
                      <div 
                        onClick={() => setReiType('duplas_fixas')}
                        className={cn(
                          "p-5 rounded-2xl border-2 text-left transition-all duration-300 cursor-pointer select-none relative flex flex-col justify-between",
                          reiType === 'duplas_fixas'
                            ? "border-green-500 bg-green-50/10 ring-1 ring-green-500"
                            : "border-gray-200 hover:border-gray-300 bg-white"
                        )}
                      >
                        <div>
                          <div className="flex items-center gap-3 mb-3">
                            <span className="text-3xl p-2 bg-gray-100 rounded-xl">👥</span>
                            <div>
                              <h4 className="font-bold text-base text-gray-950">Duplas Fixas</h4>
                              <span className="text-[10px] font-extrabold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full uppercase tracking-wider">Parceiro Fixo</span>
                            </div>
                          </div>
                          <p className="text-xs text-gray-600 leading-relaxed">
                            As duplas permanecem juntas durante todo o torneio e disputam a classificação em dupla. Estabilidade e parceria.
                          </p>
                        </div>
                        <div className="mt-5 pt-3 border-t border-gray-100 flex justify-between items-center">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedReiHowItWorks('duplas_fixas');
                            }}
                            className="text-xs text-green-600 hover:text-green-700 font-bold flex items-center gap-1 hover:underline outline-none"
                          >
                            Como funciona
                          </button>
                          {reiType === 'duplas_fixas' && (
                            <span className="bg-green-500 text-black text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase">Selecionado</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between pt-4 border-t border-gray-100">
                      <button 
                        type="button" 
                        onClick={() => setReiStep('normal_flow')}
                        className="px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-xl font-semibold text-sm"
                      >
                        Voltar
                      </button>
                      <button 
                        type="button" 
                        onClick={() => setReiStep('rei_config')}
                        className="px-5 py-2 bg-black text-white hover:bg-gray-800 rounded-xl font-semibold text-sm flex items-center gap-1.5"
                      >
                        Configurações do Modo <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : newModality === 'rei_da_quadra' && reiStep === 'rei_config' ? (
                  <div className="space-y-6">
                    <div className="border-b border-gray-150 pb-3">
                      <h3 className="text-lg font-black text-gray-900 uppercase italic tracking-tight">Configurações do Rei da Quadra</h3>
                      <p className="text-sm text-gray-500">Defina os parâmetros operacionais para a etapa.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {/* Tempo do Evento */}
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">⏱ Tempo Total do Evento</label>
                        <select 
                          value={reiDuration}
                          onChange={(e) => setReiDuration(e.target.value)}
                          className="w-full border border-gray-300 rounded-xl px-4 py-3 font-semibold text-gray-700 bg-white"
                        >
                          <option value="30">30 Minutos</option>
                          <option value="45">45 Minutos</option>
                          <option value="60">60 Minutos (1 Hora)</option>
                          <option value="90">90 Minutos</option>
                          <option value="120">120 Minutos (2 Horas)</option>
                          <option value="livre">Livre / Sem limite</option>
                        </select>
                      </div>

                      {/* Número de Quadras */}
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">🎾 Número de Quadras Disponíveis</label>
                        <select 
                          value={reiCourts}
                          onChange={(e) => setReiCourts(Number(e.target.value))}
                          className="w-full border border-gray-300 rounded-xl px-4 py-3 font-semibold text-gray-700 bg-white"
                        >
                          {[1,2,3,4,5,6].map(c => (
                            <option key={c} value={c}>{c} {c === 1 ? 'Quadra' : 'Quadras'}</option>
                          ))}
                        </select>
                      </div>

                      {/* Quantidade Estimada de Atletas */}
                      <div className="md:col-span-2 bg-gray-50 p-4 rounded-xl border border-gray-200">
                        <label className="block text-xs font-black text-gray-750 uppercase tracking-wider mb-2">👥 Quantidade Estimada de Atletas</label>
                        <div className="flex flex-wrap gap-2 mb-2">
                          {['8', '12', '16', '20', '24'].map(val => (
                            <button
                              type="button"
                              key={val}
                              onClick={() => {
                                setReiEstimatedAthletesType(val as any);
                                setReiEstimatedAthletesCustom(Number(val));
                              }}
                              className={cn(
                                "px-4 py-2 rounded-lg text-sm font-bold border transition-all",
                                reiEstimatedAthletesType === val
                                  ? "bg-black text-white border-black"
                                  : "bg-white text-gray-700 border-gray-200 hover:bg-gray-100"
                              )}
                            >
                              {val} Atletas
                            </button>
                          ))}
                          <button
                            type="button"
                            onClick={() => setReiEstimatedAthletesType('custom')}
                            className={cn(
                              "px-4 py-2 rounded-lg text-sm font-bold border transition-all",
                              reiEstimatedAthletesType === 'custom'
                                ? "bg-black text-white border-black"
                                : "bg-white text-gray-700 border-gray-200 hover:bg-gray-100"
                            )}
                          >
                            Outro número...
                          </button>
                        </div>
                        {reiEstimatedAthletesType === 'custom' && (
                          <div className="animate-in slide-in-from-top-2 duration-200 mt-2">
                            <input 
                              type="number"
                              min={4}
                              value={reiEstimatedAthletesCustom}
                              onChange={(e) => setReiEstimatedAthletesCustom(Math.max(4, Number(e.target.value)))}
                              className="border border-gray-300 bg-white rounded-lg px-3 py-2 font-bold w-32 focus:ring-2 focus:ring-green-500"
                            />
                            <span className="text-xs font-semibold text-gray-500 ml-2">atletas estimativos</span>
                          </div>
                        )}
                      </div>

                      {/* Limite de Vitórias Consecutivas */}
                      <div className="md:col-span-2 p-4 bg-gray-50 rounded-xl border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <label className="text-sm font-bold text-gray-800 block">👑 Limite de Vitórias Consecutivas?</label>
                          <span className="text-xs text-gray-500 block">
                            Se ativado, a dupla campeã da quadra deve sair voluntariamente ao alcançar o limite para rotacionar os demais.
                          </span>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={reiConsecutiveWinsLimitEnabled}
                              onChange={(e) => setReiConsecutiveWinsLimitEnabled(e.target.checked)}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                          </label>

                          {reiConsecutiveWinsLimitEnabled && (
                            <select
                              value={reiConsecutiveWinsLimit}
                              onChange={(e) => setReiConsecutiveWinsLimit(Number(e.target.value))}
                              className="border border-gray-300 bg-white rounded-lg px-2 py-1 font-bold text-sm focus:ring-2 focus:ring-green-500 ml-2 animate-in zoom-in-95 duration-200"
                            >
                              <option value={0}>0 Jogos (Sempre rotaciona)</option>
                              <option value={1}>1 Jogo consecutivo</option>
                              <option value={2}>2 Jogos consecutivos</option>
                              <option value={3}>3 Jogos consecutivos</option>
                              <option value={4}>4 Jogos consecutivos</option>
                              <option value={5}>5 Jogos consecutivos</option>
                              <option value={6}>6 Jogos consecutivos</option>
                              <option value={7}>7 Jogos consecutivos</option>
                              <option value={8}>8 Jogos consecutivos</option>
                              <option value={9}>9 Jogos consecutivos</option>
                              <option value={10}>10 Jogos consecutivos</option>
                            </select>
                          )}
                        </div>
                      </div>

                      {/* Critério de Desempate / Campeão */}
                      <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">🏆 Critério para definir o campeão</label>
                        <select 
                          value={reiChampionCriterion}
                          onChange={(e) => setReiChampionCriterion(e.target.value as any)}
                          className="w-full border border-gray-300 rounded-xl px-4 py-3 font-semibold text-gray-700 bg-white"
                        >
                          <option value="wins">Maior número de vitórias (Recomendado)</option>
                          <option value="sequence">Maior sequência de vitórias (Consistência)</option>
                          <option value="win_rate">Melhor aproveitamento (% de vitórias)</option>
                          <option value="games_balance">Maior saldo de games</option>
                        </select>
                        <p className="text-xs text-gray-500 mt-1.5 font-medium leading-normal bg-green-50 border border-green-100 p-2.5 rounded-lg text-green-950">
                          {reiChampionCriterion === 'wins' && '🏆 Maior número de vitórias: Vence quem tiver mais vitórias acumuladas, independente do número de partidas.'}
                          {reiChampionCriterion === 'sequence' && '🔥 Maior sequência de vitórias: Vence quem conseguir permanecer mais partidas seguidas defendendo a quadra como Rei.'}
                          {reiChampionCriterion === 'win_rate' && '📈 Melhor aproveitamento: Vence quem tiver a maior taxa percentual de vitórias sob o total de jogos disputados.'}
                          {reiChampionCriterion === 'games_balance' && '🎾 Maior saldo de games: O desempate e classificação baseia-se no saldo total de games (Games Vencidos - Games Perdidos).'}
                        </p>
                      </div>
                    </div>

                    <div className="flex justify-between pt-4 border-t border-gray-100">
                      <button 
                        type="button" 
                        onClick={() => setReiStep('variation_select')}
                        className="px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-xl font-semibold text-sm"
                      >
                        Voltar
                      </button>
                      <button 
                        type="submit" 
                        className="px-6 py-2.5 bg-green-500 hover:bg-green-650 text-black rounded-xl font-bold text-sm shadow-md flex items-center gap-1.5"
                      >
                        <Check className="w-4 h-4" /> Criar & Iniciar Campeonato
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-extrabold text-gray-900 tracking-tight mb-2">Escolha o Modo de jogo</label>
                      
                      {/* Grid of game mode cards */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {GAME_MODES.map((mode) => {
                          const isSelected = newModality === mode.id;
                          const isUpcoming = mode.status === 'upcoming';
                          return (
                            <div
                              key={mode.id}
                              onClick={() => {
                                if (isUpcoming) return;
                                setNewModality(mode.id as TournamentModality);
                                if (mode.id === 'mistas_aleatorias') setNewCategory('misto');
                              }}
                              className={cn(
                                "relative flex flex-col justify-between p-3 sm:p-4 rounded-2xl border-2 text-left transition-all duration-300 select-none",
                                isUpcoming 
                                  ? "bg-gray-50/60 border-gray-150 opacity-60 cursor-not-allowed" 
                                  : isSelected 
                                    ? "border-green-500 bg-green-50/20 shadow-md shadow-green-500/5 ring-1 ring-green-500 cursor-pointer scale-[1.01]" 
                                    : "border-gray-250 hover:border-gray-300 hover:shadow-sm cursor-pointer hover:scale-[1.005] bg-white"
                              )}
                            >
                              <div className="flex gap-3">
                                <span className="text-2xl p-2 bg-gray-100 rounded-xl flex items-center justify-center h-11 w-11 shrink-0 shadow-inner">
                                  {mode.icon}
                                </span>
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <h4 className="font-bold text-sm text-gray-900 tracking-tight leading-none">{mode.title}</h4>
                                    {isUpcoming && (
                                      <span className="bg-gray-200 text-gray-600 text-[8px] font-extrabold px-1.5 py-0.5 rounded-md uppercase tracking-wider">Em Breve</span>
                                    )}
                                  </div>
                                  <p className="text-[11px] text-gray-500 font-medium leading-tight">
                                    {mode.description}
                                  </p>
                                </div>
                              </div>
                              <div className="mt-3 pt-2 border-t border-gray-100/60 flex justify-between items-center">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedRuleMode(mode);
                                  }}
                                  className="text-[11px] text-green-600 hover:text-green-700 font-bold flex items-center gap-1 hover:underline outline-none focus:ring-1 focus:ring-green-500 rounded px-1.5 py-0.5"
                                >
                                  <HelpCircle className="w-3.5 h-3.5 shrink-0" />
                                  Como funciona
                                </button>
                                {isSelected && !isUpcoming && (
                                  <span className="bg-green-500 text-black text-[8px] font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wider animate-in zoom-in duration-200">Selecionado</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Categoria (Gênero)</label>
                      <select 
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value as 'masculino' | 'feminino' | 'misto')}
                        disabled={newModality === 'mistas_aleatorias'}
                        className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed font-semibold text-gray-700 bg-white"
                      >
                        <option value="masculino">Masculino</option>
                        <option value="feminino">Feminino</option>
                        <option value="misto">Misto</option>
                      </select>
                    </div>

                    <div className="border-t border-gray-100 pt-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-sm font-bold text-gray-750 block">Campeonato Ranqueado?</label>
                          <span className="text-[11px] text-gray-500 block">Atribui pontos aos atletas no ranking geral.</span>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setNewIsRanked(false);
                            }}
                            className={cn(
                              "w-16 h-8 flex items-center justify-center rounded-lg text-xs font-bold border transition-colors",
                              !newIsRanked ? "bg-black text-white border-black" : "bg-white text-gray-700 border-gray-200"
                            )}
                          >
                            Não
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setNewIsRanked(true);
                            }}
                            className={cn(
                              "w-16 h-8 flex items-center justify-center rounded-lg text-xs font-bold border transition-colors",
                              newIsRanked ? "bg-green-500 text-black border-green-500" : "bg-white text-gray-700 border-gray-200"
                            )}
                          >
                            Sim
                          </button>
                        </div>
                      </div>

                      {newIsRanked && (
                        <div className="bg-gray-50 p-3 rounded-xl border border-gray-150 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                          <span className="text-xs font-bold text-gray-700 block">Pontuação do Ranking</span>
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">1º Lugar</label>
                              <input 
                                type="number" 
                                min={0}
                                value={newPoints1}
                                onChange={(e) => setNewPoints1(Number(e.target.value))}
                                className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">2º Lugar</label>
                              <input 
                                type="number" 
                                min={0}
                                value={newPoints2}
                                onChange={(e) => setNewPoints2(Number(e.target.value))}
                                className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">3º Lugar</label>
                              <input 
                                type="number" 
                                min={0}
                                value={newPoints3}
                                onChange={(e) => setNewPoints3(Number(e.target.value))}
                                className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="border-t border-gray-100 pt-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-sm font-bold text-gray-750 block">Campeonato Pago?</label>
                          <span className="text-[11px] text-gray-500 block">Define se as inscrições terão cobrança de taxa.</span>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => { setNewIsPaid(false); setNewRegistrationFee(0); }}
                            className={cn(
                              "w-16 h-8 flex items-center justify-center rounded-lg text-xs font-bold border transition-colors",
                              !newIsPaid ? "bg-black text-white border-black" : "bg-white text-gray-700 border-gray-200"
                            )}
                          >
                            Não
                          </button>
                          <button
                            type="button"
                            onClick={() => setNewIsPaid(true)}
                            className={cn(
                              "w-16 h-8 flex items-center justify-center rounded-lg text-xs font-bold border transition-colors",
                              newIsPaid ? "bg-green-500 text-black border-green-500" : "bg-white text-gray-700 border-gray-200"
                            )}
                          >
                            Sim
                          </button>
                        </div>
                      </div>

                      {newIsPaid && (
                        <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Valor da Inscrição (R$)</label>
                          <input
                            type={isFeeFocused ? "number" : "text"}
                            value={isFeeFocused ? (newRegistrationFee === 0 ? "" : newRegistrationFee) : (newRegistrationFee > 0 ? `R$ ${newRegistrationFee.toLocaleString('pt-BR')},00` : "R$ 0,00")}
                            onFocus={() => setIsFeeFocused(true)}
                            onBlur={() => setIsFeeFocused(false)}
                            onChange={(e) => {
                              const val = e.target.value === "" ? 0 : Number(e.target.value);
                              setNewRegistrationFee(val);
                            }}
                            placeholder="Ex: 50"
                            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none font-bold bg-white"
                          />
                        </div>
                      )}
                    </div>

                    <div className="border-t border-gray-100 pt-4">
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                        Nome da Etapa <span className="text-gray-400 text-[10px] font-normal lowercase italic">(opcional)</span>
                      </label>
                      <input 
                        type="text" 
                        value={newTourneyName}
                        onChange={(e) => setNewTourneyName(e.target.value)}
                        placeholder="Ex: Etapa Verão 2024 (Deixe em branco para gerar automático)"
                        className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-base font-semibold"
                      />
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                      <button 
                        type="button" 
                        onClick={() => setShowCreateModal(false)}
                        className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl font-medium text-sm"
                      >
                        Cancelar
                      </button>
                      {newModality === 'rei_da_quadra' ? (
                        <button 
                          type="button" 
                          onClick={() => setReiStep('variation_select')}
                          className="px-5 py-2 bg-green-500 text-black hover:bg-green-600 rounded-xl font-bold text-sm flex items-center gap-1.5"
                        >
                          Avançar para Variação <ArrowRight className="w-4 h-4" />
                        </button>
                      ) : (
                        <button 
                          type="submit" 
                          className="px-5 py-2 bg-black text-white hover:bg-gray-800 rounded-xl font-semibold text-sm"
                        >
                          Criar & Iniciar
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </form>
            </div>
          </div>
        </div>
      )}

      {selectedRuleMode && (
        <div 
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setSelectedRuleMode(null)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden relative animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setSelectedRuleMode(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 rounded-lg p-1.5 transition-colors"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="p-6">
              <div className="flex items-center gap-3.5 mb-5 border-b border-gray-100 pb-4">
                <div className="bg-green-50 text-3xl w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-inner">
                  {selectedRuleMode.icon}
                </div>
                <div>
                  <h3 className="text-xl font-black text-gray-900 tracking-tight">
                    {selectedRuleMode.modalTitle}
                  </h3>
                  <p className="text-xs text-gray-500 font-semibold mt-0.5">
                    {selectedRuleMode.modalSubtitle}
                  </p>
                </div>
              </div>

              <div className="space-y-5 max-h-[55vh] overflow-y-auto pr-1">
                <div>
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2.5">Como funciona?</h4>
                  <ul className="space-y-2.5">
                    {selectedRuleMode.rules.map((rule, idx) => (
                      <li key={idx} className="text-xs text-gray-700 leading-relaxed flex items-start gap-2">
                        <span className="text-green-500 font-bold mt-0.5">✔</span>
                        <span>{rule}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {selectedRuleMode.registeredStats && (
                  <div className="bg-blue-50/60 border border-blue-100 p-3.5 rounded-xl">
                    <h4 className="text-xs font-bold text-blue-800 uppercase tracking-wider mb-2">Estatísticas Registradas pelo Sistema:</h4>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {selectedRuleMode.registeredStats.map((stat, idx) => (
                        <li key={idx} className="text-xs text-blue-950 font-semibold flex items-center gap-2">
                          <span className="w-1.5 h-1.5 bg-blue-500 rounded-full shrink-0"></span>
                          {stat}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div>
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Ideal para:</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedRuleMode.idealFor.map((item, idx) => (
                      <span key={idx} className="bg-gray-100 text-gray-700 text-xs font-bold px-2.5 py-1 rounded-lg">
                        ✔ {item}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="mt-6 pt-4 border-t border-gray-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedRuleMode(null)}
                  className="px-5 py-2.5 bg-black hover:bg-gray-800 text-white font-bold rounded-xl text-xs transition-colors shadow-md"
                >
                  Entendi, fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal removed */}

      {selectedReiHowItWorks && (
        <div 
          className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setSelectedReiHowItWorks(null)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden relative animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setSelectedReiHowItWorks(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 rounded-lg p-1.5 transition-colors"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="p-6">
              <div className="flex items-center gap-3.5 mb-5 border-b border-gray-100 pb-4">
                <div className="bg-green-50 text-3xl w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-inner">
                  {selectedReiHowItWorks === 'individual' ? '👤' : '👥'}
                </div>
                <div>
                  <h3 className="text-xl font-black text-gray-900 tracking-tight">
                    Rei da Quadra {selectedReiHowItWorks === 'individual' ? 'Individual' : 'em Duplas Fixas'}
                  </h3>
                  <p className="text-xs text-gray-500 font-semibold mt-0.5">
                    Entenda o funcionamento e dinâmica de rotação
                  </p>
                </div>
              </div>

              <div className="space-y-5 max-h-[55vh] overflow-y-auto pr-1">
                {selectedReiHowItWorks === 'individual' ? (
                  <>
                    <div>
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Funcionamento Básico</h4>
                      <p className="text-xs text-gray-600 leading-relaxed">
                        Os atletas entram na fila individualmente. Duas duplas iniciam na quadra. A cada partida realizada, a dupla vencedora permanece na quadra (defende o título) e a dupla perdedora vai para o final da fila de espera.
                      </p>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">A Rotação de Parceiros</h4>
                      <p className="text-xs text-gray-600 leading-relaxed">
                        Ao entrarem como desafiantes, os dois próximos atletas da fila jogam juntos. Isso faz com que você jogue com parceiros diferentes ao longo do evento, promovendo alta integração social e técnica.
                      </p>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Pontuação & Classificação</h4>
                      <p className="text-xs text-gray-600 leading-relaxed">
                        Cada vitória na quadra soma 1 ponto individual para cada um dos dois atletas que venceram. O ranking é atualizado em tempo real. No final do tempo, o atleta com mais vitórias é coroado o Rei da Quadra.
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Funcionamento Básico</h4>
                      <p className="text-xs text-gray-600 leading-relaxed">
                        As duplas são formadas logo no início e permanecem fixas durante todo o evento. Duas duplas começam jogando. A dupla que vencer continua na quadra como defensora ("Rei") e a perdedora vai para a fila de espera em dupla.
                      </p>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Estabilidade das Parcerias</h4>
                      <p className="text-xs text-gray-600 leading-relaxed">
                        Não há mistura de parceiros. É a dinâmica perfeita para duplas que já treinam juntas ou querem disputar de forma mais competitiva, preservando a entrosação tática da dupla.
                      </p>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Pontuação & Classificação</h4>
                      <p className="text-xs text-gray-600 leading-relaxed">
                        Cada vitória na quadra acumula 1 ponto para a dupla. A classificação e o ranking das duplas são exibidos na tela. A dupla que tiver mais vitórias no término do tempo será coroada a Dupla Rei da Quadra.
                      </p>
                    </div>
                  </>
                )}

                <div>
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Regra de Saída Voluntária</h4>
                  <p className="text-xs text-gray-500 leading-relaxed bg-amber-50 p-2.5 rounded-lg border border-amber-100 text-amber-900">
                    Se o limite de vitórias consecutivas estiver ativado, a dupla que alcançar o número máximo de vitórias seguidas (ex: 3) deve sair voluntariamente para dar vez aos desafiantes da fila, garantindo que todos joguem bastante.
                  </p>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedReiHowItWorks(null)}
                  className="px-5 py-2.5 bg-black hover:bg-gray-800 text-white font-bold rounded-xl text-xs transition-colors shadow-md"
                >
                  Entendi, fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAccessModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowAccessModal(false);
            }
          }}
        >
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto relative my-auto">
            <button
              type="button"
              onClick={() => setShowAccessModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 rounded-lg p-1 transition-colors"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Configurações & Acessos
              </h2>
              <p className="text-sm text-gray-500 mb-6">Convide pessoas para visualizar ou editar campeonatos deste espaço.</p>
              
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Usuário</label>
                  <input 
                    type="text" 
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                    placeholder="Nome completo"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none mb-4"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">E-mail do Usuário</label>
                  <input 
                    type="email" 
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="email@exemplo.com"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nível de Acesso</label>
                  <select 
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as 'editor' | 'viewer')}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                  >
                    <option value="editor">Editor (Pode criar e editar)</option>
                    <option value="viewer">Visualizador (Apenas leitura)</option>
                  </select>
                </div>
                <button 
                  onClick={async () => {
                    if (inviteEmail && inviteName) {
                      await inviteUser(inviteEmail, inviteName, inviteRole);
                      setInviteEmail('');
                      setInviteName('');
                      alert('Convite enviado!');
                    } else {
                      alert('Preencha o nome e o e-mail do usuário.');
                    }
                  }}
                  className="w-full bg-green-500 hover:bg-green-600 text-black font-semibold py-2 rounded-lg flex items-center justify-center gap-2 transition-colors"
                >
                  <Send className="w-4 h-4" />
                  Enviar Convite
                </button>
              </div>

              {workspaces.find(w => w.id === activeWorkspaceId)?.members.length ? (
                <div className="mb-6">
                  <h3 className="font-bold text-gray-900 mb-3">Membros Existentes</h3>
                  <div className="space-y-3 max-h-48 overflow-y-auto">
                    {workspaces.find(w => w.id === activeWorkspaceId)?.members.map(uid => {
                      const ws = workspaces.find(w => w.id === activeWorkspaceId)!;
                      const role = ws.roles[uid];
                      const details = ws.memberDetails?.[uid];
                      if (uid === ws.ownerId) return null; // Hide owner
                      return (
                        <div key={uid} className="flex flex-col gap-2 p-3 bg-gray-50 rounded-lg border border-gray-100">
                          <div className="flex flex-col">
                            <span className="font-semibold text-sm">{details?.name || 'Usuário Sem Nome'}</span>
                            <span className="text-xs text-gray-500">{details?.email || 'Sem e-mail'}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <select
                              value={role}
                              onChange={(e) => updateUserRole(uid, e.target.value as 'editor' | 'viewer')}
                              className="text-xs border border-gray-300 rounded px-2 py-1 flex-1"
                            >
                              <option value="editor">Editor</option>
                              <option value="viewer">Visualizador</option>
                            </select>
                            <button
                              onClick={() => {
                                if (confirm('Tem certeza que deseja deletar este usuário do espaço de trabalho?')) {
                                  removeUserFromWorkspace(uid);
                                }
                              }}
                              className="text-xs font-semibold text-red-500 hover:bg-red-50 px-2 py-1 rounded transition-colors"
                            >
                              Deletar
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {sentInvites.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                    Convites Enviados (Pendentes)
                  </h3>
                  <div className="space-y-3 max-h-48 overflow-y-auto">
                    {sentInvites.map(inv => (
                      <div key={inv.id} className="flex items-center justify-between p-3 bg-amber-50/50 rounded-lg border border-amber-100">
                        <div className="flex flex-col min-w-0">
                          <span className="font-semibold text-sm truncate">{inv.name || 'Convidado'}</span>
                          <span className="text-xs text-gray-500 truncate">{inv.email}</span>
                          <span className="text-[10px] text-amber-600 font-semibold capitalize mt-0.5">Acesso: {inv.role === 'editor' ? 'Editor' : 'Visualizador'}</span>
                        </div>
                        <button
                          onClick={async () => {
                            if (confirm('Tem certeza que deseja cancelar este convite?')) {
                              await cancelInvite(inv.id);
                            }
                          }}
                          className="text-xs text-red-500 hover:bg-red-50 px-2 py-1.5 rounded transition-colors"
                        >
                          Cancelar
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-4 border-t border-gray-100">
                <button 
                  type="button" 
                  onClick={() => setShowAccessModal(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium"
                >
                  Fechar
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
