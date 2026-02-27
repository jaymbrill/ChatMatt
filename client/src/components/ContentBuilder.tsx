import React, { useState } from 'react';

interface Props {
  lifeEvents: string[];
  questions: string[];
  onLifeEventsChange: (events: string[]) => void;
  onQuestionsChange: (questions: string[]) => void;
}

const SUGGESTED_EVENTS = [
  'Got a promotion at work',
  'Planning a family vacation',
  'Started a new hobby',
  'Finished a big project',
  'Had a funny thing happen',
  'Saw an old friend',
];

const SUGGESTED_QUESTIONS = [
  'How have you been?',
  'How\'s work going?',
  'How are the kids doing?',
  'What have you been up to?',
  'Anything exciting happening?',
  'How\'s your health?',
];

function TagList({
  items,
  onRemove,
  colorClass,
}: {
  items: string[];
  onRemove: (i: number) => void;
  colorClass: string;
}) {
  return (
    <div className="flex flex-wrap gap-2 min-h-[32px]">
      {items.map((item, i) => (
        <span
          key={i}
          className={`flex items-center gap-1 ${colorClass} text-sm px-2 py-1 rounded-full`}
        >
          {item}
          <button
            onClick={() => onRemove(i)}
            className="ml-1 hover:opacity-70 transition-opacity font-bold"
          >
            ×
          </button>
        </span>
      ))}
      {items.length === 0 && <p className="text-slate-600 text-sm italic">None added yet</p>}
    </div>
  );
}

function AddInput({
  placeholder,
  onAdd,
  suggestions,
  value,
  onChange,
}: {
  placeholder: string;
  onAdd: (text: string) => void;
  suggestions: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && value.trim()) {
      onAdd(value.trim());
      onChange('');
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          className="input text-sm flex-1"
          placeholder={placeholder}
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={handleKey}
        />
        <button
          className="btn-primary text-sm px-3 py-2"
          disabled={!value.trim()}
          onClick={() => { onAdd(value.trim()); onChange(''); }}
        >
          Add
        </button>
      </div>
      <div className="flex flex-wrap gap-1">
        {suggestions.map(s => (
          <button
            key={s}
            onClick={() => onAdd(s)}
            className="text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-500 text-slate-400 hover:text-slate-200 px-2 py-1 rounded-full transition-all"
          >
            + {s}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function ContentBuilder({ lifeEvents, questions, onLifeEventsChange, onQuestionsChange }: Props) {
  const [eventInput, setEventInput] = useState('');
  const [questionInput, setQuestionInput] = useState('');

  function addEvent(text: string) {
    if (!lifeEvents.includes(text)) onLifeEventsChange([...lifeEvents, text]);
  }

  function addQuestion(text: string) {
    if (!questions.includes(text)) onQuestionsChange([...questions, text]);
  }

  return (
    <div className="space-y-6">
      {/* Life Events */}
      <div>
        <p className="section-title">Life updates to share</p>
        <div className="card space-y-3">
          <TagList
            items={lifeEvents}
            onRemove={i => onLifeEventsChange(lifeEvents.filter((_, idx) => idx !== i))}
            colorClass="bg-brand-700/40 border border-brand-600 text-brand-100"
          />
          <AddInput
            placeholder="e.g. Got a promotion at work..."
            onAdd={addEvent}
            suggestions={SUGGESTED_EVENTS.filter(s => !lifeEvents.includes(s)).slice(0, 4)}
            value={eventInput}
            onChange={setEventInput}
          />
        </div>
      </div>

      {/* Questions */}
      <div>
        <p className="section-title">Questions to ask</p>
        <div className="card space-y-3">
          <TagList
            items={questions}
            onRemove={i => onQuestionsChange(questions.filter((_, idx) => idx !== i))}
            colorClass="bg-purple-900/40 border border-purple-700 text-purple-100"
          />
          <AddInput
            placeholder="e.g. How's school going?..."
            onAdd={addQuestion}
            suggestions={SUGGESTED_QUESTIONS.filter(s => !questions.includes(s)).slice(0, 4)}
            value={questionInput}
            onChange={setQuestionInput}
          />
        </div>
      </div>
    </div>
  );
}
