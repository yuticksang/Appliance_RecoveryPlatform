import { Component, Inject, PLATFORM_ID, OnInit, inject, signal } from '@angular/core';
import { RouterOutlet, Router } from '@angular/router';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartOptions, ChartType } from 'chart.js';
import { buyerDashboardService } from '../../../services/buyerDashboard.service';
import { AuthService } from '../../../../auth/auth-service';

// Add these imports for Chart.js registration
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  LineController,
  BarElement,
  BarController,
  ArcElement,
  DoughnutController,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { AlertService } from '../../../services/alert.service';

// Register Chart.js components only in browser
if (typeof window !== 'undefined') {
  ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    LineController,
    BarElement,
    BarController,
    ArcElement,
    DoughnutController,
    Title,
    Tooltip,
    Legend
  );
}

interface TimeSeriesData {
  period: string; // 'Mon', 'Jan', '2024', etc.
  applianceRecovered: number;
  recoveryValue: number;
}

interface Order {
  transactionID: string;
  modelName: string;
  buyerID: string;
  initialOfferPrice: number;
  finalOfferPrice: number;
  createdAt: string;
  transactionStatus: string;
}

@Component({
  selector: 'buyer-dashboard',
  imports: [CommonModule, BaseChartDirective],
  templateUrl: './buyer-dashboard.html',
  styleUrl: './buyer-dashboard.scss',
})
export class BuyerDashboardComponent implements OnInit {
  isBrowser: boolean;

  buyerId: number | string | null = null;

  //metrics cards data
  totalActiveUsers = signal<number>(0);
  totalActiveTransactions = signal<number>(0);
  totalPayout = signal<number>(0);
  totalAppliancesRecovered = signal<number>(0);
  // percentage change signals
  appliancesChange = signal<number>(0);
  payoutChange = signal<number>(0);
  transactionsChange = signal<number>(0);
  usersChange = signal<number>(0);

  //charts state
  activeGraphTab: string = 'appliance';
  activeBarTab: string = 'category';
  activeTimeRange: string = 'monthly';

  //orders table data
  recentOrders = signal<Order[]>([]);

  //charts data
  timeSeriesData = signal<TimeSeriesData[]>([]);

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  private alertService = inject(AlertService);
  private authService = inject(AuthService);
  private dashboardService = inject(buyerDashboardService);
  private router = inject(Router);

  barChartColors = {
    category: '#4ECDC4', // Teal for category
    brand: '#E8B3E8', // Purple for brand
  };

  ngOnInit(): void {
    const user = this.authService.user();
    if (user) {
      this.buyerId = (user as any).buyer_id || user.id;
      console.log('Buyer ID:', this.buyerId);
    }

    if (this.isBrowser) {
      this.loadMetrics();
      this.loadTimeSeriesData();
      this.loadCurrentOrder();
    }
  }

  loadMetrics(): void {
    if (!this.buyerId) {
      console.error('Buyer ID is not available');
      return;
    }

    const buyerId = String(this.buyerId);

    this.dashboardService.getTotalPayout(buyerId).subscribe({
      next: (response) => {
        if (response.success) {
          this.totalPayout.set(response.data.totalValue);
          this.payoutChange.set(response.data.percentageChange ?? 0);
        }
      },
      error: (err) => {
        console.error('Error loading payout:', err);
      },
    });

    this.dashboardService.getAppliancesRecovered(buyerId).subscribe({
      next: (response) => {
        if (response.success) {
          this.totalAppliancesRecovered.set(response.data.totalCount);
          this.appliancesChange.set(response.data.percentageChange ?? 0);
        }
      },
      error: (err) => {
        console.error('Error loading appliances recovered:', err);
      },
    });

    this.dashboardService.getActiveTransactions(buyerId).subscribe({
      next: (response) => {
        if (response.success) {
          this.totalActiveTransactions.set(response.data.totalCount);
          this.transactionsChange.set(response.data.percentageChange ?? 0);
        }
      },
      error: (err) => {
        console.error('Error loading active transactions:', err);
      },
    });
  }

  loadTimeSeriesData(): void {
    if (!this.buyerId) {
      console.error('Buyer ID is not available');
      return;
    }
    const buyerId = String(this.buyerId);

    this.dashboardService.getRecoveryTimeSeries(buyerId, this.activeTimeRange).subscribe({
      next: (response) => {
        if (response.success) {
          this.timeSeriesData.set(response.data);
          this.updateLineChart();
        }
      },
      error: (err) => {
        console.error('Error loading recovery time series:', err);
      },
    });
  }

  hasTimeSeriesData(): boolean {
    const data = this.timeSeriesData();

    if (!data || data.length === 0) {
      return false;
    }

    const hasNonZeroData = data.some((d) => d.applianceRecovered > 0 || d.recoveryValue > 0);
    return hasNonZeroData;
  }

