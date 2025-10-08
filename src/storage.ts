import { App, TFile } from "obsidian";
import { TaskEntry, TimekeepTaskEntry } from './types';


export class TaskStorage {
	constructor(private app: App) { }

	async loadArchive(url: string): Promise<TaskEntry[]> {		
		try {
			const file = this.app.vault.getFileByPath(url);

			if (!file) return [];
			const content = await this.app.vault.read(file as TFile);

			const match = content.match(/```json\n([\s\S]*?)\n```/);
			if (!match) return [];

			return this.fromTimekeepFormat(match[1]);
		} catch (e) {
			console.error(e);
			return [];
		}
	}

	async saveArchive(tasks: TaskEntry[], url: string): Promise<void> {
		const data = this.toTimekeepFormatJSON(tasks);
		const mdContent = `\`\`\`json\n${data}\n\`\`\``;

		const file = this.app.vault.getAbstractFileByPath(url);
		if (file instanceof TFile) {
			const content = await this.app.vault.read(file as TFile);
			const match = content.match(/```json\n([\s\S]*?)\n```/);
			let appendContent = '';
			const index = match ? (match.index ?? -1) : -1;

			if (match && index > -1) {
				appendContent = content.slice(0, index) +
					mdContent +
					content.slice(index + match[0].length);					
			} else {
				appendContent = content + '\n' + mdContent;
			}

			await this.app.vault.modify(file, appendContent);
		} else {
			try {
				await this.app.vault.createFolder(url.slice(0, url.lastIndexOf('/')));
			} catch(e) {
				console.log(e);
			}
			await this.app.vault.create(url, mdContent);
		}
	}

	toTimekeepFormatJSON(tasks: TaskEntry[]): string {
		return JSON.stringify({
			entries: tasks
		});
	}

	mapTimekeepEntry(entry: TimekeepTaskEntry | TaskEntry, name?: string): TaskEntry {
		if ('subEntries' in entry) {
			const { subEntries: _, ...task } = entry;

			return {
				...task,
				name: name && !name.startsWith('Part') ? name : task.name,
				id: String(Math.random())
			}
		}
		
		return entry;
	}

	flattenTimekeepSubEntries(tasks: TimekeepTaskEntry[] | null, name?: string): TaskEntry[] {
		if (!tasks?.length) return [];

		return tasks.flatMap(entry => {
			if (entry.subEntries?.length) {
				return this.flattenTimekeepSubEntries(entry.subEntries, entry.name);
			} else {
				return [ this.mapTimekeepEntry(entry, name) ];
			}
		});
	}

	fromTimekeepFormat(json: string): TaskEntry[] {
		try {
			const data = JSON.parse(json);
			const entries: TimekeepTaskEntry[] = data.entries;

			return this.flattenTimekeepSubEntries(entries);
		} catch(e) {
			console.log(e);
			return [];
		}
	}
}
