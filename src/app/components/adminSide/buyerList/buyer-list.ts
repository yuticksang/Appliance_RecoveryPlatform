import { Component, computed, signal, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AddBuyerComponent } from './add/add-buyer';
import { EditBuyerComponent } from './edit/edit-buyer';
import { AlertService } from '../../../services/alert.service';
import { BreadcrumbComponent } from '../../../shared/breadcrumb/breadcrumb';

type BuyerStatus = 'ACTIVE' | 'INACTIVE';

interface BuyerRow {
  id: string;
  buyerId: string;
  fullName: string;
  username: string;
  email: string;
  phone: string;
  maskedPassword: string;
  status: BuyerStatus;
  userType: string;
}

type SortKey = 'buyerId' | 'fullName' | 'username' | 'email' | 'phone' | 'status';
type SortDir = 'asc' | 'desc';

@Component({
  selector: 'app-buyer-list',
  standalone: true,
  imports: [CommonModule, FormsModule, AddBuyerComponent, EditBuyerComponent, BreadcrumbComponent],
  templateUrl: './buyer-list.html',
  styleUrls: ['./buyer-list.scss']
})
export class BuyerListComponent implements OnInit {
  private http = inject(HttpClient);
  private alertService = inject(AlertService);
  private apiUrl = 'http://localhost:3000/api';

  // -------- state ----------
  rows = signal<BuyerRow[]>([]);
  search = signal<string>('');
  sortKey = signal<SortKey>('buyerId');
  sortDir = signal<SortDir>('asc');
  loading = signal<boolean>(false);
  error = signal<string>('');

  itemsPerPageOptions = [10, 20, 30, 50];
  itemsPerPage = signal<number>(10);
  currentPage = signal<number>(1);

  // Modal control signals
  showAddModal = signal(false);
  showEditModal = signal(false);
  selectedBuyer = signal<BuyerRow | null>(null);

  // Confirmation modal
  showConfirmModal = signal(false);
  confirmAction = signal<'toggle' | null>(null);
  confirmTarget = signal<BuyerRow | null>(null);

  ngOnInit() {
    this.loadBuyers();
  }

  // -------- API calls ----------
  loadBuyers() {
    this.loading.set(true);
    this.error.set('');

    this.http.get<any[]>(`${this.apiUrl}/admin/users`)
      .subscribe({
        next: (users) => {
          console.log('=� Raw users from API:', users);
          // Filter and transform buyer users
          const buyerUsers = users
            .filter(user => user.user_type === 'buyer')
            .map((user) => {
              console.log(`🔍 Buyer User ${user.username} - Full Object:`, user);
              console.log(`🔍 user.id:`, user.id);
              console.log(`🔍 user.buyer_id:`, user.buyer_id);
              console.log(`🔍 user.userID:`, user.userID);
              console.log(`🔍 user.user_id:`, user.user_id);

              const buyerRow = {
                id: user.id || user.userID || user.user_id || user.buyer_id,
                buyerId: user.buyer_id ? String(user.buyer_id) : '---',
                fullName: user.name,
                username: user.username,
                email: user.email || '---',
                phone: user.phone || '---',
                maskedPassword: 'XXXX',
                status: user.user_status as BuyerStatus,
                userType: user.user_type
              };

              console.log(`🔍 Mapped BuyerRow:`, buyerRow);
              return buyerRow;
            });

          this.rows.set(buyerUsers);
          this.loading.set(false);
        },
        error: (err) => {
          this.error.set('Failed to load buyer users');
          this.loading.set(false);
          console.error('Load buyers error:', err);
        }
      });
  }

  checkUsernameUnique(username: string, excludeId?: string): Promise<boolean> {
    return new Promise((resolve) => {
      // Pass user_type as query parameter to check username uniqueness per type
      this.http.get<{ available: boolean }>(`${this.apiUrl}/admin/check-username/${username}?user_type=buyer`)
        .subscribe({
          next: (response) => {
            // If we're editing, exclude the current user from the check
            if (excludeId) {
              const existingUser = this.rows().find(u => u.username === username && u.id !== excludeId);
              resolve(!existingUser);
            } else {
              resolve(response.available);
            }
          },
          error: () => {
            // If API fails, check locally
            const existingUser = this.rows().find(u => u.username === username && u.id !== excludeId);
            resolve(!existingUser);
          }
        });
    });
  }

