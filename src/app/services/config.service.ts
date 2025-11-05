import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ConfigService {
  // API Configuration
  get apiUrl(): string {
    return environment.apiUrl;
  }

  get apiBaseUrl(): string {
    return environment.apiUrl + '/api';
  }

  // Supabase Configuration
  get supabaseUrl(): string {
    return environment.supabase.url;
  }

  get supabaseAnonKey(): string {
    return environment.supabase.anonKey;
  }

  // Environment checks
  get isProduction(): boolean {
    return environment.production;
  }

  get isDevelopment(): boolean {
    return !environment.production;
  }

  // Logging helper
  log(message: any, ...args: any[]): void {
    if (this.isDevelopment) {
      console.log(message, ...args);
    }
  }

  logError(message: any, ...args: any[]): void {
    if (this.isDevelopment) {
      console.error(message, ...args);
    }
  }
}