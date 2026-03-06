/**
 * LexiconManager Component
 * 
 * Manages a local sentiment lexicon (dictionary) with positive and
 * negative word categories. Users can add words manually or upload
 * a CSV file. The lexicon is passed to the parent to run keyword-based 
 * sentiment matching across the document.
 * 
 * Props:
 * - onApplyDictionary : callback(lexiconObject) triggered when user clicks "Run Auto-Coding"
 */
import React, { useState } from "react";
import "./LexiconManager.css";

function LexiconManager({ onApplyDictionary }) {
    // Default lexicon with sample positive and negative words
    const [lexicon, setLexicon] = useState({
        positive: ["happy", "great", "excellent", "good", "satisfied"],
        negative: ["sad", "bad", "awful", "unhappy", "dissatisfied"],
    });

    const [newWord, setNewWord] = useState("");        // Input field value
    const [activeCategory, setActiveCategory] = useState("positive"); // Selected category dropdown

    // Add a new word to the active category (positive or negative)
    const addWord = () => {
        if (!newWord.trim()) return;
        setLexicon((prev) => ({
            ...prev,
            [activeCategory]: [...prev[activeCategory], newWord.trim().toLowerCase()],
        }));
        setNewWord("");
    };

    // Remove a specific word from a category
    const removeWord = (category, word) => {
        setLexicon((prev) => ({
            ...prev,
            [category]: prev[category].filter((w) => w !== word),
        }));
    };

    // Handle CSV file upload — expects format: word,category (one per line)
    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target.result;
            const lines = text.split(/\r?\n/);
            const newLex = { positive: [], negative: [] };

            // Determine if there's a header
            let startIndex = 0;
            const firstLine = lines[0]?.toLowerCase() || "";
            if (firstLine.includes("word") || firstLine.includes("phrase") || firstLine.includes("category") || firstLine.includes("sentiment")) {
                startIndex = 1;
            }

            lines.slice(startIndex).forEach((line) => {
                if (!line.trim()) return;
                
                // Support both comma and semicolon separators
                const parts = line.split(/[;,]/).map((s) => s.trim().toLowerCase());
                const word = parts[0];
                const category = parts[1];

                if (word && (category === "positive" || category === "negative" || category === "pos" || category === "neg")) {
                    const normalizedCategory = (category === "pos" || category === "positive") ? "positive" : "negative";
                    newLex[normalizedCategory].push(word);
                }
            });

            setLexicon((prev) => ({
                positive: [...new Set([...prev.positive, ...newLex.positive])],
                negative: [...new Set([...prev.negative, ...newLex.negative])],
            }));
            
            // Reset the input so the same file can be uploaded again if needed
            e.target.value = "";
            alert(`Imported ${newLex.positive.length} positive and ${newLex.negative.length} negative words.`);
        };
        reader.readAsText(file);
    };

    return (
        <div className="lexicon-manager">
            <div className="lexicon-header">
                <h3>Sentiment Lexicon</h3>
                <input
                    type="file"
                    id="lexicon-upload"
                    hidden
                    onChange={handleFileUpload}
                    accept=".csv"
                />
                <label htmlFor="lexicon-upload" className="upload-btn">
                    <span>Upload CSV</span>
                </label>
            </div>

            <div className="lexicon-input-group">
                <select
                    value={activeCategory}
                    onChange={(e) => setActiveCategory(e.target.value)}
                >
                    <option value="positive">Positive</option>
                    <option value="negative">Negative</option>
                </select>
                <input
                    type="text"
                    placeholder="Add word..."
                    value={newWord}
                    onChange={(e) => setNewWord(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && addWord()}
                />
                <button onClick={addWord}>Add</button>
            </div>

            <div className="lexicon-lists">
                <div className="lexicon-column">
                    <h4 className="pos">Positive</h4>
                    <div className="word-list">
                        {lexicon.positive.map((word) => (
                            <span key={word} className="word-tag pos">
                                {word}
                                <button onClick={() => removeWord("positive", word)}>&times;</button>
                            </span>
                        ))}
                    </div>
                </div>
                <div className="lexicon-column">
                    <h4 className="neg">Negative</h4>
                    <div className="word-list">
                        {lexicon.negative.map((word) => (
                            <span key={word} className="word-tag neg">
                                {word}
                                <button onClick={() => removeWord("negative", word)}>&times;</button>
                            </span>
                        ))}
                    </div>
                </div>
            </div>

            <div className="lexicon-actions">
                <button
                    className="apply-btn"
                    onClick={() => onApplyDictionary(lexicon)}
                >
                    Run Auto-Coding with Lexicon
                </button>
            </div>
        </div>
    );
}

export default LexiconManager;
