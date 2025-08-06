import { sql } from "../db.js";
import { runAgent } from "../agents/agentPrototype.js";

export async function createPatient(req, res) {

  console.log("End Point Hitt")

  try {
    const {
      Name,
      Age,
      Gravida,
      BloodPreassure,
      Height,
      Diabetes,
      PreviousCSections,
    } = req.body;



    const diabetesBool = Diabetes === "true" || Diabetes === true;
    const prevCSectionBool = PreviousCSections === "true" || PreviousCSections === true;

    const patientData = `Patient has bp ${BloodPreassure}, sugar ${Diabetes}, gravida ${Gravida}, age ${Age}, and height ${Height}.`;
    const agentResult = await runAgent(patientData);
    console.log("AI Reply:", agentResult);

    
    const result = await sql`
      INSERT INTO PATIENTS(
        name, age, gravida, blood_pressure, height, diabetes, previous_c_section
      ) VALUES (
        ${Name},
        ${Age},
        ${Gravida},
        ${BloodPreassure},
        ${Height},
        ${diabetesBool},
        ${prevCSectionBool}
      )
      RETURNING *
    `;

    console.log("Patient was added sucessfully")
    console.log(" ")
    res.status(200).json({
      message: "The patient was added successfully",
   
    });
  } catch (error) {
    console.log(" Error putting the patient into DB", error);
    res.status(500).json({ message: "Cannot put patient into DB" });
  }
}



export async function GetAllPatientByName(req, res) {
  try {
    // jub hum backend say patinet names mangwayen gay hum sth e id bhi mangwa len gay
    const result = await sql`SELECT id, name FROM patients ORDER BY name`;
    
    console.log("Patients retrieved:", result);
    
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.log('Error getting patients:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to get patients' 
    });
  }
}

export async function getPatientDetailsByID(req, res) {
  try {
    const { id } = req.params;
    console.log("ID received:", id); 
    const result = await sql`
      SELECT * FROM patients WHERE id = ${id}
    `;

    console.log("Got patient details");
    console.log(result)

    res.status(200).json({
      message: "Sent the details",
      data: result[0],
    });
  } catch (error) {
    console.log("Err retrieving patient info", error);
    res.status(500).json({ message: "Failed to retrieve patient info" });
  }
}


export async function PredictPregnancy(req, res) {


  try
  {
   const data = req.body

   const FastApiResponse=await  fetch('http://localhost:8000/predict',{
    method: 'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify(data)
   })

   console.log(data)

   if(FastApiResponse!=200 || FastApiResponse!=201)
   {
    const errorResp = await FastApiResponse.text()
    res.status(500).json({message: errorResp})
   }
   else
   {
    const Done = await FastApiResponse.text()
    res.status(200).json({message:"done"})
   }
  }
  catch(e)
  {
    console.error(e)
    res.status(500).json(e)
  }
  // console.log("worked");
  // const data = req.body;
  // console.log(data);

  // const {
  //   age_years,

  //   parity,
  //   gestation_weeks,
  //   previous_cs_count,
  //   gravida,
  //   robson_group,
  //   age_19_or_less,
  //   age_20_34_years,
  //   age_35_plus_years,
  //   robson_nulliparous,
  //   robson_multiparous,
  //   presentation_cephalic,
  //   presentation_breech,
  //   labour_onset_spontaneous,
  //   induction_of_labour,
  //   cs_before_labour,
  //   fetal_heart_present,
  //   single_baby,
  //   multiple_babies,
  //   number_of_fetuses,
  //   term_37_41_weeks,
  //   no_previous_scar,
  //   previous_scar,
  // } = req.body;

  // res.status(200);
}
