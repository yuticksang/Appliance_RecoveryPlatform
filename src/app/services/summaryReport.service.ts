import { Injectable, inject } from "@angular/core";
import { HttpClient, HttpHeaders, HttpParams } from "@angular/common/http";
import { Observable } from "rxjs";
import { ConfigService } from "../services/config.service";


export interface CategoryPerformance {
    categoryID: string;
    categoryName: string;
    submissions: number;
    completed: number;
    avgScore: number;
    totalValue: number;
    avgValuePerUnit: number;
    completionRate: number;
    avgProcessingDays: number;
}

export interface SummaryTotals {
    submissions: number;
    completed: number;
    avgScore: number;
    totalValue: number;
    avgValuePerUnit: number;
    completionRate: number;
    avgProcessingDays: number;
}

export interface SummaryReportData {
    categories: CategoryPerformance[];
    totals: SummaryTotals;
    dateRange: {
        startDate: string;
        endDate: string;
    };
    recordCount: number;
}

@Injectable({
  providedIn: 'root'
})

export class SummaryReportService{
    private http = inject(HttpClient);
    private configService = inject(ConfigService);
    private baseUrl = this.configService.apiBaseUrl;

    private getHeaders(): HttpHeaders {
        const token = localStorage.getItem('admin_token');
        return new HttpHeaders({
            'Authorization': token ? `Bearer ${token}` : ''
        });
    }

    getSummaryReportByDate(startDate: string, endDate: string): Observable<{success: boolean; data: SummaryReportData}>{
         const params = new HttpParams()
            .set('startDate', startDate)
            .set('endDate', endDate);

        return this.http.get<{success: boolean; data: SummaryReportData}>(`${this.baseUrl}/summaryReport`, { 
            headers: this.getHeaders(),
            params: params
         });
    }

    saveSummaryReport(summaryReportID: string, adminID: string | null, startDate: string, endDate: string): Observable<{success: boolean; data: any}>{
        const body = {
            summaryReportID,
            adminID,
            startDate,
            endDate
        };

        return this.http.post<{success: boolean; data: any}>(`${this.baseUrl}/summaryReport/save`, body, { 
            headers: this.getHeaders()
         });
    }
    
}