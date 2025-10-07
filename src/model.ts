import { Archive, ModelSubscribeKeys, TaskEntry } from './types';
import { Listener } from './utils';

export class TimerModel extends Listener<ModelSubscribeKeys> {
  archive: Archive;
	runningTasks: Archive;
  private blockCounter = 1;

	constructor() {
		super();

		this.archive = new Map();
		this.runningTasks = new Map();
	}

	initModel(archive: TaskEntry[]) {
		archive.forEach(task => {
			this.archive.set(task.id, task);

			if (!task.endTime) {
				this.runningTasks.set(task.id, task);
			}
		});
	}

	get flatTasks(): TaskEntry[] {
		return Array.from(this.archive.values()).sort((a, b) => {
			if (a.startTime < b.startTime) return 1;
			return -1;
		});
	}

	get flatRunningTasks(): TaskEntry[] {
		return Array.from(this.runningTasks.values());
	}

	getNowTime() {
		return new Date().toISOString();
	}

	getNewTask(name?: string): TaskEntry {
		const counter = this.blockCounter++;
		const id = Date.now() + 'counter';

    if (!name?.trim()) name = `Block ${counter}`;

		return {
			id,
			name, 
			startTime: this.getNowTime(), 
			endTime: null, 
			subEntries: [] 
		};
	}

	appendTask(name: string) {
    const root: TaskEntry = this.getNewTask(name);

    this.archive.set(root.id, root);
    this.runningTasks.set(root.id, root);
		this.notify(ModelSubscribeKeys.Update);
	}

  endTaskById(id: string) {
		const task = this.runningTasks.get(id);

		if (task) {
			task.endTime = this.getNowTime();	
		}

		this.notify(ModelSubscribeKeys.Update);
  }

	endAllTasks() {
		let changed = false;

		for(const value of this.flatRunningTasks) {
			value.endTime = this.getNowTime();
			changed = true;
		}

		this.runningTasks.clear();

		if (changed) this.notify(ModelSubscribeKeys.Update);
	}

  renameTaskById(id: string, newName: string) {
		const task = this.archive.get(id);

		if (task) {
			task.name = newName.trim();	
		}

		this.notify(ModelSubscribeKeys.Update);
  }

	intersectionDuration(prevTask: TaskEntry, nextTask: TaskEntry): number {
		const startPrev = Date.parse(prevTask.startTime);
		const endPrev = Date.parse(prevTask.endTime || this.getNowTime());
		const startNew = Date.parse(nextTask.startTime);
		const endNew = Date.parse(nextTask.endTime || this.getNowTime());

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
