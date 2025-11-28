import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, from, of } from 'rxjs';
import { catchError, concatMap, first, map, shareReplay } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

export interface Category {
  id: number | string;
  name: string;
  image?: string | null;
}

export interface SimpleItem {
  id: number | string;
  name: string;
}

export interface ConditionOption {
  id: string;
  code: string;
  description: string;
  image: string | null;
}

export interface ConditionGroup {
  groupID: string;
  sectionName: string;
  question: string;
  type: 'radio' | 'image' | 'checkbox' | 'file_upload' | 'textarea';
  displayOrder: number;
  options: ConditionOption[];
}

export interface ScoreLabel {
  functionalityScore: number;
  appearanceScore: number;
  componentScore: number;
  totalScore: number;
  classification: 'Excellent' | 'Good' | 'Fair' | 'Poor';
}

export interface ValuationResponse {
  valuationWorth: number;
  highestBuyerId: string | null;
  scoreLabel: ScoreLabel;
}


@Injectable({ providedIn: 'root' })
export class QuestionnaireService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private api = environment.apiUrl + '/api';
  private cache$?: Observable<Category[]>;

  private buildHeaders(): { headers?: HttpHeaders } {
    const headers = this.auth.getAuthHeaders();
    return headers && headers.keys().length ? { headers } : {};
  }
  
    getCategories(forceReload = false): Observable<Category[]> {
    if (!this.cache$ || forceReload) {
      this.cache$ = this.http.get<Category[]>(`${this.api}/categories`, this.buildHeaders()).pipe(
        catchError(() => of([])),
        shareReplay(1)
      );
    }
    return this.cache$;
  }

  getBrandsByCategory(categoryId: string | number): Observable<SimpleItem[]> {
    if (!categoryId) return of([]);
    return this.http.get<SimpleItem[]>(`${this.api}/brands/${categoryId}`, this.buildHeaders()).pipe(
      catchError(err => {
        console.warn('Failed to load brands', err);
        return of([]);
      })
    );
  }

  getModelsByCategoryBrand(categoryId: string | number, brandId: string | number): Observable<SimpleItem[]> {
    if (!brandId) return of([]);
    return this.http.get<SimpleItem[]>(`${this.api}/models/${categoryId}/${brandId}`, this.buildHeaders()).pipe(
      catchError(err => {
        console.warn('Failed to load models', err);
        return of([]);
      })
    );
  }

  calculateValuation(data: any): Observable<ValuationResponse | null> {
    return this.http.post<ValuationResponse>(`${this.api}/calculate-valuation`, data, this.buildHeaders()).pipe(
      catchError(err => {
        console.warn('Failed to calculate valuation', err);
        return of(null);
      })
    );
  }

  submitQuestionnaire(data: any, photos: File[]): Observable<any> {
    const form = new FormData();

    Object.entries(data).forEach(([key, value]) => {
      form.append(key, String(value));
    });

    photos.forEach(file => {
      form.append('photos', file, file.name);
    });

    // Let browser set Content-Type + boundary automatically
    return this.http.post(`${this.api}/questionnaire/submit`, form, {
      headers: this.auth.getAuthHeaders()  // Now safe — no Content-Type
    });
  }



  // NEW: Fetch dynamic condition groups (questions + options) filtered by category
  getConditionGroups(categoryId: string | number): Observable<ConditionGroup[]> {
    if (!categoryId) return of([]);
    return this.http.get<ConditionGroup[]>(`${this.api}/condition-groups/${categoryId}`, this.buildHeaders()).pipe(
      catchError(err => {
        console.warn('Failed to load condition groups', err);
        return of([]);
      })
    );
  }

  // Submit with photos
  // submitQuestionnaire(data: any, photos: File[]): Observable<any> {
  //   const form = new FormData();

  //   // Append all form fields
  //   Object.entries(data).forEach(([key, value]) => {
  //     if (value !== null && value !== undefined) {
  //       if (Array.isArray(value)) {
  //         form.append(key, JSON.stringify(value));
  //       } else {
  //         form.append(key, String(value));
  //       }
  //     }
  //   });

  //   // Append photos
  //   photos.forEach((file, index) => {
  //     form.append('photos', file, file.name);
  //   });

  //   return this.http.post(`${this.api}/questionnaire/submit`, form);
  // }

}