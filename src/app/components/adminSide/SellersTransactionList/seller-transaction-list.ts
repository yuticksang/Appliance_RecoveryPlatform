import { Component, OnInit, inject } from '@angular/core';
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

  selectedCategory: string = '';
  selectedBrand: string = '';
  searchQuery: string = '';

  currentPage: number = 1;
  itemsPerPage: number = 10;
  totalPages: number = 1;

  categories: string[] = [];
  brands: string[] = [];

  loading: boolean = false;

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

    this.filteredTransactions = filtered;
    this.totalPages = Math.ceil(this.filteredTransactions.length / this.itemsPerPage);

    // Reset to page 1 if current page exceeds total pages
    if (this.currentPage > this.totalPages && this.totalPages > 0) {
      this.currentPage = 1;
    }
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
    this.alertService.error('Delete functionality is not yet implemented. Please contact the developer.');
  }

  getImageUrl(imageUrl?: string): string {
    // Return placeholder if no image or if image is empty/invalid
    if (!imageUrl || imageUrl.trim() === '' || imageUrl === 'null' || imageUrl === 'undefined') {
      return 'assets/image/placeholder-appliance.png';
    }
    return imageUrl;
  }
}
