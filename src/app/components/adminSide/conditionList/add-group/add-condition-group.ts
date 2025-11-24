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

  constructor(private fb: FormBuilder) {
    this.addGroupForm = this.fb.group({
      criteriaName: ['', [Validators.required]],
      criteriaCodePrefix: ['', [Validators.maxLength(10)]]
    });
  }

  get criteriaName() { return this.addGroupForm.get('criteriaName'); }
  get criteriaCodePrefix() { return this.addGroupForm.get('criteriaCodePrefix'); }

  onClose() {
    this.close.emit();
  }

  onSubmit() {
    if (this.addGroupForm.valid) {
      const newGroup = {
        criteriaName: this.criteriaName?.value,
        criteriaCodePrefix: this.criteriaCodePrefix?.value || ''
      };

      this.groupAdded.emit(newGroup);
      this.onClose();
    }
  }
}
