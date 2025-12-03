import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AlertService } from '../../../services/alert.service';
import { TransactionService, Transaction } from '../../../services/transaction.service';
import { BreadcrumbComponent } from '../../../shared/breadcrumb/breadcrumb';

@Component({
  selector: 'app-seller-transaction-list',
  standalone: true,
  imports: [CommonModule, FormsModule, BreadcrumbComponent],
  templateUrl: './seller-transaction-list.html',
  styleUrls: ['./seller-transaction-list.scss']
})
export class SellerTransactionListComponent implements OnInit {
  private transactionService = inject(TransactionService);
  private router = inject(Router);
  private alertService = inject(AlertService);

  transactions: Transaction[] = [];
  filteredTransactions: Transaction[] = [];

  // Confirmation modal
  showConfirmModal = signal(false);
  confirmTarget = signal<Transaction | null>(null);

  selectedCategory: string = '';
  selectedBrand: string = '';
  searchQuery: string = '';

  currentPage: number = 1;
  itemsPerPage: number = 10;
  totalPages: number = 1;

  categories: string[] = [];
  brands: string[] = [];

  loading: boolean = false;

  // Sorting properties
  sortColumn: string = '';
  sortDirection: 'asc' | 'desc' = 'asc';

  // Helper method to get sort icon
  sortIcon(column: string): string {
    if (this.sortColumn !== column) return '↕';
    return this.sortDirection === 'asc' ? '↑' : '↓';
  }

  ngOnInit(): void {
    this.loadAllTransactions();
  }

  loadAllTransactions(): void {
    this.loading = true;

    console.log('📦 Fetching all seller transactions for admin');

    // Fetch ALL transactions from all sellers using the service
    this.transactionService.getAllTransactions().subscribe({
      next: (transactions) => {
        console.log('✅ Loaded all transactions:', transactions);
        // Map the Transaction service type to our component's needs
        this.transactions = transactions.map(t => ({
          ...t,
          submittedApplianceID: t.id.toString(),
          submittedDate: t.submittedDate.toString(),
          createdAt: t.submittedDate.toString(),
          updatedAt: t.submittedDate.toString(),
          image: t.image,
          imageUrl: t.image
        })) as any;

        // Extract unique categories and brands
        this.extractCategories();
        this.extractBrands();

        this.applyFilters();
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading transactions:', error);
        this.alertService.error('Failed to load transactions');
        this.loading = false;
      }
    });
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
        t.id.toLowerCase().includes(query) ||
        t.sellerId.toLowerCase().includes(query) ||
        (t.sellerName && t.sellerName.toLowerCase().includes(query)) ||
        t.brand.toLowerCase().includes(query) ||
        t.model.toLowerCase().includes(query) ||
        t.modelName.toLowerCase().includes(query) ||
        t.transactionStatus.toLowerCase().includes(query) ||
        t.itemStatus.toLowerCase().includes(query)
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
        case 'id':
          aValue = a.id;
          bValue = b.id;
          break;
        case 'sellerId':
          aValue = a.sellerId;
          bValue = b.sellerId;
          break;
        case 'category':
          aValue = a.category;
          bValue = b.category;
          break;
        case 'brand':
          aValue = a.brand;
          bValue = b.brand;
          break;
        case 'model':
          aValue = a.model;
          bValue = b.model;
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

  viewTransactionDetail(transactionId: string): void {
    console.log('🔍 Navigating to transaction detail. ID:', transactionId, 'Type:', typeof transactionId);
    this.router.navigate(['/admin/transactions', transactionId]);
  }

  viewTransaction(transaction: Transaction, event?: Event): void {
    if (event) {
      event.stopPropagation(); // Prevent row click from firing
    }
    console.log('👁️ Viewing transaction:', transaction.id);
    this.router.navigate(['/admin/transactions', transaction.id]);
  }

  editTransaction(transaction: Transaction, event?: Event): void {
    if (event) {
      event.stopPropagation(); // Prevent row click from firing
    }
    console.log('✏️ Editing transaction:', transaction.id);
    // Navigate to admin transaction detail page with edit mode
    this.router.navigate(['/admin/transactions', transaction.id]);
  }

  deleteTransaction(transaction: Transaction, event?: Event): void {
    if (event) {
      event.stopPropagation(); // Prevent row click from firing
    }

    console.log('🗑️ Delete requested for transaction:', transaction.id);

    // Show confirmation modal
    this.confirmTarget.set(transaction);
    this.showConfirmModal.set(true);
  }

  viewReport(transaction: Transaction, event?: Event): void {
  if (event) {
    event.stopPropagation(); // Prevent row click from firing
  }

  if(transaction.transactionStatus !== 'Completed'){
    this.alertService.error('Transaction report is only available for completed transactions.');
    return;
  }
  
  console.log('📊 Viewing report for transaction:', transaction.id);
  
  this.router.navigate(['/admin/transactions/report', transaction.id]);

}

  onConfirmDelete(): void {
    const transaction = this.confirmTarget();
    if (!transaction) return;

    // Delete the transaction
    this.transactionService.deleteTransaction(transaction.id).subscribe({
      next: (response) => {
        console.log('✅ Transaction deleted successfully:', response);
        this.alertService.success(`Transaction ${transaction.id} deleted successfully`);

        // Remove from local arrays
        this.transactions = this.transactions.filter(t => t.id !== transaction.id);
        this.applyFilters(); // Re-apply filters to update filtered list and pagination

        // Close modal
        this.onCancelDelete();
      },
      error: (error) => {
        console.error('❌ Error deleting transaction:', error);
        const errorMessage = error.error?.message || 'Failed to delete transaction. Please try again.';
        this.alertService.error(errorMessage);

        // Close modal
        this.onCancelDelete();
      }
    });
  }

  onCancelDelete(): void {
    this.showConfirmModal.set(false);
    this.confirmTarget.set(null);
  }

  getConfirmMessage(): string {
    const transaction = this.confirmTarget();
    if (!transaction) return '';

    return `Are you sure you want to delete transaction "${transaction.id}"?`;
  }

  getImageUrl(imageUrl?: string): string {
    // Return placeholder if no image or if image is empty/invalid
    if (!imageUrl || imageUrl.trim() === '' || imageUrl === 'null' || imageUrl === 'undefined') {
      return 'assets/image/placeholder-appliance.png';
    }
    return imageUrl;
  }
}
