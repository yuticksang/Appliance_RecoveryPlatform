import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import pool from '../config/database';
import { group } from 'console';


interface Condition {
    conditionID: string;
    code: string;
    image: string | null;
    description: string;
    scoreValue: number;
}

interface ConditionGroup {
    groupID: string;
    criteriaName: string;
    weightPercentage: number;
    categoryID: string;
    conditions: Condition[];
}

export const getCategory = async (req: Request, res: Response) => {

    try{
        const query = `SELECT * FROM public."Category" ORDER BY "categoryID"`;
        const result = await pool.query(query);

        res.status(200).json({
            success: true,
            data: result.rows
        });
    }catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch categories',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }

}

export const updateConditionScore = async (req: Request, res: Response) => {

    try{

        const {categoryID, conditionID} = req.params;
        const {newScoreValue} = req.body;

        const query =  `UPDATE "Category_Condition" 
                        SET "scoreValue" = $1
                        WHERE "conditionID" = $2
                        AND "categoryID" = $3;`;

        const result = await pool.query(query, [newScoreValue, conditionID, categoryID]);

        console.log('Rows updated:', result.rowCount);
        res.status(200).json({
            success: true,
            data: result.rows[0]
        });
    }catch (error) {
        console.error('Error updating condition score:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update condition score',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}

export const getAllConditionGroup = async (req: Request, res: Response) => {

    try{
        const {categoryID} = req.params;

        const query = `
            SELECT 
                cg."groupID",
                cg."criteriaName",
                ccg."weightPercentage",
                ccg."categoryID",
                co."conditionID",
                co.code,
                co.image,
                co.description,
                cc."scoreValue"
            FROM public."ConditionGroup" cg
            INNER JOIN public."Category_ConditionGroup" ccg 
                ON cg."groupID" = ccg."groupID"
            INNER JOIN public."ConditionOption" co 
                ON cg."groupID" = co."groupID"
            INNER JOIN public."Category_Condition" cc 
                ON co."conditionID" = cc."conditionID" 
                AND ccg."categoryID" = cc."categoryID"
            WHERE ccg."categoryID" = $1
            ORDER BY cg."groupID", co."conditionID"
        `;

        const result = await pool.query(query, [categoryID]);

        const groupedResult = groupByGroupID(result.rows);

        res.status(200).json({
            success: true,
            data: groupedResult
        });

    }catch (error) {
        console.error('Error fetching criteria:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch criteria',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }

}

function groupByGroupID(rows: any[]) : ConditionGroup[] {
    const grouped: { [key: string]: ConditionGroup} = {};

    rows.forEach(row => {

        const groupID = row.groupID;

        if (!grouped[groupID]) {
             grouped[groupID] = {
                groupID: row.groupID,
                criteriaName: row.criteriaName,
                weightPercentage: parseFloat(row.weightPercentage),
                categoryID: row.categoryID,
                conditions: []
             };
        }

        if(row.conditionID) {
            grouped[groupID].conditions.push({
                conditionID: row.conditionID,
                code: row.code,
                image: row.image,
                description: row.description,
                scoreValue: row.scoreValue !== null ? parseFloat(row.scoreValue) : 0
            });
        }

    });

    return Object.values(grouped);
}

