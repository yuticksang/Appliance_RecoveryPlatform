import { Request, Response } from 'express';
import pool from '../config/database';
import { parse } from 'path';

interface ScoreLabel{
    functionalityScore: number;
    appearanceScore: number;
    componentScore: number;
    totalScore: number;
    classification: 'Excellent' | 'Good' | 'Fair' | 'Poor';
}

export const calculateValuation = async (req: Request, res: Response) => {

    try{
        const {modelId, conditionIds} = req.body;

        if (!modelId) {
        return res.status(400).json({ message: 'Model ID is required' });
        }

        console.log(`🧮 Calculating valuation for Model: ${modelId} with Conditions:`, conditionIds);

        const safeConditionIds = Array.isArray(conditionIds) ? conditionIds : [];

        // STREAM A: SCORING ENGINE
        const scoringQuery = await pool.query(
            `SELECT 
                ccg."groupID",
                cg."criteriaName",
                ccg."weightPercentage", 
            CASE 
            WHEN cg."criteriaName" = 'Checklist' THEN 
                CASE 
                    WHEN MAX(cc."scoreValue") = 100 THEN 100
                    ELSE GREATEST(0, 100 - COALESCE(SUM(cc."scoreValue"), 0))
                END
            ELSE 
                COALESCE(SUM(cc."scoreValue"), 0)
            END as "totalGroupScore"
            FROM "Appliance" a
            JOIN "Category_ConditionGroup" ccg 
                ON ccg."categoryID" = a."categoryID"
            JOIN "ConditionGroup" cg
                ON cg."groupID" = ccg."groupID"
            JOIN "Category_Condition" cc 
                ON cc."categoryID" = a."categoryID"
            JOIN "ConditionOption" co
                ON co."conditionID" = cc."conditionID"
                AND co."groupID" = ccg."groupID"
            WHERE a."applianceID" = $1
            AND cc."conditionID" = ANY($2)
            GROUP BY ccg."groupID", cg."criteriaName", ccg."weightPercentage"
            `, [modelId, safeConditionIds]
        )

        const scoringRows = scoringQuery.rows;

        const scoreLabel : ScoreLabel = {
            functionalityScore: 0,
            appearanceScore: 0,
            componentScore: 0,
            totalScore: 0,
            classification: 'Excellent'
        };

        scoringRows.forEach(row => {
            const weight = parseFloat(row.weightPercentage) || 0;
            const groupScore = parseFloat(row.totalGroupScore) || 0;

            if (row.criteriaName === 'Functionality Status') scoreLabel.functionalityScore = groupScore;
            else if (row.criteriaName === 'Appearance Status') scoreLabel.appearanceScore = groupScore;
            else if (row.criteriaName === 'Checklist') scoreLabel.componentScore = groupScore;
            
            scoreLabel.totalScore += (weight /100) * groupScore;

        })

        scoreLabel.totalScore = Math.round(scoreLabel.totalScore);
        scoreLabel.totalScore = Math.min(Math.max(scoreLabel.totalScore, 0), 100);

        if (scoreLabel.totalScore >= 85) scoreLabel.classification = 'Excellent';
        else if (scoreLabel.totalScore >= 70) scoreLabel.classification = 'Good';
        else if (scoreLabel.totalScore >= 50) scoreLabel.classification = 'Fair';
        else scoreLabel.classification = 'Poor';

        // STREAM B: PRICING ENGINE 
        const basePriceQuery = await pool.query(
            `SELECT "buyerID", "basePrice"
            FROM "BuyerAppliance"
            WHERE "applianceID" = $1 
            AND "status" = 'ACTIVE';`, 
            [modelId]
        );

        const buyers = basePriceQuery.rows;

        if (buyers.length === 0) {
            return res.json({
                valuationWorth: 0,
                highestBuyerId: null,
                
                scoreLabel: {
                    ...scoreLabel,
                    classification: 'Poor' 
                }
            });
        }

        const buyerIds = buyers.map(b=> b.buyerID);

        let markdowns: any[] = [];

        if (conditionIds && Array.isArray(conditionIds) && conditionIds.length > 0) {
            const markdownsQuery = await pool.query(
               `SELECT bm."buyerID", bm."markdownPercentage", co."description"
                 FROM "BuyerMarkdown" bm
                 JOIN "ConditionOption" co ON bm."conditionID" = co."conditionID"
                 WHERE bm."buyerID" = ANY($1)
                 AND bm."conditionID" = ANY($2)`,
                [buyerIds, conditionIds]
            );

            markdowns = markdownsQuery.rows;
        }

        let highestOffer = 0;
        let highestBuyerId: string | null = null;
        let winningMarkdownInfo = 'None';

        buyers.forEach(buyer => {
            const base = parseFloat(buyer.basePrice);
            const buyerId = buyer.buyerID;
            
            const applicableMarkdowns = markdowns.filter(m => m.buyerID === buyerId);

            const totalMarkdownPercentage = applicableMarkdowns.reduce((sum, m) => {
                return sum + parseFloat(m.markdownPercentage);
            }, 0);

            const effectiveMarkdown = Math.min(totalMarkdownPercentage, 100);

            const finalPrice = base * (1 - effectiveMarkdown / 100);

            if (finalPrice > highestOffer) {
                highestOffer = finalPrice;
                highestBuyerId = buyerId;

                if (applicableMarkdowns.length > 0) {
                    winningMarkdownInfo = applicableMarkdowns
                        .map(m => `${m.description} (-${m.markdownPercentage}%)`)
                        .join(', ');
                } else {
                    winningMarkdownInfo = 'None';
                }

            }
        })

        console.log(`🧮 Winner: ${highestBuyerId} | Price: RM${Math.round(highestOffer)} | Deductions: ${winningMarkdownInfo}`);

        // FINAL RESPONSE

        res.status(200).json({
            valuationWorth: Math.round(highestOffer),
            highestBuyerId: highestBuyerId,
            scoreLabel: scoreLabel
        });


    }catch (error) {
    console.error('Calculation error:', error);
    res.status(500).json({ message: 'Failed to calculate valuation' });
  }
}