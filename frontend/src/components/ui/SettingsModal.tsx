import React, { useRef, useEffect } from 'react';
import { useSettings } from '../../contexts/SettingsContext';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export default function SettingsModal({ open, onClose }: SettingsModalProps) {
  const {
    panelVisibility,
    setPanelVisibility,
    refreshInterval,
    setRefreshInterval,
    notificationPrefs,
    setNotificationPrefs,
  } = useSettings();
  const modalRef = useRef<HTMLDivElement>(null);

  // Focus trap
  useEffect(() => {
    if (open && modalRef.current) {
      modalRef.current.focus();
    }
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      role="dialog"
      aria-modal="true"
      aria-label="Dashboard Settings"
    >
      <div
        ref={modalRef}
        tabIndex={-1}
        className="bg-white dark:bg-gray-900 rounded-xl shadow-xl p-6 w-full max-w-md outline-none"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Dashboard Settings</h2>
          <button
            onClick={onClose}
            aria-label="Close settings"
            className="text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 focus:outline-none"
          >
            ×
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <div className="font-medium mb-2">Panels</div>
            {Object.entries(panelVisibility).map(([panel, visible]) => (
              <label key={panel} className="flex items-center gap-2 text-sm cursor-pointer mb-1">
                <input
                  type="checkbox"
                  checked={visible}
                  onChange={e => setPanelVisibility({ ...panelVisibility, [panel]: e.target.checked })}
                  className="accent-blue-500"
                  aria-label={`Show ${panel} panel`}
                />
                Show {panel.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}
              </label>
            ))}
          </div>
          <div>
            <div className="font-medium mb-2">Auto-Refresh Interval</div>
            <input
              type="range"
              min={0}
              max={300}
              step={30}
              value={refreshInterval}
              onChange={e => setRefreshInterval(Number(e.target.value))}
              className="w-full"
              aria-label="Auto-refresh interval (seconds)"
            />
            <div className="text-xs text-gray-500 mt-1">
              {refreshInterval === 0 ? 'Manual refresh only' : `${refreshInterval} seconds`}
            </div>
          </div>
          <div>
            <div className="font-medium mb-2">Notifications</div>
            <label className="flex items-center gap-2 text-sm cursor-pointer mb-1">
              <input
                type="checkbox"
                checked={notificationPrefs.muteAlerts}
                onChange={e => setNotificationPrefs({ ...notificationPrefs, muteAlerts: e.target.checked })}
                className="accent-blue-500"
                aria-label="Mute alerts"
              />
              Mute alerts
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer mb-1">
              Alert threshold:
              <input
                type="number"
                min={1}
                max={10}
                value={notificationPrefs.alertThreshold}
                onChange={e => setNotificationPrefs({ ...notificationPrefs, alertThreshold: Number(e.target.value) })}
                className="w-16 border rounded px-1 py-0.5 text-right"
                aria-label="Alert threshold"
              />
            </label>
          </div>
        </div>
        <div className="flex justify-end mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded bg-blue-600 text-white font-semibold hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
} 