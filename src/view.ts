
import { ItemView, WorkspaceLeaf, Setting, ButtonComponent, TextComponent, setIcon, Platform, ExtraButtonComponent } from "obsidian";
import TaskController from './controller';
import { formatTime, formatDuration, calcOwnDuration, isTaskDone, isTaskSub, isTaskProject } from './utils';
import { TaskEntry } from "./types";
import { EditTaskModal } from './modal';

export const VIEW_TYPE_TASK_TIMER = "task-timer-view";
const TASK_ID_ATTR = 'data-task-id';

export class TaskTimerView extends ItemView {
	input!: TextComponent;
	endBtn!: ButtonComponent;
	subBtn!: ButtonComponent;

	private interval?: number;
	private archiveTableEl!: HTMLElement;
	private controlsEl!: HTMLElement;
	private editModalInstance: EditTaskModal | null;
	private fileSelector: Setting | null = null;
	opened = false;

	private taskTimeEls: Map<string, HTMLElement> = new Map();

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
		this.renderArchiveTable();
		this.runInterval();

		if (Platform.isDesktop) {
			window.setTimeout(() => {
				this.input.inputEl.focus();
			});
		}
	}

	private async runInterval() {
		this.interval = window.setInterval(() => {
			this.updateCount();
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
		this.taskTimeEls = new Map();

		if (this.interval) window.clearInterval(this.interval);
	}

	private readAndClearInputValue(): string {
		const value = this.input.getValue();
		this.input.setValue('');

		return value;
	}

	updateView() {
		this.renderArchiveTable();
		this.endBtn.setDisabled(!this.controller.getRunningTasks().length);
	}

	updateCount() {
		this.taskTimeEls.forEach((timeEl, key) => {
			const task = this.controller.getTaskById(key);

			if (task) {
				timeEl.innerText = this.renderTimeText(task);
			}
		});
	}

	private renderFileSelector() {
		const container = this.getContainer();

		if (this.fileSelector) {
			this.fileSelector.clear();
		}

		this.fileSelector = new Setting(container)
			.setClass('task-timer-file-control')
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
			})
			.addButton(reloadButton => {
				const button = reloadButton.buttonEl;
				
				reloadButton
					.setTooltip('Reload plugin data')
					.setClass('task-timer-reload')
					.setIcon('refresh-cw')
					.onClick(async () => {
					await this.controller.reloadPluginData();
					window.clearInterval(this.interval);
					this.renderView();
				});

				button.type = 'button';
			})
	}

	private renderBaseElements() {
		const container = this.getContainer();

		this.renderFileSelector();
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
	}

	private renderTableAction(container: HTMLElement, task: TaskEntry) {
		const bottomRow = container.createDiv({
			cls: 'task-timer-item__actions'
		})
		const controls = new Setting(bottomRow);
		const { parentId } = task;

		if (!isTaskDone(task)) {
			new ButtonComponent(controls.controlEl)
				.setClass('task-timer-action')
				.setIcon('pause')
				.setTooltip('Stop task')
				.onClick(() => {
					this.controller.endTask(task.id);
				});
		} else {
			if (!isTaskSub(task)) {
				new ButtonComponent(controls.controlEl)
					.setClass('task-timer-action')
					.setIcon('step-forward')
					.setTooltip('Start sub task')
					.onClick(() => {
						this.controller.startSubTask(task.id, this.readAndClearInputValue());
					});
			} else if (parentId) {
				new ButtonComponent(controls.controlEl)
					.setClass('task-timer-action')
					.setIcon('repeat-1')
					.setTooltip('Repeat sub task')
					.onClick(() => {
						this.controller.startSubTask(parentId, task.name);
					});
			}
		}


		new ButtonComponent(controls.controlEl)
			.setClass('task-timer-button')
			.setIcon('pencil')
			.setTooltip('Edit task')
			.onClick(() => {
				this.openEditModal(task);
			});

		const dragComponent = new ExtraButtonComponent(controls.controlEl)

		if (!isTaskProject(task)) {
			const el = dragComponent.extraSettingsEl;

			dragComponent
				.setIcon('grip-vertical')
				.setTooltip('Hold and drag to set parent');
			el.onpointerdown = this.getDragHandler(task);
		} else {
			dragComponent
				.setIcon('folders')
				.setDisabled(true)
				.setTooltip('Can\'t change parent on project')
		}
	}

	private getDragHandler(task: TaskEntry) {
		return (startEvent: PointerEvent) => {
			let element: HTMLDivElement | null = null;
			let moveHandler: ((event: PointerEvent) => void) | null = null;
			let dragScreen: HTMLDivElement | null = null;
			let newParentId: string | null;

			const dragTimeout = setTimeout(() => {
				const updatePosition = (event: PointerEvent) => {
					if (element) {
						element.style.left = event.clientX - (element.offsetWidth / 2) + 'px';
						element.style.top = event.clientY - (element.offsetHeight / 2) + 10 + 'px';
					}
				};

				moveHandler = (moveEvent: PointerEvent) => {
					newParentId = document
						.elementFromPoint(moveEvent.clientX, moveEvent.clientY)
						?.closest(`[${TASK_ID_ATTR}]`)
						?.getAttr(TASK_ID_ATTR)
						|| null;
					const isNotSub = newParentId && !this.controller.isTaskSubOf(task.id, newParentId);
					const isNotSame = task.id !== newParentId;

					if (!dragScreen) {
						dragScreen = document.createElement('div');
					}

					updatePosition(moveEvent);
					
					if (isNotSub && isNotSame) {
						const hoveredTask = document.querySelector(`[${TASK_ID_ATTR}="${newParentId}"]`);

						if (!hoveredTask) {
							dragScreen.style.display = 'none';
							return;
						}

						const hoveredRect = hoveredTask.getBoundingClientRect();

						document.body.appendChild(dragScreen);

						dragScreen.className = 'task-timer-drag-screen';
						dragScreen.style.display = '';
						dragScreen.style.left = hoveredRect.x + 'px';
						dragScreen.style.top = hoveredRect.y + 'px';
						dragScreen.style.width = hoveredRect.width + 'px';
						dragScreen.style.height = hoveredRect.height + 'px';
					} else {
						dragScreen.style.display = 'none';
						newParentId = null;
					}
				};


				element = document.createElement('div');
				element.className = 'task-timer-draggable-element';
				element.textContent = task.name;

				document.body.style.cursor = 'grab';
				document.body.appendChild(element);

				updatePosition(startEvent);
				window.addEventListener('pointermove', moveHandler);
			}, 150);

			window.addEventListener('pointerup', () => {
				if (moveHandler) {
					window.removeEventListener('pointermove', moveHandler);
				}

				dragScreen?.remove();
				element?.remove();
				clearTimeout(dragTimeout);
				document.body.style.cursor = '';

				if (newParentId) {
					this.controller.changeParent(task.id, newParentId);
					console.log(newParentId);
				}
			}, {
				once: true
			});
		};
	}

	private renderTime(container: HTMLElement, task: TaskEntry) {
		const dateWrapperEl = container.createEl('p', {
			cls: 'task-timer-item__time-wrap'
		});

		if (!isTaskProject(task)) {
			dateWrapperEl.createSpan({
				text: `${formatTime(task.startTime)} - `
			});
		}

		this.taskTimeEls.set(task.id, dateWrapperEl.createSpan({
			text: this.renderTimeText(task),
			cls: 'task-timer-item__time'
		}));
	}

	private renderTimeText(task: TaskEntry) {
		if (isTaskProject(task)) {
			return formatDuration(this.controller.getProjectDuration(task.id));
		}

		return formatDuration(calcOwnDuration(task.startTime, task.endTime))
	}

	private renderLabel(container: HTMLElement, task: TaskEntry) {
		const spanLabel = container.createDiv({
			cls: 'task-timer-item__label'
		});

		if (!isTaskSub(task)) {
			let icon = isTaskDone(task) ? 'circle-check-big' : 'loader-circle';

			const iconWrap = spanLabel.createSpan({
				cls: 'task-timer-item__label-icon'
			});
			
			if (isTaskProject(task)) {
				icon = this.controller.isProjectHidden(task.id) ? 'folder-closed' : 'folder';

				iconWrap.onclick = (event) => {
					this.controller.toggleProjectVisibility(task.id);
					event.stopPropagation();
				}
			}
			
			setIcon(iconWrap, icon);
		}

		spanLabel.createEl('h3', {
			text: task.name,
			cls: 'task-timer-item__label-text'
		});

		spanLabel.onclick = async () => {
			this.copyTaskName(task);
		};
	}

	copyTaskName(task: TaskEntry) {
		this.input.setValue(task.name);
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
					: '',
				isTaskProject(task)
					? 'task-timer-item--project'
					: '',
			],
			attr: {
				[TASK_ID_ATTR]: isTaskSub(task) && task.parentId ? task.parentId : task.id
			}
		});

		this.renderLabel(body, task);
		this.renderTime(body, task);
		this.renderTableAction(body, task);

		if (!this.controller.isProjectHidden(task.id)) {
			this.controller
				.populateSubtasks(task)
				.forEach(task => this.renderRow(task));
		}
	}

	renderArchiveTable() {
		const container = this.archiveTableEl;
		container.empty();
		this.taskTimeEls = new Map();

		for (const task of this.controller.getTasks()) {
			this.renderRow(task);
		}
	}
}
