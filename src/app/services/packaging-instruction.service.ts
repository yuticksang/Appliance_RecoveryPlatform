import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

export interface PackagingStep {
  id: string;
  instruction: string;
  displayOrder: number;
}

export interface PackagingSection {
  [sectionName: string]: PackagingStep[];
}

export interface PackagingInstructionsResponse {
  categoryId: number;
  sections: PackagingSection;
  isDefault: boolean;
}

// Default fallback instructions (used if API fails)
const DEFAULT_INSTRUCTIONS: PackagingSection = {
  'Safety First': [
    { id: 'default-1', instruction: 'Disconnect power: Unplug the appliance from the electrical outlet at least 24 hours before pickup.', displayOrder: 1 },
    { id: 'default-2', instruction: 'Turn off utilities: For appliances with water or gas connections, shut off and disconnect all supply lines.', displayOrder: 2 },
    { id: 'default-3',instruction: 'Allow cooling: Let appliances cool completely if they generate heat.', displayOrder: 3 }
  ],
  'Preparation Steps': [
    { id: 'default-4', instruction: 'Clean thoroughly: Wipe down all interior and exterior surfaces. Remove any debris.', displayOrder: 1 },
    { id: 'default-5', instruction: 'Drain all water: Empty water tanks and drain hoses completely.', displayOrder: 2 },
    { id: 'default-6',instruction: 'Remove loose parts: Take out all removable components and pack them separately.', displayOrder: 3 }
  ],
  'Packaging Guidelines': [
    { id: 'default-7', instruction: 'Protect fragile parts: Wrap glass doors and control panels with bubble wrap.', displayOrder: 1 },
    { id: 'default-8', instruction: 'Secure doors and lids: Use packing tape to secure all doors and access panels.', displayOrder: 2 },
    { id: 'default-9', instruction: 'Wrap cables: Coil power cords neatly and tape them to the appliance.', displayOrder: 3 }
  ],
  'Documentation': [
    { id: 'default-10', instruction: 'Attach recovery slip: Print your recovery slip and attach it to the appliance in a clear sleeve.', displayOrder: 1 }
  ]
};

@Injectable({
  providedIn: 'root'
})
export class PackagingInstructionService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private apiUrl = environment.apiUrl + '/api';

  /**
   * Get packaging instructions for a specific category
   * Falls back to default instructions if API call fails
   */
  getPackagingInstructions(categoryId: number | string): Observable<PackagingInstructionsResponse> {
    const headers = this.auth.getAuthHeaders();

    return this.http.get<PackagingInstructionsResponse>(
      `${this.apiUrl}/packaging-instructions/${categoryId}`,
      { headers }
    ).pipe(
      catchError(error => {
        console.warn('Failed to load packaging instructions from API, using defaults:', error);
        // Return default instructions if API fails
        return of({
          categoryId: typeof categoryId === 'string' ? parseInt(categoryId) : categoryId,
          sections: DEFAULT_INSTRUCTIONS,
          isDefault: true
        });
      })
    );
  }

  /**
   * Get all packaging instructions (Admin only)
   */
  getAllPackagingInstructions(): Observable<any[]> {
    const headers = this.auth.getAuthHeaders();

    return this.http.get<any[]>(
      `${this.apiUrl}/admin/packaging-instructions`,
      { headers }
    ).pipe(
      catchError(error => {
        console.error('Failed to load all packaging instructions:', error);
        return of([]);
      })
    );
  }

  /**
   * Create a new packaging instruction (Admin only)
   */
  createPackagingInstruction(data: {
    categoryId: string | number;
    sectionName: string;
    instruction: string;
    displayOrder: number;
  }): Observable<any> {
    const headers = this.auth.getAuthHeaders();

    return this.http.post(
      `${this.apiUrl}/admin/packaging-instructions`,
      data,
      { headers }
    );
  }

  /**
   * Update an existing packaging instruction (Admin only)
   */
  updatePackagingInstruction(instructionId: string, data: {
    categoryId?: string | number;
    sectionName?: string;
    instruction?: string;
    displayOrder?: number;
    isActive?: boolean;
  }): Observable<any> {
    const headers = this.auth.getAuthHeaders();

    return this.http.put(
      `${this.apiUrl}/admin/packaging-instructions/${instructionId}`,
      data,
      { headers }
    );
  }

  /**
   * Delete a packaging instruction (Admin only)
   */
  deletePackagingInstruction(instructionId: string): Observable<any> {
    const headers = this.auth.getAuthHeaders();

    return this.http.delete(
      `${this.apiUrl}/admin/packaging-instructions/${instructionId}`,
      { headers }
    );
  }
}