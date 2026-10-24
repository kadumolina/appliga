export interface GameMode {
  id: string;
  title: string;
  icon: string; // Emoji
  description: string;
  status: 'active' | 'upcoming';
  modalTitle: string;
  modalSubtitle: string;
  rules: string[];
  idealFor: string[];
  registeredStats?: string[];
}

export const GAME_MODES: GameMode[] = [
  {
    id: 'individual',
    title: 'LIGA INDIVIDUAL',
    icon: '👤',
    description: 'Cada atleta troca de parceiros durante o campeonato e disputa um ranking individual.',
    status: 'active',
    modalTitle: 'LIGA INDIVIDUAL',
    modalSubtitle: 'Este é o formato ideal para ligas recorrentes.',
    rules: [
      'Os atletas são distribuídos automaticamente em grupos.',
      'Dentro de cada grupo, todos jogam entre si em partidas de dupla.',
      'Durante a fase classificatória, cada atleta joga com parceiros diferentes.',
      'Os pontos pertencem ao atleta, nunca à dupla.',
      'O sistema calcula automaticamente vitórias, games vencidos, saldo de games e classificação individual.',
      'Ao final da fase classificatória, os melhores atletas avançam para as semifinais conforme as regras configuradas da competição.'
    ],
    idealFor: ['Beach Tennis', 'Futevôlei', 'Padel', 'Vôlei de Praia', 'Ligas semanais', 'Ranking permanente']
  },
  {
    id: 'duplas_fixas',
    title: 'DUPLAS FIXAS',
    icon: '👥',
    description: 'A mesma dupla permanece unida durante todo o campeonato.',
    status: 'active',
    modalTitle: 'DUPLAS FIXAS',
    modalSubtitle: 'O formato clássico dos torneios.',
    rules: [
      'Os atletas se inscrevem formando uma dupla.',
      'Essa dupla permanece junta do início ao fim da competição.',
      'Toda a classificação pertence à dupla.',
      'O sistema organiza automaticamente grupos, confrontos, classificação, mata-mata e campeão.'
    ],
    idealFor: ['Torneios oficiais', 'Campeonatos tradicionais', 'Eventos patrocinados', 'Clubes']
  },
  {
    id: 'mistas_aleatorias',
    title: 'DUPLAS SORTEADAS',
    icon: '🎲',
    description: 'Novas duplas são sorteadas automaticamente antes de cada rodada.',
    status: 'active',
    modalTitle: 'DUPLAS SORTEADAS',
    modalSubtitle: 'Um formato divertido e muito utilizado em festivais e eventos de integração.',
    rules: [
      'Antes de cada rodada, o sistema sorteia novas duplas automaticamente.',
      'Sempre que possível, o algoritmo evita repetir parceiros.',
      'O objetivo é proporcionar equilíbrio e interação entre todos os participantes.'
    ],
    idealFor: ['Festivais', 'Clínicas', 'Eventos sociais', 'Integração entre atletas']
  },
  {
    id: 'rei_da_quadra',
    title: 'REI DA QUADRA',
    icon: '🏆',
    description: 'Quem vence permanece na quadra. Quem perde sai e dá lugar aos próximos desafiantes.',
    status: 'active',
    modalTitle: 'REI DA QUADRA',
    modalSubtitle: 'Formato dinâmico e extremamente competitivo.',
    rules: [
      'O campeonato inicia com uma dupla em cada quadra.',
      'A dupla vencedora permanece na quadra.',
      'A dupla derrotada deixa a quadra.',
      'A próxima dupla da fila entra automaticamente para desafiar os atuais campeões da quadra.',
      'O sistema controla automaticamente a ordem de entrada das duplas.',
      'Ao final do tempo determinado pelo organizador, vence quem acumular o melhor desempenho.'
    ],
    registeredStats: [
      'Jogos disputados',
      'Vitórias',
      'Derrotas',
      'Sequência máxima de vitórias',
      'Tempo como Rei da Quadra'
    ],
    idealFor: ['Aulas', 'Eventos rápidos', 'Festivais', 'Clínicas', 'Integração']
  },
  {
    id: 'mata_mata',
    title: 'MATA-MATA',
    icon: '🥇',
    description: 'Perdeu, está eliminado. Vence quem sobreviver até a final.',
    status: 'active',
    modalTitle: 'MATA-MATA',
    modalSubtitle: 'O formato clássico das eliminatórias.',
    rules: [
      'Os participantes são distribuídos automaticamente no chaveamento.',
      'Cada confronto elimina uma dupla ou atleta.',
      'O vencedor avança para a próxima fase.',
      'O sistema gera automaticamente oitavas, quartas, semifinais e final conforme a quantidade de participantes.',
      'Opcionalmente pode haver disputa pelo terceiro lugar.'
    ],
    idealFor: ['Torneios rápidos', 'Eventos oficiais', 'Competições eliminatórias', 'Campeonatos patrocinados']
  }
];
