import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { TransactionService, Transaction } from '../../../services/transaction.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-transaction-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './transaction-detail.html',
  styleUrls: ['./transaction-detail.scss']
})
export class TransactionDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private transactionService = inject(TransactionService);
  private authService = inject(AuthService);

  transaction: Transaction | null = null;
  loading: boolean = true;
  transactionId: number = 0;

  // Mock additional details (TODO: fetch from backend)
  customerInfo = {
    name: '',
    email: '',
    contactNumber: '',
    address: '',
    city: '',
    state: ''
  };

  applianceInfo = {
    estimatedPrice: 0,
    brand: '',
    model: '',
    category: '',
    functionalStatus: '',
    condition: '',
    score: 0,
    note: '',
    selectedIssue: [] as string[]
  };

  ngOnInit(): void {
    // Get transaction ID from route
    this.route.params.subscribe(params => {
      this.transactionId = +params['id'];
      this.loadTransactionDetail();
    });
  }

  loadTransactionDetail(): void {
    this.loading = true;
    const currentUserId = this.authService.getCurrentUserId();

    // Get all seller transactions and find the specific one
    if (currentUserId) {
      this.transactionService.getTransactionsBySeller(currentUserId).subscribe({
        next: (transactions) => {
          this.transaction = transactions.find(t => t.id === this.transactionId) || null;
          
          if (this.transaction) {
            this.loadMockDetails();
          } else {
            // Transaction not found or doesn't belong to this seller
            console.error('Transaction not found or unauthorized');
            this.router.navigate(['/transactions']);
          }
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading transaction:', error);
          this.loading = false;
          this.router.navigate(['/transactions']);
        }
      });
    }
  }

  loadMockDetails(): void {
    if (!this.transaction) return;

    // Mock customer info (TODO: fetch from backend API)
    this.customerInfo = {
      name: this.transaction.sellerName,
      email: 'johndoe@mail.com',
      contactNumber: '012-3456789',
      address: '12, JALAN PKNPK 2',
      city: 'TEXAS',
      state: 'MALACCA'
    };

    // Mock appliance info (TODO: fetch from backend API)
    this.applianceInfo = {
      estimatedPrice: this.transaction.estimatedPrice || 3500,
      brand: this.transaction.brand,
      model: this.transaction.model,
      category: this.transaction.category,
      functionalStatus: 'Fully Functioning',
      condition: '100% New',
      score: 85,
      note: 'Samsung',
      selectedIssue: [
        'Does the appliance show any external damage when examining?',
        'Are there any unusual noises or vibrations during operation?',
        'Are all the buttons, switches, and dials fully working perfectly?',
        'Is there any sign of corrosion on the appliance?',
        'Does the appliance come with all its required parts and components? (e.g., hoses, manuals)'
      ]
    };
  }

  goBack(): void {
    this.router.navigate(['/transactions']);
  }

  viewRecoverySlip(): void {
    // TODO: Navigate to recovery slip page or open PDF
    console.log('View recovery slip for transaction:', this.transactionId);
  }

  viewPackagingInstruction(): void {
    // TODO: Navigate to packaging instruction page or open PDF
    console.log('View packaging instruction');
  }

  getStatusClass(status: string): string {
    const statusMap: { [key: string]: string } = {
      'Pending Payment': 'status-pending-payment',
      'Completed': 'status-completed',
      'Returned': 'status-returned',
      'Rejected': 'status-rejected',
      'Cancelled': 'status-cancelled',
      'Awaiting Confirmation': 'status-awaiting',
      'Under Review': 'status-review',
      'Picked Up': 'status-picked-up'
    };
    return statusMap[status] || '';
  }
}
