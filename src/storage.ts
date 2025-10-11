import { App, TFile } from "obsidian";
import { TaskEntry } from './types';
import { isFileForPlugin } from './utils';


export class TaskStorage {
	constructor(private app: App) { }

	getPluginFiles(url: string): string[] {
		try {
			const folder = this.app.vault.getFolderByPath(url);

			if (!folder) return [];

			return folder.children.reduce<string[]>((names, file) => {
				if (isFileForPlugin(file.name)) {
					names.push(file.name);
				}

				return names;
			}, []).sort((a, b) => a < b ? 1 : -1);
		} catch (e) {
			console.error(e);
			return [];
		}
	}

	async loadArchive(url: string): Promise<TaskEntry[]> {
		try {
			const file = this.app.vault.getFileByPath(url);

			if (!file) return [];
			const content = await this.app.vault.read(file as TFile);

			const match = content.match(/```json\n([\s\S]*?)\n```/);
			if (!match) return [];

			
			const data = JSON.parse(match[1]);
			const entries: TaskEntry[] = data.entries;

			return entries;
		} catch (e) {
			console.error(e);
			return [];
		}
	}

	async saveArchive(tasks: TaskEntry[], url: string): Promise<void> {
		const data = JSON.stringify({
			entries: tasks
		});
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
			} catch (e) {
				console.log(e);
			}
			await this.app.vault.create(url, mdContent);
		}
	}
}
