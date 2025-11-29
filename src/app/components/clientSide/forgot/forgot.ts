import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AlertService } from '../../../services/alert.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './forgot.html',
  styleUrls: ['./forgot.scss']
})
export class ForgotPasswordComponent {
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);
  private alertService = inject(AlertService);
  private apiUrl = 'http://localhost:3000/api';

  loading = false;
  submitted = false;

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]]
  });

  get f() { return this.form.controls; }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.form.disable();

    this.http.post(`${this.apiUrl}/auth/forgot-password`, { email: this.form.value.email })
      .subscribe({
        next: (response: any) => {
          console.log('Forgot password response:', response);
          this.submitted = true;
          this.loading = false;
          this.alertService.success(response.message || 'Password reset link sent! Please check your email.');
        },
        error: (err) => {
          console.error('Forgot password error:', err);
          this.loading = false;
          this.form.enable();
          this.alertService.error(err.error?.message || 'Failed to send password reset email. Please try again.');
        }
      });
  }
}