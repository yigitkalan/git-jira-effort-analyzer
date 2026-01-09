import React, { useMemo } from 'react';
import { Commit } from '../types';
import { GitCommit, GitBranch, Clock, FolderGit } from 'lucide-react';

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
			<div className="flex-1 flex flex-col items-center justify-center text-secondary gap-6 opacity-60">
				<div className="w-24 h-24 rounded-full bg-secondary/10 flex items-center justify-center">
					<FolderGit size={48} />
				</div>
				<div className="text-center">
					<p className="text-lg font-medium">No activity found</p>
					<p className="text-sm">Select a directory and scan to see your git history</p>
				</div>
			</div>
		);
	}

	return (
		<div className="flex-1 overflow-auto px-6 pb-6">
			<div className="repo-grid">
				{repoNames.map((repoName, index) => (
					<div
						key={repoName}
						className="glass-card rounded-xl overflow-hidden animate-in h-fit"
						style={{ animationDelay: `${index * 50}ms` }}
					>
						<div className="bg-white/5 p-4 border-b border-color flex justify-between items-center backdrop-blur-sm">
							<div className="flex items-center gap-3">
								<div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
									<FolderGit size={18} />
								</div>
								<div>
									<h3 className="font-bold text-base m-0 text-primary truncate max-w-[150px]">{repoName}</h3>
									<span className="text-xs text-secondary flex items-center gap-1 mt-0.5">
										<span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
										{groupedCommits[repoName].length} commits
									</span>
								</div>
							</div>
							<span className="text-xs font-mono text-secondary bg-black-20 px-2 py-1 rounded border border-white/5 truncate max-w-[100px]">
								{groupedCommits[repoName][0].author}
							</span>
						</div>

						<div className="divide-y divide-white/5 max-h-[300px] overflow-y-auto custom-scrollbar">
							{groupedCommits[repoName].map(commit => (
								<div key={commit.hash} className="p-4 hover:bg-white/5 transition-colors group flex gap-4 items-start">
									<div className="font-mono text-xs text-blue-400/80 pt-1 flex items-center gap-1.5 min-w-[85px] group-hover:text-blue-400 transition-colors">
										<GitCommit size={14} />
										{commit.hash}
									</div>

									<div className="flex-1 min-w-0">
										<div className="font-medium text-sm text-primary/90 group-hover:text-white transition-colors leading-snug break-words">
											{commit.message}
										</div>

										<div className="flex items-center gap-4 mt-2 text-xs text-secondary">
											<span className="flex items-center gap-1.5" title={commit.date}>
												<Clock size={12} />
												{commit.date}
											</span>
											{commit.refs && (
												<span className="flex items-center gap-1.5 text-amber-500/90 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 truncate max-w-[150px]">
													<GitBranch size={10} />
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
		</div>
	);
};
