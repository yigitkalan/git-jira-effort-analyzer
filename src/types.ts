export interface Commit {
	hash: string;
	date: string;
	message: string;
	refs: string;
	repoName: string;
	author: string;
}

export interface ScanOptions {
	rootPath: string;
	since?: string;
	until?: string;
}

export type TimeFrame = '8h' | '24h' | '48h' | '1w' | 'yesterday' | 'custom';
