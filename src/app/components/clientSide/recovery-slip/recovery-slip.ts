import { Component, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

@Component({
  selector: 'app-recovery-slip',
  imports: [],
  templateUrl: './recovery-slip.html',
  styleUrls: ['./recovery-slip.scss']
})
export class RecoverySlipComponent {
  @ViewChild('recoverySlip', { static: false }) recoverySlip!: ElementRef;

  recoveryData = {
    date: 'Friday, July 11, 2025, 06:11 PM +08',
    receiptNo: 'REC-2025-0711-001',
    seller: { name: 'Jisoo', phone: '+60123345566', address: '123 Jalan Pudu, 55100 Kuala Lumpur, Malaysia' },
    appliance: { id: 'WM00001', category: 'Laundry Appliances', brand: 'LG', model: 'WM3400CW', functionalStatus: 'Partially Functional', issue: 'Strange noise during operation', physicalCondition: 'Minor scratches', tradeValue: 'RM 400.00', conditionScore: '82% (Good)' },
    delivery: { method: 'On-Demand Pickup', pickupDate: '2025-07-15', pickupTime: '10:00 AM - 12:00 PM' }
  };

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