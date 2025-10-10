import { App, Modal, Setting, TextComponent } from 'obsidian';
import TaskController from './controller';
import { TaskEntry } from './types';
import { formatDate, toISO } from './utils';

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
		this.taskNameComponent.setValue(this.task.name);
		this.taskStartComponent.inputEl.value = formatDate('YYYY-MM-DDTHH:mm:ss', this.task.startTime);
		this.taskEndComponent.inputEl.value = this.task.endTime ? formatDate('YYYY-MM-DDTHH:mm:ss', this.task.endTime) : '';
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
		if (this.isInit) {
			this.updateView();
			return;
		}

		this.isInit = true;

		const { contentEl } = this;

		contentEl.createEl('h2', {
			text: 'Edit task',
		}).style = 'margin-top: 0;';

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
