import { Component, computed, signal, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AlertService } from '../../../services/alert.service';

interface BuyerMarkdown {
  buyerID: string;
  buyerName?: string;
  conditionID: string;
  conditionCode: string;
  conditionDescription: string;
  markdownPercentage: number;
  categoryNames?: string;
}

interface Category {
  categoryID: string;
  categoryName: string;
}

@Component({
  selector: 'app-markdown-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './markdown-list.html',
  styleUrls: ['./markdown-list.scss']
})
export class MarkdownListComponent implements OnInit {
  private http = inject(HttpClient);
  private alertService = inject(AlertService);
  private apiUrl = 'http://localhost:3000/api';

  // State
  markdowns = signal<BuyerMarkdown[]>([]);
  categories = signal<Category[]>([]);
  loading = signal<boolean>(false);
  error = signal<string>('');

  selectedCategoryFilter = signal<string>('all');
  selectedBuyerFilter = signal<string>('all');
  search = signal<string>('');
  minMarkdown = signal<number | null>(null);
  maxMarkdown = signal<number | null>(null);

  // Sort state
  sortField = signal<string>('conditionCode');
  sortDirection = signal<'asc' | 'desc'>('asc');

  // Pagination per group
  currentPages = signal<{ [key: string]: number }>({
    functional: 1,
    appearance: 1,
    checklist: 1
  });
  itemsPerPage = signal<number>(10);
  itemsPerPageOptions = [10, 20, 30, 50];

  ngOnInit() {
    this.loadMarkdowns();
    this.loadCategories();
  }

  // -------- API calls ----------
  loadMarkdowns() {
    this.loading.set(true);
    this.error.set('');

    this.http.get<BuyerMarkdown[]>(`${this.apiUrl}/admin/buyer-markdowns`)
      .subscribe({
        next: (markdowns) => {
          console.log('📂 Buyer markdowns from API:', markdowns);
          this.markdowns.set(markdowns);
          this.loading.set(false);
        },
        error: (err) => {
          this.error.set('Failed to load markdown list');
          this.loading.set(false);
          console.error('Load markdowns error:', err);
        }
      });
  }

  loadCategories() {
    this.http.get<Category[]>(`${this.apiUrl}/admin/categories`)
      .subscribe({
        next: (categories) => {
          this.categories.set(categories.filter((c: any) => c.status === 'ACTIVE'));
        },
        error: (err) => {
          console.error('Load categories error:', err);
        }
      });
  }

  // -------- Computed values ----------
  uniqueBuyers = computed(() => {
    const buyers = this.markdowns().map(m => ({
      id: m.buyerID,
      name: m.buyerName || m.buyerID
    }));

    // Remove duplicates based on buyerID
    const unique = buyers.filter((buyer, index, self) =>
      index === self.findIndex(b => b.id === buyer.id)
    );

    return unique.sort((a, b) => a.name.localeCompare(b.name));
  });

  filteredMarkdowns = computed(() => {
    let filtered = this.markdowns();
    const search = this.search().toLowerCase();
    const selectedCategory = this.selectedCategoryFilter();
    const selectedBuyer = this.selectedBuyerFilter();
    const min = this.minMarkdown();
    const max = this.maxMarkdown();

    // Filter by category
    if (selectedCategory && selectedCategory !== 'all') {
      filtered = filtered.filter(m =>
        m.categoryNames?.toLowerCase().includes(selectedCategory.toLowerCase())
      );
    }

    // Filter by buyer
    if (selectedBuyer && selectedBuyer !== 'all') {
      filtered = filtered.filter(m => m.buyerID === selectedBuyer);
    }

    // Filter by markdown percentage range
    if (min !== null) {
      filtered = filtered.filter(m => m.markdownPercentage >= min);
    }
    if (max !== null) {
      filtered = filtered.filter(m => m.markdownPercentage <= max);
    }

    // Filter by search
    if (search) {
      filtered = filtered.filter(m =>
        (m.conditionCode || '').toLowerCase().includes(search) ||
        (m.conditionDescription || '').toLowerCase().includes(search) ||
        (m.buyerID || '').toLowerCase().includes(search) ||
        (m.buyerName || '').toLowerCase().includes(search) ||
        (m.categoryNames || '').toLowerCase().includes(search) ||
        (m.markdownPercentage?.toString() || '').includes(search)
      );
    }

    return filtered;
  });

