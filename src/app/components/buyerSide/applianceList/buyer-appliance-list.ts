import { Component, computed, signal, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AlertService } from '../../../services/alert.service';
import { AuthService } from '../../../../auth/auth-service';

interface Category {
  categoryID: string;
  categoryName: string;
}

interface Brand {
  brandID: string;
  brandName: string;
  categoryID: string;
}

interface Appliance {
  applianceID: string;
  categoryID: string;
  brandID: string;
  modelCode: string;
  modelName: string;
  categoryName?: string;
  brandName?: string;
}

type ApplianceStatus = 'ACTIVE' | 'INACTIVE';
type SortKey = 'applianceID' | 'modelCode' | 'modelName' | 'categoryName' | 'brandName' | 'basePrice' | 'status';
type SortDir = 'asc' | 'desc';

interface BuyerAppliance {
  buyerID: string;
  applianceID: string;
  basePrice: number;
  categoryName?: string;
  brandName?: string;
  modelCode?: string;
  modelName?: string;
  image_url?: string;
  status?: ApplianceStatus;
}

@Component({
  selector: 'app-buyer-appliance-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './buyer-appliance-list.html',
  styleUrls: ['./buyer-appliance-list.scss'],
  host: {
    'class': 'buyer-appliance-component'
  }
})
export class BuyerApplianceListComponent implements OnInit {
  private http = inject(HttpClient);
  private alertService = inject(AlertService);
  private auth = inject(AuthService);
  private apiUrl = 'http://localhost:3000/api';

  // State
  buyerAppliances = signal<BuyerAppliance[]>([]);
  categories = signal<Category[]>([]);
  brands = signal<Brand[]>([]);
  appliances = signal<Appliance[]>([]);
  loading = signal<boolean>(false);
  error = signal<string>('');

  // Modal state
  showAddModal = signal(false);
  showEditModal = signal(false);
  editingAppliance = signal<BuyerAppliance | null>(null);
  selectedCategory = signal<string>('');
  selectedBrand = signal<string>('');
  selectedAppliance = signal<string>('');
  basePrice = signal<number | null>(null);

  // Pagination
  itemsPerPage = signal<number>(10);
  currentPage = signal<number>(1);
  itemsPerPageOptions = [10, 20, 30, 50];
  search = signal<string>('');

  // Sorting
  sortKey = signal<SortKey>('applianceID');
  sortDir = signal<SortDir>('asc');

  ngOnInit() {
    this.loadCategories();
    this.loadBrands();
    this.loadAppliances();
    this.loadBuyerAppliances();
  }

  // Cascading dropdowns - filtered lists
  // Brands are filtered based on which brands have appliances in the selected category
  filteredBrands = computed(() => {
    const categoryId = this.selectedCategory();
    if (!categoryId) return [];

    // Get all appliances for the selected category
    const categoryAppliances = this.appliances().filter(a => a.categoryID === categoryId);

    // Get unique brand IDs from those appliances
    const brandIdsInCategory = [...new Set(categoryAppliances.map(a => a.brandID))];

    // Return brands that have appliances in this category
    return this.brands().filter(b => brandIdsInCategory.includes(b.brandID));
  });

  filteredAppliances = computed(() => {
    const categoryId = this.selectedCategory();
    const brandId = this.selectedBrand();

    if (!categoryId) return [];

    let filtered = this.appliances().filter(a => a.categoryID === categoryId);

    if (brandId) {
      filtered = filtered.filter(a => a.brandID === brandId);
    }

    return filtered;
  });

  selectedApplianceDetails = computed(() => {
    const applianceId = this.selectedAppliance();
    if (!applianceId) return null;
    return this.appliances().find(a => a.applianceID === applianceId);
  });

