import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { AlertService } from '../../../services/alert.service';

type Address = {
  id: number;
  name: string;
  phone: string;
  pickup: string;  // full address line
  city: string;
  state: string;
  zip: string;
};

type Bank = {
  bankName: string;
  holderName: string;
  accountNumber: string;
};

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './profile.html',
  styleUrls: ['./profile.scss']
})
export class ProfileComponent {
  private alertService = inject(AlertService);
  private router = inject(Router);

  // Declare form groups
  profileForm!: FormGroup;
  addressForm!: FormGroup;
  bankForm!: FormGroup;

  // Reactive signals
  addresses = signal<Address[]>([]);
  bank = signal<Bank | null>(null);
  showAddressModal = signal(false);
  showBankModal = signal(false);
  editingAddressId = signal<number | null>(null);

  constructor(private fb: FormBuilder) {
    // ✅ Initialize forms inside constructor so fb exists
    this.profileForm = this.fb.group({
      firstName: ['SHI YING', [Validators.required, Validators.minLength(2)]],
      lastName: ['CHUA', [Validators.required, Validators.minLength(2)]],
      email: ['chuasy-wm21@student.tarc.edu.my', [Validators.required, Validators.email]],
      phone: ['+60123456789', [Validators.required]],
    });

    this.addressForm = this.fb.group({
      id: [0],
      name: ['', Validators.required],
      phone: ['', Validators.required],
      state: ['', Validators.required],
      city: ['', Validators.required],
      zip: ['', Validators.required],
      pickup: ['', Validators.required],
    });

    this.bankForm = this.fb.group({
      bankName: ['', Validators.required],
      holderName: ['', Validators.required],
      accountNumber: ['', Validators.required],
    });
  }
  
  // Profile
  saveProfile() {
    if (this.profileForm.invalid) return;
    console.log('Profile Saved:', this.profileForm.value);
    this.alertService.success('Profile updated successfully!');
  }

  // Address helpers
  openAddressModal(addr?: Address) {
    this.editingAddressId.set(addr?.id ?? null);
    this.addressForm.reset({
      id: addr?.id ?? 0,
      name: addr?.name ?? '',
      phone: addr?.phone ?? '',
      state: addr?.state ?? '',
      city: addr?.city ?? '',
      zip: addr?.zip ?? '',
      pickup: addr?.pickup ?? '',
    });
    this.showAddressModal.set(true);
  }
  closeAddressModal() { this.showAddressModal.set(false); }

  saveAddressFromModal() {
    if (this.addressForm.invalid) return;
    const v = this.addressForm.value as Address;
    if (this.editingAddressId()) {
      this.addresses.update(list => list.map(a => a.id === v.id ? v : a));
      this.alertService.success('Address updated successfully!');
    } else {
      const nextId = (this.addresses().at(-1)?.id ?? 0) + 1;
      this.addresses.update(list => [...list, { ...v, id: nextId }]);
      this.alertService.success('Address added successfully!');
    }
    this.closeAddressModal();
  }

  saveAddressInline() {
    if (this.addressForm.invalid) return;
    const v = this.addressForm.value as Address;
    const nextId = (this.addresses().at(-1)?.id ?? 0) + 1;
    this.addresses.update(list => [...list, { ...v, id: nextId }]);
    this.alertService.success('Address added successfully!');
    this.addressForm.reset();
  }

  editAddress(a: Address) { this.openAddressModal(a); }
  removeAddress(id: number) {
    this.addresses.update(list => list.filter(a => a.id !== id));
  }

  // Bank helpers
  openBankModal() {
    const b = this.bank();
    this.bankForm.reset({
      bankName: b?.bankName ?? '',
      holderName: b?.holderName ?? '',
      accountNumber: b?.accountNumber ?? '',
    });
    this.showBankModal.set(true);
  }
  closeBankModal() { this.showBankModal.set(false); }

  saveBankFromModal() {
    if (this.bankForm.invalid) return;
    const isUpdate = !!this.bank();
    this.bank.set(this.bankForm.value as Bank);
    this.alertService.success(isUpdate ? 'Bank details updated successfully!' : 'Bank details added successfully!');
    this.closeBankModal();
  }

  saveBankInline() {
    if (this.bankForm.invalid) return;
    this.bank.set(this.bankForm.value as Bank);
    this.alertService.success('Bank details added successfully!');
  }

  // Logout
  logout() {
    this.alertService.success('Logged out successfully!');
    this.router.navigate(['/login']);
  }
}
