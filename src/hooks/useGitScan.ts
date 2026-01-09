import { useState, useEffect, useCallback } from 'react';
import { Commit, ScanOptions, TimeFrame } from '../types';
import { format, subDays, setHours, setMinutes } from 'date-fns';

export function useGitScan() {
	const [rootPath, setRootPath] = useState('');
	const [timeFrame, setTimeFrame] = useState<TimeFrame>('24h');
	const [customSince, setCustomSince] = useState(format(new Date(), 'yyyy-MM-dd\'T\'09:00'));
	const [customUntil, setCustomUntil] = useState(format(new Date(), 'yyyy-MM-dd\'T\'19:00'));
	const [commits, setCommits] = useState<Commit[]>([]);
	const [isScanning, setIsScanning] = useState(false);

	useEffect(() => {
		const loadSettings = async () => {
			const savedPath = await (window as any).ipcRenderer.invoke('get-settings', 'rootPath');
			if (savedPath) setRootPath(savedPath);

			const savedTimeFrame = await (window as any).ipcRenderer.invoke('get-settings', 'timeFrame');
			if (savedTimeFrame) setTimeFrame(savedTimeFrame);
		};
		loadSettings();
	}, []);

	const handleBrowse = useCallback(async () => {
		const path = await (window as any).ipcRenderer.invoke('select-directory');
		if (path) {
			setRootPath(path);
			(window as any).ipcRenderer.invoke('save-settings', 'rootPath', path);
		}
	}, []);

	const handleTimeFrameChange = useCallback((tf: TimeFrame) => {
		setTimeFrame(tf);
		(window as any).ipcRenderer.invoke('save-settings', 'timeFrame', tf);
	}, []);

	const handleScan = useCallback(async () => {
		if (!rootPath) return;

		setIsScanning(true);
		setCommits([]);

		let since = '';
		let until = '';

		if (timeFrame === 'custom') {
			since = customSince;
			until = customUntil;
		} else if (timeFrame === 'yesterday') {
			const yesterday = subDays(new Date(), 1);
			since = format(setHours(setMinutes(yesterday, 0), 9), 'yyyy-MM-dd HH:mm:ss');
			until = format(setHours(setMinutes(yesterday, 0), 19), 'yyyy-MM-dd HH:mm:ss');
		} else {
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
			until: (timeFrame === 'custom' || timeFrame === 'yesterday') ? until : undefined
		};

		try {
			const results = await (window as any).ipcRenderer.invoke('scan-repos', options);
			setCommits(results);
		} catch (error) {
			console.error('Scan failed:', error);
		} finally {
			setIsScanning(false);
		}
	}, [rootPath, timeFrame, customSince, customUntil]);

	return {
		rootPath,
		timeFrame,
		customSince,
		customUntil,
		commits,
		isScanning,
		setCustomSince,
		setCustomUntil,
		handleBrowse,
		handleTimeFrameChange,
		handleScan
	};
}
