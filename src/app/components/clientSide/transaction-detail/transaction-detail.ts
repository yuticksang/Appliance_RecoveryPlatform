import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter, take } from 'rxjs/operators';
import { TransactionService, Transaction } from '../../../services/transaction.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-transaction-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './transaction-detail.html',
  styleUrls: ['./transaction-detail.scss']
})
export class TransactionDetailComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private transactionService = inject(TransactionService);
  private authService = inject(AuthService);

  transaction: Transaction | null = null;
  loading: boolean = true;
  transactionId: string | number = 0; // Support both string and number IDs
  private authSubscription?: Subscription;

  // Photos gallery
  photos: string[] = [];
  selectedPhotoIndex: number = 0;

  // Sticky header scroll behavior
  isHeaderVisible: boolean = true;
  private lastScrollTop: number = 0;
  private scrollThreshold: number = 10; // Minimum scroll distance to trigger hide/show

  // Modal states for accept/reject flow
  showAcceptConfirmModal: boolean = false;
  showRejectConfirmModal: boolean = false;
  showAcceptSuccessModal: boolean = false;
  showRejectSuccessModal: boolean = false;

  // Modal states for seller cancellation (Case 5)
  showCancelConfirmModal: boolean = false;
  showCancelSuccessModal: boolean = false;

  // Photo lightbox modal
  showPhotoLightbox: boolean = false;
  lightboxPhotoIndex: number = 0;
  lightboxZoomLevel: number = 1;
  minZoom: number = 1;
  maxZoom: number = 3;

  // Customer info
  customerInfo = {
    name: '',
    email: '',
    contactNumber: '',
    address: '',
    city: '',
    state: ''
  };

  // Before review - seller's original submission
  beforeReview = {
    estimatedPrice: 0,
    brand: '',
    model: '',
    category: '',
    score: 0,
    note: ''
  };

  // After review - admin's assessment
  afterReview = {
    estimatedPrice: 0,
    brand: '',
    model: '',
    category: '',
    score: 0,
    note: ''
  };

  // For non-awaiting status, use single appliance info
  applianceInfo: {
    estimatedPrice: number;
    brand: string;
    model: string;
    modelName: string;
    category: string;
    score: number;
    note: string;
  } = {
    estimatedPrice: 0,
    brand: '',
    model: '',
    modelName: '',
    category: '',
    score: 0,
    note: ''
  };

  // Dynamic condition groups from backend (e.g., "Functional Status", "Appearance Status", "Checklist")
  conditionGroups: { [key: string]: string[] } = {};

  // Check if transaction needs review comparison
  get isAwaitingConfirmation(): boolean {
    return this.transaction?.transactionStatus === 'Awaiting Confirmation';
  }

  // Check if transaction is in Pending Payment status (Case 5)
  get isPendingPayment(): boolean {
    return this.transaction?.transactionStatus === 'Pending Payment';
  }

  // Get the currently selected photo
  get selectedPhoto(): string {
    if (this.photos.length > 0) {
      return this.photos[this.selectedPhotoIndex];
    }
    return this.transaction?.image || 'assets/image/placeholder-appliance.png';
  }

  // Check if there are multiple photos
  get hasMultiplePhotos(): boolean {
    return this.photos.length > 1;
  }

  // Check if there are any photos
  get hasPhotos(): boolean {
    return this.photos.length > 0;
  }

  // Select a photo by index
  selectPhoto(index: number): void {
    if (index >= 0 && index < this.photos.length) {
      this.selectedPhotoIndex = index;
    }
  }

  // Open photo lightbox
  openLightbox(index: number): void {
    this.lightboxPhotoIndex = index;
    this.showPhotoLightbox = true;
  }

  // Close photo lightbox
  closeLightbox(): void {
    this.showPhotoLightbox = false;
    this.lightboxZoomLevel = 1; // Reset zoom when closing
  }

  // Zoom in photo
  zoomIn(): void {
    if (this.lightboxZoomLevel < this.maxZoom) {
      this.lightboxZoomLevel = Math.min(this.lightboxZoomLevel + 0.5, this.maxZoom);
    }
  }

  // Zoom out photo
  zoomOut(): void {
    if (this.lightboxZoomLevel > this.minZoom) {
      this.lightboxZoomLevel = Math.max(this.lightboxZoomLevel - 0.5, this.minZoom);
    }
  }

  // Reset zoom
  resetZoom(): void {
    this.lightboxZoomLevel = 1;
  }

  // Navigate to previous photo in lightbox
  prevLightboxPhoto(): void {
    this.lightboxZoomLevel = 1; // Reset zoom when changing photos
    if (this.lightboxPhotoIndex > 0) {
      this.lightboxPhotoIndex--;
    } else {
      this.lightboxPhotoIndex = this.photos.length - 1;
    }
  }

  // Navigate to next photo in lightbox
  nextLightboxPhoto(): void {
    this.lightboxZoomLevel = 1; // Reset zoom when changing photos
    if (this.lightboxPhotoIndex < this.photos.length - 1) {
      this.lightboxPhotoIndex++;
    } else {
      this.lightboxPhotoIndex = 0;
    }
  }

  ngOnInit(): void {
    // Get transaction ID from route
    this.route.params.subscribe(params => {
      // Support both string IDs (e.g., "TXN-123") and numeric IDs
      this.transactionId = params['id'];
      console.log('📍 Transaction detail component initialized with ID:', this.transactionId);

      // Wait for auth to be ready before loading transaction details
      this.authSubscription = this.authService.currentUser$
        .pipe(
          filter(user => {
            console.log('🔐 Auth filter checking user:', user);
            // Allow seller users to access transaction details
            if (user !== null && user.userType === 'seller') {
              return true;
            }
            // If user is logged in but not as seller, redirect
            if (user !== null && user.userType !== 'seller') {
              console.warn('⚠️ User is not a seller, userType:', user.userType);
            }
            return false;
          }),
          take(1) // Only take the first emission, then auto-unsubscribe
        )
        .subscribe((user) => {
          // TypeScript guard: double-check user is not null
          if (!user) {
            console.error('❌ User is null after filter');
            this.router.navigate(['/transactions']);
            return;
          }

          console.log('✅ User authenticated as seller:', user);
          const sellerId = user.sellerId;
          if (sellerId) {
            this.loadTransactionDetail(sellerId);
          } else {
            console.error('❌ No seller ID found in user object');
            this.router.navigate(['/transactions']);
          }
        });
    });

    // Setup scroll listener for sticky header
    this.setupScrollListener();
  }

  ngOnDestroy(): void {
    // Cleanup subscription (though take(1) auto-unsubscribes)
    this.authSubscription?.unsubscribe();

    // Remove scroll listener
    window.removeEventListener('scroll', this.handleScroll);
  }

  private setupScrollListener(): void {
    window.addEventListener('scroll', this.handleScroll.bind(this), { passive: true });
  }

  private handleScroll(): void {
    const currentScrollTop = window.pageYOffset || document.documentElement.scrollTop;

    // Don't hide header if at the top of the page
    if (currentScrollTop <= 100) {
      this.isHeaderVisible = true;
      return;
    }

    // Check if scrolled enough to trigger hide/show
    if (Math.abs(currentScrollTop - this.lastScrollTop) < this.scrollThreshold) {
      return;
    }

    // Scrolling down - hide header
    if (currentScrollTop > this.lastScrollTop) {
      this.isHeaderVisible = false;
    }
    // Scrolling up - show header
    else {
      this.isHeaderVisible = true;
    }

    this.lastScrollTop = currentScrollTop;
  }

  loadTransactionDetail(sellerId: string): void {
    this.loading = true;

    console.log('📄 Loading transaction detail:', this.transactionId, 'for seller:', sellerId);

    // Fetch full transaction details from backend
    this.transactionService.getTransactionById(this.transactionId).subscribe({
      next: (data) => {
        console.log('✅ Transaction data loaded:', data);
        console.log('🔍 Comparing sellerIds - Data:', data.sellerId, 'Current:', sellerId);
        console.log('🔍 Type check - Data sellerId type:', typeof data.sellerId, 'Current sellerId type:', typeof sellerId);

        // Verify this transaction belongs to the current seller
        // Use String() to ensure consistent comparison (handle number vs string)
        if (String(data.sellerId) !== String(sellerId)) {
          console.error('❌ Unauthorized access to transaction. Expected:', sellerId, 'Got:', data.sellerId);
          this.router.navigate(['/transactions']);
          return;
        }

        console.log('✅ Seller ID verified, loading transaction details...');

        // Map backend data to transaction object
        this.transaction = {
          id: data.id,
          sellerId: data.sellerId,
          sellerName: data.sellerName,
          image: data.imageUrl || 'assets/image/placeholder-appliance.png',
          brand: data.brand,
          category: data.category,
          model: data.model,
          modelName: data.modelName,
          transactionStatus: data.transactionStatus,
          itemStatus: data.itemStatus,
          submittedDate: new Date(data.submittedDate),
          estimatedPrice: data.estimatedPrice,
          finalPrice: data.finalPrice,
          note: data.finalNote || data.initialNote || data.note // Show final note if reviewed, otherwise initial
        };

        // Load REAL customer info from database
        this.customerInfo = {
          name: data.sellerName || 'Unknown',
          email: data.sellerEmail || 'N/A',
          contactNumber: data.sellerPhone || 'N/A',
          address: data.pickupAddress || 'N/A',
          city: data.city || 'N/A',
          state: data.state || 'N/A'
        };

        // Load seller-submitted photos from backend (not the catalog image)
        if (data.photos && data.photos.length > 0) {
          this.photos = data.photos;
          this.selectedPhotoIndex = 0;
        } else {
          // No photos submitted by seller
          this.photos = [];
        }

        // Load REAL appliance details
        this.loadRealDetails(data);
        this.loading = false;
      },
      error: (error) => {
        console.error('❌ Error loading transaction:', error);
        console.error('Error details:', {
          status: error.status,
          statusText: error.statusText,
          message: error.message,
          url: error.url
        });
        this.loading = false;
        this.router.navigate(['/transactions']);
      }
    });
  }

  loadRealDetails(data: any): void {
    // Load dynamic condition groups from backend
    this.conditionGroups = data.conditionGroups || {};

    // If awaiting confirmation, show before/after review comparison
    if (this.isAwaitingConfirmation) {
      // Before review - original seller submission
      this.beforeReview = {
        estimatedPrice: data.estimatedPrice || 0,
        brand: data.brand,
        model: data.model,
        category: data.category,
        score: 0, // TODO: Will be fetched from other team's API
        note: data.initialNote || data.note || '' // Seller's original note
      };

      // After review - admin's assessment (revised price & condition)
      this.afterReview = {
        estimatedPrice: data.finalPrice || data.estimatedPrice || 0,
        brand: data.brand,
        model: data.model,
        category: data.category,
        score: 0, // TODO: Will be fetched from other team's API
        note: data.finalNote || '' // Admin's review note
      };
    } else {
      // For other statuses, use current appliance info
      this.applianceInfo = {
        estimatedPrice: data.finalPrice || data.estimatedPrice || 0,
        brand: data.brand,
        model: data.model,
        modelName: data.modelName,
        category: data.category,
        score: 0, // TODO: Will be fetched from other team's API
        note: data.finalNote || data.initialNote || data.note || '' // Show final note if available, otherwise initial
      };
    }
  }

  // Helper to get condition group names for iteration in template
  getConditionGroupNames(): string[] {
    return Object.keys(this.conditionGroups);
  }

  // Helper to check if there are any condition groups
  hasConditionGroups(): boolean {
    return Object.keys(this.conditionGroups).length > 0;
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

  // Step 1: Show accept confirmation modal
  acceptOffer(): void {
    if (!this.transaction) return;
    this.showAcceptConfirmModal = true;
  }

  // Step 2: Cancel accept confirmation
  cancelAcceptConfirm(): void {
    this.showAcceptConfirmModal = false;
  }

  // Step 3: Confirm accept - call API
  confirmAcceptOffer(): void {
    if (!this.transaction) return;

    this.showAcceptConfirmModal = false;
    this.loading = true;

    // Call API to update transaction status to "Pending Payment" and item status to "Awaiting Pick Up"
    this.transactionService.updateTransactionStatus(
      this.transactionId,
      'Pending Payment',
      'Awaiting Pick Up'
    ).subscribe({
      next: (updatedTransaction) => {
        console.log('✅ Offer accepted successfully:', updatedTransaction);
        this.loading = false;
        this.showAcceptSuccessModal = true;
      },
      error: (error) => {
        console.error('❌ Error accepting offer:', error);
        console.error('Error details:', {
          status: error.status,
          statusText: error.statusText,
          message: error.message,
          error: error.error
        });
        this.loading = false;
        const errorMessage = error.error?.message || error.message || 'Unknown error';
        alert(`Failed to accept offer: ${errorMessage}\n\nPlease check console for details.`);
      }
    });
  }

  // Step 4: Close accept success modal and reload
  closeAcceptSuccess(): void {
    this.showAcceptSuccessModal = false;
    // Reload the page to show updated status
    window.location.reload();
  }

  // Step 1: Show reject confirmation modal
  rejectOffer(): void {
    if (!this.transaction) return;
    this.showRejectConfirmModal = true;
  }

  // Step 2: Cancel reject confirmation
  cancelRejectConfirm(): void {
    this.showRejectConfirmModal = false;
  }

  // Step 3: Confirm reject - call API
  confirmRejectOffer(): void {
    if (!this.transaction) return;

    this.showRejectConfirmModal = false;
    this.loading = true;

    // Call API to update transaction status to "Rejected" and item status to "Awaiting Return"
    this.transactionService.updateTransactionStatus(
      this.transactionId,
      'Rejected',
      'Awaiting Return'
    ).subscribe({
      next: (updatedTransaction) => {
        console.log('✅ Offer rejected successfully:', updatedTransaction);
        this.loading = false;
        this.showRejectSuccessModal = true;
      },
      error: (error) => {
        console.error('❌ Error rejecting offer:', error);
        console.error('Error details:', {
          status: error.status,
          statusText: error.statusText,
          message: error.message,
          error: error.error
        });
        this.loading = false;
        const errorMessage = error.error?.message || error.message || 'Unknown error';
        alert(`Failed to reject offer: ${errorMessage}\n\nPlease check console for details.`);
      }
    });
  }

  // Step 4: Close reject success modal and reload
  closeRejectSuccess(): void {
    this.showRejectSuccessModal = false;
    // Reload the page to show updated status
    window.location.reload();
  }

  // ========== SELLER CANCELLATION (CASE 5) ==========

  // Step 1: Show cancellation confirmation modal
  cancelTransaction(): void {
    if (!this.transaction) return;
    this.showCancelConfirmModal = true;
  }

  // Step 2: Cancel cancellation (go back)
  cancelCancellation(): void {
    this.showCancelConfirmModal = false;
  }

  // Step 3: Confirm cancellation - call API
  confirmCancellation(): void {
    if (!this.transaction) return;

    this.showCancelConfirmModal = false;
    this.loading = true;

    // Call API to update transaction status to "Cancelled" and item status to "Awaiting Return"
    this.transactionService.updateTransactionStatus(
      this.transactionId,
      'Cancelled',
      'Awaiting Return'
    ).subscribe({
      next: (updatedTransaction) => {
        console.log('✅ Transaction cancelled successfully:', updatedTransaction);
        this.loading = false;
        this.showCancelSuccessModal = true;
      },
      error: (error) => {
        console.error('❌ Error cancelling transaction:', error);
        console.error('Error details:', {
          status: error.status,
          statusText: error.statusText,
          message: error.message,
          error: error.error
        });
        this.loading = false;
        const errorMessage = error.error?.message || error.message || 'Unknown error';
        alert(`Failed to cancel transaction: ${errorMessage}\n\nPlease check console for details.`);
      }
    });
  }

  // Step 4: Close cancellation success modal and reload
  closeCancelSuccess(): void {
    this.showCancelSuccessModal = false;
    // Reload the page to show updated status
    window.location.reload();
  }

  // ========== STATUS HELPERS ==========

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
}
