import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { delay, map, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface Transaction {
  id: number;
  sellerId: number; // Foreign key to user/seller
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
  note?: string;
}

@Injectable({
  providedIn: 'root'
})
export class TransactionService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl + '/api';

  constructor() {}

  /**
   * Get transactions for a specific seller from the backend API
   * @param sellerId - The seller ID (e.g., 'S001', 'S002')
   */
  getTransactionsBySeller(sellerId: string): Observable<Transaction[]> {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

    return this.http.get<Transaction[]>(`${this.apiUrl}/transactions/seller/${sellerId}`, { headers })
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
            note: t.note
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
    const token = localStorage.getItem('token');
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
            note: t.note
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
    const token = localStorage.getItem('token');
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
   * Update transaction status (admin action or status change)
   */
  updateTransactionStatus(
    transactionId: number,
    transactionStatus: Transaction['transactionStatus'],
    itemStatus?: Transaction['itemStatus']
  ): Observable<Transaction> {
    const token = localStorage.getItem('token');
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
}
