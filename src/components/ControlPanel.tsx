import React from 'react';
import { FolderOpen, Play, Calendar } from 'lucide-react';
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
		<div className="p-4 bg-secondary border-b border-color flex flex-col gap-4 shadow-md" style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
			<div className="flex items-center gap-4">
				<div className="flex-1 flex items-center gap-2 bg-tertiary p-2 rounded border border-color" style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)' }}>
					<FolderOpen size={20} className="text-secondary" />
					<input
						type="text"
						value={rootPath}
						readOnly
						placeholder="Select a directory with git repositories..."
						className="flex-1 bg-transparent border-none outline-none text-sm"
						style={{ border: 'none', outline: 'none', background: 'transparent' }}
					/>
					<button onClick={onBrowse} className="text-sm px-3 py-1">Browse</button>
				</div>

				<button
					onClick={onScan}
					disabled={!rootPath || isScanning}
					className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-white px-6 py-2 rounded font-bold"
					style={{ backgroundColor: 'var(--accent-primary)' }}
				>
					<Play size={18} />
					{isScanning ? 'Scanning...' : 'Scan'}
				</button>
			</div>

			<div className="flex items-center gap-4">
				<div className="flex items-center gap-2">
					<Calendar size={18} className="text-secondary" />
					<span className="text-sm text-secondary">Time Range:</span>
					<select
						value={timeFrame}
						onChange={(e) => onTimeFrameChange(e.target.value as TimeFrame)}
						className="min-w-[120px]"
					>
						<option value="8h">Last 8 Hours</option>
						<option value="24h">Last 24 Hours</option>
						<option value="48h">Last 48 Hours</option>
						<option value="1w">Last Week</option>
						<option value="custom">Custom Range</option>
					</select>
				</div>

				{timeFrame === 'custom' && (
					<div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-4">
						<input
							type="date"
							value={customSince}
							onChange={(e) => onCustomSinceChange(e.target.value)}
						/>
						<span className="text-secondary">to</span>
						<input
							type="date"
							value={customUntil}
							onChange={(e) => onCustomUntilChange(e.target.value)}
						/>
					</div>
				)}
			</div>
		</div>
	);
};
