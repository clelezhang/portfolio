'use client';

import { useState } from 'react';
import { useDrawings } from '@/lib/supabase/hooks';
import type { Drawing } from '@/lib/supabase/types';

interface DrawingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onLoad: (data: Record<string, unknown>) => void;
  onSave: (name: string, existingId?: string) => Promise<void>;
  currentDrawingId?: string | null;
}

export function DrawingsPanel({
  isOpen,
  onClose,
  onLoad,
  onSave,
  currentDrawingId,
}: DrawingsPanelProps) {
  const { drawings, loading, deleteDrawing, loadDrawing } = useDrawings();
  const [saveName, setSaveName] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const handleSave = async () => {
    if (!saveName.trim()) return;
    setSaving(true);
    try {
      await onSave(saveName.trim(), currentDrawingId || undefined);
      setSaveName('');
    } catch (error) {
      console.error('Failed to save:', error);
      alert('Failed to save drawing');
    } finally {
      setSaving(false);
    }
  };

  const handleLoad = async (drawing: Drawing) => {
    try {
      const fullDrawing = await loadDrawing(drawing.id) as Drawing | null;
      if (fullDrawing?.data) {
        onLoad(fullDrawing.data as Record<string, unknown>);
        onClose();
      }
    } catch (error) {
      console.error('Failed to load:', error);
      alert('Failed to load drawing');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this drawing?')) return;
    setDeleting(id);
    try {
      await deleteDrawing(id);
    } catch (error) {
      console.error('Failed to delete:', error);
    } finally {
      setDeleting(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold">My Drawings</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Save current drawing */}
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Save current drawing
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              placeholder="Drawing name..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            />
            <button
              onClick={handleSave}
              disabled={saving || !saveName.trim()}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>

        {/* Drawings list */}
        <div className="flex-1 overflow-auto p-4">
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : drawings.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No saved drawings yet
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {drawings.map((drawing) => (
                <div
                  key={drawing.id}
                  className={`border rounded-lg overflow-hidden hover:border-blue-300 transition-colors ${
                    currentDrawingId === drawing.id ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'
                  }`}
                >
                  <button
                    onClick={() => handleLoad(drawing)}
                    className="w-full text-left"
                  >
                    {drawing.thumbnail ? (
                      <img
                        src={drawing.thumbnail}
                        alt={drawing.name}
                        className="w-full h-24 object-cover bg-gray-100"
                      />
                    ) : (
                      <div className="w-full h-24 bg-gray-100 flex items-center justify-center">
                        <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                    <div className="p-2">
                      <p className="text-sm font-medium truncate">{drawing.name}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(drawing.updated_at).toLocaleDateString()}
                      </p>
                    </div>
                  </button>
                  <div className="px-2 pb-2">
                    <button
                      onClick={() => handleDelete(drawing.id)}
                      disabled={deleting === drawing.id}
                      className="text-xs text-red-500 hover:text-red-700"
                    >
                      {deleting === drawing.id ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
