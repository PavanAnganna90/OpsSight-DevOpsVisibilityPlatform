/**
 * NotificationPreferences component for managing user notification settings.
 * Provides a comprehensive interface for configuring notification channels,
 * frequencies, quiet hours, and preferences by type.
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui';
import { 
  BellIcon, 
  EnvelopeIcon, 
  ChatBubbleLeftRightIcon, 
  ClockIcon, 
  BeakerIcon, 
  ArrowPathIcon,
  CheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

// API service imports
import { 
  getNotificationPreferences, 
  updateNotificationPreference,
  createNotificationPreference,
  resetNotificationPreferences,
  testNotificationChannel,
  getAvailableChannels,
  getNotificationTypes,
  getNotificationFrequencies,
  type NotificationPreference,
  type ChannelOption
} from '../../services/notificationService';

const NotificationPreferences: React.FC = () => {
  const [preferences, setPreferences] = useState<NotificationPreference[]>([]);
  const [channels, setChannels] = useState<ChannelOption[]>([]);
  const [notificationTypes, setNotificationTypes] = useState<ChannelOption[]>([]);
  const [frequencies, setFrequencies] = useState<ChannelOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('matrix');
  const [message, setMessage] = useState<string>('');
  
  const [quietHours, setQuietHours] = useState({
    enabled: false,
    start_time: '22:00',
    end_time: '08:00',
    timezone: 'UTC'
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [prefsData, channelsData, typesData, freqsData] = await Promise.all([
        getNotificationPreferences(),
        getAvailableChannels(),
        getNotificationTypes(),
        getNotificationFrequencies()
      ]);

      setPreferences(prefsData);
      setChannels(channelsData);
      setNotificationTypes(typesData);
      setFrequencies(freqsData);

      const quietHoursPref = prefsData.find((p: NotificationPreference) => p.quiet_hours_start);
      if (quietHoursPref) {
        setQuietHours({
          enabled: true,
          start_time: quietHoursPref.quiet_hours_start || '22:00',
          end_time: quietHoursPref.quiet_hours_end || '08:00',
          timezone: quietHoursPref.timezone || 'UTC'
        });
      }
      setMessage('Successfully loaded notification preferences');
    } catch (error) {
      console.error('Failed to load notification preferences:', error);
      setMessage('Failed to load notification preferences');
    } finally {
      setLoading(false);
    }
  };

  const togglePreference = async (notificationType: string, channel: string, enabled: boolean) => {
    try {
      setSaving(true);
      const existingPref = preferences.find((p: NotificationPreference) => 
        p.notification_type === notificationType && p.channel === channel
      );

      if (existingPref) {
        const updatedPref = await updateNotificationPreference(existingPref.id, { enabled });
        setPreferences(prev => prev.map((p: NotificationPreference) => p.id === existingPref.id ? updatedPref : p));
      } else if (enabled) {
        const newPref = await createNotificationPreference({
          notification_type: notificationType,
          channel,
          frequency: 'immediate',
          enabled: true,
          timezone: 'UTC'
        });
        setPreferences(prev => [...prev, newPref]);
      }

      setMessage(`${notificationType} ${channel} notifications ${enabled ? 'enabled' : 'disabled'}`);
    } catch (error) {
      setMessage('Failed to update notification preference');
      console.error('Update error:', error);
    } finally {
      setSaving(false);
    }
  };

  const testChannel = async (channel: string) => {
    try {
      setTesting(channel);
      const result = await testNotificationChannel(channel, 'Test notification from OpsSight settings');
      
      if (result.status === 'success') {
        setMessage(`Test notification sent via ${channel}`);
      } else {
        setMessage(result.error || `Failed to send test notification via ${channel}`);
      }
    } catch (error) {
      console.error('Failed to test channel:', error);
      setMessage(`Failed to test ${channel} notifications`);
    } finally {
      setTesting(null);
    }
  };

  const getChannelIcon = (channel: string) => {
    switch (channel.toLowerCase()) {
      case 'email': return <EnvelopeIcon className="h-4 w-4" />;
      case 'slack': return <ChatBubbleLeftRightIcon className="h-4 w-4" />;
      default: return <BellIcon className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-center py-8">
          <ArrowPathIcon className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading notification preferences...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <BellIcon className="h-5 w-5" />
            <h2 className="text-lg font-medium">Notification Preferences</h2>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            Configure how and when you receive notifications from OpsSight
          </p>
        </div>

        {/* Status Message */}
        {message && (
          <div className="px-6 py-3 bg-blue-50 border-b border-gray-200">
            <p className="text-sm text-blue-800">{message}</p>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="px-6 py-4">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('matrix')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'matrix'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Notification Matrix
              </button>
              <button
                onClick={() => setActiveTab('quiet-hours')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'quiet-hours'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Quiet Hours
              </button>
              <button
                onClick={() => setActiveTab('testing')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'testing'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Channel Testing
              </button>
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div className="px-6 pb-6">
          {/* Notification Matrix */}
          {activeTab === 'matrix' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {notificationTypes.map(type => (
                  <div key={type.value} className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-medium text-sm mb-3">{type.label}</h3>
                    <div className="space-y-3">
                      {channels.map(channel => {
                        const preference = preferences.find((p: NotificationPreference) => 
                          p.notification_type === type.value && p.channel === channel.value
                        );
                        const isEnabled = preference?.enabled || false;
                        
                        return (
                          <div key={channel.value} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {getChannelIcon(channel.value)}
                              <span className="text-sm">{channel.label}</span>
                            </div>
                            <button
                              onClick={() => togglePreference(type.value, channel.value, !isEnabled)}
                              disabled={saving}
                              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                isEnabled ? 'bg-indigo-600' : 'bg-gray-200'
                              } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                              <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                  isEnabled ? 'translate-x-6' : 'translate-x-1'
                                }`}
                              />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quiet Hours */}
          {activeTab === 'quiet-hours' && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <ClockIcon className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="text-sm text-blue-800">
                      Configure quiet hours to pause non-critical notifications during specific times.
                      Critical alerts will still be delivered immediately.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <label htmlFor="quiet-hours-enabled" className="text-base font-medium">
                      Enable Quiet Hours
                    </label>
                    <p className="text-sm text-gray-600">
                      Pause non-critical notifications during specified hours
                    </p>
                  </div>
                  <button
                    onClick={() => setQuietHours(prev => ({ ...prev, enabled: !prev.enabled }))}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      quietHours.enabled ? 'bg-indigo-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        quietHours.enabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {quietHours.enabled && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label htmlFor="start-time" className="block text-sm font-medium text-gray-700">
                        Start Time
                      </label>
                      <input
                        id="start-time"
                        type="time"
                        value={quietHours.start_time}
                        onChange={(e) => 
                          setQuietHours(prev => ({ ...prev, start_time: e.target.value }))
                        }
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      />
                    </div>
                    <div>
                      <label htmlFor="end-time" className="block text-sm font-medium text-gray-700">
                        End Time
                      </label>
                      <input
                        id="end-time"
                        type="time"
                        value={quietHours.end_time}
                        onChange={(e) => 
                          setQuietHours(prev => ({ ...prev, end_time: e.target.value }))
                        }
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      />
                    </div>
                    <div>
                      <label htmlFor="timezone" className="block text-sm font-medium text-gray-700">
                        Timezone
                      </label>
                      <input
                        id="timezone"
                        type="text"
                        value={quietHours.timezone}
                        onChange={(e) => 
                          setQuietHours(prev => ({ ...prev, timezone: e.target.value }))
                        }
                        placeholder="UTC"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Channel Testing */}
          {activeTab === 'testing' && (
            <div className="space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <BeakerIcon className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div>
                    <p className="text-sm text-yellow-800">
                      Test your notification channels to ensure they're configured correctly.
                      This will send a test message to verify connectivity.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {channels.map(channel => (
                  <div key={channel.value} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getChannelIcon(channel.value)}
                        <div>
                          <div className="font-medium">{channel.label}</div>
                          <div className="text-sm text-gray-600">
                            Test {channel.value} notifications
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => testChannel(channel.value)}
                        disabled={testing === channel.value}
                      >
                        {testing === channel.value ? (
                          <ArrowPathIcon className="h-4 w-4 animate-spin" />
                        ) : (
                          <BeakerIcon className="h-4 w-4" />
                        )}
                        Test
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationPreferences;
