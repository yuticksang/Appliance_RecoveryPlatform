import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';

@Component({
  selector: 'app-add-brand',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './add-brand.html',
  styleUrls: ['./add-brand.scss']
})
export class AddBrandComponent {
  @Output() close = new EventEmitter<void>();
  @Output() brandAdded = new EventEmitter<any>();

  addBrandForm: FormGroup;

  constructor(private fb: FormBuilder) {
    this.addBrandForm = this.fb.group({
      brandName: ['', [Validators.required]],
      description: ['']
    });
  }

  get brandName() { return this.addBrandForm.get('brandName'); }
  get description() { return this.addBrandForm.get('description'); }

  onClose() {
    this.close.emit();
  }

  onSubmit() {
    if (this.addBrandForm.valid) {
      const newBrand = {
        brandName: this.brandName?.value,
        description: this.description?.value || ''
      };

      this.brandAdded.emit(newBrand);
      this.onClose();
    }
  }
}
