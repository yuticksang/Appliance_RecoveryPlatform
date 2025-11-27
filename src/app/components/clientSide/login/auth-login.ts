import { Component, inject, OnInit, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { AlertService } from '../../../services/alert.service';
import { AlertComponent } from '../../../shared/alert/alert.component';

declare const google: any;

@Component({
  selector: 'app-auth-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, AlertComponent],
  templateUrl: './auth-login.html',
  styleUrls: ['./auth-login.scss']
})
export class AuthLoginComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private alertService = inject(AlertService);
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);

  hide = true;
  loading = false;

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]]
  });

  get f() { return this.form.controls; }

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.initializeGoogleSignIn();
    }
  }

  initializeGoogleSignIn() {
    if (typeof google !== 'undefined') {
      google.accounts.id.initialize({
        client_id: '75292015195-pjehlbl1ubh48illla4nn0hhggil9ck2.apps.googleusercontent.com',
        callback: (response: any) => this.handleGoogleCallback(response)
      });

      // Render hidden button
      google.accounts.id.renderButton(
        document.getElementById('google-signin-button'),
        {
          type: 'standard',
          theme: 'outline',
          size: 'large'
        }
      );

      // Disable auto-select by canceling it
      google.accounts.id.cancel();
    } else {
      setTimeout(() => this.initializeGoogleSignIn(), 100);
    }
  }

  loginWithGoogle() {
    // Programmatically click the hidden Google button
    const googleButton = document.getElementById('google-signin-button');
    if (googleButton) {
      const button = googleButton.querySelector('div[role="button"]') as HTMLElement;
      if (button) {
        button.click();
      }
    }
  }

  submit() {
    if (this.form.invalid) return;

    this.loading = true;
    // Disable form while loading
    this.form.disable();

    // Clear all auth data first to prevent cross-contamination
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    localStorage.removeItem('buyer_token');
    localStorage.removeItem('buyer_user');
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
            this.form.enable(); // Re-enable form
          }
        },
        error: (err) => {
          // Show alert for login errors
          const errorMessage = err.error?.message || 'Login failed. Please check your credentials.';

          // Check if it's an email verification issue
          if (err.error?.emailNotVerified && err.error?.emailResent) {
            this.alertService.info(errorMessage);
          } else {
            this.alertService.error(errorMessage);
          }

          this.loading = false;
          this.form.enable(); // Re-enable form
          console.error('Login error:', err);
        }
      });
  }

  handleGoogleCallback(response: any) {
    this.loading = true;
    const idToken = response.credential;

    if (!idToken) {
      this.alertService.error('Failed to get Google authentication token');
      this.loading = false;
      return;
    }

    // Send the Google ID token to your backend
    this.authService.loginWithGoogle(idToken).subscribe({
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
          this.alertService.success('Logged in with Google successfully!');

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
        const errorMessage = err.error?.message || 'Google login failed. Please try again.';
        this.alertService.error(errorMessage);
        this.loading = false;
        console.error('Google login error:', err);
      }
    });
  }
}
