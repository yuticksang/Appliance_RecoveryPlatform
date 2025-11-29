import { Injectable, signal } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

export interface BreadcrumbItem {
  label: string;
  url?: string;
}

@Injectable({
  providedIn: 'root'
})
export class BreadcrumbService {
  breadcrumbs = signal<BreadcrumbItem[]>([]);

  private routeLabels: { [key: string]: string } = {
    'admin': 'Admin',
    'dashboard': 'Dashboard',
    'admins': 'Admin List',
    'buyers': 'Buyer List',
    'sellers': 'Seller List',
    'transactions': 'Transaction',
    'appliances': 'Appliances',
    'price-list': 'Price List',
    'category': 'Category',
    'brand': 'Brand',
    'condition': 'Condition',
    'markdown-list': 'Markdown List',
    'scoring': 'Scoring Configuration',
    'reporting': 'Reporting'
  };

  constructor(private router: Router) {
    // Update breadcrumbs on initial load
    this.updateBreadcrumbs();

    // Update breadcrumbs on navigation
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        this.updateBreadcrumbs();
      });
  }

  private updateBreadcrumbs() {
    const url = this.router.url;
    const segments = url.split('/').filter(segment => segment);

    // Skip layout segments (admin, buyer) as they're not actual pages
    const skipSegments = ['admin', 'buyer'];

    const breadcrumbs: BreadcrumbItem[] = [];
    let currentPath = '';

    // Always add Dashboard as the first breadcrumb for admin pages
    if (segments[0] === 'admin' && segments.length > 1) {
      breadcrumbs.push({ label: 'Dashboard', url: '/admin/dashboard' });
    }

    segments.forEach((segment, index) => {
      currentPath += `/${segment}`;

      // Skip layout segments
      if (skipSegments.includes(segment)) {
        return;
      }

      const label = this.routeLabels[segment] || this.formatLabel(segment);

      // Don't add link for the last segment (current page)
      if (index === segments.length - 1) {
        breadcrumbs.push({ label });
      } else {
        breadcrumbs.push({ label, url: currentPath });
      }
    });

    this.breadcrumbs.set(breadcrumbs);
  }

  private formatLabel(segment: string): string {
    // Convert kebab-case or snake_case to Title Case
    return segment
      .split(/[-_]/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  // Allow manual override of breadcrumbs if needed
  setBreadcrumbs(breadcrumbs: BreadcrumbItem[]) {
    this.breadcrumbs.set(breadcrumbs);
  }
}
