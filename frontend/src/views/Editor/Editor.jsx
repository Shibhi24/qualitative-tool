/**
 * Editor Component (Function-Based)
 *
 * The main workspace for a single project. Manages:
 *   - Tab switching between Coding, NER, Sentiment, Window, Note/Memo, Export
 *   - Loading project data (documents + codes) from the backend
 *   - NER entity extraction and manual tagging
 *   - Sentiment analysis (auto + manual + lexicon-based)
 *   - Hierarchical code tree with right-click context menu
 *   - Rendering the appropriate sub-workspace per active tab
 */
import React, { useState, useRef, useEffect } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import "./Editor.css";
import HighlightWorkspace from "../../components/HighlightWorkspace";
import NERWorkspace from "../../components/NERWorkspace";
import SentimentWorkspace from "../../components/SentimentWorkspace";
import NoteMemoWorkspace from "../../components/NoteMemoWorkspace";
import ExportWorkspace from "../../components/ExportWorkspace";

function Editor() {
  const { projectId } = useParams();
  const dropdownRef = useRef(null);

  // --- UI & TAB STATE ---
  const [activeTab, setActiveTab] = useState("Coding");
  const [codingMode, setCodingMode] = useState("Document");
  const [showDropdown, setShowDropdown] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);
  const [globalContextMenu, setGlobalContextMenu] = useState(null);
  const [selectedColor, setSelectedColor] = useState("#2563eb");

  // --- CORE DATA STATE ---
  const [documentContent, setDocumentContent] = useState("");
  const [documentId, setDocumentId] = useState(null);
  const [codes, setCodes] = useState([]);
  const [selectedCode, setSelectedCode] = useState(null);
  const [segments, setSegments] = useState([]);

  // --- NER LOGIC STATE ---
  const [nerEntities, setNerEntities] = useState([]);
  const [isExtracting, setIsExtracting] = useState(false);

  // --- SENTIMENT & LEXICON STATE ---
  const [sentimentResults, setSentimentResults] = useState([]);
  const [isAnalyzingSentiment, setIsAnalyzingSentiment] = useState(false);
  const [lexiconMatches, setLexiconMatches] = useState([]);

  const [initializedSentiment, setInitializedSentiment] = useState(false);

  /**
   * Initializes the sentiment analysis code tree for the project.
   * This creates necessary base codes (Very Positive, etc.) in the database.
   */
  const initSentimentTree = async () => {
    if (initializedSentiment || !projectId) return;
    try {
      await axios.post(`http://127.0.0.1:8000/analysis/init-tree/${projectId}`);
      setInitializedSentiment(true);
      if (loadProjectData) loadProjectData(true);
    } catch (err) {
      console.error("Sentiment tree init failed:", err);
    }
  };

  useEffect(() => {
    if (activeTab === "Sentiment") {
      initSentimentTree();
    }
  }, [activeTab]);

  useEffect(() => {
    const handleCloseMenus = () => {
      setContextMenu(null);
      setGlobalContextMenu(null);
    };
    window.addEventListener("click", handleCloseMenus);
    return () => window.removeEventListener("click", handleCloseMenus);
  }, []);

  const codingModes = ["Document", "Paragraph", "Sentence", "Word"];

  /* ================= HELPERS ================= */

  // Important: Converts HTML workspace content to plain text for AI models
  const getCleanText = (html) => {
    const div = document.createElement("div");
    div.innerHTML = html;
    return div.textContent || div.innerText || "";
  };

  /* ================= LOAD DATA ================= */

  useEffect(() => {
    if (!projectId) return;
    loadProjectData();
  }, [projectId]);

  /**
   * Loads documents and codes for the current project from the backend.
   * 
   * @param {boolean} onlyCodes - If true, only refreshes the codes list.
   */
  const loadProjectData = async (onlyCodes = false) => {
    try {
      let currentDocId = documentId;

      if (!onlyCodes) {
        const docRes = await axios.get(
          `http://127.0.0.1:8000/documents/?project_id=${projectId}`
        );
        if (docRes.data.length > 0) {
          setDocumentContent(docRes.data[0].content || "");
          setDocumentId(docRes.data[0].id);
          currentDocId = docRes.data[0].id;
        }
      }

      const codeRes = await axios.get(
        `http://127.0.0.1:8000/codes/?project_id=${projectId}`
      );
      setCodes(codeRes.data || []);

      // Fetch all segments for the project (required for Memo HUB)
      if (projectId) {
        const segRes = await axios.get(
          `http://127.0.0.1:8000/segments/?project_id=${projectId}`
        );
        setSegments(segRes.data || []);
      }
    } catch (err) {
      console.error("Error loading project:", err);
    }
  };

  /* ================= NER LOGIC ================= */

  /**
   * Triggers the NER extraction pipeline on the current document.
   * 
   * @param {Array} requestedLabels - Optional list of entity types to extract.
   */
  const handleExtractNER = async (requestedLabels = []) => {
    if (!documentContent) return;
    setIsExtracting(true);

    try {
      const response = await axios.post(
        "http://127.0.0.1:8000/analysis/ner/extract",
        {
          text: getCleanText(documentContent),
          labels: requestedLabels.length > 0 ? requestedLabels : null,
        }
      );
      setNerEntities(response.data.entities);
    } catch (err) {
      console.error("NER Extraction failed:", err);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleUpdateEntities = (updatedList) => {
    setNerEntities(updatedList);
  };

  const handleManualTag = () => {
    const selection = window.getSelection();
    const text = selection.toString().trim();
    if (!text) return;

    const label = prompt("Enter entity label:");
    if (!label) return;

    const fullText = getCleanText(documentContent);
    const start = fullText.indexOf(text);
    if (start === -1) return;

    const newEntity = {
      start,
      end: start + text.length,
      label: label.toUpperCase(),
      text,
    };

    setNerEntities((prev) =>
      [...prev, newEntity].sort((a, b) => a.start - b.start)
    );
    selection.removeAllRanges();
  };

  /* ================= SENTIMENT LOGIC ================= */

  /**
   * Runs the automated sentiment analysis on the document.
   * Processes the text sentence-by-sentence using the backend model.
   */
  const handleSentimentAnalysis = async () => {
    if (!documentId) return;
    setIsAnalyzingSentiment(true);

    try {
      const response = await axios.post(
        `http://127.0.0.1:8000/analysis/sentiment/${documentId}`
      );
      setSentimentResults(response.data.results);
    } catch (err) {
      console.error("Sentiment Analysis failed:", err);
    } finally {
      setIsAnalyzingSentiment(false);
    }
  };

  const handleApplyLexicon = (lexicon) => {
    const text = getCleanText(documentContent);
    const matches = [];

    Object.entries(lexicon).forEach(([category, words]) => {
      words.forEach((word) => {
        if (!word.trim()) return;

        // Use regex with word boundaries to avoid partial matches (e.g. "cat" in "category")
        // Escaping special characters in the word for regex safety
        const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`\\b${escapedWord}\\b`, 'gi');

        let match;
        while ((match = regex.exec(text)) !== null) {
          matches.push({
            word: match[0],
            category,
            index: match.index,
            context: text.substring(Math.max(0, match.index - 20), Math.min(text.length, match.index + match[0].length + 20)),
            applied: false
          });
        }
      });
    });

    // Deduplicate matches (in case a word is in both categories or overlap)
    const uniqueMatches = Array.from(new Set(matches.map(m => `${m.index}-${m.word}`)))
      .map(id => matches.find(m => `${m.index}-${m.word}` === id))
      .sort((a, b) => a.index - b.index);

    setLexiconMatches(uniqueMatches);
    alert(`Found ${uniqueMatches.length} keyword matches!`);
  };

  /* ================= MANUAL SENTIMENT (NEW) ================= */

  // Called by the SentimentPalette when user manually assigns a sentiment
  const handleManualSentiment = (start, end, text, label, score, codeName, memo) => {
    const newResult = {
      start,
      end,
      label,
      score,
      sentence: text,
      code_name: codeName,
      memo: memo,
      manual_override: true
    };

    // Add manual result to existing results, avoiding duplicates at same position
    setSentimentResults(prev => {
      const filtered = prev.filter(r => !(r.start === start && r.end === end));
      return [...filtered, newResult].sort((a, b) => a.start - b.start);
    });
  };

  // Called by Review Mode to update pending lexicon matches
  const handleUpdateMatches = (updatedMatches) => {
    setLexiconMatches(updatedMatches);
  };

  /* ================= TREE & CONTEXT LOGIC ================= */

  const buildTree = (flatCodes) => {
    const map = {};
    const roots = [];
    flatCodes.forEach((c) => { map[c.id] = { ...c, children: [] }; });
    flatCodes.forEach((c) => {
      if (c.parent_id && map[c.parent_id]) {
        map[c.parent_id].children.push(map[c.id]);
      } else if (!c.parent_id) {
        roots.push(map[c.id]);
      }
    });
    return roots;
  };

  const handleRightClick = (event, node) => {
    event.preventDefault();
    event.stopPropagation();
    setContextMenu({ x: event.clientX, y: event.clientY, node });
  };

  const handleGlobalContextMenu = (event) => {
    event.preventDefault();
    setGlobalContextMenu({ x: event.clientX, y: event.clientY });
  };

  const handleDeleteCode = async () => {
    if (!contextMenu?.node) return;
    try {
      await axios.delete(`http://127.0.0.1:8000/codes/${contextMenu.node.id}`);
      loadProjectData(true);
    } catch (err) { console.error("Delete failed:", err); }
    setContextMenu(null);
  };

  const CodeNode = ({ node, depth }) => (
    <div key={node.id}>
      <div className="pane-item" style={{ paddingLeft: `${depth * 20}px` }}>
        <div
          className={`pane-button ${selectedCode?.id === node.id ? "active-code" : ""}`}
          onClick={() => { setActiveTab("Coding"); setSelectedCode(node); }}
          onContextMenu={(e) => handleRightClick(e, node)}
        >
          {node.name}
        </div>
      </div>
      {node.children.map((child) => (
        <CodeNode key={child.id} node={child} depth={depth + 1} />
      ))}
    </div>
  );

  return (
    <div className="editor-container" onContextMenu={handleGlobalContextMenu}>
      {/* NAVBAR */}
      <div className="editor-navbar">
        {["Coding", "NER", "Sentiment", "Window", "Note/Memo", "Export"].map((tab) => (
          <button
            key={tab}
            className={`nav-btn ${activeTab === tab ? "active" : ""}`}
            onClick={() => {
              setActiveTab(tab);
              if (tab === "NER" && nerEntities.length === 0) handleExtractNER();
              if (tab === "Sentiment" && sentimentResults.length === 0) handleSentimentAnalysis();
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="editor-body">
        <div className="editor-sidebar">
          {/* TAB 1: CODING SIDEBAR */}
          {activeTab === "Coding" && (
            <>
              <div className="pane-block">
                <div className="pane-header"><span className="pane-title">Coding Mode</span></div>
                <div className="pane-body">
                  <div className="pane-button" onClick={() => setShowDropdown(!showDropdown)}>
                    Level: <strong>{codingMode}</strong>
                  </div>
                  {showDropdown && (
                    <div className="coding-dropdown-list">
                      {codingModes.map(mode => (
                        <div key={mode} className="pane-button" onClick={() => { setCodingMode(mode); setShowDropdown(false); }}>
                          {mode}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="pane-block">
                <div className="pane-header"><span className="pane-title">Codes</span></div>
                <div className="pane-body">
                  {buildTree(codes).map((root) => (
                    <CodeNode key={root.id} node={root} depth={0} />
                  ))}
                </div>
              </div>

              <div className="pane-block">
                <div className="pane-header"><span className="pane-title">Colour</span></div>
                <div className="pane-body">
                  <div className="color-grid">
                    {["#60a5fa", "#f87171", "#34d399", "#fbbf24", "#a78bfa", "#f472b6"].map((color) => (
                      <span
                        key={color}
                        className={`color-dot ${selectedColor === color ? "selected" : ""}`}
                        style={{ background: color }}
                        onClick={() => setSelectedColor(color)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* TAB 2: NER SIDEBAR */}
          {activeTab === "NER" && (
            <>
              <div className="pane-block">
                <div className="pane-header">
                  <span className="pane-title">NER Extraction</span>
                  {nerEntities.length > 0 && (
                    <span style={{ fontSize: '0.7rem', background: '#e0e7ff', color: '#3730a3', padding: '2px 8px', borderRadius: '10px', fontWeight: 700 }}>
                      {nerEntities.length}
                    </span>
                  )}
                </div>
                <div className="pane-body" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <button className="pane-button" onClick={() => handleExtractNER(["PERSON"])}>👤 Persons</button>
                  <button className="pane-button" onClick={() => handleExtractNER(["GPE", "LOC"])}>📍 Locations</button>
                  <button className="pane-button" style={{ fontWeight: 600 }} onClick={() => handleExtractNER()}>🔍 Extract All</button>
                </div>
              </div>
              <div className="pane-block">
                <div className="pane-header"><span className="pane-title">Manual Tools</span></div>
                <div className="pane-body" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <button className="pane-button active-code" onClick={handleManualTag}>🏷️ Tag Selection</button>
                  {nerEntities.length > 0 && (
                    <button className="pane-button" style={{ color: '#f87171' }} onClick={() => setNerEntities([])}>
                      ✕ Clear All Entities
                    </button>
                  )}
                </div>
              </div>
            </>
          )}

          {/* TAB 3: SENTIMENT SIDEBAR */}
          {activeTab === "Sentiment" && (
            <>
              <div className="pane-block">
                <div className="pane-header">
                  <span className="pane-title">Sentiment Control</span>
                  {sentimentResults.length > 0 && (
                    <span style={{ fontSize: '0.7rem', background: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: '10px', fontWeight: 700 }}>
                      {sentimentResults.length}
                    </span>
                  )}
                </div>
                <div className="pane-body" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <button className="pane-button active-code" onClick={handleSentimentAnalysis}>
                    {isAnalyzingSentiment ? "⏳ Analyzing..." : "▶ Run Analysis"}
                  </button>
                  {sentimentResults.length > 0 && (
                    <button className="pane-button" style={{ color: '#f87171' }} onClick={() => setSentimentResults([])}>
                      ✕ Clear Results
                    </button>
                  )}
                </div>
              </div>
              <div className="pane-block">
                <div className="pane-header"><span className="pane-title">Manual Coding</span></div>
                <div className="pane-body">
                  <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: 0, lineHeight: 1.5 }}>
                    Select text in the Preview tab to manually assign sentiment using the floating palette.
                  </p>
                </div>
              </div>
            </>
          )}

          {/* TAB 4: WINDOW SIDEBAR */}
          {activeTab === "Window" && (
            <>
              <div className="pane-block">
                <div className="pane-header"><span className="pane-title">Workspace Overview</span></div>
                <div className="pane-body">
                  <div className="pane-button">
                    Project ID: <strong>{projectId}</strong>
                  </div>
                  <div className="pane-button">
                    Active Views: <strong>{["Coding", "NER", "Sentiment"].length}</strong>
                  </div>
                </div>
              </div>

              <div className="pane-block">
                <div className="pane-header"><span className="pane-title">Analytical Tools</span></div>
                <div className="pane-body" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <button className="pane-button" onClick={() => setActiveTab("Coding")}>📝 Coding Workspace</button>
                  <button className="pane-button" onClick={() => setActiveTab("NER")}>🔍 NER Extraction</button>
                  <button className="pane-button" onClick={() => setActiveTab("Sentiment")}>📊 Sentiment Analysis</button>
                </div>
              </div>

              <div className="pane-block">
                <div className="pane-header"><span className="pane-title">Resources</span></div>
                <div className="pane-body">
                  <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: 0, lineHeight: 1.5 }}>
                    The Window menu is your central hub for managing data and analytical tools.
                  </p>
                </div>
              </div>
            </>
          )}

          {/* TAB 5: NOTE/MEMO SIDEBAR */}
          {activeTab === "Note/Memo" && (
            <>
              <div className="pane-block">
                <div className="pane-header"><span className="pane-title">Memo Categories</span></div>
                <div className="pane-body" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <div className="pane-button">📝 Project Memos</div>
                  <div className="pane-button">📎 Segment Memos</div>
                  <div className="pane-button">🏷️ Code Definitions</div>
                </div>
              </div>
              <div className="pane-block">
                <div className="pane-header"><span className="pane-title">Quick Tips</span></div>
                <div className="pane-body">
                  <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: 0, lineHeight: 1.5 }}>
                    Memos help you document your analytical process. Use Project Memos for general thoughts and Segment Memos for specific text insights.
                  </p>
                </div>
              </div>
            </>
          )}

          {/* TAB 6: EXPORT SIDEBAR */}
          {activeTab === "Export" && (
            <>
              <div className="pane-block">
                <div className="pane-header"><span className="pane-title">Export Summary</span></div>
                <div className="pane-body">
                  <div className="pane-button">
                    Coded Segments: <strong>{segments.length}</strong>
                  </div>
                  <div className="pane-button">
                    Thematic Codes: <strong>{codes.length}</strong>
                  </div>
                </div>
              </div>
              <div className="pane-block">
                <div className="pane-header"><span className="pane-title">File Formats</span></div>
                <div className="pane-body">
                  <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: 0, lineHeight: 1.5 }}>
                    <strong>Excel:</strong> Full dataset with entities.<br />
                    <strong>HTML:</strong> Visual report with highlights.<br />
                    <strong>Text:</strong> Raw text summary.
                  </p>
                </div>
              </div>
            </>
          )}

        </div>

        {/* WORKSPACE RENDERING */}
        <div className="editor-workspace">
          {activeTab === "Coding" && (
            <HighlightWorkspace
              documentContent={documentContent}
              setDocumentContent={setDocumentContent}
              selectedColor={selectedColor}
              selectedCode={selectedCode}
              documentId={documentId}
              projectId={projectId}
              codes={codes}
              codingMode={codingMode}
              reloadCodes={() => loadProjectData(true)}
            />
          )}

          {activeTab === "NER" && (
            <NERWorkspace
              documentContent={getCleanText(documentContent)}
              entities={nerEntities}
              onUpdateEntities={handleUpdateEntities}
            />
          )}

          {activeTab === "Sentiment" && (
            <SentimentWorkspace
              documentContent={getCleanText(documentContent)}
              sentimentResults={sentimentResults}
              onApplyLexicon={handleApplyLexicon}
              lexiconMatches={lexiconMatches}
              onManualSentiment={handleManualSentiment}
              onUpdateMatches={handleUpdateMatches}
              projectId={projectId}
              nerEntities={nerEntities}
            />
          )}

          {activeTab === "Window" && (
            <div className="window-workspace">
              <div className="window-grid">
                {[
                  { name: "Coding", icon: "📝", desc: "Manage hierarchical codes and document highlighting." },
                  { name: "NER", icon: "🔍", desc: "Extract and tag named entities automatically or manually." },
                  { name: "Sentiment", icon: "📊", desc: "Analyze document sentiment and apply lexicons." },
                  { name: "Note/Memo", icon: "📓", desc: "Record observations and analytical memos." },
                  { name: "Export", icon: "📤", desc: "Export your findings and coded data." }
                ].map((win) => (
                  <div key={win.name} className="window-card" onClick={() => setActiveTab(win.name)}>
                    <div className="window-icon">{win.icon}</div>
                    <div className="window-info">
                      <h3>{win.name}</h3>
                      <p>{win.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "Note/Memo" && (
            <NoteMemoWorkspace
              projectId={projectId}
              codes={codes}
              segments={segments}
            />
          )}

          {activeTab === "Export" && (
            <ExportWorkspace projectId={projectId} />
          )}

        </div>
      </div>

      {/* CONTEXT MENU */}
      {contextMenu && (
        <div
          className="context-menu"
          style={{ position: "absolute", top: contextMenu.y, left: contextMenu.x, background: "#0c0822ff", border: "1px solid #ccc", zIndex: 1000 }}
          onMouseLeave={() => setContextMenu(null)}
        >
          <div className="pane-button" onClick={() => alert("Merge logic here")}>Merge</div>
          <div className="pane-button" onClick={() => alert("Split logic here")}>Split</div>
          <div className="pane-button delete" onClick={handleDeleteCode}>Delete</div>
        </div>
      )}
      {/* GLOBAL CONTEXT MENU */}
      {globalContextMenu && (
        <div
          className="context-menu global-context-menu"
          style={{ position: "absolute", top: globalContextMenu.y, left: globalContextMenu.x, zIndex: 4000 }}
        >
          <div className="context-header">Features</div>
          {["Coding", "NER", "Sentiment", "Window", "Note/Memo", "Export"].map(tab => (
            <div key={tab} className="context-item" onClick={() => setActiveTab(tab)}>
              {tab === "Window" ? "🗔 " : ""} {tab}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Editor;