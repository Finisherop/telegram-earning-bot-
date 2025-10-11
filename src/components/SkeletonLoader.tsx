'use client';

import { motion } from 'framer-motion';

interface SkeletonLoaderProps {
  variant?: 'dashboard' | 'profile' | 'tasks' | 'referral' | 'shop';
  className?: string;
}

const SkeletonLoader = ({ variant = 'dashboard', className = '' }: SkeletonLoaderProps) => {
  const shimmerAnimation = {
    initial: { backgroundPosition: '-200px 0' },
    animate: { backgroundPosition: '200px 0' },
  };

  const ShimmerDiv = ({ width = 'w-full', height = 'h-4', className: shimmerClass = '' }: {
    width?: string;
    height?: string;
    className?: string;
  }) => (
    <motion.div
      className={`${width} ${height} bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded ${shimmerClass}`}
      style={{
        backgroundSize: '400px 100%',
      }}
      initial="initial"
      animate="animate"
      variants={shimmerAnimation}
      transition={{
        duration: 1.5,
        ease: 'linear',
        repeat: Infinity,
      }}
    />
  );

  const DashboardSkeleton = () => (
    <div className={`p-4 space-y-6 ${className}`}>
      {/* Header Stats Skeleton */}
      <div className="bg-gradient-to-r from-gray-300 to-gray-400 rounded-2xl p-6">
        <div className="flex justify-between items-center mb-4">
          <div className="space-y-2">
            <ShimmerDiv width="w-32" height="h-6" className="bg-white/30" />
            <ShimmerDiv width="w-20" height="h-4" className="bg-white/20" />
          </div>
          <ShimmerDiv width="w-16" height="h-8" className="bg-white/30 rounded-full" />
        </div>
        
        <div className="grid grid-cols-3 gap-4 mb-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="text-center">
              <ShimmerDiv width="w-16" height="h-8" className="bg-white/30 mx-auto mb-2" />
              <ShimmerDiv width="w-12" height="h-3" className="bg-white/20 mx-auto" />
            </div>
          ))}
        </div>
        
        {/* XP Progress Skeleton */}
        <div>
          <div className="flex justify-between mb-2">
            <ShimmerDiv width="w-20" height="h-3" className="bg-white/20" />
            <ShimmerDiv width="w-16" height="h-3" className="bg-white/20" />
          </div>
          <ShimmerDiv width="w-full" height="h-2" className="bg-white/20 rounded-full" />
        </div>
      </div>

      {/* Daily Claim Skeleton */}
      <div className="bg-white rounded-2xl p-6 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div className="space-y-2">
            <ShimmerDiv width="w-32" height="h-6" />
            <ShimmerDiv width="w-40" height="h-4" />
          </div>
          <ShimmerDiv width="w-20" height="h-10" className="rounded-xl" />
        </div>
        
        {/* Daily Calendar Skeleton */}
        <div className="flex justify-center space-x-2">
          {[...Array(7)].map((_, i) => (
            <ShimmerDiv key={i} width="w-8" height="h-8" className="rounded-lg" />
          ))}
        </div>
      </div>

      {/* Farming Skeleton */}
      <div className="bg-white rounded-2xl p-6 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div className="space-y-2">
            <ShimmerDiv width="w-28" height="h-6" />
            <ShimmerDiv width="w-36" height="h-4" />
          </div>
          <ShimmerDiv width="w-24" height="h-10" className="rounded-xl" />
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between">
            <ShimmerDiv width="w-16" height="h-3" />
            <ShimmerDiv width="w-12" height="h-3" />
          </div>
          <ShimmerDiv width="w-full" height="h-3" className="rounded-full" />
          <ShimmerDiv width="w-32" height="h-3" className="mx-auto" />
        </div>
      </div>
    </div>
  );

  const ProfileSkeleton = () => (
    <div className={`p-4 space-y-6 ${className}`}>
      {/* Profile Header Skeleton */}
      <div className="bg-gradient-to-r from-gray-300 to-gray-400 rounded-2xl p-6">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <ShimmerDiv width="w-20" height="h-20" className="bg-white/30 rounded-full" />
          </div>
          <div className="flex-1 space-y-2">
            <ShimmerDiv width="w-32" height="h-6" className="bg-white/30" />
            <ShimmerDiv width="w-24" height="h-4" className="bg-white/20" />
            <ShimmerDiv width="w-28" height="h-4" className="bg-white/20" />
          </div>
        </div>
      </div>

      {/* Withdrawal Statistics Skeleton */}
      <div className="bg-white rounded-2xl p-6 shadow-lg">
        <ShimmerDiv width="w-48" height="h-6" className="mb-4" />
        
        <div className="grid grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-gray-50 rounded-xl p-4 text-center">
              <ShimmerDiv width="w-12" height="h-8" className="mx-auto mb-2" />
              <ShimmerDiv width="w-20" height="h-4" className="mx-auto" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const TasksSkeleton = () => (
    <div className={`p-4 space-y-4 ${className}`}>
      {/* Tasks Header */}
      <div className="space-y-2">
        <ShimmerDiv width="w-32" height="h-8" />
        <ShimmerDiv width="w-48" height="h-4" />
      </div>

      {/* Task Cards */}
      {[...Array(5)].map((_, i) => (
        <div key={i} className="bg-white rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 flex-1">
              <ShimmerDiv width="w-12" height="h-12" className="rounded-xl" />
              <div className="space-y-2 flex-1">
                <ShimmerDiv width="w-32" height="h-5" />
                <ShimmerDiv width="w-48" height="h-4" />
                <div className="flex items-center space-x-2">
                  <ShimmerDiv width="w-16" height="h-4" />
                  <ShimmerDiv width="w-20" height="h-4" />
                </div>
              </div>
            </div>
            <ShimmerDiv width="w-20" height="h-8" className="rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );

  const ReferralSkeleton = () => (
    <div className={`p-4 space-y-6 ${className}`}>
      {/* Referral Stats */}
      <div className="bg-white rounded-2xl p-6 shadow-lg">
        <ShimmerDiv width="w-40" height="h-6" className="mb-4" />
        
        <div className="grid grid-cols-2 gap-4">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="text-center">
              <ShimmerDiv width="w-16" height="h-8" className="mx-auto mb-2" />
              <ShimmerDiv width="w-20" height="h-4" className="mx-auto" />
            </div>
          ))}
        </div>
      </div>

      {/* Referral Link */}
      <div className="bg-white rounded-2xl p-6 shadow-lg">
        <ShimmerDiv width="w-32" height="h-6" className="mb-4" />
        <div className="space-y-3">
          <ShimmerDiv width="w-full" height="h-12" className="rounded-xl" />
          <ShimmerDiv width="w-32" height="h-10" className="rounded-xl mx-auto" />
        </div>
      </div>

      {/* Referral List */}
      <div className="bg-white rounded-2xl p-6 shadow-lg">
        <ShimmerDiv width="w-36" height="h-6" className="mb-4" />
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center space-x-3">
              <ShimmerDiv width="w-10" height="h-10" className="rounded-full" />
              <div className="flex-1">
                <ShimmerDiv width="w-24" height="h-4" className="mb-1" />
                <ShimmerDiv width="w-16" height="h-3" />
              </div>
              <ShimmerDiv width="w-12" height="h-4" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const ShopSkeleton = () => (
    <div className={`p-4 space-y-6 ${className}`}>
      {/* Section Toggle Skeleton */}
      <div className="bg-white rounded-2xl p-2 shadow-lg">
        <div className="flex">
          {[...Array(2)].map((_, i) => (
            <ShimmerDiv key={i} width="flex-1" height="h-12" className="rounded-xl mx-1" />
          ))}
        </div>
      </div>

      {/* VIP Status Skeleton */}
      <div className="bg-white rounded-2xl p-6 shadow-lg">
        <ShimmerDiv width="w-24" height="h-6" className="mb-4" />
        <div className="text-center py-4">
          <ShimmerDiv width="w-16" height="w-16" className="mx-auto mb-3 rounded-full" />
          <ShimmerDiv width="w-32" height="h-6" className="mx-auto mb-2" />
          <ShimmerDiv width="w-40" height="h-4" className="mx-auto" />
        </div>
      </div>

      {/* VIP Cards Skeleton */}
      <div className="space-y-4">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="bg-gradient-to-r from-gray-300 to-gray-400 rounded-2xl p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="space-y-2">
                <ShimmerDiv width="w-32" height="h-6" className="bg-white/30" />
                <ShimmerDiv width="w-28" height="h-4" className="bg-white/20" />
              </div>
              <div className="text-right space-y-1">
                <ShimmerDiv width="w-20" height="h-6" className="bg-white/30" />
                <ShimmerDiv width="w-12" height="h-3" className="bg-white/20" />
              </div>
            </div>

            <div className="space-y-2 mb-6">
              {[...Array(5)].map((_, j) => (
                <ShimmerDiv key={j} width="w-48" height="h-4" className="bg-white/20" />
              ))}
            </div>

            <ShimmerDiv width="w-full" height="h-12" className="bg-white/30 rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  );

  switch (variant) {
    case 'profile':
      return <ProfileSkeleton />;
    case 'tasks':
      return <TasksSkeleton />;
    case 'referral':
      return <ReferralSkeleton />;
    case 'shop':
      return <ShopSkeleton />;
    case 'dashboard':
    default:
      return <DashboardSkeleton />;
  }
};

export default SkeletonLoader;