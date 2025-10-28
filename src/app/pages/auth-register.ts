import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-auth-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './auth-register.html',
  styleUrls: ['./auth-register.scss']
})
export class AuthRegisterComponent {
  private fb = inject(FormBuilder);
  private router = inject(Router);

  hide1 = true;
  hide2 = true;

  form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.required, Validators.pattern(/^[0-9+\-\s]{7,}$/)]],
    address: [''],
    password: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required]],
    terms: [false, [Validators.requiredTrue]]
  });

  get f() {
    return this.form.controls;
  }

  // ✅ helper to check if form is valid AND passwords match
  isFormValid(): boolean {
    const pw = this.f.password.value;
    const cpw = this.f.confirmPassword.value;
    return this.form.valid && pw === cpw;
  }

  submit() {
    if (!this.isFormValid()) {
      this.form.markAllAsTouched();
      return;
    }

    console.log('Register data:', this.form.value);
    // TODO: Add registration API integration here
    this.router.navigate(['/login']);
  }
}
