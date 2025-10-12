'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Task as TaskType, UserTask } from '@/types';
import { getTasks, getUserTasks, completeTask, claimTask, safeUpdateUser, subscribeToTasks, subscribeToUserTasks } from '@/lib/firebaseService';
import { TelegramService } from '@/lib/telegram';
import { validateUserForOperation, getUserValidationError } from '@/lib/userValidation';
import { realtimeDb } from '@/lib/firebaseClient.js';
import { ref, onValue, off } from 'firebase/database';
import { useTelegramWebApp } from '@/hooks/useTelegramWebApp.js';
import toast from 'react-hot-toast';

interface TaskProps {
  user?: User;
}

const Task = ({ user: propUser }: TaskProps) => {
  const { user: telegramUser } = useTelegramWebApp() as any;
  const [tasks, setTasks] = useState<TaskType[]>([]);
  const [userTasks, setUserTasks] = useState<UserTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false); // For individual task actions
  const [completingTask, setCompletingTask] = useState<string | null>(null);
  const [timer, setTimer] = useState<number | null>(null);
  const [timerTaskId, setTimerTaskId] = useState<string | null>(null);
  const [adsWatchedToday, setAdsWatchedToday] = useState(0);
  const [visitedLinks, setVisitedLinks] = useState<Set<string>>(new Set());

  // Create a combined user object for compatibility
  const user = propUser || {
    telegramId: telegramUser?.id?.toString() || '',
    vipTier: 'free',
    adsLimitPerDay: 5,
    coins: 0,
    xp: 0,
    dailyStreak: 0,
    farmingStartTime: null,
    farmingEndTime: null,
    lastClaimDate: null,
    firstName: telegramUser?.first_name || 'User',
    username: telegramUser?.username || ''
  };

  useEffect(() => {
    const loadTasks = async () => {
      if (!realtimeDb) {
        console.error('❌ Firebase Realtime Database not available');
        setError('Firebase not available');
        setLoading(false);
        return;
      }

      // Get user ID from Telegram or fallback to prop user
      const userId = telegramUser?.id || propUser?.telegramId;
      
      if (!userId) {
        console.warn('Tasks: No user ID available');
        setError('No user ID available');
        setLoading(false);
        return;
      }

      console.log('Loading tasks for user:', userId);
      setLoading(true);
      setError(null);

      try {
        // Set up real-time listener for tasks
        const tasksRef = ref(realtimeDb, 'tasks');
        const unsubscribeTasks = onValue(tasksRef, (snapshot) => {
          if (snapshot.exists()) {
            const tasksData = snapshot.val();
            const tasksArray = Object.keys(tasksData).map(key => ({
              id: key,
              ...tasksData[key]
            })).filter(task => task.isActive !== false); // Only show active tasks
            
            console.log('✅ Tasks loaded from Firebase:', tasksArray);
            setTasks(tasksArray);
          } else {
            console.log('No tasks found in Firebase, using default tasks');
            // Default tasks if none exist in Firebase
            const defaultTasks: TaskType[] = [
              {
                id: 'task_1',
                title: 'Join Telegram Channel',
                description: 'Join our official Telegram channel',
                type: 'social',
                reward: 100,
                url: 'https://t.me/your_channel',
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date(),
              },
              {
                id: 'task_2',
                title: 'Watch Advertisement',
                description: 'Watch a short video ad to earn coins',
                type: 'ads',
                reward: 50,
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date(),
              },
              {
                id: 'task_3',
                title: 'Daily Reward',
                description: 'Claim your daily reward',
                type: 'daily',
                reward: 50,
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date(),
              }
            ];
            setTasks(defaultTasks);
          }
          setLoading(false);
        }, (error) => {
          console.error('❌ Error fetching tasks:', error);
          setError('Failed to load tasks');
          setLoading(false);
        });

        // Set up real-time listener for user tasks
        const userTasksRef = ref(realtimeDb, `userTasks/${userId}`);
        const unsubscribeUserTasks = onValue(userTasksRef, (snapshot) => {
          if (snapshot.exists()) {
            const userTasksData = snapshot.val();
            const userTasksArray = Object.keys(userTasksData).map(key => ({
              id: key,
              ...userTasksData[key]
            }));
            console.log('✅ User tasks loaded from Firebase:', userTasksArray);
            setUserTasks(userTasksArray);
          } else {
            console.log('No user tasks found');
            setUserTasks([]);
          }
        });

        // Cleanup function
        return () => {
          off(tasksRef, 'value', unsubscribeTasks);
          off(userTasksRef, 'value', unsubscribeUserTasks);
        };
      } catch (error) {
        console.error('❌ Firebase error:', error);
        setError('Failed to load tasks');
        setLoading(false);
      }
    };

    loadTasks();
  }, [telegramUser?.id, propUser?.telegramId]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timer !== null && timer > 0) {
      interval = setInterval(() => {
        setTimer(prev => prev! - 1);
      }, 1000);
    } else if (timer === 0) {
      setTimer(null);
      setTimerTaskId(null);
    }
    return () => clearInterval(interval);
  }, [timer]);

  // Removed loadTasks, loadUserTasks, and checkAdsLimit functions
  // Now using real-time listeners instead

  const initializeAd = async (taskId: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      try {
        console.log('Initializing ad for task:', taskId);
        
        // Check if Monotag is available
        if (typeof window !== 'undefined' && (window as any).MonotagJS) {
          console.log('Monotag available, initializing ad');
          
          // Initialize Monotag ad
          const monotag = (window as any).MonotagJS;
          monotag.init({
            containerId: 'monotag-ad',
            onAdLoaded: () => {
              console.log('Ad loaded successfully');
              toast.success('📺 Ad loaded! Watching...');
            },
            onAdCompleted: () => {
              console.log('Ad completed');
              toast.success('✅ Ad watched successfully!');
              resolve();
            },
            onAdError: (error: any) => {
              console.error('Ad error:', error);
              toast.error('Ad failed to load');
              reject(error);
            }
          });
        } else {
          console.log('Monotag not available, using fallback timer');
          // Fallback: simulate ad watching with timer
          toast.success('📺 Ad starting... Please wait 15 seconds');
          
          // Simulate 15 second ad with countdown
          setTimer(15);
          setTimerTaskId(taskId);
          
          setTimeout(() => {
            console.log('Ad completed');
            toast.success('✅ Ad watched successfully!');
            setTimer(null);
            setTimerTaskId(null);
            resolve();
          }, 15000); // 15 seconds
        }
      } catch (error) {
        console.error('Ad initialization error:', error);
        reject(error);
      }
    });
  };

  const getTaskStatus = (taskId: string) => {
    const userTask = userTasks.find(ut => ut.taskId === taskId);
    if (!userTask) return 'available';
    return userTask.status;
  };

  const canWatchAds = () => {
    if (user.vipTier !== 'free') return true; // VIP users have unlimited ads
    return adsWatchedToday < user.adsLimitPerDay;
  };

  const handleTaskClick = async (task: TaskType) => {
    console.log('Task clicked:', task.title, task.type);
    const telegram = TelegramService.getInstance();
    const status = getTaskStatus(task.id);

    if (status === 'claimed') {
      toast.error('Task already completed');
      return;
    }

    if (task.type === 'ads' && !canWatchAds()) {
      toast.error(`Daily ads limit reached (${user.adsLimitPerDay}/day). Upgrade to VIP for unlimited ads!`);
      return;
    }

    telegram.hapticFeedback('medium');

    try {
      switch (task.type) {
        case 'farming':
          await handleFarmingTask(task);
          break;
        
        case 'daily':
          await handleDailyTask(task);
          break;
        
        case 'link':
        case 'social':
          await handleLinkTask(task);
          break;
        
        case 'ads':
          await handleAdsTask(task);
          break;
        
        default:
          await handleGenericTask(task);
      }
    } catch (error) {
      console.error('Task action error:', error);
      toast.error('Failed to complete task. Please try again.');
      setCompletingTask(null);
      setTimer(null);
      setTimerTaskId(null);
    }
  };

  const handleFarmingTask = async (task: TaskType) => {
    console.log('Starting farming task');
    
    // Check if already farming
    if (user.farmingStartTime && user.farmingEndTime) {
      const now = new Date();
      const endTime = new Date(user.farmingEndTime);
      
      if (now < endTime) {
        toast.error('🚜 Farming already in progress!');
        return;
      }
    }
    
    // Start farming
    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + 8 * 60 * 60 * 1000); // 8 hours
    
    await safeUpdateUser(user.telegramId, {
      farmingStartTime: startTime,
      farmingEndTime: endTime,
    });
    
    // Mark task as completed
    await completeTask(user.telegramId, task.id);
    // Real-time listener will automatically update userTasks
    
    toast.success('🚜 Farming started! Come back in 8 hours to claim your reward.');
  };

  const handleDailyTask = async (task: TaskType) => {
    console.log('Processing daily task');
    
    // Check if already claimed today
    const today = new Date().toDateString();
    const lastClaim = user.lastClaimDate ? new Date(user.lastClaimDate).toDateString() : null;
    
    if (lastClaim === today) {
      toast.error('⏰ You have already claimed your daily reward today!');
      return;
    }
    
    // Claim daily reward
    const baseReward = task.reward || 50;
    const streakBonus = Math.min(user.dailyStreak * 10, 100);
    const totalReward = baseReward + streakBonus;
    
    await safeUpdateUser(user.telegramId, {
      coins: user.coins + totalReward,
      xp: user.xp + Math.floor(totalReward / 10),
      dailyStreak: user.dailyStreak + 1,
      lastClaimDate: new Date(),
    });
    
    // Mark task as completed
    await completeTask(user.telegramId, task.id);
    // Real-time listener will automatically update userTasks
    
    toast.success(`🎁 Daily reward claimed! +${totalReward} coins (Streak: ${user.dailyStreak + 1})`);
  };

  const handleLinkTask = async (task: TaskType) => {
    console.log('Opening link:', task.url);
    const telegram = TelegramService.getInstance();
    
    if (task.url) {
      // Open the link
      telegram.openLink(task.url);
      
      // Mark as visited
      setVisitedLinks(prev => {
        const newSet = new Set(prev);
        newSet.add(task.id);
        return newSet;
      });
      
      // Mark task as completed (ready to claim)
      await completeTask(user.telegramId, task.id);
      
      toast.success('🔗 Link opened! You can now claim your reward.');
    } else {
      // For tasks without URL, complete immediately
      await completeTask(user.telegramId, task.id);
      toast.success('✅ Task completed! You can now claim your reward.');
    }
    
    console.log('Link task completed');
  };

  const handleAdsTask = async (task: TaskType) => {
    console.log('Starting ad watch');
    
    setCompletingTask(task.id);
    setTimer(15); // 15 seconds for ad watching
    setTimerTaskId(task.id);
    toast.success('📺 Loading ad... Please wait');
    
    // Initialize ad
    await initializeAd(task.id);
    await completeTask(user.telegramId, task.id);
    // Real-time listener will automatically update userTasks
    console.log('Ad task completed');
  };

  const handleGenericTask = async (task: TaskType) => {
    console.log('Processing generic task');
    
    // Award coins immediately for generic tasks
    await safeUpdateUser(user.telegramId, {
      coins: user.coins + task.reward,
      xp: user.xp + Math.floor(task.reward / 10),
    });
    
    // Mark task as completed
    await completeTask(user.telegramId, task.id);
    // Real-time listener will automatically update userTasks
    
    toast.success(`✅ Task completed! +${task.reward} coins earned.`);
  };

  const handleClaim = async (task: TaskType) => {
    console.log('Claim task clicked:', task.title);
    const telegram = TelegramService.getInstance();
    telegram.hapticFeedback('heavy');

    // Prevent claiming when component is still loading
    if (loading) {
      toast.error('Please wait for tasks to load.');
      return;
    }

    // Enhanced validation for user data
    if (!user || !user.telegramId) {
      toast.error('User data not available');
      return;
    }

    if (!task || !task.id || !task.reward) {
      console.error('Invalid task data:', task);
      toast.error('Invalid task data. Please refresh the app.');
      return;
    }

    if (task.reward <= 0) {
      console.error('Invalid reward amount:', task.reward);
      toast.error('Invalid reward amount.');
      return;
    }

    try {
      console.log(`Claiming task reward: ${task.reward} coins for task: ${task.id}, user: ${user.telegramId}`);
      
      // Add loading state
      setIsLoading(true);
      
      await claimTask(user.telegramId, task.id, task.reward);
      
      // Real-time listener will automatically update userTasks and user coins
      // Coin fly animation
      toast.success(`💰 +${task.reward} coins claimed! 🎉`);
      console.log('Task reward claimed successfully');
      
      // Remove from visited links if it was a link task
      if (task.type === 'link') {
        setVisitedLinks(prev => {
          const newSet = new Set(prev);
          newSet.delete(task.id);
          return newSet;
        });
      }
      
      if (task.type === 'ads') {
        setAdsWatchedToday(prev => prev + 1);
      }
    } catch (error) {
      console.error('Task claim error:', error);
      
      // Provide more specific error messages
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      if (errorMessage.includes('Invalid user ID')) {
        toast.error('User ID is invalid. Please refresh the app and try again.');
      } else if (errorMessage.includes('User not found') || errorMessage.includes('User profile not found')) {
        toast.error('User profile not found. Please refresh the app and try again.');
      } else if (errorMessage.includes('Task has already been claimed') || errorMessage.includes('Task already claimed')) {
        toast.error('This task has already been claimed.');
      } else if (errorMessage.includes('Database service unavailable')) {
        toast.error('Service temporarily unavailable. Please try again in a moment.');
      } else if (errorMessage.includes('Network') || errorMessage.includes('network')) {
        toast.error('Network error. Please check your connection and try again.');
      } else {
        toast.error(`Failed to claim reward: ${errorMessage}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getTaskIcon = (type: string) => {
    switch (type) {
      case 'farming': return '🚜';
      case 'daily': return '🎁';
      case 'ads': return '📺';
      case 'link': return '🔗';
      case 'social': return '📱';
      case 'referral': return '👥';
      default: return '📋';
    }
  };

  const getTaskButtonText = (type: string, taskId?: string) => {
    if (type === 'link' && visitedLinks.has(taskId || '')) {
      return '✅ Visited';
    }
    
    switch (type) {
      case 'farming': return '🚜 Start Farm';
      case 'daily': return '🎁 Claim Daily';
      case 'ads': return '📺 Watch Ad';
      case 'link': return '🔗 Visit Link';
      case 'social': return '📱 Follow';
      case 'referral': return '👥 Refer';
      default: return '▶️ Go';
    }
  };

  if (loading) {
    return (
      <div className="p-4">
        <div className="bg-white rounded-2xl p-6 text-center mb-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Loading tasks...</h2>
          <p className="text-gray-600">Fetching available tasks from Firebase</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-red-800 mb-2">Error fetching tasks</h2>
          <p className="text-red-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            Refresh App
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 shadow-lg">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Available Tasks</h1>
        <p className="text-gray-600">Complete tasks to earn coins and XP</p>
        
        {user.vipTier === 'free' && (
          <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-amber-800 text-sm">
              📺 Ads watched today: {adsWatchedToday}/{user.adsLimitPerDay}
            </p>
            <p className="text-amber-600 text-xs mt-1">
              Upgrade to VIP for unlimited ads!
            </p>
          </div>
        )}
      </div>

      {/* Tasks List */}
      <div className="space-y-3">
        {tasks.map((task) => {
          const status = getTaskStatus(task.id);
          const isCompleting = completingTask === task.id;
          const showTimer = timerTaskId === task.id && timer !== null;
          
          return (
            <motion.div
              key={task.id}
              className="bg-white rounded-2xl p-4 shadow-lg"
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="text-3xl">
                    {getTaskIcon(task.type)}
                  </div>
                  
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-800 flex items-center">
                      {task.title}
                      {task.type === 'ads' && (
                        <span className="ml-2 bg-red-100 text-red-600 text-xs px-2 py-1 rounded-full font-bold">
                          ADS
                        </span>
                      )}
                    </h3>
                    <p className="text-gray-600 text-sm">{task.description}</p>
                    <div className="flex items-center mt-1">
                      <span className="text-accent font-bold">+{task.reward} coins</span>
                      <span className="text-gray-400 mx-2">•</span>
                      <span className="text-gray-500 text-sm">+{Math.floor(task.reward / 10)} XP</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end space-y-2">
                  {status === 'available' && (
                    <motion.button
                      onClick={() => handleTaskClick(task)}
                      disabled={task.type === 'ads' && !canWatchAds()}
                      className={`px-4 py-2 rounded-xl font-bold transition-all ${
                        task.type === 'ads' && !canWatchAds()
                          ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                          : 'bg-primary text-white hover:bg-primary/90'
                      }`}
                      whileTap={{ scale: 0.95 }}
                      whileHover={{ scale: task.type === 'ads' && !canWatchAds() ? 1 : 1.05 }}
                    >
                      {getTaskButtonText(task.type, task.id)}
                    </motion.button>
                  )}

                  {status === 'completed' && !showTimer && (
                    <motion.button
                      onClick={() => handleClaim(task)}
                      className="bg-accent text-dark px-4 py-2 rounded-xl font-bold hover:bg-accent/90 transition-all pulse-glow"
                      whileTap={{ scale: 0.95 }}
                      whileHover={{ scale: 1.05 }}
                      animate={{ scale: [1, 1.05, 1] }}
                      transition={{ duration: 1, repeat: Infinity }}
                    >
                      💰 Claim
                    </motion.button>
                  )}

                  {showTimer && (
                    <div className="bg-gray-100 px-4 py-2 rounded-xl">
                      <span className="font-bold text-gray-600">⏱️ {timer}s</span>
                    </div>
                  )}

                  {status === 'claimed' && (
                    <div className="bg-green-100 text-green-600 px-4 py-2 rounded-xl font-bold">
                      ✅ Claimed
                    </div>
                  )}
                </div>
              </div>

              {/* Progress indicator for completing tasks */}
              {isCompleting && showTimer && (
                <div className="mt-3">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <motion.div
                      className="bg-primary h-2 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${((10 - timer!) / 10) * 100}%` }}
                      transition={{ duration: 0.1 }}
                    />
                  </div>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {tasks.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📋</div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">No tasks available</h3>
          <p className="text-gray-600">Check back later for new tasks!</p>
        </div>
      )}

      {/* Monotag Ad Container */}
      <div 
        id="monotag-ad" 
        className={`fixed inset-0 z-50 bg-black bg-opacity-75 flex items-center justify-center ${
          completingTask && timerTaskId ? 'block' : 'hidden'
        }`}
      >
        <div className="bg-white rounded-2xl p-6 max-w-sm mx-4">
          <div className="text-center">
            <div className="text-4xl mb-4">📺</div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">Watching Ad</h3>
            <p className="text-gray-600 mb-4">
              Please wait while the ad loads and plays...
            </p>
            {timer !== null && (
              <div className="bg-primary text-white px-4 py-2 rounded-lg font-bold">
                ⏱️ {timer}s remaining
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Coin fly animation container */}
      <AnimatePresence>
        {/* This would contain the coin fly animation */}
      </AnimatePresence>
    </div>
  );
};

export default Task;