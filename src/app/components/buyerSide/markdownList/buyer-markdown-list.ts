import { Component, computed, signal, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
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
  saving = signal<boolean>(false);
  error = signal<string>('');

  selectedCategoryFilter = signal<string>('all');
  search = signal<string>('');

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
  }

  // -------- API calls ----------
  loadConditionGroups() {
    this.loading.set(true);
    this.error.set('');

    this.http.get<ConditionGroup[]>(`${this.apiUrl}/buyer/condition-groups`)
      .subscribe({
        next: (groups) => {
          // Filter to only show radio, checkbox, and image_selection types
          const filteredGroups = groups.filter(g =>
            g.question_type === 'radio' ||
            g.question_type === 'checkbox' ||
            g.question_type === 'image_selection'
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
    this.http.get<ConditionOption[]>(`${this.apiUrl}/buyer/condition-options`)
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
    this.http.get<Category[]>(`${this.apiUrl}/buyer/categories`)
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
    this.http.get<any[]>(`${this.apiUrl}/buyer/markdowns`)
      .subscribe({
        next: (markdowns) => {
          const markdownMap = new Map<string, number>();
          markdowns.forEach(m => {
            markdownMap.set(m.conditionID, m.markdownPercentage);
          });
          this.buyerMarkdowns.set(markdownMap);
          console.log('📂 Loaded buyer markdowns:', markdowns.length);
        },
        error: (err) => {
          console.error('Load buyer markdowns error:', err);
        }
      });
  }

  // -------- Computed values ----------
  activeGroups = computed(() => {
    return this.conditionGroups().filter(g =>
      g.question_type === 'radio' ||
      g.question_type === 'checkbox' ||
      g.question_type === 'image_selection'
    );
  });

  groupedOptions = computed(() => {
    const groups = this.activeGroups();
    const options = this.conditionOptions();
    const search = this.search().toLowerCase();
    const selectedCategory = this.selectedCategoryFilter();
    const sortFields = this.sortFields();
    const sortDirections = this.sortDirections();
    const markdowns = this.buyerMarkdowns();

    let filteredGroups = groups;

    const result = filteredGroups.map(group => {
      let groupOptions = options.filter(opt =>
        opt.groupID === group.groupID &&
        opt.status?.toUpperCase() === 'ACTIVE'
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

    // Filter out empty groups when searching
    if (search || selectedCategory !== 'all') {
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

  onMarkdownChange(conditionID: string, value: string) {
    const numValue = parseFloat(value);
    const markdowns = new Map(this.buyerMarkdowns());

    if (isNaN(numValue) || value === '') {
      markdowns.delete(conditionID);
    } else {
      markdowns.set(conditionID, Math.max(0, Math.min(100, numValue)));
    }

    this.buyerMarkdowns.set(markdowns);
  }

  getMarkdownValue(conditionID: string): number | null {
    return this.buyerMarkdowns().get(conditionID) ?? null;
  }

  saveMarkdowns() {
    this.saving.set(true);

    const markdownsArray = Array.from(this.buyerMarkdowns().entries()).map(([conditionID, markdownPercentage]) => ({
      conditionID,
      markdownPercentage
    }));

    this.http.post(`${this.apiUrl}/buyer/markdowns`, { markdowns: markdownsArray })
      .subscribe({
        next: () => {
          this.alertService.success('Markdowns saved successfully');
          this.saving.set(false);
        },
        error: (err) => {
          this.alertService.error('Failed to save markdowns: ' + (err.error?.message || 'Unknown error'));
          this.saving.set(false);
          console.error('Save markdowns error:', err);
        }
      });
  }

  clearFilters() {
    this.selectedCategoryFilter.set('all');
    this.search.set('');
    const pages: { [key: string]: number } = {};
    this.activeGroups().forEach(g => pages[g.groupID] = 1);
    this.currentPages.set(pages);
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