  // -------- derived computed values ----------
  filtered = computed(() => {
    const q = this.search().trim().toLowerCase();
    const list = this.rows().filter(r =>
      !q ||
      r.buyerId.toLowerCase().includes(q) ||
      r.fullName.toLowerCase().includes(q) ||
      r.username.toLowerCase().includes(q) ||
      r.email.toLowerCase().includes(q) ||
      r.phone.toLowerCase().includes(q) ||
      r.status.toLowerCase().includes(q)
    );

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

  // -------- Modal methods ----------
  addNewBuyer() {
    this.showAddModal.set(true);
  }

  editBuyer(buyer: BuyerRow) {
    this.selectedBuyer.set(buyer);
    this.showEditModal.set(true);
  }

  onCloseAddModal() {
    this.showAddModal.set(false);
  }

  onCloseEditModal() {
    this.showEditModal.set(false);
    this.selectedBuyer.set(null);
  }

  async onBuyerAdded(newBuyer: any) {
    // Check if username is unique
    const isUnique = await this.checkUsernameUnique(newBuyer.username);
    if (!isUnique) {
      this.alertService.error('Username already exists. Please choose a different username.');
      return;
    }

    // Create new buyer via API
    const buyerData = {
      password: newBuyer.password,
      name: newBuyer.fullName,
      username: newBuyer.username,
      email: newBuyer.email || '',
      phone: newBuyer.phone || '',
      user_type: 'buyer'
    };

    this.http.post(`${this.apiUrl}/admin/create-user`, buyerData)
      .subscribe({
        next: () => {
          this.loadBuyers(); // Reload the list
          this.alertService.success('New buyer created successfully');
        },
        error: (err) => {
          console.error('Create buyer error:', err);
          this.alertService.error('Failed to create buyer: ' + (err.error?.message || 'Unknown error'));
        }
      });
  }

  async onBuyerUpdated(updatedBuyer: any) {
    // Get the original buyer data to find the current username
    const originalBuyer = this.selectedBuyer();
    console.log('📝 Updating buyer. Original:', originalBuyer);
    console.log('📝 Updated data:', updatedBuyer);

    if (!originalBuyer) {
      this.alertService.error('Original buyer data not found');
      return;
    }

    // Check if username is unique (excluding current user)
    const isUnique = await this.checkUsernameUnique(updatedBuyer.username, updatedBuyer.id);
    if (!isUnique) {
      this.alertService.error('Username already exists. Please choose a different username.');
      return;
    }

    // Update buyer via API - use ORIGINAL username to identify the user
    const updateData: any = {
      name: updatedBuyer.fullName,
      username: updatedBuyer.username,
      email: updatedBuyer.email,
      phone: updatedBuyer.phone
    };

    // Include password if provided
    if (updatedBuyer.password) {
      updateData.password = updatedBuyer.password;
    }

    console.log('📝 Using originalBuyer.id:', originalBuyer.id);
    console.log('📝 API URL:', `${this.apiUrl}/admin/users/${originalBuyer.id}`);
    console.log('📝 Update data:', updateData);

    this.http.put(`${this.apiUrl}/admin/users/${originalBuyer.id}`, updateData)
      .subscribe({
        next: () => {
          this.loadBuyers(); // Reload the list
          this.onCloseEditModal();
          const message = updatedBuyer.password ? 'Buyer and password updated successfully' : 'Buyer updated successfully';
          this.alertService.success(message);
        },
        error: (err) => {
          console.error('Update buyer error:', err);
          this.alertService.error('Failed to update buyer: ' + (err.error?.message || 'Unknown error'));
        }
      });
  }

  toggleStatus(buyer: BuyerRow) {
    this.confirmTarget.set(buyer);
    this.confirmAction.set('toggle');
    this.showConfirmModal.set(true);
  }

  onConfirm() {
    const action = this.confirmAction();
    const buyer = this.confirmTarget();

    if (!buyer) return;

    if (action === 'toggle') {
      const newStatus = buyer.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      console.log('🔄 Toggling status for buyer:', buyer);
      console.log('🔄 Using buyer.id:', buyer.id);
      console.log('🔄 API URL:', `${this.apiUrl}/admin/users/${buyer.id}/status`);

      this.http.put(`${this.apiUrl}/admin/users/${buyer.id}/status`, { status: newStatus })
        .subscribe({
          next: () => {
            this.loadBuyers();
            this.alertService.success(`Buyer ${buyer.username} ${newStatus === 'ACTIVE' ? 'activated' : 'deactivated'} successfully`);
          },
          error: (err) => {
            console.error('Toggle status error:', err);
            this.alertService.error('Failed to update status: ' + (err.error?.message || 'Unknown error'));
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
    const buyer = this.confirmTarget();
    const action = this.confirmAction();

    if (!buyer) return '';

    if (action === 'toggle') {
      const newStatus = buyer.status === 'ACTIVE' ? 'deactivate' : 'activate';
      return `Are you sure you want to ${newStatus} buyer "${buyer.username}"?`;
    }

    return '';
  }

  // -------- helper methods ----------
  statusClass(s: BuyerStatus) {
    return s === 'ACTIVE' ? 'badge-active' : 'badge-inactive';
  }

  sortIcon(col: SortKey) {
    if (this.sortKey() !== col) return '↕';
    return this.sortDir() === 'asc' ? '↑' : '↓';
  }

  getToggleIconSrc(status: string): string {
    return status === 'ACTIVE' ? 'assets/icons/deactivate.png' : 'assets/icons/activate.png';
  }

  getToggleTitle(status: string): string {
    return status === 'ACTIVE' ? 'Deactivate Buyer' : 'Activate Buyer';
  }
}