import { Request, Response } from 'express';
import pool from '../config/database';

export const getCurrentTransactions = async (req: Request, res: Response) => {

    try{

        const result = await pool.query(`
            SELECT t."transactionID",a."modelName",t."buyerID",sa."initialOfferPrice",TO_CHAR(t."createdAt", 'YYYY-MM-DD') AS "createdAt",t."transactionStatus"
            FROM "Transaction" t
            JOIN "SubmittedAppliance" sa
            ON sa."submittedApplianceID" = t."submittedApplianceID"
            JOIN "Appliance" a
            ON a."applianceID" = sa."applianceID"
            ORDER BY t."createdAt" DESC, t."transactionID"  LIMIT 5
            `);

        return res.status(200).json({
            success: true,
            data: result.rows
        });

    }catch (error) {
        console.error('Error fetching categories:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch transactions'
        });
    }

}

export const getAllAppliancesRecovered = async (req: Request, res: Response) => {

    try{
        const result = await pool.query(`
            SELECT COUNT(*) AS appliances_recovered
            FROM "Transaction"
            WHERE "transactionStatus" = 'Completed';
            `);
        return res.status(200).json({
            success: true,
            data: result.rows[0]
        });             
    } catch (error) {
        console.error('Error fetching appliances recovered:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch appliances recovered'
        });
    }
}

export const getTotalPayout = async (req: Request, res: Response) => {

    try{
        const result = await pool.query(`
            SELECT COALESCE(SUM(sa."finalOfferPrice"), 0) AS "recoveryValue"
            FROM "Transaction" t
            JOIN "SubmittedAppliance" sa
            ON sa."submittedApplianceID" = t."submittedApplianceID"
            WHERE t."transactionStatus" = 'Completed';
            `);
        return res.status(200).json({
            success: true,
            data: result.rows[0]
        });             
    } catch (error) {
        console.error('Error fetching active transactions:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch active transactions'
        });
    }
}

export const getActiveUsers = async (req: Request, res: Response) => {

    try{
        const result = await pool.query(`
        SELECT COUNT(*) AS total_active_sellers
        FROM users
        WHERE user_type = 'seller'
        AND user_status = 'ACTIVE';
        `);

        return res.status(200).json({
            success: true,
            data: result.rows[0]
        });
    }catch (error) {
        console.error('Error fetching categories:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch active users'
        });
    }
}

export const getActiveTransactions = async (req: Request, res: Response) => {

    try{
        const result = await pool.query(`
            SELECT COUNT(*) AS active_transactions
            FROM "Transaction"
            WHERE "transactionStatus" NOT IN('Cancelled','Completed','Rejected');
            `);
        return res.status(200).json({
            success: true,
            data: result.rows[0]
        });             
    } catch (error) {
        console.error('Error fetching active transactions:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch active transactions'
        });
    }
}

export const getRecoveryTimeSeries = async (req: Request, res: Response) => {

    try{

        const {range = 'monthly'} = req.query;

        let dateFormat: string;
        let groupBy: string;
        let orderBy: string;

        switch (range) {
            case 'weekly':
                // Group by day of week for current week
                dateFormat = `TO_CHAR("createdAt", 'Dy')`;
                groupBy = `EXTRACT(DOW FROM "createdAt")`;
                orderBy = `EXTRACT(DOW FROM "createdAt")`;
                break;
            case 'monthly':
                // Group by month for current year
                dateFormat = `TO_CHAR("createdAt", 'Mon')`;
                groupBy = `EXTRACT(MONTH FROM "createdAt")`;
                orderBy = `EXTRACT(MONTH FROM "createdAt")`;
                break;
             default:
                dateFormat = `'Week ' || EXTRACT(WEEK FROM t."createdAt")`;
                groupBy = `EXTRACT(WEEK FROM t."createdAt")`;
                orderBy = `EXTRACT(WEEK FROM t."createdAt")`;
                break;
        }

        const result = await pool.query(`
            SELECT 
                ${dateFormat} AS period,
                COUNT(*) FILTER (WHERE "transactionStatus" = 'Completed') AS "applianceRecovered",
                COALESCE(SUM(sa."finalOfferPrice"), 0) AS "recoveryValue"
            FROM "Transaction" t
            JOIN "SubmittedAppliance" sa ON sa."submittedApplianceID" = t."submittedApplianceID"
            WHERE t."createdAt" >= NOW() - INTERVAL '1 year'
            AND t."transactionStatus" = 'Completed'
            GROUP BY ${groupBy}, ${dateFormat}
            ORDER BY ${orderBy}
        `);

         console.log('Recovery Time Series Result:', result.rows);

         return res.status(200).json({
            success: true,
            data: result.rows
        });


    }catch (error) {
        console.error('Error fetching recovery time series:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch recovery time series'
        });

    }

}

