
import { Plugin, WorkspaceLeaf } from "obsidian";
import { Storage } from "./storage";
import { TimerModel } from "./model";
import { TaskTimerView, VIEW_TYPE_TASK_TIMER } from "./view";
import TaskController from './controller';

export default class TaskTimerPlugin extends Plugin {
	private storage!: Storage;
	private model!: TimerModel;
	private controller!: TaskController;

	async onload() {
		this.controller = new TaskController(this.app);

		this.registerView(
			VIEW_TYPE_TASK_TIMER,
			(leaf: WorkspaceLeaf) => {
				const view = new TaskTimerView(leaf, this.controller)
				this.controller.initView(view);

				return view;
			}
		);

		this.addRibbonIcon("clock", "Task Timer", () => this.activateView());
		this.addCommand({ id: "open-task-timer", name: "Открыть Task Timer", callback: () => this.activateView() });
	}

	async onunload() {
		this.app.workspace.getLeavesOfType(VIEW_TYPE_TASK_TIMER).forEach(leaf => leaf.detach());
	}

	async activateView() {
		const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_TASK_TIMER);
		if (leaves.length === 0) {
			await this.app.workspace.getRightLeaf(false).setViewState({ type: VIEW_TYPE_TASK_TIMER, active: true });
		}
		this.app.workspace.revealLeaf(this.app.workspace.getLeavesOfType(VIEW_TYPE_TASK_TIMER)[0]);
	}
}
