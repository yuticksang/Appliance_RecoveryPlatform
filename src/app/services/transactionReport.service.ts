import { Injectable, inject } from "@angular/core";
import { HttpClient, HttpHeaders } from "@angular/common/http";
import { Observable } from "rxjs";
import { ConfigService } from "../services/config.service";
import { get } from "node:http";

export interface TransactionReport {
    transactionID: string;
    transactionDate: string;
    transactionStatus: string;
    buyerID: string;
    sellerID: string;
    sellerName: string;
    sellerEmail: string;
    sellerPhone: string;
    pickupAddress: string;
    city: string;
    state: string;
    zipCode: string;
    applianceID: string;
    modelCode: string;
    modelName: string;
    categoryName: string;
    brandName: string;
    submittedApplianceID: string;
    finalOfferPrice: number;
    finalScore: number;
    classification: string;
    conditions: ConditionDetail[];
    pricingBreakdown: PricingBreakdown;

}

export interface ConditionDetail {
    conditionDescription: string;
    criteriaName: string;
    markdownPercentage: number;
}

export interface PricingBreakdown {
    breakdown: PricingRow[];
    finalAmount: number;
}

export interface PricingRow {
    component: string;
    baseValue: number;
    markdown: number | null;
    markdownAmount: number;
    finalValue: number;


}
@Injectable({
  providedIn: 'root'
})

export class TransactionReportService{
    private http = inject(HttpClient);
    private configService = inject(ConfigService);
    private baseUrl = this.configService.apiBaseUrl;

    private getHeaders(): HttpHeaders {
        const token = localStorage.getItem('admin_token');
        return new HttpHeaders({
            'Authorization': token ? `Bearer ${token}` : ''
        });
    }

    getTransactionsReportById(transactionID: string): Observable<{success: boolean; data: TransactionReport}>{
        return this.http.get<{success: boolean; data: TransactionReport}>(`${this.baseUrl}/transactionReport/${transactionID}`, { headers: this.getHeaders() });
    }

    saveTransactionReport(reportID: string, transactionID: string, adminID: string): Observable<any> {
        const body = { reportID, transactionID, adminID };
        return this.http.post<any>(`${this.baseUrl}/transactionReport/saveTransactionReport`, body, { headers: this.getHeaders() });
    }

    
}