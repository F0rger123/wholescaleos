import React, { useState } from 'react';
import { processPrompt, GeminiResponse } from '../lib/gemini';

export function AITest() {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GeminiResponse | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setLoading(true);
    setResult(null);

    try {
      // Pass a helpful context object to test Gemini's awareness
      const response = await processPrompt(prompt, { 
        page: '/ai-test', 
        userRole: 'admin',
        currentTime: new Date().toISOString()
      });
      setResult(response);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-3xl mx-auto h-[calc(100vh-73px)] overflow-y-auto w-full text-slate-200">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Gemini API Tester</h1>
        <p className="text-slate-400">Send prompts directly to your new Gemini intent parser to verify the JSON output structure.</p>
      </div>
      
      <form onSubmit={handleSubmit} className="mb-8 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-2">
            Enter your prompt:
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="w-full h-32 p-4 bg-slate-800 border border-slate-700 rounded-xl focus:ring-1 focus:ring-brand-500 focus:border-brand-500 outline-none text-slate-200 resize-none transition-shadow placeholder:text-slate-600 font-mono text-sm"
            placeholder="e.g., 'Delete the lead for 123 Main St' or 'What is the standard script for wholesale referrals?'"
          />
        </div>

        {/* Quick Test Prompts */}
        <div>
          <p className="text-xs font-medium text-slate-500 mb-2">Try a Lead Lookup example:</p>
          <div className="flex flex-wrap gap-2">
            {[
              "Show me John Smith",
              "Find lead at 123 Main St",
              "What leads do I have?",
              "What does my schedule look like today?"
            ].map(example => (
              <button
                key={example}
                type="button"
                onClick={() => setPrompt(example)}
                className="px-3 py-1.5 bg-slate-800/50 hover:bg-brand-500/20 text-slate-300 hover:text-brand-300 text-xs rounded-full border border-slate-700 hover:border-brand-500/50 transition-colors whitespace-nowrap"
              >
                {example}
              </button>
            ))}
          </div>
        </div>
        
        <button
          type="submit"
          disabled={loading || !prompt.trim()}
          className="px-6 py-2.5 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors flex items-center justify-center min-w-[140px]"
        >
          {loading ? (
            <div className="flex gap-2 items-center">
              <div className="w-1.5 h-1.5 bg-white/70 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-1.5 h-1.5 bg-white/70 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-1.5 h-1.5 bg-white/70 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          ) : (
            'Test Integration'
          )}
        </button>
      </form>

      {result && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="p-5 bg-slate-800/80 border border-slate-700 rounded-2xl flex flex-col gap-1">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Extracted Intent</h3>
            <p className="text-lg font-mono text-emerald-400">
              {result.intent}
            </p>
          </div>
          
          <div className="p-5 bg-slate-800/80 border border-slate-700 rounded-2xl flex flex-col gap-3">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Gemini Response</h3>
            <div className="prose prose-invert prose-brand max-w-none">
              <p className="whitespace-pre-wrap text-slate-300 leading-relaxed text-sm">
                {result.response}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
