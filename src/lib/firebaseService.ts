import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  increment,
  serverTimestamp,
  addDoc,
  onSnapshot,
} from 'firebase/firestore';
import {
  ref,
  set,
  get,
  update,
  onValue,
  off,
  push,
  remove,
} from 'firebase/database';
import { db, realtimeDb } from './firebase';
import { User, Task, UserTask, WithdrawalRequest, AdminSettings, DailyStats } from '@/types';
import { VIP_TIERS, DEFAULT_SETTINGS } from './constants';

// Real-time listeners
const listeners = new Map<string, () => void>();

// Real-time user data listener
export const subscribeToUser = (userId: string, callback: (user: User | null) => void): (() => void) => {
  const userRef = doc(db, 'users', userId);
  
  const unsubscribe = onSnapshot(userRef, (doc) => {
    if (doc.exists()) {
      const userData = doc.data();
      const user: User = {
        ...userData,
        id: doc.id,
        createdAt: userData.createdAt?.toDate ? userData.createdAt.toDate() : new Date(userData.createdAt),
        updatedAt: userData.updatedAt?.toDate ? userData.updatedAt.toDate() : new Date(userData.updatedAt),
        lastClaimDate: userData.lastClaimDate?.toDate ? userData.lastClaimDate.toDate() : userData.lastClaimDate ? new Date(userData.lastClaimDate) : undefined,
        farmingStartTime: userData.farmingStartTime?.toDate ? userData.farmingStartTime.toDate() : userData.farmingStartTime ? new Date(userData.farmingStartTime) : undefined,
        farmingEndTime: userData.farmingEndTime?.toDate ? userData.farmingEndTime.toDate() : userData.farmingEndTime ? new Date(userData.farmingEndTime) : undefined,
        vipEndTime: userData.vipEndTime?.toDate ? userData.vipEndTime.toDate() : userData.vipEndTime ? new Date(userData.vipEndTime) : undefined,
      } as User;
      callback(user);
    } else {
      callback(null);
    }
  }, (error) => {
    console.error('Error listening to user:', error);
    callback(null);
  });

  const listenerId = `user_${userId}`;
  listeners.set(listenerId, unsubscribe);
  
  return unsubscribe;
};

// Real-time tasks listener
export const subscribeToTasks = (callback: (tasks: Task[]) => void): (() => void) => {
  const tasksRef = collection(db, 'tasks');
  const q = query(tasksRef, where('isActive', '==', true), orderBy('createdAt', 'desc'));
  
  const unsubscribe = onSnapshot(q, (snapshot) => {
    const tasks: Task[] = [];
    snapshot.forEach((doc) => {
      const taskData = doc.data();
      tasks.push({
        ...taskData,
        id: doc.id,
        createdAt: taskData.createdAt?.toDate ? taskData.createdAt.toDate() : new Date(taskData.createdAt),
        updatedAt: taskData.updatedAt?.toDate ? taskData.updatedAt.toDate() : new Date(taskData.updatedAt),
      } as Task);
    });
    callback(tasks);
  }, (error) => {
    console.error('Error listening to tasks:', error);
    callback([]);
  });

  listeners.set('tasks', unsubscribe);
  return unsubscribe;
};

// Real-time admin settings listener
export const subscribeToAdminSettings = (callback: (settings: AdminSettings) => void): (() => void) => {
  const settingsRef = doc(db, 'admin', 'settings');
  
  const unsubscribe = onSnapshot(settingsRef, (doc) => {
    if (doc.exists()) {
      const settingsData = doc.data();
      const adminSettings = {
        ...(settingsData as any),
        updatedAt: settingsData.updatedAt?.toDate ? settingsData.updatedAt.toDate() : new Date(settingsData.updatedAt),
      } as AdminSettings;
      callback(adminSettings);
    } else {
      // Create default settings if they don't exist
      const defaultSettings: AdminSettings = {
        ...DEFAULT_SETTINGS,
        updatedAt: new Date(),
      };
      setDoc(settingsRef, defaultSettings);
      callback(defaultSettings);
    }
  }, (error) => {
    console.error('Error listening to admin settings:', error);
    callback(DEFAULT_SETTINGS);
  });

  listeners.set('admin_settings', unsubscribe);
  return unsubscribe;
};

