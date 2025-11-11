import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';

@Component({
  selector: 'app-add-buyer',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './add-buyer.html',
  styleUrls: ['./add-buyer.scss']
})
export class AddBuyerComponent {
  @Output() close = new EventEmitter<void>();
  @Output() buyerAdded = new EventEmitter<any>();

  addBuyerForm: FormGroup;

  constructor(private fb: FormBuilder) {
    this.addBuyerForm = this.fb.group({
      fullName: ['', [Validators.required]],
      username: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.email]],
      phone: [''],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    });
  }

  get fullName() { return this.addBuyerForm.get('fullName'); }
  get username() { return this.addBuyerForm.get('username'); }
  get email() { return this.addBuyerForm.get('email'); }
  get phone() { return this.addBuyerForm.get('phone'); }
  get password() { return this.addBuyerForm.get('password'); }
  get confirmPassword() { return this.addBuyerForm.get('confirmPassword'); }

  get passwordMismatch(): boolean {
    const password = this.password?.value;
    const confirmPassword = this.confirmPassword?.value;
    return !!(password && confirmPassword && password !== confirmPassword);
  }

  onClose() {
    this.close.emit();
  }

  onSubmit() {
    if (this.addBuyerForm.valid && !this.passwordMismatch) {
      const newBuyer = {
        fullName: this.fullName?.value,
        username: this.username?.value,
        email: this.email?.value,
        phone: this.phone?.value,
        password: this.password?.value,
        status: 'ACTIVE'
      };

      this.buyerAdded.emit(newBuyer);
      this.onClose();
    }
  }
}
