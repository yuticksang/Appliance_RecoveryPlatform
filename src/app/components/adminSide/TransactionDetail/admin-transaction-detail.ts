import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
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

  // Expose Array for template use
  protected Array = Array;

  // Editable fields
  transactionStatus = '';
  itemStatus = '';
  finalPrice = 0;
  selectedCategoryId: string | number | null = null;
  selectedBrandId: string | number | null = null;
  selectedApplianceId: string | number | null = null;
  note = '';

  // Dropdown data from backend
  categories: any[] = [];
  brands: any[] = [];
  appliances: any[] = [];
  filteredAppliances: any[] = [];

  // Dynamic condition groups from backend (replaces hardcoded functionalStatuses, appearanceStatuses)
  conditionGroups: any[] = [];
  // Store selected values for each condition group
  // For radio/dropdown: { [groupID]: string }
  // For checkbox: { [groupID]: string[] }
  // For textarea: { [groupID]: string }
  selectedConditions: { [key: string]: string | string[] } = {};

  // File uploads for file_upload type condition groups
  uploadedFiles: { [key: string]: File[] } = {};
  uploadedFilePreviews: { [key: string]: string[] } = {};

  // Photos gallery
  photos: string[] = [];
  selectedPhotoIndex: number = 0;

  // Photo lightbox modal
  showPhotoLightbox: boolean = false;
  lightboxPhotoIndex: number = 0;
  lightboxZoomLevel: number = 1;
  minZoom: number = 1;
  maxZoom: number = 3;

  // Transaction/Item status options (these are fixed, not from condition groups)
  transactionStatuses = [
    'Under Review',
    'Awaiting Confirmation',
    'Completed'
  ];

  itemStatuses = [
    'Awaiting Pick Up',
    'Picked Up',
    'Returned'
  ];

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadAllData(id);
    }
  }

  loadAllData(transactionId: string): void {
    this.loading.set(true);

    // Load all dropdown data and transaction data together using forkJoin
    forkJoin({
      categories: this.transactionService.getAllCategories(),
      brands: this.transactionService.getAllBrands(),
      appliances: this.transactionService.getAllAppliances(),
      conditionGroups: this.transactionService.getActiveConditionGroupsWithOptions(),
      transaction: this.transactionService.getTransactionById(transactionId)
    }).subscribe({
      next: (result) => {
        // Set dropdown data
        this.categories = result.categories.filter((c: any) => c.status === 'ACTIVE');
        this.brands = result.brands.filter((b: any) => b.status === 'ACTIVE');
        this.appliances = result.appliances.filter((a: any) => a.status === 'ACTIVE');
        this.filteredAppliances = this.appliances;
        this.conditionGroups = result.conditionGroups;

        console.log('📂 Categories loaded:', this.categories);
        console.log('🏷️ Brands loaded:', this.brands);
        console.log('📱 Appliances loaded:', this.appliances);
        console.log('📋 Condition groups loaded:', this.conditionGroups);

        // Debug: Check each group's options
        this.conditionGroups.forEach(group => {
          console.log(`Group "${group.criteriaName}" (${group.question_type}):`, {
            groupID: group.groupID,
            optionsCount: group.options?.length || 0,
            options: group.options
          });
        });

        // Set transaction data
        const data = result.transaction;
        console.log('📦 Transaction detail loaded:', data);

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
        this.finalPrice = data.finalPrice || data.estimatedPrice || 0;
        this.note = data.finalNote || ''; // Admin's review note

        // Load seller-submitted photos from backend
        if (data.photos && data.photos.length > 0) {
          this.photos = data.photos;
          this.selectedPhotoIndex = 0;
        } else {
          this.photos = [];
        }

        // Now match IDs (dropdown data is already loaded)
        this.setSelectedIdsFromTransaction(data);

        // Set selected conditions from transaction's conditionGroups
        this.setSelectedConditionsFromTransaction(data);

        this.loading.set(false);
      },
      error: (error) => {
        console.error('❌ Error loading data:', error);
        this.alertService.error('Failed to load transaction details');
        this.loading.set(false);
      }
    });
  }

  onCategoryChange(): void {
    // Filter appliances by selected category
    this.filterAppliances();
    this.selectedApplianceId = null;

    // Reload condition groups filtered by selected category
    this.loadConditionGroupsByCategory();
  }

  loadConditionGroupsByCategory(): void {
    if (this.selectedCategoryId) {
      this.transactionService.getActiveConditionGroupsWithOptions(this.selectedCategoryId).subscribe({
        next: (groups) => {
          this.conditionGroups = groups;
          console.log('📋 Condition groups reloaded for category:', this.selectedCategoryId, groups);
          // Reset selected conditions for checkbox types
          this.initializeSelectedConditions();
        },
        error: (error) => {
          console.error('Error loading condition groups:', error);
        }
      });
    }
  }

  initializeSelectedConditions(): void {
    // Initialize selectedConditions based on question_type
    for (const group of this.conditionGroups) {
      if (group.question_type === 'checkbox') {
        // For checkbox, initialize as empty array if not already set
        if (!Array.isArray(this.selectedConditions[group.groupID])) {
          this.selectedConditions[group.groupID] = [];
        }
      } else if (!this.selectedConditions[group.groupID]) {
        // For radio/dropdown/textarea, initialize as empty string
        this.selectedConditions[group.groupID] = '';
      }
    }
  }

  onBrandChange(): void {
    // Filter appliances by selected brand
    this.filterAppliances();
    this.selectedApplianceId = null;
  }

  filterAppliances(): void {
    // Filter appliances by selected category and brand
    this.filteredAppliances = this.appliances.filter(a => {
      const matchesCategory = !this.selectedCategoryId || a.categoryID === this.selectedCategoryId;
      const matchesBrand = !this.selectedBrandId || a.brandID === this.selectedBrandId;
      return matchesCategory && matchesBrand;
    });
  }

  onApplianceChange(): void {
    // When model name (appliance) is selected, auto-fill category and brand
    if (this.selectedApplianceId) {
      const appliance = this.appliances.find(a => a.applianceID === this.selectedApplianceId);
      if (appliance) {
        this.selectedCategoryId = appliance.categoryID;
        this.selectedBrandId = appliance.brandID;
        console.log('📱 Appliance selected:', appliance);
      }
    }
  }

  // Get model code based on selected appliance
  getSelectedModelCode(): string {
    if (this.selectedApplianceId) {
      const appliance = this.appliances.find(a => a.applianceID === this.selectedApplianceId);
      return appliance?.modelCode || '';
    }
    return '';
  }

  // Check if transaction is under review or awaiting pick up (hasn't been reviewed yet)
  isUnderReviewOrAwaitingPickup(): boolean {
    const status = this.transaction()?.transactionStatus;
    return status === 'Under Review' ||
           status === 'Awaiting Pick Up' ||
           this.transaction()?.itemStatus === 'Awaiting Pick Up';
  }

  // Set selected IDs based on transaction data by matching names
  setSelectedIdsFromTransaction(data: any): void {
    // Find category by name
    const category = this.categories.find(c => c.categoryName === data.category);
    if (category) {
      this.selectedCategoryId = category.categoryID;
    }

    // Find brand by name
    const brand = this.brands.find(b => b.brandName === data.brand);
    if (brand) {
      this.selectedBrandId = brand.brandID;
    }

    // Find appliance by model code
    const appliance = this.appliances.find(a => a.modelCode === data.model);
    if (appliance) {
      this.selectedApplianceId = appliance.applianceID;
    }

    this.filterAppliances();
    console.log('🔗 Matched IDs:', {
      categoryId: this.selectedCategoryId,
      brandId: this.selectedBrandId,
      applianceId: this.selectedApplianceId
    });
  }

  // Set selected conditions from transaction's conditionGroups
  setSelectedConditionsFromTransaction(data: any): void {
    this.selectedConditions = {};

    if (data.conditionGroups) {
      // data.conditionGroups is like: { "Functional Status": ["Fully Functioning"], "Appearance Status": ["Like New"] }
      // We need to match criteriaName to groupID and set the selected value
      for (const group of this.conditionGroups) {
        const groupName = group.criteriaName;
        if (data.conditionGroups[groupName] && data.conditionGroups[groupName].length > 0) {
          // Take the first selected option for this group
          this.selectedConditions[group.groupID] = data.conditionGroups[groupName][0];
        }
      }
    }

    console.log('📋 Selected conditions:', this.selectedConditions);
  }

  // Get option description for a condition group (for display in view mode)
  getConditionValue(groupName: string): string {
    const txn = this.transaction();
    if (txn?.conditionGroups && txn.conditionGroups[groupName]) {
      return txn.conditionGroups[groupName].join(', ');
    }
    return 'N/A';
  }

  toggleEditMode(): void {
    this.editMode.set(!this.editMode());
  }

  saveChanges(): void {
    const txn = this.transaction();
    if (!txn) return;

    console.log('💾 Saving changes for transaction:', txn.id);

    // Get selected appliance details
    const selectedAppliance = this.appliances.find(a => a.applianceID === this.selectedApplianceId);
    const selectedCategory = this.categories.find(c => c.categoryID === this.selectedCategoryId);
    const selectedBrand = this.brands.find(b => b.brandID === this.selectedBrandId);

    // Build adminConditions object from selectedConditions
    // Format: { [groupID]: value (description string, array of descriptions, or base64 strings for files) }
    // Include ALL types: radio, checkbox, dropdown, image, textarea, and file_upload
    const adminConditions: { [key: string]: string | string[] } = {};

    for (const group of this.conditionGroups) {
      const selectedValue = this.selectedConditions[group.groupID];
      if (selectedValue) {
        // Skip empty values
        if (Array.isArray(selectedValue) && selectedValue.length === 0) continue;
        if (typeof selectedValue === 'string' && selectedValue.trim() === '') continue;

        adminConditions[group.groupID] = selectedValue;
      }
    }

    console.log('📋 Admin conditions to save:', adminConditions);

    // Handle file uploads - convert to base64 or prepare FormData
    if (Object.keys(this.uploadedFiles).length > 0) {
      console.log('📸 Processing uploaded files...');

      // Convert files to base64 for each group
      const filePromises: Promise<void>[] = [];

      for (const groupID in this.uploadedFiles) {
        const files = this.uploadedFiles[groupID];
        if (files && files.length > 0) {
          const filePromise = Promise.all(
            files.map(file => this.convertFileToBase64(file))
          ).then(base64Array => {
            // Store base64 strings in adminConditions
            adminConditions[groupID] = base64Array;
            console.log(`✅ Converted ${files.length} files for group ${groupID}`);
          });
          filePromises.push(filePromise);
        }
      }

      // Wait for all files to be converted
      Promise.all(filePromises).then(() => {
        this.sendUpdateRequest(txn, adminConditions, selectedBrand, selectedAppliance, selectedCategory);
      }).catch(error => {
        console.error('❌ Error converting files:', error);
        this.alertService.error('Failed to process uploaded files');
      });
    } else {
      // No files to upload, proceed directly
      this.sendUpdateRequest(txn, adminConditions, selectedBrand, selectedAppliance, selectedCategory);
    }
  }

  // Helper method to send the update request
  private sendUpdateRequest(txn: any, adminConditions: any, selectedBrand: any, selectedAppliance: any, selectedCategory: any): void {
    // Format photos array for backend (convert to { photoURL: string }[] format)
    const photosArray = this.photos.map(photoURL => ({ photoURL }));

    const updateData = {
      transactionStatus: this.transactionStatus,
      itemStatus: this.itemStatus,
      finalPrice: this.finalPrice,
      brand: selectedBrand?.brandName || '',
      model: selectedAppliance?.modelCode || '',
      category: selectedCategory?.categoryName || '',
      modelName: selectedAppliance?.modelName || '',
      finalNote: this.note, // Admin's review note
      // Send admin checklist conditions
      adminConditions: adminConditions,
      // Send main photos array with remarks
      photos: photosArray
    };

    console.log('📤 Sending update data:', { ...updateData, photosCount: photosArray.length });

    this.transactionService.updateTransaction(txn.id, updateData).subscribe({
      next: () => {
        this.alertService.success('Transaction updated successfully');
        this.editMode.set(false);
        this.uploadedFiles = {}; // Clear uploaded files
        this.loadAllData(txn.id); // Reload to get fresh data
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
      this.note = (txn as any).finalNote || txn.note || ''; // Admin's review note
      // Reset selected IDs
      this.setSelectedIdsFromTransaction(txn);
      // Reset selected conditions
      this.setSelectedConditionsFromTransaction(txn);
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

  // Helper to get condition group names for iteration in template
  getConditionGroupNames(): string[] {
    const txn = this.transaction();
    if (!txn) return [];
    // Combine keys from both seller and admin conditions
    const sellerKeys = txn.sellerConditions ? Object.keys(txn.sellerConditions) : [];
    const adminKeys = txn.adminConditions ? Object.keys(txn.adminConditions) : [];
    const allKeys = new Set([...sellerKeys, ...adminKeys]);
    return Array.from(allKeys);
  }

  // Helper to check if there are any condition groups
  hasConditionGroups(): boolean {
    const txn = this.transaction();
    if (!txn) return false;
    // Check both seller and admin conditions
    const hasSellerConditions = txn.sellerConditions && Object.keys(txn.sellerConditions).length > 0;
    const hasAdminConditions = txn.adminConditions && Object.keys(txn.adminConditions).length > 0;
    const hasLegacyConditions = txn.conditionGroups && Object.keys(txn.conditionGroups).length > 0;
    return hasSellerConditions || hasAdminConditions || hasLegacyConditions;
  }

  // Helper to check if admin has reviewed (has any admin conditions)
  hasAdminConditions(): boolean {
    const txn = this.transaction();
    if (!txn || !txn.adminConditions) return false;
    return Object.keys(txn.adminConditions).length > 0;
  }

  // Check if a condition value changed between seller and admin
  isConditionChanged(groupName: string, adminValue: string): boolean {
    const txn = this.transaction();
    if (!txn || !txn.sellerConditions || !txn.sellerConditions[groupName]) return false;
    // Check if the admin value is different from seller's value
    return !txn.sellerConditions[groupName].includes(adminValue);
  }

  // ========== CHECKBOX HELPER METHODS ==========

  // Toggle checkbox selection for a condition option
  toggleCheckboxOption(groupID: string, optionDescription: string): void {
    if (!Array.isArray(this.selectedConditions[groupID])) {
      this.selectedConditions[groupID] = [];
    }
    const arr = this.selectedConditions[groupID] as string[];
    const index = arr.indexOf(optionDescription);
    if (index > -1) {
      arr.splice(index, 1);
    } else {
      arr.push(optionDescription);
    }
  }

  // Check if a checkbox option is selected
  isCheckboxOptionSelected(groupID: string, optionDescription: string): boolean {
    const selected = this.selectedConditions[groupID];
    if (Array.isArray(selected)) {
      return selected.includes(optionDescription);
    }
    return false;
  }

  // ========== FILE UPLOAD HELPER METHODS ==========

  // Handle file selection for file_upload type
  onFileSelected(event: Event, groupID: string): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      if (!this.uploadedFiles[groupID]) {
        this.uploadedFiles[groupID] = [];
        this.uploadedFilePreviews[groupID] = [];
      }

      for (let i = 0; i < input.files.length; i++) {
        const file = input.files[i];
        this.uploadedFiles[groupID].push(file);

        // Create preview URL
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target?.result) {
            this.uploadedFilePreviews[groupID].push(e.target.result as string);
          }
        };
        reader.readAsDataURL(file);
      }
    }
  }

  // Remove uploaded file
  removeUploadedFile(groupID: string, index: number): void {
    if (this.uploadedFiles[groupID]) {
      this.uploadedFiles[groupID].splice(index, 1);
      this.uploadedFilePreviews[groupID].splice(index, 1);
    }
  }

  // Check if group has file_upload type and is active
  hasFileUploadGroup(): boolean {
    return this.conditionGroups.some(g => g.question_type === 'file_upload');
  }

  // ========== PHOTO GALLERY METHODS ==========

  // Check if there are multiple photos
  get hasMultiplePhotos(): boolean {
    return this.photos.length > 1;
  }

  // Check if there are any photos
  get hasPhotos(): boolean {
    return this.photos.length > 0;
  }

  // Get the currently selected photo
  get selectedPhoto(): string {
    if (this.photos.length > 0) {
      return this.photos[this.selectedPhotoIndex];
    }
    return this.transaction()?.imageUrl || 'assets/image/placeholder-appliance.png';
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
    this.lightboxZoomLevel = 1;
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
    this.lightboxZoomLevel = 1;
    if (this.lightboxPhotoIndex > 0) {
      this.lightboxPhotoIndex--;
    } else {
      this.lightboxPhotoIndex = this.photos.length - 1;
    }
  }

  // Navigate to next photo in lightbox
  nextLightboxPhoto(): void {
    this.lightboxZoomLevel = 1;
    if (this.lightboxPhotoIndex < this.photos.length - 1) {
      this.lightboxPhotoIndex++;
    } else {
      this.lightboxPhotoIndex = 0;
    }
  }

  // Convert file to base64 string for upload
  private convertFileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve(reader.result as string);
      };
      reader.onerror = (error) => {
        console.error('❌ Error reading file:', error);
        reject(error);
      };
      reader.readAsDataURL(file);
    });
  }
}