export const getCategoryRecoveryData  = async (req: Request, res: Response) => {

    try{
        const result = await pool.query(`
            
            SELECT 
            c."categoryName",
            COUNT(t."transactionID") FILTER (
                WHERE t."transactionStatus" = 'Completed'
                AND t."createdAt" >= NOW() - INTERVAL '1 year'
            ) AS "applianceRecovered"
            FROM "Category" c
            LEFT JOIN "Appliance" a 
                ON a."categoryID" = c."categoryID"
            LEFT JOIN "SubmittedAppliance" sa 
                ON sa."applianceID" = a."applianceID"
            LEFT JOIN "Transaction" t 
                ON t."submittedApplianceID" = sa."submittedApplianceID"
            GROUP BY c."categoryName"
            ORDER BY "applianceRecovered" DESC;
        `)

         console.log('Category Recovery Data Result:', result.rows);
        return res.status(200).json({
            success: true,
            data: result.rows
        });

    }catch (error) {
        console.error('Error fetching appliance recovery data:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch appliance recovery data'
        });
    }

}

export const getBrandRecoveryData  = async (req: Request, res: Response) => {

    try{
        const result = await pool.query(`
            
            SELECT 
                b."brandName",
                COUNT(t."transactionID") FILTER (
                    WHERE t."transactionStatus" = 'Completed'
                    AND t."createdAt" >= NOW() - INTERVAL '1 year'
                ) AS "applianceRecovered"
            FROM "Brand" b
            LEFT JOIN "Appliance" a 
                ON a."brandID" = b."brandID"
            LEFT JOIN "SubmittedAppliance" sa 
                ON sa."applianceID" = a."applianceID"
            LEFT JOIN "Transaction" t 
                ON t."submittedApplianceID" = sa."submittedApplianceID"
            GROUP BY b."brandName"
            ORDER BY "applianceRecovered" DESC;
        `)

       console.log('Brand Recovery Data Result:', result.rows);
        return res.status(200).json({
            success: true,
            data: result.rows
        });

    }catch (error) {
        console.error('Error fetching brand recovery data:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch brand recovery data'
        });
    }

}

export const getConditionScoreData = async (req: Request, res: Response) => {

    try{

        const result = await pool.query(`
            WITH classified_appliances AS (
                SELECT 
                    CASE 
                        WHEN sa."finalScore" >= 85 THEN 'Excellent'
                        WHEN sa."finalScore" >= 70 THEN 'Good'
                        WHEN sa."finalScore" >= 50 THEN 'Fair'
                        ELSE 'Poor'
                    END AS condition
                FROM "SubmittedAppliance" sa
                JOIN "Transaction" t ON t."submittedApplianceID" = sa."submittedApplianceID"
                WHERE t."transactionStatus" = 'Completed'
                AND sa."finalScore" IS NOT NULL
            ),
            condition_counts AS (
                SELECT
                    condition,
                    COUNT(*) AS count
                FROM classified_appliances
                GROUP BY condition
            ),
            total_count AS (
                SELECT SUM(count) AS total_count FROM condition_counts
            )
            SELECT
                cc.condition,
                ROUND((cc.count * 100.0 / NULLIF(tc.total_count, 0)), 2) AS percentage
                FROM condition_counts cc
                CROSS JOIN total_count tc
                ORDER BY
                    CASE cc.condition
                        WHEN 'Excellent' THEN 1
                        WHEN 'Good' THEN 2
                        WHEN 'Fair' THEN 3
                        WHEN 'Poor' THEN 4
                    END
        `);

        return res.status(200).json({
            success: true,
            data: result.rows
        });
            
    }catch (error) {
            console.error('Error fetching condition score data:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch condition score data'
            });
    }   

}

export const getTop5RecoveredModel = async (req: Request, res: Response) => {

    try{
        const result = await pool.query(`
            
            SELECT 
                a."modelName",
                COUNT(t."transactionID") FILTER (
                    WHERE t."transactionStatus" = 'Completed'
                    AND t."createdAt" >= NOW() - INTERVAL '1 year'
                ) AS "applianceRecovered"
            FROM "Appliance" a
            LEFT JOIN "SubmittedAppliance" sa 
                ON sa."applianceID" = a."applianceID"
            LEFT JOIN "Transaction" t 
                ON t."submittedApplianceID" = sa."submittedApplianceID"
            GROUP BY a."modelName"
            ORDER BY "applianceRecovered" DESC
            LIMIT 5;
        `)

        return res.status(200).json({
            success: true,
            data: result.rows
        });

    }catch (error) {
        console.error('Error fetching appliance recovery data:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch appliance recovery data'
        });
    }

}