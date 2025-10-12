'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Task, UserTask } from '@/types';
import { 
  subscribeToTasks, 
  subscribeToUserTasks, 
  completeTask, 
  claimTask 
} from '@/lib/firebaseService';
import { 
  logConversionEvent,
  safeUpdateUserWithRetry
} from '@/lib/enhancedFirebaseService';
import { TelegramService } from '@/lib/telegram';
import { validateUserForOperation, getUserValidationError } from '@/lib/userValidation';
import toast from 'react-hot-toast';

interface EnhancedTaskProps {
  user: User;
}

const EnhancedTask = ({ user }: EnhancedTaskProps) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [userTasks, setUserTasks] = useState<UserTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [claimingTasks, setClaimingTasks] = useState<Set<string>>(new Set());

  useEffect(() => {
    console.log('[Enhanced Task] Setting up real-time subscriptions');
    
    // Subscribe to tasks
    const unsubscribeTasks = subscribeToTasks((tasksData) => {
      console.log('[Enhanced Task] Tasks updated:', tasksData.length);
      setTasks(tasksData);
      setLoading(false);
    });

    // Subscribe to user tasks
    const unsubscribeUserTasks = subscribeToUserTasks(user.telegramId, (userTasksData) => {
      console.log('[Enhanced Task] User tasks updated:', userTasksData.length);
      setUserTasks(userTasksData);
    });

    return () => {
      console.log('[Enhanced Task] Cleaning up task subscriptions');
      unsubscribeTasks();
      unsubscribeUserTasks();
    };
  }, [user.telegramId]);

  const getTaskStatus = (taskId: string): 'available' | 'completed' | 'claimed' => {
    const userTask = userTasks.find(ut => ut.taskId === taskId);
    if (!userTask) return 'available';
    return userTask.status === 'claimed' ? 'claimed' : 'completed';
  };

  const handleTaskAction = async (task: Task) => {
    const telegram = TelegramService.getInstance();
    const status = getTaskStatus(task.id);
    
    // Enhanced validation for user data using utility function
    if (!validateUserForOperation(user, 'enhanced task action')) {
      const errorMessage = getUserValidationError(user);
      toast.error(`❌ ${errorMessage}`);
      return;
    }
    
    if (status === 'claimed') {
      toast.error('Task already claimed!');
      return;
    }
    
    if (status === 'available') {
      // Complete the task
      try {
        telegram.hapticFeedback('light');
        
        if (task.type === 'link' && task.url) {
          // Open link in new tab/window
          window.open(task.url, '_blank');
          
          // Wait a moment then mark as completed
          setTimeout(async () => {
            try {
              await completeTask(user.telegramId, task.id);
              
              // Log conversion event
              await logConversionEvent(user.telegramId, 'task_completion', {
                taskId: task.id,
              });
              
              toast.success('✅ Task completed! You can now claim your reward.');
            } catch (error) {
              console.error('[Enhanced Task] Complete task error:', error);
              const errorMessage = error instanceof Error ? error.message : 'Unknown error';
              toast.error(`❌ Failed to complete task: ${errorMessage}`);
            }
          }, 2000);
        } else {
          // Mark as completed immediately for other task types
          await completeTask(user.telegramId, task.id);
          
          // Log conversion event
          await logConversionEvent(user.telegramId, 'task_completion', {
            taskId: task.id,
          });
          
          toast.success('✅ Task completed! You can now claim your reward.');
        }
      } catch (error) {
        console.error('[Enhanced Task] Task action error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        toast.error(`❌ Failed to complete task: ${errorMessage}`);
      }
    } else if (status === 'completed') {
      // Claim the task reward
      if (claimingTasks.has(task.id)) {
        return; // Already claiming
      }
      
      setClaimingTasks(prev => new Set(prev).add(task.id));
      
      try {
        telegram.hapticFeedback('heavy');
        
        const vipMultiplier = user.vipTier !== 'free' ? 1.5 : 1;
        const finalReward = Math.floor(task.reward * vipMultiplier);
        
        console.log(`[Enhanced Task] Claiming task ${task.id} for user ${user.telegramId} with reward ${finalReward}`);
        
        // Claim task and update user coins atomically
        await claimTask(user.telegramId, task.id, finalReward);
        
        // Log conversion event with enhanced data
        await logConversionEvent(user.telegramId, 'task_completion', {
          taskId: task.id,
          coinsEarned: finalReward,
        });
        
        const message = user.vipTier !== 'free' 
          ? `💰 Claimed ${finalReward} coins! 🎉 (✨ VIP bonus applied!)`
          : `💰 Claimed ${finalReward} coins! 🎉`;
        
        toast.success(message);
        console.log('[Enhanced Task] Task reward claimed successfully:', { taskId: task.id, reward: finalReward });
      } catch (error) {
        console.error('[Enhanced Task] Claim task error:', error);
        
        // Provide more specific error messages
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        
        if (errorMessage.includes('Invalid user ID')) {
          toast.error('❌ User ID is invalid. Please refresh the app.');
        } else if (errorMessage.includes('User not found')) {
          toast.error('❌ User profile not found. Please refresh the app.');
        } else if (errorMessage.includes('Task has already been claimed')) {
          toast.error('❌ This task has already been claimed.');
        } else if (errorMessage.includes('Database service unavailable')) {
          toast.error('❌ Service temporarily unavailable. Please try again.');
        } else {
          toast.error(`❌ Failed to claim reward: ${errorMessage}`);
        }
      } finally {
        setClaimingTasks(prev => {
          const newSet = new Set(prev);
          newSet.delete(task.id);
          return newSet;
        });
      }
    }
  };

  const getTaskIcon = (type: string) => {
    switch (type) {
      case 'link': return '🔗';
      case 'social': return '📱';
      case 'ads': return '📺';
      case 'referral': return '👥';
      case 'daily': return '🎁';
      case 'farming': return '🚜';
      default: return '📋';
    }
  };

  const getTaskButtonText = (task: Task) => {
    const status = getTaskStatus(task.id);
    const isClaiming = claimingTasks.has(task.id);
    
    if (isClaiming) return '⏳ Claiming...';
    if (status === 'claimed') return '✅ Claimed';
    if (status === 'completed') return '💰 Claim Reward';
    if (task.type === 'link') return '🔗 Visit Link';
    return '▶️ Start Task';
  };

  const getTaskButtonStyle = (task: Task) => {
    const status = getTaskStatus(task.id);
    const isClaiming = claimingTasks.has(task.id);
    
    if (isClaiming || status === 'claimed') {
      return 'bg-gray-200 text-gray-500 cursor-not-allowed';
    }
    if (status === 'completed') {
      return 'bg-accent text-dark hover:bg-accent/90 pulse-glow';
    }
    return 'bg-primary text-white hover:bg-primary/90';
  };

  const availableTasks = tasks.filter(task => getTaskStatus(task.id) !== 'claimed');
  const completedTasks = tasks.filter(task => getTaskStatus(task.id) === 'claimed');

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl p-6 shadow-lg animate-pulse">
            <div className="flex justify-between items-center">
              <div className="space-y-2">
                <div className="w-32 h-6 bg-gray-200 rounded" />
                <div className="w-48 h-4 bg-gray-200 rounded" />
                <div className="w-24 h-4 bg-gray-200 rounded" />
              </div>
              <div className="w-24 h-10 bg-gray-200 rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-secondary rounded-2xl p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">📋 Tasks & Rewards</h1>
        <p className="text-white/90">Complete tasks to earn coins and XP</p>
        
        {user.vipTier !== 'free' && (
          <div className="mt-4 bg-white/20 rounded-xl p-3">
            <div className="flex items-center space-x-2">
              <span className="text-accent text-xl">✨</span>
              <span className="font-bold">VIP Bonus Active!</span>
            </div>
            <p className="text-white/80 text-sm">Earn 50% more coins from all tasks</p>
          </div>
        )}
      </div>

      {/* Task Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-4 text-center shadow-lg">
          <div className="text-2xl font-bold text-primary">{availableTasks.length}</div>
          <div className="text-gray-600 text-sm">Available</div>
        </div>
        <div className="bg-white rounded-xl p-4 text-center shadow-lg">
          <div className="text-2xl font-bold text-accent">{completedTasks.length}</div>
          <div className="text-gray-600 text-sm">Completed</div>
        </div>
        <div className="bg-white rounded-xl p-4 text-center shadow-lg">
          <div className="text-2xl font-bold text-green-600">{tasks.length}</div>
          <div className="text-gray-600 text-sm">Total</div>
        </div>
      </div>

      {/* Available Tasks */}
      {availableTasks.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-gray-800">Available Tasks</h2>
          {availableTasks.map((task) => {
            const status = getTaskStatus(task.id);
            const vipMultiplier = user.vipTier !== 'free' ? 1.5 : 1;
            const finalReward = Math.floor(task.reward * vipMultiplier);
            
            return (
              <motion.div
                key={task.id}
                className="bg-white rounded-2xl p-6 shadow-lg border-l-4 border-primary"
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.2 }}
              >
                <div className="flex justify-between items-center">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="text-2xl">{getTaskIcon(task.type)}</span>
                      <h3 className="text-lg font-bold text-gray-800">{task.title}</h3>
                      {status === 'completed' && (
                        <motion.span
                          className="bg-accent text-dark px-2 py-1 rounded-full text-xs font-bold"
                          animate={{ scale: [1, 1.1, 1] }}
                          transition={{ duration: 1, repeat: Infinity }}
                        >
                          Ready to Claim!
                        </motion.span>
                      )}
                    </div>
                    <p className="text-gray-600 text-sm mb-3">{task.description}</p>
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-1">
                        <span className="text-accent font-bold">💰 {finalReward}</span>
                        <span className="text-gray-600 text-sm">coins</span>
                        {user.vipTier !== 'free' && (
                          <span className="text-accent text-xs font-bold">(+50% VIP)</span>
                        )}
                      </div>
                      <div className="flex items-center space-x-1">
                        <span className="text-primary font-bold">⭐ {Math.floor(finalReward / 10)}</span>
                        <span className="text-gray-600 text-sm">XP</span>
                      </div>
                    </div>
                  </div>
                  
                  <motion.button
                    onClick={() => handleTaskAction(task)}
                    disabled={claimingTasks.has(task.id) || status === 'claimed'}
                    className={`px-6 py-3 rounded-xl font-bold transition-all ${getTaskButtonStyle(task)}`}
                    whileTap={{ scale: 0.95 }}
                    whileHover={{ 
                      scale: (claimingTasks.has(task.id) || status === 'claimed') ? 1 : 1.05 
                    }}
                    animate={status === 'completed' ? { scale: [1, 1.05, 1] } : {}}
                    transition={{ duration: 1, repeat: status === 'completed' ? Infinity : 0 }}
                  >
                    {getTaskButtonText(task)}
                  </motion.button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Completed Tasks */}
      {completedTasks.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-gray-800">Completed Tasks</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {completedTasks.slice(0, 6).map((task) => (
              <motion.div
                key={task.id}
                className="bg-green-50 border border-green-200 rounded-xl p-4"
                whileHover={{ scale: 1.02 }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">{getTaskIcon(task.type)}</span>
                      <h4 className="font-bold text-gray-800">{task.title}</h4>
                    </div>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="text-green-600 font-bold">+{task.reward} coins</span>
                      <span className="text-green-600">✅</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
          {completedTasks.length > 6 && (
            <p className="text-center text-gray-600 text-sm">
              And {completedTasks.length - 6} more completed tasks...
            </p>
          )}
        </div>
      )}

      {/* No Tasks Available */}
      {tasks.length === 0 && !loading && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📋</div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">No Tasks Available</h3>
          <p className="text-gray-600">Check back later for new tasks and rewards!</p>
        </div>
      )}
    </div>
  );
};

export default EnhancedTask;