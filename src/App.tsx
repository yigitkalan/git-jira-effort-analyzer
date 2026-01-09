import { useState } from 'react';
import { ControlPanel } from './components/ControlPanel';
import { RepoList } from './components/RepoList';
import { useGitScan } from './hooks/useGitScan';
import { Sidebar } from './components/Sidebar';

import { SettingsView } from './components/Settings';

function App() {
	const [currentView, setCurrentView] = useState('dashboard');

	const {
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
	} = useGitScan();

	const renderContent = () => {
		if (currentView === 'dashboard') {
			return (
				<>
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
				</>
			);
		}

		if (currentView === 'settings') {
			return <SettingsView />;
		}

		return (
			<div className="flex-1 flex flex-col items-center justify-center text-secondary opacity-60">
				<h2 className="text-2xl font-bold mb-2 capitalize">{currentView}</h2>
				<p>This feature is coming soon.</p>
			</div>
		);
	};

	return (
		<div className="flex h-screen w-full overflow-hidden bg-primary text-primary">
			<Sidebar currentView={currentView} onViewChange={setCurrentView} />
			<main className="flex-1 flex flex-col min-w-0 overflow-hidden relative bg-black-20">
				{/* Background decorative elements */}
				<div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
					<div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-blue-500/5 blur-3xl" style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.05) 0%, transparent 70%)' }} />
					<div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-purple-500/5 blur-3xl" style={{ background: 'radial-gradient(circle, rgba(168,85,247,0.05) 0%, transparent 70%)' }} />
				</div>

				<div className="relative z-10 flex flex-col h-full container-centered">
					{renderContent()}
				</div>
			</main>
		</div>
	);
}

export default App;
