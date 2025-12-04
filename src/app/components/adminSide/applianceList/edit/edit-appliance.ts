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
  categoryName?: string;
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
  imagePreview: string = 'assets/image/appliances/washing-machine-default.png';
  removeImage = false;
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

      const defaultPreview = this.getDefaultImageForCategory(this.applianceData.categoryID, this.applianceData.categoryName);
      const existingUrl = this.applianceData.image_url || '';
      const existingIsDefault = this.isDefaultImage(existingUrl);
      const existingMatchesDefault = this.isSameDefault(existingUrl, defaultPreview);

      // If no image or the stored default doesn't match the category, show the correct category default
      if (!existingUrl || (existingIsDefault && !existingMatchesDefault)) {
        this.imagePreview = defaultPreview;
      } else {
        this.imagePreview = existingUrl;
      }

      this.removeImage = false;

      // Update default preview when category changes and there is no custom image selected
      this.categoryID?.valueChanges.subscribe((newCategoryId) => {
        if (this.selectedImageFile) return;
        const existingWasDefault = this.isDefaultImage(this.applianceData.image_url || '');
        const shouldUseDefault = this.removeImage || !this.applianceData.image_url || existingWasDefault;
        if (shouldUseDefault) {
          this.imagePreview = this.getDefaultImageForCategory(
            newCategoryId || this.applianceData.categoryID,
            this.applianceData.categoryName
          );
        }
      });
    }
  }

  get modelCode() { return this.editApplianceForm.get('modelCode'); }
  get modelName() { return this.editApplianceForm.get('modelName'); }
  get categoryID() { return this.editApplianceForm.get('categoryID'); }
  get brandID() { return this.editApplianceForm.get('brandID'); }
  get description() { return this.editApplianceForm.get('description'); }

  getCategoryName(categoryID: string): string {
    const category = this.categories.find(c => c.categoryID === categoryID);
    return category ? category.categoryName : categoryID;
  }

  getBrandName(brandID: string): string {
    const brand = this.brands.find(b => b.brandID === brandID);
    return brand ? brand.brandName : brandID;
  }

  private getDefaultImageForCategory(categoryID: string, categoryName?: string): string {
    const normalizedName = this.getResolvedCategoryName(categoryID, categoryName).toLowerCase();

    const categoryImageMap: { keywords: string[]; src: string }[] = [
      { keywords: ['air conditioner', 'aircon'], src: 'assets/image/appliances/air-conditioner-default.png' },
      { keywords: ['microwave'], src: 'assets/image/appliances/microwave-default.png' },
      { keywords: ['fridge', 'refrigerator'], src: 'assets/image/appliances/refrigerator-default.png' },
      { keywords: ['washing machine', 'washer'], src: 'assets/image/appliances/washing-machine-default.png' }
    ];

    const match = categoryImageMap.find(entry =>
      entry.keywords.some(keyword => normalizedName.includes(keyword))
    );

    return match?.src || 'assets/image/appliances/washing-machine-default.png';
  }

  onImageSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedImageFile = file;
      this.removeImage = false;

      // Create preview
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.imagePreview = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  onRemoveImage() {
    this.selectedImageFile = null;
    this.removeImage = true;
    const targetCategory = this.categoryID?.value || this.applianceData.categoryID;
    this.imagePreview = this.getDefaultImageForCategory(targetCategory, this.applianceData.categoryName);
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
        imageUrl: this.removeImage ? '' : (this.applianceData.image_url || ''), // Keep existing URL if no new file unless removed
        removeImage: this.removeImage
      };

      this.applianceUpdated.emit(updatedAppliance);
      this.onClose();
    }
  }

  // Check if any field has changed
  get hasChanges(): boolean {
    if (!this.originalData) return false;

    return (
      this.modelCode?.value !== this.originalData.modelCode ||
      this.modelName?.value !== this.originalData.modelName ||
      this.categoryID?.value !== this.originalData.categoryID ||
      this.brandID?.value !== this.originalData.brandID ||
      (this.description?.value || '') !== (this.originalData.description || '') ||
      this.selectedImageFile !== null ||
      this.removeImage
    );
  }

  private getResolvedCategoryName(categoryID: string, categoryName?: string): string {
    const matchedCategory = this.categories.find(c => c.categoryID === categoryID);
    if (matchedCategory?.categoryName) return matchedCategory.categoryName;
    if (categoryName) return categoryName;
    return '';
  }

  private isDefaultImage(url: string): boolean {
    if (!url) return false;
    const filename = this.extractFilename(url);
    return [
      'air-conditioner-default.png',
      'microwave-default.png',
      'refrigerator-default.png',
      'washing-machine-default.png'
    ].includes(filename);
  }

  private isSameDefault(url: string, expectedDefault: string): boolean {
    if (!url || !expectedDefault) return false;
    return this.extractFilename(url) === this.extractFilename(expectedDefault);
  }

  private extractFilename(url: string): string {
    const parts = url.toLowerCase().split('/');
    return parts[parts.length - 1] || url.toLowerCase();
  }
}
