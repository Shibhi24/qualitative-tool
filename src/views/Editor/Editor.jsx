import React, { useState, useRef, useEffect } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import "./Editor.css";
import HighlightWorkspace from "../../components/HighlightWorkspace";

function Editor() {

  const { projectId } = useParams();

  const [activeTab, setActiveTab] = useState("Coding");
  const [codingMode, setCodingMode] = useState("Document");
  const [showDropdown, setShowDropdown] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);
  const [selectedColor, setSelectedColor] = useState("#2563eb");

  const [documentContent, setDocumentContent] = useState("");
  const [documentId, setDocumentId] = useState(null);
  const [codes, setCodes] = useState([]);

  // ✅ Selected Code
  const [selectedCode, setSelectedCode] = useState(null);

  const dropdownRef = useRef(null);

  /* ================= LOAD DATA ================= */
  useEffect(() => {
    if (!projectId) return;
    loadProjectData();
  }, [projectId]);

  const loadProjectData = async (onlyCodes = false) => {
    try {

      if (!onlyCodes) {
        const docRes = await axios.get(
          `http://127.0.0.1:8000/documents/?project_id=${projectId}`
        );

        if (docRes.data.length > 0) {
          setDocumentContent(docRes.data[0].content);
          setDocumentId(docRes.data[0].id);
        }
      }

      const codeRes = await axios.get(
        `http://127.0.0.1:8000/codes/?project_id=${projectId}`
      );

      setCodes(codeRes.data);

    } catch (err) {
      console.error("Error loading project:", err);
    }
  };

  /* ================= RESTORE SELECTED CODE AFTER REFRESH ================= */
  useEffect(() => {
    if (!codes.length) return;

    const savedCodeId = localStorage.getItem("selectedCodeId");

    if (savedCodeId) {
      const matched = codes.find(
        (c) => Number(c.id) === Number(savedCodeId)
      );

      if (matched) {
        setSelectedCode(matched);
        return; // stop here if found
      }
    }

    // ✅ If no saved code OR not found, select first main code
    const firstMain = codes.find(
      (code) => code.parent_id === null || code.parent_id === 0
    );

    if (firstMain) {
      setSelectedCode(firstMain);
      localStorage.setItem("selectedCodeId", firstMain.id);
    }

  }, [codes]);

  /* ================= TREE ================= */
  const mainCodes = codes.filter(
    (code) => code.parent_id === null || code.parent_id === 0
  );

  const getSubCodes = (parentId) =>
    codes.filter(
      (code) => Number(code.parent_id) === Number(parentId)
    );

  /* ================= RIGHT CLICK ================= */
  const handleRightClick = (event, type, code) => {
    event.preventDefault();
    setContextMenu({
      type,
      code,
      x: event.clientX,
      y: event.clientY,
    });
  };

  /* ================= DELETE ================= */
  const handleDelete = async () => {
    if (!contextMenu?.code) return;

    try {
      await axios.delete(
        `http://127.0.0.1:8000/codes/${contextMenu.code.id}`
      );

      setContextMenu(null);
      loadProjectData();
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  /* ================= SPLIT ================= */
  const handleSplit = async () => {
    if (!contextMenu?.code) return;

    try {
      await axios.put(
        `http://127.0.0.1:8000/codes/${contextMenu.code.id}`,
        { parent_id: null }
      );

      setContextMenu(null);
      loadProjectData();
    } catch (err) {
      console.error("Split failed:", err);
    }
  };

  /* ================= MERGE ================= */
  const handleMerge = async () => {
    if (!contextMenu?.code) return;

    const code = contextMenu.code;

    if (!code.parent_id) {
      alert("Only subcodes can be merged into parent.");
      return;
    }

    try {
      await axios.delete(
        `http://127.0.0.1:8000/codes/${code.id}`
      );

      setContextMenu(null);
      loadProjectData();
    } catch (err) {
      console.error("Merge failed:", err);
    }
  };

  /* ================= CLOSE CONTEXT MENU ================= */
  useEffect(() => {
    const handleClick = () => {
      setContextMenu(null);
      setShowDropdown(false);
    };
    window.addEventListener("mousedown", handleClick);
    return () => window.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="editor-container">

      {/* ================= NAVBAR ================= */}
      <div className="editor-navbar">
        {["Coding", "NER", "Sentiment", "Window", "Note/Memo", "Export"].map(
          (tab) => (
            <button
              key={tab}
              className={`nav-btn ${activeTab === tab ? "active" : ""}`}
              onClick={() => {
                setActiveTab(tab);
                setShowDropdown(false);
              }}
            >
              {tab}
            </button>
          )
        )}
      </div>

      <div className="editor-body">
        {activeTab === "Coding" && (
          <>
            <div className="editor-sidebar">

              {/* ===== CODING MODE ===== */}
              <div className="pane-block">
                <div className="pane-header">
                  <span className="pane-title">Coding Mode</span>
                </div>

                <div className="pane-body">
                  <div className="pane-item">
                    <div
                      className="pane-button"
                      onContextMenu={(e) => {
                        e.preventDefault();
                        setShowDropdown(true);
                      }}
                    >
                      Coding Level: <strong>{codingMode}</strong>
                    </div>

                    {showDropdown && (
                      <div className="coding-popup">
                        <div className="coding-popup-content">
                          {["Document", "Paragraph", "Sentence", "Word"].map((mode) => (
                            <div
                              key={mode}
                              className={`coding-popup-item ${codingMode === mode ? "selected" : ""}`}
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                setCodingMode(mode);
                                setShowDropdown(false);
                              }}
                            >
                              <span className="mode-label">{mode}</span>
                              <div className="radio-circle">
                                {codingMode === mode && <div className="radio-dot" />}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ===== CODES TREE ===== */}
              <div className="pane-block">
                <div className="pane-header">
                  <span className="pane-title">Codes</span>
                </div>
                <div className="pane-body">

                  {mainCodes.map((main) => (
                    <div key={main.id}>
                      <div className="pane-item">
                        <div
                          className={`pane-button ${selectedCode?.id === main.id ? "active-code" : ""
                            }`}
                          onClick={() => {
                            setActiveTab("Coding");
                            setSelectedCode(main);
                            localStorage.setItem("selectedCodeId", main.id); // ✅ added
                          }}
                          onContextMenu={(e) =>
                            handleRightClick(e, "main", main)
                          }
                        >
                          {main.name}
                        </div>
                      </div>

                      {getSubCodes(main.id).map((sub) => (
                        <div
                          key={sub.id}
                          className="pane-item"
                          style={{ paddingLeft: "20px" }}
                        >
                          <div
                            className={`pane-button ${selectedCode?.id === sub.id ? "active-code" : ""
                              }`}
                            onClick={() => {
                              setActiveTab("Coding");
                              setSelectedCode(sub);
                              localStorage.setItem("selectedCodeId", sub.id); // ✅ added
                            }}
                            onContextMenu={(e) =>
                              handleRightClick(e, "sub", sub)
                            }
                          >
                            {sub.name}
                          </div>
                        </div>
                      ))}

                    </div>
                  ))}

                </div>
              </div>

              {/* ===== COLOR SECTION ===== */}
              <div className="pane-block">
                <div className="pane-header">
                  <span className="pane-title">Colour</span>
                </div>
                <div className="pane-body">
                  <div className="color-grid">
                    {[
                      "#60a5fa",
                      "#f87171",
                      "#34d399",
                      "#fbbf24",
                      "#a78bfa",
                      "#f472b6"
                    ].map((color) => (
                      <span
                        key={color}
                        className={`color-dot ${selectedColor === color ? "selected" : ""
                          }`}
                        style={{ background: color }}
                        onClick={() => setSelectedColor(color)}
                      />
                    ))}
                  </div>
                </div>
              </div>

            </div>

            <HighlightWorkspace
              documentContent={documentContent}
              setDocumentContent={setDocumentContent}
              selectedColor={selectedColor}
              selectedCode={selectedCode}
              documentId={documentId}
              projectId={projectId}
              codes={codes}
              codingMode={codingMode}
              reloadCodes={loadProjectData}
            />
          </>
        )}
      </div>

      {contextMenu && (
        <div
          className="context-menu"
          style={{
            top: contextMenu.y,
            left: contextMenu.x,
          }}
        >
          <div className="context-item" onClick={handleMerge}>Merge</div>
          <div className="context-item" onClick={handleSplit}>Split</div>
          <div className="context-item delete" onClick={handleDelete}>Delete</div>
        </div>
      )}

    </div>
  );
}

export default Editor;