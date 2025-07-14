import httpx
import asyncio
from typing import Optional, Dict, Any, Union, List
from fastapi import HTTPException, status
from datetime import datetime, timezone, timedelta
from collections import defaultdict
from settings import settings
from logger import logger


class GitActivityService:
    def __init__(self):
        self.github_api_url = "https://api.github.com"
        self.rate_limit_delay = 1.0

    async def _make_github_request(
        self, access_token: str, endpoint: str, params: Optional[Dict[str, Any]] = None
    ) -> Union[Dict[str, Any], List[Dict[str, Any]]]:
        """Make authenticated request to GitHub API."""
        headers = {
            "Authorization": f"token {access_token}",
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": f"{settings.PROJECT_NAME}/{settings.VERSION}",
        }

        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    f"{self.github_api_url}/{endpoint}",
                    headers=headers,
                    params=params or {},
                    timeout=30.0,
                )

                if response.status_code == 401:
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="GitHub access token invalid or expired",
                    )
                elif response.status_code == 403:
                    if "rate limit" in response.text.lower():
                        await asyncio.sleep(self.rate_limit_delay)
                        self.rate_limit_delay *= 2
                        raise HTTPException(
                            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                            detail="GitHub API rate limit exceeded",
                        )
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Insufficient GitHub permissions",
                    )
                elif response.status_code >= 400:
                    logger.error(
                        f"GitHub API error: {response.status_code} - {response.text}"
                    )
                    raise HTTPException(
                        status_code=status.HTTP_502_BAD_GATEWAY,
                        detail=f"GitHub API error: {response.status_code}",
                    )

                self.rate_limit_delay = 1.0
                return response.json()

            except httpx.TimeoutException:
                logger.error("GitHub API request timeout")
                raise HTTPException(
                    status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                    detail="GitHub API request timeout",
                )
            except httpx.NetworkError as e:
                logger.error(f"GitHub API network error: {e}")
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail="GitHub API network error",
                )

    async def get_repository_commits(
        self,
        access_token: str,
        owner: str,
        repo: str,
        since: Optional[datetime] = None,
        until: Optional[datetime] = None,
        per_page: int = 100,
        max_pages: int = 10,
    ) -> List[GitCommit]:
        """Fetch commits from a repository."""
        commits = []

        for page in range(1, max_pages + 1):
            params = {"per_page": per_page, "page": page}

            if since:
                params["since"] = since.isoformat()
            if until:
                params["until"] = until.isoformat()

            endpoint = f"repos/{owner}/{repo}/commits"
            response = await self._make_github_request(access_token, endpoint, params)

            if not response or len(response) == 0:
                break

            # Process commits
            for commit_data in response:
                try:
                    commit_info = commit_data["commit"]
                    author_info = commit_data.get("author", {}) or {}

                    commit = GitCommit(
                        sha=commit_data["sha"],
                        message=commit_info["message"],
                        author_login=author_info.get("login"),
                        author_name=commit_info["author"]["name"],
                        author_email=commit_info["author"]["email"],
                        authored_date=datetime.fromisoformat(
                            commit_info["author"]["date"].replace("Z", "+00:00")
                        ),
                        committed_date=datetime.fromisoformat(
                            commit_info["committer"]["date"].replace("Z", "+00:00")
                        ),
                        additions=0,  # Basic commit data doesn't include stats
                        deletions=0,  # Would need individual commit API call
                        changed_files=0,  # Would need individual commit API call
                        url=commit_data["html_url"],
                        verified=commit_info.get("verification", {}).get(
                            "verified", False
                        ),
                    )
                    commits.append(commit)

                except Exception as e:
                    logger.warning(
                        f"Failed to process commit {commit_data.get('sha', 'unknown')}: {e}"
                    )
                    continue

            if len(response) < per_page:
                break

        return commits

    async def get_repository_pull_requests(
        self,
        access_token: str,
        owner: str,
        repo: str,
        state: str = "all",
        since: Optional[datetime] = None,
        per_page: int = 100,
        max_pages: int = 10,
    ) -> List[GitPullRequest]:
        """Fetch pull requests from a repository."""
        pull_requests = []

        for page in range(1, max_pages + 1):
            params = {
                "state": state,
                "per_page": per_page,
                "page": page,
                "sort": "updated",
                "direction": "desc",
            }

            endpoint = f"repos/{owner}/{repo}/pulls"
            response = await self._make_github_request(access_token, endpoint, params)

            if not response or len(response) == 0:
                break

            for pr_data in response:
                try:
                    updated_at = datetime.fromisoformat(
                        pr_data["updated_at"].replace("Z", "+00:00")
                    )

                    if since and updated_at < since:
                        break

                    pr = GitPullRequest(
                        number=pr_data["number"],
                        title=pr_data["title"],
                        state=pr_data["state"],
                        author_login=pr_data["user"]["login"],
                        created_at=datetime.fromisoformat(
                            pr_data["created_at"].replace("Z", "+00:00")
                        ),
                        updated_at=updated_at,
                        merged_at=(
                            datetime.fromisoformat(
                                pr_data["merged_at"].replace("Z", "+00:00")
                            )
                            if pr_data.get("merged_at")
                            else None
                        ),
                        closed_at=(
                            datetime.fromisoformat(
                                pr_data["closed_at"].replace("Z", "+00:00")
                            )
                            if pr_data.get("closed_at")
                            else None
                        ),
                        base_branch=pr_data["base"]["ref"],
                        head_branch=pr_data["head"]["ref"],
                        commits_count=pr_data.get("commits", 0),
                        additions=pr_data.get("additions", 0),
                        deletions=pr_data.get("deletions", 0),
                        changed_files=pr_data.get("changed_files", 0),
                        url=pr_data["html_url"],
                        review_comments=pr_data.get("review_comments", 0),
                    )
                    pull_requests.append(pr)

                except Exception as e:
                    logger.warning(
                        f"Failed to process PR {pr_data.get('number', 'unknown')}: {e}"
                    )
                    continue

            if len(response) < per_page:
                break

        return pull_requests

    async def get_repository_contributors(
        self, access_token: str, owner: str, repo: str, per_page: int = 100
    ) -> List[GitContributor]:
        """Fetch repository contributors."""
        contributors = []

        params = {"per_page": per_page}
        endpoint = f"repos/{owner}/{repo}/contributors"
        response = await self._make_github_request(access_token, endpoint, params)

        for contributor_data in response:
            try:
                contributor = GitContributor(
                    login=contributor_data["login"],
                    name=None,
                    email=None,
                    avatar_url=contributor_data.get("avatar_url"),
                    contributions=contributor_data["contributions"],
                    commits_count=contributor_data["contributions"],
                    additions=0,
                    deletions=0,
                    first_contribution=None,
                    last_contribution=None,
                )
                contributors.append(contributor)

            except Exception as e:
                logger.warning(
                    f"Failed to process contributor {contributor_data.get('login', 'unknown')}: {e}"
                )
                continue

        return contributors

    def generate_activity_heatmap(
        self,
        commits: List[GitCommit],
        pull_requests: List[GitPullRequest],
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> List[ActivityHeatmapData]:
        """Generate heatmap data from commits and pull requests."""
        if not start_date:
            start_date = datetime.now(timezone.utc) - timedelta(days=365)
        if not end_date:
            end_date = datetime.now(timezone.utc)

        # Aggregate data by date
        daily_activity = defaultdict(
            lambda: {
                "commits": [],
                "prs": [],
                "contributors": set(),
                "activity_types": set(),
            }
        )

        # Process commits
        for commit in commits:
            if start_date <= commit.committed_date <= end_date:
                date_key = commit.committed_date.date().isoformat()
                daily_activity[date_key]["commits"].append(commit)
                daily_activity[date_key]["contributors"].add(
                    commit.author_login or commit.author_email
                )
                daily_activity[date_key]["activity_types"].add(
                    ActivityType.COMMIT.value
                )

        # Process pull requests
        for pr in pull_requests:
            if start_date <= pr.created_at <= end_date:
                date_key = pr.created_at.date().isoformat()
                daily_activity[date_key]["prs"].append(pr)
                daily_activity[date_key]["contributors"].add(pr.author_login)
                daily_activity[date_key]["activity_types"].add(
                    ActivityType.PULL_REQUEST.value
                )

        # Generate heatmap data
        heatmap_data = []
        current_date = start_date.date()
        end_date_only = end_date.date()

        while current_date <= end_date_only:
            date_key = current_date.isoformat()
            day_data = daily_activity.get(
                date_key,
                {
                    "commits": [],
                    "prs": [],
                    "contributors": set(),
                    "activity_types": set(),
                },
            )

            commits_today = day_data["commits"]
            prs_today = day_data["prs"]

            heatmap_point = ActivityHeatmapData(
                date=date_key,
                activity_count=len(commits_today) + len(prs_today),
                commit_count=len(commits_today),
                pr_count=len(prs_today),
                contributor_count=len(day_data["contributors"]),
                lines_added=sum(c.additions for c in commits_today),
                lines_deleted=sum(c.deletions for c in commits_today),
                files_changed=sum(c.changed_files for c in commits_today),
                activity_types=list(day_data["activity_types"]),
            )

            heatmap_data.append(heatmap_point)
            current_date += timedelta(days=1)

        return heatmap_data

    async def get_comprehensive_repository_activity(
        self, access_token: str, owner: str, repo: str, days_back: int = 365
    ) -> GitActivityMetrics:
        """Get comprehensive repository activity metrics."""
        end_date = datetime.now(timezone.utc)
        start_date = end_date - timedelta(days=days_back)

        logger.info(
            f"Fetching comprehensive activity for {owner}/{repo} ({days_back} days)"
        )

        # Fetch data concurrently
        tasks = [
            self.get_repository_commits(
                access_token, owner, repo, since=start_date, until=end_date
            ),
            self.get_repository_pull_requests(
                access_token, owner, repo, since=start_date
            ),
            self.get_repository_contributors(access_token, owner, repo),
        ]

        commits, pull_requests, contributors = await asyncio.gather(*tasks)

        logger.info(
            f"Fetched {len(commits)} commits, {len(pull_requests)} PRs, {len(contributors)} contributors"
        )

        # Generate heatmap
        heatmap_data = self.generate_activity_heatmap(
            commits, pull_requests, start_date, end_date
        )

        # Calculate basic metrics
        total_commits = len(commits)
        total_prs = len(pull_requests)
        total_contributors = len(contributors)

        lines_of_code = sum(c.additions for c in commits)
        code_churn = sum(c.additions + c.deletions for c in commits)

        days_with_activity = len([d for d in heatmap_data if d.activity_count > 0])
        avg_commits_per_day = total_commits / max(days_with_activity, 1)

        merged_prs = [pr for pr in pull_requests if pr.merged_at]
        avg_pr_size = sum(pr.additions + pr.deletions for pr in merged_prs) / max(
            len(merged_prs), 1
        )

        top_contributors = sorted(
            contributors, key=lambda c: c.contributions, reverse=True
        )[:10]
        active_branches = len(set(pr.head_branch for pr in pull_requests)) + 1

        metrics = GitActivityMetrics(
            total_commits=total_commits,
            total_prs=total_prs,
            total_contributors=total_contributors,
            active_branches=active_branches,
            lines_of_code=lines_of_code,
            code_churn=code_churn,
            avg_commits_per_day=avg_commits_per_day,
            avg_pr_size=avg_pr_size,
            top_contributors=top_contributors,
            activity_heatmap=heatmap_data,
            velocity_trend=[],  # Simplified for now
            language_distribution={"Unknown": len(commits)},
        )

        logger.info(f"Generated activity metrics for {owner}/{repo}")
        return metrics


# Create service instance
git_activity_service = GitActivityService()
