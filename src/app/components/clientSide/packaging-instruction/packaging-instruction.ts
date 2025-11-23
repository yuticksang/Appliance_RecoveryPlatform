import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-packaging-instruction',
  imports: [CommonModule],
  templateUrl: './packaging-instruction.html',
  styleUrl: './packaging-instruction.scss',
})
export class PackagingInstruction {
  private router = inject(Router);

  // Read the transactionId from navigation state
  private fromTransactionId: string | number | null = null;

  constructor() {
    // Access navigation state
    const navigation = this.router.getCurrentNavigation();
    const state = navigation?.extras.state as { fromTransactionId?: string | number };

    if (state?.fromTransactionId) {
      this.fromTransactionId = state.fromTransactionId;
    } else {
      // Fallback: try to read from history.state (works after refresh too)
      this.fromTransactionId = history.state?.fromTransactionId || null;
    }
  }

  goBackToTransaction(): void {
    if (this.fromTransactionId) {
      this.router.navigate(['/transactions', this.fromTransactionId]);
    } else {
      // Fallback: go to transactions list if no ID
      this.router.navigate(['/transactions']);
    }
  }

}
