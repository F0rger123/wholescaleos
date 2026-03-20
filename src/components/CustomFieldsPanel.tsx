import { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { 
  fetchCustomFields, 
  createCustomField, 
  deleteCustomField,
  type CustomField 
} from '../lib/custom-fields';
import { Plus, X, Loader2, Check } from 'lucide-react';

export function CustomFieldsPanel() {
  const { teamId } = useStore();
  const [fields, setFields] = useState<CustomField[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState<'text' | 'number'>('text');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadFields();
  }, [teamId]);

  const loadFields = async () => {
    setLoading(true);
    if (teamId) {
      const data = await fetchCustomFields(teamId);
      setFields(data);
    }
    setLoading(false);
  };

  const handleAddField = async () => {
    if (!newFieldName.trim() || !teamId) return;

    setSaving(true);
    const result = await createCustomField(teamId, {
      name: newFieldName.trim(),
      type: newFieldType
    });

    if (result) {
      setNewFieldName('');
      setNewFieldType('text');
      setShowAddForm(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      await loadFields();
    }
    setSaving(false);
  };

  const handleDeleteField = async (fieldId: string) => {
    setDeletingId(fieldId);
    const success = await deleteCustomField(fieldId);
    if (success) {
      await loadFields();
    }
    setDeletingId(null);
  };

  if (loading) {
    return (
      <div className="bg-[var(--t-surface)]/50 rounded-xl p-4 border border-[var(--t-border)]">
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-5 h-5 animate-spin text-[var(--t-primary)]" />
          <span className="ml-2 text-sm text-[var(--t-text-muted)]">Loading custom fields...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-[var(--t-primary)]/10 to-[var(--t-primary)]/10 rounded-xl p-4 border border-[var(--t-primary)]/30 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">⭐</span>
          <h3 className="font-semibold text-white">Custom Lead Fields</h3>
          <span className="text-xs bg-[var(--t-surface-subtle)] px-2 py-0.5 rounded-full text-[var(--t-text-muted)]">
            {fields.length} {fields.length === 1 ? 'field' : 'fields'}
          </span>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-1 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg transition-colors"
        >
          <Plus size={14} />
          Add Field
        </button>
      </div>

      {/* Add Field Form */}
      {showAddForm && (
        <div className="mb-4 p-3 bg-[var(--t-surface)]/50 rounded-lg border border-[var(--t-primary)]/30">
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={newFieldName}
              onChange={(e) => setNewFieldName(e.target.value)}
              placeholder="Field name (e.g., Lot Size, ARV, Equity)"
              className="flex-1 px-3 py-1.5 text-sm rounded-lg bg-[var(--t-surface-subtle)] border border-[var(--t-border)] text-white placeholder:text-[var(--t-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--t-primary)]/50"
              autoFocus
            />
            <select
              value={newFieldType}
              onChange={(e) => setNewFieldType(e.target.value as 'text' | 'number')}
              className="px-3 py-1.5 text-sm rounded-lg bg-[var(--t-surface-subtle)] border border-[var(--t-border)] text-white focus:outline-none focus:ring-2 focus:ring-[var(--t-primary)]/50"
            >
              <option value="text">Text</option>
              <option value="number">Number</option>
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowAddForm(false)}
              className="px-3 py-1 text-sm rounded-lg bg-[var(--t-surface-subtle)] hover:bg-[var(--t-surface-dim)] text-[var(--t-text-muted)] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAddField}
              disabled={!newFieldName.trim() || saving}
              className="flex items-center gap-1 px-3 py-1 text-sm rounded-lg bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? (
                <><Loader2 size={12} className="animate-spin" /> Adding...</>
              ) : (
                <><Check size={12} /> Add Field</>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Success Message */}
      {saveSuccess && (
        <div className="mb-3 p-2 bg-[var(--t-success)]/20 border border-[var(--t-success)]/30 rounded-lg text-[var(--t-success)] text-xs flex items-center gap-1">
          <Check size={12} />
          Field added successfully!
        </div>
      )}

      {/* Fields List */}
      {fields.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {fields.map((field) => (
            <div
              key={field.id}
              className="group flex items-center gap-1 px-3 py-1.5 bg-[var(--t-surface)]/80 rounded-lg border border-[var(--t-border)] hover:border-[var(--t-primary)]/30 transition-colors"
            >
              <span className="text-xs font-medium text-[var(--t-text-muted)]">{field.name}</span>
              <span className="text-[10px] text-[var(--t-text-muted)] px-1">|</span>
              <span className="text-[10px] text-purple-400">{field.field_type}</span>
              {deletingId === field.id ? (
                <Loader2 size={12} className="ml-1 animate-spin text-[var(--t-text-muted)]" />
              ) : (
                <button
                  onClick={() => handleDeleteField(field.id)}
                  className="ml-1 opacity-0 group-hover:opacity-100 hover:text-[var(--t-error)] transition-all"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-[var(--t-text-muted)] italic">
          No custom fields yet. Add fields like "Lot Size", "ARV", or "Equity" to track additional lead data.
        </p>
      )}
    </div>
  );
}