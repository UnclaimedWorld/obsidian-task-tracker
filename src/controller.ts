import { App } from 'obsidian';
import { TimerModel } from "./model";
import { TaskTimerView } from './view';
import { TaskStorage } from './storage';

export default class TaskController {
	private view: TaskTimerView
	private model: TimerModel
	private storage!: TaskStorage
	isContentLoaded = false;
	isLayoutOpened = false;

	constructor(private app: App) {
		this.storage = new TaskStorage(this.app);
		this.model = new TimerModel();
	}

	getTasks() {
		return this.model.getFlatTasks()
	}

	getRunningTasks() {
		return this.model.getFlatRunningTasks()
	}

	async loadModel() {
		if (this.isContentLoaded) return;

		const archive = await this.storage.loadArchive();
		this.model.initModel(archive);
		this.isContentLoaded = true;
		this.openView();
	}

	async setView(view: TaskTimerView) {
		this.view = view;
		this.openView();
	}

	openView() {
		if (this.isContentLoaded && this.view?.opened) {
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
		this.storage.saveArchive(this.model.getFlatTasks());
	}

	endAllTasks() {
		this.model.endAllTasks();
		this.view.updateView();
		this.storage.saveArchive(this.model.getFlatTasks());
	}
}
