import { Component, computed, signal, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EditScore } from './edit-score/edit-score';

interface ScoringRow{
  id: String;
  image: String;
  condition: String;
  score: number;
}

type SortKey = 'adminId' | 'score' ;
type SortDir = 'asc' | 'desc';

@Component({
  selector: 'app-scoring-configuration',
  imports: [CommonModule, FormsModule, EditScore],
  templateUrl: './scoring-configuration.html',
  styleUrl: './scoring-configuration.scss',
})
export class ScoringConfiguration {

  rows = signal<ScoringRow[]>([
    { id: 'F001', image:'', condition: 'Excellent', score: 100 },
    { id: 'F002', image:'', condition: 'Good', score: 80 },
    { id: 'F003', image:'', condition: 'Fair', score: 60 },
    { id: 'F004', image:'', condition: 'Poor', score: 40 }
  ]);
  itemsPerPageOptions = [3, 5, 10, 20];
  itemsPerPage = signal<number>(3);
  currentPage = signal<number>(1);

  sortKey = signal<SortKey>('adminId');
  sortDir = signal<SortDir>('asc');

  search = signal<string>('');

  showEditModal = signal<boolean>(false);
  selectedRow = signal<ScoringRow | null>(null);

  filteredRows = computed(() => {

    const q = this.search().trim().toLowerCase();

    const list = this.rows().filter(r =>
      !q ||
      r.id.toLowerCase().includes(q) ||
      r.image.toLowerCase().includes(q) ||
      r.condition.toLowerCase().includes(q) ||
      r.score.toString().toLowerCase().includes(q)
    );

    const key = this.sortKey();
    const dir = this.sortDir();

    list.sort((a: any, b: any) => {
      const av = (a[key] ?? '').toString().toLowerCase();
      const bv = (b[key] ?? '').toString().toLowerCase();
    if (av < bv) return dir === 'asc' ? -1 : 1;
    if (av > bv) return dir === 'asc' ? 1 : -1;
    return 0;
    });

    return list;
  });

  totalPages = computed(() => 
    Math.max(1, Math.ceil(this.filteredRows().length / this.itemsPerPage()))
  );

  pageNumbers = computed(() => 
    Array.from({ length: this.totalPages()}, (_, i) => i + 1)
  );

  pageSlice = computed(() => {
    const start = (this.currentPage() - 1) * this.itemsPerPage();

    //extract elements from index start to (but not including) end, (10, 20) = get item at 10-19
    return this.filteredRows().slice(start, start + this.itemsPerPage()); 
  });

  goToPage(page: number) {
    if(page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
  }

  resetOnSearch(v: string) {
    this.search.set(v);
    this.currentPage.set(1);
  }

  setPageSize(n: number) {
    this.itemsPerPage.set(n);
    this.currentPage.set(1);
  }

  openEditModal(row: ScoringRow) {
    this.selectedRow.set(row);
    this.showEditModal.set(true);
  }

  closeEditModal() {
    this.selectedRow.set(null);
    this.showEditModal.set(false);
  }

}
