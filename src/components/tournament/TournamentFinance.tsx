import React, { useState } from 'react';
import { Tournament, TournamentExpense, TournamentPayment } from '../../types';
import { useAppStore } from '../../store/AppContext';
import { DollarSign, Plus, Trash2, CheckCircle2, AlertCircle, TrendingUp, TrendingDown, HelpCircle, X } from 'lucide-react';
import { format } from 'date-fns';

interface TournamentFinanceProps {
  tournament: Tournament;
}

const EXPENSE_CATEGORIES = [
  'Aluguel das quadras',
  'Premiações',
  'Bolas',
  'Materiais',
  'Estrutura',
  'Árbitro(s)',
  'Coordenação',
  'Staff',
  'Outros',
];

export default function TournamentFinance({ tournament }: TournamentFinanceProps) {
  const { data, updateTournament, currentRole } = useAppStore();
  const [showAddCostModal, setShowAddCostModal] = useState(false);

  // Form State for Expense
  const [expenseCategory, setExpenseCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [customCategory, setCustomCategory] = useState('');
  const [expenseAmount, setExpenseAmount] = useState<number>(0);
  const [expenseDate, setExpenseDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [expensePaymentMethod, setExpensePaymentMethod] = useState<'Pix' | 'Cartão' | 'Dinheiro' | 'Isento'>('Pix');
  const [expensePaid, setExpensePaid] = useState(true);
  const [isExpenseFocused, setIsExpenseFocused] = useState(false);

  const fee = tournament.registrationFee || 0;
  const dbPayments = tournament.payments || {};
  const dbExpenses = tournament.expenses || [];

  // Flattened player IDs currently participating
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

  const getPlayerName = (id: string): string => {
    return data.players.find((p) => p.id === id)?.name || 'Atleta';
  };

  // Toggle/Edit Player Payment
  const handleTogglePayment = async (playerId: string, paid: boolean) => {
    if (currentRole === 'viewer') return;

    const currentPay = dbPayments[playerId];
    const defaultMethod = 'Pix';
    
    const updatedPay: TournamentPayment = {
      playerId,
      paid,
      amount: paid ? (currentPay?.amount ?? fee) : 0,
    };

    if (paid) {
      updatedPay.date = currentPay?.date || format(new Date(), 'yyyy-MM-dd');
      updatedPay.paymentMethod = currentPay?.paymentMethod || defaultMethod;
    }

    const nextPayments = {
      ...dbPayments,
      [playerId]: updatedPay,
    };

    await updateTournament(tournament.id, { payments: nextPayments });
  };

  const handleUpdatePaymentMethod = async (playerId: string, method: 'Pix' | 'Cartão' | 'Dinheiro' | 'Isento') => {
    if (currentRole === 'viewer') return;

    const currentPay = dbPayments[playerId] || { playerId, paid: false, amount: 0 };
    const finalAmount = method === 'Isento' ? 0 : (currentPay.amount || fee);

    const updatedPay: TournamentPayment = {
      ...currentPay,
      paymentMethod: method,
      amount: finalAmount,
      paid: true, // auto check paid if a payment method is chosen
    };

    const nextPayments = {
      ...dbPayments,
      [playerId]: updatedPay,
    };

    await updateTournament(tournament.id, { payments: nextPayments });
  };

  const handleUpdatePaymentAmount = async (playerId: string, amount: number) => {
    if (currentRole === 'viewer') return;

    const currentPay = dbPayments[playerId] || { playerId, paid: false, amount: 0 };
    const updatedPay: TournamentPayment = {
      ...currentPay,
      amount,
    };

    const nextPayments = {
      ...dbPayments,
      [playerId]: updatedPay,
    };

    await updateTournament(tournament.id, { payments: nextPayments });
  };

  const handleUpdatePaymentDate = async (playerId: string, date: string) => {
    if (currentRole === 'viewer') return;

    const currentPay = dbPayments[playerId] || { playerId, paid: false, amount: fee };
    const updatedPay: TournamentPayment = {
      ...currentPay,
      date,
    };

    const nextPayments = {
      ...dbPayments,
      [playerId]: updatedPay,
    };

    await updateTournament(tournament.id, { payments: nextPayments });
  };

  // Add Expense / Cost
  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (currentRole === 'viewer') return;

    const finalCategory = expenseCategory === 'Outros' ? customCategory || 'Outros' : expenseCategory;
    const newExpense: TournamentExpense = {
      id: crypto.randomUUID(),
      category: finalCategory,
      amount: expenseAmount,
      paid: expensePaid,
      date: expenseDate,
      paymentMethod: expensePaymentMethod,
    };

    const nextExpenses = [...dbExpenses, newExpense];
    await updateTournament(tournament.id, { expenses: nextExpenses });

    setShowAddCostModal(false);
    setCustomCategory('');
    setExpenseAmount(0);
  };

  const handleDeleteExpense = async (id: string) => {
    if (currentRole === 'viewer') return;
    const nextExpenses = dbExpenses.filter((e) => e.id !== id);
    await updateTournament(tournament.id, { expenses: nextExpenses });
  };

  const toggleExpensePaid = async (expenseId: string) => {
    if (currentRole === 'viewer') return;
    const nextExpenses = dbExpenses.map((exp) => {
      if (exp.id === expenseId) {
        return { ...exp, paid: !exp.paid };
      }
      return exp;
    });
    await updateTournament(tournament.id, { expenses: nextExpenses });
  };

  // Metrics
  // Expected: number of participants * registration fee (except those who are isento in payments map)
  const totalExpectedIncomes = participantIds.reduce((acc, pid) => {
    const pay = dbPayments[pid];
    if (pay?.paymentMethod === 'Isento') return acc;
    return acc + (pay?.amount ?? fee);
  }, 0);

  const totalCollectedIncomes = participantIds.reduce((acc, pid) => {
    const pay = dbPayments[pid];
    if (pay?.paid) {
      return acc + (pay.amount ?? 0);
    }
    return acc;
  }, 0);

  const pendingBalance = totalExpectedIncomes - totalCollectedIncomes;

  const totalCostsPaid = dbExpenses.filter((e) => e.paid).reduce((acc, e) => acc + e.amount, 0);
  const totalCostsExpected = dbExpenses.reduce((acc, e) => acc + e.amount, 0);

  const profitLoss = totalCollectedIncomes - totalCostsPaid;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Financial Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-green-50 text-green-600 rounded-xl">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Total Arrecadado</p>
            <p className="text-xl font-bold text-gray-900">R$ {totalCollectedIncomes.toLocaleString('pt-BR')}</p>
            <p className="text-[10px] text-gray-400">Esperado: R$ {totalExpectedIncomes.toLocaleString('pt-BR')}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-red-50 text-red-600 rounded-xl">
            <TrendingDown className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Custos Quitados</p>
            <p className="text-xl font-bold text-gray-900">R$ {totalCostsPaid.toLocaleString('pt-BR')}</p>
            <p className="text-[10px] text-gray-400">Total Previsto: R$ {totalCostsExpected.toLocaleString('pt-BR')}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-yellow-50 text-yellow-600 rounded-xl">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Saldo em Aberto</p>
            <p className="text-xl font-bold text-gray-900">R$ {pendingBalance.toLocaleString('pt-BR')}</p>
          </div>
        </div>

        <div className={`p-5 rounded-2xl shadow-sm border text-white flex items-center gap-4 ${profitLoss >= 0 ? 'bg-black border-black' : 'bg-red-900 border-red-900'}`}>
          <div className="p-3 bg-white/10 rounded-xl">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Resultado (Lucro/Prejuízo)</p>
            <p className="text-2xl font-black">R$ {profitLoss.toLocaleString('pt-BR')}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Participants Payments */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
          <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <div>
              <h3 className="font-bold text-gray-950 text-base">Inscrições e Recebimentos</h3>
              <p className="text-xs text-gray-500">Controle o pagamento das inscrições de cada atleta.</p>
            </div>
            <span className="text-xs bg-green-100 text-green-700 font-bold px-2.5 py-1 rounded-full">
              Taxa: R$ {fee}
            </span>
          </div>

          <div className="divide-y divide-gray-100 overflow-y-auto max-h-[500px]">
            {participantIds.map((pid) => {
              const pay = dbPayments[pid] || { playerId: pid, paid: false, amount: fee };
              const isWithdrawn = (tournament.withdrawnPlayers || []).includes(pid);

              return (
                <div key={pid} className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50/30 transition-colors ${isWithdrawn ? 'opacity-50 bg-red-50/10' : ''}`}>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={pay.paid}
                      disabled={currentRole === 'viewer'}
                      onChange={(e) => handleTogglePayment(pid, e.target.checked)}
                      className="rounded border-gray-300 text-green-500 focus:ring-green-500 h-5 w-5 cursor-pointer disabled:cursor-not-allowed"
                    />
                    <div>
                      <span className={`font-bold text-sm ${isWithdrawn ? 'line-through text-red-500' : 'text-gray-900'}`}>
                        {getPlayerName(pid)}
                      </span>
                      {pay.paid && (
                        <div className="flex gap-2.5 text-[10px] text-gray-400 font-medium font-mono mt-0.5">
                          <span>Forma: {pay.paymentMethod || 'Pix'}</span>
                          {pay.date && <span>Data: {format(new Date(pay.date + 'T12:00:00'), 'dd/MM')}</span>}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={pay.paymentMethod || 'Pix'}
                      disabled={currentRole === 'viewer'}
                      onChange={(e) => handleUpdatePaymentMethod(pid, e.target.value as any)}
                      className="bg-gray-100 text-xs font-bold text-gray-700 border-none rounded-lg p-1.5 focus:ring-0 outline-none cursor-pointer"
                    >
                      <option value="Pix">Pix</option>
                      <option value="Cartão">Cartão</option>
                      <option value="Dinheiro">Dinheiro</option>
                      <option value="Isento">Isento</option>
                    </select>

                    <input
                      type="number"
                      value={pay.paid && pay.paymentMethod === 'Isento' ? 0 : (pay.amount ?? fee)}
                      disabled={currentRole === 'viewer' || pay.paymentMethod === 'Isento'}
                      onChange={(e) => handleUpdatePaymentAmount(pid, Number(e.target.value))}
                      className="w-20 bg-gray-100 text-xs font-bold text-right text-gray-800 border-none rounded-lg p-1.5 focus:ring-0 outline-none"
                    />

                    <input
                      type="date"
                      value={pay.date || ''}
                      disabled={currentRole === 'viewer'}
                      onChange={(e) => handleUpdatePaymentDate(pid, e.target.value)}
                      className="bg-gray-100 text-xs font-bold text-gray-700 border-none rounded-lg p-1.5 focus:ring-0 outline-none w-28"
                      title="Data do Pagamento"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Expenses and Costs */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-4 border-b border-gray-100">
              <div>
                <h3 className="font-bold text-gray-950 text-base">Despesas & Custos do Torneio</h3>
                <p className="text-xs text-gray-500">Gerencie todos os custos e saídas do evento.</p>
              </div>
              {currentRole !== 'viewer' && (
                <button
                  onClick={() => setShowAddCostModal(true)}
                  className="bg-black hover:bg-gray-800 text-white font-bold py-2 px-3 rounded-lg text-xs flex items-center gap-1 transition-all"
                >
                  <Plus className="w-4 h-4" /> Custo
                </button>
              )}
            </div>

            <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
              {dbExpenses.map((exp) => (
                <div key={exp.id} className="p-3.5 bg-gray-50 border border-gray-100 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => toggleExpensePaid(exp.id)}
                      disabled={currentRole === 'viewer'}
                      className={`p-1 rounded-full border transition-all ${
                        exp.paid ? 'bg-green-100 border-green-200 text-green-700' : 'bg-yellow-50 border-yellow-200 text-yellow-600'
                      }`}
                      title={exp.paid ? 'Marcar como pendente' : 'Marcar como pago'}
                    >
                      <CheckCircle2 className="w-4.5 h-4.5" />
                    </button>
                    <div>
                      <h4 className="font-bold text-sm text-gray-900">{exp.category}</h4>
                      <p className="text-[10px] text-gray-500">
                        {exp.paymentMethod || 'Pix'} • {exp.date ? format(new Date(exp.date + 'T12:00:00'), 'dd/MM/yyyy') : 'Sem data'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-bold text-sm text-red-600">R$ {exp.amount.toLocaleString('pt-BR')}</span>
                    {currentRole !== 'viewer' && (
                      <button
                        onClick={() => handleDeleteExpense(exp.id)}
                        className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {dbExpenses.length === 0 && (
                <div className="py-12 text-center text-gray-400 text-sm">
                  Nenhuma despesa adicionada a esta etapa.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add Cost Modal */}
      {showAddCostModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowAddCostModal(false);
            }
          }}
        >
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden relative">
            <button
              type="button"
              onClick={() => setShowAddCostModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 rounded-lg p-1 transition-colors"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="p-6">
              <h3 className="text-lg font-bold mb-4">Novo Custo do Evento</h3>
              <form onSubmit={handleAddExpense} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Categoria de Custo</label>
                  <select
                    value={expenseCategory}
                    onChange={(e) => setExpenseCategory(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none"
                  >
                    {EXPENSE_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                {expenseCategory === 'Outros' && (
                  <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Especifique a Despesa</label>
                    <input
                      type="text"
                      required
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value)}
                      placeholder="Ex: Troféus de acrílico"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Valor (R$)</label>
                    <input
                      type={isExpenseFocused ? "number" : "text"}
                      required
                      value={isExpenseFocused ? (expenseAmount === 0 ? "" : expenseAmount) : (expenseAmount > 0 ? `R$ ${expenseAmount.toLocaleString('pt-BR')},00` : "R$ 0,00")}
                      onFocus={() => setIsExpenseFocused(true)}
                      onBlur={() => setIsExpenseFocused(false)}
                      onChange={(e) => {
                        const val = e.target.value === "" ? 0 : Number(e.target.value);
                        setExpenseAmount(val);
                      }}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 outline-none font-bold text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Forma de Pagto</label>
                    <select
                      value={expensePaymentMethod}
                      onChange={(e) => setExpensePaymentMethod(e.target.value as any)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 outline-none text-sm"
                    >
                      <option value="Pix">Pix</option>
                      <option value="Cartão">Cartão</option>
                      <option value="Dinheiro">Dinheiro</option>
                      <option value="Isento">Isento</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
                  <input
                    type="date"
                    value={expenseDate}
                    onChange={(e) => setExpenseDate(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="costPaid"
                    checked={expensePaid}
                    onChange={(e) => setExpensePaid(e.target.checked)}
                    className="rounded border-gray-300 text-green-500 focus:ring-green-500 h-4 w-4"
                  />
                  <label htmlFor="costPaid" className="text-sm font-semibold text-gray-700 cursor-pointer">
                    Marcar como já pago / quitado
                  </label>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setShowAddCostModal(false)}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium text-sm"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-black hover:bg-gray-800 text-white rounded-lg font-medium text-sm"
                  >
                    Adicionar Custo
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
