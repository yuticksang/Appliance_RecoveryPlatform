import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard {
    activeTab: string = 'appliance';

    // Chart data for both tabs

    chartData = {
  
      appliance: {
        title: 'Appliance Recovered',
        color: '#E8B3E8',
        points: [
        { x: 80, y: 200, value: 40 },
        { x: 150, y: 200, value: 40 },
        { x: 220, y: 240, value: 25 },
        { x: 290, y: 180, value: 42 },
        { x: 360, y: 120, value: 65 },
        { x: 430, y: 140, value: 55 },
        { x: 500, y: 160, value: 48 },
        { x: 570, y: 120, value: 65 },
        { x: 640, y: 100, value: 75 },
        { x: 710, y: 135, value: 57 },
        { x: 780, y: 150, value: 52 },
        { x: 850, y: 150, value: 60 },
      ]
      },
      users: {
        title: 'Active Users',
        color: '#E8B3E8',
        points: [
        { x: 80, y: 200, value: 40 },
        { x: 150, y: 200, value: 40 },
        { x: 220, y: 240, value: 25 },
        { x: 290, y: 180, value: 42 },
        { x: 360, y: 120, value: 65 },
        { x: 430, y: 140, value: 55 },
        { x: 500, y: 160, value: 48 },
        { x: 570, y: 120, value: 65 },
        { x: 640, y: 100, value: 75 },
        { x: 710, y: 135, value: 57 },
        { x: 780, y: 150, value: 52 },
        { x: 850, y: 150, value: 50 },
      ]
    }
};

months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Get current chart data based on active tab
get currentChart(){
    return this.chartData[this.activeTab as keyof typeof this.chartData];
}

// Get polyline points string
get polylinePoints() {
    return this.currentChart.points.map(p => `${p.x},${p.y}`).join(' ');
}

//switch between tabs
switchTab(tab: string) {
    this.activeTab = tab;
  }


}