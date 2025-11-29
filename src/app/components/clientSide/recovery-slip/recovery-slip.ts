import { Component, ElementRef, ViewChild, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../../../services/auth.service';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

@Component({
  selector: 'app-recovery-slip',
  imports: [CommonModule],
  templateUrl: './recovery-slip.html',
  styleUrls: ['./recovery-slip.scss']
})
export class RecoverySlipComponent implements OnInit {
  @ViewChild('recoverySlip', { static: false }) recoverySlip!: ElementRef;

  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private http = inject(HttpClient);
  private auth = inject(AuthService);

  transactionId: string | number = '';
  loading = true;
  error = false;

  // Read the transactionId from navigation state
  private fromTransactionId: string | number | null = null;

  recoveryData = {
    date: '',
    receiptNo: '',
    seller: { name: '', phone: '', address: '' },
    appliance: {
      id: '',
      category: '',
      brand: '',
      model: '',
      tradeValue: '',
      initialScore: 0,
      dynamicAnswers: [] as Array<{ sectionName: string; question: string; type: string; answer: string | string[] }>
    },
    delivery: { method: 'On-Demand Pickup', pickupDate: '', pickupTime: '' }
  };


  ngOnInit(): void {
    // Get transaction ID from route params
    this.route.params.subscribe(params => {
      this.transactionId = params['id'];
      if (this.transactionId) {
        this.loadRecoverySlipData();
      } else {
        this.error = true;
        this.loading = false;
      }
    });

    // Get the transaction ID from navigation state for back navigation
    const navigation = this.router.getCurrentNavigation();
    const state = navigation?.extras.state as { fromTransactionId?: string | number };

    if (state?.fromTransactionId) {
      this.fromTransactionId = state.fromTransactionId;
    } else {
      // Fallback: try to read from history.state
      this.fromTransactionId = history.state?.fromTransactionId || this.transactionId;
    }
  }

  loadRecoverySlipData(): void {
    this.loading = true;
    this.error = false;

    this.http.get<any>(`http://localhost:3000/api/transactions/${this.transactionId}`, { headers:this.auth.getAuthHeaders() }).subscribe({
      next: (response) => {
        console.log('✅ Recovery slip data loaded:', response);
        this.mapTransactionToRecoveryData(response);
        this.loading = false;
      },
      error: (err) => {
        console.error('❌ Error loading recovery slip data:', err);
        this.error = true;
        this.loading = false;
      }
    });
  }

  mapTransactionToRecoveryData(data: any): void {
 

    // Format address from separate fields
    const addressParts = [
      data.pickupAddress,
      data.city,
      data.state,
      data.zipCode
    ].filter(Boolean); // Remove empty/null values

    const formattedAddress = addressParts.length > 0
      ? addressParts.join(', ')
      : 'N/A';


    this.recoveryData = {
      date: data.submittedDate ? new Date(data.submittedDate).toLocaleDateString() : 'N/A',
      receiptNo: data.id || 'N/A', // Use transaction ID as receipt number
      seller: {
        // Use Pickup table snapshot data (addressName/addressPhone from snapshotReceiverName/snapshotPhoneNum)
        name: data.addressName || data.sellerName || 'N/A',
        phone: data.addressPhone || data.sellerPhone || 'N/A',
        address: formattedAddress
      },
      appliance: {
        id: data.submittedApplianceID || 'N/A',
        category: data.category || 'N/A',
        brand: data.brand || 'N/A',
        model: data.modelName || data.model || 'N/A',
        tradeValue: `RM ${parseFloat(data.finalPrice || data.estimatedPrice || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        initialScore: parseFloat(data.initialScore) || 0,
        dynamicAnswers: data.dynamicAnswers || []
      },
      delivery: {
        method: 'On-Demand Pickup',
        pickupDate: data.pickupDate || 'Not scheduled',
        pickupTime: data.pickupTimeSlot || 'Not scheduled'
      }
    };
  }

  getScoreLabel(score: number): string {
    if (score >= 85) return 'Excellent';
    else if (score >= 70) return 'Good';
    else if (score >= 50) return 'Fair';
    else return 'Poor';
  }

  calculateConditionScore(functionalStatus: string, physicalCondition: string): string {
    let score = 0;

    // Functional status scoring
    if (functionalStatus?.includes('Working') || functionalStatus?.includes('Functioning')) {
      score += 50;
    } else if (functionalStatus?.includes('Minor')) {
      score += 30;
    }

    // Physical condition scoring
    if (physicalCondition?.includes('Excellent') || physicalCondition?.includes('New')) {
      score += 40;
    } else if (physicalCondition?.includes('Good') || physicalCondition?.includes('Minor')) {
      score += 30;
    } else if (physicalCondition?.includes('Fair')) {
      score += 20;
    }

    let label = 'Poor';
    if (score >= 80) label = 'Excellent';
    else if (score >= 60) label = 'Good';
    else if (score >= 40) label = 'Fair';

    return `${score}% (${label})`;
  }

  goBackToTransaction(): void {
    if (this.fromTransactionId) {
      this.router.navigate(['/transaction-detail', this.fromTransactionId]);
    } else {
      // Fallback: go to transactions list if no ID
      this.router.navigate(['/transactions']);
    }
  }

  /** Download only the slip portion as PDF */
  async downloadPDF() {
    if (!this.recoverySlip) return;

    const slipElement = this.recoverySlip.nativeElement;

    // Take screenshot with html2canvas
    const canvas = await html2canvas(slipElement, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');

    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    // Calculate the height proportionally to fit in one page
    const imgProps = {
      width: canvas.width,
      height: canvas.height
    };

    const ratio = Math.min(pageWidth / imgProps.width, pageHeight / imgProps.height);

    const imgWidth = imgProps.width * ratio;
    const imgHeight = imgProps.height * ratio;

    const marginX = (pageWidth - imgWidth) / 2;
    const marginY = (pageHeight - imgHeight) / 2;

    pdf.addImage(imgData, 'PNG', marginX, marginY, imgWidth, imgHeight);
    pdf.save(`${this.recoveryData.receiptNo}.pdf`);
  }

  /** Print only the slip portion */
  printSlip() {
    if (!this.recoverySlip) return;

    const slipElement = this.recoverySlip.nativeElement;

    // Clone the slip to measure dimensions without affecting the UI
    const clone = slipElement.cloneNode(true) as HTMLElement;
    clone.style.margin = '0';
    clone.style.padding = '0';

    // Create print window
    const printWindow = window.open('', '', 'width=800,height=600');
    if (!printWindow) return;

    // Calculate scaling to fit A4
    const pageWidthMm = 210; // A4 width in mm
    const pageHeightMm = 297; // A4 height in mm
    const dpi = 96; // typical screen DPI
    const pageWidthPx = pageWidthMm * dpi / 25.4;
    const pageHeightPx = pageHeightMm * dpi / 25.4;

    const scaleX = pageWidthPx / clone.offsetWidth;
    const scaleY = pageHeightPx / clone.offsetHeight;
    const scale = Math.min(scaleX, scaleY, 1); // never upscale

    // Write HTML to print window
    printWindow.document.write(`
      <html>
        <head>
          <title>Print Recovery Slip</title>
          <style>
            body {
              margin: 0;
              padding: 20px;
              color: #000;
              background: #fff;
              font-family: Arial, sans-serif;
            }
            .slip-card {
              transform: scale(${scale});
              transform-origin: top left;
              background: #fff !important;
              color: #000 !important;
              max-width: none !important;
            }
            .title, .section-title {
              background: #fff !important;
              color: #000 !important;
            }
            .section-content {
              background: #fff !important;
              color: #000 !important;
            }
            p, li, a {
              color: #000 !important;
            }
            a {
              text-decoration: underline;
            }
            @media print {
              body {
                -webkit-print-color-adjust: exact;
              }
            }
          </style>
        </head>
        <body>
          ${clone.outerHTML}
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  }


}