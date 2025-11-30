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

  categories: string[] = [];
  brands: string[] = [];

  loading: boolean = false;
  currentSellerId: string | null = null;
  private authSubscription?: Subscription;

  // Sorting properties
  sortColumn: string = '';
  sortDirection: 'asc' | 'desc' = 'asc';

  // Notification for awaiting confirmation
  showNotificationBanner: boolean = false;
  awaitingConfirmationCount: number = 0;

  // Helper method to get sort icon
  sortIcon(column: string): string {
    if (this.sortColumn !== column) return '↕';
    return this.sortDirection === 'asc' ? '↑' : '↓';
  }

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

        // Check for transactions awaiting confirmation
        this.checkAwaitingConfirmation();

        // Extract unique categories and brands from the loaded transactions
        this.extractCategories();
        this.extractBrands();

        this.applyFilters();
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading transactions:', error);
        this.loading = false;
      }
    });
  }

  checkAwaitingConfirmation(): void {
    // Count transactions with "Awaiting Confirmation" status
    this.awaitingConfirmationCount = this.transactions.filter(
      t => t.transactionStatus === 'Awaiting Confirmation'
    ).length;

    // Show notification banner if there are any
    if (this.awaitingConfirmationCount > 0) {
      this.showNotificationBanner = true;
    }
  }

  closeNotificationBanner(): void {
    this.showNotificationBanner = false;
  }

  extractCategories(): void {
    const categorySet = new Set(this.transactions.map(t => t.category).filter(c => c && c !== 'Unknown'));
    this.categories = Array.from(categorySet).sort();
  }

  extractBrands(): void {
    const brandSet = new Set(this.transactions.map(t => t.brand).filter(b => b && b !== 'Unknown'));
    this.brands = Array.from(brandSet).sort();
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

    // Apply sorting if a column is selected
    if (this.sortColumn) {
      filtered = this.sortTransactions(filtered);
    }

    this.filteredTransactions = filtered;
    this.totalPages = Math.ceil(this.filteredTransactions.length / this.itemsPerPage);

    // Reset to page 1 if current page exceeds total pages
    if (this.currentPage > this.totalPages && this.totalPages > 0) {
      this.currentPage = 1;
    }
  }

  sortBy(column: string): void {
    // Toggle direction if clicking the same column, otherwise reset to ascending
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }

    this.applyFilters();
  }

  sortTransactions(transactions: Transaction[]): Transaction[] {
    return transactions.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      // Get values based on column
      switch (this.sortColumn) {
        case 'brand':
          aValue = a.brand;
          bValue = b.brand;
          break;
        case 'category':
          aValue = a.category;
          bValue = b.category;
          break;
        case 'model':
          aValue = a.model;
          bValue = b.model;
          break;
        case 'modelName':
          aValue = a.modelName;
          bValue = b.modelName;
          break;
        case 'submissionDate':
        aValue = new Date(a.submittedDate).getTime();
        bValue = new Date(b.submittedDate).getTime();
        break;
        case 'transactionStatus':
          aValue = a.transactionStatus;
          bValue = b.transactionStatus;
          break;
        case 'itemStatus':
          aValue = a.itemStatus;
          bValue = b.itemStatus;
          break;
        default:
          return 0;
      }

      // Convert to lowercase for case-insensitive sorting (for strings)
      if (typeof aValue === 'string') aValue = aValue.toLowerCase();
      if (typeof bValue === 'string') bValue = bValue.toLowerCase();

      // Compare values
      let comparison = 0;
      if (aValue > bValue) {
        comparison = 1;
      } else if (aValue < bValue) {
        comparison = -1;
      }

      // Apply direction
      return this.sortDirection === 'asc' ? comparison : -comparison;
    });
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
    this.router.navigate(['/transaction-detail', transactionId]);
  }
  addNewAppliance(): void {
    // TODO: Navigate to trade-in questionnaire page
    // Example: this.router.navigate(['/trade-in']);
    console.log('Add new appliance clicked');
    this.router.navigate(['/questionnaire']);
    
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