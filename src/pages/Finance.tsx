import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store/AppContext';
import { collection, query, where, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db, OperationType, handleFirestoreError } from '../lib/firebase';
import { Plus, Trash2, ArrowUpRight, ArrowDownRight, DollarSign, Wallet, Calendar, Shield, CreditCard } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Transaction {
  id: string;
  workspaceId: string;
  type: 'income' | 'expense';
  category: string;
  description: string;
  amount: number;
  date: string; // YYYY-MM-DD
  paymentMethod: 'Pix' | 'Cartão' | 'Dinheiro' | 'Isento';
  cleared: boolean; // Check if paid/received
  createdAt: number;
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

const INCOME_CATEGORIES = [
  'Mensalidades',
  'Aulas Avulsas',
  'Aluguel de Quadras',
  'Inscrições Torneio',
  'Patrocínio',
  'Vendas de Cantina / Bar',
  'Outros',
];

export default function Finance() {
  const { activeWorkspaceId, currentRole, workspaces } = useAppStore();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showAddModal, setShowAddModal] = useState<'income' | 'expense' | null>(null);
  const [loading, setLoading] = useState(true);

  // Form State
  const [category, setCategory] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [paymentMethod, setPaymentMethod] = useState<'Pix' | 'Cartão' | 'Dinheiro' | 'Isento'>('Pix');
  const [cleared, setCleared] = useState(true);

  const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId);
  const isModuleEnabled = activeWorkspace?.modules?.finance !== false;

  useEffect(() => {
    if (!activeWorkspaceId) return;

    setLoading(true);
    const q = query(collection(db, 'general_transactions'), where('workspaceId', '==', activeWorkspaceId));
    const unsub = onSnapshot(q, (snap) => {
      const list: Transaction[] = [];
      snap.forEach((d) => {
        list.push(d.data() as Transaction);
      });
      setTransactions(list.sort((a, b) => b.createdAt - a.createdAt));
      setLoading(false);
    }, (err) => {
      setLoading(false);
      const isPerm = (err as { code?: string })?.code === 'permission-denied' || String(err).toLowerCase().includes('permission');
      if (isPerm) {
        handleFirestoreError(err, OperationType.GET, 'general_transactions');
      } else {
        console.warn("Transactions subscription notice (operating offline):", err);
      }
    });

    return unsub;
  }, [activeWorkspaceId]);

  if (!isModuleEnabled) {
    return (
      <div className="max-w-md mx-auto text-center py-16 px-6 bg-white rounded-3xl border border-gray-100 shadow-sm mt-8">
        <div className="w-20 h-20 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <Wallet className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Controle Financeiro</h2>
        <p className="text-gray-600 mb-8 leading-relaxed">
          Esta funcionalidade de gestão financeira não está inclusa na sua assinatura atual. Entre em contato com o suporte Master para liberar o acesso.
        </p>
        <a 
          href="mailto:rankup.atendimento@gmail.com?subject=Liberar Modulo Financeiro"
          className="inline-block bg-black text-white hover:bg-gray-800 font-bold px-8 py-3 rounded-xl transition-all"
        >
          Falar com Suporte
        </a>
      </div>
    );
  }

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspaceId || !showAddModal) return;

    const finalCategory = category === 'Outros' ? customCategory || 'Outros' : category;
    const newId = crypto.randomUUID();

    const newTx: Transaction = {
      id: newId,
      workspaceId: activeWorkspaceId,
      type: showAddModal,
      category: finalCategory || 'Geral',
      description,
      amount,
      date,
      paymentMethod,
      cleared,
      createdAt: Date.now(),
    };

    try {
      await setDoc(doc(db, 'general_transactions', newId), newTx);
      setShowAddModal(null);
      setCategory('');
      setCustomCategory('');
      setDescription('');
      setAmount(0);
      setCleared(true);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `general_transactions/${newId}`);
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    if (currentRole === 'viewer') return;
    if (!confirm('Deseja realmente apagar esta transação?')) return;
    try {
      await deleteDoc(doc(db, 'general_transactions', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `general_transactions/${id}`);
    }
  };

  const toggleClearedStatus = async (tx: Transaction) => {
    if (currentRole === 'viewer') return;
    try {
      await setDoc(doc(db, 'general_transactions', tx.id), {
        ...tx,
        cleared: !tx.cleared,
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `general_transactions/${tx.id}`);
    }
  };

  // Calculations
  const incomes = transactions.filter((t) => t.type === 'income');
  const expenses = transactions.filter((t) => t.type === 'expense');

  const totalIncomesReceived = incomes.filter((t) => t.cleared).reduce((acc, t) => acc + t.amount, 0);
  const totalIncomesExpected = incomes.reduce((acc, t) => acc + t.amount, 0);

  const totalExpensesPaid = expenses.filter((t) => t.cleared).reduce((acc, t) => acc + t.amount, 0);
  const totalExpensesExpected = expenses.reduce((acc, t) => acc + t.amount, 0);

  const currentBalance = totalIncomesReceived - totalExpensesPaid;
  const expectedBalance = totalIncomesExpected - totalExpensesExpected;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Controle Financeiro</h1>
          <p className="text-gray-500 font-medium">Fluxo de caixa geral da sua liga / arena de beach tennis.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          {currentRole !== 'viewer' && (
            <>
              <button
                onClick={() => {
                  setCategory(EXPENSE_CATEGORIES[0]);
                  setShowAddModal('expense');
                }}
                className="bg-red-100 hover:bg-red-250 text-red-700 font-bold py-2.5 px-4 rounded-xl text-sm transition-all flex-1 sm:flex-none text-center"
              >
                Nova Despesa (-)
              </button>
              <button
                onClick={() => {
                  setCategory(INCOME_CATEGORIES[0]);
                  setShowAddModal('income');
                }}
                className="bg-green-500 hover:bg-green-600 text-black font-bold py-2.5 px-4 rounded-xl text-sm transition-all flex-1 sm:flex-none text-center"
              >
                Nova Receita (+)
              </button>
            </>
          )}
        </div>
      </div>

      {/* Stats Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-green-50 text-green-600 rounded-full">
              <ArrowUpRight className="w-8 h-8" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Total Receitas (Arrecadado)</p>
              <p className="text-2xl font-bold text-gray-900">R$ {totalIncomesReceived.toLocaleString('pt-BR')}</p>
              <p className="text-xs text-gray-400">Esperado: R$ {totalIncomesExpected.toLocaleString('pt-BR')}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-red-50 text-red-500 rounded-full">
              <ArrowDownRight className="w-8 h-8" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Total Despesas (Pago)</p>
              <p className="text-2xl font-bold text-gray-900">R$ {totalExpensesPaid.toLocaleString('pt-BR')}</p>
              <p className="text-xs text-gray-400">Total Previsto: R$ {totalExpensesExpected.toLocaleString('pt-BR')}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-black to-gray-900 p-6 rounded-2xl shadow-sm text-white flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-white/10 text-white rounded-full">
              <DollarSign className="w-8 h-8" />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Saldo em Caixa (Líquido)</p>
              <p className="text-3xl font-bold">R$ {currentBalance.toLocaleString('pt-BR')}</p>
              <p className="text-xs text-gray-400">A receber: R$ {(expectedBalance - currentBalance).toLocaleString('pt-BR')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Ledger */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <h2 className="font-bold text-lg text-gray-900">Extrato de Lançamentos</h2>
          <span className="text-xs bg-gray-100 px-2 py-1 rounded-full font-bold text-gray-600">
            {transactions.length} transações
          </span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-gray-400 font-medium">Carregando livro caixa...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left whitespace-nowrap">
              <thead className="bg-gray-50 text-gray-500 text-xs font-bold uppercase tracking-wider border-b border-gray-100">
                <tr>
                  <th className="p-4">Data</th>
                  <th className="p-4">Categoria</th>
                  <th className="p-4">Descrição</th>
                  <th className="p-4">Meio de Pagto</th>
                  <th className="p-4 text-center">Situação</th>
                  <th className="p-4 text-right">Valor</th>
                  {currentRole !== 'viewer' && <th className="p-4"></th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-sm">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-4 font-mono font-bold text-gray-600">
                      {format(new Date(tx.date + 'T12:00:00'), 'dd/MM/yyyy')}
                    </td>
                    <td className="p-4">
                      <span className="font-semibold text-gray-900">{tx.category}</span>
                    </td>
                    <td className="p-4 text-gray-500 truncate max-w-[200px]">{tx.description || '-'}</td>
                    <td className="p-4">
                      <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs font-bold font-mono">
                        {tx.paymentMethod}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => toggleClearedStatus(tx)}
                        disabled={currentRole === 'viewer'}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                          tx.cleared
                            ? tx.type === 'income'
                              ? 'bg-green-100 text-green-700 hover:bg-green-200'
                              : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                            : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                        }`}
                      >
                        {tx.cleared ? (tx.type === 'income' ? 'Recebido' : 'Pago') : 'Pendente'}
                      </button>
                    </td>
                    <td className={`p-4 text-right font-bold ${tx.type === 'income' ? 'text-green-600' : 'text-red-500'}`}>
                      {tx.type === 'income' ? '+' : '-'} R$ {tx.amount.toLocaleString('pt-BR')}
                    </td>
                    {currentRole !== 'viewer' && (
                      <td className="p-4 text-right">
                        <button
                          onClick={() => handleDeleteTransaction(tx.id)}
                          className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
                {transactions.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-12 text-center text-gray-400">
                      Nenhuma transação lançada ainda.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Transaction Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">
                {showAddModal === 'income' ? 'Adicionar Nova Receita (+)' : 'Adicionar Nova Despesa (-)'}
              </h2>
              <form onSubmit={handleAddTransaction} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 outline-none text-sm"
                  >
                    {showAddModal === 'income'
                      ? INCOME_CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))
                      : EXPENSE_CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                  </select>
                </div>

                {category === 'Outros' && (
                  <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Escreva a Categoria Personalizada</label>
                    <input
                      type="text"
                      required
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value)}
                      placeholder="Ex: Aluguel do Espaço Bar"
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 outline-none"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descrição do Lançamento</label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Ex: Mensalidade João de Junho"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Valor (R$)</label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={amount}
                      onChange={(e) => setAmount(Number(e.target.value))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 outline-none font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Meio de Pagto</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value as any)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 outline-none"
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
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 outline-none"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="cleared"
                    checked={cleared}
                    onChange={(e) => setCleared(e.target.checked)}
                    className="rounded border-gray-300 text-green-500 focus:ring-green-500 h-4 w-4"
                  />
                  <label htmlFor="cleared" className="text-sm font-semibold text-gray-700 cursor-pointer">
                    {showAddModal === 'income' ? 'Confirmar como já recebido' : 'Confirmar como já pago/quitado'}
                  </label>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(null)}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-black hover:bg-gray-800 text-white rounded-lg font-medium"
                  >
                    Salvar Lançamento
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
