/**
 * Git Activity Detail View Component
 * 
 * Displays detailed information about Git activity for a specific time period,
 * including commits, pull requests, contributors, and code change statistics.
 */

import React, { useState, useMemo, useCallback } from 'react';
import { format, parseISO } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import {
  XMarkIcon,
  CalendarDaysIcon,
  CodeBracketIcon,
  UserGroupIcon,
  DocumentTextIcon,
  ArrowTopRightOnSquareIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  PlusIcon,
  MinusIcon,
  EyeIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline';

import {
  ActivityHeatmapData,
  GitCommit,
  GitPullRequest,
  GitContributor,
  DetailedActivityView
} from '../../types/git-activity';

export interface GitActivityDetailViewProps {
  isOpen: boolean;
  onClose: () => void;
  date: string;
  activityData: ActivityHeatmapData;
  detailedData?: DetailedActivityView;
  loading?: boolean;
  error?: string | null;
  onLoadDetails?: (date: string) => Promise<void>;
  className?: string;
}

/**
 * Commit Item Component
 */
const CommitItem: React.FC<{
  commit: GitCommit;
  isExpanded: boolean;
  onToggle: () => void;
}> = ({ commit, isExpanded, onToggle }) => {
  const shortSha = commit.sha.substring(0, 7);
  const commitDate = format(parseISO(commit.committed_date), 'HH:mm');

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-3 mb-2">
            <code className="px-2 py-1 text-xs font-mono bg-gray-100 dark:bg-gray-700 rounded">
              {shortSha}
            </code>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {commitDate}
            </span>
            {commit.verified && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                Verified
              </span>
            )}
          </div>
          
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2 line-clamp-2">
            {commit.message.split('\n')[0]}
          </h4>
          
          <div className="flex items-center space-x-4 text-xs text-gray-600 dark:text-gray-400">
            <span className="flex items-center space-x-1">
              <span className="text-green-600 dark:text-green-400">+{commit.additions}</span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="text-red-600 dark:text-red-400">-{commit.deletions}</span>
            </span>
            <span>{commit.changed_files} files</span>
            <span>by {commit.author_name}</span>
          </div>
        </div>
        
        <div className="flex items-center space-x-2 ml-4">
          <a
            href={commit.url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <ArrowTopRightOnSquareIcon className="w-4 h-4" />
          </a>
          <button
            onClick={onToggle}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            {isExpanded ? (
              <ChevronDownIcon className="w-4 h-4" />
            ) : (
              <ChevronRightIcon className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
              {commit.message.split('\n').slice(1).join('\n').trim() && (
                <div className="mb-3">
                  <h5 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Full Message:
                  </h5>
                  <pre className="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                    {commit.message}
                  </pre>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">Author:</span>
                  <div className="text-gray-600 dark:text-gray-400">
                    {commit.author_name} ({commit.author_login})
                  </div>
                  <div className="text-gray-500 dark:text-gray-500">
                    {commit.author_email}
                  </div>
                </div>
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">Authored:</span>
                  <div className="text-gray-600 dark:text-gray-400">
                    {format(parseISO(commit.authored_date), 'MMM d, yyyy HH:mm')}
                  </div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">Committed:</span>
                  <div className="text-gray-600 dark:text-gray-400">
                    {format(parseISO(commit.committed_date), 'MMM d, yyyy HH:mm')}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/**
 * Pull Request Item Component
 */
const PullRequestItem: React.FC<{
  pullRequest: GitPullRequest;
  isExpanded: boolean;
  onToggle: () => void;
}> = ({ pullRequest, isExpanded, onToggle }) => {
  const getStateColor = (state: string) => {
    switch (state) {
      case 'open':
        return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200';
      case 'merged':
        return 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200';
      case 'closed':
        return 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200';
      default:
        return 'bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200';
    }
  };

  const createdDate = format(parseISO(pullRequest.created_at), 'HH:mm');

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-3 mb-2">
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
              #{pullRequest.number}
            </span>
            <span className={clsx(
              'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
              getStateColor(pullRequest.state)
            )}>
              {pullRequest.state}
            </span>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {createdDate}
            </span>
          </div>
          
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2 line-clamp-2">
            {pullRequest.title}
          </h4>
          
          <div className="flex items-center space-x-4 text-xs text-gray-600 dark:text-gray-400">
            <span className="flex items-center space-x-1">
              <span className="text-green-600 dark:text-green-400">+{pullRequest.additions}</span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="text-red-600 dark:text-red-400">-{pullRequest.deletions}</span>
            </span>
            <span>{pullRequest.changed_files} files</span>
            <span>{pullRequest.commits_count} commits</span>
            <span>by {pullRequest.author_login}</span>
          </div>
        </div>
        
        <div className="flex items-center space-x-2 ml-4">
          <a
            href={pullRequest.url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <ArrowTopRightOnSquareIcon className="w-4 h-4" />
          </a>
          <button
            onClick={onToggle}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            {isExpanded ? (
              <ChevronDownIcon className="w-4 h-4" />
            ) : (
              <ChevronRightIcon className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">Branches:</span>
                  <div className="text-gray-600 dark:text-gray-400">
                    {pullRequest.head_branch} → {pullRequest.base_branch}
                  </div>
                </div>
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">Reviews:</span>
                  <div className="text-gray-600 dark:text-gray-400 flex items-center space-x-2">
                    <span>{pullRequest.reviews_count} reviews</span>
                    <span>•</span>
                    <span>{pullRequest.review_comments} comments</span>
                  </div>
                </div>
              </div>
              
              <div className="mt-3 grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">Created:</span>
                  <div className="text-gray-600 dark:text-gray-400">
                    {format(parseISO(pullRequest.created_at), 'MMM d, yyyy HH:mm')}
                  </div>
                </div>
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">Updated:</span>
                  <div className="text-gray-600 dark:text-gray-400">
                    {format(parseISO(pullRequest.updated_at), 'MMM d, yyyy HH:mm')}
                  </div>
                </div>
              </div>
              
              {pullRequest.merged_at && (
                <div className="mt-2 text-xs">
                  <span className="font-medium text-gray-700 dark:text-gray-300">Merged:</span>
                  <span className="text-gray-600 dark:text-gray-400 ml-1">
                    {format(parseISO(pullRequest.merged_at), 'MMM d, yyyy HH:mm')}
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/**
 * Contributors Summary Component
 */
const ContributorsSummary: React.FC<{
  contributors: GitContributor[];
}> = ({ contributors }) => {
  if (contributors.length === 0) {
    return (
      <div className="text-center py-4 text-gray-500 dark:text-gray-400">
        No contributors for this day
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {contributors.map(contributor => (
        <div
          key={contributor.login}
          className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg"
        >
          <img
            src={contributor.avatar_url}
            alt={contributor.name || contributor.login}
            className="w-8 h-8 rounded-full"
          />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {contributor.name || contributor.login}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              {contributor.contributions} contributions
            </div>
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400">
            <div className="flex items-center space-x-2">
              <span className="text-green-600 dark:text-green-400">
                +{contributor.additions.toLocaleString()}
              </span>
              <span className="text-red-600 dark:text-red-400">
                -{contributor.deletions.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

/**
 * Main Git Activity Detail View Component
 */
export const GitActivityDetailView: React.FC<GitActivityDetailViewProps> = ({
  isOpen,
  onClose,
  date,
  activityData,
  detailedData,
  loading = false,
  error = null,
  onLoadDetails,
  className = ''
}) => {
  const [activeTab, setActiveTab] = useState<'commits' | 'prs' | 'contributors'>('commits');
  const [expandedCommits, setExpandedCommits] = useState<Set<string>>(new Set());
  const [expandedPRs, setExpandedPRs] = useState<Set<number>>(new Set());

  const formattedDate = useMemo(() => {
    return format(parseISO(date), 'EEEE, MMMM d, yyyy');
  }, [date]);

  const handleLoadDetails = useCallback(async () => {
    if (onLoadDetails) {
      await onLoadDetails(date);
    }
  }, [onLoadDetails, date]);

  const toggleCommitExpansion = useCallback((sha: string) => {
    setExpandedCommits(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sha)) {
        newSet.delete(sha);
      } else {
        newSet.add(sha);
      }
      return newSet;
    });
  }, []);

  const togglePRExpansion = useCallback((number: number) => {
    setExpandedPRs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(number)) {
        newSet.delete(number);
      } else {
        newSet.add(number);
      }
      return newSet;
    });
  }, []);

  const tabs = [
    {
      id: 'commits' as const,
      label: 'Commits',
      icon: CodeBracketIcon,
      count: detailedData?.commits.length || activityData.commit_count
    },
    {
      id: 'prs' as const,
      label: 'Pull Requests',
      icon: DocumentTextIcon,
      count: detailedData?.pullRequests.length || activityData.pr_count
    },
    {
      id: 'contributors' as const,
      label: 'Contributors',
      icon: UserGroupIcon,
      count: detailedData?.contributors.length || activityData.contributor_count
    }
  ];

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 overflow-hidden"
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black bg-opacity-50"
          onClick={onClose}
        />

        {/* Panel */}
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className={clsx(
            'absolute right-0 top-0 h-full w-full max-w-2xl bg-white dark:bg-gray-900 shadow-xl',
            'flex flex-col',
            className
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Git Activity Details
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {formattedDate}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Summary Stats */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {activityData.activity_count}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  Total Activity
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {activityData.commit_count}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  Commits
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {activityData.pr_count}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  Pull Requests
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  {activityData.contributor_count}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  Contributors
                </div>
              </div>
            </div>

            {activityData.lines_added > 0 || activityData.lines_deleted > 0 ? (
              <div className="mt-4 flex items-center justify-center space-x-6 text-sm">
                <div className="flex items-center space-x-1">
                  <PlusIcon className="w-4 h-4 text-green-600 dark:text-green-400" />
                  <span className="text-green-600 dark:text-green-400">
                    {activityData.lines_added.toLocaleString()} lines added
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  <MinusIcon className="w-4 h-4 text-red-600 dark:text-red-400" />
                  <span className="text-red-600 dark:text-red-400">
                    {activityData.lines_deleted.toLocaleString()} lines deleted
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  <DocumentTextIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  <span className="text-gray-600 dark:text-gray-400">
                    {activityData.files_changed} files changed
                  </span>
                </div>
              </div>
            ) : null}
          </div>

          {/* Load Details Button */}
          {!detailedData && !loading && !error && (
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <button
                onClick={handleLoadDetails}
                className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <EyeIcon className="w-4 h-4" />
                <span>Load Detailed Information</span>
              </button>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p className="text-gray-600 dark:text-gray-400">Loading detailed information...</p>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="p-6">
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <p className="text-red-800 dark:text-red-200">{error}</p>
                <button
                  onClick={handleLoadDetails}
                  className="mt-2 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                >
                  Retry
                </button>
              </div>
            </div>
          )}

          {/* Detailed Content */}
          {detailedData && (
            <>
              {/* Tabs */}
              <div className="border-b border-gray-200 dark:border-gray-700">
                <nav className="flex space-x-8 px-6">
                  {tabs.map(tab => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={clsx(
                          'flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors',
                          activeTab === tab.id
                            ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                            : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                        )}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{tab.label}</span>
                        <span className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-1 rounded-full text-xs">
                          {tab.count}
                        </span>
                      </button>
                    );
                  })}
                </nav>
              </div>

              {/* Tab Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {activeTab === 'commits' && (
                  <div className="space-y-4">
                    {detailedData.commits.length > 0 ? (
                      detailedData.commits.map(commit => (
                        <CommitItem
                          key={commit.sha}
                          commit={commit}
                          isExpanded={expandedCommits.has(commit.sha)}
                          onToggle={() => toggleCommitExpansion(commit.sha)}
                        />
                      ))
                    ) : (
                      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        No commits found for this day
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'prs' && (
                  <div className="space-y-4">
                    {detailedData.pullRequests.length > 0 ? (
                      detailedData.pullRequests.map(pr => (
                        <PullRequestItem
                          key={pr.number}
                          pullRequest={pr}
                          isExpanded={expandedPRs.has(pr.number)}
                          onToggle={() => togglePRExpansion(pr.number)}
                        />
                      ))
                    ) : (
                      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        No pull requests found for this day
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'contributors' && (
                  <ContributorsSummary contributors={detailedData.contributors} />
                )}
              </div>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default GitActivityDetailView; 