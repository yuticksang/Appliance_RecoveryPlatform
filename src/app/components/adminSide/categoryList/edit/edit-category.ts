import { Component, Output, EventEmitter, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';

interface Category {
  categoryID: string;
  categoryName: string;
  description: string;
}

@Component({
  selector: 'app-edit-category',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './edit-category.html',
  styleUrls: ['./edit-category.scss']
})
export class EditCategoryComponent implements OnInit {
  @Output() close = new EventEmitter<void>();
  @Output() categoryUpdated = new EventEmitter<any>();
  @Input() categoryData!: Category;

  editCategoryForm: FormGroup;
  originalData: Category | null = null;

  constructor(private fb: FormBuilder) {
    this.editCategoryForm = this.fb.group({
      categoryName: ['', [Validators.required]],
      description: ['']
    });
  }

  ngOnInit() {
    if (this.categoryData) {
      // Store original data
      this.originalData = { ...this.categoryData };

      this.editCategoryForm.patchValue({
        categoryName: this.categoryData.categoryName,
        description: this.categoryData.description
      });
    }
  }

  get categoryName() { return this.editCategoryForm.get('categoryName'); }
  get description() { return this.editCategoryForm.get('description'); }

  // Check if any field has changed
  get hasChanges(): boolean {
    if (!this.originalData) return false;

    return (
      this.categoryName?.value !== this.originalData.categoryName ||
      (this.description?.value || '') !== (this.originalData.description || '')
    );
  }

  onClose() {
    this.close.emit();
  }

  onSubmit() {
    if (this.editCategoryForm.valid) {
      const updatedCategory = {
        categoryID: this.categoryData.categoryID,
        categoryName: this.categoryName?.value,
        description: this.description?.value || ''
      };

      this.categoryUpdated.emit(updatedCategory);
      this.onClose();
    }
  }
}
