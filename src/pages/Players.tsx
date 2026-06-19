import React, { useState, useMemo } from 'react';
import { useAppStore } from '../store/AppContext';
import { UserPlus, Search, Edit2, Trash2, ArrowLeft, ArrowDown, ArrowUp, Star } from 'lucide-react';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { calculateGlobalRankings } from '../lib/tournament';

function calculateAge(birthDateString?: string) {
  if (!birthDateString) return '-';
  const today = new Date();
  const birthDate = new Date(birthDateString);
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
  }
  return age;
}

export default function Players() {
  const { data, addPlayer, updatePlayer, deletePlayer } = useAppStore();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', phone: '', birthDate: '', gender: '' as 'M' | 'F' | '' });

  const [sortField, setSortField] = useState<string>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const rankings = useMemo(() => calculateGlobalRankings(data), [data]);

  const enrichedPlayers = useMemo(() => {
    return data.players.map(p => {
      const stats = rankings.find(r => r.id === p.id) || {
        played: 0,
        winRate: 0,
        points: 0,
        gameBalance: 0,
        gamesWon: 0,
        stars: 1,
      };
      
      return {
        ...p,
        ...stats,
        age: calculateAge(p.birthDate)
      };
    });
  }, [data.players, rankings]);

  const sortedPlayers = useMemo(() => {
    return [...enrichedPlayers].sort((a, b) => {
      let aVal = (a as any)[sortField];
      let bVal = (b as any)[sortField];
      
      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [enrichedPlayers, sortField, sortDirection]);

  const filteredPlayers = sortedPlayers.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc'); // Default to desc for stats, but we can override
    }
  };

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 inline ml-1" /> : <ArrowDown className="w-3 h-3 inline ml-1" />;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    if (editingId) {
      updatePlayer(editingId, { ...formData, gender: formData.gender || undefined } as any);
    } else {
      addPlayer({ ...formData, gender: formData.gender || undefined } as any);
    }
    
    setShowModal(false);
    setFormData({ name: '', phone: '', birthDate: '', gender: '' });
    setEditingId(null);
  };

  const openEdit = (player: any) => {
    setFormData({ name: player.name, phone: player.phone || '', birthDate: player.birthDate || '', gender: player.gender || '' });
    setEditingId(player.id);
    setShowModal(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja remover este atleta?')) {
      deletePlayer(id);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/')}
            className="p-2 hover:bg-gray-200 bg-gray-100 rounded-xl transition-colors"
            title="Voltar"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Atletas</h1>
            <p className="text-gray-500">Gerencie e analise o histórico dos {data.players.length} jogadores.</p>
          </div>
        </div>
          <button 
          onClick={() => {
            setEditingId(null);
            setFormData({ name: '', phone: '', birthDate: '', gender: '' });
            setShowModal(true);
          }}
          className="bg-black hover:bg-gray-800 text-white font-semibold py-2.5 px-5 rounded-xl transition-all flex items-center gap-2"
        >
          <UserPlus className="w-5 h-5" />
          Novo Atleta
        </button>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input 
            type="text" 
            placeholder="Buscar por nome..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-green-500 outline-none"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-4 font-semibold text-gray-600 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('name')}>
                  Nome <SortIcon field="name" />
                </th>
                <th className="px-4 py-4 font-semibold text-gray-600 cursor-pointer hover:bg-gray-100 transition-colors text-center" onClick={() => handleSort('gender')}>
                  Gênero <SortIcon field="gender" />
                </th>
                <th className="px-4 py-4 font-semibold text-gray-600 cursor-pointer hover:bg-gray-100 transition-colors text-center" onClick={() => handleSort('age')}>
                  Idade <SortIcon field="age" />
                </th>
                <th className="px-4 py-4 font-semibold text-gray-600 cursor-pointer hover:bg-gray-100 transition-colors text-center" onClick={() => handleSort('played')}>
                  Etapas <SortIcon field="played" />
                </th>
                <th className="px-4 py-4 font-semibold text-gray-600 cursor-pointer hover:bg-gray-100 transition-colors text-center" onClick={() => handleSort('winRate')}>
                  % Aprov <SortIcon field="winRate" />
                </th>
                <th className="px-4 py-4 font-semibold text-gray-600 cursor-pointer hover:bg-gray-100 transition-colors text-center" onClick={() => handleSort('points')}>
                  Pontuação <SortIcon field="points" />
                </th>
                <th className="px-4 py-4 font-semibold text-gray-600 cursor-pointer hover:bg-gray-100 transition-colors text-center" onClick={() => handleSort('gameBalance')}>
                  SG <SortIcon field="gameBalance" />
                </th>
                <th className="px-4 py-4 font-semibold text-gray-600 cursor-pointer hover:bg-gray-100 transition-colors text-center" onClick={() => handleSort('gamesWon')}>
                  GV <SortIcon field="gamesWon" />
                </th>
                <th className="px-4 py-4 font-semibold text-gray-600 cursor-pointer hover:bg-gray-100 transition-colors text-center" onClick={() => handleSort('stars')}>
                  Avaliação <SortIcon field="stars" />
                </th>
                <th className="px-4 py-4 font-semibold text-gray-600 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredPlayers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-gray-500">
                    Nenhum atleta encontrado.
                  </td>
                </tr>
              ) : (
                filteredPlayers.map((player) => (
                  <tr 
                    key={player.id} 
                    onClick={() => navigate(`/players/${player.id}`)}
                    className="border-b border-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-4 font-medium text-gray-900">{player.name}</td>
                    <td className="px-4 py-4 text-center text-gray-500">{player.gender === 'M' ? 'Masculino' : player.gender === 'F' ? 'Feminino' : '-'}</td>
                    <td className="px-4 py-4 text-center text-gray-500">{player.age}</td>
                    <td className="px-4 py-4 text-center text-gray-500">{player.played}</td>
                    <td className="px-4 py-4 text-center text-gray-500">{player.winRate.toFixed(1)}%</td>
                    <td className="px-4 py-4 text-center font-bold text-gray-900">{player.points}</td>
                    <td className="px-4 py-4 text-center text-gray-500">{player.gameBalance > 0 ? `+${player.gameBalance}` : player.gameBalance}</td>
                    <td className="px-4 py-4 text-center text-gray-500">{player.gamesWon}</td>
                    <td className="px-4 py-4 text-center">
                      <div className="flex items-center justify-center gap-0.5">
                        {[1,2,3,4,5].map(star => (
                           <Star key={star} className={cn("w-4 h-4", player.stars >= star ? "fill-yellow-400 text-yellow-400" : "fill-gray-200 text-gray-200")} />
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={(e) => { e.stopPropagation(); openEdit(player); }}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDelete(player.id); }}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">
                {editingId ? 'Editar Atleta' : 'Cadastrar Atleta'}
              </h2>
              <form onSubmit={handleSubmit}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
                    <input 
                      type="text" 
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      placeholder="Ex: João Silva"
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                      autoFocus
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Gênero</label>
                    <select 
                      value={formData.gender}
                      onChange={(e) => setFormData({...formData, gender: e.target.value as any})}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                      required
                    >
                      <option value="" disabled>Selecione</option>
                      <option value="M">Masculino</option>
                      <option value="F">Feminino</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Data Nasc.</label>
                      <input 
                        type="date" 
                        value={formData.birthDate}
                        onChange={(e) => setFormData({...formData, birthDate: e.target.value})}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Telefone (opcional)</label>
                      <input 
                        type="text" 
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                        placeholder="(00) 00000-0000"
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 pt-4">
                    <button 
                      type="button" 
                      onClick={() => setShowModal(false)}
                      className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium"
                    >
                      Cancelar
                    </button>
                    <button 
                      type="submit" 
                      className="px-4 py-2 bg-black text-white hover:bg-gray-800 rounded-lg font-medium"
                    >
                      Salvar
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
