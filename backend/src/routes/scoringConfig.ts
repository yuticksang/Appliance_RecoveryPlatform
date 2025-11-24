import express from 'express';
import { getAllConditionGroup, getCategory, updateConditionScore } from '../controllers/scoringConfigController';

const router = express.Router();

console.log('📍📍📍 scoringConfig routes loaded! 📍📍📍');

router.get('/categories', getCategory);

router.get('/:categoryID', getAllConditionGroup);

router.put('/:categoryID/:conditionID', updateConditionScore);


export default router;