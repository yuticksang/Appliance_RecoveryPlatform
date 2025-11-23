import { Component, ChangeDetectionStrategy, ChangeDetectorRef, OnInit, inject, signal, computed } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { QuestionnaireService, Category,  SimpleItem } from '../../../services/questionnaire.service';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../services/auth.service';
import { AlertService } from '../../../services/alert.service';

interface Address {
  id?: string;
  name: string;  
  phone: string;
  state?: string;
  city?: string;
  zip?: string;
  pickup: string;
  isDefault?: boolean;
}

interface ConditionGroup {
  groupID: string;
  sectionName: string;
  question: string;
  type: 'radio' | 'image' | 'checkbox' | 'file_upload' | 'textarea';
  displayOrder: number;
  options: {
    id: string;
    code: string;
    description: string;
    image: string | null;
  }[];
}


@Component({
  selector: 'app-questionnaires',
  templateUrl: './questionnaires.html',
  styleUrls: ['./questionnaires.scss'],
  standalone: true, 
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush   // ← ADD THIS
})
export class QuestionnairesComponent implements OnInit{
  private questionnaireService = inject(QuestionnaireService);
  private auth = inject(AuthService);
  private fb = inject(FormBuilder);
  private alertService = inject(AlertService);
  private cdr = inject(ChangeDetectorRef);
  
  currentUser = this.auth.currentUser;

  // Step tracking
  private _currentStep = 1;
  totalSteps: number = 5;
  maxStepReached: number = 1; // Track the furthest step user has reached

  steps: number[] = [1, 2, 3, 4, 5];
  isSubmitting = false;
  

  // Step 1 - Appliance Type
  applianceTypeId: string = '';
  applianceTypes: Category[] = [];

  // Step 2 - Appliance Details
  selectedBrandId: string | number = '';
  selectedBrand: string = '';
  selectedModelId: string | number = '';
  selectedModel: string = '';
  brands: SimpleItem[] = [];
  models: SimpleItem[] = [];
  

  // Step 3 - With Condition Questions
  conditionGroups = signal<ConditionGroup[]>([]);
  selectedAnswers = signal<Record<string, any>>({}); // groupID → answer
  group!: ConditionGroup;  // ← even better, with type



  // Step 3 - Condition Questionnaires
  notes: string = '';
  uploadedFiles: File[] = [];
  thumbnailUrls: string[] = [];        // For 120x120 previews
  selectedImageUrl: string = '';       // For modal
  showImageModal = false;


  // Step 4 - Valuation
  valuationScore: number = 0;
  valuationLabel: string = '';
  valuationWorth: number = 0;

  // Step 5 - Pickup
/* ────── ADDRESS SIGNALS ────── */
  addresses = signal<Address[]>([]);
  defaultAddress = computed(() => this.addresses().find(a => a.isDefault) ?? null);

  showAddressModal = signal(false);
  editingAddressId = signal<string | null>(null);

  addressForm: FormGroup = this.fb.group({
    name: ['', [Validators.required]],  
    phone: ['', [Validators.required, Validators.pattern(/^(\+?60|0)?[1-9]\d{8,9}$/)]],
    state: ['', [Validators.required]],
    city: ['', [Validators.required]],
    zip: ['', [Validators.required]],
    pickup: ['', [Validators.required]],
    setAsDefault: [false],
  });

  loading = false;
  success = '';
  error = '';

  pickupDate: string = '';
  minDate: string;
  pickupTime = '';
  timeSlots = [
    '10:00 AM - 12:00 PM',
    '12:00 PM - 2:00 PM',
    '2:00 PM - 4:00 PM',
    '4:00 PM - 6:00 PM',
    '6:00 PM - 8:00 PM'
  ];

