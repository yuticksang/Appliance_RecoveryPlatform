import { Component, computed, signal, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AddAdminComponent } from './add/add-admin';
import { EditAdminComponent } from './edit/edit-admin';
import { AlertService } from '../../../services/alert.service';

type AdminRole = 'SUPER ADMIN' | 'ADMIN';
type AdminStatus = 'ACTIVE' | 'INACTIVE';

interface AdminRow {
  id: string;
  adminId: string;
  fullName: string;
  username: string;
  role: AdminRole;
  maskedPassword: string;
  status: AdminStatus;
  userType: string;
  adminRole: string | null;
}

type SortKey = 'adminId' | 'fullName' | 'username' | 'role' | 'status';
type SortDir = 'asc' | 'desc';

@Component({
  selector: 'app-admin-list',
  standalone: true,
  imports: [CommonModule, FormsModule, AddAdminComponent, EditAdminComponent],
  templateUrl: './admin-list.html',
  styleUrls: ['./admin-list.scss']
})
export class AdminListComponent implements OnInit {
  private http = inject(HttpClient);
  private alertService = inject(AlertService);
  private apiUrl = 'http://localhost:3000/api';

  // -------- state ----------
  rows = signal<AdminRow[]>([]);
  search = signal<string>('');
  sortKey = signal<SortKey>('adminId');
  sortDir = signal<SortDir>('asc');
  loading = signal<boolean>(false);
  error = signal<string>('');

  itemsPerPageOptions = [10, 20, 30, 50];
  itemsPerPage = signal<number>(10);
  currentPage = signal<number>(1);

  // Modal control signals
  showAddModal = signal(false);
  showEditModal = signal(false);
  selectedAdmin = signal<AdminRow | null>(null);

  // Confirmation modal
  showConfirmModal = signal(false);
  confirmAction = signal<'delete' | 'toggle' | null>(null);
  confirmTarget = signal<AdminRow | null>(null);

  ngOnInit() {
    this.loadAdmins();
  }

  // -------- API calls ----------
  loadAdmins() {
    this.loading.set(true);
    this.error.set('');

    this.http.get<any[]>(`${this.apiUrl}/admin/users`)
      .subscribe({
        next: (users) => {
          console.log('📊 Raw users from API:', users);
          // Filter and transform admin users
          const adminUsers = users
            .filter(user => user.user_type === 'admin' || user.user_type === 'superadmin')
            .map((user) => {
              console.log(`🔍 Admin User ${user.username} - Full Object:`, user);
              console.log(`🔍 user.id:`, user.id);
              console.log(`🔍 user.admin_id:`, user.admin_id);
              console.log(`🔍 user.userID:`, user.userID);
              console.log(`🔍 user.user_id:`, user.user_id);

              const adminRow = {
                id: user.id || user.userID || user.user_id || user.admin_id,
                adminId: user.admin_id ? String(user.admin_id) : '---',
                fullName: user.name,
                username: user.username,
                role: user.user_type === 'superadmin' ? 'SUPER ADMIN' as AdminRole : 'ADMIN' as AdminRole,
                maskedPassword: 'XXXX',
                status: user.user_status as AdminStatus,
                userType: user.user_type,
                adminRole: user.admin_role
              };

              console.log(`🔍 Mapped AdminRow:`, adminRow);
              return adminRow;
            });

          this.rows.set(adminUsers);
          this.loading.set(false);
        },
        error: (err) => {
          this.error.set('Failed to load admin users');
          this.loading.set(false);
          console.error('Load admins error:', err);
        }
      });
  }

