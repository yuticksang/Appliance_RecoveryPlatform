import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';

@Component({
  selector: 'app-add-category',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './add-category.html',
  styleUrls: ['./add-category.scss']
})
export class AddCategoryComponent {
  @Output() close = new EventEmitter<void>();
  @Output() categoryAdded = new EventEmitter<any>();

  addCategoryForm: FormGroup;

  constructor(private fb: FormBuilder) {
    this.addCategoryForm = this.fb.group({
      categoryName: ['', [Validators.required]],
      description: ['']
    });
  }

  get categoryName() { return this.addCategoryForm.get('categoryName'); }
  get description() { return this.addCategoryForm.get('description'); }

  onClose() {
    this.close.emit();
  }

  onSubmit() {
    if (this.addCategoryForm.valid) {
      const newCategory = {
        categoryName: this.categoryName?.value,
        description: this.description?.value || ''
      };

      this.categoryAdded.emit(newCategory);
      this.onClose();
    }
  }
}
