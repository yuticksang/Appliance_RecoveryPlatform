import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { ConfigService } from "../../../services/config.service";


export interface Condition {
    conditionID: string;
    code: string;
    image: string | null;
    description: string;
    scoreValue: number;
}

export interface ConditionGroup {
    groupID: string;
    criteriaName: string;
    weightPercentage: number;
    categoryID: string;
    conditions: Condition[];
}

export interface Category {
    categoryID: string;
    categoryName: string;
}

export interface ApiResponse {
    success: boolean;
    data: any;
    message?: string;
}

@Injectable({
    providedIn: 'root'
})
export class ScoringConfigurationService {
    private http = inject(HttpClient);
    private configService = inject(ConfigService);
    private baseUrl = this.configService.apiBaseUrl;

    getConditionGroupByCategory(categoryID: string): Observable<ApiResponse>{
        return this.http.get<ApiResponse>(`${this.baseUrl}/scoring-config/${categoryID}`);
    }


    getCategories(): Observable<ApiResponse>{
        return this.http.get<ApiResponse>(`${this.baseUrl}/scoring-config/categories`);
    }

    updateConditionScore(categoryID: string, conditionID: string, newScoreValue: number): Observable<ApiResponse>{
        return this.http.put<ApiResponse>(`${this.baseUrl}/scoring-config/condition/${categoryID}/${conditionID}`, { newScoreValue });
    }

    updateWeightPercentage(categoryID: string, conditionGroupID: string, newWeightPercentage: number): Observable<ApiResponse>{
        return this.http.put<ApiResponse>(`${this.baseUrl}/scoring-config/weight/${categoryID}/${conditionGroupID}`, { newWeightPercentage });
    }

}
