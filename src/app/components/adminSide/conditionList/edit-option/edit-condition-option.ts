import { Component, Input, Output, EventEmitter, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

interface ConditionOption {
  conditionID: string;
  groupID: string;
  code: string;
  description?: string;
  image: string | null;
  status: string;
  question: string | null;
  created_at: string;
  criteriaCodePrefix?: string;
}

interface Category {
  categoryID: string;
  categoryName: string;
  status: string;
}

@Component({
  selector: 'app-edit-condition-option',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './edit-condition-option.html',
  styleUrls: ['./edit-condition-option.scss']
})
export class EditConditionOptionComponent implements OnInit {
  @Input() optionData!: ConditionOption;
  @Input() questionType: string | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() optionUpdated = new EventEmitter<any>();

  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:3000/api';

  editOptionForm: FormGroup;
  categories: Category[] = [];
  selectedCategories: Set<string> = new Set();
  originalSelectedCategories: Set<string> = new Set();
  isChecklistType = false;
  isImageType = false;
  selectedFile: File | null = null;
  selectedFileName: string = '';
  currentImageUrl: string = '';
  imagePreviewUrl: string = '';
  originalData: ConditionOption | null = null;

  constructor(private fb: FormBuilder) {
    this.editOptionForm = this.fb.group({
      description: ['', [Validators.required]],
      status: ['ACTIVE', [Validators.required]],
      question: ['']
    });
  }

  ngOnInit() {
    this.loadCategories();
    this.loadConditionCategories();

    // Check if this is a checklist/question type
    this.isChecklistType = this.optionData.criteriaCodePrefix === 'C' || this.optionData.criteriaCodePrefix === 'OT';

    // Check if this is an image type
    this.isImageType = this.questionType === 'image';

    if (this.optionData) {
      // Store original data
      this.originalData = { ...this.optionData };

      this.editOptionForm.patchValue({
        description: this.optionData.description || '',
        status: this.optionData.status || 'ACTIVE',
        question: this.optionData.question || ''
      });
      this.currentImageUrl = this.optionData.image || '';
    }
  }

  loadCategories() {
    this.http.get<Category[]>(`${this.apiUrl}/admin/categories`)
      .subscribe({
        next: (categories) => {
          this.categories = categories.filter(c => c.status === 'ACTIVE');
        },
        error: (err) => {
          console.error('Load categories error:', err);
        }
      });
  }

  loadConditionCategories() {
    this.http.get<any[]>(`${this.apiUrl}/admin/condition-options/${this.optionData.conditionID}/categories`)
      .subscribe({
        next: (categories) => {
          this.selectedCategories = new Set(categories.map(c => c.categoryID));
          // Store original categories
          this.originalSelectedCategories = new Set(this.selectedCategories);
        },
        error: (err) => {
          console.error('Load condition categories error:', err);
        }
      });
  }

  toggleCategory(categoryID: string) {
    if (this.selectedCategories.has(categoryID)) {
      this.selectedCategories.delete(categoryID);
    } else {
      this.selectedCategories.add(categoryID);
    }
  }

  isCategorySelected(categoryID: string): boolean {
    return this.selectedCategories.has(categoryID);
  }

  get description() { return this.editOptionForm.get('description'); }
  get status() { return this.editOptionForm.get('status'); }
  get question() { return this.editOptionForm.get('question'); }

  // Check if any field has changed
  get hasChanges(): boolean {
    if (!this.originalData) return false;

    const categoriesChanged = !this.areSetsEqual(this.selectedCategories, this.originalSelectedCategories);
    const imageChanged = this.selectedFile !== null;

    return (
      this.description?.value !== (this.originalData.description || '') ||
      this.status?.value !== this.originalData.status ||
      (this.question?.value || '') !== (this.originalData.question || '') ||
      categoriesChanged ||
      imageChanged
    );
  }

  areSetsEqual(set1: Set<string>, set2: Set<string>): boolean {
    if (set1.size !== set2.size) return false;
    for (const item of set1) {
      if (!set2.has(item)) return false;
    }
    return true;
  }

  getCategoryName(categoryID: string): string {
    const category = this.categories.find(c => c.categoryID === categoryID);
    return category ? category.categoryName : categoryID;
  }

  onFileSelect(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      this.selectedFileName = file.name;

      // Create preview URL
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.imagePreviewUrl = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  getImageUrl(imagePath: string): string {
    if (!imagePath) return '';
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      return imagePath;
    }
    return `${this.apiUrl.replace('/api', '')}${imagePath}`;
  }

  onClose() {
    this.close.emit();
  }

  onSubmit() {
    if (this.editOptionForm.valid) {
      let imageValue;
      if (this.selectedFile) {
        // New file selected
        imageValue = this.selectedFile;
      } else {
        // Keep current image
        imageValue = this.currentImageUrl || null;
      }

      const updatedOption = {
        conditionID: this.optionData.conditionID,
        description: this.description?.value,
        status: this.status?.value,
        image: imageValue,
        question: this.question?.value || null,
        categoryIDs: Array.from(this.selectedCategories)
      };

      this.optionUpdated.emit(updatedOption);
      this.onClose();
    }
  }
}
