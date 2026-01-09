import React from 'react';
import { FolderOpen, Play, Calendar, ChevronDown } from 'lucide-react';
import { TimeFrame } from '../types';

interface ControlPanelProps {
	rootPath: string;
	onBrowse: () => void;
	timeFrame: TimeFrame;
	onTimeFrameChange: (tf: TimeFrame) => void;
	customSince: string;
	onCustomSinceChange: (date: string) => void;
	customUntil: string;
	onCustomUntilChange: (date: string) => void;
	onScan: () => void;
	isScanning: boolean;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
	rootPath,
	onBrowse,
	timeFrame,
	onTimeFrameChange,
	customSince,
	onCustomSinceChange,
	customUntil,
	onCustomUntilChange,
	onScan,
	isScanning
}) => {
	return (
		<div className="p-6 flex flex-col gap-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold mb-1">Dashboard</h1>
					<p className="text-secondary text-sm">Analyze your git activity and efforts</p>
				</div>

				<button
					onClick={onScan}
					disabled={!rootPath || isScanning}
					className="primary flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold text-sm"
				>
					<Play size={18} className={isScanning ? 'animate-spin' : ''} />
					{isScanning ? 'Scanning Repositories...' : 'Start Analysis'}
				</button>
			</div>

			<div className="glass-card p-4 rounded-xl flex items-center gap-4 flex-wrap">
				<div className="flex-1 min-w-300">
					<label className="block text-xs font-medium text-secondary mb-1-5 uppercase tracking-wider">Target Directory</label>
					<div className="flex items-center gap-2 bg-secondary/50 p-1.5 rounded-lg border border-color hover:border-accent/50 transition-colors" style={{ background: 'rgba(15, 23, 42, 0.3)' }}>
						<div className="p-2 bg-blue-500/10 rounded-md text-accent">
							<FolderOpen size={18} />
						</div>
						<input
							type="text"
							value={rootPath}
							readOnly
							placeholder="Select a directory containing your git repositories..."
							className="flex-1 bg-transparent border-none p-0 text-sm focus:ring-0"
							style={{ border: 'none', background: 'transparent', boxShadow: 'none' }}
						/>
						<button onClick={onBrowse} className="text-xs px-3 py-1.5 bg-tertiary hover:bg-white/10 rounded-md">
							Browse
						</button>
					</div>
				</div>

				<div className="min-w-200">
					<label className="block text-xs font-medium text-secondary mb-1-5 uppercase tracking-wider">Time Range</label>
					<div className="flex items-center gap-2 p-1.5 rounded-lg border border-color" style={{ background: 'rgba(15, 23, 42, 0.3)' }}>
						<div className="p-2 bg-blue-500/10 rounded-md text-accent">
							<Calendar size={18} />
						</div>
						<select
							value={timeFrame}
							onChange={(e) => onTimeFrameChange(e.target.value as TimeFrame)}
							className="flex-1 appearance-none bg-transparent border-none text-sm"
							style={{ backgroundImage: 'none', border: 'none', boxShadow: 'none', padding: '0.25rem 1.5rem 0.25rem 0' }}
						>
							<option value="8h">Last 8 Hours</option>
							<option value="24h">Last 24 Hours</option>
							<option value="48h">Last 48 Hours</option>
							<option value="1w">Last Week</option>
							<option value="yesterday">Yesterday (9am-7pm)</option>
							<option value="custom">Custom Range</option>
						</select>
						<ChevronDown size={14} className="text-secondary pointer-events-none" />
					</div>
				</div>

				{timeFrame === 'custom' && (
					<>
						<div className="min-w-200 animate-in">
							<label className="block text-xs font-medium text-secondary mb-1-5 uppercase tracking-wider">From</label>
							<input
								type="datetime-local"
								value={customSince}
								onChange={(e) => onCustomSinceChange(e.target.value)}
								style={{ width: '100%' }}
							/>
						</div>
						<div className="min-w-200 animate-in">
							<label className="block text-xs font-medium text-secondary mb-1-5 uppercase tracking-wider">To</label>
							<input
								type="datetime-local"
								value={customUntil}
								onChange={(e) => onCustomUntilChange(e.target.value)}
								style={{ width: '100%' }}
							/>
						</div>
					</>
				)}
			</div>
		</div>
	);
};
