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
	private archiveFileName: string;
	isContentLoaded = false;
	isLayoutOpened = false;
	projectVisibility: Map<string, boolean> = new Map();

	constructor(private app: App) {
		this.storage = new TaskStorage(this.app);
		this.model = new TimerModel();
		this.generateFileName();
	}

	private generateFileName() {
		this.archiveFileName = `${window.moment().format('YYYY-MM-DD')}_CUSTOM.md`;
	}

	getPluginFiles() {
		const pluginFiles = this.storage.getPluginFiles(this.archiveFolderUrl);

		if (!pluginFiles.includes(this.archiveFileName)) {
			pluginFiles.unshift(this.archiveFileName);
		}

		return pluginFiles;
	}

	getTags(): string[] {
		return [
			'IN',
			'WK',
			'HM',
			'CR',
			'LN',
			'US',
			'SC',
			'ST',
			'AL',
			'HP',
		];
	}

	// PROJECT

	isProjectHidden(projectId: string) {
		const project = this.model.getTaskById(projectId);
		if (!project) return false;

		return !(
			this.projectVisibility.has(projectId)
				? this.projectVisibility.get(projectId)
				: this.model.getSubTasks(project)
					.some(this.model.isTaskActive) 
		);
	}

	startNewProject(name: string) {
		this.model.appendProject(name);
		this.updateAndSave();
	}

	startSubTask(parentId: string, name?: string) {
		this.model.makeTaskProject(parentId);
		this.model.endSubTasks(parentId);
		this.model.createSubTask(parentId, name);
		this.updateAndSave();
	}

	changeParent(targetId: string, parentId: string) {
		this.model.makeTaskProject(parentId);
		this.model.unparentTask(targetId);
		this.model.parentTask(targetId, parentId);
		this.updateAndSave();
	}

	clearParent(targetId: string) {
		this.model.unparentTask(targetId);
		this.updateAndSave();
	}

	getProjectDuration(parentId: string): number {
		return this.model.getTasksDuration(parentId);
	}

	toggleProjectVisibility(projectId: string) {
		const currentVisibility = this.isProjectHidden(projectId);

		this.projectVisibility.set(projectId, currentVisibility);
		this.view.updateView();
	}

	isTaskSubOf(taskId: string, parentId: string) {
		return this.model.isTaskSubOf(taskId, parentId);
	}

	// VIEW

	async reloadPluginData() {
		this.generateFileName();
		await this.loadArchive();
	}

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
		this.view.updateView();
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
		this.view.updateView();
		this.storage.saveArchive(this.model.getFlatTasks(), this.getArchiveUrl());
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
		const task = this.model.getTaskById(id);
		if (task?.parentId) {
			this.model.unparentTask(task.id);	
		}
		
		this.model.deleteSubtasksById(id);
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
