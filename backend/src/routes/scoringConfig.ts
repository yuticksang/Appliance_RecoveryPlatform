import express from 'express';
import { getAllConditionGroup, getCategory, updateConditionScore, updateWeightPercentage } from '../controllers/scoringConfigController';

const router = express.Router();

router.get('/categories', getCategory);

router.get('/:categoryID', getAllConditionGroup);

router.put('/condition/:categoryID/:conditionID', updateConditionScore);

router.put('/weight/:categoryID/:conditionGroupID', updateWeightPercentage);


export default router;