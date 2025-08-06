import express from 'express'
import {sql} from "../db.js"
import { createPatient } from '../controllers/patientsController.js'
import { GetAllPatientByName } from '../controllers/patientsController.js'
import { getPatientDetailsByID } from '../controllers/patientsController.js'
import { PredictPregnancy } from '../controllers/patientsController.js'


const router =express.Router()


router.post('/putPatients',createPatient)
router.get('/getPatientsNames',GetAllPatientByName)
router.get('/getPatientDetails/:id',getPatientDetailsByID)
router.get('/putPatients',createPatient)
router.post('/PredictPregnancy',PredictPregnancy)

export default router