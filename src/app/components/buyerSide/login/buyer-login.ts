import { Component, inject, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AlertService } from '../../../services/alert.service';
import { AuthService } from '../../../../auth/auth-service';

interface LoginResponse {
  token: string;
  user: {
    id: number;
    email: string;
    username: string;
    userType: 'admin' | 'seller' | 'buyer' | string;
    adminRole?: string | null;
  };
}

@Component({
  selector: 'app-buyer-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './buyer-login.html',
  styleUrls: ['./buyer-login.scss']
})
export class BuyerLoginComponent implements OnInit {
  hide = true;
  loading = false;
  error = '';
  form;

  // put this in an env file later
  private apiBase = 'http://localhost:3000';
  private authService = inject(AuthService);

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private router: Router,
    private alertService: AlertService
  ) {
    this.form = this.fb.group({
      emailOrUsername: ['', [Validators.required]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });
  }

  ngOnInit() {
    // Handle dynamic form state here if needed in the future
  }

  get emailOrUsername() { return this.form.get('emailOrUsername'); }
  get password() { return this.form.get('password'); }

  submit() {
    if (this.form.invalid || this.loading) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.error = '';
    // Disable form while loading
    this.form.disable();

    this.http.post<LoginResponse>(`${this.apiBase}/api/auth/login`, this.form.value)
      .subscribe({
        next: (res) => {
          console.log('Login response:', res);
          const { user } = res;

          // ✅ Only allow buyers into this login
          if (user.userType !== 'buyer') {
            this.error = 'Access denied. Buyer credentials required.';
            this.alertService.error('Access denied. Buyer credentials required.');
            this.loading = false;
            this.form.enable();
            return;
          }

          // Clear all auth data first to prevent cross-contamination
          localStorage.removeItem('admin_token');
          localStorage.removeItem('admin_user');

          // Save auth using buyer-specific storage keys
          localStorage.setItem('buyer_token', res.token);
          localStorage.setItem('buyer_user', JSON.stringify(user));

          // Update AuthService signal (IMPORTANT: This ensures the UI updates immediately)
          this.authService.user.set(user as any);

          // Show success message
          this.alertService.success('Login successful! Welcome back.');

          // Navigate to buyer dashboard
          console.log('Navigating to buyer dashboard...');
          this.router.navigate(['/buyer/dashboard']).then(
            success => console.log('Navigation success:', success),
            error => console.error('Navigation error:', error)
          );
        },
        error: (err) => {
          this.error = err?.error?.message || 'Login failed. Please try again.';
          this.alertService.error(this.error);
          this.loading = false;
          this.form.enable();
        }
      });
  }
}
