import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-questionnaire',
  templateUrl: './questionnaire.html',
  styleUrls: ['./questionnaire.scss'],
  imports: [CommonModule],
})
export class QuestionnaireComponent {
  workingStatus: string = 'Partially working';
  selectedIssues: string[] = [];
  physicalCondition: string = '';
  notes: string = '';

  issues: string[] = [
    'Does the appliance make any unusual sounds while operating?',
    'Is the washing machine draining and spinning properly?',
    'Are all the buttons, controls, and settings working correctly?',
    'Is the appliance leaking any water?',
    'Is there any rust or corrosion on the appliance?',
    'Does the appliance come with all its original parts and accessories? (e.g., hoses, manuals)',
    'None of the above'
  ];

  physicalOptions = [
    { id: 'a', label: 'Like New', img: 'assets/images/like-new.jpg' },
    { id: 'b', label: 'Minor Scratches', img: 'assets/images/minor-scratches.jpg' },
    { id: 'c', label: 'Missing Parts', img: 'assets/images/missing-parts.jpg' },
    { id: 'd', label: 'Heavily Damaged', img: 'assets/images/heavily-damaged.jpg' },
    { id: 'e', label: 'Rust or Corrosion', img: 'assets/images/rust.jpg' }
  ];

  toggleIssue(issue: string) {
    if (this.selectedIssues.includes(issue)) {
      this.selectedIssues = this.selectedIssues.filter(i => i !== issue);
    } else {
      this.selectedIssues.push(issue);
    }
  }

  handleNext() {
    console.log({
      workingStatus: this.workingStatus,
      selectedIssues: this.selectedIssues,
      physicalCondition: this.physicalCondition,
      notes: this.notes
    });
    // Navigate to the next page or send to backend here
  }
}
