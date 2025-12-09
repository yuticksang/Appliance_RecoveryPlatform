import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PackagingInstructionService } from '../../../services/packaging-instruction.service';
import { QuestionnaireService, Category } from '../../../services/questionnaire.service';
import { AlertService } from '../../../services/alert.service';
import { BreadcrumbComponent } from '../../../shared/breadcrumb/breadcrumb';

interface PackagingInstruction {
  instructionID: string;
  categoryID: string; // Changed from number to string to match database
  categoryName: string;
  stepNumber: number;
  sectionName: string;
  instruction: string;
  icon: string | null;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

@Component({
  selector: 'app-manage-packaging-instructions',
  standalone: true,
  imports: [CommonModule, FormsModule, BreadcrumbComponent],
  templateUrl: './manage-packaging-instructions.html',
  styleUrls: ['./manage-packaging-instructions.scss']
})
export class ManagePackagingInstructionsComponent implements OnInit {
  private packagingService = inject(PackagingInstructionService);
  private questionnaireService = inject(QuestionnaireService);
  private alertService = inject(AlertService);

  // Data
  instructions = signal<PackagingInstruction[]>([]);
  categories = signal<Category[]>([]);
  loading = signal<boolean>(true);
  error = signal<string | null>(null);

  // Filters
  selectedCategoryFilter = signal<string | null>(null);
  selectedSectionFilter = signal<string>('');
  searchQuery = signal<string>('');

  // Pagination
  currentPage = signal<number>(1);
  itemsPerPage = signal<number>(10);
  itemsPerPageOptions = [5, 10, 20, 50];

  // Modal state
  showModal = signal<boolean>(false);
  modalMode = signal<'create' | 'edit'>('create');
  editingInstruction = signal<PackagingInstruction | null>(null);
  originalData: PackagingInstruction | null = null;

  // Delete confirmation modal
  showDeleteModal = signal<boolean>(false);
  instructionToDelete = signal<PackagingInstruction | null>(null);

  // Sorting state
  sortColumn = signal<string>('displayOrder');
  sortDirection = signal<'asc' | 'desc'>('asc');

  // Form data
  formData = {
    categoryId: '0',
    categoryIds: [] as string[], // For multiple category selection
    sectionName: '',
    instruction: '',
    displayOrder: 1,
    isActive: true
  };

  // Common section names for dropdown
  commonSections = [
    'Safety First',
    'Preparation Steps',
    'Packaging Guidelines',
    'Documentation',
    'Final Checklist',
    'Important Notes'
  ];

  ngOnInit(): void {
    this.loadData();
  }

  private loadData(): void {
    this.loading.set(true);

    // Load categories and instructions in parallel
    Promise.all([
      this.loadCategories(),
      this.loadInstructions()
    ]).finally(() => {
      this.loading.set(false);
    });
  }

  private loadCategories(): Promise<void> {
    return new Promise((resolve) => {
      this.questionnaireService.getCategories().subscribe({
        next: (cats) => {
          // Only show categories from database (removed Default/Fallback)
          this.categories.set(cats);
          resolve();
        },
        error: (err) => {
          console.error('Failed to load categories:', err);
          this.alertService.error('Failed to load categories');
          resolve();
        }
      });
    });
  }

  private loadInstructions(): Promise<void> {
    return new Promise((resolve) => {
      this.packagingService.getAllPackagingInstructions().subscribe({
        next: (data) => {
          this.instructions.set(data);
          resolve();
        },
        error: (err) => {
          console.error('Failed to load instructions:', err);
          this.alertService.error('Failed to load packaging instructions');
          resolve();
        }
      });
    });
  }

