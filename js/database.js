// Database operations and real-time sync
import telegramApp from './telegram.js';

class DatabaseManager {
    constructor() {
        this.listeners = new Map();
        this.currentUser = null;
        this.isInitialized = false;
    }

    async init() {
        console.log('🔄 Initializing Database Manager...');
        
        // Wait for Firebase to be available
        while (!window.Firebase) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        this.isInitialized = true;
        console.log('✅ Database Manager initialized');
    }

    // User management
    async initializeUser(telegramUser, referrerId = null) {
        if (!telegramUser) return null;

        try {
            // Check if user exists
            let user = await window.Firebase.getUser(telegramUser.id);
            
            if (!user) {
                // Create new user
                console.log('👤 Creating new user:', telegramUser.id);
                
                const userData = {
                    telegramId: telegramUser.id,
                    username: telegramUser.username,
                    firstName: telegramUser.firstName,
                    lastName: telegramUser.lastName,
                    profilePic: telegramUser.profilePic,
                    referrerId: referrerId
                };

                const created = await window.Firebase.createUser(telegramUser.id, userData);
                if (created && referrerId) {
                    // Process referral reward
                    await window.Firebase.processReferral(telegramUser.id, referrerId);
                }
                
                user = await window.Firebase.getUser(telegramUser.id);
            }

            this.currentUser = user;
            
            // Set up real-time listener for user data
            this.listenToUserUpdates(telegramUser.id);
            
            return user;

        } catch (error) {
            console.error('❌ Error initializing user:', error);
            return null;
        }
    }

    // Real-time listeners
    listenToUserUpdates(userId) {
        const path = `users/${userId}`;
        const listener = window.Firebase.onValueChange(path, (snapshot) => {
            if (snapshot.exists()) {
                const userData = snapshot.val();
                this.currentUser = userData;
                
                // Dispatch user update event
                window.dispatchEvent(new CustomEvent('userUpdated', {
                    detail: userData
                }));
                
                console.log('🔄 User data updated:', userData);
            }
        });
        
        this.listeners.set('user', listener);
    }

    listenToTasks() {
        const path = 'tasks';
        const listener = window.Firebase.onValueChange(path, (snapshot) => {
            const tasks = snapshot.exists() ? snapshot.val() : {};
            
            // Convert to array and filter active tasks
            const activeTasks = Object.entries(tasks)
                .filter(([_, task]) => task.isActive)
                .map(([id, task]) => ({ id, ...task }))
                .sort((a, b) => b.createdAt - a.createdAt);
            
            // Dispatch tasks update event
            window.dispatchEvent(new CustomEvent('tasksUpdated', {
                detail: activeTasks
            }));
            
            console.log('🔄 Tasks updated:', activeTasks.length);
        });
        
        this.listeners.set('tasks', listener);
    }

    listenToReferrals(userId) {
        // Listen for referral updates
        const path = `users/${userId}`;
        const listener = window.Firebase.onValueChange(path, (snapshot) => {
            if (snapshot.exists()) {
                const userData = snapshot.val();
                
                // Check for referral count changes
                if (this.currentUser && userData.referralCount > this.currentUser.referralCount) {
                    const newReferrals = userData.referralCount - this.currentUser.referralCount;
                    
                    // Show notification for new referrals
                    window.dispatchEvent(new CustomEvent('newReferral', {
                        detail: { count: newReferrals, userData }
                    }));
                }
                
                this.currentUser = userData;
            }
        });
        
        this.listeners.set('referrals', listener);
    }

