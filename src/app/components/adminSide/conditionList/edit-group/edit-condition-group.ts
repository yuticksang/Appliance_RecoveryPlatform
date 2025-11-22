import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';

interface ConditionGroup {
  groupID: string;
  criteriaName: string;
  criteriaCodePrefix: string;
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

  constructor(private fb: FormBuilder) {
    this.editGroupForm = this.fb.group({
      criteriaName: ['', [Validators.required]]
    });
  }

  ngOnInit() {
    if (this.groupData) {
      this.editGroupForm.patchValue({
        criteriaName: this.groupData.criteriaName
      });
    }
  }

  get criteriaName() {
    return this.editGroupForm.get('criteriaName');
  }

  onClose() {
    this.close.emit();
  }

  onSubmit() {
    if (this.editGroupForm.valid) {
      const updatedGroup = {
        groupID: this.groupData.groupID,
        criteriaName: this.criteriaName?.value,
        criteriaCodePrefix: this.groupData.criteriaCodePrefix
      };

      this.groupUpdated.emit(updatedGroup);
      this.onClose();
    }
  }
}
