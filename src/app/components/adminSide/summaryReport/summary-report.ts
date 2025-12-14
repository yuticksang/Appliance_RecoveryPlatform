import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertService } from '../../../services/alert.service';
import { SummaryReportService, SummaryReportData} from '../../../services/summaryReport.service';
import { BreadcrumbComponent } from '../../../shared/breadcrumb/breadcrumb';
import { AuthService } from '../../../../auth/auth-service';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

@Component({
  selector: 'app-summary-report',
  imports: [CommonModule , BreadcrumbComponent],
  templateUrl: './summary-report.html',
  styleUrls: ['./summary-report.scss'],
})
export class SummaryReportComponent implements OnInit {

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private alertService = inject(AlertService);
  private authService = inject(AuthService);
  private summaryReportService = inject(SummaryReportService);

  generatedBy: string = 'Admin';
  adminId: number | string | null = null;

  months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  daysShort = ["S", "M", "T", "W", "T", "F", "S"];

  // --- State Signals ---
  startDate = signal<Date | null>(null);
  endDate = signal<Date | null>(null);
  
  isStartOpen = signal(false);
  isEndOpen = signal(false);

  // Calendar View State
  viewYear = signal(new Date().getFullYear());
  viewMonth = signal(new Date().getMonth());
  tempSelectedDate = signal<Date | null>(null); 

  reportData = signal<SummaryReportData | null>(null);
  generatedReportID = signal<string>(''); 
  
  loading = signal<boolean>(false);
  error = signal<string | null>(null);
  noData = signal<boolean>(false);

  generatedDate = new Date();

  // --- Computed Values for Calendar Grid ---
  daysInMonth = computed(() => {
    const days = new Date(this.viewYear(), this.viewMonth() + 1, 0).getDate();
    return Array.from({ length: days }, (_, i) => i + 1);
  });

  emptySlots = computed(() => {
    const firstDay = new Date(this.viewYear(), this.viewMonth(), 1).getDay();
    return Array.from({ length: firstDay }, (_, i) => i);
  });

  ngOnInit(): void {
      const user = this.authService.user();
        if (user) {
            this.generatedBy = user.username || 'Admin';
            this.adminId = (user as any).admin_id || user.id;
            console.log('Admin ID:', this.adminId);
        }
  }

  // --- Actions ---
  toggleStartCalendar() {
    this.isStartOpen.set(!this.isStartOpen());
    this.isEndOpen.set(false);
    this.initializeCalendar(this.startDate());
  }

  toggleEndCalendar() {
    this.isEndOpen.set(!this.isEndOpen());
    this.isStartOpen.set(false);
    this.initializeCalendar(this.endDate());
  }

  closeAllCalendars(event: Event) {
    // Backdrop click handler
  }

  initializeCalendar(date: Date | null) {
    const d = date || new Date();
    this.viewYear.set(d.getFullYear());
    this.viewMonth.set(d.getMonth());
    this.tempSelectedDate.set(date || d); 
  }

  // Navigation
  handlePrevMonth() {
    if (this.viewMonth() === 0) {
      this.viewMonth.set(11);
      this.viewYear.update(y => y - 1);
    } else {
      this.viewMonth.update(m => m - 1);
    }
  }

  handleNextMonth() {
    if (this.viewMonth() === 11) {
      this.viewMonth.set(0);
      this.viewYear.update(y => y + 1);
    } else {
      this.viewMonth.update(m => m + 1);
    }
  }

  handlePrevYear() {
    this.viewYear.update(y => y - 1);
  }

  handleNextYear() {
    this.viewYear.update(y => y + 1);
  }

  // Selection
  handleDateClick(day: number) {
    const newDate = new Date(this.viewYear(), this.viewMonth(), day);
    this.tempSelectedDate.set(newDate);
  }

