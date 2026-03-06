/**
 * HighlightWorkspace Component (Function-Based)
 *
 * The main thematic coding workspace. Users can select text in the
 * document editor, assign a code name, pick a color, and create highlights.
 * Supports hierarchical codes (main + sub-codes) and persists segments
 * and codes to the backend via REST API.
 *
 * Props:
 *   - documentContent    : HTML content of the active document
 *   - setDocumentContent  : setter to update content after highlight changes
 *   - documentId          : ID of the current document in the database
 *   - projectId           : ID of the current project
 *   - codes               : flat array of all codes in the project
 *   - reloadCodes         : callback to refresh codes from backend
 *   - selectedCode        : currently selected code in the sidebar
 */
import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import "./HighlightWorkspace.css";

const COLOR_OPTIONS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899",
];

function HighlightWorkspace({
  documentContent,
  setDocumentContent,
  documentId,
  projectId,
  codes,
  reloadCodes,
  selectedCode,
}) {
  const [tooltip, setTooltip] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    type: "main",
    parentId: "",
    color: "#3b82f6",
  });
  const [isSaving, setIsSaving] = useState(false);
  const editableRef = useRef(null);

  /**
   * Helper: Visualizes hierarchy depth with dash prefixes in the parent dropdown.
   * Traverses the parent chain to determine the depth of a code.
   * 
   * @param {Object} code - The code object to check.
   * @param {Array} allCodes - The flat array of all codes for reference.
   * @returns {string} - A string of dashes representing depth.
   */
  const getDepthPrefix = (code, allCodes) => {
    let depth = 0;
    let curr = code;
    while (curr.parent_id) {
      curr = allCodes.find((c) => c.id === Number(curr.parent_id));
      if (!curr) break;
      depth++;
    }
    return "— ".repeat(depth);
  };

  useEffect(() => {
    if (editableRef.current && documentContent) {
      if (!editableRef.current.innerHTML.trim()) {
        editableRef.current.innerHTML = documentContent;
      }
    }
  }, [documentContent]);

  useEffect(() => {
    if (!editableRef.current) return;
    const spans = editableRef.current.querySelectorAll(".highlight-tag");
    spans.forEach((span) => {
      const isSelected = selectedCode && Number(span.dataset.codeId) === Number(selectedCode.id);
      span.classList.toggle("active-highlight", !!isSelected);
    });
  }, [selectedCode]);

  /**
   * Detects text selection and show the floating tooltip for code creation.
   * Triggered on the mouseup event within the document editor.
   */
  const handleMouseUp = () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !editableRef.current.contains(selection.anchorNode)) {
      setTooltip(null);
      return;
    }

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    setTooltip({
      text: selection.toString(),
      range: range.cloneRange(),
      x: rect.left + rect.width / 2,
      y: rect.top + window.scrollY - 10,
    });
  };

  /**
   * Creates a new highlight segment and associated code.
   * 
   * Workflow:
   * 1. API call to create the code in the database.
   * 2. Calculate the character index of the selection relative to clean text.
   * 3. API call to save the segment with the new code ID.
   * 4. Update the DOM by wrapping the selection in a `<span class="highlight-tag">`.
   * 5. Sync the updated document HTML back to the backend.
   */
  const createHighlight = async () => {
    if (!formData.name.trim() || !tooltip) return;

    try {
      const parentValue = formData.type === "sub" && formData.parentId ? Number(formData.parentId) : null;

      // Step A: Create the Code
      const codeRes = await axios.post("http://127.0.0.1:8000/codes/", {
        name: formData.name,
        project_id: projectId,
        parent_id: parentValue,
        color: formData.color,
      });
      const newCode = codeRes.data;

      // Step B: Index Calculation
      const preRange = tooltip.range.cloneRange();
      preRange.selectNodeContents(editableRef.current);
      preRange.setEnd(tooltip.range.startContainer, tooltip.range.startOffset);
      const startIndex = preRange.toString().length;

      // Step C: Save Segment
      await axios.post("http://127.0.0.1:8000/segments/", {
        document_id: documentId,
        start_index: startIndex,
        end_index: startIndex + tooltip.text.length,
        selected_text: tooltip.text,
        code_ids: [newCode.id],
      });

      // Step D: DOM Update
      const span = document.createElement("span");
      const isSub = formData.type === "sub";
      span.className = `highlight-tag ${isSub ? "h-sub" : "h-main"}`;
      span.dataset.codeId = newCode.id;
      span.style.backgroundColor = formData.color;

      try {
        tooltip.range.surroundContents(span);
      } catch (e) {
        const content = tooltip.range.extractContents();
        span.appendChild(content);
        tooltip.range.insertNode(span);
      }

      // Step E: Sync
      const updatedHTML = editableRef.current.innerHTML;
      setDocumentContent(updatedHTML);
      await axios.put(`http://127.0.0.1:8000/documents/${documentId}`, { content: updatedHTML });

      setTooltip(null);
      setFormData({ ...formData, name: "" });
      window.getSelection().removeAllRanges();
      if (reloadCodes) reloadCodes(true);

    } catch (err) {
      console.error("Highlighting Error:", err);
      alert("Failed to create highlight. Check console.");
    }
  };

  /**
   * Manually saves the current document HTML to the backend.
   * Useful to ensure all DOM-based highlights are persisted correctly.
   */
  const handleManualSave = async () => {
    if (!documentId) return;
    setIsSaving(true);
    try {
      await axios.put(`http://127.0.0.1:8000/documents/${documentId}`, {
        content: editableRef.current.innerHTML,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="workspace-container">
      <div className="document-editor-wrapper">
        <div
          className="document-editor"
          ref={editableRef}
          contentEditable
          suppressContentEditableWarning
          onMouseUp={handleMouseUp}
        />
      </div>

      <div className="workspace-footer">
        <button className="save-btn" onClick={handleManualSave} disabled={isSaving}>
          <span className="save-icon">{isSaving ? "⏳" : "💾"}</span>
          {isSaving ? "Saving..." : "Save Progress"}
        </button>
      </div>

      {tooltip && (
        <div
          className="floating-tooltip"
          style={{ left: tooltip.x, top: tooltip.y }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="tooltip-card">
            <div className="type-toggle">
              <button
                className={formData.type === "main" ? "active" : ""}
                onClick={() => setFormData({ ...formData, type: "main" })}
              >Main Code</button>
              <button
                className={formData.type === "sub" ? "active" : ""}
                onClick={() => setFormData({ ...formData, type: "sub" })}
              >Sub Code</button>
            </div>

            {formData.type === "sub" && (
              <select
                className="parent-select"
                value={formData.parentId}
                onChange={(e) => setFormData({ ...formData, parentId: e.target.value })}
              >
                <option value="">Select Parent...</option>
                {codes.map(c => (
                  <option key={c.id} value={c.id}>
                    {getDepthPrefix(c, codes)} {c.name}
                  </option>
                ))}
              </select>
            )}

            <input
              className="code-input"
              type="text"
              placeholder="Code Name..."
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              autoFocus
            />

            <div className="color-picker">
              {COLOR_OPTIONS.map(color => (
                <div
                  key={color}
                  className={`color-swatch ${formData.color === color ? "active" : ""}`}
                  style={{ backgroundColor: color }}
                  onClick={() => setFormData({ ...formData, color })}
                />
              ))}
            </div>

            <button className="apply-btn" onClick={createHighlight}>Create Highlight</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default HighlightWorkspace;