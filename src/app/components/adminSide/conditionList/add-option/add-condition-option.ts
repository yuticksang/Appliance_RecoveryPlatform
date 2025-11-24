import { Component, Input, Output, EventEmitter, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

interface Category {
  categoryID: string;
  categoryName: string;
  status: string;
}

@Component({
  selector: 'app-add-condition-option',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './add-condition-option.html',
  styleUrls: ['./add-condition-option.scss']
})
export class AddConditionOptionComponent implements OnInit {
  @Input() groupID!: string;
  @Input() criteriaCodePrefix?: string;
  @Output() close = new EventEmitter<void>();
  @Output() optionAdded = new EventEmitter<any>();

  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:3000/api';

  addOptionForm: FormGroup;
  categories: Category[] = [];
  selectedCategories: Set<string> = new Set();
  isChecklistType = false;
  selectedFile: File | null = null;
  selectedFileName: string = '';
  imagePreviewUrl: string = '';

  constructor(private fb: FormBuilder) {
    this.addOptionForm = this.fb.group({
      description: ['', [Validators.required]],
      question: ['']
    });
  }

  ngOnInit() {
    this.loadCategories();
    this.isChecklistType = this.criteriaCodePrefix === 'C' || this.criteriaCodePrefix === 'OT';
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

  get description() { return this.addOptionForm.get('description'); }
  get question() { return this.addOptionForm.get('question'); }

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

  removeImage() {
    this.selectedFile = null;
    this.selectedFileName = '';
    this.imagePreviewUrl = '';
    // Clear the file input
    const fileInput = document.getElementById('image') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  onClose() {
    this.close.emit();
  }

  onSubmit() {
    if (this.addOptionForm.valid) {
      const newOption = {
        description: this.description?.value,
        image: this.selectedFile,
        question: this.question?.value || null,
        categoryIDs: Array.from(this.selectedCategories)
      };

      this.optionAdded.emit(newOption);
      this.onClose();
    }
  }
}
