
import { ItemView, WorkspaceLeaf, Setting, ButtonComponent, TextComponent, setIcon, Platform } from "obsidian";
import TaskController from './controller';
import { formatTime, formatDuration, calcOwnDuration, isTaskDone, isTaskSub } from './utils';
import { TaskEntry } from "./types";
import { EditTaskModal } from './modal';

export const VIEW_TYPE_TASK_TIMER = "task-timer-view";

export class TaskTimerView extends ItemView {
	input!: TextComponent;
	startBtn!: ButtonComponent;
	endBtn!: ButtonComponent;
	subBtn!: ButtonComponent;

	private interval?: number;
	private archiveTableEl!: HTMLElement;
	private controlsEl!: HTMLElement;
	private editModalInstance: EditTaskModal | null;
	opened = false;

	constructor(
		leaf: WorkspaceLeaf,
		private controller: TaskController
	) {
		super(leaf);
	}

	getViewType(): string { return VIEW_TYPE_TASK_TIMER; }
	getDisplayText(): string { return "Task Timer"; }
	getIcon(): string { return "clock"; }

	getContainer(): HTMLElement {
		const container = this.containerEl;
		container.empty();
		return container;
	}

	openEditModal(task: TaskEntry) {
		if (!this.editModalInstance) {
			this.editModalInstance = new EditTaskModal(this.controller, this.app);
		}

		this.editModalInstance.openModal(task);
	}

	renderView() {
		this.renderBaseElements();
		this.renderControlElements();
		this.runInterval();

		if (Platform.isDesktop) {
			window.setTimeout(() => {
				this.input.inputEl.focus();
			});
		}
	}

	private async runInterval() {
		this.updateView();
		this.interval = window.setInterval(() => {
			this.updateView();
		}, 1000);
		this.registerInterval(this.interval);
	}

	async onOpen() {
		const container = this.getContainer();
		container.classList.add('task-timer-container');

		this.opened = true;
		this.controller.openView();
	}

	async onClose() {
		this.opened = false;

		if (this.interval) window.clearInterval(this.interval);
	}

	private readAndClearInputValue(): string {
		const value = this.input.getValue();
		this.input.setValue('');

		return value;
	}

	updateView() {
		this.renderArchiveTable();
	}

	private renderBaseElements() {
		const container = this.getContainer();

		new Setting(container)
			.addDropdown(dropdown => {
				const options = this.controller
					.getPluginFiles()
					.reduce<Record<string, string>>(
						(options, name) => {
							options[name] = name;

							return options;
						}, {}
					);

				dropdown
					.addOptions(options)
					.setValue(this.controller.getArchiveFileName())
					.onChange(async (value) => {
						this.controller.updateArchiveUrl(value);
					});
			});

		this.controlsEl = container.createDiv();
		this.archiveTableEl = container.createDiv({ cls: "task-timer-archive" });
	}

	private renderControlElements() {
		const container = this.controlsEl;

		const controls = new Setting(container);
		this.input = new TextComponent(controls.controlEl)
			.setPlaceholder("E.g. Buy a milk")

		this.input.inputEl.addEventListener("keyup", ({ key }) => {
			if (key === 'Enter') {
				this.controller.appendTask(this.readAndClearInputValue());
			}
		});

		this.input.inputEl.classList.add('task-timer-input');

		this.subBtn = new ButtonComponent(controls.controlEl)
			.setIcon('play')
			.setTooltip('Start task')
			.setClass('task-timer-button')
			.onClick(async () => {
				this.controller.appendTask(this.readAndClearInputValue());
			});

		this.endBtn = new ButtonComponent(controls.controlEl)
			.setIcon('pause')
			.setTooltip('Stop all tasks')
			.setClass('task-timer-button')
			.onClick(async () => {
				this.controller.endAllTasks();
			});

		this.startBtn = new ButtonComponent(controls.controlEl)
			.setIcon('step-forward')
			.setTooltip('Stop all and start task')
			.setClass('task-timer-button')
			.onClick(async () => {
				this.controller.startNewTask(this.readAndClearInputValue());
			});
	}

	private renderTableAction(container: HTMLElement, task: TaskEntry) {
		const bottomRow = container.createDiv({
			cls: 'task-timer-item__date-wrap'
		})
		const controls = new Setting(bottomRow);

		const playButton = new ButtonComponent(controls.controlEl)
			.setClass('task-timer-action');

		if (!isTaskSub(task)) {
			new ButtonComponent(controls.controlEl)
				.setClass('task-timer-action')
				.setIcon('step-forward')
				.setTooltip('Start sub task')
				.onClick(() => {
					this.controller.startSubTask(task.id, this.readAndClearInputValue());
				});
		}

		if (isTaskDone(task)) {
			playButton.setIcon('play')
				.setTooltip('Start task with such name')
				.onClick(() => {
					this.controller.appendTask(task.name);
				});
		} else {
			playButton.setIcon('pause')
				.setTooltip('Stop task')
				.onClick(() => {
					this.controller.endTask(task.id);
				});
		}

		new ButtonComponent(controls.controlEl)
			.setClass('task-timer-button')
			.setIcon('pencil')
			.setTooltip('Edit task')
			.onClick(() => {
				this.openEditModal(task);
			});
	}

	private renderTime(container: HTMLElement, task: TaskEntry) {
		const dateWrapperEl = container.createEl('p', {
			cls: 'task-timer-item__time'
		});

		dateWrapperEl.createSpan({
			text: `${formatTime(task.startTime)} - `
		});

		dateWrapperEl.createSpan({
			text: formatDuration(calcOwnDuration(task.startTime, task.endTime)),
			cls: 'task-timer-item__date'
		});
	}

	private renderLabel(container: HTMLElement, task: TaskEntry) {
		const spanLabel = container.createDiv({
			cls: 'task-timer-item__label-text'
		});

		if (!isTaskSub(task)) {
			setIcon(spanLabel.createSpan({
				cls: 'task-timer-item__label-icon'
			}), isTaskDone(task) ? 'circle-check-big' : 'loader-circle');
		}

		spanLabel.createEl('h3', {
			text: task.name,
			cls: 'task-timer-item__label'
		});
	}

	private renderRow(task: TaskEntry) {
		const container = this.archiveTableEl;
		const body = container.createDiv({
			cls: [
				'task-timer-item',
				isTaskDone(task)
					? 'task-timer-item--done'
					: 'task-timer-item--running',
				isTaskSub(task) 
					? 'task-timer-item--subtask'
					: ''
			]
		});

		this.renderLabel(body, task);
		this.renderTime(body, task);
		this.renderTableAction(body, task);

		this.controller
			.populateSubtasks(task)
			.forEach(task => this.renderRow(task));
	}

	private renderArchiveTable() {
		const container = this.archiveTableEl;
		container.empty();

		for (const task of this.controller.getTasks()) {
			this.renderRow(task);
		}
	}
}
