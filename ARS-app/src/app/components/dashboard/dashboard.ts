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
    Title,
    Tooltip,
    Legend
  );
}


@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, BaseChartDirective],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard {
  isBrowser: boolean;
  activeTab: string = 'appliance';
  
  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
        this.isBrowser = isPlatformBrowser(this.platformId);
  }
    // Chart data for both tabs

  public lineChartData: ChartConfiguration<'line'>['data'] = {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
       datasets: [
            {
                data: [40, 40, 25, 42, 65, 55, 48, 65, 75, 57, 52, 60],
                label: 'Appliance Recovered',
                fill: false,
                tension: 0.5,
                borderColor: '#E8B3E8',
                backgroundColor: 'rgba(232, 179, 232, 0.3)',
                pointBackgroundColor: '#333',
                pointBorderColor: '#fff',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: '#333'
            }
        ]
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

  chartData = {
     appliance: {
            data: [40, 40, 25, 42, 65, 55, 48, 65, 75, 57, 52, 60],
            label: 'Appliance Recovered',
            color: '#E8B3E8'
        },
        users: {
            data: [30, 45, 50, 58, 72, 65, 68, 80, 85, 70, 78, 55],
            label: 'Active Users',
            color: '#4F94CD'
        }
  };


//switch between tabs
switchTab(tab: string) {
    this.activeTab = tab;
    const currentData = this.chartData[tab as keyof typeof this.chartData];

    this.lineChartData.datasets[0] = {
        ...this.lineChartData.datasets[0],
        data: currentData.data,
        label: currentData.label,
        borderColor: currentData.color,
        backgroundColor: `${currentData.color}33`
    };
    
  }


}