
import { sql } from "./db.js";


  export async function initPaitentsDB()
  {
    try
    {
        await sql`
        CREATE TABLE IF NOT EXISTS patients (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            age INT NOT NULL,
            gravida INT NOT NULL,                   
            blood_pressure VARCHAR(20),              
            heighT VARCHAR(20),
            diabetes BOOLEAN DEFAULT FALSE,          
            previous_c_section BOOLEAN DEFAULT FALSE
          );
      `;

      console.log("Paitents table maded sucessfully")
    }
    catch(error)
    {
      console.log("Error creating patients table")
    }
  }

  
  export async function initPaitentsDB2()
  {
    try
    {
        await sql`
        CREATE TABLE IF NOT EXISTS patients (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            age INT NOT NULL,
            gravida INT NOT NULL,                   
            blood_pressure VARCHAR(20),              
            heighT VARCHAR(20),
            diabetes BOOLEAN DEFAULT FALSE,          
            previous_c_section INT NOT NULL,

          );
      `;

      console.log("Paitents table maded sucessfully")
    }
    catch(error)
    {
      console.log("Error creating patients table")
    }
  }