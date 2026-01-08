import { useState, useEffect } from 'react';
import { ControlPanel } from './components/ControlPanel';
import { RepoList } from './components/RepoList';
import { Commit, ScanOptions, TimeFrame } from './types';
import { format, subHours, subWeeks } from 'date-fns';

function App() {
	const [rootPath, setRootPath] = useState('');
	const [timeFrame, setTimeFrame] = useState<TimeFrame>('24h');
	const [customSince, setCustomSince] = useState(format(new Date(), 'yyyy-MM-dd'));
	const [customUntil, setCustomUntil] = useState(format(new Date(), 'yyyy-MM-dd'));
	const [commits, setCommits] = useState<Commit[]>([]);
	const [isScanning, setIsScanning] = useState(false);

	useEffect(() => {
		// Load settings
		const loadSettings = async () => {
			const savedPath = await (window as any).ipcRenderer.invoke('get-settings', 'rootPath');
			if (savedPath) setRootPath(savedPath);

			const savedTimeFrame = await (window as any).ipcRenderer.invoke('get-settings', 'timeFrame');
			if (savedTimeFrame) setTimeFrame(savedTimeFrame);
		};
		loadSettings();
	}, []);

	const handleBrowse = async () => {
		const path = await (window as any).ipcRenderer.invoke('select-directory');
		if (path) {
			setRootPath(path);
			(window as any).ipcRenderer.invoke('save-settings', 'rootPath', path);
		}
	};

	const handleTimeFrameChange = (tf: TimeFrame) => {
		setTimeFrame(tf);
		(window as any).ipcRenderer.invoke('save-settings', 'timeFrame', tf);
	};

	const handleScan = async () => {
		if (!rootPath) return;

		setIsScanning(true);
		setCommits([]);

		let since = '';
		let until = '';

		if (timeFrame === 'custom') {
			since = customSince;
			until = customUntil;
		} else {
			// Use git relative dates
			switch (timeFrame) {
				case '8h': since = '8 hours ago'; break;
				case '24h': since = '24 hours ago'; break;
				case '48h': since = '48 hours ago'; break;
				case '1w': since = '1 week ago'; break;
			}
		}

		const options: ScanOptions = {
			rootPath,
			since,
			until: timeFrame === 'custom' ? until : undefined
		};

		try {
			const results = await (window as any).ipcRenderer.invoke('scan-repos', options);
			setCommits(results);
		} catch (error) {
			console.error('Scan failed:', error);
		} finally {
			setIsScanning(false);
		}
	};

	return (
		<div className="h-screen flex flex-col bg-primary text-primary">
			<header className="p-4 bg-secondary border-b border-color flex items-center gap-3" style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
				<div className="w-8 h-8 bg-accent rounded flex items-center justify-center font-bold text-white" style={{ backgroundColor: 'var(--accent-primary)' }}>
					GE
				</div>
				<h1 className="text-lg font-bold m-0">Git Effort Analyzer</h1>
			</header>

			<ControlPanel
				rootPath={rootPath}
				onBrowse={handleBrowse}
				timeFrame={timeFrame}
				onTimeFrameChange={handleTimeFrameChange}
				customSince={customSince}
				onCustomSinceChange={setCustomSince}
				customUntil={customUntil}
				onCustomUntilChange={setCustomUntil}
				onScan={handleScan}
				isScanning={isScanning}
			/>

			<RepoList commits={commits} />
		</div>
	);
}

export default App;
