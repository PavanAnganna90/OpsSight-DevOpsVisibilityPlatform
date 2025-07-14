'use client';

import { useState, useEffect } from 'react';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { Modal } from '@/components/common/Modal';
import { api } from '@/utils/api';

interface Repository {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  private: boolean;
  html_url: string;
  updated_at: string;
}

interface GitHubRepoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (repos: string[]) => void;
  selectedRepos: string[];
}

/**
 * Modal component for selecting GitHub repositories
 */
export function GitHubRepoModal({ isOpen, onClose, onSelect, selectedRepos }: GitHubRepoModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set(selectedRepos));

  // Load repositories when modal opens
  useEffect(() => {
    if (isOpen) {
      loadRepositories();
    }
  }, [isOpen]);

  // Load repositories from GitHub
  const loadRepositories = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.get<Repository[]>('/github/repositories');
      setRepositories(response.data);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load repositories');
    } finally {
      setLoading(false);
    }
  };

  // Filter repositories based on search query
  const filteredRepositories = repositories.filter(repo =>
    repo.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (repo.description?.toLowerCase() || '').includes(searchQuery.toLowerCase())
  );

  // Toggle repository selection
  const toggleRepository = (fullName: string) => {
    const newSelected = new Set(selected);
    if (newSelected.has(fullName)) {
      newSelected.delete(fullName);
    } else {
      newSelected.add(fullName);
    }
    setSelected(newSelected);
  };

  // Handle save
  const handleSave = () => {
    onSelect(Array.from(selected));
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Select GitHub Repositories" maxWidth="xl">
      {/* Search input */}
      <div className="mb-4">
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
          </div>
          <input
            type="text"
            className="block w-full rounded-md border-0 py-1.5 pl-10 pr-3 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
            placeholder="Search repositories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">{error}</div>
            </div>
          </div>
        </div>
      )}

      {/* Repository list */}
      <div className="max-h-96 overflow-y-auto">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="mt-2 h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredRepositories.map((repo) => (
              <div
                key={repo.id}
                className="flex items-center py-4 hover:bg-gray-50 cursor-pointer"
                onClick={() => toggleRepository(repo.full_name)}
              >
                <input
                  type="checkbox"
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  checked={selected.has(repo.full_name)}
                  onChange={() => toggleRepository(repo.full_name)}
                />
                <div className="ml-3 flex-1">
                  <p className="text-sm font-medium text-gray-900">{repo.full_name}</p>
                  {repo.description && (
                    <p className="text-sm text-gray-500 line-clamp-2">{repo.description}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    Last updated: {new Date(repo.updated_at).toLocaleDateString()}
                  </p>
                </div>
                {repo.private && (
                  <span className="ml-2 inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">
                    Private
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="mt-6 flex items-center justify-end space-x-3">
        <button
          type="button"
          className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
          onClick={onClose}
        >
          Cancel
        </button>
        <button
          type="button"
          className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          onClick={handleSave}
        >
          Save Changes
        </button>
      </div>
    </Modal>
  );
} 