import React, { useMemo } from 'react';
import { Commit } from '../types';
import { GitCommit, GitBranch, Clock } from 'lucide-react';

interface RepoListProps {
	commits: Commit[];
}

export const RepoList: React.FC<RepoListProps> = ({ commits }) => {
	const groupedCommits = useMemo(() => {
		const groups: Record<string, Commit[]> = {};
		commits.forEach(commit => {
			if (!groups[commit.repoName]) {
				groups[commit.repoName] = [];
			}
			groups[commit.repoName].push(commit);
		});
		return groups;
	}, [commits]);

	const repoNames = Object.keys(groupedCommits).sort();

	if (commits.length === 0) {
		return (
			<div className="flex-1 flex items-center justify-center text-secondary flex-col gap-4">
				<GitCommit size={48} opacity={0.2} />
				<p>No commits found in the selected range.</p>
			</div>
		);
	}

	return (
		<div className="flex-1 overflow-auto p-4 flex flex-col gap-6">
			{repoNames.map(repoName => (
				<div key={repoName} className="bg-secondary rounded-lg border border-color overflow-hidden" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
					<div className="bg-tertiary p-3 border-b border-color flex justify-between items-center" style={{ backgroundColor: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-color)' }}>
						<h3 className="font-bold text-lg m-0 flex items-center gap-2">
							<span className="text-accent">📦</span> {repoName}
						</h3>
						<span className="text-xs text-secondary bg-primary px-2 py-1 rounded" style={{ backgroundColor: 'var(--bg-primary)' }}>
							{groupedCommits[repoName][0].author}
						</span>
					</div>
					<div className="divide-y divide-color" style={{ borderTop: 'none' }}>
						{groupedCommits[repoName].map(commit => (
							<div key={commit.hash} className="p-3 hover:bg-white/5 transition-colors flex gap-4 items-start" style={{ borderBottom: '1px solid var(--border-color)' }}>
								<div className="font-mono text-xs text-accent min-w-[70px] pt-1 flex items-center gap-1">
									<GitCommit size={12} />
									{commit.hash}
								</div>
								<div className="flex-1 min-w-0">
									<div className="font-medium text-sm truncate" title={commit.message}>
										{commit.message}
									</div>
									<div className="flex items-center gap-4 mt-1 text-xs text-secondary">
										<span className="flex items-center gap-1">
											<Clock size={12} />
											{commit.date}
										</span>
										{commit.refs && (
											<span className="flex items-center gap-1 text-warning" style={{ color: 'var(--warning)' }}>
												<GitBranch size={12} />
												{commit.refs}
											</span>
										)}
									</div>
								</div>
							</div>
						))}
					</div>
				</div>
			))}
		</div>
	);
};
