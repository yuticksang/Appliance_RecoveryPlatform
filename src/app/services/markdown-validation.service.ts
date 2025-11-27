import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class MarkdownValidationService {
  private apiUrl = 'http://localhost:3000/api';

  constructor(private http: HttpClient) {}

  /**
   * Check if buyer has set all required markdowns
   * Returns { isComplete: boolean, missing: number, total: number }
   */
  checkMarkdownCompletion(): Observable<{ isComplete: boolean; missing: number; total: number; percentageComplete: number }> {
    const token = localStorage.getItem('buyer_token');
    const headers = new HttpHeaders({
      'Authorization': token ? `Bearer ${token}` : ''
    });

    // Get all condition options
    const conditionOptions$ = this.http.get<any[]>(`${this.apiUrl}/buyer/condition-options`, { headers });

    // Get buyer's markdowns
    const buyerMarkdowns$ = this.http.get<any[]>(`${this.apiUrl}/buyer/markdowns`, { headers });

    return new Observable(observer => {
      Promise.all([
        conditionOptions$.toPromise(),
        buyerMarkdowns$.toPromise()
      ]).then(([options, markdowns]) => {
        const totalOptions = options?.length || 0;
        const markdownMap = new Map(markdowns?.map(m => [m.conditionID, m.markdownPercentage]) || []);
        const optionsWithMarkdown = options?.filter(opt => markdownMap.has(opt.conditionID)).length || 0;
        const missing = totalOptions - optionsWithMarkdown;
        const percentageComplete = totalOptions > 0 ? Math.round((optionsWithMarkdown / totalOptions) * 100) : 0;

        observer.next({
          isComplete: missing === 0,
          missing,
          total: totalOptions,
          percentageComplete
        });
        observer.complete();
      }).catch(error => {
        observer.error(error);
      });
    });
  }

  /**
   * Validate if markdowns are complete before allowing an action
   * Returns true if complete, false if not
   */
  validateMarkdownsComplete(): Observable<boolean> {
    return this.checkMarkdownCompletion().pipe(
      map(stats => stats.isComplete)
    );
  }
}
