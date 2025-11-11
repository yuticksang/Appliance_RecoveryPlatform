import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

interface Address {
  recipient: string;
  phone: string;
  address: string;
  isDefault?: boolean;
}

@Component({
  selector: 'app-questionnaires',
  templateUrl: './questionnaires.html',
  styleUrls: ['./questionnaires.scss'],
  standalone: true, 
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
})
export class QuestionnairesComponent {
  // Step tracking
  currentStep: number = 1;
  totalSteps: number = 5;

  steps: number[] = [1, 2, 3, 4, 5];


  // Step 1 - Appliance Type
  applianceType: string = '';
  applianceTypes: string[] = ['Washing Machine', 'Refrigerator', 'Microwave', 'Air Conditioner', 'Television'];

  // Step 2 - Appliance Details
  selectedBrand: string = '';
  selectedModel: string = '';
  brands: string[] = ['Samsung', 'Panasonic', 'LG', 'Toshiba', 'Sharp'];
  models: string[] = ['Model A', 'Model B', 'Model C', 'Model D'];
  years: string[] = ['2019', '2020', '2021', '2022', '2023', '2024'];
  
  brandModelMap: Record<string, string[]> = {
  Samsung: ['EcoBubble X10', 'QuickDrive Q8', 'TwinWash S5'],
  Panasonic: ['PrimeFresh A500', 'Econavi X12', 'Nanoe Y8'],
  LG: ['InverterCool Z9', 'TurboWash V7', 'SmartDry P3'],
  Toshiba: ['UltraWash D6', 'MagicCool T5', 'PureSteam N7'],
  Sharp: ['AquaMagic X1', 'Plasmacluster S9', 'J-Tech U6']
};


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
    { id: 'a', label: 'Like New', img: 'assets/images/like-new.jpg' },
    { id: 'b', label: 'Minor Scratches', img: 'assets/images/minor-scratches.jpg' },
    { id: 'c', label: 'Missing Parts', img: 'assets/images/missing-parts.jpg' },
    { id: 'd', label: 'Heavily Damaged', img: 'assets/images/heavily-damaged.jpg' },
    { id: 'e', label: 'Rust or Corrosion', img: 'assets/images/rust.jpg' }
  ];

  // Step 4 - Valuation
  valuationScore: number = 0;
  valuationLabel: string = '';
  valuationWorth: number = 0;

  // Step 5 - Pickup
  addresses: Address[] = [];
  defaultAddress: Address | null = null;

  // Modal state
  showAddressModal = false;
  showAddressForm = false;
  editingAddressIndex: number | null = null;
  selectedAddressIndex: number | null = null;
  defaultAddressIndex: number | null = null; // Tracks default in modal

  // Temp form (NO COUNTRY)
  tempAddress = {
    recipient: '',
    phone: '',        
    state: '',
    city: '',
    zipCode: '',
    pickupAddress: '',
    isDefault: false 
  };

  pickupDate = '';
  pickupTime = '';
  timeSlots = [
    '10:00 AM - 12:00 PM',
    '12:00 PM - 2:00 PM',
    '2:00 PM - 4:00 PM',
    '4:00 PM - 6:00 PM',
    '6:00 PM - 8:00 PM'
  ];

  onBrandChange() {
  this.selectedModel = '';
  this.models = this.brandModelMap[this.selectedBrand] || [];
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
    for (const file of newFiles) {
      // Check maximum number of uploads
      if (this.uploadedFiles.length >= this.maxFiles) {
        alert(`You can only upload up to ${this.maxFiles} photos.`);
        return;
      }

      // Check file type
      if (!this.allowedTypes.includes(file.type)) {
        alert(`"${file.name}" is not a valid image. Only JPG, PNG, or WEBP are allowed.`);
        continue;
      }

      // Check file size
      const sizeMB = file.size / (1024 * 1024);
      if (sizeMB > this.maxSizeMB) {
        alert(`"${file.name}" is too large (${sizeMB.toFixed(1)} MB). Max allowed size is ${this.maxSizeMB} MB.`);
        continue;
      }

      // Add valid file
      this.uploadedFiles.push(file);
    }
  }

  removeFile(index: number) {
    this.uploadedFiles.splice(index, 1);
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
    this.loadFromStorage();
  }

  openAddressManager() {
    this.showAddressModal = true;
    this.showAddressForm = false;
  }

  closeAddressManager() {
    this.showAddressModal = false;
    this.showAddressForm = false;
    this.editingAddressIndex = null;
    this.resetTempAddress();
  }

  startAddAddress() {
    this.editingAddressIndex = null;
    this.resetTempAddress();
    this.showAddressForm = true;
  }

  startEditAddress(index: number) {
    this.editingAddressIndex = index;
    const addr = this.addresses[index];
    const parts = addr.address.split(', ');
    this.tempAddress = {
      recipient: addr.recipient,
      phone: addr.phone,
      state: parts[parts.length - 1] || '',
      city: parts[parts.length - 2]?.split(' ')[1] || '',
      zipCode: parts[parts.length - 2]?.split(' ')[0] || '',
      pickupAddress: parts.slice(0, -2).join(', ') || '',
      isDefault: addr.isDefault || false
    };
    this.showAddressForm = true;
  }

  saveTempAddress() {
    const { recipient, phone, state, city, zipCode, pickupAddress, isDefault } = this.tempAddress;

    if (!recipient || !phone || !state || !city || !zipCode || !pickupAddress) {
      alert('Please fill all fields.');
      return;
    }

    const cleanPhone = phone.replace(/\D/g, '');
    if (!cleanPhone.match(/^(\+?60|0)[1-9]\d{8,9}$/)) {
      alert('Please enter a valid Malaysian phone number (e.g. +60123456789 or 0123456789).');
      return;
    }

    const fullAddress = `${pickupAddress}, ${zipCode} ${city}, ${state}`;
    const formattedPhone = phone.startsWith('+') ? phone : `+60${cleanPhone.replace(/^0/, '')}`;

    const addressData: Address = {
      recipient,
      phone: formattedPhone,
      address: fullAddress,
      isDefault
    };

    if (this.editingAddressIndex === null) {
      // ADD NEW
      this.addresses.push(addressData);
    } else {
      // EDIT EXISTING
      this.addresses[this.editingAddressIndex] = addressData;
    }

    // ENFORCE ONLY ONE DEFAULT
    if (isDefault) {
      this.addresses.forEach((a, i) => {
        if (i !== (this.editingAddressIndex ?? this.addresses.length - 1)) {
          a.isDefault = false;
        }
      });
    }

    this.saveToStorage();
    this.updateDefaultAddress();
    this.showAddressForm = false;
    this.resetTempAddress();
  }

  cancelAddressForm() {
    this.showAddressForm = false;
    this.editingAddressIndex = null;
    this.resetTempAddress();
  }

  deleteAddress(index: number) {
    if (confirm('Delete this address?')) {
      this.addresses.splice(index, 1);
      this.saveToStorage();
      this.updateDefaultAddress();
    }
  }

  updateDefaultAddress() {
    this.defaultAddress = this.addresses.find(a => a.isDefault) ?? null;
  }

  confirmAddressSelection() {
    if (this.selectedAddressIndex === null) {
      alert('Please select an address.');
      return;
    }
    this.closeAddressManager();
  }

  setDefaultAddress(index: number) {
    if (index < 0 || index >= this.addresses.length) return;
    // mark only the chosen address as default
    this.addresses.forEach((a, i) => a.isDefault = i === index);
    // update modal tracking and visible default
    this.defaultAddressIndex = index;
    this.defaultAddress = this.addresses[index];
    // persist changes
    this.saveToStorage();
  }

  private saveToStorage() {
    localStorage.setItem('pickupAddresses', JSON.stringify(this.addresses));
  }

  private loadFromStorage() {
    const raw = localStorage.getItem('pickupAddresses');
    if (raw) {
      this.addresses = JSON.parse(raw);
      // Ensure at least one default if exists
      if (this.addresses.length > 0 && !this.addresses.some(a => a.isDefault)) {
        this.addresses[0].isDefault = true;
      }
      this.updateDefaultAddress();
    }
  }

  private resetTempAddress() {
    this.tempAddress = {
      recipient: '',
      phone: '',
      state: '',
      city: '',
      zipCode: '',
      pickupAddress: '',
      isDefault: false
    };
  }

  nextStep() {
    // Step 1 validation
    if (this.currentStep === 1 && !this.applianceType) {
      alert('Please select an appliance type.');
      return;
    }

    // Step 2 validation
    if (this.currentStep === 2) {
      if (!this.selectedBrand || !this.selectedModel) {
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
    this.applianceType = '';
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
    console.log('SUBMITTED', {
      applianceType: this.applianceType,
      brand: this.selectedBrand,
      model: this.selectedModel,
      workingStatus: this.workingStatus,
      issues: this.selectedIssues,
      physical: this.physicalCondition,
      notes: this.notes,
      photos: this.uploadedFiles.map(f => f.name),
      pickup: { date: this.pickupDate, time: this.pickupTime, address: this.defaultAddress },
      worth: this.valuationWorth,
    });

    this.currentStep = 6;
  }
}