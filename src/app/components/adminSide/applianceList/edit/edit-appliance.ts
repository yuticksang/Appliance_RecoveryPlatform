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
  image_url?: string;
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
  @Input() applianceData!: Appliance;
  @Input() categories: Category[] = [];
  @Input() brands: Brand[] = [];

  editApplianceForm: FormGroup;
  selectedImageFile: File | null = null;
  imagePreview: string = 'assets/image/appliance_sample.png';
  originalData: Appliance | null = null;

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
    if (this.applianceData) {
      // Store original data
      this.originalData = { ...this.applianceData };

      this.editApplianceForm.patchValue({
        modelCode: this.applianceData.modelCode,
        modelName: this.applianceData.modelName,
        categoryID: this.applianceData.categoryID,
        brandID: this.applianceData.brandID,
        description: this.applianceData.description
      });

      // Set image preview if appliance has an image
      if (this.applianceData.image_url) {
        this.imagePreview = this.applianceData.image_url;
      }
    }
  }

  get modelCode() { return this.editApplianceForm.get('modelCode'); }
  get modelName() { return this.editApplianceForm.get('modelName'); }
  get categoryID() { return this.editApplianceForm.get('categoryID'); }
  get brandID() { return this.editApplianceForm.get('brandID'); }
  get description() { return this.editApplianceForm.get('description'); }

  // Check if any field has changed
  get hasChanges(): boolean {
    if (!this.originalData) return false;

    return (
      this.modelCode?.value !== this.originalData.modelCode ||
      this.modelName?.value !== this.originalData.modelName ||
      this.categoryID?.value !== this.originalData.categoryID ||
      this.brandID?.value !== this.originalData.brandID ||
      (this.description?.value || '') !== (this.originalData.description || '') ||
      this.selectedImageFile !== null
    );
  }

  getCategoryName(categoryID: string): string {
    const category = this.categories.find(c => c.categoryID === categoryID);
    return category ? category.categoryName : categoryID;
  }

  getBrandName(brandID: string): string {
    const brand = this.brands.find(b => b.brandID === brandID);
    return brand ? brand.brandName : brandID;
  }

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
    if (this.editApplianceForm.valid) {
      const updatedAppliance = {
        applianceID: this.applianceData.applianceID,
        modelCode: this.modelCode?.value,
        modelName: this.modelName?.value,
        categoryID: this.categoryID?.value,
        brandID: this.brandID?.value,
        description: this.description?.value || null,
        imageFile: this.selectedImageFile, // Send the actual File object
        imageUrl: this.applianceData.image_url || '' // Keep existing URL if no new file
      };

      this.applianceUpdated.emit(updatedAppliance);
      this.onClose();
    }
  }
}
