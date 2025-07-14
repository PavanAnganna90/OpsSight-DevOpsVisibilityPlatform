'use client';

import React, { useState } from 'react';
import AnimatedIllustration from '../ui/AnimatedIllustration';
import EmptyState from '../ui/EmptyState';
import { logAuditEvent } from '../../services/auditLogApi';
import { trackEvent } from '../../utils/analytics';
import { useSettings } from '../../contexts/SettingsContext';

interface Suggestion {
  id: number;
  message: string;
  icon: string;
  priority: 'high' | 'normal';
}

const sampleSuggestions: Suggestion[] = [
  { id: 1, message: 'Unused node group detected. Consider scaling down.', icon: 'lightbulb', priority: 'high' },
  { id: 2, message: 'Team access review recommended.', icon: 'team', priority: 'normal' },
];

export default function ActionInsightsPanel() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>(sampleSuggestions);
  const [showHighPriority, setShowHighPriority] = useState(false);
  const [actionStatus, setActionStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const { panelVisibility } = useSettings();

  if (!panelVisibility.actionInsights) return null;

  const handleRefresh = () => {
    setSuggestions(sampleSuggestions);
  };

  const handleAction = async (type: 'deploy' | 'rollback') => {
    setActionStatus('loading');
    try {
      await logAuditEvent(type, 'admin', { panel: 'ActionInsights' });
      trackEvent(type, { panel: 'ActionInsights' });
      setActionStatus('success');
      setTimeout(() => setActionStatus('idle'), 1500);
    } catch {
      setActionStatus('error');
      setTimeout(() => setActionStatus('idle'), 1500);
    }
  };

  const filteredSuggestions = showHighPriority
    ? suggestions.filter(s => s.priority === 'high')
    : suggestions;

  return (
    <section className="bg-white/80 dark:bg-gray-900/80 rounded-xl shadow-lg p-6 flex flex-col gap-6 relative overflow-hidden min-h-[320px]">
      {/* Panel Controls */}
      <div className="flex items-center justify-between mb-2">
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={showHighPriority}
            onChange={e => setShowHighPriority(e.target.checked)}
            className="accent-blue-500"
            aria-label="Show only high-priority suggestions"
          />
          Show only high-priority suggestions
        </label>
        <button
          onClick={handleRefresh}
          className="px-3 py-1 rounded bg-blue-500 text-white font-medium hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
        >
          Refresh
        </button>
      </div>
      {/* Suggestions or Empty State */}
      {filteredSuggestions.length === 0 ? (
        <EmptyState
          illustration="mascot"
          title="No Suggestions"
          description="No insights at the moment. Enjoy your coffee ☕"
          action={{ label: 'Refresh', onClick: handleRefresh }}
        />
      ) : (
        <>
          {/* Deploy/Rollback Actions */}
          <div className="relative flex items-center gap-4 group hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition rounded-lg p-4">
            <AnimatedIllustration name="rocket" className="absolute right-2 bottom-2 w-20 h-20 opacity-15 pointer-events-none group-hover:scale-105 transition-transform duration-300" alt="Deploy" />
            <div className="z-10 flex flex-col gap-2 w-full">
              <button onClick={() => handleAction('deploy')} className="px-4 py-2 rounded bg-blue-600 text-white font-semibold shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 transition">Deploy</button>
              <button onClick={() => handleAction('rollback')} className="px-4 py-2 rounded bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100 font-semibold shadow hover:bg-gray-300 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-400 transition">Rollback</button>
            </div>
          </div>
          {/* Logs/Team Actions */}
          <div className="relative flex items-center gap-4 group hover:bg-teal-50 dark:hover:bg-teal-900/20 transition rounded-lg p-4">
            <AnimatedIllustration name="team" className="absolute right-2 bottom-2 w-16 h-16 opacity-15 pointer-events-none group-hover:scale-105 transition-transform duration-300" alt="Team" />
            <div className="z-10 flex flex-col gap-2 w-full">
              <button className="px-4 py-2 rounded bg-teal-600 text-white font-semibold shadow hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-400 transition">View Logs</button>
              <button className="px-4 py-2 rounded bg-purple-600 text-white font-semibold shadow hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-400 transition">Manage Team</button>
            </div>
          </div>
          {/* AI Suggestions */}
          <div className="relative flex flex-col gap-2 group hover:bg-yellow-50 dark:hover:bg-yellow-900/20 transition rounded-lg p-4">
            <AnimatedIllustration name="lightbulb" className="absolute right-2 bottom-2 w-14 h-14 opacity-15 pointer-events-none group-hover:scale-105 transition-transform duration-300" alt="AI Suggestions" />
            <div className="z-10">
              <div className="font-medium mb-1">AI Suggestions</div>
              <ul className="space-y-1">
                {filteredSuggestions.map(suggestion => (
                  <li key={suggestion.id} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                    <AnimatedIllustration name={suggestion.icon} className="w-5 h-5 opacity-80" alt="Suggestion Icon" animate={false} />
                    <span>{suggestion.message}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </>
      )}
    </section>
  );
} 