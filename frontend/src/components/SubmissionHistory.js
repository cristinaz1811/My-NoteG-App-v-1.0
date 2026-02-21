import React, { useState, useEffect, useRef, useCallback } from 'react';

// ── Minimal diff engine (line-level, Myers-like LCS) ────────────────────────
function computeDiff(oldText, newText) {
    const oldLines = (oldText || '').split('\n');
    const newLines = (newText || '').split('\n');

    // LCS table
    const m = oldLines.length;
    const n = newLines.length;
    const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            dp[i][j] = oldLines[i - 1] === newLines[j - 1]
                ? dp[i - 1][j - 1] + 1
                : Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
    }

    // Back-track to produce diff hunks
    const result = [];
    let i = m, j = n;
    const stack = [];
    while (i > 0 || j > 0) {
        if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
            stack.push({ type: 'equal', line: oldLines[i - 1] });
            i--; j--;
        } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
            stack.push({ type: 'add', line: newLines[j - 1] });
            j--;
        } else {
            stack.push({ type: 'remove', line: oldLines[i - 1] });
            i--;
        }
    }
    stack.reverse().forEach(h => result.push(h));
    return result;
}

// ── Diff viewer ─────────────────────────────────────────────────────────────
const DiffView = ({ oldCode, newCode, oldLabel, newLabel }) => {
    const hunks = computeDiff(oldCode, newCode);
    const stats = { added: 0, removed: 0 };
    hunks.forEach(h => { if (h.type === 'add') stats.added++; if (h.type === 'remove') stats.removed++; });

    let oldLineNum = 0;
    let newLineNum = 0;

    return (
        <div className="rounded-lg border border-white/10 overflow-hidden">
            {/* Diff header */}
            <div className="flex items-center justify-between px-3 py-2 bg-white/5 border-b border-white/10 text-xs text-gray-400">
                <div className="flex items-center gap-3">
                    <span className="text-gray-500">{oldLabel}</span>
                    <span className="text-gray-600">→</span>
                    <span className="text-gray-300">{newLabel}</span>
                </div>
                <div className="flex items-center gap-2">
                    {stats.added > 0 && <span className="text-green-400 font-mono">+{stats.added}</span>}
                    {stats.removed > 0 && <span className="text-red-400 font-mono">-{stats.removed}</span>}
                    {stats.added === 0 && stats.removed === 0 && <span className="text-gray-500">No changes</span>}
                </div>
            </div>
            {/* Diff lines */}
            <div className="overflow-x-auto max-h-[400px] overflow-y-auto font-mono text-xs leading-5">
                {hunks.map((hunk, idx) => {
                    let leftNum = '', rightNum = '';
                    if (hunk.type === 'equal') { oldLineNum++; newLineNum++; leftNum = oldLineNum; rightNum = newLineNum; }
                    else if (hunk.type === 'remove') { oldLineNum++; leftNum = oldLineNum; }
                    else { newLineNum++; rightNum = newLineNum; }

                    return (
                        <div
                            key={idx}
                            className={`flex ${
                                hunk.type === 'add'
                                    ? 'bg-green-500/10'
                                    : hunk.type === 'remove'
                                    ? 'bg-red-500/10'
                                    : ''
                            }`}
                        >
                            <span className="w-10 text-right pr-2 select-none text-gray-600 border-r border-white/5 flex-shrink-0">
                                {leftNum}
                            </span>
                            <span className="w-10 text-right pr-2 select-none text-gray-600 border-r border-white/5 flex-shrink-0">
                                {rightNum}
                            </span>
                            <span className={`w-5 text-center flex-shrink-0 select-none ${
                                hunk.type === 'add' ? 'text-green-400' : hunk.type === 'remove' ? 'text-red-400' : 'text-gray-700'
                            }`}>
                                {hunk.type === 'add' ? '+' : hunk.type === 'remove' ? '-' : ' '}
                            </span>
                            <span className={`flex-1 px-2 whitespace-pre ${
                                hunk.type === 'add' ? 'text-green-300' : hunk.type === 'remove' ? 'text-red-300' : 'text-gray-400'
                            }`}>
                                {hunk.line}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// ── Main component ──────────────────────────────────────────────────────────
const SubmissionHistory = ({ exerciseId, exerciseService, starterCode, onLoadCode }) => {
    const [submissions, setSubmissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedIdx, setSelectedIdx] = useState(null);
    const [compareIdx, setCompareIdx] = useState(null);
    const [viewMode, setViewMode] = useState('timeline'); // 'timeline' | 'diff' | 'playback'
    const [playbackIdx, setPlaybackIdx] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [playSpeed, setPlaySpeed] = useState(2000);
    const playTimerRef = useRef(null);

    useEffect(() => {
        loadSubmissions();
    }, [exerciseId]);

    const loadSubmissions = async () => {
        setLoading(true);
        try {
            const res = await exerciseService.getUserSubmissionsWithCode(exerciseId);
            // API returns newest-first; reverse for chronological order
            const sorted = [...res.data].reverse();
            setSubmissions(sorted);
            if (sorted.length > 0) {
                setSelectedIdx(sorted.length - 1); // latest
                setPlaybackIdx(0);
            }
        } catch (err) {
            console.error('Error loading submission history:', err);
        } finally {
            setLoading(false);
        }
    };

    // ── Playback controls ────────────────────────────────────────────────────
    const stopPlayback = useCallback(() => {
        setIsPlaying(false);
        if (playTimerRef.current) {
            clearInterval(playTimerRef.current);
            playTimerRef.current = null;
        }
    }, []);

    const startPlayback = useCallback(() => {
        if (submissions.length < 2) return;
        setIsPlaying(true);
        setPlaybackIdx(prev => (prev >= submissions.length - 1 ? 0 : prev));
        playTimerRef.current = setInterval(() => {
            setPlaybackIdx(prev => {
                if (prev >= submissions.length - 1) {
                    stopPlayback();
                    return prev;
                }
                return prev + 1;
            });
        }, playSpeed);
    }, [submissions.length, playSpeed, stopPlayback]);

    useEffect(() => {
        return () => { if (playTimerRef.current) clearInterval(playTimerRef.current); };
    }, []);

    // Stop playback when speed changes
    useEffect(() => {
        if (isPlaying) {
            stopPlayback();
            startPlayback();
        }
    }, [playSpeed]);

    const formatDate = (dateStr) => {
        const d = new Date(dateStr);
        return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
    };

    const getStatusInfo = (sub) => {
        if (sub.status === 'passed') return { icon: '✓', color: 'text-green-400', bg: 'bg-green-500' };
        if (sub.status === 'failed') return { icon: '✗', color: 'text-red-400', bg: 'bg-red-500' };
        if (sub.status === 'error') return { icon: '!', color: 'text-amber-400', bg: 'bg-amber-500' };
        return { icon: '?', color: 'text-gray-400', bg: 'bg-gray-500' };
    };

    // ── Loading / Empty  ─────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                <div className="w-6 h-6 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin mb-3"></div>
                <span className="text-xs">Loading history…</span>
            </div>
        );
    }

    if (submissions.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                <div className="text-3xl mb-3 opacity-40">📝</div>
                <p className="text-sm">No submissions yet</p>
                <p className="text-xs text-gray-600 mt-1">Submit your solution to start tracking history</p>
            </div>
        );
    }

    // ── Render ───────────────────────────────────────────────────────────────
    return (
        <div className="flex flex-col h-full">
            {/* Tab bar */}
            <div className="flex items-center gap-1 px-3 pt-3 pb-2 border-b border-white/5">
                {[
                    { key: 'timeline', label: 'Timeline', icon: '📋' },
                    { key: 'diff', label: 'Diff', icon: '🔀' },
                    { key: 'playback', label: 'Playback', icon: '▶' },
                ].map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => { setViewMode(tab.key); stopPlayback(); }}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
                            viewMode === tab.key
                                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                                : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                        }`}
                    >
                        <span>{tab.icon}</span> {tab.label}
                    </button>
                ))}
                <span className="ml-auto text-[10px] text-gray-600">{submissions.length} submission{submissions.length !== 1 ? 's' : ''}</span>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-3">
                {/* ═══════════════════ TIMELINE ═══════════════════ */}
                {viewMode === 'timeline' && (
                    <div className="relative">
                        {/* Vertical line */}
                        <div className="absolute left-[15px] top-2 bottom-2 w-px bg-white/10"></div>

                        <div className="space-y-1">
                            {[...submissions].reverse().map((sub, revIdx) => {
                                const idx = submissions.length - 1 - revIdx;
                                const si = getStatusInfo(sub);
                                const isSelected = selectedIdx === idx;

                                return (
                                    <div
                                        key={sub.id}
                                        className={`relative flex items-start gap-3 p-2.5 rounded-lg cursor-pointer transition-all ${
                                            isSelected ? 'bg-indigo-500/10 border border-indigo-500/20' : 'hover:bg-white/[0.03]'
                                        }`}
                                        onClick={() => setSelectedIdx(idx)}
                                    >
                                        {/* Dot */}
                                        <div className={`w-[11px] h-[11px] rounded-full flex-shrink-0 mt-1 border-2 border-[#0d0f15] ${si.bg} z-10`}></div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between mb-0.5">
                                                <span className={`text-xs font-semibold ${si.color}`}>
                                                    {si.icon} {sub.status === 'passed' ? 'Passed' : sub.status === 'failed' ? 'Failed' : sub.status}
                                                </span>
                                                <span className="text-[10px] text-gray-600">{formatDate(sub.submitted_at)}</span>
                                            </div>
                                            <div className="flex items-center gap-3 text-[10px] text-gray-500">
                                                <span>Score: <span className="text-gray-300">{Number(sub.score).toFixed(0)}%</span></span>
                                                <span>Tests: <span className="text-gray-300">{sub.tests_passed}/{sub.tests_total}</span></span>
                                                {sub.execution_time && <span>{sub.execution_time}ms</span>}
                                                <span className="text-gray-600">#{idx + 1}</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Selected submission code preview */}
                        {selectedIdx !== null && submissions[selectedIdx] && (
                            <div className="mt-4 rounded-lg border border-white/10 overflow-hidden">
                                <div className="flex items-center justify-between px-3 py-2 bg-white/5 border-b border-white/10">
                                    <span className="text-xs text-gray-400">
                                        Submission #{selectedIdx + 1}
                                    </span>
                                    <button
                                        onClick={() => onLoadCode && onLoadCode(submissions[selectedIdx].code)}
                                        className="text-[10px] px-2 py-1 rounded bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 transition-colors"
                                        title="Load this code into the editor"
                                    >
                                        Load in Editor
                                    </button>
                                </div>
                                <pre className="p-3 text-xs font-mono text-gray-300 overflow-x-auto max-h-[300px] overflow-y-auto leading-5 whitespace-pre">
                                    {submissions[selectedIdx].code}
                                </pre>
                            </div>
                        )}
                    </div>
                )}

                {/* ═══════════════════ DIFF VIEW ═══════════════════ */}
                {viewMode === 'diff' && (
                    <div>
                        {/* Selectors */}
                        <div className="flex items-center gap-2 mb-3">
                            <div className="flex-1">
                                <label className="text-[10px] text-gray-500 uppercase tracking-wide mb-1 block">From</label>
                                <select
                                    value={compareIdx ?? ''}
                                    onChange={e => setCompareIdx(e.target.value === '' ? null : Number(e.target.value))}
                                    className="w-full bg-white/5 border border-white/10 rounded-md text-xs text-gray-300 px-2 py-1.5 focus:outline-none focus:border-indigo-500/50"
                                >
                                    <option value="">Starter code</option>
                                    {submissions.map((sub, idx) => (
                                        <option key={sub.id} value={idx}>
                                            #{idx + 1} — {sub.status} ({Number(sub.score).toFixed(0)}%)
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <span className="text-gray-600 mt-4">→</span>
                            <div className="flex-1">
                                <label className="text-[10px] text-gray-500 uppercase tracking-wide mb-1 block">To</label>
                                <select
                                    value={selectedIdx ?? submissions.length - 1}
                                    onChange={e => setSelectedIdx(Number(e.target.value))}
                                    className="w-full bg-white/5 border border-white/10 rounded-md text-xs text-gray-300 px-2 py-1.5 focus:outline-none focus:border-indigo-500/50"
                                >
                                    {submissions.map((sub, idx) => (
                                        <option key={sub.id} value={idx}>
                                            #{idx + 1} — {sub.status} ({Number(sub.score).toFixed(0)}%)
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Quick buttons for consecutive diffs */}
                        {submissions.length > 1 && (
                            <div className="flex flex-wrap gap-1 mb-3">
                                {submissions.slice(1).map((sub, i) => {
                                    const isActive = compareIdx === i && selectedIdx === i + 1;
                                    return (
                                        <button
                                            key={i}
                                            onClick={() => { setCompareIdx(i); setSelectedIdx(i + 1); }}
                                            className={`text-[10px] px-2 py-1 rounded transition-all ${
                                                isActive
                                                    ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                                                    : 'bg-white/5 text-gray-500 hover:text-gray-300 hover:bg-white/10'
                                            }`}
                                        >
                                            #{i + 1} → #{i + 2}
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        {/* Diff output */}
                        <DiffView
                            oldCode={compareIdx === null ? (starterCode || '') : submissions[compareIdx]?.code || ''}
                            newCode={submissions[selectedIdx ?? submissions.length - 1]?.code || ''}
                            oldLabel={compareIdx === null ? 'Starter Code' : `#${compareIdx + 1}`}
                            newLabel={`#${(selectedIdx ?? submissions.length - 1) + 1}`}
                        />
                    </div>
                )}

                {/* ═══════════════════ PLAYBACK ═══════════════════ */}
                {viewMode === 'playback' && (
                    <div>
                        {/* Controls */}
                        <div className="flex items-center gap-2 mb-3 p-2 rounded-lg bg-white/5 border border-white/10">
                            <button
                                onClick={() => { stopPlayback(); setPlaybackIdx(0); }}
                                className="p-1.5 rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                                title="Restart"
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" transform="rotate(180 12 12)"/></svg>
                            </button>
                            <button
                                onClick={() => { stopPlayback(); setPlaybackIdx(i => Math.max(0, i - 1)); }}
                                disabled={playbackIdx === 0}
                                className="p-1.5 rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors disabled:opacity-30"
                                title="Previous"
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
                            </button>
                            <button
                                onClick={isPlaying ? stopPlayback : startPlayback}
                                className={`p-1.5 rounded transition-colors ${
                                    isPlaying ? 'bg-indigo-500/20 text-indigo-300' : 'hover:bg-white/10 text-gray-400 hover:text-white'
                                }`}
                                title={isPlaying ? 'Pause' : 'Play'}
                            >
                                {isPlaying ? (
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                                ) : (
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                                )}
                            </button>
                            <button
                                onClick={() => { stopPlayback(); setPlaybackIdx(i => Math.min(submissions.length - 1, i + 1)); }}
                                disabled={playbackIdx >= submissions.length - 1}
                                className="p-1.5 rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors disabled:opacity-30"
                                title="Next"
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
                            </button>
                            <button
                                onClick={() => { stopPlayback(); setPlaybackIdx(submissions.length - 1); }}
                                className="p-1.5 rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                                title="Jump to end"
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
                            </button>

                            {/* Speed selector */}
                            <div className="ml-auto flex items-center gap-1">
                                <span className="text-[10px] text-gray-500">Speed:</span>
                                {[{ label: '1×', val: 3000 }, { label: '2×', val: 2000 }, { label: '3×', val: 1000 }].map(s => (
                                    <button
                                        key={s.val}
                                        onClick={() => setPlaySpeed(s.val)}
                                        className={`text-[10px] px-1.5 py-0.5 rounded ${
                                            playSpeed === s.val ? 'bg-indigo-500/20 text-indigo-300' : 'text-gray-500 hover:text-gray-300'
                                        }`}
                                    >
                                        {s.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Progress bar */}
                        <div className="mb-3">
                            <div className="flex items-center justify-between text-[10px] text-gray-500 mb-1">
                                <span>Submission #{playbackIdx + 1} of {submissions.length}</span>
                                <span>{formatDate(submissions[playbackIdx]?.submitted_at)}</span>
                            </div>
                            <div className="relative w-full h-2 bg-white/5 rounded-full overflow-hidden cursor-pointer"
                                onClick={(e) => {
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    const pct = (e.clientX - rect.left) / rect.width;
                                    const idx = Math.round(pct * (submissions.length - 1));
                                    stopPlayback();
                                    setPlaybackIdx(Math.max(0, Math.min(submissions.length - 1, idx)));
                                }}
                            >
                                <div
                                    className="absolute h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-300"
                                    style={{ width: `${submissions.length > 1 ? (playbackIdx / (submissions.length - 1)) * 100 : 100}%` }}
                                ></div>
                                {/* Step markers */}
                                {submissions.map((sub, idx) => {
                                    const si = getStatusInfo(sub);
                                    return (
                                        <div
                                            key={idx}
                                            className={`absolute w-2.5 h-2.5 rounded-full top-1/2 -translate-y-1/2 -translate-x-1/2 border border-[#0d0f15] ${
                                                idx <= playbackIdx ? si.bg : 'bg-white/20'
                                            }`}
                                            style={{ left: `${submissions.length > 1 ? (idx / (submissions.length - 1)) * 100 : 50}%` }}
                                        ></div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Submission info card */}
                        {submissions[playbackIdx] && (
                            <div className="mb-3">
                                <div className={`rounded-lg p-3 border ${
                                    submissions[playbackIdx].status === 'passed'
                                        ? 'border-green-500/20 bg-green-500/5'
                                        : 'border-red-500/20 bg-red-500/5'
                                }`}>
                                    <div className="flex items-center justify-between mb-1">
                                        <span className={`text-xs font-semibold ${getStatusInfo(submissions[playbackIdx]).color}`}>
                                            {getStatusInfo(submissions[playbackIdx]).icon} Attempt #{playbackIdx + 1}
                                        </span>
                                        <span className="text-xs text-gray-400">{Number(submissions[playbackIdx].score).toFixed(0)}%</span>
                                    </div>
                                    <div className="text-[10px] text-gray-500">
                                        Tests: {submissions[playbackIdx].tests_passed}/{submissions[playbackIdx].tests_total}
                                        {submissions[playbackIdx].execution_time && ` · ${submissions[playbackIdx].execution_time}ms`}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Diff from previous */}
                        {playbackIdx > 0 ? (
                            <DiffView
                                oldCode={submissions[playbackIdx - 1]?.code || ''}
                                newCode={submissions[playbackIdx]?.code || ''}
                                oldLabel={`#${playbackIdx}`}
                                newLabel={`#${playbackIdx + 1}`}
                            />
                        ) : (
                            <DiffView
                                oldCode={starterCode || ''}
                                newCode={submissions[0]?.code || ''}
                                oldLabel="Starter Code"
                                newLabel="#1"
                            />
                        )}

                        {/* Load this submission */}
                        {submissions[playbackIdx] && onLoadCode && (
                            <button
                                onClick={() => onLoadCode(submissions[playbackIdx].code)}
                                className="mt-3 w-full py-2 rounded-lg bg-indigo-500/20 text-indigo-300 text-xs font-medium hover:bg-indigo-500/30 transition-colors"
                            >
                                Load Submission #{playbackIdx + 1} in Editor
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default SubmissionHistory;
