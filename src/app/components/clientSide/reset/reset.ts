import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AlertService } from '../../../services/alert.service';

function match(ctrl: AbstractControl): ValidationErrors | null {
  const p = ctrl.get('password')?.value;
  const c = ctrl.get('confirm')?.value;
  return p && c && p !== c ? { mismatch: true } : null;
}

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './reset.html',
  styleUrls: ['./reset.scss']
})
export class ResetPasswordComponent {
  hide1 = true;
  hide2 = true;
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private http = inject(HttpClient);
  private alertService = inject(AlertService);
  private apiUrl = 'http://localhost:3000/api';

  token = this.route.snapshot.paramMap.get('token') ?? ''; // /reset-password/:token
  loading = false;
  success = false;

  form = this.fb.group({
    passwordGroup: this.fb.group({
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirm: ['', [Validators.required]]
    }, { validators: match })
  });

  get g() { return this.form.controls['passwordGroup'] as any; }
  get password() { return this.g.controls['password']; }
  get confirm() { return this.g.controls['confirm']; }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.form.disable();

    const payload = { token: this.token, newPassword: this.password.value };

    this.http.post(`${this.apiUrl}/auth/reset-password`, payload)
      .subscribe({
        next: (response: any) => {
          console.log('Reset password response:', response);
          this.success = true;
          this.loading = false;
          this.alertService.success(response.message || 'Password reset successful! You can now log in with your new password.');

          // Redirect to login after 2 seconds
          setTimeout(() => {
            this.router.navigate(['/login']);
          }, 2000);
        },
        error: (err) => {
          console.error('Reset password error:', err);
          this.loading = false;
          this.form.enable();
          this.alertService.error(err.error?.message || 'Failed to reset password. The link may be expired or invalid.');
        }
      });
  }
}