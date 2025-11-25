import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter, take } from 'rxjs/operators';
import { TransactionService, Transaction } from '../../../services/transaction.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-transaction-detail',
  standalone: true,
  imports: [CommonModule, FormsModule],
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

  // Edit mode states
  isEditMode: boolean = false;
  showEditSuccessModal: boolean = false;
  showPickupWarningModal: boolean = false;
  isWithin24Hours: boolean = false;

  // Customer info
  customerInfo = {
    name: '',
    email: '',
    contactNumber: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    pickupDate: '',
    pickupTimeSlot: ''
  };

  // Edit form data
  editForm = {
    categoryId: '',
    brandId: '',
    modelId: '',
    note: '',
    snapshotReceiverName: '',
    snapshotPhoneNum: '',
    snapshotAddress: '',
    snapshotCity: '',
    snapshotState: '',
    snapshotZipCode: '',
    pickupDate: '',
    pickupTimeSlot: ''
  };

  // Original values for comparison
  originalPickupDate: string = '';
  originalPickupTimeSlot: string = '';

  // Available time slots
  timeSlots = [
    '10:00 AM - 12:00 PM',
    '12:00 PM - 2:00 PM',
    '2:00 PM - 4:00 PM',
    '4:00 PM - 6:00 PM',
    '6:00 PM - 8:00 PM'
  ];

  // Minimum pickup date (2 days from today)
  minPickupDate: string = '';

  // Before review - seller's original submission
  beforeReview = {
    estimatedPrice: 0,
    brand: '',
    model: '',
    category: '',
    functionalStatus: '',
    condition: '',
    score: 0,
    note: '',
    selectedIssue: [] as string[],
    dynamicAnswers: [] as Array<{ sectionName: string; question: string; type: string; answer: string | string[] }>
  };

  // After review - admin's assessment
  afterReview = {
    estimatedPrice: 0,
    brand: '',
    model: '',
    category: '',
    functionalStatus: '',
    condition: '',
    score: 0,
    note: '',
    selectedIssue: [] as string[],
    dynamicAnswers: [] as Array<{ sectionName: string; question: string; type: string; answer: string | string[] }>
  };

  // For non-awaiting status, use single appliance info
  applianceInfo = {
    estimatedPrice: 0,
    brand: '',
    model: '',
    category: '',
    functionalStatus: '',
    condition: '',
    score: 0,
    note: '',
    selectedIssue: [] as string[],
    dynamicAnswers: [] as Array<{ sectionName: string; question: string; type: string; answer: string | string[] }>
  };

  // Check if transaction needs review comparison
  get isAwaitingConfirmation(): boolean {
    return this.transaction?.transactionStatus === 'Awaiting Confirmation';
  }

  // Check if transaction is in Pending Payment status (Case 5)
  get isPendingPayment(): boolean {
    return this.transaction?.transactionStatus === 'Pending Payment';
  }

  // Check if transaction allows editing (Awaiting Pick Up status)
  get canEdit(): boolean {
    return this.transaction?.itemStatus === 'Awaiting Pick Up';
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

  // Calculate minimum pickup date (2 days from today)
  private calculateMinPickupDate(): void {
    const today = new Date();
    const minDate = new Date(today);
    minDate.setDate(today.getDate() + 2); // Add 2 days

    // Format as YYYY-MM-DD for date input
    const year = minDate.getFullYear();
    const month = String(minDate.getMonth() + 1).padStart(2, '0');
    const day = String(minDate.getDate()).padStart(2, '0');
    this.minPickupDate = `${year}-${month}-${day}`;

    console.log('📅 Minimum pickup date set to:', this.minPickupDate);
  }

  ngOnInit(): void {
    // Calculate minimum pickup date (2 days from today)
    this.calculateMinPickupDate();

    // Get transaction ID from route
    this.route.params.subscribe(params => {
      // Support both string IDs (e.g., "TXN-123") and numeric IDs
      this.transactionId = params['id'];
      console.log('📌 Transaction ID from route:', this.transactionId);

      // Wait for auth to be ready before loading transaction details
      this.authSubscription = this.authService.currentUser$
        .pipe(
          filter(user => {
            console.log('🔍 Current user in filter:', user);
            if (!user) {
              console.warn('⚠️ User is null, waiting for authentication...');
              return false;
            }
            if (user.userType !== 'seller') {
              console.error('❌ User type mismatch. Expected: "seller", Got:', user.userType);
              console.error('User object:', user);
              return false;
            }
            return true;
          }),
          take(1) // Only take the first emission, then auto-unsubscribe
        )
        .subscribe({
          next: (user) => {
            // TypeScript guard: double-check user is not null
            if (!user) {
              console.error('❌ User is null after filter');
              this.router.navigate(['/transactions']);
              return;
            }

            console.log('✅ Authenticated user:', user);
            const sellerId = user.sellerId;
            if (sellerId) {
              console.log('✅ Seller ID found:', sellerId);
              this.loadTransactionDetail(sellerId);
            } else {
              console.error('❌ No seller ID found in user object');
              console.error('User object:', user);
              this.router.navigate(['/transactions']);
            }
          },
          error: (error) => {
            console.error('❌ Error in auth subscription:', error);
            this.loading = false;
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

        // Verify this transaction belongs to the current seller
        if (data.sellerId !== sellerId) {
          console.error('❌ Unauthorized access to transaction. Expected:', sellerId, 'Got:', data.sellerId);
          this.router.navigate(['/transactions']);
          return;
        }

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
          note: data.note
        };

        this.customerInfo = {
          name: data.addressName || 'Unknown',
          email: data.sellerEmail || 'N/A',
          contactNumber: data.addressPhone || 'N/A',
          address: data.pickupAddress || 'N/A',
          city: data.city || 'N/A',
          state: data.state || 'N/A',
          zipCode: data.zipCode || 'N/A',
          pickupDate: data.pickupDate || 'Not scheduled',
          pickupTimeSlot: data.pickupTimeSlot || 'Not scheduled'
        };

        // Initialize edit form with current values
        this.editForm = {
          categoryId: data.categoryId || '',
          brandId: data.brandId || '',
          modelId: data.modelId || '',
          note: data.note || '',
          snapshotReceiverName: data.addressName || '',
          snapshotPhoneNum: data.addressPhone || '',
          snapshotAddress: data.pickupAddress || '',
          snapshotCity: data.city || '',
          snapshotState: data.state || '',
          snapshotZipCode: data.zipCode || '',
          pickupDate: data.pickupDate || '',
          pickupTimeSlot: data.pickupTimeSlot || ''
        };

        // Store original pickup date/time for comparison
        this.originalPickupDate = data.pickupDate || '';
        this.originalPickupTimeSlot = data.pickupTimeSlot || '';

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
    // Get selected issues from API response
    const selectedIssues = data.selectedIssues || [];

    // Get dynamic answers from API response
    const dynamicAnswers = data.dynamicAnswers || [];

    // If awaiting confirmation, show before/after review comparison
    if (this.isAwaitingConfirmation) {
      // Before review - original seller submission
      this.beforeReview = {
        estimatedPrice: data.estimatedPrice || 0,
        brand: data.brand,
        model: data.model,
        category: data.category,
        functionalStatus: data.initialFunctionalStatus || 'N/A',
        condition: data.initialPhysicalCondition || 'N/A',
        score: this.calculateScore(data.initialFunctionalStatus, data.initialPhysicalCondition),
        note: data.note || 'No notes',
        selectedIssue: selectedIssues,
        dynamicAnswers: dynamicAnswers
      };

      // After review - admin's assessment (revised price & condition)
      this.afterReview = {
        estimatedPrice: data.finalPrice || data.estimatedPrice || 0,
        brand: data.brand,
        model: data.model,
        category: data.category,
        functionalStatus: data.finalFunctionalStatus || data.initialFunctionalStatus || 'N/A',
        condition: data.finalPhysicalCondition || data.initialPhysicalCondition || 'N/A',
        score: this.calculateScore(data.finalFunctionalStatus, data.finalPhysicalCondition),
        note: data.note || 'No notes',
        selectedIssue: selectedIssues,
        dynamicAnswers: dynamicAnswers
      };
    } else {
      // For other statuses, use current appliance info
      this.applianceInfo = {
        estimatedPrice: data.finalPrice || data.estimatedPrice || 0,
        brand: data.brand,
        model: data.model,
        category: data.category,
        functionalStatus: data.finalFunctionalStatus || data.initialFunctionalStatus || 'N/A',
        condition: data.finalPhysicalCondition || data.initialPhysicalCondition || 'N/A',
        score: this.calculateScore(
          data.finalFunctionalStatus || data.initialFunctionalStatus,
          data.finalPhysicalCondition || data.initialPhysicalCondition
        ),
        note: data.note || 'No notes',
        selectedIssue: selectedIssues,
        dynamicAnswers: dynamicAnswers
      };
    }
  }

  // Helper function to calculate score based on condition
  private calculateScore(functionalStatus: string, physicalCondition: string): number {
    let score = 0;

    // Functional status scoring
    if (functionalStatus?.includes('Working') || functionalStatus?.includes('Functioning')) {
      score += 50;
    } else if (functionalStatus?.includes('Minor')) {
      score += 30;
    }

    // Physical condition scoring
    if (physicalCondition?.includes('Excellent') || physicalCondition?.includes('New')) {
      score += 50;
    } else if (physicalCondition?.includes('Good')) {
      score += 40;
    } else if (physicalCondition?.includes('Fair')) {
      score += 30;
    }

    return score;
  }

  goBack(): void {
    this.router.navigate(['/transactions']);
  }

  viewRecoverySlip(): void {
    this.router.navigate(['/recovery-slip', this.transactionId], {
      state: { fromTransactionId: this.transactionId }
    });
    console.log('View recovery slip for transaction:', this.transactionId);
  }

  viewPackagingInstruction(): void {
    this.router.navigate(['/packaging-instruction'], {
      state: { fromTransactionId: this.transactionId }
    });
    console.log('View packaging instruction for transaction:', this.transactionId);
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

  // ========== EDIT MODE FUNCTIONS ==========

  // Enter edit mode
  enterEditMode(): void {
    if (!this.canEdit) {
      alert('Editing is only allowed when item status is "Awaiting Pick Up"');
      return;
    }
    this.isEditMode = true;
    console.log('📝 Entered edit mode');
  }

  // Cancel edit mode
  cancelEdit(): void {
    this.isEditMode = false;
    // Reset form to original values
    if (this.transaction) {
      this.editForm = {
        categoryId: this.transaction.category || '',
        brandId: this.transaction.brand || '',
        modelId: this.transaction.model || '',
        note: this.transaction.note || '',
        snapshotReceiverName: this.customerInfo.name,
        snapshotPhoneNum: this.customerInfo.contactNumber,
        snapshotAddress: this.customerInfo.address,
        snapshotCity: this.customerInfo.city,
        snapshotState: this.customerInfo.state,
        snapshotZipCode: this.customerInfo.zipCode,
        pickupDate: this.originalPickupDate,
        pickupTimeSlot: this.originalPickupTimeSlot
      };
    }
    console.log('❌ Cancelled edit mode');
  }

  // Check if pickup date/time has been changed and is within 24 hours
  checkPickupDateChange(): boolean {
    const pickupDateChanged = this.editForm.pickupDate !== this.originalPickupDate;
    const pickupTimeChanged = this.editForm.pickupTimeSlot !== this.originalPickupTimeSlot;

    if (!pickupDateChanged && !pickupTimeChanged) {
      return false; // No change
    }

    // Check if original pickup date is within 24 hours
    if (this.originalPickupDate) {
      const originalDate = new Date(this.originalPickupDate);
      const now = new Date();
      const hoursUntilPickup = (originalDate.getTime() - now.getTime()) / (1000 * 60 * 60);

      if (hoursUntilPickup <= 24 && hoursUntilPickup >= 0) {
        this.isWithin24Hours = true;
        return true; // Within 24 hours - show warning
      }
    }

    this.isWithin24Hours = false;
    return false; // Changed but not within 24 hours
  }

  // Validate pickup date
  validatePickupDate(): boolean {
    if (!this.editForm.pickupDate) {
      return true; // No date selected, skip validation
    }

    const selectedDate = new Date(this.editForm.pickupDate);
    const minDate = new Date(this.minPickupDate);

    if (selectedDate < minDate) {
      alert(`Invalid pickup date. Please select a date from ${this.minPickupDate} onwards (minimum 2 days from today).`);
      return false;
    }

    return true;
  }

  // Called when pickup date input changes - immediately validate and reset if invalid
  onPickupDateChange(): void {
    if (!this.editForm.pickupDate) {
      return;
    }

    const selectedDate = new Date(this.editForm.pickupDate);
    const minDate = new Date(this.minPickupDate);

    // If selected date is before minimum date, reset it and show alert
    if (selectedDate < minDate) {
      alert(`Invalid date selected. The earliest available pickup date is ${this.minPickupDate}.\n\nPlease select a date at least 2 days from today.`);
      // Reset to minimum date or empty
      this.editForm.pickupDate = this.minPickupDate;
    }
  }

  // Save changes - check for validation and 24-hour warning first
  saveChanges(): void {
    // Validate pickup date first
    if (!this.validatePickupDate()) {
      return;
    }

    // Validate time slot
    if (this.editForm.pickupTimeSlot && !this.timeSlots.includes(this.editForm.pickupTimeSlot)) {
      alert('Invalid time slot. Please select from the dropdown.');
      return;
    }

    // Check if pickup date/time changed and is within 24 hours
    if (this.checkPickupDateChange()) {
      // Show warning modal
      this.showPickupWarningModal = true;
      return;
    }

    // No warning needed, proceed with save
    this.proceedWithSave();
  }

  // Cancel warning modal
  cancelPickupWarning(): void {
    this.showPickupWarningModal = false;
  }

  // Confirm save despite warning
  confirmSaveWithWarning(): void {
    this.showPickupWarningModal = false;
    this.proceedWithSave();
  }

  // Actually save the changes
  private proceedWithSave(): void {
    if (!this.transaction) return;

    this.loading = true;

    // Prepare update payload
    const updatePayload: any = {};

    // Only include fields that were changed
    if (this.editForm.note !== this.transaction.note) {
      updatePayload.note = this.editForm.note;
    }

    // Include snapshot address fields if changed
    if (this.editForm.snapshotReceiverName !== this.customerInfo.name) {
      updatePayload.snapshotReceiverName = this.editForm.snapshotReceiverName;
    }
    if (this.editForm.snapshotPhoneNum !== this.customerInfo.contactNumber) {
      updatePayload.snapshotPhoneNum = this.editForm.snapshotPhoneNum;
    }
    if (this.editForm.snapshotAddress !== this.customerInfo.address) {
      updatePayload.snapshotAddress = this.editForm.snapshotAddress;
    }
    if (this.editForm.snapshotCity !== this.customerInfo.city) {
      updatePayload.snapshotCity = this.editForm.snapshotCity;
    }
    if (this.editForm.snapshotState !== this.customerInfo.state) {
      updatePayload.snapshotState = this.editForm.snapshotState;
    }
    if (this.editForm.snapshotZipCode !== this.customerInfo.zipCode) {
      updatePayload.snapshotZipCode = this.editForm.snapshotZipCode;
    }

    // Include pickup date/time if changed
    if (this.editForm.pickupDate !== this.originalPickupDate) {
      updatePayload.pickupDate = this.editForm.pickupDate;
    }
    if (this.editForm.pickupTimeSlot !== this.originalPickupTimeSlot) {
      updatePayload.pickupTimeSlot = this.editForm.pickupTimeSlot;
    }

    console.log('💾 Saving changes:', updatePayload);

    // Call API to update submission details
    this.transactionService.updateSubmissionDetails(this.transactionId, updatePayload).subscribe({
      next: (response) => {
        console.log('✅ Changes saved successfully:', response);
        this.loading = false;
        this.isEditMode = false;
        this.showEditSuccessModal = true;
      },
      error: (error) => {
        console.error('❌ Error saving changes:', error);
        this.loading = false;
        const errorMessage = error.error?.message || error.message || 'Unknown error';
        alert(`Failed to save changes: ${errorMessage}`);
      }
    });
  }

  // Close edit success modal and reload
  closeEditSuccess(): void {
    this.showEditSuccessModal = false;
    // Reload the page to show updated data
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
}