  // Filtered and paginated data
  filteredBuyerAppliances = computed(() => {
    const search = this.search().toLowerCase();
    let filtered = this.buyerAppliances();

    if (search) {
      filtered = filtered.filter(item =>
        (item.categoryName || '').toLowerCase().includes(search) ||
        (item.brandName || '').toLowerCase().includes(search) ||
        (item.modelCode || '').toLowerCase().includes(search) ||
        (item.modelName || '').toLowerCase().includes(search) ||
        (item.basePrice?.toString() || '').includes(search)
      );
    }

    // Apply sorting
    const key = this.sortKey();
    const dir = this.sortDir();
    filtered.sort((a: any, b: any) => {
      let av = a[key] ?? '';
      let bv = b[key] ?? '';

      // For basePrice, compare as numbers
      if (key === 'basePrice') {
        av = Number(av) || 0;
        bv = Number(bv) || 0;
      } else {
        av = av.toString().toLowerCase();
        bv = bv.toString().toLowerCase();
      }

      if (av < bv) return dir === 'asc' ? -1 : 1;
      if (av > bv) return dir === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  });

  totalPages = computed(() => {
    return Math.max(1, Math.ceil(this.filteredBuyerAppliances().length / this.itemsPerPage()));
  });

  paginatedData = computed(() => {
    const data = this.filteredBuyerAppliances();
    const start = (this.currentPage() - 1) * this.itemsPerPage();
    return data.slice(start, start + this.itemsPerPage());
  });

  // API calls
  loadCategories() {
    this.http.get<any[]>(`${this.apiUrl}/admin/categories`)
      .subscribe({
        next: (data) => {
          console.log('Raw categories data from API:', data);
          const activeCategories = data
            .filter(c => c.status === 'ACTIVE')
            .map(c => ({
              categoryID: c.categoryID,
              categoryName: c.categoryName
            }));
          console.log('Active categories after mapping:', activeCategories);
          this.categories.set(activeCategories);
        },
        error: (err) => {
          console.error('Load categories error:', err);
        }
      });
  }

  loadBrands() {
    this.http.get<any[]>(`${this.apiUrl}/admin/brands`)
      .subscribe({
        next: (data) => {
          console.log('Raw brands data from API:', data);
          const activeBrands = data
            .filter(b => b.status === 'ACTIVE')
            .map(b => ({
              brandID: b.brandID,
              brandName: b.brandName,
              categoryID: b.categoryID
            }));
          console.log('Active brands after mapping:', activeBrands);
          this.brands.set(activeBrands);
        },
        error: (err) => {
          console.error('Load brands error:', err);
        }
      });
  }

  loadAppliances() {
    this.http.get<any[]>(`${this.apiUrl}/admin/appliances`)
      .subscribe({
        next: (data) => {
          const activeAppliances = data
            .filter(a => a.status === 'ACTIVE')
            .map(a => ({
              applianceID: a.applianceID,
              categoryID: a.categoryID,
              brandID: a.brandID,
              modelCode: a.modelCode,
              modelName: a.modelName,
              categoryName: a.categoryName,
              brandName: a.brandName
            }));
          this.appliances.set(activeAppliances);
        },
        error: (err) => {
          console.error('Load appliances error:', err);
        }
      });
  }

  loadBuyerAppliances() {
    this.loading.set(true);
    const buyerId = this.auth.user()?.id;
    const token = localStorage.getItem('buyer_token');

    console.log('🔍 Loading buyer appliances...');
    console.log('   Buyer ID:', buyerId);
    console.log('   Token exists:', !!token);
    console.log('   Auth user:', this.auth.user());

    const headers = new HttpHeaders({
      'Authorization': token ? `Bearer ${token}` : ''
    });

    this.http.get<BuyerAppliance[]>(`${this.apiUrl}/buyer/appliances`, { headers })
      .subscribe({
        next: (data) => {
          console.log('✅ Received buyer appliances:', data);
          console.log('   Count:', data.length);
          this.buyerAppliances.set(data);
          this.loading.set(false);
        },
        error: (err) => {
          console.error('❌ Load buyer appliances error:', err);
          console.error('   Status:', err.status);
          console.error('   Message:', err.error?.message);

          // Check if it's an authentication error
          if (err.status === 401) {
            const errorMessage = err.error?.message || '';
            if (errorMessage.includes('expired')) {
              this.error.set('Your session has expired. Please log in again.');
              this.alertService.error('Your session has expired. Please log in again.');
            } else {
              this.error.set('Authentication failed. Please log in again.');
              this.alertService.error('Authentication failed. Please log in again.');
            }
          } else {
            this.error.set('Failed to load appliances');
          }

          this.loading.set(false);
        }
      });
  }

  // Actions
  openAddModal() {
    this.showAddModal.set(true);
    this.resetForm();
  }

  closeAddModal() {
    this.showAddModal.set(false);
    this.resetForm();
  }

  resetForm() {
    this.selectedCategory.set('');
    this.selectedBrand.set('');
    this.selectedAppliance.set('');
    this.basePrice.set(null);
  }

  onCategoryChange(categoryId: string) {
    console.log('Category changed to:', categoryId);
    this.selectedCategory.set(categoryId);
    this.selectedBrand.set('');
    this.selectedAppliance.set('');
    console.log('Filtered brands after change:', this.filteredBrands());
  }

  onBrandChange(brandId: string) {
    this.selectedBrand.set(brandId);
    this.selectedAppliance.set('');
  }

  submitAddAppliance() {
    const applianceId = this.selectedAppliance();
    const price = this.basePrice();

    if (!applianceId || !price || price <= 0) {
      this.alertService.error('Please select an appliance and enter a valid base price');
      return;
    }

    const token = localStorage.getItem('buyer_token');
    const payload = {
      applianceID: applianceId,
      basePrice: price
    };

    const headers = new HttpHeaders({
      'Authorization': token ? `Bearer ${token}` : ''
    });

    this.http.post(`${this.apiUrl}/buyer/appliances`, payload, { headers })
      .subscribe({
        next: () => {
          this.alertService.success('Appliance added successfully');
          this.closeAddModal();
          this.loadBuyerAppliances();
        },
        error: (err) => {
          this.alertService.error(err?.error?.message || 'Failed to add appliance');
        }
      });
  }

  editAppliance(item: BuyerAppliance) {
    this.editingAppliance.set(item);
    this.basePrice.set(item.basePrice);
    this.showEditModal.set(true);
  }

  closeEditModal() {
    this.showEditModal.set(false);
    this.editingAppliance.set(null);
    this.basePrice.set(null);
  }

  submitEditAppliance() {
    const appliance = this.editingAppliance();
    const price = this.basePrice();

    if (!appliance || !price || price <= 0) {
      this.alertService.error('Please enter a valid base price');
      return;
    }

    const token = localStorage.getItem('buyer_token');
    const payload = {
      basePrice: price
    };

    const headers = new HttpHeaders({
      'Authorization': token ? `Bearer ${token}` : ''
    });

    this.http.put(`${this.apiUrl}/buyer/appliances/${appliance.applianceID}`, payload, { headers })
      .subscribe({
        next: () => {
          this.alertService.success('Appliance updated successfully');
          this.closeEditModal();
          this.loadBuyerAppliances();
        },
        error: (err) => {
          this.alertService.error(err?.error?.message || 'Failed to update appliance');
        }
      });
  }

  toggleStatus(item: BuyerAppliance) {
    const currentStatus = item.status || 'ACTIVE';
    const newStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const action = newStatus === 'ACTIVE' ? 'activate' : 'deactivate';

    const token = localStorage.getItem('buyer_token');
    const headers = new HttpHeaders({
      'Authorization': token ? `Bearer ${token}` : ''
    });

    this.http.put(`${this.apiUrl}/buyer/appliances/${item.applianceID}/status`, { status: newStatus }, { headers })
      .subscribe({
        next: () => {
          this.alertService.success(`Appliance ${action}d successfully`);
          this.loadBuyerAppliances();
        },
        error: (err) => {
          this.alertService.error(`Failed to ${action} appliance`);
        }
      });
  }

  // Sorting
  onSort(col: SortKey) {
    if (this.sortKey() === col) {
      this.sortDir.set(this.sortDir() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortKey.set(col);
      this.sortDir.set('asc');
    }
  }

  sortIcon(col: SortKey): string {
    if (this.sortKey() !== col) return '↕';
    return this.sortDir() === 'asc' ? '↑' : '↓';
  }

  // Pagination
  goToPage(page: number) {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
  }

  setPageSize(size: number) {
    this.itemsPerPage.set(size);
    this.currentPage.set(1);
  }

  onSearchInput(value: string) {
    this.search.set(value);
    this.currentPage.set(1);
  }

  getRowNumber(index: number): number {
    return (this.currentPage() - 1) * this.itemsPerPage() + index + 1;
  }

  getImageSrc(image: string | undefined): string {
    return image || 'assets/image/appliance_sample.png';
  }

  getToggleIconSrc(status: string): string {
    return status === 'ACTIVE' ? 'assets/icons/deactivate.png' : 'assets/icons/activate.png';
  }

  getToggleTitle(status: string): string {
    return status === 'ACTIVE' ? 'Deactivate Appliance' : 'Activate Appliance';
  }

  statusClass(status: string): string {
    return status === 'ACTIVE' ? 'badge-active' : 'badge-inactive';
  }
}
