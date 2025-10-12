/**
 * Firebase Reliable Service
 * 
 * High-level service layer that provides silent, reliable Firebase operations
 * for the Telegram WebApp. Handles all error cases gracefully without user-facing errors.
 */

import firebaseReliable from './firebaseReliable';
import { User, Task, UserTask, WithdrawalRequest, AdminSettings } from '@/types';

class FirebaseReliableService {
  private initialized = false;

  /**
   * Initialize the service
   */
  public async initialize(): Promise<void> {
    if (this.initialized) return;
    
    await firebaseReliable.initialize();
    this.initialized = true;
  }

  /**
   * User Management
   */
  public async getUser(telegramId: string | number): Promise<User | null> {
    await this.initialize();
    
    const userData = await firebaseReliable.ensureUserExists(telegramId);
    return userData ? this.mapToUser(userData) : null;
  }

  public async updateUser(telegramId: string | number, updates: Partial<User>): Promise<boolean> {
    await this.initialize();
    
    const userPath = `telegram_users/${telegramId}`;
    return await firebaseReliable.safeUpdate(userPath, updates);
  }

  public async subscribeToUser(
    telegramId: string | number, 
    callback: (user: User | null) => void
  ): Promise<() => void> {
    await this.initialize();
    
    const userPath = `telegram_users/${telegramId}`;
    
    return firebaseReliable.safeListener(
      userPath,
      (data) => {
        const user = data ? this.mapToUser(data) : null;
        callback(user);
      }
    );
  }

  /**
   * Tasks Management
   */
  public async getTasks(): Promise<Task[]> {
    await this.initialize();
    
    const tasksData = await firebaseReliable.safeRead('tasks');
    if (!tasksData) return [];
    
    return Object.values(tasksData).map(task => this.mapToTask(task));
  }

  public async getUserTasks(telegramId: string | number): Promise<UserTask[]> {
    await this.initialize();
    
    const userTasksPath = `user_tasks/${telegramId}`;
    const userTasksData = await firebaseReliable.safeRead(userTasksPath);
    
    if (!userTasksData) return [];
    
    return Object.values(userTasksData).map(userTask => this.mapToUserTask(userTask));
  }

  public async completeTask(
    telegramId: string | number, 
    taskId: string, 
    reward: number
  ): Promise<boolean> {
    await this.initialize();
    
    const userTaskPath = `user_tasks/${telegramId}/${taskId}`;
    const userPath = `telegram_users/${telegramId}`;
    
    // Update user task
    const taskUpdate = {
      taskId,
      userId: String(telegramId),
      status: 'completed',
      completedAt: new Date().toISOString(),
      reward
    };
    
    await firebaseReliable.safeWrite(userTaskPath, taskUpdate);
    
    // Update user coins
    const user = await this.getUser(telegramId);
    if (user) {
      const coinUpdate = {
        coins: (user.coins || 0) + reward,
        xp: (user.xp || 0) + Math.floor(reward / 10),
        lastTaskCompleted: new Date().toISOString()
      };
      
      return await firebaseReliable.safeUpdate(userPath, coinUpdate);
    }
    
    return false;
  }

  public async subscribeToTasks(callback: (tasks: Task[]) => void): Promise<() => void> {
    await this.initialize();
    
    return firebaseReliable.safeListener(
      'tasks',
      (data) => {
        const tasks = data ? Object.values(data).map(task => this.mapToTask(task)) : [];
        callback(tasks);
      }
    );
  }

  public async subscribeToUserTasks(
    telegramId: string | number,
    callback: (userTasks: UserTask[]) => void
  ): Promise<() => void> {
    await this.initialize();
    
    const userTasksPath = `user_tasks/${telegramId}`;
    
    return firebaseReliable.safeListener(
      userTasksPath,
      (data) => {
        const userTasks = data ? Object.values(data).map(userTask => this.mapToUserTask(userTask)) : [];
        callback(userTasks);
      }
    );
  }

  /**
   * Withdrawals Management
   */
  public async createWithdrawal(
    telegramId: string | number,
    amount: number,
    upiId: string
  ): Promise<string | null> {
    await this.initialize();
    
    const withdrawalId = `wd_${Date.now()}_${telegramId}`;
    const withdrawalPath = `withdrawals/${withdrawalId}`;
    
    const withdrawal: WithdrawalRequest = {
      id: withdrawalId,
      userId: String(telegramId),
      amount,
      upiId,
      status: 'pending',
      requestedAt: new Date(),
      processedAt: undefined,
      adminNotes: undefined
    };
    
    const success = await firebaseReliable.safeWrite(withdrawalPath, withdrawal);
    return success ? withdrawalId : null;
  }

  public async getWithdrawals(telegramId?: string | number): Promise<WithdrawalRequest[]> {
    await this.initialize();
    
    const withdrawalsData = await firebaseReliable.safeRead('withdrawals');
    if (!withdrawalsData) return [];
    
    let withdrawals = Object.values(withdrawalsData).map(wd => this.mapToWithdrawal(wd));
    
    if (telegramId) {
      withdrawals = withdrawals.filter(wd => wd.userId === String(telegramId));
    }
    
    return withdrawals.sort((a, b) => 
      new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()
    );
  }

  public async updateWithdrawalStatus(
    withdrawalId: string,
    status: 'approved' | 'rejected',
    adminNotes?: string,
    transactionId?: string
  ): Promise<boolean> {
    await this.initialize();
    
    const withdrawalPath = `withdrawals/${withdrawalId}`;
    const updates = {
      status,
      processedAt: new Date().toISOString(),
      adminNotes: adminNotes || null,
      transactionId: transactionId || null
    };
    
    return await firebaseReliable.safeUpdate(withdrawalPath, updates);
  }

