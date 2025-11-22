import { Component, Output, EventEmitter, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';

interface Brand {
  brandID: string;
  brandName: string;
  description: string;
}

@Component({
  selector: 'app-edit-brand',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './edit-brand.html',
  styleUrls: ['./edit-brand.scss']
})
export class EditBrandComponent implements OnInit {
  @Output() close = new EventEmitter<void>();
  @Output() brandUpdated = new EventEmitter<any>();
  @Input() brandData!: Brand;

  editBrandForm: FormGroup;

  constructor(private fb: FormBuilder) {
    this.editBrandForm = this.fb.group({
      brandName: ['', [Validators.required]],
      description: ['']
    });
  }

  ngOnInit() {
    if (this.brandData) {
      this.editBrandForm.patchValue({
        brandName: this.brandData.brandName,
        description: this.brandData.description
      });
    }
  }

  get brandName() { return this.editBrandForm.get('brandName'); }
  get description() { return this.editBrandForm.get('description'); }

  onClose() {
    this.close.emit();
  }

  onSubmit() {
    if (this.editBrandForm.valid) {
      const updatedBrand = {
        brandID: this.brandData.brandID,
        brandName: this.brandName?.value,
        description: this.description?.value || ''
      };

      this.brandUpdated.emit(updatedBrand);
      this.onClose();
    }
  }
}
