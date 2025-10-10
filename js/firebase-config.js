// Firebase Configuration
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getDatabase, ref, set, get, push, onValue, off, serverTimestamp, runTransaction } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';

// Firebase config from environment or defaults
const firebaseConfig = {
    apiKey: "AIzaSyA_cKKrwrqNyb0xl28IbHAnaJa3ChOdsZU",
    authDomain: "telegram-bot-2be45.firebaseapp.com",
    databaseURL: "https://telegram-bot-2be45-default-rtdb.firebaseio.com",
    projectId: "telegram-bot-2be45",
    storageBucket: "telegram-bot-2be45.firebasestorage.app",
    messagingSenderId: "947875567907",
    appId: "1:947875567907:web:ea7b37b36643872e199496"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

console.log('✅ Firebase initialized successfully');

// Export Firebase services
window.firebaseApp = app;
window.database = database;
window.firebaseUtils = {
    ref,
    set,
    get,
    push,
    onValue,
    off,
    serverTimestamp,
    runTransaction
};

// Global Firebase utilities
window.Firebase = {
    // Database operations
    async writeData(path, data) {
        try {
            await set(ref(database, path), data);
            console.log(`✅ Data written to ${path}`);
            return true;
        } catch (error) {
            console.error(`❌ Error writing to ${path}:`, error);
            return false;
        }
    },

    async readData(path) {
        try {
            const snapshot = await get(ref(database, path));
            return snapshot.exists() ? snapshot.val() : null;
        } catch (error) {
            console.error(`❌ Error reading from ${path}:`, error);
            return null;
        }
    },

    async pushData(path, data) {
        try {
            const newRef = push(ref(database, path), data);
            console.log(`✅ Data pushed to ${path} with key: ${newRef.key}`);
            return newRef.key;
        } catch (error) {
            console.error(`❌ Error pushing to ${path}:`, error);
            return null;
        }
    },

    // Real-time listeners
    onValueChange(path, callback) {
        const dataRef = ref(database, path);
        onValue(dataRef, callback);
        return dataRef;
    },

    offValueChange(dataRef) {
        off(dataRef);
    },

    // User operations
    async createUser(userId, userData) {
        const userPath = `users/${userId}`;
        const defaultUserData = {
            telegramId: userId,
            username: userData.username || '',
            firstName: userData.firstName || '',
            lastName: userData.lastName || '',
            profilePic: userData.profilePic || '',
            coins: 0,
            xp: 0,
            level: 1,
            vipTier: 'free',
            farmingMultiplier: 1,
            referralMultiplier: 1,
            referralCount: 0,
            referralEarnings: 0,
            referrerId: userData.referrerId || null,
            dailyStreak: 0,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            ...userData
        };

        return await this.writeData(userPath, defaultUserData);
    },

    async getUser(userId) {
        return await this.readData(`users/${userId}`);
    },

    async updateUser(userId, updates) {
        const userPath = `users/${userId}`;
        const currentData = await this.getUser(userId);
        if (currentData) {
            const updatedData = { 
                ...currentData, 
                ...updates, 
                updatedAt: serverTimestamp() 
            };
            return await this.writeData(userPath, updatedData);
        }
        return false;
    },

    async addCoins(userId, amount, reason = 'Unknown') {
        return new Promise((resolve) => {
            runTransaction(ref(database, `users/${userId}/coins`), (currentCoins) => {
                return (currentCoins || 0) + amount;
            }).then(() => {
                // Log the transaction
                this.logActivity(userId, 'coins_added', { amount, reason });
                console.log(`✅ Added ${amount} coins to user ${userId} for: ${reason}`);
                resolve(true);
            }).catch((error) => {
                console.error('❌ Error adding coins:', error);
                resolve(false);
            });
        });
    },

    // Task operations
    async createTask(taskData) {
        const taskPath = 'tasks';
        const task = {
            title: taskData.title,
            description: taskData.description || '',
            reward: taskData.reward,
            type: taskData.type || 'link',
            url: taskData.url || '',
            isActive: true,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        };

        const taskId = await this.pushData(taskPath, task);
        if (taskId) {
            await this.logActivity('admin', 'task_created', { taskId, title: task.title });
        }
        return taskId;
    },

    async getTasks() {
        return await this.readData('tasks');
    },

    async updateTask(taskId, updates) {
        const taskPath = `tasks/${taskId}`;
        const currentData = await this.readData(taskPath);
        if (currentData) {
            const updatedData = { 
                ...currentData, 
                ...updates, 
                updatedAt: serverTimestamp() 
            };
            return await this.writeData(taskPath, updatedData);
        }
        return false;
    },

    async deleteTask(taskId) {
        return await this.writeData(`tasks/${taskId}`, null);
    },

    // Referral operations
    async processReferral(newUserId, referrerId) {
        if (!referrerId || newUserId === referrerId) return false;

        try {
            // Get referral reward from settings
            const settings = await this.getSettings();
            const referralReward = settings?.referralReward || 500;

            // Update referrer's stats and coins
            await runTransaction(ref(database, `users/${referrerId}`), (userData) => {
                if (userData) {
                    return {
                        ...userData,
                        referralCount: (userData.referralCount || 0) + 1,
                        referralEarnings: (userData.referralEarnings || 0) + referralReward,
                        coins: (userData.coins || 0) + referralReward,
                        updatedAt: serverTimestamp()
                    };
                }
                return userData;
            });

            // Log referral activity
            await this.logActivity(referrerId, 'referral_earned', { 
                newUserId, 
                reward: referralReward 
            });

            await this.logActivity(newUserId, 'referred_by', { 
                referrerId, 
                reward: referralReward 
            });

            console.log(`✅ Processed referral: ${newUserId} referred by ${referrerId}, reward: ${referralReward}`);
            return true;

        } catch (error) {
            console.error('❌ Error processing referral:', error);
            return false;
        }
    },

    // Settings operations
    async getSettings() {
        const defaultSettings = {
            referralReward: 500,
            farmingReward: 100,
            minWithdrawal: 1000,
            exchangeRate: 100, // 100 coins = ₹1
            updatedAt: serverTimestamp()
        };

        const settings = await this.readData('settings');
        return settings || defaultSettings;
    },

    async updateSettings(newSettings) {
        const currentSettings = await this.getSettings();
        const updatedSettings = {
            ...currentSettings,
            ...newSettings,
            updatedAt: serverTimestamp()
        };
        return await this.writeData('settings', updatedSettings);
    },

    // Activity logging
    async logActivity(userId, action, data = {}) {
        const activityData = {
            userId,
            action,
            data,
            timestamp: serverTimestamp()
        };
        return await this.pushData('activities', activityData);
    },

    // Farming operations
    async startFarming(userId) {
        const now = Date.now();
        const farmingEndTime = now + (60 * 60 * 1000); // 1 hour from now

        const updates = {
            farmingStartTime: now,
            farmingEndTime: farmingEndTime,
            isFarming: true
        };

        const success = await this.updateUser(userId, updates);
        if (success) {
            await this.logActivity(userId, 'farming_started', { endTime: farmingEndTime });
        }
        return success;
    },

    async claimFarming(userId) {
        const user = await this.getUser(userId);
        if (!user || !user.isFarming) return false;

        const now = Date.now();
        if (now < user.farmingEndTime) {
            return { success: false, message: 'Farming not complete yet' };
        }

        // Calculate reward
        const settings = await this.getSettings();
        const baseReward = settings.farmingReward || 100;
        const multiplier = user.farmingMultiplier || 1;
        const totalReward = Math.floor(baseReward * multiplier);

        // Add coins and update farming status
        const coinsAdded = await this.addCoins(userId, totalReward, 'Farming reward');
        if (coinsAdded) {
            await this.updateUser(userId, {
                isFarming: false,
                farmingStartTime: null,
                farmingEndTime: null,
                lastFarmingClaim: now
            });

            return { success: true, reward: totalReward };
        }

        return { success: false, message: 'Failed to claim reward' };
    },

    // Withdrawal operations
    async requestWithdrawal(userId, amount, upiId) {
        const user = await this.getUser(userId);
        const settings = await this.getSettings();

        if (!user || user.coins < amount || amount < (settings.minWithdrawal || 1000)) {
            return { success: false, message: 'Invalid withdrawal request' };
        }

        const withdrawalData = {
            userId,
            amount,
            upiId,
            status: 'pending',
            requestedAt: serverTimestamp()
        };

        const withdrawalId = await this.pushData('withdrawals', withdrawalData);
        if (withdrawalId) {
            // Deduct coins
            await runTransaction(ref(database, `users/${userId}/coins`), (currentCoins) => {
                return Math.max(0, (currentCoins || 0) - amount);
            });

            await this.logActivity(userId, 'withdrawal_requested', { amount, withdrawalId });
            return { success: true, withdrawalId };
        }

        return { success: false, message: 'Failed to process withdrawal' };
    },

    // Admin operations
    async getStats() {
        const users = await this.readData('users') || {};
        const tasks = await this.readData('tasks') || {};
        const withdrawals = await this.readData('withdrawals') || {};

        const totalUsers = Object.keys(users).length;
        const activeTasks = Object.values(tasks).filter(task => task.isActive).length;
        const pendingWithdrawals = Object.values(withdrawals).filter(w => w.status === 'pending').length;

        return {
            totalUsers,
            activeTasks,
            pendingWithdrawals,
            totalCoinsDistributed: Object.values(users).reduce((sum, user) => sum + (user.coins || 0), 0)
        };
    }
};

export { database, firebaseConfig };