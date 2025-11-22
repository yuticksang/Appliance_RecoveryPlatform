import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter, take } from 'rxjs/operators';
import { TransactionService, Transaction } from '../../../services/transaction.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-transactions',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './transactions.html',
  styleUrls: ['./transactions.scss']
})
export class TransactionsComponent implements OnInit, OnDestroy {
  private transactionService = inject(TransactionService);
  private authService = inject(AuthService);
  private router = inject(Router);

  transactions: Transaction[] = [];
  filteredTransactions: Transaction[] = [];
  
  selectedCategory: string = '';
  selectedBrand: string = '';
  searchQuery: string = '';
  
  currentPage: number = 1;
  itemsPerPage: number = 10;
  totalPages: number = 1;

  categories: string[] = ['Laundry', 'Kitchen', 'Cleaning'];
  brands: string[] = ['LG', 'SAMSUNG', 'PANASONIC'];

  loading: boolean = false;
  currentSellerId: string | null = null;
  private authSubscription?: Subscription;

  ngOnInit(): void {
    // Wait for auth to be ready before loading transactions
    // Use filter + take(1) to only trigger once when user is available
    this.authSubscription = this.authService.currentUser$
      .pipe(
        filter(user => user !== null && user.userType === 'seller'),
        take(1) // Only take the first emission, then auto-unsubscribe
      )
      .subscribe(() => {
        this.loadSellerTransactions();
      });
  }

  ngOnDestroy(): void {
    // Cleanup subscription (though take(1) auto-unsubscribes)
    this.authSubscription?.unsubscribe();
  }

  loadSellerTransactions(): void {
    this.loading = true;

    // Get current logged-in seller ID (e.g., 'S001')
    this.currentSellerId = this.authService.getSellerId();

    if (!this.currentSellerId) {
      console.error('❌ Cannot load transactions: No seller ID found');
      this.loading = false;
      return;
    }

    console.log('📦 Fetching transactions for seller:', this.currentSellerId);

    // Fetch transactions for this seller only
    this.transactionService.getTransactionsBySeller(this.currentSellerId).subscribe({
      next: (transactions) => {
        console.log('✅ Loaded transactions:', transactions);
        console.log('Transaction IDs:', transactions.map(t => ({ id: t.id, type: typeof t.id })));
        this.transactions = transactions;
        this.applyFilters();
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading transactions:', error);
        this.loading = false;
      }
    });
  }

  applyFilters(): void {
    let filtered = [...this.transactions];

    // Filter by category
    if (this.selectedCategory) {
      filtered = filtered.filter(t => t.category === this.selectedCategory);
    }

    // Filter by brand
    if (this.selectedBrand) {
      filtered = filtered.filter(t => t.brand === this.selectedBrand);
    }

    // Filter by search query
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(t =>
        t.brand.toLowerCase().includes(query) ||
        t.model.toLowerCase().includes(query) ||
        t.modelName.toLowerCase().includes(query)
      );
    }

    this.filteredTransactions = filtered;
    this.totalPages = Math.ceil(this.filteredTransactions.length / this.itemsPerPage);
  }

  get paginatedTransactions(): Transaction[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    return this.filteredTransactions.slice(start, end);
  }

  getStatusClass(status: string): string {
    const statusMap: { [key: string]: string } = {
      'Pending Payment': 'status-pending-payment',
      'Completed': 'status-completed',
      'Returned': 'status-returned',
      'Rejected': 'status-rejected',
      'Cancelled': 'status-cancelled',
      'Awaiting Confirmation': 'status-awaiting',
      'Confirmed': 'status-confirmed',
      'Under Review': 'status-review',
      'Picked Up': 'status-picked-up'
    };
    return statusMap[status] || '';
  }

  getItemStatusClass(status: string): string {
    const statusMap: { [key: string]: string } = {
      'Picked Up': 'item-picked-up',
      'Returned': 'item-returned',
      'Awaiting Pick Up': 'item-awaiting',
      'Awaiting Picked Up': 'item-awaiting',
      'Pending Further Action': 'item-pending',
      'Unresponded': 'item-unresponded',
      'Awaiting Return': 'item-awaiting-return'
    };
    return statusMap[status] || '';
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  get pageNumbers(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  onCategoryChange(): void {
    this.currentPage = 1;
    this.applyFilters();
  }

  onBrandChange(): void {
    this.currentPage = 1;
    this.applyFilters();
  }

  onSearch(): void {
    this.currentPage = 1;
    this.applyFilters();
  }

  viewTransactionDetail(transactionId: string | number): void {
    console.log('🔍 Navigating to transaction detail. ID:', transactionId, 'Type:', typeof transactionId);
    this.router.navigate(['/transactions', transactionId]);
  }
  addNewAppliance(): void {
    // TODO: Navigate to trade-in questionnaire page
    // Example: this.router.navigate(['/trade-in']);
    console.log('Add new appliance clicked');
    
    // NOTE FOR TEAMMATES: When user completes the trade-in questionnaire,
    // call the transaction service to create a new transaction:
    //
    // this.transactionService.createTransaction({
    //   sellerId: this.currentSellerId,
    //   sellerName: this.authService.getCurrentUser()?.username,
    //   brand: 'LG',
    //   category: 'Laundry',
    //   model: 'ABC123',
    //   modelName: 'LG Front Load Washer',
    //   estimatedPrice: 500
    // }).subscribe(() => {
    //   this.loadSellerTransactions(); // Refresh the list
    // });
  }
}
