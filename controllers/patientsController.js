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


    // ✅ Convert strings to boolean if needed
    const diabetesBool = Diabetes === "true" || Diabetes === true;
    const prevCSectionBool = PreviousCSections === "true" || PreviousCSections === true;

    // ✅ Send data to AI agent first
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


export async  function GetAllPatientByName(req,res)
{
   try
   {
     const result = await sql `
     SELECT name FROM patients
      `
     console.log(result)
     res.status(200).json({message:"Got all names from the DB",
    data:result,
    });
   }

   catch(error)
   {
     console.log("Err retriving all patient")
     res.status(500).json({message:"Failed to retrive all patients"})
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
