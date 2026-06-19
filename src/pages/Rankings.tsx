import React, { useMemo, useState } from 'react';
import { useAppStore } from '../store/AppContext';
import { Trophy, Medal, Search, Download, Printer, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { calculateGlobalRankings } from '../lib/tournament';

type RankingTab = 'geral' | 'masculino' | 'feminino' | 'duplas_fixas' | 'mistas_aleatorias';

export default function Rankings() {
  const { data } = useAppStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<RankingTab>('geral');

  const rankings = useMemo(() => {
    switch (activeTab) {
      case 'geral':
        return calculateGlobalRankings(data, 'geral', 'all');
      case 'masculino':
        return calculateGlobalRankings(data, 'geral', 'M');
      case 'feminino':
        return calculateGlobalRankings(data, 'geral', 'F');
      case 'duplas_fixas':
        return calculateGlobalRankings(data, 'duplas_fixas', 'all');
      case 'mistas_aleatorias':
        return calculateGlobalRankings(data, 'mistas_aleatorias', 'all');
    }
  }, [data, activeTab]);

  const handleExportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Posicao,Atleta,Titulos,Etapas,Pontos\n";
    
    rankings.forEach((r, idx) => {
      const player = data.players.find(p => p.id === r.id);
      const row = `${idx + 1},"${player?.name || 'Desconhecido'}",${r.titles},${r.played},${r.points}`;
      csvContent += row + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "ranking-beach-tennis.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-4xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-center text-center md:text-left bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-4 w-full md:w-auto mb-4 md:mb-0">
          <button 
            onClick={() => navigate('/')}
            className="p-2 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors print:hidden"
            title="Voltar"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center rotate-3 hidden md:flex">
            <Trophy className="w-8 h-8 text-yellow-500 -rotate-3" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-gray-900 uppercase text-left">Ranking Oficial</h1>
            <p className="text-gray-500 mt-1 text-sm md:text-base text-left">Classificação acumulada de todos os atletas na liga.</p>
          </div>
        </div>
        <div className="mt-4 md:mt-0 flex flex-col sm:flex-row gap-2">
          <button 
            onClick={handleExportCSV}
            className="flex items-center justify-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-800 px-4 py-2 font-bold tracking-tight rounded-xl transition-all print:hidden"
          >
            <Download className="w-4 h-4" />
            CSV
          </button>
          <button 
            onClick={() => window.print()}
            className="flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-black px-4 py-2 font-bold tracking-tight rounded-xl transition-all print:hidden"
          >
            <Printer className="w-4 h-4" />
            Salvar PDF
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 print:hidden mb-4 rounded-xl p-1 bg-gray-100 items-center justify-start border border-gray-200 w-fit max-w-full overflow-x-auto">
        <button 
          onClick={() => setActiveTab('geral')}
          className={`px-4 py-2 font-semibold text-sm rounded-lg transition-colors whitespace-nowrap ${activeTab === 'geral' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
        >
          Ranking Geral
        </button>
        <button 
          onClick={() => setActiveTab('masculino')}
          className={`px-4 py-2 font-semibold text-sm rounded-lg transition-colors whitespace-nowrap ${activeTab === 'masculino' ? 'bg-blue-500 text-white shadow-sm' : 'text-gray-500 hover:text-blue-600'}`}
        >
          Masculino
        </button>
        <button 
          onClick={() => setActiveTab('feminino')}
          className={`px-4 py-2 font-semibold text-sm rounded-lg transition-colors whitespace-nowrap ${activeTab === 'feminino' ? 'bg-pink-500 text-white shadow-sm' : 'text-gray-500 hover:text-pink-600'}`}
        >
          Feminino
        </button>
        <button 
          onClick={() => setActiveTab('duplas_fixas')}
          className={`px-4 py-2 font-semibold text-sm rounded-lg transition-colors whitespace-nowrap ${activeTab === 'duplas_fixas' ? 'bg-purple-500 text-white shadow-sm' : 'text-gray-500 hover:text-purple-600'}`}
        >
          Duplas Fixas
        </button>
        <button 
          onClick={() => setActiveTab('mistas_aleatorias')}
          className={`px-4 py-2 font-semibold text-sm rounded-lg transition-colors whitespace-nowrap ${activeTab === 'mistas_aleatorias' ? 'bg-orange-500 text-white shadow-sm' : 'text-gray-500 hover:text-orange-600'}`}
        >
          Duplas Mistas
        </button>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full text-left min-w-[700px]">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-6 py-4 font-bold text-gray-400 text-center w-16">Pos</th>
              <th className="px-6 py-4 font-bold text-gray-400">{activeTab === 'duplas_fixas' ? 'Dupla' : 'Atleta'}</th>
              <th className="px-6 py-4 font-bold text-gray-400 text-center">Títulos</th>
              <th className="px-6 py-4 font-bold text-gray-400 text-center">Etapas</th>
              <th className="px-6 py-4 font-bold text-gray-400 text-center">% Aprov</th>
              <th className="px-6 py-4 font-bold text-gray-400 text-center">Jogos</th>
              <th className="px-6 py-4 font-bold text-gray-400 text-center">Vit</th>
              <th className="px-6 py-4 font-black text-gray-900 text-right">Pts</th>
            </tr>
          </thead>
          <tbody>
            {(() => {
              if (activeTab === 'duplas_fixas') {
                const pairedRankings = [];
                const seen = new Set();
                for (let i = 0; i < rankings.length; i++) {
                  const r = rankings[i];
                  if (seen.has(r.id)) continue;
                  
                  // In fixed pairings, their partner should have the exact same stats and be adjacent
                  // Or we can just find any other player in the list who has the same stats
                  const partnerIndex = rankings.findIndex((p, pIdx) => pIdx !== i && !seen.has(p.id) && p.points === r.points && p.played === r.played && p.winRate === r.winRate);
                  const partner = partnerIndex !== -1 ? rankings[partnerIndex] : null;

                  pairedRankings.push({ r1: r, r2: partner });
                  seen.add(r.id);
                  if (partner) seen.add(partner.id);
                }

                return pairedRankings.map((pair, idx) => {
                  const { r1, r2 } = pair;
                  const player1 = data.players.find(p => p.id === r1.id);
                  const player2 = r2 ? data.players.find(p => p.id === r2.id) : null;
                  
                  let MedalIcon = null;
                  if (idx === 0) MedalIcon = <Medal className="w-6 h-6 text-yellow-500" />;
                  else if (idx === 1) MedalIcon = <Medal className="w-6 h-6 text-gray-400" />;
                  else if (idx === 2) MedalIcon = <Medal className="w-6 h-6 text-orange-400" />;

                  return (
                    <tr 
                      key={r1.id} 
                      className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center font-black text-lg text-gray-400">
                          {MedalIcon ? MedalIcon : `${idx + 1}º`}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-gray-900">{player1?.name || 'Desconhecido'}</span>
                          {player2 && <span className="text-sm font-semibold text-gray-500">+ {player2.name}</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {r1.titles > 0 ? <span className="inline-flex items-center justify-center bg-yellow-100 text-yellow-700 w-6 h-6 rounded-full font-bold text-xs">{r1.titles}</span> : '-'}
                      </td>
                      <td className="px-6 py-4 text-center text-gray-500 font-medium">
                        {r1.played}
                      </td>
                      <td className="px-6 py-4 text-center text-gray-500 font-medium">
                        {r1.winRate.toFixed(1)}%
                      </td>
                      <td className="px-6 py-4 text-center text-gray-500 font-medium">
                        {r1.totalMatches}
                      </td>
                      <td className="px-6 py-4 text-center text-green-600 font-bold">
                        {r1.totalWins}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="inline-flex items-center bg-black text-white px-3 py-1 rounded-lg font-black text-lg">
                          {r1.points} <span className="text-xs text-gray-400 ml-1 font-bold">PTS</span>
                        </div>
                      </td>
                    </tr>
                  );
                });
              }

              return rankings.map((r, idx) => {
                const player = data.players.find(p => p.id === r.id);
                
                let MedalIcon = null;
                if (idx === 0) MedalIcon = <Medal className="w-6 h-6 text-yellow-500" />;
                else if (idx === 1) MedalIcon = <Medal className="w-6 h-6 text-gray-400" />;
                else if (idx === 2) MedalIcon = <Medal className="w-6 h-6 text-orange-400" />;

                return (
                  <tr 
                    key={r.id} 
                    onClick={() => navigate(`/players/${r.id}`)}
                    className="border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center font-black text-lg text-gray-400">
                        {MedalIcon ? MedalIcon : `${idx + 1}º`}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-bold text-gray-900">{player?.name || 'Desconhecido'}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {r.titles > 0 ? <span className="inline-flex items-center justify-center bg-yellow-100 text-yellow-700 w-6 h-6 rounded-full font-bold text-xs">{r.titles}</span> : '-'}
                    </td>
                    <td className="px-6 py-4 text-center text-gray-500 font-medium">
                      {r.played}
                    </td>
                    <td className="px-6 py-4 text-center text-gray-500 font-medium">
                      {r.winRate.toFixed(1)}%
                    </td>
                    <td className="px-6 py-4 text-center text-gray-500 font-medium">
                      {r.totalMatches}
                    </td>
                    <td className="px-6 py-4 text-center text-green-600 font-bold">
                      {r.totalWins}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="inline-flex items-center bg-black text-white px-3 py-1 rounded-lg font-black text-lg">
                        {r.points} <span className="text-xs text-gray-400 ml-1 font-bold">PTS</span>
                      </div>
                    </td>
                  </tr>
                );
              });
            })()}
            
            {rankings.length === 0 && (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                  Nenhum campeonato finalizado ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
