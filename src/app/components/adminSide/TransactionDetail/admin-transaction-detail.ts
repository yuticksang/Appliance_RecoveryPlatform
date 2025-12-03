import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin, Observable } from 'rxjs';
import { TransactionService } from '../../../services/transaction.service';
import { QuestionnaireService } from '../../../services/questionnaire.service';
import { AlertService } from '../../../services/alert.service';

@Component({
  selector: 'app-admin-transaction-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './admin-transaction-detail.html',
  styleUrls: ['./admin-transaction-detail.scss']
})
export class AdminTransactionDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private transactionService = inject(TransactionService);
  private questionnaireService = inject(QuestionnaireService);
  private alertService = inject(AlertService);

  transaction = signal<any>(null);
  loading = signal<boolean>(true);
  editMode = signal<boolean>(false);

  // Expose Array for template use
  protected Array = Array;

  // Editable fields
  transactionStatus = '';
  itemStatus = '';
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

  // Separate photo indices for seller and admin galleries
  sellerPhotoIndex: number = 0;
  adminPhotoIndex: number = 0;

  // Photo view tab (seller or admin)
  photoViewTab: 'seller' | 'admin' = 'seller';

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
      transaction: this.transactionService.getTransactionById(transactionId)
    }).subscribe({
      next: (result) => {
        // Set dropdown data
        this.categories = result.categories.filter((c: any) => c.status === 'ACTIVE');
        this.brands = result.brands.filter((b: any) => b.status === 'ACTIVE');
        this.appliances = result.appliances.filter((a: any) => a.status === 'ACTIVE');
        this.filteredAppliances = this.appliances;

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
        this.note = data.note || '';

        // Load seller-submitted photos from backend
        if (data.photos && data.photos.length > 0) {
          this.photos = data.photos;
          this.selectedPhotoIndex = 0;
        } else {
          this.photos = [];
        }

        // Match IDs from transaction data
        this.setSelectedIdsFromTransaction(data);

        // Load condition groups that existed at submission time (from backend)
        // Use the groups returned by getTransactionById (already filtered by submission time)
        const categoryId = data.categoryId || this.selectedCategoryId;
        
        // Fetch full group details with options for the groups that existed at submission
        this.transactionService.getActiveConditionGroupsWithOptions(categoryId).subscribe({
          next: (allGroups) => {
            const groupIDsAtSubmission = Object.keys(data.conditionGroupNames || {});
            
            // Find which groups are inactive (not in allGroups)
            const inactiveGroupIds = groupIDsAtSubmission.filter(groupID => 
              !allGroups.find(g => g.groupID === groupID)
            );

            // If there are inactive groups, fetch their options
            if (inactiveGroupIds.length > 0) {
              this.transactionService.getConditionOptionsByGroupIds(inactiveGroupIds).subscribe({
                next: (inactiveOptions: { [key: string]: any[] }) => {
                  // Build condition groups array with both active and inactive groups
                  this.conditionGroups = groupIDsAtSubmission.map(groupID => {
                    const group = allGroups.find(g => g.groupID === groupID);
                    
                    if (group) {
                      return group; // Active group with full options
                    } else {
                      // Inactive group - use options from backend
                      return {
                        groupID: groupID,
                        criteriaName: data.conditionGroupNames[groupID],
                        question_type: data.conditionGroupTypes?.[groupID] || 'radio',
                        display_order: data.conditionGroupOrder?.[groupID] ?? 999999,
                        options: inactiveOptions[groupID] || []
                      };
                    }
                  }).sort((a, b) => {
                    const orderA = a.display_order ?? 999999;
                    const orderB = b.display_order ?? 999999;
                    return orderA - orderB;
                  });

                  console.log('📋 Condition groups loaded (with inactive options):', this.conditionGroups);
                  this.setSelectedConditionsFromTransaction(data);
                  this.loading.set(false);
                }
              });
            } else {
              // No inactive groups, just use active groups
              this.conditionGroups = groupIDsAtSubmission.map(groupID => {
                return allGroups.find(g => g.groupID === groupID)!;
              }).filter(g => g).sort((a, b) => {
                const orderA = a.display_order ?? 999999;
                const orderB = b.display_order ?? 999999;
                return orderA - orderB;
              });

              console.log('📋 Condition groups loaded:', this.conditionGroups);
              this.setSelectedConditionsFromTransaction(data);
              this.loading.set(false);
            }
          },
          error: (error) => {
            console.error('❌ Error loading condition groups:', error);
            this.alertService.error('Failed to load condition groups');
            this.loading.set(false);
          }
        });
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
          // Backend already returns groups ordered by display_order
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
    const isEnteringEditMode = !this.editMode();
    this.editMode.set(isEnteringEditMode);

    // Pre-fill form with seller's original data when entering edit mode
    if (isEnteringEditMode) {
      this.prefillFormWithSellerData();
    }
  }

  /**
   * Pre-fill the edit form with the last saved data
   * Priority: Admin's last saved data > Seller's original data
   */
  private prefillFormWithSellerData(): void {
    const txn = this.transaction();
    if (!txn) return;

    // Pre-fill basic fields
    this.transactionStatus = txn.transactionStatus || '';
    this.itemStatus = txn.itemStatus || '';

    // Pre-fill category, brand, appliance dropdowns by matching names
    // Use the existing method that matches by name
    this.setSelectedIdsFromTransaction(txn);

    // Pre-fill dynamic condition selections
    // Priority: Use admin's last saved data if it exists, otherwise use seller's data
    this.selectedConditions = {};

    // Check if admin has previously saved data
    const hasAdminData = txn.adminConditions && typeof txn.adminConditions === 'object' && Object.keys(txn.adminConditions).length > 0;

    if (hasAdminData) {
      // Use admin's last saved data (from previous edit)
      console.log('📋 Pre-filling with admin\'s last saved data');
      for (const [groupID, value] of Object.entries(txn.adminConditions)) {
        this.selectedConditions[groupID] = value as string | string[];

        // Also pre-fill photo previews if this is a file_upload group
        const group = this.conditionGroups.find(g => g.groupID === groupID);
        if (group && group.question_type === 'file_upload' && Array.isArray(value)) {
          // Show admin's last saved photos as previews
          this.uploadedFilePreviews[groupID] = value;
          console.log(`📸 Pre-filling ${value.length} photo previews for group ${groupID}`);
        }
      }
    } else if (txn.sellerConditions && typeof txn.sellerConditions === 'object') {
      // Use seller's original data (first time admin is editing)
      console.log('📋 Pre-filling with seller\'s original data (first edit)');
      for (const [groupID, value] of Object.entries(txn.sellerConditions)) {
        this.selectedConditions[groupID] = value as string | string[];
      }
    }
  }

  saveChanges(): void {
    const txn = this.transaction();
    if (!txn) return;

    console.log('💾 Saving changes for transaction:', txn.id);

    // Get selected appliance details
    const selectedAppliance = this.appliances.find(a => a.applianceID === this.selectedApplianceId);
    const selectedCategory = this.categories.find(c => c.categoryID === this.selectedCategoryId);
    const selectedBrand = this.brands.find(b => b.brandID === this.selectedBrandId);

    // Build adminConditions object and collect conditionIds for scoring
    const adminConditions: { [key: string]: string | string[] } = {};
    const conditionIds: string[] = [];

    for (const group of this.conditionGroups) {
      const selectedValue = this.selectedConditions[group.groupID];
      if (selectedValue) {
        // Skip empty values
        if (Array.isArray(selectedValue) && selectedValue.length === 0) continue;
        if (typeof selectedValue === 'string' && selectedValue.trim() === '') continue;

        adminConditions[group.groupID] = selectedValue;

        // ✅ Collect conditionIds for score calculation
        if (group.question_type === 'radio' || group.question_type === 'dropdown' || group.question_type === 'image') {
          const option = group.options.find((opt: any) => opt.description === selectedValue);
          if (option?.conditionID) {
            conditionIds.push(option.conditionID);
          }
        } else if (group.question_type === 'checkbox' && Array.isArray(selectedValue)) {
          selectedValue.forEach(desc => {
            const option = group.options.find((opt: any) => opt.description === desc);
            if (option?.conditionID) {
              conditionIds.push(option.conditionID);
            }
          });
        }
      }
    }

    console.log('📋 Admin conditions to save:', adminConditions);
    console.log('🎯 Condition IDs for scoring:', conditionIds);

    // ✅ Calculate score using the calculateValuation endpoint
    if (conditionIds.length > 0) {
      const payload = {
        modelId: this.selectedApplianceId,
        conditionIds: conditionIds
      };

      console.log('📊 Calculating admin score with payload:', payload);

      this.questionnaireService.calculateValuation(payload).subscribe({
        next: (scoreResponse: any) => {
          console.log('✅ Admin score calculated:', scoreResponse);

          const scoreLabel = scoreResponse?.scoreLabel || {};
          const finalScore = scoreLabel.totalScore || 0;
          const finalPrice = scoreResponse?.valuationWorth || txn.estimatedPrice;

          console.log(`📊 Final Score: ${finalScore}, Final Price: RM ${finalPrice}`);

          // Send update with calculated score
          this.performUpdateWithScore(txn, adminConditions, selectedBrand, selectedAppliance, selectedCategory, finalScore, finalPrice);
        },
        error: (err: any) => {
          console.error('❌ Error calculating admin score:', err);
          this.alertService.error('Failed to calculate score. Saving without score update.');
          // Continue with save even if score calculation fails
          this.performUpdateWithScore(txn, adminConditions, selectedBrand, selectedAppliance, selectedCategory, 0, txn.estimatedPrice);
        }
      });
    } else {
      // No conditions selected, save without score
      console.log('⚠️ No conditions selected for scoring');
      this.performUpdateWithScore(txn, adminConditions, selectedBrand, selectedAppliance, selectedCategory, 0, txn.estimatedPrice);
    }
  }

  /**
   * Perform update with calculated score
   */
  private performUpdateWithScore(
    txn: any,
    adminConditions: any,
    selectedBrand: any,
    selectedAppliance: any,
    selectedCategory: any,
    finalScore: number,
    finalPrice: number
  ): void {
    // First, upload admin photos to Supabase Storage if there are any
    const uploadPromises: { groupID: string, observable: Observable<string[]> }[] = [];

    if (Object.keys(this.uploadedFiles).length > 0) {
      console.log('📸 Uploading admin photos to Supabase...');

      for (const groupID in this.uploadedFiles) {
        const files = this.uploadedFiles[groupID];
        if (files && files.length > 0) {
          const formData = new FormData();
          files.forEach(file => {
            formData.append('photos', file);
          });

          const uploadObservable = this.transactionService.uploadAdminPhotos(txn.id, formData);
          uploadPromises.push({ groupID, observable: uploadObservable });
        }
      }
    }

    if (uploadPromises.length > 0) {
      const observables = uploadPromises.map(p => p.observable);

      forkJoin(observables).subscribe({
        next: (uploadResults) => {
          uploadResults.forEach((urls, index) => {
            const groupID = uploadPromises[index].groupID;
            adminConditions[groupID] = urls;
          });

          this.sendFinalUpdate(txn, adminConditions, selectedBrand, selectedAppliance, selectedCategory, finalScore, finalPrice);
        },
        error: (error) => {
          console.error('❌ Error uploading photos:', error);
          this.alertService.error('Failed to upload photos');
        }
      });
    } else {
      this.sendFinalUpdate(txn, adminConditions, selectedBrand, selectedAppliance, selectedCategory, finalScore, finalPrice);
    }
  }

  /**
   * Send final update request to backend
   */
  private sendFinalUpdate(
    txn: any,
    adminConditions: any,
    selectedBrand: any,
    selectedAppliance: any,
    selectedCategory: any,
    finalScore: number,
    finalPrice: number
  ): void {
    const updateData = {
      transactionStatus: this.transactionStatus,
      itemStatus: this.itemStatus,
      brand: selectedBrand?.brandName || '',
      model: selectedAppliance?.modelCode || '',
      category: selectedCategory?.categoryName || '',
      modelName: selectedAppliance?.modelName || '',
      note: this.note,
      adminConditions: adminConditions,
      finalScore: finalScore,
      finalPrice: finalPrice,
      finalApplianceID: selectedAppliance?.applianceID || null
    };

    console.log('📤 Sending update data with score and finalApplianceID:', updateData);

    this.transactionService.updateTransaction(txn.id, updateData).subscribe({
      next: () => {
        this.alertService.success('Transaction updated successfully with score: ' + finalScore);
        this.editMode.set(false);
        this.uploadedFiles = {};
        this.uploadedFilePreviews = {};
        this.loadAllData(txn.id);
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
      this.note = txn.note || ''; // Note
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
    // Sort alphabetically to ensure consistent display order (CG001, CG002, CG003, etc.)
    return Array.from(allKeys).sort();
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

    // Check if admin has changed any appliance details
  hasApplianceChanges(): boolean {
    const txn = this.transaction();
    if (!txn) return false;

    // Check if any final appliance field differs from original
    const categoryChanged = txn.finalCategory && txn.finalCategory !== txn.category;
    const brandChanged = txn.finalBrand && txn.finalBrand !== txn.brand;
    const modelNameChanged = txn.finalModelName && txn.finalModelName !== txn.modelName;
    const modelCodeChanged = txn.finalModel && txn.finalModel !== txn.model;

    return categoryChanged || brandChanged || modelNameChanged || modelCodeChanged;
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
  // "None" is mutually exclusive - if selected, clear all others; if others selected, clear "None"
  toggleCheckboxOption(groupID: string, optionDescription: string): void {
    if (!Array.isArray(this.selectedConditions[groupID])) {
      this.selectedConditions[groupID] = [];
    }
    const arr = this.selectedConditions[groupID] as string[];
    const index = arr.indexOf(optionDescription);

    if (index > -1) {
      // Unchecking the option
      arr.splice(index, 1);
    } else {
      // Checking the option
      if (optionDescription.toLowerCase() === 'none') {
        // If selecting "None", clear all other selections
        this.selectedConditions[groupID] = ['None'];
      } else {
        // If selecting any other option, remove "None" first
        const noneIndex = arr.findIndex(item => item.toLowerCase() === 'none');
        if (noneIndex > -1) {
          arr.splice(noneIndex, 1);
        }
        // Then add the new selection
        arr.push(optionDescription);
      }
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

  // Get condition groups that have actual submitted data (for view mode only)
  // This prevents newly added groups from appearing in old transactions
  getConditionGroupsWithData(): any[] {
    const txn = this.transaction();
    if (!txn || !txn.conditionGroupNames) return [];

    // Backend already filtered groups by submission time, so just map them
    return Object.keys(txn.conditionGroupNames).map(groupID => {
      // Find the full group definition from this.conditionGroups
      const group = this.conditionGroups.find(g => g.groupID === groupID);
      if (!group) {
        // If not found in conditionGroups (because it's now inactive), create a minimal object
        return {
          groupID: groupID,
          criteriaName: txn.conditionGroupNames[groupID],
          question_type: txn.conditionGroupTypes?.[groupID] || 'radio',
          options: []
        };
      }
      return group;
    }).sort((a, b) => {
      // Sort by display_order from backend
      const orderA = txn.conditionGroupOrder?.[a.groupID] ?? 999999;
      const orderB = txn.conditionGroupOrder?.[b.groupID] ?? 999999;
      return orderA - orderB;
    });
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

  // Open photo lightbox with specific photo array
  openPhotoLightbox(photoArray: string[], index: number): void {
    this.photos = photoArray;
    this.lightboxPhotoIndex = index;
    this.showPhotoLightbox = true;
  }

  // Open photo lightbox
  openLightbox(index: number): void {
    this.lightboxPhotoIndex = index;
    this.showPhotoLightbox = true;
  }

  // Check if checkbox arrays are different between seller and admin
  checkboxArrayChanged(groupID: string): boolean {
    const txn = this.transaction();
    if (!txn) return false;

    const sellerValue = txn.sellerConditions?.[groupID];
    const adminValue = txn.adminConditions?.[groupID];

    // If no admin value, it means admin confirmed seller's value (no change)
    if (!adminValue) return false;

    // Compare arrays
    if (Array.isArray(sellerValue) && Array.isArray(adminValue)) {
      // Check if arrays have same length and same items
      if (sellerValue.length !== adminValue.length) return true;

      // Sort and compare each item
      const sortedSeller = [...sellerValue].sort();
      const sortedAdmin = [...adminValue].sort();

      return !sortedSeller.every((item, index) => item === sortedAdmin[index]);
    }

    return false;
  }

  // Check if a specific checkbox item was added by admin (not in seller's list)
  isCheckboxItemAdded(groupID: string, item: string): boolean {
    const txn = this.transaction();
    if (!txn) return false;

    const sellerValue = txn.sellerConditions?.[groupID];

    // If seller didn't have this item, it means admin added it
    if (Array.isArray(sellerValue)) {
      return !sellerValue.includes(item);
    }

    // If seller had no value at all, everything admin adds is new
    return true;
  }

  // Get seller photos for a file_upload group - always from Photo table
  getSellerPhotosForGroup(groupID: string): string[] {
    const txn = this.transaction();
    if (!txn) return [];

    // Photos are stored in the Photo table, not in ConditionSelected
    // Return seller photos from the Photo table (remark != 'admin')
    return txn.sellerPhotos || [];
  }

  // Get admin photos for a file_upload group - always from Photo table
  getAdminPhotosForGroup(groupID: string): string[] {
    const txn = this.transaction();
    if (!txn) return [];

    // Photos are stored in the Photo table, not in ConditionSelected
    // Return admin photos from the Photo table (remark = 'admin')
    return txn.adminPhotos || [];
  }

  // Navigate seller photos
  prevSellerPhoto(event: Event): void {
    event.stopPropagation(); // Prevent lightbox from opening
    // Find the file_upload group to get photo count
    const fileUploadGroup = this.conditionGroups.find(g => g.question_type === 'file_upload');
    if (!fileUploadGroup) return;

    const photos = this.getSellerPhotosForGroup(fileUploadGroup.groupID);
    if (photos.length > 0) {
      this.sellerPhotoIndex = this.sellerPhotoIndex > 0 ? this.sellerPhotoIndex - 1 : photos.length - 1;
    }
  }

  nextSellerPhoto(event: Event): void {
    event.stopPropagation(); // Prevent lightbox from opening
    // Find the file_upload group to get photo count
    const fileUploadGroup = this.conditionGroups.find(g => g.question_type === 'file_upload');
    if (!fileUploadGroup) return;

    const photos = this.getSellerPhotosForGroup(fileUploadGroup.groupID);
    if (photos.length > 0) {
      this.sellerPhotoIndex = this.sellerPhotoIndex < photos.length - 1 ? this.sellerPhotoIndex + 1 : 0;
    }
  }

  // Navigate admin photos
  prevAdminPhoto(event: Event): void {
    event.stopPropagation(); // Prevent lightbox from opening
    // Find the file_upload group to get photo count
    const fileUploadGroup = this.conditionGroups.find(g => g.question_type === 'file_upload');
    if (!fileUploadGroup) return;

    const photos = this.getAdminPhotosForGroup(fileUploadGroup.groupID);
    if (photos.length > 0) {
      this.adminPhotoIndex = this.adminPhotoIndex > 0 ? this.adminPhotoIndex - 1 : photos.length - 1;
    }
  }

  nextAdminPhoto(event: Event): void {
    event.stopPropagation(); // Prevent lightbox from opening
    // Find the file_upload group to get photo count
    const fileUploadGroup = this.conditionGroups.find(g => g.question_type === 'file_upload');
    if (!fileUploadGroup) return;

    const photos = this.getAdminPhotosForGroup(fileUploadGroup.groupID);
    if (photos.length > 0) {
      this.adminPhotoIndex = this.adminPhotoIndex < photos.length - 1 ? this.adminPhotoIndex + 1 : 0;
    }
  }

  // Open seller photo lightbox
  openSellerPhotoLightbox(index: number): void {
    const txn = this.transaction();
    if (txn?.sellerPhotos && txn.sellerPhotos.length > 0) {
      // Set photos to seller photos and open lightbox
      this.photos = txn.sellerPhotos;
      this.openLightbox(index);
    }
  }

  // Open admin photo lightbox
  openAdminPhotoLightbox(index: number): void {
    const txn = this.transaction();
    if (txn?.adminPhotos && txn.adminPhotos.length > 0) {
      // Set photos to admin photos and open lightbox
      this.photos = txn.adminPhotos;
      this.openLightbox(index);
    }
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

  /**
   * Get options for an inactive group from backend transaction data
   * This reconstructs the options that were available when the transaction was submitted
   */
  private getOptionsFromBackendData(groupID: string, data: any): any[] {
    const options: any[] = [];

    // Check seller conditions for this group
    const sellerValue = data.sellerConditions?.[groupID];
    const adminValue = data.adminConditions?.[groupID];

    // Combine both seller and admin values to get all possible options
    const allValues = new Set<string>();

    if (typeof sellerValue === 'string' && sellerValue) {
      allValues.add(sellerValue);
    } else if (Array.isArray(sellerValue)) {
      sellerValue.forEach((v: string) => allValues.add(v));
    }

    if (typeof adminValue === 'string' && adminValue) {
      allValues.add(adminValue);
    } else if (Array.isArray(adminValue)) {
      adminValue.forEach((v: string) => allValues.add(v));
    }

    // Create option objects from the values
    Array.from(allValues).forEach(value => {
      options.push({
        conditionID: `${groupID}_${value}`, // Generate a temporary ID
        description: value,
        question: value,
        code: value
      });
    });

    return options;
  }

  // ========== RESPONSE DEADLINE METHODS ==========

  // Calculate days until deadline
  get daysUntilDeadline(): number {
    const txn = this.transaction();
    if (!txn?.responseDeadline) return 0;

    const now = new Date();
    const deadline = new Date(txn.responseDeadline);
    const timeDifference = deadline.getTime() - now.getTime();
    const daysDifference = Math.ceil(timeDifference / (1000 * 60 * 60 * 24));

    return Math.max(0, daysDifference); // Return 0 if negative (expired)
  }

  // Check if deadline has passed
  isDeadlineExpired(): boolean {
    const txn = this.transaction();
    if (!txn?.responseDeadline) return false;

    const now = new Date();
    const deadline = new Date(txn.responseDeadline);
    return now > deadline;
  }

  // Check if deadline is approaching (≤ 3 days)
  isDeadlineApproaching(): boolean {
    return this.daysUntilDeadline <= 3 && !this.isDeadlineExpired();
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
    const txn = this.transaction();
    if (!txn?.paymentDueDate) return 0;

    const now = new Date();
    const dueDate = new Date(txn.paymentDueDate);
    const timeDifference = dueDate.getTime() - now.getTime();
    const daysDifference = Math.ceil(timeDifference / (1000 * 60 * 60 * 24));

    return Math.max(0, daysDifference);
  }

  // Check if payment due date has passed
  isPaymentDueDateExpired(): boolean {
    const txn = this.transaction();
    if (!txn?.paymentDueDate) return false;

    const now = new Date();
    const dueDate = new Date(txn.paymentDueDate);
    return now > dueDate;
  }

  // Check if payment due date is approaching (≤ 3 days)
  isPaymentDueDateApproaching(): boolean {
    return this.daysUntilPaymentDue <= 3 && !this.isPaymentDueDateExpired();
  }
}