  getDayClass(day: number): string {
    const current = this.tempSelectedDate();
    if (
      current &&
      current.getDate() === day &&
      current.getMonth() === this.viewMonth() &&
      current.getFullYear() === this.viewYear()
    ) {
      return 'selected';
    }
    return 'default';
  }

  // Confirm/Cancel
  handleOk(type: 'start' | 'end') {
    if (type === 'start') {
      this.startDate.set(this.tempSelectedDate());
      this.isStartOpen.set(false);
    } else {
      this.endDate.set(this.tempSelectedDate());
      this.isEndOpen.set(false);
    }
  }

  handleCancel() {
    this.isStartOpen.set(false);
    this.isEndOpen.set(false);
  }

  // Main Features
  handleGenerate() {
    const start = this.startDate();
    const end = this.endDate();

    if (!start || !end) {
      this.alertService.error("Please select both a start and end date.");
      return;
    }

    this.generatedDate = new Date();
    
    // Format DD-MM-YYYY
    const formatDateForAPI = (d: Date) => {
            return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
        };

    this.loading.set(true);
    this.error.set(null);
    this.summaryReportService.getSummaryReportByDate(formatDateForAPI(start), formatDateForAPI(end)).subscribe({
      next: (response) => {
        if (response.success) {
          this.reportData.set(response.data);

          // Check if there's no data
          if (this.hasNoData()) {
            this.noData.set(true);
          } else {
            this.noData.set(false);
            if (!this.generatedReportID()) {
              this.generateReportID();
            }
          }
        } else {
          this.error.set('Failed to fetch summary report.');
        }
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set("An error occurred while fetching the summary report.");
        this.loading.set(false);
        this.alertService.error('Failed to generate report');
      }
    });
  }

  hasNoData(): boolean {
        const data = this.reportData();
        if (!data) return true;
        
        // Check if totals are all zeros
        return data.totals.submissions === 0 && 
               data.totals.completed === 0 && 
               data.totals.totalValue === 0;
  }

  generateReportID(): void {
        const data = this.reportData();
        if (!data) return;

         // Generate random alphanumeric string (6 characters)
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let randomPart = '';
        for (let i = 0; i < 6; i++) {
            randomPart += characters.charAt(Math.floor(Math.random() * characters.length));
        }

       // Add timestamp suffix for uniqueness
        const timestamp = Date.now().toString(36).toUpperCase().slice(-4);

       
        const reportID = `SRPT-${randomPart}-${timestamp}`;
        this.generatedReportID.set(reportID);
    }

  handleReset() {
    this.startDate.set(null);
    this.endDate.set(null);
    this.reportData.set(null);
    this.noData.set(false);
    this.isStartOpen.set(false);
    this.isEndOpen.set(false);
  }

    // --- Formatting Helpers ---
    formatCurrency(amount: number): string {
        const num = parseFloat(amount?.toString() || '0');
        return `RM ${num.toFixed(2)}`;
    }

    formatPercentage(value: number): string {
        const num = parseFloat(value?.toString() || '0');
        return `${num.toFixed(2)}%`;
    }

    formatDays(days: number): string {
        const num = parseFloat(days?.toString() || '0');
        return `${num.toFixed(1)} days`;
    }

    formatDisplayDate(dateStr: string): string {
        if (!dateStr) return '-';
        const date = new Date(dateStr);
        return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
    }

     exportReport(): void {
        const start = this.startDate();
        const end = this.endDate();

        if (start && end) {
            const formatDateForAPI = (d: Date) => {
                return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
            };

            this.summaryReportService.saveSummaryReport(
                this.generatedReportID(),
                this.adminId ? this.adminId.toString() : null,
                formatDateForAPI(start),
                formatDateForAPI(end)
            ).subscribe({
                next: () => {
                    window.print();
                    this.alertService.success('Report exported successfully');
                },
                error: () => {
                    window.print();
                    this.alertService.error('Failed to export report');
                }
            });
        } else {
            window.print();
        }
    }

}
