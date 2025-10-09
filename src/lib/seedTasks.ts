import { createTask } from './firebaseService';
import { Task } from '@/types';

const sampleTasks: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    title: 'Follow our Telegram Channel',
    description: 'Join our official Telegram channel for updates and news',
    reward: 50,
    type: 'link',
    url: 'https://t.me/your_channel',
    isActive: true,
  },
  {
    title: 'Watch Advertisement',
    description: 'Watch a short ad to earn coins',
    reward: 10,
    type: 'ads',
    isActive: true,
  },
  {
    title: 'Follow us on Twitter',
    description: 'Follow our Twitter account and stay updated',
    reward: 30,
    type: 'social',
    url: 'https://twitter.com/your_account',
    isActive: true,
  },
  {
    title: 'Join our Discord Server',
    description: 'Join our community Discord server',
    reward: 40,
    type: 'link',
    url: 'https://discord.gg/your_server',
    isActive: true,
  },
  {
    title: 'Subscribe to YouTube Channel',
    description: 'Subscribe to our YouTube channel for video content',
    reward: 60,
    type: 'social',
    url: 'https://youtube.com/your_channel',
    isActive: true,
  },
  {
    title: 'Watch Rewarded Video',
    description: 'Watch a rewarded video advertisement',
    reward: 15,
    type: 'ads',
    isActive: true,
  },
  {
    title: 'Visit our Website',
    description: 'Check out our official website',
    reward: 25,
    type: 'link',
    url: 'https://your-website.com',
    isActive: true,
  },
  {
    title: 'Invite 5 Friends',
    description: 'Invite 5 friends to earn bonus coins',
    reward: 200,
    type: 'referral',
    isActive: true,
  },
];

export const seedTasks = async () => {
  try {
    console.log('Seeding tasks...');
    
    for (const task of sampleTasks) {
      await createTask(task);
      console.log(`Created task: ${task.title}`);
    }
    
    console.log('Tasks seeded successfully!');
  } catch (error) {
    console.error('Error seeding tasks:', error);
  }
};

// Call this function once to seed your database with sample tasks
// seedTasks();