  // Sorted markdowns
  sortedMarkdowns = computed(() => {
    const filtered = [...this.filteredMarkdowns()];
    const field = this.sortField();
    const direction = this.sortDirection();

    filtered.sort((a: any, b: any) => {
      let aVal = a[field];
      let bVal = b[field];

      // Handle null/undefined values
      if (aVal == null) aVal = '';
      if (bVal == null) bVal = '';

      // Convert to lowercase for string comparison
      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();

      // Compare
      if (aVal < bVal) return direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return direction === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  });

  // Get paginated data by group
  functionalMarkdowns = computed(() => {
    return this.sortedMarkdowns().filter(m => m.conditionCode?.startsWith('F'));
  });

  appearanceMarkdowns = computed(() => {
    return this.sortedMarkdowns().filter(m => m.conditionCode?.startsWith('A'));
  });

  checklistMarkdowns = computed(() => {
    return this.sortedMarkdowns().filter(m => m.conditionCode?.startsWith('OT'));
  });

  // Paginated versions
  paginatedFunctional = computed(() => {
    const data = this.functionalMarkdowns();
    const currentPage = this.currentPages()['functional'];
    const start = (currentPage - 1) * this.itemsPerPage();
    return data.slice(start, start + this.itemsPerPage());
  });

  paginatedAppearance = computed(() => {
    const data = this.appearanceMarkdowns();
    const currentPage = this.currentPages()['appearance'];
    const start = (currentPage - 1) * this.itemsPerPage();
    return data.slice(start, start + this.itemsPerPage());
  });

  paginatedChecklist = computed(() => {
    const data = this.checklistMarkdowns();
    const currentPage = this.currentPages()['checklist'];
    const start = (currentPage - 1) * this.itemsPerPage();
    return data.slice(start, start + this.itemsPerPage());
  });

  // Total pages per group
  totalPagesFunctional = computed(() => {
    return Math.max(1, Math.ceil(this.functionalMarkdowns().length / this.itemsPerPage()));
  });

  totalPagesAppearance = computed(() => {
    return Math.max(1, Math.ceil(this.appearanceMarkdowns().length / this.itemsPerPage()));
  });

  totalPagesChecklist = computed(() => {
    return Math.max(1, Math.ceil(this.checklistMarkdowns().length / this.itemsPerPage()));
  });

  // Page numbers per group
  pageNumbersFunctional = computed(() => {
    const total = this.totalPagesFunctional();
    return Array.from({ length: total }, (_, i) => i + 1);
  });

  pageNumbersAppearance = computed(() => {
    const total = this.totalPagesAppearance();
    return Array.from({ length: total }, (_, i) => i + 1);
  });

  pageNumbersChecklist = computed(() => {
    const total = this.totalPagesChecklist();
    return Array.from({ length: total }, (_, i) => i + 1);
  });

  // -------- Actions ----------
  onSearchInput(v: string) {
    this.search.set(v);
    this.resetAllPages();
  }

  onCategoryFilterChange(categoryName: string) {
    this.selectedCategoryFilter.set(categoryName);
    this.resetAllPages();
  }

  onBuyerFilterChange(buyerId: string) {
    this.selectedBuyerFilter.set(buyerId);
    this.resetAllPages();
  }

  onMinMarkdownChange(value: string) {
    const num = parseFloat(value);
    this.minMarkdown.set(isNaN(num) ? null : num);
    this.resetAllPages();
  }

  onMaxMarkdownChange(value: string) {
    const num = parseFloat(value);
    this.maxMarkdown.set(isNaN(num) ? null : num);
    this.resetAllPages();
  }

  clearFilters() {
    this.selectedCategoryFilter.set('all');
    this.selectedBuyerFilter.set('all');
    this.search.set('');
    this.minMarkdown.set(null);
    this.maxMarkdown.set(null);
    this.resetAllPages();
  }

  onSort(field: string) {
    if (this.sortField() === field) {
      // Toggle direction if same field
      this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new field with ascending order
      this.sortField.set(field);
      this.sortDirection.set('asc');
    }
    this.resetAllPages();
  }

  resetAllPages() {
    this.currentPages.set({
      functional: 1,
      appearance: 1,
      checklist: 1
    });
  }

  goToPage(group: string, page: number) {
    const pages = this.currentPages();
    let maxPage = 1;

    switch(group) {
      case 'functional':
        maxPage = this.totalPagesFunctional();
        break;
      case 'appearance':
        maxPage = this.totalPagesAppearance();
        break;
      case 'checklist':
        maxPage = this.totalPagesChecklist();
        break;
    }

    if (page < 1 || page > maxPage) return;

    this.currentPages.set({
      ...pages,
      [group]: page
    });
  }

  setPageSize(size: number) {
    this.itemsPerPage.set(size);
    this.resetAllPages();
  }

  // -------- Helper methods ----------
  statusClass(status: string): string {
    const statusUpper = status?.toUpperCase();
    if (statusUpper === 'ACTIVE') {
      return 'badge-active';
    } else if (statusUpper === 'INACTIVE') {
      return 'badge-inactive';
    }
    return '';
  }

  getSortIcon(field: string): string {
    if (this.sortField() !== field) return '↕';
    return this.sortDirection() === 'asc' ? '↑' : '↓';
  }

  getRowNumber(group: string, index: number): number {
    const currentPage = this.currentPages()[group] || 1;
    return (currentPage - 1) * this.itemsPerPage() + index + 1;
  }

  getCurrentPage(group: string): number {
    return this.currentPages()[group] || 1;
  }
}
