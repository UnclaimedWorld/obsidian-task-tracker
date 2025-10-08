export type TaskEntry = {
	id: string;
  name: string;
  startTime: string;         // ISO
  endTime?: string | null;   // ISO
};

export type TimekeepTaskEntry = {
  name: string;
  startTime: string;         // ISO
  endTime?: string | null;   // ISO
  subEntries: TimekeepTaskEntry[] | null;
};


export type Archive = Map<string, TaskEntry>;
