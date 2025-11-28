import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { delay, map, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

export interface Transaction {
  id: string; // Transaction ID is always varchar in database (e.g., "TXN001")
  sellerId: string; // Seller ID is always varchar in database (e.g., "S001")
  sellerName: string;
  image: string;
  brand: string;
  category: string;
  model: string;
  modelName: string;
  transactionStatus: 'Pending Payment' | 'Completed' | 'Returned' | 'Rejected' | 'Cancelled' | 'Awaiting Confirmation' | 'Under Review' | 'Picked Up' | 'Confirmed';
  itemStatus: 'Picked Up' | 'Returned' | 'Awaiting Picked Up' | 'Awaiting Pick Up' | 'Pending Further Action' | 'Unresponded' | 'Awaiting Return';
  submittedDate: Date;
  estimatedPrice?: number;
  finalPrice?: number;
  note?: string; // Note
}

@Injectable({
  providedIn: 'root'
})
export class TransactionService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl + '/api';
  private auth = inject(AuthService);

  constructor() {}

  /**
   * Get the authentication token (supports both seller and admin tokens)
   */
  private getAuthToken(): string | null {
    // Check for admin token first if admin is logged in
    const adminUser = localStorage.getItem('admin_user');
    const adminToken = localStorage.getItem('admin_token');
    const sellerToken = localStorage.getItem('token');

    // If admin is logged in, use admin token
    if (adminUser && adminToken) {
      return adminToken;
    }
    // Otherwise use seller/buyer token
    return sellerToken;
  }

  /**
   * Get transactions for a specific seller from the backend API
   * @param sellerId - The seller ID (e.g., 'S001', 'S002')
   */
  getTransactionsBySeller(sellerId: string): Observable<Transaction[]> {
    const token = this.getAuthToken();
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

    return this.http.get<Transaction[]>(`${this.apiUrl}/transactions/seller/${sellerId}`, { headers: this.auth.getAuthHeaders() })
      .pipe(
        map((transactions: any[]) => {
          // Transform backend data to frontend Transaction interface
          return transactions.map(t => ({
            id: t.id || t.transactionID,
            sellerId: t.sellerId || t.sellerID,
            sellerName: t.sellerName || 'Unknown',
            image: t.image || t.imageUrl || 'assets/image/placeholder-appliance.png',
            brand: t.brand || '',
            category: t.category || '',
            model: t.model || '',
            modelName: t.modelName || t.model_name || '',
            transactionStatus: t.transactionStatus || t.transaction_status || 'Under Review',
            itemStatus: t.itemStatus || t.item_status || 'Awaiting Pick Up',
            submittedDate: new Date(t.submittedDate || t.submissionDate || t.createdAt),
            estimatedPrice: t.estimatedPrice || t.initialOfferPrice || 0,
            finalPrice: t.finalPrice || t.finalOfferPrice,
            note: t.note || ''
          }));
        }),
        catchError(error => {
          console.error('Error fetching transactions:', error);
          return of([]);
        })
      );
  }

  /**
   * Get all transactions (admin view)
   */
  getAllTransactions(): Observable<Transaction[]> {
    const token = this.getAuthToken();
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

    return this.http.get<Transaction[]>(`${this.apiUrl}/transactions`, { headers })
      .pipe(
        map((transactions: any[]) => {
          return transactions.map(t => ({
            id: t.id || t.transactionID,
            sellerId: t.sellerId || t.sellerID,
            sellerName: t.sellerName || 'Unknown',
            image: t.image || t.imageUrl || 'assets/image/placeholder-appliance.png',
            brand: t.brand || '',
            category: t.category || '',
            model: t.model || '',
            modelName: t.modelName || t.model_name || '',
            transactionStatus: t.transactionStatus || t.transaction_status || 'Under Review',
            itemStatus: t.itemStatus || t.item_status || 'Awaiting Pick Up',
            submittedDate: new Date(t.submittedDate || t.submissionDate || t.createdAt),
            estimatedPrice: t.estimatedPrice || t.initialOfferPrice || 0,
            finalPrice: t.finalPrice || t.finalOfferPrice,
            note: t.note || ''
          }));
        }),
        catchError(error => {
          console.error('Error fetching all transactions:', error);
          return of([]);
        })
      );
  }

  /**
   * Create a new transaction (when seller submits trade-in questionnaire)
   */
  createTransaction(transaction: Partial<Transaction>): Observable<Transaction> {
    const token = this.getAuthToken();
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

    return this.http.post<any>(`${this.apiUrl}/transactions`, transaction, { headers })
      .pipe(
        map(t => ({
          id: t.id || t.transactionID,
          sellerId: t.sellerId || t.sellerID,
          sellerName: t.sellerName || 'Unknown',
          image: t.image || t.imageUrl || 'assets/image/placeholder-appliance.png',
          brand: t.brand || '',
          category: t.category || '',
          model: t.model || '',
          modelName: t.modelName || t.model_name || '',
          transactionStatus: t.transactionStatus || 'Under Review',
          itemStatus: t.itemStatus || 'Awaiting Pick Up',
          submittedDate: new Date(t.submittedDate || t.submissionDate || t.createdAt),
          estimatedPrice: t.estimatedPrice || t.initialOfferPrice,
          finalPrice: t.finalPrice || t.finalOfferPrice,
          note: t.note
        })),
        catchError(error => {
          console.error('Error creating transaction:', error);
          throw error;
        })
      );
  }
  /**
   * Get a single transaction by ID with full details
   */
  getTransactionById(transactionId: string | number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/transactions/${transactionId}`, { headers: this.auth.getAuthHeaders() })
      .pipe(
        catchError(error => {
          console.error('Error fetching transaction by ID:', error);
          throw error;
        })
      );
  }

  /**
   * Update transaction status (admin action or status change)
   */
  updateTransactionStatus(
    transactionId: string | number,
    transactionStatus: Transaction['transactionStatus'],
    itemStatus?: Transaction['itemStatus']
  ): Observable<Transaction> {
    const token = this.getAuthToken();
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

    const updateData: any = { transactionStatus };
    if (itemStatus) {
      updateData.itemStatus = itemStatus;
    }

    return this.http.put<any>(`${this.apiUrl}/transactions/${transactionId}/status`, updateData, { headers })
      .pipe(
        map(t => ({
          id: t.id || t.transactionID,
          sellerId: t.sellerId || t.sellerID,
          sellerName: t.sellerName || 'Unknown',
          image: t.image || t.imageUrl || 'assets/image/placeholder-appliance.png',
          brand: t.brand || '',
          category: t.category || '',
          model: t.model || '',
          modelName: t.modelName || t.model_name || '',
          transactionStatus: t.transactionStatus || transactionStatus,
          itemStatus: t.itemStatus || itemStatus || 'Awaiting Pick Up',
          submittedDate: new Date(t.submittedDate || t.submissionDate || t.createdAt),
          estimatedPrice: t.estimatedPrice || t.initialOfferPrice,
          finalPrice: t.finalPrice || t.finalOfferPrice,
          note: t.note
        })),
        catchError(error => {
          console.error('Error updating transaction status:', error);
          throw error;
        })
      );
  }

  /**
   * Update transaction with full data (admin edit)
   */
  updateTransaction(transactionId: string | number, updateData: any): Observable<any> {
    const token = this.getAuthToken();
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

    return this.http.put<any>(`${this.apiUrl}/transactions/${transactionId}`, updateData, { headers })
      .pipe(
        catchError(error => {
          console.error('Error updating transaction:', error);
          throw error;
        })
      );
  }

  /**
   * Get all categories (for admin dropdown)
   */
  getAllCategories(): Observable<any[]> {
    const token = this.getAuthToken();
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

    return this.http.get<any[]>(`${this.apiUrl}/admin/categories`, { headers })
      .pipe(
        catchError(error => {
          console.error('Error fetching categories:', error);
          return of([]);
        })
      );
  }

  /**
   * Get all brands (for admin dropdown)
   */
  getAllBrands(): Observable<any[]> {
    const token = this.getAuthToken();
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

    return this.http.get<any[]>(`${this.apiUrl}/admin/brands`, { headers })
      .pipe(
        catchError(error => {
          console.error('Error fetching brands:', error);
          return of([]);
        })
      );
  }

  /**
   * Get all appliances (for admin dropdown)
   */
  getAllAppliances(): Observable<any[]> {
    const token = this.getAuthToken();
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

    return this.http.get<any[]>(`${this.apiUrl}/admin/appliances`, { headers })
      .pipe(
        catchError(error => {
          console.error('Error fetching appliances:', error);
          return of([]);
        })
      );
  }

  /**
   * Get active condition groups with their active options (for admin edit dropdowns)
   * @param categoryId Optional category ID to filter options by category
   */
  getActiveConditionGroupsWithOptions(categoryId?: string | number): Observable<any[]> {
    const token = this.getAuthToken();
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

    let url = `${this.apiUrl}/admin/condition-groups/active-with-options`;
    if (categoryId) {
      url += `?categoryId=${categoryId}`;
    }

    return this.http.get<any[]>(url, { headers })
      .pipe(
        catchError(error => {
          console.error('Error fetching condition groups:', error);
          return of([]);
        })
      );
  }

  /**
   * Get condition options by group IDs
   * @param groupIds Array of group IDs
   * @returns Observable with options grouped by groupID
   */
  getConditionOptionsByGroupIds(groupIds: string[]): Observable<{ [key: string]: any[] }> {
    const token = this.getAuthToken();
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

    const groupIdsParam = groupIds.join(',');
    return this.http.get<{ [key: string]: any[] }>(`${this.apiUrl}/transactions/condition-options-by-groups?groupIds=${groupIdsParam}`, { headers })
      .pipe(
        catchError(error => {
          console.error('Error fetching condition options by group IDs:', error);
          return of({});
        })
      );
  }

  /**
   * Upload admin photos to Supabase Storage
   * @param transactionId Transaction ID
   * @param formData FormData containing photos
   * @returns Observable<string[]> Array of uploaded photo URLs
   */
  uploadAdminPhotos(transactionId: string | number, formData: FormData): Observable<string[]> {
    const token = this.getAuthToken();
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

    return this.http.post<any>(`${this.apiUrl}/transactions/${transactionId}/photos`, formData, { headers })
      .pipe(
        map(response => response.photoUrls || []),
        catchError(error => {
          console.error('Error uploading admin photos:', error);
          throw error;
        })
      );
  }

  /**
   * Update customer information for a transaction (seller can edit when item is Awaiting Pick Up)
   */
  updateCustomerInfo(transactionId: string | number, updateData: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/transactions/${transactionId}/customer-info`, updateData, { headers: this.auth.getAuthHeaders() })
      .pipe(
        catchError(error => {
          console.error('Error updating customer info:', error);
          throw error;
        })
      );
  }
}
