'use client';

import { useAuth } from '@/contexts/AuthContext';
import { withAuth } from '@/components/auth/withAuth';
import { Avatar } from '@/components/ui/Avatar';
import { FaGithub, FaBuilding, FaMapMarkerAlt, FaEnvelope } from 'react-icons/fa';

/**
 * User profile component displaying GitHub user information
 */
function ProfilePage() {
  const { state } = useAuth();

  if (!state.user) return null;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Profile Header */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="p-6">
            <div className="flex items-center">
              {/* Avatar */}
              <Avatar
                src={state.user.avatar_url}
                alt={`${state.user.full_name || state.user.github_username}'s avatar`}
                name={state.user.full_name || state.user.github_username}
                size="2xl"
                className="border-4 border-gray-200"
                priority={true} // Profile page header should load immediately
              />
              
              {/* Basic Info */}
              <div className="ml-6">
                <h1 className="text-2xl font-bold text-gray-900">{state.user.full_name || state.user.github_username}</h1>
                <p className="text-gray-600">@{state.user.github_username}</p>
                {state.user.bio && (
                  <p className="mt-2 text-gray-600">{state.user.bio}</p>
                )}
              </div>
            </div>

            {/* Contact & Location */}
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {state.user.email && (
                <div className="flex items-center text-gray-600">
                  <FaEnvelope className="h-5 w-5" />
                  <span className="ml-2">{state.user.email}</span>
                </div>
              )}
              {state.user.location && (
                <div className="flex items-center text-gray-600">
                  <FaMapMarkerAlt className="h-5 w-5" />
                  <span className="ml-2">{state.user.location}</span>
                </div>
              )}
              {state.user.company && (
                <div className="flex items-center text-gray-600">
                  <FaBuilding className="h-5 w-5" />
                  <span className="ml-2">{state.user.company}</span>
                </div>
              )}
              <a
                href={state.user.blog || `https://github.com/${state.user.github_username}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
              >
                <FaGithub className="h-5 w-5" />
                <span className="ml-2">View GitHub Profile</span>
              </a>
            </div>
          </div>
        </div>

        {/* Activity Section */}
        <div className="mt-8 bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Recent Activity
          </h2>
          <p className="text-gray-600">
            Activity tracking coming soon...
          </p>
        </div>

        {/* Settings Section */}
        <div className="mt-8 bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Profile Settings
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Email Notifications
              </label>
              <div className="mt-2">
                <label className="inline-flex items-center">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                  />
                  <span className="ml-2">Receive activity updates</span>
                </label>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Display Preferences
              </label>
              <select
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
              >
                <option>System default</option>
                <option>Light mode</option>
                <option>Dark mode</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Wrap the profile page with authentication protection
export default withAuth(ProfilePage); 