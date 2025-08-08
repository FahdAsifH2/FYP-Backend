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
  try {
    const data = req.body;
    console.log('Received data from React Native:', data);

    // Forward to FastAPI
    const fastApiResponse = await fetch('http://localhost:8000/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    console.log('FastAPI Response Status:', fastApiResponse.status);

    if (!fastApiResponse.ok) {
      const errorText = await fastApiResponse.text();
      console.error('FastAPI Error:', errorText);
      return res.status(500).json({
        error: true,
        message: `FastAPI Error: ${errorText}`
      });
    }

    // Get the JSON response from FastAPI
    const predictionResult = await fastApiResponse.json();
    console.log('FastAPI Result:', predictionResult);

    // Transform FastAPI response to match React Native expectations
    const transformedResponse = {
      // Map field names to what React Native expects
      prediction: predictionResult.predicted_delivery_mode || 'Unknown',
      confidence: predictionResult.confidence_percentage ? predictionResult.confidence_percentage / 100 : 0,
      probabilities: {},
      risk_factors: predictionResult.risk_factors || {},
      model_used: predictionResult.model_used || 'XGBoost'
    };

    // Extract probabilities from percentage fields
    Object.keys(predictionResult).forEach(key => {
      if (key.endsWith('_percentage')) {
        const deliveryMode = key.replace('_percentage', '');
        transformedResponse.probabilities[deliveryMode] = predictionResult[key] / 100;
      }
    });

    console.log('Sending transformed response to React Native:', transformedResponse);

    // Return in the format React Native expects
    res.status(200).json(transformedResponse);

  } catch (error) {
    console.error('Middleware Error:', error);
    res.status(500).json({
      error: true,
      message: `Server Error: ${error.message}`
    });
  }
}