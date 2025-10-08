
import { ItemView, WorkspaceLeaf, Setting, ButtonComponent, TextComponent, setIcon, Platform } from "obsidian";
import TaskController from './controller';
import { formatTime, formatDuration, calcOwnDuration } from './utils';
import { TaskEntry } from "./types";

export const VIEW_TYPE_TASK_TIMER = "task-timer-view";

export class TaskTimerView extends ItemView {
	input!: TextComponent;
	startBtn!: ButtonComponent;
	endBtn!: ButtonComponent;
	subBtn!: ButtonComponent;

	private interval?: number;
	private archiveTableEl!: HTMLElement;
	private controlsEl!: HTMLElement;
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

	readAndClearInputValue(): string {
		const value =  this.input.getValue();
		this.input.setValue('');

		return value;
	}

	updateView() {
		this.renderArchiveTable();
	}

	getContainer(): HTMLElement {
		const container = this.containerEl;
		container.empty();
		return container;
	}

	renderBaseElements() {
		const container = this.getContainer();
		
		this.controlsEl = container.createDiv();
		this.archiveTableEl = container.createDiv({ cls: "task-timer-archive" });
	}

	renderControlElements() {
		const container = this.controlsEl;

    const controls = new Setting(container);
    this.input = new TextComponent(controls.controlEl)
			.setPlaceholder("E.g. Buy a milk")

		this.input.inputEl.addEventListener("keyup", ({key}) => {
			if (key === 'Enter') { 
				this.controller.appendTask(this.readAndClearInputValue());
			}
		});

		this.input.inputEl.classList.add('task-timer-input');
		this.input.inputEl.setAttr('focus', true);

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

	async runInterval() {
		this.updateView();
    this.interval = window.setInterval(() => {
			this.updateView();
		}, 1000);
		this.registerInterval(this.interval);
	}

	renderView() {
		this.renderBaseElements();
		this.renderControlElements();
		this.runInterval();

		if(Platform.isDesktop) {
			window.setTimeout(() => {
				this.input.inputEl.focus();
			});
		}
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

	private renderArchiveTable() {
		const container = this.archiveTableEl;
		container.empty();

		const renderRow = (task: TaskEntry) => {
			const isDone = !!task.endTime;

			const body = container.createDiv({
				cls: 'task-timer-item'
			});

			const labelEl = body.createDiv({
				cls: [
					'task-timer-item__label-wrap',
					isDone 
						? 'task-timer-item__label-wrap--done' 
						: 'task-timer-item__label-wrap--running'
				]
			});

			setIcon(labelEl.createSpan(), isDone ? 'circle-check-big' : 'loader-circle')
			
			labelEl.createEl('h3', {
				text: task.name,
				cls: 'task-timer-item__label'
			});

			createTime(labelEl);

			body.createSpan({
				text: formatDuration(calcOwnDuration(task.startTime, task.endTime)),
				cls: 'task-timer-item__date'
			});

			body.createEl('hr', { cls: 'task-timer-item__delimiter' });

			function createTime(container: HTMLElement) {
				const dateWrapperEl = container.createEl('p', {
					cls: 'task-timer-item__time'
				});

				dateWrapperEl.createSpan({
					text: formatTime(task.startTime)
				});

				if (isDone) {
					dateWrapperEl.createSpan({
						text: ' - ',
					});

					dateWrapperEl.createSpan({
						text: formatTime(task.endTime)
					});
				}
			}
		};

		for (const e of this.controller.getTasks()) renderRow(e);
	}
}
