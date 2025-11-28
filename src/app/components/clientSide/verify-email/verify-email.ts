import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './verify-email.html',
  styleUrls: ['./verify-email.scss']
})
export class VerifyEmailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private http = inject(HttpClient);
  private router = inject(Router);

  verificationStatus: 'loading' | 'success' | 'error' = 'loading';
  message = 'Verifying your email...';
  token = '';

  ngOnInit() {
    this.token = this.route.snapshot.paramMap.get('token') ?? '';

    if (!this.token) {
      this.verificationStatus = 'error';
      this.message = 'Invalid verification link';
      return;
    }

    this.verifyEmail();
  }

  verifyEmail() {
    this.http.get<any>(`${environment.apiUrl}/api/auth/verify-email/${this.token}`)
      .subscribe({
        next: (response) => {
          console.log('✅ Email verification successful:', response);
          this.verificationStatus = 'success';
          this.message = response.message || 'Email verified successfully! You can now log in.';

          // Redirect to login page after 3 seconds
          setTimeout(() => {
            this.router.navigate(['/login']);
          }, 3000);
        },
        error: (error) => {
          console.error('❌ Email verification failed:', error);
          this.verificationStatus = 'error';
          this.message = error.error?.message || 'Email verification failed. The link may be invalid or expired.';
        }
      });
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }
}
