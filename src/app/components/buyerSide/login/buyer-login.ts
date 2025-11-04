import { Component } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-buyer-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './buyer-login.html',
  styleUrls: ['./buyer-login.scss']
})
export class BuyerLoginComponent {
  hide = true;
  form;

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });
  }

  submit() {
    if (this.form.invalid) return;
    // TODO: call /api/auth/buyer/login
    console.log('BUYER login', this.form.value);
  }
}