  loadCurrentOrder(): void {
    if (!this.buyerId) {
      console.error('Buyer ID is not available');
      return;
    }
    const buyerId = String(this.buyerId);

    this.dashboardService.getCurrentTransactions(buyerId).subscribe({
      next: (response) => {
        if (response.success) {
          this.recentOrders.set(response.data);
        }
      },
      error: (err) => {
        console.error('Error loading transactions:', err);
      },
    });
  }

  public lineChartData: ChartConfiguration<'line'>['data'] = {
    labels: [],
    datasets: [
      {
        data: [],
      },
    ],
  };

  public lineChartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
    },
  };

  public lineChartType: ChartType = 'line';

  updateLineChart(): void {
    const timeData = this.timeSeriesData();
    const dataKey: keyof TimeSeriesData =
      this.activeGraphTab === 'appliance' ? 'applianceRecovered' : 'recoveryValue';
    const label = this.activeGraphTab === 'appliance' ? 'Appliance Recovered' : 'Recovery Value';

    if (this.activeGraphTab === 'appliance') {
      this.lineChartOptions = {
        ...this.lineChartOptions,
        scales: {
          ...this.lineChartOptions.scales,
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 1,
              callback: function (value) {
                if (Number.isInteger(value)) {
                  return value;
                }
                return null;
              },
            },
            grid: {
              color: '#f5f5f5',
            },
          },
        },
      };
    } else {
      // Recovery Value - use automatic scaling with currency format
      this.lineChartOptions = {
        ...this.lineChartOptions,
        scales: {
          ...this.lineChartOptions.scales,
          y: {
            beginAtZero: true,
            ticks: {
              callback: function (value) {
                return value.toLocaleString();
              },
            },
            grid: {
              color: '#f5f5f5',
            },
          },
        },
      };
    }

    this.lineChartData = {
      labels: timeData.map((d) => d.period),
      datasets: [
        {
          data: timeData.map((d) => d[dataKey]),
          label: label,
          fill: false,
          tension: 0.5,
          borderColor: '#E8B3E8',
          backgroundColor: '#333',
          pointBackgroundColor: '#333',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: '#333',
        },
      ],
    };
  }

  //switch between tabs (Appliance Recovered and Recovery Value)
  switchGraphTab(tab: 'appliance' | 'recoveryValue'): void {
    this.activeGraphTab = tab;
    this.updateLineChart();
  }

  switchTimeRange(range: 'weekly' | 'monthly' | 'yearly'): void {
    this.activeTimeRange = range;
    this.loadTimeSeriesData();
  }

  goToTransactionsPage(): void {
    this.router.navigate(['/buyer/transactions']);
  }

  formatCurrency(amount: number | string, currency: string = 'MYR'): string {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(numAmount)) return `${currency === 'MYR' ? 'RM' : '$'} 0.00`;
    return `${currency === 'MYR' ? 'RM' : '$'} ${numAmount.toFixed(2)}`;
  }

  formatChange(value: number | string | null | undefined): string {
    if (value === null || value === undefined) {
      return '+0.00%';
    }

    const numValue = typeof value === 'string' ? parseFloat(value) : value;

    if (isNaN(numValue)) {
      return '+0.00%';
    }

    if (numValue >= 0) {
      return `+${numValue.toFixed(2)}%`;
    }
    return `${numValue.toFixed(2)}%`;
  }

  formatPercentage(value: number | string): string {
    const numPercentage = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numPercentage)) return '0%';
    return `${numPercentage.toFixed(2)}%`;
  }

  formatDate(dateString: string | Date): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  isPositiveChange(value: number | string | null | undefined): boolean {
    if (value === null || value === undefined) {
      return true;
    }

    const numValue = typeof value === 'string' ? parseFloat(value) : value;

    if (isNaN(numValue)) {
      return true;
    }

    return numValue >= 0;
  }

  getStatusClass(status: string): string {
    return `status-${status.toLowerCase().replace(/\s+/g, '-')}`;
  }

  // ...existing code...

  getPriceChangeClass(initialPrice: number | string, finalPrice: number | string): string {
    const initial = typeof initialPrice === 'string' ? parseFloat(initialPrice) : initialPrice;
    const final = typeof finalPrice === 'string' ? parseFloat(finalPrice) : finalPrice;

    if (isNaN(initial) || isNaN(final)) return '';

    if (final > initial) {
      return 'price-higher';
    } else if (final < initial) {
      return 'price-lower';
    }
    return 'price-same';
  }

  // ...existing code...

  getTimeRangeLabel(): string {
    return this.activeTimeRange.charAt(0).toUpperCase() + this.activeTimeRange.slice(1);
  }

  getBarTabLabel(): string {
    return this.activeBarTab.charAt(0).toUpperCase() + this.activeBarTab.slice(1);
  }
}