// Real-time user tasks listener
export const subscribeToUserTasks = (userId: string, callback: (userTasks: UserTask[]) => void): (() => void) => {
  const userTasksRef = collection(db, 'userTasks');
  const q = query(userTasksRef, where('userId', '==', userId));
  
  const unsubscribe = onSnapshot(q, (snapshot) => {
    const userTasks: UserTask[] = [];
    snapshot.forEach((doc) => {
      const taskData = doc.data();
      userTasks.push({
        ...taskData,
        id: doc.id,
        completedAt: taskData.completedAt?.toDate ? taskData.completedAt.toDate() : taskData.completedAt ? new Date(taskData.completedAt) : undefined,
        claimedAt: taskData.claimedAt?.toDate ? taskData.claimedAt.toDate() : taskData.claimedAt ? new Date(taskData.claimedAt) : undefined,
      } as UserTask);
    });
    callback(userTasks);
  }, (error) => {
    console.error('Error listening to user tasks:', error);
    callback([]);
  });

  const listenerId = `user_tasks_${userId}`;
  listeners.set(listenerId, unsubscribe);
  return unsubscribe;
};

// Cleanup function to remove all listeners
export const cleanupListeners = () => {
  listeners.forEach((unsubscribe) => {
    unsubscribe();
  });
  listeners.clear();
};

// Initialize user document with default values if it doesn't exist
export const initializeUser = async (userId: string): Promise<User> => {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      console.log('Creating new user document for:', userId);
      const defaultUserData: User = {
        id: userId,
        telegramId: userId,
        username: undefined,
        firstName: 'User',
        lastName: '',
        profilePic: undefined,
        coins: 0,
        xp: 0,
        level: 1,
        vipTier: 'free',
        farmingMultiplier: VIP_TIERS.free.farmingMultiplier,
        referralMultiplier: VIP_TIERS.free.referralMultiplier,
        adsLimitPerDay: VIP_TIERS.free.adsLimitPerDay,
        withdrawalLimit: VIP_TIERS.free.withdrawalLimit,
        minWithdrawal: VIP_TIERS.free.minWithdrawal,
        referralCount: 0,
        referralEarnings: 0,
        dailyStreak: 0,
        farmingStartTime: undefined,
        farmingEndTime: undefined,
        lastClaimDate: undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      await setDoc(userRef, defaultUserData);
      return defaultUserData;
    } else {
      const userData = userDoc.data();
      return {
        ...userData,
        id: userDoc.id,
        createdAt: userData.createdAt?.toDate ? userData.createdAt.toDate() : new Date(userData.createdAt),
        updatedAt: userData.updatedAt?.toDate ? userData.updatedAt.toDate() : new Date(userData.updatedAt),
        lastClaimDate: userData.lastClaimDate?.toDate ? userData.lastClaimDate.toDate() : userData.lastClaimDate ? new Date(userData.lastClaimDate) : undefined,
        farmingStartTime: userData.farmingStartTime?.toDate ? userData.farmingStartTime.toDate() : userData.farmingStartTime ? new Date(userData.farmingStartTime) : undefined,
        farmingEndTime: userData.farmingEndTime?.toDate ? userData.farmingEndTime.toDate() : userData.farmingEndTime ? new Date(userData.farmingEndTime) : undefined,
        vipEndTime: userData.vipEndTime?.toDate ? userData.vipEndTime.toDate() : userData.vipEndTime ? new Date(userData.vipEndTime) : undefined,
      } as User;
    }
  } catch (error) {
    console.error('Error initializing user:', error);
    throw error;
  }
};

// Safe update function that creates document if it doesn't exist
export const safeUpdateUser = async (userId: string, updateData: Partial<User>): Promise<User> => {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      // Create document with default values + update data
      const defaultData: User = {
        id: userId,
        telegramId: userId,
        username: undefined,
        firstName: 'User',
        lastName: '',
        profilePic: undefined,
        coins: 0,
        xp: 0,
        level: 1,
        vipTier: 'free',
        farmingMultiplier: VIP_TIERS.free.farmingMultiplier,
        referralMultiplier: VIP_TIERS.free.referralMultiplier,
        adsLimitPerDay: VIP_TIERS.free.adsLimitPerDay,
        withdrawalLimit: VIP_TIERS.free.withdrawalLimit,
        minWithdrawal: VIP_TIERS.free.minWithdrawal,
        referralCount: 0,
        referralEarnings: 0,
        dailyStreak: 0,
        farmingStartTime: undefined,
        farmingEndTime: undefined,
        lastClaimDate: undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...updateData
      };
      
      await setDoc(userRef, defaultData);
      return defaultData;
    } else {
      // Update existing document
      const updatedData = {
        ...updateData,
        updatedAt: new Date()
      };
      
      await updateDoc(userRef, updatedData);
      const updatedDoc = await getDoc(userRef);
      return { id: updatedDoc.id, ...updatedDoc.data() } as User;
    }
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
};

