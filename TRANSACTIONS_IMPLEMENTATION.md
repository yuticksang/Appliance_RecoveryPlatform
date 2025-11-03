# Seller Transactions Implementation Guide

## Overview
The transaction list page displays all transactions for the **currently logged-in seller**. Each seller can only see their own transactions.

## Current Implementation

### 1. **Services Created**

#### `auth.service.ts` (`src/app/services/`)
- Manages current logged-in user
- Provides `getCurrentUser()` and `getCurrentUserId()`
- Currently uses mock data (user ID = 1, username = 'ChuaSY')
- **TODO**: Replace with real authentication from backend

#### `transaction.service.ts` (`src/app/services/`)
- Manages transaction data
- Key methods:
  - `getTransactionsBySeller(sellerId)` - Fetch transactions for specific seller
  - `createTransaction(transaction)` - Add new transaction (when questionnaire submitted)
  - `updateTransactionStatus()` - Update status (admin actions)
- Currently uses mock data
- **TODO**: Replace with HTTP calls to your backend API

### 2. **Component**

#### `TransactionsComponent` (`src/app/components/clientSide/transactions/`)
- Loads transactions for current seller on init
- Filters by category, brand, and search query
- Displays loading state, empty state, and transaction table
- Pagination support (10 items per page)

## How It Works (Current Mock Implementation)

```typescript
// Mock user (ChuaSY) with ID = 1
authService.getCurrentUser() → { id: 1, username: 'ChuaSY', role: 'seller' }

// Load transactions for seller ID 1
transactionService.getTransactionsBySeller(1) → returns only transactions where sellerId === 1
```

The mock data includes:
- 10 transactions for seller ID 1 (ChuaSY)
- 1 transaction for seller ID 2 (JohnDoe) - **won't display for ChuaSY**

## Integration with Backend (TODO for Team)

### Step 1: Update `auth.service.ts`
Replace mock authentication with real backend calls:

```typescript
// In auth.service.ts
login(email: string, password: string): Observable<User> {
  return this.http.post<User>('/api/auth/login', { email, password })
    .pipe(
      tap(user => this.setCurrentUser(user))
    );
}

// Load user from JWT token or session
constructor(private http: HttpClient) {
  const token = localStorage.getItem('token');
  if (token) {
    // Decode token or verify session to get user
    this.http.get<User>('/api/auth/me').subscribe(user => {
      this.setCurrentUser(user);
    });
  }
}
```

### Step 2: Update `transaction.service.ts`
Replace mock data with HTTP calls:

```typescript
// In transaction.service.ts
import { HttpClient } from '@angular/common/http';

constructor(private http: HttpClient) {}

getTransactionsBySeller(sellerId: number): Observable<Transaction[]> {
  return this.http.get<Transaction[]>(`/api/transactions/seller/${sellerId}`);
}

createTransaction(transaction: Partial<Transaction>): Observable<Transaction> {
  return this.http.post<Transaction>('/api/transactions', transaction);
}
```

### Step 3: Backend API Endpoints Needed

```
GET  /api/transactions/seller/:sellerId  - Get all transactions for a seller
POST /api/transactions                   - Create new transaction (from questionnaire)
GET  /api/transactions/:id               - Get single transaction details
PUT  /api/transactions/:id/status        - Update transaction status (admin)
```

**Response format for GET /api/transactions/seller/:sellerId:**
```json
[
  {
    "id": 1,
    "sellerId": 1,
    "sellerName": "ChuaSY",
    "brand": "LG",
    "category": "Laundry",
    "model": "FBJ209S6W",
    "modelName": "9kg Front Load Washer with 6 motion Inverter Direct Drive",
    "transactionStatus": "Pending Payment",
    "itemStatus": "Picked Up",
    "submittedDate": "2025-10-15T00:00:00Z",
    "estimatedPrice": 450,
    "image": "https://yourdomain.com/images/appliance-1.jpg"
  }
]
```

### Step 4: Connect Trade-In Questionnaire
When user submits the trade-in questionnaire form:

```typescript
// In your trade-in-questionnaire.component.ts
import { TransactionService } from '../../services/transaction.service';
import { AuthService } from '../../services/auth.service';

onSubmitQuestionnaire(formData: any) {
  const currentUser = this.authService.getCurrentUser();
  
  this.transactionService.createTransaction({
    sellerId: currentUser.id,
    sellerName: currentUser.username,
    brand: formData.brand,
    category: formData.category,
    model: formData.model,
    modelName: formData.modelName,
    image: formData.imageUrl, // Upload image first, get URL
    estimatedPrice: formData.estimatedPrice
  }).subscribe({
    next: (newTransaction) => {
      this.alertService.success('Trade-in request submitted successfully!');
      this.router.navigate(['/transactions']); // Redirect to transactions page
    },
    error: (error) => {
      this.alertService.error('Failed to submit request');
    }
  });
}
```

## Database Schema (Backend Reference)

```sql
CREATE TABLE transactions (
  id SERIAL PRIMARY KEY,
  seller_id INTEGER NOT NULL REFERENCES users(id),
  seller_name VARCHAR(100),
  brand VARCHAR(50),
  category VARCHAR(50),
  model VARCHAR(100),
  model_name VARCHAR(255),
  transaction_status VARCHAR(50) DEFAULT 'Under Review',
  item_status VARCHAR(50) DEFAULT 'Awaiting Picked Up',
  submitted_date TIMESTAMP DEFAULT NOW(),
  estimated_price DECIMAL(10,2),
  image_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_transactions_seller ON transactions(seller_id);
```

## Testing Current Implementation

1. Run the app: `npm start`
2. Navigate to user menu → Click "Transactions"
3. You'll see 10 mock transactions for "ChuaSY" (seller ID 1)
4. Try filtering by category, brand, or searching
5. The transaction for "JohnDoe" (seller ID 2) won't appear

## Next Steps

- [ ] Backend team: Implement the 4 API endpoints above
- [ ] Backend team: Add seller_id to transaction table
- [ ] Frontend team: Replace mock auth with real login/JWT
- [ ] Frontend team: Create trade-in questionnaire page
- [ ] Frontend team: Connect questionnaire submission to `createTransaction()`
- [ ] Frontend team: Update service HTTP calls to real backend URLs

## Contact
For questions about this implementation, contact: [Your Name/Team]
