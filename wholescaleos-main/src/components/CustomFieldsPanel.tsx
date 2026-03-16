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
      <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-5 h-5 animate-spin text-brand-400" />
          <span className="ml-2 text-sm text-slate-400">Loading custom fields...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-purple-500/10 to-brand-500/10 rounded-xl p-4 border border-purple-500/30 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">⭐</span>
          <h3 className="font-semibold text-white">Custom Lead Fields</h3>
          <span className="text-xs bg-slate-700 px-2 py-0.5 rounded-full text-slate-300">
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
        <div className="mb-4 p-3 bg-slate-800/50 rounded-lg border border-purple-500/30">
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={newFieldName}
              onChange={(e) => setNewFieldName(e.target.value)}
              placeholder="Field name (e.g., Lot Size, ARV, Equity)"
              className="flex-1 px-3 py-1.5 text-sm rounded-lg bg-slate-700 border border-slate-600 text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              autoFocus
            />
            <select
              value={newFieldType}
              onChange={(e) => setNewFieldType(e.target.value as 'text' | 'number')}
              className="px-3 py-1.5 text-sm rounded-lg bg-slate-700 border border-slate-600 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            >
              <option value="text">Text</option>
              <option value="number">Number</option>
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowAddForm(false)}
              className="px-3 py-1 text-sm rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
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
        <div className="mb-3 p-2 bg-emerald-500/20 border border-emerald-500/30 rounded-lg text-emerald-400 text-xs flex items-center gap-1">
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
              className="group flex items-center gap-1 px-3 py-1.5 bg-slate-800/80 rounded-lg border border-slate-700 hover:border-purple-500/30 transition-colors"
            >
              <span className="text-xs font-medium text-slate-300">{field.name}</span>
              <span className="text-[10px] text-slate-500 px-1">|</span>
              <span className="text-[10px] text-purple-400">{field.field_type}</span>
              {deletingId === field.id ? (
                <Loader2 size={12} className="ml-1 animate-spin text-slate-500" />
              ) : (
                <button
                  onClick={() => handleDeleteField(field.id)}
                  className="ml-1 opacity-0 group-hover:opacity-100 hover:text-red-400 transition-all"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-500 italic">
          No custom fields yet. Add fields like "Lot Size", "ARV", or "Equity" to track additional lead data.
        </p>
      )}
    </div>
  );
}