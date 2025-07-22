import express from 'express'
import {sql} from "../db.js"
import { createPatient } from '../controllers/patientsController.js'
import { GetAllPatientByName } from '../controllers/patientsController.js'
const router =express.Router()


router.post('/putPatients',createPatient)
router.get('/getPatientsNames',GetAllPatientByName)

export default router