import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, from, of } from 'rxjs';
import { catchError, concatMap, first, map, shareReplay } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

export interface Category {
  id: number | string;
  name: string;
}

export interface SimpleItem {
  id: number | string;
  name: string;
}

export interface ConditionOption {
  conditionID: string;
  groupID: string;
  code: string;
  description: string;
  image: string | null;
  question: string | null;
  status?: string;
}

export interface ConditionGroup {
  groupID: string;
  criteriaName: string;
  options: ConditionOption[];
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

  getModelsByBrand(brandId: string | number): Observable<SimpleItem[]> {
    if (!brandId) return of([]);
    return this.http.get<SimpleItem[]>(`${this.api}/models/${brandId}`, this.buildHeaders()).pipe(
      catchError(err => {
        console.warn('Failed to load models', err);
        return of([]);
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

  // Get all condition groups with their options for questionnaire
  getConditionGroups(): Observable<ConditionGroup[]> {
    return this.http.get<any[]>(`${this.api}/admin/condition-groups`, this.buildHeaders()).pipe(
      concatMap(groups => {
        // For each group, fetch its options
        if (groups.length === 0) return of([]);

        return from(groups).pipe(
          concatMap(group =>
            this.http.get<ConditionOption[]>(`${this.api}/admin/condition-options/group/${group.groupID}`, this.buildHeaders()).pipe(
              map(options => ({
                groupID: group.groupID,
                criteriaName: group.criteriaName,
                options: options.filter(opt => opt.status === 'ACTIVE' || !opt.status)
              } as ConditionGroup)),
              catchError(() => of({
                groupID: group.groupID,
                criteriaName: group.criteriaName,
                options: []
              } as ConditionGroup))
            )
          ),
          // Collect all groups into array
          map(group => [group]),
          concatMap((groups, index) => index === 0 ? of(groups) : of(groups))
        );
      }),
      catchError(err => {
        console.warn('Failed to load condition groups', err);
        return of([]);
      })
    );
  }

  // Simpler approach - get all options at once
  getAllConditionOptions(): Observable<{groups: ConditionGroup[]}> {
    return this.http.get<any[]>(`${this.api}/admin/condition-options`, this.buildHeaders()).pipe(
      map(options => {
        // Group options by groupID
        const groupMap = new Map<string, ConditionGroup>();

        options.forEach(opt => {
          if (!groupMap.has(opt.groupID)) {
            groupMap.set(opt.groupID, {
              groupID: opt.groupID,
              criteriaName: opt.criteriaName || 'Unknown',
              options: []
            });
          }
          groupMap.get(opt.groupID)!.options.push({
            conditionID: opt.conditionID,
            groupID: opt.groupID,
            code: opt.code,
            description: opt.description,
            image: opt.image,
            question: opt.question
          });
        });

        return { groups: Array.from(groupMap.values()) };
      }),
      catchError(err => {
        console.warn('Failed to load conditions', err);
        return of({ groups: [] });
      })
    );
  }
}