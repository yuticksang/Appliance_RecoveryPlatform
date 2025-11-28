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
  image_url?: string;
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

  // -------- API calls ----------ac
  loadCategories() {
    this.http.get<any[]>(`${this.apiUrl}/admin/categories`)
      .subscribe({
        next: (data) => {
          // Only include ACTIVE categories
          const activeCategories = data
            .filter(c => c.status === 'ACTIVE')
            .map(c => ({
              categoryID: c.categoryID,
              categoryName: c.categoryName
            }));
          this.categories.set(activeCategories);
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
          // Only include ACTIVE brands
          const activeBrands = data
            .filter(b => b.status === 'ACTIVE')
            .map(b => ({
              brandID: b.brandID,
              brandName: b.brandName
            }));
          this.brands.set(activeBrands);
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
            image_url: app.image_url || ''
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
    this.showAddModal.set(true);
  }

  editAppliance(appliance: ApplianceRow) {
    this.editingAppliance.set(appliance);
    this.showEditModal.set(true);
  }

  toggleStatus(appliance: ApplianceRow) {
    this.confirmTarget.set(appliance);
    this.confirmAction.set('toggle');
    this.showConfirmModal.set(true);
  }

  onConfirm() {
    const action = this.confirmAction();
    const appliance = this.confirmTarget();

    if (!appliance) return;

    if (action === 'toggle') {
      const newStatus = appliance.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';

      this.http.put(`${this.apiUrl}/admin/appliances/${appliance.applianceID}/status`, { status: newStatus })
        .subscribe({
          next: () => {
            this.loadAppliances();
            this.alertService.success(`Appliance ${appliance.modelCode} ${newStatus === 'ACTIVE' ? 'activated' : 'deactivated'} successfully`);
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
    const appliance = this.confirmTarget();
    const action = this.confirmAction();

    if (!appliance) return '';

    if (action === 'toggle') {
      const newStatus = appliance.status === 'ACTIVE' ? 'deactivate' : 'activate';
      return `Are you sure you want to ${newStatus} appliance "${appliance.modelCode}"?`;
    }

    return '';
  }

  onCloseAddModal() {
    this.showAddModal.set(false);
  }

  onCloseEditModal() {
    this.showEditModal.set(false);
    this.editingAppliance.set(null);
  }

  onApplianceAdded(newAppliance: any) {
    // Create FormData to send file and other data
    const formData = new FormData();
    formData.append('categoryID', newAppliance.categoryID);
    formData.append('brandID', newAppliance.brandID);
    formData.append('modelCode', newAppliance.modelCode);
    formData.append('modelName', newAppliance.modelName);
    formData.append('description', newAppliance.description || '');

    // Add image file if selected
    if (newAppliance.imageFile) {
      formData.append('image', newAppliance.imageFile);
      console.log('📸 Uploading new appliance image:', newAppliance.imageFile.name);
    }

    this.http.post(`${this.apiUrl}/admin/appliances`, formData)
      .subscribe({
        next: () => {
          this.loadAppliances();
          this.alertService.success('New appliance created successfully');
        },
        error: (err) => {
          console.error('Create appliance error:', err);
          this.alertService.error('Failed to create appliance: ' + (err.error?.message || 'Unknown error'));
        }
      });
  }

  onApplianceUpdated(updatedAppliance: any) {
    // Create FormData to send file and other data
    const formData = new FormData();
    formData.append('categoryID', updatedAppliance.categoryID);
    formData.append('brandID', updatedAppliance.brandID);
    formData.append('modelCode', updatedAppliance.modelCode);
    formData.append('modelName', updatedAppliance.modelName);
    formData.append('description', updatedAppliance.description || '');

    // Add image file if selected, otherwise keep existing URL
    if (updatedAppliance.imageFile) {
      formData.append('image', updatedAppliance.imageFile);
      console.log('📸 Uploading new image file:', updatedAppliance.imageFile.name);
    } else if (updatedAppliance.imageUrl) {
      formData.append('imageUrl', updatedAppliance.imageUrl);
    }

    this.http.put(`${this.apiUrl}/admin/appliances/${updatedAppliance.applianceID}`, formData)
      .subscribe({
        next: () => {
          this.loadAppliances();
          this.alertService.success('Appliance updated successfully');
        },
        error: (err) => {
          console.error('Update appliance error:', err);
          this.alertService.error('Failed to update appliance: ' + (err.error?.message || 'Unknown error'));
        }
      });
  }

  // -------- helper methods ----------
  sortIcon(col: SortKey) {
    if (this.sortKey() !== col) return '↕';
    return this.sortDir() === 'asc' ? '↑' : '↓';
  }

  getImageSrc(image: string | undefined): string {
    return image || 'assets/image/appliance_sample.png';
  }

  statusClass(s: ApplianceStatus) {
    return s === 'ACTIVE' ? 'badge-active' : 'badge-inactive';
  }

  getToggleIconSrc(status: string): string {
    return status === 'ACTIVE' ? 'assets/icons/deactivate.png' : 'assets/icons/activate.png';
  }

  getToggleTitle(status: string): string {
    return status === 'ACTIVE' ? 'Deactivate Appliance' : 'Activate Appliance';
  }
}
