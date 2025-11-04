import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

function match(ctrl: AbstractControl): ValidationErrors | null {
  const p = ctrl.get('password')?.value;
  const c = ctrl.get('confirm')?.value;
  return p && c && p !== c ? { mismatch: true } : null;
}

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './reset.html',
  styleUrls: ['./reset.scss']
})
export class ResetPasswordComponent {
  hide1 = true;
  hide2 = true;
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  
  token = this.route.snapshot.paramMap.get('token') ?? ''; // /reset-password/:token

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
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const payload = { token: this.token, newPassword: this.password.value };
    // TODO: POST /api/auth/reset-password  { token, newPassword }
    console.log('Reset password ->', payload);
  }
}