import React, { createContext, useContext, useState, useEffect } from 'react';
import { Player, Tournament, AppData, TournamentModality, TournamentCategory } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { collection, doc, setDoc, updateDoc, deleteDoc, onSnapshot, getDocs, writeBatch } from 'firebase/firestore';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, User } from 'firebase/auth';
import { db, auth } from '../firebase';

interface AppContextType {
  data: AppData;
  addPlayer: (player: Omit<Player, 'id' | 'createdAt'>) => void;
  updatePlayer: (id: string, updates: Partial<Player>) => void;
  deletePlayer: (id: string) => void;
  createTournament: (name: string, date: number, modality: TournamentModality, category: TournamentCategory) => string;
  updateTournament: (id: string, updates: Partial<Tournament>) => void;
  deleteTournament: (id: string) => void;
  clearData: () => void;
  currentUser: User | null;
  loadingAuth: boolean;
  signIn: () => Promise<void>;
  logOut: () => Promise<void>;
}

const defaultData: AppData = { players: [], tournaments: [] };

const AppContext = createContext<AppContextType | null>(null);

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: any;
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<AppData>(defaultData);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoadingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!currentUser) {
      setData(defaultData);
      return;
    }

    const playersRef = collection(db, 'players');
    const tournamentsRef = collection(db, 'tournaments');

    const unsubPlayers = onSnapshot(playersRef, (snapshot) => {
      const playersList = snapshot.docs
        .map(doc => doc.data() as Player)
        .filter(p => (p as any).userId === currentUser.uid);
      setData(prev => ({ ...prev, players: playersList }));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'players'));

    const unsubTournaments = onSnapshot(tournamentsRef, (snapshot) => {
      const tournList = snapshot.docs
        .map(doc => doc.data() as Tournament)
        .filter(t => (t as any).userId === currentUser.uid);
      setData(prev => ({ ...prev, tournaments: tournList }));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'tournaments'));

    return () => {
      unsubPlayers();
      unsubTournaments();
    };
  }, [currentUser]);

  const signIn = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Login error', error);
    }
  };

  const logOut = async () => {
    await signOut(auth);
  };

  const addPlayer = async (playerParams: Omit<Player, 'id' | 'createdAt'>) => {
    if (!currentUser) return;
    const newId = uuidv4();
    const newPlayer: Player = {
      ...playerParams,
      id: newId,
      createdAt: Date.now(),
    };
    (newPlayer as any).userId = currentUser.uid;
    try {
      await setDoc(doc(db, 'players', newId), newPlayer);
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, `players/${newId}`);
    }
  };

  const updatePlayer = async (id: string, updates: Partial<Player>) => {
    if (!currentUser) return;
    try {
      await updateDoc(doc(db, 'players', id), updates);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `players/${id}`);
    }
  };

  const deletePlayer = async (id: string) => {
    if (!currentUser) return;
    try {
      await deleteDoc(doc(db, 'players', id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `players/${id}`);
    }
  };

  const createTournament = (name: string, date: number, modality: TournamentModality, category: TournamentCategory) => {
    if (!currentUser) return '';
    const newId = uuidv4();
    const newTournament: Tournament = {
      id: newId,
      name,
      date,
      status: 'draft',
      modality,
      category,
      participants: [],
      groups: { A: [], B: [], C: [] },
      matches: [],
      finalRankings: {
        champion: [],
        runnerUp: [],
        thirdPlace: [],
        fourthPlace: [],
        eliminated: [],
      },
    };
    (newTournament as any).userId = currentUser.uid;
    setDoc(doc(db, 'tournaments', newId), newTournament).catch(e => {
        handleFirestoreError(e, OperationType.CREATE, `tournaments/${newId}`);
    });
    return newTournament.id;
  };

  const updateTournament = async (id: string, updates: Partial<Tournament>) => {
    if (!currentUser) return;
    try {
      await updateDoc(doc(db, 'tournaments', id), updates);
    } catch (e) {
       handleFirestoreError(e, OperationType.UPDATE, `tournaments/${id}`);
    }
  };

  const deleteTournament = async (id: string) => {
    if (!currentUser) return;
    try {
      await deleteDoc(doc(db, 'tournaments', id));
    } catch (e) {
       handleFirestoreError(e, OperationType.DELETE, `tournaments/${id}`);
    }
  };

  const clearData = () => {
    // Cannot easily delete all docs without calling a cloud function or deleting one by one
    // Leaving empty as requested or iterating
  };

  return (
    <AppContext.Provider
      value={{
        data,
        addPlayer,
        updatePlayer,
        deletePlayer,
        createTournament,
        updateTournament,
        deleteTournament,
        clearData,
        currentUser,
        loadingAuth,
        signIn,
        logOut
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppStore() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppStore must be used within AppProvider');
  }
  return context;
}

