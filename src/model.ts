import { Archive, TaskEntry, TaskForm } from './types';
import { calcOwnDuration, isoNow, isTaskProject, sortTasks } from './utils';

export class TimerModel {
	archive: Archive;

	constructor() {
		this.archive = new Map();
	}

	initModel(archive: TaskEntry[]) {
		this.archive = new Map();
		archive.forEach(task => {
			this.archive.set(task.id, task);
		});
	}

	isTaskActive(task: TaskEntry): boolean {
		return !task.endTime;
	}

	getFlatTasks(): TaskEntry[] {
		const archive = Array.from(this.archive.values());
		sortTasks(archive);

		return archive;
	}

	getSubTasks(task: TaskEntry) {
		if (!task.subEntries) return [];

		const entries = task.subEntries.reduce<TaskEntry[]>((tasks, taskId) => {
			const task = this.getTaskById(taskId);

			if (task) {
				tasks.push(task);
			}

			return tasks;
		}, []) || [];
		sortTasks(entries);
		
		return entries;
	}

	getTaskById(id: string): TaskEntry | null {
		return this.archive.get(id) || null;
	}

	getFlatRunningTasks(): TaskEntry[] {
		return this.getFlatTasks().filter(({ endTime }) => !endTime);
	}

	getTaskName(name?: string): string {
		if (!name?.trim()) name = `Task ${this.getFlatTasks().length + 1}`;

		return name;
	}

	generateId() {
		return Date.now() + 'c' + String(Math.random()).slice(2,5);
	}

	getNewTask(name?: string): TaskEntry {
		return {
			id: this.generateId(),
			name: this.getTaskName(name),
			startTime: isoNow(),
			endTime: null
		};
	}

	appendProject(name?: string) {
		const root: TaskEntry = this.getNewTask(name);
		root.endTime = root.startTime;

		this.archive.set(root.id, root);
	}

	endSubTasks(parentId: string) {
		const parent = this.archive.get(parentId);

		if (parent) {
			parent.subEntries?.forEach(childId => {
				this.endTaskById(childId);
			})
		}
	}

	parentTask(taskId: string, parentId: string) {
		const parent = this.archive.get(parentId);
		const target = this.archive.get(taskId);

		if (parent && target) {
			parent.subEntries?.push(taskId);
			target.parentId = parentId;
		}
	}

	makeTaskProject(parentId: string): null | boolean {
		const parent = this.archive.get(parentId);
		
		if (!parent) {
			return null;
		}

		if (isTaskProject(parent)) {
			return true;
		}

		const delimeterIndex = parent.name.lastIndexOf(':');
		const hasDelimiter = delimeterIndex > -1;

		const name = hasDelimiter
			? parent.name.slice(delimeterIndex + 1).trim()
			: parent.name.replace(/^\[\w\w\]\s/, '');

		parent.name = hasDelimiter
			? parent.name.slice(0, delimeterIndex).trim()
			: parent.name;

		const newTask: TaskEntry = {
			...parent,
			id: this.generateId(),
			subEntries: undefined,
			name,
			parentId
		};

		parent.endTime = parent.startTime;

		const childId = newTask.id;

		if (parent.subEntries) {
			parent.subEntries.push(childId);
		} else {
			parent.subEntries = [ childId ];
		}

		this.archive.set(newTask.id, newTask);

		return false;
	}

	appendTask(name?: string) {
		const root: TaskEntry = this.getNewTask(name);

		this.archive.set(root.id, root);
	}

	createSubTask(parentId: string, name?: string) {
		const parentTask = this.archive.get(parentId);

		if (!parentTask) {
			// TODO Обработка ошибок. Возможно, уведомление
			return;
		}

		if (!parentTask.subEntries) {
			parentTask.subEntries = [];
		}

		const subTask = this.getNewTask(name);
		subTask.parentId = parentId;
		parentTask.subEntries.unshift(subTask.id);

		this.archive.set(subTask.id, subTask);
	}

	unparentTask(taskId: string) {
		const task = this.archive.get(taskId);

		if (task && task.parentId) {
			const parentTask = this.archive.get(task.parentId);
			if (!parentTask) return;

			parentTask.subEntries = parentTask.subEntries?.filter(id => taskId !== id);
			delete task.parentId;
		}
	}

	isTaskSubOf(taskId: string, parentId: string) {
		const target = this.archive.get(taskId);

		if (!target) {
			return false;
		}

		return target.parentId === parentId;
	}

	deleteSubtasksById(id: string) {
		const parentTask = this.archive.get(id);

		if (!parentTask) {
			// TODO Обработка ошибок. Возможно, уведомление
			return;
		}

		parentTask.subEntries?.forEach(subId => this.deleteTaskById(subId));
	}

	deleteTaskById(id: string) {
		this.archive.delete(id);
	}

	endTaskById(id: string) {
		const task = this.archive.get(id);

		if (task) {
			task.endTime = task.endTime || isoNow();
		}
	}

	endAllTasks() {
		for (const task of this.getFlatRunningTasks()) {
			task.endTime = isoNow();
		}
	}

	updateTaskById(id: string, newTask: TaskForm) {
		const task = this.archive.get(id);

		if (task) {
			task.name = this.getTaskName(newTask.name);
			task.startTime = newTask.startTime;
			task.endTime = newTask.endTime;
		}
	}

	intersectionDuration(prevTask: TaskEntry, nextTask: TaskEntry): number {
		const startPrev = Date.parse(prevTask.startTime);
		const endPrev = Date.parse(prevTask.endTime || isoNow());
		const startNew = Date.parse(nextTask.startTime);
		const endNew = Date.parse(nextTask.endTime || isoNow());

		if (startPrev <= startNew && endNew <= endPrev) {
			return startPrev - endPrev;
		}

		if (startNew <= startPrev && endPrev <= endNew) {
			return startNew - endNew;
		}

		if (startPrev <= startNew && endPrev <= endNew) {
			return startPrev - endNew;
		}

		if (startNew <= startPrev && endNew <= endPrev) {
			return startNew - endPrev;
		}

		return 0;
	}

	getCurrentTasksDuration(): number {
		return 0;
	}

	getOverallRunningDuration(): number {
		return 0;
	}

	getTasksDuration(parentId: string): number {
		const tasksList = this.archive.get(parentId);

		if (!tasksList) {
			return 0;
		}

		return tasksList.subEntries?.reduce((total, id) => {
			const task = this.archive.get(id);

			if (task) {
				return total + calcOwnDuration(task.startTime, task.endTime);
			}

			return total;
		}, 0) || 0;
	}
}
