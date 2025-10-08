import { Archive, TaskEntry } from './types';
import { isoNow } from './utils';

export class TimerModel {
  archive: Archive;

	constructor() {
		this.archive = new Map();
	}

	initModel(archive: TaskEntry[]) {
		archive.forEach(task => {
			this.archive.set(task.id, task);
		});
	}

	get flatTasks(): TaskEntry[] {
		return Array.from(this.archive.values()).sort((a, b) => {
			if (a.startTime < b.startTime) return 1;
			return -1;
		});
	}

	get flatRunningTasks(): TaskEntry[] {
		return this.flatTasks.filter(({ endTime }) => !endTime);
	}

	getNewTask(name?: string): TaskEntry {
		const id = Date.now() + 'c';

    if (!name?.trim()) name = `Block ${this.flatTasks.length + 1}`;

		console.log(isoNow());

		return {
			id,
			name, 
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
		for(const task of this.flatRunningTasks) {
			task.endTime = isoNow();
		}
	}

  renameTaskById(id: string, newName: string) {
		const task = this.archive.get(id);

		if (task) {
			task.name = newName.trim();	
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
