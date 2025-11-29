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
export class HomeComponent {
  private router = inject(Router);

  navigateToQuestionnaire() {
    this.router.navigate(['/questionnaire']);
  }
}
