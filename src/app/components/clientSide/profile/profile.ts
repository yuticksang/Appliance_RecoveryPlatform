import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';

interface Address {
  id?: number;
  name: string;
  phone: string;
  state: string;
  city: string;
  zip: string;
  pickup: string;
}

interface BankDetails {
  id?: number;
  bankName: string;
  holderName: string;
  accountNumber: string;
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './profile.html',
  styleUrls: ['./profile.scss']
})
export class ProfileComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);

  loading = false;
  error = '';
  success = '';
  
  // Signals for reactive state
  addresses = signal<Address[]>([]);
  bank = signal<BankDetails | null>(null);
  showAddressModal = signal(false);
  showBankModal = signal(false);
  editingAddressId = signal<number | null>(null);

  // Custom modal signals
  showSuccessModal = signal(false);
  successMessage = signal('');
  showConfirmModal = signal(false);
  confirmMessage = signal('');
  confirmCallback: (() => void) | null = null;
  
  // Access auth service signals
  userProfile = this.authService.userProfile;
  currentUser = this.authService.currentUser;

  // Forms
  profileForm: FormGroup;
  addressForm: FormGroup;
  bankForm: FormGroup;

  constructor() {
    // Initialize forms
    this.profileForm = this.fb.group({
      firstName: ['', [Validators.required]],
      lastName: ['', [Validators.required]],
      email: [{value: '', disabled: true}],
      phone: ['', [Validators.required]]
    });

    this.addressForm = this.fb.group({
      name: ['', [Validators.required]],
      phone: ['', [Validators.required]],
      state: ['', [Validators.required]],
      city: ['', [Validators.required]],
      zip: ['', [Validators.required]],
      pickup: ['', [Validators.required]]
    });

    this.bankForm = this.fb.group({
      bankName: ['', [Validators.required]],
      holderName: ['', [Validators.required]],
      accountNumber: ['', [Validators.required]]
    });
  }

  ngOnInit() {
    this.loadProfileData();
    this.loadAddresses();
    this.loadBankDetails();
  }

  // Profile methods
  loadProfileData() {
    const profile = this.userProfile();
    if (profile) {
      // Split full name into first and last name
      const nameParts = profile.name.split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      this.profileForm.patchValue({
        firstName: firstName,
        lastName: lastName,
        email: profile.email,
        phone: profile.phone || ''
      });
    }
  }

  saveProfile() {
    if (this.profileForm.invalid) return;

    this.loading = true;
    this.error = '';
    this.success = '';

    const formValues = this.profileForm.value;
    const updates = {
      name: `${formValues.firstName} ${formValues.lastName}`.trim(),
      phone: formValues.phone
    };

    this.authService.updateProfile(updates).subscribe({
      next: (updatedProfile) => {
        this.authService.setProfile(updatedProfile);
        this.success = 'Profile updated successfully!';
        this.loading = false;
        setTimeout(() => this.success = '', 3000);
      },
      error: (err) => {
        this.error = err.error?.message || 'Failed to update profile';
        this.loading = false;
        console.error('Update profile error:', err);
      }
    });
  }

  // Address methods
  loadAddresses() {
    const user = this.currentUser();
    if (!user) return;

    // TODO: Replace with actual API call
    this.authService.getAddresses(user.id).subscribe({
      next: (addresses) => {
        this.addresses.set(addresses);
      },
      error: (err) => {
        console.error('Failed to load addresses:', err);
      }
    });
  }

  openAddressModal() {
    this.addressForm.reset();
    this.editingAddressId.set(null);
    this.showAddressModal.set(true);
  }

  closeAddressModal() {
    this.showAddressModal.set(false);
    this.editingAddressId.set(null);
    this.addressForm.reset();
  }

  editAddress(address: Address) {
    this.addressForm.patchValue(address);
    this.editingAddressId.set(address.id || null);
    this.showAddressModal.set(true);
  }

  saveAddressInline() {
    if (this.addressForm.invalid) return;

    const addressData = this.addressForm.value as Address;

    // Add to addresses array
    this.addresses.update(addresses => [...addresses, { ...addressData, id: Date.now() }]);

    // Reset form
    this.addressForm.reset();

    console.log('Address saved:', addressData);
    this.showSuccessMessage('Address saved successfully!');
  }

  saveAddressFromModal() {
    if (this.addressForm.invalid) return;

    const addressData = this.addressForm.value as Address;
    const editingId = this.editingAddressId();
    const user = this.currentUser();
    if (!user) return;

    this.loading = true;

    if (editingId) {
      // Update existing address
      this.authService.updateAddress(user.id, editingId, addressData).subscribe({
        next: (updatedAddress) => {
          this.addresses.update(addresses =>
            addresses.map(addr => addr.id === editingId ? updatedAddress : addr)
          );
          this.closeAddressModal();
          this.success = 'Address updated successfully!';
          this.loading = false;
          setTimeout(() => this.success = '', 3000);
        },
        error: (err) => {
          this.error = 'Failed to update address';
          this.loading = false;
          console.error('Update address error:', err);
        }
      });
    } else {
      // Add new address
      this.authService.createAddress(user.id, addressData).subscribe({
        next: (newAddress) => {
          this.addresses.update(addresses => [...addresses, newAddress]);
          this.closeAddressModal();
          this.success = 'Address added successfully!';
          this.loading = false;
          setTimeout(() => this.success = '', 3000);
        },
        error: (err) => {
          this.error = 'Failed to add address';
          this.loading = false;
          console.error('Add address error:', err);
        }
      });
    }
  }

  deleteAddress(id: number) {
    this.showConfirmDialog('Are you sure you want to delete this address?', () => {
      const user = this.currentUser();
      if (!user) return;

      this.loading = true;

      this.authService.deleteAddress(user.id, id).subscribe({
        next: () => {
          this.addresses.update(addresses => addresses.filter(addr => addr.id !== id));
          this.success = 'Address deleted successfully!';
          this.loading = false;
          setTimeout(() => this.success = '', 3000);
        },
        error: (err) => {
          this.error = 'Failed to delete address';
          this.loading = false;
          console.error('Delete address error:', err);
        }
      });
    });
  }

  // Bank methods
  loadBankDetails() {
    const user = this.currentUser();
    if (!user) return;

    this.authService.getBankDetails(user.id).subscribe({
      next: (bank) => {
        this.bank.set(bank);
      },
      error: (err) => {
        console.error('Failed to load bank details:', err);
        this.bank.set(null);
      }
    });
  }

  openBankModal() {
    const currentBank = this.bank();
    if (currentBank) {
      this.bankForm.patchValue(currentBank);
    } else {
      this.bankForm.reset();
    }
    this.showBankModal.set(true);
  }

  closeBankModal() {
    this.showBankModal.set(false);
    this.bankForm.reset();
  }

  saveBankInline() {
    if (this.bankForm.invalid) return;

    const bankData = this.bankForm.value as BankDetails;
    this.bank.set({ ...bankData, id: Date.now() });

    // Reset form
    this.bankForm.reset();

    console.log('Bank details saved:', bankData);
    this.showSuccessMessage('Bank details saved successfully!');
  }

  saveBankFromModal() {
    if (this.bankForm.invalid) return;

    const bankData = this.bankForm.value as BankDetails;
    const currentBank = this.bank();
    const user = this.currentUser();
    if (!user) return;

    this.loading = true;

    if (currentBank?.id) {
      // Update existing bank
      this.authService.updateBankDetails(user.id, bankData).subscribe({
        next: (updatedBank) => {
          this.bank.set(updatedBank);
          this.closeBankModal();
          this.success = 'Bank details updated successfully!';
          this.loading = false;
          setTimeout(() => this.success = '', 3000);
        },
        error: (err) => {
          this.error = 'Failed to update bank details';
          this.loading = false;
          console.error('Update bank error:', err);
        }
      });
    } else {
      // Create new bank
      this.authService.createBankDetails(user.id, bankData).subscribe({
        next: (newBank) => {
          this.bank.set(newBank);
          this.closeBankModal();
          this.success = 'Bank details added successfully!';
          this.loading = false;
          setTimeout(() => this.success = '', 3000);
        },
        error: (err) => {
          this.error = 'Failed to add bank details';
          this.loading = false;
          console.error('Add bank error:', err);
        }
      });
    }
  }

  deleteBank() {
    this.showConfirmDialog('Are you sure you want to delete your bank details?', () => {
      const user = this.currentUser();
      if (!user) return;

      this.loading = true;

      this.authService.deleteBankDetails(user.id).subscribe({
        next: () => {
          this.bank.set(null);
          this.success = 'Bank details deleted successfully!';
          this.loading = false;
          setTimeout(() => this.success = '', 3000);
        },
        error: (err) => {
          this.error = 'Failed to delete bank details';
          this.loading = false;
          console.error('Delete bank error:', err);
        }
      });
    });
  }

  // Utility methods
  logout() {
    this.showConfirmDialog('Are you sure you want to logout?', () => {
      this.authService.logout();
    });
  }

  // Modal utility methods
  showSuccessMessage(message: string) {
    this.successMessage.set(message);
    this.showSuccessModal.set(true);
  }

  closeSuccessModal() {
    this.showSuccessModal.set(false);
    this.successMessage.set('');
  }

  showConfirmDialog(message: string, callback: () => void) {
    this.confirmMessage.set(message);
    this.confirmCallback = callback;
    this.showConfirmModal.set(true);
  }

  confirmAction() {
    if (this.confirmCallback) {
      this.confirmCallback();
      this.confirmCallback = null;
    }
    this.closeConfirmModal();
  }

  closeConfirmModal() {
    this.showConfirmModal.set(false);
    this.confirmMessage.set('');
    this.confirmCallback = null;
  }
}
