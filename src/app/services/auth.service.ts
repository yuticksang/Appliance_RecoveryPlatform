import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, BehaviorSubject } from 'rxjs';
import { AuthService as AdminAuthService } from '../../auth/auth-service';
import { environment } from '../../environments/environment';

interface User {
  id: string; // Changed to string for new ID format (U001, S001, etc.)
  email: string;
  name: string;
  username: string;
  userType: string;
  phone?: string;
  sellerId?: string;  // For sellers: 'S001', 'S002', etc.
  buyerId?: string;   // For buyers: 'B001', 'B002', etc.
  adminId?: string;   // For admins: 'A001', 'A002', etc.
}

export interface UserProfile extends User {
  emailVerified?: boolean;
  lastLogin?: string;
  createdAt?: string;
  // Add other profile fields as needed
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private adminAuthService = inject(AdminAuthService);

  private apiUrl = environment.apiUrl + '/api';
  
  // User state
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  private userProfileSubject = new BehaviorSubject<UserProfile | null>(null);
  
  public currentUser$ = this.currentUserSubject.asObservable();
  public userProfile$ = this.userProfileSubject.asObservable();
  
  // Signals for reactive state
  isLoggedIn = signal(false);
  currentUser = signal<User | null>(null);
  userProfile = signal<UserProfile | null>(null);

  constructor() {
    // Check if user is already logged in on service initialization
    this.loadStoredAuth();
  }

  private loadStoredAuth() {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    const profile = localStorage.getItem('userProfile');

    console.log('🔍 Loading stored auth...', { hasToken: !!token, hasUser: !!user });

    if (token && user) {
      // Validate token before auto-login
      console.log('🔐 Validating token...');
      this.validateToken().subscribe({
        next: (isValid) => {
          console.log('✅ Token validation result:', isValid);
          if (isValid) {
            const userData = JSON.parse(user);
            this.currentUserSubject.next(userData);
            this.currentUser.set(userData);
            this.isLoggedIn.set(true);

            // Don't sync with admin auth service - they use separate storage now
            // this.adminAuthService.setUser(userData);

            if (profile) {
              const profileData = JSON.parse(profile);
              this.userProfileSubject.next(profileData);
              this.userProfile.set(profileData);
            }
            console.log('✅ Auto-login successful');
          } else {
            // Token is invalid, clear everything
            console.log('❌ Token invalid, clearing auth state');
            this.clearAuthState();
          }
        },
        error: (err) => {
          // Token validation failed, clear everything
          console.error('❌ Token validation error:', err);
          this.clearAuthState();
        }
      });
    } else {
      console.log('ℹ️ No stored auth data found');
    }
  }

  private clearAuthState() {
    console.log('🧹 Clearing auth state...');
    // Clear localStorage (seller-specific keys only)
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('userProfile');

    // Reset state
    this.currentUserSubject.next(null);
    this.userProfileSubject.next(null);
    this.currentUser.set(null);
    this.userProfile.set(null);
    this.isLoggedIn.set(false);

    // Don't clear admin auth service - they're separate sessions now
    // this.adminAuthService.clearUser();
    console.log('✅ Auth state cleared');
  }