// User operations
export const createUser = async (userData: Partial<User>): Promise<void> => {
  const userRef = doc(db, 'users', userData.telegramId!);
  const userDoc = await getDoc(userRef);
  
  if (!userDoc.exists()) {
    const newUser: User = {
      id: userData.telegramId!,
      telegramId: userData.telegramId!,
      username: userData.username,
      firstName: userData.firstName,
      lastName: userData.lastName,
      profilePic: userData.profilePic,
      coins: 0,
      xp: 0,
      level: 1,
      vipTier: 'free',
      farmingMultiplier: VIP_TIERS.free.farmingMultiplier,
      referralMultiplier: VIP_TIERS.free.referralMultiplier,
      adsLimitPerDay: VIP_TIERS.free.adsLimitPerDay,
      withdrawalLimit: VIP_TIERS.free.withdrawalLimit,
      minWithdrawal: VIP_TIERS.free.minWithdrawal,
      referralCount: 0,
      referralEarnings: 0,
      referrerId: userData.referrerId,
      dailyStreak: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    await setDoc(userRef, newUser);
    
    // If user has a referrer, update referrer's count
    if (userData.referrerId) {
      const referrerRef = doc(db, 'users', userData.referrerId);
      await updateDoc(referrerRef, {
        referralCount: increment(1),
        updatedAt: serverTimestamp(),
      });
    }
  }
};

export const getUser = async (telegramId: string): Promise<User | null> => {
  try {
    const userRef = doc(db, 'users', telegramId);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      
      // Convert Firestore timestamps to Date objects
      const convertedData = {
        ...userData,
        id: userDoc.id,
        createdAt: userData.createdAt?.toDate ? userData.createdAt.toDate() : new Date(userData.createdAt),
        updatedAt: userData.updatedAt?.toDate ? userData.updatedAt.toDate() : new Date(userData.updatedAt),
        lastClaimDate: userData.lastClaimDate?.toDate ? userData.lastClaimDate.toDate() : userData.lastClaimDate ? new Date(userData.lastClaimDate) : undefined,
        farmingStartTime: userData.farmingStartTime?.toDate ? userData.farmingStartTime.toDate() : userData.farmingStartTime ? new Date(userData.farmingStartTime) : undefined,
        farmingEndTime: userData.farmingEndTime?.toDate ? userData.farmingEndTime.toDate() : userData.farmingEndTime ? new Date(userData.farmingEndTime) : undefined,
        vipEndTime: userData.vipEndTime?.toDate ? userData.vipEndTime.toDate() : userData.vipEndTime ? new Date(userData.vipEndTime) : undefined,
      } as User;
      
      return convertedData;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting user:', error);
    return null;
  }
};

export const updateUser = async (telegramId: string, updates: Partial<User>): Promise<void> => {
  const userRef = doc(db, 'users', telegramId);
  await updateDoc(userRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
};

// VIP subscription
export const activateSubscription = async (
  userId: string,
  tier: 'vip1' | 'vip2',
  durationDays: number
): Promise<void> => {
  const vipTier = VIP_TIERS[tier];
  const endTime = new Date();
  endTime.setDate(endTime.getDate() + durationDays);
  
  await updateUser(userId, {
    vipTier: tier,
    vipEndTime: endTime,
    farmingMultiplier: vipTier.farmingMultiplier,
    referralMultiplier: vipTier.referralMultiplier,
    adsLimitPerDay: vipTier.adsLimitPerDay,
    withdrawalLimit: vipTier.withdrawalLimit,
    minWithdrawal: vipTier.minWithdrawal,
  });
};

// Task operations
export const getTasks = async (): Promise<Task[]> => {
  try {
    const tasksRef = collection(db, 'tasks');
    const q = query(tasksRef, where('isActive', '==', true), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt),
      } as Task;
    });
  } catch (error) {
    console.error('Error getting tasks:', error);
    return [];
  }
};

