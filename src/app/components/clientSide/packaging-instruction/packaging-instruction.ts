import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { BreadcrumbService } from '../../../services/breadcrumb.service';
import { BreadcrumbComponent } from '../../../shared/breadcrumb/breadcrumb';

@Component({
  selector: 'app-packaging-instruction',
  imports: [CommonModule, BreadcrumbComponent],
  templateUrl: './packaging-instruction.html',
  styleUrl: './packaging-instruction.scss',
})
export class PackagingInstruction implements OnInit {
  private router = inject(Router);
  private breadcrumbService = inject(BreadcrumbService);

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

    ngOnInit(): void {
    if (this.fromTransactionId) {
      // Set breadcrumbs with clickable Transaction Detail link
      this.breadcrumbService.setBreadcrumbs([
        { label: 'Transactions', url: '/transactions' },
        { label: 'Transaction Detail', url: `/transaction-detail/${this.fromTransactionId}` },
        { label: 'Packaging Guide' } // Current page (no URL)
      ]);
    } else {
      // Fallback if accessed directly (no transaction context)
      this.breadcrumbService.setBreadcrumbs([
        { label: 'Transactions', url: '/transactions' },
        { label: 'Packaging Guide' }
      ]);
    }
  }

  goBackToTransaction(): void {
    if (this.fromTransactionId) {
      this.router.navigate(['/transaction-detail', this.fromTransactionId]);
    } else {
      // Fallback: go to transactions list if no ID
      this.router.navigate(['/transactions']);
    }
  }

}
