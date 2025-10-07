
import { ItemView, WorkspaceLeaf, Setting, ButtonComponent, TextComponent, MarkdownRenderer } from "obsidian";
import { TimerModel, TaskEntry } from "./model";
import { formatDuration } from "./utils";
import { ARCHIVE_PATH, Storage } from "./storage";
import { ModelSubscribeKeys, ViewSubscribeKeys } from './types';
import { Listener } from './utils';
import TaskController from './controller';
import { calcOwnDuration } from './utils';
import { isoNow, parseISO } from './utils';
import { formatDate } from './utils';
import { isSameDay } from './utils';
import { formatTime } from './utils';

export const VIEW_TYPE_TASK_TIMER = "task-timer-view";

export class TaskTimerView extends ItemView {
	input!: TextComponent;
	startBtn!: ButtonComponent;
	endBtn!: ButtonComponent;
	subBtn!: ButtonComponent;

	private interval?: number;

	private runningListEl!: HTMLElement;
	private archiveTableEl!: HTMLElement;

	private headerLabelEl!: HTMLElement;
	private controlsEl!: HTMLElement;

	private listener = new Listener<ViewSubscribeKeys>();

	constructor(
		leaf: WorkspaceLeaf, 
		private controller: TaskController
	) {
		super(leaf);
	}

	subscribe(name: ViewSubscribeKeys, callback: Function) {
		this.listener.subscribe(name, callback);
	}

	unsubscribe(name: ViewSubscribeKeys, callback: Function) {
		this.listener.unsubscribe(name, callback);
	}

	notify(name: ViewSubscribeKeys) {
		this.listener.notify(name);
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
    this.renderRunningList();
		this.renderArchiveTable();
	}

	getContainer(): HTMLElement {
		const container = this.containerEl;
		container.empty();
		return container;
	}

	renderBaseElements() {
		const container = this.getContainer();

    this.headerLabelEl = container.createEl("h2", { text: "Task Timer" });
		this.controlsEl = container.createDiv();

    container.createEl("h3", { text: "Запущенные сейчас задачи" });
    this.runningListEl = container.createDiv({ cls: "task-timer-running" });
		this.archiveTableEl = container.createDiv({ cls: "task-timer-archive" });
	}

	renderControlElements() {
		const container = this.controlsEl;

    const controls = new Setting(container);
    this.input = new TextComponent(controls.controlEl).setPlaceholder("Например: Подготовка отчёта");

    this.startBtn = new ButtonComponent(controls.controlEl)
			.setIcon('play')
			.setTooltip('Новая задача')
      .onClick(async () => {
				this.controller.startNewTask(this.readAndClearInputValue());
      });

    this.endBtn = new ButtonComponent(controls.controlEl)
			.setIcon('pause')
			.setTooltip('Завершение задач')
      .onClick(async () => {
        this.controller.endAllTasks();
      });

    this.subBtn = new ButtonComponent(controls.controlEl)
			.setIcon('list-video')
			.setTooltip('Дополнительная задача')
      .onClick(async () => {
				this.controller.appendTask(this.readAndClearInputValue());
      });
	}

	async runInterval() {
		this.updateView();
    this.interval = window.setInterval(this.updateView.bind(this), 1000);
		this.registerInterval(this.interval);
	}

	async onOpen() {
		this.notify(ViewSubscribeKeys.Open);

		const container = this.getContainer();
		container.classList.add('task-timer-container');

		this.renderBaseElements();
		this.renderControlElements();
		this.runInterval();
	}

	async onClose() {
		this.notify(ViewSubscribeKeys.Close);
		if (this.interval) window.clearInterval(this.interval);
	}

	private renderRunningList() {
		const container = this.runningListEl;
		container.empty();

		if (!this.controller.runningTasks.length) {
			container.createEl("div", { text: "Нет активных задач" });
			return;
		}

		const rootRow = container.createDiv({ cls: "tt-row" });

		this.controller.runningTasks.forEach(task => {
			rootRow.createDiv({ 
				text: `${task.name} — ${formatDuration(calcOwnDuration(task.startTime, isoNow()))}`
			});
		});
	}

	private renderArchiveTable() {
		const container = this.archiveTableEl;
		container.empty();

		const renderRow = (entry: TaskEntry, depth = 0) => {
			const body = container.createDiv({
				cls: 'task-timer-done-tasks'
			});

			const formattedDate = isSameDay(entry) 
				? `${formatDate(entry.startTime)} - ${formatTime(entry.endTime)}`
				: `${formatDate(entry.startTime)} - ${formatDate(entry.endTime) || '-'}`;

			body.createEl('hr');

			body.createEl('h3', {
				text: entry.name
			});


			body.createEl('p', {
				text: formattedDate
			});


			// const tr = tbody.createEl("tr");
			// const nameTd = tr.createEl("td");
			// nameTd.style.paddingLeft = `${depth * 20}px`;
			// nameTd.setText(entry.name);

			// const startTd = tr.createEl("td", { text: entry.startTime ? new Date(entry.startTime).toLocaleString() : "" });
			// const endTd = tr.createEl("td", { text: entry.endTime ? new Date(entry.endTime).toLocaleString() : "" });

			// const durationMs = (() => {
			// 	const start = entry.startTime ? new Date(entry.startTime).getTime() : 0;
			// 	const end = entry.endTime ? new Date(entry.endTime).getTime() : Date.now();
			// 	return Math.max(0, end - start);
			// })();
			// const durTd = tr.createEl("td", { text: formatDuration(durationMs) });

			// const ctrlTd = tr.createEl("td");
			// const contBtn = ctrlTd.createEl("button", { text: "Продолжить" });
			// const renBtn = ctrlTd.createEl("button", { text: "Переименовать" });
			// const delBtn = ctrlTd.createEl("button", { text: "Удалить" });
			// const editBtn = ctrlTd.createEl("button", { text: "Изменить время" });

			// for (const b of [contBtn, renBtn, delBtn, editBtn]) {
			// 	b.onclick
			// 	b.setAttr("disabled", "true");
			// 	b.title = "Функционал будет добавлен позже";
			// }

			// if (entry.subEntries?.length) {
			// 	for (const child of entry.subEntries) renderRow(child, depth + 1);
			// }
		};

		for (const e of this.controller.tasks) renderRow(e, 0);
	}
}
