
import { sql } from "./db.js";

// Database initialization
export async function initDB() {
    try {
      await sql.query(`CREATE TABLE IF NOT EXISTS transactions(
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        title VARCHAR(255) NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        category VARCHAR(255) NOT NULL,
        created_at DATE NOT NULL DEFAULT CURRENT_DATE
      )`);
      console.log("Database initialized successfully");
    } catch (error) {
      console.error("Error initializing database:", error);
    }
  }
  
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