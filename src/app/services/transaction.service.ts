import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';

export interface Transaction {
  id: number;
  sellerId: number; // Foreign key to user/seller
  sellerName: string;
  image: string;
  brand: string;
  category: string;
  model: string;
  modelName: string;
  transactionStatus: 'Pending Payment' | 'Completed' | 'Returned' | 'Rejected' | 'Cancelled' | 'Awaiting Confirmation' | 'Under Review' | 'Picked Up';
  itemStatus: 'Picked Up' | 'Returned' | 'Awaiting Picked Up' | 'Pending Further Action';
  submittedDate: Date;
  estimatedPrice?: number;
}

@Injectable({
  providedIn: 'root'
})
export class TransactionService {
  
  // Mock data - this will be replaced with real API calls
  private mockTransactions: Transaction[] = [
    {
      id: 1,
      sellerId: 1, // ChuaSY's ID
      sellerName: 'ChuaSY',
      image: 'assets/image/placeholder-appliance.png',
      brand: 'LG',
      category: 'Laundry',
      model: 'FBJ209S6W',
      modelName: '9kg Front Load Washer with 6 motion Inverter Direct Drive',
      transactionStatus: 'Pending Payment',
      itemStatus: 'Picked Up',
      submittedDate: new Date('2025-10-15'),
      estimatedPrice: 450
    },
    {
      id: 2,
      sellerId: 1, // ChuaSY's ID
      sellerName: 'ChuaSY',
      image: 'assets/image/placeholder-appliance.png',
      brand: 'SAMSUNG',
      category: 'Laundry',
      model: 'FV209R4W',
      modelName: '9/5kg Front Load Washer Dryer with AI Direct Drive, Steam',
      transactionStatus: 'Completed',
      itemStatus: 'Picked Up',
      submittedDate: new Date('2025-10-10'),
      estimatedPrice: 600
    },
    {
      id: 3,
      sellerId: 1, // ChuaSY's ID
      sellerName: 'ChuaSY',
      image: 'assets/image/placeholder-appliance.png',
      brand: 'PANASONIC',
      category: 'Kitchen',
      model: 'EH69351BC',
      modelName: 'Electrolux UltimateTaste 700 90cm 3-burner Gas Hob with Step Flame',
      transactionStatus: 'Returned',
      itemStatus: 'Picked Up',
      submittedDate: new Date('2025-09-28'),
      estimatedPrice: 320
    },
    {
      id: 4,
      sellerId: 1, // ChuaSY's ID
      sellerName: 'ChuaSY',
      image: 'assets/image/placeholder-appliance.png',
      brand: 'LG',
      category: 'Cleaning',
      model: 'EH69350BC',
      modelName: 'Electrolux UltimateTaste 90cm Flexi Cut-out Gas Hob with 3 Cooking Zones',
      transactionStatus: 'Rejected',
      itemStatus: 'Returned',
      submittedDate: new Date('2025-09-20'),
      estimatedPrice: 0
    },
    {
      id: 5,
      sellerId: 2, // Different seller - won't show for ChuaSY
      sellerName: 'JohnDoe',
      image: 'assets/image/placeholder-appliance.png',
      brand: 'SAMSUNG',
      category: 'Kitchen',
      model: 'RF23R62E3SR',
      modelName: 'Samsung 4-Door Flex Refrigerator',
      transactionStatus: 'Completed',
      itemStatus: 'Picked Up',
      submittedDate: new Date('2025-10-05'),
      estimatedPrice: 800
    },
    {
      id: 6,
      sellerId: 1, // ChuaSY's ID
      sellerName: 'ChuaSY',
      image: 'assets/image/placeholder-appliance.png',
      brand: 'LG',
      category: 'Cleaning',
      model: 'XXX',
      modelName: 'XXX',
      transactionStatus: 'Cancelled',
      itemStatus: 'Pending Further Action',
      submittedDate: new Date('2025-09-15')
    },
    {
      id: 7,
      sellerId: 1, // ChuaSY's ID
      sellerName: 'ChuaSY',
      image: 'assets/image/placeholder-appliance.png',
      brand: 'LG',
      category: 'Cleaning',
      model: 'XXX',
      modelName: 'XXX',
      transactionStatus: 'Rejected',
      itemStatus: 'Picked Up',
      submittedDate: new Date('2025-09-10')
    },
    {
      id: 8,
      sellerId: 1, // ChuaSY's ID
      sellerName: 'ChuaSY',
      image: 'assets/image/placeholder-appliance.png',
      brand: 'LG',
      category: 'Laundry',
      model: 'XXX',
      modelName: 'XXX',
      transactionStatus: 'Awaiting Confirmation',
      itemStatus: 'Picked Up',
      submittedDate: new Date('2025-11-01')
    },
    {
      id: 9,
      sellerId: 1, // ChuaSY's ID
      sellerName: 'ChuaSY',
      image: 'assets/image/placeholder-appliance.png',
      brand: 'LG',
      category: 'Laundry',
      model: 'XXX',
      modelName: 'XXX',
      transactionStatus: 'Under Review',
      itemStatus: 'Picked Up',
      submittedDate: new Date('2025-10-30')
    },
    {
      id: 10,
      sellerId: 1, // ChuaSY's ID
      sellerName: 'ChuaSY',
      image: 'assets/image/placeholder-appliance.png',
      brand: 'LG',
      category: 'Laundry',
      model: 'XXX',
      modelName: 'XXX',
      transactionStatus: 'Picked Up',
      itemStatus: 'Picked Up',
      submittedDate: new Date('2025-10-25')
    },
    {
      id: 11,
      sellerId: 1, // ChuaSY's ID
      sellerName: 'ChuaSY',
      image: 'assets/image/placeholder-appliance.png',
      brand: 'LG',
      category: 'Laundry',
      model: 'XXX',
      modelName: 'XXX',
      transactionStatus: 'Cancelled',
      itemStatus: 'Awaiting Picked Up',
      submittedDate: new Date('2025-10-20')
    }
  ];

