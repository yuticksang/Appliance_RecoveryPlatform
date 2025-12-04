import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { PackagingInstructionService, PackagingSection } from '../../../services/packaging-instruction.service';
import { TransactionService } from '../../../services/transaction.service';
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
  private packagingService = inject(PackagingInstructionService);
  private transactionService = inject(TransactionService);

  // Read the transactionId from navigation state
  private fromTransactionId: string | number | null = null;

  // Packaging instructions data
  packagingSections = signal<PackagingSection>({});
  sectionNames = signal<string[]>([]);
  loading = signal<boolean>(true);
  categoryId = signal<number>(0);
  isDefault = signal<boolean>(false);

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
    this.setupBreadcrumbs();
    this.loadPackagingInstructions();
  }

  private setupBreadcrumbs(): void {
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

  private loadPackagingInstructions(): void {
    if (!this.fromTransactionId) {
      console.warn('No transaction ID found, loading default instructions');
      this.loadDefaultInstructions();
      return;
    }

    // First, get the transaction to find out the category
    this.transactionService.getTransactionById(this.fromTransactionId).subscribe({
      next: (transaction) => {
        console.log('📦 Transaction loaded, categoryId:', transaction.categoryId);
        const categoryId = transaction.categoryId || 0;
        this.categoryId.set(categoryId);

        // Now fetch packaging instructions for this category
        this.packagingService.getPackagingInstructions(categoryId).subscribe({
          next: (response) => {
            console.log('✅ Packaging instructions loaded:', response);
            this.packagingSections.set(response.sections);
            this.sectionNames.set(Object.keys(response.sections));
            this.isDefault.set(response.isDefault);
            this.loading.set(false);
          },
          error: (error) => {
            console.error('❌ Error loading packaging instructions:', error);
            this.loadDefaultInstructions();
          }
        });
      },
      error: (error) => {
        console.error('❌ Error loading transaction:', error);
        this.loadDefaultInstructions();
      }
    });
  }

  private loadDefaultInstructions(): void {
    // Fallback to default instructions (categoryId = 0)
    this.packagingService.getPackagingInstructions(0).subscribe({
      next: (response) => {
        this.packagingSections.set(response.sections);
        this.sectionNames.set(Object.keys(response.sections));
        this.isDefault.set(true);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('❌ Error loading default instructions:', error);
        this.loading.set(false);
      }
    });
  }

  // Helper to get steps for a section
  getStepsForSection(sectionName: string) {
    return this.packagingSections()[sectionName] || [];
  }
}