  // Computed: Get filtered instructions (without pagination)
  get filteredInstructions(): PackagingInstruction[] {
    let filtered = this.instructions();

    // Filter by search query
    if (this.searchQuery()) {
      const query = this.searchQuery().toLowerCase().trim();
      filtered = filtered.filter(i =>
        i.instruction.toLowerCase().includes(query) ||
        i.sectionName.toLowerCase().includes(query) ||
        i.categoryName.toLowerCase().includes(query)
      );
    }

    // Filter by category
    if (this.selectedCategoryFilter() !== null) {
      filtered = filtered.filter(i => i.categoryID === this.selectedCategoryFilter());
    }

    // Filter by section
    if (this.selectedSectionFilter()) {
      filtered = filtered.filter(i => i.sectionName === this.selectedSectionFilter());
    }

    // Apply sorting
    const column = this.sortColumn();
    const direction = this.sortDirection();

    return filtered.sort((a, b) => {
      let comparison = 0;

      switch (column) {
        case 'category':
          comparison = a.categoryName.localeCompare(b.categoryName);
          break;
        case 'section':
          comparison = a.sectionName.localeCompare(b.sectionName);
          break;
        case 'instruction':
          comparison = a.instruction.localeCompare(b.instruction);
          break;
        case 'displayOrder':
          comparison = a.displayOrder - b.displayOrder;
          break;
        case 'status':
          comparison = (a.isActive === b.isActive) ? 0 : a.isActive ? -1 : 1;
          break;
        default:
          comparison = 0;
      }

      return direction === 'asc' ? comparison : -comparison;
    });
  }

  // Get paginated slice of filtered instructions
  get pagedInstructions(): PackagingInstruction[] {
    const filtered = this.filteredInstructions;
    const start = (this.currentPage() - 1) * this.itemsPerPage();
    const end = start + this.itemsPerPage();
    return filtered.slice(start, end);
  }

  // Get total pages
  get totalPages(): number {
    return Math.ceil(this.filteredInstructions.length / this.itemsPerPage());
  }

  // Get page numbers for pagination display
  getPageNumbers(): number[] {
    const total = this.totalPages;
    const current = this.currentPage();
    const delta = 2;
    const range: number[] = [];
    const rangeWithDots: number[] = [];
    let l: number | undefined;

    for (let i = 1; i <= total; i++) {
      if (i === 1 || i === total || (i >= current - delta && i <= current + delta)) {
        range.push(i);
      }
    }

    range.forEach(i => {
      if (l) {
        if (i - l === 2) {
          rangeWithDots.push(l + 1);
        } else if (i - l !== 1) {
          rangeWithDots.push(-1); // -1 represents "..."
        }
      }
      rangeWithDots.push(i);
      l = i;
    });

    return rangeWithDots;
  }

