import { Component, Output, EventEmitter, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';

interface Category {
  categoryID: string;
  categoryName: string;
}

interface Brand {
  brandID: string;
  brandName: string;
}

interface Appliance {
  applianceID: string;
  modelCode: string;
  modelName: string;
  categoryID: string;
  brandID: string;
  description: string;
}

@Component({
  selector: 'app-edit-appliance',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './edit-appliance.html',
  styleUrls: ['./edit-appliance.scss']
})
export class EditApplianceComponent implements OnInit {
  @Output() close = new EventEmitter<void>();
  @Output() applianceUpdated = new EventEmitter<any>();
  @Input() appliance!: Appliance;
  @Input() categories: Category[] = [];
  @Input() brands: Brand[] = [];

  editApplianceForm: FormGroup;

  constructor(private fb: FormBuilder) {
    this.editApplianceForm = this.fb.group({
      modelCode: ['', [Validators.required]],
      modelName: ['', [Validators.required]],
      categoryID: ['', [Validators.required]],
      brandID: ['', [Validators.required]],
      description: ['']
    });
  }

  ngOnInit() {
    if (this.appliance) {
      this.editApplianceForm.patchValue({
        modelCode: this.appliance.modelCode,
        modelName: this.appliance.modelName,
        categoryID: this.appliance.categoryID,
        brandID: this.appliance.brandID,
        description: this.appliance.description
      });
    }
  }

  get modelCode() { return this.editApplianceForm.get('modelCode'); }
  get modelName() { return this.editApplianceForm.get('modelName'); }
  get categoryID() { return this.editApplianceForm.get('categoryID'); }
  get brandID() { return this.editApplianceForm.get('brandID'); }
  get description() { return this.editApplianceForm.get('description'); }

  onClose() {
    this.close.emit();
  }

  onSubmit() {
    if (this.editApplianceForm.valid) {
      const updatedAppliance = {
        applianceID: this.appliance.applianceID,
        modelCode: this.modelCode?.value,
        modelName: this.modelName?.value,
        categoryID: this.categoryID?.value,
        brandID: this.brandID?.value,
        description: this.description?.value || null
      };

      this.applianceUpdated.emit(updatedAppliance);
      this.onClose();
    }
  }
}