  constructor() {}

  /**
   * Get transactions for a specific seller
   * TODO: Replace with actual HTTP call to backend API
   * Example: return this.http.get<Transaction[]>(`/api/transactions/seller/${sellerId}`)
   */
  getTransactionsBySeller(sellerId: number): Observable<Transaction[]> {
    // Simulate API call delay
    const sellerTransactions = this.mockTransactions.filter(t => t.sellerId === sellerId);
    return of(sellerTransactions).pipe(delay(300));
  }

  /**
   * Get all transactions (admin view)
   * TODO: Replace with actual HTTP call
   */
  getAllTransactions(): Observable<Transaction[]> {
    return of(this.mockTransactions).pipe(delay(300));
  }

  /**
   * Create a new transaction (when seller submits trade-in questionnaire)
   * TODO: Replace with actual HTTP POST
   */
  createTransaction(transaction: Partial<Transaction>): Observable<Transaction> {
    const newTransaction: Transaction = {
      id: this.mockTransactions.length + 1,
      sellerId: transaction.sellerId || 1,
      sellerName: transaction.sellerName || 'Unknown',
      image: transaction.image || 'assets/image/placeholder-appliance.png',
      brand: transaction.brand || '',
      category: transaction.category || '',
      model: transaction.model || '',
      modelName: transaction.modelName || '',
      transactionStatus: 'Under Review',
      itemStatus: 'Awaiting Picked Up',
      submittedDate: new Date(),
      estimatedPrice: transaction.estimatedPrice
    };

    this.mockTransactions.push(newTransaction);
    return of(newTransaction).pipe(delay(300));
  }

  /**
   * Update transaction status (admin action or status change)
   * TODO: Replace with actual HTTP PUT/PATCH
   */
  updateTransactionStatus(
    transactionId: number, 
    transactionStatus: Transaction['transactionStatus'],
    itemStatus?: Transaction['itemStatus']
  ): Observable<Transaction> {
    const transaction = this.mockTransactions.find(t => t.id === transactionId);
    if (transaction) {
      transaction.transactionStatus = transactionStatus;
      if (itemStatus) {
        transaction.itemStatus = itemStatus;
      }
      return of(transaction).pipe(delay(300));
    }
    throw new Error('Transaction not found');
  }
}
