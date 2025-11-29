import { Component, computed, signal, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AlertService } from '../../../services/alert.service';
import { AddConditionGroupComponent } from './add-group/add-condition-group';
import { EditConditionGroupComponent } from './edit-group/edit-condition-group';
import { AddConditionOptionComponent } from './add-option/add-condition-option';
import { EditConditionOptionComponent } from './edit-option/edit-condition-option';
import { BreadcrumbComponent } from '../../../shared/breadcrumb/breadcrumb';


interface ConditionGroup {
  groupID: string;
  criteriaName: string;
  criteriaCodePrefix: string;
  question_title?: string | null;
  question_type?: string | null;
  display_order?: number | null;
  status: 'ACTIVE' | 'INACTIVE';
  created_at: string;
}

interface ConditionOption {
  conditionID: string;
  groupID: string;
  code: string;
  description?: string;
  image: string | null;
  status: string;
  question: string | null;
  created_at: string;
  criteriaName?: string;
  criteriaCodePrefix?: string;
  categories?: string;
}

type SortKey = 'conditionID' | 'code' | 'status';
type SortDir = 'asc' | 'desc';

@Component({
  selector: 'app-condition-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    AddConditionGroupComponent,
    EditConditionGroupComponent,
    AddConditionOptionComponent,
    EditConditionOptionComponent,
    BreadcrumbComponent
  ],
  templateUrl: './condition-list.html',
  styleUrls: ['./condition-list.scss']
})
export class ConditionListComponent implements OnInit {
  private http = inject(HttpClient);
  private alertService = inject(AlertService);
  private apiUrl = 'http://localhost:3000/api';

  // State
  conditionGroups = signal<ConditionGroup[]>([]);
  conditionOptions = signal<ConditionOption[]>([]);
  categories = signal<any[]>([]);
  loading = signal<boolean>(false);
  error = signal<string>('');

  selectedGroupFilter = signal<string>('all');
  search = signal<string>('');

  // Sort state per group
  sortFields = signal<{ [groupId: string]: string }>({});
  sortDirections = signal<{ [groupId: string]: 'asc' | 'desc' }>({});

  // Pagination per group
  currentPages = signal<{ [groupId: string]: number }>({});
  itemsPerPage = signal<number>(10);
  itemsPerPageOptions = [10, 20, 30, 50];

  // Modals
  showAddGroupModal = signal(false);
  showEditGroupModal = signal(false);
  showAddOptionModal = signal(false);
  showEditOptionModal = signal(false);
  showConfirmModal = signal(false);

  selectedGroupForAdd = signal<string | null>(null);
  editingGroup = signal<ConditionGroup | null>(null);
  editingOption = signal<ConditionOption | null>(null);
  confirmAction = signal<'delete' | null>(null);
  confirmTarget = signal<ConditionOption | null>(null);

  ngOnInit() {
    this.loadConditionGroups();
    this.loadConditionOptions();
    this.loadCategories();
  }

  // -------- API calls ----------
  loadConditionGroups() {
    this.loading.set(true);
    this.error.set('');

    this.http.get<ConditionGroup[]>(`${this.apiUrl}/admin/condition-groups`)
      .subscribe({
        next: (groups) => {
          console.log('📂 Raw condition groups from API:', groups);
          this.conditionGroups.set(groups);
          this.loading.set(false);
        },
        error: (err) => {
          this.error.set('Failed to load condition groups');
          this.loading.set(false);
          console.error('Load condition groups error:', err);
        }
      });
  }

  loadConditionOptions() {
    this.http.get<ConditionOption[]>(`${this.apiUrl}/admin/condition-options`)
      .subscribe({
        next: (options) => {
          console.log('📂 Raw condition options from API:', options);
          this.conditionOptions.set(options);
        },
        error: (err) => {
          console.error('Load condition options error:', err);
        }
      });
  }

  loadCategories() {
    this.http.get<any[]>(`${this.apiUrl}/admin/categories`)
      .subscribe({
        next: (categories) => {
          this.categories.set(categories.filter(c => c.status === 'ACTIVE'));
        },
        error: (err) => {
          console.error('Load categories error:', err);
        }
      });
  }

  // -------- Computed values ----------
  activeGroups = computed(() => {
    return this.conditionGroups();
  });

  groupedOptions = computed(() => {
    const groups = this.activeGroups();
    const options = this.conditionOptions();
    const search = this.search().toLowerCase();
    const selectedGroupId = this.selectedGroupFilter();
    const sortFields = this.sortFields();
    const sortDirections = this.sortDirections();

    // Filter groups first if a specific group is selected
    let filteredGroups = groups;
    if (selectedGroupId && selectedGroupId !== 'all') {
      filteredGroups = groups.filter(g => g.groupID === selectedGroupId);
    }

    const result = filteredGroups.map(group => {
      let groupOptions = options.filter(opt => opt.groupID === group.groupID);

      // Apply search filter
      if (search) {
        groupOptions = groupOptions.filter(opt =>
          (opt.code || '').toLowerCase().includes(search) ||
          (opt.status || '').toLowerCase().includes(search) ||
          (opt.question || '').toLowerCase().includes(search) ||
          (opt.description || '').toLowerCase().includes(search)
        );
      }

      // Apply sorting
      const sortField = sortFields[group.groupID] || 'code';
      const sortDirection = sortDirections[group.groupID] || 'asc';

      groupOptions = [...groupOptions].sort((a: any, b: any) => {
        let aVal = a[sortField];
        let bVal = b[sortField];

        // Handle null/undefined values
        if (aVal == null) aVal = '';
        if (bVal == null) bVal = '';

        // Convert to lowercase for string comparison
        if (typeof aVal === 'string') aVal = aVal.toLowerCase();
        if (typeof bVal === 'string') bVal = bVal.toLowerCase();

        // Compare
        if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });

      return {
        group,
        options: groupOptions
      };
    });

    // Only filter out empty groups when searching
    if (search) {
      return result.filter(item => item.options.length > 0);
    }

    return result;
  });

  // Get paginated options for a specific group
  getPagedOptions(groupId: string) {
    const groupData = this.groupedOptions().find(g => g.group.groupID === groupId);
    if (!groupData) return [];

    const currentPage = this.currentPages()[groupId] || 1;
    const start = (currentPage - 1) * this.itemsPerPage();
    return groupData.options.slice(start, start + this.itemsPerPage());
  }

  getTotalPages(groupId: string): number {
    const groupData = this.groupedOptions().find(g => g.group.groupID === groupId);
    if (!groupData) return 1;
    return Math.max(1, Math.ceil(groupData.options.length / this.itemsPerPage()));
  }

  getCurrentPage(groupId: string): number {
    return this.currentPages()[groupId] || 1;
  }

  goToPage(groupId: string, page: number) {
    const totalPages = this.getTotalPages(groupId);
    if (page < 1 || page > totalPages) return;

    const pages = { ...this.currentPages() };
    pages[groupId] = page;
    this.currentPages.set(pages);
  }

  getPageNumbers(groupId: string): number[] {
    const total = this.getTotalPages(groupId);
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  // -------- Actions ----------
  onSearchInput(v: string) {
    this.search.set(v);
    // Reset all pages to 1 when searching
    const pages: { [key: string]: number } = {};
    this.activeGroups().forEach(g => pages[g.groupID] = 1);
    this.currentPages.set(pages);
  }

  onGroupFilterChange(groupId: string) {
    this.selectedGroupFilter.set(groupId);
    // Reset all pages to 1 when filtering
    const pages: { [key: string]: number } = {};
    this.activeGroups().forEach(g => pages[g.groupID] = 1);
    this.currentPages.set(pages);
  }

  onSort(groupId: string, field: string) {
    const sortFields = { ...this.sortFields() };
    const sortDirections = { ...this.sortDirections() };

    if (sortFields[groupId] === field) {
      // Toggle direction if same field
      sortDirections[groupId] = sortDirections[groupId] === 'asc' ? 'desc' : 'asc';
    } else {
      // Set new field with ascending order
      sortFields[groupId] = field;
      sortDirections[groupId] = 'asc';
    }

    this.sortFields.set(sortFields);
    this.sortDirections.set(sortDirections);

    // Reset to page 1 for this group
    const pages = { ...this.currentPages() };
    pages[groupId] = 1;
    this.currentPages.set(pages);
  }

  getSortIcon(groupId: string, field: string): string {
    const sortFields = this.sortFields();
    const sortDirections = this.sortDirections();

    if (sortFields[groupId] !== field) return '↕';
    return sortDirections[groupId] === 'asc' ? '↑' : '↓';
  }

  addNewConditionType() {
    this.showAddGroupModal.set(true);
  }

  editConditionGroup(group: ConditionGroup) {
    this.editingGroup.set(group);
    this.showEditGroupModal.set(true);
  }

  addNewCondition(groupId: string) {
    this.selectedGroupForAdd.set(groupId);
    this.showAddOptionModal.set(true);
  }

  editCondition(option: ConditionOption) {
    this.editingOption.set(option);
    this.showEditOptionModal.set(true);
  }

  getQuestionTypeForOption(option: ConditionOption): string | null {
    const group = this.conditionGroups().find(g => g.groupID === option.groupID);
    return group?.question_type || null;
  }

  getSelectedGroupData(): ConditionGroup | null {
    const groupId = this.selectedGroupForAdd();
    if (!groupId) return null;
    return this.conditionGroups().find(g => g.groupID === groupId) || null;
  }

  toggleStatus(option: ConditionOption) {
    this.confirmTarget.set(option);
    this.confirmAction.set('delete');
    this.showConfirmModal.set(true);
  }

  onConfirm() {
    const action = this.confirmAction();
    const option = this.confirmTarget();

    if (!option) return;

    if (action === 'delete') {
      // Toggle status instead of delete
      const newStatus = option.status?.toUpperCase() === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';

      this.http.put(`${this.apiUrl}/admin/condition-options/${option.conditionID}`, {
        description: option.description,
        image: option.image,
        status: newStatus,
        question: option.question
      })
        .subscribe({
          next: () => {
            this.loadConditionOptions();
            this.alertService.success(`Condition ${newStatus === 'ACTIVE' ? 'activated' : 'deactivated'} successfully`);
          },
          error: (err) => {
            console.error('Toggle condition status error:', err);
            this.alertService.error(err.error?.message || 'Failed to update condition status');
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
    const option = this.confirmTarget();
    const action = this.confirmAction();

    if (!option) return '';

    if (action === 'delete') {
      const newStatus = option.status?.toUpperCase() === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      return `Are you sure you want to ${newStatus === 'ACTIVE' ? 'activate' : 'deactivate'} condition "${option.code || option.conditionID}"?`;
    }

    return '';
  }

  getToggleTitle(status: string): string {
    return status?.toUpperCase() === 'ACTIVE' ? 'Deactivate' : 'Activate';
  }

  getToggleIconSrc(status: string): string {
    return status?.toUpperCase() === 'ACTIVE' ? 'assets/icons/deactivate.png' : 'assets/icons/activate.png';
  }

  onCloseAddGroupModal() {
    this.showAddGroupModal.set(false);
  }

  onCloseEditGroupModal() {
    this.showEditGroupModal.set(false);
    this.editingGroup.set(null);
  }

  onCloseAddOptionModal() {
    this.showAddOptionModal.set(false);
    this.selectedGroupForAdd.set(null);
  }

  onCloseEditOptionModal() {
    this.showEditOptionModal.set(false);
    this.editingOption.set(null);
  }

  onGroupAdded(newGroup: any) {
    const groupData = {
      criteriaName: newGroup.criteriaName,
      criteriaCodePrefix: newGroup.criteriaCodePrefix,
      question_title: newGroup.question_title,
      question_type: newGroup.question_type
    };

    this.http.post(`${this.apiUrl}/admin/condition-groups`, groupData)
      .subscribe({
        next: () => {
          this.loadConditionGroups();
          this.alertService.success('New condition type created successfully');
        },
        error: (err) => {
          console.error('Create condition group error:', err);
          this.alertService.error('Failed to create condition type: ' + (err.error?.message || 'Unknown error'));
        }
      });
  }

  onGroupUpdated(updatedGroup: any) {
    this.http.put(`${this.apiUrl}/admin/condition-groups/${updatedGroup.groupID}`, {
      criteriaName: updatedGroup.criteriaName,
      criteriaCodePrefix: updatedGroup.criteriaCodePrefix,
      question_title: updatedGroup.question_title,
      question_type: updatedGroup.question_type,
      display_order: updatedGroup.display_order,
      status: updatedGroup.status
    })
      .subscribe({
        next: () => {
          this.loadConditionGroups();
          this.alertService.success('Condition type updated successfully');
        },
        error: (err) => {
          console.error('Update condition group error:', err);
          this.alertService.error('Failed to update condition type: ' + (err.error?.message || 'Unknown error'));
        }
      });
  }

  onOptionAdded(newOption: any) {
    const formData = new FormData();
    formData.append('groupID', this.selectedGroupForAdd() || '');
    formData.append('description', newOption.description);
    formData.append('status', newOption.status || 'ACTIVE');

    if (newOption.question) {
      formData.append('question', newOption.question);
    }

    if (newOption.image instanceof File) {
      formData.append('image', newOption.image);
    }

    if (newOption.categoryIDs && newOption.categoryIDs.length > 0) {
      formData.append('categoryIDs', JSON.stringify(newOption.categoryIDs));
    }

    console.log('📤 Sending new option:', {
      groupID: this.selectedGroupForAdd(),
      description: newOption.description,
      hasImage: newOption.image instanceof File,
      categoryCount: newOption.categoryIDs?.length || 0
    });

    this.http.post(`${this.apiUrl}/admin/condition-options`, formData)
      .subscribe({
        next: (response: any) => {
          // Update categories if provided
          if (newOption.categoryIDs && newOption.categoryIDs.length > 0) {
            this.http.put(`${this.apiUrl}/admin/condition-options/${response.conditionID}/categories`, {
              categoryIDs: newOption.categoryIDs
            }).subscribe({
              next: () => {
                this.loadConditionOptions();
                this.alertService.success('New condition created successfully');
              },
              error: (err) => {
                console.error('Create condition categories error:', err);
                this.loadConditionOptions();
                this.alertService.success('Condition created, but failed to set categories');
              }
            });
          } else {
            this.loadConditionOptions();
            this.alertService.success('New condition created successfully');
          }
        },
        error: (err) => {
          console.error('Create condition option error:', err);
          this.alertService.error('Failed to create condition: ' + (err.error?.message || 'Unknown error'));
        }
      });
  }

  getSelectedGroupPrefix(): string {
    const group = this.conditionGroups().find(g => g.groupID === this.selectedGroupForAdd());
    return group?.criteriaCodePrefix || '';
  }

  onOptionUpdated(updatedOption: any) {
    const formData = new FormData();
    formData.append('description', updatedOption.description);
    formData.append('status', updatedOption.status || 'ACTIVE');

    if (updatedOption.question) {
      formData.append('question', updatedOption.question);
    }

    if (updatedOption.image instanceof File) {
      // New file uploaded
      formData.append('image', updatedOption.image);
    } else if (typeof updatedOption.image === 'string' && updatedOption.image) {
      // Keep existing image URL
      formData.append('imageUrl', updatedOption.image);
    } else if (updatedOption.image === null) {
      // Explicitly remove image
      formData.append('removeImage', 'true');
    }

    if (updatedOption.categoryIDs) {
      formData.append('categoryIDs', JSON.stringify(updatedOption.categoryIDs));
    }

    this.http.put(`${this.apiUrl}/admin/condition-options/${updatedOption.conditionID}`, formData)
      .subscribe({
        next: () => {
          // Update categories if provided
          if (updatedOption.categoryIDs) {
            this.http.put(`${this.apiUrl}/admin/condition-options/${updatedOption.conditionID}/categories`, {
              categoryIDs: updatedOption.categoryIDs
            }).subscribe({
              next: () => {
                this.loadConditionOptions();
                this.alertService.success('Condition updated successfully');
              },
              error: (err) => {
                console.error('Update condition categories error:', err);
                this.loadConditionOptions();
                this.alertService.success('Condition updated, but failed to update categories');
              }
            });
          } else {
            this.loadConditionOptions();
            this.alertService.success('Condition updated successfully');
          }
        },
        error: (err) => {
          console.error('Update condition option error:', err);
          this.alertService.error('Failed to update condition: ' + (err.error?.message || 'Unknown error'));
        }
      });
  }

  // -------- Helper methods ----------
  statusClass(status: string): string {
    const statusUpper = status?.toUpperCase();
    if (statusUpper === 'ACTIVE') {
      return 'badge-active';
    } else if (statusUpper === 'INACTIVE') {
      return 'badge-inactive';
    }
    return '';
  }

  setPageSize(size: number) {
    this.itemsPerPage.set(size);
    // Reset all pages to 1 when changing page size
    const pages: { [key: string]: number } = {};
    this.activeGroups().forEach(g => pages[g.groupID] = 1);
    this.currentPages.set(pages);
  }

  getGroupToggleTitle(status: string): string {
    return status === 'ACTIVE' ? 'Set as Inactive' : 'Set as Active';
  }

  toggleGroupStatus(group: ConditionGroup) {
    const newStatus = group.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';

    this.http.put(`${this.apiUrl}/admin/condition-groups/${group.groupID}/status`, { status: newStatus })
      .subscribe({
        next: () => {
          this.loadConditionGroups();
          this.alertService.success(`${group.criteriaName} set as ${newStatus.toLowerCase()} successfully`);
        },
        error: (err) => {
          console.error('Toggle group status error:', err);
          this.alertService.error(err.error?.message || 'Failed to update group status');
        }
      });
  }

  getImageUrl(imagePath: string | null): string {
    if (!imagePath) return '';
    // If it's already a full URL, return as-is
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      return imagePath;
    }
    // Otherwise, prepend the API URL
    return `${this.apiUrl.replace('/api', '')}${imagePath}`;
  }

  shouldShowQuestionFields(group: ConditionGroup): boolean {
    // All groups should show question and order metadata
    return true;
  }

  shouldShowTableColumns(group: ConditionGroup): boolean {
    // Only show table columns if NOT file_upload or textarea
    return group.question_type !== 'file_upload' && group.question_type !== 'textarea';
  }
}
