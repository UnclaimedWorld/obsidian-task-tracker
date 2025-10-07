import { App } from 'obsidian';
import { Archive, TimerModel } from "./model";
import { TaskTimerView } from './view';
import { TaskStorage } from './storage';
import { ViewSubscribeKeys } from './types';

export default class TaskController {
	private view!: TaskTimerView
	private model!: TimerModel
	private storage!: TaskStorage
	private interval?: number;

	constructor(private app: App) {
		this.storage = new TaskStorage(this.app);
		this.model = new TimerModel();
	}

	get tasks() {
		return this.model.flatTasks
	}

	get runningTasks() {
		return this.model.flatRunningTasks
	}

	async initView(view: TaskTimerView) {
		await this.initModel();
		this.view = view;
	}

	async initModel() {
		const archive = await this.storage.loadArchive();
		this.model.initModel(archive);
	}

	startNewTask(name: string) {
		this.model.endAllTasks();
		this.model.appendTask(name);
		this.view.updateView();
		this.storage.saveArchive(this.model.flatTasks);
	}

	appendTask(name: string) {
		this.model.appendTask(name);
		this.view.updateView();
		this.storage.saveArchive(this.model.flatTasks);
	}

	endAllTasks() {
		this.model.endAllTasks();
		this.view.updateView();
		this.storage.saveArchive(this.model.flatTasks);
	}
}
