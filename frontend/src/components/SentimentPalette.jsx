/**
 * SentimentPalette Component
 * 
 * A floating toolbar that appears when the user selects text inside
 * the Sentiment Preview panel. It offers five sentiment levels as
 * clickable icons so the researcher can manually assign a sentiment
 * label to any highlighted text span.
 * 
 * Props:
 * - position : { x, y } screen coordinates for the palette
 * - onSelect : callback(label, score, codeName, memo) when a sentiment is chosen
 * - onClose  : callback to dismiss the palette
 */

import React, { useState } from "react";
import "./SentimentPalette.css";

// Sentiment levels displayed in the floating palette
const SENTIMENT_LEVELS = [
    { label: "Very Negative", score: -1.0, emoji: "😠", color: "#b91c1c" },
    { label: "Negative", score: -0.5, emoji: "😟", color: "#f87171" },
    { label: "Neutral", score: 0.0, emoji: "😐", color: "#64748b" },
    { label: "Positive", score: 0.5, emoji: "🙂", color: "#22c55e" },
    { label: "Very Positive", score: 1.0, emoji: "😄", color: "#166534" },
];

function SentimentPalette({ position, onSelect, onClose }) {
    const [codeName, setCodeName] = useState("");
    const [memo, setMemo] = useState("");

    // Don't render if no position is provided
    if (!position) return null;

    return (
        <div
            className="sentiment-palette-overlay"
            onClick={onClose}
        >
            <div
                className="sentiment-palette"
                style={{ left: position.x, top: position.y }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Palette title */}
                <div className="palette-title">Assign Sentiment</div>

                {/* New Inputs: Code Name & Memo */}
                <div className="palette-inputs">
                    <div className="palette-input-group">
                        <label>Code Name (Optional)</label>
                        <input
                            type="text"
                            className="palette-text-input"
                            placeholder="e.g. Happiness"
                            value={codeName}
                            onChange={(e) => setCodeName(e.target.value)}
                        />
                    </div>
                    <div className="palette-input-group">
                        <label>Code Memo</label>
                        <textarea
                            className="palette-textarea"
                            placeholder="Add researcher notes..."
                            rows="2"
                            value={memo}
                            onChange={(e) => setMemo(e.target.value)}
                        />
                    </div>
                </div>

                {/* Five sentiment level buttons */}
                <div className="palette-options">
                    {SENTIMENT_LEVELS.map((level) => (
                        <button
                            key={level.label}
                            className="palette-btn"
                            style={{ "--btn-color": level.color }}
                            title={level.label}
                            onClick={() => onSelect(level.label, level.score, codeName, memo)}
                        >
                            <span className="palette-color-tag"></span>
                            <span className="palette-emoji">{level.emoji}</span>
                            <span className="palette-label-text">{level.label}</span>
                        </button>
                    ))}
                </div>

                {/* Close button */}
                <button className="palette-close" onClick={onClose}>
                    Cancel
                </button>
            </div>
        </div>
    );
}

export default SentimentPalette;
