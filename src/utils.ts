import { TaskEntry } from './types';

export function formatDuration(ms: number): string {
  if (ms < 0 || !Number.isFinite(ms)) return "0:00:00";
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${h}:${pad(m)}:${pad(s)}`;
}

export function isoNow(): string {
  return new Date().toISOString();
}

export function parseISO(s?: string | null): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

export function isSameDay(entry: TaskEntry): boolean {
	return entry.startTime.slice(0, 10) === entry.endTime?.slice(0, 10);
}

export function formatTime(date?: string | null): string {
	if (!date) return '';

	return date.slice(11, 19);
}

export function formatDate(date?: string | null): string {
	if (!date) return '';

	return `${date.slice(0, 10)} ${formatTime(date)}`.trim();
}

export function calcOwnDuration(startISO?: string | null, endISO?: string | null): number {
  const start = parseISO(startISO)?.getTime();
  const end = (endISO ? parseISO(endISO) : new Date())?.getTime();
  if (!start || !end) return 0;
  return Math.max(0, end - start);
}

export class Listener<TKey extends string> {
	private subscribers: Record<TKey, Set<Function>> = {} as Record<TKey, Set<Function>>;

	subscribe(name: TKey, callback: Function) {
		if (!(name in this.subscribers)) {
			this.subscribers[name] = new Set();
		}
		this.subscribers[name].add(callback);
	}

	unsubscribe(name: TKey, callback: Function) {
		if (this.subscribers[name].has(callback)) {
			this.subscribers[name].delete(callback);
		}
	}

	notify(name: TKey) {
		this.subscribers[name]?.forEach(callback => callback());
	}
}
