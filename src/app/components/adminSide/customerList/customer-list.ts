import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-customer-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page-container">
      <h1>Customer Management</h1>
      <p>Customer list page - Coming soon...</p>
    </div>
  `,
  styles: [`
    .page-container {
      padding: 2rem;
    }
    h1 {
      margin-bottom: 1rem;
      color: #333;
    }
    p {
      color: #666;
    }
  `]
})
export class CustomerListComponent {}
