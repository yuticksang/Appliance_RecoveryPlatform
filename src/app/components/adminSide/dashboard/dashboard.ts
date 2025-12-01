import { Component, Inject, PLATFORM_ID, OnInit, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartOptions, ChartType } from 'chart.js';
import { DashboardService } from '../../../services/dashboard.service';

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

interface CategoryRecoveredData {
  categoryName: string;
  applianceRecovered: number;
}

interface BrandRecoveredData {
  brandName: string;
  applianceRecovered: number;
}

interface ConditionData {
  condition: string;
  percentage: number;
  
}

interface getTop5RecoveredModel{
  modelName: string;
  applianceRecovered: number;
}

interface Order{
  transactionID: string;
  modelName: string;
  buyerID: string;
  initialOfferPrice: number;
  createdAt: string;
  transactionStatus: string;
}



@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, BaseChartDirective],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit {
  isBrowser: boolean;

  //metrics cards data
  totalActiveUsers = signal<number>(0);
  totalActiveTransactions = signal<number>(0);
  totalPayout = signal<number>(0);
  totalAppliancesRecovered = signal<number>(0);

  activeGraphTab: string = 'appliance';
  activeBarTab: string = 'category';
  activeTimeRange: string = 'monthly';
  recentOrders = signal<Order[]>([]);
  timeSeriesData = signal<TimeSeriesData[]>([]);
  categoryData = signal<CategoryRecoveredData[]>([]);
  brandData = signal<BrandRecoveredData[]>([]);
  conditionData = signal<ConditionData[]>([]);
  top5RecoveredModels = signal<getTop5RecoveredModel[]>([]);

  
  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
      this.isBrowser = isPlatformBrowser(this.platformId);
  }

  private alertService = inject(AlertService);
  private dashboardService = inject(DashboardService);

  
  barChartColors = {
    category: '#4ECDC4',  // Teal for category
    brand: '#E8B3E8'      // Purple for brand
  };

  ngOnInit(): void {
    if (this.isBrowser) {
      // TODO: Replace with API call
      // this.loadDashboardData();

      this.loadMetrics();
      this.loadTimeSeriesData();
      this.loadCategoryandBrandData();
      this.loadConditionData();
      this.loadTop5RecoveredModels();
      this.loadCurrentOrder();
    }
  }

  loadMetrics(): void {

    this.dashboardService.getTotalPayout().subscribe({
      next: (response) =>{
        if (response.success) {
          this.totalPayout.set(response.data.recoveryValue);
        }
      },
      error: (err) => {
          console.error('Error loading payout:', err);
      }
    });

    this.dashboardService.getAppliancesRecovered().subscribe({
      next: (response) =>{
        if (response.success) {
          this.totalAppliancesRecovered.set(response.data.appliances_recovered);
        }
      },      
      error: (err) => {
          console.error('Error loading appliances recovered:', err);
      }
    });

    this.dashboardService.getActiveUsers().subscribe({
      next: (response) =>{
        if (response.success) {
          this.totalActiveUsers.set(response.data.total_active_sellers);
        }
      },      
      error: (err) => {
          console.error('Error loading active users:', err);
      }
    });

    this.dashboardService.getActiveTransactions().subscribe({
      next: (response) =>{
        if (response.success) { 
          this.totalActiveTransactions.set(response.data.active_transactions);
        }
      },      
      error: (err) => {
          console.error('Error loading active transactions:', err);
      }
    });
   
  
  }

  loadTimeSeriesData(): void {
    this.dashboardService.getRecoveryTimeSeries(this.activeTimeRange).subscribe({
      next: (response) => {
        if (response.success) { 
          this.timeSeriesData.set(response.data);
          this.updateLineChart();
        }
      },
      error: (err) => {
        console.error('Error loading recovery time series:', err);
      }
    });
  }

  loadCategoryandBrandData(): void {

    this.dashboardService.getCategoryRecoveryData().subscribe({
      next: (response) => {
        if (response.success) { 
          this.categoryData.set(response.data);
          this.updateBarChart();
        }
      }
    });

    this.dashboardService.getBrandRecoveryData().subscribe({
      next: (response) => {
        if (response.success) { 
          this.brandData.set(response.data);
          this.updateBarChart();
        }
      }
    });

  }

  loadConditionData(): void {
    this.dashboardService.getConditionScoreData().subscribe({
      next: (response) => {

        if (response.success) { 
          this.conditionData.set(response.data);
          this.updatePieChart();
        } 

      }
    });
  }

  loadTop5RecoveredModels(): void {
    this.dashboardService.getTop5RecoveredModels().subscribe({
      next: (response) => {
        if (response.success) {
          this.top5RecoveredModels.set(response.data);
        }
      }
    });
  }

  loadCurrentOrder() : void{
    this.dashboardService.getCurrentTransactions().subscribe({
      next: (response) => {
        if (response.success) {
          this.recentOrders.set(response.data);
        }
      },
        error: (err) => {
          console.error('Error loading transactions:', err);
        }
    });
  }

  public lineChartData: ChartConfiguration<'line'>['data'] = {
      labels: [],
      datasets: [{
        data: [],
      }]
  };

  public lineChartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      }
    }
  };

  public lineChartType: ChartType = 'line';

  // Bar chart Data
  barChartData: ChartConfiguration<'bar'>['data'] = {
    labels: [],
     datasets: [{
      data: [],
      backgroundColor: '#4ECDC4',
      borderRadius: 8,
      barThickness: 40
    }]
  };

   barChartOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false }
    }
    
  };

  // Pie chart Data
  pieChartData: ChartConfiguration<'doughnut'>['data'] = {
    labels: [],
    datasets: [
      {
        data: [],
        backgroundColor: [],
        borderWidth: 0,
        hoverOffset: 10
      }
    ]
  };

  pieChartOptions: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
     plugins: {
      legend: {
        display: true,
        position: 'right',
        labels: {
          usePointStyle: true,
          padding: 30,
          font: {
            size: 13
          },
          boxWidth: 10,
          boxHeight: 10,
          textAlign: 'left',
          generateLabels: (chart) => {
            const data = chart.data;
            if (data.labels && data.datasets.length) {
              return data.labels.map((label, i) => {
                const dataset = data.datasets[0];
                const value = dataset.data[i];
                return {
                  text: `${label}: ${value}%`,
                  fillStyle: Array.isArray(dataset.backgroundColor) 
                    ? dataset.backgroundColor[i] 
                    : dataset.backgroundColor,
                  hidden: false,
                  index: i
                };
              });
            }
            return [];
          }
        },
        align: 'center', 
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            return context.label + ': ' + context.parsed + '%';
          }
        }
      }
    },
    layout: {
      padding: {
        left: 10,
        right: 40,
        top: 10,
        bottom: 10
      }
    },
    cutout: '60%'

  };


  // CHART UPDATE METHODS
  updateAllCharts(): void {
    this.updateLineChart();
    this.updateBarChart();
    this.updatePieChart();
  }

  updateLineChart() : void {
    const timeData = this.timeSeriesData();
    const dataKey: keyof TimeSeriesData = this.activeGraphTab === 'appliance' 
      ? 'applianceRecovered' 
      : 'recoveryValue';
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
              callback: function(value) {
                if (Number.isInteger(value)) {
                  return value;
                }
                return null;
              }
            },
            grid: {
              color: '#f5f5f5'
            }
          }
        }
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
              callback: function(value) {
                return 'RM ' + value.toLocaleString();
              }
            },
            grid: {
              color: '#f5f5f5'
            }
          }
        }
      };
    }

     this.lineChartData = {
      labels: timeData.map(d => d.period),
      datasets: [{
        data: timeData.map(d => d[dataKey]),
        label: label,
        fill: false,
        tension: 0.5,
        borderColor: '#E8B3E8',
        backgroundColor: '#333',
        pointBackgroundColor: '#333',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: '#333'
      }]
    };
    
  }

  updateBarChart(): void {

    const barData = this.activeBarTab === 'category' ? this.categoryData() : this.brandData();
    const color = this.barChartColors[this.activeBarTab as 'category' | 'brand'];

    const labels = this.activeBarTab === 'category' 
      ? this.categoryData().map(c => c.categoryName)
      : this.brandData().map(b => b.brandName);
    
    const data = this.activeBarTab === 'category'
      ? this.categoryData().map(c => Number(c.applianceRecovered))
      : this.brandData().map(b => Number(b.applianceRecovered));

    this.barChartOptions ={
      ...this.barChartOptions,
      scales: {
        ...this.barChartOptions.scales,
         y: {
            beginAtZero: true,
            ticks: {
            stepSize: 1,
            callback: function(value) {
              if (Number.isInteger(value)) {
                return value;
              }
              return null;
            }
            },
            grid: {
              color: '#f5f5f5'
            }
          }
      }

    };
    this.barChartData = {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: color,
        borderRadius: 8,
        barThickness: 40
      }]
    };
  }

  updatePieChart(): void {
    const conditionColors: { [key: string]: string } = {
      'Excellent': '#93C5FD',  // Blue
      'Good': '#4ECDC4',       // Teal
      'Fair': '#FFD93D',       // Yellow
      'Poor': '#FF6B6B'        // Red
    };
    const conditions = this.conditionData();
    const colors = conditions.map(c => conditionColors[c.condition] || '#CCCCCC');
    this.pieChartData = {
      labels: conditions.map(c => c.condition),
      datasets: [{
        data: conditions.map(c => c.percentage),
        backgroundColor: colors, 
        borderWidth: 0,
        hoverOffset: 10
      }]
    };
  }

  //switch between tabs (Appliance Recovered and Recovery Value)
  switchGraphTab(tab: 'appliance' | 'recoveryValue'): void {
    this.activeGraphTab = tab;
    this.updateLineChart();
  }

  switchBarTab(tab: 'category' | 'brand'): void {
    this.activeBarTab = tab;
    this.updateBarChart();
  }

  switchTimeRange(range: 'weekly' | 'monthly' | 'yearly'): void {
    this.activeTimeRange = range;
    this.loadTimeSeriesData();
  }

  formatCurrency(amount: number | string, currency: string = 'MYR'): string {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(numAmount)) return `${currency === 'MYR' ? 'RM' : '$'} 0.00`;
  return `${currency === 'MYR' ? 'RM' : '$'} ${numAmount.toFixed(2)}`;
}

  formatDate(dateString: string | Date): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  }

  getStatusClass(status: string): string {
    return `status-${status.toLowerCase()}`;
  }
  
  getTimeRangeLabel(): string {
      return this.activeTimeRange.charAt(0).toUpperCase() + this.activeTimeRange.slice(1);
  }

  getBarTabLabel(): string {
      return this.activeBarTab.charAt(0).toUpperCase() + this.activeBarTab.slice(1);
  }


}