import { Component, computed, signal, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EditScore } from './edit-score/edit-score';
import { Condition, ConditionGroup, Category, ScoringConfigurationService } from './scoring-configuration.service';



type SortKey = 'adminId' | 'score' ;
type SortDir = 'asc' | 'desc';

@Component({
  selector: 'app-scoring-configuration',
  imports: [CommonModule, FormsModule, EditScore],
  templateUrl: './scoring-configuration.html',
  styleUrl: './scoring-configuration.scss',
})
export class ScoringConfiguration implements OnInit {

  private scoringConfigService = inject(ScoringConfigurationService);

  // Data signals
  rows = signal<ConditionGroup[]>([]);
  categories = signal<Category[]>([]);
  isLoading = signal<boolean>(false);
  error = signal<string | null>(null);

  //categotyID selected
  selectedCategoryID = signal<string>('');

  // Pagination & sorting 
  itemsPerPageOptions = [3, 5, 10, 20];
  itemsPerPage = signal<number>(3);
  currentPage = signal<{[groupID: string]: number}>({});

  sortKey = signal<SortKey>('adminId');
  sortDir = signal<SortDir>('asc');
  search = signal<string>('');

  showEditModal = signal<boolean>(false);
  selectedRow = signal<Condition | null>(null);
  selectedConditionGroup = signal<ConditionGroup | null>(null);

  selectedCategoryName = computed(() => {
    const categoryID = this.selectedCategoryID();
    const category = this.categories().find(c => c.categoryID === categoryID);
    return category ? category.categoryName : 'Unknown';
  })

  filteredRows = computed(() => {

    const q = this.search().trim().toLowerCase();
    const groups = this.rows();
    const key = this.sortKey();
    const dir = this.sortDir();

    return groups.map(group =>{
      let filteredConditions = group.conditions.filter(r =>
        !q ||
        r.code.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.scoreValue.toString().toLowerCase().includes(q) ||
        group.criteriaName.toLowerCase().includes(q)
      );

      filteredConditions.sort((a: any, b: any) => {
        const av = (a[key] ?? '').toString().toLowerCase();
        const bv = (b[key] ?? '').toString().toLowerCase();
        if (av < bv) return dir === 'asc' ? -1 : 1;
        if (av > bv) return dir === 'asc' ? 1 : -1;
        return 0;
      });

      return {
        ...group,
        conditions: filteredConditions
      };
    }).filter(group => group.conditions.length > 0 || !q);
   
  });


  ngOnInit() {
   
    this.loadCategories();

  }

  loadCategories(): void {
    this.scoringConfigService.getCategories()
      .subscribe({
        next: (response) =>{
          if(response.success){
              this.categories.set(response.data);
              if (response.data.length > 0 && !this.selectedCategoryID()) {
                this.selectedCategoryID.set(response.data[0].categoryID);
              }

              this.loadConditionGroup();

              }else{
                this.error.set(response.message || 'Failed to load categories');
              }
                this.isLoading.set(false);
              },
              error: (err) => {
                console.error('Error loading categories:', err);      
              }

            });

  }

  loadConditionGroup(): void {
    this.isLoading.set(true);
    this.error.set(null);

    const categoryID = this.selectedCategoryID();
    console.log('Loading condition groups for categoryID:', categoryID);

    this.scoringConfigService.getConditionGroupByCategory(categoryID)
      .subscribe({
        next: (response) =>{
          if(response.success){
            this.rows.set(response.data);

            const page : {[groupID: string]: number} = {};
            (response.data).forEach((g: ConditionGroup) => {
              page[g.groupID] = 1;
            });
            this.currentPage.set(page);
          
          }else{
            this.error.set(response.message || 'Failed to load data');
          }
          this.isLoading.set(false);
        },
        error: (err) => {
          console.error('Error loading criteria:', err);
          this.error.set('Error loading data: ' + err.message);
          this.isLoading.set(false);
        }

      });
    
      
  }

  saveScore(event: {categoryID: string, conditionID: string, newScoreValue: number}): void {
    this.isLoading.set(true);

    this.scoringConfigService.updateConditionScore(event.categoryID, event.conditionID, event.newScoreValue)
      .subscribe({
       next: () => {
          this.loadConditionGroup(); // Reload the list
          //const message = updatedAdmin.password ? 'Admin and password updated successfully' : 'Admin updated successfully';
          //this.alertService.success(message);

          this.closeEditModal();
        },
        error: (err) => {
          console.error('Update admin error:', err);
          //this.alertService.error('Failed to update admin: ' + (err.error?.message || 'Unknown error'));
        }
        });
  }

  getTotalPages(group: ConditionGroup): number{
    return Math.max(1, Math.ceil(group.conditions.length / this.itemsPerPage()));
  }
   

  getPageNumbers(group: ConditionGroup) {
    return Array.from({ length: this.getTotalPages(group)}, (_, i) => i + 1);
  }

  getPageSlice(group: ConditionGroup): Condition[] {
    const currentPage = this.currentPage()[group.groupID] || 1;
    const start = (currentPage -1) * this.itemsPerPage();
    return group.conditions.slice(start, start + this.itemsPerPage());
  }
  
  
  goToPage(groupID: string, page: number): void {
    const group = this.filteredRows().find(g => g.groupID === groupID);
    if (!group) return;

    const totalPages = this.getTotalPages(group);
    if(page < 1 || page > totalPages) return;

    this.currentPage.update(pages => ({
      ...pages,
      [groupID]: page
    }));

  }

  getCurrentPage(groupID: string) : number {
    return this.currentPage()[groupID] || 1;
  }

  resetOnSearch(v: string): void {
    this.search.set(v);
    const pages: {[groupID: string]: number} = {};
    this.filteredRows().forEach(g => {
      pages[g.groupID] = 1;
    })
    this.currentPage.set(pages);
  }

  onCategoryChange(categoryID: string): void{
    this.selectedCategoryID.set(categoryID);
    this.loadConditionGroup();
    this.search.set('');

  }

  setPageSize(n: number) {
    this.itemsPerPage.set(n);
    const pages: {[groupID: string]: number} = {};
    this.filteredRows().forEach(g => {
      pages[g.groupID] = 1;
    })
    this.currentPage.set(pages);
  }

  openEditModal(row: Condition, group: ConditionGroup) {
    this.selectedRow.set(row);
    this.selectedConditionGroup.set(group);
    this.showEditModal.set(true);
  }

  closeEditModal() {
    this.selectedRow.set(null);
    this.selectedConditionGroup.set(null);
    this.showEditModal.set(false);
  }

  refresh(): void {
    this.loadConditionGroup();
  }

}
