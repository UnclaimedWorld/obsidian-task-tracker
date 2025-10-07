export enum ModelSubscribeKeys {
	Update = 'Update'
}

export enum ViewSubscribeKeys {
	Open = 'Open',
	Close = 'Close',
}

export type TaskEntry = {
	id: string;
  name: string;
  startTime: string;         // ISO
  endTime?: string | null;   // ISO
  subEntries?: string[];
};

export type Archive = Map<string, TaskEntry>;
