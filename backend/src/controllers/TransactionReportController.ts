import { Request, Response } from 'express';
import pool from '../config/database';
import { parse } from 'path';

export const getTransactionsReportById = async (req: Request, res: Response) => {

    try{
        const { transactionID } = req.params;

        const query = await pool.query(`
            SELECT 
                t."transactionID",
                t."createdAt" AS "transactionDate",
                t."transactionStatus",
                t."buyerID",
                
                t."sellerID",
                seller.name AS "sellerName",
                seller.email AS "sellerEmail",
                seller.phone AS "sellerPhone",
                
                pa."pickupAddress",
                pa.city,
                pa.state,
                pa."zipCode",
                
                a."applianceID",
                a."modelCode",
                a."modelName",
                c."categoryName",
                b."brandName",
                
                sa."submittedApplianceID",
                sa."finalOfferPrice",
                sa."finalScore",
                
                CASE 
                    WHEN sa."finalScore" >= 85 THEN 'Excellent'
                    WHEN sa."finalScore" >= 70 THEN 'Good'
                    WHEN sa."finalScore" >= 50 THEN 'Fair'
                    ELSE 'Poor'
                END AS classification

            FROM "Transaction" t
            JOIN users seller ON seller.seller_id = t."sellerID"
            JOIN "SubmittedAppliance" sa ON sa."submittedApplianceID" = t."submittedApplianceID"
            LEFT JOIN "PickupAddress" pa ON pa."addressID" = sa."addressID"
            LEFT JOIN "Appliance" a ON a."applianceID" = sa."applianceID"
            LEFT JOIN "Category" c ON c."categoryID" = a."categoryID"
            LEFT JOIN "Brand" b ON b."brandID" = a."brandID"
            WHERE t."transactionID" = $1
            AND t."transactionStatus" = 'Completed'

            `, [transactionID]);

        if(query.rowCount === 0){
            return res.status(404).json({
                success: false,
                message: 'Transaction not found or not completed'
            });
        }

        const transaction = query.rows[0];

        const conditionResult = await pool.query(`
            SELECT 
                co.description AS "conditionDescription",
                cg."criteriaName",
                bn."markdownPercentage"
            FROM "ConditionSelected" cs
            JOIN "ConditionOption" co ON co."conditionID" = cs."conditionID"
            JOIN "ConditionGroup" cg ON cg."groupID" = co."groupID"
            JOIN "BuyerMarkdown" bn ON bn."conditionID" = co."conditionID" AND bn."buyerID" = $2
            WHERE cs."submittedApplianceID" = $1
            AND cs."isChecked" = true AND cs."selectedBy" = 'admin';
        `, [transaction.submittedApplianceID, transaction.buyerID]);
        
        const pricingBreakdown = calculatePricingBreakdown(transaction.finalOfferPrice, conditionResult.rows);

         console.log('Transaction Report Data:', {
            transaction,
            conditions: conditionResult.rows,
            pricingBreakdown
        });

        return res.status(200).json({
            success: true,
            data: {
                ...transaction,
                conditions: conditionResult.rows,
                pricingBreakdown
            }
        })



    }catch (error) {
        console.error('Error fetching transaction report:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch transaction report'
        });
    }

};

function calculatePricingBreakdown(basePrice: number, conditions: any[]){
    const breakdown = [];
    let currentPrice = parseFloat(basePrice?.toString() || '0');

    breakdown.push({
        component: 'Base Price',
        baseValue: currentPrice,
        markdown: null,
        markdownAmount: 0,
        finalValue: currentPrice
    })

    for (const condition of conditions){
        if (condition.markdownPercentage && condition.markdownPercentage > 0){
            const markdownAmount = currentPrice * (condition.markdownPercentage / 100);
            const newPrice = currentPrice - markdownAmount;

            breakdown.push({
                component: condition.conditionDescription,
                baseValue: currentPrice,
                markdown: condition.markdownPercentage,
                markdownAmount: markdownAmount,
                finalValue: newPrice
            })
            currentPrice = Math.round(newPrice * 100) / 100;
        }
    }

    return{
        breakdown,
        finalAmount: currentPrice
    }

}

export const saveTransactionReport = async (req: Request, res: Response) => {
    try {

        const { reportID, transactionID, adminID } = req.body;

       

         console.log('Saving report with:', { reportID, transactionID, adminID });

       const result = await pool.query(`
            INSERT INTO "TransactionReport" ("transactionReportID", "transactionID", "adminID", format, "generatedDate")
            VALUES ($1, $2, $3, 'PDF', CURRENT_TIMESTAMP)
            RETURNING *
        `, [reportID, transactionID, adminID]);

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
