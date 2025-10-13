import { Archive, TaskEntry, TaskForm } from './types';
import { isoNow, sortTasks } from './utils';

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

	getNewTask(name?: string): TaskEntry {
		const id = Date.now() + 'c';

		return {
			id,
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
			task.endTime = isoNow();
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
}
