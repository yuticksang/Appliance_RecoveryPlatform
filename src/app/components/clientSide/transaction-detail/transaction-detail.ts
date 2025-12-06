import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter, take } from 'rxjs/operators';
import { TransactionService, Transaction } from '../../../services/transaction.service';
import { AuthService } from '../../../services/auth.service';
import { AlertService } from '../../../services/alert.service';
import { BreadcrumbService } from '../../../services/breadcrumb.service';
import { BreadcrumbComponent } from '../../../shared/breadcrumb/breadcrumb';

@Component({
  selector: 'app-transaction-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, BreadcrumbComponent],
  templateUrl: './transaction-detail.html',
  styleUrls: ['./transaction-detail.scss']
})
export class TransactionDetailComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private transactionService = inject(TransactionService);
  private authService = inject(AuthService);
  private alertService = inject(AlertService);
  private breadcrumbService = inject(BreadcrumbService);

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
    state: '',
    pickupDate: '',
    pickupTimeSlot: '',
    zipCode: ''
  };

  // Edit mode state
  isEditMode: boolean = false;

  // Editable customer info (for editing)
  editableCustomerInfo = {
    name: '',
    contactNumber: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    pickupDate: '',
    pickupTimeSlot: ''
  };

  // Time slots for pickup
  timeSlots = [
    '10:00 AM - 12:00 PM',
    '12:00 PM - 2:00 PM',
    '2:00 PM - 4:00 PM',
    '4:00 PM - 6:00 PM',
    '6:00 PM - 8:00 PM'
  ];

  // Minimum date for pickup (original date + 2 days)
  minPickupDate: string = '';

  // Original pickup date for comparison
  originalPickupDate: string = '';

  // Warning flag for pickup date change within 24 hours
  showPickupDateWarning: boolean = false;

  // Malaysian states and cities data
  malaysianStates = [
    'Johor',
    'Kedah',
    'Kelantan',
    'Kuala Lumpur',
    'Labuan',
    'Melaka',
    'Negeri Sembilan',
    'Pahang',
    'Penang',
    'Perak',
    'Perlis',
    'Putrajaya',
    'Sabah',
    'Sarawak',
    'Selangor',
    'Terengganu'
  ];

  malaysianCities: { [key: string]: string[] } = {
    'Johor': ['Johor Bahru', 'Muar', 'Batu Pahat', 'Kluang', 'Segamat', 'Pontian', 'Kulai', 'Kota Tinggi', 'Mersing'],
    'Kedah': ['Alor Setar', 'Sungai Petani', 'Kulim', 'Jitra', 'Langkawi', 'Kuala Kedah', 'Baling'],
    'Kelantan': ['Kota Bharu', 'Kuala Krai', 'Tanah Merah', 'Pasir Mas', 'Gua Musang', 'Machang', 'Tumpat'],
    'Kuala Lumpur': ['Kuala Lumpur'],
    'Labuan': ['Labuan'],
    'Melaka': ['Melaka City', 'Alor Gajah', 'Jasin', 'Masjid Tanah'],
    'Negeri Sembilan': ['Seremban', 'Port Dickson', 'Nilai', 'Bahau', 'Tampin', 'Kuala Pilah', 'Rembau'],
    'Pahang': ['Kuantan', 'Temerloh', 'Bentong', 'Raub', 'Jerantut', 'Pekan', 'Kuala Lipis', 'Cameron Highlands'],
    'Penang': ['George Town', 'Butterworth', 'Bukit Mertajam', 'Nibong Tebal', 'Permatang Pauh', 'Bayan Lepas'],
    'Perak': ['Ipoh', 'Taiping', 'Teluk Intan', 'Sitiawan', 'Kuala Kangsar', 'Batu Gajah', 'Lumut', 'Kampar', 'Tapah'],
    'Perlis': ['Kangar', 'Arau', 'Kuala Perlis'],
    'Putrajaya': ['Putrajaya'],
    'Sabah': ['Kota Kinabalu', 'Sandakan', 'Tawau', 'Lahad Datu', 'Keningau', 'Semporna', 'Kudat', 'Beaufort'],
    'Sarawak': ['Kuching', 'Miri', 'Sibu', 'Bintulu', 'Limbang', 'Sarikei', 'Kapit', 'Sri Aman'],
    'Selangor': ['Shah Alam', 'Petaling Jaya', 'Subang Jaya', 'Klang', 'Ampang', 'Kajang', 'Selayang', 'Rawang', 'Sepang', 'Puchong', 'Seri Kembangan', 'Bangi', 'Cyberjaya'],
    'Terengganu': ['Kuala Terengganu', 'Kemaman', 'Dungun', 'Marang', 'Jerteh', 'Kuala Berang']
  };

  // Available cities based on selected state
  availableCities: string[] = [];

  // Validation errors
  validationErrors = {
    name: '',
    contactNumber: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    pickupDate: '',
    pickupTimeSlot: ''
  };



  // Before review - seller's original submission
  beforeReview = {
    estimatedPrice: 0,
    brand: '',
    model: '',
    category: '',
    modelName: '',
    score: 0,
    note: ''
  };


  // After review - admin's assessment
  afterReview = {
    estimatedPrice: 0,
    brand: '',
    model: '',
    category: '',
    modelName: '',
    score: 0,
    note: '',
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
  conditionGroups: { [key: string]: string | string[] } = {};

  // Mapping of groupID to display name (e.g., {"CG001": "Functional Status", "CG002": "Appearance Status"})
  conditionGroupNames: { [key: string]: string } = {};

  // Seller's submitted conditions
  sellerConditions: { [key: string]: string | string[] } = {};

  // Admin's reviewed conditions (after review)
  adminConditions: { [key: string]: string | string[] } = {};

  // Seller's submitted photos
  sellerPhotos: string[] = [];

  // Admin's review photos
  adminPhotos: string[] = [];

  // Mapping of groupID to display_order (e.g., {"CG001": 1, "CG002": 2})
  conditionGroupOrder: { [key: string]: number } = {};

  // Mapping of groupID to question_type (e.g., {"CG001": "radio", "CG004": "file_upload"})
  conditionGroupTypes: { [key: string]: string } = {};

  // Photo view tab (seller or admin)
  photoViewTab: 'seller' | 'admin' = 'seller';

  // Separate photo indices for seller and admin galleries
  sellerPhotoIndex: number = 0;
  adminPhotoIndex: number = 0;

  // Expose Array to template for Array.isArray() check
  Array = Array;


  // Check if transaction needs review comparison
  get isAwaitingConfirmation(): boolean {
    return this.transaction?.transactionStatus === 'Awaiting Confirmation';
  }

  // Check if transaction is in Pending Payment status
  get isPendingPayment(): boolean {
    return this.transaction?.transactionStatus === 'Pending Payment';
  }

  // Check if seller can cancel transaction
  // Sellers can cancel during certain statuses only
  canCancelTransaction(): boolean {
    if (!this.transaction) {
      console.log('🚫 canCancelTransaction: No transaction found');
      return false;
    }

    // Statuses where cancellation is allowed
    const allowedStatuses = [
      'Under Review',      // Initial submission - can cancel
      'Pending Payment'   // Accepted offer - can cancel before payment
    ];

    // Statuses where cancellation is NOT allowed
    const disallowedStatuses = [
      'Awaiting Confirmation',  // Already reviewed by admin - must accept or reject instead
      'Cancelled',              // Already cancelled
      'Completed',              // Already completed
      'Returned',                // Already returned
      'Rejected'          
    ];

    const canCancel = allowedStatuses.includes(this.transaction.transactionStatus);

    console.log('🔍 canCancelTransaction:', {
      status: this.transaction.transactionStatus,
      canCancel: canCancel,
      allowedStatuses: allowedStatuses,
      disallowedStatuses: disallowedStatuses
    });

    return canCancel;
  }

  // Check if item is in Awaiting Pick Up status and not cancelled (editable)
  get isAwaitingPickUp(): boolean {
    return this.transaction?.itemStatus === 'Awaiting Pick Up'
      && this.transaction?.transactionStatus !== 'Cancelled';
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
  openLightbox(index: number, photoType: 'seller' | 'admin' = 'seller'): void {
  console.log('📸 Opening lightbox:', photoType, 'photos at index:', index);
  
  // ✅ Choose the correct photo array based on photoType parameter
  if (photoType === 'admin') {
    this.photos = this.adminPhotos || [];
  } else {
    this.photos = this.sellerPhotos || [];
  }
  
  console.log('📸 Photos loaded:', this.photos.length);
  
  if (this.photos.length === 0) {
    console.warn('⚠️ No photos available');
    return;
  }
  
  if (index < 0 || index >= this.photos.length) {
    console.warn('⚠️ Invalid index:', index, 'Max:', this.photos.length - 1);
    index = 0; // Fallback to first photo
  }
  
  this.lightboxPhotoIndex = index;
  this.showPhotoLightbox = true;
  this.lightboxZoomLevel = 1;
  document.body.style.overflow = 'hidden';
  
  console.log('✅ Lightbox opened with', this.photos.length, 'photos at index', index);
}
  // update closeLightbox to restore scroll:
  closeLightbox(): void {
    this.showPhotoLightbox = false;
    this.lightboxZoomLevel = 1;
    document.body.style.overflow = '';
    console.log('❌ Lightbox closed');
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
    // Set breadcrumbs
    this.breadcrumbService.setBreadcrumbs([
      { label: 'Transactions', url: '/transactions' },
      { label: 'Transaction Detail'} 
    ]);

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
        console.log('🔍 Response Deadline from backend:', data.responseDeadline || data.response_deadline);

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
          note: data.note || '', // Note from backend
          responseDeadline: data.responseDeadline || data.response_deadline,
          paymentDueDate: data.paymentDueDate,
          cancellationReason: data.cancellationReason
        };

        console.log('🔍 Transaction object after mapping:', {
          id: this.transaction.id,
          status: this.transaction.transactionStatus,
          responseDeadline: this.transaction.responseDeadline
        });

        // Load REAL customer info from database
        this.customerInfo = {
          name: data.addressName || 'Unknown',
          email: data.sellerEmail || 'N/A',
          contactNumber: data.addressPhone  || 'N/A',
          address: data.pickupAddress || 'N/A',
          city: data.city || 'N/A',
          state: data.state || 'N/A',
          zipCode: data.zipCode || 'N/A',
          pickupDate: data.pickupDate || 'Not scheduled',
          pickupTimeSlot: data.pickupTimeSlot || 'Not scheduled'
        };

        // Calculate minimum pickup date (original date + 2 days)
        if (data.pickupDate && data.pickupDate !== 'Not scheduled') {
          // Store original pickup date for comparison
          this.originalPickupDate = data.pickupDate;

          const originalDate = new Date(data.pickupDate);
          originalDate.setDate(originalDate.getDate() + 2);
          this.minPickupDate = originalDate.toISOString().split('T')[0];
        }

        this.sellerPhotos = data.sellerPhotos || data.photos || [];
        this.adminPhotos = data.adminPhotos || [];

        console.log('📸 Photos loaded in loadTransactionDetail:', {
          sellerPhotos: this.sellerPhotos.length,
          adminPhotos: this.adminPhotos.length
        });


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

  // Check if admin has reviewed the transaction
  hasBeenReviewed: boolean = false;

  loadRealDetails(data: any): void {
    // Load dynamic condition groups from backend
    this.conditionGroups = data.conditionGroups || {};
    this.conditionGroupNames = data.conditionGroupNames || {};
    this.conditionGroupOrder = data.conditionGroupOrder || {};
    this.conditionGroupTypes = data.conditionGroupTypes || {};

    // Load seller's and admin's conditions
    this.sellerConditions = data.sellerConditions || {};
    this.adminConditions = data.adminConditions || {};

    // Load seller's and admin's photos
    this.sellerPhotos = data.sellerPhotos || [];
    this.adminPhotos = data.adminPhotos || [];

    console.log('Loaded conditionGroups:', this.conditionGroups);
    console.log('Loaded conditionGroupNames:', this.conditionGroupNames);
    console.log('Loaded sellerConditions:', this.sellerConditions);
    console.log('Loaded adminConditions:', this.adminConditions);
    console.log('Loaded initialScore:', data.initialScore);
    console.log('Loaded finalScore:', data.finalScore);
    // Check if admin has reviewed (adminConditions exist or finalPrice exists)
    this.hasBeenReviewed = !!(Object.keys(this.adminConditions).length > 0 || data.finalPrice);
    console.log('Loaded hasBeenReviewed:', this.hasBeenReviewed, '(adminConditions:', Object.keys(this.adminConditions).length, 'finalPrice:', data.finalPrice, ')');

    // If awaiting confirmation or has been reviewed, show before/after review comparison
    if (this.isAwaitingConfirmation || this.hasBeenReviewed) {
      // Before review - original seller submission
      this.beforeReview = {
        estimatedPrice: data.estimatedPrice || 0,
        brand: data.brand,
        model: data.model,
        category: data.category,
        modelName: data.modelName,
        score: data.initialScore || 0,
        note: data.note || ''
      };

      // After review - admin's assessment (only if reviewed)
      if (this.hasBeenReviewed) {
        this.afterReview = {
          estimatedPrice: data.finalPrice || data.estimatedPrice || 0,
          // Use final appliance details (admin's correction) if available, otherwise use original
          brand: data.finalBrand || data.brand,
          model: data.finalModel || data.model,
          category: data.finalCategory || data.category,
          modelName: data.finalModelName || data.modelName,
          score: data.finalScore || data.initialScore || 0,
          note: data.note || ''
        };
      }
    } else {
      // For other statuses, use current appliance info
      this.applianceInfo = {
        estimatedPrice: data.finalPrice || data.estimatedPrice || 0,
        brand: data.brand,
        model: data.model,
        modelName: data.modelName,
        category: data.category,
        score: data.finalScore || data.initialScore || 0,
        note: data.note || '' // Note
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

  // Helper to get display name for a groupID (e.g., "CG001" -> "Functional Status")
  getGroupDisplayName(groupId: string): string {
    const displayName = this.conditionGroupNames[groupId] || groupId;
    return displayName;
  }

  // Check if admin has made changes to conditions
  hasAdminReviewedConditions(): boolean {
    return Object.keys(this.adminConditions).length > 0;
  }

  // Get list of condition group IDs for iteration, sorted by display_order from database
  // Backend already filters to only return groups that were active at submission time
  getConditionGroupIds(): string[] {
    // Get all group IDs from conditionGroupNames (backend filtered)
    // Sort by display_order
    return Object.keys(this.conditionGroupNames).sort((a, b) => {
      const orderA = this.conditionGroupOrder[a] ?? 999999;
      const orderB = this.conditionGroupOrder[b] ?? 999999;
      return orderA - orderB;
    });
  }

  goBack(): void {
    this.router.navigate(['/transactions']);
  }

  viewRecoverySlip(): void {
    // Update breadcrumb to show full path
    this.breadcrumbService.setBreadcrumbs([
      { label: 'Transactions', url: '/transactions' },
      { label: 'Transaction Detail', url: `/transaction-detail/${this.transactionId}` },
      { label: 'Recovery Slip' } // Current page (no URL)
    ]);

    this.router.navigate(['/recovery-slip', this.transactionId], {
      state: { fromTransactionId: this.transactionId }
    });
    console.log('View recovery slip for transaction:', this.transactionId);
  }

  viewPackagingInstruction(): void {
    // Update breadcrumb to show full path
    this.breadcrumbService.setBreadcrumbs([
      { label: 'Transactions', url: '/transactions' },
      { label: 'Transaction Detail', url: `/transaction-detail/${this.transactionId}` },
      { label: 'Packaging Guide' } // Current page (no URL)
    ]);

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
      'Picked Up'    
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

    // Determine item status based on current transaction status
    // If "Under Review", keep "Awaiting Pick Up" since item hasn't been picked up yet
    // Otherwise, set to "Awaiting Return"
    const itemStatus = this.transaction.transactionStatus === 'Under Review'
      ? 'Awaiting Pick Up'
      : 'Awaiting Return';

    console.log('🔄 Cancelling transaction:', {
      currentStatus: this.transaction.transactionStatus,
      newItemStatus: itemStatus
    });

    // Call API to update transaction status to "Cancelled"
    this.transactionService.updateTransactionStatus(
      this.transactionId,
      'Cancelled',
      itemStatus
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

  // ========== CUSTOMER INFO EDIT MODE ==========

  // Enable edit mode
  enableEditMode(): void {
    // Copy current customer info to editable fields
    this.editableCustomerInfo = {
      name: this.customerInfo.name,
      contactNumber: this.customerInfo.contactNumber,
      address: this.customerInfo.address,
      city: this.customerInfo.city,
      state: this.customerInfo.state,
      zipCode: this.customerInfo.zipCode,
      pickupDate: this.customerInfo.pickupDate !== 'Not scheduled'
        ? new Date(this.customerInfo.pickupDate).toISOString().split('T')[0]
        : '',
      pickupTimeSlot: this.customerInfo.pickupTimeSlot !== 'Not scheduled'
        ? this.customerInfo.pickupTimeSlot
        : this.timeSlots[0]
    };

    // Populate cities based on current state
    if (this.editableCustomerInfo.state) {
      this.availableCities = this.malaysianCities[this.editableCustomerInfo.state] || [];
    }

    // Reset validation errors and warnings
    this.resetValidationErrors();
    this.showPickupDateWarning = false;

    this.isEditMode = true;
  }

  // Cancel edit mode
  cancelEditMode(): void {
    this.isEditMode = false;
    this.resetValidationErrors();
  }

  // Handle state change - update available cities
  onStateChange(): void {
    const selectedState = this.editableCustomerInfo.state;
    this.availableCities = this.malaysianCities[selectedState] || [];

    // Reset city if it's not in the new state's cities
    if (!this.availableCities.includes(this.editableCustomerInfo.city)) {
      this.editableCustomerInfo.city = '';
    }

    // Clear city validation error
    this.validationErrors.city = '';
  }

  // Handle pickup date change - check for 24-hour warning
  onPickupDateChange(): void {
    this.checkPickupDateWarning();
  }

  // Check if pickup date change is within 24 hours of original date
  checkPickupDateWarning(): void {
    if (!this.editableCustomerInfo.pickupDate || !this.originalPickupDate) {
      this.showPickupDateWarning = false;
      return;
    }

    const now = new Date();
    const originalDate = new Date(this.originalPickupDate);
    const timeDifference = originalDate.getTime() - now.getTime();
    const hoursDifference = timeDifference / (1000 * 60 * 60);

    // Show warning if the original pickup date is within 24 hours from now
    // AND the user is trying to change the date
    const isDateChanged = this.editableCustomerInfo.pickupDate !== this.originalPickupDate;
    this.showPickupDateWarning = hoursDifference <= 24 && hoursDifference > 0 && isDateChanged;
  }

  // Reset validation errors
  resetValidationErrors(): void {
    this.validationErrors = {
      name: '',
      contactNumber: '',
      address: '',
      city: '',
      state: '',
      zipCode: '',
      pickupDate: '',
      pickupTimeSlot: ''
    };
  }

  // Validate phone number (Malaysian format: 01X-XXXXXXX or 01X-XXXXXXXX)
  validatePhoneNumber(phone: string): boolean {
    // Remove spaces and hyphens for validation
    const cleanPhone = phone.replace(/[\s-]/g, '');

    // Malaysian mobile: 01X-XXXXXXX or 01X-XXXXXXXX (10-11 digits)
    const mobilePattern = /^01[0-9]{8,9}$/;

    // Malaysian landline: 0X-XXXXXXX (9-10 digits)
    const landlinePattern = /^0[2-9][0-9]{7,8}$/;

    return mobilePattern.test(cleanPhone) || landlinePattern.test(cleanPhone);
  }

  // Validate zip code (Malaysian postcode: 5 digits)
  validateZipCode(zipCode: string): boolean {
    const zipPattern = /^[0-9]{5}$/;
    return zipPattern.test(zipCode);
  }

  // Validate all fields
  validateCustomerInfo(): boolean {
    let isValid = true;
    this.resetValidationErrors();

    // Validate name
    if (!this.editableCustomerInfo.name || this.editableCustomerInfo.name.trim() === '') {
      this.validationErrors.name = 'Receiver name is required';
      isValid = false;
    }

    // Validate contact number
    if (!this.editableCustomerInfo.contactNumber || this.editableCustomerInfo.contactNumber.trim() === '') {
      this.validationErrors.contactNumber = 'Contact number is required';
      isValid = false;
    } else if (!this.validatePhoneNumber(this.editableCustomerInfo.contactNumber)) {
      this.validationErrors.contactNumber = 'Invalid phone number format (e.g., 012-3456789 or 03-12345678)';
      isValid = false;
    }

    // Validate address
    if (!this.editableCustomerInfo.address || this.editableCustomerInfo.address.trim() === '') {
      this.validationErrors.address = 'Address is required';
      isValid = false;
    }

    // Validate state
    if (!this.editableCustomerInfo.state || this.editableCustomerInfo.state.trim() === '') {
      this.validationErrors.state = 'State is required';
      isValid = false;
    }

    // Validate city
    if (!this.editableCustomerInfo.city || this.editableCustomerInfo.city.trim() === '') {
      this.validationErrors.city = 'City is required';
      isValid = false;
    }

    // Validate zip code
    if (!this.editableCustomerInfo.zipCode || this.editableCustomerInfo.zipCode.trim() === '') {
      this.validationErrors.zipCode = 'Zip code is required';
      isValid = false;
    } else if (!this.validateZipCode(this.editableCustomerInfo.zipCode)) {
      this.validationErrors.zipCode = 'Invalid zip code (must be 5 digits)';
      isValid = false;
    }

    // Validate pickup date
    if (!this.editableCustomerInfo.pickupDate || this.editableCustomerInfo.pickupDate.trim() === '') {
      this.validationErrors.pickupDate = 'Pickup date is required';
      isValid = false;
    }

    // Validate pickup time slot
    if (!this.editableCustomerInfo.pickupTimeSlot || this.editableCustomerInfo.pickupTimeSlot.trim() === '') {
      this.validationErrors.pickupTimeSlot = 'Pickup time slot is required';
      isValid = false;
    }

    return isValid;
  }

  // Save customer info changes
  saveCustomerInfo(): void {
    if (!this.transaction) return;

    // Validate all fields before saving
    if (!this.validateCustomerInfo()) {
      this.alertService.error('Please fix the validation errors before saving.');
      return;
    }

    this.loading = true;

    // Prepare update data
    const updateData = {
      snapshotReceiverName: this.editableCustomerInfo.name,
      snapshotPhoneNum: this.editableCustomerInfo.contactNumber,
      snapshotAddress: this.editableCustomerInfo.address,
      snapshotCity: this.editableCustomerInfo.city,
      snapshotState: this.editableCustomerInfo.state,
      snapshotZipCode: this.editableCustomerInfo.zipCode,
      pickupDate: this.editableCustomerInfo.pickupDate,
      pickupTimeSlot: this.editableCustomerInfo.pickupTimeSlot
    };

    console.log('💾 Saving customer info:', updateData);

    // Call API to update customer information
    this.transactionService.updateCustomerInfo(this.transactionId, updateData).subscribe({
      next: (updatedTransaction) => {
        console.log('✅ Customer info updated successfully:', updatedTransaction);

        // Update local customer info with new values
        this.customerInfo = {
          name: this.editableCustomerInfo.name,
          email: this.customerInfo.email, // email is not editable
          contactNumber: this.editableCustomerInfo.contactNumber,
          address: this.editableCustomerInfo.address,
          city: this.editableCustomerInfo.city,
          state: this.editableCustomerInfo.state,
          zipCode: this.editableCustomerInfo.zipCode,
          pickupDate: this.editableCustomerInfo.pickupDate,
          pickupTimeSlot: this.editableCustomerInfo.pickupTimeSlot
        };

        // Recalculate minimum pickup date
        if (this.editableCustomerInfo.pickupDate) {
          const originalDate = new Date(this.editableCustomerInfo.pickupDate);
          originalDate.setDate(originalDate.getDate() + 2);
          this.minPickupDate = originalDate.toISOString().split('T')[0];
        }

        this.loading = false;
        this.isEditMode = false;
        this.alertService.success('Customer information updated successfully!');
      },
      error: (error) => {
        console.error('❌ Error updating customer info:', error);
        console.error('Error details:', {
          status: error.status,
          statusText: error.statusText,
          message: error.message,
          error: error.error
        });
        this.loading = false;
        const errorMessage = error.error?.message || error.message || 'Unknown error';
        this.alertService.error(`Failed to update customer information: ${errorMessage}\n\nPlease check console for details.`);
      }
    });
  }

  // ========== DYNAMIC GROUP ORDERING METHODS ==========

  // Check if a group is file_upload type based on question_type from database
  isFileUploadGroup(groupID: string): boolean {
    // Check the question_type from the database
    return this.conditionGroupTypes[groupID] === 'file_upload';
  }

  // Helper methods for photo upload groups - always from Photo table
  getSellerPhotosForGroup(groupID: string): string[] {
    // Photos are stored in the Photo table, not in ConditionSelected
    // Return seller photos from the Photo table (remark != 'admin')
    return this.sellerPhotos || [];
  }

  getAdminPhotosForGroup(groupID: string): string[] {
    // Photos are stored in the Photo table, not in ConditionSelected
    // Return admin photos from the Photo table (remark = 'admin')
    return this.adminPhotos || [];
  }

    // Check if a group has any seller data (for showing "No data" message)
  hasSellerDataForGroup(groupID: string): boolean {
    if (this.isFileUploadGroup(groupID)) {
      return this.sellerPhotos.length > 0;
    }
    const value = this.sellerConditions[groupID];
    return value !== undefined && value !== null && value !== '';
  }

  // Check if a group has any admin data (for showing "No data" message)
  hasAdminDataForGroup(groupID: string): boolean {
    if (this.isFileUploadGroup(groupID)) {
      return this.adminPhotos.length > 0;
    }
    const value = this.adminConditions[groupID];
    return value !== undefined && value !== null && value !== '';
  }

  // Photo navigation for seller photos
  prevSellerPhoto(event: Event): void {
    event.stopPropagation();
    if (this.sellerPhotoIndex > 0) {
      this.sellerPhotoIndex--;
    }
  }

  nextSellerPhoto(event: Event): void {
    event.stopPropagation();
    const currentGroup = this.getCurrentPhotoGroup();
    if (currentGroup) {
      const photos = this.getSellerPhotosForGroup(currentGroup);
      if (this.sellerPhotoIndex < photos.length - 1) {
        this.sellerPhotoIndex++;
      }
    }
  }

  // Photo navigation for admin photos
  prevAdminPhoto(event: Event): void {
    event.stopPropagation();
    if (this.adminPhotoIndex > 0) {
      this.adminPhotoIndex--;
    }
  }

  nextAdminPhoto(event: Event): void {
    event.stopPropagation();
    const currentGroup = this.getCurrentPhotoGroup();
    if (currentGroup) {
      const photos = this.getAdminPhotosForGroup(currentGroup);
      if (this.adminPhotoIndex < photos.length - 1) {
        this.adminPhotoIndex++;
      }
    }
  }

  // Helper to get current photo group (assumes only one file_upload group)
  private getCurrentPhotoGroup(): string | null {
    for (const groupId of this.getConditionGroupIds()) {
      const sellerValue = this.sellerConditions[groupId];
      const adminValue = this.adminConditions[groupId];
      if (Array.isArray(sellerValue) || Array.isArray(adminValue)) {
        return groupId;
      }
    }
    return null;
  }

  // ========== RESPONSE DEADLINE METHODS ==========

  // Calculate days until deadline
  get daysUntilDeadline(): number {
    console.log('📊 daysUntilDeadline getter called');
    console.log('📊 transaction:', this.transaction);
    console.log('📊 responseDeadline:', this.transaction?.responseDeadline);

    if (!this.transaction?.responseDeadline) {
      console.log('⚠️ No responseDeadline found, returning 0');
      return 0;
    }

    const now = new Date();
    const deadline = new Date(this.transaction.responseDeadline);
    const timeDifference = deadline.getTime() - now.getTime();
    const daysDifference = Math.ceil(timeDifference / (1000 * 60 * 60 * 24));

    console.log('📊 Calculated days:', daysDifference);
    return Math.max(0, daysDifference); // Return 0 if negative (expired)
  }

  // Check if deadline has passed
  isDeadlineExpired(): boolean {
    if (!this.transaction?.responseDeadline) return false;

    const now = new Date();
    const deadline = new Date(this.transaction.responseDeadline);
    return now > deadline;
  }

  // Check if deadline is approaching (≤ 3 days)
  isDeadlineApproaching(): boolean {
    return this.daysUntilDeadline <= 3 && !this.isDeadlineExpired();
  }

  // Update existing formatDate method to handle both deadlines
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

  // Get CSS class for deadline status
  deadlineStatusClass(): string {
    if (this.isDeadlineExpired()) {
      return 'expired';
    } else if (this.isDeadlineApproaching()) {
      return 'warning';
    }
    return 'normal';
  }

    // ========== PAYMENT DUE DATE METHODS (NEW) ==========

  // Calculate days until payment due date
  get daysUntilPaymentDue(): number {
    if (!this.transaction?.paymentDueDate) return 0;

    const now = new Date();
    const dueDate = new Date(this.transaction.paymentDueDate);
    const timeDifference = dueDate.getTime() - now.getTime();
    const daysDifference = Math.ceil(timeDifference / (1000 * 60 * 60 * 24));

    return Math.max(0, daysDifference);
  }

  // Check if payment due date has passed
  isPaymentDueDateExpired(): boolean {
    if (!this.transaction?.paymentDueDate) return false;

    const now = new Date();
    const dueDate = new Date(this.transaction.paymentDueDate);
    return now > dueDate;
  }

  // Check if payment due date is approaching (≤ 3 days)
  isPaymentDueDateApproaching(): boolean {
    return this.daysUntilPaymentDue <= 3 && !this.isPaymentDueDateExpired();
  }
}

