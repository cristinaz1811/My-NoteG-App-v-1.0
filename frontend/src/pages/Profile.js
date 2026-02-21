import React, { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { authService } from '../services/api';

const Profile = () => {
    const { user, logout } = useContext(AuthContext);
    const navigate = useNavigate();
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [confirmText, setConfirmText] = useState('');
    const [deleting, setDeleting] = useState(false);
    const [error, setError] = useState('');

    const handleDeleteAccount = async () => {
        if (confirmText !== 'DELETE') return;
        
        setDeleting(true);
        setError('');
        try {
            await authService.deleteAccount();
            logout();
            navigate('/');
        } catch (err) {
            console.error('Error deleting account:', err);
            setError(err.response?.data?.error || 'Failed to delete account');
            setDeleting(false);
        }
    };

    if (!user) {
        navigate('/login');
        return null;
    }

    return (
        <div className="min-h-screen pt-28 pb-12 px-6" style={{ background: 'var(--bg-color)' }}>
            <div className="max-w-2xl mx-auto space-y-8">
                {/* Profile Header */}
                <div className="surface-card rounded-2xl p-8">
                    <div className="flex items-center gap-6">
                        <div 
                            className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold text-white flex-shrink-0"
                            style={{ 
                                background: user.role === 'professor' 
                                    ? 'linear-gradient(135deg, #a1609d, #b88ab5)' 
                                    : 'linear-gradient(135deg, #fef483, #a1609d)' 
                            }}
                        >
                            {user.username?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-white">{user.username}</h1>
                            <p className="text-gray-400">{user.email}</p>
                            <span 
                                className="inline-block mt-2 px-3 py-1 rounded-full text-xs font-medium"
                                style={{ 
                                    background: user.role === 'professor' ? 'rgba(161, 96, 157, 0.2)' : 'rgba(254, 244, 131, 0.2)',
                                    color: user.role === 'professor' ? '#b88ab5' : '#fef483'
                                }}
                            >
                                {user.role === 'professor' ? 'Professor' : user.role === 'admin' ? 'Admin' : 'Student'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Danger Zone */}
                <div className="rounded-2xl p-8 border border-red-500/20" style={{ background: 'rgba(239, 68, 68, 0.05)' }}>
                    <h2 className="text-xl font-bold text-red-400 mb-2">Danger Zone</h2>
                    <p className="text-gray-400 text-sm mb-6">
                        Permanently delete your account and all associated data. This action cannot be undone. 
                        All your course enrollments, exercise progress, submissions, and time tracking data will be erased.
                    </p>

                    {!showDeleteConfirm ? (
                        <button
                            onClick={() => setShowDeleteConfirm(true)}
                            className="px-6 py-2.5 rounded-xl text-red-400 border border-red-500/30 hover:bg-red-500/10 transition-all cursor-pointer bg-transparent font-medium"
                        >
                            Delete Account
                        </button>
                    ) : (
                        <div className="space-y-4 p-5 rounded-xl border border-red-500/30" style={{ background: 'rgba(239, 68, 68, 0.08)' }}>
                            <p className="text-sm text-red-300 font-medium">
                                Are you absolutely sure? Type <span className="font-mono bg-red-500/20 px-2 py-0.5 rounded">DELETE</span> to confirm.
                            </p>
                            <input
                                type="text"
                                value={confirmText}
                                onChange={(e) => setConfirmText(e.target.value)}
                                placeholder="Type DELETE to confirm"
                                className="w-full px-4 py-2.5 rounded-lg bg-black/30 border border-red-500/30 text-white placeholder-gray-500 focus:outline-none focus:border-red-500"
                                autoFocus
                            />
                            {error && (
                                <p className="text-sm text-red-400">{error}</p>
                            )}
                            <div className="flex gap-3">
                                <button
                                    onClick={handleDeleteAccount}
                                    disabled={confirmText !== 'DELETE' || deleting}
                                    className={`px-6 py-2.5 rounded-xl font-medium transition-all cursor-pointer border-none ${
                                        confirmText === 'DELETE' && !deleting
                                            ? 'bg-red-600 hover:bg-red-700 text-white'
                                            : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                                    }`}
                                >
                                    {deleting ? 'Deleting...' : 'Permanently Delete Account'}
                                </button>
                                <button
                                    onClick={() => { setShowDeleteConfirm(false); setConfirmText(''); setError(''); }}
                                    className="px-6 py-2.5 rounded-xl text-gray-300 hover:bg-white/5 transition-colors border border-white/10 bg-transparent cursor-pointer font-medium"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Profile;
