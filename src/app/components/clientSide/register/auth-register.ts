import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AlertService } from '../../../services/alert.service';

interface RegisterResponse {
  message: string;
  user: {
    id: number;
    email: string;
    name: string;
    username: string;
    user_type: string;
    user_status: string;
  };
}

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
  private http = inject(HttpClient);
  private alertService = inject(AlertService);

  hide1 = true;
  hide2 = true;
  loading = false;
  private apiBase = 'http://localhost:3000';

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
    if (this.form.invalid || this.loading) {
      this.form.markAllAsTouched();
      return;
    }

    // Check if passwords match
    if (this.f.password.value !== this.f.confirmPassword.value) {
      this.alertService.error('Passwords do not match!');
      return;
    }

    this.loading = true;

    const payload = {
      username: this.form.value.username,
      name: `${this.form.value.firstName} ${this.form.value.lastName}`,
      email: this.form.value.email,
      phone: this.form.value.phone,
      password: this.form.value.password
    };

    console.log('Register payload:', payload);

    this.http.post<RegisterResponse>(`${this.apiBase}/api/auth/register`, payload)
      .subscribe({
        next: (res) => {
          console.log('Registration response:', res);
          this.alertService.success('Registration successful! You can now log in with your credentials.');
          this.router.navigate(['/login']);
          this.loading = false;
        },
        error: (err) => {
          console.error('Registration error:', err);
          const errorMsg = err?.error?.message || 'Registration failed. Please try again.';
          this.alertService.error(errorMsg);
          this.loading = false;
        }
      });
  }
}
