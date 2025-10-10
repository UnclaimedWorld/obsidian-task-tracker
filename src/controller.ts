import { App, TAbstractFile, TFile } from 'obsidian';
import { TimerModel } from "./model";
import { TaskTimerView } from './view';
import { TaskStorage } from './storage';
import { getArchiveFileName } from './utils';
import { TaskForm } from './types';

export default class TaskController {
	private view: TaskTimerView
	private model: TimerModel
	private storage!: TaskStorage
	private archiveUrl: string;
	isContentLoaded = false;
	isLayoutOpened = false;

	constructor(private app: App) {
		this.updateArchiveUrl();
		this.storage = new TaskStorage(this.app);
		this.model = new TimerModel();
	}

	getTasks() {
		return this.model.getFlatTasks()
	}

	getRunningTasks() {
		return this.model.getFlatRunningTasks()
	}

	updateArchiveUrl() {
		this.archiveUrl = `Достижения/${getArchiveFileName()}`;
	}

	// TODO Пока что не работает
	async updateArchiveUrlAndReloadModel() {
		const oldArchiveUrl = this.archiveUrl;
		this.updateArchiveUrl();

		if (this.archiveUrl !== oldArchiveUrl) {
			await this.loadModel();
		}
	}

	async loadArchive() {
		const archive = await this.storage.loadArchive(this.archiveUrl);
		this.model.initModel(archive);
		this.isContentLoaded = true;
	}

	async loadModel() {
		await this.loadArchive();
		this.openView();
	}

	modifyHandler(file: TAbstractFile) {
		if (file instanceof TFile && file.path === this.archiveUrl) {
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
			this.updateArchiveUrlAndReloadModel();
			this.view.renderView();
		}
	}

	startNewTask(name: string) {
		this.model.endAllTasks();
		this.appendTask(name);
	}

	appendTask(name: string) {
		this.model.appendTask(name);
		this.view.updateView();
		this.storage.saveArchive(this.model.getFlatTasks(), this.archiveUrl);
	}

	updateTask(id: string, taskForm: TaskForm) {
		this.model.updateTaskById(id, taskForm);
		this.view.updateView();
		this.storage.saveArchive(this.model.getFlatTasks(), this.archiveUrl);
	}

	deleteTask(id: string) {
		this.model.deleteTaskById(id);
		this.view.updateView();
		this.storage.saveArchive(this.model.getFlatTasks(), this.archiveUrl);
	}

	endAllTasks() {
		this.model.endAllTasks();
		this.view.updateView();
		this.storage.saveArchive(this.model.getFlatTasks(), this.archiveUrl);
	}

	endTask(id: string) {
		this.model.endTaskById(id);
		this.view.updateView();
		this.storage.saveArchive(this.model.getFlatTasks(), this.archiveUrl);
	}
}