    listenToAdminStats() {
        // Listen for admin dashboard updates
        const usersListener = window.Firebase.onValueChange('users', (snapshot) => {
            const users = snapshot.exists() ? snapshot.val() : {};
            window.dispatchEvent(new CustomEvent('adminUsersUpdated', {
                detail: users
            }));
        });

        const tasksListener = window.Firebase.onValueChange('tasks', (snapshot) => {
            const tasks = snapshot.exists() ? snapshot.val() : {};
            window.dispatchEvent(new CustomEvent('adminTasksUpdated', {
                detail: tasks
            }));
        });

        const withdrawalsListener = window.Firebase.onValueChange('withdrawals', (snapshot) => {
            const withdrawals = snapshot.exists() ? snapshot.val() : {};
            window.dispatchEvent(new CustomEvent('adminWithdrawalsUpdated', {
                detail: withdrawals
            }));
        });

        this.listeners.set('adminUsers', usersListener);
        this.listeners.set('adminTasks', tasksListener);
        this.listeners.set('adminWithdrawals', withdrawalsListener);
    }

    // Task operations
    async completeTask(taskId, userId) {
        try {
            // Mark task as completed for user
            const userTaskPath = `userTasks/${userId}/${taskId}`;
            const taskCompletion = {
                taskId,
                userId,
                status: 'completed',
                completedAt: Date.now()
            };

            await window.Firebase.writeData(userTaskPath, taskCompletion);
            
            // Get task details to award coins
            const task = await window.Firebase.readData(`tasks/${taskId}`);
            if (task) {
                const success = await window.Firebase.addCoins(userId, task.reward, `Completed task: ${task.title}`);
                if (success) {
                    telegramApp.hapticFeedback('medium');
                    return { success: true, reward: task.reward };
                }
            }

            return { success: false, message: 'Failed to award coins' };

        } catch (error) {
            console.error('❌ Error completing task:', error);
            return { success: false, message: 'Task completion failed' };
        }
    }

    async getUserTasks(userId) {
        return await window.Firebase.readData(`userTasks/${userId}`) || {};
    }

    // Farming operations
    async startFarming(userId) {
        try {
            const result = await window.Firebase.startFarming(userId);
            if (result) {
                telegramApp.hapticFeedback('light');
            }
            return result;
        } catch (error) {
            console.error('❌ Error starting farming:', error);
            return false;
        }
    }

    async claimFarming(userId) {
        try {
            const result = await window.Firebase.claimFarming(userId);
            if (result.success) {
                telegramApp.hapticFeedback('heavy');
            }
            return result;
        } catch (error) {
            console.error('❌ Error claiming farming:', error);
            return { success: false, message: 'Claim failed' };
        }
    }

    // Withdrawal operations
    async requestWithdrawal(userId, amount, upiId) {
        try {
            const result = await window.Firebase.requestWithdrawal(userId, amount, upiId);
            if (result.success) {
                telegramApp.hapticFeedback('medium');
            }
            return result;
        } catch (error) {
            console.error('❌ Error requesting withdrawal:', error);
            return { success: false, message: 'Withdrawal request failed' };
        }
    }

    // Admin operations
    async createTask(taskData) {
        try {
            const taskId = await window.Firebase.createTask(taskData);
            if (taskId) {
                telegramApp.hapticFeedback('light');
                return { success: true, taskId };
            }
            return { success: false, message: 'Failed to create task' };
        } catch (error) {
            console.error('❌ Error creating task:', error);
            return { success: false, message: 'Task creation failed' };
        }
    }

    async updateSettings(settings) {
        try {
            const result = await window.Firebase.updateSettings(settings);
            if (result) {
                telegramApp.hapticFeedback('light');
            }
            return result;
        } catch (error) {
            console.error('❌ Error updating settings:', error);
            return false;
        }
    }

    async getSettings() {
        return await window.Firebase.getSettings();
    }

    async getStats() {
        return await window.Firebase.getStats();
    }

    // Cleanup listeners
    cleanup() {
        for (const [key, listener] of this.listeners) {
            window.Firebase.offValueChange(listener);
        }
        this.listeners.clear();
    }

    // Get current user
    getCurrentUser() {
        return this.currentUser;
    }
}

// Initialize database manager
const dbManager = new DatabaseManager();

// Export globally
window.DatabaseManager = dbManager;

export default dbManager;