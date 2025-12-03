import { Component, Input, Output, EventEmitter, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Condition, ConditionGroup, Category, ScoringConfigurationService } from '../scoring-configuration.service';

@Component({
  selector: 'app-edit-weightPercentage',
  imports: [CommonModule, FormsModule],
  templateUrl: './edit-weightPercentage.html',
  styleUrls: ['./edit-weightPercentage.scss'],
})

export class EditWeightPercentage implements OnInit {

  private scoringConfigService = inject(ScoringConfigurationService);

  
  @Input() conditionGroup?: ConditionGroup;
  @Input() categoryName?: String;
  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<{conditionGroupID: string, categoryID: string, newWeightPercentage: number}>();

  criteriaName = signal<string>('');
  categoryID = signal<string>('');
  weightPercentage = signal<number>(0);
  originalWeightPercentage = signal<number>(0);

  isSaving = signal<boolean>(false);
  errorMessage = signal<string | null>(null);
  isValidWeightPercentage = signal<boolean>(true);


  ngOnInit() {

    if(this.conditionGroup){

      this.weightPercentage.set(this.conditionGroup.weightPercentage);
      this.originalWeightPercentage.set(this.conditionGroup.weightPercentage);
      this.criteriaName.set(this.conditionGroup.criteriaName);
      this.categoryID.set(this.conditionGroup.categoryID);
     
    }

  }

  onWeightPercentageChange(value: string) : void{

    this.errorMessage.set(null);
    this.isValidWeightPercentage.set(true);

    if(!value || value.trim() === ''){
      this.errorMessage.set('Score value is required');
      this.isValidWeightPercentage.set(false);
      return;
    }

    const numValue = parseFloat(value);

    if (isNaN(numValue)) {
      this.errorMessage.set('Please enter a valid number');
      this.isValidWeightPercentage.set(false);
      return;
    }

    if (numValue < 0) {
      this.errorMessage.set('Score value must be a positive number');
      this.isValidWeightPercentage.set(false);
      return;
    }

     if (numValue > 100) {
      this.errorMessage.set('Score value cannot exceed 100');
      this.isValidWeightPercentage.set(false);
      return;
    }

    if (value.includes('.')) {
      this.errorMessage.set('Score value cannot have decimal places');
      this.isValidWeightPercentage.set(false);
      return;
    }

    this.weightPercentage.set(numValue);
    this.isValidWeightPercentage.set(true);
  }

  hasChanges(): boolean {
       return this.weightPercentage() !== this.originalWeightPercentage();
  }

  onClose(): void {
    this.close.emit();
  }

  onSubmit(): void{
    if (!this.isValidWeightPercentage()) {
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
      conditionGroupID: this.conditionGroup!.groupID,
      categoryID: this.categoryID(),
      newWeightPercentage: this.weightPercentage()
    });

  }
}
