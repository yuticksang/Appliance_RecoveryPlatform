import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AlertService } from '../../../services/alert.service';

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
  private alertService = inject(AlertService);

  hide1 = true;
  hide2 = true;

  form = this.fb.group({
    firstName: ['', [Validators.required, Validators.minLength(2)]],
    lastName: ['', [Validators.required, Validators.minLength(2)]],
    username: [
      '',
      [
        Validators.required,
        Validators.minLength(3),
        Validators.pattern('^[a-zA-Z0-9_]+$')
      ]
    ],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.required, Validators.pattern('^[0-9]{10,15}$')]],
    address: [''],
    password: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required]]
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
    if (this.form.invalid) return;

    const payload = {
      username: this.form.value.username,
      full_name: `${this.form.value.firstName} ${this.form.value.lastName}`,
      email: this.form.value.email,
      phone: this.form.value.phone,
      address: this.form.value.address,
      password: this.form.value.password
    };

    console.log('Register payload:', payload);
    // TODO: POST this to backend
    // TODO: Add registration API integration here
    this.alertService.success('Registration successful!');
    this.router.navigate(['/login']);
  }
}
