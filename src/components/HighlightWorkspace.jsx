import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import "./HighlightWorkspace.css";

function HighlightWorkspace({
  documentContent,
  setDocumentContent,
  selectedColor,
  documentId,
  projectId,
  codes,
  reloadCodes,
  selectedCode,
}) {
  const [tooltip, setTooltip] = useState(null);
  const [codeType, setCodeType] = useState("main");
  const [codeName, setCodeName] = useState("");
  const [selectedParent, setSelectedParent] = useState("");
  const [highlightColor, setHighlightColor] = useState("#2563eb");
  const editableRef = useRef(null);

  const colorOptions = [
    "#ef4444",
    "#f97316",
    "#eab308",
    "#22c55e",
    "#06b6d4",
    "#3b82f6",
    "#8b5cf6",
    "#ec4899",
  ];

  /* ================= LOAD DOCUMENT CONTENT ================= */
  /* ================= LOAD DOCUMENT CONTENT ================= */
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    if (!editableRef.current) return;

    if (editableRef.current.innerHTML !== documentContent) {
      editableRef.current.innerHTML = documentContent || "";
    }
  }, [documentContent]);


  /* ================= RESTORE HIGHLIGHTS AFTER REFRESH ================= */
  useEffect(() => {
    const loadSegments = async () => {
      if (!documentId || !editableRef.current || !codes.length) return;

      try {
        const res = await axios.get(
          `http://127.0.0.1:8000/segments/?document_id=${documentId}`
        );

        const segments = res.data;
        if (!segments.length) return;

        let text = documentContent;

        segments
          .sort((a, b) => b.start_index - a.start_index)
          .forEach((segment) => {
            const codeId = segment.code_ids?.[0];
            const codeObj = codes.find((c) => c.id === codeId);
            if (!codeObj) return;

            const bgColor = codeObj.parent_id
              ? lightenColor(codeObj.color, 55)
              : codeObj.color;

            const spanHTML = `
              <span 
                class="highlight-tag ${codeObj.parent_id ? "highlight-sub" : "highlight-main"
              }"
                data-code-id="${codeId}"
                style="background-color:${bgColor};"
              >
                ${segment.selected_text}
              </span>
            `;

            text =
              text.slice(0, segment.start_index) +
              spanHTML +
              text.slice(segment.end_index);
          });

        editableRef.current.innerHTML = text;
      } catch (err) {
        console.error("Failed to restore highlights:", err);
      }
    };

    loadSegments();
  }, [documentId, codes]);

  /* ================= GLOW EFFECT ================= */
  useEffect(() => {
    if (!selectedCode || !editableRef.current) return;

    const highlightSpans =
      editableRef.current.querySelectorAll(".highlight-tag");

    highlightSpans.forEach((span) => {
      span.classList.remove("active-highlight");

      if (Number(span.dataset.codeId) === Number(selectedCode.id)) {
        span.classList.add("active-highlight");
      }
    });
  }, [selectedCode]);

  /* ================= TEXT SELECTION ================= */
  const handleTextSelection = () => {
    const selection = window.getSelection();

    if (!selection || selection.toString().trim() === "") {
      setTooltip(null);
      return;
    }

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    setTooltip({
      x: rect.left,
      y: rect.top - 70,
      text: selection.toString(),
      range: range.cloneRange(),
    });
  };

  /* ================= LIGHTEN COLOR ================= */
  const lightenColor = (hex, percent = 55) => {
    const num = parseInt(hex.replace("#", ""), 16);
    const r = (num >> 16) + Math.round(2.55 * percent);
    const g = ((num >> 8) & 0x00ff) + Math.round(2.55 * percent);
    const b = (num & 0x0000ff) + Math.round(2.55 * percent);

    return (
      "#" +
      (
        0x1000000 +
        (r < 255 ? r : 255) * 0x10000 +
        (g < 255 ? g : 255) * 0x100 +
        (b < 255 ? b : 255)
      )
        .toString(16)
        .slice(1)
    );
  };

  /* ================= APPLY HIGHLIGHT ================= */
  const applyHighlight = async () => {
    if (!tooltip || !codeName.trim()) return;

    const { range, text } = tooltip;

    let parentId = null;

    if (codeType === "sub") {
      if (!selectedParent) {
        alert("Please select parent code");
        return;
      }
      parentId = selectedParent;
    }

    try {
      const codeRes = await axios.post("http://127.0.0.1:8000/codes/", {
        name: codeName,
        project_id: projectId,
        parent_id: parentId,
        color: highlightColor,
      });

      const createdCode = codeRes.data;
      const codeId = createdCode.id;

      const preRange = range.cloneRange();
      preRange.selectNodeContents(editableRef.current);
      preRange.setEnd(range.startContainer, range.startOffset);

      const startIndex = preRange.toString().length;
      const endIndex = startIndex + text.length;

      await axios.post("http://127.0.0.1:8000/segments/", {
        document_id: documentId,
        start_index: startIndex,
        end_index: endIndex,
        selected_text: text,
        code_ids: [codeId],
      });

      const span = document.createElement("span");
      span.classList.add("highlight-tag");

      if (codeType === "main") {
        span.classList.add("highlight-main");
        span.style.backgroundColor = highlightColor;
      } else {
        span.classList.add("highlight-sub");
        span.style.backgroundColor = lightenColor(highlightColor, 55);
      }

      span.textContent = text;
      span.dataset.codeId = codeId;

      range.deleteContents();
      range.insertNode(span);

      const newContent = editableRef.current.innerHTML;
      setDocumentContent(newContent);

      // ✅ Auto-save after highlighting
      await axios.put(`http://127.0.0.1:8000/documents/${documentId}`, {
        content: newContent
      });

      window.getSelection().removeAllRanges();

      setTooltip(null);
      setCodeName("");
      setSelectedParent("");
      setCodeType("main");

      if (reloadCodes) {
        reloadCodes(true);  // pass a flag
      }
    } catch (err) {
      console.error("Save error:", err);
    }
  };

  /* ================= SAVE DOCUMENT CONTENT ================= */
  const [isSaving, setIsSaving] = useState(false);
  const handleSaveDocument = async () => {
    if (!documentId || !editableRef.current) return;

    setIsSaving(true);
    try {
      const currentContent = editableRef.current.innerHTML;
      setDocumentContent(currentContent);

      await axios.put(`http://127.0.0.1:8000/documents/${documentId}`, {
        content: currentContent
      });

    } catch (error) {
      console.error("Failed to save document:", error);
      alert("Failed to save changes.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="highlight-wrapper">
      <div
        ref={editableRef}
        className="highlight-editor"
        contentEditable
        suppressContentEditableWarning
        // ✅ FIX: save HTML instead of plain text
        onInput={(e) =>
          setDocumentContent(e.currentTarget.innerHTML)
        }
        onBlur={handleSaveDocument}
        onMouseUp={handleTextSelection}
      />
      <div className="workspace-header" style={{ marginTop: '12px' }}>
        <button
          className="save-changes-button"
          onClick={handleSaveDocument}
          disabled={isSaving}
        >
          {isSaving ? "Saving..." : "Save Changes"}
        </button>
      </div>

      {tooltip && (
        <div
          className="highlight-tooltip"
          style={{
            top: tooltip.y,
            left: tooltip.x,
          }}
        >
          <div className="code-form">
            <div className="code-type-group">
              <label>
                <input
                  type="radio"
                  value="main"
                  checked={codeType === "main"}
                  onChange={() => setCodeType("main")}
                />
                Main
              </label>

              <label>
                <input
                  type="radio"
                  value="sub"
                  checked={codeType === "sub"}
                  onChange={() => setCodeType("sub")}
                />
                Sub
              </label>
            </div>

            {codeType === "sub" && (
              <select
                value={selectedParent}
                onChange={(e) => setSelectedParent(e.target.value)}
              >
                <option value="">Select Parent</option>
                {codes
                  ?.filter((c) => !c.parent_id)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
            )}

            <input
              type="text"
              placeholder="Enter code name"
              value={codeName}
              onChange={(e) => setCodeName(e.target.value)}
            />

            <div style={{ display: "flex", gap: "8px", margin: "8px 0", flexWrap: "wrap" }}>
              {colorOptions.map((color) => (
                <div
                  key={color}
                  onClick={() => setHighlightColor(color)}
                  style={{
                    width: "18px",
                    height: "18px",
                    borderRadius: "50%",
                    cursor: "pointer",
                    backgroundColor: color,
                    border:
                      highlightColor === color
                        ? "2px solid white"
                        : "2px solid transparent",
                  }}
                />
              ))}
            </div>

            <button onClick={applyHighlight}>
              Create
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default HighlightWorkspace;