  login(emailOrUsername: string, password: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/auth/login`, {
      emailOrUsername,
      password
    });
  }

  loginWithGoogle(idToken: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/auth/google`, {
      idToken
    });
  }

  setAuthData(response: any) {
    // Store in localStorage (seller-specific keys)
    localStorage.setItem('token', response.token);
    localStorage.setItem('user', JSON.stringify(response.user));

    // Also store user as profile initially (can be updated later)
    localStorage.setItem('userProfile', JSON.stringify(response.user));

    // Update observables and signals
    this.currentUserSubject.next(response.user);
    this.currentUser.set(response.user);
    this.userProfileSubject.next(response.user);
    this.userProfile.set(response.user);
    this.isLoggedIn.set(true);

    console.log('✅ Auth data set, user and profile stored');

    // Don't sync with admin auth service - they use separate storage now
    // this.adminAuthService.setUser(response.user);
  }

  validateToken(): Observable<boolean> {
    const token = this.getToken();
    if (!token) {
      return new Observable(observer => {
        observer.next(false);
        observer.complete();
      });
    }

    return new Observable(observer => {
      this.http.get<any>(`${this.apiUrl}/auth/validate`, {
        headers: this.getAuthHeaders()
      }).subscribe({
        next: () => {
          observer.next(true);
          observer.complete();
        },
        error: () => {
          observer.next(false);
          observer.complete();
        }
      });
    });
  }

  fetchProfile(): Observable<UserProfile> {
    const user = this.currentUser();
    if (!user) throw new Error('No user logged in');

    return this.http.get<UserProfile>(`${this.apiUrl}/auth/profile/${user.id}`, {
      headers: this.getAuthHeaders()
    });
  }

  setProfile(profile: UserProfile) {
    localStorage.setItem('userProfile', JSON.stringify(profile));
    this.userProfileSubject.next(profile);
    this.userProfile.set(profile);
  }

  updateProfile(updates: { name?: string; username?: string; phone?: string }): Observable<UserProfile> {
    const user = this.currentUser();
    if (!user) {
      throw new Error('No user logged in');
    }

    // Filter out undefined/null values
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, value]) => value != null && value !== '')
    );

    return this.http.put<UserProfile>(`${this.apiUrl}/auth/profile/${user.id}`, filteredUpdates, {
      headers: this.getAuthHeaders()
    });
  }

  logout() {
    console.log('🚪 Logging out...');
    // Clear storage
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('userProfile');

    // Reset state
    this.currentUserSubject.next(null);
    this.userProfileSubject.next(null);
    this.currentUser.set(null);
    this.userProfile.set(null);
    this.isLoggedIn.set(false);

    // Don't clear admin auth service - they're separate sessions now
    // this.adminAuthService.clearUser();

    console.log('✅ Logout complete, redirecting to login...');

    // Redirect to login
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    // Check for admin token first, then seller token, then buyer token
    return localStorage.getItem('admin_token') ||
           localStorage.getItem('token') ||
           localStorage.getItem('buyer_token');
  }

  // HTTP interceptor helper
  // getAuthHeaders(): HttpHeaders {
  //   const token = this.getToken();
  //   return new HttpHeaders({
  //     'Authorization': token ? `Bearer ${token}` : '',
  //     'Content-Type': 'application/json'
  //   });
  // }

  // GOOD — Only add Authorization, NEVER Content-Type
  getAuthHeaders(): HttpHeaders {
    const token = this.getToken();
    return new HttpHeaders({
      Authorization: token ? `Bearer ${token}` : ''
      // DO NOT set Content-Type here!
    });
  }
  // Address methods
  getAddresses(userId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/addresses/${userId}`, {
      headers: this.getAuthHeaders()
    });
  }

  createAddress(userId: string, address: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/addresses/${userId}`, address, {
      headers: this.getAuthHeaders()
    });
  }

  updateAddress(userId: string, addressId: string, address: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/addresses/${userId}/${addressId}`, address, {
      headers: this.getAuthHeaders()
    });
  }

  deleteAddress(userId: string, addressId: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/addresses/${userId}/${addressId}`, {
      headers: this.getAuthHeaders()
    });
  }

  setDefaultAddress(userId: string, addressId: string): Observable<any> {
    return this.http.patch<any>(
      `${this.apiUrl}/addresses/${userId}/${addressId}/default`,
      {},
      { headers: this.getAuthHeaders() }
    );
  }

  // Bank methods
  getBankDetails(userId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/bank/${userId}`, {
      headers: this.getAuthHeaders()
    });
  }

  createBankDetails(userId: string, bank: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/bank/${userId}`, bank, {
      headers: this.getAuthHeaders()
    });
  }

  updateBankDetails(userId: string, bank: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/bank/${userId}`, bank, {
      headers: this.getAuthHeaders()
    });
  }

  deleteBankDetails(userId: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/bank/${userId}`, {
      headers: this.getAuthHeaders()
    });
  }

  // Backward-compatible methods for components using the old API
  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  getCurrentUserId(): string | null {
    return this.currentUserSubject.value?.id || null;
  }

  /**
   * Get the seller ID for the current user (e.g., 'S001')
   * Returns null if user is not a seller or not logged in
   */
  getSellerId(): string | null {
    const user = this.currentUserSubject.value;
    if (!user || user.userType !== 'seller') {
      return null;
    }
    return user.sellerId || null;
  }

  /**
   * Get the buyer ID for the current user (e.g., 'B001')
   * Returns null if user is not a buyer or not logged in
   */
  getBuyerId(): string | null {
    const user = this.currentUserSubject.value;
    if (!user || user.userType !== 'buyer') {
      return null;
    }
    return user.buyerId || null;
  }

  /**
   * Get the admin ID for the current user (e.g., 'A001')
   * Returns null if user is not an admin or not logged in
   */
  getAdminId(): string | null {
    const user = this.currentUserSubject.value;
    if (!user || (user.userType !== 'admin' && user.userType !== 'superadmin')) {
      return null;
    }
    return user.adminId || null;
  }

  setCurrentUser(user: User | null): void {
    this.currentUserSubject.next(user);
    this.currentUser.set(user);
    if (user) {
      this.isLoggedIn.set(true);
      localStorage.setItem('user', JSON.stringify(user));
    } else {
      this.isLoggedIn.set(false);
      localStorage.removeItem('user');
    }
  }
}