  checkUsernameUnique(username: string, excludeId?: string): Promise<boolean> {
    return new Promise((resolve) => {
      this.http.get<{available: boolean}>(`${this.apiUrl}/admin/check-username/${username}`)
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
      r.adminId.toLowerCase().includes(q) ||
      r.fullName.toLowerCase().includes(q) ||
      r.username.toLowerCase().includes(q) ||
      r.role.toLowerCase().includes(q) ||
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
  addNewAdmin() {
    this.showAddModal.set(true);
  }

  editAdmin(admin: AdminRow) {
    this.selectedAdmin.set(admin);
    this.showEditModal.set(true);
  }

  onCloseAddModal() {
    this.showAddModal.set(false);
  }

  onCloseEditModal() {
    this.showEditModal.set(false);
    this.selectedAdmin.set(null);
  }

  async onAdminAdded(newAdmin: any) {
    // Check if username is unique
    const isUnique = await this.checkUsernameUnique(newAdmin.username);
    if (!isUnique) {
      this.alertService.error('Username already exists. Please choose a different username.');
      return;
    }

    // Create new admin via API
    const adminData = {
      password: newAdmin.password,
      name: newAdmin.fullName,
      username: newAdmin.username,
      phone: newAdmin.phone || '',
      user_type: 'admin',
      admin_role: 'ADMIN'
    };

    this.http.post(`${this.apiUrl}/admin/create-user`, adminData)
      .subscribe({
        next: () => {
          this.loadAdmins(); // Reload the list
          this.alertService.success('New admin created successfully');
        },
        error: (err) => {
          console.error('Create admin error:', err);
          this.alertService.error('Failed to create admin: ' + (err.error?.message || 'Unknown error'));
        }
      });
  }

  async onAdminUpdated(updatedAdmin: any) {
    // Get the original admin data to find the current username
    const originalAdmin = this.selectedAdmin();
    if (!originalAdmin) {
      this.alertService.error('Original admin data not found');
      return;
    }

    // Check if username is unique (excluding current user)
    const isUnique = await this.checkUsernameUnique(updatedAdmin.username, updatedAdmin.id);
    if (!isUnique) {
      this.alertService.error('Username already exists. Please choose a different username.');
      return;
    }

    // Update admin via API - use ORIGINAL username to identify the user
    const updateData: any = {
      name: updatedAdmin.fullName,
      username: updatedAdmin.username
    };

    // Include password if provided (only superadmin can change passwords)
    if (updatedAdmin.password) {
      updateData.password = updatedAdmin.password;
    }

    this.http.put(`${this.apiUrl}/admin/users/${originalAdmin.id}`, updateData)
      .subscribe({
        next: () => {
          this.loadAdmins(); // Reload the list
          this.onCloseEditModal();
          const message = updatedAdmin.password ? 'Admin and password updated successfully' : 'Admin updated successfully';
          this.alertService.success(message);
        },
        error: (err) => {
          console.error('Update admin error:', err);
          this.alertService.error('Failed to update admin: ' + (err.error?.message || 'Unknown error'));
        }
      });
  }

  toggleStatus(admin: AdminRow) {
    this.confirmTarget.set(admin);
    this.confirmAction.set('toggle');
    this.showConfirmModal.set(true);
  }

  deleteAdmin(admin: AdminRow) {
    this.confirmTarget.set(admin);
    this.confirmAction.set('delete');
    this.showConfirmModal.set(true);
  }

  onConfirm() {
    const action = this.confirmAction();
    const admin = this.confirmTarget();

    if (!admin) return;

    if (action === 'toggle') {
      const newStatus = admin.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      console.log('🔄 Toggling admin:', admin);
      console.log('🔄 admin.id:', admin.id);
      console.log('🔄 admin.username:', admin.username);
      console.log('🔄 API URL:', `${this.apiUrl}/admin/users/${admin.id}/status`);

      this.http.put(`${this.apiUrl}/admin/users/${admin.id}/status`, { status: newStatus })
        .subscribe({
          next: () => {
            this.loadAdmins();
            this.alertService.success(`Admin ${admin.username} ${newStatus === 'ACTIVE' ? 'activated' : 'deactivated'} successfully`);
          },
          error: (err) => {
            console.error('Toggle status error:', err);
            this.alertService.error('Failed to update status');
          }
        });
    } else if (action === 'delete') {
      this.http.delete(`${this.apiUrl}/admin/users/${admin.id}`)
        .subscribe({
          next: () => {
            this.loadAdmins();
            this.alertService.success(`Admin ${admin.username} deleted successfully`);
          },
          error: (err) => {
            console.error('Delete admin error:', err);
            this.alertService.error('Failed to delete admin');
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
    const admin = this.confirmTarget();
    const action = this.confirmAction();

    if (!admin) return '';

    if (action === 'delete') {
      return `Are you sure you want to delete admin "${admin.username}"?`;
    } else if (action === 'toggle') {
      const newStatus = admin.status === 'ACTIVE' ? 'deactivate' : 'activate';
      return `Are you sure you want to ${newStatus} admin "${admin.username}"?`;
    }

    return '';
  }

  // -------- helper methods ----------
  statusClass(s: AdminStatus) {
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
    return status === 'ACTIVE' ? 'Deactivate Admin' : 'Activate Admin';
  }
}
