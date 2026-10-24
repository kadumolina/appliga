import React, { createContext, useContext, useState, useEffect } from 'react';
import { Player, Tournament, AppData, TournamentModality, TournamentCategory, WorkspaceAccess, Invite, Role } from '../types';
import { auth, db, OperationType, handleFirestoreError } from '../lib/firebase';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, User } from 'firebase/auth';
import { collection, query, where, onSnapshot, doc, setDoc, getDoc, updateDoc, deleteDoc, getDocs } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';

interface AppContextType {
  currentUser: User | null;
  isAdmin: boolean;
  activeWorkspaceId: string | null;
  workspaces: WorkspaceAccess[];
  invites: Invite[];
  sentInvites: Invite[];
  data: AppData;
  loading: boolean;
  currentRole: Role | 'admin';
  signIn: () => void;
  logOut: () => void;
  switchWorkspace: (workspaceId: string) => void;
  inviteUser: (email: string, name: string, role: Role) => Promise<void>;
  cancelInvite: (id: string) => Promise<void>;
  updateUserRole: (uid: string, role: Role) => Promise<void>;
  removeUserFromWorkspace: (uid: string) => Promise<void>;
  deleteUserFromSystem: (uid: string) => Promise<void>;
  toggleWorkspaceStatus: (workspaceId: string, currentStatus: string | undefined) => Promise<void>;
  toggleWorkspaceModule: (workspaceId: string, moduleKey: 'tournaments' | 'courtRental' | 'classSchedule' | 'finance', currentVal: boolean) => Promise<void>;
  acceptInvite: (invite: Invite) => Promise<void>;
  addPlayer: (player: Omit<Player, 'id' | 'createdAt' | 'userId'>) => Promise<void>;
  updatePlayer: (id: string, updates: Partial<Player>) => Promise<void>;
  deletePlayer: (id: string) => Promise<void>;
  createTournament: (name: string, date: number, modality: TournamentModality, category: TournamentCategory, points1: number, points2: number, points3: number, isPaid?: boolean, registrationFee?: number, isRanked?: boolean) => Promise<string>;
  updateTournament: (id: string, updates: Partial<Tournament>) => Promise<void>;
  deleteTournament: (id: string) => Promise<void>;
  setViewingTournamentId: (id: string | null) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);
  const [workspaces, setWorkspaces] = useState<WorkspaceAccess[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [sentInvites, setSentInvites] = useState<Invite[]>([]);
  
  const [data, setData] = useState<AppData>({ players: [], tournaments: [] });

  const [viewingTournamentId, setViewingTournamentId] = useState<string | null>(() => {
    const path = window.location.pathname;
    const match = path.match(/^\/tournaments\/([a-zA-Z0-9_\-]+)$/);
    return match ? match[1] : null;
  });
  const [publicTournament, setPublicTournament] = useState<Tournament | null>(null);
  const [publicPlayers, setPublicPlayers] = useState<Player[]>([]);
  const [loadingPublic, setLoadingPublic] = useState(false);
  const [publicTournamentNotFound, setPublicTournamentNotFound] = useState(false);

  useEffect(() => {
    if (!viewingTournamentId) {
      setPublicTournament(null);
      setPublicPlayers([]);
      setLoadingPublic(false);
      setPublicTournamentNotFound(false);
      return;
    }

    setLoadingPublic(true);
    setPublicTournamentNotFound(false);

    const unsubTournament = onSnapshot(doc(db, 'tournaments', viewingTournamentId), (docSnap) => {
      if (docSnap.exists()) {
        const tournamentData = docSnap.data() as Tournament;
        setPublicTournament(tournamentData);
        setPublicTournamentNotFound(false);
        setLoadingPublic(false);

        const playersQuery = query(collection(db, 'players'), where('userId', '==', tournamentData.userId));
        const unsubPlayers = onSnapshot(playersQuery, (playersSnap) => {
          const playersList: Player[] = [];
          playersSnap.forEach((playerDoc) => {
            playersList.push(playerDoc.data() as Player);
          });
          setPublicPlayers(playersList);
        }, (err) => {
          const isPerm = (err as { code?: string })?.code === 'permission-denied' || String(err).toLowerCase().includes('permission');
          if (isPerm) {
            handleFirestoreError(err, OperationType.GET, 'players');
          } else {
            console.warn("Public players subscription notice (operating offline):", err);
          }
        });

        return () => {
          unsubPlayers();
        };
      } else {
        setPublicTournament(null);
        setPublicPlayers([]);
        setPublicTournamentNotFound(true);
        setLoadingPublic(false);
      }
    }, (err) => {
      setLoadingPublic(false);
      const isPerm = (err as { code?: string })?.code === 'permission-denied' || String(err).toLowerCase().includes('permission');
      if (isPerm) {
        handleFirestoreError(err, OperationType.GET, 'tournaments/' + viewingTournamentId);
      } else {
        console.warn("Public tournament subscription notice (operating offline):", err);
      }
    });

    return () => {
      unsubTournament();
    };
  }, [viewingTournamentId]);

  useEffect(() => {
    // Safety timeout: if loading is still true after 6 seconds, force it to false to allow offline use
    const timer = setTimeout(() => {
      setLoading(false);
    }, 6000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        // check if admin
        try {
          const adminDoc = await getDoc(doc(db, 'admins', user.uid));
          setIsAdmin(adminDoc.exists() || user.email === 'cadumolina@gmail.com' || user.email === 'kadumolina@gmail.com');
        } catch (e) {
          if (e instanceof Error && e.message.includes('permission')) {
            handleFirestoreError(e, OperationType.GET, `admins/${user.uid}`);
          }
          setIsAdmin(user.email === 'cadumolina@gmail.com' || user.email === 'kadumolina@gmail.com');
        }
        
        // Ensure user has their own workspace
        try {
          const wsRef = doc(db, 'workspace_access', user.uid);
          const wsDoc = await getDoc(wsRef);
          if (!wsDoc.exists()) {
            await setDoc(wsRef, {
              id: user.uid,
              ownerId: user.uid,
              ownerEmail: user.email || '',
              members: [user.uid],
              roles: { [user.uid]: 'owner' }
            });
          }
        } catch (wsError) {
          if (wsError instanceof Error && wsError.message.includes('permission')) {
            handleFirestoreError(wsError, OperationType.GET, `workspace_access/${user.uid}`);
          }
          console.warn("Workspace access check/creation failed (possibly offline):", wsError);
        }
        
        setActiveWorkspaceId(user.uid);
      } else {
        setIsAdmin(false);
        setActiveWorkspaceId(null);
        setWorkspaces([]);
        setInvites([]);
        setData({ players: [], tournaments: [] });
        setLoading(false);
      }
    });
    return unsub;
  }, []);

  // Listen to workspaces the user has access to
  useEffect(() => {
    if (!currentUser) return;
    
    const wsRef = collection(db, 'workspace_access');
    const q = isAdmin 
      ? query(wsRef) 
      : query(wsRef, where('members', 'array-contains', currentUser.uid));

    const unsub = onSnapshot(q, (snap) => {
      const ws: WorkspaceAccess[] = [];
      snap.forEach(d => ws.push(d.data() as WorkspaceAccess));
      setWorkspaces(ws);
    }, (error) => {
      const isPerm = (error as { code?: string })?.code === 'permission-denied' || String(error).toLowerCase().includes('permission');
      if (isPerm) {
        handleFirestoreError(error, OperationType.GET, 'workspace_access');
      } else {
        console.warn("Workspaces subscription connection notice (operating offline):", error);
      }
    });
    return unsub;
  }, [currentUser, isAdmin]);

  // Listen to invites received
  useEffect(() => {
    if (!currentUser || !currentUser.email) return;
    const q = query(collection(db, 'invites'), where('email', '==', currentUser.email.toLowerCase()), where('status', '==', 'pending'));
    const unsub = onSnapshot(q, (snap) => {
      const inv: Invite[] = [];
      snap.forEach(d => inv.push({ id: d.id, ...d.data() } as Invite));
      setInvites(inv);
    }, (error) => {
      const isPerm = (error as { code?: string })?.code === 'permission-denied' || String(error).toLowerCase().includes('permission');
      if (isPerm) {
        handleFirestoreError(error, OperationType.GET, 'invites');
      } else {
        console.warn("Invites subscription connection notice (operating offline):", error);
      }
    });
    return unsub;
  }, [currentUser]);

  // Listen to sent invites of the active workspace
  useEffect(() => {
    if (!activeWorkspaceId) {
      setSentInvites([]);
      return;
    }
    const q = query(
      collection(db, 'invites'),
      where('workspaceId', '==', activeWorkspaceId),
      where('status', '==', 'pending')
    );
    const unsub = onSnapshot(q, (snap) => {
      const invs: Invite[] = [];
      snap.forEach(d => invs.push({ id: d.id, ...d.data() } as Invite));
      setSentInvites(invs);
    }, (error) => {
      const isPerm = (error as { code?: string })?.code === 'permission-denied' || String(error).toLowerCase().includes('permission');
      if (isPerm) {
        handleFirestoreError(error, OperationType.GET, 'invites');
      } else {
        console.warn("Sent invites subscription connection notice (operating offline):", error);
      }
    });
    return unsub;
  }, [activeWorkspaceId]);

  // Listen to active workspace data
  useEffect(() => {
    if (!activeWorkspaceId) {
      setData({ players: [], tournaments: [] });
      setLoading(currentUser === null ? false : true);
      return;
    }

    const unsubPlayers = onSnapshot(
      query(collection(db, 'players'), where('userId', '==', activeWorkspaceId)),
      (snap) => {
        const p: Player[] = [];
        snap.forEach(d => p.push(d.data() as Player));
        setData(prev => ({ ...prev, players: p }));
        setLoading(false);
      },
      (error) => {
        setLoading(false);
        const isPerm = (error as { code?: string })?.code === 'permission-denied' || String(error).toLowerCase().includes('permission');
        if (isPerm) {
          handleFirestoreError(error, OperationType.GET, 'players');
        } else {
          console.warn("Players subscription connection notice (operating offline):", error);
        }
      }
    );

    const unsubTournaments = onSnapshot(
      query(collection(db, 'tournaments'), where('userId', '==', activeWorkspaceId)),
      (snap) => {
        const t: Tournament[] = [];
        snap.forEach(d => t.push(d.data() as Tournament));
        setData(prev => ({ ...prev, tournaments: t }));
        setLoading(false);
      },
      (error) => {
        setLoading(false);
        const isPerm = (error as { code?: string })?.code === 'permission-denied' || String(error).toLowerCase().includes('permission');
        if (isPerm) {
          handleFirestoreError(error, OperationType.GET, 'tournaments');
        } else {
          console.warn("Tournaments subscription connection notice (operating offline):", error);
        }
      }
    );

    return () => {
      unsubPlayers();
      unsubTournaments();
    };
  }, [activeWorkspaceId, currentUser]);

  const mergedData = React.useMemo(() => {
    let players = [...data.players];
    let tournaments = [...data.tournaments];
    
    if (publicTournament) {
      if (!tournaments.some(t => t.id === publicTournament.id)) {
        tournaments.push(publicTournament);
      } else {
        tournaments = tournaments.map(t => t.id === publicTournament.id ? publicTournament : t);
      }
    }
    
    if (publicPlayers.length > 0) {
      publicPlayers.forEach(p => {
        if (!players.some(ep => ep.id === p.id)) {
          players.push(p);
        } else {
          players = players.map(ep => ep.id === p.id ? p : ep);
        }
      });
    }
    
    return { players, tournaments };
  }, [data, publicTournament, publicPlayers]);

  const currentRole = React.useMemo(() => {
    if (isAdmin) return 'admin';
    const targetWorkspaceId = publicTournament?.userId || activeWorkspaceId;
    if (!currentUser || !targetWorkspaceId) return 'viewer';
    if (targetWorkspaceId === currentUser.uid) return 'owner';
    const ws = workspaces.find(w => w.id === targetWorkspaceId);
    return ws?.roles[currentUser.uid] || 'viewer';
  }, [currentUser, activeWorkspaceId, workspaces, isAdmin, publicTournament]);

  const finalLoading = viewingTournamentId 
    ? (loadingPublic || (!publicTournament && !publicTournamentNotFound)) 
    : loading;

  const signIn = () => {
    signInWithPopup(auth, new GoogleAuthProvider());
  };

  const logOut = () => {
    signOut(auth);
  };

  const switchWorkspace = (wsId: string) => {
    setActiveWorkspaceId(wsId);
  };

  const inviteUser = async (email: string, name: string, role: Role) => {
    if (!activeWorkspaceId || !currentUser) return;
    const ws = workspaces.find(w => w.id === activeWorkspaceId);
    if (!ws) return;
    
    try {
      const inviteRef = doc(collection(db, 'invites'));
      await setDoc(inviteRef, {
        email: email.trim().toLowerCase(),
        name,
        workspaceId: activeWorkspaceId,
        workspaceOwnerEmail: ws.ownerEmail,
        role,
        status: 'pending',
        createdAt: Date.now()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'invites');
    }
  };

  const cancelInvite = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'invites', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `invites/${id}`);
    }
  };

  const updateUserRole = async (uid: string, role: Role) => {
    if (!activeWorkspaceId || !currentUser) return;
    const ws = workspaces.find(w => w.id === activeWorkspaceId);
    if (!ws || (ws.ownerId !== currentUser.uid && !isAdmin)) return;
    
    try {
      const wsRef = doc(db, 'workspace_access', activeWorkspaceId);
      await updateDoc(wsRef, {
        [`roles.${uid}`]: role
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `workspace_access/${activeWorkspaceId}`);
    }
  };

  const removeUserFromWorkspace = async (uid: string) => {
    if (!activeWorkspaceId || !currentUser) return;
    const ws = workspaces.find(w => w.id === activeWorkspaceId);
    if (!ws || (ws.ownerId !== currentUser.uid && !isAdmin)) return;
    
    try {
      const wsRef = doc(db, 'workspace_access', activeWorkspaceId);
      const newMembers = ws.members.filter(m => m !== uid);
      const newRoles = { ...ws.roles };
      delete newRoles[uid];
      
      const newDetails = { ...ws.memberDetails };
      delete newDetails[uid];
      
      await updateDoc(wsRef, {
        members: newMembers,
        roles: newRoles,
        memberDetails: newDetails
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `workspace_access/${activeWorkspaceId}`);
    }
  };

  const deleteUserFromSystem = async (uid: string) => {
    if (!isAdmin) return;
    try {
      // Find all workspaces where this user is a member or owner
      const targetWorkspaces = workspaces.filter(ws => ws.ownerId === uid || ws.members.includes(uid));
      
      for (const ws of targetWorkspaces) {
        if (ws.ownerId === uid) {
          // If they are owner, delete the entire workspace
          await deleteDoc(doc(db, 'workspace_access', ws.id));
          
          // Delete its players
          const playersSnapshot = await getDocs(query(collection(db, 'players'), where('userId', '==', ws.id)));
          for (const pDoc of playersSnapshot.docs) {
            await deleteDoc(pDoc.ref);
          }
          
          // Delete its tournaments
          const tournamentsSnapshot = await getDocs(query(collection(db, 'tournaments'), where('userId', '==', ws.id)));
          for (const tDoc of tournamentsSnapshot.docs) {
            await deleteDoc(tDoc.ref);
          }
        } else {
          // Standard member: remove from workspace
          const wsRef = doc(db, 'workspace_access', ws.id);
          const newMembers = ws.members.filter(m => m !== uid);
          const newRoles = { ...ws.roles };
          delete newRoles[uid];
          
          const newDetails = { ...ws.memberDetails };
          delete newDetails[uid];
          
          await updateDoc(wsRef, {
            members: newMembers,
            roles: newRoles,
            memberDetails: newDetails
          });
        }
      }
      
      // Also delete any invites to/from this user's email
      const userEmail = workspaces.find(w => w.memberDetails?.[uid]?.email)?.memberDetails?.[uid]?.email 
        || workspaces.find(w => w.ownerId === uid)?.ownerEmail;
        
      if (userEmail) {
        const invitesSnapshot = await getDocs(query(collection(db, 'invites'), where('email', '==', userEmail.toLowerCase())));
        for (const iDoc of invitesSnapshot.docs) {
          await deleteDoc(iDoc.ref);
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${uid}`);
    }
  };

  const toggleWorkspaceStatus = async (workspaceId: string, currentStatus: string | undefined) => {
    if (!isAdmin) return;
    try {
      const wsRef = doc(db, 'workspace_access', workspaceId);
      await updateDoc(wsRef, {
        status: currentStatus === 'inactive' ? 'active' : 'inactive'
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `workspace_access/${workspaceId}`);
    }
  };

  const toggleWorkspaceModule = async (
    workspaceId: string,
    moduleKey: 'tournaments' | 'courtRental' | 'classSchedule' | 'finance',
    currentVal: boolean
  ) => {
    if (!isAdmin) return;
    try {
      const wsRef = doc(db, 'workspace_access', workspaceId);
      await updateDoc(wsRef, {
        [`modules.${moduleKey}`]: !currentVal
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `workspace_access/${workspaceId}`);
    }
  };

  const acceptInvite = async (invite: Invite) => {
    if (!currentUser) return;
    try {
      const wsRef = doc(db, 'workspace_access', invite.workspaceId);
      const wsDoc = await getDoc(wsRef);
      if (wsDoc.exists()) {
        const wsData = wsDoc.data() as WorkspaceAccess;
        await updateDoc(wsRef, {
          members: [...new Set([...wsData.members, currentUser.uid])],
          [`roles.${currentUser.uid}`]: invite.role,
          [`memberDetails.${currentUser.uid}`]: { email: currentUser.email, name: invite.name || currentUser.displayName || '' }
        });
      }
      await updateDoc(doc(db, 'invites', invite.id), { status: 'accepted' });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `workspace_access/${invite.workspaceId}`);
    }
  };

  const addPlayer = async (playerParams: Omit<Player, 'id' | 'createdAt' | 'userId'>) => {
    if (!activeWorkspaceId) return;
    const newPlayer: Player = {
      ...playerParams,
      id: uuidv4(),
      userId: activeWorkspaceId,
      createdAt: Date.now(),
    };
    try {
      await setDoc(doc(db, 'players', newPlayer.id), newPlayer);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `players/${newPlayer.id}`);
    }
  };

  const updatePlayer = async (id: string, updates: Partial<Player>) => {
    try {
      await updateDoc(doc(db, 'players', id), updates);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `players/${id}`);
    }
  };

  const deletePlayer = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'players', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `players/${id}`);
    }
  };

  const createTournament = async (name: string, date: number, modality: TournamentModality, category: TournamentCategory, points1: number, points2: number, points3: number, isPaid = false, registrationFee = 0, isRanked = true) => {
    if (!activeWorkspaceId) throw new Error("No active workspace");
    const newTournament: Tournament = {
      id: uuidv4(),
      userId: activeWorkspaceId,
      name,
      date,
      status: 'draft',
      modality,
      category,
      points1,
      points2,
      points3,
      participants: [],
      courts: 2,
      groups: { A: [], B: [], C: [] },
      matches: [],
      finalRankings: {
        champion: [],
        runnerUp: [],
        thirdPlace: [],
        fourthPlace: [],
        eliminated: [],
      },
      isPaid,
      isRanked,
      registrationFee,
      payments: {},
      expenses: []
    };
    try {
      await setDoc(doc(db, 'tournaments', newTournament.id), newTournament);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `tournaments/${newTournament.id}`);
    }
    return newTournament.id;
  };

  const updateTournament = async (id: string, updates: Partial<Tournament>) => {
    const cleanUndefined = (obj: any): any => {
      if (obj === null || obj === undefined) {
        return null;
      }
      if (Array.isArray(obj)) {
        return obj.map(cleanUndefined);
      }
      if (typeof obj === 'object') {
        const newObj: any = {};
        for (const key of Object.keys(obj)) {
          const val = obj[key];
          if (val !== undefined) {
            newObj[key] = cleanUndefined(val);
          }
        }
        return newObj;
      }
      return obj;
    };
    try {
      await updateDoc(doc(db, 'tournaments', id), cleanUndefined(updates));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `tournaments/${id}`);
    }
  };

  const deleteTournament = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'tournaments', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `tournaments/${id}`);
    }
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        isAdmin,
        activeWorkspaceId,
        workspaces,
        invites,
        sentInvites,
        data: mergedData,
        loading: finalLoading,
        currentRole,
        signIn,
        logOut,
        switchWorkspace,
        inviteUser,
        cancelInvite,
        updateUserRole,
        removeUserFromWorkspace,
        deleteUserFromSystem,
        toggleWorkspaceStatus,
        toggleWorkspaceModule,
        acceptInvite,
        addPlayer,
        updatePlayer,
        deletePlayer,
        createTournament,
        updateTournament,
        deleteTournament,
        setViewingTournamentId,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppStore() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppStore must be used within an AppProvider');
  }
  return context;
}
