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

  // ✅ ADD: Track which notifications have been shown in this session
  private shownNotificationIds = new Set<string>();

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
    console.log('⏰ Setting up notification check interval (every 10 seconds)');
    
    // ✅ IMMEDIATE CHECK (don't wait 2 seconds)
    console.log('🔍 Running initial notification check...');
    this.checkForNewNotifications();

    // Check for new notifications every 10 seconds
    this.intervalSubscription = interval(10000).subscribe(() => {
      this.checkForNewNotifications();
    });
  }

  public destroy(): void {
    if (this.intervalSubscription) {
      console.log('🛑 Stopping notification service');
      this.intervalSubscription.unsubscribe();
      this.intervalSubscription = undefined;
      this.serviceStarted = false;
      // ✅ Clear shown notifications tracking
      this.shownNotificationIds.clear();
    }
  }

  private checkForNewNotifications(): void {
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
        // ✅ FILTER: Only show notifications that haven't been shown in this session
        const newNotifications = notifications.filter(n => {
          const alreadyShown = this.shownNotificationIds.has(n.id);
          if (!alreadyShown) {
            this.shownNotificationIds.add(n.id);
            return true;
          }
          return false;
        });

        if (newNotifications.length > 0) {
          console.log(`📢 Found ${newNotifications.length} NEW notifications for seller ${user.id}`);
          newNotifications.forEach(notification => {
            this.showSystemCancellationAlert(notification);
          });
        } else {
          console.log(`✅ No new notifications for seller ${user.id}`);
        }
        
        this.unreadNotifications$.next(notifications);
      },
      error: (error) => {
        console.error('❌ Error checking notifications:', error);
        
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
    const user = this.auth.getCurrentUser();
    
    if (user?.userType === 'seller') {
      console.log(`📢 Showing cancellation alert: ${notification.message.substring(0, 50)}...`);
      
      this.alertService.showModal({
        type: 'warning',
        title: 'Transaction Cancelled by System',
        message: notification.message,
        confirmText: 'I Understand',
        showCancel: false,
        onConfirm: () => {
          console.log('✅ Seller acknowledged system cancellation notification');
          // ✅ Mark as read in backend after user acknowledges
          this.markAsRead(notification.id).subscribe({
            next: () => console.log(`✅ Notification ${notification.id} marked as read`),
            error: (err) => console.error(`❌ Failed to mark notification as read:`, err)
          });
        }
      });
    }
  }

  // ✅ ADD: Mark notification as read
  markAsRead(notificationId: string): Observable<any> {
    return this.http.patch(
      `${this.apiUrl}/notifications/${notificationId}/read`, 
      {}, 
      { headers: this.auth.getAuthHeaders() }
    );
  }
}