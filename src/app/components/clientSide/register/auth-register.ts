import { Component, inject, OnInit, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AlertService } from '../../../services/alert.service';
import { AuthService } from '../../../services/auth.service';

declare const google: any;

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
export class AuthRegisterComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private http = inject(HttpClient);
  private alertService = inject(AlertService);
  private authService = inject(AuthService);
  private platformId = inject(PLATFORM_ID);

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

      google.accounts.id.renderButton(
        document.getElementById('google-signup-button'),
        {
          type: 'standard',
          theme: 'outline',
          size: 'large'
        }
      );

      google.accounts.id.cancel();
    } else {
      setTimeout(() => this.initializeGoogleSignIn(), 100);
    }
  }

  signupWithGoogle() {
    const googleButton = document.getElementById('google-signup-button');
    if (googleButton) {
      const button = googleButton.querySelector('div[role="button"]') as HTMLElement;
      if (button) {
        button.click();
      }
    }
  }

  handleGoogleCallback(response: any) {
    this.loading = true;
    const idToken = response.credential;

    if (!idToken) {
      this.alertService.error('Failed to get Google authentication token');
      this.loading = false;
      return;
    }

    this.authService.loginWithGoogle(idToken).subscribe({
      next: (response) => {
        const userType = response.user.userType;

        if (userType === 'seller') {
          this.authService.setAuthData(response);

          this.authService.fetchProfile().subscribe({
            next: (profile) => {
              this.authService.setProfile(profile);
            },
            error: (err) => {
              console.error('Failed to load profile:', err);
            }
          });

          this.alertService.success('Signed up with Google successfully!');
          this.router.navigate(['/home']);
        } else {
          this.alertService.error('Access denied. Please use seller account.');
          this.loading = false;
        }
      },
      error: (err) => {
        const errorMessage = err.error?.message || 'Google signup failed. Please try again.';
        this.alertService.error(errorMessage);
        this.loading = false;
        console.error('Google signup error:', err);
      }
    });
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
          this.alertService.success('Registration successful! Verify your email before logging in.');
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
