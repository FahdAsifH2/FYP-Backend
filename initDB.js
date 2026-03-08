import { sql } from "./db.js";

export async function initPaitentsDB() {
  try {
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

    console.log("Paitents table maded sucessfully");
  } catch (error) {
    console.log("Error creating patients table");
  }
}

export async function initPaitentsDB2() {
  try {
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

    console.log("Paitents table maded sucessfully");
  } catch (error) {
    console.log("Error creating patients table");
  }
}

export async function initUser() {
  try {
    await sql`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          email VARCHAR(100) UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          role VARCHAR(50) DEFAULT 'user'
            CHECK (role IN ('user', 'admin', 'doctor', 'patient')),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `;
    console.log("✅ Users table created (or already exists).");
  } catch (e) {
    console.error("❌ Error creating users table:", e);
  }
}

// Initialize comprehensive Antenatal Cards table
export async function initAntenatalCards() {
  try {
    // Create main antenatal_cards table
    await sql`
    CREATE TABLE IF NOT EXISTS antenatal_cards (
      id SERIAL PRIMARY KEY,
             
      -- Patient Information
      patient_name VARCHAR(255),
      guardian_name VARCHAR(255),
      guardian_type VARCHAR(100),
      age INT,
      married_since VARCHAR(50),
      cousin_marriage BOOLEAN DEFAULT FALSE,
      address TEXT,
      tel VARCHAR(50),
      blood_group VARCHAR(10),
      husband_name VARCHAR(255),
      husband_blood_group VARCHAR(10),
      patient_occupation VARCHAR(255),
      husband_occupation VARCHAR(255),
      ref_by VARCHAR(255),
      form_date VARCHAR(50),
      p_field VARCHAR(50),
         
      -- Medical Information
      complaints TEXT,
      lmp VARCHAR(50),
      edd VARCHAR(50),
      risk_factors TEXT,
      medications TEXT,
      surgical_history TEXT,
      diagnosis TEXT,
      plan TEXT,
      additional_notes TEXT,
         
      -- Vitals
      height VARCHAR(20),
      weight VARCHAR(20),
      bp VARCHAR(50),
      pallor VARCHAR(100),
      thyroid_normal BOOLEAN DEFAULT TRUE,
      thyroid_notes TEXT,
      edema VARCHAR(100),
      edema_location VARCHAR(255),
      chest_findings TEXT,
      breasts TEXT,
         
      -- Scan Information
      scan_edd VARCHAR(50),
      scan_pa VARCHAR(100),
      scan_ps VARCHAR(100),
      scan_bimanual TEXT,
         
      -- Gynae History
      regular BOOLEAN DEFAULT FALSE,
      irregular BOOLEAN DEFAULT FALSE,
      pco BOOLEAN DEFAULT FALSE,
      hirsutism BOOLEAN DEFAULT FALSE,
      pap_smear BOOLEAN DEFAULT FALSE,
      contraception BOOLEAN DEFAULT FALSE,
         
      -- Family History
      family_dm BOOLEAN DEFAULT FALSE,
      family_htn BOOLEAN DEFAULT FALSE,
      family_cancer BOOLEAN DEFAULT FALSE,
      family_twins BOOLEAN DEFAULT FALSE,
      family_special_child BOOLEAN DEFAULT FALSE,
      family_thalassemia BOOLEAN DEFAULT FALSE,
         
      -- Medical History
      drug_allergy BOOLEAN DEFAULT FALSE,
      chicken_pox BOOLEAN DEFAULT FALSE,
      medical_htn BOOLEAN DEFAULT FALSE,
      medical_dm BOOLEAN DEFAULT FALSE,
      medical_thyroid BOOLEAN DEFAULT FALSE,
      medical_others BOOLEAN DEFAULT FALSE,
         
      -- Scan Types
      booking_scan BOOLEAN DEFAULT FALSE,
      nt_scan BOOLEAN DEFAULT FALSE,
      anomaly_scan BOOLEAN DEFAULT FALSE,
      scan_28_weeks BOOLEAN DEFAULT FALSE,
      scan_34_weeks BOOLEAN DEFAULT FALSE,
      term_scan BOOLEAN DEFAULT FALSE,
         
      -- Metadata
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

    console.log("✅ Main antenatal_cards table created");

    // Create investigations table
    await sql`
      CREATE TABLE IF NOT EXISTS investigations (
        id SERIAL PRIMARY KEY,
        antenatal_card_id INT REFERENCES antenatal_cards(id) ON DELETE CASCADE,
        test VARCHAR(100),
        test_date VARCHAR(100),
        hb VARCHAR(100),
        bsr VARCHAR(100),
        urine VARCHAR(100),
        ultrasound VARCHAR(100)
      );
    `;

    console.log("✅ Investigations table created");

    // Create obstetric_history table
    await sql`
      CREATE TABLE IF NOT EXISTS obstetric_history (
        id SERIAL PRIMARY KEY,
        antenatal_card_id INT REFERENCES antenatal_cards(id) ON DELETE CASCADE,
        years INT,
        term INT,
        mod VARCHAR(100),
        complications VARCHAR(100),
        gender VARCHAR(100),
        weight INT,
        status VARCHAR(200)
      );
    `;

    console.log("✅ Obstetric history table created");
    console.log("✅ All antenatal tables created successfully");
  } catch (error) {
    console.error("❌ Error creating antenatal_cards table:", error);
    throw error; // Re-throw to trigger retry logic
  }
}

export async function initAppointments() {
  try {
    await sql`
    CREATE TABLE IF NOT EXISTS Appointments (
      id SERIAL PRIMARY KEY,
      appointment_date DATE,
      appointment_time TIME,
      appointment_type VARCHAR(200),
      issue VARCHAR(200),
      patient_name VARCHAR(200)
  );
  
   `;

    console.log("Patients Table made sucessfully");
  } catch (error) {
    console.log(err);
  }
}
