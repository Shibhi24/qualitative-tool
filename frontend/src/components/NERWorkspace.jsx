/**
 * NERWorkspace Component (Function-Based)
 *
 * Displays the document with Named Entity Recognition (NER) highlights.
 * Refined for professional alignment and premium aesthetics.
 *
 * Features:
 *   - Entity control bar with counts and type toggles
 *   - Clean document view with overlapping detection
 *   - Integrated findings table for detailed review
 *
 * Props:
 *   - documentContent   : text content
 *   - entities           : array of { start, end, text, label }
 *   - onUpdateEntities   : sync callback
 */
import React, { useState, useMemo, useCallback, useRef } from "react";
import "./NERWorkspace.css";

function NERWorkspace({ documentContent, entities = [], onUpdateEntities }) {
  const documentRef = useRef(null);
  const [activeFilters, setActiveFilters] = useState(null); // null = show all
  const [showTable, setShowTable] = useState(true);

  // Modern Refined Color Palette
  const entityColors = {
    PERSON: { color: "#dbeafe", border: "#3b82f6", label: "Person", icon: "👤" },
    GPE: { color: "#dcfce7", border: "#22c55e", label: "Geo-Political", icon: "🌍" },
    ORG: { color: "#fef9c3", border: "#eab308", label: "Organization", icon: "🏢" },
    DATE: { color: "#f3e8ff", border: "#a855f7", label: "Date", icon: "📅" },
    LOC: { color: "#ecfdf5", border: "#10b981", label: "Location", icon: "📍" },
    NORP: { color: "#fce7f3", border: "#ec4899", label: "Nationality/Group", icon: "👥" },
    CARDINAL: { color: "#f1f5f9", border: "#64748b", label: "Number", icon: "🔢" },
    MONEY: { color: "#ffedd5", border: "#f97316", label: "Money", icon: "💰" },
    PERCENT: { color: "#fff7ed", border: "#fb923c", label: "Percent", icon: "📈" },
    TIME: { color: "#faf5ff", border: "#c084fc", label: "Time", icon: "🕒" },
    CUSTOM: { color: "#fef3c7", border: "#f59e0b", label: "Custom", icon: "🏷️" }
  };

  const entityStats = useMemo(() => {
    const stats = {};
    entities.forEach(ent => {
      const type = ent.label;
      if (!stats[type]) stats[type] = { count: 0 };
      stats[type].count++;
    });
    return stats;
  }, [entities]);

  const filteredEntities = useMemo(() => {
    if (!activeFilters || activeFilters.length === 0) return entities;
    return entities.filter(ent => activeFilters.includes(ent.label));
  }, [entities, activeFilters]);

  /**
   * Toggles an entity type filter in the activeFilters list.
   * If no filters are active, all entities are shown.
   * 
   * @param {string} type - The entity label to toggle.
   */
  const toggleFilter = (type) => {
    setActiveFilters(prev => {
      if (!prev) return [type];
      if (prev.includes(type)) {
        const updated = prev.filter(t => t !== type);
        return updated.length === 0 ? null : updated;
      }
      return [...prev, type];
    });
  };

  /* ----------------------------------------------------------
      Logic: Selection & Offsets
  ---------------------------------------------------------- */
  /**
   * Calculates the character offsets for the current text selection within the document view.
   * This ensures that selection start and end points are accurate relative to the raw text content.
   * 
   * @returns {Object|null} - { start, end, text } or null if selection is invalid.
   */
  const getSelectionOffsets = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return null;

    const range = selection.getRangeAt(0);
    const container = range.commonAncestorContainer;
    const article = documentRef.current;

    if (!article || !article.contains(container)) return null;

    const preRange = range.cloneRange();
    preRange.selectNodeContents(article);
    preRange.setEnd(range.startContainer, range.startOffset);

    const start = preRange.toString().length;
    const selectedText = range.toString();
    const end = start + selectedText.length;

    return { start, end, text: selectedText };
  };

  /**
   * Event handler for mouse-up events on the document.
   * Prompts the user for a label and creates a new NER entity if text is selected.
   * Prevents overlapping entities.
   */
  const handleTextSelection = useCallback(() => {
    const selectionData = getSelectionOffsets();
    if (!selectionData || !selectionData.text.trim()) return;

    const { start, end, text } = selectionData;

    if (entities.some(ent => (start < ent.end && end > ent.start))) {
      alert("Selection overlaps with existing entity.");
      window.getSelection().removeAllRanges();
      return;
    }

    const label = prompt("Enter entity label (e.g., PERSON, ORG, LOC):");
    if (!label || !label.trim()) {
      window.getSelection().removeAllRanges();
      return;
    }

    const newEntity = { start, end, text, label: label.trim().toUpperCase() };
    onUpdateEntities([...entities, newEntity].sort((a, b) => a.start - b.start));
    window.getSelection().removeAllRanges();
  }, [entities, onUpdateEntities]);

  /* ----------------------------------------------------------
      Render Logic
  ---------------------------------------------------------- */
  const renderedContent = useMemo(() => {
    if (!filteredEntities.length) return documentContent;

    const sorted = [...filteredEntities].sort((a, b) => a.start - b.start);
    const fragments = [];
    let cursor = 0;

    sorted.forEach((ent, i) => {
      if (cursor < ent.start) {
        fragments.push(<span key={`t-${i}`}>{documentContent.slice(cursor, ent.start)}</span>);
      }

      const style = entityColors[ent.label] || { color: "#f1f5f9", border: "#94a3b8" };

      fragments.push(
        <mark
          key={`e-${i}`}
          className="ner-h-modern"
          style={{ backgroundColor: style.color, borderColor: style.border }}
        >
          {documentContent.slice(ent.start, ent.end)}
          <span className="ner-b-modern" onClick={(e) => e.stopPropagation()}>
            {ent.label}
            <select
              className="ner-select-overlay"
              value={ent.label}
              onChange={(e) => {
                const val = e.target.value;
                if (val === "DELETE") {
                  onUpdateEntities(entities.filter(orig => !(orig.start === ent.start && orig.end === ent.end)));
                } else {
                  const updated = entities.map(orig =>
                    orig.start === ent.start && orig.end === ent.end ? { ...orig, label: val } : orig
                  );
                  onUpdateEntities(updated);
                }
              }}
            >
              <option value={ent.label}>{ent.label}</option>
              {Object.keys(entityColors).map(type => <option key={type} value={type}>{type}</option>)}
              <option value="DELETE">REMOVE</option>
            </select>
          </span>
        </mark>
      );
      cursor = ent.end;
    });

    if (cursor < documentContent.length) {
      fragments.push(<span key="e-last">{documentContent.slice(cursor)}</span>);
    }
    return fragments;
  }, [documentContent, filteredEntities, entities]);

  const uniqueTypes = Array.from(new Set(entities.map(e => e.label)));

  return (
    <div className="ner-workspace-container">
      {/* Control Bar */}
      <header className="ner-control-bar">
        <div className="ner-control-info">
          <span className="ner-icon">📊</span>
          <h2>Detection Overview</h2>
          <div className="ner-count-pill">{entities.length || 0} Entities Found</div>
        </div>
        <div className="ner-control-actions">
          <button onClick={() => setShowTable(!showTable)} className="ner-toggle-btn">
            {showTable ? "Hide Details" : "Show Details"}
          </button>
          <button onClick={() => setActiveFilters(null)} className="ner-clear-btn" disabled={!activeFilters}>
            Clear Filters
          </button>
        </div>
      </header>

      {/* Filter Legend */}
      {uniqueTypes.length > 0 && (
        <div className="ner-filter-panel">
          {uniqueTypes.map(type => {
            const info = entityColors[type] || { color: "#f1f5f9", label: type, icon: "🏷️" };
            const isActive = !activeFilters || activeFilters.includes(type);
            return (
              <button
                key={type}
                className={`ner-filter-chip ${isActive ? "active" : ""}`}
                onClick={() => toggleFilter(type)}
                style={{ "--chip-color": info.color }}
              >
                <span>{info.icon}</span>
                <span className="label">{info.label}</span>
                <span className="count">{entityStats[type]?.count || 0}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Main Content Area */}
      <main className="ner-main-layout">
        <div className="ner-editor-scroll">
          <article
            className="ner-paper-view"
            ref={documentRef}
            onMouseUp={handleTextSelection}
          >
            {renderedContent}
          </article>
        </div>

        {/* Integrated Table */}
        {showTable && entities.length > 0 && (
          <footer className="ner-results-footer">
            <div className="ner-table-header">
              <h3>Detailed Findings ({filteredEntities.length})</h3>
            </div>
            <div className="ner-table-wrapper">
              <table className="ner-modern-table">
                <thead>
                  <tr>
                    <th>Text</th>
                    <th>Label</th>
                    <th>Range</th>
                    <th style={{ width: 50 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEntities.map((ent, i) => (
                    <tr key={i}>
                      <td className="ner-text-col">"{ent.text}"</td>
                      <td>
                        <span
                          className="ner-mini-label"
                          style={{ background: entityColors[ent.label]?.color }}
                        >
                          {ent.label}
                        </span>
                      </td>
                      <td className="ner-range-col">{ent.start}–{ent.end}</td>
                      <td>
                        <button
                          className="ner-del-btn"
                          onClick={() => onUpdateEntities(entities.filter(orig => !(orig.start === ent.start && orig.end === ent.end)))}
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </footer>
        )}
      </main>
    </div>
  );
}

export default NERWorkspace;