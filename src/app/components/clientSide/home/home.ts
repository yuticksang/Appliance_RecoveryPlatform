import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { QuestionnaireService, Category } from '../../../services/questionnaire.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-client-dashboard',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './home.html',
  styleUrls: ['./home.scss']
})
export class HomeComponent implements OnInit {
  private questionnaireService = inject(QuestionnaireService);
  private router = inject(Router);
  private authService = inject(AuthService);

  categories: Category[] = [];
  loading = false;
  error = false;
  canScrollLeft = false;
  canScrollRight = false;

  ngOnInit() {
    this.loadCategories();
  }

  loadCategories() {
    this.loading = true;
    this.error = false;

    this.questionnaireService.getCategories().subscribe({
      next: (categories) => {
        this.categories = categories;
        this.loading = false;
        console.log('Categories loaded:', categories);

        // Check scroll state after loading
        setTimeout(() => this.updateScrollButtons(), 100);
      },
      error: (err) => {
        console.error('Failed to load categories:', err);
        this.error = true;
        this.loading = false;
      }
    });
  }

  scrollLeft() {
    const container = document.querySelector('.cards-container') as HTMLElement;
    if (container) {
      container.scrollBy({ left: -300, behavior: 'smooth' });
      setTimeout(() => this.updateScrollButtons(), 300);
    }
  }

  scrollRight() {
    const container = document.querySelector('.cards-container') as HTMLElement;
    if (container) {
      container.scrollBy({ left: 300, behavior: 'smooth' });
      setTimeout(() => this.updateScrollButtons(), 300);
    }
  }

  updateScrollButtons() {
    const container = document.querySelector('.cards-container') as HTMLElement;
    if (container) {
      this.canScrollLeft = container.scrollLeft > 0;
      this.canScrollRight = container.scrollLeft < (container.scrollWidth - container.clientWidth - 1);
    }
  }

  onScroll(event: Event) {
    this.updateScrollButtons();
  }

  getImageUrl(category: Category): string {
    if (category.image) {
      return category.image;
    }
    // Fallback to default images based on category name
    const defaultImages: { [key: string]: string } = {
      'Washing Machine': 'assets/image/washing-machine.png',
      'Microwave': 'assets/image/microwave.png',
      'Air Conditioners': 'assets/image/aircon.png',
      'Refrigerators': 'assets/image/fridge.png'
    };
    return defaultImages[category.name] || 'assets/image/placeholder-appliance.png';
  }

  onCategoryClick(category: Category) {
    // Check if user is logged in
    if (!this.authService.isLoggedIn()) {
      // Redirect to login page
      this.router.navigate(['/login'], {
        queryParams: {
          returnUrl: '/questionnaire',
          categoryId: category.id
        }
      });
      return;
    }

    // Navigate to questionnaire with category pre-selected
    this.router.navigate(['/questionnaire'], {
      queryParams: { categoryId: category.id }
    });
  }
}
