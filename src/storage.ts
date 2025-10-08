import { App, TFile } from "obsidian";
import { TaskEntry } from './types';

export const ARCHIVE_PATH = "archive.md"; // Корень хранилища

export class TaskStorage {
	constructor(private app: App) { }

	async loadArchive(): Promise<TaskEntry[]> {
		try {
			const file = this.app.vault.getFileByPath(ARCHIVE_PATH);
			if (!file) return [];
			const content = await this.app.vault.read(file as TFile);

			const match = content.match(/```json\n([\s\S]*?)\n```/);
			if (!match) return [];
			const jsonText = match[1];
			const data = JSON.parse(jsonText);
			if (Array.isArray(data)) return data as TaskEntry[];
			return [];
		} catch (e) {
			console.error(e);
			return [];
		}
	}


	async saveArchive(tasks: TaskEntry[]): Promise<void> {
		const data = JSON.stringify(tasks, null);
		const mdContent = `\`\`\`json\n${data}\n\`\`\``;

		const file = this.app.vault.getAbstractFileByPath(ARCHIVE_PATH);
		if (file instanceof TFile) {
			const content = await this.app.vault.read(file as TFile);
			const match = content.match(/```json\n([\s\S]*?)\n```/);
			let appendContent = '';

			if (match && match.index > -1) {
				appendContent = content.slice(0, match.index) +
					mdContent +
					content.slice(match.index + match[0].length);					
			} else {
				appendContent = content + '\n' + mdContent;
			}

			await this.app.vault.modify(file, appendContent);
		} else {
			await this.app.vault.create(ARCHIVE_PATH, mdContent);
		}
	}
}
