import React, { useState, useEffect } from 'react';
import { Shield, Plus, Key, AlertCircle } from 'lucide-react';
import * as api from '../services/api';
import { useAuth } from '../hooks/useAuth';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import Spinner from '../components/ui/Spinner';

export default function AdminPage() {
  const { user, logout } = useAuth();
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // Create user form
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('member');
  const [createError, setCreateError] = useState(null);

  // Reset password form
  const [resetPassword, setResetPassword] = useState('');
  const [resetError, setResetError] = useState(null);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const data = await api.getUsers();
      setUsers(data.users || data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setCreateError(null);
    if (!newUsername.trim() || !newPassword.trim()) {
      setCreateError('Username and password are required');
      return;
    }
    try {
      await api.createUser(newUsername.trim(), newPassword, newRole);
      setShowCreateModal(false);
      setNewUsername('');
      setNewPassword('');
      setNewRole('member');
      fetchUsers();
    } catch (err) {
      setCreateError(err.message);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setResetError(null);
    if (!resetPassword.trim()) {
      setResetError('New password is required');
      return;
    }
    try {
      await api.resetPassword(selectedUser.id, resetPassword);
      setShowResetModal(false);
      setResetPassword('');
      setSelectedUser(null);
    } catch (err) {
      setResetError(err.message);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield size={24} className="text-terracotta" />
          <h1 className="text-2xl font-bold text-brown">Admin Panel</h1>
        </div>
        <Button onClick={() => setShowCreateModal(true)} size="sm">
          <Plus size={16} />
          Add User
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 text-red-600 text-sm">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Users table */}
      <div className="bg-white rounded-2xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-cream-dark bg-cream/50">
                <th className="text-left px-6 py-3 text-sm font-semibold text-brown">Username</th>
                <th className="text-left px-6 py-3 text-sm font-semibold text-brown">Role</th>
                <th className="text-left px-6 py-3 text-sm font-semibold text-brown">Created</th>
                <th className="text-right px-6 py-3 text-sm font-semibold text-brown">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-dark/50">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-cream/30 transition-colors">
                  <td className="px-6 py-4 text-brown-light font-medium">
                    {u.username}
                    {u.id === user?.id && (
                      <span className="ml-2 text-xs text-warm-gray">(you)</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`
                      px-2.5 py-0.5 rounded-full text-xs font-medium
                      ${u.role === 'admin'
                        ? 'bg-terracotta/10 text-terracotta'
                        : 'bg-sage-light/50 text-sage-dark'
                      }
                    `}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-warm-gray">
                    {u.created_at ? new Date(u.created_at).toLocaleDateString() : '-'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => {
                        setSelectedUser(u);
                        setShowResetModal(true);
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-warm-gray hover:text-brown rounded-lg hover:bg-cream-dark transition-colors min-h-[36px]"
                    >
                      <Key size={14} />
                      Reset Password
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Account section */}
      <div className="bg-white rounded-2xl shadow-md p-6">
        <h2 className="text-lg font-bold text-brown mb-4">Your Account</h2>
        <p className="text-brown-light text-sm mb-4">
          Logged in as <span className="font-semibold">{user?.username}</span> ({user?.role})
        </p>
        <Button variant="ghost" onClick={logout}>
          Sign Out
        </Button>
      </div>

      {/* Create user modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setCreateError(null);
          setNewUsername('');
          setNewPassword('');
          setNewRole('member');
        }}
        title="Create New User"
        size="sm"
      >
        <form onSubmit={handleCreateUser} className="space-y-4">
          {createError && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 text-red-600 text-sm">
              <AlertCircle size={16} />
              <span>{createError}</span>
            </div>
          )}
          <Input
            label="Username"
            value={newUsername}
            onChange={(e) => setNewUsername(e.target.value)}
            placeholder="Enter username"
            autoFocus
          />
          <Input
            label="Password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Enter password"
          />
          <div>
            <label className="block text-sm font-semibold text-brown mb-1">Role</label>
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-cream-dark text-brown bg-white focus:outline-none focus:border-terracotta transition-colors duration-200 min-h-[44px]"
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="ghost" type="button" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button type="submit">
              Create User
            </Button>
          </div>
        </form>
      </Modal>

      {/* Reset password modal */}
      <Modal
        isOpen={showResetModal}
        onClose={() => {
          setShowResetModal(false);
          setResetError(null);
          setResetPassword('');
          setSelectedUser(null);
        }}
        title={`Reset Password: ${selectedUser?.username}`}
        size="sm"
      >
        <form onSubmit={handleResetPassword} className="space-y-4">
          {resetError && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 text-red-600 text-sm">
              <AlertCircle size={16} />
              <span>{resetError}</span>
            </div>
          )}
          <Input
            label="New Password"
            type="password"
            value={resetPassword}
            onChange={(e) => setResetPassword(e.target.value)}
            placeholder="Enter new password"
            autoFocus
          />
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="ghost" type="button" onClick={() => setShowResetModal(false)}>
              Cancel
            </Button>
            <Button type="submit">
              Reset Password
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
