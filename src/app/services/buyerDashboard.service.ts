import { Injectable, inject } from "@angular/core";
import { HttpClient, HttpHeaders } from "@angular/common/http";
import { Observable } from "rxjs";
import { ConfigService } from "../services/config.service";
import { get } from "node:http";

@Injectable({
  providedIn: 'root'
})

export class buyerDashboardService{
    private http = inject(HttpClient);
    private configService = inject(ConfigService);
    private baseUrl = this.configService.apiBaseUrl;

    private getHeaders(): HttpHeaders {
        const token = localStorage.getItem('buyer_token');
        return new HttpHeaders({
            'Authorization': token ? `Bearer ${token}` : ''
        });
    }

    getCurrentTransactions(buyerId: string): Observable<any>{
        return this.http.get<any>(`${this.baseUrl}/buyerDashboard/transaction/${buyerId}`, { headers: this.getHeaders() });
    }

    getAppliancesRecovered(buyerId: string): Observable<any>{
        return this.http.get<any>(`${this.baseUrl}/buyerDashboard/appliances-recovered/${buyerId}`, { headers: this.getHeaders() });
    }

    getTotalPayout(buyerId: string): Observable<any>{
        return this.http.get<any>(`${this.baseUrl}/buyerDashboard/total-payout/${buyerId}`, { headers: this.getHeaders() });
    }

    
    getActiveTransactions(buyerId: string): Observable<any>{
        return this.http.get<any>(`${this.baseUrl}/buyerDashboard/active-transactions/${buyerId}`, { headers: this.getHeaders() });
    }

    getRecoveryTimeSeries(buyerId: string, range: string = 'monthly'): Observable<any>{
        return this.http.get<any>(`${this.baseUrl}/buyerDashboard/recovery-time-series/${buyerId}?range=${range}`, { headers: this.getHeaders() });
    }

    
}