import React, { useState, useEffect } from 'react';
import { Shield, Plus, Key, Trash2, Pencil, AlertCircle, Download, Users, Link2, Copy, Check } from 'lucide-react';
import * as api from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { useLicense } from '../hooks/useLicense';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import Spinner from '../components/ui/Spinner';
import useDocumentTitle from '../hooks/useDocumentTitle';

export default function AdminPage() {
  useDocumentTitle('Admin');

  const { user, logout } = useAuth();
  const { tier, max_users: maxUsers } = useLicense();
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // Create user form
  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('member');
  const [createError, setCreateError] = useState(null);

  // Edit user form
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState('member');
  const [editError, setEditError] = useState(null);

  // Reset password form
  const [resetPassword, setResetPassword] = useState('');
  const [resetError, setResetError] = useState(null);

  // Reset link
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [resetLink, setResetLink] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);
  const [linkLoading, setLinkLoading] = useState(false);

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
      await api.createUser(newUsername.trim(), newPassword, newRole, newEmail.trim() || undefined);
      setShowCreateModal(false);
      setNewUsername('');
      setNewEmail('');
      setNewPassword('');
      setNewRole('member');
      fetchUsers();
    } catch (err) {
      setCreateError(err.message);
    }
  };

  const handleEditUser = async (e) => {
    e.preventDefault();
    setEditError(null);
    try {
      await api.updateUser(selectedUser.id, { email: editEmail.trim(), role: editRole });
      setShowEditModal(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (err) {
      setEditError(err.message);
    }
  };

  const handleDeleteUser = (u) => {
    setSelectedUser(u);
    setShowDeleteModal(true);
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

  const handleGenerateLink = async (u) => {
    setSelectedUser(u);
    setLinkLoading(true);
    setLinkCopied(false);
    setShowLinkModal(true);
    try {
      const data = await api.generateResetLink(u.id);
      const link = `${window.location.origin}/reset-password/${data.token}`;
      setResetLink(link);
    } catch (err) {
      setResetLink('');
      setResetError(err.message);
    } finally {
      setLinkLoading(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(resetLink);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      // Fallback for non-HTTPS
      const input = document.createElement('input');
      input.value = resetLink;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
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
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield size={24} className="text-terracotta" />
          <h1 className="text-2xl font-bold text-brown">Admin Panel</h1>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={async () => {
              try {
                const data = await api.exportRecipes();
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `cookslate-export-${new Date().toISOString().slice(0, 10)}.json`;
                a.click();
                URL.revokeObjectURL(url);
              } catch {
                setError('Failed to export recipes');
              }
            }}
          >
            <Download size={16} />
            Export Recipes
          </Button>
          {maxUsers && (
            <span className="flex items-center gap-1 text-sm text-warm-gray">
              <Users size={14} />
              {users.filter(u => !u.is_demo).length}/{maxUsers} users
            </span>
          )}
          <Button
            onClick={() => setShowCreateModal(true)}
            size="sm"
            disabled={maxUsers && users.filter(u => !u.is_demo).length >= maxUsers}
            title={maxUsers && users.filter(u => !u.is_demo).length >= maxUsers ? `User limit reached (${maxUsers}). Upgrade to Household for up to 5 users.` : undefined}
          >
            <Plus size={16} />
            Add User
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 text-red-600 text-sm">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Users table */}
      <div className="bg-surface rounded-2xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-cream-dark bg-surface-raised">
                <th className="text-left px-6 py-3 text-sm font-semibold text-brown">Username</th>
                <th className="text-left px-6 py-3 text-sm font-semibold text-brown">Email</th>
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
                  <td className="px-6 py-4 text-sm text-warm-gray">
                    {u.email || '-'}
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
                        setEditEmail(u.email || '');
                        setEditRole(u.role);
                        setShowEditModal(true);
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-warm-gray hover:text-brown rounded-lg hover:bg-cream-dark transition-colors min-h-[36px]"
                    >
                      <Pencil size={14} />
                      Edit
                    </button>
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
                    <button
                      onClick={() => handleGenerateLink(u)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-warm-gray hover:text-brown rounded-lg hover:bg-cream-dark transition-colors min-h-[36px]"
                    >
                      <Link2 size={14} />
                      Reset Link
                    </button>
                    {u.id !== user?.id && (
                      <button
                        onClick={() => handleDeleteUser(u)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-warm-gray hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors min-h-[36px]"
                      >
                        <Trash2 size={14} />
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Account section */}
      <div className="bg-surface rounded-2xl shadow-md p-6">
        <h2 className="text-lg font-bold text-brown mb-4">Your Account</h2>
        <p className="text-brown-light text-sm mb-4">
          Logged in as <span className="font-semibold">{user?.username}</span> ({user?.role})
        </p>
        <Button variant="ghost" onClick={logout}>
          Sign Out
        </Button>
      </div>

      {/* Delete user confirmation modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => { setShowDeleteModal(false); setSelectedUser(null); }}
        title="Delete User"
        size="sm"
      >
        <p className="text-brown-light mb-6">
          Are you sure you want to delete user &ldquo;{selectedUser?.username}&rdquo;? This cannot be undone.
        </p>
        <div className="flex gap-3 justify-end">
          <Button variant="ghost" onClick={() => { setShowDeleteModal(false); setSelectedUser(null); }}>
            Cancel
          </Button>
          <Button variant="danger" onClick={async () => {
            try {
              await api.deleteUser(selectedUser.id);
              fetchUsers();
            } catch (err) {
              setError(err.message);
            }
            setShowDeleteModal(false);
            setSelectedUser(null);
          }}>
            Delete
          </Button>
        </div>
      </Modal>

      {/* Create user modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setCreateError(null);
          setNewUsername('');
          setNewEmail('');
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
            label="Email"
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="Enter email (optional)"
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
              className="w-full px-4 py-2.5 rounded-xl border border-cream-dark text-brown bg-surface focus:outline-none focus:border-terracotta transition-colors duration-200 min-h-[44px]"
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

      {/* Edit user modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditError(null);
          setSelectedUser(null);
        }}
        title={`Edit User: ${selectedUser?.username}`}
        size="sm"
      >
        <form onSubmit={handleEditUser} className="space-y-4">
          {editError && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 text-red-600 text-sm">
              <AlertCircle size={16} />
              <span>{editError}</span>
            </div>
          )}
          <Input
            label="Email"
            type="email"
            value={editEmail}
            onChange={(e) => setEditEmail(e.target.value)}
            placeholder="Enter email"
            autoFocus
          />
          <div>
            <label className="block text-sm font-semibold text-brown mb-1">Role</label>
            <select
              value={editRole}
              onChange={(e) => setEditRole(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-cream-dark text-brown bg-surface focus:outline-none focus:border-terracotta transition-colors duration-200 min-h-[44px]"
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="ghost" type="button" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button type="submit">
              Save Changes
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

      {/* Reset link modal */}
      <Modal
        isOpen={showLinkModal}
        onClose={() => {
          setShowLinkModal(false);
          setResetLink('');
          setResetError(null);
          setSelectedUser(null);
        }}
        title={`Reset Link: ${selectedUser?.username}`}
        size="sm"
      >
        <div className="space-y-4">
          {linkLoading ? (
            <div className="flex justify-center py-4">
              <Spinner />
            </div>
          ) : resetLink ? (
            <>
              <p className="text-sm text-brown-light">
                Send this link to <span className="font-semibold">{selectedUser?.username}</span>. It expires in 24 hours and can only be used once.
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={resetLink}
                  className="flex-1 px-3 py-2 bg-cream rounded-xl text-sm text-brown border border-cream-dark select-all"
                  onClick={(e) => e.target.select()}
                />
                <button
                  onClick={handleCopyLink}
                  className="shrink-0 p-2 rounded-xl bg-terracotta text-white hover:bg-terracotta-dark transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center"
                  aria-label="Copy link"
                >
                  {linkCopied ? <Check size={18} /> : <Copy size={18} />}
                </button>
              </div>
              {linkCopied && (
                <p className="text-sm text-green-600 font-medium">Copied to clipboard!</p>
              )}
            </>
          ) : (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 text-red-600 text-sm">
              <AlertCircle size={16} />
              <span>{resetError || 'Failed to generate link'}</span>
            </div>
          )}
          <div className="flex justify-end pt-2">
            <Button variant="ghost" onClick={() => { setShowLinkModal(false); setResetLink(''); setSelectedUser(null); }}>
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
