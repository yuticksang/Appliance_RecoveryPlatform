import { Injectable, inject } from "@angular/core";
import { HttpClient, HttpHeaders } from "@angular/common/http";
import { Observable } from "rxjs";
import { ConfigService } from "../services/config.service";
import { get } from "node:http";

@Injectable({
  providedIn: 'root'
})

export class DashboardService{
    private http = inject(HttpClient);
    private configService = inject(ConfigService);
    private baseUrl = this.configService.apiBaseUrl;

    private getHeaders(): HttpHeaders {
        const token = localStorage.getItem('admin_token');
        return new HttpHeaders({
            'Authorization': token ? `Bearer ${token}` : ''
        });
    }

    getCurrentTransactions(): Observable<any>{
        return this.http.get<any>(`${this.baseUrl}/dashboard/transaction`, { headers: this.getHeaders() });
    }

    getAppliancesRecovered(): Observable<any>{
        return this.http.get<any>(`${this.baseUrl}/dashboard/appliances-recovered`, { headers: this.getHeaders() });
    }

    getTotalPayout(): Observable<any>{
        return this.http.get<any>(`${this.baseUrl}/dashboard/total-payout`, { headers: this.getHeaders() });
    }

    getActiveUsers(): Observable<any>{
        return this.http.get<any>(`${this.baseUrl}/dashboard/active-users`, { headers: this.getHeaders() });
    }

    getActiveTransactions(): Observable<any>{
        return this.http.get<any>(`${this.baseUrl}/dashboard/active-transactions`, { headers: this.getHeaders() });
    }

    getRecoveryTimeSeries(range: string = 'monthly'): Observable<any>{
        return this.http.get<any>(`${this.baseUrl}/dashboard/recovery-time-series?range=${range}`, { headers: this.getHeaders() });
    }

    getCategoryRecoveryData(): Observable<any>{
        return this.http.get<any>(`${this.baseUrl}/dashboard/category-recovery-data`, { headers: this.getHeaders() });  
    }

    getBrandRecoveryData(): Observable<any>{
        return this.http.get<any>(`${this.baseUrl}/dashboard/brand-recovery-data`, { headers: this.getHeaders() });  
    }

    getConditionScoreData(): Observable<any>{
        return this.http.get<any>(`${this.baseUrl}/dashboard/condition-score-data`, { headers: this.getHeaders() });  
    }

    getTop5RecoveredModels(): Observable<any>{
        return this.http.get<any>(`${this.baseUrl}/dashboard/top5-recovered-models`, { headers: this.getHeaders() });  
    }
}