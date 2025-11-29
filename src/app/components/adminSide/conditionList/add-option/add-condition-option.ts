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
  @Input() groupData: any; // ADD THIS - to receive full group data including question_type
  @Output() close = new EventEmitter<void>();
  @Output() optionAdded = new EventEmitter<any>();

  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:3000/api';

  addOptionForm: FormGroup;
  categories: Category[] = [];
  selectedCategories: Set<string> = new Set();
  selectedFile: File | null = null;
  selectedFileName: string = '';
  imagePreviewUrl: string = '';

  constructor(private fb: FormBuilder) {
    this.addOptionForm = this.fb.group({
      description: ['', [Validators.required]],
      question: [''],
      image: [''],
      categories: [[]]
    });
  }

  ngOnInit() {
    this.loadCategories();
    this.updateFormValidators();
  }

  // ADD THESE GETTERS - Based on question_type like edit component
  get showQuestionField(): boolean {
    const show = this.groupData?.question_type === 'checkbox';
    console.log('🎯 showQuestionField:', show);
    return show;
  }

  get showImageUpload(): boolean {
    const show = this.groupData?.question_type === 'image';
    console.log('🖼️ showImageUpload:', show);
    return show;
  }

  // Keep this for backward compatibility with your HTML
  get isChecklistType(): boolean {
    return this.showQuestionField;
  }

  get hasSelectedCategories(): boolean {
    return this.selectedCategories.size > 0;
  }

  // ADD THIS METHOD - Update validators based on question_type
  updateFormValidators() {
    const questionType = this.groupData?.question_type;
    console.log('⚙️ Updating validators for:', questionType);

    if (questionType === 'checkbox') {
      // Checkbox: needs question, no image
      this.addOptionForm.get('question')?.setValidators([Validators.required]);
      this.addOptionForm.get('image')?.clearValidators();
    } else if (questionType === 'image') {
      // Image: needs image, no question
      this.addOptionForm.get('image')?.setValidators([Validators.required]);
      this.addOptionForm.get('question')?.clearValidators();
    } else {
      // Radio: no question, no image
      this.addOptionForm.get('question')?.clearValidators();
      this.addOptionForm.get('image')?.clearValidators();
    }

    this.addOptionForm.get('question')?.updateValueAndValidity();
    this.addOptionForm.get('image')?.updateValueAndValidity();
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
    
    this.addOptionForm.get('categories')?.setValue(Array.from(this.selectedCategories));
    this.addOptionForm.get('categories')?.markAsTouched();
  }

  isCategorySelected(categoryID: string): boolean {
    return this.selectedCategories.has(categoryID);
  }

  get description() { return this.addOptionForm.get('description'); }
  get question() { return this.addOptionForm.get('question'); }
  get image() { return this.addOptionForm.get('image'); }

  // RENAME to match your HTML
  onFileSelect(event: any) {
    const file = event.target.files[0];
    console.log('📁 File selected:', file);
    
    if (file) {
      this.selectedFile = file;
      this.selectedFileName = file.name;

      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.imagePreviewUrl = e.target.result;
        console.log('🖼️ Preview created');
      };
      reader.readAsDataURL(file);

      this.addOptionForm.get('image')?.setValue('selected');
      this.addOptionForm.get('image')?.markAsTouched();
    }
  }

  removeImage() {
    this.selectedFile = null;
    this.selectedFileName = '';
    this.imagePreviewUrl = '';
    
    const fileInput = document.getElementById('image') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }

    this.addOptionForm.get('image')?.setValue('');
    this.addOptionForm.get('image')?.markAsTouched();
  }

  onClose() {
    this.close.emit();
  }

  onSubmit() {
    this.addOptionForm.markAllAsTouched();

    if (!this.isFormValid()) {
      console.log('❌ Form invalid');
      return;
    }

    const newOption = {
      groupID: this.groupData.groupID,
      description: this.description?.value,
      question: this.showQuestionField ? this.question?.value : null,
      image: this.selectedFile,
      categoryIDs: Array.from(this.selectedCategories)
    };

    console.log('✅ Submitting new option:', newOption);
    this.optionAdded.emit(newOption);
    this.onClose();
  }

  isFormValid(): boolean {
    const descriptionValid = this.description?.valid ?? false;
    const categoriesValid = this.selectedCategories.size > 0;
    const questionValid = !this.showQuestionField || (this.question?.valid ?? false);
    const imageValid = !this.showImageUpload || !!this.selectedFile;

    console.log('🔍 Validation:', { 
      descriptionValid, 
      categoriesValid, 
      questionValid, 
      imageValid 
    });

    return descriptionValid && categoriesValid && questionValid && imageValid;
  }
}
