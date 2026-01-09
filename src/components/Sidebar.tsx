import React from 'react';
import { GitGraph, Settings, LayoutDashboard, Clock } from 'lucide-react';

interface SidebarProps {
	currentView: string;
	onViewChange: (view: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onViewChange }) => {
	return (
		<div className="w-64 glass flex flex-col border-r border-color h-full" style={{ borderRight: '1px solid var(--border-color)' }}>
			<div className="p-6 flex items-center gap-3 border-b border-color" style={{ borderBottom: '1px solid var(--border-color)' }}>
				<span className="font-bold text-lg tracking-tight">Git Effort Analyzer</span>
			</div>

			<nav className="flex-1 p-4 flex flex-col gap-2">
				<NavItem
					icon={<LayoutDashboard size={20} />}
					label="Dashboard"
					active={currentView === 'dashboard'}
					onClick={() => onViewChange('dashboard')}
				/>
				<NavItem
					icon={<GitGraph size={20} />}
					label="Repositories"
					active={currentView === 'repositories'}
					onClick={() => onViewChange('repositories')}
				/>
				<NavItem
					icon={<Clock size={20} />}
					label="Time Logs"
					active={currentView === 'timelogs'}
					onClick={() => onViewChange('timelogs')}
				/>
			</nav>

			<div className="p-4 border-t border-color" style={{ borderTop: '1px solid var(--border-color)' }}>
				<NavItem
					icon={<Settings size={20} />}
					label="Settings"
					active={currentView === 'settings'}
					onClick={() => onViewChange('settings')}
				/>
			</div>
		</div>
	);
};

const NavItem: React.FC<{ icon: React.ReactNode; label: string; active?: boolean; onClick: () => void }> = ({ icon, label, active, onClick }) => (
	<button
		onClick={onClick}
		className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${active
			? 'bg-blue-500/10 text-blue-400'
			: 'hover:bg-white/5 text-secondary hover:text-primary'
			}`}
		style={{
			background: active ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
			color: active ? 'var(--accent-primary)' : 'var(--text-secondary)'
		}}
	>
		{icon}
		<span className="font-medium">{label}</span>
	</button>
);
