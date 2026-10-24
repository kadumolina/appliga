import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store/AppContext';
import { collection, query, where, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db, OperationType, handleFirestoreError } from '../lib/firebase';
import { Calendar as CalendarIcon, Clock, Plus, Trash2, Check, Users, Dumbbell, Shield, Award, Edit3 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Student {
  id: string;
  workspaceId: string;
  name: string;
  phone: string;
  level: 'Iniciante' | 'Intermediário' | 'Avançado';
  packageType: 'Pacote 4 Aulas' | 'Pacote 8 Aulas' | 'Mensal 1x' | 'Mensal 2x' | 'Avulso';
  classesRemaining: number;
  createdAt: number;
}

interface ClassSlot {
  id: string;
  workspaceId: string;
  date: string; // YYYY-MM-DD
  time: string; // "08:00 - 09:00" etc
  coach: string;
  level: string; // Level target
  maxStudents: number;
  studentIds: string[]; // List of registered student IDs
  createdAt: number;
}

const COACHES = ['Prof. Cadu Molina', 'Prof. Thiago', 'Profa. Julia', 'Prof. Rafael'];
const LEVELS = ['Iniciante', 'Intermediário', 'Avançado', 'Infantil', 'Geral'];
const PACKAGES = ['Pacote 4 Aulas', 'Pacote 8 Aulas', 'Mensal 1x', 'Mensal 2x', 'Avulso'];
const TIME_SLOTS = [
  '07:00 - 08:00',
  '08:00 - 09:00',
  '09:00 - 10:00',
  '10:00 - 11:00',
  '11:00 - 12:00',
  '14:00 - 15:00',
  '15:00 - 16:00',
  '16:00 - 17:00',
  '17:00 - 18:00',
  '18:00 - 19:00',
  '19:00 - 20:00',
  '20:00 - 21:00',
];

export default function ClassSchedule() {
  const { activeWorkspaceId, currentRole, workspaces } = useAppStore();
  const [students, setStudents] = useState<Student[]>([]);
  const [classSlots, setClassSlots] = useState<ClassSlot[]>([]);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  // Modals
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [showClassModal, setShowClassModal] = useState(false);
  const [showBookModal, setShowBookModal] = useState<ClassSlot | null>(null);

  // Student Form State
  const [studentName, setStudentName] = useState('');
  const [studentPhone, setStudentPhone] = useState('');
  const [studentLevel, setStudentLevel] = useState<'Iniciante' | 'Intermediário' | 'Avançado'>('Iniciante');
  const [studentPackage, setStudentPackage] = useState<any>('Pacote 4 Aulas');
  const [classesRemaining, setClassesRemaining] = useState(4);

  // Class Slot Form State
  const [classTime, setClassTime] = useState(TIME_SLOTS[0]);
  const [classCoach, setClassCoach] = useState(COACHES[0]);
  const [classLevel, setClassLevel] = useState(LEVELS[0]);
  const [maxStudents, setMaxStudents] = useState(6);

  const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId);
  const isModuleEnabled = activeWorkspace?.modules?.classSchedule !== false;

  // Sync Students
  useEffect(() => {
    if (!activeWorkspaceId) return;

    const q = query(collection(db, 'students'), where('workspaceId', '==', activeWorkspaceId));
    const unsub = onSnapshot(q, (snap) => {
      const list: Student[] = [];
      snap.forEach((d) => list.push(d.data() as Student));
      setStudents(list.sort((a, b) => a.name.localeCompare(b.name)));
    }, (error) => {
      const isPerm = (error as { code?: string })?.code === 'permission-denied' || String(error).toLowerCase().includes('permission');
      if (isPerm) {
        handleFirestoreError(error, OperationType.GET, 'students');
      } else {
        console.warn("Students subscription notice (operating offline):", error);
      }
    });
    return unsub;
  }, [activeWorkspaceId]);

  // Sync Class Slots
  useEffect(() => {
    if (!activeWorkspaceId) return;

    const q = query(collection(db, 'class_slots'), where('workspaceId', '==', activeWorkspaceId));
    const unsub = onSnapshot(q, (snap) => {
      const list: ClassSlot[] = [];
      snap.forEach((d) => list.push(d.data() as ClassSlot));
      setClassSlots(list.sort((a, b) => a.time.localeCompare(b.time)));
    }, (error) => {
      const isPerm = (error as { code?: string })?.code === 'permission-denied' || String(error).toLowerCase().includes('permission');
      if (isPerm) {
        handleFirestoreError(error, OperationType.GET, 'class_slots');
      } else {
        console.warn("Class slots subscription notice (operating offline):", error);
      }
    });
    return unsub;
  }, [activeWorkspaceId]);

  if (!isModuleEnabled) {
    return (
      <div className="max-w-md mx-auto text-center py-16 px-6 bg-white rounded-3xl border border-gray-100 shadow-sm mt-8">
        <div className="w-20 h-20 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <Dumbbell className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Grade de Aulas</h2>
        <p className="text-gray-600 mb-8 leading-relaxed">
          Esta funcionalidade de agenda e gestão de alunos não está inclusa na sua assinatura atual. Entre em contato com o suporte Master para liberar o acesso.
        </p>
        <a 
          href="mailto:rankup.atendimento@gmail.com?subject=Liberar Modulo de Grade de Aulas"
          className="inline-block bg-black text-white hover:bg-gray-800 font-bold px-8 py-3 rounded-xl transition-all"
        >
          Falar com Suporte
        </a>
      </div>
    );
  }

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspaceId || !studentName.trim()) return;

    const newId = crypto.randomUUID();
    const newStudent: Student = {
      id: newId,
      workspaceId: activeWorkspaceId,
      name: studentName,
      phone: studentPhone,
      level: studentLevel,
      packageType: studentPackage,
      classesRemaining,
      createdAt: Date.now(),
    };

    try {
      await setDoc(doc(db, 'students', newId), newStudent);
      setShowStudentModal(false);
      setStudentName('');
      setStudentPhone('');
      setClassesRemaining(4);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `students/${newId}`);
    }
  };

  const handleCreateClassSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspaceId) return;

    const isConflict = classSlots.some(
      (c) => c.date === selectedDate && c.time === classTime && c.coach === classCoach
    );

    if (isConflict) {
      alert('Este professor já possui aula agendada neste mesmo horário!');
      return;
    }

    const newId = crypto.randomUUID();
    const newSlot: ClassSlot = {
      id: newId,
      workspaceId: activeWorkspaceId,
      date: selectedDate,
      time: classTime,
      coach: classCoach,
      level: classLevel,
      maxStudents,
      studentIds: [],
      createdAt: Date.now(),
    };

    try {
      await setDoc(doc(db, 'class_slots', newId), newSlot);
      setShowClassModal(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `class_slots/${newId}`);
    }
  };

  const handleBookStudent = async (studentId: string, slot: ClassSlot) => {
    if (slot.studentIds.includes(studentId)) {
      alert('Este aluno já está inscrito nesta aula.');
      return;
    }

    if (slot.studentIds.length >= slot.maxStudents) {
      alert('Aula lotada!');
      return;
    }

    const student = students.find((s) => s.id === studentId);
    if (student && student.classesRemaining <= 0) {
      if (!confirm('Este aluno não possui mais aulas restantes no seu pacote. Deseja inscrevê-lo mesmo assim?')) {
        return;
      }
    }

    const updatedIds = [...slot.studentIds, studentId];

    try {
      // Add to slot
      await setDoc(doc(db, 'class_slots', slot.id), {
        ...slot,
        studentIds: updatedIds,
      });

      // Deduct class from student package
      if (student && student.classesRemaining > 0) {
        await setDoc(doc(db, 'students', student.id), {
          ...student,
          classesRemaining: student.classesRemaining - 1,
        });
      }

      setShowBookModal(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `class_slots/${slot.id}`);
    }
  };

  const handleRemoveStudentFromClass = async (studentId: string, slot: ClassSlot) => {
    if (currentRole === 'viewer') return;
    const updatedIds = slot.studentIds.filter((id) => id !== studentId);

    try {
      await setDoc(doc(db, 'class_slots', slot.id), {
        ...slot,
        studentIds: updatedIds,
      });

      // Refund class to student package
      const student = students.find((s) => s.id === studentId);
      if (student) {
        await setDoc(doc(db, 'students', student.id), {
          ...student,
          classesRemaining: student.classesRemaining + 1,
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `class_slots/${slot.id}`);
    }
  };

  const handleDeleteClassSlot = async (id: string) => {
    if (currentRole === 'viewer') return;
    if (!confirm('Deseja cancelar esta aula da grade?')) return;
    try {
      await deleteDoc(doc(db, 'class_slots', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `class_slots/${id}`);
    }
  };

  const handleDeleteStudent = async (id: string) => {
    if (currentRole === 'viewer') return;
    if (!confirm('Deseja remover este aluno do sistema?')) return;
    try {
      await deleteDoc(doc(db, 'students', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `students/${id}`);
    }
  };

  // Daily filter
  const dailySlots = classSlots.filter((c) => c.date === selectedDate);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Grade de Aulas</h1>
          <p className="text-gray-500 font-medium">Gestão de horários de treinos, professores e agendamento de alunos.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          {currentRole !== 'viewer' && (
            <>
              <button
                onClick={() => setShowStudentModal(true)}
                className="bg-gray-200 hover:bg-gray-300 text-black font-semibold py-2.5 px-4 rounded-xl shadow-sm transition-all text-sm flex-1 sm:flex-none text-center"
              >
                Cadastrar Aluno
              </button>
              <button
                onClick={() => setShowClassModal(true)}
                className="bg-green-500 hover:bg-green-600 text-black font-semibold py-2.5 px-4 rounded-xl shadow-sm transition-all text-sm flex-1 sm:flex-none text-center"
              >
                Criar Aula
              </button>
            </>
          )}
        </div>
      </div>

      {/* Grid containing Schedule and Student Database */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Daily Schedule Column */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-2">
              <CalendarIcon className="text-green-500 w-5 h-5" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="font-bold text-lg text-gray-900 bg-transparent border-none outline-none focus:ring-0 cursor-pointer"
              />
            </div>
            <span className="text-sm text-gray-500 font-medium">
              {dailySlots.length} Aula{dailySlots.length !== 1 ? 's' : ''} agendada{dailySlots.length !== 1 ? 's' : ''} para hoje
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {dailySlots.map((slot) => (
              <div
                key={slot.id}
                className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-all relative group"
              >
                {currentRole !== 'viewer' && (
                  <button
                    onClick={() => handleDeleteClassSlot(slot.id)}
                    className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-red-500 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Excluir aula"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}

                <div>
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-1.5 text-green-600">
                      <Clock className="w-4.5 h-4.5" />
                      <span className="font-mono font-bold text-sm">{slot.time}</span>
                    </div>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-bold uppercase">
                      {slot.level}
                    </span>
                  </div>

                  <h3 className="font-bold text-gray-900 text-base">{slot.coach}</h3>
                  <p className="text-xs text-gray-500 mb-4">
                    Capacidade: {slot.studentIds.length} / {slot.maxStudents} Alunos
                  </p>

                  {/* Registered Students List */}
                  {slot.studentIds.length > 0 && (
                    <div className="space-y-1.5 border-t border-gray-50 pt-3">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                        Alunos Confirmados
                      </p>
                      <div className="flex flex-col gap-1 max-h-24 overflow-y-auto">
                        {slot.studentIds.map((sid) => {
                          const student = students.find((s) => s.id === sid);
                          return (
                            <div key={sid} className="flex justify-between items-center text-xs bg-gray-50 px-2 py-1 rounded">
                              <span className="font-medium text-gray-800 truncate pr-2">
                                {student?.name || 'Desconhecido'}
                              </span>
                              {currentRole !== 'viewer' && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveStudentFromClass(sid, slot)}
                                  className="text-[10px] text-red-500 hover:underline"
                                >
                                  Remover
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100">
                  {slot.studentIds.length >= slot.maxStudents ? (
                    <span className="block w-full text-center bg-red-50 text-red-600 text-xs font-bold py-2 rounded-lg">
                      Lotação Esgotada
                    </span>
                  ) : (
                    currentRole !== 'viewer' && (
                      <button
                        onClick={() => setShowBookModal(slot)}
                        className="w-full bg-black hover:bg-gray-800 text-white font-bold py-2 rounded-lg text-xs transition-colors"
                      >
                        Inscrever Aluno
                      </button>
                    )
                  )}
                </div>
              </div>
            ))}

            {dailySlots.length === 0 && (
              <div className="col-span-full py-16 text-center text-gray-400 bg-white rounded-2xl border border-dashed border-gray-200">
                Nenhuma aula programada para {format(new Date(selectedDate + 'T12:00:00'), 'dd/MM')}.
              </div>
            )}
          </div>
        </div>

        {/* Students Database Column */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4 h-fit">
          <div className="flex justify-between items-center">
            <h2 className="font-bold text-lg text-gray-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-gray-400" />
              Alunos Cadastrados
            </h2>
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">
              {students.length} Total
            </span>
          </div>

          <div className="space-y-3 max-h-[550px] overflow-y-auto pr-1">
            {students.map((student) => (
              <div key={student.id} className="p-3 bg-gray-50 rounded-xl border border-gray-100 relative group">
                {currentRole !== 'viewer' && (
                  <button
                    onClick={() => handleDeleteStudent(student.id)}
                    className="absolute top-3 right-3 p-1 text-gray-400 hover:text-red-500 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Remover Aluno"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}

                <h4 className="font-bold text-sm text-gray-900">{student.name}</h4>
                <p className="text-xs text-gray-500 mb-2">{student.phone || 'Sem contato'}</p>

                <div className="flex justify-between items-center gap-2 text-[10px] font-bold">
                  <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-600 uppercase">
                    {student.level}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-white ${
                      student.classesRemaining > 0 ? 'bg-green-600' : 'bg-red-500'
                    }`}
                  >
                    {student.packageType} ({student.classesRemaining} rest.)
                  </span>
                </div>
              </div>
            ))}
            {students.length === 0 && (
              <p className="text-center text-sm text-gray-400 py-6">Nenhum aluno registrado.</p>
            )}
          </div>
        </div>
      </div>

      {/* Book Student Modal */}
      {showBookModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden p-6 space-y-4">
            <h3 className="text-lg font-bold">Inscrever Aluno na Aula</h3>
            <p className="text-xs text-gray-500 font-medium">
              Selecione o atleta para colocar no horário das {showBookModal.time} com {showBookModal.coach}
            </p>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {students.map((s) => (
                <button
                  key={s.id}
                  onClick={() => handleBookStudent(s.id, showBookModal)}
                  className="w-full text-left p-2.5 hover:bg-gray-50 border border-gray-100 rounded-lg flex justify-between items-center text-sm transition-colors"
                >
                  <span className="font-bold">{s.name}</span>
                  <span className="text-xs text-gray-500">({s.classesRemaining} aulas no pacote)</span>
                </button>
              ))}
              {students.length === 0 && (
                <p className="text-center text-sm text-gray-400 py-4">Nenhum aluno cadastrado no sistema.</p>
              )}
            </div>

            <div className="flex justify-end pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setShowBookModal(null)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Student Modal */}
      {showStudentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">Novo Cadastro de Aluno</h2>
              <form onSubmit={handleAddStudent} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Aluno</label>
                  <input
                    type="text"
                    required
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    placeholder="Ex: Amanda Lima"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp / Telefone</label>
                  <input
                    type="tel"
                    value={studentPhone}
                    onChange={(e) => setStudentPhone(e.target.value)}
                    placeholder="Ex: (11) 98888-8888"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nível de Jogo</label>
                    <select
                      value={studentLevel}
                      onChange={(e) => setStudentLevel(e.target.value as any)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 outline-none text-sm"
                    >
                      {LEVELS.filter((l) => l !== 'Geral').map((lvl) => (
                        <option key={lvl} value={lvl}>
                          {lvl}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Plano / Pacote</label>
                    <select
                      value={studentPackage}
                      onChange={(e) => {
                        const val = e.target.value;
                        setStudentPackage(val as any);
                        if (val === 'Pacote 4 Aulas') setClassesRemaining(4);
                        else if (val === 'Pacote 8 Aulas') setClassesRemaining(8);
                        else if (val === 'Mensal 1x') setClassesRemaining(4);
                        else if (val === 'Mensal 2x') setClassesRemaining(8);
                        else setClassesRemaining(1);
                      }}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 outline-none text-sm"
                    >
                      {PACKAGES.map((pkg) => (
                        <option key={pkg} value={pkg}>
                          {pkg}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Aulas Restantes neste Ciclo / Pacote
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={classesRemaining}
                    onChange={(e) => setClassesRemaining(Number(e.target.value))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 outline-none"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setShowStudentModal(false)}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-black hover:bg-gray-800 text-white rounded-lg font-medium"
                  >
                    Salvar Aluno
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Add Class Modal */}
      {showClassModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">Nova Aula na Grade</h2>
              <form onSubmit={handleCreateClassSlot} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Horário da Aula</label>
                  <select
                    value={classTime}
                    onChange={(e) => setClassTime(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 outline-none font-mono"
                  >
                    {TIME_SLOTS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Professor Responsável</label>
                  <select
                    value={classCoach}
                    onChange={(e) => setClassCoach(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 outline-none"
                  >
                    {COACHES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nível Alvo</label>
                    <select
                      value={classLevel}
                      onChange={(e) => setClassLevel(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 outline-none"
                    >
                      {LEVELS.map((l) => (
                        <option key={l} value={l}>
                          {l}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Vagas Máximas</label>
                    <input
                      type="number"
                      min={1}
                      max={12}
                      value={maxStudents}
                      onChange={(e) => setMaxStudents(Number(e.target.value))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setShowClassModal(false)}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-black hover:bg-gray-800 text-white rounded-lg font-medium"
                  >
                    Criar Aula
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
