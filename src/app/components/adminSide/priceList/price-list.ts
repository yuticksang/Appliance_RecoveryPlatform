import { Component, computed, signal, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AlertService } from '../../../services/alert.service';
import { BreadcrumbComponent } from '../../../shared/breadcrumb/breadcrumb';


interface PriceRow {
  buyerID: string;
  applianceID: string;
  basePrice: number | string;
  buyer_id: string;
  buyerName: string;
  buyerUsername: string;
  modelCode: string;
  modelName: string;
  categoryName: string;
  brandName: string;
  applianceStatus: string;
}

type SortKey = 'buyer_id' | 'buyerName' | 'categoryName' | 'brandName' | 'modelName' | 'basePrice' | 'applianceID';
type SortDir = 'asc' | 'desc';

@Component({
  selector: 'app-price-list',
  standalone: true,
  imports: [CommonModule, FormsModule, BreadcrumbComponent],
  templateUrl: './price-list.html',
  styleUrls: ['./price-list.scss']
})
export class PriceListComponent implements OnInit {
  private http = inject(HttpClient);
  private alertService = inject(AlertService);
  private apiUrl = 'http://localhost:3000/api';

  // State
  rows = signal<PriceRow[]>([]);
  search = signal<string>('');
  sortKey = signal<SortKey>('buyer_id');
  sortDir = signal<SortDir>('asc');
  loading = signal<boolean>(false);
  error = signal<string>('');

  // Filters
  selectedCategory = signal<string>('');
  selectedBrand = signal<string>('');
  selectedBuyer = signal<string>('');

  itemsPerPageOptions = [10, 20, 30, 50];
  itemsPerPage = signal<number>(10);
  currentPage = signal<number>(1);

  ngOnInit() {
    this.loadPrices();
  }

  // API calls
  loadPrices() {
    this.loading.set(true);
    this.error.set('');

    this.http.get<PriceRow[]>(`${this.apiUrl}/admin/buyer-prices`)
      .subscribe({
        next: (data) => {
          console.log('💰 Fetched prices:', data);
          this.rows.set(data);
          this.loading.set(false);
        },
        error: (err) => {
          this.error.set('Failed to load prices');
          this.loading.set(false);
          console.error('Load prices error:', err);
          this.alertService.error('Failed to load buyer prices');
        }
      });
  }

  // Computed values
  uniqueCategories = computed(() => {
    const categories = [...new Set(this.rows().map(r => r.categoryName))];
    return categories.filter(c => c).sort();
  });

  uniqueBrands = computed(() => {
    const brands = [...new Set(this.rows().map(r => r.brandName))];
    return brands.filter(b => b).sort();
  });

  uniqueBuyers = computed(() => {
    const buyers = this.rows()
      .map(r => ({ id: r.buyer_id, name: r.buyerName }))
      .filter((b, i, arr) => arr.findIndex(x => x.id === b.id) === i)
      .sort((a, b) => a.id.localeCompare(b.id));
    return buyers;
  });

  filtered = computed(() => {
    const q = this.search().trim().toLowerCase();
    const selectedCat = this.selectedCategory();
    const selectedBrand = this.selectedBrand();
    const selectedBuyer = this.selectedBuyer();

    let list = this.rows().filter(r => {
      const matchesSearch = !q ||
        r.buyer_id.toLowerCase().includes(q) ||
        r.buyerName.toLowerCase().includes(q) ||
        r.buyerUsername.toLowerCase().includes(q) ||
        r.modelCode.toLowerCase().includes(q) ||
        r.modelName.toLowerCase().includes(q) ||
        r.categoryName.toLowerCase().includes(q) ||
        r.brandName.toLowerCase().includes(q) ||
        r.basePrice.toString().includes(q);

      const matchesCategory = !selectedCat || r.categoryName === selectedCat;
      const matchesBrand = !selectedBrand || r.brandName === selectedBrand;
      const matchesBuyer = !selectedBuyer || r.buyer_id === selectedBuyer;

      return matchesSearch && matchesCategory && matchesBrand && matchesBuyer;
    });

    // Sort
    const key = this.sortKey();
    const dir = this.sortDir();
    list.sort((a: any, b: any) => {
      let av, bv;

      if (key === 'basePrice') {
        av = parseFloat(a[key]) || 0;
        bv = parseFloat(b[key]) || 0;
      } else {
        av = (a[key] ?? '').toString().toLowerCase();
        bv = (b[key] ?? '').toString().toLowerCase();
      }

      if (av < bv) return dir === 'asc' ? -1 : 1;
      if (av > bv) return dir === 'asc' ? 1 : -1;
      return 0;
    });

    return list;
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

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  clearFilters() {
    this.search.set('');
    this.selectedCategory.set('');
    this.selectedBrand.set('');
    this.selectedBuyer.set('');
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

  getSortIcon(key: SortKey): string {
    if (this.sortKey() !== key) return '↕';
    return this.sortDir() === 'asc' ? '↑' : '↓';
  }

  formatPrice(price: number | string): string {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    return `RM ${numPrice.toFixed(2)}`;
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
