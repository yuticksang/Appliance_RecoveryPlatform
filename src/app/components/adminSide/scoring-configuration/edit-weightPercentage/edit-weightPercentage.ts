import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  inject,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  Condition,
  ConditionGroup,
  Category,
  ScoringConfigurationService,
} from '../scoring-configuration.service';

@Component({
  selector: 'app-edit-weightPercentage',
  imports: [CommonModule, FormsModule],
  templateUrl: './edit-weightPercentage.html',
  styleUrls: ['./edit-weightPercentage.scss'],
})
export class EditWeightPercentage implements OnInit {
  private scoringConfigService = inject(ScoringConfigurationService);

  @Input() conditionGroup?: ConditionGroup[] = [];
  @Input() categoryName?: String;
  @Input() othersConditionGroups: ConditionGroup[] = [];
  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<{
    updates: { conditionGroupID: string; categoryID: string; newWeightPercentage: number }[];
  }>();

  criteriaName = signal<string>('');
  categoryID = signal<string>('');
  weightPercentage = signal<number>(0);
  originalWeightPercentage = signal<number>(0);
  conditionGroupWeight = signal<ConditionGroup[]>([]);

  originalWeights = signal<Map<string, number>>(new Map());

  isSaving = signal<boolean>(false);
  errorMessage = signal<string | null>(null);
  errorMessages = signal<Map<string, string>>(new Map());

  totalWeight = computed(() => {
    return this.conditionGroupWeight().reduce((sum, group) => sum + group.weightPercentage, 0);
  });

  isTotalValid = computed(() => {
    return this.totalWeight() === 100;
  });

  remainingWeight = computed(() => {
    return 100 - this.totalWeight();
  });

  hasChanges = computed(() => {
    const originals = this.originalWeights();
    return this.conditionGroupWeight().some(
      (group) => group.weightPercentage != originals.get(group.groupID)
    );
  });

  allValid = computed(() => {
    return this.errorMessage() === null;
  });

  // check can submit or not
  canSubmit = computed(() => {
    return this.allValid() && this.isTotalValid() && this.hasChanges();
  });

  ngOnInit() {
    if (this.conditionGroup && this.conditionGroup.length > 0) {
      const copy = this.conditionGroup.map((group) => ({ ...group }));
      this.conditionGroupWeight.set(copy);

      // Store original values
      const originals = new Map<string, number>();
      this.conditionGroup.forEach((group) => {
        originals.set(group.groupID, group.weightPercentage);
      });
      this.originalWeights.set(originals);
    }
  }

  onWeightChange(groupID: string, value: string): void {
    const errors = new Map(this.errorMessages());

    // Validation
    if (value === null || value === undefined || value === '') {
      errors.set(groupID, 'Weight is required');
      this.errorMessages.set(errors);
      return;
    }

    // Convert to number if string
    const numValue = typeof value === 'string' ? parseInt(value, 10) : value;

    if (isNaN(numValue)) {
      errors.set(groupID, 'Enter a valid number');
      this.errorMessages.set(errors);
      return;
    }

    if (numValue < 0) {
      errors.set(groupID, 'Must be positive');
      this.errorMessages.set(errors);
      return;
    }

    if (numValue > 100) {
      errors.set(groupID, 'Cannot exceed 100');
      this.errorMessages.set(errors);
      return;
    }

    if (value.includes('.')) {
      errors.set(groupID, 'No decimals allowed');
      this.errorMessages.set(errors);
      return;
    }

    // Valid - remove error and update value
    errors.delete(groupID);
    this.errorMessages.set(errors);

    this.conditionGroupWeight.update((groups) => {
      return groups.map((g) => {
        if (g.groupID === groupID) {
          return { ...g, weightPercentage: numValue };
        }
        return g;
      });
    });
  }

  onClose(): void {
    this.close.emit();
  }

  getError(groupID: string): string | null {
    return this.errorMessages().get(groupID) || null;
  }

  isChanged(groupID: string): boolean {
    const original = this.originalWeights().get(groupID);
    const current = this.conditionGroupWeight().find(
      (g) => g.groupID === groupID
    )?.weightPercentage;
    return original !== current;
  }

  getOriginalWeight(groupID: string): number {
    return this.originalWeights().get(groupID) || 0;
  }

  onSubmit(): void {
    if (!this.canSubmit()) {
      if (!this.isTotalValid()) {
        this.errorMessage.set(`Total must equal 100%. Current: ${this.totalWeight()}%`);
      } else if (!this.allValid()) {
        this.errorMessage.set('Please fix validation errors');
      } else if (!this.hasChanges()) {
        this.errorMessage.set('No changes to save');
      }
      return;
    }

    this.isSaving.set(true);
    this.errorMessage.set(null);

    const originals = this.originalWeights();
    const updates = this.conditionGroupWeight()
      .filter((group) => group.weightPercentage !== originals.get(group.groupID))
      .map((g) => ({
        conditionGroupID: g.groupID,
        categoryID: g.categoryID,
        newWeightPercentage: g.weightPercentage,
      }));

    this.save.emit({ updates });
  }
}
