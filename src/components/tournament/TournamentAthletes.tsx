import React, { useState } from 'react';
import { Tournament, Player } from '../../types';
import { useAppStore } from '../../store/AppContext';
import { Trash2, RefreshCw, UserCheck, AlertTriangle, Users, X } from 'lucide-react';

interface TournamentAthletesProps {
  tournament: Tournament;
}

export default function TournamentAthletes({ tournament }: TournamentAthletesProps) {
  const { data, updateTournament, currentRole } = useAppStore();
  const [substitutingPlayerId, setSubstitutingPlayerId] = useState<string | null>(null);

  const withdrawnList = tournament.withdrawnPlayers || [];
  const substitutedMap = tournament.substitutedPlayers || {};

  // Get flat list of current participant player IDs
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

  // Find players not in this tournament to offer as substitutes
  const availableSubstitutes = data.players.filter(
    (p) => !participantIds.includes(p.id)
  );

  const getPlayerDetails = (id: string): Player | undefined => {
    return data.players.find((p) => p.id === id);
  };

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
    const player = getPlayerDetails(playerId);
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
    const player = getPlayerDetails(playerId);
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

    const oldPlayer = getPlayerDetails(substitutingPlayerId);
    const newPlayer = getPlayerDetails(newPlayerId);
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

    // 3. Update matches list (replace ID in team1 & team2 arrays)
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

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Users className="w-5 h-5 text-green-500" />
          Gerenciamento de Atletas
        </h2>
        <p className="text-sm text-gray-500">
          Substitua atletas machucados ou marque desistências durante as etapas.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {participantIds.map((pid) => {
          const player = getPlayerDetails(pid);
          if (!player) return null;

          const isWithdrawn = withdrawnList.includes(pid);
          const wasSubstitutedBy = Object.entries(substitutedMap).find(([old]) => old === pid);

          return (
            <div
              key={pid}
              className={`p-4 rounded-xl border flex items-center justify-between transition-all ${
                isWithdrawn
                  ? 'bg-red-50/50 border-red-200 opacity-80'
                  : 'bg-gray-50/50 border-gray-100'
              }`}
            >
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={`font-bold text-sm ${
                      isWithdrawn ? 'line-through text-red-500' : 'text-gray-900'
                    }`}
                  >
                    {player.name}
                  </span>
                  {isWithdrawn && (
                    <span className="bg-red-100 text-red-700 text-[9px] font-bold px-1.5 py-0.5 rounded">
                      DESISTIU / MACHUCADO
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500">
                  {player.gender === 'M' ? 'Masculino' : 'Feminino'}
                </p>
              </div>

              {currentRole !== 'viewer' && (
                <div className="flex items-center gap-1.5">
                  {isWithdrawn ? (
                    <button
                      onClick={() => handleReactivate(pid)}
                      className="px-2.5 py-1 text-xs font-bold text-green-700 hover:bg-green-50 rounded-lg transition-colors border border-green-200"
                    >
                      Reativar
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => setSubstitutingPlayerId(pid)}
                        className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="Substituir Atleta"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleWithdraw(pid)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Remover / Desistência"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Substitution Selector Modal */}
      {substitutingPlayerId && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setSubstitutingPlayerId(null);
            }
          }}
        >
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden relative">
            <button
              type="button"
              onClick={() => setSubstitutingPlayerId(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 rounded-lg p-1 transition-colors"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="p-6 space-y-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Substituir Atleta</h3>
                <p className="text-xs text-gray-500">
                  Substituindo o atleta:{' '}
                  <span className="font-bold text-black">
                    {getPlayerDetails(substitutingPlayerId)?.name}
                  </span>
                </p>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-xs text-yellow-800 flex gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 text-yellow-600" />
                <p>
                  A substituição alterará as tabelas de classificação e todos os jogos (tanto anteriores quanto pendentes) para o novo atleta.
                </p>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto">
                {availableSubstitutes.map((sub) => (
                  <button
                    key={sub.id}
                    onClick={() => handleSubstitute(sub.id)}
                    className="w-full text-left p-3 hover:bg-gray-50 border border-gray-100 rounded-xl flex items-center justify-between text-sm transition-colors"
                  >
                    <div>
                      <span className="font-bold text-gray-900">{sub.name}</span>
                      <p className="text-xs text-gray-500">{sub.gender === 'M' ? 'Masculino' : 'Feminino'}</p>
                    </div>
                    <UserCheck className="w-4 h-4 text-green-500" />
                  </button>
                ))}
                {availableSubstitutes.length === 0 && (
                  <p className="text-center text-sm text-gray-400 py-6">
                    Nenhum outro atleta cadastrado na plataforma para substituição.
                  </p>
                )}
              </div>

              <div className="flex justify-end pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setSubstitutingPlayerId(null)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium text-sm"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
