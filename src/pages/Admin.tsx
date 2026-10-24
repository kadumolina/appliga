import React from 'react';
import { useAppStore } from '../store/AppContext';
import { Shield, Users, Briefcase, Power, ArrowRight, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';

export default function Admin() {
  const { 
    isAdmin, workspaces, toggleWorkspaceStatus, 
    toggleWorkspaceModule, switchWorkspace, deleteUserFromSystem 
  } = useAppStore();
  const navigate = useNavigate();

  if (!isAdmin) {
    return <div className="p-8 text-center text-red-500 font-bold">Acesso negado. Esta página é restrita a administradores.</div>;
  }

  // Calculate unique users list & detail mapping
  const userMap = new Map<string, { 
    email: string; 
    name: string; 
    workspaces: { id: string; ownerEmail: string; role: string }[] 
  }>();

  workspaces.forEach(ws => {
    // Check owner
    if (!userMap.has(ws.ownerId)) {
      userMap.set(ws.ownerId, {
        email: ws.ownerEmail,
        name: ws.memberDetails?.[ws.ownerId]?.name || 'Dono / Professor',
        workspaces: []
      });
    }
    userMap.get(ws.ownerId)!.workspaces.push({
      id: ws.id,
      ownerEmail: ws.ownerEmail,
      role: 'owner'
    });

    // Check other members
    ws.members.forEach(uid => {
      if (uid === ws.ownerId) return; // already handled above
      const details = ws.memberDetails?.[uid] || { email: 'Sem email', name: 'Usuário Sem Nome' };
      const role = ws.roles[uid] || 'viewer';
      
      if (!userMap.has(uid)) {
        userMap.set(uid, {
          email: details.email,
          name: details.name,
          workspaces: []
        });
      }
      
      userMap.get(uid)!.workspaces.push({
        id: ws.id,
        ownerEmail: ws.ownerEmail,
        role: role
      });
    });
  });

  const uniqueUsersList = Array.from(userMap.entries()).map(([uid, u]) => ({
    uid,
    ...u
  }));

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      {/* Top Banner */}
      <div className="flex items-center gap-3">
        <div className="p-3 bg-red-100 rounded-xl">
          <Shield className="w-8 h-8 text-red-600" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Painel Master</h1>
          <p className="text-gray-500">Gestão global do ecossistema, módulos e usuários cadastrados</p>
        </div>
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-4 bg-blue-100 text-blue-600 rounded-full">
            <Briefcase className="w-8 h-8" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Ligas / Contas Registradas</p>
            <p className="text-3xl font-bold text-gray-900">{workspaces.length}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-4 bg-green-100 text-green-600 rounded-full">
            <Users className="w-8 h-8" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Usuários Únicos no Sistema</p>
            <p className="text-3xl font-bold text-gray-900">{uniqueUsersList.length}</p>
          </div>
        </div>
      </div>

      {/* Seção 1: Todas as Ligas */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">Todas as Ligas / Professores</h2>
          <p className="text-sm text-gray-500 mt-1">Gerencie o status de assinatura, módulos ativos e acesse o painel das ligas.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-sm border-b border-gray-100">
                <th className="p-4 font-medium">Email do Professor</th>
                <th className="p-4 font-medium">Membros</th>
                <th className="p-4 font-medium">Módulos Ativos (Assinatura)</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {workspaces.map(ws => (
                <tr key={ws.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="p-4 font-semibold text-gray-900">{ws.ownerEmail}</td>
                  <td className="p-4 text-gray-600 font-mono text-sm">{ws.members.length}</td>
                  <td className="p-4">
                    <div className="flex flex-col gap-1.5 py-1">
                      <label className="flex items-center gap-2 text-xs text-gray-700 font-medium cursor-pointer">
                        <input
                          type="checkbox"
                          checked={ws.modules?.tournaments !== false}
                          onChange={() => toggleWorkspaceModule(ws.id, 'tournaments', ws.modules?.tournaments !== false)}
                          className="rounded border-gray-300 text-green-500 focus:ring-green-500 h-3.5 w-3.5"
                        />
                        Campeonatos
                      </label>
                      <label className="flex items-center gap-2 text-xs text-gray-700 font-medium cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!ws.modules?.courtRental}
                          onChange={() => toggleWorkspaceModule(ws.id, 'courtRental', !!ws.modules?.courtRental)}
                          className="rounded border-gray-300 text-green-500 focus:ring-green-500 h-3.5 w-3.5"
                        />
                        Aluguel de Quadras
                      </label>
                      <label className="flex items-center gap-2 text-xs text-gray-700 font-medium cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!ws.modules?.classSchedule}
                          onChange={() => toggleWorkspaceModule(ws.id, 'classSchedule', !!ws.modules?.classSchedule)}
                          className="rounded border-gray-300 text-green-500 focus:ring-green-500 h-3.5 w-3.5"
                        />
                        Grade de Aulas
                      </label>
                      <label className="flex items-center gap-2 text-xs text-gray-700 font-medium cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!ws.modules?.finance}
                          onChange={() => toggleWorkspaceModule(ws.id, 'finance', !!ws.modules?.finance)}
                          className="rounded border-gray-300 text-green-500 focus:ring-green-500 h-3.5 w-3.5"
                        />
                        Controle Financeiro
                      </label>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={cn(
                      "px-3 py-1 rounded-full text-xs font-bold",
                      ws.status === 'inactive' ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600"
                    )}>
                      {ws.status === 'inactive' ? 'Inativo' : 'Ativo'}
                    </span>
                  </td>
                  <td className="p-4 text-right flex items-center justify-end gap-2">
                    <button
                      onClick={() => {
                        switchWorkspace(ws.id);
                        navigate('/');
                      }}
                      className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-black text-sm font-semibold rounded-lg flex items-center gap-1 transition-colors"
                      title="Acessar painel desta liga"
                    >
                      Acessar <ArrowRight className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Tem certeza que deseja ${ws.status === 'inactive' ? 'ativar' : 'desativar'} o acesso de ${ws.ownerEmail}?`)) {
                          toggleWorkspaceStatus(ws.id, ws.status);
                        }
                      }}
                      className={cn(
                        "p-1.5 rounded-lg transition-colors",
                        ws.status === 'inactive' ? "bg-green-100 text-green-600 hover:bg-green-200" : "bg-red-100 text-red-600 hover:bg-red-200"
                      )}
                      title={ws.status === 'inactive' ? 'Ativar Acesso' : 'Desativar Acesso'}
                    >
                      <Power className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
              {workspaces.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-500">
                    Nenhuma conta encontrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Seção 2: Gerenciamento Geral de Usuários (Master) */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">Gerenciamento de Usuários do Sistema</h2>
          <p className="text-sm text-gray-500 mt-1">Lista completa de todos os usuários cadastrados e associados do ecossistema RankUP. É possível deletar um usuário permanentemente de todos os espaços de trabalho.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-sm border-b border-gray-100">
                <th className="p-4 font-medium">Nome do Usuário</th>
                <th className="p-4 font-medium">E-mail</th>
                <th className="p-4 font-medium">Espaços de Trabalho Associados</th>
                <th className="p-4 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {uniqueUsersList.map(user => {
                const isOwnerOfAny = user.workspaces.some(w => w.role === 'owner');
                return (
                  <tr key={user.uid} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="font-semibold text-gray-900">{user.name}</span>
                        {isOwnerOfAny && (
                          <span className="text-[10px] w-max font-bold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded mt-0.5 uppercase tracking-wider">
                            Dono de Liga
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-gray-600 text-sm">{user.email}</td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1.5">
                        {user.workspaces.map(w => (
                          <span 
                            key={w.id} 
                            className={cn(
                              "text-xs px-2 py-0.5 rounded-md font-medium inline-block",
                              w.role === 'owner' 
                                ? "bg-amber-50 border border-amber-200 text-amber-700" 
                                : w.role === 'editor' 
                                  ? "bg-blue-50 border border-blue-200 text-blue-700" 
                                  : "bg-gray-100 border border-gray-200 text-gray-600"
                            )}
                          >
                            {w.ownerEmail} ({w.role === 'owner' ? 'Dono' : w.role === 'editor' ? 'Editor' : 'Visualizador'})
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={async () => {
                          const warningMsg = isOwnerOfAny 
                            ? `ATENÇÃO: Este usuário é DONO de uma liga (${user.email}). Ao excluí-lo, a liga associada e TODOS os campeonatos e atletas da mesma serão excluídos permanentemente. Deseja continuar?` 
                            : `Tem certeza que deseja excluir o usuário ${user.email} de todo o sistema? Esta ação o removerá de todos os espaços de trabalho associados.`;
                          
                          if (confirm(warningMsg)) {
                            await deleteUserFromSystem(user.uid);
                            alert('Usuário excluído com sucesso do sistema!');
                          }
                        }}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors inline-flex items-center justify-center gap-1.5 font-semibold text-xs"
                        title="Deletar usuário permanentemente"
                      >
                        <Trash2 className="w-4 h-4" /> Deletar do Sistema
                      </button>
                    </td>
                  </tr>
                );
              })}
              {uniqueUsersList.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-gray-500">
                    Nenhum usuário ativo registrado no sistema.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
