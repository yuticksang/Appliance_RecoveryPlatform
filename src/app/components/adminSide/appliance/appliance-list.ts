import { Component, computed, signal, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AlertService } from '../../../services/alert.service';
import { Router } from '@angular/router';
import { AddApplianceComponent } from './add/add-appliance';
import { EditApplianceComponent } from './edit/edit-appliance';

type ApplianceStatus = 'ACTIVE' | 'INACTIVE';

interface Category {
  categoryID: string;
  categoryName: string;
}

interface Brand {
  brandID: string;
  brandName: string;
}

interface ApplianceRow {
  applianceID: string;
  categoryID: string;
  brandID: string;
  modelCode: string;
  modelName: string;
  description: string;
  status: ApplianceStatus;
  categoryName?: string;
  brandName?: string;
  image?: string;
}

type SortKey = 'applianceID' | 'modelCode' | 'modelName' | 'categoryName' | 'brandName' | 'status';
type SortDir = 'asc' | 'desc';

@Component({
  selector: 'app-appliance-list',
  standalone: true,
  imports: [CommonModule, FormsModule, AddApplianceComponent, EditApplianceComponent],
  templateUrl: './appliance-list.html',
  styleUrls: ['./appliance-list.scss']
})
export class ApplianceListComponent implements OnInit {
  private http = inject(HttpClient);
  private alertService = inject(AlertService);
  private router = inject(Router);
  private apiUrl = 'http://localhost:3000/api';

  // -------- state ----------
  rows = signal<ApplianceRow[]>([]);
  categories = signal<Category[]>([]);
  brands = signal<Brand[]>([]);
  search = signal<string>('');
  sortKey = signal<SortKey>('applianceID');
  sortDir = signal<SortDir>('asc');
  loading = signal<boolean>(false);
  error = signal<string>('');

  // Filters
  selectedCategory = signal<string>('');
  selectedBrand = signal<string>('');

  itemsPerPageOptions = [10, 20, 30, 50];
  itemsPerPage = signal<number>(10);
  currentPage = signal<number>(1);

  // Modals
  showAddModal = signal(false);
  showEditModal = signal(false);
  showConfirmModal = signal(false);
  confirmAction = signal<'toggle' | null>(null);
  confirmTarget = signal<ApplianceRow | null>(null);
  editingAppliance = signal<ApplianceRow | null>(null);

  ngOnInit() {
    this.loadCategories();
    this.loadBrands();
    this.loadAppliances();
  }

  // -------- API calls ----------
  loadCategories() {
    this.http.get<any[]>(`${this.apiUrl}/admin/categories`)
      .subscribe({
        next: (data) => {
          this.categories.set(data.map(c => ({
            categoryID: c.categoryID,
            categoryName: c.categoryName
          })));
        },
        error: (err) => {
          console.error('Load categories error:', err);
          this.alertService.error('Failed to load categories');
        }
      });
  }

  loadBrands() {
    this.http.get<any[]>(`${this.apiUrl}/admin/brands`)
      .subscribe({
        next: (data) => {
          this.brands.set(data.map(b => ({
            brandID: b.brandID,
            brandName: b.brandName
          })));
        },
        error: (err) => {
          console.error('Load brands error:', err);
          this.alertService.error('Failed to load brands');
        }
      });
  }

  loadAppliances() {
    this.loading.set(true);
    this.error.set('');

    this.http.get<any[]>(`${this.apiUrl}/admin/appliances`)
      .subscribe({
        next: (appliances) => {
          console.log('📊 Raw appliances from API:', appliances);
          const applianceData = appliances.map((app) => ({
            applianceID: app.applianceID || '',
            categoryID: app.categoryID || '',
            brandID: app.brandID || '',
            modelCode: app.modelCode || '',
            modelName: app.modelName || '',
            description: app.description || '',
            status: app.status as ApplianceStatus || 'ACTIVE',
            categoryName: app.categoryName || '',
            brandName: app.brandName || '',
            image: app.image || ''
          }));

          this.rows.set(applianceData);
          this.loading.set(false);
        },
        error: (err) => {
          this.error.set('Failed to load appliances');
          this.loading.set(false);
          console.error('Load appliances error:', err);
        }
      });
  }

  // -------- derived computed values ----------
  filtered = computed(() => {
    const q = this.search().trim().toLowerCase();
    const cat = this.selectedCategory();
    const brand = this.selectedBrand();

    let list = this.rows().filter(r => {
      const matchesSearch = !q ||
        r.applianceID.toLowerCase().includes(q) ||
        r.modelCode.toLowerCase().includes(q) ||
        r.modelName.toLowerCase().includes(q) ||
        (r.categoryName || '').toLowerCase().includes(q) ||
        (r.brandName || '').toLowerCase().includes(q);

      const matchesCategory = !cat || r.categoryID === cat;
      const matchesBrand = !brand || r.brandID === brand;

      return matchesSearch && matchesCategory && matchesBrand;
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

  onCategoryChange(categoryID: string) {
    this.selectedCategory.set(categoryID);
    this.currentPage.set(1);
  }

  onBrandChange(brandID: string) {
    this.selectedBrand.set(brandID);
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

  addNewAppliance() {
    // Navigate to add appliance page (you'll need to create this)
    this.router.navigate(['/admin/appliances/add']);
  }

  editAppliance(appliance: ApplianceRow) {
    // Navigate to edit appliance page (you'll need to create this)
    this.router.navigate(['/admin/appliances/edit', appliance.applianceID]);
  }

  deleteAppliance(appliance: ApplianceRow) {
    this.confirmTarget.set(appliance);
    this.confirmAction.set('delete');
    this.showConfirmModal.set(true);
  }

  onConfirm() {
    const action = this.confirmAction();
    const appliance = this.confirmTarget();

    if (!appliance) return;

    if (action === 'delete') {
      this.http.delete(`${this.apiUrl}/admin/appliances/${appliance.applianceID}`)
        .subscribe({
          next: () => {
            this.loadAppliances();
            this.alertService.success(`Appliance ${appliance.modelCode} deleted successfully`);
            this.showConfirmModal.set(false);
          },
          error: (err) => {
            console.error('Delete appliance error:', err);
            this.alertService.error('Failed to delete appliance');
          }
        });
    }
  }

  onCancelConfirm() {
    this.showConfirmModal.set(false);
    this.confirmAction.set(null);
    this.confirmTarget.set(null);
  }

  getConfirmMessage(): string {
    const appliance = this.confirmTarget();
    const action = this.confirmAction();

    if (!appliance) return '';

    if (action === 'delete') {
      return `Are you sure you want to delete appliance "${appliance.modelCode}"? This action cannot be undone.`;
    }

    return '';
  }

  // -------- helper methods ----------
  sortIcon(col: SortKey) {
    if (this.sortKey() !== col) return '↕';
    return this.sortDir() === 'asc' ? '↑' : '↓';
  }

  getImageSrc(image: string | undefined): string {
    return image || 'assets/image/placeholder-appliance.png';
  }
}
