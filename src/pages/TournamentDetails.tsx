import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/AppContext';
import { ArrowLeft, Trash2, Printer, Users, DollarSign, Calendar as CalendarIcon, X, Share2, Check } from 'lucide-react';
import DraftPhase from '../components/tournament/DraftPhase';
import GroupPhase from '../components/tournament/GroupPhase';
import PlayoffPhase from '../components/tournament/PlayoffPhase';
import ReiDaQuadraPhase from '../components/tournament/ReiDaQuadraPhase';
import TournamentFinance from '../components/tournament/TournamentFinance';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { calculatePlayerStats } from '../lib/tournament';

export default function TournamentDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, deleteTournament, updateTournament, currentRole, loading, setViewingTournamentId } = useAppStore();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showEndTournamentModal, setShowEndTournamentModal] = useState(false);
  const [endSumRanking, setEndSumRanking] = useState(true);
  const [activeTab, setActiveTab] = useState<'matches' | 'finance'>('matches');

  // Form State to activate finance mid-tournament if they didn't do it at start
  const [feeInput, setFeeInput] = useState<number>(50);

  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setViewingTournamentId(id || null);
    return () => {
      setViewingTournamentId(null);
    };
  }, [id, setViewingTournamentId]);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const tournament = data.tournaments.find(t => t.id === id);

  if (loading) {
    return (
      <div className="p-12 text-center text-gray-500 flex flex-col items-center justify-center min-h-[300px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mb-4"></div>
        <p className="text-sm font-semibold text-gray-400">Carregando dados do torneio...</p>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="p-12 text-center text-gray-500">
        Torneio não encontrado.
        <br/><br/>
        <button onClick={() => navigate('/')} className="text-blue-500 font-bold hover:underline">Voltar</button>
      </div>
    );
  }

  const handleDelete = async () => {
    await deleteTournament(tournament.id);
    navigate('/tournaments');
  };

  const handleActivateFinance = async () => {
    if (currentRole === 'viewer') return;
    await updateTournament(tournament.id, {
      isPaid: true,
      registrationFee: feeInput,
      payments: {},
      expenses: []
    });
  };

  const handleEarlyEndTournament = async () => {
    if (currentRole === 'viewer') return;
    
    const groupMatches = tournament.matches.filter(m => m.type === 'group');
    const allGroupPlayers: string[] = [];
    Object.values(tournament.groups).forEach((list: any) => {
      list.forEach((pid: any) => {
        if (typeof pid === 'string') {
          allGroupPlayers.push(pid);
        } else if (pid && pid.t1) {
          allGroupPlayers.push(pid.t1, pid.t2);
        }
      });
    });
    
    const gStats = calculatePlayerStats(allGroupPlayers, groupMatches);
    const seen = new Set<string>();
    const orderedDuos: string[][] = [];
    
    for (const stat of gStats) {
      if (seen.has(stat.id)) continue;
      
      let partnerId = '';
      for (const groupList of Object.values(tournament.groups)) {
        const idx = (groupList as any[]).indexOf(stat.id);
        if (idx !== -1) {
          const partnerIdx = idx % 2 === 0 ? idx + 1 : idx - 1;
          partnerId = (groupList as any[])[partnerIdx] || '';
          break;
        }
      }
      
      seen.add(stat.id);
      if (partnerId) seen.add(partnerId);
      orderedDuos.push(partnerId ? [stat.id, partnerId] : [stat.id]);
    }

    const champion = orderedDuos[0] || [];
    const runnerUp = orderedDuos[1] || [];
    const thirdPlace = orderedDuos[2] || [];
    const fourthPlace = orderedDuos[3] || [];
    const eliminated = orderedDuos.slice(4).flat();

    await updateTournament(tournament.id, {
      status: 'completed',
      isRanked: endSumRanking,
      finalRankings: {
        champion,
        runnerUp,
        thirdPlace,
        fourthPlace,
        eliminated
      }
    });
    setShowEndTournamentModal(false);
  };

  return (
    <div className="space-y-6">
      
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h3 className="text-xl font-bold mb-2">Excluir Torneio</h3>
            <p className="text-gray-600 mb-6">Tem certeza que deseja apagar este torneio? Esta ação não pode ser desfeita.</p>
            <div className="flex gap-3 justify-end">
              <button 
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 font-semibold text-gray-700 hover:bg-gray-100 rounded-xl"
              >
                Cancelar
              </button>
              <button 
                onClick={handleDelete}
                className="px-4 py-2 font-semibold text-white bg-red-500 hover:bg-red-600 rounded-xl"
              >
                Sim, excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {showEndTournamentModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl border border-gray-100 relative animate-in zoom-in-95 duration-200">
            <button 
              onClick={() => setShowEndTournamentModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-xl font-bold mb-2 text-gray-900">
              Encerrar Campeonato
            </h3>
            <p className="text-gray-600 text-sm mb-6 leading-relaxed">
              Você tem certeza que deseja encerrar o campeonato imediatamente? Esta ação não pode ser desfeita. O pódio e as classificações finais serão gerados com base nos resultados das partidas jogadas até o momento.
            </p>
            
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200/50 space-y-4 mb-6">
              <span className="font-bold text-xs text-gray-500 uppercase tracking-wider block">Configuração de Ranking</span>
              
              <label className="flex items-start gap-3 cursor-pointer">
                <input 
                  type="checkbox"
                  checked={endSumRanking}
                  onChange={(e) => setEndSumRanking(e.target.checked)}
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
                onClick={() => setShowEndTournamentModal(false)}
                className="px-4 py-2 font-semibold text-gray-700 hover:bg-gray-100 rounded-xl text-sm"
              >
                Cancelar
              </button>
              <button 
                onClick={handleEarlyEndTournament}
                className="px-4 py-2 font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl text-sm shadow-sm transition-colors"
              >
                Confirmar e Encerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {showPrintModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl border border-gray-100 relative animate-in zoom-in-95 duration-200">
            <button 
              onClick={() => setShowPrintModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
              <Printer className="w-5 h-5 text-green-500" />
              Imprimir / Salvar em PDF
            </h3>
            <div className="text-gray-600 text-sm space-y-3 mb-6">
              <p>
                Como você está no ambiente de visualização do AI Studio, as políticas do navegador podem bloquear a exibição direta da janela de impressão.
              </p>
              <div className="bg-green-50 text-green-900 border border-green-100 p-3.5 rounded-xl text-xs space-y-1">
                <span className="font-bold block">Como salvar como PDF / Imprimir perfeitamente:</span>
                <ol className="list-decimal pl-4 space-y-1">
                  <li>Clique no botão <strong className="bg-white px-1.5 py-0.5 rounded border border-gray-200">Open in new tab</strong> no topo direito da tela para abrir o aplicativo diretamente.</li>
                  <li>Na nova aba, clique neste mesmo botão de impressora.</li>
                  <li>Na janela que abrir, selecione a opção <strong className="text-green-800">"Salvar como PDF"</strong> ou escolha a sua impressora.</li>
                </ol>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button 
                onClick={() => setShowPrintModal(false)}
                className="px-4 py-2 font-semibold text-gray-700 hover:bg-gray-100 rounded-xl text-sm"
              >
                Fechar
              </button>
              <button 
                onClick={() => {
                  setShowPrintModal(false);
                  setTimeout(() => {
                    window.print();
                  }, 300);
                }}
                className="px-4 py-2 font-bold text-white bg-green-500 hover:bg-green-600 rounded-xl text-sm"
              >
                Imprimir/Salvar Agora
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/tournaments')}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">{tournament.name}</h1>
            <p className="text-gray-500 mb-1">
              {format(tournament.date, "dd 'de' MMMM, yyyy", { locale: ptBR })} • {tournament.participants.length} Atleta{tournament.participants.length !== 1 ? 's' : ''}
            </p>
            <div className="flex gap-2 text-xs font-semibold text-gray-500">
              <span className="bg-gray-100 px-2 py-0.5 rounded-md">
                {tournament.modality === 'individual' ? 'Individual' : 
                 tournament.modality === 'duplas_fixas' ? 'Duplas Fixas' : 
                 tournament.modality === 'mistas_aleatorias' ? 'Duplas Sorteadas' : 
                 tournament.modality === 'rei_da_quadra' ? 'Rei da Quadra' : 
                 tournament.modality === 'mata_mata' ? 'Mata-Mata' : 'Duplas Mistas'}
              </span>
              <span className="bg-gray-100 px-2 py-0.5 rounded-md capitalize">
                {tournament.category || (tournament.modality === 'mistas_aleatorias' ? 'Misto' : 'Masculino')}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {tournament.status !== 'completed' && tournament.status !== 'draft' && currentRole !== 'viewer' && (
            <button 
              onClick={() => setShowEndTournamentModal(true)}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm print:hidden"
            >
              Encerrar Campeonato
            </button>
          )}
          <span className={`px-3 py-1 text-sm font-bold uppercase tracking-wider rounded-lg
            ${tournament.status === 'draft' ? 'bg-blue-100 text-blue-700' :
              tournament.status === 'group_stage' ? 'bg-orange-100 text-orange-700' :
              tournament.status === 'playoffs' ? 'bg-purple-100 text-purple-700' :
              'bg-green-100 text-green-700'
            }
          `}>
            {tournament.status === 'draft' ? 'Rascunho' :
             tournament.status === 'group_stage' ? 'Fase de Grupos' :
             tournament.status === 'playoffs' ? 'Eliminatórias' : 'Finalizado'}
          </span>
          <button 
            onClick={handleShare}
            className={`flex items-center gap-2 px-3.5 py-1.5 font-bold rounded-xl transition-all print:hidden ${
              copied 
                ? 'bg-green-500 text-black shadow-md scale-102' 
                : 'bg-black text-white hover:bg-gray-800 shadow-sm'
            }`}
            title="Compartilhar Link do Campeonato"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-black" />
                <span className="text-xs">Link Copiado!</span>
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4 text-green-400" />
                <span className="text-xs">Compartilhar</span>
              </>
            )}
          </button>
          <button 
            onClick={() => setShowPrintModal(true)}
            className="p-2 text-gray-500 hover:bg-gray-100 rounded-xl transition-colors print:hidden"
            title="Exportar PDF / Imprimir"
          >
            <Printer className="w-5 h-5" />
          </button>
          {currentRole !== 'viewer' && (
            <button 
              onClick={() => setShowDeleteModal(true)}
              className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors print:hidden"
              title="Excluir Torneio"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex border-b border-gray-200 gap-2 print:hidden">
        <button
          onClick={() => setActiveTab('matches')}
          className={`pb-3 px-5 text-sm font-bold border-b-2 transition-all ${
            activeTab === 'matches' ? 'border-green-500 text-black' : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          Jogos e Chaves
        </button>
        <button
          onClick={() => setActiveTab('finance')}
          className={`pb-3 px-5 text-sm font-bold border-b-2 transition-all ${
            activeTab === 'finance' ? 'border-green-500 text-black' : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          Financeiro do Evento
        </button>
      </div>

      {/* Tab Contents */}
      <div className="pb-12 space-y-12">
        {activeTab === 'matches' && (
          <div className="space-y-12">
            {tournament.status === 'draft' && (
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-6">
                <h3 className="font-bold text-lg mb-4">Configurações do Campeonato</h3>
                
                {tournament.modality === 'rei_da_quadra' ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                      {/* Formato */}
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Formato do Rei da Quadra</label>
                        <select
                          value={tournament.reiDaQuadraType || 'individual'}
                          onChange={(e) => updateTournament(tournament.id, { reiDaQuadraType: e.target.value as 'individual' | 'duplas_fixas' })}
                          disabled={currentRole === 'viewer'}
                          className="w-full border border-gray-300 rounded-xl px-4 py-2.5 font-semibold text-gray-750 bg-white"
                        >
                          <option value="individual">👤 Individual (Parceiros rotativos)</option>
                          <option value="duplas_fixas">👥 Duplas Fixas (Parceiro fixo)</option>
                        </select>
                      </div>

                      {/* Tempo */}
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">⏱ Tempo Estimado de Jogo</label>
                        <select
                          value={tournament.reiDaQuadraDuration || '60'}
                          onChange={(e) => updateTournament(tournament.id, { reiDaQuadraDuration: e.target.value })}
                          disabled={currentRole === 'viewer'}
                          className="w-full border border-gray-300 rounded-xl px-4 py-2.5 font-semibold text-gray-750 bg-white"
                        >
                          <option value="30">30 Minutos</option>
                          <option value="45">45 Minutos</option>
                          <option value="60">60 Minutos (1 Hora)</option>
                          <option value="90">90 Minutos</option>
                          <option value="120">120 Minutos (2 Horas)</option>
                          <option value="livre">Livre / Sem limite</option>
                        </select>
                      </div>

                      {/* Quadras */}
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">🎾 Quadras Disponíveis</label>
                        <select
                          value={tournament.courts || tournament.reiDaQuadraCourts || 2}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            updateTournament(tournament.id, { courts: val, reiDaQuadraCourts: val });
                          }}
                          disabled={currentRole === 'viewer'}
                          className="w-full border border-gray-300 rounded-xl px-4 py-2.5 font-semibold text-gray-750 bg-white"
                        >
                          {[1, 2, 3, 4, 5, 6].map(c => (
                            <option key={c} value={c}>{c} {c === 1 ? 'Quadra' : 'Quadras'}</option>
                          ))}
                        </select>
                      </div>

                      {/* Limite de Vitórias Consecutivas */}
                      <div className="md:col-span-2 bg-green-50 border border-green-200 p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <label className="text-sm font-bold text-green-950 block">👑 Permanência na Quadra (0 a 10 jogos)</label>
                          <span className="text-xs text-green-750 block leading-relaxed">
                            Defina quantos jogos consecutivos os vencedores defendem a quadra antes de rotacionarem obrigatoriamente para a fila de espera.
                          </span>
                        </div>
                        <div className="shrink-0">
                          <select
                            value={tournament.reiDaQuadraConsecutiveWinsLimit === null || tournament.reiDaQuadraConsecutiveWinsLimit === undefined ? 'unlimited' : tournament.reiDaQuadraConsecutiveWinsLimit}
                            onChange={(e) => {
                              const val = e.target.value;
                              updateTournament(tournament.id, {
                                reiDaQuadraConsecutiveWinsLimit: val === 'unlimited' ? null : Number(val)
                              });
                            }}
                            disabled={currentRole === 'viewer'}
                            className="border border-green-300 bg-white rounded-lg px-3 py-2 font-bold text-sm text-green-950 focus:ring-2 focus:ring-green-500"
                          >
                            <option value="unlimited">Sem limite (Permanência livre)</option>
                            <option value={0}>0 Jogos (Sempre rotaciona)</option>
                            <option value={1}>1 vitória (Sai imediato)</option>
                            {[2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                              <option key={n} value={n}>
                                {n} vitórias seguidas
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Critério do Campeão */}
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">🏆 Critério para definir o campeão</label>
                        <select
                          value={tournament.reiDaQuadraChampionCriterion || 'wins'}
                          onChange={(e) => updateTournament(tournament.id, { reiDaQuadraChampionCriterion: e.target.value as any })}
                          disabled={currentRole === 'viewer'}
                          className="w-full border border-gray-300 rounded-xl px-4 py-2.5 font-semibold text-gray-750 bg-white"
                        >
                          <option value="wins">Maior número de vitórias</option>
                          <option value="sequence">Maior sequência de vitórias (Consistência)</option>
                          <option value="win_rate">Melhor aproveitamento (% de vitórias)</option>
                          <option value="games_balance">Maior saldo de games</option>
                        </select>
                      </div>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 text-sm text-gray-600">
                      <h4 className="font-bold text-gray-900 mb-1.5">
                        Dinâmica de Jogo: Rei da Quadra ({tournament.reiDaQuadraType === 'duplas_fixas' ? 'Duplas Fixas' : 'Individual'})
                      </h4>
                      <p className="leading-relaxed">
                        No formato Rei da Quadra, os desafiantes entram continuamente na quadra.
                        O limite de vitórias consecutivas está configurado para{' '}
                        <strong>
                          {tournament.reiDaQuadraConsecutiveWinsLimit === 0
                            ? '0 Jogos (sempre rotaciona)'
                            : (tournament.reiDaQuadraConsecutiveWinsLimit === null || tournament.reiDaQuadraConsecutiveWinsLimit === undefined)
                              ? 'Sem limite'
                              : tournament.reiDaQuadraConsecutiveWinsLimit === 1
                                ? '1 vitória / jogo'
                                : `${tournament.reiDaQuadraConsecutiveWinsLimit} vitórias consecutivas`}
                        </strong>.
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Participantes por Grupo</label>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={tournament.modality === 'mistas_aleatorias' || tournament.modality === 'individual' || (tournament.groupSize || 4) <= 2 || currentRole === 'viewer'}
                            onClick={() => {
                              const current = tournament.groupSize || 4;
                              updateTournament(tournament.id, { groupSize: Math.max(2, current - 1) });
                            }}
                            className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            -
                          </button>
                          <input 
                            type="number"
                            disabled={tournament.modality === 'mistas_aleatorias' || tournament.modality === 'individual'}
                            value={(tournament.modality === 'mistas_aleatorias' || tournament.modality === 'individual') ? 4 : (tournament.groupSize || 4)}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              updateTournament(tournament.id, { groupSize: Math.max(2, val) });
                            }}
                            className="w-full border border-gray-300 rounded-lg px-2 py-2 text-center font-semibold disabled:bg-gray-100 disabled:text-gray-500 disabled:opacity-80"
                          />
                          <button
                            type="button"
                            disabled={tournament.modality === 'mistas_aleatorias' || tournament.modality === 'individual' || (tournament.groupSize || 4) >= 24 || currentRole === 'viewer'}
                            onClick={() => {
                              const current = tournament.groupSize || 4;
                              updateTournament(tournament.id, { groupSize: Math.min(24, current + 1) });
                            }}
                            className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            +
                          </button>
                        </div>
                        {(tournament.modality === 'duplas_fixas' || tournament.modality === 'mistas_aleatorias') && (tournament.groupSize || 4) < 4 && (
                          <p className="text-red-500 text-xs mt-1 font-semibold">
                            Mínimo de 4 participantes para torneio em duplas!
                          </p>
                        )}
                      </div>
                      
                      {/* Highlighted Courts Configuration Card */}
                      <div className="bg-green-50 border border-green-200 p-3 rounded-xl flex flex-col justify-between">
                        <label className="block text-xs font-black text-green-800 uppercase tracking-wider mb-1 flex items-center gap-1">
                          🎾 Quadras Disponíveis
                        </label>
                        <div className="flex items-center gap-2">
                          <select 
                            value={tournament.courts || 2}
                            onChange={(e) => updateTournament(tournament.id, { courts: Number(e.target.value) })}
                            disabled={currentRole === 'viewer'}
                            className="w-full border border-green-300 bg-white rounded-lg px-3 py-1.5 font-bold text-green-950 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none disabled:bg-gray-100 disabled:text-gray-500 text-sm"
                          >
                            {[1,2,3,4,5,6,7,8,9,10].map(c => (
                              <option key={c} value={c}>
                                {c} {c === 1 ? 'Quadra' : 'Quadras'}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Eliminatória</label>
                        <select 
                          value={tournament.playoffType || 'none'}
                          onChange={(e) => updateTournament(tournament.id, { playoffType: e.target.value as 'none' | 'final' | 'semis' | 'quarters' })}
                          className="w-full border border-gray-300 rounded-lg px-4 py-2"
                        >
                          <option value="none">Nenhuma</option>
                          <option value="final">Final Direta</option>
                          <option value="semis">Semifinais</option>
                          <option value="quarters">Quartas de Final</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-100">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Sets por partida na Fase de Grupos</label>
                        <select
                          value={tournament.setsGroup || 1}
                          onChange={(e) => updateTournament(tournament.id, { setsGroup: Number(e.target.value) })}
                          disabled={currentRole === 'viewer'}
                          className="w-full border border-gray-300 rounded-lg px-4 py-2 bg-white"
                        >
                          <option value={1}>1 Set único</option>
                          <option value={3}>Melhor de 3 Sets</option>
                          <option value={5}>Melhor de 5 Sets</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Sets por partida no Mata-mata</label>
                        <select
                          value={tournament.setsPlayoff || 1}
                          onChange={(e) => updateTournament(tournament.id, { setsPlayoff: Number(e.target.value) })}
                          disabled={currentRole === 'viewer'}
                          className="w-full border border-gray-300 rounded-lg px-4 py-2 bg-white"
                        >
                          <option value={1}>1 Set único</option>
                          <option value={3}>Melhor de 3 Sets</option>
                          <option value={5}>Melhor de 5 Sets</option>
                        </select>
                      </div>
                    </div>
                    
                    <div className="mt-6 bg-gray-50 p-4 rounded-xl border border-gray-100 text-sm text-gray-600">
                      <h4 className="font-bold text-gray-900 mb-2">
                        Como funciona a Fase de Grupos
                      </h4>
                      <p>
                        Na Fase de Grupos, os participantes são divididos em grupos de {tournament.groupSize || 4} atletas. Os melhores de cada grupo avançam para as fases eliminatórias se configuradas.
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}
            {tournament.status === 'draft' && <DraftPhase tournament={tournament} />}
            {tournament.modality === 'rei_da_quadra' ? (
              (tournament.status === 'group_stage' || tournament.status === 'completed') && <ReiDaQuadraPhase tournament={tournament} />
            ) : (
              <>
                {(tournament.status === 'group_stage' || tournament.status === 'playoffs' || tournament.status === 'completed') && <GroupPhase tournament={tournament} />}
                {(tournament.status === 'playoffs' || tournament.status === 'completed') && <PlayoffPhase tournament={tournament} />}
              </>
            )}
          </div>
        )}

        {activeTab === 'finance' && (
          <>
            {tournament.isPaid ? (
              <TournamentFinance tournament={tournament} />
            ) : (
              <div className="max-w-md mx-auto text-center py-16 px-6 bg-white rounded-3xl border border-gray-100 shadow-sm mt-8">
                <div className="w-20 h-20 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <DollarSign className="w-10 h-10" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Controle Financeiro Desativado</h2>
                <p className="text-sm text-gray-600 mb-8 leading-relaxed">
                  Este campeonato está configurado como gratuito. Deseja ativar o controle financeiro para registrar pagamentos de inscrição e despesas do evento?
                </p>
                
                {currentRole !== 'viewer' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-center gap-3 max-w-xs mx-auto">
                      <label className="text-sm font-bold text-gray-700 whitespace-nowrap">Taxa de Inscrição:</label>
                      <input
                        type="number"
                        min={0}
                        value={feeInput}
                        onChange={(e) => setFeeInput(Number(e.target.value))}
                        className="w-24 border border-gray-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-green-500 outline-none text-center font-bold text-sm"
                      />
                    </div>
                    <button 
                      onClick={handleActivateFinance}
                      className="bg-black text-white hover:bg-gray-800 font-bold px-8 py-3 rounded-xl transition-all text-sm shadow-md"
                    >
                      Ativar Controle Financeiro
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
      
    </div>
  );
}
