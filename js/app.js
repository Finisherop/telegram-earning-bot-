// Main App Logic
import telegramApp from './telegram.js';
import dbManager from './database.js';

class MainApp {
    constructor() {
        this.currentUser = null;
        this.currentTab = 'dashboard';
        this.isAdmin = false;
        this.farmingInterval = null;
        
        this.init();
    }

    async init() {
        console.log('🚀 Starting Telegram Mini App...');
        
        try {
            // Wait for Firebase to load
            await dbManager.init();
            
            // Wait for Telegram to be ready
            await this.waitForTelegram();
            
            // Check for admin mode
            this.checkAdminMode();
            
            // Initialize user
            await this.initializeUser();
            
            // Setup UI
            this.setupUI();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Setup real-time listeners
            this.setupRealtimeListeners();
            
            // Hide loading screen
            this.hideLoading();
            
            console.log('✅ App initialized successfully');
            
        } catch (error) {
            console.error('❌ App initialization failed:', error);
            this.showError('Failed to initialize app. Please refresh.');
        }
    }

    async waitForTelegram() {
        return new Promise((resolve) => {
            if (telegramApp.isReady()) {
                resolve();
            } else {
                window.addEventListener('telegramReady', resolve, { once: true });
            }
        });
    }

    checkAdminMode() {
        const urlParams = new URLSearchParams(window.location.search);
        this.isAdmin = urlParams.get('admin') === 'true';
        console.log('👑 Admin mode:', this.isAdmin);
    }

    async initializeUser() {
        const telegramUser = telegramApp.getUser();
        const startParam = telegramApp.getStartParam();
        
        if (telegramUser) {
            // Initialize user in database with referral if present
            this.currentUser = await dbManager.initializeUser(telegramUser, startParam);
            console.log('👤 User initialized:', this.currentUser);
        }
    }

    setupUI() {
        if (this.isAdmin) {
            this.showAdminPanel();
        } else {
            this.showUserPanel();
        }
        
        this.updateUserInterface();
    }

