import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';

interface BuyerData {
  id: number;
  buyerId: string;
  fullName: string;
  username: string;
  email: string;
  phone: string;
  status: string;
}

@Component({
  selector: 'app-edit-buyer',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './edit-buyer.html',
  styleUrls: ['./edit-buyer.scss']
})
export class EditBuyerComponent implements OnInit {
  @Input() buyerData!: BuyerData;
  @Output() close = new EventEmitter<void>();
  @Output() buyerUpdated = new EventEmitter<any>();

  editBuyerForm: FormGroup;
  originalData: BuyerData | null = null;

  constructor(private fb: FormBuilder) {
    this.editBuyerForm = this.fb.group({
      fullName: [''],
      username: [''],
      email: [''],
      phone: [''],
      password: [''],
      confirmPassword: ['']
    });
  }

  ngOnInit() {
    if (this.buyerData) {
      // Store original data
      this.originalData = { ...this.buyerData };

      // Set form values
      this.editBuyerForm.patchValue({
        fullName: this.buyerData.fullName,
        username: this.buyerData.username,
        email: this.buyerData.email === '---' ? '' : this.buyerData.email,
        phone: this.buyerData.phone === '---' ? '' : this.buyerData.phone
      });
    }
  }

  get fullName() { return this.editBuyerForm.get('fullName'); }
  get username() { return this.editBuyerForm.get('username'); }
  get email() { return this.editBuyerForm.get('email'); }
  get phone() { return this.editBuyerForm.get('phone'); }
  get password() { return this.editBuyerForm.get('password'); }
  get confirmPassword() { return this.editBuyerForm.get('confirmPassword'); }

  // Check if any field has changed
  get hasChanges(): boolean {
    if (!this.originalData) return false;

    const currentFullName = this.fullName?.value?.trim() || '';
    const currentUsername = this.username?.value?.trim() || '';
    const currentEmail = this.email?.value?.trim() || '';
    const currentPhone = this.phone?.value?.trim() || '';
    const currentPassword = this.password?.value?.trim() || '';

    const originalEmail = this.originalData.email === '---' ? '' : this.originalData.email;
    const originalPhone = this.originalData.phone === '---' ? '' : this.originalData.phone;

    return (
      currentFullName !== this.originalData.fullName ||
      currentUsername !== this.originalData.username ||
      currentEmail !== originalEmail ||
      currentPhone !== originalPhone ||
      (currentPassword.length > 0) // Password is always a change
    );
  }

  // Check if passwords match
  get passwordsMatch(): boolean {
    const pwd = this.password?.value?.trim() || '';
    const confirmPwd = this.confirmPassword?.value?.trim() || '';

    if (!pwd && !confirmPwd) return true; // Both empty is fine
    return pwd === confirmPwd;
  }

  // Check if form has valid data to save
  get canSave(): boolean {
    const fullName = this.fullName?.value?.trim() || '';
    const username = this.username?.value?.trim() || '';
    const email = this.email?.value?.trim() || '';
    const pwd = this.password?.value?.trim() || '';

    // At least one field must be filled and different from original
    const hasValidFullName = fullName.length > 0;
    const hasValidUsername = username.length >= 3; // Minimum 3 chars for username
    const hasValidEmail = email.length === 0 || this.isValidEmail(email);
    const hasValidPassword = pwd.length === 0 || pwd.length >= 8; // Empty or min 8 chars

    // Passwords must match if provided
    if (pwd.length > 0 && !this.passwordsMatch) return false;

    // Must have at least one valid field AND changes must exist AND password must be valid
    return (hasValidFullName || hasValidUsername) && this.hasChanges && hasValidPassword && hasValidEmail;
  }

  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  onClose() {
    this.close.emit();
  }

  onSubmit() {
    if (!this.canSave || !this.originalData) return;

    const fullName = this.fullName?.value?.trim();
    const username = this.username?.value?.trim();
    const email = this.email?.value?.trim();
    const phone = this.phone?.value?.trim();
    const pwd = this.password?.value?.trim();

    // Create update object with only changed fields
    const updatedBuyer: any = {
      ...this.buyerData
    };

    // Only include fields that have changed and are valid
    if (fullName && fullName !== this.originalData.fullName) {
      updatedBuyer.fullName = fullName;
    }

    if (username && username !== this.originalData.username && username.length >= 3) {
      updatedBuyer.username = username;
    }

    const originalEmail = this.originalData.email === '---' ? '' : this.originalData.email;
    if (email !== originalEmail) {
      updatedBuyer.email = email;
    }

    const originalPhone = this.originalData.phone === '---' ? '' : this.originalData.phone;
    if (phone !== originalPhone) {
      updatedBuyer.phone = phone;
    }

    // Include password if changed
    if (pwd && pwd.length >= 8 && this.passwordsMatch) {
      updatedBuyer.password = pwd;
    }

    this.buyerUpdated.emit(updatedBuyer);
    this.onClose();
  }

  // Reset field to original value
  resetField(fieldName: string) {
    if (!this.originalData) return;

    if (fieldName === 'fullName') {
      this.editBuyerForm.patchValue({ fullName: this.originalData.fullName });
    } else if (fieldName === 'username') {
      this.editBuyerForm.patchValue({ username: this.originalData.username });
    } else if (fieldName === 'email') {
      const originalEmail = this.originalData.email === '---' ? '' : this.originalData.email;
      this.editBuyerForm.patchValue({ email: originalEmail });
    } else if (fieldName === 'phone') {
      const originalPhone = this.originalData.phone === '---' ? '' : this.originalData.phone;
      this.editBuyerForm.patchValue({ phone: originalPhone });
    }
  }
}
