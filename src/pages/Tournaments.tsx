import React from 'react';
import { useAppStore } from '../store/AppContext';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowRight, Trophy, ArrowLeft } from 'lucide-react';

export default function Tournaments() {
  const { data } = useAppStore();
  const navigate = useNavigate();

  const sortedTournaments = [...data.tournaments].sort((a,b) => b.date - a.date);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-4">
        <button 
          onClick={() => navigate('/')}
          className="p-2 hover:bg-gray-200 bg-gray-100 rounded-xl transition-colors print:hidden"
          title="Voltar"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Torneios</h1>
          <p className="text-gray-500">Histórico de todas as etapas da liga.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedTournaments.map(t => (
          <div 
            key={t.id} 
            onClick={() => navigate(`/tournaments/${t.id}`)}
            className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md hover:border-green-500 transition-all cursor-pointer group flex flex-col h-full"
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-bold text-lg text-gray-900 group-hover:text-green-600 transition-colors">{t.name}</h3>
                <p className="text-sm text-gray-500 mb-2">
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
            </div>
            
            <div className="mt-auto pt-4 flex items-center justify-between border-t border-gray-50">
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wide
                ${t.status === 'completed' ? 'bg-gray-100 text-gray-500' : 'bg-green-100 text-green-700'}`}>
                {t.status === 'draft' ? 'RASCUNHO' :
                 t.status === 'group_stage' ? 'FASE DE GRUPOS' :
                 t.status === 'playoffs' ? 'ELIMINATÓRIAS' : 'FINALIZADO'}
              </span>
              <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-green-500 group-hover:translate-x-1 transition-all" />
            </div>
          </div>
        ))}

        {sortedTournaments.length === 0 && (
          <div className="col-span-full py-12 text-center text-gray-500 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
            <Trophy className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p>Nenhum torneio criado ainda.</p>
          </div>
        )}
      </div>
    </div>
  );
}
