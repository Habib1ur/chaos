'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Layers, Plus, Trash2 } from 'lucide-react';

interface CustomDeckItem {
  id: string;
  type: 'truth' | 'dare';
  text: string;
}

export default function CustomDecksPage() {
  const [items, setItems] = useState<CustomDeckItem[]>([]);
  const [type, setType] = useState<'truth' | 'dare'>('truth');
  const [text, setText] = useState('');

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('chaos_custom_deck') || '[]');
      if (Array.isArray(saved)) setItems(saved);
    } catch {
      // ignore
    }
  }, []);

  const persist = (next: CustomDeckItem[]) => {
    setItems(next);
    localStorage.setItem('chaos_custom_deck', JSON.stringify(next));
  };

  const addPrompt = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim().length < 5) return;
    persist([
      { id: `${Date.now()}`, type, text: text.trim() },
      ...items,
    ]);
    setText('');
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title font-extrabold flex items-center gap-2.5">
            <Layers className="w-7 h-7 text-chaos-blue" />
            <span>Custom Prompt Deck</span>
          </h1>
          <p className="text-sm text-chaos-text-secondary mt-1">
            Save your favorite inside-joke truths and dares for your next CHAOS room.
          </p>
        </div>
        <Link href="/room/create?game=truth-dare" className="chaos-btn-primary text-sm">
          Play Truth or Dare
        </Link>
      </div>

      <form onSubmit={addPrompt} className="chaos-card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setType('truth')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold ${
              type === 'truth'
                ? 'bg-chaos-blue text-white'
                : 'border border-chaos-border dark:border-chaos-dark-border'
            }`}
          >
            Truth
          </button>
          <button
            type="button"
            onClick={() => setType('dare')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold ${
              type === 'dare'
                ? 'bg-chaos-green text-white'
                : 'border border-chaos-border dark:border-chaos-dark-border'
            }`}
          >
            Dare
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            required
            minLength={5}
            maxLength={280}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={`Write a custom ${type}...`}
            className="flex-1 px-3.5 py-2.5 min-h-[44px] rounded-btn border border-chaos-border dark:border-chaos-dark-border bg-transparent"
          />
          <button type="submit" className="chaos-btn-primary">
            <Plus className="w-4 h-4" />
            <span>Save Prompt</span>
          </button>
        </div>
      </form>

      <div className="space-y-2.5">
        {items.length === 0 ? (
          <div className="chaos-card p-6 text-center text-sm text-chaos-text-secondary">
            Your custom deck is empty. Add your first prompt above!
          </div>
        ) : (
          items.map((item) => (
            <div key={item.id} className="chaos-card p-4 flex items-center justify-between gap-3">
              <div className="space-y-1">
                <span
                  className={`inline-block text-[11px] font-bold uppercase px-2.5 py-0.5 rounded-full ${
                    item.type === 'truth'
                      ? 'bg-chaos-blue-soft text-chaos-blue'
                      : 'bg-chaos-green-soft text-chaos-green'
                  }`}
                >
                  {item.type}
                </span>
                <p className="text-sm font-medium">{item.text}</p>
              </div>
              <button
                type="button"
                onClick={() => persist(items.filter((i) => i.id !== item.id))}
                aria-label="Delete prompt"
                className="p-2 rounded-btn text-chaos-text-muted hover:text-chaos-danger"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
