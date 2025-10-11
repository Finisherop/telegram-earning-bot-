'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { WithdrawalRequest, User } from '@/types';
import { getWithdrawalRequests, updateWithdrawalStatus, getUser } from '@/lib/firebaseService';
import toast from 'react-hot-toast';

interface WithdrawalWithUser extends WithdrawalRequest {
  user?: User | null;
}

const AdminApprovals = () => {
  const [withdrawals, setWithdrawals] = useState<WithdrawalWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'paid'>('pending');

  useEffect(() => {
    loadWithdrawals();
  }, []);

  const loadWithdrawals = async () => {
    try {
      const withdrawalsData = await getWithdrawalRequests();
      
      // Fetch user data for each withdrawal
      const withdrawalsWithUsers = await Promise.all(
        withdrawalsData.map(async (withdrawal) => {
          try {
            const user = await getUser(withdrawal.userId);
            return { ...withdrawal, user };
          } catch (error) {
            return withdrawal;
          }
        })
      );
      
      setWithdrawals(withdrawalsWithUsers);
    } catch (error) {
      toast.error('Failed to load withdrawal requests');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (withdrawalId: string) => {
    setProcessing(withdrawalId);
    try {
      await updateWithdrawalStatus(withdrawalId, 'approved', 'Approved by admin');
      toast.success('Withdrawal request approved!');
      await loadWithdrawals();
    } catch (error) {
      toast.error('Failed to approve withdrawal');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (withdrawalId: string, reason: string = 'Rejected by admin') => {
    setProcessing(withdrawalId);
    try {
      await updateWithdrawalStatus(withdrawalId, 'rejected', reason);
      toast.success('Withdrawal request rejected');
      await loadWithdrawals();
    } catch (error) {
      toast.error('Failed to reject withdrawal');
    } finally {
      setProcessing(null);
    }
  };

  const handleMarkPaid = async (withdrawalId: string) => {
    setProcessing(withdrawalId);
    try {
      await updateWithdrawalStatus(withdrawalId, 'paid', 'Payment completed');
      toast.success('Withdrawal marked as paid!');
      await loadWithdrawals();
    } catch (error) {
      toast.error('Failed to mark as paid');
    } finally {
      setProcessing(null);
    }
  };

  const filteredWithdrawals = withdrawals.filter(withdrawal => {
    if (filter === 'all') return true;
    return withdrawal.status === filter;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-blue-100 text-blue-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'paid': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return '⏳';
      case 'approved': return '✅';
      case 'rejected': return '❌';
      case 'paid': return '💰';
      default: return '❓';
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-6 shadow-lg animate-pulse">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <div className="w-32 h-4 bg-gray-200 rounded" />
                  <div className="w-48 h-4 bg-gray-200 rounded" />
                  <div className="w-24 h-4 bg-gray-200 rounded" />
                </div>
                <div className="w-20 h-8 bg-gray-200 rounded" />
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
        <h2 className="text-2xl font-bold mb-2">💸 Withdrawal Requests</h2>
        <p className="text-white/90">Manage user withdrawal requests and payments</p>
        
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="bg-white/20 px-3 py-2 rounded-lg text-center">
            <div className="font-bold">{withdrawals.filter(w => w.status === 'pending').length}</div>
            <div>Pending</div>
          </div>
          <div className="bg-white/20 px-3 py-2 rounded-lg text-center">
            <div className="font-bold">{withdrawals.filter(w => w.status === 'approved').length}</div>
            <div>Approved</div>
          </div>
          <div className="bg-white/20 px-3 py-2 rounded-lg text-center">
            <div className="font-bold">{withdrawals.filter(w => w.status === 'paid').length}</div>
            <div>Paid</div>
          </div>
          <div className="bg-white/20 px-3 py-2 rounded-lg text-center">
            <div className="font-bold">₹{withdrawals.reduce((sum, w) => sum + (w.status === 'paid' ? w.amount : 0), 0)}</div>
            <div>Total Paid</div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white rounded-2xl p-2 shadow-lg">
        <div className="flex flex-wrap gap-2">
          {(['all', 'pending', 'approved', 'rejected', 'paid'] as const).map((status) => (
            <motion.button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-xl font-medium transition-all capitalize ${
                filter === status
                  ? 'bg-primary text-white'
                  : 'text-gray-600 hover:text-primary hover:bg-gray-50'
              }`}
              whileTap={{ scale: 0.95 }}
            >
              {status} ({status === 'all' ? withdrawals.length : withdrawals.filter(w => w.status === status).length})
            </motion.button>
          ))}
        </div>
      </div>

      {/* Withdrawals List */}
      <div className="space-y-4">
        {filteredWithdrawals.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 shadow-lg text-center">
            <div className="text-6xl mb-4">💸</div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">No Withdrawal Requests</h3>
            <p className="text-gray-600">
              {filter === 'all' ? 'No withdrawal requests found' : `No ${filter} withdrawal requests`}
            </p>
          </div>
        ) : (
          filteredWithdrawals.map((withdrawal) => (
            <motion.div
              key={withdrawal.id}
              className="bg-white rounded-2xl p-6 shadow-lg"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ scale: 1.01 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between space-y-4 md:space-y-0">
                {/* User Info */}
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                    {withdrawal.user?.profilePic ? (
                      <img
                        src={withdrawal.user.profilePic}
                        alt="User"
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-primary text-xl">👤</span>
                    )}
                  </div>
                  
                  <div>
                    <h4 className="font-bold text-gray-800">
                      {withdrawal.user?.firstName} {withdrawal.user?.lastName}
                    </h4>
                    <p className="text-gray-600 text-sm">
                      @{withdrawal.user?.username || withdrawal.userId}
                    </p>
                    <p className="text-gray-500 text-xs">
                      ID: {withdrawal.userId}
                    </p>
                  </div>
                </div>

                {/* Withdrawal Details */}
                <div className="flex-1 md:mx-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Amount</p>
                      <p className="font-bold text-lg text-gray-800">₹{withdrawal.amount}</p>
                    </div>
                    
                    <div>
                      <p className="text-gray-600">UPI ID</p>
                      <p className="font-bold text-gray-800 break-all">{withdrawal.upiId}</p>
                    </div>
                    
                    <div>
                      <p className="text-gray-600">Requested</p>
                      <p className="font-bold text-gray-800">
                        {new Date(withdrawal.requestedAt).toLocaleDateString()}
                      </p>
                      <p className="text-gray-500 text-xs">
                        {new Date(withdrawal.requestedAt).toLocaleTimeString()}
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-gray-600">Status</p>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-bold ${getStatusColor(withdrawal.status)}`}>
                        {getStatusIcon(withdrawal.status)} {withdrawal.status?.toUpperCase() || ''}
                      </span>
                    </div>
                  </div>
                  
                  {withdrawal.adminNotes && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                      <p className="text-gray-600 text-sm">
                        <strong>Admin Notes:</strong> {withdrawal.adminNotes}
                      </p>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col space-y-2">
                  {withdrawal.status === 'pending' && (
                    <>
                      <motion.button
                        onClick={() => handleApprove(withdrawal.id)}
                        disabled={processing === withdrawal.id}
                        className="bg-green-500 text-white px-4 py-2 rounded-xl font-bold hover:bg-green-600 transition-all disabled:opacity-50"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        {processing === withdrawal.id ? '⏳' : '✅'} Approve
                      </motion.button>
                      
                      <motion.button
                        onClick={() => {
                          const reason = prompt('Reason for rejection (optional):');
                          if (reason !== null) {
                            handleReject(withdrawal.id, reason || 'Rejected by admin');
                          }
                        }}
                        disabled={processing === withdrawal.id}
                        className="bg-red-500 text-white px-4 py-2 rounded-xl font-bold hover:bg-red-600 transition-all disabled:opacity-50"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        {processing === withdrawal.id ? '⏳' : '❌'} Reject
                      </motion.button>
                    </>
                  )}
                  
                  {withdrawal.status === 'approved' && (
                    <motion.button
                      onClick={() => handleMarkPaid(withdrawal.id)}
                      disabled={processing === withdrawal.id}
                      className="bg-blue-500 text-white px-4 py-2 rounded-xl font-bold hover:bg-blue-600 transition-all disabled:opacity-50"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {processing === withdrawal.id ? '⏳' : '💰'} Mark Paid
                    </motion.button>
                  )}
                  
                  {(withdrawal.status === 'rejected' || withdrawal.status === 'paid') && (
                    <div className="text-center text-gray-500 text-sm py-2">
                      {withdrawal.processedAt && (
                        <>
                          Processed on<br />
                          {new Date(withdrawal.processedAt).toLocaleDateString()}
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Bulk Actions (for future implementation) */}
      {filteredWithdrawals.filter(w => w.status === 'pending').length > 0 && (
        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Bulk Actions</h3>
          <div className="flex space-x-4">
            <motion.button
              className="bg-green-500 text-white px-6 py-2 rounded-xl font-bold hover:bg-green-600 transition-all"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => toast.success('Bulk approve feature coming soon!')}
            >
              ✅ Approve All Pending
            </motion.button>
            
            <motion.button
              className="bg-blue-500 text-white px-6 py-2 rounded-xl font-bold hover:bg-blue-600 transition-all"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => toast.success('Export feature coming soon!')}
            >
              📊 Export Data
            </motion.button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminApprovals;