import { App, TAbstractFile, TFile } from 'obsidian';
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
		return this.storage.getPluginFiles(this.archiveFolderUrl);
	}

	getTasks() {
		return this.model.getFlatTasks().filter(task => !task.parentId);
	}

	populateSubtasks(task: TaskEntry): TaskEntry[] {
		return this.model.getSubTasks(task);
	}

	getRunningTasks() {
		return this.model.getFlatRunningTasks()
	}

	getArchiveUrl() {
		return `${this.archiveFolderUrl}/${this.getArchiveFileName()}`;
	}

	async updateArchiveUrl(fileName: string) {
		this.archiveFileName = fileName;
		await this.loadArchive();
		this.view.updateView();
	}

	async loadArchive() {
		const archive = await this.storage.loadArchive(this.getArchiveUrl());
		this.model.initModel(archive);
		this.isContentLoaded = true;
	}

	async loadModel() {
		await this.loadArchive();
		this.openView();
	}

	modifyHandler(file: TAbstractFile) {
		if (file instanceof TFile && file.path === this.getArchiveUrl()) {
			this.loadArchive();
		}
	}

	async setViewOnce(view: TaskTimerView) {
		this.view = view;
		this.openView();

		this.view.registerEvent(this.app.vault.on('modify', this.modifyHandler.bind(this)));
	}

	async openView() {
		if (this.isContentLoaded && this.view?.opened) {
			this.view.renderView();
		}
	}

	getArchiveFileName() {
		return this.archiveFileName;
	}

	startNewTask(name: string) {
		this.model.endAllTasks();
		this.appendTask(name);
	}

	startSubTask(taskId: string, name?: string) {
		this.model.createSubTask(taskId, name);
		this.view.updateView();
		this.storage.saveArchive(this.model.getFlatTasks(), this.getArchiveUrl());
	}

	appendTask(name: string) {
		this.model.appendTask(name);
		this.view.updateView();
		this.storage.saveArchive(this.model.getFlatTasks(), this.getArchiveUrl());
	}

	updateTask(id: string, taskForm: TaskForm) {
		this.model.updateTaskById(id, taskForm);
		this.view.updateView();
		this.storage.saveArchive(this.model.getFlatTasks(), this.getArchiveUrl());
	}

	deleteTask(id: string) {
		this.model.deleteTaskById(id);
		this.view.updateView();
		this.storage.saveArchive(this.model.getFlatTasks(), this.getArchiveUrl());
	}

	endAllTasks() {
		this.model.endAllTasks();
		this.view.updateView();
		this.storage.saveArchive(this.model.getFlatTasks(), this.getArchiveUrl());
	}

	endTask(id: string) {
		this.model.endTaskById(id);
		this.view.updateView();
		this.storage.saveArchive(this.model.getFlatTasks(), this.getArchiveUrl());
	}
}
