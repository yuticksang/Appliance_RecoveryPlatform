import { Component, Inject, PLATFORM_ID } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartOptions, ChartType } from 'chart.js';

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

interface ApplianceData {
  name: string;
  recovered: number;
}

interface ConditionData {
  condition: string;
  percentage: number;
  color: string;
}

interface Order{
  id: string;
  appliance: string;
  category: string;
  offerPrice: number;
  date: string;
  status: 'Completed' | 'Pending' | 'Processing' | 'Cancelled';
}

interface DashboardData {
  weekly: TimeSeriesData[];
  monthly: TimeSeriesData[];
  category: ApplianceData[];
  brand: ApplianceData[];
  conditions: ConditionData[];
  recentOrders: Order[];

}


@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, BaseChartDirective],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard {
  isBrowser: boolean;
  activeGraphTab: string = 'appliance';
  activeBarTab: string = 'category';
  activeTimeRange: string = 'monthly';
  
  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
      this.isBrowser = isPlatformBrowser(this.platformId);
  }

  // CENTRALIZED DATA STRUCTURE
  dashboardData: DashboardData = {
    weekly: [
      { period: 'Mon', applianceRecovered: 15, recoveryValue: 12 },
      { period: 'Tue', applianceRecovered: 18, recoveryValue: 16 },
      { period: 'Wed', applianceRecovered: 22, recoveryValue: 19 },
      { period: 'Thu', applianceRecovered: 20, recoveryValue: 18 },
      { period: 'Fri', applianceRecovered: 25, recoveryValue: 20 },
      { period: 'Sat', applianceRecovered: 30, recoveryValue: 22 },
      { period: 'Sun', applianceRecovered: 28, recoveryValue: 24 }
    ],
    monthly: [
      { period: 'Jan', applianceRecovered: 40, recoveryValue: 12 },
      { period: 'Feb', applianceRecovered: 40, recoveryValue: 16 },
      { period: 'Mar', applianceRecovered: 25, recoveryValue: 19 },
      { period: 'Apr', applianceRecovered: 42, recoveryValue: 18 },
      { period: 'May', applianceRecovered: 65, recoveryValue: 20 },
      { period: 'Jun', applianceRecovered: 55, recoveryValue: 22 },
      { period: 'Jul', applianceRecovered: 48, recoveryValue: 24 },
      { period: 'Aug', applianceRecovered: 65, recoveryValue: 26 },
      { period: 'Sep', applianceRecovered: 75, recoveryValue: 28 },
      { period: 'Oct', applianceRecovered: 57, recoveryValue: 25 },
      { period: 'Nov', applianceRecovered: 52, recoveryValue: 23 },
      { period: 'Dec', applianceRecovered: 60, recoveryValue: 21 }
    ],
    category: [
      { name: 'Refrigerators', recovered: 650},
      { name: 'Washing Machines', recovered: 450},
      { name: 'Air Conditioners', recovered: 480},
      { name: 'Microwaves', recovered: 320},
      { name: 'Freezer', recovered: 380}
    ],
    brand: [
      { name: 'Samsung', recovered: 760},
      { name: 'LG', recovered: 550},
      { name: 'Whirlpool', recovered: 420},
      { name: 'Panasonic', recovered: 220},
      { name: 'Bosch', recovered: 380}
    ],
    conditions: [
      { condition: 'Excellent', percentage: 22.8, color: '#93C5FD' },
      { condition: 'Good', percentage: 55.1, color: '#4ECDC4' },
      { condition: 'Fair', percentage: 13.9, color: '#FFD93D' },
      { condition: 'Poor', percentage: 11.2, color: '#FF6B6B' }
    ],

    recentOrders: [
      { id: 'OR1234', appliance: 'LG Front Load Washer', category: 'Washing Machine', offerPrice: 450, date: 'Nov 8, 2025', status: 'Completed' },
      { id: 'OR1235', appliance: 'Samsung Refrigerator', category: 'Refrigerator', offerPrice: 800, date: 'Nov 7, 2025', status: 'Processing' },
      { id: 'OR1236', appliance: 'Whirlpool Microwave Oven', category: 'Microwave', offerPrice: 200, date: 'Nov 6, 2025', status: 'Pending' },
      { id: 'OR1237', appliance: 'Bosch Dishwasher', category: 'Dishwasher', offerPrice: 600, date: 'Nov 5, 2025', status: 'Cancelled' },
      { id: 'OR1238', appliance: 'Panasonic Air Conditioner', category: 'Air Conditioner', offerPrice: 700, date: 'Nov 4, 2025', status: 'Completed' }
    ]
  };

  barChartColors = {
    category: '#4ECDC4',  // Teal for category
    brand: '#E8B3E8'      // Purple for brand
  };

  ngOnInit(): void {
    if (this.isBrowser) {
      // TODO: Replace with API call
      // this.loadDashboardData();
      this.updateAllCharts();
    }
  }

  // ============================================
  // FUTURE DATABASE INTEGRATION
  // ============================================
  // async loadDashboardData() {
  //   try {
  //     const response = await fetch('/api/dashboard');
  //     this.dashboardData = await response.json();
  //     this.updateAllCharts();
  //   } catch (error) {
  //     console.error('Error loading dashboard data:', error);
  //   }
  // }
  
  
  public lineChartData: ChartConfiguration<'line'>['data'] = {
      labels: [],
      datasets: [{
        data: [],
        label: '',
        fill: false,
        tension: 0.5,
        borderColor: '#E8B3E8',
        backgroundColor: 'rgba(232, 179, 232, 0.3)',
        pointBackgroundColor: '#333',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: '#333'
      }]
  };

  public lineChartOptions: ChartOptions<'line'> = {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            y: {
                beginAtZero: true,
                max: 120,
                grid: {
                    color: '#f5f5f5'
                }
            },
            x: {
                grid: {
                    display: false
                }
            }
        },
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
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 800,
        ticks: {
          stepSize: 200,
          callback: function(value) {
            return value;
          }
        },
        grid: {
          color: '#e5e7eb'
        }
      },
      x: {
        grid: {
          display: false
        }
      }
    }
  };

  // Pie chart Data
  pieChartData: ChartConfiguration<'doughnut'>['data'] = {
    labels: [],
    datasets: [
      {
        data: [],
        backgroundColor: [
          '#93C5FD', 
          '#4ECDC4', 
          '#FFD93D', 
          '#FF6B6B'  
        ],
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
    const timeData = this.dashboardData[this.activeTimeRange as keyof DashboardData] as TimeSeriesData[];
    const dataKey: keyof TimeSeriesData = this.activeGraphTab === 'appliance' 
      ? 'applianceRecovered' 
      : 'recoveryValue';
    const label = this.activeGraphTab === 'appliance' ? 'Appliance Recovered' : 'Recovery Value';
     
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

    const barData = this.dashboardData[this.activeBarTab as keyof DashboardData] as ApplianceData[];
    const color = this.barChartColors[this.activeBarTab as 'category' | 'brand'];
    this.barChartData = {
      labels: barData.map(c => c.name),
      datasets: [{
        data: barData.map(c => c.recovered),
        backgroundColor: color,
        borderRadius: 8,
        barThickness: 40
      }]
    };
  }

  updatePieChart(): void {
    this.pieChartData = {
      labels: this.dashboardData.conditions.map(c => c.condition),
      datasets: [{
        data: this.dashboardData.conditions.map(c => c.percentage),
        backgroundColor: this.dashboardData.conditions.map(c => c.color),
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
    this.updateLineChart();
  }

  formatCurrency(amount: number, currency: string = 'MYR'): string {
    return `${currency === 'MYR' ? 'RM' : '$'} ${amount.toFixed(2)}`;
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