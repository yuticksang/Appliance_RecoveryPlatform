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

  // Editable fields
  transactionStatus = '';
  itemStatus = '';
  finalPrice = 0;
  selectedCategoryId: number | null = null;
  selectedBrandId: number | null = null;
  selectedApplianceId: number | null = null;
  note = '';

  // Dropdown data from backend
  categories: any[] = [];
  brands: any[] = [];
  appliances: any[] = [];
  filteredAppliances: any[] = [];

  // Dynamic condition groups from backend (replaces hardcoded functionalStatuses, appearanceStatuses)
  conditionGroups: any[] = [];
  // Store selected values for each condition group: { [groupID]: selectedOptionDescription }
  selectedConditions: { [key: string]: string } = {};

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
        this.note = data.note || '';

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
  }

  onBrandChange(): void {
    // Filter appliances by selected brand
    this.filterAppliances();
    this.selectedApplianceId = null;
  }

  filterAppliances(): void {
    // Filter appliances by selected brand only (model name dropdown shows models for selected brand)
    this.filteredAppliances = this.appliances.filter(a => {
      return !this.selectedBrandId || a.brandID === this.selectedBrandId;
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

    // Build condition values from selectedConditions
    // Find Functional Status and Appearance Status from condition groups
    let functionalStatus = '';
    let appearanceStatus = '';

    for (const group of this.conditionGroups) {
      const selectedValue = this.selectedConditions[group.groupID];
      if (selectedValue) {
        // Match by criteriaName to determine which field to update
        const groupNameLower = group.criteriaName.toLowerCase();
        if (groupNameLower.includes('functional')) {
          functionalStatus = selectedValue;
        } else if (groupNameLower.includes('appearance') || groupNameLower.includes('physical')) {
          appearanceStatus = selectedValue;
        }
      }
    }

    const updateData = {
      transactionStatus: this.transactionStatus,
      itemStatus: this.itemStatus,
      finalPrice: this.finalPrice,
      brand: selectedBrand?.brandName || '',
      model: selectedAppliance?.modelCode || '',
      category: selectedCategory?.categoryName || '',
      modelName: selectedAppliance?.modelName || '',
      initialFunctionalStatus: functionalStatus,
      initialPhysicalCondition: appearanceStatus,
      note: this.note
    };

    this.transactionService.updateTransaction(txn.id, updateData).subscribe({
      next: () => {
        this.alertService.success('Transaction updated successfully');
        this.editMode.set(false);
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
      this.note = txn.note || '';
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
    if (!txn || !txn.conditionGroups) return [];
    return Object.keys(txn.conditionGroups);
  }

  // Helper to check if there are any condition groups
  hasConditionGroups(): boolean {
    const txn = this.transaction();
    if (!txn || !txn.conditionGroups) return false;
    return Object.keys(txn.conditionGroups).length > 0;
  }
}
