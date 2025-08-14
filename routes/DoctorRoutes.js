import express from "express";
import { sql } from "../db.js";
import { createPatient } from "../controllers/patientsController.js";
import { GetAllPatientByName } from "../controllers/patientsController.js";
import { getPatientDetailsByID } from "../controllers/patientsController.js";
import { PredictPregnancy } from "../controllers/patientsController.js";

const router = express.Router();

router.post("/putPatients", createPatient);
router.get("/getPatientsNames", GetAllPatientByName);
router.get("/getPatientDetails/:id", getPatientDetailsByID);
router.get("/putPatients", createPatient);
router.post("/PredictPregnancy", PredictPregnancy);

router.post("/SubmitAntenatalform", async (req, res) => {
  console.log("Api end point hitt");

  try 
  {
    res.status(200).send("ok");
    const formData = req.body
    console.log(JSON.stringify(formData,null,2))
  } catch (error) 
  {
    console.log("server error in antenatal",error)
    res.status(500);
  }
});

export default router;
