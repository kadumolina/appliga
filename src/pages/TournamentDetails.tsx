import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/AppContext';
import { ArrowLeft, Trash2, Printer } from 'lucide-react';
import DraftPhase from '../components/tournament/DraftPhase';
import GroupPhase from '../components/tournament/GroupPhase';
import PlayoffPhase from '../components/tournament/PlayoffPhase';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function TournamentDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, deleteTournament } = useAppStore();
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const tournament = data.tournaments.find(t => t.id === id);

  if (!tournament) {
    return (
      <div className="p-12 text-center text-gray-500">
        Torneio não encontrado.
        <br/><br/>
        <button onClick={() => navigate('/')} className="text-blue-500 font-bold hover:underline">Voltar</button>
      </div>
    );
  }

  const handleDelete = () => {
    deleteTournament(tournament.id);
    navigate('/tournaments');
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
                {tournament.modality === 'individual' ? 'Individual' : tournament.modality === 'duplas_fixas' ? 'Duplas Fixas' : 'Duplas Mistas'}
              </span>
              <span className="bg-gray-100 px-2 py-0.5 rounded-md capitalize">
                {tournament.category || (tournament.modality === 'mistas_aleatorias' ? 'Misto' : 'Masculino')}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <span className={`px-3 py-1 text-sm font-bold uppercase tracking-wider rounded-lg
            ${tournament.status === 'draft' ? 'bg-blue-100 text-blue-700' :
              tournament.status === 'group_stage' ? 'bg-orange-100 text-orange-700' :
              tournament.status === 'playoffs' ? 'bg-purple-100 text-purple-700' :
              'bg-green-100 text-green-700'
            }
          `}>
            {tournament.status.replace('_', ' ')}
          </span>
          <button 
            onClick={() => window.print()}
            className="p-2 text-gray-500 hover:bg-gray-100 rounded-xl transition-colors print:hidden"
            title="Exportar PDF / Imprimir"
          >
            <Printer className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setShowDeleteModal(true)}
            className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors print:hidden"
            title="Excluir Torneio"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="pb-12">
        {tournament.status === 'draft' && <DraftPhase tournament={tournament} />}
        {tournament.status === 'group_stage' && <GroupPhase tournament={tournament} />}
        {(tournament.status === 'playoffs' || tournament.status === 'completed') && <PlayoffPhase tournament={tournament} />}
      </div>
      
    </div>
  );
}
