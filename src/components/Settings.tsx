import React from 'react';
import { useTheme } from 'next-themes';
import { Moon, Sun, Monitor } from 'lucide-react';

export const SettingsView: React.FC = () => {
	const { theme, setTheme } = useTheme();

	return (
		<div className="p-6 flex flex-col gap-8 animate-in">
			<div>
				<h1 className="text-2xl font-bold mb-1">Settings</h1>
				<p className="text-secondary text-sm">Configure your application preferences</p>
			</div>

			<div className="glass-card p-6 rounded-xl flex flex-col gap-6">
				<div>
					<label className="block text-xs font-medium text-secondary mb-3 uppercase tracking-wider">Appearance</label>
					<div className="flex gap-3">
						<ThemeButton
							active={theme === 'light'}
							onClick={() => setTheme('light')}
							icon={<Sun size={18} />}
							label="Light"
						/>
						<ThemeButton
							active={theme === 'dark'}
							onClick={() => setTheme('dark')}
							icon={<Moon size={18} />}
							label="Dark"
						/>
						<ThemeButton
							active={theme === 'system'}
							onClick={() => setTheme('system')}
							icon={<Monitor size={18} />}
							label="System"
						/>
					</div>
				</div>
			</div>
		</div>
	);
};

interface ThemeButtonProps {
	active: boolean;
	onClick: () => void;
	icon: React.ReactNode;
	label: string;
}

const ThemeButton: React.FC<ThemeButtonProps> = ({ active, onClick, icon, label }) => (
	<button
		onClick={onClick}
		className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg border transition-all ${active
				? 'bg-blue-500/10 border-blue-500/50 text-accent'
				: 'bg-secondary/30 border-color hover:border-hover text-secondary'
			}`}
		style={{
			background: active ? 'rgba(59, 130, 246, 0.1)' : 'rgba(15, 23, 42, 0.3)',
			borderColor: active ? 'var(--accent-primary)' : 'var(--border-color)',
			color: active ? 'var(--accent-primary)' : 'var(--text-secondary)'
		}}
	>
		{icon}
		<span className="font-medium text-sm">{label}</span>
	</button>
);