  constructor() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 2);
    this.minDate = tomorrow.toISOString().split('T')[0]; // YYYY-MM-DD
  }

  isDateInvalid(): boolean {
    if (!this.pickupDate) return false;
    return new Date(this.pickupDate) < new Date(this.minDate);
  }


  allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
  maxFiles = 10;
  maxSizeMB = 5;

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
    const newThumbnails: string[] = [];

    for (const file of newFiles) {
      if (this.uploadedFiles.length >= this.maxFiles) break;
      if (!this.allowedTypes.includes(file.type)) continue;
      if (file.size / (1024 * 1024) > this.maxSizeMB) continue;

      valid.push(file);

      // Create 120x120 thumbnail
      const reader = new FileReader();
      reader.onload = (e: any) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = 120;
          canvas.height = 120;
          const ctx = canvas.getContext('2d')!;
          
          // Crop to square from center
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
    // Remove both the file and its thumbnail
    this.uploadedFiles.splice(index, 1);
    this.thumbnailUrls.splice(index, 1);

    // Force change detection
    this.uploadedFiles = [...this.uploadedFiles];
    this.thumbnailUrls = [...this.thumbnailUrls];
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

  calculateValuation() {
    let score = 0;

    // Functional Status (CG001)
    const funcDesc = this.getFunctionalStatus();
    if (funcDesc?.includes('Fully')) score += 40;
    else if (funcDesc?.includes('Partially')) score += 25;
    else if (funcDesc) score += 10;

    // Physical Condition (CG002)
    const physDesc = this.getPhysicalCondition();
    if (physDesc?.includes('Like New')) score += 30;
    else if (physDesc?.includes('Minor')) score += 25;
    else if (physDesc?.includes('Missing')) score += 15;
    else if (physDesc?.includes('Heavily')) score += 10;
    else if (physDesc?.includes('Rust')) score += 5;

    // Issues
    const issueCount = this.getSelectedIssueDescriptions().length;
    if (issueCount === 0 || this.getSelectedIssueDescriptions().includes('None of the above')) {
      score += 30;
    } else {
      score += Math.max(0, 30 - issueCount * 5);
    }

    this.valuationScore = Math.min(score, 100);
    this.valuationLabel = this.valuationScore >= 85 ? 'Excellent' 
      : this.valuationScore >= 70 ? 'Good'
      : this.valuationScore >= 50 ? 'Fair' : 'Poor';
    this.valuationWorth = Math.round((this.valuationScore / 100) * 1500);
  }


  ngOnInit() {
    console.log('User:', this.currentUser());
    this.loadCategories(); // load actual types from backend

    // ALWAYS load condition groups on init
    this.loadConditionGroups();
  }

  // Helper to check if a group is a checklist (multiple selection)
  isChecklistGroup(group: ConditionGroup): boolean {
    return group.criteriaName.toLowerCase().includes('checklist');
  }

  // Helper to get single-select groups (Functional Status, Appearance Status, etc.)
  getSingleSelectGroups(): ConditionGroup[] {
    return this.conditionGroups.filter(g => !this.isChecklistGroup(g));
  }

  // Helper to get checklist groups
  getChecklistGroups(): ConditionGroup[] {
    return this.conditionGroups.filter(g => this.isChecklistGroup(g));
  }

  // Select an option for a single-select group
  selectConditionOption(groupID: string, conditionID: string, description: string): void {
    this.selectedConditionByGroup[groupID] = conditionID;

    // Update legacy fields for backward compatibility
    const group = this.conditionGroups.find(g => g.groupID === groupID);
    if (group) {
      const groupName = group.criteriaName.toLowerCase();
      if (groupName.includes('functional')) {
        this.workingStatus = description;
      } else if (groupName.includes('appearance') || groupName.includes('physical')) {
        this.physicalCondition = description;
      }
    }
    this.cdr.markForCheck();
  }

  // Toggle a checklist item
  toggleChecklistItem(conditionID: string, description: string): void {
    this.selectedChecklistItems[conditionID] = !this.selectedChecklistItems[conditionID];

    // Update selectedIssues array for backward compatibility
    if (this.selectedChecklistItems[conditionID]) {
      if (!this.selectedIssues.includes(description)) {
        this.selectedIssues.push(description);
      }
    } else {
      this.selectedIssues = this.selectedIssues.filter(i => i !== description);
    }
    this.cdr.markForCheck();
  }

  // Get selected option description for a group
  getSelectedOptionDescription(groupID: string): string {
    const conditionID = this.selectedConditionByGroup[groupID];
    if (!conditionID) return '';
    const group = this.conditionGroups.find(g => g.groupID === groupID);
    const option = group?.options.find(o => o.conditionID === conditionID);
    return option?.description || '';
  }

  // Get all selected condition IDs for submission
  getAllSelectedConditionIds(): string[] {
    const ids: string[] = [];

    // Add single-select group selections
    Object.values(this.selectedConditionByGroup).forEach(id => {
      if (id) ids.push(id);
    });

    // Add checklist selections
    Object.entries(this.selectedChecklistItems).forEach(([id, selected]) => {
      if (selected) ids.push(id);
    });

    return ids;
  }

  // Helper to get option description by conditionID
  getOptionDescription(group: ConditionGroup, conditionID: string): string {
    const option = group.options.find(o => o.conditionID === conditionID);
    return option?.description || '';
  }

  set currentStep(value: number) {
    this._currentStep = value;
    if (value === 3) {
      this.loadConditionGroups();
    }
    if (value === 5 && this.addresses().length === 0) {
      this.loadAddresses();
    }
  }
  get currentStep() { return this._currentStep; }

  // Step 1
  private loadCategories(): void {
    this.questionnaireService.getCategories().subscribe({
      next: (cats) => {
        if (Array.isArray(cats) && cats.length) {
          this.applianceTypes = cats;
        }
      },
      error: (err) => {
        console.error('Failed to load categories', err);
      }
    });
  }

  // call when category select changes -- Step 2
  onCategoryChange(): void {
    this.selectedBrandId = '';
    this.selectedModelId = '';
    this.brands = [];
    this.models = [];
    if (!this.applianceTypeId) return;

    this.questionnaireService.getBrandsByCategory(this.applianceTypeId).subscribe({
      next: (bs) => {
        this.brands = bs;
      },
      error: (err) => {
        console.error('Failed to load brands', err);
      }
    });
  }

  onBrandChange(): void {
    // reset selected model when brand changes
    this.selectedModelId = '';
    this.models = [];
    // set selectedBrand name from loaded brands (optional, used for display/submission)
    this.selectedBrand = this.brands.find(b => String(b.id) === String(this.selectedBrandId))?.name ?? '';
    if (!this.selectedBrandId) return;

    this.questionnaireService.getModelsByCategoryBrand(this.applianceTypeId, this.selectedBrandId).subscribe({
      next: (ms) => {
        this.models = ms;
      },
      error: (err) => {
        console.error('Failed to load models', err);
      }
    });
  }

  // helper to display selected category/brand/model names where needed
  getSelectedCategoryName(): string {
    const c = this.applianceTypes.find(x => String(x.id) === String(this.applianceTypeId));
    return c ? String(c.name) : '';
  }
  getSelectedBrandName(): string {
    const b = this.brands.find(x => String(x.id) === String(this.selectedBrandId));
    return b ? String(b.name) : '';
  }
  getSelectedModelName(): string {
    const m = this.models.find(x => String(x.id) === String(this.selectedModelId));
    return m ? String(m.name) : '';
  }


  // Step 3 - Load Condition Groups and Options
  loadConditionGroups() {
    this.questionnaireService.getConditionGroups().subscribe({
      next: (groups) => {
        this.conditionGroups.set(groups);

        // Initialize answers ONLY if they don't exist yet (preserve existing answers)
        const currentAnswers = this.selectedAnswers();
        const hasExistingAnswers = Object.keys(currentAnswers).length > 0;

        if (!hasExistingAnswers) {
          const initial: Record<string, any> = {};
          groups.forEach(g => {
            if (g.type === 'checkbox') initial[g.groupID] = [];
            else if (g.type === 'radio' || g.type === 'image') initial[g.groupID] = '';
            else if (g.type === 'textarea') initial[g.groupID] = '';
          });
          this.selectedAnswers.set(initial);
        }

        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Failed to load condition groups:', err);
        this.alertService.error('Failed to load questions');
      }
    });
  }

  toggleChecklist(groupId: string, optionId: string) {
    this.selectedAnswers.update(ans => {
      const current = ans[groupId] || [];
      if (current.includes(optionId)) {
        return { ...ans, [groupId]: current.filter((id: string) => id !== optionId) };
      } else {
        return { ...ans, [groupId]: [...current, optionId] };
      }
    });
    this.onAnswerChange();
  }

  onAnswerChange() {
    this.cdr.markForCheck();
    this.calculateValuation(); // if needed
  }

  selectImageOption(groupId: string, optionId: string) {
    this.selectedAnswers.update(current => ({
      ...current,
      [groupId]: optionId
    }));
    this.onAnswerChange();
  }

  toggleChecklistOption(groupId: string, optionId: string) {
    this.selectedAnswers.update(current => {
      const currentList = (current[groupId] || []) as string[];
      if (currentList.includes(optionId)) {
        return {
          ...current,
          [groupId]: currentList.filter(id => id !== optionId)
        };
      } else {
        return {
          ...current,
          [groupId]: [...currentList, optionId]
        };
      }
    });
    this.onAnswerChange();
  }

  // Get answer for a specific group (by groupID)
  getAnswer(groupId: string): any {
    return this.selectedAnswers()[groupId];
  }

  // Update answer for radio/textarea
  updateAnswer(groupId: string, value: any) {
    this.selectedAnswers.update(ans => ({...ans, [groupId]: value}));
    this.onAnswerChange();
  }

  // ─────────────────────────────────────────────────────────
  // DYNAMIC ANSWER DISPLAY HELPERS (for Step 4 & 5)
  // ─────────────────────────────────────────────────────────

  // Get formatted answer for any question group
  getFormattedAnswer(groupId: string): string {
    const group = this.conditionGroups().find(g => g.groupID === groupId);
    if (!group) return '—';

    const answer = this.selectedAnswers()[groupId];

    // For radio/image: single selection
    if (group.type === 'radio' || group.type === 'image') {
      if (!answer) return '—';
      return group.options.find(opt => opt.id === answer)?.description || '—';
    }

    // For checkbox: multiple selections
    if (group.type === 'checkbox') {
      if (!Array.isArray(answer) || answer.length === 0) return 'None selected';
      return answer
        .map(id => group.options.find(opt => opt.id === id)?.description)
        .filter(Boolean)
        .join(', ');
    }

    // For textarea: free text
    if (group.type === 'textarea') {
      return answer || '—';
    }

    return '—';
  }

  // Get all answered questions (exclude file_upload)
  getAnsweredQuestions() {
    return this.conditionGroups()
      .filter(g => g.type !== 'file_upload')
      .map(g => ({
        question: g.question,
        sectionName: g.sectionName,
        answer: this.getFormattedAnswer(g.groupID)
      }));
  }

  // Backwards compatibility helpers (for existing hardcoded logic)
  getFunctionalStatus(): string {
    return this.getFormattedAnswer('CG001');
  }

  getPhysicalCondition(): string {
    return this.getFormattedAnswer('CG002');
  }

  getSelectedIssueDescriptions(): string[] {
    const group = this.conditionGroups().find(g => g.type === 'checkbox');
    if (!group) return [];

    const selectedIds = this.selectedAnswers()[group.groupID] || [];
    return group.options
      .filter(opt => selectedIds.includes(opt.id))
      .map(opt => opt.description);
  }



  // ──────────────────────────────────────────────────────────────────────
  //  ADDRESS CRUD -- step 5
  // ──────────────────────────────────────────────────────────────────────
  loadAddresses() {
    const user = this.currentUser();
    if (!user) {
      console.log('No user logged in');
      return;
    }

    console.log('Fetching addresses for user:', user.id);
    this.auth.getAddresses(user.id).subscribe({
      next: (rawList: any[]) => {
        console.log('API Raw Response:', rawList);

        const list: Address[] = rawList.map(a => ({
          id: String(a.id || a.addressID),
          name: a.name || a.receiverName || '',
          phone: a.phone || a.phoneNum || '',
          state: a.state || '',
          city: a.city || '',
          zip: a.zip || a.zipCode || '',
          pickup: a.pickup || a.pickupAddress || '',
          isDefault: !!a.isDefault
        }));

        console.log('Mapped Addresses:', list);
        this.addresses.set(list);

        // Auto-set first as default
        if (list.length && !list.some(a => a.isDefault)) {
          this.setDefaultAndSave(list[0].id!);
        }
      },
      error: (err) => {
        console.error('Failed to load addresses:', err);
        this.alertService.error('Failed to load addresses');
      }
    });
  }

  /* ────── MODAL CONTROLS ────── */
  openAddressModal() {
    console.log('OPEN MODAL - addresses:', this.addresses());
    this.addressForm.reset({ setAsDefault: false });
    this.editingAddressId.set(null);
    this.showAddressModal.set(true);
  }

  closeAddressModal() {
    this.showAddressModal.set(false);
    this.editingAddressId.set(null);
    this.addressForm.reset();
  }

  /* ────── EDIT ────── */
  startEdit(addr: Address) {
    this.addressForm.patchValue({
      name: addr.name ?? '',
      phone: addr.phone ?? '',
      state: addr.state ?? '',
      city: addr.city ?? '',
      zip: addr.zip ?? '',
      pickup: addr.pickup ?? '',
      setAsDefault: !!addr.isDefault
    });
    this.editingAddressId.set(addr.id ?? null);
  }

  /* ────── SAVE (Add / Edit) ────── */
  saveAddress() {
    if (this.addressForm.invalid) {
      this.alertService.error('Please fill all required fields');
      return;
    }

    const raw = this.addressForm.getRawValue();

    // MAP FRONTEND → BACKEND FIELD NAMES
    const payload = {
      name: (raw.name || '').trim(),
      phone: (raw.phone || '').trim(),
      state: (raw.state || '').trim(),
      city: (raw.city || '').trim(),
      zip: (raw.zip || '').trim(),
      pickup: (raw.pickup || '').trim()
    };

    // DO NOT send `setAsDefault` here — handle separately
    const user = this.currentUser();
    if (!user) return;

    const id = this.editingAddressId();
    const obs$ = id
      ? this.auth.updateAddress(user.id, id, payload)
      : this.auth.createAddress(user.id, payload);

    obs$.subscribe({
      next: (saved: any) => {
        const addr: Address = {
          id: String(saved.id || saved.addressID),
          name: saved.name || saved.receiverName,
          phone: saved.phone || saved.phoneNum,
          state: saved.state,
          city: saved.city,
          zip: saved.zip || saved.zipCode,
          pickup: saved.pickup || saved.pickupAddress,
          isDefault: !!saved.isDefault
        };

        // Handle default separately
        if (raw.setAsDefault) {
          this.setDefaultAndSave(addr.id!);
        }

        if (id) {
          this.addresses.update(list => list.map(a => a.id === id ? addr : a));
        } else {
          this.addresses.update(list => [...list, addr]);
        }
        this.closeAddressModal();
      },
      error: (err) => {
        console.error('Save failed:', err);
        this.alertService.error('Failed to save address');
      }
    });
  }

  /* ────── DELETE ────── */
  deleteAddress(id: string) {
    if (!confirm('Delete this address?')) return;
    const user = this.currentUser();
    if (!user) return;

    this.auth.deleteAddress(user.id, id).subscribe({
      next: () => {
        this.addresses.update(list => list.filter(a => a.id !== id));
        this.alertService.success('Address deleted');
      },
      error: () => this.alertService.error('Delete failed')
    });
  }

  /* ────── SELECT FROM LIST (tap address) ────── */
  selectDefault(addr: Address) {
    if (!addr.id) return;
    this.setDefaultAndSave(addr.id);
  }

  /* ────── SET DEFAULT (API + UI) ────── */
  private setDefaultAndSave(addressId: string) {
    if (!addressId || addressId.includes('undefined') || addressId.startsWith('temp-')) {
      console.error('Invalid addressId:', addressId);
      return;
    }

    const user = this.currentUser();
    if (!user) return;

    this.auth.setDefaultAddress(user.id, addressId).subscribe({
      next: () => {
        this.addresses.update(list =>
          list.map(a => ({ ...a, isDefault: a.id === addressId }))
        );
      },
      error: (err) => {
        console.error('Set default failed:', err);
        this.alertService.error('Failed to set default');
      }
    });
  }

  /* ────── CONFIRM (close modal & keep selected default) ────── */
  confirmSelection() {
    this.closeAddressModal();
  }

  nextStep() {
    // Step 1 validation
    if (this.currentStep === 1 && !this.applianceTypeId) {
      this.alertService.error('Please select an appliance type.');
      return;
    }

    // Step 2 validation
    if (this.currentStep === 2) {
      if (!this.selectedBrandId || !this.selectedModelId) {
        this.alertService.error('Please fill in all appliance details before continuing.');
        return;
      }
    }

    // Step 3 validation (ensure physical condition and working status selected)
    if (this.currentStep === 3) {
      const unanswered = this.conditionGroups().filter(group => {
        // Skip file_upload and textarea (optional)
        if (group.type === 'file_upload' || group.type === 'textarea') return false;

        const answer = this.selectedAnswers()[group.groupID];
        return answer === undefined || answer === '' || answer === null || 
              (Array.isArray(answer) && answer.length === 0);
      });

      if (unanswered.length > 0) {
        this.alertService.error('Please complete all required questions.');
        return;
      }

      // FILE UPLOAD IS 100% OPTIONAL — NO CHECK HERE
      // User can skip even if file_upload group exists

      this.calculateValuation();
    }

    if (this.currentStep === 5) {
      if (!this.defaultAddress) {
        alert('Set a pickup address.');
        return;
      }
      if (!this.pickupDate || !this.pickupTime) {
        alert('Select pickup date and time slot.');
        return;
      }
    }
    if (this.currentStep < this.totalSteps) {
      this.currentStep++;
      // Update max step reached when moving forward
      if (this.currentStep > this.maxStepReached) {
        this.maxStepReached = this.currentStep;
      }
    }
  }


  prevStep() {
    if (this.currentStep > 1) this.currentStep--;
  }

  getProgressWidth(): string {
    return ((this.currentStep - 1) / (this.totalSteps - 1)) * 100 + '%';
  }

  goToStep(step: number) {
    // Allow jumping to any step that user has already reached
    if (step <= this.maxStepReached) {
      this.currentStep = step;
    } else {
      // Show warning if trying to skip ahead
      this.alertService.error('Please complete the current step before proceeding.');
    }
  }

  // Helper to check if a step is accessible (for UI styling)
  isStepAccessible(step: number): boolean {
    return step <= this.maxStepReached;
  }


  startOver() {
    // Reset form and return to Step 1
    this.currentStep = 1;
    this.maxStepReached = 1; // Reset max step reached
    this.applianceTypeId = '';
    this.selectedBrand = '';
    this.selectedModelId = '';
    this.notes = '';
    this.uploadedFiles = [];
    this.valuationScore = 0;
    this.valuationLabel = '';
    this.valuationWorth = 0;
    this.pickupDate = '';
    this.pickupTime = '';
  }

  submitForm() {
    // Prevent double submission
    if (this.isSubmitting) return;
    this.isSubmitting = true;

    const defaultAddr = this.defaultAddress();
    if (!defaultAddr?.id) {
      this.alertService.error('Please select a pickup address');
      this.isSubmitting = false;
      return;
    }

    // ──────────────────────────────────────────────────────────────
    // DYNAMIC SUBMISSION: Build answers array for ALL question groups
    // ──────────────────────────────────────────────────────────────
    const questionAnswers = this.conditionGroups().map(group => {
      const answer = this.selectedAnswers()[group.groupID];

      // For radio/image: single conditionID
      if (group.type === 'radio' || group.type === 'image') {
        return {
          groupID: group.groupID,
          type: group.type,
          answer: answer || null, // conditionID
          answerText: answer ? group.options.find(opt => opt.id === answer)?.description : null
        };
      }

      // For checkbox: array of conditionIDs
      if (group.type === 'checkbox') {
        return {
          groupID: group.groupID,
          type: group.type,
          answer: Array.isArray(answer) ? answer : [], // array of conditionIDs
          answerText: Array.isArray(answer)
            ? answer.map(id => group.options.find(opt => opt.id === id)?.description).filter(Boolean)
            : []
        };
      }

      // For textarea: free text
      if (group.type === 'textarea') {
        return {
          groupID: group.groupID,
          type: group.type,
          answer: answer || null,
          answerText: answer || null
        };
      }

      // For file_upload: skip (handled separately)
      return null;
    }).filter(Boolean); // Remove nulls

    // ──────────────────────────────────────────────────────────────
    // PAYLOAD — FULLY DYNAMIC
    // ──────────────────────────────────────────────────────────────
    const payload = {
      modelId: this.selectedModelId,
      addressId: defaultAddr.id,
      pickupDate: this.pickupDate,
      pickupTime: this.pickupTime,
      valuationWorth: this.valuationWorth,

      // Send all answers as structured JSON
      questionAnswers: JSON.stringify(questionAnswers)
    };

    console.log('🚀 DYNAMIC PAYLOAD →', payload);
    console.log('📋 Question Answers:', questionAnswers);

    // ──────────────────────────────────────────────────────────────
    // SUBMIT
    // ──────────────────────────────────────────────────────────────
    this.questionnaireService.submitQuestionnaire(payload, this.uploadedFiles).subscribe({
      next: () => {
        this.alertService.success('Submitted successfully!');
        this.currentStep = 6;
        this.cdr.markForCheck();
        this.isSubmitting = false;
      },
      error: (err) => {
        console.error('Submit failed:', err);
        this.alertService.error(err.error?.message || 'Submission failed. Please try again.');
        this.cdr.markForCheck();
        this.isSubmitting = false;
      }
    });
  }
}