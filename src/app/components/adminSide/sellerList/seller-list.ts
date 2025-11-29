import { Component, computed, signal, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AlertService } from '../../../services/alert.service';
import { BreadcrumbComponent } from '../../../shared/breadcrumb/breadcrumb';

type SellerStatus = 'ACTIVE' | 'INACTIVE';

interface SellerRow {
  id: string;
  sellerId: string;
  fullName: string;
  username: string;
  email: string;
  phone: string;
  address: string;
  status: SellerStatus;
  createdAt: string;
}

type SortKey = 'sellerId' | 'fullName' | 'username' | 'email' | 'status';
type SortDir = 'asc' | 'desc';

@Component({
  selector: 'app-seller-list',
  standalone: true,
  imports: [CommonModule, FormsModule, BreadcrumbComponent],
  templateUrl: './seller-list.html',
  styleUrls: ['./seller-list.scss']
})
export class SellerListComponent implements OnInit {
  private http = inject(HttpClient);
  private alertService = inject(AlertService);
  private apiUrl = 'http://localhost:3000/api';

  // -------- state ----------
  rows = signal<SellerRow[]>([]);
  search = signal<string>('');
  sortKey = signal<SortKey>('fullName');
  sortDir = signal<SortDir>('asc');
  loading = signal<boolean>(false);
  error = signal<string>('');

  itemsPerPageOptions = [10, 20, 30, 50];
  itemsPerPage = signal<number>(10);
  currentPage = signal<number>(1);

  // Confirmation modal
  showConfirmModal = signal(false);
  confirmAction = signal<'toggle' | null>(null);
  confirmTarget = signal<SellerRow | null>(null);

  ngOnInit() {
    this.loadSellers();
  }

  // -------- API calls ----------
  loadSellers() {
    this.loading.set(true);
    this.error.set('');

    this.http.get<any[]>(`${this.apiUrl}/admin/users`)
      .subscribe({
        next: (users) => {
          console.log('📊 Raw users from API:', users);
          // Filter and transform seller users
          const sellerUsers = users
            .filter(user => user.user_type === 'seller')
            .map((user) => {
              console.log(`🔍 Seller User ${user.username} - Full Object:`, user);
              console.log(`🔍 user.id:`, user.id);
              console.log(`🔍 user.seller_id:`, user.seller_id);
              console.log(`🔍 user.userID:`, user.userID);
              console.log(`🔍 user.user_id:`, user.user_id);

              const sellerRow = {
                id: user.id || user.userID || user.user_id || user.seller_id,
                sellerId: user.seller_id || '---',
                fullName: user.name || '',
                username: user.username || '',
                email: user.email || '',
                phone: user.phone || '',
                address: user.address || '',
                status: user.user_status as SellerStatus,
                createdAt: user.created_at || ''
              };

              console.log(`🔍 Mapped SellerRow:`, sellerRow);
              return sellerRow;
            });

          this.rows.set(sellerUsers);
          this.loading.set(false);
        },
        error: (err) => {
          this.error.set('Failed to load sellers');
          this.loading.set(false);
          console.error('Load sellers error:', err);
        }
      });
  }

  // -------- derived computed values ----------
  filtered = computed(() => {
    const q = this.search().trim().toLowerCase();
    const list = this.rows().filter(r =>
      !q ||
      r.fullName.toLowerCase().includes(q) ||
      r.email.toLowerCase().includes(q) ||
      r.phone.toLowerCase().includes(q) ||
      r.sellerId.toLowerCase().includes(q) ||
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

  toggleStatus(seller: SellerRow) {
    this.confirmTarget.set(seller);
    this.confirmAction.set('toggle');
    this.showConfirmModal.set(true);
  }

  onConfirm() {
    const action = this.confirmAction();
    const seller = this.confirmTarget();

    if (!seller) return;

    if (action === 'toggle') {
      const newStatus = seller.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';

      this.http.put(`${this.apiUrl}/admin/users/${seller.id}/status`, { status: newStatus })
        .subscribe({
          next: () => {
            this.loadSellers();
            this.alertService.success(`Seller ${seller.username} ${newStatus === 'ACTIVE' ? 'activated' : 'deactivated'} successfully`);
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
    const seller = this.confirmTarget();
    const action = this.confirmAction();

    if (!seller) return '';

    if (action === 'toggle') {
      const newStatus = seller.status === 'ACTIVE' ? 'deactivate' : 'activate';
      return `Are you sure you want to ${newStatus} seller "${seller.username}"?`;
    }

    return '';
  }

  // -------- helper methods ----------
  statusClass(s: SellerStatus) {
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
    return status === 'ACTIVE' ? 'Deactivate Seller' : 'Activate Seller';
  }
}