import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-auth-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './auth-login.html',
  styleUrls: ['./auth-login.scss']
})
export class AuthLoginComponent {
  private fb = inject(FormBuilder);
  private router = inject(Router);

  hide = true; // ✅ simple boolean, not a function

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  get f() { return this.form.controls; }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    console.log('login payload', this.form.value);
    this.router.navigate(['/']); // redirect after successful login
  }
}
