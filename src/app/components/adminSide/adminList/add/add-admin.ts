import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';

@Component({
  selector: 'app-add-admin',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './add-admin.html',
  styleUrls: ['./add-admin.scss']
})
export class AddAdminComponent {
  @Output() close = new EventEmitter<void>();
  @Output() adminAdded = new EventEmitter<any>();

  addAdminForm: FormGroup;

  constructor(private fb: FormBuilder) {
    this.addAdminForm = this.fb.group({
      fullName: ['', [Validators.required]],
      username: ['', [Validators.required, Validators.minLength(3)]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]]
    });
  }

  get fullName() { return this.addAdminForm.get('fullName'); }
  get username() { return this.addAdminForm.get('username'); }
  get password() { return this.addAdminForm.get('password'); }
  get confirmPassword() { return this.addAdminForm.get('confirmPassword'); }

  get passwordMismatch(): boolean {
    const password = this.password?.value;
    const confirmPassword = this.confirmPassword?.value;
    return !!(password && confirmPassword && password !== confirmPassword);
  }

  onClose() {
    this.close.emit();
  }

  onSubmit() {
    if (this.addAdminForm.valid && !this.passwordMismatch) {
      const newAdmin = {
        fullName: this.fullName?.value,
        username: this.username?.value,
        password: this.password?.value,
        role: 'ADMIN',
        status: 'ACTIVE'
      };
      
      this.adminAdded.emit(newAdmin);
      this.onClose();
    }
  }
}