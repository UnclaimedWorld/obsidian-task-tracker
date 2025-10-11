export type TaskEntry = {
	id: string;
	name: string;
	startTime: string;         // ISO
	endTime?: string | null;   // ISO
	subEntries?: string[];
	parentId?: string;
};

export type TaskForm = {
	name: string;
	startTime: string;
	endTime: string;
}

export type Archive = Map<string, TaskEntry>;
