import { Component, computed, signal, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AlertService } from '../../../services/alert.service';
import { AddCategoryComponent } from './add/add-category';
import { EditCategoryComponent } from './edit/edit-category';

type CategoryStatus = 'ACTIVE' | 'INACTIVE';

interface CategoryRow {
  categoryID: string;
  categoryName: string;
  description: string;
  count: number;
  status: CategoryStatus;
  created_at: string;
}

type SortKey = 'categoryID' | 'categoryName' | 'count' | 'status';
type SortDir = 'asc' | 'desc';

@Component({
  selector: 'app-category-list',
  standalone: true,
  imports: [CommonModule, FormsModule, AddCategoryComponent, EditCategoryComponent],
  templateUrl: './category-list.html',
  styleUrls: ['./category-list.scss']
})
export class CategoryListComponent implements OnInit {
  private http = inject(HttpClient);
  private alertService = inject(AlertService);
  private apiUrl = 'http://localhost:3000/api';

  // -------- state ----------
  rows = signal<CategoryRow[]>([]);
  search = signal<string>('');
  sortKey = signal<SortKey>('categoryID');
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
  confirmTarget = signal<CategoryRow | null>(null);
  editingCategory = signal<CategoryRow | null>(null);

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
          const categoryData = categories.map((cat) => ({
            categoryID: cat.categoryID || '',
            categoryName: cat.categoryName || '',
            description: cat.description || '',
            count: cat.count || 0,
            status: cat.status as CategoryStatus || 'ACTIVE',
            created_at: cat.created_at || ''
          }));

          this.rows.set(categoryData);
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
        r.categoryID.toLowerCase().includes(q) ||
        r.categoryName.toLowerCase().includes(q) ||
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

  addNewCategory() {
    this.showAddModal.set(true);
  }

  editCategory(category: CategoryRow) {
    this.editingCategory.set(category);
    this.showEditModal.set(true);
  }

  toggleStatus(category: CategoryRow) {
    this.confirmTarget.set(category);
    this.confirmAction.set('toggle');
    this.showConfirmModal.set(true);
  }

  onConfirm() {
    const action = this.confirmAction();
    const category = this.confirmTarget();

    if (!category) return;

    if (action === 'toggle') {
      const newStatus = category.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';

      this.http.put(`${this.apiUrl}/admin/categories/${category.categoryID}/status`, { status: newStatus })
        .subscribe({
          next: () => {
            this.loadCategories();
            this.alertService.success(`Category ${category.categoryName} ${newStatus === 'ACTIVE' ? 'activated' : 'deactivated'} successfully`);
          },
          error: (err) => {
            console.error('Toggle status error:', err);
            this.alertService.error(err.error?.message || 'Failed to update status');
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
    const category = this.confirmTarget();
    const action = this.confirmAction();

    if (!category) return '';

    if (action === 'toggle') {
      const newStatus = category.status === 'ACTIVE' ? 'deactivate' : 'activate';
      return `Are you sure you want to ${newStatus} category "${category.categoryName}"?`;
    }

    return '';
  }

  onCloseAddModal() {
    this.showAddModal.set(false);
  }

  onCloseEditModal() {
    this.showEditModal.set(false);
    this.editingCategory.set(null);
  }

  onCategoryAdded(newCategory: any) {
    const categoryData = {
      categoryName: newCategory.categoryName,
      description: newCategory.description || ''
    };

    this.http.post(`${this.apiUrl}/admin/categories`, categoryData)
      .subscribe({
        next: () => {
          this.loadCategories();
          this.alertService.success('New category created successfully');
        },
        error: (err) => {
          console.error('Create category error:', err);
          this.alertService.error('Failed to create category: ' + (err.error?.message || 'Unknown error'));
        }
      });
  }

  onCategoryUpdated(updatedCategory: any) {
    const updateData = {
      categoryName: updatedCategory.categoryName,
      description: updatedCategory.description || ''
    };

    this.http.put(`${this.apiUrl}/admin/categories/${updatedCategory.categoryID}`, updateData)
      .subscribe({
        next: () => {
          this.loadCategories();
          this.alertService.success('Category updated successfully');
        },
        error: (err) => {
          console.error('Update category error:', err);
          this.alertService.error('Failed to update category: ' + (err.error?.message || 'Unknown error'));
        }
      });
  }

  // -------- helper methods ----------
  sortIcon(col: SortKey) {
    if (this.sortKey() !== col) return '↕';
    return this.sortDir() === 'asc' ? '↑' : '↓';
  }

  statusClass(s: CategoryStatus) {
    return s === 'ACTIVE' ? 'badge-active' : 'badge-inactive';
  }

  getToggleIconSrc(status: string): string {
    return status === 'ACTIVE' ? 'assets/icons/deactivate.png' : 'assets/icons/activate.png';
  }

  getToggleTitle(status: string): string {
    return status === 'ACTIVE' ? 'Deactivate Category' : 'Activate Category';
  }
}
