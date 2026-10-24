import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Player, Tournament, Match } from '../../types';
import { useAppStore } from '../../store/AppContext';
import { generateGroupMatches, getPlayerName, calculateGlobalRankings } from '../../lib/tournament';
import { Shuffle, Check, RefreshCw } from 'lucide-react';

export default function DraftPhase({ tournament }: { tournament: Tournament }) {
  const { data, updateTournament, currentRole } = useAppStore();
  const navigate = useNavigate();
  const [selectedIds, setSelectedIds] = useState<string[]>(tournament.participants || []);
  const courts = tournament.courts || 2;
  const setCourts = (num: number) => {
    updateTournament(tournament.id, { courts: num });
  };
  const [distributionMode, setDistributionMode] = useState<'ranking' | 'random'>('ranking');
  const [stage, setStage] = useState<'selection' | 'preview'>('selection');
  const [previewGroups, setPreviewGroups] = useState<Record<string, string[]>>({});

  const togglePlayer = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(x => x !== id));
    } else {
      if (selectedIds.length < 24) {
        setSelectedIds([...selectedIds, id]);
      }
    }
  };

  const movePlayer = (id: string, fromGroup: string, toGroup: string) => {
    if (fromGroup === toGroup) return;
    setPreviewGroups(prev => {
        const next = { ...prev };
        if (tournament.modality === 'duplas_fixas') {
            const idx = next[fromGroup].indexOf(id);
            if (idx === -1) return prev;
            const partnerIdx = idx % 2 === 0 ? idx + 1 : idx - 1;
            const partnerId = next[fromGroup][partnerIdx];
            
            // Remove the pair from fromGroup
            // To safely remove, filter out both IDs. (Assuming players don't appear twice)
            next[fromGroup] = next[fromGroup].filter(x => x !== id && x !== partnerId);
            // Append pair to toGroup
            next[toGroup] = [...next[toGroup], id, partnerId];
        } else {
            next[fromGroup] = next[fromGroup].filter(x => x !== id);
            next[toGroup] = [...next[toGroup], id];
        }
        return next;
    });
  };

  const applySortOrShuffle = (arr: string[], getRank: (i: string) => number) => {
    if (distributionMode === 'random') {
       return [...arr].sort(() => Math.random() - 0.5);
    }
    return [...arr].sort((a, b) => getRank(b) - getRank(a));
  };

  const handleDraw = () => {
    const rankings = calculateGlobalRankings(data);
    const getPlayerRank = (id: string) => {
      const r = rankings.find(x => x.id === id);
      return r ? r.points + (r.winRate / 100) : 0;
    };

    let groups: Record<string, string[]> = {};
    const labels = ['A', 'B', 'C', 'D', 'E', 'F'];

    if (tournament.modality === 'mistas_aleatorias') {
        const sortedMen = applySortOrShuffle(selectedIds.filter(id => data.players.find(p => p.id === id)?.gender === 'M'), getPlayerRank);
        const sortedWomen = applySortOrShuffle(selectedIds.filter(id => data.players.find(p => p.id === id)?.gender === 'F'), getPlayerRank);
        
        const hasEvenGender = sortedMen.length === sortedWomen.length && selectedIds.length % 4 === 0;
        const groupCount = Math.floor(selectedIds.length / 4);
        for (let i = 0; i < groupCount; i++) groups[labels[i]] = [];

        if (hasEvenGender) {
            sortedMen.forEach((pid, idx) => {
                const round = Math.floor(idx / groupCount);
                const pos = idx % groupCount;
                const groupIdx = round % 2 === 0 ? pos : (groupCount - 1 - pos);
                groups[labels[groupIdx]].push(pid);
            });
            
            sortedWomen.forEach((pid, idx) => {
                const round = Math.floor(idx / groupCount);
                const pos = idx % groupCount;
                const groupIdx = round % 2 !== 0 ? pos : (groupCount - 1 - pos);
                groups[labels[groupIdx]].push(pid);
            });
        } else {
            const sortedPlayers = applySortOrShuffle([...selectedIds], getPlayerRank);
            sortedPlayers.forEach((pid, idx) => {
                const round = Math.floor(idx / groupCount);
                const pos = idx % groupCount;
                const groupIdx = round % 2 === 0 ? pos : (groupCount - 1 - pos);
                groups[labels[groupIdx]].push(pid);
            });
        }

    } else if (tournament.modality === 'duplas_fixas') {
        const sortedPlayers = applySortOrShuffle([...selectedIds], getPlayerRank);
        
        let groupCount = 2; 
        if (selectedIds.length === 8) groupCount = 1;
        if (selectedIds.length === 16) groupCount = 2; 
        if (selectedIds.length === 24) groupCount = 3; 
        if (selectedIds.length === 12) groupCount = 2; 
        if (selectedIds.length === 20) groupCount = 2; 
        
        for (let i = 0; i < groupCount; i++) groups[labels[i]] = [];

        const pairs: string[][] = [];
        for (let i = 0; i < selectedIds.length; i += 2) {
            // keep the selected fix pairs as they were chosen sequentially
            pairs.push([selectedIds[i], selectedIds[i+1]]);
        }
        
        const sortedPairs = distributionMode === 'random' ? 
            [...pairs].sort(() => Math.random() - 0.5) : 
            [...pairs].sort((a,b) => (getPlayerRank(b[0])+getPlayerRank(b[1])) - (getPlayerRank(a[0])+getPlayerRank(a[1])));

        sortedPairs.forEach((pair, idx) => {
            const round = Math.floor(idx / groupCount);
            const pos = idx % groupCount;
            const groupIdx = round % 2 === 0 ? pos : (groupCount - 1 - pos);
            groups[labels[groupIdx]].push(pair[0], pair[1]);
        });
    } else {
        const sortedPlayers = applySortOrShuffle([...selectedIds], getPlayerRank);
        const groupSize = tournament.groupSize || 4;
        const groupCount = Math.floor(sortedPlayers.length / groupSize);
        for (let i = 0; i < groupCount; i++) groups[labels[i]] = [];
        
        sortedPlayers.forEach((pid, idx) => {
          const round = Math.floor(idx / groupCount);
          const pos = idx % groupCount;
          const groupIdx = round % 2 === 0 ? pos : (groupCount - 1 - pos);
          groups[labels[groupIdx]].push(pid);
        });
    }

    setPreviewGroups(groups);
    setStage('preview');
  };

  const handleStartGroupStage = () => {
    let matches: Match[] = [];
    Object.keys(previewGroups).forEach(groupId => {
        matches = [...matches, ...generateGroupMatches(groupId, previewGroups[groupId], tournament.modality, data.players)];
    });

    updateTournament(tournament.id, {
      participants: selectedIds,
      courts: courts,
      groups: previewGroups,
      matches: matches,
      status: 'group_stage'
    });
  };

  const handleStartReiDaQuadra = () => {
    const shuffledIds = [...selectedIds].sort(() => Math.random() - 0.5);

    let initialQueue: string[] = [];
    let initialFixedTeamsQueue: string[][] = [];

    if (tournament.reiDaQuadraType === 'duplas_fixas') {
      const pairs: string[][] = [];
      for (let i = 0; i < selectedIds.length; i += 2) {
        pairs.push([selectedIds[i], selectedIds[i+1]]);
      }
      initialFixedTeamsQueue = [...pairs].sort(() => Math.random() - 0.5);
    } else {
      initialQueue = shuffledIds;
    }

    const courtsCount = tournament.reiDaQuadraCourts || 2;
    const initialMatches: Match[] = [];

    let tempQueue = [...initialQueue];
    let tempFixedTeamsQueue = [...initialFixedTeamsQueue];

    for (let c = 1; c <= courtsCount; c++) {
      if (tournament.reiDaQuadraType === 'duplas_fixas') {
        if (tempFixedTeamsQueue.length >= 2) {
          const duo1 = tempFixedTeamsQueue.shift()!;
          const duo2 = tempFixedTeamsQueue.shift()!;
          initialMatches.push({
            id: `court-${c}-match-1`,
            type: 'group',
            status: 'pending',
            team1: duo1,
            team2: duo2,
            score1: undefined,
            score2: undefined,
            setsScore1: [],
            setsScore2: [],
            groupId: `Quadra ${c}`
          });
        }
      } else {
        if (tempQueue.length >= 4) {
          const p1 = tempQueue.shift()!;
          const p2 = tempQueue.shift()!;
          const p3 = tempQueue.shift()!;
          const p4 = tempQueue.shift()!;
          initialMatches.push({
            id: `court-${c}-match-1`,
            type: 'group',
            status: 'pending',
            team1: [p1, p2],
            team2: [p3, p4],
            score1: undefined,
            score2: undefined,
            setsScore1: [],
            setsScore2: [],
            groupId: `Quadra ${c}`
          });
        }
      }
    }

    updateTournament(tournament.id, {
      participants: selectedIds,
      status: 'group_stage',
      matches: initialMatches,
      reiDaQuadraQueue: tempQueue,
      reiDaQuadraFixedTeamsQueue: tempFixedTeamsQueue,
      reiDaQuadraStartedAt: Date.now()
    });
  };

  const availablePlayers = data.players.filter(p => {
    if (tournament.category === 'masculino') return p.gender === 'M';
    if (tournament.category === 'feminino') return p.gender === 'F';
    return true; // misto ou vazio
  });

  const selectedMen = selectedIds.filter(id => data.players.find(p => p.id === id)?.gender === 'M').length;
  const selectedWomen = selectedIds.filter(id => data.players.find(p => p.id === id)?.gender === 'F').length;

  const groupSize = tournament.modality === 'duplas_fixas' ? 8 : (tournament.modality === 'mistas_aleatorias' || tournament.modality === 'individual') ? 4 : (tournament.groupSize || 4);
  let isValidCount = false;
  let validationMessage = '';

  if (tournament.modality === 'rei_da_quadra') {
    if (tournament.reiDaQuadraType === 'duplas_fixas') {
      isValidCount = selectedIds.length >= 4 && selectedIds.length % 2 === 0;
      validationMessage = isValidCount
        ? `Participantes selecionados: ${selectedIds.length} (${selectedIds.length / 2} duplas formadas).`
        : `Selecione um número par de atletas para formar as duplas (mínimo de 4 atletas / 2 duplas).`;
    } else {
      isValidCount = selectedIds.length >= 4;
      validationMessage = isValidCount
        ? `Participantes selecionados: ${selectedIds.length} atletas para disputa individual.`
        : `Selecione pelo menos 4 atletas para iniciar a disputa individual.`;
    }
  } else if (tournament.format === 'league') {
    isValidCount = selectedIds.length >= 3;
    validationMessage = isValidCount 
      ? `Participantes selecionados: ${selectedIds.length} (Mínimo: 3).`
      : `Selecione pelo menos 3 atletas para o formato Liga.`;
  } else {
    // Default to 'groups'
    isValidCount = selectedIds.length >= groupSize && selectedIds.length % groupSize === 0;
    if (tournament.modality === 'duplas_fixas') {
      validationMessage = isValidCount
        ? `Participantes selecionados: ${selectedIds.length} (${selectedIds.length / 8} grupos de 4 duplas / 8 atletas).`
        : `Selecione um múltiplo de 8 atletas para o torneio (mínimo 8 / cada grupo de 4 duplas precisa de 8 atletas).`;
    } else if (tournament.modality === 'mistas_aleatorias') {
      validationMessage = isValidCount
        ? `Atletas selecionados: ${selectedIds.length} (${selectedIds.length / 4} grupos de 4 atletas).`
        : `Selecione um múltiplo de 4 atletas para o torneio (mínimo 4 / cada grupo precisa de 4 atletas).`;
    } else if (tournament.modality === 'individual') {
      validationMessage = isValidCount
        ? `Atletas selecionados: ${selectedIds.length} (${selectedIds.length / 4} grupos de 4 atletas).`
        : `Selecione um múltiplo de 4 atletas para o torneio (mínimo 4 / cada grupo precisa de 4 atletas).`;
    } else {
      validationMessage = isValidCount
        ? `Participantes selecionados: ${selectedIds.length} (${Math.floor(selectedIds.length / groupSize)} grupos de ${groupSize} atletas).`
        : `Selecione um múltiplo de ${groupSize} atletas para o torneio (mínimo ${groupSize}).`;
    }
  }
  
  if (tournament.modality === 'mistas_aleatorias') {
      if (tournament.category === 'misto' && selectedMen !== selectedWomen) {
          isValidCount = false;
          validationMessage = `Duplas Mistas requerem o mesmo número de Homens e Mulheres (Selecionados: ${selectedMen}H, ${selectedWomen}M).`;
      }
  } else if (tournament.modality === 'duplas_fixas') {
      if (selectedIds.length % 2 !== 0) {
          isValidCount = false;
          validationMessage = `Duplas Fixas requerem número par de atletas (selecionados: ${selectedIds.length}).`;
      }
  }

  if (stage === 'preview') {
      return (
          <div className="space-y-6">
             <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-xl font-bold">2. Sorteio dos Grupos</h2>
                        <p className="text-gray-500">Confira se as chaves estão equilibradas</p>
                    </div>
                    <div className="flex gap-2">
                        <button 
                            onClick={handleDraw}
                            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl font-bold transition-all flex items-center gap-2"
                        >
                            <RefreshCw className="w-4 h-4" /> Refazer Sorteio
                        </button>
                        <button 
                            onClick={handleStartGroupStage}
                            className="px-4 py-2 bg-green-500 hover:bg-green-600 text-black rounded-xl font-bold transition-all flex items-center gap-2"
                        >
                            <Check className="w-4 h-4" /> Iniciar Classificatória
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Object.keys(previewGroups).map(groupId => (
                        <div key={groupId} className="border border-gray-200 rounded-xl overflow-hidden">
                            <div className="bg-gray-50 border-b border-gray-200 px-4 py-2 font-bold text-gray-700">
                                Grupo {groupId}
                            </div>
                            <div className="p-4 flex flex-col gap-2">
                                {tournament.modality === 'duplas_fixas' ? (
                                    Array.from({ length: previewGroups[groupId].length / 2 }).map((_, i) => {
                                        const p1 = previewGroups[groupId][i * 2];
                                        const p2 = previewGroups[groupId][i * 2 + 1];
                                        return (
                                            <div key={p1} className="flex flex-col sm:flex-row sm:items-center justify-between text-sm font-medium border border-gray-100 p-2 rounded-lg gap-2">
                                                <div className="flex flex-col">
                                                    <span>{getPlayerName(p1, data.players)}</span>
                                                    <span className="text-gray-500">+ {getPlayerName(p2, data.players)}</span>
                                                </div>
                                                <select 
                                                    value={groupId} 
                                                    onChange={(e) => movePlayer(p1, groupId, e.target.value)}
                                                    className="bg-gray-100 text-xs font-bold text-gray-700 rounded p-1 border-none outline-none focus:ring-0"
                                                >
                                                    {Object.keys(previewGroups).map(g => <option key={g} value={g}>Gr. {g}</option>)}
                                                </select>
                                            </div>
                                        );
                                    })
                                ) : (
                                    previewGroups[groupId].map((pid, idx) => (
                                        <div key={pid} className="flex items-center justify-between text-sm font-medium border border-gray-100 p-2 rounded-lg">
                                            <div className="truncate pr-2">
                                                <span className="text-gray-400 w-4 inline-block">{idx + 1}.</span>
                                                {getPlayerName(pid, data.players)}
                                            </div>
                                            <select 
                                                value={groupId} 
                                                onChange={(e) => movePlayer(pid, groupId, e.target.value)}
                                                className="bg-gray-100 text-xs font-bold text-gray-700 rounded p-1 border-none outline-none focus:ring-0 flex-shrink-0"
                                            >
                                                {Object.keys(previewGroups).map(g => <option key={g} value={g}>Gr. {g}</option>)}
                                            </select>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    ))}
                </div>
             </div>
          </div>
      );
  }

    return (
    <div className="space-y-6 pb-28">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col xl:flex-row gap-6 relative">
        <div className="flex-1 pb-6">
          <div className="flex flex-col flex-wrap lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
            <div>
                <h2 className="text-xl font-bold">1. Seleção de Atletas ({selectedIds.length})</h2>
                {(tournament.modality === 'duplas_fixas' || tournament.modality === 'mistas_aleatorias') && groupSize < 4 ? (
                  <div className="bg-red-50 p-3 rounded-lg border border-red-200 text-xs text-red-800 my-2">
                    <p className="font-bold">⚠️ Esta configuração NÃO FUNCIONA para torneios em duplas!</p>
                    <p>Cada grupo precisa de pelo menos 4 participantes para possibilitar confrontos em duplas válidos e evitar que apareçam parceiros/adversários desconhecidos.</p>
                  </div>
                ) : (tournament.modality === 'duplas_fixas' || tournament.modality === 'mistas_aleatorias') ? (
                  <div className="bg-blue-50 p-3 rounded-lg border border-blue-200 text-xs text-blue-800 my-2">
                    <p className="font-semibold">ℹ️ Torneio em Duplas:</p>
                    <p>Cada grupo possui {groupSize} participantes. Isso permite confrontos em duplas completos e equilibrados.</p>
                  </div>
                ) : null}
                <p className={isValidCount ? "text-gray-500" : "text-orange-500 font-medium"}>{validationMessage}</p>
            </div>
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <label className="text-sm font-bold text-gray-700">Modo de Sorteio:</label>
                <select 
                  value={distributionMode} 
                  onChange={e => setDistributionMode(e.target.value as 'ranking' | 'random')}
                  className="bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-black focus:border-black block py-2 px-3"
                >
                  <option value="ranking">Por Ranking</option>
                  <option value="random">Sorteio Aleatório</option>
                </select>
              </div>
              <div className="flex items-center gap-1.5 bg-green-50 border border-green-200 px-3 py-2 rounded-lg text-xs font-bold text-green-800">
                <span>🎾 {courts} {courts === 1 ? 'Quadra' : 'Quadras'}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {availablePlayers.map(p => {
              const isSelected = selectedIds.includes(p.id);
              const isWaitingForPartner = tournament.modality === 'duplas_fixas' && isSelected && selectedIds.indexOf(p.id) === selectedIds.length - 1 && selectedIds.length % 2 !== 0;
              
              let cardClasses = 'border-gray-100 hover:border-gray-200 bg-white';
              let tickClasses = 'border-gray-300';
              if (isWaitingForPartner) {
                  cardClasses = 'border-yellow-400 bg-yellow-50';
                  tickClasses = 'border-yellow-400 bg-yellow-400';
              } else if (isSelected) {
                  cardClasses = 'border-green-500 bg-green-50';
                  tickClasses = 'border-green-500 bg-green-500';
              }

              return (
                <div 
                  key={p.id}
                  onClick={() => {
                    if (currentRole !== 'viewer') togglePlayer(p.id);
                  }}
                  className={`p-3 rounded-xl border-2 ${currentRole !== 'viewer' ? 'cursor-pointer' : 'cursor-default'} transition-all flex items-center justify-between ${cardClasses}`}
                >
                  <div className="flex flex-col overflow-hidden">
                      <span className="font-semibold text-sm truncate">{p.name}</span>
                      <span className="text-xs text-gray-500">{p.gender === 'M' ? 'Masculino' : p.gender === 'F' ? 'Feminino' : 'Gênero não def.'}</span>
                  </div>
                  <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${tickClasses}`}>
                    {isSelected && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                  </div>
                </div>
              );
            })}
            {availablePlayers.length < 12 && (
              <div className="col-span-full py-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
                {currentRole !== 'viewer' && (
                  <button 
                    onClick={() => navigate('/players')}
                    className="bg-black text-white px-6 py-2 rounded-xl font-bold hover:bg-gray-800 transition-colors"
                  >
                    Cadastrar Atletas
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Sticky Bottom Bar */}
          <div className="fixed bottom-0 left-0 md:left-72 right-0 bg-white/95 backdrop-blur-sm border-t border-gray-200 p-4 px-6 md:px-8 shadow-[0_-10px_30px_rgba(0,0,0,0.08)] z-40 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <span className={`w-3 h-3 rounded-full shrink-0 ${isValidCount ? 'bg-green-500 animate-pulse' : 'bg-orange-400'}`}></span>
              <div>
                <span className="text-sm font-bold text-gray-950">
                  {selectedIds.length} Atleta{selectedIds.length !== 1 ? 's' : ''} Selecionado{selectedIds.length !== 1 ? 's' : ''}
                </span>
                <p className={`text-xs ${isValidCount ? 'text-green-700 font-bold' : 'text-orange-500 font-medium'}`}>
                  {validationMessage}
                </p>
              </div>
            </div>
            {currentRole !== 'viewer' && (
              tournament.modality === 'rei_da_quadra' ? (
                <button 
                  onClick={handleStartReiDaQuadra}
                  disabled={!isValidCount}
                  className={`px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 text-sm shadow-lg ${
                    isValidCount 
                      ? 'bg-green-500 text-black hover:bg-green-600 scale-[1.03] hover:scale-[1.05] active:scale-[0.98]' 
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  <Check className="w-4 h-4" /> Iniciar Rei da Quadra
                </button>
              ) : (
                <button 
                  onClick={handleDraw}
                  disabled={!isValidCount}
                  className={`px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 text-sm shadow-lg ${
                    isValidCount 
                      ? 'bg-black text-white hover:bg-gray-800 scale-[1.03] hover:scale-[1.05] active:scale-[0.98]' 
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  <Shuffle className="w-4 h-4" /> Gerar Grupos
                </button>
              )
            )}
          </div>
        </div>

        {(tournament.modality === 'duplas_fixas' || (tournament.modality === 'rei_da_quadra' && tournament.reiDaQuadraType === 'duplas_fixas')) && (
            <div className="w-full xl:w-80 bg-gray-50 rounded-xl p-4 border border-gray-100 h-fit">
                <h3 className="font-bold text-gray-900 mb-4">Duplas Formadas</h3>
                <div className="space-y-2">
                    {Array.from({ length: Math.ceil(selectedIds.length / 2) }).map((_, i) => {
                        const p1 = data.players.find(p => p.id === selectedIds[i * 2]);
                        const p2 = data.players.find(p => p.id === selectedIds[i * 2 + 1]);
                        return (
                            <div key={i} className="flex flex-col bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                                <span className="text-xs font-bold text-gray-400 mb-1">Dupla {i + 1}</span>
                                <span className="text-sm font-semibold truncate">{p1?.name || '...'}</span>
                                <span className="text-sm font-semibold truncate text-gray-600">{p2 ? p2.name : <span className="text-yellow-500 animate-pulse">Aguardando Parceiro(a)...</span>}</span>
                            </div>
                        );
                    })}
                    {selectedIds.length === 0 && (
                        <p className="text-sm text-gray-500 text-center py-4">Nenhum atleta selecionado ainda.</p>
                    )}
                </div>
            </div>
        )}
      </div>
    </div>
  );
}
