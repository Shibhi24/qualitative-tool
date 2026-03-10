/**
 * SentimentWorkspace Component (Function-Based)
 *
 * The main workspace for sentiment analysis, with three sub-tabs:
 *   - Preview  : Color-coded highlights + sentence table + manual palette
 *   - Lexicon  : Dictionary manager + Review Mode table
 *   - Reports  : Live distribution chart + word counts + crosstab
 *
 * Props:
 *   - documentContent   : plain text content of the active document
 *   - sentimentResults  : array of { start, end, label, score, sentence_id }
 *   - onApplyLexicon    : callback to run lexicon-based matching
 *   - lexiconMatches    : array of matched words from lexicon
 *   - onManualSentiment : callback(start, end, text, label, score) for manual coding
 *   - onUpdateMatches   : callback(updatedMatches) to update lexicon matches in parent
 *   - projectId         : current project ID for API calls
 *   - nerEntities       : NER entities for Entity x Sentiment crosstab
 */

import React, { useState, useMemo, useCallback } from "react";
import axios from "axios";
import LexiconManager from "./LexiconManager";
import SentimentPalette from "./SentimentPalette";
import "./SentimentWorkspace.css";

function SentimentWorkspace({
    documentContent,
    sentimentResults = [],
    onApplyLexicon,
    lexiconMatches = [],
    onManualSentiment,
    onUpdateMatches,
    projectId,
    nerEntities = []
}) {

    const [subTab, setSubTab] = useState("Preview");
    const [loading, setLoading] = useState(false);
    const [viewMode, setViewMode] = useState("highlight"); // "highlight" or "table"

    // --- Manual Palette State ---
    const [palettePosition, setPalettePosition] = useState(null);
    const [selectedRange, setSelectedRange] = useState(null);

    // Sentiment color mapping
    const sentimentColors = {
        "VERY POSITIVE": "#166534",
        "POSITIVE": "#22c55e",
        "NEUTRAL": "#64748b",
        "NEGATIVE": "#f87171",
        "VERY NEGATIVE": "#b91c1c"
    };

    // Sentiment emoji icons for visual display
    const sentimentIcons = {
        "Very Positive": { emoji: "😄", dotClass: "dot-vpos" },
        "Positive": { emoji: "🙂", dotClass: "dot-pos" },
        "Neutral": { emoji: "😐", dotClass: "dot-neu" },
        "Negative": { emoji: "😟", dotClass: "dot-neg" },
        "Very Negative": { emoji: "😠", dotClass: "dot-vneg" }
    };

    /* =========================
       SAFE + OPTIMIZED STATS
    ========================== */

    /**
     * Optimized statistics for sentiment results.
     * Categorizes results into positive, neutral, negative, etc.
     */
    const sentimentStats = useMemo(() => {
        const stats = { pos: 0, neu: 0, neg: 0, vpos: 0, vneg: 0 };

        sentimentResults.forEach(r => {
            const score = r.score || 0;
            if (score > 0.5) stats.vpos++;
            else if (score > 0) stats.pos++;
            else if (score === 0) stats.neu++;
            else if (score > -0.5) stats.neg++;
            else stats.vneg++;
        });

        // Convenience totals
        stats.totalPos = stats.vpos + stats.pos;
        stats.totalNeg = stats.vneg + stats.neg;
        return stats;
    }, [sentimentResults]);

    const totalSentiments = sentimentResults.length;

    const percentages = useMemo(() => {
        if (totalSentiments === 0) {
            return { pos: 0, neu: 0, neg: 0 };
        }

        return {
            pos: (sentimentStats.totalPos / totalSentiments) * 100,
            neu: (sentimentStats.neu / totalSentiments) * 100,
            neg: (sentimentStats.totalNeg / totalSentiments) * 100
        };
    }, [sentimentStats, totalSentiments]);

    // Word count stats for each sentiment result
    const wordCountStats = useMemo(() => {
        return sentimentResults.map(r => {
            const text = documentContent.substring(r.start, r.end);
            const words = text.split(/\s+/).filter(w => w.length > 0);

            // Count positive and negative indicator words (simple heuristic)
            const posWords = words.filter(w =>
                ["good", "great", "happy", "excellent", "satisfied", "positive", "love", "wonderful", "amazing", "fantastic", "pleased", "enjoy"].includes(w.toLowerCase())
            );
            const negWords = words.filter(w =>
                ["bad", "awful", "terrible", "sad", "unhappy", "negative", "hate", "horrible", "poor", "dissatisfied", "frustrated", "angry"].includes(w.toLowerCase())
            );

            return {
                total: words.length,
                posCount: posWords.length,
                negCount: negWords.length,
                difference: posWords.length - negWords.length
            };
        });
    }, [sentimentResults, documentContent]);

    /* =========================
       HIGHLIGHT RENDERING
    ========================== */

    /**
     * Renders the document content with color-coded sentiment highlights.
     * Merges manual overrides with auto-detected segments, prioritizing manual ones.
     */
    const renderedContent = useMemo(() => {
        if (!sentimentResults || sentimentResults.length === 0) {
            return documentContent;
        }

        const parts = [];
        let lastIndex = 0;

        const sorted = [...sentimentResults].sort((a, b) => {
            // Priority: Manual overrides first if starts are same
            if (a.start === b.start) return a.manual_override ? -1 : 1;
            return a.start - b.start;
        });

        // Filter out auto-segments that are superseded by manual ones
        const manualSegments = sorted.filter(s => s.manual_override);
        const filtered = sorted.filter(item => {
            if (item.manual_override) return true;
            // Keep auto-segment only if no manual segment overlaps it
            return !manualSegments.some(m => (item.start < m.end && item.end > m.start));
        });

        filtered.forEach((item, i) => {
            if (item.start < lastIndex) return;

            if (item.start > lastIndex) {
                parts.push(documentContent.substring(lastIndex, item.start));
            }

            const intensity = item.intensity || 1.0;
            const baseColor = sentimentColors[item.label?.toUpperCase()] || "#e2e8f0";

            // Convert hex to RGBA for opacity support
            const r = parseInt(baseColor.slice(1, 3), 16);
            const g = parseInt(baseColor.slice(3, 5), 16);
            const b = parseInt(baseColor.slice(5, 7), 16);
            const bgColor = `rgba(${r}, ${g}, ${b}, ${Math.max(0.2, intensity)})`;

            const sourceBadge = item.manual_override ? "M" : "A";

            parts.push(
                <mark
                    key={`sent-${i}`}
                    className="sentiment-highlight"
                    style={{ backgroundColor: bgColor, borderLeft: `3px solid ${baseColor}` }}
                    onMouseEnter={() => !item.manual_override && console.log(`AI Prediction: ${item.label} (${(intensity * 100).toFixed(0)}% Certainty)`)}
                >
                    {documentContent.substring(item.start, item.end)}
                    <span className="sentiment-label">
                        {item.label}
                    </span>
                    <span className="sentiment-source-badge" title={item.manual_override ? "Manual Override" : `Auto-detected (${(intensity * 100).toFixed(0)}% Intensity)`}>
                        {sourceBadge}
                    </span>
                </mark>
            );

            lastIndex = item.end;
        });

        if (lastIndex < documentContent.length) {
            parts.push(documentContent.substring(lastIndex));
        }

        return parts;
    }, [documentContent, sentimentResults]);

    /* =========================
       SENTIMENT MINI-MAP (v2)
    ========================== */

    const SentimentMiniMap = useMemo(() => {
        if (!sentimentResults.length || !documentContent.length) return null;

        return (
            <div className="sentiment-minimap">
                {sentimentResults.map((item, i) => {
                    const topPercent = (item.start / documentContent.length) * 100;
                    const heightPercent = ((item.end - item.start) / documentContent.length) * 100;
                    const baseColor = sentimentColors[item.label?.toUpperCase()] || "#94a3b8";

                    return (
                        <div
                            key={`map-${i}`}
                            className="minimap-indicator"
                            style={{
                                top: `${topPercent}%`,
                                height: `${Math.max(0.5, heightPercent)}%`,
                                backgroundColor: baseColor,
                                opacity: Math.max(0.4, item.intensity || 1)
                            }}
                            title={`${item.label} (${(item.intensity * 100).toFixed(0)}% Intensity)`}
                            onClick={() => {
                                const el = document.querySelectorAll(".sentiment-highlight")[i];
                                if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
                            }}
                        />
                    );
                })}
            </div>
        );
    }, [sentimentResults, documentContent]);

    /* =========================
       FINALIZE HANDLER
    ========================== */

    /**
     * Bulk-saves the current sentiment results as thematic codes in the backend.
     * This "finalizes" the sentiment analysis by persisting it into the coding system.
     */
    const finalizeSentiments = async () => {
        if (!sentimentResults || sentimentResults.length === 0) return;

        try {
            setLoading(true);

            const payload = sentimentResults.map(r => ({
                start_index: r.start,
                end_index: r.end,
                selected_text: documentContent.substring(r.start, r.end),
                label: r.label,
                score: r.score,
                code_name: r.code_name,
                memo: r.memo
            }));

            await axios.post(
  `http://127.0.0.1:8000/analysis/sentiment/finalize-bulk/${projectId}`,
  sentimentResults
);
loadMemos();

            alert("Sentiment codes finalized successfully");

        } catch (error) {
            console.error("Finalize error:", error);
            alert("Failed to finalize sentiments");
        } finally {
            setLoading(false);
        }
    };

    /* =========================
       MANUAL SENTIMENT PALETTE
    ========================== */

    /**
     * Handles text selection for manual sentiment coding.
     * Calculates the selection offsets relative to the clean text content.
     */
    const handleTextSelection = useCallback(() => {
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed || !selection.toString().trim()) {
            return;
        }

        const range = selection.getRangeAt(0);
        const article = document.querySelector(".sentiment-document-card");
        if (!article || !article.contains(range.commonAncestorContainer)) return;

        // --- Robust Index Calculation (v2 fix) ---
        const selectedText = selection.toString();

        const walker = document.createTreeWalker(article, NodeFilter.SHOW_TEXT, null, false);
        let currentOffset = 0;
        let foundStart = false;

        while (walker.nextNode()) {
            const node = walker.currentNode;

            // Skip nodes that are children of our label or badge spans
            if (node.parentElement.classList.contains("sentiment-label") ||
                node.parentElement.classList.contains("sentiment-source-badge")) {
                continue;
            }

            if (node === range.startContainer) {
                currentOffset += range.startOffset;
                foundStart = true;
                break;
            }
            currentOffset += node.textContent.length;
        }

        if (!foundStart) return;

        const start = currentOffset;
        const end = start + selectedText.length;

        const rect = range.getBoundingClientRect();

        setSelectedRange({ start, end, text: selectedText });
        setPalettePosition({
            x: rect.left + rect.width / 2,
            y: rect.top + window.scrollY
        });
    }, []);

    const handlePaletteSelect = (label, score, codeName, memo) => {
        if (!selectedRange) return;

        if (onManualSentiment) {
            onManualSentiment(
                selectedRange.start,
                selectedRange.end,
                selectedRange.text,
                label,
                score,
                codeName,
                memo
            );
        }

        window.getSelection().removeAllRanges();
        setPalettePosition(null);
        setSelectedRange(null);
    };

    const handlePaletteClose = () => {
        window.getSelection().removeAllRanges();
        setPalettePosition(null);
        setSelectedRange(null);
    };

    /* =========================
       REVIEW MODE — APPLY / DISCARD
    ========================== */

    const handleApplyMatch = (index) => {
        const match = lexiconMatches[index];
        if (!match) return;

        if (onManualSentiment) {
            onManualSentiment(
                match.index,
                match.index + match.word.length,
                match.word,
                match.category === "positive" ? "Positive" : "Negative",
                match.category === "positive" ? 0.5 : -0.5
            );
        }

        if (onUpdateMatches) {
            const updated = lexiconMatches.filter((_, i) => i !== index);
            onUpdateMatches(updated);
        }
    };

    const handleDiscardMatch = (index) => {
        if (onUpdateMatches) {
            const updated = lexiconMatches.filter((_, i) => i !== index);
            onUpdateMatches(updated);
        }
    };

    const handleApplyAll = () => {
        if (!lexiconMatches || lexiconMatches.length === 0) return;

        const confirmed = window.confirm(
            `Apply sentiment labels to all ${lexiconMatches.length} remaining matches?`
        );
        if (!confirmed) return;

        lexiconMatches.forEach((match) => {
            if (onManualSentiment) {
                onManualSentiment(
                    match.index,
                    match.index + match.word.length,
                    match.word,
                    match.category === "positive" ? "Positive" : "Negative",
                    match.category === "positive" ? 0.5 : -0.5
                );
            }
        });

        if (onUpdateMatches) {
            onUpdateMatches([]);
        }
    };

    /* =========================
       ENTITY x SENTIMENT CROSSTAB
    ========================== */

    const entitySentimentCrosstab = useMemo(() => {
        if (!nerEntities.length || !sentimentResults.length) return [];

        const crosstab = {};

        nerEntities.forEach(entity => {
            const key = `${entity.label}: ${entity.text}`;

            if (!crosstab[key]) {
                crosstab[key] = { entity: key, pos: 0, neu: 0, neg: 0 };
            }

            sentimentResults.forEach(sent => {
                const overlaps = entity.start < sent.end && entity.end > sent.start;
                if (overlaps) {
                    const score = sent.score || 0;
                    if (score > 0) crosstab[key].pos++;
                    else if (score < 0) crosstab[key].neg++;
                    else crosstab[key].neu++;
                }
            });
        });

        return Object.values(crosstab);
    }, [nerEntities, sentimentResults]);

    /* =========================
       DETAILED LABEL BREAKDOWN (for Reports)
    ========================== */

    const labelBreakdown = useMemo(() => {
        const breakdown = {};

        sentimentResults.forEach(r => {
            const label = r.label || "Unknown";
            if (!breakdown[label]) {
                breakdown[label] = { count: 0, totalScore: 0 };
            }
            breakdown[label].count++;
            breakdown[label].totalScore += (r.polarity || r.score || 0);
        });

        return Object.entries(breakdown).map(([label, data]) => ({
            label,
            count: data.count,
            avgScore: data.count > 0 ? (data.totalScore / data.count).toFixed(2) : "0.00",
            percentage: totalSentiments > 0 ? ((data.count / totalSentiments) * 100).toFixed(1) : "0.0"
        }));
    }, [sentimentResults, totalSentiments]);

    /* =========================
       LEXICON MATCH DASHBOARD STATS
    ========================== */

    const lexiconMatchStats = useMemo(() => {
        if (!lexiconMatches || lexiconMatches.length === 0) return null;

        const pos = lexiconMatches.filter(m => m.category === "positive");
        const neg = lexiconMatches.filter(m => m.category === "negative");

        // Top word frequency
        const wordFreq = {};
        lexiconMatches.forEach(m => {
            wordFreq[m.word] = (wordFreq[m.word] || 0) + 1;
        });

        const sortedWords = Object.entries(wordFreq)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);

        return {
            total: lexiconMatches.length,
            posCount: pos.length,
            negCount: neg.length,
            posPercent: (pos.length / lexiconMatches.length) * 100,
            negPercent: (neg.length / lexiconMatches.length) * 100,
            topWords: sortedWords
        };
    }, [lexiconMatches]);

    /* =========================
       COMPONENT RENDER
    ========================== */

    return (
        <div className="sentiment-workspace">

            {/* Internal Navigation */}
            <div className="sentiment-internal-nav">
                {["Preview", "Lexicon", "Reports"].map(tab => (
                    <button
                        key={tab}
                        className={`sub-nav-btn ${subTab === tab ? "active" : ""}`}
                        onClick={() => setSubTab(tab)}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* ================= PREVIEW TAB ================= */}
            {subTab === "Preview" && (
                <>
                    <div className="sentiment-preview-header">
                        <div className="preview-stats">
                            <div className="stat-pill positive">
                                Pos: {sentimentStats.totalPos}
                            </div>
                            <div className="stat-pill neutral">
                                Neu: {sentimentStats.neu}
                            </div>
                            <div className="stat-pill negative">
                                Neg: {sentimentStats.totalNeg}
                            </div>
                            <span className="total-count">
                                Total: {totalSentiments}
                            </span>
                        </div>

                        <div className="preview-actions">
                            {/* Toggle between highlight view and table view */}
                            <div className="view-toggle">
                                <button
                                    className={`toggle-btn ${viewMode === "highlight" ? "active" : ""}`}
                                    onClick={() => setViewMode("highlight")}
                                    title="Document View"
                                >
                                    📄
                                </button>
                                <button
                                    className={`toggle-btn ${viewMode === "table" ? "active" : ""}`}
                                    onClick={() => setViewMode("table")}
                                    title="Table View"
                                >
                                    📊
                                </button>
                            </div>

                            <button
                                className="finalize-btn"
                                onClick={finalizeSentiments}
                                disabled={loading}
                            >
                                {loading ? "Processing..." : "Finalize as Codes"}
                            </button>
                        </div>
                    </div>

                    {/* ---- Highlight View ---- */}
                    {viewMode === "highlight" && (
                        <div className="sentiment-viewer-container">
                            <div className="sentiment-content-area" onMouseUp={handleTextSelection}>
                                <article className="sentiment-document-card">
                                    {renderedContent}
                                </article>
                            </div>
                            {SentimentMiniMap}
                        </div>
                    )}

                    {/* ---- Table View (Sentence-by-Sentence Results) ---- */}
                    {viewMode === "table" && (
                        <div className="sentiment-table-area">
                            {sentimentResults.length === 0 ? (
                                <p className="no-data-msg">Run sentiment analysis to see results.</p>
                            ) : (
                                <table className="sentiment-results-table">
                                    <thead>
                                        <tr>
                                            <th>Coded Segment</th>
                                            <th>Code / Sentiment</th>
                                            <th>Memo</th>
                                            <th>+ Words</th>
                                            <th>- Words</th>
                                            <th>Diff</th>
                                            <th>Source</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sentimentResults.map((r, idx) => {
                                            const text = documentContent.substring(r.start, r.end);
                                            const icon = sentimentIcons[r.label] || { emoji: "❓", dotClass: "dot-neu" };
                                            const wc = wordCountStats[idx] || { total: 0, posCount: 0, negCount: 0, difference: 0 };

                                            return (
                                                <tr key={idx}>
                                                    <td className="segment-cell">
                                                        <div className="segment-text">
                                                            {text.length > 200 ? text.substring(0, 200) + "..." : text}
                                                        </div>
                                                    </td>
                                                    <td className="sentiment-cell">
                                                        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                                                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                                                <span className={`sentiment-dot ${icon.dotClass}`}></span>
                                                                <span className="sentiment-cell-label">{r.label}</span>
                                                            </div>
                                                            {r.code_name && <span style={{ fontSize: "0.7rem", color: "#6366f1", fontWeight: 600 }}>🏷️ {r.code_name}</span>}
                                                        </div>
                                                    </td>
                                                    <td className="memo-cell" style={{ fontSize: "0.75rem", color: "#64748b", fontStyle: "italic", maxWidth: "150px" }}>
                                                        {r.memo || "-"}
                                                    </td>
                                                    <td className="count-cell pos-count">{wc.posCount}</td>
                                                    <td className="count-cell neg-count">{wc.negCount}</td>
                                                    <td className={`count-cell diff-count ${wc.difference > 0 ? "positive" : wc.difference < 0 ? "negative" : ""}`}>
                                                        {wc.difference > 0 ? "+" : ""}{wc.difference}
                                                    </td>
                                                    <td className="source-cell">
                                                        <span className={`source-tag ${r.manual_override ? "manual" : "auto"}`}>
                                                            {r.manual_override ? "Manual" : "Auto"}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    )}

                    {/* Floating Sentiment Palette for manual coding */}
                    <SentimentPalette
                        position={palettePosition}
                        onSelect={handlePaletteSelect}
                        onClose={handlePaletteClose}
                    />
                </>
            )}

            {/* ================= LEXICON TAB ================= */}
            {subTab === "Lexicon" && (
                <div className="lexicon-container">
                    <LexiconManager onApplyDictionary={onApplyLexicon} />

                    {lexiconMatchStats && (
                        <div className="lexicon-dashboard">
                            <div className="dashboard-header">
                                <h3>Lexicon Analysis Dashboard</h3>
                                <p>Pre-coding results based on your custom dictionary.</p>
                            </div>

                            <div className="dashboard-grid">
                                <div className="dashboard-card stat-card">
                                    <div className="stat-main">
                                        <span className="stat-label">Total Matches</span>
                                        <span className="stat-number">{lexiconMatchStats.total}</span>
                                    </div>
                                    <div className="stat-distribution">
                                        <div className="dist-item">
                                            <span className="dot pos"></span>
                                            <span>Positive: {lexiconMatchStats.posCount}</span>
                                        </div>
                                        <div className="dist-item">
                                            <span className="dot neg"></span>
                                            <span>Negative: {lexiconMatchStats.negCount}</span>
                                        </div>
                                    </div>
                                    <div className="mini-progress">
                                        <div className="fill pos" style={{ width: `${lexiconMatchStats.posPercent}%` }}></div>
                                        <div className="fill neg" style={{ width: `${lexiconMatchStats.negPercent}%` }}></div>
                                    </div>
                                </div>

                                <div className="dashboard-card freq-card">
                                    <span className="card-label">Top Recurring Words</span>
                                    <div className="freq-list">
                                        {lexiconMatchStats.topWords.map(([word, count], i) => (
                                            <div key={i} className="freq-item">
                                                <span className="freq-word">{word}</span>
                                                <span className="freq-count">{count}x</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="dashboard-card insight-card">
                                    <span className="card-label">Lexicon Sentiment Bias</span>
                                    <div className="bias-meter">
                                        <div className="bias-marker" style={{ left: `${50 + (lexiconMatchStats.posPercent - lexiconMatchStats.negPercent) / 2}%` }}></div>
                                    </div>
                                    <div className="bias-labels">
                                        <span>Negative</span>
                                        <span>Positive</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {lexiconMatches.length > 0 && (
                        <div className="lexicon-review-table">
                            <div className="review-header">
                                <h4>Review Lexicon Matches ({lexiconMatches.length})</h4>
                                <button
                                    className="batch-apply-btn"
                                    onClick={handleApplyAll}
                                >
                                    Apply All ({lexiconMatches.length})
                                </button>
                            </div>

                            <table>
                                <thead>
                                    <tr>
                                        <th>Word</th>
                                        <th>Category</th>
                                        <th>Context</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {lexiconMatches.map((m, idx) => (
                                        <tr key={idx}>
                                            <td>{m.word}</td>
                                            <td>
                                                <span className={`category-badge ${m.category}`}>
                                                    {m.category}
                                                </span>
                                            </td>
                                            <td className="context-cell">...{m.context}...</td>
                                            <td>
                                                <button
                                                    className="mini-btn apply"
                                                    onClick={() => handleApplyMatch(idx)}
                                                >
                                                    ✓ Apply
                                                </button>
                                                <button
                                                    className="mini-btn del"
                                                    onClick={() => handleDiscardMatch(idx)}
                                                >
                                                    ✕ Discard
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* ================= REPORTS TAB ================= */}
            {subTab === "Reports" && (
                <div className="reports-container">

                    {/* Sentiment Distribution Bar Chart */}
                    <div className="report-card">
                        <h3>Sentiment Distribution</h3>

                        {totalSentiments === 0 ? (
                            <p className="no-data-msg">Run sentiment analysis to see distribution.</p>
                        ) : (
                            <div className="chart-placeholder">
                                <div className="bar-row">
                                    <div className="bar-label-row">
                                        <span>Positive</span>
                                        <span className="bar-value">{sentimentStats.totalPos} ({percentages.pos.toFixed(1)}%)</span>
                                    </div>
                                    <div className="bar-bg">
                                        <div className="bar-fill pos" style={{ width: `${percentages.pos}%` }}></div>
                                    </div>
                                </div>

                                <div className="bar-row">
                                    <div className="bar-label-row">
                                        <span>Neutral</span>
                                        <span className="bar-value">{sentimentStats.neu} ({percentages.neu.toFixed(1)}%)</span>
                                    </div>
                                    <div className="bar-bg">
                                        <div className="bar-fill neu" style={{ width: `${percentages.neu}%` }}></div>
                                    </div>
                                </div>

                                <div className="bar-row">
                                    <div className="bar-label-row">
                                        <span>Negative</span>
                                        <span className="bar-value">{sentimentStats.totalNeg} ({percentages.neg.toFixed(1)}%)</span>
                                    </div>
                                    <div className="bar-bg">
                                        <div className="bar-fill neg" style={{ width: `${percentages.neg}%` }}></div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Detailed Label Breakdown */}
                    <div className="report-card">
                        <h3>Detailed Label Breakdown</h3>

                        {labelBreakdown.length === 0 ? (
                            <p className="no-data-msg">No sentiment data available.</p>
                        ) : (
                            <table className="breakdown-table">
                                <thead>
                                    <tr>
                                        <th>Label</th>
                                        <th>Count</th>
                                        <th>%</th>
                                        <th>Avg Score</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {labelBreakdown.map((row, idx) => (
                                        <tr key={idx}>
                                            <td>
                                                <span className="breakdown-label-dot"
                                                    style={{ background: sentimentColors[row.label.toUpperCase()] || "#94a3b8" }}
                                                ></span>
                                                {row.label}
                                            </td>
                                            <td>{row.count}</td>
                                            <td>{row.percentage}%</td>
                                            <td className={parseFloat(row.avgScore) > 0 ? "score-pos" : parseFloat(row.avgScore) < 0 ? "score-neg" : ""}>
                                                {row.avgScore}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>

                    {/* Entity x Sentiment Crosstab */}
                    <div className="report-card report-card-full">
                        <h3>Crosstab: Entities vs Sentiment</h3>

                        {entitySentimentCrosstab.length === 0 ? (
                            <p className="no-data-msg">
                                Run both NER extraction and sentiment analysis to see crosstab.
                            </p>
                        ) : (
                            <table className="crosstab-table">
                                <thead>
                                    <tr>
                                        <th>Entity</th>
                                        <th>Positive</th>
                                        <th>Neutral</th>
                                        <th>Negative</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {entitySentimentCrosstab.map((row, idx) => (
                                        <tr key={idx}>
                                            <td>{row.entity}</td>
                                            <td className="ct-pos">{row.pos}</td>
                                            <td className="ct-neu">{row.neu}</td>
                                            <td className="ct-neg">{row.neg}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>

                </div>
            )}

        </div>
    );
}

export default SentimentWorkspace;