import { App, Modal, Setting, TextComponent } from 'obsidian';
import TaskController from './controller';
import { TaskEntry } from './types';
import { formatDate, isTaskDone, isTaskSub, toISO } from './utils';

export class EditTaskModal extends Modal {
	private isInit = false;
	private task: TaskEntry;
	taskNameComponent: TextComponent;
	taskStartComponent: TextComponent;
	taskEndComponent: TextComponent;

	constructor(
		private controller: TaskController,
		app: App
	) {
		super(app);
	}

	openModal(task: TaskEntry): void {
		this.task = task;
		super.open();
	}

	updateView() {
		const dateFormat = 'YYYY-MM-DDTHH:mm:ss';
		this.taskNameComponent.setValue(this.task.name);
		this.taskStartComponent.inputEl.value = formatDate(dateFormat, this.task.startTime);
		this.taskEndComponent.inputEl.value = this.task.endTime ? formatDate(dateFormat, this.task.endTime) : '';
	}

	submitForm() {
		this.controller.updateTask(this.task.id, {
			startTime: this.taskStartComponent.inputEl.value
				? toISO(this.taskStartComponent.inputEl.value)
				: '',
			endTime: this.taskEndComponent.inputEl.value
				? toISO(this.taskEndComponent.inputEl.value)
				: '',
			name: this.taskNameComponent.inputEl.value
		});

		this.close();
	}

	onOpen() {
		const { contentEl } = this;

		contentEl.innerHTML = '';

		contentEl.createEl('h2', {
			text: 'Edit task',
		})
			.style.marginTop = '0';

		const formEl = contentEl.createEl('form');

		formEl.onsubmit = (event: SubmitEvent) => {
			event.preventDefault();
			this.submitForm();
		}

		const textSetting = new Setting(formEl)
			.setName('Task name')

		textSetting.addText(component => {
			const input = component.inputEl;
			this.taskNameComponent = component;

			input.type = 'text';
			component.setPlaceholder('e.g. Buy a milk');
		});

		const tagSetting = new Setting(formEl)
		tagSetting.setClass('task-timer-tags-wrap')

		this.controller.getTags().forEach(tag => {
			tagSetting.addButton(component => {
				const button = component.buttonEl;
				const tagName = `[${tag}] `;

				component.setButtonText(tag);

				button.type = 'button';
				button.onclick = () => {
					let value = this.taskNameComponent.inputEl.value;
					const match = value.match(/\[\w\w\]\s/)

					if (match) {
						value = value.slice(tagName.length);
					}

					this.taskNameComponent.inputEl.value = tagName + value;
				};
			});
		});

		const startTime = new Setting(formEl)
			.setName('Start time')

		startTime.addText(component => {
			const input = component.inputEl;
			this.taskStartComponent = component;

			input.type = 'datetime-local';
			input.step = '1';
		});

		const endTime = new Setting(formEl)
			.setName('End time')

		endTime.addText(component => {
			const input = component.inputEl;
			this.taskEndComponent = component;

			input.type = 'datetime-local';
			input.step = '1';
		});

		this.updateView();

		const isSub = isTaskSub(this.task);
		const isDone = isTaskDone(this.task);
		const showAdditionalButtons = isSub || isDone;

		if (showAdditionalButtons) {
			const additionalButtons = new Setting(formEl)

			if (isSub) {
				additionalButtons.addExtraButton(component => {
					const button = component.extraSettingsEl;

					component
						.setIcon('folder-output')
						.setTooltip('Clear parent');

					button.onclick = () => {
						this.controller.clearParent(this.task.id)
						this.close();
					};
				})
			}

			if (isDone) {
				additionalButtons.addExtraButton(component => {
					const button = component.extraSettingsEl;
					component
						.setIcon('reset')
						.setTooltip('Reset task')

					button.onclick = () => {
						(endTime.components[1] as TextComponent).inputEl.value = '';
						this.submitForm();
					};
				});
			}
		}

		new Setting(formEl)
			.addButton(deleteButton => {
				const button = deleteButton.buttonEl;

				deleteButton
					.setButtonText('Delete task(Double click)');

				button.ondblclick = () => {
					this.controller.deleteTask(this.task.id)
					this.close();
				};
				button.type = 'button';
			})
			.addButton(submitButton => {
				const button = submitButton.buttonEl;

				submitButton.setButtonText('Update task');
				button.type = 'submit';
			});
	}
}
