import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { plagiarismService } from '../services/api';

const PlagiarismReport = () => {
    const { reportId } = useParams();
    const [report, setReport] = useState(null);
    const [matches, setMatches] = useState([]);
    const [selectedMatch, setSelectedMatch] = useState(null);
    const [loading, setLoading] = useState(true);
    const [verdictLoading, setVerdictLoading] = useState(null);

    useEffect(() => {
        loadReport();
    }, [reportId]);

    const loadReport = async () => {
        try {
            const res = await plagiarismService.getReportDetails(reportId);
            setReport(res.data.report);
            setMatches(res.data.matches);
            if (res.data.matches.length > 0) {
                setSelectedMatch(res.data.matches[0]);
            }
        } catch (error) {
            console.error('Error loading report:', error);
        } finally {
            setLoading(false);
        }
    };

    const updateVerdict = async (matchId, verdict) => {
        setVerdictLoading(matchId);
        try {
            await plagiarismService.updateVerdict(matchId, verdict);
            setMatches(prev => prev.map(m => 
                m.id === matchId 
                    ? { ...m, reviewed: true, review_verdict: verdict, reviewed_at: new Date().toISOString() } 
                    : m
            ));
            if (selectedMatch?.id === matchId) {
                setSelectedMatch(prev => ({ ...prev, reviewed: true, review_verdict: verdict }));
            }
        } catch (error) {
            console.error('Error updating verdict:', error);
        } finally {
            setVerdictLoading(null);
        }
    };

    const getSeverityColor = (similarity) => {
        if (similarity >= 90) return '#ef4444';
        if (similarity >= 80) return '#f97316';
        if (similarity >= 70) return '#eab308';
        return '#22c55e';
    };

    const getSeverityLabel = (similarity) => {
        if (similarity >= 90) return 'Critical';
        if (similarity >= 80) return 'High';
        if (similarity >= 70) return 'Medium';
        return 'Low';
    };

    const getVerdictStyle = (verdict) => {
        switch (verdict) {
            case 'plagiarism': return { bg: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', label: '🚫 Plagiarism' };
            case 'coincidence': return { bg: 'rgba(34, 197, 94, 0.15)', color: '#22c55e', label: '✅ Coincidence' };
            default: return { bg: 'rgba(234, 179, 8, 0.15)', color: '#eab308', label: '⏳ Pending' };
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-[#a1609d] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-400">Loading report...</p>
                </div>
            </div>
        );
    }

    if (!report) {
        return (
            <div className="min-h-screen pt-24 pb-8 px-6">
                <div className="max-w-7xl mx-auto text-center">
                    <h1 className="text-2xl font-bold text-red-400 mb-4">Report Not Found</h1>
                    <Link to="/professor/plagiarism" className="text-[#a1609d] hover:text-[#b870ad]">
                        ← Back to Plagiarism Dashboard
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen pt-24 pb-8 px-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
                    <div>
                        <Link to="/professor/plagiarism" className="text-gray-400 hover:text-white text-sm no-underline mb-2 inline-block">
                            ← Back to Plagiarism Dashboard
                        </Link>
                        <h1 className="text-2xl sm:text-3xl font-bold">
                            📋 Report: <span className="text-[#a1609d]">{report.exercise_title}</span>
                        </h1>
                        <p className="text-gray-400 text-sm mt-1">
                            Course: {report.course_title} · Scanned {new Date(report.created_at).toLocaleString()}
                        </p>
                    </div>
                </div>

                {/* Summary Stats */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <div className="surface-card rounded-xl p-4 text-center">
                        <div className="text-2xl font-bold text-white">{report.total_submissions_compared}</div>
                        <div className="text-xs text-gray-500 mt-1">Submissions Compared</div>
                    </div>
                    <div className="surface-card rounded-xl p-4 text-center">
                        <div className="text-2xl font-bold" style={{ color: report.flagged_pairs > 0 ? '#ef4444' : '#22c55e' }}>
                            {report.flagged_pairs}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">Flagged Pairs</div>
                    </div>
                    <div className="surface-card rounded-xl p-4 text-center">
                        <div className="text-2xl font-bold" style={{ color: getSeverityColor(parseFloat(report.max_similarity)) }}>
                            {parseFloat(report.max_similarity).toFixed(1)}%
                        </div>
                        <div className="text-xs text-gray-500 mt-1">Max Similarity</div>
                    </div>
                    <div className="surface-card rounded-xl p-4 text-center">
                        <div className="text-2xl font-bold text-white">
                            {matches.filter(m => m.reviewed).length}/{matches.length}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">Reviewed</div>
                    </div>
                </div>

                {matches.length === 0 ? (
                    <div className="surface-card rounded-xl p-12 text-center">
                        <div className="text-6xl mb-4">✅</div>
                        <h2 className="text-xl font-semibold text-green-400 mb-2">No Suspicious Matches</h2>
                        <p className="text-gray-400">No submissions exceeded the similarity threshold.</p>
                    </div>
                ) : (
                    <div className="grid lg:grid-cols-3 gap-6">
                        {/* Match List */}
                        <div className="lg:col-span-1">
                            <div className="surface-card rounded-xl p-4">
                                <h3 className="text-sm font-semibold text-gray-400 mb-3">Flagged Pairs</h3>
                                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                                    {matches.map((match) => {
                                        const verdictStyle = getVerdictStyle(match.review_verdict);
                                        return (
                                            <button
                                                key={match.id}
                                                onClick={() => setSelectedMatch(match)}
                                                className={`w-full text-left p-3 rounded-lg transition-all cursor-pointer border-none`}
                                                style={{
                                                    background: selectedMatch?.id === match.id
                                                        ? 'linear-gradient(135deg, rgba(161, 96, 157, 0.3), rgba(184, 138, 181, 0.2))'
                                                        : 'var(--overlay-light)',
                                                    border: selectedMatch?.id === match.id ? '1px solid rgba(161, 96, 157, 0.5)' : '1px solid transparent'
                                                }}
                                            >
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-sm font-medium text-white">
                                                        {match.user_a_username} ↔ {match.user_b_username}
                                                    </span>
                                                    <span className="text-xs font-bold px-2 py-0.5 rounded"
                                                          style={{ background: `${getSeverityColor(parseFloat(match.similarity_score))}20`, color: getSeverityColor(parseFloat(match.similarity_score)) }}>
                                                        {parseFloat(match.similarity_score).toFixed(1)}%
                                                    </span>
                                                </div>
                                                {match.reviewed && (
                                                    <span className="text-xs px-2 py-0.5 rounded"
                                                          style={{ background: verdictStyle.bg, color: verdictStyle.color }}>
                                                        {verdictStyle.label}
                                                    </span>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Code Comparison */}
                        <div className="lg:col-span-2">
                            {selectedMatch ? (
                                <div className="space-y-4">
                                    {/* Match Info Bar */}
                                    <div className="surface-card rounded-xl p-4">
                                        <div className="flex flex-wrap items-center justify-between gap-4">
                                            <div>
                                                <h3 className="text-white font-semibold">
                                                    {selectedMatch.user_a_username} <span className="text-gray-500">vs</span> {selectedMatch.user_b_username}
                                                </h3>
                                                <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                                                    <span>Similarity: <strong className="text-sm" style={{ color: getSeverityColor(parseFloat(selectedMatch.similarity_score)) }}>
                                                        {parseFloat(selectedMatch.similarity_score).toFixed(1)}%
                                                    </strong></span>
                                                    <span>Matching tokens: {selectedMatch.matching_tokens}</span>
                                                    <span>Severity: {getSeverityLabel(parseFloat(selectedMatch.similarity_score))}</span>
                                                </div>
                                            </div>

                                            {/* Verdict Buttons */}
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => updateVerdict(selectedMatch.id, 'plagiarism')}
                                                    disabled={verdictLoading === selectedMatch.id}
                                                    className={`px-3 py-2 rounded-lg text-sm font-medium border-none cursor-pointer transition-all hover:scale-105 ${
                                                        selectedMatch.review_verdict === 'plagiarism' ? 'ring-2 ring-red-400' : ''
                                                    }`}
                                                    style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444' }}
                                                >
                                                    🚫 Plagiarism
                                                </button>
                                                <button
                                                    onClick={() => updateVerdict(selectedMatch.id, 'coincidence')}
                                                    disabled={verdictLoading === selectedMatch.id}
                                                    className={`px-3 py-2 rounded-lg text-sm font-medium border-none cursor-pointer transition-all hover:scale-105 ${
                                                        selectedMatch.review_verdict === 'coincidence' ? 'ring-2 ring-green-400' : ''
                                                    }`}
                                                    style={{ background: 'rgba(34, 197, 94, 0.2)', color: '#22c55e' }}
                                                >
                                                    ✅ Coincidence
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Side-by-side Code */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* Student A */}
                                        <div className="surface-card rounded-xl overflow-hidden">
                                            <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                                                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                                                </div>
                                                <div className="text-sm text-gray-400 font-mono">
                                                    {selectedMatch.user_a_username}
                                                </div>
                                                <div className="text-xs text-gray-600">
                                                    {selectedMatch.submitted_at_a && new Date(selectedMatch.submitted_at_a).toLocaleDateString()}
                                                </div>
                                            </div>
                                            <pre className="p-4 text-sm font-mono overflow-x-auto max-h-[500px] overflow-y-auto m-0"
                                                 style={{ color: 'var(--text-color)', background: 'var(--code-bg-dark)' }}>
                                                <code>{selectedMatch.code_a}</code>
                                            </pre>
                                        </div>

                                        {/* Student B */}
                                        <div className="surface-card rounded-xl overflow-hidden">
                                            <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                                                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                                                </div>
                                                <div className="text-sm text-gray-400 font-mono">
                                                    {selectedMatch.user_b_username}
                                                </div>
                                                <div className="text-xs text-gray-600">
                                                    {selectedMatch.submitted_at_b && new Date(selectedMatch.submitted_at_b).toLocaleDateString()}
                                                </div>
                                            </div>
                                            <pre className="p-4 text-sm font-mono overflow-x-auto max-h-[500px] overflow-y-auto m-0"
                                                 style={{ color: 'var(--text-color)', background: 'var(--code-bg-dark)' }}>
                                                <code>{selectedMatch.code_b}</code>
                                            </pre>
                                        </div>
                                    </div>

                                    {/* Similarity Breakdown */}
                                    <div className="surface-card rounded-xl p-4">
                                        <h4 className="text-sm font-semibold text-gray-400 mb-3">Similarity Breakdown</h4>
                                        <div className="grid grid-cols-3 gap-4">
                                            <div>
                                                <div className="text-xs text-gray-500 mb-1">Overall Similarity</div>
                                                <div className="w-full h-2 rounded-full bg-gray-700">
                                                    <div className="h-2 rounded-full transition-all"
                                                         style={{ width: `${parseFloat(selectedMatch.similarity_score)}%`, background: getSeverityColor(parseFloat(selectedMatch.similarity_score)) }}></div>
                                                </div>
                                                <div className="text-xs mt-1 font-bold" style={{ color: getSeverityColor(parseFloat(selectedMatch.similarity_score)) }}>
                                                    {parseFloat(selectedMatch.similarity_score).toFixed(1)}%
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-xs text-gray-500 mb-1">Matching Tokens</div>
                                                <div className="text-lg font-bold text-white">{selectedMatch.matching_tokens}</div>
                                                <div className="text-xs text-gray-500">of {Math.max(selectedMatch.total_tokens_a, selectedMatch.total_tokens_b)}</div>
                                            </div>
                                            <div>
                                                <div className="text-xs text-gray-500 mb-1">Token Counts</div>
                                                <div className="text-xs text-gray-300">
                                                    {selectedMatch.user_a_username}: {selectedMatch.total_tokens_a} tokens
                                                </div>
                                                <div className="text-xs text-gray-300">
                                                    {selectedMatch.user_b_username}: {selectedMatch.total_tokens_b} tokens
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="surface-card rounded-xl p-12 text-center">
                                    <p className="text-gray-400">Select a flagged pair to see the comparison.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PlagiarismReport;
