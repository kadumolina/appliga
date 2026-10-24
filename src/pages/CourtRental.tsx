import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store/AppContext';
import { collection, query, where, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db, OperationType, handleFirestoreError } from '../lib/firebase';
import { Calendar as CalendarIcon, Clock, Plus, Trash2, Check, HelpCircle, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Rental {
  id: string;
  workspaceId: string;
  renterName: string;
  phone: string;
  court: string;
  date: string; // YYYY-MM-DD
  timeSlot: string; // "08:00 - 09:00" etc
  price: number;
  paid: boolean;
  paymentMethod: 'Pix' | 'Cartão' | 'Dinheiro' | 'Isento';
  createdAt: number;
}

const COURTS = ['Quadra 1 (Areia)', 'Quadra 2 (Areia)', 'Quadra 3 (Rápida)', 'Quadra 4 (Saibro)'];
const TIME_SLOTS = [
  '06:00 - 07:00',
  '07:00 - 08:00',
  '08:00 - 09:00',
  '09:00 - 10:00',
  '10:00 - 11:00',
  '11:00 - 12:00',
  '12:00 - 13:00',
  '13:00 - 14:00',
  '14:00 - 15:00',
  '15:00 - 16:00',
  '16:00 - 17:00',
  '17:00 - 18:00',
  '18:00 - 19:00',
  '19:00 - 20:00',
  '20:00 - 21:00',
  '21:00 - 22:00',
];

export default function CourtRental() {
  const { activeWorkspaceId, currentRole, workspaces } = useAppStore();
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedCourt, setSelectedCourt] = useState(COURTS[0]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);

  // Form State
  const [renterName, setRenterName] = useState('');
  const [phone, setPhone] = useState('');
  const [timeSlot, setTimeSlot] = useState(TIME_SLOTS[2]);
  const [price, setPrice] = useState(80);
  const [paid, setPaid] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'Pix' | 'Cartão' | 'Dinheiro' | 'Isento'>('Pix');

  const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId);
  const isModuleEnabled = activeWorkspace?.modules?.courtRental !== false; // Active by default for current logic or check master flag

  useEffect(() => {
    if (!activeWorkspaceId) return;

    setLoading(true);
    const q = query(
      collection(db, 'court_rentals'),
      where('workspaceId', '==', activeWorkspaceId)
    );

    const unsub = onSnapshot(q, (snap) => {
      const list: Rental[] = [];
      snap.forEach((d) => {
        list.push(d.data() as Rental);
      });
      setRentals(list.sort((a, b) => b.createdAt - a.createdAt));
      setLoading(false);
    }, (err) => {
      setLoading(false);
      const isPerm = (err as { code?: string })?.code === 'permission-denied' || String(err).toLowerCase().includes('permission');
      if (isPerm) {
        handleFirestoreError(err, OperationType.GET, 'court_rentals');
      } else {
        console.warn("Court rentals subscription notice (operating offline):", err);
      }
    });

    return unsub;
  }, [activeWorkspaceId]);

  if (!isModuleEnabled) {
    return (
      <div className="max-w-md mx-auto text-center py-16 px-6 bg-white rounded-3xl border border-gray-100 shadow-sm mt-8">
        <div className="w-20 h-20 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <Clock className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Aluguel de Quadras</h2>
        <p className="text-gray-600 mb-8 leading-relaxed">
          Esta funcionalidade de aluguel de quadras não está inclusa na sua assinatura atual. Entre em contato com o suporte Master para liberar o acesso.
        </p>
        <a 
          href="mailto:rankup.atendimento@gmail.com?subject=Liberar Modulo de Aluguel de Quadras"
          className="inline-block bg-black text-white hover:bg-gray-800 font-bold px-8 py-3 rounded-xl transition-all"
        >
          Falar com Suporte
        </a>
      </div>
    );
  }

  const handleAddRental = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspaceId || !renterName.trim()) return;

    // Check availability
    const isConflict = rentals.some(
      (r) => r.date === selectedDate && r.court === selectedCourt && r.timeSlot === timeSlot
    );

    if (isConflict) {
      alert('Aviso: Este horário já está reservado nesta quadra para a data selecionada!');
      return;
    }

    const newId = crypto.randomUUID();
    const newRental: Rental = {
      id: newId,
      workspaceId: activeWorkspaceId,
      renterName,
      phone,
      court: selectedCourt,
      date: selectedDate,
      timeSlot,
      price: paid && paymentMethod === 'Isento' ? 0 : price,
      paid,
      paymentMethod,
      createdAt: Date.now(),
    };

    try {
      await setDoc(doc(db, 'court_rentals', newId), newRental);
      setShowAddModal(false);
      setRenterName('');
      setPhone('');
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, `court_rentals/${newId}`);
    }
  };

  const handleDeleteRental = async (id: string) => {
    if (currentRole === 'viewer') return;
    if (!confirm('Deseja realmente excluir esta reserva de quadra?')) return;
    try {
      await deleteDoc(doc(db, 'court_rentals', id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `court_rentals/${id}`);
    }
  };

  const togglePaidStatus = async (rental: Rental) => {
    if (currentRole === 'viewer') return;
    try {
      await setDoc(doc(db, 'court_rentals', rental.id), {
        ...rental,
        paid: !rental.paid,
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `court_rentals/${rental.id}`);
    }
  };

  // Filtered rentals for the day and court
  const dailyRentals = rentals.filter((r) => r.date === selectedDate);
  const totalArrecadado = rentals.filter((r) => r.paid).reduce((acc, r) => acc + r.price, 0);
  const totalPendente = rentals.filter((r) => !r.paid).reduce((acc, r) => acc + r.price, 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Aluguel de Quadras</h1>
          <p className="text-gray-500 font-medium">Controle e agendamento de horários para atletas.</p>
        </div>
        {currentRole !== 'viewer' && (
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-green-500 hover:bg-green-600 text-black font-semibold py-2.5 px-5 rounded-xl shadow-sm transition-all flex items-center gap-2 w-full sm:w-auto justify-center"
          >
            <Plus className="w-5 h-5" />
            Nova Reserva
          </button>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-green-50 text-green-600 rounded-xl">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Total Recebido</p>
            <p className="text-xl font-bold text-gray-900">R$ {totalArrecadado.toLocaleString('pt-BR')}</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-red-50 text-red-600 rounded-xl">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Pendente</p>
            <p className="text-xl font-bold text-gray-900">R$ {totalPendente.toLocaleString('pt-BR')}</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <CalendarIcon className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Total Agendamentos</p>
            <p className="text-xl font-bold text-gray-900">{rentals.length} Horas</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Day Scheduler Grid */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <CalendarIcon className="text-green-500 w-5 h-5" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="font-bold text-lg text-gray-900 bg-transparent border-none outline-none focus:ring-0 cursor-pointer"
              />
            </div>
            <div className="flex gap-1.5 overflow-x-auto w-full sm:w-auto pb-1">
              {COURTS.map((c) => (
                <button
                  key={c}
                  onClick={() => setSelectedCourt(c)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg whitespace-nowrap transition-all ${
                    selectedCourt === c
                      ? 'bg-black text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="py-12 text-center text-gray-400">Carregando reservas...</div>
          ) : (
            <div className="space-y-2">
              {TIME_SLOTS.map((slot) => {
                const booking = dailyRentals.find((r) => r.court === selectedCourt && r.timeSlot === slot);

                return (
                  <div
                    key={slot}
                    className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                      booking
                        ? booking.paid
                          ? 'border-green-200 bg-green-50/40'
                          : 'border-yellow-200 bg-yellow-50/40'
                        : 'border-gray-100 hover:border-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Clock className="w-4.5 h-4.5 text-gray-400" />
                      <span className="font-mono text-sm font-bold text-gray-700">{slot}</span>
                    </div>

                    {booking ? (
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="font-bold text-sm text-gray-900">{booking.renterName}</p>
                          <p className="text-xs text-gray-500">{booking.phone || 'Sem celular'}</p>
                        </div>
                        <button
                          onClick={() => togglePaidStatus(booking)}
                          disabled={currentRole === 'viewer'}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                            booking.paid
                              ? 'bg-green-100 text-green-700 hover:bg-green-200'
                              : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                          }`}
                          title="Clique para alternar status do pagamento"
                        >
                          {booking.paid ? 'Pago' : 'Pendente'}
                        </button>
                        {currentRole !== 'viewer' && (
                          <button
                            onClick={() => handleDeleteRental(booking.id)}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ) : (
                      currentRole !== 'viewer' && (
                        <button
                          onClick={() => {
                            setTimeSlot(slot);
                            setShowAddModal(true);
                          }}
                          className="px-3 py-1 bg-gray-50 hover:bg-gray-100 text-gray-600 border border-gray-200 text-xs font-bold rounded-lg"
                        >
                          Reservar
                        </button>
                      )
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* List of Recent Bookings */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
          <h2 className="font-bold text-lg text-gray-900">Próximos Agendamentos</h2>
          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            {rentals.slice(0, 10).map((r) => (
              <div key={r.id} className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex flex-col gap-1.5">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-sm text-gray-900">{r.renterName}</h4>
                    <p className="text-xs text-gray-500">{r.court}</p>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      r.paid ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                    }`}
                  >
                    {r.paid ? 'PAGO' : 'EM ABERTO'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs text-gray-600 pt-1.5 border-t border-gray-100">
                  <span>
                    {format(new Date(r.date + 'T12:00:00'), 'dd/MM')} às {r.timeSlot.split(' - ')[0]}
                  </span>
                  <span className="font-bold text-gray-900">R$ {r.price}</span>
                </div>
              </div>
            ))}
            {rentals.length === 0 && (
              <p className="text-center text-sm text-gray-400 py-6">Nenhum aluguel programado.</p>
            )}
          </div>
        </div>
      </div>

      {/* Reservation Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">Novo Agendamento de Quadra</h2>
              <form onSubmit={handleAddRental} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Locatário</label>
                  <input
                    type="text"
                    required
                    value={renterName}
                    onChange={(e) => setRenterName(e.target.value)}
                    placeholder="Ex: João Silva"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Telefone / WhatsApp</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Ex: (11) 99999-9999"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Quadra</label>
                    <select
                      value={selectedCourt}
                      onChange={(e) => setSelectedCourt(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 outline-none"
                    >
                      {COURTS.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Horário</label>
                    <select
                      value={timeSlot}
                      onChange={(e) => setTimeSlot(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 outline-none font-mono"
                    >
                      {TIME_SLOTS.map((slot) => (
                        <option key={slot} value={slot}>
                          {slot}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Valor do Aluguel (R$)</label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={price}
                      onChange={(e) => setPrice(Number(e.target.value))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Forma de Pagto</label>
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

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="paid"
                    checked={paid}
                    onChange={(e) => setPaid(e.target.checked)}
                    className="rounded border-gray-300 text-green-500 focus:ring-green-500 h-4 w-4"
                  />
                  <label htmlFor="paid" className="text-sm font-semibold text-gray-700 cursor-pointer">
                    Marcar como quitado / pago agora
                  </label>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-black hover:bg-gray-800 text-white rounded-lg font-medium"
                  >
                    Confirmar Reserva
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
