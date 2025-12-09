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
  // Store full response data for smart change display
  appliancesData = signal<any>(null);
  payoutData = signal<any>(null);
  transactionsData = signal<any>(null);

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
          this.payoutData.set(response.data);
          this.totalPayout.set(parseFloat(response.data.totalValue) || 0);
        }
      },
      error: (err) => {
        console.error('Error loading payout:', err);
      },
    });

    this.dashboardService.getAppliancesRecovered(buyerId).subscribe({
      next: (response) => {
        if (response.success) {
          this.appliancesData.set(response.data);
          this.totalAppliancesRecovered.set(parseInt(response.data.totalCount) || 0);
        }
      },
      error: (err) => {
        console.error('Error loading appliances recovered:', err);
      },
    });

    this.dashboardService.getActiveTransactions(buyerId).subscribe({
      next: (response) => {
        if (response.success) {
          this.transactionsData.set(response.data);
          this.totalActiveTransactions.set(parseInt(response.data.totalCount) || 0);
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

  formatSmartChange(data: any, isCurrency: boolean = false): string {
    if (!data) return '0';

    const displayMode = data.displayMode || 'percentage';
    const trend = data.trend || 'stable';
    const absoluteChange = parseFloat(data.absoluteChange) || 0;
    const percentageChange = parseFloat(data.percentageChange) || 0;

    // No change
    if (displayMode === 'none' || (absoluteChange === 0 && percentageChange === 0)) {
      return '0';
    }

    // Use absolute change for small samples
    if (displayMode === 'absolute') {
      const prefix = absoluteChange > 0 ? '+' : '';
      if (isCurrency) {
        return `${prefix}RM ${Math.abs(absoluteChange).toFixed(2)}`;
      }
      return `${prefix}${absoluteChange}`;
    }

    // Use percentage for larger samples
    const prefix = percentageChange > 0 ? '+' : '';
    return `${prefix}${percentageChange.toFixed(2)}%`;
  }

  getTrendClass(data: any): string {
    if (!data) return 'neutral';

    const trend = data.trend || 'stable';
    if (trend === 'up') return 'positive';
    if (trend === 'down') return 'negative';
    return 'neutral';
  }

  getTrendIcon(data: any): string {
    if (!data) return 'bi-dash';

    const trend = data.trend || 'stable';
    if (trend === 'up') return 'bi-arrow-up-right';
    if (trend === 'down') return 'bi-arrow-down-right';
    return 'bi-dash';
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
