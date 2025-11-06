import { Component, Input, Output, EventEmitter, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { AuthService } from '../../../../../auth/auth-service';

interface AdminData {
  id: number;
  adminId: string;
  fullName: string;
  username: string;
  role: string;
  status: string;
}

@Component({
  selector: 'app-edit-admin',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './edit-admin.html',
  styleUrls: ['./edit-admin.scss']
})
export class EditAdminComponent implements OnInit {
  @Input() adminData!: AdminData;
  @Output() close = new EventEmitter<void>();
  @Output() adminUpdated = new EventEmitter<any>();

  editAdminForm: FormGroup;
  originalData: AdminData | null = null;
  authService = inject(AuthService);

  constructor(private fb: FormBuilder) {
    // Check if user is superadmin to enable password fields
    const isSuperAdmin = this.authService.user()?.userType === 'superadmin' ||
      this.authService.user()?.adminRole === 'SUPER_ADMIN';

    this.editAdminForm = this.fb.group({
      fullName: [''],
      username: [''],
      password: [{ value: '', disabled: !isSuperAdmin }],
      confirmPassword: [{ value: '', disabled: !isSuperAdmin }]
    });
  }

  ngOnInit() {
    if (this.adminData) {
      // Store original data
      this.originalData = { ...this.adminData };

      // Set form values
      this.editAdminForm.patchValue({
        fullName: this.adminData.fullName,
        username: this.adminData.username
      });
    }
  }

  get fullName() { return this.editAdminForm.get('fullName'); }
  get username() { return this.editAdminForm.get('username'); }
  get password() { return this.editAdminForm.get('password'); }
  get confirmPassword() { return this.editAdminForm.get('confirmPassword'); }

  get isSuperAdmin(): boolean {
    return this.authService.user()?.userType === 'superadmin' ||
      this.authService.user()?.adminRole === 'SUPER_ADMIN';
  }

  // Check if any field has changed
  get hasChanges(): boolean {
    if (!this.originalData) return false;

    const currentFullName = this.fullName?.value?.trim() || '';
    const currentUsername = this.username?.value?.trim() || '';
    const currentPassword = this.password?.value?.trim() || '';

    return (
      currentFullName !== this.originalData.fullName ||
      currentUsername !== this.originalData.username ||
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
    const pwd = this.password?.value?.trim() || '';

    // At least one field must be filled and different from original
    const hasValidFullName = fullName.length > 0;
    const hasValidUsername = username.length >= 3; // Minimum 3 chars for username
    const hasValidPassword = pwd.length === 0 || pwd.length >= 8; // Empty or min 8 chars

    // Passwords must match if provided
    if (pwd.length > 0 && !this.passwordsMatch) return false;

    // Must have at least one valid field AND changes must exist AND password must be valid
    return (hasValidFullName || hasValidUsername || pwd.length > 0) && this.hasChanges && hasValidPassword;
  }

  onClose() {
    this.close.emit();
  }

  onSubmit() {
    if (!this.canSave || !this.originalData) return;

    const fullName = this.fullName?.value?.trim();
    const username = this.username?.value?.trim();
    const pwd = this.password?.value?.trim();

    // Create update object with only changed fields
    const updatedAdmin: any = {
      ...this.adminData
    };

    // Only include fields that have changed and are valid
    if (fullName && fullName !== this.originalData.fullName) {
      updatedAdmin.fullName = fullName;
    }

    if (username && username !== this.originalData.username && username.length >= 3) {
      updatedAdmin.username = username;
    }

    // Include password if changed (only for superadmin)
    if (pwd && pwd.length >= 8 && this.passwordsMatch) {
      updatedAdmin.password = pwd;
    }

    this.adminUpdated.emit(updatedAdmin);
    this.onClose();
  }

  // Reset field to original value
  resetField(fieldName: string) {
    if (!this.originalData) return;

    if (fieldName === 'fullName') {
      this.editAdminForm.patchValue({ fullName: this.originalData.fullName });
    } else if (fieldName === 'username') {
      this.editAdminForm.patchValue({ username: this.originalData.username });
    }
  }
}