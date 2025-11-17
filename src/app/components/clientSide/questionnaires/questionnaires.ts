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

  steps: number[] = [1, 2, 3, 4, 5];

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
  

  // Step 3 - Condition Questionnaires
  workingStatus: string = 'Partially working';
  selectedIssues: string[] = [];
  physicalCondition: string = '';
  notes: string = '';
  uploadedFiles: File[] = [];

  issues: string[] = [
    'Unusual sounds',
    'Machine draining and spinning properly',
    'Buttons, controls, and settings working correctly',
    'Water leaking'
  ];

  physicalOptions = [
    { id: 'a', label: 'Like New', img: '../../../assets/image/like-new.png' },
    { id: 'b', label: 'Minor Scratches', img: '../../../assets/image/minor-scratches.png' },
    { id: 'c', label: 'Missing Parts', img: '../../../assets/image/missing-parts.png' },
    { id: 'd', label: 'Heavily Damaged', img: '../../../assets/image/heavily-damaged.png' },
    { id: 'e', label: 'Rust or Corrosion', img: '../../../assets/image/rust.png' }
  ];

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

  // Methods
  toggleIssue(issue: string) {
    if (this.selectedIssues.includes(issue)) {
      this.selectedIssues = this.selectedIssues.filter(i => i !== issue);
    } else {
      this.selectedIssues.push(issue);
    }
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
    for (const file of newFiles) {
      if (this.uploadedFiles.length >= this.maxFiles) break;
      if (!this.allowedTypes.includes(file.type)) continue;
      if (file.size / (1024 * 1024) > this.maxSizeMB) continue;
      valid.push(file);
    }

    this.uploadedFiles = [...this.uploadedFiles, ...valid];
    this.cdr.markForCheck();   // ← BEST with OnPush
  }

  removeFile(index: number) {
    this.uploadedFiles = this.uploadedFiles.filter((_, i) => i !== index);
    this.cdr.markForCheck();
  }

  getFileUrl(file: File): string {
    return URL.createObjectURL(file);
  }

  calculateValuation() {
    let score = 0;

    // Working status
    if (this.workingStatus === 'Fully working') score += 40;
    else if (this.workingStatus === 'Partially working') score += 25;
    else score += 10;

    // Component issues
    if (this.selectedIssues.includes('None of the above')) score += 30;
    else score += Math.max(0, 30 - this.selectedIssues.length * 5);

    // Physical condition
    switch (this.physicalCondition) {
      case 'Like New':
        score += 30;
        break;
      case 'Minor Scratches':
        score += 25;
        break;
      case 'Missing Parts':
        score += 15;
        break;
      case 'Heavily Damaged':
        score += 10;
        break;
      case 'Rust or Corrosion':
        score += 5;
        break;
      default:
        score += 0;
    }

    // Clamp score to 100
    this.valuationScore = Math.min(score, 100);

    // Label
    if (this.valuationScore >= 85) this.valuationLabel = 'Excellent';
    else if (this.valuationScore >= 70) this.valuationLabel = 'Good';
    else if (this.valuationScore >= 50) this.valuationLabel = 'Fair';
    else this.valuationLabel = 'Poor';

    // Worth in RM (mock logic)
    this.valuationWorth = Math.round((this.valuationScore / 100) * 1500); // Example base value = RM1500
  }


  ngOnInit() {
    console.log('User:', this.currentUser());
    this.loadCategories(); // load actual types from backend
  }

  set currentStep(value: number) {
    this._currentStep = value;
    if (value === 5 && this.addresses().length === 0) {
      console.log('STEP 5: Loading addresses...');
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

    this.questionnaireService.getModelsByBrand(this.selectedBrandId).subscribe({
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
      alert('Please select an appliance type.');
      return;
    }

    // Step 2 validation
    if (this.currentStep === 2) {
      if (!this.selectedBrandId || !this.selectedModelId) {
        alert('Please fill in all appliance details before continuing.');
        return;
      }
    }

    // Step 3 validation (ensure physical condition and working status selected)
    if (this.currentStep === 3) {
      if (!this.workingStatus || !this.physicalCondition) {
        alert('Please answer all required questions.');
        return;
      }
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
    if (this.currentStep < this.totalSteps) this.currentStep++;
  }


  prevStep() {
    if (this.currentStep > 1) this.currentStep--;
  }

  getProgressWidth(): string {
    return ((this.currentStep - 1) / (this.totalSteps - 1)) * 100 + '%';
  }

  goToStep(step: number) {
    // Optional: prevent jumping forward to unfinished steps
    if (step <= this.currentStep) {
      this.currentStep = step;
    }
  }


  startOver() {
    // Reset form and return to Step 1
    this.currentStep = 1;
    this.applianceTypeId = '';
    this.selectedBrand = '';
    this.selectedModel = '';
    this.workingStatus = 'Partially working';
    this.selectedIssues = [];
    this.physicalCondition = '';
    this.notes = '';
    this.uploadedFiles = [];
    this.valuationScore = 0;
    this.valuationLabel = '';
    this.valuationWorth = 0;
    this.pickupDate = '';
    this.pickupTime = '';
  }

  submitForm() {
    const user = this.currentUser();
    const defaultAddr = this.defaultAddress();

    if (!user || !defaultAddr?.id) {
      this.alertService.error('Please log in and select address');
      return;
    }

    const payload = {
      modelId: this.selectedModelId,           // ← applianceID
      workingStatus: this.workingStatus,
      physicalCondition: this.physicalCondition,
      notes: this.notes || null,
      addressId: defaultAddr.id,
      valuationWorth: this.valuationWorth,
      issues: JSON.stringify(this.selectedIssues),
      pickupDate: this.pickupDate,
      pickupTime: this.pickupTime
    };

    console.log('PAYLOAD →', payload);

    this.questionnaireService.submitQuestionnaire(payload, this.uploadedFiles).subscribe({
      next: (res) => {
        this.alertService.success('Submitted!');
        this.currentStep = 6;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Submit failed:', err);
        this.alertService.error(err.error?.message || 'Failed');
      }
    });
  }
}