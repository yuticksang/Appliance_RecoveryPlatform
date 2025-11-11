import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { AlertService } from '../../../services/alert.service';
import { AlertComponent } from '../../../shared/alert/alert.component';

@Component({
  selector: 'app-auth-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, AlertComponent],
  templateUrl: './auth-login.html',
  styleUrls: ['./auth-login.scss']
})
export class AuthLoginComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private alertService = inject(AlertService);
  private router = inject(Router);

  hide = true;
  loading = false;

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  get f() { return this.form.controls; }

  submit() {
    if (this.form.invalid) return;

    this.loading = true;

    // Don't clear admin session - only clear seller session
    // This allows keeping both admin and seller logged in simultaneously
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('userProfile');

    this.authService.login(this.f.email.value!, this.f.password.value!)
      .subscribe({
        next: (response) => {
          const userType = response.user.userType;

          // Only allow sellers to login here
          if (userType === 'seller') {
            // Set auth data
            this.authService.setAuthData(response);

            // Fetch user profile
            this.authService.fetchProfile().subscribe({
              next: (profile) => {
                this.authService.setProfile(profile);
                console.log('Profile loaded:', profile);
              },
              error: (err) => {
                console.error('Failed to load profile:', err);
                // Continue anyway
              }
            });

            // Show success message
            this.alertService.success('Logged in successfully!');

            // Redirect to seller home
            this.router.navigate(['/home']);
          } else {
            // Show alert for wrong user type
            this.alertService.error('Access denied. Please use seller account to login.');
            this.loading = false;
          }
        },
        error: (err) => {
          // Show alert for login errors
          const errorMessage = err.error?.message || 'Login failed. Please check your credentials.';
          this.alertService.error(errorMessage);
          this.loading = false;
          console.error('Login error:', err);
        }
      });
  }

  loginWithFacebook() {
    console.log('Facebook login not implemented yet');
  }

  loginWithGoogle() {
    console.log('Google login not implemented yet');
  }
}
