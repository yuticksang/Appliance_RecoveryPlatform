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

@Component({
  selector: 'app-add-appliance',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './add-appliance.html',
  styleUrls: ['./add-appliance.scss']
})
export class AddApplianceComponent implements OnInit {
  @Output() close = new EventEmitter<void>();
  @Output() applianceAdded = new EventEmitter<any>();
  @Input() categories: Category[] = [];
  @Input() brands: Brand[] = [];

  addApplianceForm: FormGroup;

  constructor(private fb: FormBuilder) {
    this.addApplianceForm = this.fb.group({
      modelCode: ['', [Validators.required]],
      modelName: ['', [Validators.required]],
      categoryID: ['', [Validators.required]],
      brandID: ['', [Validators.required]],
      description: ['']
    });
  }

  ngOnInit() {
    console.log('Categories:', this.categories);
    console.log('Brands:', this.brands);
  }

  get modelCode() { return this.addApplianceForm.get('modelCode'); }
  get modelName() { return this.addApplianceForm.get('modelName'); }
  get categoryID() { return this.addApplianceForm.get('categoryID'); }
  get brandID() { return this.addApplianceForm.get('brandID'); }
  get description() { return this.addApplianceForm.get('description'); }

  onClose() {
    this.close.emit();
  }

  onSubmit() {
    if (this.addApplianceForm.valid) {
      const newAppliance = {
        modelCode: this.modelCode?.value,
        modelName: this.modelName?.value,
        categoryID: this.categoryID?.value,
        brandID: this.brandID?.value,
        description: this.description?.value || null
      };

      this.applianceAdded.emit(newAppliance);
      this.onClose();
    }
  }
}
