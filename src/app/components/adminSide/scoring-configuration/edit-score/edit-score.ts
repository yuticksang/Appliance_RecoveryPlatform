import { Component, Input, Output, EventEmitter, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Condition, ConditionGroup, Category, ScoringConfigurationService } from '../scoring-configuration.service';

@Component({
  selector: 'app-edit-score',
  imports: [CommonModule, FormsModule],
  templateUrl: './edit-score.html',
  styleUrl: './edit-score.scss',
})

export class EditScore implements OnInit {

  private scoringConfigService = inject(ScoringConfigurationService);

  @Input() condition?: Condition;
  @Input() conditionGroup?: ConditionGroup;
  @Input() categoryName?: String;
  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<{categoryID: string, conditionID: string,newScoreValue: number}>();

  criteriaName = signal<string>('');
  categoryID = signal<string>('');
  description = signal<string>('');
  scoreValue = signal<number>(0);
  originalScoreValue = signal<number>(0);

  isSaving = signal<boolean>(false);
  errorMessage = signal<string | null>(null);
  isValidScore = signal<boolean>(true);


  ngOnInit() {

    if(this.condition && this.conditionGroup){

      this.description.set(this.condition.description);
      this.scoreValue.set(this.condition.scoreValue);
      this.originalScoreValue.set(this.condition.scoreValue);
      this.criteriaName.set(this.conditionGroup.criteriaName);
      this.categoryID.set(this.conditionGroup.categoryID);
     
    }

   

  }


  onScoreChange(value: string) : void{

    this.errorMessage.set(null);
    this.isValidScore.set(true);

    if(!value || value.trim() === ''){
      this.errorMessage.set('Score value is required');
      this.isValidScore.set(false);
      return;
    }

    const numValue = parseFloat(value);

    if (isNaN(numValue)) {
      this.errorMessage.set('Please enter a valid number');
      this.isValidScore.set(false);
      return;
    }

    if (numValue < 0) {
      this.errorMessage.set('Score value must be a positive number');
      this.isValidScore.set(false);
      return;
    }

     if (numValue > 100) {
      this.errorMessage.set('Score value cannot exceed 100');
      this.isValidScore.set(false);
      return;
    }

    if (value.includes('.')) {
      this.errorMessage.set('Score value cannot have decimal places');
      this.isValidScore.set(false);
      return;
    }

    this.scoreValue.set(numValue);
    this.isValidScore.set(true);
  }

  hasChanges(): boolean {
       return this.scoreValue() !== this.originalScoreValue();
  }

  onClose(): void {
    this.close.emit();
  }

  onSubmit(): void{
    if (!this.isValidScore()) {
      this.errorMessage.set('Please fix the validation errors before saving');
      return;
    }

    if (!this.hasChanges()) {
      this.errorMessage.set('No changes to save');
      return;
    }

    this.isSaving.set(true);
    this.errorMessage.set(null);

     this.save.emit({
      categoryID: this.categoryID(),
      conditionID: this.condition!.conditionID,
      newScoreValue: this.scoreValue()
    });

  }
}
