import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Player, Tournament, Match } from '../../types';
import { useAppStore } from '../../store/AppContext';
import { generateGroupMatches, getPlayerName, calculateGlobalRankings } from '../../lib/tournament';
import { Shuffle, Check, RefreshCw } from 'lucide-react';

export default function DraftPhase({ tournament }: { tournament: Tournament }) {
  const { data, updateTournament } = useAppStore();
  const navigate = useNavigate();
  const [selectedIds, setSelectedIds] = useState<string[]>(tournament.participants || []);
  const [courts, setCourts] = useState<number>(tournament.courts || 2);
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

  const handleDraw = () => {
    const rankings = calculateGlobalRankings(data);
    const getPlayerRank = (id: string) => {
      const r = rankings.find(x => x.id === id);
      return r ? r.points + (r.winRate / 100) : 0;
    };

    let groups: Record<string, string[]> = {};
    const labels = ['A', 'B', 'C', 'D', 'E', 'F'];

    if (tournament.modality === 'mistas_aleatorias') {
        const sortedMen = selectedIds.filter(id => data.players.find(p => p.id === id)?.gender === 'M').sort((a, b) => getPlayerRank(b) - getPlayerRank(a));
        const sortedWomen = selectedIds.filter(id => data.players.find(p => p.id === id)?.gender === 'F').sort((a, b) => getPlayerRank(b) - getPlayerRank(a));
        
        const groupCount = Math.floor(selectedIds.length / 4);
        for (let i = 0; i < groupCount; i++) groups[labels[i]] = [];

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

    } else if (tournament.modality === 'duplas_fixas') {
        const sortedPlayers = [...selectedIds].sort((a, b) => getPlayerRank(b) - getPlayerRank(a));
        
        let groupCount = 2; 
        if (selectedIds.length === 16) groupCount = 2; 
        if (selectedIds.length === 24) groupCount = 3; 
        if (selectedIds.length === 12) groupCount = 2; 
        if (selectedIds.length === 20) groupCount = 2; 
        
        for (let i = 0; i < groupCount; i++) groups[labels[i]] = [];

        const pairs: string[][] = [];
        for (let i = 0; i < sortedPlayers.length; i += 2) {
            pairs.push([sortedPlayers[i], sortedPlayers[i+1]]);
        }
        
        pairs.forEach((pair, idx) => {
            const round = Math.floor(idx / groupCount);
            const pos = idx % groupCount;
            const groupIdx = round % 2 === 0 ? pos : (groupCount - 1 - pos);
            groups[labels[groupIdx]].push(pair[0], pair[1]);
        });
    } else {
        const sortedPlayers = [...selectedIds].sort((a, b) => getPlayerRank(b) - getPlayerRank(a));
        const groupCount = Math.floor(sortedPlayers.length / 4);
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

  const availablePlayers = data.players.filter(p => {
    if (tournament.category === 'masculino') return p.gender === 'M';
    if (tournament.category === 'feminino') return p.gender === 'F';
    return true; // misto ou vazio
  });

  const selectedMen = selectedIds.filter(id => data.players.find(p => p.id === id)?.gender === 'M').length;
  const selectedWomen = selectedIds.filter(id => data.players.find(p => p.id === id)?.gender === 'F').length;

  let isValidCount = [12, 16, 20, 24].includes(selectedIds.length);
  let validationMessage = `Selecione 12, 16, 20 ou 24 atletas para o torneio.`;
  
  if (tournament.modality === 'mistas_aleatorias') {
      if (selectedMen !== selectedWomen) {
          isValidCount = false;
          validationMessage = `Duplas Mistas requerem o mesmo número de Homens e Mulheres (Selecionados: ${selectedMen}H, ${selectedWomen}M). Total deve ser 12, 16, 20 ou 24.`;
      }
  } else if (tournament.modality === 'duplas_fixas') {
      validationMessage = `Selecione 12 (6 duplas), 16 (8 duplas), 20 (10 duplas) ou 24 (12 duplas) atletas.`;
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
                                {previewGroups[groupId].map((pid, idx) => (
                                    <div key={pid} className="flex items-center gap-2 text-sm font-medium">
                                        <span className="text-gray-400 w-4">{idx + 1}.</span>
                                        {getPlayerName(pid, data.players)}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
             </div>
          </div>
      );
  }

    return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col xl:flex-row gap-6">
        <div className="flex-1">
          <div className="flex flex-col flex-wrap md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <div>
                <h2 className="text-xl font-bold">1. Seleção de Jogadores ({selectedIds.length})</h2>
                <p className={isValidCount ? "text-gray-500" : "text-orange-500 font-medium"}>{validationMessage}</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm font-bold text-gray-700">Quadras:</label>
                <select 
                  value={courts} 
                  onChange={e => setCourts(Number(e.target.value))}
                  className="bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-black focus:border-black block py-2 px-3"
                >
                  {[1,2,3,4,5,6].map(c => <option key={c} value={c}>{c} Quadra{c > 1 ? 's' : ''}</option>)}
                </select>
              </div>
              <button 
                onClick={handleDraw}
                disabled={!isValidCount}
                className={`px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-2 ${isValidCount ? 'bg-black text-white hover:bg-gray-800' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
              >
                <Shuffle className="w-4 h-4" /> Sorteio
              </button>
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
                  onClick={() => togglePlayer(p.id)}
                  className={`p-3 rounded-xl border-2 cursor-pointer transition-all flex items-center justify-between ${cardClasses}`}
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
                <p className="text-gray-500 mb-4">
                  Você tem {availablePlayers.length} atletas da categoria selecionada cadastrados. São necessários pelo menos 12 para iniciar o campeonato.
                </p>
                <button 
                  onClick={() => navigate('/players')}
                  className="bg-black text-white px-6 py-2 rounded-xl font-bold hover:bg-gray-800 transition-colors"
                >
                  Cadastrar Atletas
                </button>
              </div>
            )}
          </div>
        </div>

        {tournament.modality === 'duplas_fixas' && (
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
