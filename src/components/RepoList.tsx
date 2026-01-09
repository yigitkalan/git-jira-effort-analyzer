import React, { useMemo, useState } from 'react';
import { Commit } from '../types';
import { GitCommit, GitBranch, Clock, FolderGit, User, Hash, ChevronDown, ChevronRight } from 'lucide-react';

interface RepoListProps {
	commits: Commit[];
}

export const RepoList: React.FC<RepoListProps> = ({ commits }) => {
	const [collapsedRepos, setCollapsedRepos] = useState<Record<string, boolean>>({});

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

	const toggleRepo = (repoName: string) => {
		setCollapsedRepos(prev => ({
			...prev,
			[repoName]: !prev[repoName]
		}));
	};

	if (commits.length === 0) {
		return (
			<div className="flex-1 flex flex-col items-center justify-center text-secondary gap-6 opacity-60">
				<div style={{ width: '6rem', height: '6rem', borderRadius: '9999px', background: 'rgba(148, 163, 184, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
			{/* Column layout for repositories */}
			<div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
				{repoNames.map((repoName, index) => {
					const isCollapsed = collapsedRepos[repoName];
					return (
						<div
							key={repoName}
							className="glass-card rounded-xl overflow-hidden animate-in"
							style={{ animationDelay: `${index * 50}ms` }}
						>
							{/* Repository Header */}
							<div
								onClick={() => toggleRepo(repoName)}
								style={{
									background: 'rgba(255, 255, 255, 0.03)',
									padding: '1rem 1.25rem',
									borderBottom: isCollapsed ? 'none' : '1px solid rgba(148, 163, 184, 0.1)',
									display: 'flex',
									justifyContent: 'space-between',
									alignItems: 'center',
									cursor: 'pointer',
									transition: 'background 0.2s ease'
								}}
								onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)'}
								onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)'}
							>
								<div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
									<div style={{ padding: '0.5rem', background: 'rgba(59, 130, 246, 0.15)', borderRadius: '0.5rem', color: '#60a5fa' }}>
										<FolderGit size={20} />
									</div>
									<div>
										<h3 style={{ fontWeight: 700, fontSize: '1rem', margin: 0, color: '#f8fafc' }}>{repoName}</h3>
										<span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.375rem', marginTop: '0.125rem' }}>
											<span style={{ width: '0.5rem', height: '0.5rem', borderRadius: '9999px', background: '#10b981' }}></span>
											{groupedCommits[repoName].length} commit{groupedCommits[repoName].length !== 1 ? 's' : ''}
										</span>
									</div>
								</div>
								<div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
									<div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: '#94a3b8', background: 'rgba(0, 0, 0, 0.2)', padding: '0.375rem 0.75rem', borderRadius: '0.375rem', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
										<User size={12} />
										{groupedCommits[repoName][0].author}
									</div>
									<div style={{ color: '#94a3b8' }}>
										{isCollapsed ? <ChevronRight size={20} /> : <ChevronDown size={20} />}
									</div>
								</div>
							</div>

							{/* Commits List */}
							{!isCollapsed && (
								<div style={{ maxHeight: '400px', overflowY: 'auto' }}>
									{groupedCommits[repoName].map((commit, commitIndex) => (
										<div
											key={commit.hash}
											style={{
												padding: '1rem 1.25rem',
												borderTop: commitIndex > 0 ? '1px solid rgba(255, 255, 255, 0.03)' : 'none',
												display: 'flex',
												gap: '1rem',
												alignItems: 'flex-start',
												transition: 'background 0.15s ease'
											}}
											onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)'}
											onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
										>
											{/* Commit Hash with Icon */}
											<div style={{
												display: 'flex',
												alignItems: 'center',
												gap: '0.375rem',
												fontFamily: 'monospace',
												fontSize: '0.75rem',
												color: '#60a5fa',
												minWidth: '90px',
												paddingTop: '0.125rem'
											}}>
												<Hash size={12} style={{ opacity: 0.7 }} />
												<span>{commit.hash}</span>
											</div>

											{/* Commit Details */}
											<div style={{ flex: 1, minWidth: 0 }}>
												{/* Commit Message */}
												<div style={{
													fontWeight: 500,
													fontSize: '0.875rem',
													color: '#e2e8f0',
													lineHeight: 1.5,
													wordBreak: 'break-word'
												}}>
													{commit.message}
												</div>

												{/* Metadata Row */}
												<div style={{
													display: 'flex',
													alignItems: 'center',
													gap: '1rem',
													marginTop: '0.5rem',
													fontSize: '0.75rem',
													color: '#94a3b8'
												}}>
													{/* Date */}
													<span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
														<Clock size={12} style={{ color: '#64748b' }} />
														{commit.date}
													</span>

													{/* Branch/Refs */}
													{commit.refs && (
														<span style={{
															display: 'flex',
															alignItems: 'center',
															gap: '0.375rem',
															color: '#fbbf24',
															background: 'rgba(251, 191, 36, 0.1)',
															padding: '0.125rem 0.5rem',
															borderRadius: '9999px',
															border: '1px solid rgba(251, 191, 36, 0.2)'
														}}>
															<GitBranch size={10} />
															{commit.refs}
														</span>
													)}
												</div>
											</div>
										</div>
									))}
								</div>
							)}
						</div>
					);
				})}
			</div>
		</div>
	);
};
