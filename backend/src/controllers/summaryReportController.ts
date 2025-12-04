import { Request, Response } from 'express';
import pool from '../config/database';
import { parse } from 'path';

export const getSummaryReportByDate = async (req: Request, res: Response) => {

    try{

        const { startDate, endDate } = req.query;

         if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: 'Start date and end date are required'
            });
        }

        // Category Performance Summary Query
        const result = await pool.query(`
            WITH category_stats AS (
                SELECT 
                    c."categoryID",
                    c."categoryName",
                    
                    -- Total Submissions
                    COUNT(DISTINCT sa."submittedApplianceID") AS submissions,
                    
                    -- Completed Transactions
                    COUNT(DISTINCT CASE 
                        WHEN t."transactionStatus" = 'Completed' 
                        THEN t."transactionID" 
                    END) AS completed,
                    
                    -- Average Final Score
                    ROUND(AVG(
                        CASE WHEN t."transactionStatus" = 'Completed' 
                        THEN sa."finalScore" END
                    )::numeric, 2) AS "avgScore",
                    
                    -- Total Value (sum of finalOfferPrice for completed)
                    COALESCE(SUM(
                        CASE WHEN t."transactionStatus" = 'Completed' 
                        THEN sa."finalOfferPrice" END
                    ), 0) AS "totalValue",
                    
                    -- Average Processing Days
                    ROUND(AVG(
                        CASE WHEN t."transactionStatus" = 'Completed' 
                        THEN EXTRACT(EPOCH FROM (t."updatedAt" - sa."submissionDate")) / 86400 
                        END
                    )::numeric, 2) AS "avgProcessingDays"
                    
                FROM "Category" c
                LEFT JOIN "Appliance" a ON a."categoryID" = c."categoryID"
                LEFT JOIN "SubmittedAppliance" sa ON sa."applianceID" = a."applianceID"
                    AND sa."submissionDate" >= $1::date
                    AND sa."submissionDate" <= $2::date
                LEFT JOIN "Transaction" t ON t."submittedApplianceID" = sa."submittedApplianceID"
                GROUP BY c."categoryID", c."categoryName"
                ORDER BY c."categoryName"
            )
            SELECT 
                "categoryID",
                "categoryName",
                COALESCE(submissions, 0) AS submissions,
                COALESCE(completed, 0) AS completed,
                COALESCE("avgScore", 0) AS "avgScore",
                COALESCE("totalValue", 0) AS "totalValue",
                CASE 
                    WHEN COALESCE(completed, 0) > 0 
                    THEN ROUND(("totalValue" / completed)::numeric, 2)
                    ELSE 0 
                END AS "avgValuePerUnit",
                CASE 
                    WHEN COALESCE(submissions, 0) > 0 
                    THEN ROUND((completed::numeric / submissions * 100), 2)
                    ELSE 0 
                END AS "completionRate",
                COALESCE("avgProcessingDays", 0) AS "avgProcessingDays"
            FROM category_stats
        `, [startDate, endDate]);

        const totals = await pool.query(`
            SELECT 
                COUNT(DISTINCT sa."submittedApplianceID") AS "totalSubmissions",
                COUNT(DISTINCT CASE 
                    WHEN t."transactionStatus" = 'Completed' 
                    THEN t."transactionID" 
                END) AS "totalCompleted",
                ROUND(AVG(
                    CASE WHEN t."transactionStatus" = 'Completed' 
                    THEN sa."finalScore" END
                )::numeric, 2) AS "avgScore",
                COALESCE(SUM(
                    CASE WHEN t."transactionStatus" = 'Completed' 
                    THEN sa."finalOfferPrice" END
                ), 0) AS "totalValue",
                ROUND(AVG(
                    CASE WHEN t."transactionStatus" = 'Completed' 
                    THEN EXTRACT(EPOCH FROM (t."updatedAt" - sa."submissionDate")) / 86400 
                    END
                )::numeric, 2) AS "avgProcessingDays"
            FROM "SubmittedAppliance" sa
            LEFT JOIN "Appliance" a ON a."applianceID" = sa."applianceID"
            LEFT JOIN "Transaction" t ON t."submittedApplianceID" = sa."submittedApplianceID"
            WHERE sa."submissionDate" >= $1::date
            AND sa."submissionDate" <= $2::date
        `, [startDate, endDate]);

        const totalsRow = totals.rows[0];
        const totalSubmissions = parseInt(totalsRow.totalSubmissions) || 0;
        const totalCompleted = parseInt(totalsRow.totalCompleted) || 0;
        const totalValue = parseFloat(totalsRow.totalValue) || 0;

        const summaryTotals = {
            submissions: totalSubmissions,
            completed: totalCompleted,
            avgScore: parseFloat(totalsRow.avgScore) || 0,
            totalValue: totalValue,
            avgValuePerUnit: totalCompleted > 0 ? Math.round((totalValue / totalCompleted) * 100) / 100 : 0,
            completionRate: totalSubmissions > 0 ? Math.round((totalCompleted / totalSubmissions) * 100 * 100) / 100 : 0,
            avgProcessingDays: parseFloat(totalsRow.avgProcessingDays) || 0
        };

        console.log('Summary Report Result:', {
            categories: result.rows,
            totals: summaryTotals
        });

         return res.status(200).json({
            success: true,
            data: {
                categories: result.rows,
                totals: summaryTotals,
                dateRange: {
                    startDate,
                    endDate
                },
                recordCount: result.rowCount
            }
        });


    }catch (error) {
        console.error('Error fetching summary report:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }

}

export const saveSummaryReport = async (req: Request, res: Response) => {
    try {

        const { summaryReportID, adminID, startDate, endDate } = req.body;

         console.log('Saving report with:', { summaryReportID, adminID, startDate, endDate });
       const result = await pool.query(`
            INSERT INTO "SummaryReport" ("summaryReportID", "adminID", "startDateRange", "endDateRange", format, "generatedDate")
            VALUES ($1, $2, $3, $4, 'PDF', CURRENT_TIMESTAMP)
            RETURNING *
        `, [summaryReportID, adminID, startDate, endDate]);

        return res.status(201).json({
            success: true,
            data: result.rows[0]
        });


    }catch (error) {
        console.error('Error saving transaction report:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to save transaction report'
        });
    }
}