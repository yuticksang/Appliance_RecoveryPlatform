import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface User {
  id: number;
  username: string;
  email: string;
  role: 'seller' | 'admin';
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  // Mock current user - replace with real auth later
  private currentUserSubject = new BehaviorSubject<User | null>({
    id: 1,
    username: 'ChuaSY',
    email: 'chua@example.com',
    role: 'seller'
  });

  public currentUser$ = this.currentUserSubject.asObservable();

  constructor() {
    // TODO: Load user from localStorage or check token on init
    // const storedUser = localStorage.getItem('currentUser');
    // if (storedUser) this.currentUserSubject.next(JSON.parse(storedUser));
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  getCurrentUserId(): number | null {
    return this.currentUserSubject.value?.id || null;
  }

  setCurrentUser(user: User | null): void {
    this.currentUserSubject.next(user);
    // TODO: Store in localStorage
    // if (user) localStorage.setItem('currentUser', JSON.stringify(user));
    // else localStorage.removeItem('currentUser');
  }

  logout(): void {
    this.currentUserSubject.next(null);
    // TODO: Clear localStorage and tokens
    // localStorage.removeItem('currentUser');
    // localStorage.removeItem('token');
  }

  /**
   * TODO: Replace with actual login API call
   */
  login(email: string, password: string): Observable<User> {
    // Mock implementation
    const mockUser: User = {
      id: 1,
      username: 'ChuaSY',
      email: email,
      role: 'seller'
    };
    this.setCurrentUser(mockUser);
    return new BehaviorSubject(mockUser).asObservable();
  }
}
