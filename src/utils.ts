import { TaskEntry } from './types';

export const fileNameRegex = /\d{4}-\d{2}-\d{2}_CUSTOM\.md/;

export function pad(num?: number | null): string {
	if (!num) return '00';

	return num.toString().padStart(2, '0');
}

export function formatDuration(ms: number): string {
	if (ms < 0 || !Number.isFinite(ms)) return "00s";
	const totalSec = Math.floor(ms / 1000);
	const h = Math.floor(totalSec / 3600);
	const m = Math.floor((totalSec % 3600) / 60);
	const s = totalSec % 60;

	let string = '';

	if (h) {
		string += `${h}h`;
	}

	if (m) {
		string += ` ${m}m`;
	}

	string += ` ${pad(s)}s`;

	return string.trim();
}

export function isoNow(): string {
	return new Date().toISOString();
}

export function parseISO(s?: string | null): Date | null {
	if (!s) return null;
	const d = new Date(s);
	return isNaN(d.getTime()) ? null : d;
}

export function toISO(s?: string | null): string {
	const parsed = parseISO(s);
	return parsed ? parsed.toISOString() : isoNow();
}

export function isSameDay(entry: TaskEntry): boolean {
	return entry.startTime.slice(0, 10) === entry.endTime?.slice(0, 10);
}

export function formatTime(date?: string | null): string {
	if (!date) return '';

	const parsed = parseISO(date);

	return `${pad(parsed?.getHours())}:${pad(parsed?.getMinutes())}:${pad(parsed?.getSeconds())}`;
}

export function calcOwnDuration(startISO?: string | null, endISO?: string | null): number {
	const start = parseISO(startISO)?.getTime();
	const end = (endISO ? parseISO(endISO) : new Date())?.getTime();
	if (!start || !end) return 0;
	return Math.max(0, end - start);
}

export function formatDate(format: string, date: string): string {
	return window.moment(date).format(format);
}

export function isFileForPlugin(fileName: string): boolean {
	const match = fileName.match(fileNameRegex);

	return !!match;
}

export function isTaskDone(task: TaskEntry): boolean {
	return !!task.endTime;
}

export function isTaskSub(task: TaskEntry): boolean {
	return !!task.parentId;
}

export function isTaskProject(task: TaskEntry): boolean {
	return task.endTime === task.startTime;
}

export function sortTasks(tasks: TaskEntry[]) {
	tasks.sort((a, b) => {
		if (a.startTime < b.startTime) return 1;
		return -1;
	});
}
