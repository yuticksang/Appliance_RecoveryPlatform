import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, interval, BehaviorSubject, Subscription } from 'rxjs';
import { AuthService } from './auth.service';
import { AlertService } from './alert.service';

export interface SystemNotification {
  id: string;
  userID: string;
  type: string;
  title: string;
  message: string;
  relatedID?: string;
  isRead: boolean;
  createdAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private alertService = inject(AlertService);
  
  private apiUrl = 'http://localhost:3000/api';
  
  private unreadNotifications$ = new BehaviorSubject<SystemNotification[]>([]);
  public unreadNotifications = this.unreadNotifications$.asObservable();
  
  private intervalSubscription?: Subscription;
  private serviceStarted = false;

  constructor() {
    console.log('📢 NotificationService created (waiting for initialization)');
  }

  public initializeForUser(): void {
    // ✅ Use AuthService method
    const user = this.auth.getCurrentUser();
    
    if (!user) {
      console.log('❌ No user found - notification service not started');
      return;
    }

    if (this.serviceStarted) {
      console.log(`📢 Notification service already running for: ${user.userType} ${user.id}`);
      return;
    }

    if (user.userType === 'seller') {
      console.log(`🔔 Starting notification service for seller: ${user.id} (sellerId: ${user.sellerId})`);
      this.startNotificationChecks();
      this.serviceStarted = true;
    } else {
      console.log(`❌ Notification service disabled for user type: ${user.userType} (${user.id})`);
    }
  }

  private startNotificationChecks(): void {
    console.log('⏰ Setting up notification check interval (every 30 seconds)');
    
    // Check for new notifications every 30 seconds
    this.intervalSubscription = interval(30000).subscribe(() => {
      this.checkForNewNotifications();
    });

    // Initial check after 2 seconds (give time for auth to fully load)
    setTimeout(() => {
      console.log('🔍 Running initial notification check...');
      this.checkForNewNotifications();
    }, 2000);
  }

  public destroy(): void {
    if (this.intervalSubscription) {
      console.log('🛑 Stopping notification service');
      this.intervalSubscription.unsubscribe();
      this.intervalSubscription = undefined;
      this.serviceStarted = false;
    }
  }

  private checkForNewNotifications(): void {
    // ✅ Use AuthService method consistently
    const user = this.auth.getCurrentUser();
    
    if (!user) {
      console.log('❌ No authenticated user - stopping notification check');
      this.destroy();
      return;
    }
    
    if (user.userType !== 'seller') {
      console.log(`❌ User is not seller (${user.userType}) - stopping notification check`);
      this.destroy();
      return;
    }

    console.log(`🔔 Checking notifications for seller: ${user.id} (sellerId: ${user.sellerId})`);

    this.getNotifications().subscribe({
      next: (notifications) => {
        if (notifications.length > 0) {
          console.log(`📢 Found ${notifications.length} notifications for seller ${user.id}`);
          notifications.forEach(notification => {
            this.showSystemCancellationAlert(notification);
          });
        } else {
          console.log(`✅ No new notifications for seller ${user.id}`);
        }
        
        this.unreadNotifications$.next(notifications);
      },
      error: (error) => {
        console.error('❌ Error checking notifications:', error);
        
        // If it's an auth error, stop the service
        if (error.status === 401 || error.status === 403) {
          console.log('🛑 Authentication error - stopping notification service');
          this.destroy();
        }
      }
    });
  }

  getNotifications(): Observable<SystemNotification[]> {
    return this.http.get<SystemNotification[]>(`${this.apiUrl}/notifications/unread`, { 
      headers: this.auth.getAuthHeaders() 
    });
  }

  private showSystemCancellationAlert(notification: SystemNotification): void {
    // ✅ Use AuthService method consistently
    const user = this.auth.getCurrentUser();
    
    if (user?.userType === 'seller') {
      console.log(`🚨 Showing cancellation alert to seller: ${notification.message.substring(0, 50)}...`);
      
      this.alertService.showModal({
        type: 'warning',
        title: '⚠️ Transaction Cancelled by System',
        message: notification.message,
        confirmText: 'I Understand',
        showCancel: false,
        onConfirm: () => {
          console.log('✅ Seller acknowledged system cancellation notification');
        }
      });
    }
  }
}