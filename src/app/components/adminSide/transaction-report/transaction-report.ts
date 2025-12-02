import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertService } from '../../../services/alert.service';
import { TransactionReportService, TransactionReport } from '../../../services/transactionReport.service';
import { BreadcrumbComponent } from '../../../shared/breadcrumb/breadcrumb';
import { AuthService } from '../../../../auth/auth-service';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

@Component({
  selector: 'app-transaction-report',
  imports: [CommonModule, BreadcrumbComponent],
  templateUrl: './transaction-report.html',
  styleUrls: ['./transaction-report.scss'],
})
export class TransactionReportComponent {
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private reportService = inject(TransactionReportService);
    private alertService = inject(AlertService);
    private authService = inject(AuthService);

    reportData = signal<TransactionReport | null>(null);
    loading = signal<boolean>(false);
    error = signal<string | null>(null);
    generatedDate = new Date();
    generatedBy = 'Admin';
    generatedReportID = signal<string>(''); 
    adminId = 0;

    ngOnInit(): void {
        // Get admin name from AuthService
        const user = this.authService.user();
        if (user) {
            this.generatedBy = user.username || 'Admin';
            this.adminId = (user as any).admin_id || user.id;
            console.log('Admin ID:', this.adminId);
        }

       
        const transactionId = this.route.snapshot.paramMap.get('id');
        if (transactionId) {
            this.loadReportData(transactionId);
        }
    }


    loadReportData(transactionId: string): void {
        this.loading.set(true);
        this.reportService.getTransactionsReportById(transactionId).subscribe({
            next: (response) => {
                if (response.success) {
                  this.reportData.set(response.data);
                  if(!this.generatedReportID()){
                    this.generateReportID();
                  }
                   // Call after data is loaded
                }else{
                  this.error.set('Failed to load report data');
                }
                this.loading.set(false);
            },
            error: (err) => {
                this.error.set('An error occurred while fetching report data.');
                this.loading.set(false);
            }
        });
    }

    exportReport(): void{
      if(this.generatedReportID()){
        this.reportService.saveTransactionReport(this.generatedReportID(), this.reportData()?.transactionID|| '', this.adminId.toString()).subscribe({
          next: () => {
            window.print();
            this.alertService.success('Report exported successfully.');
          },
          error: () => {
            this.alertService.error('Failed to export report.');
          }
        });
      }
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

       
        const reportID = `RPT-${randomPart}-${timestamp}`;
        this.generatedReportID.set(reportID);
    }


    getFunctionalityStatus(): string{
      const conditions = this.reportData()?.conditions || [];
      const functionalityStatus = conditions.filter(c => c.criteriaName === 'Functional Status');
      return functionalityStatus.map(c => c.conditionDescription).join(', ') || 'Good';
    }

    getAppearanceStatus(): string{
      const conditions = this.reportData()?.conditions || [];
      const appearanceStatus = conditions.filter(c => c.criteriaName === 'Appearances Status');
      return appearanceStatus.map(c => c.conditionDescription).join(', ') || 'Good';
    }

    getConditionsList(): string{
      const conditions = this.reportData()?.conditions || [];
      const otherConditions = conditions.filter(c => c.criteriaName === 'Checklist');
      return otherConditions.map(c => c.conditionDescription).join(', ') || '-';
    }

    formatCurrency(amount: number): string {
        return `RM ${(amount || 0).toFixed(2)}`;
    }

    formatDate(date: string): string {
        if (!date) return '-';
        return new Date(date).toLocaleDateString('en-MY', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }

    formatMarkdown(percentage: number | null, amount: number): string {
      if (!percentage || percentage === 0) return '-';
      return `- ${this.formatCurrency(amount)} (${percentage}%)`;
    }

    goBack(): void {
        this.router.navigate(['/admin/transactions']);
    }

}
