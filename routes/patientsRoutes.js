import express from 'express'
import {sql} from "../db.js"
import { createPatient } from '../controllers/patientsController.js'
const router =express.Router()


router.post('/putPatients',createPatient)

export default router