import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TransactionService } from '../../../services/transaction.service';
import { AlertService } from '../../../services/alert.service';

@Component({
  selector: 'app-admin-transaction-detail',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-transaction-detail.html',
  styleUrls: ['./admin-transaction-detail.scss']
})
export class AdminTransactionDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private transactionService = inject(TransactionService);
  private alertService = inject(AlertService);

  transaction = signal<any>(null);
  loading = signal<boolean>(true);
  editMode = signal<boolean>(false);

  // Editable fields
  transactionStatus = '';
  itemStatus = '';
  finalPrice = 0;
  brand = '';
  model = '';
  category = '';
  modelName = '';
  functionalStatus = '';
  appearanceStatus = '';
  note = '';

  // Dropdown options
  functionalStatuses = [
    'Fully Functioning',
    'Partially Functioning',
    'Not Functioning'
  ];

  appearanceStatuses = [
    'Likely New',
    'Minor Scratches',
    'Missing Parts',
    'Heavily Damaged',
    'Rust or Corrosion'
  ];

  transactionStatuses = [
    'Under Review',
    'Awaiting Confirmation',
    'Pending Payment',
    'Completed',
    'Rejected',
    'Cancelled',
    'Confirmed',
    'Picked Up'
  ];

  itemStatuses = [
    'Awaiting Pick Up',
    'Picked Up',
    'Returned',
    'Unresponded',
    'Awaiting Return'
  ];

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadTransactionDetail(id);
    }
  }

  loadTransactionDetail(id: string): void {
    this.loading.set(true);
    this.transactionService.getTransactionById(id).subscribe({
      next: (data) => {
        console.log('📦 Transaction detail loaded:', data);

        // Map the transaction data including contact info
        const mappedData = {
          ...data,
          sellerPhone: data.sellerPhone || data.addressPhone || 'N/A',
          pickupAddress: data.pickupAddress || 'N/A',
          city: data.city || '',
          state: data.state || '',
          zipCode: data.zipCode || ''
        };

        this.transaction.set(mappedData);
        this.transactionStatus = data.transactionStatus;
        this.itemStatus = data.itemStatus;
        this.finalPrice = data.finalPrice || data.estimatedPrice;
        this.brand = data.brand || '';
        this.model = data.model || '';
        this.category = data.category || '';
        this.modelName = data.modelName || '';
        this.functionalStatus = data.initialFunctionalStatus || '';
        this.appearanceStatus = data.initialPhysicalCondition || '';
        this.note = data.note || '';
        this.loading.set(false);
      },
      error: (error) => {
        console.error('❌ Error loading transaction:', error);
        this.alertService.error('Failed to load transaction details');
        this.loading.set(false);
      }
    });
  }

  // Check if transaction is under review or awaiting pick up (hasn't been reviewed yet)
  isUnderReviewOrAwaitingPickup(): boolean {
    const status = this.transaction()?.transactionStatus;
    return status === 'Under Review' ||
           status === 'Awaiting Pick Up' ||
           this.transaction()?.itemStatus === 'Awaiting Pick Up';
  }

  toggleEditMode(): void {
    this.editMode.set(!this.editMode());
  }

  saveChanges(): void {
    const txn = this.transaction();
    if (!txn) return;

    console.log('💾 Saving changes for transaction:', txn.id);

    const updateData = {
      transactionStatus: this.transactionStatus,
      itemStatus: this.itemStatus,
      finalPrice: this.finalPrice,
      brand: this.brand,
      model: this.model,
      category: this.category,
      modelName: this.modelName,
      initialFunctionalStatus: this.functionalStatus,
      initialPhysicalCondition: this.appearanceStatus,
      note: this.note
    };

    this.transactionService.updateTransaction(txn.id, updateData).subscribe({
      next: () => {
        this.alertService.success('Transaction updated successfully');
        this.editMode.set(false);
        this.loadTransactionDetail(txn.id); // Reload to get fresh data
      },
      error: (error) => {
        console.error('❌ Error updating transaction:', error);
        this.alertService.error('Failed to update transaction');
      }
    });
  }

  cancelEdit(): void {
    // Reset values to original
    const txn = this.transaction();
    if (txn) {
      this.transactionStatus = txn.transactionStatus;
      this.itemStatus = txn.itemStatus;
      this.finalPrice = txn.finalPrice || txn.estimatedPrice;
      this.brand = txn.brand || '';
      this.model = txn.model || '';
      this.category = txn.category || '';
      this.modelName = txn.modelName || '';
      this.functionalStatus = txn.initialFunctionalStatus || '';
      this.appearanceStatus = txn.initialPhysicalCondition || '';
      this.note = txn.note || '';
    }
    this.editMode.set(false);
  }

  goBack(): void {
    this.router.navigate(['/admin/transactions']);
  }

  getStatusClass(status: string): string {
    const statusMap: { [key: string]: string } = {
      'Pending Payment': 'status-pending-payment',
      'Completed': 'status-completed',
      'Returned': 'status-returned',
      'Rejected': 'status-rejected',
      'Cancelled': 'status-cancelled',
      'Awaiting Confirmation': 'status-awaiting',
      'Confirmed': 'status-confirmed',
      'Under Review': 'status-review',
      'Picked Up': 'status-picked-up'
    };
    return statusMap[status] || '';
  }

  getItemStatusClass(status: string): string {
    const statusMap: { [key: string]: string } = {
      'Picked Up': 'item-picked-up',
      'Returned': 'item-returned',
      'Awaiting Pick Up': 'item-awaiting',
      'Awaiting Picked Up': 'item-awaiting',
      'Pending Further Action': 'item-pending',
      'Unresponded': 'item-unresponded',
      'Awaiting Return': 'item-awaiting-return'
    };
    return statusMap[status] || '';
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
