import { App, Notice, TFile } from 'obsidian';
import { TimerModel } from "./model";
import { TaskTimerView } from './view';
import { TaskStorage } from './storage';
import { TaskEntry, TaskForm } from './types';

export default class TaskController {
	private view: TaskTimerView
	private model: TimerModel
	private storage!: TaskStorage
	private archiveFolderUrl = 'Достижения';
	private archiveFileName = `${window.moment().format('YYYY-MM-DD')}_CUSTOM.md`;
	isContentLoaded = false;
	isLayoutOpened = false;

	constructor(private app: App) {
		this.storage = new TaskStorage(this.app);
		this.model = new TimerModel();
	}

	getPluginFiles() {
		const pluginFiles = this.storage.getPluginFiles(this.archiveFolderUrl);

		if (!pluginFiles.includes(this.archiveFileName)) {
			pluginFiles.unshift(this.archiveFileName);
		}

		return pluginFiles;
	}

	// VIEW

	async setViewOnce(view: TaskTimerView) {
		this.view = view;
		this.openView();

		this.view.registerEvent(this.app.vault.on('modify', file => {
			if (file instanceof TFile && file.path === this.getArchiveUrl()) {
				this.loadArchive();
			}
		}));
	}

	async openView() {
		if (this.isContentLoaded && this.view?.opened) {
			this.view.renderView();
		}
	}

	// ARCHIVE

	getArchiveFileName() {
		return this.archiveFileName;
	}

	getArchiveUrl() {
		return `${this.archiveFolderUrl}/${this.getArchiveFileName()}`;
	}

	async loadArchive() {
		const archive = await this.storage.loadArchive(this.getArchiveUrl());
		this.model.initModel(archive);
		this.isContentLoaded = true;
	}

	async updateArchiveUrl(fileName: string) {
		this.archiveFileName = fileName;
		await this.loadArchive();
		this.view.renderArchiveTable();
	}

	async loadModel() {
		await this.loadArchive();
		this.openView();
	}

	// TASKS

	getTaskById(id: string): TaskEntry | null {
		return this.model.getTaskById(id);
	}

	getTasks() {
		return this.model.getFlatTasks().filter(task => !task.parentId);
	}

	getRunningTasks() {
		return this.model.getFlatRunningTasks()
	}

	populateSubtasks(task: TaskEntry): TaskEntry[] {
		return this.model.getSubTasks(task);
	}

	async copyTaskName(task: TaskEntry) {
		try {
			await navigator.clipboard.writeText(task.name);
			new Notice('Task name copied to a clipboard', 1500);
		} catch (err) {
			console.error('Failed to copy text: ', err);
		}
	}

	startNewTask(name: string) {
		this.model.endAllTasks();
		this.model.appendTask(name);
		this.updateAndSave();
	}

	updateAndSave() {
		this.view.renderArchiveTable();
		this.storage.saveArchive(this.model.getFlatTasks(), this.getArchiveUrl());
	}

	startSubTask(taskId: string, name?: string) {
		this.model.createSubTask(taskId, name);
		this.updateAndSave();
	}

	appendTask(name: string) {
		this.model.appendTask(name);
		this.updateAndSave();
	}

	updateTask(id: string, taskForm: TaskForm) {
		this.model.updateTaskById(id, taskForm);
		this.updateAndSave();
	}

	deleteTask(id: string) {
		this.model.deleteTaskById(id);
		this.updateAndSave();
	}

	endAllTasks() {
		this.model.endAllTasks();
		this.updateAndSave();
	}

	endTask(id: string) {
		this.model.endTaskById(id);
		this.updateAndSave();
	}
}
