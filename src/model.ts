import { Archive, TaskEntry, TaskForm } from './types';
import { isoNow } from './utils';

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
		return Array.from(this.archive.values()).sort((a, b) => {
			if (a.startTime < b.startTime) return 1;
			return -1;
		});
	}

	getFlatRunningTasks(): TaskEntry[] {
		return this.getFlatTasks().filter(({ endTime }) => !endTime);
	}

	getTaskName(name?: string): string {
    if (!name?.trim()) name = `Block ${this.getFlatTasks().length + 1}`;

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

	appendTask(name: string) {
    const root: TaskEntry = this.getNewTask(name);

    this.archive.set(root.id, root);
	}

  endTaskById(id: string) {
		const task = this.archive.get(id);

		if (task) {
			task.endTime = isoNow();	
		}
  }

	endAllTasks() {
		for(const task of this.getFlatRunningTasks()) {
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
