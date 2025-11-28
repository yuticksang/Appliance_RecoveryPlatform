import { Component, inject, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AlertService } from '../../../services/alert.service';
import { AuthService } from '../../../../auth/auth-service';

type AdminRole = 'SUPER_ADMIN' | 'ADMIN';

interface LoginResponse {
  token: string;
  user: {
    id: number;
    email: string;
    username: string;
    userType: 'admin' | 'seller' | 'buyer' | string;
    adminRole?: AdminRole | null; // expect from backend for admins
    // ...anything else you send back
  };
}

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './admin-login.html',
  styleUrls: ['./admin-login.scss']
})
export class AdminLoginComponent implements OnInit {
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

          // ✅ Only allow admins into this login
          if (user.userType !== 'admin' && user.userType !== 'superadmin') {
            this.error = 'Access denied. Admin credentials required.';
            this.alertService.error('Access denied. Admin credentials required.');
            this.loading = false;
            this.form.enable();
            return;
          }

          // optional: check specific admin role from backend
          const role: AdminRole | null = (user.adminRole ?? null) as AdminRole | null;

          // Clear all auth data first to prevent cross-contamination
          localStorage.removeItem('buyer_token');
          localStorage.removeItem('buyer_user');

          // Save auth using admin-specific storage keys
          localStorage.setItem('admin_token', res.token);
          localStorage.setItem('admin_user', JSON.stringify(user));

          // Update AuthService signal (IMPORTANT: This ensures the UI updates immediately)
          this.authService.user.set(user as any);

          // Show success message
          this.alertService.success('Login successful! Welcome back.');

          // Redirect all admins to dashboard
          console.log('Navigating to /admin/dashboard...');
          this.router.navigate(['/admin/dashboard']).then(
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