  // Navigate to specific page
  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage.set(page);
    }
  }

  // Set items per page
  setPageSize(size: number): void {
    this.itemsPerPage.set(size);
    this.currentPage.set(1); // Reset to first page when changing page size
  }

  // Get unique section names for filter dropdown
  get uniqueSections(): string[] {
    const sections = new Set(this.instructions().map(i => i.sectionName));
    return Array.from(sections).sort();
  }

  // Open create modal
  openCreateModal(): void {
    this.modalMode.set('create');
    this.resetForm();
    this.showModal.set(true);
  }

  // Open edit modal
  openEditModal(instruction: PackagingInstruction): void {
    this.modalMode.set('edit');
    this.editingInstruction.set(instruction);

    // Store original data for comparison
    this.originalData = { ...instruction };

    // Populate form with existing data
    this.formData = {
      categoryId: instruction.categoryID,
      categoryIds: [], // Not used in edit mode
      sectionName: instruction.sectionName,
      instruction: instruction.instruction,
      displayOrder: instruction.displayOrder,
      isActive: instruction.isActive
    };

    this.showModal.set(true);
  }

  // Close modal
  closeModal(): void {
    this.showModal.set(false);
    this.resetForm();
    this.editingInstruction.set(null);
    this.originalData = null;
  }

  // Reset form
  private resetForm(): void {
    // Use first available category, or empty string if none
    const firstCategoryId = this.categories().length > 0
      ? this.categories()[0].id.toString()
      : '';

    this.formData = {
      categoryId: firstCategoryId,
      categoryIds: [],
      sectionName: '',
      instruction: '',
      displayOrder: 1,
      isActive: true
    };
  }

  // Validate form
  private validateForm(): boolean {
    // For create mode, check if at least one category is selected
    if (this.modalMode() === 'create') {
      if (!this.formData.categoryIds || this.formData.categoryIds.length === 0) {
        this.alertService.error('Please select at least one category');
        return false;
      }
    } else {
      // For edit mode, check single category
      if (!this.formData.categoryId || this.formData.categoryId === null || this.formData.categoryId === undefined) {
        this.alertService.error('Please select a category');
        return false;
      }
    }
    if (!this.formData.sectionName.trim()) {
      this.alertService.error('Section name is required');
      return false;
    }
    if (!this.formData.instruction.trim()) {
      this.alertService.error('Instruction text is required');
      return false;
    }
    if (!this.formData.displayOrder || this.formData.displayOrder < 1) {
      this.alertService.error('Display order must be at least 1');
      return false;
    }
    return true;
  }

  // Save instruction (create or update)
  saveInstruction(): void {
    if (!this.validateForm()) return;

    if (this.modalMode() === 'create') {
      this.createInstruction();
    } else {
      this.updateInstruction();
    }
  }

  // Create new instruction
  private createInstruction(): void {
    const selectedCategories = this.formData.categoryIds;
    let completedCount = 0;
    let errorCount = 0;

    // Create instruction for each selected category
    selectedCategories.forEach((categoryId) => {
      const payload = {
        categoryId: categoryId,
        sectionName: this.formData.sectionName,
        instruction: this.formData.instruction,
        displayOrder: this.formData.displayOrder,
        isActive: this.formData.isActive,
        stepNumber: this.formData.displayOrder
      };

      this.packagingService.createPackagingInstruction(payload).subscribe({
        next: () => {
          completedCount++;

          // Check if all requests are completed
          if (completedCount + errorCount === selectedCategories.length) {
            if (errorCount === 0) {
              this.alertService.success(`Packaging instruction created successfully for ${completedCount} categor${completedCount > 1 ? 'ies' : 'y'}`);
            } else {
              this.alertService.success(`Created for ${completedCount} categor${completedCount > 1 ? 'ies' : 'y'}, failed for ${errorCount}`);
            }
            this.loadInstructions();
            this.closeModal();
          }
        },
        error: (err) => {
          console.error('Failed to create instruction:', err);
          errorCount++;

          // Check if all requests are completed
          if (completedCount + errorCount === selectedCategories.length) {
            if (completedCount === 0) {
              this.alertService.error('Failed to create packaging instruction for all categories');
            } else {
              this.alertService.success(`Created for ${completedCount} categor${completedCount > 1 ? 'ies' : 'y'}, failed for ${errorCount}`);
            }
            this.loadInstructions();
            this.closeModal();
          }
        }
      });
    });
  }

  // Update existing instruction
  private updateInstruction(): void {
    const instruction = this.editingInstruction();
    if (!instruction) return;

    this.packagingService.updatePackagingInstruction(instruction.instructionID, this.formData).subscribe({
      next: (updated) => {
        this.alertService.success('Packaging instruction updated successfully');
        this.loadInstructions();
        this.closeModal();
      },
      error: (err) => {
        console.error('Failed to update instruction:', err);
        const message = err.error?.message || 'Failed to update packaging instruction';
        this.alertService.error(message);
      }
    });
  }

  // Open delete confirmation modal
  openDeleteModal(instruction: PackagingInstruction): void {
    this.instructionToDelete.set(instruction);
    this.showDeleteModal.set(true);
  }

  // Close delete confirmation modal
  closeDeleteModal(): void {
    this.showDeleteModal.set(false);
    this.instructionToDelete.set(null);
  }

  // Delete instruction (called after confirmation)
  confirmDelete(): void {
    const instruction = this.instructionToDelete();
    if (!instruction) return;

    this.packagingService.deletePackagingInstruction(instruction.instructionID).subscribe({
      next: () => {
        this.alertService.success('Packaging instruction deleted successfully');
        this.loadInstructions();
        this.closeDeleteModal();
      },
      error: (err) => {
        console.error('Failed to delete instruction:', err);
        const message = err.error?.message || 'Failed to delete packaging instruction';
        this.alertService.error(message);
      }
    });
  }

  // Toggle active status
  toggleActive(instruction: PackagingInstruction): void {
    const newStatus = !instruction.isActive;

    this.packagingService.updatePackagingInstruction(instruction.instructionID, {
      isActive: newStatus
    }).subscribe({
      next: () => {
        this.alertService.success(`Instruction ${newStatus ? 'activated' : 'deactivated'}`);
        this.loadInstructions();
      },
      error: (err) => {
        console.error('Failed to toggle active status:', err);
        this.alertService.error('Failed to update instruction status');
      }
    });
  }

  // Get category name by ID
  getCategoryName(categoryId: string): string {
    const category = this.categories().find(c => c.id.toString() === categoryId);
    return category?.name || 'Unknown';
  }

  // Handle category filter change
  onCategoryFilterChange(value: string | null): void {
    this.selectedCategoryFilter.set(value);
    this.currentPage.set(1); // Reset to first page when filter changes
  }

  // Handle section filter change
  onSectionFilterChange(value: string): void {
    this.selectedSectionFilter.set(value);
    this.currentPage.set(1); // Reset to first page when filter changes
  }

  // Handle search input change
  onSearchChange(query: string): void {
    this.searchQuery.set(query);
    this.currentPage.set(1); // Reset to first page when search changes
  }

  // Clear search
  clearSearch(): void {
    this.searchQuery.set('');
    this.currentPage.set(1);
  }

  // Clear filters
  clearFilters(): void {
    this.selectedCategoryFilter.set(null);
    this.selectedSectionFilter.set('');
    this.searchQuery.set('');
    this.currentPage.set(1); // Reset to first page when clearing filters
  }

  // Sort by column
  sortBy(column: string): void {
    if (this.sortColumn() === column) {
      // Toggle direction if same column
      this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
    } else {
      // New column, default to ascending
      this.sortColumn.set(column);
      this.sortDirection.set('asc');
    }
    this.currentPage.set(1); // Reset to first page when sorting
  }

  // Get sort icon for column
  getSortIcon(column: string): string {
    if (this.sortColumn() !== column) return '';
    return this.sortDirection() === 'asc' ? '↑' : '↓';
  }

  // Toggle category selection for multi-select
  toggleCategorySelection(categoryId: string): void {
    const index = this.formData.categoryIds.indexOf(categoryId);
    if (index === -1) {
      this.formData.categoryIds.push(categoryId);
    } else {
      this.formData.categoryIds.splice(index, 1);
    }
  }

  // Check if category is selected
  isCategorySelected(categoryId: string): boolean {
    return this.formData.categoryIds.includes(categoryId);
  }

  // Select all categories
  selectAllCategories(): void {
    this.formData.categoryIds = this.categories().map(c => c.id.toString());
  }

  // Deselect all categories
  deselectAllCategories(): void {
    this.formData.categoryIds = [];
  }

  // Check if any field has changed (for edit mode)
  get hasChanges(): boolean {
    if (!this.originalData || this.modalMode() !== 'edit') return false;

    return (
      this.formData.categoryId !== this.originalData.categoryID ||
      this.formData.sectionName !== this.originalData.sectionName ||
      this.formData.instruction !== this.originalData.instruction ||
      this.formData.displayOrder !== this.originalData.displayOrder ||
      this.formData.isActive !== this.originalData.isActive
    );
  }

  // Get list of changed fields for display
  getChangedFields(): Array<{field: string, before: any, after: any}> {
    if (!this.originalData) return [];

    const changes: Array<{field: string, before: any, after: any}> = [];

    if (this.formData.categoryId !== this.originalData.categoryID) {
      changes.push({
        field: 'Category',
        before: this.getCategoryName(this.originalData.categoryID),
        after: this.getCategoryName(this.formData.categoryId)
      });
    }

    if (this.formData.sectionName !== this.originalData.sectionName) {
      changes.push({
        field: 'Section Name',
        before: this.originalData.sectionName,
        after: this.formData.sectionName
      });
    }

    if (this.formData.instruction !== this.originalData.instruction) {
      changes.push({
        field: 'Instruction',
        before: this.originalData.instruction,
        after: this.formData.instruction
      });
    }

    if (this.formData.displayOrder !== this.originalData.displayOrder) {
      changes.push({
        field: 'Display Order',
        before: this.originalData.displayOrder,
        after: this.formData.displayOrder
      });
    }

    if (this.formData.isActive !== this.originalData.isActive) {
      changes.push({
        field: 'Status',
        before: this.originalData.isActive ? 'Active' : 'Inactive',
        after: this.formData.isActive ? 'Active' : 'Inactive'
      });
    }

    return changes;
  }
}