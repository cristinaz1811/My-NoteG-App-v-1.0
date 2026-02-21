import React, { useEffect, useState, useContext } from 'react';
import { Link } from 'react-router-dom';
import { gamificationService } from '../services/api';
import { AuthContext } from '../context/AuthContext';

const Leaderboard = () => {
    const { user } = useContext(AuthContext);
    const [leaderboard, setLeaderboard] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sortType, setSortType] = useState('xp');
    const [userRank, setUserRank] = useState(null);
    const [myProfile, setMyProfile] = useState(null);
    const [activeTab, setActiveTab] = useState('leaderboard'); // 'leaderboard' | 'badges'
    const [badges, setBadges] = useState([]);
    const [badgesLoading, setBadgesLoading] = useState(false);

    useEffect(() => {
        loadLeaderboard();
        loadMyProfile();
    }, [sortType]);

    const loadLeaderboard = async () => {
        setLoading(true);
        try {
            const response = await gamificationService.getLeaderboard(sortType);
            setLeaderboard(response.data.leaderboard);
            setUserRank(response.data.userRank);
        } catch (error) {
            console.error('Error loading leaderboard:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadMyProfile = async () => {
        try {
            const response = await gamificationService.getMyGamification();
            setMyProfile(response.data);
        } catch (error) {
            console.error('Error loading profile:', error);
        }
    };

    const loadBadges = async () => {
        if (badges.length > 0) return;
        setBadgesLoading(true);
        try {
            const response = await gamificationService.getAllBadges();
            setBadges(response.data.badges);
        } catch (error) {
            console.error('Error loading badges:', error);
        } finally {
            setBadgesLoading(false);
        }
    };

    const handleTabChange = (tab) => {
        setActiveTab(tab);
        if (tab === 'badges') loadBadges();
    };

    const getRankBadge = (rank) => {
        if (rank === 1) return { icon: '🥇', color: '#ffd700', bg: 'rgba(255, 215, 0, 0.15)' };
        if (rank === 2) return { icon: '🥈', color: '#c0c0c0', bg: 'rgba(192, 192, 192, 0.15)' };
        if (rank === 3) return { icon: '🥉', color: '#cd7f32', bg: 'rgba(205, 127, 50, 0.15)' };
        return { icon: rank, color: '#9ca3af', bg: 'transparent' };
    };

    const getLevelColor = (level) => {
        if (level >= 20) return '#ffd700';
        if (level >= 15) return '#ff6b6b';
        if (level >= 10) return '#a1609d';
        if (level >= 5) return '#fef483';
        return '#9ca3af';
    };

    const sortOptions = [
        { value: 'xp', label: 'Total XP', icon: '⚡' },
        { value: 'level', label: 'Level', icon: '📊' },
        { value: 'streak', label: 'Streak', icon: '🔥' },
        { value: 'exercises', label: 'Exercises', icon: '✅' },
    ];

    const badgeCategories = ['exercises', 'special', 'streaks', 'courses'];
    const categoryLabels = {
        exercises: '🎯 Exercise Milestones',
        special: '✨ Special Achievements',
        streaks: '🔥 Streak Milestones',
        courses: '📚 Course Milestones',
    };

    return (
        <div className="min-h-screen pt-28 pb-12 px-6" style={{ background: 'var(--bg-color)' }}>
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="text-center mb-10">
                    <h1 className="text-4xl font-bold mb-2">
                        <span className="gradient-text">Leaderboard</span>
                    </h1>
                    <p className="text-gray-400">Compete, earn XP, and climb the ranks</p>
                </div>

                {/* Stats Cards (if user is logged in) */}
                {myProfile && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                        <div className="surface-card rounded-xl p-4 text-center">
                            <div className="text-3xl font-bold" style={{ color: getLevelColor(myProfile.xp.level) }}>
                                {myProfile.xp.level}
                            </div>
                            <div className="text-xs text-gray-400 mt-1">Level</div>
                            <div className="mt-2 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                                <div 
                                    className="h-full rounded-full transition-all" 
                                    style={{ 
                                        width: `${myProfile.xp.progressPercent}%`,
                                        background: 'linear-gradient(90deg, #a1609d, #fef483)' 
                                    }}
                                />
                            </div>
                        </div>
                        <div className="surface-card rounded-xl p-4 text-center">
                            <div className="text-3xl font-bold text-[#fef483]">
                                {myProfile.xp.total.toLocaleString()}
                            </div>
                            <div className="text-xs text-gray-400 mt-1">Total XP</div>
                        </div>
                        <div className="surface-card rounded-xl p-4 text-center">
                            <div className="text-3xl font-bold text-orange-400">
                                {myProfile.streak.current}🔥
                            </div>
                            <div className="text-xs text-gray-400 mt-1">Day Streak</div>
                        </div>
                        <div className="surface-card rounded-xl p-4 text-center">
                            <div className="text-3xl font-bold text-green-400">
                                {myProfile.stats.exercisesCompleted}
                            </div>
                            <div className="text-xs text-gray-400 mt-1">Exercises Done</div>
                        </div>
                    </div>
                )}

                {/* Tab Navigation */}
                <div className="flex gap-2 mb-6">
                    <button
                        onClick={() => handleTabChange('leaderboard')}
                        className={`px-6 py-2.5 rounded-xl font-medium transition-all border-none cursor-pointer ${
                            activeTab === 'leaderboard' 
                                ? 'gradient-bg text-white' 
                                : 'bg-white/5 text-gray-400 hover:bg-white/10'
                        }`}
                    >
                        🏆 Leaderboard
                    </button>
                    <button
                        onClick={() => handleTabChange('badges')}
                        className={`px-6 py-2.5 rounded-xl font-medium transition-all border-none cursor-pointer ${
                            activeTab === 'badges' 
                                ? 'gradient-bg text-white' 
                                : 'bg-white/5 text-gray-400 hover:bg-white/10'
                        }`}
                    >
                        🎖️ Badges
                    </button>
                </div>

                {/* Leaderboard Tab */}
                {activeTab === 'leaderboard' && (
                    <>
                        {/* Sort Options */}
                        <div className="flex gap-2 mb-6 flex-wrap">
                            {sortOptions.map(opt => (
                                <button
                                    key={opt.value}
                                    onClick={() => setSortType(opt.value)}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border-none cursor-pointer ${
                                        sortType === opt.value
                                            ? 'bg-[#a1609d]/20 text-[#a1609d] ring-1 ring-[#a1609d]/30'
                                            : 'bg-white/5 text-gray-400 hover:bg-white/10'
                                    }`}
                                >
                                    {opt.icon} {opt.label}
                                </button>
                            ))}
                        </div>

                        {/* User's rank highlight */}
                        {userRank && (
                            <div className="surface-card rounded-xl p-4 mb-4 flex items-center gap-4" 
                                 style={{ border: '1px solid rgba(161, 96, 157, 0.3)' }}>
                                <div className="text-sm text-gray-400">Your Rank</div>
                                <div className="text-2xl font-bold text-[#fef483]">#{userRank}</div>
                                <div className="text-sm text-gray-500">out of {leaderboard.length}+ students</div>
                            </div>
                        )}

                        {/* Leaderboard Table */}
                        {loading ? (
                            <div className="text-center py-16">
                                <div className="w-12 h-12 border-4 border-[#a1609d] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                                <p className="text-gray-400">Loading leaderboard...</p>
                            </div>
                        ) : leaderboard.length === 0 ? (
                            <div className="text-center py-16 surface-card rounded-2xl">
                                <div className="text-6xl mb-4">🏆</div>
                                <h3 className="text-xl font-bold mb-2">No entries yet</h3>
                                <p className="text-gray-400">Complete exercises to earn XP and appear on the leaderboard!</p>
                                <Link to="/courses" className="inline-block mt-4 btn-primary px-6 py-2 rounded-lg no-underline">
                                    Browse Courses
                                </Link>
                            </div>
                        ) : (
                            <div className="surface-card rounded-2xl overflow-hidden">
                                {/* Header */}
                                <div className="grid grid-cols-12 gap-4 px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-white/5">
                                    <div className="col-span-1">Rank</div>
                                    <div className="col-span-4">Student</div>
                                    <div className="col-span-2 text-right">Level</div>
                                    <div className="col-span-2 text-right">XP</div>
                                    <div className="col-span-1 text-right">🔥</div>
                                    <div className="col-span-2 text-right">Exercises</div>
                                </div>

                                {/* Rows */}
                                {leaderboard.map((entry, index) => {
                                    const rank = parseInt(entry.rank);
                                    const rankInfo = getRankBadge(rank);
                                    const isCurrentUser = user?.id === entry.id;

                                    return (
                                        <div 
                                            key={entry.id}
                                            className={`grid grid-cols-12 gap-4 px-6 py-4 items-center transition-colors ${
                                                isCurrentUser 
                                                    ? 'bg-[#a1609d]/10 border-l-2 border-[#a1609d]' 
                                                    : 'hover:bg-white/5 border-l-2 border-transparent'
                                            } ${index < leaderboard.length - 1 ? 'border-b border-white/5' : ''}`}
                                        >
                                            {/* Rank */}
                                            <div className="col-span-1">
                                                {rank <= 3 ? (
                                                    <div 
                                                        className="w-8 h-8 rounded-full flex items-center justify-center text-lg"
                                                        style={{ background: rankInfo.bg }}
                                                    >
                                                        {rankInfo.icon}
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-500 font-mono text-sm pl-1.5">{rank}</span>
                                                )}
                                            </div>

                                            {/* Username */}
                                            <div className="col-span-4 flex items-center gap-3">
                                                <div 
                                                    className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                                                    style={{ background: 'linear-gradient(135deg, #a1609d, #fef483)' }}
                                                >
                                                    {entry.username?.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <span className={`font-medium ${isCurrentUser ? 'text-[#fef483]' : 'text-white'}`}>
                                                        {entry.username}
                                                    </span>
                                                    {isCurrentUser && (
                                                        <span className="ml-2 text-xs text-[#a1609d]">(you)</span>
                                                    )}
                                                    {entry.badge_count > 0 && (
                                                        <span className="ml-2 text-xs text-gray-500">
                                                            🎖️ {entry.badge_count}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Level */}
                                            <div className="col-span-2 text-right">
                                                <span 
                                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold"
                                                    style={{ 
                                                        background: `${getLevelColor(entry.level)}20`,
                                                        color: getLevelColor(entry.level)
                                                    }}
                                                >
                                                    Lv.{entry.level}
                                                </span>
                                            </div>

                                            {/* XP */}
                                            <div className="col-span-2 text-right">
                                                <span className="font-mono font-medium text-[#fef483]">
                                                    {parseInt(entry.total_xp).toLocaleString()}
                                                </span>
                                                <span className="text-xs text-gray-500 ml-1">XP</span>
                                            </div>

                                            {/* Streak */}
                                            <div className="col-span-1 text-right">
                                                <span className="text-orange-400 font-medium">
                                                    {entry.current_streak || 0}
                                                </span>
                                            </div>

                                            {/* Exercises */}
                                            <div className="col-span-2 text-right">
                                                <span className="text-green-400 font-medium">
                                                    {entry.exercises_completed}
                                                </span>
                                                <span className="text-xs text-gray-500 ml-1">done</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </>
                )}

                {/* Badges Tab */}
                {activeTab === 'badges' && (
                    <>
                        {badgesLoading ? (
                            <div className="text-center py-16">
                                <div className="w-12 h-12 border-4 border-[#a1609d] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                                <p className="text-gray-400">Loading badges...</p>
                            </div>
                        ) : (
                            <div className="space-y-8">
                                {badgeCategories.map(category => {
                                    const categoryBadges = badges.filter(b => b.category === category);
                                    if (categoryBadges.length === 0) return null;

                                    return (
                                        <div key={category}>
                                            <h3 className="text-lg font-bold mb-4 text-gray-300">
                                                {categoryLabels[category]}
                                            </h3>
                                            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                                {categoryBadges.map(badge => (
                                                    <div 
                                                        key={badge.id}
                                                        className={`surface-card rounded-xl p-5 transition-all ${
                                                            badge.earned 
                                                                ? 'ring-1 ring-[#fef483]/30' 
                                                                : 'opacity-60'
                                                        }`}
                                                    >
                                                        <div className="flex items-start gap-4">
                                                            <div className={`text-3xl ${badge.earned ? '' : 'grayscale'}`}>
                                                                {badge.icon}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-2">
                                                                    <h4 className="font-bold text-white text-sm">
                                                                        {badge.name}
                                                                    </h4>
                                                                    {badge.earned && (
                                                                        <span className="text-xs text-green-400">✓</span>
                                                                    )}
                                                                </div>
                                                                <p className="text-xs text-gray-400 mt-0.5">
                                                                    {badge.description}
                                                                </p>
                                                                {badge.xp_reward > 0 && (
                                                                    <span className="text-xs text-[#fef483] mt-1 inline-block">
                                                                        +{badge.xp_reward} XP
                                                                    </span>
                                                                )}
                                                                {/* Progress bar */}
                                                                {!badge.earned && (
                                                                    <div className="mt-2">
                                                                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                                                                            <span>{badge.currentValue}/{badge.requirement_value}</span>
                                                                            <span>{badge.progress}%</span>
                                                                        </div>
                                                                        <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                                                                            <div 
                                                                                className="h-full rounded-full transition-all"
                                                                                style={{ 
                                                                                    width: `${badge.progress}%`,
                                                                                    background: 'linear-gradient(90deg, #a1609d, #fef483)' 
                                                                                }}
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                )}
                                                                {badge.earned && badge.earned_at && (
                                                                    <div className="text-xs text-gray-500 mt-1">
                                                                        Earned {new Date(badge.earned_at).toLocaleDateString()}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </>
                )}

                {/* XP Guide */}
                <div className="mt-12 surface-card rounded-2xl p-6">
                    <h3 className="text-lg font-bold mb-4 text-gray-300">💡 How to Earn XP</h3>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[
                            { icon: '✅', label: 'Complete an exercise', xp: '+50 XP' },
                            { icon: '🎯', label: 'Perfect score first try', xp: '+30 XP' },
                            { icon: '📈', label: 'Medium difficulty bonus', xp: '+25 XP' },
                            { icon: '🔥', label: 'Hard difficulty bonus', xp: '+50 XP' },
                            { icon: '📅', label: 'First exercise of the day', xp: '+20 XP' },
                            { icon: '🔥', label: 'Streak bonus (per day)', xp: '+5 XP' },
                            { icon: '🎓', label: 'Complete a course', xp: '+200 XP' },
                            { icon: '🎖️', label: 'Earn badges', xp: 'Varies' },
                        ].map((item, idx) => (
                            <div key={idx} className="flex items-center gap-3 text-sm">
                                <span className="text-lg">{item.icon}</span>
                                <span className="text-gray-400 flex-1">{item.label}</span>
                                <span className="text-[#fef483] font-mono font-medium">{item.xp}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Leaderboard;
