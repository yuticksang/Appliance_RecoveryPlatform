import { Component, computed, signal, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { AlertService } from '../../../services/alert.service';
import { AuthService } from '../../../../auth/auth-service';
import { BreadcrumbComponent } from '../../../shared/breadcrumb/breadcrumb';
import { TransactionService } from '../../../services/transaction.service';

interface BuyerTransaction {
  id: string;
  sellerId: string;
  sellerName: string;
  submittedApplianceID: string;
  submittedDate: Date;
  estimatedPrice: number;
  finalPrice?: number;
  initialNote: string;
  finalNote: string;
  transactionStatus: string;
  createdAt: Date;
  updatedAt: Date;
  paymentDueDate?: Date;
  itemStatus: string;
  itemStatusUpdatedAt: Date;
  brand: string;
  category: string;
  model: string;
  modelName: string;
  imageUrl: string;
  buyerBasePrice: number;
  // ✅ ADD FINAL FIELDS
  finalBrand?: string;
  finalCategory?: string;
  finalModel?: string;
  finalModelName?: string;
  finalImageUrl?: string;
}

type SortKey = 'id' | 'sellerId' | 'sellerName' | 'submittedDate' | 'finalPrice' | 'buyerBasePrice' | 'category' | 'brand' | 'model';
type SortDir = 'asc' | 'desc';

@Component({
  selector: 'app-buyer-transaction-list',
  standalone: true,
  imports: [CommonModule, FormsModule, BreadcrumbComponent],
  templateUrl: './buyer-transaction-list.html',
  styleUrls: ['./buyer-transaction-list.scss']
})
export class BuyerTransactionListComponent implements OnInit {
  private http = inject(HttpClient);
  private alertService = inject(AlertService);
  private auth = inject(AuthService);
  private router = inject(Router);
  private transactionService = inject(TransactionService);
  private apiUrl = 'http://localhost:3000/api';

  // State
  transactions = signal<BuyerTransaction[]>([]);
  loading = signal<boolean>(false);
  error = signal<string>('');

  // Filters
  search = signal<string>('');
  selectedCategory = signal<string>('all');
  selectedBrand = signal<string>('all');
  minPrice = signal<number | null>(null);
  maxPrice = signal<number | null>(null);

  // Pagination
  itemsPerPage = signal<number>(10);
  currentPage = signal<number>(1);
  itemsPerPageOptions = [10, 20, 30, 50];

  // Sorting
  sortKey = signal<SortKey>('submittedDate');
  sortDir = signal<SortDir>('desc');

  ngOnInit(): void {
    this.loadTransactions();
  }

  loadTransactions() {
    this.loading.set(true);
    this.error.set('');

    const buyerUserStr = localStorage.getItem('buyer_user');
    
    if (!buyerUserStr) {
      console.log('❌ No buyer_user found in localStorage');
      this.error.set('Buyer not logged in. Please log in again.');
      this.loading.set(false);
      return;
    }

    let buyerUser;
    try {
      buyerUser = JSON.parse(buyerUserStr);
      console.log('👤 Parsed buyer user:', buyerUser);
    } catch (e) {
      console.log('❌ Error parsing buyer user JSON:', e);
      this.error.set('Invalid buyer data. Please log in again.');
      this.loading.set(false);
      return;
    }

    const buyerId = buyerUser?.buyerId;
    console.log('🆔 Extracted buyerId:', buyerId);
    
    if (!buyerId) {
      console.log('❌ No buyerId found. Buyer user object:', buyerUser);
      this.error.set('Buyer ID not found. Please log in as a buyer.');
      this.loading.set(false);
      return;
    }

    console.log('🔍 Fetching transactions for buyer:', buyerId);

    this.transactionService.getTransactionsByBuyer(buyerId).subscribe({
      next: (data) => {
        console.log('✅ Loaded buyer transactions:', data);
        const buyerTransactions: BuyerTransaction[] = data.map(t => ({
          id: t.id,
          sellerId: t.sellerId,
          sellerName: t.sellerName,
          submittedApplianceID: '',
          submittedDate: new Date(t.submittedDate),
          estimatedPrice: Number(t.estimatedPrice) || 0,
          finalPrice: Number(t.finalPrice) || 0,
          initialNote: t.note || '',
          finalNote: t.note || '',
          transactionStatus: t.transactionStatus,
          createdAt: new Date(t.submittedDate),
          updatedAt: new Date(t.submittedDate),
          paymentDueDate: undefined,
          itemStatus: t.itemStatus,
          itemStatusUpdatedAt: new Date(t.submittedDate),
          brand: t.brand,
          category: t.category,
          model: t.model,
          modelName: t.modelName || '',
          imageUrl: t.image,
          buyerBasePrice: t.finalPrice ? Number(t.finalPrice) : Number(t.estimatedPrice) || 0,
          // ✅ MAP FINAL FIELDS FROM BACKEND
          finalBrand: t.finalBrand,
          finalCategory: t.finalCategory,
          finalModel: t.finalModel,
          finalModelName: t.finalModelName,
          finalImageUrl: t.finalImageUrl
        }));
        this.transactions.set(buyerTransactions);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('❌ Error loading buyer transactions:', err);
        this.error.set('Failed to load transactions. Please try again.');
        this.loading.set(false);
      }
    });
  }

  // ✅ UPDATE: Use final fields if available
  uniqueCategories = computed(() => {
    const cats = new Set<string>();
    this.transactions().forEach(t => {
      const category = t.finalCategory || t.category; // Use final if available
      if (category) cats.add(category);
    });
    return Array.from(cats).sort();
  });

  // ✅ UPDATE: Use final fields if available
  uniqueBrands = computed(() => {
    const brands = new Set<string>();
    this.transactions().forEach(t => {
      const brand = t.finalBrand || t.brand; // Use final if available
      if (brand) brands.add(brand);
    });
    return Array.from(brands).sort();
  });

  // ✅ UPDATE: Filter using final fields
  filtered = computed(() => {
    const searchTerm = this.search().toLowerCase();
    const category = this.selectedCategory();
    const brand = this.selectedBrand();
    const min = this.minPrice();
    const max = this.maxPrice();

    let filtered = this.transactions().filter(t => {
      // ✅ Search in final fields if available
      const matchesSearch = !searchTerm ||
        t.id.toLowerCase().includes(searchTerm) ||
        t.sellerId.toLowerCase().includes(searchTerm) ||
        t.sellerName.toLowerCase().includes(searchTerm) ||
        (t.finalCategory || t.category).toLowerCase().includes(searchTerm) ||
        (t.finalBrand || t.brand).toLowerCase().includes(searchTerm) ||
        (t.finalModel || t.model).toLowerCase().includes(searchTerm) ||
        (t.finalModelName || t.modelName).toLowerCase().includes(searchTerm);

      // ✅ Filter by final fields if available
      const matchesCategory = category === 'all' || (t.finalCategory || t.category) === category;
      const matchesBrand = brand === 'all' || (t.finalBrand || t.brand) === brand;

      const price = t.finalPrice || 0;
      const matchesMinPrice = min === null || price >= min;
      const matchesMaxPrice = max === null || price <= max;

      return matchesSearch && matchesCategory && matchesBrand && matchesMinPrice && matchesMaxPrice;
    });

    // Apply sorting
    const key = this.sortKey();
    const dir = this.sortDir();
    filtered.sort((a: any, b: any) => {
      let av, bv;

      if (key === 'finalPrice' || key === 'buyerBasePrice') {
        av = parseFloat(a[key]) || 0;
        bv = parseFloat(b[key]) || 0;
      } else if (key === 'submittedDate') {
        av = new Date(a[key]).getTime();
        bv = new Date(b[key]).getTime();
      } else if (key === 'category') {
        // ✅ Sort by final category if available
        av = (a.finalCategory || a.category || '').toLowerCase();
        bv = (b.finalCategory || b.category || '').toLowerCase();
      } else if (key === 'brand') {
        // ✅ Sort by final brand if available
        av = (a.finalBrand || a.brand || '').toLowerCase();
        bv = (b.finalBrand || b.brand || '').toLowerCase();
      } else if (key === 'model') {
        // ✅ Sort by final model if available
        av = (a.finalModel || a.model || '').toLowerCase();
        bv = (b.finalModel || b.model || '').toLowerCase();
      } else {
        av = (a[key] ?? '').toString().toLowerCase();
        bv = (b[key] ?? '').toString().toLowerCase();
      }

      if (av < bv) return dir === 'asc' ? -1 : 1;
      if (av > bv) return dir === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  });

  totalPages = computed(() =>
    Math.ceil(this.filtered().length / this.itemsPerPage())
  );

  paged = computed(() => {
    const start = (this.currentPage() - 1) * this.itemsPerPage();
    return this.filtered().slice(start, start + this.itemsPerPage());
  });

  // Methods
  setSort(key: SortKey) {
    if (this.sortKey() === key) {
      this.sortDir.set(this.sortDir() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortKey.set(key);
      this.sortDir.set('asc');
    }
  }

  getSortIcon(key: SortKey): string {
    if (this.sortKey() !== key) return '↕';
    return this.sortDir() === 'asc' ? '↑' : '↓';
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  clearFilters() {
    this.search.set('');
    this.selectedCategory.set('all');
    this.selectedBrand.set('all');
    this.minPrice.set(null);
    this.maxPrice.set(null);
    this.currentPage.set(1);
  }

  onMinPriceChange(value: string) {
    const num = parseFloat(value);
    this.minPrice.set(isNaN(num) || value === '' ? null : num);
    this.currentPage.set(1);
  }

  onMaxPriceChange(value: string) {
    const num = parseFloat(value);
    this.maxPrice.set(isNaN(num) || value === '' ? null : num);
    this.currentPage.set(1);
  }

  onSearchChange() {
    this.currentPage.set(1);
  }

  onFilterChange() {
    this.currentPage.set(1);
  }

  onItemsPerPageChange() {
    this.currentPage.set(1);
  }

  formatPrice(price: number | undefined): string {
    if (price === undefined || price === null || isNaN(price)) {
      return 'RM 0.00';
    }
    return `RM ${price.toFixed(2)}`;
  }

  formatDate(date: Date | string): string {
    return new Date(date).toLocaleDateString('en-MY');
  }

  getImageSrc(imageUrl: string | undefined): string {
    return imageUrl || 'assets/image/appliance_sample.png';
  }

  getItemStatusClass(status: string): string {
    const statusLower = status.toLowerCase();
    if (statusLower.includes('picked up')) return 'badge-success';
    if (statusLower.includes('returned')) return 'badge-danger';
    if (statusLower.includes('awaiting')) return 'badge-warning';
    return 'badge-info';
  }

  pageNumbers(): number[] {
    const total = this.totalPages();
    const current = this.currentPage();
    const pages: number[] = [];

    if (total <= 7) {
      for (let i = 1; i <= total; i++) {
        pages.push(i);
      }
    } else {
      if (current <= 4) {
        for (let i = 1; i <= 5; i++) pages.push(i);
        pages.push(-1);
        pages.push(total);
      } else if (current >= total - 3) {
        pages.push(1);
        pages.push(-1);
        for (let i = total - 4; i <= total; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push(-1);
        for (let i = current - 1; i <= current + 1; i++) pages.push(i);
        pages.push(-1);
        pages.push(total);
      }
    }

    return pages;
  }
}
