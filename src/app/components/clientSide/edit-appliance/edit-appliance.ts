import { Component, ChangeDetectionStrategy, ChangeDetectorRef, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { QuestionnaireService, Category, SimpleItem } from '../../../services/questionnaire.service';
import { TransactionService } from '../../../services/transaction.service';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../services/auth.service';
import { AlertService } from '../../../services/alert.service';

interface ConditionGroup {
  groupID: string;
  sectionName: string;
  question: string;
  type: 'single_choice' | 'image_selection' | 'multiple_choice' | 'file_upload' | 'textarea';
  displayOrder: number;
  options: {
    id: string;
    code: string;
    description: string;
    image: string | null;
  }[];
}

@Component({
  selector: 'app-edit-appliance',
  templateUrl: './edit-appliance.html',
  styleUrls: ['./edit-appliance.scss'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EditApplianceComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private questionnaireService = inject(QuestionnaireService);
  private transactionService = inject(TransactionService);
  private auth = inject(AuthService);
  private fb = inject(FormBuilder);
  private alertService = inject(AlertService);
  private cdr = inject(ChangeDetectorRef);

  currentUser = this.auth.currentUser;
  transactionId: string | number = '';
  transaction: any = null;
  loading = true;
  isSubmitting = false;

  // Appliance Details
  applianceTypeId: string = '';
  applianceTypes: Category[] = [];
  selectedBrandId: string | number = '';
  selectedModelId: string | number = '';
  brands: SimpleItem[] = [];
  models: SimpleItem[] = [];

  // Condition Questions
  conditionGroups = signal<ConditionGroup[]>([]);
  selectedAnswers = signal<Record<string, any>>({});

  // File upload
  uploadedFiles: File[] = [];
  existingPhotos: string[] = [];
  thumbnailUrls: string[] = [];
  selectedImageUrl: string = '';
  showImageModal = false;

  allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
  maxFiles = 10;
  maxSizeMB = 5;

  ngOnInit() {
    this.transactionId = this.route.snapshot.params['id'];
    this.loadTransactionData();
    this.loadCategories();
    this.loadConditionGroups();
  }

  loadTransactionData(): void {
    this.loading = true;
    this.transactionService.getTransactionById(this.transactionId).subscribe({
      next: (data) => {
        console.log('Transaction data loaded:', data);

        // Verify transaction belongs to current user
        const user = this.currentUser();
        if (data.sellerId !== user?.sellerId) {
          this.alertService.error('Unauthorized access');
          this.router.navigate(['/transactions']);
          return;
        }

        // Verify status is "Under Review"
        if (data.transactionStatus !== 'Under Review') {
          this.alertService.error('This transaction cannot be edited');
          this.router.navigate(['/transaction-detail', this.transactionId]);
          return;
        }

        this.transaction = data;

        // Pre-fill form data
        this.applianceTypeId = data.categoryId || '';
        this.selectedBrandId = data.brandId || '';
        this.selectedModelId = data.modelId || '';

        // Load brands and models based on category and brand
        if (this.applianceTypeId) {
          this.onCategoryChange();
        }

        // Pre-fill condition answers
        this.prefillConditionAnswers(data);

        // Load existing photos
        if (data.photos && Array.isArray(data.photos)) {
          this.existingPhotos = data.photos;
        }

        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('Error loading transaction:', error);
        this.alertService.error('Failed to load transaction data');
        this.router.navigate(['/transactions']);
      }
    });
  }

  prefillConditionAnswers(data: any): void {
    // Wait for condition groups to load, then prefill
    const checkInterval = setInterval(() => {
      if (this.conditionGroups().length > 0) {
        clearInterval(checkInterval);

        const answers: Record<string, any> = {};

        // Functional Status
        const functionalGroup = this.conditionGroups().find(g =>
          g.sectionName.toLowerCase().includes('functional') ||
          g.question.toLowerCase().includes('working')
        );
        if (functionalGroup && data.initialFunctionalStatus) {
          const option = functionalGroup.options.find(opt =>
            opt.description === data.initialFunctionalStatus
          );
          if (option) answers[functionalGroup.groupID] = option.id;
        }

        // Physical Condition
        const physicalGroup = this.conditionGroups().find(g =>
          g.sectionName.toLowerCase().includes('appearance') ||
          g.sectionName.toLowerCase().includes('physical')
        );
        if (physicalGroup && data.initialPhysicalCondition) {
          const option = physicalGroup.options.find(opt =>
            opt.description === data.initialPhysicalCondition
          );
          if (option) answers[physicalGroup.groupID] = option.id;
        }

        // Selected Issues (multiple choice)
        const issueGroup = this.conditionGroups().find(g => g.type === 'multiple_choice');
        if (issueGroup && data.selectedIssues) {
          const issueIds: string[] = [];
          data.selectedIssues.forEach((issueName: string) => {
            const option = issueGroup.options.find(opt => opt.description === issueName);
            if (option) issueIds.push(option.id);
          });
          answers[issueGroup.groupID] = issueIds;
        }

        // Notes
        const notesGroup = this.conditionGroups().find(g => g.type === 'textarea');
        if (notesGroup && data.note) {
          answers[notesGroup.groupID] = data.note;
        }

        this.selectedAnswers.set(answers);
        this.cdr.markForCheck();
      }
    }, 100);

    // Clear interval after 5 seconds to prevent infinite checking
    setTimeout(() => clearInterval(checkInterval), 5000);
  }

  loadCategories(): void {
    this.questionnaireService.getCategories().subscribe({
      next: (cats) => {
        if (Array.isArray(cats) && cats.length) {
          this.applianceTypes = cats;
          this.cdr.markForCheck();
        }
      },
      error: (err) => {
        console.error('Failed to load categories', err);
      }
    });
  }

  loadConditionGroups(): void {
    this.questionnaireService.getConditionGroups().subscribe({
      next: (groups) => {
        this.conditionGroups.set(groups);
        // Initialize answers
        const initial: Record<string, any> = {};
        groups.forEach(g => {
          if (g.type === 'multiple_choice') initial[g.groupID] = [];
          else if (g.type === 'single_choice' || g.type === 'image_selection') initial[g.groupID] = '';
          else if (g.type === 'textarea') initial[g.groupID] = '';
        });
        this.selectedAnswers.set(initial);
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.alertService.error('Failed to load questions');
      }
    });
  }

  onCategoryChange(): void {
    this.selectedBrandId = '';
    this.selectedModelId = '';
    this.brands = [];
    this.models = [];
    if (!this.applianceTypeId) return;

    this.questionnaireService.getBrandsByCategory(this.applianceTypeId).subscribe({
      next: (bs) => {
        this.brands = bs;
        this.cdr.markForCheck();

        // If editing, auto-select the brand
        if (this.transaction && this.transaction.brandId) {
          this.selectedBrandId = this.transaction.brandId;
          this.onBrandChange();
        }
      },
      error: (err) => {
        console.error('Failed to load brands', err);
      }
    });
  }

  onBrandChange(): void {
    this.selectedModelId = '';
    this.models = [];
    if (!this.selectedBrandId) return;

    this.questionnaireService.getModelsByCategoryBrand(this.applianceTypeId, this.selectedBrandId).subscribe({
      next: (ms) => {
        this.models = ms;
        this.cdr.markForCheck();

        // If editing, auto-select the model
        if (this.transaction && this.transaction.modelId) {
          this.selectedModelId = this.transaction.modelId;
          this.cdr.markForCheck();
        }
      },
      error: (err) => {
        console.error('Failed to load models', err);
      }
    });
  }

  // File upload methods (same as questionnaire)
  onFileDropped(event: DragEvent) {
    event.preventDefault();
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.handleFileUpload(Array.from(files) as File[]);
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    if (files && files.length > 0) {
      this.handleFileUpload(Array.from(files) as File[]);
    }
  }

  handleFileUpload(newFiles: File[]) {
    const valid: File[] = [];

    for (const file of newFiles) {
      const totalFiles = this.uploadedFiles.length + this.existingPhotos.length;
      if (totalFiles >= this.maxFiles) break;
      if (!this.allowedTypes.includes(file.type)) continue;
      if (file.size / (1024 * 1024) > this.maxSizeMB) continue;

      valid.push(file);

      // Create thumbnail
      const reader = new FileReader();
      reader.onload = (e: any) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = 120;
          canvas.height = 120;
          const ctx = canvas.getContext('2d')!;

          const size = Math.min(img.width, img.height);
          const x = (img.width - size) / 2;
          const y = (img.height - size) / 2;

          ctx.drawImage(img, x, y, size, size, 0, 0, 120, 120);
          const thumbnail = canvas.toDataURL('image/jpeg', 0.8);
          this.thumbnailUrls.push(thumbnail);
          this.cdr.markForCheck();
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    }

    this.uploadedFiles = [...this.uploadedFiles, ...valid];
    this.cdr.markForCheck();
  }

  removeFile(index: number) {
    this.uploadedFiles = this.uploadedFiles.filter((_, i) => i !== index);
    this.thumbnailUrls = this.thumbnailUrls.filter((_, i) => i !== index);
    this.cdr.markForCheck();
  }

  removeExistingPhoto(index: number) {
    this.existingPhotos = this.existingPhotos.filter((_, i) => i !== index);
    this.cdr.markForCheck();
  }

  openImageModal(url: string) {
    this.selectedImageUrl = url;
    this.showImageModal = true;
  }

  closeImageModal() {
    this.showImageModal = false;
    this.selectedImageUrl = '';
  }

  getFileUrl(file: File): string {
    return URL.createObjectURL(file);
  }

  // Condition answer methods (same as questionnaire)
  toggleChecklist(groupId: string, optionId: string) {
    this.selectedAnswers.update(ans => {
      const current = ans[groupId] || [];
      if (current.includes(optionId)) {
        return { ...ans, [groupId]: current.filter((id: string) => id !== optionId) };
      } else {
        return { ...ans, [groupId]: [...current, optionId] };
      }
    });
    this.cdr.markForCheck();
  }

  selectImageOption(groupId: string, optionId: string) {
    this.selectedAnswers.update(current => ({
      ...current,
      [groupId]: optionId
    }));
    this.cdr.markForCheck();
  }

  getAnswer(groupId: string): any {
    return this.selectedAnswers()[groupId];
  }

  goBack(): void {
    this.router.navigate(['/transaction-detail', this.transactionId]);
  }

  submitForm(): void {
    if (this.isSubmitting) return;

    // Validation
    if (!this.selectedModelId) {
      this.alertService.error('Please select appliance details');
      return;
    }

    // Check required condition questions
    const unanswered = this.conditionGroups().filter(group => {
      if (group.type === 'file_upload' || group.type === 'textarea') return false;
      const answer = this.selectedAnswers()[group.groupID];
      return answer === undefined || answer === '' || answer === null ||
            (Array.isArray(answer) && answer.length === 0);
    });

    if (unanswered.length > 0) {
      this.alertService.error('Please complete all required questions');
      return;
    }

    this.isSubmitting = true;

    // Build payload
    const functionalGroup = this.conditionGroups().find(g =>
      g.sectionName.toLowerCase().includes('functional') ||
      g.question.toLowerCase().includes('working')
    );
    const functionalStatus = functionalGroup
      ? functionalGroup.options.find(opt =>
          opt.id === this.selectedAnswers()[functionalGroup.groupID]
        )?.description || null
      : null;

    const physicalGroup = this.conditionGroups().find(g =>
      g.sectionName.toLowerCase().includes('appearance') ||
      g.sectionName.toLowerCase().includes('physical')
    );
    const physicalCondition = physicalGroup
      ? physicalGroup.options.find(opt =>
          opt.id === this.selectedAnswers()[physicalGroup.groupID]
        )?.description || null
      : null;

    const issueGroup = this.conditionGroups().find(g => g.type === 'multiple_choice');
    const selectedIssueIds = issueGroup
      ? (this.selectedAnswers()[issueGroup.groupID] || []) as string[]
      : [];

    const notesGroup = this.conditionGroups().find(g => g.type === 'textarea');
    const notes = notesGroup
      ? (this.selectedAnswers()[notesGroup.groupID] || '').toString().trim() || null
      : null;

    const payload = {
      modelId: this.selectedModelId,
      initialFunctionalStatus: functionalStatus,
      initialPhysicalCondition: physicalCondition,
      selectedConditionIds: JSON.stringify(selectedIssueIds),
      notes: notes,
      existingPhotos: JSON.stringify(this.existingPhotos)
    };

    console.log('Update payload:', payload);

    // Submit update using the new updateApplianceDetails endpoint
    this.transactionService.updateApplianceDetails(this.transactionId, payload).subscribe({
      next: () => {
        this.alertService.success('Appliance details updated successfully!');
        this.isSubmitting = false;
        this.router.navigate(['/transaction-detail', this.transactionId]);
      },
      error: (err) => {
        console.error('Update failed:', err);
        this.alertService.error(err.error?.message || 'Update failed. Please try again.');
        this.isSubmitting = false;
        this.cdr.markForCheck();
      }
    });
  }
}
