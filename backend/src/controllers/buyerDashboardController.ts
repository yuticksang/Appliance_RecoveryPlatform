import { Request, Response } from 'express';
import pool from '../config/database';

export const getCurrentTransactions = async (req: Request, res: Response) => {

    try{

        const userId = req.params.userId;

        const userQuery = await pool.query(
        'SELECT buyer_id FROM users WHERE "userID" = $1',
        [userId]
        );

        if (userQuery.rows.length === 0) {
        console.log(' User not found');
        return res.status(404).json({ message: 'User not found' });
        }

        const buyerId = userQuery.rows[0].buyer_id;
       
        const result = await pool.query(`
            SELECT t."transactionID",a."modelName",t."buyerID",sa."initialOfferPrice",sa."finalOfferPrice",TO_CHAR(t."createdAt", 'YYYY-MM-DD') AS "createdAt",t."transactionStatus"
            FROM "Transaction" t
            JOIN "SubmittedAppliance" sa
            ON sa."submittedApplianceID" = t."submittedApplianceID"
            JOIN "Appliance" a
            ON a."applianceID" = sa."applianceID"
            WHERE t."transactionStatus" NOT IN ('Cancelled', 'Completed', 'Rejected')
            AND t."buyerID" = $1
            ORDER BY t."createdAt" DESC, t."transactionID"  LIMIT 5
            `, [buyerId]);

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

        const userId = req.params.userId;

        const userQuery = await pool.query(
        'SELECT buyer_id FROM users WHERE "userID" = $1',
        [userId]
        );

        if (userQuery.rows.length === 0) {
        console.log(' User not found');
        return res.status(404).json({ message: 'User not found' });
        }

        const buyerId = userQuery.rows[0].buyer_id;
     
        const result = await pool.query(`

            WITH current_month AS (
                SELECT COUNT(*) AS count
                FROM "Transaction"
                WHERE "transactionStatus" = 'Completed'
                AND "buyerID" = $1
                AND "createdAt" >= DATE_TRUNC('month', CURRENT_DATE)
            ),
            previous_month AS (
                SELECT COUNT(*) AS count
                FROM "Transaction"
                WHERE "transactionStatus" = 'Completed'
                AND "buyerID" = $1
                AND "createdAt" >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
                AND "createdAt" < DATE_TRUNC('month', CURRENT_DATE)
            ),
            total AS(
                SELECT COUNT(*) AS appliances_recovered
                FROM "Transaction"
                WHERE "transactionStatus" = 'Completed'
                AND "buyerID" = $1
            )
            SELECT
                t.appliances_recovered AS "totalCount",
                cm.count AS "currentCount",
                pm.count AS "previousCount",
                (cm.count - pm.count) AS "absoluteChange",
                CASE
                    WHEN pm.count = 0 AND cm.count = 0 THEN 0
                    WHEN pm.count = 0 THEN NULL
                    WHEN pm.count < 10 THEN 
                        ROUND(((cm.count - pm.count)::DECIMAL / pm.count) * 100, 2)
                    ELSE 
                        ROUND(((cm.count - pm.count)::DECIMAL / pm.count) * 100, 2)
                END AS "percentageChange",
                CASE
                    WHEN pm.count = 0 AND cm.count = 0 THEN 'none'
                    WHEN pm.count = 0 THEN 'absolute'
                    WHEN pm.count < 10 THEN 'absolute'
                    ELSE 'percentage'
                END AS "displayMode",
                CASE
                    WHEN cm.count > pm.count THEN 'up'
                    WHEN cm.count < pm.count THEN 'down'
                    ELSE 'stable'
                END AS "trend"
            FROM total t, current_month cm, previous_month pm
            
            `, [buyerId]);
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

        const userId = req.params.userId;

        const userQuery = await pool.query(
        'SELECT buyer_id FROM users WHERE "userID" = $1',
        [userId]
        );

        if (userQuery.rows.length === 0) {
        console.log(' User not found');
        return res.status(404).json({ message: 'User not found' });
        }

        const buyerId = userQuery.rows[0].buyer_id;
       
        const result = await pool.query(`
            WITH current_month AS (
                SELECT COALESCE(SUM(sa."finalOfferPrice"), 0) AS value
                FROM "Transaction" t
                JOIN "SubmittedAppliance" sa ON sa."submittedApplianceID" = t."submittedApplianceID"
                WHERE t."transactionStatus" = 'Completed'
                AND "buyerID" = $1
                AND t."createdAt" >= DATE_TRUNC('month', CURRENT_DATE)
            ),
            previous_month AS (
                SELECT COALESCE(SUM(sa."finalOfferPrice"), 0) AS value
                FROM "Transaction" t
                JOIN "SubmittedAppliance" sa ON sa."submittedApplianceID" = t."submittedApplianceID"
                WHERE t."transactionStatus" = 'Completed'
                AND "buyerID" = $1
                AND t."createdAt" >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
                AND t."createdAt" < DATE_TRUNC('month', CURRENT_DATE)
            ),
            total AS (
                SELECT COALESCE(SUM(sa."finalOfferPrice"), 0) AS recoveryValue
                FROM "Transaction" t
                JOIN "SubmittedAppliance" sa ON sa."submittedApplianceID" = t."submittedApplianceID"
                WHERE t."transactionStatus" = 'Completed'
                AND "buyerID" = $1
            )
            SELECT 
                t.recoveryValue AS "totalValue",
                cm.value AS "currentMonthValue",
                pm.value AS "previousMonthValue",
                (cm.value - pm.value) AS "absoluteChange",
                CASE
                    WHEN pm.value = 0 AND cm.value = 0 THEN 0
                    WHEN pm.value = 0 THEN NULL
                    WHEN pm.value < 1000 THEN 
                        ROUND(((cm.value - pm.value) / pm.value) * 100, 2)
                    ELSE 
                        ROUND(((cm.value - pm.value) / pm.value) * 100, 2)
                END AS "percentageChange",
                CASE
                    WHEN pm.value = 0 AND cm.value = 0 THEN 'none'
                    WHEN pm.value = 0 THEN 'absolute'
                    WHEN pm.value < 1000 THEN 'absolute'
                    ELSE 'percentage'
                END AS "displayMode",
                CASE
                    WHEN cm.value > pm.value THEN 'up'
                    WHEN cm.value < pm.value THEN 'down'
                    ELSE 'stable'
                END AS "trend"
            FROM total t, current_month cm, previous_month pm
            `, [buyerId]);
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


export const getActiveTransactions = async (req: Request, res: Response) => {

    try{
        const userId = req.params.userId;

        const userQuery = await pool.query(
        'SELECT buyer_id FROM users WHERE "userID" = $1',
        [userId]
        );

        if (userQuery.rows.length === 0) {
        console.log(' User not found');
        return res.status(404).json({ message: 'User not found' });
        }

        const buyerId = userQuery.rows[0].buyer_id;
      
        const result = await pool.query(`
            WITH current_month AS (
                SELECT COUNT(*) AS count
                FROM "Transaction"
                WHERE "transactionStatus" NOT IN ('Cancelled', 'Completed', 'Rejected')
                AND "buyerID" = $1
                AND "createdAt" >= DATE_TRUNC('month', CURRENT_DATE)
            ),
            previous_month AS (
                SELECT COUNT(*) AS count
                FROM "Transaction"
                WHERE "transactionStatus" NOT IN ('Cancelled', 'Completed', 'Rejected')
                AND "buyerID" = $1
                AND "createdAt" >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
                AND "createdAt" < DATE_TRUNC('month', CURRENT_DATE)
            ),
            total AS (
                SELECT COUNT(*) AS active_transactions
                FROM "Transaction"
                WHERE "transactionStatus" NOT IN ('Cancelled', 'Completed', 'Rejected')
                AND "buyerID" = $1
            )
            SELECT 
                t.active_transactions AS "totalCount",
                cm.count AS "currentMonthCount",
                pm.count AS "previousMonthCount",
                (cm.count - pm.count) AS "absoluteChange",
                CASE
                    WHEN pm.count = 0 AND cm.count = 0 THEN 0
                    WHEN pm.count = 0 THEN NULL
                    WHEN pm.count < 10 THEN 
                        ROUND(((cm.count - pm.count)::DECIMAL / pm.count) * 100, 2)
                    ELSE 
                        ROUND(((cm.count - pm.count)::DECIMAL / pm.count) * 100, 2)
                END AS "percentageChange",
                CASE
                    WHEN pm.count = 0 AND cm.count = 0 THEN 'none'
                    WHEN pm.count = 0 THEN 'absolute'
                    WHEN pm.count < 10 THEN 'absolute'
                    ELSE 'percentage'
                END AS "displayMode",
                CASE
                    WHEN cm.count > pm.count THEN 'up'
                    WHEN cm.count < pm.count THEN 'down'
                    ELSE 'stable'
                END AS "trend"
            FROM total t, current_month cm, previous_month pm
            `, [buyerId]);
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

        const userId = req.params.userId;

        const userQuery = await pool.query(
        'SELECT buyer_id FROM users WHERE "userID" = $1',
        [userId]
        );

        if (userQuery.rows.length === 0) {
        console.log(' User not found');
        return res.status(404).json({ message: 'User not found' });
        }

        const buyerId = userQuery.rows[0].buyer_id;
        
        const result = await pool.query(`
            SELECT 
                ${dateFormat} AS period,
                COUNT(*) FILTER (WHERE "transactionStatus" = 'Completed') AS "applianceRecovered",
                COALESCE(SUM(sa."finalOfferPrice"), 0) AS "recoveryValue"
            FROM "Transaction" t
            JOIN "SubmittedAppliance" sa ON sa."submittedApplianceID" = t."submittedApplianceID"
            WHERE t."createdAt" >= NOW() - INTERVAL '1 year'
            AND t."buyerID" = $1
            AND t."transactionStatus" = 'Completed'
            GROUP BY ${groupBy}, ${dateFormat}
            ORDER BY ${orderBy}
        `, [buyerId]);
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

