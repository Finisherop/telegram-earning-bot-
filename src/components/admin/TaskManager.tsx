'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Task } from '@/types';
import { createTask, getTasks } from '@/lib/firebaseService';
import toast from 'react-hot-toast';

const TaskManager = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    reward: 0,
    url: '',
    type: 'link' as 'link' | 'ads' | 'social' | 'referral' | 'farming' | 'daily',
    isActive: true
  });

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const tasksData = await getTasks();
      setTasks(tasksData);
    } catch (error) {
      console.error('[TaskManager] Failed to load tasks:', error);
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = async () => {
    if (!formData.title.trim() || !formData.reward || formData.reward <= 0) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (formData.type === 'link' && !formData.url.trim()) {
      toast.error('URL is required for link tasks');
      return;
    }

    setCreating(true);
    try {
      await createTask({
        title: formData.title.trim(),
        description: formData.description.trim() || formData.title.trim(),
        reward: formData.reward,
        url: formData.url.trim(),
        type: formData.type,
        isActive: formData.isActive
      });

      toast.success('✅ Task created successfully!');
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        reward: 0,
        url: '',
        type: 'link',
        isActive: true
      });
      
      setShowCreateForm(false);
      await loadTasks(); // Reload tasks
    } catch (error) {
      console.error('[TaskManager] Failed to create task:', error);
      toast.error('❌ Failed to create task');
    } finally {
      setCreating(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      reward: 0,
      url: '',
      type: 'link',
      isActive: true
    });
    setShowCreateForm(false);
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-6 shadow-lg animate-pulse">
              <div className="w-48 h-6 bg-gray-200 rounded mb-4" />
              <div className="space-y-3">
                <div className="w-full h-4 bg-gray-200 rounded" />
                <div className="w-3/4 h-4 bg-gray-200 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-blue-600 rounded-2xl p-6 text-white">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold mb-2">📋 Task Management</h2>
            <p className="text-white/90">Create and manage tasks for users</p>
          </div>
          <motion.button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="bg-white/20 hover:bg-white/30 px-6 py-3 rounded-xl font-bold transition-all"
            whileTap={{ scale: 0.95 }}
          >
            {showCreateForm ? '❌ Cancel' : '➕ Add New Task'}
          </motion.button>
        </div>
      </div>

      {/* Create Task Form */}
      {showCreateForm && (
        <motion.div
          className="bg-white rounded-2xl p-6 shadow-lg border-l-4 border-green-500"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <h3 className="text-xl font-bold text-gray-800 mb-6">Create New Task</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Task Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Task Name *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Enter task name"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            {/* Reward */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reward (Coins) *
              </label>
              <input
                type="number"
                value={formData.reward}
                onChange={(e) => setFormData({ ...formData, reward: parseInt(e.target.value) || 0 })}
                placeholder="Enter reward amount"
                min="1"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            {/* Task Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Task Type
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="link">Link Visit</option>
                <option value="social">Social Media</option>
                <option value="ads">Advertisement</option>
                <option value="referral">Referral</option>
              </select>
            </div>

            {/* URL */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Link URL {formData.type === 'link' && '*'}
              </label>
              <input
                type="url"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                placeholder="https://example.com"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            {/* Description */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description (Optional)
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter task description"
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            {/* Active Status */}
            <div className="md:col-span-2">
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-5 h-5 text-primary rounded focus:ring-2 focus:ring-primary"
                />
                <span className="text-sm font-medium text-gray-700">
                  Task is active (users can see and complete this task)
                </span>
              </label>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-4 mt-6">
            <motion.button
              onClick={resetForm}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all"
              whileTap={{ scale: 0.95 }}
            >
              Cancel
            </motion.button>
            <motion.button
              onClick={handleCreateTask}
              disabled={creating}
              className={`px-6 py-3 rounded-xl font-bold transition-all ${
                creating
                  ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                  : 'bg-primary text-white hover:bg-primary/90'
              }`}
              whileTap={{ scale: creating ? 1 : 0.95 }}
            >
              {creating ? '⏳ Creating...' : '💾 Save Task'}
            </motion.button>
          </div>
        </motion.div>
      )}

      {/* Tasks List */}
      <div className="bg-white rounded-2xl p-6 shadow-lg">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-gray-800">Existing Tasks</h3>
          <div className="text-sm text-gray-600">
            Total: {tasks.length} tasks
          </div>
        </div>

        {tasks.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">📋</div>
            <h4 className="text-xl font-bold text-gray-800 mb-2">No Tasks Yet</h4>
            <p className="text-gray-600">Create your first task to get started!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {tasks.map((task) => (
              <motion.div
                key={task.id}
                className="border border-gray-200 rounded-xl p-4 hover:bg-gray-50 transition-all"
                whileHover={{ scale: 1.01 }}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h4 className="font-bold text-gray-800">{task.title}</h4>
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                        task.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {task.isActive ? 'Active' : 'Inactive'}
                      </span>
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-bold">
                        {task.type.toUpperCase()}
                      </span>
                    </div>
                    
                    {task.description && (
                      <p className="text-gray-600 text-sm mb-2">{task.description}</p>
                    )}
                    
                    {task.url && (
                      <p className="text-blue-600 text-sm mb-2 break-all">
                        🔗 {task.url}
                      </p>
                    )}
                    
                    <div className="text-xs text-gray-500">
                      Created: {task.createdAt.toLocaleDateString()}
                    </div>
                  </div>
                  
                  <div className="text-right ml-4">
                    <div className="text-2xl font-bold text-green-600">
                      💰 {task.reward}
                    </div>
                    <div className="text-xs text-gray-600">coins</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskManager;