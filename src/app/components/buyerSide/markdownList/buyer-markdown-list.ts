import { Component, computed, signal, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AlertService } from '../../../services/alert.service';

interface ConditionOption {
  conditionID: string;
  groupID: string;
  code: string;
  description?: string;
  image: string | null;
  status: string;
  question: string | null;
  criteriaName?: string;
  categoryNames?: string;
  markdownPercentage: number | null;
}

interface ConditionGroup {
  groupID: string;
  criteriaName: string;
  question_title?: string | null;
  question_type?: string | null;
  display_order?: number | null;
}

interface Category {
  categoryID: string;
  categoryName: string;
}

@Component({
  selector: 'app-buyer-markdown-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './buyer-markdown-list.html',
  styleUrls: ['./buyer-markdown-list.scss']
})
export class BuyerMarkdownListComponent implements OnInit {
  private http = inject(HttpClient);
  private alertService = inject(AlertService);
  private apiUrl = 'http://localhost:3000/api';

  // State
  conditionGroups = signal<ConditionGroup[]>([]);
  conditionOptions = signal<ConditionOption[]>([]);
  categories = signal<Category[]>([]);
  buyerMarkdowns = signal<Map<string, number>>(new Map());
  loading = signal<boolean>(false);
  error = signal<string>('');

  selectedCategoryFilter = signal<string>('all');
  selectedGroupFilter = signal<string>('all');
  search = signal<string>('');

  // Inline editing state
  editingConditionID = signal<string | null>(null);
  editingValue = signal<number | null>(null);

  // Sort state per group
  sortFields = signal<{ [groupId: string]: string }>({});
  sortDirections = signal<{ [groupId: string]: 'asc' | 'desc' }>({});

  // Pagination per group
  currentPages = signal<{ [groupId: string]: number }>({});
  itemsPerPage = signal<number>(10);
  itemsPerPageOptions = [10, 20, 30, 50];

  ngOnInit() {
    this.loadConditionGroups();
    this.loadConditionOptions();
    this.loadCategories();
    this.loadBuyerMarkdowns();
    this.ensureNoneMarkdown();
  }

  // -------- API calls ----------
  loadConditionGroups() {
    this.loading.set(true);
    this.error.set('');

    const token = localStorage.getItem('buyer_token');
    const headers = new HttpHeaders({
      'Authorization': token ? `Bearer ${token}` : ''
    });

    this.http.get<ConditionGroup[]>(`${this.apiUrl}/buyer/condition-groups`, { headers })
      .subscribe({
        next: (groups) => {
          // Filter to only show radio, checkbox, and image types
          const filteredGroups = groups.filter(g =>
            g.question_type === 'radio' ||
            g.question_type === 'checkbox' ||
            g.question_type === 'image'
          );
          console.log('📂 Buyer condition groups (filtered):', filteredGroups);
          this.conditionGroups.set(filteredGroups);
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
    const token = localStorage.getItem('buyer_token');
    const headers = new HttpHeaders({
      'Authorization': token ? `Bearer ${token}` : ''
    });

    this.http.get<ConditionOption[]>(`${this.apiUrl}/buyer/condition-options`, { headers })
      .subscribe({
        next: (options) => {
          console.log('📂 Buyer condition options:', options);
          this.conditionOptions.set(options);
        },
        error: (err) => {
          console.error('Load condition options error:', err);
        }
      });
  }

  loadCategories() {
    const token = localStorage.getItem('buyer_token');
    const headers = new HttpHeaders({
      'Authorization': token ? `Bearer ${token}` : ''
    });

    this.http.get<Category[]>(`${this.apiUrl}/buyer/categories`, { headers })
      .subscribe({
        next: (categories) => {
          this.categories.set(categories);
        },
        error: (err) => {
          console.error('Load categories error:', err);
        }
      });
  }

  loadBuyerMarkdowns() {
    const token = localStorage.getItem('buyer_token');
    const headers = new HttpHeaders({
      'Authorization': token ? `Bearer ${token}` : ''
    });

    this.http.get<any[]>(`${this.apiUrl}/buyer/markdowns`, { headers })
      .subscribe({
        next: (markdowns) => {
          const markdownMap = new Map<string, number>();
          markdowns.forEach(m => {
            markdownMap.set(m.conditionID, m.markdownPercentage);
          });
          this.buyerMarkdowns.set(markdownMap);
          console.log('📂 Loaded buyer markdowns:', markdowns.length);

          // Ensure "None" option has 0% markdown after loading
          this.ensureNoneMarkdown();
        },
        error: (err) => {
          console.error('Load buyer markdowns error:', err);
        }
      });
  }

  // Ensure the "None" option (CO020) always has 0% markdown
  ensureNoneMarkdown() {
    const noneConditionID = 'CO020'; // The "None" option in Checklist
    const markdowns = this.buyerMarkdowns();

    // If "None" doesn't have a markdown, create it with 0%
    if (!markdowns.has(noneConditionID)) {
      const token = localStorage.getItem('buyer_token');
      const headers = new HttpHeaders({
        'Authorization': token ? `Bearer ${token}` : ''
      });

      this.http.put(`${this.apiUrl}/buyer/markdowns/${noneConditionID}`, { markdownPercentage: 0 }, { headers })
        .subscribe({
          next: () => {
            const updatedMarkdowns = new Map(markdowns);
            updatedMarkdowns.set(noneConditionID, 0);
            this.buyerMarkdowns.set(updatedMarkdowns);
            console.log('✅ Auto-set "None" option to 0% markdown');
          },
          error: (err) => {
            console.error('Failed to auto-set None markdown:', err);
          }
        });
    }
  }

  // Check if a condition is the "None" option
  isNoneOption(conditionID: string): boolean {
    return conditionID === 'CO020';
  }

  // -------- Computed values ----------
  activeGroups = computed(() => {
    return this.conditionGroups().filter(g =>
      g.question_type === 'radio' ||
      g.question_type === 'checkbox' ||
      g.question_type === 'image'
    );
  });

  // Calculate total options and options with markdowns
  markdownStats = computed(() => {
    const options = this.conditionOptions();
    const markdowns = this.buyerMarkdowns();

    const totalOptions = options.length;
    const optionsWithMarkdown = options.filter(opt => markdowns.has(opt.conditionID)).length;
    const missingCount = totalOptions - optionsWithMarkdown;
    const percentageComplete = totalOptions > 0 ? Math.round((optionsWithMarkdown / totalOptions) * 100) : 0;
    const isComplete = missingCount === 0;

    return {
      total: totalOptions,
      withMarkdown: optionsWithMarkdown,
      missing: missingCount,
      percentageComplete,
      isComplete
    };
  });

  groupedOptions = computed(() => {
    const groups = this.activeGroups();
    const options = this.conditionOptions();
    const search = this.search().toLowerCase();
    const selectedCategory = this.selectedCategoryFilter();
    const selectedGroup = this.selectedGroupFilter();
    const sortFields = this.sortFields();
    const sortDirections = this.sortDirections();
    const markdowns = this.buyerMarkdowns();

    let filteredGroups = groups;

    // Apply group filter
    if (selectedGroup && selectedGroup !== 'all') {
      filteredGroups = groups.filter(g => g.groupID === selectedGroup);
    }

    const result = filteredGroups.map(group => {
      let groupOptions = options.filter(opt =>
        opt.groupID === group.groupID
      );

      // Apply category filter
      if (selectedCategory && selectedCategory !== 'all') {
        groupOptions = groupOptions.filter(opt =>
          opt.categoryNames?.toLowerCase().includes(selectedCategory.toLowerCase())
        );
      }

      // Apply search filter
      if (search) {
        groupOptions = groupOptions.filter(opt =>
          (opt.code || '').toLowerCase().includes(search) ||
          (opt.description || '').toLowerCase().includes(search) ||
          (opt.question || '').toLowerCase().includes(search)
        );
      }

      // Add markdown percentage from buyer's data
      groupOptions = groupOptions.map(opt => ({
        ...opt,
        markdownPercentage: markdowns.get(opt.conditionID) ?? null
      }));

      // Apply sorting
      const sortField = sortFields[group.groupID] || 'code';
      const sortDirection = sortDirections[group.groupID] || 'asc';

      groupOptions = [...groupOptions].sort((a: any, b: any) => {
        let aVal = a[sortField];
        let bVal = b[sortField];

        if (aVal == null) aVal = '';
        if (bVal == null) bVal = '';

        if (typeof aVal === 'string') aVal = aVal.toLowerCase();
        if (typeof bVal === 'string') bVal = bVal.toLowerCase();

        if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });

      return {
        group,
        options: groupOptions
      };
    });

    // Filter out empty groups when searching or filtering
    if (search || selectedCategory !== 'all' || selectedGroup !== 'all') {
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
    const pages: { [key: string]: number } = {};
    this.activeGroups().forEach(g => pages[g.groupID] = 1);
    this.currentPages.set(pages);
  }

  onCategoryFilterChange(categoryName: string) {
    this.selectedCategoryFilter.set(categoryName);
    const pages: { [key: string]: number } = {};
    this.activeGroups().forEach(g => pages[g.groupID] = 1);
    this.currentPages.set(pages);
  }

  onGroupFilterChange(groupId: string) {
    this.selectedGroupFilter.set(groupId);
    const pages: { [key: string]: number } = {};
    this.activeGroups().forEach(g => pages[g.groupID] = 1);
    this.currentPages.set(pages);
  }

  onSort(groupId: string, field: string) {
    const sortFields = { ...this.sortFields() };
    const sortDirections = { ...this.sortDirections() };

    if (sortFields[groupId] === field) {
      sortDirections[groupId] = sortDirections[groupId] === 'asc' ? 'desc' : 'asc';
    } else {
      sortFields[groupId] = field;
      sortDirections[groupId] = 'asc';
    }

    this.sortFields.set(sortFields);
    this.sortDirections.set(sortDirections);

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

  getMarkdownValue(conditionID: string): number | null {
    const value = this.buyerMarkdowns().get(conditionID);
    return value !== undefined ? Math.round(value) : null;
  }

  // Inline editing methods
  isEditing(conditionID: string): boolean {
    return this.editingConditionID() === conditionID;
  }

  startEdit(conditionID: string) {
    const currentValue = this.buyerMarkdowns().get(conditionID);
    this.editingConditionID.set(conditionID);
    this.editingValue.set(currentValue ?? null);
  }

  getEditingValue(conditionID: string): number | null {
    if (this.editingConditionID() === conditionID) {
      return this.editingValue();
    }
    return null;
  }

  onEditingValueChange(conditionID: string, value: string) {
    if (this.editingConditionID() === conditionID) {
      const numValue = parseFloat(value);
      // Round to whole number
      this.editingValue.set(isNaN(numValue) || value === '' ? null : Math.round(Math.max(0, Math.min(100, numValue))));
    }
  }

  cancelEdit(conditionID: string) {
    if (this.editingConditionID() === conditionID) {
      this.editingConditionID.set(null);
      this.editingValue.set(null);
    }
  }

  saveMarkdown(conditionID: string) {
    if (this.editingConditionID() !== conditionID) return;

    const token = localStorage.getItem('buyer_token');
    const headers = new HttpHeaders({
      'Authorization': token ? `Bearer ${token}` : ''
    });

    const markdownPercentage = this.editingValue();

    // If value is null or empty, delete the markdown
    if (markdownPercentage === null) {
      this.http.delete(`${this.apiUrl}/buyer/markdowns/${conditionID}`, { headers })
        .subscribe({
          next: () => {
            const markdowns = new Map(this.buyerMarkdowns());
            markdowns.delete(conditionID);
            this.buyerMarkdowns.set(markdowns);
            this.editingConditionID.set(null);
            this.editingValue.set(null);
            this.alertService.success('Markdown removed successfully');
          },
          error: (err) => {
            this.alertService.error('Failed to remove markdown: ' + (err.error?.message || 'Unknown error'));
            console.error('Delete markdown error:', err);
          }
        });
    } else {
      // Save the markdown
      this.http.put(`${this.apiUrl}/buyer/markdowns/${conditionID}`, { markdownPercentage }, { headers })
        .subscribe({
          next: () => {
            const markdowns = new Map(this.buyerMarkdowns());
            markdowns.set(conditionID, markdownPercentage);
            this.buyerMarkdowns.set(markdowns);
            this.editingConditionID.set(null);
            this.editingValue.set(null);
            this.alertService.success('Markdown saved successfully');
          },
          error: (err) => {
            this.alertService.error('Failed to save markdown: ' + (err.error?.message || 'Unknown error'));
            console.error('Save markdown error:', err);
          }
        });
    }
  }

  setPageSize(size: number) {
    this.itemsPerPage.set(size);
    const pages: { [key: string]: number } = {};
    this.activeGroups().forEach(g => pages[g.groupID] = 1);
    this.currentPages.set(pages);
  }

  getImageUrl(imagePath: string | null): string {
    if (!imagePath) return '';
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      return imagePath;
    }
    return `${this.apiUrl.replace('/api', '')}${imagePath}`;
  }

  getRowNumber(groupId: string, index: number): number {
    const currentPage = this.currentPages()[groupId] || 1;
    return (currentPage - 1) * this.itemsPerPage() + index + 1;
  }
}
