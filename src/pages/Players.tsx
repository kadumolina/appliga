import React, { useState, useMemo } from 'react';
import { useAppStore } from '../store/AppContext';
import { UserPlus, Search, Edit2, Trash2, ArrowLeft, ArrowDown, ArrowUp, Star, Upload, X, Check, FileSpreadsheet } from 'lucide-react';
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
  const { data, addPlayer, updatePlayer, deletePlayer, currentRole } = useAppStore();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', phone: '', birthDate: '', gender: '' as 'M' | 'F' | '', email: '' });

  const [sortField, setSortField] = useState<string>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // CSV Import states
  const [showImportModal, setShowImportModal] = useState(false);
  const [importedPlayers, setImportedPlayers] = useState<any[]>([]);
  const [importStep, setImportStep] = useState<'upload' | 'confirm'>('upload');

  const parseCSV = (text: string) => {
    const lines = text.split(/\r?\n/);
    const parsed: any[] = [];
    if (lines.length === 0) return;
    const firstLine = lines[0];
    const separator = firstLine.includes(';') ? ';' : ',';

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const parts = line.split(separator);
      if (parts.length >= 2) {
        const name = parts[0]?.replace(/^["']|["']$/g, '').trim();
        let genderInput = parts[1]?.replace(/^["']|["']$/g, '').trim() || '';
        let gender: 'M' | 'F' | '' = '';
        if (genderInput.toLowerCase().startsWith('m') || genderInput.toLowerCase() === 'masculino' || genderInput.toUpperCase() === 'M') {
          gender = 'M';
        } else if (genderInput.toLowerCase().startsWith('f') || genderInput.toLowerCase() === 'feminino' || genderInput.toUpperCase() === 'F') {
          gender = 'F';
        }
        const birthDate = parts[2]?.replace(/^["']|["']$/g, '').trim() || '';
        const phone = parts[3]?.replace(/^["']|["']$/g, '').trim() || '';
        const email = parts[4]?.replace(/^["']|["']$/g, '').trim() || '';
        if (name) {
          parsed.push({
            id: crypto.randomUUID(),
            name,
            gender,
            birthDate,
            phone,
            email
          });
        }
      }
    }
    if (parsed.length === 0) {
      alert("Nenhum atleta válido encontrado no arquivo CSV. Verifique se o formato está correto.");
      return;
    }
    setImportedPlayers(parsed);
    setImportStep('confirm');
  };

  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      parseCSV(text);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const downloadCSVTemplate = () => {
    const headers = 'Nome Completo,Gênero (M ou F),Data de Nascimento (AAAA-MM-DD),Telefone (Opcional),Email (Opcional)\r\n';
    const sample = 'João Silva,M,1995-04-12,(11) 99999-9999,joao.silva@email.com\r\nMaria Oliveira,F,1998-08-23,(21) 98888-8888,maria.oliveira@email.com\r\n';
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + encodeURIComponent(headers + sample);
    const link = document.createElement('a');
    link.setAttribute('href', csvContent);
    link.setAttribute('download', 'modelo_atletas.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleConfirmImport = async () => {
    for (const player of importedPlayers) {
      const { name, gender, birthDate, phone, email } = player;
      await addPlayer({
        name,
        gender: gender || undefined,
        birthDate: birthDate || undefined,
        phone: phone || undefined,
        email: email || undefined,
      } as any);
    }
    setShowImportModal(false);
    setImportedPlayers([]);
    setImportStep('upload');
  };

  const handleUpdateImportedRow = (id: string, updatedField: any) => {
    setImportedPlayers(importedPlayers.map(p => p.id === id ? { ...p, ...updatedField } : p));
  };

  const handleRemoveImportedRow = (id: string) => {
    setImportedPlayers(importedPlayers.filter(p => p.id !== id));
  };

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
    setFormData({ name: '', phone: '', birthDate: '', gender: '', email: '' });
    setEditingId(null);
  };

  const openEdit = (player: any) => {
    setFormData({ name: player.name, phone: player.phone || '', birthDate: player.birthDate || '', gender: player.gender || '', email: player.email || '' });
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
        {currentRole !== 'viewer' && (
          <div className="flex items-center gap-2">
            <button 
              onClick={() => {
                setImportStep('upload');
                setImportedPlayers([]);
                setShowImportModal(true);
              }}
              className="bg-gray-150 hover:bg-gray-200 border border-gray-300 text-gray-800 font-semibold py-2.5 px-4 rounded-xl transition-all flex items-center gap-2 text-sm"
            >
              <Upload className="w-4 h-4 text-green-600" />
              <span>Importar CSV</span>
            </button>
            <button 
              onClick={() => {
                setEditingId(null);
                setFormData({ name: '', phone: '', birthDate: '', gender: '', email: '' });
                setShowModal(true);
              }}
              className="bg-black hover:bg-gray-800 text-white font-semibold py-2.5 px-5 rounded-xl transition-all flex items-center gap-2 text-sm"
            >
              <UserPlus className="w-5 h-5" />
              Novo Atleta
            </button>
          </div>
        )}
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
                {currentRole !== 'viewer' && (
                  <th className="px-4 py-4 font-semibold text-gray-600 text-right">Ações</th>
                )}
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
                    {currentRole !== 'viewer' && (
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
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowModal(false);
            }
          }}
        >
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden relative">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 rounded-lg p-1 transition-colors"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">Gênero</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setFormData({...formData, gender: 'M'})}
                        className={`py-2 px-4 rounded-xl font-semibold border transition-all ${
                          formData.gender === 'M'
                            ? 'bg-blue-50 border-blue-500 text-blue-700 ring-2 ring-blue-500/20'
                            : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        Masculino
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({...formData, gender: 'F'})}
                        className={`py-2 px-4 rounded-xl font-semibold border transition-all ${
                          formData.gender === 'F'
                            ? 'bg-pink-50 border-pink-500 text-pink-700 ring-2 ring-pink-500/20'
                            : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        Feminino
                      </button>
                    </div>
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
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">E-mail (opcional)</label>
                    <input 
                      type="email" 
                      value={formData.email || ''}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      placeholder="Ex: atleta@email.com"
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                    />
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

      {showImportModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowImportModal(false);
            }
          }}
        >
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div>
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-green-600" />
                  Importação de Atletas em Lote
                </h2>
                <p className="text-xs text-gray-500 mt-1">Insira vários atletas no sistema de uma só vez utilizando uma planilha CSV.</p>
              </div>
              <button 
                onClick={() => setShowImportModal(false)}
                className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 flex-1 overflow-y-auto">
              {importStep === 'upload' ? (
                <div className="space-y-6 text-center py-8">
                  <div className="max-w-md mx-auto space-y-4">
                    <div className="w-16 h-16 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto border border-green-100 shadow-sm">
                      <Upload className="w-8 h-8" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 text-lg">Faça upload do seu arquivo CSV</h3>
                      <p className="text-sm text-gray-500 mt-1">Preencha nossa planilha modelo e faça o upload para analisar e editar as informações.</p>
                    </div>
                    
                    <button
                      type="button"
                      onClick={downloadCSVTemplate}
                      className="text-green-600 hover:text-green-700 text-sm font-bold underline flex items-center gap-1.5 justify-center mx-auto"
                    >
                      <FileSpreadsheet className="w-4 h-4" />
                      Baixar Modelo CSV Exemplo
                    </button>

                    <div className="pt-4">
                      <label className="bg-black hover:bg-gray-800 text-white font-bold py-3 px-6 rounded-xl shadow-md transition-all cursor-pointer inline-flex items-center gap-2">
                        <Upload className="w-5 h-5" />
                        Selecionar Arquivo CSV
                        <input 
                          type="file" 
                          accept=".csv" 
                          onChange={handleCSVUpload} 
                          className="hidden" 
                        />
                      </label>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 flex flex-col h-full">
                  <div className="bg-yellow-50 border border-yellow-100 p-4 rounded-xl flex items-start gap-3">
                    <span className="text-yellow-600 font-bold text-lg leading-none">⚠️</span>
                    <div className="text-xs text-yellow-800 leading-relaxed">
                      <p className="font-bold">Confirme os dados importados</p>
                      <p className="mt-0.5">Detectamos <strong>{importedPlayers.length} atletas</strong>. Você pode editar diretamente os campos na tabela abaixo para corrigir eventuais falhas antes de confirmar a importação definitiva.</p>
                    </div>
                  </div>

                  <div className="border border-gray-100 rounded-xl overflow-hidden flex-1 overflow-x-auto min-h-[300px]">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                      <thead className="bg-gray-50 border-b border-gray-100 text-gray-600 font-semibold">
                        <tr>
                          <th className="px-4 py-3">Nome Completo</th>
                          <th className="px-4 py-3 text-center">Gênero</th>
                          <th className="px-4 py-3">Data Nasc.</th>
                          <th className="px-4 py-3">Telefone</th>
                          <th className="px-4 py-3">Email</th>
                          <th className="px-4 py-3 text-center w-12">Remover</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {importedPlayers.map((player) => (
                          <tr key={player.id} className="hover:bg-gray-50/50">
                            <td className="px-3 py-2">
                              <input
                                type="text"
                                value={player.name}
                                onChange={(e) => handleUpdateImportedRow(player.id, { name: e.target.value })}
                                className="w-48 border border-gray-200 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-green-500 outline-none text-xs"
                                required
                              />
                            </td>
                            <td className="px-3 py-2 text-center">
                              <div className="inline-flex gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateImportedRow(player.id, { gender: 'M' })}
                                  className={`px-2.5 py-1 text-[10px] font-bold rounded-md border ${
                                    player.gender === 'M'
                                      ? 'bg-blue-50 border-blue-500 text-blue-700'
                                      : 'bg-white border-gray-200 text-gray-500'
                                  }`}
                                >
                                  M
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateImportedRow(player.id, { gender: 'F' })}
                                  className={`px-2.5 py-1 text-[10px] font-bold rounded-md border ${
                                    player.gender === 'F'
                                      ? 'bg-pink-50 border-pink-500 text-pink-700'
                                      : 'bg-white border-gray-200 text-gray-500'
                                  }`}
                                >
                                  F
                                </button>
                              </div>
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="date"
                                value={player.birthDate}
                                onChange={(e) => handleUpdateImportedRow(player.id, { birthDate: e.target.value })}
                                className="w-32 border border-gray-200 rounded-lg px-2 py-1 focus:ring-2 focus:ring-green-500 outline-none text-xs"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="text"
                                value={player.phone}
                                onChange={(e) => handleUpdateImportedRow(player.id, { phone: e.target.value })}
                                placeholder="(00) 00000-0000"
                                className="w-32 border border-gray-200 rounded-lg px-2 py-1 focus:ring-2 focus:ring-green-500 outline-none text-xs"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="email"
                                value={player.email}
                                onChange={(e) => handleUpdateImportedRow(player.id, { email: e.target.value })}
                                placeholder="atleta@email.com"
                                className="w-40 border border-gray-200 rounded-lg px-2 py-1 focus:ring-2 focus:ring-green-500 outline-none text-xs"
                              />
                            </td>
                            <td className="px-3 py-2 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveImportedRow(player.id)}
                                className="p-1 text-gray-400 hover:text-red-500 rounded transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex justify-between items-center pt-4 border-t border-gray-100 bg-white">
                    <button
                      type="button"
                      onClick={() => setImportStep('upload')}
                      className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium text-xs"
                    >
                      Voltar
                    </button>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setShowImportModal(false)}
                        className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium text-xs"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={handleConfirmImport}
                        disabled={importedPlayers.length === 0}
                        className={`px-5 py-2.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all ${
                          importedPlayers.length > 0
                            ? 'bg-black text-white hover:bg-gray-800'
                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        <Check className="w-4 h-4" />
                        Importar {importedPlayers.length} Atletas
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
