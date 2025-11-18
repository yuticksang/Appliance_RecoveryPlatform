import { Component, computed, signal, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AlertService } from '../../../services/alert.service';
import { AddBrandComponent } from './add/add-brand';
import { EditBrandComponent } from './edit/edit-brand';

type BrandStatus = 'ACTIVE' | 'INACTIVE';

interface BrandRow {
  brandID: string;
  brandName: string;
  description: string;
  count: number;
  status: BrandStatus;
  created_at: string;
}

type SortKey = 'brandID' | 'brandName' | 'count' | 'status';
type SortDir = 'asc' | 'desc';

@Component({
  selector: 'app-brand-list',
  standalone: true,
  imports: [CommonModule, FormsModule, AddBrandComponent, EditBrandComponent],
  templateUrl: './brand-list.html',
  styleUrls: ['./brand-list.scss']
})
export class BrandListComponent implements OnInit {
  private http = inject(HttpClient);
  private alertService = inject(AlertService);
  private apiUrl = 'http://localhost:3000/api';

  // -------- state ----------
  rows = signal<BrandRow[]>([]);
  search = signal<string>('');
  sortKey = signal<SortKey>('brandID');
  sortDir = signal<SortDir>('asc');
  loading = signal<boolean>(false);
  error = signal<string>('');

  itemsPerPageOptions = [10, 20, 30, 50];
  itemsPerPage = signal<number>(10);
  currentPage = signal<number>(1);

  // Modals
  showAddModal = signal(false);
  showEditModal = signal(false);
  showConfirmModal = signal(false);
  confirmAction = signal<'toggle' | null>(null);
  confirmTarget = signal<BrandRow | null>(null);
  editingBrand = signal<BrandRow | null>(null);

  ngOnInit() {
    this.loadCategories();
  }

  // -------- API calls ----------
  loadCategories() {
    this.loading.set(true);
    this.error.set('');

    this.http.get<any[]>(`${this.apiUrl}/admin/categories`)
      .subscribe({
        next: (categories) => {
          console.log('📂 Raw categories from API:', categories);
          const brandData = categories.map((cat) => ({
            brandID: cat.brandID || '',
            brandName: cat.brandName || '',
            description: cat.description || '',
            count: cat.count || 0,
            status: cat.status as BrandStatus || 'ACTIVE',
            created_at: cat.created_at || ''
          }));

          this.rows.set(brandData);
          this.loading.set(false);
        },
        error: (err) => {
          this.error.set('Failed to load categories');
          this.loading.set(false);
          console.error('Load categories error:', err);
        }
      });
  }

  // -------- derived computed values ----------
  filtered = computed(() => {
    const q = this.search().trim().toLowerCase();

    let list = this.rows().filter(r => {
      const matchesSearch = !q ||
        r.brandID.toLowerCase().includes(q) ||
        r.brandName.toLowerCase().includes(q) ||
        (r.description || '').toLowerCase().includes(q);

      return matchesSearch;
    });

    const key = this.sortKey();
    const dir = this.sortDir();
    list.sort((a: any, b: any) => {
      const av = (a[key] ?? '').toString().toLowerCase();
      const bv = (b[key] ?? '').toString().toLowerCase();
      if (av < bv) return dir === 'asc' ? -1 : 1;
      if (av > bv) return dir === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  });

  totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filtered().length / this.itemsPerPage()))
  );

  pageNumbers = computed(() => Array.from({ length: this.totalPages() }, (_, i) => i + 1));

  pageSlice = computed(() => {
    const start = (this.currentPage() - 1) * this.itemsPerPage();
    return this.filtered().slice(start, start + this.itemsPerPage());
  });

  // -------- actions ----------
  onSort(col: SortKey) {
    if (this.sortKey() === col) {
      this.sortDir.set(this.sortDir() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortKey.set(col);
      this.sortDir.set('asc');
    }
  }

  onSearchInput(v: string) {
    this.search.set(v);
    this.currentPage.set(1);
  }

  setPageSize(n: number) {
    this.itemsPerPage.set(n);
    this.currentPage.set(1);
  }

  goToPage(p: number) {
    if (p < 1 || p > this.totalPages()) return;
    this.currentPage.set(p);
  }

  addNewBrand() {
    this.showAddModal.set(true);
  }

  editBrand(brand: BrandRow) {
    this.editingBrand.set(brand);
    this.showEditModal.set(true);
  }

  toggleStatus(brand: BrandRow) {
    this.confirmTarget.set(brand);
    this.confirmAction.set('toggle');
    this.showConfirmModal.set(true);
  }

  onConfirm() {
    const action = this.confirmAction();
    const brand = this.confirmTarget();

    if (!brand) return;

    if (action === 'toggle') {
      const newStatus = brand.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';

      this.http.put(`${this.apiUrl}/admin/categories/${brand.brandID}/status`, { status: newStatus })
        .subscribe({
          next: () => {
            this.loadCategories();
            this.alertService.success(`Brand ${brand.brandName} ${newStatus === 'ACTIVE' ? 'activated' : 'deactivated'} successfully`);
          },
          error: (err) => {
            console.error('Toggle status error:', err);
            this.alertService.error('Failed to update status');
          }
        });
    }

    this.onCancelConfirm();
  }

  onCancelConfirm() {
    this.showConfirmModal.set(false);
    this.confirmAction.set(null);
    this.confirmTarget.set(null);
  }

  getConfirmMessage(): string {
    const brand = this.confirmTarget();
    const action = this.confirmAction();

    if (!brand) return '';

    if (action === 'toggle') {
      const newStatus = brand.status === 'ACTIVE' ? 'deactivate' : 'activate';
      return `Are you sure you want to ${newStatus} brand "${brand.brandName}"?`;
    }

    return '';
  }

  onCloseAddModal() {
    this.showAddModal.set(false);
  }

  onCloseEditModal() {
    this.showEditModal.set(false);
    this.editingBrand.set(null);
  }

  onBrandAdded(newBrand: any) {
    const brandData = {
      brandName: newBrand.brandName,
      description: newBrand.description || ''
    };

    this.http.post(`${this.apiUrl}/admin/categories`, brandData)
      .subscribe({
        next: () => {
          this.loadCategories();
          this.alertService.success('New brand created successfully');
        },
        error: (err) => {
          console.error('Create brand error:', err);
          this.alertService.error('Failed to create brand: ' + (err.error?.message || 'Unknown error'));
        }
      });
  }

  onBrandUpdated(updatedBrand: any) {
    const updateData = {
      brandName: updatedBrand.brandName,
      description: updatedBrand.description || ''
    };

    this.http.put(`${this.apiUrl}/admin/categories/${updatedBrand.brandID}`, updateData)
      .subscribe({
        next: () => {
          this.loadCategories();
          this.alertService.success('Brand updated successfully');
        },
        error: (err) => {
          console.error('Update brand error:', err);
          this.alertService.error('Failed to update brand: ' + (err.error?.message || 'Unknown error'));
        }
      });
  }

  // -------- helper methods ----------
  sortIcon(col: SortKey) {
    if (this.sortKey() !== col) return '↕';
    return this.sortDir() === 'asc' ? '↑' : '↓';
  }

  statusClass(s: BrandStatus) {
    return s === 'ACTIVE' ? 'badge-active' : 'badge-inactive';
  }

  getToggleIconSrc(status: string): string {
    return status === 'ACTIVE' ? 'assets/icons/deactivate.png' : 'assets/icons/activate.png';
  }

  getToggleTitle(status: string): string {
    return status === 'ACTIVE' ? 'Deactivate Brand' : 'Activate Brand';
  }
}
