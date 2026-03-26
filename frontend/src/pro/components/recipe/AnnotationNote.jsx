import React, { useState, useRef, useEffect } from 'react';
import { Pencil, X } from 'lucide-react';

export default function AnnotationNote({ note, onSave, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(note || '');
  const inputRef = useRef(null);

  useEffect(() => {
    setValue(note || '');
  }, [note]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editing]);

  const handleSave = () => {
    const trimmed = value.trim();
    if (trimmed && trimmed !== note) {
      onSave(trimmed);
    } else if (!trimmed && note) {
      onDelete();
    }
    setEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    }
    if (e.key === 'Escape') {
      setValue(note || '');
      setEditing(false);
    }
  };

  if (editing) {
    return (
      <div className="flex items-center gap-1.5 mt-1">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          placeholder="Add a note..."
          className="flex-1 text-xs px-2 py-1 rounded-lg border border-terracotta/30 bg-terracotta/5 text-brown placeholder:text-warm-gray/60 focus:outline-none focus:border-terracotta focus:ring-1 focus:ring-terracotta/30"
        />
        {note && (
          <button
            onMouseDown={(e) => { e.preventDefault(); onDelete(); setEditing(false); }}
            className="p-0.5 text-warm-gray hover:text-red-500 transition-colors"
            title="Remove note"
          >
            <X size={12} />
          </button>
        )}
      </div>
    );
  }

  if (note) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="flex items-start gap-1 mt-1 text-xs text-terracotta/80 hover:text-terracotta transition-colors text-left group"
        title="Edit note"
      >
        <Pencil size={10} className="mt-0.5 shrink-0 opacity-60 group-hover:opacity-100" />
        <span className="italic leading-snug">{note}</span>
      </button>
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="mt-1 p-0.5 text-warm-gray/40 hover:text-terracotta transition-colors opacity-0 group-hover:opacity-100"
      title="Add note"
    >
      <Pencil size={12} />
    </button>
  );
}