  /**
   * Admin Settings Management
   */
  public async getAdminSettings(): Promise<AdminSettings | null> {
    await this.initialize();
    
    const settings = await firebaseReliable.safeRead('config/admin_settings');
    return settings ? this.mapToAdminSettings(settings) : null;
  }

  public async updateAdminSettings(settings: Partial<AdminSettings>): Promise<boolean> {
    await this.initialize();
    
    const updates = {
      ...settings,
      updatedAt: new Date().toISOString()
    };
    
    return await firebaseReliable.safeUpdate('config/admin_settings', updates);
  }

  /**
   * Statistics
   */
  public async getDailyStats(): Promise<any> {
    await this.initialize();
    
    const today = new Date().toISOString().split('T')[0];
    const statsPath = `stats/daily/${today}`;
    
    const stats = await firebaseReliable.safeRead(statsPath);
    return stats || {
      date: today,
      activeUsers: 0,
      newUsers: 0,
      tasksCompleted: 0,
      withdrawalsRequested: 0,
      totalCoinsEarned: 0
    };
  }

  /**
   * Referral System
   */
  public async processReferral(
    referrerId: string | number,
    newUserId: string | number,
    bonus: number = 100
  ): Promise<boolean> {
    await this.initialize();
    
    const referrerPath = `telegram_users/${referrerId}`;
    const referralPath = `referrals/${referrerId}/${newUserId}`;
    
    // Add referral record
    const referralData = {
      referrerId: String(referrerId),
      referredId: String(newUserId),
      bonus,
      createdAt: new Date().toISOString(),
      status: 'completed'
    };
    
    await firebaseReliable.safeWrite(referralPath, referralData);
    
    // Update referrer coins
    const referrer = await this.getUser(referrerId);
    if (referrer) {
      const updates = {
        coins: (referrer.coins || 0) + bonus,
        referralCount: (referrer.referralCount || 0) + 1,
        lastReferralAt: new Date().toISOString()
      };
      
      return await firebaseReliable.safeUpdate(referrerPath, updates);
    }
    
    return false;
  }

  /**
   * Connection Status
   */
  public getConnectionStatus(): any {
    return firebaseReliable.getConnectionStatus();
  }

  /**
   * Cleanup
   */
  public cleanup(): void {
    firebaseReliable.cleanup();
  }

  /**
   * Data Mapping Helpers
   */
  private mapToUser(data: any): User {
    return {
      id: data.id || data.telegramId,
      telegramId: data.telegramId || data.id,
      username: data.username || '',
      firstName: data.firstName || data.first_name || 'User',
      lastName: data.lastName || data.last_name || '',
      photoUrl: data.photoUrl || data.photo_url || '',
      languageCode: data.languageCode || data.language_code || 'en',
      isPremium: data.isPremium || data.is_premium || false,
      coins: data.coins || 0,
      xp: data.xp || 0,
      level: data.level || 1,
      vipTier: data.vipTier || 'free',
      farmingMultiplier: data.farmingMultiplier || 1,
      referralMultiplier: data.referralMultiplier || 1,
      adsLimitPerDay: data.adsLimitPerDay || 10,
      withdrawalLimit: data.withdrawalLimit || 10000,
      minWithdrawal: data.minWithdrawal || 200,
      referralCount: data.referralCount || 0,
      referralEarnings: data.referralEarnings || 0,
      dailyStreak: data.dailyStreak || 0,
      createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
      updatedAt: data.updatedAt ? new Date(data.updatedAt) : new Date()
    };
  }

  private mapToTask(data: any): Task {
    return {
      id: data.id,
      title: data.title || 'Task',
      description: data.description || '',
      reward: data.reward || 0,
      type: data.type || 'daily',
      isActive: data.isActive !== false,
      createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
      updatedAt: data.updatedAt ? new Date(data.updatedAt) : new Date()
    };
  }

  private mapToUserTask(data: any): UserTask {
    return {
      id: data.id || `${data.userId}_${data.taskId}`,
      userId: data.userId,
      taskId: data.taskId,
      status: data.status || 'pending',
      completedAt: data.completedAt ? new Date(data.completedAt) : undefined
    };
  }

  private mapToWithdrawal(data: any): WithdrawalRequest {
    return {
      id: data.id,
      userId: data.userId,
      amount: data.amount || 0,
      upiId: data.upiId || '',
      status: data.status || 'pending',
      requestedAt: data.requestedAt ? new Date(data.requestedAt) : new Date(),
      processedAt: data.processedAt ? new Date(data.processedAt) : undefined,
      adminNotes: data.adminNotes || undefined
    };
  }

  private mapToAdminSettings(data: any): AdminSettings {
    return {
      inrExchangeRate: data.inrExchangeRate || 100,
      baseAdReward: data.baseAdReward || 10,
      vipTiers: data.vipTiers || {
        vip1: {
          tier: 'vip1',
          price: 100,
          farmingMultiplier: 2,
          referralMultiplier: 1.5,
          adsLimitPerDay: 20,
          withdrawalLimit: 20000,
          minWithdrawal: 100,
          duration: 30
        },
        vip2: {
          tier: 'vip2',
          price: 250,
          farmingMultiplier: 3,
          referralMultiplier: 2,
          adsLimitPerDay: 50,
          withdrawalLimit: 50000,
          minWithdrawal: 50,
          duration: 30
        }
      },
      secretKey: data.secretKey || 'admin123',
      updatedAt: data.updatedAt ? new Date(data.updatedAt) : undefined
    };
  }
}

// Singleton instance
export const firebaseReliableService = new FirebaseReliableService();

// Auto-initialize
if (typeof window !== 'undefined') {
  firebaseReliableService.initialize();
}

export default firebaseReliableService;