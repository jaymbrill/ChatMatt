import React, { useState } from 'react';
import { Audience } from '../types';
import axios from 'axios';

interface Props {
  audiences: Audience[];
  selected: Audience | null;
  onSelect: (audience: Audience) => void;
  onAudienceUpdated: () => void;
}

const RELATIONSHIP_ICONS: Record<string, string> = {
  wife: '💑',
  parents: '👨‍👩‍👦',
  children: '👧👦',
};

const RELATIONSHIP_COLORS: Record<string, string> = {
  wife: 'from-pink-900/40 to-rose-900/40 border-pink-700',
  parents: 'from-amber-900/40 to-yellow-900/40 border-amber-700',
  children: 'from-green-900/40 to-emerald-900/40 border-green-700',
};

const SELECTED_COLORS: Record<string, string> = {
  wife: 'ring-2 ring-pink-500',
  parents: 'ring-2 ring-amber-500',
  children: 'ring-2 ring-green-500',
};

export default function AudienceSelector({ audiences, selected, onSelect, onAudienceUpdated }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [saving, setSaving] = useState(false);

  function startEdit(audience: Audience, e: React.MouseEvent) {
    e.stopPropagation();
    setEditingId(audience.id);
    setEditName(audience.name);
    setEditPhone(audience.phone_number);
  }

  async function saveEdit(audienceId: string) {
    setSaving(true);
    try {
      await axios.patch(`/api/audiences/${audienceId}`, {
        name: editName,
        phone_number: editPhone,
      });
      onAudienceUpdated();
      setEditingId(null);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <p className="section-title">Who are you calling?</p>
      <div className="space-y-2">
        {audiences.map(audience => (
          <div
            key={audience.id}
            onClick={() => { setEditingId(null); onSelect(audience); }}
            className={`
              card cursor-pointer bg-gradient-to-r ${RELATIONSHIP_COLORS[audience.relationship] || 'border-slate-700'}
              ${selected?.id === audience.id ? SELECTED_COLORS[audience.relationship] || 'ring-2 ring-brand-500' : 'hover:border-slate-600'}
              transition-all
            `}
          >
            {editingId === audience.id ? (
              <div onClick={e => e.stopPropagation()} className="space-y-2">
                <input
                  className="input text-sm"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  placeholder="Name"
                />
                <input
                  className="input text-sm"
                  value={editPhone}
                  onChange={e => setEditPhone(e.target.value)}
                  placeholder="+1 555 555 5555"
                />
                <div className="flex gap-2 pt-1">
                  <button
                    className="btn-primary text-sm py-1 px-3"
                    onClick={() => saveEdit(audience.id)}
                    disabled={saving}
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    className="btn-secondary text-sm py-1 px-3"
                    onClick={() => setEditingId(null)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{RELATIONSHIP_ICONS[audience.relationship]}</span>
                  <div>
                    <p className="font-semibold text-slate-100">{audience.name}</p>
                    <p className="text-xs text-slate-400 capitalize">{audience.relationship}</p>
                    {audience.phone_number ? (
                      <p className="text-xs text-slate-500">{audience.phone_number}</p>
                    ) : (
                      <p className="text-xs text-rose-400">No phone number set</p>
                    )}
                  </div>
                </div>
                <button
                  className="text-slate-500 hover:text-slate-300 text-xs transition-colors"
                  onClick={(e) => startEdit(audience, e)}
                >
                  Edit
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
