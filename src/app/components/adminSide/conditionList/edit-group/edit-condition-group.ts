import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';

interface ConditionGroup {
  groupID: string;
  criteriaName: string;
  criteriaCodePrefix: string;
  question_title?: string | null;
  question_type?: string | null;
  display_order?: number | null;
  status: string;
}

@Component({
  selector: 'app-edit-condition-group',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './edit-condition-group.html',
  styleUrls: ['./edit-condition-group.scss']
})
export class EditConditionGroupComponent {
  @Input() groupData!: ConditionGroup;
  @Output() close = new EventEmitter<void>();
  @Output() groupUpdated = new EventEmitter<any>();

  editGroupForm: FormGroup;
  allGroups: ConditionGroup[] = [];

  questionTypes = [
    { value: 'radio', label: 'Radio Buttons (Single Choice)' },
    { value: 'checkbox', label: 'Checkboxes (Multiple Choice)' },
    { value: 'image', label: 'Image Selection' },
    { value: 'file_upload', label: 'File Upload' },
    { value: 'textarea', label: 'Text Area' }
  ];

  constructor(private fb: FormBuilder) {
    this.editGroupForm = this.fb.group({
      criteriaName: ['', [Validators.required]],
      question_title: [''],
      question_type: ['radio', [Validators.required]],
      display_order: [null, [Validators.min(1)]]
    });
  }

  ngOnInit() {
    if (this.groupData) {
      this.editGroupForm.patchValue({
        criteriaName: this.groupData.criteriaName,
        question_title: this.groupData.question_title || '',
        question_type: this.groupData.question_type || 'radio',
        display_order: this.groupData.display_order || null
      });

      // Question title is always required now (including Photo/Notes)
      this.editGroupForm.get('question_title')?.setValidators([Validators.required]);
      this.editGroupForm.get('question_title')?.updateValueAndValidity();
    }
  }

  @Input() set groups(value: ConditionGroup[]) {
    this.allGroups = value;
  }

  get criteriaName() {
    return this.editGroupForm.get('criteriaName');
  }

  get question_title() {
    return this.editGroupForm.get('question_title');
  }

  get question_type() {
    return this.editGroupForm.get('question_type');
  }

  get display_order() {
    return this.editGroupForm.get('display_order');
  }

  shouldShowQuestionFields(): boolean {
    // All groups need question and order now
    return true;
  }

  onClose() {
    this.close.emit();
  }

  onSubmit() {
    if (this.editGroupForm.valid) {
      const displayOrderValue = this.display_order?.value;

      // Check for duplicate display order
      if (displayOrderValue) {
        const duplicate = this.allGroups.find(g =>
          g.groupID !== this.groupData.groupID && g.display_order === displayOrderValue
        );

        if (duplicate) {
          this.display_order?.setErrors({ duplicate: true });
          return;
        }
      }

      const updatedGroup = {
        groupID: this.groupData.groupID,
        criteriaName: this.criteriaName?.value,
        criteriaCodePrefix: this.groupData.criteriaCodePrefix,
        question_title: this.question_title?.value || null,
        question_type: this.question_type?.value,
        display_order: displayOrderValue || null,
        status: this.groupData.status
      };

      this.groupUpdated.emit(updatedGroup);
      this.onClose();
    }
  }

  getDuplicateGroupName(): string {
    const displayOrderValue = this.display_order?.value;
    const duplicate = this.allGroups.find(g =>
      g.groupID !== this.groupData.groupID && g.display_order === displayOrderValue
    );
    return duplicate?.criteriaName || '';
  }
}
