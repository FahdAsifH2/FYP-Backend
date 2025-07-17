import {sql} from "../db.js"

export async function createPatient(req,res)
{
 try
 {
    const {Name,Age,Gravida,BloodPreassure,Height,Diabetes,PreviousCSections}= req.body
      await sql 
    
      ` INSERT INTO PATIENTS(name,age,gravida,blood_pressure,heighT,diabetes,previous_c_section)
        VALUES(${Name},${Age},${Gravida},${BloodPreassure},${Height},${Diabetes},${PreviousCSections})
        RETURNING *
      `
      res.status(201).json({messgae:"The paitent was added sucessfully"})
 }
 catch(error)
 {
  
    console.log("Error putting the patients into DB",error);
    res.status(500).json({message:"Cannot put paitent into DB"})
 }
}