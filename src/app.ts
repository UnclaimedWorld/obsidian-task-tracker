// DONE
// Task creation
// Task edit
// Task delete
// Sub task
// Select custom archives

// TODO
// Settings
// Custom file path

// Maybe
// Tags. I don't know. Seems sub tasks can solve this problem with tags like [SC], [WK].

import { Platform, Plugin, WorkspaceLeaf } from "obsidian";
import { TaskTimerView, VIEW_TYPE_TASK_TIMER } from "./view";
import TaskController from './controller';

export default class TaskTimerPlugin extends Plugin {
	private controller!: TaskController;

	async onload() {
		this.controller = new TaskController(this.app);

		this.app.workspace.onLayoutReady(() => {
			this.controller.loadModel();
		});

		this.registerView(
			VIEW_TYPE_TASK_TIMER,
			(leaf: WorkspaceLeaf) => {
				const view = new TaskTimerView(leaf, this.controller);

				this.controller.setViewOnce(view);

				return view;
			}
		);

		this.addRibbonIcon(
			"clock",
			"Task Timer",
			() => this.activateView()
		);

		this.addCommand({
			id: "open-task-timer",
			name: "Open Task Timer",
			callback: () => this.activateView()
		});
	}

	async onunload() {
		this.app.workspace.getLeavesOfType(VIEW_TYPE_TASK_TIMER).forEach(leaf => leaf.detach());
	}

	async activateView() {
		const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_TASK_TIMER);
		if (leaves.length === 0) {
			let leaf = this.app.workspace.getRightLeaf(false);
			if (!leaf) {
				leaf = this.app.workspace.getLeaf(!Platform.isDesktop);
			}

			await leaf.setViewState({ type: VIEW_TYPE_TASK_TIMER, active: true });
		}

		this.app.workspace.revealLeaf(this.app.workspace.getLeavesOfType(VIEW_TYPE_TASK_TIMER)[0]);
	}
}
