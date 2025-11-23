import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';

@Component({
  selector: 'app-add-condition-group',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './add-condition-group.html',
  styleUrls: ['./add-condition-group.scss']
})
export class AddConditionGroupComponent {
  @Output() close = new EventEmitter<void>();
  @Output() groupAdded = new EventEmitter<any>();

  addGroupForm: FormGroup;

  questionTypes = [
    { value: 'radio', label: 'Radio Buttons (Single Choice)' },
    { value: 'checkbox', label: 'Checkboxes (Multiple Choice)' },
    { value: 'file_upload', label: 'File Upload' },
    { value: 'textarea', label: 'Text Area' }
  ];

  constructor(private fb: FormBuilder) {
    this.addGroupForm = this.fb.group({
      criteriaName: ['', [Validators.required]],
      criteriaCodePrefix: ['', [Validators.required, Validators.maxLength(10)]],
      question_title: ['', [Validators.required]],
      question_type: ['radio', [Validators.required]]
    });
  }

  get criteriaName() { return this.addGroupForm.get('criteriaName'); }
  get criteriaCodePrefix() { return this.addGroupForm.get('criteriaCodePrefix'); }
  get question_title() { return this.addGroupForm.get('question_title'); }
  get question_type() { return this.addGroupForm.get('question_type'); }

  onClose() {
    this.close.emit();
  }

  onSubmit() {
    if (this.addGroupForm.valid) {
      const newGroup = {
        criteriaName: this.criteriaName?.value,
        criteriaCodePrefix: this.criteriaCodePrefix?.value || '',
        question_title: this.question_title?.value,
        question_type: this.question_type?.value
      };

      this.groupAdded.emit(newGroup);
      this.onClose();
    }
  }
}