export const createTask = async (taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> => {
  const tasksRef = collection(db, 'tasks');
  await addDoc(tasksRef, {
    ...taskData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
};

export const getUserTasks = async (userId: string): Promise<UserTask[]> => {
  try {
    const userTasksRef = collection(db, 'userTasks');
    const q = query(userTasksRef, where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        completedAt: data.completedAt?.toDate ? data.completedAt.toDate() : data.completedAt ? new Date(data.completedAt) : undefined,
        claimedAt: data.claimedAt?.toDate ? data.claimedAt.toDate() : data.claimedAt ? new Date(data.claimedAt) : undefined,
      } as UserTask;
    });
  } catch (error) {
    console.error('Error getting user tasks:', error);
    return [];
  }
};

export const completeTask = async (userId: string, taskId: string): Promise<void> => {
  const userTasksRef = collection(db, 'userTasks');
  await addDoc(userTasksRef, {
    userId,
    taskId,
    status: 'completed',
    completedAt: serverTimestamp(),
  });
};

export const claimTask = async (userId: string, taskId: string, reward: number): Promise<void> => {
  // Update user task status
  const userTasksRef = collection(db, 'userTasks');
  const q = query(userTasksRef, where('userId', '==', userId), where('taskId', '==', taskId));
  const querySnapshot = await getDocs(q);
  
  if (!querySnapshot.empty) {
    const userTaskDoc = querySnapshot.docs[0];
    await updateDoc(userTaskDoc.ref, {
      status: 'claimed',
      claimedAt: serverTimestamp(),
    });
  }
  
  // Add coins to user
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, {
    coins: increment(reward),
    xp: increment(reward / 10),
    updatedAt: serverTimestamp(),
  });
};

// Withdrawal operations
export const createWithdrawalRequest = async (
  userId: string,
  amount: number,
  upiId: string
): Promise<void> => {
  const withdrawalsRef = collection(db, 'withdrawals');
  await addDoc(withdrawalsRef, {
    userId,
    amount,
    upiId,
    status: 'pending',
    requestedAt: serverTimestamp(),
  });
};

export const getWithdrawalRequests = async (): Promise<WithdrawalRequest[]> => {
  const withdrawalsRef = collection(db, 'withdrawals');
  const q = query(withdrawalsRef, orderBy('requestedAt', 'desc'));
  const querySnapshot = await getDocs(q);
  
  return querySnapshot.docs.map(doc => ({
    ...doc.data(),
    id: doc.id,
  })) as WithdrawalRequest[];
};

export const updateWithdrawalStatus = async (
  withdrawalId: string,
  status: 'approved' | 'rejected' | 'paid',
  adminNotes?: string
): Promise<void> => {
  const withdrawalRef = doc(db, 'withdrawals', withdrawalId);
  await updateDoc(withdrawalRef, {
    status,
    adminNotes,
    processedAt: serverTimestamp(),
  });
};

// Admin operations
export const getAdminSettings = async (): Promise<AdminSettings> => {
  const settingsRef = doc(db, 'settings', 'admin');
  const settingsDoc = await getDoc(settingsRef);
  
  if (settingsDoc.exists()) {
    return settingsDoc.data() as AdminSettings;
  }
  
  // Create default settings if they don't exist
  await setDoc(settingsRef, DEFAULT_SETTINGS);
  return DEFAULT_SETTINGS;
};

export const updateAdminSettings = async (settings: Partial<AdminSettings>): Promise<void> => {
  const settingsRef = doc(db, 'settings', 'admin');
  await updateDoc(settingsRef, settings);
};

export const getDailyStats = async (): Promise<DailyStats> => {
  const usersRef = collection(db, 'users');
  const withdrawalsRef = collection(db, 'withdrawals');
  
  // Get total users
  const usersSnapshot = await getDocs(usersRef);
  const totalUsers = usersSnapshot.size;
  
  // Get active VIP users
  const vipQuery = query(usersRef, where('vipTier', 'in', ['vip1', 'vip2']));
  const vipSnapshot = await getDocs(vipQuery);
  const activeVipUsers = vipSnapshot.size;
  
  // Calculate total coins distributed
  let totalCoinsDistributed = 0;
  usersSnapshot.docs.forEach(doc => {
    const user = doc.data() as User;
    totalCoinsDistributed += user.coins;
  });
  
  // Get pending withdrawals
  const pendingQuery = query(withdrawalsRef, where('status', '==', 'pending'));
  const pendingSnapshot = await getDocs(pendingQuery);
  const pendingWithdrawals = pendingSnapshot.size;
  
  // Calculate total INR generated (approximate based on VIP purchases)
  const totalInrGenerated = activeVipUsers * 75; // Simplified calculation
  
  return {
    totalUsers,
    activeVipUsers,
    totalCoinsDistributed,
    totalInrGenerated,
    pendingWithdrawals,
  };
};