    setupEventListeners() {
        // Navigation tabs (User)
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabName = e.target.dataset.tab;
                this.switchTab(tabName);
            });
        });

        // Admin navigation tabs
        document.querySelectorAll('.admin-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabName = e.target.dataset.tab;
                this.switchAdminTab(tabName);
            });
        });

        // Farming button
        const farmingBtn = document.getElementById('farmingBtn');
        if (farmingBtn) {
            farmingBtn.addEventListener('click', () => this.handleFarming());
        }

        // Referral actions
        const copyLink = document.getElementById('copyLink');
        const shareLink = document.getElementById('shareLink');
        
        if (copyLink) {
            copyLink.addEventListener('click', () => this.copyReferralLink());
        }
        
        if (shareLink) {
            shareLink.addEventListener('click', () => this.shareReferralLink());
        }

        // Withdrawal form
        const withdrawalForm = document.getElementById('withdrawalForm');
        if (withdrawalForm) {
            withdrawalForm.addEventListener('submit', (e) => this.handleWithdrawal(e));
        }

        // Admin forms
        const taskForm = document.getElementById('taskForm');
        const settingsForm = document.getElementById('settingsForm');
        
        if (taskForm) {
            taskForm.addEventListener('submit', (e) => this.handleCreateTask(e));
        }
        
        if (settingsForm) {
            settingsForm.addEventListener('submit', (e) => this.handleUpdateSettings(e));
        }

        // Switch panel buttons
        const switchToUser = document.getElementById('switchToUser');
        if (switchToUser) {
            switchToUser.addEventListener('click', () => {
                this.isAdmin = false;
                this.showUserPanel();
                this.updateUserInterface();
            });
        }
    }

    setupRealtimeListeners() {
        // Listen for user updates
        window.addEventListener('userUpdated', (event) => {
            this.currentUser = event.detail;
            this.updateUserInterface();
        });

        // Listen for tasks updates
        dbManager.listenToTasks();
        window.addEventListener('tasksUpdated', (event) => {
            this.updateTasksList(event.detail);
        });

        // Listen for new referrals
        window.addEventListener('newReferral', (event) => {
            this.showReferralNotification(event.detail);
        });

        // Admin listeners
        if (this.isAdmin) {
            dbManager.listenToAdminStats();
            this.setupAdminListeners();
        }

        // Listen to referrals for current user
        if (this.currentUser) {
            dbManager.listenToReferrals(this.currentUser.telegramId);
        }
    }

    setupAdminListeners() {
        window.addEventListener('adminUsersUpdated', () => {
            this.updateAdminStats();
        });

        window.addEventListener('adminTasksUpdated', () => {
            this.updateAdminTasksList();
        });

        window.addEventListener('adminWithdrawalsUpdated', () => {
            this.updateAdminStats();
        });
    }

    // UI Management
    hideLoading() {
        const loading = document.getElementById('loading');
        const app = document.getElementById('app');
        
        if (loading) loading.style.display = 'none';
        if (app) app.classList.remove('hidden');
    }

    showUserPanel() {
        const userPanel = document.getElementById('userPanel');
        const adminPanel = document.getElementById('adminPanel');
        
        if (userPanel) userPanel.classList.remove('hidden');
        if (adminPanel) adminPanel.classList.add('hidden');
    }

    showAdminPanel() {
        const userPanel = document.getElementById('userPanel');
        const adminPanel = document.getElementById('adminPanel');
        
        if (userPanel) userPanel.classList.add('hidden');
        if (adminPanel) adminPanel.classList.remove('hidden');
    }

    switchTab(tabName) {
        // Update navigation
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.remove('text-primary', 'border-primary');
            tab.classList.add('text-gray-500');
        });
        
        document.querySelector(`[data-tab="${tabName}"]`).classList.remove('text-gray-500');
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('text-primary', 'border-primary');

        // Show/hide tab content
        document.querySelectorAll('.tab-panel').forEach(panel => {
            panel.classList.add('hidden');
        });
        
        const targetTab = document.getElementById(`${tabName}Tab`);
        if (targetTab) {
            targetTab.classList.remove('hidden');
        }

        this.currentTab = tabName;
        
        // Load tab-specific content
        if (tabName === 'tasks') {
            this.loadTasks();
        } else if (tabName === 'referrals') {
            this.updateReferralInterface();
        } else if (tabName === 'withdraw') {
            this.loadWithdrawals();
        }
    }

    switchAdminTab(tabName) {
        // Update navigation
        document.querySelectorAll('.admin-tab').forEach(tab => {
            tab.classList.remove('text-primary', 'border-primary');
            tab.classList.add('text-gray-500');
        });
        
        document.querySelector(`.admin-tab[data-tab="${tabName}"]`).classList.remove('text-gray-500');
        document.querySelector(`.admin-tab[data-tab="${tabName}"]`).classList.add('text-primary', 'border-primary');

        // Show/hide panels
        document.querySelectorAll('.admin-panel').forEach(panel => {
            panel.classList.add('hidden');
        });
        
        const targetPanel = document.getElementById(`admin${tabName.charAt(0).toUpperCase() + tabName.slice(1)}Tab`);
        if (targetPanel) {
            targetPanel.classList.remove('hidden');
        }

        // Load panel-specific content
        if (tabName === 'dashboard') {
            this.updateAdminStats();
        } else if (tabName === 'tasks') {
            this.updateAdminTasksList();
        } else if (tabName === 'users') {
            this.updateAdminUsersList();
        } else if (tabName === 'settings') {
            this.loadAdminSettings();
        }
    }

    updateUserInterface() {
        if (!this.currentUser) return;

        // Update header info
        const userName = document.getElementById('userName');
        const userInfo = document.getElementById('userInfo');
        const userCoins = document.getElementById('userCoins');
        const userLevel = document.getElementById('userLevel');
        const userAvatar = document.getElementById('userAvatar');
        const defaultAvatar = document.getElementById('defaultAvatar');
        const userInitial = document.getElementById('userInitial');

        if (userName) {
            const name = this.currentUser.firstName || this.currentUser.username || 'User';
            userName.textContent = `Hello, ${name}!`;
        }

        if (userInfo) {
            userInfo.textContent = this.currentUser.username ? `@${this.currentUser.username}` : 'Telegram Mini App';
        }

        if (userCoins) {
            userCoins.textContent = (this.currentUser.coins || 0).toLocaleString();
        }

        if (userLevel) {
            userLevel.textContent = `Level ${this.currentUser.level || 1}`;
        }

        // Update avatar
        if (this.currentUser.profilePic) {
            userAvatar.src = this.currentUser.profilePic;
            userAvatar.style.display = 'block';
            defaultAvatar.style.display = 'none';
        } else {
            const initial = (this.currentUser.firstName || this.currentUser.username || 'U')[0].toUpperCase();
            userInitial.textContent = initial;
            userAvatar.style.display = 'none';
            defaultAvatar.style.display = 'flex';
        }

        // Update stats cards
        const totalEarnings = document.getElementById('totalEarnings');
        const referralCount = document.getElementById('referralCount');
        const refCount = document.getElementById('refCount');
        const refEarnings = document.getElementById('refEarnings');

        if (totalEarnings) {
            totalEarnings.textContent = (this.currentUser.coins || 0).toLocaleString();
        }

        if (referralCount) {
            referralCount.textContent = this.currentUser.referralCount || 0;
        }

        if (refCount) {
            refCount.textContent = this.currentUser.referralCount || 0;
        }

        if (refEarnings) {
            refEarnings.textContent = (this.currentUser.referralEarnings || 0).toLocaleString();
        }

        // Update farming status
        this.updateFarmingStatus();
        
        // Animate coin updates
        this.animateCoins();
    }

    updateFarmingStatus() {
        if (!this.currentUser) return;

        const farmingTitle = document.getElementById('farmingTitle');
        const farmingDesc = document.getElementById('farmingDesc');
        const farmingBtn = document.getElementById('farmingBtn');
        const farmingTimer = document.getElementById('farmingTimer');
        const timerDisplay = document.getElementById('timerDisplay');

        if (this.currentUser.isFarming && this.currentUser.farmingEndTime) {
            const now = Date.now();
            const endTime = this.currentUser.farmingEndTime;
            
            if (now >= endTime) {
                // Farming complete - ready to claim
                farmingTitle.textContent = '🎉 Farming Complete!';
                farmingDesc.textContent = 'Click to claim your rewards';
                farmingBtn.textContent = 'Claim Rewards';
                farmingBtn.className = 'bg-green-500 text-white px-6 py-2 rounded-full font-semibold';
                farmingTimer.classList.add('hidden');
            } else {
                // Farming in progress
                farmingTitle.textContent = '🌱 Farming Active';
                farmingDesc.textContent = 'Coins are being farmed automatically';
                farmingBtn.style.display = 'none';
                farmingTimer.classList.remove('hidden');
                
                // Start countdown timer
                this.startFarmingTimer(endTime);
            }
        } else {
            // Not farming
            farmingTitle.textContent = 'Start Farming!';
            farmingDesc.textContent = 'Earn coins automatically every hour';
            farmingBtn.textContent = 'Start Farming';
            farmingBtn.className = 'bg-white text-blue-600 px-6 py-2 rounded-full font-semibold';
            farmingBtn.style.display = 'inline-block';
            farmingTimer.classList.add('hidden');
        }
    }

    startFarmingTimer(endTime) {
        // Clear existing interval
        if (this.farmingInterval) {
            clearInterval(this.farmingInterval);
        }

        const timerDisplay = document.getElementById('timerDisplay');
        
        this.farmingInterval = setInterval(() => {
            const now = Date.now();
            const remaining = endTime - now;
            
            if (remaining <= 0) {
                clearInterval(this.farmingInterval);
                this.updateFarmingStatus();
                return;
            }
            
            const hours = Math.floor(remaining / (1000 * 60 * 60));
            const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
            
            timerDisplay.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }, 1000);
    }

    animateCoins() {
        const userCoins = document.getElementById('userCoins');
        if (userCoins) {
            userCoins.classList.add('coin-animation');
            setTimeout(() => {
                userCoins.classList.remove('coin-animation');
            }, 600);
        }
    }

    // Farming functionality
    async handleFarming() {
        if (!this.currentUser) return;

        const farmingBtn = document.getElementById('farmingBtn');
        const originalText = farmingBtn.textContent;
        
        farmingBtn.textContent = 'Processing...';
        farmingBtn.disabled = true;

        try {
            if (this.currentUser.isFarming && this.currentUser.farmingEndTime && Date.now() >= this.currentUser.farmingEndTime) {
                // Claim farming rewards
                const result = await dbManager.claimFarming(this.currentUser.telegramId);
                
                if (result.success) {
                    this.showNotification(`🎉 Claimed ${result.reward} coins!`, 'success');
                } else {
                    this.showNotification(result.message || 'Failed to claim rewards', 'error');
                }
            } else {
                // Start farming
                const success = await dbManager.startFarming(this.currentUser.telegramId);
                
                if (success) {
                    this.showNotification('🌱 Farming started! Come back in 1 hour', 'success');
                } else {
                    this.showNotification('Failed to start farming', 'error');
                }
            }
        } finally {
            farmingBtn.textContent = originalText;
            farmingBtn.disabled = false;
        }
    }

    // Tasks functionality
    async loadTasks() {
        // Tasks will be loaded via real-time listener
        dbManager.listenToTasks();
    }

    async updateTasksList(tasks) {
        const tasksList = document.getElementById('tasksList');
        if (!tasksList || !this.currentUser) return;

        // Get user's completed tasks
        const userTasks = await dbManager.getUserTasks(this.currentUser.telegramId);

        if (tasks.length === 0) {
            tasksList.innerHTML = '<p class="text-gray-500 text-center py-8">No tasks available</p>';
            return;
        }

        const tasksHTML = tasks.map(task => {
            const isCompleted = userTasks[task.id]?.status === 'completed';
            
            return `
                <div class="bg-white rounded-lg p-4 mb-3 card-shadow">
                    <div class="flex items-start justify-between">
                        <div class="flex-1">
                            <h4 class="font-semibold text-gray-800">${task.title}</h4>
                            <p class="text-sm text-gray-600 mt-1">${task.description || 'Complete this task to earn coins'}</p>
                            <div class="flex items-center mt-2">
                                <span class="text-yellow-500">🪙</span>
                                <span class="ml-1 font-semibold text-green-600">+${task.reward} coins</span>
                            </div>
                        </div>
                        <div class="ml-4">
                            ${isCompleted ? 
                                '<span class="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">Completed ✓</span>' :
                                `<button onclick="app.completeTask('${task.id}')" class="bg-primary text-white px-4 py-2 rounded font-medium text-sm">Complete</button>`
                            }
                        </div>
                    </div>
                    ${task.url && !isCompleted ? 
                        `<a href="${task.url}" target="_blank" class="block mt-3 text-blue-600 text-sm underline">🔗 Visit Link</a>` : ''
                    }
                </div>
            `;
        }).join('');

        tasksList.innerHTML = tasksHTML;
    }

    async completeTask(taskId) {
        if (!this.currentUser) return;

        try {
            const result = await dbManager.completeTask(taskId, this.currentUser.telegramId);
            
            if (result.success) {
                this.showNotification(`🎉 Task completed! +${result.reward} coins`, 'success');
                // Refresh tasks list
                this.loadTasks();
            } else {
                this.showNotification(result.message || 'Failed to complete task', 'error');
            }
        } catch (error) {
            this.showNotification('Task completion failed', 'error');
        }
    }

    // Referral functionality
    updateReferralInterface() {
        if (!this.currentUser) return;

        const referralLink = document.getElementById('referralLink');
        if (referralLink) {
            const link = telegramApp.generateReferralLink(this.currentUser.telegramId);
            referralLink.value = link;
        }

        this.loadReferralHistory();
    }

    async loadReferralHistory() {
        const referralHistory = document.getElementById('referralHistory');
        if (!referralHistory) return;

        // For now, show placeholder
        referralHistory.innerHTML = `
            <div class="space-y-2">
                <p class="text-gray-500 text-center py-4">
                    ${this.currentUser.referralCount > 0 ? 
                        `You have ${this.currentUser.referralCount} referral${this.currentUser.referralCount === 1 ? '' : 's'}!` :
                        'No referrals yet. Share your link to earn rewards!'
                    }
                </p>
            </div>
        `;
    }

    copyReferralLink() {
        const referralLink = document.getElementById('referralLink');
        if (referralLink) {
            telegramApp.copyToClipboard(referralLink.value);
        }
    }

    shareReferralLink() {
        if (this.currentUser) {
            telegramApp.shareReferralLink(this.currentUser.telegramId);
        }
    }

    showReferralNotification(data) {
        this.showNotification(
            `🎉 New referral! You earned ${data.userData.referralEarnings - (this.currentUser?.referralEarnings || 0)} coins!`,
            'success'
        );
    }

    // Withdrawal functionality
    async handleWithdrawal(event) {
        event.preventDefault();
        
        if (!this.currentUser) return;

        const amount = parseInt(document.getElementById('withdrawAmount').value);
        const upiId = document.getElementById('upiId').value.trim();

        if (!amount || !upiId) {
            this.showNotification('Please fill all fields', 'error');
            return;
        }

        if (amount > this.currentUser.coins) {
            this.showNotification('Insufficient coins', 'error');
            return;
        }

        try {
            const result = await dbManager.requestWithdrawal(this.currentUser.telegramId, amount, upiId);
            
            if (result.success) {
                this.showNotification('Withdrawal requested successfully!', 'success');
                document.getElementById('withdrawalForm').reset();
                this.loadWithdrawals();
            } else {
                this.showNotification(result.message || 'Withdrawal request failed', 'error');
            }
        } catch (error) {
            this.showNotification('Withdrawal request failed', 'error');
        }
    }

    async loadWithdrawals() {
        const withdrawalHistory = document.getElementById('withdrawalHistory');
        if (!withdrawalHistory || !this.currentUser) return;

        // For now, show placeholder
        withdrawalHistory.innerHTML = `
            <p class="text-gray-500 text-center py-4">
                Withdrawal history will appear here
            </p>
        `;
    }

    // Admin functionality
    async handleCreateTask(event) {
        event.preventDefault();
        
        const title = document.getElementById('taskName').value.trim();
        const reward = parseInt(document.getElementById('taskReward').value);
        const url = document.getElementById('taskLink').value.trim();

        if (!title || !reward) {
            this.showNotification('Please fill required fields', 'error');
            return;
        }

        try {
            const result = await dbManager.createTask({
                title,
                reward,
                url,
                description: `Complete this task to earn ${reward} coins`
            });

            if (result.success) {
                this.showNotification('Task created successfully!', 'success');
                document.getElementById('taskForm').reset();
                this.updateAdminTasksList();
            } else {
                this.showNotification(result.message || 'Failed to create task', 'error');
            }
        } catch (error) {
            this.showNotification('Task creation failed', 'error');
        }
    }

    async handleUpdateSettings(event) {
        event.preventDefault();

        const settings = {
            referralReward: parseInt(document.getElementById('referralReward').value),
            farmingReward: parseInt(document.getElementById('farmingReward').value),
            minWithdrawal: parseInt(document.getElementById('minWithdrawal').value),
            exchangeRate: parseInt(document.getElementById('exchangeRate').value)
        };

        try {
            const success = await dbManager.updateSettings(settings);
            
            if (success) {
                this.showNotification('Settings updated successfully!', 'success');
            } else {
                this.showNotification('Failed to update settings', 'error');
            }
        } catch (error) {
            this.showNotification('Settings update failed', 'error');
        }
    }

    async updateAdminStats() {
        try {
            const stats = await dbManager.getStats();
            
            const totalUsersEl = document.getElementById('adminTotalUsers');
            const activeTasksEl = document.getElementById('adminActiveTasks');
            const pendingWithdrawalsEl = document.getElementById('adminPendingWithdrawals');

            if (totalUsersEl) totalUsersEl.textContent = stats.totalUsers || 0;
            if (activeTasksEl) activeTasksEl.textContent = stats.activeTasks || 0;
            if (pendingWithdrawalsEl) pendingWithdrawalsEl.textContent = stats.pendingWithdrawals || 0;

        } catch (error) {
            console.error('Error updating admin stats:', error);
        }
    }

    async updateAdminTasksList() {
        const adminTasksList = document.getElementById('adminTasksList');
        if (!adminTasksList) return;

        try {
            const tasks = await window.Firebase.getTasks() || {};
            const tasksList = Object.entries(tasks).map(([id, task]) => ({ id, ...task }));

            if (tasksList.length === 0) {
                adminTasksList.innerHTML = '<p class="text-gray-500 text-center py-4">No tasks created yet</p>';
                return;
            }

            const tasksHTML = tasksList.map(task => `
                <div class="border rounded-lg p-4 mb-3">
                    <div class="flex items-start justify-between">
                        <div class="flex-1">
                            <h4 class="font-semibold">${task.title}</h4>
                            <p class="text-sm text-gray-600">${task.description || ''}</p>
                            <p class="text-sm text-green-600 mt-1">Reward: ${task.reward} coins</p>
                            ${task.url ? `<a href="${task.url}" target="_blank" class="text-blue-600 text-sm">🔗 ${task.url}</a>` : ''}
                        </div>
                        <div class="ml-4">
                            <span class="px-2 py-1 rounded text-sm ${task.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}">
                                ${task.isActive ? 'Active' : 'Inactive'}
                            </span>
                        </div>
                    </div>
                </div>
            `).join('');

            adminTasksList.innerHTML = tasksHTML;

        } catch (error) {
            console.error('Error updating admin tasks list:', error);
        }
    }

    async updateAdminUsersList() {
        const adminUsersList = document.getElementById('adminUsersList');
        if (!adminUsersList) return;

        adminUsersList.innerHTML = '<p class="text-gray-500 text-center py-4">Loading users...</p>';
    }

    async loadAdminSettings() {
        try {
            const settings = await dbManager.getSettings();
            
            document.getElementById('referralReward').value = settings.referralReward || 500;
            document.getElementById('farmingReward').value = settings.farmingReward || 100;
            document.getElementById('minWithdrawal').value = settings.minWithdrawal || 1000;
            document.getElementById('exchangeRate').value = settings.exchangeRate || 100;

        } catch (error) {
            console.error('Error loading admin settings:', error);
        }
    }

    // Utility functions
    showNotification(message, type = 'info') {
        const notifications = document.getElementById('notifications');
        if (!notifications) return;

        const notification = document.createElement('div');
        notification.className = `notification p-4 rounded-lg shadow-lg text-white max-w-sm ${
            type === 'success' ? 'bg-green-500' : 
            type === 'error' ? 'bg-red-500' : 
            type === 'warning' ? 'bg-yellow-500' : 
            'bg-blue-500'
        }`;
        
        notification.textContent = message;
        
        notifications.appendChild(notification);
        
        // Auto remove after 3 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    }

    showError(message) {
        this.showNotification(message, 'error');
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new MainApp();
});

// Global function for task completion (called from HTML)
window.app = window.app || {};
window.app.completeTask = function(taskId) {
    if (window.app && window.app.completeTask) {
        window.app.completeTask(taskId);
    }
};