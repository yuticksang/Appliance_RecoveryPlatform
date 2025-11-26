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
  selectedImageFile: File | null = null;
  imagePreview: string | null = null;

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

  onImageSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedImageFile = file;

      // Create preview
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.imagePreview = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

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
        description: this.description?.value || null,
        imageFile: this.selectedImageFile // Send the actual File object
      };

      this.applianceAdded.emit(newAppliance);
      this.onClose();
    }
  }
}
